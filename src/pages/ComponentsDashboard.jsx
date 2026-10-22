import { useEffect, useMemo, useState } from 'react'
import { listProfiles, updateProfile } from '../lib/profileStore'
import { formatRand } from '../lib/formatRand'

function formatDate(iso) {
  if (!iso) return ''
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Same rolling 26th → 25th cycle as the invoices (see
// functions/lib/billingPeriod.js): a fit on the 26th or later belongs to the
// cycle ending on the 25th of the following month. Named after the month it
// ends in — the one the shop thinks of it as.
function cycleOf(fitDate) {
  const [y, m, d] = fitDate.split('-').map(Number)
  const end = d <= 25 ? new Date(y, m - 1, 25) : new Date(y, m, 25)
  const start = new Date(end.getFullYear(), end.getMonth() - 1, 26)
  const iso = (dt) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
  return {
    id: iso(end),
    start: iso(start),
    end: iso(end),
    label: end.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' }),
  }
}

function parsePrice(value) {
  const n = Number(String(value ?? '').replace(/[^\d.]/g, ''))
  return Number.isFinite(n) && String(value ?? '').trim() !== '' ? n : null
}

const inputClass =
  'w-full rounded-lg border border-border bg-ink px-3 py-2 text-sm text-off-white placeholder:text-muted focus:border-orange focus:outline-none'

// Every component fitted, by billing month — read live from the fit
// profiles (where they're logged), so an entry shows up the moment it's
// saved rather than waiting for a month-end invoice. Edit/delete rewrite the
// profile's components array, so the client's own profile page stays in step.
export default function ComponentsDashboard() {
  const [profiles, setProfiles] = useState(undefined)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState('all')
  const [editing, setEditing] = useState(null) // { key, brand, description, price }
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    listProfiles()
      .then(setProfiles)
      .catch(() => setError('Could not load components. You may not have access.'))
  }, [])

  // One row per component. `index` is its position in the profile's own
  // components array — what edit/delete address.
  const rows = useMemo(() => {
    const out = []
    for (const p of profiles || []) {
      if (!p.fitDate) continue
      const cycle = cycleOf(p.fitDate)
      ;(p.components || []).forEach((c, index) => {
        if (!c.brand && !c.description) return
        out.push({
          key: `${p.id}:${index}`,
          profileId: p.id,
          index,
          cycle,
          clientName: p.client?.name || 'Unknown',
          fitDate: p.fitDate,
          brand: c.brand || '',
          description: c.description || '',
          price: Number(c.price) || 0,
        })
      })
    }
    return out
  }, [profiles])

  const cycles = useMemo(() => {
    const seen = new Map()
    rows.forEach((r) => seen.set(r.cycle.id, r.cycle))
    return [...seen.values()].sort((a, b) => b.id.localeCompare(a.id))
  }, [rows])

  const sections = useMemo(() => {
    const q = search.trim().toLowerCase()
    return cycles
      .filter((c) => period === 'all' || c.id === period)
      .map((cycle) => {
        const items = rows
          .filter((r) => r.cycle.id === cycle.id)
          .filter((r) => !q || `${r.brand} ${r.description} ${r.clientName}`.toLowerCase().includes(q))
          .sort((a, b) => b.fitDate.localeCompare(a.fitDate))
        const total = Math.round(items.reduce((sum, r) => sum + r.price, 0) * 100) / 100
        return { cycle, items, total }
      })
      .filter((s) => s.items.length > 0)
  }, [cycles, rows, search, period])

  // Writes the profile's components array with `change` applied to one entry
  // (null = remove it), then mirrors that into local state.
  async function saveComponents(row, change) {
    const profile = profiles.find((p) => p.id === row.profileId)
    const next = (profile.components || [])
      .map((c, i) => (i === row.index ? change : c))
      .filter(Boolean)
    setBusy(true)
    try {
      await updateProfile(row.profileId, { components: next })
      setProfiles((prev) => prev.map((p) => (p.id === row.profileId ? { ...p, components: next } : p)))
      setEditing(null)
    } catch {
      window.alert('Could not save that change — check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  function handleDelete(row) {
    if (!window.confirm(`Delete ${row.brand} — ${row.description} (${row.clientName})?`)) return
    saveComponents(row, null)
  }

  function handleSaveEdit(row) {
    const price = parsePrice(editing.price)
    if (!editing.brand.trim() || !editing.description.trim() || price === null) {
      window.alert('Each component needs a brand, description and a valid price.')
      return
    }
    saveComponents(row, { brand: editing.brand.trim(), description: editing.description.trim(), price })
  }

  return (
    <div className="min-h-screen bg-ink pb-16">
      <header className="border-b border-border">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <h1 className="text-2xl font-bold text-off-white sm:text-3xl">Components</h1>
          <p className="mt-1 text-sm text-muted">Parts fitted, at retail price — by billing month (26th to 25th)</p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {error && <p className="text-sm text-orange">{error}</p>}
        {profiles === undefined && !error && <p className="text-muted">Loading…</p>}

        {profiles && rows.length === 0 && (
          <p className="text-muted">No components logged yet — add them under &quot;Components fitted&quot; on a fit.</p>
        )}

        {rows.length > 0 && (
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
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {sections.length === 0 && <p className="mt-6 text-muted">No components match.</p>}

            {sections.map(({ cycle, items, total }) => (
              <section key={cycle.id} className="mt-8">
                <div className="mb-3">
                  <h2 className="text-lg font-semibold text-off-white">{cycle.label}</h2>
                  <p className="text-xs text-muted">
                    {formatDate(cycle.start)} – {formatDate(cycle.end)}
                  </p>
                </div>
                <div className="overflow-hidden rounded-xl border border-border">
                  {items.map((r, i) => {
                    const striped = i % 2 === 1 ? 'bg-ink-raised' : 'bg-ink'
                    if (editing?.key === r.key) {
                      return (
                        <div key={r.key} className={`space-y-3 px-4 py-3 ${striped}`}>
                          <p className="text-xs text-muted">
                            {r.clientName} · {formatDate(r.fitDate)}
                          </p>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_2fr_7rem]">
                            <input
                              className={inputClass}
                              value={editing.brand}
                              placeholder="Brand"
                              aria-label="Brand"
                              onChange={(e) => setEditing({ ...editing, brand: e.target.value })}
                            />
                            <input
                              className={inputClass}
                              value={editing.description}
                              placeholder="Description"
                              aria-label="Description"
                              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                            />
                            <input
                              className={inputClass}
                              value={editing.price}
                              inputMode="decimal"
                              placeholder="Price"
                              aria-label="Retail price"
                              onChange={(e) => setEditing({ ...editing, price: e.target.value })}
                            />
                          </div>
                          <div className="flex gap-4 text-sm">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleSaveEdit(r)}
                              className="font-bold text-orange hover:text-orange-light disabled:opacity-60"
                            >
                              {busy ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => setEditing(null)}
                              className="text-muted hover:text-off-white"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )
                    }
                    return (
                      <div key={r.key} className={`flex items-start justify-between gap-4 px-4 py-3 text-sm ${striped}`}>
                        <div className="min-w-0">
                          <p className="text-off-white">
                            {r.brand} — {r.description}
                          </p>
                          <p className="mt-0.5 text-xs text-muted">
                            {r.clientName} · {formatDate(r.fitDate)}
                          </p>
                          <div className="mt-2 flex gap-4 text-xs">
                            <button
                              type="button"
                              onClick={() =>
                                setEditing({ key: r.key, brand: r.brand, description: r.description, price: String(r.price) })
                              }
                              className="text-muted underline decoration-border underline-offset-4 hover:text-off-white"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleDelete(r)}
                              className="text-muted underline decoration-border underline-offset-4 hover:text-orange"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <span className="shrink-0 text-off-white">{formatRand(r.price)}</span>
                      </div>
                    )
                  })}
                  <div className="flex items-center justify-between border-t border-border bg-ink-raised px-4 py-3">
                    <span className="text-sm text-muted">
                      {items.length} item{items.length === 1 ? '' : 's'} · Total retail
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
