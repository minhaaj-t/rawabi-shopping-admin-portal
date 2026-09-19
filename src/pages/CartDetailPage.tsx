import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { adminApi } from "../lib/api";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { WhatsApp } from "../lib/icons";

const DEFAULT_NOTIFY_TITLE = "Cart reminder";
const DEFAULT_NOTIFY_MESSAGE = "You left items in your cart. Complete your order now.";
const DEFAULT_WHATSAPP = "Hi! You still have items waiting in your Rawabi cart. Complete your order whenever you're ready.";
const DEFAULT_EMAIL_SUBJECT = "Complete your Rawabi order";
const DEFAULT_EMAIL_MESSAGE = "You left items in your shopping cart. Visit Rawabi Shopping to complete your order.";

function formatMoney(v: unknown) {
  return `QAR ${Number(v ?? 0).toFixed(2)}`;
}

export function CartDetailPage() {
  const { userId: userIdParam } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = Number(userIdParam);
  const guestId = Number(searchParams.get("guest_id") || 0);

  const [data, setData] = useState<Awaited<ReturnType<typeof adminApi.cartShow>> | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [notifyTitle, setNotifyTitle] = useState(DEFAULT_NOTIFY_TITLE);
  const [notifyMessage, setNotifyMessage] = useState(DEFAULT_NOTIFY_MESSAGE);
  const [whatsappMessage, setWhatsappMessage] = useState(DEFAULT_WHATSAPP);
  const [emailSubject, setEmailSubject] = useState(DEFAULT_EMAIL_SUBJECT);
  const [emailMessage, setEmailMessage] = useState(DEFAULT_EMAIL_MESSAGE);

  async function load() {
    setError("");
    try {
      setData(await adminApi.cartShow(userId, guestId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load cart");
    }
  }

  useEffect(() => {
    if (!Number.isNaN(userId)) void load();
  }, [userId, guestId]);

  async function clearCart() {
    const ok = window.confirm("Clear this abandoned cart?");
    if (!ok) return;
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const res = await adminApi.cartClear(userId, guestId);
      setMsg(`Cleared ${res.items_cleared} item(s).`);
      navigate("/carts");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Clear failed");
    } finally {
      setBusy(false);
    }
  }

  async function sendNotify() {
    if (userId <= 0) {
      setError("Notifications require a registered customer");
      return;
    }
    setBusy(true);
    setError("");
    setMsg("");
    try {
      await adminApi.cartNotify(userId, { guest_id: guestId, title: notifyTitle, message: notifyMessage });
      setMsg("In-app notification sent.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Notification failed");
    } finally {
      setBusy(false);
    }
  }

  async function sendWhatsApp() {
    if (userId <= 0) {
      setError("WhatsApp reminders require a registered customer");
      return;
    }
    setBusy(true);
    setError("");
    setMsg("");
    try {
      await adminApi.cartWhatsApp(userId, { guest_id: guestId, message: whatsappMessage });
      setMsg("WhatsApp message sent.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "WhatsApp failed");
    } finally {
      setBusy(false);
    }
  }

  async function sendEmail() {
    if (userId <= 0) {
      setError("Email reminders require a registered customer");
      return;
    }
    setBusy(true);
    setError("");
    setMsg("");
    try {
      await adminApi.cartEmail(userId, { guest_id: guestId, subject: emailSubject, message: emailMessage });
      setMsg("Email sent.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Email failed");
    } finally {
      setBusy(false);
    }
  }

  if (!data && !error) return <LoadingIndicator label="Loading cart" padded />;
  if (error && !data) return <p className="error">{error}</p>;
  if (!data) return null;

  const customerName = data.user ? String(data.user.username) : "Guest";
  const isRegistered = userId > 0;

  return (
    <div>
      <div className="page-head">
        <div>
          <Link className="linkish" to="/carts">
            ← Abandoned Carts
          </Link>
          <h1 style={{ marginTop: 8 }}>
            {customerName}
            {isRegistered ? "" : ` · Guest ${guestId}`}
          </h1>
          <p className="page-sub muted">
            {data.item_count} items · {formatMoney(data.total)} · last updated {String(data.last_at ?? "").slice(0, 16).replace("T", " ")}
          </p>
        </div>
        <div className="actions">
          {isRegistered ? (
            <Link className="btn btn-secondary" to={`/customers/${userId}`}>
              View customer
            </Link>
          ) : null}
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void clearCart()}>
            Clear cart
          </button>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}

      <div className="detail-grid">
        <div className="card">
          <h3>Cart items</h3>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Store</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={String(item.cart_id)}>
                    <td className="wrap">{String(item.product_name ?? "-")}</td>
                    <td>{String(item.ec_prdct_sku ?? "-")}</td>
                    <td className="wrap">{String(item.ec_store_name ?? item.cart_store_id ?? "-")}</td>
                    <td>{formatMoney(item.cart_item_price)}</td>
                    <td>{String(item.cart_item_quantity)}</td>
                    <td>{formatMoney(item.cart_item_subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3>Summary</h3>
            <ul className="pre-order-meta">
              <li>
                <span>Type</span>
                <strong>{data.cart_type}</strong>
              </li>
              <li>
                <span>Items</span>
                <strong>{data.item_count}</strong>
              </li>
              <li>
                <span>Total</span>
                <strong>{formatMoney(data.total)}</strong>
              </li>
              <li>
                <span>First added</span>
                <strong>{String(data.first_at ?? "-")}</strong>
              </li>
              <li>
                <span>Last updated</span>
                <strong>{String(data.last_at ?? "-")}</strong>
              </li>
            </ul>
            {data.user ? (
              <>
                <p style={{ marginTop: 12 }}>
                  <span className="muted">Phone</span>
                  <br />
                  {String(data.user.phone ?? "-")}
                </p>
                <p>
                  <span className="muted">Email</span>
                  <br />
                  {String(data.user.email ?? "-")}
                </p>
              </>
            ) : null}
          </div>

          {isRegistered ? (
            <>
              <div className="card cart-reminder-card" style={{ marginBottom: 16 }}>
                <h3>In-app notification</h3>
                <label className="field">
                  Title
                  <input value={notifyTitle} onChange={(e) => setNotifyTitle(e.target.value)} />
                </label>
                <label className="field">
                  Message
                  <textarea rows={3} value={notifyMessage} onChange={(e) => setNotifyMessage(e.target.value)} />
                </label>
                <button type="button" className="btn btn-green" disabled={busy} onClick={() => void sendNotify()}>
                  Send notification
                </button>
              </div>

              <div className="card cart-reminder-card" style={{ marginBottom: 16 }}>
                <h3>WhatsApp reminder</h3>
                <label className="field">
                  Message
                  <textarea rows={3} value={whatsappMessage} onChange={(e) => setWhatsappMessage(e.target.value)} />
                </label>
                <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void sendWhatsApp()}>
                  <WhatsApp size={16} aria-hidden />
                  Send WhatsApp
                </button>
              </div>

              <div className="card cart-reminder-card">
                <h3>Email reminder</h3>
                <label className="field">
                  Subject
                  <input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
                </label>
                <label className="field">
                  Message
                  <textarea rows={3} value={emailMessage} onChange={(e) => setEmailMessage(e.target.value)} />
                </label>
                <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void sendEmail()}>
                  Send email
                </button>
              </div>
            </>
          ) : (
            <div className="card">
              <h3>Recovery tools</h3>
              <p className="muted">Guest carts can be reviewed and cleared. Push, WhatsApp, and email reminders are available once the customer registers.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
