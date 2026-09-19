export type MarketingConnection = {
  ok: boolean;
  label: string;
  detail: string;
  to: string;
};

export type MarketingSeoAuditProduct = {
  product_id: number;
  name: string;
  sku: string | null;
  issues: string[];
};

export type MarketingSeoAudit = {
  products_total: number;
  with_meta_title: number;
  with_meta_description: number;
  with_faq: number;
  noindex: number;
  indexing_enabled: boolean;
  sitemap_enabled: boolean;
  aeo_enabled: boolean;
  canonical_host: string;
  attention_products: MarketingSeoAuditProduct[];
  attention_total: number;
  attention_page: number;
  attention_per_page: number;
};

export type MarketingOverview = {
  connections: Record<string, MarketingConnection>;
  connections_ready: number;
  connections_total: number;
  storefront_name: string;
  promo_push: boolean;
  counts: Record<string, number>;
  seo_audit: MarketingSeoAudit;
};

export type MarketingAnalytics = {
  gtm_enabled: boolean;
  gtm_id: string;
  gtm_preview_auth: string;
  gtm_preview_auth_set?: boolean;
  gtm_dashboard_url: string;
  ga4_enabled: boolean;
  ga4_measurement_id: string;
  ga4_api_secret: string;
  ga4_api_secret_set?: boolean;
  ga4_property_id: string;
  ga4_dashboard_url: string;
  ga4_via_gtm: boolean;
  clarity_enabled: boolean;
  clarity_project_id: string;
  clarity_dashboard_url: string;
  hotjar_enabled: boolean;
  hotjar_site_id: string;
  hotjar_dashboard_url: string;
  powerbi_enabled: boolean;
  powerbi_embed_url: string;
  powerbi_title: string;
  inject_native_when_gtm: boolean;
};

export type MarketingAds = {
  meta_enabled: boolean;
  meta_pixel_id: string;
  meta_capi_token: string;
  meta_capi_token_set?: boolean;
  google_ads_enabled: boolean;
  google_ads_id: string;
  tiktok_enabled: boolean;
  tiktok_pixel_id: string;
  tiktok_access_token: string;
  tiktok_access_token_set?: boolean;
  snapchat_enabled: boolean;
  snapchat_pixel_id: string;
  pinterest_enabled: boolean;
  pinterest_tag_id: string;
  linkedin_enabled: boolean;
  linkedin_partner_id: string;
  microsoft_ads_enabled: boolean;
  microsoft_uet_id: string;
};

export type MarketingSeo = {
  site_title: string;
  site_description: string;
  site_keywords: string;
  canonical_host: string;
  og_image_url: string;
  twitter_handle: string;
  organization_name: string;
  organization_logo: string;
  organization_same_as: string;
  robots_index: boolean;
  robots_extra: string;
  sitemap_enabled: boolean;
  gsc_verification: string;
  bing_verification: string;
  pinterest_verification: string;
  merchant_center_id: string;
  merchant_dashboard_url: string;
};

export type MarketingFaq = { question: string; answer: string };

export type MarketingAeo = {
  aeo_enabled: boolean;
  aeo_allow_gptbot: boolean;
  aeo_allow_claude: boolean;
  aeo_allow_perplexity: boolean;
  aeo_allow_google_extended: boolean;
  aeo_llms_extra: string;
  aeo_org_faq: MarketingFaq[];
  aeo_speakable_selector: string;
};

export type MarketingConsent = {
  consent_enabled: boolean;
  consent_message: string;
  consent_message_ar: string;
  consent_policy_url: string;
  consent_necessary_label: string;
  consent_necessary_label_ar: string;
  consent_necessary_desc: string;
  consent_necessary_desc_ar: string;
  consent_analytics_enabled: boolean;
  consent_analytics_label: string;
  consent_analytics_label_ar: string;
  consent_analytics_desc: string;
  consent_analytics_desc_ar: string;
  consent_ads_enabled: boolean;
  consent_ads_label: string;
  consent_ads_label_ar: string;
  consent_ads_desc: string;
  consent_ads_desc_ar: string;
  consent_show_reject: boolean;
  consent_show_analytics_only: boolean;
  consent_version: number;
};

