import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Mail, Menu, Phone, X } from 'lucide-react'
import { FacebookIcon, InstagramIcon } from './SocialIcons'
import { COMPANY, DATA_SOURCE } from '../config'
import { AssistantWidget } from './AssistantWidget'

export const logoUrl = `${import.meta.env.BASE_URL}logo.webp`

const NAV = [
  { to: '/', label: 'Accueil' },
  { to: '/flotte', label: 'Notre flotte' },
  { to: '/a-propos', label: 'À propos' },
  { to: '/faq', label: 'FAQ' },
  { to: '/contact', label: 'Contact' },
]

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function Header() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-ink-900/95 text-white backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5" aria-label="LEON Location PRO — accueil">
          <img src={logoUrl} alt="" className="h-11 w-11" />
          <span className="font-display text-2xl leading-none tracking-wide">
            LEON <span className="text-brand-500">Location</span> PRO
          </span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'text-brand-400' : 'text-slate-300 hover:text-white'}`
              }
            >
              {n.label}
            </NavLink>
          ))}
          <Link to="/reserver" className="btn-primary ml-3 py-2.5">
            Réserver
          </Link>
        </nav>
        <button className="rounded-lg p-2 md:hidden" onClick={() => setOpen((o) => !o)} aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={open}>
          {open ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>
      {open && (
        <nav className="border-t border-white/10 bg-ink-900 md:hidden">
          <div className="container-page flex flex-col py-3">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                className={({ isActive }) => `rounded-lg px-2 py-3 text-base font-medium ${isActive ? 'text-brand-400' : 'text-slate-200'}`}
              >
                {n.label}
              </NavLink>
            ))}
            <Link to="/reserver" className="btn-primary mt-2 py-3.5 text-base">
              Réserver un véhicule
            </Link>
            <a href={COMPANY.phoneHref} className="mt-3 flex items-center justify-center gap-2 py-2 text-sm text-slate-300">
              <Phone size={16} /> {COMPANY.phone}
            </a>
          </div>
        </nav>
      )}
    </header>
  )
}

function Footer() {
  return (
    <footer className="relative overflow-hidden bg-ink-900 text-slate-400">
      <div className="h-1 bg-gradient-to-r from-brand-500 via-brand-500 to-accent-500" />
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <img src={logoUrl} alt="LEON Location PRO" className="h-24 w-24" />
          <p className="mt-3 font-display text-2xl text-white">{COMPANY.slogan}</p>
          <p className="mt-1 text-sm">Votre partenaire de confiance pour explorer La Réunion.</p>
        </div>
        <div>
          <h3 className="font-display text-xl text-white">Location</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/reserver" className="hover:text-white">Réserver en ligne</Link></li>
            <li><Link to="/flotte" className="hover:text-white">Notre flotte</Link></li>
            <li><Link to="/faq" className="hover:text-white">Questions fréquentes</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-display text-xl text-white">Informations</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/a-propos" className="hover:text-white">À propos</Link></li>
            <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
            <li><Link to="/cgv" className="hover:text-white">Conditions générales de vente</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-display text-xl text-white">Nous joindre</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a href={COMPANY.phoneHref} className="flex items-center gap-2 hover:text-white"><Phone size={15} /> {COMPANY.phone}</a></li>
            <li><a href={`mailto:${COMPANY.email}`} className="flex items-center gap-2 break-all hover:text-white"><Mail size={15} /> {COMPANY.email}</a></li>
          </ul>
          <div className="mt-4 flex gap-2">
            <a href={COMPANY.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="rounded-lg bg-white/5 p-2.5 hover:bg-brand-500 hover:text-white"><FacebookIcon /></a>
            <a href={COMPANY.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="rounded-lg bg-white/5 p-2.5 hover:bg-accent-500 hover:text-white"><InstagramIcon /></a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/5">
        <div className="container-page flex flex-col gap-2 py-5 text-xs sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} {COMPANY.name} — La Réunion (974)</p>
          <p className="flex gap-4">
            <Link to="/cgv" className="hover:text-white">CGV</Link>
            <Link to="/contact" className="hover:text-white">Mentions légales</Link>
            <Link to="/admin" className="hover:text-white">Espace pro</Link>
          </p>
        </div>
      </div>
    </footer>
  )
}

export function Layout() {
  return (
    <div className="flex min-h-svh flex-col">
      <ScrollToTop />
      {DATA_SOURCE === 'mock' && (
        <div className="bg-accent-500 px-4 py-1.5 text-center text-xs font-medium text-white">
          Site de démonstration : véhicules, prix et réservations fictifs. Aucun paiement réel.
        </div>
      )}
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <AssistantWidget />
    </div>
  )
}
