const nodemailer = require('nodemailer');

// Sends mail via Gmail's SMTP relay, authenticated as Ruan's Gmail account
// with an App Password (myaccount.google.com/apppasswords) rather than
// OAuth2 — this is a personal Gmail account, not Workspace, so an OAuth
// refresh token would expire every 7 days without going through Google's
// full app-verification review. App passwords don't expire on their own.
function transporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_SENDER_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

async function sendMail({ to, subject, html }) {
  await transporter().sendMail({
    from: process.env.GMAIL_SENDER_EMAIL,
    to,
    subject,
    html,
  });
}

module.exports = { sendMail };
