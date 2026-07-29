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
  await setDoc(ref, profile)
  return profile
}

// Requires an authenticated caller — see firestore.rules (`allow list`).
export async function listProfiles() {
  const snap = await getDocs(query(collection(db, COLLECTION), orderBy('createdAt', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}
