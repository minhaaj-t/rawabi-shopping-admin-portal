import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { adminApi } from "../lib/api";
import { canManageStaff, getUser, isStorePortal } from "../lib/auth";
import { PeriodCalendarPicker, initialPeriodValue, periodParams, type PeriodValue } from "../components/PeriodCalendarPicker";
import { DashboardBlockCanvas } from "../components/DashboardBlockCanvas";
import { normalizeLayout, type DashboardLayout } from "../lib/dashboard-layout";
import { getStoredLocale, t } from "../lib/i18n";
import { LoadingIndicator } from "../components/LoadingIndicator";

type Dash = Awaited<ReturnType<typeof adminApi.dashboard>>;

export function DashboardPage() {
  const { id: idParam } = useParams();
  const dashId = idParam ? Number(idParam) : null;
  const locale = getStoredLocale();
  const user = getUser();
  const canBuild = canManageStaff(user) && !isStorePortal(user);
  const [range, setRange] = useState<PeriodValue>(() => initialPeriodValue());
  const [data, setData] = useState<Dash | null>(null);
  const [layout, setLayout] = useState<DashboardLayout | null>(null);
  const [error, setError] = useState("");
  const [productTotal, setProductTotal] = useState(0);
  const [customerTotal, setCustomerTotal] = useState(0);
  const [preOrderTotal, setPreOrderTotal] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);
  const [categoryTotal, setCategoryTotal] = useState(0);
  const [brandTotal, setBrandTotal] = useState(0);

  const period = range.period;
  const valuesKey = range.values.join(",");

  useEffect(() => {
    setError("");
    adminApi
      .dashboard(periodParams(range))
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- valuesKey tracks values array
  }, [period, valuesKey]);

  useEffect(() => {
    const loadLayout = dashId
      ? adminApi.dashboardLayout(dashId).then((raw) => normalizeLayout(raw as Record<string, unknown>))
      : adminApi.dashboardLayoutResolved().then((raw) => normalizeLayout(raw as Record<string, unknown> | null));
    loadLayout.then(setLayout).catch(() => setLayout(null));
    void Promise.all([
      adminApi.products({ per_page: 1, page: 1 }),
      adminApi.customers({ per_page: 1, page: 1 }),
      adminApi.preOrders({ per_page: 1, page: 1 }),
      adminApi.carts({ per_page: 1, page: 1 }),
      adminApi.brands({ per_page: 1, page: 1 }),
      adminApi.categories(),
    ]).then(([products, customers, preOrders, carts, brands, categories]) => {
      setProductTotal(products.total);
      setCustomerTotal(customers.total);
      setPreOrderTotal(preOrders.total);
      setCartTotal(carts.total);
      setBrandTotal(brands.total);
      setCategoryTotal(categories.length);
    }).catch(() => undefined);
  }, [dashId]);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <LoadingIndicator label={t(locale, "loading")} padded />;

  const blocks = layout?.blocks?.length
    ? layout.blocks
    : [
        { id: "fallback-kpi", type: "kpi_row", enabled: true, settings: { metrics: ["sales", "orders", "aov", "pending", "customers", "products", "today"] } },
        { id: "fallback-sales", type: "chart_sales", enabled: true, settings: {} },
        { id: "fallback-donut", type: "donut_status", enabled: true, settings: {} },
        { id: "fallback-volume", type: "chart_volume", enabled: true, settings: {} },
        { id: "fallback-stack", type: "stack_status", enabled: true, settings: {} },
        { id: "fallback-top", type: "top_products", enabled: true, settings: { limit: 8 } },
        { id: "fallback-rev", type: "revenue_by_status", enabled: true, settings: {} },
        { id: "fallback-orders", type: "recent_orders", enabled: true, settings: { limit: 10 } },
      ];

  return (
    <div className="page dash-runtime-page">
      <div className="page-head">
        <div>
          <h1>{layout?.title || t(locale, "dashboard")}</h1>
          <p className="page-sub">
            {data.period_label}
            {layout?.description ? ` · ${layout.description}` : " · operational overview"}
          </p>
        </div>
        <div className="page-head-actions">
          {canBuild ? (
            <Link className="btn btn-secondary" to="/dashboards">
              Manage dashboards
            </Link>
          ) : null}
          <PeriodCalendarPicker value={range} label={data.period_label} onChange={setRange} />
        </div>
      </div>

      <div className="chart-grid dash-runtime-grid">
        <DashboardBlockCanvas
          blocks={blocks}
          data={data}
          extra={{
            customerTotal,
            productTotal,
            preOrderTotal: preOrderTotal,
            cartTotal,
            categoryTotal,
            brandTotal,
          }}
        />
      </div>
    </div>
  );
}
