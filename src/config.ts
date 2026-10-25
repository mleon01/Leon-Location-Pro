// ─────────────────────────────────────────────────────────────
//  CONFIGURATION DU SITE
// ─────────────────────────────────────────────────────────────

/**
 * Source des données :
 *  - "odoo" : vraies données Odoo, via le Cloudflare Worker (dossier /worker)
 *  - "mock" : copie de démonstration du catalogue (src/data/mock), sans Odoo
 *
 * C'est LA variable à changer pour passer d'un mode à l'autre.
 * Elle peut aussi être définie au moment du build : VITE_DATA_SOURCE=odoo
 */
export const DATA_SOURCE: 'odoo' | 'mock' = (import.meta.env.VITE_DATA_SOURCE as 'odoo' | 'mock' | undefined) ?? 'odoo'

/** Adresse du Worker (en local : wrangler dev sur le port 8787) */
export const WORKER_URL: string = import.meta.env.VITE_WORKER_URL ?? 'http://127.0.0.1:8787/api'

export const SOCIAL = {
  facebook: 'https://www.facebook.com/',
  instagram: 'https://www.instagram.com/',
  tiktok: 'https://www.tiktok.com/',
}
