import { useCallback, useEffect, useRef, useState } from "react";

export interface Loaded<T> {
  data: T | undefined;
  error: Error | null;
  pending: boolean;
  reload: () => void;
}

/**
 * Runs an async load when the deps change (or reload is called). Pass `null` to skip loading.
 * The last good data stays in place while a reload runs, so UI does not flicker.
 */
export function useLoad<T>(load: (() => Promise<T>) | null, deps: readonly unknown[]): Loaded<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [pending, setPending] = useState(load !== null);
  const [tick, setTick] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    const run = loadRef.current;
    if (!run) {
      setPending(false);
      return;
    }
    let alive = true;
    setPending(true);
    run().then(
      (value) => {
        if (!alive) return;
        setData(value);
        setError(null);
        setPending(false);
      },
      (e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e : new Error(String(e)));
        setPending(false);
      },
    );
    return () => {
      alive = false;
    };
    // deps are supplied by the caller; tick triggers manual reloads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, load === null, ...deps]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, pending, reload };
}
