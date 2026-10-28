// ─────────────────────────────────────────────────────────────
//  Application « Pilotage LEON » : tableau de bord + vues opérationnelles + raccourcis.
//  Lancer : node odoo/dashboard.mjs   (relançable : met à jour ce qui existe)
// ─────────────────────────────────────────────────────────────
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { call, ref } from './odoo-rpc.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const SITE_URL = 'https://leon-location-pro.leon-location-pro.workers.dev'
const log = (...a) => console.log('•', ...a)

async function ensure(model, domain, values) {
  const [found] = await call(model, 'search', [domain], { limit: 1, context: { active_test: false } })
  if (found) {
    await call(model, 'write', [[found], values])
    return found
  }
  return call(model, 'create', [values])
}

// ─── 1. Vues opérationnelles (listes filtrées) ───
const rentalViews = { list: 4218, form: 4217, kanban: 4219, calendar: 4220 }
const viewId = async (name, type) => (await call('ir.ui.view', 'search', [[['name', '=', name], ['type', '=', type], ['mode', '=', 'primary']]], { limit: 1 }))[0]
rentalViews.list = (await viewId('rental.order.list', 'list')) ?? rentalViews.list
rentalViews.form = (await viewId('rental.order.form', 'form')) ?? rentalViews.form
const rentalCtx = "{'in_rental_app': 1, 'default_is_rental_order': 1}"

const OPS = [
  { key: 'retraits', name: 'Retraits à venir', icon: '🔑', domain: "[('is_rental_order', '=', True), ('rental_status', '=', 'pickup')]" },
  { key: 'retours', name: 'Véhicules en location (retours à venir)', icon: '🚗', domain: "[('is_rental_order', '=', True), ('rental_status', '=', 'return')]" },
  { key: 'documents', name: 'Documents clients à vérifier', icon: '📄', domain: "[('state', '=', 'sale'), ('x_docs_status', 'in', ['missing', 'received'])]" },
  { key: 'contrats', name: 'Contrats à faire signer', icon: '✍️', domain: "[('state', '=', 'sale'), ('x_sign_request_id', '!=', False), ('x_sign_request_id.state', 'not in', ['signed', 'canceled'])]" },
]
const actions = {}
for (const op of OPS) {
  actions[op.key] = await ensure('ir.actions.act_window', [['name', '=', `LEON — ${op.name}`]], {
    name: `LEON — ${op.name}`,
    res_model: 'sale.order',
    view_mode: 'list,form',
    domain: op.domain,
    context: rentalCtx,
    view_ids: [[5, 0, 0], [0, 0, { sequence: 1, view_mode: 'list', view_id: rentalViews.list }], [0, 0, { sequence: 2, view_mode: 'form', view_id: rentalViews.form }]],
  })
}
actions.factures = await ensure('ir.actions.act_window', [['name', '=', 'LEON — Factures impayées']], {
  name: 'LEON — Factures impayées',
  res_model: 'account.move',
  view_mode: 'list,form',
  domain: "[('move_type', '=', 'out_invoice'), ('state', '=', 'posted'), ('payment_state', 'in', ['not_paid', 'partial'])]",
  context: "{'default_move_type': 'out_invoice'}",
})
actions.lieux = await ensure('ir.actions.act_window', [['name', '=', 'LEON — Lieux de remise']], {
  name: 'LEON — Lieux de remise', res_model: 'delivery.carrier', view_mode: 'list,form', domain: '[]', context: '{}',
})
log('vues opérationnelles', JSON.stringify(actions))

// ─── 2. Application « Pilotage LEON » (menu principal + sous-menus) ───
const logo = fs.readFileSync(path.join(here, 'app-icon.png')).toString('base64')
const clientAction = await ensure('ir.actions.client', [['name', '=', 'Pilotage LEON']], {
  name: 'Pilotage LEON', tag: 'action_spreadsheet_dashboard',
})
const root = await ensure('ir.ui.menu', [['name', '=', 'Pilotage LEON'], ['parent_id', '=', false]], {
  name: 'Pilotage LEON', sequence: 0, action: `ir.actions.client,${clientAction}`, web_icon_data: logo,
})
const sub = [
  ['Tableau de bord', `ir.actions.client,${clientAction}`],
  ['Retraits à venir', `ir.actions.act_window,${actions.retraits}`],
  ['Véhicules en location', `ir.actions.act_window,${actions.retours}`],
  ['Documents à vérifier', `ir.actions.act_window,${actions.documents}`],
  ['Contrats à signer', `ir.actions.act_window,${actions.contrats}`],
  ['Factures impayées', `ir.actions.act_window,${actions.factures}`],
  ['Lieux de remise', `ir.actions.act_window,${actions.lieux}`],
]
const menus = {}
for (const [i, [name, action]] of sub.entries()) menus[name] = await ensure('ir.ui.menu', [['name', '=', name], ['parent_id', '=', root]], { name, parent_id: root, sequence: i, action })
log('application « Pilotage LEON »', root)

