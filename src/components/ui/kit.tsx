import { useEffect, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { ChevronRight, X } from "lucide-react";
import { cn } from "../../lib/cn";
import { AppTile } from "./AppTile";

const FIELD = "w-full rounded-[var(--radius-control)] border border-border bg-background/60 px-3 py-2 text-body text-foreground outline-none placeholder:text-muted-foreground shadow-[var(--surface-highlight)] transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(FIELD, "resize-y", className)} {...props} />;
}

export function Label({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <span className="block space-y-1 text-body">
      <span className="font-medium text-foreground">{children}</span>
      {hint && <span className="block text-caption text-muted-foreground">{hint}</span>}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn("inline-block size-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent", className)}
    />
  );
}

/**
 * Empty state: a large icon in a tinted circle, a short title, one line of help and one clear action.
 * `children` is still rendered (as the help line), so existing callers keep working. Use `action` for the button.
 */
export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      {icon && (
        <span aria-hidden className="grid size-16 place-items-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/25 shadow-[var(--surface-highlight)] [&_svg]:size-7">
          {icon}
        </span>
      )}
      <p className="text-title font-semibold tracking-tight text-foreground">{title}</p>
      {children && <div className="max-w-sm text-body text-muted-foreground">{children}</div>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

const AVATAR_SIZES = { sm: "size-7 text-xs", md: "size-9 text-sm", lg: "size-14 text-lg" } as const;

/** Round avatar. Shows the image when there is one, otherwise the first letter of the name. */
export function Avatar({ name, src, size = "md" }: { name: string; src?: string | null; size?: keyof typeof AVATAR_SIZES }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-semibold ring-1 ring-border", AVATAR_SIZES[size])}>
      {src ? <img src={src} alt="" className="size-full object-cover" /> : (name.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}

const BADGE_TONES = {
  neutral: "bg-secondary text-secondary-foreground",
  primary: "bg-primary/20 text-primary",
  success: "bg-success/20 text-success",
  danger: "bg-destructive/20 text-destructive",
} as const;

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof BADGE_TONES; children: ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide", BADGE_TONES[tone])}>{children}</span>;
}

/** On/off switch. A real button with role="switch", so keyboard and screen readers get the state. */
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (next: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200",
        "focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "border-primary bg-primary shadow-accent" : "border-input bg-muted",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute left-0.5 size-5 rounded-full shadow-md transition-transform duration-200",
          checked ? "translate-x-5 bg-primary-foreground" : "translate-x-0 bg-foreground",
        )}
      />
    </button>
  );
}

/** A titled, rounded, grouped list (iPhone-style). Put ListRow children inside. */
export function ListGroup({ title, footer, children }: { title?: string; footer?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-2">
      {title && <h2 className="section-label px-1">{title}</h2>}
      <div className="settings-group">{children}</div>
      {footer && <p className="px-1 text-caption text-muted-foreground">{footer}</p>}
    </section>
  );
}

/**
 * One row in a ListGroup. With onClick it is a button with a trailing chevron (navigates to a page);
 * without it, a plain row that can hold a control in `trailing` (e.g. a Switch).
 * `tint` (any CSS colour, e.g. "var(--app-settings)") turns `icon` into a coloured app-style tile.
 */
export function ListRow({
  icon,
  tint,
  label,
  description,
  trailing,
  onClick,
  disabled,
  pressed,
  chevron = true,
}: {
  icon?: ReactNode;
  /** Gives the icon a gradient tile in this colour. Without it the icon sits on a plain chip. */
  tint?: string;
  label: ReactNode;
  description?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  /** For choice rows (one of several options): sets aria-pressed. */
  pressed?: boolean;
  /** Show the trailing chevron on clickable rows. Turn off for choice rows, which show a check instead. */
  chevron?: boolean;
}) {
  const body = (
    <>
      {icon &&
        (tint ? (
          <AppTile tint={tint} size="sm">
            {icon}
          </AppTile>
        ) : (
          <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-secondary text-foreground shadow-[var(--surface-highlight)] [&_svg]:size-4">
            {icon}
          </span>
        ))}
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-body font-medium text-foreground">{label}</span>
        {description && <span className="block text-caption text-muted-foreground">{description}</span>}
      </span>
      {trailing}
      {onClick && chevron && <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />}
    </>
  );
  const rowClass = "flex min-h-12 w-full items-center gap-3 px-3.5 py-2.5";
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-pressed={pressed}
        className={cn(rowClass, "transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:opacity-50")}
      >
        {body}
      </button>
    );
  }
  return <div className={rowClass}>{body}</div>;
}

/** Heading for a detail page: back button on the left, title beside it. Focus lands on the title. */
export function PageHeader({ title, onBack, backLabel = "Back" }: { title: string; onBack?: () => void; backLabel?: string }) {
  return (
    <div className="mb-5 flex items-center gap-2">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel}
          className="surface-control inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-body font-medium text-primary hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
        >
          <ChevronRight aria-hidden className="size-4 rotate-180" /> {backLabel}
        </button>
      )}
      <h1 tabIndex={-1} className="min-w-0 flex-1 truncate text-display font-bold tracking-tight text-foreground focus:outline-none">
        {title}
      </h1>
    </div>
  );
}

/** Simple modal dialog. Closes on Escape and on a click outside the panel. */
export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className="shell-glass-strong w-full max-w-md rounded-[var(--radius-card)] border p-5 shadow-[var(--shadow-window)] rise-in"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-title font-semibold tracking-tight text-foreground">{title}</h2>
          <button aria-label="Close" onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
