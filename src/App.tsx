import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Layout } from './components/Layout'
import { CartProvider } from './lib/cart'
import { HomePage } from './pages/HomePage'
import { ShopPage } from './pages/ShopPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { PaymentSimPage } from './pages/PaymentSimPage'
import { ConfirmationPage } from './pages/ConfirmationPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { CgvPage } from './pages/CgvPage'
import { NotFoundPage } from './pages/NotFoundPage'

const TITLES: Record<string, string> = {
  '/': 'Home',
  '/shop': 'Boutique',
  '/recapitulatif': 'Récapitulatif',
  '/modalites-vente': 'Conditions générales de vente',
}

function DocumentTitle() {
  const { pathname } = useLocation()
  useEffect(() => {
    const title = TITLES[pathname] ?? (/^\/(paiement|reservation|documents)\//.test(pathname) ? 'Réservation' : 'Page Not Found')
    document.title = `${title} | LEON Location PRO`
  }, [pathname])
  return null
}

// HashRouter : adresses en « #/shop… », compatibles avec un hébergement statique.
export default function App() {
  return (
    <CartProvider>
      <HashRouter>
        <DocumentTitle />
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="shop" element={<ShopPage />} />
            <Route path="recapitulatif" element={<CheckoutPage />} />
            <Route path="shop/cart" element={<Navigate to="/recapitulatif" replace />} />
            <Route path="paiement/:ref" element={<PaymentSimPage />} />
            <Route path="reservation/:ref" element={<ConfirmationPage />} />
            <Route path="documents/:ref" element={<DocumentsPage />} />
            <Route path="modalites-vente" element={<CgvPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </CartProvider>
  )
}
