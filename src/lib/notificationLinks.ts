export type AdminNotificationLink = {
  notification_id?: number;
  notification_title?: string | null;
  notification_type?: string | null;
  notification_msg?: string | null;
  n_message_type?: string | null;
  n_link_id?: number | null;
  notification_user?: number | null;
};

const LAST_SEEN_KEY = "rawabi_admin_notif_seen";
const LAST_ALERTED_KEY = "rawabi_admin_notif_alerted";
export const NOTIFICATIONS_SEEN_EVENT = "rawabi:notifications-seen";

export function getLastSeenNotificationId(): number {
  return Number(localStorage.getItem(LAST_SEEN_KEY) || 0);
}

export function markNotificationsSeen(maxId: number) {
  if (!Number.isFinite(maxId) || maxId <= 0) return;
  if (maxId > getLastSeenNotificationId()) {
    localStorage.setItem(LAST_SEEN_KEY, String(maxId));
  }
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_SEEN_EVENT, { detail: { maxId } }));
}

export function getLastAlertedNotificationId(): number {
  return Number(sessionStorage.getItem(LAST_ALERTED_KEY) || localStorage.getItem(LAST_SEEN_KEY) || 0);
}

export function markNotificationsAlerted(maxId: number) {
  if (!Number.isFinite(maxId) || maxId <= 0) return;
  if (maxId > getLastAlertedNotificationId()) {
    sessionStorage.setItem(LAST_ALERTED_KEY, String(maxId));
  }
}

/** Resolve the admin page for a notification row. */
export function notificationHref(n: AdminNotificationLink): string {
  const type = String(n.notification_type ?? "").trim().toLowerCase();
  const msgType = String(n.n_message_type ?? "").trim().toLowerCase();
  const linkId = Number(n.n_link_id ?? 0);
  const userId = Number(n.notification_user ?? 0);
  const title = String(n.notification_title ?? "").trim().toLowerCase();

  if (type.includes("support") || title.includes("support") || msgType === "thread") {
    if (linkId > 0) return `/support/chats/${linkId}`;
    return "/support/chats";
  }
  if (type.includes("order") || msgType === "order") {
    if (linkId > 0) return `/orders/${linkId}`;
    return "/orders";
  }
  if (type.includes("cart")) {
    if (userId > 0) return `/carts/${userId}`;
    if (linkId > 0) return `/carts/${linkId}`;
    return "/carts";
  }
  if (type.includes("customer") || type.includes("user")) {
    if (userId > 0) return `/customers/${userId}`;
    if (linkId > 0) return `/customers/${linkId}`;
    return "/customers";
  }
  if (type.includes("tech") || type.includes("ticket")) {
    return "/tech-support";
  }

  return "/notifications";
}
