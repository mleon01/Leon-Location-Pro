// Réservation : création de la commande, paiement, puis enchaînement automatique dans Odoo
//   commande confirmée (véhicule bloqué au planning Rental)
//   → facture validée et marquée payée
//   → contrat pré-rempli prêt à signer (Sign)
//   → e-mail au client : confirmation + facture + lien de dépôt des documents
import type { CheckoutRequest, CheckoutResult, CustomerInput, DepositMode, OrderSummary, PaymentMode } from '../../shared/api'
import { createSignRequest } from './contract'
import { execute, type Env } from './odoo'
import { availableQty, getCatalog, parseQuoteRequest, quote } from './shop'
import { euros, HttpError, localLabel, signRef } from './util'

const PAYMENT_LABEL: Record<PaymentMode, string> = { card: 'Carte bancaire (1×)', alma3: 'Alma 3×', alma4: 'Alma 4×' }
const DEPOSIT_LABEL: Record<DepositMode, string> = { gando: 'en ligne avec Gando', tpe: 'empreinte TPE à la remise des clés' }

const isSimulation = (env: Env) => (env.PAYMENT_MODE || 'simulation') === 'simulation'

// ─── Identifiants Odoo retrouvés par leur nom (mis en cache) ───

const idCache = new Map<string, number | null>()
async function lookup(env: Env, model: string, domain: unknown[]): Promise<number | null> {
  const key = model + JSON.stringify(domain)
  if (!idCache.has(key)) {
    const [id] = await execute<number[]>(env, model, 'search', [domain], { limit: 1 })
    idCache.set(key, id ?? null)
  }
  return idCache.get(key)!
}
const odooIds = (env: Env) => ({
  testSaleJournal: () => lookup(env, 'account.journal', [['code', '=', 'TST']]),
  testBankJournal: () => lookup(env, 'account.journal', [['code', '=', 'TSTB']]),
  confirmationTemplate: () => lookup(env, 'mail.template', [['name', '=', 'LEON — Réservation confirmée + facture']]),
  contractsFolder: () => lookup(env, 'documents.document', [['type', '=', 'folder'], ['name', '=', 'Location — Contrats signés']]),
})

const note = (env: Env, orderId: number, body: string) =>
  execute(env, 'sale.order', 'message_post', [[orderId]], { body, message_type: 'comment', subtype_xmlid: 'mail.mt_note' }).catch(() => null)

// ─── Validation du formulaire ───

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
function checkCustomer(c: unknown): CustomerInput {
  const x = (c ?? {}) as Record<string, unknown>
  const str = (k: string, label: string, required = true, max = 120) => {
    const v = typeof x[k] === 'string' ? (x[k] as string).trim() : ''
    if (required && !v) throw new HttpError(400, `Merci de renseigner : ${label}.`)
    if (v.length > max) throw new HttpError(400, `${label} : texte trop long.`)
    return v
  }
  if (x.website) throw new HttpError(400, 'Requête refusée.')
  const civility = x.civility === 'Mme' ? 'Mme' : x.civility === 'M.' ? 'M.' : null
  if (!civility) throw new HttpError(400, 'Merci de choisir votre civilité.')
  const email = str('email', 'e-mail')
  if (!EMAIL.test(email)) throw new HttpError(400, 'Adresse e-mail invalide.')
  const countryId = Number(x.countryId)
  if (!Number.isInteger(countryId) || countryId <= 0) throw new HttpError(400, 'Merci de choisir votre pays.')
  return {
    civility, firstName: str('firstName', 'prénom', true, 60), lastName: str('lastName', 'nom', true, 60), email, phone: str('phone', 'téléphone', true, 30),
    street: str('street', 'adresse'), street2: str('street2', 'complément d\'adresse', false), zip: str('zip', 'code postal', true, 12), city: str('city', 'ville', true, 60), countryId,
  }
}

// ─── 1. Création de la commande (avant paiement) ───

