import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Globe2, Truck } from "../lib/icons";
import { SettingsPageShell, SettingsToggle } from "../components/SettingsPageShell";
import { adminApi } from "../lib/api";
import { useSettingsForm } from "../lib/useSettingsForm";
import { LoadingCard } from "../components/LoadingIndicator";

type ShopForm = {
  timezone: string;
  default_store_id: string;
  default_language: string;
  max_delivery_km: string;
  min_order_delivery_qar: string;
  min_order_pickup_qar: string;
  slot_min_minutes_ahead: string;
};

function shopToForm(data: Awaited<ReturnType<typeof adminApi.shopSettings>>): ShopForm {
  return {
    timezone: String(data.timezone ?? ""),
    default_store_id: String(data.default_store_id ?? ""),
    default_language: String(data.default_language ?? ""),
    max_delivery_km: String(data.max_delivery_km ?? ""),
    min_order_delivery_qar: String(data.min_order_delivery_qar ?? ""),
    min_order_pickup_qar: String(data.min_order_pickup_qar ?? ""),
    slot_min_minutes_ahead: String(data.slot_min_minutes_ahead ?? ""),
  };
}

export function ShopSettingsPage() {
  const { form, setForm, busy, msg, error, onSubmit } = useSettingsForm(
    () => adminApi.shopSettings().then(shopToForm),
    async (body) => shopToForm(await adminApi.updateShopSettings(body) as Awaited<ReturnType<typeof adminApi.shopSettings>>),
    (f) => ({
      timezone: f.timezone,
      default_language: f.default_language,
      default_store_id: Number(f.default_store_id),
      max_delivery_km: Number(f.max_delivery_km),
      min_order_delivery_qar: Number(f.min_order_delivery_qar),
      min_order_pickup_qar: Number(f.min_order_pickup_qar),
      slot_min_minutes_ahead: Number(f.slot_min_minutes_ahead),
    }),
  );

  function field(
    id: keyof ShopForm,
    label: string,
    hint?: string,
    type: "text" | "number" | "url" = "text",
  ) {
    if (!form) return null;
    return (
      <label className="pf-field" key={id}>
        <span className="pf-label">{label}</span>
        {hint ? <span className="pf-hint">{hint}</span> : <span className="pf-hint pf-hint-spacer" aria-hidden>&nbsp;</span>}
        <input
          type={type}
          value={form[id]}
          onChange={(ev) => setForm({ ...form, [id]: ev.target.value })}
          required
          spellCheck={false}
        />
      </label>
    );
  }

  return (
    <SettingsPageShell
      section="Store & delivery"
      sectionTo="/settings/shop"
      title="Shop rules"
      subtitle="Timezone, default store, and delivery / order thresholds. URL formats live under Settings → URLs & formats."
    >
      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}

      {!form ? (
        <LoadingCard label="Loading shop settings" />
      ) : (
        <form className="settings-form card" onSubmit={onSubmit}>
          <div className="settings-form-stack">
            <fieldset className="settings-fieldset">
              <legend>
                <Globe2 size={16} aria-hidden /> General
              </legend>
              <div className="settings-fields">
                {field("timezone", "Timezone", "e.g. Asia/Qatar")}
                {field("default_language", "Default language", "e.g. English")}
                {field("default_store_id", "Default store ID", "Fallback branch when none selected", "number")}
              </div>
            </fieldset>

            <fieldset className="settings-fieldset">
              <legend>
                <Truck size={16} aria-hidden /> Orders & delivery
              </legend>
              <div className="settings-fields">
                {field("max_delivery_km", "Max delivery distance (km)", undefined, "number")}
                {field("min_order_delivery_qar", "Minimum order — delivery (QAR)", undefined, "number")}
                {field("min_order_pickup_qar", "Minimum order — pickup (QAR)", undefined, "number")}
                {field("slot_min_minutes_ahead", "Slot lead time (minutes)", "Min minutes before a slot can be booked", "number")}
              </div>
            </fieldset>
          </div>

          <div className="settings-form-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Saving…" : "Save shop rules"}
            </button>
          </div>
        </form>
      )}
    </SettingsPageShell>
  );
}

