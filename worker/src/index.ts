// Cloudflare Worker — API du site LEON Location PRO.
// Seul ce Worker connaît la clé API Odoo. Routes exposées :
//   GET  /api/catalog                 catalogue publié (véhicules, cautions, options, lieux de remise, TVA, pays)
//   GET  /api/search?start&end        prix et disponibilités pour une période
//   POST /api/quote                   récapitulatif du panier (prix Odoo, TVA, caution)
//   POST /api/checkout                crée le client + la commande, renvoie la page de paiement
//   GET  /api/order/:ref              résumé d'une commande (page de paiement, confirmation)
//   POST /api/payment/simulate        paiement simulé (mode test uniquement)
//   GET  /api/documents/:ref          documents déjà déposés
//   POST /api/documents/:ref          dépôt d'un document (permis, pièce d'identité)
//   GET  /api/health                  vérification
// Les « :ref » sont des liens signés : impossible d'accéder à la commande d'un autre client.
import type { CheckoutRequest } from '../../shared/api'
import { checkout, orderSummary, simulatePayment } from './booking'
import { documentsStatus, uploadDocument } from './documents'
import { OdooError, type Env } from './odoo'
import { getCatalog, parseQuoteRequest, quote, search } from './shop'
import { checkPeriod, HttpError, verifyRef } from './util'

function cors(env: Env, request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') ?? ''
  const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
  return allowed.includes(origin)
    ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' }
    : {}
}

async function limit(env: Env, request: Request) {
  if (!env.CHECKOUT_LIMITER) return
  const { success } = await env.CHECKOUT_LIMITER.limit({ key: request.headers.get('CF-Connecting-IP') ?? 'inconnu' })
  if (!success) throw new HttpError(429, 'Trop de tentatives, merci de réessayer dans une minute.')
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const headers = { 'Content-Type': 'application/json; charset=utf-8', ...cors(env, request) }
    const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers })
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })

    const url = new URL(request.url)
    const path = url.pathname.replace(/\/+$/, '')
    const [, , section, ref] = path.split('/') // /api/<section>/<ref>
    try {
      switch (`${request.method} ${path}`) {
        case 'GET /api/health':
          return json({ ok: true })
        case 'GET /api/catalog':
          return json(await getCatalog(env))
        case 'GET /api/search': {
          const { start, end } = checkPeriod(url.searchParams.get('start'), url.searchParams.get('end'))
          return json(await search(env, start, end))
        }
        case 'POST /api/quote':
          return json(await quote(env, parseQuoteRequest(await request.json())))
        case 'POST /api/checkout':
          await limit(env, request)
          return json(await checkout(env, (await request.json()) as CheckoutRequest))
        case 'POST /api/payment/simulate': {
          const body = (await request.json()) as { ref?: string }
          return json(await simulatePayment(env, await verifyRef(env, 'order', body.ref)))
        }
      }
      if (request.method === 'GET' && section === 'order' && ref) return json(await orderSummary(env, await verifyRef(env, 'order', ref)))
      if (section === 'documents' && ref) {
        const orderId = await verifyRef(env, 'docs', ref)
        if (request.method === 'GET') return json(await documentsStatus(env, orderId))
        if (request.method === 'POST') {
          await limit(env, request)
          return json(await uploadDocument(env, orderId, request))
        }
      }
      return json({ error: 'Route inconnue' }, 404)
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status)
      console.error(e)
      const message = e instanceof OdooError ? 'Le service de réservation est momentanément indisponible.' : 'Erreur inattendue.'
      return json({ error: message }, 502)
    }
  },
}
