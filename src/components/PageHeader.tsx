import type { ReactNode } from 'react'

export function PageHeader({ kicker, title, text, children }: { kicker?: string; title: string; text?: string; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-ink-900 text-white">
      <div className="speed-lines absolute inset-0 opacity-60" />
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
      <div className="container-page relative py-10 sm:py-14">
        {kicker && <p className="text-sm font-semibold uppercase tracking-widest text-brand-400">{kicker}</p>}
        <h1 className="mt-1 font-display text-5xl leading-none sm:text-6xl">{title}</h1>
        {text && <p className="mt-3 max-w-2xl text-slate-300">{text}</p>}
        {children}
      </div>
      <div className="h-1 bg-gradient-to-r from-brand-500 to-accent-500" />
    </section>
  )
}
