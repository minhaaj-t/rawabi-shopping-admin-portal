import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { adminApi } from "../lib/api";
import {
  Clock,
  Copy,
  ImageIcon,
  Layers,
  Monitor,
  Plus,
  RotateCcw,
  Search,
  Smartphone,
  Tablet,
  Trash2,
} from "../lib/icons";
import {
  GLOBAL_PRESETS,
  STYLE_ELEMENTS,
  STYLE_PAGES,
  VIEWPORT_WIDTH,
  canHaveChildren,
  cloneNode,
  defaultDocument,
  docsEqual,
  duplicateNode,
  elementLabel,
  findNode,
  insertNode,
  isHiddenOnViewport,
  makeNode,
  moveSibling,
  normalizeLayouts,
  parentIdOf,
  removeNode,
  updateNode,
  type StyleDocument,
  type StyleElementDef,
  type StyleHistoryEntry,
  type StyleLayoutsPayload,
  type StyleNode,
  type StyleNodeType,
  type StylePageId,
  type StylePageRecord,
  type StyleViewport,
} from "../lib/page-styling";
import "../styles/page-styling.css";

type LeftTab = "elements" | "global";
type RightTab = "navigator" | "history" | "options";
type BannerPreview = { type?: string; title?: string; image_url?: string; image?: string; status?: number };

const ELEMENT_GROUPS: Array<{ id: StyleElementDef["group"]; label: string }> = [
  { id: "structure", label: "Layout" },
  { id: "basic", label: "Basic" },
  { id: "banners", label: "Banners" },
  { id: "commerce", label: "Store" },
];

const DEMO_CATEGORIES = ["Fresh", "Dairy", "Bakery", "Frozen", "Home", "Baby", "Pets", "Offers"];
const DEMO_PRODUCTS = [
  { name: "Al Rawabi Milk 2L", price: "8.50" },
  { name: "Arabic Bread pack", price: "2.00" },
  { name: "Tomato 1kg", price: "4.25" },
  { name: "Olive Oil 500ml", price: "16.00" },
  { name: "Basmati Rice 5kg", price: "22.00" },
  { name: "Yogurt 6-pack", price: "7.75" },
];

function recordFor(payload: StyleLayoutsPayload, pageId: StylePageId): StylePageRecord {
  return (
    payload.pages[pageId] ?? {
      draft: defaultDocument(pageId),
      published: null,
      history: [],
    }
  );
}

