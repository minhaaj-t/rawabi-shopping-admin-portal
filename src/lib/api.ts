import { config } from "./config";
import { clearSession, getToken } from "./auth";
import { getAdminBranchId } from "./adminBranch";

export type ApiEnvelope<T> = {
  status: "ok" | "error";
  message: string;
  data: T;
};

export type PageData<T> = {
  items: T[];
  page: number;
  per_page: number;
  total: number;
};

export type FinanceOrderRow = {
  order_id: number;
  order_refno: string;
  order_status: string;
  order_payment: string | null;
  order_payable: number;
  order_refund: number;
  refund_status: number;
  refunded_amount: number;
  order_managed: number;
  order_created_at: string;
  order_storeid: number;
  ec_store_name?: string | null;
  username?: string | null;
  phone?: string | null;
};

export type FinanceOrderList = PageData<FinanceOrderRow>;

export type CheckoutSettings = {
  payment_cod_enabled: boolean;
  payment_ccod_enabled: boolean;
  payment_pickup_cash_enabled: boolean;
  payment_online_enabled: boolean;
  payment_apple_pay_enabled: boolean;
  payment_google_pay_enabled: boolean;
  payment_naps_enabled: boolean;
  payment_qpay_enabled: boolean;
  payment_qmp_enabled: boolean;
  payment_fawran_enabled: boolean;
  payment_bank_transfer_enabled: boolean;
  payment_store_credit_enabled: boolean;
  express_delivery_enabled: boolean;
};

export type AuthSettings = {
  login_phone_otp_enabled: boolean;
  login_email_password_enabled: boolean;
  login_google_enabled: boolean;
  login_apple_enabled: boolean;
  registration_enabled: boolean;
  guest_checkout_enabled: boolean;
  require_otp_login: boolean;
  password_min_length: number;
  otp_length: number;
  otp_ttl_minutes: number;
  max_failed_logins: number;
  lockout_minutes: number;
  session_days: number;
  remember_device_enabled: boolean;
};

export type AuthSettingsPayload = {
  settings: AuthSettings;
  integrations: {
    sms: { enabled?: boolean; configured: boolean; href: string };
    google_oauth: { configured: boolean; client_id?: string; redirect_uri?: string; href: string };
    apple_oauth: { configured: boolean; client_id?: string; redirect_uri?: string; href: string };
  };
};

export type FloorRequestItem = {
  id: number;
  title: string;
  sku: string;
  barcode: string;
  uom: string;
  unit_price: number;
  offer_price: number;
  note: string;
  category_id: number;
  category_name: string;
  store_id: number;
  store_name: string;
  manager_id: number;
  manager_name: string;
  manager_phone?: string;
  approval: number;
  approval_label: string;
  image_url: string | null;
  sku_exists: boolean;
  product_id: number | null;
  created_at: string;
  updated_at: string;
  admin_id: number;
  admin_name?: string;
};

export type StoreManageItem = {
  id: number;
  name: string;
  name_ar: string;
  code: string;
  email: string;
  contact: string;
  franchise_id: number;
  franchise_name: string;
  country_id: number;
  country_name: string;
  area_id: number;
  area_name: string;
  open_time: string;
  close_time: string;
  latitude: string;
  longitude: string;
  address: string;
  address_ar: string;
  avg_time: string;
  max_km: string;
  status: number;
  status_label: string;
  slot_count: number;
  created_at: string;
};
export type FranchiseItem = {
  id: number;
  name: string;
  name_ar: string;
  address: string;
  address_ar: string;
  email: string;
  contact: string;
  status: number;
  status_label: string;
  store_count: number;
  created_at: string;
};

export type SlotItem = {
  id: number;
  store_id: number;
  store_name: string;
  start_time: string;
  end_time: string;
  limit: number;
  status: number;
  status_label: string;
  created_at: string;
};

export type CustomerListItem = {
  id: number;
  username: string;
  email: string;
  phone: string;
  status: number;
  create_date: string;
  last_login_update: string | null;
  order_count: number;
  total_spent: number;
  last_order_at: string | null;
};

export type SupportThreadItem = {
  id: number;
  user_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  order_id: number | null;
  order_refno: string | null;
  contact_id: number | null;
  store_id: number;
  subject: string;
  channel: string;
  status: string;
  priority: string;
  assigned_to: number;
  assigned_name: string;
  unread_admin: number;
  unread_customer: number;
  last_message_at: string | null;
  created_at: string;
  preview: string | null;
};

export type SupportInboxStats = {
  total: number;
  open: number;
  pending: number;
  resolved: number;
  closed: number;
  unread: number;
};

export type SupportInboxPage = PageData<SupportThreadItem> & {
  unchanged?: boolean;
  inbox_rev?: string;
  stats?: SupportInboxStats | null;
};

export type SupportReceipt = "sent" | "delivered" | "read";

export type SupportMessageItem = {
  id: number;
  thread_id: number;
  sender_type: string;
  sender_id: number;
  sender_name: string;
  body: string;
  type: string;
  created_at: string;
  delivered_at?: string | null;
  read_at?: string | null;
  receipt?: SupportReceipt;
  is_auto_reply?: boolean;
};

export type SupportCallRecord = {
  id: number;
  thread_id: number;
  type: string;
  status: string;
  initiator_type: string;
  initiator_id: number;
  admin_id: number;
  offer_sdp: string | null;
  answer_sdp: string | null;
  started_at?: string | null;
  answered_at?: string | null;
  ended_at?: string | null;
  end_reason?: string | null;
};

export type SupportCallSignal = {
  id: number;
  call_id: number;
  from_type: string;
  from_id: number;
  type: string;
  payload: string | null;
  created_at?: string;
};

export type TechSupportAttachment = {
  name: string;
  filename: string;
  path: string;
  url: string;
  size: number;
  mime: string;
};

export type TechSupportTicket = {
  id: string;
  subject: string;
  category: string;
  priority: string;
  message: string;
  attachments: TechSupportAttachment[];
  status: string;
  user_id: number;
  user_name: string;
  user_email: string;
  user_level: number;
  admin_note: string;
  created_at: string;
  updated_at: string;
};

export type PerformanceSettings = {
  caching_enabled: boolean;
  preload_enabled: boolean;
  preload_interval_minutes: number;
  automatic_cache_enabled: boolean;
  browser_caching_enabled: boolean;
  browser_cache_max_age: number;
  gravatar_cache_enabled: boolean;
  purge_varnish_enabled: boolean;
  varnish_url: string;
  combine_css: boolean;
  minify_css: boolean;
  combine_js: boolean;
  minify_js: boolean;
  gzip_enabled: boolean;
  dns_prefetch_enabled: boolean;
  dns_prefetch_hosts: string;
  disable_emojis: boolean;
  display_swap_fonts: boolean;
  cdn_enabled: boolean;
  cdn_url: string;
  exclude_pages: string;
  exclude_user_agents: string;
  exclude_cookies: string;
  exclude_css: string;
  exclude_js: string;
  updated_at?: string | null;
};

export type EmailTemplate = {
  id: string;
  key: string;
  name: string;
  category: string;
  description?: string;
  subject: string;
  html_body: string;
  variables: string[];
  enabled: boolean;
  system?: boolean;
  updated_at?: string | null;
};

export type PaymentRailSettings = {
  enabled?: boolean;
  configured?: boolean;
  merchant_id?: string;
  api_url?: string;
  environment?: string;
  has_api_key?: boolean;
  api_key_preview?: string | null;
};

export type PaymentGatewayStatus = {
  code: string;
  name: string;
  enabled: boolean;
  configured: boolean;
  checkout_toggle?: boolean;
  provider?: string;
  merchant_id?: string;
  api_url?: string;
  environment?: string;
  notes?: string;
  capabilities?: Record<string, unknown>;
};

export type IntegrationSettings = {
  can_edit_secrets?: boolean;
  fcm: {
    enabled?: boolean;
    configured: boolean;
    project_id: string;
    server_key_preview: string | null;
    has_server_key?: boolean;
    credentials_path?: string;
  };
  sms: {
    enabled?: boolean;
    configured: boolean;
    gateway_url: string;
    username?: string;
    sender: string;
    country_code: string;
    has_password?: boolean;
    password_preview?: string | null;
  };
  google_maps: {
    enabled?: boolean;
    configured: boolean;
    api_key_preview: string | null;
    has_api_key?: boolean;
  };
  google_oauth?: {
    configured?: boolean;
    client_id?: string;
    has_client_secret?: boolean;
    client_secret_preview?: string | null;
    redirect_uri?: string;
  };
  apple_oauth?: {
    configured?: boolean;
    client_id?: string;
    team_id?: string;
    key_id?: string;
    has_private_key?: boolean;
    private_key_preview?: string | null;
    redirect_uri?: string;
  };
  qnb_ipay: {
    enabled?: boolean;
    configured: boolean;
    merchant_id: string;
    version: string;
    api_url: string;
    return_url?: string;
    has_password?: boolean;
    has_key?: boolean;
    password_preview?: string | null;
    key_preview?: string | null;
  };
  apple_pay?: {
    configured?: boolean;
    merchant_id?: string;
    display_name?: string;
    domain?: string;
    certificate_ref?: string;
    requires_qnb?: boolean;
  };
  google_pay?: {
    configured?: boolean;
    merchant_id?: string;
    merchant_name?: string;
    gateway_merchant_id?: string;
    environment?: string;
    requires_qnb?: boolean;
  };
  naps?: PaymentRailSettings;
  qpay?: PaymentRailSettings;
  qmp?: PaymentRailSettings;
  fawran?: PaymentRailSettings;
  mail: {
    enabled?: boolean;
    configured?: boolean;
    mailer?: string;
    host?: string;
    port?: string;
    username?: string;
    has_password?: boolean;
    password_preview?: string | null;
    encryption?: string;
    from_address: string;
    from_name: string;
  };
  whatsapp?: {
    enabled?: boolean;
    configured?: boolean;
    provider?: "meta" | "custom" | string;
    phone_number_id?: string;
    has_access_token?: boolean;
    access_token_preview?: string | null;
    graph_version?: string;
    api_url?: string;
    api_auth?: string;
    api_token_param?: string;
    api_body_format?: string;
    api_body_template?: string;
    api_headers_json?: string;
  };
  assets: {
    production_url: string;
    development_url: string;
    configured?: boolean;
  };
  updated_at?: string | null;
};

