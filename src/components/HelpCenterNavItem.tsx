import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "../lib/icons";
import { NavLink, useLocation } from "react-router-dom";
import { adminApi } from "../lib/api";
import { navIconFor } from "../lib/enterpriseNav";
import { shortcutForLabel } from "../lib/navShortcuts";
import { ShortcutKbd } from "./ShortcutKbd";
import { leafExact, pathMatchesNav, type NavEntry, type NavLeaf } from "../lib/nav";

function leafOrChildActive(leaf: NavLeaf, pathname: string): boolean {
  if (pathMatchesNav(pathname, leaf.to, leafExact(leaf))) return true;
  return Boolean(leaf.children?.some((c) => pathMatchesNav(pathname, c.to) || leafOrChildActive(c, pathname)));
}

function HelpCenterLeaf({ leaf }: { leaf: NavLeaf }) {
  const location = useLocation();
  const hasKids = Boolean(leaf.children?.length);
  const nestedActive = hasKids && leaf.children!.some((c) => pathMatchesNav(location.pathname, c.to));
  const underParent =
    hasKids &&
    pathMatchesNav(location.pathname, leaf.to) &&
    !nestedActive &&
    location.pathname !== leaf.to;
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
          className={({ isActive }) => (isActive || underParent ? "active" : undefined)}
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
          {leaf.children!.map((c) => (
            <NavLink key={`${c.label}:${c.to}`} to={c.to} end>
              {c.label}
            </NavLink>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function HelpCenterNavGroup({ entry }: { entry: Extract<NavEntry, { kind: "group" }> }) {
  const location = useLocation();
  const childActive = entry.children.some((c) => leafOrChildActive(c, location.pathname));
  const [open, setOpen] = useState(childActive);
  const [unread, setUnread] = useState(0);
  const Icon = navIconFor(entry.label);
  const shortcut = shortcutForLabel(entry.label);

  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const stats = await adminApi.supportStats();
        if (alive) setUnread(stats.unread ?? 0);
      } catch {
        if (alive) setUnread(0);
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 30000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className={`nav-group ${open ? "open" : ""}`}>
      <button
        type="button"
        className="nav-group-toggle"
        title={shortcut ? shortcut.hint : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <span>
          <Icon className="nav-icon" strokeWidth={1.75} />
          {entry.label}
          {unread > 0 ? <span className="nav-unread-badge">{unread > 99 ? "99+" : unread}</span> : null}
        </span>
        <span className="nav-group-end">
          {shortcut ? <ShortcutKbd hint={shortcut.hint} /> : null}
          {open ? <ChevronDown size={14} className="chev" /> : <ChevronRight size={14} className="chev" />}
        </span>
      </button>
      {open ? (
        <div className="nav-sub">
          {entry.children.map((c) => (
            <HelpCenterLeaf key={`${c.label}:${c.to}`} leaf={c} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
