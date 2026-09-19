import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { ChevronRight, UserPlus } from "../lib/icons";
import { adminApi } from "../lib/api";
import { canManageStaff, isSuperAdmin } from "../lib/auth";
import { needsFloor, needsStore, roleLabel } from "../lib/roles";
import { StoreSinglePicker } from "../components/StoreSinglePicker";
import type { StoreOption } from "../components/StoreMultiPicker";
import { MultiSelectDropdown, type MultiSelectOption } from "../components/MultiSelectDropdown";

type StaffRow = Record<string, unknown>;

type FormState = {
  username: string;
  email: string;
  password: string;
  phone: string;
  store_id: string;
  floor_no: string;
  category_ids: number[];
};

const EMPTY: FormState = {
  username: "",
  email: "",
  password: "",
  phone: "",
  store_id: "",
  floor_no: "",
  category_ids: [],
};

type Props = {
  level: number;
  title: string;
  subtitle: string;
  addLabel: string;
  crumb: string;
};

function categoryTitles(row: StaffRow): string {
  const cats = row.categories;
  if (Array.isArray(cats) && cats.length > 0) {
    return cats
      .map((c) => {
        if (c && typeof c === "object" && "title" in c) return String((c as { title?: unknown }).title ?? "");
        return "";
      })
      .filter(Boolean)
      .join(", ");
  }
  const ids = row.category_ids;
  if (Array.isArray(ids) && ids.length > 0) {
    return ids.map((id) => `#${id}`).join(", ");
  }
  return "";
}

