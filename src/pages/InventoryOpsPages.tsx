import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Boxes,
  ChevronRight,
  ClipboardList,
  Package,
  Truck,
} from "../lib/icons";
import { adminApi } from "../lib/api";
import { getAdminBranchId } from "../lib/adminBranch";
import { LoadingIndicator } from "../components/LoadingIndicator";

type StoreOpt = { ec_store_id: number; ec_store_name: string };
type WhOpt = { wh_id: number; wh_name: string; wh_store_id: number };

const DOC_TYPES: Record<string, string> = {
  adjustment: "Stock adjustment",
  transfer: "Transfer",
  receiving: "Purchase receiving",
  issue: "Stock issue",
  count: "Stock count",
  reconciliation: "Reconciliation",
  grn: "GRN",
  putaway: "Put-away",
  pick: "Picking",
  pack: "Packing",
  dispatch: "Dispatch",
  supplier: "Supplier inventory",
};

function money(v: unknown) {
  return `QAR ${Number(v ?? 0).toFixed(2)}`;
}

function num(v: unknown) {
  return Number(v ?? 0).toLocaleString(undefined, { maximumFractionDigits: 3 });
}

function useStores() {
  const [stores, setStores] = useState<StoreOpt[]>([]);
  useEffect(() => {
    adminApi
      .stores()
      .then(setStores)
      .catch(() => setStores([]));
  }, []);
  return stores;
}

function useWarehouses(storeId?: string) {
  const [rows, setRows] = useState<WhOpt[]>([]);
  useEffect(() => {
    adminApi
      .inventoryWarehouses({
        store_id: storeId || undefined,
        per_page: 200,
      })
      .then((d) => setRows(d.items as WhOpt[]))
      .catch(() => setRows([]));
  }, [storeId]);
  return rows;
}

function Err({ error }: { error: string }) {
  return error ? <div className="error card">{error}</div> : null;
}

function HubShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="page settings-hub">
      <header className="page-head">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-sub">{subtitle}</p>
        </div>
      </header>
      {children}
    </div>
  );
}

const INV_SECTIONS = [
  {
    id: "stock",
    title: "Stock",
    desc: "Live balances across stores and warehouses.",
    icon: Package,
    links: [
      { to: "/inventory/stock", label: "Real-time stock", desc: "On hand, reserved, available" },
      { to: "/inventory/stock?bucket=all", label: "Store stock", desc: "Filter by branch" },
      { to: "/warehouse/warehouses", label: "Warehouse stock", desc: "WH locations and balances" },
      { to: "/inventory/stock?bucket=reserved", label: "Reserved", desc: "Held for open orders" },
      { to: "/inventory/stock?bucket=all", label: "Available", desc: "Sellable quantity" },
      { to: "/inventory/stock?bucket=damaged", label: "Damaged", desc: "Quarantine bucket" },
      { to: "/inventory/stock?bucket=expired", label: "Expired", desc: "Past expiry batches" },
    ],
  },
  {
    id: "warehouse",
    title: "Warehouse",
    desc: "Locations and inbound / outbound warehouse documents.",
    icon: Truck,
    links: [
      { to: "/warehouse/warehouses", label: "Warehouses", desc: "Store, central, and supplier locations" },
      { to: "/inventory/documents?type=receiving", label: "Purchase receiving", desc: "Inbound PO stock" },
      { to: "/inventory/documents?type=grn", label: "GRN", desc: "Goods received notes" },
      { to: "/inventory/documents?type=putaway", label: "Put-away", desc: "Move received stock to bins" },
      { to: "/inventory/documents?type=pick", label: "Picking", desc: "Pick lists for orders" },
      { to: "/inventory/documents?type=pack", label: "Packing", desc: "Pack confirmed picks" },
      { to: "/inventory/documents?type=dispatch", label: "Dispatch", desc: "Outbound dispatch docs" },
      { to: "/inventory/documents?type=transfer", label: "Transfer between stores", desc: "Inter-branch transfers" },
      { to: "/inventory/documents?type=supplier", label: "Supplier inventory", desc: "Vendor-owned stock" },
    ],
  },
  {
    id: "ops",
    title: "Operations",
    desc: "Documents that move or correct stock.",
    icon: ClipboardList,
    links: [
      { to: "/inventory/documents?type=adjustment", label: "Adjustment", desc: "Correct on-hand qty" },
      { to: "/inventory/documents?type=transfer", label: "Transfer", desc: "Store-to-store moves" },
      { to: "/inventory/documents?type=receiving", label: "Receiving", desc: "Inbound purchase stock" },
      { to: "/inventory/documents?type=issue", label: "Issue", desc: "Outbound / write-off" },
      { to: "/inventory/documents?type=count", label: "Count", desc: "Physical inventory count" },
      { to: "/inventory/documents?type=reconciliation", label: "Reconciliation", desc: "Close variance" },
    ],
  },
  {
    id: "alerts",
    title: "Alerts",
    desc: "Stock risk that needs action.",
    icon: AlertTriangle,
    links: [
      { to: "/inventory/alerts?type=low_stock", label: "Low-stock", desc: "Below reorder point" },
      { to: "/inventory/alerts?type=out_of_stock", label: "Out-of-stock", desc: "Zero sellable qty" },
      { to: "/inventory/alerts?type=expiry", label: "Expiry", desc: "Batches nearing expiry" },
    ],
  },
  {
    id: "trace",
    title: "Traceability",
    desc: "Lots, costing, and movement history.",
    icon: Boxes,
    links: [
      { to: "/inventory/batches", label: "Batches / Lots", desc: "FEFO lot tracking" },
      { to: "/inventory/batches", label: "FIFO / FEFO", desc: "Batch consumption policy" },
      { to: "/inventory/valuation", label: "Valuation", desc: "Avg cost × on hand" },
      { to: "/inventory/history", label: "Stock history", desc: "Movement ledger" },
    ],
  },
];

