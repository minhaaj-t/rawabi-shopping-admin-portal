import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Plus, X } from "../lib/icons";
import { adminApi } from "../lib/api";

export type AxisKey = "color" | "size" | "pack" | "weight" | "flavor" | "type";

export type ProductOptionsExtra = {
  option_label: string;
  option_color: string;
  option_size: string;
  option_pack: string;
  option_weight: string;
  option_flavor: string;
  option_type: string;
  variant_axis: "auto" | AxisKey | "multi";
  variant_product_ids: number[];
};

type Picked = {
  id: number;
  name: string;
  sku?: string;
  option_color?: string;
  option_size?: string;
  option_pack?: string;
  option_weight?: string;
  option_flavor?: string;
  option_type?: string;
  option_label?: string;
};

type LocaleMap = Record<string, string>;

type CreateSeed = {
  name: LocaleMap;
  sku: string;
  barcode?: string;
  uom?: string;
  category_id?: number;
  subcategory_id?: number;
  sub_subcategory_id?: number;
  sub_sub_subcategory_id?: number;
  brand_id?: number;
  country_id?: number;
  selling_price?: number;
  offer_price?: number;
  image?: string;
  featured?: number[];
  store_ids?: number[];
  short_description?: LocaleMap;
  detailed_description?: LocaleMap;
  catalog_extra?: Record<string, unknown>;
};

const AXIS_META: Array<{
  key: AxisKey;
  label: string;
  placeholder: string;
  addVerb: string;
  hint: string;
  presets?: string[];
}> = [
  {
    key: "color",
    label: "Color",
    placeholder: "e.g. Red",
    addVerb: "Add color product",
    hint: "Fashion / home — each color is its own SKU.",
    presets: ["Black", "White", "Red", "Blue", "Green", "Beige", "Navy", "Pink"],
  },
  {
    key: "size",
    label: "Size",
    placeholder: "e.g. XL",
    addVerb: "Add size product",
    hint: "Apparel sizes — each size is its own SKU.",
    presets: ["XS", "S", "M", "L", "XL", "XXL", "3XL"],
  },
  {
    key: "pack",
    label: "Pack / volume",
    placeholder: "e.g. 1L",
    addVerb: "Add pack product",
    hint: "Bottles & multipacks — 500ml, 1L, 6-pack…",
  },
  {
    key: "weight",
    label: "Weight",
    placeholder: "e.g. 500g",
    addVerb: "Add weight product",
    hint: "Solid weights — 250g, 500g, 1kg…",
    presets: ["100g", "250g", "500g", "750g", "1kg", "2kg", "5kg"],
  },
  {
    key: "flavor",
    label: "Flavor",
    placeholder: "e.g. Chocolate",
    addVerb: "Add flavor product",
    hint: "Dairy / snacks — each flavor is its own SKU.",
    presets: ["Chocolate", "Vanilla", "Strawberry", "Mango", "Original", "Honey"],
  },
  {
    key: "type",
    label: "Type",
    placeholder: "e.g. Full cream",
    addVerb: "Add type product",
    hint: "Product type — Full cream, Skim, Sugar-free…",
    presets: ["Full cream", "Low fat", "Skim", "Sugar-free", "Organic"],
  },
];

const AXIS_KEYS = AXIS_META.map((a) => a.key);

type PackKind = "volume" | "multipack" | "count";

const PACK_KINDS: Array<{ key: PackKind; label: string; hint: string }> = [
  { key: "volume", label: "Volume", hint: "ml / L bottles & cartons" },
  { key: "multipack", label: "Multipack", hint: "6-pack, 12-pack…" },
  { key: "count", label: "Piece count", hint: "4pcs, 8pcs…" },
];

const PACK_PRESETS: Record<PackKind, string[]> = {
  volume: ["250ml", "330ml", "500ml", "750ml", "1L", "1.5L", "2L", "5L"],
  multipack: ["2-pack", "4-pack", "6-pack", "8-pack", "12-pack", "24-pack"],
  count: ["2pcs", "4pcs", "6pcs", "8pcs", "10pcs", "12pcs"],
};

