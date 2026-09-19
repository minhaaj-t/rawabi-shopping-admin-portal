import { useMemo } from "react";
import { Plus, Sparkles, Trash2 } from "../lib/icons";
import {
  SEO_DESC_IDEAL,
  SEO_TITLE_IDEAL,
  buildProductJsonLd,
  buildSuggestedMeta,
  charStatus,
  productPath,
  seoChecks,
  seoScore,
  type LocaleMap,
  type SeoExtra,
  type SeoFaqItem,
} from "../lib/seo-utils";

const SITE_URL = "https://www.rawabihypermarket.com";

type Props = {
  lang: "English" | "Arabic";
  productId: number;
  name: LocaleMap;
  shortDescription: LocaleMap;
  tags: string;
  sku: string;
  barcode: string;
  sellingPrice: string;
  offerPrice: string;
  image: string;
  imageUrl: string | null;
  brandName?: string;
  metaTitle: LocaleMap;
  metaKeyword: LocaleMap;
  metaDescription: LocaleMap;
  seoExtra: SeoExtra;
  onMetaTitleChange: (value: LocaleMap) => void;
  onMetaKeywordChange: (value: LocaleMap) => void;
  onMetaDescriptionChange: (value: LocaleMap) => void;
  onSeoExtraChange: (value: SeoExtra) => void;
};

function Counter({ length, ideal }: { length: number; ideal: number }) {
  const status = charStatus(length, ideal);
  return (
    <span className={`pf-seo-counter is-${status}`}>
      {length}/{ideal}
    </span>
  );
}

