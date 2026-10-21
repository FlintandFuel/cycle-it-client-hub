const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https')
const { onSchedule } = require('firebase-functions/v2/scheduler')
const { setGlobalOptions } = require('firebase-functions/v2')
const logger = require('firebase-functions/logger')
const admin = require('firebase-admin')

const { sendMail } = require('./lib/gmail')
const { buildProfileEmail, buildInvoiceEmail, buildComponentsEmail, optOutConfirmationPage } = require('./lib/templates')
const { cycleEndingOnOrBefore, cycleContaining } = require('./lib/billingPeriod')

// Mirrors src/lib/allowedEmails.js and firestore.rules — keep all three in
// sync (can't share the ES module across the client bundle and this
// CommonJS function).
const ALLOWED_FITTER_EMAILS = ['ruan.photos26@gmail.com', 'cvaniek@gmail.com', 'cycle.itt@gmail.com']

// The bike shop Cycle-It bills monthly for new bike fits done on-site.
const INVOICE_RECIPIENT_EMAIL = 'cvaniek@gmail.com'

admin.initializeApp()
const db = admin.firestore()

// Closest Firebase region to South Africa.
setGlobalOptions({ region: 'europe-west1' })

const siteUrl = () => process.env.SITE_URL || `https://${process.env.GCLOUD_PROJECT}.web.app`
const shopPhone = () => process.env.SHOP_PHONE || ''

// Letterhead details for the monthly invoice — see functions/.env.example.
// Snapshotted onto the invoice doc at creation (not re-read on every
// regenerate) so a later change to these env vars doesn't silently rewrite
// an invoice's "From"/"Billed to" after the fact.
const businessDetails = () => ({
  fromName: process.env.BUSINESS_NAME || 'Cycle-It',
  fromAddress: process.env.BUSINESS_ADDRESS || '',
  fromEmail: process.env.BUSINESS_EMAIL || '',
  fromPhone: shopPhone(),
  billedToName: process.env.BILLED_TO_NAME || 'Dunkeld Cycles',
  billedToAddress: process.env.BILLED_TO_ADDRESS || '',
})

// Phase 2 — on a new fit profile, email the client their profile link.
// Idempotent: claims emailStatus.profileEmailSent in a transaction before
// sending, so Cloud Functions' at-least-once delivery can't double-send
// on retry.
exports.onProfileCreated = onDocumentCreated('profiles/{profileId}', async (event) => {
  const ref = event.data.ref
  const profile = event.data.data()

  const claimed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (snap.data()?.emailStatus?.profileEmailSent) return false
    tx.update(ref, {
      'emailStatus.profileEmailSent': true,
      'emailStatus.profileEmailSentAt': admin.firestore.FieldValue.serverTimestamp(),
    })
    return true
  })

  if (!claimed) {
    logger.info(`Profile email already sent for ${ref.id}, skipping.`)
    return
  }

  const { subject, html } = buildProfileEmail({
    profile,
    profileUrl: `${siteUrl()}/p/${ref.id}`,
    shopPhone: shopPhone(),
  })

  try {
    await sendMail({ to: profile.client.email, subject, html })
  } catch (err) {
    // Sending failed — release the claim so a retried event (or a manual
    // re-trigger) can attempt the send again instead of being skipped.
    await ref.update({
      'emailStatus.profileEmailSent': false,
      'emailStatus.profileEmailSentAt': null,
    })
    logger.error(`Failed to send profile email for ${ref.id}`, err)
    throw err
  }
})

