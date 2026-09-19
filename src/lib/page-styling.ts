export type StyleViewport = "mobile" | "tablet" | "desktop";

export type StyleNodeType =
  | "section"
  | "columns"
  | "column"
  | "div"
  | "heading"
  | "text"
  | "image"
  | "button"
  | "spacer"
  | "banner-hero"
  | "banner-side"
  | "banner-below"
  | "banner-bottom"
  | "banner-popup"
  | "marquee"
  | "categories"
  | "products"
  | "flyer";

export type StyleNodeProps = {
  text?: string;
  textAr?: string;
  href?: string;
  src?: string;
  alt?: string;
  columns?: number;
  gap?: number;
  padding?: number;
  bg?: string;
  color?: string;
  align?: "start" | "center" | "end";
  fontSize?: number;
  hiddenMobile?: boolean;
  hiddenTablet?: boolean;
  hiddenDesktop?: boolean;
  bannerGroup?: string;
  productSource?: "item-group" | "offers" | "featured";
  productLimit?: number;
  marqueeSpeed?: number;
};

export type StyleNode = {
  id: string;
  type: StyleNodeType;
  props: StyleNodeProps;
  children: StyleNode[];
};

export type StylePageId =
  | "web-home"
  | "app-home"
  | "delivery-home"
  | "web-about"
  | "web-faq"
  | "web-deals";

export type StylePageDef = {
  id: StylePageId;
  label: string;
  group: "Web" | "App" | "Delivery";
  desc: string;
};

export type StyleDocument = {
  pageId: StylePageId;
  nodes: StyleNode[];
  updatedAt: string;
};

export type StyleHistoryEntry = {
  id: string;
  at: string;
  label: string;
  nodes: StyleNode[];
};

export type StylePageRecord = {
  draft: StyleDocument;
  published: StyleDocument | null;
  history: StyleHistoryEntry[];
};

export type StyleLayoutsPayload = {
  pages: Partial<Record<StylePageId, StylePageRecord>>;
  globals: StyleNode[];
};

export type StyleElementDef = {
  type: StyleNodeType;
  label: string;
  hint: string;
  group: "structure" | "basic" | "commerce" | "banners";
};

export const STYLE_PAGES: StylePageDef[] = [
  { id: "web-home", label: "Web · Home", group: "Web", desc: "Frontstore landing — hero, categories, products" },
  { id: "web-deals", label: "Web · Deals", group: "Web", desc: "Offers and flyer landing" },
  { id: "web-about", label: "Web · About us", group: "Web", desc: "CMS about page" },
  { id: "web-faq", label: "Web · FAQ", group: "Web", desc: "Help topics" },
  { id: "app-home", label: "App · Home", group: "App", desc: "Customer app home feed" },
  { id: "delivery-home", label: "Delivery · Home", group: "Delivery", desc: "Picker and driver home" },
];

export const STYLE_ELEMENTS: StyleElementDef[] = [
  { type: "section", label: "Section", hint: "Full-width band", group: "structure" },
  { type: "columns", label: "Columns", hint: "2–4 responsive columns", group: "structure" },
  { type: "div", label: "Div", hint: "Inner container", group: "structure" },
  { type: "spacer", label: "Spacer", hint: "Vertical gap", group: "structure" },
  { type: "heading", label: "Heading", hint: "Title text", group: "basic" },
  { type: "text", label: "Text", hint: "Paragraph", group: "basic" },
  { type: "image", label: "Image", hint: "Media block", group: "basic" },
  { type: "button", label: "Button", hint: "Call to action", group: "basic" },
  { type: "banner-hero", label: "Hero slider", hint: "Top · Hero slider", group: "banners" },
  { type: "banner-side", label: "Side offers", hint: "Side rail / 2-up", group: "banners" },
  { type: "banner-below", label: "Below slider", hint: "Promo tiles", group: "banners" },
  { type: "banner-bottom", label: "Bottom strip", hint: "Footer promo band", group: "banners" },
  { type: "banner-popup", label: "Popup banner", hint: "Modal overlay", group: "banners" },
  { type: "marquee", label: "Marquee", hint: "Scrolling announcement", group: "commerce" },
  { type: "categories", label: "Categories", hint: "Category grid", group: "commerce" },
  { type: "products", label: "Products", hint: "Item group / offers", group: "commerce" },
  { type: "flyer", label: "Flyer", hint: "Weekly flyer card", group: "commerce" },
];

