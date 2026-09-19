import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { ExternalLink } from "../lib/icons";
import { MarketingPageShell } from "../components/MarketingPageShell";
import { SettingsToggle } from "../components/SettingsPageShell";
import { adminApi } from "../lib/api";
import { LoadingCard } from "../components/LoadingIndicator";
import {
  ADS_TOOLS,
  ANALYTICS_TOOLS,
  SEO_CONNECT_TOOLS,
  asBool,
  asStr,
  toolBySlug,
  type MarketingField,
  type MarketingTool,
} from "../lib/marketing";

type Section = "analytics" | "ads" | "seo";
type ViewTab = "analytics" | "configure";

function loadSection(section: Section) {
  if (section === "analytics") return adminApi.marketingAnalytics();
  if (section === "ads") return adminApi.marketingAds();
  return adminApi.marketingSeo();
}

function saveSection(section: Section, body: Record<string, unknown>) {
  if (section === "analytics") return adminApi.updateMarketingAnalytics(body);
  if (section === "ads") return adminApi.updateMarketingAds(body);
  return adminApi.updateMarketingSeo(body);
}

function useViewTab(defaultTab: ViewTab = "analytics"): [ViewTab, (next: ViewTab) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab");
  const tab: ViewTab = raw === "configure" ? "configure" : defaultTab;
  function setTab(next: ViewTab) {
    const nextParams = new URLSearchParams(params);
    if (next === "analytics") nextParams.delete("tab");
    else nextParams.set("tab", next);
    setParams(nextParams, { replace: true });
  }
  return [tab, setTab];
}

function ViewTabs({ tab, onChange }: { tab: ViewTab; onChange: (next: ViewTab) => void }) {
  return (
    <div className="tabs settings-category-tabs" role="tablist" aria-label="Page view">
      <button
        type="button"
        role="tab"
        aria-selected={tab === "analytics"}
        className={tab === "analytics" ? "active" : ""}
        onClick={() => onChange("analytics")}
      >
        Analytics
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={tab === "configure"}
        className={tab === "configure" ? "active" : ""}
        onClick={() => onChange("configure")}
      >
        Configure
      </button>
    </div>
  );
}

function toolIsConnected(tool: MarketingTool, form: Record<string, unknown>): boolean {
  switch (tool.slug) {
    case "gtm":
      return asBool(form.gtm_enabled) && Boolean(asStr(form.gtm_id));
    case "ga4":
      return asBool(form.ga4_enabled) && Boolean(asStr(form.ga4_measurement_id));
    case "clarity":
      return asBool(form.clarity_enabled) && Boolean(asStr(form.clarity_project_id));
    case "hotjar":
      return asBool(form.hotjar_enabled) && Boolean(asStr(form.hotjar_site_id));
    case "powerbi":
      return asBool(form.powerbi_enabled) && asStr(form.powerbi_embed_url).startsWith("https://");
    default:
      return false;
  }
}

function toolAnalyticsCards(
  tool: MarketingTool,
  form: Record<string, unknown>,
): Array<{ label: string; value: string; hint?: string }> {
  switch (tool.slug) {
    case "gtm":
      return [
        { label: "Status", value: asBool(form.gtm_enabled) ? "Enabled" : "Disabled" },
        { label: "Container ID", value: asStr(form.gtm_id) || "—" },
        { label: "Native inject with GTM", value: asBool(form.inject_native_when_gtm) ? "On" : "Off" },
      ];
    case "ga4":
      return [
        { label: "Status", value: asBool(form.ga4_enabled) ? "Enabled" : "Disabled" },
        { label: "Measurement ID", value: asStr(form.ga4_measurement_id) || "—" },
        { label: "Property ID", value: asStr(form.ga4_property_id) || "—" },
        { label: "Via GTM", value: asBool(form.ga4_via_gtm) ? "Yes" : "Native gtag" },
      ];
    case "clarity":
      return [
        { label: "Status", value: asBool(form.clarity_enabled) ? "Enabled" : "Disabled" },
        { label: "Project ID", value: asStr(form.clarity_project_id) || "—" },
      ];
    case "hotjar":
      return [
        { label: "Status", value: asBool(form.hotjar_enabled) ? "Enabled" : "Disabled" },
        { label: "Site ID", value: asStr(form.hotjar_site_id) || "—" },
      ];
    case "powerbi":
      return [
        { label: "Status", value: asBool(form.powerbi_enabled) ? "Enabled" : "Disabled" },
        { label: "Report title", value: asStr(form.powerbi_title) || "—" },
        { label: "Embed", value: asStr(form.powerbi_embed_url) ? "URL set" : "—" },
      ];
    default:
      return [];
  }
}