export type MarketingField = {
  key: string;
  label: string;
  hint?: string;
  placeholder?: string;
  kind: "toggle" | "text" | "url" | "password" | "textarea";
};

export type MarketingTool = {
  slug: string;
  section: "analytics" | "ads" | "seo";
  title: string;
  desc: string;
  docsUrl: string;
  setup: string[];
  fields: MarketingField[];
};

export const ANALYTICS_TOOLS: MarketingTool[] = [
  {
    slug: "gtm",
    section: "analytics",
    title: "Google Tag Manager",
    desc: "One container for GA4, ads pixels, and retail ecommerce events on the storefront.",
    docsUrl: "https://tagmanager.google.com/",
    setup: [
      "Create a web container for rawabihypermarket.com",
      "Paste the GTM-XXXXXXX ID here and enable the switch",
      "Add GA4, ads, and Clarity tags inside GTM if you want GTM to own them",
      "Publish the container, then confirm with Google Tag Assistant",
    ],
    fields: [
      { kind: "toggle", key: "gtm_enabled", label: "Enable GTM on the storefront" },
      { kind: "text", key: "gtm_id", label: "Container ID", placeholder: "GTM-XXXXXXX", hint: "From Admin → Container settings" },
      { kind: "url", key: "gtm_dashboard_url", label: "Workspace URL", hint: "Opens your GTM workspace from this portal" },
      { kind: "password", key: "gtm_preview_auth", label: "Preview auth (optional)", hint: "Only if you use GTM preview share links" },
      {
        kind: "toggle",
        key: "inject_native_when_gtm",
        label: "Also inject native pixels while GTM is on",
        hint: "Leave off to avoid duplicate tags. Turn on only if GA4/pixels are not configured inside GTM.",
      },
    ],
  },
  {
    slug: "ga4",
    section: "analytics",
    title: "Google Analytics 4",
    desc: "Measurement for sessions, purchase funnel, and retail item events (view_item, add_to_cart, begin_checkout).",
    docsUrl: "https://analytics.google.com/",
    setup: [
      "Create a GA4 property for Rawabi Shopping",
      "Copy the Measurement ID (G-XXXXXXXX)",
      "If GTM is enabled, add a GA4 Configuration tag in GTM and keep “Fire GA4 via GTM” on",
      "Optional: Measurement Protocol API secret for future server-side purchase events",
    ],
    fields: [
      { kind: "toggle", key: "ga4_enabled", label: "Enable GA4" },
      { kind: "text", key: "ga4_measurement_id", label: "Measurement ID", placeholder: "G-XXXXXXXX" },
      { kind: "text", key: "ga4_property_id", label: "Property ID (optional)", placeholder: "123456789", hint: "Numeric property ID from Admin → Property settings" },
      { kind: "toggle", key: "ga4_via_gtm", label: "Fire GA4 via GTM when GTM is on", hint: "Recommended. Prevents double-counting with a native gtag.js tag." },
      { kind: "password", key: "ga4_api_secret", label: "Measurement Protocol API secret", hint: "Stored on the server only. Used for server-side events, not the browser." },
      { kind: "url", key: "ga4_dashboard_url", label: "GA4 dashboard URL" },
    ],
  },
  {
    slug: "clarity",
    section: "analytics",
    title: "Microsoft Clarity",
    desc: "Session replay, heatmaps, and rage-click insights for grocery browsing on web.",
    docsUrl: "https://clarity.microsoft.com/",
    setup: [
      "Create a Clarity project for the storefront domain",
      "Copy the project ID from Settings → Setup",
      "Clarity loads natively even when GTM is on — it does not duplicate GA4",
    ],
    fields: [
      { kind: "toggle", key: "clarity_enabled", label: "Enable Clarity" },
      { kind: "text", key: "clarity_project_id", label: "Project ID", placeholder: "abcdefghij" },
      { kind: "url", key: "clarity_dashboard_url", label: "Clarity dashboard URL" },
    ],
  },
  {
    slug: "hotjar",
    section: "analytics",
    title: "Hotjar",
    desc: "Optional heatmaps and surveys. Skip this if Clarity already covers replay.",
    docsUrl: "https://insights.hotjar.com/",
    setup: ["Create a Hotjar site", "Paste the numeric Site ID", "If GTM is on, either add Hotjar in GTM or enable native inject on the GTM page"],
    fields: [
      { kind: "toggle", key: "hotjar_enabled", label: "Enable Hotjar" },
      { kind: "text", key: "hotjar_site_id", label: "Site ID", placeholder: "1234567" },
      { kind: "url", key: "hotjar_dashboard_url", label: "Hotjar dashboard URL" },
    ],
  },
  {
    slug: "powerbi",
    section: "analytics",
    title: "Power BI",
    desc: "Embed a retail dashboard (sales, basket, branch mix) for the marketing team inside admin.",
    docsUrl: "https://app.powerbi.com/",
    setup: [
      "Publish the report in Power BI",
      "Use File → Embed report → Publish to web, or an app-owns-data embed URL",
      "Paste the https://app.powerbi.com/view?r=… URL here",
      "This embed stays in admin — it is not injected on the customer site",
    ],
    fields: [
      { kind: "toggle", key: "powerbi_enabled", label: "Show Power BI in admin" },
      { kind: "text", key: "powerbi_title", label: "Dashboard title", placeholder: "Retail performance" },
      { kind: "url", key: "powerbi_embed_url", label: "Embed URL", hint: "Must start with https://app.powerbi.com/ or https://app.fabric.microsoft.com/" },
    ],
  },
];

