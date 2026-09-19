/** Warm likely-next route chunks without blocking UI. */

const warmed = new Set<string>();

const ROUTE_IMPORTERS: Record<string, () => Promise<unknown>> = {
  "/": () => import("../pages/DashboardPage"),
  "/orders": () => import("../pages/OrdersPage"),
  "/products": () => import("../pages/ProductsPage"),
  "/customers": () => import("../pages/CustomersPage"),
  "/stores": () => import("../pages/StoresManagePage"),
  "/categories": () => import("../pages/CategoryManagementPage"),
  "/support/chats": () => import("../pages/SupportChatPage"),
  "/marketing": () => import("../pages/MarketingPages"),
  "/inventory": () => import("../pages/InventoryOpsPages"),
  "/finance": () => import("../pages/FinancePages"),
  "/settings/shop": () => import("../pages/SettingsPages"),
  "/ui-ux-designs/styling": () => import("../pages/PageStylingEditor"),
};

function importerFor(path: string): (() => Promise<unknown>) | undefined {
  const clean = path.split("?")[0].replace(/\/$/, "") || "/";
  if (ROUTE_IMPORTERS[clean]) return ROUTE_IMPORTERS[clean];
  // prefix match for nested paths (longest first)
  const keys = Object.keys(ROUTE_IMPORTERS).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (key !== "/" && clean.startsWith(key)) return ROUTE_IMPORTERS[key];
  }
  return undefined;
}

export function prefetchRoute(path: string): void {
  const load = importerFor(path);
  if (!load) return;
  const key = path.split("?")[0];
  if (warmed.has(key)) return;
  warmed.add(key);
  void load().catch(() => {
    warmed.delete(key);
  });
}

/** After shell mounts, warm dashboard + a few high-traffic modules on idle. */
export function prefetchShellRoutes(): void {
  const run = () => {
    for (const path of ["/", "/orders", "/products", "/customers"]) {
      prefetchRoute(path);
    }
  };
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    (
      window as Window & {
        requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number;
      }
    ).requestIdleCallback(() => run(), { timeout: 2500 });
  } else {
    globalThis.setTimeout(run, 400);
  }
}
