export type UiUxSurface = "app" | "web" | "app-and-web" | "delivery" | "admin";

export type UiUxToolId =
  | "mobile-banners"
  | "web-banners"
  | "banner-frame"
  | "popup"
  | "push"
  | "theme"
  | "icons"
  | "faq"
  | "about"
  | "about-rawabi"
  | "terms"
  | "privacy"
  | "return-policy"
  | "career"
  | "service-warranty";

export type UiUxTool = {
  id: UiUxToolId;
  label: string;
  desc: string;
  kind: "banners" | "banner-frame" | "cms-page" | "faq" | "theme" | "icons" | "push";
  bannerTypes?: string[];
  pageKey?: "about" | "about_rawabi" | "terms" | "privacy" | "return" | "career" | "warranty";
  surfaces: UiUxSurface[];
};

export const UIUX_TOOLS: UiUxTool[] = [
  {
    id: "mobile-banners",
    label: "Mobile banners",
    desc: "Hero slider, side offers, below-slider, and bottom placements for the customer app.",
    kind: "banners",
    bannerTypes: ["Top", "Side", "Below Slider", "Bottom"],
    surfaces: ["app"],
  },
  {
    id: "popup",
    label: "Popup",
    desc: "Modal overlay banners for this platform’s home.",
    kind: "banners",
    bannerTypes: ["Popup"],
    surfaces: ["app", "web"],
  },
  {
    id: "push",
    label: "Push notification",
    desc: "Compose bilingual push / in-app notifications.",
    kind: "push",
    surfaces: ["app", "delivery"],
  },
  {
    id: "theme",
    label: "Theme changes",
    desc: "Brand color tokens for this platform.",
    kind: "theme",
    surfaces: ["app", "web", "delivery"],
  },
  {
    id: "icons",
    label: "App icons",
    desc: "App icon (and splash/favicon/logo on other platforms).",
    kind: "icons",
    surfaces: ["app", "web", "delivery"],
  },
  {
    id: "web-banners",
    label: "Web banners",
    desc: "Top, side, below-slider, and bottom for the Frontstore.",
    kind: "banners",
    bannerTypes: ["Top", "Side", "Below Slider", "Bottom"],
    surfaces: ["web"],
  },
  {
    id: "banner-frame",
    label: "Banner frame",
    desc: "Decorative hero frame for desktop web, mobile web, and the customer app.",
    kind: "banner-frame",
    surfaces: ["web", "app"],
  },
  {
    id: "faq",
    label: "FAQ",
    desc: "Bilingual FAQ intro and Q&A list.",
    kind: "faq",
    surfaces: ["web"],
  },
  {
    id: "about",
    label: "About us",
    desc: "About us page — English + Arabic CMS.",
    kind: "cms-page",
    pageKey: "about",
    surfaces: ["web"],
  },
  {
    id: "about-rawabi",
    label: "About Rawabi",
    desc: "About Rawabi / group page — English + Arabic CMS.",
    kind: "cms-page",
    pageKey: "about_rawabi",
    surfaces: ["web"],
  },
  {
    id: "terms",
    label: "Terms",
    desc: "Terms & conditions — English + Arabic CMS.",
    kind: "cms-page",
    pageKey: "terms",
    surfaces: ["web"],
  },
  {
    id: "privacy",
    label: "Privacy policy",
    desc: "Privacy policy — English + Arabic CMS.",
    kind: "cms-page",
    pageKey: "privacy",
    surfaces: ["web"],
  },
  {
    id: "return-policy",
    label: "Return policy",
    desc: "Return / refund policy — English + Arabic CMS.",
    kind: "cms-page",
    pageKey: "return",
    surfaces: ["web"],
  },
  {
    id: "career",
    label: "Careers",
    desc: "Careers page — English + Arabic CMS.",
    kind: "cms-page",
    pageKey: "career",
    surfaces: ["web"],
  },
  {
    id: "service-warranty",
    label: "Service & warranty",
    desc: "Service and warranty policy — English + Arabic CMS.",
    kind: "cms-page",
    pageKey: "warranty",
    surfaces: ["web"],
  },
];

export const UIUX_SURFACES: Record<
  UiUxSurface,
  { title: string; sub: string; themeKey: "web" | "app" | "delivery" | "admin"; iconFocus: "app" | "delivery" | "web" | "all" }
