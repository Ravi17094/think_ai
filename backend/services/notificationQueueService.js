// Simple in-memory job queue for notification delivery.
// No Redis/Bull installed today — this is a lightweight FIFO queue
// processed on an interval. Swap for Bull+Redis later if needed.

const queue = [];
let processing = false;

function enqueue(job) {
  const queuedJob = {
    id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...job,
    status: "pending",
    attempts: 0,
    createdAt: new Date().toISOString(),
  };
  queue.push(queuedJob);
  return queuedJob;
}

function getQueueStatus() {
  return {
    pending: queue.filter((j) => j.status === "pending").length,
    total: queue.length,
    jobs: queue.slice(-20), // last 20 for visibility, avoid huge payloads
  };
}

async function processNext() {
  const job = queue.find((j) => j.status === "pending");
  if (!job) return null;

  job.status = "processing";
  job.attempts++;

  try {
    // Simulated delivery — replace with real email/SMS/push service later
    console.log(`[queue] Processing job ${job.id}: ${job.type} -> user ${job.userId}`);
    await new Promise((resolve) => setTimeout(resolve, 100));

    job.status = "completed";
    job.completedAt = new Date().toISOString();
  } catch (err) {
    job.status = job.attempts >= 3 ? "failed" : "pending";
    job.error = err.message;
  }

  return job;
}

function startWorker(intervalMs = 1000) {
  if (processing) return;
  processing = true;
  setInterval(processNext, intervalMs);
  console.log("[queue] Worker started");
}

module.exports = { enqueue, getQueueStatus, processNext, startWorker };