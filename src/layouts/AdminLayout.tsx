import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LoadingCard } from "../components/LoadingIndicator";
import {
  ChevronDown,
  ChevronRight,
  LifeBuoy,
  Menu,
} from "../lib/icons";
import { DashboardNavItem } from "../components/DashboardNavItem";
import { GlobalSearch } from "../components/GlobalSearch";
import { HelpCenterNavGroup } from "../components/HelpCenterNavItem";
import { ShortcutKbd } from "../components/ShortcutKbd";
import { NotificationsDropdown } from "../components/NotificationsDropdown";
import { UserMenu } from "../components/UserMenu";
import { clearSession, getToken, getUser, isStorePortal, setSession } from "../lib/auth";
import { roleLabel } from "../lib/roles";
import { navTreeForUser, pathMatchesNav, leafExact, type NavEntry, type NavLeaf } from "../lib/nav";
import { isTypingTarget, matchActionShortcut, matchNavShortcut, shortcutForLabel } from "../lib/navShortcuts";
import { navIconFor } from "../lib/enterpriseNav";
import {
  applyDocumentLocale,
  getStoredLocale,
  setStoredLocale,
  t,
  type Locale,
} from "../lib/i18n";
import { adminApi } from "../lib/api";
import { getAdminBranchId, setAdminBranchId, useAdminBranchId } from "../lib/adminBranch";
import { prefetchRoute, prefetchShellRoutes } from "../lib/routePrefetch";
import "../styles/admin-theme.css";

const TechSupportDialog = lazy(() =>
  import("../components/TechSupportDialog").then((m) => ({ default: m.TechSupportDialog })),
);
const ShortcutsDialog = lazy(() =>
  import("../components/ShortcutsDialog").then((m) => ({ default: m.ShortcutsDialog })),
);

function leafOrChildActive(leaf: NavLeaf, pathname: string, search = ""): boolean {
  if (pathMatchesNav(pathname, leaf.to, leafExact(leaf), search)) return true;
  return Boolean(leaf.children?.some((c) => pathMatchesNav(pathname, c.to, Boolean(c.exact), search)));
}

