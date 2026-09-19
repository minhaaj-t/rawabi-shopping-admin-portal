import { memo, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  MessageCircle,
  Paperclip,
  Phone,
  Plus,
  Search,
  Send,
  Smile,
  User,
  WhatsApp,
} from "../lib/icons";
import { CustomerPicker, type PickedCustomer } from "../components/CustomerPicker";
import { SupportCustomerContext } from "../components/SupportCustomerContext";
import { SupportCallOverlay } from "../components/SupportCallOverlay";
import { WaReceiptTicks } from "../components/WaReceiptTicks";
import { adminApi, type SupportInboxStats, type SupportMessageItem, type SupportThreadItem } from "../lib/api";
import { useSupportWebRtcCall } from "../hooks/useSupportWebRtcCall";

const STATUSES = ["open", "pending", "resolved", "closed"];
const PRIORITIES = ["low", "normal", "high", "urgent"];

/** Stable hash → 0..7 tone for avatar DP identity. */
function avatarToneIndex(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 8;
}

/** Prefer stable ids (user → contact → name+thread) so the same person keeps the same DP color. */
function avatarSeed(row: {
  id: number;
  user_id?: number | null;
  contact_id?: number | null;
  customer_name?: string | null;
}): string {
  const uid = Number(row.user_id || 0);
  if (uid > 0) return `user:${uid}`;
  const cid = Number(row.contact_id || 0);
  if (cid > 0) return `contact:${cid}`;
  const name = customerLabel(row.customer_name).toLowerCase();
  return `name:${name}|thread:${row.id}`;
}

function initials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  // guest_2471103 → G3 (last digit) so guest rows aren't all "G"
  const guest = trimmed.match(/^guest[_-]?(\d+)$/i);
  if (guest) {
    const digits = guest[1]!;
    return `G${digits.slice(-1)}`;
  }
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

function formatListTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 16).replace("T", " ");
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

function formatBubbleTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(11, 16);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function statusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function customerLabel(name?: string | null) {
  const n = String(name ?? "").trim();
  return n || "guest_0";
}

function channelLabel(channel: string) {
  if (channel === "web") return "Website";
  if (channel === "app") return "Mobile app";
  if (channel === "in_app") return "In-app";
  if (channel === "contact_form") return "Contact form";
  if (channel === "order") return "Order";
  if (channel === "whatsapp") return "WhatsApp";
  if (channel === "email") return "Email";
  return channel || "Chat";
}

function telHref(phone: string) {
  const trimmed = phone.trim();
  if (!trimmed) return "";
  const digits = trimmed.replace(/[^\d+]/g, "");
  if (!digits) return "";
  if (digits.startsWith("+")) return `tel:${digits}`;
  if (digits.startsWith("974")) return `tel:+${digits}`;
  return `tel:+974${digits.replace(/^0+/, "")}`;
}

function isAbortError(err: unknown) {
  return err instanceof Error && err.name === "AbortError";
}

function inboxFingerprint(items: SupportThreadItem[]) {
  return items
    .map(
      (row) =>
        `${row.id}:${row.last_message_at ?? ""}:${row.unread_admin}:${row.status}:${row.preview ?? ""}:${row.customer_name}`,
    )
    .join("|");
}

const WaInboxRow = memo(function WaInboxRow({
  row,
  active,
  search,
}: {
  row: SupportThreadItem;
  active: boolean;
  search: string;
}) {
  const label = customerLabel(row.customer_name);
  const tone = avatarToneIndex(avatarSeed(row));
  return (
    <Link
      to={`/support/chats/${row.id}${search ? `?${search}` : ""}`}
      className={`wa-row${active ? " is-active" : ""}${row.unread_admin ? " is-unread" : ""}`}
      aria-current={active ? "page" : undefined}
    >
      <span className="wa-avatar" data-tone={tone} aria-hidden>
        {initials(label)}
      </span>
      <span className="wa-row-body">
        <span className="wa-row-top">
          <strong>{label}</strong>
          <time>{formatListTime(row.last_message_at)}</time>
        </span>
        <span className="wa-row-bottom">
          <span className="wa-preview">
            <em className="wa-channel">{channelLabel(row.channel)}</em>
            {row.preview || row.subject || "No messages yet"}
          </span>
          {row.unread_admin > 0 ? <span className="wa-unread">{row.unread_admin}</span> : null}
        </span>
      </span>
    </Link>
  );
});

