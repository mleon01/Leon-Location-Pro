// ─────────────────────────────────────────────────────────────
//  COUCHE UNIQUE D'ACCÈS AUX DONNÉES
//  Les pages appellent `data` sans savoir d'où viennent les informations.
// ─────────────────────────────────────────────────────────────
import { DATA_SOURCE } from '../config'
import type { Catalog, CheckoutRequest, CheckoutResult, DocumentKind, DocumentsStatus, OrderSummary, Quote, QuoteRequest, SearchResult } from '../../shared/api'
import { mockProvider } from './mockProvider'
import { odooProvider } from './odooProvider'

export interface DataProvider {
  getCatalog(): Promise<Catalog>
  /** Prix et disponibilités de chaque véhicule pour la période (dates Odoo UTC) */
  search(start: string, end: string): Promise<SearchResult[]>
  /** Récapitulatif calculé par Odoo (véhicule, options, lieu de remise, TVA, caution) */
  quote(request: QuoteRequest): Promise<Quote>
  /** Crée le client et la commande dans Odoo, renvoie la page de paiement */
  checkout(request: CheckoutRequest): Promise<CheckoutResult>
  /** Résumé d'une commande à partir de son lien signé */
  getOrder(ref: string): Promise<OrderSummary>
  /** Paiement simulé (mode test, avant Stripe et Alma) */
  simulatePayment(ref: string): Promise<OrderSummary>
  getDocuments(ref: string): Promise<DocumentsStatus>
  uploadDocument(ref: string, kind: DocumentKind, file: File): Promise<DocumentsStatus>
}

export const data: DataProvider = DATA_SOURCE === 'mock' ? mockProvider : odooProvider
