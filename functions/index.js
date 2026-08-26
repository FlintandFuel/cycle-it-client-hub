const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const { onRequest } = require('firebase-functions/v2/https')
const { setGlobalOptions } = require('firebase-functions/v2')
const logger = require('firebase-functions/logger')
const admin = require('firebase-admin')

const { sendMail } = require('./lib/gmail')
const { buildProfileEmail, optOutConfirmationPage } = require('./lib/templates')

admin.initializeApp()
const db = admin.firestore()

// Closest Firebase region to South Africa.
setGlobalOptions({ region: 'europe-west1' })

const siteUrl = () => process.env.SITE_URL || `https://${process.env.GCLOUD_PROJECT}.web.app`

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
