import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Globe2,
  Monitor,
  Plug,
  RotateCcw,
  Smartphone,
  Store,
  Truck,
  Wrench,
} from "../lib/icons";
import { SettingsPageShell, SettingsToggle } from "../components/SettingsPageShell";
import { adminApi, type PerformanceSettings } from "../lib/api";
import { config } from "../lib/config";

const PERF_DEFAULTS: PerformanceSettings = {
  caching_enabled: true,
  preload_enabled: false,
  preload_interval_minutes: 60,
  automatic_cache_enabled: true,
  browser_caching_enabled: true,
  browser_cache_max_age: 604800,
  gravatar_cache_enabled: false,
  purge_varnish_enabled: false,
  varnish_url: "",
  combine_css: false,
  minify_css: true,
  combine_js: false,
  minify_js: true,
  gzip_enabled: true,
  dns_prefetch_enabled: true,
  dns_prefetch_hosts: "https://fonts.googleapis.com\nhttps://fonts.gstatic.com",
  disable_emojis: true,
  display_swap_fonts: true,
  cdn_enabled: false,
  cdn_url: "",
  exclude_pages: "/checkout\n/cart\n/myaccount",
  exclude_user_agents: "",
  exclude_cookies: "",
  exclude_css: "",
  exclude_js: "",
  updated_at: null,
};

function clearAdminLocalCaches() {
  const keep = new Set([
    "rb_admin_token",
    "rb_admin_user",
    "rawabi_admin_personalize",
    "rawabi_admin_locale",
    "rawabi_admin_branch",
  ]);
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (keep.has(key)) continue;
    if (key.startsWith("rb_") || key.startsWith("rawabi_") || key.startsWith("dashboard")) {
      toRemove.push(key);
    }
  }
  for (const key of toRemove) localStorage.removeItem(key);
  try {
    sessionStorage.clear();
  } catch {
    /* ignore */
  }
}

