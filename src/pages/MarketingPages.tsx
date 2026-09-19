import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  ChevronRight,
  Globe2,
  Mail,
  MapPin,
  Megaphone,
  MessageCircle,
  MonitorSmartphone,
  Plug,
  ShoppingCart,
  Sparkles,
  Star,
  Tag,
  Users,
  WhatsApp,
} from "../lib/icons";
import { adminApi } from "../lib/api";
import type { MarketingOverview } from "../lib/marketing";
import { MarketingPageShell } from "../components/MarketingPageShell";

type ToolLink = { to: string; label: string; desc: string };
type ToolSection = {
  id: string;
  title: string;
  desc: string;
  icon: typeof Megaphone;
  links: ToolLink[];
};

const MARKETING_SECTIONS: ToolSection[] = [
  {
    id: "analytics",
    title: "Analytics & BI",
    desc: "Measure the grocery funnel and embed retail dashboards.",
    icon: Globe2,
    links: [
      { to: "/marketing/analytics/gtm", label: "Google Tag Manager", desc: "Container for all web tags" },
      { to: "/marketing/analytics/ga4", label: "Google Analytics 4", desc: "Sessions, items, and checkout events" },
      { to: "/marketing/analytics/clarity", label: "Microsoft Clarity", desc: "Session replay and heatmaps" },
      { to: "/marketing/analytics/app-store", label: "App Store", desc: "iOS listing ratings and KPIs" },
      { to: "/marketing/analytics/play-store", label: "Play Store", desc: "Android listing ratings and KPIs" },
      { to: "/marketing/analytics/hotjar", label: "Hotjar", desc: "Optional surveys and heatmaps" },
      { to: "/marketing/analytics/powerbi", label: "Power BI", desc: "Embedded retail dashboard" },
    ],
  },
  {
    id: "ads",
    title: "Advertising pixels",
    desc: "Remarketing tags for paid social and search.",
    icon: Sparkles,
    links: [
      { to: "/marketing/ads/meta", label: "Meta Pixel", desc: "Facebook and Instagram" },
      { to: "/marketing/ads/google", label: "Google Ads", desc: "AW conversion tag" },
      { to: "/marketing/ads/tiktok", label: "TikTok Pixel", desc: "Short-form grocery ads" },
      { to: "/marketing/ads", label: "All ad pixels", desc: "Snapchat, Pinterest, LinkedIn, Microsoft" },
    ],
  },
  {
    id: "seo",
    title: "SEO & AEO",
    desc: "Search, shopping feeds, and answer-engine optimization.",
    icon: Globe2,
    links: [
      { to: "/marketing/seo", label: "SEO workspace", desc: "Coverage, identity, product meta" },
      { to: "/marketing/seo/aeo", label: "AEO", desc: "FAQ schema, llms.txt, AI crawlers" },
      { to: "/marketing/seo/indexing", label: "Robots & sitemap", desc: "Technical indexing" },
      { to: "/marketing/seo/search-console", label: "Search Console", desc: "Domain verification" },
      { to: "/marketing/seo/merchant", label: "Merchant Center", desc: "Google Shopping" },
    ],
  },
  {
    id: "offers",
    title: "Offers & pricing",
    desc: "Price campaigns, coupon codes, and featured offer SKUs.",
    icon: Tag,
    links: [
      { to: "/promotions", label: "Promotions", desc: "Timed storewide or product promotions" },
      { to: "/coupons", label: "Coupons", desc: "Fixed or percent codes, user or group targeted" },
      { to: "/products/offers", label: "Offer products", desc: "SKUs currently selling at offer price" },
    ],
  },
  {
    id: "creative",
    title: "Creative & merchandising",
    desc: "Homepage placements, flyers, and landing pages.",
    icon: MonitorSmartphone,
    links: [
      { to: "/banners", label: "Banners & popups", desc: "Hero, side, below-slider, popup, bottom" },
      { to: "/flyers", label: "Flyers", desc: "Weekly PDF flyers and cover images" },
    ],
  },
  {
    id: "campaigns",
    title: "Campaigns & CRM",
    desc: "Reach customers who already shop Rawabi.",
    icon: Megaphone,
    links: [
      { to: "/notifications", label: "Push & inbox", desc: "Compose and send app / web notifications" },
      { to: "/carts", label: "Abandoned carts", desc: "Recover carts by push, WhatsApp, or email" },
      { to: "/usergroups", label: "Audiences", desc: "User groups for coupon and campaign targeting" },
      { to: "/news", label: "News & stories", desc: "Editorial posts for the storefront" },
      { to: "/marketing/consent", label: "Cookie banner", desc: "Enable consent bar and banner copy" },
      { to: "/marketing/consent/permissions", label: "Cookie permissions", desc: "Analytics and ads permission categories" },
    ],
  },
];

