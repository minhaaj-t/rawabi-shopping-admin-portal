import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Trash2,
} from "../lib/icons";
import { memo } from "react";
import { DashboardBlockEditor } from "./DashboardBlockEditor";
import { DashboardBlockView, type DashData } from "./DashboardBlockCanvas";
import type { DashExtra } from "../lib/dashboard-metrics";
import {
  blockLabel,
  blockSpanClass,
  duplicateBlock,
  getDndMimeType,
  parseDragWidget,
  type DashboardBlock,
  type WidgetCatalogItem,
} from "../lib/dashboard-layout";
import { getStoredLocale } from "../lib/i18n";
import { LoadingIndicator } from "./LoadingIndicator";

type Props = {
  blocks: DashboardBlock[];
  catalog: WidgetCatalogItem[];
  selectedId: string | null;
  previewData: DashData | null;
  previewExtra: DashExtra;
  onSelect: (id: string | null) => void;
  onBlocksChange: (blocks: DashboardBlock[]) => void;
  onInsertAt: (blockType: string, preset: Record<string, unknown>, index: number) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onUpdateBlock: (id: string, patch: Partial<DashboardBlock>) => void;
  onUpdateSettings: (id: string, patch: Record<string, unknown>) => void;
};

export function DashboardBuilderCanvas({
  blocks,
  catalog,
  selectedId,
  previewData,
  previewExtra,
  onSelect,
  onBlocksChange,
  onInsertAt,
  onMove,
  onUpdateBlock,
  onUpdateSettings,
}: Props) {
  const dndType = getDndMimeType();

  function allowDrop(e: React.DragEvent) {
    e.preventDefault();
  }

  function insertFromTransfer(e: React.DragEvent, index: number) {
    e.preventDefault();
    const parsed = parseDragWidget(e.dataTransfer.getData(dndType));
    if (parsed) {
      onInsertAt(parsed.blockType, parsed.preset, index);
      return true;
    }
    const blockId = e.dataTransfer.getData("application/x-rawabi-dash-block");
    if (!blockId) return false;
    const from = blocks.findIndex((b) => b.id === blockId);
    if (from < 0) return false;
    const next = [...blocks];
    const [item] = next.splice(from, 1);
    const target = from < index ? index - 1 : index;
    next.splice(Math.max(0, Math.min(target, next.length)), 0, item);
    onBlocksChange(next);
    return true;
  }

  return (
    <div
      className="dash-el-canvas-wrap"
      onDragOver={allowDrop}
      onDrop={(e) => {
        if (!insertFromTransfer(e, blocks.length)) return;
      }}
    >
      {!blocks.length ? (
        <div
          className="dash-el-empty"
          onDragOver={allowDrop}
          onDrop={(e) => insertFromTransfer(e, 0)}
        >
          <p><strong>Drop widgets here</strong></p>
          <p className="muted">Drag database stats, charts, and tables from the left panel</p>
        </div>
      ) : (
        <div className="dash-el-grid chart-grid">
          {blocks.map((block, index) => (
            <CanvasBlock
              key={block.id}
              block={block}
              label={blockLabel(block, catalog)}
              selected={selectedId === block.id}
              previewData={previewData}
              previewExtra={previewExtra}
              onSelect={() => onSelect(block.id)}
              onMoveUp={() => onMove(block.id, -1)}
              onMoveDown={() => onMove(block.id, 1)}
              onToggle={() => onUpdateBlock(block.id, { enabled: !block.enabled })}
              onDuplicate={() => {
                const copy = duplicateBlock(block);
                const next = [...blocks];
                next.splice(index + 1, 0, copy);
                onBlocksChange(next);
                onSelect(copy.id);
              }}
              onRemove={() => {
                if (!confirm("Remove this block?")) return;
                onBlocksChange(blocks.filter((b) => b.id !== block.id));
                if (selectedId === block.id) onSelect(null);
              }}
              onUpdateBlock={(patch) => onUpdateBlock(block.id, patch)}
              onUpdateSettings={(patch) => onUpdateSettings(block.id, patch)}
              onDragStart={(e) => {
                e.dataTransfer.setData("application/x-rawabi-dash-block", block.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={allowDrop}
              onDrop={(e) => insertFromTransfer(e, index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const BlockLivePreview = memo(function BlockLivePreview({
  block,
  previewData,
  previewExtra,
}: {
  block: DashboardBlock;
  previewData: DashData;
  previewExtra: DashExtra;
}) {
  const locale = getStoredLocale();
  return (
    <div className="dash-el-live-preview">
      <DashboardBlockView block={block} data={previewData} extra={previewExtra} locale={locale} />
    </div>
  );
});

function CanvasBlock({
  block,
  label,
  selected,
  previewData,
  previewExtra,
  onSelect,
  onMoveUp,
  onMoveDown,
  onToggle,
  onDuplicate,
  onRemove,
  onUpdateBlock,
  onUpdateSettings,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  block: DashboardBlock;
  label: string;
  selected: boolean;
  previewData: DashData | null;
  previewExtra: DashExtra;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggle: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onUpdateBlock: (patch: Partial<DashboardBlock>) => void;
  onUpdateSettings: (patch: Record<string, unknown>) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  const span = blockSpanClass(
    block,
    !["chart_sales", "chart_volume", "donut_status", "stack_status", "kpi_stat"].includes(block.type),
  );

  return (
    <div
      className={`dash-el-block ${span}${selected ? " is-selected" : ""}${block.enabled ? "" : " is-off"}`}
      onClick={onSelect}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect();
      }}
    >
      <div className="dash-el-block-bar" onClick={(e) => e.stopPropagation()}>
        <GripVertical size={14} className="dash-drag-handle" />
        <span className="dash-el-block-title">{label}</span>
        <span className="dash-el-block-type">{block.type}</span>
        <div className="dash-el-block-tools">
          <button type="button" className="icon-btn" title="Up" onClick={onMoveUp}><ArrowUp size={13} /></button>
          <button type="button" className="icon-btn" title="Down" onClick={onMoveDown}><ArrowDown size={13} /></button>
          <button type="button" className="icon-btn" title="Toggle" onClick={onToggle}>
            {block.enabled ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>
          <button type="button" className="icon-btn" title="Duplicate" onClick={onDuplicate}><Copy size={13} /></button>
          <button type="button" className="icon-btn" title="Remove" onClick={onRemove}><Trash2 size={13} /></button>
        </div>
      </div>
      <div className="dash-el-block-preview">
        {previewData ? (
          <BlockLivePreview block={block} previewData={previewData} previewExtra={previewExtra} />
        ) : (
          <div className="dash-el-preview-loading"><LoadingIndicator label="Loading live preview" size="sm" /></div>
        )}
        {selected ? (
          <DashboardBlockEditor
            block={block}
            onUpdateBlock={onUpdateBlock}
            onUpdateSettings={onUpdateSettings}
            onDuplicate={onDuplicate}
            onRemove={onRemove}
          />
        ) : null}
      </div>
    </div>
  );
}

export function DraggableLibraryItem({
  item,
  onAdd,
}: {
  item: { blockType: string; preset?: Record<string, unknown>; label: string; description: string };
  onAdd: () => void;
}) {
  const dndType = getDndMimeType();

  return (
    <div
      className="dash-catalog-item dash-catalog-draggable"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(
          dndType,
          JSON.stringify({ blockType: item.blockType, preset: item.preset ?? {}, label: item.label }),
        );
        e.dataTransfer.effectAllowed = "copy";
      }}
      onClick={onAdd}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onAdd();
      }}
    >
      <GripVertical size={12} className="dash-catalog-grip" aria-hidden />
      <div className="dash-catalog-item-copy">
        <strong>{item.label}</strong>
        <span>{item.description}</span>
      </div>
    </div>
  );
}
