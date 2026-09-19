import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, RotateCcw, Search, Trash2, Users, X } from "../lib/icons";
import { adminApi } from "../lib/api";
import {
  CustomerMultiPicker,
  resolveCustomersByIds,
  type PickedCustomer,
} from "../components/CustomerMultiPicker";
import { useOpenAddQuery } from "../lib/useOpenAddQuery";
import { LoadingIndicator } from "../components/LoadingIndicator";

type GroupRow = {
  usergrp_id: number;
  usergrp_title: string;
  usergrp_users?: string;
  usergrp_status?: number;
  user_count?: number;
};

export function UsergroupsPage() {
  const [items, setItems] = useState<GroupRow[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<PickedCustomer[]>([]);
  const [resolving, setResolving] = useState(false);

  async function load() {
    setBusy(true);
    setError("");
    try {
      const res = await adminApi.usergroups({ per_page: 50, q: q.trim() || undefined });
      setItems(res.items as GroupRow[]);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load groups");
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
    setTitle("");
    setSelected([]);
    setMsg("");
    setShowAdd(true);
  }

  useOpenAddQuery(openAdd);

  async function openEdit(row: GroupRow) {
    setEditId(row.usergrp_id);
    setTitle(String(row.usergrp_title ?? ""));
    setMsg("");
    setShowAdd(true);
    setResolving(true);
    const ids = String(row.usergrp_users ?? "")
      .split(/[,\s]+/)
      .map((x) => Number(x.trim()))
      .filter((n) => n > 0);
    try {
      setSelected(await resolveCustomersByIds(ids));
    } finally {
      setResolving(false);
    }
  }

  async function save() {
    if (!title.trim()) {
      setMsg("Group title is required.");
      return;
    }
    setMsg("");
    setBusy(true);
    const ids = selected.map((s) => s.id);
    try {
      if (editId) {
        await adminApi.updateUsergroup(editId, { title: title.trim(), user_ids: ids });
      } else {
        await adminApi.createUsergroup({ title: title.trim(), user_ids: ids });
      }
      setShowAdd(false);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(row: GroupRow) {
    await adminApi.updateUsergroup(row.usergrp_id, {
      status: Number(row.usergrp_status) === 1 ? 0 : 1,
    });
    await load();
  }

  async function remove(id: number) {
    if (!window.confirm("Delete this usergroup?")) return;
    await adminApi.deleteUsergroup(id);
    await load();
  }

  const filtered = q.trim()
    ? items.filter((r) => String(r.usergrp_title ?? "").toLowerCase().includes(q.trim().toLowerCase()))
    : items;

  return (
    <div className="page usergroups-page">
      <header className="page-head">
        <div>
          <p className="settings-crumb">
            <Link to="/staff">Users &amp; Roles</Link>
            {" · Audiences"}
          </p>
          <h1 className="page-title">User groups</h1>
          <p className="page-sub">Customer segments for push notifications, campaigns, and targeting.</p>
        </div>
        <div className="page-head-actions">
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void load()}>
            <RotateCcw size={15} aria-hidden />
            Refresh
          </button>
          <button type="button" className="btn btn-primary" onClick={openAdd}>
            <Plus size={16} aria-hidden />
            Add UserGroup
          </button>
        </div>
      </header>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="card-grid usergroups-stats">
        <div className="card stat-card">
          <h3>Groups</h3>
          <strong>{total}</strong>
        </div>
        <div className="card stat-card">
          <h3>Active</h3>
          <strong>{items.filter((r) => Number(r.usergrp_status) === 1).length}</strong>
        </div>
        <div className="card stat-card">
          <h3>Members</h3>
          <strong>{items.reduce((sum, r) => sum + Number(r.user_count ?? 0), 0)}</strong>
        </div>
        <div className="card stat-card">
          <h3>Showing</h3>
          <strong>{filtered.length}</strong>
        </div>
      </div>

      <div className="card">
        <div className="panel-toolbar">
          <div className="uiux-search">
            <Search size={15} aria-hidden />
            <input
              value={q}
              placeholder="Filter groups…"
              onChange={(e) => setQ(e.target.value)}
              aria-label="Filter usergroups"
            />
          </div>
          <span className="muted small">{filtered.length} groups</span>
        </div>

        {busy && !items.length ? (
          <LoadingIndicator label="Loading groups" />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Group</th>
                  <th>Members</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.usergrp_id}>
                    <td>
                      <strong>{r.usergrp_title}</strong>
                      <div className="muted small mono">#{r.usergrp_id}</div>
                    </td>
                    <td>
                      <span className="usergroups-member-pill">
                        <Users size={13} aria-hidden />
                        {Number(r.user_count ?? 0)} users
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill ${Number(r.usergrp_status) === 1 ? "on" : "off"}`}>
                        {Number(r.usergrp_status) === 1 ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="news-row-actions">
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => void openEdit(r)}>
                          Edit
                        </button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => void toggleStatus(r)}>
                          {Number(r.usergrp_status) === 1 ? "Deactivate" : "Activate"}
                        </button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => void remove(r.usergrp_id)}>
                          <Trash2 size={14} aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length ? (
                  <tr>
                    <td colSpan={4} className="muted">
                      No usergroups yet. Create one to target customers in push notifications.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd ? (
        <div className="modal-backdrop" onClick={() => setShowAdd(false)}>
          <div className="modal-card usergroups-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <header className="usergroups-modal-head">
              <div>
                <h2>{editId ? "Edit UserGroup" : "Add UserGroup"}</h2>
                <p className="muted small">Search and select multiple customers for this audience.</p>
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>
                <X size={15} aria-hidden />
                Close
              </button>
            </header>

            <label className="pf-field">
              <span className="pf-label">Group title</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VIP customers, Eid campaign…" />
            </label>

            <div className="pf-field" style={{ marginTop: 12 }}>
              <span className="pf-label">Members ({selected.length})</span>
              {resolving ? (
                <p className="muted small">Loading selected customers…</p>
              ) : (
                <CustomerMultiPicker selected={selected} onChange={setSelected} />
              )}
            </div>

            {msg ? <div className="alert alert-error" style={{ marginTop: 12 }}>{msg}</div> : null}

            <div className="usergroups-modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" disabled={busy || resolving} onClick={() => void save()}>
                {busy ? "Saving…" : "Save group"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