export function CheckoutSettingsPage() {
  const { form, setForm, busy, msg, error, onSubmit } = useSettingsForm(
    () => adminApi.checkoutSettings(),
    (body) => adminApi.updateCheckoutSettings(body) as Promise<Awaited<ReturnType<typeof adminApi.checkoutSettings>>>,
    (f) => ({ ...f }),
  );

  return (
    <SettingsPageShell
      section="Checkout & payments"
      title="Checkout & payments"
      subtitle="Control which payment methods and checkout flows are available to customers."
    >
      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}

      {!form ? (
        <LoadingCard label="Loading checkout settings" />
      ) : (
        <form className="settings-form card" onSubmit={onSubmit}>
          <div className="settings-toggle-list">
            <SettingsToggle
              label="Cash on delivery (COD)"
              hint="Allow customers to pay with cash when the order is delivered."
              checked={form.payment_cod_enabled}
              onChange={(v) => setForm({ ...form, payment_cod_enabled: v })}
            />
            <SettingsToggle
              label="Card on delivery (CCOD)"
              hint="Allow card payment at the door via delivery staff."
              checked={form.payment_ccod_enabled}
              onChange={(v) => setForm({ ...form, payment_ccod_enabled: v })}
            />
            <SettingsToggle
              label="Online payment (QNB iPay)"
              hint="Enable card checkout through the QNB payment gateway."
              checked={form.payment_online_enabled}
              onChange={(v) => setForm({ ...form, payment_online_enabled: v })}
            />
            <SettingsToggle
              label="Pay at store"
              hint="Customer pays at the counter when collecting a pickup order."
              checked={form.payment_pickup_cash_enabled}
              onChange={(v) => setForm({ ...form, payment_pickup_cash_enabled: v })}
            />
            <SettingsToggle
              label="Apple Pay"
              hint="Wallet checkout via QNB on Apple devices."
              checked={form.payment_apple_pay_enabled}
              onChange={(v) => setForm({ ...form, payment_apple_pay_enabled: v })}
            />
            <SettingsToggle
              label="Google Pay"
              hint="Wallet checkout via QNB on Android."
              checked={form.payment_google_pay_enabled}
              onChange={(v) => setForm({ ...form, payment_google_pay_enabled: v })}
            />
            <SettingsToggle
              label="NAPS"
              hint="Qatar domestic debit (QCB retail network)."
              checked={form.payment_naps_enabled}
              onChange={(v) => setForm({ ...form, payment_naps_enabled: v })}
            />
            <SettingsToggle
              label="QPay"
              hint="QPay checkout rail (credentials under Payment methods / Gateways)."
              checked={form.payment_qpay_enabled}
              onChange={(v) => setForm({ ...form, payment_qpay_enabled: v })}
            />
            <SettingsToggle
              label="QMP"
              hint="Qatar Mobile Payment when your PSP enables it."
              checked={form.payment_qmp_enabled}
              onChange={(v) => setForm({ ...form, payment_qmp_enabled: v })}
            />
            <SettingsToggle
              label="Fawran"
              hint="Instant account-to-account credit transfer."
              checked={form.payment_fawran_enabled}
              onChange={(v) => setForm({ ...form, payment_fawran_enabled: v })}
            />
            <SettingsToggle
              label="Bank transfer"
              hint="Manual transfer; finance confirms after proof."
              checked={form.payment_bank_transfer_enabled}
              onChange={(v) => setForm({ ...form, payment_bank_transfer_enabled: v })}
            />
            <SettingsToggle
              label="Store credit"
              hint="Apply credit notes or refund balances at checkout."
              checked={form.payment_store_credit_enabled}
              onChange={(v) => setForm({ ...form, payment_store_credit_enabled: v })}
            />
            <SettingsToggle
              label="Express delivery"
              hint="Show express delivery option when slots and store rules allow it."
              checked={form.express_delivery_enabled}
              onChange={(v) => setForm({ ...form, express_delivery_enabled: v })}
            />
          </div>
          <p className="pf-hint" style={{ marginTop: 8 }}>
            Guest checkout and OTP login rules live under{" "}
            <Link to="/settings/auth">Authentication &amp; security</Link>.
          </p>
          <div className="settings-form-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Saving…" : "Save checkout settings"}
            </button>
          </div>
        </form>
      )}
    </SettingsPageShell>
  );
}

