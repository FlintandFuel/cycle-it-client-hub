// Checks every legacy-imported profile ID against Firestore (via getDoc,
// which is open per firestore.rules `allow get: if true` — no auth
// needed, unlike listing the collection) and reports any that are
// missing. One-off diagnostic after a manual cleanup pass possibly
// removed a real record along with the intended test/demo ones.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../src/lib/firebase.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const parsed = JSON.parse(fs.readFileSync(path.join(__dirname, 'legacy-fitments-parsed.json')))

function slugId(filename) {
  const base = filename.replace(/\.xlsx$/i, '')
  const slug = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return `legacy-${slug}`.slice(0, 300)
}

const missing = []
let checked = 0
const CONCURRENCY = 20
let next = 0
async function worker() {
  while (next < parsed.length) {
    const p = parsed[next++]
    const id = slugId(p._filename)
    const snap = await getDoc(doc(db, 'profiles', id))
    checked++
    if (!snap.exists()) missing.push({ id, filename: p._filename, name: p.client.name, email: p.client.email })
    if (checked % 200 === 0) console.log(`Checked ${checked}/${parsed.length}`)
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker))

console.log(`\nChecked ${checked} records. Missing: ${missing.length}`)
missing.forEach((m) => console.log(JSON.stringify(m)))
process.exit(0)
