import { useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { LifeBuoy, Paperclip, X } from "../lib/icons";
import { adminApi, type TechSupportTicket } from "../lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmitted?: (ticket: TechSupportTicket) => void;
};

export function TechSupportDialog({ open, onClose, onSubmitted }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("bug");
  const [priority, setPriority] = useState("normal");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [doneId, setDoneId] = useState("");

  if (!open) return null;

  function reset() {
    setSubject("");
    setCategory("bug");
    setPriority("normal");
    setMessage("");
    setFiles([]);
    setError("");
    setDoneId("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function close() {
    reset();
    onClose();
  }

  function onPickFiles(list: FileList | null) {
    if (!list?.length) return;
    const next = [...files, ...Array.from(list)].slice(0, 5);
    setFiles(next);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.set("subject", subject.trim());
      body.set("category", category);
      body.set("priority", priority);
      body.set("message", message.trim());
      for (const file of files) body.append("attachments[]", file);
      const ticket = await adminApi.createTechSupportTicket(body);
      setDoneId(ticket.id);
      onSubmitted?.(ticket);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={close}>
      <div
        className="modal-card tech-support-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tech-support-title"
      >
        <header className="tech-support-modal-head">
          <div>
            <h2 id="tech-support-title">
              <LifeBuoy size={18} aria-hidden /> Technical support
            </h2>
            <p className="muted">Describe the issue and attach screenshots or logs if helpful.</p>
          </div>
          <button type="button" className="modal-close-btn" aria-label="Close" onClick={close}>
            <X size={16} />
          </button>
        </header>

        {doneId ? (
          <div className="tech-support-modal-body">
            <div className="alert alert-success">Request submitted. Reference: {doneId}</div>
            <div className="settings-form-actions">
              <Link className="btn btn-secondary" to="/tech-support" onClick={close}>
                View my requests
              </Link>
              <button type="button" className="btn btn-primary" onClick={close}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form className="tech-support-modal-body" onSubmit={(e) => void onSubmit(e)}>
            {error ? <div className="alert alert-error">{error}</div> : null}

            <label className="pf-field">
              <span className="pf-label">Subject</span>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} required maxLength={160} placeholder="Short summary" />
            </label>

            <div className="tech-support-row">
              <label className="pf-field">
                <span className="pf-label">Category</span>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="bug">Bug / error</option>
                  <option value="access">Access / login</option>
                  <option value="feature">Feature request</option>
                  <option value="performance">Performance</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="pf-field">
                <span className="pf-label">Priority</span>
                <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </label>
            </div>

            <label className="pf-field">
              <span className="pf-label">Details</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={5}
                maxLength={5000}
                placeholder="What happened, which page, and steps to reproduce…"
              />
            </label>

            <div className="pf-field">
              <span className="pf-label">Attachments</span>
              <span className="pf-hint">Up to 5 files · images, PDF, Office, zip, logs (max 10 MB each)</span>
              <div className="tech-support-files">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}>
                  <Paperclip size={14} />
                  Add files
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  hidden
                  accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.log,image/*"
                  onChange={(e) => {
                    onPickFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                {files.length ? (
                  <ul className="tech-support-file-list">
                    {files.map((f, i) => (
                      <li key={`${f.name}-${i}`}>
                        <span>{f.name}</span>
                        <button
                          type="button"
                          className="btn-link"
                          onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>

            <div className="settings-form-actions">
              <button type="button" className="btn btn-secondary" onClick={close} disabled={busy}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? "Sending…" : "Submit request"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
