import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'

// "Generate & send invoice now" — backs the button on the invoices
// dashboard. Reaches for the same latest-completed-billing-cycle invoice
// the scheduled function would (see functions/index.js), so pressing this
// off-cycle either resends a failed auto-send or catches up a missed one,
// rather than creating a duplicate.
export async function sendMonthlyInvoice() {
  const call = httpsCallable(functions, 'sendMonthlyInvoice')
  const { data } = await call()
  return data
}
