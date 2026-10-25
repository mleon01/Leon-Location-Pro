// Implémentation "mock" : lit les fichiers JSON de démonstration.
// Aucune donnée réelle. Les réservations faites sur le site de test sont
// gardées uniquement dans le navigateur du visiteur (localStorage).
import { addDays, endOfMonth, format, isSameDay, startOfDay, startOfMonth, subMonths } from 'date-fns'
import { fr } from 'date-fns/locale'
import type {
  Booking,
  BookingStatus,
  Category,
  Customer,
  DashboardStats,
  Location,
  PricingRules,
  RentalOption,
  Vehicle,
} from '../types'
import { computeQuote, overlaps } from '../lib/pricing'
import type { DataProvider } from './provider'
import vehiclesJson from './mock/vehicles.json'
import locationsJson from './mock/locations.json'
import optionsJson from './mock/options.json'
import pricingJson from './mock/pricing.json'
import customersJson from './mock/customers.json'
import bookingsJson from './mock/bookings.json'

const vehicles = vehiclesJson as Vehicle[]
const locations = locationsJson as Location[]
const options = optionsJson as RentalOption[]
const rules = pricingJson as PricingRules
const baseCustomers = customersJson as Customer[]

/** Réservations du fichier JSON : jours relatifs à aujourd'hui (0 = aujourd'hui). */
interface RelativeBooking extends Omit<Booking, 'start' | 'end' | 'createdAt' | 'total' | 'status'> {
  startDay: number
  startTime: string
  endDay: number
  endTime: string
  createdDay: number
  status: 'devis' | 'confirmee'
}

const STORAGE_KEY = 'llp-demo-data'
const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms + Math.random() * 200))

function at(dayOffset: number, time = '00:00') {
  const [h, m] = time.split(':').map(Number)
  const d = addDays(startOfDay(new Date()), dayOffset)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

/** Statut calculé selon la date du jour (sauf les devis). */
function liveStatus(b: Pick<Booking, 'start' | 'end' | 'status'>): BookingStatus {
  if (b.status === 'devis') return 'devis'
  const now = new Date()
  if (now < new Date(b.start)) return 'confirmee'
  if (now <= new Date(b.end)) return 'en_cours'
  return 'terminee'
}

function quoteTotal(b: Omit<Booking, 'total' | 'status' | 'createdAt' | 'id' | 'customerId'>) {
  const vehicle = vehicles.find((v) => v.id === b.vehicleId)!
  return computeQuote({
    vehicle,
    start: b.start,
    end: b.end,
    pickup: locations.find((l) => l.id === b.pickupLocationId),
    dropoff: locations.find((l) => l.id === b.returnLocationId),
    options: b.options,
    catalog: options,
    rules,
  }).total
}

const seedBookings: Booking[] = (bookingsJson as RelativeBooking[]).map(
  ({ startDay, startTime, endDay, endTime, createdDay, ...rest }) => {
    const b = { ...rest, start: at(startDay, startTime), end: at(endDay, endTime), createdAt: at(createdDay, '10:00') }
    return { ...b, total: quoteTotal(b) }
  },
)

// — Données ajoutées depuis le site de démonstration (navigateur uniquement) —
interface LocalData {
  bookings: Booking[]
  customers: Customer[]
}
function loadLocal(): LocalData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as LocalData
  } catch {
    /* stockage indisponible : on continue sans */
  }
  return { bookings: [], customers: [] }
}
function saveLocal(d: LocalData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d))
  } catch {
    /* ignoré */
  }
}

function allBookings(): Booking[] {
  return [...seedBookings, ...loadLocal().bookings].map((b) => ({ ...b, status: liveStatus(b) }))
}
const allCustomers = () => [...baseCustomers, ...loadLocal().customers]

/** Réservations qui bloquent un véhicule (les devis ne bloquent pas). */
const blocking = (b: Booking) => b.status !== 'devis'

function isAvailable(vehicleId: string, start: string, end: string) {
  const v = vehicles.find((x) => x.id === vehicleId)
  if (!v || v.status !== 'actif') return false
  return !allBookings().some((b) => b.vehicleId === vehicleId && blocking(b) && overlaps(start, end, b.start, b.end))
}