async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = true,
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const branch = getAdminBranchId();
  if (branch && !headers["X-Store-Id"] && !headers.Storeid) {
    headers["X-Store-Id"] = branch;
    headers.Storeid = branch;
  }

  const res = await fetch(`${config.apiUrl}/api/v2/admin${withBranchPath(path)}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (res.status === 401) {
    clearSession();
    if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
      window.location.href = "/login";
    }
  }

  const json = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok || json.status !== "ok") {
    throw new Error(json.message || `Request failed (${res.status})`);
  }
  return json.data;
}

async function requestForm<T>(path: string, body: FormData): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const branch = getAdminBranchId();
  if (branch) {
    headers["X-Store-Id"] = branch;
    headers.Storeid = branch;
  }

  const res = await fetch(`${config.apiUrl}/api/v2/admin${withBranchPath(path)}`, {
    method: "POST",
    body,
    headers,
    credentials: "include",
  });

  if (res.status === 401) {
    clearSession();
    if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
      window.location.href = "/login";
    }
  }

  const json = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok || json.status !== "ok") {
    throw new Error(json.message || `Request failed (${res.status})`);
  }
  return json.data;
}

async function requestBlob(
  path: string,
  options: { inline?: boolean; mime?: string; fallbackName?: string } = {},
): Promise<{ blob: Blob; filename: string }> {
  const mime = options.mime ?? "application/octet-stream";
  const headers: Record<string, string> = { Accept: mime };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const branch = getAdminBranchId();
  if (branch) {
    headers["X-Store-Id"] = branch;
    headers.Storeid = branch;
  }

  const scoped = withBranchPath(path);
  const url = `${config.apiUrl}/api/v2/admin${scoped}${options.inline ? (scoped.includes("?") ? "&" : "?") + "inline=1" : ""}`;
  const res = await fetch(url, { headers, credentials: "include" });

  if (res.status === 401) {
    clearSession();
    if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
      window.location.href = "/login";
    }
  }

  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const textPeek = new TextDecoder().decode(bytes.slice(0, 32)).trimStart();

  if (!res.ok) {
    let message = `Download failed (${res.status})`;
    if (textPeek.startsWith("{")) {
      try {
        const json = JSON.parse(new TextDecoder().decode(bytes)) as ApiEnvelope<null>;
        message = json.message || message;
      } catch {
        // ignore
      }
    } else if (textPeek.startsWith("<!") || textPeek.startsWith("<html")) {
      message = "Server returned HTML instead of a file. Restart the backend API server after updating.";
    }
    throw new Error(message);
  }

  if (mime === "application/pdf") {
    const header = new TextDecoder().decode(bytes.slice(0, 4));
    if (header !== "%PDF") {
      throw new Error("Server did not return a valid PDF. Restart the backend API server and try again.");
    }
  }

  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="?([^";]+)"?/i);
  const filename = match?.[1] ?? options.fallbackName ?? "download.bin";
  const blob = new Blob([buffer], { type: res.headers.get("Content-Type")?.split(";")[0] || mime });

  return { blob, filename };
}

async function requestHtml(path: string): Promise<string> {
  const headers: Record<string, string> = { Accept: "text/html" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const branch = getAdminBranchId();
  if (branch) {
    headers["X-Store-Id"] = branch;
    headers.Storeid = branch;
  }

  const res = await fetch(`${config.apiUrl}/api/v2/admin${withBranchPath(path)}`, { headers, credentials: "include" });

  if (res.status === 401) {
    clearSession();
    if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
      window.location.href = "/login";
    }
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const json = (await res.json()) as ApiEnvelope<null>;
      message = json.message || message;
    } catch {
      const text = await res.text();
      if (text) message = text.slice(0, 200);
    }
    throw new Error(message);
  }

  return res.text();
}

function branchSkipPath(path: string): boolean {
  const bare = path.split("?")[0] || "";
  return (
    bare === "/login" ||
    bare === "/me" ||
    bare === "/stores" ||
    bare.startsWith("/stores/") ||
    bare === "/franchises" ||
    bare.startsWith("/franchises/") ||
    bare === "/countries" ||
    bare === "/areas" ||
    bare.startsWith("/settings/") ||
    bare === "/notifications" ||
    bare.startsWith("/dashboards") ||
    // Help center is platform-wide (contact forms / chats are not branch-bound).
    bare === "/support" ||
    bare.startsWith("/support/") ||
    bare === "/contacts" ||
    bare.startsWith("/contacts/")
  );
}

/** Attach global topbar branch as store_id when the call is branch-scoped. */
function withBranchPath(path: string): string {
  const branch = getAdminBranchId();
  if (!branch || branchSkipPath(path)) return path;
  if (/[?&]store_id=/.test(path)) return path;
  return `${path}${path.includes("?") ? "&" : "?"}store_id=${encodeURIComponent(branch)}`;
}

function qs(params: Record<string, string | number | undefined>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "" && v !== null) q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const adminApi = {
  login: (email: string, password: string, portal?: "admin" | "store") =>
    request<{
      token: string;
      user: {
        id: number;
        username: string;
        email: string;
        user_level: number;
        store_id: number;
        portal: "admin" | "store";
      };
    }>(
      "/login",
      { method: "POST", body: JSON.stringify({ email, password, ...(portal ? { portal } : {}) }) },
      false,
    ),

  logout: () =>
    request<null>("/logout", { method: "POST" }, false).catch(() => null),

  me: () =>
    request<{
      id: number;
      username: string;
      email: string;
      phone?: string;
      user_level: number;
      role_label?: string;
      store_id: number;
      floor_no?: number;
      portal: "admin" | "store";
      status?: number;
      create_date?: string;
      last_login_update?: string;
      avatar?: string | null;
      avatar_url?: string | null;
    }>("/me"),

  updateProfile: (body: Record<string, unknown>) =>
    request<{
      id: number;
      username: string;
      email: string;
      phone?: string;
      user_level: number;
      role_label?: string;
      store_id: number;
      portal: "admin" | "store";
      avatar?: string | null;
      avatar_url?: string | null;
    }>("/me", { method: "PATCH", body: JSON.stringify(body) }),

  uploadProfileAvatar: (file: File) => {
    const body = new FormData();
    body.append("file", file);
    return requestForm<{ avatar: string; avatar_url: string }>("/me/avatar", body);
  },

  removeProfileAvatar: () =>
    request<{
      id: number;
      username: string;
      email: string;
      phone?: string;
      user_level: number;
      role_label?: string;
      store_id: number;
      floor_no?: number;
      portal: "admin" | "store";
      status?: number;
      create_date?: string;
      last_login_update?: string;
      avatar?: string | null;
      avatar_url?: string | null;
    }>("/me/avatar", { method: "DELETE" }),

  dashboard: (params: Record<string, string | number | undefined> = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "" && v !== null) q.set(k, String(v));
    });
    const s = q.toString();
    return request<{
      period: "day" | "week" | "month" | "year";
      period_label: string;
      values?: string[];
      range_start: string;
      range_end: string;
      anchor: string;
      year: number;
      month: number;
      month_label: string;
      labels: string[];
      cards: Record<string, { count: number; amount: number; label: string }>;
      chart: {
        labels?: string[];
        pending_picking: number[];
        picked_ondelivery: number[];
        delivered: number[];
        cancelled: number[];
        total: number[];
        sales_amount?: number[];
      };
      popular_products: Array<{ product_id: number; name: string; sku: string | null; count: number }>;
      recent_orders: Array<Record<string, unknown>>;
      counts_by_status: Record<string, number>;
      today_orders: number;
      total_orders: number;
    }>(`/dashboard${s ? `?${s}` : ""}`);
  },

  dashboardLayouts: () => request<Array<Record<string, unknown>>>("/dashboards"),
  dashboardLayoutCatalog: () =>
    request<Array<{ type: string; label: string; category: string; description: string }>>("/dashboards/catalog"),
  dashboardLayoutResolved: () => request<Record<string, unknown> | null>("/dashboards/resolved"),
  dashboardLayoutsAccessible: () =>
    request<Array<{ id: number; title: string; slug: string; is_default: boolean }>>("/dashboards/accessible"),
  dashboardLayout: (id: number) => request<Record<string, unknown>>(`/dashboards/${id}`),
  createDashboardLayout: (body: Record<string, unknown>) =>
    request<{ id: number; slug: string }>("/dashboards", { method: "POST", body: JSON.stringify(body) }),
  updateDashboardLayout: (id: number, body: Record<string, unknown>) =>
    request(`/dashboards/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteDashboardLayout: (id: number) => request(`/dashboards/${id}`, { method: "DELETE" }),
  resetDashboardLayout: (id: number) => request(`/dashboards/${id}/reset`, { method: "POST" }),
  syncDashboardAssignments: (id: number, assignments: Array<{ assign_type: string; assign_ref: number }>) =>
    request(`/dashboards/${id}/assignments`, { method: "PUT", body: JSON.stringify({ assignments }) }),

  globalSearch: (params: { q: string; limit?: number; store_id?: string | number }) =>
    request<{
      q: string;
      groups: Array<{
        key: string;
        label: string;
        href: string;
        total: number;
        items: Array<{
          id: number;
          title: string;
          subtitle: string;
          meta: string;
          href: string;
        }>;
      }>;
    }>(`/search${qs(params)}`),

  stores: () =>
    request<
      Array<{
        ec_store_id: number;
        ec_store_name: string;
        ec_store_address: string | null;
      }>
    >("/stores"),

  orders: (params: Record<string, string | number | undefined>) =>
    request<PageData<Record<string, unknown>>>(`/orders${qs(params)}`),

  orderStats: (params: Record<string, string | number | undefined>) =>
    request<{ total: number; payable: number; by_status: Record<string, number> }>(`/orders/stats${qs(params)}`),

  order: (id: number) =>
    request<{
      order: Record<string, unknown>;
      items: Array<Record<string, unknown>>;
      timeline: Array<Record<string, unknown>>;
    }>(`/orders/${id}`),

  updateOrderStatus: (id: number, status: string) =>
    request<{ order_id: number; order_status: string }>(`/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  changeOrderStore: (id: number, store_id: number) =>
    request(`/orders/${id}/change-store`, {
      method: "POST",
      body: JSON.stringify({ store_id }),
    }),

  orderSlots: (store_id: number) =>
    request<Array<Record<string, unknown>>>(`/orders/slots${qs({ store_id })}`),

  changeOrderSlot: (
    id: number,
    body: { date: string; start_time: string; end_time: string },
  ) =>
    request(`/orders/${id}/change-slot`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  downloadOrderInvoice: (id: number, format: "pdf" | "html" = "pdf") => {
    if (format === "pdf") {
      return requestBlob(`/orders/${id}/invoice/pdf`, {
        mime: "application/pdf",
        fallbackName: `invoice-${id}.pdf`,
      });
    }
    return requestBlob(`/orders/${id}/invoice`, {
      mime: "text/html",
      fallbackName: `invoice-${id}.html`,
    });
  },

  downloadOrderInvoiceByRef: (invoiceNumber: string, format: "pdf" | "html" = "pdf") => {
    const ref = encodeURIComponent(invoiceNumber);
    if (format === "pdf") {
      return requestBlob(`/orders/invoice/${ref}/pdf`, {
        mime: "application/pdf",
        fallbackName: `invoice-${invoiceNumber}.pdf`,
      });
    }
    return requestBlob(`/orders/invoice/${ref}?inline=0`, {
      mime: "text/html",
      fallbackName: `invoice-${invoiceNumber}.html`,
    });
  },

  orderInvoiceHtml: (invoiceNumber: string) =>
    requestHtml(`/orders/invoice/${encodeURIComponent(invoiceNumber)}?inline=1`),

  orderInvoiceHtmlById: (id: number) => requestHtml(`/orders/${id}/invoice?inline=1`),

  sendOrderInvoiceEmail: (id: number, email: string) =>
    request<{ email: string }>(`/orders/${id}/invoice/email`, {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  sendOrderInvoiceWhatsApp: (id: number, phone: string, includeDocument = true) =>
    request<{ phone: string; document_sent?: boolean }>(`/orders/${id}/invoice/whatsapp`, {
      method: "POST",
      body: JSON.stringify({ phone, include_document: includeDocument }),
    }),

  products: (params: Record<string, string | number | undefined>) =>
    request<
      PageData<{
        product_id: number;
        name: string;
        sku: string | null;
        barcode: string | null;
        uom: string | null;
        image: string | null;
        image_url: string | null;
        status: number;
        base_price: number;
        global_offer_price: number | null;
        priority: number | null;
        featured: number[];
        category_id: number | null;
        subcategory_id: number | null;
        sub_subcategory_id: number | null;
        category_name: string;
        product_stock: number | null;
        product_stock_limit: number | null;
        store_product_id: number | null;
        store_id: number | null;
        price: number | null;
        offer_price: number | null;
        stock: number | null;
        stock_limit: number | null;
        max_qty: number | null;
        soldout_status: number | null;
        stores: Array<{ store_id: number; name: string; soldout_status: number }>;
        option_label?: string;
        option_color?: string;
        option_size?: string;
        option_pack?: string;
        option_weight?: string;
        option_flavor?: string;
        option_type?: string;
        variant_axis?: string;
      }> & { store_id: number }
    >(`/products${qs(params)}`),

  updateStoreStock: (
    productId: number,
    body: {
      store_id: number;
      stock?: number;
      stock_limit?: number;
      price?: number;
      offer_price?: number;
      soldout_status?: number;
      max_qty?: number;
    },
  ) =>
    request<{
      product_id: number;
      store_id: number;
      store_product_id: number;
      stock: number;
      stock_limit: number | null;
      price: number;
      offer_price: number;
      soldout_status: number;
      max_qty: number | null;
    }>(`/products/${productId}/store-stock`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  product: (id: number) =>
    request<{
      product_id: number;
      name: Record<string, string>;
      name_display: string;
      short_description: Record<string, string>;
      detailed_description: Record<string, string>;
      meta_title: Record<string, string>;
      meta_keyword: Record<string, string>;
      meta_description: Record<string, string>;
      seo_extra: {
        faq: Array<{ question: Record<string, string>; answer: Record<string, string> }>;
        noindex: boolean;
        focus_keyword: Record<string, string>;
      };
      features: Array<{ title: Record<string, string>; text: Record<string, string> }>;
      barcode: string | null;
      sku: string | null;
      uom: string | null;
      weight: string | null;
      size: string | null;
      tags: string | null;
      seller: string | null;
      category_id: number | null;
      subcategory_id: number | null;
      sub_subcategory_id: number | null;
      sub_sub_subcategory_id: number | null;
      brand_id: number | null;
      country_id: number | null;
      image: string | null;
      image_url: string | null;
      gallery: Array<{ image_name: string; image_priority: number; image_url: string | null }>;
      delivery_days: string | null;
      return_days: string | null;
      payment_method: string | null;
      selling_price: number;
      offer_price: number;
      purchase_price: number;
      max_qty: number;
      delivered_by: string | null;
      variant: string[];
      priority: number | null;
      featured: number[];
      status: number;
      save_later: number;
      stores: Array<{
        store_product_id: number;
        store_id: number;
        name: string;
        price: number;
        offer_price: number;
        stock: number;
        soldout_status: number;
      }>;
    }>(`/products/${id}`),

  createProduct: (body: Record<string, unknown>) =>
    request(`/products`, { method: "POST", body: JSON.stringify(body) }),

  updateProduct: (id: number, body: Record<string, unknown>) =>
    request(`/products/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  bulkProducts: (body: {
    action: string;
    ids: number[];
    soldout_status?: number;
    priority?: number | null;
    featured?: number[];
    store_id?: number;
    price?: number;
    stock?: number;
    offer_price?: number;
  }) =>
    request<{ action: string; requested: number; affected: number }>(`/products/bulk`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  importProducts: (
    rows: Array<{
      name?: string;
      brand_id?: number;
      category_id?: number;
      subcategory_id?: number;
      sub_subcategory_id?: number;
      sub_sub_subcategory_id?: number;
      detailed_description?: string;
      short_description?: string;
      sku: string;
      uom: string;
      barcode?: string;
      status?: number;
      features?: string;
      image?: string;
      gallery?: string;
      selling_price?: number;
      offer_price?: number;
      purchase_price?: number;
      tags?: string;
    }>,
  ) =>
    request<{
      inserted: number;
      updated: number;
      failed: number;
      rejected: Array<{ row: number; sku: string; reason: string }>;
    }>("/products/import", { method: "POST", body: JSON.stringify({ rows }) }),

  uploadProductImagesZip: (body: FormData) =>
    requestForm<{ extracted: number }>("/products/upload-images-zip", body),

  uploadProductImage: (file: File, kind: "featured" | "gallery" = "featured", title?: string) => {
    const body = new FormData();
    body.append("file", file);
    body.append("kind", kind);
    if (title) body.append("title", title);
    return requestForm<{ filename: string; url: string; kind: string; media_kind?: string }>("/products/upload-image", body);
  },

  updateProductPriority: (id: number, priority: number | null) =>
    request<{ id: number; priority: number | null }>(`/products/${id}/priority`, {
      method: "PATCH",
      body: JSON.stringify({ priority }),
    }),

  updateProductFeatured: (id: number, featured: number[]) =>
    request<{ id: number; featured: number[] }>(`/products/${id}/featured`, {
      method: "PATCH",
      body: JSON.stringify({ featured }),
    }),

  deleteProduct: (id: number) => request(`/products/${id}`, { method: "DELETE" }),

  preOrders: (params: Record<string, string | number | undefined> = {}) =>
    request<PageData<Record<string, unknown>>>(`/pre-orders${qs(params)}`),

  preOrderStats: (params: Record<string, string | number | undefined> = {}) =>
    request<{ total: number; payable: number; by_status: Record<string, number> }>(`/pre-orders/stats${qs(params)}`),

  preOrder: (id: number) =>
    request<{ order: Record<string, unknown>; items: Array<Record<string, unknown>> }>(`/pre-orders/${id}`),

  convertPreOrder: (id: number) =>
    request<{ pre_order_id: number; order_id: number }>(`/pre-orders/${id}/convert`, {
      method: "POST",
      body: "{}",
    }),

  cancelPreOrder: (id: number, reason?: string) =>
    request(`/pre-orders/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify(reason ? { reason } : {}),
    }),

  bulkPreOrders: (body: { action: "convert" | "cancel"; ids: number[]; reason?: string }) =>
    request<{ action: string; converted: number; cancelled: number; errors: Array<{ id: number; message: string }> }>(
      "/pre-orders/bulk",
      { method: "POST", body: JSON.stringify(body) },
    ),

  customers: (params: Record<string, string | number | undefined> = {}) =>
    request<PageData<CustomerListItem>>(`/customers${qs(params)}`),

  customerStats: (params: Record<string, string | number | undefined> = {}) =>
    request<{ total: number; active: number; inactive: number; with_orders: number }>(
      `/customers/stats${qs(params)}`,
    ),

  customer: (id: number) =>
    request<{
      customer: Record<string, unknown>;
      stats: Record<string, unknown>;
      addresses: Array<Record<string, unknown>>;
      orders: Array<Record<string, unknown>>;
      cart: Array<Record<string, unknown>>;
      wishlist: Array<Record<string, unknown>>;
      recent_views: Array<Record<string, unknown>>;
      reviews: Array<Record<string, unknown>>;
      pre_orders: Array<Record<string, unknown>>;
      search_history: Array<{
        id: number;
        store_id: number;
        words: string;
        terms?: string[];
        created_at?: string | null;
      }>;
      promotions: Array<{
        id: number;
        title: string;
        description: string;
        discount_type: string;
        discount_value: number;
        help: string;
        category: string;
        start_date: string | null;
        end_date: string | null;
      }>;
      coupons: Array<{
        id: number;
        title: string;
        code: string;
        help: string;
        discount_type: string;
        start_date: string | null;
        end_date: string | null;
        instruction: string;
      }>;
      product_suggestions: Array<{
        product_id: number;
        name: string;
        sku: string | null;
        score: number;
        reason: string;
        help: string;
      }>;
      activity_needs: Array<{
        id: string;
        priority: string;
        title: string;
        help: string;
        action: string;
      }>;
      activity_log: Array<{
        id: number;
        activity: string;
        table: string;
        created_at?: string | null;
      }>;
      refunds?: Array<{
        order_id: number;
        order_refno: string;
        order_status: string;
        order_payable: number;
        refund_status: number;
        refunded_amount: number;
        order_created_at?: string | null;
      }>;
      favorites?: Array<{
        product_id: number;
        product_name: string;
        sku: string;
        qty_bought: number;
        times_ordered: number;
        spend: number;
      }>;
      support_tickets?: Array<{
        id: number;
        subject: string;
        status: string;
        priority: string;
        channel: string;
        order_id?: number | null;
        last_message_at?: string | null;
        created_at?: string | null;
      }>;
      complaints?: Array<{
        id: number;
        name: string;
        email: string;
        phone: string;
        place: string;
        message: string;
        created_at?: string | null;
        source: string;
      }>;
    }>(`/customers/${id}`),

  updateCustomer: (id: number, body: Record<string, unknown>) =>
    request(`/customers/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  bulkCustomers: (body: { action: "activate" | "deactivate"; ids: number[] }) =>
    request<{ updated: number; errors: Array<{ id: number; message: string }> }>("/customers/bulk", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  customerNotify: (id: number, body: { title: string; message: string }) =>
    request(`/customers/${id}/notify`, { method: "POST", body: JSON.stringify(body) }),

  customerWhatsApp: (id: number, body: { message: string }) =>
    request(`/customers/${id}/whatsapp`, { method: "POST", body: JSON.stringify(body) }),

  customerEmail: (id: number, body: { subject: string; message: string }) =>
    request(`/customers/${id}/email`, { method: "POST", body: JSON.stringify(body) }),

  customerClearCart: (id: number) =>
    request<{ items_cleared: number }>(`/customers/${id}/clear-cart`, { method: "POST", body: "{}" }),

  supportStats: (params: Record<string, string | number | undefined> = {}) =>
    request<SupportInboxStats>(`/support/stats${qs(params)}`),

  supportThreads: (
    params: Record<string, string | number | undefined> = {},
    init?: RequestInit,
  ) => request<SupportInboxPage>(`/support${qs(params)}`, init ?? {}),

  supportThread: (id: number, opts?: { afterMessageId?: number }) => {
    const after = opts?.afterMessageId && opts.afterMessageId > 0 ? opts.afterMessageId : 0;
    const q = after > 0 ? `?after_message_id=${after}` : "";
    return request<{
      thread: SupportThreadItem;
      messages: SupportMessageItem[];
      latest_message_id?: number;
      incremental?: boolean;
    }>(`/support/${id}${q}`);
  },

  createSupportThread: (body: Record<string, unknown>) =>
    request<{ id: number }>("/support", { method: "POST", body: JSON.stringify(body) }),

  replySupportThread: (id: number, body: { body: string; notify?: boolean }) =>
    request<{ message_id: number; message?: SupportMessageItem; latest_message_id?: number }>(
      `/support/${id}/reply`,
      { method: "POST", body: JSON.stringify(body) },
    ),

  updateSupportThread: (id: number, body: Record<string, unknown>) =>
    request(`/support/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  supportFromContact: (contactId: number) =>
    request<{ id: number }>(`/support/from-contact/${contactId}`, { method: "POST", body: "{}" }),

  supportWhatsApp: (id: number, body: { message: string }) =>
    request(`/support/${id}/whatsapp`, { method: "POST", body: JSON.stringify(body) }),

  supportEmail: (id: number, body: { subject: string; message: string }) =>
    request(`/support/${id}/email`, { method: "POST", body: JSON.stringify(body) }),

  supportAgents: () => request<Array<{ id: number; name: string; level: number }>>("/support/agents"),

  supportCallActive: (threadId: number) =>
    request<{ call: SupportCallRecord | null }>(`/support/${threadId}/calls/active`),

  supportCallStart: (threadId: number, body: { offer_sdp: string; type?: string }) =>
    request<{ call: SupportCallRecord }>("/support/" + threadId + "/calls", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  supportCallAnswer: (threadId: number, callId: number, body: { answer_sdp: string }) =>
    request<{ call: SupportCallRecord }>(`/support/${threadId}/calls/${callId}/answer`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  supportCallPoll: (threadId: number, callId: number, afterSignalId = 0) => {
    const q = afterSignalId > 0 ? `?after_signal_id=${afterSignalId}` : "";
    return request<{
      call: SupportCallRecord | null;
      signals: SupportCallSignal[];
      latest_signal_id?: number;
    }>(`/support/${threadId}/calls/${callId}/poll${q}`);
  },

  supportCallSignal: (
    threadId: number,
    callId: number,
    body: { type: string; payload?: string | null },
  ) =>
    request<{ call: SupportCallRecord | null }>(`/support/${threadId}/calls/${callId}/signal`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  supportCallEnd: (threadId: number, callId: number, reason = "hangup") =>
    request<{ call: SupportCallRecord | null }>(`/support/${threadId}/calls/${callId}/end`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  exportCustomers: async (params: Record<string, string | number | undefined> = {}) => {
    const token = getToken();
    const res = await fetch(`${config.apiUrl}/api/v2/admin/customers/export${qs(params)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    });
    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  staff: (params: Record<string, string | number | undefined> = {}) =>
    request<PageData<Record<string, unknown>>>(`/staff${qs(params)}`),

  staffRoles: () =>
    request<{ roles: Array<{ level: number; key: string; label: string; portal: boolean }> }>(
      "/staff/roles",
    ),

  createStaff: (body: Record<string, unknown>) =>
    request(`/staff`, { method: "POST", body: JSON.stringify(body) }),

  updateStaff: (id: number, body: Record<string, unknown>) =>
    request(`/staff/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  deleteStaff: (id: number) => request(`/staff/${id}`, { method: "DELETE" }),

  accessRoles: () =>
    request<{
      roles: Array<{
        level: number;
        key: string;
        label: string;
        description: string;
        portal: boolean;
        permissions: string[];
        builtin?: boolean;
        custom?: boolean;
      }>;
      portal_levels: number[];
      field_levels: number[];
      permission_catalog: Array<{ key: string; label: string; group: string }>;
    }>("/access/roles"),

  createAccessRole: (body: Record<string, unknown>) =>
    request("/access/roles", { method: "POST", body: JSON.stringify(body) }),

  updateAccessRole: (level: number, body: Record<string, unknown>) =>
    request(`/access/roles/${level}`, { method: "PATCH", body: JSON.stringify(body) }),

  deleteAccessRole: (level: number) => request(`/access/roles/${level}`, { method: "DELETE" }),

  resetAccessRole: (level: number) => request(`/access/roles/${level}/reset`, { method: "POST" }),

  accessSystem: () =>
    request<{
      app: { laravel: string; php: string; environment: string; timezone: string };
      counts: {
        customers: number;
        stores: number;
        active_orders: number;
        staff_by_level: Record<string, number>;
      };
      integrations: Record<string, boolean>;
    }>("/access/system"),

  categories: (parent?: number, q?: string, opts?: { lite?: boolean }) =>
    request<Array<Record<string, unknown>>>(
      `/categories${qs({
        ...(parent !== undefined ? { parent } : {}),
        ...(q ? { q } : {}),
        ...(opts?.lite ? { lite: 1 } : {}),
      })}`,
    ),

  category: (id: number) => request<Record<string, unknown>>(`/categories/${id}`),

  createCategory: (body: Record<string, unknown>) =>
    request(`/categories`, { method: "POST", body: JSON.stringify(body) }),

  updateCategory: (id: number, body: Record<string, unknown>) =>
    request(`/categories/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  uploadCategoryImage: (file: File, kind: "icon" | "home_icon" | "banner", title?: string) => {
    const body = new FormData();
    body.append("file", file);
    body.append("kind", kind);
    if (title) body.append("title", title);
    return requestForm<{ filename: string; url: string; kind: string }>("/categories/upload-image", body);
  },

  categoryIconLibrary: () =>
    request<{
      pack: { id: string; label: string; desc: string };
      groups: Array<{ id: string; label: string }>;
      icons: Array<{
        id: string;
        label: string;
        group: string;
        tags: string[];
        preview_url: string;
        source: "pack" | "uploaded";
        pack_id?: string;
        file?: string;
        filename?: string;
      }>;
    }>("/categories/icon-library"),

  applyCategoryIconPack: (body: {
    icon_id: string;
    pack_id?: string;
    title?: string;
    source?: "pack" | "uploaded";
    filename?: string;
  }) =>
    request<{ filename: string; url: string; kind: string }>("/categories/apply-icon-pack", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  deleteCategory: (id: number) => request(`/categories/${id}`, { method: "DELETE" }),

  updateCategoryStatus: (id: number, status: number) =>
    request(`/categories/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  brands: (params: Record<string, string | number | undefined> = {}) =>
    request<PageData<Record<string, unknown>>>(`/brands${qs(params)}`),

  itemGroups: (q?: string) =>
    request<Array<{ id: number; name: string }>>(`/item-groups${qs({ ...(q ? { q } : {}) })}`),

  createBrand: (body: Record<string, unknown>) =>
    request(`/brands`, { method: "POST", body: JSON.stringify(body) }),

  updateBrand: (id: number, body: Record<string, unknown>) =>
    request(`/brands/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  deleteBrand: (id: number) => request(`/brands/${id}`, { method: "DELETE" }),

  updateBrandStatus: (id: number, status: number) =>
    request(`/brands/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  importBrands: (rows: Array<{ id?: number; name: string; name_ar?: string; image?: string }>) =>
    request<{ inserted: number; updated: number; failed: number; rejected: Array<{ row: number; name: string; reason: string }> }>(
      "/brands/import",
      { method: "POST", body: JSON.stringify({ rows }) },
    ),

  uploadBrandImagesZip: (body: FormData) =>
    requestForm<{ extracted: number }>("/brands/upload-images-zip", body),

  uploadBrandImage: (body: FormData) =>
    requestForm<{ filename: string; url: string }>("/brands/upload-image", body),

  coupons: (params: Record<string, string | number | undefined> = {}) =>
    request<PageData<Record<string, unknown>>>(`/coupons${qs(params)}`),

  createCoupon: (body: Record<string, unknown>) =>
    request(`/coupons`, { method: "POST", body: JSON.stringify(body) }),

  updateCoupon: (id: number, body: Record<string, unknown>) =>
    request(`/coupons/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  deleteCoupon: (id: number) => request(`/coupons/${id}`, { method: "DELETE" }),

  updateCouponStatus: (id: number, status: number) =>
    request(`/coupons/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  banners: (params: Record<string, string | number | undefined> = {}) =>
    request<PageData<Record<string, unknown>>>(`/banners${qs(params)}`),

  createBanner: (body: Record<string, unknown>) =>
    request(`/banners`, { method: "POST", body: JSON.stringify(body) }),

  updateBanner: (id: number, body: Record<string, unknown>) =>
    request(`/banners/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  reorderBanners: (ids: number[]) =>
    request<{ ids: number[] }>("/banners/reorder", {
      method: "PATCH",
      body: JSON.stringify({ ids }),
    }),

  uploadBannerImage: (file: File, title?: string) => {
    const body = new FormData();
    body.append("file", file);
    if (title) body.append("title", title);
    return requestForm<{ filename: string; url: string }>("/banners/upload-image", body);
  },

  deleteBanner: (id: number) => request(`/banners/${id}`, { method: "DELETE" }),

  updateBannerStatus: (id: number, status: number) =>
    request(`/banners/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  flyers: (params: Record<string, string | number | undefined> = {}) =>
    request<PageData<Record<string, unknown>>>(`/flyers${qs(params)}`),

  createFlyer: (body: Record<string, unknown>) =>
    request(`/flyers`, { method: "POST", body: JSON.stringify(body) }),

  updateFlyer: (id: number, body: Record<string, unknown>) =>
    request(`/flyers/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  deleteFlyer: (id: number) => request(`/flyers/${id}`, { method: "DELETE" }),

  updateFlyerStatus: (id: number, status: number) =>
    request(`/flyers/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  deliveryFees: () => request<Array<Record<string, unknown>>>("/delivery-fees"),

  createDeliveryFee: (body: Record<string, unknown>) =>
    request(`/delivery-fees`, { method: "POST", body: JSON.stringify(body) }),

  updateDeliveryFee: (id: number, body: Record<string, unknown>) =>
    request(`/delivery-fees/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  deleteDeliveryFee: (id: number) => request(`/delivery-fees/${id}`, { method: "DELETE" }),

  usergroups: (params: Record<string, string | number | undefined> = {}) =>
    request<PageData<Record<string, unknown>>>(`/usergroups${qs(params)}`),

  createUsergroup: (body: { title: string; user_ids?: number[] }) =>
    request(`/usergroups`, { method: "POST", body: JSON.stringify(body) }),

  updateUsergroup: (id: number, body: { title?: string; user_ids?: number[]; status?: number }) =>
    request(`/usergroups/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  deleteUsergroup: (id: number) => request(`/usergroups/${id}`, { method: "DELETE" }),

  franchises: (params: Record<string, string | number | undefined> = {}) =>
    request<PageData<FranchiseItem>>(`/franchises${qs(params)}`),

  promotions: (params: Record<string, string | number | undefined> = {}) =>
    request<PageData<Record<string, unknown>>>(`/promotions${qs(params)}`),

  createPromotion: (body: Record<string, unknown>) =>
    request(`/promotions`, { method: "POST", body: JSON.stringify(body) }),

  updatePromotion: (id: number, body: Record<string, unknown>) =>
    request(`/promotions/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  deletePromotion: (id: number) => request(`/promotions/${id}`, { method: "DELETE" }),

  notifications: (params: Record<string, string | number | undefined> = {}) =>
    request<PageData<Record<string, unknown>>>(`/notifications${qs(params)}`),

  createNotification: (body: Record<string, unknown>) =>
    request(`/notifications`, { method: "POST", body: JSON.stringify(body) }),

  translate: (body: { texts: string[]; from?: string; to?: string }) =>
    request<{ translations: string[] }>("/translate", { method: "POST", body: JSON.stringify(body) }),

  carts: (params: Record<string, string | number | undefined> = {}) =>
    request<PageData<Record<string, unknown>>>(`/carts${qs(params)}`),

  cartStats: (params: Record<string, string | number | undefined> = {}) =>
    request<{
      total: number;
      total_value: number;
      total_items: number;
      avg_value: number;
      registered: number;
      guest: number;
    }>(`/carts/stats${qs(params)}`),

  cartShow: (userId: number, guestId = 0) =>
    request<{
      user: Record<string, unknown> | null;
      cart_user_id: number;
      cart_guest_id: number;
      cart_type: string;
      items: Array<Record<string, unknown>>;
      item_count: number;
      total: number;
      first_at: string;
      last_at: string;
    }>(`/carts/${userId}${guestId ? qs({ guest_id: guestId }) : ""}`),

  wishlists: (params: Record<string, string | number | undefined> = {}) =>
    request<PageData<{
      key: string;
      user_id: number;
      guest_id: number;
      customer_type: string;
      is_customer?: boolean;
      customer_deleted?: boolean;
      customer_name: string;
      phone: string;
      email: string;
      item_count: number;
      items_text: string;
      products: Array<{
        wish_id: number;
        product_id: number;
        product_name: string;
        sku: string;
        price: number;
      }>;
    }>>(`/wishlists${qs(params)}`),

  wishlistStats: (params: Record<string, string | number | undefined> = {}) =>
    request<{ total: number; customers: number; guests: number; products: number }>(
      `/wishlists/stats${qs(params)}`,
    ),

  wishlistShow: (userId: number, guestId = 0) =>
    request<{
      user: {
        id: number;
        username: string;
        phone: string;
        email: string;
        is_customer?: boolean;
        is_deleted?: boolean;
      } | null;
      wish_user_id: number;
      wish_guest_id: number;
      wishlist_type: string;
      items: Array<{
        wish_id: number;
        product_id: number;
        product_name: string;
        sku: string;
        price: number;
        selling_price: number;
        offer_price: number;
        product_status: number;
      }>;
      item_count: number;
      total: number;
    }>(`/wishlists/${userId}${guestId ? qs({ guest_id: guestId }) : ""}`),

  wishlistClear: (userId: number, guestId = 0) =>
    request<{ items_cleared: number }>(`/wishlists/${userId}/clear`, {
      method: "POST",
      body: JSON.stringify({ guest_id: guestId }),
    }),

  deleteWishlist: (id: number) => request(`/wishlists/items/${id}`, { method: "DELETE" }),

  cartNotify: (userId: number, body: { title: string; message: string; guest_id?: number }) =>
    request(`/carts/${userId}/notify`, { method: "POST", body: JSON.stringify(body) }),

  cartWhatsApp: (userId: number, body: { message: string; guest_id?: number }) =>
    request(`/carts/${userId}/whatsapp`, { method: "POST", body: JSON.stringify(body) }),

  cartEmail: (userId: number, body: { subject: string; message: string; guest_id?: number }) =>
    request(`/carts/${userId}/email`, { method: "POST", body: JSON.stringify(body) }),

  cartClear: (userId: number, guestId = 0) =>
    request<{ items_cleared: number }>(`/carts/${userId}/clear`, {
      method: "POST",
      body: JSON.stringify({ guest_id: guestId }),
    }),

  bulkCarts: (body: {
    action: "notify" | "clear";
    targets: Array<{ user_id: number; guest_id?: number }>;
    title?: string;
    message?: string;
  }) =>
    request<{ action: string; notified: number; cleared: number; errors: Array<{ key: string; message: string }> }>(
      "/carts/bulk",
      { method: "POST", body: JSON.stringify(body) },
    ),

  storesManage: (params: Record<string, string | number | undefined> = {}) =>
    request<PageData<StoreManageItem>>(`/stores/manage${qs(params)}`),

  storeManageStats: (params: Record<string, string | number | undefined> = {}) =>
    request<{ total: number; active: number; inactive: number }>(`/stores/manage/stats${qs(params)}`),

  storeManage: (id: number) =>
    request<{
      store: StoreManageItem;
      stats: Record<string, number | string | null>;
      recent_orders: Array<Record<string, unknown>>;
      slots: Array<Record<string, unknown>>;
      low_stock_products: Array<Record<string, unknown>>;
      floor_requests: Array<Record<string, unknown>>;
      reviews: Array<Record<string, unknown>>;
    }>(`/stores/manage/${id}`),

  createStore: (body: Record<string, unknown>) =>
    request<{ id: number }>(`/stores/manage`, { method: "POST", body: JSON.stringify(body) }),

  updateStore: (id: number, body: Record<string, unknown>) =>
    request(`/stores/manage/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  deleteStore: (id: number) => request(`/stores/manage/${id}`, { method: "DELETE" }),

  updateStoreStatus: (id: number, status: number) =>
    request(`/stores/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  bulkStores: (body: { action: "activate" | "deactivate" | "delete"; ids: number[] }) =>
    request<{ updated: number; errors: Array<{ id: number; message: string }> }>("/stores/manage/bulk", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  activateDraft: (id: number) =>
    request(`/products/${id}/activate-draft`, { method: "POST", body: "{}" }),

  updateProductStatus: (id: number, status: number) =>
    request(`/products/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  contacts: (params: Record<string, string | number | undefined> = {}) =>
    request<
      PageData<Record<string, unknown>> & {
        stats?: {
          total: number;
          new: number;
          read: number;
          replied: number;
          archived: number;
          today: number;
        };
      }
    >(`/contacts${qs(params)}`),

  contact: (id: number) => request<Record<string, unknown>>(`/contacts/${id}`),

  updateContact: (id: number, body: { status?: string; admin_note?: string }) =>
    request<Record<string, unknown>>(`/contacts/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  bulkContacts: (body: { action: string; ids: number[] }) =>
    request<{ updated: number }>("/contacts/bulk", { method: "POST", body: JSON.stringify(body) }),

  deleteContact: (id: number) => request(`/contacts/${id}`, { method: "DELETE" }),

  variants: (params: Record<string, string | number | undefined> = {}) =>
    request<PageData<Record<string, unknown>>>(`/variants${qs(params)}`),

  createVariant: (body: Record<string, unknown>) =>
    request(`/variants`, { method: "POST", body: JSON.stringify(body) }),

  updateVariant: (id: number, body: Record<string, unknown>) =>
    request(`/variants/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  bulkCreateVariants: (titles: string[]) =>
    request<{
      created: Array<{ id: number; title: string }>;
      skipped: string[];
      created_count: number;
      skipped_count: number;
    }>("/variants/bulk", {
      method: "POST",
      body: JSON.stringify({ titles }),
    }),

  deleteVariant: (id: number) => request(`/variants/${id}`, { method: "DELETE" }),

  updateVariantStatus: (id: number, status: number) =>
    request(`/variants/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  floorRequests: (params: Record<string, string | number | undefined> = {}) =>
    request<PageData<FloorRequestItem>>(`/floor-requests${qs(params)}`),

  floorRequestStats: (params: Record<string, string | number | undefined> = {}) =>
    request<{ total: number; pending: number; added: number; rejected: number; already_added: number }>(
      `/floor-requests/stats${qs(params)}`,
    ),

  floorRequest: (id: number) => request<FloorRequestItem>(`/floor-requests/${id}`),

  updateFloorRequest: (id: number, approval: number) =>
    request<{ id: number; approval: number; approval_label: string }>(`/floor-requests/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ approval }),
    }),

  bulkFloorRequests: (body: { action: "approve" | "reject" | "already_added"; ids: number[] }) =>
    request<{ updated: number; errors: Array<{ id: number; message: string }> }>("/floor-requests/bulk", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  filters: (params: Record<string, string | number | undefined> = {}) =>
    request<PageData<Record<string, unknown>>>(`/filters${qs(params)}`),

  createFilter: (body: Record<string, unknown>) =>
    request(`/filters`, { method: "POST", body: JSON.stringify(body) }),

  updateFilter: (id: number, body: Record<string, unknown>) =>
    request(`/filters/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  deleteFilter: (id: number) => request(`/filters/${id}`, { method: "DELETE" }),

  updateFilterStatus: (id: number, status: number) =>
    request(`/filters/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  vendors: (params: Record<string, string | number | undefined> = {}) =>
    request<PageData<Record<string, unknown>>>(`/vendors${qs(params)}`),

  createVendor: (body: Record<string, unknown>) =>
    request(`/vendors`, { method: "POST", body: JSON.stringify(body) }),

  updateVendor: (id: number, body: Record<string, unknown>) =>
    request(`/vendors/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  deleteVendor: (id: number) => request(`/vendors/${id}`, { method: "DELETE" }),

  updateVendorStatus: (id: number, status: number) =>
    request(`/vendors/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  languages: () => request<Array<Record<string, unknown>>>("/languages"),

  createLanguage: (body: Record<string, unknown>) =>
    request(`/languages`, { method: "POST", body: JSON.stringify(body) }),

  seedLanguages: () =>
    request<{ created?: number; updated?: number; items?: Array<Record<string, unknown>> }>(
      `/languages/seed`,
      { method: "POST", body: "{}" },
    ),

  updateLanguage: (id: number, body: Record<string, unknown>) =>
    request(`/languages/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  deleteLanguage: (id: number) => request(`/languages/${id}`, { method: "DELETE" }),

  updateLanguageStatus: (id: number, status: number) =>
    request(`/languages/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  parameters: (opts?: { all?: boolean; q?: string }) => {
    const qs = new URLSearchParams();
    if (opts?.all) qs.set("all", "1");
    if (opts?.q?.trim()) qs.set("q", opts.q.trim());
    const q = qs.toString();
    return request<Array<Record<string, unknown>>>(`/parameters${q ? `?${q}` : ""}`);
  },

  createParameter: (body: Record<string, unknown>) =>
    request(`/parameters`, { method: "POST", body: JSON.stringify(body) }),

  updateParameter: (id: number, body: Record<string, unknown>) =>
    request(`/parameters/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  deleteParameter: (id: number) => request(`/parameters/${id}`, { method: "DELETE" }),

  updateParameterStatus: (id: number, status: number) =>
    request(`/parameters/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  parameterValues: (params: Record<string, string | number | undefined> = {}) =>
    request<PageData<Record<string, unknown>>>(`/parameter-values${qs(params)}`),

  createParameterValue: (body: Record<string, unknown>) =>
    request(`/parameter-values`, { method: "POST", body: JSON.stringify(body) }),

  updateParameterValue: (id: number, body: Record<string, unknown>) =>
    request(`/parameter-values/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  jobs: (params: Record<string, string | number | undefined> = {}) =>
    request<PageData<Record<string, unknown>>>(`/jobs${qs(params)}`),

  jobsOverview: () =>
    request<{
      stats: {
        open_jobs: number;
        closed_jobs: number;
        total_jobs: number;
        applications: number;
        applications_30d: number;
        pending_review: number;
      };
      by_job: Array<{ job_title: string; applications: number }>;
      recent_applications: Array<Record<string, unknown>>;
    }>("/jobs/overview"),

  createJob: (body: Record<string, unknown>) =>
    request(`/jobs`, { method: "POST", body: JSON.stringify(body) }),

  updateJob: (id: number, body: Record<string, unknown>) =>
    request(`/jobs/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  deleteJob: (id: number) => request(`/jobs/${id}`, { method: "DELETE" }),

  updateJobStatus: (id: number, status: number) =>
    request(`/jobs/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  careers: (params: Record<string, string | number | undefined> = {}) =>
    request<PageData<Record<string, unknown>>>(`/careers${qs(params)}`),

  career: (id: number) => request<Record<string, unknown>>(`/careers/${id}`),

  downloadCareerCv: (id: number, opts: { inline?: boolean } = {}) =>
    requestBlob(`/careers/${id}/cv`, {
      inline: opts.inline,
      mime: "application/octet-stream",
      fallbackName: `career-${id}-cv.pdf`,
    }),

  updateCareerStatus: (id: number, status: number) =>
    request(`/careers/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  deleteCareer: (id: number) => request(`/careers/${id}`, { method: "DELETE" }),

  news: (params: Record<string, string | number | undefined> = {}) =>
    request<
      PageData<Record<string, unknown>> & {
        stats?: { total: number; published: number; drafts: number };
      }
    >(`/news${qs(params)}`),

  newsItem: (id: number) => request<Record<string, unknown>>(`/news/${id}`),

  createNews: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/news`, { method: "POST", body: JSON.stringify(body) }),

  updateNews: (id: number, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/news/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  deleteNews: (id: number) => request(`/news/${id}`, { method: "DELETE" }),

  updateNewsStatus: (id: number, status: number) =>
    request(`/news/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  uploadNewsImage: (file: File, title?: string, kind: "featured" | "gallery" | "content" = "featured") => {
    const body = new FormData();
    body.append("file", file);
    if (title) body.append("title", title);
    body.append("kind", kind);
    return requestForm<{ filename: string; path: string; url: string; kind: string }>("/news/upload-image", body);
  },

  countries: () => request<Array<Record<string, unknown>>>("/countries"),

  createCountry: (body: Record<string, unknown>) =>
    request(`/countries`, { method: "POST", body: JSON.stringify(body) }),

  updateCountry: (id: number, body: Record<string, unknown>) =>
    request(`/countries/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  deleteCountry: (id: number) => request(`/countries/${id}`, { method: "DELETE" }),

  updateCountryStatus: (id: number, status: number) =>
    request(`/countries/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  areas: (params: Record<string, string | number | undefined> = {}) =>
    request<Array<Record<string, unknown>>>(`/areas${qs(params)}`),

  createArea: (body: Record<string, unknown>) =>
    request(`/areas`, { method: "POST", body: JSON.stringify(body) }),

  updateArea: (id: number, body: Record<string, unknown>) =>
    request(`/areas/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  deleteArea: (id: number) => request(`/areas/${id}`, { method: "DELETE" }),

  updateAreaStatus: (id: number, status: number) =>
    request(`/areas/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  slotsManage: (params: Record<string, string | number | undefined> = {}) =>
    request<PageData<SlotItem>>(`/slots${qs(params)}`),

  slotStats: (params: Record<string, string | number | undefined> = {}) =>
    request<{ total: number; active: number; inactive: number }>(`/slots/stats${qs(params)}`),

  createSlot: (body: { store_id: number; start_time: string; end_time: string; limit?: number }) =>
    request<{ id: number }>(`/slots`, { method: "POST", body: JSON.stringify(body) }),

  updateSlot: (id: number, body: Partial<{ store_id: number; start_time: string; end_time: string; limit: number; status: number }>) =>
    request(`/slots/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  deleteSlot: (id: number) => request(`/slots/${id}`, { method: "DELETE" }),

  updateSlotStatus: (id: number, status: number) =>
    request(`/slots/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  bulkSlots: (body: { action: "activate" | "deactivate" | "delete"; ids: number[] }) =>
    request<{ updated: number; errors: Array<{ id: number; message: string }> }>("/slots/bulk", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  importToStore: (body: {
    store_id: number;
    dry_run?: boolean;
    create_missing?: boolean;
    rows: Array<{
      sku: string;
      uom?: string;
      price?: number;
      offer_price?: number;
      stock?: number;
      stock_limit?: number;
      soldout_status?: number;
      offer_start_date?: string;
      offer_end_date?: string;
    }>;
  }) =>
    request<{
      dry_run: boolean;
      updated: number;
      inserted: number;
      unchanged: number;
      skipped: number;
      rejected: Array<{ row: number; sku: string; uom: string; reason: string; message: string }>;
    }>(`/import-to-store`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  exportStoreImport: (storeId: number) =>
    request<{ items: Array<Record<string, unknown>>; total: number }>(`/import-to-store/export${qs({ store_id: storeId })}`),

  reportSales: (params: Record<string, string | number | undefined> = {}) =>
    request<Record<string, unknown>>(`/reports/sales${qs(params)}`),

  reportUsers: (params: Record<string, string | number | undefined> = {}) =>
    request<Record<string, unknown>>(`/reports/users${qs(params)}`),

  reportProducts: (params: Record<string, string | number | undefined> = {}) =>
    request<Record<string, unknown>>(`/reports/products${qs(params)}`),

  reportOrders: (params: Record<string, string | number | undefined> = {}) =>
    request<Record<string, unknown>>(`/reports/orders${qs(params)}`),

  reportUpdatedProducts: (params: Record<string, string | number | undefined> = {}) =>
    request<Record<string, unknown>>(`/reports/updated-products${qs(params)}`),

  reportStoreReviews: (params: Record<string, string | number | undefined> = {}) =>
    request<Array<Record<string, unknown>>>(`/reports/store-reviews${qs(params)}`),

  reportNonOrdered: (params: Record<string, string | number | undefined> = {}) =>
    request<Record<string, unknown>>(`/reports/non-ordered-products${qs(params)}`),

  reportDelivery: (params: Record<string, string | number | undefined> = {}) =>
    request<Record<string, unknown>>(`/reports/delivery${qs(params)}`),

  financeMethods: () =>
    request<{
      settings: CheckoutSettings;
      last_30_days: Array<{ method: string; orders_count: number; total: number }>;
      gateways: PaymentGatewayStatus[];
    }>("/finance/methods"),

  financeGatewayLogs: (params: Record<string, string | number | undefined> = {}) =>
    request<{
      items: Array<Record<string, unknown>>;
      total: number;
      page: number;
      per_page: number;
    }>(`/finance/gateway-logs${qs(params)}`),

  financeTransactions: (params: Record<string, string | number | undefined> = {}) =>
    request<FinanceOrderList>(`/finance/transactions${qs(params)}`),

  financeInvoices: (params: Record<string, string | number | undefined> = {}) =>
    request<FinanceOrderList>(`/finance/invoices${qs(params)}`),

  financeCod: (params: Record<string, string | number | undefined> = {}) =>
    request<FinanceOrderList & { settings: { auto_confirm_cod: boolean }; open_total: number }>(
      `/finance/cod${qs(params)}`,
    ),

  updateFinanceCod: (body: Record<string, unknown>) =>
    request<{ auto_confirm_cod: boolean }>("/finance/cod", { method: "PATCH", body: JSON.stringify(body) }),

  financeRefunds: (params: Record<string, string | number | undefined> = {}) =>
    request<FinanceOrderList>(`/finance/refunds${qs(params)}`),

  updateFinanceRefund: (id: number, body: { refund_status: 0 | 1; refunded_amount?: number }) =>
    request(`/finance/refunds/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  financeRevenue: (params: Record<string, string | number | undefined> = {}) =>
    request<{
      date_from: string;
      date_to: string;
      summary: { orders_count: number; gross: number; discount: number; estimated_vat: number };
      by_day: Array<Record<string, unknown>>;
      by_method: Array<Record<string, unknown>>;
    }>(`/finance/revenue${qs(params)}`),

  financeSettlements: (params: Record<string, string | number | undefined> = {}) =>
    request<{
      date_from: string;
      date_to: string;
      items: Array<Record<string, unknown>>;
    }>(`/finance/settlements${qs(params)}`),

  taxSettings: () =>
    request<{
      vat_enabled: boolean;
      vat_rate: number;
      vat_number: string;
      vat_label: string;
      prices_include_vat: boolean;
    }>("/settings/tax"),

  updateTaxSettings: (body: Record<string, unknown>) =>
    request("/settings/tax", { method: "PATCH", body: JSON.stringify(body) }),

  shopSettings: () =>
    request<{
      timezone: string;
      default_store_id: number;
      default_language: string;
      max_delivery_km: number;
      min_order_delivery_qar: number;
      min_order_pickup_qar: number;
      slot_min_minutes_ahead: number;
    }>("/settings/shop"),

  updateShopSettings: (body: Record<string, unknown>) =>
    request("/settings/shop", { method: "PATCH", body: JSON.stringify(body) }),

  urlSettings: () => request<Record<string, string | number>>("/settings/urls"),
  updateUrlSettings: (body: Record<string, unknown>) =>
    request("/settings/urls", { method: "PATCH", body: JSON.stringify(body) }),

  settingsOverview: () =>
    request<{
      counts: Record<string, number>;
      shop: Record<string, unknown>;
      checkout: Record<string, unknown>;
      auth?: Record<string, unknown>;
      maintenance_mode: boolean;
      integrations_ready: number;
    }>("/settings/overview"),

  checkoutSettings: () => request<CheckoutSettings>("/settings/checkout"),

  updateCheckoutSettings: (body: Record<string, unknown>) =>
    request("/settings/checkout", { method: "PATCH", body: JSON.stringify(body) }),

  authSettings: () => request<AuthSettingsPayload>("/settings/auth"),

  updateAuthSettings: (body: Record<string, unknown>) =>
    request<AuthSettingsPayload>("/settings/auth", { method: "PATCH", body: JSON.stringify(body) }),

  orderSettings: () =>
    request<{
      currency_code: string;
      currency_symbol: string;
      currency_decimals: number;
      multi_currency_enabled: boolean;
      allow_customer_cancel: boolean;
      cancel_before_picking: boolean;
      order_note_max_length: number;
      auto_confirm_cod: boolean;
      multi_currency_ready?: boolean;
      country_currencies?: Array<{
        country_id: number;
        country_name: string;
        country_code: string;
        status: number;
        currency_code: string;
        currency_symbol: string;
        currency_decimals: number;
        configured: boolean;
        uses_default: boolean;
      }>;
      currency_health?: {
        ok: boolean;
        issues: Array<{ level: string; message: string }>;
        summary: {
          active_countries: number;
          configured_countries: number;
          missing_countries: number;
          distinct_currencies: number;
        };
      };
    }>("/settings/orders"),

  updateOrderSettings: (body: Record<string, unknown>) =>
    request("/settings/orders", { method: "PATCH", body: JSON.stringify(body) }),

  storefrontSettings: () =>
    request<{
      storefront_name: string;
      support_email: string;
      support_phone: string;
      whatsapp_number: string;
      maintenance_mode: boolean;
      maintenance_message: string;
    }>("/settings/storefront"),

  updateStorefrontSettings: (body: Record<string, unknown>) =>
    request("/settings/storefront", { method: "PATCH", body: JSON.stringify(body) }),

  notificationSettings: () =>
    request<{
      notify_order_email: boolean;
      notify_order_push: boolean;
      notify_promo_push: boolean;
      notify_sms_otp: boolean;
      notify_low_stock_email: boolean;
    }>("/settings/notifications"),

  updateNotificationSettings: (body: Record<string, unknown>) =>
    request("/settings/notifications", { method: "PATCH", body: JSON.stringify(body) }),

  clearSettingsCache: (targets: string[] = ["backend"]) =>
    request<{
      cleared_at: string;
      targets: string[];
      actions: string[];
      tokens: { web: number; mobile: number; delivery: number; admin: number };
      meta?: Record<string, unknown>;
      revalidate?: { attempted: boolean; ok: boolean; message?: string };
    }>("/settings/cache/clear", { method: "POST", body: JSON.stringify({ targets }) }),

  settingsTools: () =>
    request<{
      tokens: { web: number; mobile: number; delivery: number; admin: number };
      meta: Record<string, string | null>;
      hosts: Record<string, string | null>;
      revalidate_configured: boolean;
      php_version: string;
      laravel_version: string;
      performance?: PerformanceSettings;
    }>("/settings/tools"),

  performanceSettings: () => request<PerformanceSettings>("/settings/performance"),
  updatePerformanceSettings: (body: Partial<PerformanceSettings>) =>
    request<PerformanceSettings>("/settings/performance", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  techSupportTickets: (params?: { scope?: "mine" | "all"; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.scope) q.set("scope", params.scope);
    if (params?.status) q.set("status", params.status);
    const qs = q.toString();
    return request<{ items: TechSupportTicket[]; total: number; can_manage_all: boolean }>(
      `/tech-support/tickets${qs ? `?${qs}` : ""}`,
    );
  },
  createTechSupportTicket: (body: FormData) => requestForm<TechSupportTicket>("/tech-support/tickets", body),
  updateTechSupportTicket: (id: string, body: { status?: string; admin_note?: string }) =>
    request<TechSupportTicket>(`/tech-support/tickets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  integrationSettings: () => request<IntegrationSettings>("/settings/integrations"),
  updateIntegrationSettings: (body: Record<string, unknown>) =>
    request<IntegrationSettings>("/settings/integrations", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  emailTemplates: () =>
    request<{ items: EmailTemplate[]; total: number; categories: string[] }>("/settings/email-templates"),
  createEmailTemplate: (body: Partial<EmailTemplate>) =>
    request<EmailTemplate>("/settings/email-templates", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateEmailTemplate: (id: string, body: Partial<EmailTemplate>) =>
    request<EmailTemplate>(`/settings/email-templates/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteEmailTemplate: (id: string) =>
    request<null>(`/settings/email-templates/${id}`, { method: "DELETE" }),
  previewEmailTemplate: (
    id: string,
    body?: { subject?: string; html_body?: string; variables?: Record<string, string> },
  ) =>
    request<{ subject: string; html: string; variables: Record<string, string> }>(
      `/settings/email-templates/${id}/preview`,
      { method: "POST", body: JSON.stringify(body || {}) },
    ),

  marketingOverview: () =>
    request<import("./marketing").MarketingOverview>("/marketing/overview"),

  marketingAnalytics: () => request<import("./marketing").MarketingAnalytics>("/marketing/analytics"),

  updateMarketingAnalytics: (body: Record<string, unknown>) =>
    request<import("./marketing").MarketingAnalytics>("/marketing/analytics", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  marketingAds: () => request<import("./marketing").MarketingAds>("/marketing/ads"),

  updateMarketingAds: (body: Record<string, unknown>) =>
    request<import("./marketing").MarketingAds>("/marketing/ads", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  marketingSeo: () => request<import("./marketing").MarketingSeo>("/marketing/seo"),

  updateMarketingSeo: (body: Record<string, unknown>) =>
    request<import("./marketing").MarketingSeo>("/marketing/seo", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  marketingAeo: () => request<import("./marketing").MarketingAeo>("/marketing/aeo"),

  updateMarketingAeo: (body: Record<string, unknown>) =>
    request<import("./marketing").MarketingAeo>("/marketing/aeo", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  marketingConsent: () => request<import("./marketing").MarketingConsent>("/marketing/consent"),

  updateMarketingConsent: (body: Record<string, unknown>) =>
    request<import("./marketing").MarketingConsent>("/marketing/consent", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  marketingSeoAudit: (params?: { page?: number; per_page?: number }) =>
    request<import("./marketing").MarketingSeoAudit>(`/marketing/seo-audit${qs(params ?? {})}`),

  uploadMarketingAsset: (file: File, opts?: { kind?: "og" | "logo" | "general"; format?: "original" | "webp" | "jpeg" | "png" }) => {
    const body = new FormData();
    body.append("file", file);
    body.append("kind", opts?.kind ?? "general");
    body.append("format", opts?.format ?? "original");
    return requestForm<{
      filename: string;
      path: string;
      url: string;
      format: string;
      kind: string;
    }>("/marketing/upload-asset", body);
  },

  uiuxPages: () => request<import("./uiux").UiUxPages>("/uiux/pages"),

  updateUiuxPages: (body: Record<string, unknown>) =>
    request<import("./uiux").UiUxPages>("/uiux/pages", { method: "PATCH", body: JSON.stringify(body) }),

  uiuxTheme: () => request<import("./uiux").UiUxTheme>("/uiux/theme"),

  updateUiuxTheme: (body: Record<string, unknown>) =>
    request<import("./uiux").UiUxTheme>("/uiux/theme", { method: "PATCH", body: JSON.stringify(body) }),

  uiuxIcons: () => request<import("./uiux").UiUxIcons>("/uiux/icons"),

  updateUiuxIcons: (body: Record<string, unknown>) =>
    request<import("./uiux").UiUxIcons>("/uiux/icons", { method: "PATCH", body: JSON.stringify(body) }),

  uploadUiuxAsset: (file: File, kind?: string) => {
    const body = new FormData();
    body.append("file", file);
    body.append("kind", kind ?? "general");
    return requestForm<{ filename: string; path: string; url: string; kind: string }>("/uiux/upload-asset", body);
  },

  analystOverview: () => request<import("./analyst").AnalystOverview>("/analyst/overview"),

  analystCustomers: (params: Record<string, string | number | undefined> = {}) =>
    request<import("./analyst").AnalystCustomersPage>(`/analyst/customers${qs(params)}`),

  analystSearchTrends: (params: Record<string, string | number | undefined> = {}) =>
    request<import("./analyst").AnalystSearchTrends>(`/analyst/search-trends${qs(params)}`),

  analystProductMatch: (body: { terms?: string[]; q?: string; limit?: number }) =>
    request<import("./analyst").AnalystProductMatchResult>("/analyst/product-match", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  analystResearch: () => request<import("./analyst").AnalystResearch>("/analyst/research"),

  analystSaveResearchSource: (body: Record<string, unknown>) =>
    request<{ sources: import("./analyst").AnalystResearchSource[] }>("/analyst/research/sources", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  analystDeleteResearchSource: (id: string) =>
    request<{ sources: import("./analyst").AnalystResearchSource[] }>(`/analyst/research/sources/${id}`, {
      method: "DELETE",
    }),

  analystRunResearch: (body: { source_id?: string; url?: string }) =>
    request<import("./analyst").AnalystResearchRun>("/analyst/research/run", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  analystAppStore: (store: "apple" | "google") =>
    request<import("./analyst").AppStoreAnalyticsPayload>(`/analyst/app-stores/${store}`),

  updateAnalystAppStore: (store: "apple" | "google", body: Record<string, unknown>) =>
    request<import("./analyst").AppStoreAnalyticsPayload>(`/analyst/app-stores/${store}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  refreshAnalystAppStore: (store: "apple" | "google") =>
    request<import("./analyst").AppStoreAnalyticsPayload>(`/analyst/app-stores/${store}/refresh`, {
      method: "POST",
      body: JSON.stringify({}),
    }),

  inventoryOverview: (params: Record<string, string | number | undefined> = {}) =>
    request<{
      kpis: {
        on_hand?: number;
        reserved?: number;
        available?: number;
        damaged?: number;
        expired?: number;
        in_transit?: number;
        low_stock?: number;
        out_of_stock?: number;
        valuation?: number;
        warehouses?: number;
        open_alerts?: number;
      };
      [key: string]: unknown;
    }>(`/inventory/overview${qs(params)}`),

  inventoryStock: (params: Record<string, string | number | undefined> = {}) =>
    request<
      PageData<{
        product_id: number;
        product_name?: string;
        sku?: string;
        store_id: number;
        store_name?: string;
        warehouse_id?: number;
        warehouse_name?: string;
        on_hand: number;
        reserved: number;
        available: number;
        damaged: number;
        expired: number;
        in_transit: number;
        avg_cost: number;
        valuation: number;
        [key: string]: unknown;
      }>
    >(`/inventory/stock${qs(params)}`),

  inventoryWarehouses: (params: Record<string, string | number | undefined> = {}) =>
    request<
      PageData<{
        wh_id: number;
        wh_store_id: number;
        wh_code?: string | null;
        wh_name: string;
        wh_type: string;
        wh_status: number;
        store_name?: string;
        [key: string]: unknown;
      }>
    >(`/inventory/warehouses${qs(params)}`),

  createWarehouse: (body: Record<string, unknown>) =>
    request<{ wh_id: number }>("/inventory/warehouses", { method: "POST", body: JSON.stringify(body) }),

  updateWarehouse: (id: number, body: Record<string, unknown>) =>
    request(`/inventory/warehouses/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  deleteWarehouse: (id: number) => request(`/inventory/warehouses/${id}`, { method: "DELETE" }),

  seedInventoryWarehouses: () =>
    request<{ created: number }>("/inventory/warehouses/seed", { method: "POST" }),

  inventoryDocuments: (params: Record<string, string | number | undefined> = {}) =>
    request<
      PageData<{
        doc_id: number;
        doc_number?: string | null;
        doc_type: string;
        doc_store_id: number;
        doc_warehouse_id?: number;
        doc_to_store_id?: number;
        doc_status: string;
        doc_reason?: string | null;
        doc_created_at?: string | null;
        store_name?: string;
        [key: string]: unknown;
      }>
    >(`/inventory/documents${qs(params)}`),

  createInventoryDocument: (body: Record<string, unknown>) =>
    request<{ doc_id: number }>("/inventory/documents", { method: "POST", body: JSON.stringify(body) }),

  postInventoryDocument: (id: number) =>
    request<{ doc_id: number; doc_status: string }>(`/inventory/documents/${id}/post`, { method: "POST" }),

  inventoryBatches: (params: Record<string, string | number | undefined> = {}) =>
    request<
      PageData<{
        batch_id: number;
        batch_store_id: number;
        batch_warehouse_id?: number;
        batch_product_id: number;
        batch_code: string;
        batch_lot?: string | null;
        batch_expiry_at?: string | null;
        batch_qty: number;
        batch_cost?: number;
        batch_policy?: string;
        product_name?: string;
        store_name?: string;
        [key: string]: unknown;
      }>
    >(`/inventory/batches${qs(params)}`),

  createInventoryBatch: (body: Record<string, unknown>) =>
    request<{ batch_id: number }>("/inventory/batches", { method: "POST", body: JSON.stringify(body) }),

  inventoryMovements: (params: Record<string, string | number | undefined> = {}) =>
    request<
      PageData<{
        mov_id: number;
        mov_store_id: number;
        mov_warehouse_id?: number;
        mov_product_id: number;
        mov_doc_id?: number;
        mov_doc_type?: string | null;
        mov_bucket?: string;
        mov_qty_delta: number;
        mov_qty_after?: number;
        mov_cost?: number;
        mov_note?: string | null;
        mov_created_at?: string | null;
        product_name?: string;
        store_name?: string;
        [key: string]: unknown;
      }>
    >(`/inventory/movements${qs(params)}`),

  inventoryValuation: (params: Record<string, string | number | undefined> = {}) =>
    request<{
      total: number;
      by_store: Array<{
        store_id: number;
        store_name?: string;
        on_hand?: number;
        valuation: number;
        [key: string]: unknown;
      }>;
    }>(`/inventory/valuation${qs(params)}`),

  inventoryAlerts: (params: Record<string, string | number | undefined> = {}) =>
    request<
      PageData<{
        alert_id: number;
        alert_type: string;
        alert_store_id?: number;
        alert_product_id?: number;
        alert_batch_id?: number;
        alert_message: string;
        alert_qty?: number | null;
        alert_expiry_at?: string | null;
        alert_status: number;
        alert_created_at?: string | null;
        product_name?: string;
        store_name?: string;
        [key: string]: unknown;
      }>
    >(`/inventory/alerts${qs(params)}`),

  ackInventoryAlert: (id: number) =>
    request(`/inventory/alerts/${id}/ack`, { method: "POST" }),

  refreshInventoryAlerts: (params: Record<string, string | number | undefined> = {}) =>
    request<{ created: number; open: number }>(`/inventory/alerts/refresh${qs(params)}`, { method: "POST" }),

  storeHolidays: (params: Record<string, string | number | undefined> = {}) =>
    request<
      PageData<{
        hol_id: number;
        hol_store_id: number;
        hol_date: string;
        hol_name: string;
        hol_closed: number;
        hol_open?: string | null;
        hol_close?: string | null;
        store_name?: string;
        [key: string]: unknown;
      }>
    >(`/stores/holidays${qs(params)}`),

  createStoreHoliday: (body: Record<string, unknown>) =>
    request<{ hol_id: number }>("/stores/holidays", { method: "POST", body: JSON.stringify(body) }),

  deleteStoreHoliday: (id: number) => request(`/stores/holidays/${id}`, { method: "DELETE" }),
};
