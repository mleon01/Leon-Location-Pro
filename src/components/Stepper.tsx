import { Fragment } from 'react'
import { Link } from 'react-router-dom'

// Frise des étapes de réservation : une ligne et des ronds.
// Étape passée : rond plein avec ✓ (cliquable pour revenir en arrière)
// Étape en cours : rond plein, halo · Étape à venir : rond vide.

export const STEPS = ['Dates', 'Véhicule', 'Options', 'Récapitulatif', 'Paiement', 'Documents'] as const
export type StepIndex = 0 | 1 | 2 | 3 | 4 | 5

interface Props {
  current: StepIndex
  /** Liens (ou actions) pour revenir à une étape passée */
  back?: Partial<Record<StepIndex, string | (() => void)>>
}

export function Stepper({ current, back = {} }: Props) {
  const progress = (current / (STEPS.length - 1)) * 100
  return (
    <nav aria-label="Étapes de la réservation" className="mx-auto w-full max-w-[860px] px-1 pb-2 pt-6">
      <ol className="relative flex items-start justify-between [--inset:16px] sm:[--inset:48px]">
        {/* ligne de fond + progression */}
        <span className="absolute left-[var(--inset)] right-[var(--inset)] top-[15px] h-[2px] bg-white/15 sm:top-[17px]" aria-hidden="true" />
        <span
          className="absolute left-[var(--inset)] top-[15px] h-[2px] bg-brand transition-all duration-500 sm:top-[17px]"
          style={{ width: `calc((100% - 2 * var(--inset)) * ${progress / 100})` }}
          aria-hidden="true"
        />
        {STEPS.map((label, i) => {
          const done = i < current
          const active = i === current
          const action = done ? back[i as StepIndex] : undefined
          const circle = (
            <span
              className={[
                'relative z-10 grid h-8 w-8 place-items-center rounded-full text-sm font-bold transition sm:h-9 sm:w-9',
                done ? 'bg-brand text-ink-950' : '',
                active ? 'bg-brand text-ink-950 ring-4 ring-brand/25' : '',
                !done && !active ? 'border-2 border-white/25 bg-ink-700 text-white/45' : '',
                action ? 'group-hover:ring-4 group-hover:ring-brand/30' : '',
              ].join(' ')}
            >
              {done ? <i className="fa fa-check text-[13px]" /> : i + 1}
            </span>
          )
          const text = (
            <span
              className={[
                'mt-2 text-center text-[11px] uppercase leading-tight tracking-[1px] sm:text-[12px]',
                active ? 'font-bold text-white' : done ? 'text-brand' : 'text-white/45',
                'hidden sm:block',
              ].join(' ')}
            >
              {label}
            </span>
          )
          const content = (
            <>
              {circle}
              {text}
            </>
          )
          const cls = 'group flex w-8 flex-col items-center sm:w-24'
          return (
            <Fragment key={label}>
              <li className="relative" aria-current={active ? 'step' : undefined}>
                {typeof action === 'string' ? (
                  <Link to={action} className={cls} title={`Revenir à l'étape « ${label} »`}>{content}</Link>
                ) : action ? (
                  <button type="button" onClick={action} className={cls} title={`Revenir à l'étape « ${label} »`}>{content}</button>
                ) : (
                  <span className={cls}>{content}</span>
                )}
              </li>
            </Fragment>
          )
        })}
      </ol>
      <p className="mt-1 text-center text-xs text-muted sm:hidden">
        Étape {current + 1} sur {STEPS.length} · <b className="text-white">{STEPS[current]}</b>
      </p>
    </nav>
  )
}
