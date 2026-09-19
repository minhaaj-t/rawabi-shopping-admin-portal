import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Download, Filter, RotateCcw, Search, X } from "../lib/icons";
import { adminApi } from "../lib/api";
import { getUser, isStorePortal } from "../lib/auth";
import { LoadingIndicator } from "../components/LoadingIndicator";

const CART_TYPES = [
  { value: "registered", label: "Registered" },
  { value: "guest", label: "Guest" },
  { value: "all", label: "All" },
];

function defaultRange() {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth() - 1, 1);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(start), to: iso(end) };
}

function formatMoney(v: unknown) {
  return `QAR ${Number(v ?? 0).toFixed(2)}`;
}

function parseTarget(key: string) {
  const [userId, guestId] = key.split(":").map(Number);
  return { user_id: userId, guest_id: guestId || 0 };
}

export function CartsPage() {
  const user = getUser();
  const storePortal = isStorePortal(user);
  const [searchParams] = useSearchParams();
  const defaults = useMemo(() => defaultRange(), []);

  const [q, setQ] = useState(() => searchParams.get("q") || "");
  const [sku, setSku] = useState("");
  const [cartType, setCartType] = useState("all");
  const [storeId, setStoreId] = useState("");
  const [minTotal, setMinTotal] = useState("");
  const [minItems, setMinItems] = useState("");
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);
  const [stores, setStores] = useState<Array<{ ec_store_id: number; ec_store_name: string }>>([]);
  const [data, setData] = useState<Awaited<ReturnType<typeof adminApi.carts>> | null>(null);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof adminApi.cartStats>> | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [notifyKey, setNotifyKey] = useState<string | null>(null);
  const [notifyTitle, setNotifyTitle] = useState("Cart reminder");
  const [notifyMessage, setNotifyMessage] = useState("You left items in your cart. Complete your order now.");
  const filterRef = useRef<HTMLDivElement>(null);

  const filterParams = useMemo(
    () => ({
      q: q || undefined,
      sku: sku || undefined,
      cart_type: cartType || undefined,
      store_id: storeId || undefined,
      min_total: minTotal || undefined,
      min_items: minItems || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    }),
    [q, sku, cartType, storeId, minTotal, minItems, dateFrom, dateTo],
  );

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (cartType !== "all") n += 1;
    if (storeId) n += 1;
    if (sku) n += 1;
    if (minTotal) n += 1;
    if (minItems) n += 1;
    if (dateFrom !== defaults.from || dateTo !== defaults.to) n += 1;
    if (perPage !== 25) n += 1;
    return n;
  }, [cartType, storeId, sku, minTotal, minItems, dateFrom, dateTo, defaults, perPage]);

  const typeChips = useMemo(
    () => [
      { value: "", label: "All carts", count: stats?.total ?? 0 },
      { value: "registered", label: "Registered", count: stats?.registered ?? 0 },
      { value: "guest", label: "Guest", count: stats?.guest ?? 0 },
    ],
    [stats],
  );

  const allSelected = Boolean(data?.items.length) && data!.items.every((o) => selected.includes(String(o.cart_key)));

  function resetFilters() {
    const r = defaultRange();
    setCartType("all");
    setStoreId("");
    setSku("");
    setMinTotal("");
    setMinItems("");
    setDateFrom(r.from);
    setDateTo(r.to);
    setPerPage(25);
    setPage(1);
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [list, summary] = await Promise.all([
        adminApi.carts({ ...filterParams, page, per_page: perPage }),
        adminApi.cartStats(filterParams),
      ]);
      setData(list);
      setStats(summary);
      setSelected([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load carts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!storePortal) {
      adminApi.stores().then(setStores).catch(() => undefined);
    }
  }, [storePortal]);

  useEffect(() => {
    void load();
  }, [filterParams, page, perPage]);

  useEffect(() => {
    if (!filtersOpen) return;
    function onDoc(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFiltersOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFiltersOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [filtersOpen]);

  async function exportCsv() {
    try {
      const res = await adminApi.carts({ ...filterParams, page: 1, per_page: 100 });
      const allItems = [...res.items];
      const pages = Math.ceil(res.total / 100);
      for (let p = 2; p <= pages && p <= 20; p += 1) {
        const next = await adminApi.carts({ ...filterParams, page: p, per_page: 100 });
        allItems.push(...next.items);
      }
      const header = ["Type", "User ID", "Guest ID", "Name", "Phone", "Email", "Items", "Total", "Store", "Last activity"];
      const lines = allItems.map((o) =>
        [
          o.cart_type,
          o.cart_user_id,
          o.cart_guest_id,
          o.username,
          o.phone,
          o.email,
          o.item_count,
          o.total,
          o.ec_store_name,
          o.last_at,
        ]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(","),
      );
      const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `abandoned-carts-${dateFrom}-${dateTo}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg(`Exported ${allItems.length} carts.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    }
  }

  function toggleAll() {
    if (!data?.items.length) return;
    if (allSelected) {
      setSelected([]);
      return;
    }
    setSelected(data.items.map((o) => String(o.cart_key)));
  }

  function toggleOne(key: string) {
    setSelected((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  }

  async function sendNotify(key: string) {
    const target = parseTarget(key);
    if (target.user_id <= 0) {
      setError("In-app notifications are only available for registered customers");
      return;
    }
    setError("");
    setMsg("");
    try {
      await adminApi.cartNotify(target.user_id, {
        guest_id: target.guest_id,
        title: notifyTitle,
        message: notifyMessage,
      });
      setMsg("Notification sent.");
      setNotifyKey(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Notification failed");
    }
  }

  async function bulkAction(action: "notify" | "clear") {
    if (!selected.length) {
      setError("Select carts first");
      return;
    }
    if (action === "clear") {
      const ok = window.confirm(`Clear ${selected.length} abandoned cart(s)?`);
      if (!ok) return;
    }
    setBulkBusy(true);
    setError("");
    setMsg("");
    try {
      const res = await adminApi.bulkCarts({
        action,
        targets: selected.map(parseTarget),
        title: notifyTitle,
        message: notifyMessage,
      });
      const done = action === "notify" ? res.notified : res.cleared;
      setMsg(`${done} cart(s) ${action === "notify" ? "notified" : "cleared"}.`);
      if (res.errors.length) {
        setError(res.errors.map((e) => `${e.key}: ${e.message}`).join(" · "));
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk action failed");
    } finally {
      setBulkBusy(false);
    }
  }

  function cartDetailPath(row: Record<string, unknown>) {
    const userId = Number(row.cart_user_id);
    const guestId = Number(row.cart_guest_id);
    return guestId ? `/carts/${userId}?guest_id=${guestId}` : `/carts/${userId}`;
  }

  return (
    <div className="orders-page">
      <div className="page-head">
        <div>
          <h1>Abandoned Carts</h1>
          <p className="page-sub">
            {stats?.total ?? data?.total ?? 0} carts
            {stats ? ` · ${formatMoney(stats.total_value)} total value · ${stats.total_items} items` : ""}
          </p>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-secondary" onClick={() => void load()} disabled={loading}>
            Refresh
          </button>
          <button type="button" className="btn" onClick={() => void exportCsv()}>
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}

      {stats ? (
        <div className="orders-status-bar">
          {typeChips.map((chip) => (
            <button
              key={chip.value || "all"}
              type="button"
              className={`orders-status-chip${(chip.value === "" ? cartType === "all" : cartType === chip.value) ? " is-active" : ""}`}
              onClick={() => {
                setPage(1);
                setCartType(chip.value || "all");
              }}
            >
              <span>{chip.label}</span>
              <strong>{chip.count}</strong>
            </button>
          ))}
          <span className="orders-stat-inline muted">Avg {formatMoney(stats.avg_value)}</span>
        </div>
      ) : null}

      <div className="card orders-toolbar">
        <div className="orders-search-wrap">
          <Search size={16} aria-hidden className="orders-search-icon" />
          <input
            className="orders-search"
            placeholder="Search name, phone, email, user id…"
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
          />
        </div>
        <div className="filter-menu" ref={filterRef}>
          <button
            type="button"
            className={`btn btn-secondary${filtersOpen || activeFilterCount ? " is-active" : ""}`}
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((o) => !o)}
          >
            <Filter size={14} />
            Filters
            {activeFilterCount ? <span className="filter-badge">{activeFilterCount}</span> : null}
          </button>
          {filtersOpen ? (
            <div className="filter-popover orders-filter-popover" role="dialog" aria-label="Cart filters">
              <div className="filter-popover-head">
                <strong>Filter abandoned carts</strong>
                <button type="button" className="btn btn-secondary" style={{ padding: "2px 8px" }} onClick={() => setFiltersOpen(false)}>
                  <X size={14} />
                </button>
              </div>
              <div className="filter-grid" style={{ marginBottom: 0 }}>
                <label>
                  Start date
                  <input type="date" value={dateFrom} onChange={(e) => { setPage(1); setDateFrom(e.target.value); }} />
                </label>
                <label>
                  End date
                  <input type="date" value={dateTo} onChange={(e) => { setPage(1); setDateTo(e.target.value); }} />
                </label>
                <label>
                  Cart type
                  <select value={cartType} onChange={(e) => { setPage(1); setCartType(e.target.value); }}>
                    {CART_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  SKU contains
                  <input value={sku} placeholder="Product SKU" onChange={(e) => { setPage(1); setSku(e.target.value); }} />
                </label>
                {!storePortal ? (
                  <label>
                    Store
                    <select value={storeId} onChange={(e) => { setPage(1); setStoreId(e.target.value); }}>
                      <option value="">All</option>
                      {stores.map((s) => (
                        <option key={s.ec_store_id} value={s.ec_store_id}>{s.ec_store_name}</option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <label>
                  Min total (QAR)
                  <input type="number" min="0" step="0.01" value={minTotal} onChange={(e) => { setPage(1); setMinTotal(e.target.value); }} />
                </label>
                <label>
                  Min items
                  <input type="number" min="1" step="1" value={minItems} onChange={(e) => { setPage(1); setMinItems(e.target.value); }} />
                </label>
                <label>
                  Per page
                  <select value={perPage} onChange={(e) => { setPage(1); setPerPage(Number(e.target.value)); }}>
                    {[10, 25, 50, 100].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="filter-popover-foot">
                <button type="button" className="btn btn-secondary" onClick={resetFilters}>
                  <RotateCcw size={12} />
                  Reset
                </button>
                <button type="button" className="btn btn-primary" onClick={() => setFiltersOpen(false)}>
                  Done
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {selected.length ? (
        <div className="card orders-bulk-bar">
          <span>{selected.length} selected</span>
          <button type="button" className="btn btn-green" disabled={bulkBusy} onClick={() => void bulkAction("notify")}>
            {bulkBusy ? "Working…" : "Send reminders"}
          </button>
          <button type="button" className="btn btn-secondary" disabled={bulkBusy} onClick={() => void bulkAction("clear")}>
            Clear selected
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setSelected([])}>
            Clear selection
          </button>
        </div>
      ) : null}

      <div className="card">
        {loading && !data ? (
          <LoadingIndicator label="Loading abandoned carts" padded />
        ) : (
          <>
            <div className="table-wrap">
              <table className="data orders-table">
                <thead>
                  <tr>
                    <th className="orders-check-col">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" />
                    </th>
                    <th>Customer</th>
                    <th>Type</th>
                    <th className="orders-amount-col">Items</th>
                    <th className="orders-amount-col">Total</th>
                    <th>Store</th>
                    <th>Last activity</th>
                    <th className="orders-actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.items ?? []).map((row) => {
                    const key = String(row.cart_key);
                    const userId = Number(row.cart_user_id);
                    const isRegistered = userId > 0;
                    return (
                      <tr key={key} className={selected.includes(key) ? "is-selected" : ""}>
                        <td>
                          <input type="checkbox" checked={selected.includes(key)} onChange={() => toggleOne(key)} />
                        </td>
                        <td className="wrap">
                          <strong>{String(row.username ?? "-")}</strong>
                          <div className="muted">
                            {isRegistered ? `#${userId}` : `Guest ${String(row.cart_guest_id)}`}
                            {row.phone ? ` · ${String(row.phone)}` : ""}
                          </div>
                          {row.email ? <div className="muted">{String(row.email)}</div> : null}
                        </td>
                        <td>{String(row.cart_type)}</td>
                        <td className="orders-amount-col">{String(row.item_count)}</td>
                        <td className="nowrap orders-amount-col">{formatMoney(row.total)}</td>
                        <td className="wrap">{String(row.ec_store_name ?? row.cart_store_id ?? "-")}</td>
                        <td className="nowrap">{String(row.last_at ?? "").slice(0, 16).replace("T", " ")}</td>
                        <td className="orders-actions-cell">
                          <div className="orders-row-actions">
                            <Link className="btn btn-secondary btn-sm" to={cartDetailPath(row)}>
                              Manage
                            </Link>
                            {isRegistered ? (
                              <button type="button" className="btn btn-green btn-sm" onClick={() => setNotifyKey(key)}>
                                Notify
                              </button>
                            ) : null}
                            {isRegistered ? (
                              <Link className="btn btn-secondary btn-sm" to={`/customers/${userId}`}>
                                Customer
                              </Link>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {data && data.items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="muted">
                        No abandoned carts match your filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              <span>
                Page {data?.page ?? 1} · {data?.total ?? 0} total
              </span>
              <div className="actions">
                <button type="button" className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Prev
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={!data || data.page * data.per_page >= data.total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {notifyKey ? (
        <div className="modal-backdrop" onClick={() => setNotifyKey(null)}>
          <div className="modal-card cart-notify-modal" onClick={(e) => e.stopPropagation()}>
            <div className="page-head">
              <h2>Send cart reminder</h2>
              <button type="button" className="btn btn-secondary" onClick={() => setNotifyKey(null)}>
                Close
              </button>
            </div>
            <label className="field">
              Title
              <input value={notifyTitle} onChange={(e) => setNotifyTitle(e.target.value)} />
            </label>
            <label className="field">
              Message
              <textarea rows={4} value={notifyMessage} onChange={(e) => setNotifyMessage(e.target.value)} />
            </label>
            <button type="button" className="btn btn-green" onClick={() => void sendNotify(notifyKey)}>
              Send notification
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
