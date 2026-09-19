import type { DashData } from "../components/DashboardBlockCanvas";
import { getStoredLocale, t } from "./i18n";

export type DashExtra = {
  customerTotal: number;
  productTotal: number;
  preOrderTotal: number;
  cartTotal: number;
  categoryTotal: number;
  brandTotal: number;
};

export type MetricDef = {
  value: string;
  label: string;
  category: string;
  description: string;
};

export const DB_METRIC_WIDGETS: MetricDef[] = [
  { value: "sales", label: "Sales (QAR)", category: "database", description: "Period sales amount from orders" },
  { value: "orders", label: "Orders", category: "database", description: "Order count in selected period" },
  { value: "aov", label: "Avg. order value", category: "database", description: "Average payable per order" },
  { value: "pending", label: "Pending / picking", category: "database", description: "Processing & picking orders" },
  { value: "picked", label: "Picked / delivery", category: "database", description: "Picked and on-delivery orders" },
  { value: "delivered", label: "Delivered", category: "database", description: "Delivered orders in period" },
  { value: "cancelled", label: "Cancelled", category: "database", description: "Cancelled orders in period" },
  { value: "today", label: "Today's orders", category: "database", description: "Orders created today" },
  { value: "total_orders", label: "All-time orders", category: "database", description: "Total orders in database" },
  { value: "customers", label: "Customers", category: "database", description: "Registered customer count" },
  { value: "products", label: "Products", category: "database", description: "Active catalog SKU count" },
  { value: "pre_orders", label: "Pre-orders", category: "database", description: "Open pre-order records" },
  { value: "carts", label: "Active carts", category: "database", description: "Shopping carts in system" },
  { value: "categories", label: "Categories", category: "database", description: "Catalog category count" },
  { value: "brands", label: "Brands", category: "database", description: "Brand records count" },
];

export type ResolvedMetric = {
  label: string;
  value: string;
  sub: string;
};

export function resolveMetric(
  metric: string,
  data: DashData,
  extra: DashExtra,
  locale = getStoredLocale(),
): ResolvedMetric {
  const cards = data.cards ?? {};
  const periodOrders = Number(cards.total_sales?.count || 0);
  const periodSales = Number(cards.total_sales?.amount || 0);
  const avgOrder = periodOrders > 0 ? periodSales / periodOrders : 0;

  switch (metric) {
    case "sales":
      return {
        label: t(locale, "sales"),
        value: `QAR ${periodSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        sub: `${periodOrders} orders`,
      };
    case "orders":
      return { label: t(locale, "orders"), value: String(periodOrders), sub: data.period_label };
    case "aov":
      return { label: "Avg. order value", value: `QAR ${avgOrder.toFixed(0)}`, sub: "Selected period" };
    case "pending":
      return {
        label: t(locale, "pendingOrders"),
        value: String(cards.pending_picking?.count ?? 0),
        sub: `QAR ${Number(cards.pending_picking?.amount || 0).toFixed(0)}`,
      };
    case "picked":
      return {
        label: "Picked / delivery",
        value: String(cards.picked_ondelivery?.count ?? 0),
        sub: `QAR ${Number(cards.picked_ondelivery?.amount || 0).toFixed(0)}`,
      };
    case "delivered":
      return {
        label: "Delivered",
        value: String(cards.delivered?.count ?? 0),
        sub: `QAR ${Number(cards.delivered?.amount || 0).toFixed(0)}`,
      };
    case "cancelled":
      return {
        label: "Cancelled",
        value: String(cards.cancelled?.count ?? 0),
        sub: `QAR ${Number(cards.cancelled?.amount || 0).toFixed(0)}`,
      };
    case "customers":
      return { label: t(locale, "customers"), value: String(extra.customerTotal), sub: "Registered" };
    case "products":
      return { label: t(locale, "products"), value: String(extra.productTotal), sub: "Catalog SKUs" };
    case "today":
      return {
        label: "Today's orders",
        value: String(data.today_orders ?? 0),
        sub: `${data.total_orders ?? 0} all-time`,
      };
    case "total_orders":
      return { label: "All-time orders", value: String(data.total_orders ?? 0), sub: "Database total" };
    case "pre_orders":
      return { label: "Pre-orders", value: String(extra.preOrderTotal), sub: "Open records" };
    case "carts":
      return { label: "Active carts", value: String(extra.cartTotal), sub: "Shopping carts" };
    case "categories":
      return { label: "Categories", value: String(extra.categoryTotal), sub: "Catalog tree" };
    case "brands":
      return { label: "Brands", value: String(extra.brandTotal), sub: "Brand records" };
    default:
      return { label: metric, value: "—", sub: "" };
  }
}

export function metricLabel(metric: string): string {
  return DB_METRIC_WIDGETS.find((m) => m.value === metric)?.label ?? metric;
}
