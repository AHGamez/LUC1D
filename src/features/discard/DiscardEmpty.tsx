import type { ReactNode } from "react";

/** Empty state shared by every Discard panel: tinted icon circle, title, one help line, and an optional action. */
export function DiscardEmpty({ icon, title, help, action, role }: { icon: ReactNode; title: string; help?: string; action?: ReactNode; role?: "status" }) {
  return (
    <div className="d-empty" role={role}>
      <span className="d-empty-icon" aria-hidden="true">
        {icon}
      </span>
      <p className="d-empty-title">{title}</p>
      {help && <p className="d-empty-help">{help}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