export const GLOBAL_PRESETS: Array<{ id: string; label: string; hint: string; node: () => StyleNode }> = [
  {
    id: "announce",
    label: "Announcement bar",
    hint: "Site-wide scrolling notice",
    node: () =>
      makeNode("section", { padding: 0, bg: "#12211a" }, [
        makeNode("marquee", { text: "Free delivery over 45 QAR · Fresh Gulf groceries", color: "#f8d808", marqueeSpeed: 28 }),
      ]),
  },
  {
    id: "header",
    label: "Store header",
    hint: "Logo + search chrome",
    node: () =>
      makeNode("section", { padding: 12, bg: "#ffffff" }, [
        makeNode("heading", { text: "Rawabi Shopping", fontSize: 18, color: "#2b8f43" }),
        makeNode("text", { text: "Search products, brands, and deals", color: "#6b7c70", fontSize: 13 }),
      ]),
  },
  {
    id: "promo",
    label: "Promo strip",
    hint: "Reusable citrus band",
    node: () =>
      makeNode("section", { padding: 16, bg: "#faad1c" }, [
        makeNode("heading", { text: "This week’s offers", align: "center", fontSize: 20, color: "#12211a" }),
        makeNode("text", { text: "Shop deals in QAR — limited time.", align: "center", color: "#12211a" }),
      ]),
  },
  {
    id: "footer",
    label: "Footer band",
    hint: "Links + copyright",
    node: () =>
      makeNode("section", { padding: 20, bg: "#12211a" }, [
        makeNode("heading", { text: "Rawabi Shopping", color: "#ffffff", fontSize: 16 }),
        makeNode("text", { text: "Al Rawabi Group · Qatar · About · FAQ · Careers", color: "#8ec33f", fontSize: 12 }),
      ]),
  },
];

export const VIEWPORT_WIDTH: Record<StyleViewport, number> = {
  mobile: 390,
  tablet: 768,
  desktop: 1200,
};

export function newId(prefix = "n"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function makeNode(type: StyleNodeType, props: StyleNodeProps = {}, children: StyleNode[] = []): StyleNode {
  const next = { ...defaultProps(type), ...props };
  let kids = children;
  if (type === "columns" && kids.length === 0) {
    const count = Math.min(4, Math.max(2, next.columns ?? 2));
    kids = Array.from({ length: count }, () => makeNode("column"));
  }
  return { id: newId(type), type, props: next, children: kids };
}

export function defaultProps(type: StyleNodeType): StyleNodeProps {
  switch (type) {
    case "section":
      return { padding: 16, bg: "#f7faf7", gap: 12 };
    case "columns":
      return { columns: 2, gap: 12, padding: 0 };
    case "column":
    case "div":
      return { padding: 8, gap: 8, bg: "transparent" };
    case "heading":
      return { text: "Heading", fontSize: 22, color: "#12211a", align: "start" };
    case "text":
      return { text: "Write something shoppers will notice.", fontSize: 14, color: "#6b7c70", align: "start" };
    case "image":
      return { src: "", alt: "Image" };
    case "button":
      return { text: "Shop now", href: "/", bg: "#2b8f43", color: "#ffffff", align: "start" };
    case "spacer":
      return { padding: 24 };
    case "banner-hero":
      return { bannerGroup: "Top" };
    case "banner-side":
      return { bannerGroup: "Side" };
    case "banner-below":
      return { bannerGroup: "Below Slider" };
    case "banner-bottom":
      return { bannerGroup: "Bottom" };
    case "banner-popup":
      return { bannerGroup: "Popup" };
    case "marquee":
      return { text: "Fresh deals · Same-day delivery across Qatar", color: "#12211a", bg: "#f8d808", marqueeSpeed: 32 };
    case "categories":
      return { padding: 8 };
    case "products":
      return { productSource: "item-group", productLimit: 8 };
    case "flyer":
      return { padding: 8 };
    default:
      return {};
  }
}

export function cloneNode(node: StyleNode): StyleNode {
  return {
    id: newId(node.type),
    type: node.type,
    props: { ...node.props },
    children: node.children.map(cloneNode),
  };
}

export function elementLabel(type: StyleNodeType): string {
  if (type === "column") return "Column";
  return STYLE_ELEMENTS.find((e) => e.type === type)?.label ?? type;
}

export function canHaveChildren(type: StyleNodeType): boolean {
  return type === "section" || type === "columns" || type === "column" || type === "div";
}

export function walkNodes(nodes: StyleNode[], visit: (node: StyleNode, parent: StyleNode | null) => void, parent: StyleNode | null = null): void {
  for (const node of nodes) {
    visit(node, parent);
    if (node.children.length) walkNodes(node.children, visit, node);
  }
}

export function findNode(nodes: StyleNode[], id: string): StyleNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const nested = findNode(node.children, id);
    if (nested) return nested;
  }
  return null;
}

export function mapNodes(nodes: StyleNode[], fn: (node: StyleNode) => StyleNode): StyleNode[] {
  return nodes.map((node) => {
    const next = fn(node);
    return { ...next, children: mapNodes(next.children, fn) };
  });
}

