import { useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  Eye,
  FileText,
  Mail,
  Monitor,
  Plus,
  RotateCcw,
  Search,
  Smartphone,
  Trash2,
} from "../lib/icons";
import { adminApi, type EmailTemplate } from "../lib/api";
import { SettingsPageShell, SettingsToggle } from "../components/SettingsPageShell";
import { LoadingIndicator } from "../components/LoadingIndicator";

type Draft = {
  id?: string;
  key: string;
  name: string;
  category: string;
  description: string;
  subject: string;
  html_body: string;
  variables: string;
  enabled: boolean;
  system?: boolean;
};

type PreviewMode = "desktop" | "mobile";
type EditorTab = "content" | "html";

const EMPTY_DRAFT: Draft = {
  key: "",
  name: "",
  category: "custom",
  description: "",
  subject: "",
  html_body: `<p>Hi {{customer_name}},</p>\n<p>Write your message here.</p>`,
  variables: "customer_name",
  enabled: true,
};

const CATEGORY_META: Record<string, { label: string; tone: string }> = {
  orders: { label: "Orders", tone: "tone-orders" },
  auth: { label: "Auth", tone: "tone-auth" },
  marketing: { label: "Marketing", tone: "tone-marketing" },
  support: { label: "Support", tone: "tone-support" },
  custom: { label: "Custom", tone: "tone-custom" },
};

/** All insertable merge tags — customer-first, then transactional. */
const VARIABLE_GROUPS: { id: string; label: string; vars: { key: string; hint: string }[] }[] = [
  {
    id: "customer",
    label: "Customer",
    vars: [
      { key: "customer_name", hint: "Full name" },
      { key: "customer_first_name", hint: "First name" },
      { key: "customer_last_name", hint: "Last name" },
      { key: "customer_email", hint: "Email address" },
      { key: "customer_phone", hint: "Phone number" },
      { key: "customer_id", hint: "Customer ID" },
    ],
  },
  {
    id: "order",
    label: "Order",
    vars: [
      { key: "order_id", hint: "Order number" },
      { key: "order_total", hint: "Order total" },
      { key: "order_status", hint: "Status label" },
      { key: "status_message", hint: "Status note" },
      { key: "store_name", hint: "Store / branch" },
      { key: "delivery_slot", hint: "Delivery window" },
      { key: "delivery_address", hint: "Delivery address" },
      { key: "payment_method", hint: "Payment method" },
    ],
  },
  {
    id: "cart",
    label: "Cart & shop",
    vars: [
      { key: "cart_count", hint: "Items in cart" },
      { key: "cart_total", hint: "Cart total" },
      { key: "cart_url", hint: "Cart link" },
      { key: "shop_url", hint: "Storefront URL" },
    ],
  },
  {
    id: "auth",
    label: "Auth",
    vars: [
      { key: "otp_code", hint: "One-time code" },
      { key: "otp_minutes", hint: "Expiry minutes" },
    ],
  },
  {
    id: "support",
    label: "Support",
    vars: [
      { key: "ticket_subject", hint: "Ticket subject" },
      { key: "message_body", hint: "Reply body" },
      { key: "agent_name", hint: "Agent name" },
    ],
  },
];

const ALL_VARIABLE_KEYS = VARIABLE_GROUPS.flatMap((g) => g.vars.map((v) => v.key));

function categoryMeta(category: string) {
  return CATEGORY_META[category] ?? { label: category, tone: "tone-custom" };
}

function toDraft(t: EmailTemplate): Draft {
  return {
    id: t.id,
    key: t.key,
    name: t.name,
    category: t.category || "custom",
    description: t.description || "",
    subject: t.subject,
    html_body: t.html_body,
    variables: (t.variables || []).join(", "),
    enabled: t.enabled !== false,
    system: Boolean(t.system),
  };
}

function parseVariables(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((v) => v.replace(/[^a-z0-9_]/gi, "").toLowerCase())
    .filter(Boolean);
}

function slugifyKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

function draftFingerprint(d: Draft): string {
  return JSON.stringify({
    key: d.key,
    name: d.name,
    category: d.category,
    description: d.description,
    subject: d.subject,
    html_body: d.html_body,
    variables: parseVariables(d.variables),
    enabled: d.enabled,
  });
}

export function EmailTemplatesPage() {
  const [items, setItems] = useState<EmailTemplate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [baseline, setBaseline] = useState<string>("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewSubject, setPreviewSubject] = useState("");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  const [editorTab, setEditorTab] = useState<EditorTab>("content");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const htmlRef = useRef<HTMLTextAreaElement | null>(null);
  const keyManualRef = useRef(false);

  const categoryOptions = useMemo(
    () => (categories.length ? categories : ["orders", "auth", "marketing", "support", "custom"]),
    [categories],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((t) => {
      if (filter !== "all" && t.category !== filter) return false;
      if (!q) return true;
      return [t.name, t.key, t.category, t.description, t.subject]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [items, filter, query]);

  const counts = useMemo(() => {
    const byCat: Record<string, number> = {};
    for (const t of items) byCat[t.category] = (byCat[t.category] || 0) + 1;
    return {
      total: items.length,
      enabled: items.filter((t) => t.enabled !== false).length,
      system: items.filter((t) => t.system).length,
      byCat,
    };
  }, [items]);

  const dirty = Boolean(draft && baseline && draftFingerprint(draft) !== baseline);

  async function load(selectId?: string | null) {
    setBusy(true);
    setError("");
    try {
      const res = await adminApi.emailTemplates();
      const list = Array.isArray(res?.items) ? res.items : [];
      setItems(list);
      setCategories(Array.isArray(res?.categories) ? res.categories : []);
      const nextId = selectId ?? selectedId ?? list[0]?.id ?? null;
      setSelectedId(nextId);
      const found = list.find((t) => t.id === nextId);
      if (found) {
        setCreating(false);
        keyManualRef.current = true;
        const next = toDraft(found);
        setDraft(next);
        setBaseline(draftFingerprint(next));
        setEditorTab("content");
      } else if (!list.length) {
        setCreating(true);
        keyManualRef.current = false;
        const next = { ...EMPTY_DRAFT };
        setDraft(next);
        setBaseline(draftFingerprint(next));
      } else {
        setDraft(null);
        setBaseline("");
      }
    } catch (e) {
      setItems([]);
      setDraft(null);
      setBaseline("");
      setSelectedId(null);
      setError(e instanceof Error ? e.message : "Failed to load templates");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!draft) return;
    const handle = window.setTimeout(() => {
      void refreshPreview();
    }, 350);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.subject, draft?.html_body, draft?.id, draft?.variables, creating]);

  async function refreshPreview() {
    if (!draft) return;
    try {
      const id = draft.id || items[0]?.id;
      if (!id) {
        const vars = Object.fromEntries(parseVariables(draft.variables).map((k) => [k, `{{${k}}}`]));
        const replace = (text: string) =>
          text.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_, key: string) => vars[key] ?? `{{${key}}}`);
        setPreviewSubject(replace(draft.subject));
        setPreviewHtml(replace(draft.html_body));
        return;
      }
      const res = await adminApi.previewEmailTemplate(id, {
        subject: draft.subject,
        html_body: draft.html_body,
      });
      setPreviewSubject(res.subject);
      setPreviewHtml(res.html);
    } catch {
      setPreviewHtml(draft.html_body);
      setPreviewSubject(draft.subject);
    }
  }

  function startCreate() {
    setCreating(true);
    setSelectedId(null);
    keyManualRef.current = false;
    const next = { ...EMPTY_DRAFT };
    setDraft(next);
    setBaseline(draftFingerprint(next));
    setEditorTab("content");
    setMsg("");
    setError("");
  }

  function selectTemplate(t: EmailTemplate) {
    if (dirty && !window.confirm("You have unsaved changes. Discard them?")) return;
    setCreating(false);
    setSelectedId(t.id);
    keyManualRef.current = true;
    const next = toDraft(t);
    setDraft(next);
    setBaseline(draftFingerprint(next));
    setEditorTab("content");
    setMsg("");
    setError("");
  }

  function patchDraft(patch: Partial<Draft>) {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      if (!prev.system && !keyManualRef.current && patch.name !== undefined && creating) {
        next.key = slugifyKey(patch.name);
      }
      return next;
    });
  }

  function insertVariable(name: string) {
    if (!draft) return;
    const token = `{{${name}}}`;
    const existing = parseVariables(draft.variables);
    const nextVariables = existing.includes(name) ? existing : [...existing, name];
    const variablesStr = nextVariables.join(", ");

    const el = htmlRef.current;
    if (el && (document.activeElement === el || editorTab === "html")) {
      const start = el.selectionStart ?? draft.html_body.length;
      const end = el.selectionEnd ?? start;
      const nextBody = `${draft.html_body.slice(0, start)}${token}${draft.html_body.slice(end)}`;
      setDraft({ ...draft, html_body: nextBody, variables: variablesStr });
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + token.length;
        el.setSelectionRange(pos, pos);
      });
      return;
    }

    // Content tab / subject: insert into subject if focused, otherwise append to HTML and switch tab
    const subjectEl = document.activeElement as HTMLInputElement | null;
    if (subjectEl?.tagName === "INPUT" && subjectEl.closest(".email-tpl-editor")) {
      const start = subjectEl.selectionStart ?? draft.subject.length;
      const end = subjectEl.selectionEnd ?? start;
      const nextSubject = `${draft.subject.slice(0, start)}${token}${draft.subject.slice(end)}`;
      setDraft({ ...draft, subject: nextSubject, variables: variablesStr });
      requestAnimationFrame(() => {
        subjectEl.focus();
        const pos = start + token.length;
        subjectEl.setSelectionRange(pos, pos);
      });
      return;
    }

    const body = draft.html_body;
    setDraft({
      ...draft,
      html_body: `${body}${body.endsWith("\n") ? "" : "\n"}${token}`,
      variables: variablesStr,
    });
    setEditorTab("html");
  }

  function renderVariablePicker(compact = false) {
    const used = new Set(parseVariables(draft?.variables || ""));
    const extras = parseVariables(draft?.variables || "").filter((v) => !ALL_VARIABLE_KEYS.includes(v));

    return (
      <div className={`email-tpl-var-picker${compact ? " is-compact" : ""}`}>
        {VARIABLE_GROUPS.map((group) => (
          <div key={group.id} className="email-tpl-var-group">
            {!compact ? <span className="email-tpl-var-group-label">{group.label}</span> : null}
            <div className="email-tpl-chips">
              {group.vars.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  className={`email-tpl-chip${used.has(v.key) ? " is-used" : ""}${group.id === "customer" ? " is-customer" : ""}`}
                  title={v.hint}
                  onClick={() => insertVariable(v.key)}
                >
                  {`{{${v.key}}}`}
                </button>
              ))}
            </div>
          </div>
        ))}
        {extras.length ? (
          <div className="email-tpl-var-group">
            {!compact ? <span className="email-tpl-var-group-label">Custom</span> : null}
            <div className="email-tpl-chips">
              {extras.map((v) => (
                <button
                  key={v}
                  type="button"
                  className="email-tpl-chip is-used"
                  onClick={() => insertVariable(v)}
                >
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  async function copySubject() {
    if (!previewSubject) return;
    try {
      await navigator.clipboard.writeText(previewSubject);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  }

  async function save() {
    if (!draft) return;
    if (!draft.name.trim() || !draft.subject.trim()) {
      setError("Name and subject are required.");
      return;
    }
    setBusy(true);
    setMsg("");
    setError("");
    try {
      const body = {
        key: draft.key || slugifyKey(draft.name),
        name: draft.name.trim(),
        category: draft.category,
        description: draft.description,
        subject: draft.subject,
        html_body: draft.html_body,
        variables: parseVariables(draft.variables),
        enabled: draft.enabled,
      };
      const saved =
        creating || !draft.id
          ? await adminApi.createEmailTemplate(body)
          : await adminApi.updateEmailTemplate(draft.id, body);
      setMsg("Template saved.");
      setCreating(false);
      await load(saved.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!draft?.id || draft.system) return;
    if (!window.confirm(`Delete template “${draft.name}”?`)) return;
    setBusy(true);
    try {
      await adminApi.deleteEmailTemplate(draft.id);
      setMsg("Template deleted.");
      setSelectedId(null);
      await load(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  function resetDraft() {
    if (!draft || !baseline) return;
    if (!window.confirm("Reset unsaved changes?")) return;
    try {
      const parsed = JSON.parse(baseline) as {
        key: string;
        name: string;
        category: string;
        description: string;
        subject: string;
        html_body: string;
        variables: string[];
        enabled: boolean;
      };
      setDraft({
        ...draft,
        key: parsed.key,
        name: parsed.name,
        category: parsed.category,
        description: parsed.description,
        subject: parsed.subject,
        html_body: parsed.html_body,
        variables: parsed.variables.join(", "),
        enabled: parsed.enabled,
      });
    } catch {
      /* ignore */
    }
  }

  return (
    <SettingsPageShell
      section="Email templates"
      title="Email templates"
      subtitle="Design transactional and marketing emails with merge tags like {{customer_name}}. Preview updates as you type."
      actions={
        <div className="email-tpl-head-actions">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            onClick={() => void load(selectedId)}
            title="Refresh list"
          >
            <RotateCcw size={15} aria-hidden />
            Refresh
          </button>
          <button type="button" className="btn btn-primary" onClick={startCreate}>
            <Plus size={16} aria-hidden />
            New template
          </button>
        </div>
      }
    >
      {error ? <div className="banner error">{error}</div> : null}
      {msg ? <div className="banner ok">{msg}</div> : null}

      <div className="email-tpl-stats">
        <div className="email-tpl-stat">
          <strong>{counts.total}</strong>
          <span>Templates</span>
        </div>
        <div className="email-tpl-stat">
          <strong>{counts.enabled}</strong>
          <span>Enabled</span>
        </div>
        <div className="email-tpl-stat">
          <strong>{counts.system}</strong>
          <span>System</span>
        </div>
        <div className="email-tpl-stat">
          <strong>{filtered.length}</strong>
          <span>Showing</span>
        </div>
      </div>

      <div className="email-tpl-layout">
        <section className="card email-tpl-list-panel">
          <div className="email-tpl-list-toolbar">
            <label className="email-tpl-search">
              <Search size={15} aria-hidden />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search templates…"
                aria-label="Search templates"
              />
            </label>
            <div className="email-tpl-cat-chips" role="tablist" aria-label="Filter by category">
              <button
                type="button"
                className={`email-tpl-cat-chip${filter === "all" ? " is-active" : ""}`}
                onClick={() => setFilter("all")}
              >
                All <em>{counts.total}</em>
              </button>
              {categoryOptions.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`email-tpl-cat-chip ${categoryMeta(c).tone}${filter === c ? " is-active" : ""}`}
                  onClick={() => setFilter(c)}
                >
                  {categoryMeta(c).label} <em>{counts.byCat[c] || 0}</em>
                </button>
              ))}
            </div>
          </div>

          <div className="email-tpl-list">
            {filtered.map((t) => {
              const meta = categoryMeta(t.category);
              const selected = selectedId === t.id && !creating;
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`email-tpl-item${selected ? " is-selected" : ""}${t.enabled === false ? " is-off" : ""}`}
                  onClick={() => selectTemplate(t)}
                >
                  <span className="email-tpl-item-icon" aria-hidden>
                    <Mail size={16} />
                  </span>
                  <span className="email-tpl-item-body">
                    <span className="email-tpl-item-title">
                      <strong>{t.name}</strong>
                      {t.system ? <span className="email-tpl-badge system">System</span> : null}
                      {t.enabled === false ? <span className="email-tpl-badge off">Off</span> : null}
                    </span>
                    <span className="email-tpl-item-meta">
                      <span className={`email-tpl-cat-pill ${meta.tone}`}>{meta.label}</span>
                      <span className="mono muted">{t.key}</span>
                    </span>
                    {t.description ? <span className="email-tpl-item-desc muted">{t.description}</span> : null}
                  </span>
                </button>
              );
            })}

            {!filtered.length ? (
              busy ? (
                <LoadingIndicator className="email-tpl-empty" label="Loading templates" padded />
              ) : (
                <div className="email-tpl-empty">
                  <FileText size={28} aria-hidden />
                  <p>{error ? "Could not load templates." : query || filter !== "all" ? "No templates match this filter." : "No templates yet."}</p>
                  {!error ? (
                    <button type="button" className="btn btn-secondary" onClick={startCreate}>
                      <Plus size={15} aria-hidden /> Create template
                    </button>
                  ) : null}
                </div>
              )
            ) : null}
          </div>
        </section>

        <section className="card email-tpl-editor">
          {!draft ? (
            <div className="email-tpl-empty">
              <Mail size={28} aria-hidden />
              <p>Select a template or create a new one.</p>
            </div>
          ) : (
            <>
              <div className="email-tpl-editor-head">
                <div>
                  <p className="email-tpl-editor-kicker">
                    {creating || !draft.id ? "New template" : draft.system ? "System template" : "Custom template"}
                    {dirty ? <span className="email-tpl-dirty">Unsaved</span> : null}
                  </p>
                  <h2>{draft.name.trim() || "Untitled template"}</h2>
                </div>
                <div className="email-tpl-editor-tabs" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={editorTab === "content"}
                    className={editorTab === "content" ? "is-active" : ""}
                    onClick={() => setEditorTab("content")}
                  >
                    Content
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={editorTab === "html"}
                    className={editorTab === "html" ? "is-active" : ""}
                    onClick={() => setEditorTab("html")}
                  >
                    HTML
                  </button>
                </div>
              </div>

              {editorTab === "content" ? (
                <div className="email-tpl-editor-grid">
                  <label className="pf-field">
                    <span className="pf-label">Name</span>
                    <input
                      value={draft.name}
                      onChange={(e) => patchDraft({ name: e.target.value })}
                      placeholder="Order confirmation"
                    />
                  </label>
                  <label className="pf-field">
                    <span className="pf-label">Key</span>
                    <input
                      value={draft.key}
                      onChange={(e) => {
                        keyManualRef.current = true;
                        patchDraft({ key: slugifyKey(e.target.value) });
                      }}
                      disabled={Boolean(draft.system)}
                      spellCheck={false}
                      placeholder="order_confirmation"
                    />
                  </label>
                  <label className="pf-field">
                    <span className="pf-label">Category</span>
                    <select value={draft.category} onChange={(e) => patchDraft({ category: e.target.value })}>
                      {categoryOptions.map((c) => (
                        <option key={c} value={c}>
                          {categoryMeta(c).label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="pf-field email-tpl-enabled-wrap">
                    <SettingsToggle
                      label="Enabled"
                      hint="Use this template when sending"
                      checked={draft.enabled}
                      onChange={(v) => patchDraft({ enabled: v })}
                    />
                  </div>
                  <label className="pf-field pf-span-2">
                    <span className="pf-label">Description</span>
                    <input
                      value={draft.description}
                      onChange={(e) => patchDraft({ description: e.target.value })}
                      placeholder="When this email is sent"
                    />
                  </label>
                  <label className="pf-field pf-span-2">
                    <span className="pf-label">Subject</span>
                    <input
                      value={draft.subject}
                      onChange={(e) => patchDraft({ subject: e.target.value })}
                      placeholder="Order {{order_id}} confirmed"
                    />
                  </label>
                  <label className="pf-field pf-span-2">
                    <span className="pf-label">Variables</span>
                    <span className="pf-hint">Template variable list (updated automatically when you insert a tag)</span>
                    <input
                      value={draft.variables}
                      onChange={(e) => patchDraft({ variables: e.target.value })}
                      spellCheck={false}
                      placeholder="customer_name, order_id"
                    />
                  </label>
                  <div className="pf-field pf-span-2">
                    <span className="pf-label">Insert variable</span>
                    <span className="pf-hint">Click any customer or transactional tag to insert it into subject / HTML</span>
                    {renderVariablePicker()}
                  </div>
                </div>
              ) : (
                <div className="email-tpl-html-pane">
                  {renderVariablePicker(true)}
                  <label className="pf-field">
                    <span className="pf-label">HTML body</span>
                    <textarea
                      ref={htmlRef}
                      className="email-tpl-code"
                      rows={18}
                      value={draft.html_body}
                      onChange={(e) => patchDraft({ html_body: e.target.value })}
                      spellCheck={false}
                    />
                  </label>
                </div>
              )}

              <div className="email-tpl-actions">
                <div className="email-tpl-actions-left">
                  {!draft.system && draft.id && !creating ? (
                    <button type="button" className="btn btn-secondary email-tpl-danger" disabled={busy} onClick={() => void remove()}>
                      <Trash2 size={15} aria-hidden />
                      Delete
                    </button>
                  ) : null}
                  {dirty ? (
                    <button type="button" className="btn btn-secondary" disabled={busy} onClick={resetDraft}>
                      Discard
                    </button>
                  ) : null}
                </div>
                <div className="email-tpl-actions-right">
                  <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void refreshPreview()}>
                    <Eye size={15} aria-hidden />
                    Refresh preview
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busy || !draft.name.trim() || !draft.subject.trim()}
                    onClick={() => void save()}
                  >
                    {busy ? "Saving…" : creating || !draft.id ? "Create template" : "Save template"}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        <aside className="card email-tpl-preview">
          <header>
            <div className="email-tpl-preview-top">
              <strong>Live preview</strong>
              <div className="email-tpl-preview-modes" role="group" aria-label="Preview size">
                <button
                  type="button"
                  className={previewMode === "desktop" ? "is-active" : ""}
                  onClick={() => setPreviewMode("desktop")}
                  title="Desktop preview"
                  aria-label="Desktop preview"
                >
                  <Monitor size={16} aria-hidden />
                </button>
                <button
                  type="button"
                  className={previewMode === "mobile" ? "is-active" : ""}
                  onClick={() => setPreviewMode("mobile")}
                  title="Mobile preview"
                  aria-label="Mobile preview"
                >
                  <Smartphone size={16} aria-hidden />
                </button>
              </div>
            </div>
            <div className="email-tpl-preview-subject">
              <span className="muted">Subject</span>
              <div>
                <code>{previewSubject || "Subject preview"}</code>
                <button type="button" className="email-tpl-icon-btn" onClick={() => void copySubject()} title="Copy subject" disabled={!previewSubject}>
                  <Copy size={13} aria-hidden />
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          </header>
          <div className={`email-tpl-frame-wrap is-${previewMode}`}>
            <iframe
              title="Email preview"
              className="email-tpl-frame"
              sandbox="allow-same-origin"
              srcDoc={
                previewHtml ||
                "<p style='font-family:sans-serif;color:#6b7c70;padding:16px'>Preview appears here.</p>"
              }
            />
          </div>
        </aside>
      </div>
    </SettingsPageShell>
  );
}
