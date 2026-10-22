import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { createBooking } from '../lib/bookingStore'
import logo from '../assets/cycle-it-logo-white.png'

// Landing page for Calendly's booking-confirmation redirect. Configure the
// event type's "Redirect to an external site" with a plain URL pointing
// here, plus the separate "Pass event details to your redirected page"
// toggle — Calendly then appends its own fixed query param names (not
// merge tags typed into the URL field). See README for the exact setup.
// Captures them into Firestore so the fitter can pick the client from a
// list on the day instead of asking them to fill in their details again.
// Calendly sends custom-question answers as answer_1…answer_10 in the order
// the questions are listed on the event type (labels aren't passed). If the
// questions are reordered in Calendly, update this mapping to match.
const ANSWER = { phone: 'answer_1', bikeMake: 'answer_2', bikeSize: 'answer_3' }

export default function BookedConfirmation() {
  const [params] = useSearchParams()
  const [status, setStatus] = useState('saving')

  const name = params.get('invitee_full_name')?.trim()
  const email = params.get('invitee_email')?.trim()
  // Only populated if the invitee opts into "Text me a reminder" and
  // enters a number — Calendly's native phone field, no custom question
  // needed. Left blank otherwise, same as before.
  const phone = params.get(ANSWER.phone)?.trim() || params.get('text_reminder_number')?.trim()
  const bikeMake = params.get(ANSWER.bikeMake)?.trim()
  const bikeSize = params.get(ANSWER.bikeSize)?.trim()
  const appointmentTime = params.get('event_start_time')?.trim()

  useEffect(() => {
    if (!name || !email) {
      setStatus('missing')
      return
    }
    createBooking({ name, email, phone, appointmentTime, bikeMake, bikeSize }).then(() => setStatus('saved'))
  }, [name, email, phone, appointmentTime, bikeMake, bikeSize])

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm text-center">
        <img src={logo} alt="Cycle-It" className="mx-auto h-16 w-auto" />

        {status === 'missing' ? (
          <>
            <h1 className="mt-6 text-xl font-semibold text-off-white">You&apos;re booked!</h1>
            <p className="mt-2 text-sm text-muted">See you soon for your bike fit.</p>
          </>
        ) : (
          <>
            <div className="mx-auto mt-6 mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-orange/15">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-orange" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="mt-2 text-xl font-semibold text-off-white">You&apos;re all set{name ? `, ${name.split(' ')[0]}` : ''}!</h1>
            <p className="mt-2 text-sm text-muted">
              We&apos;ve got your details ready for your fit session — no need to fill anything in
              again when you arrive.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
