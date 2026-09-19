import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { adminApi } from "../lib/api";
import { StatusBadge } from "../components/StatusBadge";
import { LoadingIndicator } from "../components/LoadingIndicator";

const APPROVAL_OPTIONS = [
  { value: 0, label: "Pending" },
  { value: 1, label: "Added" },
  { value: 2, label: "Rejected" },
  { value: 3, label: "Already Added" },
];

function formatMoney(v: unknown) {
  return `QAR ${Number(v ?? 0).toFixed(2)}`;
}

export function FloorRequestDetailPage() {
  const { id } = useParams();
  const requestId = Number(id);
  const navigate = useNavigate();

  const [data, setData] = useState<Awaited<ReturnType<typeof adminApi.floorRequest>> | null>(null);
  const [approval, setApproval] = useState(0);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setError("");
    try {
      const item = await adminApi.floorRequest(requestId);
      setData(item);
      setApproval(item.approval);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load floor request");
    }
  }

  useEffect(() => {
    if (requestId) void load();
  }, [requestId]);

  async function saveStatus() {
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const res = await adminApi.updateFloorRequest(requestId, approval);
      setMsg(`Status updated to ${res.approval_label}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function quickAction(nextApproval: number) {
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const res = await adminApi.updateFloorRequest(requestId, nextApproval);
      setMsg(`Marked as ${res.approval_label}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  if (!data && !error) return <LoadingIndicator label="Loading floor request" padded />;
  if (error && !data) return <p className="error">{error}</p>;
  if (!data) return null;

  return (
    <div className="orders-page">
      <div className="page-head">
        <div>
          <p className="page-sub">
            <Link to="/floor-requests">Floor requests</Link> / #{data.id}
          </p>
          <h1>{data.title}</h1>
          <p className="page-sub">
            {data.store_name} · {data.manager_name || "Floor manager"}
          </p>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate("/floor-requests")}>
            Back
          </button>
          {data.approval === 0 ? (
            <>
              <button type="button" className="btn btn-green" disabled={busy} onClick={() => void quickAction(1)}>
                Approve
              </button>
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void quickAction(2)}>
                Reject
              </button>
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void quickAction(3)}>
                Already added
              </button>
            </>
          ) : null}
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}

      <div className="detail-grid">
        <div className="card">
          <h3>Product details</h3>
          <p>
            <span className="muted">Title</span>
            <br />
            {data.title}
          </p>
          <p>
            <span className="muted">SKU (Rawabi code)</span>
            <br />
            {data.sku}
            {data.sku_exists ? " · In catalog" : " · Not in catalog"}
          </p>
          <p>
            <span className="muted">Barcode</span>
            <br />
            {data.barcode || "—"}
          </p>
          <p>
            <span className="muted">Category</span>
            <br />
            {data.category_name || "—"}
          </p>
          <p>
            <span className="muted">UOM</span>
            <br />
            {data.uom || "—"}
          </p>
          <p>
            <span className="muted">Unit price</span>
            <br />
            {formatMoney(data.unit_price)}
          </p>
          <p>
            <span className="muted">Offer price</span>
            <br />
            {formatMoney(data.offer_price)}
          </p>
          <p>
            <span className="muted">Note</span>
            <br />
            {data.note || "—"}
          </p>
          {data.image_url ? (
            <div style={{ marginTop: 16 }}>
              <img src={data.image_url} alt={data.title} style={{ maxWidth: 240, borderRadius: 8 }} />
            </div>
          ) : null}
          {data.product_id ? (
            <p style={{ marginTop: 16 }}>
              <Link className="btn btn-secondary btn-sm" to={`/products/${data.product_id}/edit`}>
                Open product #{data.product_id}
              </Link>
            </p>
          ) : null}
        </div>

        <div className="card">
          <h3>Request info</h3>
          <p>
            <span className="muted">Status</span>
            <br />
            <StatusBadge status={data.approval_label} />
          </p>
          <p>
            <span className="muted">Requested by</span>
            <br />
            {data.manager_name || "—"}
            {data.manager_phone ? ` · ${data.manager_phone}` : ""}
          </p>
          <p>
            <span className="muted">Store</span>
            <br />
            {data.store_name || "—"}
          </p>
          <p>
            <span className="muted">Created</span>
            <br />
            {String(data.created_at ?? "").slice(0, 19).replace("T", " ")}
          </p>
          <p>
            <span className="muted">Last updated</span>
            <br />
            {String(data.updated_at ?? "").slice(0, 19).replace("T", " ")}
          </p>
          {data.admin_name ? (
            <p>
              <span className="muted">Processed by</span>
              <br />
              {data.admin_name}
            </p>
          ) : null}

          <div className="filter-grid" style={{ marginTop: 20 }}>
            <label>
              Update status
              <select value={approval} onChange={(e) => setApproval(Number(e.target.value))} disabled={busy}>
                {APPROVAL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="actions" style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-primary" disabled={busy || approval === data.approval} onClick={() => void saveStatus()}>
              {busy ? "Saving…" : "Save status"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
