import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import Field from '../components/Field'
import SectionCard from '../components/SectionCard'
import { createProfile } from '../lib/profileStore'
import { listRecentBookings } from '../lib/bookingStore'
import { DEFAULT_NOTES } from '../lib/demoData'
import { useOnlineStatus } from '../lib/useOnlineStatus'
import { auth } from '../lib/firebase'
import { ALLOWED_EMAILS } from '../lib/allowedEmails'
import logo from '../assets/cycle-it-logo-white.png'

const todayISO = () => new Date().toISOString().slice(0, 10)

// wa.me needs digits-only international format. Cycle-It is SA-based, so a
// local "0..." number is assumed to be a South African number missing its
// +27 country code — the common case when a fitter types it by hand.
function toWhatsAppNumber(phone) {
  const digits = phone.replace(/\D/g, '')
  return digits.startsWith('0') ? `27${digits.slice(1)}` : digits
}

// Includes the link directly rather than "check your email" — Phase 2
// automated email isn't live yet, and even once it is, WhatsApp is a more
// reliable delivery channel to lean on than assuming the email lands.
function whatsAppNudgeUrl(client, url) {
  const firstName = client.name.trim().split(' ')[0]
  const message = `Hi ${firstName}, your Cycle-It bike fit is done! Here's your fit profile: ${url}`
  return `https://wa.me/${toWhatsAppNumber(client.phone)}?text=${encodeURIComponent(message)}`
}

const emptyForm = {
  fitDate: todayISO(),
  fitSpecialist: 'Ruan Smit',
  bike: { make: '', model: '', size: '' },
  measurements: {
    saddleHeight: '',
    reach: '',
    saddleSetback: '',
    stemLength: '',
    saddleToBarDrop: '',
    handlebarWidth: '',
    crankLength: '',
  },
  measurementRecommendations: {
    saddleHeight: '',
    reach: '',
    saddleSetback: '',
    stemLength: '',
    saddleToBarDrop: '',
    handlebarWidth: '',
    crankLength: '',
  },
  cleatFit: {
    sitBoneWidth: '',
    kneeAngle: '',
    cleatPosition: { left: '', right: '' },
  },
  notes: DEFAULT_NOTES,
  client: { name: '', email: '', phone: '', consentGiven: false },
}

const measurementLabels = {
  saddleHeight: 'Saddle height',
  reach: 'Reach (saddle to bar)',
  saddleSetback: 'Saddle setback',
  stemLength: 'Stem length',
  saddleToBarDrop: 'Saddle to bar drop',
  handlebarWidth: 'Handlebar width',
  crankLength: 'Crank length',
}