export function updateNode(nodes: StyleNode[], id: string, patch: Partial<StyleNodeProps>): StyleNode[] {
  return nodes.map((node) => {
    if (node.id === id) {
      const props = { ...node.props, ...patch };
      let children = node.children;
      if (node.type === "columns" && patch.columns !== undefined) {
        const count = Math.min(4, Math.max(2, Number(patch.columns) || 2));
        props.columns = count;
        if (children.length < count) {
          children = [...children, ...Array.from({ length: count - children.length }, () => makeNode("column"))];
        } else if (children.length > count) {
          children = children.slice(0, count);
        }
      }
      return { ...node, props, children };
    }
    return { ...node, children: updateNode(node.children, id, patch) };
  });
}

export function removeNode(nodes: StyleNode[], id: string): StyleNode[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => ({ ...node, children: removeNode(node.children, id) }));
}

export function insertNode(nodes: StyleNode[], parentId: string | null, child: StyleNode, index?: number): StyleNode[] {
  if (!parentId) {
    const next = [...nodes];
    const at = index === undefined ? next.length : Math.max(0, Math.min(index, next.length));
    next.splice(at, 0, child);
    return next;
  }
  return nodes.map((node) => {
    if (node.id === parentId && canHaveChildren(node.type)) {
      const kids = [...node.children];
      const at = index === undefined ? kids.length : Math.max(0, Math.min(index, kids.length));
      kids.splice(at, 0, child);
      return { ...node, children: kids };
    }
    return { ...node, children: insertNode(node.children, parentId, child, index) };
  });
}

export function moveSibling(nodes: StyleNode[], id: string, dir: -1 | 1): StyleNode[] {
  const i = nodes.findIndex((n) => n.id === id);
  if (i >= 0) {
    const j = i + dir;
    if (j < 0 || j >= nodes.length) return nodes;
    const next = [...nodes];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  }
  return nodes.map((node) => ({ ...node, children: moveSibling(node.children, id, dir) }));
}

export function duplicateNode(nodes: StyleNode[], id: string): StyleNode[] {
  const i = nodes.findIndex((n) => n.id === id);
  if (i >= 0) {
    const copy = cloneNode(nodes[i]);
    const next = [...nodes];
    next.splice(i + 1, 0, copy);
    return next;
  }
  return nodes.map((node) => ({ ...node, children: duplicateNode(node.children, id) }));
}

export function parentIdOf(nodes: StyleNode[], id: string, parentId: string | null = null): string | null {
  for (const node of nodes) {
    if (node.id === id) return parentId;
    const nested = parentIdOf(node.children, id, node.id);
    if (nested !== null || node.children.some((c) => c.id === id)) {
      if (node.children.some((c) => c.id === id)) return node.id;
      if (nested) return nested;
    }
  }
  return null;
}

export function isHiddenOnViewport(node: StyleNode, viewport: StyleViewport): boolean {
  if (viewport === "mobile") return Boolean(node.props.hiddenMobile);
  if (viewport === "tablet") return Boolean(node.props.hiddenTablet);
  return Boolean(node.props.hiddenDesktop);
}

export function defaultDocument(pageId: StylePageId): StyleDocument {
  return {
    pageId,
    updatedAt: new Date().toISOString(),
    nodes: defaultNodes(pageId),
  };
}

export function defaultNodes(pageId: StylePageId): StyleNode[] {
  if (pageId === "web-about") {
    return [
      makeNode("section", { padding: 28, bg: "#ffffff" }, [
        makeNode("heading", { text: "About us", fontSize: 28 }),
        makeNode("text", { text: "Rawabi Shopping is part of Al Rawabi Group, serving Qatar with groceries and household essentials." }),
      ]),
    ];
  }
  if (pageId === "web-faq") {
    return [
      makeNode("section", { padding: 28, bg: "#ffffff" }, [
        makeNode("heading", { text: "FAQ" }),
        makeNode("text", { text: "Delivery, payments, returns, and account help." }),
      ]),
    ];
  }
  if (pageId === "web-deals") {
    return [
      makeNode("section", { padding: 12, bg: "#f7faf7" }, [
        makeNode("heading", { text: "Deals" }),
        makeNode("flyer"),
        makeNode("products", { productSource: "offers", productLimit: 12 }),
      ]),
    ];
  }
  if (pageId === "delivery-home") {
    return [
      makeNode("section", { padding: 16, bg: "#0b1220" }, [
        makeNode("heading", { text: "Today’s tasks", color: "#e5e7eb" }),
        makeNode("text", { text: "Pick and deliver queues for your branch.", color: "#4ade80" }),
      ]),
    ];
  }
  if (pageId === "app-home") {
    return [
      makeNode("section", { padding: 0, bg: "#f2f2f2" }, [makeNode("banner-popup")]),
      makeNode("section", { padding: 8, bg: "#f2f2f2" }, [
        makeNode("banner-hero"),
        makeNode("banner-below"),
        makeNode("categories"),
        makeNode("products"),
        makeNode("banner-bottom"),
      ]),
    ];
  }
  return [
    makeNode("section", { padding: 0, bg: "#f7faf7" }, [makeNode("banner-popup")]),
    makeNode("section", { padding: 12, bg: "#f7faf7", gap: 12 }, [
      makeNode("columns", { columns: 2, gap: 12 }, [
        makeNode("column", { padding: 0 }, [makeNode("banner-hero")]),
        makeNode("column", { padding: 0 }, [makeNode("banner-side")]),
      ]),
      makeNode("banner-below"),
      makeNode("categories"),
      makeNode("flyer"),
      makeNode("products"),
      makeNode("banner-bottom"),
    ]),
  ];
}

