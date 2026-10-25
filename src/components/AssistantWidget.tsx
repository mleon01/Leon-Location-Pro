import { Fragment, useEffect, useRef, useState } from 'react'
import { Bot, MessageCircle, Send, X } from 'lucide-react'
import { data } from '../data/provider'
import { DATA_SOURCE } from '../config'
import type { ChatMessage } from '../types'

const SUGGESTIONS = ['Quels sont vos prix ?', 'Comment fonctionne la caution ?', 'Je veux un 4x4 pour le volcan', 'Livrez-vous à l’aéroport ?']
const WELCOME: ChatMessage = {
  role: 'assistant',
  content: "Bonjour ! Je suis l'assistant LEON Location PRO. Posez-moi vos questions sur nos véhicules, nos prix ou la réservation.",
}

/** Affiche **gras** et les retours à la ligne, sans HTML brut. */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith('**') ? <strong key={j}>{part.slice(2, -2)}</strong> : <Fragment key={j}>{part}</Fragment>,
          )}
        </Fragment>
      ))}
    </>
  )
}

export function AssistantWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking, open])

  async function send(text: string) {
    const content = text.trim()
    if (!content || thinking) return
    const next: ChatMessage[] = [...messages, { role: 'user', content }]
    setMessages(next)
    setInput('')
    setThinking(true)
    try {
      const reply = await data.askAssistant(next.slice(1))
      setMessages((m) => [...m, { role: 'assistant', content: reply }])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: "Désolé, je n'arrive pas à répondre pour le moment. Vous pouvez nous appeler au 0262 00 00 00." }])
    } finally {
      setThinking(false)
    }
  }

  return (
    <>
      {open && (
        <section
          className="fixed inset-x-0 bottom-0 z-50 flex h-[85svh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:inset-x-auto sm:bottom-24 sm:right-6 sm:h-[560px] sm:w-[380px] sm:rounded-3xl"
          aria-label="Assistant LEON"
        >
          <header className="flex items-center gap-3 bg-ink-900 px-4 py-3.5 text-white">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-500">
              <Bot size={22} />
            </span>
            <div className="flex-1">
              <p className="font-semibold leading-tight">Assistant LEON</p>
              <p className="text-xs text-slate-400">{DATA_SOURCE === 'mock' ? 'Version de démonstration' : 'Répond en quelques secondes'}</p>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-white/10" aria-label="Fermer l'assistant">
              <X size={20} />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-paper p-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <p
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user' ? 'rounded-br-md bg-brand-500 text-white' : 'rounded-bl-md bg-white text-ink-800 shadow-sm'
                  }`}
                >
                  <RichText text={m.content} />
                </p>
              </div>
            ))}
            {thinking && (
              <div className="flex gap-1 px-2 py-3" aria-label="L'assistant écrit">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            )}
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-full border border-brand-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50">
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
            className="flex gap-2 border-t border-slate-100 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Écrivez votre question…" className="input flex-1" maxLength={500} aria-label="Votre message" />
            <button type="submit" className="btn-primary px-4" disabled={!input.trim() || thinking} aria-label="Envoyer">
              <Send size={18} />
            </button>
          </form>
          <p className="pb-2 text-center text-[10px] text-slate-400">L'assistant ne voit jamais vos données de paiement.</p>
        </section>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className={`fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-brand-500 text-white shadow-xl shadow-brand-500/30 transition hover:scale-105 sm:bottom-6 sm:right-6 ${open ? 'max-sm:hidden' : ''}`}
        aria-label={open ? "Fermer l'assistant" : "Ouvrir l'assistant"}
      >
        {open ? <X size={24} /> : <MessageCircle size={26} />}
      </button>
    </>
  )
}
