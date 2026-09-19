import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Store } from "../lib/icons";

export type StoreOption = { id: string; name: string };

type Props = {
  stores: StoreOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
};

const MENU_MAX_HEIGHT = 280;

export function StoreMultiPicker({ stores, selected, onChange, placeholder = "Select stores" }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const allSelected = stores.length > 0 && selected.length === stores.length;
  const noneSelected = selected.length === 0;

  const selectedNames = useMemo(
    () =>
      selected
        .map((id) => stores.find((s) => s.id === id)?.name)
        .filter((name): name is string => Boolean(name)),
    [selected, stores],
  );

  const label = allSelected
    ? "All stores"
    : selected.length === 1
      ? (selectedNames[0] ?? "1 store")
      : selected.length > 1
        ? `${selected.length} stores`
        : placeholder;

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

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  function toggleAll() {
    onChange(allSelected ? [] : stores.map((s) => s.id));
  }

  const menu = open ? (
    <div
      ref={menuRef}
      className="store-multi-picker-menu"
      role="listbox"
      aria-multiselectable
      style={menuStyle}
    >
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
      <label className={`store-multi-picker-item store-multi-picker-all${allSelected ? " is-selected" : ""}`}>
        <input type="checkbox" checked={allSelected} onChange={toggleAll} />
        <span className="store-multi-picker-item-text">
          <strong>All stores</strong>
          <small>{stores.length} branches</small>
        </span>
      </label>
      <div className="store-multi-picker-divider" role="separator" />
      <div className="store-multi-picker-list">
        {filteredStores.length ? (
          filteredStores.map((store) => {
            const checked = selected.includes(store.id);
            return (
              <label key={store.id} className={`store-multi-picker-item${checked ? " is-selected" : ""}`}>
                <input type="checkbox" checked={checked} onChange={() => toggle(store.id)} />
                <span className="store-multi-picker-item-text">
                  <strong>{store.name}</strong>
                  <small>#{store.id}</small>
                </span>
              </label>
            );
          })
        ) : (
          <p className="store-multi-picker-empty">{stores.length ? "No stores match" : "No stores available"}</p>
        )}
      </div>
      <div className="store-multi-picker-menu-foot">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onChange([])}>
          Clear
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(false)}>
          Done
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div className={`store-multi-picker${open ? " is-open" : ""}${noneSelected ? " is-empty" : ""}`} ref={rootRef}>
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
          {!allSelected && selected.length > 1 ? (
            <span className="store-multi-picker-hint">{selectedNames.slice(0, 2).join(" · ")}</span>
          ) : null}
        </span>
        {!allSelected && selected.length > 0 ? (
          <span className="store-multi-picker-count">{selected.length}</span>
        ) : null}
        <ChevronDown className="store-multi-picker-chevron" size={16} aria-hidden />
      </button>
      {menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
