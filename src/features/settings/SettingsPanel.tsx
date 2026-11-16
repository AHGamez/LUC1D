import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Check, Clock, LogOut, Palette, Bell, SlidersHorizontal, Sparkles, UserRound } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { ListGroup, ListRow, PageHeader, Switch } from "../../components/ui/kit";
import { BG_OPTIONS } from "../../lib/backgrounds";
import { CLOCK_FONTS, type IntroStyle, type Layout, type Prefs } from "../../lib/prefs";
import { SITE_THEMES, type SiteTheme } from "../../lib/themes";
import TabCloakPicker from "../device/TabCloakPicker";
import PushSettings from "../push/PushSettings";
import { ShimejiSettings } from "../turkey/ShimejiSettings";

interface SettingsAppProps {
  prefs: Prefs;
  onChange: (patch: Partial<Prefs>) => void;
  onReset: () => void;
  account: { name: string; email: string | null };
  onSignOut: () => void;
}

/** The detail pages. The root is a list of these, grouped iPhone-style. */
type PageId = "account" | "appearance" | "effects" | "clock" | "notifications" | "general";

const LAYOUTS: { id: Exclude<Layout, "">; name: string; hint: string }[] = [
  { id: "glass", name: "Glass", hint: "Big clock, widget panel and a curved app dock" },
  { id: "lucid", name: "LUC1D", hint: "Sidebar, browser tabs and fade-in windows" },
  { id: "ps5", name: "PS5 style", hint: "Console tile row with zoom-open apps" },
];

const INTROS: { id: IntroStyle; name: string }[] = [
  { id: "one", name: "Spinning 1" },
  { id: "chrome", name: "Chromebook logo" },
  { id: "none", name: "None" },
];

/** Preset tints for the glass clock. The colour input below takes any colour. */
const CLOCK_SWATCHES = ["#5aa9f0", "#7ee8c8", "#f0b35a", "#f07aa6", "#b89cf5", "#f5f5f5"];

const DEFAULT_CLOCK_HEX = "#5aa9f0";

/** The colour input only accepts #rrggbb, so anything else shows the default there. */
function toHex(color: string): string {
  return /^#[0-9a-f]{6}$/i.test(color) ? color : DEFAULT_CLOCK_HEX;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="section-label px-1">{children}</h2>;
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <ListRow label={label} trailing={<Switch checked={checked} onChange={onChange} label={label} />} />;
}