function guessAxisFromText(axis: AxisKey, text: string): string {
  const t = text.trim();
  if (!t) return "";
  if (axis === "pack") {
    const m =
      t.match(/\b(\d+(?:\.\d+)?\s*(?:ml|l|ltr|liter|litre))\b/i) ||
      t.match(/\b(\d+\s*[- ]?\s*pack)\b/i) ||
      t.match(/\b(\d+\s*pcs)\b/i) ||
      t.match(/\b(\d+x\d+)\b/i);
    return m ? m[1].replace(/\s+/g, "") : "";
  }
  if (axis === "weight") {
    const m = t.match(/\b(\d+(?:\.\d+)?\s*(?:g|kg|gram|grams))\b/i);
    return m ? m[1].replace(/\s+/g, "") : "";
  }
  if (axis === "size") {
    const m = t.match(/\b(3XL|XXL|XL|XS|S|M|L)\b/i);
    return m ? m[1].toUpperCase() : "";
  }
  return "";
}

function detectPackKind(value: string): PackKind {
  const v = value.toLowerCase();
  if (/\b\d+\s*pcs\b/.test(v) || /^\d+pcs$/i.test(v)) return "count";
  if (/pack|x\d+/i.test(v)) return "multipack";
  return "volume";
}

function emptyEnabled(): Record<AxisKey, boolean> {
  return { color: false, size: false, pack: false, weight: false, flavor: false, type: false };
}

function buildLabel(values: Record<AxisKey, string>): string {
  return AXIS_KEYS.map((k) => values[k].trim()).filter(Boolean).join(" / ");
}

function valuesFromExtra(extra: ProductOptionsExtra, enabled: Record<AxisKey, boolean>): Record<AxisKey, string> {
  return {
    color: enabled.color ? extra.option_color : "",
    size: enabled.size ? extra.option_size : "",
    pack: enabled.pack ? extra.option_pack : "",
    weight: enabled.weight ? extra.option_weight : "",
    flavor: enabled.flavor ? extra.option_flavor : "",
    type: enabled.type ? extra.option_type : "",
  };
}

function axisFromEnabled(enabled: Record<AxisKey, boolean>): ProductOptionsExtra["variant_axis"] {
  const on = AXIS_KEYS.filter((k) => enabled[k]);
  if (on.length > 1) return "multi";
  if (on.length === 1) return on[0];
  return "auto";
}

function enabledFromExtra(extra: ProductOptionsExtra): Record<AxisKey, boolean> {
  const axis = extra.variant_axis;
  const next = emptyEnabled();

  for (const key of AXIS_KEYS) {
    if (String(extra[`option_${key}` as const] ?? "").trim()) next[key] = true;
  }

  if (axis === "multi") {
    return next;
  }

  if (axis !== "auto" && AXIS_KEYS.includes(axis as AxisKey)) {
    next[axis as AxisKey] = true;
    return next;
  }

  return next;
}

function thisValue(extra: ProductOptionsExtra, key: AxisKey): string {
  return (extra[`option_${key}` as const] as string) || "";
}

function siblingValue(p: Picked, key: AxisKey): string {
  return String((p[`option_${key}` as const] as string | undefined) || "").trim();
}

function optionBadge(p: Picked): string {
  return (
    p.option_label?.trim() ||
    buildLabel({
      color: p.option_color || "",
      size: p.option_size || "",
      pack: p.option_pack || "",
      weight: p.option_weight || "",
      flavor: p.option_flavor || "",
      type: p.option_type || "",
    }) ||
    "—"
  );
}

function friendlyError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "Could not create variant product");
  if (/SQLSTATE|General error|Connection:|doesn't have a default/i.test(raw)) {
    return "Could not create variant product. Try again after saving this product.";
  }
  return raw.length > 160 ? `${raw.slice(0, 157)}…` : raw;
}

