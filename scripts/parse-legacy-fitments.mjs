// Dry-run parser for the legacy "Positioning Chart" Excel files — reads
// every .xlsx in ../bike fitments, extracts fields into the app's profile
// shape, and prints stats/samples. Writes nothing. Run with:
//   node scripts/parse-legacy-fitments.mjs
// See import-legacy-fitments.mjs for the version that actually writes to
// Firestore, once this output looks right. Parsing logic lives in
// lib/parseFitment.mjs, shared by both scripts.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseFitmentFile, listFitmentFiles } from './lib/parseFitment.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIR = path.join(__dirname, '..', 'bike fitments')

const files = listFitmentFiles(DIR, fs)
console.log(`Found ${files.length} xlsx files (excluding Parts Sheet inventory logs).\n`)

const stats = {
  total: 0,
  missingName: 0,
  nameGuessedFromFilename: 0,
  missingEmail: 0,
  missingPhone: 0,
  missingBike: 0,
  oldStyleCount: 0,
  byType: {},
  parseErrors: [],
}

const parsed = []
for (const f of files) {
  stats.total++
  try {
    const p = parseFitmentFile(path.join(DIR, f))
    parsed.push(p)
    if (!p.client.name) stats.missingName++
    if (p._nameWasGuessed) stats.nameGuessedFromFilename++
    if (!p.client.email) stats.missingEmail++
    if (!p.client.phone) stats.missingPhone++
    if (!p.bike.make) stats.missingBike++
    if (p._isOldStyle) stats.oldStyleCount++
    stats.byType[p.bikeType] = (stats.byType[p.bikeType] || 0) + 1
  } catch (err) {
    stats.parseErrors.push({ file: f, error: err.message })
  }
}

console.log('--- Stats ---')
console.log(JSON.stringify(stats, null, 2))

console.log('\n--- Guessed-name records (verify these manually after import) ---')
parsed.filter((p) => p._nameWasGuessed).forEach((p) => console.log(p._filename, '->', p.client.name))

console.log('\n--- Still missing name entirely (first 20) ---')
parsed.filter((p) => !p.client.name).slice(0, 20).forEach((p) => console.log(p._filename))

fs.writeFileSync(
  path.join(__dirname, 'legacy-fitments-parsed.json'),
  JSON.stringify(parsed, null, 2),
)
console.log(`\nWrote ${parsed.length} parsed records to scripts/legacy-fitments-parsed.json for review.`)
