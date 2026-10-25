import { useEffect, useState } from 'react'
import { CalendarDays, MapPin, Search } from 'lucide-react'
import { data } from '../data/provider'
import type { Location } from '../types'
import { TIMES, defaultSearch, validateSearch, type SearchForm } from '../lib/search'

interface Props {
  initial?: SearchForm | null
  onSubmit: (form: SearchForm) => void
  submitLabel?: string
  compact?: boolean
}

/** Formulaire "dates et lieu", utilisé sur l'accueil et à l'étape 1 de la réservation. */
export function SearchWidget({ initial, onSubmit, submitLabel = 'Voir les véhicules disponibles', compact }: Props) {
  const [form, setForm] = useState<SearchForm>(initial ?? defaultSearch())
  const [sameReturn, setSameReturn] = useState(!initial || initial.pickup === initial.dropoff)
  const [locations, setLocations] = useState<Location[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    data.getLocations().then(setLocations)
  }, [])

  const set = (patch: Partial<SearchForm>) => setForm((f) => ({ ...f, ...patch }))
  const today = new Date().toISOString().slice(0, 10)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const final = sameReturn ? { ...form, dropoff: form.pickup } : form
    const err = validateSearch(final)
    setError(err)
    if (!err) onSubmit(final)
  }

  return (
    <form onSubmit={submit} className={`grid gap-4 ${compact ? '' : 'lg:grid-cols-[1.3fr_1fr_1fr_auto] lg:items-end'}`}>
      <div>
        <label className="label" htmlFor="pickup">
          <MapPin size={12} className="mr-1 inline" />
          Lieu de retrait
        </label>
        <select id="pickup" className="input" value={form.pickup} onChange={(e) => set({ pickup: e.target.value })}>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
              {l.fee ? ` (+${l.fee} €)` : ''}
            </option>
          ))}
        </select>
        <label className="mt-2 flex items-center gap-2 text-xs text-slate-500">
          <input type="checkbox" checked={sameReturn} onChange={(e) => setSameReturn(e.target.checked)} className="h-4 w-4 accent-brand-500" />
          Retour au même endroit
        </label>
      </div>

      <div>
        <label className="label" htmlFor="startDate">
          <CalendarDays size={12} className="mr-1 inline" />
          Retrait
        </label>
        <div className="flex gap-2">
          <input id="startDate" type="date" min={today} className="input min-w-0" value={form.startDate} onChange={(e) => set({ startDate: e.target.value, ...(e.target.value > form.endDate ? { endDate: e.target.value } : {}) })} />
          <select aria-label="Heure de retrait" className="input w-24 shrink-0" value={form.startTime} onChange={(e) => set({ startTime: e.target.value })}>
            {TIMES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="endDate">
          <CalendarDays size={12} className="mr-1 inline" />
          Retour
        </label>
        <div className="flex gap-2">
          <input id="endDate" type="date" min={form.startDate} className="input min-w-0" value={form.endDate} onChange={(e) => set({ endDate: e.target.value })} />
          <select aria-label="Heure de retour" className="input w-24 shrink-0" value={form.endTime} onChange={(e) => set({ endTime: e.target.value })}>
            {TIMES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {!sameReturn && (
        <div className={compact ? '' : 'lg:col-span-1 lg:row-start-2'}>
          <label className="label" htmlFor="dropoff">
            <MapPin size={12} className="mr-1 inline" />
            Lieu de retour
          </label>
          <select id="dropoff" className="input" value={form.dropoff} onChange={(e) => set({ dropoff: e.target.value })}>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className={compact ? '' : 'lg:row-start-1 lg:col-start-4'}>
        <button type="submit" className="btn-primary w-full py-3.5 text-base lg:mb-6">
          <Search size={18} />
          {submitLabel}
        </button>
      </div>
      {error && <p className="text-sm font-medium text-accent-600 lg:col-span-4" role="alert">{error}</p>}
    </form>
  )
}
