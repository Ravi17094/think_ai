// A database outbox cannot atomically commit with SendGrid. Never automatically
// resend a request whose acceptance is unknown: reconcile it with provider logs
// using delivery_key before an operator decides whether a new send is safe.
function errorText(error) {
  return String(error?.message || "Email delivery failed.").slice(0, 1000);
}

function definitelyRejected(error) {
  if (error?.deliveryNotSent === true) return true;
  const status = Number(error?.response?.statusCode ?? error?.response?.status);
  // A network timeout or provider 5xx can occur after provider acceptance.
  return (
    Number.isInteger(status) && status >= 400 && status < 500 && status !== 408
  );
}

function emailTimeout(env = process.env) {
  const value = Number(env.LMS_EMAIL_TIMEOUT_MS || 15000);
  return Number.isFinite(value) && value > 0 ? Math.min(value, 30000) : 15000;
}

async function sendThroughSendGrid(message, env = process.env) {
  if (!env.SENDGRID_API_KEY || !env.FROM_EMAIL) {
    const error = new Error("Configure SendGrid delivery.");
    error.deliveryNotSent = true;
    throw error;
  }
  const mail = require("@sendgrid/mail");
  mail.setApiKey(env.SENDGRID_API_KEY);
  mail.setTimeout(emailTimeout(env));
  const response = await mail.send({ ...message, from: env.FROM_EMAIL });
  if (!Array.isArray(response) || response[0]?.statusCode !== 202)
    throw new Error(
      "SendGrid acceptance was not confirmed; reconcile before retrying.",
    );
  return response;
}

async function boundedSend(send, message, timeoutMs) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(() => send(message)),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          const error = new Error(
            "Email request timed out; reconcile provider acceptance before retrying.",
          );
          error.code = "EMAIL_DELIVERY_UNKNOWN";
          reject(error);
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function recoverDeliveries(table, date, leaseMs) {
  const expired = { lt: new Date(date.getTime() - leaseMs) };
  // PREPARING has not crossed the irreversible dispatch boundary.
  await table.updateMany({
    where: { status: "PREPARING", updatedAt: expired },
    data: { status: "PENDING", updatedAt: date },
  });
  // Includes legacy SENDING rows because an older worker may already have sent.
  await table.updateMany({
    where: { status: { in: ["DISPATCHING", "SENDING"] }, updatedAt: expired },
    data: {
      status: "UNKNOWN",
      updatedAt: date,
      lastError:
        "Worker stopped during dispatch. Reconcile delivery_key with provider events before any resend.",
    },
  });
}

async function dispatchDelivery({
  table,
  job,
  deliveryKey,
  prepare,
  send,
  now = () => new Date(),
  timeoutMs = 15000,
  retryDelayMs = 1000,
  sentData = {},
}) {
  const claimedAt = now();
  const claim = await table.updateMany({
    where: { id: job.id, status: "PENDING" },
    data: { status: "PREPARING", updatedAt: claimedAt },
  });
  if (!claim.count) return { status: "not_claimed" };
  const attempts = job.attempts + 1;
  const retry = (error, status, extraWhere = {}) =>
    table.updateMany({
      where: { id: job.id, status, ...extraWhere },
      data: {
        status: attempts >= 4 ? "FAILED" : "PENDING",
        attempts,
        updatedAt: now(),
        lastError: errorText(error),
        nextAttemptAt: new Date(now().getTime() + retryDelayMs * 2 ** attempts),
      },
    });
  let message;
  try {
    message = await prepare();
  } catch (error) {
    await retry(error, "PREPARING", { updatedAt: claimedAt });
    return { status: "retryable" };
  }
  const dispatch = await table.updateMany({
    where: { id: job.id, status: "PREPARING", updatedAt: claimedAt },
    data: { status: "DISPATCHING", attempts, updatedAt: now() },
  });
  // A slow preparation whose lease expired cannot dispatch after a new claim.
  if (!dispatch.count) return { status: "lease_lost" };
  try {
    const response = await boundedSend(
      send,
      {
        ...message,
        customArgs: { ...message.customArgs, delivery_key: deliveryKey },
      },
      timeoutMs,
    );
    if (response?.dev === true) {
      const error = new Error("Email adapter did not send to a provider.");
      error.deliveryNotSent = true;
      throw error;
    }
    const accepted = await table.updateMany({
      where: { id: job.id, status: { in: ["DISPATCHING", "UNKNOWN"] } },
      data: {
        ...(typeof sentData === "function" ? sentData() : sentData),
        status: "SENT",
        updatedAt: now(),
        lastError: null,
      },
    });
    if (!accepted.count)
      throw new Error(
        "Provider accepted but durable sent status could not be confirmed.",
      );
    return { status: "sent" };
  } catch (error) {
    if (definitelyRejected(error)) {
      await retry(error, "DISPATCHING");
      return { status: "retryable" };
    }
    await table.updateMany({
      where: { id: job.id, status: "DISPATCHING" },
      data: {
        status: "UNKNOWN",
        updatedAt: now(),
        lastError:
          `${errorText(error)} Reconcile delivery_key=${deliveryKey} before any resend.`.slice(
            0,
            1000,
          ),
      },
    });
    return { status: "unknown" };
  }
}

module.exports = {
  dispatchDelivery,
  recoverDeliveries,
  sendThroughSendGrid,
  emailTimeout,
  definitelyRejected,
};
