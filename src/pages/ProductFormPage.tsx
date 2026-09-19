import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronDown, Plus, Trash2 } from "../lib/icons";
import { PfLocaleBar, type ProductLang } from "../components/PfLocaleBar";
import { ProductSeoPanel } from "../components/ProductSeoPanel";
import { ProductLinkPicker } from "../components/ProductLinkPicker";
import { ProductOptionsPanel } from "../components/ProductOptionsPanel";
import { MultiSelectDropdown } from "../components/MultiSelectDropdown";
import { ProductStorePricingCard } from "../components/ProductStorePricingCard";
import {
  emptyFeatureRow,
  mergeFeatureRow,
  translateFeatureRows,
  translateLocaleFields,
  type FeatureRow,
} from "../lib/product-locale";
import { adminApi } from "../lib/api";
import { getUser, isStorePortal } from "../lib/auth";
import { defaultSeoExtra, emptyLocale, mergeLocale, mergeSeoExtra, type SeoExtra } from "../lib/seo-utils";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { ImageCropDialog } from "../components/ImageCropDialog";
import { galleryImageFallbacks, productFeaturedImageFallbacks } from "../lib/media";
import {
  PRODUCT_UNITS,
  sellModeFromProduct,
  type SellMode,
} from "../lib/productUnits";

type Cat = { id: number; name: string };
type Brand = { id: number; name: string };
type Country = { id: number; name: string };
type Vendor = { id: number; name: string };
type StoreOpt = { ec_store_id: number; ec_store_name: string };
type GalleryItem = { image_name: string; image_priority: number; preview_url?: string | null; media_kind?: string };

const GALLERY_ACCEPT = "image/*,video/mp4,video/webm,video/quicktime,.gif,.mp4,.webm,.mov,.m4v";

function mediaKindFromName(name?: string | null): "image" | "gif" | "video" {
  const ext = String(name ?? "").split(".").pop()?.toLowerCase() ?? "";
  if (["mp4", "webm", "mov", "m4v"].includes(ext)) return "video";
  if (ext === "gif") return "gif";
  return "image";
}

function GalleryMediaPreview({
  filename,
  previewUrl,
  kind,
}: {
  filename: string;
  previewUrl?: string | null;
  kind: "image" | "gif" | "video";
}) {
  const sources = useMemo(
    () => galleryImageFallbacks(filename, previewUrl),
    [filename, previewUrl],
  );
  const [index, setIndex] = useState(0);
  const [broken, setBroken] = useState(false);
  const src = sources[index] ?? null;

  useEffect(() => {
    setIndex(0);
    setBroken(false);
  }, [filename, previewUrl]);

  if (!src || broken) {
    return (
      <div className="pf-gallery-preview is-empty">
        <span className="muted small">No preview</span>
      </div>
    );
  }

  const onMediaError = () => {
    if (index + 1 < sources.length) {
      setIndex((i) => i + 1);
      return;
    }
    setBroken(true);
  };

  return (
    <div className="pf-gallery-preview">
      {kind === "video" ? (
        <video
          key={src}
          className="pf-gallery-media"
          src={src}
          controls
          muted
          playsInline
          preload="metadata"
          onError={onMediaError}
        />
      ) : (
        <img
          key={src}
          className="pf-gallery-media"
          src={src}
          alt=""
          loading="lazy"
          onError={onMediaError}
        />
      )}
    </div>
  );
}

function FeaturedImagePreview({
  filename,
  imageUrl,
  onRemove,
}: {
  filename: string;
  imageUrl?: string | null;
  onRemove?: () => void;
}) {
  const sources = useMemo(
    () => productFeaturedImageFallbacks(filename, imageUrl),
    [filename, imageUrl],
  );
  const [index, setIndex] = useState(0);
  const [broken, setBroken] = useState(false);
  const src = sources[index] ?? null;

  useEffect(() => {
    setIndex(0);
    setBroken(false);
  }, [filename, imageUrl]);

  if (!src || broken) return null;

  return (
    <div className="pf-featured-preview">
      {onRemove ? (
        <button
          type="button"
          className="pf-featured-preview-remove"
          aria-label="Remove featured image"
          onClick={onRemove}
        >
          <Trash2 size={14} />
        </button>
      ) : null}
      <img
        key={src}
        className="product-thumb large"
        src={src}
        alt=""
        onError={() => {
          if (index + 1 < sources.length) {
            setIndex((i) => i + 1);
            return;
          }
          setBroken(true);
        }}
      />
    </div>
  );
}

const FEATURE_TAGS = [
  { id: 1, label: "Featured" },
  { id: 2, label: "Best Seller" },
  { id: 3, label: "Organic" },
  { id: 4, label: "Vegan" },
  { id: 5, label: "Online Exclusive" },
  { id: 6, label: "Rawabi Fresh" },
  { id: 7, label: "Special Deals" },
  { id: 8, label: "Limited Time Offer" },
  { id: 9, label: "Weekend Deals" },
  { id: 10, label: "Midweek Deals" },
  { id: 11, label: "Sunday Deals" },
  { id: 12, label: "Best Price" },
  { id: 13, label: "End of Sales" },
];

const LANGS = ["English", "Arabic"] as const;

type LocaleMap = Record<string, string>;

type CatalogExtra = {
  sell_by_weight: boolean;
  weight_step: number;
  min_qty: number;
  max_qty: number | null;
  gtin: string;
  video_url: string;
  ingredients: LocaleMap;
  allergens: LocaleMap;
  expiry_info: LocaleMap;
  shelf_life_days: number | null;
  age_restricted: boolean;
  age_min: number;
  related_product_ids: number[];
  fbt_product_ids: number[];
  variant_product_ids: number[];
  attribute_ids: number[];
  option_label: string;
  option_color: string;
  option_size: string;
  option_pack: string;
  option_weight: string;
  option_flavor: string;
  option_type: string;
  variant_axis: "auto" | "pack" | "color" | "size" | "weight" | "flavor" | "type" | "multi";
};

function emptyCatalogExtra(): CatalogExtra {
  return {
    sell_by_weight: false,
    weight_step: 0.1,
    min_qty: 0,
    max_qty: null,
    gtin: "",
    video_url: "",
    ingredients: emptyLocale(),
    allergens: emptyLocale(),
    expiry_info: emptyLocale(),
    shelf_life_days: null,
    age_restricted: false,
    age_min: 18,
    related_product_ids: [],
    fbt_product_ids: [],
    variant_product_ids: [],
    attribute_ids: [],
    option_label: "",
    option_color: "",
    option_size: "",
    option_pack: "",
    option_weight: "",
    option_flavor: "",
    option_type: "",
    variant_axis: "auto",
  };
}

