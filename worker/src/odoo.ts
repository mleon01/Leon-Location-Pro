// Accès à Odoo depuis le Worker.
// - publicRoute : routes JSON publiques du site Odoo (mêmes calculs que la boutique)
// - execute     : API externe (clé API), uniquement pour lire le catalogue et créer les devis

export interface Env {
  ODOO_URL: string
  ODOO_DB: string
  ODOO_LOGIN: string
  ODOO_API_KEY: string
  WEBSITE_ID: string
  FEATURED_CATEGORY_ID: string
  TZ_OFFSET_HOURS: string
  ALLOWED_ORIGINS: string
  CHECKOUT_LIMITER?: { limit(opts: { key: string }): Promise<{ success: boolean }> }
}

export class OdooError extends Error {}

let rpcId = 0
let cachedUid: number | undefined

async function jsonRpc<T>(env: Env, path: string, params: unknown): Promise<T> {
  const res = await fetch(env.ODOO_URL + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'call', id: ++rpcId, params }),
  })
  if (!res.ok) throw new OdooError(`Odoo a répondu ${res.status} sur ${path}`)
  const body = (await res.json()) as { result?: T; error?: { message: string; data?: { message?: string } } }
  if (body.error) throw new OdooError(body.error.data?.message ?? body.error.message)
  return body.result as T
}

export const publicRoute = <T>(env: Env, path: string, params: Record<string, unknown> = {}) => jsonRpc<T>(env, path, params)

async function uid(env: Env): Promise<number> {
  if (cachedUid) return cachedUid
  const id = await jsonRpc<number | false>(env, '/jsonrpc', {
    service: 'common',
    method: 'authenticate',
    args: [env.ODOO_DB, env.ODOO_LOGIN, env.ODOO_API_KEY, {}],
  })
  if (!id) throw new OdooError('Authentification Odoo refusée (vérifiez ODOO_LOGIN et ODOO_API_KEY)')
  cachedUid = id
  return id
}

export async function execute<T>(env: Env, model: string, method: string, args: unknown[], kwargs: Record<string, unknown> = {}): Promise<T> {
  return jsonRpc<T>(env, '/jsonrpc', {
    service: 'object',
    method: 'execute_kw',
    args: [env.ODOO_DB, await uid(env), env.ODOO_API_KEY, model, method, args, kwargs],
  })
}
