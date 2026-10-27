import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { CustomerInput, DepositMode, PaymentMode } from '../../shared/api'
import { data } from '../data/provider'
import { useCart } from '../lib/cart'
import { money } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import { installments, PeriodBox, Totals, useQuote } from '../components/Checkout'
import { Stepper } from '../components/Stepper'

// Étape « Récapitulatif » : tout sur une page pour payer vite.
// À gauche le récapitulatif, à droite coordonnées, caution, mode de paiement.

type Form = Omit<CustomerInput, 'civility' | 'countryId'> & { civility: '' | 'M.' | 'Mme'; countryId: number | '' }
const KEY = 'llp-checkout'
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

function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm">{label}</span>
      {children}
    </label>
  )
}

function Choice({ checked, onSelect, title, badge, children }: { checked: boolean; onSelect(): void; title: ReactNode; badge?: string; children?: ReactNode }) {
  return (
    <label className={`flex cursor-pointer gap-3 rounded border p-4 transition ${checked ? 'border-brand bg-brand/10' : 'border-white/15 hover:border-white/40'}`}>
      <input type="radio" checked={checked} onChange={onSelect} className="mt-1 h-4 w-4 shrink-0 accent-brand" />
      <span className="flex-1">
        <span className="flex flex-wrap items-center gap-2 font-semibold">
          {title}
          {badge && <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-950">{badge}</span>}
        </span>
        {children && <span className="mt-1 block text-sm text-muted">{children}</span>}
      </span>
    </label>
  )
}

const H3 = 'title-odoo mb-4 text-[24px]'

export function CheckoutPage() {
  const cart = useCart()
  const navigate = useNavigate()
  const { quote, error: quoteError, loading } = useQuote()
  const { data: catalog } = useAsync(() => data.getCatalog())
  const [form, setForm] = useState<Form>(loadForm)
  const [depositMode, setDepositMode] = useState<DepositMode>('gando')
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('card')
  const [terms, setTerms] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(form))
    } catch {
      /* ignoré */
    }
  }, [form])

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const countryId = form.countryId || catalog?.defaultCountryId || ''
  const country = catalog?.countries.find((c) => c.id === countryId)
  const delivery = catalog?.deliveryMethods.find((d) => d.id === cart.deliveryId)
  const backToShop = cart.start && cart.end ? `/shop?${new URLSearchParams({ start_date: cart.start, end_date: cart.end })}` : '/shop'
  const backToOptions = `${backToShop}${backToShop.includes('?') ? '&' : '?'}options=1`

  if (cart.lines.length === 0) {
    return (
      <div className="container-odoo pb-24">
        <Stepper current={0} />
        <div className="mt-12 text-center">
          <i className="fa fa-calendar-o text-brand" style={{ fontSize: 64 }} />
          <p className="title-odoo mt-6 text-2xl">AUCUNE RÉSERVATION EN COURS</p>
          <p className="mt-2 text-muted">Choisissez vos dates pour voir les véhicules disponibles.</p>
          <Link to="/" className="btn-odoo mt-6 h-[54px] px-10 text-[13px] tracking-[1.5px]">Choisir mes dates</Link>
        </div>
      </div>
    )
  }

  const total = quote?.total ?? 0
  const almaN = paymentMode === 'alma3' ? 3 : paymentMode === 'alma4' ? 4 : 1
  const today = almaN > 1 ? installments(total, almaN)[0] : total
  const needsAddress = !!delivery?.requiresAddress && cart.deliveryDetail.trim().length < 5

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!cart.start || !cart.end || !cart.deliveryId || !form.civility || !countryId) return
    setSending(true)
    setError('')
    try {
      const result = await data.checkout({
        start: cart.start,
        end: cart.end,
        lines: cart.lines,
        deliveryId: cart.deliveryId,
        deliveryDetail: cart.deliveryDetail,
        customer: { ...form, civility: form.civility, countryId: Number(countryId) },
        depositMode,
        paymentMode,
        acceptTerms: terms,
      })
      if (result.paymentUrl.includes('#/')) navigate(result.paymentUrl.slice(result.paymentUrl.indexOf('#/') + 1))
      else window.location.assign(result.paymentUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La réservation a échoué.')
      setSending(false)
    }
  }

  return (
    <form onSubmit={submit} className="container-odoo pb-12">
      <Stepper current={3} back={{ 0: backToShop, 1: backToShop, 2: backToOptions }} />
      <div className="mb-6" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-[30px]">
        {/* ─── Récapitulatif ─── */}
        <aside className="self-start rounded-md border border-white/10 bg-ink-800 p-5 sm:p-6 lg:sticky lg:top-[86px]">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h3 className="title-odoo text-[24px]">VOTRE RÉSERVATION</h3>
            <Link to={backToOptions} className="text-sm text-brand hover:underline"><i className="fa fa-pencil mr-1" />Modifier</Link>
          </div>
          {quoteError && <p className="mb-4 border border-alert/50 bg-alert/10 p-3 text-sm">{quoteError}</p>}
          <div className="space-y-4">
            {(quote?.lines ?? []).filter((l) => l.kind !== 'delivery').map((l) => (
              <div key={l.productId} className="flex gap-3">
                <img src={l.image} alt={l.name} className="h-12 w-16 shrink-0 rounded bg-white object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-3">
                    <h6 className="font-display text-base leading-tight">{l.name.toUpperCase()}{l.qty > 1 && ` × ${l.qty}`}</h6>
                    <span className="shrink-0 font-display text-base">{money(l.amount)}</span>
                  </div>
                  {l.isRental ? (
                    <p className="text-sm text-muted">{l.unitLabel} · {l.durationLabel} · <Link to={backToShop} className="text-brand hover:underline">Changer de véhicule</Link></p>
                  ) : (
                    <button type="button" onClick={() => cart.removeLine(l.productId)} className="text-sm text-muted hover:text-brand">Retirer</button>
                  )}
                  {!l.available && <p className="mt-1 text-sm text-[#ff6b78]">Ce véhicule n'est plus disponible sur cette période. Modifiez les dates.</p>}
                </div>
              </div>
            ))}
            {loading && !quote && <p className="text-muted">Calcul du prix…</p>}
          </div>

          {/* Lieu de remise (modifiable ici) */}
          <div className="mt-5 border-t border-white/10 pt-4">
            <label className="block">
              <span className="mb-1.5 block font-display text-sm">LIEU DE REMISE DU VÉHICULE</span>
              <span className="relative block">
                <select
                  required
                  value={cart.deliveryId ?? ''}
                  onChange={(e) => cart.setDelivery(Number(e.target.value), cart.deliveryDetail)}
                  className="field-odoo h-[45px] appearance-none pr-10 text-sm"
                >
                  <option value="">Choisir…</option>
                  {catalog?.deliveryMethods.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} — {money(d.price)}</option>
                  ))}
                </select>
                <i className="fa fa-angle-down pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg" />
              </span>
            </label>
            {delivery?.requiresAddress && (
              <input
                required
                minLength={5}
                maxLength={300}
                value={cart.deliveryDetail}
                onChange={(e) => cart.setDelivery(delivery.id, e.target.value)}
                placeholder="Adresse de livraison (hôtel, domicile…)"
                className="field-odoo mt-2 h-[45px] text-sm"
              />
            )}
          </div>

          <div className="mt-4"><PeriodBox /></div>
          {quote && (
            <div className={`mt-5 ${loading ? 'opacity-60' : ''}`}>
              <Totals quote={quote} />
              {quote.deposit > 0 && (
                <p className="mt-4 flex gap-2 rounded bg-white/5 p-3 text-sm text-muted">
                  <i className="fa fa-shield mt-0.5 text-brand" />
                  <span>Caution de <b className="text-white">{money(quote.deposit)}</b> : non débitée, restituée après le retour du véhicule.</span>
                </p>
              )}
            </div>
          )}
        </aside>

        {/* ─── Coordonnées, caution, paiement ─── */}
        <div className="space-y-8">
          <section>
            <h3 className={H3}>VOS COORDONNÉES</h3>
            <div className="grid gap-4 sm:grid-cols-12">
              <div className="sm:col-span-12">
                <span className="mb-1.5 block text-sm">Civilité</span>
                <div className="flex gap-2">
                  {(['M.', 'Mme'] as const).map((c) => (
                    <button key={c} type="button" onClick={() => setForm((f) => ({ ...f, civility: c }))} className={`h-[45px] w-24 border ${form.civility === c ? 'border-brand bg-brand/15 font-bold' : 'border-white/15 bg-ink-600'}`} aria-pressed={form.civility === c}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <Field label="Prénom" className="sm:col-span-6"><input required autoComplete="given-name" maxLength={60} value={form.firstName} onChange={set('firstName')} className="field-odoo h-[45px]" /></Field>
              <Field label="Nom" className="sm:col-span-6"><input required autoComplete="family-name" maxLength={60} value={form.lastName} onChange={set('lastName')} className="field-odoo h-[45px]" /></Field>
              <Field label="Téléphone" className="sm:col-span-6"><input required type="tel" autoComplete="tel" maxLength={30} placeholder={country ? `+${country.phoneCode}` : ''} value={form.phone} onChange={set('phone')} className="field-odoo h-[45px]" /></Field>
              <Field label="E-mail" className="sm:col-span-6"><input required type="email" autoComplete="email" maxLength={120} value={form.email} onChange={set('email')} className="field-odoo h-[45px]" /></Field>
              <Field label="Adresse (pour la facture)" className="sm:col-span-12"><input required autoComplete="street-address" maxLength={120} value={form.street} onChange={set('street')} className="field-odoo h-[45px]" /></Field>
              <Field label="Code postal" className="sm:col-span-3"><input required autoComplete="postal-code" maxLength={12} value={form.zip} onChange={set('zip')} className="field-odoo h-[45px]" /></Field>
              <Field label="Ville" className="sm:col-span-5"><input required autoComplete="address-level2" maxLength={60} value={form.city} onChange={set('city')} className="field-odoo h-[45px]" /></Field>
              <Field label="Pays" className="sm:col-span-4">
                <span className="relative block">
                  <select required value={countryId} onChange={(e) => setForm((f) => ({ ...f, countryId: Number(e.target.value) }))} className="field-odoo h-[45px] appearance-none pr-9">
                    {catalog?.countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <i className="fa fa-angle-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-lg" />
                </span>
              </Field>
              <input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} className="hidden" aria-hidden="true" />
            </div>
          </section>

          <section>
            <h3 className={H3}>CAUTION{quote?.deposit ? ` : ${money(quote.deposit)}` : ''} <span className="font-sans text-sm font-normal text-muted">— non débitée</span></h3>
            <div className="space-y-3">
              <Choice checked={depositMode === 'gando'} onSelect={() => setDepositMode('gando')} title="En ligne avec Gando" badge="Recommandé">
                Déposée avant votre arrivée, depuis votre téléphone : la remise des clés est plus rapide.
              </Choice>
              <Choice checked={depositMode === 'tpe'} onSelect={() => setDepositMode('tpe')} title="Empreinte bancaire à la remise des clés">
                Sur notre terminal de paiement, avec une carte au nom du conducteur principal.
              </Choice>
            </div>
          </section>

          <section>
            <h3 className={H3}>PAIEMENT</h3>
            <div className="space-y-3">
              <Choice checked={paymentMode === 'card'} onSelect={() => setPaymentMode('card')} title={<>Carte bancaire <span className="font-normal text-muted">— {money(total)} en une fois</span></>}>
                <i className="fa fa-cc-visa mr-1.5 text-lg" /><i className="fa fa-cc-mastercard mr-1.5 text-lg" /><i className="fa fa-cc-amex text-lg" />
              </Choice>
              {[3, 4].map((n) => (
                <Choice key={n} checked={almaN === n} onSelect={() => setPaymentMode(n === 3 ? 'alma3' : 'alma4')} title={<>En {n} fois avec Alma <span className="font-normal text-muted">— {money(installments(total, n)[0])} aujourd'hui</span></>}>
                  puis {n - 1} × {money(installments(total, n)[1])} les mois suivants, par carte bancaire.
                </Choice>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <label className="flex cursor-pointer gap-3 text-sm">
              <input type="checkbox" required checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-brand" />
              <span>
                J'accepte les <Link to="/modalites-vente" target="_blank" className="text-brand underline">conditions générales de vente</Link>, dont l'annulation gratuite jusqu'à 24 h avant le départ.
              </span>
            </label>
            {(error || needsAddress) && (
              <p className="border border-alert/50 bg-alert/10 p-3 text-sm" role="alert">{error || "Précisez l'adresse de livraison du véhicule dans le récapitulatif."}</p>
            )}
            <button
              type="submit"
              disabled={sending || !quote || loading || !quote.allAvailable || !cart.deliveryId || !form.civility || needsAddress}
              className="btn-odoo h-[58px] w-full text-[14px] font-semibold tracking-[1.5px]"
            >
              {sending ? 'Redirection vers le paiement…' : <>Payer {money(today)}{almaN > 1 ? " aujourd'hui" : ''} <i className="fa fa-lock ml-2" /></>}
            </button>
            {!form.civility && <p className="text-center text-xs text-muted">Choisissez votre civilité pour continuer.</p>}
            <p className="text-center text-xs text-muted">
              <i className="fa fa-lock mr-1" /> Paiement sécurisé · Facture envoyée par e-mail · Vos documents pourront être déposés juste après
            </p>
          </section>
        </div>
      </div>
    </form>
  )
}
