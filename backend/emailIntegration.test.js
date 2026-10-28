const test = require("node:test");
const assert = require("node:assert/strict");

const {
    enrollmentConfirmationEmail,
    certificateEmail
} = require("./services/notificationService");

const {
    enqueue,
    getQueueStatus
} = require("./services/notificationQueueService");

test("enrollment confirmation template includes learner and course details", () => {
    const email = enrollmentConfirmationEmail({
        name: "Roopesh",
        courseName: "Node Fundamentals"
    });

    assert.match(email.subject, /Node Fundamentals/);
    assert.match(email.text, /Roopesh/);
    assert.match(email.html, /Node Fundamentals/);
});

test("certificate template includes the certificate identifier and verification URL", () => {
    const email = certificateEmail({
        name: "Kartik",
        courseName: "React Fundamentals",
        certificateId: "CERT-2026-1234",
        certificateUrl: "https://example.test/verify/CERT-2026-1234"
    });

    assert.match(email.subject, /React Fundamentals/);
    assert.match(email.text, /CERT-2026-1234/);
    assert.match(email.html, /https:\/\/example\.test/);
});

test("the delivery queue accepts an enrollment recipient that is not a mock user", () => {
    const job = enqueue({
        type: "enrollment-confirmation",
        to: "learner@example.test",
        recipientName: "Roopesh",
        subject: "Enrollment Confirmed",
        text: "Welcome"
    });

    assert.equal(job.status, "pending");
    assert.equal(job.to, "learner@example.test");
    assert.ok(getQueueStatus().jobs.some((item) => item.id === job.id));
});
