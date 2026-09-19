import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Eye, ImageIcon, RotateCcw, Trash2, Upload } from "../lib/icons";
import { adminApi } from "../lib/api";
import { config } from "../lib/config";
import { PfLocaleBar, type ProductLang } from "../components/PfLocaleBar";
import { LoadingCard } from "../components/LoadingIndicator";

type EditorTab = "write" | "html" | "preview";

type Draft = {
  title: string;
  title_ar: string;
  short: string;
  short_ar: string;
  description: string;
  description_ar: string;
  slug: string;
  author: string;
  category: string;
  tags: string;
  seo_title: string;
  seo_description: string;
  featured_image: string;
  featured_image_url: string;
  gallery: string[];
  gallery_urls: string[];
  date: string;
  status: number;
};

const EMPTY: Draft = {
  title: "",
  title_ar: "",
  short: "",
  short_ar: "",
  description: "",
  description_ar: "",
  slug: "",
  author: "Rawabi Editorial",
  category: "News",
  tags: "",
  seo_title: "",
  seo_description: "",
  featured_image: "",
  featured_image_url: "",
  gallery: [],
  gallery_urls: [],
  date: new Date().toISOString().slice(0, 16),
  status: 0,
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 180);
}

function toDatetimeLocal(value?: string): string {
  if (!value) return new Date().toISOString().slice(0, 16);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 16);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function mediaUrl(url?: string, filename?: string): string {
  const raw = (url || filename || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return `${config.apiUrl}${raw}`;
  return `${config.apiUrl}/uploads/news/${raw}`;
}

function rowToDraft(row: Record<string, unknown>): Draft {
  return {
    title: String(row.title ?? ""),
    title_ar: String(row.title_ar ?? ""),
    short: String(row.short ?? ""),
    short_ar: String(row.short_ar ?? ""),
    description: String(row.description ?? ""),
    description_ar: String(row.description_ar ?? ""),
    slug: String(row.slug ?? ""),
    author: String(row.author ?? "Rawabi Editorial"),
    category: String(row.category ?? "News"),
    tags: String(row.tags ?? ""),
    seo_title: String(row.seo_title ?? ""),
    seo_description: String(row.seo_description ?? ""),
    featured_image: String(row.featured_image ?? row.nw_featuredimg ?? ""),
    featured_image_url: String(row.featured_image_url ?? ""),
    gallery: Array.isArray(row.gallery) ? row.gallery.map(String) : [],
    gallery_urls: Array.isArray(row.gallery_urls) ? row.gallery_urls.map(String) : [],
    date: toDatetimeLocal(String(row.nw_news_date ?? "")),
    status: Number(row.nw_status ?? 0),
  };
}

export function NewsEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === "new";
  const numericId = isNew ? null : Number(id);

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [baseline, setBaseline] = useState("");
  const [lang, setLang] = useState<ProductLang>("English");
  const [tab, setTab] = useState<EditorTab>("write");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const featuredRef = useRef<HTMLInputElement | null>(null);
  const galleryRef = useRef<HTMLInputElement | null>(null);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (isNew || !numericId) return;
    setLoading(true);
    void adminApi
      .newsItem(numericId)
      .then((row) => {
        const next = rowToDraft(row);
        setDraft(next);
        setBaseline(JSON.stringify(next));
        setSlugManual(Boolean(next.slug));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load post"))
      .finally(() => setLoading(false));
  }, [isNew, numericId]);

  const dirty = useMemo(() => JSON.stringify(draft) !== baseline, [draft, baseline]);
  const wordCount = useMemo(() => {
    const text = (lang === "English" ? draft.description : draft.description_ar)
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) return 0;
    return text.split(" ").filter(Boolean).length;
  }, [draft.description, draft.description_ar, lang]);

  function patch(partial: Partial<Draft>) {
    setDraft((prev) => {
      const next = { ...prev, ...partial };
      if (!slugManual && partial.title !== undefined) {
        next.slug = slugify(partial.title);
      }
      return next;
    });
  }

  async function onTranslate() {
    setTranslating(true);
    setError("");
    try {
      const res = await adminApi.translate({
        texts: [draft.title, draft.short, draft.description],
        from: "en",
        to: "ar",
      });
      patch({
        title_ar: res.translations[0] || draft.title_ar,
        short_ar: res.translations[1] || draft.short_ar,
        description_ar: res.translations[2] || draft.description_ar,
      });
      setLang("Arabic");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Translate failed");
    } finally {
      setTranslating(false);
    }
  }

  async function onUploadFeatured(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const uploaded = await adminApi.uploadNewsImage(file, draft.title || "news", "featured");
      patch({ featured_image: uploaded.filename, featured_image_url: uploaded.url });
      setMsg("Featured image uploaded.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function onUploadGallery(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const uploaded = await adminApi.uploadNewsImage(file, draft.title || "news", "gallery");
      patch({
        gallery: [...draft.gallery, uploaded.filename],
        gallery_urls: [...draft.gallery_urls, uploaded.url],
      });
      setMsg("Gallery image added.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function insertImageIntoContent() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0] ?? null;
      if (!file) return;
      void (async () => {
        setBusy(true);
        try {
          const uploaded = await adminApi.uploadNewsImage(file, draft.title || "news", "content");
          const html = `\n<p><img src="${uploaded.url}" alt="" /></p>\n`;
          if (lang === "English") {
            patch({ description: `${draft.description}${html}` });
          } else {
            patch({ description_ar: `${draft.description_ar}${html}` });
          }
          setTab("html");
          setMsg("Image inserted into content.");
        } catch (e) {
          setError(e instanceof Error ? e.message : "Upload failed");
        } finally {
          setBusy(false);
        }
      })();
    };
    input.click();
  }

  function buildBody(statusOverride?: number): Record<string, unknown> {
    return {
      title: draft.title.trim(),
      title_ar: draft.title_ar.trim(),
      short: draft.short.trim(),
      short_ar: draft.short_ar.trim(),
      description: draft.description,
      description_ar: draft.description_ar,
      slug: draft.slug.trim() || slugify(draft.title),
      author: draft.author.trim(),
      category: draft.category.trim(),
      tags: draft.tags.trim(),
      seo_title: draft.seo_title.trim() || draft.title.trim(),
      seo_description: draft.seo_description.trim() || draft.short.trim(),
      featured_image: draft.featured_image,
      gallery: draft.gallery,
      date: draft.date ? draft.date.replace("T", " ") + ":00" : undefined,
      status: statusOverride ?? draft.status,
    };
  }

  async function save(statusOverride?: number) {
    if (!draft.title.trim()) {
      setError("Title (English) is required.");
      return;
    }
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const body = buildBody(statusOverride);
      if (isNew || !numericId) {
        const created = await adminApi.createNews(body);
        const newId = Number(created.nw_id ?? (created as { id?: number }).id);
        setMsg(Number(body.status) === 1 ? "Post published." : "Draft saved.");
        if (newId) {
          navigate(`/news/${newId}/edit`, { replace: true });
          return;
        }
      } else {
        const saved = await adminApi.updateNews(numericId, body);
        const next = rowToDraft(saved);
        setDraft(next);
        setBaseline(JSON.stringify(next));
        setMsg(Number(body.status) === 1 ? "Post updated & published." : "Draft updated.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingCard label="Loading post" />;

  const titleValue = lang === "English" ? draft.title : draft.title_ar;
  const shortValue = lang === "English" ? draft.short : draft.short_ar;
  const bodyValue = lang === "English" ? draft.description : draft.description_ar;
  const featuredPreview = mediaUrl(draft.featured_image_url, draft.featured_image);
  const published = draft.status === 1;

  return (
    <div className="page news-editor-page">
      <header className="page-head">
        <div>
          <p className="settings-crumb">
            <Link to="/news">News</Link>
            {" · "}
            {isNew ? "New post" : `Edit #${numericId}`}
          </p>
          <h1 className="page-title">{isNew ? "Add News" : "Edit News"}</h1>
          <p className="page-sub">Compose like WordPress — title, content, featured image, publish box, and SEO.</p>
        </div>
        <div className="page-head-actions">
          <Link className="btn btn-secondary" to="/news">
            All posts
          </Link>
          <button type="button" className="btn btn-secondary" disabled={busy || !dirty} onClick={() => void save(0)}>
            Save draft
          </button>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void save(1)}>
            {busy ? "Saving…" : published && !isNew ? "Update" : "Publish"}
          </button>
        </div>
      </header>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}

      <div className="news-editor-layout">
        <div className="news-editor-main">
          <section className="card news-editor-card">
            <div className="news-editor-title-row">
              <input
                className="news-title-input"
                dir={lang === "Arabic" ? "rtl" : undefined}
                placeholder={lang === "English" ? "Add title" : "أضف العنوان"}
                value={titleValue}
                onChange={(e) =>
                  patch(lang === "English" ? { title: e.target.value } : { title_ar: e.target.value })
                }
              />
              <PfLocaleBar lang={lang} onLangChange={setLang} showTranslate onTranslate={onTranslate} translating={translating} />
            </div>

            <div className="news-permalink">
              <span className="muted">Permalink</span>
              <code>{config.frontstoreUrl}/news-events/</code>
              <input
                value={draft.slug}
                placeholder="post-slug"
                onChange={(e) => {
                  setSlugManual(true);
                  patch({ slug: slugify(e.target.value) || e.target.value });
                }}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSlugManual(false);
                  patch({ slug: slugify(draft.title) });
                }}
              >
                <RotateCcw size={13} aria-hidden />
                Reset
              </button>
            </div>
          </section>

          <section className="card news-editor-card">
            <div className="news-editor-toolbar">
              <div className="uiux-seg" role="tablist">
                {(
                  [
                    ["write", "Write"],
                    ["html", "HTML"],
                    ["preview", "Preview"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    className={tab === value ? "is-active" : ""}
                    onClick={() => setTab(value)}
                  >
                    {value === "preview" ? <Eye size={14} aria-hidden /> : null}
                    {label}
                  </button>
                ))}
              </div>
              <div className="toolbar">
                <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void insertImageIntoContent()}>
                  <ImageIcon size={14} aria-hidden />
                  Insert image
                </button>
                <span className="muted small">{wordCount} words · {lang}</span>
              </div>
            </div>

            {tab === "preview" ? (
              <article className="news-content-preview" dir={lang === "Arabic" ? "rtl" : undefined}>
                <h2>{titleValue || "Untitled"}</h2>
                {featuredPreview ? <img src={featuredPreview} alt="" className="news-content-preview-hero" /> : null}
                <div dangerouslySetInnerHTML={{ __html: bodyValue || "<p class='muted'>Start writing to preview.</p>" }} />
              </article>
            ) : (
              <textarea
                ref={contentRef}
                className={`news-content-area${tab === "html" ? " is-code" : ""}`}
                dir={lang === "Arabic" ? "rtl" : undefined}
                rows={18}
                placeholder={
                  tab === "html"
                    ? "<p>Write HTML content…</p>"
                    : "Write your post content here. You can paste HTML or switch to the HTML tab."
                }
                value={bodyValue}
                onChange={(e) =>
                  patch(lang === "English" ? { description: e.target.value } : { description_ar: e.target.value })
                }
              />
            )}
          </section>

          <section className="card news-editor-card">
            <h2>Excerpt</h2>
            <p className="muted small">Short summary shown in listings and SEO fallback.</p>
            <textarea
              dir={lang === "Arabic" ? "rtl" : undefined}
              rows={3}
              value={shortValue}
              onChange={(e) => patch(lang === "English" ? { short: e.target.value } : { short_ar: e.target.value })}
              placeholder="Write an excerpt…"
            />
          </section>

          <section className="card news-editor-card">
            <h2>SEO</h2>
            <div className="pf-grid">
              <label className="pf-field pf-field-full">
                <span className="pf-label">SEO title</span>
                <input
                  value={draft.seo_title}
                  maxLength={70}
                  placeholder={draft.title || "SEO title"}
                  onChange={(e) => patch({ seo_title: e.target.value })}
                />
                <span className="muted small">{(draft.seo_title || draft.title).length}/70</span>
              </label>
              <label className="pf-field pf-field-full">
                <span className="pf-label">Meta description</span>
                <textarea
                  rows={3}
                  maxLength={160}
                  value={draft.seo_description}
                  placeholder={draft.short || "Meta description"}
                  onChange={(e) => patch({ seo_description: e.target.value })}
                />
                <span className="muted small">{(draft.seo_description || draft.short).length}/160</span>
              </label>
            </div>
            <div className="news-seo-preview">
              <div className="news-seo-url">
                {config.frontstoreUrl}/news-events/{draft.slug || "post-slug"}
              </div>
              <strong>{draft.seo_title || draft.title || "Post title"}</strong>
              <p>{draft.seo_description || draft.short || "Meta description preview…"}</p>
            </div>
          </section>
        </div>

        <aside className="news-editor-side">
          <section className="card news-editor-card news-publish-box">
            <h2>Publish</h2>
            <label className="pf-field">
              <span className="pf-label">Status</span>
              <select value={draft.status} onChange={(e) => patch({ status: Number(e.target.value) })}>
                <option value={0}>Draft</option>
                <option value={1}>Published</option>
              </select>
            </label>
            <label className="pf-field">
              <span className="pf-label">Publish date</span>
              <input type="datetime-local" value={draft.date} onChange={(e) => patch({ date: e.target.value })} />
            </label>
            <label className="pf-field">
              <span className="pf-label">Author</span>
              <input value={draft.author} onChange={(e) => patch({ author: e.target.value })} />
            </label>
            <div className="news-publish-actions">
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void save(0)}>
                Save draft
              </button>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void save(1)}>
                {published && !isNew ? "Update" : "Publish"}
              </button>
            </div>
            {!isNew && numericId ? (
              <button
                type="button"
                className="btn btn-secondary news-trash-btn"
                onClick={() => {
                  if (!window.confirm("Move this post to trash?")) return;
                  void adminApi.deleteNews(numericId).then(() => navigate("/news"));
                }}
              >
                <Trash2 size={14} aria-hidden />
                Move to trash
              </button>
            ) : null}
          </section>

          <section className="card news-editor-card">
            <h2>Featured image</h2>
            <div className={`news-featured${featuredPreview ? " has-img" : ""}`}>
              {featuredPreview ? (
                <img src={featuredPreview} alt="" />
              ) : (
                <div className="news-featured-empty">
                  <ImageIcon size={28} aria-hidden />
                  <span>Set featured image</span>
                </div>
              )}
            </div>
            <input
              ref={featuredRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => void onUploadFeatured(e.target.files?.[0] ?? null)}
            />
            <div className="toolbar" style={{ marginTop: 10 }}>
              <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => featuredRef.current?.click()}>
                <Upload size={14} aria-hidden />
                {featuredPreview ? "Replace" : "Upload"}
              </button>
              {featuredPreview ? (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => patch({ featured_image: "", featured_image_url: "" })}
                >
                  Remove
                </button>
              ) : null}
            </div>
          </section>

          <section className="card news-editor-card">
            <h2>Categories & tags</h2>
            <label className="pf-field">
              <span className="pf-label">Category</span>
              <input
                value={draft.category}
                placeholder="News, Offers, Events…"
                onChange={(e) => patch({ category: e.target.value })}
              />
            </label>
            <label className="pf-field">
              <span className="pf-label">Tags</span>
              <input
                value={draft.tags}
                placeholder="grocery, qatar, eid (comma separated)"
                onChange={(e) => patch({ tags: e.target.value })}
              />
            </label>
          </section>

          <section className="card news-editor-card">
            <div className="uiux-panel-head" style={{ marginBottom: 8 }}>
              <h2 style={{ margin: 0 }}>Gallery</h2>
              <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => galleryRef.current?.click()}>
                <PlusIcon />
                Add
              </button>
            </div>
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => void onUploadGallery(e.target.files?.[0] ?? null)}
            />
            <div className="news-gallery-grid">
              {draft.gallery.map((file, index) => {
                const src = mediaUrl(draft.gallery_urls[index], file);
                return (
                  <div key={`${file}-${index}`} className="news-gallery-item">
                    <img src={src} alt="" />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() =>
                        patch({
                          gallery: draft.gallery.filter((_, i) => i !== index),
                          gallery_urls: draft.gallery_urls.filter((_, i) => i !== index),
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
              {!draft.gallery.length ? <p className="muted small">No gallery images yet.</p> : null}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
