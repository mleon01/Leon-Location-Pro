import { useEffect, useRef, useState } from 'react'
import type { Quote } from '../../shared/api'
import { data } from '../data/provider'
import { useCart } from '../lib/cart'
import { money } from '../lib/format'
import { displayOdoo } from '../lib/time'
import { DateRangePicker } from './DateRangePicker'

/** Récapitulatif calculé par Odoo ; ajuste la période si le véhicule impose ses horaires. */
export function useQuote() {
  const cart = useCart()
  const [state, setState] = useState<{ quote?: Quote; error?: string; loading: boolean }>({ loading: true })
  const key = JSON.stringify([cart.start, cart.end, cart.lines, cart.deliveryId])

  useEffect(() => {
    if (!cart.start || !cart.end || cart.lines.length === 0) return setState({ loading: false })
    let alive = true
    setState((s) => ({ quote: s.quote, loading: true }))
    data
      .quote({ start: cart.start, end: cart.end, lines: cart.lines, deliveryId: cart.deliveryId })
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
      <div className="flex justify-between"><dt>Sous-total HT</dt><dd>{money(quote.subtotal)}</dd></div>
      <div className="flex justify-between border-b border-white/20 pb-3"><dt>{quote.taxLabel}</dt><dd>{money(quote.tax)}</dd></div>
      <div className="flex justify-between pt-1 text-lg font-bold"><dt>Total TTC</dt><dd>{money(quote.total)}</dd></div>
    </dl>
  )
}

/** Encadré « Période de location » avec modification des dates. */
export function PeriodBox() {
  const cart = useCart()
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLDivElement>(null)
  if (!cart.start || !cart.end) return null
  return (
    <div ref={anchor} className="relative border border-brand/40 bg-ink-600">
      <p className="px-0.5 pt-0.5 font-display text-sm leading-none">PERIODE DE LOCATION</p>
      <div className="grid sm:grid-cols-2 sm:gap-2">
        {[cart.start, cart.end].map((d, i) => (
          <button key={i} type="button" onClick={() => setOpen(true)} className="mt-2 flex h-[45px] w-full items-center justify-between pl-3 text-left sm:mb-2">
            <span className="text-sm"><span className="text-muted">{i === 0 ? 'Départ' : 'Retour'} · </span>{displayOdoo(d).slice(0, 16)}</span>
            <span className="grid h-full w-10 place-items-center bg-[#1b1b1b]"><i className="fa fa-calendar text-sm" /></span>
          </button>
        ))}
      </div>
      {open && (
        <DateRangePicker
          start={cart.start}
          end={cart.end}
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

/** Échéancier Alma : la première échéance absorbe les centimes. */
export function installments(total: number, n: number): number[] {
  const cents = Math.round(total * 100)
  const base = Math.floor(cents / n)
  return Array.from({ length: n }, (_, i) => (i === 0 ? cents - base * (n - 1) : base) / 100)
}
