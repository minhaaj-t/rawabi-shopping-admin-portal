import { firstToolPath, toolsForSurface, type UiUxSurface } from "./uiux";

export type NavLeaf = {
  to: string;
  label: string;
  levels?: number[];
  storeOk?: boolean;
  /** Match route exactly (no prefix matching). */
  exact?: boolean;
  /** Nested links under this leaf (sub-sub menu). */
  children?: NavLeaf[];
};

export type NavGroup = {
  label: string;
  levels?: number[];
  storeOk?: boolean;
  children: NavLeaf[];
};

export type NavEntry =
  | ({ kind: "link" } & NavLeaf)
  | ({ kind: "group" } & NavGroup);

function uiuxSurfaceLeaf(surface: UiUxSurface, label: string): NavLeaf {
  const base = `/ui-ux-designs/${surface}`;
  const tools = toolsForSurface(surface);
  return {
    to: firstToolPath(surface),
    label,
    levels: [1, 2],
    children: tools.map((tool) => ({
      to: `${base}/${tool.id}`,
      label: tool.label,
      levels: [1, 2] as number[],
    })),
  };
}

/** Enterprise module tree — all legacy routes preserved. */
export const NAV_TREE: NavEntry[] = [
  { kind: "link", to: "/", label: "Dashboard", levels: [1, 2, 7, 11, 12], storeOk: true },
  {
    kind: "group",
    label: "Help center",
    levels: [1, 2, 7],
    children: [
      { to: "/support/chats", label: "Chats", levels: [1, 2, 7] },
      { to: "/contacts", label: "Contact forms", levels: [1, 2] },
    ],
  },
  {
    kind: "group",
    label: "Products",
    levels: [1, 2, 7, 12],
    storeOk: true,
    children: [
      {
        to: "/products",
        label: "Product list",
        levels: [1, 2, 7, 12],
        storeOk: true,
        children: [
          { to: "/products/new", label: "Add product", levels: [1, 2, 12] },
          { to: "/products/offers", label: "Offer products", levels: [1, 2, 12] },
          { to: "/products/drafts", label: "Draft list", levels: [1, 2, 7, 12] },
        ],
      },
      { to: "/categories", label: "Categories", levels: [1, 2, 12] },
      { to: "/brands", label: "Brands", levels: [1, 2, 12] },
      { to: "/attributes", label: "Attributes", levels: [1, 2, 12] },
      { to: "/variants", label: "Variants", levels: [1, 2, 12] },
      { to: "/units", label: "Units", levels: [1, 2, 12] },
      { to: "/filters", label: "Filters", levels: [1, 2, 12] },
    ],
  },
  {
    kind: "group",
    label: "Orders",
    levels: [1, 2, 7, 12],
    storeOk: true,
    children: [
      { to: "/orders", label: "Order list", levels: [1, 2, 7, 12], storeOk: true },
      { to: "/pre-orders", label: "Pre-orders", levels: [1, 2, 7, 12] },
      { to: "/carts", label: "Abandoned carts", levels: [1, 2, 7, 12] },
      { to: "/wishlists", label: "Wishlist", levels: [1, 2, 7, 12] },
    ],
  },
  {
    kind: "group",
    label: "Inventory",
    levels: [1, 2, 7, 12],
    storeOk: true,
    children: [
      { to: "/inventory", label: "Overview", levels: [1, 2, 7, 12], storeOk: true, exact: true },
      { to: "/inventory/stock", label: "Stock", levels: [1, 2, 7, 12], storeOk: true },
      { to: "/warehouse/warehouses", label: "Warehouses", levels: [1, 2], storeOk: true },
      { to: "/inventory/documents", label: "Documents", levels: [1, 2, 12], storeOk: true },
      { to: "/inventory/batches", label: "Batches / Lots", levels: [1, 2, 12], storeOk: true },
      { to: "/inventory/alerts", label: "Alerts", levels: [1, 2, 7, 12], storeOk: true },
      { to: "/inventory/valuation", label: "Valuation", levels: [1, 2, 12], storeOk: true },
      { to: "/inventory/history", label: "Stock history", levels: [1, 2, 12], storeOk: true },
      { to: "/import-to-store", label: "Import to store", levels: [1, 2, 12], storeOk: true },
      { to: "/floor-requests", label: "Floor requests", levels: [1, 2, 12] },
    ],
  },
  {
    kind: "group",
    label: "Branches",
    levels: [1, 2],
    children: [
      { to: "/stores", label: "Stores", levels: [1, 2] },
      { to: "/branches/holidays", label: "Holidays", levels: [1, 2] },
      { to: "/slots", label: "Delivery slots", levels: [1, 2] },
    ],
  },
  { kind: "link", to: "/customers", label: "Customers", levels: [1, 2, 7] },
  {
    kind: "group",
    label: "Delivery & Pickup",
    levels: [1, 2],
    children: [
      { to: "/delivery-boys", label: "Delivery boys", levels: [1, 2] },
      { to: "/pickup-users", label: "Pickup users", levels: [1, 2] },
      { to: "/delivery-fees", label: "Delivery fees", levels: [1, 2] },
      { to: "/reports/delivery", label: "Delivery report", levels: [1, 2] },
    ],
  },
  {
    kind: "group",
    label: "Marketing",
    levels: [1, 2],
    children: [
      { to: "/marketing", label: "Overview", levels: [1, 2], exact: true },
      {
        to: "/marketing/analytics",
        label: "Analytics",
        levels: [1, 2],
        children: [
          { to: "/marketing/analytics", label: "All tools", levels: [1, 2] },
          { to: "/marketing/analytics/gtm", label: "Google Tag Manager", levels: [1, 2] },
          { to: "/marketing/analytics/ga4", label: "Google Analytics 4", levels: [1, 2] },
          { to: "/marketing/analytics/clarity", label: "Microsoft Clarity", levels: [1, 2] },
          { to: "/marketing/analytics/app-store", label: "App Store", levels: [1, 2] },
          { to: "/marketing/analytics/play-store", label: "Play Store", levels: [1, 2] },
          { to: "/marketing/analytics/hotjar", label: "Hotjar", levels: [1, 2] },
          { to: "/marketing/analytics/powerbi", label: "Power BI", levels: [1, 2] },
        ],
      },
      {
        to: "/marketing/ads",
        label: "Advertising",
        levels: [1, 2],
        children: [
          { to: "/marketing/ads", label: "All pixels", levels: [1, 2] },
          { to: "/marketing/ads/meta", label: "Meta Pixel", levels: [1, 2] },
          { to: "/marketing/ads/google", label: "Google Ads", levels: [1, 2] },
          { to: "/marketing/ads/tiktok", label: "TikTok", levels: [1, 2] },
          { to: "/marketing/ads/snapchat", label: "Snapchat", levels: [1, 2] },
          { to: "/marketing/ads/pinterest", label: "Pinterest", levels: [1, 2] },
          { to: "/marketing/ads/linkedin", label: "LinkedIn", levels: [1, 2] },
          { to: "/marketing/ads/microsoft", label: "Microsoft Ads", levels: [1, 2] },
        ],
      },
      {
        to: "/marketing/seo",
        label: "SEO & AEO",
        levels: [1, 2],
        children: [
          { to: "/marketing/seo", label: "SEO workspace", levels: [1, 2] },
          { to: "/marketing/seo/identity", label: "Site identity", levels: [1, 2] },
          { to: "/marketing/seo/indexing", label: "Robots & sitemap", levels: [1, 2] },
          { to: "/marketing/seo/aeo", label: "AEO & AI crawlers", levels: [1, 2] },
          { to: "/marketing/seo/search-console", label: "Search Console", levels: [1, 2] },
          { to: "/marketing/seo/merchant", label: "Merchant Center", levels: [1, 2] },
        ],
      },
      { to: "/marketing/plugins", label: "Plugins", levels: [1, 2] },
      {
        to: "/marketing/consent",
        label: "Cookie consent",
        levels: [1, 2],
        children: [
          { to: "/marketing/consent", label: "Banner & enable", levels: [1, 2] },
          { to: "/marketing/consent/permissions", label: "Permissions", levels: [1, 2] },
        ],
      },
    ],
  },
  {
    kind: "group",
    label: "Data Analyst",
    levels: [1, 2, 11],
    children: [
      { to: "/analyst", label: "Overview", levels: [1, 2, 11], exact: true },
      {
        to: "/analyst/customers",
        label: "Customer analysis",
        levels: [1, 2, 11],
        children: [
          { to: "/analyst/customers", label: "Segments & LTV", levels: [1, 2, 11] },
          { to: "/analyst/search-trends", label: "Search trends", levels: [1, 2, 11] },
        ],
      },
      {
        to: "/analyst/research",
        label: "Market research",
        levels: [1, 2, 11],
        children: [
          { to: "/analyst/research", label: "Sources & crawl", levels: [1, 2, 11] },
          { to: "/analyst/product-match", label: "Auto product match", levels: [1, 2, 11] },
        ],
      },
    ],
  },
  {
    kind: "group",
    label: "Promotions",
    levels: [1, 2],
    children: [
      { to: "/promotions", label: "Promotions", levels: [1, 2] },
      { to: "/coupons", label: "Coupons / promo codes", levels: [1, 2] },
    ],
  },
  {
    kind: "group",
    label: "Payments & Finance",
    levels: [1, 2],
    storeOk: true,
    children: [
      { to: "/finance", label: "Overview", levels: [1, 2], storeOk: true, exact: true },
      { to: "/finance/methods", label: "Payment methods", levels: [1, 2], storeOk: true },
      { to: "/finance/gateway-logs", label: "Gateway logs", levels: [1, 2], storeOk: true },
      { to: "/finance/transactions", label: "Transactions", levels: [1, 2], storeOk: true },
      { to: "/finance/cod", label: "COD management", levels: [1, 2], storeOk: true },
      { to: "/finance/refunds", label: "Refund management", levels: [1, 2], storeOk: true },
      { to: "/finance/invoices", label: "Invoices", levels: [1, 2], storeOk: true },
      { to: "/finance/tax", label: "Tax / VAT", levels: [1] },
      { to: "/finance/revenue", label: "Revenue reports", levels: [1, 2], storeOk: true },
      { to: "/finance/settlements", label: "Settlement reports", levels: [1, 2], storeOk: true },
    ],
  },
  {
    kind: "group",
    label: "Reports",
    levels: [1, 2, 11],
    children: [
      { to: "/reports/sales", label: "Sales report", levels: [1, 2, 11] },
      { to: "/reports/orders", label: "Order report", levels: [1, 2, 11] },
      { to: "/reports/products", label: "Product report", levels: [1, 2, 11] },
      { to: "/reports/users", label: "Users report", levels: [1, 2, 11] },
      { to: "/reports/updated-products", label: "Updated products", levels: [1, 2, 11] },
      { to: "/reports/non-ordered", label: "Non-ordered products", levels: [1, 2, 11] },
      { to: "/reports/store-reviews", label: "Store reviews", levels: [1, 2, 11] },
    ],
  },
  {
    kind: "group",
    label: "Users & Roles",
    levels: [1, 2],
    children: [
      {
        to: "/staff",
        label: "Staff & employees",
        levels: [1, 2],
      },
      { to: "/access/roles", label: "Roles & permissions", levels: [1] },
      { to: "/usergroups", label: "User groups", levels: [1, 2] },
      { to: "/vendors", label: "Vendors", levels: [1, 2] },
    ],
  },
  {
    kind: "group",
    label: "Jobs",
    levels: [1, 2, 6],
    children: [
      { to: "/jobs", label: "Overview", levels: [1, 2, 6], exact: true },
      { to: "/jobs/openings", label: "Job openings", levels: [1, 2, 6] },
      { to: "/jobs/applications", label: "Applications", levels: [1, 2, 6] },
    ],
  },
  {
    kind: "group",
    label: "Content",
    levels: [1, 2, 8],
    children: [
      { to: "/news", label: "News", levels: [1, 2, 8] },
      { to: "/notifications", label: "Notifications", levels: [1, 2, 7] },
    ],
  },
  {
    kind: "group",
    label: "UI UX Designs",
    levels: [1, 2],
    children: [
      uiuxSurfaceLeaf("banners", "Banners"),
      uiuxSurfaceLeaf("app", "App"),
      uiuxSurfaceLeaf("web", "Web"),
      uiuxSurfaceLeaf("delivery", "Delivery and Picker app"),
    ],
  },
  { kind: "link", to: "/tech-support", label: "Tech support", storeOk: true },
  {
    kind: "group",
    label: "Settings",
    levels: [1, 2],
    children: [
      {
        to: "/settings/shop",
        label: "General",
        levels: [1, 2],
        children: [
          { to: "/settings/shop", label: "Shop rules", levels: [1, 2] },
          { to: "/settings/checkout", label: "Checkout & payments", levels: [1, 2] },
          { to: "/settings/orders", label: "Order settings", levels: [1, 2] },
          { to: "/settings/storefront", label: "Storefront", levels: [1, 2] },
          { to: "/settings/notifications", label: "Notifications", levels: [1, 2] },
          { to: "/settings/auth", label: "Auth & security", levels: [1, 2] },
          { to: "/settings/urls", label: "URLs & formats", levels: [1, 2] },
        ],
      },
      {
        to: "/settings/languages",
        label: "Localization",
        levels: [1, 2],
        children: [
          { to: "/settings/languages", label: "Languages", levels: [1, 2] },
          { to: "/attributes", label: "Attributes / parameters", levels: [1, 2] },
          { to: "/settings/parameter-values", label: "Parameter values", levels: [1, 2] },
        ],
      },
      {
        to: "/settings/countries",
        label: "Geography",
        levels: [1, 2],
        children: [
          { to: "/settings/countries", label: "Countries", levels: [1, 2] },
          { to: "/settings/areas", label: "Areas", levels: [1, 2] },
        ],
      },
      {
        to: "/settings/integrations",
        label: "Integrations",
        levels: [1, 2],
        children: [
          { to: "/settings/integrations", label: "Manage integrations", levels: [1, 2] },
          { to: "/settings/email-templates", label: "Email templates", levels: [1, 2] },
          { to: "/settings/tools", label: "Cache & performance", levels: [1, 2] },
        ],
      },
    ],
  },
];

