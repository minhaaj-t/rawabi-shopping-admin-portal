import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../lib/api";
import type { DashboardAssignment, DashboardLayout } from "../lib/dashboard-layout";
import { ROLE_CATALOG, roleLabel } from "../lib/roles";

type Props = {
  layout: DashboardLayout;
  onClose: () => void;
  onSaved: () => void;
};

export function DashboardAssignModal({ layout, onClose, onSaved }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [assignDraft, setAssignDraft] = useState<DashboardAssignment[]>(
    layout.assignments.length ? [...layout.assignments] : [{ assign_type: "all", assign_ref: 0 }],
  );
  const [staff, setStaff] = useState<Array<{ id: number; username: string; user_level: number }>>([]);

  const levels = useMemo(
    () =>
      Object.values(ROLE_CATALOG)
        .filter((r) => r.portal)
        .map((r) => ({ level: r.level, label: r.label })),
    [],
  );

  useEffect(() => {
    void adminApi
      .staff({ per_page: 100 })
      .then((res) => {
        setStaff(
          (res.items as Array<Record<string, unknown>>).map((s) => ({
            id: Number(s.id ?? s.ec_user_id),
            username: String(s.username ?? s.ec_username ?? "User"),
            user_level: Number(s.user_level ?? 0),
          })),
        );
      })
      .catch(() => setStaff([]));
  }, []);

  async function save() {
    setBusy(true);
    setError("");
    try {
      await adminApi.syncDashboardAssignments(layout.id, assignDraft);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Assign failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card dash-assign-modal" onClick={(e) => e.stopPropagation()}>
        <div className="page-head">
          <h2>Assign · {layout.title}</h2>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="dash-assign-body">
          {error ? <div className="alert alert-error">{error}</div> : null}
          <p className="muted">Resolution order: specific user → role level → everyone.</p>
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
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void save()}>
              {busy ? "Saving…" : "Save assignments"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
