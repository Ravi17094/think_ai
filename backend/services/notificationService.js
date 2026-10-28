const sgMail = require("@sendgrid/mail");
require("dotenv").config();

// ============================================================
// SendGrid Configuration
// ============================================================

const FROM_EMAIL = process.env.FROM_EMAIL;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

const DEV_EMAIL_MODE = !SENDGRID_API_KEY || !FROM_EMAIL;

if (DEV_EMAIL_MODE) {
    console.info(
        "[mail] SendGrid not configured — email runs in dev mode (logged, not sent)"
    );
} else {
    sgMail.setApiKey(SENDGRID_API_KEY);
}

// ============================================================
// Generic Email Function
// ============================================================

const sendEmail = async ({
    to,
    subject,
    text,
    html
}) => {
    try {
        if (!to) {
            throw new Error("Recipient email is required");
        }

        if (DEV_EMAIL_MODE) {
            console.log(
                `[dev] Email queued (SendGrid not configured, FROM_EMAIL=${FROM_EMAIL || "unset"}): to=${to}, subject=${subject}`
            );
            return { ok: true, dev: true };
        }

        const message = {
            to,
            from: FROM_EMAIL,
            subject,
            text
        };

        if (html) {
            message.html = html;
        }

        const response = await sgMail.send(message);

        console.log(`✅ Email sent successfully to ${to}`);

        return response;

    } catch (error) {
        console.error("❌ Email sending failed:", error);

        if (error.response?.body) {
            console.error(
                "SendGrid response:",
                error.response.body
            );
        }

        throw error;
    }
};

// ============================================================
// EMAIL TEMPLATES
// ============================================================

const enrollmentConfirmationEmail = ({
    name,
    courseName
}) => {
    return {
        subject: `Enrollment Confirmed - ${courseName}`,

        text:
            `Hello ${name},

` +
            `Your enrollment in ${courseName} has been confirmed.

` +
            `You can now access your course from the Thinkz AI LMS.

` +
            `Thank you,
Thinkz AI LMS`,

        html: `
            <div style="font-family: Arial, sans-serif;">
                <h2>Enrollment Confirmed</h2>

                <p>Hello <strong>${name}</strong>,</p>

                <p>
                    Your enrollment in
                    <strong>${courseName}</strong>
                    has been confirmed.
                </p>

                <p>
                    You can now access your course from
                    the Thinkz AI LMS.
                </p>

                <p>
                    Thank you,<br>
                    <strong>Thinkz AI LMS</strong>
                </p>
            </div>
        `
    };
};


// ============================================================
// SEND ENROLLMENT CONFIRMATION EMAIL
// ============================================================

const sendEnrollmentConfirmationEmail = async ({
    to,
    name,
    courseName
}) => {

    const email = enrollmentConfirmationEmail({
        name,
        courseName
    });

    return sendEmail({
        to,
        subject: email.subject,
        text: email.text,
        html: email.html
    });
};


// ============================================================
// CERTIFICATE EMAIL TEMPLATE
// ============================================================

const certificateEmail = ({
    name,
    courseName,
    certificateId,
    certificateUrl
}) => {
    return {
        subject: `Certificate Issued - ${courseName}`,

        text:
            `Hello ${name},

` +
            `Congratulations!

` +
            `Your certificate for ${courseName} has been issued.

` +
            `Certificate ID: ${certificateId}

` +
            `Certificate: ${certificateUrl}

` +
            `Thank you,
Thinkz AI LMS`,

        html: `
            <div style="font-family: Arial, sans-serif;">
                <h2>Congratulations, ${name}!</h2>

                <p>
                    Your certificate for
                    <strong>${courseName}</strong>
                    has been issued.
                </p>

                <p>
                    <strong>Certificate ID:</strong>
                    ${certificateId}
                </p>

                <p>
                    <a href="${certificateUrl}">
                        Download Certificate
                    </a>
                </p>

                <p>
                    Thank you,<br>
                    <strong>Thinkz AI LMS</strong>
                </p>
            </div>
        `
    };
};


// ============================================================
// SEND CERTIFICATE EMAIL
// ============================================================

const sendCertificateEmail = async ({
    to,
    name,
    courseName,
    certificateId,
    certificateUrl
}) => {

    const email = certificateEmail({
        name,
        courseName,
        certificateId,
        certificateUrl
    });

    return sendEmail({
        to,
        subject: email.subject,
        text: email.text,
        html: email.html
    });
};


// ============================================================
// TEST EMAIL
// ============================================================

const sendTestEmail = async (toEmail) => {
    return sendEmail({
        to: toEmail,
        subject: "Live Demo Test Email",
        text: "This is a test email sent via SendGrid."
    });
};


// ============================================================
// EXPORT
// ============================================================

module.exports = {
    sendEmail,
    sendTestEmail,
    enrollmentConfirmationEmail,
    sendEnrollmentConfirmationEmail,
    certificateEmail,
    sendCertificateEmail
};