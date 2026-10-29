// Firestore-backed data layer for the `profiles` collection defined in the
// build brief. Callers (FitterView, ClientProfileView, ClientsDashboard)
// only depend on the function signatures below, not on Firestore itself.

import { db } from './firebase'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore'

const COLLECTION = 'profiles'

export async function getProfile(id) {
  const snap = await getDoc(doc(db, COLLECTION, id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function createProfile(data) {
  const ref = doc(collection(db, COLLECTION))
  const profile = {
    ...data,
    id: ref.id,
    createdAt: serverTimestamp(),
    emailStatus: { profileEmailSent: false, profileEmailSentAt: null },
    review: { optedOut: false, clicked: false },
    followUp: { sent: false, sentAt: null },
  }
  // Deliberately not awaited: setDoc() writes to the local cache
  // synchronously (so getProfile(ref.id) works immediately, even offline),
  // but its returned promise only resolves once the backend acknowledges
  // the write — which never happens without a connection. Awaiting it
  // would hang the whole save on weak/no signal, exactly the case this
  // needs to handle. The write still queues and syncs automatically once
  // back online; errors are logged rather than surfaced synchronously.
  setDoc(ref, profile).catch((err) => console.error(`Failed to sync profile ${ref.id}`, err))
  return profile
}

// A component bought outside a fit session. Stored as its own `profiles`
// doc (kind: 'components', fitDate = purchase date) so the Components page,
// client history and the monthly invoice all pick it up by date with no
// extra plumbing. profileEmailSent starts true so onProfileCreated skips
// it — there's no fit profile to email the client.
export async function createComponentPurchase({ client, date, components }) {
  const ref = doc(collection(db, COLLECTION))
  const purchase = {
    id: ref.id,
    kind: 'components',
    client,
    fitDate: date,
    components,
    createdAt: serverTimestamp(),
    emailStatus: { profileEmailSent: true, profileEmailSentAt: null },
  }
  // Not awaited, for the same offline reason as createProfile above.
  setDoc(ref, purchase).catch((err) => console.error(`Failed to sync component purchase ${ref.id}`, err))
  return purchase
}

export function isComponentPurchase(profile) {
  return profile?.kind === 'components'
}

// Requires an authenticated caller — see firestore.rules (`allow list`).
export async function listProfiles() {
  const snap = await getDocs(query(collection(db, COLLECTION), orderBy('createdAt', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// Requires an authenticated, allowlisted caller — see firestore.rules
// (`allow update`). merge:true so system fields not present in `data`
// (emailStatus, review, followUp, createdAt) are left untouched.
export async function updateProfile(id, data) {
  await setDoc(doc(db, COLLECTION, id), data, { merge: true })
}

// Requires an authenticated, allowlisted caller — see firestore.rules
// (`allow delete`).
export async function deleteProfile(id) {
  await deleteDoc(doc(db, COLLECTION, id))
}
