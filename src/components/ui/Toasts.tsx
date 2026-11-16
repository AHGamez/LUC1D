import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

type ToastKind = "info" | "success" | "error";
interface Toast {
  id: number;
  text: string;
  kind: ToastKind;
}

interface ToastApi {
  toast(text: string, kind?: ToastKind): void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Small stack of notices in the bottom-right corner. Each one clears itself after a few seconds. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const toast = useCallback((text: string, kind: ToastKind = "info") => {
    const id = nextId.current++;
    setItems((cur) => [...cur.slice(-4), { id, text, kind }]);
    setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), 4000);
  }, []);

  const api = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className={`shell-glass rise-in pointer-events-auto flex items-center gap-2.5 rounded-[var(--radius-control)] border px-3.5 py-2.5 text-body shadow-[var(--shadow-raised)] ${
              t.kind === "error" ? "text-destructive" : t.kind === "success" ? "text-success" : "text-foreground"
            }`}
          >
            <span aria-hidden className={`size-2 shrink-0 rounded-full ${t.kind === "error" ? "bg-destructive" : t.kind === "success" ? "bg-success" : "bg-primary"}`} />
            <span className="min-w-0">{t.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
