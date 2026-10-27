// Petit client JSON-RPC pour les scripts de configuration Odoo.
// Lit l'URL, la base, l'identifiant et la clé API dans worker/.dev.vars (jamais dans le code).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const file = path.join(here, '..', 'worker', '.dev.vars')
const vars = Object.fromEntries(
  fs.readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
const toml = fs.readFileSync(path.join(here, '..', 'worker', 'wrangler.toml'), 'utf8')
const fromToml = (k) => toml.match(new RegExp(`^${k}\\s*=\\s*"([^"]*)"`, 'm'))?.[1]

export const ODOO_URL = vars.ODOO_URL ?? fromToml('ODOO_URL')
const DB = vars.ODOO_DB ?? fromToml('ODOO_DB')
let uid

async function rpc(params) {
  const res = await fetch(`${ODOO_URL}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'call', id: Date.now(), params }),
  })
  const body = await res.json()
  if (body.error) throw new Error(body.error.data?.message ?? body.error.message)
  return body.result
}

export async function call(model, method, args = [], kwargs = {}) {
  uid ??= await rpc({ service: 'common', method: 'authenticate', args: [DB, vars.ODOO_LOGIN, vars.ODOO_API_KEY, {}] })
  if (!uid) throw new Error('Authentification Odoo refusée : vérifiez ODOO_LOGIN et ODOO_API_KEY dans worker/.dev.vars')
  return rpc({ service: 'object', method: 'execute_kw', args: [DB, uid, vars.ODOO_API_KEY, model, method, args, kwargs] })
}

/** Identifiant technique d'un enregistrement Odoo à partir de son xmlid (ex. "sale.view_order_form"). */
export async function ref(xmlid) {
  const [module, name] = xmlid.split('.')
  const [row] = await call('ir.model.data', 'search_read', [[['module', '=', module], ['name', '=', name]]], { fields: ['res_id'] })
  if (!row) throw new Error(`Référence introuvable : ${xmlid}`)
  return row.res_id
}
