const sgMail = require('@sendgrid/mail');
const twilio = require('twilio');
require('dotenv').config();

// Configure SendGrid API Key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Configure Twilio Client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID, 
  process.env.TWILIO_AUTH_TOKEN
);

// Pure template helpers are kept separate from delivery so they can be reused
// by the queue worker and safely previewed or tested without email credentials.
function enrollmentConfirmationEmail({ name, courseName } = {}) {
  const learnerName = name || 'Learner';
  const course = courseName || 'your course';
  return {
    subject: `Enrollment confirmed — ${course}`,
    text: `Hi ${learnerName}, your enrollment in ${course} has been confirmed. You can now begin learning.`,
    html: `<p>Hi ${escapeHtml(learnerName)},</p><p>Your enrollment in <strong>${escapeHtml(course)}</strong> has been confirmed. You can now begin learning.</p>`,
  };
}

function certificateEmail({ name, courseName, certificateId, certificateUrl } = {}) {
  const learnerName = name || 'Learner';
  const course = courseName || 'your course';
  const id = certificateId || 'pending';
  const url = certificateUrl || '';
  return {
    subject: `Your certificate — ${course}`,
    text: `Hi ${learnerName}, your certificate for ${course} is ready. Certificate ID: ${id}.${url ? ` Verify or download it: ${url}` : ''}`,
    html: `<p>Hi ${escapeHtml(learnerName)},</p><p>Your certificate for <strong>${escapeHtml(course)}</strong> is ready.</p><p>Certificate ID: <strong>${escapeHtml(id)}</strong></p>${url ? `<p><a href="${escapeHtml(url)}">Verify or download your certificate</a></p>` : ''}`,
  };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Function to send a test email via SendGrid
async function sendTestEmail(toEmail) {
  const msg = {
    to: toEmail,
    from: process.env.FROM_EMAIL,
    subject: 'Live Demo Test Email',
    text: "Janadeep's SendGrid email test notification.",
  };
  return sgMail.send(msg);
}

// Function to send a test SMS via Twilio
async function sendTestSMS(toPhone) {
  return twilioClient.messages.create({
    body: "Janadeep's Twilio SMS notification.",
    from: process.env.TWILIO_PHONE_NUM,
    to: toPhone
  });
}

// Export the functions for use in other files
module.exports = {
  sendTestEmail,
  sendTestSMS,
  enrollmentConfirmationEmail,
  certificateEmail,
};
