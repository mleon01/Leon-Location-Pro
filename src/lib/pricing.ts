import type { BookingOption, Location, PricingRules, Quote, QuoteLine, RentalOption, Vehicle } from '../types'

/** Nombre de jours facturés : par tranche de 24 h entamée (1 h de tolérance), minimum 1. */
export function rentalDays(startIso: string, endIso: string, minDays = 1): number {
  const hours = (new Date(endIso).getTime() - new Date(startIso).getTime()) / 3_600_000
  return Math.max(minDays, Math.ceil((hours - 1) / 24))
}

export function discountFor(days: number, rules: PricingRules): number {
  return rules.durationDiscounts.reduce((p, d) => (days >= d.minDays ? d.percent : p), 0)
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Calcul du devis en mode démonstration.
 * En mode Odoo, c'est Odoo (listes de prix) qui fera foi : ce calcul sert uniquement d'estimation.
 */
export function computeQuote(params: {
  vehicle: Vehicle
  start: string
  end: string
  pickup?: Location
  dropoff?: Location
  options?: BookingOption[]
  catalog?: RentalOption[]
  rules: PricingRules
}): Quote {
  const { vehicle, rules, pickup, dropoff, options = [], catalog = [] } = params
  const days = rentalDays(params.start, params.end, rules.minDays)
  const rentalSubtotal = vehicle.dailyRate * days
  const discountPercent = discountFor(days, rules)
  const discountAmount = round2((rentalSubtotal * discountPercent) / 100)

  const lines: QuoteLine[] = [{ label: `Location ${vehicle.brand} ${vehicle.model} — ${days} j × ${vehicle.dailyRate} €`, amount: rentalSubtotal }]
  if (discountAmount > 0) lines.push({ label: `Remise longue durée (−${discountPercent} %)`, amount: -discountAmount })

  for (const sel of options) {
    const opt = catalog.find((o) => o.id === sel.id)
    if (!opt || sel.qty <= 0) continue
    const amount = opt.per === 'jour' ? opt.price * days * sel.qty : opt.price * sel.qty
    lines.push({ label: `${opt.name}${sel.qty > 1 ? ` × ${sel.qty}` : ''}`, amount })
  }
  if (pickup && pickup.fee > 0) lines.push({ label: `Livraison — ${pickup.name}`, amount: pickup.fee })
  if (dropoff && dropoff.fee > 0) lines.push({ label: `Reprise — ${dropoff.name}`, amount: dropoff.fee })
  if (pickup && dropoff && pickup.id !== dropoff.id) lines.push({ label: 'Retour dans un autre lieu', amount: rules.oneWayFee })

  const total = round2(lines.reduce((s, l) => s + l.amount, 0))
  return { days, baseRate: vehicle.dailyRate, rentalSubtotal, discountPercent, discountAmount, lines, total, deposit: vehicle.deposit }
}

/** Deux périodes se chevauchent-elles ? */
export const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) =>
  new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd)
