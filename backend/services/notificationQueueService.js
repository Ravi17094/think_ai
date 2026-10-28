// ============================================================
// Notification Queue Service
// ============================================================
// Lightweight in-memory FIFO queue.
// Email failures are retried up to 3 times with backoff.
// ============================================================

const {
    sendEmail
} = require("./notificationService");

const {
    users
} = require("../data/users");

const queue = [];

let processing = false;

// Maximum number of attempts
const MAX_ATTEMPTS = 3;

// Backoff delays:
// Attempt 1 failure -> wait 1 second
// Attempt 2 failure -> wait 2 seconds
// Attempt 3 failure -> fail
const BACKOFF_DELAYS = [
    1000,
    2000
];

// ============================================================
// ENQUEUE
// ============================================================

function enqueue(job) {

    const queuedJob = {
        id:
            `job-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 8)}`,

        ...job,

        status: "pending",

        attempts: 0,

        createdAt:
            new Date().toISOString()
    };

    queue.push(queuedJob);

    console.log(
        `[queue] Job queued: ${queuedJob.id}`
    );

    return queuedJob;
}

// ============================================================
// QUEUE STATUS
// ============================================================

function getQueueStatus() {

    return {
        pending:
            queue.filter(
                (job) => job.status === "pending"
            ).length,

        processing:
            queue.filter(
                (job) => job.status === "processing"
            ).length,

        completed:
            queue.filter(
                (job) => job.status === "completed"
            ).length,

        failed:
            queue.filter(
                (job) => job.status === "failed"
            ).length,

        total: queue.length,

        jobs:
            queue.slice(-20)
    };
}

// ============================================================
// PROCESS NEXT JOB
// ============================================================

async function processNext() {

    const job = queue.find(
        (job) =>
            job.status === "pending" &&
            (!job.nextAttemptAt ||
                new Date(job.nextAttemptAt) <= new Date())
    );

    if (!job) {
        return null;
    }

    job.status = "processing";

    job.attempts++;

    console.log(
        `[queue] Processing ${job.id} - attempt ${job.attempts}/${MAX_ATTEMPTS}`
    );

    try {

        const user = job.userId === undefined
            ? null
            : users.find((u) => u.id === job.userId);

        const recipient = job.to || user?.email;

        if (!recipient) {
            throw new Error(
                job.userId === undefined
                    ? "Recipient email is required"
                    : `No user found for id ${job.userId}`
            );
        }

        // ====================================================
        // NOTIFICATION PREFERENCES
        // ====================================================

        // Load lazily to avoid a circular import: the preference service
        // enqueues its own change notifications.
        const prefs = job.userId === undefined
            ? null
            : require("./notificationPreferenceService")
                .getPreferencesByUserId(job.userId);

        // If email is disabled, do not send.
        if (prefs && prefs.emailEnabled === false) {

            console.log(
                `[queue] Email blocked for ${recipient} - user opted out`
            );

            job.status = "skipped";

            job.completedAt =
                new Date().toISOString();

            job.skipReason =
                "User opted out of email notifications";

            return job;
        }

        // ====================================================
        // SEND EMAIL
        // ====================================================

        await sendEmail({

            to: recipient,

            subject:
                job.subject ||
                `Thinkz AI: ${job.type}`,

            text:
                job.text ||
                `Hi ${job.recipientName || user?.name || "User"}, you have a new notification: ${job.type}.`,

            html: job.html
        });

        // ====================================================
        // SUCCESS
        // ====================================================

        job.status = "completed";

        job.completedAt =
            new Date().toISOString();

        job.error = null;

        console.log(
            `[queue] Email delivered successfully: ${job.id}`
        );

    } catch (error) {

        job.error = error.message;

        console.error(
            `[queue] Email attempt ${job.attempts} failed:`,
            error.message
        );

        // ====================================================
        // RETRY
        // ====================================================

        if (job.attempts < MAX_ATTEMPTS) {

            const delay =
                BACKOFF_DELAYS[
                    job.attempts - 1
                ] || 2000;

            job.status = "pending";

            job.nextAttemptAt =
                new Date(
                    Date.now() + delay
                ).toISOString();

            console.log(
                `[queue] Retrying ${job.id} in ${delay}ms`
            );

        } else {

            // ==================================================
            // FINAL FAILURE
            // ==================================================

            job.status = "failed";

            job.failedAt =
                new Date().toISOString();

            console.error(
                `[queue] Job permanently failed after ${MAX_ATTEMPTS} attempts: ${job.id}`
            );
        }
    }

    return job;
}

// ============================================================
// START WORKER
// ============================================================

function startWorker(intervalMs = 1000) {

    if (processing) {
        return;
    }

    processing = true;

    setInterval(
        processNext,
        intervalMs
    );

    console.log(
        `[queue] Worker started - interval ${intervalMs}ms`
    );
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
    enqueue,
    getQueueStatus,
    processNext,
    startWorker
};
