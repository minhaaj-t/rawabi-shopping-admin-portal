import type { UiUxSurface, UiUxThemeTokens } from "./uiux";
import { UIUX_SURFACES } from "./uiux";

export type UiUxThemePackId =
  | "rawabi-green"
  | "delivery-ops"
  | "ocean-blue"
  | "midnight"
  | "sunset"
  | "eid-gold"
  | "ramadan-night"
  | "winter-frost"
  | "national-maroon"
  | "high-contrast";

export type UiUxThemePack = {
  id: UiUxThemePackId;
  label: string;
  labelAr: string;
  desc: string;
  tag: string;
  /** Surfaces this pack is recommended for. Empty = all. */
  surfaces?: Array<"app" | "web" | "delivery" | "admin">;
  tokens: UiUxThemeTokens;
};

export const UIUX_THEME_PACKS: UiUxThemePack[] = [
  {
    id: "rawabi-green",
    label: "Rawabi Green",
    labelAr: "روابي الأخضر",
    desc: "Default brand emerald + citrus.",
    tag: "Default",
    tokens: {
      primary: "#2b8f43",
      secondary: "#8ec33f",
      accent: "#faad1c",
      ink: "#12211a",
      surface: "#f7faf7",
      danger: "#dc2626",
    },
  },
  {
    id: "delivery-ops",
    label: "Delivery Ops",
    labelAr: "عمليات التوصيل",
    desc: "Teal + amber for picker / rider apps.",
    tag: "Delivery",
    surfaces: ["delivery"],
    tokens: {
      primary: "#0d9488",
      secondary: "#06c698",
      accent: "#ffa800",
      ink: "#1a1a1a",
      surface: "#f0fdfa",
      danger: "#ff3f3f",
    },
  },
  {
    id: "ocean-blue",
    label: "Ocean Blue",
    labelAr: "أزرق المحيط",
    desc: "Cool blue for ops focus and maps.",
    tag: "Cool",
    tokens: {
      primary: "#0284c7",
      secondary: "#38bdf8",
      accent: "#f59e0b",
      ink: "#0f172a",
      surface: "#f0f9ff",
      danger: "#e11d48",
    },
  },
  {
    id: "midnight",
    label: "Midnight",
    labelAr: "منتصف الليل",
    desc: "Dark mode friendly night shift theme.",
    tag: "Dark",
    tokens: {
      primary: "#22c55e",
      secondary: "#4ade80",
      accent: "#fbbf24",
      ink: "#e5e7eb",
      surface: "#111827",
      danger: "#f87171",
    },
  },
  {
    id: "sunset",
    label: "Sunset",
    labelAr: "غروب",
    desc: "Warm orange accents for peak hours.",
    tag: "Warm",
    tokens: {
      primary: "#ea580c",
      secondary: "#fb923c",
      accent: "#facc15",
      ink: "#1c1917",
      surface: "#fff7ed",
      danger: "#dc2626",
    },
  },
  {
    id: "eid-gold",
    label: "Eid Gold",
    labelAr: "عيد ذهبي",
    desc: "Festive deep green + gold.",
    tag: "Eid",
    tokens: {
      primary: "#0f766e",
      secondary: "#14b8a6",
      accent: "#f5c518",
      ink: "#134e4a",
      surface: "#f0fdfa",
      danger: "#b91c1c",
    },
  },
  {
    id: "ramadan-night",
    label: "Ramadan Night",
    labelAr: "ليلة رمضان",
    desc: "Indigo night with amber highlights.",
    tag: "Ramadan",
    tokens: {
      primary: "#4f46e5",
      secondary: "#818cf8",
      accent: "#fbbf24",
      ink: "#1e1b4b",
      surface: "#eef2ff",
      danger: "#e11d48",
    },
  },
  {
    id: "winter-frost",
    label: "Winter Frost",
    labelAr: "صقيع الشتاء",
    desc: "Icy blues for cool-season campaigns.",
    tag: "Winter",
    tokens: {
      primary: "#0369a1",
      secondary: "#7dd3fc",
      accent: "#a5f3fc",
      ink: "#0c4a6e",
      surface: "#f0f9ff",
      danger: "#e11d48",
    },
  },
  {
    id: "national-maroon",
    label: "National Maroon",
    labelAr: "مارون وطني",
    desc: "Qatar national day maroon & white.",
    tag: "18 Dec",
    tokens: {
      primary: "#8a1538",
      secondary: "#be123c",
      accent: "#f9a8d4",
      ink: "#4c0519",
      surface: "#fff1f2",
      danger: "#991b1b",
    },
  },
  {
    id: "high-contrast",
    label: "High Contrast",
    labelAr: "تباين عالٍ",
    desc: "Strong blacks for outdoor / sunlight use.",
    tag: "A11y",
    surfaces: ["delivery", "app"],
    tokens: {
      primary: "#111827",
      secondary: "#374151",
      accent: "#fbbf24",
      ink: "#000000",
      surface: "#ffffff",
      danger: "#b91c1c",
    },
  },
];

export function themePacksForSurface(surface: UiUxSurface): UiUxThemePack[] {
  const key = UIUX_SURFACES[surface]?.themeKey ?? "app";
  return UIUX_THEME_PACKS.filter((p) => !p.surfaces || p.surfaces.includes(key));
}

export function detectActiveThemePack(tokens: UiUxThemeTokens): UiUxThemePackId | null {
  const norm = (t: UiUxThemeTokens) =>
    ["primary", "secondary", "accent", "ink", "surface", "danger"]
      .map((k) => String(t[k] ?? "").toLowerCase())
      .join("|");
  const current = norm(tokens);
  const found = UIUX_THEME_PACKS.find((p) => norm(p.tokens) === current);
  return found?.id ?? null;
}

/** Merge pack tokens onto existing keys so custom extra keys are kept. */
export function applyThemePack(current: UiUxThemeTokens, pack: UiUxThemePack): UiUxThemeTokens {
  const next = { ...current };
  for (const [k, v] of Object.entries(pack.tokens)) {
    next[k] = v;
  }
  // Ensure danger exists when applying packs that include it
  if (pack.tokens.danger && !next.danger) next.danger = pack.tokens.danger;
  return next;
}
