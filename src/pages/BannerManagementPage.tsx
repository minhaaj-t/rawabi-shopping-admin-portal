import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useOpenAddQuery } from "../lib/useOpenAddQuery";
import { adminApi } from "../lib/api";
import { BannerPlacementPreview, buildBannerLinkPreview } from "../components/BannerPlacementPreview";
import { BannerTargetPicker } from "../components/BannerTargetPicker";
import { StoreMultiPicker } from "../components/StoreMultiPicker";
import { bannerImageFallbacks, bannerImageUrl } from "../lib/media";
import { Search } from "../lib/icons";

type BannerRow = {
  id: number;
  title: string;
  title_ar?: string;
  image?: string;
  image_url?: string;
  type?: string;
  priority?: number;
  link_type?: string;
  cat?: number;
  subcat?: number;
  sub_subcat?: number;
  banner_point?: string;
  status?: number;
  store?: string;
  show_mobile?: number;
  show_tablet?: number;
  show_desktop?: number;
  layout?: "frame" | "full" | string;
};

type StoreRow = { ec_store_id: number; ec_store_name: string };
type CategoryRow = { id: number; name: string; parent: number };

const BANNER_TYPES = [
  { value: "Top", label: "Top · Hero slider", hint: "Main carousel (14:5)" },
  { value: "Side", label: "Side offers", hint: "Web side rail · app 2-up cards (3:4)" },
  { value: "Below Slider", label: "Below slider", hint: "Up to 3 promo tiles" },
  { value: "Popup", label: "Popup", hint: "Modal overlay" },
  { value: "Bottom", label: "Bottom strip", hint: "Footer promo band" },
];

const LINK_TYPES = [
  { value: "", label: "None" },
  { value: "category", label: "Category" },
  { value: "sub_category", label: "Sub category" },
  { value: "sub_sub_category", label: "Sub sub category" },
  { value: "sub_sub_sub_category", label: "Sub sub sub category" },
  { value: "product", label: "Product" },
  { value: "brand", label: "Brand" },
  { value: "itemgroup", label: "Item group" },
  { value: "offer", label: "Offers" },
  { value: "external_url", label: "External URL" },
];

const emptyForm = () => ({
  title: "",
  title_ar: "",
  image: "",
  type: "Top",
  link_type: "",
  cat: "",
  subcat: "",
  sub_subcat: "",
  banner_point: "",
  store: "",
  show_mobile: 1,
  show_tablet: 1,
  show_desktop: 1,
  layout: "frame" as "frame" | "full",
  status: 1,
});

function onFlag(value: unknown, fallback = 1): number {
  if (value === true || value === 1 || value === "1") return 1;
  if (value === false || value === 0 || value === "0") return 0;
  return fallback;
}

function BannerFormAccordion({
  title,
  hint,
  defaultOpen,
  children,
}: {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="banner-acc" defaultOpen={defaultOpen}>
      <summary className="banner-acc-sum">
        <span className="banner-acc-copy">
          <strong>{title}</strong>
          {hint ? <em>{hint}</em> : null}
        </span>
        <span className="banner-acc-chevron" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="banner-acc-body">{children}</div>
    </details>
  );
}

function storeNamesFromCsv(storeCsv: string | undefined, stores: StoreRow[]): string[] {
  if (!storeCsv) return [];
  const ids = storeCsv.split(",").map((s) => s.trim()).filter(Boolean);
  if (!ids.length) return [];
  return ids.map((id) => stores.find((s) => String(s.ec_store_id) === id)?.ec_store_name ?? `#${id}`);
}