// Manual send/resend — the "Send email" button on the fitter dashboard.
// Needed because onProfileCreated above only ever fires once per profile
// (no retry policy on the Firestore trigger) and idempotently skips a
// second attempt, so a failed auto-send (bad credentials, client typo'd
// their email and it got corrected, etc.) has no automatic path to retry.
exports.sendProfileEmail = onCall(async (request) => {
  if (!request.auth || !ALLOWED_FITTER_EMAILS.includes(request.auth.token.email)) {
    throw new HttpsError('permission-denied', 'Only allowlisted fitters can send profile emails.')
  }

  const profileId = request.data?.profileId
  if (!profileId || typeof profileId !== 'string') {
    throw new HttpsError('invalid-argument', 'profileId is required.')
  }

  const ref = db.doc(`profiles/${profileId}`)
  const snap = await ref.get()
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Profile not found.')
  }
  const profile = snap.data()

  const { subject, html } = buildProfileEmail({
    profile,
    profileUrl: `${siteUrl()}/p/${profileId}`,
    shopPhone: shopPhone(),
  })

  try {
    await sendMail({ to: profile.client.email, subject, html })
  } catch (err) {
    logger.error(`Manual send failed for ${profileId}`, err)
    throw new HttpsError('internal', 'Failed to send the email — check function logs for details.')
  }

  await ref.set(
    {
      emailStatus: {
        profileEmailSent: true,
        profileEmailSentAt: admin.firestore.FieldValue.serverTimestamp(),
        lastManualSendAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    },
    { merge: true },
  )

  return { sent: true }
})

// Phase 2b — "Don't ask me again" opt-out endpoint. profile.review.optedOut
// is honored by buildProfileEmail (skips the review ask), but nothing
// currently links to this endpoint from the email itself — it's here for
// whichever channel ends up surfacing the opt-out link to clients.
exports.reviewOptOut = onRequest(async (req, res) => {
  const profileId = req.query.id
  if (!profileId || typeof profileId !== 'string') {
    res.status(400).send('Missing profile id.')
    return
  }

  await db.doc(`profiles/${profileId}`).set({ review: { optedOut: true } }, { merge: true })

  res.set('Content-Type', 'text/html')
  res.status(200).send(optOutConfirmationPage())
})

