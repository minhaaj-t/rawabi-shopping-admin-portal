import { type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Building2, ExternalLink, Globe2, Inbox, Receipt } from "../lib/icons";
import { SettingsPageShell } from "../components/SettingsPageShell";
import { LoadingCard } from "../components/LoadingIndicator";
import { adminApi } from "../lib/api";
import { useSettingsForm } from "../lib/useSettingsForm";

type UrlForm = Record<string, string>;

const BASE_KEYS = [
  "storefront_base_url",
  "api_public_url",
  "admin_portal_url",
  "assets_url",
  "dev_assets_url",
  "cdn_url",
  "docs_base_url",
  "invoice_base_url",
] as const;

const PAGE_KEYS = [
  "url_product",
  "url_product_canonical",
  "url_catalog",
  "url_group",
  "url_search",
  "url_deals",
  "url_explore",
  "url_flayer",
  "url_flayer_item",
  "url_news",
  "url_news_item",
  "url_blog",
  "url_blog_item",
  "url_careers",
  "url_careers_item",
  "url_archive",
  "url_archive_item",
  "url_about",
  "url_faq",
  "url_contact",
  "url_cart",
  "url_checkout",
  "url_invoice_page",
  "url_document_page",
  "fmt_slug_case",
] as const;

const MEDIA_KEYS = [
  "path_product_featured",
  "path_product_temp",
  "path_category_icon",
  "path_category_banner",
  "path_brand",
  "path_banner",
  "path_flyer",
  "path_coupon",
  "path_item_group",
  "path_item_group_multi",
  "path_news",
  "path_news_images",
  "path_careers_cv",
  "path_promotion",
  "path_page",
  "path_gallery",
  "path_vendor",
  "path_req_product",
  "path_marketing",
  "path_document",
  "path_invoice",
  "path_pdf",
  "path_null_image",
] as const;

const ID_KEYS = [
  "fmt_order_id",
  "fmt_order_number",
  "fmt_invoice_number",
  "fmt_customer_code",
  "fmt_guest_code",
  "fmt_product_ref",
  "fmt_document_ref",
  "id_pad_order",
  "id_pad_invoice",
  "id_pad_customer",
] as const;

const URL_SUBNAV = [
  { to: "/settings/urls", label: "Base & production", match: (p: string) => p === "/settings/urls" },
  { to: "/settings/urls/pages", label: "Pages & slugs", match: (p: string) => p.startsWith("/settings/urls/pages") },
  { to: "/settings/urls/media", label: "Media & documents", match: (p: string) => p.startsWith("/settings/urls/media") },
  { to: "/settings/urls/ids", label: "ID formats", match: (p: string) => p.startsWith("/settings/urls/ids") },
] as const;

const BLOG_PRESETS = [
  { label: "/blog/{slug}", value: "/blog/{slug}" },
  { label: "/blog/{slug}-{date}", value: "/blog/{slug}-{date}" },
  { label: "/blog/{yyyy}/{mm}/{slug}", value: "/blog/{yyyy}/{mm}/{slug}" },
  { label: "/blog/{id}/{slug}", value: "/blog/{id}/{slug}" },
];

const NEWS_PRESETS = [
  { label: "/news-events/{slug}", value: "/news-events/{slug}" },
  { label: "/news/{slug}-{date}", value: "/news/{slug}-{date}" },
  { label: "/news/{id}", value: "/news/{id}" },
];

const PRODUCT_PRESETS = [
  { label: "/{slug}/{id}", value: "/{slug}/{id}" },
  { label: "/product/{id}", value: "/product/{id}" },
  { label: "/p/{sku}", value: "/p/{sku}" },
];

function urlsToForm(data: Record<string, unknown>, keys: readonly string[]): UrlForm {
  const out: UrlForm = {};
  for (const key of keys) {
    out[key] = String(data[key] ?? "");
  }
  return out;
}

