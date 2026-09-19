import { useEffect, useState } from "react";
import { adminApi } from "../lib/api";

export type BannerTargetHit = {
  id: string;
  name: string;
  meta?: string;
  cat?: string;
  subcat?: string;
  sub_subcat?: string;
};

type Props = {
  linkType: string;
  value: string;
  onPick: (hit: BannerTargetHit) => void;
  onChange: (value: string) => void;
};

const CATEGORY_TYPES = new Set(["category", "sub_category", "sub_sub_category", "sub_sub_sub_category"]);

function fieldCopy(linkType: string): { label: string; placeholder: string } {
  if (linkType === "product") return { label: "Product", placeholder: "Search product name, SKU, or ID…" };
  if (linkType === "brand") return { label: "Brand", placeholder: "Search brand name or ID…" };
  if (linkType === "itemgroup") return { label: "Item group", placeholder: "Search item group name or ID…" };
  if (linkType === "category") return { label: "Category", placeholder: "Search category name or ID…" };
  if (linkType === "sub_category") return { label: "Sub category", placeholder: "Search subcategory name or ID…" };
  if (linkType === "sub_sub_category") return { label: "Sub sub category", placeholder: "Search category name or ID…" };
  if (linkType === "sub_sub_sub_category") return { label: "Sub sub sub category", placeholder: "Search category name or ID…" };
  return { label: "Target", placeholder: "Search and pick…" };
}

async function categoryChain(id: number): Promise<number[]> {
  const ids: number[] = [id];
  let current = id;
  for (let i = 0; i < 4; i += 1) {
    const row = (await adminApi.category(current)) as { parent?: number };
    const parent = Number(row.parent ?? 0);
    if (!parent) break;
    ids.unshift(parent);
    current = parent;
  }
  return ids;
}

async function searchTargets(linkType: string, q: string): Promise<BannerTargetHit[]> {
  if (linkType === "product") {
    const res = await adminApi.products({ q, per_page: 12, page: 1 });
    return (res.items ?? []).map((row) => ({
      id: String(row.product_id),
      name: String(row.name ?? `Product #${row.product_id}`),
      meta: [row.sku ? `SKU ${row.sku}` : "", `#${row.product_id}`].filter(Boolean).join(" · "),
      cat: row.category_id ? String(row.category_id) : "",
      subcat: row.subcategory_id ? String(row.subcategory_id) : "",
      sub_subcat: row.sub_subcategory_id ? String(row.sub_subcategory_id) : "",
    }));
  }

  if (linkType === "brand") {
    const res = await adminApi.brands({ q, per_page: 12, page: 1 });
    return (res.items ?? []).map((row) => {
      const id = Number(row.id ?? 0);
      return {
        id: String(id),
        name: String(row.name ?? `Brand #${id}`),
        meta: `#${id}`,
      };
    });
  }

  if (linkType === "itemgroup") {
    const rows = await adminApi.itemGroups(q);
    return (rows ?? []).map((row) => ({
      id: String(row.id),
      name: row.name || `Group #${row.id}`,
      meta: `#${row.id}`,
    }));
  }

  if (CATEGORY_TYPES.has(linkType)) {
    if (!q.trim()) return [];
    const rows = await adminApi.categories(undefined, q, { lite: true });
    return (rows ?? []).map((row) => {
      const id = Number(row.id ?? 0);
      const parentName = row.parent_name ? String(row.parent_name) : "";
      return {
        id: String(id),
        name: String(row.name ?? `Category #${id}`),
        meta: [parentName, `#${id}`].filter(Boolean).join(" · "),
      };
    });
  }

  return [];
}

async function resolveLabel(linkType: string, value: string): Promise<string> {
  const id = value.trim();
  if (!id) return "";
  try {
    const hits = await searchTargets(linkType, id);
    const match = hits.find((h) => h.id === id);
    return match?.name ?? "";
  } catch {
    return "";
  }
}

export function BannerTargetPicker({ linkType, value, onPick, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hits, setHits] = useState<BannerTargetHit[]>([]);
  const [pickedName, setPickedName] = useState("");

  const copy = fieldCopy(linkType);

  useEffect(() => {
    setQuery("");
    setHits([]);
    setOpen(false);
  }, [linkType]);

  useEffect(() => {
    let cancelled = false;
    if (!value.trim() || linkType === "external_url") {
      setPickedName("");
      return;
    }
    void resolveLabel(linkType, value).then((name) => {
      if (!cancelled) setPickedName(name);
    });
    return () => {
      cancelled = true;
    };
  }, [linkType, value]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      setBusy(true);
      void searchTargets(linkType, q)
        .then((rows) => {
          if (!cancelled) setHits(rows);
        })
        .catch(() => {
          if (!cancelled) setHits([]);
        })
        .finally(() => {
          if (!cancelled) setBusy(false);
        });
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query, linkType]);

  async function pick(hit: BannerTargetHit) {
    let next = hit;
    if (CATEGORY_TYPES.has(linkType)) {
      try {
        const chain = await categoryChain(Number(hit.id));
        next = {
          ...hit,
          cat: String(chain[0] ?? hit.id),
          subcat: chain[1] ? String(chain[1]) : "",
          sub_subcat: chain[2] ? String(chain[2]) : "",
          id: String(hit.id),
        };
      } catch {
        next = { ...hit, cat: hit.id };
      }
    }
    onPick(next);
    setPickedName(hit.name);
    setQuery("");
    setHits([]);
    setOpen(false);
  }

  if (!linkType || linkType === "offer") return null;

  if (linkType === "external_url") {
    return (
      <label className="pf-field pf-field-span">
        <span className="pf-label">External URL</span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://…"
          aria-label="External URL"
        />
      </label>
    );
  }

  return (
    <div className="banner-group-field pf-field pf-field-span">
      <span className="pf-label">{copy.label}</span>
      <div className="banner-group-row">
        <div className="banner-group-search" onBlur={() => window.setTimeout(() => setOpen(false), 140)}>
          <input
            value={query}
            placeholder={copy.placeholder}
            aria-label={`Search ${copy.label}`}
            onFocus={() => {
              setOpen(true);
              if (!query.trim() && !hits.length) {
                setBusy(true);
                void searchTargets(linkType, "")
                  .then(setHits)
                  .catch(() => setHits([]))
                  .finally(() => setBusy(false));
              }
            }}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (hits[0]) void pick(hits[0]);
              }
              if (e.key === "Escape") setOpen(false);
            }}
          />
          {open && (query.trim() || busy) ? (
            <div className="banner-group-menu" role="listbox" aria-label={copy.label}>
              {busy ? <div className="muted small">Searching…</div> : null}
              {hits.map((hit) => (
                <button
                  key={`${hit.id}-${hit.name}`}
                  type="button"
                  role="option"
                  aria-selected={hit.id === value}
                  className={hit.id === value ? "is-active" : undefined}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void pick(hit)}
                >
                  <strong>{hit.name}</strong>
                  {hit.meta ? <span className="muted small"> {hit.meta}</span> : null}
                </button>
              ))}
              {!busy && query.trim() && !hits.length ? (
                <div className="muted small">No matches — try another name or ID</div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      {value ? (
        <div className="banner-group-preview">
          <span className="muted small">Selected</span>
          <strong className="banner-group-chip">{pickedName || `#${value}`}</strong>
          <button
            type="button"
            className="banner-group-clear"
            onClick={() => {
              onChange("");
              onPick({ id: "", name: "", cat: "", subcat: "", sub_subcat: "" });
              setPickedName("");
            }}
          >
            Clear
          </button>
        </div>
      ) : null}
    </div>
  );
}
