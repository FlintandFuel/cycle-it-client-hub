// Shared parser for the legacy "Positioning Chart" Excel files, used by
// both parse-legacy-fitments.mjs (dry run, no writes) and
// import-legacy-fitments.mjs (writes to Firestore).
//
// Two source template generations exist, detected per-file:
//  - "new" style: Cyclist Name:/Contact No:/etc. labels, one Value column
//    plus a Recommendations column for the lettered A-H measurements.
//  - "old" style (~16 files): Before:/After:/Reassessment: columns per
//    numbered row instead — richer (tracks a change) but doesn't map
//    1:1 onto the app's value+recommendation shape, so we take "After"
//    as the canonical value and fold anything else (saddle/pedal brand,
//    posture notes) into the free-text notes field instead of losing it.

import path from 'node:path'
import XLSX from 'xlsx'

function clean(v) {
  if (v === undefined || v === null) return ''
  return String(v).trim().replace(/^[:\s]+/, '').trim()
}

// Scans every cell of every row for a label match, returning where it was
// found — column-position-agnostic, since the same template indents
// differently in different files (contact fields one column deeper than
// measurement rows in the "old" template, for instance).
function findLabel(rows, test) {
  for (const row of rows) {
    for (let c = 0; c < row.length; c++) {
      if (test(String(row[c] ?? '').trim())) return { row, col: c }
    }
  }
  return null
}
function valueAt(found, offset) {
  if (!found) return ''
  return clean(found.row[found.col + offset])
}
function exact(str) {
  return (l) => l.toLowerCase() === str
}

function normalizePhone(raw) {
  if (!raw) return ''
  const digits = String(raw).replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 9) return '0' + digits
  return digits
}

function cleanMeasurement(v) {
  const t = clean(v)
  if (!t || /^mm$/i.test(t) || /^n\/?a$/i.test(t)) return ''
  return t
}

function bikeTypeFromFilename(filename) {
  const upper = filename.toUpperCase()
  if (/\bMTB\b/.test(upper)) return 'MTB'
  if (/\bTRI\b/.test(upper)) return 'TRI'
  if (/\bGRAVEL\b/.test(upper)) return 'Gravel'
  return 'Road'
}

// Best-effort name recovery for the ~20 files where the "Cyclist Name:"
// cell was left blank, or the label itself got deleted but the name typed
// in anyway — every filename starts with the client's name, so take the
// leading run of Title-Case-ish words before we hit an ALL-CAPS word
// (brand names are consistently typed in caps: GIANT, SPECIALIZED,
// COLNAGO...) or a known template/discipline keyword.
const STOP_WORDS = new Set([
  'positioning', 'chart', 'road', 'mtb', 'gravel', 'tri', 'bike', 'ebike',
  'e-bike', 'hardtail', 'tt',
])
function nameFromFilename(filename) {
  const base = filename.replace(/\.xlsx$/i, '')
  const words = base.split(/\s+/)
  const nameWords = []
  for (const w of words) {
    const isAllCapsBrand = w.length > 2 && w === w.toUpperCase() && /[A-Z]/.test(w)
    const isStopWord = STOP_WORDS.has(w.toLowerCase())
    if (isAllCapsBrand || isStopWord) break
    nameWords.push(w)
  }
  return nameWords.join(' ').trim()
}

// Extracts a "SIZE: 58cm" (or similar) suffix out of the free-text
// Bicycle field, since several files embed it there instead of leaving a
// separate size field.
function splitBikeAndSize(raw) {
  const m = raw.match(/size\s*:?\s*([\w.\/]+)/i)
  if (!m) return { make: raw, size: '' }
  return { make: raw.replace(m[0], '').trim().replace(/[-,]\s*$/, ''), size: m[1] }
}

