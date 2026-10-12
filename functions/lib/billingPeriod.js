// Dunkeld Cycles billing runs on a rolling 26th-of-last-month to
// 25th-of-this-month cycle, so every new bike fit lands on exactly one
// invoice with no gaps or overlaps regardless of month length.

function pad(n) {
  return String(n).padStart(2, '0')
}

function isoDate(date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

// The most recently completed (or, if `referenceDate` falls on the 25th
// itself, currently-closing) cycle as of `referenceDate`. JS's UTC Date
// constructor normalizes an out-of-range month (e.g. -1) into the correct
// prior year/month, so this needs no manual carry logic for year
// boundaries.
function cycleEndingOnOrBefore(referenceDate) {
  const d = new Date(referenceDate)
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()
  const day = d.getUTCDate()
  const end = day >= 25 ? new Date(Date.UTC(y, m, 25)) : new Date(Date.UTC(y, m - 1, 25))
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 1, 26))
  return { id: isoDate(end), start: isoDate(start), end: isoDate(end) }
}

// The cycle `referenceDate` currently falls inside, even if it hasn't
// closed yet — used for the manual "Generate & send now" button, so it
// reflects the fits logged so far this cycle rather than only ever
// re-showing the last fully closed one.
function cycleContaining(referenceDate) {
  const d = new Date(referenceDate)
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()
  const day = d.getUTCDate()
  const end = day <= 25 ? new Date(Date.UTC(y, m, 25)) : new Date(Date.UTC(y, m + 1, 25))
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 1, 26))
  return { id: isoDate(end), start: isoDate(start), end: isoDate(end) }
}

module.exports = { cycleEndingOnOrBefore, cycleContaining }
