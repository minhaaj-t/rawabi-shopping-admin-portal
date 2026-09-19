import { config } from "./config";

export function bannerImageUrl(filename?: string | null, imageUrl?: string | null): string | null {
  if (imageUrl) return imageUrl;
  if (!filename) return null;
  if (/^https?:\/\//i.test(filename)) return filename;
  return `${config.assetsUrl}/uploads/banner_images/${filename}`;
}

export function bannerImageFallbacks(filename?: string | null, imageUrl?: string | null): string[] {
  const urls: string[] = [];
  if (imageUrl) urls.push(imageUrl);
  if (!filename) return urls;
  if (/^https?:\/\//i.test(filename)) {
    urls.push(filename);
    return [...new Set(urls)];
  }
  urls.push(`${config.assetsUrl}/uploads/banner_images/${filename}`);
  urls.push(`${config.apiUrl}/uploads/banner_images/${filename}`);
  const devAssets = (import.meta.env.VITE_DEV_ASSETS_URL as string | undefined)?.replace(/\/$/, "");
  if (devAssets) urls.push(`${devAssets}/uploads/banner_images/${filename}`);
  return [...new Set(urls)];
}

export function categoryImageUrl(
  filename?: string | null,
  kind: "icon" | "home_icon" | "banner" = "icon",
  imageUrl?: string | null,
): string | null {
  if (imageUrl) return imageUrl;
  if (!filename) return null;
  if (/^https?:\/\//i.test(filename)) return filename;
  const folder = kind === "banner" ? "bannerimages" : kind === "home_icon" ? "home_icons" : "icons";
  return `${config.assetsUrl}/uploads/category_images/${folder}/${filename}`;
}

export function categoryImageFallbacks(
  filename?: string | null,
  kind: "icon" | "home_icon" | "banner" = "icon",
  imageUrl?: string | null,
): string[] {
  const urls: string[] = [];
  if (imageUrl) urls.push(imageUrl);
  if (!filename) return urls;
  if (/^https?:\/\//i.test(filename)) {
    urls.push(filename);
    return [...new Set(urls)];
  }
  const folders =
    kind === "banner"
      ? ["bannerimages"]
      : kind === "home_icon"
        ? ["home_icons", "icons"]
        : ["icons"];
  for (const folder of folders) {
    const rel = `/uploads/category_images/${folder}/${filename}`;
    urls.push(`${config.assetsUrl}${rel}`);
    urls.push(`${config.apiUrl}${rel}`);
    const devAssets = (import.meta.env.VITE_DEV_ASSETS_URL as string | undefined)?.replace(/\/$/, "");
    if (devAssets) urls.push(`${devAssets}${rel}`);
  }
  return [...new Set(urls)];
}

/** Resolve marketing SEO image paths (OG / org logo) for admin preview. */
/** Resolve UI/UX icon & splash paths for admin preview. */
export function uiuxAssetPreviewUrl(value?: string | null): string {
  if (!value?.trim()) return "";
  const raw = value.trim();
  if (raw.startsWith("data:") || raw.startsWith("blob:")) return raw;
  const base = config.apiUrl.replace(/\/$/, "");
  if (raw.startsWith("/")) return `${base}${raw}`;
  try {
    const parsed = new URL(raw);
    const loopback = ["127.0.0.1", "localhost", "0.0.0.0", "10.0.2.2"].includes(parsed.hostname);
    const localAsset =
      parsed.pathname.startsWith("/uploads/") || parsed.pathname.startsWith("/uiux-samples/");
    if (loopback || localAsset) {
      return `${base}${parsed.pathname}${parsed.search}`;
    }
  } catch {
    return raw;
  }
  return raw;
}

export function marketingAssetPreviewUrl(value?: string | null): string | null {
  if (!value?.trim()) return null;
  const raw = value.trim();
  if (/^https?:\/\//i.test(raw) || raw.startsWith("data:")) return raw;
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  if (path.startsWith("/uploads/")) {
    return `${config.apiUrl}${path}`;
  }
  if (path.startsWith("/assets/")) {
    return `${config.frontstoreUrl}${path}`;
  }
  return `${config.assetsUrl}${path}`;
}

export function marketingAssetPreviewFallbacks(value?: string | null): string[] {
  if (!value?.trim()) return [];
  const raw = value.trim();
  if (/^https?:\/\//i.test(raw) || raw.startsWith("data:")) return [raw];
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  const urls = [
    marketingAssetPreviewUrl(raw)!,
    `${config.apiUrl}${path}`,
    `${config.frontstoreUrl}${path}`,
    `${config.assetsUrl}${path}`,
  ];
  const devAssets = (import.meta.env.VITE_DEV_ASSETS_URL as string | undefined)?.replace(/\/$/, "");
  if (devAssets) urls.push(`${devAssets}${path}`);
  return [...new Set(urls.filter(Boolean))];
}

/** Resolve career CV filename / path for preview & download. */
export function careerCvUrl(value?: string | null): string | null {
  if (!value?.trim()) return null;
  const raw = value.trim();
  if (/^https?:\/\//i.test(raw) || raw.startsWith("data:") || raw.startsWith("blob:")) return raw;
  if (raw.startsWith("/")) return `${config.assetsUrl}${raw}`;
  return `${config.assetsUrl}/uploads/careers/${raw}`;
}

export function careerCvFallbacks(value?: string | null): string[] {
  if (!value?.trim()) return [];
  const raw = value.trim();
  if (/^https?:\/\//i.test(raw) || raw.startsWith("data:") || raw.startsWith("blob:")) return [raw];
  const file = raw.replace(/^\/+/, "");
  const names = file.includes("/")
    ? [file]
    : [`uploads/careers/${file}`, `uploads/cv/${file}`, `uploads/${file}`, file];
  const urls: string[] = [];
  for (const name of names) {
    const path = name.startsWith("/") ? name : `/${name}`;
    urls.push(`${config.assetsUrl}${path}`);
    urls.push(`${config.apiUrl}${path}`);
    urls.push(`${config.frontstoreUrl}${path}`);
  }
  const devAssets = (import.meta.env.VITE_DEV_ASSETS_URL as string | undefined)?.replace(/\/$/, "");
  if (devAssets) {
    for (const name of names) {
      const path = name.startsWith("/") ? name : `/${name}`;
      urls.push(`${devAssets}${path}`);
    }
  }
  return [...new Set(urls)];
}

export function isPdfCv(value?: string | null): boolean {
  return /\.pdf($|\?)/i.test(String(value ?? ""));
}

export function isImageCv(value?: string | null): boolean {
  return /\.(png|jpe?g|gif|webp)($|\?)/i.test(String(value ?? ""));
}

export function productFeaturedImageFallbacks(
  filename?: string | null,
  imageUrl?: string | null,
): string[] {
  const urls: string[] = [];
  if (imageUrl?.trim()) urls.push(imageUrl.trim());
  if (!filename?.trim()) return [...new Set(urls)];
  const raw = filename.trim();
  if (/^https?:\/\//i.test(raw) || raw.startsWith("blob:") || raw.startsWith("data:")) {
    urls.push(raw);
    return [...new Set(urls)];
  }
  const file = raw.replace(/^\/+/, "").split("/").pop() || raw;
  const rel = `/uploads/product_images/featured_image/${file}`;
  urls.push(`${config.apiUrl}${rel}`);
  urls.push(`${config.assetsUrl}${rel}`);
  const devAssets = (import.meta.env.VITE_DEV_ASSETS_URL as string | undefined)?.replace(/\/$/, "");
  if (devAssets) urls.push(`${devAssets}${rel}`);
  urls.push(`https://rawabihypermarket.com${rel}`);
  return [...new Set(urls.filter(Boolean))];
}

export function galleryImageFallbacks(
  filename?: string | null,
  imageUrl?: string | null,
): string[] {
  const urls: string[] = [];
  if (imageUrl?.trim()) urls.push(imageUrl.trim());
  if (!filename?.trim()) return [...new Set(urls)];
  const raw = filename.trim();
  if (/^https?:\/\//i.test(raw) || raw.startsWith("blob:") || raw.startsWith("data:")) {
    urls.push(raw);
    return [...new Set(urls)];
  }
  const file = raw.replace(/^\/+/, "").split("/").pop() || raw;
  const rel = `/uploads/item_group_images/multiple_image/${file}`;
  // Prefer local API host first — admin uploads land in BACKEND/public.
  urls.push(`${config.apiUrl}${rel}`);
  urls.push(`${config.assetsUrl}${rel}`);
  const devAssets = (import.meta.env.VITE_DEV_ASSETS_URL as string | undefined)?.replace(/\/$/, "");
  if (devAssets) urls.push(`${devAssets}${rel}`);
  urls.push(`https://rawabihypermarket.com${rel}`);
  return [...new Set(urls.filter(Boolean))];
}

export function brandImageUrl(filename?: string | null, imageUrl?: string | null): string | null {
  if (imageUrl) return imageUrl;
  if (!filename) return null;
  if (/^https?:\/\//i.test(filename)) return filename;
  return `${config.assetsUrl}/uploads/brand_images/${filename}`;
}

export function brandImageFallbacks(filename?: string | null, imageUrl?: string | null): string[] {
  const urls: string[] = [];
  if (imageUrl) urls.push(imageUrl);
  if (!filename) return urls;
  if (/^https?:\/\//i.test(filename)) {
    urls.push(filename);
    return [...new Set(urls)];
  }
  const rel = `/uploads/brand_images/${filename}`;
  urls.push(`${config.assetsUrl}${rel}`);
  urls.push(`${config.apiUrl}${rel}`);
  const devAssets = (import.meta.env.VITE_DEV_ASSETS_URL as string | undefined)?.replace(/\/$/, "");
  if (devAssets) urls.push(`${devAssets}${rel}`);
  return [...new Set(urls)];
}