export function InventoryHubPage() {
  const [kpis, setKpis] = useState({
    on_hand: 0,
    available: 0,
    low_stock: 0,
    valuation: 0,
  });

  useEffect(() => {
    adminApi
      .inventoryOverview()
      .then((d) => {
        const k = d.kpis ?? {};
        setKpis({
          on_hand: Number(k.on_hand ?? 0),
          available: Number(k.available ?? 0),
          low_stock: Number(k.low_stock ?? 0),
          valuation: Number(k.valuation ?? 0),
        });
      })
      .catch(() => undefined);
  }, []);

  return (
    <HubShell title="Inventory" subtitle="Stock, warehouses, documents, alerts, and lot traceability — one place.">
      <div className="settings-overview-grid">
        <article className="settings-stat card">
          <span className="settings-stat-label">On hand</span>
          <strong>{num(kpis.on_hand)}</strong>
        </article>
        <article className="settings-stat card">
          <span className="settings-stat-label">Available</span>
          <strong>{num(kpis.available)}</strong>
        </article>
        <article className="settings-stat card">
          <span className="settings-stat-label">Low stock</span>
          <strong>{num(kpis.low_stock)}</strong>
        </article>
        <article className="settings-stat card">
          <span className="settings-stat-label">Valuation</span>
          <strong>{money(kpis.valuation)}</strong>
        </article>
      </div>

      <div className="settings-sections">
        {INV_SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <section key={section.id} className="settings-section card">
              <div className="settings-section-head">
                <span className="settings-section-icon" aria-hidden>
                  <Icon size={18} strokeWidth={1.75} />
                </span>
                <div>
                  <h2>{section.title}</h2>
                  <p>{section.desc}</p>
                </div>
              </div>
              <ul className="settings-link-list">
                {section.links.map((link) => (
                  <li key={`${link.to}-${link.label}`}>
                    <Link to={link.to} className="settings-link-row">
                      <span>
                        <strong>{link.label}</strong>
                        <small>{link.desc}</small>
                      </span>
                      <ChevronRight size={16} aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </HubShell>
  );
}

const STOCK_BUCKETS = [
  { id: "all", label: "All" },
  { id: "low", label: "Low" },
  { id: "out", label: "Out" },
  { id: "damaged", label: "Damaged" },
  { id: "expired", label: "Expired" },
  { id: "reserved", label: "Reserved" },
];

export function InventoryStockPage() {
  const stores = useStores();
  const [params, setParams] = useSearchParams();
  const storeId = params.get("store_id") || getAdminBranchId() || "";
  const warehouseId = params.get("warehouse_id") || "";
  const q = params.get("q") || "";
  const bucket = params.get("bucket") || "all";
  const warehouses = useWarehouses(storeId);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<Record<string, number>>({});
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);

  function patch(next: Record<string, string>) {
    const p = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => {
      if (!v) p.delete(k);
      else p.set(k, v);
    });
    setParams(p);
  }

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    void Promise.all([
      adminApi.inventoryOverview({ store_id: storeId || undefined, warehouse_id: warehouseId || undefined }),
      adminApi.inventoryStock({
        store_id: storeId || undefined,
        warehouse_id: warehouseId || undefined,
        q: q || undefined,
        bucket: bucket === "all" ? undefined : bucket,
        per_page: 100,
      }),
    ])
      .then(([ov, stock]) => {
        if (!alive) return;
        const k = ov.kpis ?? {};
        setKpis({
          on_hand: Number(k.on_hand ?? 0),
          reserved: Number(k.reserved ?? 0),
          available: Number(k.available ?? 0),
          damaged: Number(k.damaged ?? 0),
          expired: Number(k.expired ?? 0),
          valuation: Number(k.valuation ?? 0),
        });
        setRows(stock.items as Array<Record<string, unknown>>);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Failed to load stock");
        setRows([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [storeId, warehouseId, q, bucket]);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Real-time stock</h1>
          <p className="page-sub">On hand, reserved, available, and valuation by store / warehouse.</p>
        </div>
        <Link className="btn btn-secondary" to="/inventory">
          Inventory hub
        </Link>
      </header>

      <div className="settings-overview-grid">
        {[
          ["On hand", kpis.on_hand],
          ["Reserved", kpis.reserved],
          ["Available", kpis.available],
          ["Damaged", kpis.damaged],
          ["Expired", kpis.expired],
          ["Valuation", kpis.valuation],
        ].map(([label, value]) => (
          <article key={String(label)} className="settings-stat card">
            <span className="settings-stat-label">{label}</span>
            <strong>{label === "Valuation" ? money(value) : num(value)}</strong>
          </article>
        ))}
      </div>

      <div className="toolbar card filters" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <select value={storeId} onChange={(e) => patch({ store_id: e.target.value, warehouse_id: "" })}>
          <option value="">All stores</option>
          {stores.map((s) => (
            <option key={s.ec_store_id} value={s.ec_store_id}>
              {s.ec_store_name}
            </option>
          ))}
        </select>
        <select value={warehouseId} onChange={(e) => patch({ warehouse_id: e.target.value })}>
          <option value="">All warehouses</option>
          {warehouses.map((w) => (
            <option key={w.wh_id} value={w.wh_id}>
              {w.wh_name}
            </option>
          ))}
        </select>
        <input
          value={q}
          onChange={(e) => patch({ q: e.target.value })}
          placeholder="Search product / SKU"
        />
      </div>

      <div className="tabs" role="tablist" aria-label="Stock buckets">
        {STOCK_BUCKETS.map((b) => (
          <button
            key={b.id}
            type="button"
            role="tab"
            className={bucket === b.id ? "active" : undefined}
            aria-selected={bucket === b.id}
            onClick={() => patch({ bucket: b.id })}
          >
            {b.label}
          </button>
        ))}
      </div>

      <Err error={error} />
      <div className="card table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Store</th>
              <th>WH</th>
              <th>On hand</th>
              <th>Reserved</th>
              <th>Available</th>
              <th>Damaged</th>
              <th>Expired</th>
              <th>In transit</th>
              <th>Avg cost</th>
              <th>Valuation</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={12}>
                  <LoadingIndicator label="Loading inventory" padded />
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((r, i) => (
                <tr key={String(r.bal_id ?? `${r.product_id}-${r.store_id}-${i}`)}>
                  <td>{String(r.product_name ?? r.product_id ?? "—")}</td>
                  <td>{String(r.sku ?? "—")}</td>
                  <td>{String(r.store_name ?? r.store_id ?? "—")}</td>
                  <td>{String(r.warehouse_name ?? r.warehouse_id ?? "—")}</td>
                  <td>{num(r.on_hand)}</td>
                  <td>{num(r.reserved)}</td>
                  <td>{num(r.available)}</td>
                  <td>{num(r.damaged)}</td>
                  <td>{num(r.expired)}</td>
                  <td>{num(r.in_transit)}</td>
                  <td>{money(r.avg_cost)}</td>
                  <td>{money(r.valuation)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={12} className="muted">
                  No stock rows
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type DocLine = {
  product_id: string;
  qty: string;
  bucket: string;
  batch_code: string;
  lot: string;
  expiry: string;
  cost: string;
  qty_counted: string;
};

const EMPTY_LINE = (): DocLine => ({
  product_id: "",
  qty: "1",
  bucket: "on_hand",
  batch_code: "",
  lot: "",
  expiry: "",
  cost: "",
  qty_counted: "",
});

export function InventoryDocumentsPage() {
  const stores = useStores();
  const [params, setParams] = useSearchParams();
  const type = params.get("type") || "adjustment";
  const title = DOC_TYPES[type] || type;
  const warehouses = useWarehouses();

  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [form, setForm] = useState({
    store_id: "",
    warehouse_id: "",
    to_store_id: "",
    reason: "",
  });
  const [lines, setLines] = useState<DocLine[]>([EMPTY_LINE()]);

  async function load() {
    setError("");
    try {
      const d = await adminApi.inventoryDocuments({ type, per_page: 50 });
      setRows(d.items as Array<Record<string, unknown>>);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load documents");
      setRows([]);
    }
  }

  useEffect(() => {
    void load();
  }, [type]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const created = await adminApi.createInventoryDocument({
        doc_type: type,
        store_id: Number(form.store_id),
        warehouse_id: form.warehouse_id ? Number(form.warehouse_id) : 0,
        to_store_id: form.to_store_id ? Number(form.to_store_id) : 0,
        reason: form.reason || undefined,
        lines: lines
          .filter((l) => l.product_id)
          .map((l) => ({
            product_id: Number(l.product_id),
            qty: Number(l.qty || 0),
            bucket: l.bucket || "on_hand",
            batch_code: l.batch_code || undefined,
            lot: l.lot || undefined,
            expiry: l.expiry || undefined,
            cost: l.cost ? Number(l.cost) : undefined,
            qty_counted: l.qty_counted === "" ? undefined : Number(l.qty_counted),
          })),
      });
      setMsg(`Draft #${created.doc_id} created`);
      setLines([EMPTY_LINE()]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function onPost(id: number) {
    setBusy(true);
    setError("");
    setMsg("");
    try {
      await adminApi.postInventoryDocument(id);
      setMsg(`Document #${id} posted`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Post failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-sub">Draft inventory documents, then post to update balances.</p>
        </div>
        <Link className="btn btn-secondary" to="/inventory">
          Inventory hub
        </Link>
      </header>

      <div className="tabs" role="tablist" aria-label="Document type">
        {Object.entries(DOC_TYPES).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            className={type === id ? "active" : undefined}
            aria-selected={type === id}
            onClick={() => setParams({ type: id })}
          >
            {label}
          </button>
        ))}
      </div>

      <Err error={error} />
      {msg ? <div className="card muted">{msg}</div> : null}

      <form className="card" onSubmit={onCreate} style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Create draft</h2>
        <div className="toolbar filters" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select
            required
            value={form.store_id}
            onChange={(e) => setForm({ ...form, store_id: e.target.value })}
          >
            <option value="">Store</option>
            {stores.map((s) => (
              <option key={s.ec_store_id} value={s.ec_store_id}>
                {s.ec_store_name}
              </option>
            ))}
          </select>
          <select
            value={form.warehouse_id}
            onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}
          >
            <option value="">Warehouse</option>
            {warehouses.map((w) => (
              <option key={w.wh_id} value={w.wh_id}>
                {w.wh_name}
              </option>
            ))}
          </select>
          {type === "transfer" ? (
            <select
              value={form.to_store_id}
              onChange={(e) => setForm({ ...form, to_store_id: e.target.value })}
              required
            >
              <option value="">To store</option>
              {stores.map((s) => (
                <option key={s.ec_store_id} value={s.ec_store_id}>
                  {s.ec_store_name}
                </option>
              ))}
            </select>
          ) : null}
          <input
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            placeholder="Reason"
          />
        </div>

        {lines.map((line, idx) => (
          <div
            key={idx}
            className="toolbar"
            style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}
          >
            <input
              required
              value={line.product_id}
              onChange={(e) => {
                const next = [...lines];
                next[idx] = { ...line, product_id: e.target.value };
                setLines(next);
              }}
              placeholder="Product ID"
              style={{ width: 110 }}
            />
            <input
              value={line.qty}
              onChange={(e) => {
                const next = [...lines];
                next[idx] = { ...line, qty: e.target.value };
                setLines(next);
              }}
              placeholder="Qty"
              style={{ width: 80 }}
            />
            <select
              value={line.bucket}
              onChange={(e) => {
                const next = [...lines];
                next[idx] = { ...line, bucket: e.target.value };
                setLines(next);
              }}
            >
              <option value="on_hand">On hand</option>
              <option value="reserved">Reserved</option>
              <option value="damaged">Damaged</option>
              <option value="expired">Expired</option>
              <option value="in_transit">In transit</option>
            </select>
            <input
              value={line.batch_code}
              onChange={(e) => {
                const next = [...lines];
                next[idx] = { ...line, batch_code: e.target.value };
                setLines(next);
              }}
              placeholder="Batch"
              style={{ width: 100 }}
            />
            <input
              value={line.lot}
              onChange={(e) => {
                const next = [...lines];
                next[idx] = { ...line, lot: e.target.value };
                setLines(next);
              }}
              placeholder="Lot"
              style={{ width: 90 }}
            />
            <input
              type="date"
              value={line.expiry}
              onChange={(e) => {
                const next = [...lines];
                next[idx] = { ...line, expiry: e.target.value };
                setLines(next);
              }}
            />
            <input
              value={line.cost}
              onChange={(e) => {
                const next = [...lines];
                next[idx] = { ...line, cost: e.target.value };
                setLines(next);
              }}
              placeholder="Cost"
              style={{ width: 80 }}
            />
            {type === "count" || type === "reconciliation" ? (
              <input
                value={line.qty_counted}
                onChange={(e) => {
                  const next = [...lines];
                  next[idx] = { ...line, qty_counted: e.target.value };
                  setLines(next);
                }}
                placeholder="Counted"
                style={{ width: 90 }}
              />
            ) : null}
          </div>
        ))}

        <div className="toolbar" style={{ marginTop: 12, gap: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={() => setLines([...lines, EMPTY_LINE()])}>
            Add line
          </button>
          <button type="submit" className="btn" disabled={busy}>
            Save draft
          </button>
        </div>
      </form>

      <div className="card table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>ID</th>
              <th>Number</th>
              <th>Store</th>
              <th>Status</th>
              <th>Reason</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.doc_id)}>
                <td>{String(r.doc_id)}</td>
                <td>{String(r.doc_number ?? "—")}</td>
                <td>{String(r.store_name ?? r.doc_store_id ?? "—")}</td>
                <td>{String(r.doc_status)}</td>
                <td>{String(r.doc_reason ?? "—")}</td>
                <td>{String(r.doc_created_at ?? "—").slice(0, 16).replace("T", " ")}</td>
                <td>
                  {String(r.doc_status) === "draft" ? (
                    <button type="button" className="btn" disabled={busy} onClick={() => void onPost(Number(r.doc_id))}>
                      Post
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={7} className="muted">
                  No documents
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function InventoryBatchesPage() {
  const stores = useStores();
  const warehouses = useWarehouses();
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [form, setForm] = useState({
    store_id: "",
    warehouse_id: "",
    product_id: "",
    batch_code: "",
    lot: "",
    expiry_at: "",
    qty: "1",
    cost: "",
    policy: "FEFO",
  });

  async function load() {
    setError("");
    try {
      const d = await adminApi.inventoryBatches({ per_page: 100, order: "fefo" });
      setRows(d.items as Array<Record<string, unknown>>);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load batches");
      setRows([]);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMsg("");
    try {
      await adminApi.createInventoryBatch({
        store_id: Number(form.store_id),
        warehouse_id: form.warehouse_id ? Number(form.warehouse_id) : 0,
        product_id: Number(form.product_id),
        batch_code: form.batch_code,
        lot: form.lot || undefined,
        expiry_at: form.expiry_at || undefined,
        qty: Number(form.qty || 0),
        cost: form.cost ? Number(form.cost) : undefined,
        policy: form.policy,
      });
      setMsg("Batch created");
      setForm({ ...form, product_id: "", batch_code: "", lot: "", qty: "1", cost: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Batches / Lots</h1>
          <p className="page-sub">FEFO-ordered lots with expiry and policy (FIFO / FEFO).</p>
        </div>
      </header>

      <Err error={error} />
      {msg ? <div className="card muted">{msg}</div> : null}

      <form className="card" onSubmit={onCreate} style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Create batch</h2>
        <div className="toolbar filters" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select required value={form.store_id} onChange={(e) => setForm({ ...form, store_id: e.target.value })}>
            <option value="">Store</option>
            {stores.map((s) => (
              <option key={s.ec_store_id} value={s.ec_store_id}>
                {s.ec_store_name}
              </option>
            ))}
          </select>
          <select value={form.warehouse_id} onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}>
            <option value="">Warehouse</option>
            {warehouses.map((w) => (
              <option key={w.wh_id} value={w.wh_id}>
                {w.wh_name}
              </option>
            ))}
          </select>
          <input
            required
            value={form.product_id}
            onChange={(e) => setForm({ ...form, product_id: e.target.value })}
            placeholder="Product ID"
          />
          <input
            required
            value={form.batch_code}
            onChange={(e) => setForm({ ...form, batch_code: e.target.value })}
            placeholder="Batch code"
          />
          <input value={form.lot} onChange={(e) => setForm({ ...form, lot: e.target.value })} placeholder="Lot" />
          <input
            type="date"
            value={form.expiry_at}
            onChange={(e) => setForm({ ...form, expiry_at: e.target.value })}
          />
          <input value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} placeholder="Qty" />
          <input value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="Cost" />
          <select value={form.policy} onChange={(e) => setForm({ ...form, policy: e.target.value })}>
            <option value="FEFO">FEFO</option>
            <option value="FIFO">FIFO</option>
          </select>
          <button type="submit" className="btn" disabled={busy}>
            Create
          </button>
        </div>
      </form>

      <div className="card table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Batch</th>
              <th>Lot</th>
              <th>Product</th>
              <th>Store</th>
              <th>Policy</th>
              <th>Expiry</th>
              <th>Qty</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.batch_id)}>
                <td>{String(r.batch_code)}</td>
                <td>{String(r.batch_lot ?? "—")}</td>
                <td>{String(r.product_name ?? r.batch_product_id)}</td>
                <td>{String(r.store_name ?? r.batch_store_id)}</td>
                <td>{String(r.batch_policy ?? "FEFO")}</td>
                <td>{String(r.batch_expiry_at ?? "—")}</td>
                <td>{num(r.batch_qty)}</td>
                <td>{money(r.batch_cost)}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={8} className="muted">
                  No batches
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const ALERT_TABS = [
  { id: "low_stock", label: "Low stock" },
  { id: "out_of_stock", label: "Out of stock" },
  { id: "expiry", label: "Expiry" },
];

export function InventoryAlertsPage() {
  const [params, setParams] = useSearchParams();
  const type = params.get("type") || "low_stock";
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);

  async function load() {
    setError("");
    try {
      const d = await adminApi.inventoryAlerts({ type, status: 0, per_page: 100 });
      setRows(d.items as Array<Record<string, unknown>>);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load alerts");
      setRows([]);
    }
  }

  useEffect(() => {
    void load();
  }, [type]);

  async function refresh() {
    setBusy(true);
    setMsg("");
    setError("");
    try {
      const res = await adminApi.refreshInventoryAlerts({ type });
      setMsg(`Refreshed — ${res.created} new, ${res.open} open`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setBusy(false);
    }
  }

  async function ack(id: number) {
    setBusy(true);
    setError("");
    try {
      await adminApi.ackInventoryAlert(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Acknowledge failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Inventory alerts</h1>
          <p className="page-sub">Low stock, out of stock, and expiry warnings.</p>
        </div>
        <button type="button" className="btn" disabled={busy} onClick={() => void refresh()}>
          Refresh alerts
        </button>
      </header>

      <div className="tabs" role="tablist">
        {ALERT_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            className={type === t.id ? "active" : undefined}
            aria-selected={type === t.id}
            onClick={() => setParams({ type: t.id })}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Err error={error} />
      {msg ? <div className="card muted">{msg}</div> : null}

      <div className="card table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Message</th>
              <th>Product</th>
              <th>Store</th>
              <th>Qty</th>
              <th>Expiry</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.alert_id)}>
                <td>{String(r.alert_message)}</td>
                <td>{String(r.product_name ?? r.alert_product_id ?? "—")}</td>
                <td>{String(r.store_name ?? r.alert_store_id ?? "—")}</td>
                <td>{r.alert_qty != null ? num(r.alert_qty) : "—"}</td>
                <td>{String(r.alert_expiry_at ?? "—")}</td>
                <td>{String(r.alert_created_at ?? "—").slice(0, 16).replace("T", " ")}</td>
                <td>
                  <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void ack(Number(r.alert_id))}>
                    Acknowledge
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={7} className="muted">
                  No open alerts
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function InventoryHistoryPage() {
  const stores = useStores();
  const [storeId, setStoreId] = useState("");
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    adminApi
      .inventoryMovements({
        store_id: storeId || undefined,
        q: q || undefined,
        per_page: 100,
      })
      .then((d) => setRows(d.items as Array<Record<string, unknown>>))
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load history");
        setRows([]);
      });
  }, [storeId, q]);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Stock history</h1>
          <p className="page-sub">Movement ledger for posted inventory documents.</p>
        </div>
      </header>

      <div className="toolbar card filters" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <select value={storeId} onChange={(e) => setStoreId(e.target.value)}>
          <option value="">All stores</option>
          {stores.map((s) => (
            <option key={s.ec_store_id} value={s.ec_store_id}>
              {s.ec_store_name}
            </option>
          ))}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Product / doc" />
      </div>

      <Err error={error} />
      <div className="card table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>When</th>
              <th>Product</th>
              <th>Store</th>
              <th>Doc</th>
              <th>Bucket</th>
              <th>Delta</th>
              <th>After</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.mov_id)}>
                <td>{String(r.mov_created_at ?? "—").slice(0, 16).replace("T", " ")}</td>
                <td>{String(r.product_name ?? r.mov_product_id)}</td>
                <td>{String(r.store_name ?? r.mov_store_id)}</td>
                <td>
                  {String(r.mov_doc_type ?? "—")}
                  {r.mov_doc_id ? ` #${r.mov_doc_id}` : ""}
                </td>
                <td>{String(r.mov_bucket ?? "—")}</td>
                <td>{num(r.mov_qty_delta)}</td>
                <td>{num(r.mov_qty_after)}</td>
                <td>{String(r.mov_note ?? "—")}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={8} className="muted">
                  No movements
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function InventoryValuationPage() {
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    adminApi
      .inventoryValuation()
      .then((d) => {
        setTotal(Number(d.total ?? 0));
        setRows(d.by_store as Array<Record<string, unknown>>);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load valuation"));
  }, []);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Stock valuation</h1>
          <p className="page-sub">Average-cost valuation totals by store.</p>
        </div>
        <Link className="btn btn-secondary" to="/inventory/stock">
          Open stock
        </Link>
      </header>

      <article className="settings-stat card" style={{ marginBottom: 12, maxWidth: 280 }}>
        <span className="settings-stat-label">Total valuation</span>
        <strong>{money(total)}</strong>
      </article>

      <Err error={error} />
      <div className="card table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Store</th>
              <th>On hand</th>
              <th>Valuation</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.store_id)}>
                <td>{String(r.store_name ?? r.store_id)}</td>
                <td>{num(r.on_hand)}</td>
                <td>{money(r.valuation)}</td>
                <td>
                  <Link to={`/inventory/stock?store_id=${r.store_id}`}>Stock</Link>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={4} className="muted">
                  No valuation rows
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function WarehouseHubPage() {
  return <Navigate to="/inventory" replace />;
}

export function WarehousesPage() {
  const stores = useStores();
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [form, setForm] = useState({
    code: "",
    name: "",
    store_id: "",
    type: "store",
  });
  const [editId, setEditId] = useState<number | null>(null);

  async function load() {
    setError("");
    try {
      const d = await adminApi.inventoryWarehouses({ per_page: 200 });
      setRows(d.items as Array<Record<string, unknown>>);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load warehouses");
      setRows([]);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMsg("");
    const body = {
      code: form.code || undefined,
      name: form.name,
      store_id: Number(form.store_id || 0),
      type: form.type,
    };
    try {
      if (editId) {
        await adminApi.updateWarehouse(editId, body);
        setMsg("Warehouse updated");
      } else {
        await adminApi.createWarehouse(body);
        setMsg("Warehouse created");
      }
      setForm({ code: "", name: "", store_id: "", type: "store" });
      setEditId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: number) {
    if (!window.confirm("Delete this warehouse?")) return;
    setBusy(true);
    try {
      await adminApi.deleteWarehouse(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function onSeed() {
    setBusy(true);
    setMsg("");
    try {
      const res = await adminApi.seedInventoryWarehouses();
      setMsg(`Seeded ${res.created} warehouses`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Seed failed");
    } finally {
      setBusy(false);
    }
  }

  const storeName = useMemo(() => {
    const map = new Map(stores.map((s) => [s.ec_store_id, s.ec_store_name]));
    return (id: unknown) => map.get(Number(id)) || String(id || "—");
  }, [stores]);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Warehouses</h1>
          <p className="page-sub">CRUD for store, central, and supplier warehouses.</p>
        </div>
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void onSeed()}>
          Seed defaults
        </button>
      </header>

      <Err error={error} />
      {msg ? <div className="card muted">{msg}</div> : null}

      <form className="card" onSubmit={onSubmit} style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>{editId ? "Edit warehouse" : "Add warehouse"}</h2>
        <div className="toolbar filters" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder="Code"
          />
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Name"
          />
          <select value={form.store_id} onChange={(e) => setForm({ ...form, store_id: e.target.value })}>
            <option value="">Store (optional)</option>
            {stores.map((s) => (
              <option key={s.ec_store_id} value={s.ec_store_id}>
                {s.ec_store_name}
              </option>
            ))}
          </select>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="store">Store</option>
            <option value="central">Central</option>
            <option value="supplier">Supplier</option>
          </select>
          <button type="submit" className="btn" disabled={busy}>
            {editId ? "Update" : "Create"}
          </button>
          {editId ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setEditId(null);
                setForm({ code: "", name: "", store_id: "", type: "store" });
              }}
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="card table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Store</th>
              <th>Type</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.wh_id)}>
                <td>{String(r.wh_code ?? "—")}</td>
                <td>{String(r.wh_name)}</td>
                <td>{String(r.store_name ?? storeName(r.wh_store_id))}</td>
                <td>{String(r.wh_type)}</td>
                <td>{Number(r.wh_status) === 1 ? "Active" : "Off"}</td>
                <td style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setEditId(Number(r.wh_id));
                      setForm({
                        code: String(r.wh_code ?? ""),
                        name: String(r.wh_name ?? ""),
                        store_id: String(r.wh_store_id || ""),
                        type: String(r.wh_type || "store"),
                      });
                    }}
                  >
                    Edit
                  </button>
                  <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void onDelete(Number(r.wh_id))}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={6} className="muted">
                  No warehouses
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
