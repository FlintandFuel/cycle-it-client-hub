// Imports the legacy "Positioning Chart" Excel files into the real
// `profiles` collection — see parse-legacy-fitments.mjs for the dry-run
// version this was validated against first. Run with:
//   node scripts/import-legacy-fitments.mjs
//
// Writes through the public client SDK (same as scripts/seed-demo.mjs),
// not the Admin SDK — this project has no service-account key on this
// machine, and firestore.rules already allows an unauthenticated `create`
// as long as client.consentGiven is true, which every imported record
// sets (in-person consent was already given at the original in-store
// fitting; this mirrors that rather than asking again digitally).
//
// Deterministic per-file doc IDs (legacy-<slugified-filename>) make this
// safe to re-run: setDoc on an ID that already exists is an "update"
// under the rules (not "create"), which is intentionally disallowed for
// an unauthenticated caller, so a re-run just skips docs already written
// and retries only what's missing — see the try/catch below.
//
// emailStatus.profileEmailSent is pre-set to true on every imported
// record specifically so the onProfileCreated Cloud Function (which
// fires on every new profile doc regardless) sees the send as already
// claimed and no-ops — otherwise 1,378 clients would get a "your fit
// profile is ready" email today for a fitting from years ago.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../src/lib/firebase.js'
import { parseFitmentFile, listFitmentFiles } from './lib/parseFitment.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIR = path.join(__dirname, '..', 'bike fitments')
const CONCURRENCY = 12

function slugId(filename) {
  const base = filename.replace(/\.xlsx$/i, '')
  const slug = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return `legacy-${slug}`.slice(0, 300)
}

function buildProfileDoc(parsed, id) {
  const { _filename, _nameWasGuessed, _isOldStyle, ...profile } = parsed
  return {
    ...profile,
    id,
    createdAt: serverTimestamp(),
    emailStatus: { profileEmailSent: true, profileEmailSentAt: null },
    review: { optedOut: false, clicked: false },
    followUp: { sent: false, sentAt: null },
    legacyImport: {
      sourceFile: _filename,
      nameWasGuessed: _nameWasGuessed,
      wasOldTemplate: _isOldStyle,
      importedAt: new Date().toISOString(),
    },
  }
}

let files = listFitmentFiles(DIR, fs)
const limit = Number(process.env.IMPORT_LIMIT)
if (limit > 0) files = files.slice(0, limit)
console.log(`Importing ${files.length} legacy fitment files${limit > 0 ? ' (IMPORT_LIMIT test run)' : ''}...\n`)

let created = 0, skipped = 0, failed = 0
const failures = []

async function importOne(filename) {
  const id = slugId(filename)
  let parsed
  try {
    parsed = parseFitmentFile(path.join(DIR, filename))
  } catch (err) {
    failed++
    failures.push({ filename, stage: 'parse', error: err.message })
    return
  }
  try {
    await setDoc(doc(db, 'profiles', id), buildProfileDoc(parsed, id))
    created++
  } catch (err) {
    if (err.code === 'permission-denied') {
      skipped++
    } else {
      failed++
      failures.push({ filename, stage: 'write', error: err.message })
    }
  }
}

// Simple fixed-size worker pool — Firestore write latency dominates, so a
// handful of concurrent in-flight requests speeds this up a lot without
// needing atomic batching (which would fail an entire batch of ~400 if
// even one doc in it already existed from a prior partial run).
let next = 0
async function worker() {
  while (next < files.length) {
    const filename = files[next++]
    await importOne(filename)
    if ((created + skipped + failed) % 100 === 0) {
      console.log(`Progress: ${created + skipped + failed}/${files.length} (created ${created}, skipped ${skipped}, failed ${failed})`)
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker))

console.log('\n--- Done ---')
console.log(`Created: ${created}`)
console.log(`Skipped (already existed): ${skipped}`)
console.log(`Failed: ${failed}`)
if (failures.length) {
  fs.writeFileSync(path.join(__dirname, 'legacy-import-failures.json'), JSON.stringify(failures, null, 2))
  console.log(`Wrote ${failures.length} failures to scripts/legacy-import-failures.json`)
}
process.exit(0)
