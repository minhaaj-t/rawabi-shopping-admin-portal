import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ChevronDown, ChevronRight, Plus } from "../lib/icons";
import { adminApi } from "../lib/api";
import { canManageStaff, getUser, isStorePortal } from "../lib/auth";
import { navIconFor } from "../lib/enterpriseNav";
import { shortcutForLabel } from "../lib/navShortcuts";
import { ShortcutKbd } from "./ShortcutKbd";

type DashNavItem = {
  id: number;
  title: string;
  slug: string;
  is_default: boolean;
};

function dashboardPath(id: number, isOnly: boolean): string {
  return isOnly ? "/" : `/dashboard/${id}`;
}

function isDashboardRoute(pathname: string): boolean {
  return pathname === "/" || /^\/dashboard\/\d+$/.test(pathname);
}

export function DashboardNavItem({ label }: { label: string }) {
  const location = useLocation();
  const user = getUser();
  const canBuild = canManageStaff(user) && !isStorePortal(user);
  const Icon = navIconFor(label);
  const shortcut = shortcutForLabel(label);
  const [items, setItems] = useState<DashNavItem[]>([]);
  const [resolvedId, setResolvedId] = useState<number | null>(null);

  useEffect(() => {
    void Promise.all([adminApi.dashboardLayoutsAccessible(), adminApi.dashboardLayoutResolved()])
      .then(([list, resolved]) => {
        setItems(list);
        const rawId = resolved?.id;
        setResolvedId(rawId != null && rawId !== "" ? Number(rawId) : null);
      })
      .catch(() => {
        setItems([]);
        setResolvedId(null);
      });
  }, []);

  const multiple = items.length > 1;
  const sectionActive = isDashboardRoute(location.pathname);
  const onResolvedHome = location.pathname === "/";
  const [open, setOpen] = useState(sectionActive);

  useEffect(() => {
    if (sectionActive) setOpen(true);
  }, [sectionActive]);

  const primaryTo = multiple
    ? "/"
    : items[0]
      ? dashboardPath(items[0].id, true)
      : "/";

  if (!multiple) {
    return (
      <div className="nav-link-with-action">
        <NavLink to={primaryTo} end title={shortcut ? shortcut.hint : undefined}>
          <Icon className="nav-icon" strokeWidth={1.75} />
          <span className="nav-link-label">{label}</span>
          {shortcut ? <ShortcutKbd hint={shortcut.hint} /> : null}
        </NavLink>
        {canBuild ? (
          <Link
            to="/dashboards"
            className="nav-plus-btn"
            title="Dashboard builder"
            aria-label="Open dashboard builder"
          >
            <Plus size={14} strokeWidth={2.25} />
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`nav-dashboard-leaf${open ? " open" : ""}`}>
      <div className="nav-leaf-row nav-dashboard-row">
        <NavLink
          to={primaryTo}
          end={!multiple}
          className={sectionActive ? "active" : undefined}
          title={shortcut ? shortcut.hint : undefined}
        >
          <Icon className="nav-icon" strokeWidth={1.75} />
          <span className="nav-link-label">{label}</span>
          {shortcut ? <ShortcutKbd hint={shortcut.hint} /> : null}
        </NavLink>
        <button
          type="button"
          className="nav-nest-toggle"
          aria-label={open ? "Collapse dashboards" : "Expand dashboards"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        {canBuild ? (
          <Link
            to="/dashboards"
            className="nav-plus-btn"
            title="Dashboard builder"
            aria-label="Open dashboard builder"
          >
            <Plus size={14} strokeWidth={2.25} />
          </Link>
        ) : null}
      </div>
      {open ? (
        <div className="nav-sub-sub">
          <NavLink to="/" end className={onResolvedHome ? "active" : undefined}>
            My dashboard
          </NavLink>
          {items.map((d) => (
            <NavLink
              key={d.id}
              to={`/dashboard/${d.id}`}
              end
              className={location.pathname === `/dashboard/${d.id}` ? "active" : undefined}
            >
              {d.title}
              {d.is_default ? <span className="nav-dash-tag">Default</span> : null}
              {resolvedId === d.id && !d.is_default ? <span className="nav-dash-tag">Assigned</span> : null}
            </NavLink>
          ))}
        </div>
      ) : null}
    </div>
  );
}
