// Catalogue, recherche de disponibilités et récapitulatif du panier.
// Prix et disponibilités viennent des routes publiques d'Odoo (mêmes calculs que la boutique).
import type { CartLine, Catalog, CatalogOption, CatalogProduct, DeliveryMethod, Quote, QuoteLine, QuoteRequest, SearchResult } from '../../shared/api'
import { execute, publicRoute, type Env } from './odoo'
import { atLocalHour, checkPeriod, fmt, HttpError, round2, toDate } from './util'

interface OdooTemplate {
  id: number
  name: string
  list_price: number
  display_price: string
  x_caution: number
  product_variant_ids: number[]
  public_categ_ids: number[]
  optional_product_ids: number[]
  product_template_image_ids: number[]
  taxes_id: number[]
}

let catalogCache: { at: number; value: Catalog } | undefined

export async function getCatalog(env: Env): Promise<Catalog> {
  if (catalogCache && Date.now() - catalogCache.at < 120_000) return catalogCache.value
  const img = (model: string, id: number, size = 1024) => `${env.ODOO_URL}/web/image/${model}/${id}/image_${size}`

  const templates = await execute<OdooTemplate[]>(env, 'product.template', 'search_read', [
    [['rent_periodicity', '!=', false], ['is_published', '=', true], ['sale_ok', '=', true]],
  ], {
    fields: ['name', 'list_price', 'display_price', 'x_caution', 'product_variant_ids', 'public_categ_ids', 'optional_product_ids', 'product_template_image_ids', 'taxes_id'],
    order: 'list_price asc, id asc',
  })

  const variants = await execute<{ id: number; display_name: string; product_tmpl_id: [number, string]; product_template_attribute_value_ids: number[]; pickup_time: number; return_time: number }[]>(
    env, 'product.product', 'read', [templates.flatMap((t) => t.product_variant_ids), ['display_name', 'product_tmpl_id', 'product_template_attribute_value_ids', 'pickup_time', 'return_time']],
  )
  const ptavs = await execute<{ id: number; name: string; attribute_id: [number, string] }[]>(
    env, 'product.template.attribute.value', 'read', [[...new Set(variants.flatMap((v) => v.product_template_attribute_value_ids))], ['name', 'attribute_id']],
  )

  const optionIds = [...new Set(templates.flatMap((t) => t.optional_product_ids))]
  const optionRows = optionIds.length
    ? await execute<{ id: number; name: string; list_price: number; product_variant_id: [number, string] | false }[]>(env, 'product.template', 'search_read', [
        [['id', 'in', optionIds], ['is_published', '=', true], ['sale_ok', '=', true], ['rent_periodicity', '=', false]],
      ], { fields: ['name', 'list_price', 'product_variant_id'] })
    : []

  const carriers = await execute<{ id: number; name: string; fixed_price: number; x_requires_address: boolean }[]>(env, 'delivery.carrier', 'search_read', [
    [['is_published', '=', true], ['delivery_type', '=', 'fixed']],
  ], { fields: ['name', 'fixed_price', 'x_requires_address'], order: 'sequence asc, fixed_price asc, id asc' })

  const taxIds = [...new Set(templates.flatMap((t) => t.taxes_id))]
  const taxes = taxIds.length ? await execute<{ amount: number; invoice_label: string | false; name: string }[]>(env, 'account.tax', 'read', [taxIds.slice(0, 1), ['amount', 'invoice_label', 'name']]) : []

  const countries = await execute<{ id: number; name: string; code: string; phone_code: number }[]>(env, 'res.country', 'search_read', [[]], { fields: ['name', 'code', 'phone_code'], order: 'name asc' })
  const constraints = await publicRoute<{ renting_unavailabity_days: Record<string, boolean> }>(env, '/rental/product/constraints')

  const featuredCateg = Number(env.FEATURED_CATEGORY_ID)
  const products: CatalogProduct[] = templates.map((t) => {
    const vs = variants.filter((v) => v.product_tmpl_id[0] === t.id)
    const attr = ptavs.find((p) => vs[0]?.product_template_attribute_value_ids.includes(p.id))
    return {
      id: t.id,
      name: t.name,
      listPrice: t.list_price,
      displayPrice: t.display_price,
      deposit: t.x_caution || 0,
      featured: t.public_categ_ids.includes(featuredCateg),
      image: img('product.template', t.id),
      images: t.product_template_image_ids.map((id) => img('product.image', id)),
      attributeName: vs.length > 1 ? (attr?.attribute_id[1] ?? '') : '',
      variants: vs.map((v) => ({
        id: v.id,
        name: vs.length > 1 ? ptavs.filter((p) => v.product_template_attribute_value_ids.includes(p.id)).map((p) => p.name).join(', ') : '',
        displayName: v.display_name,
        ptavIds: v.product_template_attribute_value_ids,
        pickupHour: v.pickup_time,
        returnHour: v.return_time,
      })),
      optionIds: t.optional_product_ids,
    }
  })
  const options: CatalogOption[] = optionRows
    .filter((o) => o.product_variant_id)
    .map((o) => ({ id: o.id, productId: (o.product_variant_id as [number, string])[0], name: o.name, price: o.list_price, image: img('product.template', o.id, 256) }))
  const deliveryMethods: DeliveryMethod[] = carriers.map((c) => ({ id: c.id, name: c.name, price: c.fixed_price, requiresAddress: !!c.x_requires_address }))

  const value: Catalog = {
    products,
    options,
    deliveryMethods,
    tax: { rate: taxes[0]?.amount ?? 0, label: taxes[0] ? (taxes[0].invoice_label || taxes[0].name).replace('.', ',') : 'TVA' },
    forbiddenWeekdays: Object.entries(constraints.renting_unavailabity_days).filter(([, v]) => v).map(([k]) => Number(k)),
    countries: countries.map((c) => ({ id: c.id, name: c.name, code: c.code, phoneCode: c.phone_code })),
    defaultCountryId: countries.find((c) => c.code === 'FR')?.id ?? countries[0]?.id ?? 0,
  }
  catalogCache = { at: Date.now(), value }
  return value
}

