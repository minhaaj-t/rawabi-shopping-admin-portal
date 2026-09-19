import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Download, Filter, Plus, RotateCcw, Search, X } from "../lib/icons";
import { adminApi, type StoreManageItem } from "../lib/api";
import { decodeLocaleName } from "../components/EntityCrudPage";
import { StatusBadge } from "../components/StatusBadge";
import { LoadingIndicator } from "../components/LoadingIndicator";

const STATUS_CHIPS = [
  { value: "", label: "All", statKey: "total" as const },
  { value: "1", label: "Active", statKey: "active" as const },
  { value: "0", label: "Inactive", statKey: "inactive" as const },
];

type StoreForm = {
  name: string;
  name_ar: string;
  code: string;
  email: string;
  contact: string;
  franchise_id: string;
  country_id: string;
  area_id: string;
  password: string;
  open_time: string;
  close_time: string;
  lat: string;
  lng: string;
  address: string;
  address_ar: string;
  avg_time: string;
  max_km: string;
};

const EMPTY_FORM: StoreForm = {
  name: "",
  name_ar: "",
  code: "",
  email: "",
  contact: "",
  franchise_id: "",
  country_id: "",
  area_id: "",
  password: "",
  open_time: "",
  close_time: "",
  lat: "",
  lng: "",
  address: "",
  address_ar: "",
  avg_time: "",
  max_km: "",
};

function toTimeInput(value: string) {
  return value ? value.slice(0, 5) : "";
}

function formatTime(value: string) {
  return value ? value.slice(0, 5) : "—";
}

function mapsUrl(lat: string, lng: string) {
  if (!lat.trim() || !lng.trim()) return null;
  return `https://www.google.com/maps?q=${encodeURIComponent(`${lat.trim()},${lng.trim()}`)}`;
}

function formatCoords(lat: string, lng: string) {
  if (!lat.trim() && !lng.trim()) return "—";
  return `${lat.trim() || "—"}, ${lng.trim() || "—"}`;
}

