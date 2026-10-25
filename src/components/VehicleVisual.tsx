import type { Vehicle } from '../types'
import { CarIllustration } from './CarIllustration'

const backdrops: Record<Vehicle['category'], string> = {
  citadine: 'from-brand-50 to-sky-100',
  compacte: 'from-slate-100 to-brand-50',
  suv: 'from-emerald-50 to-brand-50',
  monospace: 'from-amber-50 to-brand-50',
  utilitaire: 'from-slate-100 to-slate-200',
}

/** Photo du véhicule si disponible, sinon illustration. */
export function VehicleVisual({ vehicle, className = '' }: { vehicle: Vehicle; className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${backdrops[vehicle.category]} ${className}`}>
      <div className="speed-lines absolute inset-0" />
      {vehicle.photo ? (
        <img src={vehicle.photo} alt={`${vehicle.brand} ${vehicle.model}`} className="relative h-full w-full object-cover" loading="lazy" />
      ) : (
        <CarIllustration category={vehicle.category} color={vehicle.color} className="relative mx-auto h-full w-[88%] drop-shadow-sm" />
      )}
    </div>
  )
}
