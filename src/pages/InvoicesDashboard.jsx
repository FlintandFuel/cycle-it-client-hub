import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listInvoices } from '../lib/invoiceStore'
import { sendMonthlyInvoice } from '../lib/sendInvoiceEmail'
import Toast from '../components/Toast'
import logo from '../assets/cycle-it-logo-white.png'

function formatDate(iso) {
  if (!iso) return ''
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Badge({ children, tone = 'default' }) {
  const tones = {
    default: 'border-border text-muted',
    on: 'border-orange/40 bg-orange/10 text-orange',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs ${tones[tone]}`}>
      {children}
    </span>
  )
}

// Monthly Dunkeld Cycles billing — see functions/index.js for the
// scheduled send (25th of every month, rolling 26th–25th cycle) that this
// mirrors. Generating here reaches for that same cycle, so it's a resend
// for a failed auto-send rather than a new invoice, unless the scheduled
// run genuinely hasn't happened yet this cycle.
export default function InvoicesDashboard() {
  const [invoices, setInvoices] = useState(undefined)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  function reload() {
    listInvoices()
      .then(setInvoices)
      .catch(() => setError('Could not load invoices. You may not have access.'))
  }

  useEffect(reload, [])

  async function handleSendNow() {
    setSending(true)
    try {
      const result = await sendMonthlyInvoice()
      setToast({ tone: 'success', message: `Sent — ${result.count} new bike fit${result.count === 1 ? '' : 's'}` })
      reload()
    } catch {
      setToast({ tone: 'error', message: 'Failed to send — try again' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-ink pb-16">
      {toast && (
        <Toast tone={toast.tone} onDismiss={() => setToast(null)}>
          {toast.message}
        </Toast>
      )}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 px-4 py-8 sm:px-6">
          <div>
            <Link to="/new">
              <img src={logo} alt="Cycle-It" className="h-16 w-auto" />
            </Link>
            <h1 className="mt-4 text-2xl font-bold text-off-white sm:text-3xl">Invoices</h1>
            <p className="mt-1 text-sm text-muted">Dunkeld Cycles — new bike fit billing</p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/clients"
              className="text-sm text-muted underline decoration-border underline-offset-4 hover:text-off-white"
            >
              All clients
            </Link>
            <button
              type="button"
              onClick={handleSendNow}
              disabled={sending}
              className="shrink-0 rounded-lg bg-orange px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-orange-light disabled:opacity-60"
            >
              {sending ? 'Sending…' : 'Generate & send now'}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {error && <p className="text-sm text-orange">{error}</p>}

        {invoices === undefined && !error && <p className="text-muted">Loading…</p>}

        {invoices?.length === 0 && (
          <p className="text-muted">
            No invoices yet — they're generated automatically on the 25th of each month, or use "Generate &amp; send
            now" above.
          </p>
        )}

        {invoices && invoices.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="hidden grid-cols-[1fr_1fr_5rem_6rem] gap-4 border-b border-border bg-ink-raised px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:grid">
              <span>Period</span>
              <span>Status</span>
              <span className="text-right">Fits</span>
              <span />
            </div>
            {invoices.map((inv, i) => (
              <div
                key={inv.id}
                className={`grid grid-cols-1 gap-2 px-5 py-4 sm:grid-cols-[1fr_1fr_5rem_6rem] sm:items-center sm:gap-4 ${
                  i % 2 === 1 ? 'bg-ink-raised' : 'bg-ink'
                }`}
              >
                <p className="text-sm font-medium text-off-white">
                  {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                </p>
                <div>
                  {inv.emailStatus?.sent ? <Badge tone="on">Sent</Badge> : <Badge>Not sent</Badge>}
                </div>
                <p className="text-sm text-muted sm:text-right">{inv.count}</p>
                {/* Same-tab navigation deliberately — this app's Firestore
                    persistence (see firebase.js) assumes one active tab at a
                    time; opening the invoice in a new tab alongside this
                    list can leave one of them unable to read fresh data. */}
                <Link to={`/invoice/${inv.id}`} className="text-sm font-medium text-orange hover:text-orange-light">
                  View →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