// ─── 3. Tableau de bord (feuille de calcul Odoo) ───
const group = await ensure('spreadsheet.dashboard.group', [['name', '=', 'LEON Location PRO']], { name: 'LEON Location PRO', sequence: 0 })
const dispo = (await call('fleet.vehicle.state', 'search', [[['name', '=', 'Disponible']]]))[0]
const PERIOD = 'b1e7a0c2-0000-4000-8000-000000000001'
const date = (chain, offset = 0) => ({ [PERIOD]: { chain, type: 'date', offset } })

const pivot = (id, model, rows, measures, domain, fieldMatching = {}) => ({
  type: 'ODOO', id: String(id), formulaId: String(id), name: `kpi ${id}`, model, domain, context: { group_by: [] },
  rows: rows.map((fieldName) => ({ fieldName })), columns: [], measures: measures.map((m) => ({ id: m, fieldName: m })),
  sortedColumn: null, fieldMatching,
})
const pivots = {
  1: pivot(1, 'sale.rental.report', ['state'], ['__count', 'price'], [['state', '=', 'sale']], date('date', 0)),
  2: pivot(2, 'sale.rental.report', ['state'], ['__count', 'price'], [['state', '=', 'sale']], date('date', -1)),
  3: pivot(3, 'sale.order', ['rental_status'], ['__count'], [['is_rental_order', '=', true]]),
  4: pivot(4, 'sale.order', ['x_docs_status'], ['__count'], [['state', '=', 'sale'], ['rental_status', 'in', ['pickup', 'return']]]),
  5: pivot(5, 'account.move', [], ['amount_residual_signed'], [['move_type', '=', 'out_invoice'], ['state', '=', 'posted'], ['payment_state', 'in', ['not_paid', 'partial']]]),
  6: pivot(6, 'fleet.vehicle', ['state_id'], ['__count'], []),
}
const v = (formula) => `=IFERROR(${formula},0)`
const dataCells = {
  A1: 'Indicateur', B1: 'Période', C1: 'Période précédente',
  A2: 'Réservations', B2: v('PIVOT.VALUE(1,"__count","state","sale")'), C2: v('PIVOT.VALUE(2,"__count","state","sale")'),
  A3: "Chiffre d'affaires HT", B3: v('PIVOT.VALUE(1,"price","state","sale")'), C3: v('PIVOT.VALUE(2,"price","state","sale")'),
  A4: 'Panier moyen', B4: '=IFERROR(B3/B2,0)', C4: '=IFERROR(C3/C2,0)',
  A5: 'Factures impayées', B5: v('PIVOT.VALUE(5,"amount_residual_signed")'),
  A6: 'En location', B6: v('PIVOT.VALUE(3,"__count","rental_status","return")'),
  A7: 'Retraits à venir', B7: v('PIVOT.VALUE(3,"__count","rental_status","pickup")'),
  A8: 'Documents à vérifier', B8: v('PIVOT.VALUE(4,"__count","x_docs_status","received")'),
  A9: 'Documents manquants', B9: v('PIVOT.VALUE(4,"__count","x_docs_status","missing")'),
  A10: 'Véhicules disponibles', B10: v(`PIVOT.VALUE(6,"__count","state_id",${dispo})`),
  A11: 'Véhicules au parc', B11: v('PIVOT.VALUE(6,"__count")'),
}

