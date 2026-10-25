// ─────────────────────────────────────────────────────────────
//  COUCHE UNIQUE D'ACCÈS AUX DONNÉES
//  Toutes les pages passent par `data` : elles ne savent pas si les
//  informations viennent des fichiers de démonstration ou d'Odoo.
// ─────────────────────────────────────────────────────────────
import { DATA_SOURCE } from '../config'
import type {
  Availability,
  Booking,
  BookingConfirmation,
  BookingOption,
  BookingRequest,
  ChatMessage,
  Customer,
  DashboardStats,
  Location,
  PricingRules,
  Quote,
  RentalOption,
  SearchQuery,
  Vehicle,
} from '../types'
import { mockProvider } from './mockProvider'
import { odooProvider } from './odooProvider'

export interface DataProvider {
  // — Partie publique —
  getVehicles(): Promise<Vehicle[]>
  getVehicle(id: string): Promise<Vehicle | undefined>
  getLocations(): Promise<Location[]>
  getOptions(): Promise<RentalOption[]>
  getPricingRules(): Promise<PricingRules>
  searchAvailability(query: SearchQuery): Promise<Availability[]>
  getQuote(query: SearchQuery, vehicleId: string, options: BookingOption[]): Promise<Quote>
  createBooking(request: BookingRequest): Promise<BookingConfirmation>
  askAssistant(history: ChatMessage[]): Promise<string>

  // — Espace administrateur —
  getBookings(): Promise<Booking[]>
  getBooking(id: string): Promise<Booking | undefined>
  getCustomers(): Promise<Customer[]>
  getDashboardStats(): Promise<DashboardStats>
}

export const data: DataProvider = DATA_SOURCE === 'odoo' ? odooProvider : mockProvider
