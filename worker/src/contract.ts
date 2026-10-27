// Contrat de location pré-rempli (PDF) + demande de signature Odoo Sign.
// Le contrat est créé dès la confirmation : le personnel le complète et le fait
// signer sur la tablette au moment de l'état des lieux.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { execute, type Env } from './odoo'
import { toBase64 } from './util'

export interface ContractData {
  orderName: string
  customer: { name: string; email: string; phone: string; address: string }
  vehicle: string
  plate: string
  start: string
  end: string
  pickupPlace: string
  options: string[]
  total: string
  paymentMode: string
  deposit: string
  depositMode: string
}

/** Zone à remplir dans Odoo Sign (coordonnées en points PDF, origine en haut à gauche). */
interface Field {
  kind: 'signature' | 'text' | 'textarea' | 'date'
  role: 'Customer' | 'Employee'
  name: string
  x: number
  y: number
  w: number
  h: number
}

const W = 595.28
const H = 841.89
const MARGIN = 48
const BLUE = rgb(0, 0.667, 1)
const INK = rgb(0.05, 0.05, 0.05)
const GREY = rgb(0.42, 0.45, 0.5)

/** Les polices PDF standard ne couvrent que l'alphabet latin : on remplace le reste. */
const EXTRA = new Set([...'€—–‘’“”•…«»ŒœŸ'])
const safe = (s: string) => [...s.normalize('NFC')].map((c) => (c.charCodeAt(0) <= 0xff || EXTRA.has(c) ? c : '?')).join('')

export async function buildContractPdf(d: ContractData): Promise<{ pdf: Uint8Array; fields: Field[] }> {
  const doc = await PDFDocument.create()
  doc.setTitle(`Contrat de location ${d.orderName}`)
  const page = doc.addPage([W, H])
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  let y = MARGIN

  const text = (p: PDFPage, s: string, x: number, top: number, size = 9.5, font: PDFFont = regular, color = INK) =>
    p.drawText(safe(s), { x, y: H - top - size, size, font, color })

  // En-tête
  page.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: BLUE })
  text(page, 'LEON LOCATION PRO', MARGIN, y, 18, bold)
  text(page, 'Location de véhicules — La Réunion', MARGIN, y + 22, 9, regular, GREY)
  text(page, 'CONTRAT DE LOCATION', W - MARGIN - bold.widthOfTextAtSize('CONTRAT DE LOCATION', 13), y + 2, 13, bold, BLUE)
  text(page, `N° ${d.orderName}`, W - MARGIN - bold.widthOfTextAtSize(`N° ${d.orderName}`, 10), y + 20, 10, bold)
  y += 52

  const section = (title: string) => {
    page.drawRectangle({ x: MARGIN, y: H - y - 16, width: W - 2 * MARGIN, height: 16, color: rgb(0.94, 0.96, 0.98) })
    text(page, title.toUpperCase(), MARGIN + 6, y + 3.5, 9, bold, BLUE)
    y += 22
  }
  const row = (label: string, value: string, x = MARGIN, labelWidth = 110) => {
    text(page, label, x, y, 9, regular, GREY)
    text(page, value, x + labelWidth, y, 9.5, bold)
  }

  section('Le locataire')
  row('Nom', d.customer.name); y += 14
  row('Adresse', d.customer.address); y += 14
  row('Téléphone', d.customer.phone)
  row('E-mail', d.customer.email, 300, 50); y += 22

  section('Le véhicule et la location')
  row('Véhicule', d.vehicle); y += 14
  row('Immatriculation', d.plate); y += 14
  row('Départ', d.start)
  row('Retour', d.end, 300, 50); y += 14
  row('Lieu de remise', d.pickupPlace); y += 14
  row('Options', d.options.length ? d.options.join(', ') : 'Aucune'); y += 22

  section('Prix, paiement et caution')
  row('Montant TTC', d.total)
  row('Paiement', d.paymentMode, 300, 50); y += 14
  row('Caution', `${d.deposit} — ${d.depositMode} (non débitée sauf dommage)`); y += 22

  // État des lieux au départ : complété par le personnel sur la tablette
  section('État des lieux au départ (complété à la remise des clés)')
  const fields: Field[] = []
  text(page, 'Kilométrage', MARGIN, y + 4, 9, regular, GREY)
  fields.push({ kind: 'text', role: 'Employee', name: 'Kilométrage départ', x: MARGIN + 110, y, w: 120, h: 18 })
  text(page, 'Carburant', 300, y + 4, 9, regular, GREY)
  fields.push({ kind: 'text', role: 'Employee', name: 'Niveau de carburant', x: 360, y, w: 140, h: 18 })
  y += 26
  text(page, 'Observations', MARGIN, y + 4, 9, regular, GREY)
  fields.push({ kind: 'textarea', role: 'Employee', name: 'Observations état des lieux', x: MARGIN + 110, y, w: W - 2 * MARGIN - 110, h: 56 })
  y += 64
  text(page, 'Les photos de l\'état des lieux sont jointes au dossier et envoyées au locataire avec ce contrat.', MARGIN, y, 8, regular, GREY)
  y += 22

  section('Conditions principales')
  const terms = [
    'Le locataire déclare être titulaire d\'un permis de conduire valide et présente une pièce d\'identité en cours de validité.',
    'Le véhicule est restitué à la date, à l\'heure et au lieu convenus, avec le même niveau de carburant.',
    'La caution est restituée sous 5 à 7 jours ouvrés après le retour, sous réserve qu\'aucun dommage ne soit constaté.',
    'Annulation gratuite jusqu\'à 24 h avant le départ. Les conditions générales de vente complètes s\'appliquent.',
  ]
  for (const t of terms) {
    text(page, `•  ${t}`, MARGIN, y, 8.5)
    y += 13
  }
  y += 14

  section('Signatures')
  const half = (W - 2 * MARGIN - 20) / 2
  text(page, 'Pour LEON Location PRO', MARGIN, y, 9, bold)
  text(page, 'Le locataire — « Lu et approuvé »', MARGIN + half + 20, y, 9, bold)
  y += 16
  fields.push({ kind: 'signature', role: 'Employee', name: 'Signature loueur', x: MARGIN, y, w: half, h: 60 })
  fields.push({ kind: 'signature', role: 'Customer', name: 'Signature locataire', x: MARGIN + half + 20, y, w: half, h: 60 })
  y += 66
  text(page, 'Date', MARGIN + half + 20, y + 4, 9, regular, GREY)
  fields.push({ kind: 'date', role: 'Customer', name: 'Date de signature', x: MARGIN + half + 60, y, w: 120, h: 18 })

  for (const f of fields) {
    page.drawRectangle({ x: f.x, y: H - f.y - f.h, width: f.w, height: f.h, borderColor: rgb(0.8, 0.84, 0.88), borderWidth: 0.6 })
  }
  text(page, 'LEON Location PRO — La Réunion (974)', MARGIN, H - 30, 7.5, regular, GREY)

  return { pdf: await doc.save(), fields }
}

