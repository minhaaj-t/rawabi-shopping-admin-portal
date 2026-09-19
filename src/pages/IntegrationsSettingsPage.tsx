import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  CreditCard,
  Globe2,
  Mail,
  MapPin,
  Plug,
  Shield,
  SlidersHorizontal,
  WhatsApp,
} from "../lib/icons";
import { SettingsPageShell, SettingsToggle } from "../components/SettingsPageShell";
import { isSuperAdmin } from "../lib/auth";
import { adminApi, type IntegrationSettings } from "../lib/api";
import { LoadingCard } from "../components/LoadingIndicator";

export const INTEGRATION_TABS = [
  { id: "payments", label: "Payments" },
  { id: "messaging", label: "Messaging" },
  { id: "auth", label: "Auth" },
  { id: "push", label: "Push" },
  { id: "maps", label: "Maps" },
  { id: "mail", label: "Mail" },
  { id: "media", label: "Media" },
] as const;

export type IntegrationTabId = (typeof INTEGRATION_TABS)[number]["id"];

const SECRET_KEYS = [
  "fcm_server_key",
  "sms_password",
  "google_maps_api_key",
  "google_oauth_client_secret",
  "apple_oauth_private_key",
  "qnb_password",
  "qnb_key",
  "naps_api_key",
  "qpay_api_key",
  "qmp_api_key",
  "fawran_api_key",
  "whatsapp_access_token",
  "mail_password",
] as const;

function StatusPill({ ok, enabled }: { ok: boolean; enabled?: boolean }) {
  if (enabled === false) return <span className="settings-status warn">Disabled</span>;
  return <span className={`settings-status ${ok ? "ok" : "warn"}`}>{ok ? "Configured" : "Not configured"}</span>;
}

type SecretFieldProps = {
  label: string;
  hint: string;
  hasSecret: boolean;
  preview?: string | null;
  value: string;
  onChange: (v: string) => void;
  canEdit: boolean;
  placeholder?: string;
};

function normalizeSecretMask(preview?: string | null): string | null {
  if (!preview) return null;
  const trimmed = preview.trim();
  if (!trimmed) return null;
  if (/^\*+$/.test(trimmed)) return "*******";
  // Prefer trailing plaintext only (e.g. *******34em) - never keep leading chars from old masks.
  const tail = trimmed.match(/([^*]{1,4})$/);
  return `*******${tail ? tail[1] : "••••"}`;
}

function SecretField({ label, hint, hasSecret, preview, value, onChange, canEdit, placeholder }: SecretFieldProps) {
  const mask = hasSecret ? normalizeSecretMask(preview) || "*******••••" : null;

  return (
    <label className="pf-field settings-secret-field">
      <span className="pf-label">{label}</span>
      <span className="pf-hint pf-hint-spacer">
        {canEdit
          ? hasSecret
            ? "Leave blank to keep the current secret."
            : hint
          : "Secret keys are editable by super admin only."}
      </span>
      {canEdit ? (
        <input
          type="password"
          autoComplete="new-password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={mask || placeholder || "Enter new secret"}
          spellCheck={false}
        />
      ) : (
        <div className={`settings-secret-mask mono${hasSecret ? "" : " is-empty"}`} title="Masked - super admin only">
          <span>{mask || "Not set"}</span>
        </div>
      )}
      <span className={`settings-secret-current${mask ? " mono" : ""}`}>
        {canEdit && mask ? `Current: ${mask}` : "\u00A0"}
      </span>
    </label>
  );
}

type FormState = {
  fcm_enabled: boolean;
  fcm_server_key: string;
  fcm_project_id: string;
  fcm_credentials_path: string;
  sms_enabled: boolean;
  sms_gateway_url: string;
  sms_username: string;
  sms_password: string;
  sms_sender: string;
  sms_country_code: string;
  google_maps_enabled: boolean;
  google_maps_api_key: string;
  google_oauth_client_id: string;
  google_oauth_client_secret: string;
  google_oauth_redirect_uri: string;
  apple_oauth_client_id: string;
  apple_oauth_team_id: string;
  apple_oauth_key_id: string;
  apple_oauth_private_key: string;
  apple_oauth_redirect_uri: string;
  qnb_enabled: boolean;
  qnb_merchant_id: string;
  qnb_password: string;
  qnb_key: string;
  qnb_version: string;
  qnb_api_url: string;
  qnb_return_url: string;
  apple_pay_merchant_id: string;
  apple_pay_display_name: string;
  apple_pay_domain: string;
  apple_pay_certificate_ref: string;
  google_pay_merchant_id: string;
  google_pay_merchant_name: string;
  google_pay_gateway_merchant_id: string;
  google_pay_environment: string;
  naps_enabled: boolean;
  naps_merchant_id: string;
  naps_api_key: string;
  naps_api_url: string;
  naps_environment: string;
  qpay_enabled: boolean;
  qpay_merchant_id: string;
  qpay_api_key: string;
  qpay_api_url: string;
  qpay_environment: string;
  qmp_enabled: boolean;
  qmp_merchant_id: string;
  qmp_api_key: string;
  qmp_api_url: string;
  qmp_environment: string;
  fawran_enabled: boolean;
  fawran_merchant_id: string;
  fawran_api_key: string;
  fawran_api_url: string;
  fawran_environment: string;
  mail_enabled: boolean;
  mail_mailer: string;
  mail_host: string;
  mail_port: string;
  mail_username: string;
  mail_password: string;
  mail_encryption: string;
  mail_from_address: string;
  mail_from_name: string;
  whatsapp_enabled: boolean;
  whatsapp_provider: string;
  whatsapp_phone_number_id: string;
  whatsapp_access_token: string;
  whatsapp_graph_version: string;
  whatsapp_api_url: string;
  whatsapp_api_auth: string;
  whatsapp_api_token_param: string;
  whatsapp_api_body_format: string;
  whatsapp_api_body_template: string;
  whatsapp_api_headers_json: string;
  assets_production_url: string;
  assets_development_url: string;
};

