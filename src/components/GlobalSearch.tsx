import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search } from "../lib/icons";
import { adminApi } from "../lib/api";
import { getUser, isStorePortal } from "../lib/auth";
import { searchableNavPages } from "../lib/nav";

export type SearchHit = {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  href: string;
  group: string;
};

type Props = {
  placeholder: string;
  branchId?: string;
};

function matchPages(term: string, pages: ReturnType<typeof searchableNavPages>): SearchHit[] {
  const needle = term.toLowerCase();
  return pages
    .filter((page) => {
      const hay = `${page.title} ${page.group} ${page.href}`.toLowerCase();
      return hay.includes(needle);
    })
    .slice(0, 6)
    .map((page) => ({
      id: `page:${page.href}:${page.title}`,
      title: page.title,
      subtitle: page.group,
      meta: "Page",
      href: page.href,
      group: "Pages",
    }));
}

export function GlobalSearch({ placeholder, branchId }: Props) {
  const user = getUser();
  const portal = isStorePortal(user) ? "store" : "admin";
  const pages = useMemo(
    () => searchableNavPages(user?.user_level ?? 0, portal),
    [user?.user_level, portal],
  );
  const navigate = useNavigate();
  const location = useLocation();
  const boxRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (location.pathname === "/search") {
      setQ(params.get("q") ?? "");
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    function onHotkey(e: globalThis.KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onHotkey);
    return () => window.removeEventListener("keydown", onHotkey);
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }

    const pageHits = matchPages(term, pages);
    setHits(pageHits);
    setActive(0);
    setLoading(true);
    const handle = window.setTimeout(() => {
      void adminApi
        .globalSearch({ q: term, limit: 5, store_id: branchId || undefined })
        .then((res) => {
          const records = res.groups.flatMap((group) =>
            group.items.map((item) => ({
              id: `${group.key}:${item.id}:${item.href}`,
              title: item.title,
              subtitle: item.subtitle,
              meta: item.meta || group.label,
              href: item.href,
              group: group.label,
            })),
          );
          setHits([...records, ...pageHits.filter((p) => !records.some((r) => r.href === p.href && r.title === p.title))]);
        })
        .catch(() => setHits(pageHits))
        .finally(() => setLoading(false));
    }, 220);

    return () => window.clearTimeout(handle);
  }, [q, branchId, pages]);

  const groups = useMemo(() => {
    const map = new Map<string, SearchHit[]>();
    for (const hit of hits) {
      const list = map.get(hit.group) ?? [];
      list.push(hit);
      map.set(hit.group, list);
    }
    return [...map.entries()];
  }, [hits]);

  function go(href: string) {
    setOpen(false);
    navigate(href);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    if (hits[active]) {
      go(hits[active].href);
      return;
    }
    go(`/search?q=${encodeURIComponent(term)}`);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || hits.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % hits.length);
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + hits.length) % hits.length);
    }
  }

  let cursor = -1;

  return (
    <form ref={boxRef} className="topbar-search" onSubmit={onSubmit} role="search">
      <Search size={14} aria-hidden />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={placeholder}
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
      />
      <kbd className="topbar-search-hint">Ctrl K</kbd>
      {open && q.trim().length >= 2 ? (
        <div className="global-search-panel" role="listbox">
          {loading && hits.length === 0 ? <p className="global-search-empty">Searching…</p> : null}
          {!loading && hits.length === 0 ? <p className="global-search-empty">No matches. Press Enter for full results.</p> : null}
          {groups.map(([label, items]) => (
            <section key={label} className="global-search-group">
              <header>{label}</header>
              {items.map((hit) => {
                cursor += 1;
                const index = cursor;
                return (
                  <button
                    key={hit.id}
                    type="button"
                    role="option"
                    aria-selected={index === active}
                    className={index === active ? "active" : undefined}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => go(hit.href)}
                  >
                    <span>
                      <strong>{hit.title}</strong>
                      <small>{hit.subtitle}</small>
                    </span>
                    <em>{hit.meta}</em>
                  </button>
                );
              })}
            </section>
          ))}
          <button type="submit" className="global-search-all">
            Search all for “{q.trim()}”
          </button>
        </div>
      ) : null}
    </form>
  );
}
