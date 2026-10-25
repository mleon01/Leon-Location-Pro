import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { data } from '../data/provider'
import { useAsync } from '../lib/useAsync'
import { money } from '../lib/format'
import { PeriodInputs } from '../components/PeriodInputs'

const heroImage = `${import.meta.env.BASE_URL}img/hero.jpg`

const STEPS = [
  { title: 'Choisissez vos dates', text: 'Sélectionnez la période de location souhaitée via notre moteur de recherche.' },
  { title: 'Sélectionnez vos options', text: 'Personnalisez votre location avec nos services et équipements additionnels.' },
  { title: 'Payez en ligne et récupérez les clés', text: 'Réglez en toute sécurité et récupérez votre véhicule pour commencer votre aventure.' },
]

const FEATURES = [
  { icon: 'fa-shield', title: 'Assurance incluse', label: 'Sérénité', text: "Roulez l'esprit tranquille, tous nos véhicules bénéficient d'une couverture complète." },
  { icon: 'fa-support', title: 'Assistance 24/7', label: 'Confiance', text: "Une équipe dédiée à votre écoute jour et nuit, partout sur l'île." },
  { icon: 'fa-calendar-check-o', title: 'Annulation gratuite', label: 'Flexibilité', text: "Changez d'avis sans frais jusqu'à 24h avant votre départ." },
]

const FAQ = [
  {
    q: 'Quels documents sont nécessaires pour louer une voiture ?',
    a: "Pour louer un véhicule, vous devez présenter une pièce d'identité en cours de validité, un permis de conduire valide et une carte bancaire au nom du conducteur principal.",
  },
  { q: "Que se passe-t-il en cas de panne ou d'accident ?", a: 'Tous nos véhicules sont assurés.' },
  {
    q: "La livraison du véhicule à l'aéroport est-elle possible ?",
    a: "Oui, nous proposons la livraison et la récupération directement à l'aéroport Roland Garros (Saint-Denis).",
  },
  { q: 'Puis-je modifier ou annuler ma réservation ?', a: "Oui, l'annulation est gratuite jusqu'à 24h avant votre départ." },
  {
    q: 'Comment fonctionne la caution et quand est-elle restituée ?',
    a: "Une caution est prélevée au moment de la remise des clés. Son montant varie selon le véhicule. Elle est restituée intégralement dans un délai de 5 à 7 jours ouvrés après le retour du véhicule, sous réserve qu'aucun dommage ne soit constaté.",
  },
]

const H2 = 'title-odoo text-center text-[clamp(2.5rem,5vw,4rem)]'
const LEAD = 'text-center text-lg font-light italic text-muted'

function HeroSearch() {
  const navigate = useNavigate()
  const { data: catalog } = useAsync(() => data.getCatalog())
  const [period, setPeriod] = useState<{ start: string; end: string } | null>(null)
  const [signal, setSignal] = useState(0)

  const go = (start: string, end: string) => navigate(`/shop?${new URLSearchParams({ start_date: start, end_date: end })}`)

  return (
    <div className="flex max-w-[730px] flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
      <div className="sm:w-[442px]">
        <PeriodInputs
          variant="hero"
          placement="top"
          start={period?.start ?? null}
          end={period?.end ?? null}
          forbiddenWeekdays={catalog?.forbiddenWeekdays}
          openSignal={signal}
          onApply={(s, e) => {
            setPeriod({ start: s, end: e })
            go(s, e)
          }}
        />
      </div>
      <button
        type="button"
        onClick={() => (period ? go(period.start, period.end) : setSignal((n) => n + 1))}
        className="btn-odoo h-[56px] px-8 text-[13.12px] font-semibold tracking-[1.84px] sm:ml-auto sm:w-[280px]"
      >
        Réserver un véhicule
      </button>
    </div>
  )
}

function FeaturedFleet() {
  const { data: catalog, loading } = useAsync(() => data.getCatalog())
  const featured = catalog?.products.filter((p) => p.featured) ?? []
  if (loading) return <div className="h-[449px]" />
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {featured.map((p) => (
        <Link key={p.id} to="/shop" className="group relative mt-4 block aspect-[359/449] overflow-hidden rounded-md bg-ink-800">
          <img src={p.image} alt={p.name} className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:opacity-0" loading="lazy" />
          {p.images[0] && <img src={p.images[0]} alt="" className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-300 group-hover:opacity-100" loading="lazy" />}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-3 pt-10 sm:px-4 sm:pb-5">
            <h6 className="font-display text-sm leading-none text-white sm:text-[23.45px]">{p.name}</h6>
            <p className="mt-1 text-[11px] font-semibold text-white sm:mt-3 sm:text-lg">
              Du {money(p.listPrice)} / 1 Jour
            </p>
          </div>
        </Link>
      ))}
    </div>
  )
}

