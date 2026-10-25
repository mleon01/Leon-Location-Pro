// Cloudflare Worker — API du site LEON Location PRO.
// Seul ce Worker connaît la clé API Odoo. Il n'expose que 5 routes :
//   GET  /api/catalog            catalogue publié (véhicules, options, TVA, pays)
//   GET  /api/search?start&end   prix et disponibilités pour une période
//   POST /api/quote              récapitulatif du panier (prix Odoo, TVA)
//   POST /api/checkout           crée le client + le devis de location, renvoie le lien de paiement
//   GET  /api/health             vérification
import type { Catalog, CatalogOption, CatalogProduct, CartLine, CheckoutRequest, CheckoutResult, CustomerInput, Quote, QuoteLine, SearchResult } from '../../shared/api'
import { execute, OdooError, publicRoute, type Env } from './odoo'

// ─── Utilitaires ───────────────────────────────────────────────

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

const ODOO_DATE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/
const toDate = (s: string) => new Date(s.replace(' ', 'T') + 'Z')
const fmt = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ')
const round2 = (n: number) => Math.round(n * 100) / 100

function checkPeriod(start: unknown, end: unknown): { start: string; end: string } {
  if (typeof start !== 'string' || typeof end !== 'string' || !ODOO_DATE.test(start) || !ODOO_DATE.test(end)) {
    throw new HttpError(400, 'Dates invalides.')
  }
  const s = toDate(start).getTime()
  const e = toDate(end).getTime()
  if (e <= s) throw new HttpError(400, 'La date de retour doit être postérieure à la date de départ.')
  if (s < Date.now() - 3_600_000) throw new HttpError(400, 'La date de départ est déjà passée.')
  if (e - s > 366 * 86_400_000) throw new HttpError(400, 'La période de location est trop longue.')
  return { start, end }
}

/** Fixe l'heure locale (fuseau de La Réunion) d'une date UTC. */
function atLocalHour(utc: string, hour: number, tz: number) {
  const local = new Date(toDate(utc).getTime() + tz * 3_600_000)
  const ms = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) + (hour - tz) * 3_600_000
  return fmt(new Date(ms))
}

// ─── Catalogue (mis en cache 2 minutes) ─────────────────────────

interface OdooTemplate {
  id: number
  name: string
  list_price: number
  display_price: string
  product_variant_ids: number[]
  public_categ_ids: number[]
  optional_product_ids: number[]
  product_template_image_ids: number[]
  taxes_id: number[]
}

let catalogCache: { at: number; value: Catalog } | undefined

