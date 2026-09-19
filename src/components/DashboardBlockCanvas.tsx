import { Link } from "react-router-dom";
import type { LucideIcon } from "../lib/icons";
import {
  AlertTriangle,
  ClipboardList,
  Layers,
  Package,
  ShoppingCart,
  Tag,
  Truck,
  Users,
  Wallet,
  XCircle,
} from "../lib/icons";
import { StatusBadge } from "./StatusBadge";
import type { DashboardBlock } from "../lib/dashboard-layout";
import { blockSpanClass, chartHeight, widgetTitle } from "../lib/dashboard-layout";
import { resolveMetric, type DashExtra } from "../lib/dashboard-metrics";
import { getStoredLocale, t } from "../lib/i18n";
import type { adminApi } from "../lib/api";

export type DashData = Awaited<ReturnType<typeof adminApi.dashboard>>;

type Extra = DashExtra;

function decodeName(raw: unknown): string {
  const s = String(raw ?? "");
  if (!s.startsWith("{")) return s || "-";
  try {
    const j = JSON.parse(s) as Record<string, string>;
    return j.English || j.english || Object.values(j)[0] || s;
  } catch {
    return s;
  }
}

const METRIC_ICONS: Record<string, LucideIcon> = {
  sales: Wallet,
  orders: ShoppingCart,
  aov: Wallet,
  pending: ClipboardList,
  picked: Truck,
  delivered: Package,
  cancelled: XCircle,
  today: AlertTriangle,
  total_orders: ShoppingCart,
  customers: Users,
  products: Package,
  pre_orders: ClipboardList,
  carts: ShoppingCart,
  categories: Layers,
  brands: Tag,
};

function statusMixFrom(data: DashData) {
  const c = data.cards;
  return [
    { key: "pending", label: "Pending / Picking", count: Number(c.pending_picking?.count || 0), color: "var(--rw-yellow)" },
    { key: "picked", label: "Picked / On delivery", count: Number(c.picked_ondelivery?.count || 0), color: "var(--rw-green)" },
    { key: "delivered", label: "Delivered", count: Number(c.delivered?.count || 0), color: "var(--rw-green-dark)" },
    { key: "cancelled", label: "Cancelled", count: Number(c.cancelled?.count || 0), color: "var(--rw-error)" },
  ];
}

export function DashboardBlockCanvas({
  blocks,
  data,
  extra,
}: {
  blocks: DashboardBlock[];
  data: DashData;
  extra: Extra;
}) {
  const locale = getStoredLocale();
  const enabled = blocks.filter((b) => b.enabled !== false);

  return (
    <div className="dash-block-canvas">
      {enabled.map((block) => (
        <DashboardBlockView key={block.id} block={block} data={data} extra={extra} locale={locale} />
      ))}
      {!enabled.length ? <p className="muted chart-span-2">This dashboard has no enabled widgets.</p> : null}
    </div>
  );
}

