import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { BookingStatus, Category, DepositMethod, Fuel, PaymentMode } from '../types'

const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const eurCents = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })

export const money = (n: number) => (Number.isInteger(n) ? eur.format(n) : eurCents.format(n))

export const fmtDate = (iso: string, pattern = 'EEE d MMM yyyy') => format(parseISO(iso), pattern, { locale: fr })
export const fmtDateTime = (iso: string) => format(parseISO(iso), "EEE d MMM 'à' HH'h'mm", { locale: fr })
export const fmtTime = (iso: string) => format(parseISO(iso), "HH'h'mm", { locale: fr })

export const categoryLabel: Record<Category, string> = {
  citadine: 'Citadine',
  compacte: 'Compacte',
  suv: 'SUV & 4x4',
  monospace: 'Monospace & 9 places',
  utilitaire: 'Utilitaire',
}

export const fuelLabel: Record<Fuel, string> = {
  essence: 'Essence',
  diesel: 'Diesel',
  hybride: 'Hybride',
  electrique: 'Électrique',
}

export const statusLabel: Record<BookingStatus, string> = {
  devis: 'Devis',
  confirmee: 'Confirmée',
  en_cours: 'En cours',
  terminee: 'Terminée',
}

export const statusStyle: Record<BookingStatus, string> = {
  devis: 'bg-amber-100 text-amber-800',
  confirmee: 'bg-brand-100 text-brand-800',
  en_cours: 'bg-emerald-100 text-emerald-800',
  terminee: 'bg-slate-100 text-slate-600',
}

export const depositLabel: Record<DepositMethod, string> = {
  tpe: 'Pré-autorisation carte au retrait (TPE)',
  gando: 'Caution en ligne via Gando',
  telephone: 'Caution par téléphone',
}

export const paymentLabel: Record<PaymentMode, string> = {
  comptant: 'Paiement comptant',
  '3x': 'Paiement en 3 fois',
  '4x': 'Paiement en 4 fois',
}

export const plural = (n: number, one: string, many = one + 's') => `${n} ${n > 1 ? many : one}`