// ─── Prix et disponibilités ─────────────────────────────────────

async function rentalPrice(env: Env, templateId: number, ptavIds: number[], start: string, end: string) {
  const r = await publicRoute<{ products: { price: number; price_info?: string }[] }>(env, '/website_sale/product_configurator/get_values', {
    product_template_id: templateId,
    quantity: 1,
    so_date: fmt(new Date()),
    ptav_ids: ptavIds,
    only_main_product: true,
    show_packaging: false,
    start_date: start,
    end_date: end,
  })
  return { price: r.products[0]?.price ?? 0, priceInfo: r.products[0]?.price_info ?? '' }
}

export async function availableQty(env: Env, productId: number, start: string, end: string) {
  const r = await publicRoute<{ renting_availabilities: { start: string; end: string; quantity_available: number }[] }>(env, '/rental/product/availabilities', {
    product_id: productId,
    min_date: start,
    max_date: end,
  })
  const slots = r.renting_availabilities.filter((a) => a.start < end && a.end > start)
  return slots.length ? Math.min(...slots.map((a) => a.quantity_available)) : 1
}

function isForbidden(catalog: Catalog, start: string, end: string, tz: number) {
  const weekday = (s: string) => ((new Date(toDate(s).getTime() + tz * 3_600_000).getUTCDay() + 6) % 7) + 1
  return catalog.forbiddenWeekdays.includes(weekday(start)) || catalog.forbiddenWeekdays.includes(weekday(end))
}

export async function search(env: Env, start: string, end: string): Promise<SearchResult[]> {
  const catalog = await getCatalog(env)
  const forbidden = isForbidden(catalog, start, end, Number(env.TZ_OFFSET_HOURS))
  return Promise.all(
    catalog.products.map(async (p) => {
      const [{ price, priceInfo }, variants] = await Promise.all([
        rentalPrice(env, p.id, [], start, end),
        Promise.all(p.variants.map(async (v) => ({ id: v.id, available: !forbidden && (await availableQty(env, v.id, start, end)) >= 1 }))),
      ])
      return { productId: p.id, price, priceInfo, variants, available: variants.some((v) => v.available) }
    }),
  )
}

// ─── Récapitulatif du panier ────────────────────────────────────

