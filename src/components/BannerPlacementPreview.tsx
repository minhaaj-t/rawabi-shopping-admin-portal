import { useEffect, useMemo, useState, type ReactNode } from "react";
import { config } from "../lib/config";
import { bannerImageFallbacks } from "../lib/media";

export type PreviewBanner = {
  id?: number;
  title?: string;
  image?: string;
  image_url?: string;
  type?: string;
};

export type BannerLinkPreview = {
  label: string;
  path: string;
};

type Props = {
  bannerType: string;
  currentImageUrl: string | null;
  currentTitle: string;
  editId: number | null;
  allBanners: PreviewBanner[];
  linkPreview?: BannerLinkPreview | null;
  onDropImage: (file: File, type: string) => void;
  /** Decorative overlay on Top hero preview (CMS-managed). */
  heroFrameUrl?: string | null;
};

const FS = config.frontstoreUrl;
const FALLBACK_MAIN = `${FS}/assets/images/hero/midweek-mega-deals.png`;
const FALLBACK_SIDE = `${FS}/uploads/banner_images/side-01.png`;
const SWIPE_FRAME = `${FS}/assets/images/hero/swipe-frame.png?v=2`;

const ZONE_META: Record<string, { label: string; hint: string }> = {
  Top: { label: "Top · Hero slider", hint: "Main carousel on the home page (14:5 — same as storefront)" },
  Side: { label: "Side offers", hint: "Web: vertical carousel beside hero · App: 2-up cards (3:4)" },
  "Below Slider": { label: "Below slider", hint: "Up to 3 promo tiles under the hero (16:9 each)" },
  Popup: { label: "Popup", hint: "Modal overlay shown on home page load" },
  Bottom: { label: "Bottom strip", hint: "Footer promo band on the home page" },
};

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
}

function resolveBannerSrc(banner: PreviewBanner | null, fallback: string): string {
  if (!banner) return fallback;
  const urls = bannerImageFallbacks(banner.image, banner.image_url);
  return urls[0] ?? fallback;
}

function ZoneImage({
  src,
  alt,
  fallback,
  editing,
  className,
}: {
  src: string;
  alt: string;
  fallback: string;
  editing?: boolean;
  className?: string;
}) {
  const [current, setCurrent] = useState(src);

  useEffect(() => {
    setCurrent(src);
  }, [src]);

  return (
    <img
      src={current}
      alt={alt}
      className={`banner-zone-img${editing ? " is-editing" : ""}${className ? ` ${className}` : ""}`}
      onError={() => setCurrent(fallback)}
    />
  );
}

