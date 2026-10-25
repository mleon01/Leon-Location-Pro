# LEON Location PRO — site de réservation

Copie à l'identique du site [leon-location-pro.odoo.com](https://leon-location-pro.odoo.com), reconstruite en site statique (Vite + React + TypeScript + Tailwind) et branchée sur Odoo comme back-office.

```
Navigateur ──► Site statique (GitHub Pages / Cloudflare Pages)
                   │  aucune clé ici
                   ▼
              Cloudflare Worker (/worker) ── détient la clé API ──► Odoo
```

- **Odoo reste la base de données** : véhicules, prix (y compris saisonniers), disponibilités, clients, commandes, paiement Stripe.
- **Le Worker** ne fait que 4 choses : lire le catalogue publié, donner prix/disponibilités, calculer le panier, créer le client + le devis de location. Il renvoie ensuite le client vers la page de paiement du portail Odoo.
- **Aucun secret dans ce dépôt public.** La clé API Odoo vit uniquement dans `worker/.dev.vars` (ignoré par Git) et dans les secrets Cloudflare.

## Les pages

| Adresse | Équivalent Odoo |
|---|---|
| `#/` | Accueil (bannière, « Comment ça marche ? », flotte, avantages, FAQ) |
| `#/shop?start_date=…&end_date=…` | « Les véhicules disponibles pour votre période de location » + fenêtre d'options |
| `#/shop/cart` | Étape « Commande » |
| `#/shop/address` | Étape « Informations personnelles » |
| → portail Odoo `/my/orders/…` | Étape « Paiement » (Stripe, géré par Odoo) |

## Lancer le site sur votre ordinateur

Prérequis : [Node.js](https://nodejs.org) 20 ou plus récent.

```bash
npm install                 # une seule fois
cd worker && npm install    # une seule fois
```

1. Créez `worker/.dev.vars` à partir de `worker/.dev.vars.example` et mettez-y votre e-mail Odoo et votre clé API.
2. Ouvrez **deux terminaux** :
   ```bash
   # Terminal 1 — l'API (Worker) sur http://127.0.0.1:8787
   cd worker
   npm run dev

   # Terminal 2 — le site sur http://127.0.0.1:5173
   npm run dev
   ```
3. Ouvrez http://127.0.0.1:5173

Pour essayer le site **sans Odoo** (données de démonstration) : `npm run dev:demo`.

## Modifier le site

| Je veux changer… | Fichier |
|---|---|
| Les textes de l'accueil, la FAQ | `src/pages/HomePage.tsx` |
| Les couleurs, polices | `src/index.css` (bloc `@theme`) |
| Les liens Facebook / Instagram / TikTok | `src/config.ts` |
| Le mode de données (odoo / mock) | `src/config.ts` → `DATA_SOURCE` |
| Les véhicules, prix, options, photos | **dans Odoo** (aucun code à toucher) |
| Les véhicules affichés dans « Notre flotte » | Odoo : catégorie e-commerce n°1 (`FEATURED_CATEGORY_ID` dans `worker/wrangler.toml`) |

## Structure

```
src/
  config.ts             ← DATA_SOURCE (odoo | mock) et adresse du Worker
  data/provider.ts      ← couche unique d'accès aux données
  data/odooProvider.ts  ← appelle le Worker
  data/mockProvider.ts  ← démonstration (src/data/mock/catalog.json)
  pages/                ← une page par écran
  components/           ← en-tête, pied de page, calendrier, fenêtre d'options, étapes de commande
shared/api.ts           ← format des échanges site ↔ Worker
worker/                 ← Cloudflare Worker (API sécurisée vers Odoo)
```

## Mise en ligne

- **Aujourd'hui** : chaque `git push` sur `main` publie le site sur GitHub Pages (workflow `.github/workflows/deploy.yml`). Sans Worker en ligne, la version publiée tourne en mode démonstration.
- **Connexion réelle à Odoo en ligne** : voir [DEPLOIEMENT.md](DEPLOIEMENT.md).