function StoresCell({ storeCsv, stores }: { storeCsv?: string; stores: StoreRow[] }) {
  const names = storeNamesFromCsv(storeCsv, stores);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const showAt = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const width = 280;
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
    const top = Math.min(rect.bottom + 8, window.innerHeight - 16);
    setPos({ top, left });
    setOpen(true);
  };

  if (!names.length) {
    return <span className="banner-stores-compact">All stores</span>;
  }
  if (names.length === 1) {
    return <span className="banner-stores-compact">{names[0]}</span>;
  }

  const rest = names.length - 1;
  const fullList = names.join(", ");

  return (
    <span className="banner-stores-compact">
      <span className="banner-stores-primary" title={names[0]}>
        {names[0]}
      </span>
      <span className="banner-stores-more-wrap">
        {" "}
        and{" "}
        <span
          className={`banner-stores-more${open ? " is-open" : ""}`}
          tabIndex={0}
          aria-label={`${rest} more stores: ${fullList}`}
          onMouseEnter={(e) => showAt(e.currentTarget)}
          onMouseLeave={() => setOpen(false)}
          onFocus={(e) => showAt(e.currentTarget)}
          onBlur={() => setOpen(false)}
        >
          {rest}+
          {open ? (
            <span
              className="banner-stores-tooltip"
              role="tooltip"
              style={{ top: pos.top, left: pos.left }}
            >
              {names.map((name) => (
                <span key={name} className="banner-stores-tooltip-item">
                  {name}
                </span>
              ))}
            </span>
          ) : null}
        </span>
      </span>
    </span>
  );
}

function bannerTypeKey(type?: string): string {
  return String(type || "").trim();
}

function thumbModifier(type?: string): string {
  const t = bannerTypeKey(type);
  if (t === "Side") return " is-side";
  if (t === "Below Slider") return " is-below";
  if (t === "Bottom") return " is-bottom";
  if (t === "Popup") return " is-popup";
  return " is-top";
}

function BannerThumb({ row }: { row: BannerRow }) {
  const candidates = useMemo(() => bannerImageFallbacks(row.image, row.image_url), [row.image, row.image_url]);
  const [index, setIndex] = useState(0);
  const shape = thumbModifier(row.type);

  useEffect(() => {
    setIndex(0);
  }, [row.id, row.image, row.image_url]);

  if (!candidates.length || index >= candidates.length) {
    return (
      <span className={`banner-thumb-placeholder${shape}`} title={row.image || "No image file"}>
        {row.image ? row.image.split(/[\\/]/).pop() : "No image"}
      </span>
    );
  }

  const src = candidates[index];
  return (
    <a href={src} target="_blank" rel="noreferrer" className={`banner-thumb-link${shape}`}>
      <img
        src={src}
        alt={row.title || "Banner"}
        className={`banner-thumb${shape}`}
        loading="lazy"
        onError={() => setIndex((i) => i + 1)}
      />
    </a>
  );
}

type BannersPageProps = {
  embedded?: boolean;
  initialTypes?: string[];
  crumbLabel?: string;
  surfaceLabel?: string;
  surfacePath?: string;
};

