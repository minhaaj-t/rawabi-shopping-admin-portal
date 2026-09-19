import { DB_METRIC_WIDGETS } from "./dashboard-metrics";

export type DashboardBlock = {
  id: string;
  type: string;
  enabled: boolean;
  settings: Record<string, unknown>;
};

export type DashboardAssignment = {
  assign_type: "user" | "level" | "all" | string;
  assign_ref: number;
};

export type DashboardLayout = {
  id: number;
  slug: string;
  title: string;
  description?: string | null;
  blocks: DashboardBlock[];
  is_default: boolean;
  status: number;
  assignments: DashboardAssignment[];
  updated_at?: string | null;
};

export type WidgetCatalogItem = {
  type: string;
  label: string;
  category: string;
  description: string;
};

export type LibraryDragItem = WidgetCatalogItem & {
  blockType: string;
  preset?: Record<string, unknown>;
};

const DND_TYPE = "application/x-rawabi-dash-widget";

export function serializeDragWidget(item: LibraryDragItem): string {
  return JSON.stringify({
    blockType: item.blockType,
    preset: item.preset ?? {},
    label: item.label,
  });
}

export function parseDragWidget(raw: string): { blockType: string; preset: Record<string, unknown>; label: string } | null {
  try {
    const j = JSON.parse(raw) as { blockType?: string; preset?: Record<string, unknown>; label?: string };
    if (!j.blockType) return null;
    return { blockType: j.blockType, preset: j.preset ?? {}, label: j.label ?? j.blockType };
  } catch {
    return null;
  }
}

export function getDndMimeType(): string {
  return DND_TYPE;
}

export function normalizeBlocks(raw: unknown): DashboardBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((b): b is Record<string, unknown> => Boolean(b) && typeof b === "object")
    .map((b) => ({
      id: String(b.id ?? cryptoRandom()),
      type: String(b.type ?? ""),
      enabled: b.enabled !== false,
      settings:
        b.settings && typeof b.settings === "object" && !Array.isArray(b.settings)
          ? (b.settings as Record<string, unknown>)
          : {},
    }))
    .filter((b) => b.type);
}

export function normalizeLayout(raw: Record<string, unknown> | null | undefined): DashboardLayout | null {
  if (!raw) return null;
  return {
    id: Number(raw.id),
    slug: String(raw.slug ?? ""),
    title: String(raw.title ?? "Dashboard"),
    description: (raw.description as string) ?? "",
    blocks: normalizeBlocks(raw.blocks),
    is_default: Boolean(raw.is_default),
    status: Number(raw.status ?? 1),
    assignments: Array.isArray(raw.assignments)
      ? (raw.assignments as DashboardAssignment[])
      : [],
    updated_at: (raw.updated_at as string) ?? null,
  };
}

export function defaultBlockSettings(type: string): Record<string, unknown> {
  switch (type) {
    case "kpi_row":
      return { metrics: ["sales", "orders", "aov", "pending", "customers", "products", "today"] };
    case "kpi_stat":
      return { metric: "sales", span: 1 };
    case "heading":
      return { title: "Section", subtitle: "" };
    case "chart_sales":
    case "chart_volume":
    case "donut_status":
    case "stack_status":
      return { span: 1, height: 180 };
    case "top_products":
    case "revenue_by_status":
    case "recent_orders":
      return { span: 2, limit: 8 };
    case "shortcuts":
      return {
        links: [
          { label: "Orders", to: "/orders" },
          { label: "Products", to: "/products" },
          { label: "Customers", to: "/customers" },
        ],
      };
    case "spacer":
      return { height: 16 };
    default:
      return {};
  }
}

export function buildLibraryItems(catalog: WidgetCatalogItem[]): LibraryDragItem[] {
  const dbStats: LibraryDragItem[] = DB_METRIC_WIDGETS.map((m) => ({
    type: `stat_${m.value}`,
    blockType: "kpi_stat",
    label: m.label,
    category: m.category,
    description: m.description,
    preset: { metric: m.value, span: 1 },
  }));

  const fromCatalog: LibraryDragItem[] = catalog
    .filter((w) => w.type !== "kpi_stat")
    .map((w) => ({
      ...w,
      blockType: w.type,
      preset: defaultBlockSettings(w.type),
    }));

  return [...dbStats, ...fromCatalog];
}

export function makeBlock(type: string, preset: Record<string, unknown> = {}): DashboardBlock {
  return {
    id: cryptoRandom(),
    type,
    enabled: true,
    settings: { ...defaultBlockSettings(type), ...preset },
  };
}

export function duplicateBlock(block: DashboardBlock): DashboardBlock {
  return {
    ...block,
    id: cryptoRandom(),
    settings: { ...block.settings },
  };
}

/** Grid width: 1 = half row, 2 = full row */
export function blockSpanClass(block: DashboardBlock, defaultFull = false): string {
  const span = block.settings.span;
  if (span === 2 || span === "full") return "chart-span-2";
  if (span === 1 || span === "half") return "";
  return defaultFull ? "chart-span-2" : "";
}

export function widgetTitle(block: DashboardBlock, fallback: string): string {
  const title = block.settings.title;
  return typeof title === "string" && title.trim() ? title.trim() : fallback;
}

export function chartHeight(block: DashboardBlock, fallback = 180): number {
  const h = Number(block.settings.height ?? fallback);
  return Number.isFinite(h) ? Math.min(320, Math.max(80, h)) : fallback;
}

export const WIDGET_CATEGORIES: Record<string, string> = {
  database: "Database stats",
  metrics: "Metrics",
  charts: "Charts",
  lists: "Lists & tables",
  layout: "Layout",
};

export function blockLabel(block: DashboardBlock, catalog: WidgetCatalogItem[]): string {
  if (block.type === "kpi_stat") {
    const metric = String(block.settings.metric ?? "sales");
    const fromDb = DB_METRIC_WIDGETS.find((m) => m.value === metric);
    if (fromDb) return fromDb.label;
  }
  return catalog.find((c) => c.type === block.type)?.label ?? block.type;
}

export const SHORTCUT_PRESETS = [
  { label: "Orders", to: "/orders" },
  { label: "Products", to: "/products" },
  { label: "Customers", to: "/customers" },
  { label: "Categories", to: "/categories" },
  { label: "Banners", to: "/banners" },
  { label: "Staff", to: "/staff" },
  { label: "Reports", to: "/reports/sales" },
  { label: "Finance", to: "/finance" },
];

function cryptoRandom(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  }
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}
