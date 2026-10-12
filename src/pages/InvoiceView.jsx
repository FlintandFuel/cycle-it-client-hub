import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { getInvoice } from '../lib/invoiceStore'
import { auth } from '../lib/firebase'
import { ALLOWED_EMAILS } from '../lib/allowedEmails'
import logo from '../assets/cycle-it-logo-white.png'

function formatDate(iso) {
  if (!iso) return ''
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatRand(amount) {
  return `R${Number(amount || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Period-derived, not a separate counter — mirrors functions/lib/templates.js
// invoiceNumber() so the emailed invoice and this page always agree.
function invoiceNumber(invoice) {
  return `INV-${invoice.id.replace(/-/g, '')}`
}

// Dev-only stand-in so the layout can be previewed at /invoice/preview-demo
// before any real invoice exists (nothing writes to Firestore locally, and
// import.meta.env.DEV is stripped out of production builds — this never
// ships). Remove once a real invoice has gone through the full flow.
const DEMO_INVOICE = {
  id: 'preview-demo',
  periodStart: '2026-08-26',
  periodEnd: '2026-09-25',
  count: 3,
  business: {
    fromName: 'Cycle-It',
    fromAddress: '',
    fromEmail: '',
    fromPhone: '',
    billedToName: 'Dunkeld Cycles',
    billedToAddress: '',
  },
  items: [
    { profileId: 'demo-1', clientName: 'Jane van der Merwe', fitDate: '2026-08-29' },
    { profileId: 'demo-2', clientName: 'Sipho Nkosi', fitDate: '2026-09-10' },
    { profileId: 'demo-3', clientName: 'Liam Botha', fitDate: '2026-09-22' },
  ],
  components: [
    { profileId: 'demo-1', clientName: 'Jane van der Merwe', fitDate: '2026-08-29', brand: 'Ritchey', description: '60mm stem', price: 1200 },
    { profileId: 'demo-3', clientName: 'Liam Botha', fitDate: '2026-09-22', brand: 'Fizik', description: 'Antares saddle', price: 2450.5 },
  ],
  componentsTotal: 3650.5,
}

// The "View online" link in the monthly invoice email lands here — no
// sign-in required, same as a client fit profile (see firestore.rules),
// since Dunkeld Cycles has no account in this system.
export default function InvoiceView() {
  const { id } = useParams()
  const [invoice, setInvoice] = useState(undefined)
  const [isFitter, setIsFitter] = useState(false)

  useEffect(() => {
    if (import.meta.env.DEV && id === 'preview-demo') {
      setInvoice(DEMO_INVOICE)
      return
    }
    let active = true
    getInvoice(id).then((inv) => {
      if (active) setInvoice(inv)
    })
    return () => {
      active = false
    }
  }, [id])

  // Only ever adds a "← Invoices" link back for the fitter — never gates
  // the page itself, since this URL is meant to open for Dunkeld Cycles
  // straight from the invoice email with no sign-in of their own.
  useEffect(() => onAuthStateChanged(auth, (u) => setIsFitter(!!u && ALLOWED_EMAILS.includes(u.email))), [])

  if (invoice === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <p className="text-muted">Loading…</p>
      </div>
    )
  }

  if (invoice === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink px-6 text-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-orange">Not found</p>
          <p className="mt-2 text-muted">This invoice link isn&apos;t valid, or has been removed.</p>
        </div>
      </div>
    )
  }

  const business = invoice.business || {}
  // Absent on invoices generated before components were logged.
  const components = invoice.components || []

  return (
    <div className="min-h-screen bg-ink pb-16">
      <div className="mx-auto max-w-md px-5 pt-10 sm:max-w-lg">
        {isFitter && (
          <Link
            to="/invoices"
            className="mb-4 inline-block text-sm text-muted underline decoration-border underline-offset-4 hover:text-off-white"
          >
            ← Invoices
          </Link>
        )}
        <div className="flex items-start justify-between gap-4">
          <img src={logo} alt="Cycle-It" className="h-16 w-auto" />
          <div className="shrink-0 text-right">
            <p className="text-xs font-semibold uppercase tracking-widest text-orange">Invoice</p>
            <p className="mt-1 text-sm text-muted">No. {invoiceNumber(invoice)}</p>
          </div>
        </div>
        <h1 className="mt-4 text-2xl font-bold text-off-white">New bike fits</h1>
        <p className="mt-1 text-sm text-muted">
          {formatDate(invoice.periodStart)} – {formatDate(invoice.periodEnd)}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-ink-raised p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">From</p>
            <p className="mt-2 text-sm font-medium text-off-white">{business.fromName || 'Cycle-It'}</p>
            {business.fromAddress && (
              <p className="mt-1 whitespace-pre-line text-sm text-off-white/80">{business.fromAddress}</p>
            )}
            {business.fromEmail && <p className="mt-1 text-sm text-off-white/80">{business.fromEmail}</p>}
            {business.fromPhone && <p className="text-sm text-off-white/80">{business.fromPhone}</p>}
          </div>
          <div className="rounded-xl border border-border bg-ink-raised p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Billed to</p>
            <p className="mt-2 text-sm font-medium text-off-white">{business.billedToName || 'Dunkeld Cycles'}</p>
            {business.billedToAddress && (
              <p className="mt-1 whitespace-pre-line text-sm text-off-white/80">{business.billedToAddress}</p>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl border border-border bg-ink-raised px-4 py-3">
          <span className="text-sm text-muted">Total new bike fits</span>
          <span className="text-lg font-semibold text-orange">{invoice.count}</span>
        </div>

        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
            Itemised list
          </h2>
          {invoice.items.length === 0 ? (
            <p className="rounded-xl border border-border bg-ink-raised p-5 text-sm text-muted">
              No new bike fits in this period.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="grid grid-cols-[7rem_1fr] gap-4 bg-ink-raised px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                <span>Date</span>
                <span>Client</span>
              </div>
              {invoice.items.map((item, i) => (
                <div
                  key={item.profileId}
                  className={`grid grid-cols-[7rem_1fr] gap-4 px-4 py-3 text-sm ${
                    i % 2 === 1 ? 'bg-ink-raised' : 'bg-ink'
                  }`}
                >
                  <span className="text-muted">{formatDate(item.fitDate)}</span>
                  <span className="text-off-white">{item.clientName}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {components.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
              Components fitted
            </h2>
            <div className="overflow-hidden rounded-xl border border-border">
              {components.map((c, i) => (
                <div
                  key={`${c.profileId}-${i}`}
                  className={`flex items-start justify-between gap-4 px-4 py-3 text-sm ${
                    i % 2 === 1 ? 'bg-ink-raised' : 'bg-ink'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-off-white">
                      {c.brand} — {c.description}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {c.clientName} · {formatDate(c.fitDate)}
                    </p>
                  </div>
                  <span className="shrink-0 text-off-white">{formatRand(c.price)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-border bg-ink-raised px-4 py-3">
                <span className="text-sm text-muted">Total retail</span>
                <span className="text-lg font-semibold text-orange">{formatRand(invoice.componentsTotal)}</span>
              </div>
            </div>
          </section>
        )}

        <p className="mt-10 text-center text-xs text-muted">
          Questions about this invoice? Just reply to the email that brought you here.
        </p>

        <Link
          to="/new"
          className="mt-8 block text-center text-sm text-muted underline decoration-border underline-offset-4 hover:text-off-white"
        >
          Cycle-It
        </Link>
      </div>
    </div>
  )
}
