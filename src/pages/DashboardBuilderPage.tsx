import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Eye,
  Layers,
  Search,
  Users,
} from "../lib/icons";
import { adminApi } from "../lib/api";
import { DashboardAssignModal } from "../components/DashboardAssignModal";
import { DashboardBlockCanvas, type DashData } from "../components/DashboardBlockCanvas";
import { DashboardBuilderCanvas, DraggableLibraryItem } from "../components/DashboardBuilderCanvas";
import { PeriodCalendarPicker, initialPeriodValue, periodParams, type PeriodValue } from "../components/PeriodCalendarPicker";
import type { DashExtra } from "../lib/dashboard-metrics";
import { LoadingIndicator } from "../components/LoadingIndicator";
import {
  WIDGET_CATEGORIES,
  buildLibraryItems,
  makeBlock,
  normalizeLayout,
  type DashboardBlock,
  type DashboardLayout,
  type LibraryDragItem,
  type WidgetCatalogItem,
} from "../lib/dashboard-layout";

type BuilderMode = "build" | "preview";

export function DashboardBuilderPage() {
  const { id } = useParams();
  const dashId = Number(id);
  const [layout, setLayout] = useState<DashboardLayout | null>(null);
  const [catalog, setCatalog] = useState<WidgetCatalogItem[]>([]);
  const [blocks, setBlocks] = useState<DashboardBlock[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<BuilderMode>("build");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDesc, setMetaDesc] = useState("");
  const [metaStatus, setMetaStatus] = useState(1);
  const [metaDefault, setMetaDefault] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [previewData, setPreviewData] = useState<DashData | null>(null);
  const [previewExtra, setPreviewExtra] = useState<DashExtra>({
    customerTotal: 0,
    productTotal: 0,
    preOrderTotal: 0,
    cartTotal: 0,
    categoryTotal: 0,
    brandTotal: 0,
  });
  const [previewRange, setPreviewRange] = useState<PeriodValue>(() => initialPeriodValue());
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!dashId) return;
    setError("");
    try {
      const [raw, cat] = await Promise.all([
        adminApi.dashboardLayout(dashId),
        adminApi.dashboardLayoutCatalog(),
      ]);
      const normalized = normalizeLayout(raw as Record<string, unknown>);
      setLayout(normalized);
      setBlocks(normalized?.blocks ?? []);
      setCatalog(cat);
      setMetaTitle(normalized?.title ?? "");
      setMetaDesc(normalized?.description ?? "");
      setMetaStatus(normalized?.status ?? 1);
      setMetaDefault(Boolean(normalized?.is_default));
      setSelectedId(normalized?.blocks?.[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load builder");
    }
  }, [dashId]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadPreview = useCallback(async () => {
    try {
      const [dash, products, customers, preOrders, carts, brands, categories] = await Promise.all([
        adminApi.dashboard(periodParams(previewRange)),
        adminApi.products({ per_page: 1, page: 1 }),
        adminApi.customers({ per_page: 1, page: 1 }),
        adminApi.preOrders({ per_page: 1, page: 1 }),
        adminApi.carts({ per_page: 1, page: 1 }),
        adminApi.brands({ per_page: 1, page: 1 }),
        adminApi.categories(),
      ]);
      setPreviewData(dash);
      setPreviewExtra({
        productTotal: products.total,
        customerTotal: customers.total,
        preOrderTotal: preOrders.total,
        cartTotal: carts.total,
        brandTotal: brands.total,
        categoryTotal: categories.length,
      });
    } catch {
      setPreviewData(null);
    }
  }, [previewRange]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const libraryItems = useMemo(() => buildLibraryItems(catalog), [catalog]);

  const catalogGrouped = useMemo(() => {
    const q = catalogQuery.trim().toLowerCase();
    const filtered = libraryItems.filter(
      (w) =>
        !q ||
        w.label.toLowerCase().includes(q) ||
        w.type.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q),
    );
    const groups = new Map<string, LibraryDragItem[]>();
    for (const w of filtered) {
      const cat = w.category || "other";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(w);
    }
    return groups;
  }, [libraryItems, catalogQuery]);

  function updateBlock(id: string, patch: Partial<DashboardBlock>) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function updateSettings(id: string, patch: Record<string, unknown>) {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, settings: { ...b.settings, ...patch } } : b)),
    );
  }

  function move(id: string, dir: -1 | 1) {
    setBlocks((prev) => {
      const i = prev.findIndex((b) => b.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function insertWidget(blockType: string, preset: Record<string, unknown>, index?: number) {
    const block = makeBlock(blockType, preset);
    if (index !== undefined) {
      setBlocks((prev) => [...prev.slice(0, index), block, ...prev.slice(index)]);
    } else if (selectedId) {
      const idx = blocks.findIndex((b) => b.id === selectedId);
      setBlocks((prev) => [...prev.slice(0, idx + 1), block, ...prev.slice(idx + 1)]);
    } else {
      setBlocks((prev) => [...prev, block]);
    }
    setSelectedId(block.id);
  }

  function addWidget(blockType: string, preset?: Record<string, unknown>) {
    insertWidget(blockType, preset ?? {});
  }

  function clearBlocks() {
    if (!blocks.length || !confirm("Remove all blocks from this layout?")) return;
    setBlocks([]);
    setSelectedId(null);
  }

  async function save() {
    if (!dashId) return;
    setBusy(true);
    setMsg("");
    try {
      await adminApi.updateDashboardLayout(dashId, {
        title: metaTitle.trim() || layout?.title,
        description: metaDesc.trim(),
        status: metaStatus,
        is_default: metaDefault,
        blocks,
      });
      setMsg("Layout published.");
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!dashId || !confirm("Reset to default Rawabi ops widgets?")) return;
    setBusy(true);
    try {
      await adminApi.resetDashboardLayout(dashId);
      await load();
      setMsg("Reset to default blocks.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!layout) return <LoadingIndicator label="Loading builder" padded />;

  return (
    <div className="page dash-builder-page">
      <header className="page-head">
        <div>
          <p className="settings-crumb">
            <Link to="/dashboards">Dashboards</Link> · Builder
          </p>
          <h1 className="page-title">{metaTitle || layout.title}</h1>
          <p className="page-sub">Build widgets, assign users, preview, and publish.</p>
        </div>
        <div className="page-head-actions">
          <div className="dash-builder-mode-tabs">
            <button
              type="button"
              className={`btn btn-secondary btn-sm${mode === "build" ? " is-active" : ""}`}
              onClick={() => setMode("build")}
            >
              <Layers size={14} /> Build
            </button>
            <button
              type="button"
              className={`btn btn-secondary btn-sm${mode === "preview" ? " is-active" : ""}`}
              onClick={() => setMode("preview")}
            >
              <Eye size={14} /> Preview
            </button>
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => setAssignOpen(true)}>
            <Users size={14} /> Assign
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => void reset()} disabled={busy}>
            Reset default
          </button>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void save()}>
            {busy ? "Publishing…" : "Publish layout"}
          </button>
        </div>
      </header>

      {msg ? <p className={msg.includes("fail") ? "error" : "muted"}>{msg}</p> : null}

      {mode === "preview" ? (
        <div className="card dash-builder-preview">
          <div className="dash-builder-preview-head">
            <p className="muted">Live preview with current unpublished blocks</p>
            <PeriodCalendarPicker
              value={previewRange}
              label={previewData?.period_label}
              onChange={setPreviewRange}
            />
          </div>
          {!previewData ? (
            <LoadingIndicator label="Loading preview data" padded />
          ) : (
            <div className="chart-grid dash-runtime-grid">
              <DashboardBlockCanvas blocks={blocks} data={previewData} extra={previewExtra} />
            </div>
          )}
        </div>
      ) : (
        <div className="dash-builder-shell">
          <aside className="dash-builder-catalog card">
            <h3>Components</h3>
            <p className="muted">Drag onto canvas or click to add</p>
            <div className="dash-catalog-search">
              <Search size={14} />
              <input
                value={catalogQuery}
                onChange={(e) => setCatalogQuery(e.target.value)}
                placeholder="Search database blocks…"
              />
            </div>
            <div className="dash-catalog-list">
              {[...catalogGrouped.entries()].map(([cat, items]) => (
                <div key={cat} className="dash-catalog-group">
                  <h4>{WIDGET_CATEGORIES[cat] ?? cat}</h4>
                  {items.map((w) => (
                    <DraggableLibraryItem
                      key={w.type}
                      item={w}
                      onAdd={() => addWidget(w.blockType, w.preset)}
                    />
                  ))}
                </div>
              ))}
              {!catalogGrouped.size ? <p className="muted">No widgets match your search.</p> : null}
            </div>
          </aside>

          <section className="dash-builder-canvas card dash-builder-visual">
            <div className="dash-canvas-toolbar">
              <h3>Canvas · {blocks.length} blocks</h3>
              <div className="dash-canvas-tools">
                <button type="button" className="btn btn-secondary btn-sm" disabled={!blocks.length} onClick={clearBlocks}>
                  Clear all
                </button>
              </div>
            </div>
            <DashboardBuilderCanvas
              blocks={blocks}
              catalog={catalog}
              selectedId={selectedId}
              previewData={previewData}
              previewExtra={previewExtra}
              onSelect={setSelectedId}
              onBlocksChange={setBlocks}
              onInsertAt={insertWidget}
              onMove={move}
              onUpdateBlock={updateBlock}
              onUpdateSettings={updateSettings}
            />
          </section>

          <aside className="dash-builder-inspector card">
            <h3>Dashboard</h3>
            <div className="dash-inspector-fields">
              <label className="pf-field">
                <span className="pf-label">Title</span>
                <input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} />
              </label>
              <label className="pf-field">
                <span className="pf-label">Description</span>
                <textarea rows={3} value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} />
              </label>
              <label className="pf-field">
                <span className="pf-label">Slug</span>
                <input value={layout.slug} readOnly />
              </label>
              <label className="pf-field">
                <span className="pf-label">Status</span>
                <select value={metaStatus} onChange={(e) => setMetaStatus(Number(e.target.value))}>
                  <option value={1}>Active</option>
                  <option value={0}>Inactive</option>
                </select>
              </label>
              <label className="pf-field pf-check-row">
                <input
                  type="checkbox"
                  checked={metaDefault}
                  onChange={(e) => setMetaDefault(e.target.checked)}
                />
                <span>Default dashboard</span>
              </label>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAssignOpen(true)}>
                Manage assignments
              </button>
            </div>
          </aside>
        </div>
      )}

      {assignOpen && layout ? (
        <DashboardAssignModal
          layout={{ ...layout, title: metaTitle || layout.title }}
          onClose={() => setAssignOpen(false)}
          onSaved={() => void load()}
        />
      ) : null}
    </div>
  );
}