export function OrderSettingsPage() {
  type CountryCurrency = {
    country_id: number;
    country_name: string;
    country_code: string;
    status: number;
    currency_code: string;
    currency_symbol: string;
    currency_decimals: number;
    configured: boolean;
    uses_default: boolean;
  };

  type OrderForm = {
    currency_code: string;
    currency_symbol: string;
    currency_decimals: number;
    multi_currency_enabled: boolean;
    allow_customer_cancel: boolean;
    cancel_before_picking: boolean;
    order_note_max_length: number;
    auto_confirm_cod: boolean;
    multi_currency_ready?: boolean;
    country_currencies: CountryCurrency[];
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
  };

  const [form, setForm] = useState<OrderForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const data = await adminApi.orderSettings();
      setForm({
        currency_code: String(data.currency_code ?? "QAR"),
        currency_symbol: String(data.currency_symbol ?? "QAR"),
        currency_decimals: Number(data.currency_decimals ?? 2),
        multi_currency_enabled: data.multi_currency_enabled !== false,
        allow_customer_cancel: Boolean(data.allow_customer_cancel),
        cancel_before_picking: Boolean(data.cancel_before_picking),
        order_note_max_length: Number(data.order_note_max_length ?? 500),
        auto_confirm_cod: Boolean(data.auto_confirm_cod),
        multi_currency_ready: Boolean(data.multi_currency_ready),
        country_currencies: Array.isArray(data.country_currencies) ? data.country_currencies : [],
        currency_health: data.currency_health,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load order settings");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function patchCountry(countryId: number, patch: Partial<CountryCurrency>) {
    setForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        country_currencies: prev.country_currencies.map((row) =>
          row.country_id === countryId
            ? {
                ...row,
                ...patch,
                configured: patch.currency_code !== undefined ? String(patch.currency_code).trim() !== "" : row.configured,
                uses_default: patch.currency_code !== undefined ? String(patch.currency_code).trim() === "" : row.uses_default,
              }
            : row,
        ),
      };
    });
  }

  function applyDefaultToMissing() {
    if (!form) return;
    setForm({
      ...form,
      country_currencies: form.country_currencies.map((row) =>
        row.configured
          ? row
          : {
              ...row,
              currency_code: form.currency_code,
              currency_symbol: form.currency_symbol,
              currency_decimals: form.currency_decimals,
              configured: true,
              uses_default: false,
            },
      ),
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setMsg("");
    setError("");
    try {
      const saved = await adminApi.updateOrderSettings({
        currency_code: form.currency_code.trim().toUpperCase(),
        currency_symbol: form.currency_symbol.trim(),
        currency_decimals: Number(form.currency_decimals),
        multi_currency_enabled: form.multi_currency_enabled,
        allow_customer_cancel: form.allow_customer_cancel,
        cancel_before_picking: form.cancel_before_picking,
        order_note_max_length: Number(form.order_note_max_length),
        auto_confirm_cod: form.auto_confirm_cod,
        country_currencies: form.country_currencies.map((row) => ({
          country_id: row.country_id,
          currency_code: row.currency_code.trim().toUpperCase(),
          currency_symbol: row.currency_symbol.trim() || row.currency_code.trim().toUpperCase(),
          currency_decimals: Number(row.currency_decimals),
        })),
      });
      const data = saved as Awaited<ReturnType<typeof adminApi.orderSettings>>;
      setForm({
        currency_code: String(data.currency_code ?? form.currency_code),
        currency_symbol: String(data.currency_symbol ?? form.currency_symbol),
        currency_decimals: Number(data.currency_decimals ?? form.currency_decimals),
        multi_currency_enabled: data.multi_currency_enabled !== false,
        allow_customer_cancel: Boolean(data.allow_customer_cancel),
        cancel_before_picking: Boolean(data.cancel_before_picking),
        order_note_max_length: Number(data.order_note_max_length ?? form.order_note_max_length),
        auto_confirm_cod: Boolean(data.auto_confirm_cod),
        multi_currency_ready: Boolean(data.multi_currency_ready),
        country_currencies: Array.isArray(data.country_currencies) ? data.country_currencies : form.country_currencies,
        currency_health: data.currency_health,
      });
      setMsg("Order & currency settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const summary = form?.currency_health?.summary;
  const issues = form?.currency_health?.issues ?? [];

  return (
    <SettingsPageShell
      section="Orders & currency"
      title="Order settings"
      subtitle="Default currency plus per-country currencies. When a customer’s country is set, that currency is used; otherwise the default applies."
    >
      {error ? <div className="banner error">{error}</div> : null}
      {msg ? <div className="banner ok">{msg}</div> : null}

      {!form ? (
        <LoadingCard label="Loading order settings" />
      ) : (
        <form className="settings-form card" onSubmit={(e) => void onSubmit(e)}>
          <fieldset className="settings-fieldset">
            <legend>Default currency (fallback)</legend>
            <p className="pf-hint" style={{ marginBottom: 12 }}>
              Used when a country has no currency configured, or multi-currency is off.
            </p>
            <div className="settings-form-grid">
              <label className="pf-field">
                <span className="pf-label">Currency code</span>
                <input
                  value={form.currency_code}
                  onChange={(e) => setForm({ ...form, currency_code: e.target.value.toUpperCase() })}
                  placeholder="QAR"
                  maxLength={8}
                  required
                />
              </label>
              <label className="pf-field">
                <span className="pf-label">Currency symbol</span>
                <input
                  value={form.currency_symbol}
                  onChange={(e) => setForm({ ...form, currency_symbol: e.target.value })}
                  placeholder="QAR"
                  maxLength={16}
                  required
                />
              </label>
              <label className="pf-field">
                <span className="pf-label">Decimal places</span>
                <input
                  type="number"
                  min={0}
                  max={4}
                  value={form.currency_decimals}
                  onChange={(e) => setForm({ ...form, currency_decimals: Number(e.target.value) })}
                  required
                />
              </label>
            </div>
            <div className="settings-toggle-list" style={{ marginTop: 12 }}>
              <SettingsToggle
                label="Multi-currency by country"
                hint="Resolve currency from the customer / store country when configured."
                checked={form.multi_currency_enabled}
                onChange={(v) => setForm({ ...form, multi_currency_enabled: v })}
              />
            </div>
          </fieldset>

          <fieldset className="settings-fieldset">
            <legend>Country currencies</legend>
            {!form.multi_currency_ready ? (
              <div className="banner error">Country currency columns are missing. Run backend migrations.</div>
            ) : null}

            {summary ? (
              <div className="card-grid" style={{ marginBottom: 12 }}>
                <div className="card stat-card">
                  <h3>Active countries</h3>
                  <strong>{summary.active_countries}</strong>
                </div>
                <div className="card stat-card">
                  <h3>Configured</h3>
                  <strong>{summary.configured_countries}</strong>
                </div>
                <div className="card stat-card">
                  <h3>Using default</h3>
                  <strong>{summary.missing_countries}</strong>
                </div>
                <div className="card stat-card">
                  <h3>Distinct currencies</h3>
                  <strong>{summary.distinct_currencies}</strong>
                </div>
              </div>
            ) : null}

            {issues.length ? (
              <div className="currency-health-list">
                {issues.map((issue, idx) => (
                  <div key={`${issue.level}-${idx}`} className={`banner ${issue.level === "error" ? "error" : "warn"}`}>
                    {issue.message}
                  </div>
                ))}
              </div>
            ) : (
              <div className="banner ok">Currency setup looks healthy.</div>
            )}

            <div className="panel-toolbar" style={{ marginTop: 8 }}>
              <span className="muted">Map each country to its checkout / display currency.</span>
              <div className="actions">
                <button type="button" className="btn btn-secondary" onClick={applyDefaultToMissing}>
                  Fill missing with default
                </button>
                <Link className="btn btn-secondary" to="/settings/countries">
                  Manage countries
                </Link>
              </div>
            </div>

            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Country</th>
                    <th>Code</th>
                    <th>Currency</th>
                    <th>Symbol</th>
                    <th>Decimals</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {form.country_currencies.map((row) => (
                    <tr key={row.country_id} className={row.status === 1 ? undefined : "is-inactive"}>
                      <td>
                        <strong>{row.country_name || `#${row.country_id}`}</strong>
                        {row.uses_default ? <div className="muted">Uses default until set</div> : null}
                      </td>
                      <td className="mono muted">{row.country_code || "—"}</td>
                      <td>
                        <input
                          value={row.currency_code}
                          onChange={(e) => patchCountry(row.country_id, { currency_code: e.target.value.toUpperCase() })}
                          placeholder={form.currency_code}
                          maxLength={8}
                          style={{ width: 88 }}
                        />
                      </td>
                      <td>
                        <input
                          value={row.currency_symbol}
                          onChange={(e) => patchCountry(row.country_id, { currency_symbol: e.target.value })}
                          placeholder={form.currency_symbol}
                          maxLength={16}
                          style={{ width: 88 }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          max={4}
                          value={row.currency_decimals}
                          onChange={(e) => patchCountry(row.country_id, { currency_decimals: Number(e.target.value) })}
                          style={{ width: 72 }}
                        />
                      </td>
                      <td>
                        <span className={`settings-status ${row.status === 1 ? "ok" : "warn"}`}>
                          {row.status === 1 ? (row.configured ? "Ready" : "Fallback") : "Off"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!form.country_currencies.length ? (
                    <tr>
                      <td colSpan={6} className="muted">
                        No countries found. Add countries under Settings → Geography.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </fieldset>

          <fieldset className="settings-fieldset">
            <legend>Order behaviour</legend>
            <div className="settings-form-grid">
              <label className="pf-field">
                <span className="pf-label">Order note max length</span>
                <input
                  type="number"
                  min={50}
                  max={2000}
                  value={form.order_note_max_length}
                  onChange={(e) => setForm({ ...form, order_note_max_length: Number(e.target.value) })}
                  required
                />
              </label>
            </div>
            <div className="settings-toggle-list">
              <SettingsToggle
                label="Allow customer cancellation"
                checked={form.allow_customer_cancel}
                onChange={(v) => setForm({ ...form, allow_customer_cancel: v })}
              />
              <SettingsToggle
                label="Cancel only before picking"
                hint="Customers cannot cancel once the order enters the picking stage."
                checked={form.cancel_before_picking}
                onChange={(v) => setForm({ ...form, cancel_before_picking: v })}
              />
              <SettingsToggle
                label="Auto-confirm COD orders"
                hint="COD orders move to Processing immediately without manual approval."
                checked={form.auto_confirm_cod}
                onChange={(v) => setForm({ ...form, auto_confirm_cod: v })}
              />
            </div>
          </fieldset>

          <div className="settings-form-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Saving…" : "Save order settings"}
            </button>
          </div>
        </form>
      )}
    </SettingsPageShell>
  );
}

export function StorefrontSettingsPage() {
  const { form, setForm, busy, msg, error, onSubmit } = useSettingsForm(
    () => adminApi.storefrontSettings(),
    (body) => adminApi.updateStorefrontSettings(body) as Promise<Awaited<ReturnType<typeof adminApi.storefrontSettings>>>,
    (f) => ({ ...f }),
  );

  return (
    <SettingsPageShell
      section="Storefront & support"
      title="Storefront"
      subtitle="Public-facing store identity, support contacts, and maintenance mode."
    >
      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}

      {!form ? (
        <LoadingCard label="Loading storefront settings" />
      ) : (
        <form className="settings-form card" onSubmit={onSubmit}>
          <div className="settings-form-grid">
            <label className="pf-field pf-span-2">
              <span className="pf-label">Storefront name</span>
              <input value={form.storefront_name} onChange={(e) => setForm({ ...form, storefront_name: e.target.value })} required />
            </label>
            <label className="pf-field">
              <span className="pf-label">Support email</span>
              <input type="email" value={form.support_email} onChange={(e) => setForm({ ...form, support_email: e.target.value })} required />
            </label>
            <label className="pf-field">
              <span className="pf-label">Support phone</span>
              <input value={form.support_phone} onChange={(e) => setForm({ ...form, support_phone: e.target.value })} />
            </label>
            <label className="pf-field pf-span-2">
              <span className="pf-label">WhatsApp number</span>
              <input value={form.whatsapp_number} onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })} placeholder="+974 …" />
            </label>
          </div>

          <div className="settings-toggle-list">
            <SettingsToggle
              label="Maintenance mode"
              hint="Show a maintenance banner and block new checkouts on the storefront."
              checked={form.maintenance_mode}
              onChange={(v) => setForm({ ...form, maintenance_mode: v })}
            />
          </div>

          <label className="pf-field">
            <span className="pf-label">Maintenance message</span>
            <textarea
              rows={3}
              value={form.maintenance_message}
              onChange={(e) => setForm({ ...form, maintenance_message: e.target.value })}
            />
          </label>

          <div className="settings-form-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Saving…" : "Save storefront settings"}
            </button>
          </div>
        </form>
      )}
    </SettingsPageShell>
  );
}

export function NotificationsSettingsPage() {
  const { form, setForm, busy, msg, error, onSubmit } = useSettingsForm(
    () => adminApi.notificationSettings(),
    (body) => adminApi.updateNotificationSettings(body) as Promise<Awaited<ReturnType<typeof adminApi.notificationSettings>>>,
    (f) => ({ ...f }),
  );

  return (
    <SettingsPageShell
      section="Notifications"
      title="Notification rules"
      subtitle="Toggle customer and staff notification channels used across orders and auth."
    >
      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}

      {!form ? (
        <LoadingCard label="Loading notification settings" />
      ) : (
        <form className="settings-form card" onSubmit={onSubmit}>
          <div className="settings-toggle-list">
            <SettingsToggle
              label="Order confirmation email"
              checked={form.notify_order_email}
              onChange={(v) => setForm({ ...form, notify_order_email: v })}
            />
            <SettingsToggle
              label="Order status push (FCM)"
              checked={form.notify_order_push}
              onChange={(v) => setForm({ ...form, notify_order_push: v })}
            />
            <SettingsToggle
              label="Promotional push notifications"
              checked={form.notify_promo_push}
              onChange={(v) => setForm({ ...form, notify_promo_push: v })}
            />
            <SettingsToggle
              label="SMS OTP for login"
              checked={form.notify_sms_otp}
              onChange={(v) => setForm({ ...form, notify_sms_otp: v })}
            />
            <SettingsToggle
              label="Low stock email alerts"
              hint="Notify merchandising staff when store stock falls below threshold."
              checked={form.notify_low_stock_email}
              onChange={(v) => setForm({ ...form, notify_low_stock_email: v })}
            />
          </div>
          <div className="settings-form-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Saving…" : "Save notification settings"}
            </button>
          </div>
        </form>
      )}
    </SettingsPageShell>
  );
}