export function PageStylingEditor() {
  const [pageId, setPageId] = useState<StylePageId>("web-home");
  const [viewport, setViewport] = useState<StyleViewport>("desktop");
  const [payload, setPayload] = useState<StyleLayoutsPayload>(() => normalizeLayouts(null));
  const [nodes, setNodes] = useState<StyleNode[]>(() => defaultDocument("web-home").nodes);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<LeftTab>("elements");
  const [rightTab, setRightTab] = useState<RightTab>("options");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [banners, setBanners] = useState<BannerPreview[]>([]);
  const undoRef = useRef<StyleNode[][]>([]);
  const redoRef = useRef<StyleNode[][]>([]);
  const skipHistory = useRef(false);
  const [localHistory, setLocalHistory] = useState<StyleHistoryEntry[]>([]);

  const rec = useMemo(() => recordFor(payload, pageId), [payload, pageId]);
  const dirty = useMemo(() => !docsEqual(nodes, rec.draft.nodes), [nodes, rec.draft.nodes]);
  const unpublished = useMemo(
    () => !rec.published || !docsEqual(nodes, rec.published.nodes),
    [nodes, rec.published],
  );
  const selected = selectedId ? findNode(nodes, selectedId) : null;
  const pageDef = STYLE_PAGES.find((p) => p.id === pageId)!;

  const load = useCallback(async () => {
    try {
      const data = await adminApi.uiuxLayouts();
      const next = normalizeLayouts(data);
      setPayload(next);
      const row = recordFor(next, pageId);
      setNodes(row.draft.nodes);
      setLocalHistory(row.history);
      undoRef.current = [];
      redoRef.current = [];
    } catch {
      setMsg("Working offline — layouts save locally until the API is ready.");
    }
    try {
      const list = await adminApi.banners({ per_page: 40, page: 1 });
      const rows = (list.items ?? []) as BannerPreview[];
      setBanners(Array.isArray(rows) ? rows : []);
    } catch {
      setBanners([]);
    }
  }, [pageId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const row = recordFor(payload, pageId);
    setNodes(row.draft.nodes);
    setSelectedId(null);
    setLocalHistory(row.history);
    undoRef.current = [];
    redoRef.current = [];
  }, [pageId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (skipHistory.current) {
      skipHistory.current = false;
      return;
    }
  }, [nodes]);

  const commit = useCallback((next: StyleNode[], label: string) => {
    undoRef.current = [...undoRef.current.slice(-39), nodes];
    redoRef.current = [];
    setNodes(next);
    setLocalHistory((prev) => [
      { id: `h-${Date.now()}`, at: new Date().toISOString(), label, nodes: next },
      ...prev,
    ].slice(0, 40));
  }, [nodes]);

  const undo = () => {
    const prev = undoRef.current.pop();
    if (!prev) return;
    redoRef.current.push(nodes);
    skipHistory.current = true;
    setNodes(prev);
  };

  const redo = () => {
    const nxt = redoRef.current.pop();
    if (!nxt) return;
    undoRef.current.push(nodes);
    skipHistory.current = true;
    setNodes(nxt);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
      if (e.key === "Delete" && selectedId) {
        e.preventDefault();
        commit(removeNode(nodes, selectedId), "Delete element");
        setSelectedId(null);
      }
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function addElement(type: StyleNodeType) {
    const node = makeNode(type);
    const parent = selected && canHaveChildren(selected.type) ? selected.id : null;
    const next = insertNode(nodes, parent, node);
    commit(next, `Add ${elementLabel(type)}`);
    setSelectedId(node.id);
    setRightTab("options");
  }

  function addGlobal(presetId: string) {
    const preset = GLOBAL_PRESETS.find((g) => g.id === presetId);
    if (!preset) return;
    const node = cloneNode(preset.node());
    commit(insertNode(nodes, null, node), `Add ${preset.label}`);
    setSelectedId(node.id);
  }

  function persist(nextPayload: StyleLayoutsPayload) {
    setPayload(nextPayload);
    return adminApi.updateUiuxLayouts({
      page_layouts: {
        pages: nextPayload.pages,
        globals: nextPayload.globals,
      },
    });
  }

  async function saveDraft() {
    setBusy(true);
    setMsg("");
    const draft: StyleDocument = { pageId, nodes, updatedAt: new Date().toISOString() };
    const next: StyleLayoutsPayload = {
      ...payload,
      pages: {
        ...payload.pages,
        [pageId]: { ...rec, draft, history: localHistory },
      },
    };
    try {
      await persist(next);
      setMsg("Draft saved.");
    } catch (e) {
      setPayload(next);
      setMsg(e instanceof Error ? e.message : "Draft kept locally.");
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    setBusy(true);
    setMsg("");
    const now = new Date().toISOString();
    const doc: StyleDocument = { pageId, nodes, updatedAt: now };
    const history: StyleHistoryEntry[] = [
      { id: `pub-${Date.now()}`, at: now, label: "Published", nodes },
      ...localHistory,
    ].slice(0, 40);
    const next: StyleLayoutsPayload = {
      ...payload,
      pages: {
        ...payload.pages,
        [pageId]: { draft: doc, published: doc, history },
      },
    };
    try {
      await persist(next);
      setLocalHistory(history);
      setMsg("Published to storefront layout.");
    } catch (e) {
      setPayload(next);
      setLocalHistory(history);
      setMsg(e instanceof Error ? e.message : "Published locally.");
    } finally {
      setBusy(false);
    }
  }

  function restoreHistory(entry: StyleHistoryEntry) {
    commit(entry.nodes, `Restore · ${entry.label}`);
  }

  const filteredElements = STYLE_ELEMENTS.filter((el) => {
    const q = query.trim().toLowerCase();
    return !q || el.label.toLowerCase().includes(q) || el.hint.toLowerCase().includes(q);
  });

  return (
    <div className="el-editor">
      <header className="el-topbar">
        <div className="el-topbar-start">
          <label className="el-page-picker">
            <span className="el-sr">Page</span>
            <select
              value={pageId}
              aria-label="Pages"
              onChange={(e) => setPageId(e.target.value as StylePageId)}
            >
              {(["Web", "App", "Delivery"] as const).map((group) => (
                <optgroup key={group} label={group}>
                  {STYLE_PAGES.filter((p) => p.group === group).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <p className="el-page-meta">{pageDef.desc}</p>
        </div>

        <div className="el-viewport" role="group" aria-label="Responsive view">
          <button
            type="button"
            className={viewport === "mobile" ? "is-active" : undefined}
            aria-pressed={viewport === "mobile"}
            onClick={() => setViewport("mobile")}
          >
            <Smartphone size={16} />
            <span>Mobile</span>
          </button>
          <button
            type="button"
            className={viewport === "tablet" ? "is-active" : undefined}
            aria-pressed={viewport === "tablet"}
            onClick={() => setViewport("tablet")}
          >
            <Tablet size={16} />
            <span>Tablet</span>
          </button>
          <button
            type="button"
            className={viewport === "desktop" ? "is-active" : undefined}
            aria-pressed={viewport === "desktop"}
            onClick={() => setViewport("desktop")}
          >
            <Monitor size={16} />
            <span>Desktop</span>
          </button>
        </div>

        <div className="el-topbar-end">
          <button type="button" className="el-ghost" onClick={undo} disabled={!undoRef.current.length} title="Undo">
            <RotateCcw size={14} />
          </button>
          {msg ? <span className="el-status">{msg}</span> : null}
          <button type="button" className="el-btn el-btn-ghost" disabled={busy} onClick={() => void saveDraft()}>
            {dirty ? "Save draft" : "Draft saved"}
          </button>
          <button type="button" className="el-btn el-btn-publish" disabled={busy} onClick={() => void publish()}>
            {busy ? "Publishing…" : unpublished ? "Publish" : "Published"}
          </button>
        </div>
      </header>

      <div className="el-body">
        <aside className="el-panel el-left">
          <div className="el-tabs" role="tablist" aria-label="Library">
            <button type="button" role="tab" aria-selected={leftTab === "elements"} className={leftTab === "elements" ? "is-active" : undefined} onClick={() => setLeftTab("elements")}>
              Elements
            </button>
            <button type="button" role="tab" aria-selected={leftTab === "global"} className={leftTab === "global" ? "is-active" : undefined} onClick={() => setLeftTab("global")}>
              Global
            </button>
          </div>

          {leftTab === "elements" ? (
            <>
              <div className="el-search">
                <Search size={14} />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search widgets…" aria-label="Search elements" />
              </div>
              <div className="el-library">
                {ELEMENT_GROUPS.map((group) => {
                  const items = filteredElements.filter((el) => el.group === group.id);
                  if (!items.length) return null;
                  return (
                    <div key={group.id} className="el-lib-group">
                      <h3>{group.label}</h3>
                      <div className="el-lib-grid">
                        {items.map((el) => (
                          <button key={el.type} type="button" className="el-lib-item" onClick={() => addElement(el.type)} title={el.hint}>
                            <span className={`el-lib-ico type-${el.type}`} aria-hidden />
                            <strong>{el.label}</strong>
                            <small>{el.hint}</small>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="el-library">
              <p className="el-hint">Reusable sections. Click to drop onto the page.</p>
              <div className="el-lib-grid el-lib-global">
                {GLOBAL_PRESETS.map((g) => (
                  <button key={g.id} type="button" className="el-lib-item" onClick={() => addGlobal(g.id)}>
                    <span className="el-lib-ico type-section" aria-hidden />
                    <strong>{g.label}</strong>
                    <small>{g.hint}</small>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        <section className="el-stage">
          <div className="el-stage-frame" data-viewport={viewport} style={{ width: Math.min(VIEWPORT_WIDTH[viewport], 1200) }}>
            <div className="el-stage-chrome" data-viewport={viewport}>
              <span />
              <span />
              <span />
            </div>
            <div className={`el-canvas rb-preview vp-${viewport}`} onClick={() => setSelectedId(null)}>
              {nodes.length ? (
                nodes.map((node) => (
                  <CanvasNode
                    key={node.id}
                    node={node}
                    selectedId={selectedId}
                    viewport={viewport}
                    banners={banners}
                    onSelect={setSelectedId}
                  />
                ))
              ) : (
                <div className="el-empty">
                  <p>Empty page</p>
                  <button type="button" className="el-btn el-btn-ghost" onClick={() => addElement("section")}>
                    <Plus size={14} /> Add a section
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="el-panel el-right">
          <div className="el-tabs" role="tablist" aria-label="Inspector">
            <button type="button" role="tab" aria-selected={rightTab === "navigator"} className={rightTab === "navigator" ? "is-active" : undefined} onClick={() => setRightTab("navigator")}>
              <Layers size={13} /> Structure
            </button>
            <button type="button" role="tab" aria-selected={rightTab === "history"} className={rightTab === "history" ? "is-active" : undefined} onClick={() => setRightTab("history")}>
              <Clock size={13} /> History
            </button>
            <button type="button" role="tab" aria-selected={rightTab === "options"} className={rightTab === "options" ? "is-active" : undefined} onClick={() => setRightTab("options")}>
              Options
            </button>
          </div>

          {rightTab === "navigator" ? (
            <div className="el-tree" role="tree">
              {nodes.map((node) => (
                <TreeRow
                  key={node.id}
                  node={node}
                  depth={0}
                  selectedId={selectedId}
                  onSelect={(id) => {
                    setSelectedId(id);
                    setRightTab("options");
                  }}
                  onMove={(id, dir) => commit(moveSibling(nodes, id, dir), "Reorder")}
                  onDup={(id) => commit(duplicateNode(nodes, id), "Duplicate")}
                  onDel={(id) => {
                    commit(removeNode(nodes, id), "Delete element");
                    if (selectedId === id) setSelectedId(null);
                  }}
                />
              ))}
            </div>
          ) : null}

          {rightTab === "history" ? (
            <div className="el-history">
              {!localHistory.length ? <p className="el-hint">Edits and publishes appear here.</p> : null}
              {localHistory.map((h) => (
                <button key={h.id} type="button" className="el-history-row" onClick={() => restoreHistory(h)}>
                  <strong>{h.label}</strong>
                  <small>{new Date(h.at).toLocaleString()}</small>
                </button>
              ))}
            </div>
          ) : null}

          {rightTab === "options" ? (
            <OptionsPane
              node={selected}
              onChange={(patch) => {
                if (!selected) return;
                commit(updateNode(nodes, selected.id, patch), `Edit ${elementLabel(selected.type)}`);
              }}
              onWrapSection={() => {
                if (!selected) return;
                const parent = parentIdOf(nodes, selected.id);
                if (parent) return;
                const wrap = makeNode("section", {}, [cloneNode(selected)]);
                commit(insertNode(removeNode(nodes, selected.id), null, wrap), "Wrap in section");
                setSelectedId(wrap.id);
              }}
            />
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function TreeRow({
  node,
  depth,
  selectedId,
  onSelect,
  onMove,
  onDup,
  onDel,
}: {
  node: StyleNode;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onDup: (id: string) => void;
  onDel: (id: string) => void;
}) {
  return (
    <>
      <div
        className={`el-tree-row${selectedId === node.id ? " is-active" : ""}`}
        style={{ paddingInlineStart: 8 + depth * 12 }}
        role="treeitem"
        aria-selected={selectedId === node.id}
      >
        <button type="button" className="el-tree-label" onClick={() => onSelect(node.id)}>
          {elementLabel(node.type)}
        </button>
        <span className="el-tree-actions">
          <button type="button" aria-label="Move up" onClick={() => onMove(node.id, -1)}>↑</button>
          <button type="button" aria-label="Move down" onClick={() => onMove(node.id, 1)}>↓</button>
          <button type="button" aria-label="Duplicate" onClick={() => onDup(node.id)}>
            <Copy size={11} />
          </button>
          <button type="button" aria-label="Delete" onClick={() => onDel(node.id)}>
            <Trash2 size={11} />
          </button>
        </span>
      </div>
      {node.children.map((child) => (
        <TreeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedId={selectedId}
          onSelect={onSelect}
          onMove={onMove}
          onDup={onDup}
          onDel={onDel}
        />
      ))}
    </>
  );
}

function OptionsPane({
  node,
  onChange,
  onWrapSection,
}: {
  node: StyleNode | null;
  onChange: (patch: Partial<StyleNode["props"]>) => void;
  onWrapSection: () => void;
}) {
  if (!node) {
    return <p className="el-hint">Select a section, column, or widget on the canvas.</p>;
  }
  const p = node.props;
  return (
    <div className="el-options">
      <h3>{elementLabel(node.type)}</h3>
      {p.text !== undefined ? (
        <label>
          <span>Text</span>
          <textarea rows={3} value={p.text} onChange={(e) => onChange({ text: e.target.value })} />
        </label>
      ) : null}
      {p.src !== undefined ? (
        <label>
          <span>Image URL</span>
          <input value={p.src} onChange={(e) => onChange({ src: e.target.value })} placeholder="https://… or /uploads/…" />
        </label>
      ) : null}
      {p.href !== undefined ? (
        <label>
          <span>Link</span>
          <input value={p.href} onChange={(e) => onChange({ href: e.target.value })} />
        </label>
      ) : null}
      {p.columns !== undefined ? (
        <label>
          <span>Columns</span>
          <input type="number" min={2} max={4} value={p.columns} onChange={(e) => onChange({ columns: Number(e.target.value) })} />
        </label>
      ) : null}
      {p.productSource !== undefined ? (
        <label>
          <span>Product source</span>
          <select value={p.productSource} onChange={(e) => onChange({ productSource: e.target.value as StyleNode["props"]["productSource"] })}>
            <option value="item-group">Item groups</option>
            <option value="offers">Offers</option>
            <option value="featured">Featured</option>
          </select>
        </label>
      ) : null}
      {p.productLimit !== undefined ? (
        <label>
          <span>Limit</span>
          <input type="number" min={2} max={24} value={p.productLimit} onChange={(e) => onChange({ productLimit: Number(e.target.value) })} />
        </label>
      ) : null}
      {p.marqueeSpeed !== undefined ? (
        <label>
          <span>Marquee speed</span>
          <input type="number" min={8} max={80} value={p.marqueeSpeed} onChange={(e) => onChange({ marqueeSpeed: Number(e.target.value) })} />
        </label>
      ) : null}
      {p.padding !== undefined ? (
        <label>
          <span>Padding</span>
          <input type="number" min={0} max={80} value={p.padding} onChange={(e) => onChange({ padding: Number(e.target.value) })} />
        </label>
      ) : null}
      {p.gap !== undefined ? (
        <label>
          <span>Gap</span>
          <input type="number" min={0} max={48} value={p.gap} onChange={(e) => onChange({ gap: Number(e.target.value) })} />
        </label>
      ) : null}
      {p.fontSize !== undefined ? (
        <label>
          <span>Font size</span>
          <input type="number" min={10} max={48} value={p.fontSize} onChange={(e) => onChange({ fontSize: Number(e.target.value) })} />
        </label>
      ) : null}
      {p.bg !== undefined ? (
        <label>
          <span>Background</span>
          <input type="color" value={safeColor(p.bg)} onChange={(e) => onChange({ bg: e.target.value })} />
        </label>
      ) : null}
      {p.color !== undefined ? (
        <label>
          <span>Color</span>
          <input type="color" value={safeColor(p.color, "#12211a")} onChange={(e) => onChange({ color: e.target.value })} />
        </label>
      ) : null}
      {p.align !== undefined ? (
        <label>
          <span>Align</span>
          <select value={p.align} onChange={(e) => onChange({ align: e.target.value as StyleNode["props"]["align"] })}>
            <option value="start">Start</option>
            <option value="center">Center</option>
            <option value="end">End</option>
          </select>
        </label>
      ) : null}
      <fieldset className="el-vis">
        <legend>Visibility</legend>
        <label><input type="checkbox" checked={Boolean(p.hiddenMobile)} onChange={(e) => onChange({ hiddenMobile: e.target.checked })} /> Hide on mobile</label>
        <label><input type="checkbox" checked={Boolean(p.hiddenTablet)} onChange={(e) => onChange({ hiddenTablet: e.target.checked })} /> Hide on tablet</label>
        <label><input type="checkbox" checked={Boolean(p.hiddenDesktop)} onChange={(e) => onChange({ hiddenDesktop: e.target.checked })} /> Hide on desktop</label>
      </fieldset>
      {node.type !== "section" ? (
        <button type="button" className="el-btn el-btn-ghost" onClick={onWrapSection}>
          Wrap in section
        </button>
      ) : null}
    </div>
  );
}

function safeColor(value?: string, fallback = "#f7faf7"): string {
  if (value && /^#[0-9a-fA-F]{6}$/.test(value)) return value;
  if (value === "transparent") return fallback;
  return fallback;
}

function CanvasNode({
  node,
  selectedId,
  viewport,
  banners,
  onSelect,
}: {
  node: StyleNode;
  selectedId: string | null;
  viewport: StyleViewport;
  banners: BannerPreview[];
  onSelect: (id: string) => void;
}) {
  if (isHiddenOnViewport(node, viewport)) {
    return null;
  }
  const active = selectedId === node.id;
  const p = node.props;
  const cols = viewport === "mobile" ? 1 : Math.min(4, Math.max(1, p.columns ?? (node.children.length || 1)));

  return (
    <div
      className={`el-node is-${node.type}${active ? " is-selected" : ""}`}
      data-type={node.type}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
      style={{
        padding: node.type === "spacer" ? `${p.padding ?? 24}px 0` : p.padding,
        background: p.bg && p.bg !== "transparent" ? p.bg : undefined,
        color: p.color,
        textAlign: p.align,
        gap: p.gap,
      }}
    >
      <span className="el-node-tag">{elementLabel(node.type)}</span>
      {renderWidget(node, viewport, banners, cols)}
      {canHaveChildren(node.type) && node.type !== "columns"
        ? node.children.map((child) => (
            <CanvasNode key={child.id} node={child} selectedId={selectedId} viewport={viewport} banners={banners} onSelect={onSelect} />
          ))
        : null}
      {node.type === "columns" ? (
        <div className="el-columns" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: p.gap ?? 12 }}>
          {node.children.map((child) => (
            <CanvasNode key={child.id} node={child} selectedId={selectedId} viewport={viewport} banners={banners} onSelect={onSelect} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function renderWidget(node: StyleNode, viewport: StyleViewport, banners: BannerPreview[], _cols: number) {
  const p = node.props;
  switch (node.type) {
    case "heading":
      return <h2 style={{ fontSize: p.fontSize, color: p.color, margin: 0 }}>{p.text}</h2>;
    case "text":
      return <p style={{ fontSize: p.fontSize, color: p.color, margin: 0 }}>{p.text}</p>;
    case "image":
      return p.src ? <img src={p.src} alt={p.alt || ""} className="el-img" /> : (
        <div className="el-img-ph"><ImageIcon size={22} /> Image</div>
      );
    case "button":
      return (
        <span className="el-cta" style={{ background: p.bg, color: p.color }}>
          {p.text}
        </span>
      );
    case "spacer":
      return <span className="el-spacer-line" />;
    case "marquee":
      return (
        <div className="el-marquee" style={{ background: p.bg, color: p.color }}>
          <div className="el-marquee-track" style={{ animationDuration: `${p.marqueeSpeed ?? 32}s` }}>
            <span>{p.text}</span>
            <span>{p.text}</span>
          </div>
        </div>
      );
    case "banner-hero":
    case "banner-side":
    case "banner-below":
    case "banner-bottom":
    case "banner-popup":
      return <BannerMock type={node.type} viewport={viewport} banners={banners} />;
    case "categories":
      return (
        <div className="el-cats">
          {DEMO_CATEGORIES.map((c) => (
            <div key={c} className="el-cat">
              <i />
              <span>{c}</span>
            </div>
          ))}
        </div>
      );
    case "products":
      return (
        <div className="el-prods">
          {DEMO_PRODUCTS.slice(0, p.productLimit ?? 6).map((prod) => (
            <article key={prod.name} className="el-prod">
              <div className="el-prod-img" />
              <strong>{prod.name}</strong>
              <span>{prod.price} QAR</span>
            </article>
          ))}
        </div>
      );
    case "flyer":
      return (
        <div className="el-flyer">
          <strong>Weekly flyer</strong>
          <span>Open the latest catalogue</span>
        </div>
      );
    default:
      return null;
  }
}

function BannerMock({
  type,
  viewport,
  banners,
}: {
  type: StyleNodeType;
  viewport: StyleViewport;
  banners: BannerPreview[];
}) {
  const map: Record<string, string> = {
    "banner-hero": "Top",
    "banner-side": "Side",
    "banner-below": "Below Slider",
    "banner-bottom": "Bottom",
    "banner-popup": "Popup",
  };
  const kind = map[type] ?? "Top";
  const slides = banners.filter((b) => String(b.type) === kind && b.status !== 0).slice(0, type === "banner-hero" ? 3 : 4);
  const ratio =
    type === "banner-popup"
      ? "4 / 3"
      : type === "banner-hero"
        ? viewport === "desktop"
          ? "14 / 5"
          : "2 / 1"
        : type === "banner-side"
          ? "3 / 4"
          : "16 / 7";
  return (
    <div className={`el-banner is-${type}`}>
      <div className="el-banner-pills">
        {kind}
        <em>{slides.length || "sample"}</em>
      </div>
      <div className="el-banner-track" data-type={type}>
        {(slides.length ? slides : [{ title: `${kind} banner` }]).map((slide, i) => (
          <div key={`${kind}-${i}`} className="el-banner-slide" style={{ aspectRatio: ratio }}>
            {slide.image_url || slide.image ? (
              <img src={String(slide.image_url || slide.image)} alt="" />
            ) : (
              <span>{slide.title || kind}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