function NavLeafBlock({ leaf }: { leaf: NavLeaf }) {
  const location = useLocation();
  const hasKids = Boolean(leaf.children?.length);
  const nestedActive =
    hasKids &&
    leaf.children!.some((c) => pathMatchesNav(location.pathname, c.to, Boolean(c.exact), location.search));
  const underParent =
    hasKids &&
    pathMatchesNav(location.pathname, leaf.to, false, location.search) &&
    !nestedActive &&
    location.pathname !== leaf.to.split("?")[0];
  const [open, setOpen] = useState(nestedActive || underParent);

  useEffect(() => {
    if (nestedActive || underParent) setOpen(true);
  }, [nestedActive, underParent]);

  return (
    <div className={`nav-leaf${hasKids ? " has-kids" : ""}${open ? " open" : ""}`}>
      <div className="nav-leaf-row">
        <NavLink
          to={leaf.to}
          end={leafExact(leaf)}
          className={({ isActive }) =>
            [
              isActive || underParent || nestedActive ? "active" : "",
              leaf.label === "Styling" ? "nav-styling-link" : "",
            ]
              .filter(Boolean)
              .join(" ") || undefined
          }
          onMouseEnter={() => prefetchRoute(leaf.to)}
          onFocus={() => prefetchRoute(leaf.to)}
        >
          {leaf.label}
        </NavLink>
        {hasKids ? (
          <button
            type="button"
            className="nav-nest-toggle"
            aria-label={open ? "Collapse" : "Expand"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        ) : null}
      </div>
      {hasKids && open ? (
        <div className="nav-sub-sub">
          {leaf.children!.map((c) => {
            const query = c.to.includes("?") ? c.to.split("?")[1] : "";
            const childActive = pathMatchesNav(location.pathname, c.to, true, location.search);
            return (
              <NavLink
                key={`${c.to}::${c.label}`}
                to={c.to}
                end={!query}
                className={() => (childActive ? "active" : undefined)}
                onMouseEnter={() => prefetchRoute(c.to)}
                onFocus={() => prefetchRoute(c.to)}
              >
                {c.label}
              </NavLink>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function NavGroupBlock({ entry }: { entry: Extract<NavEntry, { kind: "group" }> }) {
  const location = useLocation();
  const childActive = entry.children.some((c) => leafOrChildActive(c, location.pathname, location.search));
  const [open, setOpen] = useState(childActive);
  const Icon = navIconFor(entry.label);
  const shortcut = shortcutForLabel(entry.label);

  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  return (
    <div
      className={`nav-group ${open ? "open" : ""}`}
      data-nav-group={entry.label.toLowerCase().replace(/\s+/g, "-")}
    >
      <button
        type="button"
        className="nav-group-toggle"
        title={shortcut ? shortcut.hint : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <span>
          <Icon className="nav-icon" strokeWidth={1.75} />
          {entry.label}
        </span>
        <span className="nav-group-end">
          {shortcut ? <ShortcutKbd hint={shortcut.hint} /> : null}
          {open ? <ChevronDown size={14} className="chev" /> : <ChevronRight size={14} className="chev" />}
        </span>
      </button>
      {open ? (
        <div className="nav-sub">
          {entry.children.map((c) => (
            <NavLeafBlock key={`${c.to}::${c.label}`} leaf={c} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AdminLayout() {
  const user = getUser();
  const navigate = useNavigate();
  const location = useLocation();
  const portal = isStorePortal(user) ? "store" : "admin";
  const items = useMemo(
    () => navTreeForUser(user?.user_level ?? 0, portal),
    [user?.user_level, portal],
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [locale, setLocale] = useState<Locale>(() => getStoredLocale());
  const [stores, setStores] = useState<Array<{ ec_store_id: number; ec_store_name: string }>>([]);
  const [branchId, setBranchIdState] = useState(() => getAdminBranchId());
  const liveBranchId = useAdminBranchId();
  useEffect(() => {
    setBranchIdState(liveBranchId);
  }, [liveBranchId]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => getUser()?.avatar_url ?? null);
  const [techSupportOpen, setTechSupportOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => {
    applyDocumentLocale(locale);
  }, [locale]);

  useEffect(() => {
    adminApi
      .stores()
      .then((list) => setStores(list))
      .catch(() => undefined);
    prefetchShellRoutes();
  }, []);

  const meFetched = useRef(false);
  useEffect(() => {
    if (meFetched.current) return;
    meFetched.current = true;
    adminApi
      .me()
      .then((profile) => {
        setAvatarUrl(profile.avatar_url ?? null);
        const current = getUser();
        if (current) {
          setSession(getToken() ?? "", {
            ...current,
            username: profile.username,
            email: profile.email,
            avatar_url: profile.avatar_url ?? null,
          });
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function onHotkey(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        setShortcutsOpen((open) => !open);
        return;
      }
      if (e.key === "Escape") {
        setShortcutsOpen(false);
      }
      const action = matchActionShortcut(e);
      if (action) {
        const allowed = !action.navGroup || items.some((entry) => entry.label === action.navGroup);
        if (!allowed) return;
        e.preventDefault();
        setShortcutsOpen(false);
        navigate(action.href);
        return;
      }
      const hit = matchNavShortcut(e);
      if (!hit) return;
      const allowed = items.some((entry) => entry.label === hit.label);
      if (!allowed) return;
      e.preventDefault();
      setShortcutsOpen(false);
      navigate(hit.href);
    }
    window.addEventListener("keydown", onHotkey);
    return () => window.removeEventListener("keydown", onHotkey);
  }, [items, navigate]);

  const initials = (user?.username ?? "RA")
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function logout() {
    void adminApi.logout().finally(() => {
      clearSession();
      navigate("/login");
    });
  }

  function onLocaleChange(next: Locale) {
    setLocale(next);
    setStoredLocale(next);
  }

  function onBranchChange(id: string) {
    setBranchIdState(id);
    setAdminBranchId(id);
  }

  const roleName = portal === "store" ? "Store Portal" : roleLabel(user?.user_level ?? 0);

  return (
    <div className={`admin-shell ${mobileOpen ? "nav-open" : ""}`}>
      <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} aria-hidden />
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <img src="/assets/logo.svg" alt="Rawabi Shopping" />
          <div className="admin-brand-text">
            <strong>{portal === "store" ? t(locale, "storePortal") : t(locale, "adminPortal")}</strong>
            <small>Rawabi Shopping</small>
          </div>
        </div>
        <nav className="admin-nav">
          {items.map((entry) => {
            if (entry.kind === "link") {
              const Icon = navIconFor(entry.label);
              const isDashboard = entry.to === "/";
              if (isDashboard) {
                return <DashboardNavItem key={entry.to} label={entry.label} />;
              }
              const shortcut = shortcutForLabel(entry.label);
              return (
                <NavLink
                  key={entry.to}
                  to={entry.to}
                  end={entry.to === "/"}
                  title={shortcut ? shortcut.hint : undefined}
                  onMouseEnter={() => prefetchRoute(entry.to)}
                  onFocus={() => prefetchRoute(entry.to)}
                >
                  <Icon className="nav-icon" strokeWidth={1.75} />
                  <span className="nav-link-label">{entry.label}</span>
                  {shortcut ? <ShortcutKbd hint={shortcut.hint} /> : null}
                </NavLink>
              );
            }
            if (entry.label === "Help center") {
              return <HelpCenterNavGroup key={entry.label} entry={entry} />;
            }
            return <NavGroupBlock key={entry.label} entry={entry} />;
          })}
        </nav>
        <div className="admin-sidebar-foot">
          <button type="button" className="admin-tech-support-btn" onClick={() => setTechSupportOpen(true)}>
            <LifeBuoy size={16} aria-hidden />
            <span>Technical support</span>
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              type="button"
              className="icon-btn mobile-only"
              aria-label="Menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={16} />
            </button>
            <GlobalSearch placeholder={t(locale, "searchPlaceholder")} branchId={branchId} />
          </div>
          <div className="admin-topbar-right">
            <select
              className="topbar-select topbar-select-branch"
              value={branchId}
              onChange={(e) => onBranchChange(e.target.value)}
              aria-label={t(locale, "branch")}
            >
              <option value="">{t(locale, "allBranches")}</option>
              {stores.map((s) => (
                <option key={s.ec_store_id} value={s.ec_store_id}>
                  {s.ec_store_name}
                </option>
              ))}
            </select>
            <NotificationsDropdown label={t(locale, "notifications")} viewAllLabel={t(locale, "viewAllNotifications")} />
            <UserMenu
              name={user?.username ?? "Admin"}
              role={roleName}
              initials={initials}
              avatarUrl={avatarUrl}
              locale={locale}
              labels={{
                profile: t(locale, "profile"),
                language: t(locale, "language"),
                shortcuts: t(locale, "shortcuts"),
                doc: t(locale, "doc"),
                logout: t(locale, "logout"),
                menu: t(locale, "accountMenu"),
              }}
              onLocaleChange={onLocaleChange}
              onShortcuts={() => setShortcutsOpen(true)}
              onLogout={logout}
            />
          </div>
        </header>
        <main className="admin-content" key={branchId || "all-branches"}>
          <Suspense fallback={<LoadingCard label="Loading page" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {techSupportOpen ? (
        <Suspense fallback={null}>
          <TechSupportDialog open={techSupportOpen} onClose={() => setTechSupportOpen(false)} />
        </Suspense>
      ) : null}
      {shortcutsOpen ? (
        <Suspense fallback={null}>
          <ShortcutsDialog
            open={shortcutsOpen}
            onClose={() => setShortcutsOpen(false)}
            visibleLabels={items.map((entry) => entry.label)}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
