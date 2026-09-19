import { useState } from "react";
import { bannerImageFallbacks } from "../../lib/media";
import { config } from "../../lib/config";
import type { StyleNodeType, StyleViewport } from "../../lib/page-styling";

export type BannerPreview = {
  type?: string;
  title?: string;
  image_url?: string;
  image?: string;
  status?: number;
};

const DEMO_CATEGORIES = ["Fresh", "Dairy", "Bakery", "Frozen", "Home", "Baby", "Pets", "Offers"];
const DEMO_PRODUCTS = [
  { name: "Al Rawabi Milk 2L", price: "8.50" },
  { name: "Arabic Bread pack", price: "2.00" },
  { name: "Tomato 1kg", price: "4.25" },
  { name: "Olive Oil 500ml", price: "16.00" },
  { name: "Basmati Rice 5kg", price: "22.00" },
  { name: "Yogurt 6-pack", price: "7.75" },
];

const FRAME = `${config.frontstoreUrl}/assets/images/hero/swipe-frame.png?v=2`;
const FALLBACK_HERO = `${config.frontstoreUrl}/assets/images/hero/midweek-mega-deals.png`;
const FALLBACK_SIDE = `${config.frontstoreUrl}/uploads/banner_images/side-01.png`;

export function slidesOf(banners: BannerPreview[], kind: string): BannerPreview[] {
  return banners.filter((b) => String(b.type) === kind && b.status !== 0);
}

function BannerImg({
  slide,
  alt,
  fallback,
}: {
  slide?: BannerPreview | null;
  alt: string;
  fallback: string;
}) {
  const urls = slide
    ? [...bannerImageFallbacks(slide.image, slide.image_url), fallback]
    : [fallback];
  const [i, setI] = useState(0);
  const src = urls[Math.min(i, urls.length - 1)] ?? fallback;
  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      onError={() => setI((n) => (n + 1 < urls.length ? n + 1 : n))}
    />
  );
}

/** Storefront home hero: 4fr slider + 1fr side rail. */
export function HomeHeroBlock({
  banners,
  viewport,
}: {
  banners: BannerPreview[];
  viewport: StyleViewport;
}) {
  const tops = slidesOf(banners, "Top");
  const sides = slidesOf(banners, "Side");
  const mobile = viewport === "mobile";
  return (
    <div className={`el-sf-hero${mobile ? " is-mobile" : ""}`}>
      <div className={`el-sf-hero-row${mobile ? " is-stack" : ""}`}>
        <div className="el-sf-hero-main">
          <div className="el-sf-hero-viewport" data-ratio={mobile ? "2/1" : "14/5"}>
            <BannerImg slide={tops[0]} alt={tops[0]?.title || "Hero"} fallback={FALLBACK_HERO} />
            {!mobile ? <img className="el-sf-hero-frame" src={FRAME} alt="" aria-hidden draggable={false} /> : null}
          </div>
          {tops.length > 1 ? <span className="el-sf-count">{tops.length} slides</span> : null}
        </div>
        {mobile ? (
          <div className="el-sf-side-mobile">
            {(sides.length ? sides : [{ title: "Offer" }]).slice(0, 4).map((slide, i) => (
              <div key={`sm-${i}`} className="el-sf-side-card">
                <BannerImg slide={slide} alt={slide.title || "Side"} fallback={FALLBACK_SIDE} />
              </div>
            ))}
          </div>
        ) : (
          <div className="el-sf-hero-side">
            <div className="el-sf-side-viewport">
              <BannerImg slide={sides[0]} alt={sides[0]?.title || "Side offer"} fallback={FALLBACK_SIDE} />
            </div>
            {sides.length > 1 ? <span className="el-sf-count">{sides.length} offers</span> : null}
          </div>
        )}
      </div>
    </div>
  );
}

export function StorefrontWidget({
  type,
  viewport,
  banners,
  productLimit,
}: {
  type: StyleNodeType;
  viewport: StyleViewport;
  banners: BannerPreview[];
  productLimit?: number;
}) {
  if (type === "home-hero") return <HomeHeroBlock banners={banners} viewport={viewport} />;
  if (type === "banner-hero") {
    const tops = slidesOf(banners, "Top");
    return (
      <div className="el-sf-hero-main">
        <div className="el-sf-hero-viewport" data-ratio={viewport === "desktop" ? "14/5" : "2/1"}>
          <BannerImg slide={tops[0]} alt={tops[0]?.title || "Hero"} fallback={FALLBACK_HERO} />
        </div>
      </div>
    );
  }
  if (type === "banner-side") {
    const sides = slidesOf(banners, "Side");
    return (
      <div className="el-sf-hero-side is-solo">
        <div className="el-sf-side-viewport">
          <BannerImg slide={sides[0]} alt={sides[0]?.title || "Side"} fallback={FALLBACK_SIDE} />
        </div>
      </div>
    );
  }
  if (type === "banner-below") {
    const below = slidesOf(banners, "Below Slider");
    const items = (below.length ? below : [{}, {}, {}]).slice(0, 3);
    while (items.length < 3) items.push({});
    return (
      <div className="el-sf-below" data-count={Math.min(items.length, 3)}>
        {items.map((slide, i) => (
          <div key={`b-${i}`} className="el-sf-below-item">
            <BannerImg slide={slide} alt="Below slider" fallback={FALLBACK_HERO} />
          </div>
        ))}
      </div>
    );
  }
  if (type === "banner-bottom") {
    const bottom = slidesOf(banners, "Bottom");
    return (
      <div className="el-sf-bottom">
        <BannerImg slide={bottom[0]} alt="Bottom strip" fallback={FALLBACK_HERO} />
      </div>
    );
  }
  if (type === "categories") {
    return (
      <div className={`el-sf-cats${viewport === "mobile" ? " is-mobile" : ""}`}>
        {DEMO_CATEGORIES.map((c) => (
          <div key={c} className="el-sf-cat">
            <i />
            <span>{c}</span>
          </div>
        ))}
      </div>
    );
  }
  if (type === "products") {
    return (
      <div className="el-sf-group">
        <div className="el-sf-group-head">
          <strong>Item group</strong>
          <span>View all</span>
        </div>
        <div className={`el-sf-prods${viewport === "mobile" ? " is-mobile" : ""}`}>
          {DEMO_PRODUCTS.slice(0, productLimit ?? 6).map((prod) => (
            <article key={prod.name} className="el-sf-prod">
              <div className="el-sf-prod-img" />
              <strong>{prod.name}</strong>
              <span>{prod.price} QAR</span>
            </article>
          ))}
        </div>
      </div>
    );
  }
  if (type === "flyer") {
    return (
      <div className="el-sf-flyer">
        <strong>Weekly flyer</strong>
        <span>Open the latest catalogue</span>
      </div>
    );
  }
  return null;
}
