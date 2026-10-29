const { certificatePdf } = require("./certificate-template");
const { randomUUID } = require("crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const jwt = require("jsonwebtoken");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { check } = require("./errors");
const {
  dispatchDelivery,
  recoverDeliveries,
  sendThroughSendGrid,
  emailTimeout,
} = require("./email-delivery");
function createCertificates({
  db,
  env = process.env,
  s3 = new S3Client({
    region: env.AWS_REGION || env.AWS_S3_REGION || "ap-south-1",
  }),
  sendEmail,
}) {
  function isLocalMode() {
    if (env.LMS_CERTIFICATE_STORAGE !== "local") return false;
    check(env.LMS_LOCAL_DEVELOPMENT === "true" && env.NODE_ENV !== "production", 503,
      "LOCAL_STORAGE_DISABLED", "Local certificate storage is available only in local development.");
    return true;
  }
  const localRoot = () => path.resolve(env.LMS_LOCAL_CERTIFICATE_DIR || path.join(__dirname, "../.local/certificates"));
  function localPath(cert) {
    check(/^[A-Za-z0-9_-]{1,128}$/.test(cert.certificateNo), 409, "INVALID_CERTIFICATE", "Certificate identifier is invalid.");
    return path.join(localRoot(), `${cert.certificateNo}.pdf`);
  }
  const localUri = (cert) => `local-certificate://${cert.certificateNo}.pdf`;
  function downloadSecret() {
    const secret = env.ACCESS_TOKEN_SECRET || env.JWT_SECRET;
    check(typeof secret === "string" && secret.length >= 32, 503, "DOWNLOAD_NOT_CONFIGURED", "Configure a strong local download signing secret.");
    return secret;
  }
  async function readLocalPdf(id, token) {
    check(isLocalMode(), 404, "NOT_FOUND", "Local certificate download is not enabled.");
    let claims;
    try {
      claims = jwt.verify(token, downloadSecret(), { algorithms: ["HS256"], audience: "local-certificate-download" });
    } catch {
      check(false, 401, "DOWNLOAD_LINK_INVALID", "Download link expired or is invalid. Refresh the certificate page.");
    }
    check(claims.purpose === "certificate-pdf" && claims.certificateId === id, 401, "DOWNLOAD_LINK_INVALID", "Download link does not match this certificate.");
    const cert = await db.certificate.findUnique({ where: { id } });
    check(cert && claims.certificateNo === cert.certificateNo && cert.pdfUrl === localUri(cert), 404, "NOT_FOUND", "Certificate PDF is not available.");
    const filename = localPath(cert);
    try {
      const root = await fs.realpath(localRoot());
      const resolved = await fs.realpath(filename);
      check(path.dirname(resolved).toLowerCase() === root.toLowerCase(), 403, "INVALID_CERTIFICATE_PATH", "Certificate path is invalid.");
      const buffer = await fs.readFile(resolved);
      check(buffer.subarray(0, 5).toString() === "%PDF-", 409, "CERTIFICATE_PENDING", "Certificate PDF needs to be regenerated.");
      return { buffer, filename: `${cert.certificateNo}.pdf` };
    } catch (error) {
      if (error.code === "ENOENT") check(false, 409, "CERTIFICATE_PENDING", "Certificate file is missing. Generate it again.");
      throw error;
    }
  }
  const bucket = () => {
    const configuredBucket = env.LMS_CERTIFICATE_BUCKET || env.AWS_S3_BUCKET;
    check(
      configuredBucket,
      503,
      "STORAGE_NOT_CONFIGURED",
      "Configure LMS_CERTIFICATE_BUCKET (or AWS_S3_BUCKET) and AWS role access.",
    );
    return configuredBucket;
  };
  async function issue(enrollment, summary) {
    check(
      summary.eligible,
      409,
      "NOT_ELIGIBLE",
      "Course or assessment completion requirements are not met.",
    );
    check(
      enrollment.courseAccess,
      403,
      "PAYMENT_REQUIRED",
      "Enrollment access must be unlocked before certificate generation.",
    );
    const local = isLocalMode();
    const course = enrollment.batch.course;
    let cert = await db.certificate.findUnique({
      where: { enrollmentId: enrollment.id },
    });
    if (!cert) {
      try {
        cert = await db.certificate.create({
          data: {
            enrollmentId: enrollment.id,
            certificateNo: `CERT-${randomUUID()}`,
            studentName: enrollment.studentName,
            courseName: course.title,
            instructorName: course.instructorName,
            completionPercentage: summary.percentage,
          },
        });
      } catch (error) {
        if (error.code !== "P2002") throw error;
        cert = await db.certificate.findUnique({
          where: { enrollmentId: enrollment.id },
        });
      }
    }
    if (local) {
      const filename = localPath(cert);
      let exists = false;
      try { exists = (await fs.stat(filename)).isFile(); } catch (error) { if (error.code !== "ENOENT") throw error; }
      if (!exists || cert.pdfUrl !== localUri(cert)) {
        await fs.mkdir(localRoot(), { recursive: true });
        const temporary = `${filename}.${randomUUID()}.tmp`;
        try {
          await fs.writeFile(temporary, await certificatePdf(cert, { env }), { mode: 0o600 });
          await fs.rename(temporary, filename);
        } finally { await fs.unlink(temporary).catch(error => { if (error.code !== "ENOENT") throw error; }); }
        cert = await db.certificate.update({ where: { id: cert.id }, data: { pdfUrl: localUri(cert) } });
      }
      await db.lmsCertificateDelivery.upsert({ where: { enrollmentId: enrollment.id },
        create: { enrollmentId: enrollment.id, status: "LOCAL_READY" }, update: {} });
      await db.lmsCertificateDelivery.updateMany({
        where: { enrollmentId: enrollment.id, status: { in: ["GENERATE", "PENDING"] } },
        data: { status: "LOCAL_READY", lastError: null, attempts: 0 },
      });
      return cert;
    }
    const prefix = `s3://${bucket()}/`;
    if (!cert.pdfUrl?.startsWith(prefix)) {
      const key = `certificates/${cert.certificateNo}.pdf`;
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket(),
          Key: key,
          Body: await certificatePdf(cert, { env }),
          ContentType: "application/pdf",
          ServerSideEncryption: "AES256",
        }),
      );
      cert = await db.certificate.update({
        where: { id: cert.id },
        data: { pdfUrl: `${prefix}${key}` },
      });
    }
    // Durable row survives worker/server restarts. Email failure never loses the PDF.
    await db.lmsCertificateDelivery.upsert({
      where: { enrollmentId: enrollment.id },
      create: { enrollmentId: enrollment.id },
      update: {},
    });
    return cert;
  }
  async function downloadUrl(cert) {
    if (isLocalMode()) {
      check(cert.pdfUrl === localUri(cert), 409, "CERTIFICATE_PENDING", "Generate the certificate PDF first.");
      const token = jwt.sign({ purpose: "certificate-pdf", certificateId: cert.id, certificateNo: cert.certificateNo },
        downloadSecret(), { algorithm: "HS256", audience: "local-certificate-download", expiresIn: "5m" });
      return `/api/lms/certificates/${cert.id}/pdf?token=${encodeURIComponent(token)}`;
    }
    const prefix = `s3://${bucket()}/`;
    check(
      cert.pdfUrl?.startsWith(prefix),
      409,
      "CERTIFICATE_PENDING",
      "Certificate upload is pending.",
    );
    return getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: bucket(),
        Key: cert.pdfUrl.slice(prefix.length),
      }),
      { expiresIn: 900 },
    );
  }
  async function deliver() {
    if (isLocalMode()) return;
    const table = db.lmsCertificateDelivery;
    await recoverDeliveries(table, new Date(), 120000);
    const jobs = await table.findMany({
      where: { status: "PENDING", nextAttemptAt: { lte: new Date() } },
      take: 10,
    });
    for (const job of jobs) {
      await dispatchDelivery({
        table,
        job,
        deliveryKey: `certificate:${job.enrollmentId}`,
        timeoutMs: emailTimeout(env),
        send: sendEmail || ((message) => sendThroughSendGrid(message, env)),
        prepare: async () => {
          check(
            env.SENDGRID_API_KEY && env.FROM_EMAIL,
            503,
            "EMAIL_NOT_CONFIGURED",
            "Configure SendGrid delivery.",
          );
          const cert = await db.certificate.findUnique({
            where: { enrollmentId: job.enrollmentId },
            include: { enrollment: true },
          });
          check(
            cert?.pdfUrl,
            409,
            "CERTIFICATE_PENDING",
            "Certificate upload is pending.",
          );
          check(
            env.LMS_APP_URL,
            503,
            "APP_URL_NOT_CONFIGURED",
            "Configure LMS_APP_URL for certificate emails.",
          );
          // Stable authenticated route; request a signed object URL when opened.
          return {
            to: cert.enrollment.studentEmail,
            subject: "Your course certificate is ready",
            text: `Your certificate for ${cert.courseName} is ready. Open ${env.LMS_APP_URL.replace(/\/$/, "")}/learner/certificates/${cert.id}`,
          };
        },
      });
    }
  }
  return { issue, downloadUrl, deliver, isLocalMode, readLocalPdf };
}
module.exports = { createCertificates, certificatePdf };
