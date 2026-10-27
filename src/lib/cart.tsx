// Panier : une période de location, des lignes (véhicule + options) et le lieu de remise.
// Conservé dans le navigateur du visiteur jusqu'à la commande.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { CartLine } from '../../shared/api'

export interface Cart {
  start: string | null
  end: string | null
  lines: CartLine[]
  deliveryId: number | null
  deliveryDetail: string
}

interface CartApi extends Cart {
  count: number
  setPeriod(start: string, end: string): void
  /** Remplace le contenu du panier (un véhicule et ses options par réservation) */
  setBooking(booking: { start: string; end: string; lines: CartLine[]; deliveryId: number; deliveryDetail: string }): void
  setDelivery(deliveryId: number, deliveryDetail: string): void
  removeLine(productId: number): void
  clear(): void
}

const KEY = 'llp-cart'
const empty: Cart = { start: null, end: null, lines: [], deliveryId: null, deliveryDetail: '' }

function load(): Cart {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...empty, ...(JSON.parse(raw) as Cart) }
  } catch {
    /* stockage indisponible */
  }
  return empty
}

const CartContext = createContext<CartApi | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(cart))
    } catch {
      /* ignoré */
    }
  }, [cart])

  const setPeriod = useCallback((start: string, end: string) => setCart((c) => ({ ...c, start, end })), [])
  const setBooking = useCallback<CartApi['setBooking']>((b) => setCart({ ...b }), [])
  const setDelivery = useCallback((deliveryId: number, deliveryDetail: string) => setCart((c) => ({ ...c, deliveryId, deliveryDetail })), [])
  const removeLine = useCallback((productId: number) => setCart((c) => ({ ...c, lines: c.lines.filter((l) => l.productId !== productId) })), [])
  const clear = useCallback(() => setCart(empty), [])

  const value = useMemo(
    () => ({ ...cart, count: cart.lines.reduce((s, l) => s + l.qty, 0), setPeriod, setBooking, setDelivery, removeLine, clear }),
    [cart, setPeriod, setBooking, setDelivery, removeLine, clear],
  )
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart doit être utilisé dans <CartProvider>')
  return ctx
}