// Liens : vues opérationnelles, menus des applications, site web
const menuIdLink = (label, name) => `[${label}](odoo://ir_menu_id/${menus[name]})`
const menuLink = (label, xmlid) => `[${label}](odoo://ir_menu_xml_id/${xmlid})`
const NAVY = '#1F3A5F'
const cells = {
  A1: 'LEON LOCATION PRO — PILOTAGE',
  A2: 'Vue d’ensemble de l’activité · utilisez le filtre « Période » en haut pour changer la période des indicateurs.',
  A13: 'À TRAITER',
  A14: menuIdLink('🔑  Retraits à venir', 'Retraits à venir'),
  A15: menuIdLink('🚗  Véhicules en location / retours', 'Véhicules en location'),
  A16: menuIdLink('📄  Documents clients à vérifier', 'Documents à vérifier'),
  A17: menuIdLink('✍️  Contrats à faire signer', 'Contrats à signer'),
  A18: menuIdLink('💶  Factures impayées', 'Factures impayées'),
  A19: menuLink('📅  Planning des locations', 'sale_renting.menu_rental_schedule'),
  A20: menuLink('➕  Toutes les réservations / nouvelle réservation', 'sale_renting.rental_orders_all'),
  D13: 'APPLICATIONS',
  D14: menuLink('👥  Clients', 'contacts.res_partner_menu_contacts'),
  D15: menuLink('🚙  Parc automobile', 'fleet.fleet_vehicle_menu'),
  D16: menuLink('🏷️  Véhicules, options et tarifs', 'sale_renting.menu_catalog_products'),
  D17: menuIdLink('📍  Lieux de remise et prix', 'Lieux de remise'),
  D18: menuLink('🧾  Factures', 'account.menu_action_move_out_invoice_type'),
  D19: menuLink('✍️  Contrats (Sign)', 'sign.sign_request_documents'),
  D20: menuLink('🗂️  Pièces clients et contrats signés (Documents)', 'documents.dashboard'),
  D21: menuLink('⚙️  Paramètres de location', 'sale_renting.menu_rental_settings'),
  D22: `[🌐  Site web de réservation](${SITE_URL})`,
  A24: 'ANALYSE',
  A46: 'PROCHAINS RETRAITS',
  A47: '=ODOO.LIST.HEADER(1,"name")', B47: '=ODOO.LIST.HEADER(1,"partner_id")', C47: '=ODOO.LIST.HEADER(1,"rental_start_date")', D47: '=ODOO.LIST.HEADER(1,"carrier_id")', E47: '=ODOO.LIST.HEADER(1,"x_docs_status")',
}
for (let i = 1; i <= 8; i++) {
  const r = 47 + i
  Object.assign(cells, { [`A${r}`]: `=ODOO.LIST(1,${i},"name")`, [`B${r}`]: `=ODOO.LIST(1,${i},"partner_id")`, [`C${r}`]: `=ODOO.LIST(1,${i},"rental_start_date")`, [`D${r}`]: `=ODOO.LIST(1,${i},"carrier_id")`, [`E${r}`]: `=ODOO.LIST(1,${i},"x_docs_status")` })
}

let figId = 0
const fid = () => `leon-fig-${++figId}`
const card = (title, keyValue, baseline, x, y, background = '#EFF6FF') => ({
  id: fid(), tag: 'chart', width: 236, height: 104, col: 0, row: 0, offset: { x, y },
  data: {
    type: 'scorecard', title: { text: title, bold: true, color: '#434343' }, keyValue, background, humanize: false,
    ...(baseline ? { baseline, baselineMode: 'percentage', baselineDescr: { text: 'vs période précédente' }, baselineColorUp: '#00A04A', baselineColorDown: '#DC6965' } : {}),
  },
})
const odooChart = (type, title, resModel, groupBy, measure, domain, x, y, w, h, matching = null) => {
  const id = fid()
  return {
    id, tag: 'chart', width: w, height: h, col: 0, row: 0, offset: { x, y },
    data: {
      type, chartId: id, title: { text: title, bold: true, color: NAVY }, background: '#FFFFFF', legendPosition: type === 'odoo_pie' ? 'right' : 'none',
      metaData: { groupBy, measure, order: null, resModel, mode: type.replace('odoo_', '') },
      searchParams: { comparison: null, context: { group_by: [] }, domain, groupBy: [], orderBy: [] },
      dataSets: [{}], verticalAxisPosition: 'left', stacked: false,
      fieldMatching: matching ? { [PERIOD]: { chain: matching, type: 'date', offset: 0 } } : {},
    },
  }
}
const Y1 = 64
const Y2 = Y1 + 114
const figures = [
  card('Réservations', 'Data!B2', 'Data!C2', 0, Y1),
  card("Chiffre d'affaires HT", 'Data!B3', 'Data!C3', 246, Y1),
  card('Panier moyen HT', 'Data!B4', 'Data!C4', 492, Y1),
  card('Factures impayées', 'Data!B5', null, 738, Y1, '#FEF3F2'),
  card('En location maintenant', 'Data!B6', null, 0, Y2, '#F0FDF4'),
  card('Retraits à venir', 'Data!B7', null, 246, Y2, '#F0FDF4'),
  card('Documents à vérifier', 'Data!B8', null, 492, Y2, '#FFFBEB'),
  card('Véhicules disponibles', 'Data!B10', null, 738, Y2, '#F0FDF4'),
  odooChart('odoo_bar', "Chiffre d'affaires par mois (HT)", 'sale.rental.report', ['date:month'], 'price', [['state', '=', 'sale']], 0, 600, 480, 300, 'date'),
  odooChart('odoo_pie', 'Réservations par véhicule', 'sale.rental.report', ['product_id'], '__count', [['state', '=', 'sale']], 494, 600, 480, 300, 'date'),
  odooChart('odoo_bar', 'Lieux de remise les plus demandés', 'sale.order', ['carrier_id'], '__count', [['state', '=', 'sale'], ['is_rental_order', '=', true]], 0, 914, 480, 280, 'date_order'),
  odooChart('odoo_pie', 'Modes de paiement', 'sale.order', ['x_payment_mode'], '__count', [['state', '=', 'sale'], ['is_rental_order', '=', true]], 494, 914, 480, 280, 'date_order'),
  odooChart('odoo_bar', 'Options les plus vendues', 'sale.order.line', ['product_id'], 'product_uom_qty', [['state', '=', 'sale'], ['is_rental', '=', false], ['is_delivery', '=', false], ['order_id.is_rental_order', '=', true]], 0, 1208, 974, 260),
]

