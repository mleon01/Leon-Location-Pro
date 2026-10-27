import { useEffect, useState } from 'react'
import type { CatalogOption, CatalogProduct, DeliveryMethod, SearchResult } from '../../shared/api'
import { money } from '../lib/format'

// Fenêtre « Sélectionner des options » : modèle, lieu de remise (obligatoire), options.

export interface BookingChoice {
  variantId: number
  options: { productId: number; qty: number }[]
  deliveryId: number
  deliveryDetail: string
}

interface Props {
  product: CatalogProduct
  result: SearchResult
  options: CatalogOption[]
  deliveryMethods: DeliveryMethod[]
  initialDelivery?: { id: number | null; detail: string }
  /** Choix déjà faits (retour depuis le récapitulatif) */
  initialVariantId?: number
  initialOptions?: { productId: number; qty: number }[]
  onClose(): void
  onConfirm(choice: BookingChoice): void
}

function Thumb({ src, alt }: { src: string; alt: string }) {
  return (
    <span className="grid h-[54px] w-[72px] shrink-0 place-items-center overflow-hidden rounded border border-black/10 bg-white sm:h-[72px] sm:w-[96px]">
      <img src={src} alt={alt} className="max-h-full max-w-full object-contain" />
    </span>
  )
}

export function OptionsModal({ product, result, options, deliveryMethods, initialDelivery, initialVariantId, initialOptions, onClose, onConfirm }: Props) {
  const firstFree = result.variants.find((v) => v.available)?.id ?? product.variants[0].id
  const [variantId, setVariantId] = useState(initialVariantId && result.variants.find((v) => v.id === initialVariantId)?.available ? initialVariantId : firstFree)
  const [added, setAdded] = useState<Record<number, number>>(() => Object.fromEntries((initialOptions ?? []).map((o) => [o.productId, o.qty])))
  const [deliveryId, setDeliveryId] = useState<number | null>(initialDelivery?.id ?? null)
  const [detail, setDetail] = useState(initialDelivery?.detail ?? '')
  const [showError, setShowError] = useState(false)
  const variant = product.variants.find((v) => v.id === variantId)!
  const delivery = deliveryMethods.find((d) => d.id === deliveryId) ?? null
  const total = result.price + options.reduce((s, o) => s + (added[o.productId] ?? 0) * o.price, 0) + (delivery?.price ?? 0)
  const missing = !delivery ? 'Choisissez le lieu de remise du véhicule.' : delivery.requiresAddress && detail.trim().length < 5 ? "Précisez l'adresse de livraison." : ''

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const setQty = (id: number, qty: number) =>
    setAdded((a) => {
      const next = { ...a }
      if (qty <= 0) delete next[id]
      else next[id] = Math.min(qty, 5)
      return next
    })

  function confirm() {
    if (missing) {
      setShowError(true)
      document.getElementById('lieu-remise')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    onConfirm({
      variantId,
      options: Object.entries(added).map(([id, qty]) => ({ productId: Number(id), qty })),
      deliveryId: delivery!.id,
      deliveryDetail: delivery!.requiresAddress ? detail.trim() : '',
    })
  }
  const title = product.variants.length > 1 ? variant.displayName : product.name

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 sm:p-4 sm:pt-[90px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Sélectionner des options" className="flex h-full w-full flex-col overflow-hidden bg-white text-ink-900 sm:h-auto sm:max-h-[86vh] sm:max-w-[978px] sm:rounded-md">
        <header className="flex items-center gap-4 bg-[linear-gradient(#1f1f1f,#3a3a3a)] px-4 py-4">
          <button onClick={onClose} className="text-[#a0aec0] sm:hidden" aria-label="Fermer">
            <i className="fa fa-arrow-left" />
          </button>
          <h2 className="flex-1 font-display text-[22px] leading-none text-[#a0aec0]">OPTIONS ET LIEU DE REMISE</h2>
          <button onClick={onClose} className="hidden text-2xl leading-none text-[#a0aec0] sm:block" aria-label="Fermer">
            <i className="fa fa-times" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {/* Véhicule + options ajoutées */}
          <div className="space-y-4 border-b border-black/10 p-4">
            <div className="flex gap-4">
              <Thumb src={product.image} alt={product.name} />
              <div className="flex-1">
                <div className="flex flex-col justify-between gap-2 sm:flex-row">
                  <h3 className="font-display text-base leading-tight">{title.toUpperCase()}</h3>
                  <p className="order-last sm:order-none">
                    <span className="font-display text-base">{money(result.price)}</span> {result.priceInfo}
                  </p>
                </div>
                {product.deposit > 0 && (
                  <p className="mt-1 text-sm text-black/60">
                    <i className="fa fa-shield mr-1.5 text-brand-dark" />
                    Caution : <b className="text-black/80">{money(product.deposit)}</b> — non débitée
                  </p>
                )}
                {product.variants.length > 1 && (
                  <fieldset className="mt-3">
                    <legend className="mb-1 font-bold">{product.attributeName}</legend>
                    <div className="flex flex-wrap gap-x-5 gap-y-2">
                      {product.variants.map((v) => {
                        const free = result.variants.find((x) => x.id === v.id)?.available ?? false
                        return (
                          <label key={v.id} className={`flex items-center gap-2 ${free ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}>
                            <input type="radio" name="variant" checked={variantId === v.id} disabled={!free} onChange={() => setVariantId(v.id)} className="h-4 w-4 accent-brand" />
                            {v.name}
                            {!free && <span className="text-xs">(indisponible)</span>}
                          </label>
                        )
                      })}
                    </div>
                  </fieldset>
                )}
              </div>
            </div>
            {options
              .filter((o) => added[o.productId])
              .map((o) => (
                <div key={o.id} className="flex items-center gap-4">
                  <Thumb src={o.image} alt={o.name} />
                  <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="font-display text-base leading-tight">{o.name.toUpperCase()}</h3>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center border border-black/20">
                        <button onClick={() => setQty(o.productId, added[o.productId] - 1)} className="h-8 w-8" aria-label="Moins">−</button>
                        <span className="w-8 text-center">{added[o.productId]}</span>
                        <button onClick={() => setQty(o.productId, added[o.productId] + 1)} className="h-8 w-8" aria-label="Plus">+</button>
                      </div>
                      <span className="font-display text-base">{money(o.price * added[o.productId])}</span>
                      <button onClick={() => setQty(o.productId, 0)} className="text-black/50 hover:text-alert" aria-label={`Retirer ${o.name}`}>
                        <i className="fa fa-trash" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {/* Lieu de remise — obligatoire */}
          <fieldset id="lieu-remise" className="border-b border-black/10 p-4">
            <legend className="float-left mb-3 w-full font-display text-[22px] leading-none">
              LIEU DE REMISE DU VÉHICULE <span className="font-sans text-sm font-normal text-alert">* obligatoire</span>
            </legend>
            <div className={`clear-both overflow-hidden rounded border ${showError && !delivery ? 'border-alert' : 'border-black/15'}`}>
              {deliveryMethods.map((d) => (
                <label key={d.id} className={`flex cursor-pointer items-center gap-3 border-b border-black/10 px-4 py-3 last:border-b-0 ${deliveryId === d.id ? 'bg-brand/10' : 'hover:bg-black/[0.03]'}`}>
                  <input type="radio" name="delivery" checked={deliveryId === d.id} onChange={() => setDeliveryId(d.id)} className="h-4 w-4 accent-brand" />
                  <span className="flex-1">{d.name}</span>
                  <span className="font-bold">{money(d.price)}</span>
                </label>
              ))}
            </div>
            {delivery?.requiresAddress && (
              <label className="mt-3 block">
                <span className="mb-1 block text-sm font-bold">Adresse de livraison du véhicule *</span>
                <textarea
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  maxLength={300}
                  rows={2}
                  placeholder="Ex. : Hôtel Le Récif, 50 avenue de Bourbon, 97434 Saint-Gilles"
                  className={`w-full rounded border px-3 py-2 outline-none focus:border-brand ${showError && detail.trim().length < 5 ? 'border-alert' : 'border-black/20'}`}
                />
              </label>
            )}
            {showError && missing && <p className="mt-2 text-sm font-medium text-alert" role="alert">{missing}</p>}
          </fieldset>

          {/* Options disponibles */}
          {options.some((o) => !added[o.productId]) && (
            <div className="space-y-4 bg-[#fafafa] p-4">
              <h3 className="font-display text-[22px] leading-none">OPTIONS</h3>
              {options
                .filter((o) => !added[o.productId])
                .map((o) => (
                  <div key={o.id} className="flex gap-4">
                    <Thumb src={o.image} alt={o.name} />
                    <div className="flex flex-1 items-end justify-between gap-3 sm:flex-col sm:items-stretch">
                      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                        <h4 className="font-display text-base leading-tight">{o.name.toUpperCase()}</h4>
                        <span className="font-display text-base">{money(o.price)}</span>
                      </div>
                      <button
                        onClick={() => setQty(o.productId, 1)}
                        className="flex h-[45px] w-[62px] items-center justify-center gap-2 self-end border border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white sm:w-[174px]"
                      >
                        <i className="fa fa-plus text-xs" />
                        <span className="hidden sm:inline">Ajouter</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        <footer className="flex flex-col gap-3 border-t border-black/10 p-4 sm:flex-row-reverse sm:items-center sm:justify-end sm:gap-7">
          <p className="font-display text-base">TOTAL : {money(total)} <span className="font-sans text-xs text-black/50">HT</span></p>
          <button onClick={confirm} className="h-[45px] rounded bg-brand px-8 font-bold text-white hover:brightness-110">
            Continuer <i className="fa fa-angle-right ml-1" />
          </button>
        </footer>
      </div>
    </div>
  )
}
