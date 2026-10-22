import { useEffect, useMemo, useState } from 'react'
import { listInvoices } from '../lib/invoiceStore'
import { formatRand } from '../lib/formatRand'

function formatDate(iso) {
  if (!iso) return ''
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Billing cycles run 26th → 25th, so a cycle is named after the month it
// ends in (the one the shop thinks of it as).
function monthLabel(periodEnd) {
  return new Date(`${periodEnd}T00:00:00`).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })
}

// Monthly lists of parts fitted, for viewing in-app (not emailed) — read
// from the invoice docs (functions/index.js stores `components` on each
// billing period), so a month appears here once its invoice has been
// generated.
export default function ComponentsDashboard() {
  const [invoices, setInvoices] = useState(undefined)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState('all')

  useEffect(() => {
    listInvoices()
      .then(setInvoices)
      .catch(() => setError('Could not load components. You may not have access.'))
  }, [])

  const sections = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (invoices || [])
      .filter((inv) => period === 'all' || inv.id === period)
      .map((inv) => {
        const rows = (inv.components || []).filter(
          (c) => !q || `${c.brand} ${c.description} ${c.clientName}`.toLowerCase().includes(q),
        )
        const total = Math.round(rows.reduce((sum, c) => sum + (Number(c.price) || 0), 0) * 100) / 100
        return { inv, rows, total }
      })
      .filter((s) => s.rows.length > 0)
  }, [invoices, search, period])

  return (
    <div className="min-h-screen bg-ink pb-16">
      <header className="border-b border-border">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <h1 className="text-2xl font-bold text-off-white sm:text-3xl">Components</h1>
          <p className="mt-1 text-sm text-muted">Parts fitted, at retail price — by billing month</p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {error && <p className="text-sm text-orange">{error}</p>}
        {invoices === undefined && !error && <p className="text-muted">Loading…</p>}

        {invoices?.length === 0 && (
          <p className="text-muted">
            Nothing yet — each month appears once its invoice is generated (the 25th, or &quot;Generate &amp; send
            now&quot; on the Invoices page).
          </p>
        )}

        {invoices && invoices.length > 0 && (
          <>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search brand, component or client…"
                aria-label="Search components"
                className="w-full rounded-lg border border-border bg-ink-raised px-3 py-2.5 text-sm text-off-white placeholder:text-muted focus:border-orange focus:outline-none"
              />
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                aria-label="Filter by month"
                className="rounded-lg border border-border bg-ink-raised px-3 py-2.5 text-sm text-off-white focus:border-orange focus:outline-none"
              >
                <option value="all">All months</option>
                {invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {monthLabel(inv.periodEnd)}
                  </option>
                ))}
              </select>
            </div>

            {sections.length === 0 && <p className="mt-6 text-muted">No components match.</p>}

            {sections.map(({ inv, rows, total }) => (
              <section key={inv.id} className="mt-8">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold text-off-white">{monthLabel(inv.periodEnd)}</h2>
                    <p className="text-xs text-muted">
                      {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                    </p>
                  </div>
                </div>
                <div className="overflow-hidden rounded-xl border border-border">
                  {rows.map((c, i) => (
                    <div
                      key={`${c.profileId}-${i}`}
                      className={`flex items-start justify-between gap-4 px-4 py-3 text-sm ${
                        i % 2 === 1 ? 'bg-ink-raised' : 'bg-ink'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-off-white">
                          {c.brand} — {c.description}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          {c.clientName} · {formatDate(c.fitDate)}
                        </p>
                      </div>
                      <span className="shrink-0 text-off-white">{formatRand(c.price)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-border bg-ink-raised px-4 py-3">
                    <span className="text-sm text-muted">
                      {rows.length} item{rows.length === 1 ? '' : 's'} · Total retail
                    </span>
                    <span className="text-lg font-semibold text-orange">{formatRand(total)}</span>
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