function mapProductRow(p: {
  product_id?: number;
  name_display?: string;
  name?: LocaleMap | string;
  sku?: string;
  catalog_extra?: Record<string, unknown>;
  option_color?: string;
  option_size?: string;
  option_pack?: string;
  option_weight?: string;
  option_flavor?: string;
  option_type?: string;
  option_label?: string;
}): Picked {
  const id = Number(p.product_id || 0);
  const extra = (p.catalog_extra || {}) as Record<string, unknown>;
  const nameStr =
    typeof p.name === "string"
      ? p.name
      : String(
          p.name_display ||
            p.name?.English ||
            p.name?.english ||
            Object.values(p.name ?? {})[0] ||
            `Product #${id}`,
        );
  return {
    id,
    name: nameStr,
    sku: p.sku ? String(p.sku) : undefined,
    option_color: String(p.option_color ?? extra.option_color ?? ""),
    option_size: String(p.option_size ?? extra.option_size ?? ""),
    option_pack: String(p.option_pack ?? extra.option_pack ?? ""),
    option_weight: String(p.option_weight ?? extra.option_weight ?? ""),
    option_flavor: String(p.option_flavor ?? extra.option_flavor ?? ""),
    option_type: String(p.option_type ?? extra.option_type ?? ""),
    option_label: String(p.option_label ?? extra.option_label ?? ""),
  };
}

function PresetRow({
  presets,
  active,
  onPick,
}: {
  presets: string[];
  active: string;
  onPick: (value: string) => void;
}) {
  if (!presets.length) return null;
  return (
    <div className="pf-options-pack-presets" role="group">
      {presets.map((preset) => (
        <button
          key={preset}
          type="button"
          className={`pf-options-preset${active === preset ? " is-on" : ""}`}
          onClick={() => onPick(preset)}
        >
          {preset}
        </button>
      ))}
    </div>
  );
}

type Props = {
  editing: boolean;
  productId: number;
  extra: ProductOptionsExtra;
  onChange: (patch: Partial<ProductOptionsExtra>) => void;
  createSeed: CreateSeed;
};

