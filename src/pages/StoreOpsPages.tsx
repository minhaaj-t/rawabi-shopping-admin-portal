import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { adminApi } from "../lib/api";

type StoreOpt = { ec_store_id: number; ec_store_name: string };

function useStores() {
  const [stores, setStores] = useState<StoreOpt[]>([]);
  useEffect(() => {
    adminApi
      .stores()
      .then(setStores)
      .catch(() => setStores([]));
  }, []);
  return stores;
}

function Err({ error }: { error: string }) {
  return error ? <div className="error card">{error}</div> : null;
}

function StoreSelect({
  value,
  onChange,
  stores,
  allowEmpty,
}: {
  value: string;
  onChange: (v: string) => void;
  stores: StoreOpt[];
  allowEmpty?: boolean;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} required={!allowEmpty}>
      {allowEmpty ? <option value="">All stores</option> : <option value="">Select store</option>}
      {stores.map((s) => (
        <option key={s.ec_store_id} value={s.ec_store_id}>
          {s.ec_store_name}
        </option>
      ))}
    </select>
  );
}

export function BranchesHubPage() {
  return <Navigate to="/stores" replace />;
}

export function StoreHolidaysPage() {
  const stores = useStores();
  const [storeId, setStoreId] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [form, setForm] = useState({
    date: "",
    name: "",
    closed: true,
    open: "",
    close: "",
  });

  async function load() {
    setError("");
    try {
      const d = await adminApi.storeHolidays({
        store_id: storeId || undefined,
        per_page: 100,
      });
      setRows(d.items as Array<Record<string, unknown>>);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load holidays");
      setRows([]);
    }
  }

  useEffect(() => {
    void load();
  }, [storeId]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMsg("");
    try {
      await adminApi.createStoreHoliday({
        store_id: storeId ? Number(storeId) : 0,
        date: form.date,
        name: form.name,
        closed: form.closed ? 1 : 0,
        open: form.closed ? undefined : form.open || undefined,
        close: form.closed ? undefined : form.close || undefined,
      });
      setMsg("Holiday added");
      setForm({ date: "", name: "", closed: true, open: "", close: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: number) {
    if (!window.confirm("Delete this holiday?")) return;
    setBusy(true);
    try {
      await adminApi.deleteStoreHoliday(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Store holidays</h1>
          <p className="page-sub">Closed dates and special hours (store 0 = all branches).</p>
        </div>
        <Link className="btn btn-secondary" to="/stores">
          Back to stores
        </Link>
      </header>

      <Err error={error} />
      {msg ? <div className="card muted">{msg}</div> : null}

      <form className="card" onSubmit={onCreate} style={{ marginBottom: 16 }}>
        <div className="toolbar filters" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <StoreSelect value={storeId} onChange={setStoreId} stores={stores} allowEmpty />
          <input
            type="date"
            required
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Holiday name"
          />
          <label className="settings-toggle" style={{ margin: 0 }}>
            <input
              type="checkbox"
              checked={form.closed}
              onChange={(e) => setForm({ ...form, closed: e.target.checked })}
            />
            <span className="settings-toggle-copy">Closed all day</span>
          </label>
          {!form.closed ? (
            <>
              <input type="time" value={form.open} onChange={(e) => setForm({ ...form, open: e.target.value })} />
              <input type="time" value={form.close} onChange={(e) => setForm({ ...form, close: e.target.value })} />
            </>
          ) : null}
          <button type="submit" className="btn" disabled={busy}>
            Add
          </button>
        </div>
      </form>

      <div className="card table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Date</th>
              <th>Name</th>
              <th>Store</th>
              <th>Hours</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.hol_id)}>
                <td>{String(r.hol_date)}</td>
                <td>{String(r.hol_name)}</td>
                <td>{Number(r.hol_store_id) === 0 ? "All stores" : String(r.store_name ?? r.hol_store_id)}</td>
                <td>
                  {Number(r.hol_closed) === 1
                    ? "Closed"
                    : `${String(r.hol_open ?? "—")} – ${String(r.hol_close ?? "—")}`}
                </td>
                <td>
                  <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void onDelete(Number(r.hol_id))}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={5} className="muted">
                  No holidays
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
