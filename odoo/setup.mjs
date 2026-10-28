// ─────────────────────────────────────────────────────────────
//  Configuration d'Odoo pour le parcours de réservation du site.
//  Lancer :  node odoo/setup.mjs
//  Le script peut être relancé sans risque : il met à jour ce qui existe déjà.
// ─────────────────────────────────────────────────────────────
import { call, ref } from './odoo-rpc.mjs'

const log = (...a) => console.log('•', ...a)

/** Crée l'enregistrement s'il n'existe pas, sinon le met à jour. Renvoie son id. */
async function ensure(model, domain, values, context = {}) {
  const [found] = await call(model, 'search', [domain], { limit: 1, context: { active_test: false, ...context } })
  if (found) {
    await call(model, 'write', [[found], values], { context })
    return found
  }
  return call(model, 'create', [values], { context })
}

const modelId = async (model) => (await call('ir.model', 'search', [[['model', '=', model]]]))[0]
const fieldId = async (model, name) => (await call('ir.model.fields', 'search', [[['model', '=', model], ['name', '=', name]]]))[0]

/** Champ personnalisé (préfixe x_). Ne modifie pas un champ déjà existant. */
async function field(model, name, description, ttype, extra = {}) {
  const existing = await fieldId(model, name)
  if (existing) return existing
  log(`champ ${model}.${name}`)
  return call('ir.model.fields', 'create', [{ model_id: await modelId(model), name, field_description: description, ttype, store: true, ...extra }])
}
const selection = (pairs) => ({ selection_ids: pairs.map(([value, name], i) => [0, 0, { value, name, sequence: i }]) })

// ─── 1. Journaux de test (factures et paiements simulés, faciles à vider) ───
const saleJournal = await ensure('account.journal', [['code', '=', 'TST']], { name: 'Tests site web (à vider)', type: 'sale', code: 'TST' })
const bankJournal = await ensure('account.journal', [['code', '=', 'TSTB']], { name: 'Paiements simulés site web', type: 'bank', code: 'TSTB' })
log('journaux de test', saleJournal, bankJournal)

// ─── 2. Champs personnalisés ───
await field('product.template', 'x_caution', 'Montant de la caution (€)', 'float')
await field('delivery.carrier', 'x_requires_address', 'Adresse à préciser par le client', 'boolean')
await field('sale.order', 'x_caution_amount', 'Montant de la caution (€)', 'float')
await field('sale.order', 'x_caution_mode', 'Dépôt de la caution', 'selection', selection([['gando', 'En ligne avec Gando'], ['tpe', 'Empreinte TPE à la remise des clés']]))
await field('sale.order', 'x_payment_mode', 'Mode de paiement', 'selection', selection([['card', 'Carte bancaire (1×)'], ['alma3', 'Alma 3×'], ['alma4', 'Alma 4×']]))
await field('sale.order', 'x_lieu_detail', 'Précisions lieu de remise', 'char')
await field('sale.order', 'x_docs_status', 'Documents du client', 'selection', selection([['missing', 'À fournir'], ['received', 'Reçus — à vérifier'], ['validated', 'Validés']]))
await field('sale.order', 'x_documents_url', 'Lien de dépôt des documents', 'char')
await field('sale.order', 'x_contract_url', 'Lien de signature (client, sur tablette)', 'char')
await field('sale.order', 'x_sign_request_id', 'Contrat de location', 'many2one', { relation: 'sign.request', on_delete: 'set null' })

