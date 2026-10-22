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
// the questions are listed on that event type (labels aren't passed), and
// each event type has its own questions — so the order is looked up by event
// name (event_type_name, matched case-insensitively; the "- Dunkeld Cycles:
// R995" suffix doesn't matter). Keys we don't use (address, shoeSize,
// weight) just hold a slot. If questions change in Calendly, update here.
const DEFAULT_ORDER = ['phone', 'bikeMake', 'bikeSize']
const QUESTION_ORDERS = [
  { match: 'new bike fit', order: ['phone'] },
  { match: 'house fit', order: ['phone', 'address', 'bikeMake', 'bikeSize'] },
  { match: 'insoles', order: ['phone', 'shoeSize', 'weight', 'bikeMake', 'bikeSize'] },
]

function answersFor(params) {
  const eventName = (params.get('event_type_name') || '').toLowerCase()
  const order = QUESTION_ORDERS.find((q) => eventName.includes(q.match))?.order || DEFAULT_ORDER
  const answers = {}
  order.forEach((key, i) => {
    answers[key] = params.get(`answer_${i + 1}`)?.trim()
  })
  return answers
}

export default function BookedConfirmation() {
  const [params] = useSearchParams()
  const [status, setStatus] = useState('saving')

  const name = params.get('invitee_full_name')?.trim()
  const email = params.get('invitee_email')?.trim()
  // Only populated if the invitee opts into "Text me a reminder" and
  // enters a number — Calendly's native phone field, no custom question
  // needed. Left blank otherwise, same as before.
  const answers = answersFor(params)
  const phone = answers.phone || params.get('text_reminder_number')?.trim()
  const { bikeMake, bikeSize } = answers
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
