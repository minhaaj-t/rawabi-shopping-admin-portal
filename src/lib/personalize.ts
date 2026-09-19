const STORAGE_KEY = "rawabi_admin_personalize";

export type UiScale = "sm" | "md" | "lg" | "xl";
export type ColorTheme = "default" | "classic" | "dark" | "contrast";
export type NotifSound =
  | "chime"
  | "soft"
  | "alert"
  | "knock"
  | "bell"
  | "scanner"
  | "siren"
  | "cashier"
  | "pager"
  | "buzz"
  | "off";

export type PersonalizePrefs = {
  uiScale: UiScale;
  colorTheme: ColorTheme;
  notifSound: NotifSound;
  notifSoundEnabled: boolean;
  notifReadMode: boolean;
  notifVolume: number;
};

export const DEFAULT_PERSONALIZE: PersonalizePrefs = {
  uiScale: "md",
  colorTheme: "default",
  notifSound: "chime",
  notifSoundEnabled: true,
  notifReadMode: false,
  notifVolume: 90,
};

export const UI_SCALE_OPTIONS: Array<{ value: UiScale; label: string; zoom: number }> = [
  { value: "sm", label: "Compact", zoom: 0.9 },
  { value: "md", label: "Default", zoom: 1 },
  { value: "lg", label: "Large", zoom: 1.1 },
  { value: "xl", label: "Extra large", zoom: 1.2 },
];

export const THEME_OPTIONS: Array<{ value: ColorTheme; label: string; desc: string }> = [
  { value: "default", label: "Citrus grove", desc: "Morning market greens and sun" },
  { value: "classic", label: "Hot sticker", desc: "Weekend circular and promo rush" },
  { value: "dark", label: "Moon dock", desc: "Lights-out loading bay" },
  { value: "contrast", label: "Ink stamp", desc: "Bold receipt and barcode" },
];

export const SOUND_OPTIONS: Array<{ value: NotifSound; label: string }> = [
  { value: "chime", label: "Chime (10s)" },
  { value: "soft", label: "Loud ping" },
  { value: "alert", label: "Alert (10s)" },
  { value: "knock", label: "Knock" },
  { value: "bell", label: "Shop bell" },
  { value: "scanner", label: "Barcode beep" },
  { value: "siren", label: "Siren (10s)" },
  { value: "cashier", label: "Cash drawer" },
  { value: "pager", label: "Pager (10s)" },
  { value: "buzz", label: "Floor buzzer" },
  { value: "off", label: "Silent" },
];

function clampVolume(n: number): number {
  if (!Number.isFinite(n)) return 70;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function loadPersonalize(): PersonalizePrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PERSONALIZE };
    const parsed = JSON.parse(raw) as Partial<PersonalizePrefs>;
    return {
      uiScale: UI_SCALE_OPTIONS.some((o) => o.value === parsed.uiScale)
        ? (parsed.uiScale as UiScale)
        : DEFAULT_PERSONALIZE.uiScale,
      colorTheme: THEME_OPTIONS.some((o) => o.value === parsed.colorTheme)
        ? (parsed.colorTheme as ColorTheme)
        : DEFAULT_PERSONALIZE.colorTheme,
      notifSound: SOUND_OPTIONS.some((o) => o.value === parsed.notifSound)
        ? (parsed.notifSound as NotifSound)
        : DEFAULT_PERSONALIZE.notifSound,
      notifSoundEnabled: parsed.notifSoundEnabled !== false,
      notifReadMode: Boolean(parsed.notifReadMode),
      notifVolume: clampVolume(Number(parsed.notifVolume ?? 70)),
    };
  } catch {
    return { ...DEFAULT_PERSONALIZE };
  }
}

export function savePersonalize(prefs: PersonalizePrefs): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  applyPersonalize(prefs);
  window.dispatchEvent(new CustomEvent("rawabi-personalize", { detail: prefs }));
}

export function applyPersonalize(prefs: PersonalizePrefs = loadPersonalize()): void {
  const root = document.documentElement;
  root.dataset.uiScale = prefs.uiScale;
  root.dataset.theme = prefs.colorTheme;
  const zoom = UI_SCALE_OPTIONS.find((o) => o.value === prefs.uiScale)?.zoom ?? 1;
  root.style.setProperty("--rw-ui-zoom", String(zoom));
}

let audioCtx: AudioContext | null = null;
let activeSources: Array<{ osc: OscillatorNode; gain: GainNode }> = [];

function getAudioCtx(): AudioContext | null {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  return audioCtx;
}

export function stopNotifSound(): void {
  for (const node of activeSources) {
    try {
      node.osc.stop();
    } catch {
      /* already stopped */
    }
    try {
      node.osc.disconnect();
      node.gain.disconnect();
    } catch {
      /* already disconnected */
    }
  }
  activeSources = [];
}

