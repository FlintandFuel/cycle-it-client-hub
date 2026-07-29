// Email HTML deliberately uses a light background rather than the app's
// near-black theme — dark backgrounds render inconsistently across mail
// clients (Outlook desktop in particular), so transactional email here
// trades the app's dark UI for reliable readability, keeping the orange
// accent as the brand thread between the two.
const ORANGE = '#E8672B'
const ORANGE_HIGHLIGHT = '#FF9B19'
const INK = '#0B0B0C'
const MUTED = '#6B6B70'

function layout(bodyHtml) {
  return `
  <div style="background:#F4F4F2;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E7E7E5;">
      <div style="padding:28px 32px 0;">
        <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:${ORANGE};">Cycle-It</p>
      </div>
      <div style="padding:16px 32px 32px;color:${INK};">
        ${bodyHtml}
      </div>
    </div>
    <p style="max-width:480px;margin:20px auto 0;text-align:center;font-size:12px;color:${MUTED};">
      Cycle-It Bike Fitting
    </p>
  </div>`
}

function button(href, label, color = ORANGE) {
  return `<a href="${href}" style="display:inline-block;background:${color};color:#0B0B0C;font-weight:600;font-size:15px;text-decoration:none;padding:14px 24px;border-radius:8px;">${label}</a>`
}

function buildProfileEmail({ profile, profileUrl, reviewUrl, optOutUrl }) {
  const subject = `${profile.client.name}, your Cycle-It fit profile is ready`

  const html = layout(`
    <h1 style="margin:0 0 12px;font-size:22px;">Your fit profile is ready</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${INK};">
      Hi ${profile.client.name}, thanks for coming in today. Your bike fit measurements
      from your session with ${profile.fitSpecialist} are saved and ready to view any time.
    </p>
    <p style="margin:0 0 32px;">${button(profileUrl, 'View your fit profile')}</p>

    <hr style="border:none;border-top:1px solid #E7E7E5;margin:0 0 24px;" />

    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${INK};">
      Glad we could sort out your fit? A quick review helps other riders find us.
    </p>
    <p style="margin:0 0 12px;">${button(reviewUrl, 'Leave us a review', ORANGE_HIGHLIGHT)}</p>
    <p style="margin:0;font-size:13px;">
      <a href="${optOutUrl}" style="color:${MUTED};text-decoration:underline;">Don't ask me again</a>
    </p>
  `)

  return { subject, html }
}

function buildFollowUpEmail({ profile, calendlyUrl }) {
  const subject = `How's the fit feeling, ${profile.client.name}?`

  const html = layout(`
    <h1 style="margin:0 0 12px;font-size:22px;">Time for a check-in?</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${INK};">
      Hi ${profile.client.name}, it's been about three months since your fit with
      ${profile.fitSpecialist}. How's it feeling? Cables and components settle in over
      time, so it's a good moment for a quick tune-up if anything feels off.
    </p>
    <p style="margin:0;">${button(calendlyUrl, 'Book a follow-up')}</p>
  `)

  return { subject, html }
}

function optOutConfirmationPage() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Cycle-It</title>
  </head>
  <body style="margin:0;background:${INK};color:#F5F4F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;">
      <div>
        <p style="font-size:12px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:${ORANGE};margin:0 0 12px;">Cycle-It</p>
        <h1 style="font-size:22px;margin:0 0 8px;">Got it, we won't ask again</h1>
        <p style="color:#9A9A9E;font-size:15px;margin:0;">You'll still hear from us about your fit — just not about reviews.</p>
      </div>
    </div>
  </body>
</html>`
}

module.exports = { buildProfileEmail, buildFollowUpEmail, optOutConfirmationPage }
