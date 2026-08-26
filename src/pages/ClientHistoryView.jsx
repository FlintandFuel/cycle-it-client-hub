import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { listProfiles, deleteProfile } from '../lib/profileStore'
import { groupProfilesByClient, findClientGroup } from '../lib/groupClients'
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

// The URL just carries one profile id from the client's session history —
// there's no stored clientId (see groupClients.js) — so this re-groups
// everyone on every load and picks out whichever group that id belongs to.
export default function ClientHistoryView() {
  const { profileId } = useParams()
  const navigate = useNavigate()
  const [profiles, setProfiles] = useState(undefined)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    listProfiles()
      .then(setProfiles)
      .catch(() => setError('Could not load client history. You may not have access.'))
  }, [])

  const group = profiles ? findClientGroup(groupProfilesByClient(profiles), profileId) : undefined

  // If the deleted session is the one anchoring this URL, redirect to a
  // sibling session (or back to /clients if that was the last one) —
  // otherwise the group lookup above would come up empty next render even
  // though the client may still have other fits on record.
  async function handleDelete(p) {
    if (!window.confirm(`Delete this fit from ${formatDate(p.fitDate)}? This can't be undone.`)) return
    setDeletingId(p.id)
    try {
      await deleteProfile(p.id)
      setProfiles((prev) => prev.filter((existing) => existing.id !== p.id))
      if (p.id === profileId) {
        const sibling = group.profiles.find((s) => s.id !== p.id)
        navigate(sibling ? `/clients/${sibling.id}` : '/clients', { replace: true })
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-ink pb-16">
      <header className="border-b border-border">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <img src={logo} alt="Cycle-It" className="h-16 w-auto" />
          <Link
            to="/clients"
            className="mt-4 inline-block text-sm text-muted underline decoration-border underline-offset-4 hover:text-off-white"
          >
            ← All clients
          </Link>

          {group && (
            <>
              <h1 className="mt-3 text-2xl font-bold text-off-white sm:text-3xl">
                {group.latestProfile.client?.name}
              </h1>
              <p className="mt-1 text-sm text-muted">
                {group.latestProfile.client?.email}
                {group.latestProfile.client?.phone && ` · ${group.latestProfile.client.phone}`}
              </p>
            </>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {error && <p className="text-sm text-orange">{error}</p>}

        {profiles === undefined && !error && <p className="text-muted">Loading…</p>}

        {profiles && !group && !error && (
          <p className="text-muted">Couldn&apos;t find that client — the link may be out of date.</p>
        )}

        {group && (
          <div className="overflow-hidden rounded-xl border border-border">
            {group.profiles.map((p, i) => (
              <div
                key={p.id}
                className={`grid grid-cols-1 gap-2 px-5 py-4 sm:grid-cols-[1fr_2fr_2fr_1fr_auto_auto] sm:items-center sm:gap-4 ${
                  i % 2 === 1 ? 'bg-ink-raised' : 'bg-ink'
                }`}
              >
                <p className="text-sm font-medium text-off-white">{formatDate(p.fitDate)}</p>
                <p className="text-sm text-off-white/90">
                  {p.bike?.make} {p.bike?.model}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {p.emailStatus?.profileEmailSent && <Badge tone="on">Email sent</Badge>}
                  {p.review?.optedOut && <Badge>Review opted out</Badge>}
                </div>
                <Link
                  to={`/p/${p.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-orange hover:text-orange-light"
                >
                  View profile →
                </Link>
                <Link
                  to={`/edit/${p.id}`}
                  className="text-sm text-muted underline decoration-border underline-offset-4 hover:text-off-white"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(p)}
                  disabled={deletingId === p.id}
                  className="justify-self-start text-sm text-red-400 underline decoration-red-900 underline-offset-4 hover:text-red-300 disabled:opacity-60 sm:justify-self-auto"
                >
                  {deletingId === p.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
