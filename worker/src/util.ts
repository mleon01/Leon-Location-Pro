// Utilitaires communs du Worker : erreurs HTTP, dates, liens signés.
import type { Env } from './odoo'

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export const ODOO_DATE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/
export const toDate = (s: string) => new Date(s.replace(' ', 'T') + 'Z')
export const fmt = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ')
export const round2 = (n: number) => Math.round(n * 100) / 100

export function checkPeriod(start: unknown, end: unknown): { start: string; end: string } {
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
export function atLocalHour(utc: string, hour: number, tz: number) {
  const local = new Date(toDate(utc).getTime() + tz * 3_600_000)
  const ms = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) + (hour - tz) * 3_600_000
  return fmt(new Date(ms))
}

/** « 16/11/2026 à 09h00 » (heure de La Réunion) */
export function localLabel(utc: string, tz: number) {
  const d = new Date(toDate(utc).getTime() + tz * 3_600_000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} à ${p(d.getUTCHours())}h${p(d.getUTCMinutes())}`
}

export const euros = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n).replace(/ /g, ' ')

// ─── Liens signés ──────────────────────────────────────────────
// Un lien de dépôt de documents ou de paiement contient l'id de la commande
// et une signature HMAC : impossible de deviner le lien d'une autre commande.

type Purpose = 'order' | 'docs'

async function hmac(secret: string, message: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return [...new Uint8Array(sig)].slice(0, 20).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function signRef(env: Env, purpose: Purpose, orderId: number) {
  if (!env.SIGNING_SECRET) throw new HttpError(500, 'SIGNING_SECRET manquant dans la configuration du Worker.')
  return `${orderId}.${await hmac(env.SIGNING_SECRET, `${purpose}:${orderId}`)}`
}

export async function verifyRef(env: Env, purpose: Purpose, ref: string | null | undefined): Promise<number> {
  const m = /^(\d{1,9})\.([0-9a-f]{40})$/.exec(ref ?? '')
  if (!m || !env.SIGNING_SECRET) throw new HttpError(404, 'Lien invalide ou expiré.')
  const expected = await hmac(env.SIGNING_SECRET, `${purpose}:${m[1]}`)
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ m[2].charCodeAt(i)
  if (diff !== 0) throw new HttpError(404, 'Lien invalide ou expiré.')
  return Number(m[1])
}

export function toBase64(bytes: Uint8Array) {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}
