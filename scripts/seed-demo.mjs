// One-off / repeatable seed: pushes the fictional demo clients into the
// real Firestore project so /p/:id and the /clients dashboard always have
// something to show, without needing to fill in the fitter form first.
//
// Run with: npm run seed:demo

import { doc, setDoc } from 'firebase/firestore'
import { db } from '../src/lib/firebase.js'
import { demoClients } from '../src/lib/demoData.js'

// setDoc on a doc ID that already exists is an "update" under Firestore
// rules (not "create"), and updates are intentionally disallowed — so a
// re-run only needs to (and only can) seed docs that don't exist yet.
for (const profile of demoClients) {
  try {
    await setDoc(doc(db, 'profiles', profile.id), profile)
    console.log(`Seeded profiles/${profile.id}`)
  } catch (err) {
    console.log(`Skipped profiles/${profile.id} (${err.code === 'permission-denied' ? 'already exists' : err.message})`)
  }
}
process.exit(0)
