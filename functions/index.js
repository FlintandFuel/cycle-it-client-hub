const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const { onRequest } = require('firebase-functions/v2/https')
const { onSchedule } = require('firebase-functions/v2/scheduler')
const { setGlobalOptions } = require('firebase-functions/v2')
const logger = require('firebase-functions/logger')
const admin = require('firebase-admin')

const { sendMail } = require('./lib/gmail')
const { buildProfileEmail, buildFollowUpEmail, optOutConfirmationPage } = require('./lib/templates')

admin.initializeApp()
const db = admin.firestore()

// Closest Firebase region to South Africa.
setGlobalOptions({ region: 'europe-west1' })

const siteUrl = () => process.env.SITE_URL || `https://${process.env.GCLOUD_PROJECT}.web.app`
const reviewUrl = () => process.env.REVIEW_URL
const optOutUrl = (profileId) => `${siteUrl()}/review-opt-out?id=${profileId}`

// Phase 2 — on a new fit profile, email the client their profile link plus
// a review ask (Phase 2b). Idempotent: claims emailStatus.profileEmailSent
// in a transaction before sending, so Cloud Functions' at-least-once
// delivery can't double-send on retry.
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
    reviewUrl: reviewUrl(),
    optOutUrl: optOutUrl(ref.id),
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

// Phase 2b — "Don't ask me again" link in the review section. Opt-out only
// ever suppresses the review ask; it must never touch followUp.sent, which
// is the Phase 3 rebooking reminder and stays independent.
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

// Phase 3 — daily job (8am SAST) that emails clients whose fit was
// 89-92 days ago and who haven't had a follow-up sent yet. fitDate is
// stored as a "YYYY-MM-DD" string, which sorts/compares correctly as a
// plain string range. The 89-92 day window (not exactly "3 months ago")
// is deliberately a few days wide so a daily cron can't skip anyone.
exports.sendFollowUpReminders = onSchedule(
  { schedule: '0 8 * * *', timeZone: 'Africa/Johannesburg' },
  async () => {
    const toISODate = (d) => d.toISOString().slice(0, 10)
    const today = new Date()
    const windowStart = new Date(today)
    windowStart.setUTCDate(windowStart.getUTCDate() - 92)
    const windowEnd = new Date(today)
    windowEnd.setUTCDate(windowEnd.getUTCDate() - 89)

    const snap = await db
      .collection('profiles')
      .where('fitDate', '>=', toISODate(windowStart))
      .where('fitDate', '<=', toISODate(windowEnd))
      .where('followUp.sent', '==', false)
      .get()

    for (const docSnap of snap.docs) {
      const ref = docSnap.ref
      const profile = docSnap.data()

      const claimed = await db.runTransaction(async (tx) => {
        const fresh = await tx.get(ref)
        if (fresh.data()?.followUp?.sent) return false
        tx.update(ref, {
          'followUp.sent': true,
          'followUp.sentAt': admin.firestore.FieldValue.serverTimestamp(),
        })
        return true
      })
      if (!claimed) continue

      const { subject, html } = buildFollowUpEmail({ profile, calendlyUrl: process.env.CALENDLY_URL })

      try {
        await sendMail({ to: profile.client.email, subject, html })
      } catch (err) {
        // Don't let one bad send take down the rest of the daily batch —
        // release the claim so tomorrow's run retries this client, log,
        // and move on.
        await ref.update({ 'followUp.sent': false, 'followUp.sentAt': null })
        logger.error(`Failed to send follow-up email for ${ref.id}`, err)
      }
    }
  },
)
