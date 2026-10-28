// Contrat de location pré-rempli (PDF, mise en page du modèle LEON Location PRO)
// + demande de signature Odoo Sign.
// Page 1 « Début de location » (complétée et signée sur la tablette), pages suivantes : conditions générales.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from 'pdf-lib'
import { CGV } from './cgv'
import { LOGO_PNG_BASE64 } from './logo'
import { execute, type Env } from './odoo'
import { toBase64 } from './util'

/** Coordonnées imprimées sur le contrat — à modifier ici si besoin. */
export const COMPANY = {
  name: 'LEON LOCATION PRO',
  tagline: 'Voyagez sans limites, nous avons la voiture qu’il vous faut.',
  address: ['8 ruelle boulot', '97400 SAINT DENIS'],
  siret: '943 641 910',
  phones: '06 92 94 55 97 ou 06 93 50 28 23',
  assistance: '+262 2 62 20 48 48',
  signatory: 'Mathieu LEON',
}

export interface ContractData {
  orderName: string
  customer: { firstName: string; lastName: string; email: string; phone: string; address: string }
  vehicle: { product: string; plate: string; fuel: string; color: string; category: string }
  start: string
  end: string
  days: string
  pickupPlace: string
  customPlace: string
  options: string[]
}

/** Zone à remplir dans Odoo Sign (points PDF, origine en haut à gauche). */
interface Field {
  kind: 'signature' | 'text' | 'textarea' | 'date'
  role: 'Customer' | 'Employee'
  name: string
  page: number
  x: number
  y: number
  w: number
  h: number
  required: boolean
}

const W = 595.28
const H = 841.89
const M = 48
const NAVY = rgb(0.12, 0.23, 0.37)
const BAND = rgb(0.2, 0.25, 0.3)
const BAND_TEXT = rgb(0.86, 0.9, 0.94)
const LIGHT = rgb(0.72, 0.8, 0.89)
const BORDER = rgb(0.62, 0.66, 0.71)
const INK = rgb(0.1, 0.1, 0.1)
const GREY = rgb(0.38, 0.4, 0.44)

/** Les polices PDF standard ne couvrent que l'alphabet latin : on remplace le reste. */
const EXTRA = new Set([...'€—–‘’“”•…«»ŒœŸ−'])
const safe = (s: string) => [...s.normalize('NFC')].map((c) => (c === '−' ? '-' : c.charCodeAt(0) <= 0xff || EXTRA.has(c) ? c : '?')).join('')

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of safe(text).split(/\s+/)) {
    const next = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(next, size) > width && line) {
      lines.push(line)
      line = word
    } else line = next
  }
  if (line) lines.push(line)
  return lines
}

