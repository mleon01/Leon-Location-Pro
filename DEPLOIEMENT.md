# Mise en ligne avec Odoo — pas à pas

Ce guide fait passer le site de « démonstration sur GitHub Pages » à « site réel branché sur Odoo ».
Comptez environ 30 minutes. Rien de payant : Cloudflare Workers et Pages sont gratuits à ce volume.

```
Visiteur ──► Site (GitHub Pages, puis Cloudflare Pages)
                 │
                 ▼
            Worker Cloudflare  ── clé API (secret) ──►  Odoo (leon-location-pro.odoo.com)
                                                         └─ paiement Stripe sur le portail Odoo
```

---

## Étape 1 — Préparer Odoo

1. **Créer une clé API dédiée au site**
   Odoo → avatar en haut à droite → *Mon profil* → onglet *Sécurité du compte* → *Nouvelle clé API*.
   Nommez-la « Site web — Worker ». Copiez-la : elle ne sera plus jamais affichée.
2. **Supprimer toute clé déjà partagée** (par e-mail, messagerie, conversation…) dans la même liste.
3. **Activer Stripe** : *Site web → Configuration → Fournisseurs de paiement → Stripe → Activer*,
   puis connectez votre compte Stripe. Publiez-le.
4. **Désactiver le fournisseur « Demo »** (sinon les clients voient un bouton de paiement fictif).
5. **Vérifier les paramètres des devis** : *Ventes → Configuration → Paramètres → Paiement en ligne* coché
   (c'est ce qui affiche « Accepter & Payer » sur le portail).
6. **Publier les pages légales** (Politique de confidentialité, CGV, Mentions légales) : elles renvoient
   aujourd'hui une erreur 404 sur le site Odoo comme sur la copie.

> Tout ce qui concerne les véhicules (prix, photos, options, saisons, disponibilités) se gère **dans Odoo** :
> le site lit ces informations en direct.

## Étape 2 — Mettre le Worker en ligne

Dans un terminal, depuis le dossier du projet :

```bash
cd worker
npm install
npx wrangler login                    # ouvre le navigateur : connectez-vous / créez un compte Cloudflare
npx wrangler secret put ODOO_LOGIN    # tapez l'e-mail de connexion Odoo
npx wrangler secret put ODOO_API_KEY  # collez la clé API créée à l'étape 1
npx wrangler deploy
```

La dernière commande affiche l'adresse du Worker, par exemple :
`https://leon-location-pro-api.<votre-compte>.workers.dev`

Vérifiez dans le navigateur :
- `…/api/health` doit afficher `{"ok":true}`
- `…/api/catalog` doit afficher vos véhicules

## Étape 3 — Brancher le site publié sur le Worker

Sur GitHub : dépôt → *Settings* → *Secrets and variables* → *Actions* → onglet **Variables** → *New repository variable* :

| Nom | Valeur |
|---|---|
| `DATA_SOURCE` | `odoo` |
| `WORKER_URL` | `https://leon-location-pro-api.<votre-compte>.workers.dev/api` |

Puis *Actions* → « Déploiement GitHub Pages » → *Run workflow*.
Le site publié utilise désormais les vraies données Odoo.

## Étape 4 — Passer sur Cloudflare Pages et votre nom de domaine (recommandé)

1. Cloudflare → *Workers & Pages* → *Créer* → *Pages* → *Connecter à Git* → choisissez le dépôt.
2. Paramètres de build :
   - Commande : `npm run build`
   - Dossier de sortie : `dist`
   - Variables d'environnement : `BASE_PATH=/`, `VITE_DATA_SOURCE=odoo`, `VITE_WORKER_URL=https://…workers.dev/api`
3. *Domaines personnalisés* → ajoutez par exemple `www.leon-location-pro.re`.
4. Autorisez ce domaine dans le Worker : ajoutez-le à `ALLOWED_ORIGINS` dans `worker/wrangler.toml`, puis `npx wrangler deploy`.
5. (Option) Mettez le Worker sur le même domaine : `api.leon-location-pro.re` (*Worker → Paramètres → Domaines*).

## Étape 5 — Vérifications avant d'ouvrir au public

- [ ] Faire une réservation complète avec une vraie carte (petit montant), puis l'annuler/rembourser dans Odoo.
- [ ] Supprimer les devis et clients de test (`TEST …`) dans Odoo.
- [ ] Vérifier sur téléphone : recherche, options, panier, formulaire, paiement.
- [ ] Rediriger l'ancien site Odoo vers le nouveau domaine si vous ne gardez qu'un site.

---

## Sécurité — ce qui est déjà en place

- La clé API n'existe que dans les secrets Cloudflare (et `worker/.dev.vars` sur votre ordinateur, ignoré par Git).
- Le Worker n'accepte que les sites listés dans `ALLOWED_ORIGINS`.
- Il n'expose que 4 actions (catalogue, recherche, panier, commande) ; aucune lecture des clients ou commandes existants.
- Les produits commandables sont vérifiés (uniquement véhicules publiés et leurs options).
- Prix et disponibilités sont recalculés par Odoo au moment de la commande (impossible de les falsifier).
- Limite de 5 commandes par minute et par adresse IP, plus un champ piège anti-robots.

**Pour aller plus loin** : ajouter [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) (captcha invisible) sur le formulaire si des commandes de robots apparaissent.

## En cas de problème

| Symptôme | Cause probable |
|---|---|
| « Impossible de joindre le service de réservation » | `WORKER_URL` incorrect, ou domaine absent de `ALLOWED_ORIGINS` |
| « Le service de réservation est momentanément indisponible » | Clé API révoquée/erronée : refaire `wrangler secret put ODOO_API_KEY` |
| Un véhicule n'apparaît pas | Dans Odoo : produit non publié, ou pas en location, ou non disponible sur la période |
| Journal des erreurs | `cd worker && npx wrangler tail` |
