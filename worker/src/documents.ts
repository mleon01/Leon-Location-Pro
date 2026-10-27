// Dépôt sécurisé du permis de conduire et de la pièce d'identité.
// Les fichiers ne sont jamais stockés par le Worker : ils sont transmis directement à Odoo,
// dans le dossier Documents « Location — Pièces clients », rattachés à la fiche du client.
import type { DepositMode, DocumentKind, DocumentsStatus } from '../../shared/api'
import { currentUid, execute, type Env } from './odoo'
import { HttpError, toBase64 } from './util'

export const DOCUMENT_LABELS: Record<DocumentKind, string> = {
  permis_recto: 'Permis de conduire (recto)',
  permis_verso: 'Permis de conduire (verso)',
  identite_recto: "Pièce d'identité (recto)",
  identite_verso: "Pièce d'identité (verso)",
}
const KINDS = Object.keys(DOCUMENT_LABELS) as DocumentKind[]
const MAX_BYTES = 10 * 1024 * 1024

/** Types acceptés, vérifiés sur le contenu réel du fichier (et pas seulement son nom). */
function detectType(bytes: Uint8Array): { mime: string; ext: string } | null {
  const b = (i: number) => bytes[i]
  const ascii = (from: number, len: number) => String.fromCharCode(...bytes.subarray(from, from + len))
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return { mime: 'image/jpeg', ext: 'jpg' }
  if (b(0) === 0x89 && ascii(1, 3) === 'PNG') return { mime: 'image/png', ext: 'png' }
  if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') return { mime: 'image/webp', ext: 'webp' }
  if (ascii(0, 5) === '%PDF-') return { mime: 'application/pdf', ext: 'pdf' }
  if (ascii(4, 4) === 'ftyp' && /^(heic|heix|hevc|mif1|msf1)$/.test(ascii(8, 4))) return { mime: 'image/heic', ext: 'heic' }
  return null
}

interface DocOrder {
  id: number
  name: string
  partner_id: [number, string]
  rental_start_date: string
  x_caution_mode: DepositMode | false
  x_caution_amount: number
  x_docs_status: string | false
}

async function context(env: Env, orderId: number) {
  const [order] = await execute<DocOrder[]>(env, 'sale.order', 'read', [[orderId], ['name', 'partner_id', 'rental_start_date', 'x_caution_mode', 'x_caution_amount', 'x_docs_status']])
  if (!order) throw new HttpError(404, 'Réservation introuvable.')
  const [folder] = await execute<number[]>(env, 'documents.document', 'search', [[['type', '=', 'folder'], ['name', '=', 'Location — Pièces clients']]], { limit: 1 })
  if (!folder) throw new HttpError(503, 'Le dossier Documents « Location — Pièces clients » est introuvable dans Odoo.')
  return { order, folder }
}

const docName = (orderName: string, kind: DocumentKind) => `${orderName} — ${DOCUMENT_LABELS[kind]}`

async function existing(env: Env, order: DocOrder, folder: number) {
  const docs = await execute<{ id: number; name: string }[]>(env, 'documents.document', 'search_read', [
    [['folder_id', '=', folder], ['partner_id', '=', order.partner_id[0]], ['name', '=like', `${order.name} — %`]],
  ], { fields: ['name'] })
  return KINDS.map((kind) => ({ kind, ids: docs.filter((d) => d.name.startsWith(docName(order.name, kind))).map((d) => d.id) }))
}

export async function documentsStatus(env: Env, orderId: number): Promise<DocumentsStatus> {
  const { order, folder } = await context(env, orderId)
  const uploaded = (await existing(env, order, folder)).filter((x) => x.ids.length).map((x) => x.kind)
  return {
    orderName: order.name,
    customerFirstName: order.partner_id[1].replace(/^(M\.|Mme)\s+/, '').split(' ')[0],
    start: order.rental_start_date,
    depositMode: order.x_caution_mode || 'tpe',
    depositAmount: order.x_caution_amount,
    uploaded,
    complete: KINDS.every((k) => uploaded.includes(k)),
  }
}

export async function uploadDocument(env: Env, orderId: number, request: Request): Promise<DocumentsStatus> {
  const form = await request.formData().catch(() => null)
  const kind = form?.get('kind')
  const file = form?.get('file')
  if (typeof kind !== 'string' || !KINDS.includes(kind as DocumentKind)) throw new HttpError(400, 'Type de document inconnu.')
  if (!file || typeof file === 'string') throw new HttpError(400, 'Aucun fichier reçu.')
  if (file.size > MAX_BYTES) throw new HttpError(413, 'Fichier trop lourd (10 Mo maximum).')
  const bytes = new Uint8Array(await file.arrayBuffer())
  const type = detectType(bytes)
  if (!type) throw new HttpError(415, 'Format non accepté : envoyez une photo (JPG, PNG, HEIC) ou un PDF.')

  const { order, folder } = await context(env, orderId)
  const k = kind as DocumentKind
  const previous = (await existing(env, order, folder)).find((x) => x.kind === k)!.ids
  if (previous.length) await execute(env, 'documents.document', 'unlink', [previous])

  const name = `${docName(order.name, k)}.${type.ext}`
  const attachmentId = await execute<number>(env, 'ir.attachment', 'create', [{ name, raw: toBase64(bytes), mimetype: type.mime }])
  await execute(env, 'documents.document', 'create', [{
    name, type: 'binary', attachment_id: attachmentId, folder_id: folder, partner_id: order.partner_id[0], access_via_link: 'none',
  }])

  const status = await documentsStatus(env, orderId)
  if (status.complete && order.x_docs_status === 'missing') {
    await execute(env, 'sale.order', 'write', [[orderId], { x_docs_status: 'received' }])
    const [todo] = await execute<number[]>(env, 'mail.activity.type', 'search', [[['category', '=', 'default'], ['name', 'in', ['To-Do', 'À faire', 'To Do']]]], { limit: 1 })
    const [model] = await execute<number[]>(env, 'ir.model', 'search', [[['model', '=', 'sale.order']]])
    await execute(env, 'mail.activity', 'create', [{
      res_model_id: model, res_id: orderId, user_id: await currentUid(env),
      summary: "Vérifier le permis et la pièce d'identité du client",
      note: 'Documents disponibles dans Documents › Location — Pièces clients. Passez « Documents du client » à « Validés » une fois vérifiés.',
      ...(todo ? { activity_type_id: todo } : {}),
    }]).catch(() => null)
    await execute(env, 'sale.order', 'message_post', [[orderId]], {
      body: 'Le client a déposé son permis et sa pièce d\'identité (dossier Documents « Location — Pièces clients »).',
      message_type: 'comment', subtype_xmlid: 'mail.mt_note',
    }).catch(() => null)
  }
  return status
}
