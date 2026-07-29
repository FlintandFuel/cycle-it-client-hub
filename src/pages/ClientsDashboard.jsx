import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listProfiles } from '../lib/profileStore'
import logo from '../assets/cycle-it-logo-white.png'

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Badge({ children, tone = 'default' }) {
  const tones = {
    default: 'border-border text-muted',
    on: 'border-orange/40 bg-orange/10 text-orange',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs ${tones[tone]}`}>
      {children}
    </span>
  )
}

export default function ClientsDashboard() {
  const [profiles, setProfiles] = useState(undefined)
  const [error, setError] = useState('')

  useEffect(() => {
    listProfiles()
      .then(setProfiles)
      .catch(() => setError('Could not load clients. You may not have access.'))
  }, [])

  return (
    <div className="min-h-screen bg-ink pb-16">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-8 sm:px-6">
          <div>
            <img src={logo} alt="Cycle-It" className="h-16 w-auto" />
            <h1 className="mt-4 text-2xl font-bold text-off-white sm:text-3xl">Clients</h1>
          </div>
          <Link
            to="/new"
            className="shrink-0 rounded-lg bg-orange px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-orange-light"
          >
            + New fit
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {error && <p className="text-sm text-orange">{error}</p>}

        {profiles === undefined && !error && <p className="text-muted">Loading…</p>}

        {profiles?.length === 0 && (
          <p className="text-muted">No fit profiles yet — save one from the fitter view.</p>
        )}

        {profiles && profiles.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="hidden grid-cols-[2fr_2fr_1fr_2fr_1fr] gap-4 border-b border-border bg-ink-raised px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:grid">
              <span>Client</span>
              <span>Bike</span>
              <span>Fit date</span>
              <span>Status</span>
              <span />
            </div>
            {profiles.map((p, i) => (
              <div
                key={p.id}
                className={`grid grid-cols-1 gap-2 px-5 py-4 sm:grid-cols-[2fr_2fr_1fr_2fr_1fr] sm:items-center sm:gap-4 ${
                  i % 2 === 1 ? 'bg-ink-raised' : 'bg-ink'
                }`}
              >
                <div>
                  <p className="font-medium text-off-white">{p.client?.name}</p>
                  <p className="text-xs text-muted sm:hidden">{p.bike?.make} {p.bike?.model}</p>
                </div>
                <p className="hidden text-sm text-off-white/90 sm:block">
                  {p.bike?.make} {p.bike?.model}
                </p>
                <p className="text-sm text-muted">{formatDate(p.fitDate)}</p>
                <div className="flex flex-wrap gap-1.5">
                  {p.emailStatus?.profileEmailSent && <Badge tone="on">Email sent</Badge>}
                  {p.review?.optedOut && <Badge>Review opted out</Badge>}
                  {p.followUp?.sent && <Badge tone="on">Follow-up sent</Badge>}
                </div>
                <Link
                  to={`/p/${p.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-orange hover:text-orange-light"
                >
                  View profile →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
