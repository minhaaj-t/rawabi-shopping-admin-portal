import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Filter, Plus, RotateCcw, Upload, X } from "../lib/icons";
import { adminApi } from "../lib/api";
import { getUser, isStorePortal } from "../lib/auth";
import { getAdminBranchId } from "../lib/adminBranch";
import { ProductImportExportModal } from "../components/ProductImportExportModal";
import { MultiSelectDropdown } from "../components/MultiSelectDropdown";
import { LoadingIndicator } from "../components/LoadingIndicator";

type ProductItem = Awaited<ReturnType<typeof adminApi.products>>["items"][number];

type Row = ProductItem & {
  draftStock: string;
  draftStockLimit: string;
  draftPrice: string;
  draftOffer: string;
  draftPriority: string;
  draftSoldout: string;
  draftFeatured: number[];
};

type Cat = { id: number; name: string; parent: number };

const FEATURE_TAGS = [
  { id: 1, label: "Featured" },
  { id: 2, label: "Best Seller" },
  { id: 3, label: "Organic" },
  { id: 4, label: "Vegan" },
  { id: 5, label: "Online Exclusive" },
  { id: 6, label: "Rawabi Fresh" },
  { id: 7, label: "Special Deals" },
  { id: 8, label: "Limited Time Offer" },
  { id: 9, label: "Weekend Deals" },
  { id: 10, label: "Midweek Deals" },
  { id: 11, label: "Sunday Deals" },
  { id: 12, label: "Best Price" },
  { id: 13, label: "End of Sales" },
];

const SOLDOUT_OPTIONS = [
  { value: "1", label: "Activated" },
  { value: "0", label: "Deactivated" },
  { value: "3", label: "Don't Show" },
  { value: "6", label: "Hidden" },
];

function toRow(item: ProductItem): Row {
  return {
    ...item,
    draftStock: item.stock != null ? String(item.stock) : "",
    draftStockLimit: item.stock_limit != null ? String(item.stock_limit) : "",
    draftPrice: item.price != null ? String(item.price) : item.base_price != null ? String(item.base_price) : "",
    draftOffer: item.offer_price != null ? String(item.offer_price) : "",
    draftPriority: item.priority != null ? String(item.priority) : "",
    draftSoldout: item.soldout_status != null ? String(item.soldout_status) : "1",
    draftFeatured: [...(item.featured ?? [])],
  };
}

