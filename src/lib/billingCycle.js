// Same rolling 26th → 25th cycle as the invoices (see
// functions/lib/billingPeriod.js): a fit on the 26th or later belongs to the
// cycle ending on the 25th of the following month. Named after the month it
// ends in — the one the shop thinks of it as.
export function cycleOf(fitDate) {
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
