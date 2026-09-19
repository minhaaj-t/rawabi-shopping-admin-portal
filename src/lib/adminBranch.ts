import { useEffect, useState } from "react";

export const ADMIN_BRANCH_KEY = "rawabi_admin_branch";
export const ADMIN_BRANCH_EVENT = "rawabi:admin-branch";

export function getAdminBranchId(): string {
  if (typeof window === "undefined") return "";
  return String(localStorage.getItem(ADMIN_BRANCH_KEY) || "").trim();
}

export function setAdminBranchId(id: string) {
  const next = String(id || "").trim();
  const prev = getAdminBranchId();
  if (next) localStorage.setItem(ADMIN_BRANCH_KEY, next);
  else localStorage.removeItem(ADMIN_BRANCH_KEY);
  if (next !== prev) {
    window.dispatchEvent(new CustomEvent(ADMIN_BRANCH_EVENT, { detail: { branchId: next } }));
  }
}

/** Prefer explicit page filter, then global topbar branch. */
export function resolveStoreIdParam(explicit?: string | number | null): string | undefined {
  const fromExplicit = String(explicit ?? "").trim();
  if (fromExplicit) return fromExplicit;
  const fromGlobal = getAdminBranchId();
  return fromGlobal || undefined;
}

export function useAdminBranchId(): string {
  const [branchId, setBranchId] = useState(() => getAdminBranchId());

  useEffect(() => {
    function sync(e?: Event) {
      const detail = (e as CustomEvent<{ branchId?: string }> | undefined)?.detail?.branchId;
      setBranchId(detail !== undefined ? String(detail) : getAdminBranchId());
    }
    function onStorage(e: StorageEvent) {
      if (e.key === ADMIN_BRANCH_KEY) sync();
    }
    window.addEventListener(ADMIN_BRANCH_EVENT, sync as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(ADMIN_BRANCH_EVENT, sync as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return branchId;
}
