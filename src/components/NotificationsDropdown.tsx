import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Bell, Megaphone, Package, Users } from "../lib/icons";
import { adminApi } from "../lib/api";
import {
  getLastAlertedNotificationId,
  getLastSeenNotificationId,
  markNotificationsAlerted,
  markNotificationsSeen,
  notificationHref,
  NOTIFICATIONS_SEEN_EVENT,
  type AdminNotificationLink,
} from "../lib/notificationLinks";
import { alertNewNotification } from "../lib/personalize";
import { LoadingIndicator } from "./LoadingIndicator";

export type AdminNotification = AdminNotificationLink & {
  notification_id: number;
  notification_title: string | null;
  notification_type: string;
  notification_msg: string;
  notification_created_at: string;
};

type PanelPos = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

type Props = {
  label: string;
  viewAllLabel?: string;
};

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function typeLabel(type: string): string {
  const t = type.trim().toLowerCase();
  if (!t || t === "all") return "Broadcast";
  if (t === "admin") return "Admin";
  return type;
}

function TypeIcon({ type }: { type: string }) {
  const t = type.trim().toLowerCase();
  if (t.includes("order")) return <Package size={14} />;
  if (t.includes("user") || t.includes("customer")) return <Users size={14} />;
  return <Megaphone size={14} />;
}

export function NotificationsDropdown({ label, viewAllLabel = "View all notifications" }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const primedRef = useRef(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<PanelPos | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminApi.notifications({ per_page: 8, page: 1 });
      const rows = (res.items ?? []) as AdminNotification[];
      setItems(rows);
      setTotal(res.total ?? rows.length);
      const lastSeen = getLastSeenNotificationId();
      setUnread(rows.filter((n) => n.notification_id > lastSeen).length);

      const lastAlerted = getLastAlertedNotificationId();
      const fresh = rows
        .filter((n) => n.notification_id > lastAlerted)
        .sort((a, b) => a.notification_id - b.notification_id);
      if (primedRef.current && fresh.length) {
        const newest = fresh[fresh.length - 1];
        alertNewNotification(newest);
        markNotificationsAlerted(newest.notification_id);
      } else if (rows.length) {
        markNotificationsAlerted(Math.max(...rows.map((n) => n.notification_id)));
      }
      primedRef.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 60000);
    function onSeen() {
      setUnread(0);
      void load();
    }
    window.addEventListener(NOTIFICATIONS_SEEN_EVENT, onSeen);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(NOTIFICATIONS_SEEN_EVENT, onSeen);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  function updatePanelPos() {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const margin = 8;
    const width = Math.min(380, window.innerWidth - margin * 2);
    const left = Math.max(margin, Math.min(rect.right - width, window.innerWidth - width - margin));
    const preferredHeight = 420;
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(preferredHeight, openUp ? spaceAbove : spaceBelow);
    const top = openUp ? rect.top - maxHeight - 6 : rect.bottom + 6;
    setPanelPos({
      top: Math.max(margin, top),
      left,
      width,
      maxHeight: Math.max(160, maxHeight),
    });
  }

  useLayoutEffect(() => {
    if (!open) {
      setPanelPos(null);
      return;
    }
    updatePanelPos();
    window.addEventListener("resize", updatePanelPos);
    window.addEventListener("scroll", updatePanelPos, true);
    return () => {
      window.removeEventListener("resize", updatePanelPos);
      window.removeEventListener("scroll", updatePanelPos, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggleOpen() {
    setOpen((prev) => {
      const next = !prev;
      if (!next && items.length) {
        markNotificationsSeen(Math.max(...items.map((n) => n.notification_id)));
        setUnread(0);
      }
      return next;
    });
  }

  function closeAndMarkSeen() {
    if (items.length) {
      markNotificationsSeen(Math.max(...items.map((n) => n.notification_id)));
      setUnread(0);
    }
    setOpen(false);
  }

  const badge = unread > 0 ? (unread > 99 ? "99+" : String(unread)) : null;

  return (
    <div className="notif-dropdown" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`icon-btn notif-trigger${open ? " is-open" : ""}${unread > 0 ? " has-pending" : ""}`}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={toggleOpen}
      >
        <Bell size={15} className="notif-bell-icon" aria-hidden />
        {badge ? (
          <span className="notif-badge" aria-hidden>
            {badge}
          </span>
        ) : null}
      </button>

      {open && panelPos
        ? createPortal(
            <div
              ref={panelRef}
              className="notif-panel"
              role="dialog"
              aria-label={label}
              style={{
                top: panelPos.top,
                left: panelPos.left,
                width: panelPos.width,
                maxHeight: panelPos.maxHeight,
              }}
            >
              <div className="notif-panel-head">
                <strong>Push notifications</strong>
                {total ? <span className="muted">{total} total</span> : null}
              </div>

              <div className="notif-panel-body">
                {loading && !items.length ? <LoadingIndicator className="notif-empty" size="sm" label="Loading" /> : null}
                {error ? <p className="error notif-empty">{error}</p> : null}
                {!loading && !error && !items.length ? (
                  <p className="muted notif-empty">No notifications yet.</p>
                ) : null}
                {items.map((n) => {
                  const isNew = n.notification_id > getLastSeenNotificationId();
                  const href = notificationHref(n);
                  return (
                    <Link
                      key={n.notification_id}
                      to={href}
                      className={`notif-item${isNew ? " is-new" : ""}`}
                      onClick={closeAndMarkSeen}
                    >
                      <div className="notif-item-icon" aria-hidden>
                        <TypeIcon type={n.notification_type} />
                      </div>
                      <div className="notif-item-body">
                        <div className="notif-item-head">
                          <h4>{n.notification_title?.trim() || "Notification"}</h4>
                          <time dateTime={n.notification_created_at}>{formatWhen(n.notification_created_at)}</time>
                        </div>
                        <p>{n.notification_msg}</p>
                        <span className="notif-type-pill">{typeLabel(n.notification_type)}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>

              <div className="notif-panel-foot">
                <Link to="/notifications" className="btn btn-secondary notif-view-all" onClick={closeAndMarkSeen}>
                  {viewAllLabel}
                </Link>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