export async function checkout(env: Env, body: CheckoutRequest): Promise<CheckoutResult> {
  const req = parseQuoteRequest(body)
  if (req.deliveryId == null) throw new HttpError(400, 'Merci de choisir le lieu de remise du véhicule.')
  if (body.acceptTerms !== true) throw new HttpError(400, 'Merci d\'accepter les conditions générales de vente.')
  const depositMode: DepositMode = body.depositMode === 'tpe' ? 'tpe' : body.depositMode === 'gando' ? 'gando' : (() => { throw new HttpError(400, 'Merci de choisir le mode de dépôt de la caution.') })()
  const paymentMode = body.paymentMode
  if (!(paymentMode in PAYMENT_LABEL)) throw new HttpError(400, 'Mode de paiement invalide.')
  const customer = checkCustomer(body.customer)

  const catalog = await getCatalog(env)
  const delivery = catalog.deliveryMethods.find((d) => d.id === req.deliveryId)!
  const deliveryDetail = (body.deliveryDetail ?? '').trim().slice(0, 300)
  if (delivery?.requiresAddress && deliveryDetail.length < 5) throw new HttpError(400, 'Merci de préciser l\'adresse de livraison du véhicule.')

  const q = await quote(env, req)
  if (!q.allAvailable) throw new HttpError(409, "Désolé, un véhicule de votre panier n'est plus disponible sur ces dates.")
  if (!isSimulation(env)) throw new HttpError(503, 'Le paiement en ligne n\'est pas encore activé.')

  const partnerId = await execute<number>(env, 'res.partner', 'create', [{
    name: `${customer.civility} ${customer.firstName} ${customer.lastName}`,
    email: customer.email, phone: customer.phone, street: customer.street, street2: customer.street2 || false,
    zip: customer.zip, city: customer.city, country_id: customer.countryId,
  }])
  const orderId = await execute<number>(env, 'sale.order', 'create', [{
    partner_id: partnerId,
    is_rental_order: true,
    website_id: Number(env.WEBSITE_ID),
    rental_start_date: q.start,
    rental_return_date: q.end,
    x_caution_amount: q.deposit,
    x_caution_mode: depositMode,
    x_payment_mode: paymentMode,
    x_lieu_detail: deliveryDetail || false,
    x_docs_status: 'missing',
    order_line: q.lines.filter((l) => l.kind !== 'delivery').map((l) => [0, 0, { product_id: l.productId, product_uom_qty: l.qty, ...(l.isRental ? { is_rental: true } : {}) }]),
  }])

  // Lieu de remise = mode de livraison Odoo (ajoute la ligne « livraison » avec son prix)
  const wizard = await execute<number>(env, 'choose.delivery.carrier', 'create', [{ order_id: orderId, partner_id: partnerId, carrier_id: delivery.id, delivery_price: delivery.price }])
  await execute(env, 'choose.delivery.carrier', 'button_confirm', [[wizard]])

  const docsRef = await signRef(env, 'docs', orderId)
  await execute(env, 'sale.order', 'write', [[orderId], { x_documents_url: `${env.SITE_URL}/#/documents/${docsRef}` }])
  const [order] = await execute<{ name: string; amount_total: number }[]>(env, 'sale.order', 'read', [[orderId], ['name', 'amount_total']])

  // Plus tard : création de la session Stripe ou Alma ici. En test : page de paiement simulée du site.
  const orderRef = await signRef(env, 'order', orderId)
  return { orderName: order.name, amountTotal: order.amount_total, paymentUrl: `${env.SITE_URL}/#/paiement/${orderRef}` }
}

// ─── 2. Résumé d'une commande (page de paiement et confirmation) ───

interface OdooOrder {
  id: number
  name: string
  state: string
  amount_total: number
  partner_id: [number, string]
  rental_start_date: string
  rental_return_date: string
  x_payment_mode: PaymentMode | false
  x_caution_mode: DepositMode | false
  x_caution_amount: number
  x_lieu_detail: string | false
  x_documents_url: string | false
  carrier_id: [number, string] | false
  order_line: number[]
}

