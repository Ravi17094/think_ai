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
module.exports = { sendTestEmail, sendTestSMS };