import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, RotateCcw, Search, Trash2 } from "../lib/icons";
import { adminApi } from "../lib/api";
import { useOpenAddQuery } from "../lib/useOpenAddQuery";
import { LoadingIndicator } from "../components/LoadingIndicator";

type VariantRow = {
  id: number;
  title: string;
  title_en?: string;
  title_ar?: string;
  status: number;
  usage_count?: number;
  created_at?: string | null;
};

type FormState = {
  title: string;
  title_ar: string;
  status: boolean;
};

const EMPTY_FORM: FormState = {
  title: "",
  title_ar: "",
  status: true,
};

const QUICK_PRESETS: { label: string; titles: string[] }[] = [
  {
    label: "Size",
    titles: ["XS", "S", "M", "L", "XL", "XXL"],
  },
  {
    label: "Volume",
    titles: ["250ml", "330ml", "500ml", "750ml", "1L", "1.5L", "2L"],
  },
  {
    label: "Weight",
    titles: ["100g", "250g", "500g", "1kg", "2kg", "5kg"],
  },
  {
    label: "Pack",
    titles: ["Single", "Pack of 2", "Pack of 4", "Pack of 6", "Pack of 12", "Case"],
  },
];

export function VariantsManagePage() {
  const [items, setItems] = useState<VariantRow[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "1" | "0">("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [bulkText, setBulkText] = useState("");
  const [selectedPresets, setSelectedPresets] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((row) => {
      if (statusFilter !== "all" && String(row.status) !== statusFilter) return false;
      if (!q) return true;
      return [row.title, row.title_en, row.title_ar, String(row.id)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [items, query, statusFilter]);

  const stats = useMemo(() => {
    const active = items.filter((r) => Number(r.status) === 1).length;
    const used = items.filter((r) => Number(r.usage_count || 0) > 0).length;
    const usages = items.reduce((sum, r) => sum + Number(r.usage_count || 0), 0);
    return { total: items.length, active, used, usages };
  }, [items]);

  async function load() {
    setBusy(true);
    setError("");
    try {
      const res = await adminApi.variants({
        per_page: 200,
        ...(query.trim() ? { q: query.trim() } : {}),
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      });
      setItems((res.items as VariantRow[]) || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load variants");
      setItems([]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openAdd() {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setMsg("");
    setOpen(true);
  }

  useOpenAddQuery(openAdd);

  function openEdit(row: VariantRow) {
    setEditId(row.id);
    setForm({
      title: row.title_en || row.title || "",
      title_ar: row.title_ar || "",
      status: Number(row.status) === 1,
    });
    setMsg("");
    setOpen(true);
  }

  function openBulk() {
    setBulkText("");
    setSelectedPresets([]);
    setMsg("");
    setBulkOpen(true);
  }

  function togglePresetTitle(title: string) {
    setSelectedPresets((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title],
    );
  }

  function addPresetGroup(titles: string[]) {
    setSelectedPresets((prev) => Array.from(new Set([...prev, ...titles])));
  }

  async function save() {
    setMsg("");
    if (!form.title.trim()) {
      setMsg("English title is required.");
      return;
    }
    setBusy(true);
    try {
      const body = {
        title: form.title.trim(),
        title_ar: form.title_ar.trim(),
        status: form.status ? 1 : 0,
      };
      if (editId) await adminApi.updateVariant(editId, body);
      else await adminApi.createVariant(body);
      setOpen(false);
      setMsg(editId ? "Variant updated." : "Variant created.");
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveBulk() {
    setMsg("");
    const fromText = bulkText
      .split(/[\n,;|]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    const titles = Array.from(new Set([...selectedPresets, ...fromText]));
    if (!titles.length) {
      setMsg("Add at least one title.");
      return;
    }
    setBusy(true);
    try {
      const res = await adminApi.bulkCreateVariants(titles);
      setBulkOpen(false);
      setMsg(
        `Created ${res.created_count} variant${res.created_count === 1 ? "" : "s"}` +
          (res.skipped_count ? ` · skipped ${res.skipped_count} duplicate${res.skipped_count === 1 ? "" : "s"}` : "") +
          ".",
      );
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Bulk create failed");
    } finally {
      setBusy(false);
    }
  }

  async function onToggle(row: VariantRow) {
    const next = Number(row.status) === 1 ? 0 : 1;
    setBusy(true);
    try {
      await adminApi.updateVariantStatus(row.id, next);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Status update failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(row: VariantRow) {
    const label = row.title_en || row.title || `#${row.id}`;
    const usage = Number(row.usage_count || 0);
    const warn =
      usage > 0
        ? `“${label}” is used on ${usage} product${usage === 1 ? "" : "s"}. Delete anyway?`
        : `Delete variant “${label}”?`;
    if (!window.confirm(warn)) return;
    setBusy(true);
    try {
      await adminApi.deleteVariant(row.id);
      setMsg("Variant deleted.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page variants-manage-page">
      <header className="page-head">
        <div>
          <p className="settings-crumb">Catalog · Variants</p>
          <h1 className="page-title">Variant / pack labels</h1>
          <p className="page-sub">
            Optional merchandising labels (Family pack, Large, Red). They are <strong>not</strong> separate priced SKUs.
            Piece vs kg vs case is set on each product under <Link to="/units">Units / sell mode</Link>. Different pack
            barcodes = separate products.
          </p>
        </div>
        <div className="page-head-actions">
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void load()}>
            <RotateCcw size={15} aria-hidden />
            Refresh
          </button>
          <button type="button" className="btn btn-secondary" onClick={openBulk}>
            Bulk add
          </button>
          <button type="button" className="btn btn-primary" onClick={openAdd}>
            <Plus size={16} aria-hidden />
            Add variant
          </button>
        </div>
      </header>

      {error ? <div className="banner error">{error}</div> : null}
      {msg && !open && !bulkOpen ? <div className="banner ok">{msg}</div> : null}

      <div className="card-grid variants-manage-stats">
        <div className="card stat-card">
          <h3>Titles</h3>
          <strong>{stats.total}</strong>
        </div>
        <div className="card stat-card">
          <h3>Active</h3>
          <strong>{stats.active}</strong>
        </div>
        <div className="card stat-card">
          <h3>In use</h3>
          <strong>{stats.used}</strong>
        </div>
        <div className="card stat-card">
          <h3>Product links</h3>
          <strong>{stats.usages}</strong>
        </div>
      </div>

      <div className="card variants-manage-card">
        <div className="panel-toolbar variants-manage-toolbar">
          <label className="variants-manage-search">
            <Search size={15} aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles…"
              aria-label="Search variants"
              onKeyDown={(e) => {
                if (e.key === "Enter") void load();
              }}
            />
          </label>
          <div className="actions">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | "1" | "0")}>
              <option value="all">All statuses</option>
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void load()}>
              Apply
            </button>
            <span className="muted">{filtered.length} shown</span>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Arabic</th>
                <th>Usage</th>
                <th>Status</th>
                <th style={{ width: 220 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const active = Number(row.status) === 1;
                const usage = Number(row.usage_count || 0);
                return (
                  <tr key={row.id} className={active ? undefined : "is-inactive"}>
                    <td className="mono muted">#{row.id}</td>
                    <td>
                      <strong>{row.title_en || row.title || "Untitled"}</strong>
                    </td>
                    <td dir="rtl" className="muted">
                      {row.title_ar || "—"}
                    </td>
                    <td>{usage > 0 ? `${usage} product${usage === 1 ? "" : "s"}` : "—"}</td>
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
                  <td colSpan={6} className="muted" style={{ textAlign: "center", padding: "28px 12px" }}>
                    {busy ? (
                      <LoadingIndicator label="Loading variants" padded />
                    ) : query || statusFilter !== "all" ? (
                      "No variants match your filters."
                    ) : (
                      <div className="variants-manage-empty">
                        <p>No variant titles yet.</p>
                        <div className="actions" style={{ justifyContent: "center" }}>
                          <button type="button" className="btn btn-secondary" onClick={openBulk}>
                            Bulk add presets
                          </button>
                          <button type="button" className="btn btn-primary" onClick={openAdd}>
                            <Plus size={15} aria-hidden /> Add variant
                          </button>
                        </div>
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
          <div className="modal-card variants-manage-modal" onClick={(e) => e.stopPropagation()}>
            <div className="page-head">
              <div>
                <h2>{editId ? "Edit variant" : "Add variant"}</h2>
                <p className="page-sub">Titles become selectable chips on product create / edit forms.</p>
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>

            <div className="variants-manage-form">
              <div className="variants-manage-form-grid">
                <label className="pf-field">
                  <span className="pf-label">Title (English)</span>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                    placeholder="e.g. 500ml, Large, Pack of 6"
                    autoFocus
                  />
                </label>
                <label className="pf-field">
                  <span className="pf-label">Title (Arabic)</span>
                  <input
                    value={form.title_ar}
                    onChange={(e) => setForm((s) => ({ ...s, title_ar: e.target.value }))}
                    placeholder="اختياري"
                    dir="rtl"
                  />
                </label>
              </div>
              <label className="settings-toggle">
                <span className="settings-toggle-copy">
                  <span className="pf-label">Active</span>
                  <span className="pf-hint">Inactive titles stay hidden from product pickers</span>
                </span>
                <input
                  type="checkbox"
                  checked={form.status}
                  onChange={(e) => setForm((s) => ({ ...s, status: e.target.checked }))}
                />
              </label>
            </div>

            {msg ? <p className="error">{msg}</p> : null}

            <div className="variants-manage-modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void save()}>
                {busy ? "Saving…" : editId ? "Save changes" : "Create variant"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {bulkOpen ? (
        <div className="modal-backdrop" onClick={() => setBulkOpen(false)}>
          <div className="modal-card variants-manage-modal is-wide" onClick={(e) => e.stopPropagation()}>
            <div className="page-head">
              <div>
                <h2>Bulk add variants</h2>
                <p className="page-sub">Pick quick presets and/or paste a list. Duplicates are skipped automatically.</p>
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => setBulkOpen(false)}>
                Close
              </button>
            </div>

            <div className="variants-manage-form">
              {QUICK_PRESETS.map((group) => (
                <div key={group.label} className="variants-manage-preset-group">
                  <div className="variants-manage-preset-head">
                    <strong>{group.label}</strong>
                    <button type="button" className="btn btn-secondary" onClick={() => addPresetGroup(group.titles)}>
                      Add all
                    </button>
                  </div>
                  <div className="variants-manage-preset-chips">
                    {group.titles.map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={`variants-manage-chip${selectedPresets.includes(t) ? " is-selected" : ""}`}
                        onClick={() => togglePresetTitle(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <label className="pf-field">
                <span className="pf-label">Or paste titles</span>
                <span className="pf-hint">One per line, or comma / semicolon separated</span>
                <textarea
                  rows={5}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={"500ml\n1L\nPack of 6"}
                />
              </label>

              {selectedPresets.length ? (
                <div className="variants-manage-selected">
                  <span className="pf-label">Selected presets ({selectedPresets.length})</span>
                  <div className="variants-manage-preset-chips">
                    {selectedPresets.map((t) => (
                      <button
                        key={t}
                        type="button"
                        className="variants-manage-chip is-selected"
                        onClick={() => togglePresetTitle(t)}
                        title="Remove"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {msg ? <p className="error">{msg}</p> : null}

            <div className="variants-manage-modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setBulkOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void saveBulk()}>
                {busy ? "Creating…" : "Create selected"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default VariantsManagePage;