// ─── 3. Affichage des champs dans Odoo ───
await ensure('ir.ui.view', [['name', '=', 'leon.sale.order.form.resa_web']], {
  name: 'leon.sale.order.form.resa_web',
  model: 'sale.order',
  inherit_id: await ref('sale.view_order_form'),
  arch: `<data>
    <xpath expr="//notebook" position="inside">
      <page string="Réservation en ligne" name="leon_resa_web">
        <group>
          <group string="Remise du véhicule">
            <field name="carrier_id" string="Lieu de remise" readonly="1"/>
            <field name="x_lieu_detail"/>
            <field name="x_payment_mode"/>
          </group>
          <group string="Caution">
            <field name="x_caution_amount"/>
            <field name="x_caution_mode"/>
          </group>
          <group string="Documents et contrat">
            <field name="x_docs_status" widget="badge" decoration-danger="x_docs_status == 'missing'" decoration-warning="x_docs_status == 'received'" decoration-success="x_docs_status == 'validated'"/>
            <field name="x_documents_url" widget="url"/>
            <field name="x_sign_request_id"/>
            <field name="x_contract_url" widget="url" string="Faire signer le client"/>
          </group>
        </group>
      </page>
    </xpath>
  </data>`,
})
await ensure('ir.ui.view', [['name', '=', 'leon.product.template.form.caution']], {
  name: 'leon.product.template.form.caution',
  model: 'product.template',
  inherit_id: await ref('product.product_template_form_view'),
  arch: `<data><xpath expr="//field[@name='list_price']" position="after"><field name="x_caution"/></xpath></data>`,
})
await ensure('ir.ui.view', [['name', '=', 'leon.delivery.carrier.form.adresse']], {
  name: 'leon.delivery.carrier.form.adresse',
  model: 'delivery.carrier',
  inherit_id: await ref('delivery.view_delivery_carrier_form'),
  arch: `<data><xpath expr="//field[@name='delivery_type']" position="after"><field name="x_requires_address"/></xpath></data>`,
})
log('vues mises à jour')

// ─── 4. Valeurs de départ (fictives, à ajuster dans Odoo) ───
for (const [name, amount] of [['Citadine', 800], ['SUV compact', 1200]]) {
  const ids = await call('product.template', 'search', [[['name', '=', name]]])
  const [current] = ids.length ? await call('product.template', 'read', [ids, ['x_caution']]) : []
  if (current && !current.x_caution) await call('product.template', 'write', [ids, { x_caution: amount }])
}
const custom = await call('delivery.carrier', 'search', [[['name', 'ilike', 'personnalis']]])
if (custom.length) await call('delivery.carrier', 'write', [custom, { x_requires_address: true }])
log('cautions et lieu personnalisé')

// ─── 5. Dossiers Documents ───
const docsFolder = await ensure('documents.document', [['type', '=', 'folder'], ['name', '=', 'Location — Pièces clients']], {
  name: 'Location — Pièces clients', type: 'folder', access_internal: 'edit', access_via_link: 'none',
})
const contractsFolder = await ensure('documents.document', [['type', '=', 'folder'], ['name', '=', 'Location — Contrats signés']], {
  name: 'Location — Contrats signés', type: 'folder', access_internal: 'view', access_via_link: 'none',
})
log('dossiers Documents', docsFolder, contractsFolder)

// ─── 6. Modèles d'e-mails ───
const STYLE = {
  wrap: 'font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1b1f23;line-height:1.5;max-width:600px',
  th: 'padding:6px 12px 6px 0;color:#6b7280;white-space:nowrap;vertical-align:top',
  btn: 'display:inline-block;background:#00aaff;color:#ffffff;padding:12px 22px;border-radius:2px;text-decoration:none;font-weight:bold;letter-spacing:1px;text-transform:uppercase;font-size:13px',
  h: 'font-size:16px;margin:24px 0 6px;color:#0d0d0d',
}
const dates = `
  <tr><th style="${STYLE.th}">Départ</th><td><t t-out="format_datetime(order.rental_start_date, tz='Indian/Reunion', dt_format='dd/MM/yyyy HH:mm')"/></td></tr>
  <tr><th style="${STYLE.th}">Retour</th><td><t t-out="format_datetime(order.rental_return_date, tz='Indian/Reunion', dt_format='dd/MM/yyyy HH:mm')"/></td></tr>
  <tr><th style="${STYLE.th}">Lieu de remise</th><td><t t-out="order.carrier_id.name or ''"/><t t-if="order.x_lieu_detail"> — <t t-out="order.x_lieu_detail"/></t></td></tr>`