/**
 * Crée dans Odoo Sign le modèle (PDF + zones) et la demande de signature :
 * 1) le personnel (rôle « Employee ») complète l'état des lieux et signe,
 * 2) le client (rôle « Customer ») signe ensuite, sur la tablette.
 * Renvoie l'id de la demande et le lien de signature du client.
 */
export async function createSignRequest(env: Env, args: {
  orderId: number
  orderName: string
  customerPartnerId: number
  data: ContractData
  folderId: number | null
}): Promise<{ requestId: number; customerUrl: string }> {
  const { pdf, fields } = await buildContractPdf(args.data)
  const attachmentId = await execute<number>(env, 'ir.attachment', 'create', [{
    name: `Contrat ${args.orderName}.pdf`, raw: toBase64(pdf), mimetype: 'application/pdf',
  }])
  const templateId = await execute<number>(env, 'sign.template', 'create', [{
    name: `Contrat de location ${args.orderName}`,
    ...(args.folderId ? { folder_id: args.folderId } : {}),
  }])
  const documentId = await execute<number>(env, 'sign.document', 'create', [{ template_id: templateId, attachment_id: attachmentId }])

  const types = await execute<{ id: number; item_type: string; auto_field: string | false }[]>(env, 'sign.item.type', 'search_read', [[]], { fields: ['item_type', 'auto_field'] })
  const typeId = (kind: Field['kind']) => types.find((t) => t.item_type === kind && !t.auto_field)!.id
  const roles = await execute<{ id: number; name: string }[]>(env, 'sign.item.role', 'search_read', [[['name', 'in', ['Customer', 'Employee']]]], { fields: ['name'] })
  const roleId = (name: Field['role']) => roles.find((r) => r.name === name)!.id

  await execute(env, 'sign.item', 'create', [fields.map((f) => ({
    template_id: templateId,
    document_id: documentId,
    type_id: typeId(f.kind),
    responsible_id: roleId(f.role),
    name: f.name,
    required: true,
    page: 1,
    posX: f.x / W,
    posY: f.y / H,
    width: f.w / W,
    height: f.h / H,
    alignment: 'left',
  }))])

  // Le « loueur » est l'utilisateur Odoo propriétaire de la clé API
  const [me] = await execute<{ partner_id: [number, string] }[]>(env, 'res.users', 'search_read', [[['login', '=', env.ODOO_LOGIN]]], { fields: ['partner_id'] })
  const requestId = await execute<number>(env, 'sign.request', 'create', [{
    template_id: templateId,
    reference: `Contrat ${args.orderName}`,
    reference_doc: `sale.order,${args.orderId}`,
    request_item_ids: [
      [0, 0, { partner_id: me.partner_id[0], role_id: roleId('Employee'), mail_sent_order: 1 }],
      [0, 0, { partner_id: args.customerPartnerId, role_id: roleId('Customer'), mail_sent_order: 2 }],
    ],
  }], { context: { no_sign_mail: true } })

  const items = await execute<{ id: number; partner_id: [number, string]; access_token: string }[]>(env, 'sign.request.item', 'search_read', [[['sign_request_id', '=', requestId]]], { fields: ['partner_id', 'access_token'] })
  const customerItem = items.find((i) => i.partner_id[0] === args.customerPartnerId)
  return { requestId, customerUrl: customerItem ? `${env.ODOO_URL}/sign/document/${requestId}/${customerItem.access_token}` : '' }
}
