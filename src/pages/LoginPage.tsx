import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { PasswordEyeToggle } from "../components/PasswordEyeToggle";
import { loginAdmin } from "../lib/apiLogin";
import { isLoggedIn, setSession } from "../lib/auth";
import { getStoredLocale, t } from "../lib/i18n";

const LOGIN_HERO_IMAGE = "/assets/login-visual.png";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function LoginPage() {
  const navigate = useNavigate();
  const locale = getStoredLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  if (isLoggedIn()) return <Navigate to="/" replace />;

  function validateFields() {
    const next: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      next.email = t(locale, "emailRequired");
    } else if (!isValidEmail(trimmedEmail)) {
      next.email = t(locale, "emailInvalid");
    }

    if (!password) {
      next.password = t(locale, "passwordRequired");
    }

    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  function focusPassword() {
    passwordRef.current?.focus();
    passwordRef.current?.select();
  }

  function onEmailKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setFieldErrors((prev) => ({ ...prev, email: t(locale, "emailRequired") }));
      return;
    }
    if (!isValidEmail(trimmed)) {
      setFieldErrors((prev) => ({ ...prev, email: t(locale, "emailInvalid") }));
      return;
    }
    setFieldErrors((prev) => ({ ...prev, email: undefined }));
    focusPassword();
  }

  function onPasswordKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    formRef.current?.requestSubmit();
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!validateFields()) return;

    setLoading(true);
    try {
      const data = await loginAdmin(email.trim(), password);
      setSession(data.token, data.user);
      void import("../styles/admin-theme.css");
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-shell">
        <aside className="login-visual" aria-hidden="true">
          <img
            src={LOGIN_HERO_IMAGE}
            alt=""
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
          <div className="login-visual-overlay" />
          <div className="login-visual-copy">
            <strong>{t(locale, "loginVisualTitle")}</strong>
            <p>{t(locale, "loginVisualSubtitle")}</p>
          </div>
        </aside>

        <div className="login-panel">
          <form ref={formRef} className="login-card" onSubmit={onSubmit} noValidate aria-labelledby="login-title">
            <header className="login-header">
              <div className="login-logo">
                <img src="/assets/logo.svg" alt="" width={36} height={36} />
                <div className="login-brand">
                  <strong className="login-brand-name">Rawabi Shopping</strong>
                  <span className="login-brand-tagline muted">{t(locale, "adminPortal")}</span>
                </div>
              </div>
              <h1 id="login-title">{t(locale, "welcomeBack")}</h1>
              <p className="login-lead">{t(locale, "loginSubtitle")}</p>
            </header>

            <div className="login-form">
              <label className={`field${fieldErrors.email ? " is-invalid" : ""}`}>
                {t(locale, "email")}
                <input
                  type="email"
                  name="email"
                  value={email}
                  placeholder={t(locale, "emailPlaceholder")}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                    if (error) setError("");
                  }}
                  required
                  autoComplete="username"
                  autoFocus
                  inputMode="email"
                  enterKeyHint="next"
                  onKeyDown={onEmailKeyDown}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
                  disabled={loading}
                />
                {fieldErrors.email ? (
                  <span id="login-email-error" className="field-error" role="alert">
                    {fieldErrors.email}
                  </span>
                ) : null}
              </label>

              <label className={`field${fieldErrors.password ? " is-invalid" : ""}`}>
                {t(locale, "password")}
                <div className="login-password-field">
                  <input
                    ref={passwordRef}
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={password}
                    placeholder={t(locale, "passwordPlaceholder")}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                      if (error) setError("");
                    }}
                    required
                    autoComplete="current-password"
                    enterKeyHint="go"
                    onKeyDown={onPasswordKeyDown}
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
                    disabled={loading}
                  />
                  <PasswordEyeToggle
                    open={showPassword}
                    onToggle={() => setShowPassword((v) => !v)}
                    disabled={loading}
                    showLabel={t(locale, "showPassword")}
                    hideLabel={t(locale, "hidePassword")}
                  />
                </div>
                {fieldErrors.password ? (
                  <span id="login-password-error" className="field-error" role="alert">
                    {fieldErrors.password}
                  </span>
                ) : null}
              </label>

              {error ? (
                <div className="alert alert-error login-alert" role="alert">
                  {error}
                </div>
              ) : null}

              <button className="btn login-submit" type="submit" disabled={loading}>
                {loading ? t(locale, "loading") : t(locale, "signIn")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
