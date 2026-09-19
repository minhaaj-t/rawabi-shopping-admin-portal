import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Filter, Plus, RotateCcw, Search, X } from "../lib/icons";
import { useSearchParams } from "react-router-dom";
import { adminApi, type SlotItem } from "../lib/api";
import { getUser, isStorePortal } from "../lib/auth";
import { getAdminBranchId } from "../lib/adminBranch";
import { StatusBadge } from "../components/StatusBadge";
import { LoadingIndicator } from "../components/LoadingIndicator";

const STATUS_CHIPS = [
  { value: "", label: "All", statKey: "total" as const },
  { value: "1", label: "Active", statKey: "active" as const },
  { value: "0", label: "Inactive", statKey: "inactive" as const },
];

type SlotForm = {
  store_id: string;
  start_time: string;
  end_time: string;
  limit: string;
};

const EMPTY_FORM: SlotForm = { store_id: "", start_time: "", end_time: "", limit: "50" };

function toTimeInput(value: string) {
  return value ? value.slice(0, 5) : "";
}

function formatTime(value: string) {
  return value ? value.slice(0, 8) : "—";
}

export function SlotsPage() {
  const user = getUser();
  const storePortal = isStorePortal(user);
  const [searchParams] = useSearchParams();
  const defaultStoreId = storePortal
    ? String(user?.store_id ?? "")
    : searchParams.get("store_id") || getAdminBranchId() || "";

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [storeId, setStoreId] = useState(defaultStoreId);
  const [stores, setStores] = useState<Array<{ ec_store_id: number; ec_store_name: string }>>([]);
  const [data, setData] = useState<Awaited<ReturnType<typeof adminApi.slotsManage>> | null>(null);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof adminApi.slotStats>> | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<SlotForm>({ ...EMPTY_FORM, store_id: defaultStoreId });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const filterParams = useMemo(
    () => ({
      q: q || undefined,
      status: status || undefined,
      store_id: storeId || undefined,
    }),
    [q, status, storeId],
  );

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (status) n += 1;
    if (!storePortal && storeId) n += 1;
    if (perPage !== 25) n += 1;
    return n;
  }, [status, storeId, storePortal, perPage]);

  const allSelected = Boolean(data?.items.length) && data!.items.every((o) => selected.includes(o.id));

  function resetFilters() {
    setStatus("");
    setStoreId(defaultStoreId);
    setPerPage(25);
    setPage(1);
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [list, summary] = await Promise.all([
        adminApi.slotsManage({ ...filterParams, page, per_page: perPage }),
        adminApi.slotStats(filterParams),
      ]);
      setData(list);
      setStats(summary);
      setSelected([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load slots");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!storePortal) {
      adminApi.storesManage({ per_page: 100, page: 1 }).then((res) =>
        setStores(
          res.items.map((r) => ({
            ec_store_id: r.id,
            ec_store_name: r.name,
          })),
        ),
      ).catch(() => undefined);
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

  function openCreate() {
    setEditId(null);
    setForm({ ...EMPTY_FORM, store_id: defaultStoreId || storeId });
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(row: SlotItem) {
    setEditId(row.id);
    setForm({
      store_id: String(row.store_id),
      start_time: toTimeInput(row.start_time),
      end_time: toTimeInput(row.end_time),
      limit: String(row.limit),
    });
    setFormError("");
    setModalOpen(true);
  }

  async function saveSlot() {
    setFormError("");
    if (!form.store_id) {
      setFormError("Store is required");
      return;
    }
    if (!form.start_time || !form.end_time) {
      setFormError("Start and end times are required");
      return;
    }
    if (form.start_time >= form.end_time) {
      setFormError("End time must be after start time");
      return;
    }

    setSaving(true);
    try {
      const body = {
        store_id: Number(form.store_id),
        start_time: form.start_time,
        end_time: form.end_time,
        limit: form.limit ? Number(form.limit) : 0,
      };
      if (editId) {
        await adminApi.updateSlot(editId, body);
        setMsg("Slot updated.");
      } else {
        await adminApi.createSlot(body);
        setMsg("Slot created.");
      }
      setModalOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function exportCsv() {
    try {
      const res = await adminApi.slotsManage({ ...filterParams, page: 1, per_page: 100 });
      const allItems = [...res.items];
      const pages = Math.ceil(res.total / 100);
      for (let p = 2; p <= pages && p <= 20; p += 1) {
        const next = await adminApi.slotsManage({ ...filterParams, page: p, per_page: 100 });
        allItems.push(...next.items);
      }
      const header = ["ID", "Store", "Start", "End", "Limit", "Status", "Created"];
      const lines = allItems.map((o) =>
        [o.id, o.store_name, o.start_time, o.end_time, o.limit, o.status_label, o.created_at]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(","),
      );
      const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `delivery-slots.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg(`Exported ${allItems.length} slot(s).`);
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

  async function toggleStatus(row: SlotItem) {
    setRowBusy(row.id);
    setError("");
    setMsg("");
    try {
      const next = row.status === 1 ? 0 : 1;
      await adminApi.updateSlotStatus(row.id, next);
      setMsg(`Slot ${next === 1 ? "activated" : "deactivated"}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Status update failed");
    } finally {
      setRowBusy(null);
    }
  }

  async function deleteOne(row: SlotItem) {
    const ok = window.confirm(`Delete slot ${formatTime(row.start_time)} – ${formatTime(row.end_time)}?`);
    if (!ok) return;
    setRowBusy(row.id);
    setError("");
    setMsg("");
    try {
      await adminApi.deleteSlot(row.id);
      setMsg("Slot deleted.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setRowBusy(null);
    }
  }

  async function bulkAction(action: "activate" | "deactivate" | "delete") {
    if (!selected.length) return;
    const label = action === "delete" ? "delete" : action;
    const ok = window.confirm(`${label.charAt(0).toUpperCase()}${label.slice(1)} ${selected.length} slot(s)?`);
    if (!ok) return;
    setBulkBusy(true);
    setError("");
    setMsg("");
    try {
      const res = await adminApi.bulkSlots({ action, ids: selected });
      setMsg(`${res.updated} slot(s) updated.`);
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
          <h1>Delivery Slots</h1>
          <p className="page-sub">{stats?.total ?? data?.total ?? 0} pickup & delivery time windows</p>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-secondary" onClick={() => void load()} disabled={loading}>
            Refresh
          </button>
          <button type="button" className="btn" onClick={() => void exportCsv()}>
            <Download size={14} />
            Export
          </button>
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus size={14} />
            Add slot
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
              className={`orders-status-chip${status === chip.value ? " is-active" : ""}`}
              onClick={() => {
                setPage(1);
                setStatus(chip.value);
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
            placeholder="Search store, time, limit…"
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
            <div className="filter-popover orders-filter-popover" role="dialog" aria-label="Slot filters">
              <div className="filter-popover-head">
                <strong>Filter slots</strong>
                <button type="button" className="btn btn-secondary" style={{ padding: "2px 8px" }} onClick={() => setFiltersOpen(false)}>
                  <X size={14} />
                </button>
              </div>
              <div className="filter-grid" style={{ marginBottom: 0 }}>
                <label>
                  Status
                  <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
                    {STATUS_CHIPS.map((c) => (
                      <option key={c.value || "all"} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </label>
                {!storePortal ? (
                  <label>
                    Store
                    <select value={storeId} onChange={(e) => { setPage(1); setStoreId(e.target.value); }}>
                      <option value="">All stores</option>
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
          <button type="button" className="btn btn-green" disabled={bulkBusy} onClick={() => void bulkAction("activate")}>
            {bulkBusy ? "Working…" : "Activate"}
          </button>
          <button type="button" className="btn btn-secondary" disabled={bulkBusy} onClick={() => void bulkAction("deactivate")}>
            Deactivate
          </button>
          <button type="button" className="btn btn-secondary" disabled={bulkBusy} onClick={() => void bulkAction("delete")}>
            Delete
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setSelected([])}>
            Clear
          </button>
        </div>
      ) : null}

      <div className="card">
        {loading && !data ? (
          <LoadingIndicator label="Loading slots" padded />
        ) : (
          <>
            <div className="table-wrap">
              <table className="data orders-table">
                <thead>
                  <tr>
                    <th className="orders-check-col">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" />
                    </th>
                    {!storePortal ? <th>Store</th> : null}
                    <th>Start</th>
                    <th>End</th>
                    <th>Limit</th>
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
                      {!storePortal ? <td className="wrap">{row.store_name || row.store_id}</td> : null}
                      <td className="nowrap">{formatTime(row.start_time)}</td>
                      <td className="nowrap">{formatTime(row.end_time)}</td>
                      <td>{row.limit}</td>
                      <td className="orders-status-cell">
                        <StatusBadge status={row.status_label} />
                      </td>
                      <td className="orders-actions-cell">
                        <div className="orders-row-actions">
                          <button type="button" className="btn btn-secondary btn-sm" disabled={rowBusy === row.id || bulkBusy} onClick={() => openEdit(row)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm ${row.status === 1 ? "btn-secondary" : "btn-green"}`}
                            disabled={rowBusy === row.id || bulkBusy}
                            onClick={() => void toggleStatus(row)}
                          >
                            {row.status === 1 ? "Deactivate" : "Activate"}
                          </button>
                          <button type="button" className="btn btn-secondary btn-sm" disabled={rowBusy === row.id || bulkBusy} onClick={() => void deleteOne(row)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {data && data.items.length === 0 ? (
                    <tr>
                      <td colSpan={storePortal ? 6 : 7} className="muted">
                        No slots match your filters.
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

      {modalOpen ? (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="page-head" style={{ marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>{editId ? "Edit slot" : "Add slot"}</h2>
              <button type="button" className="btn btn-secondary" style={{ padding: "2px 8px" }} onClick={() => setModalOpen(false)}>
                <X size={14} />
              </button>
            </div>
            {formError ? <div className="alert alert-error">{formError}</div> : null}
            <div className="filter-grid">
              {!storePortal ? (
                <label>
                  Store
                  <select value={form.store_id} onChange={(e) => setForm((f) => ({ ...f, store_id: e.target.value }))}>
                    <option value="">Select store</option>
                    {stores.map((s) => (
                      <option key={s.ec_store_id} value={s.ec_store_id}>{s.ec_store_name}</option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label>
                Start time
                <input type="time" step={1} value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))} />
              </label>
              <label>
                End time
                <input type="time" step={1} value={form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))} />
              </label>
              <label>
                Order limit
                <input type="number" min={0} value={form.limit} onChange={(e) => setForm((f) => ({ ...f, limit: e.target.value }))} />
              </label>
            </div>
            <div className="actions" style={{ marginTop: 16, justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void saveSlot()}>
                {saving ? "Saving…" : editId ? "Save changes" : "Create slot"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
