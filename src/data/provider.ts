// ─────────────────────────────────────────────────────────────
//  COUCHE UNIQUE D'ACCÈS AUX DONNÉES
//  Les pages appellent `data` sans savoir d'où viennent les informations.
// ─────────────────────────────────────────────────────────────
import { DATA_SOURCE } from '../config'
import type { CartLine, Catalog, CheckoutRequest, CheckoutResult, Quote, SearchResult } from '../../shared/api'
import { mockProvider } from './mockProvider'
import { odooProvider } from './odooProvider'

export interface DataProvider {
  getCatalog(): Promise<Catalog>
  /** Prix et disponibilités de chaque véhicule pour la période (dates Odoo UTC) */
  search(start: string, end: string): Promise<SearchResult[]>
  /** Récapitulatif du panier calculé par Odoo */
  quote(start: string, end: string, lines: CartLine[]): Promise<Quote>
  /** Crée le client et le devis de location dans Odoo, renvoie le lien de paiement */
  checkout(request: CheckoutRequest): Promise<CheckoutResult>
}

export const data: DataProvider = DATA_SOURCE === 'mock' ? mockProvider : odooProvider
