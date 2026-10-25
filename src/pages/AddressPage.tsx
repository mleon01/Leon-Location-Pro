import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import type { CustomerInput } from '../../shared/api'
import { data } from '../data/provider'
import { useCart } from '../lib/cart'
import { money } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import { CheckoutSteps, CompactSummary, useQuote } from '../components/Checkout'

// Étape 2 — « Informations personnelles pour facturation » (/shop/address d'Odoo)

type Form = Omit<CustomerInput, 'civility' | 'countryId'> & { civility: '' | 'M.' | 'Mme'; countryId: number | '' }
const KEY = 'llp-address'
const blank: Form = { civility: '', firstName: '', lastName: '', email: '', phone: '', street: '', street2: '', zip: '', city: '', countryId: '', website: '' }

function loadForm(): Form {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (raw) return { ...blank, ...(JSON.parse(raw) as Form) }
  } catch {
    /* ignoré */
  }
  return blank
}

function Field({ label, required, children, className = '' }: { label: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-3 block">
        {label}
        {required && ' *'}
      </span>
      {children}
    </label>
  )
}

export function AddressPage() {
  const cart = useCart()
  const navigate = useNavigate()
  const { quote } = useQuote()
  const { data: catalog } = useAsync(() => data.getCatalog())
  const [form, setForm] = useState<Form>(loadForm)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(form))
    } catch {
      /* ignoré */
    }
  }, [form])

  const countryId = form.countryId || catalog?.defaultCountryId || ''
  const country = catalog?.countries.find((c) => c.id === countryId)
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))

  if (cart.lines.length === 0 || !cart.start || !cart.end) return <Navigate to="/shop/cart" replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!cart.start || !cart.end || !form.civility || !countryId) return
    setSending(true)
    setError('')
    try {
      const result = await data.checkout({
        start: cart.start,
        end: cart.end,
        lines: cart.lines,
        customer: { ...form, civility: form.civility, countryId: Number(countryId) },
      })
      sessionStorage.removeItem(KEY)
      cart.clear()
      if (result.paymentUrl) window.location.assign(result.paymentUrl)
      else navigate('/shop/payment', { state: result })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La commande a échoué.')
      setSending(false)
    }
  }

  return (
    <form onSubmit={submit} className="container-odoo pb-10 pt-6">
      <CheckoutSteps active={1} />
      <div className="grid gap-8 lg:grid-cols-[1fr_445px] lg:gap-[30px]">
        <div>
          <h3 className="title-odoo mb-6 text-[26px]">INFORMATIONS PERSONNELLES POUR FACTURATION</h3>
          <div className="grid gap-x-[30px] gap-y-6 sm:grid-cols-12">
            <Field label="Civilité" required className="sm:col-span-3">
              <span className="relative block">
                <select required value={form.civility} onChange={set('civility')} className="field-odoo appearance-none">
                  <option value="">Choisir…</option>
                  <option value="M.">M.</option>
                  <option value="Mme">Mme</option>
                </select>
                <i className="fa fa-angle-down pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg" />
              </span>
            </Field>
            <Field label="Prénom" required className="sm:col-span-4">
              <input required autoComplete="given-name" maxLength={60} value={form.firstName} onChange={set('firstName')} className="field-odoo" />
            </Field>
            <Field label="Nom" required className="sm:col-span-5">
              <input required autoComplete="family-name" maxLength={60} value={form.lastName} onChange={set('lastName')} className="field-odoo" />
            </Field>
            <Field label="E-mail" required className="sm:col-span-6">
              <input required type="email" autoComplete="email" maxLength={120} value={form.email} onChange={set('email')} className="field-odoo" />
            </Field>
            <Field label="Téléphone" required className="sm:col-span-6">
              <input required type="tel" autoComplete="tel" maxLength={30} placeholder={country ? `+${country.phoneCode}` : ''} value={form.phone} onChange={set('phone')} className="field-odoo" />
            </Field>
            <Field label="Rue et numéro" required className="sm:col-span-12">
              <input required autoComplete="address-line1" maxLength={120} value={form.street} onChange={set('street')} className="field-odoo" />
            </Field>
            <Field label="Appartement, suite, etc." className="sm:col-span-12">
              <input autoComplete="address-line2" maxLength={120} value={form.street2} onChange={set('street2')} className="field-odoo" />
            </Field>
            <Field label="Code postal" required className="sm:col-span-4">
              <input required autoComplete="postal-code" maxLength={12} value={form.zip} onChange={set('zip')} className="field-odoo" />
            </Field>
            <Field label="Ville" required className="sm:col-span-8">
              <input required autoComplete="address-level2" maxLength={60} value={form.city} onChange={set('city')} className="field-odoo" />
            </Field>
            <Field label="Pays" required className="sm:col-span-6">
              <span className="relative block">
                <select required value={countryId} onChange={(e) => setForm((f) => ({ ...f, countryId: Number(e.target.value) }))} className="field-odoo appearance-none">
                  <option value="">Pays...</option>
                  {catalog?.countries.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <i className="fa fa-angle-down pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg" />
              </span>
            </Field>
            {/* Piège à robots : invisible pour les visiteurs */}
            <input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} className="hidden" aria-hidden="true" />
          </div>
        </div>

        <aside className="self-start rounded-md border border-white/10 bg-ink-800 p-6">
          {quote ? <CompactSummary quote={quote} /> : <p className="text-muted">Calcul du prix…</p>}
          {error && <p className="mt-4 border border-alert/50 bg-alert/10 p-3 text-sm" role="alert">{error}</p>}
          <button type="submit" disabled={sending || !quote?.allAvailable} className="btn-odoo mt-5 h-[54px] w-full text-[13px] tracking-[1.5px]">
            {sending ? 'Création de la commande…' : <>Procéder au paiement <i className="fa fa-angle-right ml-2" /></>}
          </button>
          {quote && (
            <p className="mt-2 text-center text-xs text-muted lg:hidden">
              Commande : {money(quote.total)}
            </p>
          )}
          <Link to="/shop/cart" className="mt-6 block text-center text-brand-dark hover:text-brand">
            <i className="fa fa-angle-left mr-2" />
            Retour au panier
          </Link>
        </aside>
      </div>
    </form>
  )
}
