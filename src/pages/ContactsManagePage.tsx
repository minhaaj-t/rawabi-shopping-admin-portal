import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CheckCheck,
  Clock,
  Inbox,
  Mail,
  MessageCircle,
  Phone,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "../lib/icons";
import { adminApi } from "../lib/api";
import { LoadingIndicator } from "../components/LoadingIndicator";

export type ContactRow = {
  con_id: number;
  con_name?: string;
  con_email?: string;
  con_phone?: string;
  con_place?: string;
  con_msg?: string;
  con_status?: string;
  con_admin_note?: string;
  con_handled_at?: string | null;
  con_created_at?: string | null;
  thread_id?: number | null;
};

type ContactStatus = "all" | "new" | "read" | "replied" | "archived";

type Stats = {
  total: number;
  new: number;
  read: number;
  replied: number;
  archived: number;
  today: number;
};

const EMPTY_STATS: Stats = { total: 0, new: 0, read: 0, replied: 0, archived: 0, today: 0 };

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function truncate(text: string, max = 96): string {
  const t = text.trim();
  if (t.length <= max) return t || "—";
  return `${t.slice(0, max - 1)}…`;
}

function statusLabel(status?: string): string {
  const s = (status || "new").toLowerCase();
  if (s === "read") return "Read";
  if (s === "replied") return "Replied";
  if (s === "archived") return "Archived";
  return "New";
}

function statusClass(status?: string): string {
  const s = (status || "new").toLowerCase();
  if (s === "read") return "read";
  if (s === "replied") return "replied";
  if (s === "archived") return "archived";
  return "new";
}

