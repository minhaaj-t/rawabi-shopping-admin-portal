import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../lib/api";
import { PfLocaleBar, type ProductLang } from "../components/PfLocaleBar";
import { LoadingCard } from "../components/LoadingIndicator";
import {
  Bell,
  Eye,
  ImageIcon,
  Palette,
  Plus,
  RotateCcw,
  Search,
  Send,
  Smartphone,
  Trash2,
  Upload,
} from "../lib/icons";
import {
  UIUX_SURFACES,
  type UiUxFaqItem,
  type UiUxIcons,
  type UiUxPages,
  type UiUxSurface,
  type UiUxTheme,
  type UiUxThemeTokens,
} from "../lib/uiux";
import { uiuxAssetPreviewUrl } from "../lib/media";
import {
  applyIconPack,
  detectActiveIconPack,
  UIUX_ICON_PACKS,
  type UiUxIconPackId,
} from "../lib/uiuxIconPresets";
import {
  applyThemePack,
  detectActiveThemePack,
  themePacksForSurface,
  type UiUxThemePackId,
} from "../lib/uiuxThemePresets";

function useBusyMsg() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  return { busy, setBusy, msg, setMsg, error, setError };
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="card stat-card uiux-stat-card">
      <h3>{label}</h3>
      <strong>{value}</strong>
    </div>
  );
}

/* ─── Push notifications ─────────────────────────────────────────── */

const AUDIENCE = [
  { value: "all", label: "All customers", hint: "Customer app inbox" },
  { value: "group", label: "Customer group", hint: "Target a usergroup" },
  { value: "promo", label: "Promotional", hint: "Marketing campaigns" },
  { value: "admin", label: "Admin / ops", hint: "Ops portal alerts" },
] as const;

type UserGroupOpt = { id: number; title: string; members: number };