function fromApi(data: IntegrationSettings): FormState {
  return {
    fcm_enabled: data.fcm.enabled !== false,
    fcm_server_key: "",
    fcm_project_id: data.fcm.project_id || "",
    fcm_credentials_path: data.fcm.credentials_path || "",
    sms_enabled: data.sms.enabled !== false,
    sms_gateway_url: data.sms.gateway_url || "",
    sms_username: data.sms.username || "",
    sms_password: "",
    sms_sender: data.sms.sender || "",
    sms_country_code: data.sms.country_code || "",
    google_maps_enabled: data.google_maps.enabled !== false,
    google_maps_api_key: "",
    google_oauth_client_id: data.google_oauth?.client_id || "",
    google_oauth_client_secret: "",
    google_oauth_redirect_uri: data.google_oauth?.redirect_uri || "",
    apple_oauth_client_id: data.apple_oauth?.client_id || "",
    apple_oauth_team_id: data.apple_oauth?.team_id || "",
    apple_oauth_key_id: data.apple_oauth?.key_id || "",
    apple_oauth_private_key: "",
    apple_oauth_redirect_uri: data.apple_oauth?.redirect_uri || "",
    qnb_enabled: data.qnb_ipay.enabled !== false,
    qnb_merchant_id: data.qnb_ipay.merchant_id || "",
    qnb_password: "",
    qnb_key: "",
    qnb_version: data.qnb_ipay.version || "",
    qnb_api_url: data.qnb_ipay.api_url || "",
    qnb_return_url: data.qnb_ipay.return_url || "",
    apple_pay_merchant_id: data.apple_pay?.merchant_id || "",
    apple_pay_display_name: data.apple_pay?.display_name || "Rawabi Shopping",
    apple_pay_domain: data.apple_pay?.domain || "",
    apple_pay_certificate_ref: data.apple_pay?.certificate_ref || "",
    google_pay_merchant_id: data.google_pay?.merchant_id || "",
    google_pay_merchant_name: data.google_pay?.merchant_name || "Rawabi Shopping",
    google_pay_gateway_merchant_id: data.google_pay?.gateway_merchant_id || "",
    google_pay_environment: data.google_pay?.environment || "TEST",
    naps_enabled: Boolean(data.naps?.enabled),
    naps_merchant_id: data.naps?.merchant_id || "",
    naps_api_key: "",
    naps_api_url: data.naps?.api_url || "",
    naps_environment: data.naps?.environment || "sandbox",
    qpay_enabled: Boolean(data.qpay?.enabled),
    qpay_merchant_id: data.qpay?.merchant_id || "",
    qpay_api_key: "",
    qpay_api_url: data.qpay?.api_url || "",
    qpay_environment: data.qpay?.environment || "sandbox",
    qmp_enabled: Boolean(data.qmp?.enabled),
    qmp_merchant_id: data.qmp?.merchant_id || "",
    qmp_api_key: "",
    qmp_api_url: data.qmp?.api_url || "",
    qmp_environment: data.qmp?.environment || "sandbox",
    fawran_enabled: Boolean(data.fawran?.enabled),
    fawran_merchant_id: data.fawran?.merchant_id || "",
    fawran_api_key: "",
    fawran_api_url: data.fawran?.api_url || "",
    fawran_environment: data.fawran?.environment || "sandbox",
    mail_enabled: data.mail.enabled !== false,
    mail_mailer: data.mail.mailer || "smtp",
    mail_host: data.mail.host || "",
    mail_port: String(data.mail.port || "587"),
    mail_username: data.mail.username || "",
    mail_password: "",
    mail_encryption: data.mail.encryption || "tls",
    mail_from_address: data.mail.from_address || "",
    mail_from_name: data.mail.from_name || "",
    whatsapp_enabled: Boolean(data.whatsapp?.enabled),
    whatsapp_provider: data.whatsapp?.provider || "meta",
    whatsapp_phone_number_id: data.whatsapp?.phone_number_id || "",
    whatsapp_access_token: "",
    whatsapp_graph_version: data.whatsapp?.graph_version || "v21.0",
    whatsapp_api_url: data.whatsapp?.api_url || "",
    whatsapp_api_auth: data.whatsapp?.api_auth || "bearer",
    whatsapp_api_token_param: data.whatsapp?.api_token_param || "token",
    whatsapp_api_body_format: data.whatsapp?.api_body_format || "json_text",
    whatsapp_api_body_template: data.whatsapp?.api_body_template || "",
    whatsapp_api_headers_json: data.whatsapp?.api_headers_json || "",
    assets_production_url: data.assets.production_url || "",
    assets_development_url: data.assets.development_url || "",
  };
}