export function StoresManagePage() {
  const [searchParams] = useSearchParams();
  const initialFranchiseId = searchParams.get("franchise_id") || "";
  const shouldOpenAdd = searchParams.get("add") === "1";

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [franchiseId, setFranchiseId] = useState(initialFranchiseId);
  const [countryId, setCountryId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [franchises, setFranchises] = useState<Array<{ id: number; name: string }>>([]);
  const [countries, setCountries] = useState<Array<{ id: number; name: string }>>([]);
  const [filterAreas, setFilterAreas] = useState<Array<{ id: number; name: string }>>([]);
  const [formAreas, setFormAreas] = useState<Array<{ id: number; name: string }>>([]);
  const [data, setData] = useState<Awaited<ReturnType<typeof adminApi.storesManage>> | null>(null);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof adminApi.storeManageStats>> | null>(null);
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
  const [form, setForm] = useState<StoreForm>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const filterParams = useMemo(
    () => ({
      q: q || undefined,
      status: status || undefined,
      franchise_id: franchiseId || undefined,
      country_id: countryId || undefined,
      area_id: areaId || undefined,
    }),
    [q, status, franchiseId, countryId, areaId],
  );

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (status) n += 1;
    if (franchiseId) n += 1;
    if (countryId) n += 1;
    if (areaId) n += 1;
    if (perPage !== 25) n += 1;
    return n;
  }, [status, franchiseId, countryId, areaId, perPage]);

  const allSelected = Boolean(data?.items.length) && data!.items.every((o) => selected.includes(o.id));

  function resetFilters() {
    setStatus("");
    setFranchiseId("");
    setCountryId("");
    setAreaId("");
    setFilterAreas([]);
    setPerPage(25);
    setPage(1);
  }

  async function loadAreas(targetCountryId: string, target: "filter" | "form") {
    if (!targetCountryId) {
      if (target === "filter") setFilterAreas([]);
      else setFormAreas([]);
      return;
    }
    try {
      const rows = await adminApi.areas({ country_id: targetCountryId });
      const mapped = rows.map((r) => ({
        id: Number(r.ec_area_id),
        name: decodeLocaleName(r.ec_area_name),
      }));
      if (target === "filter") setFilterAreas(mapped);
      else setFormAreas(mapped);
    } catch {
      if (target === "filter") setFilterAreas([]);
      else setFormAreas([]);
    }
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [list, summary] = await Promise.all([
        adminApi.storesManage({ ...filterParams, page, per_page: perPage }),
        adminApi.storeManageStats(filterParams),
      ]);
      setData(list);
      setStats(summary);
      setSelected([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load stores");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.all([
      adminApi.franchises({ per_page: 100, page: 1 }).then((res) =>
        setFranchises(res.items.map((r) => ({ id: r.id, name: r.name }))),
      ),
      adminApi.countries().then((rows) =>
        setCountries(
          rows.map((r) => ({
            id: Number(r.ec_country_id),
            name: decodeLocaleName(r.ec_country_name),
          })),
        ),
      ),
    ]).catch(() => undefined);
  }, []);

  useEffect(() => {
    void load();
  }, [filterParams, page, perPage]);

  useEffect(() => {
    void loadAreas(countryId, "filter");
  }, [countryId]);

  useEffect(() => {
    void loadAreas(form.country_id, "form");
  }, [form.country_id]);

  useEffect(() => {
    if (shouldOpenAdd && initialFranchiseId) {
      setEditId(null);
      setForm({ ...EMPTY_FORM, franchise_id: initialFranchiseId });
      setFormAreas([]);
      setFormError("");
      setModalOpen(true);
    }
  }, [shouldOpenAdd, initialFranchiseId]);

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
    setForm(EMPTY_FORM);
    setFormAreas([]);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(row: StoreManageItem) {
    setEditId(row.id);
    setForm({
      name: row.name,
      name_ar: row.name_ar,
      code: row.code,
      email: row.email,
      contact: row.contact,
      franchise_id: row.franchise_id ? String(row.franchise_id) : "",
      country_id: row.country_id ? String(row.country_id) : "",
      area_id: row.area_id ? String(row.area_id) : "",
      password: "",
      open_time: toTimeInput(row.open_time),
      close_time: toTimeInput(row.close_time),
      lat: row.latitude,
      lng: row.longitude,
      address: row.address,
      address_ar: row.address_ar,
      avg_time: row.avg_time,
      max_km: row.max_km,
    });
    setFormError("");
    setModalOpen(true);
  }

  async function saveStore() {
    setFormError("");
    if (!form.name.trim()) {
      setFormError("Store name is required");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        name_ar: form.name_ar.trim() || undefined,
        code: form.code.trim() || undefined,
        email: form.email.trim() || undefined,
        contact: form.contact.trim() || undefined,
        franchise_id: form.franchise_id ? Number(form.franchise_id) : undefined,
        country_id: form.country_id ? Number(form.country_id) : undefined,
        area_id: form.area_id ? Number(form.area_id) : undefined,
        open_time: form.open_time || undefined,
        close_time: form.close_time || undefined,
        lat: form.lat.trim() || undefined,
        lng: form.lng.trim() || undefined,
        address: form.address.trim() || undefined,
        address_ar: form.address_ar.trim() || undefined,
        avg_time: form.avg_time.trim() || undefined,
        max_km: form.max_km.trim() || undefined,
      };
      if (form.password.trim()) body.password = form.password.trim();

      if (editId) {
        await adminApi.updateStore(editId, body);
        setMsg("Store updated.");
      } else {
        if (!form.password.trim() || form.password.trim().length < 8) {
          setFormError("Password is required (min 8 characters)");
          setSaving(false);
          return;
        }
        body.password = form.password.trim();
        await adminApi.createStore(body);
        setMsg("Store created.");
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
      const res = await adminApi.storesManage({ ...filterParams, page: 1, per_page: 100 });
      const allItems = [...res.items];
      const pages = Math.ceil(res.total / 100);
      for (let p = 2; p <= pages && p <= 20; p += 1) {
        const next = await adminApi.storesManage({ ...filterParams, page: p, per_page: 100 });
        allItems.push(...next.items);
      }
      const header = [
        "ID",
        "Name",
        "Email",
        "Contact",
        "Franchise",
        "Country",
        "Area",
        "Open",
        "Close",
        "Avg Delivery",
        "Max KM",
        "Slots",
        "Status",
      ];
      const lines = allItems.map((o) =>
        [
          o.id,
          o.name,
          o.email,
          o.contact,
          o.franchise_name,
          o.country_name,
          o.area_name,
          o.open_time,
          o.close_time,
          o.avg_time,
          o.max_km,
          o.slot_count,
          o.status_label,
        ]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(","),
      );
      const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "stores.csv";
      a.click();
      URL.revokeObjectURL(url);
      setMsg(`Exported ${allItems.length} store(s).`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    }
  }

  function toggleAll() {
    if (!data?.items.length) return;
    setSelected(allSelected ? [] : data.items.map((o) => o.id));
  }

  function toggleOne(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function toggleStatus(row: StoreManageItem) {
    setRowBusy(row.id);
    setError("");
    setMsg("");
    try {
      const next = row.status === 1 ? 0 : 1;
      await adminApi.updateStoreStatus(row.id, next);
      setMsg(`Store ${next === 1 ? "activated" : "deactivated"}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Status update failed");
    } finally {
      setRowBusy(null);
    }
  }

  async function deleteOne(row: StoreManageItem) {
    const ok = window.confirm(`Delete store "${row.name}"?`);
    if (!ok) return;
    setRowBusy(row.id);
    setError("");
    setMsg("");
    try {
      await adminApi.deleteStore(row.id);
      setMsg("Store deleted.");
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
    const ok = window.confirm(`${label.charAt(0).toUpperCase()}${label.slice(1)} ${selected.length} store(s)?`);
    if (!ok) return;
    setBulkBusy(true);
    setError("");
    setMsg("");
    try {
      const res = await adminApi.bulkStores({ action, ids: selected });
      setMsg(`${res.updated} store(s) updated.`);
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
          <h1>Stores</h1>
          <p className="page-sub">{stats?.total ?? data?.total ?? 0} branches & pickup locations</p>
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
            Add store
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
            placeholder="Search name, email, contact, franchise, code…"
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
            <div className="filter-popover orders-filter-popover" role="dialog" aria-label="Store filters">
              <div className="filter-popover-head">
                <strong>Filter stores</strong>
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
                <label>
                  Franchise
                  <select value={franchiseId} onChange={(e) => { setPage(1); setFranchiseId(e.target.value); }}>
                    <option value="">All</option>
                    {franchises.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Country
                  <select
                    value={countryId}
                    onChange={(e) => {
                      setPage(1);
                      setCountryId(e.target.value);
                      setAreaId("");
                    }}
                  >
                    <option value="">All</option>
                    {countries.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Area
                  <select value={areaId} onChange={(e) => { setPage(1); setAreaId(e.target.value); }} disabled={!countryId}>
                    <option value="">All</option>
                    {filterAreas.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
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
          <LoadingIndicator label="Loading stores" padded />
        ) : (
          <>
            <div className="table-wrap">
              <table className="data orders-table">
                <thead>
                  <tr>
                    <th className="orders-check-col">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" />
                    </th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Contact</th>
                    <th>Franchise</th>
                    <th>Hours</th>
                    <th>Location</th>
                    <th>Avg delivery</th>
                    <th>Slots</th>
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
                      <td className="wrap">
                        <Link className="linkish" to={`/stores/${row.id}`}>
                          <strong>{row.name}</strong>
                        </Link>
                        {row.area_name ? <div className="muted">{row.area_name}</div> : null}
                      </td>
                      <td className="wrap">{row.email || "—"}</td>
                      <td className="nowrap">{row.contact || "—"}</td>
                      <td className="wrap">{row.franchise_name || row.franchise_id || "—"}</td>
                      <td className="nowrap">
                        {formatTime(row.open_time)} – {formatTime(row.close_time)}
                      </td>
                      <td className="wrap">
                        {(() => {
                          const href = mapsUrl(row.latitude, row.longitude);
                          const label = formatCoords(row.latitude, row.longitude);
                          return href ? (
                            <a className="linkish" href={href} target="_blank" rel="noreferrer">
                              {label}
                            </a>
                          ) : (
                            <span className="muted">{label}</span>
                          );
                        })()}
                      </td>
                      <td>{row.avg_time || "—"}</td>
                      <td>{row.slot_count}</td>
                      <td className="orders-status-cell">
                        <StatusBadge status={row.status_label} />
                      </td>
                      <td className="orders-actions-cell">
                        <div className="orders-row-actions">
                          <Link className="btn btn-secondary btn-sm" to={`/stores/${row.id}`}>
                            View
                          </Link>
                          <button type="button" className="btn btn-secondary btn-sm" disabled={rowBusy === row.id || bulkBusy} onClick={() => openEdit(row)}>
                            Edit
                          </button>
                          <Link className="btn btn-secondary btn-sm" to={`/slots?store_id=${row.id}`}>
                            Slots
                          </Link>
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
                      <td colSpan={11} className="muted">
                        No stores match your filters.
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
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="page-head" style={{ marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>{editId ? "Edit store" : "Add store"}</h2>
              <button type="button" className="btn btn-secondary" style={{ padding: "2px 8px" }} onClick={() => setModalOpen(false)}>
                <X size={14} />
              </button>
            </div>
            {formError ? <div className="alert alert-error">{formError}</div> : null}
            <div className="filter-grid">
              <label>
                Name (English)
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </label>
              <label>
                Name (Arabic)
                <input value={form.name_ar} onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))} />
              </label>
              <label>
                Store code
                <input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
              </label>
              <label>
                Email
                <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </label>
              <label>
                Contact
                <input value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} />
              </label>
              <label>
                Franchise
                <select value={form.franchise_id} onChange={(e) => setForm((f) => ({ ...f, franchise_id: e.target.value }))}>
                  <option value="">None</option>
                  {franchises.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Country
                <select
                  value={form.country_id}
                  onChange={(e) => setForm((f) => ({ ...f, country_id: e.target.value, area_id: "" }))}
                >
                  <option value="">Select</option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Area
                <select value={form.area_id} onChange={(e) => setForm((f) => ({ ...f, area_id: e.target.value }))} disabled={!form.country_id}>
                  <option value="">Select</option>
                  {formAreas.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Opening time
                <input type="time" value={form.open_time} onChange={(e) => setForm((f) => ({ ...f, open_time: e.target.value }))} />
              </label>
              <label>
                Close time
                <input type="time" value={form.close_time} onChange={(e) => setForm((f) => ({ ...f, close_time: e.target.value }))} />
              </label>
              <label>
                Latitude
                <input
                  value={form.lat}
                  onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
                  placeholder="e.g. 25.2854"
                  inputMode="decimal"
                />
              </label>
              <label>
                Longitude
                <input
                  value={form.lng}
                  onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))}
                  placeholder="e.g. 51.5310"
                  inputMode="decimal"
                />
              </label>
              {mapsUrl(form.lat, form.lng) ? (
                <p className="muted pf-span-2" style={{ margin: 0, gridColumn: "1 / -1" }}>
                  <a className="linkish" href={mapsUrl(form.lat, form.lng)!} target="_blank" rel="noreferrer">
                    Open pin on Google Maps
                  </a>
                </p>
              ) : null}
              <label>
                Avg delivery time
                <input value={form.avg_time} onChange={(e) => setForm((f) => ({ ...f, avg_time: e.target.value }))} placeholder="e.g. 45 mins" />
              </label>
              <label>
                Max kilometer
                <input value={form.max_km} onChange={(e) => setForm((f) => ({ ...f, max_km: e.target.value }))} />
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                Address (English)
                <textarea rows={2} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                Address (Arabic)
                <textarea rows={2} value={form.address_ar} onChange={(e) => setForm((f) => ({ ...f, address_ar: e.target.value }))} />
              </label>
              {!editId ? (
                <label>
                  Portal password (min 8 characters)
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Strong password required"
                    autoComplete="new-password"
                    required
                    minLength={8}
                  />
                </label>
              ) : (
                <label>
                  New password (optional, min 8)
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    minLength={8}
                    autoComplete="new-password"
                  />
                </label>
              )}
            </div>
            <div className="actions" style={{ marginTop: 16, justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void saveStore()}>
                {saving ? "Saving…" : editId ? "Save changes" : "Create store"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
