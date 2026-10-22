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
// Calendly bookings still to come (from the start of today, so a session
// earlier today stays listed), soonest first. Looks at the 50 most recently
// made bookings and filters client-side — appointmentTime is a plain string
// from Calendly, so no composite index is needed. Bookings without a usable
// time can't be placed, so they're kept at the end rather than hidden.
export async function listUpcomingBookings() {
  const snap = await getDocs(query(collection(db, COLLECTION), orderBy('createdAt', 'desc'), limit(50)))
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const withTime = (b) => ({ ...b, startsAt: b.appointmentTime ? new Date(b.appointmentTime) : null })
  const bookings = snap.docs.map((d) => withTime({ id: d.id, ...d.data() }))
  const valid = (b) => b.startsAt && !Number.isNaN(b.startsAt.getTime())

  return [
    ...bookings.filter((b) => valid(b) && b.startsAt >= startOfToday).sort((a, b) => a.startsAt - b.startsAt),
    ...bookings.filter((b) => !valid(b)),
  ]
}
