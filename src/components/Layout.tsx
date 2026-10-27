import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { SOCIAL } from '../config'

export const logoUrl = `${import.meta.env.BASE_URL}logo.webp`

const NAV = [
  { label: 'Accueil', section: 'top' },
  { label: 'Comment ça marche ?', section: 'processus' },
  { label: 'Notre flotte', section: 'flotte' },
  { label: 'Avantages', section: 'avantages' },
]

/** Fait défiler jusqu'à une section de l'accueil (depuis n'importe quelle page). */
function useGoToSection() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  return (section: string) => {
    if (pathname !== '/') return navigate('/', { state: { section } })
    if (section === 'top') return window.scrollTo({ top: 0, behavior: 'smooth' })
    document.getElementById(section)?.scrollIntoView({ behavior: 'smooth' })
  }
}

function Header() {
  const [open, setOpen] = useState(false)
  const goTo = useGoToSection()
  const { pathname } = useLocation()
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <header className="fixed inset-x-0 top-0 z-40 bg-[linear-gradient(rgba(10,10,10,0.95),rgba(10,10,10,0.7))] backdrop-blur-[2px]">
      <div className="flex h-[66px] items-center px-[15px]">
        <Link to="/" className="mr-6 shrink-0" aria-label="LEON Location PRO — accueil">
          <img src={logoUrl} alt="LEON Location PRO" className="h-[50px] w-[50px]" />
        </Link>
        <nav className="hidden lg:flex">
          {NAV.map((n) => (
            <button
              key={n.section}
              onClick={() => goTo(n.section)}
              className="px-2 pb-1 pt-2 text-[12.48px] uppercase leading-[18.72px] tracking-[1.5px] text-navlink transition hover:text-white"
            >
              {n.label}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setOpen((o) => !o)}
            className="grid h-[34px] w-[34px] place-items-center bg-brand text-white lg:hidden"
            aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={open}
          >
            <i className={`fa ${open ? 'fa-times' : 'fa-bars'} text-lg`} />
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-white/10 bg-ink-650 px-[15px] py-2 lg:hidden">
          {NAV.map((n) => (
            <button
              key={n.section}
              onClick={() => {
                setOpen(false)
                goTo(n.section)
              }}
              className="block w-full py-3 text-left text-[13px] uppercase tracking-[1.5px] text-navlink"
            >
              {n.label}
            </button>
          ))}
        </nav>
      )}
    </header>
  )
}

export function TikTokIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M19.6 6.7a4.8 4.8 0 0 1-3.8-4.2V2h-3.4v13.6a2.9 2.9 0 1 1-2-2.7V9.4a6.3 6.3 0 1 0 5.4 6.2V8.7a8.2 8.2 0 0 0 3.8 1.2V6.7z" />
    </svg>
  )
}

function Footer() {
  return (
    <footer className="bg-footer py-10 text-white">
      <div className="container-odoo grid gap-8 md:grid-cols-3 md:gap-[30px]">
        <div>
          <h4 className="font-display text-2xl leading-none tracking-[2.4px]">
            LEON <span className="text-brand">LOCATION</span> PRO
          </h4>
          <img src={logoUrl} alt="" className="mt-3 h-[50px] w-[50px]" />
          <p className="mt-3 text-[14.4px] italic leading-[21.6px] text-muted">
            Votre partenaire de confiance pour explorer La Réunion en toute liberté. Qualité pro, service local.
          </p>
        </div>
        <div>
          <h5 className="mb-4 font-display text-xl leading-none tracking-[2px] text-brand underline underline-offset-4">INFORMATIONS</h5>
          <ul className="space-y-[10.4px] text-[14.4px] leading-[21.6px]">
            <li><Link to="/politique-confidentialite" className="hover:text-brand">Politique de confidentialité</Link></li>
            <li><Link to="/modalites-vente" className="hover:text-brand">Modalités de vente (CGV)</Link></li>
            <li><Link to="/mentions-legales" className="hover:text-brand">Mentions Légales</Link></li>
          </ul>
        </div>
        <div>
          <h5 className="mb-4 font-display text-xl leading-none tracking-[2px] text-brand underline underline-offset-4">NOUS SUIVRE</h5>
          <div className="flex items-center gap-5 text-brand">
            <a href={SOCIAL.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><i className="fa fa-facebook" /></a>
            <a href={SOCIAL.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><i className="fa fa-instagram" /></a>
            <a href={SOCIAL.tiktok} target="_blank" rel="noreferrer" aria-label="TikTok"><TikTokIcon className="h-[21px] w-[21px]" /></a>
          </div>
          <p className="mt-6 text-sm text-muted">© {new Date().getFullYear()} LEON Location PRO. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  )
}

export function Layout() {
  const { pathname, state } = useLocation()
  useEffect(() => {
    const section = (state as { section?: string } | null)?.section
    if (section && section !== 'top') {
      requestAnimationFrame(() => document.getElementById(section)?.scrollIntoView())
    } else {
      window.scrollTo(0, 0)
    }
  }, [pathname, state])

  return (
    <div className="flex min-h-svh flex-col">
      <Header />
      <main className="flex-1 pt-[66px]">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
