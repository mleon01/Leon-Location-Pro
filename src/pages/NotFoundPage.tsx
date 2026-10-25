import { Link } from 'react-router-dom'

// Page 404, identique à celle du site Odoo
// (les pages légales n'existent pas encore sur le site d'origine).

export function NotFoundPage() {
  return (
    <div className="container-odoo py-20">
      <h1 className="title-odoo text-center text-[clamp(3rem,8vw,6rem)] text-brand">Erreur 404</h1>
      <p className="mt-4 text-center text-xl">Nous n'avons pas pu trouver la page que vous recherchez !</p>
      <p className="mt-6 text-center text-muted">Pas de panique. Si vous pensez que c'est une erreur de notre part, veuillez nous envoyer un message à cette page.</p>
      <p className="mt-6 text-center">Peut-être étiez-vous à la recherche d'une de ces pages populaires ?</p>
      <p className="mt-2 text-center">
        <Link to="/" className="text-brand-dark hover:text-brand">Accueil</Link>
      </p>
    </div>
  )
}
