const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https')
const { setGlobalOptions } = require('firebase-functions/v2')
const logger = require('firebase-functions/logger')
const admin = require('firebase-admin')

const { sendMail } = require('./lib/gmail')
const { buildProfileEmail, optOutConfirmationPage } = require('./lib/templates')

// Mirrors src/lib/allowedEmails.js and firestore.rules — keep all three in
// sync (can't share the ES module across the client bundle and this
// CommonJS function).
const ALLOWED_FITTER_EMAILS = ['ruan.photos26@gmail.com', 'cvaniek@gmail.com']

admin.initializeApp()
const db = admin.firestore()

// Closest Firebase region to South Africa.
setGlobalOptions({ region: 'europe-west1' })

const siteUrl = () => process.env.SITE_URL || `https://${process.env.GCLOUD_PROJECT}.web.app`
const shopPhone = () => process.env.SHOP_PHONE || ''

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

// Phase 2b — "Don't ask me again" opt-out endpoint. Not currently linked
// from the profile email (the review ask was pulled out — see
// buildProfileEmail), but left in place in case a review ask returns via
// this or another channel later.
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

// Phase 3 (3-month follow-up reminder) is dropped for now — Calendly's own
// 6-month workflow covers that touchpoint. See git history
// (functions/lib/templates.js buildFollowUpEmail, this file's
// sendFollowUpReminders) if it needs to come back.
