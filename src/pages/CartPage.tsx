import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../lib/cart'
import { money } from '../lib/format'
import { CheckoutSteps, PeriodBox, Totals, useQuote } from '../components/Checkout'

// Étape 1 — « Commande » (/shop/cart d'Odoo)

export function CartPage() {
  const cart = useCart()
  const navigate = useNavigate()
  const { quote, error, loading } = useQuote()

  if (cart.lines.length === 0) {
    return (
      <div className="container-odoo pb-24 pt-6">
        <CheckoutSteps active={0} />
        <h3 className="title-odoo text-[26px]">RÉSUMÉ DE LA COMMANDE</h3>
        <div className="mt-12 text-center">
          <span className="relative inline-block">
            <i className="fa fa-shopping-cart text-[80px]" />
            <span className="absolute -right-2 top-0 grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-brand text-xs">0</span>
          </span>
          <p className="title-odoo mt-6 text-xl">VOTRE PANIER EST VIDE !</p>
          <Link to="/shop" className="btn-odoo mt-4 h-[54px] w-full text-[13px] tracking-[1.5px]">Boutique</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container-odoo pb-10 pt-6">
      <CheckoutSteps active={0} />
      <div className="grid gap-8 lg:grid-cols-[1fr_445px] lg:gap-[30px]">
        <div>
          <h3 className="title-odoo text-[26px]">RÉSUMÉ DE LA COMMANDE</h3>
          {error && <p className="mt-4 border border-alert/50 bg-alert/10 p-3 text-sm">{error}</p>}
          <div className="mt-4 space-y-6">
            {(quote?.lines ?? []).map((l) => (
              <div key={l.productId} className="flex gap-4">
                <img src={l.image} alt={l.name} className="h-12 w-16 shrink-0 rounded bg-white object-cover" />
                <div className="flex-1">
                  <div className="flex justify-between gap-4">
                    <h6 className="font-display text-base leading-tight">{l.name.toUpperCase()}</h6>
                    <span className="font-display text-base">{money(l.amount)}</span>
                  </div>
                  {l.isRental ? (
                    <>
                      <p>{l.unitLabel}</p>
                      <p>{l.durationLabel}</p>
                    </>
                  ) : (
                    l.qty > 1 && <p>Quantité : {l.qty}</p>
                  )}
                  {!l.available && <p className="mt-1 text-sm text-[#ff6b78]">Ce véhicule n'est pas disponible sur cette période. Modifiez les dates ou supprimez-le.</p>}
                  <button onClick={() => cart.removeLine(l.productId)} className="mt-3 text-sm hover:text-brand">Supprimer</button>
                </div>
              </div>
            ))}
            {loading && !quote && <p className="text-muted">Calcul du prix…</p>}
          </div>
        </div>

        <aside className="self-start rounded-md border border-white/10 bg-ink-800 p-6">
          <PeriodBox />
          {quote && (
            <div className={`mt-4 ${loading ? 'opacity-60' : ''}`}>
              <Totals quote={quote} />
            </div>
          )}
          <button
            disabled={!quote || loading || !quote.allAvailable}
            onClick={() => navigate('/shop/address')}
            className="btn-odoo mt-5 h-[54px] w-full text-[13px] tracking-[1.5px]"
          >
            Payer <i className="fa fa-angle-right ml-2" />
          </button>
        </aside>
      </div>
    </div>
  )
}
