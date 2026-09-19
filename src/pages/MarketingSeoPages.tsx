import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, ExternalLink, Globe2, Plus, Trash2 } from "../lib/icons";
import { MarketingImageField } from "../components/MarketingImageField";
import { MarketingPageShell } from "../components/MarketingPageShell";
import { SettingsToggle } from "../components/SettingsPageShell";
import { adminApi } from "../lib/api";
import { asBool, type MarketingAeo, type MarketingConsent, type MarketingFaq, type MarketingSeo, type MarketingSeoAudit, type MarketingSeoAuditProduct } from "../lib/marketing";
import { config } from "../lib/config";
import { LoadingCard, LoadingIndicator } from "../components/LoadingIndicator";

function frontUrl(path: string) {
  return `${config.frontstoreUrl.replace(/\/$/, "")}${path}`;
}

function productSeoLink(productId: number) {
  return `/products/${productId}/edit?section=seo`;
}

function pct(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}

function ProductSeoLinks({
  rows,
  empty,
  loading,
}: {
  rows: Array<{ product_id: number; name: string; sku: string | null; issues?: string[] }>;
  empty: string;
  loading?: boolean;
}) {
  if (loading) {
    return <LoadingIndicator className="mkt-seo-empty" padded />;
  }

  if (!rows.length) {
    return <p className="muted mkt-seo-empty">{empty}</p>;
  }

  return (
    <ul className="settings-link-list">
      {rows.map((row) => (
        <li key={row.product_id}>
          <Link to={productSeoLink(row.product_id)} className="settings-link-row">
            <span>
              <strong>{row.name}</strong>
              <small>
                {row.issues?.length ? row.issues.join(" · ") : row.sku || `SKU #${row.product_id}`}
              </small>
            </span>
            <ChevronRight size={16} aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ListPager({
  page,
  perPage,
  total,
  busy,
  onPageChange,
}: {
  page: number;
  perPage: number;
  total: number;
  busy?: boolean;
  onPageChange: (page: number) => void;
}) {
  if (total <= perPage) {
    return null;
  }

  const lastPage = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="mkt-list-pager">
      <span>
        Page {page} of {lastPage} · {total} total
      </span>
      <div className="actions">
        <button type="button" className="btn btn-secondary" disabled={busy || page <= 1} onClick={() => onPageChange(page - 1)}>
          Prev
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy || page >= lastPage}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

const SEO_LIST_PER_PAGE = 10;

export function MarketingSeoIdentityPage() {
  const [form, setForm] = useState<MarketingSeo | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void adminApi
      .marketingSeo()
      .then(setForm)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setMsg("");
    setError("");
    try {
      const saved = await adminApi.updateMarketingSeo({
        site_title: form.site_title,
        site_description: form.site_description,
        site_keywords: form.site_keywords,
        canonical_host: form.canonical_host,
        og_image_url: form.og_image_url,
        twitter_handle: form.twitter_handle,
        organization_name: form.organization_name,
        organization_logo: form.organization_logo,
        organization_same_as: form.organization_same_as,
      });
      setForm(saved);
      setMsg("Storefront identity saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <MarketingPageShell
      crumbs={[{ label: "SEO", to: "/marketing/seo" }, { label: "Site identity" }]}
      title="Site identity"
      subtitle="Default title, description, Open Graph, and Organization JSON-LD used across the storefront."
    >
      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}
      {!form ? (
        <LoadingCard />
      ) : (
        <form className="settings-form card" onSubmit={onSubmit}>
          <div className="settings-form-grid">
            <label className="pf-field pf-span-2">
              <span className="pf-label">Default title</span>
              <span className="pf-hint">{form.site_title.length} characters · aim 50–60</span>
              <input value={form.site_title} onChange={(e) => setForm({ ...form, site_title: e.target.value })} required />
            </label>
            <label className="pf-field pf-span-2">
              <span className="pf-label">Meta description</span>
              <span className="pf-hint">{form.site_description.length} characters · aim 140–160</span>
              <textarea rows={3} value={form.site_description} onChange={(e) => setForm({ ...form, site_description: e.target.value })} />
            </label>
            <label className="pf-field pf-span-2">
              <span className="pf-label">Keywords</span>
              <span className="pf-hint">Comma-separated storefront keywords</span>
              <input value={form.site_keywords} onChange={(e) => setForm({ ...form, site_keywords: e.target.value })} />
            </label>
            <label className="pf-field">
              <span className="pf-label">Canonical host</span>
              <span className="pf-hint">https://www.rawabihypermarket.com</span>
              <input value={form.canonical_host} onChange={(e) => setForm({ ...form, canonical_host: e.target.value })} />
            </label>
            <label className="pf-field">
              <span className="pf-label">Twitter / X handle</span>
              <span className="pf-hint">Used in Twitter card meta</span>
              <input value={form.twitter_handle} onChange={(e) => setForm({ ...form, twitter_handle: e.target.value })} placeholder="@rawabi" />
            </label>
            <MarketingImageField
              label="OG image"
              hint="Default share image · upload or paste URL · convert to WebP/JPEG/PNG"
              value={form.og_image_url}
              kind="og"
              onChange={(og_image_url) => setForm({ ...form, og_image_url })}
              onError={setError}
              onStatus={setMsg}
            />
            <label className="pf-field">
              <span className="pf-label">Organization name</span>
              <span className="pf-hint">JSON-LD Organization.name</span>
              <input value={form.organization_name} onChange={(e) => setForm({ ...form, organization_name: e.target.value })} />
            </label>
            <MarketingImageField
              label="Organization logo"
              hint="Square or landscape logo · upload or paste URL · convert to WebP/JPEG/PNG"
              value={form.organization_logo}
              kind="logo"
              onChange={(organization_logo) => setForm({ ...form, organization_logo })}
              onError={setError}
              onStatus={setMsg}
            />
            <label className="pf-field pf-span-2">
              <span className="pf-label">sameAs profiles</span>
              <span className="pf-hint">One URL per line — Facebook, Instagram, LinkedIn</span>
              <textarea rows={4} value={form.organization_same_as} onChange={(e) => setForm({ ...form, organization_same_as: e.target.value })} />
            </label>
          </div>
          <div className="settings-form-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Saving…" : "Save identity"}
            </button>
          </div>
        </form>
      )}
    </MarketingPageShell>
  );
}

export function MarketingIndexingPage() {
  const [form, setForm] = useState<MarketingSeo | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void adminApi
      .marketingSeo()
      .then(setForm)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setMsg("");
    setError("");
    try {
      const saved = await adminApi.updateMarketingSeo({
        robots_index: form.robots_index,
        robots_extra: form.robots_extra,
        sitemap_enabled: form.sitemap_enabled,
      });
      setForm(saved);
      setMsg("Indexing rules saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <MarketingPageShell
      crumbs={[{ label: "SEO", to: "/marketing/seo" }, { label: "Indexing" }]}
      title="Robots & sitemap"
      subtitle="Controls /robots.txt and /sitemap.xml on the customer site."
      actions={
        <div className="actions">
          <a className="btn btn-secondary" href={frontUrl("/robots.txt")} target="_blank" rel="noreferrer">
            View robots.txt
          </a>
          <a className="btn btn-secondary" href={frontUrl("/sitemap.xml")} target="_blank" rel="noreferrer">
            View sitemap
          </a>
        </div>
      }
    >
      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}
      {!form ? (
        <LoadingCard />
      ) : (
        <form className="settings-form card" onSubmit={onSubmit}>
          <div className="settings-toggle-list">
            <SettingsToggle
              label="Allow search indexing"
              hint="When off, robots.txt asks crawlers not to index the storefront."
              checked={asBool(form.robots_index)}
              onChange={(v) => setForm({ ...form, robots_index: v })}
            />
            <SettingsToggle
              label="Generate sitemap.xml"
              hint="Includes home, categories, and active products."
              checked={asBool(form.sitemap_enabled)}
              onChange={(v) => setForm({ ...form, sitemap_enabled: v })}
            />
          </div>
          <label className="pf-field">
            <span className="pf-label">Extra robots.txt rules</span>
            <span className="pf-hint">Appended after the default User-agent block. Example: Disallow: /checkout</span>
            <textarea rows={6} value={form.robots_extra} onChange={(e) => setForm({ ...form, robots_extra: e.target.value })} />
          </label>
          <div className="settings-form-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Saving…" : "Save indexing"}
            </button>
          </div>
        </form>
      )}
    </MarketingPageShell>
  );
}

export function MarketingAeoPage() {
  const [form, setForm] = useState<MarketingAeo | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void adminApi
      .marketingAeo()
      .then((data) =>
        setForm({
          ...data,
          aeo_org_faq: Array.isArray(data.aeo_org_faq) ? data.aeo_org_faq : [],
        }),
      )
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  function updateFaq(index: number, patch: Partial<MarketingFaq>) {
    if (!form) return;
    setForm({
      ...form,
      aeo_org_faq: form.aeo_org_faq.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setMsg("");
    setError("");
    try {
      const saved = await adminApi.updateMarketingAeo({
        aeo_enabled: form.aeo_enabled,
        aeo_allow_gptbot: form.aeo_allow_gptbot,
        aeo_allow_claude: form.aeo_allow_claude,
        aeo_allow_perplexity: form.aeo_allow_perplexity,
        aeo_allow_google_extended: form.aeo_allow_google_extended,
        aeo_llms_extra: form.aeo_llms_extra,
        aeo_org_faq: form.aeo_org_faq,
        aeo_speakable_selector: form.aeo_speakable_selector,
      });
      setForm({ ...saved, aeo_org_faq: saved.aeo_org_faq ?? [] });
      setMsg("AEO settings saved. llms.txt and FAQ JSON-LD update on the storefront.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <MarketingPageShell
      crumbs={[{ label: "SEO", to: "/marketing/seo" }, { label: "AEO" }]}
      title="AEO — answer engines"
      subtitle="FAQ schema, speakable content, llms.txt, and AI crawler policy so ChatGPT, Claude, Perplexity, and Google AI Overviews can cite Rawabi accurately."
      actions={
        <a className="btn btn-secondary" href={frontUrl("/llms.txt")} target="_blank" rel="noreferrer">
          View llms.txt
        </a>
      }
    >
      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}
      {!form ? (
        <LoadingCard />
      ) : (
        <form className="settings-form card" onSubmit={onSubmit}>
          <div className="settings-toggle-list">
            <SettingsToggle
              label="Enable AEO pack"
              hint="Organization FAQ JSON-LD, llms.txt, and AI crawler rules."
              checked={asBool(form.aeo_enabled)}
              onChange={(v) => setForm({ ...form, aeo_enabled: v })}
            />
            <SettingsToggle label="Allow GPTBot" checked={asBool(form.aeo_allow_gptbot)} onChange={(v) => setForm({ ...form, aeo_allow_gptbot: v })} />
            <SettingsToggle label="Allow ClaudeBot" checked={asBool(form.aeo_allow_claude)} onChange={(v) => setForm({ ...form, aeo_allow_claude: v })} />
            <SettingsToggle
              label="Allow PerplexityBot"
              checked={asBool(form.aeo_allow_perplexity)}
              onChange={(v) => setForm({ ...form, aeo_allow_perplexity: v })}
            />
            <SettingsToggle
              label="Allow Google-Extended"
              hint="Google’s generative / AI Overviews crawler."
              checked={asBool(form.aeo_allow_google_extended)}
              onChange={(v) => setForm({ ...form, aeo_allow_google_extended: v })}
            />
          </div>

          <label className="pf-field">
            <span className="pf-label">Speakable CSS selector</span>
            <span className="pf-hint">Used in speakable schema for voice and answer engines.</span>
            <input
              value={form.aeo_speakable_selector}
              onChange={(e) => setForm({ ...form, aeo_speakable_selector: e.target.value })}
            />
          </label>

          <div className="mkt-faq-head">
            <h2>Organization FAQs</h2>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setForm({ ...form, aeo_org_faq: [...form.aeo_org_faq, { question: "", answer: "" }] })}
            >
              <Plus size={14} />
              Add FAQ
            </button>
          </div>
          {form.aeo_org_faq.length === 0 ? (
            <p className="muted">No FAQs yet. Add questions shoppers and answer engines actually ask.</p>
          ) : (
            <div className="mkt-faq-list">
              {form.aeo_org_faq.map((row, i) => (
                <article key={i} className="mkt-faq-row">
                  <label className="pf-field">
                    <span className="pf-label">Question</span>
                    <input value={row.question} onChange={(e) => updateFaq(i, { question: e.target.value })} />
                  </label>
                  <label className="pf-field">
                    <span className="pf-label">Answer</span>
                    <textarea rows={3} value={row.answer} onChange={(e) => updateFaq(i, { answer: e.target.value })} />
                  </label>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    aria-label="Remove FAQ"
                    onClick={() => setForm({ ...form, aeo_org_faq: form.aeo_org_faq.filter((_, idx) => idx !== i) })}
                  >
                    <Trash2 size={14} />
                  </button>
                </article>
              ))}
            </div>
          )}

          <label className="pf-field">
            <span className="pf-label">Extra llms.txt copy</span>
            <span className="pf-hint">Appended after the auto-generated brand summary.</span>
            <textarea rows={5} value={form.aeo_llms_extra} onChange={(e) => setForm({ ...form, aeo_llms_extra: e.target.value })} />
          </label>

          <div className="settings-form-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Saving…" : "Save AEO"}
            </button>
          </div>
        </form>
      )}
    </MarketingPageShell>
  );
}

export function MarketingConsentPage() {
  const [form, setForm] = useState<MarketingConsent | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void adminApi
      .marketingConsent()
      .then(setForm)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setMsg("");
    setError("");
    try {
      const saved = await adminApi.updateMarketingConsent({
        consent_enabled: form.consent_enabled,
        consent_message: form.consent_message,
        consent_message_ar: form.consent_message_ar,
        consent_policy_url: form.consent_policy_url,
        consent_show_reject: form.consent_show_reject,
        consent_show_analytics_only: form.consent_show_analytics_only,
        consent_version: Number(form.consent_version) || 1,
      });
      setForm(saved);
      setMsg("Cookie banner settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <MarketingPageShell
      crumbs={[{ label: "Cookie consent", to: "/marketing/consent" }, { label: "Banner & enable" }]}
      title="Banner & enable"
      subtitle="Turn the storefront cookie bar on or off, edit copy, and control which accept buttons appear."
      actions={
        <Link className="btn btn-secondary" to="/marketing/consent/permissions">
          Manage permissions
        </Link>
      }
    >
      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}
      {!form ? (
        <LoadingCard />
      ) : (
        <form className="settings-form card" onSubmit={onSubmit}>
          <div className="settings-toggle-list">
            <SettingsToggle
              label="Enable cookie consent banner"
              hint="When on, analytics and ads wait for shopper choice. When off, enabled marketing tags load immediately."
              checked={asBool(form.consent_enabled)}
              onChange={(v) => setForm({ ...form, consent_enabled: v })}
            />
            <SettingsToggle
              label="Show Reject all"
              hint="Lets shoppers deny analytics and advertising cookies."
              checked={asBool(form.consent_show_reject)}
              onChange={(v) => setForm({ ...form, consent_show_reject: v })}
            />
            <SettingsToggle
              label="Show Analytics only"
              hint="Quick accept for analytics without advertising pixels."
              checked={asBool(form.consent_show_analytics_only)}
              onChange={(v) => setForm({ ...form, consent_show_analytics_only: v })}
            />
          </div>
          <div className="settings-form-grid">
            <label className="pf-field">
              <span className="pf-label">Message (English)</span>
              <span className="pf-hint">Shown on the storefront consent bar.</span>
              <textarea rows={3} value={form.consent_message} onChange={(e) => setForm({ ...form, consent_message: e.target.value })} />
            </label>
            <label className="pf-field">
              <span className="pf-label">Message (Arabic)</span>
              <span className="pf-hint">RTL copy for Arabic shoppers.</span>
              <textarea rows={3} value={form.consent_message_ar} onChange={(e) => setForm({ ...form, consent_message_ar: e.target.value })} dir="rtl" />
            </label>
            <label className="pf-field">
              <span className="pf-label">Policy URL</span>
              <span className="pf-hint">Privacy policy link on the banner.</span>
              <input value={form.consent_policy_url} onChange={(e) => setForm({ ...form, consent_policy_url: e.target.value })} />
            </label>
            <label className="pf-field">
              <span className="pf-label">Consent version</span>
              <span className="pf-hint">Bump to re-ask shoppers after policy changes.</span>
              <input
                type="number"
                min={1}
                value={form.consent_version ?? 1}
                onChange={(e) => setForm({ ...form, consent_version: Number(e.target.value) || 1 })}
              />
            </label>
          </div>
          <div className="settings-form-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Saving…" : "Save banner"}
            </button>
          </div>
        </form>
      )}
    </MarketingPageShell>
  );
}

const CONSENT_ANALYTICS_TOOLS = [
  { id: "gtm", label: "Google Tag Manager" },
  { id: "ga4", label: "Google Analytics 4" },
  { id: "clarity", label: "Microsoft Clarity" },
  { id: "hotjar", label: "Hotjar" },
];

const CONSENT_ADS_TOOLS = [
  { id: "meta", label: "Meta Pixel" },
  { id: "google_ads", label: "Google Ads" },
  { id: "tiktok", label: "TikTok" },
  { id: "snapchat", label: "Snapchat" },
  { id: "pinterest", label: "Pinterest" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "microsoft", label: "Microsoft Ads" },
];

export function MarketingConsentPermissionsPage() {
  const [form, setForm] = useState<MarketingConsent | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void adminApi
      .marketingConsent()
      .then(setForm)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setMsg("");
    setError("");
    try {
      const saved = await adminApi.updateMarketingConsent({
        consent_necessary_label: form.consent_necessary_label,
        consent_necessary_label_ar: form.consent_necessary_label_ar,
        consent_necessary_desc: form.consent_necessary_desc,
        consent_necessary_desc_ar: form.consent_necessary_desc_ar,
        consent_analytics_enabled: form.consent_analytics_enabled,
        consent_analytics_label: form.consent_analytics_label,
        consent_analytics_label_ar: form.consent_analytics_label_ar,
        consent_analytics_desc: form.consent_analytics_desc,
        consent_analytics_desc_ar: form.consent_analytics_desc_ar,
        consent_ads_enabled: form.consent_ads_enabled,
        consent_ads_label: form.consent_ads_label,
        consent_ads_label_ar: form.consent_ads_label_ar,
        consent_ads_desc: form.consent_ads_desc,
        consent_ads_desc_ar: form.consent_ads_desc_ar,
      });
      setForm(saved);
      setMsg("Cookie permissions saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <MarketingPageShell
      crumbs={[{ label: "Cookie consent", to: "/marketing/consent" }, { label: "Permissions" }]}
      title="Cookie permissions"
      subtitle="Enable or disable each permission category that marketing tools depend on. Necessary cookies stay always on."
      actions={
        <Link className="btn btn-secondary" to="/marketing/consent">
          Banner & enable
        </Link>
      }
    >
      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}
      {!form ? (
        <LoadingCard />
      ) : (
        <form className="settings-form card" onSubmit={onSubmit}>
          <section className="mkt-perm-block">
            <div className="mkt-perm-head">
              <div>
                <h2>Necessary</h2>
                <p>Cart, login, branch, and checkout. Always required — cannot be turned off.</p>
              </div>
              <span className="mkt-perm-badge">Always on</span>
            </div>
            <div className="settings-form-grid">
              <label className="pf-field">
                <span className="pf-label">Label (English)</span>
                <input value={form.consent_necessary_label} onChange={(e) => setForm({ ...form, consent_necessary_label: e.target.value })} />
              </label>
              <label className="pf-field">
                <span className="pf-label">Label (Arabic)</span>
                <input value={form.consent_necessary_label_ar} onChange={(e) => setForm({ ...form, consent_necessary_label_ar: e.target.value })} dir="rtl" />
              </label>
              <label className="pf-field">
                <span className="pf-label">Description (English)</span>
                <textarea rows={2} value={form.consent_necessary_desc} onChange={(e) => setForm({ ...form, consent_necessary_desc: e.target.value })} />
              </label>
              <label className="pf-field">
                <span className="pf-label">Description (Arabic)</span>
                <textarea rows={2} value={form.consent_necessary_desc_ar} onChange={(e) => setForm({ ...form, consent_necessary_desc_ar: e.target.value })} dir="rtl" />
              </label>
            </div>
          </section>

          <section className="mkt-perm-block">
            <div className="mkt-perm-head">
              <div>
                <h2>Analytics</h2>
                <p>Gates GTM, GA4, Clarity, and Hotjar until the shopper grants analytics.</p>
              </div>
              <SettingsToggle
                label="Offer analytics permission"
                hint="If off, analytics tags never wait for consent (and the Analytics-only button is hidden)."
                checked={asBool(form.consent_analytics_enabled)}
                onChange={(v) => setForm({ ...form, consent_analytics_enabled: v })}
              />
            </div>
            <ul className="mkt-perm-tools">
              {CONSENT_ANALYTICS_TOOLS.map((tool) => (
                <li key={tool.id}>{tool.label}</li>
              ))}
            </ul>
            <div className="settings-form-grid">
              <label className="pf-field">
                <span className="pf-label">Label (English)</span>
                <input value={form.consent_analytics_label} onChange={(e) => setForm({ ...form, consent_analytics_label: e.target.value })} />
              </label>
              <label className="pf-field">
                <span className="pf-label">Label (Arabic)</span>
                <input value={form.consent_analytics_label_ar} onChange={(e) => setForm({ ...form, consent_analytics_label_ar: e.target.value })} dir="rtl" />
              </label>
              <label className="pf-field">
                <span className="pf-label">Description (English)</span>
                <textarea rows={2} value={form.consent_analytics_desc} onChange={(e) => setForm({ ...form, consent_analytics_desc: e.target.value })} />
              </label>
              <label className="pf-field">
                <span className="pf-label">Description (Arabic)</span>
                <textarea rows={2} value={form.consent_analytics_desc_ar} onChange={(e) => setForm({ ...form, consent_analytics_desc_ar: e.target.value })} dir="rtl" />
              </label>
            </div>
          </section>

          <section className="mkt-perm-block">
            <div className="mkt-perm-head">
              <div>
                <h2>Advertising</h2>
                <p>Gates Meta, Google Ads, TikTok, Snapchat, Pinterest, LinkedIn, and Microsoft pixels.</p>
              </div>
              <SettingsToggle
                label="Offer advertising permission"
                hint="If off, ad pixels never wait for consent."
                checked={asBool(form.consent_ads_enabled)}
                onChange={(v) => setForm({ ...form, consent_ads_enabled: v })}
              />
            </div>
            <ul className="mkt-perm-tools">
              {CONSENT_ADS_TOOLS.map((tool) => (
                <li key={tool.id}>{tool.label}</li>
              ))}
            </ul>
            <div className="settings-form-grid">
              <label className="pf-field">
                <span className="pf-label">Label (English)</span>
                <input value={form.consent_ads_label} onChange={(e) => setForm({ ...form, consent_ads_label: e.target.value })} />
              </label>
              <label className="pf-field">
                <span className="pf-label">Label (Arabic)</span>
                <input value={form.consent_ads_label_ar} onChange={(e) => setForm({ ...form, consent_ads_label_ar: e.target.value })} dir="rtl" />
              </label>
              <label className="pf-field">
                <span className="pf-label">Description (English)</span>
                <textarea rows={2} value={form.consent_ads_desc} onChange={(e) => setForm({ ...form, consent_ads_desc: e.target.value })} />
              </label>
              <label className="pf-field">
                <span className="pf-label">Description (Arabic)</span>
                <textarea rows={2} value={form.consent_ads_desc_ar} onChange={(e) => setForm({ ...form, consent_ads_desc_ar: e.target.value })} dir="rtl" />
              </label>
            </div>
          </section>

          <div className="settings-form-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Saving…" : "Save permissions"}
            </button>
          </div>
        </form>
      )}
    </MarketingPageShell>
  );
}

export function MarketingSeoWorkspacePage() {
  const [name, setName] = useState("");
  const [q, setQ] = useState("");
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<MarketingSeoAuditProduct[]>([]);
  const [searchPage, setSearchPage] = useState(1);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [audit, setAudit] = useState<MarketingSeoAudit | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    void adminApi
      .storefrontSettings()
      .then((res) => setName(res.storefront_name))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setLoadError("");
    void adminApi
      .marketingSeoAudit({ page: 1, per_page: 5 })
      .then(setAudit)
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Failed to load SEO audit"));
  }, []);

  async function runProductSearch(page = 1) {
    setSearchBusy(true);
    setSearchError("");
    setSearched(true);
    try {
      const res = await adminApi.products({
        q: q.trim() || undefined,
        per_page: SEO_LIST_PER_PAGE,
        page,
        status: 1,
      });
      setResults(
        res.items.map((p) => ({
          product_id: p.product_id,
          name: p.name,
          sku: p.sku,
          issues: [],
        })),
      );
      setSearchPage(res.page);
      setSearchTotal(res.total);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
      setSearchTotal(0);
    } finally {
      setSearchBusy(false);
    }
  }

  async function searchProducts(e: FormEvent) {
    e.preventDefault();
    setSearchPage(1);
    await runProductSearch(1);
  }

  function goToSearchPage(page: number) {
    setSearchPage(page);
    void runProductSearch(page);
  }

  const liveHost = audit?.canonical_host?.replace(/\/$/, "") || config.frontstoreUrl.replace(/\/$/, "");

  return (
    <MarketingPageShell
      crumbs={[{ label: "SEO workspace" }]}
      title="SEO workspace"
      subtitle="Catalog coverage, product meta, and the indexing / AEO tools that publish to the live storefront."
      actions={
        <div className="actions">
          <a className="btn btn-secondary" href={frontUrl("/sitemap.xml")} target="_blank" rel="noreferrer">
            <ExternalLink size={14} />
            Live sitemap
          </a>
          <Link className="btn btn-secondary" to="/marketing/seo/identity">
            Site identity
          </Link>
        </div>
      }
    >
      {loadError ? <div className="alert alert-error">{loadError}</div> : null}

      <div className="settings-overview-grid">
        <article className="settings-stat card">
          <span className="settings-stat-label">Storefront</span>
          <strong>{name || "—"}</strong>
        </article>
        <article className="settings-stat card">
          <span className="settings-stat-label">Products with title</span>
          <strong>{audit ? `${pct(audit.with_meta_title, audit.products_total)}%` : "—"}</strong>
          <small>{audit ? `${audit.with_meta_title} / ${audit.products_total}` : ""}</small>
        </article>
        <article className="settings-stat card">
          <span className="settings-stat-label">With description</span>
          <strong>{audit ? `${pct(audit.with_meta_description, audit.products_total)}%` : "—"}</strong>
          <small>{audit ? `${audit.with_meta_description} / ${audit.products_total}` : ""}</small>
        </article>
        <article className="settings-stat card">
          <span className="settings-stat-label">AEO FAQs</span>
          <strong>{audit ? `${pct(audit.with_faq, audit.products_total)}%` : "—"}</strong>
          <small>{audit ? `${audit.with_faq} / ${audit.products_total}` : ""}</small>
        </article>
        <article className={`settings-stat card${audit && !audit.indexing_enabled ? " warn" : ""}`}>
          <span className="settings-stat-label">Indexing</span>
          <strong>{audit ? (audit.indexing_enabled ? "On" : "Off") : "—"}</strong>
        </article>
        <article className="settings-stat card">
          <span className="settings-stat-label">Sitemap</span>
          <strong>{audit ? (audit.sitemap_enabled ? "Live" : "Off") : "—"}</strong>
        </article>
        <article className="settings-stat card">
          <span className="settings-stat-label">AEO pack</span>
          <strong>{audit ? (audit.aeo_enabled ? "On" : "Off") : "—"}</strong>
        </article>
        <article className="settings-stat card">
          <span className="settings-stat-label">Noindex SKUs</span>
          <strong>{audit?.noindex ?? "—"}</strong>
        </article>
      </div>

      <div className="settings-sections mkt-seo-workspace-grid">
        <section className="settings-section card">
          <div className="settings-section-head">
            <span className="settings-section-icon" aria-hidden>
              <Globe2 size={18} />
            </span>
            <div>
              <h2>On-page & technical</h2>
              <p>Identity, crawlers, answer engines, and shopping feeds.</p>
            </div>
          </div>
          <ul className="settings-link-list">
            {[
              { to: "/marketing/seo/identity", label: "Site identity", desc: "Title, description, OG, Organization schema" },
              { to: "/marketing/seo/indexing", label: "Robots & sitemap", desc: "robots.txt, sitemap.xml, noindex switch" },
              { to: "/marketing/seo/aeo", label: "AEO & AI crawlers", desc: "FAQ JSON-LD, llms.txt, GPTBot / Claude / Perplexity" },
              { to: "/marketing/seo/search-console", label: "Search Console", desc: "Google and Bing verification tokens" },
              { to: "/marketing/seo/merchant", label: "Merchant Center", desc: "Google Shopping merchant ID" },
              { to: "/products", label: "Product SEO & AEO", desc: "Per-SKU meta, FAQ, and JSON-LD" },
            ].map((link) => (
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

        <section className="settings-section card">
          <div className="settings-section-head">
            <span className="settings-section-icon" aria-hidden>
              <ExternalLink size={18} />
            </span>
            <div>
              <h2>Live storefront</h2>
              <p>Published files and canonical host from marketing settings.</p>
            </div>
          </div>
          <ul className="settings-link-list">
            <li>
              <a href={liveHost} target="_blank" rel="noreferrer" className="settings-link-row">
                <span>
                  <strong>{liveHost.replace(/^https?:\/\//, "")}</strong>
                  <small>Canonical storefront host</small>
                </span>
                <ExternalLink size={16} aria-hidden />
              </a>
            </li>
            <li>
              <a href={frontUrl("/robots.txt")} target="_blank" rel="noreferrer" className="settings-link-row">
                <span>
                  <strong>robots.txt</strong>
                  <small>Crawler allow / disallow rules</small>
                </span>
                <ExternalLink size={16} aria-hidden />
              </a>
            </li>
            <li>
              <a href={frontUrl("/sitemap.xml")} target="_blank" rel="noreferrer" className="settings-link-row">
                <span>
                  <strong>sitemap.xml</strong>
                  <small>Home, categories, and active products</small>
                </span>
                <ExternalLink size={16} aria-hidden />
              </a>
            </li>
            <li>
              <a href={frontUrl("/llms.txt")} target="_blank" rel="noreferrer" className="settings-link-row">
                <span>
                  <strong>llms.txt</strong>
                  <small>Answer-engine brand summary</small>
                </span>
                <ExternalLink size={16} aria-hidden />
              </a>
            </li>
          </ul>
        </section>

        <section className="settings-section card">
          <div className="settings-section-head">
            <span className="settings-section-icon" aria-hidden>
              <Globe2 size={18} />
            </span>
            <div>
              <h2>Jump to a product</h2>
              <p>Search and open the SEO & AEO panel on a live SKU.</p>
            </div>
          </div>
          <form className="mkt-seo-search" onSubmit={searchProducts}>
            <label className="field">
              <span>Search products</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, SKU, barcode…" />
            </label>
            <button type="submit" className="btn btn-primary" disabled={searchBusy}>
              {searchBusy ? "Searching…" : "Search"}
            </button>
          </form>
          {searchError ? <div className="alert alert-error">{searchError}</div> : null}
          {searched ? (
            <>
              <ProductSeoLinks
                rows={results}
                empty={`No products matched “${q.trim()}”. Try SKU or barcode.`}
                loading={searchBusy}
              />
              <ListPager
                page={searchPage}
                perPage={SEO_LIST_PER_PAGE}
                total={searchTotal}
                busy={searchBusy}
                onPageChange={goToSearchPage}
              />
            </>
          ) : (
            <p className="muted mkt-seo-empty">Search opens the product editor with the SEO & AEO section expanded.</p>
          )}
        </section>
      </div>
    </MarketingPageShell>
  );
}
