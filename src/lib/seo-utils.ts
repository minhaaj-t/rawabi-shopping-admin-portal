export type LocaleMap = Record<string, string>;

export type SeoFaqItem = {
  question: LocaleMap;
  answer: LocaleMap;
};

export type SeoExtra = {
  faq: SeoFaqItem[];
  noindex: boolean;
  focus_keyword: LocaleMap;
};

export const SEO_TITLE_IDEAL = 60;
export const SEO_DESC_IDEAL = 160;

export function emptyLocale(): LocaleMap {
  return { English: "", Arabic: "" };
}

export function mergeLocale(raw?: Record<string, string> | null): LocaleMap {
  return {
    English: String(raw?.English ?? raw?.english ?? ""),
    Arabic: String(raw?.Arabic ?? raw?.arabic ?? ""),
  };
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trim()}…`;
}

export function charStatus(length: number, ideal: number): "ok" | "warn" | "bad" {
  if (length === 0) return "bad";
  if (length <= ideal) return "ok";
  if (length <= ideal + 15) return "warn";
  return "bad";
}

export function defaultSeoExtra(): SeoExtra {
  return { faq: [], noindex: false, focus_keyword: emptyLocale() };
}

export function mergeSeoExtra(raw?: Partial<SeoExtra> | null): SeoExtra {
  const faq = (raw?.faq ?? []).map((row) => ({
    question: mergeLocale(row.question),
    answer: mergeLocale(row.answer),
  }));

  return {
    faq,
    noindex: Boolean(raw?.noindex),
    focus_keyword: mergeLocale(raw?.focus_keyword),
  };
}

export function productPath(name: LocaleMap, productId: number, lang: keyof LocaleMap = "English"): string {
  const label = (name[lang] ?? name.English ?? "product").trim() || "product";
  return `/${slugify(label)}/${productId || "new"}`;
}

export function buildSuggestedMeta(input: {
  name: LocaleMap;
  shortDescription: LocaleMap;
  tags: string;
  sku: string;
  lang: keyof LocaleMap;
}): { title: string; description: string; keywords: string } {
  const name = input.name[input.lang]?.trim() || input.name.English?.trim() || "";
  const short = stripHtml(input.shortDescription[input.lang]?.trim() || input.shortDescription.English?.trim() || "");
  const tagList = input.tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const title = truncate(name ? `${name} | Rawabi Shopping` : "Rawabi Shopping", SEO_TITLE_IDEAL);
  const description = truncate(
    short ||
      (name
        ? `Buy ${name} at Rawabi Shopping in Doha. Fast delivery across Qatar.`
        : "Shop quality groceries at Rawabi Shopping, Qatar."),
    SEO_DESC_IDEAL,
  );

  const keywords = [...new Set([...tagList, name, input.sku, "Rawabi", "Qatar", "Doha"].filter(Boolean))].join(", ");

  return { title, description, keywords };
}

export type SeoCheck = { id: string; label: string; pass: boolean; hint?: string };

export function seoChecks(input: {
  lang: keyof LocaleMap;
  metaTitle: LocaleMap;
  metaDescription: LocaleMap;
  metaKeyword: LocaleMap;
  focusKeyword: LocaleMap;
  name: LocaleMap;
  image: string;
  faq: SeoFaqItem[];
}): SeoCheck[] {
  const title = input.metaTitle[input.lang]?.trim() ?? "";
  const desc = input.metaDescription[input.lang]?.trim() ?? "";
  const focus = input.focusKeyword[input.lang]?.trim() ?? "";
  const name = input.name[input.lang]?.trim() ?? "";

  const faqComplete = input.faq.filter(
    (row) => row.question[input.lang]?.trim() && row.answer[input.lang]?.trim(),
  ).length;

  return [
    {
      id: "title",
      label: "Meta title set",
      pass: title.length > 0,
      hint: "Add a unique title for search results.",
    },
    {
      id: "title-len",
      label: `Title length (≤${SEO_TITLE_IDEAL} chars)`,
      pass: title.length > 0 && title.length <= SEO_TITLE_IDEAL,
      hint: title.length > SEO_TITLE_IDEAL ? "Shorten the title for Google." : undefined,
    },
    {
      id: "desc",
      label: "Meta description set",
      pass: desc.length > 0,
      hint: "Write a compelling snippet for SERP.",
    },
    {
      id: "desc-len",
      label: `Description length (≤${SEO_DESC_IDEAL} chars)`,
      pass: desc.length > 0 && desc.length <= SEO_DESC_IDEAL,
      hint: desc.length > SEO_DESC_IDEAL ? "Trim description to avoid truncation." : undefined,
    },
    {
      id: "focus",
      label: "Focus keyphrase in title",
      pass: !focus || title.toLowerCase().includes(focus.toLowerCase()),
      hint: focus ? `Include “${focus}” in the meta title.` : "Optional: set a focus keyphrase.",
    },
    {
      id: "name",
      label: "Product name present",
      pass: name.length > 0,
    },
    {
      id: "image",
      label: "Featured image for social preview",
      pass: Boolean(input.image?.trim()),
      hint: "Upload a featured image for Open Graph.",
    },
    {
      id: "faq",
      label: "AEO: at least one FAQ pair",
      pass: faqComplete >= 1,
      hint: "FAQ schema helps AI answer engines cite your product.",
    },
  ];
}

export function seoScore(checks: SeoCheck[]): number {
  if (!checks.length) return 0;
  const passed = checks.filter((c) => c.pass).length;
  return Math.round((passed / checks.length) * 100);
}

export function buildProductJsonLd(input: {
  lang: keyof LocaleMap;
  productId: number;
  name: LocaleMap;
  metaDescription: LocaleMap;
  shortDescription: LocaleMap;
  imageUrl: string | null;
  sku: string;
  barcode: string;
  sellingPrice: string;
  offerPrice: string;
  brandName?: string;
  faq: SeoFaqItem[];
  siteUrl: string;
}): Record<string, unknown> {
  const productName = input.name[input.lang]?.trim() || input.name.English?.trim() || "Product";
  const description =
    input.metaDescription[input.lang]?.trim() ||
    stripHtml(input.shortDescription[input.lang]?.trim() || input.shortDescription.English?.trim() || "");
  const sell = Number(input.sellingPrice || 0);
  const offer = Number(input.offerPrice || 0);
  const price = offer > 0 && offer < sell ? offer : sell;

  const product: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: productName,
    description,
    sku: input.sku || undefined,
    gtin13: input.barcode || undefined,
    image: input.imageUrl || undefined,
    brand: input.brandName ? { "@type": "Brand", name: input.brandName } : undefined,
    offers: price
      ? {
          "@type": "Offer",
          priceCurrency: "QAR",
          price: price.toFixed(2),
          availability: "https://schema.org/InStock",
          url: `${input.siteUrl.replace(/\/$/, "")}${productPath(input.name, input.productId, input.lang)}`,
        }
      : undefined,
  };

  const faqEntries = input.faq
    .map((row) => ({
      q: row.question[input.lang]?.trim() ?? "",
      a: stripHtml(row.answer[input.lang]?.trim() ?? ""),
    }))
    .filter((row) => row.q && row.a);

  if (!faqEntries.length) {
    return product;
  }

  return {
    "@context": "https://schema.org",
    "@graph": [
      product,
      {
        "@type": "FAQPage",
        mainEntity: faqEntries.map((row) => ({
          "@type": "Question",
          name: row.q,
          acceptedAnswer: { "@type": "Answer", text: row.a },
        })),
      },
    ],
  };
}
