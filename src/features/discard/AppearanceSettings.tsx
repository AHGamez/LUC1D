import { Button } from "../../components/ui/Button";
import { DEFAULT_LOOK, LOOK_THEMES, type Look } from "./lib/discard-look";

const COLOURS: [keyof Look, string][] = [
  ["accent", "Accent"],
  ["bg", "Background"],
  ["panel", "Sidebar"],
  ["text", "Text"],
];

/** Per-browser look of Discard. These colours only change Discard, never the shell or other apps. */
export function AppearanceSettings({ look, onLook }: { look: Look; onLook: (p: Partial<Look>) => void }) {
  return (
    <section className="space-y-4">
      <h3 className="font-semibold">Appearance</h3>
      <div className="flex flex-wrap gap-2">
        {LOOK_THEMES.map((t) => (
          <button
            key={t.name}
            type="button"
            onClick={() => onLook(t.look)}
            className="rounded-full border border-[var(--d-line-strong)] px-3 py-1 text-xs font-semibold transition-transform hover:scale-105"
            style={{ background: t.look.bg, color: t.look.text }}
          >
            {t.name}
          </button>
        ))}
      </div>
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        {COLOURS.map(([key, label]) => (
          <label key={key} className="flex items-center gap-3">
            <input type="color" aria-label={label} value={look[key] as string} onChange={(e) => onLook({ [key]: e.target.value } as Partial<Look>)} className="h-8 w-12 cursor-pointer rounded-lg border border-[var(--d-line-strong)] bg-transparent" />
            {label}
          </label>
        ))}
      </div>
      <label className="block text-sm">
        Font size: {look.fontSize}px
        <input type="range" min={11} max={20} value={look.fontSize} onChange={(e) => onLook({ fontSize: Number(e.target.value) })} className="mt-2 block w-full accent-[var(--dc-accent)]" />
      </label>
      <div className="grid gap-2 text-sm sm:grid-cols-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={look.compact} onChange={(e) => onLook({ compact: e.target.checked })} /> Compact messages
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={look.timestamps} onChange={(e) => onLook({ timestamps: e.target.checked })} /> Show timestamps
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={look.rounded} onChange={(e) => onLook({ rounded: e.target.checked })} /> Rounded corners
        </label>
      </div>
      <Button size="sm" className="d-btn" onClick={() => onLook(DEFAULT_LOOK)}>Reset appearance</Button>
    </section>
  );
}
