import { useEffect, useMemo, useState } from "react";
import { Plus, RotateCcw, Search, Trash2, X } from "../lib/icons";
import { adminApi } from "../lib/api";
import { decodeLocaleName } from "../components/EntityCrudPage";
import { useOpenAddQuery } from "../lib/useOpenAddQuery";
import { LoadingIndicator } from "../components/LoadingIndicator";

type FilterRow = {
  ec_filter_id: number;
  ec_filter_category: number;
  ec_filter_filters: string;
  ec_filter_variables: string;
  ec_filter_status: number;
};

type CategoryOpt = { id: number; name: string; parent: number; parent_name?: string | null };

type FormState = {
  category: string;
  name_en: string;
  name_ar: string;
  values: string[];
};

const EMPTY_FORM: FormState = {
  category: "",
  name_en: "",
  name_ar: "",
  values: [],
};

function parseLocalePair(raw: unknown): { en: string; ar: string } {
  if (raw == null) return { en: "", ar: "" };
  const s = String(raw).trim();
  if (!s) return { en: "", ar: "" };
  if (!s.startsWith("{")) return { en: s, ar: "" };
  try {
    const j = JSON.parse(s) as Record<string, string>;
    return {
      en: String(j.English ?? j.english ?? j.en ?? ""),
      ar: String(j.Arabic ?? j.arabic ?? j.ar ?? ""),
    };
  } catch {
    return { en: s, ar: "" };
  }
}

function encodeLocalePair(en: string, ar: string): string {
  return JSON.stringify({
    English: en.trim(),
    Arabic: ar.trim(),
  });
}