export function ProductSeoPanel({
  lang,
  productId,
  name,
  shortDescription,
  tags,
  sku,
  barcode,
  sellingPrice,
  offerPrice,
  image,
  imageUrl,
  brandName,
  metaTitle,
  metaKeyword,
  metaDescription,
  seoExtra,
  onMetaTitleChange,
  onMetaKeywordChange,
  onMetaDescriptionChange,
  onSeoExtraChange,
}: Props) {
  const titleVal = metaTitle[lang] ?? "";
  const descVal = metaDescription[lang] ?? "";
  const focusVal = seoExtra.focus_keyword[lang] ?? "";
  const path = productPath(name, productId, lang);
  const fullUrl = `${SITE_URL}${path}`;

  const previewImage =
    imageUrl ||
    (image ? `https://rawabihypermarket.com/uploads/product_images/featured_image/${image}` : null);

  const checks = useMemo(
    () =>
      seoChecks({
        lang,
        metaTitle,
        metaDescription,
        metaKeyword,
        focusKeyword: seoExtra.focus_keyword,
        name,
        image,
        faq: seoExtra.faq,
      }),
    [lang, metaTitle, metaDescription, metaKeyword, seoExtra, name, image],
  );

  const score = seoScore(checks);

  const jsonLd = useMemo(
    () =>
      buildProductJsonLd({
        lang,
        productId,
        name,
        metaDescription,
        shortDescription,
        imageUrl: previewImage,
        sku,
        barcode,
        sellingPrice,
        offerPrice,
        brandName,
        faq: seoExtra.faq,
        siteUrl: SITE_URL,
      }),
    [
      lang,
      productId,
      name,
      metaDescription,
      shortDescription,
      previewImage,
      sku,
      barcode,
      sellingPrice,
      offerPrice,
      brandName,
      seoExtra.faq,
    ],
  );

  function applySuggested() {
    const suggested = buildSuggestedMeta({ name, shortDescription, tags, sku, lang });
    onMetaTitleChange({ ...metaTitle, [lang]: suggested.title });
    onMetaDescriptionChange({ ...metaDescription, [lang]: suggested.description });
    onMetaKeywordChange({ ...metaKeyword, [lang]: suggested.keywords });
  }

  function updateFaq(index: number, patch: Partial<SeoFaqItem>) {
    onSeoExtraChange({
      ...seoExtra,
      faq: seoExtra.faq.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    });
  }

  function addFaq() {
    onSeoExtraChange({
      ...seoExtra,
      faq: [...seoExtra.faq, { question: { English: "", Arabic: "" }, answer: { English: "", Arabic: "" } }],
    });
  }

  function removeFaq(index: number) {
    onSeoExtraChange({
      ...seoExtra,
      faq: seoExtra.faq.filter((_, i) => i !== index),
    });
  }

  return (
    <div className="pf-seo-panel">
      <div className="pf-seo-toolbar">
        <div className="pf-seo-score" aria-label={`SEO score ${score}%`}>
          <span className="pf-seo-score-ring" style={{ ["--score" as string]: `${score}%` }}>
            {score}
          </span>
          <span className="pf-seo-score-label">SEO score</span>
        </div>
        <button type="button" className="btn btn-secondary pf-seo-generate" onClick={applySuggested}>
          <Sparkles size={14} />
          Generate from product
        </button>
      </div>

      <ul className="pf-seo-checklist">
        {checks.map((check) => (
          <li key={check.id} className={check.pass ? "pass" : "fail"}>
            <span className="pf-seo-check-dot" aria-hidden />
            <span>
              {check.label}
              {!check.pass && check.hint ? <em>{check.hint}</em> : null}
            </span>
          </li>
        ))}
      </ul>

      <div className="pf-seo-grid">
        <div className="pf-seo-fields">
          <label className="pf-field pf-span-2">
            <span className="pf-label-row">
              <span className="pf-label">Meta title ({lang})</span>
              <Counter length={titleVal.length} ideal={SEO_TITLE_IDEAL} />
            </span>
            <input
              value={titleVal}
              onChange={(e) => onMetaTitleChange({ ...metaTitle, [lang]: e.target.value })}
              placeholder="Product name | Rawabi Shopping"
              dir={lang === "Arabic" ? "rtl" : undefined}
            />
          </label>

          <label className="pf-field pf-span-2">
            <span className="pf-label-row">
              <span className="pf-label">Meta description ({lang})</span>
              <Counter length={descVal.length} ideal={SEO_DESC_IDEAL} />
            </span>
            <textarea
              rows={3}
              value={descVal}
              onChange={(e) => onMetaDescriptionChange({ ...metaDescription, [lang]: e.target.value })}
              placeholder="Compelling search snippet for this product…"
              dir={lang === "Arabic" ? "rtl" : undefined}
            />
          </label>

          <label className="pf-field">
            <span className="pf-label">Meta keywords ({lang})</span>
            <input
              value={metaKeyword[lang] ?? ""}
              onChange={(e) => onMetaKeywordChange({ ...metaKeyword, [lang]: e.target.value })}
              placeholder="milk, dairy, fresh, Qatar"
              dir={lang === "Arabic" ? "rtl" : undefined}
            />
          </label>

          <label className="pf-field">
            <span className="pf-label">Focus keyphrase ({lang})</span>
            <input
              value={focusVal}
              onChange={(e) =>
                onSeoExtraChange({
                  ...seoExtra,
                  focus_keyword: { ...seoExtra.focus_keyword, [lang]: e.target.value },
                })
              }
              placeholder="e.g. fresh milk 1L"
              dir={lang === "Arabic" ? "rtl" : undefined}
            />
          </label>

          <label className="pf-check pf-span-2">
            <span>Hide from search engines (noindex)</span>
            <input
              type="checkbox"
              checked={seoExtra.noindex}
              onChange={(e) => onSeoExtraChange({ ...seoExtra, noindex: e.target.checked })}
            />
          </label>

          <div className="pf-field pf-span-2">
            <span className="pf-label">Storefront URL preview</span>
            <code className="pf-seo-url">{fullUrl}</code>
          </div>
        </div>

        <div className="pf-seo-previews">
          <div className="pf-seo-preview-card">
            <h4>Google preview</h4>
            <div className="pf-serp-preview" dir={lang === "Arabic" ? "rtl" : undefined}>
              <p className="pf-serp-site">rawabihypermarket.com</p>
              <p className="pf-serp-title">{titleVal || name[lang] || name.English || "Product title"}</p>
              <p className="pf-serp-desc">
                {descVal ||
                  stripPreview(shortDescription[lang] || shortDescription.English) ||
                  "Meta description will appear here."}
              </p>
            </div>
          </div>

          <div className="pf-seo-preview-card">
            <h4>Social / Open Graph</h4>
            <div className="pf-og-preview">
              {previewImage ? (
                <div className="pf-og-image">
                  <img src={previewImage} alt="" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                </div>
              ) : (
                <div className="pf-og-image pf-og-image-empty">No image</div>
              )}
              <div className="pf-og-body" dir={lang === "Arabic" ? "rtl" : undefined}>
                <p className="pf-og-domain">RAWABIHYPERMARKET.COM</p>
                <p className="pf-og-title">{titleVal || name[lang] || "Product"}</p>
                <p className="pf-og-desc">{descVal || "Description for link previews."}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="pf-seo-aeo">
        <div className="pf-seo-aeo-head">
          <div>
            <h4>AEO — FAQ for answer engines</h4>
            <p className="muted pf-hint">
              Question-and-answer pairs feed FAQ schema so ChatGPT, Google AI Overviews, and Perplexity can cite your
              product accurately.
            </p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={addFaq}>
            <Plus size={14} />
            Add FAQ
          </button>
        </div>

        {seoExtra.faq.length === 0 ? (
          <p className="muted pf-seo-empty">
            No FAQ entries yet. Add common buyer questions (storage, ingredients, delivery).
          </p>
        ) : (
          <div className="pf-faq-list">
            {seoExtra.faq.map((row, idx) => (
              <div key={idx} className="pf-faq-item">
                <div className="pf-faq-item-head">
                  <strong>FAQ {idx + 1}</strong>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    aria-label={`Remove FAQ ${idx + 1}`}
                    onClick={() => removeFaq(idx)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <label className="pf-field">
                  <span className="pf-label">Question ({lang})</span>
                  <input
                    value={row.question[lang] ?? ""}
                    onChange={(e) => updateFaq(idx, { question: { ...row.question, [lang]: e.target.value } })}
                    placeholder="Is this product organic?"
                    dir={lang === "Arabic" ? "rtl" : undefined}
                  />
                </label>
                <label className="pf-field">
                  <span className="pf-label">Answer ({lang})</span>
                  <textarea
                    rows={2}
                    value={row.answer[lang] ?? ""}
                    onChange={(e) => updateFaq(idx, { answer: { ...row.answer, [lang]: e.target.value } })}
                    placeholder="Yes, certified organic…"
                    dir={lang === "Arabic" ? "rtl" : undefined}
                  />
                </label>
              </div>
            ))}
          </div>
        )}
      </section>

      <details className="pf-seo-jsonld">
        <summary>Structured data preview (JSON-LD)</summary>
        <pre>{JSON.stringify(jsonLd, null, 2)}</pre>
      </details>
    </div>
  );
}

function stripPreview(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