// Billing — Dunkeld Cycles pays Cycle-It monthly for new bike fits done
// on-site (fitter tags these with newBikeFit: 'Yes' on the form). Rolling
// 26th-of-last-month to 25th-of-this-month cycle — see billingPeriod.js.
//
// Deterministic doc ID (the cycle's end date) makes this idempotent the
// same way onProfileCreated is: regenerating an already-sent invoice
// refreshes its line items (in case a fit was logged or corrected after
// the fact) without resetting emailStatus, so a resend never looks like a
// duplicate to the shop.
async function getOrCreateInvoice(period) {
  const snap = await db
    .collection('profiles')
    .where('newBikeFit', '==', 'Yes')
    .where('fitDate', '>=', period.start)
    .where('fitDate', '<=', period.end)
    .orderBy('fitDate', 'asc')
    .get()
  const items = snap.docs.map((d) => {
    const p = d.data()
    return { profileId: d.id, clientName: p.client?.name || 'Unknown', fitDate: p.fitDate }
  })

  // Components fitted (brand / description / retail price) are logged on
  // any fit, not just new bike fits, so they're gathered from every profile
  // in the cycle. Range filter on fitDate alone needs no composite index;
  // the "has components" check happens here instead.
  const fitsInPeriod = await db
    .collection('profiles')
    .where('fitDate', '>=', period.start)
    .where('fitDate', '<=', period.end)
    .orderBy('fitDate', 'asc')
    .get()
  const components = []
  for (const d of fitsInPeriod.docs) {
    const p = d.data()
    for (const c of p.components || []) {
      const price = Number(c.price)
      if (!c.brand && !c.description) continue
      components.push({
        profileId: d.id,
        clientName: p.client?.name || 'Unknown',
        fitDate: p.fitDate,
        brand: c.brand || '',
        description: c.description || '',
        price: Number.isFinite(price) ? price : 0,
      })
    }
  }
  const componentsTotal = Math.round(components.reduce((sum, c) => sum + c.price, 0) * 100) / 100

  const ref = db.doc(`invoices/${period.id}`)
  await db.runTransaction(async (tx) => {
    const existing = await tx.get(ref)
    if (existing.exists) {
      tx.update(ref, {
        items,
        count: items.length,
        components,
        componentsTotal,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    } else {
      tx.set(ref, {
        id: period.id,
        periodStart: period.start,
        periodEnd: period.end,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        items,
        count: items.length,
        components,
        componentsTotal,
        recipientEmail: INVOICE_RECIPIENT_EMAIL,
        business: businessDetails(),
        emailStatus: { sent: false, sentAt: null, lastManualSendAt: null },
      })
    }
  })
  return ref
}

async function sendInvoice(ref, { manual } = {}) {
  const snap = await ref.get()
  const invoice = snap.data()
  const { subject, html } = buildInvoiceEmail({ invoice, invoiceUrl: `${siteUrl()}/invoice/${ref.id}` })
  await sendMail({ to: invoice.recipientEmail, subject, html })
  await ref.set(
    {
      emailStatus: {
        sent: true,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        ...(manual ? { lastManualSendAt: admin.firestore.FieldValue.serverTimestamp() } : null),
      },
    },
    { merge: true },
  )
  return invoice
}

// The components list goes out as its own email alongside the invoice. Has
// its own sent flags so a failure on one doesn't block or repeat the other;
// nothing is sent for a period with no components.
async function sendComponentsList(ref, { manual } = {}) {
  const snap = await ref.get()
  const invoice = snap.data()
  if (!(invoice.components || []).length) return invoice
  const { subject, html } = buildComponentsEmail({ invoice })
  await sendMail({ to: invoice.recipientEmail, subject, html })
  await ref.set(
    {
      emailStatus: {
        componentsSent: true,
        componentsSentAt: admin.firestore.FieldValue.serverTimestamp(),
        ...(manual ? { componentsLastManualSendAt: admin.firestore.FieldValue.serverTimestamp() } : null),
      },
    },
    { merge: true },
  )
  return invoice
}

// Scheduled for the 25th of every month. Africa/Johannesburg so "the 25th"
// means the 25th at the shop's local date, not UTC's.
exports.onMonthlyInvoiceDue = onSchedule(
  { schedule: '0 8 25 * *', timeZone: 'Africa/Johannesburg' },
  async () => {
    const period = cycleEndingOnOrBefore(new Date())
    try {
      const ref = await getOrCreateInvoice(period)
      const status = (await ref.get()).data()?.emailStatus
      if (status?.sent) {
        logger.info(`Invoice ${ref.id} already sent, skipping scheduled send.`)
      } else {
        await sendInvoice(ref)
      }
      if (status?.componentsSent) {
        logger.info(`Components list ${ref.id} already sent, skipping scheduled send.`)
      } else {
        await sendComponentsList(ref)
      }
    } catch (err) {
      logger.error(`Failed to send invoice ${period.id}`, err)
      throw err
    }
  },
)

// Manual "Generate & send invoice now" button on the dashboard — targets
// the *current, still-open* cycle (unlike the scheduled function, which
// only ever fires once the cycle has closed) so pressing it reflects fits
// logged so far this month. Note: since it marks the invoice sent, using
// this mid-cycle means the scheduled function will skip its own send on
// the 25th (it treats "already sent" as done) — the dashboard's Sent/Not
// sent badge makes that visible, so re-press this near the 25th if the
// cycle picked up more fits since the last manual send.
exports.sendMonthlyInvoice = onCall(async (request) => {
  if (!request.auth || !ALLOWED_FITTER_EMAILS.includes(request.auth.token.email)) {
    throw new HttpsError('permission-denied', 'Only allowlisted fitters can send invoices.')
  }

  const period = cycleContaining(new Date())

  let invoice
  try {
    const ref = await getOrCreateInvoice(period)
    invoice = await sendInvoice(ref, { manual: true })
    await sendComponentsList(ref, { manual: true })
  } catch (err) {
    logger.error(`Manual invoice send failed for ${period.id}`, err)
    throw new HttpsError('internal', 'Failed to send the invoice — check function logs for details.')
  }

  return {
    sent: true,
    invoiceId: period.id,
    count: invoice.count,
    componentCount: (invoice.components || []).length,
  }
})

// Phase 3 (3-month follow-up reminder) is dropped for now — Calendly's own
// 6-month workflow covers that touchpoint. See git history
// (functions/lib/templates.js buildFollowUpEmail, this file's
// sendFollowUpReminders) if it needs to come back.
