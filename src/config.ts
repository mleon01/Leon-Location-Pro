// ─────────────────────────────────────────────────────────────
//  CONFIGURATION DU SITE
// ─────────────────────────────────────────────────────────────

/**
 * Source des données du site :
 *  - "mock" : données de démonstration (fichiers JSON dans src/data/mock)
 *  - "odoo" : vraies données Odoo, via le Cloudflare Worker (phase 2)
 *
 * C'est LA variable à changer pour passer d'un mode à l'autre.
 * Elle peut aussi être définie au moment du build : VITE_DATA_SOURCE=odoo
 */
export const DATA_SOURCE: 'mock' | 'odoo' =
  (import.meta.env.VITE_DATA_SOURCE as 'mock' | 'odoo' | undefined) ?? 'mock'

/** Adresse du Cloudflare Worker (utilisée uniquement en mode "odoo") */
export const WORKER_URL: string = import.meta.env.VITE_WORKER_URL ?? '/api'

/** Coordonnées affichées sur le site (provisoires) */
export const COMPANY = {
  name: 'LEON Location PRO',
  slogan: 'Voyagez sans limite',
  tagline: 'Qualité pro, service local',
  phone: '0262 00 00 00',
  phoneHref: 'tel:+262262000000',
  whatsapp: 'https://wa.me/262692000000',
  email: 'contact@exemple-leon-location.re',
  address: 'La Réunion (974)',
  facebook: 'https://www.facebook.com/',
  instagram: 'https://www.instagram.com/',
  cancellationHours: 24,
}
