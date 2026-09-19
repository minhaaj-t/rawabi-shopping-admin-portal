import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Shield, MessageCircle, Plug } from "../lib/icons";
import { SettingsPageShell, SettingsToggle } from "../components/SettingsPageShell";
import { adminApi, type AuthSettingsPayload } from "../lib/api";
import { LoadingCard } from "../components/LoadingIndicator";

type AuthForm = AuthSettingsPayload["settings"];

function StatusPill({ ok, warnLabel = "Not configured" }: { ok: boolean; warnLabel?: string }) {
  return <span className={`settings-status ${ok ? "ok" : "warn"}`}>{ok ? "Ready" : warnLabel}</span>;
}

export function AuthSecuritySettingsPage() {
  const [data, setData] = useState<AuthSettingsPayload | null>(null);
  const [form, setForm] = useState<AuthForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void adminApi
      .authSettings()
      .then((payload) => {
        setData(payload);
        setForm(payload.settings);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load auth settings"));
  }, []);

  function patch<K extends keyof AuthForm>(key: K, value: AuthForm[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setMsg("");
    setError("");
    try {
      const saved = await adminApi.updateAuthSettings({ ...form });
      setData(saved);
      setForm(saved.settings);
      setMsg("Authentication & security settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const googleConfigured = Boolean(data?.integrations.google_oauth.configured);
  const appleConfigured = Boolean(data?.integrations.apple_oauth.configured);
  const smsConfigured = Boolean(data?.integrations.sms.configured);

  return (
    <SettingsPageShell
      section="Authentication & security"
      title="Authentication & security"
      subtitle="Enable customer login methods, registration rules, and security limits. Configure OAuth / SMS credentials under Integrations."
    >
      {error ? <div className="banner error">{error}</div> : null}
      {msg ? <div className="banner ok">{msg}</div> : null}

      {!form || !data ? (
        <LoadingCard label="Loading authentication settings" />
      ) : (
        <form className="settings-form card" onSubmit={onSubmit}>
          <fieldset className="settings-fieldset">
            <legend>
              <Shield size={16} aria-hidden /> Customer login types
            </legend>
            <p className="pf-hint" style={{ marginBottom: 12 }}>
              At least one method must stay on. Social buttons only appear when the method is enabled and credentials are configured.
            </p>
            <div className="settings-toggle-list">
              <SettingsToggle
                label="Phone OTP"
                hint="Primary Rawabi flow: phone number → SMS one-time code."
                checked={form.login_phone_otp_enabled}
                onChange={(v) => patch("login_phone_otp_enabled", v)}
              />
              <SettingsToggle
                label="Email + password"
                hint="Allow customers to sign in with email and login_password."
                checked={form.login_email_password_enabled}
                onChange={(v) => patch("login_email_password_enabled", v)}
              />
              <SettingsToggle
                label="Continue with Google"
                hint={
                  googleConfigured
                    ? "Show Google on storefront / app login."
                    : "Enable after adding Google OAuth client ID and secret under Integrations → Auth."
                }
                checked={form.login_google_enabled}
                onChange={(v) => patch("login_google_enabled", v)}
              />
              <SettingsToggle
                label="Continue with Apple"
                hint={
                  appleConfigured
                    ? "Show Sign in with Apple on storefront / app login."
                    : "Enable after adding Apple Services ID, Team ID, Key ID, and private key under Integrations → Auth."
                }
                checked={form.login_apple_enabled}
                onChange={(v) => patch("login_apple_enabled", v)}
              />
            </div>
          </fieldset>

          <fieldset className="settings-fieldset">
            <legend>
              <Shield size={16} aria-hidden /> Account & checkout security
            </legend>
            <div className="settings-toggle-list">
              <SettingsToggle
                label="Allow new registrations"
                hint="When off, existing customers can still sign in; signup is blocked."
                checked={form.registration_enabled}
                onChange={(v) => patch("registration_enabled", v)}
              />
              <SettingsToggle
                label="Guest checkout"
                hint="Allow placing orders without a full customer account."
                checked={form.guest_checkout_enabled}
                onChange={(v) => patch("guest_checkout_enabled", v)}
              />
              <SettingsToggle
                label="Require OTP before checkout"
                hint="Customers must complete phone OTP verification before checkout."
                checked={form.require_otp_login}
                onChange={(v) => patch("require_otp_login", v)}
              />
              <SettingsToggle
                label="Remember this device"
                hint="Show the remember-device option on login screens."
                checked={form.remember_device_enabled}
                onChange={(v) => patch("remember_device_enabled", v)}
              />
            </div>
          </fieldset>

          <fieldset className="settings-fieldset">
            <legend>
              <Shield size={16} aria-hidden /> Password, OTP & lockout
            </legend>
            <div className="settings-fields">
              <label className="pf-field">
                <span className="pf-label">Password min length</span>
                <span className="pf-hint">Applied on signup and password changes</span>
                <input
                  type="number"
                  min={4}
                  max={64}
                  value={form.password_min_length}
                  onChange={(e) => patch("password_min_length", Number(e.target.value))}
                />
              </label>
              <label className="pf-field">
                <span className="pf-label">OTP length</span>
                <span className="pf-hint">Digits in the SMS / email code</span>
                <input
                  type="number"
                  min={4}
                  max={8}
                  value={form.otp_length}
                  onChange={(e) => patch("otp_length", Number(e.target.value))}
                />
              </label>
              <label className="pf-field">
                <span className="pf-label">OTP TTL (minutes)</span>
                <span className="pf-hint">How long a code stays valid</span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={form.otp_ttl_minutes}
                  onChange={(e) => patch("otp_ttl_minutes", Number(e.target.value))}
                />
              </label>
              <label className="pf-field">
                <span className="pf-label">Max failed logins</span>
                <span className="pf-hint">0 = no lockout</span>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={form.max_failed_logins}
                  onChange={(e) => patch("max_failed_logins", Number(e.target.value))}
                />
              </label>
              <label className="pf-field">
                <span className="pf-label">Lockout (minutes)</span>
                <span className="pf-hint">Cooldown after max failed attempts</span>
                <input
                  type="number"
                  min={0}
                  max={1440}
                  value={form.lockout_minutes}
                  onChange={(e) => patch("lockout_minutes", Number(e.target.value))}
                />
              </label>
              <label className="pf-field">
                <span className="pf-label">Session days</span>
                <span className="pf-hint">Customer JWT / session lifetime target</span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={form.session_days}
                  onChange={(e) => patch("session_days", Number(e.target.value))}
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="settings-fieldset">
            <legend>
              <Plug size={16} aria-hidden /> Auth integrations
            </legend>
            <div className="settings-fields">
              <div className="pf-field">
                <span className="pf-label">
                  <MessageCircle size={14} aria-hidden /> SMS gateway (OTP)
                </span>
                <span className="pf-hint">Vodafone Connect / configured SMS sender for phone OTP</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                  <StatusPill ok={smsConfigured} warnLabel={data.integrations.sms.enabled === false ? "Disabled" : "Not configured"} />
                  <Link className="btn btn-secondary" to={data.integrations.sms.href}>
                    Manage SMS
                  </Link>
                </div>
              </div>
              <div className="pf-field">
                <span className="pf-label">Google OAuth</span>
                <span className="pf-hint">Client ID + secret for Continue with Google</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                  <StatusPill ok={googleConfigured} />
                  <Link className="btn btn-secondary" to={data.integrations.google_oauth.href}>
                    Manage Google
                  </Link>
                </div>
              </div>
              <div className="pf-field">
                <span className="pf-label">Sign in with Apple</span>
                <span className="pf-hint">Services ID, Team ID, Key ID, and private key</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                  <StatusPill ok={appleConfigured} />
                  <Link className="btn btn-secondary" to={data.integrations.apple_oauth.href}>
                    Manage Apple
                  </Link>
                </div>
              </div>
            </div>
          </fieldset>

          <div className="settings-form-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Saving…" : "Save authentication settings"}
            </button>
          </div>
        </form>
      )}
    </SettingsPageShell>
  );
}