export function useIntegrationEditor() {
  const [data, setData] = useState<IntegrationSettings | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const canEditSecrets = Boolean(data?.can_edit_secrets) && isSuperAdmin();

  async function load() {
    setError("");
    try {
      const next = await adminApi.integrationSettings();
      setData(next);
      setForm(fromApi(next));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load integrations");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function save() {
    if (!form) return;
    setBusy(true);
    setMsg("");
    setError("");
    try {
      const body: Record<string, unknown> = { ...form };
      for (const key of SECRET_KEYS) {
        if (!canEditSecrets || !String(body[key] || "").trim()) delete body[key];
      }
      const saved = await adminApi.updateIntegrationSettings(body);
      setData(saved);
      setForm(fromApi(saved));
      setMsg("Integrations saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await save();
  }

  return { data, form, error, msg, busy, canEditSecrets, load, patch, save, onSubmit };
}

type CategoryFieldsProps = {
  category: IntegrationTabId;
  data: IntegrationSettings;
  form: FormState;
  patch: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  canEditSecrets: boolean;
};

export function IntegrationCategoryFields({ category, data, form, patch, canEditSecrets }: CategoryFieldsProps) {
  if (category === "push") {
    return (
          <fieldset className="settings-fieldset">
            <legend>
              <Plug size={16} aria-hidden /> Firebase Cloud Messaging
              <StatusPill ok={data.fcm.configured} enabled={form.fcm_enabled} />
            </legend>
            <div className="settings-toggle-list">
              <SettingsToggle
                label="Enable FCM"
                hint="Push notifications for orders and promos."
                checked={form.fcm_enabled}
                onChange={(v) => patch("fcm_enabled", v)}
              />
            </div>
            <div className="settings-fields">
              <label className="pf-field">
                <span className="pf-label">Project ID</span>
                <span className="pf-hint pf-hint-spacer">Firebase project identifier</span>
                <input value={form.fcm_project_id} onChange={(e) => patch("fcm_project_id", e.target.value)} spellCheck={false} />
              </label>
              <SecretField
                label="Server key"
                hint="FCM legacy server key"
                hasSecret={Boolean(data.fcm.has_server_key)}
                preview={data.fcm.server_key_preview}
                value={form.fcm_server_key}
                onChange={(v) => patch("fcm_server_key", v)}
                canEdit={canEditSecrets}
              />
              <label className="pf-field pf-span-2">
                <span className="pf-label">Credentials path</span>
                <span className="pf-hint">Optional service-account JSON path on the server</span>
                <input
                  value={form.fcm_credentials_path}
                  onChange={(e) => patch("fcm_credentials_path", e.target.value)}
                  spellCheck={false}
                  placeholder="storage/app/firebase/rawabi-push.json"
                />
              </label>
            </div>
          </fieldset>
    );
  }

  if (category === "messaging") {
    return (
      <>
          <fieldset className="settings-fieldset">
            <legend>
              <SlidersHorizontal size={16} aria-hidden /> SMS gateway
              <StatusPill ok={data.sms.configured} enabled={form.sms_enabled} />
            </legend>
            <div className="settings-toggle-list">
              <SettingsToggle
                label="Enable SMS"
                hint="OTP and transactional SMS via Vodafone Connect (or configured gateway)."
                checked={form.sms_enabled}
                onChange={(v) => patch("sms_enabled", v)}
              />
            </div>
            <div className="settings-fields">
              <label className="pf-field pf-span-2">
                <span className="pf-label">Gateway URL</span>
                <span className="pf-hint pf-hint-spacer">Full SMS API endpoint</span>
                <input value={form.sms_gateway_url} onChange={(e) => patch("sms_gateway_url", e.target.value)} spellCheck={false} />
              </label>
              <label className="pf-field">
                <span className="pf-label">Username</span>
                <span className="pf-hint pf-hint-spacer">Gateway account username</span>
                <input value={form.sms_username} onChange={(e) => patch("sms_username", e.target.value)} spellCheck={false} />
              </label>
              <SecretField
                label="Password"
                hint="SMS gateway password"
                hasSecret={Boolean(data.sms.has_password)}
                preview={data.sms.password_preview}
                value={form.sms_password}
                onChange={(v) => patch("sms_password", v)}
                canEdit={canEditSecrets}
              />
              <label className="pf-field">
                <span className="pf-label">Sender</span>
                <span className="pf-hint pf-hint-spacer">Sender ID shown on SMS</span>
                <input value={form.sms_sender} onChange={(e) => patch("sms_sender", e.target.value)} />
              </label>
              <label className="pf-field">
                <span className="pf-label">Country code</span>
                <span className="pf-hint pf-hint-spacer">Default dialing code</span>
                <input value={form.sms_country_code} onChange={(e) => patch("sms_country_code", e.target.value)} />
              </label>
            </div>
          </fieldset>

          <fieldset className="settings-fieldset">
            <legend>
              <WhatsApp size={16} aria-hidden /> WhatsApp
              <StatusPill ok={Boolean(data.whatsapp?.configured)} enabled={form.whatsapp_enabled} />
            </legend>
            <div className="settings-toggle-list">
              <SettingsToggle
                label="Enable WhatsApp"
                hint="Send support / invoice notices via Meta Cloud API or another project's HTTP API."
                checked={form.whatsapp_enabled}
                onChange={(v) => patch("whatsapp_enabled", v)}
              />
            </div>
            <div className="settings-fields">
              <label className="pf-field">
                <span className="pf-label">Provider / API format</span>
                <span className="pf-hint pf-hint-spacer">Meta Cloud API or connected project custom API</span>
                <select value={form.whatsapp_provider} onChange={(e) => patch("whatsapp_provider", e.target.value)}>
                  <option value="meta">Meta Cloud API</option>
                  <option value="custom">Other project API (custom)</option>
                </select>
              </label>
              <SecretField
                label={form.whatsapp_provider === "custom" ? "API token" : "Access token"}
                hint={
                  form.whatsapp_provider === "custom"
                    ? "Token / key expected by the other project API"
                    : "WhatsApp permanent or system-user token"
                }
                hasSecret={Boolean(data.whatsapp?.has_access_token)}
                preview={data.whatsapp?.access_token_preview}
                value={form.whatsapp_access_token}
                onChange={(v) => patch("whatsapp_access_token", v)}
                canEdit={canEditSecrets}
              />
              {form.whatsapp_provider === "meta" ? (
                <>
                  <label className="pf-field">
                    <span className="pf-label">Phone number ID</span>
                    <span className="pf-hint pf-hint-spacer">Meta phone number ID</span>
                    <input
                      value={form.whatsapp_phone_number_id}
                      onChange={(e) => patch("whatsapp_phone_number_id", e.target.value)}
                      spellCheck={false}
                    />
                  </label>
                  <label className="pf-field">
                    <span className="pf-label">Graph version</span>
                    <span className="pf-hint pf-hint-spacer">e.g. v21.0</span>
                    <input value={form.whatsapp_graph_version} onChange={(e) => patch("whatsapp_graph_version", e.target.value)} />
                  </label>
                </>
              ) : (
                <>
                  <label className="pf-field pf-span-2">
                    <span className="pf-label">API URL</span>
                    <span className="pf-hint">Full send endpoint from the other project (POST)</span>
                    <input
                      value={form.whatsapp_api_url}
                      onChange={(e) => patch("whatsapp_api_url", e.target.value)}
                      spellCheck={false}
                      placeholder="https://api.example.com/v1/messages"
                    />
                  </label>
                  <label className="pf-field">
                    <span className="pf-label">Auth style</span>
                    <span className="pf-hint pf-hint-spacer">How the other API expects the token</span>
                    <select value={form.whatsapp_api_auth} onChange={(e) => patch("whatsapp_api_auth", e.target.value)}>
                      <option value="bearer">Bearer Authorization</option>
                      <option value="query_token">Query string token</option>
                      <option value="header_x_api_key">X-Api-Key header</option>
                      <option value="none">No auth header</option>
                    </select>
                  </label>
                  <label className="pf-field">
                    <span className="pf-label">Query token param</span>
                    <span className="pf-hint pf-hint-spacer">Used when auth = query string</span>
                    <input
                      value={form.whatsapp_api_token_param}
                      onChange={(e) => patch("whatsapp_api_token_param", e.target.value)}
                      spellCheck={false}
                      placeholder="token"
                    />
                  </label>
                  <label className="pf-field">
                    <span className="pf-label">Body format</span>
                    <span className="pf-hint pf-hint-spacer">Match the other project's request JSON</span>
                    <select
                      value={form.whatsapp_api_body_format}
                      onChange={(e) => patch("whatsapp_api_body_format", e.target.value)}
                    >
                      <option value="json_text">Generic JSON {"{to, body, type}"}</option>
                      <option value="whapi">Whapi.Cloud text</option>
                      <option value="ultramsg">UltraMsg chat</option>
                      <option value="meta_proxy">Meta-compatible proxy</option>
                      <option value="custom">Custom JSON template</option>
                    </select>
                  </label>
                  <label className="pf-field pf-span-2">
                    <span className="pf-label">Extra headers (JSON)</span>
                    <span className="pf-hint">Optional - e.g. {"{"}&quot;X-Project-Id&quot;:&quot;abc&quot;{"}"}</span>
                    <input
                      value={form.whatsapp_api_headers_json}
                      onChange={(e) => patch("whatsapp_api_headers_json", e.target.value)}
                      spellCheck={false}
                      placeholder='{"X-Project-Id":"..."}'
                    />
                  </label>
                  {form.whatsapp_api_body_format === "custom" ? (
                    <label className="pf-field pf-span-2">
                      <span className="pf-label">Custom body template</span>
                      <span className="pf-hint">
                        JSON with {"{{phone}}"}, {"{{message}}"}, {"{{token}}"}, {"{{filename}}"}, {"{{caption}}"}
                      </span>
                      <textarea
                        rows={6}
                        value={form.whatsapp_api_body_template}
                        onChange={(e) => patch("whatsapp_api_body_template", e.target.value)}
                        spellCheck={false}
                        placeholder={'{\n  "to": "{{phone}}",\n  "text": "{{message}}"\n}'}
                      />
                    </label>
                  ) : (
                    <p className="settings-fieldset-note pf-span-2">
                      Selected format posts to your API URL using placeholders <code>phone</code> / <code>message</code>
                      {form.whatsapp_api_body_format === "ultramsg" ? (
                        <>
                          {" "}
                          (+ <code>token</code> in body)
                        </>
                      ) : null}
                      .
                    </p>
                  )}
                </>
              )}
            </div>
          </fieldset>
      </>
    );
  }

  if (category === "auth") {
    return (
      <>
        <fieldset className="settings-fieldset">
          <legend>
            <Shield size={16} aria-hidden /> Google OAuth
            <StatusPill ok={Boolean(data.google_oauth?.configured)} />
          </legend>
          <p className="pf-hint" style={{ marginBottom: 12 }}>
            Used when{" "}
            <Link to="/settings/auth">Authentication &amp; security</Link> enables Continue with Google. Create an OAuth
            client in Google Cloud Console (Web application).
          </p>
          <div className="settings-fields">
            <label className="pf-field pf-span-2">
              <span className="pf-label">Client ID</span>
              <span className="pf-hint pf-hint-spacer">Google OAuth 2.0 client ID</span>
              <input
                value={form.google_oauth_client_id}
                onChange={(e) => patch("google_oauth_client_id", e.target.value)}
                spellCheck={false}
                placeholder="xxxxx.apps.googleusercontent.com"
              />
            </label>
            <SecretField
              label="Client secret"
              hint="Google OAuth client secret"
              hasSecret={Boolean(data.google_oauth?.has_client_secret)}
              preview={data.google_oauth?.client_secret_preview}
              value={form.google_oauth_client_secret}
              onChange={(v) => patch("google_oauth_client_secret", v)}
              canEdit={canEditSecrets}
            />
            <label className="pf-field pf-span-2">
              <span className="pf-label">Redirect URI</span>
              <span className="pf-hint">Authorized redirect URI registered with Google</span>
              <input
                value={form.google_oauth_redirect_uri}
                onChange={(e) => patch("google_oauth_redirect_uri", e.target.value)}
                spellCheck={false}
                placeholder="https://rawabihypermarket.com/api/auth/google/callback"
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="settings-fieldset">
          <legend>
            <Shield size={16} aria-hidden /> Sign in with Apple
            <StatusPill ok={Boolean(data.apple_oauth?.configured)} />
          </legend>
          <p className="pf-hint" style={{ marginBottom: 12 }}>
            Configure in Apple Developer → Identifiers → Services ID. Enable the method under{" "}
            <Link to="/settings/auth">Authentication &amp; security</Link>.
          </p>
          <div className="settings-fields">
            <label className="pf-field">
              <span className="pf-label">Services ID (client ID)</span>
              <span className="pf-hint pf-hint-spacer">e.g. com.rawabi.app.signin</span>
              <input
                value={form.apple_oauth_client_id}
                onChange={(e) => patch("apple_oauth_client_id", e.target.value)}
                spellCheck={false}
              />
            </label>
            <label className="pf-field">
              <span className="pf-label">Team ID</span>
              <span className="pf-hint pf-hint-spacer">10-character Apple Team ID</span>
              <input
                value={form.apple_oauth_team_id}
                onChange={(e) => patch("apple_oauth_team_id", e.target.value)}
                spellCheck={false}
              />
            </label>
            <label className="pf-field">
              <span className="pf-label">Key ID</span>
              <span className="pf-hint pf-hint-spacer">Sign in with Apple key ID</span>
              <input
                value={form.apple_oauth_key_id}
                onChange={(e) => patch("apple_oauth_key_id", e.target.value)}
                spellCheck={false}
              />
            </label>
            <label className="pf-field pf-span-2">
              <span className="pf-label">Redirect URI</span>
              <span className="pf-hint">Return URL registered with Apple</span>
              <input
                value={form.apple_oauth_redirect_uri}
                onChange={(e) => patch("apple_oauth_redirect_uri", e.target.value)}
                spellCheck={false}
                placeholder="https://rawabihypermarket.com/api/auth/apple/callback"
              />
            </label>
            <SecretField
              label="Private key (.p8)"
              hint="Paste the full .p8 private key contents"
              hasSecret={Boolean(data.apple_oauth?.has_private_key)}
              preview={data.apple_oauth?.private_key_preview}
              value={form.apple_oauth_private_key}
              onChange={(v) => patch("apple_oauth_private_key", v)}
              canEdit={canEditSecrets}
              placeholder="-----BEGIN PRIVATE KEY-----"
            />
          </div>
        </fieldset>
      </>
    );
  }

  if (category === "maps") {
    return (
          <fieldset className="settings-fieldset">
            <legend>
              <MapPin size={16} aria-hidden /> Google Maps
              <StatusPill ok={data.google_maps.configured} enabled={form.google_maps_enabled} />
            </legend>
            <div className="settings-toggle-list">
              <SettingsToggle
                label="Enable Google Maps"
                hint="Address picker and delivery maps."
                checked={form.google_maps_enabled}
                onChange={(v) => patch("google_maps_enabled", v)}
              />
            </div>
            <div className="settings-fields">
              <SecretField
                label="API key"
                hint="Browser / server Maps key"
                hasSecret={Boolean(data.google_maps.has_api_key)}
                preview={data.google_maps.api_key_preview}
                value={form.google_maps_api_key}
                onChange={(v) => patch("google_maps_api_key", v)}
                canEdit={canEditSecrets}
              />
            </div>
          </fieldset>
    );
  }

  if (category === "payments") {
    return (
      <>
          <fieldset className="settings-fieldset">
            <legend>
              <CreditCard size={16} aria-hidden /> QNB iPay
              <StatusPill ok={data.qnb_ipay.configured} enabled={form.qnb_enabled} />
            </legend>
            <div className="settings-toggle-list">
              <SettingsToggle
                label="Enable QNB iPay"
                hint="Online card payments at checkout."
                checked={form.qnb_enabled}
                onChange={(v) => patch("qnb_enabled", v)}
              />
            </div>
            <div className="settings-fields">
              <label className="pf-field">
                <span className="pf-label">Merchant ID</span>
                <span className="pf-hint pf-hint-spacer">QNB merchant identifier</span>
                <input value={form.qnb_merchant_id} onChange={(e) => patch("qnb_merchant_id", e.target.value)} spellCheck={false} />
              </label>
              <label className="pf-field">
                <span className="pf-label">Version</span>
                <span className="pf-hint pf-hint-spacer">API version string</span>
                <input value={form.qnb_version} onChange={(e) => patch("qnb_version", e.target.value)} />
              </label>
              <SecretField
                label="Password"
                hint="QNB gateway password"
                hasSecret={Boolean(data.qnb_ipay.has_password)}
                preview={data.qnb_ipay.password_preview}
                value={form.qnb_password}
                onChange={(v) => patch("qnb_password", v)}
                canEdit={canEditSecrets}
              />
              <SecretField
                label="Key"
                hint="QNB gateway key"
                hasSecret={Boolean(data.qnb_ipay.has_key)}
                preview={data.qnb_ipay.key_preview}
                value={form.qnb_key}
                onChange={(v) => patch("qnb_key", v)}
                canEdit={canEditSecrets}
              />
              <label className="pf-field pf-span-2">
                <span className="pf-label">API URL</span>
                <span className="pf-hint pf-hint-spacer">Payment gateway endpoint</span>
                <input value={form.qnb_api_url} onChange={(e) => patch("qnb_api_url", e.target.value)} spellCheck={false} />
              </label>
              <label className="pf-field pf-span-2">
                <span className="pf-label">Return URL</span>
                <span className="pf-hint pf-hint-spacer">Post-payment browser return URL</span>
                <input value={form.qnb_return_url} onChange={(e) => patch("qnb_return_url", e.target.value)} spellCheck={false} />
              </label>
            </div>
          </fieldset>

          <fieldset className="settings-fieldset">
            <legend>
              <CreditCard size={16} aria-hidden /> Apple Pay (via QNB)
              <StatusPill ok={Boolean(data.apple_pay?.configured)} enabled={form.qnb_enabled} />
            </legend>
            <p className="pf-hint" style={{ marginBottom: 12 }}>
              Apple Pay runs through QNB iPay. Complete QNB credentials above, then register the Apple merchant ID and verified domain with QNB / Apple Developer.
            </p>
            <ol className="finance-wallet-steps">
              <li>Ask QNB to enable Apple Pay on your merchant account.</li>
              <li>Create an Apple Pay Merchant ID in Apple Developer (e.g. merchant.com.rawabi).</li>
              <li>Verify your checkout domain and upload the payment processing certificate if QNB requests it.</li>
              <li>Paste the IDs below and test on Safari / iPhone.</li>
            </ol>
            <div className="settings-fields">
              <label className="pf-field">
                <span className="pf-label">Apple Merchant ID</span>
                <span className="pf-hint pf-hint-spacer">merchant.com.yourbrand</span>
                <input value={form.apple_pay_merchant_id} onChange={(e) => patch("apple_pay_merchant_id", e.target.value)} spellCheck={false} />
              </label>
              <label className="pf-field">
                <span className="pf-label">Display name</span>
                <span className="pf-hint pf-hint-spacer">Shown on the Apple Pay sheet</span>
                <input value={form.apple_pay_display_name} onChange={(e) => patch("apple_pay_display_name", e.target.value)} />
              </label>
              <label className="pf-field">
                <span className="pf-label">Verified domain</span>
                <span className="pf-hint pf-hint-spacer">Checkout host, e.g. shop.rawabi.com</span>
                <input value={form.apple_pay_domain} onChange={(e) => patch("apple_pay_domain", e.target.value)} spellCheck={false} />
              </label>
              <label className="pf-field">
                <span className="pf-label">Certificate / profile ref</span>
                <span className="pf-hint pf-hint-spacer">QNB or Apple cert reference ID</span>
                <input value={form.apple_pay_certificate_ref} onChange={(e) => patch("apple_pay_certificate_ref", e.target.value)} spellCheck={false} />
              </label>
            </div>
          </fieldset>

          <fieldset className="settings-fieldset">
            <legend>
              <CreditCard size={16} aria-hidden /> Google Pay (via QNB)
              <StatusPill ok={Boolean(data.google_pay?.configured)} enabled={form.qnb_enabled} />
            </legend>
            <p className="pf-hint" style={{ marginBottom: 12 }}>
              Google Pay tokenizes cards through QNB. Use TEST until QNB confirms production readiness.
            </p>
            <ol className="finance-wallet-steps">
              <li>Enable Google Pay with QNB for your merchant ID.</li>
              <li>Create / claim a Google Pay Business Console merchant ID.</li>
              <li>Set gateway merchant ID to your QNB merchant ID (unless QNB gives a separate value).</li>
              <li>Save credentials and test on Android Chrome before switching to PRODUCTION.</li>
            </ol>
            <div className="settings-fields">
              <label className="pf-field">
                <span className="pf-label">Google Merchant ID</span>
                <span className="pf-hint pf-hint-spacer">From Google Pay Business Console</span>
                <input value={form.google_pay_merchant_id} onChange={(e) => patch("google_pay_merchant_id", e.target.value)} spellCheck={false} />
              </label>
              <label className="pf-field">
                <span className="pf-label">Merchant name</span>
                <span className="pf-hint pf-hint-spacer">Shown on the Google Pay sheet</span>
                <input value={form.google_pay_merchant_name} onChange={(e) => patch("google_pay_merchant_name", e.target.value)} />
              </label>
              <label className="pf-field">
                <span className="pf-label">Gateway merchant ID</span>
                <span className="pf-hint pf-hint-spacer">Usually your QNB merchant ID</span>
                <input value={form.google_pay_gateway_merchant_id} onChange={(e) => patch("google_pay_gateway_merchant_id", e.target.value)} spellCheck={false} />
              </label>
              <label className="pf-field">
                <span className="pf-label">Environment</span>
                <span className="pf-hint pf-hint-spacer">TEST until go-live</span>
                <select value={form.google_pay_environment} onChange={(e) => patch("google_pay_environment", e.target.value)}>
                  <option value="TEST">TEST</option>
                  <option value="PRODUCTION">PRODUCTION</option>
                </select>
              </label>
            </div>
          </fieldset>

          {(
            [
              {
                code: "naps" as const,
                title: "NAPS",
                hint: "Qatar domestic debit network (QCB retail payments). Store credentials until the PSP adapter is wired.",
              },
              {
                code: "qpay" as const,
                title: "QPay",
                hint: "First-class QPay rail (separate from QNB response fields).",
              },
              {
                code: "qmp" as const,
                title: "QMP",
                hint: "Qatar Mobile Payment. Enable when your acquirer issues QMP credentials.",
              },
              {
                code: "fawran" as const,
                title: "Fawran",
                hint: "Instant account-to-account credit transfer.",
              },
            ] as const
          ).map((rail) => {
            const status = data[rail.code];
            const enabledKey = `${rail.code}_enabled` as keyof FormState;
            const merchantKey = `${rail.code}_merchant_id` as keyof FormState;
            const keyKey = `${rail.code}_api_key` as keyof FormState;
            const urlKey = `${rail.code}_api_url` as keyof FormState;
            const envKey = `${rail.code}_environment` as keyof FormState;
            return (
              <fieldset key={rail.code} className="settings-fieldset">
                <legend>
                  <CreditCard size={16} aria-hidden /> {rail.title}
                  <StatusPill ok={Boolean(status?.configured)} enabled={Boolean(form[enabledKey])} />
                </legend>
                <p className="pf-hint" style={{ marginBottom: 12 }}>
                  {rail.hint}
                </p>
                <div className="settings-toggle-list">
                  <SettingsToggle
                    label={`Enable ${rail.title} gateway`}
                    hint="Gateway credentials only — also turn on the checkout method under Payment methods."
                    checked={Boolean(form[enabledKey])}
                    onChange={(v) => patch(enabledKey, v)}
                  />
                </div>
                <div className="settings-fields">
                  <label className="pf-field">
                    <span className="pf-label">Merchant ID</span>
                    <span className="pf-hint pf-hint-spacer">Issued by your Qatar payments provider</span>
                    <input
                      value={String(form[merchantKey] || "")}
                      onChange={(e) => patch(merchantKey, e.target.value)}
                      spellCheck={false}
                    />
                  </label>
                  <label className="pf-field">
                    <span className="pf-label">Environment</span>
                    <span className="pf-hint pf-hint-spacer">Sandbox until go-live</span>
                    <select value={String(form[envKey] || "sandbox")} onChange={(e) => patch(envKey, e.target.value)}>
                      <option value="sandbox">sandbox</option>
                      <option value="production">production</option>
                    </select>
                  </label>
                  <SecretField
                    label="API key"
                    hint={`${rail.title} secret`}
                    hasSecret={Boolean(status?.has_api_key)}
                    preview={status?.api_key_preview}
                    value={String(form[keyKey] || "")}
                    onChange={(v) => patch(keyKey, v)}
                    canEdit={canEditSecrets}
                  />
                  <label className="pf-field pf-span-2">
                    <span className="pf-label">API URL</span>
                    <span className="pf-hint pf-hint-spacer">Provider endpoint</span>
                    <input
                      value={String(form[urlKey] || "")}
                      onChange={(e) => patch(urlKey, e.target.value)}
                      spellCheck={false}
                    />
                  </label>
                </div>
              </fieldset>
            );
          })}
      </>
    );
  }

  if (category === "mail") {
    return (
          <fieldset className="settings-fieldset">
            <legend>
              <Mail size={16} aria-hidden /> Mail / SMTP
              <StatusPill ok={Boolean(data.mail.configured)} enabled={form.mail_enabled} />
            </legend>
            <div className="settings-toggle-list">
              <SettingsToggle
                label="Enable outbound mail"
                hint="System emails (orders, support, OTP). Requires SMTP credentials unless mailer is log."
                checked={form.mail_enabled}
                onChange={(v) => patch("mail_enabled", v)}
              />
            </div>
            <div className="settings-fields">
              <label className="pf-field">
                <span className="pf-label">Mailer</span>
                <span className="pf-hint pf-hint-spacer">Transport used to send email</span>
                <select value={form.mail_mailer} onChange={(e) => patch("mail_mailer", e.target.value)}>
                  <option value="smtp">SMTP</option>
                  <option value="log">Log only (dev)</option>
                  <option value="sendmail">Sendmail</option>
                </select>
              </label>
              <label className="pf-field">
                <span className="pf-label">Encryption</span>
                <span className="pf-hint pf-hint-spacer">TLS (587) or SSL (465)</span>
                <select value={form.mail_encryption} onChange={(e) => patch("mail_encryption", e.target.value)}>
                  <option value="tls">TLS</option>
                  <option value="ssl">SSL</option>
                  <option value="none">None</option>
                </select>
              </label>
              <label className="pf-field">
                <span className="pf-label">SMTP host</span>
                <span className="pf-hint pf-hint-spacer">e.g. smtp.gmail.com or smtp.office365.com</span>
                <input
                  value={form.mail_host}
                  onChange={(e) => patch("mail_host", e.target.value)}
                  spellCheck={false}
                  placeholder="smtp.example.com"
                  autoComplete="off"
                />
              </label>
              <label className="pf-field">
                <span className="pf-label">Port</span>
                <span className="pf-hint pf-hint-spacer">Usually 587 (TLS) or 465 (SSL)</span>
                <input value={form.mail_port} onChange={(e) => patch("mail_port", e.target.value)} inputMode="numeric" />
              </label>
              <label className="pf-field">
                <span className="pf-label">Username</span>
                <span className="pf-hint pf-hint-spacer">SMTP login / mailbox address</span>
                <input
                  value={form.mail_username}
                  onChange={(e) => patch("mail_username", e.target.value)}
                  spellCheck={false}
                  autoComplete="off"
                />
              </label>
              <SecretField
                label="Password"
                hint="SMTP password or app password"
                hasSecret={Boolean(data.mail.has_password)}
                preview={data.mail.password_preview}
                value={form.mail_password}
                onChange={(v) => patch("mail_password", v)}
                canEdit={canEditSecrets}
              />
              <label className="pf-field">
                <span className="pf-label">From address</span>
                <span className="pf-hint pf-hint-spacer">System email sender address</span>
                <input type="email" value={form.mail_from_address} onChange={(e) => patch("mail_from_address", e.target.value)} />
              </label>
              <label className="pf-field">
                <span className="pf-label">From name</span>
                <span className="pf-hint pf-hint-spacer">Display name on outbound mail</span>
                <input value={form.mail_from_name} onChange={(e) => patch("mail_from_name", e.target.value)} />
              </label>
            </div>
          </fieldset>
    );
  }

  if (category === "media") {
    return (
          <fieldset className="settings-fieldset">
            <legend>
              <Globe2 size={16} aria-hidden /> Asset hosts
              <StatusPill ok={Boolean(data.assets.production_url)} />
            </legend>
            <div className="settings-fields">
              <label className="pf-field">
                <span className="pf-label">Production assets URL</span>
                <span className="pf-hint pf-hint-spacer">CDN / media base for production</span>
                <input
                  type="url"
                  value={form.assets_production_url}
                  onChange={(e) => patch("assets_production_url", e.target.value)}
                  spellCheck={false}
                />
              </label>
              <label className="pf-field">
                <span className="pf-label">Development assets URL</span>
                <span className="pf-hint pf-hint-spacer">CDN / media base for development</span>
                <input
                  type="url"
                  value={form.assets_development_url}
                  onChange={(e) => patch("assets_development_url", e.target.value)}
                  spellCheck={false}
                />
              </label>
            </div>
          </fieldset>
    );
  }

  return null;
}

type EditorFormProps = {
  tabs?: readonly { id: IntegrationTabId; label: string }[];
  defaultTab?: IntegrationTabId;
  compact?: boolean;
};

export function IntegrationsEditorForm({ tabs = INTEGRATION_TABS, defaultTab, compact }: EditorFormProps) {
  const editor = useIntegrationEditor();
  const [params, setParams] = useSearchParams();
  const allowed = tabs.map((t) => t.id);
  const requested = params.get("tab") as IntegrationTabId | null;
  const tab = requested && allowed.includes(requested) ? requested : defaultTab && allowed.includes(defaultTab) ? defaultTab : allowed[0];

  function setTab(id: IntegrationTabId) {
    const next = new URLSearchParams(params);
    next.set("tab", id);
    setParams(next, { replace: true });
  }

  const { data, form, error, msg, busy, canEditSecrets, load, onSubmit, patch } = editor;

  return (
    <>
      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}
      {!canEditSecrets && data ? (
        <div className="alert alert-info">Secret keys are view-only (masked). Ask a super admin to rotate them.</div>
      ) : null}
      {!data || !form ? (
        <LoadingCard label="Loading integrations" />
      ) : (
        <form className={`settings-form card settings-integrations-form${compact ? " is-compact" : ""}`} onSubmit={(e) => void onSubmit(e)}>
          {tabs.length > 1 ? (
          <div className="tabs settings-category-tabs" role="tablist" aria-label="Integration categories">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`integration-tab-${item.id}`}
                aria-selected={tab === item.id}
                aria-controls={`integration-panel-${item.id}`}
                className={tab === item.id ? "active" : undefined}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          ) : null}
          {tabs.map((item) => (
            <div
              key={item.id}
              id={`integration-panel-${item.id}`}
              role="tabpanel"
              aria-labelledby={`integration-tab-${item.id}`}
              hidden={tab !== item.id}
            >
              <IntegrationCategoryFields
                category={item.id}
                data={data}
                form={form}
                patch={patch}
                canEditSecrets={canEditSecrets}
              />
            </div>
          ))}
          <div className="settings-form-actions">
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void load()}>
              Reset
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Saving..." : "Save integrations"}
            </button>
          </div>
        </form>
      )}
    </>
  );
}

export function IntegrationsSettingsPage() {
  return (
    <SettingsPageShell
      section="Integrations"
      title="Integrations"
      subtitle="Keys and endpoints by category. Secrets stay masked - leave blank to keep the current value."
    >
      <IntegrationsEditorForm />
    </SettingsPageShell>
  );
}
