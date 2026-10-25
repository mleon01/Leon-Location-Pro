import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BadgeCheck, CalendarCheck, CreditCard, Headphones, KeyRound, Plane, ShieldCheck, Sparkles, Undo2 } from 'lucide-react'
import { data } from '../data/provider'
import { useAsync } from '../lib/useAsync'
import { formToParams } from '../lib/search'
import { categoryLabel } from '../lib/format'
import { SearchWidget } from '../components/SearchWidget'
import { VehicleCard } from '../components/VehicleCard'
import { CarIllustration } from '../components/CarIllustration'
import { COMPANY } from '../config'
import type { Category } from '../types'

const STEPS = [
  { icon: CalendarCheck, title: 'Choisissez vos dates', text: 'Indiquez où et quand vous souhaitez prendre le véhicule.' },
  { icon: Sparkles, title: 'Sélectionnez vos options', text: 'Siège bébé, conducteur supplémentaire, franchise réduite…' },
  { icon: KeyRound, title: 'Payez et récupérez les clés', text: 'Paiement sécurisé, comptant ou en plusieurs fois. Les clés vous attendent.' },
]

const REASONS = [
  { icon: Plane, title: 'Livraison aéroport', text: 'Remise des clés à Roland Garros dès votre atterrissage, sans frais.' },
  { icon: ShieldCheck, title: 'Assurance incluse', text: 'Tous nos véhicules sont assurés. Franchise réduite en option.' },
  { icon: Headphones, title: 'Assistance 24h/24', text: 'Un problème sur la route ? Nous intervenons partout sur l’île.' },
  { icon: Undo2, title: 'Annulation gratuite', text: `Jusqu’à ${COMPANY.cancellationHours} h avant le départ, sans justificatif.` },
  { icon: CreditCard, title: 'Paiement en plusieurs fois', text: 'Réglez comptant ou en 3 ou 4 fois sans frais.' },
  { icon: BadgeCheck, title: 'Véhicules récents', text: 'Une flotte entretenue, propre et prête pour l’aventure.' },
]

const CATEGORIES: { cat: Category; color: string }[] = [
  { cat: 'citadine', color: '#00aaff' },
  { cat: 'suv', color: '#3f6212' },
  { cat: 'monospace', color: '#64748b' },
  { cat: 'utilitaire', color: '#e9edf2' },
]

export function HomePage() {
  const navigate = useNavigate()
  const { data: vehicles } = useAsync(() => data.getVehicles())
  const featured = vehicles?.filter((v) => v.status === 'actif' && ['v-208', 'v-duster', 'v-jogger'].includes(v.id))

  return (
    <>
      {/* ─── Bannière ─── */}
      <section className="relative overflow-hidden bg-ink-900 text-white">
        <div className="speed-lines absolute inset-0 opacity-60" />
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-500/25 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 h-80 w-80 rounded-full bg-accent-500/15 blur-3xl" />
        <div className="container-page relative grid gap-6 pb-36 pt-10 sm:pt-16 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:pb-44">
          <div>
            <p className="chip bg-white/10 text-brand-300 ring-1 ring-white/10">
              <Plane size={14} /> Livraison à l’aéroport Roland Garros
            </p>
            <h1 className="mt-4 font-display text-6xl leading-[0.9] sm:text-7xl lg:text-8xl">
              Voyagez
              <br />
              <span className="bg-gradient-to-r from-brand-400 to-brand-500 bg-clip-text text-transparent">sans limite</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-slate-300">
              Location de véhicules à La Réunion. {COMPANY.tagline} : citadines, 4x4, 9 places et utilitaires, réservés en 2 minutes.
            </p>
          </div>
          <div className="relative hidden lg:block">
            <div className="absolute inset-x-6 bottom-6 h-10 rounded-full bg-brand-500/30 blur-2xl" />
            <CarIllustration category="suv" color="#00aaff" className="relative w-full drop-shadow-2xl" />
          </div>
        </div>
      </section>

      {/* ─── Moteur de recherche ─── */}
      <section className="container-page relative z-10 -mt-28 lg:-mt-32">
        <div className="card p-5 shadow-xl sm:p-6">
          <h2 className="mb-4 font-display text-3xl text-ink-900">Trouvez votre véhicule</h2>
          <SearchWidget onSubmit={(f) => navigate(`/reserver?${formToParams(f)}`)} />
        </div>
      </section>

      {/* ─── Comment ça marche ─── */}
      <section className="container-page py-16 sm:py-20">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent-500">Simple et rapide</p>
        <h2 className="section-title mt-1">Comment ça marche ?</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card relative p-6">
              <span className="absolute right-5 top-3 font-display text-6xl text-slate-100">{i + 1}</span>
              <span className="relative grid h-12 w-12 place-items-center rounded-xl bg-brand-500 text-white shadow-lg shadow-brand-500/25">
                <s.icon size={22} />
              </span>
              <h3 className="relative mt-4 font-display text-2xl">{s.title}</h3>
              <p className="relative mt-1 text-sm text-slate-600">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ─── Catégories ─── */}
      <section className="bg-white py-16 sm:py-20">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-accent-500">Notre flotte</p>
              <h2 className="section-title mt-1">Un véhicule pour chaque aventure</h2>
            </div>
            <Link to="/flotte" className="btn-ghost">
              Toute la flotte <ArrowRight size={16} />
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {CATEGORIES.map(({ cat, color }) => (
              <Link key={cat} to={`/flotte?categorie=${cat}`} className="group rounded-2xl border border-slate-200 bg-paper p-4 transition hover:border-brand-300 hover:bg-brand-50">
                <CarIllustration category={cat} color={color} className="w-full transition group-hover:translate-x-1" />
                <p className="mt-2 font-display text-xl text-ink-900">{categoryLabel[cat]}</p>
                {vehicles && (
                  <p className="text-xs text-slate-500">
                    dès {Math.min(...vehicles.filter((v) => v.category === cat).map((v) => v.dailyRate))} € / jour
                  </p>
                )}
              </Link>
            ))}
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured?.map((v) => (
              <VehicleCard
                key={v.id}
                vehicle={v}
                footer={
                  <Link to={`/flotte/${v.id}`} className="btn-ghost w-full">
                    Voir la fiche
                  </Link>
                }
              />
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pourquoi nous ─── */}
      <section className="container-page py-16 sm:py-20">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent-500">Nos engagements</p>
        <h2 className="section-title mt-1">Pourquoi nous choisir ?</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {REASONS.map((r) => (
            <div key={r.title} className="flex gap-4 rounded-2xl p-2">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <r.icon size={22} />
              </span>
              <div>
                <h3 className="font-semibold text-ink-900">{r.title}</h3>
                <p className="mt-0.5 text-sm text-slate-600">{r.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Appel à réserver ─── */}
      <section className="container-page pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-ink-900 px-6 py-12 text-center text-white sm:px-12">
          <div className="speed-lines absolute inset-0" />
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-brand-500 to-accent-500" />
          <h2 className="relative font-display text-5xl sm:text-6xl">Prêt à explorer l’île ?</h2>
          <p className="relative mx-auto mt-3 max-w-md text-slate-300">Réservez en ligne en quelques minutes. Paiement sécurisé et annulation gratuite jusqu’à 24 h avant.</p>
          <div className="relative mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/reserver" className="btn-primary px-8 py-4 text-base">
              Réserver maintenant <ArrowRight size={18} />
            </Link>
            <a href={COMPANY.phoneHref} className="btn border border-white/20 px-8 py-4 text-base text-white hover:bg-white/10">
              Appeler {COMPANY.phone}
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
