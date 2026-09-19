/**
 * Minimal login API — keeps /login free of the full adminApi surface (~85KB).
 */
import { config } from "./config";

export type LoginResult = {
  token: string;
  user: {
    id: number;
    username: string;
    email: string;
    user_level: number;
    store_id: number;
    portal: "admin" | "store";
    avatar_url?: string | null;
  };
};

type Envelope<T> = { status: "ok" | "error"; message: string; data: T };

export async function loginAdmin(
  email: string,
  password: string,
  portal?: "admin" | "store",
): Promise<LoginResult> {
  const res = await fetch(`${config.apiUrl}/api/v2/admin/login`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ email, password, ...(portal ? { portal } : {}) }),
  });

  const json = (await res.json().catch(() => null)) as Envelope<LoginResult> | null;
  if (!res.ok || !json || json.status !== "ok" || !json.data) {
    throw new Error(json?.message || `Login failed (${res.status})`);
  }
  return json.data;
}
