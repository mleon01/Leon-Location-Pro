import { useState } from 'react'
import type { DocumentKind, DocumentsStatus } from '../../shared/api'
import { data } from '../data/provider'

// Dépôt du permis et de la pièce d'identité (recto / verso), depuis le téléphone ou l'ordinateur.

const ITEMS: { kind: DocumentKind; label: string; icon: string }[] = [
  { kind: 'permis_recto', label: 'Permis de conduire — recto', icon: 'fa-id-card-o' },
  { kind: 'permis_verso', label: 'Permis de conduire — verso', icon: 'fa-id-card-o' },
  { kind: 'identite_recto', label: "Pièce d'identité — recto", icon: 'fa-user-circle-o' },
  { kind: 'identite_verso', label: "Pièce d'identité — verso", icon: 'fa-user-circle-o' },
]
const MAX = 10 * 1024 * 1024

export function DocumentsUploader({ docsRef, status, onChange }: { docsRef: string; status: DocumentsStatus; onChange(s: DocumentsStatus): void }) {
  const [busy, setBusy] = useState<DocumentKind | null>(null)
  const [error, setError] = useState('')

  async function upload(kind: DocumentKind, file: File | undefined) {
    if (!file) return
    setError('')
    if (file.size > MAX) return setError('Ce fichier dépasse 10 Mo. Prenez une photo un peu moins lourde.')
    setBusy(kind)
    try {
      onChange(await data.uploadDocument(docsRef, kind, file))
    } catch (e) {
      setError(e instanceof Error ? e.message : "L'envoi a échoué, réessayez.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        {ITEMS.map(({ kind, label, icon }) => {
          const done = status.uploaded.includes(kind)
          return (
            <label
              key={kind}
              className={`flex cursor-pointer items-center gap-4 rounded border p-4 transition ${done ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-white/15 hover:border-brand'} ${busy ? 'pointer-events-none' : ''}`}
            >
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${done ? 'bg-emerald-500 text-white' : 'bg-white/10 text-brand'}`}>
                <i className={`fa ${busy === kind ? 'fa-spinner fa-spin' : done ? 'fa-check' : icon} text-lg`} />
              </span>
              <span className="flex-1">
                <span className="block font-semibold">{label}</span>
                <span className="text-sm text-muted">{busy === kind ? 'Envoi en cours…' : done ? 'Reçu — toucher pour remplacer' : 'Prendre une photo ou choisir un fichier'}</span>
              </span>
              <input
                type="file"
                accept="image/*,application/pdf"
                className="sr-only"
                disabled={!!busy}
                onChange={(e) => {
                  upload(kind, e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </label>
          )
        })}
      </div>
      {error && <p className="mt-3 border border-alert/50 bg-alert/10 p-3 text-sm" role="alert">{error}</p>}
      <p className="mt-3 text-xs text-muted">
        <i className="fa fa-lock mr-1" /> Vos documents sont transmis de façon chiffrée et conservés uniquement dans notre logiciel de gestion, accessible à l'équipe LEON Location PRO. JPG, PNG, HEIC ou PDF, 10 Mo maximum.
      </p>
    </div>
  )
}
