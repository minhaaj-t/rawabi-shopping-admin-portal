import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "../lib/icons";
import { adminApi, type CustomerListItem } from "../lib/api";

export type PickedCustomer = {
  id: number;
  username: string;
  phone: string;
  email: string;
};

type Props = {
  selected: PickedCustomer[];
  onChange: (next: PickedCustomer[]) => void;
  placeholder?: string;
};

const MENU_MAX_HEIGHT = 320;

function toPicked(c: CustomerListItem | PickedCustomer): PickedCustomer {
  return {
    id: c.id,
    username: c.username || `Customer #${c.id}`,
    phone: c.phone || "",
    email: c.email || "",
  };
}

function dedupeCustomers(rows: CustomerListItem[]): CustomerListItem[] {
  const seen = new Set<number>();
  const out: CustomerListItem[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

export function CustomerMultiPicker({
  selected,
  onChange,
  placeholder = "Search customers by name, phone, or email…",
}: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const selectedIds = useMemo(() => new Set(selected.map((s) => s.id)), [selected]);

  const updateMenuPosition = useCallback(() => {
    const anchor = searchRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const gap = 6;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const openUpward = spaceBelow < 200 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(MENU_MAX_HEIGHT, Math.max(openUpward ? spaceAbove : spaceBelow, 160));

    setMenuStyle({
      position: "fixed",
      left: rect.left,
      width: Math.max(rect.width, 320),
      top: openUpward ? undefined : rect.bottom + gap,
      bottom: openUpward ? window.innerHeight - rect.top + gap : undefined,
      maxHeight,
      zIndex: 12000,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      setLoading(true);
      void adminApi
        .customers({ q: q.trim() || undefined, per_page: 30 })
        .then((res) => setItems(dedupeCustomers(res.items)))
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    }, 220);
    return () => window.clearTimeout(timer);
  }, [q, open]);

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();

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

  function toggle(c: CustomerListItem) {
    if (selectedIds.has(c.id)) {
      onChange(selected.filter((s) => s.id !== c.id));
      return;
    }
    onChange([...selected, toPicked(c)]);
  }

  function remove(id: number) {
    onChange(selected.filter((s) => s.id !== id));
  }

  const menu = open
    ? createPortal(
        <div
          ref={menuRef}
          className="customer-multi-menu"
          role="listbox"
          aria-multiselectable
          style={menuStyle}
        >
          <div className="customer-multi-menu-scroll">
            {loading ? <div className="customer-multi-menu-msg muted">Searching…</div> : null}
            {!loading && items.length === 0 ? (
              <div className="customer-multi-menu-msg muted">No customers match.</div>
            ) : null}
            {!loading
              ? items.map((c) => {
                  const on = selectedIds.has(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="option"
                      aria-selected={on}
                      className={`customer-multi-option${on ? " is-selected" : ""}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggle(c);
                      }}
                    >
                      <span className="customer-multi-check" aria-hidden>
                        <input type="checkbox" readOnly checked={on} tabIndex={-1} />
                      </span>
                      <span className="customer-multi-option-body">
                        <strong>{c.username || `Customer #${c.id}`}</strong>
                        <span className="customer-multi-option-meta">
                          <em>{c.phone || "No phone"}</em>
                          {c.email ? <em>{c.email}</em> : null}
                          <em>#{c.id}</em>
                        </span>
                      </span>
                    </button>
                  );
                })
              : null}
          </div>
          <div className="customer-multi-menu-foot">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => onChange([])}>
              Clear all
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(false)}>
              Done ({selected.length})
            </button>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className="customer-multi-pick" ref={rootRef}>
      {selected.length ? (
        <div className="customer-multi-chips" aria-label="Selected customers">
          {selected.map((c) => (
            <span key={c.id} className="customer-multi-chip">
              <span className="customer-multi-chip-body">
                <strong>{c.username || `#${c.id}`}</strong>
                <em>{c.phone || c.email || `#${c.id}`}</em>
              </span>
              <button
                type="button"
                className="customer-multi-chip-remove"
                aria-label={`Remove ${c.username || c.id}`}
                onClick={() => remove(c.id)}
              >
                <X size={13} aria-hidden />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="muted small customer-multi-empty-hint">No customers selected yet.</p>
      )}

      <div ref={searchRef} className={`customer-multi-search${open ? " is-open" : ""}`}>
        <Search size={15} aria-hidden />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          aria-label="Search customers to add"
          autoComplete="off"
        />
        {selected.length ? <span className="customer-multi-count">{selected.length}</span> : null}
      </div>

      {menu}
    </div>
  );
}

/** Resolve customer ids into picker rows (best-effort). */
export async function resolveCustomersByIds(ids: number[]): Promise<PickedCustomer[]> {
  const unique = [...new Set(ids.filter((n) => n > 0))];
  if (!unique.length) return [];

  const found = new Map<number, PickedCustomer>();
  await Promise.all(
    unique.map(async (id) => {
      try {
        const res = await adminApi.customers({ q: String(id), per_page: 10 });
        const match = res.items.find((c) => c.id === id);
        if (match) {
          found.set(id, toPicked(match));
          return;
        }
        const detail = await adminApi.customer(id);
        const c = detail.customer;
        found.set(id, {
          id,
          username: String(c.ec_user_username ?? c.username ?? `Customer #${id}`),
          phone: String(c.ec_user_phone ?? c.phone ?? ""),
          email: String(c.ec_user_email ?? c.email ?? ""),
        });
      } catch {
        found.set(id, { id, username: `Customer #${id}`, phone: "", email: "" });
      }
    }),
  );

  return unique.map((id) => found.get(id) ?? { id, username: `Customer #${id}`, phone: "", email: "" });
}
