import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Plus, RotateCcw, Search, Trash2 } from "../lib/icons";
import { adminApi } from "../lib/api";
import { config } from "../lib/config";
import { useOpenAddQuery } from "../lib/useOpenAddQuery";
import { LoadingIndicator } from "../components/LoadingIndicator";

export type NewsRow = {
  nw_id: number;
  nw_title?: string;
  nw_short?: string;
  nw_news_date?: string;
  nw_status?: number;
  nw_featuredimg?: string;
  title?: string;
  title_ar?: string;
  short?: string;
  slug?: string;
  author?: string;
  category?: string;
  tags?: string;
  featured_image?: string;
  featured_image_url?: string;
  status_label?: string;
};

function mediaUrl(url?: string, filename?: string): string {
  const raw = (url || filename || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return `${config.apiUrl}${raw}`;
  return `${config.apiUrl}/uploads/news/${raw}`;
}

function formatDate(value?: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export function NewsManagePage() {
  const [items, setItems] = useState<NewsRow[]>([]);
  const [stats, setStats] = useState({ total: 0, published: 0, drafts: 0 });
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "published" | "draft">("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    setBusy(true);
    setError("");
    try {
      const res = await adminApi.news({
        per_page: 50,
        q: q.trim() || undefined,
        status: status === "all" ? undefined : status,
      });
      setItems(res.items as NewsRow[]);
      setTotal(res.total);
      if (res.stats) setStats(res.stats);
      else {
        setStats({
          total: res.total,
          published: (res.items as NewsRow[]).filter((r) => Number(r.nw_status) === 1).length,
          drafts: (res.items as NewsRow[]).filter((r) => Number(r.nw_status) !== 1).length,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load news");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useOpenAddQuery(() => {
    window.location.assign("/news/new");
  });

  const filteredHint = useMemo(() => {
    if (status === "all" && !q.trim()) return `${total} posts`;
    return `${items.length} shown · ${total} match`;
  }, [items.length, total, status, q]);

  async function onToggle(row: NewsRow) {
    const next = Number(row.nw_status) === 1 ? 0 : 1;
    await adminApi.updateNewsStatus(row.nw_id, next);
    setMsg(next === 1 ? "Post published." : "Post moved to draft.");
    await load();
  }

  async function onDelete(id: number) {
    if (!window.confirm("Move this post to trash?")) return;
    await adminApi.deleteNews(id);
    setMsg("Post deleted.");
    await load();
  }

  return (
    <div className="page news-page">
      <header className="page-head">
        <div>
          <p className="settings-crumb">Content · Editorial</p>
          <h1 className="page-title">News</h1>
          <p className="page-sub">WordPress-style posts for the storefront — drafts, publish, featured image, SEO.</p>
        </div>
        <div className="page-head-actions">
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void load()}>
            <RotateCcw size={15} aria-hidden />
            Refresh
          </button>
          <Link className="btn btn-primary" to="/news/new">
            <Plus size={16} aria-hidden />
            Add News
          </Link>
        </div>
      </header>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}

      <div className="card-grid news-stats">
        <div className="card stat-card">
          <h3>All</h3>
          <strong>{stats.total}</strong>
        </div>
        <div className="card stat-card">
          <h3>Published</h3>
          <strong>{stats.published}</strong>
        </div>
        <div className="card stat-card">
          <h3>Drafts</h3>
          <strong>{stats.drafts}</strong>
        </div>
        <div className="card stat-card">
          <h3>Showing</h3>
          <strong>{items.length}</strong>
        </div>
      </div>

      <div className="card news-list-card">
        <div className="panel-toolbar">
          <div className="news-status-tabs" role="tablist">
            {(
              [
                ["all", "All"],
                ["published", "Published"],
                ["draft", "Drafts"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                className={status === value ? "is-active" : ""}
                onClick={() => setStatus(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="uiux-search">
            <Search size={15} aria-hidden />
            <input
              value={q}
              placeholder="Search title, slug, tags…"
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void load();
              }}
            />
          </div>
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void load()}>
            Search
          </button>
          <span className="muted small">{filteredHint}</span>
        </div>

        {busy && !items.length ? (
          <LoadingIndicator label="Loading news" />
        ) : (
          <div className="table-wrap">
            <table className="data news-table">
              <thead>
                <tr>
                  <th className="news-col-thumb">Image</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Author</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const thumb = mediaUrl(row.featured_image_url, row.featured_image || row.nw_featuredimg);
                  const published = Number(row.nw_status) === 1;
                  return (
                    <tr key={row.nw_id}>
                      <td className="news-thumb-cell">
                        {thumb ? (
                          <img src={thumb} alt="" className="news-thumb" />
                        ) : (
                          <span className="news-thumb-empty">No image</span>
                        )}
                      </td>
                      <td>
                        <Link className="news-title-link" to={`/news/${row.nw_id}/edit`}>
                          <strong>{row.title || `Post #${row.nw_id}`}</strong>
                        </Link>
                        {row.title_ar ? <div className="muted small" dir="rtl">{row.title_ar}</div> : null}
                        {row.slug ? <div className="muted small mono">/{row.slug}</div> : null}
                      </td>
                      <td>{row.category || "—"}</td>
                      <td>{row.author || "—"}</td>
                      <td className="muted small">{formatDate(row.nw_news_date)}</td>
                      <td>
                        <span className={`status-pill ${published ? "on" : "off"}`}>
                          {published ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td>
                        <div className="news-row-actions">
                          <Link className="btn btn-secondary btn-sm" to={`/news/${row.nw_id}/edit`}>
                            Edit
                          </Link>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void onToggle(row)}>
                            {published ? "Unpublish" : "Publish"}
                          </button>
                          <a
                            className="btn btn-secondary btn-sm"
                            href={`${config.frontstoreUrl}/news-events/${row.slug || row.nw_id}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Preview on storefront"
                          >
                            <Eye size={14} aria-hidden />
                          </a>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void onDelete(row.nw_id)}>
                            <Trash2 size={14} aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!items.length ? (
                  <tr>
                    <td colSpan={7} className="muted">
                      No news posts yet.{" "}
                      <Link to="/news/new">Create your first post</Link>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export { NewsManagePage as NewsPage };
