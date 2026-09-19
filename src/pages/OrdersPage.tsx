import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Download, Filter, RotateCcw, Search, X } from "../lib/icons";
import { adminApi } from "../lib/api";
import { getUser, isStorePortal } from "../lib/auth";
import { getAdminBranchId } from "../lib/adminBranch";
import { LoadingIndicator } from "../components/LoadingIndicator";

const STATUSES = [
  "Processing",
  "Picking",
  "Picked",
  "Ondelivery",
  "Delivered",
  "Cancelled",
  "Cancelled Driver",
];

const STATUS_CHIPS = ["", ...STATUSES];

const PAYMENTS = ["", "COD", "Online", "Card", "Cash", "Wallet"];
const ORDER_TYPES = ["", "Normal", "Express", "Scheduled"];
const DELIVERY_TYPES = ["", "Express", "delivery", "pickup", "Normal"];

function defaultRange() {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth() - 1, 1);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(start), to: iso(end) };
}

function formatMoney(v: unknown) {
  return `QAR ${Number(v ?? 0).toFixed(2)}`;
}

function statusBadgeClass(status: string) {
  const normalized = status === "Deliverd" ? "Delivered" : status;
  const map: Record<string, string> = {
    Processing: "badge-Processing",
    Picking: "badge-Picking",
    Picked: "badge-Picked",
    Ondelivery: "badge-Ondelivery",
    Delivered: "badge-Delivered",
    Cancelled: "badge-Cancelled",
    "Cancelled Driver": "badge-Cancelled",
  };
  return map[normalized] ?? "badge-Processing";
}

