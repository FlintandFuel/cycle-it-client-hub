import { useState } from 'react'
import { Link } from 'react-router-dom'
import Field from '../components/Field'
import SectionCard from '../components/SectionCard'
import { createProfile } from '../lib/profileStore'
import { DEFAULT_NOTES } from '../lib/demoData'
import logo from '../assets/cycle-it-logo-white.png'

const todayISO = () => new Date().toISOString().slice(0, 10)

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
  cleatFit: { sitBoneWidth: '', kneeAngle: '', cleatPosition: '' },
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

const cleatLabels = {
  sitBoneWidth: 'Sit-bone width',
  kneeAngle: 'Knee angle',
  cleatPosition: 'Cleat position',
}

export default function FitterView() {
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)

  function setField(section, key, value) {
    setForm((prev) =>
      section
        ? { ...prev, [section]: { ...prev[section], [key]: value } }
        : { ...prev, [key]: value },
    )
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
            onClick={handleStartNewFit}
            className="mt-8 w-full rounded-lg border border-border py-3.5 text-[15px] font-medium text-off-white transition-colors hover:border-orange"
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
          <Link
            to="/clients"
            className="mt-1 shrink-0 text-sm text-muted underline decoration-border underline-offset-4 hover:text-off-white"
          >
            All clients
          </Link>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
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

        <SectionCard step="02" title="Measurements">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {Object.entries(measurementLabels).map(([key, label]) => (
              <Field
                key={key}
                label={label}
                name={`measurements.${key}`}
                value={form.measurements[key]}
                onChange={(e) => setField('measurements', key, e.target.value)}
                placeholder="e.g. 730mm"
              />
            ))}
          </div>
        </SectionCard>

        <SectionCard step="03" title="Cleat fit">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {Object.entries(cleatLabels).map(([key, label]) => (
              <Field
                key={key}
                label={label}
                name={`cleatFit.${key}`}
                value={form.cleatFit[key]}
                onChange={(e) => setField('cleatFit', key, e.target.value)}
                placeholder="e.g. 120mm"
              />
            ))}
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
