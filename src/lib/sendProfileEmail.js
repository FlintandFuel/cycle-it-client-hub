import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'

// Manual send/resend of the profile email — backs the "Send email" button
// on the fitter dashboard. See functions/index.js sendProfileEmail for why
// this exists alongside the automatic onProfileCreated trigger.
export async function sendProfileEmail(profileId) {
  const call = httpsCallable(functions, 'sendProfileEmail')
  await call({ profileId })
}
