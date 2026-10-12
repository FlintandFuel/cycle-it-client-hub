// Firestore-backed data layer for the `invoices` collection — generated
// and written server-side by functions/index.js (getOrCreateInvoice).
// Nothing here ever writes an invoice; the client only ever reads them.

import { db } from './firebase'
import { collection, doc, getDoc, getDocs, query, orderBy } from 'firebase/firestore'

const COLLECTION = 'invoices'

export async function getInvoice(id) {
  const snap = await getDoc(doc(db, COLLECTION, id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

// Requires an authenticated, allowlisted caller — see firestore.rules
// (`allow list`).
export async function listInvoices() {
  const snap = await getDocs(query(collection(db, COLLECTION), orderBy('periodEnd', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}
