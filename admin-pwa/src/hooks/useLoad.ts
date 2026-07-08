import { useState, useEffect, DependencyList } from 'react'

interface LoadState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

export function useLoad<T>(
  fn: () => Promise<T>,
  deps: DependencyList
): LoadState<T> {
  const [state, setState] = useState<LoadState<T>>({
    data: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null }))
    fn()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null })
      })
      .catch((error) => {
        if (!cancelled) setState({ data: null, loading: false, error })
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return state
}