export function checkLines(lines: unknown): CartLine[] {
  if (!Array.isArray(lines) || lines.length === 0 || lines.length > 10) throw new HttpError(400, 'Panier invalide.')
  return lines.map((l) => {
    const { productId, qty } = l as CartLine
    if (!Number.isInteger(productId) || !Number.isInteger(qty) || qty < 1 || qty > 5) throw new HttpError(400, 'Ligne de panier invalide.')
    return { productId, qty }
  })
}

export function parseQuoteRequest(body: unknown): QuoteRequest {
  const b = (body ?? {}) as QuoteRequest
  const period = checkPeriod(b.start, b.end)
  const deliveryId = b.deliveryId == null ? null : Number(b.deliveryId)
  if (deliveryId !== null && !Number.isInteger(deliveryId)) throw new HttpError(400, 'Lieu de remise invalide.')
  return { ...period, lines: checkLines(b.lines), deliveryId }
}

export async function quote(env: Env, req: QuoteRequest): Promise<Quote> {
  const catalog = await getCatalog(env)
  const tz = Number(env.TZ_OFFSET_HOURS)
  const find = (productId: number) => {
    for (const p of catalog.products) {
      const v = p.variants.find((x) => x.id === productId)
      if (v) return { kind: 'rental' as const, product: p, variant: v }
    }
    const o = catalog.options.find((x) => x.productId === productId)
    if (o) return { kind: 'option' as const, option: o }
    throw new HttpError(400, 'Produit inconnu ou non disponible à la réservation.')
  }
  const items = req.lines.map((l) => ({ line: l, item: find(l.productId) }))
  if (!items.some((i) => i.item.kind === 'rental')) throw new HttpError(400, 'Le panier ne contient aucun véhicule.')
  const delivery = req.deliveryId == null ? null : catalog.deliveryMethods.find((d) => d.id === req.deliveryId)
  if (req.deliveryId != null && !delivery) throw new HttpError(400, 'Lieu de remise inconnu.')

  // Heures de retrait/retour imposées par le véhicule (comme la boutique Odoo)
  let { start, end } = req
  for (const { item } of items) {
    if (item.kind !== 'rental') continue
    if (item.variant.pickupHour > 0) start = atLocalHour(start, item.variant.pickupHour, tz)
    if (item.variant.returnHour > 0) end = atLocalHour(end, item.variant.returnHour, tz)
  }
  if (toDate(end) <= toDate(start)) throw new HttpError(400, 'La période de location est trop courte.')
  const forbidden = isForbidden(catalog, start, end, tz)

  const lines: QuoteLine[] = await Promise.all(
    items.map(async ({ line, item }): Promise<QuoteLine> => {
      if (item.kind === 'option') {
        return {
          kind: 'option', productId: line.productId, templateId: item.option.id, name: item.option.name, qty: line.qty, isRental: false,
          unitLabel: '', durationLabel: '', amount: round2(item.option.price * line.qty), available: true, image: item.option.image,
        }
      }
      const ptavs = item.product.variants.length > 1 ? item.variant.ptavIds : []
      const [{ price, priceInfo }, qty] = await Promise.all([rentalPrice(env, item.product.id, ptavs, start, end), availableQty(env, item.variant.id, start, end)])
      return {
        kind: 'rental', productId: line.productId, templateId: item.product.id, name: item.variant.displayName, qty: line.qty, isRental: true,
        unitLabel: item.product.displayPrice, durationLabel: priceInfo.replace(/^\/\s*/, ''), amount: round2(price * line.qty),
        available: !forbidden && qty >= line.qty, image: item.product.image,
      }
    }),
  )
  if (delivery) {
    lines.push({
      kind: 'delivery', productId: delivery.id, templateId: 0, name: delivery.name, qty: 1, isRental: false,
      unitLabel: '', durationLabel: '', amount: delivery.price, available: true, image: '',
    })
  }
  const subtotal = round2(lines.reduce((s, l) => s + l.amount, 0))
  const tax = round2((subtotal * catalog.tax.rate) / 100)
  const deposit = Math.max(0, ...items.map(({ item }) => (item.kind === 'rental' ? item.product.deposit : 0)))
  return {
    start, end, adjusted: start !== req.start || end !== req.end, lines,
    subtotal, taxLabel: catalog.tax.label, tax, total: round2(subtotal + tax), deposit, allAvailable: lines.every((l) => l.available),
  }
}
