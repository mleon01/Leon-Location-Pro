// Mode "odoo" : toutes les requêtes passent par le Cloudflare Worker,
// qui détient la clé API. Le navigateur ne voit jamais de clé.
import { WORKER_URL } from '../config'
import type { DataProvider } from './provider'

async function api<T>(path: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${WORKER_URL}${path}`, body === undefined ? undefined : body instanceof FormData
      ? { method: 'POST', body }
      : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  } catch {
    throw new Error('Impossible de joindre le service de réservation. Vérifiez votre connexion.')
  }
  const json = (await res.json().catch(() => null)) as (T & { error?: string }) | null
  if (!res.ok || !json) throw new Error(json?.error ?? `Erreur du service de réservation (${res.status})`)
  return json
}

let catalogPromise: ReturnType<DataProvider['getCatalog']> | undefined

export const odooProvider: DataProvider = {
  getCatalog: () => (catalogPromise ??= api<Awaited<ReturnType<DataProvider['getCatalog']>>>('/catalog').catch((e) => {
    catalogPromise = undefined
    throw e
  })),
  search: (start, end) => api(`/search?${new URLSearchParams({ start, end })}`),
  quote: (request) => api('/quote', request),
  checkout: (request) => api('/checkout', request),
  getOrder: (ref) => api(`/order/${encodeURIComponent(ref)}`),
  simulatePayment: (ref) => api('/payment/simulate', { ref }),
  getDocuments: (ref) => api(`/documents/${encodeURIComponent(ref)}`),
  uploadDocument: (ref, kind, file) => {
    const form = new FormData()
    form.append('kind', kind)
    form.append('file', file)
    return api(`/documents/${encodeURIComponent(ref)}`, form)
  },
}
