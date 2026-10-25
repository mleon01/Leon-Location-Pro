import { useEffect } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { Layout } from './components/Layout'
import { CartProvider } from './lib/cart'
import { HomePage } from './pages/HomePage'
import { ShopPage } from './pages/ShopPage'
import { CartPage } from './pages/CartPage'
import { AddressPage } from './pages/AddressPage'
import { PaymentPage } from './pages/PaymentPage'
import { NotFoundPage } from './pages/NotFoundPage'

const TITLES: Record<string, string> = {
  '/': 'Home',
  '/shop': 'Boutique',
  '/shop/cart': 'Panier',
  '/shop/address': 'Adresse',
  '/shop/payment': 'Paiement',
}

function DocumentTitle() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.title = `${TITLES[pathname] ?? 'Page Not Found'} | LEON Location PRO`
  }, [pathname])
  return null
}

// HashRouter : adresses en « #/shop… », compatibles avec GitHub Pages.
export default function App() {
  return (
    <CartProvider>
      <HashRouter>
        <DocumentTitle />
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="shop" element={<ShopPage />} />
            <Route path="shop/cart" element={<CartPage />} />
            <Route path="shop/address" element={<AddressPage />} />
            <Route path="shop/payment" element={<PaymentPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </CartProvider>
  )
}
