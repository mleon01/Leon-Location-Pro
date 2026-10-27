import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { CatalogProduct, SearchResult } from '../../shared/api'
import { data } from '../data/provider'
import { useAsync } from '../lib/useAsync'
import { money } from '../lib/format'
import { useCart } from '../lib/cart'
import { PeriodInputs } from '../components/PeriodInputs'
import { OptionsModal } from '../components/OptionsModal'
import { Stepper } from '../components/Stepper'

// Étapes « Dates » et « Véhicule » : les véhicules disponibles pour la période choisie.
// Avec ?options=1, rouvre la fenêtre d'options du véhicule déjà choisi (retour depuis le récapitulatif).

export function ShopPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const cart = useCart()
  const start = params.get('start_date')
  const end = params.get('end_date')
  const [signal, setSignal] = useState(0)
  const [selected, setSelected] = useState<{ product: CatalogProduct; result: SearchResult } | null>(null)

  const catalog = useAsync(() => data.getCatalog())
  const results = useAsync(() => (start && end ? data.search(start, end) : Promise.resolve(null)), [start, end])

  const rows = (catalog.data?.products ?? [])
    .map((product) => ({ product, result: results.data?.find((r) => r.productId === product.id) }))
    .filter(({ result }) => !start || result?.available)

  const loading = catalog.loading || results.loading
  const error = catalog.error ?? results.error

  // Véhicule et options déjà choisis (pour les pré-remplir)
  const cartVariant = cart.lines.map((l) => l.productId).find((id) => catalog.data?.products.some((p) => p.variants.some((v) => v.id === id)))
  const cartProduct = catalog.data?.products.find((p) => p.variants.some((v) => v.id === cartVariant))

  useEffect(() => {
    if (params.get('options') !== '1' || !results.data || !cartProduct) return
    const result = results.data.find((r) => r.productId === cartProduct.id)
    if (result?.available) setSelected({ product: cartProduct, result })
    const next = new URLSearchParams(params)
    next.delete('options')
    setParams(next, { replace: true })
  }, [params, results.data, cartProduct, setParams])

  return (
    <div className="container-odoo min-h-[546px] bg-ink-700">
      <Stepper current={selected ? 2 : start && end ? 1 : 0} back={{ 0: () => setSignal((n) => n + 1), 1: () => setSelected(null) }} />
      <div className="mt-4 bg-[#0d0d0e] px-4 pb-4 pt-4">
        <h1 className="title-odoo mx-auto text-center text-[32px] uppercase text-brand sm:text-5xl">
          Les véhicules disponibles pour votre période de location
        </h1>
        <div className="mt-8 flex items-center justify-end gap-2">
          <p className="hidden shrink-0 font-semibold md:block">Période de location :</p>
          <div className="w-full md:w-[362px]">
            <PeriodInputs
              variant="shop"
              align="right"
              start={start}
              end={end}
              forbiddenWeekdays={catalog.data?.forbiddenWeekdays}
              openSignal={signal}
              onApply={(s, e) => setParams({ start_date: s, end_date: e })}
              onClear={() => setParams({})}
            />
          </div>
        </div>
      </div>

      {error && <p className="m-4 border border-alert/50 bg-alert/10 p-4 text-sm">{error}</p>}
      {loading && <p className="p-8 text-center text-muted">Recherche des véhicules disponibles…</p>}

      {!loading && !error && (
        <section className="border border-white bg-ink-800">
          {rows.length === 0 && (
            <p className="p-8 text-center">Aucun véhicule n'est disponible sur cette période. Essayez d'autres dates.</p>
          )}
          {rows.map(({ product, result }) => (
            <div key={product.id} className="grid grid-cols-[100px_1fr] gap-x-3 border-b border-white/10 p-1.5 last:border-b-0 md:grid-cols-[168px_340px_1fr_250px] md:items-center md:gap-0">
              <span className="row-span-3 grid aspect-[168/126] place-items-center overflow-hidden bg-white md:row-span-1">
                <img src={product.image} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
              </span>
              <h6 className="self-end font-display text-base uppercase leading-none text-brand-dark md:self-center md:px-4">{product.name}</h6>
              <div className="md:flex md:h-full md:flex-col md:justify-center md:border-l md:border-white md:px-4">
                <p className="flex items-baseline gap-2">
                  <span className="text-[14.4px] font-semibold">{money(result ? result.price : product.listPrice)}</span>
                  <span className="font-display text-base">{result ? result.priceInfo : '/ Jour'}</span>
                </p>
                {product.deposit > 0 && <p className="text-xs text-muted">Caution : {money(product.deposit)} (non débitée)</p>}
              </div>
              <div className="md:flex md:h-full md:items-center md:justify-end md:border-l md:border-white md:px-4">
                <button
                  onClick={() => (result ? setSelected({ product, result }) : setSignal((n) => n + 1))}
                  className="btn-odoo h-[50px] w-full whitespace-nowrap px-[30px] text-[12.8px] tracking-[1.54px] md:h-[54px] md:w-auto"
                >
                  {cartProduct?.id === product.id ? 'Continuer avec ce véhicule' : 'Réserver ce véhicule'}
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {selected && start && end && catalog.data && (
        <OptionsModal
          product={selected.product}
          result={selected.result}
          options={selected.product.optionIds.map((id) => catalog.data!.options.find((o) => o.id === id)).filter((o) => !!o)}
          deliveryMethods={catalog.data.deliveryMethods}
          initialDelivery={{ id: cart.deliveryId, detail: cart.deliveryDetail }}
          initialVariantId={cartProduct?.id === selected.product.id ? cartVariant : undefined}
          initialOptions={cartProduct?.id === selected.product.id ? cart.lines.filter((l) => l.productId !== cartVariant) : undefined}
          onClose={() => setSelected(null)}
          onConfirm={(choice) => {
            cart.setBooking({
              start,
              end,
              lines: [{ productId: choice.variantId, qty: 1 }, ...choice.options],
              deliveryId: choice.deliveryId,
              deliveryDetail: choice.deliveryDetail,
            })
            navigate('/recapitulatif')
          }}
        />
      )}
    </div>
  )
}