export function ProductOptionsPanel({
  editing,
  productId,
  extra,
  onChange,
  createSeed,
}: Props) {
  const [enabled, setEnabled] = useState<Record<AxisKey, boolean>>(() => enabledFromExtra(extra));
  const [activeTab, setActiveTab] = useState<AxisKey | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [hits, setHits] = useState<Picked[]>([]);
  const [labels, setLabels] = useState<Record<number, Picked>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [draftPrimary, setDraftPrimary] = useState("");
  const [packKind, setPackKind] = useState<PackKind>("volume");
  const [linkValue, setLinkValue] = useState("");
  const [creating, setCreating] = useState(false);
  const [linking, setLinking] = useState(false);
  const [msg, setMsg] = useState("");

  const linkedIds = extra.variant_product_ids;
  const enabledAxes = AXIS_META.filter((a) => enabled[a.key]);
  const anyAxis = enabledAxes.length > 0;
  const tab = activeTab && enabled[activeTab] ? activeTab : enabledAxes[0]?.key ?? null;
  const tabMeta = tab ? AXIS_META.find((a) => a.key === tab) : null;
  const tabPresets = tab === "pack" ? PACK_PRESETS[packKind] : tabMeta?.presets ?? [];

  const siblings = useMemo(
    () => linkedIds.map((id) => labels[id] ?? { id, name: `Product #${id}` }),
    [linkedIds, labels],
  );

  useEffect(() => {
    const keys = AXIS_META.filter((a) => enabled[a.key]).map((a) => a.key);
    if (!keys.length) {
      setActiveTab(null);
      setShowAdd(false);
      return;
    }
    if (!activeTab || !keys.includes(activeTab)) {
      setActiveTab(keys[0]);
      setShowAdd(false);
    }
  }, [enabled, activeTab]);

  useEffect(() => {
    const missing = linkedIds.filter((id) => id > 0 && !labels[id]);
    if (!missing.length) return;
    let cancelled = false;
    void (async () => {
      const next: Record<number, Picked> = { ...labels };
      await Promise.all(
        missing.slice(0, 40).map(async (id) => {
          try {
            const p = await adminApi.product(id);
            next[id] = mapProductRow({
              product_id: Number((p as { product_id?: number }).product_id ?? id),
              name_display: (p as { name_display?: string }).name_display,
              name: (p as { name?: LocaleMap }).name,
              sku: (p as { sku?: string }).sku,
              catalog_extra: (p as { catalog_extra?: Record<string, unknown> }).catalog_extra,
            });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedIds.join(",")]);

  useEffect(() => {
    if (tab === "pack") {
      const current = thisValue(extra, "pack");
      if (current) setPackKind(detectPackKind(current));
    }
    setLinkValue("");
    setQuery("");
    setHits([]);
  }, [tab, extra.option_pack]);

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
        .products({ q, per_page: 16, page: 1 })
        .then((res) => {
          if (cancelled) return;
          let mapped = (res.items ?? [])
            .map((row) =>
              mapProductRow({
                product_id: Number(row.product_id),
                name: String(row.name ?? `Product #${row.product_id}`),
                sku: row.sku ? String(row.sku) : undefined,
                option_color: (row as { option_color?: string }).option_color,
                option_size: (row as { option_size?: string }).option_size,
                option_pack: (row as { option_pack?: string }).option_pack,
                option_weight: (row as { option_weight?: string }).option_weight,
                option_flavor: (row as { option_flavor?: string }).option_flavor,
                option_type: (row as { option_type?: string }).option_type,
                option_label: (row as { option_label?: string }).option_label,
              }),
            )
            .filter((p) => p.id > 0 && p.id !== productId && !linkedIds.includes(p.id));

          // Prefer hits that already have this axis value, else guess from name
          if (tab) {
            mapped = mapped.map((p) => {
              const existing = siblingValue(p, tab);
              if (existing) return p;
              const guessed = guessAxisFromText(tab, p.name);
              if (!guessed) return p;
              return { ...p, [`option_${tab}`]: guessed } as Picked;
            });
            mapped = [...mapped].sort((a, b) => {
              const aHit = siblingValue(a, tab) ? 1 : 0;
              const bHit = siblingValue(b, tab) ? 1 : 0;
              return bHit - aHit;
            });
          }
          setHits(mapped);
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
  }, [query, productId, linkedIds, tab]);

  function patchExtraFromValues(values: Record<AxisKey, string>, enabledNext: Record<AxisKey, boolean>) {
    onChange({
      option_color: values.color,
      option_size: values.size,
      option_pack: values.pack,
      option_weight: values.weight,
      option_flavor: values.flavor,
      option_type: values.type,
      option_label: buildLabel(values),
      variant_axis: axisFromEnabled(enabledNext),
      variant_product_ids: AXIS_KEYS.some((k) => enabledNext[k]) ? extra.variant_product_ids : [],
    });
  }

  function commitEnabled(next: Record<AxisKey, boolean>) {
    setEnabled(next);
    setMsg("");
    setShowAdd(false);
    patchExtraFromValues(valuesFromExtra(extra, next), next);
    setActiveTab(AXIS_META.find((a) => next[a.key])?.key ?? null);
  }

  function toggleMethod(key: AxisKey) {
    commitEnabled({ ...enabled, [key]: !enabled[key] });
  }

  function patchThisAxis(key: AxisKey, value: string) {
    const values = valuesFromExtra(extra, enabled);
    values[key] = value;
    patchExtraFromValues(values, enabled);
  }

  function resolveLinkValue(p: Picked): string {
    if (!tab) return "";
    return (
      linkValue.trim() ||
      siblingValue(p, tab) ||
      guessAxisFromText(tab, p.name) ||
      thisValue(extra, tab).trim()
    );
  }

  async function syncThisProductFamily(nextIds: number[]) {
    const thisValues = valuesFromExtra(extra, enabled);
    await adminApi.updateProduct(productId, {
      catalog_extra: {
        ...(createSeed.catalog_extra || {}),
        option_color: thisValues.color,
        option_size: thisValues.size,
        option_pack: thisValues.pack,
        option_weight: thisValues.weight,
        option_flavor: thisValues.flavor,
        option_type: thisValues.type,
        option_label: buildLabel(thisValues),
        variant_axis: axisFromEnabled(enabled),
        variant_product_ids: nextIds,
      },
    });
  }

  /** Link existing product and stamp the active method value (+ companions). */
  async function linkAsOptionProduct(p: Picked) {
    if (!tab || linkedIds.includes(p.id)) return;
    const axisVal = resolveLinkValue(p);
    if (!axisVal) {
      setMsg(`Enter the ${tabMeta?.label.toLowerCase() ?? "option"} value before linking.`);
      return;
    }

    setLinking(true);
    setMsg("");
    try {
      let existingExtra: Record<string, unknown> = {};
      try {
        const full = await adminApi.product(p.id);
        existingExtra = ((full as { catalog_extra?: Record<string, unknown> }).catalog_extra ||
          {}) as Record<string, unknown>;
      } catch {
        existingExtra = {};
      }

      const thisValues = valuesFromExtra(extra, enabled);
      const linkedValues: Record<AxisKey, string> = { ...thisValues, [tab]: axisVal };
      // Prefer values already set on the linked SKU for other axes
      for (const key of AXIS_KEYS) {
        if (key === tab) continue;
        const existing = String(existingExtra[`option_${key}`] ?? "").trim();
        if (existing) linkedValues[key] = existing;
      }

      const family = Array.from(new Set([productId, ...linkedIds, p.id]));
      const patchBody: Record<string, unknown> = {
        catalog_extra: {
          ...existingExtra,
          option_color: linkedValues.color,
          option_size: linkedValues.size,
          option_pack: linkedValues.pack,
          option_weight: linkedValues.weight,
          option_flavor: linkedValues.flavor,
          option_type: linkedValues.type,
          option_label: buildLabel(linkedValues),
          variant_axis: axisFromEnabled(enabled),
          variant_product_ids: family.filter((id) => id !== p.id),
        },
      };
      if (tab === "pack" || tab === "size") patchBody.size = axisVal;
      if (tab === "weight") patchBody.weight = axisVal;

      await adminApi.updateProduct(p.id, patchBody);

      const nextIds = Array.from(new Set([...linkedIds, p.id]));
      onChange({
        variant_product_ids: nextIds,
        variant_axis: axisFromEnabled(enabled),
      });
      await syncThisProductFamily(nextIds);

      setLabels((prev) => ({
        ...prev,
        [p.id]: {
          ...p,
          option_color: linkedValues.color,
          option_size: linkedValues.size,
          option_pack: linkedValues.pack,
          option_weight: linkedValues.weight,
          option_flavor: linkedValues.flavor,
          option_type: linkedValues.type,
          option_label: buildLabel(linkedValues),
        },
      }));
      setQuery("");
      setHits([]);
      setLinkValue("");
      setMsg(`Linked “${axisVal}” (#${p.id}).`);
    } catch (err) {
      setMsg(friendlyError(err));
    } finally {
      setLinking(false);
    }
  }

  function removeLinked(id: number) {
    onChange({ variant_product_ids: linkedIds.filter((x) => x !== id) });
  }

  function openAdd() {
    if (!editing) {
      setMsg("Save this product first, then add options.");
      return;
    }
    if (!tab) return;
    setShowAdd(true);
    setDraftPrimary("");
    setMsg("");
    if (tab === "pack") setPackKind(detectPackKind(thisValue(extra, "pack") || "1L"));
  }

  async function createForActiveTab() {
    if (!editing || productId <= 0 || !tab) {
      setMsg("Save this product first, then add options.");
      return;
    }

    const primary = draftPrimary.trim();
    if (!primary) {
      setMsg(`Enter a ${tabMeta?.label.toLowerCase() ?? "value"} for the new product.`);
      return;
    }

    const values = valuesFromExtra(extra, enabled);
    values[tab] = primary;

    // Multi-axis: companion values must exist on this SKU
    const companions = AXIS_KEYS.filter((k) => enabled[k] && k !== tab);
    for (const key of companions) {
      if (!values[key].trim()) {
        const label = AXIS_META.find((a) => a.key === key)?.label ?? key;
        setMsg(`Set this SKU’s ${label} first (${label} tab), then add ${tabMeta?.label.toLowerCase()}.`);
        return;
      }
    }

    const suffix = buildLabel(values);
    const baseEn = String(createSeed.name?.English ?? createSeed.name?.english ?? "Product").trim();
    const baseAr = String(createSeed.name?.Arabic ?? createSeed.name?.arabic ?? "").trim();
    const cleanEn = baseEn.replace(/\s*[—–-]\s+.+$/, "").trim() || baseEn;
    const cleanAr = baseAr.replace(/\s*[—–-]\s+.+$/, "").trim() || baseAr;
    const skuBase = (createSeed.sku || `RB-${productId}`).trim();
    const skuSuffix = suffix.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toUpperCase();

    setCreating(true);
    setMsg("");
    try {
      const family = Array.from(new Set([productId, ...linkedIds]));
      const created = (await adminApi.createProduct({
        name: {
          English: `${cleanEn} — ${suffix}`.trim(),
          Arabic: cleanAr ? `${cleanAr} — ${suffix}`.trim() : "",
        },
        short_description: createSeed.short_description ?? { English: "", Arabic: "" },
        detailed_description: createSeed.detailed_description ?? { English: "", Arabic: "" },
        meta_title: {
          English: `${cleanEn} — ${suffix}`.trim(),
          Arabic: cleanAr ? `${cleanAr} — ${suffix}`.trim() : "",
        },
        meta_keyword: { English: "", Arabic: "" },
        meta_description: { English: "", Arabic: "" },
        sku: `${skuBase}-${skuSuffix || Date.now()}`.slice(0, 100),
        barcode: createSeed.barcode || "",
        uom: createSeed.uom || "PCS",
        size: tab === "pack" || tab === "size" ? primary : values.size || "",
        weight: tab === "weight" ? primary : values.weight || "",
        category_id: createSeed.category_id || 0,
        subcategory_id: createSeed.subcategory_id || 0,
        sub_subcategory_id: createSeed.sub_subcategory_id || 0,
        sub_sub_subcategory_id: createSeed.sub_sub_subcategory_id || 0,
        brand_id: createSeed.brand_id || 0,
        country_id: createSeed.country_id || 0,
        selling_price: createSeed.selling_price || 0,
        offer_price: createSeed.offer_price || 0,
        image: createSeed.image || "",
        featured: createSeed.featured || [],
        status: 0,
        save_later: true,
        store_ids: createSeed.store_ids || [],
        store_price: createSeed.selling_price || 0,
        store_soldout_status: 1,
        catalog_extra: {
          ...(createSeed.catalog_extra || {}),
          option_color: values.color,
          option_size: values.size,
          option_pack: values.pack,
          option_weight: values.weight,
          option_flavor: values.flavor,
          option_type: values.type,
          option_label: suffix,
          variant_axis: axisFromEnabled(enabled),
          variant_product_ids: family,
          related_product_ids: [],
          fbt_product_ids: [],
        },
      })) as { product_id?: number };

      const newId = Number(created.product_id || 0);
      if (!newId) throw new Error("Variant product created but id missing");

      const nextIds = Array.from(new Set([...linkedIds, newId]));
      onChange({
        variant_product_ids: nextIds,
        variant_axis: axisFromEnabled(enabled),
      });
      await syncThisProductFamily(nextIds);

      setLabels((prev) => ({
        ...prev,
        [newId]: {
          id: newId,
          name: `${cleanEn} — ${suffix}`.trim(),
          sku: `${skuBase}-${skuSuffix}`,
          option_color: values.color,
          option_size: values.size,
          option_pack: values.pack,
          option_weight: values.weight,
          option_flavor: values.flavor,
          option_type: values.type,
          option_label: suffix,
        },
      }));
      setDraftPrimary("");
      setShowAdd(false);
      setMsg(`Created “${suffix}”. Open Edit to set image & store price.`);
    } catch (err) {
      setMsg(friendlyError(err));
    } finally {
      setCreating(false);
    }
  }

  const companionNote = useMemo(() => {
    if (!tab) return "";
    const bits = AXIS_KEYS.filter((k) => enabled[k] && k !== tab && thisValue(extra, k).trim()).map((k) => {
      const label = AXIS_META.find((a) => a.key === k)?.label ?? k;
      return `${label}: ${thisValue(extra, k).trim()}`;
    });
    if (!bits.length) return "";
    return `New products keep ${bits.join(" · ")}`;
  }, [tab, enabled, extra]);

  const missingThisValue = tab ? !thisValue(extra, tab).trim() : false;

  return (
    <div className="pf-options-panel">
      <div className="pf-options-head">
        <div>
          <span className="pf-label">Product options</span>
          <p className="muted pf-hint">
            Each option value is a <strong>separate product</strong>, linked as one shopper family (Instamart-style).
          </p>
        </div>
      </div>

      <div className="pf-options-step">
        <span className="pf-options-step-num">1</span>
        <div className="pf-options-step-body">
          <span className="pf-options-methods-label">Enable methods</span>
          <p className="muted pf-hint">Turn on only what this family uses. Combine when needed (e.g. Color + Size, Flavor + Weight).</p>
          <div className="pf-options-axis-add">
            {AXIS_META.map((axis) => {
              const on = enabled[axis.key];
              return (
                <button
                  key={axis.key}
                  type="button"
                  className={`pf-options-axis-chip${on ? " is-on" : ""}`}
                  onClick={() => toggleMethod(axis.key)}
                  title={on ? `Disable ${axis.label}` : `Enable ${axis.label}`}
                  aria-pressed={on}
                >
                  {on ? <X size={14} /> : <Plus size={14} />}
                  <span>{axis.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {!anyAxis ? (
        <p className="muted pf-hint">Start by enabling Color, Size, Pack / volume, Weight, Flavor, or Type.</p>
      ) : (
        <>
          <div className="pf-options-tabs" role="tablist" aria-label="Option methods">
            {enabledAxes.map((axis) => (
              <button
                key={axis.key}
                type="button"
                role="tab"
                aria-selected={tab === axis.key}
                className={`pf-options-tab${tab === axis.key ? " is-active" : ""}`}
                onClick={() => {
                  setActiveTab(axis.key);
                  setShowAdd(false);
                  setMsg("");
                }}
              >
                {axis.label}
                {thisValue(extra, axis.key).trim() ? (
                  <span className="pf-options-tab-badge">{thisValue(extra, axis.key).trim()}</span>
                ) : null}
              </button>
            ))}
          </div>

          {tab && tabMeta ? (
            <div className="pf-options-tab-panel" role="tabpanel">
              <p className="muted pf-hint">{tabMeta.hint}</p>

              <div className="pf-options-step">
                <span className="pf-options-step-num">2</span>
                <div className="pf-options-step-body">
                  <div className="pf-options-this-field pf-options-tab-value">
                    <span className="pf-options-this-field-head">
                      <strong>This product’s {tabMeta.label}</strong>
                    </span>
                    {tab === "pack" ? (
                      <div className="pf-options-pack-kinds">
                        {PACK_KINDS.map((kind) => (
                          <button
                            key={kind.key}
                            type="button"
                            className={`pf-options-axis-chip${packKind === kind.key ? " is-on" : ""}`}
                            title={kind.hint}
                            onClick={() => setPackKind(kind.key)}
                          >
                            {kind.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <PresetRow
                      presets={tabPresets}
                      active={thisValue(extra, tab)}
                      onPick={(v) => {
                        patchThisAxis(tab, v);
                        if (tab === "pack") setPackKind(detectPackKind(v));
                      }}
                    />
                    <input
                      value={thisValue(extra, tab)}
                      onChange={(e) => {
                        patchThisAxis(tab, e.target.value);
                        if (tab === "pack" && e.target.value.trim()) {
                          setPackKind(detectPackKind(e.target.value));
                        }
                      }}
                      placeholder={
                        tab === "pack"
                          ? packKind === "volume"
                            ? "e.g. 1L"
                            : packKind === "multipack"
                              ? "e.g. 6-pack"
                              : "e.g. 8pcs"
                          : tabMeta.placeholder
                      }
                      aria-label={`This product’s ${tabMeta.label}`}
                    />
                  </div>
                  {missingThisValue ? (
                    <p className="muted pf-hint">Set this product’s value before creating or linking siblings.</p>
                  ) : null}
                </div>
              </div>

              <div className="pf-options-step">
                <span className="pf-options-step-num">3</span>
                <div className="pf-options-step-body">
                  <div className="pf-options-linked-head">
                    <span className="pf-label">
                      Linked {tabMeta.label.toLowerCase()} products ({siblings.length})
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary pf-options-add-axis-btn"
                      disabled={!editing}
                      title={editing ? tabMeta.addVerb : "Save product first"}
                      onClick={() => openAdd()}
                    >
                      <Plus size={14} />
                      {tabMeta.addVerb}
                    </button>
                  </div>

                  {showAdd ? (
                    <div className="pf-options-add">
                      <span className="pf-label">New {tabMeta.label.toLowerCase()} product</span>
                      {companionNote ? <p className="muted pf-hint">{companionNote}</p> : null}
                      <div className="pf-options-this-field">
                        <span>{tabMeta.label}</span>
                        <PresetRow presets={tabPresets} active={draftPrimary} onPick={setDraftPrimary} />
                        <input
                          value={draftPrimary}
                          onChange={(e) => setDraftPrimary(e.target.value)}
                          placeholder={tabMeta.placeholder}
                          autoFocus
                          aria-label={tabMeta.label}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void createForActiveTab();
                            }
                          }}
                        />
                      </div>
                      <div className="pf-options-add-actions">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={creating}
                          onClick={() => setShowAdd(false)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn"
                          disabled={creating}
                          onClick={() => void createForActiveTab()}
                        >
                          {creating ? "Creating…" : "Create product"}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="pf-options-list">
                    {siblings.map((p) => {
                      const axisVal = siblingValue(p, tab);
                      return (
                        <div key={p.id} className="pf-options-item">
                          <div className="pf-options-item-copy">
                            <strong>
                              {axisVal || optionBadge(p)}
                              {axisVal && optionBadge(p) !== axisVal ? (
                                <span className="muted"> · {optionBadge(p)}</span>
                              ) : null}
                            </strong>
                            <span className="muted">
                              {p.name} · #{p.id}
                              {p.sku ? ` · ${p.sku}` : ""}
                            </span>
                          </div>
                          <div className="pf-options-item-actions">
                            <Link
                              to={`/products/${p.id}/edit`}
                              className="pf-chip-edit"
                              title="Edit this product"
                            >
                              <ExternalLink size={12} />
                              Edit
                            </Link>
                            <button
                              type="button"
                              className="pf-chip-x"
                              aria-label={`Unlink ${p.name}`}
                              onClick={() => removeLinked(p.id)}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {!siblings.length ? (
                      <p className="muted pf-hint">
                        No siblings yet. Create one above, or search &amp; link below.
                      </p>
                    ) : null}
                  </div>

                  <div className="pf-options-link-existing is-open">
                    <span className="pf-label">Search &amp; link existing product</span>
                    <p className="muted pf-hint">
                      Finds catalog products and stamps this method’s value on the linked SKU.
                    </p>
                    <div className="pf-options-this-field">
                      <span>{tabMeta.label} value for linked product</span>
                      <PresetRow presets={tabPresets} active={linkValue} onPick={setLinkValue} />
                      <input
                        value={linkValue}
                        onChange={(e) => setLinkValue(e.target.value)}
                        placeholder={`Auto from name, or type e.g. ${tabMeta.placeholder.replace(/^e\.g\.\s*/i, "")}`}
                        aria-label={`${tabMeta.label} value for linked product`}
                      />
                    </div>
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={`Search by name, SKU${tab === "pack" ? ", 1L, 500ml" : ""}…`}
                    />
                    {busy ? <p className="muted pf-hint">Searching…</p> : null}
                    {hits.length > 0 ? (
                      <ul className="pf-picker-hits">
                        {hits.map((h) => {
                          const hint = siblingValue(h, tab);
                          return (
                            <li key={h.id}>
                              <button
                                type="button"
                                disabled={linking}
                                onClick={() => void linkAsOptionProduct(h)}
                              >
                                <strong>{h.name}</strong>
                                <span className="muted">
                                  #{h.id}
                                  {h.sku ? ` · ${h.sku}` : ""}
                                  {hint ? ` · ${tabMeta.label.toLowerCase()} ${hint}` : ""}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}

      {!editing ? (
        <p className="muted pf-hint">Save the product once before creating or linking option SKUs.</p>
      ) : null}

      {msg ? (
        <p
          className={`pf-options-msg${/could not|required|enter |save |set this|set the/i.test(msg) ? " is-error" : " is-ok"}`}
          role="status"
        >
          {msg}
        </p>
      ) : null}
    </div>
  );
}
