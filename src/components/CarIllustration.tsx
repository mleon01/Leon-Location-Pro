import { useId } from 'react'
import type { Category } from '../types'

// Illustration vectorielle de véhicule (en attendant les vraies photos).
// Profil latéral généré à partir de quelques cotes par type de carrosserie.

interface Shape {
  x0: number // arrière
  x1: number // avant
  roof: number // hauteur du toit (y)
  rr: number // coin arrière du toit (x)
  rf: number // coin avant du toit (x)
  ws: number // base du pare-brise (x)
  hood: number // hauteur du capot (y)
  belt: number // ligne de caisse (y)
  wr: number // roue arrière (x)
  wf: number // roue avant (x)
  r: number // rayon des roues
  sill: number // bas de caisse (y)
  cabOnly?: boolean
}

const SHAPES: Record<Category, Shape> = {
  citadine: { x0: 44, x1: 276, roof: 44, rr: 68, rf: 168, ws: 210, hood: 74, belt: 76, wr: 88, wf: 234, r: 19, sill: 106 },
  compacte: { x0: 32, x1: 288, roof: 44, rr: 62, rf: 170, ws: 218, hood: 76, belt: 77, wr: 82, wf: 244, r: 20, sill: 106 },
  suv: { x0: 30, x1: 290, roof: 30, rr: 44, rf: 188, ws: 228, hood: 64, belt: 68, wr: 82, wf: 244, r: 23, sill: 100 },
  monospace: { x0: 24, x1: 296, roof: 28, rr: 34, rf: 198, ws: 240, hood: 66, belt: 68, wr: 78, wf: 250, r: 21, sill: 102 },
  utilitaire: { x0: 20, x1: 300, roof: 18, rr: 22, rf: 222, ws: 254, hood: 66, belt: 68, wr: 74, wf: 252, r: 21, sill: 102, cabOnly: true },
}

function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16)
  const ch = (s: number) => Math.max(0, Math.min(255, ((n >> s) & 255) + amount))
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`
}

export function CarIllustration({ category, color, className = '' }: { category: Category; color: string; className?: string }) {
  const s = SHAPES[category]
  const id = useId().replace(/:/g, '')
  const ground = s.sill + 14
  const wy = ground - s.r

  const body = [
    `M ${s.x0 + 6} ${s.sill}`,
    `L ${s.x0} ${s.belt + 4}`,
    `L ${s.rr} ${s.roof}`,
    `L ${s.rf} ${s.roof}`,
    `L ${s.ws} ${s.hood}`,
    `L ${s.x1 - 14} ${s.hood + 6}`,
    `Q ${s.x1} ${s.hood + 10} ${s.x1} ${s.hood + 24}`,
    `L ${s.x1} ${s.sill}`,
    'Z',
  ].join(' ')

  const winTop = s.roof + 6
  const winStart = s.cabOnly ? s.rf - 34 : s.x0 + (s.rr - s.x0) * 0.35 + 8
  const windows = `M ${winStart} ${s.belt - 2} L ${s.cabOnly ? s.rf - 34 : s.rr + 6} ${winTop} L ${s.rf - 3} ${winTop} L ${s.ws - 8} ${s.belt - 2} Z`
  const pillar = s.cabOnly ? null : (s.rr + s.rf) / 2 + 6

  return (
    <svg viewBox="0 0 320 136" className={className} role="img" aria-hidden="true">
      <defs>
        <linearGradient id={`b${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={shade(color, 30)} />
          <stop offset="0.55" stopColor={color} />
          <stop offset="1" stopColor={shade(color, -45)} />
        </linearGradient>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a4656" />
          <stop offset="0.6" stopColor="#141a22" />
          <stop offset="1" stopColor="#0b0f14" />
        </linearGradient>
      </defs>
      <ellipse cx="160" cy={ground + 2} rx="148" ry="7" fill="#0d0d0d" opacity="0.18" />
      {/* arches */}
      <circle cx={s.wr} cy={wy} r={s.r + 5} fill={shade(color, -70)} />
      <circle cx={s.wf} cy={wy} r={s.r + 5} fill={shade(color, -70)} />
      {/* carrosserie */}
      <path d={body} fill={`url(#b${id})`} stroke={`url(#b${id})`} strokeWidth="10" strokeLinejoin="round" />
      <path d={`M ${s.x0 + 4} ${s.belt + 14} L ${s.x1 - 2} ${s.belt + 14}`} stroke={shade(color, -35)} strokeWidth="1.5" opacity="0.5" />
      {/* vitres */}
      <path d={windows} fill={`url(#g${id})`} stroke="#0d0d0d" strokeWidth="2" strokeLinejoin="round" />
      <path d={`M ${winStart + 14} ${s.belt - 6} L ${(s.rr + s.rf) / 2 - 16} ${winTop + 4}`} stroke="#fff" strokeWidth="4" opacity="0.12" strokeLinecap="round" />
      {pillar && <rect x={pillar} y={winTop - 1} width="7" height={s.belt - winTop + 1} fill={shade(color, -20)} />}
      {/* portières */}
      {pillar && <path d={`M ${pillar + 3} ${s.belt} L ${pillar + 3} ${s.sill - 4}`} stroke={shade(color, -50)} strokeWidth="1.5" opacity="0.6" />}
      <path d={`M ${s.ws - 6} ${s.belt} Q ${s.ws} ${s.sill - 20} ${s.ws - 8} ${s.sill - 4}`} stroke={shade(color, -50)} strokeWidth="1.5" fill="none" opacity="0.6" />
      <rect x={(pillar ?? s.rf - 20) + 14} y={s.belt + 8} width="14" height="3" rx="1.5" fill={shade(color, -60)} />
      {/* feux */}
      <rect x={s.x1 - 14} y={s.hood + 9} width="14" height="6" rx="3" fill="#e6f7ff" />
      <rect x={s.x1 - 12} y={s.hood + 10.5} width="8" height="3" rx="1.5" fill="#00aaff" />
      <rect x={s.x0 - 3} y={s.belt + 5} width="7" height="12" rx="2" fill="#e8192c" />
      {/* bas de caisse */}
      <rect x={s.x0 + 2} y={s.sill - 6} width={s.x1 - s.x0 - 4} height="8" rx="4" fill="#0d0d0d" opacity="0.55" />
      {/* roues */}
      {[s.wr, s.wf].map((x) => (
        <g key={x}>
          <circle cx={x} cy={wy} r={s.r} fill="#111" />
          <circle cx={x} cy={wy} r={s.r * 0.62} fill="#c8ced6" />
          <circle cx={x} cy={wy} r={s.r * 0.5} fill="#8b95a3" />
          {[0, 72, 144, 216, 288].map((a) => (
            <rect key={a} x={x - 1.6} y={wy - s.r * 0.58} width="3.2" height={s.r * 0.58} fill="#d6dbe1" transform={`rotate(${a} ${x} ${wy})`} />
          ))}
          <circle cx={x} cy={wy} r={s.r * 0.16} fill="#2a313e" />
        </g>
      ))}
    </svg>
  )
}
