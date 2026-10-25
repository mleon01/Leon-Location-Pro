import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, X } from 'lucide-react'
import { data } from '../data/provider'
import { useAsync } from '../lib/useAsync'
import { categoryLabel } from '../lib/format'
import { VehicleCard } from '../components/VehicleCard'
import { PageHeader } from '../components/PageHeader'
import type { Category } from '../types'

const CATS = Object.keys(categoryLabel) as Category[]
type Sort = 'prix-asc' | 'prix-desc' | 'places'

export function FleetPage() {
  const [params, setParams] = useSearchParams()
  const category = params.get('categorie') as Category | null
  const [transmission, setTransmission] = useState<'' | 'manuelle' | 'automatique'>('')
  const [minSeats, setMinSeats] = useState(0)
  const [maxPrice, setMaxPrice] = useState(120)
  const [sort, setSort] = useState<Sort>('prix-asc')
  const [showFilters, setShowFilters] = useState(false)
  const { data: vehicles, loading } = useAsync(() => data.getVehicles())

  const list = useMemo(() => {
    const out = (vehicles ?? []).filter(
      (v) =>
        v.status === 'actif' &&
        (!category || v.category === category) &&
        (!transmission || v.transmission === transmission) &&
        v.seats >= minSeats &&
        v.dailyRate <= maxPrice,
    )
    return out.sort((a, b) => (sort === 'prix-desc' ? b.dailyRate - a.dailyRate : sort === 'places' ? b.seats - a.seats : a.dailyRate - b.dailyRate))
  }, [vehicles, category, transmission, minSeats, maxPrice, sort])

  const setCategory = (c: Category | null) => {
    const next = new URLSearchParams(params)
    if (c) next.set('categorie', c)
    else next.delete('categorie')
    setParams(next, { replace: true })
  }
  const activeFilters = Number(!!transmission) + Number(minSeats > 0) + Number(maxPrice < 120)
  const reset = () => {
    setTransmission('')
    setMinSeats(0)
    setMaxPrice(120)
    setCategory(null)
  }

  return (
    <>
      <PageHeader kicker="Notre flotte" title="Des véhicules récents pour toute l’île" text="Citadines économiques, SUV et 4x4 pour les Hauts, 7 et 9 places pour les familles, utilitaires pour vos projets." />

      <div className="container-page py-8">
        {/* Catégories : défilement horizontal sur mobile */}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
          <button onClick={() => setCategory(null)} className={`chip shrink-0 px-4 py-2 text-sm ${!category ? 'bg-ink-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>
            Tous
          </button>
          {CATS.map((c) => (
            <button key={c} onClick={() => setCategory(c)} className={`chip shrink-0 px-4 py-2 text-sm ${category === c ? 'bg-ink-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>
              {categoryLabel[c]}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button onClick={() => setShowFilters((s) => !s)} className="btn-ghost py-2.5" aria-expanded={showFilters}>
            <SlidersHorizontal size={16} /> Filtres
            {activeFilters > 0 && <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-500 text-xs text-white">{activeFilters}</span>}
          </button>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="input w-auto py-2.5" aria-label="Trier">
            <option value="prix-asc">Prix croissant</option>
            <option value="prix-desc">Prix décroissant</option>
            <option value="places">Nombre de places</option>
          </select>
        </div>

        {showFilters && (
          <div className="card mt-3 grid gap-5 p-5 sm:grid-cols-3">
            <div>
              <span className="label">Boîte de vitesses</span>
              <div className="flex gap-2">
                {(['', 'manuelle', 'automatique'] as const).map((t) => (
                  <button key={t} onClick={() => setTransmission(t)} className={`chip flex-1 justify-center py-2 text-sm ${transmission === t ? 'bg-brand-500 text-white' : 'bg-paper text-slate-600'}`}>
                    {t === '' ? 'Toutes' : t === 'manuelle' ? 'Manuelle' : 'Auto'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="label">Places minimum</span>
              <div className="flex gap-2">
                {[0, 5, 7, 9].map((n) => (
                  <button key={n} onClick={() => setMinSeats(n)} className={`chip flex-1 justify-center py-2 text-sm ${minSeats === n ? 'bg-brand-500 text-white' : 'bg-paper text-slate-600'}`}>
                    {n === 0 ? 'Toutes' : `${n}+`}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label" htmlFor="maxPrice">
                Prix max : <span className="text-ink-800">{maxPrice >= 120 ? 'sans limite' : `${maxPrice} € / jour`}</span>
              </label>
              <input id="maxPrice" type="range" min={30} max={120} step={5} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-full accent-brand-500" />
            </div>
            {activeFilters > 0 && (
              <button onClick={reset} className="flex items-center gap-1 text-sm font-medium text-accent-600 sm:col-span-3">
                <X size={14} /> Réinitialiser les filtres
              </button>
            )}
          </div>
        )}

        <p className="mt-6 text-sm text-slate-500">{loading ? 'Chargement…' : `${list.length} véhicule${list.length > 1 ? 's' : ''}`}</p>

        <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {loading &&
            Array.from({ length: 6 }, (_, i) => <div key={i} className="card h-80 animate-pulse bg-slate-100" />)}
          {list.map((v) => (
            <VehicleCard
              key={v.id}
              vehicle={v}
              footer={
                <div className="flex gap-2">
                  <Link to={`/flotte/${v.id}`} className="btn-ghost flex-1">Détails</Link>
                  <Link to={`/reserver?vehicule=${v.id}`} className="btn-primary flex-1">Réserver</Link>
                </div>
              }
            />
          ))}
        </div>
        {!loading && list.length === 0 && (
          <div className="card mt-3 p-10 text-center">
            <p className="font-display text-2xl">Aucun véhicule ne correspond</p>
            <button onClick={reset} className="btn-primary mt-4">Voir toute la flotte</button>
          </div>
        )}
      </div>
    </>
  )
}
