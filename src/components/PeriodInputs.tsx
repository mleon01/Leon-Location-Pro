import { useRef, useState } from 'react'
import { DateRangePicker } from './DateRangePicker'
import { displayOdoo } from '../lib/time'

interface Props {
  start: string | null
  end: string | null
  forbiddenWeekdays?: number[]
  onApply(start: string, end: string): void
  onClear?(): void
  variant: 'hero' | 'shop'
  placement?: 'top' | 'bottom'
  align?: 'left' | 'right'
  /** Ouvre le calendrier depuis l'extérieur (ex. bouton « Réserver » sans dates) */
  openSignal?: number
}

/** Les deux champs « Date de départ / Date de retour » + le calendrier Odoo. */
export function PeriodInputs({ start, end, forbiddenWeekdays, onApply, onClear, variant, placement = 'bottom', align = 'left', openSignal = 0 }: Props) {
  const [open, setOpen] = useState(false)
  const [lastSignal, setLastSignal] = useState(openSignal)
  const anchor = useRef<HTMLDivElement>(null)
  if (openSignal !== lastSignal) {
    setLastSignal(openSignal)
    setOpen(true)
  }

  const hero = variant === 'hero'
  const inputCls = hero
    ? 'h-[52px] min-w-0 flex-1 bg-ink-900 px-4 text-base text-white placeholder:text-[#696867] outline-none cursor-pointer'
    : 'h-[49px] min-w-0 flex-1 bg-transparent px-4 text-sm text-[#f5f2ed] outline-none cursor-pointer'

  return (
    <div ref={anchor} className="relative w-full">
      <div className={hero ? 'flex border border-[#333] bg-ink-900' : 'flex items-stretch border border-white/20'}>
        {!hero && (
          <button type="button" onClick={() => setOpen(true)} className="grid w-10 shrink-0 place-items-center text-white" aria-label="Ouvrir le calendrier">
            <i className="fa fa-calendar text-sm" />
          </button>
        )}
        <input
          readOnly
          value={start ? displayOdoo(start) : ''}
          placeholder="Date de départ"
          onClick={() => setOpen(true)}
          className={`${inputCls} ${!hero ? 'bg-ink-650/60 shadow-[9px_0_0_-8px_rgba(245,242,237,0.15)]' : ''}`}
          aria-label="Date de départ"
        />
        <input
          readOnly
          value={end ? displayOdoo(end) : ''}
          placeholder="Date de retour"
          onClick={() => setOpen(true)}
          className={`${inputCls} ${!hero ? 'bg-ink-650/60' : ''}`}
          aria-label="Date de retour"
        />
        {hero ? (
          <button type="button" onClick={() => setOpen(true)} className="m-[3px] grid w-12 shrink-0 place-items-center bg-[#1b1b1b] text-white/60" aria-label="Ouvrir le calendrier">
            <i className="fa fa-calendar text-sm" />
          </button>
        ) : (
          onClear && (
            <button type="button" onClick={onClear} className="grid w-8 shrink-0 place-items-center bg-[#1b1b1b] text-white" aria-label="Effacer les dates">
              <i className="fa fa-times" />
            </button>
          )
        )}
      </div>
      {open && (
        <DateRangePicker
          start={start}
          end={end}
          forbiddenWeekdays={forbiddenWeekdays}
          placement={placement}
          align={align}
          anchorRef={anchor}
          onClose={() => setOpen(false)}
          onApply={(s, e) => {
            setOpen(false)
            onApply(s, e)
          }}
        />
      )}
    </div>
  )
}
