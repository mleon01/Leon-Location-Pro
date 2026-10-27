// Contrat d'échange entre le site (navigateur) et le Worker.
// Toutes les dates sont au format Odoo, en UTC : "AAAA-MM-JJ HH:MM:SS".

export interface CatalogVariant {
  id: number
  /** Valeur d'attribut, ex. « Peugeot 208 » (vide si une seule variante) */
  name: string
  displayName: string
  /** Valeurs d'attributs Odoo de la variante (pour le calcul du prix) */
  ptavIds: number[]
  /** Heure imposée de retrait / retour (heure locale, 0 = libre) */
  pickupHour: number
  returnHour: number
}

export interface CatalogProduct {
  id: number
  name: string
  listPrice: number
  /** Libellé Odoo, ex. « 35,00 € / Jour » */
  displayPrice: string
  /** Montant de la caution (non débitée) */
  deposit: number
  featured: boolean
  image: string
  images: string[]
  attributeName: string
  variants: CatalogVariant[]
  optionIds: number[]
}

export interface CatalogOption {
  id: number
  productId: number
  name: string
  price: number
  image: string
}

/** Lieu de remise du véhicule (mode de livraison Odoo) */
export interface DeliveryMethod {
  id: number
  name: string
  price: number
  /** Le client doit préciser l'adresse (lieu personnalisé) */
  requiresAddress: boolean
}

export interface Country {
  id: number
  name: string
  code: string
  phoneCode: number
}

export interface Catalog {
  products: CatalogProduct[]
  options: CatalogOption[]
  deliveryMethods: DeliveryMethod[]
  tax: { rate: number; label: string }
  /** Jours interdits (1 = lundi … 7 = dimanche) */
  forbiddenWeekdays: number[]
  countries: Country[]
  defaultCountryId: number
}

export interface SearchResult {
  productId: number
  price: number
  /** ex. « / 3 Jours » */
  priceInfo: string
  available: boolean
  variants: { id: number; available: boolean }[]
}

export interface CartLine {
  productId: number
  qty: number
}

export interface QuoteLine {
  kind: 'rental' | 'option' | 'delivery'
  productId: number
  templateId: number
  name: string
  qty: number
  isRental: boolean
  unitLabel: string
  durationLabel: string
  amount: number
  available: boolean
  image: string
}

export interface QuoteRequest {
  start: string
  end: string
  lines: CartLine[]
  deliveryId?: number | null
}

export interface Quote {
  start: string
  end: string
  /** Vrai si les horaires ont été ajustés aux heures de retrait/retour du véhicule */
  adjusted: boolean
  lines: QuoteLine[]
  subtotal: number
  taxLabel: string
  tax: number
  total: number
  /** Caution du véhicule (non débitée) */
  deposit: number
  allAvailable: boolean
}

export interface CustomerInput {
  civility: 'M.' | 'Mme'
  firstName: string
  lastName: string
  email: string
  phone: string
  street: string
  street2?: string
  zip: string
  city: string
  countryId: number
  /** Champ piège anti-robots : doit rester vide */
  website?: string
}

export type DepositMode = 'gando' | 'tpe'
export type PaymentMode = 'card' | 'alma3' | 'alma4'

export interface CheckoutRequest extends QuoteRequest {
  deliveryId: number
  deliveryDetail?: string
  customer: CustomerInput
  depositMode: DepositMode
  paymentMode: PaymentMode
  acceptTerms: boolean
}

export interface CheckoutResult {
  orderName: string
  amountTotal: number
  /** Page de paiement (Stripe / Alma, ou page simulée en mode test) */
  paymentUrl: string
}

/** Informations affichées sur la page de paiement simulée et la confirmation */
export interface OrderSummary {
  orderId: number
  orderName: string
  amountTotal: number
  paymentMode: PaymentMode
  depositMode: DepositMode
  depositAmount: number
  paid: boolean
  customerFirstName: string
  email: string
  documentsUrl: string
  simulation: boolean
}

export type DocumentKind = 'permis_recto' | 'permis_verso' | 'identite_recto' | 'identite_verso'

export interface DocumentsStatus {
  orderName: string
  customerFirstName: string
  start: string
  depositMode: DepositMode
  depositAmount: number
  uploaded: DocumentKind[]
  complete: boolean
}