const confirmationBody = `<div style="${STYLE.wrap}">
  <t t-set="order" t-value="object.line_ids.sale_line_ids.order_id[:1]"/>
  <p>Bonjour <t t-out="object.partner_id.name or ''"/>,</p>
  <p>Merci pour votre confiance ! Votre paiement est bien reçu et <b>votre véhicule est réservé</b>.</p>
  <table style="border-collapse:collapse;margin:12px 0">
    <tr><th style="${STYLE.th}">Réservation</th><td><b t-out="order.name"/></td></tr>
    ${dates}
    <tr><th style="${STYLE.th}">Montant payé</th><td t-out="format_amount(object.amount_total, object.currency_id)"/></tr>
  </table>
  <h3 style="${STYLE.h}">1. Déposez votre permis et votre pièce d'identité</h3>
  <p>Pour gagner du temps à la remise des clés, envoyez-nous dès maintenant une photo de votre <b>permis de conduire</b> et de votre <b>pièce d'identité</b> (recto et verso).</p>
  <p><a t-att-href="order.x_documents_url" style="${STYLE.btn}">Déposer mes documents</a></p>
  <h3 style="${STYLE.h}">2. Votre caution : <t t-out="format_amount(order.x_caution_amount, object.currency_id)"/> (non débitée)</h3>
  <t t-if="order.x_caution_mode == 'gando'">
    <p>Vous avez choisi de déposer votre caution <b>en ligne avec Gando</b>. Vous trouverez le lien sur votre page de dépôt de documents.</p>
  </t>
  <t t-else="">
    <p>Une <b>empreinte bancaire</b> sera réalisée sur notre terminal lors de la remise des clés. Munissez-vous d'une carte bancaire au nom du conducteur principal.</p>
  </t>
  <h3 style="${STYLE.h}">3. Le jour du départ</h3>
  <p>Nous réalisons ensemble l'état des lieux du véhicule, puis vous signez le contrat de location sur tablette. Vous le recevrez ensuite par e-mail avec les photos.</p>
  <p>Votre facture est jointe à ce message. Annulation gratuite jusqu'à 24 h avant le départ.</p>
  <p>À très bientôt,<br/>L'équipe LEON Location PRO</p>
</div>`

const reminderBody = `<div style="${STYLE.wrap}">
  <t t-set="order" t-value="object"/>
  <p>Bonjour <t t-out="object.partner_id.name or ''"/>,</p>
  <p>Votre location <b t-out="object.name"/> commence bientôt. Il nous manque encore votre <b>permis de conduire</b> et votre <b>pièce d'identité</b>.</p>
  <table style="border-collapse:collapse;margin:12px 0">${dates}</table>
  <p><a t-att-href="object.x_documents_url" style="${STYLE.btn}">Déposer mes documents</a></p>
  <p>Cela ne prend qu'une minute depuis votre téléphone.</p>
  <p>À très bientôt,<br/>L'équipe LEON Location PRO</p>
</div>`

const signedBody = `<div style="${STYLE.wrap}">
  <t t-set="order" t-value="object"/>
  <p>Bonjour <t t-out="object.partner_id.name or ''"/>,</p>
  <p>Vous trouverez ci-joint votre <b>contrat de location signé</b> ainsi que les <b>photos de l'état des lieux</b> réalisé à la remise des clés.</p>
  <table style="border-collapse:collapse;margin:12px 0">${dates}</table>
  <p>Bonne route et profitez bien de La Réunion !<br/>L'équipe LEON Location PRO</p>
</div>`

const invoiceReport = await ref('account.account_invoices')
const tplValues = (name, model, subject, body, extra = {}) => ({
  name,
  model_id: undefined,
  subject,
  body_html: body,
  partner_to: '{{ object.partner_id.id }}',
  email_from: '{{ (object.company_id.email_formatted or user.email_formatted) }}',
  lang: '{{ object.partner_id.lang }}',
  auto_delete: false,
  ...extra,
  _model: model,
})
const templates = {}
for (const t of [
  tplValues('LEON — Réservation confirmée + facture', 'account.move', 'Votre réservation est confirmée — LEON Location PRO', confirmationBody, { report_template_ids: [[6, 0, [invoiceReport]]] }),
  tplValues('LEON — Rappel documents', 'sale.order', 'Il nous manque vos documents — réservation {{ object.name }}', reminderBody),
  tplValues('LEON — Contrat signé et état des lieux', 'sale.order', 'Votre contrat de location {{ object.name }} — LEON Location PRO', signedBody),
]) {
  const { _model, ...values } = t
  values.model_id = await modelId(_model)
  templates[t.name] = await ensure('mail.template', [['name', '=', t.name]], values)
}
log('modèles d\'e-mails', JSON.stringify(templates))

