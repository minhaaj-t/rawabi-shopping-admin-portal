import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Download, Filter, RotateCcw, Search, X } from "../lib/icons";
import { adminApi } from "../lib/api";
import { getUser, isStorePortal } from "../lib/auth";
import { getAdminBranchId } from "../lib/adminBranch";
import { StatusBadge } from "../components/StatusBadge";
import { LoadingIndicator } from "../components/LoadingIndicator";

const APPROVAL_CHIPS = [
  { value: "", label: "All", statKey: "total" as const },
  { value: "0", label: "Pending", statKey: "pending" as const },
  { value: "1", label: "Added", statKey: "added" as const },
  { value: "2", label: "Rejected", statKey: "rejected" as const },
  { value: "3", label: "Already Added", statKey: "already_added" as const },
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

export function FloorRequestsPage() {
  const user = getUser();
  const storePortal = isStorePortal(user);
  const [searchParams] = useSearchParams();
  const defaults = useMemo(() => defaultRange(), []);

  const [q, setQ] = useState("");
  const [approval, setApproval] = useState("");
  const [storeId, setStoreId] = useState(() => searchParams.get("store_id") || getAdminBranchId() || "");
  const [skuExists, setSkuExists] = useState("");
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);
  const [stores, setStores] = useState<Array<{ ec_store_id: number; ec_store_name: string }>>([]);
  const [data, setData] = useState<Awaited<ReturnType<typeof adminApi.floorRequests>> | null>(null);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof adminApi.floorRequestStats>> | null>(null);
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
      approval: approval || undefined,
      store_id: storeId || undefined,
      sku_exists: skuExists || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    }),
    [q, approval, storeId, skuExists, dateFrom, dateTo],
  );

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (approval) n += 1;
    if (storeId) n += 1;
    if (skuExists) n += 1;
    if (dateFrom !== defaults.from || dateTo !== defaults.to) n += 1;
    if (perPage !== 25) n += 1;
    return n;
  }, [approval, storeId, skuExists, dateFrom, dateTo, defaults, perPage]);

  const allSelected = Boolean(data?.items.length) && data!.items.every((o) => selected.includes(o.id));

  function resetFilters() {
    const r = defaultRange();
    setApproval("");
    setStoreId("");
    setSkuExists("");
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
        adminApi.floorRequests({ ...filterParams, page, per_page: perPage }),
        adminApi.floorRequestStats(filterParams),
      ]);
      setData(list);
      setStats(summary);
      setSelected([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load floor requests");
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
      const res = await adminApi.floorRequests({ ...filterParams, page: 1, per_page: 100 });
      const allItems = [...res.items];
      const pages = Math.ceil(res.total / 100);
      for (let p = 2; p <= pages && p <= 20; p += 1) {
        const next = await adminApi.floorRequests({ ...filterParams, page: p, per_page: 100 });
        allItems.push(...next.items);
      }
      const header = [
        "ID",
        "Date",
        "Title",
        "SKU",
        "Barcode",
        "Store",
        "Category",
        "UOM",
        "Price",
        "Offer",
        "SKU Exists",
        "Manager",
        "Status",
      ];
      const lines = allItems.map((o) =>
        [
          o.id,
          o.created_at,
          o.title,
          o.sku,
          o.barcode,
          o.store_name,
          o.category_name,
          o.uom,
          o.unit_price,
          o.offer_price,
          o.sku_exists ? "Yes" : "No",
          o.manager_name,
          o.approval_label,
        ]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(","),
      );
      const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `floor-requests-${dateFrom}-${dateTo}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg(`Exported ${allItems.length} floor request(s).`);
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
    setSelected(data.items.map((o) => o.id));
  }

  function toggleOne(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function updateOne(id: number, nextApproval: number) {
    setRowBusy(id);
    setError("");
    setMsg("");
    try {
      const res = await adminApi.updateFloorRequest(id, nextApproval);
      setMsg(`Request #${id} marked as ${res.approval_label}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setRowBusy(null);
    }
  }

  async function bulkAction(action: "approve" | "reject" | "already_added") {
    const ids = selected.filter((id) => {
      const row = data?.items.find((o) => o.id === id);
      return row && row.approval === 0;
    });
    if (!ids.length) {
      setError("Select pending floor requests for bulk actions");
      return;
    }
    const label = action === "approve" ? "approve" : action === "reject" ? "reject" : "mark as already added";
    const ok = window.confirm(`${label.charAt(0).toUpperCase()}${label.slice(1)} ${ids.length} request(s)?`);
    if (!ok) return;
    setBulkBusy(true);
    setError("");
    setMsg("");
    try {
      const res = await adminApi.bulkFloorRequests({ action, ids });
      setMsg(`${res.updated} request(s) updated.`);
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
          <h1>Floor Requests</h1>
          <p className="page-sub">{stats?.total ?? data?.total ?? 0} product requests from floor managers</p>
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
          {APPROVAL_CHIPS.map((chip) => (
            <button
              key={chip.value || "all"}
              type="button"
              className={`orders-status-chip${approval === chip.value ? " is-active" : ""}`}
              onClick={() => {
                setPage(1);
                setApproval(chip.value);
              }}
            >
              <span>{chip.label}</span>
              <strong>{stats[chip.statKey]}</strong>
            </button>
          ))}
        </div>
      ) : null}

      <div className="card orders-toolbar">
        <div className="orders-search-wrap">
          <Search size={16} aria-hidden className="orders-search-icon" />
          <input
            className="orders-search"
            placeholder="Search title, SKU, barcode, store, manager…"
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
            <div className="filter-popover orders-filter-popover" role="dialog" aria-label="Floor request filters">
              <div className="filter-popover-head">
                <strong>Filter floor requests</strong>
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
                  <select value={approval} onChange={(e) => { setPage(1); setApproval(e.target.value); }}>
                    {APPROVAL_CHIPS.map((c) => (
                      <option key={c.value || "all"} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  SKU in catalog
                  <select value={skuExists} onChange={(e) => { setPage(1); setSkuExists(e.target.value); }}>
                    <option value="">All</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
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
          <button type="button" className="btn btn-green" disabled={bulkBusy} onClick={() => void bulkAction("approve")}>
            {bulkBusy ? "Working…" : "Approve"}
          </button>
          <button type="button" className="btn btn-secondary" disabled={bulkBusy} onClick={() => void bulkAction("reject")}>
            Reject
          </button>
          <button type="button" className="btn btn-secondary" disabled={bulkBusy} onClick={() => void bulkAction("already_added")}>
            Already added
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setSelected([])}>
            Clear
          </button>
        </div>
      ) : null}

      <div className="card">
        {loading && !data ? (
          <LoadingIndicator label="Loading floor requests" padded />
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
                    <th>Title</th>
                    <th>Store</th>
                    <th>Category</th>
                    <th>SKU</th>
                    <th>SKU exists</th>
                    <th>UOM</th>
                    <th className="orders-amount-col">Offer</th>
                    <th>Image</th>
                    <th className="orders-status-col">Status</th>
                    <th className="orders-actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.items ?? []).map((row) => (
                    <tr key={row.id} className={selected.includes(row.id) ? "is-selected" : ""}>
                      <td>
                        <input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggleOne(row.id)} />
                      </td>
                      <td className="nowrap">{String(row.created_at ?? "").slice(0, 16).replace("T", " ")}</td>
                      <td className="wrap">
                        <Link className="linkish" to={`/floor-requests/${row.id}`}>
                          {row.title}
                        </Link>
                        <div className="muted">{row.manager_name || "—"}</div>
                      </td>
                      <td className="wrap">{row.store_name || "—"}</td>
                      <td className="wrap">{row.category_name || "—"}</td>
                      <td className="nowrap">{row.sku || "—"}</td>
                      <td>{row.sku_exists ? "Yes" : "No"}</td>
                      <td>{row.uom || "—"}</td>
                      <td className="nowrap orders-amount-col">{formatMoney(row.offer_price || row.unit_price)}</td>
                      <td>
                        {row.image_url ? (
                          <img src={row.image_url} alt="" width={40} height={40} style={{ objectFit: "cover", borderRadius: 4 }} />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="orders-status-cell">
                        <StatusBadge status={row.approval_label} />
                      </td>
                      <td className="orders-actions-cell">
                        <div className="orders-row-actions">
                          <Link className="btn btn-secondary btn-sm" to={`/floor-requests/${row.id}`}>
                            View
                          </Link>
                          {row.approval === 0 ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-green btn-sm"
                                disabled={rowBusy === row.id || bulkBusy}
                                onClick={() => void updateOne(row.id, 1)}
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                disabled={rowBusy === row.id || bulkBusy}
                                onClick={() => void updateOne(row.id, 2)}
                              >
                                Reject
                              </button>
                            </>
                          ) : row.product_id ? (
                            <Link className="btn btn-secondary btn-sm" to={`/products/${row.product_id}/edit`}>
                              Product
                            </Link>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {data && data.items.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="muted">
                        No floor requests match your filters.
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
