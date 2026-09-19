import { Fragment, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { RotateCcw, Search, X } from "../lib/icons";
import { adminApi } from "../lib/api";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { wishlistDetailHref } from "./WishlistDetailPage";

type WishGroup = Awaited<ReturnType<typeof adminApi.wishlists>>["items"][number];
type WishProduct = WishGroup["products"][number];

const TYPES = [
  { value: "all", label: "All" },
  { value: "registered", label: "Registered" },
  { value: "guest", label: "Guest" },
];

const PREVIEW_COUNT = 3;

function WishItemsList({
  rowKey,
  products,
  itemsText,
  busy,
  expanded,
  onToggle,
  onRemove,
}: {
  rowKey: string;
  products: WishProduct[];
  itemsText: string;
  busy: boolean;
  expanded: boolean;
  onToggle: (key: string) => void;
  onRemove: (product: WishProduct) => void;
}) {
  if (!products.length) return <span className="muted">—</span>;

  const overflow = products.length > PREVIEW_COUNT;
  const visible = expanded || !overflow ? products : products.slice(0, PREVIEW_COUNT);
  const hidden = Math.max(0, products.length - PREVIEW_COUNT);

  return (
    <div className="wishlist-comma-list" title={itemsText}>
      {visible.map((p, idx) => (
        <Fragment key={p.wish_id}>
          {idx > 0 ? <span className="wishlist-comma">, </span> : null}
          <span className="wishlist-item-token">
            <Link className="wishlist-item-link" to={`/products/${p.product_id}/edit`}>
              {p.product_name || `Product #${p.product_id}`}
            </Link>
            <button
              type="button"
              className="wishlist-item-remove"
              disabled={busy}
              title={`Remove ${p.product_name || p.sku || p.product_id}`}
              aria-label={`Remove ${p.product_name || p.product_id}`}
              onClick={() => onRemove(p)}
            >
              <X size={11} aria-hidden />
            </button>
          </span>
        </Fragment>
      ))}
      {overflow ? (
        <>
          {!expanded ? <span className="wishlist-comma">, </span> : null}
          <button
            type="button"
            className="wishlist-show-all"
            aria-expanded={expanded}
            onClick={() => onToggle(rowKey)}
          >
            {expanded ? "Show less" : `Show all (+${hidden})`}
          </button>
        </>
      ) : null}
    </div>
  );
}

export function WishlistPage() {
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [page, setPage] = useState(1);
  const [perPage] = useState(25);
  const [items, setItems] = useState<WishGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof adminApi.wishlistStats>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

  const pages = useMemo(() => Math.max(1, Math.ceil(total / perPage)), [total, perPage]);

  async function load() {
    setBusy(true);
    setError("");
    try {
      const [list, st] = await Promise.all([
        adminApi.wishlists({
          page,
          per_page: perPage,
          q: q.trim() || undefined,
          type: type !== "all" ? type : undefined,
        }),
        adminApi.wishlistStats({
          q: q.trim() || undefined,
          type: type !== "all" ? type : undefined,
        }),
      ]);
      setItems(list.items);
      setTotal(list.total);
      setStats(st);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load wishlist");
      setItems([]);
      setTotal(0);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, type]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    void load();
  }

  async function onRemoveProduct(product: WishProduct) {
    if (!window.confirm(`Remove “${product.product_name || `Product #${product.product_id}`}” from wishlist?`)) {
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      await adminApi.deleteWishlist(product.wish_id);
      setMsg("Removed from wishlist.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  }

  function toggleExpanded(key: string) {
    setExpandedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="page wishlist-page">
      <header className="page-head">
        <div>
          <p className="settings-crumb">Orders · Wishlist</p>
          <h1 className="page-title">Wishlist</h1>
          <p className="page-sub">Saved items grouped by customer — products listed comma-separated.</p>
        </div>
        <div className="page-head-actions">
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void load()}>
            <RotateCcw size={14} aria-hidden /> Refresh
          </button>
        </div>
      </header>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}

      <div className="settings-overview-grid">
        <article className="settings-stat card">
          <span className="settings-stat-label">Saved items</span>
          <strong>{stats?.total ?? "—"}</strong>
        </article>
        <article className="settings-stat card">
          <span className="settings-stat-label">Customers</span>
          <strong>{stats?.customers ?? "—"}</strong>
        </article>
        <article className="settings-stat card">
          <span className="settings-stat-label">Guests</span>
          <strong>{stats?.guests ?? "—"}</strong>
        </article>
        <article className="settings-stat card">
          <span className="settings-stat-label">Products</span>
          <strong>{stats?.products ?? "—"}</strong>
        </article>
      </div>

      <div className="card">
        <form className="panel-toolbar brand-toolbar" onSubmit={onSearch}>
          <div className="brand-search-wrap">
            <Search size={14} aria-hidden />
            <input
              className="brand-search"
              value={q}
              placeholder="Search customer, phone, SKU, product…"
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="brand-toolbar-end">
            <div className="brand-status-tabs" role="tablist">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={`brand-status-tab${type === t.value ? " active" : ""}`}
                  onClick={() => {
                    setType(t.value);
                    setPage(1);
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button type="submit" className="btn btn-secondary btn-sm" disabled={busy}>
              Search
            </button>
          </div>
        </form>

        <p className="muted brand-hint">
          {total} wishlist{total === 1 ? "" : "s"} · {stats?.total ?? 0} saved item
          {(stats?.total ?? 0) === 1 ? "" : "s"} · page {page}/{pages}
        </p>

        <div className="table-wrap">
          <table className="data brand-table wishlist-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Type</th>
                <th>Items</th>
                <th className="wishlist-count-col">Count</th>
                <th className="brand-actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.key}>
                  <td>
                    <Link className="brand-name-link" to={wishlistDetailHref(row.user_id, row.guest_id)}>
                      {row.customer_name}
                      {row.customer_deleted ? " (deleted)" : ""}
                    </Link>
                    {row.phone ? <div className="muted">{row.phone}</div> : null}
                  </td>
                  <td>
                    <span
                      className={`status-pill ${
                        row.customer_type === "registered" ? "is-on" : "is-off"
                      }`}
                    >
                      {row.customer_type === "registered"
                        ? row.customer_deleted
                          ? "Deleted"
                          : "Registered"
                        : row.customer_type === "guest"
                          ? "Guest"
                          : "Other"}
                    </span>
                  </td>
                  <td className="wishlist-items-cell">
                    <WishItemsList
                      rowKey={row.key}
                      products={row.products}
                      itemsText={row.items_text}
                      busy={busy}
                      expanded={Boolean(expandedKeys[row.key])}
                      onToggle={toggleExpanded}
                      onRemove={(p) => void onRemoveProduct(p)}
                    />
                  </td>
                  <td className="wishlist-count-col">{row.item_count}</td>
                  <td className="brand-actions-col">
                    <Link className="btn btn-secondary btn-sm" to={wishlistDetailHref(row.user_id, row.guest_id)}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {!items.length && !busy ? (
                <tr>
                  <td colSpan={5} className="muted">
                    No wishlist items found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {busy && !items.length ? <LoadingIndicator label="Loading wishlist…" /> : null}

        {pages > 1 ? (
          <div className="pager" style={{ display: "flex", gap: 8, justifyContent: "flex-end", padding: 12 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={busy || page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={busy || page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
