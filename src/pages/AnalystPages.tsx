import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { ChevronRight, ExternalLink, Search } from "../lib/icons";
import { adminApi } from "../lib/api";
import type {
  AnalystCustomerRow,
  AnalystOverview,
  AnalystResearch,
  AnalystResearchRun,
  AnalystSearchTrends,
  AnalystSegment,
  AnalystTermMatch,
  AppStoreAnalyticsPayload,
  AppStoreListing,
} from "../lib/analyst";
import { SettingsToggle } from "../components/SettingsPageShell";
import { LoadingCard } from "../components/LoadingIndicator";

function AnalystShell({
  crumbs,
  title,
  subtitle,
  actions,
  children,
}: {
  crumbs?: Array<{ label: string; to?: string }>;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const trail = [{ label: "Data Analyst", to: "/analyst" }, ...(crumbs ?? [])];

  return (
    <div className="page settings-form-page mkt-page analyst-page">
      <header className="page-head">
        <div>
          <p className="settings-crumb">
            {trail.map((c, i) => {
              const last = i === trail.length - 1;
              return (
                <span key={`${c.label}-${i}`} className="settings-crumb-item">
                  {i > 0 ? <ChevronRight size={14} aria-hidden /> : null}
                  {last || !c.to ? <span>{c.label}</span> : <Link to={c.to}>{c.label}</Link>}
                </span>
              );
            })}
          </p>
          <h1 className="page-title">{title}</h1>
          {subtitle ? <p className="page-sub">{subtitle}</p> : null}
        </div>
        {actions}
      </header>
      {children}
    </div>
  );
}

function money(n: number) {
  return `QAR ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  if (total <= perPage) return null;
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
        <button type="button" className="btn btn-secondary" disabled={busy || page >= lastPage} onClick={() => onPageChange(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}

function TermMatchList({ items }: { items: AnalystTermMatch[] }) {
  if (!items.length) return <p className="muted mkt-seo-empty">No terms to show yet.</p>;
  return (
    <ul className="settings-link-list">
      {items.map((row) => (
        <li key={row.term}>
          <div className="settings-link-row analyst-term-row">
            <span>
              <strong>
                {row.term}
                {row.gap ? <span className="analyst-gap"> · catalog gap</span> : null}
              </strong>
              <small>
                {row.users != null ? `${row.users} shoppers` : null}
                {row.users != null && row.match_count != null ? " · " : null}
                {row.match_count != null ? `${row.match_count} matches` : null}
                {row.matches[0] ? ` · top: ${row.matches[0].name}` : " · no SKU match"}
              </small>
            </span>
            {row.matches[0] ? (
              <Link to={`/products/${row.matches[0].product_id}/edit`} className="btn btn-secondary">
                Open SKU
              </Link>
            ) : (
              <Link to={`/products/new`} className="btn btn-secondary">
                Add product
              </Link>
            )}
          </div>
          {row.matches.length > 1 ? (
            <div className="analyst-match-chips">
              {row.matches.slice(0, 4).map((m) => (
                <Link key={m.product_id} to={`/products/${m.product_id}/edit`}>
                  {m.name} ({Math.round(m.score * 100)}%)
                </Link>
              ))}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function AnalystHubPage() {
  const [data, setData] = useState<AnalystOverview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void adminApi
      .analystOverview()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  return (
    <AnalystShell
      title="Data Analyst"
      subtitle="Customer segments, search demand, store KPIs, and public market research matched to the Rawabi catalog."
      actions={
        <div className="actions">
          <Link className="btn btn-secondary" to="/reports/users">
            Users report
          </Link>
          <Link className="btn btn-primary" to="/analyst/product-match">
            Auto product match
          </Link>
        </div>
      }
    >
      {error ? <div className="alert alert-error">{error}</div> : null}
      <div className="settings-overview-grid">
        <article className="settings-stat card">
          <span className="settings-stat-label">Customers</span>
          <strong>{data?.customers_total ?? "—"}</strong>
          <small>{data ? `${data.customers_active} active` : ""}</small>
        </article>
        <article className="settings-stat card">
          <span className="settings-stat-label">With orders</span>
          <strong>{data?.customers_with_orders ?? "—"}</strong>
        </article>
        <article className="settings-stat card">
          <span className="settings-stat-label">Search terms</span>
          <strong>{data?.search_terms_tracked ?? "—"}</strong>
          <small>{data ? `${data.search_terms_matched} matched` : ""}</small>
        </article>
        <article className="settings-stat card">
          <span className="settings-stat-label">Research sources</span>
          <strong>{data?.research_sources ?? "—"}</strong>
          <small>{data ? `${data.research_runs} runs` : ""}</small>
        </article>
      </div>

      <div className="settings-sections mkt-seo-workspace-grid">
        {[
          {
            to: "/analyst/customers",
            title: "Customer analysis",
            desc: "Segments, LTV, inactive and never-ordered shoppers.",
          },
          {
            to: "/analyst/search-trends",
            title: "Search trends",
            desc: "What customers type — and which queries miss the catalog.",
          },
          {
            to: "/analyst/research",
            title: "Market research",
            desc: "Public web sources, crawl candidates, map to SKUs.",
          },
          {
            to: "/analyst/product-match",
            title: "Auto product match",
            desc: "Turn search demand into suggested Rawabi products.",
          },
          {
            to: "/usergroups",
            title: "Audiences",
            desc: "User groups used for coupons and notification targeting.",
          },
        ].map((card) => (
          <section key={card.to} className="settings-section card">
            <div className="settings-section-head">
              <span className="settings-section-icon" aria-hidden>
                <Search size={18} />
              </span>
              <div>
                <h2>{card.title}</h2>
                <p>{card.desc}</p>
              </div>
            </div>
            <ul className="settings-link-list">
              <li>
                <Link to={card.to} className="settings-link-row">
                  <span>
                    <strong>Open workspace</strong>
                    <small>{card.desc}</small>
                  </span>
                  <ChevronRight size={16} aria-hidden />
                </Link>
              </li>
            </ul>
          </section>
        ))}
      </div>

      {data?.top_search_terms?.length ? (
        <section className="settings-section card">
          <div className="settings-section-head">
            <div>
              <h2>Top search demand</h2>
              <p>Live terms from ec_search_history across shoppers.</p>
            </div>
          </div>
          <ul className="settings-link-list">
            {data.top_search_terms.map((t) => (
              <li key={t.term}>
                <Link to={`/analyst/product-match?q=${encodeURIComponent(t.term)}`} className="settings-link-row">
                  <span>
                    <strong>{t.term}</strong>
                    <small>
                      {t.users} shoppers · {t.stores} stores
                    </small>
                  </span>
                  <ChevronRight size={16} aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </AnalystShell>
  );
}

export function AnalystCustomersPage() {
  const [searchParams] = useSearchParams();
  const [segment, setSegment] = useState(() => searchParams.get("segment") || "all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AnalystCustomerRow[]>([]);
  const [segments, setSegments] = useState<AnalystSegment[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const perPage = 15;

  useEffect(() => {
    const fromUrl = searchParams.get("segment");
    if (fromUrl && fromUrl !== segment) setSegment(fromUrl);
  }, [searchParams]);

  useEffect(() => {
    setBusy(true);
    setError("");
    void adminApi
      .analystCustomers({ segment, q: q.trim() || undefined, page, per_page: perPage })
      .then((res) => {
        setRows(res.items);
        setTotal(res.total);
        setSegments(res.segments);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setBusy(false));
  }, [segment, page]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    setBusy(true);
    void adminApi
      .analystCustomers({ segment, q: q.trim() || undefined, page: 1, per_page: perPage })
      .then((res) => {
        setRows(res.items);
        setTotal(res.total);
        setSegments(res.segments);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Search failed"))
      .finally(() => setBusy(false));
  }

  return (
    <AnalystShell
      crumbs={[{ label: "Customer analysis" }]}
      title="Customer analysis"
      subtitle="Segment shoppers by spend, repeat behavior, inactivity, and registration age."
      actions={
        <Link className="btn btn-secondary" to="/customers">
          Full customer list
        </Link>
      }
    >
      {error ? <div className="alert alert-error">{error}</div> : null}
      <div className="analyst-segment-row">
        {segments.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`analyst-segment-chip${segment === s.id ? " is-active" : ""}`}
            onClick={() => {
              setSegment(s.id);
              setPage(1);
            }}
            title={s.hint}
          >
            <strong>{s.label}</strong>
            <span>{s.count}</span>
          </button>
        ))}
      </div>
      <form className="mkt-seo-search card" onSubmit={onSearch}>
        <label className="field">
          <span>Search customers</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, phone…" />
        </label>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Loading…" : "Search"}
        </button>
      </form>
      <section className="settings-section card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Segment</th>
                <th>Orders</th>
                <th>LTV</th>
                <th>Last order</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.user_id}>
                  <td>
                    <strong>{row.name}</strong>
                    <div className="muted">{row.email || row.phone || `ID ${row.user_id}`}</div>
                  </td>
                  <td>{row.segment}</td>
                  <td>{row.order_count}</td>
                  <td>{money(row.lifetime_value)}</td>
                  <td>{row.last_order_at ? String(row.last_order_at).slice(0, 10) : "—"}</td>
                  <td>
                    <Link className="btn btn-secondary" to={`/customers/${row.user_id}`}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {!rows.length && !busy ? (
                <tr>
                  <td colSpan={6} className="muted">
                    No customers in this segment.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <ListPager page={page} perPage={perPage} total={total} busy={busy} onPageChange={setPage} />
      </section>
    </AnalystShell>
  );
}

export function AnalystSearchTrendsPage() {
  const [data, setData] = useState<AnalystSearchTrends | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void adminApi
      .analystSearchTrends({ limit: 50 })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  return (
    <AnalystShell
      crumbs={[{ label: "Customer analysis", to: "/analyst/customers" }, { label: "Search trends" }]}
      title="Search trends"
      subtitle="Aggregate customer search history and flag terms with no catalog match."
      actions={
        <Link className="btn btn-primary" to="/analyst/product-match">
          Run product match
        </Link>
      }
    >
      {error ? <div className="alert alert-error">{error}</div> : null}
      <div className="settings-overview-grid">
        <article className="settings-stat card">
          <span className="settings-stat-label">Terms</span>
          <strong>{data?.total ?? "—"}</strong>
        </article>
        <article className="settings-stat card warn">
          <span className="settings-stat-label">Catalog gaps</span>
          <strong>{data?.gaps ?? "—"}</strong>
        </article>
      </div>
      <section className="settings-section card">
        <TermMatchList items={data?.items ?? []} />
      </section>
    </AnalystShell>
  );
}

export function AnalystResearchPage() {
  const [data, setData] = useState<AnalystResearch | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [adhocUrl, setAdhocUrl] = useState("");
  const [lastRun, setLastRun] = useState<AnalystResearchRun | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  async function refresh() {
    const res = await adminApi.analystResearch();
    setData(res);
  }

  useEffect(() => {
    void refresh().catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  async function saveSource(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMsg("");
    try {
      await adminApi.analystSaveResearchSource({ name, url, notes, enabled: true });
      setName("");
      setUrl("");
      setNotes("");
      setMsg("Public research source saved.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function runSource(sourceId?: string, runUrl?: string) {
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const run = await adminApi.analystRunResearch({
        source_id: sourceId,
        url: runUrl,
      });
      setLastRun(run);
      setMsg(`Fetched ${run.candidates} candidates · ${run.matched} matched · ${run.gaps} gaps.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Research run failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnalystShell
      crumbs={[{ label: "Market research" }]}
      title="Market research"
      subtitle="Register public competitor or supplier pages, fetch visible product language, and map candidates to Rawabi SKUs. Private hosts and authenticated scrapes are blocked."
      actions={
        <Link className="btn btn-secondary" to="/analyst/product-match">
          Auto product match
        </Link>
      }
    >
      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}

      <form className="settings-form card" onSubmit={saveSource}>
        <div className="settings-form-grid">
          <label className="pf-field">
            <span className="pf-label">Source name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Competitor grocery feed" />
          </label>
          <label className="pf-field">
            <span className="pf-label">Public URL</span>
            <input value={url} onChange={(e) => setUrl(e.target.value)} required placeholder="https://…" />
          </label>
          <label className="pf-field pf-span-2">
            <span className="pf-label">Notes</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Why this source matters" />
          </label>
        </div>
        <div className="settings-form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            Save source
          </button>
        </div>
      </form>

      <section className="settings-section card">
        <div className="settings-section-head">
          <div>
            <h2>Saved sources</h2>
            <p>Only public http(s) pages. Localhost and private IPs are rejected.</p>
          </div>
        </div>
        <ul className="settings-link-list">
          {(data?.sources ?? []).map((s) => (
            <li key={s.id}>
              <div className="settings-link-row analyst-term-row">
                <span>
                  <strong>{s.name}</strong>
                  <small>{s.url}</small>
                </span>
                <div className="actions">
                  <a className="btn btn-secondary" href={s.url} target="_blank" rel="noreferrer">
                    <ExternalLink size={14} />
                    Open
                  </a>
                  <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void runSource(s.id)}>
                    Crawl & match
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={busy}
                    onClick={() =>
                      void adminApi
                        .analystDeleteResearchSource(s.id)
                        .then(refresh)
                        .catch((err) => setError(err instanceof Error ? err.message : "Delete failed"))
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
          {!data?.sources?.length ? <p className="muted mkt-seo-empty">No sources yet — add a public URL above.</p> : null}
        </ul>
      </section>

      <form
        className="mkt-seo-search card"
        onSubmit={(e) => {
          e.preventDefault();
          void runSource(undefined, adhocUrl.trim());
        }}
      >
        <label className="field">
          <span>One-off public URL</span>
          <input value={adhocUrl} onChange={(e) => setAdhocUrl(e.target.value)} placeholder="https://example.com/offers" />
        </label>
        <button type="submit" className="btn btn-primary" disabled={busy || !adhocUrl.trim()}>
          {busy ? "Fetching…" : "Crawl & match"}
        </button>
      </form>

      {lastRun ? (
        <section className="settings-section card">
          <div className="settings-section-head">
            <div>
              <h2>Latest run · {lastRun.source_name}</h2>
              <p>
                {lastRun.url} · {lastRun.fetched_at}
              </p>
            </div>
          </div>
          <TermMatchList items={lastRun.items} />
        </section>
      ) : null}
    </AnalystShell>
  );
}

export function AnalystProductMatchPage() {
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [items, setItems] = useState<AnalystTermMatch[]>([]);
  const [stats, setStats] = useState({ matched: 0, gaps: 0, total: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(query?: string) {
    setBusy(true);
    setError("");
    try {
      const res = await adminApi.analystProductMatch({
        q: query,
        limit: 8,
      });
      setItems(res.items);
      setStats({ matched: res.matched, gaps: res.gaps, total: res.total });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Match failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void run(q.trim() || undefined);
    // initial load only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AnalystShell
      crumbs={[{ label: "Market research", to: "/analyst/research" }, { label: "Auto product match" }]}
      title="Auto product match"
      subtitle="Match customer search demand (or any keyword) to live Rawabi SKUs. Gaps highlight assortment opportunities."
    >
      {error ? <div className="alert alert-error">{error}</div> : null}
      <form
        className="mkt-seo-search card"
        onSubmit={(e) => {
          e.preventDefault();
          void run(q.trim() || undefined);
        }}
      >
        <label className="field">
          <span>Keyword or leave blank for top search history</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="olive oil, basmati, diaper…" />
        </label>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Matching…" : "Match products"}
        </button>
      </form>
      <div className="settings-overview-grid">
        <article className="settings-stat card">
          <span className="settings-stat-label">Terms</span>
          <strong>{stats.total || "—"}</strong>
        </article>
        <article className="settings-stat card">
          <span className="settings-stat-label">Matched</span>
          <strong>{stats.matched || "—"}</strong>
        </article>
        <article className="settings-stat card warn">
          <span className="settings-stat-label">Gaps</span>
          <strong>{stats.gaps || "—"}</strong>
        </article>
      </div>
      <section className="settings-section card">
        <TermMatchList items={items} />
      </section>
    </AnalystShell>
  );
}

function metricLabel(v: number | string | null | undefined, fallback = "—") {
  if (v === null || v === undefined || v === "") return fallback;
  return String(v);
}

function StoreAnalyticsPage({ store }: { store: "apple" | "google" }) {
  const isApple = store === "apple";
  const location = useLocation();
  const fromMarketing = location.pathname.startsWith("/marketing/");
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "configure" ? "configure" : "analytics";
  const [payload, setPayload] = useState<AppStoreAnalyticsPayload | null>(null);
  const [form, setForm] = useState<AppStoreListing | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  function setTab(next: "analytics" | "configure") {
    const nextParams = new URLSearchParams(params);
    if (next === "analytics") nextParams.delete("tab");
    else nextParams.set("tab", next);
    setParams(nextParams, { replace: true });
  }

  async function load() {
    setError("");
    try {
      const data = await adminApi.analystAppStore(store);
      setPayload(data);
      setForm(data.listing);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load store analytics");
    }
  }

  useEffect(() => {
    void load();
  }, [store]);

  function patchListing<K extends keyof AppStoreListing>(key: K, value: AppStoreListing[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function patchMetric<K extends keyof AppStoreListing["metrics"]>(key: K, value: AppStoreListing["metrics"][K]) {
    setForm((prev) => (prev ? { ...prev, metrics: { ...prev.metrics, [key]: value } } : prev));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setMsg("");
    setError("");
    try {
      const body: Record<string, unknown> = {
        enabled: form.enabled,
        app_name: form.app_name,
        store_url: form.store_url,
        console_url: form.console_url,
        notes: form.notes,
        metrics: {
          rating: form.metrics.rating,
          rating_count: form.metrics.rating_count,
          version: form.metrics.version,
          downloads_label: form.metrics.downloads_label,
          reviews_30d: form.metrics.reviews_30d,
          crashes_30d: form.metrics.crashes_30d,
          impressions_30d: form.metrics.impressions_30d,
          conversion_rate: form.metrics.conversion_rate,
        },
      };
      if (isApple) {
        body.apple_id = form.apple_id;
        body.bundle_id = form.bundle_id;
        body.country = form.country;
      } else {
        body.package_name = form.package_name;
        body.legacy_package_name = form.legacy_package_name;
      }
      const saved = await adminApi.updateAnalystAppStore(store, body);
      setPayload(saved);
      setForm(saved.listing);
      setMsg("Store analytics saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function refreshListing() {
    setBusy(true);
    setMsg("");
    setError("");
    try {
      const saved = await adminApi.refreshAnalystAppStore(store);
      setPayload(saved);
      setForm(saved.listing);
      setMsg(isApple ? "Refreshed from App Store lookup." : "Refreshed from Play Store listing.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnalystShell
      crumbs={
        fromMarketing
          ? [
              { label: "Analytics", to: "/marketing/analytics" },
              { label: isApple ? "App Store" : "Play Store" },
            ]
          : [
              { label: "Store analytics", to: "/analyst/app-stores" },
              { label: isApple ? "App Store" : "Play Store" },
            ]
      }
      title={isApple ? "App Store analytics" : "Play Store analytics"}
      subtitle={
        isApple
          ? "Apple App Store listing metrics for Rawabi Shopping. Refresh pulls public rating and version via iTunes Lookup."
          : "Google Play listing metrics for Rawabi Shopping. Refresh pulls public rating when available; add Console KPIs manually."
      }
      actions={
        <div className="actions">
          {form?.store_url ? (
            <a className="btn btn-secondary" href={form.store_url} target="_blank" rel="noreferrer">
              Open listing <ExternalLink size={14} aria-hidden />
            </a>
          ) : null}
          {form?.console_url ? (
            <a className="btn btn-secondary" href={form.console_url} target="_blank" rel="noreferrer">
              Open console <ExternalLink size={14} aria-hidden />
            </a>
          ) : null}
          {tab === "analytics" ? (
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void refreshListing()}>
              {busy ? "Refreshing…" : isApple ? "Refresh from Apple" : "Refresh from Play"}
            </button>
          ) : null}
        </div>
      }
    >
      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="banner ok">{msg}</div> : null}

      <div className="tabs settings-category-tabs" role="tablist" aria-label="Page view">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "analytics"}
          className={tab === "analytics" ? "active" : ""}
          onClick={() => setTab("analytics")}
        >
          Analytics
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "configure"}
          className={tab === "configure" ? "active" : ""}
          onClick={() => setTab("configure")}
        >
          Configure
        </button>
      </div>

      {!form ? (
        <LoadingCard label="Loading store analytics" />
      ) : tab === "analytics" ? (
        <>
          <div className="settings-overview-grid">
            <article className="settings-stat card">
              <span className="settings-stat-label">Rating</span>
              <strong>{metricLabel(form.metrics.rating)}</strong>
              <small>{form.metrics.rating_count != null ? `${form.metrics.rating_count.toLocaleString()} ratings` : ""}</small>
            </article>
            <article className="settings-stat card">
              <span className="settings-stat-label">Version</span>
              <strong>{metricLabel(form.metrics.version)}</strong>
            </article>
            <article className="settings-stat card">
              <span className="settings-stat-label">Downloads</span>
              <strong>{metricLabel(form.metrics.downloads_label)}</strong>
            </article>
            <article className="settings-stat card">
              <span className="settings-stat-label">Conv. rate</span>
              <strong>
                {form.metrics.conversion_rate != null ? `${form.metrics.conversion_rate}%` : "—"}
              </strong>
              <small>
                {form.metrics.last_refreshed_at
                  ? `Updated ${new Date(form.metrics.last_refreshed_at).toLocaleString()}`
                  : payload?.updated_at
                    ? `Saved ${new Date(payload.updated_at).toLocaleString()}`
                    : ""}
              </small>
            </article>
            <article className="settings-stat card">
              <span className="settings-stat-label">Reviews (30d)</span>
              <strong>{metricLabel(form.metrics.reviews_30d)}</strong>
            </article>
            <article className="settings-stat card">
              <span className="settings-stat-label">Crashes (30d)</span>
              <strong>{metricLabel(form.metrics.crashes_30d)}</strong>
            </article>
            <article className="settings-stat card">
              <span className="settings-stat-label">Impressions (30d)</span>
              <strong>{metricLabel(form.metrics.impressions_30d)}</strong>
            </article>
            <article className={`settings-stat card ${form.enabled ? "" : "warn"}`}>
              <span className="settings-stat-label">Tracking</span>
              <strong>{form.enabled ? "On" : "Off"}</strong>
              <small>{isApple ? form.apple_id : form.package_name}</small>
            </article>
          </div>
          <div className="card" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-secondary" onClick={() => setTab("configure")}>
              Configure listing
            </button>
          </div>
        </>
      ) : (
        <form className="settings-form card" onSubmit={onSubmit}>
          <fieldset className="settings-fieldset">
            <legend>Listing</legend>
            <div className="settings-toggle-list">
              <SettingsToggle
                label="Track this store"
                hint="When off, the listing stays hidden from analyst overview cards."
                checked={form.enabled}
                onChange={(v) => patchListing("enabled", v)}
              />
            </div>
            <div className="settings-fields">
              <label className="pf-field">
                <span className="pf-label">App name</span>
                <input value={form.app_name} onChange={(e) => patchListing("app_name", e.target.value)} />
              </label>
              {isApple ? (
                <>
                  <label className="pf-field">
                    <span className="pf-label">Apple ID</span>
                    <input value={form.apple_id || ""} onChange={(e) => patchListing("apple_id", e.target.value)} />
                  </label>
                  <label className="pf-field">
                    <span className="pf-label">Bundle ID</span>
                    <input value={form.bundle_id || ""} onChange={(e) => patchListing("bundle_id", e.target.value)} />
                  </label>
                  <label className="pf-field">
                    <span className="pf-label">Store country</span>
                    <input value={form.country || "qa"} onChange={(e) => patchListing("country", e.target.value)} />
                  </label>
                </>
              ) : (
                <>
                  <label className="pf-field">
                    <span className="pf-label">Package name</span>
                    <input
                      value={form.package_name || ""}
                      onChange={(e) => patchListing("package_name", e.target.value)}
                    />
                  </label>
                  <label className="pf-field">
                    <span className="pf-label">Legacy package</span>
                    <input
                      value={form.legacy_package_name || ""}
                      onChange={(e) => patchListing("legacy_package_name", e.target.value)}
                    />
                  </label>
                </>
              )}
              <label className="pf-field pf-span-2">
                <span className="pf-label">Store URL</span>
                <input value={form.store_url} onChange={(e) => patchListing("store_url", e.target.value)} />
              </label>
              <label className="pf-field pf-span-2">
                <span className="pf-label">Console URL</span>
                <input value={form.console_url} onChange={(e) => patchListing("console_url", e.target.value)} />
              </label>
              <label className="pf-field pf-span-2">
                <span className="pf-label">Notes</span>
                <textarea rows={2} value={form.notes} onChange={(e) => patchListing("notes", e.target.value)} />
              </label>
            </div>
          </fieldset>

          <fieldset className="settings-fieldset">
            <legend>KPIs</legend>
            <div className="settings-fields">
              <label className="pf-field">
                <span className="pf-label">Rating</span>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  max={5}
                  value={form.metrics.rating ?? ""}
                  onChange={(e) =>
                    patchMetric("rating", e.target.value === "" ? null : Number(e.target.value))
                  }
                />
              </label>
              <label className="pf-field">
                <span className="pf-label">Rating count</span>
                <input
                  type="number"
                  min={0}
                  value={form.metrics.rating_count ?? ""}
                  onChange={(e) =>
                    patchMetric("rating_count", e.target.value === "" ? null : Number(e.target.value))
                  }
                />
              </label>
              <label className="pf-field">
                <span className="pf-label">Version</span>
                <input value={form.metrics.version} onChange={(e) => patchMetric("version", e.target.value)} />
              </label>
              <label className="pf-field">
                <span className="pf-label">Downloads label</span>
                <input
                  value={form.metrics.downloads_label}
                  onChange={(e) => patchMetric("downloads_label", e.target.value)}
                  placeholder="e.g. 10K+"
                />
              </label>
              <label className="pf-field">
                <span className="pf-label">Reviews (30d)</span>
                <input
                  type="number"
                  min={0}
                  value={form.metrics.reviews_30d ?? ""}
                  onChange={(e) =>
                    patchMetric("reviews_30d", e.target.value === "" ? null : Number(e.target.value))
                  }
                />
              </label>
              <label className="pf-field">
                <span className="pf-label">Crashes (30d)</span>
                <input
                  type="number"
                  min={0}
                  value={form.metrics.crashes_30d ?? ""}
                  onChange={(e) =>
                    patchMetric("crashes_30d", e.target.value === "" ? null : Number(e.target.value))
                  }
                />
              </label>
              <label className="pf-field">
                <span className="pf-label">Impressions (30d)</span>
                <input
                  type="number"
                  min={0}
                  value={form.metrics.impressions_30d ?? ""}
                  onChange={(e) =>
                    patchMetric("impressions_30d", e.target.value === "" ? null : Number(e.target.value))
                  }
                />
              </label>
              <label className="pf-field">
                <span className="pf-label">Conversion rate %</span>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={form.metrics.conversion_rate ?? ""}
                  onChange={(e) =>
                    patchMetric("conversion_rate", e.target.value === "" ? null : Number(e.target.value))
                  }
                />
              </label>
            </div>
          </fieldset>

          <div className="settings-form-actions">
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void load()}>
              Reset
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Saving…" : "Save analytics"}
            </button>
          </div>
        </form>
      )}
    </AnalystShell>
  );
}


export function AnalystAppStorePage() {
  return <StoreAnalyticsPage store="apple" />;
}

export function AnalystPlayStorePage() {
  return <StoreAnalyticsPage store="google" />;
}