export function DashboardBlockView({
  block,
  data,
  extra,
  locale,
}: {
  block: DashboardBlock;
  data: DashData;
  extra: Extra;
  locale: ReturnType<typeof getStoredLocale>;
}) {
  const cards = data.cards ?? {};
  const chart = data.chart;
  const labels = chart.labels ?? data.labels ?? [];
  const totals = chart.total ?? [];
  const salesAmt = chart.sales_amount ?? Array(labels.length).fill(0);
  const maxOrders = Math.max(1, ...totals.map(Number));
  const maxSales = Math.max(1, ...salesAmt.map(Number));
  const maxProduct = Math.max(1, ...(data.popular_products?.map((p) => p.count) ?? [1]));

  if (block.type === "spacer") {
    return <div className={blockSpanClass(block, true)} style={{ height: Number(block.settings.height ?? 16) }} aria-hidden />;
  }

  if (block.type === "heading") {
    return (
      <div className={`dash-block-heading ${blockSpanClass(block, true)}`}>
        <h2>{String(block.settings.title ?? "Section")}</h2>
        {block.settings.subtitle ? <p className="muted">{String(block.settings.subtitle)}</p> : null}
      </div>
    );
  }

  if (block.type === "shortcuts") {
    const links = Array.isArray(block.settings.links) ? (block.settings.links as Array<{ label: string; to: string }>) : [];
    return (
      <div className={`card dash-shortcuts ${blockSpanClass(block, true)}`}>
        <h3 className="section-card-title">{widgetTitle(block, "Quick links")}</h3>
        <div className="dash-shortcut-row">
          {links.map((l) => (
            <Link key={`${l.to}-${l.label}`} className="btn btn-secondary" to={l.to}>
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  if (block.type === "kpi_stat") {
    const metric = resolveMetric(String(block.settings.metric ?? "sales"), data, extra, locale);
    return (
      <div className={blockSpanClass(block, false)}>
        <div className="card stat-card">
          <h3>{widgetTitle(block, metric.label)}</h3>
          <strong>{metric.value}</strong>
          <div className="stat-amount">{metric.sub}</div>
        </div>
      </div>
    );
  }

  if (block.type === "kpi_row") {
    const wanted = Array.isArray(block.settings.metrics)
      ? (block.settings.metrics as string[])
      : ["sales", "orders", "aov", "pending", "customers", "products", "today"];
    const metrics = wanted
      .map((key) => {
        const resolved = resolveMetric(key, data, extra, locale);
        return { key, ...resolved, icon: METRIC_ICONS[key] ?? Wallet };
      })
      .filter((m) => m.key);

    return (
      <div className={`card-grid dash-cards ${blockSpanClass(block, true)}`}>
        {metrics.map((k) => {
          const Icon = k.icon;
          return (
            <div className="card stat-card dash-kpi-card" key={k.key}>
              <div className="stat-card-head">
                <h3>{k.label}</h3>
                <Icon className="stat-icon" size={16} strokeWidth={1.75} aria-hidden />
              </div>
              <strong>{k.value}</strong>
              {k.sub ? <div className="stat-amount">{k.sub}</div> : null}
            </div>
          );
        })}
      </div>
    );
  }

  if (block.type === "chart_sales") {
    const h = chartHeight(block);
    return (
      <div className={`card ${blockSpanClass(block)}`}>
        <h3 className="section-card-title">{widgetTitle(block, "Sales")}</h3>
        <p className="chart-hint">Order value in QAR · {data.period_label}</p>
        <div className={`col-chart ${labels.length > 14 ? "is-dense" : ""}`} style={{ height: h }}>
          {salesAmt.map((amt, i) => {
            const h = Math.max(2, (Number(amt) / maxSales) * 100);
            return (
              <div className="col-chart-item" key={i} title={`${labels[i]}: QAR ${Number(amt).toFixed(0)}`}>
                <div className="col-chart-value">{Number(amt) > 0 && labels.length <= 14 ? Math.round(Number(amt)) : ""}</div>
                <div className="col-chart-bar-wrap">
                  <div className="col-chart-bar sales" style={{ height: `${h}%` }} />
                </div>
                <div className="col-chart-label">{labels[i]}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (block.type === "chart_volume") {
    const h = chartHeight(block);
    return (
      <div className={`card ${blockSpanClass(block)}`}>
        <h3 className="section-card-title">{widgetTitle(block, "Order volume")}</h3>
        <p className="chart-hint">Order count · {data.period_label}</p>
        <div className={`col-chart ${labels.length > 14 ? "is-dense" : ""}`} style={{ height: h }}>
          {totals.map((n, i) => {
            const h = Math.max(2, (Number(n) / maxOrders) * 100);
            return (
              <div className="col-chart-item" key={i} title={`${labels[i]}: ${n}`}>
                <div className="col-chart-value">{Number(n) > 0 && labels.length <= 14 ? n : ""}</div>
                <div className="col-chart-bar-wrap">
                  <div className="col-chart-bar volume" style={{ height: `${h}%` }} />
                </div>
                <div className="col-chart-label">{labels[i]}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (block.type === "donut_status") {
    const statusMix = statusMixFrom(data);
    const total = Math.max(1, statusMix.reduce((s, x) => s + x.count, 0));
    let cursor = 0;
    const parts = statusMix.map((s) => {
      const start = cursor;
      const pct = (s.count / total) * 100;
      cursor += pct;
      return `${s.color} ${start}% ${cursor}%`;
    });
    return (
      <div className={`card ${blockSpanClass(block)}`}>
        <h3 className="section-card-title">{widgetTitle(block, "Order status mix")}</h3>
        <p className="chart-hint">{data.period_label}</p>
        <div className="donut-wrap">
          <div className="donut" style={{ background: `conic-gradient(${parts.join(", ")})` }}>
            <div className="donut-hole">
              <strong>{statusMix.every((s) => s.count === 0) ? 0 : statusMix.reduce((s, x) => s + x.count, 0)}</strong>
              <span>orders</span>
            </div>
          </div>
          <ul className="donut-legend">
            {statusMix.map((s) => (
              <li key={s.key}>
                <span className="swatch" style={{ background: s.color }} />
                <span className="lbl">{s.label}</span>
                <strong>
                  {s.count}
                  <span className="muted"> ({Math.round((s.count / total) * 100)}%)</span>
                </strong>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (block.type === "stack_status") {
    return (
      <div className={`card ${blockSpanClass(block)}`}>
        <h3 className="section-card-title">{widgetTitle(block, "Status trend")}</h3>
        <div className="stack-chart">
          {labels.map((label, i) => {
            const pendingN = Number(chart.pending_picking?.[i] || 0);
            const pickedN = Number(chart.picked_ondelivery?.[i] || 0);
            const deliveredN = Number(chart.delivered?.[i] || 0);
            const cancelledN = Number(chart.cancelled?.[i] || 0);
            const rowTotal = Math.max(1, pendingN + pickedN + deliveredN + cancelledN);
            return (
              <div className="stack-row" key={`${label}-${i}`}>
                <span className="stack-label">{label}</span>
                <div className="stack-track">
                  <div className="stack-seg pending" style={{ width: `${(pendingN / rowTotal) * 100}%` }} />
                  <div className="stack-seg picked" style={{ width: `${(pickedN / rowTotal) * 100}%` }} />
                  <div className="stack-seg delivered" style={{ width: `${(deliveredN / rowTotal) * 100}%` }} />
                  <div className="stack-seg cancelled" style={{ width: `${(cancelledN / rowTotal) * 100}%` }} />
                </div>
                <span className="stack-total">{totals[i] ?? 0}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (block.type === "top_products") {
    const limit = Number(block.settings.limit ?? 8);
    const rows = (data.popular_products ?? []).slice(0, limit);
    return (
      <div className={`card ${blockSpanClass(block, true)}`}>
        <h3 className="section-card-title">{widgetTitle(block, t(locale, "topProducts"))}</h3>
        {!rows.length ? (
          <p className="muted">{t(locale, "noData")}</p>
        ) : (
          <div className="hbar-chart">
            {rows.map((p) => (
              <div className="hbar-row" key={p.product_id}>
                <div className="hbar-meta">
                  <span className="hbar-name">{decodeName(p.name)}</span>
                  <span className="muted">{p.sku || "—"}</span>
                </div>
                <div className="hbar-track">
                  <div className="hbar-fill" style={{ width: `${(p.count / maxProduct) * 100}%` }} />
                </div>
                <strong className="hbar-count">{p.count}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (block.type === "revenue_by_status") {
    const rows = [
      { label: cards.total_sales?.label || "Total sales", amount: cards.total_sales?.amount, count: cards.total_sales?.count },
      { label: cards.pending_picking?.label || "Pending", amount: cards.pending_picking?.amount, count: cards.pending_picking?.count },
      { label: cards.picked_ondelivery?.label || "In progress", amount: cards.picked_ondelivery?.amount, count: cards.picked_ondelivery?.count },
      { label: cards.delivered?.label || "Delivered", amount: cards.delivered?.amount, count: cards.delivered?.count },
      { label: cards.cancelled?.label || "Cancelled", amount: cards.cancelled?.amount, count: cards.cancelled?.count },
    ];
    const maxAmt = Math.max(1, ...rows.map((r) => Number(r.amount || 0)));
    return (
      <div className={`card ${blockSpanClass(block, true)}`}>
        <h3 className="section-card-title">{widgetTitle(block, "Revenue by status")}</h3>
        <div className="hbar-chart">
          {rows.map((row) => (
            <div className="hbar-row" key={row.label}>
              <div className="hbar-meta">
                <span className="hbar-name">{row.label}</span>
                <span className="muted">{row.count ?? 0} orders</span>
              </div>
              <div className="hbar-track">
                <div className="hbar-fill revenue" style={{ width: `${(Number(row.amount || 0) / maxAmt) * 100}%` }} />
              </div>
              <strong className="hbar-count">QAR {Number(row.amount || 0).toFixed(0)}</strong>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (block.type === "recent_orders") {
    const limit = Number(block.settings.limit ?? 10);
    const rows = data.recent_orders.slice(0, limit);
    return (
      <div className={`card ${blockSpanClass(block, true)}`}>
        <div className="panel-toolbar">
          <h2 style={{ margin: 0 }}>{widgetTitle(block, t(locale, "recentOrders"))}</h2>
          <Link className="btn btn-secondary" to="/orders">
            {t(locale, "showAll")}
          </Link>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Store</th>
                <th>Status</th>
                <th>{t(locale, "actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={String(o.order_id)}>
                  <td>{String(o.order_refno)}</td>
                  <td className="wrap">
                    {String(o.username ?? "-")}
                    <div className="muted">{String(o.phone ?? "")}</div>
                  </td>
                  <td>QAR {Number(o.order_payable ?? 0).toFixed(2)}</td>
                  <td>{String(o.order_created_at ?? "")}</td>
                  <td>{decodeName(o.ec_store_name ?? o.order_storeid ?? "-")}</td>
                  <td>
                    <StatusBadge status={String(o.order_status ?? "")} />
                  </td>
                  <td>
                    <Link className="linkish" to={`/orders/${o.order_id}`}>
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={7} className="muted">
                    {t(locale, "noData")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <p className="muted">Unknown widget: {block.type}</p>
    </div>
  );
}