> = {
  app: {
    title: "App",
    sub: "Customer app (APP-MOBILE) — mobile banners, theme, icons, and push.",
    themeKey: "app",
    iconFocus: "app",
  },
  web: {
    title: "Web",
    sub: "Frontstore — banners, theme, favicon, and bilingual CMS pages.",
    themeKey: "web",
    iconFocus: "web",
  },
  "app-and-web": {
    title: "App and Web",
    sub: "Removed — shared tools live under App or Web.",
    themeKey: "web",
    iconFocus: "web",
  },
  delivery: {
    title: "Delivery and Picker app",
    sub: "APP-DELIVERY theme, icons, and ops push notifications.",
    themeKey: "delivery",
    iconFocus: "delivery",
  },
  admin: {
    title: "Admin portal",
    sub: "Ops console theme and branding assets.",
    themeKey: "admin",
    iconFocus: "web",
  },
};

export function isUiUxSurface(value: string | undefined): value is UiUxSurface {
  return Boolean(value && value in UIUX_SURFACES);
}

export function isUiUxTool(value: string | undefined): value is UiUxToolId {
  return Boolean(value && UIUX_TOOLS.some((t) => t.id === value));
}

export function toolsForSurface(surface: UiUxSurface): UiUxTool[] {
  return UIUX_TOOLS.filter((t) => t.surfaces.includes(surface));
}

export function firstToolForSurface(surface: UiUxSurface): UiUxTool | undefined {
  return toolsForSurface(surface)[0];
}

export function firstToolPath(surface: UiUxSurface): string {
  if (surface === "app-and-web" || surface === "admin") {
    return firstToolPath("app");
  }
  const tool = firstToolForSurface(surface);
  return tool ? `/ui-ux-designs/${surface}/${tool.id}` : firstToolPath("app");
}

export function getTool(id: UiUxToolId): UiUxTool {
  return UIUX_TOOLS.find((t) => t.id === id)!;
}

export type UiUxFaqItem = {
  question_en: string;
  question_ar: string;
  answer_en: string;
  answer_ar: string;
  status: number;
};

export type UiUxPages = {
  about_title_en: string;
  about_title_ar: string;
  about_body_en: string;
  about_body_ar: string;
  about_rawabi_title_en: string;
  about_rawabi_title_ar: string;
  about_rawabi_body_en: string;
  about_rawabi_body_ar: string;
  terms_title_en: string;
  terms_title_ar: string;
  terms_body_en: string;
  terms_body_ar: string;
  privacy_title_en: string;
  privacy_title_ar: string;
  privacy_body_en: string;
  privacy_body_ar: string;
  return_title_en: string;
  return_title_ar: string;
  return_body_en: string;
  return_body_ar: string;
  career_title_en: string;
  career_title_ar: string;
  career_body_en: string;
  career_body_ar: string;
  warranty_title_en: string;
  warranty_title_ar: string;
  warranty_body_en: string;
  warranty_body_ar: string;
  faq_intro_en: string;
  faq_intro_ar: string;
  faq_items: UiUxFaqItem[];
};

export type UiUxThemeTokens = Record<string, string>;

export type UiUxTheme = {
  theme_web: UiUxThemeTokens;
  theme_app: UiUxThemeTokens;
  theme_delivery: UiUxThemeTokens;
  theme_admin: UiUxThemeTokens;
};

export type UiUxIcons = {
  app_icon_url: string;
  app_splash_url: string;
  delivery_icon_url: string;
  delivery_splash_url: string;
  web_favicon_url: string;
  web_logo_url: string;
  /** Desktop / LTR Frontstore hero frame. */
  web_hero_frame_url: string;
  /** Desktop / RTL Frontstore hero frame. */
  web_hero_frame_ar_url: string;
  /** Show frame on desktop web (≥768px). 1 = on. */
  web_hero_frame_enabled: number;
  /** Show frame on mobile web (&lt;768px). 1 = on. */
  web_hero_frame_mobile_enabled: number;
  /** Use separate mobile-web frame assets. 1 = on. */
  web_hero_frame_mobile_custom: number;
  web_hero_frame_mobile_url: string;
  web_hero_frame_mobile_ar_url: string;
  /** Show frame overlay in APP-MOBILE. 1 = on. */
  app_hero_frame_enabled: number;
  app_hero_frame_url: string;
  app_hero_frame_ar_url: string;
};
