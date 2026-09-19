import { config } from "./config";
import type { UiUxIcons } from "./uiux";

export type UiUxIconPackId =
  | "classic"
  | "eid-mubarak"
  | "ramadan"
  | "winter"
  | "summer"
  | "national-day"
  | "new-year"
  | "valentine";

export type UiUxIconPack = {
  id: UiUxIconPackId;
  label: string;
  labelAr: string;
  season: string;
  tone: string;
  desc: string;
  icon: string;
  splash: string;
  folder: string;
};

function sampleUrl(folder: string, file: "icon.png" | "splash.png"): string {
  // Served from Laravel public/ so stored CMS URLs work for app + web clients.
  return `${config.apiUrl}/uiux-samples/${folder}/${file}`;
}

export const UIUX_ICON_PACKS: UiUxIconPack[] = [
  {
    id: "classic",
    label: "Classic Rawabi",
    labelAr: "روابي الكلاسيكي",
    season: "Everyday",
    tone: "tone-classic",
    desc: "Default green brand icon & splash.",
    folder: "classic",
    icon: `${sampleUrl("classic", "icon.png")}?v=easyappicon`,
    splash: sampleUrl("classic", "splash.png"),
  },
  {
    id: "eid-mubarak",
    label: "Eid Mubarak",
    labelAr: "عيد مبارك",
    season: "Eid",
    tone: "tone-eid",
    desc: "Crescent & lantern festive set.",
    folder: "eid-mubarak",
    icon: `${sampleUrl("eid-mubarak", "icon.png")}?v=easyappicon`,
    splash: sampleUrl("eid-mubarak", "splash.png"),
  },
  {
    id: "ramadan",
    label: "Ramadan Kareem",
    labelAr: "رمضان كريم",
    season: "Ramadan",
    tone: "tone-ramadan",
    desc: "Night sky crescent for the holy month.",
    folder: "ramadan",
    icon: `${sampleUrl("ramadan", "icon.png")}?v=easyappicon`,
    splash: sampleUrl("ramadan", "splash.png"),
  },
  {
    id: "winter",
    label: "Winter Fresh",
    labelAr: "شتاء منعش",
    season: "Winter",
    tone: "tone-winter",
    desc: "Snowflake cool-season branding.",
    folder: "winter",
    icon: `${sampleUrl("winter", "icon.png")}?v=easyappicon`,
    splash: sampleUrl("winter", "splash.png"),
  },
  {
    id: "summer",
    label: "Summer Fresh",
    labelAr: "صيف منعش",
    season: "Summer",
    tone: "tone-summer",
    desc: "Sunny warm-season branding.",
    folder: "summer",
    icon: `${sampleUrl("summer", "icon.png")}?v=easyappicon`,
    splash: sampleUrl("summer", "splash.png"),
  },
  {
    id: "national-day",
    label: "Qatar National Day",
    labelAr: "اليوم الوطني",
    season: "18 Dec",
    tone: "tone-national",
    desc: "Maroon & white national celebration.",
    folder: "national-day",
    icon: `${sampleUrl("national-day", "icon.png")}?v=easyappicon`,
    splash: sampleUrl("national-day", "splash.png"),
  },
  {
    id: "new-year",
    label: "Happy New Year",
    labelAr: "رأس السنة",
    season: "New Year",
    tone: "tone-newyear",
    desc: "Sparkle celebration pack.",
    folder: "new-year",
    icon: `${sampleUrl("new-year", "icon.png")}?v=easyappicon`,
    splash: sampleUrl("new-year", "splash.png"),
  },
  {
    id: "valentine",
    label: "Valentine Specials",
    labelAr: "يوم الحب",
    season: "14 Feb",
    tone: "tone-valentine",
    desc: "Heart-themed seasonal set.",
    folder: "valentine",
    icon: `${sampleUrl("valentine", "icon.png")}?v=easyappicon`,
    splash: sampleUrl("valentine", "splash.png"),
  },
];

/** Apply a sample pack onto the icon fields for the current surface focus. */
export function applyIconPack(
  form: UiUxIcons,
  pack: UiUxIconPack,
  focus: "app" | "delivery" | "web" | "all",
): UiUxIcons {
  const next = { ...form };
  if (focus === "app" || focus === "all") {
    next.app_icon_url = pack.icon;
    if (focus === "all") {
      next.app_splash_url = pack.splash;
    }
  }
  if (focus === "delivery" || focus === "all") {
    next.delivery_icon_url = pack.icon;
    next.delivery_splash_url = pack.splash;
  }
  if (focus === "web" || focus === "all") {
    next.web_favicon_url = pack.icon;
    next.web_logo_url = pack.icon;
  }
  return next;
}

export function detectActiveIconPack(
  form: UiUxIcons | null,
  focus: "app" | "delivery" | "web" | "all",
): UiUxIconPackId | null {
  if (!form) return null;
  const icon =
    focus === "web"
      ? form.web_favicon_url || form.web_logo_url
      : focus === "delivery"
        ? form.delivery_icon_url
        : form.app_icon_url;
  const splash =
    focus === "web" ? form.web_logo_url : focus === "delivery" ? form.delivery_splash_url : "";
  const found = UIUX_ICON_PACKS.find(
    (p) => icon.includes(`/uiux-samples/${p.folder}/`) || (splash && splash.includes(`/uiux-samples/${p.folder}/`)),
  );
  return found?.id ?? null;
}