function parseFilterValues(raw: unknown): string[] {
  if (raw == null) return [];
  const s = String(raw).trim();
  if (!s) return [];
  try {
    const parsed = JSON.parse(s) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => {
          if (typeof item === "string") return item.trim();
          if (item && typeof item === "object") {
            const row = item as Record<string, unknown>;
            return String(row.variables ?? row.value ?? row.name ?? "").trim();
          }
          return "";
        })
        .filter(Boolean);
    }
    if (parsed && typeof parsed === "object") {
      return Object.values(parsed as Record<string, unknown>)
        .map((v) => String(v).trim())
        .filter(Boolean);
    }
  } catch {
    /* fall through */
  }
  return s
    .split(/[\n,|]+/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function encodeFilterValues(values: string[]): string {
  return JSON.stringify(values.filter(Boolean).map((variables) => ({ variables })));
}

function toForm(row: FilterRow): FormState {
  const names = parseLocalePair(row.ec_filter_filters);
  return {
    category: String(row.ec_filter_category ?? ""),
    name_en: names.en,
    name_ar: names.ar,
    values: parseFilterValues(row.ec_filter_variables),
  };
}

export function FiltersManagePage() {
  const [items, setItems] = useState<FilterRow[]>([]);
  const [categories, setCategories] = useState<CategoryOpt[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "1" | "0">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [valueDraft, setValueDraft] = useState("");
  const [catQuery, setCatQuery] = useState("");

  const categoryMap = useMemo(() => {
    const map = new Map<number, CategoryOpt>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((row) => {
      if (statusFilter !== "all" && String(row.ec_filter_status) !== statusFilter) return false;
      if (categoryFilter !== "all" && String(row.ec_filter_category) !== categoryFilter) return false;
      if (!q) return true;
      const names = parseLocalePair(row.ec_filter_filters);
      const values = parseFilterValues(row.ec_filter_variables).join(" ");
      const cat = categoryMap.get(Number(row.ec_filter_category));
      return [names.en, names.ar, values, cat?.name, String(row.ec_filter_category), String(row.ec_filter_id)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [items, query, statusFilter, categoryFilter, categoryMap]);

  const stats = useMemo(() => {
    const active = items.filter((r) => Number(r.ec_filter_status) === 1).length;
    const cats = new Set(items.map((r) => Number(r.ec_filter_category))).size;
    const options = items.reduce((sum, r) => sum + parseFilterValues(r.ec_filter_variables).length, 0);
    return { total: items.length, active, cats, options };
  }, [items]);

  const categoryOptions = useMemo(() => {
    const used = new Map<number, CategoryOpt>();
    for (const c of categories) used.set(c.id, c);
    for (const row of items) {
      const id = Number(row.ec_filter_category);
      if (id && !used.has(id)) {
        used.set(id, { id, name: `Category #${id}`, parent: 0 });
      }
    }
    return Array.from(used.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, items]);

  const modalCategories = useMemo(() => {
    const q = catQuery.trim().toLowerCase();
    const list = categoryOptions;
    if (!q) return list.slice(0, 80);
    return list
      .filter((c) =>
        [c.name, c.parent_name, String(c.id)].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)),
      )
      .slice(0, 80);
  }, [categoryOptions, catQuery]);

  async function load() {
    setBusy(true);
    setError("");
    try {
      const [filtersRes, cats] = await Promise.all([
        adminApi.filters({ per_page: 200 }),
        adminApi.categories(),
      ]);
      setItems((filtersRes.items as FilterRow[]) || []);
      setTotal(filtersRes.total || 0);
      setCategories(
        (cats || []).map((c) => ({
          id: Number(c.id),
          name: String(c.name ?? `#${c.id}`),
          parent: Number(c.parent ?? 0),
          parent_name: (c.parent_name as string | null | undefined) ?? null,
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load filters");
      setItems([]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openAdd() {
    setEditId(null);
    setForm({ ...EMPTY_FORM, values: [] });
    setValueDraft("");
    setCatQuery("");
    setMsg("");
    setOpen(true);
  }

  useOpenAddQuery(openAdd);

  function openEdit(row: FilterRow) {
    setEditId(row.ec_filter_id);
    setForm(toForm(row));
    setValueDraft("");
    setCatQuery("");
    setMsg("");
    setOpen(true);
  }

  function addValue(raw?: string) {
    const next = (raw ?? valueDraft).trim();
    if (!next) return;
    setForm((prev) => {
      if (prev.values.some((v) => v.toLowerCase() === next.toLowerCase())) return prev;
      return { ...prev, values: [...prev.values, next] };
    });
    setValueDraft("");
  }

  function removeValue(index: number) {
    setForm((prev) => ({ ...prev, values: prev.values.filter((_, i) => i !== index) }));
  }

  async function save() {
    setMsg("");
    if (!form.category) {
      setMsg("Category is required.");
      return;
    }
    if (!form.name_en.trim()) {
      setMsg("English filter name is required.");
      return;
    }
    const body = {
      category: Number(form.category),
      filters: encodeLocalePair(form.name_en, form.name_ar),
      variables: encodeFilterValues(form.values),
    };
    setBusy(true);
    try {
      if (editId) await adminApi.updateFilter(editId, body);
      else await adminApi.createFilter(body);
      setOpen(false);
      setMsg(editId ? "Filter updated." : "Filter created.");
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function onToggle(row: FilterRow) {
    const next = Number(row.ec_filter_status) === 1 ? 0 : 1;
    setBusy(true);
    try {
      await adminApi.updateFilterStatus(row.ec_filter_id, next);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Status update failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(row: FilterRow) {
    const label = parseLocalePair(row.ec_filter_filters).en || `#${row.ec_filter_id}`;
    if (!window.confirm(`Delete filter “${label}”?`)) return;
    setBusy(true);
    try {
      await adminApi.deleteFilter(row.ec_filter_id);
      setMsg("Filter deleted.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page filters-manage-page">
      <header className="page-head">
        <div>
          <p className="settings-crumb">Catalog · Filters</p>
          <h1 className="page-title">Filter list</h1>
          <p className="page-sub">
            Category facets for storefront listing pages — bilingual titles and selectable sub-filter values.
          </p>
        </div>
        <div className="page-head-actions">
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void load()}>
            <RotateCcw size={15} aria-hidden />
            Refresh
          </button>
          <button type="button" className="btn btn-primary" onClick={openAdd}>
            <Plus size={16} aria-hidden />
            Add filter
          </button>
        </div>
      </header>

      {error ? <div className="banner error">{error}</div> : null}
      {msg && !open ? <div className="banner ok">{msg}</div> : null}

      <div className="card-grid filters-manage-stats">
        <div className="card stat-card">
          <h3>Filters</h3>
          <strong>{stats.total}</strong>
        </div>
        <div className="card stat-card">
          <h3>Active</h3>
          <strong>{stats.active}</strong>
        </div>
        <div className="card stat-card">
          <h3>Categories</h3>
          <strong>{stats.cats}</strong>
        </div>
        <div className="card stat-card">
          <h3>Sub values</h3>
          <strong>{stats.options}</strong>
        </div>
      </div>

      <div className="card filters-manage-card">
        <div className="panel-toolbar filters-manage-toolbar">
          <label className="filters-manage-search">
            <Search size={15} aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, value, category…"
              aria-label="Search filters"
            />
          </label>
          <div className="actions">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | "1" | "0")}>
              <option value="all">All statuses</option>
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">All categories</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
            <span className="muted">
              {filtered.length} shown
              {total && total !== items.length ? ` · ${total} total` : ""}
            </span>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>ID</th>
                <th>Filter</th>
                <th>Arabic</th>
                <th>Category</th>
                <th>Sub filters</th>
                <th>Status</th>
                <th style={{ width: 220 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const names = parseLocalePair(row.ec_filter_filters);
                const values = parseFilterValues(row.ec_filter_variables);
                const cat = categoryMap.get(Number(row.ec_filter_category));
                const active = Number(row.ec_filter_status) === 1;
                return (
                  <tr key={row.ec_filter_id} className={active ? undefined : "is-inactive"}>
                    <td className="mono muted">#{row.ec_filter_id}</td>
                    <td>
                      <strong>{names.en || decodeLocaleName(row.ec_filter_filters) || "Untitled"}</strong>
                    </td>
                    <td dir="rtl" className="muted">
                      {names.ar || "—"}
                    </td>
                    <td>
                      <div className="filters-manage-cat">
                        <span>{cat?.name || `Category #${row.ec_filter_category}`}</span>
                        {cat?.parent_name ? <span className="muted">{cat.parent_name}</span> : null}
                      </div>
                    </td>
                    <td>
                      <div className="filters-manage-values">
                        {values.length ? (
                          values.slice(0, 6).map((v) => (
                            <span key={v} className="filters-manage-chip">
                              {v}
                            </span>
                          ))
                        ) : (
                          <span className="muted">—</span>
                        )}
                        {values.length > 6 ? <span className="filters-manage-chip more">+{values.length - 6}</span> : null}
                      </div>
                    </td>
                    <td>
                      <span className={`settings-status ${active ? "ok" : "warn"}`}>{active ? "Active" : "Off"}</span>
                    </td>
                    <td>
                      <div className="actions">
                        <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void onToggle(row)}>
                          {active ? "Off" : "On"}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => openEdit(row)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={busy}
                          onClick={() => void onDelete(row)}
                          title="Delete"
                          aria-label="Delete"
                        >
                          <Trash2 size={14} aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length ? (
                <tr>
                  <td colSpan={7} className="muted" style={{ textAlign: "center", padding: "28px 12px" }}>
                    {busy ? (
                      <LoadingIndicator label="Loading filters" padded />
                    ) : query || statusFilter !== "all" || categoryFilter !== "all" ? (
                      "No filters match your filters."
                    ) : (
                      <div className="filters-manage-empty">
                        <p>No filters yet.</p>
                        <button type="button" className="btn btn-primary" onClick={openAdd}>
                          <Plus size={15} aria-hidden /> Add filter
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {open ? (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal-card filters-manage-modal" onClick={(e) => e.stopPropagation()}>
            <div className="page-head">
              <div>
                <h2>{editId ? "Edit filter" : "Add filter"}</h2>
                <p className="page-sub">Define the facet title and the selectable values shown on category pages.</p>
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>

            <div className="filters-manage-form">
              <label className="pf-field">
                <span className="pf-label">Category</span>
                <span className="pf-hint">Search by name or ID, then pick the category this facet belongs to</span>
                <input
                  value={catQuery}
                  onChange={(e) => setCatQuery(e.target.value)}
                  placeholder="Search categories…"
                />
                <select
                  value={form.category}
                  onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}
                >
                  <option value="">Select category</option>
                  {form.category && !modalCategories.some((c) => String(c.id) === form.category) ? (
                    <option value={form.category}>
                      {categoryMap.get(Number(form.category))?.name || `Category #${form.category}`}
                    </option>
                  ) : null}
                  {modalCategories.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.parent_name ? `${c.parent_name} → ` : ""}
                      {c.name} (#{c.id})
                    </option>
                  ))}
                </select>
              </label>

              <div className="filters-manage-form-grid">
                <label className="pf-field">
                  <span className="pf-label">Name (English)</span>
                  <input
                    value={form.name_en}
                    onChange={(e) => setForm((s) => ({ ...s, name_en: e.target.value }))}
                    placeholder="Brand"
                  />
                </label>
                <label className="pf-field">
                  <span className="pf-label">Name (Arabic)</span>
                  <input
                    value={form.name_ar}
                    onChange={(e) => setForm((s) => ({ ...s, name_ar: e.target.value }))}
                    placeholder="العلامة"
                    dir="rtl"
                  />
                </label>
              </div>

              <div className="pf-field">
                <span className="pf-label">Sub filter values</span>
                <span className="pf-hint">Options customers can select under this facet (e.g. brand names)</span>
                <div className="filters-manage-value-editor">
                  <div className="filters-manage-value-input">
                    <input
                      value={valueDraft}
                      onChange={(e) => setValueDraft(e.target.value)}
                      placeholder="Add a value and press Enter"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addValue();
                        }
                      }}
                    />
                    <button type="button" className="btn btn-secondary" onClick={() => addValue()}>
                      <Plus size={15} aria-hidden />
                      Add
                    </button>
                  </div>
                  <div className="filters-manage-values is-edit">
                    {form.values.length ? (
                      form.values.map((v, i) => (
                        <button
                          key={`${v}-${i}`}
                          type="button"
                          className="filters-manage-chip is-removable"
                          onClick={() => removeValue(i)}
                          title="Remove"
                        >
                          {v}
                          <X size={12} aria-hidden />
                        </button>
                      ))
                    ) : (
                      <span className="muted">No values yet — add at least one for a useful filter.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {msg ? <p className="error">{msg}</p> : null}

            <div className="filters-manage-modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void save()}>
                {busy ? "Saving…" : editId ? "Save changes" : "Create filter"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default FiltersManagePage;
