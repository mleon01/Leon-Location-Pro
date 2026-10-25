import { addDays, format } from 'date-fns'
import type { SearchQuery } from '../types'

// La recherche (dates + lieux) voyage dans l'adresse de la page :
// on peut ainsi partager ou recharger une page de réservation.

export const TIMES = Array.from({ length: 33 }, (_, i) => {
  const h = 6 + Math.floor(i / 2)
  return `${String(h).padStart(2, '0')}:${i % 2 ? '30' : '00'}`
})

export interface SearchForm {
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  pickup: string
  dropoff: string
}

export function defaultSearch(): SearchForm {
  const today = new Date()
  return {
    startDate: format(addDays(today, 1), 'yyyy-MM-dd'),
    startTime: '10:00',
    endDate: format(addDays(today, 5), 'yyyy-MM-dd'),
    endTime: '10:00',
    pickup: 'aeroport',
    dropoff: 'aeroport',
  }
}

export function formToParams(f: SearchForm) {
  return new URLSearchParams({
    debut: `${f.startDate}T${f.startTime}`,
    fin: `${f.endDate}T${f.endTime}`,
    retrait: f.pickup,
    retour: f.dropoff,
  })
}

export function paramsToForm(p: URLSearchParams): SearchForm | null {
  const debut = p.get('debut')
  const fin = p.get('fin')
  if (!debut || !fin) return null
  const [startDate, startTime] = debut.split('T')
  const [endDate, endTime] = fin.split('T')
  return { startDate, startTime, endDate, endTime, pickup: p.get('retrait') ?? 'aeroport', dropoff: p.get('retour') ?? p.get('retrait') ?? 'aeroport' }
}

export function formToQuery(f: SearchForm): SearchQuery {
  return {
    start: new Date(`${f.startDate}T${f.startTime}`).toISOString(),
    end: new Date(`${f.endDate}T${f.endTime}`).toISOString(),
    pickupLocationId: f.pickup,
    returnLocationId: f.dropoff,
  }
}

export function validateSearch(f: SearchForm): string | null {
  const start = new Date(`${f.startDate}T${f.startTime}`)
  const end = new Date(`${f.endDate}T${f.endTime}`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'Merci de choisir vos dates.'
  if (start.getTime() < Date.now() + 2 * 3_600_000) return 'Le retrait doit avoir lieu au moins 2 heures à l’avance.'
  if (end <= start) return 'La date de retour doit être après la date de retrait.'
  return null
}
