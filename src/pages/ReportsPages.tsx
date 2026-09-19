import { useEffect, useState } from "react";
import { adminApi } from "../lib/api";

function DateFilters({
  from,
  to,
  setFrom,
  setTo,
  onRun,
}: {
  from: string;
  to: string;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
  onRun: () => void;
}) {
  return (
    <div className="toolbar card">
      <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
      <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      <button type="button" className="btn" onClick={onRun}>
        Run
      </button>
    </div>
  );
}

function useRange() {
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  return { from, to, setFrom, setTo };
}

export function SalesReportPage() {
  const { from, to, setFrom, setTo } = useRange();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      setData(await adminApi.reportSales({ date_from: from, date_to: to }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const byDay = (data?.by_day as Array<Record<string, unknown>>) || [];
  const byStore = (data?.by_store as Array<Record<string, unknown>>) || [];

  return (
    <div>
      <div className="page-head">
        <h1>Sales Report</h1>
      </div>
      <DateFilters from={from} to={to} setFrom={setFrom} setTo={setTo} onRun={() => void load()} />
      {error ? <p className="error">{error}</p> : null}
      <div className="card table-wrap" style={{ marginBottom: 16 }}>
        <h3>By day</h3>
        <table className="data">
          <thead>
            <tr>
              <th>Day</th>
              <th>Orders</th>
              <th>Gross</th>
              <th>Discount</th>
              <th>Delivery</th>
            </tr>
          </thead>
          <tbody>
            {byDay.map((r) => (
              <tr key={String(r.day)}>
                <td>{String(r.day)}</td>
                <td>{String(r.orders_count)}</td>
                <td>{Number(r.gross || 0).toFixed(2)}</td>
                <td>{Number(r.discount || 0).toFixed(2)}</td>
                <td>{Number(r.delivery_fee || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card table-wrap">
        <h3>By store</h3>
        <table className="data">
          <thead>
            <tr>
              <th>Store</th>
              <th>Orders</th>
              <th>Gross</th>
            </tr>
          </thead>
          <tbody>
            {byStore.map((r) => (
              <tr key={String(r.order_storeid)}>
                <td>{String(r.ec_store_name ?? r.order_storeid)}</td>
                <td>{String(r.orders_count)}</td>
                <td>{Number(r.gross || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SimpleReport({
  title,
  load,
  columns,
  rowsKey = "items",
}: {
  title: string;
  load: (from: string, to: string) => Promise<Record<string, unknown> | Array<Record<string, unknown>>>;
  columns: Array<{ key: string; label: string }>;
  rowsKey?: string;
}) {
  const { from, to, setFrom, setTo } = useRange();
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState("");

  async function run() {
    setError("");
    try {
      const data = await load(from, to);
      if (Array.isArray(data)) setRows(data);
      else setRows((data[rowsKey] as Array<Record<string, unknown>>) || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  useEffect(() => {
    void run();
  }, []);

  return (
    <div>
      <div className="page-head">
        <h1>{title}</h1>
      </div>
      <DateFilters from={from} to={to} setFrom={setFrom} setTo={setTo} onRun={() => void run()} />
      {error ? <p className="error">{error}</p> : null}
      <div className="card table-wrap">
        <table className="data">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c.key}>{String(r[c.key] ?? "-")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function UsersReportPage() {
  return (
    <SimpleReport
      title="Users Report"
      load={(from, to) => adminApi.reportUsers({ date_from: from, date_to: to })}
      columns={[
        { key: "id", label: "ID" },
        { key: "username", label: "Name" },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        { key: "create_date", label: "Joined" },
      ]}
    />
  );
}

export function ProductsReportPage() {
  return (
    <SimpleReport
      title="Product Report"
      load={(from, to) => adminApi.reportProducts({ date_from: from, date_to: to })}
      columns={[
        { key: "ordr_item_id", label: "Product ID" },
        { key: "product_name", label: "Name" },
        { key: "ec_prdct_sku", label: "SKU" },
        { key: "qty", label: "Qty" },
        { key: "revenue", label: "Revenue" },
      ]}
    />
  );
}

export function OrdersReportPage() {
  return (
    <SimpleReport
      title="Order Report"
      rowsKey="by_status"
      load={(from, to) => adminApi.reportOrders({ date_from: from, date_to: to })}
      columns={[
        { key: "order_status", label: "Status" },
        { key: "cnt", label: "Count" },
        { key: "gross", label: "Gross" },
      ]}
    />
  );
}

export function UpdatedProductsReportPage() {
  return (
    <SimpleReport
      title="Updated Product Report"
      load={(from, to) => adminApi.reportUpdatedProducts({ date_from: from, date_to: to })}
      columns={[
        { key: "ec_prdct_id", label: "ID" },
        { key: "ec_prdct_sku", label: "SKU" },
        { key: "ec_prdct_item_name", label: "Name" },
        { key: "ec_prdct_selling_price", label: "Price" },
        { key: "ec_prdct_lastupdated", label: "Updated" },
      ]}
    />
  );
}

export function StoreReviewsReportPage() {
  return (
    <SimpleReport
      title="Store Review"
      load={async () => adminApi.reportStoreReviews()}
      columns={[
        { key: "cr_id", label: "ID" },
        { key: "ec_store_name", label: "Store" },
        { key: "username", label: "User" },
        { key: "cr_feel", label: "Feel" },
        { key: "cr_problems", label: "Problems" },
        { key: "cr_created", label: "Created" },
      ]}
    />
  );
}

export function NonOrderedReportPage() {
  return (
    <SimpleReport
      title="Non-Ordered Product Report"
      load={(from, to) => adminApi.reportNonOrdered({ date_from: from, date_to: to })}
      columns={[
        { key: "ec_prdct_id", label: "ID" },
        { key: "ec_prdct_sku", label: "SKU" },
        { key: "ec_prdct_item_name", label: "Name" },
        { key: "ec_prdct_selling_price", label: "Price" },
      ]}
    />
  );
}

export function DeliveryReportPage() {
  return (
    <SimpleReport
      title="Delivery Report"
      load={(from, to) => adminApi.reportDelivery({ date_from: from, date_to: to })}
      columns={[
        { key: "order_refno", label: "Ref" },
        { key: "ec_store_name", label: "Store" },
        { key: "driver_name", label: "Driver" },
        { key: "order_status", label: "Status" },
        { key: "order_payable", label: "Payable" },
        { key: "order_delivery_fee", label: "Fee" },
      ]}
    />
  );
}