export function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <>
      {/* ─── Bannière ─── */}
      <section id="top" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroImage})` }} />
        <div className="absolute inset-0 bg-[#0d1117]/70" />
        <div className="container-odoo relative pb-[88px] pt-16">
          <div className="lg:w-2/3">
            <p className="mb-2 text-xs uppercase tracking-[3.6px] text-brand">Location de véhicules — La Réunion</p>
            <h1 className="font-display text-[clamp(3rem,6.66vw,5.68rem)] font-light leading-[0.9] text-white">LEON</h1>
            <h1 className="mb-4 font-display text-[clamp(3rem,6.66vw,5.68rem)] font-light leading-[0.9] text-white">
              <span className="text-brand">LOCATION</span> PRO
            </h1>
            <h2 className="mb-2 font-serif text-[clamp(2.6rem,4.76vw,4.06rem)] font-light italic leading-none text-white">Voyagez sans limite.</h2>
            <p className="mb-6 max-w-[500px] text-[17px] font-light leading-[25.5px] text-white/70">
              Nous avons la voiture qu'il vous faut — que vous soyez touriste en escale ou réunionnais pressé.
            </p>
            <p className="mb-4 mt-12 uppercase text-brand-dark">— Sélectionnez vos dates de réservation</p>
            <HeroSearch />
          </div>
        </div>
      </section>

      {/* ─── Comment ça marche ─── */}
      <section id="processus" className="scroll-mt-[66px] bg-ink-850 pb-16 pt-14">
        <div className="container-odoo">
          <h2 className={`${H2} mb-2 text-brand`}>COMMENT ÇA MARCHE ?</h2>
          <p className={`${LEAD} mb-12`}>Le Processus</p>
          <ol className="relative grid gap-6 lg:grid-cols-3 lg:gap-0">
            <span className="absolute left-[16.6%] right-[16.6%] top-[54px] hidden h-px bg-white/10 lg:block" aria-hidden="true" />
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative px-4 py-6 text-center">
                <span className="mx-auto grid h-[60px] w-[60px] place-items-center rounded-full bg-brand font-display text-2xl text-ink-900">{i + 1}</span>
                <h4 className="mb-2 mt-6 font-display text-xl leading-none">{s.title}</h4>
                <p className="text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ─── Notre flotte ─── */}
      <section id="flotte" className="scroll-mt-[66px] bg-ink-700 pt-12">
        <div className="container-odoo">
          <h2 className={`${H2} mb-2 text-white`}>NOTRE FLOTTE</h2>
          <p className={`${LEAD} mb-4 !text-white`}>Des véhicules récents, entretenus et prêts pour l'aventure.</p>
          <FeaturedFleet />
        </div>
      </section>
      <section className="bg-ink-700 pb-12 pt-6 text-center">
        <Link to="/shop" className="btn-odoo border border-brand px-12 py-4 text-sm tracking-[1.68px]">
          Réserver un véhicule
        </Link>
      </section>

      {/* ─── Pourquoi nous choisir ─── */}
      <section id="avantages" className="scroll-mt-[66px] bg-ink-850 py-14">
        <div className="container-odoo">
          <h2 className={`${H2} mb-2 text-brand`}>POURQUOI NOUS CHOISIR ?</h2>
          <p className={`${LEAD} mb-12`}>La confiance et la transparence au service de votre mobilité.</p>
          <div className="grid gap-10 lg:grid-cols-3 lg:gap-0">
            {FEATURES.map((f) => (
              <div key={f.title} className="px-[15px] text-center">
                <span className="mx-auto mb-8 block h-px w-14 bg-alert" />
                <i className={`fa ${f.icon} mb-4 text-brand`} style={{ fontSize: 48 }} />
                <h3 className="mb-2 font-display text-2xl leading-none">{f.title}</h3>
                <p className="text-muted">
                  <b className="text-white">{f.label} :</b> {f.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="bg-ink-700 pb-16 pt-12">
        <div className="container-odoo">
          <h2 className={`${H2} mb-2 text-brand`}>FAQ</h2>
          <p className={`${LEAD} mb-4 !text-base`}>Vous vous posez des questions ? Nous y répondons ici.</p>
          <div className="overflow-hidden rounded-[5px]">
            {FAQ.map((item, i) => (
              <div key={item.q} className="border-b border-white/10 bg-ink-650 last:border-b-0">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center gap-2 px-6 py-4 text-left font-semibold"
                  aria-expanded={openFaq === i}
                >
                  <span className="flex-1">{item.q}</span>
                  <i className={`fa fa-angle-down text-xl transition ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && <p className="px-6 pb-5 text-muted">{item.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
