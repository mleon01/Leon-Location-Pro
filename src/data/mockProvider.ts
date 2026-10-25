// Mode "mock" : copie du catalogue public (src/data/mock/catalog.json),
// prix calculés à la journée, tous les véhicules disponibles, paiement simulé.
// Sert à présenter le site quand le Worker n'est pas encore en ligne.
import type { Catalog, Quote, QuoteLine } from '../../shared/api'
import { TZ_OFFSET } from '../lib/time'
import catalogJson from './mock/catalog.json'
import type { DataProvider } from './provider'

const catalog = catalogJson as Catalog
const wait = (ms = 300) => new Promise((r) => setTimeout(r, ms))
const toDate = (s: string) => new Date(s.replace(' ', 'T') + 'Z')
const fmt = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ')
const round2 = (n: number) => Math.round(n * 100) / 100

/** Nombre de jours facturés (tranche de 24 h entamée) */
const days = (start: string, end: string) => Math.max(1, Math.ceil((toDate(end).getTime() - toDate(start).getTime()) / 86_400_000))
const plural = (n: number) => `${n} ${n > 1 ? 'Jours' : 'Jour'}`

function atLocalHour(utc: string, hour: number) {
  const local = new Date(toDate(utc).getTime() + TZ_OFFSET * 3_600_000)
  return fmt(new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) + (hour - TZ_OFFSET) * 3_600_000))
}

export const mockProvider: DataProvider = {
  async getCatalog() {
    return catalog
  },
  async search(start, end) {
    await wait()
    const n = days(start, end)
    return catalog.products.map((p) => ({
      productId: p.id,
      price: p.listPrice * n,
      priceInfo: `/ ${plural(n)}`,
      available: true,
      variants: p.variants.map((v) => ({ id: v.id, available: true })),
    }))
  },
  async quote(start, end, cartLines): Promise<Quote> {
    await wait()
    let s = start
    let e = end
    for (const l of cartLines) {
      const v = catalog.products.flatMap((p) => p.variants).find((x) => x.id === l.productId)
      if (v?.pickupHour) s = atLocalHour(s, v.pickupHour)
      if (v?.returnHour) e = atLocalHour(e, v.returnHour)
    }
    const n = days(s, e)
    const lines: QuoteLine[] = cartLines.flatMap((l): QuoteLine[] => {
      const product = catalog.products.find((p) => p.variants.some((v) => v.id === l.productId))
      if (product) {
        const v = product.variants.find((x) => x.id === l.productId)!
        return [{ productId: l.productId, templateId: product.id, name: v.displayName, qty: l.qty, isRental: true, unitLabel: product.displayPrice, durationLabel: plural(n), amount: product.listPrice * n * l.qty, available: true, image: product.image }]
      }
      const o = catalog.options.find((x) => x.productId === l.productId)
      return o ? [{ productId: l.productId, templateId: o.id, name: o.name, qty: l.qty, isRental: false, unitLabel: '', durationLabel: '', amount: o.price * l.qty, available: true, image: o.image }] : []
    })
    const subtotal = round2(lines.reduce((sum, l) => sum + l.amount, 0))
    const tax = round2((subtotal * catalog.tax.rate) / 100)
    return { start: s, end: e, adjusted: s !== start || e !== end, lines, subtotal, taxLabel: catalog.tax.label, tax, total: round2(subtotal + tax), allAvailable: true }
  },
  async checkout(req) {
    await wait(900)
    const q = await mockProvider.quote(req.start, req.end, req.lines)
    return { orderName: `DEMO-${String(Date.now()).slice(-4)}`, amountTotal: q.total, paymentUrl: '' }
  },
}
