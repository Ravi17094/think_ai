const PDFDocument = require("pdfkit");
const { loadBranding } = require("./branding");

function certificatePdf(
  cert,
  { env = process.env, branding = loadBranding(env), sample = false } = {},
) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margins: { top: 50, bottom: 30, left: 50, right: 50 },
      info: {
        Title: `Certificate ${cert.certificateNo}`,
        Author: branding.name,
        Subject:
          sample || !branding.approved
            ? "Local sample; client template approval pending"
            : "Course completion certificate",
      },
    });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    try {
      doc
        .rect(20, 20, 801.89, 555.28)
        .lineWidth(2)
        .stroke(branding.primaryColor);
      if (branding.logoPath)
        doc.image(branding.logoPath, 50, 40, { fit: [130, 56] });
      else
        doc
          .fillColor(branding.primaryColor)
          .fontSize(17)
          .text(branding.name, 50, 40, { width: 250 });
      if (sample || !branding.approved)
        doc
          .fillColor("#8A5700")
          .fontSize(10)
          .text("LOCAL SAMPLE - CLIENT TEMPLATE APPROVAL PENDING", 310, 49, {
            width: 480,
            align: "right",
          });
      const fitted = (text, x, y, size, width, height, align = "left") => {
        let chosen = size;
        while (chosen > 7) {
          doc.fontSize(chosen);
          if (doc.heightOfString(text, { width, lineGap: 2 }) <= height) break;
          chosen--;
        }
        doc
          .fontSize(chosen)
          .text(text, x, y, { width, height, align, lineGap: 2 });
      };
      const centered = (text, y, size, height) =>
        fitted(text, 50, y, size, 741, height, "center");
      doc.fillColor(branding.primaryColor);
      centered("Certificate of Completion", 120, 31, 48);
      doc.fillColor("#333333");
      centered("This certifies that", 185, 14, 24);
      centered(cert.studentName, 218, 29, 63);
      centered("has successfully completed", 292, 14, 24);
      centered(cert.courseName, 323, 23, 73);
      if (branding.signatureImagePath)
        doc.image(branding.signatureImagePath, 581, 411, { fit: [160, 40] });
      doc
        .strokeColor("#9CA3AF")
        .lineWidth(0.6)
        .moveTo(536, 456)
        .lineTo(791, 456)
        .stroke();
      doc.fillColor("#333333");
      fitted(branding.signatureName, 536, 466, 12, 255, 28, "center");
      fitted(branding.signatureTitle, 536, 496, 10, 255, 24, "center");
      doc
        .fontSize(11)
        .text(
          `Issued: ${new Date(cert.issuedAt).toISOString().slice(0, 10)}`,
          50,
          466,
          { width: 440 },
        );
      fitted(branding.accreditationText, 50, 506, 9, 455, 42);
      doc
        .fillColor("#555555")
        .fontSize(8)
        .text(`Certificate ID: ${cert.certificateNo}`, 50, 554, {
          width: 741,
          align: "center",
          lineBreak: false,
        });
      doc.end();
    } catch (error) {
      doc.destroy();
      reject(error);
    }
  });
}
module.exports = { certificatePdf };