function mergeCatalogExtra(raw: unknown): CatalogExtra {
  const base = emptyCatalogExtra();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  const merged: CatalogExtra = {
    ...base,
    sell_by_weight: Boolean(r.sell_by_weight),
    weight_step: Number(r.weight_step ?? 0.1) || 0.1,
    min_qty: Number(r.min_qty ?? 0) || 0,
    max_qty: r.max_qty === null || r.max_qty === undefined || r.max_qty === "" ? null : Number(r.max_qty),
    gtin: String(r.gtin ?? ""),
    video_url: String(r.video_url ?? ""),
    ingredients: mergeLocale(r.ingredients as Record<string, string> | null | undefined),
    allergens: mergeLocale(r.allergens as Record<string, string> | null | undefined),
    expiry_info: mergeLocale(r.expiry_info as Record<string, string> | null | undefined),
    shelf_life_days:
      r.shelf_life_days === null || r.shelf_life_days === undefined || r.shelf_life_days === ""
        ? null
        : Number(r.shelf_life_days),
    age_restricted: Boolean(r.age_restricted),
    age_min: Number(r.age_min ?? 18) || 18,
    related_product_ids: Array.isArray(r.related_product_ids)
      ? r.related_product_ids.map(Number).filter((n) => n > 0)
      : [],
    fbt_product_ids: Array.isArray(r.fbt_product_ids) ? r.fbt_product_ids.map(Number).filter((n) => n > 0) : [],
    variant_product_ids: Array.isArray(r.variant_product_ids)
      ? r.variant_product_ids.map(Number).filter((n) => n > 0)
      : [],
    attribute_ids: Array.isArray(r.attribute_ids) ? r.attribute_ids.map(Number).filter((n) => n > 0) : [],
    option_label: String(r.option_label ?? ""),
    option_color: String(r.option_color ?? ""),
    option_size: String(r.option_size ?? ""),
    option_pack: String(r.option_pack ?? ""),
    option_weight: String(r.option_weight ?? ""),
    option_flavor: String(r.option_flavor ?? ""),
    option_type: String(r.option_type ?? ""),
    variant_axis:
      r.variant_axis === "pack" ||
      r.variant_axis === "color" ||
      r.variant_axis === "size" ||
      r.variant_axis === "weight" ||
      r.variant_axis === "flavor" ||
      r.variant_axis === "type" ||
      r.variant_axis === "multi"
        ? r.variant_axis
        : "auto",
  };

  // Drop stale axis with no values and no linked siblings (e.g. leftover "size" on grocery SKUs)
  const hasOptionValue = Boolean(
    merged.option_color.trim() ||
      merged.option_size.trim() ||
      merged.option_pack.trim() ||
      merged.option_weight.trim() ||
      merged.option_flavor.trim() ||
      merged.option_type.trim(),
  );
  if (!hasOptionValue && merged.variant_product_ids.length === 0 && merged.variant_axis !== "auto") {
    merged.variant_axis = "auto";
  }

  return merged;
}

/** Core sections stay open; secondary sections start collapsed. */
const PF_SECTION_DEFAULTS: Record<string, boolean> = {
  identity: true,
  description: true,
  pricing: true,
  weight: false,
  compliance: false,
  attributes: false,
  merch: false,
  shipping: false,
  specs: false,
  seo: false,
  media: true,
};

function localeFilled(m: LocaleMap | undefined): boolean {
  if (!m) return false;
  return Boolean((m.English ?? "").trim() || (m.Arabic ?? "").trim());
}

function Section({
  title,
  subtitle,
  summary,
  open,
  onToggle,
  children,
  id,
}: {
  title: string;
  subtitle?: string;
  /** Shown when collapsed so filled secondary sections stay visible at a glance. */
  summary?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className={`pf-section${open ? " is-open" : ""}`}>
      <button type="button" className="pf-section-head" onClick={onToggle} aria-expanded={open}>
        <span className="pf-section-head-text">
          <strong>{title}</strong>
          {!open && summary ? <span className="pf-section-summary">{summary}</span> : null}
          {open && subtitle ? <span className="muted">{subtitle}</span> : null}
        </span>
        <ChevronDown size={16} className="pf-chevron" />
      </button>
      {open ? <div className="pf-section-body">{children}</div> : null}
    </section>
  );
}

function SideCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="card pf-side-card">
      <h3 className="pf-side-title">{title}</h3>
      {children}
    </aside>
  );
}

