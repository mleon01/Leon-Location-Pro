import { Link, useLocation } from 'react-router-dom'
import type { CheckoutResult } from '../../shared/api'
import { money } from '../lib/format'
import { CheckoutSteps } from '../components/Checkout'

// Étape 3 — « Paiement ».
// En mode Odoo, le visiteur est redirigé directement vers le portail Odoo (Stripe).
// Cette page sert au mode démonstration, ou si la redirection n'a pas eu lieu.

export function PaymentPage() {
  const result = useLocation().state as CheckoutResult | null
  if (!result) {
    return (
      <div className="container-odoo pb-24 pt-6">
        <CheckoutSteps active={2} />
        <p className="mt-8">Aucune commande en cours.</p>
        <Link to="/" className="btn-odoo mt-4 h-[54px] px-10 text-[13px]">Accueil</Link>
      </div>
    )
  }
  return (
    <div className="container-odoo pb-24 pt-6">
      <CheckoutSteps active={2} />
      <div className="mx-auto mt-6 max-w-[540px] rounded-md border border-white/10 bg-ink-800 p-6 text-center">
        <i className="fa fa-check-circle text-5xl text-brand" />
        <h3 className="title-odoo mt-4 text-[26px]">COMMANDE {result.orderName}</h3>
        <p className="mt-2 text-lg font-bold">{money(result.amountTotal)}</p>
        {result.paymentUrl ? (
          <a href={result.paymentUrl} className="btn-odoo mt-6 h-[54px] w-full text-[13px] tracking-[1.5px]">
            Payer <i className="fa fa-angle-right ml-2" />
          </a>
        ) : (
          <p className="mt-4 text-muted">
            Mode démonstration : aucun paiement n'est demandé. Sur le site connecté à Odoo, vous êtes redirigé vers la page de paiement sécurisée.
          </p>
        )}
      </div>
    </div>
  )
}
