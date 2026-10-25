// Dates au fuseau de La Réunion (UTC+4, sans heure d'été), comme le site Odoo.
// Odoo échange les dates en UTC au format "AAAA-MM-JJ HH:MM:SS".

export const TZ_OFFSET = 4
export const TZ_NAME = 'Indian/Reunion'

const pad = (n: number) => String(n).padStart(2, '0')

/** Date + heure locales (Réunion) → chaîne Odoo UTC */
export function toOdoo(date: string, time: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const [h, min] = time.split(':').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d, h - TZ_OFFSET, min))
  return utc.toISOString().slice(0, 19).replace('T', ' ')
}

/** Chaîne Odoo UTC → { date: AAAA-MM-JJ, time: HH:MM } locales */
export function fromOdoo(s: string): { date: string; time: string } {
  const local = new Date(new Date(s.replace(' ', 'T') + 'Z').getTime() + TZ_OFFSET * 3_600_000)
  return {
    date: `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`,
    time: `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`,
  }
}

/** Affichage façon Odoo : 16/11/2026 09:00:00 */
export function displayOdoo(s: string): string {
  const { date, time } = fromOdoo(s)
  const [y, m, d] = date.split('-')
  return `${d}/${m}/${y} ${time}:00`
}

/** Affichage ISO local : 2026-11-16 09:00:00 */
export function displayIsoLocal(s: string): string {
  const { date, time } = fromOdoo(s)
  return `${date} ${time}:00`
}

export function todayLocal(): string {
  return fromOdoo(new Date().toISOString().slice(0, 19).replace('T', ' ')).date
}

export function currentLocalHour(): number {
  return Number(fromOdoo(new Date().toISOString().slice(0, 19).replace('T', ' ')).time.slice(0, 2))
}
