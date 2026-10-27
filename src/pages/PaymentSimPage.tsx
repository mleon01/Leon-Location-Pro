import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { data } from '../data/provider'
import { money } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import { installments } from '../components/Checkout'
import { Stepper } from '../components/Stepper'

// Page de paiement SIMULÉE, en attendant les comptes Stripe et Alma.
// Elle reproduit le passage par la page sécurisée du prestataire, sans aucun débit.

export function PaymentSimPage() {
  const { ref = '' } = useParams()
  const navigate = useNavigate()
  const { data: order, error, loading } = useAsync(() => data.getOrder(ref), [ref])
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')

  if (loading) return <p className="py-24 text-center text-muted">Chargement du paiement…</p>
  if (error || !order) return <p className="container-odoo py-24 text-center">{error ?? 'Paiement introuvable.'}</p>
  if (order.paid) return <Navigate to={`/reservation/${ref}`} replace />

  const alma = order.paymentMode !== 'card'
  const n = order.paymentMode === 'alma3' ? 3 : order.paymentMode === 'alma4' ? 4 : 1
  const plan = installments(order.amountTotal, n)

  async function pay() {
    setPaying(true)
    setPayError('')
    try {
      await data.simulatePayment(ref)
      navigate(`/reservation/${ref}`, { replace: true })
    } catch (e) {
      setPayError(e instanceof Error ? e.message : 'Le paiement a échoué.')
      setPaying(false)
    }
  }

  return (
    <div className="min-h-[70vh] pb-10">
      <div className="container-odoo"><Stepper current={4} back={{ 3: '/recapitulatif' }} /></div>
      <div className="mx-auto mt-6 max-w-[460px] px-4 text-ink-900">
        <p className="mb-4 rounded border border-amber-300 bg-amber-50 p-3 text-center text-sm text-amber-900">
          <b>MODE TEST</b> — paiement simulé : aucune carte n'est débitée.
          <br />
          {alma ? 'Alma' : 'Stripe'} sera branché dès l'ouverture de votre compte.
        </p>
        <div className="overflow-hidden rounded-xl bg-white shadow-lg">
          <header className={`px-6 py-5 text-white ${alma ? 'bg-[#fa5022]' : 'bg-[#635bff]'}`}>
            <p className="text-sm opacity-90">{alma ? `Paiement en ${n} fois avec Alma` : 'Paiement par carte bancaire'}</p>
            <p className="mt-1 text-3xl font-bold">{money(alma ? plan[0] : order.amountTotal)}{alma && <span className="text-base font-normal"> aujourd'hui</span>}</p>
            <p className="mt-1 text-sm opacity-90">LEON Location PRO · Réservation {order.orderName}</p>
          </header>

          <div className="space-y-4 p-6">
            {alma && (
              <table className="w-full text-sm">
                <tbody>
                  {plan.map((amount, i) => (
                    <tr key={i} className="border-b border-black/5 last:border-0">
                      <td className="py-2 text-black/60">{i === 0 ? "Aujourd'hui" : `Dans ${i} mois`}</td>
                      <td className="py-2 text-right font-semibold">{money(amount)}</td>
                    </tr>
                  ))}
                  <tr><td className="pt-2 font-semibold">Total</td><td className="pt-2 text-right font-bold">{money(order.amountTotal)}</td></tr>
                </tbody>
              </table>
            )}
            <label className="block text-sm">
              <span className="mb-1 block text-black/60">Numéro de carte</span>
              <input readOnly value="4242 4242 4242 4242" className="h-11 w-full rounded border border-black/15 px-3 font-mono" />
            </label>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <label><span className="mb-1 block text-black/60">Expiration</span><input readOnly value="12 / 34" className="h-11 w-full rounded border border-black/15 px-3 font-mono" /></label>
              <label><span className="mb-1 block text-black/60">CVC</span><input readOnly value="123" className="h-11 w-full rounded border border-black/15 px-3 font-mono" /></label>
            </div>
            {payError && <p className="rounded bg-red-50 p-3 text-sm text-red-700" role="alert">{payError}</p>}
            <button
              onClick={pay}
              disabled={paying}
              className={`h-12 w-full rounded-md font-semibold text-white disabled:opacity-60 ${alma ? 'bg-[#fa5022]' : 'bg-[#635bff]'}`}
            >
              {paying ? 'Paiement en cours…' : `Payer ${money(alma ? plan[0] : order.amountTotal)}`}
            </button>
            <Link to="/recapitulatif" className="block text-center text-sm text-black/50 hover:text-black">Annuler et revenir au récapitulatif</Link>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-black/40"><i className="fa fa-lock mr-1" />Paiement sécurisé par {alma ? 'Alma' : 'Stripe'} (simulation)</p>
      </div>
    </div>
  )
}
