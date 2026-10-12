// Email HTML deliberately uses a light background rather than the app's
// near-black theme — dark backgrounds render inconsistently across mail
// clients (Outlook desktop in particular), so transactional email here
// trades the app's dark UI for reliable readability, keeping the orange
// accent as the brand thread between the two.
const ORANGE = '#E8672B'
const INK = '#0B0B0C'
const MUTED = '#6B6B70'

// headerRight is optional letterhead content (e.g. "INVOICE" + a number)
// shown top-right, level with the Cycle-It wordmark — a table, not
// flex/grid, since Outlook desktop's Word rendering engine ignores both.
function layout(bodyHtml, headerRight = '') {
  return `
  <div style="background:#F4F4F2;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E7E7E5;">
      <table role="presentation" style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:28px 32px 0;vertical-align:top;">
            <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:${ORANGE};">Cycle-It</p>
          </td>
          ${headerRight ? `<td style="padding:28px 32px 0;vertical-align:top;text-align:right;">${headerRight}</td>` : ''}
        </tr>
      </table>
      <div style="padding:16px 32px 32px;color:${INK};">
        ${bodyHtml}
      </div>
    </div>
    <p style="max-width:480px;margin:20px auto 0;text-align:center;font-size:12px;color:${MUTED};">
      Cycle-It Bike Fitting
    </p>
  </div>`
}

// background-color (not just the background shorthand) plus a matching
// border is deliberate belt-and-braces: some mail clients (Outlook
// desktop in particular) drop background styling on <a> tags entirely and
// fall back to their own default link color, which reads as an
// unbranded/untrustworthy red or blue — the border keeps an orange edge
// visible even if the fill gets dropped.
function button(href, label, color = ORANGE) {
  return `<a href="${href}" style="display:inline-block;background:${color};background-color:${color};border:2px solid ${color};color:#0B0B0C;font-weight:600;font-size:15px;text-decoration:none;padding:12px 24px;border-radius:8px;">${label}</a>`
}

const REVIEW_URL = 'https://g.page/r/CYrj4CFQ_xiSEB0/review'

function buildProfileEmail({ profile, profileUrl, shopPhone }) {
  const subject = `${profile.client.name}, your Cycle-It fit profile is ready`

  // Skipped for anyone who's opted out via reviewOptOut() — that endpoint
  // predates this ask being wired back in, but the flag already exists on
  // the profile so it's honored here rather than re-inventing it.
  const reviewHtml = profile.review?.optedOut
    ? ''
    : `<div style="margin:0 0 24px;padding:20px;background:#F4F4F2;border-radius:10px;text-align:center;">
        <p style="margin:0 0 12px;font-size:14px;line-height:1.5;color:${INK};">
          Happy with your fit? A quick Google review helps other riders find us.
        </p>
        ${button(REVIEW_URL, 'Leave a review')}
      </div>`

  const html = layout(`
    <h1 style="margin:0 0 12px;font-size:22px;">Your fit profile is ready</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${INK};">
      Hi ${profile.client.name}, thanks for coming in today. Your bike fit measurements
      from your session with ${profile.fitSpecialist} are saved and ready to view any time.
    </p>
    <p style="margin:0 0 28px;">${button(profileUrl, 'View your fit profile')}</p>
    ${reviewHtml}
    <p style="margin:0;padding-top:20px;border-top:1px solid #E7E7E5;font-size:14px;line-height:1.6;color:${INK};">
      Any questions about your fit, just reply to this email.<br/><br/>
      <strong>Ruan Smit</strong><br/>
      ${shopPhone ? `${shopPhone}<br/>` : ''}
      <a href="https://cycleit.co.za" style="color:${ORANGE};text-decoration:none;">cycleit.co.za</a>
    </p>
  `)

  return { subject, html }
}

// invoice.periodStart/periodEnd/items[].fitDate are all "YYYY-MM-DD"
// strings (see functions/lib/billingPeriod.js) — parsed as UTC midnight so
// the displayed date can't shift a day depending on the recipient's
// timezone.
function formatInvoiceDate(iso) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

// A period-derived number (no separate counter to maintain) — stable and
// unique per billing cycle since invoice doc IDs already are.
function invoiceNumber(invoice) {
  return `INV-${invoice.id.replace(/-/g, '')}`
}

