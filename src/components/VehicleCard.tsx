import type { ReactNode } from 'react'
import { Briefcase, Cog, Fuel, Snowflake, Users } from 'lucide-react'
import type { Vehicle } from '../types'
import { categoryLabel, fuelLabel } from '../lib/format'
import { VehicleVisual } from './VehicleVisual'

export function VehicleSpecs({ vehicle, className = '' }: { vehicle: Vehicle; className?: string }) {
  const items = [
    { icon: Users, label: `${vehicle.seats} places` },
    { icon: Cog, label: vehicle.transmission === 'automatique' ? 'Automatique' : 'Manuelle' },
    { icon: Fuel, label: fuelLabel[vehicle.fuel] },
    vehicle.luggage > 0 ? { icon: Briefcase, label: `${vehicle.luggage} valises` } : { icon: Briefcase, label: vehicle.features[0] },
    ...(vehicle.airCon ? [{ icon: Snowflake, label: 'Climatisation' }] : []),
  ]
  return (
    <ul className={`flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-slate-600 ${className}`}>
      {items.map(({ icon: Icon, label }) => (
        <li key={label} className="flex items-center gap-1.5">
          <Icon size={15} className="text-brand-600" />
          {label}
        </li>
      ))}
    </ul>
  )
}

interface Props {
  vehicle: Vehicle
  price?: ReactNode
  badge?: ReactNode
  footer?: ReactNode
  dimmed?: boolean
}

export function VehicleCard({ vehicle, price, badge, footer, dimmed }: Props) {
  return (
    <article className={`card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg ${dimmed ? 'opacity-60' : ''}`}>
      <div className="relative">
        <VehicleVisual vehicle={vehicle} className="aspect-[16/9]" />
        <span className="chip absolute left-3 top-3 bg-white/90 text-ink-800 shadow-sm backdrop-blur">{categoryLabel[vehicle.category]}</span>
        {badge && <div className="absolute right-3 top-3">{badge}</div>}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-2xl leading-tight text-ink-900">
              {vehicle.brand} {vehicle.model}
            </h3>
            <p className="text-xs text-slate-500">ou modèle similaire</p>
          </div>
          {price ?? (
            <p className="text-right">
              <span className="block text-xs text-slate-500">à partir de</span>
              <span className="font-display text-3xl leading-none text-brand-600">{vehicle.dailyRate} €</span>
              <span className="text-xs text-slate-500"> / jour</span>
            </p>
          )}
        </div>
        <VehicleSpecs vehicle={vehicle} className="mt-3" />
        {footer && <div className="mt-auto pt-5">{footer}</div>}
      </div>
    </article>
  )
}