export function BannersPage({
  embedded = false,
  initialTypes,
  crumbLabel,
  surfaceLabel,
  surfacePath,
}: BannersPageProps) {
  const [items, setItems] = useState<BannerRow[]>([]);
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [subcategories, setSubcategories] = useState<CategoryRow[]>([]);
  const [subSubcategories, setSubSubcategories] = useState<CategoryRow[]>([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(() => {
    const base = emptyForm();
    if (initialTypes?.length) base.type = initialTypes[0];
    return base;
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>(initialTypes ?? []);
  const [dragId, setDragId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);

  const allowedTypes = useMemo(() => {
    if (!initialTypes?.length) return BANNER_TYPES;
    return BANNER_TYPES.filter((t) => initialTypes.includes(t.value));
  }, [initialTypes]);

  const allowedValues = useMemo(() => new Set(allowedTypes.map((t) => t.value)), [allowedTypes]);

  const scopedItems = useMemo(() => {
    if (!allowedValues.size) return items;
    return items.filter((row) => allowedValues.has(bannerTypeKey(row.type)));
  }, [items, allowedValues]);

  const filteredItems = useMemo(() => {
    if (!typeFilter.length || typeFilter.length === allowedTypes.length) return scopedItems;
    const selected = new Set(typeFilter);
    return scopedItems.filter((row) => selected.has(bannerTypeKey(row.type)));
  }, [scopedItems, typeFilter, allowedTypes.length]);

  const setBannerType = useCallback((type: string) => {
    setForm((s) => ({ ...s, type }));
  }, []);

  const linkPreview = useMemo(
    () =>
      buildBannerLinkPreview({
        link_type: form.link_type,
        banner_point: form.banner_point,
        cat: form.cat,
        subcat: form.subcat,
        sub_subcat: form.sub_subcat,
        categories,
        subcategories,
        subSubcategories,
      }),
    [form.link_type, form.banner_point, form.cat, form.subcat, form.sub_subcat, categories, subcategories, subSubcategories],
  );

  const displayHint = [
    form.show_mobile ? "Mobile" : null,
    form.show_tablet ? "Tablet" : null,
    form.show_desktop ? "Desktop" : null,
    form.layout === "full" ? "Full bleed" : "Framed",
  ]
    .filter(Boolean)
    .join(" · ") || "Hidden on all devices";

  const refresh = useCallback(async () => {
    setError("");
    try {
      const res = await adminApi.banners({ per_page: 100 });
      setItems(res.items as BannerRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load banners");
    }
  }, []);

  useEffect(() => {
    void refresh();
    void adminApi.storesManage({ per_page: 100, page: 1 }).then((res) =>
      setStores(res.items.map((s) => ({ ec_store_id: s.id, ec_store_name: s.name }))),
    ).catch(() => {});
    void adminApi.categories(0).then((rows) => setCategories(rows as CategoryRow[])).catch(() => {});
  }, [refresh]);

  useEffect(() => {
    if (!form.cat) {
      setSubcategories([]);
      return;
    }
    void adminApi.categories(Number(form.cat)).then((rows) => setSubcategories(rows as CategoryRow[]));
  }, [form.cat]);

  useEffect(() => {
    if (!form.subcat) {
      setSubSubcategories([]);
      return;
    }
    void adminApi.categories(Number(form.subcat)).then((rows) => setSubSubcategories(rows as CategoryRow[]));
  }, [form.subcat]);

  const needsCategory = useMemo(
    () => ["sub_category", "sub_sub_category", "sub_sub_sub_category", "product"].includes(form.link_type),
    [form.link_type],
  );
  const needsSubCategory = useMemo(
    () => ["sub_sub_category", "sub_sub_sub_category", "product"].includes(form.link_type),
    [form.link_type],
  );
  const needsSubSubCategory = useMemo(
    () => ["sub_sub_sub_category", "product"].includes(form.link_type),
    [form.link_type],
  );

  function openAdd() {
    setEditId(null);
    const base = emptyForm();
    if (initialTypes?.length) base.type = initialTypes[0];
    setForm(base);
    setPreviewUrl(null);
    setSelectedStores(stores.map((s) => String(s.ec_store_id)));
    setMsg("");
    setOpen(true);
  }

  useOpenAddQuery(openAdd);

  function openEdit(row: BannerRow) {
    setEditId(row.id);
    setForm({
      title: row.title ?? "",
      title_ar: row.title_ar ?? "",
      image: row.image ?? "",
      type: row.type ?? "Top",
      link_type: row.link_type ?? "",
      cat: row.cat ? String(row.cat) : "",
      subcat: row.subcat ? String(row.subcat) : "",
      sub_subcat: row.sub_subcat ? String(row.sub_subcat) : "",
      banner_point: row.banner_point ?? "",
      store: row.store ?? "",
      show_mobile: onFlag(row.show_mobile, 1),
      show_tablet: onFlag(row.show_tablet, 1),
      show_desktop: onFlag(row.show_desktop, 1),
      layout: String(row.layout ?? "").toLowerCase() === "full" ? "full" : "frame",
      status: onFlag(row.status, 1),
    });
    setPreviewUrl(bannerImageUrl(row.image, row.image_url));
    setSelectedStores(
      row.store
        ? row.store.split(",").map((s) => s.trim()).filter(Boolean)
        : stores.map((s) => String(s.ec_store_id)),
    );
    setMsg("");
    setOpen(true);
  }

  async function onDropImage(file: File, type: string) {
    setForm((s) => ({ ...s, type }));
    setBusy(true);
    setMsg("");
    try {
      const uploaded = await adminApi.uploadBannerImage(file, form.title || "banner");
      setForm((s) => ({ ...s, type, image: uploaded.filename }));
      setPreviewUrl(uploaded.url);
      setMsg(`Image uploaded for ${type} placement.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function onPickImage(file: File | null) {
    if (!file) return;
    setBusy(true);
    setMsg("");
    try {
      const uploaded = await adminApi.uploadBannerImage(file, form.title || "banner");
      setForm((s) => ({ ...s, image: uploaded.filename }));
      setPreviewUrl(uploaded.url);
      setMsg("Image uploaded.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!form.title.trim()) {
      setMsg("Banner title is required.");
      return;
    }
    if (!editId && !form.image.trim()) {
      setMsg("Banner image is required.");
      return;
    }
    setBusy(true);
    setMsg("");
    const body: Record<string, unknown> = {
      title: form.title.trim(),
      title_ar: form.title_ar.trim(),
      type: form.type,
      link_type: form.link_type,
      banner_point: form.banner_point.trim(),
      store: selectedStores.join(","),
      show_mobile: form.show_mobile,
      show_tablet: form.show_tablet,
      show_desktop: form.show_desktop,
      layout: form.layout,
    };
    if (form.image.trim()) body.image = form.image.trim();
    if (form.cat) body.cat = Number(form.cat);
    if (form.subcat) body.subcat = Number(form.subcat);
    if (form.sub_subcat) body.sub_subcat = Number(form.sub_subcat);
    if (editId) body.status = form.status;

    try {
      if (editId) await adminApi.updateBanner(editId, body);
      else await adminApi.createBanner(body);
      setOpen(false);
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function onToggle(row: BannerRow) {
    await adminApi.updateBannerStatus(row.id, row.status === 1 ? 0 : 1);
    await refresh();
  }

  async function onDelete(id: number) {
    if (!confirm("Delete this banner?")) return;
    await adminApi.deleteBanner(id);
    await refresh();
  }

  const storeOptions = useMemo(
    () => stores.map((s) => ({ id: String(s.ec_store_id), name: s.ec_store_name })),
    [stores],
  );

  const [search, setSearch] = useState("");

  const searchedItems = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return filteredItems;
    return filteredItems.filter((row) => {
      return (
        String(row.title ?? "").toLowerCase().includes(needle) ||
        String(row.title_ar ?? "").toLowerCase().includes(needle) ||
        String(row.type ?? "").toLowerCase().includes(needle) ||
        String(row.link_type ?? "").toLowerCase().includes(needle) ||
        String(row.id).includes(needle)
      );
    });
  }, [filteredItems, search]);

  const canReorder = search.trim() === "" && searchedItems.length > 1;

  const persistOrder = useCallback(
    async (orderedVisible: BannerRow[]) => {
      const visibleIds = new Set(orderedVisible.map((r) => r.id));
      const merged: BannerRow[] = [];
      let vi = 0;
      for (const row of items) {
        if (visibleIds.has(row.id)) {
          merged.push(orderedVisible[vi++] ?? row);
        } else {
          merged.push(row);
        }
      }
      const withPriority = merged.map((row, index) => ({ ...row, priority: index + 1 }));
      setItems(withPriority);
      setBusy(true);
      setError("");
      setMsg("");
      try {
        await adminApi.reorderBanners(withPriority.map((row) => row.id));
        setMsg("Banner order saved");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save order");
        await refresh();
      } finally {
        setBusy(false);
      }
    },
    [items, refresh],
  );

  const onBannerDrop = useCallback(
    async (targetId: number) => {
      if (!canReorder || dragId == null || dragId === targetId) {
        setDragId(null);
        setOverId(null);
        return;
      }
      const list = [...searchedItems];
      const from = list.findIndex((r) => r.id === dragId);
      const to = list.findIndex((r) => r.id === targetId);
      setDragId(null);
      setOverId(null);
      if (from < 0 || to < 0) return;
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved);
      await persistOrder(list);
    },
    [canReorder, dragId, persistOrder, searchedItems],
  );

  const bannerStats = useMemo(() => {
    const pool = scopedItems;
    const active = pool.filter((r) => r.status === 1).length;
    const byType: Record<string, number> = {};
    for (const row of pool) {
      const t = bannerTypeKey(row.type) || "Other";
      byType[t] = (byType[t] ?? 0) + 1;
    }
    return { total: pool.length, active, inactive: pool.length - active, byType };
  }, [scopedItems]);

  return (
    <div className={embedded ? "banner-page banner-page-embedded" : "page banner-page"}>
      {!embedded ? (
        <header className="page-head">
          <div>
            <p className="settings-crumb">
              <Link to="/marketing">Marketing</Link>
              {" · Storefront banners"}
            </p>
            <h1 className="page-title">Banner management</h1>
            <p className="page-sub">Manage hero, side, popup, and promotional banners for web and mobile home screens.</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={openAdd}>
            Add banner
          </button>
        </header>
      ) : (
        <div className="panel-toolbar" style={{ marginBottom: 12 }}>
          <span className="muted">
            {surfacePath && surfaceLabel ? (
              <>
                <Link to={surfacePath}>{surfaceLabel}</Link>
                {" · "}
              </>
            ) : null}
            {crumbLabel || "Banners"} · EN/AR titles · {searchedItems.length} shown
          </span>
          <button type="button" className="btn btn-primary" onClick={openAdd}>
            Add banner
          </button>
        </div>
      )}

      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg && !open ? <div className="alert alert-success">{msg}</div> : null}

      <div className="uiux-stats card-grid">
        <div className="card stat-card uiux-stat-card">
          <h3>Total</h3>
          <strong>{bannerStats.total}</strong>
        </div>
        <div className="card stat-card uiux-stat-card">
          <h3>Active</h3>
          <strong>{bannerStats.active}</strong>
        </div>
        <div className="card stat-card uiux-stat-card">
          <h3>Inactive</h3>
          <strong>{bannerStats.inactive}</strong>
        </div>
        <div className="card stat-card uiux-stat-card">
          <h3>Showing</h3>
          <strong>{searchedItems.length}</strong>
        </div>
      </div>

      <div className="card">
        <div className="panel-toolbar">
          <span className="muted">
            {searchedItems.length}
            {typeFilter.length && typeFilter.length < allowedTypes.length
              ? ` / ${bannerStats.total}`
              : ""}{" "}
            banners
            {canReorder ? " · drag preview to reorder" : ""}
          </span>
          <label className="uiux-search" style={{ marginInline: 8 }}>
            <Search size={15} aria-hidden />
            <input
              value={search}
              placeholder="Search title, type, link…"
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search banners"
            />
          </label>
          <div className="banner-type-pills" role="group" aria-label="Filter placement">
            {(initialTypes?.length ? allowedTypes : BANNER_TYPES).map((o) => {
              const active = typeFilter.length ? typeFilter.includes(o.value) : true;
              const count = bannerStats.byType[o.value] ?? 0;
              return (
                <button
                  key={o.value}
                  type="button"
                  className={active && typeFilter.length ? "active" : ""}
                  onClick={() => {
                    setTypeFilter((prev) => {
                      const solo = prev.length === 1 && prev[0] === o.value;
                      if (solo) return initialTypes?.length ? [...initialTypes] : [];
                      return [o.value];
                    });
                  }}
                >
                  {o.label}
                  <em className="banner-type-count">{count}</em>
                </button>
              );
            })}
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => void refresh()}>
            Refresh
          </button>
        </div>
        <div className="table-wrap">
          <table className="data banner-table">
            <colgroup>
              <col className="col-preview" />
              <col className="col-title" />
              <col className="col-type" />
              <col className="col-link" />
              <col className="col-stores" />
              <col className="col-status" />
              <col className="col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th className="banner-preview-col">Preview</th>
                <th>Title</th>
                <th>Type</th>
                <th>Link</th>
                <th>Stores</th>
                <th className="banner-status-col">Status</th>
                <th className="banner-actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {searchedItems.map((row) => (
                <tr
                  key={row.id}
                  className={[
                    canReorder ? "banner-row-sortable" : "",
                    dragId === row.id ? "is-dragging" : "",
                    overId === row.id && dragId !== row.id ? "is-drag-over" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onDragOver={
                    canReorder
                      ? (e) => {
                          e.preventDefault();
                          if (overId !== row.id) setOverId(row.id);
                        }
                      : undefined
                  }
                  onDrop={
                    canReorder
                      ? (e) => {
                          e.preventDefault();
                          void onBannerDrop(row.id);
                        }
                      : undefined
                  }
                >
                  <td
                    className="banner-preview-cell"
                    draggable={canReorder}
                    title={canReorder ? "Drag to rearrange order" : undefined}
                    onDragStart={
                      canReorder
                        ? (e) => {
                            e.dataTransfer.setData("text/banner-id", String(row.id));
                            e.dataTransfer.effectAllowed = "move";
                            setDragId(row.id);
                          }
                        : undefined
                    }
                    onDragEnd={() => {
                      setDragId(null);
                      setOverId(null);
                    }}
                  >
                    <span className="banner-drag-grip" aria-hidden>
                      ⋮⋮
                    </span>
                    <BannerThumb row={row} />
                  </td>
                  <td className="banner-title-cell">
                    <strong>{row.title || `#${row.id}`}</strong>
                    {row.title_ar ? <div className="muted small">{row.title_ar}</div> : null}
                  </td>
                  <td className="banner-type-cell">{row.type || "-"}</td>
                  <td className="banner-link-cell">
                    <div>{row.link_type || "-"}</div>
                    {row.banner_point ? <div className="muted small">{row.banner_point}</div> : null}
                  </td>
                  <td className="banner-stores-cell">
                    <StoresCell storeCsv={row.store} stores={stores} />
                  </td>
                  <td className="banner-status-cell">
                    <span className={`status-pill ${row.status === 1 ? "on" : "off"}`}>
                      {row.status === 1 ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="banner-row-actions">
                    <div className="banner-row-actions-inner">
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(row)}>
                        Edit
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => void onToggle(row)}>
                        {row.status === 1 ? "Deactivate" : "Activate"}
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => void onDelete(row.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {searchedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted">
                    No banners yet
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {open ? (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal-card banner-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <header className="banner-modal-head">
              <div>
                <h2>{editId ? "Edit banner" : "Add banner"}</h2>
                <p className="muted">Titles, placement, devices, layout, link, image, and stores</p>
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
                Close
              </button>
            </header>

            <div className="banner-modal-body">
              <div className="banner-modal-form">
                <BannerFormAccordion title="Titles" hint={form.title || "English + Arabic"} defaultOpen>
                  <div className="banner-form-grid">
                    <label className="pf-field">
                      <span className="pf-label">Title (English)</span>
                      <input value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} />
                    </label>
                    <label className="pf-field">
                      <span className="pf-label">Title (Arabic)</span>
                      <input
                        dir="rtl"
                        value={form.title_ar}
                        onChange={(e) => setForm((s) => ({ ...s, title_ar: e.target.value }))}
                      />
                    </label>
                  </div>
                </BannerFormAccordion>

                <BannerFormAccordion
                  title="Placement"
                  hint={allowedTypes.find((o) => o.value === form.type)?.label ?? form.type}
                >
                  <div className="banner-type-pills" role="radiogroup" aria-label="Banner placement">
                    {allowedTypes.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        role="radio"
                        aria-checked={form.type === o.value}
                        className={`banner-type-pill${form.type === o.value ? " is-active" : ""}`}
                        title={o.hint}
                        onClick={() => setBannerType(o.value)}
                      >
                        <strong>{o.label}</strong>
                        <span>{o.hint}</span>
                      </button>
                    ))}
                  </div>
                </BannerFormAccordion>

                <BannerFormAccordion title="Display" hint={displayHint} defaultOpen>
                  <div className="banner-display-grid">
                    <label className="banner-frame-toggle">
                      <input
                        type="checkbox"
                        checked={form.show_mobile === 1}
                        onChange={(e) => setForm((s) => ({ ...s, show_mobile: e.target.checked ? 1 : 0 }))}
                      />
                      <span>
                        <strong>Mobile</strong>
                        <em className="muted small">Phones and the customer app</em>
                      </span>
                    </label>
                    <label className="banner-frame-toggle">
                      <input
                        type="checkbox"
                        checked={form.show_tablet === 1}
                        onChange={(e) => setForm((s) => ({ ...s, show_tablet: e.target.checked ? 1 : 0 }))}
                      />
                      <span>
                        <strong>Tablet</strong>
                        <em className="muted small">iPad and mid-width web</em>
                      </span>
                    </label>
                    <label className="banner-frame-toggle">
                      <input
                        type="checkbox"
                        checked={form.show_desktop === 1}
                        onChange={(e) => setForm((s) => ({ ...s, show_desktop: e.target.checked ? 1 : 0 }))}
                      />
                      <span>
                        <strong>Desktop</strong>
                        <em className="muted small">Wide storefront browser</em>
                      </span>
                    </label>
                  </div>
                  <div className="banner-form-section banner-acc-nested">
                    <h3 className="banner-form-section-title">Layout</h3>
                    <div className="banner-type-pills banner-layout-pills" role="radiogroup" aria-label="Banner layout">
                      <button
                        type="button"
                        role="radio"
                        aria-checked={form.layout === "frame"}
                        className={`banner-type-pill${form.layout === "frame" ? " is-active" : ""}`}
                        onClick={() => setForm((s) => ({ ...s, layout: "frame" }))}
                      >
                        <strong>Framed</strong>
                        <span>Sit inside the swipe / tile frame</span>
                      </button>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={form.layout === "full"}
                        className={`banner-type-pill${form.layout === "full" ? " is-active" : ""}`}
                        onClick={() => setForm((s) => ({ ...s, layout: "full" }))}
                      >
                        <strong>Full bleed</strong>
                        <span>Edge-to-edge artwork, no frame</span>
                      </button>
                    </div>
                  </div>
                  {editId ? (
                    <label className="banner-frame-toggle banner-acc-nested">
                      <input
                        type="checkbox"
                        checked={form.status === 1}
                        onChange={(e) => setForm((s) => ({ ...s, status: e.target.checked ? 1 : 0 }))}
                      />
                      <span>
                        <strong>Active</strong>
                        <em className="muted small">Inactive banners stay hidden on the storefront</em>
                      </span>
                    </label>
                  ) : null}
                </BannerFormAccordion>

                <BannerFormAccordion
                  title="Link"
                  hint={LINK_TYPES.find((o) => o.value === form.link_type)?.label ?? "None"}
                >
                  <div className="banner-form-grid">
                    <label className="pf-field pf-field-span">
                      <span className="pf-label">Link type</span>
                      <select
                        value={form.link_type}
                        onChange={(e) =>
                          setForm((s) => ({
                            ...s,
                            link_type: e.target.value,
                            cat: "",
                            subcat: "",
                            sub_subcat: "",
                            banner_point: e.target.value === "external_url" ? s.banner_point : "",
                          }))
                        }
                      >
                        {LINK_TYPES.map((o) => (
                          <option key={o.value || "none"} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <BannerTargetPicker
                      linkType={form.link_type}
                      value={form.banner_point}
                      onChange={(banner_point) => setForm((s) => ({ ...s, banner_point }))}
                      onPick={(hit) =>
                        setForm((s) => ({
                          ...s,
                          banner_point: hit.id,
                          cat: hit.cat ?? s.cat,
                          subcat: hit.subcat ?? s.subcat,
                          sub_subcat: hit.sub_subcat ?? s.sub_subcat,
                        }))
                      }
                    />

                    {needsCategory ? (
                      <label className="pf-field">
                        <span className="pf-label">Category</span>
                        <select
                          value={form.cat}
                          onChange={(e) => setForm((s) => ({ ...s, cat: e.target.value, subcat: "", sub_subcat: "" }))}
                        >
                          <option value="">Select category</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}

                    {needsSubCategory ? (
                      <label className="pf-field">
                        <span className="pf-label">Sub category</span>
                        <select
                          value={form.subcat}
                          onChange={(e) => setForm((s) => ({ ...s, subcat: e.target.value, sub_subcat: "" }))}
                        >
                          <option value="">Select sub category</option>
                          {subcategories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}

                    {needsSubSubCategory ? (
                      <label className="pf-field">
                        <span className="pf-label">Sub sub category</span>
                        <select value={form.sub_subcat} onChange={(e) => setForm((s) => ({ ...s, sub_subcat: e.target.value }))}>
                          <option value="">Select sub sub category</option>
                          {subSubcategories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}

                    {form.link_type && form.link_type !== "offer" && form.link_type !== "external_url" ? (
                      <label className="pf-field pf-field-span">
                        <span className="pf-label">Banner point (target ID)</span>
                        <input
                          value={form.banner_point}
                          onChange={(e) => setForm((s) => ({ ...s, banner_point: e.target.value }))}
                          placeholder="Category / product / brand ID"
                        />
                      </label>
                    ) : null}
                  </div>
                </BannerFormAccordion>

                <BannerFormAccordion
                  title="Image & stores"
                  hint={selectedStores.length ? `${selectedStores.length} stores` : "All stores"}
                >
                  <div className="banner-form-grid">
                    <div className="pf-field pf-field-span">
                      <span className="pf-label">Banner image</span>
                      <div className="banner-upload-row">
                        <input
                          type="file"
                          accept="image/*"
                          className="banner-file-input"
                          onChange={(e) => void onPickImage(e.target.files?.[0] ?? null)}
                        />
                        <input
                          value={form.image}
                          placeholder="Or enter filename…"
                          aria-label="Banner image filename"
                          onChange={(e) => {
                            const image = e.target.value;
                            setForm((s) => ({ ...s, image }));
                            setPreviewUrl(bannerImageUrl(image));
                          }}
                        />
                      </div>
                    </div>
                    <div className="pf-field pf-field-span">
                      <span className="pf-label">Stores</span>
                      <StoreMultiPicker stores={storeOptions} selected={selectedStores} onChange={setSelectedStores} />
                    </div>
                  </div>
                </BannerFormAccordion>

                <div className="banner-modal-form-actions">
                  {msg ? (
                    <p className={msg.includes("failed") || msg.includes("required") ? "error" : "muted"}>{msg}</p>
                  ) : (
                    <span className="muted small">Preview updates live on the right</span>
                  )}
                  <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void save()}>
                    {busy ? "Saving…" : editId ? "Save changes" : "Create banner"}
                  </button>
                </div>
              </div>

              <aside className="banner-modal-preview-pane">
                <BannerPlacementPreview
                  bannerType={form.type}
                  currentImageUrl={previewUrl}
                  currentTitle={form.title}
                  editId={editId}
                  allBanners={items}
                  linkPreview={linkPreview}
                  onDropImage={(file, type) => void onDropImage(file, type)}
                />
              </aside>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
