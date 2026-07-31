// Firestore-backed data layer for the `bookings` collection — captured
// from Calendly's booking-confirmation redirect (see BookedConfirmation.jsx)
// so the fitter form can prefill client details instead of asking again.

import { db } from './firebase'
import { collection, doc, setDoc, getDocs, serverTimestamp, query, orderBy, limit } from 'firebase/firestore'

const COLLECTION = 'bookings'

export async function createBooking({ name, email, phone, appointmentTime }) {
  const ref = doc(collection(db, COLLECTION))
  const booking = {
    id: ref.id,
    name,
    email,
    phone: phone || '',
    appointmentTime: appointmentTime || '',
    createdAt: serverTimestamp(),
  }
  // Same reasoning as createProfile: don't await the server round-trip —
  // this page may itself be opened on weak signal.
  setDoc(ref, booking).catch((err) => console.error(`Failed to sync booking ${ref.id}`, err))
  return booking
}

// Requires an authenticated, allowlisted caller — see firestore.rules.
export async function listRecentBookings() {
  const snap = await getDocs(query(collection(db, COLLECTION), orderBy('createdAt', 'desc'), limit(20)))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}