export function ContactsManagePage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ContactRow[]>([]);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ContactStatus>("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [active, setActive] = useState<ContactRow | null>(null);
  const [note, setNote] = useState("");
  const [detailBusy, setDetailBusy] = useState(false);

  async function load() {
    setBusy(true);
    setError("");
    try {
      const res = await adminApi.contacts({
        per_page: 50,
        q: q.trim() || undefined,
        status: status === "all" ? undefined : status,
      });
      setItems(res.items as ContactRow[]);
      setTotal(res.total);
      if (res.stats) setStats({ ...EMPTY_STATS, ...res.stats });
      setSelected((prev) => prev.filter((id) => (res.items as ContactRow[]).some((r) => r.con_id === id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load contact forms");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const allSelected = items.length > 0 && selected.length === items.length;

  function toggleAll() {
    setSelected(allSelected ? [] : items.map((r) => r.con_id));
  }

  function toggleOne(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function openDetail(row: ContactRow) {
    setMsg("");
    setActive(row);
    setNote(String(row.con_admin_note ?? ""));
    setDetailBusy(true);
    try {
      const full = (await adminApi.contact(row.con_id)) as ContactRow;
      setActive(full);
      setNote(String(full.con_admin_note ?? ""));
      setItems((prev) => prev.map((r) => (r.con_id === full.con_id ? { ...r, ...full } : r)));
      if ((row.con_status || "new") === "new") {
        setStats((s) => ({
          ...s,
          new: Math.max(0, s.new - 1),
          read: s.read + ((full.con_status || "") === "read" ? 1 : 0),
        }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to open message");
    } finally {
      setDetailBusy(false);
    }
  }

  async function saveNoteAndStatus(nextStatus?: string) {
    if (!active) return;
    setDetailBusy(true);
    setMsg("");
    try {
      const body: { status?: string; admin_note?: string } = { admin_note: note };
      if (nextStatus) body.status = nextStatus;
      const updated = (await adminApi.updateContact(active.con_id, body)) as ContactRow;
      setActive(updated);
      setNote(String(updated.con_admin_note ?? ""));
      setMsg(nextStatus ? `Marked as ${statusLabel(nextStatus)}.` : "Note saved.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setDetailBusy(false);
    }
  }

  async function openSupport(row: ContactRow) {
    setBusy(true);
    setError("");
    try {
      if (row.thread_id) {
        navigate(`/support/chats/${row.thread_id}`);
        return;
      }
      const res = await adminApi.supportFromContact(row.con_id);
      if ((row.con_status || "new") !== "replied") {
        await adminApi.updateContact(row.con_id, { status: "replied" }).catch(() => undefined);
      }
      navigate(`/support/chats/${res.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open support thread");
    } finally {
      setBusy(false);
    }
  }

  async function removeOne(id: number) {
    if (!confirm("Delete this contact form submission?")) return;
    try {
      await adminApi.deleteContact(id);
      if (active?.con_id === id) setActive(null);
      setMsg("Submission deleted.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function runBulk(action: string) {
    if (!selected.length) return;
    const labels: Record<string, string> = {
      delete: "Delete selected submissions?",
      mark_read: "Mark selected as read?",
      mark_replied: "Mark selected as replied?",
      archive: "Archive selected submissions?",
      restore_new: "Restore selected as new?",
    };
    if (!confirm(labels[action] || "Continue?")) return;
    setBusy(true);
    try {
      await adminApi.bulkContacts({ action, ids: selected });
      setSelected([]);
      if (active && selected.includes(active.con_id) && action === "delete") setActive(null);
      setMsg("Bulk action completed.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk action failed");
    } finally {
      setBusy(false);
    }
  }

  const tabs = useMemo(
    () =>
      [
        { id: "all" as const, label: "All", count: stats.total },
        { id: "new" as const, label: "New", count: stats.new },
        { id: "read" as const, label: "Read", count: stats.read },
        { id: "replied" as const, label: "Replied", count: stats.replied },
        { id: "archived" as const, label: "Archived", count: stats.archived },
      ] as const,
    [stats],
  );

  return (
    <div className="page contacts-page">
      <header className="page-head contacts-page-head">
        <div className="contacts-page-head-copy">
          <h1 className="page-title">Contact forms</h1>
          <p className="page-sub">
            Manage website and app contact submissions — triage, reply via support chat, and archive.
          </p>
        </div>
        <div className="page-head-actions">
          <button type="button" className="btn btn-secondary" onClick={() => void load()} disabled={busy}>
            <RotateCcw size={16} aria-hidden /> Refresh
          </button>
        </div>
      </header>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}

      <div className="card-grid contacts-stats">
        <div className="card stat-card">
          <h3>Total</h3>
          <strong>{stats.total}</strong>
        </div>
        <div className="card stat-card">
          <h3>New</h3>
          <strong>{stats.new}</strong>
        </div>
        <div className="card stat-card">
          <h3>Today</h3>
          <strong>{stats.today}</strong>
        </div>
        <div className="card stat-card">
          <h3>Replied</h3>
          <strong>{stats.replied}</strong>
        </div>
      </div>

      <div className="card contacts-list-card">
        <div className="contacts-toolbar">
          <div className="contacts-status-tabs" role="tablist" aria-label="Filter by status">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={status === t.id}
                className={`contacts-status-tab${status === t.id ? " is-active" : ""}`}
                onClick={() => setStatus(t.id)}
              >
                <span className="contacts-status-tab-label">{t.label}</span>
                <span className="contacts-status-tab-count">{t.count}</span>
              </button>
            ))}
          </div>
          <form
            className="contacts-search"
            onSubmit={(e) => {
              e.preventDefault();
              void load();
            }}
          >
            <Search size={15} aria-hidden />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email, phone, message…"
              aria-label="Search contact forms"
            />
            <button type="submit" className="btn btn-secondary btn-sm">
              Search
            </button>
          </form>
        </div>

        {selected.length ? (
          <div className="contacts-bulk-bar">
            <span>
              <strong>{selected.length}</strong> selected
            </span>
            <div className="contacts-bulk-actions">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => void runBulk("mark_read")}>
                Mark read
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => void runBulk("mark_replied")}>
                Mark replied
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => void runBulk("archive")}>
                Archive
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => void runBulk("delete")}>
                <Trash2 size={14} aria-hidden /> Delete
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelected([])}>
                Clear
              </button>
            </div>
          </div>
        ) : null}

        {busy && !items.length ? (
          <LoadingIndicator label="Loading contact forms…" />
        ) : (
          <div className="table-wrap contacts-table-wrap">
            <table className="data contacts-table">
              <thead>
                <tr>
                  <th className="contacts-col-check" scope="col">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" />
                  </th>
                  <th className="contacts-col-from" scope="col">From</th>
                  <th className="contacts-col-msg" scope="col">Message</th>
                  <th className="contacts-col-place" scope="col">Place</th>
                  <th className="contacts-col-date" scope="col">Received</th>
                  <th className="contacts-col-status" scope="col">Status</th>
                  <th className="contacts-col-actions" scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const isNew = (row.con_status || "new") === "new";
                  return (
                    <tr key={row.con_id} className={isNew ? "contacts-row-new" : undefined}>
                      <td className="contacts-col-check">
                        <input
                          type="checkbox"
                          checked={selected.includes(row.con_id)}
                          onChange={() => toggleOne(row.con_id)}
                          aria-label={`Select #${row.con_id}`}
                        />
                      </td>
                      <td className="contacts-col-from">
                        <button type="button" className="contacts-from-btn" onClick={() => void openDetail(row)}>
                          <strong>{row.con_name || "Anonymous"}</strong>
                          <span className="muted small">
                            {row.con_email || "—"}
                            {row.con_phone ? ` · ${row.con_phone}` : ""}
                          </span>
                        </button>
                      </td>
                      <td className="contacts-col-msg wrap">
                        <button type="button" className="contacts-msg-preview" onClick={() => void openDetail(row)}>
                          {truncate(String(row.con_msg || ""))}
                        </button>
                      </td>
                      <td className="contacts-col-place muted">{row.con_place || "—"}</td>
                      <td className="contacts-col-date muted small">{formatDate(row.con_created_at)}</td>
                      <td className="contacts-col-status">
                        <div className="contacts-status-cell">
                          <span className={`contacts-status-pill ${statusClass(row.con_status)}`}>
                            {statusLabel(row.con_status)}
                          </span>
                          {row.thread_id ? (
                            <Link className="contacts-thread-link muted small" to={`/support/chats/${row.thread_id}`}>
                              Thread #{row.thread_id}
                            </Link>
                          ) : null}
                        </div>
                      </td>
                      <td className="contacts-col-actions">
                        <div className="contacts-row-actions">
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void openDetail(row)}>
                            View
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            title="Open support chat"
                            onClick={() => void openSupport(row)}
                          >
                            <MessageCircle size={14} aria-hidden />
                          </button>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void removeOne(row.con_id)}>
                            <Trash2 size={14} aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!items.length ? (
                  <tr>
                    <td colSpan={7} className="contacts-empty muted">
                      No contact form submissions{status !== "all" ? ` with status “${statusLabel(status)}”` : ""}.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
        <div className="contacts-list-foot muted small">
          Showing {items.length} of {total} · {busy ? "Refreshing…" : "Up to date"}
        </div>
      </div>

      {active ? (
        <div className="modal-backdrop" onClick={() => setActive(null)}>
          <div className="modal-card contacts-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="page-head contacts-detail-head">
              <div>
                <p className="settings-crumb muted small">
                  <Inbox size={14} aria-hidden /> Contact #{active.con_id}
                </p>
                <h2>{active.con_name || "Anonymous"}</h2>
                <p className="muted small">{formatDate(active.con_created_at)}</p>
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => setActive(null)}>
                <X size={16} aria-hidden /> Close
              </button>
            </div>

            {detailBusy ? <LoadingIndicator label="Loading…" /> : null}

            <div className="contacts-detail-meta">
              <div>
                <span className="pf-label">Email</span>
                {active.con_email ? (
                  <a href={`mailto:${active.con_email}`}>
                    <Mail size={14} aria-hidden /> {active.con_email}
                  </a>
                ) : (
                  <span className="muted">—</span>
                )}
              </div>
              <div>
                <span className="pf-label">Phone</span>
                {active.con_phone ? (
                  <a href={`tel:${active.con_phone}`}>
                    <Phone size={14} aria-hidden /> {active.con_phone}
                  </a>
                ) : (
                  <span className="muted">—</span>
                )}
              </div>
              <div>
                <span className="pf-label">Place</span>
                <span>{active.con_place || "—"}</span>
              </div>
              <div>
                <span className="pf-label">Status</span>
                <span className={`contacts-status-pill ${statusClass(active.con_status)}`}>
                  {statusLabel(active.con_status)}
                </span>
              </div>
            </div>

            <div className="contacts-detail-message">
              <span className="pf-label">Message</span>
              <div className="contacts-message-body">{active.con_msg || "—"}</div>
            </div>

            <label className="pf-field">
              <span className="pf-label">Internal note</span>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Private note for support team…"
              />
            </label>

            <div className="contacts-detail-actions">
              <button type="button" className="btn btn-primary" disabled={detailBusy} onClick={() => void saveNoteAndStatus()}>
                Save note
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={detailBusy}
                onClick={() => void saveNoteAndStatus("read")}
              >
                <CheckCheck size={14} aria-hidden /> Mark read
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={detailBusy}
                onClick={() => void saveNoteAndStatus("replied")}
              >
                Mark replied
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={detailBusy}
                onClick={() => void saveNoteAndStatus("archived")}
              >
                Archive
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => void openSupport(active)}>
                <MessageCircle size={14} aria-hidden />{" "}
                {active.thread_id ? "Open chat" : "Start support chat"}
              </button>
              {active.con_email ? (
                <a
                  className="btn btn-secondary"
                  href={`mailto:${encodeURIComponent(active.con_email)}?subject=${encodeURIComponent(
                    `Re: your message to Rawabi`,
                  )}&body=${encodeURIComponent(`Hi ${active.con_name || ""},\n\n`)}`}
                >
                  <Mail size={14} aria-hidden /> Email
                </a>
              ) : null}
              <button type="button" className="btn btn-secondary" onClick={() => void removeOne(active.con_id)}>
                <Trash2 size={14} aria-hidden /> Delete
              </button>
            </div>

            {active.con_handled_at ? (
              <p className="muted small contacts-handled">
                <Clock size={12} aria-hidden /> Handled {formatDate(active.con_handled_at)}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { ContactsManagePage as ContactsPage };
