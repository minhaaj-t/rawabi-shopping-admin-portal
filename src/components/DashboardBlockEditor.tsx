import {
  DB_METRIC_WIDGETS,
} from "../lib/dashboard-metrics";
import {
  SHORTCUT_PRESETS,
  type DashboardBlock,
} from "../lib/dashboard-layout";

const CHART_TYPES = new Set(["chart_sales", "chart_volume", "donut_status", "stack_status"]);
const SPANNABLE = new Set([
  "kpi_stat",
  "chart_sales",
  "chart_volume",
  "donut_status",
  "stack_status",
  "top_products",
  "revenue_by_status",
  "recent_orders",
]);

type Props = {
  block: DashboardBlock;
  onUpdateBlock: (patch: Partial<DashboardBlock>) => void;
  onUpdateSettings: (patch: Record<string, unknown>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
};

function shortcutLinks(block: DashboardBlock) {
  return Array.isArray(block.settings.links)
    ? (block.settings.links as Array<{ label: string; to: string }>)
    : [];
}

export function DashboardBlockEditor({
  block,
  onUpdateBlock,
  onUpdateSettings,
  onDuplicate,
  onRemove,
}: Props) {
  function updateShortcutLinks(links: Array<{ label: string; to: string }>) {
    onUpdateSettings({ links });
  }

  return (
    <div className="dash-el-block-editor" onClick={(e) => e.stopPropagation()}>
      <div className="dash-el-block-editor-head">
        <strong>Edit block</strong>
        <span className="muted">{block.type.replace(/_/g, " ")}</span>
      </div>

      <label className="pf-field pf-check-row">
        <input
          type="checkbox"
          checked={block.enabled}
          onChange={(e) => onUpdateBlock({ enabled: e.target.checked })}
        />
        <span>Enabled</span>
      </label>

      {SPANNABLE.has(block.type) ? (
        <label className="pf-field">
          <span className="pf-label">Width</span>
          <select
            value={Number(block.settings.span ?? (block.type.includes("chart") ? 1 : 2))}
            onChange={(e) => onUpdateSettings({ span: Number(e.target.value) })}
          >
            <option value={1}>Half row</option>
            <option value={2}>Full row</option>
          </select>
        </label>
      ) : null}

      {CHART_TYPES.has(block.type) ? (
        <>
          <label className="pf-field">
            <span className="pf-label">Title</span>
            <input
              value={String(block.settings.title ?? "")}
              onChange={(e) => onUpdateSettings({ title: e.target.value })}
              placeholder="Optional custom title"
            />
          </label>
          <label className="pf-field">
            <span className="pf-label">Chart height (px)</span>
            <input
              type="number"
              min={80}
              max={320}
              value={Number(block.settings.height ?? 180)}
              onChange={(e) => onUpdateSettings({ height: Number(e.target.value) })}
            />
          </label>
        </>
      ) : null}

      {block.type === "heading" ? (
        <>
          <label className="pf-field">
            <span className="pf-label">Title</span>
            <input
              value={String(block.settings.title ?? "")}
              onChange={(e) => onUpdateSettings({ title: e.target.value })}
            />
          </label>
          <label className="pf-field">
            <span className="pf-label">Subtitle</span>
            <input
              value={String(block.settings.subtitle ?? "")}
              onChange={(e) => onUpdateSettings({ subtitle: e.target.value })}
            />
          </label>
        </>
      ) : null}

      {block.type === "kpi_stat" ? (
        <>
          <label className="pf-field">
            <span className="pf-label">Database metric</span>
            <select
              value={String(block.settings.metric ?? "sales")}
              onChange={(e) => onUpdateSettings({ metric: e.target.value })}
            >
              {DB_METRIC_WIDGETS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="pf-field">
            <span className="pf-label">Title override</span>
            <input
              value={String(block.settings.title ?? "")}
              onChange={(e) => onUpdateSettings({ title: e.target.value })}
              placeholder="Optional"
            />
          </label>
        </>
      ) : null}

      {block.type === "kpi_row" ? (
        <div className="pf-field">
          <span className="pf-label">Metrics</span>
          <div className="dash-metric-checks">
            {DB_METRIC_WIDGETS.map((m) => {
              const metrics = Array.isArray(block.settings.metrics)
                ? (block.settings.metrics as string[])
                : [];
              const on = metrics.includes(m.value);
              return (
                <label key={m.value} className="pf-check">
                  <span>{m.label}</span>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => {
                      const next = on
                        ? metrics.filter((x) => x !== m.value)
                        : [...metrics, m.value];
                      onUpdateSettings({ metrics: next });
                    }}
                  />
                </label>
              );
            })}
          </div>
        </div>
      ) : null}

      {(block.type === "top_products" ||
        block.type === "revenue_by_status" ||
        block.type === "recent_orders") && (
        <label className="pf-field">
          <span className="pf-label">Title</span>
          <input
            value={String(block.settings.title ?? "")}
            onChange={(e) => onUpdateSettings({ title: e.target.value })}
            placeholder="Optional custom title"
          />
        </label>
      )}

      {block.type === "top_products" || block.type === "recent_orders" ? (
        <label className="pf-field">
          <span className="pf-label">Limit</span>
          <input
            type="number"
            min={1}
            max={50}
            value={Number(block.settings.limit ?? 8)}
            onChange={(e) => onUpdateSettings({ limit: Number(e.target.value) })}
          />
        </label>
      ) : null}

      {block.type === "spacer" ? (
        <label className="pf-field">
          <span className="pf-label">Height (px)</span>
          <input
            type="number"
            min={4}
            max={120}
            value={Number(block.settings.height ?? 16)}
            onChange={(e) => onUpdateSettings({ height: Number(e.target.value) })}
          />
        </label>
      ) : null}

      {block.type === "shortcuts" ? (
        <div className="pf-field">
          <span className="pf-label">Quick links</span>
          <div className="dash-shortcuts-editor">
            {shortcutLinks(block).map((link, idx) => (
              <div className="dash-shortcut-row-edit" key={`${link.to}-${idx}`}>
                <input
                  value={link.label}
                  placeholder="Label"
                  onChange={(e) => {
                    const links = [...shortcutLinks(block)];
                    links[idx] = { ...links[idx], label: e.target.value };
                    updateShortcutLinks(links);
                  }}
                />
                <input
                  value={link.to}
                  placeholder="/path"
                  onChange={(e) => {
                    const links = [...shortcutLinks(block)];
                    links[idx] = { ...links[idx], to: e.target.value };
                    updateShortcutLinks(links);
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const links = shortcutLinks(block).filter((_, i) => i !== idx);
                    updateShortcutLinks(links);
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
            <div className="dash-shortcut-add-row">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() =>
                  updateShortcutLinks([
                    ...shortcutLinks(block),
                    { label: "New link", to: "/orders" },
                  ])
                }
              >
                Add link
              </button>
              <select
                defaultValue=""
                onChange={(e) => {
                  const preset = SHORTCUT_PRESETS.find((p) => p.to === e.target.value);
                  if (preset) {
                    updateShortcutLinks([...shortcutLinks(block), preset]);
                  }
                  e.target.value = "";
                }}
              >
                <option value="">Add preset…</option>
                {SHORTCUT_PRESETS.map((p) => (
                  <option key={p.to} value={p.to}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ) : null}

      <div className="dash-block-inspector-actions">
        <button type="button" className="btn btn-secondary btn-sm" onClick={onDuplicate}>
          Duplicate
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onRemove}>
          Remove
        </button>
      </div>
    </div>
  );
}