export async function buildContractPdf(d: ContractData): Promise<{ pdf: Uint8Array; fields: Field[] }> {
  const doc = await PDFDocument.create()
  doc.setTitle(`Contrat de location ${d.orderName}`)
  const f = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    italic: await doc.embedFont(StandardFonts.HelveticaOblique),
  }
  const logo = await doc.embedPng(Uint8Array.from(atob(LOGO_PNG_BASE64), (c) => c.charCodeAt(0)))
  const fields: Field[] = []

  const text = (p: PDFPage, s: string, x: number, top: number, size: number, font: PDFFont = f.regular, color: RGB = INK) =>
    p.drawText(safe(s), { x, y: H - top - size * 0.8, size, font, color })
  const centered = (p: PDFPage, s: string, cx: number, top: number, size: number, font: PDFFont = f.regular, color: RGB = INK) =>
    text(p, s, cx - font.widthOfTextAtSize(safe(s), size) / 2, top, size, font, color)
  const rect = (p: PDFPage, x: number, top: number, w: number, h: number, opts: { fill?: RGB; border?: RGB; width?: number } = {}) =>
    p.drawRectangle({ x, y: H - top - h, width: w, height: h, color: opts.fill, borderColor: opts.border, borderWidth: opts.border ? (opts.width ?? 0.6) : 0 })
  const bands = (p: PDFPage, title: string, size: number) => {
    rect(p, 0, 0, W, 62, { fill: BAND })
    for (let i = 0; i < 6; i++) rect(p, 0, 62 - i * 10, W, 1, { fill: rgb(0.25 + i * 0.01, 0.3, 0.36) })
    centered(p, title, W / 2, 22, size, f.regular, BAND_TEXT)
    rect(p, 0, H - 26, W, 26, { fill: BAND })
  }

  /** Tableau : bandeau de titres bleu clair + une ligne de valeurs (texte, ou zone à remplir sur la tablette). */
  const table = (p: PDFPage, page: number, title: string, top: number, x0: number, cols: { label: string; width: number; value?: string; field?: Omit<Field, 'page' | 'x' | 'y' | 'w' | 'h'> }[], rowH = 22) => {
    text(p, title, x0, top, 7.5, f.bold)
    let x = x0
    const headTop = top + 11
    for (const c of cols) {
      rect(p, x, headTop, c.width, 18, { fill: LIGHT, border: BORDER })
      const lines = wrap(c.label, f.regular, 7.5, c.width - 6)
      lines.forEach((l, i) => centered(p, l, x + c.width / 2, headTop + (lines.length > 1 ? 2.5 : 6) + i * 8, 7.5))
      rect(p, x, headTop + 18, c.width, rowH, { border: BORDER })
      if (c.value !== undefined) {
        const lines2 = wrap(c.value || '—', f.regular, 7.5, c.width - 6).slice(0, 2)
        lines2.forEach((l, i) => centered(p, l, x + c.width / 2, headTop + 18 + (lines2.length > 1 ? 4 : rowH / 2 - 3.5) + i * 9, 7.5))
      }
      if (c.field) fields.push({ ...c.field, page, x: x + 3, y: headTop + 21, w: c.width - 6, h: rowH - 6 })
      x += c.width
    }
    return headTop + 18 + rowH
  }

  // ─── Page 1 : début de location ───
  const p1 = doc.addPage([W, H])
  bands(p1, 'CONTRAT DE LOCATION', 22)
  p1.drawImage(logo, { x: W - M - 165, y: H - 30 - 165, width: 165, height: 165 })
  text(p1, COMPANY.name, M, 76, 26, f.bold, NAVY)
  text(p1, COMPANY.tagline, M, 108, 7.5, f.italic)
  ;[...COMPANY.address, `Numéro de SIRET : ${COMPANY.siret}`, `Téléphone : ${COMPANY.phones}`].forEach((l, i) => text(p1, l, M, 124 + i * 10.5, 7.5))

  text(p1, 'Contrat de location pour :', M, 184, 7.5, f.bold)
  const c = d.customer
  ;[['Nom :', c.lastName], ['Prénom :', c.firstName], ['Adresse mail :', c.email], ['Téléphone :', c.phone], ['Adresse :', c.address]].forEach(([k, v], i) => {
    text(p1, k, M, 198 + i * 10.5, 7.5)
    text(p1, v, M + 92, 198 + i * 10.5, 7.5)
  })

  rect(p1, 360, 204, W - M - 360, 34, { border: INK, width: 1.1 })
  centered(p1, 'ASSISTANCE 24H /24', (360 + W - M) / 2, 212, 8, f.bold)
  centered(p1, `N° ${COMPANY.assistance}`, (360 + W - M) / 2, 224, 8, f.bold)

  const licence = (label: string, x: number, top: number, name: string, required: boolean, labelW: number) => {
    text(p1, label, x, top + 2, 7.5)
    fields.push({ kind: 'text', role: 'Employee', name, page: 1, x: x + labelW, y: top - 1, w: 112, h: 12, required })
  }
  licence('N° de permis de conduire :', M, 266, 'N° de permis de conduire', true, 98)
  licence('Date de délivrance :', M, 280, 'Date de délivrance du permis', true, 98)
  licence('N° de permis 2nd conducteur :', 300, 266, 'N° de permis 2nd conducteur', false, 120)
  licence('Date de délivrance 2nd conducteur :', 300, 280, 'Date de délivrance 2nd conducteur', false, 120)

  centered(p1, 'Début de location', W / 2, 306, 17, f.bold)

  const full = W - 2 * M
  let y = table(p1, 1, 'Informations sur la location :', 334, M, [
    { label: 'Référence du contrat', width: full * 0.17, value: d.orderName },
    { label: 'Début de la location', width: full * 0.23, value: d.start },
    { label: 'Fin de la location', width: full * 0.23, value: d.end },
    { label: 'Nombre de jours', width: full * 0.17, value: d.days },
    { label: 'Date du contrat', width: full * 0.2, field: { kind: 'date', role: 'Customer', name: 'Date du contrat', required: true } },
  ])
  y = table(p1, 1, 'Information sur le véhicule :', y + 12, M, [
    { label: 'Véhicule', width: full * 0.24, value: d.vehicle.product },
    { label: 'Immatriculation', width: full * 0.18, value: d.vehicle.plate },
    { label: 'Type Carburant', width: full * 0.2, value: d.vehicle.fuel },
    { label: 'Couleur', width: full * 0.18, value: d.vehicle.color },
    { label: 'Catégorie', width: full * 0.2, value: d.vehicle.category },
  ])
  y = table(p1, 1, 'Options de locations :', y + 12, M, [
    { label: 'Lieu spécifique', width: full * 0.33, value: d.pickupPlace },
    { label: 'Lieu personnalisé', width: full * 0.34, value: d.customPlace },
    { label: 'Options du véhicule', width: full * 0.33, value: d.options.join(', ') || 'Aucune' },
  ], 26)
  const check = (label: string, w: number) => ({ label, width: full * w, field: { kind: 'text' as const, role: 'Employee' as const, name: label, required: true } })
  y = table(p1, 1, 'Vérification du véhicule :', y + 12, M, [
    check('Roue de secours', 0.15), check('Niveau de liquide', 0.17), check('Kit de sécurité', 0.19),
    check('Outils', 0.16), check('Parcel Shelf', 0.16), check('Éléments sous capot', 0.17),
  ])

  // Kilométrage / carburant + observations, et schéma du véhicule
  const kmTop = y + 18
  const kmEnd = table(p1, 1, '', kmTop - 11, M, [
    { label: 'Kilométrage départ', width: 120, field: { kind: 'text', role: 'Employee', name: 'Kilométrage départ', required: true } },
    { label: 'Carburant au Départ', width: 120, field: { kind: 'text', role: 'Employee', name: 'Carburant au départ', required: true } },
  ])
  text(p1, 'Dommages constatés au départ :', M, kmEnd + 8, 7.5, f.bold)
  rect(p1, M, kmEnd + 20, 240, 44, { border: BORDER })
  fields.push({ kind: 'textarea', role: 'Employee', name: 'Dommages constatés au départ', page: 1, x: M + 3, y: kmEnd + 23, w: 234, h: 38, required: false })
  drawCarDiagram(p1, 345, kmTop - 6, 200, 118)

  // Déclaration + signatures
  const decl = 'Je déclare avoir reçu et lu le présent contrat et ses conditions générales. En signant ce document, j’accepte les termes du contrat et de ses conditions générales. Je suis d’accord avec l’état du véhicule tel qu’indiqué sur la fiche de départ et reconnais son exactitude. En cas de paiement par carte de crédit, j’autorise, par ma signature, à débiter ma carte de crédit de la totalité du montant ainsi que de tous frais additionnels liés au contrat, à des infractions ou à des dommages occasionnés lors de cette location. Je déclare être responsable de toutes les infractions au code de la route pendant la période de location du véhicule.'
  const declTop = 712
  wrap(decl, f.italic, 6, full).forEach((l, i) => text(p1, l, M, declTop + i * 7.5, 6, f.italic, GREY))
  fields.push({ kind: 'signature', role: 'Employee', name: 'Signature du loueur', page: 1, x: M, y: 748, w: 140, h: 36, required: true })
  fields.push({ kind: 'signature', role: 'Customer', name: 'Signature du locataire', page: 1, x: W - M - 170, y: 748, w: 170, h: 36, required: true })
  text(p1, COMPANY.signatory, M, 792, 7.5)
  centered(p1, '1', W / 2, 792, 7.5)
  text(p1, `${c.firstName} ${c.lastName.toUpperCase()}`, W - M - 170, 792, 7.5, f.bold)
  fields.push({ kind: 'date', role: 'Customer', name: 'Date de signature', page: 1, x: W - M - 60, y: 789, w: 60, h: 12, required: true })

  // ─── Pages suivantes : conditions générales sur deux colonnes ───
  const colW = (full - 20) / 2
  const top0 = 92
  const bottom = H - 60
  let pageNo = 1
  let page = newCgvPage()
  let col = 0
  let cy = top0
  function newCgvPage() {
    const p = doc.addPage([W, H])
    pageNo++
    bands(p, 'CONTRAT DE LOCATION : CONDITIONS GÉNÉRALES', 17)
    centered(p, String(pageNo), W / 2, H - 46, 7.5, f.regular, GREY)
    return p
  }
  const ensure = (h: number) => {
    if (cy + h <= bottom) return
    if (col === 0) {
      col = 1
      cy = top0
    } else {
      page = newCgvPage()
      col = 0
      cy = top0
    }
  }
  const cx = () => M + col * (colW + 20)
  for (const article of CGV) {
    const titleLines = wrap(article.title, f.bold, 8.5, colW)
    ensure(18 + titleLines.length * 11)
    cy += 6
    for (const t of titleLines) {
      text(page, t, cx(), cy, 8.5, f.bold, NAVY)
      page.drawLine({ start: { x: cx(), y: H - cy - 9 }, end: { x: cx() + f.bold.widthOfTextAtSize(t, 8.5), y: H - cy - 9 }, thickness: 0.5, color: NAVY })
      cy += 11
    }
    cy += 4
    for (const para of article.body) {
      const bullet = para.startsWith('• ')
      const indent = bullet ? 10 : 0
      const lines = wrap(bullet ? para.slice(2) : para, f.regular, 7.3, colW - indent)
      for (let i = 0; i < lines.length; i++) {
        ensure(9.5)
        if (bullet && i === 0) text(page, '•', cx() + 2, cy, 7.3)
        text(page, lines[i], cx() + indent, cy, 7.3)
        cy += 9.5
      }
      cy += 4
    }
  }

  return { pdf: await doc.save({ useObjectStreams: false }), fields }

  /** Schéma de véhicule vu de dessus (pour repérer les dommages, comme sur la fiche papier). */
  function drawCarDiagram(p: PDFPage, x: number, top: number, w: number, h: number) {
    const s = (px: number, py: number) => ({ x: x + px * w, y: H - (top + py * h) })
    const line = (a: [number, number], b: [number, number]) => p.drawLine({ start: s(...a), end: s(...b), thickness: 0.8, color: GREY })
    const box = (x1: number, y1: number, x2: number, y2: number) => { line([x1, y1], [x2, y1]); line([x2, y1], [x2, y2]); line([x2, y2], [x1, y2]); line([x1, y2], [x1, y1]) }
    box(0.08, 0.18, 0.92, 0.82) // carrosserie
    box(0.2, 0.26, 0.36, 0.74) // pare-brise
    box(0.72, 0.28, 0.82, 0.72) // lunette arrière
    box(0.36, 0.22, 0.72, 0.78) // toit
    line([0.54, 0.18], [0.54, 0.82])
    for (const [cxx, cyy] of [[0.25, 0.1], [0.75, 0.1], [0.25, 0.9], [0.75, 0.9]] as [number, number][]) {
      p.drawEllipse({ ...s(cxx, cyy), xScale: w * 0.06, yScale: h * 0.08, borderColor: GREY, borderWidth: 0.8 })
    }
    p.drawEllipse({ ...s(0.04, 0.5), xScale: w * 0.025, yScale: h * 0.12, borderColor: GREY, borderWidth: 0.8 })
    p.drawEllipse({ ...s(0.96, 0.5), xScale: w * 0.025, yScale: h * 0.12, borderColor: GREY, borderWidth: 0.8 })
  }
}

/**
 * Crée dans Odoo Sign le modèle (PDF + zones) et la demande de signature :
 * 1) le personnel (rôle « Employee ») complète permis, vérifications, kilométrage et signe,
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

  await execute(env, 'sign.item', 'create', [fields.map((fl) => ({
    template_id: templateId,
    document_id: documentId,
    type_id: typeId(fl.kind),
    responsible_id: roleId(fl.role),
    name: fl.name,
    required: fl.required,
    page: fl.page,
    posX: fl.x / W,
    posY: fl.y / H,
    width: fl.w / W,
    height: fl.h / H,
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
