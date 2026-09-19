import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { Search } from "../lib/icons";
import { PRODUCT_UNITS, SELL_MODES, type SellMode } from "../lib/productUnits";

export function UnitsPage() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"all" | SellMode>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PRODUCT_UNITS.filter((u) => {
      if (mode !== "all" && u.sellMode !== mode) return false;
      if (!q) return true;
      return [u.code, u.label, u.hint, u.group, u.sellMode].some((v) => v.toLowerCase().includes(q));
    });
  }, [query, mode]);

  return (
    <div className="page units-page">
      <header className="page-head">
        <div>
          <p className="settings-crumb">Catalog · Units</p>
          <h1 className="page-title">Units of measure</h1>
          <p className="page-sub">
            Grocery rule: <strong>one barcode = one sell method</strong>. Piece, by weight, or case/bundle. Different pack
            prices (500ml vs 1L) are <strong>separate products</strong> linked as{" "}
            <em>Connected options</em> on the product form. Use{" "}
            <Link to="/variants">Variants</Link> only for optional same-SKU pack labels.
          </p>
        </div>
        <div className="page-head-actions">
          <Link className="btn btn-secondary" to="/products">
            Product list
          </Link>
          <Link className="btn btn-primary" to="/products/new">
            Add product
          </Link>
        </div>
      </header>

      <div className="card-grid units-mode-cards">
        {SELL_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`card units-mode-card${mode === m.id ? " active" : ""}`}
            onClick={() => setMode(m.id)}
          >
            <h3>{m.title}</h3>
            <p>{m.blurb}</p>
            <span className="muted">{m.example}</span>
          </button>
        ))}
      </div>

      <div className="card units-card">
        <div className="panel-toolbar brand-toolbar">
          <div className="brand-search-wrap">
            <Search size={14} aria-hidden />
            <input
              className="brand-search"
              value={query}
              placeholder="Search code or name…"
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="brand-status-tabs" role="tablist">
            {(
              [
                ["all", "All"],
                ["piece", "Piece"],
                ["weight", "Weight"],
                ["case", "Case"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`brand-status-tab${mode === value ? " active" : ""}`}
                onClick={() => setMode(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <p className="muted brand-hint">
          {PRODUCT_UNITS.length} units · {filtered.length} shown · stored on product as <code>uom</code> · cart line = price
          × qty
        </p>

        <div className="table-wrap">
          <table className="data brand-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Code</th>
                <th style={{ width: 140 }}>Name</th>
                <th style={{ width: 100 }}>Sell mode</th>
                <th>Use</th>
                <th style={{ width: 120 }}>Cart qty</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.code}>
                  <td>
                    <code className="sku-code">{u.code}</code>
                  </td>
                  <td>
                    <strong>{u.label}</strong>
                  </td>
                  <td>
                    <span className="units-group-pill">{u.sellMode}</span>
                  </td>
                  <td className="muted wrap">{u.hint}</td>
                  <td>{u.weighted ? <span className="status-pill is-on">Decimal</span> : "Whole numbers"}</td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td colSpan={5} className="muted">
                    No units match your search
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card units-example-card">
        <h3>Worked examples</h3>
        <ul className="units-example-list">
          <li>
            <strong>Piece:</strong> Milk 1L · UOM <code>PCS</code> or <code>L</code> · qty 2 → 2 × unit price
          </li>
          <li>
            <strong>Weight:</strong> Banana · UOM <code>KG</code> · sold by weight · qty 1.37 → 1.37 × price/kg
          </li>
          <li>
            <strong>Case:</strong> Water 24-pack · UOM <code>BOX</code> · qty 3 → 3 cases (not 72 bottles)
          </li>
          <li>
            <strong>Wrong:</strong> Putting 500ml + 1L as pack labels on one SKU — create two products and link them under Connected options
          </li>
        </ul>
      </div>
    </div>
  );
}