export function SupportChatPage() {
  const { id } = useParams();
  const threadId = Number(id);
  const selectedId = Number.isFinite(threadId) && threadId > 0 ? threadId : 0;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [status, setStatus] = useState("");
  const [threads, setThreads] = useState<SupportThreadItem[]>([]);
  const [stats, setStats] = useState<{ unread: number; open: number; total: number } | null>(null);
  const [indexLoading, setIndexLoading] = useState(true);
  const [thread, setThread] = useState<SupportThreadItem | null>(null);
  const [messages, setMessages] = useState<SupportMessageItem[]>([]);
  const [agents, setAgents] = useState<Array<{ id: number; name: string }>>([]);
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const indexLoadedOnce = useRef(false);
  const inboxRevRef = useRef("");
  const inboxFpRef = useRef("");
  const indexAbortRef = useRef<AbortController | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [channelOpen, setChannelOpen] = useState<"email" | "whatsapp" | null>(null);
  const [channelBody, setChannelBody] = useState("");
  const [channelSubject, setChannelSubject] = useState("");
  const [createSubject, setCreateSubject] = useState("");
  const [createBody, setCreateBody] = useState("");
  const [pickedCustomer, setPickedCustomer] = useState<PickedCustomer | null>(null);
  const [createOrderId, setCreateOrderId] = useState(() => searchParams.get("order_id") || "");
  const [contextOpen, setContextOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const composeRef = useRef<HTMLTextAreaElement>(null);
  const lastMessageIdRef = useRef(0);
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  const callTransport = useMemo(() => {
    if (selectedId <= 0) return null;
    return {
      getActive: async () => {
        const res = await adminApi.supportCallActive(selectedId);
        return res.call ?? null;
      },
      start: async (offerSdp: string) => {
        const res = await adminApi.supportCallStart(selectedId, {
          offer_sdp: offerSdp,
          type: "audio",
        });
        return res.call;
      },
      answer: async (callId: number, answerSdp: string) => {
        const res = await adminApi.supportCallAnswer(selectedId, callId, {
          answer_sdp: answerSdp,
        });
        return res.call;
      },
      poll: async (callId: number, afterSignalId: number) => {
        const res = await adminApi.supportCallPoll(selectedId, callId, afterSignalId);
        return {
          call: res.call ?? null,
          signals: res.signals ?? [],
          latest: Number(res.latest_signal_id || 0),
        };
      },
      signal: async (callId: number, type: string, payload?: string | null) => {
        await adminApi.supportCallSignal(selectedId, callId, { type, payload: payload ?? null });
      },
      end: async (callId: number, reason?: string) => {
        await adminApi.supportCallEnd(selectedId, callId, reason || "hangup");
      },
    };
  }, [selectedId]);

  const voice = useSupportWebRtcCall({
    enabled: selectedId > 0,
    role: "admin",
    transport: callTransport,
    peerLabel: customerLabel(thread?.customer_name),
  });

  const userIdFilter = searchParams.get("user_id") || undefined;
  const orderIdFilter = searchParams.get("order_id") || undefined;
  const filterParams = useMemo(
    () => ({
      q: qDebounced || undefined,
      status: status || undefined,
      user_id: userIdFilter,
      order_id: orderIdFilter,
      per_page: 80,
      include_stats: 1,
    }),
    [qDebounced, status, userIdFilter, orderIdFilter],
  );

  function applyInboxStats(summary?: SupportInboxStats | null) {
    if (!summary) return;
    setStats({ unread: summary.unread, open: summary.open, total: summary.total });
  }

  async function loadIndex(opts?: { showSkeleton?: boolean; resetRev?: boolean }) {
    const showSkeleton = opts?.showSkeleton ?? !indexLoadedOnce.current;
    if (showSkeleton) setIndexLoading(true);
    indexAbortRef.current?.abort();
    const ac = new AbortController();
    indexAbortRef.current = ac;
    if (opts?.resetRev) inboxRevRef.current = "";
    try {
      const list = await adminApi.supportThreads(
        {
          ...filterParams,
          since: inboxRevRef.current || undefined,
        },
        { signal: ac.signal },
      );
      if (list.inbox_rev) inboxRevRef.current = list.inbox_rev;
      applyInboxStats(list.stats);
      if (!list.unchanged) {
        const next = list.items ?? [];
        const fp = inboxFingerprint(next);
        if (fp !== inboxFpRef.current) {
          inboxFpRef.current = fp;
          setThreads(next);
        }
      }
      indexLoadedOnce.current = true;
    } catch (e) {
      if (isAbortError(e)) return;
      setError(e instanceof Error ? e.message : "Failed to load chats");
    } finally {
      if (!ac.signal.aborted && indexAbortRef.current === ac) setIndexLoading(false);
    }
  }

  async function loadThread(nextId: number, opts?: { incremental?: boolean }) {
    if (!nextId) {
      setThread(null);
      setMessages([]);
      lastMessageIdRef.current = 0;
      return;
    }
    try {
      const after =
        opts?.incremental && lastMessageIdRef.current > 0 ? lastMessageIdRef.current : 0;
      const res = await adminApi.supportThread(nextId, { afterMessageId: after });
      const lastBody = res.messages.at(-1)?.body?.trim() || null;
      setThread({
        ...res.thread,
        preview: res.thread.preview || lastBody || undefined,
      });
      if (res.incremental) {
        if (res.messages.length) {
          setMessages((prev) => {
            const seen = new Set(prev.map((m) => m.id));
            const merged = [...prev];
            for (const m of res.messages) {
              if (!seen.has(m.id)) merged.push(m);
            }
            return merged;
          });
        }
      } else {
        setMessages(res.messages);
      }
      const latest =
        Number(res.latest_message_id) ||
        res.messages.at(-1)?.id ||
        lastMessageIdRef.current;
      if (latest > lastMessageIdRef.current) lastMessageIdRef.current = latest;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load conversation");
    }
  }

  useEffect(() => {
    const next = q.trim();
    const t = window.setTimeout(() => {
      setQDebounced((prev) => (prev === next ? prev : next));
    }, 280);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    void loadIndex({ showSkeleton: !indexLoadedOnce.current, resetRev: true });
    // Inbox: faster when no chat open; slower while reading a thread.
    const ms = () => (selectedIdRef.current ? 10000 : 5000);
    let timer = window.setInterval(() => void loadIndex({ showSkeleton: false }), ms());
    const onVis = () => {
      window.clearInterval(timer);
      if (document.visibilityState === "hidden") return;
      void loadIndex({ showSkeleton: false });
      timer = window.setInterval(() => void loadIndex({ showSkeleton: false }), ms());
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
      indexAbortRef.current?.abort();
    };
  }, [filterParams]);

  useEffect(() => {
    lastMessageIdRef.current = 0;
    void loadThread(selectedId, { incremental: false });
    setContextOpen(false);
    if (!selectedId) return;

    let timer: number | undefined;
    const schedule = () => {
      if (timer) window.clearInterval(timer);
      const active =
        document.visibilityState !== "hidden" && document.hasFocus?.() !== false;
      const ms = active ? 2500 : 10000;
      timer = window.setInterval(() => {
        void loadThread(selectedId, { incremental: true });
      }, ms);
    };
    schedule();
    const onVis = () => {
      if (document.visibilityState === "visible") {
        void loadThread(selectedId, { incremental: true });
      }
      schedule();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    window.addEventListener("blur", onVis);
    return () => {
      if (timer) window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
      window.removeEventListener("blur", onVis);
    };
  }, [selectedId]);

  useEffect(() => {
    if (!contextOpen) return;
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") setContextOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [contextOpen]);

  useEffect(() => {
    adminApi.supportAgents().then(setAgents).catch(() => undefined);
  }, []);

  useEffect(() => {
    const userId = Number(searchParams.get("user_id") || 0);
    if (!userId) return;
    void adminApi
      .customer(userId)
      .then((res) => {
        const c = res.customer;
        setPickedCustomer({
          id: userId,
          username: String(c.username ?? c.name ?? `Customer #${userId}`),
          phone: String(c.phone ?? ""),
          email: String(c.email ?? ""),
        });
      })
      .catch(() => undefined);
  }, [searchParams]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, selectedId]);

  async function sendReply() {
    if (!selectedId || !reply.trim() || thread?.status === "closed") return;
    const body = reply.trim();
    const tempId = -Date.now();
    const optimistic: SupportMessageItem = {
      id: tempId,
      thread_id: selectedId,
      sender_type: "admin",
      sender_id: 0,
      sender_name: "You",
      body,
      type: "text",
      created_at: new Date().toISOString(),
      receipt: "sent",
    };
    setReply("");
    if (composeRef.current) composeRef.current.style.height = "auto";
    setMessages((prev) => [...prev, optimistic]);
    setBusy(true);
    setError("");
    try {
      const res = await adminApi.replySupportThread(selectedId, { body, notify: true });
      if (res.message) {
        setMessages((prev) => {
          const withoutTemp = prev.filter((m) => m.id !== tempId);
          if (withoutTemp.some((m) => m.id === res.message!.id)) return withoutTemp;
          return [...withoutTemp, res.message!];
        });
        lastMessageIdRef.current = Math.max(
          lastMessageIdRef.current,
          res.message.id,
          Number(res.latest_message_id) || 0,
        );
      } else {
        await loadThread(selectedId, { incremental: true });
      }
      void loadIndex({ showSkeleton: false });
      composeRef.current?.focus();
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setReply(body);
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  function onComposeKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendReply();
    }
  }

  async function patchThread(fields: Record<string, unknown>) {
    if (!selectedId) return;
    setBusy(true);
    try {
      await adminApi.updateSupportThread(selectedId, fields);
      await loadThread(selectedId);
      await loadIndex();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function createThread() {
    if (!pickedCustomer) {
      setError("Pick a customer first");
      return;
    }
    if (!createSubject.trim() || !createBody.trim()) {
      setError("Subject and message are required");
      return;
    }
    setError("");
    try {
      const res = await adminApi.createSupportThread({
        subject: createSubject.trim(),
        body: createBody.trim(),
        user_id: pickedCustomer.id,
        order_id: createOrderId ? Number(createOrderId) : undefined,
        channel: createOrderId ? "order" : "in_app",
      });
      setCreateOpen(false);
      setCreateSubject("");
      setCreateBody("");
      navigate(`/support/chats/${res.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    }
  }

  const title = customerLabel(thread?.customer_name);
  const headerTone = thread
    ? avatarToneIndex(
        avatarSeed({
          id: thread.id,
          user_id: thread.user_id,
          contact_id: thread.contact_id,
          customer_name: thread.customer_name,
        }),
      )
    : 0;

  const siblingThreads = useMemo(() => {
    if (!thread) return [];
    return threads.filter((row) => {
      if (row.id === thread.id) return false;
      if (thread.user_id > 0 && row.user_id === thread.user_id) return true;
      if (thread.contact_id && row.contact_id === thread.contact_id) return true;
      if (thread.customer_phone && row.customer_phone === thread.customer_phone) return true;
      if (thread.customer_email && row.customer_email === thread.customer_email) return true;
      return false;
    });
  }, [threads, thread]);

  return (
    <div
      className={`wa-workspace${selectedId ? " is-chat-open" : ""}${thread ? " has-context" : ""}${contextOpen ? " is-context-open" : ""}`}
    >
      <aside className="wa-index" aria-label="Chat index">
        <header className="wa-index-head">
          <div>
            <h1>Chats</h1>
            <p>
              {stats ? `${stats.unread} unread · ${stats.open} open` : "Customer support"}
            </p>
          </div>
          <button type="button" className="wa-icon-btn" aria-label="New chat" onClick={() => setCreateOpen(true)}>
            <Plus size={18} />
          </button>
        </header>
        <div className="wa-search">
          <Search size={15} aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, phone, order…"
            aria-label="Search chats"
          />
        </div>
        <div className="wa-chips" role="tablist" aria-label="Chat status">
          {[
            { value: "", label: "All" },
            { value: "open", label: "Open" },
            { value: "pending", label: "Pending" },
            { value: "resolved", label: "Resolved" },
          ].map((chip) => (
            <button
              key={chip.value || "all"}
              type="button"
              role="tab"
              aria-selected={status === chip.value}
              className={status === chip.value ? "is-active" : undefined}
              onClick={() => setStatus(chip.value)}
            >
              {chip.label}
            </button>
          ))}
        </div>
        <nav className="wa-list" aria-busy={indexLoading || undefined} aria-live="polite">
          {indexLoading
            ? Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="wa-row wa-row-skel" aria-hidden>
                  <span className="wa-skel wa-skel-avatar" />
                  <span className="wa-row-body">
                    <span className="wa-row-top">
                      <span className="wa-skel wa-skel-name" />
                      <span className="wa-skel wa-skel-time" />
                    </span>
                    <span className="wa-row-bottom">
                      <span className="wa-skel wa-skel-preview" />
                    </span>
                  </span>
                </div>
              ))
            : null}
          {!indexLoading
            ? threads.map((row) => (
                <WaInboxRow
                  key={row.id}
                  row={row}
                  active={row.id === selectedId}
                  search={searchParams.toString()}
                />
              ))
            : null}
          {!indexLoading && !threads.length ? <p className="wa-empty-list">No conversations yet.</p> : null}
          {indexLoading ? <span className="sr-only">Loading conversations…</span> : null}
        </nav>
      </aside>

      <section className="wa-pane" aria-label="Conversation">
        {thread ? (
          <>
            <header className="wa-chat-head">
              <div className="wa-chat-identity">
                <button
                  type="button"
                  className="wa-icon-btn wa-back"
                  aria-label="Back to chats"
                  onClick={() => navigate("/support/chats")}
                >
                  <ArrowLeft size={18} />
                </button>
                <span className="wa-avatar wa-avatar-sm" data-tone={headerTone} aria-hidden>
                  {initials(title)}
                </span>
                <div className="wa-chat-meta">
                  <strong>{title}</strong>
                </div>
              </div>
              <div className="wa-ticket-fields">
                <label className={`wa-mini-select wa-status-${thread.status}`}>
                  <span className="wa-mini-label">Status</span>
                  <span className="wa-mini-control">
                    <select
                      value={thread.status}
                      disabled={busy}
                      onChange={(e) => void patchThread({ status: e.target.value })}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{statusLabel(s)}</option>
                      ))}
                    </select>
                  </span>
                </label>
                <label className={`wa-mini-select wa-priority-${thread.priority}`}>
                  <span className="wa-mini-label">Priority</span>
                  <span className="wa-mini-control">
                    <select
                      value={thread.priority}
                      disabled={busy}
                      onChange={(e) => void patchThread({ priority: e.target.value })}
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                      ))}
                    </select>
                  </span>
                </label>
                <label className="wa-mini-select wa-mini-assign">
                  <span className="wa-mini-label">Assignee</span>
                  <span className="wa-mini-control">
                    <select
                      value={thread.assigned_to}
                      disabled={busy}
                      onChange={(e) => void patchThread({ assigned_to: Number(e.target.value) })}
                    >
                      <option value={0}>Unassigned</option>
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </span>
                </label>
              </div>
              <div className="wa-chat-tools">
                <button
                  type="button"
                  className={`wa-icon-btn wa-details-btn${contextOpen ? " is-active" : ""}`}
                  aria-label="Customer details"
                  aria-expanded={contextOpen}
                  onClick={() => setContextOpen((v) => !v)}
                >
                  <User size={18} />
                </button>
                <button
                  type="button"
                  className={`wa-voice-call-btn${voice.inCall ? " is-active" : ""}`}
                  aria-label="In-app voice call"
                  title="In-app voice call"
                  disabled={!selectedId || voice.phase === "starting"}
                  onClick={() => {
                    if (voice.inCall) return;
                    void voice.startCall();
                  }}
                >
                  <Phone size={18} />
                  <span>Web</span>
                </button>
                {telHref(thread.customer_phone) ? (
                  <a className="wa-call-btn" href={telHref(thread.customer_phone)} aria-label={`PSTN call ${title}`} title="Phone dialer">
                    <Phone size={18} />
                  </a>
                ) : (
                  <button type="button" className="wa-call-btn is-off" disabled aria-label="No phone number">
                    <Phone size={18} />
                  </button>
                )}
              </div>
            </header>

            <SupportCallOverlay
              phase={voice.phase}
              peerLabel={voice.peerLabel}
              error={voice.error}
              muted={voice.muted}
              elapsedSec={voice.elapsedSec}
              formatElapsed={voice.formatElapsed}
              onAccept={() => void voice.acceptIncoming()}
              onDecline={() => void voice.declineIncoming()}
              onHangup={() => void voice.hangup()}
              onToggleMute={voice.toggleMute}
              onRetry={() => void voice.startCall()}
              onDismiss={voice.dismissError}
            />

            <div className="wa-messages" ref={scrollRef}>
              {messages.map((m) => {
                const isCallEvent = m.type === "call_event";
                const isAuto = Boolean(m.is_auto_reply) || m.type === "auto_reply";
                if (isCallEvent) {
                  return (
                    <div key={m.id} className="wa-call-event">
                      <span>{m.body}</span>
                      <time>{formatBubbleTime(m.created_at)}</time>
                    </div>
                  );
                }
                const outgoing = m.sender_type === "admin" || m.sender_type === "system" || isAuto;
                return (
                  <article
                    key={m.id}
                    className={`wa-bubble${outgoing ? " is-out" : " is-in"}${isAuto ? " is-auto" : ""}`}
                  >
                    {isAuto ? <span className="wa-auto-tag">Auto reply</span> : null}
                    {!outgoing ? (
                      <span className="wa-bubble-name">
                        {m.sender_name || customerLabel(thread?.customer_name)}
                      </span>
                    ) : null}
                    {!isAuto && outgoing && m.sender_name ? (
                      <span className="wa-bubble-name wa-bubble-name-out">{m.sender_name}</span>
                    ) : null}
                    <p>{m.body}</p>
                    <footer>
                      <time>{formatBubbleTime(m.created_at)}</time>
                      {outgoing && !isAuto ? <WaReceiptTicks receipt={m.receipt} /> : null}
                    </footer>
                  </article>
                );
              })}
              {!messages.length ? <p className="wa-empty-thread">No messages yet. Send the first reply.</p> : null}
            </div>

            <form
              className="wa-compose"
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                void sendReply();
              }}
            >
              <div className="wa-compose-bar">
                <button type="button" className="wa-icon-btn" aria-label="Emoji" disabled>
                  <Smile size={20} />
                </button>
                <textarea
                  ref={composeRef}
                  rows={1}
                  aria-label="Type a message"
                  placeholder={thread.status === "closed" ? "This chat is closed" : "Type a message"}
                  value={reply}
                  onChange={(e) => {
                    setReply(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                  }}
                  onKeyDown={onComposeKey}
                  disabled={busy || thread.status === "closed"}
                />
                <button type="button" className="wa-icon-btn" aria-label="Attach" disabled>
                  <Paperclip size={20} />
                </button>
              </div>
              <button
                type="submit"
                className="wa-send"
                disabled={busy || !reply.trim() || thread.status === "closed"}
                aria-label="Send reply"
              >
                <Send size={18} />
              </button>
            </form>
          </>
        ) : (
          <div className="wa-blank">
            <MessageCircle size={56} strokeWidth={1.25} />
            <h2>Rawabi Help Center</h2>
            <p>Select a customer chat to receive messages and send replies — same layout as WhatsApp.</p>
            <div className="wa-blank-actions">
              <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}>
                Start a chat
              </button>
            </div>
          </div>
        )}
        {error ? <div className="wa-toast" role="alert">{error}</div> : null}
      </section>

      {thread ? (
        <>
          <button
            type="button"
            className="wa-context-scrim"
            aria-label="Close customer details"
            onClick={() => setContextOpen(false)}
          />
          <SupportCustomerContext
            thread={thread}
            siblingThreads={siblingThreads}
            onClose={() => setContextOpen(false)}
            onSendWhatsApp={() => {
              setChannelOpen("whatsapp");
              setChannelBody("");
            }}
            onSendEmail={() => {
              setChannelOpen("email");
              setChannelSubject(`Re: ${thread.subject}`);
              setChannelBody("");
            }}
          />
        </>
      ) : null}

      {channelOpen && thread ? (
        <div className="modal-backdrop" onClick={() => setChannelOpen(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="page-head">
              <h2>
                {channelOpen === "email" ? (
                  "Email customer"
                ) : (
                  <>
                    <WhatsApp size={18} aria-hidden style={{ verticalAlign: "middle", marginInlineEnd: 8 }} />
                    WhatsApp customer
                  </>
                )}
              </h2>
              <button type="button" className="btn btn-secondary" onClick={() => setChannelOpen(null)}>Close</button>
            </div>
            {channelOpen === "email" ? (
              <label className="field">
                Subject
                <input value={channelSubject} onChange={(e) => setChannelSubject(e.target.value)} />
              </label>
            ) : null}
            <label className="field">
              Message
              <textarea rows={4} value={channelBody} onChange={(e) => setChannelBody(e.target.value)} required />
            </label>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!channelBody.trim()}
              onClick={() => {
                void (async () => {
                  if (channelOpen === "email") {
                    await adminApi.supportEmail(thread.id, { subject: channelSubject, message: channelBody });
                  } else {
                    await adminApi.supportWhatsApp(thread.id, { message: channelBody });
                  }
                  setChannelOpen(null);
                  await loadThread(thread.id);
                })();
              }}
            >
              Send
            </button>
          </div>
        </div>
      ) : null}

      {createOpen ? (
        <div className="modal-backdrop" onClick={() => setCreateOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="page-head">
              <h2>New customer chat</h2>
              <button type="button" className="btn btn-secondary" onClick={() => setCreateOpen(false)}>Close</button>
            </div>
            <div className="field">
              <span>Customer</span>
              <CustomerPicker value={pickedCustomer} onChange={setPickedCustomer} />
            </div>
            <label className="field">
              Order ID (optional)
              <input value={createOrderId} onChange={(e) => setCreateOrderId(e.target.value)} placeholder="Link to an order" />
            </label>
            <label className="field">
              Subject
              <input value={createSubject} onChange={(e) => setCreateSubject(e.target.value)} required />
            </label>
            <label className="field">
              First message
              <textarea rows={4} value={createBody} onChange={(e) => setCreateBody(e.target.value)} required />
            </label>
            <button type="button" className="btn btn-primary" onClick={() => void createThread()}>
              Send & open chat
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
