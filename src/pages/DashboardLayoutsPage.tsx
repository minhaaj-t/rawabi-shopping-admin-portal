import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus } from "../lib/icons";
import { adminApi } from "../lib/api";
import { normalizeLayout, type DashboardAssignment, type DashboardLayout } from "../lib/dashboard-layout";
import { ROLE_CATALOG, roleLabel } from "../lib/roles";

export function DashboardLayoutsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<DashboardLayout[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignOpen, setAssignOpen] = useState<DashboardLayout | null>(null);
  const [staff, setStaff] = useState<Array<{ id: number; username: string; user_level: number }>>([]);
  const [assignDraft, setAssignDraft] = useState<DashboardAssignment[]>([]);

  const refresh = useCallback(async () => {
    setError("");
    try {
      const rows = await adminApi.dashboardLayouts();
      setItems(rows.map((r) => normalizeLayout(r as Record<string, unknown>)!).filter(Boolean));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboards");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const levels = useMemo(
    () =>
      Object.values(ROLE_CATALOG)
        .filter((r) => r.portal)
        .map((r) => ({ level: r.level, label: r.label })),
    [],
  );

  async function create() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      const created = await adminApi.createDashboardLayout({
        title: title.trim(),
        description: description.trim(),
        seed_default_blocks: true,
      });
      setCreateOpen(false);
      setTitle("");
      setDescription("");
      navigate(`/dashboards/${created.id}/edit`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function openAssign(row: DashboardLayout) {
    setAssignOpen(row);
    setAssignDraft(row.assignments.length ? [...row.assignments] : [{ assign_type: "all", assign_ref: 0 }]);
    try {
      const res = await adminApi.staff({ per_page: 100 });
      setStaff(
        (res.items as Array<Record<string, unknown>>).map((s) => ({
          id: Number(s.id ?? s.ec_user_id),
          username: String(s.username ?? s.ec_username ?? "User"),
          user_level: Number(s.user_level ?? 0),
        })),
      );
    } catch {
      setStaff([]);
    }
  }

  async function saveAssign() {
    if (!assignOpen) return;
    setBusy(true);
    try {
      await adminApi.syncDashboardAssignments(assignOpen.id, assignDraft);
      setAssignOpen(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Assign failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: number) {
    if (!confirm("Delete this dashboard layout?")) return;
    await adminApi.deleteDashboardLayout(id);
    await refresh();
  }

  function assignmentSummary(row: DashboardLayout): string {
    if (!row.assignments.length) return "Unassigned";
    return row.assignments
      .map((a) => {
        if (a.assign_type === "all") return "Everyone";
        if (a.assign_type === "level") return `Level: ${roleLabel(a.assign_ref)}`;
        return `User #${a.assign_ref}`;
      })
      .join(", ");
  }

  return (
    <div className="page dash-layouts-page">
      <header className="page-head">
        <div>
          <p className="settings-crumb">Operations · Dashboards</p>
          <h1 className="page-title">Dashboard builder</h1>
          <p className="page-sub">
            Create block-based sub-dashboards and assign them to staff users or role levels.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}>
          <Plus size={16} aria-hidden /> New dashboard
        </button>
      </header>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="card">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Title</th>
                <th>Slug</th>
                <th>Blocks</th>
                <th>Assigned to</th>
                <th>Default</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.title}</strong>
                    {row.description ? <div className="muted">{row.description}</div> : null}
                  </td>
                  <td>
                    <code>{row.slug}</code>
                  </td>
                  <td>{row.blocks.filter((b) => b.enabled).length} active</td>
                  <td className="wrap">{assignmentSummary(row)}</td>
                  <td>{row.is_default ? "Yes" : "—"}</td>
                  <td>{row.status === 1 ? "Active" : "Off"}</td>
                  <td>
                    <div className="cat-row-actions">
                      <Link className="btn btn-secondary btn-sm" to={`/dashboards/${row.id}/edit`}>
                        Builder
                      </Link>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => void openAssign(row)}>
                        Assign
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => void onDelete(row.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length ? (
                <tr>
                  <td colSpan={7} className="muted">
                    No dashboards yet
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {createOpen ? (
        <div className="modal-backdrop" onClick={() => setCreateOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="page-head">
              <h2>New dashboard</h2>
              <button type="button" className="btn btn-secondary" onClick={() => setCreateOpen(false)}>
                Close
              </button>
            </div>
            <div className="pf-grid" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <label className="pf-field">
                <span className="pf-label">Title</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Care team dashboard" />
              </label>
              <label className="pf-field">
                <span className="pf-label">Description</span>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
              </label>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void create()}>
                {busy ? "Creating…" : "Create & open builder"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {assignOpen ? (
        <div className="modal-backdrop" onClick={() => setAssignOpen(null)}>
          <div className="modal-card dash-assign-modal" onClick={(e) => e.stopPropagation()}>
            <div className="page-head">
              <h2>Assign · {assignOpen.title}</h2>
              <button type="button" className="btn btn-secondary" onClick={() => setAssignOpen(null)}>
                Close
              </button>
            </div>
            <div className="dash-assign-body">
              <p className="muted">
                Resolution order: specific user → role level → everyone / default.
              </p>
              <div className="dash-assign-list">
                {assignDraft.map((a, idx) => (
                  <div className="dash-assign-row" key={`${a.assign_type}-${a.assign_ref}-${idx}`}>
                    <select
                      value={a.assign_type}
                      onChange={(e) => {
                        const assign_type = e.target.value;
                        setAssignDraft((prev) =>
                          prev.map((x, i) =>
                            i === idx
                              ? { assign_type, assign_ref: assign_type === "all" ? 0 : x.assign_ref || 0 }
                              : x,
                          ),
                        );
                      }}
                    >
                      <option value="all">Everyone</option>
                      <option value="level">Role level</option>
                      <option value="user">Staff user</option>
                    </select>
                    {a.assign_type === "level" ? (
                      <select
                        value={a.assign_ref || ""}
                        onChange={(e) =>
                          setAssignDraft((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, assign_ref: Number(e.target.value) } : x)),
                          )
                        }
                      >
                        <option value="">Select level</option>
                        {levels.map((l) => (
                          <option key={l.level} value={l.level}>
                            {l.label} ({l.level})
                          </option>
                        ))}
                      </select>
                    ) : null}
                    {a.assign_type === "user" ? (
                      <select
                        value={a.assign_ref || ""}
                        onChange={(e) =>
                          setAssignDraft((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, assign_ref: Number(e.target.value) } : x)),
                          )
                        }
                      >
                        <option value="">Select user</option>
                        {staff.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.username} · {roleLabel(s.user_level)}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setAssignDraft((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <div className="dash-assign-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setAssignDraft((prev) => [...prev, { assign_type: "level", assign_ref: 2 }])}
                >
                  Add rule
                </button>
                <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void saveAssign()}>
                  {busy ? "Saving…" : "Save assignments"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
