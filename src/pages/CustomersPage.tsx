import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Download, Filter, RotateCcw, Search, X } from "../lib/icons";
import { adminApi, type CustomerListItem } from "../lib/api";
import { StatusBadge } from "../components/StatusBadge";
import { LoadingIndicator } from "../components/LoadingIndicator";

type ChipFilter = "" | "active" | "inactive" | "with_orders";

const STATUS_CHIPS: Array<{ value: ChipFilter; label: string; statKey: keyof Awaited<ReturnType<typeof adminApi.customerStats>> }> = [
  { value: "", label: "All customers", statKey: "total" },
  { value: "active", label: "Active", statKey: "active" },
  { value: "inactive", label: "Inactive", statKey: "inactive" },
  { value: "with_orders", label: "With orders", statKey: "with_orders" },
];

function chipToParams(chip: ChipFilter) {
  if (chip === "active") return { status: 1, has_orders: undefined };
  if (chip === "inactive") return { status: 0, has_orders: undefined };
  if (chip === "with_orders") return { status: undefined, has_orders: "1" as const };
  return { status: undefined, has_orders: undefined };
}

export function CustomersPage() {
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState(() => searchParams.get("q") || "");
  const [chipFilter, setChipFilter] = useState<ChipFilter>("");
  const [registeredFrom, setRegisteredFrom] = useState("");
  const [registeredTo, setRegisteredTo] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [rows, setRows] = useState<CustomerListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof adminApi.customerStats>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState<number | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const chipParams = useMemo(() => chipToParams(chipFilter), [chipFilter]);

  const filterParams = useMemo(
    () => ({
      q: q || undefined,
      status: chipParams.status,
      has_orders: chipParams.has_orders,
      registered_from: registeredFrom || undefined,
      registered_to: registeredTo || undefined,
      sort,
    }),
    [q, chipParams, registeredFrom, registeredTo, sort],
  );

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (registeredFrom) n += 1;
    if (registeredTo) n += 1;
    if (sort !== "newest") n += 1;
    if (perPage !== 25) n += 1;
    return n;
  }, [registeredFrom, registeredTo, sort, perPage]);

  const allSelected = Boolean(rows.length) && rows.every((row) => selected.includes(row.id));

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [list, summary] = await Promise.all([
        adminApi.customers({ ...filterParams, page, per_page: perPage }),
        adminApi.customerStats(filterParams),
      ]);
      setRows(list.items);
      setTotal(list.total);
      setStats(summary);
      setSelected([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }

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

  function resetFilters() {
    setRegisteredFrom("");
    setRegisteredTo("");
    setSort("newest");
    setPerPage(25);
    setPage(1);
  }

  function toggleAll() {
    if (!rows.length) return;
    if (allSelected) {
      setSelected([]);
      return;
    }
    setSelected(rows.map((row) => row.id));
  }

  function toggleOne(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function toggleStatus(row: CustomerListItem) {
    setRowBusy(row.id);
    setError("");
    setMsg("");
    try {
      await adminApi.updateCustomer(row.id, { status: row.status === 1 ? 0 : 1 });
      setMsg(`Customer ${row.status === 1 ? "deactivated" : "activated"}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setRowBusy(null);
    }
  }

  async function bulkAction(action: "activate" | "deactivate") {
    if (!selected.length) return;
    const label = action === "activate" ? "activate" : "deactivate";
    const ok = window.confirm(`${label.charAt(0).toUpperCase()}${label.slice(1)} ${selected.length} customer(s)?`);
    if (!ok) return;
    setBulkBusy(true);
    setError("");
    setMsg("");
    try {
      const res = await adminApi.bulkCustomers({ action, ids: selected });
      setMsg(`${res.updated} customer(s) ${label}d.`);
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
          <h1>Customers</h1>
          <p className="page-sub">
            {stats?.total ?? total} customers
            {stats ? ` · ${stats.active.toLocaleString()} active · ${stats.inactive.toLocaleString()} inactive · ${stats.with_orders.toLocaleString()} with orders` : ""}
          </p>
        </div>
        <div className="actions">
          <Link className="btn btn-secondary" to="/analyst/customers">
            Segments &amp; LTV
          </Link>
          <button type="button" className="btn btn-secondary" onClick={() => void load()} disabled={loading}>
            Refresh
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => void adminApi.exportCustomers(filterParams).catch((e) => setError(String(e.message)))}
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}

      {stats ? (
        <div className="orders-status-bar">
          {STATUS_CHIPS.map((chip) => (
            <button
              key={chip.value || "all"}
              type="button"
              className={`orders-status-chip${chipFilter === chip.value ? " is-active" : ""}`}
              onClick={() => {
                setPage(1);
                setChipFilter(chip.value);
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
            placeholder="Search name, phone, email, or ID…"
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
            <div className="filter-popover orders-filter-popover" role="dialog" aria-label="Customer filters">
              <div className="filter-popover-head">
                <strong>Filter customers</strong>
                <button type="button" className="btn btn-secondary" style={{ padding: "2px 8px" }} onClick={() => setFiltersOpen(false)}>
                  <X size={14} />
                </button>
              </div>
              <div className="filter-grid" style={{ marginBottom: 0 }}>
                <label>
                  Registered from
                  <input type="date" value={registeredFrom} onChange={(e) => { setPage(1); setRegisteredFrom(e.target.value); }} />
                </label>
                <label>
                  Registered to
                  <input type="date" value={registeredTo} onChange={(e) => { setPage(1); setRegisteredTo(e.target.value); }} />
                </label>
                <label>
                  Sort by
                  <select value={sort} onChange={(e) => { setPage(1); setSort(e.target.value); }}>
                    <option value="newest">Newest first</option>
                    <option value="name">Name A–Z</option>
                    <option value="orders">Most orders</option>
                    <option value="spent">Highest spend</option>
                    <option value="last_order">Recent order</option>
                  </select>
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
          <button type="button" className="btn btn-green" disabled={bulkBusy} onClick={() => void bulkAction("activate")}>
            {bulkBusy ? "Working…" : "Activate"}
          </button>
          <button type="button" className="btn btn-secondary" disabled={bulkBusy} onClick={() => void bulkAction("deactivate")}>
            Deactivate
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setSelected([])}>
            Clear selection
          </button>
        </div>
      ) : null}

      <div className="card">
        {loading && !rows.length ? (
          <LoadingIndicator label="Loading customers" padded />
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
                    <th>Phone</th>
                    <th>Email</th>
                    <th className="orders-amount-col">Orders</th>
                    <th className="orders-amount-col">Total spent</th>
                    <th>Registered</th>
                    <th>Status</th>
                    <th className="orders-actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className={selected.includes(row.id) ? "is-selected" : ""}>
                      <td>
                        <input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggleOne(row.id)} />
                      </td>
                      <td className="wrap">
                        <Link className="linkish" to={`/customers/${row.id}`}>
                          <strong>{row.username || "—"}</strong>
                        </Link>
                        <div className="muted">ID #{row.id}</div>
                      </td>
                      <td className="nowrap">{row.phone || "—"}</td>
                      <td className="wrap">{row.email || "—"}</td>
                      <td className="orders-amount-col">{row.order_count}</td>
                      <td className="nowrap orders-amount-col">QAR {row.total_spent.toFixed(2)}</td>
                      <td className="nowrap">
                        <div>{String(row.create_date ?? "").slice(0, 10)}</div>
                        {row.last_order_at ? (
                          <div className="muted">Last order {String(row.last_order_at).slice(0, 10)}</div>
                        ) : null}
                      </td>
                      <td>
                        <StatusBadge status={row.status === 1 ? "Active" : "Inactive"} />
                      </td>
                      <td className="orders-actions-cell">
                        <div className="orders-row-actions">
                          <Link className="btn btn-secondary btn-sm" to={`/customers/${row.id}`}>
                            View
                          </Link>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={rowBusy === row.id}
                            onClick={() => void toggleStatus(row)}
                          >
                            {row.status === 1 ? "Deactivate" : "Activate"}
                          </button>
                          {row.order_count > 0 ? (
                            <Link
                              className="btn btn-secondary btn-sm"
                              to={`/orders?q=${encodeURIComponent(row.phone || row.email || String(row.id))}`}
                            >
                              Orders
                            </Link>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="muted">
                        No customers match your filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              <span>
                Page {page} · {total} total
              </span>
              <div className="actions">
                <button type="button" className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Prev
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={page * perPage >= total}
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