const ORDER_FIELDS = ['name', 'state', 'amount_total', 'partner_id', 'rental_start_date', 'rental_return_date', 'x_payment_mode', 'x_caution_mode', 'x_caution_amount', 'x_lieu_detail', 'x_documents_url', 'carrier_id', 'order_line']

async function readOrder(env: Env, orderId: number): Promise<OdooOrder> {
  const [o] = await execute<OdooOrder[]>(env, 'sale.order', 'read', [[orderId], ORDER_FIELDS])
  if (!o) throw new HttpError(404, 'Réservation introuvable.')
  return o
}

/** Nom sans la civilité : « M. Jean Payet » → « Jean Payet » */
const withoutCivility = (name: string) => name.replace(/^(M\.|Mme)\s+/, '')

export async function orderSummary(env: Env, orderId: number): Promise<OrderSummary> {
  const o = await readOrder(env, orderId)
  const [partner] = await execute<{ email: string }[]>(env, 'res.partner', 'read', [[o.partner_id[0]], ['email']])
  return {
    orderId: o.id,
    orderName: o.name,
    amountTotal: o.amount_total,
    paymentMode: o.x_payment_mode || 'card',
    depositMode: o.x_caution_mode || 'tpe',
    depositAmount: o.x_caution_amount,
    paid: o.state === 'sale',
    customerFirstName: withoutCivility(o.partner_id[1]).split(' ')[0],
    email: partner?.email ?? '',
    documentsUrl: o.x_documents_url || '',
    simulation: isSimulation(env),
  }
}

// ─── 3. Paiement reçu → confirmation, facture, contrat, e-mail ───

export async function simulatePayment(env: Env, orderId: number): Promise<OrderSummary> {
  if (!isSimulation(env)) throw new HttpError(403, 'Paiement simulé désactivé.')
  await finalize(env, orderId)
  return orderSummary(env, orderId)
}

