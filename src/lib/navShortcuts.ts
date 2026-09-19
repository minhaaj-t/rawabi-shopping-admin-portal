export type NavShortcut = {
  label: string;
  key: string;
  href: string;
  hint: string;
  shift?: boolean;
  /** Sidebar group/link that must be visible for this action. */
  navGroup?: string;
};

/** Top-level modules — Alt + letter, same two-key feel as Ctrl K. */
export const NAV_SHORTCUTS: NavShortcut[] = [
  { label: "Dashboard", key: "d", href: "/", hint: "Alt D" },
  { label: "Help center", key: "h", href: "/support/chats", hint: "Alt H" },
  { label: "Products", key: "p", href: "/products", hint: "Alt P" },
  { label: "Categories", key: "g", href: "/categories", hint: "Alt G" },
  { label: "Orders", key: "o", href: "/orders", hint: "Alt O" },
  { label: "Customers", key: "c", href: "/customers", hint: "Alt C" },
  { label: "Settings", key: "s", href: "/settings", hint: "Alt S" },
];

export const GLOBAL_SHORTCUTS: NavShortcut[] = [
  { label: "Search", key: "k", href: "", hint: "Ctrl K" },
  { label: "Shortcut list", key: "/", href: "", hint: "Ctrl /" },
];

/** Create / add actions — Alt + Shift + letter. */
export const ACTION_SHORTCUTS: NavShortcut[] = [
  { label: "Add product", key: "p", href: "/products/new", hint: "Alt Shift P", shift: true, navGroup: "Products" },
  { label: "Add employee", key: "u", href: "/staff?add=1", hint: "Alt Shift U", shift: true, navGroup: "Users & Roles" },
  { label: "Add news / blog", key: "n", href: "/news?add=1", hint: "Alt Shift N", shift: true, navGroup: "Content" },
  { label: "Add category", key: "g", href: "/categories?add=1", hint: "Alt Shift G", shift: true, navGroup: "Categories" },
  { label: "Add coupon", key: "c", href: "/coupons?add=1", hint: "Alt Shift C", shift: true, navGroup: "Promotions" },
  { label: "Add banner", key: "b", href: "/banners?add=1", hint: "Alt Shift B", shift: true, navGroup: "Promotions" },
  { label: "Add job", key: "j", href: "/jobs/openings?add=1", hint: "Alt Shift J", shift: true, navGroup: "Jobs" },
  { label: "Add store", key: "s", href: "/stores?add=1", hint: "Alt Shift S", shift: true, navGroup: "Branches" },
  { label: "Add brand", key: "r", href: "/brands?add=1", hint: "Alt Shift R", shift: true, navGroup: "Products" },
];

export function shortcutForLabel(label: string): NavShortcut | undefined {
  return NAV_SHORTCUTS.find((item) => item.label.toLowerCase() === label.toLowerCase());
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return Boolean(target.closest("[contenteditable='true']"));
}

export function matchNavShortcut(e: KeyboardEvent): NavShortcut | undefined {
  if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.repeat) return undefined;
  const key = e.key.toLowerCase();
  return NAV_SHORTCUTS.find((item) => item.key === key);
}

export function matchActionShortcut(e: KeyboardEvent): NavShortcut | undefined {
  if (!e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey || e.repeat) return undefined;
  const key = e.key.toLowerCase();
  return ACTION_SHORTCUTS.find((item) => item.key === key);
}
