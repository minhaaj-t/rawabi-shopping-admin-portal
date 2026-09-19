import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bell, Camera, LogOut, Palette, Shield, Trash2, User } from "../lib/icons";
import { useNavigate } from "react-router-dom";
import { adminApi } from "../lib/api";
import { clearSession, getToken, getUser, setSession } from "../lib/auth";
import { roleLabel } from "../lib/roles";
import { LoadingCard } from "../components/LoadingIndicator";
import {
  DEFAULT_PERSONALIZE,
  SOUND_OPTIONS,
  THEME_OPTIONS,
  UI_SCALE_OPTIONS,
  loadPersonalize,
  playNotifSound,
  savePersonalize,
  speakNotification,
  stopNotifSound,
  type PersonalizePrefs,
} from "../lib/personalize";

type Profile = Awaited<ReturnType<typeof adminApi.me>>;

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <li>
      <span>{label}</span>
      <strong>{value}</strong>
    </li>
  );
}

export function ProfilePage() {
  const navigate = useNavigate();
  const sessionUser = getUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [prefs, setPrefs] = useState<PersonalizePrefs>(() => loadPersonalize());
  const [prefsMsg, setPrefsMsg] = useState("");
  const [form, setForm] = useState({
    username: "",
    email: "",
    phone: "",
    current_password: "",
    new_password: "",
  });

  async function load() {
    setError("");
    try {
      const data = await adminApi.me();
      setProfile(data);
      setForm({
        username: data.username,
        email: data.email ?? "",
        phone: data.phone ?? "",
        current_password: "",
        new_password: "",
      });
      if (sessionUser) {
        setSession(getToken() ?? "", {
          ...sessionUser,
          username: data.username,
          email: data.email,
          avatar_url: data.avatar_url ?? null,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load profile");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function updatePrefs(patch: Partial<PersonalizePrefs>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    savePersonalize(next);
    setPrefsMsg("Personalization saved on this device.");
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const body: Record<string, string> = {
        username: form.username,
        email: form.email,
        phone: form.phone,
      };
      if (form.new_password) {
        body.current_password = form.current_password;
        body.new_password = form.new_password;
      }
      const updated = await adminApi.updateProfile(body);
      setProfile(updated);
      if (sessionUser) {
        setSession(getToken() ?? "", {
          ...sessionUser,
          username: updated.username,
          email: updated.email,
          avatar_url: updated.avatar_url ?? null,
        });
      }
      setForm((f) => ({ ...f, current_password: "", new_password: "" }));
      setMsg("Profile updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  function syncSessionAvatar(avatarUrl: string | null | undefined) {
    if (!sessionUser) return;
    setSession(getToken() ?? "", {
      ...sessionUser,
      avatar_url: avatarUrl ?? null,
    });
  }

  async function onAvatarSelected(file: File | undefined) {
    if (!file) return;
    setAvatarBusy(true);
    setError("");
    setMsg("");
    try {
      const uploaded = await adminApi.uploadProfileAvatar(file);
      setProfile((prev) => (prev ? { ...prev, avatar: uploaded.avatar, avatar_url: uploaded.avatar_url } : prev));
      syncSessionAvatar(uploaded.avatar_url);
      setMsg("Profile photo updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo upload failed");
    } finally {
      setAvatarBusy(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }

  async function removeAvatar() {
    setAvatarBusy(true);
    setError("");
    setMsg("");
    try {
      const updated = await adminApi.removeProfileAvatar();
      setProfile(updated);
      syncSessionAvatar(updated.avatar_url);
      setMsg("Profile photo removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove photo");
    } finally {
      setAvatarBusy(false);
    }
  }

  function logout() {
    void adminApi.logout().finally(() => {
      clearSession();
      navigate("/login");
    });
  }

  const initials = (profile?.username ?? "RA")
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (!profile) {
    return <LoadingCard label="Loading profile" />;
  }

  const role = profile.role_label ?? roleLabel(profile.user_level);
  const soundDisabled = !prefs.notifSoundEnabled || prefs.notifSound === "off";

  return (
    <div className="page profile-page">
      <header className="page-head">
        <div>
          <h1 className="page-title">My profile</h1>
          <p className="page-sub">Account details, personalization, and password settings.</p>
        </div>
      </header>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}
      {prefsMsg ? <div className="alert alert-success">{prefsMsg}</div> : null}

      <div className="profile-layout">
        <aside className="card profile-card-side">
          <div className="profile-card-head">
            <div className="profile-avatar-wrap">
              <button
                type="button"
                className="profile-avatar-lg"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarBusy}
                aria-label="Change profile photo"
                title="Change profile photo"
              >
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="profile-avatar-img" />
                ) : (
                  initials
                )}
                <span className="profile-avatar-overlay">
                  <Camera size={18} aria-hidden />
                </span>
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="sr-only"
                onChange={(e) => void onAvatarSelected(e.target.files?.[0])}
              />
              {profile.avatar_url ? (
                <button
                  type="button"
                  className="btn btn-secondary profile-avatar-remove"
                  disabled={avatarBusy}
                  onClick={() => void removeAvatar()}
                >
                  <Trash2 size={12} aria-hidden />
                  Remove
                </button>
              ) : null}
            </div>
            <h2>{profile.username}</h2>
            <p className="profile-role">
              <Shield size={14} aria-hidden />
              {role}
            </p>
            <p className="profile-email">{profile.email || "—"}</p>
          </div>

          <ul className="profile-info-list">
            <InfoRow label="User ID" value={`#${profile.id}`} />
            <InfoRow label="Portal" value={profile.portal === "store" ? "Store" : "Admin"} />
            {profile.store_id > 0 ? <InfoRow label="Store ID" value={String(profile.store_id)} /> : null}
            {profile.create_date ? (
              <InfoRow label="Member since" value={String(profile.create_date).slice(0, 10)} />
            ) : null}
            {profile.last_login_update ? (
              <InfoRow
                label="Last activity"
                value={String(profile.last_login_update).slice(0, 16).replace("T", " ")}
              />
            ) : null}
          </ul>

          <button type="button" className="btn btn-secondary profile-logout" onClick={logout}>
            <LogOut size={14} aria-hidden />
            Sign out
          </button>
        </aside>

        <div className="profile-main-col">
          <section className="card profile-form-card">
            <header className="profile-form-head">
              <h2>
                <User size={16} aria-hidden />
                Edit profile
              </h2>
            </header>

            <form className="profile-form-grid" onSubmit={(e) => void save(e)}>
              <label className="pf-field">
                <span className="pf-label">Display name</span>
                <input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                />
              </label>
              <label className="pf-field">
                <span className="pf-label">Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </label>
              <label className="pf-field pf-span-2">
                <span className="pf-label">Phone</span>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </label>

              <div className="profile-password-section pf-span-2">
                <h3>Change password</h3>
                <p className="pf-hint">Leave blank to keep your current password.</p>
                <div className="profile-form-grid profile-form-grid-nested">
                  <label className="pf-field">
                    <span className="pf-label">Current password</span>
                    <input
                      type="password"
                      value={form.current_password}
                      onChange={(e) => setForm({ ...form, current_password: e.target.value })}
                      autoComplete="current-password"
                    />
                  </label>
                  <label className="pf-field">
                    <span className="pf-label">New password</span>
                    <input
                      type="password"
                      value={form.new_password}
                      onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                      minLength={4}
                      autoComplete="new-password"
                    />
                  </label>
                </div>
              </div>

              <div className="profile-form-actions pf-span-2">
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? "Saving…" : "Save profile"}
                </button>
              </div>
            </form>
          </section>
        </div>

          <section className="card profile-form-card profile-personalize-card">
            <header className="profile-form-head">
              <h2>
                <Palette size={16} aria-hidden />
                Personalize
              </h2>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setPrefs(DEFAULT_PERSONALIZE);
                  savePersonalize(DEFAULT_PERSONALIZE);
                  setPrefsMsg("Reset to default personalization.");
                }}
              >
                Reset defaults
              </button>
            </header>

            <div className="profile-personalize-grid">
              <fieldset className="profile-pref-block">
                <legend>Display size</legend>
                <p className="pf-hint">Increase or reduce the whole admin UI.</p>
                <div className="profile-scale-row">
                  {UI_SCALE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`btn btn-sm${prefs.uiScale === opt.value ? " btn-primary" : " btn-secondary"}`}
                      onClick={() => updatePrefs({ uiScale: opt.value })}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="profile-pref-block">
                <legend>Color theme</legend>
                <p className="pf-hint">Choose a shop-floor look for this browser.</p>
                <div className="profile-theme-grid">
                  {THEME_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`profile-theme-swatch theme-${opt.value}${prefs.colorTheme === opt.value ? " is-active" : ""}`}
                      onClick={() => updatePrefs({ colorTheme: opt.value })}
                    >
                      <span className="profile-theme-preview" aria-hidden />
                      <strong>{opt.label}</strong>
                      <small>{opt.desc}</small>
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="profile-pref-block">
                <legend>
                  <Bell size={14} aria-hidden /> Notification alerts
                </legend>
                <p className="pf-hint">Sound and spoken read-out when new push notifications arrive.</p>

                <label className="profile-switch">
                  <input
                    type="checkbox"
                    checked={prefs.notifSoundEnabled}
                    onChange={(e) => updatePrefs({ notifSoundEnabled: e.target.checked })}
                  />
                  <span>Play notification sound</span>
                </label>

                <label className="pf-field">
                  <span className="pf-label">Sound</span>
                  <select
                    value={prefs.notifSound}
                    disabled={!prefs.notifSoundEnabled}
                    onChange={(e) => {
                      const next = e.target.value as PersonalizePrefs["notifSound"];
                      updatePrefs({ notifSound: next });
                      if (next !== "off") void playNotifSound(next, prefs.notifVolume);
                    }}
                  >
                    {SOUND_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="pf-field">
                  <span className="pf-label">Volume ({prefs.notifVolume}%)</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={prefs.notifVolume}
                    disabled={soundDisabled}
                    onChange={(e) => updatePrefs({ notifVolume: Number(e.target.value) })}
                  />
                </label>

                <label className="profile-switch">
                  <input
                    type="checkbox"
                    checked={prefs.notifReadMode}
                    onChange={(e) => updatePrefs({ notifReadMode: e.target.checked })}
                  />
                  <span>Read content mode (speak title &amp; message)</span>
                </label>

                <div className="orders-row-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={soundDisabled}
                    onClick={() => void playNotifSound(prefs.notifSound, prefs.notifVolume)}
                  >
                    Test sound
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => stopNotifSound()}>
                    Stop
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={!prefs.notifReadMode}
                    onClick={() =>
                      speakNotification("Rawabi alert", "Order #1024 is ready for picking.")
                    }
                  >
                    Test read mode
                  </button>
                </div>
              </fieldset>
            </div>
          </section>
      </div>
    </div>
  );
}
