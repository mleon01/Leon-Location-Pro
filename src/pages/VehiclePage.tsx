import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Check, ShieldCheck } from 'lucide-react'
import { data } from '../data/provider'
import { useAsync } from '../lib/useAsync'
import { categoryLabel, money } from '../lib/format'
import { VehicleVisual } from '../components/VehicleVisual'
import { VehicleSpecs } from '../components/VehicleCard'

export function VehiclePage() {
  const { id = '' } = useParams()
  const { data: vehicle, loading } = useAsync(() => data.getVehicle(id), [id])
  const { data: rules } = useAsync(() => data.getPricingRules())

  if (loading) return <div className="container-page py-20 text-center text-slate-500">Chargement…</div>
  if (!vehicle)
    return (
      <div className="container-page py-20 text-center">
        <p className="font-display text-3xl">Véhicule introuvable</p>
        <Link to="/flotte" className="btn-primary mt-4">Retour à la flotte</Link>
      </div>
    )

  const tiers = [{ minDays: 1, percent: 0 }, ...(rules?.durationDiscounts ?? [])]

  return (
    <div className="container-page py-6 sm:py-10">
      <Link to="/flotte" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-600">
        <ArrowLeft size={16} /> Toute la flotte
      </Link>
      <div className="mt-4 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <VehicleVisual vehicle={vehicle} className="aspect-[16/10] rounded-3xl" />
          <div className="mt-6">
            <span className="chip bg-brand-50 text-brand-700">{categoryLabel[vehicle.category]}</span>
            <h1 className="mt-2 font-display text-5xl leading-none text-ink-900 sm:text-6xl">
              {vehicle.brand} {vehicle.model}
            </h1>
            <p className="text-sm text-slate-500">ou modèle similaire · {vehicle.year}</p>
            <p className="mt-4 text-lg text-slate-700">{vehicle.description}</p>
            <VehicleSpecs vehicle={vehicle} className="mt-5 text-base" />
            <h2 className="mt-8 font-display text-2xl">Équipements</h2>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {vehicle.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-slate-700">
                  <Check size={16} className="text-brand-600" /> {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6">
            <p className="text-sm text-slate-500">À partir de</p>
            <p className="font-display text-6xl leading-none text-brand-600">
              {vehicle.dailyRate} €<span className="text-2xl text-slate-400"> / jour</span>
            </p>
            <table className="mt-5 w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2 font-semibold">Durée</th>
                  <th className="pb-2 text-right font-semibold">Prix / jour</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((t, i) => {
                  const next = tiers[i + 1]
                  return (
                    <tr key={t.minDays} className="border-t border-slate-100">
                      <td className="py-2">{next ? `${t.minDays} à ${next.minDays - 1} jours` : `${t.minDays} jours et +`}</td>
                      <td className="py-2 text-right font-semibold">
                        {money(Math.round(vehicle.dailyRate * (1 - t.percent / 100) * 100) / 100)}
                        {t.percent > 0 && <span className="ml-1.5 text-xs font-medium text-emerald-600">−{t.percent} %</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-paper p-3 text-sm text-slate-600">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-brand-600" />
              Caution de {money(vehicle.deposit)} : empreinte bancaire au retrait, en ligne via Gando ou par téléphone.
            </p>
            <Link to={`/reserver?vehicule=${vehicle.id}`} className="btn-primary mt-5 w-full py-4 text-base">
              Réserver ce véhicule
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