const styles = {
  1: { bold: true, fontSize: 22, textColor: NAVY },
  2: { italic: true, textColor: '#6B7280' },
  3: { bold: true, fontSize: 13, textColor: '#FFFFFF', fillColor: NAVY },
  4: { fontSize: 11, verticalAlign: 'middle' },
  5: { bold: true, fillColor: '#B8CCE4', textColor: NAVY },
}
const sheetStyles = { A1: 1, A2: 2, 'A13:B13': 3, 'D13:E13': 3, 'A24:E24': 3, 'A46:E46': 3, 'A14:A20': 4, 'D14:D22': 4, 'A47:E47': 5 }
const rows = { 0: { size: 46 } }
for (let r = 1; r <= 11; r++) rows[r] = { size: 23 }
for (let r = 13; r <= 21; r++) rows[r] = { size: 30 }

const spreadsheet = {
  version: '18.5.10',
  sheets: [
    {
      id: 'leon-dashboard', name: 'Pilotage', colNumber: 6, rowNumber: 60,
      cols: { 0: { size: 330 }, 1: { size: 150 }, 2: { size: 150 }, 3: { size: 330 }, 4: { size: 150 }, 5: { size: 40 } },
      rows, merges: ['A1:E1', 'A2:E2'], styles: sheetStyles, formats: {}, borders: {}, cells, figures,
      conditionalFormats: [], dataValidationRules: [], tables: [], areGridLinesVisible: false, isVisible: true, headerGroups: { ROW: [], COL: [] }, comments: {},
    },
    {
      id: 'leon-data', name: 'Data', colNumber: 4, rowNumber: 20, cols: {}, rows: {}, merges: [], styles: {}, formats: { 'B3:C5': 1 }, borders: {},
      cells: dataCells, figures: [], conditionalFormats: [], dataValidationRules: [], tables: [], areGridLinesVisible: true, isVisible: false, headerGroups: { ROW: [], COL: [] }, comments: {},
    },
  ],
  styles,
  formats: { 1: '#,##0 [$€]' },
  borders: {},
  revisionId: 'START_REVISION',
  uniqueFigureIds: true,
  settings: { locale: { name: 'French', code: 'fr_FR', thousandsSeparator: ' ', decimalSeparator: ',', dateFormat: 'dd/mm/yyyy', timeFormat: 'hh:mm:ss', formulaArgSeparator: ';', weekStart: 1 } },
  pivots,
  pivotNextId: 7,
  customTableStyles: {},
  globalFilters: [{ id: PERIOD, type: 'date', label: 'Période', defaultValue: 'last_30_days' }],
  lists: {
    1: {
      id: '1', name: 'Prochains retraits', model: 'sale.order', columns: ['name', 'partner_id', 'rental_start_date', 'carrier_id', 'x_docs_status'],
      domain: [['is_rental_order', '=', true], ['rental_status', '=', 'pickup']], context: {}, orderBy: [{ name: 'rental_start_date', asc: true }], fieldMatching: {},
    },
  },
  listNextId: 2,
  chartOdooMenusReferences: {},
}
fs.writeFileSync(path.join(here, 'dashboard-pilotage.json'), JSON.stringify(spreadsheet, null, 1))

const dashboard = await ensure('spreadsheet.dashboard', [['name', '=', 'Pilotage']], {
  name: 'Pilotage', dashboard_group_id: group, sequence: 0, is_published: true, spreadsheet_data: JSON.stringify(spreadsheet),
})
await call('ir.actions.client', 'write', [[clientAction], { params: { dashboard_id: dashboard } }])
log('tableau de bord « Pilotage »', dashboard)

// ─── 4. Page d'accueil de l'utilisateur ───
const users = await call('res.users', 'search', [[['share', '=', false]]])
await call('res.users', 'write', [users, { action_id: clientAction }])
log('page d\'accueil des utilisateurs internes →', 'Pilotage LEON')