function UrlSettingsNav() {
  const { pathname } = useLocation();
  return (
    <nav className="settings-subnav" aria-label="URL settings">
      {URL_SUBNAV.map((item) => (
        <Link key={item.to} to={item.to} className={item.match(pathname) ? "is-active" : undefined}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function Field({
  form,
  setForm,
  id,
  label,
  hint,
  type = "text",
  mono,
  children,
}: {
  form: UrlForm;
  setForm: (next: UrlForm) => void;
  id: string;
  label: string;
  hint?: string;
  type?: "text" | "number" | "url";
  mono?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={`pf-field${mono ? " pf-field-mono" : ""}`}>
      <span className="pf-label">{label}</span>
      {hint ? <span className="pf-hint">{hint}</span> : <span className="pf-hint pf-hint-spacer" aria-hidden>&nbsp;</span>}
      <input
        type={type}
        value={form[id] ?? ""}
        onChange={(ev) => setForm({ ...form, [id]: ev.target.value })}
        required
        spellCheck={false}
      />
      {children}
    </div>
  );
}

function PresetRow({
  presets,
  onPick,
}: {
  presets: Array<{ label: string; value: string }>;
  onPick: (value: string) => void;
}) {
  return (
    <div className="settings-preset-row">
      {presets.map((p) => (
        <button key={p.value} type="button" className="btn btn-secondary btn-sm" onClick={() => onPick(p.value)}>
          {p.label}
        </button>
      ))}
    </div>
  );
}

function useUrlSubset(keys: readonly string[]) {
  return useSettingsForm(
    () => adminApi.urlSettings().then((data) => urlsToForm(data as Record<string, unknown>, keys)),
    async (body) => urlsToForm((await adminApi.updateUrlSettings(body)) as Record<string, unknown>, keys),
    (f) => {
      const body: Record<string, unknown> = {};
      for (const key of keys) {
        if (key.startsWith("id_pad_")) {
          body[key] = Number(f[key] || 0);
        } else {
          body[key] = f[key];
        }
      }
      return body;
    },
  );
}

export function UrlBaseSettingsPage() {
  const { form, setForm, busy, msg, error, onSubmit } = useUrlSubset(BASE_KEYS);

  return (
    <SettingsPageShell
      section="URLs & formats"
      sectionTo="/settings/urls"
      title="Base & production URLs"
      subtitle="Origins used in production for shop, API, admin, CDN, documents, and invoices."
    >
      <UrlSettingsNav />
      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}
      {!form ? (
        <LoadingCard label="Loading URL settings" />
      ) : (
        <form className="settings-form card" onSubmit={onSubmit}>
          <div className="settings-form-stack">
            <fieldset className="settings-fieldset">
              <legend>
                <Globe2 size={16} aria-hidden /> Site origins
              </legend>
              <div className="settings-fields">
                <Field form={form} setForm={setForm} id="storefront_base_url" label="Storefront / shop URL" hint="Customer website origin" type="url" />
                <Field form={form} setForm={setForm} id="api_public_url" label="Public API URL" hint="Laravel / legacy API host" type="url" />
                <Field form={form} setForm={setForm} id="admin_portal_url" label="Admin portal URL" hint="This React admin origin" type="url" />
              </div>
            </fieldset>
            <fieldset className="settings-fieldset">
              <legend>
                <Building2 size={16} aria-hidden /> Assets & CDN
              </legend>
              <div className="settings-fields">
                <Field form={form} setForm={setForm} id="assets_url" label="Production assets URL" hint="Main media host (trailing slash ok)" type="url" />
                <Field form={form} setForm={setForm} id="dev_assets_url" label="Development assets URL" hint="Dev media host" type="url" />
                <Field form={form} setForm={setForm} id="cdn_url" label="CDN URL" hint="Optional CDN mirror; defaults to assets URL" type="url" />
              </div>
            </fieldset>
            <fieldset className="settings-fieldset">
              <legend>
                <Receipt size={16} aria-hidden /> Documents & invoices hosts
              </legend>
              <div className="settings-fields">
                <Field form={form} setForm={setForm} id="docs_base_url" label="Documents base URL" hint="Where PDFs / files are served from" type="url" />
                <Field form={form} setForm={setForm} id="invoice_base_url" label="Invoice base URL" hint="Usually storefront; used to build invoice links" type="url" />
              </div>
            </fieldset>
          </div>
          <div className="settings-form-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Saving…" : "Save base URLs"}
            </button>
          </div>
        </form>
      )}
    </SettingsPageShell>
  );
}

export function UrlPagesSettingsPage() {
  const { form, setForm, busy, msg, error, onSubmit } = useUrlSubset(PAGE_KEYS);

  return (
    <SettingsPageShell
      section="URLs & formats"
      sectionTo="/settings/urls"
      title="Pages & slug formats"
      subtitle="Storefront route patterns. Tokens: {slug} {id} {date} {yyyy} {mm} {dd} {sku} {catId}."
    >
      <UrlSettingsNav />
      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}
      {!form ? (
        <LoadingCard label="Loading URL settings" />
      ) : (
        <form className="settings-form card" onSubmit={onSubmit}>
          <div className="settings-form-stack">
            <fieldset className="settings-fieldset">
              <legend>
                <ExternalLink size={16} aria-hidden /> Catalog & commerce
              </legend>
              <div className="settings-fields">
                <Field form={form} setForm={setForm} id="url_product" label="Product (pretty)" hint="Legacy rewrite pattern" mono>
                  <PresetRow presets={PRODUCT_PRESETS} onPick={(v) => setForm({ ...form, url_product: v })} />
                </Field>
                <Field form={form} setForm={setForm} id="url_product_canonical" label="Product (canonical)" hint="Internal /product/{id} route" mono />
                <Field form={form} setForm={setForm} id="url_catalog" label="Catalogue / category" mono />
                <Field form={form} setForm={setForm} id="url_group" label="Item group" mono />
                <Field form={form} setForm={setForm} id="url_search" label="Search" mono />
                <Field form={form} setForm={setForm} id="url_deals" label="Deals" mono />
                <Field form={form} setForm={setForm} id="url_explore" label="Explore" mono />
                <Field form={form} setForm={setForm} id="url_cart" label="Cart" mono />
                <Field form={form} setForm={setForm} id="url_checkout" label="Checkout" mono />
              </div>
            </fieldset>

            <fieldset className="settings-fieldset">
              <legend>
                <ExternalLink size={16} aria-hidden /> Content: news, blog, flyers
              </legend>
              <p className="settings-fieldset-note">
                Listing path + item detail path. Use presets for blog-style slug or slug-date formats.
              </p>
              <div className="settings-fields">
                <Field form={form} setForm={setForm} id="url_news" label="News listing" mono />
                <Field form={form} setForm={setForm} id="url_news_item" label="News item" hint="e.g. /news-events/{slug}" mono>
                  <PresetRow presets={NEWS_PRESETS} onPick={(v) => setForm({ ...form, url_news_item: v })} />
                </Field>
                <Field form={form} setForm={setForm} id="url_blog" label="Blog listing" mono />
                <Field form={form} setForm={setForm} id="url_blog_item" label="Blog item" hint="e.g. /blog/{slug} or /blog/{slug}-{date}" mono>
                  <PresetRow presets={BLOG_PRESETS} onPick={(v) => setForm({ ...form, url_blog_item: v })} />
                </Field>
                <Field form={form} setForm={setForm} id="url_flayer" label="Flyers listing" mono />
                <Field form={form} setForm={setForm} id="url_flayer_item" label="Flyer item" mono />
                <Field form={form} setForm={setForm} id="url_archive" label="Archive listing" mono />
                <Field form={form} setForm={setForm} id="url_archive_item" label="Archive item" hint="Often slug + date" mono />
                <Field form={form} setForm={setForm} id="url_careers" label="Careers listing" mono />
                <Field form={form} setForm={setForm} id="url_careers_item" label="Career / job detail" mono />
              </div>
            </fieldset>

            <fieldset className="settings-fieldset">
              <legend>
                <ExternalLink size={16} aria-hidden /> Static pages & files
              </legend>
              <div className="settings-fields">
                <Field form={form} setForm={setForm} id="url_about" label="About" mono />
                <Field form={form} setForm={setForm} id="url_faq" label="FAQ" mono />
                <Field form={form} setForm={setForm} id="url_contact" label="Contact" mono />
                <Field form={form} setForm={setForm} id="url_invoice_page" label="Invoice page URL" hint="Customer-facing invoice route" mono />
                <Field form={form} setForm={setForm} id="url_document_page" label="Document page URL" mono />
                <label className="pf-field">
                  <span className="pf-label">Slug case</span>
                  <span className="pf-hint">How generated slugs are normalized</span>
                  <select
                    value={form.fmt_slug_case || "kebab-case"}
                    onChange={(ev) => setForm({ ...form, fmt_slug_case: ev.target.value })}
                  >
                    <option value="kebab-case">kebab-case</option>
                    <option value="snake_case">snake_case</option>
                    <option value="as-is">as-is</option>
                  </select>
                </label>
              </div>
            </fieldset>
          </div>
          <div className="settings-form-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Saving…" : "Save page formats"}
            </button>
          </div>
        </form>
      )}
    </SettingsPageShell>
  );
}

export function UrlMediaSettingsPage() {
  const { form, setForm, busy, msg, error, onSubmit } = useUrlSubset(MEDIA_KEYS);

  return (
    <SettingsPageShell
      section="URLs & formats"
      sectionTo="/settings/urls"
      title="Media & document paths"
      subtitle="Upload folders for images, PDFs, CVs, documents, and invoices (legacy APis / ec_admin)."
    >
      <UrlSettingsNav />
      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}
      {!form ? (
        <LoadingCard label="Loading URL settings" />
      ) : (
        <form className="settings-form card" onSubmit={onSubmit}>
          <div className="settings-form-stack">
            <fieldset className="settings-fieldset">
              <legend>
                <Inbox size={16} aria-hidden /> Catalog media
              </legend>
              <div className="settings-fields">
                <Field form={form} setForm={setForm} id="path_product_featured" label="Product featured image" hint="Relative to assets / CDN" mono />
                <Field form={form} setForm={setForm} id="path_product_temp" label="Product image temp" mono />
                <Field form={form} setForm={setForm} id="path_category_icon" label="Category icons" mono />
                <Field form={form} setForm={setForm} id="path_category_banner" label="Category banners" mono />
                <Field form={form} setForm={setForm} id="path_brand" label="Brand images" mono />
                <Field form={form} setForm={setForm} id="path_banner" label="Home / promo banners" mono />
                <Field form={form} setForm={setForm} id="path_flyer" label="Flyer PDF & covers" mono />
                <Field form={form} setForm={setForm} id="path_coupon" label="Coupon images" mono />
                <Field form={form} setForm={setForm} id="path_item_group" label="Item group images" mono />
                <Field form={form} setForm={setForm} id="path_item_group_multi" label="Item group multi images" mono />
                <Field form={form} setForm={setForm} id="path_null_image" label="Fallback null image" mono />
              </div>
            </fieldset>
            <fieldset className="settings-fieldset">
              <legend>
                <Inbox size={16} aria-hidden /> Content & marketing
              </legend>
              <div className="settings-fields">
                <Field form={form} setForm={setForm} id="path_news" label="News featured images" mono />
                <Field form={form} setForm={setForm} id="path_news_images" label="News gallery images" mono />
                <Field form={form} setForm={setForm} id="path_promotion" label="Promotion images" mono />
                <Field form={form} setForm={setForm} id="path_page" label="CMS page images" mono />
                <Field form={form} setForm={setForm} id="path_gallery" label="Gallery images" mono />
                <Field form={form} setForm={setForm} id="path_vendor" label="Vendor logos" hint="Legacy: vender_images" mono />
                <Field form={form} setForm={setForm} id="path_req_product" label="Product requests" mono />
                <Field form={form} setForm={setForm} id="path_marketing" label="Marketing / SEO assets" mono />
              </div>
            </fieldset>
            <fieldset className="settings-fieldset">
              <legend>
                <Receipt size={16} aria-hidden /> Documents, CVs & invoices
              </legend>
              <div className="settings-fields">
                <Field form={form} setForm={setForm} id="path_careers_cv" label="Careers CV uploads" mono />
                <Field form={form} setForm={setForm} id="path_document" label="Documents folder" mono />
                <Field form={form} setForm={setForm} id="path_invoice" label="Invoice files folder" mono />
                <Field form={form} setForm={setForm} id="path_pdf" label="Generic PDF folder" mono />
              </div>
            </fieldset>
          </div>
          <div className="settings-form-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Saving…" : "Save media paths"}
            </button>
          </div>
        </form>
      )}
    </SettingsPageShell>
  );
}

