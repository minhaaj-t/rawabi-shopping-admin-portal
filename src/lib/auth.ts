export type AdminUser = {
  id: number;
  username: string;
  email?: string;
  user_level: number;
  store_id: number;
  portal?: "admin" | "store";
  avatar_url?: string | null;
};

const TOKEN_KEY = "rb_admin_token";
const USER_KEY = "rb_admin_user";

/** Prefer sessionStorage (tab-scoped) over localStorage to reduce XSS token theft persistence. */
function store(): Storage {
  try {
    return sessionStorage;
  } catch {
    return localStorage;
  }
}

export function getToken(): string | null {
  return store().getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AdminUser | null {
  const raw = store().getItem(USER_KEY) || localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
}

export function setSession(token: string, user: AdminUser) {
  store().setItem(TOKEN_KEY, token);
  store().setItem(USER_KEY, JSON.stringify(user));
  // Migrate off long-lived localStorage tokens
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function clearSession() {
  store().removeItem(TOKEN_KEY);
  store().removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isLoggedIn(): boolean {
  return Boolean(getToken());
}

export function isStorePortal(user = getUser()): boolean {
  return user?.portal === "store" || (user?.user_level === 0 && (user?.store_id ?? 0) > 0);
}

export function isSuperAdmin(user = getUser()): boolean {
  return user?.user_level === 1 && user?.portal !== "store";
}

export function canManageStaff(user = getUser()): boolean {
  return isSuperAdmin(user) || user?.user_level === 2;
}
