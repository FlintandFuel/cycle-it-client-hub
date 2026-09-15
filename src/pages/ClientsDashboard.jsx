import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listProfiles } from '../lib/profileStore'
import { groupProfilesByClient } from '../lib/groupClients'
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

// Each row is a client (grouped across their fit sessions — see
// groupClients.js), so these sort by the client's most recent session.
// fitDate is stored as a "YYYY-MM-DD" string (see functions/index.js), so
// it sorts correctly as plain text — no date parsing needed.
const SORT_ACCESSORS = {
  client: (g) => g.latestProfile.client?.name || '',
  bike: (g) => `${g.latestProfile.bike?.make || ''} ${g.latestProfile.bike?.model || ''}`.trim(),
  fitDate: (g) => g.latestProfile.fitDate || '',
}

function useSortedGroups(groups, sort) {
  return useMemo(() => {
    if (!groups || !sort.key) return groups
    const accessor = SORT_ACCESSORS[sort.key]
    const sorted = [...groups].sort((a, b) => {
      const cmp = String(accessor(a)).localeCompare(String(accessor(b)), undefined, {
        sensitivity: 'base',
        numeric: true,
      })
      return sort.dir === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [groups, sort])
}

const SORT_OPTIONS = [
  { key: 'client', dir: 'asc', label: 'Client (A–Z)' },
  { key: 'client', dir: 'desc', label: 'Client (Z–A)' },
  { key: 'bike', dir: 'asc', label: 'Bike (A–Z)' },
  { key: 'bike', dir: 'desc', label: 'Bike (Z–A)' },
  { key: 'fitDate', dir: 'desc', label: 'Last fit (newest)' },
  { key: 'fitDate', dir: 'asc', label: 'Last fit (oldest)' },
]

function MobileSortSelect({ sort, onChange }) {
  const value = sort.key ? `${sort.key}-${sort.dir}` : ''
  return (
    <select
      value={value}
      onChange={(e) => {
        const [key, dir] = e.target.value ? e.target.value.split('-') : [null, 'asc']
        onChange({ key, dir })
      }}
      className="w-full rounded-lg border border-border bg-ink-raised px-3 py-2.5 text-sm text-off-white focus:border-orange focus:outline-none"
    >
      <option value="">Sort by…</option>
      {SORT_OPTIONS.map(({ key, dir, label }) => (
        <option key={`${key}-${dir}`} value={`${key}-${dir}`}>
          {label}
        </option>
      ))}
    </select>
  )
}

function SortHeader({ label, sortKey, sort, onSort }) {
  const active = sort.key === sortKey
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className="flex items-center gap-1 text-left uppercase tracking-wide hover:text-off-white"
    >
      {label}
      <span className={`text-[9px] ${active ? 'text-orange' : 'text-muted/40'}`}>
        {active && sort.dir === 'desc' ? '▼' : '▲'}
      </span>
    </button>
  )
}

export default function ClientsDashboard() {
  const [profiles, setProfiles] = useState(undefined)
  const [error, setError] = useState('')
  const [sort, setSort] = useState({ key: null, dir: 'asc' })
  const [search, setSearch] = useState('')

  useEffect(() => {
    listProfiles()
      .then(setProfiles)
      .catch(() => setError('Could not load clients. You may not have access.'))
  }, [])

  const groups = useMemo(() => (profiles ? groupProfilesByClient(profiles) : profiles), [profiles])
  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query || !groups) return groups
    return groups.filter((g) => g.latestProfile.client?.name?.toLowerCase().includes(query))
  }, [groups, search])
  const sortedGroups = useSortedGroups(filteredGroups, sort)

  function handleSort(key) {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  }

  return (
    <div className="min-h-screen bg-ink pb-16">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-8 sm:px-6">
          <div>
            <Link to="/new">
              <img src={logo} alt="Cycle-It" className="h-16 w-auto" />
            </Link>
            <h1 className="mt-4 text-2xl font-bold text-off-white sm:text-3xl">Clients</h1>
          </div>
          <div className="flex w-full items-center gap-3 sm:w-auto">
            <div className="relative flex-1 sm:w-64 sm:flex-none">
              <svg
                viewBox="0 0 24 24"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="7" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.3-4.3" />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clients…"
                aria-label="Search clients by name"
                className="w-full rounded-lg border border-border bg-ink-raised py-2.5 pl-9 pr-3 text-sm text-off-white placeholder:text-muted focus:border-orange focus:outline-none"
              />
            </div>
            <Link
              to="/new"
              className="shrink-0 rounded-lg bg-orange px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-orange-light"
            >
              + New fit
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {error && <p className="text-sm text-orange">{error}</p>}

        {profiles === undefined && !error && <p className="text-muted">Loading…</p>}

        {profiles?.length === 0 && (
          <p className="text-muted">No fit profiles yet — save one from the fitter view.</p>
        )}

        {groups && groups.length > 0 && sortedGroups.length === 0 && (
          <p className="text-muted">No clients match "{search}".</p>
        )}

        {groups && groups.length > 0 && sortedGroups.length > 0 && (
          <>
            <div className="mb-3 sm:hidden">
              <MobileSortSelect sort={sort} onChange={setSort} />
            </div>
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="hidden grid-cols-[2fr_2fr_1fr_2fr_1fr] gap-4 border-b border-border bg-ink-raised px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:grid">
                <SortHeader label="Client" sortKey="client" sort={sort} onSort={handleSort} />
                <SortHeader label="Bike" sortKey="bike" sort={sort} onSort={handleSort} />
                <SortHeader label="Last fit" sortKey="fitDate" sort={sort} onSort={handleSort} />
                <span>Status</span>
                <span />
              </div>
              {sortedGroups.map((g, i) => {
                const p = g.latestProfile
                return (
                  <div
                    key={p.id}
                    className={`grid grid-cols-1 gap-2 px-5 py-4 sm:grid-cols-[2fr_2fr_1fr_2fr_1fr] sm:items-center sm:gap-4 ${
                      i % 2 === 1 ? 'bg-ink-raised' : 'bg-ink'
                    }`}
                  >
                    <div>
                      <Link
                        to={`/clients/${p.id}`}
                        title="View fit history"
                        className="inline-flex items-center gap-1.5 font-medium text-off-white hover:text-orange hover:underline"
                      >
                        {p.client?.name}
                        <svg
                          viewBox="0 0 24 24"
                          className="h-3.5 w-3.5 shrink-0 text-muted"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <circle cx="12" cy="12" r="9" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3.5 2" />
                        </svg>
                      </Link>
                      <p className="text-xs text-muted sm:hidden">{p.bike?.make} {p.bike?.model}</p>
                    </div>
                    <p className="hidden text-sm text-off-white/90 sm:block">
                      {p.bike?.make} {p.bike?.model}
                    </p>
                    <p className="text-sm text-muted">{formatDate(p.fitDate)}</p>
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
                      Latest profile →
                    </Link>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