function formatRand(amount) {
  return `R${Number(amount || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Brand/description are free text typed by the fitter, so escaped before
// going into HTML.
function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Empty string when nothing was logged this cycle, so an invoice for a
// month with no parts fitted looks exactly as it did before.
function componentsSection(invoice) {
  const components = invoice.components || []
  if (!components.length) return ''

  const th = `text-align:left;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:${MUTED};`
  const rows = components
    .map((c, i) => {
      const td = `padding:10px 12px;font-size:14px;color:${INK};border-bottom:1px solid #E7E7E5;`
      return `
        <tr style="background:${i % 2 === 1 ? '#F9F9F8' : '#ffffff'};">
          <td style="${td}">${formatInvoiceDate(c.fitDate)}</td>
          <td style="${td}">${esc(c.clientName)}</td>
          <td style="${td}">${esc(c.brand)} — ${esc(c.description)}</td>
          <td style="${td}text-align:right;white-space:nowrap;">${formatRand(c.price)}</td>
        </tr>`
    })
    .join('')

  return `
    <h2 style="margin:8px 0 8px;font-size:18px;">Components fitted</h2>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${INK};">
      Parts added during fit sessions this billing period, at retail price — ${components.length} in total.
    </p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
      <thead>
        <tr style="background:#F4F4F2;">
          <th style="${th}">Date</th>
          <th style="${th}">Client</th>
          <th style="${th}">Component</th>
          <th style="${th}text-align:right;">Retail</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="padding:12px;font-size:14px;font-weight:700;color:${INK};text-align:right;">Total</td>
          <td style="padding:12px;font-size:14px;font-weight:700;color:${INK};text-align:right;white-space:nowrap;">${formatRand(invoice.componentsTotal)}</td>
        </tr>
      </tfoot>
    </table>
  `
}

function buildInvoiceEmail({ invoice, invoiceUrl }) {
  const periodLabel = `${formatInvoiceDate(invoice.periodStart)} – ${formatInvoiceDate(invoice.periodEnd)}`
  const subject = `Cycle-It new bike fits — ${periodLabel}`
  const business = invoice.business || {}

  const headerRight = `
    <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${INK};">Invoice</p>
    <p style="margin:2px 0 0;font-size:12px;color:${MUTED};">No. ${invoiceNumber(invoice)}</p>
  `

  const addressBlock = (name, address, extra = []) => `
    <p style="margin:0;font-size:14px;line-height:1.6;color:${INK};">
      <strong>${name}</strong><br/>
      ${address ? `${address.replace(/\n/g, '<br/>')}<br/>` : ''}
      ${extra.filter(Boolean).join('<br/>')}
    </p>
  `

  const billingBlock = `
    <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
      <tr>
        <td style="width:50%;vertical-align:top;padding:0 12px 0 0;">
          <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:${MUTED};">From</p>
          ${addressBlock(business.fromName || 'Cycle-It', business.fromAddress, [business.fromEmail, business.fromPhone])}
        </td>
        <td style="width:50%;vertical-align:top;padding:0 0 0 12px;">
          <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:${MUTED};">Billed to</p>
          ${addressBlock(business.billedToName || 'Dunkeld Cycles', business.billedToAddress)}
        </td>
      </tr>
    </table>
  `

  const rows = invoice.items.length
    ? invoice.items
        .map(
          (item, i) => `
        <tr style="background:${i % 2 === 1 ? '#F9F9F8' : '#ffffff'};">
          <td style="padding:10px 12px;font-size:14px;color:${INK};border-bottom:1px solid #E7E7E5;">${formatInvoiceDate(item.fitDate)}</td>
          <td style="padding:10px 12px;font-size:14px;color:${INK};border-bottom:1px solid #E7E7E5;">${item.clientName}</td>
        </tr>`,
        )
        .join('')
    : `<tr><td colspan="2" style="padding:14px 12px;font-size:14px;color:${MUTED};">No new bike fits in this period.</td></tr>`

  const html = layout(
    `
    <h1 style="margin:0 0 4px;font-size:22px;">New bike fits</h1>
    <p style="margin:0 0 20px;font-size:14px;color:${MUTED};">${periodLabel}</p>
    ${billingBlock}
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${INK};">
      Itemised list of new bike fits for this billing period to cross-reference — ${invoice.count} in total.
    </p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
      <thead>
        <tr style="background:#F4F4F2;">
          <th style="text-align:left;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:${MUTED};">Date</th>
          <th style="text-align:left;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:${MUTED};">Client</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    ${componentsSection(invoice)}
    <p style="margin:0 0 28px;">${button(invoiceUrl, 'View online')}</p>
    <p style="margin:0;padding-top:20px;border-top:1px solid #E7E7E5;font-size:14px;line-height:1.6;color:${INK};">
      Any questions, just reply to this email.<br/><br/>
      <strong>Ruan Smit</strong><br/>
      <a href="https://cycleit.co.za" style="color:${ORANGE};text-decoration:none;">cycleit.co.za</a>
    </p>
  `,
    headerRight,
  )

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

module.exports = { buildProfileEmail, buildInvoiceEmail, optOutConfirmationPage }
