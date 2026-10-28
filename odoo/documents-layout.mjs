// Mise en forme des documents Odoo (factures) à l'image des modèles LEON Location PRO.
// Lancer : node odoo/documents-layout.mjs  (relançable sans risque)
import { call, ref } from './odoo-rpc.mjs'

const NAVY = '#1F3A5F'
const LIGHT = '#B8CCE4'

// 1. Coordonnées de l'entreprise (reprises des modèles fournis)
await call('res.company', 'write', [[1], {
  street: '8 ruelle boulot',
  zip: '97400',
  city: 'Saint-Denis',
  phone: '06 92 94 55 97',
  company_registry: '943 641 910',
  report_header: false,
  company_details: `<div><b>LEON LOCATION PRO</b></div><div><i>Voyagez sans limites, nous avons la voiture qu'il vous faut.</i></div><div>8 ruelle boulot</div><div>97400 SAINT DENIS</div><div>Numéro de SIRET : 943 641 910</div><div>Téléphone : 06 92 94 55 97 ou 06 93 50 28 23</div>`,
  report_footer: `<p style="text-align:center"><i>En cas de questions sur la facture, n'hésitez pas à nous contacter au <b>0693 50 28 23</b> ou <b>0692 94 55 97</b> !</i></p><p style="text-align:center;color:${NAVY}"><b>MERCI À VOUS !</b></p>`,
  primary_color: NAVY,
  secondary_color: LIGHT,
  font: 'Lato',
}])
console.log('• coordonnées et couleurs de l\'entreprise')

// 2. Facture : encadrés « Informations sur la location » et « Lieu de livraison »
const box = `border:1px solid ${LIGHT};border-radius:4px;margin-bottom:14px`
const head = `background:${LIGHT};color:${NAVY};font-weight:bold;padding:5px 10px;font-size:12px`
const cell = 'padding:6px 10px;vertical-align:top'
const label = `color:${NAVY};font-size:11px`
const arch = `<data>
  <xpath expr="//div[@id='informations']" position="after">
    <t t-set="leon_order" t-value="o.line_ids.sale_line_ids.order_id[:1]"/>
    <t t-if="leon_order and leon_order.is_rental_order">
      <div style="${box}">
        <div style="${head}">Informations sur la location</div>
        <table style="width:100%"><tr>
          <td style="${cell}"><div style="${label}">Référence de la réservation</div><b t-out="leon_order.name"/></td>
          <td style="${cell}"><div style="${label}">Début de la location</div><span t-out="leon_order.rental_start_date" t-options="{'widget': 'datetime', 'format': 'dd/MM/yyyy HH:mm', 'tz_name': 'Indian/Reunion'}"/></td>
          <td style="${cell}"><div style="${label}">Fin de la location</div><span t-out="leon_order.rental_return_date" t-options="{'widget': 'datetime', 'format': 'dd/MM/yyyy HH:mm', 'tz_name': 'Indian/Reunion'}"/></td>
          <td style="${cell}"><div style="${label}">Nombre de jours</div><span t-out="leon_order.duration_days + (1 if leon_order.remaining_hours else 0)"/></td>
          <td style="${cell}"><div style="${label}">Date de la facture</div><span t-field="o.invoice_date"/></td>
        </tr></table>
      </div>
      <div style="${box}" t-if="leon_order.carrier_id">
        <div style="${head}">Lieu de livraison de la voiture</div>
        <table style="width:100%"><tr>
          <td style="${cell};width:50%"><div style="${label}">Lieu spécifique</div><span t-out="leon_order.carrier_id.name"/></td>
          <td style="${cell}"><div style="${label}">Lieu personnalisé</div><span t-out="leon_order.x_lieu_detail or '—'"/></td>
        </tr></table>
      </div>
    </t>
  </xpath>
  <xpath expr="//table[@name='invoice_line_table']" position="attributes">
    <attribute name="style">border:1px solid ${LIGHT};</attribute>
  </xpath>
</data>`
const name = 'leon.report_invoice_document.location'
const existing = await call('ir.ui.view', 'search', [[['name', '=', name]]])
const vals = { name, type: 'qweb', inherit_id: await ref('account.report_invoice_document'), arch }
existing.length ? await call('ir.ui.view', 'write', [existing, vals]) : await call('ir.ui.view', 'create', [vals])
console.log('• facture : encadrés location et livraison')
