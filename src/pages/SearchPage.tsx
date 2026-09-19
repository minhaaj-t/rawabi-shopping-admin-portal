import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { adminApi } from "../lib/api";
import { getAdminBranchId } from "../lib/adminBranch";
import { getUser, isStorePortal } from "../lib/auth";
import { searchableNavPages } from "../lib/nav";

export function SearchPage() {
  const [params] = useSearchParams();
  const q = (params.get("q") ?? "").trim();
  const user = getUser();
  const portal = isStorePortal(user) ? "store" : "admin";
  const branchId = getAdminBranchId();
  const pages = useMemo(
    () => searchableNavPages(user?.user_level ?? 0, portal),
    [user?.user_level, portal],
  );
  const pageHits = useMemo(() => {
    if (q.length < 2) return [];
    const needle = q.toLowerCase();
    return pages.filter((page) => `${page.title} ${page.group} ${page.href}`.toLowerCase().includes(needle));
  }, [pages, q]);
  const [groups, setGroups] = useState<Awaited<ReturnType<typeof adminApi.globalSearch>>["groups"]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (q.length < 2) {
      setGroups([]);
      return;
    }
    setLoading(true);
    setError("");
    void adminApi
      .globalSearch({ q, limit: 20, store_id: branchId || undefined })
      .then((res) => setGroups(res.groups))
      .catch((e: Error) => setError(e.message || "Search failed"))
      .finally(() => setLoading(false));
  }, [q, branchId]);

  return (
    <div className="page search-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Search</h1>
          <p className="muted">{q ? `Results for “${q}”` : "Type at least 2 characters in the top bar."}</p>
        </div>
      </div>
      {error ? <div className="alert alert-error">{error}</div> : null}
      {loading ? <p className="muted">Searching products, orders, customers, and more…</p> : null}
      {!loading && q.length >= 2 && groups.length === 0 && pageHits.length === 0 ? (
        <p className="muted">No records matched this search.</p>
      ) : null}

      {pageHits.length > 0 ? (
        <section className="card search-result-card">
          <header className="search-result-head">
            <h2>Pages</h2>
            <span className="muted">{pageHits.length}</span>
          </header>
          <ul className="search-result-list">
            {pageHits.map((page) => (
              <li key={`${page.href}:${page.title}`}>
                <Link to={page.href}>
                  <strong>{page.title}</strong>
                  <span>{page.group}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {groups.map((group) => (
        <section key={group.key} className="card search-result-card">
          <header className="search-result-head">
            <h2>{group.label}</h2>
            <Link to={group.href} className="muted">
              View all ({group.total})
            </Link>
          </header>
          <ul className="search-result-list">
            {group.items.map((item) => (
              <li key={`${group.key}:${item.id}`}>
                <Link to={item.href}>
                  <strong>{item.title}</strong>
                  <span>
                    {item.subtitle}
                    {item.meta ? ` · ${item.meta}` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
