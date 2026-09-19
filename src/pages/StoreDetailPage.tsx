import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Clock,
  ExternalLink,
  MapPin,
  Package,
  ShoppingBag,
  Star,
  Truck,
} from "../lib/icons";
import { adminApi } from "../lib/api";
import { decodeLocaleName } from "../components/EntityCrudPage";
import { StatusBadge } from "../components/StatusBadge";
import { LoadingCard } from "../components/LoadingIndicator";

type StoreDetail = Awaited<ReturnType<typeof adminApi.storeManage>>;
type Tab = "overview" | "orders" | "products" | "slots" | "floor_requests" | "reviews";

type StoreForm = {
  name: string;
  name_ar: string;
  code: string;
  email: string;
  contact: string;
  franchise_id: string;
  country_id: string;
  area_id: string;
  password: string;
  open_time: string;
  close_time: string;
  lat: string;
  lng: string;
  address: string;
  address_ar: string;
  avg_time: string;
  max_km: string;
};

function toTimeInput(value: string) {
  return value ? value.slice(0, 5) : "";
}

function formatTime(value: string) {
  return value ? value.slice(0, 5) : "—";
}

function mapsUrl(lat: string, lng: string) {
  if (!lat || !lng) return null;
  return `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`;
}

export function StoreDetailPage() {
  const { id } = useParams();
  const storeId = Number(id);
  const navigate = useNavigate();

  const [data, setData] = useState<StoreDetail | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [franchises, setFranchises] = useState<Array<{ id: number; name: string }>>([]);
  const [countries, setCountries] = useState<Array<{ id: number; name: string }>>([]);
  const [formAreas, setFormAreas] = useState<Array<{ id: number; name: string }>>([]);
  const [form, setForm] = useState<StoreForm>({
    name: "",
    name_ar: "",
    code: "",
    email: "",
    contact: "",
    franchise_id: "",
    country_id: "",
    area_id: "",
    password: "",
    open_time: "",
    close_time: "",
    lat: "",
    lng: "",
    address: "",
    address_ar: "",
    avg_time: "",
    max_km: "",
  });

  async function load() {
    setError("");
    try {
      const res = await adminApi.storeManage(storeId);
      setData(res);
      const s = res.store;
      setForm({
        name: s.name,
        name_ar: s.name_ar,
        code: s.code,
        email: s.email,
        contact: s.contact,
        franchise_id: s.franchise_id ? String(s.franchise_id) : "",
        country_id: s.country_id ? String(s.country_id) : "",
        area_id: s.area_id ? String(s.area_id) : "",
        password: "",
        open_time: toTimeInput(s.open_time),
        close_time: toTimeInput(s.close_time),
        lat: s.latitude,
        lng: s.longitude,
        address: s.address,
        address_ar: s.address_ar,
        avg_time: s.avg_time,
        max_km: s.max_km,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load store");
    }
  }

  useEffect(() => {
    void load();
  }, [storeId]);

  useEffect(() => {
    void Promise.all([
      adminApi.franchises({ per_page: 100, page: 1 }).then((res) =>
        setFranchises(res.items.map((r) => ({ id: r.id, name: r.name }))),
      ),
      adminApi.countries().then((rows) =>
        setCountries(
          rows.map((r) => ({
            id: Number(r.ec_country_id),
            name: decodeLocaleName(r.ec_country_name),
          })),
        ),
      ),
    ]).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!form.country_id) {
      setFormAreas([]);
      return;
    }
    adminApi
      .areas({ country_id: form.country_id })
      .then((rows) =>
        setFormAreas(
          rows.map((r) => ({
            id: Number(r.ec_area_id),
            name: decodeLocaleName(r.ec_area_name),
          })),
        ),
      )
      .catch(() => setFormAreas([]));
  }, [form.country_id]);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Store name is required");
      return;
    }
    setSaving(true);
    setError("");
    setMsg("");
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        name_ar: form.name_ar.trim() || undefined,
        code: form.code.trim() || undefined,
        email: form.email.trim() || undefined,
        contact: form.contact.trim() || undefined,
        franchise_id: form.franchise_id ? Number(form.franchise_id) : undefined,
        country_id: form.country_id ? Number(form.country_id) : undefined,
        area_id: form.area_id ? Number(form.area_id) : undefined,
        open_time: form.open_time || undefined,
        close_time: form.close_time || undefined,
        lat: form.lat.trim() || undefined,
        lng: form.lng.trim() || undefined,
        address: form.address.trim() || undefined,
        address_ar: form.address_ar.trim() || undefined,
        avg_time: form.avg_time.trim() || undefined,
        max_km: form.max_km.trim() || undefined,
      };
      if (form.password.trim()) body.password = form.password.trim();
      await adminApi.updateStore(storeId, body);
      setMsg("Store updated.");
      setEditOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus() {
    if (!data) return;
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const next = data.store.status === 1 ? 0 : 1;
      await adminApi.updateStoreStatus(storeId, next);
      setMsg(next === 1 ? "Store activated." : "Store deactivated.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function deleteStore() {
    if (!data) return;
    const ok = window.confirm(`Delete store "${data.store.name}"?`);
    if (!ok) return;
    setBusy(true);
    setError("");
    try {
      await adminApi.deleteStore(storeId);
      navigate("/stores");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setBusy(false);
    }
  }

  if (error && !data) return <div className="alert alert-error">{error}</div>;
  if (!data) return <LoadingCard label="Loading store" />;

  const store = data.store;
  const stats = data.stats;
  const mapLink = mapsUrl(store.latitude, store.longitude);

  return (
    <div className="page customer-detail-page">
      <header className="page-head">
        <div>
          <p className="settings-crumb">
            <Link to="/stores">Stores</Link>
            <span> / </span>
            <span>{store.name}</span>
          </p>
          <h1 className="page-title">{store.name}</h1>
          <p className="page-sub">
            {store.email || "—"} · {store.contact || "—"} · ID #{store.id}
            {store.code ? ` · Code ${store.code}` : ""}
          </p>
        </div>
        <div className="page-head-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setEditOpen(true)}>
            Edit store
          </button>
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void toggleStatus()}>
            {store.status === 1 ? "Deactivate" : "Activate"}
          </button>
          <Link className="btn btn-secondary" to={`/slots?store_id=${storeId}`}>
            <Clock size={14} aria-hidden />
            Delivery slots
          </Link>
          <Link className="btn btn-primary" to={`/orders?store_id=${storeId}`}>
            <ShoppingBag size={14} aria-hidden />
            Store orders
          </Link>
        </div>
      </header>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}

      <div className="card-grid customer-stat-grid">
        <article className="stat-card card">
          <h3>Orders</h3>
          <strong>{Number(stats.order_count)}</strong>
          <p className="stat-amount">{Number(stats.active_orders)} in progress</p>
        </article>
        <article className="stat-card card">
          <h3>Revenue</h3>
          <strong>QAR {Number(stats.revenue).toFixed(2)}</strong>
          <p className="stat-amount">{Number(stats.delivered_orders)} delivered</p>
        </article>
        <article className="stat-card card">
          <h3>Products</h3>
          <strong>{Number(stats.product_count)}</strong>
          <p className="stat-amount">{Number(stats.low_stock_count)} low stock</p>
        </article>
        <article className="stat-card card">
          <h3>Delivery slots</h3>
          <strong>{Number(stats.slot_count)}</strong>
          <p className="stat-amount">{Number(stats.active_slots)} active</p>
        </article>
      </div>

      <section className="card customer-engage-panel">
        <h2>Store operations</h2>
        <div className="orders-row-actions">
          <Link className="btn btn-secondary btn-sm" to="/products">
            <Package size={14} aria-hidden />
            Catalog
          </Link>
          <Link className="btn btn-secondary btn-sm" to="/import-to-store">
            Import stock
          </Link>
          <Link className="btn btn-secondary btn-sm" to={`/carts?q=${storeId}`}>
            Abandoned carts
          </Link>
          <Link className="btn btn-secondary btn-sm" to={`/floor-requests?store_id=${storeId}`}>
            Floor requests
            {Number(stats.floor_pending) > 0 ? ` (${Number(stats.floor_pending)})` : ""}
          </Link>
          {store.franchise_id ? (
            <Link className="btn btn-secondary btn-sm" to={`/stores?franchise_id=${store.franchise_id}`}>
              Franchise stores
            </Link>
          ) : null}
          <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void deleteStore()}>
            Delete store
          </button>
        </div>
      </section>

      <div className="customer-tabs card">
        {(
          [
            ["overview", "Overview"],
            ["orders", `Orders (${data.recent_orders.length})`],
            ["products", `Products (${Number(stats.low_stock_count)} low)`],
            ["slots", `Slots (${data.slots.length})`],
            ["floor_requests", `Floor requests (${data.floor_requests.length})`],
            ["reviews", `Reviews (${data.reviews.length})`],
          ] as const
        ).map(([key, label]) => (
          <button key={key} type="button" className={tab === key ? "active" : ""} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="customer-detail-grid">
          <section className="card">
            <h2>Profile</h2>
            <dl className="customer-dl">
              <dt>Status</dt>
              <dd>
                <StatusBadge status={store.status_label} />
              </dd>
              <dt>Franchise</dt>
              <dd>{store.franchise_name || store.franchise_id || "—"}</dd>
              <dt>Country / Area</dt>
              <dd>
                {store.country_name || "—"}
                {store.area_name ? ` · ${store.area_name}` : ""}
              </dd>
              <dt>Hours</dt>
              <dd>
                {formatTime(store.open_time)} – {formatTime(store.close_time)}
              </dd>
              <dt>Avg delivery</dt>
              <dd>{store.avg_time || "—"}</dd>
              <dt>Max distance</dt>
              <dd>{store.max_km ? `${store.max_km} km` : "—"}</dd>
              <dt>Registered</dt>
              <dd>{store.created_at || "—"}</dd>
              <dt>Last order</dt>
              <dd>{String(stats.last_order_at ?? "—")}</dd>
            </dl>
          </section>
          <section className="card">
            <h2>
              <MapPin size={16} aria-hidden /> Location
            </h2>
            <dl className="customer-dl">
              <dt>Address</dt>
              <dd>{store.address || "—"}</dd>
              {store.address_ar ? (
                <>
                  <dt>Address (AR)</dt>
                  <dd>{store.address_ar}</dd>
                </>
              ) : null}
              <dt>Coordinates</dt>
              <dd>
                {store.latitude && store.longitude ? `${store.latitude}, ${store.longitude}` : "—"}
                {mapLink ? (
                  <div style={{ marginTop: 8 }}>
                    <a className="btn btn-secondary btn-sm" href={mapLink} target="_blank" rel="noreferrer">
                      <ExternalLink size={12} aria-hidden />
                      Open in Maps
                    </a>
                  </div>
                ) : null}
              </dd>
            </dl>
          </section>
          <section className="card">
            <h2>
              <Truck size={16} aria-hidden /> Operations summary
            </h2>
            <dl className="customer-dl">
              <dt>Active carts</dt>
              <dd>{Number(stats.cart_items)} items in carts</dd>
              <dt>Cancelled orders</dt>
              <dd>{Number(stats.cancelled_orders)}</dd>
              <dt>Available SKUs</dt>
              <dd>{Number(stats.available_count)}</dd>
              <dt>Unavailable SKUs</dt>
              <dd>{Number(stats.unavailable_count)}</dd>
              <dt>Pending floor requests</dt>
              <dd>{Number(stats.floor_pending)}</dd>
              <dt>Customer reviews</dt>
              <dd>{Number(stats.review_count)}</dd>
            </dl>
          </section>
          <section className="card">
            <h2>Recent orders</h2>
            {data.recent_orders.length === 0 ? (
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
                  {data.recent_orders.slice(0, 5).map((o) => (
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
        </div>
      ) : null}

      {tab === "orders" ? (
        <div className="card table-wrap">
          <div className="page-head" style={{ marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Store orders</h2>
            <Link className="btn btn-secondary btn-sm" to={`/orders?store_id=${storeId}`}>
              View all orders
            </Link>
          </div>
          <table className="data">
            <thead>
              <tr>
                <th>Ref</th>
                <th>Status</th>
                <th>Type</th>
                <th>Payment</th>
                <th>Payable</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_orders.map((o) => (
                <tr key={String(o.order_id)}>
                  <td>
                    <Link className="linkish" to={`/orders/${o.order_id}`}>
                      {String(o.order_refno)}
                    </Link>
                  </td>
                  <td>
                    <StatusBadge status={String(o.order_status)} />
                  </td>
                  <td>{String(o.order_type || "—")}</td>
                  <td>{String(o.order_payment || "—")}</td>
                  <td>QAR {Number(o.order_payable).toFixed(2)}</td>
                  <td>{String(o.order_created_at)}</td>
                </tr>
              ))}
              {data.recent_orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">
                    No orders for this store
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "products" ? (
        <div className="card table-wrap">
          <div className="page-head" style={{ marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Low stock products</h2>
            <Link className="btn btn-secondary btn-sm" to="/products">
              Open catalog
            </Link>
          </div>
          <table className="data">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Stock</th>
                <th>Limit</th>
                <th>Price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.low_stock_products.map((p) => (
                <tr key={String(p.store_product_id)}>
                  <td>
                    <Link className="linkish" to={`/products/${p.product_id}/edit`}>
                      {String(p.product_name)}
                    </Link>
                  </td>
                  <td>{String(p.sku || "—")}</td>
                  <td>{Number(p.stock)}</td>
                  <td>{Number(p.stock_limit)}</td>
                  <td>QAR {Number(p.price).toFixed(2)}</td>
                  <td>{Number(p.soldout_status) === 1 ? "Available" : "Unavailable"}</td>
                </tr>
              ))}
              {data.low_stock_products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">
                    No low-stock products · {Number(stats.product_count)} total SKUs assigned
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "slots" ? (
        <div className="card table-wrap">
          <div className="page-head" style={{ marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Delivery slots</h2>
            <Link className="btn btn-secondary btn-sm" to={`/slots?store_id=${storeId}`}>
              Manage slots
            </Link>
          </div>
          <table className="data">
            <thead>
              <tr>
                <th>Start</th>
                <th>End</th>
                <th>Order limit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.slots.map((slot) => (
                <tr key={String(slot.id)}>
                  <td>{formatTime(String(slot.start_time))}</td>
                  <td>{formatTime(String(slot.end_time))}</td>
                  <td>{Number(slot.limit)}</td>
                  <td>
                    <StatusBadge status={String(slot.status_label)} />
                  </td>
                </tr>
              ))}
              {data.slots.length === 0 ? (
                <tr>
                  <td colSpan={4} className="muted">
                    No delivery slots configured
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "floor_requests" ? (
        <div className="card table-wrap">
          <div className="page-head" style={{ marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Floor product requests</h2>
            <Link className="btn btn-secondary btn-sm" to={`/floor-requests?store_id=${storeId}`}>
              View all
            </Link>
          </div>
          <table className="data">
            <thead>
              <tr>
                <th>Title</th>
                <th>SKU</th>
                <th>Manager</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.floor_requests.map((r) => (
                <tr key={String(r.id)}>
                  <td>{String(r.title || "—")}</td>
                  <td>{String(r.sku || "—")}</td>
                  <td>{String(r.manager_name || "—")}</td>
                  <td>
                    <StatusBadge status={String(r.approval_label)} />
                  </td>
                  <td>{String(r.created_at ?? "").slice(0, 10)}</td>
                  <td>
                    <Link className="btn btn-secondary btn-sm" to={`/floor-requests/${r.id}`}>
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {data.floor_requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">
                    No floor requests
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "reviews" ? (
        <div className="card">
          <h2>
            <Star size={16} aria-hidden /> Customer reviews
          </h2>
          <ul className="customer-activity-list">
            {data.reviews.map((r) => (
              <li key={String(r.id)}>
                <strong>{String(r.feel)}</strong>
                {r.customer_name ? ` — ${String(r.customer_name)}` : ""}
                <span className="muted"> {String(r.created_at ?? "").slice(0, 10)}</span>
                {r.problems ? <div className="muted">{String(r.problems)}</div> : null}
              </li>
            ))}
            {data.reviews.length === 0 ? <li className="muted">No reviews yet</li> : null}
          </ul>
        </div>
      ) : null}

      {editOpen ? (
        <div className="modal-backdrop" onClick={() => setEditOpen(false)}>
          <div className="modal-card" onClick={(ev) => ev.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="page-head">
              <h2>Edit store</h2>
              <button type="button" className="btn btn-secondary" onClick={() => setEditOpen(false)}>
                Close
              </button>
            </div>
            <form className="filter-grid" onSubmit={(e) => void saveProfile(e)}>
              <label>
                Name (English)
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </label>
              <label>
                Name (Arabic)
                <input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
              </label>
              <label>
                Store code
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </label>
              <label>
                Email
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </label>
              <label>
                Contact
                <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
              </label>
              <label>
                Franchise
                <select value={form.franchise_id} onChange={(e) => setForm({ ...form, franchise_id: e.target.value })}>
                  <option value="">None</option>
                  {franchises.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Country
                <select
                  value={form.country_id}
                  onChange={(e) => setForm({ ...form, country_id: e.target.value, area_id: "" })}
                >
                  <option value="">Select</option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Area
                <select
                  value={form.area_id}
                  onChange={(e) => setForm({ ...form, area_id: e.target.value })}
                  disabled={!form.country_id}
                >
                  <option value="">Select</option>
                  {formAreas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Opening time
                <input type="time" value={form.open_time} onChange={(e) => setForm({ ...form, open_time: e.target.value })} />
              </label>
              <label>
                Close time
                <input type="time" value={form.close_time} onChange={(e) => setForm({ ...form, close_time: e.target.value })} />
              </label>
              <label>
                Latitude
                <input value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} />
              </label>
              <label>
                Longitude
                <input value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} />
              </label>
              <label>
                Avg delivery time
                <input value={form.avg_time} onChange={(e) => setForm({ ...form, avg_time: e.target.value })} />
              </label>
              <label>
                Max kilometer
                <input value={form.max_km} onChange={(e) => setForm({ ...form, max_km: e.target.value })} />
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                Address (English)
                <textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                Address (Arabic)
                <textarea rows={2} value={form.address_ar} onChange={(e) => setForm({ ...form, address_ar: e.target.value })} />
              </label>
              <label>
                New password (optional)
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </label>
              <div className="settings-form-actions" style={{ gridColumn: "1 / -1" }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving…" : "Save store"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