export function UiUxPushTool() {
  const [lang, setLang] = useState<ProductLang>("English");
  const [titleEn, setTitleEn] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [messageEn, setMessageEn] = useState("");
  const [messageAr, setMessageAr] = useState("");
  const [type, setType] = useState("all");
  const [usergroupId, setUsergroupId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [groups, setGroups] = useState<UserGroupOpt[]>([]);
  const [translating, setTranslating] = useState(false);
  const [q, setQ] = useState("");
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const { busy, setBusy, msg, setMsg, error, setError } = useBusyMsg();
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const res = await adminApi.notifications({ per_page: 40 });
      setItems(res.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh().catch(() => setLoading(false));
    void adminApi
      .usergroups({ per_page: 100 })
      .then((res) => {
        setGroups(
          res.items.map((row) => {
            const ids = String(row.usergrp_users ?? "")
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean);
            return {
              id: Number(row.usergrp_id),
              title: String(row.usergrp_title ?? `Group #${row.usergrp_id}`),
              members: ids.length,
            };
          }),
        );
      })
      .catch(() => setGroups([]));
  }, []);

  const counts = useMemo(() => {
    const byType: Record<string, number> = {};
    let withImage = 0;
    let withGroup = 0;
    for (const row of items) {
      const t = String(row.notification_type ?? "all");
      byType[t] = (byType[t] ?? 0) + 1;
      if (String(row.notification_image ?? "").trim()) withImage += 1;
      if (Number(row.usergroup_id ?? row.notification_usergrp ?? 0) > 0) withGroup += 1;
    }
    return { total: items.length, byType, withImage, withGroup };
  }, [items]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((row) => {
      const title = String(row.notification_title ?? "").toLowerCase();
      const typeVal = String(row.notification_type ?? "").toLowerCase();
      const group = String(row.usergroup_title ?? "").toLowerCase();
      return (
        title.includes(needle) ||
        typeVal.includes(needle) ||
        group.includes(needle) ||
        String(row.notification_id).includes(needle)
      );
    });
  }, [items, q]);

  const selectedGroup = groups.find((g) => String(g.id) === usergroupId);
  const previewTitle = lang === "English" ? titleEn : titleAr || titleEn;
  const previewBody = lang === "English" ? messageEn : messageAr || messageEn;

  async function onTranslate() {
    setTranslating(true);
    setError("");
    try {
      const res = await adminApi.translate({
        texts: [titleEn, messageEn],
        from: "en",
        to: "ar",
      });
      setTitleAr(res.translations[0] || titleAr);
      setMessageAr(res.translations[1] || messageAr);
      setLang("Arabic");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Translate failed");
    } finally {
      setTranslating(false);
    }
  }

  async function onUploadImage(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const uploaded = await adminApi.uploadUiuxAsset(file, "notification");
      setImageUrl(uploaded.url);
      setMsg("Image uploaded.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function onSave() {
    if (!titleEn.trim() || !messageEn.trim()) {
      setError("English title and message are required.");
      return;
    }
    if (type === "group" && !usergroupId) {
      setError("Select a customer group for this audience.");
      return;
    }
    setBusy(true);
    setError("");
    setMsg("");
    try {
      await adminApi.createNotification({
        title: titleEn.trim(),
        title_ar: titleAr.trim() || undefined,
        message: messageEn.trim(),
        message_ar: messageAr.trim() || undefined,
        type,
        usergroup_id: type === "group" ? Number(usergroupId) : 0,
        image: imageUrl.trim() || undefined,
      });
      setMsg("Notification saved (EN + AR).");
      clearForm(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  function clearForm(clearAlerts = true) {
    setTitleEn("");
    setTitleAr("");
    setMessageEn("");
    setMessageAr("");
    setImageUrl("");
    setUsergroupId("");
    if (clearAlerts) {
      setMsg("");
      setError("");
    }
  }

  return (
    <div className="uiux-stack">
      <div className="uiux-stats card-grid">
        <Stat value={counts.total} label="Recent" />
        <Stat value={counts.byType.group ?? 0} label="Group targeted" />
        <Stat value={counts.withImage} label="With image" />
        <Stat value={groups.length} label="Customer groups" />
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}

      <div className="uiux-split">
        <section className="card uiux-panel">
          <div className="uiux-panel-head">
            <div>
              <h2>Compose notification</h2>
              <p className="muted small">Bilingual push / in-app message with optional image and group targeting.</p>
            </div>
            <PfLocaleBar lang={lang} onLangChange={setLang} showTranslate onTranslate={onTranslate} translating={translating} />
          </div>

          <div className="uiux-audience uiux-audience-4" role="radiogroup" aria-label="Audience">
            {AUDIENCE.map((a) => (
              <button
                key={a.value}
                type="button"
                role="radio"
                aria-checked={type === a.value}
                className={`uiux-audience-chip${type === a.value ? " is-active" : ""}`}
                onClick={() => {
                  setType(a.value);
                  if (a.value !== "group") setUsergroupId("");
                }}
              >
                <strong>{a.label}</strong>
                <span>{a.hint}</span>
              </button>
            ))}
          </div>

          {type === "group" ? (
            <label className="pf-field" style={{ marginTop: 12 }}>
              <span className="pf-label">Customer group</span>
              <select value={usergroupId} onChange={(e) => setUsergroupId(e.target.value)}>
                <option value="">Select a group…</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title} ({g.members} members)
                  </option>
                ))}
              </select>
              <span className="muted small">
                Manage groups in{" "}
                <Link to="/usergroups">User groups</Link>
                {selectedGroup ? ` · targeting “${selectedGroup.title}”` : ""}
              </span>
            </label>
          ) : null}

          <div className="pf-grid" style={{ marginTop: 14 }}>
            {lang === "English" ? (
              <>
                <label className="pf-field pf-field-full">
                  <span className="pf-label">Title (English)</span>
                  <input
                    value={titleEn}
                    maxLength={80}
                    placeholder="Order shipped"
                    onChange={(e) => setTitleEn(e.target.value)}
                  />
                  <span className="muted small">{titleEn.length}/80</span>
                </label>
                <label className="pf-field pf-field-full">
                  <span className="pf-label">Message (English)</span>
                  <textarea
                    rows={5}
                    maxLength={240}
                    value={messageEn}
                    placeholder="Your order #1234 is on the way…"
                    onChange={(e) => setMessageEn(e.target.value)}
                  />
                  <span className="muted small">{messageEn.length}/240</span>
                </label>
              </>
            ) : (
              <>
                <label className="pf-field pf-field-full">
                  <span className="pf-label">Title (Arabic)</span>
                  <input dir="rtl" value={titleAr} maxLength={80} onChange={(e) => setTitleAr(e.target.value)} />
                  <span className="muted small">{titleAr.length}/80</span>
                </label>
                <label className="pf-field pf-field-full">
                  <span className="pf-label">Message (Arabic)</span>
                  <textarea
                    dir="rtl"
                    rows={5}
                    maxLength={240}
                    value={messageAr}
                    onChange={(e) => setMessageAr(e.target.value)}
                  />
                  <span className="muted small">{messageAr.length}/240</span>
                </label>
              </>
            )}

            <div className="pf-field pf-field-full">
              <span className="pf-label">Notification image (optional)</span>
              <div className="uiux-push-image-row">
                <div className={`uiux-push-image-preview${imageUrl ? " has-img" : ""}`}>
                  {imageUrl ? (
                    <img src={imageUrl} alt="" />
                  ) : (
                    <span className="muted small">
                      <ImageIcon size={20} aria-hidden />
                      No image
                    </span>
                  )}
                </div>
                <div className="uiux-push-image-fields">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => void onUploadImage(e.target.files?.[0] ?? null)}
                  />
                  <div className="toolbar">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={busy}
                      onClick={() => imageInputRef.current?.click()}
                    >
                      <Upload size={14} aria-hidden />
                      Upload image
                    </button>
                    {imageUrl ? (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setImageUrl("")}>
                        <Trash2 size={14} aria-hidden />
                        Remove
                      </button>
                    ) : null}
                  </div>
                  <input
                    value={imageUrl}
                    placeholder="Or paste image URL…"
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                  <span className="muted small">Shown in app notification / inbox when supported.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="uiux-panel-actions">
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => clearForm()}>
              Clear
            </button>
            <Link className="btn btn-secondary" to="/notifications">
              Full list
            </Link>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void onSave()}>
              <Send size={15} aria-hidden />
              {busy ? "Saving…" : "Save notification"}
            </button>
          </div>
        </section>

        <aside className="card uiux-panel uiux-push-preview-pane">
          <div className="uiux-panel-head">
            <h2>Device preview</h2>
            <span className="uiux-surface-badge">
              <Smartphone size={14} aria-hidden />
              {lang}
            </span>
          </div>
          <div className="uiux-phone">
            <div className="uiux-phone-notch" />
            <div className="uiux-phone-status">
              <span>9:41</span>
              <Bell size={12} aria-hidden />
            </div>
            <div className="uiux-push-toast">
              <div className="uiux-push-toast-icon" aria-hidden>
                <Bell size={16} />
              </div>
              <div className="uiux-push-toast-body">
                <strong>{previewTitle.trim() || "Notification title"}</strong>
                <p>{previewBody.trim() || "Message preview appears here as you type."}</p>
                {imageUrl ? <img src={imageUrl} alt="" className="uiux-push-toast-img" /> : null}
                <em>
                  now · Rawabi
                  {type === "group" && selectedGroup ? ` · ${selectedGroup.title}` : ` · ${type}`}
                </em>
              </div>
            </div>
            <p className="muted small uiux-push-hint">Preview only — delivery uses FCM / in-app inbox.</p>
          </div>
        </aside>
      </div>

      <section className="card uiux-panel">
        <div className="panel-toolbar">
          <h2 style={{ margin: 0 }}>Recent notifications</h2>
          <div className="uiux-search">
            <Search size={15} aria-hidden />
            <input
              value={q}
              placeholder="Search title, type, or group…"
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search notifications"
            />
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => void refresh()}>
            <RotateCcw size={14} aria-hidden />
            Refresh
          </button>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>ID</th>
                <th>Preview</th>
                <th>Title</th>
                <th>Audience</th>
                <th>Group</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="muted">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">
                    No notifications yet
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const img = String(row.notification_image ?? "").trim();
                  const gid = Number(row.usergroup_id ?? row.notification_usergrp ?? 0);
                  return (
                    <tr key={String(row.notification_id)}>
                      <td className="mono">{String(row.notification_id)}</td>
                      <td>
                        {img ? (
                          <img src={img} alt="" className="uiux-push-table-thumb" />
                        ) : (
                          <span className="muted small">—</span>
                        )}
                      </td>
                      <td>
                        <strong>{String(row.notification_title ?? "")}</strong>
                      </td>
                      <td>
                        <span className={`uiux-type-pill type-${String(row.notification_type ?? "all")}`}>
                          {String(row.notification_type ?? "")}
                        </span>
                      </td>
                      <td className="muted small">
                        {gid > 0 ? String(row.usergroup_title || `#${gid}`) : "—"}
                      </td>
                      <td className="muted small">{String(row.notification_created_at ?? "")}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ─── Theme ──────────────────────────────────────────────────────── */

const THEME_LABELS: Record<string, string> = {
  primary: "Primary",
  secondary: "Secondary",
  accent: "Accent",
  ink: "Ink / text",
  surface: "Surface",
  danger: "Danger",
};

const THEME_HINTS: Record<string, string> = {
  primary: "Buttons, links, active states",
  secondary: "Secondary actions & chips",
  accent: "Highlights & badges",
  ink: "Body text & headings",
  surface: "Page / card background",
  danger: "Errors & destructive actions",
};

export function UiUxThemeTool({ surface }: { surface: UiUxSurface }) {
  const themeKey = `theme_${UIUX_SURFACES[surface].themeKey}` as keyof UiUxTheme;
  const packs = useMemo(() => themePacksForSurface(surface), [surface]);
  const { busy, setBusy, msg, setMsg, error, setError } = useBusyMsg();
  const [form, setForm] = useState<UiUxTheme | null>(null);
  const [baseline, setBaseline] = useState<string>("");
  const [activePack, setActivePack] = useState<UiUxThemePackId | null>(null);

  useEffect(() => {
    void adminApi
      .uiuxTheme()
      .then((data) => {
        setForm(data);
        const t = data[themeKey] ?? {};
        setBaseline(JSON.stringify(t));
        setActivePack(detectActiveThemePack(t));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }, [setError, themeKey]);

  const tokens = form?.[themeKey] ?? {};
  const dirty = form ? JSON.stringify(tokens) !== baseline : false;

  function onSelectPack(packId: UiUxThemePackId) {
    if (!form) return;
    const pack = packs.find((p) => p.id === packId);
    if (!pack) return;
    const nextTokens = applyThemePack(tokens, pack);
    setForm({ ...form, [themeKey]: nextTokens });
    setActivePack(packId);
    setMsg(`Applied “${pack.label}” — save to publish.`);
    setError("");
  }

  async function onSave() {
    if (!form) return;
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const saved = await adminApi.updateUiuxTheme({ [themeKey]: form[themeKey] });
      setForm(saved);
      const t = saved[themeKey] ?? {};
      setBaseline(JSON.stringify(t));
      setActivePack(detectActiveThemePack(t));
      setMsg("Theme saved. Clients read tokens from /api/v2/cms.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  function resetTokens() {
    if (!form || !baseline) return;
    if (!window.confirm("Reset unsaved theme changes?")) return;
    try {
      const parsed = JSON.parse(baseline) as UiUxThemeTokens;
      setForm({ ...form, [themeKey]: parsed });
      setActivePack(detectActiveThemePack(parsed));
    } catch {
      /* ignore */
    }
  }

  if (!form) {
    if (error) return <div className="card">{error}</div>;
    return <LoadingCard label="Loading theme" />;
  }

  const primary = tokens.primary || "#2b8f43";
  const accent = tokens.accent || "#f5a623";
  const ink = tokens.ink || "#111827";
  const surfaceColor = tokens.surface || "#ffffff";
  const danger = tokens.danger || "#dc2626";
  const secondary = tokens.secondary || "#6b7280";
  const activeLabel = packs.find((p) => p.id === activePack)?.label ?? "Custom";

  return (
    <div className="uiux-stack">
      <div className="uiux-stats card-grid">
        <Stat value={packs.length} label="Themes" />
        <Stat value={activeLabel} label="Selected" />
        <Stat value={dirty ? "Unsaved" : "Saved"} label="Status" />
        <Stat value={UIUX_SURFACES[surface].themeKey} label="CMS key" />
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}

      <section className="card uiux-panel">
        <div className="uiux-panel-head">
          <div className="uiux-panel-copy">
            <h2>Theme presets — {UIUX_SURFACES[surface].title}</h2>
            <p className="muted small">Pick a ready-made palette, then tweak tokens or save as-is.</p>
          </div>
          <div className="uiux-panel-actions-inline">
            <button type="button" className="btn btn-secondary" disabled={!dirty || busy} onClick={resetTokens}>
              <RotateCcw size={14} aria-hidden />
              Reset
            </button>
            <button type="button" className="btn btn-primary" disabled={busy || !dirty} onClick={() => void onSave()}>
              {busy ? "Saving…" : "Save theme"}
            </button>
          </div>
        </div>

        <div className="uiux-theme-packs" role="listbox" aria-label="Theme presets">
          {packs.map((pack) => (
            <button
              key={pack.id}
              type="button"
              role="option"
              aria-selected={activePack === pack.id}
              className={`uiux-theme-pack${activePack === pack.id ? " is-active" : ""}`}
              onClick={() => onSelectPack(pack.id)}
              disabled={busy}
            >
              <span className="uiux-theme-pack-swatches" aria-hidden>
                <i style={{ background: pack.tokens.primary }} />
                <i style={{ background: pack.tokens.secondary }} />
                <i style={{ background: pack.tokens.accent }} />
                <i style={{ background: pack.tokens.surface, border: "1px solid #e5e7eb" }} />
              </span>
              <span className="uiux-theme-pack-body">
                <strong>{pack.label}</strong>
                <em>{pack.labelAr}</em>
                <span>{pack.desc}</span>
                <small>{pack.tag}</small>
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="uiux-split">
        <section className="card uiux-panel">
          <div className="uiux-panel-head">
            <div className="uiux-panel-copy">
              <h2>Fine-tune colors</h2>
              <p className="muted small">Adjust individual tokens after selecting a preset.</p>
            </div>
          </div>

          <div className="uiux-theme-grid">
            {Object.entries(tokens).map(([key, value]) => (
              <label key={key} className="uiux-theme-card">
                <span
                  className="uiux-theme-swatch-lg"
                  style={{ background: /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#ccc" }}
                />
                <span className="uiux-theme-card-label">{THEME_LABELS[key] ?? key}</span>
                <span className="uiux-theme-card-hint">{THEME_HINTS[key] ?? key}</span>
                <div className="uiux-theme-row">
                  <input
                    type="color"
                    value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#2b8f43"}
                    onChange={(e) => {
                      const next = { ...tokens, [key]: e.target.value } as UiUxThemeTokens;
                      setForm({ ...form, [themeKey]: next });
                      setActivePack(detectActiveThemePack(next));
                    }}
                  />
                  <input
                    value={value}
                    onChange={(e) => {
                      const next = { ...tokens, [key]: e.target.value } as UiUxThemeTokens;
                      setForm({ ...form, [themeKey]: next });
                      setActivePack(detectActiveThemePack(next));
                    }}
                  />
                </div>
              </label>
            ))}
          </div>
        </section>

        <aside className="card uiux-panel uiux-theme-preview-pane">
          <div className="uiux-panel-head">
            <div className="uiux-panel-copy">
              <h2>Live preview</h2>
              <p className="muted small">{activeLabel}</p>
            </div>
            <Palette size={16} aria-hidden />
          </div>
          <div className="uiux-theme-mock" style={{ background: surfaceColor, color: ink }}>
            <header className="uiux-theme-mock-bar" style={{ background: primary }}>
              <span>Rawabi</span>
              <em style={{ background: accent }} />
            </header>
            <div className="uiux-theme-mock-body">
              <strong>Fresh groceries</strong>
              <p style={{ color: secondary }}>Sample product card using your brand tokens.</p>
              <div className="uiux-theme-mock-actions">
                <button type="button" style={{ background: primary, color: "#fff" }}>
                  Primary
                </button>
                <button type="button" style={{ background: secondary, color: "#fff" }}>
                  Secondary
                </button>
                <button type="button" style={{ background: danger, color: "#fff" }}>
                  Danger
                </button>
              </div>
              <span className="uiux-theme-mock-badge" style={{ background: accent, color: ink }}>
                Accent badge
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ─── Icons ──────────────────────────────────────────────────────── */

export function UiUxIconsTool({ surface }: { surface: UiUxSurface }) {
  const focus = UIUX_SURFACES[surface].iconFocus;
  const { busy, setBusy, msg, setMsg, error, setError } = useBusyMsg();
  const [form, setForm] = useState<UiUxIcons | null>(null);
  const [activePack, setActivePack] = useState<UiUxIconPackId | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    void adminApi
      .uiuxIcons()
      .then((data) => {
        setForm(data);
        setActivePack(detectActiveIconPack(data, focus));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }, [setError, focus]);

  const fields = useMemo(() => {
    const all: Array<{ key: keyof UiUxIcons; label: string; kind: string; hint: string }> = [
      { key: "app_icon_url", label: "Customer app icon", kind: "app_icon", hint: "1024×1024 PNG / WebP" },
      { key: "app_splash_url", label: "Customer app splash", kind: "app_splash", hint: "Portrait splash" },
      { key: "delivery_icon_url", label: "Delivery / picker icon", kind: "delivery_icon", hint: "1024×1024" },
      { key: "delivery_splash_url", label: "Delivery / picker splash", kind: "delivery_splash", hint: "Portrait splash" },
      { key: "web_favicon_url", label: "Web favicon", kind: "web_favicon", hint: "ICO / PNG / SVG" },
      { key: "web_logo_url", label: "Web / admin logo", kind: "web_logo", hint: "Transparent PNG" },
    ];
    if (focus === "app") return all.filter((f) => f.key === "app_icon_url");
    if (focus === "delivery") return all.filter((f) => f.key.startsWith("delivery_"));
    if (focus === "web") return all.filter((f) => f.key.startsWith("web_"));
    return all;
  }, [focus]);

  const configured = fields.filter((f) => form?.[f.key]?.trim()).length;

  function onApplyPack(packId: UiUxIconPackId) {
    if (!form) return;
    const pack = UIUX_ICON_PACKS.find((p) => p.id === packId);
    if (!pack) return;
    setForm(applyIconPack(form, pack, focus));
    setActivePack(packId);
    setMsg(`Applied “${pack.label}” sample — save to persist.`);
    setError("");
  }

  async function onUpload(key: keyof UiUxIcons, kind: string, file: File | null) {
    if (!file || !form) return;
    setBusy(true);
    setError("");
    try {
      const uploaded = await adminApi.uploadUiuxAsset(file, kind);
      const stored = uploaded.path || uploaded.url;
      const next = { ...form, [key]: stored };
      const payload = focus === "app" ? { ...next, app_splash_url: "" } : next;
      const saved = await adminApi.updateUiuxIcons(payload);
      setForm(saved);
      setActivePack(detectActiveIconPack(saved, focus));
      setMsg("Image uploaded and published.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function onSave() {
    if (!form) return;
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const payload = focus === "app" ? { ...form, app_splash_url: "" } : form;
      const saved = await adminApi.updateUiuxIcons(payload);
      setForm(saved);
      setActivePack(detectActiveIconPack(saved, focus));
      setMsg("Icons saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (!form) {
    if (error) return <div className="card">{error}</div>;
    return <LoadingCard label="Loading icons" />;
  }

  return (
    <div className="uiux-stack">
      <div className="uiux-stats card-grid">
        <Stat value={`${configured}/${fields.length}`} label="Configured" />
        <Stat value={UIUX_SURFACES[surface].title} label="Surface" />
        <Stat value={UIUX_ICON_PACKS.length} label="Sample packs" />
        <Stat value={fields.length - configured} label="Missing" />
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}

      <section className="card uiux-panel">
        <div className="uiux-panel-head">
          <div className="uiux-panel-copy">
            <h2>Seasonal &amp; event samples</h2>
            <p className="muted small">
              {focus === "app"
                ? "One-tap sample icon for Eid, Ramadan, winter, and more. Apply, then save to publish. The in-app splash animation stays the same."
                : "One-tap sample icon + splash for Eid, Ramadan, winter, and more. Apply, then save to publish."}
            </p>
          </div>
        </div>
        <div className="uiux-icon-packs">
          {UIUX_ICON_PACKS.map((pack) => (
            <button
              key={pack.id}
              type="button"
              className={`uiux-icon-pack${activePack === pack.id ? " is-active" : ""} ${pack.tone}`}
              onClick={() => onApplyPack(pack.id)}
              disabled={busy}
            >
              <span className="uiux-icon-pack-art" aria-hidden>
                <img src={pack.icon} alt="" />
              </span>
              <span className="uiux-icon-pack-body">
                <strong>{pack.label}</strong>
                <em>{pack.labelAr}</em>
                <span>{pack.desc}</span>
                <small>{pack.season}</small>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="card uiux-panel">
        <div className="uiux-panel-head">
          <div className="uiux-panel-copy">
            <h2>{focus === "app" ? "App icon" : "Icon & splash assets"}</h2>
            <p className="muted small">
              {focus === "app"
                ? "Upload a 1024×1024 PNG / WebP. Upload publishes immediately. Seasonal samples still work from the cards above."
                : "Upload your own PNGs/WebP, or start from a seasonal sample above."}
            </p>
          </div>
          <div className="uiux-panel-actions-inline">
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void onSave()}>
              {busy ? "Saving…" : "Save icons"}
            </button>
          </div>
        </div>

        <div className="uiux-icons-grid">
          {fields.map((field) => {
            const url = form[field.key];
            const preview = uiuxAssetPreviewUrl(url);
            return (
              <article key={field.key} className={`uiux-icon-card${url ? " has-asset" : ""}`}>
                <div className="uiux-icon-preview-wrap">
                  {preview ? (
                    <img src={preview} alt="" className="uiux-icon-preview" />
                  ) : (
                    <div className="uiux-icon-empty">
                      <ImageIcon size={28} aria-hidden />
                      <span>No asset</span>
                    </div>
                  )}
                </div>
                <div className="uiux-icon-meta">
                  <strong>{field.label}</strong>
                  <span className="muted small">{field.hint}</span>
                  <input
                    value={url}
                    placeholder="https://… or /uploads/uiux/…"
                    onChange={(e) => {
                      const next = { ...form, [field.key]: e.target.value };
                      setForm(next);
                      setActivePack(detectActiveIconPack(next, focus));
                    }}
                  />
                  <div className="uiux-icon-actions">
                    <input
                      ref={(el) => {
                        fileRefs.current[field.key] = el;
                      }}
                      type="file"
                      accept="image/*,.ico,.svg"
                      className="banner-file-input"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        e.target.value = "";
                        void onUpload(field.key, field.kind, file);
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={busy}
                      onClick={() => fileRefs.current[field.key]?.click()}
                    >
                      <Upload size={14} aria-hidden />
                      Upload
                    </button>
                    {url ? (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          const next = { ...form, [field.key]: "" };
                          setForm(next);
                          setActivePack(detectActiveIconPack(next, focus));
                        }}
                      >
                        <Trash2 size={14} aria-hidden />
                        Clear
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/* ─── CMS pages ──────────────────────────────────────────────────── */

type PageKey = "about" | "about_rawabi" | "terms" | "privacy" | "return" | "career" | "warranty";

const PAGE_META: Record<
  PageKey,
  { titleEn: keyof UiUxPages; titleAr: keyof UiUxPages; bodyEn: keyof UiUxPages; bodyAr: keyof UiUxPages; heading: string }
> = {
  about: {
    heading: "About us",
    titleEn: "about_title_en",
    titleAr: "about_title_ar",
    bodyEn: "about_body_en",
    bodyAr: "about_body_ar",
  },
  about_rawabi: {
    heading: "About Rawabi",
    titleEn: "about_rawabi_title_en",
    titleAr: "about_rawabi_title_ar",
    bodyEn: "about_rawabi_body_en",
    bodyAr: "about_rawabi_body_ar",
  },
  terms: {
    heading: "Terms",
    titleEn: "terms_title_en",
    titleAr: "terms_title_ar",
    bodyEn: "terms_body_en",
    bodyAr: "terms_body_ar",
  },
  privacy: {
    heading: "Privacy policy",
    titleEn: "privacy_title_en",
    titleAr: "privacy_title_ar",
    bodyEn: "privacy_body_en",
    bodyAr: "privacy_body_ar",
  },
  return: {
    heading: "Return policy",
    titleEn: "return_title_en",
    titleAr: "return_title_ar",
    bodyEn: "return_body_en",
    bodyAr: "return_body_ar",
  },
  career: {
    heading: "Careers",
    titleEn: "career_title_en",
    titleAr: "career_title_ar",
    bodyEn: "career_body_en",
    bodyAr: "career_body_ar",
  },
  warranty: {
    heading: "Service & warranty",
    titleEn: "warranty_title_en",
    titleAr: "warranty_title_ar",
    bodyEn: "warranty_body_en",
    bodyAr: "warranty_body_ar",
  },
};

export function UiUxCmsPageTool({ pageKey }: { pageKey: PageKey }) {
  const meta = PAGE_META[pageKey];
  const [lang, setLang] = useState<ProductLang>("English");
  const [form, setForm] = useState<UiUxPages | null>(null);
  const [translating, setTranslating] = useState(false);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const { busy, setBusy, msg, setMsg, error, setError } = useBusyMsg();

  useEffect(() => {
    void adminApi
      .uiuxPages()
      .then(setForm)
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }, [setError]);

  async function onTranslate() {
    if (!form) return;
    setTranslating(true);
    setError("");
    try {
      const res = await adminApi.translate({
        texts: [String(form[meta.titleEn]), String(form[meta.bodyEn])],
        from: "en",
        to: "ar",
      });
      setForm({
        ...form,
        [meta.titleAr]: res.translations[0] || form[meta.titleAr],
        [meta.bodyAr]: res.translations[1] || form[meta.bodyAr],
      });
      setLang("Arabic");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Translate failed");
    } finally {
      setTranslating(false);
    }
  }

  async function onSave() {
    if (!form) return;
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const saved = await adminApi.updateUiuxPages({
        [meta.titleEn]: form[meta.titleEn],
        [meta.titleAr]: form[meta.titleAr],
        [meta.bodyEn]: form[meta.bodyEn],
        [meta.bodyAr]: form[meta.bodyAr],
      });
      setForm(saved);
      setMsg("CMS page saved (English + Arabic).");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (!form) {
    if (error) return <div className="card">{error}</div>;
    return <LoadingCard label="Loading CMS page" />;
  }

  const titleKey = lang === "English" ? meta.titleEn : meta.titleAr;
  const bodyKey = lang === "English" ? meta.bodyEn : meta.bodyAr;
  const title = String(form[titleKey] ?? "");
  const body = String(form[bodyKey] ?? "");

  return (
    <div className="uiux-stack">
      <div className="uiux-stats card-grid">
        <Stat value={lang === "English" ? "EN" : "AR"} label="Editing" />
        <Stat value={title.length} label="Title chars" />
        <Stat value={body.length} label="Body chars" />
        <Stat value="HTML" label="Format" />
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}

      <div className="uiux-split uiux-split-cms">
        <section className="card uiux-panel">
          <div className="uiux-panel-head">
            <div>
              <h2>{meta.heading}</h2>
              <p className="muted small">Bilingual CMS content for web (and linked app screens).</p>
            </div>
            <div className="toolbar">
              <div className="uiux-seg" role="tablist">
                <button
                  type="button"
                  role="tab"
                  className={tab === "edit" ? "is-active" : ""}
                  onClick={() => setTab("edit")}
                >
                  Edit
                </button>
                <button
                  type="button"
                  role="tab"
                  className={tab === "preview" ? "is-active" : ""}
                  onClick={() => setTab("preview")}
                >
                  <Eye size={14} aria-hidden />
                  Preview
                </button>
              </div>
              <PfLocaleBar lang={lang} onLangChange={setLang} showTranslate onTranslate={onTranslate} translating={translating} />
            </div>
          </div>

          {tab === "edit" ? (
            <div className="pf-grid">
              <label className="pf-field pf-field-full">
                <span className="pf-label">Title ({lang})</span>
                <input
                  dir={lang === "Arabic" ? "rtl" : undefined}
                  value={title}
                  onChange={(e) => setForm({ ...form, [titleKey]: e.target.value })}
                />
              </label>
              <label className="pf-field pf-field-full">
                <span className="pf-label">Body HTML ({lang})</span>
                <textarea
                  dir={lang === "Arabic" ? "rtl" : undefined}
                  rows={16}
                  className="uiux-code-area"
                  value={body}
                  onChange={(e) => setForm({ ...form, [bodyKey]: e.target.value })}
                />
              </label>
            </div>
          ) : (
            <article className="uiux-cms-preview" dir={lang === "Arabic" ? "rtl" : undefined}>
              <h3>{title || "Untitled"}</h3>
              <div dangerouslySetInnerHTML={{ __html: body || "<p class='muted'>No content yet.</p>" }} />
            </article>
          )}

          <div className="uiux-panel-actions">
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void onSave()}>
              {busy ? "Saving…" : "Save page"}
            </button>
          </div>
        </section>

        <aside className="card uiux-panel uiux-cms-side-preview">
          <div className="uiux-panel-head">
            <h2>Live preview</h2>
            <span className="uiux-surface-badge">{lang}</span>
          </div>
          <article className="uiux-cms-preview" dir={lang === "Arabic" ? "rtl" : undefined}>
            <h3>{title || "Untitled"}</h3>
            <div dangerouslySetInnerHTML={{ __html: body || "<p class='muted'>Start typing to preview.</p>" }} />
          </article>
        </aside>
      </div>
    </div>
  );
}

/* ─── FAQ ────────────────────────────────────────────────────────── */

export function UiUxFaqTool() {
  const [lang, setLang] = useState<ProductLang>("English");
  const [form, setForm] = useState<UiUxPages | null>(null);
  const [translating, setTranslating] = useState(false);
  const [q, setQ] = useState("");
  const { busy, setBusy, msg, setMsg, error, setError } = useBusyMsg();

  useEffect(() => {
    void adminApi
      .uiuxPages()
      .then(setForm)
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }, [setError]);

  function updateItem(index: number, patch: Partial<UiUxFaqItem>) {
    if (!form) return;
    setForm({
      ...form,
      faq_items: form.faq_items.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    });
  }

  const activeCount = form?.faq_items.filter((r) => r.status === 1).length ?? 0;

  const visible = useMemo(() => {
    if (!form) return [] as Array<{ row: UiUxFaqItem; index: number }>;
    const needle = q.trim().toLowerCase();
    return form.faq_items
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => {
        if (!needle) return true;
        return (
          row.question_en.toLowerCase().includes(needle) ||
          row.question_ar.includes(needle) ||
          row.answer_en.toLowerCase().includes(needle)
        );
      });
  }, [form, q]);

  async function onTranslate() {
    if (!form) return;
    setTranslating(true);
    setError("");
    try {
      const texts = [form.faq_intro_en, ...form.faq_items.flatMap((r) => [r.question_en, r.answer_en])];
      const res = await adminApi.translate({ texts, from: "en", to: "ar" });
      let i = 0;
      const introAr = res.translations[i++] || form.faq_intro_ar;
      const faq_items = form.faq_items.map((row) => ({
        ...row,
        question_ar: res.translations[i++] || row.question_ar,
        answer_ar: res.translations[i++] || row.answer_ar,
      }));
      setForm({ ...form, faq_intro_ar: introAr, faq_items });
      setLang("Arabic");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Translate failed");
    } finally {
      setTranslating(false);
    }
  }

  async function onSave() {
    if (!form) return;
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const saved = await adminApi.updateUiuxPages({
        faq_intro_en: form.faq_intro_en,
        faq_intro_ar: form.faq_intro_ar,
        faq_items: form.faq_items,
      });
      setForm(saved);
      setMsg("FAQ saved (English + Arabic).");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (!form) {
    if (error) return <div className="card">{error}</div>;
    return <LoadingCard label="Loading FAQ" />;
  }

  return (
    <div className="uiux-stack">
      <div className="uiux-stats card-grid">
        <Stat value={form.faq_items.length} label="Questions" />
        <Stat value={activeCount} label="Active" />
        <Stat value={form.faq_items.length - activeCount} label="Hidden" />
        <Stat value={lang === "English" ? "EN" : "AR"} label="Editing" />
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}

      <section className="card uiux-panel">
        <div className="uiux-panel-head">
          <div>
            <h2>FAQ intro</h2>
            <p className="muted small">Shown above the Q&A list on web.</p>
          </div>
          <div className="toolbar">
            <PfLocaleBar lang={lang} onLangChange={setLang} showTranslate onTranslate={onTranslate} translating={translating} />
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void onSave()}>
              {busy ? "Saving…" : "Save FAQ"}
            </button>
          </div>
        </div>
        <label className="pf-field">
          <span className="pf-label">Intro ({lang})</span>
          <textarea
            dir={lang === "Arabic" ? "rtl" : undefined}
            rows={2}
            value={lang === "English" ? form.faq_intro_en : form.faq_intro_ar}
            onChange={(e) =>
              setForm({
                ...form,
                ...(lang === "English" ? { faq_intro_en: e.target.value } : { faq_intro_ar: e.target.value }),
              })
            }
          />
        </label>
      </section>

      <section className="card uiux-panel">
        <div className="panel-toolbar">
          <h2 style={{ margin: 0 }}>Questions</h2>
          <div className="uiux-search">
            <Search size={15} aria-hidden />
            <input value={q} placeholder="Filter questions…" onChange={(e) => setQ(e.target.value)} />
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              setForm({
                ...form,
                faq_items: [
                  ...form.faq_items,
                  { question_en: "", question_ar: "", answer_en: "", answer_ar: "", status: 1 },
                ],
              })
            }
          >
            <Plus size={15} aria-hidden />
            Add FAQ
          </button>
        </div>

        <div className="uiux-faq-list">
          {visible.map(({ row, index }) => (
            <article key={index} className={`uiux-faq-row${row.status !== 1 ? " is-off" : ""}`}>
              <div className="uiux-faq-row-head">
                <span className="uiux-faq-index">#{index + 1}</span>
                <span className={`status-pill ${row.status === 1 ? "on" : "off"}`}>
                  {row.status === 1 ? "Active" : "Hidden"}
                </span>
              </div>
              <label className="pf-field">
                <span className="pf-label">Question ({lang})</span>
                <input
                  dir={lang === "Arabic" ? "rtl" : undefined}
                  value={lang === "English" ? row.question_en : row.question_ar}
                  onChange={(e) =>
                    updateItem(
                      index,
                      lang === "English" ? { question_en: e.target.value } : { question_ar: e.target.value },
                    )
                  }
                />
              </label>
              <label className="pf-field">
                <span className="pf-label">Answer ({lang})</span>
                <textarea
                  dir={lang === "Arabic" ? "rtl" : undefined}
                  rows={3}
                  value={lang === "English" ? row.answer_en : row.answer_ar}
                  onChange={(e) =>
                    updateItem(
                      index,
                      lang === "English" ? { answer_en: e.target.value } : { answer_ar: e.target.value },
                    )
                  }
                />
              </label>
              <div className="toolbar">
                <label className="check-inline">
                  <input
                    type="checkbox"
                    checked={row.status === 1}
                    onChange={(e) => updateItem(index, { status: e.target.checked ? 1 : 0 })}
                  />
                  Active on storefront
                </label>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setForm({ ...form, faq_items: form.faq_items.filter((_, i) => i !== index) })}
                >
                  <Trash2 size={14} aria-hidden />
                  Remove
                </button>
              </div>
            </article>
          ))}
          {visible.length === 0 ? <p className="muted">No FAQ items match.</p> : null}
        </div>
      </section>
    </div>
  );
}