/** Appelé une fois le paiement validé (simulation aujourd'hui, Stripe/Alma demain). Sans effet si déjà fait. */
export async function finalize(env: Env, orderId: number) {
  const o = await readOrder(env, orderId)
  if (o.state === 'sale') return
  if (!['draft', 'sent'].includes(o.state)) throw new HttpError(409, 'Cette réservation ne peut plus être payée.')
  const ids = odooIds(env)
  const tz = Number(env.TZ_OFFSET_HOURS)

  // Dernière vérification de disponibilité (deux clients sur le même véhicule)
  const lines = await execute<{ id: number; product_id: [number, string]; product_uom_qty: number; is_rental: boolean; is_delivery: boolean; name: string }[]>(
    env, 'sale.order.line', 'read', [o.order_line, ['product_id', 'product_uom_qty', 'is_rental', 'is_delivery', 'name']],
  )
  for (const l of lines.filter((x) => x.is_rental)) {
    if ((await availableQty(env, l.product_id[0], o.rental_start_date, o.rental_return_date)) < l.product_uom_qty) {
      await note(env, orderId, 'Paiement reçu mais véhicule devenu indisponible : remboursement à prévoir.')
      throw new HttpError(409, "Le véhicule vient d'être réservé par un autre client. Vous ne serez pas débité.")
    }
  }

  // a) Confirmation → le véhicule est bloqué dans le planning Rental
  await execute(env, 'sale.order', 'action_confirm', [[orderId]])

  // b) Facture → validée → paiement enregistré
  const ctx = { active_model: 'sale.order', active_ids: [orderId], active_id: orderId }
  const wizard = await execute<number>(env, 'sale.advance.payment.inv', 'create', [{ advance_payment_method: 'delivered', sale_order_ids: [[6, 0, [orderId]]] }], { context: ctx })
  await execute(env, 'sale.advance.payment.inv', 'create_invoices', [[wizard]], { context: ctx })
  const [{ invoice_ids }] = await execute<{ invoice_ids: number[] }[]>(env, 'sale.order', 'read', [[orderId], ['invoice_ids']])
  const invoiceId = Math.max(...invoice_ids)
  if (isSimulation(env)) {
    const journal = await ids.testSaleJournal()
    if (journal) await execute(env, 'account.move', 'write', [[invoiceId], { journal_id: journal }])
  }
  await execute(env, 'account.move', 'action_post', [[invoiceId]])
  const payCtx = { active_model: 'account.move', active_ids: [invoiceId], active_id: invoiceId }
  const bank = isSimulation(env) ? await ids.testBankJournal() : null
  const register = await execute<number>(env, 'account.payment.register', 'create', [bank ? { journal_id: bank } : {}], { context: payCtx })
  await execute(env, 'account.payment.register', 'action_create_payments', [[register]], { context: payCtx })
  const mode = o.x_payment_mode || 'card'
  await note(env, orderId, `${isSimulation(env) ? 'Paiement SIMULÉ' : 'Paiement reçu'} : ${euros(o.amount_total)} — ${PAYMENT_LABEL[mode]}.`)

  // c) Contrat pré-rempli, prêt à signer sur la tablette (une erreur ici ne bloque pas la réservation)
  try {
    const [partner] = await execute<{ name: string; email: string; phone: string; contact_address: string }[]>(env, 'res.partner', 'read', [[o.partner_id[0]], ['name', 'email', 'phone', 'contact_address']])
    const rental = lines.find((l) => l.is_rental)
    const lots = rental ? await execute<{ name: string }[]>(env, 'stock.lot', 'search_read', [[['product_id', '=', rental.product_id[0]]]], { fields: ['name'] }) : []
    const sign = await createSignRequest(env, {
      orderId,
      orderName: o.name,
      customerPartnerId: o.partner_id[0],
      folderId: await ids.contractsFolder(),
      data: {
        orderName: o.name,
        customer: { name: partner.name, email: partner.email, phone: partner.phone || '', address: partner.contact_address.replace(/\s*\n\s*/g, ', ').replace(/^[^,]*,\s*/, '') },
        vehicle: rental?.product_id[1] ?? '',
        plate: lots.length === 1 ? lots[0].name : 'Attribuée à la remise des clés',
        start: localLabel(o.rental_start_date, tz),
        end: localLabel(o.rental_return_date, tz),
        pickupPlace: [o.carrier_id ? o.carrier_id[1] : '', o.x_lieu_detail || ''].filter(Boolean).join(' — '),
        options: lines.filter((l) => !l.is_rental && !l.is_delivery).map((l) => (l.product_uom_qty > 1 ? `${l.product_id[1]} × ${l.product_uom_qty}` : l.product_id[1])),
        total: euros(o.amount_total),
        paymentMode: PAYMENT_LABEL[mode],
        deposit: euros(o.x_caution_amount),
        depositMode: DEPOSIT_LABEL[o.x_caution_mode || 'tpe'],
      },
    })
    await execute(env, 'sale.order', 'write', [[orderId], { x_sign_request_id: sign.requestId, x_contract_url: sign.customerUrl }])
    await note(env, orderId, 'Contrat de location pré-rempli et prêt à signer. Le jour J, sur la tablette : ouvrir le contrat, compléter l\'état des lieux et signer, puis faire signer le client (lien « Faire signer le client » dans l\'onglet Réservation en ligne).')
  } catch (e) {
    console.error('contrat', e)
    await note(env, orderId, `Le contrat n'a pas pu être préparé automatiquement : ${e instanceof Error ? e.message : e}`)
  }

  // d) E-mail au client : confirmation + facture + lien de dépôt des documents
  const template = await ids.confirmationTemplate()
  if (template) {
    await execute(env, 'mail.template', 'send_mail', [[template], invoiceId], { force_send: true }).catch(async (e) => {
      console.error('email', e)
      await note(env, orderId, 'L\'e-mail de confirmation n\'a pas pu être envoyé automatiquement.')
    })
  }
}