// — Assistant simulé —
const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
function fakeAssistant(question: string): string {
  const q = normalize(question)
  const has = (...words: string[]) => words.some((w) => q.includes(w))
  const cheapest = (cat: Category) =>
    Math.min(...vehicles.filter((v) => v.category === cat && v.status === 'actif').map((v) => v.dailyRate))

  if (has('annul')) return "L'annulation est **gratuite jusqu'à 24 h avant** l'heure de retrait prévue. Au-delà, la location reste due. Vous pouvez annuler depuis votre lien de réservation ou en nous appelant."
  if (has('caution', 'depot', 'franchise'))
    return 'Vous avez 3 façons de déposer la caution :\n\n• **Pré-autorisation par carte** sur notre TPE au moment du retrait (aucun débit) ;\n• **En ligne via Gando**, avant votre arrivée ;\n• **Par téléphone** avec un conseiller.\n\nLe montant dépend du véhicule (de 700 € à 1 500 €).'
  if (has('aeroport', 'roland', 'avion', 'vol'))
    return "Nous vous remettons les clés directement à **l'aéroport Roland Garros**, sans frais, de 6h à 22h. Indiquez votre numéro de vol lors de la réservation : nous suivons votre arrivée en cas de retard."
  if (has('4x4', 'piste', 'volcan', 'maido', 'cirque', 'mafate', 'fournaise'))
    return `Pour les routes des Hauts et les pistes, je vous conseille le **Dacia Duster 4x4** (à partir de ${vehicles.find((v) => v.id === 'v-duster')?.dailyRate} €/jour). Pour plus de confort, le **Toyota RAV4 Hybride** est aussi un excellent choix.`
  if (has('famille', '7 places', '9 places', 'groupe', 'enfant'))
    return `Pour voyager à plusieurs : le **Dacia Jogger 7 places** (à partir de ${cheapest('monospace')} €/jour) ou le **Renault Trafic 9 places**. Pensez aux options siège bébé et rehausseur, installés avant votre arrivée.`
  if (has('utilitaire', 'demenag', 'camion', 'van'))
    return `Nos utilitaires se conduisent avec le permis B : **Kangoo Van 3,3 m³** (à partir de ${cheapest('utilitaire')} €/jour) et **Jumper 12 m³** pour les déménagements.`
  if (has('prix', 'tarif', 'combien', 'cout', 'cher'))
    return `Voici nos prix de départ par jour :\n\n• Citadine : dès **${cheapest('citadine')} €**\n• SUV & 4x4 : dès **${cheapest('suv')} €**\n• Monospace : dès **${cheapest('monospace')} €**\n• Utilitaire : dès **${cheapest('utilitaire')} €**\n\nDégressif : −5 % dès 3 jours, −12 % dès 7 jours, −20 % dès 14 jours.`
  if (has('paiement', 'payer', 'plusieurs fois', '3x', '4x', 'carte'))
    return 'Le paiement se fait en ligne et de façon sécurisée, **comptant ou en 3 ou 4 fois sans frais**. Vous signez votre contrat électroniquement au même moment.'
  if (has('permis', 'age', 'jeune', 'conducteur'))
    return "Il faut avoir **au moins 21 ans et 2 ans de permis**. Un conducteur supplémentaire peut être ajouté pour 3 €/jour. (Conditions provisoires de la version de démonstration.)"
  if (has('dispo', 'libre', 'reserver', 'reservation'))
    return "Pour voir les véhicules disponibles, indiquez vos dates et votre lieu de retrait dans le module **Réserver** : les disponibilités s'affichent en temps réel. Bientôt, je pourrai les vérifier pour vous directement ici."
  if (has('bonjour', 'salut', 'hello', 'bonsoir'))
    return "Bonjour et bienvenue chez LEON Location PRO ! Je peux vous renseigner sur nos véhicules, nos prix, la caution ou la remise des clés à l'aéroport. Que puis-je faire pour vous ?"
  if (has('merci')) return 'Avec plaisir ! Bon séjour à La Réunion. 🌴'
  return "Je suis l'assistant de démonstration : je réponds pour l'instant aux questions sur les **prix**, la **caution**, l'**annulation**, l'**aéroport**, les **4x4** et les **véhicules familiaux**. Pour toute autre demande, contactez-nous au 0262 00 00 00."
}

// — Statistiques du tableau de bord —
const DAY = 86_400_000
function bookedDaysIn(list: Booking[], from: Date, to: Date) {
  return list.reduce((sum, b) => {
    const s = Math.max(new Date(b.start).getTime(), from.getTime())
    const e = Math.min(new Date(b.end).getTime(), to.getTime())
    return sum + Math.max(0, e - s) / DAY
  }, 0)
}
function revenueIn(list: Booking[], from: Date, to: Date) {
  return list.filter((b) => new Date(b.start) >= from && new Date(b.start) <= to).reduce((s, b) => s + b.total, 0)
}

