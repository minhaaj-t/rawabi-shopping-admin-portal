import { useMemo, useRef, useState } from "react";
import { adminApi } from "../lib/api";
import { marketingAssetPreviewFallbacks } from "../lib/media";

export type MarketingImageFormat = "original" | "webp" | "jpeg" | "png";

type Props = {
  label: string;
  hint: string;
  value: string;
  kind: "og" | "logo" | "general";
  onChange: (value: string) => void;
  onError?: (message: string) => void;
  onStatus?: (message: string) => void;
};

const FORMAT_OPTIONS: Array<{ value: MarketingImageFormat; label: string }> = [
  { value: "original", label: "Keep original" },
  { value: "webp", label: "Convert to WebP" },
  { value: "jpeg", label: "Convert to JPEG" },
  { value: "png", label: "Convert to PNG" },
];

export function MarketingImageField({ label, hint, value, kind, onChange, onError, onStatus }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [format, setFormat] = useState<MarketingImageFormat>("webp");
  const [busy, setBusy] = useState(false);
  const [broken, setBroken] = useState(false);
  const [fallbackIndex, setFallbackIndex] = useState(0);

  const fallbacks = useMemo(() => marketingAssetPreviewFallbacks(value), [value]);
  const previewSrc = fallbacks[fallbackIndex] ?? null;

  async function onPick(file: File | null) {
    if (!file) return;
    setBusy(true);
    onError?.("");
    onStatus?.("");
    try {
      const isSvg = /\.svg$/i.test(file.name) || file.type === "image/svg+xml";
      const uploadFormat = isSvg ? "original" : format;
      const uploaded = await adminApi.uploadMarketingAsset(file, { kind, format: uploadFormat });
      onChange(uploaded.url);
      setBroken(false);
      setFallbackIndex(0);
      onStatus?.(
        isSvg && format !== "original"
          ? "SVG uploaded as original (raster conversion skipped)."
          : `Uploaded as ${uploaded.format.toUpperCase()}.`,
      );
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="pf-field mkt-image-field">
      <span className="pf-label">{label}</span>
      <span className="pf-hint">{hint}</span>

      <div className="mkt-image-field-body">
        <div className={`mkt-image-preview${broken || !previewSrc ? " is-empty" : ""}`} aria-hidden={!previewSrc}>
          {previewSrc && !broken ? (
            <img
              key={previewSrc}
              src={previewSrc}
              alt=""
              onError={() => {
                if (fallbackIndex + 1 < fallbacks.length) {
                  setFallbackIndex((i) => i + 1);
                  return;
                }
                setBroken(true);
              }}
              onLoad={() => setBroken(false)}
            />
          ) : (
            <span>No preview</span>
          )}
        </div>

        <div className="mkt-image-controls">
          <input
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setBroken(false);
              setFallbackIndex(0);
            }}
            placeholder="https://… or /uploads/marketing/…"
            aria-label={`${label} URL`}
          />

          <div className="mkt-image-actions">
            <label className="mkt-image-format">
              <span>Format</span>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as MarketingImageFormat)}
                disabled={busy}
                aria-label={`${label} convert format`}
              >
                {FORMAT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,.jpg,.jpeg,.png,.gif,.webp,.svg"
              className="admin-file-input"
              disabled={busy}
              aria-label={`Upload ${label}`}
              onChange={(e) => {
                void onPick(e.target.files?.[0] ?? null);
              }}
            />

            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy || !value}
              onClick={() => {
                onChange("");
                setBroken(false);
                setFallbackIndex(0);
              }}
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
