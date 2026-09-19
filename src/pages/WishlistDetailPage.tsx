import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { adminApi } from "../lib/api";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { WhatsApp } from "../lib/icons";

const DEFAULT_NOTIFY_TITLE = "Wishlist reminder";
const DEFAULT_NOTIFY_MESSAGE = "Items you saved are waiting. Open Rawabi to add them to your cart.";
const DEFAULT_WHATSAPP =
  "Hi! You still have items saved on your Rawabi wishlist. Open the app whenever you're ready to shop.";
const DEFAULT_EMAIL_SUBJECT = "Your Rawabi wishlist is waiting";
const DEFAULT_EMAIL_MESSAGE =
  "You saved items on your Rawabi wishlist. Visit Rawabi Shopping to review them and complete your order.";

function formatMoney(v: unknown) {
  return `QAR ${Number(v ?? 0).toFixed(2)}`;
}

function detailPath(userId: number, guestId: number) {
  if (userId > 0) return `/wishlists/${userId}`;
  return `/wishlists/0?guest_id=${guestId}`;
}

export function wishlistDetailHref(userId: number, guestId: number) {
  return detailPath(userId, guestId);
}

export function WishlistDetailPage() {
  const { userId: userIdParam } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = Number(userIdParam);
  const guestId = Number(searchParams.get("guest_id") || 0);

  const [data, setData] = useState<Awaited<ReturnType<typeof adminApi.wishlistShow>> | null>(null);
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
      setData(await adminApi.wishlistShow(userId, guestId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load wishlist");
      setData(null);
    }
  }

  useEffect(() => {
    if (!Number.isNaN(userId)) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, guestId]);

  async function clearWishlist() {
    const ok = window.confirm("Clear this wishlist?");
    if (!ok) return;
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const res = await adminApi.wishlistClear(userId, guestId);
      setMsg(`Cleared ${res.items_cleared} item(s).`);
      navigate("/wishlists");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Clear failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(wishId: number, name: string) {
    if (!window.confirm(`Remove “${name}” from wishlist?`)) return;
    setBusy(true);
    setError("");
    setMsg("");
    try {
      await adminApi.deleteWishlist(wishId);
      setMsg("Item removed.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Remove failed");
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
      await adminApi.customerNotify(userId, { title: notifyTitle, message: notifyMessage });
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
      await adminApi.customerWhatsApp(userId, { message: whatsappMessage });
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
      await adminApi.customerEmail(userId, { subject: emailSubject, message: emailMessage });
      setMsg("Email sent.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Email failed");
    } finally {
      setBusy(false);
    }
  }

  if (!data && !error) return <LoadingIndicator label="Loading wishlist" padded />;
  if (error && !data) {
    return (
      <div>
        <Link className="linkish" to="/wishlists">
          ← Wishlist
        </Link>
        <p className="error" style={{ marginTop: 12 }}>
          {error}
        </p>
      </div>
    );
  }
  if (!data) return null;

  const customerName = data.user ? String(data.user.username) : "Guest";
  const isRegistered = userId > 0;
  const canViewCustomer = Boolean(data.user?.is_customer);

  return (
    <div>
      <div className="page-head">
        <div>
          <Link className="linkish" to="/wishlists">
            ← Wishlist
          </Link>
          <h1 style={{ marginTop: 8 }}>
            {customerName}
            {isRegistered ? "" : ` · Guest ${guestId}`}
            {data.user?.is_deleted ? " (deleted)" : ""}
          </h1>
          <p className="page-sub muted">
            {data.item_count} items · {formatMoney(data.total)}
            {isRegistered ? ` · user #${userId}` : ""}
          </p>
        </div>
        <div className="actions">
          {canViewCustomer ? (
            <Link className="btn btn-secondary" to={`/customers/${userId}`}>
              View customer
            </Link>
          ) : null}
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void clearWishlist()}>
            Clear wishlist
          </button>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}

      <div className="detail-grid">
        <div className="card">
          <h3>Wishlist items</h3>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.wish_id}>
                    <td className="wrap">
                      <Link className="brand-name-link" to={`/products/${item.product_id}/edit`}>
                        {item.product_name || `Product #${item.product_id}`}
                      </Link>
                    </td>
                    <td>{item.sku || "—"}</td>
                    <td>{formatMoney(item.price)}</td>
                    <td>
                      <span className={`status-pill ${item.product_status === 1 ? "is-on" : "is-off"}`}>
                        {item.product_status === 1 ? "Active" : "Off"}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={busy}
                        onClick={() =>
                          void removeItem(item.wish_id, item.product_name || `Product #${item.product_id}`)
                        }
                      >
                        Remove
                      </button>
                    </td>
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
                <strong>{data.wishlist_type}</strong>
              </li>
              <li>
                <span>Items</span>
                <strong>{data.item_count}</strong>
              </li>
              <li>
                <span>Total value</span>
                <strong>{formatMoney(data.total)}</strong>
              </li>
            </ul>
            {data.user ? (
              <>
                <p style={{ marginTop: 12 }}>
                  <span className="muted">Phone</span>
                  <br />
                  {String(data.user.phone ?? "—")}
                </p>
                <p>
                  <span className="muted">Email</span>
                  <br />
                  {String(data.user.email ?? "—")}
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
              <p className="muted">
                Guest wishlists can be reviewed and cleared. Push, WhatsApp, and email reminders are available once the
                customer registers.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