export const mockProvider: DataProvider = {
  async getVehicles() {
    await wait()
    return vehicles
  },
  async getVehicle(id) {
    await wait(100)
    return vehicles.find((v) => v.id === id)
  },
  async getLocations() {
    return locations
  },
  async getOptions() {
    return options
  },
  async getPricingRules() {
    return rules
  },
  async searchAvailability(query) {
    await wait(500)
    const pickup = locations.find((l) => l.id === query.pickupLocationId)
    const dropoff = locations.find((l) => l.id === query.returnLocationId)
    return vehicles
      .filter((v) => v.status === 'actif')
      .map((vehicle) => ({
        vehicle,
        available: isAvailable(vehicle.id, query.start, query.end),
        quote: computeQuote({ vehicle, start: query.start, end: query.end, pickup, dropoff, rules }),
      }))
      .sort((a, b) => Number(b.available) - Number(a.available) || a.vehicle.dailyRate - b.vehicle.dailyRate)
  },
  async getQuote(query, vehicleId, selected) {
    const vehicle = vehicles.find((v) => v.id === vehicleId)
    if (!vehicle) throw new Error('Véhicule introuvable')
    return computeQuote({
      vehicle,
      start: query.start,
      end: query.end,
      pickup: locations.find((l) => l.id === query.pickupLocationId),
      dropoff: locations.find((l) => l.id === query.returnLocationId),
      options: selected,
      catalog: options,
      rules,
    })
  },
  async createBooking(req) {
    await wait(1200)
    const { query } = req
    if (!isAvailable(req.vehicleId, query.start, query.end)) {
      throw new Error("Désolé, ce véhicule vient d'être réservé sur ces dates. Merci d'en choisir un autre.")
    }
    const local = loadLocal()
    const customer: Customer = {
      id: `c-web-${Date.now()}`,
      firstName: req.customer.firstName,
      lastName: req.customer.lastName,
      email: req.customer.email,
      phone: req.customer.phone,
      city: req.customer.city,
      licenseYear: Number(req.customer.licenseDate.slice(0, 4)) || new Date().getFullYear(),
      createdAt: new Date().toISOString().slice(0, 10),
    }
    const quote = await mockProvider.getQuote(query, req.vehicleId, req.options)
    const reference = `LLP-W${String(Date.now()).slice(-5)}`
    const booking: Booking = {
      id: reference,
      vehicleId: req.vehicleId,
      customerId: customer.id,
      start: query.start,
      end: query.end,
      pickupLocationId: query.pickupLocationId,
      returnLocationId: query.returnLocationId,
      options: req.options,
      depositMethod: req.depositMethod,
      paymentMode: req.paymentMode,
      status: 'confirmee',
      total: quote.total,
      createdAt: new Date().toISOString(),
      notes: [req.customer.flightNumber && `Vol : ${req.customer.flightNumber}`, req.customer.comment].filter(Boolean).join(' — ') || undefined,
    }
    saveLocal({ bookings: [...local.bookings, booking], customers: [...local.customers, customer] })
    return { reference, total: quote.total }
  },
  async askAssistant(history) {
    await wait(700)
    const last = [...history].reverse().find((m) => m.role === 'user')
    return fakeAssistant(last?.content ?? '')
  },

  async getBookings() {
    await wait()
    return allBookings().sort((a, b) => b.start.localeCompare(a.start))
  },
  async getBooking(id) {
    await wait(100)
    return allBookings().find((b) => b.id === id)
  },
  async getCustomers() {
    await wait()
    return allCustomers()
  },
  async getDashboardStats(): Promise<DashboardStats> {
    await wait()
    const now = new Date()
    const list = allBookings().filter(blocking)
    const active = vehicles.filter((v) => v.status === 'actif')
    const mStart = startOfMonth(now)
    const mEnd = endOfMonth(now)
    const daysInMonth = Math.round((mEnd.getTime() - mStart.getTime()) / DAY)

    const occupancyByCategory = (['citadine', 'compacte', 'suv', 'monospace', 'utilitaire'] as Category[])
      .map((category) => {
        const ids = active.filter((v) => v.category === category).map((v) => v.id)
        if (!ids.length) return null
        const days = bookedDaysIn(list.filter((b) => ids.includes(b.vehicleId)), mStart, mEnd)
        return { category, rate: days / (ids.length * daysInMonth) }
      })
      .filter((x): x is { category: Category; rate: number } => x !== null)

    const revenueByMonth = Array.from({ length: 6 }, (_, i) => {
      const m = subMonths(now, 5 - i)
      return { month: format(m, 'MMM', { locale: fr }), revenue: Math.round(revenueIn(list, startOfMonth(m), endOfMonth(m))) }
    })

    return {
      occupancyRate: bookedDaysIn(list.filter((b) => active.some((v) => v.id === b.vehicleId)), mStart, mEnd) / (active.length * daysInMonth),
      monthRevenue: revenueIn(list, mStart, mEnd),
      previousMonthRevenue: revenueIn(list, startOfMonth(subMonths(now, 1)), endOfMonth(subMonths(now, 1))),
      upcomingCount: list.filter((b) => b.status === 'confirmee').length,
      activeCount: list.filter((b) => b.status === 'en_cours').length,
      todayPickups: list.filter((b) => isSameDay(new Date(b.start), now)).sort((a, b) => a.start.localeCompare(b.start)),
      todayReturns: list.filter((b) => isSameDay(new Date(b.end), now)).sort((a, b) => a.end.localeCompare(b.end)),
      revenueByMonth,
      occupancyByCategory,
    }
  },
}

// Données brutes utiles à l'admin (lecture seule)
export const mockCatalog = { vehicles, locations, options }
