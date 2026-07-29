const { google } = require('googleapis');

// Sends mail via the Gmail API, authenticated as Ruan's Google Workspace
// account through an OAuth2 refresh token (not a service account — Gmail
// send-as-user requires a real mailbox). Credentials come from environment
// config; see ../.env.example for the variables to set.
function gmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

function encodeMessage({ to, from, subject, html }) {
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`,
    '',
    html,
  ].join('\r\n')

  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function sendMail({ to, subject, html }) {
  const from = process.env.GMAIL_SENDER_EMAIL
  const gmail = gmailClient()
  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encodeMessage({ to, from, subject, html }) },
  })
}

module.exports = { sendMail }
