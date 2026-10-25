import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { currentLocalHour, fromOdoo, todayLocal, toOdoo } from '../lib/time'

// Calendrier de période, copie du sélecteur de la boutique Odoo :
// semaines numérotées, aujourd'hui entouré de rouge, période surlignée,
// heures de départ / retour et bouton « Appliquer ».

interface Props {
  start: string | null
  end: string | null
  forbiddenWeekdays?: number[]
  placement?: 'top' | 'bottom'
  align?: 'left' | 'right'
  anchorRef: RefObject<HTMLElement | null>
  onApply(start: string, end: string): void
  onClose(): void
}

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`
const TIMES = Array.from({ length: 48 }, (_, i) => `${pad(Math.floor(i / 2))}:${i % 2 ? '30' : '00'}`)
const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

function isoWeek(y: number, m: number, d: number) {
  const date = new Date(Date.UTC(y, m, d))
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
}

function monthLabel(y: number, m: number) {
  const s = new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(Date.UTC(y, m, 15)))
  return `${s.charAt(0).toUpperCase()}${s.slice(1)} ${y}`
}

export function DateRangePicker({ start, end, forbiddenWeekdays = [], placement = 'bottom', align = 'left', anchorRef, onApply, onClose }: Props) {
  const today = todayLocal()
  const nextHour = Math.min(currentLocalHour() + 1, 22)
  const initStart = start ? fromOdoo(start) : null
  const initEnd = end ? fromOdoo(end) : null
  const [from, setFrom] = useState<string | null>(initStart?.date ?? null)
  const [to, setTo] = useState<string | null>(initEnd?.date ?? null)
  const [fromTime, setFromTime] = useState(initStart?.time ?? `${pad(nextHour)}:00`)
  const [toTime, setToTime] = useState(initEnd?.time ?? `${pad(nextHour + 1)}:00`)
  const [view, setView] = useState(() => {
    const [y, m] = (initStart?.date ?? today).split('-').map(Number)
    return { y, m: m - 1 }
  })
  const [error, setError] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  // Fermeture au clic à l'extérieur ou avec Échap
  useEffect(() => {
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node
      if (!ref.current?.contains(t) && !anchorRef.current?.contains(t)) onClose()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [anchorRef, onClose])

  const cells = useMemo(() => {
    const first = new Date(Date.UTC(view.y, view.m, 1))
    const offset = (first.getUTCDay() + 6) % 7
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(Date.UTC(view.y, view.m, 1 - offset + i))
      return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), weekday: ((d.getUTCDay() + 6) % 7) + 1 }
    })
  }, [view])

  function pick(date: string) {
    setError('')
    if (!from || to || date < from) {
      setFrom(date)
      setTo(null)
    } else {
      setTo(date)
    }
  }

  function apply() {
    if (!from) return setError('Choisissez une date de départ.')
    const endDate = to ?? from
    const s = toOdoo(from, fromTime)
    const e = toOdoo(endDate, toTime)
    if (e <= s) return setError('Le retour doit être après le départ.')
    if (new Date(s.replace(' ', 'T') + 'Z').getTime() < Date.now()) return setError('Le départ est déjà passé.')
    onApply(s, e)
  }

  const move = (delta: number) => setView((v) => {
    const d = new Date(Date.UTC(v.y, v.m + delta, 1))
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() }
  })

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Choisir la période de location"
      className={`absolute z-50 w-[296px] bg-ink-750 px-2 pb-2 pt-3 text-[14px] text-[#f1f1f1] shadow-2xl ${placement === 'top' ? 'bottom-full mb-3' : 'top-full mt-3'} ${align === 'right' ? 'right-0' : 'left-0'}`}
    >
      <div className="mb-2 flex items-center gap-1 px-1">
        <button type="button" onClick={() => move(-1)} className="grid h-8 w-8 place-items-center text-white/80 hover:text-white" aria-label="Mois précédent">
          <i className="fa fa-angle-left text-xl" />
        </button>
        <button type="button" onClick={() => move(1)} className="grid h-8 w-8 place-items-center text-white/80 hover:text-white" aria-label="Mois suivant">
          <i className="fa fa-angle-right text-xl" />
        </button>
        <span className="ml-6 font-bold">{monthLabel(view.y, view.m)}</span>
      </div>

      <div className="grid grid-cols-8">
        <span />
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="flex h-[35px] items-center justify-center font-bold text-brand">{w}</span>
        ))}
        {Array.from({ length: 6 }, (_, row) => {
          const week = cells.slice(row * 7, row * 7 + 7)
          return [
            <span key={`w${row}`} className="flex h-[35px] items-center justify-center text-[11.2px] font-bold text-white/20">
              {isoWeek(week[0].y, week[0].m, week[0].d)}
            </span>,
            ...week.map((c) => {
              const date = iso(c.y, c.m, c.d)
              const outside = c.m !== view.m
              const disabled = date < today || forbiddenWeekdays.includes(c.weekday)
              const isStart = date === from
              const isEnd = date === (to ?? null)
              const inRange = !!from && !!to && date >= from && date <= to
              return (
                <button
                  key={date}
                  type="button"
                  disabled={disabled}
                  onClick={() => pick(date)}
                  className={[
                    'relative flex h-[35px] items-center justify-center',
                    inRange || isStart ? 'bg-brand/15' : '',
                    isStart ? 'rounded-l-full' : '',
                    isEnd || (isStart && !to) ? 'rounded-r-full' : '',
                    isStart || isEnd ? 'font-bold text-white' : '',
                    disabled || outside ? 'cursor-default text-white/20' : 'hover:bg-brand/30',
                    date === today ? 'font-extrabold' : '',
                  ].join(' ')}
                >
                  {(isStart || isEnd) && <span className="absolute inset-0.5 rounded-full bg-brand/40" />}
                  {date === today && <span className="absolute inset-0.5 rounded-full border-2 border-alert" />}
                  <span className="relative">{c.d}</span>
                </button>
              )
            }),
          ]
        })}
      </div>

      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-end gap-2 px-1">
        <label className="text-center text-[11px] font-medium uppercase tracking-wide text-brand">
          Départ
          <TimeSelect value={fromTime} onChange={setFromTime} />
        </label>
        <i className="fa fa-long-arrow-right mb-3 text-brand" />
        <label className="text-center text-[11px] font-medium uppercase tracking-wide text-brand">
          Retour
          <TimeSelect value={toTime} onChange={setToTime} />
        </label>
      </div>
      {error && <p className="mt-2 px-1 text-xs text-[#ff6b78]" role="alert">{error}</p>}
      <div className="mt-3 flex gap-2 px-1">
        <button type="button" onClick={() => { setFrom(null); setTo(null); setError('') }} className="grid h-[39px] w-[33px] place-items-center rounded-[4.8px] bg-ink-500 text-white" aria-label="Effacer">
          <i className="fa fa-eraser" />
        </button>
        <button type="button" onClick={apply} className="h-[39px] flex-1 rounded-[4.8px] bg-brand text-[14px] font-bold uppercase text-ink-950 hover:brightness-110">
          Appliquer
        </button>
      </div>
      <span
        className={`absolute left-1/2 h-0 w-0 -translate-x-1/2 border-x-8 border-x-transparent ${placement === 'top' ? 'top-full border-t-8 border-t-white' : 'bottom-full border-b-8 border-b-white'}`}
      />
    </div>
  )
}

function TimeSelect({ value, onChange }: { value: string; onChange(v: string): void }) {
  return (
    <span className="relative mt-1 block">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-[39px] w-full appearance-none rounded-md border border-brand/60 bg-[#0d1117] pl-3 pr-7 text-center text-[16.8px] font-semibold normal-case tracking-normal text-white outline-none"
      >
        {TIMES.map((t) => (
          <option key={t}>{t}</option>
        ))}
      </select>
      <i className="fa fa-clock-o pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-base text-white/40" />
    </span>
  )
}
