export const config = {
  apiUrl: (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || "http://127.0.0.1:8000",
  assetsUrl:
    (import.meta.env.VITE_ASSETS_URL as string | undefined)?.replace(/\/$/, "") ||
    "https://rawabihypermarket.com",
  frontstoreUrl:
    (import.meta.env.VITE_FRONTSTORE_URL as string | undefined)?.replace(/\/$/, "") || "http://127.0.0.1:3000",
};

export type PreviewDevice = "desktop" | "laptop" | "tablet" | "mobile";

export const PREVIEW_DEVICES: Record<
  PreviewDevice,
  { label: string; width: number; height: number; platform: "web" | "mobile" }
> = {
  desktop: { label: "Desktop", width: 1440, height: 900, platform: "web" },
  laptop: { label: "Laptop", width: 1280, height: 800, platform: "web" },
  tablet: { label: "Tablet", width: 834, height: 1100, platform: "web" },
  mobile: { label: "Mobile", width: 390, height: 844, platform: "mobile" },
};
