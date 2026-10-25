import { useEffect, useState } from 'react'

/** Charge une donnée asynchrone avec état de chargement et d'erreur. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true })

  useEffect(() => {
    let alive = true
    setState((s) => ({ data: s.data, loading: true }))
    fn()
      .then((data) => {
        if (alive) setState({ data, loading: false })
      })
      .catch((e: unknown) => {
        if (alive) setState({ error: e instanceof Error ? e.message : 'Erreur inconnue', loading: false })
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return state
}