export function emptyLayouts(): StyleLayoutsPayload {
  return { pages: {}, globals: GLOBAL_PRESETS.map((g) => g.node()) };
}

export function normalizeLayouts(raw: unknown): StyleLayoutsPayload {
  const empty = emptyLayouts();
  if (!raw || typeof raw !== "object") return empty;
  const rec = raw as Record<string, unknown>;
  const pagesIn = rec.pages && typeof rec.pages === "object" ? (rec.pages as Record<string, unknown>) : rec;
  const pages: StyleLayoutsPayload["pages"] = {};
  for (const def of STYLE_PAGES) {
    const row = pagesIn[def.id];
    if (row && typeof row === "object") {
      pages[def.id] = normalizeRecord(def.id, row as Record<string, unknown>);
    }
  }
  const globals = Array.isArray(rec.globals) ? rec.globals.map((n) => normalizeNode(n)).filter(Boolean) as StyleNode[] : empty.globals;
  return { pages, globals: globals.length ? globals : empty.globals };
}

function normalizeRecord(pageId: StylePageId, row: Record<string, unknown>): StylePageRecord {
  const draftNodes = Array.isArray(row.draft)
    ? row.draft
    : row.draft && typeof row.draft === "object" && Array.isArray((row.draft as StyleDocument).nodes)
      ? (row.draft as StyleDocument).nodes
      : defaultNodes(pageId);
  const publishedRaw = row.published;
  const publishedNodes =
    publishedRaw && typeof publishedRaw === "object" && Array.isArray((publishedRaw as StyleDocument).nodes)
      ? (publishedRaw as StyleDocument).nodes
      : Array.isArray(publishedRaw)
        ? publishedRaw
        : null;
  return {
    draft: {
      pageId,
      nodes: (draftNodes as unknown[]).map(normalizeNode).filter(Boolean) as StyleNode[],
      updatedAt: typeof (row.draft as StyleDocument | undefined)?.updatedAt === "string"
        ? (row.draft as StyleDocument).updatedAt
        : new Date().toISOString(),
    },
    published: publishedNodes
      ? {
          pageId,
          nodes: publishedNodes.map(normalizeNode).filter(Boolean) as StyleNode[],
          updatedAt: typeof (publishedRaw as StyleDocument | undefined)?.updatedAt === "string"
            ? (publishedRaw as StyleDocument).updatedAt
            : new Date().toISOString(),
        }
      : null,
    history: Array.isArray(row.history)
      ? (row.history as StyleHistoryEntry[]).slice(0, 40).map((h) => ({
          id: String(h.id ?? newId("h")),
          at: String(h.at ?? new Date().toISOString()),
          label: String(h.label ?? "Edit"),
          nodes: Array.isArray(h.nodes) ? (h.nodes.map(normalizeNode).filter(Boolean) as StyleNode[]) : [],
        }))
      : [],
  };
}

function normalizeNode(raw: unknown): StyleNode | null {
  if (!raw || typeof raw !== "object") return null;
  const n = raw as Partial<StyleNode>;
  const type = (n.type ?? "div") as StyleNodeType;
  if (!STYLE_ELEMENTS.some((e) => e.type === type) && type !== "column") return null;
  return {
    id: typeof n.id === "string" && n.id ? n.id : newId(type),
    type,
    props: { ...defaultProps(type), ...(n.props ?? {}) },
    children: Array.isArray(n.children) ? (n.children.map(normalizeNode).filter(Boolean) as StyleNode[]) : [],
  };
}

export function docsEqual(a: StyleNode[], b: StyleNode[]): boolean {
  return JSON.stringify(stripIds(a)) === JSON.stringify(stripIds(b));
}

function stripIds(nodes: StyleNode[]): unknown {
  return nodes.map((n) => ({ type: n.type, props: n.props, children: stripIds(n.children) }));
}