export function OrdersPage() {
  const user = getUser();
  const storePortal = isStorePortal(user);
  const [searchParams] = useSearchParams();
  const defaults = useMemo(() => defaultRange(), []);

  const [status, setStatus] = useState("");
  const [q, setQ] = useState(() => searchParams.get("q") || "");
  const [storeId, setStoreId] = useState(() => searchParams.get("store_id") || getAdminBranchId() || "");
  const [deliveryType, setDeliveryType] = useState("");
  const [orderType, setOrderType] = useState("");
  const [payment, setPayment] = useState("");
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);
  const [scheduleDate, setScheduleDate] = useState("");
  const [stores, setStores] = useState<Array<{ ec_store_id: number; ec_store_name: string }>>([]);
  const [data, setData] = useState<Awaited<ReturnType<typeof adminApi.orders>> | null>(null);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof adminApi.orderStats>> | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [bulkStatus, setBulkStatus] = useState("Processing");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState<number | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const filterParams = useMemo(
    () => ({
      status: status || undefined,
      q: q || undefined,
      store_id: storeId || undefined,
      delivery_type: deliveryType || undefined,
      order_type: orderType || undefined,
      payment: payment || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      schedule_date: scheduleDate || undefined,
    }),
    [status, q, storeId, deliveryType, orderType, payment, dateFrom, dateTo, scheduleDate],
  );

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (status) n += 1;
    if (storeId) n += 1;
    if (deliveryType) n += 1;
    if (orderType) n += 1;
    if (payment) n += 1;
    if (scheduleDate) n += 1;
    if (dateFrom !== defaults.from || dateTo !== defaults.to) n += 1;
    if (perPage !== 25) n += 1;
    return n;
  }, [status, storeId, deliveryType, orderType, payment, scheduleDate, dateFrom, dateTo, defaults, perPage]);

  const allSelected = Boolean(data?.items.length) && data!.items.every((o) => selected.includes(Number(o.order_id)));

  function resetFilters() {
    const r = defaultRange();
    setStatus("");
    setStoreId("");
    setDeliveryType("");
    setOrderType("");
    setPayment("");
    setDateFrom(r.from);
    setDateTo(r.to);
    setScheduleDate("");
    setPerPage(25);
    setPage(1);
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [list, summary] = await Promise.all([
        adminApi.orders({ ...filterParams, page, per_page: perPage }),
        adminApi.orderStats(filterParams),
      ]);
      setData(list);
      setStats(summary);
      setSelected([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load orders");
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
      const res = await adminApi.orders({ ...filterParams, page: 1, per_page: 100 });
      const allItems = [...res.items];
      const pages = Math.ceil(res.total / 100);
      for (let p = 2; p <= pages && p <= 20; p += 1) {
        const next = await adminApi.orders({ ...filterParams, page: p, per_page: 100 });
        allItems.push(...next.items);
      }
      const header = [
        "Date",
        "Ref",
        "Customer",
        "Phone",
        "Amount",
        "Store",
        "Payment",
        "Note",
        "Schedule",
        "Type",
        "Delivery",
        "Status",
      ];
      const lines = allItems.map((o) =>
        [
          o.order_created_at,
          o.order_refno,
          o.username,
          o.phone,
          o.order_payable,
          o.ec_store_name,
          o.order_payment,
          o.order_note,
          o.order_schedule_date,
          o.order_type,
          o.order_delivery_type,
          o.order_status,
        ]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(","),
      );
      const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders-${dateFrom}-${dateTo}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg(`Exported ${allItems.length} orders.`);
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

  async function updateRowStatus(orderId: number, next: string) {
    setRowBusy(orderId);
    setError("");
    try {
      await adminApi.updateOrderStatus(orderId, next);
      setMsg(`Order #${orderId} → ${next}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Status update failed");
    } finally {
      setRowBusy(null);
    }
  }

  async function applyBulkStatus() {
    if (!selected.length) return;
    setBulkBusy(true);
    setError("");
    try {
      for (const id of selected) {
        await adminApi.updateOrderStatus(id, bulkStatus);
      }
      setMsg(`Updated ${selected.length} order(s) to ${bulkStatus}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk update failed");
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="orders-page">
      <div className="page-head">
        <div>
          <h1>Orders</h1>
          <p className="page-sub">
            {stats?.total ?? data?.total ?? 0} matching orders
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
          {STATUS_CHIPS.map((s) => {
            const count = s ? stats.by_status[s] ?? 0 : stats.total;
            const active = status === s;
            return (
              <button
                key={s || "all"}
                type="button"
                className={`orders-status-chip${active ? " is-active" : ""}`}
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
            <div className="filter-popover orders-filter-popover" role="dialog" aria-label="Order filters">
              <div className="filter-popover-head">
                <strong>Filter orders</strong>
                <button type="button" className="btn btn-secondary" style={{ padding: "2px 8px" }} onClick={() => setFiltersOpen(false)} aria-label="Close filters">
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
                  Order status
                  <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
                    <option value="">All</option>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Delivery type
                  <select value={deliveryType} onChange={(e) => { setPage(1); setDeliveryType(e.target.value); }}>
                    <option value="">All</option>
                    {DELIVERY_TYPES.filter(Boolean).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Order type
                  <select value={orderType} onChange={(e) => { setPage(1); setOrderType(e.target.value); }}>
                    <option value="">All</option>
                    {ORDER_TYPES.filter(Boolean).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Payment
                  <select value={payment} onChange={(e) => { setPage(1); setPayment(e.target.value); }}>
                    <option value="">All</option>
                    {PAYMENTS.filter(Boolean).map((s) => (
                      <option key={s} value={s}>{s}</option>
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
                  Scheduled date
                  <input type="date" value={scheduleDate} onChange={(e) => { setPage(1); setScheduleDate(e.target.value); }} />
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
          <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button type="button" className="btn btn-green" disabled={bulkBusy} onClick={() => void applyBulkStatus()}>
            {bulkBusy ? "Updating…" : "Update status"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setSelected([])}>
            Clear
          </button>
        </div>
      ) : null}

      <div className="card">
        {loading && !data ? (
          <LoadingIndicator label="Loading orders" padded />
        ) : (
          <>
            <div className="table-wrap">
              <table className="data orders-table">
                <thead>
                  <tr>
                    <th className="orders-check-col">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all orders on page" />
                    </th>
                    <th>Date</th>
                    <th>Reference</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Store</th>
                    <th>Payment</th>
                    <th>Schedule</th>
                    <th>Type</th>
                    <th>Delivery</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.items ?? []).map((o) => {
                    const orderId = Number(o.order_id);
                    const currentStatus = String(o.order_status === "Deliverd" ? "Delivered" : o.order_status);
                    return (
                      <tr key={String(o.order_id)} className={selected.includes(orderId) ? "is-selected" : ""}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selected.includes(orderId)}
                            onChange={() => toggleOne(orderId)}
                            aria-label={`Select order ${String(o.order_refno)}`}
                          />
                        </td>
                        <td className="nowrap">{String(o.order_created_at ?? "").slice(0, 16).replace("T", " ")}</td>
                        <td>
                          <Link className="linkish" to={`/orders/${o.order_id}`}>
                            {String(o.order_refno)}
                          </Link>
                        </td>
                        <td className="wrap">
                          {String(o.username ?? "-")}
                          <div className="muted">{String(o.phone ?? "")}</div>
                        </td>
                        <td className="nowrap">{formatMoney(o.order_payable)}</td>
                        <td className="wrap">{String(o.ec_store_name ?? o.order_storeid ?? "-")}</td>
                        <td>{String(o.order_payment ?? "-")}</td>
                        <td className="nowrap">
                          {String(o.order_schedule_date ?? "-")}
                          {o.order_start_time ? (
                            <div className="muted">
                              {String(o.order_start_time)}
                              {o.order_end_time ? `–${String(o.order_end_time)}` : ""}
                            </div>
                          ) : null}
                        </td>
                        <td>{String(o.order_type ?? "-")}</td>
                        <td>{String(o.order_delivery_type ?? "-")}</td>
                        <td>
                          <select
                            className={`orders-status-select badge ${statusBadgeClass(currentStatus)}`}
                            value={currentStatus}
                            disabled={rowBusy === orderId}
                            onChange={(e) => void updateRowStatus(orderId, e.target.value)}
                            aria-label={`Change status for ${String(o.order_refno)}`}
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <Link className="btn btn-secondary" to={`/orders/${o.order_id}`}>
                            Manage
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {data && data.items.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="muted">
                        No orders match your filters.
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