function soldoutLabel(status: string) {
  return SOLDOUT_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

export function ProductsPage() {
  const user = getUser();
  const storePortal = isStorePortal(user);
  const lockedStoreId = storePortal && user?.store_id ? String(user.store_id) : "";
  const [searchParams] = useSearchParams();

  const [q, setQ] = useState(() => searchParams.get("q") || "");
  const [sku, setSku] = useState("");
  const [storeId, setStoreId] = useState(lockedStoreId || getAdminBranchId() || "10");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [subSubcategoryId, setSubSubcategoryId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [soldoutFilter, setSoldoutFilter] = useState("");
  const [missingStore, setMissingStore] = useState(false);
  const [stores, setStores] = useState<Array<{ ec_store_id: number; ec_store_name: string }>>([]);
  const [categories, setCategories] = useState<Cat[]>([]);
  const [subcategories, setSubcategories] = useState<Cat[]>([]);
  const [subSubcategories, setSubSubcategories] = useState<Cat[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState(storePortal ? "soldout" : "activate");
  const [bulkSoldout, setBulkSoldout] = useState("1");
  const [bulkPriority, setBulkPriority] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [ioOpen, setIoOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  const activeStoreId = lockedStoreId || storeId;
  const allSelected = rows.length > 0 && rows.every((r) => selected.includes(r.product_id));

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (q) n += 1;
    if (sku) n += 1;
    if (categoryId) n += 1;
    if (subcategoryId) n += 1;
    if (subSubcategoryId) n += 1;
    if (statusFilter !== "") n += 1;
    if (soldoutFilter !== "") n += 1;
    if (missingStore) n += 1;
    if (!storePortal && storeId && stores.length && storeId !== String(stores[0]?.ec_store_id)) n += 1;
    if (perPage !== 25) n += 1;
    return n;
  }, [
    q,
    sku,
    categoryId,
    subcategoryId,
    subSubcategoryId,
    statusFilter,
    soldoutFilter,
    missingStore,
    storePortal,
    storeId,
    stores,
    perPage,
  ]);

  useEffect(() => {
    if (!filtersOpen) return;
    function onDoc(e: MouseEvent) {
      if (!filterMenuRef.current?.contains(e.target as Node)) setFiltersOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFiltersOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [filtersOpen]);

  useEffect(() => {
    if (storePortal) return;
    adminApi
      .stores()
      .then((list) => {
        setStores(list);
        if (list.length && !list.find((s) => String(s.ec_store_id) === storeId)) {
          setStoreId(String(list[0].ec_store_id));
        }
      })
      .catch(() => undefined);
  }, [storePortal]);

  useEffect(() => {
    adminApi
      .categories(0)
      .then((list) =>
        setCategories(
          list.map((c) => ({
            id: Number(c.id),
            name: String(c.name ?? ""),
            parent: Number(c.parent ?? 0),
          })),
        ),
      )
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setSubcategoryId("");
    setSubSubcategoryId("");
    setSubSubcategories([]);
    if (!categoryId) {
      setSubcategories([]);
      return;
    }
    adminApi
      .categories(Number(categoryId))
      .then((list) =>
        setSubcategories(
          list.map((c) => ({
            id: Number(c.id),
            name: String(c.name ?? ""),
            parent: Number(c.parent ?? 0),
          })),
        ),
      )
      .catch(() => setSubcategories([]));
  }, [categoryId]);

  useEffect(() => {
    setSubSubcategoryId("");
    if (!subcategoryId) {
      setSubSubcategories([]);
      return;
    }
    adminApi
      .categories(Number(subcategoryId))
      .then((list) =>
        setSubSubcategories(
          list.map((c) => ({
            id: Number(c.id),
            name: String(c.name ?? ""),
            parent: Number(c.parent ?? 0),
          })),
        ),
      )
      .catch(() => setSubSubcategories([]));
  }, [subcategoryId]);

  const queryParams = useMemo(
    () => ({
      q: q || undefined,
      sku: sku || undefined,
      store_id: activeStoreId || undefined,
      category_id: categoryId || undefined,
      subcategory_id: subcategoryId || undefined,
      sub_subcategory_id: subSubcategoryId || undefined,
      status: statusFilter || undefined,
      soldout_status: soldoutFilter || undefined,
      missing_store: !storePortal && missingStore ? 1 : undefined,
      page,
      per_page: perPage,
    }),
    [
      q,
      sku,
      activeStoreId,
      categoryId,
      subcategoryId,
      subSubcategoryId,
      statusFilter,
      soldoutFilter,
      missingStore,
      storePortal,
      page,
      perPage,
    ],
  );

  function reload() {
    setError("");
    setLoading(true);
    return adminApi
      .products(queryParams)
      .then((res) => {
        setRows(res.items.map(toRow));
        setTotal(res.total);
        setSelected([]);
        if (res.store_id && storePortal) setStoreId(String(res.store_id));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    void reload();
  }, [queryParams]);

  function patchRow(productId: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.product_id === productId ? { ...r, ...patch } : r)));
  }

  function resetFilters() {
    setQ("");
    setSku("");
    setCategoryId("");
    setSubcategoryId("");
    setSubSubcategoryId("");
    setStatusFilter("");
    setSoldoutFilter("");
    setMissingStore(false);
    setPage(1);
    if (!storePortal) setStoreId(stores[0] ? String(stores[0].ec_store_id) : "10");
  }

  async function toggleStatus(row: Row) {
    if (storePortal) return;
    setBusyId(row.product_id);
    setError("");
    try {
      const next = row.status === 1 ? 0 : 1;
      await adminApi.updateProductStatus(row.product_id, next);
      patchRow(row.product_id, { status: next });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Status failed");
    } finally {
      setBusyId(null);
    }
  }

  async function removeProduct(row: Row) {
    if (storePortal) return;
    if (!window.confirm(`Soft-delete product #${row.product_id} (${row.name})?`)) return;
    setBusyId(row.product_id);
    setError("");
    try {
      await adminApi.deleteProduct(row.product_id);
      setRows((prev) => prev.filter((r) => r.product_id !== row.product_id));
      setTotal((t) => Math.max(0, t - 1));
      setOkMsg(`Deleted #${row.product_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  function toggleSelect(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleSelectAll() {
    if (allSelected) setSelected([]);
    else setSelected(rows.map((r) => r.product_id));
  }

  async function runBulk() {
    if (!selected.length) {
      setError("Select at least one product");
      return;
    }
    if (bulkAction === "delete" && !window.confirm(`Soft-delete ${selected.length} products?`)) return;

    setBulkBusy(true);
    setError("");
    setOkMsg("");
    try {
      const body: Parameters<typeof adminApi.bulkProducts>[0] = {
        action: bulkAction,
        ids: selected,
        store_id: Number(activeStoreId),
      };
      if (bulkAction === "soldout") body.soldout_status = Number(bulkSoldout);
      if (bulkAction === "priority") {
        body.priority = bulkPriority.trim() === "" ? null : Number(bulkPriority);
      }
      if (bulkAction === "attach_store") {
        body.soldout_status = 1;
      }
      const res = await adminApi.bulkProducts(body);
      setOkMsg(`Bulk ${res.action}: ${res.affected}/${res.requested} updated`);
      setSelected([]);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk action failed");
    } finally {
      setBulkBusy(false);
    }
  }

  const colSpan = 8;
  const [quickView, setQuickView] = useState<Row | null>(null);

  function openQuickView(row: Row) {
    setQuickView({ ...row });
  }

  function patchQuick(patch: Partial<Row>) {
    setQuickView((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  async function saveQuickView() {
    if (!quickView) return;
    setBusyId(quickView.product_id);
    setError("");
    setOkMsg("");
    try {
      await adminApi.updateStoreStock(quickView.product_id, {
        store_id: Number(activeStoreId),
        stock: quickView.draftStock === "" ? undefined : Number(quickView.draftStock),
        stock_limit: quickView.draftStockLimit === "" ? undefined : Number(quickView.draftStockLimit),
        price: quickView.draftPrice === "" ? undefined : Number(quickView.draftPrice),
        offer_price: quickView.draftOffer === "" ? undefined : Number(quickView.draftOffer),
        soldout_status: quickView.draftSoldout === "" ? undefined : Number(quickView.draftSoldout),
      });
      const priority = quickView.draftPriority.trim() === "" ? null : Number(quickView.draftPriority);
      await adminApi.updateProductPriority(quickView.product_id, priority);
      if (!storePortal) {
        await adminApi.updateProductFeatured(quickView.product_id, quickView.draftFeatured);
        const statusNext = quickView.status;
        await adminApi.updateProductStatus(quickView.product_id, statusNext);
      }
      setOkMsg(`Updated #${quickView.product_id}`);
      setQuickView(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Quick save failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Product list</h1>
          <p className="page-sub">
            {storePortal ? "Store stock, price & soldout" : "Catalog + per-store pricing"} · {total} SKUs
          </p>
        </div>
        <div className="actions">
          {!storePortal ? (
            <Link className="btn btn-green" to="/products/new">
              <Plus size={14} />
              Add product
            </Link>
          ) : null}
          <div className="filter-menu" ref={filterMenuRef}>
            <button
              type="button"
              className={`btn btn-secondary${filtersOpen || activeFilterCount ? " is-active" : ""}`}
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((o) => !o)}
            >
              <Filter size={14} />
              Filters
              {activeFilterCount ? <span className="filter-badge">{activeFilterCount}</span> : null}
            </button>
            {filtersOpen ? (
              <div className="filter-popover" role="dialog" aria-label="Product filters">
                <div className="filter-popover-head">
                  <strong>Filters</strong>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: "2px 8px" }}
                    onClick={() => setFiltersOpen(false)}
                    aria-label="Close filters"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="filter-grid" style={{ marginBottom: 0 }}>
                  <label>
                    Category
                    <select
                      value={categoryId}
                      onChange={(e) => {
                        setPage(1);
                        setCategoryId(e.target.value);
                      }}
                    >
                      <option value="">All</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Sub category
                    <select
                      value={subcategoryId}
                      disabled={!categoryId}
                      onChange={(e) => {
                        setPage(1);
                        setSubcategoryId(e.target.value);
                      }}
                    >
                      <option value="">All</option>
                      {subcategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Sub sub category
                    <select
                      value={subSubcategoryId}
                      disabled={!subcategoryId}
                      onChange={(e) => {
                        setPage(1);
                        setSubSubcategoryId(e.target.value);
                      }}
                    >
                      <option value="">All</option>
                      {subSubcategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {!storePortal ? (
                    <label>
                      Store
                      <select
                        value={storeId}
                        onChange={(e) => {
                          setPage(1);
                          setStoreId(e.target.value);
                        }}
                      >
                        {stores.map((s) => (
                          <option key={s.ec_store_id} value={s.ec_store_id}>
                            {s.ec_store_name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <label>
                    Product search
                    <input
                      placeholder="Name / barcode"
                      value={q}
                      onChange={(e) => {
                        setPage(1);
                        setQ(e.target.value);
                      }}
                    />
                  </label>
                  <label>
                    SKU search
                    <input
                      placeholder="Rawabi code"
                      value={sku}
                      onChange={(e) => {
                        setPage(1);
                        setSku(e.target.value);
                      }}
                    />
                  </label>
                  {!storePortal ? (
                    <label>
                      Catalog status
                      <select
                        value={statusFilter}
                        onChange={(e) => {
                          setPage(1);
                          setStatusFilter(e.target.value);
                        }}
                      >
                        <option value="">All</option>
                        <option value="1">Activated</option>
                        <option value="0">Deactivated</option>
                      </select>
                    </label>
                  ) : null}
                  <label>
                    Soldout
                    <select
                      value={soldoutFilter}
                      onChange={(e) => {
                        setPage(1);
                        setSoldoutFilter(e.target.value);
                      }}
                    >
                      <option value="">All</option>
                      {SOLDOUT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Per page
                    <select
                      value={perPage}
                      onChange={(e) => {
                        setPage(1);
                        setPerPage(Number(e.target.value));
                      }}
                    >
                      {[10, 25, 50, 100].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  {!storePortal ? (
                    <label className="filter-check">
                      <span>Missing in store</span>
                      <input
                        type="checkbox"
                        checked={missingStore}
                        onChange={(e) => {
                          setPage(1);
                          setMissingStore(e.target.checked);
                        }}
                      />
                    </label>
                  ) : null}
                </div>
                <div className="filter-popover-foot">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      resetFilters();
                    }}
                  >
                    <RotateCcw size={14} />
                    Clear
                  </button>
                  <button type="button" className="btn" onClick={() => setFiltersOpen(false)}>
                    Done
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          <button type="button" className="btn btn-secondary" onClick={resetFilters}>
            <RotateCcw size={14} />
            Reset
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setIoOpen(true)}>
            <Upload size={14} />
            Import / Export
          </button>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {okMsg ? <p className="muted">{okMsg}</p> : null}

      <div className="card">
        <div className="panel-toolbar">
          <div className="toolbar" style={{ marginBottom: 0, flexWrap: "wrap" }}>
            <span className="muted">{selected.length} selected</span>
            <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)} style={{ minWidth: 160 }}>
              {!storePortal ? <option value="activate">Activate</option> : null}
              {!storePortal ? <option value="deactivate">Deactivate</option> : null}
              {!storePortal ? <option value="delete">Delete</option> : null}
              <option value="soldout">Set soldout</option>
              <option value="priority">Set priority</option>
              <option value="attach_store">Attach to store</option>
            </select>
            {bulkAction === "soldout" ? (
              <select value={bulkSoldout} onChange={(e) => setBulkSoldout(e.target.value)}>
                {SOLDOUT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : null}
            {bulkAction === "priority" ? (
              <input
                style={{ width: 90 }}
                placeholder="Priority"
                value={bulkPriority}
                onChange={(e) => setBulkPriority(e.target.value)}
              />
            ) : null}
            <button type="button" className="btn" disabled={bulkBusy || !selected.length} onClick={() => void runBulk()}>
              {bulkBusy ? "…" : "Apply"}
            </button>
          </div>
        </div>

        {loading && rows.length === 0 ? (
          <LoadingIndicator padded />
        ) : (
          <>
            <div className="table-wrap">
              <table className="data product-list-table">
                <thead>
                  <tr>
                    <th className="col-check">
                      <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} aria-label="Select all" />
                    </th>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Stock</th>
                    <th>Price</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Soldout</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const price =
                      row.price != null
                        ? Number(row.price)
                        : row.base_price != null
                          ? Number(row.base_price)
                          : null;
                    const offer = row.offer_price != null ? Number(row.offer_price) : null;
                    return (
                      <tr key={row.product_id} className={selected.includes(row.product_id) ? "is-selected" : undefined}>
                        <td className="col-check">
                          <input
                            type="checkbox"
                            checked={selected.includes(row.product_id)}
                            onChange={() => toggleSelect(row.product_id)}
                            aria-label={`Select ${row.product_id}`}
                          />
                        </td>
                        <td className="wrap product-title-cell">
                          <div className="product-row-main">
                            <div className="product-thumb">
                              {row.image_url ? (
                                <img
                                  src={row.image_url}
                                  alt=""
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.visibility = "hidden";
                                  }}
                                />
                              ) : (
                                <span className="product-thumb-empty" />
                              )}
                            </div>
                            <div className="product-title-block">
                              {storePortal ? (
                                <button type="button" className="row-title linkish" onClick={() => openQuickView(row)}>
                                  {row.name || `Product #${row.product_id}`}
                                </button>
                              ) : (
                                <Link className="row-title" to={`/products/${row.product_id}/edit`}>
                                  {row.name || `Product #${row.product_id}`}
                                </Link>
                              )}
                              <div className="row-actions">
                                <button type="button" className="row-action" onClick={() => openQuickView(row)}>
                                  Quick View
                                </button>
                                {!storePortal ? (
                                  <>
                                    <span className="row-action-sep">|</span>
                                    <Link className="row-action" to={`/products/${row.product_id}/edit`}>
                                      Edit
                                    </Link>
                                    <span className="row-action-sep">|</span>
                                    <button
                                      type="button"
                                      className="row-action row-action-danger"
                                      disabled={busyId === row.product_id}
                                      onClick={() => void removeProduct(row)}
                                    >
                                      Trash
                                    </button>
                                    <span className="row-action-sep">|</span>
                                    <button
                                      type="button"
                                      className="row-action"
                                      disabled={busyId === row.product_id}
                                      onClick={() => void toggleStatus(row)}
                                    >
                                      {row.status === 1 ? "Deactivate" : "Activate"}
                                    </button>
                                  </>
                                ) : null}
                                <span className="row-action-sep">|</span>
                                <span className="muted">ID {row.product_id}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <code className="sku-code">{row.sku || "—"}</code>
                          {row.uom ? <div className="muted">{row.uom}</div> : null}
                          {"sell_by_weight" in row && (row as { sell_by_weight?: boolean }).sell_by_weight ? (
                            <div className="muted">Sold by weight</div>
                          ) : null}
                        </td>
                        <td>
                          {row.stock != null ? row.stock : "—"}
                          {row.stock_limit != null ? (
                            <div className="muted">lim {row.stock_limit}</div>
                          ) : null}
                        </td>
                        <td>
                          {price != null ? `QAR ${price.toFixed(2)}` : "—"}
                          {offer != null && offer > 0 ? (
                            <div className="muted">Offer {offer.toFixed(2)}</div>
                          ) : null}
                        </td>
                        <td className="wrap">{row.category_name || "—"}</td>
                        <td>
                          <span className={`badge ${row.status === 1 ? "badge-Delivered" : "badge-Cancelled"}`}>
                            {row.status === 1 ? "Published" : "Draft"}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              row.soldout_status === 1
                                ? "badge-Delivered"
                                : row.soldout_status === 0
                                  ? "badge-Cancelled"
                                  : "badge-Picking"
                            }`}
                          >
                            {soldoutLabel(row.draftSoldout)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={colSpan} className="muted">
                        No products
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              <span>
                Page {page} · {total} total
              </span>
              <div className="actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Prev
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={page * perPage >= total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {quickView ? (
        <div className="modal-backdrop" onClick={() => setQuickView(null)}>
          <div className="modal-card product-quick-view" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-btn"
              aria-label="Close"
              onClick={() => setQuickView(null)}
            >
              <X size={16} />
            </button>

            <div className="quick-view-head">
              <strong>Quick view</strong>
            </div>

            <div className="quick-view-body">
              <div className="quick-view-hero">
                <div className="product-thumb large">
                  {quickView.image_url ? <img src={quickView.image_url} alt="" /> : <span className="product-thumb-empty" />}
                </div>
                <div className="quick-view-meta">
                  <h2 className="quick-view-title">{quickView.name || `Product #${quickView.product_id}`}</h2>
                  <p className="quick-view-id muted">
                    #{quickView.product_id}
                    {quickView.sku ? ` · ${quickView.sku}` : ""}
                    {quickView.barcode ? ` · ${quickView.barcode}` : ""}
                  </p>
                  <p className="muted">{quickView.category_name || "No category"}</p>
                  {!storePortal ? (
                    <Link className="btn btn-secondary btn-sm quick-view-edit-link" to={`/products/${quickView.product_id}/edit`}>
                      Open full edit
                    </Link>
                  ) : null}
                </div>
              </div>

              <section className="quick-view-section">
                <h3 className="quick-view-section-title">Store &amp; pricing</h3>
                <div className="quick-view-form-grid">
                  <label className="pf-field">
                    <span className="pf-label">Store price</span>
                    <input value={quickView.draftPrice} onChange={(e) => patchQuick({ draftPrice: e.target.value })} />
                  </label>
                  <label className="pf-field">
                    <span className="pf-label">Offer price</span>
                    <input value={quickView.draftOffer} onChange={(e) => patchQuick({ draftOffer: e.target.value })} />
                  </label>
                  <label className="pf-field">
                    <span className="pf-label">Stock</span>
                    <input value={quickView.draftStock} onChange={(e) => patchQuick({ draftStock: e.target.value })} />
                  </label>
                  <label className="pf-field">
                    <span className="pf-label">Stock limit</span>
                    <input
                      value={quickView.draftStockLimit}
                      onChange={(e) => patchQuick({ draftStockLimit: e.target.value })}
                    />
                  </label>
                  <label className="pf-field">
                    <span className="pf-label">Priority</span>
                    <input
                      value={quickView.draftPriority}
                      onChange={(e) => patchQuick({ draftPriority: e.target.value })}
                    />
                  </label>
                  <label className="pf-field">
                    <span className="pf-label">Soldout</span>
                    <select
                      value={quickView.draftSoldout}
                      onChange={(e) => patchQuick({ draftSoldout: e.target.value })}
                    >
                      {SOLDOUT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>

              {!storePortal ? (
                <section className="quick-view-section">
                  <h3 className="quick-view-section-title">Catalog</h3>
                  <div className="quick-view-form-grid">
                    <label className="pf-field">
                      <span className="pf-label">Catalog status</span>
                      <select
                        value={String(quickView.status)}
                        onChange={(e) => patchQuick({ status: Number(e.target.value) })}
                      >
                        <option value="1">Published</option>
                        <option value="0">Draft</option>
                      </select>
                    </label>
                    <div className="pf-field quick-view-span-full">
                      <span className="pf-label" id="quick-view-tags-label">
                        Tags
                      </span>
                      <MultiSelectDropdown
                        id="quick-view-tags"
                        options={FEATURE_TAGS.map((t) => ({ value: t.id, label: t.label }))}
                        value={quickView.draftFeatured}
                        onChange={(draftFeatured) => patchQuick({ draftFeatured })}
                        placeholder="Choose tags"
                      />
                    </div>
                  </div>
                </section>
              ) : null}

              {(quickView.stores ?? []).length ? (
                <section className="quick-view-section">
                  <h3 className="quick-view-section-title">Linked stores</h3>
                  <div className="quick-view-stores">
                    {(quickView.stores ?? []).map((s) => (
                      <span key={s.store_id} className="badge badge-Picked">
                        {s.name}
                      </span>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>

            <div className="quick-view-foot">
              <button type="button" className="btn btn-secondary" onClick={() => setQuickView(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={busyId === quickView.product_id}
                onClick={() => void saveQuickView()}
              >
                {busyId === quickView.product_id ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {ioOpen ? (
        <ProductImportExportModal
          storePortal={storePortal}
          activeStoreId={activeStoreId}
          queryParams={queryParams}
          onClose={() => setIoOpen(false)}
          onImportDone={() => void reload()}
        />
      ) : null}
    </div>
  );
}
