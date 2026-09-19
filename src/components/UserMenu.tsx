import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, Inbox, Keyboard, Languages, LogOut, User } from "../lib/icons";
import type { Locale } from "../lib/i18n";

type Props = {
  name: string;
  role: string;
  initials: string;
  avatarUrl: string | null;
  locale: Locale;
  labels: {
    profile: string;
    language: string;
    shortcuts: string;
    doc: string;
    logout: string;
    menu: string;
  };
  onLocaleChange: (locale: Locale) => void;
  onShortcuts: () => void;
  onLogout: () => void;
};

export function UserMenu({
  name,
  role,
  initials,
  avatarUrl,
  locale,
  labels,
  onLocaleChange,
  onShortcuts,
  onLogout,
}: Props) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  function place() {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(240, window.innerWidth - 16);
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    setPos({ top: rect.bottom + 6, left, width });
  }

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`user-pill${open || location.pathname === "/profile" ? " active" : ""}`}
        aria-label={labels.menu}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="meta">
          <strong>{name}</strong>
          <span>{role}</span>
        </div>
        <div className="user-avatar">
          {avatarUrl ? <img src={avatarUrl} alt="" className="user-avatar-img" /> : initials}
        </div>
        <ChevronDown size={12} className="user-pill-chev" aria-hidden />
      </button>

      {open && pos
        ? createPortal(
            <div
              ref={panelRef}
              className="user-menu-panel"
              role="menu"
              aria-label={labels.menu}
              style={{ top: pos.top, left: pos.left, width: pos.width }}
            >
              <Link to="/profile" className="user-menu-item" role="menuitem" onClick={() => setOpen(false)}>
                <User size={15} aria-hidden />
                {labels.profile}
              </Link>
              <div className="user-menu-item user-menu-lang" role="none">
                <Languages size={15} aria-hidden />
                <span>{labels.language}</span>
                <div className="user-menu-lang-switch" role="group" aria-label={labels.language}>
                  <button
                    type="button"
                    className={locale === "en" ? "active" : undefined}
                    onClick={() => onLocaleChange("en")}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    className={locale === "ar" ? "active" : undefined}
                    onClick={() => onLocaleChange("ar")}
                  >
                    AR
                  </button>
                </div>
              </div>
              <button
                type="button"
                className="user-menu-item"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onShortcuts();
                }}
              >
                <Keyboard size={15} aria-hidden />
                {labels.shortcuts}
              </button>
              <Link to="/docs" className="user-menu-item" role="menuitem" onClick={() => setOpen(false)}>
                <Inbox size={15} aria-hidden />
                {labels.doc}
              </Link>
              <button type="button" className="user-menu-item is-danger" role="menuitem" onClick={onLogout}>
                <LogOut size={15} aria-hidden />
                {labels.logout}
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
