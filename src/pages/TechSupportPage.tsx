import { useEffect, useState } from "react";
import { LifeBuoy, Paperclip, Plus } from "../lib/icons";
import { adminApi, type TechSupportTicket } from "../lib/api";
import { TechSupportDialog } from "../components/TechSupportDialog";
import { LoadingIndicator } from "../components/LoadingIndicator";

function statusClass(status: string) {
  if (status === "resolved" || status === "closed") return "ok";
  if (status === "in_progress") return "warn";
  return "warn";
}

export function TechSupportPage() {
  const [items, setItems] = useState<TechSupportTicket[]>([]);
  const [canManageAll, setCanManageAll] = useState(false);
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<TechSupportTicket | null>(null);
  const [note, setNote] = useState("");
  const isEmpty = !items.length && !busy;

  async function load() {
    setBusy(true);
    setError("");
    try {
      const res = await adminApi.techSupportTickets({
        scope,
        status: status || undefined,
      });
      setItems(res.items);
      setCanManageAll(res.can_manage_all);
      if (!res.can_manage_all && scope === "all") setScope("mine");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tickets");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, status]);

  async function updateStatus(id: string, next: string) {
    try {
      const updated = await adminApi.updateTechSupportTicket(id, { status: next });
      setItems((prev) => prev.map((t) => (t.id === id ? updated : t)));
      if (selected?.id === id) setSelected(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function saveNote() {
    if (!selected || !canManageAll) return;
    try {
      const updated = await adminApi.updateTechSupportTicket(selected.id, { admin_note: note });
      setSelected(updated);
      setItems((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Note save failed");
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">
            <LifeBuoy size={20} style={{ verticalAlign: "middle", marginRight: 8 }} aria-hidden />
            Technical support
          </h1>
          <p className="page-sub">Submit portal issues and review responses on your requests.</p>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={() => setDialogOpen(true)}>
            New request
          </button>
        </div>
      </header>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="tech-support-toolbar card">
        {canManageAll ? (
          <label className="pf-field">
            <span className="pf-label">Scope</span>
            <select value={scope} onChange={(e) => setScope(e.target.value as "mine" | "all")}>
              <option value="mine">My requests</option>
              <option value="all">All requests</option>
            </select>
          </label>
        ) : null}
        <label className="pf-field">
          <span className="pf-label">Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void load()}>
          {busy ? "Loading…" : "Refresh"}
        </button>
      </div>

      <div className={`tech-support-layout${isEmpty ? " is-empty" : ""}`}>
        <div className="card table-wrap tech-support-list">
          {busy && !items.length ? (
            <div className="tech-support-empty is-loading" role="status">
              <LoadingIndicator label="Loading requests" padded />
            </div>
          ) : isEmpty ? (
            <div className="tech-support-empty" role="status">
              <div className="tech-support-empty-icon" aria-hidden>
                <LifeBuoy size={28} />
              </div>
              <h2>{status ? "No matching requests" : "No support requests yet"}</h2>
              <p>
                {status
                  ? "Try another status, or clear the filter to see everything."
                  : scope === "all"
                    ? "When staff submit portal issues, they will show up here for review."
                    : "Report a bug, access problem, or portal glitch — attach screenshots if you have them."}
              </p>
              <div className="tech-support-empty-actions">
                {status ? (
                  <button type="button" className="btn btn-secondary" onClick={() => setStatus("")}>
                    Clear status filter
                  </button>
                ) : null}
                <button type="button" className="btn btn-primary" onClick={() => setDialogOpen(true)}>
                  <Plus size={16} aria-hidden />
                  New request
                </button>
              </div>
              {!status ? (
                <ul className="tech-support-empty-tips">
                  <li>Include the page URL and what you expected</li>
                  <li>Attach screenshots or error logs when possible</li>
                  <li>Responses and notes appear in the detail panel</li>
                </ul>
              ) : null}
            </div>
          ) : (
            <table className="table data">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  {scope === "all" ? <th>From</th> : null}
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr
                    key={t.id}
                    className={selected?.id === t.id ? "is-selected" : undefined}
                    onClick={() => {
                      setSelected(t);
                      setNote(t.admin_note || "");
                    }}
                  >
                    <td>
                      <strong>{t.subject}</strong>
                      <div className="muted mono">{t.id}</div>
                    </td>
                    <td>{t.category}</td>
                    <td>{t.priority}</td>
                    <td>
                      <span className={`settings-status ${statusClass(t.status)}`}>
                        {t.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td>{new Date(t.created_at).toLocaleString()}</td>
                    {scope === "all" ? <td>{t.user_name}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <aside className="card tech-support-detail">
          {!selected ? (
            <div className="tech-support-detail-empty">
              <div className="tech-support-empty-icon is-sm" aria-hidden>
                <Paperclip size={20} />
              </div>
              <h3>{isEmpty ? "Ready when you are" : "Select a request"}</h3>
              <p className="muted">
                {isEmpty
                  ? "After you submit, details, attachments, and support notes open here."
                  : "Pick a row to view the full message, attachments, and status."}
              </p>
              {isEmpty ? (
                <button type="button" className="btn btn-secondary" onClick={() => setDialogOpen(true)}>
                  <Plus size={14} aria-hidden />
                  New request
                </button>
              ) : null}
            </div>
          ) : (
            <>
              <header>
                <h2>{selected.subject}</h2>
                <span className={`settings-status ${statusClass(selected.status)}`}>
                  {selected.status.replace(/_/g, " ")}
                </span>
              </header>
              <dl className="tech-support-meta">
                <dt>Reference</dt>
                <dd className="mono">{selected.id}</dd>
                <dt>Category</dt>
                <dd>{selected.category}</dd>
                <dt>Priority</dt>
                <dd>{selected.priority}</dd>
                <dt>From</dt>
                <dd>
                  {selected.user_name}
                  {selected.user_email ? ` · ${selected.user_email}` : ""}
                </dd>
                <dt>Created</dt>
                <dd>{new Date(selected.created_at).toLocaleString()}</dd>
              </dl>
              <p className="tech-support-message">{selected.message}</p>

              {selected.attachments?.length ? (
                <div className="tech-support-attachments">
                  <strong>
                    <Paperclip size={14} aria-hidden /> Attachments
                  </strong>
                  <ul>
                    {selected.attachments.map((a) => (
                      <li key={a.path}>
                        <a href={a.url} target="_blank" rel="noreferrer">
                          {a.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {selected.admin_note ? (
                <div className="tech-support-note">
                  <strong>Support note</strong>
                  <p>{selected.admin_note}</p>
                </div>
              ) : null}

              <div className="tech-support-detail-actions">
                {canManageAll ? (
                  <>
                    <label className="pf-field">
                      <span className="pf-label">Status</span>
                      <select value={selected.status} onChange={(e) => void updateStatus(selected.id, e.target.value)}>
                        <option value="open">Open</option>
                        <option value="in_progress">In progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </label>
                    <label className="pf-field">
                      <span className="pf-label">Admin note</span>
                      <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
                    </label>
                    <button type="button" className="btn btn-secondary" onClick={() => void saveNote()}>
                      Save note
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={selected.status === "closed"}
                    onClick={() => void updateStatus(selected.id, "closed")}
                  >
                    Close request
                  </button>
                )}
                <button type="button" className="btn btn-secondary" onClick={() => setDialogOpen(true)}>
                  New request
                </button>
              </div>
            </>
          )}
        </aside>
      </div>

      <TechSupportDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmitted={(ticket) => {
          setItems((prev) => [ticket, ...prev]);
          setSelected(ticket);
          setNote(ticket.admin_note || "");
        }}
      />
    </div>
  );
}
