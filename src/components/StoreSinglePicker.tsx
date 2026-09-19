import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Store } from "../lib/icons";
import type { StoreOption } from "./StoreMultiPicker";

type Props = {
  stores: StoreOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  required?: boolean;
};

const MENU_MAX_HEIGHT = 280;

export function StoreSinglePicker({
  stores,
  value,
  onChange,
  placeholder = "Select store",
  required = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const selectedStore = useMemo(() => stores.find((s) => s.id === value), [stores, value]);
  const label = selectedStore ? selectedStore.name : placeholder;

  const filteredStores = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stores;
    return stores.filter((s) => s.name.toLowerCase().includes(q) || s.id.includes(q));
  }, [stores, query]);

  const updateMenuPosition = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const gap = 6;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const openUpward = spaceBelow < 180 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(MENU_MAX_HEIGHT, openUpward ? spaceAbove : spaceBelow);

    setMenuStyle({
      position: "fixed",
      left: rect.left,
      width: Math.max(rect.width, 280),
      top: openUpward ? undefined : rect.bottom + gap,
      bottom: openUpward ? window.innerHeight - rect.top + gap : undefined,
      maxHeight: Math.max(maxHeight, 140),
      zIndex: 10050,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();
    setQuery("");

    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener("mousedown", onDoc);
    window.addEventListener("scroll", updateMenuPosition, true);
    window.addEventListener("resize", updateMenuPosition);

    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("scroll", updateMenuPosition, true);
      window.removeEventListener("resize", updateMenuPosition);
    };
  }, [open, updateMenuPosition]);

  function pick(id: string) {
    onChange(id);
    setOpen(false);
  }

  const menu = open ? (
    <div ref={menuRef} className="store-multi-picker-menu" role="listbox" style={menuStyle}>
      <div className="store-multi-picker-menu-head">
        <input
          type="search"
          className="store-multi-picker-search"
          placeholder="Search stores…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>
      <div className="store-multi-picker-list">
        {filteredStores.length ? (
          filteredStores.map((store) => {
            const checked = value === store.id;
            return (
              <button
                key={store.id}
                type="button"
                role="option"
                aria-selected={checked}
                className={`store-multi-picker-item store-single-picker-item${checked ? " is-selected" : ""}`}
                onClick={() => pick(store.id)}
              >
                <span className="store-multi-picker-item-text">
                  <strong>{store.name}</strong>
                  <small>#{store.id}</small>
                </span>
              </button>
            );
          })
        ) : (
          <p className="store-multi-picker-empty">{stores.length ? "No stores match" : "No stores available"}</p>
        )}
      </div>
      <div className="store-multi-picker-menu-foot">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onChange("")}>
          Clear
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(false)}>
          Done
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div
      className={`store-multi-picker store-single-picker${open ? " is-open" : ""}${!value ? " is-empty" : ""}`}
      ref={rootRef}
    >
      {/* Hidden input so native form required validation still works */}
      <input type="text" value={value} required={required} readOnly tabIndex={-1} aria-hidden className="sr-only" />
      <button
        ref={btnRef}
        type="button"
        className="store-multi-picker-btn"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="store-multi-picker-icon" aria-hidden>
          <Store size={16} strokeWidth={1.75} />
        </span>
        <span className="store-multi-picker-copy">
          <span className="store-multi-picker-label">{label}</span>
          {selectedStore ? <span className="store-multi-picker-hint">#{selectedStore.id}</span> : null}
        </span>
        <ChevronDown className="store-multi-picker-chevron" size={16} aria-hidden />
      </button>
      {menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
