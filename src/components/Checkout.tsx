import { Fragment, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Quote } from '../../shared/api'
import { data } from '../data/provider'
import { useCart } from '../lib/cart'
import { money } from '../lib/format'
import { displayIsoLocal, displayOdoo, TZ_NAME } from '../lib/time'
import { DateRangePicker } from './DateRangePicker'

const STEPS = [
  { label: 'Commande', to: '/shop/cart' },
  { label: 'Informations personnelles', to: '/shop/address' },
  { label: 'Paiement', to: null },
]

/** Fil d'Ariane « Commande > Informations personnelles > Paiement » */
export function CheckoutSteps({ active }: { active: 0 | 1 | 2 }) {
  return (
    <nav className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-medium" aria-label="Étapes de la commande">
      {STEPS.map((s, i) => (
        <Fragment key={s.label}>
          {i > 0 && <i className="fa fa-angle-right text-lg" aria-hidden="true" />}
          {i < active && s.to ? (
            <Link to={s.to} className="text-white/60 hover:text-white">{s.label}</Link>
          ) : (
            <span className={i === active ? 'border-b-2 border-white font-bold' : ''} aria-current={i === active ? 'step' : undefined}>
              {s.label}
            </span>
          )}
        </Fragment>
      ))}
    </nav>
  )
}

/** Récapitulatif du panier calculé par Odoo ; ajuste la période si le véhicule impose ses horaires. */
export function useQuote() {
  const cart = useCart()
  const [state, setState] = useState<{ quote?: Quote; error?: string; loading: boolean }>({ loading: true })
  const key = JSON.stringify([cart.start, cart.end, cart.lines])

  useEffect(() => {
    if (!cart.start || !cart.end || cart.lines.length === 0) return setState({ loading: false })
    let alive = true
    setState((s) => ({ quote: s.quote, loading: true }))
    data
      .quote(cart.start, cart.end, cart.lines)
      .then((quote) => {
        if (!alive) return
        if (quote.adjusted) cart.setPeriod(quote.start, quote.end)
        setState({ quote, loading: false })
      })
      .catch((e: unknown) => alive && setState({ error: e instanceof Error ? e.message : 'Erreur', loading: false }))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return state
}

export function Totals({ quote }: { quote: Quote }) {
  return (
    <dl className="space-y-2">
      <div className="flex justify-between"><dt>Livraison</dt><dd>-</dd></div>
      <div className="flex justify-between"><dt>Sous-total</dt><dd>{money(quote.subtotal)}</dd></div>
      <div className="flex justify-between border-b border-white/20 pb-3"><dt>{quote.taxLabel}</dt><dd>{money(quote.tax)}</dd></div>
      <div className="flex justify-between pt-1 text-lg font-bold"><dt>Total</dt><dd>{money(quote.total)}</dd></div>
    </dl>
  )
}

/** Encadré « Période de location » avec modification des dates (page panier). */
export function PeriodBox() {
  const cart = useCart()
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLDivElement>(null)
  if (!cart.start || !cart.end) return null
  return (
    <div ref={anchor} className="relative border border-brand/40 bg-ink-600">
      <p className="px-0.5 pt-0.5 font-display text-sm leading-none">PERIODE DE LOCATION</p>
      {[cart.start, cart.end].map((d, i) => (
        <button key={i} type="button" onClick={() => setOpen(true)} className="mt-2 flex h-[49px] w-full items-center justify-between pl-4 text-left last:mb-3">
          <span>{displayOdoo(d)}</span>
          <span className="grid h-full w-10 place-items-center bg-[#1b1b1b]"><i className="fa fa-calendar text-sm" /></span>
        </button>
      ))}
      {open && (
        <DateRangePicker
          start={cart.start}
          end={cart.end}
          align="right"
          anchorRef={anchor}
          onClose={() => setOpen(false)}
          onApply={(s, e) => {
            setOpen(false)
            cart.setPeriod(s, e)
          }}
        />
      )}
    </div>
  )
}

/** Résumé compact (page Informations personnelles) */
export function CompactSummary({ quote }: { quote: Quote }) {
  return (
    <div className="space-y-4">
      {quote.lines.map((l) => (
        <div key={l.productId} className="flex items-start justify-between gap-3 border-b border-white/15 pb-3">
          <span className="relative">
            <img src={l.image} alt={l.name} className="h-12 w-16 rounded bg-white object-cover" />
            <span className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-[#7ab3ec] text-[11px] font-bold text-ink-900">{l.qty}</span>
          </span>
          <span className="text-right">{money(l.amount)}</span>
        </div>
      ))}
      <div className="border-b border-white/15 pb-3">
        <p className="font-display text-sm">PÉRIODE DE LOCATION</p>
        <p>
          {displayIsoLocal(quote.start)} <i className="fa fa-long-arrow-right" /> {displayIsoLocal(quote.end)} ({TZ_NAME})
        </p>
      </div>
      <Totals quote={quote} />
    </div>
  )
}
