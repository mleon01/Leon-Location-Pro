// Modèle de données commun au site, au mode "mock" et au futur mode "odoo".

export type Category = 'citadine' | 'compacte' | 'suv' | 'monospace' | 'utilitaire'
export type Transmission = 'manuelle' | 'automatique'
export type Fuel = 'essence' | 'diesel' | 'hybride' | 'electrique'

export interface Vehicle {
  id: string
  brand: string
  model: string
  category: Category
  color: string
  seats: number
  doors: number
  luggage: number
  transmission: Transmission
  fuel: Fuel
  airCon: boolean
  year: number
  plate: string
  mileage: number
  dailyRate: number
  deposit: number
  features: string[]
  description: string
  status: 'actif' | 'maintenance'
  /** URL d'une photo réelle (facultatif) — sinon une illustration est affichée */
  photo?: string
}

export interface Location {
  id: string
  name: string
  city: string
  address: string
  hours: string
  fee: number
  kind: 'agence' | 'aeroport' | 'livraison'
}

export interface RentalOption {
  id: string
  name: string
  description: string
  price: number
  per: 'jour' | 'location'
  maxQty: number
  icon: string
}

export interface PricingRules {
  /** Remise selon la durée (pourcentage) */
  durationDiscounts: { minDays: number; percent: number }[]
  /** Frais supplémentaires si retour dans un autre lieu */
  oneWayFee: number
  minDays: number
}

export type DepositMethod = 'tpe' | 'gando' | 'telephone'
export type PaymentMode = 'comptant' | '3x' | '4x'
export type BookingStatus = 'devis' | 'confirmee' | 'en_cours' | 'terminee'

export interface Customer {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  city: string
  licenseYear: number
  createdAt: string
}

export interface BookingOption {
  id: string
  qty: number
}

export interface Booking {
  id: string
  vehicleId: string
  customerId: string
  start: string
  end: string
  pickupLocationId: string
  returnLocationId: string
  options: BookingOption[]
  depositMethod: DepositMethod
  paymentMode: PaymentMode
  status: BookingStatus
  total: number
  createdAt: string
  notes?: string
}

export interface SearchQuery {
  start: string
  end: string
  pickupLocationId: string
  returnLocationId: string
}

export interface QuoteLine {
  label: string
  amount: number
}

export interface Quote {
  days: number
  baseRate: number
  rentalSubtotal: number
  discountPercent: number
  discountAmount: number
  lines: QuoteLine[]
  total: number
  deposit: number
}

export interface Availability {
  vehicle: Vehicle
  available: boolean
  quote: Quote
}

export interface CustomerInput {
  firstName: string
  lastName: string
  email: string
  phone: string
  birthDate: string
  licenseNumber: string
  licenseDate: string
  address: string
  city: string
  flightNumber?: string
  comment?: string
}

export interface BookingRequest {
  query: SearchQuery
  vehicleId: string
  options: BookingOption[]
  depositMethod: DepositMethod
  paymentMode: PaymentMode
  customer: CustomerInput
}

export interface BookingConfirmation {
  reference: string
  total: number
  /** En mode Odoo : lien vers le portail (paiement Stripe + signature) */
  paymentUrl?: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface DashboardStats {
  occupancyRate: number
  monthRevenue: number
  previousMonthRevenue: number
  upcomingCount: number
  activeCount: number
  todayPickups: Booking[]
  todayReturns: Booking[]
  revenueByMonth: { month: string; revenue: number }[]
  occupancyByCategory: { category: Category; rate: number }[]
}
