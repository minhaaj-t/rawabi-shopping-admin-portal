/** Shared grocery UOM model for admin product form + Units page. */

export type SellMode = "piece" | "weight" | "case";

export type UnitDef = {
  code: string;
  label: string;
  hint: string;
  group: "Count" | "Weight" | "Volume" | "Pack";
  /** How this UOM is typically sold in cart. */
  sellMode: SellMode;
  weighted?: boolean;
};

export const PRODUCT_UNITS: UnitDef[] = [
  {
    code: "PCS",
    label: "Pieces",
    hint: "One barcode = one countable item (can, bottle, loaf).",
    group: "Count",
    sellMode: "piece",
  },
  {
    code: "KG",
    label: "Kilogram",
    hint: "Price per kg · cart qty can be 0.25, 1.37…",
    group: "Weight",
    sellMode: "weight",
    weighted: true,
  },
  {
    code: "G",
    label: "Gram",
    hint: "Price per gram (prefer KG for produce when possible).",
    group: "Weight",
    sellMode: "weight",
    weighted: true,
  },
  {
    code: "GM",
    label: "Gram (legacy)",
    hint: "Same as G — kept for older SKUs.",
    group: "Weight",
    sellMode: "weight",
    weighted: true,
  },
  {
    code: "L",
    label: "Litre",
    hint: "Whole litre packs sold as 1 unit (not poured by volume).",
    group: "Volume",
    sellMode: "piece",
  },
  {
    code: "ML",
    label: "Millilitre",
    hint: "Whole ml packs (250ml bottle) sold as 1 unit.",
    group: "Volume",
    sellMode: "piece",
  },
  {
    code: "PACK",
    label: "Pack",
    hint: "Multi-pack SKU counted as one (e.g. pack of 6).",
    group: "Pack",
    sellMode: "case",
  },
  {
    code: "BOX",
    label: "Box / case",
    hint: "Wholesale case — qty is number of boxes.",
    group: "Pack",
    sellMode: "case",
  },
  {
    code: "BUNDLE",
    label: "Bundle",
    hint: "Promotional bundle SKU sold as one line item.",
    group: "Pack",
    sellMode: "case",
  },
];

export const WEIGHT_UOMS = ["KG", "G", "GM"] as const;
export const PIECE_UOMS = PRODUCT_UNITS.filter((u) => u.sellMode === "piece").map((u) => u.code);
export const CASE_UOMS = PRODUCT_UNITS.filter((u) => u.sellMode === "case").map((u) => u.code);

export const SELL_MODES: Array<{
  id: SellMode;
  title: string;
  short: string;
  blurb: string;
  example: string;
  defaultUom: string;
}> = [
  {
    id: "piece",
    title: "Piece / pack unit",
    short: "Piece",
    blurb: "Customer buys whole units (1, 2, 3…). Price is per piece or per labelled pack.",
    example: "Milk 1L · Eggs 12pcs · Bread",
    defaultUom: "PCS",
  },
  {
    id: "weight",
    title: "Sold by weight",
    short: "Weight",
    blurb: "Price is per kg/g. Cart allows decimal qty (e.g. 1.37 kg). Use for loose produce.",
    example: "Banana · Tomato · Chicken (loose)",
    defaultUom: "KG",
  },
  {
    id: "case",
    title: "Case / bundle SKU",
    short: "Case",
    blurb: "This barcode is a case or bundle. Qty is still whole numbers of that case — not loose pieces inside.",
    example: "Water 24×330ml case · Promo bundle",
    defaultUom: "BOX",
  },
];

export function unitByCode(code?: string | null): UnitDef | undefined {
  const c = String(code ?? "").trim().toUpperCase();
  return PRODUCT_UNITS.find((u) => u.code === c);
}

export function sellModeFromProduct(uom?: string | null, sellByWeight?: boolean): SellMode {
  if (sellByWeight) return "weight";
  const unit = unitByCode(uom);
  if (unit?.sellMode === "case") return "case";
  if (unit?.sellMode === "weight") return "piece"; // weight UOM without flag → treat as piece until enabled
  return "piece";
}

export function uomsForSellMode(mode: SellMode): UnitDef[] {
  if (mode === "weight") return PRODUCT_UNITS.filter((u) => u.sellMode === "weight");
  if (mode === "case") return PRODUCT_UNITS.filter((u) => u.sellMode === "case");
  return PRODUCT_UNITS.filter((u) => u.sellMode === "piece");
}

export function applySellMode(
  mode: SellMode,
  currentUom: string,
): { uom: string; sell_by_weight: boolean } {
  const allowed = uomsForSellMode(mode).map((u) => u.code);
  const uom = allowed.includes(currentUom.toUpperCase())
    ? currentUom.toUpperCase()
    : SELL_MODES.find((m) => m.id === mode)?.defaultUom || "PCS";
  return {
    uom,
    sell_by_weight: mode === "weight",
  };
}

export function priceLabelFor(uom?: string | null, sellByWeight?: boolean): string {
  if (!sellByWeight) return "each";
  const c = String(uom ?? "").toUpperCase();
  if (c === "KG") return "per kg";
  if (c === "G" || c === "GM") return "per g";
  return "per unit";
}
