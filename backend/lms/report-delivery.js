const { z } = require("zod");
const { analyticsCsv, analyticsPdf } = require("./reports");
const { check } = require("./errors");
const {
  dispatchDelivery,
  recoverDeliveries,
  sendThroughSendGrid,
  emailTimeout,
} = require("./email-delivery");
function configuration(env = process.env) {
  const recipients = (env.LMS_REPORT_RECIPIENTS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const missing = [];
  if (
    !recipients.length ||
    !recipients.every((s) => z.string().email().safeParse(s).success)
  )
    missing.push("LMS_REPORT_RECIPIENTS");
  for (const key of ["SENDGRID_API_KEY", "FROM_EMAIL"])
    if (!env[key]) missing.push(key);
  const cadence = env.LMS_REPORT_CADENCE || "weekly";
  if (!["weekly", "monthly", "quarterly"].includes(cadence))
    missing.push("LMS_REPORT_CADENCE");
  const utcHour = Number(env.LMS_REPORT_UTC_HOUR || 9);
  if (!Number.isInteger(utcHour) || utcHour < 0 || utcHour > 23)
    missing.push("LMS_REPORT_UTC_HOUR");
  return {
    enabled: env.LMS_REPORTS_ENABLED === "true",
    configured: missing.length === 0,
    missing,
    cadence,
    utcHour,
    recipients,
  };
}
function previousPeriod(now, cadence) {
  const boundary = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  if (cadence === "weekly")
    boundary.setUTCDate(
      boundary.getUTCDate() - ((boundary.getUTCDay() + 6) % 7),
    );
  else if (cadence === "monthly") boundary.setUTCDate(1);
  else {
    boundary.setUTCDate(1);
    boundary.setUTCMonth(Math.floor(boundary.getUTCMonth() / 3) * 3);
  }
  const start = new Date(boundary);
  if (cadence === "weekly") start.setUTCDate(start.getUTCDate() - 7);
  else
    start.setUTCMonth(start.getUTCMonth() - (cadence === "quarterly" ? 3 : 1));
  const end = new Date(boundary.getTime() - 1);
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
    key: `${cadence}:${boundary.toISOString().slice(0, 10)}`,
  };
}
function createReportDelivery({
  db,
  analytics,
  env = process.env,
  send,
  now = () => new Date(),
}) {
  async function tick() {
    const config = configuration(env);
    if (!config.enabled) return { status: "disabled" };
    check(
      config.configured,
      503,
      "REPORT_DELIVERY_NOT_CONFIGURED",
      `Configure ${config.missing.join(", ")}.`,
    );
    const date = now();
    if (date.getUTCHours() < config.utcHour) return { status: "not_due" };
    const period = previousPeriod(date, config.cadence);
    try {
      await db.lmsReportDelivery.upsert({
        where: { periodKey: period.key },
        create: {
          periodKey: period.key,
          from: period.from,
          to: period.to,
          recipients: config.recipients,
          nextAttemptAt: date,
        },
        update: {},
      });
    } catch (error) {
      if (error.code !== "P2002") throw error;
    }

    await recoverDeliveries(db.lmsReportDelivery, date, 300000);
    const jobs = await db.lmsReportDelivery.findMany({
      where: { status: "PENDING", nextAttemptAt: { lte: date } },
      take: 5,
    });
    for (const job of jobs) {
      await dispatchDelivery({
        table: db.lmsReportDelivery,
        job,
        deliveryKey: `report:${job.periodKey}`,
        now,
        timeoutMs: emailTimeout(env),
        retryDelayMs: 60000,
        sentData: () => ({ sentAt: now() }),
        send: send || ((message) => sendThroughSendGrid(message, env)),
        prepare: async () => {
          const data = await analytics({
            from: job.from,
            to: job.to,
            bucket: config.cadence,
          });
          const message = {
            to: job.recipients,
            from: env.FROM_EMAIL,
            subject: `Learning report: ${job.from} to ${job.to}`,
            text: "Your scheduled learning analytics report is attached.",
            attachments: [
              {
                content: Buffer.from(analyticsCsv(data, { env })).toString(
                  "base64",
                ),
                filename: "learning-analytics.csv",
                type: "text/csv",
                disposition: "attachment",
              },
              {
                content: (await analyticsPdf(data, { env })).toString("base64"),
                filename: "learning-analytics.pdf",
                type: "application/pdf",
                disposition: "attachment",
              },
            ],
          };
          return message;
        },
      });
    }
    return { status: "processed", count: jobs.length };
  }
  async function status() {
    const { recipients, ...config } = configuration(env);
    return {
      ...config,
      recipientCount: recipients.length,
      recent: await db.lmsReportDelivery.findMany({
        take: 10,
        orderBy: { id: "desc" },
        select: {
          id: true,
          periodKey: true,
          status: true,
          attempts: true,
          sentAt: true,
        },
      }),
    };
  }
  return { tick, status };
}
module.exports = { configuration, previousPeriod, createReportDelivery };
