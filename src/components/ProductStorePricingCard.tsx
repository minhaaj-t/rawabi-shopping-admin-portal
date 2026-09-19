import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "../lib/icons";
import { adminApi } from "../lib/api";

export type StoreOption = { ec_store_id: number; ec_store_name: string };

export type LinkedStoreRow = {
  store_product_id?: number;
  store_id: number;
  name: string;
  price: number;
  offer_price?: number;
  stock: number;
  soldout_status: number;
};

const STATUS_OPTIONS = [
  { value: 1, label: "Available" },
  { value: 3, label: "Sold out" },
];

type DraftRow = {
  store_id: number;
  name: string;
  price: string;
  offer_price: string;
  stock: string;
  soldout_status: number;
  dirty: boolean;
  saving: boolean;
  error: string;
};

function toDraft(row: LinkedStoreRow): DraftRow {
  return {
    store_id: row.store_id,
    name: row.name,
    price: String(row.price ?? 0),
    offer_price: String(row.offer_price ?? 0),
    stock: String(row.stock ?? 0),
    soldout_status: Number(row.soldout_status ?? 1) || 1,
    dirty: false,
    saving: false,
    error: "",
  };
}

export function ProductStorePricingCard({
  editing,
  productId,
  stores,
  linkedStores,
  defaultPrice,
  storeIds,
  onStoreIdsChange,
  onLinkedStoresChange,
}: {
  editing: boolean;
  productId: number;
  stores: StoreOption[];
  linkedStores: LinkedStoreRow[];
  defaultPrice: string;
  storeIds: number[];
  onStoreIdsChange: (ids: number[]) => void;
  onLinkedStoresChange: (rows: LinkedStoreRow[]) => void;
}) {
  const [rows, setRows] = useState<DraftRow[]>(() => linkedStores.map(toDraft));
  const [addStoreId, setAddStoreId] = useState("");
  const [adding, setAdding] = useState(false);
  const [banner, setBanner] = useState("");

  const linkedKey = useMemo(
    () =>
      linkedStores
        .map((s) => `${s.store_id}:${s.price}:${s.offer_price ?? 0}:${s.stock}:${s.soldout_status}`)
        .join("|"),
    [linkedStores],
  );

  useEffect(() => {
    setRows(linkedStores.map(toDraft));
  }, [linkedKey]); // eslint-disable-line react-hooks/exhaustive-deps -- fingerprint sync

  const assignedIds = useMemo(() => new Set(rows.map((r) => r.store_id)), [rows]);
  const availableToAdd = stores.filter((s) => !assignedIds.has(s.ec_store_id));

  function patchRow(storeId: number, patch: Partial<DraftRow>) {
    setRows((prev) => prev.map((r) => (r.store_id === storeId ? { ...r, ...patch, dirty: true } : r)));
  }

  async function saveRow(row: DraftRow) {
    if (!editing || productId <= 0) return;
    setRows((prev) =>
      prev.map((r) => (r.store_id === row.store_id ? { ...r, saving: true, error: "" } : r)),
    );
    try {
      const data = await adminApi.updateStoreStock(productId, {
        store_id: row.store_id,
        price: Number(row.price) || 0,
        offer_price: Number(row.offer_price) || 0,
        stock: Number(row.stock) || 0,
        soldout_status: row.soldout_status,
      });
      const next: LinkedStoreRow = {
        store_product_id: data.store_product_id,
        store_id: row.store_id,
        name: row.name,
        price: Number(data.price ?? row.price) || 0,
        offer_price: Number(data.offer_price ?? row.offer_price) || 0,
        stock: Number(data.stock ?? row.stock) || 0,
        soldout_status: Number(data.soldout_status ?? row.soldout_status) || 1,
      };
      onLinkedStoresChange(
        [...linkedStores.filter((s) => s.store_id !== row.store_id), next].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      setBanner("Store price saved");
      window.setTimeout(() => setBanner(""), 1600);
    } catch (err) {
      setRows((prev) =>
        prev.map((r) =>
          r.store_id === row.store_id
            ? {
                ...r,
                saving: false,
                error: err instanceof Error ? err.message : "Save failed",
              }
            : r,
        ),
      );
    }
  }

  async function addStore() {
    const id = Number(addStoreId);
    if (!id || !editing || productId <= 0) return;
    const store = stores.find((s) => s.ec_store_id === id);
    if (!store) return;
    setAdding(true);
    setBanner("");
    try {
      const price = Number(defaultPrice) || 0;
      const data = await adminApi.updateStoreStock(productId, {
        store_id: id,
        price,
        offer_price: 0,
        stock: 0,
        soldout_status: 1,
      });
      const next: LinkedStoreRow = {
        store_product_id: data.store_product_id,
        store_id: id,
        name: store.ec_store_name,
        price: Number(data.price ?? price) || 0,
        offer_price: Number(data.offer_price ?? 0) || 0,
        stock: Number(data.stock ?? 0) || 0,
        soldout_status: Number(data.soldout_status ?? 1) || 1,
      };
      onLinkedStoresChange([...linkedStores, next].sort((a, b) => a.name.localeCompare(b.name)));
      setAddStoreId("");
      setBanner("Store assigned");
      window.setTimeout(() => setBanner(""), 1600);
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "Could not assign store");
    } finally {
      setAdding(false);
    }
  }

  async function removeStore(row: DraftRow) {
    if (!editing || productId <= 0) return;
    if (!window.confirm(`Remove this product from ${row.name}?`)) return;
    setRows((prev) =>
      prev.map((r) => (r.store_id === row.store_id ? { ...r, saving: true, error: "" } : r)),
    );
    try {
      await adminApi.updateStoreStock(productId, {
        store_id: row.store_id,
        soldout_status: 6,
      });
      onLinkedStoresChange(linkedStores.filter((s) => s.store_id !== row.store_id));
      setBanner("Removed from store");
      window.setTimeout(() => setBanner(""), 1600);
    } catch (err) {
      setRows((prev) =>
        prev.map((r) =>
          r.store_id === row.store_id
            ? {
                ...r,
                saving: false,
                error: err instanceof Error ? err.message : "Remove failed",
              }
            : r,
        ),
      );
    }
  }

  function toggleCreateStore(id: number) {
    if (storeIds.includes(id)) {
      onStoreIdsChange(storeIds.filter((x) => x !== id));
    } else {
      onStoreIdsChange([...storeIds, id]);
    }
  }

  if (!editing) {
    return (
      <div className="pf-store-panel">
        <p className="muted pf-hint">Choose stores for this product. Price starts from Selling price.</p>
        <div className="pf-store-checklist">
          {stores.map((s) => {
            const checked = storeIds.includes(s.ec_store_id);
            return (
              <label key={s.ec_store_id} className={`pf-store-check${checked ? " is-on" : ""}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleCreateStore(s.ec_store_id)}
                />
                <span>{s.ec_store_name}</span>
              </label>
            );
          })}
        </div>
        {!stores.length ? <p className="muted">No stores found.</p> : null}
        {storeIds.length ? (
          <p className="muted pf-hint">
            {storeIds.length} store{storeIds.length === 1 ? "" : "s"} selected
          </p>
        ) : (
          <p className="muted pf-hint">No store selected — you can assign later after create.</p>
        )}
      </div>
    );
  }

  return (
    <div className="pf-store-panel">
      <p className="muted pf-hint">Assign stores and set each store’s price, offer, and stock.</p>

      {rows.length ? (
        <div className="pf-store-rows">
          {rows.map((row) => (
            <div key={row.store_id} className={`pf-store-row${row.dirty ? " is-dirty" : ""}`}>
              <div className="pf-store-row-head">
                <strong>{row.name}</strong>
                <button
                  type="button"
                  className="pf-store-remove"
                  aria-label={`Remove from ${row.name}`}
                  disabled={row.saving}
                  onClick={() => void removeStore(row)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="pf-store-fields">
                <label>
                  Price
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={row.price}
                    disabled={row.saving}
                    onChange={(e) => patchRow(row.store_id, { price: e.target.value })}
                  />
                </label>
                <label>
                  Offer
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={row.offer_price}
                    disabled={row.saving}
                    onChange={(e) => patchRow(row.store_id, { offer_price: e.target.value })}
                  />
                </label>
                <label>
                  Stock
                  <input
                    type="number"
                    min={0}
                    step="1"
                    value={row.stock}
                    disabled={row.saving}
                    onChange={(e) => patchRow(row.store_id, { stock: e.target.value })}
                  />
                </label>
                <label>
                  Status
                  <select
                    value={row.soldout_status}
                    disabled={row.saving}
                    onChange={(e) =>
                      patchRow(row.store_id, { soldout_status: Number(e.target.value) || 1 })
                    }
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="pf-store-row-actions">
                {row.error ? <span className="error small">{row.error}</span> : <span />}
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={row.saving || !row.dirty}
                  onClick={() => void saveRow(row)}
                >
                  {row.saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">Not in any store yet.</p>
      )}

      <div className="pf-store-add">
        <select
          value={addStoreId}
          onChange={(e) => setAddStoreId(e.target.value)}
          disabled={adding || !availableToAdd.length}
        >
          <option value="">Add store…</option>
          {availableToAdd.map((s) => (
            <option key={s.ec_store_id} value={s.ec_store_id}>
              {s.ec_store_name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={adding || !addStoreId}
          onClick={() => void addStore()}
        >
          <Plus size={14} />
          {adding ? "Adding…" : "Assign"}
        </button>
      </div>

      {banner ? (
        <p className="muted pf-hint" role="status">
          {banner}
        </p>
      ) : null}
    </div>
  );
}