async function getCatalog(env: Env): Promise<Catalog> {
  if (catalogCache && Date.now() - catalogCache.at < 120_000) return catalogCache.value
  const img = (model: string, id: number, size = 1024) => `${env.ODOO_URL}/web/image/${model}/${id}/image_${size}`

  const templates = await execute<OdooTemplate[]>(env, 'product.template', 'search_read', [
    [['rent_periodicity', '!=', false], ['is_published', '=', true], ['sale_ok', '=', true]],
  ], {
    fields: ['name', 'list_price', 'display_price', 'product_variant_ids', 'public_categ_ids', 'optional_product_ids', 'product_template_image_ids', 'taxes_id'],
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

  const value: Catalog = {
    products,
    options,
    tax: { rate: taxes[0]?.amount ?? 0, label: taxes[0] ? (taxes[0].invoice_label || taxes[0].name).replace('.', ',') : 'TVA' },
    forbiddenWeekdays: Object.entries(constraints.renting_unavailabity_days).filter(([, v]) => v).map(([k]) => Number(k)),
    countries: countries.map((c) => ({ id: c.id, name: c.name, code: c.code, phoneCode: c.phone_code })),
    defaultCountryId: countries.find((c) => c.code === 'FR')?.id ?? countries[0]?.id ?? 0,
  }
  catalogCache = { at: Date.now(), value }
  return value
}

// ─── Prix et disponibilités : routes publiques d'Odoo ───────────

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

async function availableQty(env: Env, productId: number, start: string, end: string) {
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

async function search(env: Env, start: string, end: string): Promise<SearchResult[]> {
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

// ─── Panier ─────────────────────────────────────────────────────

function checkLines(lines: unknown): CartLine[] {
  if (!Array.isArray(lines) || lines.length === 0 || lines.length > 10) throw new HttpError(400, 'Panier invalide.')
  return lines.map((l) => {
    const { productId, qty } = l as CartLine
    if (!Number.isInteger(productId) || !Number.isInteger(qty) || qty < 1 || qty > 5) throw new HttpError(400, 'Ligne de panier invalide.')
    return { productId, qty }
  })
}

async function quote(env: Env, period: { start: string; end: string }, lines: CartLine[]): Promise<Quote> {
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
  const items = lines.map((l) => ({ line: l, item: find(l.productId) }))
  if (!items.some((i) => i.item.kind === 'rental')) throw new HttpError(400, 'Le panier ne contient aucun véhicule.')

  // Heures de retrait/retour imposées par le véhicule (comme la boutique Odoo)
  let { start, end } = period
  for (const { item } of items) {
    if (item.kind !== 'rental') continue
    if (item.variant.pickupHour > 0) start = atLocalHour(start, item.variant.pickupHour, tz)
    if (item.variant.returnHour > 0) end = atLocalHour(end, item.variant.returnHour, tz)
  }
  if (toDate(end) <= toDate(start)) throw new HttpError(400, 'La période de location est trop courte.')
  const forbidden = isForbidden(catalog, start, end, tz)

  const quoteLines: QuoteLine[] = await Promise.all(
    items.map(async ({ line, item }) => {
      if (item.kind === 'option') {
        return {
          productId: line.productId, templateId: item.option.id, name: item.option.name, qty: line.qty, isRental: false,
          unitLabel: '', durationLabel: '', amount: round2(item.option.price * line.qty), available: true, image: item.option.image,
        }
      }
      const ptavs = item.product.variants.length > 1 ? item.variant.ptavIds : []
      const [{ price, priceInfo }, qty] = await Promise.all([rentalPrice(env, item.product.id, ptavs, start, end), availableQty(env, item.variant.id, start, end)])
      return {
        productId: line.productId, templateId: item.product.id, name: item.variant.displayName, qty: line.qty, isRental: true,
        unitLabel: item.product.displayPrice, durationLabel: priceInfo.replace(/^\/\s*/, ''), amount: round2(price * line.qty),
        available: !forbidden && qty >= line.qty, image: item.product.image,
      }
    }),
  )
  const subtotal = round2(quoteLines.reduce((s, l) => s + l.amount, 0))
  const tax = round2((subtotal * catalog.tax.rate) / 100)
  return {
    start, end, adjusted: start !== period.start || end !== period.end, lines: quoteLines,
    subtotal, taxLabel: catalog.tax.label, tax, total: round2(subtotal + tax), allAvailable: quoteLines.every((l) => l.available),
  }
}

// ─── Commande ───────────────────────────────────────────────────

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
function checkCustomer(c: unknown): CustomerInput {
  const x = (c ?? {}) as Record<string, unknown>
  const str = (k: string, required = true, max = 120) => {
    const v = typeof x[k] === 'string' ? (x[k] as string).trim() : ''
    if (required && !v) throw new HttpError(400, `Champ obligatoire manquant : ${k}`)
    if (v.length > max) throw new HttpError(400, `Champ trop long : ${k}`)
    return v
  }
  if (x.website) throw new HttpError(400, 'Requête refusée.')
  const civility = x.civility === 'Mme' ? 'Mme' : x.civility === 'M.' ? 'M.' : null
  if (!civility) throw new HttpError(400, 'Civilité invalide.')
  const email = str('email')
  if (!EMAIL.test(email)) throw new HttpError(400, 'Adresse e-mail invalide.')
  const countryId = Number(x.countryId)
  if (!Number.isInteger(countryId) || countryId <= 0) throw new HttpError(400, 'Pays invalide.')
  return {
    civility, firstName: str('firstName', true, 60), lastName: str('lastName', true, 60), email, phone: str('phone', true, 30),
    street: str('street'), street2: str('street2', false), zip: str('zip', true, 12), city: str('city', true, 60), countryId,
  }
}

async function checkout(env: Env, body: CheckoutRequest): Promise<CheckoutResult> {
  const period = checkPeriod(body.start, body.end)
  const customer = checkCustomer(body.customer)
  const q = await quote(env, period, checkLines(body.lines))
  if (!q.allAvailable) throw new HttpError(409, "Désolé, un véhicule de votre panier n'est plus disponible sur ces dates.")

  const partnerId = await execute<number>(env, 'res.partner', 'create', [{
    name: `${customer.civility} ${customer.firstName} ${customer.lastName}`,
    email: customer.email,
    phone: customer.phone,
    street: customer.street,
    street2: customer.street2 || false,
    zip: customer.zip,
    city: customer.city,
    country_id: customer.countryId,
  }])
  const orderId = await execute<number>(env, 'sale.order', 'create', [{
    partner_id: partnerId,
    is_rental_order: true,
    website_id: Number(env.WEBSITE_ID),
    rental_start_date: q.start,
    rental_return_date: q.end,
    order_line: q.lines.map((l) => [0, 0, { product_id: l.productId, product_uom_qty: l.qty, ...(l.isRental ? { is_rental: true } : {}) }]),
  }])
  const [order] = await execute<{ name: string; amount_total: number }[]>(env, 'sale.order', 'read', [[orderId], ['name', 'amount_total']])
  const portalPath = await execute<string>(env, 'sale.order', 'get_portal_url', [[orderId]])
  return { orderName: order.name, amountTotal: order.amount_total, paymentUrl: env.ODOO_URL + portalPath }
}

// ─── Routeur HTTP ───────────────────────────────────────────────

function cors(env: Env, request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') ?? ''
  const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
  return allowed.includes(origin)
    ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' }
    : {}
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const headers = { 'Content-Type': 'application/json; charset=utf-8', ...cors(env, request) }
    const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers })
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })

    const url = new URL(request.url)
    try {
      const route = `${request.method} ${url.pathname.replace(/\/+$/, '')}`
      switch (route) {
        case 'GET /api/health':
          return json({ ok: true })
        case 'GET /api/catalog':
          return json(await getCatalog(env))
        case 'GET /api/search': {
          const { start, end } = checkPeriod(url.searchParams.get('start'), url.searchParams.get('end'))
          return json(await search(env, start, end))
        }
        case 'POST /api/quote': {
          const body = (await request.json()) as { start: string; end: string; lines: CartLine[] }
          return json(await quote(env, checkPeriod(body.start, body.end), checkLines(body.lines)))
        }
        case 'POST /api/checkout': {
          if (env.CHECKOUT_LIMITER) {
            const { success } = await env.CHECKOUT_LIMITER.limit({ key: request.headers.get('CF-Connecting-IP') ?? 'inconnu' })
            if (!success) throw new HttpError(429, 'Trop de tentatives, merci de réessayer dans une minute.')
          }
          return json(await checkout(env, (await request.json()) as CheckoutRequest))
        }
        default:
          return json({ error: 'Route inconnue' }, 404)
      }
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status)
      console.error(e)
      const message = e instanceof OdooError ? 'Le service de réservation est momentanément indisponible.' : 'Erreur inattendue.'
      return json({ error: message }, 502)
    }
  },
}
