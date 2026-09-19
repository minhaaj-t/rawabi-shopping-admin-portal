import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { adminApi } from "../lib/api";
import { StatusBadge } from "../components/StatusBadge";
import { LoadingIndicator } from "../components/LoadingIndicator";

const CONVERTIBLE = new Set(["Processing", "Pre-Order", "Pre Order"]);

function productName(raw: unknown): string {
  if (typeof raw !== "string") return "-";
  try {
    const j = JSON.parse(raw) as Record<string, string>;
    return j.English || j.english || Object.values(j)[0] || raw;
  } catch {
    return raw;
  }
}

function formatAddress(order: Record<string, unknown>) {
  return [
    order.address,
    order.house_building,
    order.apartment_office,
    order.location,
  ]
    .filter(Boolean)
    .join(", ");
}

export function PreOrderDetailPage() {
  const { id } = useParams();
  const preOrderId = Number(id);
  const navigate = useNavigate();
  const [data, setData] = useState<Awaited<ReturnType<typeof adminApi.preOrder>> | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setError("");
    try {
      setData(await adminApi.preOrder(preOrderId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pre-order");
    }
  }

  useEffect(() => {
    if (preOrderId) void load();
  }, [preOrderId]);

  async function convert() {
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const res = await adminApi.convertPreOrder(preOrderId);
      setMsg(`Converted to order #${res.order_id}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Convert failed");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    const reason = window.prompt("Cancel reason (optional):") ?? "";
    setBusy(true);
    setError("");
    setMsg("");
    try {
      await adminApi.cancelPreOrder(preOrderId, reason || undefined);
      setMsg("Pre-order cancelled.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setBusy(false);
    }
  }

  if (!data && !error) return <LoadingIndicator label="Loading pre-order" padded />;
  if (error && !data) return <p className="error">{error}</p>;
  if (!data) return null;

  const o = data.order;
  const st = String(o.order_status);
  const canAct = CONVERTIBLE.has(st);
  const address = formatAddress(o);

  return (
    <div>
      <div className="page-head">
        <div>
          <Link className="linkish" to="/pre-orders">
            ← Pre Orders
          </Link>
          <h1 style={{ marginTop: 8 }}>{String(o.order_refno)}</h1>
          <p className="page-sub muted">Pre-order #{String(o.order_id)}</p>
        </div>
        <StatusBadge status={st} />
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}

      <div className="detail-grid">
        <div className="card">
          <h3>Items</h3>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Qty</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={String(item.ordr_id ?? item.ordr_item_id)}>
                    <td>{productName(item.ec_prdct_item_name)}</td>
                    <td>{String(item.ec_prdct_sku ?? "-")}</td>
                    <td>{String(item.ordr_item_quantity)}</td>
                    <td>QAR {Number(item.ordr_item_subtotal).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3>Summary</h3>
            <p>
              <span className="muted">Customer</span>
              <br />
              {String(o.username ?? "-")} · {String(o.phone ?? "")}
              {o.email ? (
                <>
                  <br />
                  {String(o.email)}
                </>
              ) : null}
            </p>
            <p>
              <span className="muted">Store</span>
              <br />
              {String(o.ec_store_name ?? o.order_storeid)}
            </p>
            {address ? (
              <p>
                <span className="muted">Delivery address</span>
                <br />
                {address}
              </p>
            ) : null}
            <p>
              <span className="muted">Schedule</span>
              <br />
              {String(o.order_schedule_date ?? "-")} {String(o.order_start_time ?? "")}
              {o.order_end_time ? `–${String(o.order_end_time)}` : ""}
            </p>
            <p>
              <span className="muted">Subtotal</span>
              <br />
              QAR {Number(o.order_subtotal ?? 0).toFixed(2)}
            </p>
            <p>
              <span className="muted">Payable</span>
              <br />
              QAR {Number(o.order_payable).toFixed(2)} ({String(o.order_payment)})
            </p>
            {o.order_note ? (
              <p>
                <span className="muted">Note</span>
                <br />
                {String(o.order_note)}
              </p>
            ) : null}
            {o.main_order_id ? (
              <p>
                <span className="muted">Converted order</span>
                <br />
                <Link className="linkish" to={`/orders/${o.main_order_id}`}>
                  View order #{String(o.main_order_id)}
                </Link>
              </p>
            ) : null}
            {o.order_cancel_reason ? (
              <p>
                <span className="muted">Cancel reason</span>
                <br />
                {String(o.order_cancel_reason)}
              </p>
            ) : null}

            {canAct ? (
              <div className="toolbar" style={{ marginTop: 12 }}>
                <button type="button" className="btn btn-green" disabled={busy} onClick={() => void convert()}>
                  {busy ? "Working…" : "Convert to order"}
                </button>
                <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void cancel()}>
                  Cancel pre-order
                </button>
              </div>
            ) : o.main_order_id ? (
              <div className="toolbar" style={{ marginTop: 12 }}>
                <button type="button" className="btn" onClick={() => navigate(`/orders/${o.main_order_id}`)}>
                  Open converted order
                </button>
              </div>
            ) : null}
          </div>

          <div className="card">
            <h3>Pre-order info</h3>
            <ul className="pre-order-meta">
              <li>
                <span>Created</span>
                <strong>{String(o.order_created_at ?? "-")}</strong>
              </li>
              <li>
                <span>Payment</span>
                <strong>{String(o.order_payment ?? "-")}</strong>
              </li>
              <li>
                <span>Delivery fee</span>
                <strong>QAR {Number(o.order_delivery_fee ?? 0).toFixed(2)}</strong>
              </li>
              <li>
                <span>Discount</span>
                <strong>QAR {Number(o.order_discount ?? 0).toFixed(2)}</strong>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
