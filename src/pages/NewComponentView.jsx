import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Field from '../components/Field'
import SectionCard from '../components/SectionCard'
import Toast from '../components/Toast'
import { createComponentPurchase, listProfiles } from '../lib/profileStore'
import { groupProfilesByClient } from '../lib/groupClients'
import { parsePrice } from '../lib/parsePrice'
import logo from '../assets/cycle-it-logo-white.png'

const todayISO = () => new Date().toISOString().slice(0, 10)
const emptyComponent = { brand: '', description: '', price: '' }
const emptyClient = { name: '', email: '', phone: '', consentGiven: false }

// Quick "sold a part, no fit" entry — pick an existing client (or type a new
// one), add the components, save. Lands on the Components page and the
// client's history under the purchase date's billing month.
export default function NewComponentView() {
  const location = useLocation()
  // Set when arriving from a client's "+ New component" button.
  const prefillClient = location.state?.prefillClient
  const [client, setClient] = useState(() =>
    prefillClient ? { ...emptyClient, ...prefillClient, consentGiven: true } : emptyClient,
  )
  const [existing, setExisting] = useState(Boolean(prefillClient))
  const [date, setDate] = useState(todayISO())
  const [components, setComponents] = useState([{ ...emptyComponent }])
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    listProfiles()
      .then(setProfiles)
      .catch(() => setProfiles([]))
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return groupProfilesByClient(profiles)
      .map((g) => g.latestProfile.client || {})
      .filter((c) => `${c.name || ''} ${c.email || ''} ${c.phone || ''}`.toLowerCase().includes(q))
      .slice(0, 6)
  }, [profiles, search])

  function pickClient(c) {
    setClient({ name: c.name || '', email: c.email || '', phone: c.phone || '', consentGiven: true })
    setExisting(true)
    setSearch('')
    setErrors((prev) => ({ ...prev, client: undefined, consent: undefined }))
  }

  function clearClient() {
    setClient(emptyClient)
    setExisting(false)
  }

  function setComponent(index, key, value) {
    setComponents((prev) => prev.map((c, i) => (i === index ? { ...c, [key]: value } : c)))
  }

  function validate(cleaned) {
    const next = {}
    if (!client.name.trim()) next.client = 'Client name is required'
    else if (!client.email.trim() && !client.phone.trim()) next.client = 'Add an email or phone so it links to the client'
    if (!existing && !client.consentGiven) next.consent = 'Consent is required before saving'
    if (cleaned.length === 0) next.components = 'Add at least one component'
    else if (cleaned.some((c) => !c.brand || !c.description || c.price === null))
      next.components = 'Each component needs a brand, description and a valid price'
    if (!date) next.date = 'Date is required'
    return next
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const cleaned = components
      .filter((c) => c.brand.trim() || c.description.trim() || String(c.price).trim())
      .map((c) => ({ brand: c.brand.trim(), description: c.description.trim(), price: parsePrice(c.price) }))
    const next = validate(cleaned)
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSaving(true)
    try {
      await createComponentPurchase({
        client: {
          name: client.name.trim(),
          email: client.email.trim(),
          phone: client.phone.trim(),
          consentGiven: true,
        },
        date,
        components: cleaned,
      })
      const count = cleaned.length
      setToast({ tone: 'success', text: `${count} component${count === 1 ? '' : 's'} added for ${client.name.trim()}` })
      setComponents([{ ...emptyComponent }])
      if (!prefillClient) clearClient()
    } catch {
      setToast({ tone: 'error', text: 'Could not save — check your connection and try again.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-ink pb-24">
      {toast && (
        <Toast tone={toast.tone} onDismiss={() => setToast(null)}>
          {toast.text}
        </Toast>
      )}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-start justify-between px-4 py-8 sm:px-6">
          <div>
            <img src={logo} alt="Cycle-It" className="h-16 w-auto" />
            <h1 className="mt-4 text-2xl font-bold text-off-white sm:text-3xl">New component</h1>
            <p className="mt-1 text-sm text-muted">Log a part sold without a bike fit</p>
          </div>
          <div className="mt-1 flex shrink-0 flex-col items-end gap-2">
            <Link
              to="/components"
              className="text-sm text-muted underline decoration-border underline-offset-4 hover:text-off-white"
            >
              All components
            </Link>
            <Link
              to="/clients"
              className="text-sm text-muted underline decoration-border underline-offset-4 hover:text-off-white"
            >
              All clients
            </Link>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <SectionCard title="Client" subtitle="Search an existing client, or type a new one's details.">
          {existing ? (
            <div className="flex items-start justify-between gap-4 rounded-lg border border-orange/40 bg-orange/10 px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium text-off-white">{client.name}</p>
                <p className="mt-0.5 text-sm text-muted">
                  {[client.email, client.phone].filter(Boolean).join(' · ')}
                </p>
              </div>
              <button
                type="button"
                onClick={clearClient}
                className="shrink-0 text-sm text-muted underline decoration-border underline-offset-4 hover:text-off-white"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <Field
                  label="Find existing client"
                  name="clientSearch"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, email or phone…"
                />
                {matches.length > 0 && (
                  <div className="mt-2 overflow-hidden rounded-lg border border-border">
                    {matches.map((c, i) => (
                      <button
                        key={`${c.email}-${c.phone}-${i}`}
                        type="button"
                        onClick={() => pickClient(c)}
                        className="block w-full border-b border-border bg-ink px-4 py-3 text-left last:border-b-0 hover:bg-ink-raised"
                      >
                        <span className="block text-off-white">{c.name}</span>
                        <span className="block text-xs text-muted">
                          {[c.email, c.phone].filter(Boolean).join(' · ')}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs font-semibold uppercase tracking-widest text-muted">or new client</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <Field
                label="Name"
                name="client.name"
                required
                value={client.name}
                onChange={(e) => setClient({ ...client, name: e.target.value })}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="Email"
                  name="client.email"
                  type="email"
                  value={client.email}
                  onChange={(e) => setClient({ ...client, email: e.target.value })}
                />
                <Field
                  label="Phone"
                  name="client.phone"
                  type="tel"
                  value={client.phone}
                  onChange={(e) => setClient({ ...client, phone: e.target.value })}
                />
              </div>
              <label className="flex items-start gap-3 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={client.consentGiven}
                  onChange={(e) => setClient({ ...client, consentGiven: e.target.checked })}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-orange"
                />
                Client consents to Cycle-It storing their contact details.
              </label>
              {errors.consent && <p className="text-sm text-orange">{errors.consent}</p>}
            </div>
          )}
          {errors.client && <p className="mt-3 text-sm text-orange">{errors.client}</p>}
        </SectionCard>

        <SectionCard
          title="Components"
          subtitle="Listed on the Components page and Dunkeld Cycles' monthly invoice for this date's billing month."
        >
          <Field
            label="Date"
            name="date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            error={errors.date}
            className="mb-4 sm:max-w-xs"
          />
          <div className="space-y-4">
            {components.map((c, i) => (
              <div key={i} className="rounded-lg border border-border p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1.5fr_8rem]">
                  <Field
                    label="Brand"
                    name={`components.${i}.brand`}
                    value={c.brand}
                    onChange={(e) => setComponent(i, 'brand', e.target.value)}
                    placeholder="e.g. Ritchey"
                  />
                  <Field
                    label="Description"
                    name={`components.${i}.description`}
                    value={c.description}
                    onChange={(e) => setComponent(i, 'description', e.target.value)}
                    placeholder="e.g. 60mm stem"
                  />
                  <Field
                    label="Retail price (R)"
                    name={`components.${i}.price`}
                    inputMode="decimal"
                    value={c.price}
                    onChange={(e) => setComponent(i, 'price', e.target.value)}
                    placeholder="1200"
                  />
                </div>
                {components.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setComponents((prev) => prev.filter((_, j) => j !== i))}
                    className="mt-3 text-sm text-muted underline decoration-border underline-offset-4 hover:text-off-white"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
          {errors.components && <p className="mt-3 text-sm text-orange">{errors.components}</p>}
          <button
            type="button"
            onClick={() => setComponents((prev) => [...prev, { ...emptyComponent }])}
            className="mt-4 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-off-white transition-colors hover:border-orange"
          >
            + Add another
          </button>
        </SectionCard>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-orange py-4 text-[17px] font-semibold text-ink transition-colors hover:bg-orange-light disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save component'}
        </button>
      </form>
    </div>
  )
}
