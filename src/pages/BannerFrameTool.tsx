import { useCallback, useEffect, useMemo, useState } from "react";
import { adminApi } from "../lib/api";
import { LoadingCard } from "../components/LoadingIndicator";
import { config } from "../lib/config";
import type { UiUxIcons, UiUxSurface } from "../lib/uiux";

const DEFAULT_HERO_FRAME = `${config.frontstoreUrl}/assets/images/hero/swipe-frame.png?v=2`;

function resolveAssetUrl(url: string | undefined | null): string {
  const raw = String(url ?? "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw) || raw.startsWith("data:")) return raw;
  const base = config.apiUrl.replace(/\/$/, "");
  return raw.startsWith("/") ? `${base}${raw}` : `${base}/${raw}`;
}

function onFlag(v: unknown, fallback = 0): number {
  if (v === true || v === 1 || v === "1") return 1;
  if (v === false || v === 0 || v === "0") return 0;
  return fallback;
}

type FrameForm = Pick<
  UiUxIcons,
  | "web_hero_frame_url"
  | "web_hero_frame_ar_url"
  | "web_hero_frame_enabled"
  | "web_hero_frame_mobile_enabled"
  | "web_hero_frame_mobile_custom"
  | "web_hero_frame_mobile_url"
  | "web_hero_frame_mobile_ar_url"
  | "app_hero_frame_enabled"
  | "app_hero_frame_url"
  | "app_hero_frame_ar_url"
>;

const EMPTY: FrameForm = {
  web_hero_frame_url: "",
  web_hero_frame_ar_url: "",
  web_hero_frame_enabled: 1,
  web_hero_frame_mobile_enabled: 1,
  web_hero_frame_mobile_custom: 0,
  web_hero_frame_mobile_url: "",
  web_hero_frame_mobile_ar_url: "",
  app_hero_frame_enabled: 0,
  app_hero_frame_url: "",
  app_hero_frame_ar_url: "",
};

type SlotKey =
  | "web_hero_frame_url"
  | "web_hero_frame_ar_url"
  | "web_hero_frame_mobile_url"
  | "web_hero_frame_mobile_ar_url"
  | "app_hero_frame_url"
  | "app_hero_frame_ar_url";

const KIND_BY_KEY: Record<SlotKey, string> = {
  web_hero_frame_url: "web_hero_frame",
  web_hero_frame_ar_url: "web_hero_frame_ar",
  web_hero_frame_mobile_url: "web_hero_frame_mobile",
  web_hero_frame_mobile_ar_url: "web_hero_frame_mobile_ar",
  app_hero_frame_url: "app_hero_frame",
  app_hero_frame_ar_url: "app_hero_frame_ar",
};

function FrameSlot({
  label,
  hint,
  url,
  busy,
  onUpload,
  onReset,
}: {
  label: string;
  hint: string;
  url: string;
  busy: boolean;
  onUpload: (file: File | null) => void;
  onReset: () => void;
}) {
  const preview = resolveAssetUrl(url) || DEFAULT_HERO_FRAME;
  return (
    <div className="banner-hero-frame-slot">
      <div className="banner-hero-frame-preview">
        <img src={preview} alt="" />
        {!url ? <span className="banner-hero-frame-badge">Default</span> : null}
      </div>
      <div className="banner-hero-frame-meta">
        <strong>{label}</strong>
        <span className="muted small">{hint}</span>
        <div className="banner-hero-frame-actions">
          <label className="btn btn-secondary btn-sm">
            {busy ? "Uploading…" : "Change frame"}
            <input
              type="file"
              accept="image/png,image/webp,image/svg+xml,image/jpeg"
              hidden
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                e.target.value = "";
                onUpload(file);
              }}
            />
          </label>
          {url ? (
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={onReset}>
              Reset
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className={`banner-frame-toggle${disabled ? " is-disabled" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <strong>{label}</strong>
        <em className="muted small">{hint}</em>
      </span>
    </label>
  );
}

export function UiUxBannerFrameTool({ surface }: { surface: UiUxSurface }) {
  const [form, setForm] = useState<FrameForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [previewLang, setPreviewLang] = useState<"en" | "ar">("en");

  const load = useCallback(async () => {
    setError("");
    try {
      const icons = await adminApi.uiuxIcons();
      setForm({
        web_hero_frame_url: icons.web_hero_frame_url ?? "",
        web_hero_frame_ar_url: icons.web_hero_frame_ar_url ?? "",
        web_hero_frame_enabled: onFlag(icons.web_hero_frame_enabled, 1),
        web_hero_frame_mobile_enabled: onFlag(icons.web_hero_frame_mobile_enabled, 1),
        web_hero_frame_mobile_custom: onFlag(icons.web_hero_frame_mobile_custom, 0),
        web_hero_frame_mobile_url: icons.web_hero_frame_mobile_url ?? "",
        web_hero_frame_mobile_ar_url: icons.web_hero_frame_mobile_ar_url ?? "",
        app_hero_frame_enabled: onFlag(icons.app_hero_frame_enabled, 0),
        app_hero_frame_url: icons.app_hero_frame_url ?? "",
        app_hero_frame_ar_url: icons.app_hero_frame_ar_url ?? "",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load frame settings");
      setForm({ ...EMPTY });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function persist(next: FrameForm, successMsg: string) {
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const saved = await adminApi.updateUiuxIcons(next);
      setForm({
        web_hero_frame_url: saved.web_hero_frame_url ?? next.web_hero_frame_url,
        web_hero_frame_ar_url: saved.web_hero_frame_ar_url ?? next.web_hero_frame_ar_url,
        web_hero_frame_enabled: onFlag(saved.web_hero_frame_enabled, next.web_hero_frame_enabled),
        web_hero_frame_mobile_enabled: onFlag(
          saved.web_hero_frame_mobile_enabled,
          next.web_hero_frame_mobile_enabled,
        ),
        web_hero_frame_mobile_custom: onFlag(
          saved.web_hero_frame_mobile_custom,
          next.web_hero_frame_mobile_custom,
        ),
        web_hero_frame_mobile_url: saved.web_hero_frame_mobile_url ?? next.web_hero_frame_mobile_url,
        web_hero_frame_mobile_ar_url:
          saved.web_hero_frame_mobile_ar_url ?? next.web_hero_frame_mobile_ar_url,
        app_hero_frame_enabled: onFlag(saved.app_hero_frame_enabled, next.app_hero_frame_enabled),
        app_hero_frame_url: saved.app_hero_frame_url ?? next.app_hero_frame_url,
        app_hero_frame_ar_url: saved.app_hero_frame_ar_url ?? next.app_hero_frame_ar_url,
      });
      setMsg(successMsg);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function uploadSlot(key: SlotKey, file: File | null) {
    if (!file || !form) return;
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const uploaded = await adminApi.uploadUiuxAsset(file, KIND_BY_KEY[key]);
      const next = { ...form, [key]: uploaded.url };
      setForm(next);
      await persist(next, "Frame uploaded and saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setBusy(false);
    }
  }

  async function resetSlot(key: SlotKey) {
    if (!form) return;
    const next = { ...form, [key]: "" };
    setForm(next);
    await persist(next, "Frame reset to default.");
  }

  async function setFlag(
    key:
      | "web_hero_frame_enabled"
      | "web_hero_frame_mobile_enabled"
      | "web_hero_frame_mobile_custom"
      | "app_hero_frame_enabled",
    value: boolean,
  ) {
    if (!form) return;
    const next = { ...form, [key]: value ? 1 : 0 };
    if (key === "web_hero_frame_mobile_enabled" && !value) {
      next.web_hero_frame_mobile_custom = 0;
    }
    setForm(next);
    await persist(next, "Frame options saved.");
  }

  const previewUrl = useMemo(() => {
    if (!form) return DEFAULT_HERO_FRAME;
    if (surface === "app") {
      const custom =
        previewLang === "ar"
          ? form.app_hero_frame_ar_url ||
            form.app_hero_frame_url ||
            form.web_hero_frame_ar_url ||
            form.web_hero_frame_url
          : form.app_hero_frame_url ||
            form.app_hero_frame_ar_url ||
            form.web_hero_frame_url ||
            form.web_hero_frame_ar_url;
      return resolveAssetUrl(custom) || DEFAULT_HERO_FRAME;
    }
    const desktop =
      previewLang === "ar"
        ? form.web_hero_frame_ar_url || form.web_hero_frame_url
        : form.web_hero_frame_url || form.web_hero_frame_ar_url;
    if (form.web_hero_frame_mobile_custom) {
      const mobile =
        previewLang === "ar"
          ? form.web_hero_frame_mobile_ar_url || form.web_hero_frame_mobile_url || desktop
          : form.web_hero_frame_mobile_url || form.web_hero_frame_mobile_ar_url || desktop;
      return resolveAssetUrl(mobile) || DEFAULT_HERO_FRAME;
    }
    return resolveAssetUrl(desktop) || DEFAULT_HERO_FRAME;
  }, [form, previewLang, surface]);

  if (!form) {
    if (error) return <div className="card">{error}</div>;
    return <LoadingCard label="Loading banner frame" />;
  }

  const showWeb = surface === "web";
  const showApp = surface === "app";

  return (
    <div className="uiux-stack banner-frame-tool">
      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}

      <section className="card banner-hero-frame-card" aria-label="Banner frame settings">
        <div className="banner-hero-frame-head">
          <div>
            <h2 className="banner-hero-frame-title">
              {showApp ? "App banner frame" : "Web banner frame"}
            </h2>
            <p className="muted small">
              {showApp
                ? "Optional decorative overlay on the customer app home top banners."
                : "Decorative overlay on the Frontstore hero slider. Enable separately for desktop and mobile web."}
            </p>
          </div>
          <div className="banner-type-pills" role="group" aria-label="Preview language">
            <button
              type="button"
              className={previewLang === "en" ? "active" : ""}
              onClick={() => setPreviewLang("en")}
            >
              Preview EN
            </button>
            <button
              type="button"
              className={previewLang === "ar" ? "active" : ""}
              onClick={() => setPreviewLang("ar")}
            >
              Preview AR
            </button>
          </div>
        </div>

        <div className="banner-frame-live-preview">
          <img src={previewUrl} alt="" />
          <span className="muted small">Live preview · {previewLang.toUpperCase()}</span>
        </div>

        {showWeb ? (
          <>
            <div className="banner-frame-toggles">
              <ToggleRow
                label="Desktop web"
                hint="Show frame on large screens (≥768px)"
                checked={form.web_hero_frame_enabled === 1}
                disabled={busy}
                onChange={(v) => void setFlag("web_hero_frame_enabled", v)}
              />
              <ToggleRow
                label="Mobile web view"
                hint="Show frame on phone / narrow Frontstore layout"
                checked={form.web_hero_frame_mobile_enabled === 1}
                disabled={busy}
                onChange={(v) => void setFlag("web_hero_frame_mobile_enabled", v)}
              />
              <ToggleRow
                label="Custom mobile frame"
                hint="Use separate assets for mobile web instead of desktop frames"
                checked={form.web_hero_frame_mobile_custom === 1}
                disabled={busy || form.web_hero_frame_mobile_enabled !== 1}
                onChange={(v) => void setFlag("web_hero_frame_mobile_custom", v)}
              />
            </div>

            <h3 className="banner-frame-section-title">Desktop frames</h3>
            <div className="banner-hero-frame-grid">
              <FrameSlot
                label="English / LTR"
                hint={form.web_hero_frame_url ? "Custom CMS asset" : "Using Frontstore default"}
                url={form.web_hero_frame_url}
                busy={busy}
                onUpload={(f) => void uploadSlot("web_hero_frame_url", f)}
                onReset={() => void resetSlot("web_hero_frame_url")}
              />
              <FrameSlot
                label="Arabic / RTL"
                hint={form.web_hero_frame_ar_url ? "Custom CMS asset" : "Falls back to English / default"}
                url={form.web_hero_frame_ar_url}
                busy={busy}
                onUpload={(f) => void uploadSlot("web_hero_frame_ar_url", f)}
                onReset={() => void resetSlot("web_hero_frame_ar_url")}
              />
            </div>

            {form.web_hero_frame_mobile_enabled === 1 && form.web_hero_frame_mobile_custom === 1 ? (
              <>
                <h3 className="banner-frame-section-title">Mobile web frames</h3>
                <div className="banner-hero-frame-grid">
                  <FrameSlot
                    label="Mobile English / LTR"
                    hint={
                      form.web_hero_frame_mobile_url
                        ? "Custom mobile CMS asset"
                        : "Falls back to desktop English"
                    }
                    url={form.web_hero_frame_mobile_url}
                    busy={busy}
                    onUpload={(f) => void uploadSlot("web_hero_frame_mobile_url", f)}
                    onReset={() => void resetSlot("web_hero_frame_mobile_url")}
                  />
                  <FrameSlot
                    label="Mobile Arabic / RTL"
                    hint={
                      form.web_hero_frame_mobile_ar_url
                        ? "Custom mobile CMS asset"
                        : "Falls back to mobile EN / desktop"
                    }
                    url={form.web_hero_frame_mobile_ar_url}
                    busy={busy}
                    onUpload={(f) => void uploadSlot("web_hero_frame_mobile_ar_url", f)}
                    onReset={() => void resetSlot("web_hero_frame_mobile_ar_url")}
                  />
                </div>
              </>
            ) : null}
          </>
        ) : null}

        {showApp ? (
          <>
            <div className="banner-frame-toggles">
              <ToggleRow
                label="Mobile app"
                hint="Show decorative frame on APP-MOBILE home top banners. Uses app uploads, or falls back to web desktop frames."
                checked={form.app_hero_frame_enabled === 1}
                disabled={busy}
                onChange={(v) => void setFlag("app_hero_frame_enabled", v)}
              />
            </div>
            {form.app_hero_frame_enabled === 1 ? (
              <>
                <h3 className="banner-frame-section-title">App frames</h3>
                <p className="muted small" style={{ marginBottom: 10 }}>
                  Optional. If empty, the app uses the Web desktop EN/AR frames already saved under the Web → Banner
                  frame tab.
                </p>
                <div className="banner-hero-frame-grid">
                  <FrameSlot
                    label="English / LTR"
                    hint={
                      form.app_hero_frame_url
                        ? "Custom CMS asset"
                        : form.web_hero_frame_url
                          ? "Falls back to web desktop EN"
                          : "Upload an app frame or set web desktop frames first"
                    }
                    url={form.app_hero_frame_url}
                    busy={busy}
                    onUpload={(f) => void uploadSlot("app_hero_frame_url", f)}
                    onReset={() => void resetSlot("app_hero_frame_url")}
                  />
                  <FrameSlot
                    label="Arabic / RTL"
                    hint={
                      form.app_hero_frame_ar_url
                        ? "Custom CMS asset"
                        : form.web_hero_frame_ar_url || form.app_hero_frame_url || form.web_hero_frame_url
                          ? "Falls back to app EN / web frames"
                          : "Falls back to English / web / default"
                    }
                    url={form.app_hero_frame_ar_url}
                    busy={busy}
                    onUpload={(f) => void uploadSlot("app_hero_frame_ar_url", f)}
                    onReset={() => void resetSlot("app_hero_frame_ar_url")}
                  />
                </div>
              </>
            ) : (
              <p className="muted small" style={{ marginTop: 8 }}>
                Enable mobile app to upload English and Arabic frame overlays.
              </p>
            )}
          </>
        ) : null}
      </section>
    </div>
  );
}
