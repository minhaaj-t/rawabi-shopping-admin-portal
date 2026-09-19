import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { Bell, Mail, MapPin, MessageCircle, ShoppingCart, Trash2, WhatsApp } from "../lib/icons";
import { adminApi } from "../lib/api";
import { StatusBadge } from "../components/StatusBadge";
import { LoadingCard } from "../components/LoadingIndicator";

type CustomerDetail = Awaited<ReturnType<typeof adminApi.customer>>;
type Tab =
  | "overview"
  | "orders"
  | "pre_orders"
  | "addresses"
  | "cart"
  | "wishlist"
  | "crm"
  | "activity"
  | "activity_log";
type EngageModal = "notify" | "whatsapp" | "email" | null;

function ProductLink({ id, name }: { id: number; name: string }) {
  if (!id) return <span>{name || "—"}</span>;
  return (
    <Link className="linkish" to={`/products/${id}/edit`}>
      {name || `#${id}`}
    </Link>
  );
}

export function CustomerDetailPage() {
  const { id } = useParams();
  const customerId = Number(id);
  const [data, setData] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [engageModal, setEngageModal] = useState<EngageModal>(null);
  const [engageBusy, setEngageBusy] = useState(false);
  const [notifyTitle, setNotifyTitle] = useState("Message from Rawabi");
  const [notifyMessage, setNotifyMessage] = useState("");
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [form, setForm] = useState({
    username: "",
    name_ar: "",
    email: "",
    phone: "",
    status: "1",
    dob: "",
    nationality: "",
    loyalty_points: "0",
  });

  async function load() {
    setError("");
    try {
      const res = await adminApi.customer(customerId);
      setData(res);
      setForm({
        username: String(res.customer.username ?? ""),
        name_ar: String(res.customer.name_ar ?? ""),
        email: String(res.customer.email ?? ""),
        phone: String(res.customer.phone ?? ""),
        status: String(res.customer.status ?? 1),
        dob: String(res.customer.dob ?? "").slice(0, 10),
        nationality: String(res.customer.nationality ?? ""),
        loyalty_points: String(res.customer.loyalty_points ?? res.stats.loyalty_points ?? 0),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load customer");
    }
  }

  useEffect(() => {
    void load();
  }, [customerId]);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    setError("");
    try {
      await adminApi.updateCustomer(customerId, {
        username: form.username,
        name_ar: form.name_ar || null,
        email: form.email || null,
        phone: form.phone,
        status: Number(form.status),
        dob: form.dob || null,
        nationality: form.nationality || null,
        loyalty_points: Number(form.loyalty_points || 0),
      });
      setMsg("Customer profile updated.");
      setEditOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function toggleStatus() {
    if (!data) return;
    const next = Number(data.customer.status) === 1 ? 0 : 1;
    try {
      await adminApi.updateCustomer(customerId, { status: next });
      setMsg(next === 1 ? "Customer activated." : "Customer deactivated.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function clearCart() {
    const ok = window.confirm("Clear this customer's cart?");
    if (!ok) return;
    setEngageBusy(true);
    setError("");
    setMsg("");
    try {
      const res = await adminApi.customerClearCart(customerId);
      setMsg(`Cart cleared (${res.items_cleared} item(s)).`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clear cart failed");
    } finally {
      setEngageBusy(false);
    }
  }

  async function submitEngage(e: FormEvent) {
    e.preventDefault();
    if (!engageModal) return;
    setEngageBusy(true);
    setError("");
    setMsg("");
    try {
      if (engageModal === "notify") {
        await adminApi.customerNotify(customerId, { title: notifyTitle, message: notifyMessage });
        setMsg("In-app notification sent.");
      } else if (engageModal === "whatsapp") {
        await adminApi.customerWhatsApp(customerId, { message: whatsappMessage });
        setMsg("WhatsApp message sent.");
      } else {
        await adminApi.customerEmail(customerId, { subject: emailSubject, message: emailMessage });
        setMsg("Email sent.");
      }
      setEngageModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setEngageBusy(false);
    }
  }

  if (error && !data) {
    return (
      <div className="page customer-detail-page">
        <header className="page-head">
          <div>
            <p className="settings-crumb">
              <Link to="/customers">Customers</Link>
              <span> / </span>
              <span>Detail</span>
            </p>
            <h1 className="page-title">Customer</h1>
          </div>
          <div className="page-head-actions">
            <Link className="btn btn-secondary" to="/customers">
              Back to customers
            </Link>
            <Link className="btn btn-secondary" to="/wishlists">
              Wishlist
            </Link>
          </div>
        </header>
        <div className="alert alert-error">{error}</div>
        <p className="muted">
          This ID is not a customer account (wrong level or missing). Open the customer from the Customers list or
          Wishlist when the account is a registered shopper.
        </p>
      </div>
    );
  }
  if (!data) return <LoadingCard label="Loading customer" />;

  const c = data.customer;
  const s = data.stats;
  const preOrders = data.pre_orders ?? [];
  const searchHistory = data.search_history ?? [];
  const activityLog = data.activity_log ?? [];

  return (
    <div className="page customer-detail-page">
      <header className="page-head">
        <div>
          <p className="settings-crumb">
            <Link to="/customers">Customers</Link>
            <span> / </span>
            <span>{String(c.username)}</span>
          </p>
          <h1 className="page-title">{String(c.username)}</h1>
          <p className="page-sub">
            {c.name_ar ? <span dir="rtl">{String(c.name_ar)}</span> : null}
            {c.name_ar ? " · " : null}
            {String(c.phone || "—")} · {String(c.email || "—")} · ID #{String(c.id)}
            {s.segment_label ? (
              <>
                {" · "}
                <Link className="linkish" to={`/analyst/customers?segment=${encodeURIComponent(String(s.segment ?? ""))}`}>
                  {String(s.segment_label)}
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <div className="page-head-actions">
          <Link className="btn btn-secondary" to={`/support/chats?user_id=${customerId}`}>
            <MessageCircle size={14} aria-hidden />
            Help center
          </Link>
          <button type="button" className="btn btn-secondary" onClick={() => setEditOpen(true)}>
            Edit profile
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => void toggleStatus()}>
            {Number(c.status) === 1 ? "Deactivate" : "Activate"}
          </button>
          <Link className="btn btn-primary" to={`/carts/${customerId}`}>
            <ShoppingCart size={14} aria-hidden />
            View cart
          </Link>
        </div>
      </header>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}
      {c.is_deleted ? (
        <div className="alert alert-error">
          This customer account is soft-deleted. Profile is read-only for investigation; restore from the database if needed.
        </div>
      ) : null}

      <div className="card-grid customer-stat-grid">
        <article className="stat-card card">
          <h3>Orders</h3>
          <strong>{Number(s.order_count)}</strong>
          <p className="stat-amount">{Number(s.delivered_count)} delivered · last {String(s.last_order_at ?? "—").slice(0, 10) || "—"}</p>
        </article>
        <article className="stat-card card">
          <h3>Lifetimeetime value</h3>
          <strong>QAR {Number(s.lifetime_value).toFixed(2)}</strong>
          <p className="stat-amount">Spent QAR {Number(s.total_spent).toFixed(2)} · {String(s.segment_label ?? "—")}</p>
        </article>
        <article className="stat-card card">
          <h3>Loyalty</h3>
          <strong>{Number(s.loyalty_points ?? c.loyalty_points ?? 0)} pts</strong>
          <p className="stat-amount">
            {Number(s.refund_count ?? 0)} refunds · QAR {Number(s.refunded_total ?? 0).toFixed(2)}
          </p>
        </article>
        <article className="stat-card card">
          <h3>{s.abandoned_cart ? "Abandoned cart" : "Cart"}</h3>
          <strong>{Number(s.cart_items)} items</strong>
          <p className="stat-amount">
            QAR {Number(s.cart_total).toFixed(2)} · {Number(s.wishlist_count)} wishlist · {Number(s.address_count)} addresses
          </p>
        </article>
      </div>

      <section className="card customer-engage-panel">
        <h2>Engagement</h2>
        <div className="orders-row-actions">
          <button type="button" className="btn btn-green btn-sm" onClick={() => setEngageModal("notify")}>
            <Bell size={14} aria-hidden />
            Notify
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEngageModal("whatsapp")}>
            <WhatsApp size={16} aria-hidden />
            WhatsApp
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEngageModal("email")}>
            <Mail size={14} aria-hidden />
            Email
          </button>
          <button type="button" className="btn btn-secondary btn-sm" disabled={engageBusy || Number(s.cart_items) === 0} onClick={() => void clearCart()}>
            <Trash2 size={14} aria-hidden />
            Clear cart
          </button>
        </div>
      </section>

      <div className="customer-tabs card">
        {(
          [
            ["overview", "Overview"],
            ["orders", `Orders (${data.orders.length})`],
            ["pre_orders", `Pre-orders (${preOrders.length})`],
            ["addresses", `Addresses (${data.addresses.length})`],
            ["cart", `Cart (${data.cart.length})`],
            ["wishlist", `Wishlist (${data.wishlist.length})`],
            [
              "crm",
              `CRM (${
                (data.favorites?.length ?? 0) +
                (data.refunds?.length ?? 0) +
                (data.support_tickets?.length ?? 0) +
                (data.complaints?.length ?? 0) +
                (data.coupons?.length ?? 0)
              })`,
            ],
            [
              "activity",
              `Activity (${
                (data.activity_needs?.length ?? 0) +
                (data.product_suggestions?.length ?? 0) +
                (data.promotions?.length ?? 0)
              })`,
            ],
            ["activity_log", `Activity log (${Number(s.activity_log_count ?? activityLog.length)})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="customer-detail-grid">
          <section className="card">
            <h2>Profile</h2>
            <dl className="customer-dl">
              <dt>Name (EN)</dt>
              <dd>{String(c.username || "—")}</dd>
              <dt>Name (AR)</dt>
              <dd className={c.name_ar ? "is-rtl" : undefined}>{String(c.name_ar || "—")}</dd>
              <dt>Mobile</dt>
              <dd>{String(c.phone || "—")}</dd>
              <dt>Email</dt>
              <dd>{String(c.email || "—")}</dd>
              <dt>DOB</dt>
              <dd>{String(c.dob ?? "—").slice(0, 10) || "—"}</dd>
              <dt>Nationality</dt>
              <dd>{String(c.nationality || "—")}</dd>
              <dt>Status</dt>
              <dd>
                <StatusBadge status={Number(c.status) === 1 ? "Active" : "Inactive"} />
              </dd>
              <dt>Segment</dt>
              <dd>
                <Link className="linkish" to={`/analyst/customers?segment=${encodeURIComponent(String(s.segment ?? ""))}`}>
                  {String(s.segment_label ?? "—")}
                </Link>
              </dd>
              <dt>Registered</dt>
              <dd>{String(c.create_date ?? "—")}</dd>
              <dt>Last login</dt>
              <dd>{String(c.last_login_update ?? "—")}</dd>
              <dt>Last purchase</dt>
              <dd>{String(s.last_order_at ?? "—")}</dd>
              <dt>Loyalty points</dt>
              <dd>{Number(s.loyalty_points ?? c.loyalty_points ?? 0)}</dd>
            </dl>
          </section>
          <section className="card">
            <h2>Recent orders</h2>
            {data.orders.length === 0 ? (
              <p className="muted">No orders yet.</p>
            ) : (
              <table className="data compact">
                <thead>
                  <tr>
                    <th>Ref</th>
                    <th>Status</th>
                    <th>Payable</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders.slice(0, 5).map((o) => (
                    <tr key={String(o.order_id)}>
                      <td>
                        <Link className="linkish" to={`/orders/${o.order_id}`}>
                          {String(o.order_refno)}
                        </Link>
                      </td>
                      <td>
                        <StatusBadge status={String(o.order_status)} />
                      </td>
                      <td>QAR {Number(o.order_payable).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
          <section className="card customer-crm-card">
            <h2>CRM snapshot</h2>
            <dl className="customer-dl customer-dl-metrics">
              <dt>Favorites</dt>
              <dd>{Number(s.favorite_count ?? data.favorites?.length ?? 0)}</dd>
              <dt>Wishlist</dt>
              <dd>{Number(s.wishlist_count ?? data.wishlist.length)}</dd>
              <dt>Coupons</dt>
              <dd>{Number(s.coupon_count ?? data.coupons?.length ?? 0)}</dd>
              <dt>Tickets</dt>
              <dd>{Number(s.support_ticket_count ?? data.support_tickets?.length ?? 0)}</dd>
              <dt>Complaints</dt>
              <dd>{Number(s.complaint_count ?? data.complaints?.length ?? 0)}</dd>
              <dt>Refunds</dt>
              <dd>
                {Number(s.refund_count ?? 0)} · QAR {Number(s.refunded_total ?? 0).toFixed(2)}
              </dd>
              <dt>Abandoned</dt>
              <dd>{s.abandoned_cart ? "Yes — engage to recover" : "No"}</dd>
            </dl>
            <div className="orders-row-actions">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setTab("crm")}>
                Open CRM
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setTab("wishlist")}>
                Wishlist
              </button>
              <Link className="btn btn-secondary btn-sm" to={`/support/chats?user_id=${customerId}`}>
                Tickets
              </Link>
            </div>
          </section>
        </div>
      ) : null}

      {tab === "orders" ? (
        <div className="card table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Ref</th>
                <th>Store</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Subtotal</th>
                <th>Discount</th>
                <th>Delivery</th>
                <th>Payable</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.orders.map((o) => (
                <tr key={String(o.order_id)}>
                  <td>
                    <Link className="linkish" to={`/orders/${o.order_id}`}>
                      {String(o.order_refno)}
                    </Link>
                  </td>
                  <td>{String(o.store_name || o.order_type || "—")}</td>
                  <td>
                    <StatusBadge status={String(o.order_status)} />
                  </td>
                  <td>{String(o.order_payment || "—")}</td>
                  <td>QAR {Number(o.order_subtotal).toFixed(2)}</td>
                  <td>QAR {Number(o.order_discount).toFixed(2)}</td>
                  <td>QAR {Number(o.order_delivery_fee).toFixed(2)}</td>
                  <td>QAR {Number(o.order_payable).toFixed(2)}</td>
                  <td>{String(o.order_created_at)}</td>
                </tr>
              ))}
              {data.orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="muted">
                    No orders
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "pre_orders" ? (
        <div className="card table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Ref</th>
                <th>Store</th>
                <th>Status</th>
                <th>Payable</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {preOrders.map((p) => (
                <tr key={String(p.order_id)}>
                  <td>{String(p.order_refno)}</td>
                  <td>{String(p.store_name || "—")}</td>
                  <td>
                    <StatusBadge status={String(p.order_status)} />
                  </td>
                  <td>QAR {Number(p.order_payable).toFixed(2)}</td>
                  <td>{String(p.order_created_at)}</td>
                  <td>
                    <Link className="btn btn-secondary btn-sm" to={`/pre-orders/${p.order_id}`}>
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {preOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">
                    No pre-orders
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "addresses" ? (
        <div className="customer-address-grid">
          {data.addresses.map((a) => (
            <article key={String(a.address_id)} className="card customer-address-card">
              <header>
                <MapPin size={16} aria-hidden />
                <strong>{String(a.address_name || "Address")}</strong>
                {Number(a.is_default) === 1 ? <span className="access-perm-tag">Default</span> : null}
              </header>
              <p>{String(a.address_type || "—")}</p>
              <dl className="customer-dl">
                <dt>Zone</dt>
                <dd>{String(a.location || "—")}</dd>
                <dt>Mobile</dt>
                <dd>{String(a.mobile || "—")}</dd>
                <dt>Building</dt>
                <dd>{String(a.house_building || "—")}</dd>
                <dt>Apartment</dt>
                <dd>{String(a.apartment_office || "—")}</dd>
                <dt>Floor</dt>
                <dd>{String(a.floor || "—")}</dd>
                <dt>Address</dt>
                <dd>{String(a.address || "—")}</dd>
                <dt>Instructions</dt>
                <dd>{String(a.address_instruction || "—")}</dd>
              </dl>
            </article>
          ))}
          {data.addresses.length === 0 ? <div className="card muted">No saved addresses.</div> : null}
        </div>
      ) : null}

      {tab === "cart" ? (
        <div className="card table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Store</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Subtotal</th>
                <th>Added</th>
              </tr>
            </thead>
            <tbody>
              {data.cart.map((item) => (
                <tr key={String(item.cart_id)}>
                  <td>
                    <ProductLink id={Number(item.product_id)} name={String(item.product_name || item.product_id)} />
                  </td>
                  <td>{String(item.sku || "—")}</td>
                  <td>{String(item.store_id)}</td>
                  <td>{Number(item.quantity)}</td>
                  <td>QAR {Number(item.price).toFixed(2)}</td>
                  <td>QAR {Number(item.subtotal).toFixed(2)}</td>
                  <td>{String(item.created_at)}</td>
                </tr>
              ))}
              {data.cart.length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted">
                    Cart is empty
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          {s.abandoned_cart ? (
            <p className="muted" style={{ margin: 12 }}>
              Flagged as abandoned cart — use Notify / WhatsApp / Email above to recover.
            </p>
          ) : null}
        </div>
      ) : null}

      {tab === "wishlist" ? (
        <div className="card table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
              </tr>
            </thead>
            <tbody>
              {data.wishlist.map((w) => (
                <tr key={String(w.wish_id)}>
                  <td>
                    <ProductLink id={Number(w.product_id)} name={String(w.product_name)} />
                  </td>
                  <td>{String(w.sku || "—")}</td>
                </tr>
              ))}
              {data.wishlist.length === 0 ? (
                <tr>
                  <td colSpan={2} className="muted">
                    No wishlist items
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "crm" ? (
        <div className="customer-activity-tables">
          <div className="card table-wrap">
            <div className="panel-toolbar">
              <strong>Favorite products</strong>
              <span className="muted">From order history</span>
            </div>
            <table className="data">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Qty</th>
                  <th>Orders</th>
                  <th>Spend</th>
                </tr>
              </thead>
              <tbody>
                {(data.favorites ?? []).map((f) => (
                  <tr key={String(f.product_id)}>
                    <td>
                      <ProductLink id={Number(f.product_id)} name={String(f.product_name)} />
                    </td>
                    <td>{String(f.sku || "—")}</td>
                    <td>{Number(f.qty_bought)}</td>
                    <td>{Number(f.times_ordered)}</td>
                    <td>QAR {Number(f.spend).toFixed(2)}</td>
                  </tr>
                ))}
                {(data.favorites ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted">
                      No purchase favorites yet
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="card table-wrap">
            <div className="panel-toolbar">
              <strong>Coupons</strong>
            </div>
            <table className="data">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Type</th>
                  <th>Title</th>
                  <th>Help</th>
                </tr>
              </thead>
              <tbody>
                {(data.coupons ?? []).map((cpn, idx) => (
                  <tr key={`${String(cpn.code ?? cpn.id ?? idx)}-${idx}`}>
                    <td>{String(cpn.code ?? "—")}</td>
                    <td>{String(cpn.discount_type ?? "—")}</td>
                    <td>{String(cpn.title ?? "—")}</td>
                    <td>{String(cpn.help ?? "—")}</td>
                  </tr>
                ))}
                {(data.coupons ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="muted">
                      No applicable coupons
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="card table-wrap">
            <div className="panel-toolbar">
              <strong>Refund history</strong>
              <Link className="btn btn-secondary btn-sm" to="/finance/refunds">
                All refunds
              </Link>
            </div>
            <table className="data">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Status</th>
                  <th>Payable</th>
                  <th>Refunded</th>
                  <th>Refund status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {(data.refunds ?? []).map((r) => (
                  <tr key={String(r.order_id)}>
                    <td>
                      <Link className="linkish" to={`/orders/${r.order_id}`}>
                        {String(r.order_refno)}
                      </Link>
                    </td>
                    <td>
                      <StatusBadge status={String(r.order_status)} />
                    </td>
                    <td>QAR {Number(r.order_payable).toFixed(2)}</td>
                    <td>QAR {Number(r.refunded_amount).toFixed(2)}</td>
                    <td>{Number(r.refund_status) === 1 ? "Done" : Number(r.refund_status) || "—"}</td>
                    <td>{String(r.order_created_at ?? "—")}</td>
                  </tr>
                ))}
                {(data.refunds ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="muted">
                      No refunds
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="card table-wrap">
            <div className="panel-toolbar">
              <strong>Support tickets</strong>
              <Link className="btn btn-secondary btn-sm" to={`/support/chats?user_id=${customerId}`}>
                Open help center
              </Link>
            </div>
            <table className="data">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Channel</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {(data.support_tickets ?? []).map((t) => (
                  <tr key={String(t.id)}>
                    <td>
                      <Link className="linkish" to={`/support/chats?user_id=${customerId}`}>
                        #{t.id}
                      </Link>
                    </td>
                    <td>{String(t.subject || "—")}</td>
                    <td>{String(t.status || "—")}</td>
                    <td>{String(t.priority || "—")}</td>
                    <td>{String(t.channel || "—")}</td>
                    <td>{String(t.last_message_at ?? t.created_at ?? "—")}</td>
                  </tr>
                ))}
                {(data.support_tickets ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="muted">
                      No support tickets
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="card table-wrap">
            <div className="panel-toolbar">
              <strong>Complaints</strong>
              <span className="muted">Contact form + negative reviews</span>
            </div>
            <table className="data">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>From</th>
                  <th>Message</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {(data.complaints ?? []).map((row, idx) => (
                  <tr key={`${row.source}-${row.id}-${idx}`}>
                    <td>{String(row.source)}</td>
                    <td>
                      {String(row.name || "—")}
                      {row.phone ? <div className="muted">{String(row.phone)}</div> : null}
                    </td>
                    <td>{String(row.message || "—")}</td>
                    <td>{String(row.created_at ?? "—")}</td>
                  </tr>
                ))}
                {(data.complaints ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="muted">
                      No complaints on file
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === "activity" ? (
        <div className="customer-activity-tables">
          <div className="card table-wrap">
            <div className="panel-toolbar">
              <strong>Activity needs</strong>
            </div>
            <table className="data">
              <thead>
                <tr>
                  <th>Need</th>
                  <th>Priority</th>
                  <th>Help</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data.activity_needs ?? []).map((n) => (
                  <tr key={n.id}>
                    <td>
                      <strong>{n.title}</strong>
                    </td>
                    <td>
                      <span className={`access-perm-tag customer-need-tag-${n.priority}`}>{n.priority}</span>
                    </td>
                    <td>{n.help}</td>
                    <td className="actions">
                      {n.action === "engage_cart" || n.action === "engage" ? (
                        <>
                          <button type="button" className="btn btn-green btn-sm" onClick={() => setEngageModal("notify")}>
                            Notify
                          </button>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEngageModal("whatsapp")}>
                            <WhatsApp size={16} aria-hidden />
                            WhatsApp
                          </button>
                        </>
                      ) : n.action === "analyst" ? (
                        <Link className="btn btn-secondary btn-sm" to="/analyst/product-match">
                          Product match
                        </Link>
                      ) : n.action === "promo" ? (
                        <Link className="btn btn-secondary btn-sm" to="/promotions">
                          Promotions
                        </Link>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {(data.activity_needs ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="muted">
                      No open needs right now
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="card table-wrap">
            <div className="panel-toolbar">
              <strong>Promotions help</strong>
              <div className="actions">
                <Link className="btn btn-secondary btn-sm" to="/promotions">
                  Manage promotions
                </Link>
              </div>
            </div>
            <table className="data">
              <thead>
                <tr>
                  <th>Promotion</th>
                  <th>Help</th>
                  <th>Category</th>
                  <th>Start</th>
                  <th>End</th>
                </tr>
              </thead>
              <tbody>
                {(data.promotions ?? []).map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.title}</strong>
                      {p.description ? <div className="muted">{p.description}</div> : null}
                    </td>
                    <td>{p.help}</td>
                    <td>{p.category || "—"}</td>
                    <td>{p.start_date ? String(p.start_date).slice(0, 10) : "—"}</td>
                    <td>{p.end_date ? String(p.end_date).slice(0, 10) : "—"}</td>
                  </tr>
                ))}
                {(data.promotions ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted">
                      No live promotions
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="card table-wrap">
            <div className="panel-toolbar">
              <strong>Coupons help</strong>
              <div className="actions">
                <Link className="btn btn-secondary btn-sm" to="/coupons">
                  Manage coupons
                </Link>
              </div>
            </div>
            <table className="data">
              <thead>
                <tr>
                  <th>Coupon</th>
                  <th>Code</th>
                  <th>Help</th>
                  <th>Instruction</th>
                  <th>Valid</th>
                </tr>
              </thead>
              <tbody>
                {(data.coupons ?? []).map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.title}</strong>
                    </td>
                    <td>
                      <code>{c.code || "—"}</code>
                    </td>
                    <td>{c.help}</td>
                    <td>{c.instruction || "—"}</td>
                    <td>
                      {c.start_date ? String(c.start_date).slice(0, 10) : "—"} →{" "}
                      {c.end_date ? String(c.end_date).slice(0, 10) : "—"}
                    </td>
                  </tr>
                ))}
                {(data.coupons ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted">
                      No applicable coupons
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="card table-wrap">
            <div className="panel-toolbar">
              <strong>Auto product suggestions</strong>
              <div className="actions">
                <Link
                  className="btn btn-secondary btn-sm"
                  to={`/analyst/product-match${
                    searchHistory[0]?.terms?.[0] ? `?q=${encodeURIComponent(searchHistory[0].terms[0])}` : ""
                  }`}
                >
                  Deep product match
                </Link>
              </div>
            </div>
            <table className="data">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Match</th>
                  <th>Reason</th>
                  <th>Help</th>
                </tr>
              </thead>
              <tbody>
                {(data.product_suggestions ?? []).map((s) => (
                  <tr key={s.product_id}>
                    <td>
                      <ProductLink id={s.product_id} name={s.name} />
                    </td>
                    <td>{s.sku || "—"}</td>
                    <td>{Math.round(s.score * 100)}%</td>
                    <td>{s.reason}</td>
                    <td>{s.help}</td>
                  </tr>
                ))}
                {(data.product_suggestions ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted">
                      No suggestions yet — needs search or browse history
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="card table-wrap">
            <div className="panel-toolbar">
              <strong>Wishlist</strong>
            </div>
            <table className="data">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                </tr>
              </thead>
              <tbody>
                {data.wishlist.map((w) => (
                  <tr key={String(w.wish_id)}>
                    <td>
                      <ProductLink id={Number(w.product_id)} name={String(w.product_name)} />
                    </td>
                    <td>{String(w.sku || "—")}</td>
                  </tr>
                ))}
                {data.wishlist.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="muted">
                      No wishlist items
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="card table-wrap">
            <div className="panel-toolbar">
              <strong>Recently viewed</strong>
            </div>
            <table className="data">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Viewed</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_views.map((v) => (
                  <tr key={String(v.id)}>
                    <td>
                      <ProductLink id={Number(v.product_id)} name={String(v.product_name)} />
                    </td>
                    <td>{String(v.viewed_at)}</td>
                  </tr>
                ))}
                {data.recent_views.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="muted">
                      No recent views
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="card table-wrap">
            <div className="panel-toolbar">
              <strong>Search history</strong>
            </div>
            <table className="data">
              <thead>
                <tr>
                  <th>Term</th>
                  <th>Store</th>
                  <th>When</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {searchHistory.flatMap((h) => {
                  const terms = h.terms?.length ? h.terms : [String(h.words || "").replace(/^\[|\]$/g, "")];
                  return terms.map((term, idx) => (
                    <tr key={`${h.id}-${idx}-${term}`}>
                      <td>{term || "—"}</td>
                      <td>{h.store_id ? `#${h.store_id}` : "—"}</td>
                      <td>{h.created_at ? String(h.created_at).slice(0, 16) : "—"}</td>
                      <td className="actions">
                        <Link className="btn btn-secondary btn-sm" to={`/analyst/product-match?q=${encodeURIComponent(term)}`}>
                          Match
                        </Link>
                      </td>
                    </tr>
                  ));
                })}
                {searchHistory.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="muted">
                      No search history
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="card table-wrap">
            <div className="panel-toolbar">
              <strong>Store reviews</strong>
            </div>
            <table className="data">
              <thead>
                <tr>
                  <th>Feel</th>
                  <th>Store</th>
                  <th>Problems</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.reviews.map((r) => (
                  <tr key={String(r.cr_id)}>
                    <td>
                      <strong>{String(r.cr_feel || "—")}</strong>
                    </td>
                    <td>{String(r.ec_store_name || "—")}</td>
                    <td>{r.cr_problems ? String(r.cr_problems) : "—"}</td>
                    <td>{String(r.cr_created || "").slice(0, 10) || "—"}</td>
                  </tr>
                ))}
                {data.reviews.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="muted">
                      No reviews
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === "activity_log" ? (
        <div className="card table-wrap">
          <div className="panel-toolbar">
            <strong>Activity log</strong>
            <span className="muted">{Number(s.activity_log_count ?? activityLog.length)} events</span>
          </div>
          <table className="data">
            <thead>
              <tr>
                <th>ID</th>
                <th>Activity</th>
                <th>Table</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {activityLog.map((row) => (
                <tr key={row.id}>
                  <td>#{row.id}</td>
                  <td>{row.activity || "—"}</td>
                  <td>
                    <code>{row.table || "—"}</code>
                  </td>
                  <td>{row.created_at ? String(row.created_at).slice(0, 19).replace("T", " ") : "—"}</td>
                </tr>
              ))}
              {activityLog.length === 0 ? (
                <tr>
                  <td colSpan={4} className="muted">
                    No activity log entries for this customer
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}

      {editOpen ? (
        <div className="modal-backdrop" onClick={() => setEditOpen(false)}>
          <div className="modal-card" onClick={(ev) => ev.stopPropagation()}>
            <div className="page-head">
              <h2>Edit customer</h2>
              <button type="button" className="btn btn-secondary" onClick={() => setEditOpen(false)}>
                Close
              </button>
            </div>
            <form className="settings-form-grid" onSubmit={(e) => void saveProfile(e)}>
              <label className="pf-field">
                <span className="pf-label">Name (English)</span>
                <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
              </label>
              <label className="pf-field">
                <span className="pf-label">Name (Arabic)</span>
                <input dir="rtl" value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
              </label>
              <label className="pf-field">
                <span className="pf-label">Email</span>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </label>
              <label className="pf-field">
                <span className="pf-label">Mobile</span>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </label>
              <label className="pf-field">
                <span className="pf-label">Date of birth</span>
                <input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
              </label>
              <label className="pf-field">
                <span className="pf-label">Nationality</span>
                <input value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} />
              </label>
              <label className="pf-field">
                <span className="pf-label">Loyalty points</span>
                <input
                  type="number"
                  min={0}
                  value={form.loyalty_points}
                  onChange={(e) => setForm({ ...form, loyalty_points: e.target.value })}
                />
              </label>
              <label className="pf-field">
                <span className="pf-label">Status</span>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </label>
              <div className="settings-form-actions" style={{ gridColumn: "1 / -1" }}>
                <button type="submit" className="btn btn-primary">
                  Save profile
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {engageModal ? (
        <div className="modal-backdrop" onClick={() => setEngageModal(null)}>
          <div className="modal-card cart-notify-modal" onClick={(ev) => ev.stopPropagation()}>
            <div className="page-head">
              <h2>
                {engageModal === "notify" ? "Send notification" : engageModal === "whatsapp" ? "Send WhatsApp" : "Send email"}
              </h2>
              <button type="button" className="btn btn-secondary" onClick={() => setEngageModal(null)}>
                Close
              </button>
            </div>
            <form onSubmit={(e) => void submitEngage(e)}>
              {engageModal === "notify" ? (
                <>
                  <label className="field">
                    Title
                    <input value={notifyTitle} onChange={(e) => setNotifyTitle(e.target.value)} required />
                  </label>
                  <label className="field">
                    Message
                    <textarea rows={4} value={notifyMessage} onChange={(e) => setNotifyMessage(e.target.value)} required />
                  </label>
                </>
              ) : null}
              {engageModal === "whatsapp" ? (
                <label className="field">
                  Message
                  <textarea rows={4} value={whatsappMessage} onChange={(e) => setWhatsappMessage(e.target.value)} required />
                </label>
              ) : null}
              {engageModal === "email" ? (
                <>
                  <label className="field">
                    Subject
                    <input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} required />
                  </label>
                  <label className="field">
                    Message
                    <textarea rows={4} value={emailMessage} onChange={(e) => setEmailMessage(e.target.value)} required />
                  </label>
                </>
              ) : null}
              <button type="submit" className="btn btn-green" disabled={engageBusy}>
                {engageBusy ? "Sending…" : "Send"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
