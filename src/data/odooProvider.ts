// Implémentation "odoo" (phase 2) : toutes les requêtes passent par le
// Cloudflare Worker, qui détient les clés API et parle à Odoo.
// Le navigateur ne voit JAMAIS de clé : il appelle seulement WORKER_URL.
import { WORKER_URL } from '../config'
import type { DataProvider } from './provider'

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${WORKER_URL}${path}`, {
    ...init,
    credentials: 'include', // nécessaire pour Cloudflare Access sur /admin
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `Erreur serveur (${res.status})`)
  }
  return res.json() as Promise<T>
}
const post = <T>(path: string, body: unknown) => api<T>(path, { method: 'POST', body: JSON.stringify(body) })

export const odooProvider: DataProvider = {
  getVehicles: () => api('/vehicles'),
  getVehicle: (id) => api(`/vehicles/${encodeURIComponent(id)}`),
  getLocations: () => api('/locations'),
  getOptions: () => api('/options'),
  getPricingRules: () => api('/pricing'),
  searchAvailability: (query) => post('/availability', query),
  getQuote: (query, vehicleId, options) => post('/quote', { query, vehicleId, options }),
  // Crée un devis dans Odoo et renvoie l'URL du portail (paiement Stripe + signature)
  createBooking: (request) => post('/bookings', request),
  askAssistant: async (history) => (await post<{ reply: string }>('/assistant', { messages: history })).reply,

  // Routes protégées par Cloudflare Access
  getBookings: () => api('/admin/bookings'),
  getBooking: (id) => api(`/admin/bookings/${encodeURIComponent(id)}`),
  getCustomers: () => api('/admin/customers'),
  getDashboardStats: () => api('/admin/dashboard'),
}