function toolDashboardUrl(tool: MarketingTool, form: Record<string, unknown>): string {
  switch (tool.slug) {
    case "gtm":
      return asStr(form.gtm_dashboard_url) || tool.docsUrl;
    case "ga4":
      return asStr(form.ga4_dashboard_url) || tool.docsUrl;
    case "clarity":
      return asStr(form.clarity_dashboard_url) || tool.docsUrl;
    case "hotjar":
      return asStr(form.hotjar_dashboard_url) || tool.docsUrl;
    case "powerbi":
      return asStr(form.powerbi_embed_url) || tool.docsUrl;
    default:
      return tool.docsUrl;
  }
}

function ToolHub({
  title,
  subtitle,
  tools,
  parent,
}: {
  title: string;
  subtitle: string;
  tools: MarketingTool[];
  parent: string;
}) {
  const [status, setStatus] = useState<Record<string, { ok: boolean; detail: string }>>({});

  useEffect(() => {
    void adminApi
      .marketingOverview()
      .then((res) => {
        const next: Record<string, { ok: boolean; detail: string }> = {};
        for (const row of Object.values(res.connections)) {
          const slug = row.to.split("/").pop() ?? "";
          next[slug] = { ok: row.ok, detail: row.detail };
        }
        setStatus(next);
      })
      .catch(() => undefined);
  }, []);

  return (
    <MarketingPageShell title={title} subtitle={subtitle} crumbs={[{ label: title }]}>
      <div className="settings-tools-grid">
        {tools.map((tool) => {
          const st = status[tool.slug];
          return (
            <article key={tool.slug} className="card settings-tool-card">
              <header>
                <h2>{tool.title}</h2>
                <span className={`settings-status ${st?.ok ? "ok" : "warn"}`}>
                  {st?.ok ? "Connected" : "Needs setup"}
                </span>
              </header>
              <p>{tool.desc}</p>
              {st?.detail ? <p className="mkt-plugin-detail">{st.detail}</p> : null}
              <div className="actions" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link className="btn btn-primary" to={`${parent}/${tool.slug}`}>
                  Analytics
                </Link>
                <Link className="btn btn-secondary" to={`${parent}/${tool.slug}?tab=configure`}>
                  Configure
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </MarketingPageShell>
  );
}

export function MarketingAnalyticsHub() {
  return (
    <ToolHub
      title="Analytics"
      subtitle="Connect GA4, GTM, Clarity, App Store / Play Store KPIs, Hotjar, and Power BI."
      tools={[
        ...ANALYTICS_TOOLS,
        {
          slug: "app-store",
          section: "analytics" as const,
          title: "App Store",
          desc: "iOS Rawabi Shopping listing ratings, version, and Connect KPIs.",
          docsUrl: "https://apps.apple.com/qa/app/rawabi-shopping/id6480009147",
          setup: ["Apple ID 6480009147", "Refresh pulls live rating via iTunes Lookup"],
          fields: [],
        },
        {
          slug: "play-store",
          section: "analytics" as const,
          title: "Play Store",
          desc: "Android Rawabi Shopping listing ratings and Play Console KPIs.",
          docsUrl: "https://play.google.com/store/apps/details?id=com.rawabi.app",
          setup: ["Package com.rawabi.app", "Refresh pulls public listing metrics when available"],
          fields: [],
        },
      ]}
      parent="/marketing/analytics"
    />
  );
}

export function MarketingAdsHub() {
  return (
    <ToolHub
      title="Advertising pixels"
      subtitle="Retail remarketing tags for Meta, Google Ads, TikTok, Snapchat, Pinterest, LinkedIn, and Microsoft Advertising."
      tools={ADS_TOOLS}
      parent="/marketing/ads"
    />
  );
}

function FieldControl({
  field,
  value,
  secretSet,
  onChange,
}: {
  field: MarketingField;
  value: string | boolean;
  secretSet?: boolean;
  onChange: (next: string | boolean) => void;
}) {
  const inputType = field.kind === "password" ? "password" : field.kind === "url" ? "url" : "text";
  const placeholder =
    field.kind === "password" && secretSet ? "Saved on server — type a new value to replace" : field.placeholder;
  const span = field.kind === "textarea" ? "pf-field pf-span-2" : "pf-field";

  return (
    <label className={span}>
      <span className="pf-label">{field.label}</span>
      <span className="pf-hint">{field.hint || "\u00a0"}</span>
      {field.kind === "textarea" ? (
        <textarea
          rows={5}
          value={String(value ?? "")}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type={inputType}
          value={String(value ?? "")}
          placeholder={placeholder}
          autoComplete={field.kind === "password" ? "new-password" : "off"}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}

function ConnectionFields({
  fields,
  form,
  onChange,
}: {
  fields: MarketingField[];
  form: Record<string, unknown>;
  onChange: (key: string, next: string | boolean) => void;
}) {
  const toggles = fields.filter((field) => field.kind === "toggle");
  const inputs = fields.filter((field) => field.kind !== "toggle");

  return (
    <>
      {toggles.length > 0 ? (
        <div className="settings-toggle-list">
          {toggles.map((field) => (
            <SettingsToggle
              key={field.key}
              label={field.label}
              hint={field.hint}
              checked={asBool(form[field.key])}
              onChange={(v) => onChange(field.key, v)}
            />
          ))}
        </div>
      ) : null}
      {inputs.length > 0 ? (
        <div className="settings-form-grid">
          {inputs.map((field) => (
            <FieldControl
              key={field.key}
              field={field}
              secretSet={asBool(form[`${field.key}_set`])}
              value={field.kind === "toggle" ? asBool(form[field.key]) : asStr(form[field.key])}
              onChange={(next) => onChange(field.key, next)}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}

export function MarketingToolPage({ section }: { section: Section }) {
  const { tool: slug } = useParams();
  const tool = slug ? toolBySlug(slug) : undefined;
  const [tab, setTab] = useViewTab("analytics");
  const [form, setForm] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const bodyKeys = useMemo(() => tool?.fields.map((f) => f.key) ?? [], [tool]);
  const splitTabs = section === "analytics";

  useEffect(() => {
    if (!tool || tool.section !== section) return;
    setForm(null);
    setMsg("");
    setError("");
    void loadSection(section)
      .then((data) => setForm(data as Record<string, unknown>))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [section, tool]);

  if (!tool || tool.section !== section) {
    return <Navigate to={`/marketing/${section}`} replace />;
  }

  const current = tool;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setMsg("");
    setError("");
    const body: Record<string, unknown> = {};
    for (const key of bodyKeys) {
      const field = current.fields.find((f) => f.key === key);
      if (!field) continue;
      body[key] = field.kind === "toggle" ? asBool(form[key]) : asStr(form[key]);
    }
    try {
      const saved = await saveSection(section, body);
      setForm(saved as Record<string, unknown>);
      setMsg("Connection saved. Storefront picks this up within about a minute.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const parentLabel = section === "analytics" ? "Analytics" : section === "ads" ? "Advertising" : "SEO";
  const parentTo = `/marketing/${section}`;
  const embedUrl = asStr(form?.powerbi_embed_url);
  const showPowerBi = current.slug === "powerbi" && asBool(form?.powerbi_enabled) && embedUrl.startsWith("https://");
  const connected = form ? toolIsConnected(current, form) : false;
  const cards = form ? toolAnalyticsCards(current, form) : [];
  const dashUrl = form ? toolDashboardUrl(current, form) : current.docsUrl;

  return (
    <MarketingPageShell
      crumbs={[{ label: parentLabel, to: parentTo }, { label: current.title }]}
      title={current.title}
      subtitle={current.desc}
      actions={
        <a className="btn btn-secondary" href={dashUrl} target="_blank" rel="noreferrer">
          <ExternalLink size={14} />
          Open vendor
        </a>
      }
    >
      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}

      {splitTabs ? <ViewTabs tab={tab} onChange={setTab} /> : null}

      {!form ? (
        <LoadingCard label="Loading connection" />
      ) : splitTabs && tab === "analytics" ? (
        <>
          <div className="settings-overview-grid">
            <article className={`settings-stat card ${connected ? "" : "warn"}`}>
              <span className="settings-stat-label">Connection</span>
              <strong>{connected ? "Connected" : "Needs setup"}</strong>
              <small>{connected ? "Publishing to storefront" : "Open Configure to add IDs"}</small>
            </article>
            {cards.map((c) => (
              <article key={c.label} className="settings-stat card">
                <span className="settings-stat-label">{c.label}</span>
                <strong>{c.value}</strong>
                {c.hint ? <small>{c.hint}</small> : null}
              </article>
            ))}
          </div>

          <div className="card" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <a className="btn btn-primary" href={dashUrl} target="_blank" rel="noreferrer">
              Open dashboard <ExternalLink size={14} aria-hidden />
            </a>
            <button type="button" className="btn btn-secondary" onClick={() => setTab("configure")}>
              Configure
            </button>
          </div>

          {showPowerBi ? (
            <div className="card mkt-embed">
              <h2>{asStr(form.powerbi_title) || "Power BI"}</h2>
              <iframe
                title={asStr(form.powerbi_title) || "Power BI"}
                src={embedUrl}
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          ) : null}

          {!connected ? (
            <div className="alert alert-error" style={{ marginTop: 12 }}>
              This tool is not fully configured yet. Switch to the Configure tab to paste credentials.
            </div>
          ) : null}
        </>
      ) : (
        <>
          <ol className="mkt-setup card">
            {current.setup.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          <form className="settings-form card" onSubmit={onSubmit}>
            <ConnectionFields
              fields={current.fields}
              form={form}
              onChange={(key, next) => setForm({ ...form, [key]: next })}
            />
            <div className="settings-form-actions">
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? "Saving…" : "Save connection"}
              </button>
            </div>
          </form>

          {!splitTabs && showPowerBi ? (
            <div className="card mkt-embed">
              <h2>{current.title}</h2>
              <iframe
                title={asStr(form?.powerbi_title) || "Power BI"}
                src={embedUrl}
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          ) : null}
        </>
      )}
    </MarketingPageShell>
  );
}

function SeoConnectForm({ slug }: { slug: string }) {
  const tool = SEO_CONNECT_TOOLS.find((t) => t.slug === slug);
  const [form, setForm] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void adminApi
      .marketingSeo()
      .then((data) => setForm(data as Record<string, unknown>))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  if (!tool) return <Navigate to="/marketing/seo" replace />;
  const current = tool;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setMsg("");
    setError("");
    const body: Record<string, unknown> = {};
    for (const field of current.fields) {
      body[field.key] = field.kind === "toggle" ? asBool(form[field.key]) : asStr(form[field.key]);
    }
    try {
      const saved = await adminApi.updateMarketingSeo(body);
      setForm(saved as Record<string, unknown>);
      setMsg("Saved. Verification meta is published on the storefront head.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <MarketingPageShell
      crumbs={[{ label: "SEO", to: "/marketing/seo" }, { label: current.title }]}
      title={current.title}
      subtitle={current.desc}
      actions={
        <a className="btn btn-secondary" href={current.docsUrl} target="_blank" rel="noreferrer">
          <ExternalLink size={14} />
          Open vendor
        </a>
      }
    >
      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}
      <ol className="mkt-setup card">
        {current.setup.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {!form ? (
        <LoadingCard />
      ) : (
        <form className="settings-form card" onSubmit={onSubmit}>
          <ConnectionFields
            fields={current.fields}
            form={form}
            onChange={(key, next) => setForm({ ...form, [key]: next })}
          />
          <div className="settings-form-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}
    </MarketingPageShell>
  );
}

export function MarketingSearchConsolePage() {
  return <SeoConnectForm slug="search-console" />;
}

export function MarketingMerchantPage() {
  return <SeoConnectForm slug="merchant" />;
}