function leafVisible(leaf: NavLeaf, level: number, portal: "admin" | "store"): boolean {
  if (portal === "store") return Boolean(leaf.storeOk);
  if (!leaf.levels || leaf.levels.length === 0) return true;
  return leaf.levels.includes(level);
}

function filterLeaf(leaf: NavLeaf, level: number, portal: "admin" | "store"): NavLeaf | null {
  if (!leafVisible(leaf, level, portal)) return null;
  if (!leaf.children?.length) return leaf;
  const children = leaf.children
    .map((c) => filterLeaf(c, level, portal))
    .filter((c): c is NavLeaf => Boolean(c));
  return { ...leaf, children: children.length ? children : undefined };
}

export function pathMatchesNav(pathname: string, to: string, exact = false, search = ""): boolean {
  const [toPath, toQuery = ""] = to.split("?");
  const pathOk = (() => {
    if (pathname === toPath) return true;
    if (exact) return false;
    return pathname.startsWith(toPath.endsWith("/") ? toPath : `${toPath}/`);
  })();
  if (!pathOk) return false;
  if (!toQuery) return true;
  const want = new URLSearchParams(toQuery);
  const have = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  for (const [key, value] of want.entries()) {
    if (have.get(key) !== value) return false;
  }
  return true;
}

export function leafExact(leaf: NavLeaf): boolean {
  if (leaf.exact) return true;
  return Boolean(leaf.children?.length);
}

