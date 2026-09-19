import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Download, ExternalLink, Mail, MessageCircle, WhatsApp } from "../lib/icons";
import { adminApi } from "../lib/api";
import { getUser, isStorePortal } from "../lib/auth";
import { StatusBadge } from "../components/StatusBadge";
import { LoadingIndicator } from "../components/LoadingIndicator";

const STATUSES = [
  "Processing",
  "Picking",
  "Picked",
  "Ondelivery",
  "Delivered",
  "Cancelled",
  "Cancelled Driver",
];

function productName(raw: unknown): string {
  if (typeof raw !== "string") return "-";
  try {
    const j = JSON.parse(raw) as Record<string, string>;
    return j.English || j.english || Object.values(j)[0] || raw;
  } catch {
    return raw;
  }
}

export function OrderDetailPage() {
  const { id } = useParams();
  const orderId = Number(id);
  const user = getUser();
  const storePortal = isStorePortal(user);
  const [data, setData] = useState<Awaited<ReturnType<typeof adminApi.order>> | null>(null);
  const [stores, setStores] = useState<Array<{ ec_store_id: number; ec_store_name: string }>>([]);
  const [slots, setSlots] = useState<Array<Record<string, unknown>>>([]);
  const [status, setStatus] = useState("");
  const [newStore, setNewStore] = useState("");
  const [slotDate, setSlotDate] = useState("");
  const [slotId, setSlotId] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [invoiceEmail, setInvoiceEmail] = useState("");
  const [invoicePhone, setInvoicePhone] = useState("");
  const [invoiceBusy, setInvoiceBusy] = useState("");

  async function load() {
    setError("");
    try {
      const res = await adminApi.order(orderId);
      setData(res);
      setStatus(String(res.order.order_status === "Deliverd" ? "Delivered" : res.order.order_status));
      setSlotDate(String(res.order.order_schedule_date ?? ""));
      setInvoiceEmail(String(res.order.email ?? ""));
      setInvoicePhone(String(res.order.phone ?? res.order.address_mobile ?? ""));
      if (!storePortal) {
        const s = await adminApi.stores();
        setStores(s);
        setNewStore(String(res.order.order_storeid ?? ""));
        const storeId = Number(res.order.order_storeid);
        if (storeId) {
          const slotRows = await adminApi.orderSlots(storeId);
          setSlots(slotRows);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  useEffect(() => {
    if (orderId) void load();
  }, [orderId]);

  async function saveStatus() {
    setSaving(true);
    setError("");
    try {
      await adminApi.updateOrderStatus(orderId, status);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function doChangeStore() {
    if (!newStore) return;
    setSaving(true);
    setError("");
    try {
      await adminApi.changeOrderStore(orderId, Number(newStore));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Store change failed");
    } finally {
      setSaving(false);
    }
  }

  async function doChangeSlot() {
    const slot = slots.find((s) => String(s.slot_id) === slotId);
    if (!slot || !slotDate) return;
    setSaving(true);
    setError("");
    setMsg("");
    try {
      await adminApi.changeOrderSlot(orderId, {
        date: slotDate,
        start_time: String(slot.slot_start_time),
        end_time: String(slot.slot_end_time),
      });
      await load();
      setMsg("Delivery slot updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Slot change failed");
    } finally {
      setSaving(false);
    }
  }

  async function downloadInvoice() {
    setInvoiceBusy("download");
    setError("");
    setMsg("");
    try {
      const { blob, filename } = await adminApi.downloadOrderInvoice(orderId, "pdf");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setMsg("Invoice PDF downloaded.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invoice download failed");
    } finally {
      setInvoiceBusy("");
    }
  }

  async function sendInvoiceEmail() {
    if (!invoiceEmail.trim()) {
      setError("Enter a customer email address");
      return;
    }
    setInvoiceBusy("email");
    setError("");
    setMsg("");
    try {
      await adminApi.sendOrderInvoiceEmail(orderId, invoiceEmail.trim());
      setMsg(`Invoice sent to ${invoiceEmail.trim()}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Email send failed");
    } finally {
      setInvoiceBusy("");
    }
  }

  async function sendInvoiceWhatsApp() {
    if (!invoicePhone.trim()) {
      setError("Enter a customer phone number");
      return;
    }
    setInvoiceBusy("whatsapp");
    setError("");
    setMsg("");
    try {
      const res = await adminApi.sendOrderInvoiceWhatsApp(orderId, invoicePhone.trim(), true);
      setMsg(
        res.document_sent
          ? `Invoice sent on WhatsApp to ${invoicePhone.trim()}.`
          : `Invoice summary sent on WhatsApp to ${invoicePhone.trim()}.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "WhatsApp send failed");
    } finally {
      setInvoiceBusy("");
    }
  }

  if (!data && !error) return <LoadingIndicator label="Loading order" padded />;
  if (error && !data) return <p className="error">{error}</p>;
  if (!data) return null;

  const o = data.order;
  const st = String(o.order_status === "Deliverd" ? "Delivered" : o.order_status);
  const canChangeStore = !storePortal && !["Delivered", "Cancelled", "Cancelled Driver"].includes(st);
  const canChangeSlot = st === "Processing";

  return (
    <div>
      <div className="page-head">
        <div>
          <Link className="linkish" to="/orders">
            ← Orders
          </Link>
          <h1 style={{ marginTop: 8 }}>{String(o.order_refno)}</h1>
        </div>
        <div className="page-head-actions">
          <Link className="btn btn-secondary" to={`/support/chats?order_id=${orderId}`}>
            <MessageCircle size={14} aria-hidden />
            Help center
          </Link>
          <StatusBadge status={String(o.order_status)} />
        </div>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}
      <div className="detail-grid">
        <div className="card">
          <h3>Items</h3>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Pick</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={String(item.ordr_id)}>
                    <td>{productName(item.ec_prdct_item_name)}</td>
                    <td>{String(item.ordr_item_quantity)}</td>
                    <td>QAR {Number(item.ordr_item_subtotal).toFixed(2)}</td>
                    <td>{String(item.ordr_pick_status)}</td>
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
            </p>
            <p>
              <span className="muted">Store</span>
              <br />
              {String(o.ec_store_name ?? o.order_storeid)}
            </p>
            <p>
              <span className="muted">Slot</span>
              <br />
              {String(o.order_schedule_date ?? "-")} {String(o.order_start_time ?? "")}–
              {String(o.order_end_time ?? "")}
            </p>
            <p>
              <span className="muted">Payable</span>
              <br />
              QAR {Number(o.order_payable).toFixed(2)} ({String(o.order_payment)})
            </p>
            {o.order_note ? (
              <p>
                <span className="muted">Customer note</span>
                <br />
                {String(o.order_note)}
              </p>
            ) : null}
            {o.address_instruction ? (
              <p>
                <span className="muted">Delivery notes</span>
                <br />
                {String(o.address_instruction)}
              </p>
            ) : null}
            {(Boolean(o.address) || Boolean(o.house_building) || Boolean(o.location)) && (
              <p>
                <span className="muted">Address</span>
                <br />
                {[o.house_building, o.apartment_office, o.address, o.location]
                  .filter(Boolean)
                  .map(String)
                  .join(", ")}
              </p>
            )}
            <div className="toolbar">
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button type="button" className="btn btn-green" disabled={saving} onClick={saveStatus}>
                {saving ? "Saving…" : "Update status"}
              </button>
            </div>
          </div>

          {canChangeStore ? (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3>Change store</h3>
              <p className="muted">Resets order to Processing and clears picker/driver.</p>
              <div className="toolbar">
                <select value={newStore} onChange={(e) => setNewStore(e.target.value)}>
                  {stores.map((s) => (
                    <option key={s.ec_store_id} value={s.ec_store_id}>
                      {s.ec_store_name}
                    </option>
                  ))}
                </select>
                <button type="button" className="btn" disabled={saving} onClick={doChangeStore}>
                  Change store
                </button>
              </div>
            </div>
          ) : null}

          {canChangeSlot ? (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3>Change slot</h3>
              <div className="toolbar" style={{ flexWrap: "wrap" }}>
                <input type="date" value={slotDate} onChange={(e) => setSlotDate(e.target.value)} />
                <select value={slotId} onChange={(e) => setSlotId(e.target.value)}>
                  <option value="">Select slot</option>
                  {slots.map((s) => (
                    <option key={String(s.slot_id)} value={String(s.slot_id)}>
                      {String(s.slot_start_time)} – {String(s.slot_end_time)}
                    </option>
                  ))}
                </select>
                <button type="button" className="btn" disabled={saving || !slotId} onClick={doChangeSlot}>
                  Change slot
                </button>
              </div>
            </div>
          ) : null}

          <div className="card order-invoice-card" style={{ marginBottom: 16 }}>
            <h3>Invoice</h3>
            <p className="muted pf-hint">Download, preview, or send the order invoice to the customer.</p>
            <div className="order-invoice-actions">
              <button type="button" className="btn btn-secondary" disabled={Boolean(invoiceBusy)} onClick={() => void downloadInvoice()}>
                <Download size={14} />
                {invoiceBusy === "download" ? "Downloading…" : "Download PDF"}
              </button>
              <Link
                className="btn btn-secondary"
                to={`/invoice/${String(o.order_refno)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={14} />
                Preview
              </Link>
            </div>
            <div className="order-invoice-send-grid">
              <label className="pf-field">
                <span className="pf-label">Email invoice</span>
                <div className="order-invoice-field-row">
                  <input
                    type="email"
                    value={invoiceEmail}
                    onChange={(e) => setInvoiceEmail(e.target.value)}
                    placeholder="customer@email.com"
                  />
                  <button type="button" className="btn" disabled={invoiceBusy === "email"} onClick={() => void sendInvoiceEmail()}>
                    <Mail size={14} />
                    {invoiceBusy === "email" ? "Sending…" : "Send"}
                  </button>
                </div>
              </label>
              <label className="pf-field">
                <span className="pf-label">WhatsApp invoice</span>
                <div className="order-invoice-field-row">
                  <input
                    value={invoicePhone}
                    onChange={(e) => setInvoicePhone(e.target.value)}
                    placeholder="+974 5000 0000"
                  />
                  <button type="button" className="btn btn-green" disabled={invoiceBusy === "whatsapp"} onClick={() => void sendInvoiceWhatsApp()}>
                    <WhatsApp size={16} />
                    {invoiceBusy === "whatsapp" ? "Sending…" : "Send"}
                  </button>
                </div>
              </label>
            </div>
            <p className="muted pf-hint">WhatsApp uses Meta Cloud API. Configure WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in backend .env.</p>
          </div>

          <div className="card">
            <h3>Timeline</h3>
            {data.timeline.length === 0 ? (
              <p className="muted">No status log yet.</p>
            ) : (
              <ul>
                {data.timeline.map((t) => (
                  <li key={String(t.st_id)}>
                    <strong>{String(t.st_status)}</strong> · {String(t.st_date)} {String(t.st_time)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
