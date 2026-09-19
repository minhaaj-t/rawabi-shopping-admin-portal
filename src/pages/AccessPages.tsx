import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { ChevronRight, UserCog, UserPlus } from "../lib/icons";
import { adminApi } from "../lib/api";
import { canManageStaff, isSuperAdmin } from "../lib/auth";
import { useOpenAddQuery } from "../lib/useOpenAddQuery";
import { StoreSinglePicker } from "../components/StoreSinglePicker";
import type { StoreOption } from "../components/StoreMultiPicker";
import {
  needsFloor,
  needsStore,
  roleLabel,
} from "../lib/roles";

type StaffRow = Record<string, unknown>;

export function RolesAccessPage() {
  type RoleRow = {
    level: number;
    key: string;
    label: string;
    description: string;
    portal: boolean;
    permissions: string[];
    builtin?: boolean;
    custom?: boolean;
  };

  type PermOption = { key: string; label: string; group: string };

  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [permCatalog, setPermCatalog] = useState<PermOption[]>([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editLevel, setEditLevel] = useState<number | null>(null);
  const [form, setForm] = useState({
    key: "",
    label: "",
    description: "",
    portal: true,
    permissions: [] as string[],
  });
  const [busy, setBusy] = useState(false);

  async function load() {
    setError("");
    try {
      const d = await adminApi.accessRoles();
      setRoles(d.roles as RoleRow[]);
      setPermCatalog(d.permission_catalog);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load roles");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const permGroups = useMemo(() => {
    const map = new Map<string, PermOption[]>();
    for (const p of permCatalog) {
      const g = p.group || "Other";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(p);
    }
    return map;
  }, [permCatalog]);

  function openCreate() {
    setEditLevel(null);
    setForm({ key: "", label: "", description: "", portal: true, permissions: ["dashboard"] });
    setShowForm(true);
    setMsg("");
  }

  function openEdit(role: RoleRow) {
    setEditLevel(role.level);
    setForm({
      key: role.key,
      label: role.label,
      description: role.description,
      portal: role.portal,
      permissions: [...role.permissions],
    });
    setShowForm(true);
    setMsg("");
  }

  function togglePerm(key: string) {
    setForm((f) => {
      if (key === "*") {
        return { ...f, permissions: f.permissions.includes("*") ? [] : ["*"] };
      }
      const withoutStar = f.permissions.filter((p) => p !== "*");
      return {
        ...f,
        permissions: withoutStar.includes(key)
          ? withoutStar.filter((p) => p !== key)
          : [...withoutStar, key],
      };
    });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (form.permissions.length === 0) {
      setError("Select at least one permission.");
      return;
    }
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const body = {
        key: form.key,
        label: form.label,
        description: form.description,
        portal: form.portal,
        permissions: form.permissions,
      };
      if (editLevel != null) {
        await adminApi.updateAccessRole(editLevel, body);
        setMsg(`Role "${form.label}" updated.`);
      } else {
        await adminApi.createAccessRole(body);
        setMsg(`Role "${form.label}" created.`);
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeRole(role: RoleRow) {
    if (!confirm(`Delete role "${role.label}" (level ${role.level})?`)) return;
    setError("");
    try {
      await adminApi.deleteAccessRole(role.level);
      setMsg("Role deleted.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function resetRole(role: RoleRow) {
    if (!confirm(`Reset "${role.label}" to factory defaults?`)) return;
    setError("");
    try {
      await adminApi.resetAccessRole(role.level);
      setMsg("Role reset to defaults.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    }
  }

  if (!isSuperAdmin()) return <Navigate to="/" replace />;

  const editingSuper = editLevel === 1;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="settings-crumb">
            <Link to="/access">Users & access</Link>
            <ChevronRight size={14} aria-hidden />
            <span>Roles & permissions</span>
          </p>
          <h1 className="page-title">Roles & permissions</h1>
          <p className="page-sub">
            Super admin can edit built-in roles or add custom roles (level 12+). Assign roles on the staff page.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          <UserPlus size={16} aria-hidden /> Add role
        </button>
      </header>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}

      <div className="access-roles-grid">
        {roles.map((role) => {
          const perms = role.permissions;
          return (
            <article key={role.level} className="card access-role-card">
              <header>
                <UserCog size={18} aria-hidden />
                <div>
                  <h2>{role.label}</h2>
                  <span className="access-role-level">
                    Level {role.level} · {role.key}
                    {role.custom ? " · custom" : role.builtin ? " · built-in" : ""}
                  </span>
                </div>
                <span className={`settings-status ${role.portal ? "ok" : "warn"}`}>
                  {role.portal ? "Portal" : "Field app"}
                </span>
              </header>
              <p>{role.description || "—"}</p>
              <div className="access-perms">
                {perms.map((p) => (
                  <span key={p} className="access-perm-tag">
                    {p}
                  </span>
                ))}
              </div>
              <div className="access-role-actions">
                <button type="button" className="btn" onClick={() => openEdit(role)}>
                  Edit
                </button>
                {role.builtin && !role.custom ? (
                  <button type="button" className="btn btn-secondary" onClick={() => void resetRole(role)}>
                    Reset
                  </button>
                ) : null}
                {role.custom ? (
                  <button type="button" className="btn btn-secondary" onClick={() => void removeRole(role)}>
                    Delete
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {showForm ? (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal-card role-editor-modal" onClick={(ev) => ev.stopPropagation()}>
            <div className="page-head">
              <h2>{editLevel != null ? `Edit role — level ${editLevel}` : "Add custom role"}</h2>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                Close
              </button>
            </div>
            <form onSubmit={(e) => void save(e)}>
              <div className="settings-form-grid">
                <label className="pf-field">
                  <span className="pf-label">Role key</span>
                  <span className="pf-hint">Lowercase identifier, e.g. regional_manager</span>
                  <input
                    value={form.key}
                    onChange={(e) => setForm({ ...form, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
                    required
                    pattern="[a-z][a-z0-9_]*"
                    disabled={editLevel != null && editLevel <= 11}
                  />
                </label>
                <label className="pf-field">
                  <span className="pf-label">Display name</span>
                  <input
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    required
                  />
                </label>
                <label className="pf-field pf-span-2">
                  <span className="pf-label">Description</span>
                  <textarea
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </label>
                <label className="pf-field pf-check-row">
                  <input
                    type="checkbox"
                    checked={form.portal}
                    onChange={(e) => setForm({ ...form, portal: e.target.checked })}
                    disabled={editingSuper}
                  />
                  <span>Can sign in to admin portal</span>
                </label>
              </div>

              <div className="role-perm-picker">
                <h3>Permissions</h3>
                {editingSuper ? (
                  <p className="pf-hint">Super Admin always retains full access (*).</p>
                ) : null}
                {[...permGroups.entries()].map(([group, items]) => (
                  <div key={group} className="role-perm-group">
                    <h4>{group}</h4>
                    <div className="role-perm-options">
                      {items.map((p) => (
                        <label key={p.key} className="role-perm-option">
                          <input
                            type="checkbox"
                            checked={form.permissions.includes(p.key) || form.permissions.includes("*")}
                            disabled={editingSuper || (form.permissions.includes("*") && p.key !== "*")}
                            onChange={() => togglePerm(p.key)}
                          />
                          <span>
                            <strong>{p.label}</strong>
                            <small>{p.key}</small>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="settings-form-actions">
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? "Saving…" : editLevel != null ? "Save role" : "Create role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type StaffForm = {
  username: string;
  email: string;
  password: string;
  phone: string;
  user_level: string;
  store_id: string;
  floor_no: string;
};

const EMPTY_FORM: StaffForm = {
  username: "",
  email: "",
  password: "",
  phone: "",
  user_level: "2",
  store_id: "",
  floor_no: "",
};

export function StaffPage() {
  const superAdmin = isSuperAdmin();
  const [searchParams] = useSearchParams();
  const [roleOptions, setRoleOptions] = useState<Array<{ level: number; label: string }>>([]);
  const [tab, setTab] = useState<"all" | "portal" | "field">("all");
  const [levelFilter, setLevelFilter] = useState("");
  const [q, setQ] = useState(() => searchParams.get("q") || "");
  const [items, setItems] = useState<StaffRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<StaffForm>(EMPTY_FORM);
  const [stores, setStores] = useState<StoreOption[]>([]);

  async function load() {
    if (!canManageStaff()) return;
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string | number | undefined> = { per_page: 50, q: q || undefined };
      if (levelFilter) params.level = Number(levelFilter);
      if (tab === "portal") params.portal = 1;
      if (tab === "field") params.portal = 0;
      const res = await adminApi.staff(params);
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    adminApi
      .staffRoles()
      .then((d) => setRoleOptions(d.roles.map((r) => ({ level: r.level, label: r.label }))))
      .catch(() => undefined);
    adminApi
      .stores()
      .then((list) =>
        setStores(
          list.map((s) => ({
            id: String(s.ec_store_id),
            name: s.ec_store_name || `Store #${s.ec_store_id}`,
          })),
        ),
      )
      .catch(() => setStores([]));
  }, []);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on filters
  }, [tab, levelFilter, q]);

  const storeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of stores) map.set(s.id, s.name);
    return map;
  }, [stores]);

  useOpenAddQuery(() => {
    setEditId(null);
    setForm({ ...EMPTY_FORM, user_level: superAdmin ? "2" : "5" });
    setShowForm(true);
    setMsg("");
  });

  function openCreate() {
    setEditId(null);
    setForm({ ...EMPTY_FORM, user_level: superAdmin ? "2" : "5" });
    setShowForm(true);
    setMsg("");
  }

  async function openEdit(row: StaffRow) {
    setMsg("");
    setEditId(Number(row.id));
    setForm({
      username: String(row.username ?? ""),
      email: String(row.email ?? ""),
      password: "",
      phone: String(row.phone ?? ""),
      user_level: String(row.user_level ?? "2"),
      store_id: String(row.store_id ?? ""),
      floor_no: String(row.floor_no ?? ""),
    });
    setShowForm(true);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    setError("");
    const body: Record<string, unknown> = {
      username: form.username,
      email: form.email,
      phone: form.phone,
      user_level: Number(form.user_level),
      store_id: form.store_id ? Number(form.store_id) : 0,
      floor_no: form.floor_no ? Number(form.floor_no) : 0,
    };
    if (form.password) body.password = form.password;

    try {
      if (editId) {
        await adminApi.updateStaff(editId, body);
        setMsg("User updated.");
      } else {
        if (!form.password) {
          setError("Password is required for new users.");
          return;
        }
        body.password = form.password;
        await adminApi.createStaff(body);
        setMsg("User created.");
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function toggleStatus(row: StaffRow) {
    await adminApi.updateStaff(Number(row.id), { status: Number(row.status) === 1 ? 0 : 1 });
    await load();
  }

  async function remove(row: StaffRow) {
    if (!confirm(`Delete user "${String(row.username)}"?`)) return;
    try {
      await adminApi.deleteStaff(Number(row.id));
      setMsg("User deleted.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  if (!canManageStaff()) return <Navigate to="/" replace />;

  const level = Number(form.user_level);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          {superAdmin ? (
            <p className="settings-crumb">
              <Link to="/access">Users & access</Link>
              <ChevronRight size={14} aria-hidden />
              <span>Staff & employees</span>
            </p>
          ) : null}
          <h1 className="page-title">Staff & employees</h1>
          <p className="page-sub">
            Manage portal admins, customer care, HR, analysts, drivers, pickers, and store managers.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          <UserPlus size={16} aria-hidden /> Add employee
        </button>
      </header>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}

      <div className="staff-toolbar card">
        <div className="staff-tabs" role="tablist">
          {(["all", "portal", "field"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              className={tab === t ? "active" : ""}
              onClick={() => setTab(t)}
            >
              {t === "all" ? "All staff" : t === "portal" ? "Portal access" : "Field ops"}
            </button>
          ))}
        </div>
        <div className="staff-filters">
          <input
            placeholder="Search name, email, phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
            <option value="">All roles</option>
            {roleOptions.map((r) => (
              <option key={r.level} value={r.level}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Store</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={String(r.id)}>
                <td>
                  <strong>{String(r.username)}</strong>
                  <div className="muted">{String(r.phone || "—")}</div>
                </td>
                <td>{String(r.email || "—")}</td>
                <td>
                  {String(r.role_label ?? roleLabel(Number(r.user_level)))}
                  {r.portal_access ? (
                    <span className="access-perm-tag" style={{ marginInlineStart: 6 }}>
                      portal
                    </span>
                  ) : null}
                </td>
                <td>
                  {Number(r.store_id) > 0
                    ? storeNameById.get(String(r.store_id)) || `#${String(r.store_id)}`
                    : "—"}
                </td>
                <td>
                  <span className={`settings-status ${Number(r.status) === 1 ? "ok" : "warn"}`}>
                    {Number(r.status) === 1 ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="actions">
                  <button type="button" className="btn" onClick={() => void openEdit(r)}>
                    Edit
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => void toggleStatus(r)}>
                    {Number(r.status) === 1 ? "Deactivate" : "Activate"}
                  </button>
                  {superAdmin ? (
                    <button type="button" className="btn btn-secondary" onClick={() => void remove(r)}>
                      Delete
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">
                  No users found ({total})
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {showForm ? (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal-card staff-modal" onClick={(ev) => ev.stopPropagation()}>
            <div className="page-head">
              <h2>{editId ? "Edit employee" : "Add employee"}</h2>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                Close
              </button>
            </div>
            <form className="settings-form-grid" onSubmit={(e) => void save(e)}>
              <label className="pf-field">
                <span className="pf-label">Username</span>
                <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
              </label>
              <label className="pf-field">
                <span className="pf-label">Email</span>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </label>
              <label className="pf-field">
                <span className="pf-label">{editId ? "New password (optional)" : "Password"}</span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!editId}
                  minLength={4}
                />
              </label>
              <label className="pf-field">
                <span className="pf-label">Phone</span>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </label>
              <label className="pf-field">
                <span className="pf-label">Role</span>
                <select
                  value={form.user_level}
                  onChange={(e) => {
                    const next = e.target.value;
                    const nextLevel = Number(next);
                    setForm({
                      ...form,
                      user_level: next,
                      store_id: needsStore(nextLevel) ? form.store_id : "",
                      floor_no: needsFloor(nextLevel) ? form.floor_no : "",
                    });
                  }}
                  required
                >
                  {roleOptions.map((r) => (
                    <option key={r.level} value={r.level}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
              {needsStore(level) ? (
                <label className="pf-field">
                  <span className="pf-label">Store</span>
                  <StoreSinglePicker
                    stores={stores}
                    value={form.store_id}
                    onChange={(id) => setForm({ ...form, store_id: id })}
                    required
                  />
                </label>
              ) : null}
              {needsFloor(level) ? (
                <label className="pf-field">
                  <span className="pf-label">Floor number</span>
                  <input value={form.floor_no} onChange={(e) => setForm({ ...form, floor_no: e.target.value })} />
                </label>
              ) : null}
              <div className="settings-form-actions" style={{ gridColumn: "1 / -1" }}>
                <button type="submit" className="btn btn-primary">
                  {editId ? "Save changes" : "Create user"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
