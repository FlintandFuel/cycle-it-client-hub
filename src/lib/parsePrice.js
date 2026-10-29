// Accepts "1200", "1 200", "R1,200.50" and "1200,50" — the fitter types
// these on a phone, so be forgiving rather than rejecting South African
// decimal commas. Returns null when it isn't a usable amount.
export function parsePrice(raw) {
  let s = String(raw ?? '').replace(/[R\s]/gi, '')
  if (s.includes(',') && s.includes('.')) s = s.replace(/,/g, '')
  else if (/,\d{1,2}$/.test(s)) s = s.replace(',', '.')
  else s = s.replace(/,/g, '')
  if (!/^\d+(\.\d+)?$/.test(s)) return null
  return Math.round(Number(s) * 100) / 100
}