function FieldOpsUsersPage({ level, title, subtitle, addLabel, crumb }: Props) {
  const superAdmin = isSuperAdmin();
  const isPicker = level === 5;
  const [items, setItems] = useState<StaffRow[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [sectionOptions, setSectionOptions] = useState<MultiSelectOption[]>([]);
  const roleName = roleLabel(level);
  const colSpan = isPicker ? 7 : 6;

  const storeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of stores) map.set(s.id, s.name);
    return map;
  }, [stores]);

  async function load() {
    if (!canManageStaff()) return;
    setLoading(true);
    setError("");
    try {
      const res = await adminApi.staff({
        per_page: 50,
        level,
        q: q || undefined,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, q]);

  useEffect(() => {
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
    if (!isPicker) {
      setSectionOptions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        // One lite request for the full tree (avoids N+1 root→child fetches + heavy counts).
        const all = await adminApi.categories(undefined, undefined, { lite: true });
        if (cancelled) return;
        const rows = all.map((c) => ({
          id: Number(c.id),
          parent: Number(c.parent ?? 0),
          name: String(c.name ?? `Category #${c.id}`),
        }));
        const byParent = new Map<number, typeof rows>();
        for (const row of rows) {
          const list = byParent.get(row.parent) ?? [];
          list.push(row);
          byParent.set(row.parent, list);
        }
        const roots = byParent.get(0) ?? [];
        const options: MultiSelectOption[] = [];
        for (const root of roots) {
          const kids = byParent.get(root.id) ?? [];
          options.push({
            value: root.id,
            label: root.name,
            alsoToggle: kids.map((k) => k.id),
          });
          for (const kid of kids) {
            options.push({
              value: kid.id,
              label: `${root.name} › ${kid.name}`,
            });
          }
        }
        setSectionOptions(options);
      } catch {
        if (!cancelled) setSectionOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPicker]);

  function openCreate() {
    setEditId(null);
    setForm({ ...EMPTY });
    setShowForm(true);
    setMsg("");
  }

  function openEdit(row: StaffRow) {
    const ids = Array.isArray(row.category_ids)
      ? row.category_ids.map((n) => Number(n)).filter((n) => n > 0)
      : [];
    setEditId(Number(row.id));
    setForm({
      username: String(row.username ?? ""),
      email: String(row.email ?? ""),
      password: "",
      phone: String(row.phone ?? ""),
      store_id: String(row.store_id ?? ""),
      floor_no: String(row.floor_no ?? ""),
      category_ids: ids,
    });
    setShowForm(true);
    setMsg("");
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    const body: Record<string, unknown> = {
      username: form.username,
      email: form.email,
      phone: form.phone,
      user_level: level,
      store_id: form.store_id ? Number(form.store_id) : 0,
      floor_no: form.floor_no ? Number(form.floor_no) : 0,
    };
    if (isPicker) {
      body.category_ids = form.category_ids;
    }
    try {
      if (editId) {
        if (form.password) body.password = form.password;
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
    try {
      await adminApi.updateStaff(Number(row.id), { status: Number(row.status) === 1 ? 0 : 1 });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status update failed");
    }
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

  return (
    <div className="page">
      <header className="page-head">
        <div>
          {superAdmin ? (
            <p className="settings-crumb">
              <Link to="/access">Users & access</Link>
              <ChevronRight size={14} aria-hidden />
              <span>{crumb}</span>
            </p>
          ) : null}
          <h1 className="page-title">{title}</h1>
          <p className="page-sub">{subtitle}</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={openCreate}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <UserPlus size={16} aria-hidden /> {addLabel}
        </button>
      </header>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}

      <div className="staff-toolbar card">
        <div className="staff-filters" style={{ width: "100%" }}>
          <input
            placeholder="Search name, email, phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <span className="muted" style={{ alignSelf: "center", fontSize: 12 }}>
            Role locked: {roleName} · {loading ? "Loading…" : `${total} user(s)`}
          </span>
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
              {isPicker ? <th>Sections</th> : null}
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => {
              const sections = isPicker ? categoryTitles(r) : "";
              return (
                <tr key={String(r.id)}>
                  <td>
                    <strong>{String(r.username)}</strong>
                    <div className="muted">{String(r.phone || "—")}</div>
                  </td>
                  <td>{String(r.email || "—")}</td>
                  <td>{String(r.role_label ?? roleName)}</td>
                  <td>
                    {Number(r.store_id) > 0
                      ? storeNameById.get(String(r.store_id)) || `#${String(r.store_id)}`
                      : "—"}
                  </td>
                  {isPicker ? (
                    <td>
                      {sections ? (
                        <span title={sections}>{sections}</span>
                      ) : (
                        <span className="muted">None assigned</span>
                      )}
                    </td>
                  ) : null}
                  <td>
                    <span className={`settings-status ${Number(r.status) === 1 ? "ok" : "warn"}`}>
                      {Number(r.status) === 1 ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="actions">
                    <button type="button" className="btn" onClick={() => openEdit(r)}>
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
              );
            })}
            {!loading && items.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="muted">
                  No {title.toLowerCase()} found.
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
              <h2>{editId ? `Edit ${roleName.toLowerCase()}` : addLabel}</h2>
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
                <input value={roleName} disabled readOnly />
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
              {isPicker ? (
                <div className="pf-field" style={{ gridColumn: "1 / -1" }}>
                  <span className="pf-label">Category sections</span>
                  <MultiSelectDropdown
                    options={sectionOptions}
                    value={form.category_ids}
                    onChange={(next) => setForm({ ...form, category_ids: next })}
                    placeholder="Assign category sections…"
                    searchWhenOver={1}
                    emptyMessage="No categories found"
                  />
                </div>
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

export function DeliveryBoysPage() {
  return (
    <FieldOpsUsersPage
      level={3}
      title="Delivery boys"
      subtitle="Drivers who deliver orders in the mobile ops app."
      addLabel="Add delivery boy"
      crumb="Delivery boys"
    />
  );
}

export function PickupUsersPage() {
  return (
    <FieldOpsUsersPage
      level={5}
      title="Pickup users"
      subtitle="In-store pickers who prepare orders for delivery or customer pickup."
      addLabel="Add pickup user"
      crumb="Pickup users"
    />
  );
}
