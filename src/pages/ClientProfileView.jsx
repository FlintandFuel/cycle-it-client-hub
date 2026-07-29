import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getProfile } from '../lib/profileStore'
import logo from '../assets/cycle-it-logo-white.png'

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

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function ClientProfileView() {
  const { id } = useParams()
  const [profile, setProfile] = useState(undefined)

  useEffect(() => {
    let active = true
    getProfile(id).then((p) => {
      if (active) setProfile(p)
    })
    return () => {
      active = false
    }
  }, [id])

  if (profile === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <p className="text-muted">Loading…</p>
      </div>
    )
  }

  if (profile === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink px-6 text-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-orange">Not found</p>
          <p className="mt-2 text-muted">This fit profile link isn&apos;t valid, or has been removed.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ink pb-16">
      <div className="mx-auto max-w-md px-5 pt-10 sm:max-w-lg">
        <img src={logo} alt="Cycle-It" className="h-16 w-auto" />
        <h1 className="mt-4 text-2xl font-bold text-off-white">Your bike fit profile</h1>
        <p className="mt-1 text-sm text-muted">Prepared for {profile.client.name}</p>

        {/* Summary card */}
        <div className="mt-6 rounded-xl border border-border bg-ink-raised p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-off-white">
                {profile.bike.make} {profile.bike.model}
              </p>
              <p className="text-sm text-muted">Size {profile.bike.size}</p>
            </div>
            <div className="rounded-full border border-orange/40 bg-orange/10 px-3 py-1 text-xs font-medium text-orange">
              {profile.bike.size}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-4 text-sm">
            <div>
              <span className="text-muted">Fit date · </span>
              <span className="text-off-white">{formatDate(profile.fitDate)}</span>
            </div>
            <div>
              <span className="text-muted">Fitter · </span>
              <span className="text-off-white">{profile.fitSpecialist}</span>
            </div>
          </div>
        </div>

        {/* Measurements */}
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
            Measurements
          </h2>
          <div className="overflow-hidden rounded-xl border border-border">
            {Object.entries(measurementLabels).map(([key, label], i) => (
              <Row
                key={key}
                label={label}
                value={profile.measurements?.[key]}
                striped={i % 2 === 1}
              />
            ))}
          </div>
        </section>

        {/* Cleat fit */}
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
            Cleat fit
          </h2>
          <div className="overflow-hidden rounded-xl border border-border">
            {Object.entries(cleatLabels).map(([key, label], i) => (
              <Row
                key={key}
                label={label}
                value={profile.cleatFit?.[key]}
                striped={i % 2 === 1}
              />
            ))}
          </div>
        </section>

        {/* Notes */}
        {profile.notes && (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
              Notes
            </h2>
            <div className="rounded-xl border border-border bg-ink-raised p-5">
              <p className="text-sm leading-relaxed text-off-white/90">{profile.notes}</p>
            </div>
          </section>
        )}

        <p className="mt-10 text-center text-xs text-muted">
          Cycle-It Bike Fitting · fit questions? Reply to your profile email.
        </p>
      </div>
    </div>
  )
}

function Row({ label, value, striped }) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-3.5 ${
        striped ? 'bg-ink-raised' : 'bg-ink'
      }`}
    >
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-medium text-off-white">{value || '—'}</span>
    </div>
  )
}
