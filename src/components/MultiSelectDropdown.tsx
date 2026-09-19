import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "../lib/icons";

export type MultiSelectOption = {
  value: number | string;
  label: string;
  /** When this option is toggled on/off, these IDs follow the same state (e.g. select all children). */
  alsoToggle?: number[];
};

type Props = {
  options: MultiSelectOption[];
  value: number[];
  onChange: (next: number[]) => void;
  placeholder?: string;
  id?: string;
  /** Show a filter input when options exceed this count (default 8). Set 0 to always hide. */
  searchWhenOver?: number;
  emptyMessage?: string;
};

type PanelPos = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

export function MultiSelectDropdown({
  options,
  value,
  onChange,
  placeholder = "Select…",
  id,
  searchWhenOver = 8,
  emptyMessage = "No options available",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [panelPos, setPanelPos] = useState<PanelPos | null>(null);

  const optionMap = useMemo(() => {
    const map = new Map<number, MultiSelectOption>();
    for (const o of options) {
      map.set(Number(o.value), o);
    }
    return map;
  }, [options]);

  /** Selected chips — keep orphan IDs so deleted attrs remain removable. */
  const selected = useMemo(() => {
    return value.map((idNum) => {
      const found = optionMap.get(idNum);
      return found ?? { value: idNum, label: `Unknown #${idNum}` };
    });
  }, [optionMap, value]);

  const panelOptions = useMemo(() => {
    const known = new Set(options.map((o) => Number(o.value)));
    const orphans = value
      .filter((idNum) => !known.has(idNum))
      .map((idNum) => ({ value: idNum, label: `Unknown #${idNum}` }));
    return [...orphans, ...options];
  }, [options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return panelOptions;
    return panelOptions.filter((o) => o.label.toLowerCase().includes(q));
  }, [panelOptions, query]);

  const showSearch = searchWhenOver > 0 && panelOptions.length >= searchWhenOver;

  function updatePanelPos() {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const margin = 8;
    const preferredHeight = 280;
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(preferredHeight, openUp ? spaceAbove : spaceBelow);
    const top = openUp ? rect.top - maxHeight - 4 : rect.bottom + 4;

    setPanelPos({
      top: Math.max(margin, top),
      left: rect.left,
      width: rect.width,
      maxHeight: Math.max(140, maxHeight),
    });
  }

  useLayoutEffect(() => {
    if (!open) {
      setPanelPos(null);
      return;
    }
    updatePanelPos();
    window.addEventListener("resize", updatePanelPos);
    window.addEventListener("scroll", updatePanelPos, true);
    return () => {
      window.removeEventListener("resize", updatePanelPos);
      window.removeEventListener("scroll", updatePanelPos, true);
    };
  }, [open, filtered.length, showSearch]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    function onDocMouseDown(e: MouseEvent) {
      const el = e.target as Node;
      if (rootRef.current?.contains(el) || panelRef.current?.contains(el)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function relatedIds(idNum: number): number[] {
    const opt = optionMap.get(idNum);
    const extras = (opt?.alsoToggle ?? [])
      .map((n) => Number(n))
      .filter((n) => n > 0 && n !== idNum);
    return [idNum, ...extras];
  }

  function toggle(idNum: number) {
    const related = relatedIds(idNum);
    const turningOn = !value.includes(idNum);
    if (turningOn) {
      onChange([...new Set([...value, ...related])]);
    } else {
      const drop = new Set(related);
      onChange(value.filter((x) => !drop.has(x)));
    }
  }

  function remove(idNum: number, e: ReactMouseEvent) {
    e.stopPropagation();
    const drop = new Set(relatedIds(idNum));
    onChange(value.filter((x) => !drop.has(x)));
  }

  const panel =
    open && panelPos
      ? createPortal(
          <div
            ref={panelRef}
            className="multi-select-panel multi-select-panel-portal"
            role="listbox"
            aria-multiselectable="true"
            style={{
              position: "fixed",
              top: panelPos.top,
              left: panelPos.left,
              width: panelPos.width,
              maxHeight: panelPos.maxHeight,
              zIndex: 80,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {showSearch ? (
              <div className="multi-select-search" style={{ padding: "6px 8px", borderBottom: "1px solid var(--border, #e5e7eb)" }}>
                <input
                  ref={searchRef}
                  type="search"
                  className="multi-select-search-input"
                  placeholder="Search…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ width: "100%", boxSizing: "border-box" }}
                />
              </div>
            ) : null}
            <div style={{ overflow: "auto", flex: 1 }}>
              {filtered.length === 0 ? (
                <div className="multi-select-empty" style={{ padding: "10px 12px", opacity: 0.7 }}>
                  {panelOptions.length === 0 ? emptyMessage : "No matches"}
                </div>
              ) : (
                filtered.map((o) => {
                  const idNum = Number(o.value);
                  const on = value.includes(idNum);
                  return (
                    <div
                      key={o.value}
                      role="option"
                      aria-selected={on}
                      className={`multi-select-option${on ? " is-selected" : ""}`}
                      onClick={() => toggle(idNum)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggle(idNum);
                        }
                      }}
                      tabIndex={0}
                    >
                      <span>{o.label}</span>
                      <input type="checkbox" readOnly tabIndex={-1} checked={on} aria-hidden />
                    </div>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="multi-select-dropdown" ref={rootRef}>
      {selected.length ? (
        <div className="multi-select-chips" aria-label="Selected tags">
          {selected.map((o) => {
            const idNum = Number(o.value);
            return (
              <span key={o.value} className="multi-select-chip">
                {o.label}
                <button
                  type="button"
                  className="multi-select-chip-remove"
                  aria-label={`Remove ${o.label}`}
                  onClick={(e) => remove(idNum, e)}
                >
                  <X size={12} />
                </button>
              </span>
            );
          })}
        </div>
      ) : null}
      <button
        type="button"
        id={id}
        ref={triggerRef}
        className={`multi-select-trigger${open ? " is-open" : ""}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="multi-select-trigger-text">
          {selected.length
            ? `${selected.length} tag${selected.length === 1 ? "" : "s"} selected`
            : placeholder}
        </span>
        <ChevronDown size={14} className="multi-select-chev" aria-hidden />
      </button>
      {panel}
    </div>
  );
}
