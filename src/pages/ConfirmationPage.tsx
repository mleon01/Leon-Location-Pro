import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { DepositMode, DocumentsStatus } from '../../shared/api'
import { data } from '../data/provider'
import { useCart } from '../lib/cart'
import { money } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import { Stepper } from '../components/Stepper'
import { DocumentsUploader } from '../components/DocumentsUploader'

// Après paiement : réservation confirmée + dépôt des documents (maintenant ou plus tard).

export function DepositInfo({ mode, amount }: { mode: DepositMode; amount: number }) {
  return (
    <section className="rounded-md border border-white/10 bg-ink-800 p-5 sm:p-6">
      <h3 className="title-odoo mb-2 text-[22px]">VOTRE CAUTION : {money(amount)} <span className="font-sans text-sm font-normal text-muted">— non débitée</span></h3>
      {mode === 'gando' ? (
        <>
          <p className="text-muted">Vous avez choisi de déposer votre caution en ligne avec Gando, avant votre arrivée.</p>
          <button type="button" disabled className="btn-odoo mt-4 h-[50px] px-8 text-[13px] tracking-[1.5px]" title="Le lien Gando sera disponible dès l'ouverture du compte">
            Déposer ma caution avec Gando
          </button>
          <p className="mt-2 text-xs text-muted">Mode test : le lien Gando sera activé dès l'ouverture du compte.</p>
        </>
      ) : (
        <p className="text-muted">Une empreinte bancaire sera réalisée sur notre terminal lors de la remise des clés. Munissez-vous d'une carte bancaire au nom du conducteur principal.</p>
      )}
    </section>
  )
}

export function ConfirmationPage() {
  const { ref = '' } = useParams()
  const cart = useCart()
  const { data: order, error, loading } = useAsync(() => data.getOrder(ref), [ref])
  const docsRef = order?.documentsUrl.split('#/documents/')[1] ?? ''
  const [docs, setDocs] = useState<DocumentsStatus | null>(null)

  useEffect(() => {
    if (order?.paid) {
      cart.clear()
      try {
        sessionStorage.removeItem('llp-checkout')
      } catch {
        /* ignoré */
      }
    }
    if (order?.paid && docsRef) data.getDocuments(docsRef).then(setDocs).catch(() => null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.paid, docsRef])

  if (loading) return <p className="py-24 text-center text-muted">Chargement…</p>
  if (error || !order) return <p className="container-odoo py-24 text-center">{error ?? 'Réservation introuvable.'}</p>
  if (!order.paid) {
    return (
      <div className="container-odoo py-20 text-center">
        <p className="title-odoo text-3xl">PAIEMENT EN ATTENTE</p>
        <p className="mt-2 text-muted">La réservation {order.orderName} n'est pas encore payée.</p>
        <Link to={`/paiement/${ref}`} className="btn-odoo mt-6 h-[54px] px-10 text-[13px]">Finaliser le paiement</Link>
      </div>
    )
  }

  return (
    <div className="container-odoo pb-16">
      <Stepper current={5} />
      <div className="mx-auto mt-6 max-w-[760px] space-y-6">
        <section className="rounded-md border border-brand/40 bg-ink-800 p-6 text-center">
          <i className="fa fa-check-circle text-brand" style={{ fontSize: 56 }} />
          <h1 className="title-odoo mt-3 text-[clamp(1.8rem,4vw,2.6rem)]">MERCI {order.customerFirstName.toUpperCase()}, VOTRE VÉHICULE EST RÉSERVÉ !</h1>
          <p className="mt-2">Réservation <b>{order.orderName}</b> — {money(order.amountTotal)} payés.</p>
          <p className="mt-1 text-muted">Votre facture et le récapitulatif ont été envoyés à <b className="text-white">{order.email}</b>.</p>
          {order.simulation && <p className="mt-3 text-xs text-amber-300">Mode test : paiement simulé.</p>}
        </section>

        <section className="rounded-md border border-white/10 bg-ink-800 p-5 sm:p-6">
          <h3 className="title-odoo mb-1 text-[22px]">DERNIÈRE ÉTAPE : VOS DOCUMENTS</h3>
          <p className="mb-4 text-muted">
            Envoyez une photo de votre permis de conduire et de votre pièce d'identité : la remise des clés n'en sera que plus rapide.
            Pas sous la main ? Le lien est aussi dans l'e-mail de confirmation.
          </p>
          {docs ? (
            docs.complete ? (
              <p className="rounded border border-emerald-500/60 bg-emerald-500/10 p-4"><i className="fa fa-check mr-2 text-emerald-400" />Merci, nous avons bien reçu tous vos documents.</p>
            ) : (
              <DocumentsUploader docsRef={docsRef} status={docs} onChange={setDocs} />
            )
          ) : (
            <p className="text-muted">Chargement…</p>
          )}
        </section>

        <DepositInfo mode={order.depositMode} amount={order.depositAmount} />

        <section className="rounded-md border border-white/10 bg-ink-800 p-5 sm:p-6">
          <h3 className="title-odoo mb-2 text-[22px]">LE JOUR DU DÉPART</h3>
          <p className="text-muted">Nous réalisons ensemble l'état des lieux du véhicule (photos), puis vous signez votre contrat de location sur tablette. Vous le recevez ensuite par e-mail avec les photos.</p>
        </section>
        <p className="text-center"><Link to="/" className="text-brand-dark hover:text-brand">Retour à l'accueil</Link></p>
      </div>
    </div>
  )
}
