import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Filter, RotateCcw, Search, X } from "../lib/icons";
import { adminApi } from "../lib/api";
import { getUser, isStorePortal } from "../lib/auth";
import { StatusBadge } from "../components/StatusBadge";
import { LoadingIndicator } from "../components/LoadingIndicator";

const FILTER_STATUSES = ["", "Processing", "Pre-Order", "Converted", "Cancelled"];
const CONVERTIBLE = new Set(["Processing", "Pre-Order", "Pre Order"]);
const PAYMENTS = ["", "COD", "cod", "Online", "online", "ccod", "CCOD"];

function defaultRange() {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth() - 1, 1);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(start), to: iso(end) };
}

function formatMoney(v: unknown) {
  return `QAR ${Number(v ?? 0).toFixed(2)}`;
}

function isConvertible(status: string) {
  return CONVERTIBLE.has(status);
}

export function PreOrdersPage() {
  const user = getUser();
  const storePortal = isStorePortal(user);
  const defaults = useMemo(() => defaultRange(), []);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [storeId, setStoreId] = useState("");
  const [payment, setPayment] = useState("");
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);
  const [stores, setStores] = useState<Array<{ ec_store_id: number; ec_store_name: string }>>([]);
  const [data, setData] = useState<Awaited<ReturnType<typeof adminApi.preOrders>> | null>(null);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof adminApi.preOrderStats>> | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState<number | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const filterParams = useMemo(
    () => ({
      q: q || undefined,
      status: status || undefined,
      store_id: storeId || undefined,
      payment: payment || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    }),
    [q, status, storeId, payment, dateFrom, dateTo],
  );

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (status) n += 1;
    if (storeId) n += 1;
    if (payment) n += 1;
    if (dateFrom !== defaults.from || dateTo !== defaults.to) n += 1;
    if (perPage !== 25) n += 1;
    return n;
  }, [status, storeId, payment, dateFrom, dateTo, defaults, perPage]);

  const statusChips = useMemo(() => {
    const keys = stats ? Object.keys(stats.by_status).sort() : [];
    return ["", ...keys];
  }, [stats]);

  const allSelected = Boolean(data?.items.length) && data!.items.every((o) => selected.includes(Number(o.order_id)));

  function resetFilters() {
    const r = defaultRange();
    setStatus("");
    setStoreId("");
    setPayment("");
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
        adminApi.preOrders({ ...filterParams, page, per_page: perPage }),
        adminApi.preOrderStats(filterParams),
      ]);
      setData(list);
      setStats(summary);
      setSelected([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pre-orders");
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
      const res = await adminApi.preOrders({ ...filterParams, page: 1, per_page: 100 });
      const allItems = [...res.items];
      const pages = Math.ceil(res.total / 100);
      for (let p = 2; p <= pages && p <= 20; p += 1) {
        const next = await adminApi.preOrders({ ...filterParams, page: p, per_page: 100 });
        allItems.push(...next.items);
      }
      const header = ["Date", "Ref", "Customer", "Phone", "Status", "Payable", "Payment", "Store", "Converted Order"];
      const lines = allItems.map((o) =>
        [
          o.order_created_at,
          o.order_refno,
          o.username,
          o.phone,
          o.order_status,
          o.order_payable,
          o.order_payment,
          o.ec_store_name,
          o.main_order_id,
        ]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(","),
      );
      const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pre-orders-${dateFrom}-${dateTo}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg(`Exported ${allItems.length} pre-orders.`);
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
    setSelected(data.items.map((o) => Number(o.order_id)));
  }

  function toggleOne(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function convertOne(id: number) {
    setRowBusy(id);
    setError("");
    setMsg("");
    try {
      const res = await adminApi.convertPreOrder(id);
      setMsg(`Pre-order converted → Order #${res.order_id}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Convert failed");
    } finally {
      setRowBusy(null);
    }
  }

  async function cancelOne(id: number) {
    const reason = window.prompt("Cancel reason (optional):") ?? "";
    setRowBusy(id);
    setError("");
    setMsg("");
    try {
      await adminApi.cancelPreOrder(id, reason || undefined);
      setMsg("Pre-order cancelled.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setRowBusy(null);
    }
  }

  async function bulkAction(action: "convert" | "cancel") {
    const ids = selected.filter((id) => {
      const row = data?.items.find((o) => Number(o.order_id) === id);
      return row && isConvertible(String(row.order_status));
    });
    if (!ids.length) {
      setError("Select active pre-orders to convert or cancel");
      return;
    }
    if (action === "cancel") {
      const ok = window.confirm(`Cancel ${ids.length} pre-order(s)?`);
      if (!ok) return;
    } else {
      const ok = window.confirm(`Convert ${ids.length} pre-order(s) to orders?`);
      if (!ok) return;
    }
    setBulkBusy(true);
    setError("");
    setMsg("");
    try {
      const res = await adminApi.bulkPreOrders({ action, ids });
      const done = action === "convert" ? res.converted : res.cancelled;
      setMsg(`${done} pre-order(s) ${action === "convert" ? "converted" : "cancelled"}.`);
      if (res.errors.length) {
        setError(res.errors.map((e) => `#${e.id}: ${e.message}`).join(" · "));
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk action failed");
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="orders-page">
      <div className="page-head">
        <div>
          <h1>Pre Orders</h1>
          <p className="page-sub">
            {stats?.total ?? data?.total ?? 0} pre-orders
            {stats ? ` · ${formatMoney(stats.payable)} total value` : ""}
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
          {statusChips.map((s) => {
            const count = s ? stats.by_status[s] ?? 0 : stats.total;
            return (
              <button
                key={s || "all"}
                type="button"
                className={`orders-status-chip${status === s ? " is-active" : ""}`}
                onClick={() => {
                  setPage(1);
                  setStatus(s);
                }}
              >
                <span>{s || "All"}</span>
                <strong>{count}</strong>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="card orders-toolbar">
        <div className="orders-search-wrap">
          <Search size={16} aria-hidden className="orders-search-icon" />
          <input
            className="orders-search"
            placeholder="Search ref, customer, phone, email…"
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
            <div className="filter-popover orders-filter-popover" role="dialog" aria-label="Pre-order filters">
              <div className="filter-popover-head">
                <strong>Filter pre-orders</strong>
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
                  Status
                  <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
                    {FILTER_STATUSES.map((s) => (
                      <option key={s || "all"} value={s}>{s || "All"}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Payment
                  <select value={payment} onChange={(e) => { setPage(1); setPayment(e.target.value); }}>
                    {PAYMENTS.map((s) => (
                      <option key={s || "all"} value={s}>{s || "All"}</option>
                    ))}
                  </select>
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
          <button type="button" className="btn btn-green" disabled={bulkBusy} onClick={() => void bulkAction("convert")}>
            {bulkBusy ? "Working…" : "Convert to orders"}
          </button>
          <button type="button" className="btn btn-secondary" disabled={bulkBusy} onClick={() => void bulkAction("cancel")}>
            Cancel selected
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setSelected([])}>
            Clear
          </button>
        </div>
      ) : null}

      <div className="card">
        {loading && !data ? (
          <LoadingIndicator label="Loading pre-orders" padded />
        ) : (
          <>
            <div className="table-wrap">
              <table className="data orders-table">
                <thead>
                  <tr>
                    <th className="orders-check-col">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" />
                    </th>
                    <th>Date</th>
                    <th>Reference</th>
                    <th>Customer</th>
                    <th className="orders-amount-col">Amount</th>
                    <th>Store</th>
                    <th>Payment</th>
                    <th className="orders-status-col">Status</th>
                    <th className="orders-actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.items ?? []).map((row) => {
                    const id = Number(row.order_id);
                    const st = String(row.order_status);
                    return (
                      <tr key={id} className={selected.includes(id) ? "is-selected" : ""}>
                        <td>
                          <input type="checkbox" checked={selected.includes(id)} onChange={() => toggleOne(id)} />
                        </td>
                        <td className="nowrap">{String(row.order_created_at ?? "").slice(0, 16).replace("T", " ")}</td>
                        <td>
                          <Link className="linkish" to={`/pre-orders/${id}`}>
                            {String(row.order_refno)}
                          </Link>
                        </td>
                        <td className="wrap">
                          {String(row.username ?? "-")}
                          <div className="muted">{String(row.phone ?? "")}</div>
                        </td>
                        <td className="nowrap orders-amount-col">{formatMoney(row.order_payable)}</td>
                        <td className="wrap">{String(row.ec_store_name ?? row.order_storeid ?? "-")}</td>
                        <td>{String(row.order_payment ?? "-")}</td>
                        <td className="orders-status-cell">
                          <StatusBadge status={st} />
                        </td>
                        <td className="orders-actions-cell">
                          <div className="orders-row-actions">
                            <Link className="btn btn-secondary btn-sm" to={`/pre-orders/${id}`}>
                              Manage
                            </Link>
                            {isConvertible(st) ? (
                              <>
                                <button type="button" className="btn btn-green btn-sm" disabled={rowBusy === id || bulkBusy} onClick={() => void convertOne(id)}>
                                  Convert
                                </button>
                                <button type="button" className="btn btn-secondary btn-sm" disabled={rowBusy === id || bulkBusy} onClick={() => void cancelOne(id)}>
                                  Cancel
                                </button>
                              </>
                            ) : row.main_order_id ? (
                              <Link className="btn btn-secondary btn-sm" to={`/orders/${row.main_order_id}`}>
                                Order
                              </Link>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {data && data.items.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="muted">
                        No pre-orders match your filters.
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
    </div>
  );
}
