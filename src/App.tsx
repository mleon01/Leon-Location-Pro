import { HashRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { FleetPage } from './pages/FleetPage'
import { VehiclePage } from './pages/VehiclePage'
import { NotFoundPage } from './pages/NotFoundPage'

// HashRouter : les adresses contiennent "#/" (ex. /#/flotte), ce qui permet
// à GitHub Pages de servir toutes les pages sans configuration serveur.
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="flotte" element={<FleetPage />} />
          <Route path="flotte/:id" element={<VehiclePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