export function MarketingHubPage() {
  const [overview, setOverview] = useState<MarketingOverview | null>(null);
  const [stats, setStats] = useState({ carts: 0, cartValue: 0, audiences: 0, campaigns: 0 });

  useEffect(() => {
    void adminApi.marketingOverview().then(setOverview).catch(() => undefined);
    void Promise.all([adminApi.cartStats(), adminApi.usergroups({ per_page: 1 }), adminApi.notifications({ per_page: 1 })])
      .then(([carts, audiences, campaigns]) => {
        setStats({
          carts: carts.total,
          cartValue: carts.total_value,
          audiences: audiences.total,
          campaigns: campaigns.total,
        });
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="page settings-hub mkt-page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Marketing</h1>
          <p className="page-sub">
            Analytics, SEO, AEO, advertising pixels, and shop campaigns — wired to live catalog data and the storefront.
          </p>
        </div>
        <div className="actions">
          <Link className="btn btn-secondary" to="/marketing/plugins">
            <Plug size={14} />
            Plugins
          </Link>
          <Link className="btn btn-primary" to="/marketing/analytics/gtm">
            Connect tags
          </Link>
        </div>
      </header>

      <div className="settings-overview-grid">
        <article className="settings-stat card">
          <span className="settings-stat-label">Tools connected</span>
          <strong>
            {overview ? `${overview.connections_ready}/${overview.connections_total}` : "—"}
          </strong>
        </article>
        <article className="settings-stat card">
          <span className="settings-stat-label">Promotions</span>
          <strong>{overview?.counts.promotions ?? 0}</strong>
        </article>
        <article className="settings-stat card">
          <span className="settings-stat-label">Coupons</span>
          <strong>{overview?.counts.coupons ?? 0}</strong>
        </article>
        <article className="settings-stat card">
          <span className="settings-stat-label">Banners</span>
          <strong>{overview?.counts.banners ?? 0}</strong>
        </article>
        <article className="settings-stat card">
          <span className="settings-stat-label">Campaigns</span>
          <strong>{stats.campaigns}</strong>
        </article>
        <article className="settings-stat card">
          <span className="settings-stat-label">Abandoned carts</span>
          <strong>{stats.carts}</strong>
          <small>QAR {Number(stats.cartValue ?? 0).toFixed(2)}</small>
        </article>
        <article className="settings-stat card">
          <span className="settings-stat-label">Audiences</span>
          <strong>{stats.audiences}</strong>
        </article>
      </div>

      <div className="settings-sections">
        {MARKETING_SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <section key={section.id} className="settings-section card">
              <div className="settings-section-head">
                <span className="settings-section-icon" aria-hidden>
                  <Icon size={18} strokeWidth={1.75} />
                </span>
                <div>
                  <h2>{section.title}</h2>
                  <p>{section.desc}</p>
                </div>
              </div>
              <ul className="settings-link-list">
                {section.links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="settings-link-row">
                      <span>
                        <strong>{link.label}</strong>
                        <small>{link.desc}</small>
                      </span>
                      <ChevronRight size={16} aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

type PluginCard = {
  id: string;
  title: string;
  desc: string;
  icon: typeof Plug;
  to: string;
  ok: boolean;
  detail: string;
};

export function MarketingPluginsPage() {
  const [cards, setCards] = useState<PluginCard[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void Promise.all([
      adminApi.marketingOverview(),
      adminApi.integrationSettings(),
      adminApi.notificationSettings(),
      adminApi.storefrontSettings(),
    ])
      .then(([overview, integrations, notify, storefront]) => {
        const conn = (key: string, fallbackTo: string, icon: typeof Plug, desc: string): PluginCard => {
          const row = overview.connections[key];
          return {
            id: key,
            title: row?.label ?? key,
            desc,
            icon,
            to: row?.to ?? fallbackTo,
            ok: Boolean(row?.ok),
            detail: row?.detail ?? "Not configured",
          };
        };

        setCards([
          conn("gtm", "/marketing/analytics/gtm", Globe2, "Primary tag container for the storefront."),
          conn("ga4", "/marketing/analytics/ga4", Globe2, "Retail ecommerce measurement."),
          conn("clarity", "/marketing/analytics/clarity", MonitorSmartphone, "Session replay and heatmaps."),
          conn("app_store", "/marketing/analytics/app-store", Star, "iOS Rawabi Shopping App Store KPIs."),
          conn("play_store", "/marketing/analytics/play-store", Star, "Android Rawabi Shopping Play Store KPIs."),
          conn("hotjar", "/marketing/analytics/hotjar", MonitorSmartphone, "Optional surveys and recordings."),
          conn("powerbi", "/marketing/analytics/powerbi", Globe2, "Embedded BI dashboard in admin."),
          conn("meta", "/marketing/ads/meta", Sparkles, "Facebook and Instagram ads pixel."),
          conn("google_ads", "/marketing/ads/google", Sparkles, "Google Ads conversion ID."),
          conn("tiktok", "/marketing/ads/tiktok", Sparkles, "TikTok events pixel."),
          conn("search_console", "/marketing/seo/search-console", Globe2, "Search Console verification."),
          conn("merchant", "/marketing/seo/merchant", Globe2, "Google Merchant Center."),
          conn("seo_identity", "/marketing/seo/identity", Globe2, "Default title, description, OG."),
          conn("aeo", "/marketing/seo/aeo", Globe2, "Answer-engine FAQ, llms.txt, AI crawlers."),
          {
            id: "fcm",
            title: "Push (FCM)",
            desc: "App and web push for order updates and promo campaigns.",
            icon: Bell,
            to: "/notifications",
            ok: integrations.fcm.configured,
            detail: integrations.fcm.project_id || "Set RAWABI_FCM_* on the server",
          },
          {
            id: "sms",
            title: "SMS gateway",
            desc: "OTP and transactional SMS. Promo blasts use the same sender.",
            icon: MessageCircle,
            to: "/settings/integrations",
            ok: integrations.sms.configured,
            detail: integrations.sms.sender || integrations.sms.gateway_url,
          },
          {
            id: "mail",
            title: "Email",
            desc: "Abandoned-cart and campaign email from the shop mail sender.",
            icon: Mail,
            to: "/carts",
            ok: Boolean(integrations.mail.from_address),
            detail: integrations.mail.from_address
              ? `${integrations.mail.from_name} · ${integrations.mail.from_address}`
              : "Configure mail.from on the server",
          },
          {
            id: "whatsapp",
            title: "WhatsApp",
            desc: "Customer recovery and support WhatsApp number.",
            icon: WhatsApp,
            to: "/settings/storefront",
            ok: Boolean(storefront.whatsapp_number),
            detail: storefront.whatsapp_number || "Add the public WhatsApp number",
          },
          {
            id: "promo-push",
            title: "Promo push rule",
            desc: "Master switch for promotional push notifications.",
            icon: Megaphone,
            to: "/settings/notifications",
            ok: notify.notify_promo_push,
            detail: notify.notify_promo_push ? "Promotional push is on" : "Promotional push is off",
          },
          {
            id: "maps",
            title: "Google Maps",
            desc: "Used on store locator and address capture — needed for location ads.",
            icon: MapPin,
            to: "/settings/integrations",
            ok: integrations.google_maps.configured,
            detail: integrations.google_maps.configured ? "Maps key present" : "Maps key missing",
          },
          {
            id: "coupons",
            title: "Coupon engine",
            desc: "Codes, min spend, user / usergroup / common targeting.",
            icon: Tag,
            to: "/coupons",
            ok: true,
            detail: "Live on checkout via couponValidate",
          },
          {
            id: "banners",
            title: "Banner & popup studio",
            desc: "Hero, side, below-slider, popup, and bottom placements.",
            icon: Sparkles,
            to: "/banners",
            ok: true,
            detail: "Placements publish to web and app home",
          },
          {
            id: "reviews",
            title: "Reviews / UGC",
            desc: "Store review report used for social proof.",
            icon: Star,
            to: "/reports/store-reviews",
            ok: true,
            detail: "Read reviews and ratings from ec_review",
          },
          {
            id: "segments",
            title: "Audience segments",
            desc: "User groups for coupon and notification targeting.",
            icon: Users,
            to: "/usergroups",
            ok: true,
            detail: "Same groups used by ec_coupon.usertype",
          },
          {
            id: "carts",
            title: "Cart recovery",
            desc: "Notify, WhatsApp, or email customers with open carts.",
            icon: ShoppingCart,
            to: "/carts",
            ok: true,
            detail: "Uses existing cart notify / WhatsApp / email actions",
          },
        ]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load plugins"));
  }, []);

  return (
    <MarketingPageShell
      crumbs={[{ label: "Plugins" }]}
      title="Channels & plugins"
      subtitle="Marketing and analytics connections. Pixel IDs are stored here; secrets stay on the server and never ship to the storefront."
      actions={
        <Link className="btn btn-secondary" to="/settings/integrations">
          Ops integrations
        </Link>
      }
    >
      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="settings-tools-grid">
        {cards.map((plugin) => {
          const Icon = plugin.icon;
          return (
            <article key={plugin.id} className="card settings-tool-card">
              <header>
                <Icon size={18} aria-hidden />
                <h2>{plugin.title}</h2>
                <span className={`settings-status ${plugin.ok ? "ok" : "warn"}`}>
                  {plugin.ok ? "Ready" : "Needs setup"}
                </span>
              </header>
              <p>{plugin.desc}</p>
              <p className="mkt-plugin-detail">{plugin.detail}</p>
              <Link to={plugin.to} className="btn btn-secondary">
                Open
              </Link>
            </article>
          );
        })}
      </div>
    </MarketingPageShell>
  );
}