export function SettingsToolsPage() {
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [savingPerf, setSavingPerf] = useState(false);
  const [status, setStatus] = useState<Awaited<ReturnType<typeof adminApi.settingsTools>> | null>(null);
  const [perf, setPerf] = useState<PerformanceSettings>(PERF_DEFAULTS);

  async function refreshStatus() {
    try {
      const data = await adminApi.settingsTools();
      setStatus(data);
      if (data.performance) setPerf({ ...PERF_DEFAULTS, ...data.performance });
      else {
        const p = await adminApi.performanceSettings();
        setPerf({ ...PERF_DEFAULTS, ...p });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tools status");
    }
  }

  useEffect(() => {
    void refreshStatus();
  }, []);

  function patchPerf<K extends keyof PerformanceSettings>(key: K, value: PerformanceSettings[K]) {
    setPerf((prev) => ({ ...prev, [key]: value }));
  }

  async function savePerformance() {
    setSavingPerf(true);
    setMsg("");
    setError("");
    try {
      const saved = await adminApi.updatePerformanceSettings(perf);
      setPerf({ ...PERF_DEFAULTS, ...saved });
      setMsg("Cache & performance settings saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingPerf(false);
    }
  }

  async function runClear(targets: string[], label: string, alsoLocalAdmin = false) {
    setBusy(label);
    setMsg("");
    setError("");
    try {
      const res = await adminApi.clearSettingsCache(targets);
      if (alsoLocalAdmin || targets.includes("admin") || targets.includes("all")) {
        clearAdminLocalCaches();
      }
      const parts = [
        `${label} done at ${new Date(res.cleared_at).toLocaleString()}.`,
        res.actions.length ? `Actions: ${res.actions.join(", ")}.` : "",
        res.revalidate?.attempted
          ? res.revalidate.ok
            ? "Storefront revalidate OK."
            : `Storefront revalidate: ${res.revalidate.message ?? "failed"}.`
          : "",
      ].filter(Boolean);
      setMsg(parts.join(" "));
      await refreshStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cache clear failed");
    } finally {
      setBusy(null);
    }
  }

  async function pingHealth() {
    setBusy("health");
    setMsg("");
    setError("");
    try {
      const apiHost = (status?.hosts?.api || config.apiUrl).replace(/\/$/, "");
      const healthUrl = `${apiHost}/api/v2/health`;
      const r = await fetch(healthUrl, { headers: { Accept: "application/json" } });
      const json = (await r.json()) as { status?: string; service?: string };
      setMsg(
        r.ok
          ? `API health OK (${json.service ?? "api"}) — ${new Date().toLocaleString()}.`
          : `API health returned HTTP ${r.status}.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Health check failed");
    } finally {
      setBusy(null);
    }
  }

  const tokenLine = status
    ? `web v${status.tokens.web} · mobile v${status.tokens.mobile} · delivery v${status.tokens.delivery} · admin v${status.tokens.admin}`
    : "Loading versions…";

  return (
    <SettingsPageShell
      section="Tools"
      title="Cache, optimization & performance"
      subtitle="Purge caches across apps, and control storefront caching, asset optimization, CDN, and exclusions."
      actions={
        <button type="button" className="btn btn-primary" disabled={savingPerf} onClick={() => void savePerformance()}>
          {savingPerf ? "Saving…" : "Save performance settings"}
        </button>
      }
    >
      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}

      <div className="card settings-tools-status">
        <div>
          <strong>Client cache versions</strong>
          <p className="mono">{tokenLine}</p>
        </div>
        <div className="settings-tools-status-meta">
          {status ? (
            <>
              <span>PHP {status.php_version}</span>
              <span>Laravel {status.laravel_version}</span>
              <span>Revalidate {status.revalidate_configured ? "configured" : "not configured"}</span>
              {perf.updated_at ? <span>Perf saved {new Date(perf.updated_at).toLocaleString()}</span> : null}
            </>
          ) : null}
        </div>
      </div>

      <h2 className="settings-tools-section-title">Purge caches</h2>
      <div className="settings-tools-grid">
        <article className="card settings-tool-card">
          <header>
            <Wrench size={18} aria-hidden />
            <h2>Backend (Laravel)</h2>
          </header>
          <p>Clear application, config, route, view, and event caches after env or deploy changes.</p>
          {status?.meta.backend_cleared_at ? (
            <p className="settings-tool-meta">Last: {new Date(status.meta.backend_cleared_at).toLocaleString()}</p>
          ) : null}
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy !== null}
            onClick={() => void runClear(["backend"], "Backend cache")}
          >
            {busy === "Backend cache" ? "Clearing…" : "Clear backend cache"}
          </button>
        </article>

        <article className="card settings-tool-card">
          <header>
            <Globe2 size={18} aria-hidden />
            <h2>Web storefront</h2>
          </header>
          <p>Bump web cache token and optionally revalidate Next.js / purge Varnish when enabled below.</p>
          {status?.meta.web_cleared_at ? (
            <p className="settings-tool-meta">Last: {new Date(status.meta.web_cleared_at).toLocaleString()}</p>
          ) : null}
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy !== null}
            onClick={() => void runClear(["web"], "Web storefront cache")}
          >
            {busy === "Web storefront cache" ? "Clearing…" : "Clear web cache"}
          </button>
        </article>

        <article className="card settings-tool-card">
          <header>
            <Smartphone size={18} aria-hidden />
            <h2>Customer mobile app</h2>
          </header>
          <p>Bump mobile cache version so APP-MOBILE drops soft caches on next open.</p>
          {status?.meta.mobile_cleared_at ? (
            <p className="settings-tool-meta">Last: {new Date(status.meta.mobile_cleared_at).toLocaleString()}</p>
          ) : null}
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy !== null}
            onClick={() => void runClear(["mobile"], "Mobile app cache")}
          >
            {busy === "Mobile app cache" ? "Clearing…" : "Clear mobile cache"}
          </button>
        </article>

        <article className="card settings-tool-card">
          <header>
            <Truck size={18} aria-hidden />
            <h2>Delivery / picker app</h2>
          </header>
          <p>Bump delivery app cache version for APP-DELIVERY soft refresh.</p>
          {status?.meta.delivery_cleared_at ? (
            <p className="settings-tool-meta">Last: {new Date(status.meta.delivery_cleared_at).toLocaleString()}</p>
          ) : null}
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy !== null}
            onClick={() => void runClear(["delivery"], "Delivery app cache")}
          >
            {busy === "Delivery app cache" ? "Clearing…" : "Clear delivery cache"}
          </button>
        </article>

        <article className="card settings-tool-card">
          <header>
            <Monitor size={18} aria-hidden />
            <h2>Admin portal</h2>
          </header>
          <p>Clear this browser’s non-auth UI caches and bump the admin token.</p>
          {status?.meta.admin_cleared_at ? (
            <p className="settings-tool-meta">Last: {new Date(status.meta.admin_cleared_at).toLocaleString()}</p>
          ) : null}
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy !== null}
            onClick={() => void runClear(["admin"], "Admin portal cache", true)}
          >
            {busy === "Admin portal cache" ? "Clearing…" : "Clear admin cache"}
          </button>
        </article>

        <article className="card settings-tool-card settings-tool-card-accent">
          <header>
            <RotateCcw size={18} aria-hidden />
            <h2>Clear everything</h2>
          </header>
          <p>Backend + web + mobile + delivery + admin in one action.</p>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy !== null}
            onClick={() => void runClear(["all"], "All caches", true)}
          >
            {busy === "All caches" ? "Clearing…" : "Clear all caches"}
          </button>
        </article>
      </div>

      <form
        className="settings-form card settings-perf-panel"
        onSubmit={(e) => {
          e.preventDefault();
          void savePerformance();
        }}
      >
        <h2 className="settings-tools-section-title">Caching</h2>
        <p className="settings-fieldset-note">
          Store copies of storefront pages and control how cache is built and served for returning visitors.
        </p>
        <div className="settings-toggle-list">
          <SettingsToggle
            label="Caching"
            hint="Store copies of web pages so repeat visits load faster."
            checked={perf.caching_enabled}
            onChange={(v) => patchPerf("caching_enabled", v)}
          />
          <SettingsToggle
            label="Preload"
            hint="Periodically create cache so users always hit a warm page."
            checked={perf.preload_enabled}
            onChange={(v) => patchPerf("preload_enabled", v)}
          />
          <SettingsToggle
            label="Automatic cache"
            hint="Rebuild cache when content changes (used with preload)."
            checked={perf.automatic_cache_enabled}
            onChange={(v) => patchPerf("automatic_cache_enabled", v)}
          />
          <SettingsToggle
            label="Browser caching"
            hint="Cache static assets in the visitor’s browser for return visits."
            checked={perf.browser_caching_enabled}
            onChange={(v) => patchPerf("browser_caching_enabled", v)}
          />
          <SettingsToggle
            label="Gravatar cache"
            hint="Host Gravatar images on your server/CDN instead of third-party round-trips."
            checked={perf.gravatar_cache_enabled}
            onChange={(v) => patchPerf("gravatar_cache_enabled", v)}
          />
          <SettingsToggle
            label="Purge Varnish"
            hint="When clearing web/backend cache, also PURGE Varnish if a URL is set."
            checked={perf.purge_varnish_enabled}
            onChange={(v) => patchPerf("purge_varnish_enabled", v)}
          />
        </div>
        <div className="settings-fields settings-perf-fields">
          <label className="pf-field">
            <span className="pf-label">Preload interval (minutes)</span>
            <input
              type="number"
              min={5}
              max={10080}
              value={perf.preload_interval_minutes}
              onChange={(e) => patchPerf("preload_interval_minutes", Number(e.target.value) || 60)}
            />
          </label>
          <label className="pf-field">
            <span className="pf-label">Browser cache max-age (seconds)</span>
            <input
              type="number"
              min={0}
              max={31536000}
              value={perf.browser_cache_max_age}
              onChange={(e) => patchPerf("browser_cache_max_age", Number(e.target.value) || 0)}
            />
          </label>
          <label className="pf-field pf-span-2">
            <span className="pf-label">Varnish purge URL</span>
            <input
              type="url"
              value={perf.varnish_url}
              onChange={(e) => patchPerf("varnish_url", e.target.value)}
              placeholder="https://varnish.example.com/"
              disabled={!perf.purge_varnish_enabled}
            />
          </label>
        </div>

        <h2 className="settings-tools-section-title">Optimization</h2>
        <p className="settings-fieldset-note">Reduce request count and payload size for CSS, JS, fonts, and compression.</p>
        <div className="settings-toggle-list">
          <SettingsToggle
            label="Combine CSS"
            hint="Combine CSS files in the page head to reduce HTTP requests."
            checked={perf.combine_css}
            onChange={(v) => patchPerf("combine_css", v)}
          />
          <SettingsToggle
            label="Minify CSS"
            hint="Reduce CSS file size by stripping whitespace and comments."
            checked={perf.minify_css}
            onChange={(v) => patchPerf("minify_css", v)}
          />
          <SettingsToggle
            label="Combine JS"
            hint="Combine JS files in the page head to reduce HTTP requests."
            checked={perf.combine_js}
            onChange={(v) => patchPerf("combine_js", v)}
          />
          <SettingsToggle
            label="Minify JS"
            hint="Reduce JavaScript payload size for faster downloads."
            checked={perf.minify_js}
            onChange={(v) => patchPerf("minify_js", v)}
          />
          <SettingsToggle
            label="GZIP"
            hint="Apply GZIP compression so responses sent from the server are smaller."
            checked={perf.gzip_enabled}
            onChange={(v) => patchPerf("gzip_enabled", v)}
          />
          <SettingsToggle
            label="DNS-Prefetch"
            hint="Resolve third-party domain names early before assets are needed."
            checked={perf.dns_prefetch_enabled}
            onChange={(v) => patchPerf("dns_prefetch_enabled", v)}
          />
          <SettingsToggle
            label="Disable emojis"
            hint="Remove emoji inline CSS / emoji scripts when not needed."
            checked={perf.disable_emojis}
            onChange={(v) => patchPerf("disable_emojis", v)}
          />
          <SettingsToggle
            label="Display swap (fonts)"
            hint="Add font-display=swap so text stays visible while Google fonts load."
            checked={perf.display_swap_fonts}
            onChange={(v) => patchPerf("display_swap_fonts", v)}
          />
        </div>
        <div className="settings-fields settings-perf-fields">
          <label className="pf-field pf-span-2">
            <span className="pf-label">DNS-Prefetch hosts</span>
            <span className="pf-hint">One host URL per line</span>
            <textarea
              rows={3}
              value={perf.dns_prefetch_hosts}
              onChange={(e) => patchPerf("dns_prefetch_hosts", e.target.value)}
              disabled={!perf.dns_prefetch_enabled}
            />
          </label>
        </div>

        <h2 className="settings-tools-section-title">CDN</h2>
        <p className="settings-fieldset-note">
          Serve cached static files from a CDN edge network for faster delivery worldwide.
        </p>
        <div className="settings-toggle-list">
          <SettingsToggle
            label="CDN"
            hint="Route static cached assets through a CDN hostname."
            checked={perf.cdn_enabled}
            onChange={(v) => patchPerf("cdn_enabled", v)}
          />
        </div>
        <div className="settings-fields settings-perf-fields">
          <label className="pf-field pf-span-2">
            <span className="pf-label">CDN URL</span>
            <input
              type="url"
              value={perf.cdn_url}
              onChange={(e) => patchPerf("cdn_url", e.target.value)}
              placeholder="https://cdn.rawabihypermarket.com/"
              disabled={!perf.cdn_enabled}
            />
          </label>
        </div>

        <h2 className="settings-tools-section-title">Exclude</h2>
        <p className="settings-fieldset-note">
          Skip caching or optimization for specific pages, user-agents, cookies, CSS, or JS (one entry per line).
        </p>
        <div className="settings-fields settings-perf-fields">
          <label className="pf-field">
            <span className="pf-label">Exclude pages</span>
            <textarea rows={3} value={perf.exclude_pages} onChange={(e) => patchPerf("exclude_pages", e.target.value)} />
          </label>
          <label className="pf-field">
            <span className="pf-label">Exclude user-agents</span>
            <textarea
              rows={3}
              value={perf.exclude_user_agents}
              onChange={(e) => patchPerf("exclude_user_agents", e.target.value)}
            />
          </label>
          <label className="pf-field">
            <span className="pf-label">Exclude cookies</span>
            <textarea rows={3} value={perf.exclude_cookies} onChange={(e) => patchPerf("exclude_cookies", e.target.value)} />
          </label>
          <label className="pf-field">
            <span className="pf-label">Exclude CSS</span>
            <textarea rows={3} value={perf.exclude_css} onChange={(e) => patchPerf("exclude_css", e.target.value)} />
          </label>
          <label className="pf-field pf-span-2">
            <span className="pf-label">Exclude JS</span>
            <textarea rows={3} value={perf.exclude_js} onChange={(e) => patchPerf("exclude_js", e.target.value)} />
          </label>
        </div>

        <div className="settings-form-actions">
          <button type="submit" className="btn btn-primary" disabled={savingPerf}>
            {savingPerf ? "Saving…" : "Save performance settings"}
          </button>
        </div>
      </form>

      <h2 className="settings-tools-section-title">Diagnostics & links</h2>
      <div className="settings-tools-grid">
        <article className="card settings-tool-card">
          <header>
            <Plug size={18} aria-hidden />
            <h2>Diagnostics</h2>
          </header>
          <p>Ping API health to confirm the Laravel service is reachable.</p>
          <div className="settings-tool-actions">
            <button type="button" className="btn btn-secondary" disabled={busy !== null} onClick={() => void pingHealth()}>
              {busy === "health" ? "Pinging…" : "Ping API health"}
            </button>
          </div>
        </article>

        <article className="card settings-tool-card">
          <header>
            <Store size={18} aria-hidden />
            <h2>Quick links</h2>
          </header>
          <ul className="settings-tool-links">
            <li>
              <Link to="/settings/integrations">Integration status</Link>
            </li>
            <li>
              <Link to="/settings/urls">URL & format settings</Link>
            </li>
            <li>
              <Link to="/settings/shop">Shop rules</Link>
            </li>
            <li>
              <Link to="/stores">Manage stores</Link>
            </li>
            <li>
              <Link to="/settings/storefront">Storefront / maintenance</Link>
            </li>
          </ul>
        </article>
      </div>
    </SettingsPageShell>
  );
}
