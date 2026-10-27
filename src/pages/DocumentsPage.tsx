import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { DocumentsStatus } from '../../shared/api'
import { data } from '../data/provider'
import { displayOdoo } from '../lib/time'
import { DocumentsUploader } from '../components/DocumentsUploader'
import { DepositInfo } from './ConfirmationPage'
import { Stepper } from '../components/Stepper'

// Page ouverte depuis le lien de l'e-mail : dépôt du permis et de la pièce d'identité.

export function DocumentsPage() {
  const { ref = '' } = useParams()
  const [status, setStatus] = useState<DocumentsStatus | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    data.getDocuments(ref).then(setStatus).catch((e: unknown) => setError(e instanceof Error ? e.message : 'Lien invalide.'))
  }, [ref])

  if (error) return <p className="container-odoo py-24 text-center">{error}</p>
  if (!status) return <p className="py-24 text-center text-muted">Chargement…</p>

  return (
    <div className="container-odoo pb-16">
      <Stepper current={5} />
      <div className="mx-auto mt-6 max-w-[760px] space-y-6">
        <section className="rounded-md border border-white/10 bg-ink-800 p-5 sm:p-6">
          <h1 className="title-odoo text-[clamp(1.8rem,4vw,2.4rem)]">BONJOUR {status.customerFirstName.toUpperCase()},</h1>
          <p className="mt-1 text-muted">
            Réservation <b className="text-white">{status.orderName}</b> — départ le {displayOdoo(status.start).slice(0, 16)}.
          </p>
          <h3 className="title-odoo mb-3 mt-6 text-[22px]">VOS DOCUMENTS</h3>
          {status.complete ? (
            <p className="rounded border border-emerald-500/60 bg-emerald-500/10 p-4"><i className="fa fa-check mr-2 text-emerald-400" />Merci, nous avons bien reçu tous vos documents. À très bientôt !</p>
          ) : (
            <DocumentsUploader docsRef={ref} status={status} onChange={setStatus} />
          )}
        </section>
        <DepositInfo mode={status.depositMode} amount={status.depositAmount} />
      </div>
    </div>
  )
}
