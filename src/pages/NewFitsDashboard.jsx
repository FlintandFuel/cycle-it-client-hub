import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listProfiles } from '../lib/profileStore'
import { cycleOf } from '../lib/billingCycle'

function formatDate(iso) {
  if (!iso) return ''
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Every fit tagged "New bike fit: Yes", by billing month — read live from the
// profiles so the fitter can check the count against Dunkeld Cycles' monthly
// invoice at any point in the cycle.
export default function NewFitsDashboard() {
  const [profiles, setProfiles] = useState(undefined)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState('all')

  useEffect(() => {
    listProfiles()
      .then(setProfiles)
      .catch(() => setError('Could not load fits. You may not have access.'))
  }, [])

  const rows = useMemo(
    () =>
      (profiles || [])
        .filter((p) => p.newBikeFit === 'Yes' && p.fitDate)
        .map((p) => ({
          id: p.id,
          cycle: cycleOf(p.fitDate),
          clientName: p.client?.name || 'Unknown',
          fitDate: p.fitDate,
          bike: `${p.bike?.make || ''} ${p.bike?.model || ''}`.trim(),
        })),
    [profiles],
  )

  const cycles = useMemo(() => {
    const seen = new Map()
    rows.forEach((r) => seen.set(r.cycle.id, r.cycle))
    return [...seen.values()].sort((a, b) => b.id.localeCompare(a.id))
  }, [rows])

  const sections = useMemo(() => {
    const q = search.trim().toLowerCase()
    return cycles
      .filter((c) => period === 'all' || c.id === period)
      .map((cycle) => ({
        cycle,
        items: rows
          .filter((r) => r.cycle.id === cycle.id)
          .filter((r) => !q || `${r.clientName} ${r.bike}`.toLowerCase().includes(q))
          .sort((a, b) => b.fitDate.localeCompare(a.fitDate)),
      }))
      .filter((s) => s.items.length > 0)
  }, [cycles, rows, search, period])

  return (
    <div className="min-h-screen bg-ink pb-16">
      <header className="border-b border-border">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <h1 className="text-2xl font-bold text-off-white sm:text-3xl">New bike fits</h1>
          <p className="mt-1 text-sm text-muted">Fits tagged as a new bike fit — by billing month (26th to 25th)</p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {error && <p className="text-sm text-orange">{error}</p>}
        {profiles === undefined && !error && <p className="text-muted">Loading…</p>}

        {profiles && rows.length === 0 && (
          <p className="text-muted">No new bike fits yet — set &quot;New bike fit&quot; to Yes on a fit.</p>
        )}

        {rows.length > 0 && (
          <>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search client or bike…"
                aria-label="Search new bike fits"
                className="w-full rounded-lg border border-border bg-ink-raised px-3 py-2.5 text-sm text-off-white placeholder:text-muted focus:border-orange focus:outline-none"
              />
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                aria-label="Filter by month"
                className="rounded-lg border border-border bg-ink-raised px-3 py-2.5 text-sm text-off-white focus:border-orange focus:outline-none"
              >
                <option value="all">All months</option>
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {sections.length === 0 && <p className="mt-6 text-muted">No fits match.</p>}

            {sections.map(({ cycle, items }) => (
              <section key={cycle.id} className="mt-8">
                <div className="mb-3">
                  <h2 className="text-lg font-semibold text-off-white">{cycle.label}</h2>
                  <p className="text-xs text-muted">
                    {formatDate(cycle.start)} – {formatDate(cycle.end)}
                  </p>
                </div>
                <div className="overflow-hidden rounded-xl border border-border">
                  {items.map((r, i) => (
                    <div
                      key={r.id}
                      className={`flex items-start justify-between gap-4 px-4 py-3 text-sm ${
                        i % 2 === 1 ? 'bg-ink-raised' : 'bg-ink'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-off-white">{r.clientName}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {formatDate(r.fitDate)}
                          {r.bike && ` · ${r.bike}`}
                        </p>
                      </div>
                      <Link
                        to={`/p/${r.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 font-medium text-orange hover:text-orange-light"
                      >
                        View →
                      </Link>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-border bg-ink-raised px-4 py-3">
                    <span className="text-sm text-muted">New bike fits this month</span>
                    <span className="text-lg font-semibold text-orange">{items.length}</span>
                  </div>
                </div>
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
