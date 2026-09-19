import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "../lib/icons";
import { LoadingIndicator } from "./LoadingIndicator";

type Col<T> = {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
};

type Props<T> = {
  title: string;
  columns: Col<T>[];
  load: (q: string) => Promise<{ items: T[]; total: number }>;
  searchPlaceholder?: string;
  toolbarExtra?: ReactNode;
  /** Rendered above the list when content is ready (hidden while loading). */
  prepend?: ReactNode;
  /** When set, rows become clickable and navigate to the returned path. */
  rowHref?: (row: T) => string | null | undefined;
};

export function ResourceListPage<T extends Record<string, unknown>>({
  title,
  columns,
  load,
  searchPlaceholder = "Search…",
  toolbarExtra,
  prepend,
  rowHref,
}: Props<T>) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const res = await load(q);
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  function openRow(row: T) {
    const href = rowHref?.(row);
    if (href) navigate(href);
  }

  function onRowKey(e: KeyboardEvent<HTMLTableRowElement>, row: T) {
    if (!rowHref) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openRow(row);
    }
  }

  if (loading) {
    return <LoadingIndicator padded label={`Loading ${title}`} />;
  }

  return (
    <div>
      {prepend}
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          <p className="page-sub">{total} records</p>
        </div>
        {toolbarExtra}
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="card">
        <div className="panel-toolbar">
          <div className="toolbar" style={{ marginBottom: 0 }}>
            <input
              placeholder={searchPlaceholder}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void refresh()}
            />
            <button type="button" className="btn btn-secondary" onClick={() => void refresh()}>
              <Search size={14} />
              Search
            </button>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((row, idx) => {
                const href = rowHref?.(row) || null;
                return (
                  <tr
                    key={String(row.id ?? row.ec_coupon_id ?? row.notification_id ?? idx)}
                    className={href ? "is-clickable" : undefined}
                    tabIndex={href ? 0 : undefined}
                    role={href ? "link" : undefined}
                    onClick={href ? () => openRow(row) : undefined}
                    onKeyDown={href ? (e) => onRowKey(e, row) : undefined}
                  >
                    {columns.map((c) => (
                      <td key={c.key}>{c.render ? c.render(row) : String(row[c.key] ?? "-")}</td>
                    ))}
                  </tr>
                );
              })}
              {items.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="muted">
                    No records
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span>
            Showing {items.length} of {total}
          </span>
        </div>
      </div>
    </div>
  );
}
