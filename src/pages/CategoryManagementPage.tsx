import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, FolderTree, Plus, Trash2 } from "../lib/icons";
import { adminApi } from "../lib/api";
import { useOpenAddQuery } from "../lib/useOpenAddQuery";
import { categoryImageFallbacks, categoryImageUrl } from "../lib/media";
import { CategoryIconPicker } from "../components/CategoryIconPicker";

type CategoryRow = {
  id: number;
  parent: number;
  parent_name?: string | null;
  name: string;
  name_ar?: string;
  priority: number;
  status: number;
  type: number;
  tag?: string | null;
  bulk_item?: string | null;
  home_display: number;
  icon?: string | null;
  icon_url?: string | null;
  banner?: string | null;
  banner_url?: string | null;
  children_count: number;
  product_count: number;
};

type FlatCategory = CategoryRow & {
  depth: number;
  pathNames: string[];
};

type FormState = {
  name: string;
  name_ar: string;
  short_desc: string;
  short_desc_ar: string;
  desc: string;
  desc_ar: string;
  meta_title: string;
  meta_title_ar: string;
  meta_keyword: string;
  meta_keyword_ar: string;
  meta_desc: string;
  meta_desc_ar: string;
  type: string;
  parent: string;
  tag: string;
  bulk_item: string;
  home_display: string;
  icon: string;
  home_icon: string;
  home_shape: string;
  banner: string;
  priority: string;
  status: string;
};

function levelLabel(depth: number): string {
  if (depth <= 0) return "Main";
  if (depth === 1) return "Sub";
  if (depth === 2) return "Sub-sub";
  return `L${depth + 1}`;
}

function buildCategoryTree(rows: CategoryRow[]): FlatCategory[] {
  const byParent = new Map<number, CategoryRow[]>();
  for (const row of rows) {
    const pid = Number(row.parent) || 0;
    const list = byParent.get(pid) ?? [];
    list.push(row);
    byParent.set(pid, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.priority - b.priority || a.id - b.id);
  }

  const out: FlatCategory[] = [];
  const walk = (parentId: number, depth: number, pathNames: string[]) => {
    for (const row of byParent.get(parentId) ?? []) {
      const nextPath = [...pathNames, row.name || `Category #${row.id}`];
      out.push({ ...row, depth, pathNames: nextPath });
      walk(row.id, depth + 1, nextPath);
    }
  };
  walk(0, 0, []);

  const seen = new Set(out.map((r) => r.id));
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    out.push({
      ...row,
      depth: 0,
      pathNames: [row.name || `Category #${row.id}`],
    });
  }
  return out;
}

const emptyForm = (parentId = 0): FormState => ({
  name: "",
  name_ar: "",
  short_desc: "",
  short_desc_ar: "",
  desc: "",
  desc_ar: "",
  meta_title: "",
  meta_title_ar: "",
  meta_keyword: "",
  meta_keyword_ar: "",
  meta_desc: "",
  meta_desc_ar: "",
  type: "1",
  parent: String(parentId),
  tag: "",
  bulk_item: "",
  home_display: "0",
  icon: "",
  home_icon: "",
  home_shape: "rectangle",
  banner: "",
  priority: "1",
  status: "1",
});

const HOME_SHAPES: Array<{ id: string; label: string }> = [
  { id: "rectangle", label: "Rectangle" },
  { id: "rounded", label: "Rounded" },
  { id: "circle", label: "Circle" },
  { id: "triangle", label: "Triangle" },
  { id: "mosque", label: "Mosque" },
];