export function UrlIdsSettingsPage() {
  const { form, setForm, busy, msg, error, onSubmit } = useUrlSubset(ID_KEYS);

  return (
    <SettingsPageShell
      section="URLs & formats"
      sectionTo="/settings/urls"
      title="ID & reference formats"
      subtitle="Display and export patterns for orders, invoices, customers, and documents. Tokens: {id} {sku} {yyyy} {mm} {dd} {store}."
    >
      <UrlSettingsNav />
      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}
      {!form ? (
        <LoadingCard label="Loading URL settings" />
      ) : (
        <form className="settings-form card" onSubmit={onSubmit}>
          <div className="settings-form-stack">
            <fieldset className="settings-fieldset">
              <legend>
                <Receipt size={16} aria-hidden /> Orders & invoices
              </legend>
              <div className="settings-fields">
                <Field form={form} setForm={setForm} id="fmt_order_id" label="Order ID format" hint="Raw id pattern" mono />
                <Field form={form} setForm={setForm} id="fmt_order_number" label="Order number format" hint="e.g. RW-{id}" mono />
                <Field form={form} setForm={setForm} id="fmt_invoice_number" label="Invoice number format" hint="e.g. INV-{yyyy}{mm}-{id}" mono />
                <Field form={form} setForm={setForm} id="id_pad_order" label="Order ID zero-pad" hint="0 = no padding" type="number" />
                <Field form={form} setForm={setForm} id="id_pad_invoice" label="Invoice ID zero-pad" type="number" />
              </div>
            </fieldset>
            <fieldset className="settings-fieldset">
              <legend>
                <Building2 size={16} aria-hidden /> Customers & products
              </legend>
              <div className="settings-fields">
                <Field form={form} setForm={setForm} id="fmt_customer_code" label="Customer code" mono />
                <Field form={form} setForm={setForm} id="fmt_guest_code" label="Guest code" mono />
                <Field form={form} setForm={setForm} id="fmt_product_ref" label="Product reference" hint="Usually {sku}" mono />
                <Field form={form} setForm={setForm} id="fmt_document_ref" label="Document reference" mono />
                <Field form={form} setForm={setForm} id="id_pad_customer" label="Customer ID zero-pad" type="number" />
              </div>
            </fieldset>
          </div>
          <div className="settings-form-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Saving…" : "Save ID formats"}
            </button>
          </div>
        </form>
      )}
    </SettingsPageShell>
  );
}