export default function FitterView() {
  const online = useOnlineStatus()
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)
  const [savedOffline, setSavedOffline] = useState(false)
  const [copied, setCopied] = useState(false)
  const [bookings, setBookings] = useState([])

  // Recent Calendly bookings (see bookingStore.js / BookedConfirmation.jsx)
  // only load for a signed-in, allowlisted fitter — reading the bookings
  // collection at all requires that per firestore.rules, and it keeps the
  // no-login "standing next to a bike" flow completely unchanged for
  // anyone else who loads this page.
  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        if (u && ALLOWED_EMAILS.includes(u.email)) {
          listRecentBookings().then(setBookings).catch(() => setBookings([]))
        } else {
          setBookings([])
        }
      }),
    [],
  )

  function useBooking(booking) {
    setForm((prev) => ({
      ...prev,
      client: { ...prev.client, name: booking.name, email: booking.email, phone: booking.phone || '' },
    }))
  }

  function setField(section, key, value) {
    setForm((prev) =>
      section
        ? { ...prev, [section]: { ...prev[section], [key]: value } }
        : { ...prev, [key]: value },
    )
  }

  function setCleatPosition(side, value) {
    setForm((prev) => ({
      ...prev,
      cleatFit: {
        ...prev.cleatFit,
        cleatPosition: { ...prev.cleatFit.cleatPosition, [side]: value },
      },
    }))
  }

  function validate() {
    const next = {}
    if (!form.bike.make.trim()) next.bikeMake = 'Required'
    if (!form.bike.model.trim()) next.bikeModel = 'Required'
    if (!form.bike.size.trim()) next.bikeSize = 'Required'
    if (!form.client.name.trim()) next.clientName = 'Required'
    if (!form.client.email.trim()) next.clientEmail = 'Required'
    else if (!/^\S+@\S+\.\S+$/.test(form.client.email)) next.clientEmail = 'Enter a valid email'
    if (!form.client.phone.trim()) next.clientPhone = 'Required'
    if (!form.client.consentGiven) next.consent = 'Consent is required before saving'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    setSavedOffline(!online)
    try {
      const profile = await createProfile(form)
      setResult(profile)
    } finally {
      setSaving(false)
    }
  }

  function handleCopy() {
    const url = `${window.location.origin}/p/${result.id}`
    navigator.clipboard?.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleShare() {
    const url = `${window.location.origin}/p/${result.id}`
    if (navigator.share) {
      // Opens the OS share sheet (WhatsApp, Messages, Mail, AirDrop, etc.)
      // — falls back to copy-link on browsers that don't support it
      // (most desktop browsers, which is the fitter dashboard's primary
      // use case).
      navigator.share({ title: 'Cycle-It fit profile', text: `${form.client.name}'s bike fit profile`, url }).catch(() => {})
    } else {
      handleCopy()
    }
  }

  function handleStartNewFit() {
    setForm({ ...emptyForm, fitDate: todayISO() })
    setErrors({})
    setResult(null)
  }

  if (result) {
    const url = `${window.location.origin}/p/${result.id}`
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg rounded-xl border border-border bg-ink-raised p-8 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-orange/15">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-orange" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-off-white">Profile saved</h1>
          <p className="mt-2 text-sm text-muted">
            {form.client.name}&apos;s fit profile is ready to share.
          </p>

          {savedOffline && (
            <p className="mt-3 rounded-lg border border-orange/40 bg-orange/10 px-4 py-2.5 text-sm text-orange">
              Saved offline — it'll sync automatically once you're back in range. The link
              below will work for others as soon as it does.
            </p>
          )}

          <div className="mt-6 flex items-center gap-2 rounded-lg border border-border bg-ink px-4 py-3">
            <span className="flex-1 truncate text-left text-sm text-off-white">{url}</span>
            <button
              onClick={handleCopy}
              className="shrink-0 rounded-md bg-orange px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-orange-light"
            >
              {copied ? 'Copied' : 'Copy link'}
            </button>
          </div>

          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-sm text-muted underline decoration-border underline-offset-4 hover:text-off-white"
          >
            Open profile page
          </a>

          <button
            onClick={handleShare}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-orange py-3.5 text-[15px] font-semibold text-ink transition-colors hover:bg-orange-light"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v9m0-9 3.5 3.5M12 5 8.5 8.5M5 14v3.5A1.5 1.5 0 0 0 6.5 19h11a1.5 1.5 0 0 0 1.5-1.5V14" />
            </svg>
            Share profile
          </button>

          <a
            href={whatsAppNudgeUrl(form.client, url)}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border py-3.5 text-[15px] font-medium text-off-white transition-colors hover:border-orange"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.198.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12.004 2.003c-5.514 0-9.997 4.483-9.997 9.997 0 1.762.462 3.484 1.34 4.997L2 22l5.114-1.341a9.958 9.958 0 0 0 4.89 1.28h.004c5.514 0 9.997-4.483 9.997-9.997 0-2.671-1.04-5.182-2.929-7.071a9.93 9.93 0 0 0-7.072-2.868zm0 18.174a8.16 8.16 0 0 1-4.166-1.14l-.299-.177-3.033.796.81-2.957-.195-.303a8.156 8.156 0 0 1-1.257-4.396c0-4.507 3.667-8.174 8.176-8.174 2.184 0 4.238.85 5.783 2.395a8.126 8.126 0 0 1 2.393 5.785c0 4.508-3.667 8.171-8.212 8.171z" />
            </svg>
            Send WhatsApp nudge
          </a>

          <button
            onClick={handleStartNewFit}
            className="mt-3 w-full rounded-lg border border-border py-3.5 text-[15px] font-medium text-off-white transition-colors hover:border-orange"
          >
            Start new fit
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ink pb-24">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-start justify-between px-4 py-8 sm:px-6">
          <div>
            <img src={logo} alt="Cycle-It" className="h-16 w-auto" />
            <h1 className="mt-4 text-2xl font-bold text-off-white sm:text-3xl">New bike fit</h1>
          </div>
          <div className="mt-1 flex shrink-0 flex-col items-end gap-2">
            <span
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                online ? 'border-border text-muted' : 'border-orange/40 bg-orange/10 text-orange'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-muted' : 'bg-orange'}`} />
              {online ? 'Online' : 'Offline — saves will sync later'}
            </span>
            <Link
              to="/clients"
              className="text-sm text-muted underline decoration-border underline-offset-4 hover:text-off-white"
            >
              All clients
            </Link>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        {bookings.length > 0 && (
          <SectionCard title="Recent bookings" subtitle="From Calendly — tap a client to fill in their details.">
            <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
              {bookings.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => useBooking(b)}
                  className="shrink-0 rounded-lg border border-border px-4 py-3 text-left transition-colors hover:border-orange"
                >
                  <p className="text-sm font-medium text-off-white">{b.name}</p>
                  <p className="text-xs text-muted">{b.email}</p>
                </button>
              ))}
            </div>
          </SectionCard>
        )}

        <SectionCard title="Session">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              label="Fit date"
              name="fitDate"
              type="date"
              value={form.fitDate}
              onChange={(e) => setField(null, 'fitDate', e.target.value)}
            />
            <Field
              label="Fit specialist"
              name="fitSpecialist"
              value={form.fitSpecialist}
              onChange={(e) => setField(null, 'fitSpecialist', e.target.value)}
            />
          </div>
        </SectionCard>

        <SectionCard step="01" title="Bike details">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Field
              label="Make"
              name="bikeMake"
              required
              value={form.bike.make}
              onChange={(e) => setField('bike', 'make', e.target.value)}
              error={errors.bikeMake}
              placeholder="Cervelo"
            />
            <Field
              label="Model"
              name="bikeModel"
              required
              value={form.bike.model}
              onChange={(e) => setField('bike', 'model', e.target.value)}
              error={errors.bikeModel}
              placeholder="Caledonia-5"
            />
            <Field
              label="Size"
              name="bikeSize"
              required
              value={form.bike.size}
              onChange={(e) => setField('bike', 'size', e.target.value)}
              error={errors.bikeSize}
              placeholder="54cm"
            />
          </div>
        </SectionCard>

        <SectionCard
          step="02"
          title="Measurements"
          subtitle="Recommendations show alongside each measurement on the client's fit profile."
        >
          <div className="space-y-5">
            {Object.entries(measurementLabels).map(([key, label]) => (
              <div key={key} className="grid grid-cols-1 gap-3 rounded-lg border border-border p-4 sm:grid-cols-2">
                <Field
                  label={label}
                  name={`measurements.${key}`}
                  value={form.measurements[key]}
                  onChange={(e) => setField('measurements', key, e.target.value)}
                  placeholder="e.g. 730mm"
                />
                <Field
                  label="Recommendation"
                  name={`measurementRecommendations.${key}`}
                  value={form.measurementRecommendations[key]}
                  onChange={(e) => setField('measurementRecommendations', key, e.target.value)}
                  placeholder="e.g. Reassess in 3 months"
                />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard step="03" title="Cleat fit">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Field
              label="Sit-bone width"
              name="cleatFit.sitBoneWidth"
              value={form.cleatFit.sitBoneWidth}
              onChange={(e) => setField('cleatFit', 'sitBoneWidth', e.target.value)}
              placeholder="e.g. 120mm"
            />
            <Field
              label="Knee angle"
              name="cleatFit.kneeAngle"
              value={form.cleatFit.kneeAngle}
              onChange={(e) => setField('cleatFit', 'kneeAngle', e.target.value)}
              placeholder="e.g. 40°"
            />
          </div>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              label="Cleat position — left"
              name="cleatFit.cleatPosition.left"
              value={form.cleatFit.cleatPosition.left}
              onChange={(e) => setCleatPosition('left', e.target.value)}
              placeholder="e.g. 190mm"
            />
            <Field
              label="Cleat position — right"
              name="cleatFit.cleatPosition.right"
              value={form.cleatFit.cleatPosition.right}
              onChange={(e) => setCleatPosition('right', e.target.value)}
              placeholder="e.g. 190mm"
            />
          </div>
        </SectionCard>

        <SectionCard step="04" title="Notes">
          <Field
            label="Fitment notes"
            name="notes"
            as="textarea"
            rows={5}
            value={form.notes}
            onChange={(e) => setField(null, 'notes', e.target.value)}
          />
        </SectionCard>

        <div className="relative pt-4">
          <div className="absolute -top-3 left-0 right-0 flex items-center gap-3 px-1">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs font-semibold uppercase tracking-widest text-muted">
              Hand this screen to your client
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <SectionCard
            title="Client details"
            subtitle="We use this to send your fit profile and, if you're happy for us to, a quick reminder in a few months."
            className="border-orange/40"
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field
                label="Full name"
                name="name"
                required
                value={form.client.name}
                onChange={(e) => setField('client', 'name', e.target.value)}
                error={errors.clientName}
              />
              <Field
                label="Phone"
                name="phone"
                required
                type="tel"
                value={form.client.phone}
                onChange={(e) => setField('client', 'phone', e.target.value)}
                error={errors.clientPhone}
                placeholder="+27 82 555 0134"
              />
              <Field
                label="Email"
                name="email"
                required
                type="email"
                value={form.client.email}
                onChange={(e) => setField('client', 'email', e.target.value)}
                error={errors.clientEmail}
                className="sm:col-span-2"
              />
            </div>

            <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-ink p-4">
              <input
                type="checkbox"
                checked={form.client.consentGiven}
                onChange={(e) => setField('client', 'consentGiven', e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-orange"
              />
              <span className="text-sm text-off-white">
                I consent to Cycle-It storing my contact details and fit measurements, and
                emailing me my fit profile.
              </span>
            </label>
            {errors.consent && <p className="mt-2 text-sm text-orange">{errors.consent}</p>}
          </SectionCard>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-orange py-4 text-[17px] font-semibold text-ink transition-colors hover:bg-orange-light disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save & generate profile'}
        </button>
      </form>
    </div>
  )
}
