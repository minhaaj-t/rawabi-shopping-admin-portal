import { useEffect, useRef, useState } from "react";
import { Search, X } from "../lib/icons";
import { adminApi, type CustomerListItem } from "../lib/api";

export type PickedCustomer = {
  id: number;
  username: string;
  phone: string;
  email: string;
};

type Props = {
  value: PickedCustomer | null;
  onChange: (next: PickedCustomer | null) => void;
};

export function CustomerPicker({ value, onChange }: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      setLoading(true);
      void adminApi
        .customers({ q: q.trim() || undefined, per_page: 12 })
        .then((res) => setItems(res.items))
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    }, 220);
    return () => window.clearTimeout(timer);
  }, [q, open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (value) {
    return (
      <div className="customer-pick-selected">
        <div>
          <strong>{value.username || `Customer #${value.id}`}</strong>
          <span>
            {value.phone || "No phone"}
            {value.email ? ` · ${value.email}` : ""}
            {` · #${value.id}`}
          </span>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onChange(null)}>
          <X size={14} />
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="customer-pick" ref={boxRef}>
      <div className="customer-pick-search">
        <Search size={15} aria-hidden />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search name, phone, or email…"
          aria-label="Pick a customer"
          autoComplete="off"
        />
      </div>
      {open ? (
        <ul className="customer-pick-list" role="listbox">
          {loading ? <li className="muted">Searching…</li> : null}
          {!loading && items.length === 0 ? <li className="muted">No customers match.</li> : null}
          {items.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange({
                    id: c.id,
                    username: c.username,
                    phone: c.phone,
                    email: c.email,
                  });
                  setOpen(false);
                  setQ("");
                }}
              >
                <strong>{c.username || `Customer #${c.id}`}</strong>
                <span>
                  {c.phone || "—"}
                  {c.email ? ` · ${c.email}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