export const ADS_TOOLS: MarketingTool[] = [
  {
    slug: "meta",
    section: "ads",
    title: "Meta Pixel",
    desc: "Facebook and Instagram ads, catalog remarketing, and purchase events.",
    docsUrl: "https://business.facebook.com/events_manager",
    setup: ["Open Events Manager", "Copy the Pixel ID", "Optional: Conversions API token for server-side events (stored server-only)"],
    fields: [
      { kind: "toggle", key: "meta_enabled", label: "Enable Meta Pixel" },
      { kind: "text", key: "meta_pixel_id", label: "Pixel ID", placeholder: "123456789012345" },
      { kind: "password", key: "meta_capi_token", label: "Conversions API token", hint: "Never sent to the storefront" },
    ],
  },
  {
    slug: "google",
    section: "ads",
    title: "Google Ads",
    desc: "Conversion linker and retail purchase conversion (AW-XXXXXXXX).",
    docsUrl: "https://ads.google.com/",
    setup: ["Create a conversion action", "Copy the AW- ID", "Prefer firing this through GTM if GTM is enabled"],
    fields: [
      { kind: "toggle", key: "google_ads_enabled", label: "Enable Google Ads tag" },
      { kind: "text", key: "google_ads_id", label: "Conversion ID", placeholder: "AW-123456789" },
    ],
  },
  {
    slug: "tiktok",
    section: "ads",
    title: "TikTok Pixel",
    desc: "TikTok remarketing for grocery and flyer campaigns.",
    docsUrl: "https://ads.tiktok.com/",
    setup: ["Open TikTok Events Manager", "Copy the Pixel ID"],
    fields: [
      { kind: "toggle", key: "tiktok_enabled", label: "Enable TikTok Pixel" },
      { kind: "text", key: "tiktok_pixel_id", label: "Pixel ID" },
      { kind: "password", key: "tiktok_access_token", label: "Events API token (optional)" },
    ],
  },
  {
    slug: "snapchat",
    section: "ads",
    title: "Snapchat Pixel",
    desc: "Snapchat ads conversion tracking for Gulf campaigns.",
    docsUrl: "https://ads.snapchat.com/",
    setup: ["Open Snapchat Ads Manager → Events", "Copy the Pixel ID"],
    fields: [
      { kind: "toggle", key: "snapchat_enabled", label: "Enable Snapchat Pixel" },
      { kind: "text", key: "snapchat_pixel_id", label: "Pixel ID" },
    ],
  },
  {
    slug: "pinterest",
    section: "ads",
    title: "Pinterest Tag",
    desc: "Pinterest conversion tag for recipe and grocery creative.",
    docsUrl: "https://ads.pinterest.com/",
    setup: ["Open Pinterest Ads → Conversions", "Copy the tag ID"],
    fields: [
      { kind: "toggle", key: "pinterest_enabled", label: "Enable Pinterest Tag" },
      { kind: "text", key: "pinterest_tag_id", label: "Tag ID" },
    ],
  },
  {
    slug: "linkedin",
    section: "ads",
    title: "LinkedIn Insight",
    desc: "B2B and employer-brand conversion tracking.",
    docsUrl: "https://www.linkedin.com/campaignmanager/",
    setup: ["Create an Insight Tag", "Copy the partner ID"],
    fields: [
      { kind: "toggle", key: "linkedin_enabled", label: "Enable LinkedIn Insight Tag" },
      { kind: "text", key: "linkedin_partner_id", label: "Partner ID" },
    ],
  },
  {
    slug: "microsoft",
    section: "ads",
    title: "Microsoft Advertising",
    desc: "Bing UET tag for search remarketing.",
    docsUrl: "https://ads.microsoft.com/",
    setup: ["Open Microsoft Advertising → UET tags", "Copy the numeric UET ID"],
    fields: [
      { kind: "toggle", key: "microsoft_ads_enabled", label: "Enable Microsoft UET" },
      { kind: "text", key: "microsoft_uet_id", label: "UET tag ID" },
    ],
  },
];