function DropZone({
  type,
  label,
  hint,
  className,
  children,
  onDropImage,
}: {
  type: string;
  label: string;
  hint: string;
  className?: string;
  children: ReactNode;
  onDropImage: (file: File, type: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className={`banner-drop-zone is-active${dragOver ? " is-drag-over" : ""}${className ? ` ${className}` : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file?.type.startsWith("image/")) onDropImage(file, type);
      }}
      aria-label={`${label}. ${hint}`}
    >
      <div className="banner-drop-zone-label">
        <strong>{label}</strong>
        <span>{hint}</span>
      </div>
      {children}
    </div>
  );
}

export function BannerPlacementPreview({
  bannerType,
  currentImageUrl,
  currentTitle,
  editId,
  allBanners,
  linkPreview,
  onDropImage,
  heroFrameUrl,
}: Props) {
  const meta = ZONE_META[bannerType] ?? { label: bannerType, hint: "Storefront banner placement" };
  const frameSrc = (heroFrameUrl && heroFrameUrl.trim()) || SWIPE_FRAME;

  const grouped = useMemo(() => {
    const map: Record<string, PreviewBanner[]> = {
      Top: [],
      Side: [],
      "Below Slider": [],
      Popup: [],
      Bottom: [],
    };
    for (const b of allBanners) {
      const t = b.type || "Top";
      if (!map[t]) map[t] = [];
      if (editId && b.id === editId) continue;
      map[t].push(b);
    }
    return map;
  }, [allBanners, editId]);

  const editingBanner: PreviewBanner = {
    id: editId ?? undefined,
    title: currentTitle,
    image: undefined,
    image_url: currentImageUrl ?? undefined,
    type: bannerType,
  };

  const topSrc = resolveBannerSrc(
    bannerType === "Top" && currentImageUrl ? editingBanner : grouped.Top[0] ?? null,
    FALLBACK_MAIN,
  );
  const sideSrc = resolveBannerSrc(
    bannerType === "Side" && currentImageUrl ? editingBanner : grouped.Side[0] ?? null,
    FALLBACK_SIDE,
  );

  const belowItems = grouped["Below Slider"].slice(0, 3);
  while (belowItems.length < 3) belowItems.push({});

  const popupSrc =
    bannerType === "Popup" && currentImageUrl
      ? currentImageUrl
      : resolveBannerSrc(grouped.Popup[0] ?? null, topSrc);

  const bottomSrc =
    bannerType === "Bottom" && currentImageUrl
      ? currentImageUrl
      : resolveBannerSrc(grouped.Bottom[0] ?? null, topSrc);

  function renderFocusedZone() {
    switch (bannerType) {
      case "Top":
        return (
          <DropZone
            type="Top"
            label={meta.label}
            hint={meta.hint}
            className="bps-focused bps-focused-top"
            onDropImage={onDropImage}
          >
            <div className="bps-hero-frame">
              <div className="bps-hero-viewport">
                <div className="bps-hero-slide">
                  <ZoneImage
                    src={topSrc}
                    alt={currentTitle || "Hero banner"}
                    fallback={FALLBACK_MAIN}
                    editing={!!currentImageUrl}
                  />
                </div>
              </div>
              <img className="bps-hero-frame-img" src={frameSrc} alt="" aria-hidden draggable={false} />
            </div>
          </DropZone>
        );

      case "Side":
        return (
          <DropZone
            type="Side"
            label={meta.label}
            hint={meta.hint}
            className="bps-focused bps-focused-side"
            onDropImage={onDropImage}
          >
            <div className="bps-hero-side-frame bps-focused-side-frame">
              <div className="bps-hero-side-viewport">
                <div className="bps-hero-side-slide">
                  <ZoneImage
                    src={sideSrc}
                    alt={currentTitle || "Side banner"}
                    fallback={FALLBACK_SIDE}
                    editing={!!currentImageUrl}
                  />
                </div>
              </div>
            </div>
          </DropZone>
        );

      case "Below Slider":
        return (
          <DropZone
            type="Below Slider"
            label={meta.label}
            hint={meta.hint}
            className="bps-focused bps-focused-below"
            onDropImage={onDropImage}
          >
            <div className="bps-below-grid bps-below-grid-focused">
              {belowItems.map((item, index) => {
                const isEditing = !!currentImageUrl && index === 0;
                const src = isEditing ? currentImageUrl! : resolveBannerSrc(item.id ? item : null, topSrc);
                return (
                  <div
                    className={`bps-below-item${isEditing ? " is-editing-slot" : ""}`}
                    key={item.id ?? `slot-${index}`}
                  >
                    <ZoneImage src={src} alt="" fallback={topSrc} editing={isEditing} />
                  </div>
                );
              })}
            </div>
          </DropZone>
        );

      case "Popup":
        return (
          <DropZone
            type="Popup"
            label={meta.label}
            hint={meta.hint}
            className="bps-focused bps-focused-popup"
            onDropImage={onDropImage}
          >
            <div className="bps-popup-mock bps-popup-mock-focused">
              <div className="bps-popup-backdrop" aria-hidden />
              <div className="bps-popup-dialog">
                <ZoneImage src={popupSrc} alt="" fallback={topSrc} editing={!!currentImageUrl} />
              </div>
            </div>
          </DropZone>
        );

      case "Bottom":
        return (
          <DropZone
            type="Bottom"
            label={meta.label}
            hint={meta.hint}
            className="bps-focused bps-focused-bottom"
            onDropImage={onDropImage}
          >
            <div className="bps-bottom-strip">
              <ZoneImage src={bottomSrc} alt="" fallback={topSrc} editing={!!currentImageUrl} />
            </div>
          </DropZone>
        );

      default:
        return null;
    }
  }

  return (
    <div className="banner-store-preview banner-store-preview--focused">
      <div className="banner-store-preview-head">
        <h3>{meta.label}</h3>
        <p>{meta.hint}. Matches the Rawabi storefront home layout.</p>
        {linkPreview ? (
          <div className="bps-link-dest">
            <span className="bps-link-dest-label">Click destination</span>
            <strong className="bps-link-dest-name">{linkPreview.label}</strong>
            <code className="bps-link-dest-path">{linkPreview.path}</code>
          </div>
        ) : (
          <p className="bps-link-dest bps-link-dest--empty">No link configured — banner will not navigate anywhere.</p>
        )}
      </div>

      <div className="banner-store-preview-canvas banner-store-preview-canvas--focused">{renderFocusedZone()}</div>
    </div>
  );
}

export function buildBannerLinkPreview(input: {
  link_type: string;
  banner_point: string;
  cat: string;
  subcat: string;
  sub_subcat: string;
  categories: { id: number; name: string }[];
  subcategories: { id: number; name: string }[];
  subSubcategories: { id: number; name: string }[];
}): BannerLinkPreview | null {
  const { link_type: lt, banner_point, cat, subcat, sub_subcat, categories, subcategories, subSubcategories } =
    input;
  if (!lt) return null;

  if (lt === "external_url") {
    return { label: "External URL", path: banner_point.trim() || "https://…" };
  }
  if (lt === "offer") return { label: "Offers", path: "/deals" };
  if (lt === "itemgroup") {
    return { label: "Item group", path: `/group/itemgroup/${banner_point.trim() || "…"}` };
  }
  if (lt === "product") {
    return { label: "Product", path: `/product/p/${banner_point.trim() || "…"}` };
  }
  if (lt === "brand") {
    return { label: "Brand", path: `/brand/${slugify("brand")}/${banner_point.trim() || "…"}` };
  }

  const catRow = categories.find((c) => String(c.id) === cat);
  const subRow = subcategories.find((c) => String(c.id) === subcat);
  const subSubRow = subSubcategories.find((c) => String(c.id) === sub_subcat);

  if (lt === "category") {
    const id = banner_point.trim() || cat;
    const row = categories.find((c) => String(c.id) === id);
    if (!row) return { label: "Category", path: "/category/…" };
    return { label: row.name, path: `/category/${slugify(row.name)}/${row.id}` };
  }
  if (lt === "sub_category") {
    if (!subRow) return { label: "Sub category", path: "/category/…/…" };
    const catSlug = slugify(catRow?.name ?? "category");
    return { label: subRow.name, path: `/category/${catSlug}/${cat || "…"}/${subRow.id}` };
  }
  if (lt === "sub_sub_category") {
    if (!subSubRow) return { label: "Sub sub category", path: "/category/…/…/…" };
    const catSlug = slugify(catRow?.name ?? "category");
    return {
      label: subSubRow.name,
      path: `/category/${catSlug}/${cat || "…"}/${subcat || "…"}/${subSubRow.id}`,
    };
  }
  if (lt === "sub_sub_sub_category") {
    const point = banner_point.trim();
    const name = subSubRow?.name ?? (point ? `Category #${point}` : "Sub sub sub category");
    const catSlug = slugify(catRow?.name ?? "category");
    return {
      label: name,
      path: `/category/${catSlug}/${cat || "…"}/${subcat || "…"}/${sub_subcat || "…"}/${point || "…"}`,
    };
  }

  return null;
}