// ─── 7. Automatisations ───
const saleModel = await modelId('sale.order')
await ensure('base.automation', [['name', '=', 'LEON — Rappel documents J-3']], {
  name: 'LEON — Rappel documents J-3',
  model_id: saleModel,
  trigger: 'on_time',
  trg_date_id: await fieldId('sale.order', 'rental_start_date'),
  trg_date_range: 3,
  trg_date_range_mode: 'before',
  trg_date_range_type: 'day',
  filter_domain: "[('state', '=', 'sale'), ('x_docs_status', '=', 'missing')]",
  action_server_ids: [[5, 0, 0], [0, 0, {
    name: 'Envoyer le rappel documents', model_id: saleModel, usage: 'base_automation',
    state: 'mail_post', mail_post_method: 'email', template_id: templates['LEON — Rappel documents'],
  }]],
})
const signModel = await modelId('sign.request')
await ensure('base.automation', [['name', '=', 'LEON — Contrat signé : envoi au client']], {
  name: 'LEON — Contrat signé : envoi au client',
  model_id: signModel,
  trigger: 'on_create_or_write',
  trigger_field_ids: [[6, 0, [await fieldId('sign.request', 'state')]]],
  filter_pre_domain: "[('state', '!=', 'signed')]",
  filter_domain: "[('state', '=', 'signed')]",
  action_server_ids: [[5, 0, 0], [0, 0, {
    name: 'Envoyer contrat signé + photos', model_id: signModel, usage: 'base_automation', state: 'code',
    code: `for req in records:
    order = env['sale.order'].search([('x_sign_request_id', '=', req.id)], limit=1)
    if not order:
        continue
    photos = env['ir.attachment'].search([('res_model', '=', 'sale.order'), ('res_id', '=', order.id), ('mimetype', '=like', 'image/%')])
    files = req.completed_document_attachment_ids | photos
    env['mail.template'].browse(${templates['LEON — Contrat signé et état des lieux']}).send_mail(order.id, force_send=True, email_values={'attachment_ids': [(4, a.id) for a in files]})
    order.message_post(body="Contrat signé envoyé au client avec %s photo(s) de l'état des lieux." % len(photos))
`,
  }]],
})
log('automatisations')

console.log('\nConfiguration Odoo terminée. Le Worker retrouve ces éléments par leur nom : rien à recopier.')

// ─── 8. Synchronisation Parc automobile ↔ Location ───
// Véhicule remis au client → « En location » ; rendu ou réservation annulée → « Disponible ».
const fleetSyncCode = `etat_location = env['fleet.vehicle.state'].search([('name', '=', 'En location')], limit=1)
etat_dispo = env['fleet.vehicle.state'].search([('name', '=', 'Disponible')], limit=1)
for order in records:
    vehicles = env['fleet.vehicle']
    for line in order.order_line.filtered(lambda l: l.is_rental):
        lots = line.pickedup_lot_ids or line.reserved_lot_ids
        vehicles |= lots.mapped('x_fleet_vehicle_id') if lots else line.product_id.x_vehicule_parc_id
    if not vehicles:
        continue
    if order.rental_status == 'return' and etat_location:
        vehicles.write({'state_id': etat_location.id})
        order.message_post(body="Parc automobile : %s passé(s) « En location »." % ', '.join(vehicles.mapped('license_plate')))
    elif order.rental_status in ('returned', 'cancel') and etat_dispo:
        vehicles.write({'state_id': etat_dispo.id})
`
await ensure('base.automation', [['name', '=', 'LEON — Parc automobile synchronisé avec la location']], {
  name: 'LEON — Parc automobile synchronisé avec la location',
  model_id: saleModel,
  trigger: 'on_create_or_write',
  trigger_field_ids: [[6, 0, [await fieldId('sale.order', 'rental_status')]]],
  action_server_ids: [[5, 0, 0], [0, 0, {
    name: 'Mettre à jour l\'état des véhicules', model_id: saleModel, usage: 'base_automation', state: 'code', code: fleetSyncCode,
  }]],
})
log('synchronisation parc ↔ location')