function CatThumb({
  filename,
  url,
  kind,
  alt,
}: {
  filename?: string | null;
  url?: string | null;
  kind: "icon" | "banner";
  alt: string;
}) {
  const candidates = useMemo(
    () => categoryImageFallbacks(filename, kind, url),
    [filename, kind, url],
  );
  const [index, setIndex] = useState(0);

  useEffect(() => setIndex(0), [filename, url]);

  if (!candidates.length || index >= candidates.length) {
    return <span className="cat-thumb-placeholder">{kind === "icon" ? "No icon" : "No banner"}</span>;
  }

  return (
    <img
      src={candidates[index]}
      alt={alt}
      className={kind === "icon" ? "cat-thumb-icon" : "cat-thumb-banner"}
      loading="lazy"
      onError={() => setIndex((i) => i + 1)}
    />
  );
}

export function CategoriesPage() {
  const [allItems, setAllItems] = useState<CategoryRow[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm(0));
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [homeIconPreview, setHomeIconPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const tree = useMemo(() => buildCategoryTree(allItems), [allItems]);
  const parentOptions = tree;

  const refresh = useCallback(async () => {
    setError("");
    try {
      const rows = (await adminApi.categories()) as CategoryRow[];
      setAllItems(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load categories");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filteredTree = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tree;
    const matchIds = new Set<number>();
    const byId = new Map(tree.map((r) => [r.id, r]));
    for (const row of tree) {
      const hay = `${row.name} ${row.name_ar || ""} ${row.id} ${row.pathNames.join(" ")}`.toLowerCase();
      if (!hay.includes(q)) continue;
      matchIds.add(row.id);
      let pid = Number(row.parent) || 0;
      while (pid > 0) {
        matchIds.add(pid);
        pid = Number(byId.get(pid)?.parent) || 0;
      }
    }
    return tree.filter((r) => matchIds.has(r.id));
  }, [tree, search]);

  const childrenByParent = useMemo(() => {
    const map = new Map<number, FlatCategory[]>();
    for (const row of filteredTree) {
      const pid = Number(row.parent) || 0;
      const list = map.get(pid) ?? [];
      list.push(row);
      map.set(pid, list);
    }
    return map;
  }, [filteredTree]);

  const rootRows = useMemo(() => {
    const roots = childrenByParent.get(0) ?? [];
    const orphans = filteredTree.filter((row) => {
      const pid = Number(row.parent) || 0;
      if (pid === 0) return false;
      return !filteredTree.some((t) => t.id === pid);
    });
    return [...roots, ...orphans];
  }, [childrenByParent, filteredTree]);

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    setExpanded(new Set(tree.map((r) => r.id)));
  }

  function collapseAll() {
    setExpanded(new Set());
  }

  function openAdd(parentForNew = 0) {
    setEditId(null);
    setForm(emptyForm(parentForNew));
    setIconPreview(null);
    setHomeIconPreview(null);
    setBannerPreview(null);
    setMsg("");
    setOpen(true);
  }

  useOpenAddQuery(() => openAdd(0));

  async function openEdit(row: CategoryRow) {
    setBusy(true);
    setMsg("");
    try {
      const detail = (await adminApi.category(row.id)) as Record<string, unknown>;
      setEditId(row.id);
      setForm({
        name: String(detail.name ?? ""),
        name_ar: String(detail.name_ar ?? ""),
        short_desc: String(detail.short_desc ?? ""),
        short_desc_ar: String(detail.short_desc_ar ?? ""),
        desc: String(detail.desc ?? ""),
        desc_ar: String(detail.desc_ar ?? ""),
        meta_title: String(detail.meta_title ?? ""),
        meta_title_ar: String(detail.meta_title_ar ?? ""),
        meta_keyword: String(detail.meta_keyword ?? ""),
        meta_keyword_ar: String(detail.meta_keyword_ar ?? ""),
        meta_desc: String(detail.meta_desc ?? ""),
        meta_desc_ar: String(detail.meta_desc_ar ?? ""),
        type: String(detail.type ?? 1),
        parent: String(detail.parent ?? 0),
        tag: String(detail.tag ?? ""),
        bulk_item: String(detail.bulk_item ?? ""),
        home_display: String(detail.home_display ?? 0),
        icon: String(detail.icon ?? ""),
        home_icon: String(detail.home_icon ?? ""),
        home_shape: String(detail.home_shape ?? "rectangle"),
        banner: String(detail.banner ?? ""),
        priority: String(detail.priority ?? 1),
        status: String(detail.status ?? 1),
      });
      setIconPreview(categoryImageUrl(String(detail.icon ?? ""), "icon", detail.icon_url as string | null));
      setHomeIconPreview(
        categoryImageUrl(
          String(detail.home_icon ?? detail.icon ?? ""),
          "home_icon",
          (detail.home_icon_url as string | null) ?? (detail.icon_url as string | null),
        ),
      );
      setBannerPreview(categoryImageUrl(String(detail.banner ?? ""), "banner", detail.banner_url as string | null));
      setOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load category");
    } finally {
      setBusy(false);
    }
  }

  async function onUpload(kind: "icon" | "home_icon" | "banner", file: File | null) {
    if (!file) return;
    setBusy(true);
    setMsg("");
    try {
      const uploaded = await adminApi.uploadCategoryImage(file, kind, form.name || "category");
      if (kind === "icon") {
        setForm((s) => ({ ...s, icon: uploaded.filename }));
        setIconPreview(uploaded.url);
        setMsg("Sidebar icon uploaded.");
      } else if (kind === "home_icon") {
        setForm((s) => ({ ...s, home_icon: uploaded.filename }));
        setHomeIconPreview(uploaded.url);
        setMsg("Home icon uploaded.");
      } else {
        setForm((s) => ({ ...s, banner: uploaded.filename }));
        setBannerPreview(uploaded.url);
        setMsg("Banner uploaded.");
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!form.name.trim()) {
      setMsg("Category name is required.");
      return;
    }
    setBusy(true);
    setMsg("");
    const body: Record<string, unknown> = {
      name: form.name.trim(),
      name_ar: form.name_ar.trim(),
      short_desc: form.short_desc.trim(),
      short_desc_ar: form.short_desc_ar.trim(),
      desc: form.desc.trim(),
      desc_ar: form.desc_ar.trim(),
      meta_title: form.meta_title.trim(),
      meta_title_ar: form.meta_title_ar.trim(),
      meta_keyword: form.meta_keyword.trim(),
      meta_keyword_ar: form.meta_keyword_ar.trim(),
      meta_desc: form.meta_desc.trim(),
      meta_desc_ar: form.meta_desc_ar.trim(),
      type: Number(form.type),
      parent: Number(form.parent) || 0,
      tag: form.tag.trim(),
      bulk_item: form.bulk_item.trim(),
      home_display: Number(form.home_display),
      icon: form.icon.trim(),
      home_icon: form.home_icon.trim(),
      home_shape: form.home_shape.trim() || "rectangle",
      banner: form.banner.trim(),
      priority: Number(form.priority) || 0,
      status: Number(form.status),
    };
    try {
      if (editId) await adminApi.updateCategory(editId, body);
      else await adminApi.createCategory(body);
      setOpen(false);
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function onToggle(row: CategoryRow) {
    await adminApi.updateCategoryStatus(row.id, row.status === 1 ? 0 : 1);
    await refresh();
  }

  async function onDelete(id: number) {
    if (!confirm("Delete this category? Child categories will remain but the parent link will be orphaned.")) return;
    await adminApi.deleteCategory(id);
    await refresh();
  }

  const showParentField = form.type === "1";
  const searching = search.trim().length > 0;
  const mainCount = tree.filter((r) => r.depth === 0).length;
  const subCount = tree.filter((r) => r.depth === 1).length;
  const deepCount = tree.filter((r) => r.depth >= 2).length;

  const parentSelectOptions = useMemo(() => {
    if (!editId) return parentOptions;
    const blocked = new Set<number>([editId]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const row of parentOptions) {
        if (blocked.has(row.id)) continue;
        if (blocked.has(Number(row.parent) || 0)) {
          blocked.add(row.id);
          grew = true;
        }
      }
    }
    return parentOptions.filter((p) => !blocked.has(p.id));
  }, [parentOptions, editId]);

  function renderActions(row: FlatCategory) {
    return (
      <div className="cat-nav-actions" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="cat-nav-action" title="Add child" onClick={() => openAdd(row.id)}>
          <Plus size={13} aria-hidden />
          <span>Add</span>
        </button>
        <button type="button" className="cat-nav-action" title="Edit" onClick={() => void openEdit(row)}>
          Edit
        </button>
        <button type="button" className="cat-nav-action" title={row.status === 1 ? "Deactivate" : "Activate"} onClick={() => void onToggle(row)}>
          {row.status === 1 ? "Off" : "On"}
        </button>
        <button type="button" className="cat-nav-action is-danger" title="Delete" onClick={() => void onDelete(row.id)}>
          <Trash2 size={13} aria-hidden />
        </button>
      </div>
    );
  }

  function renderNode(row: FlatCategory): ReactNode {
    const kids = childrenByParent.get(row.id) ?? [];
    const hasKids = kids.length > 0;
    const isOpen = searching || expanded.has(row.id);
    const label = row.name || `Category #${row.id}`;

    if (row.depth === 0) {
      return (
        <div key={row.id} className={`cat-nav-group${isOpen ? " open" : ""}${row.status !== 1 ? " is-off" : ""}`}>
          <div className="cat-nav-group-row">
            <button
              type="button"
              className="cat-nav-group-toggle"
              onClick={() => (hasKids ? toggleExpand(row.id) : void openEdit(row))}
            >
              <span className="cat-nav-group-lead">
                <CatThumb filename={row.icon} url={row.icon_url} kind="icon" alt={label} />
                <span className="cat-nav-text">
                  <span className="cat-nav-label">{label}</span>
                  {row.name_ar ? (
                    <span className="cat-nav-ar" dir="rtl">
                      {row.name_ar}
                    </span>
                  ) : null}
                </span>
              </span>
              <span className="cat-nav-group-end">
                <span className={`status-pill ${row.status === 1 ? "is-on" : "is-off"}`}>
                  {row.status === 1 ? "Active" : "Off"}
                </span>
                {hasKids ? <span className="cat-nav-count">{kids.length}</span> : null}
                <span className="muted cat-nav-meta">
                  {row.product_count}p · P{row.priority}
                </span>
                {hasKids ? (
                  isOpen ? <ChevronDown size={14} className="chev" aria-hidden /> : <ChevronRight size={14} className="chev" aria-hidden />
                ) : null}
              </span>
            </button>
            {renderActions(row)}
          </div>
          {hasKids && isOpen ? <div className="cat-nav-sub">{kids.map((child) => renderNode(child))}</div> : null}
        </div>
      );
    }

    return (
      <div key={row.id} className={`cat-nav-leaf${hasKids ? " has-kids" : ""}${isOpen ? " open" : ""}${row.status !== 1 ? " is-off" : ""}`}>
        <div className="cat-nav-leaf-row">
          <button type="button" className="cat-nav-leaf-btn" onClick={() => void openEdit(row)}>
            <span className="cat-nav-label">{label}</span>
            {row.name_ar ? (
              <span className="cat-nav-ar" dir="rtl">
                {row.name_ar}
              </span>
            ) : null}
            {hasKids ? <span className="cat-nav-count is-soft">{kids.length}</span> : null}
            <span className="muted cat-nav-meta">
              #{row.id} · {row.product_count}p · P{row.priority}
            </span>
          </button>
          {hasKids ? (
            <button
              type="button"
              className="cat-nav-nest-toggle"
              aria-label={isOpen ? "Collapse" : "Expand"}
              aria-expanded={isOpen}
              onClick={() => toggleExpand(row.id)}
              disabled={searching}
            >
              {isOpen ? <ChevronDown size={12} aria-hidden /> : <ChevronRight size={12} aria-hidden />}
            </button>
          ) : null}
          {renderActions(row)}
        </div>
        {hasKids && isOpen ? <div className="cat-nav-sub-sub">{kids.map((child) => renderNode(child))}</div> : null}
      </div>
    );
  }

  return (
    <div className="page category-page">
      <header className="page-head">
        <div>
          <p className="settings-crumb">Catalog · Categories</p>
          <h1 className="page-title">Category management</h1>
          <p className="page-sub">Nested category tree — same pattern as the sidebar menu groups.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => openAdd(0)}>
          Add category
        </button>
      </header>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="card cat-nav-card">
        <div className="panel-toolbar category-toolbar">
          <div className="cat-tree-tools">
            <span className="cat-tree-title">
              <FolderTree size={14} aria-hidden /> Category tree
            </span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={expandAll}>
              Expand all
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={collapseAll}>
              Collapse
            </button>
          </div>
          <div className="category-toolbar-actions">
            <input
              className="cat-search"
              value={search}
              placeholder="Search name, Arabic, or ID…"
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="button" className="btn btn-secondary" onClick={() => void refresh()}>
              Refresh
            </button>
          </div>
        </div>

        <p className="muted cat-level-hint">
          {searching
            ? `Search results for “${search.trim()}” · ${filteredTree.length} shown`
            : `${mainCount} main · ${subCount} sub · ${deepCount} deeper — expand a group like Products in the sidebar`}
        </p>

        <div className="cat-nav" role="tree">
          {rootRows.map((row) => renderNode(row))}
          {!rootRows.length ? <p className="muted cat-nav-empty">No categories found</p> : null}
        </div>
      </div>

      {open ? (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal-card category-modal" onClick={(e) => e.stopPropagation()}>
            <div className="page-head">
              <h2>{editId ? "Edit category" : "Add category"}</h2>
              <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>

            <div className="category-modal-body">
              <div className="category-form-scroll">
                <section className="cat-form-section">
                  <h3 className="cat-form-section-title">Setup</h3>
                  <div className="category-form-grid">
                    <label className="pf-field">
                      <span className="pf-label">Category type</span>
                      <select value={form.type} onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))}>
                        <option value="1">Category (linked to category id)</option>
                        <option value="2">Tag (linked to tag)</option>
                        <option value="3">Bulk item</option>
                      </select>
                    </label>

                    {showParentField ? (
                      <label className="pf-field">
                        <span className="pf-label">Parent category</span>
                        <select value={form.parent} onChange={(e) => setForm((s) => ({ ...s, parent: e.target.value }))}>
                          <option value="0">None (top level)</option>
                          {parentSelectOptions
                            .filter((p) => p.type !== 3)
                            .map((p) => {
                              const indent = "\u00A0\u00A0".repeat(p.depth);
                              const mark = p.depth === 0 ? "" : p.depth === 1 ? "↳ " : "↳↳ ";
                              return (
                                <option key={p.id} value={p.id}>
                                  {indent}
                                  {mark}
                                  {p.name || `Category #${p.id}`} · {levelLabel(p.depth)} (#{p.id})
                                </option>
                              );
                            })}
                        </select>
                      </label>
                    ) : form.type === "2" ? (
                      <label className="pf-field">
                        <span className="pf-label">Tags</span>
                        <input value={form.tag} onChange={(e) => setForm((s) => ({ ...s, tag: e.target.value }))} />
                      </label>
                    ) : (
                      <div className="pf-field cat-field-spacer" aria-hidden />
                    )}

                    {form.type === "3" ? (
                      <label className="pf-field cat-span-2">
                        <span className="pf-label">Bulk product IDs</span>
                        <textarea
                          value={form.bulk_item}
                          onChange={(e) => setForm((s) => ({ ...s, bulk_item: e.target.value }))}
                          placeholder="1,2,3"
                        />
                      </label>
                    ) : null}

                    <div className="pf-field">
                      <span className="pf-label">Display type</span>
                      <div className="cat-radio-row">
                        <label>
                          <input
                            type="radio"
                            name="home_display"
                            checked={form.home_display === "0"}
                            onChange={() => setForm((s) => ({ ...s, home_display: "0" }))}
                          />
                          Normal
                        </label>
                        <label>
                          <input
                            type="radio"
                            name="home_display"
                            checked={form.home_display === "1"}
                            onChange={() => setForm((s) => ({ ...s, home_display: "1" }))}
                          />
                          Home display
                        </label>
                      </div>
                    </div>

                    <div className="cat-settings-pair">
                      <label className="pf-field">
                        <span className="pf-label">Priority</span>
                        <input
                          type="number"
                          min={0}
                          value={form.priority}
                          onChange={(e) => setForm((s) => ({ ...s, priority: e.target.value }))}
                        />
                      </label>
                      <label className="pf-field">
                        <span className="pf-label">Status</span>
                        <select value={form.status} onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}>
                          <option value="1">Active</option>
                          <option value="0">Off</option>
                        </select>
                      </label>
                    </div>
                  </div>
                </section>

                <section className="cat-form-section">
                  <h3 className="cat-form-section-title">Names & descriptions</h3>
                  <div className="category-form-grid">
                    <label className="pf-field">
                      <span className="pf-label">Name (English)</span>
                      <input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
                    </label>
                    <label className="pf-field">
                      <span className="pf-label">Name (Arabic)</span>
                      <input value={form.name_ar} onChange={(e) => setForm((s) => ({ ...s, name_ar: e.target.value }))} dir="rtl" />
                    </label>
                    <label className="pf-field">
                      <span className="pf-label">Short description (EN)</span>
                      <textarea
                        value={form.short_desc}
                        onChange={(e) => setForm((s) => ({ ...s, short_desc: e.target.value }))}
                      />
                    </label>
                    <label className="pf-field">
                      <span className="pf-label">Short description (AR)</span>
                      <textarea
                        value={form.short_desc_ar}
                        onChange={(e) => setForm((s) => ({ ...s, short_desc_ar: e.target.value }))}
                        dir="rtl"
                      />
                    </label>
                    <label className="pf-field">
                      <span className="pf-label">Detailed description (EN)</span>
                      <textarea value={form.desc} onChange={(e) => setForm((s) => ({ ...s, desc: e.target.value }))} />
                    </label>
                    <label className="pf-field">
                      <span className="pf-label">Detailed description (AR)</span>
                      <textarea
                        value={form.desc_ar}
                        onChange={(e) => setForm((s) => ({ ...s, desc_ar: e.target.value }))}
                        dir="rtl"
                      />
                    </label>
                  </div>
                </section>

                <section className="cat-form-section">
                  <h3 className="cat-form-section-title">SEO</h3>
                  <div className="category-form-grid">
                    <label className="pf-field">
                      <span className="pf-label">Meta title (EN)</span>
                      <input
                        value={form.meta_title}
                        onChange={(e) => setForm((s) => ({ ...s, meta_title: e.target.value }))}
                      />
                    </label>
                    <label className="pf-field">
                      <span className="pf-label">Meta title (AR)</span>
                      <input
                        value={form.meta_title_ar}
                        onChange={(e) => setForm((s) => ({ ...s, meta_title_ar: e.target.value }))}
                        dir="rtl"
                      />
                    </label>
                    <label className="pf-field">
                      <span className="pf-label">Meta keyword (EN)</span>
                      <input
                        value={form.meta_keyword}
                        onChange={(e) => setForm((s) => ({ ...s, meta_keyword: e.target.value }))}
                      />
                    </label>
                    <label className="pf-field">
                      <span className="pf-label">Meta keyword (AR)</span>
                      <input
                        value={form.meta_keyword_ar}
                        onChange={(e) => setForm((s) => ({ ...s, meta_keyword_ar: e.target.value }))}
                        dir="rtl"
                      />
                    </label>
                    <label className="pf-field">
                      <span className="pf-label">Meta description (EN)</span>
                      <textarea
                        value={form.meta_desc}
                        onChange={(e) => setForm((s) => ({ ...s, meta_desc: e.target.value }))}
                      />
                    </label>
                    <label className="pf-field">
                      <span className="pf-label">Meta description (AR)</span>
                      <textarea
                        value={form.meta_desc_ar}
                        onChange={(e) => setForm((s) => ({ ...s, meta_desc_ar: e.target.value }))}
                        dir="rtl"
                      />
                    </label>
                  </div>
                </section>

                <section className="cat-form-section">
                  <h3 className="cat-form-section-title">Media</h3>
                  <div className="category-form-grid">
                    <div className="pf-field cat-span-2">
                      <span className="pf-label">Sidebar icon</span>
                      <CategoryIconPicker
                        selectedFilename={form.icon}
                        selectedPreview={iconPreview}
                        busy={busy}
                        emptyLabel="Upload sidebar icon"
                        onUpload={(file) => void onUpload("icon", file)}
                        onClear={() => {
                          setForm((s) => ({ ...s, icon: "" }));
                          setIconPreview(null);
                        }}
                      />
                    </div>

                    <div className="pf-field cat-span-2">
                      <span className="pf-label">Home icon</span>
                      <CategoryIconPicker
                        selectedFilename={form.home_icon}
                        selectedPreview={homeIconPreview}
                        busy={busy}
                        emptyLabel="Upload home rail image"
                        previewWide
                        onUpload={(file) => void onUpload("home_icon", file)}
                        onClear={() => {
                          setForm((s) => ({ ...s, home_icon: "" }));
                          setHomeIconPreview(null);
                        }}
                      />
                    </div>

                    <div className="pf-field cat-span-2">
                      <span className="pf-label">Home icon shape</span>
                      <div className="cat-home-shape-grid" role="radiogroup" aria-label="Home icon shape">
                        {HOME_SHAPES.map((shape) => (
                          <button
                            key={shape.id}
                            type="button"
                            role="radio"
                            aria-checked={form.home_shape === shape.id}
                            className={`cat-home-shape-chip${form.home_shape === shape.id ? " is-active" : ""}`}
                            onClick={() => setForm((s) => ({ ...s, home_shape: shape.id }))}
                          >
                            <span className="cat-home-shape-preview" data-shape={shape.id} aria-hidden />
                            {shape.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pf-field cat-span-2">
                      <span className="pf-label">Banner image</span>
                      <div className="cat-upload-block">
                        <input
                          type="file"
                          accept="image/*"
                          className="banner-file-input"
                          onChange={(e) => void onUpload("banner", e.target.files?.[0] ?? null)}
                        />
                        <input
                          value={form.banner}
                          placeholder="Or enter banner filename…"
                          onChange={(e) => {
                            const banner = e.target.value;
                            setForm((s) => ({ ...s, banner }));
                            setBannerPreview(categoryImageUrl(banner, "banner"));
                          }}
                        />
                        {bannerPreview ? (
                          <img src={bannerPreview} alt="" className="cat-form-preview cat-form-preview-wide" />
                        ) : null}
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <div className="category-modal-form-actions">
                {msg ? (
                  <p className={msg.includes("failed") || msg.includes("required") ? "error" : "muted"}>{msg}</p>
                ) : null}
                <button type="button" className="btn btn-primary btn-block" disabled={busy} onClick={() => void save()}>
                  {busy ? "Saving…" : editId ? "Save changes" : "Create category"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