function tone(
  ctx: AudioContext,
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType,
  gainPeak: number,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(40, freq), start);
  const peak = Math.max(0.0001, Math.min(0.95, gainPeak));
  const attack = Math.min(0.012, Math.max(0.004, dur * 0.15));
  const end = start + Math.max(dur, attack + 0.03);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(peak, start + attack);
  gain.gain.linearRampToValueAtTime(0.0001, end);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(end + 0.02);
  activeSources.push({ osc, gain });
}

function knockHit(ctx: AudioContext, start: number, vol: number) {
  tone(ctx, 320, start, 0.08, "triangle", 0.92 * vol);
  tone(ctx, 180, start, 0.11, "sine", 0.78 * vol);
  tone(ctx, 720, start, 0.03, "square", 0.42 * vol);
}

export async function playNotifSound(
  sound: NotifSound = loadPersonalize().notifSound,
  volume = loadPersonalize().notifVolume,
): Promise<void> {
  if (sound === "off") return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return;
    }
  }
  stopNotifSound();
  const now = ctx.currentTime;
  const vol = clampVolume(volume) / 100;
  const loud = 0.82 * vol;
  if (sound === "chime") {
    for (let t = 0; t < 10; t += 1.25) {
      tone(ctx, 784, now + t, 0.28, "triangle", loud);
      tone(ctx, 1175, now + t + 0.16, 0.42, "sine", 0.78 * vol);
      tone(ctx, 1568, now + t + 0.34, 0.5, "sine", 0.7 * vol);
    }
  } else if (sound === "soft") {
    tone(ctx, 988, now, 0.22, "triangle", loud);
    tone(ctx, 1318, now + 0.12, 0.38, "sine", 0.8 * vol);
  } else if (sound === "alert") {
    for (let t = 0; t < 10; t += 0.42) {
      tone(ctx, 880, now + t, 0.16, "square", 0.62 * vol);
      tone(ctx, 1175, now + t + 0.18, 0.18, "square", 0.66 * vol);
    }
  } else if (sound === "knock") {
    knockHit(ctx, now, vol);
    knockHit(ctx, now + 0.2, vol);
    knockHit(ctx, now + 0.4, vol);
  } else if (sound === "bell") {
    tone(ctx, 1046, now, 0.55, "triangle", loud);
    tone(ctx, 1568, now + 0.04, 0.7, "sine", 0.72 * vol);
    tone(ctx, 2093, now + 0.08, 0.85, "sine", 0.55 * vol);
  } else if (sound === "scanner") {
    tone(ctx, 2400, now, 0.07, "square", 0.7 * vol);
    tone(ctx, 1800, now + 0.09, 0.08, "square", 0.66 * vol);
    tone(ctx, 2400, now + 0.2, 0.07, "square", 0.7 * vol);
  } else if (sound === "siren") {
    for (let t = 0; t < 10; t += 0.7) {
      tone(ctx, 620, now + t, 0.32, "sawtooth", 0.7 * vol);
      tone(ctx, 980, now + t + 0.32, 0.34, "sawtooth", 0.74 * vol);
    }
  } else if (sound === "cashier") {
    tone(ctx, 1318, now, 0.1, "square", 0.7 * vol);
    tone(ctx, 1760, now + 0.08, 0.12, "square", 0.74 * vol);
    tone(ctx, 2093, now + 0.18, 0.18, "triangle", loud);
    tone(ctx, 140, now + 0.28, 0.16, "triangle", 0.8 * vol);
  } else if (sound === "pager") {
    for (let t = 0; t < 10; t += 1.1) {
      tone(ctx, 1480, now + t, 0.12, "square", 0.68 * vol);
      tone(ctx, 1480, now + t + 0.18, 0.12, "square", 0.68 * vol);
      tone(ctx, 1480, now + t + 0.36, 0.12, "square", 0.68 * vol);
    }
  } else if (sound === "buzz") {
    tone(ctx, 220, now, 0.28, "sawtooth", 0.78 * vol);
    tone(ctx, 180, now + 0.32, 0.32, "sawtooth", 0.82 * vol);
    tone(ctx, 220, now + 0.68, 0.28, "sawtooth", 0.78 * vol);
  }
}

export function speakNotification(title: string, message: string): void {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(`${title}. ${message}`.trim());
  utter.rate = 1;
  utter.pitch = 1;
  utter.volume = Math.max(0.2, loadPersonalize().notifVolume / 100);
  window.speechSynthesis.speak(utter);
}

export function alertNewNotification(n: {
  notification_title?: string | null;
  notification_msg?: string;
}): void {
  const prefs = loadPersonalize();
  if (prefs.notifSoundEnabled && prefs.notifSound !== "off") {
    void playNotifSound(prefs.notifSound, prefs.notifVolume);
  }
  if (prefs.notifReadMode) {
    speakNotification(n.notification_title?.trim() || "Notification", n.notification_msg || "");
  }
}