export const SEO_CONNECT_TOOLS: MarketingTool[] = [
  {
    slug: "search-console",
    section: "seo",
    title: "Google Search Console",
    desc: "Verify the domain so sitemaps and indexing status can be claimed.",
    docsUrl: "https://search.google.com/search-console",
    setup: [
      "Add the canonical host as a URL-prefix or domain property",
      "Choose HTML tag verification and paste only the content token",
      "Submit /sitemap.xml after the storefront is live",
    ],
    fields: [
      { kind: "text", key: "gsc_verification", label: "google-site-verification content", hint: "Paste the token only, not the full meta tag" },
      { kind: "text", key: "bing_verification", label: "Bing Webmaster msvalidate.01", hint: "Optional Bing verification token" },
    ],
  },
  {
    slug: "merchant",
    section: "seo",
    title: "Google Merchant Center",
    desc: "Shopping / free listings for grocery SKUs. Product structured data is already on PDPs.",
    docsUrl: "https://merchants.google.com/",
    setup: [
      "Create a Merchant Center account for Qatar (QAR)",
      "Link it to GA4 and Google Ads",
      "Paste the numeric Merchant ID",
      "Submit a product feed from the catalog (separate feed job)",
    ],
    fields: [
      { kind: "text", key: "merchant_center_id", label: "Merchant Center ID" },
      { kind: "url", key: "merchant_dashboard_url", label: "Merchant dashboard URL" },
    ],
  },
];

export function toolBySlug(slug: string): MarketingTool | undefined {
  return [...ANALYTICS_TOOLS, ...ADS_TOOLS, ...SEO_CONNECT_TOOLS].find((t) => t.slug === slug);
}

export function asBool(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

export function asStr(value: unknown): string {
  return value == null ? "" : String(value);
}
