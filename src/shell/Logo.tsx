import { Cloud } from "lucide-react";

/** The LUC1D wordmark in frosted glass. Decorative on its own; the surrounding heading carries the name. */
export function GlassWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`lucid-wordmark glass-wordmark inline-block leading-none ${className}`}>
      LUC1D<span className="text-primary">.</span>
    </span>
  );
}

/** Small glass chip used as the sidebar logo. Labelled, so screen readers announce the app name. */
export function GlassLogoChip({ className = "" }: { className?: string }) {
  return (
    <span role="img" aria-label="LUC1D" className={`glass-logo-chip size-10 ${className}`}>
      <Cloud aria-hidden className="size-5" />
    </span>
  );
}
