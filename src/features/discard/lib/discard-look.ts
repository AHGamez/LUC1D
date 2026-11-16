/** Per-browser appearance of Discard. Colours are applied as app-scoped CSS variables, never to the shell. */
export interface Look {
  accent: string;
  bg: string;
  panel: string;
  text: string;
  fontSize: number;
  compact: boolean;
  timestamps: boolean;
  rounded: boolean;
}

export const DEFAULT_LOOK: Look = { accent: "#5865f2", bg: "#313338", panel: "#2b2d31", text: "#dbdee1", fontSize: 14, compact: false, timestamps: true, rounded: true };

export const LOOK_THEMES: { name: string; look: Partial<Look> }[] = [
  { name: "Classic", look: { accent: "#5865f2", bg: "#313338", panel: "#2b2d31", text: "#dbdee1" } },
  { name: "Midnight", look: { accent: "#7c3aed", bg: "#0b0b10", panel: "#14141c", text: "#e5e5f0" } },
  { name: "Forest", look: { accent: "#22c55e", bg: "#14231a", panel: "#0f1a13", text: "#d9f2e0" } },
  { name: "Sunset", look: { accent: "#f97316", bg: "#2a1a17", panel: "#1f1310", text: "#fde7dc" } },
  { name: "Light", look: { accent: "#5865f2", bg: "#ffffff", panel: "#f2f3f5", text: "#2e3338" } },
  { name: "Ocean", look: { accent: "#38bdf8", bg: "#0c1e2e", panel: "#0a1826", text: "#d8ecf7" } },
  { name: "Rose", look: { accent: "#fb7185", bg: "#2a1219", panel: "#200e14", text: "#fbe0e6" } },
  { name: "Cyberpunk", look: { accent: "#facc15", bg: "#12081f", panel: "#0c0516", text: "#e8dcf5" } },
  { name: "Neon", look: { accent: "#22d3ee", bg: "#050510", panel: "#0d0d1f", text: "#d5d5f0" } },
  { name: "Lavender", look: { accent: "#a78bfa", bg: "#1c1626", panel: "#151020", text: "#e9e2f7" } },
  { name: "Ember", look: { accent: "#ef4444", bg: "#1f0f0d", panel: "#160b0a", text: "#f5deda" } },
  { name: "Candy", look: { accent: "#f472b6", bg: "#fbeef6", panel: "#fbe2f1", text: "#4a1e3a" } },
  { name: "Coffee", look: { accent: "#d4a373", bg: "#221a14", panel: "#1a1310", text: "#ecdfd2" } },
  { name: "Mono", look: { accent: "#9ca3af", bg: "#18181b", panel: "#111113", text: "#e4e4e7" } },
  { name: "Mint", look: { accent: "#34d399", bg: "#e9f7f1", panel: "#ddf2e9", text: "#17352b" } },
];

const KEY = "discard-look";

export function loadLook(): Look {
  try {
    return { ...DEFAULT_LOOK, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") } as Look;
  } catch {
    return DEFAULT_LOOK;
  }
}

export function saveLook(look: Look) {
  try {
    localStorage.setItem(KEY, JSON.stringify(look));
  } catch {
    /* storage full or blocked: the look still applies for this session */
  }
}