function SliderRow({ id, label, min, max, value, onChange }: { id: string; label: string; min: number; max: number; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-2 px-3 py-3">
      <label htmlFor={id} className="flex items-center justify-between text-body text-foreground">
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}

/** Settings window. Categories open detail pages; every control writes straight into prefs, which persist per browser. */
export function SettingsApp({ prefs, onChange, onReset, account, onSignOut }: SettingsAppProps) {
  const [page, setPage] = useState<PageId | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const lastPage = useRef<PageId | null>(null);

  // Moving between the list and a page moves focus to the new heading, so screen readers announce it.
  useEffect(() => {
    if (lastPage.current === page) return;
    lastPage.current = page;
    rootRef.current?.querySelector<HTMLElement>("h1")?.focus();
  }, [page]);

  const layoutName = LAYOUTS.find((l) => l.id === prefs.layout)?.name ?? "Not chosen";
  const themeName = SITE_THEMES.find((t) => t.id === prefs.theme)?.name ?? "Classic";
  const clockFont = (CLOCK_FONTS as readonly string[]).includes(prefs.clockFont) ? prefs.clockFont : "Sora";

  // Each category gets its own tile colour, like the iPhone settings icons.
  const rootGroups: { title?: string; items: { id: PageId; label: string; description: string; icon: ReactNode; tint: string }[] }[] = [
    {
      items: [
        {
          id: "account",
          label: "Account",
          description: account.name ? `Signed in as ${account.name}` : "Your sign-in",
          icon: <UserRound />,
          tint: "var(--app-stem)",
        },
      ],
    },
    {
      title: "Look & feel",
      items: [
        { id: "appearance", label: "Appearance", description: `${layoutName} layout · ${themeName} theme`, icon: <Palette />, tint: "var(--app-music)" },
        { id: "effects", label: "Effects & pets", description: "Stars, motion and walking pets", icon: <Sparkles />, tint: "var(--app-pass)" },
        { id: "clock", label: "Clock", description: prefs.clock24 ? "24-hour time" : "12-hour time", icon: <Clock />, tint: "var(--app-video)" },
      ],
    },
    {
      title: "Alerts & system",
      items: [
        { id: "notifications", label: "Notifications", description: "Device alerts and update notices", icon: <Bell />, tint: "var(--app-discard)" },
        { id: "general", label: "General", description: "Startup intro, tab cloak and reset", icon: <SlidersHorizontal />, tint: "var(--app-settings)" },
      ],
    },
  ];

  const pageTitles: Record<PageId, string> = {
    account: "Account",
    appearance: "Appearance",
    effects: "Effects & pets",
    clock: "Clock",
    notifications: "Notifications",
    general: "General",
  };

  return (
    <div ref={rootRef} className="mx-auto max-w-2xl space-y-6 p-4 text-body select-text sm:p-6">
      {page === null ? (
        <>
          <PageHeader title="Settings" />
          {rootGroups.map((group, i) => (
            <ListGroup key={group.title ?? `group-${i}`} title={group.title}>
              {group.items.map((item) => (
                <ListRow key={item.id} icon={item.icon} tint={item.tint} label={item.label} description={item.description} onClick={() => setPage(item.id)} />
              ))}
            </ListGroup>
          ))}
        </>
      ) : (
        <>
          <PageHeader title={pageTitles[page]} onBack={() => setPage(null)} backLabel="Settings" />

          {page === "account" && (
            <>
              <ListGroup>
                <ListRow icon={<UserRound />} tint="var(--app-stem)" label={account.name || "Account"} description={account.email ?? undefined} chevron={false} />
              </ListGroup>
              <ListGroup>
                <div className="flex items-center justify-between gap-3 p-3">
                  <span className="flex items-center gap-2 text-foreground">
                    <LogOut aria-hidden className="size-4 text-muted-foreground" /> End this session on this browser
                  </span>
                  <Button variant="outline" size="sm" onClick={onSignOut}>
                    Sign out
                  </Button>
                </div>
              </ListGroup>
            </>
          )}

          {page === "appearance" && (
            <>
              <ListGroup title="Layout" footer="Glass and PS5 change the home screen. Open windows stay the same.">
                {LAYOUTS.map((l) => (
                  <ListRow
                    key={l.id}
                    label={l.name}
                    description={l.hint}
                    pressed={prefs.layout === l.id}
                    chevron={false}
                    onClick={() => onChange({ layout: l.id })}
                    trailing={prefs.layout === l.id ? <Check aria-hidden className="size-4 text-primary" /> : undefined}
                  />
                ))}
              </ListGroup>

              <section className="space-y-2">
                <SectionTitle>Theme</SectionTitle>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Site themes">
                  {SITE_THEMES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      aria-pressed={prefs.theme === t.id}
                      onClick={() => onChange({ theme: t.id as SiteTheme })}
                      className="theme-choice flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-body transition-colors focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <span data-site-theme={t.id} aria-hidden className="theme-swatch-dot size-3 shrink-0 rounded-full" />
                      {t.name}
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <SectionTitle>Wallpaper</SectionTitle>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Wallpapers">
                  {BG_OPTIONS.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      aria-pressed={prefs.bg === b.id}
                      onClick={() => onChange({ bg: b.id })}
                      className="theme-choice rounded-lg border px-3 py-2 text-body transition-colors focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
                {prefs.bg === "custom" && (
                  <input
                    value={prefs.customBg}
                    onChange={(e) => onChange({ customBg: e.target.value })}
                    placeholder="Image URL"
                    aria-label="Custom wallpaper URL"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-body outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                )}
              </section>

              <section className="space-y-2">
                <SectionTitle>Wallpaper strength</SectionTitle>
                <div className="settings-group">
                  <SliderRow id="wallpaper-dim" label={`Dim: ${prefs.dim}%`} min={0} max={80} value={prefs.dim} onChange={(v) => onChange({ dim: v })} />
                  <SliderRow id="wallpaper-blur" label={`Blur: ${prefs.blur}px`} min={0} max={20} value={prefs.blur} onChange={(v) => onChange({ blur: v })} />
                </div>
              </section>
            </>
          )}

          {page === "effects" && (
            <>
              <ListGroup title="Stars and motion">
                <ToggleRow label="Twinkling stars" checked={prefs.twinkle} onChange={(v) => onChange({ twinkle: v })} />
                <ToggleRow label="Shooting stars" checked={prefs.shooting} onChange={(v) => onChange({ shooting: v })} />
                <ToggleRow label="Slow drift" checked={prefs.drift} onChange={(v) => onChange({ drift: v })} />
              </ListGroup>
              <ListGroup title="Desktop" footer="In the LUC1D layout, Discard, Stem and TikiTaki sit on the desktop grid. Turn this off to put them back in the sidebar.">
                <ToggleRow label="Apps on desktop" checked={prefs.appsOnDesktop} onChange={(v) => onChange({ appsOnDesktop: v })} />
              </ListGroup>
              <ListGroup title="Pets" footer="Pets walk along the tab bar in the LUC1D layout.">
                <ToggleRow label="Walking shimeji pets" checked={prefs.shimejis} onChange={(v) => onChange({ shimejis: v })} />
              </ListGroup>
              {/* Per-pet switches (Turkey teammate). Owned pets appear here once they are bought in Club Bird. */}
              <div className="settings-group p-4">
                <ShimejiSettings />
              </div>
            </>
          )}

          {page === "clock" && (
            <>
              <ListGroup title="Time format">
                <ToggleRow label="24-hour clock" checked={prefs.clock24} onChange={(v) => onChange({ clock24: v })} />
              </ListGroup>
              <section className="space-y-2">
                <SectionTitle>Glass clock</SectionTitle>
                <div className="settings-group space-y-4 p-4">
                  <div
                    className="glass-clock-theme flex items-center justify-center rounded-xl bg-background/60 px-4 py-5"
                    style={{ fontFamily: `"${clockFont}", sans-serif`, "--clock-tint": toHex(prefs.clockColor) } as CSSProperties}
                    aria-hidden
                  >
                    <span className="glass-clock text-4xl tabular-nums">12:34</span>
                  </div>
                  <div>
                    <p id="clock-font-label" className="mb-2 text-body text-foreground">Typeface</p>
                    <div role="group" aria-labelledby="clock-font-label" className="flex flex-wrap gap-2">
                      {CLOCK_FONTS.map((f) => (
                        <Button
                          key={f}
                          size="sm"
                          variant={prefs.clockFont === f ? "default" : "outline"}
                          aria-pressed={prefs.clockFont === f}
                          onClick={() => onChange({ clockFont: f })}
                          style={{ fontFamily: `"${f}", sans-serif` }}
                        >
                          {f}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p id="clock-color-label" className="mb-2 text-body text-foreground">Tint</p>
                    <div role="group" aria-labelledby="clock-color-label" className="flex flex-wrap items-center gap-2">
                      {CLOCK_SWATCHES.map((c) => (
                        <button
                          key={c}
                          type="button"
                          aria-label={`Tint ${c}`}
                          aria-pressed={toHex(prefs.clockColor) === c}
                          title={c}
                          onClick={() => onChange({ clockColor: c })}
                          className="size-7 rounded-full border-2 border-background shadow focus-visible:outline-2 focus-visible:outline-ring aria-pressed:outline-2 aria-pressed:outline-foreground"
                          style={{ background: c }}
                        />
                      ))}
                      <label className="ml-1 inline-flex items-center gap-2 text-caption text-muted-foreground">
                        Custom
                        <input
                          type="color"
                          aria-label="Glass clock color"
                          value={toHex(prefs.clockColor)}
                          onChange={(e) => onChange({ clockColor: e.target.value })}
                          className="h-8 w-10 cursor-pointer rounded bg-transparent"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          {page === "notifications" && (
            <>
              <section className="space-y-2">
                <SectionTitle>Device alerts</SectionTitle>
                <PushSettings />
              </section>
              <ListGroup footer="One notice appears when a new update ships.">
                <ListRow icon={<Bell />} tint="var(--app-discard)" label="Update notices" description="Shown once for each new update" chevron={false} />
              </ListGroup>
            </>
          )}

          {page === "general" && (
            <>
              <ListGroup title="Startup intro" footer="Used the next time you open the site.">
                {INTROS.map((i) => (
                  <ListRow
                    key={i.id}
                    label={i.name}
                    pressed={prefs.intro === i.id}
                    chevron={false}
                    onClick={() => onChange({ intro: i.id })}
                    trailing={prefs.intro === i.id ? <Check aria-hidden className="size-4 text-primary" /> : undefined}
                  />
                ))}
              </ListGroup>
              <div className="settings-group p-4">
                <TabCloakPicker />
              </div>
              <ListGroup title="Reset">
                <div className="p-3">
                  <Button variant="outline" className="w-full" onClick={onReset}>
                    Reset to defaults
                  </Button>
                </div>
              </ListGroup>
            </>
          )}
        </>
      )}
    </div>
  );
}