export type NavSearchPage = {
  title: string;
  href: string;
  group: string;
};

function collectLeafPages(leaf: NavLeaf, group: string, out: NavSearchPage[]) {
  out.push({ title: leaf.label, href: leaf.to, group });
  leaf.children?.forEach((child) => collectLeafPages(child, group, out));
}

export function searchableNavPages(level: number, portal: "admin" | "store"): NavSearchPage[] {
  const out: NavSearchPage[] = [];
  const seen = new Set<string>();
  for (const entry of navTreeForUser(level, portal)) {
    if (entry.kind === "link") {
      collectLeafPages(entry, "Pages", out);
      continue;
    }
    entry.children.forEach((child) => collectLeafPages(child, entry.label, out));
  }
  return out.filter((page) => {
    const key = `${page.href}::${page.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function navTreeForUser(level: number, portal: "admin" | "store"): NavEntry[] {
  const out: NavEntry[] = [];
  for (const entry of NAV_TREE) {
    if (entry.kind === "link") {
      const filtered = filterLeaf(entry, level, portal);
      if (filtered) out.push({ ...filtered, kind: "link" });
      continue;
    }
    if (portal === "store" && !entry.storeOk) continue;
    const children = entry.children
      .map((c) => filterLeaf(c, level, portal))
      .filter((c): c is NavLeaf => Boolean(c));
    if (children.length) out.push({ ...entry, children });
  }
  return out;
}