export function parseFitmentFile(filePath) {
  const filename = path.basename(filePath)
  const wb = XLSX.readFile(filePath)
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

  const isOldStyle = rows.some((r) => r.some((c) => String(c).trim() === 'Before:'))
  // "After" is 2 cells past the label in the old template (Before sits at
  // +1); the new template's single Value column sits at +1.
  const measureOffset = isOldStyle ? 2 : 1

  const nameFromSheet = valueAt(findLabel(rows, exact('cyclist name:')), 1)
  const name = nameFromSheet || nameFromFilename(filename)
  const nameWasGuessed = !nameFromSheet

  const phone = normalizePhone(valueAt(findLabel(rows, exact('contact no:')), 1))
  const email = valueAt(findLabel(rows, exact('e-mail:')), 1)
  const bicycleRaw = valueAt(findLabel(rows, exact('bicycle:')), 1)
  const { make: bicycle, size: bikeSize } = splitBikeAndSize(bicycleRaw)
  const fitSpecialist = valueAt(findLabel(rows, exact('fit specialist:')), 1) || 'Ruan Smit'

  // Content-based matching (not letter-prefix-based — the lettering
  // drifts between template variants, e.g. some MTB files use "F.
  // Handlebars"/"G. Crank Length" instead of the usual G/H) with mutual
  // exclusion so "Reach (Saddle to Handlebar)" doesn't also get picked up
  // by the handlebar-width or drop matchers.
  const isReachRow = (l) => /reach/i.test(l)
  const isDropRow = (l) => !isReachRow(l) && /(drop|saddle to (handlebar|elbow|bar))/i.test(l)
  const isHandlebarRow = (l) => !isReachRow(l) && !isDropRow(l) && /handlebars?/i.test(l)

  const mOffset = measureOffset
  const measurements = {
    saddleHeight: cleanMeasurement(
      valueAt(findLabel(rows, (l) => /saddle height/i.test(l) || /bb to top of saddle/i.test(l)), mOffset),
    ),
    reach: cleanMeasurement(
      valueAt(findLabel(rows, (l) => isReachRow(l) || /tip of saddle to centre of bars/i.test(l)), mOffset),
    ),
    saddleSetback: cleanMeasurement(valueAt(findLabel(rows, (l) => /saddle setback/i.test(l)), mOffset)),
    stemLength: cleanMeasurement(valueAt(findLabel(rows, (l) => /stem length/i.test(l)), mOffset)),
    saddleToBarDrop: cleanMeasurement(valueAt(findLabel(rows, isDropRow), mOffset)),
    // In the old template this row is a component brand ("SPECIALIZED",
    // "3T: 400mm") rather than a clean width measurement — too unreliable
    // to trust as a number, so it goes into notes as free text instead
    // (see extraNotes below) and this stays blank for old-style records.
    handlebarWidth: isOldStyle ? '' : cleanMeasurement(valueAt(findLabel(rows, isHandlebarRow), mOffset)),
    crankLength: cleanMeasurement(valueAt(findLabel(rows, (l) => /crank length/i.test(l)), mOffset)),
  }
  const measurementRecommendations = isOldStyle
    ? { saddleHeight: '', reach: '', saddleSetback: '', stemLength: '', saddleToBarDrop: '', handlebarWidth: '', crankLength: '' }
    : {
        saddleHeight: cleanMeasurement(valueAt(findLabel(rows, (l) => /saddle height/i.test(l)), 2)),
        reach: cleanMeasurement(valueAt(findLabel(rows, isReachRow), 2)),
        saddleSetback: cleanMeasurement(valueAt(findLabel(rows, (l) => /saddle setback/i.test(l)), 2)),
        stemLength: cleanMeasurement(valueAt(findLabel(rows, (l) => /stem length/i.test(l)), 2)),
        saddleToBarDrop: cleanMeasurement(valueAt(findLabel(rows, isDropRow), 2)),
        handlebarWidth: cleanMeasurement(valueAt(findLabel(rows, isHandlebarRow), 2)),
        crankLength: cleanMeasurement(valueAt(findLabel(rows, (l) => /crank length/i.test(l)), 2)),
      }

  const sitBoneFound = findLabel(rows, (l) => /sit bone/i.test(l))
  const shoesFound = findLabel(rows, (l) => /^1\.\s*shoes/i.test(l))
  const kneeFound = findLabel(rows, (l) => /knee angle/i.test(l))
  const cleatPosFound = findLabel(rows, (l) => /cleat position/i.test(l))
  const pressureFound = findLabel(rows, (l) => /pressure mapping/i.test(l))

  let sitBoneWidth = cleanMeasurement(valueAt(sitBoneFound, mOffset))
  if (sitBoneWidth && /^\d+(\.\d+)?$/.test(sitBoneWidth)) sitBoneWidth += 'mm'

  let kneeAngle = ''
  let cleatLeft = '', cleatRight = ''
  let shoeType = shoesFound ? valueAt(shoesFound, mOffset) : ''
  if (isOldStyle) {
    const k = cleanMeasurement(valueAt(kneeFound, mOffset))
    kneeAngle = k ? `${k}°` : ''
    cleatLeft = cleanMeasurement(valueAt(cleatPosFound, mOffset))
    cleatRight = ''
  } else {
    const l = cleanMeasurement(valueAt(kneeFound, 1))
    const r = cleanMeasurement(valueAt(kneeFound, 2))
    kneeAngle = l && r && l !== r ? `L ${l}° / R ${r}°` : l ? `${l}°` : r ? `${r}°` : ''
    cleatLeft = cleanMeasurement(valueAt(cleatPosFound, 1))
    cleatRight = cleanMeasurement(valueAt(cleatPosFound, 2))
    const shoeL = shoesFound ? cleanMeasurement(valueAt(shoesFound, 1)) : ''
    const shoeR = shoesFound ? cleanMeasurement(valueAt(shoesFound, 2)) : ''
    shoeType = shoeL && shoeR && shoeL !== shoeR ? `${shoeL} / ${shoeR}` : shoeL || shoeR || ''
  }

  let pressureMapping = 'No'
  if (pressureFound) {
    const val = valueAt(pressureFound, mOffset).toLowerCase()
    const labelText = String(pressureFound.row[pressureFound.col] ?? '').toLowerCase()
    if (val.includes('yes')) pressureMapping = 'Yes'
    else if (val.includes('no')) pressureMapping = 'No'
    else if (labelText.includes('yes')) pressureMapping = 'Yes'
    else if (labelText.includes('no')) pressureMapping = 'No'
  }

  const shockFound = findLabel(rows, (l) => /shock pressures/i.test(l))
  // New-style MTB files spell this row out as "Saddle Brand" explicitly;
  // old-style files just call it "7. Saddle" — two different matchers so
  // neither one accidentally catches "A. Saddle Height"/"Saddle Setback".
  const saddleBrandFoundNew = findLabel(rows, (l) => /saddle brand/i.test(l))
  const saddleBrandFoundOld = isOldStyle ? findLabel(rows, (l) => /^7\.\s*saddle\b/i.test(l)) : null
  const pedalsFound = findLabel(rows, (l) => /pedals/i.test(l))
  let shockFront = '', shockRear = ''
  if (shockFound) {
    const raw = valueAt(shockFound, mOffset)
    const fm = raw.match(/front\s*:?\s*([\d.]+)\s*(psi|bar)?/i)
    const rm = raw.match(/rear\s*:?\s*([\d.]+)\s*(psi|bar)?/i)
    if (fm) shockFront = `${fm[1]} ${fm[2] || 'psi'}`
    if (rm) shockRear = `${rm[1]} ${rm[2] || 'psi'}`
  }
  const mtbDetails = {
    shockPressureFront: shockFront,
    shockPressureRear: shockRear,
    saddleBrand: saddleBrandFoundNew ? valueAt(saddleBrandFoundNew, mOffset).replace(/\s*mm\s*$/i, '').trim() : '',
    pedals: pedalsFound ? valueAt(pedalsFound, mOffset) : '',
  }

  // Old-template extras with no home in the current schema — posture
  // notes and a before/after saddle change are genuinely useful context,
  // so they go into notes rather than being silently dropped.
  const extraNotes = []
  if (isOldStyle) {
    const elbows = findLabel(rows, (l) => /^4\.\s*elbows/i.test(l))
    const shoulders = findLabel(rows, (l) => /^5\.\s*shoulders/i.test(l))
    const handlebarsFound = findLabel(rows, isHandlebarRow)
    if (elbows) extraNotes.push(`Elbows: ${valueAt(elbows, 1)} → ${valueAt(elbows, 2)}`)
    if (shoulders) extraNotes.push(`Shoulders: ${valueAt(shoulders, 1)} → ${valueAt(shoulders, 2)}`)
    if (handlebarsFound) {
      const before = valueAt(handlebarsFound, 1)
      const after = valueAt(handlebarsFound, 2)
      if (before || after) extraNotes.push(`Handlebars: ${before || '—'} → ${after || '—'}`)
    }
    if (saddleBrandFoundOld) {
      const before = valueAt(saddleBrandFoundOld, 1)
      const after = valueAt(saddleBrandFoundOld, 2)
      if (before || after) extraNotes.push(`Saddle: ${before || '—'} → ${after || '—'}`)
    }
    if (pedalsFound) {
      const before = valueAt(pedalsFound, 1)
      const after = valueAt(pedalsFound, 2)
      if (before || after) extraNotes.push(`Pedals: ${before || '—'} → ${after || '—'}`)
    }
  }

  const notesParts = [
    'Historical record migrated from the old Excel-based positioning chart system — exact fit date not on file.',
  ]
  if (extraNotes.length) notesParts.push(extraNotes.join('; '))

  return {
    _filename: filename,
    _nameWasGuessed: nameWasGuessed,
    _isOldStyle: isOldStyle,
    bikeType: bikeTypeFromFilename(filename),
    fitDate: '',
    fitSpecialist,
    bike: { make: bicycle, model: '', size: bikeSize },
    mtbDetails,
    measurements,
    measurementRecommendations,
    cleatFit: {
      sitBoneWidth,
      kneeAngle,
      cleatPosition: { left: cleatLeft, right: cleatRight },
      shoeType,
      shoeSize: '',
    },
    pressureMapping,
    notes: notesParts.join('\n\n'),
    client: { name, email, phone, consentGiven: true },
  }
}

export function listFitmentFiles(dir, fs) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.xlsx') && !/parts sheet/i.test(f))
}
