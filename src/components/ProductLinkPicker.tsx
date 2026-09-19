import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, X } from "../lib/icons";
import { adminApi } from "../lib/api";

type Picked = { id: number; name: string; sku?: string };

type Props = {
  label: string;
  hint?: string;
  value: number[];
  onChange: (ids: number[]) => void;
  excludeId?: number;
  /** Show “Edit” link so each linked SKU can have its own images, price, copy, etc. */
  editLinks?: boolean;
};

export function ProductLinkPicker({
  label,
  hint,
  value,
  onChange,
  excludeId,
  editLinks = false,
}: Props) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [hits, setHits] = useState<Picked[]>([]);
  const [labels, setLabels] = useState<Record<number, Picked>>({});

  const selected = useMemo(
    () => value.map((id) => labels[id] ?? { id, name: `Product #${id}` }),
    [value, labels],
  );

  useEffect(() => {
    const missing = value.filter((id) => id > 0 && !labels[id]);
    if (!missing.length) return;
    let cancelled = false;
    void (async () => {
      const next: Record<number, Picked> = { ...labels };
      await Promise.all(
        missing.slice(0, 24).map(async (id) => {
          try {
            const res = await adminApi.products({ q: String(id), per_page: 8, page: 1 });
            const match = (res.items ?? []).find((row) => Number(row.product_id) === id);
            if (match) {
              next[id] = {
                id,
                name: String(match.name ?? `Product #${id}`),
                sku: match.sku ? String(match.sku) : undefined,
              };
              return;
            }
            const p = await adminApi.product(id);
            next[id] = {
              id,
              name: String(
                p.name_display ||
                  p.name?.English ||
                  p.name?.english ||
                  Object.values(p.name ?? {})[0] ||
                  `Product #${id}`,
              ),
              sku: p.sku ? String(p.sku) : undefined,
            };
          } catch {
            next[id] = { id, name: `Product #${id}` };
          }
        }),
      );
      if (!cancelled) setLabels(next);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resolve labels when ids change
  }, [value.join(",")]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      setBusy(true);
      void adminApi
        .products({ q, per_page: 12, page: 1 })
        .then((res) => {
          if (cancelled) return;
          const items = (res.items ?? [])
            .map((row) => ({
              id: Number(row.product_id),
              name: String(row.name ?? `Product #${row.product_id}`),
              sku: row.sku ? String(row.sku) : undefined,
            }))
            .filter((p) => p.id > 0 && p.id !== excludeId && !value.includes(p.id));
          setHits(items);
        })
        .catch(() => {
          if (!cancelled) setHits([]);
        })
        .finally(() => {
          if (!cancelled) setBusy(false);
        });
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query, excludeId, value]);

  function add(p: Picked) {
    if (value.includes(p.id)) return;
    setLabels((prev) => ({ ...prev, [p.id]: p }));
    onChange([...value, p.id]);
    setQuery("");
    setHits([]);
  }

  function remove(id: number) {
    onChange(value.filter((x) => x !== id));
  }

  return (
    <div className="pf-link-picker">
      <span className="pf-label">{label}</span>
      {hint ? <p className="muted pf-hint">{hint}</p> : null}
      <div className="pf-chip-row">
        {selected.map((p) => (
          <span key={p.id} className={`pf-chip${editLinks ? " pf-chip-rich" : ""}`}>
            <span className="pf-chip-main">
              {p.name}
              {p.sku ? <span className="muted"> · {p.sku}</span> : null}
            </span>
            {editLinks ? (
              <Link
                to={`/products/${p.id}/edit`}
                className="pf-chip-edit"
                title="Edit this SKU’s images, price, and details"
              >
                <ExternalLink size={12} />
                <span>Edit</span>
              </Link>
            ) : null}
            <button type="button" className="pf-chip-x" aria-label={`Remove ${p.name}`} onClick={() => remove(p.id)}>
              <X size={12} />
            </button>
          </span>
        ))}
        {!selected.length ? <span className="muted">None selected</span> : null}
      </div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name, SKU, or barcode…"
        aria-label={`Search products for ${label}`}
      />
      {busy ? <p className="muted pf-hint">Searching…</p> : null}
      {hits.length > 0 ? (
        <ul className="pf-picker-hits">
          {hits.map((h) => (
            <li key={h.id}>
              <button type="button" onClick={() => add(h)}>
                <strong>{h.name}</strong>
                <span className="muted">
                  #{h.id}
                  {h.sku ? ` · ${h.sku}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
