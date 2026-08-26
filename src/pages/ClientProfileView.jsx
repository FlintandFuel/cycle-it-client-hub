import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { getProfile, deleteProfile } from '../lib/profileStore'
import { auth } from '../lib/firebase'
import { ALLOWED_EMAILS } from '../lib/allowedEmails'
import FitDiagram from '../components/FitDiagram'
import logo from '../assets/cycle-it-logo-white.png'

// Letters match the callouts baked into bike-graphic-v6.jpg (see
// FitDiagram.jsx) — the designer's lettering skips F, going straight from
// E to G.
const measurements = [
  { key: 'saddleHeight', label: 'Saddle height', letter: 'A' },
  { key: 'reach', label: 'Reach (saddle to bar)', letter: 'B' },
  { key: 'saddleSetback', label: 'Saddle setback', letter: 'C' },
  { key: 'stemLength', label: 'Stem length', letter: 'D' },
  { key: 'saddleToBarDrop', label: 'Saddle to bar drop', letter: 'E' },
  { key: 'handlebarWidth', label: 'Handlebar width', letter: 'G' },
  { key: 'crankLength', label: 'Crank length', letter: 'H' },
]

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function ClientProfileView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(undefined)
  const [isFitter, setIsFitter] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let active = true
    getProfile(id).then((p) => {
      if (active) setProfile(p)
    })
    return () => {
      active = false
    }
  }, [id])

  // Only ever adds fitter-facing chrome (a link back to the dashboard) —
  // never gates the page itself, since this URL is meant to open for
  // clients straight from an email link with no sign-in of their own.
  useEffect(() => onAuthStateChanged(auth, (u) => setIsFitter(!!u && ALLOWED_EMAILS.includes(u.email))), [])

  async function handleDelete() {
    if (!window.confirm(`Delete ${profile.client?.name}'s fit from ${formatDate(profile.fitDate)}? This can't be undone.`)) {
      return
    }
    setDeleting(true)
    try {
      await deleteProfile(id)
      navigate('/clients')
    } finally {
      setDeleting(false)
    }
  }

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
        {isFitter && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <Link
              to="/clients"
              className="text-sm text-muted underline decoration-border underline-offset-4 hover:text-off-white"
            >
              ← All clients
            </Link>
            <div className="flex items-center gap-4">
              <Link
                to={`/edit/${id}`}
                className="text-sm text-muted underline decoration-border underline-offset-4 hover:text-off-white"
              >
                Edit
              </Link>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="text-sm text-red-400 underline decoration-red-900 underline-offset-4 hover:text-red-300 disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        )}
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
          <FitDiagram />
          <div className="mt-3 overflow-hidden rounded-xl border border-border">
            <div className="grid grid-cols-[minmax(0,1fr)_5rem_7rem] items-center gap-4 bg-ink-raised px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
              <span>Measurement</span>
              <span className="text-right">Value</span>
              <span className="text-right">Recommendation</span>
            </div>
            {measurements.map(({ key, label, letter }, i) => (
              <Row
                key={key}
                letter={letter}
                label={label}
                value={profile.measurements?.[key]}
                recommendation={profile.measurementRecommendations?.[key]}
                showRecommendation
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
            <Row label="Sit-bone width" value={profile.cleatFit?.sitBoneWidth} />
            <Row label="Knee angle" value={profile.cleatFit?.kneeAngle} striped />
            <div className="flex items-center justify-between px-4 py-3.5 bg-ink">
              <span className="text-sm text-muted">Cleat position</span>
              <span className="flex shrink-0 gap-6 text-sm font-medium text-off-white">
                <span>
                  <span className="mr-1.5 text-xs font-normal text-muted">L</span>
                  {profile.cleatFit?.cleatPosition?.left || '—'}
                </span>
                <span>
                  <span className="mr-1.5 text-xs font-normal text-muted">R</span>
                  {profile.cleatFit?.cleatPosition?.right || '—'}
                </span>
              </span>
            </div>
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
          Got any fit questions? Just reply to the email that brought you here.
        </p>
      </div>
    </div>
  )
}

function Row({ label, value, recommendation, striped, letter, showRecommendation }) {
  return (
    <div
      className={`grid items-start gap-4 px-4 py-3.5 ${
        showRecommendation ? 'grid-cols-[minmax(0,1fr)_5rem_7rem]' : 'grid-cols-[minmax(0,1fr)_5rem]'
      } ${striped ? 'bg-ink-raised' : 'bg-ink'}`}
    >
      <span className="flex min-w-0 items-center gap-2.5 pt-0.5 text-sm text-muted">
        {letter && (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-orange/40 text-[10px] font-bold text-orange">
            {letter}
          </span>
        )}
        <span className="min-w-0 break-words">{label}</span>
      </span>
      <span className="pt-0.5 text-right text-sm font-medium text-off-white">{value || '—'}</span>
      {showRecommendation && (
        <span className="pt-0.5 text-right text-sm text-off-white/80">{recommendation || '—'}</span>
      )}
    </div>
  )
}
