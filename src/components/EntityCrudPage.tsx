import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useOpenAddQuery } from "../lib/useOpenAddQuery";
import { ChevronRight } from "../lib/icons";

export type CrudField = {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "textarea" | "select" | "password";
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  createOnly?: boolean;
  editOnly?: boolean;
  placeholder?: string;
};

type Col = {
  key: string;
  label: string;
  render?: (row: Record<string, unknown>) => ReactNode;
};

type Props = {
  title: string;
  addLabel?: string;
  idKey: string;
  columns: Col[];
  fields?: CrudField[];
  load: () => Promise<{ items: Array<Record<string, unknown>>; total: number }>;
  create?: (body: Record<string, unknown>) => Promise<unknown>;
  update?: (id: number, body: Record<string, unknown>) => Promise<unknown>;
  remove?: (id: number) => Promise<unknown>;
  toggleStatus?: (id: number, nextStatus: number) => Promise<unknown>;
  statusKey?: string;
  mapEdit?: (row: Record<string, unknown>) => Record<string, string>;
  extraActions?: (row: Record<string, unknown>, reload: () => void) => ReactNode;
  settingsSection?: string;
  settingsSectionTo?: string;
  subtitle?: string;
  headerActions?: ReactNode;
  /** When true, omit outer page chrome (used inside Jobs / other hubs). */
  embedded?: boolean;
};

function emptyForm(fields: CrudField[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fields) out[f.key] = "";
  return out;
}

export function decodeLocaleName(raw: unknown): string {
  if (raw == null) return "";
  const s = String(raw);
  if (!s.startsWith("{") && !s.startsWith("[")) return s;
  try {
    const j = JSON.parse(s) as Record<string, string>;
    return j.English || j.english || j.en || Object.values(j)[0] || s;
  } catch {
    return s;
  }
}

export function EntityCrudPage({
  title,
  addLabel = "Add",
  idKey,
  columns,
  fields = [],
  load,
  create,
  update,
  remove,
  toggleStatus,
  statusKey,
  mapEdit,
  extraActions,
  settingsSection,
  settingsSectionTo,
  subtitle,
  headerActions,
  embedded = false,
}: Props) {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, string>>(() => emptyForm(fields));

  async function refresh() {
    setError("");
    try {
      const res = await load();
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  function openAdd() {
    setEditId(null);
    setForm(emptyForm(fields));
    setMsg("");
    setOpen(true);
  }

  useOpenAddQuery(openAdd);

  function openEdit(row: Record<string, unknown>) {
    setEditId(Number(row[idKey]));
    setForm(mapEdit ? mapEdit(row) : emptyForm(fields));
    setMsg("");
    setOpen(true);
  }

  async function save() {
    setMsg("");
    const body: Record<string, unknown> = {};
    for (const f of fields) {
      if (editId && f.createOnly) continue;
      if (!editId && f.editOnly) continue;
      const v = form[f.key] ?? "";
      if (f.required && !v.trim()) {
        setMsg(`${f.label} is required`);
        return;
      }
      if (f.type === "number" && v !== "") body[f.key] = Number(v);
      else if (v !== "" || f.required) body[f.key] = v;
    }
    try {
      if (editId && update) await update(editId, body);
      else if (create) await create(body);
      else return;
      setOpen(false);
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function onToggle(row: Record<string, unknown>) {
    if (!toggleStatus || !statusKey) return;
    const cur = Number(row[statusKey]) === 1 ? 1 : 0;
    await toggleStatus(Number(row[idKey]), cur === 1 ? 0 : 1);
    await refresh();
  }

  async function onDelete(id: number) {
    if (!remove || !confirm("Delete this record?")) return;
    await remove(id);
    await refresh();
  }

  const visibleFields = fields.filter((f) => {
    if (editId && f.createOnly) return false;
    if (!editId && f.editOnly) return false;
    return true;
  });

  return (
    <div className={settingsSection && !embedded ? "page settings-form-page" : undefined}>
      {embedded ? (
        <div className="panel-toolbar" style={{ marginBottom: 12 }}>
          <span className="muted">{subtitle ?? `${total} records`}</span>
          <div className="actions">
            {headerActions}
            <button type="button" className="btn btn-secondary" onClick={() => void refresh()}>
              Refresh
            </button>
            {create ? (
              <button type="button" className="btn" onClick={openAdd}>
                {addLabel}
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="page-head">
          <div>
            {settingsSection ? (
              <p className="settings-crumb">
                <Link to="/settings">Settings</Link>
                <ChevronRight size={14} aria-hidden />
                {settingsSectionTo ? (
                  <>
                    <Link to={settingsSectionTo}>{settingsSection}</Link>
                    <ChevronRight size={14} aria-hidden />
                  </>
                ) : null}
                <span>{title}</span>
              </p>
            ) : null}
            <h1 className={settingsSection ? "page-title" : undefined}>{title}</h1>
            <p className="page-sub">{subtitle ?? `${total} records`}</p>
          </div>
          {headerActions || create ? (
            <div className="page-head-actions">
              {headerActions}
              {create ? (
                <button type="button" className="btn" onClick={openAdd}>
                  {addLabel}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
      {error ? <p className="error">{error}</p> : null}
      <div className="card">
        {!embedded ? (
          <div className="panel-toolbar">
            <span className="muted">List</span>
            <div className="actions">
              <button type="button" className="btn btn-secondary" onClick={() => void refresh()}>
                Refresh
              </button>
            </div>
          </div>
        ) : null}
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
                {toggleStatus || update || remove || extraActions ? <th>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={String(row[idKey])}>
                  {columns.map((c) => (
                    <td key={c.key}>{c.render ? c.render(row) : String(row[c.key] ?? "-")}</td>
                  ))}
                  {toggleStatus || update || remove || extraActions ? (
                    <td className="actions">
                      {toggleStatus && statusKey ? (
                        <button type="button" className="btn btn-secondary" onClick={() => void onToggle(row)}>
                          {Number(row[statusKey]) === 1 ? "Deactivate" : "Activate"}
                        </button>
                      ) : null}
                      {update ? (
                        <button type="button" className="btn btn-secondary" onClick={() => openEdit(row)}>
                          Edit
                        </button>
                      ) : null}
                      {remove ? (
                        <button type="button" className="btn btn-secondary" onClick={() => void onDelete(Number(row[idKey]))}>
                          Delete
                        </button>
                      ) : null}
                      {extraActions ? extraActions(row, () => void refresh()) : null}
                    </td>
                  ) : null}
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="muted">
                    No records
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {open ? (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="page-head">
              <h2>
                {editId ? "Edit" : "Add"} — {title}
              </h2>
              <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            {visibleFields.map((f) => (
              <label key={f.key} className="field">
                {f.label}
                {f.type === "textarea" ? (
                  <textarea
                    value={form[f.key] ?? ""}
                    placeholder={f.placeholder}
                    rows={4}
                    onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                  />
                ) : f.type === "select" ? (
                  <select
                    value={form[f.key] ?? ""}
                    onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                  >
                    <option value="">Select</option>
                    {(f.options ?? []).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type === "password" ? "password" : f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                    value={form[f.key] ?? ""}
                    placeholder={f.placeholder}
                    onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                  />
                )}
              </label>
            ))}
            {msg ? <p className="error">{msg}</p> : null}
            <button type="button" className="btn" onClick={() => void save()}>
              Submit
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
