import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="container-page py-24 text-center">
      <p className="font-display text-8xl text-brand-500">404</p>
      <h1 className="font-display text-4xl">Cette route n’existe pas… encore</h1>
      <p className="mt-2 text-slate-600">La page demandée est introuvable.</p>
      <Link to="/" className="btn-primary mt-6">Retour à l’accueil</Link>
    </div>
  )
}
