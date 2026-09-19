import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { RotateCcw, Search, Trash2 } from "../lib/icons";
import { adminApi } from "../lib/api";
import { useOpenAddQuery } from "../lib/useOpenAddQuery";
import { LoadingIndicator } from "../components/LoadingIndicator";

type AttrRow = {
  ec_p_id: number;
  ec_p_title: string;
  ec_p_status: number;
  ec_p_createddate?: string | null;
};

type FormState = {
  title: string;
  status: boolean;
};

const EMPTY_FORM: FormState = { title: "", status: true };

export function AttributesManagePage() {
  const [items, setItems] = useState<AttrRow[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "1" | "0">("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((row) => {
      if (statusFilter !== "all" && String(row.ec_p_status) !== statusFilter) return false;
      if (!q) return true;
      return [row.ec_p_title, String(row.ec_p_id)].some((v) => String(v).toLowerCase().includes(q));
    });
  }, [items, query, statusFilter]);

  const stats = useMemo(() => {
    const active = items.filter((r) => Number(r.ec_p_status) === 1).length;
    return { total: items.length, active };
  }, [items]);

  async function load() {
    setBusy(true);
    setError("");
    try {
      const rows = await adminApi.parameters({ all: true });
      setItems(
        (rows as AttrRow[]).map((r) => ({
          ec_p_id: Number(r.ec_p_id),
          ec_p_title: String(r.ec_p_title ?? ""),
          ec_p_status: Number(r.ec_p_status ?? 0),
          ec_p_createddate: (r.ec_p_createddate as string | null) ?? null,
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load attributes");
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
    setForm({ ...EMPTY_FORM });
    setMsg("");
    setOpen(true);
  }

  useOpenAddQuery(openAdd);

  function openEdit(row: AttrRow) {
    setEditId(row.ec_p_id);
    setForm({ title: row.ec_p_title || "", status: Number(row.ec_p_status) === 1 });
    setMsg("");
    setOpen(true);
  }

  async function save() {
    setMsg("");
    if (!form.title.trim()) {
      setMsg("Attribute name is required.");
      return;
    }
    setBusy(true);
    try {
      if (editId) {
        await adminApi.updateParameter(editId, {
          title: form.title.trim(),
          status: form.status ? 1 : 0,
        });
      } else {
        await adminApi.createParameter({ title: form.title.trim() });
      }
      setOpen(false);
      setMsg(editId ? "Attribute updated." : "Attribute created.");
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function onToggle(row: AttrRow) {
    const next = Number(row.ec_p_status) === 1 ? 0 : 1;
    setBusy(true);
    try {
      await adminApi.updateParameterStatus(row.ec_p_id, next);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Status update failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(row: AttrRow) {
    if (!window.confirm(`Delete attribute “${row.ec_p_title}”?`)) return;
    setBusy(true);
    try {
      await adminApi.deleteParameter(row.ec_p_id);
      setMsg("Attribute deleted.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page attr-page">
      <header className="page-head">
        <div>
          <p className="settings-crumb">Catalog · Attributes</p>
          <h1 className="page-title">Attributes</h1>
          <p className="page-sub">
            Catalog attribute / parameter groups (color, size, dietary). Assign on each product form under
            Attributes. Localized copy strings live under Parameter values.
          </p>
        </div>
        <div className="page-head-actions">
          <Link className="btn btn-secondary" to="/settings/parameter-values">
            Parameter values
          </Link>
          <button type="button" className="btn btn-primary" onClick={openAdd}>
            Add attribute
          </button>
        </div>
      </header>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}

      <div className="card attr-card">
        <div className="panel-toolbar brand-toolbar">
          <div className="brand-search-wrap">
            <Search size={14} aria-hidden />
            <input
              className="brand-search"
              value={query}
              placeholder="Search attribute or ID…"
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="brand-toolbar-end">
            <div className="brand-status-tabs" role="tablist">
              {(
                [
                  ["all", "All"],
                  ["1", "Active"],
                  ["0", "Off"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`brand-status-tab${statusFilter === value ? " active" : ""}`}
                  onClick={() => setStatusFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void load()} disabled={busy}>
              <RotateCcw size={13} aria-hidden /> Refresh
            </button>
          </div>
        </div>

        <p className="muted brand-hint">
          {stats.total} attributes · {stats.active} active · {filtered.length} shown
        </p>

        <div className="table-wrap">
          <table className="data brand-table">
            <thead>
              <tr>
                <th className="brand-id-col">ID</th>
                <th>Attribute</th>
                <th className="brand-status-col">Status</th>
                <th className="brand-actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.ec_p_id} className={row.ec_p_status !== 1 ? "is-off" : undefined}>
                  <td className="brand-id-col muted">#{row.ec_p_id}</td>
                  <td>
                    <button type="button" className="brand-name-link" onClick={() => openEdit(row)}>
                      {row.ec_p_title || `Attribute #${row.ec_p_id}`}
                    </button>
                  </td>
                  <td className="brand-status-col">
                    <span className={`status-pill ${row.ec_p_status === 1 ? "is-on" : "is-off"}`}>
                      {row.ec_p_status === 1 ? "Active" : "Off"}
                    </span>
                  </td>
                  <td className="brand-actions-col">
                    <div className="brand-row-actions">
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(row)}>
                        Edit
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => void onToggle(row)}>
                        {row.ec_p_status === 1 ? "Deactivate" : "Activate"}
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => void onDelete(row)}>
                        <Trash2 size={13} aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && !busy ? (
                <tr>
                  <td colSpan={4} className="muted">
                    No attributes yet — use <strong>Add attribute</strong> to create one.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {busy && !items.length ? <LoadingIndicator label="Loading attributes…" /> : null}
      </div>

      {open ? (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal-card brand-modal" onClick={(e) => e.stopPropagation()}>
            <div className="page-head">
              <h2>{editId ? "Edit attribute" : "Add attribute"}</h2>
              <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            <div className="brand-modal-body">
              <label className="pf-field">
                <span className="pf-label">Attribute name</span>
                <input
                  value={form.title}
                  onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                  placeholder="e.g. Color"
                />
              </label>
              {editId ? (
                <label className="pf-field">
                  <span className="pf-label">Status</span>
                  <select
                    value={form.status ? "1" : "0"}
                    onChange={(e) => setForm((s) => ({ ...s, status: e.target.value === "1" }))}
                  >
                    <option value="1">Active</option>
                    <option value="0">Off</option>
                  </select>
                </label>
              ) : null}
              {msg ? <p className="error">{msg}</p> : null}
              <div className="brand-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void save()}>
                  {busy ? "Saving…" : editId ? "Save changes" : "Create attribute"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