export function ProductFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const editing = Boolean(id);
  const productId = id ? Number(id) : 0;
  const navigate = useNavigate();
  const storePortal = isStorePortal(getUser());

  const [lang, setLang] = useState<(typeof LANGS)[number]>("English");
  const [open, setOpen] = useState<Record<string, boolean>>({ ...PF_SECTION_DEFAULTS });

  const [name, setName] = useState<LocaleMap>(emptyLocale());
  const [shortDescription, setShortDescription] = useState<LocaleMap>(emptyLocale());
  const [detailedDescription, setDetailedDescription] = useState<LocaleMap>(emptyLocale());
  const [metaTitle, setMetaTitle] = useState<LocaleMap>(emptyLocale());
  const [metaKeyword, setMetaKeyword] = useState<LocaleMap>(emptyLocale());
  const [metaDescription, setMetaDescription] = useState<LocaleMap>(emptyLocale());
  const [seoExtra, setSeoExtra] = useState<SeoExtra>(defaultSeoExtra());
  const [features, setFeatures] = useState<FeatureRow[]>([emptyFeatureRow()]);
  const [gallery, setGallery] = useState<GalleryItem[]>([{ image_name: "", image_priority: 0 }]);
  const [variantText, setVariantText] = useState("");

  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [uom, setUom] = useState("PCS");
  const [sellMode, setSellMode] = useState<SellMode>("piece");
  const [weight, setWeight] = useState("");
  const [size, setSize] = useState("");
  const [tags, setTags] = useState("");
  const [seller, setSeller] = useState("");
  const [image, setImage] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [featuredCropFile, setFeaturedCropFile] = useState<File | null>(null);
  const [deliveryDays, setDeliveryDays] = useState("");
  const [returnDays, setReturnDays] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("COD, Online");
  const [sellingPrice, setSellingPrice] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [maxQty, setMaxQty] = useState("");
  const [priority, setPriority] = useState("");
  const [deliveredBy, setDeliveredBy] = useState("Store");
  const [status, setStatus] = useState("1");
  const [saveLater, setSaveLater] = useState(false);
  const [featured, setFeatured] = useState<number[]>([]);
  const [catalogExtra, setCatalogExtra] = useState<CatalogExtra>(emptyCatalogExtra());
  const [attrOptions, setAttrOptions] = useState<Array<{ id: number; title: string }>>([]);

  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [subSubcategoryId, setSubSubcategoryId] = useState("");
  const [subSubSubcategoryId, setSubSubSubcategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [countryId, setCountryId] = useState("");

  const [categories, setCategories] = useState<Cat[]>([]);
  const [subcategories, setSubcategories] = useState<Cat[]>([]);
  const [subSubcategories, setSubSubcategories] = useState<Cat[]>([]);
  const [subSubSubcategories, setSubSubSubcategories] = useState<Cat[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [stores, setStores] = useState<StoreOpt[]>([]);
  const [storeIds, setStoreIds] = useState<number[]>([]);
  const [linkedStores, setLinkedStores] = useState<
    Array<{
      store_product_id?: number;
      store_id: number;
      name: string;
      price: number;
      offer_price?: number;
      stock: number;
      soldout_status: number;
    }>
  >([]);

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(editing);
  const [translatingSection, setTranslatingSection] = useState<string | null>(null);

  const title = useMemo(() => (editing ? `Edit product #${productId}` : "Add product"), [editing, productId]);
  const margin = useMemo(() => {
    const sell = Number(sellingPrice || 0);
    const cost = Number(purchasePrice || 0);
    if (!sell || !cost) return null;
    return (((sell - cost) / sell) * 100).toFixed(1);
  }, [sellingPrice, purchasePrice]);

  const brandName = useMemo(() => {
    if (!brandId) return undefined;
    return brands.find((b) => b.id === Number(brandId))?.name;
  }, [brandId, brands]);

  const sectionSummaries = useMemo(() => {
    const attrN = catalogExtra.attribute_ids.length;
    const merchBits: string[] = [];
    if (featured.length) merchBits.push(`${featured.length} featured`);
    if (catalogExtra.related_product_ids.length) merchBits.push(`${catalogExtra.related_product_ids.length} related`);
    if (catalogExtra.fbt_product_ids.length) merchBits.push(`${catalogExtra.fbt_product_ids.length} FBT`);
    if (catalogExtra.variant_product_ids.length) merchBits.push(`${catalogExtra.variant_product_ids.length} variants`);
    const complianceBits: string[] = [];
    if (localeFilled(catalogExtra.ingredients)) complianceBits.push("ingredients");
    if (localeFilled(catalogExtra.allergens)) complianceBits.push("allergens");
    if (localeFilled(catalogExtra.expiry_info)) complianceBits.push("expiry");
    if (catalogExtra.shelf_life_days != null) complianceBits.push("shelf life");
    if (catalogExtra.age_restricted) complianceBits.push(`age ${catalogExtra.age_min}+`);
    const specN = features.filter((f) => localeFilled(f.title) || localeFilled(f.text)).length;
    const shipBits = [weight, size, deliveryDays, returnDays].filter((v) => String(v ?? "").trim()).length;
    const seoConfigured =
      localeFilled(metaTitle) ||
      localeFilled(metaKeyword) ||
      localeFilled(metaDescription) ||
      localeFilled(seoExtra.focus_keyword) ||
      Boolean(seoExtra.noindex) ||
      (seoExtra.faq?.length ?? 0) > 0;
    return {
      weight: sellMode === "weight" ? `Sell by weight · ${uom || "KG"}` : "Piece / case — closed",
      compliance: complianceBits.length ? complianceBits.join(" · ") : "Empty",
      attributes: attrN ? `${attrN} selected` : "None selected",
      merch: merchBits.length ? merchBits.join(" · ") : "Empty",
      shipping: shipBits ? `${shipBits} field${shipBits === 1 ? "" : "s"} set` : "Empty",
      specs: specN ? `${specN} row${specN === 1 ? "" : "s"}` : "Empty",
      seo: seoConfigured ? "Configured" : "Empty",
    };
  }, [
    catalogExtra,
    featured.length,
    features,
    sellMode,
    uom,
    weight,
    size,
    deliveryDays,
    returnDays,
    metaTitle,
    metaKeyword,
    metaDescription,
    seoExtra.focus_keyword,
    seoExtra.noindex,
    seoExtra.faq,
  ]);

  function toggleSection(key: string) {
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function runTranslate(section: string, work: () => Promise<void>) {
    setTranslatingSection(section);
    setError("");
    try {
      await work();
      setLang("Arabic");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Translation failed");
    } finally {
      setTranslatingSection(null);
    }
  }

  async function translateDescriptionSection() {
    if (!shortDescription.English.trim() && !detailedDescription.English.trim()) {
      setError("Enter English description before translating");
      setOpen((prev) => ({ ...prev, description: true }));
      return;
    }
    await runTranslate("description", async () => {
      const [nextShort, nextDetailed] = await translateLocaleFields([shortDescription, detailedDescription]);
      setShortDescription(nextShort);
      setDetailedDescription(nextDetailed);
    });
  }

  async function translateSpecsSection() {
    const hasEnglish = features.some((f) => f.title.English.trim() || f.text.English.trim());
    if (!hasEnglish) {
      setError("Enter English specification labels/values before translating");
      setOpen((prev) => ({ ...prev, specs: true }));
      return;
    }
    await runTranslate("specs", async () => {
      setFeatures(await translateFeatureRows(features));
    });
  }

  async function translateComplianceSection() {
    const en =
      (catalogExtra.ingredients.English || "") +
      (catalogExtra.allergens.English || "") +
      (catalogExtra.expiry_info.English || "");
    if (!en.trim()) {
      setError("Enter English ingredients, allergens, or expiry before translating");
      setOpen((prev) => ({ ...prev, compliance: true }));
      return;
    }
    await runTranslate("compliance", async () => {
      const [ingredients, allergens, expiry_info] = await translateLocaleFields([
        catalogExtra.ingredients,
        catalogExtra.allergens,
        catalogExtra.expiry_info,
      ]);
      setCatalogExtra((prev) => ({ ...prev, ingredients, allergens, expiry_info }));
    });
  }

  function onUomChange(nextUom: string) {
    const code = nextUom.toUpperCase();
    setUom(code);
    const unit = PRODUCT_UNITS.find((u) => u.code === code);
    if (unit?.sellMode === "weight") {
      setSellMode("weight");
      setCatalogExtra((prev) => ({ ...prev, sell_by_weight: true }));
      setOpen((prev) => ({ ...prev, weight: true }));
    } else if (catalogExtra.sell_by_weight) {
      setCatalogExtra((prev) => ({ ...prev, sell_by_weight: false }));
      setSellMode(unit?.sellMode === "case" ? "case" : "piece");
    } else if (unit?.sellMode === "case") {
      setSellMode("case");
    } else {
      setSellMode("piece");
    }
  }

  useEffect(() => {
    if (storePortal) navigate("/products", { replace: true });
  }, [storePortal, navigate]);

  useEffect(() => {
    adminApi
      .categories(0)
      .then((list) => setCategories(list.map((c) => ({ id: Number(c.id), name: String(c.name ?? "") }))))
      .catch(() => undefined);
    adminApi
      .brands({ per_page: 100 })
      .then((res) => setBrands(res.items.map((b) => ({ id: Number(b.id), name: String(b.name ?? "") }))))
      .catch(() => undefined);
    adminApi
      .countries()
      .then((list) =>
        setCountries(
          list.map((c) => {
            const row = c as { ec_country_id?: number; id?: number; ec_country_name?: string; name?: string };
            let label = String(row.ec_country_name ?? row.name ?? "");
            try {
              const parsed = JSON.parse(label) as Record<string, string>;
              if (parsed && typeof parsed === "object") label = parsed.English ?? parsed.english ?? label;
            } catch {
              /* plain string */
            }
            return { id: Number(row.ec_country_id ?? row.id ?? 0), name: label };
          }),
        ),
      )
      .catch(() => undefined);
    adminApi
      .vendors({ per_page: 100 })
      .then((res) =>
        setVendors(
          res.items.map((v) => ({
            id: Number(v.ec_vender_id ?? v.id ?? 0),
            name: String(v.ec_vender_username ?? v.name ?? ""),
          })),
        ),
      )
      .catch(() => undefined);
    adminApi.stores().then(setStores).catch(() => undefined);
    adminApi
      .parameters()
      .then((rows) =>
        setAttrOptions(
          rows.map((r) => ({
            id: Number(r.ec_p_id ?? r.id ?? 0),
            title: String(r.ec_p_title ?? r.title ?? ""),
          })).filter((r) => r.id > 0),
        ),
      )
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!categoryId) {
      setSubcategories([]);
      return;
    }
    adminApi
      .categories(Number(categoryId))
      .then((list) => setSubcategories(list.map((c) => ({ id: Number(c.id), name: String(c.name ?? "") }))))
      .catch(() => setSubcategories([]));
  }, [categoryId]);

  useEffect(() => {
    if (!subcategoryId) {
      setSubSubcategories([]);
      return;
    }
    adminApi
      .categories(Number(subcategoryId))
      .then((list) => setSubSubcategories(list.map((c) => ({ id: Number(c.id), name: String(c.name ?? "") }))))
      .catch(() => setSubSubcategories([]));
  }, [subcategoryId]);

  useEffect(() => {
    if (!subSubcategoryId) {
      setSubSubSubcategories([]);
      return;
    }
    adminApi
      .categories(Number(subSubcategoryId))
      .then((list) => setSubSubSubcategories(list.map((c) => ({ id: Number(c.id), name: String(c.name ?? "") }))))
      .catch(() => setSubSubSubcategories([]));
  }, [subSubcategoryId]);

  useEffect(() => {
    if (!editing || !productId) return;
    setLoading(true);
    adminApi
      .product(productId)
      .then((p) => {
        setName(mergeLocale(p.name));
        setShortDescription(mergeLocale(p.short_description));
        setDetailedDescription(mergeLocale(p.detailed_description));
        setMetaTitle(mergeLocale(p.meta_title));
        setMetaKeyword(mergeLocale(p.meta_keyword));
        setMetaDescription(mergeLocale(p.meta_description));
        setSeoExtra(mergeSeoExtra(p.seo_extra));
        setFeatures(p.features?.length ? p.features.map((f) => mergeFeatureRow(f)) : [emptyFeatureRow()]);
        setGallery(
          p.gallery?.length
            ? p.gallery.map((g) => ({
                image_name: g.image_name,
                image_priority: g.image_priority,
                preview_url: (g as { image_url?: string | null }).image_url ?? null,
                media_kind: (g as { media_kind?: string }).media_kind ?? mediaKindFromName(g.image_name),
              }))
            : [{ image_name: "", image_priority: 0 }],
        );
        setVariantText((p.variant ?? []).join(", "));
        setSku(p.sku ?? "");
        setBarcode(p.barcode ?? "");
        setUom(p.uom || "PCS");
        setWeight(p.weight ?? "");
        setSize(p.size ?? "");
        setTags(p.tags ?? "");
        setSeller(p.seller ? String(p.seller) : "");
        setImage(p.image ?? "");
        setImageUrl(p.image_url);
        setDeliveryDays(p.delivery_days != null && p.delivery_days !== "" ? String(p.delivery_days) : "");
        setReturnDays(p.return_days != null && p.return_days !== "" ? String(p.return_days) : "");
        setPaymentMethod(p.payment_method || "COD, Online");
        setSellingPrice(String(p.selling_price ?? ""));
        setOfferPrice(String(p.offer_price ?? ""));
        setPurchasePrice(String(p.purchase_price ?? ""));
        setMaxQty(String(p.max_qty ?? ""));
        setPriority(p.priority != null ? String(p.priority) : "");
        setDeliveredBy(p.delivered_by || "Store");
        setStatus(String(p.status ?? 1));
        setSaveLater(Boolean(p.save_later));
        setFeatured(p.featured ?? []);
        const extra = mergeCatalogExtra((p as { catalog_extra?: unknown }).catalog_extra);
        setCatalogExtra(extra);
        setSellMode(sellModeFromProduct(p.uom || "PCS", extra.sell_by_weight));
        setCategoryId(p.category_id ? String(p.category_id) : "");
        setSubcategoryId(p.subcategory_id ? String(p.subcategory_id) : "");
        setSubSubcategoryId(p.sub_subcategory_id ? String(p.sub_subcategory_id) : "");
        setSubSubSubcategoryId(p.sub_sub_subcategory_id ? String(p.sub_sub_subcategory_id) : "");
        setBrandId(p.brand_id ? String(p.brand_id) : "");
        setCountryId(p.country_id ? String(p.country_id) : "");
        setLinkedStores(p.stores ?? []);
        setStoreIds((p.stores ?? []).map((s) => s.store_id));

        // Keep core sections open; only expand secondary sections that already have data.
        const mode = sellModeFromProduct(p.uom || "PCS", extra.sell_by_weight);
        const featureFilled = (p.features ?? []).some((f) => {
          const row = mergeFeatureRow(f);
          return localeFilled(row.title) || localeFilled(row.text);
        });
        const seoExtraMerged = mergeSeoExtra(p.seo_extra);
        const seoFilled =
          localeFilled(mergeLocale(p.meta_title)) ||
          localeFilled(mergeLocale(p.meta_keyword)) ||
          localeFilled(mergeLocale(p.meta_description)) ||
          localeFilled(seoExtraMerged.focus_keyword) ||
          Boolean(seoExtraMerged.noindex) ||
          (seoExtraMerged.faq?.length ?? 0) > 0;
        setOpen({
          ...PF_SECTION_DEFAULTS,
          weight: mode === "weight",
          compliance:
            localeFilled(extra.ingredients) ||
            localeFilled(extra.allergens) ||
            localeFilled(extra.expiry_info) ||
            extra.shelf_life_days != null ||
            Boolean(extra.age_restricted),
          attributes: (extra.attribute_ids?.length ?? 0) > 0,
          merch:
            (p.featured?.length ?? 0) > 0 ||
            (extra.related_product_ids?.length ?? 0) > 0 ||
            (extra.fbt_product_ids?.length ?? 0) > 0 ||
            (extra.variant_product_ids?.length ?? 0) > 0 ||
            Boolean(
              extra.option_color?.trim() ||
                extra.option_size?.trim() ||
                extra.option_pack?.trim() ||
                extra.option_weight?.trim() ||
                extra.option_flavor?.trim() ||
                extra.option_type?.trim(),
            ),
          shipping: Boolean(
            (p.weight ?? "").toString().trim() ||
              (p.size ?? "").toString().trim() ||
              (p.delivery_days != null && String(p.delivery_days).trim()) ||
              (p.return_days != null && String(p.return_days).trim()) ||
              (p.payment_method && p.payment_method !== "COD, Online") ||
              (p.delivered_by && p.delivered_by !== "Store"),
          ),
          specs: featureFilled,
          seo: seoFilled,
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [editing, productId]);

  useEffect(() => {
    if (loading || searchParams.get("section") !== "seo") return;
    setOpen((prev) => ({ ...prev, seo: true }));
    const timer = window.setTimeout(() => {
      document.getElementById("product-seo-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [loading, searchParams]);

  function uploadTitle() {
    return name.English.trim() || sku.trim() || "product";
  }

  async function onFeaturedUpload(file: File | null) {
    if (!file) return;
    setError("");
    try {
      const uploaded = await adminApi.uploadProductImage(file, "featured", uploadTitle());
      setImage(uploaded.filename);
      setImageUrl(uploaded.url);
      setFeaturedCropFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Featured image upload failed");
      throw e;
    }
  }

  function onFeaturedFilePicked(file: File | null) {
    if (!file) return;
    setError("");
    setFeaturedCropFile(file);
  }

  async function onGalleryUpload(index: number, file: File | null) {
    if (!file) return;
    setError("");
    try {
      const uploaded = await adminApi.uploadProductImage(file, "gallery", uploadTitle());
      setGallery((prev) =>
        prev.map((row, i) =>
          i === index
            ? {
                ...row,
                image_name: uploaded.filename,
                preview_url: uploaded.url,
                media_kind: uploaded.media_kind ?? mediaKindFromName(uploaded.filename),
              }
            : row,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gallery media upload failed");
    }
  }

  async function onSubmit(e: FormEvent, asDraft = false) {
    e.preventDefault();
    if (!name.English.trim()) {
      setError("English item name is required");
      setOpen((prev) => ({ ...prev, identity: true }));
      return;
    }
    if (!sku.trim()) {
      setError("SKU is required");
      setOpen((prev) => ({ ...prev, identity: true }));
      return;
    }

    const draft = asDraft || saveLater;
    setSaving(true);
    setError("");

    const body: Record<string, unknown> = {
      name,
      short_description: shortDescription,
      detailed_description: detailedDescription,
      meta_title: metaTitle,
      meta_keyword: metaKeyword,
      meta_description: metaDescription,
      seo_extra: seoExtra,
      features: features.filter(
        (f) => f.title.English.trim() || f.title.Arabic.trim() || f.text.English.trim() || f.text.Arabic.trim(),
      ),
      gallery: gallery.filter((g) => g.image_name.trim()),
      variant: variantText
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
      sku: sku || null,
      barcode: barcode || null,
      uom: uom || null,
      weight: weight || null,
      size: size || null,
      tags: tags || null,
      seller: seller || null,
      image: image || null,
      delivery_days: deliveryDays.trim() || null,
      return_days: returnDays.trim() || null,
      payment_method: paymentMethod || null,
      selling_price: sellingPrice === "" ? 0 : Number(sellingPrice),
      offer_price: offerPrice === "" ? 0 : Number(offerPrice),
      purchase_price: purchasePrice === "" ? 0 : Number(purchasePrice),
      max_qty: maxQty === "" ? 0 : Number(maxQty),
      priority: priority === "" ? null : Number(priority),
      delivered_by: deliveredBy || null,
      status: draft ? 0 : Number(status),
      save_later: draft,
      featured,
      catalog_extra: {
        ...catalogExtra,
        sell_by_weight: sellMode === "weight",
      },
      category_id: categoryId ? Number(categoryId) : 0,
      subcategory_id: subcategoryId ? Number(subcategoryId) : 0,
      sub_subcategory_id: subSubcategoryId ? Number(subSubcategoryId) : 0,
      sub_sub_subcategory_id: subSubSubcategoryId ? Number(subSubSubcategoryId) : 0,
      brand_id: brandId ? Number(brandId) : 0,
      country_id: countryId ? Number(countryId) : 0,
    };

    try {
      if (editing) {
        await adminApi.updateProduct(productId, body);
        navigate("/products");
      } else {
        body.store_ids = storeIds;
        body.store_price = sellingPrice === "" ? 0 : Number(sellingPrice);
        body.store_soldout_status = 1;
        const created = (await adminApi.createProduct(body)) as { product_id?: number };
        navigate(created.product_id ? `/products/${created.product_id}/edit` : "/products");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div>
        <div className="page-head">
          <h1>{title}</h1>
        </div>
        <LoadingIndicator padded />
      </div>
    );
  }

  return (
    <div className="product-form-page">
      <div className="page-head">
        <div>
          <h1>{title}</h1>
        </div>
        <div className="actions">
          <Link className="btn btn-secondary" to="/products">
            Back
          </Link>
          <button type="button" className="btn btn-secondary" disabled={saving} onClick={(e) => void onSubmit(e, true)}>
            Draft
          </button>
          <button type="button" className="btn" disabled={saving} onClick={(e) => void onSubmit(e, false)}>
            {saving ? "Saving…" : editing ? "Update" : "Publish"}
          </button>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <form className="product-form-layout" onSubmit={(e) => void onSubmit(e, false)}>
        <div className="product-form-main">
          <Section
            id="pf-identity"
            title="Basics"
            open={open.identity}
            onToggle={() => toggleSection("identity")}
          >
            <PfLocaleBar lang={lang as ProductLang} onLangChange={setLang} />
            <div className="pf-grid">
              <label className="pf-span-2">
                Product name ({lang}) {lang === "English" ? "*" : ""}
                <input
                  value={name[lang] ?? ""}
                  onChange={(e) => setName((prev) => ({ ...prev, [lang]: e.target.value }))}
                  required={lang === "English"}
                  placeholder="e.g. Al Rawabi Fresh Milk 1L"
                  dir={lang === "Arabic" ? "rtl" : undefined}
                />
              </label>
              <label>
                SKU *
                <input value={sku} onChange={(e) => setSku(e.target.value)} required placeholder="RB-XXXX" />
              </label>
              <label>
                Barcode
                <input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Optional" />
              </label>
              <label>
                Unit
                <select value={uom} onChange={(e) => onUomChange(e.target.value)}>
                  {PRODUCT_UNITS.map((u) => (
                    <option key={u.code} value={u.code}>
                      {u.code} — {u.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </Section>

          <Section
            id="pf-description"
            title="Descriptions"
            open={open.description}
            onToggle={() => toggleSection("description")}
          >
            <PfLocaleBar
              lang={lang as ProductLang}
              onLangChange={setLang}
              showTranslate
              translating={translatingSection === "description"}
              onTranslate={translateDescriptionSection}
            />
            <div className="pf-grid">
              <label className="pf-span-2">
                Short description ({lang})
                <textarea
                  rows={2}
                  value={shortDescription[lang] ?? ""}
                  onChange={(e) => setShortDescription((prev) => ({ ...prev, [lang]: e.target.value }))}
                  placeholder="One-line pitch shown on cards"
                  dir={lang === "Arabic" ? "rtl" : undefined}
                />
              </label>
              <label className="pf-span-2">
                Detailed description ({lang})
                <textarea
                  rows={5}
                  value={detailedDescription[lang] ?? ""}
                  onChange={(e) => setDetailedDescription((prev) => ({ ...prev, [lang]: e.target.value }))}
                  placeholder="Full product story, ingredients, storage…"
                  dir={lang === "Arabic" ? "rtl" : undefined}
                />
              </label>
            </div>
          </Section>

          <Section
            id="pf-pricing"
            title="Pricing"
            open={open.pricing}
            onToggle={() => toggleSection("pricing")}
          >
            <div className="pf-grid">
              <label>
                Selling price *
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  placeholder="0.00"
                />
              </label>
              <label>
                Offer / sale price
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                  placeholder="0 = no offer"
                />
              </label>
              <label>
                Purchase / cost
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                />
              </label>
              <label>
                Minimum purchase qty
                <input
                  type="number"
                  min={0}
                  step={catalogExtra.sell_by_weight ? catalogExtra.weight_step || 0.1 : 1}
                  value={catalogExtra.min_qty || ""}
                  onChange={(e) =>
                    setCatalogExtra((prev) => ({ ...prev, min_qty: Number(e.target.value) || 0 }))
                  }
                  placeholder="0 = no minimum"
                />
              </label>
              <label>
                Maximum purchase qty
                <input
                  type="number"
                  min="0"
                  value={maxQty}
                  onChange={(e) => setMaxQty(e.target.value)}
                  placeholder="Per cart / order"
                />
              </label>
            </div>
            {margin || (offerPrice && Number(offerPrice) > 0 && Number(sellingPrice) > 0) ? (
              <div className="pf-hints">
                {margin ? <p className="muted pf-hint">Approx. margin vs selling price: {margin}%</p> : null}
                {offerPrice && Number(offerPrice) > 0 && Number(sellingPrice) > 0 ? (
                  <p className="muted pf-hint">
                    Discount:{" "}
                    {(((Number(sellingPrice) - Number(offerPrice)) / Number(sellingPrice)) * 100).toFixed(0)}% off
                  </p>
                ) : null}
              </div>
            ) : null}
          </Section>

          <Section
            id="pf-weight"
            title="Weight"
            summary={sectionSummaries.weight}
            open={open.weight}
            onToggle={() => toggleSection("weight")}
          >
            {sellMode !== "weight" ? (
              <p className="muted">Choose a weight unit (KG / G) under Basics to enable this section.</p>
            ) : (
              <div className="pf-grid">
                <label>
                  Weight step
                  <input
                    type="number"
                    min={0.001}
                    step="0.01"
                    value={catalogExtra.weight_step}
                    onChange={(e) =>
                      setCatalogExtra((prev) => ({ ...prev, weight_step: Number(e.target.value) || 0.1 }))
                    }
                  />
                </label>
                <label>
                  Min qty ({uom || "KG"})
                  <input
                    type="number"
                    min={0}
                    step={catalogExtra.weight_step || 0.1}
                    value={catalogExtra.min_qty}
                    onChange={(e) =>
                      setCatalogExtra((prev) => ({ ...prev, min_qty: Number(e.target.value) || 0 }))
                    }
                  />
                </label>
                <label>
                  Max qty ({uom || "KG"})
                  <input
                    type="number"
                    min={0}
                    step={catalogExtra.weight_step || 0.1}
                    value={catalogExtra.max_qty ?? ""}
                    onChange={(e) =>
                      setCatalogExtra((prev) => ({
                        ...prev,
                        max_qty: e.target.value === "" ? null : Number(e.target.value),
                      }))
                    }
                  />
                </label>
              </div>
            )}
          </Section>

          <Section
            id="pf-compliance"
            title="Compliance"
            summary={sectionSummaries.compliance}
            open={open.compliance}
            onToggle={() => toggleSection("compliance")}
          >
            <PfLocaleBar
              lang={lang as ProductLang}
              onLangChange={setLang}
              showTranslate
              translating={translatingSection === "compliance"}
              onTranslate={translateComplianceSection}
            />
            <div className="pf-grid">
              <label>
                GTIN / EAN-13
                <input
                  value={catalogExtra.gtin}
                  onChange={(e) => setCatalogExtra((prev) => ({ ...prev, gtin: e.target.value }))}
                  placeholder="Optional"
                />
              </label>
              <label className="pf-span-2">
                Ingredients ({lang})
                <textarea
                  rows={3}
                  value={catalogExtra.ingredients[lang] ?? ""}
                  onChange={(e) =>
                    setCatalogExtra((prev) => ({
                      ...prev,
                      ingredients: { ...prev.ingredients, [lang]: e.target.value },
                    }))
                  }
                  dir={lang === "Arabic" ? "rtl" : undefined}
                  placeholder="List ingredients as shown on pack"
                />
              </label>
              <label className="pf-span-2">
                Allergens ({lang})
                <textarea
                  rows={2}
                  value={catalogExtra.allergens[lang] ?? ""}
                  onChange={(e) =>
                    setCatalogExtra((prev) => ({
                      ...prev,
                      allergens: { ...prev.allergens, [lang]: e.target.value },
                    }))
                  }
                  dir={lang === "Arabic" ? "rtl" : undefined}
                  placeholder="Contains milk, nuts…"
                />
              </label>
              <label className="pf-span-2">
                Expiry information ({lang})
                <textarea
                  rows={2}
                  value={catalogExtra.expiry_info[lang] ?? ""}
                  onChange={(e) =>
                    setCatalogExtra((prev) => ({
                      ...prev,
                      expiry_info: { ...prev.expiry_info, [lang]: e.target.value },
                    }))
                  }
                  dir={lang === "Arabic" ? "rtl" : undefined}
                  placeholder="Use within 3 days of opening…"
                />
              </label>
              <label>
                Shelf-life (days)
                <input
                  type="number"
                  min={0}
                  value={catalogExtra.shelf_life_days ?? ""}
                  onChange={(e) =>
                    setCatalogExtra((prev) => ({
                      ...prev,
                      shelf_life_days: e.target.value === "" ? null : Number(e.target.value),
                    }))
                  }
                  placeholder="e.g. 7"
                />
              </label>
              <label className="pf-span-2">
                <span className="pf-check" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={catalogExtra.age_restricted}
                    onChange={(e) =>
                      setCatalogExtra((prev) => ({ ...prev, age_restricted: e.target.checked }))
                    }
                  />
                  Age-restricted product (alcohol / tobacco / restricted category)
                </span>
              </label>
              {catalogExtra.age_restricted ? (
                <label>
                  Minimum age
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={catalogExtra.age_min}
                    onChange={(e) =>
                      setCatalogExtra((prev) => ({ ...prev, age_min: Number(e.target.value) || 18 }))
                    }
                  />
                </label>
              ) : null}
            </div>
          </Section>

          <Section
            id="pf-attributes"
            title="Attributes"
            summary={sectionSummaries.attributes}
            open={open.attributes}
            onToggle={() => toggleSection("attributes")}
          >
            <MultiSelectDropdown
              options={attrOptions.map((a) => ({ value: a.id, label: a.title }))}
              value={catalogExtra.attribute_ids}
              onChange={(ids) => setCatalogExtra((prev) => ({ ...prev, attribute_ids: ids }))}
              placeholder="Select attributes…"
              emptyMessage="No active attributes — create some under Catalog → Attributes"
            />
            {attrOptions.length === 0 ? (
              <p className="pf-hint" style={{ marginTop: 8 }}>
                No active attributes found. Add them in Attributes, then reopen this product.
              </p>
            ) : null}
          </Section>

          <Section
            id="pf-merch"
            title="Featured & options"
            summary={sectionSummaries.merch}
            open={open.merch}
            onToggle={() => toggleSection("merch")}
          >
            <div className="pf-grid">
              <div className="pf-span-2">
                <span className="pf-label">Featured / merchandising tags</span>
                <MultiSelectDropdown
                  options={FEATURE_TAGS.map((t) => ({ value: t.id, label: t.label }))}
                  value={featured}
                  onChange={setFeatured}
                  placeholder="Select featured badges…"
                />
              </div>
              <div className="pf-span-2">
                <ProductOptionsPanel
                  key={editing ? productId : "new"}
                  editing={editing}
                  productId={productId}
                  extra={{
                    option_label: catalogExtra.option_label,
                    option_color: catalogExtra.option_color,
                    option_size: catalogExtra.option_size,
                    option_pack: catalogExtra.option_pack,
                    option_weight: catalogExtra.option_weight,
                    option_flavor: catalogExtra.option_flavor,
                    option_type: catalogExtra.option_type,
                    variant_axis: catalogExtra.variant_axis,
                    variant_product_ids: catalogExtra.variant_product_ids,
                  }}
                  onChange={(patch) => setCatalogExtra((prev) => ({ ...prev, ...patch }))}
                  createSeed={{
                    name,
                    sku,
                    barcode,
                    uom,
                    category_id: categoryId ? Number(categoryId) : 0,
                    subcategory_id: subcategoryId ? Number(subcategoryId) : 0,
                    sub_subcategory_id: subSubcategoryId ? Number(subSubcategoryId) : 0,
                    sub_sub_subcategory_id: subSubSubcategoryId ? Number(subSubSubcategoryId) : 0,
                    brand_id: brandId ? Number(brandId) : 0,
                    country_id: countryId ? Number(countryId) : 0,
                    selling_price: sellingPrice === "" ? 0 : Number(sellingPrice),
                    offer_price: offerPrice === "" ? 0 : Number(offerPrice),
                    image,
                    featured,
                    store_ids: linkedStores.map((s) => s.store_id).filter((id) => id > 0),
                    short_description: shortDescription,
                    detailed_description: detailedDescription,
                    catalog_extra: catalogExtra as unknown as Record<string, unknown>,
                  }}
                />
              </div>
              <div className="pf-span-2">
                <ProductLinkPicker
                  label="Related products"
                  hint="Shown on the product page as Related Products"
                  value={catalogExtra.related_product_ids}
                  excludeId={editing ? productId : undefined}
                  onChange={(ids) => setCatalogExtra((prev) => ({ ...prev, related_product_ids: ids }))}
                />
              </div>
              <div className="pf-span-2">
                <ProductLinkPicker
                  label="Frequently bought together"
                  hint="Cross-sell bundle suggestions on PDP"
                  value={catalogExtra.fbt_product_ids}
                  excludeId={editing ? productId : undefined}
                  onChange={(ids) => setCatalogExtra((prev) => ({ ...prev, fbt_product_ids: ids }))}
                />
              </div>
            </div>
          </Section>

          <Section
            title="Shipping"
            summary={sectionSummaries.shipping}
            open={open.shipping}
            onToggle={() => toggleSection("shipping")}
          >
            <div className="pf-grid">
              <label>
                Weight
                <input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 1kg" />
              </label>
              <label>
                Size / pack
                <input value={size} onChange={(e) => setSize(e.target.value)} placeholder="e.g. 1L bottle" />
              </label>
              <label>
                Delivery days
                <input value={deliveryDays} onChange={(e) => setDeliveryDays(e.target.value)} placeholder="1-2" />
              </label>
              <label>
                Return days
                <input value={returnDays} onChange={(e) => setReturnDays(e.target.value)} placeholder="0 / 7" />
              </label>
              <label>
                Delivered by
                <select value={deliveredBy} onChange={(e) => setDeliveredBy(e.target.value)}>
                  <option value="Store">Store</option>
                  <option value="supplier">Supplier</option>
                </select>
              </label>
              <label>
                Payment methods
                <input
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  placeholder="COD, Online"
                />
              </label>
            </div>
          </Section>

          <Section
            id="pf-specs"
            title="Specifications"
            summary={sectionSummaries.specs}
            open={open.specs}
            onToggle={() => toggleSection("specs")}
          >
            <PfLocaleBar
              lang={lang as ProductLang}
              onLangChange={setLang}
              showTranslate
              translating={translatingSection === "specs"}
              onTranslate={translateSpecsSection}
            />
            {features.map((f, idx) => (
              <div key={idx} className="pf-feature-row">
                <input
                  placeholder={`Label (${lang})`}
                  value={f.title[lang] ?? ""}
                  dir={lang === "Arabic" ? "rtl" : undefined}
                  onChange={(e) =>
                    setFeatures((prev) =>
                      prev.map((row, i) =>
                        i === idx ? { ...row, title: { ...row.title, [lang]: e.target.value } } : row,
                      ),
                    )
                  }
                />
                <input
                  placeholder={`Value (${lang})`}
                  value={f.text[lang] ?? ""}
                  dir={lang === "Arabic" ? "rtl" : undefined}
                  onChange={(e) =>
                    setFeatures((prev) =>
                      prev.map((row, i) =>
                        i === idx ? { ...row, text: { ...row.text, [lang]: e.target.value } } : row,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  aria-label="Remove feature"
                  onClick={() => setFeatures((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)))}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setFeatures((prev) => [...prev, emptyFeatureRow()])}
            >
              <Plus size={14} />
              Add specification
            </button>
          </Section>

          <Section
            id="product-seo-section"
            title="SEO"
            summary={sectionSummaries.seo}
            open={open.seo}
            onToggle={() => toggleSection("seo")}
          >
            <div className="tabs">
              {LANGS.map((l) => (
                <button key={l} type="button" className={lang === l ? "active" : ""} onClick={() => setLang(l)}>
                  {l}
                </button>
              ))}
            </div>
            <ProductSeoPanel
              lang={lang}
              productId={productId}
              name={name}
              shortDescription={shortDescription}
              tags={tags}
              sku={sku}
              barcode={barcode}
              sellingPrice={sellingPrice}
              offerPrice={offerPrice}
              image={image}
              imageUrl={imageUrl}
              brandName={brandName}
              metaTitle={metaTitle}
              metaKeyword={metaKeyword}
              metaDescription={metaDescription}
              seoExtra={seoExtra}
              onMetaTitleChange={setMetaTitle}
              onMetaKeywordChange={setMetaKeyword}
              onMetaDescriptionChange={setMetaDescription}
              onSeoExtraChange={setSeoExtra}
            />
          </Section>
        </div>

        <div className="product-form-aside">
          <div id="pf-publish">
            <SideCard title="Visibility">
              <label className="pf-field">
                Product visibility
                <select
                  value={saveLater ? "draft" : status}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "draft") {
                      setSaveLater(true);
                      setStatus("0");
                    } else {
                      setSaveLater(false);
                      setStatus(v);
                    }
                  }}
                >
                  <option value="1">Published (visible in store)</option>
                  <option value="0">Hidden (unpublished)</option>
                  <option value="draft">Draft (save later)</option>
                </select>
              </label>
              <label className="pf-field">
                Sort priority
                <input
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  placeholder="Lower number shows first"
                />
              </label>
              <div className="actions" style={{ marginTop: 12 }}>
                <button type="submit" className="btn" disabled={saving}>
                  {saving ? "Saving…" : editing ? "Update" : "Create"}
                </button>
                <button type="button" className="btn btn-secondary" disabled={saving} onClick={(e) => void onSubmit(e, true)}>
                  Draft
                </button>
              </div>
            </SideCard>
          </div>

          <div id="pf-organization">
            <SideCard title="Category">
              <label className="pf-field">
                Category
                <select
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    setSubcategoryId("");
                    setSubSubcategoryId("");
                    setSubSubSubcategoryId("");
                  }}
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="pf-field">
                Subcategory
                <select
                  value={subcategoryId}
                  onChange={(e) => {
                    setSubcategoryId(e.target.value);
                    setSubSubcategoryId("");
                    setSubSubSubcategoryId("");
                  }}
                  disabled={!categoryId}
                >
                  <option value="">Select subcategory</option>
                  {subcategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="pf-field">
                Sub-subcategory
                <select
                  value={subSubcategoryId}
                  onChange={(e) => {
                    setSubSubcategoryId(e.target.value);
                    setSubSubSubcategoryId("");
                  }}
                  disabled={!subcategoryId}
                >
                  <option value="">Select</option>
                  {subSubcategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="pf-field">
                Level 4 subcategory
                <select
                  value={subSubSubcategoryId}
                  onChange={(e) => setSubSubSubcategoryId(e.target.value)}
                  disabled={!subSubcategoryId}
                >
                  <option value="">Select</option>
                  {subSubSubcategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </SideCard>
          </div>

          <SideCard title="Brand & origin">
            <label className="pf-field">
              Brand
              <select value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                <option value="">Select brand</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="pf-field">
              Country of origin
              <select value={countryId} onChange={(e) => setCountryId(e.target.value)}>
                <option value="">Select country</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="pf-field">
              Seller / vendor
              <select value={seller} onChange={(e) => setSeller(e.target.value)}>
                <option value="">Select seller</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.name}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
          </SideCard>

          <div id="pf-media">
            <SideCard title="Images">
              <div className="pf-field">
                <span className="pf-label">Featured image</span>
                <div className="pf-upload-row">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      onFeaturedFilePicked(e.target.files?.[0] ?? null);
                      e.target.value = "";
                    }}
                  />
                  <input
                    value={image}
                    onChange={(e) => {
                      setImage(e.target.value);
                      setImageUrl(null);
                    }}
                    aria-label="Featured image filename"
                    placeholder="Filename…"
                  />
                </div>
                {(imageUrl || image) && (
                  <FeaturedImagePreview
                    filename={image}
                    imageUrl={imageUrl}
                    onRemove={() => {
                      setImage("");
                      setImageUrl(null);
                    }}
                  />
                )}
              </div>
            </SideCard>
          </div>

          <SideCard title="Gallery">
            <div className="pf-gallery-list">
              {gallery.map((g, idx) => {
                const kind = (g.media_kind || mediaKindFromName(g.image_name)) as
                  | "image"
                  | "gif"
                  | "video";
                return (
                  <div key={idx} className="pf-gallery-item">
                    <div className="pf-gallery-item-head">
                      <span className="pf-gallery-item-label">
                        Media {idx + 1}
                        {kind === "video" ? " · Video" : kind === "gif" ? " · GIF" : ""}
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        aria-label={`Remove gallery media ${idx + 1}`}
                        disabled={gallery.length <= 1}
                        onClick={() =>
                          setGallery((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)))
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <input
                      type="file"
                      accept={GALLERY_ACCEPT}
                      className="admin-file-input"
                      aria-label={`Upload gallery media ${idx + 1}`}
                      onChange={(e) => {
                        void onGalleryUpload(idx, e.target.files?.[0] ?? null);
                        e.target.value = "";
                      }}
                    />
                    <input
                      placeholder="Filename"
                      value={g.image_name}
                      aria-label={`Gallery filename ${idx + 1}`}
                      onChange={(e) =>
                        setGallery((prev) =>
                          prev.map((row, i) =>
                            i === idx
                              ? {
                                  ...row,
                                  image_name: e.target.value,
                                  preview_url: null,
                                  media_kind: mediaKindFromName(e.target.value),
                                }
                              : row,
                          ),
                        )
                      }
                    />
                    {g.image_name.trim() || g.preview_url ? (
                      <GalleryMediaPreview
                        filename={g.image_name}
                        previewUrl={g.preview_url}
                        kind={kind}
                      />
                    ) : null}
                    <label className="pf-field pf-gallery-priority-field">
                      <span className="pf-label">Priority</span>
                      <input
                        type="number"
                        min={0}
                        value={g.image_priority}
                        onChange={(e) =>
                          setGallery((prev) =>
                            prev.map((row, i) =>
                              i === idx ? { ...row, image_priority: Number(e.target.value) || 0 } : row,
                            ),
                          )
                        }
                      />
                    </label>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              className="btn btn-secondary pf-gallery-add"
              onClick={() =>
                setGallery((prev) => [...prev, { image_name: "", image_priority: prev.length }])
              }
            >
              <Plus size={14} />
              Add media
            </button>
          </SideCard>

          <SideCard title="Merchandising">
            {featured.length ? (
              <div className="pf-chip-row">
                {FEATURE_TAGS.filter((t) => featured.includes(t.id)).map((t) => (
                  <span key={t.id} className="pf-chip">
                    {t.label}
                  </span>
                ))}
              </div>
            ) : (
              <p className="muted">No featured tags</p>
            )}
          </SideCard>

          <SideCard title="Store prices">
            <ProductStorePricingCard
              editing={editing}
              productId={productId}
              stores={stores}
              linkedStores={linkedStores}
              defaultPrice={sellingPrice}
              storeIds={storeIds}
              onStoreIdsChange={setStoreIds}
              onLinkedStoresChange={setLinkedStores}
            />
          </SideCard>
        </div>
      </form>

      {featuredCropFile ? (
        <ImageCropDialog
          file={featuredCropFile}
          aspect={1}
          title="Crop featured image (1:1)"
          onCancel={() => setFeaturedCropFile(null)}
          onCropped={async (cropped) => {
            await onFeaturedUpload(cropped);
          }}
        />
      ) : null}
    </div>
  );
}
