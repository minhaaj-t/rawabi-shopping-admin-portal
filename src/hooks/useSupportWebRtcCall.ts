import { useCallback, useEffect, useRef, useState } from "react";
import { acquireLocalAudio } from "../lib/supportCallMedia";

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

export type CallUiPhase =
  | "idle"
  | "starting"
  | "outgoing"
  | "incoming"
  | "connecting"
  | "active"
  | "ended"
  | "error";

type Transport = {
  getActive: () => Promise<SupportCallRecord | null>;
  start: (offerSdp: string) => Promise<SupportCallRecord>;
  answer: (callId: number, answerSdp: string) => Promise<SupportCallRecord>;
  poll: (
    callId: number,
    afterSignalId: number,
  ) => Promise<{ call: SupportCallRecord | null; signals: SupportCallSignal[]; latest: number }>;
  signal: (callId: number, type: string, payload?: string | null) => Promise<void>;
  end: (callId: number, reason?: string) => Promise<void>;
};

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

function isTerminal(status: string | undefined | null) {
  return status === "ended" || status === "missed" || status === "declined";
}

export function useSupportWebRtcCall(opts: {
  enabled: boolean;
  role: "customer" | "admin";
  transport: Transport | null;
  peerLabel?: string;
}) {
  const { enabled, role, transport, peerLabel = "Customer" } = opts;
  const [phase, setPhase] = useState<CallUiPhase>("idle");
  const [error, setError] = useState("");
  const [call, setCall] = useState<SupportCallRecord | null>(null);
  const [muted, setMuted] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const afterSignalRef = useRef(0);
  const callIdRef = useRef(0);
  const answeredOfferRef = useRef(false);
  const appliedAnswerRef = useRef(false);
  const iceSeenRef = useRef<Set<string>>(new Set());
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const selfInitiatorRef = useRef(false);
  const hangupLocalRef = useRef(false);
  const transportRef = useRef(transport);
  transportRef.current = transport;

  const cleanupMedia = useCallback(() => {
    try {
      pcRef.current?.close();
    } catch {
      /* ignore */
    }
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    afterSignalRef.current = 0;
    answeredOfferRef.current = false;
    appliedAnswerRef.current = false;
    iceSeenRef.current.clear();
    pendingIceRef.current = [];
    selfInitiatorRef.current = false;
  }, []);

  const ensureRemoteAudio = useCallback(() => {
    if (typeof document === "undefined") return null;
    if (!remoteAudioRef.current) {
      const el = document.createElement("audio");
      el.autoplay = true;
      el.setAttribute("playsinline", "true");
      el.style.display = "none";
      document.body.appendChild(el);
      remoteAudioRef.current = el;
    }
    return remoteAudioRef.current;
  }, []);

  const createPc = useCallback(async () => {
    cleanupMedia();
    const stream = await acquireLocalAudio();
    localStreamRef.current = stream;
    setMuted(false);
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    pc.ontrack = (ev) => {
      const audio = ensureRemoteAudio();
      if (!audio) return;
      const [remote] = ev.streams;
      if (remote) {
        audio.srcObject = remote;
        void audio.play().catch(() => undefined);
      }
    };
    pc.onicecandidate = (ev) => {
      const tid = callIdRef.current;
      const t = transportRef.current;
      if (!ev.candidate || !tid || !t) return;
      void t.signal(tid, "ice", JSON.stringify(ev.candidate.toJSON())).catch(() => undefined);
    };
    pcRef.current = pc;
    return pc;
  }, [cleanupMedia, ensureRemoteAudio]);

  const finishLocal = useCallback(
    (next: CallUiPhase = "ended") => {
      cleanupMedia();
      callIdRef.current = 0;
      setCall(null);
      setPhase(next);
      setElapsedSec(0);
      if (next === "ended") window.setTimeout(() => setPhase("idle"), 1200);
    },
    [cleanupMedia],
  );

  const hangup = useCallback(
    async (reason = "hangup") => {
      const tid = callIdRef.current;
      const t = transportRef.current;
      hangupLocalRef.current = true;
      if (tid && t) {
        try {
          await t.end(tid, reason);
        } catch {
          /* ignore */
        }
      }
      finishLocal("ended");
    },
    [finishLocal],
  );

  const applyRemoteIce = useCallback(
    async (sig: SupportCallSignal) => {
      if (sig.type !== "ice" || !sig.payload || !pcRef.current) return;
      if (sig.from_type === role) return;
      if (iceSeenRef.current.has(String(sig.id))) return;
      iceSeenRef.current.add(String(sig.id));
      try {
        const cand = JSON.parse(sig.payload) as RTCIceCandidateInit;
        if (!pcRef.current.remoteDescription) {
          pendingIceRef.current.push(cand);
          return;
        }
        await pcRef.current.addIceCandidate(cand);
      } catch {
        /* ignore */
      }
    },
    [role],
  );

  const flushPendingIce = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc?.remoteDescription || !pendingIceRef.current.length) return;
    const batch = pendingIceRef.current.splice(0);
    for (const cand of batch) {
      try {
        await pc.addIceCandidate(cand);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const bindIncoming = useCallback(
    async (incoming: SupportCallRecord) => {
      if (!incoming.offer_sdp || answeredOfferRef.current) return;
      answeredOfferRef.current = true;
      selfInitiatorRef.current = false;
      setPhase("connecting");
      setCall(incoming);
      callIdRef.current = incoming.id;
      const t = transportRef.current;
      if (!t) throw new Error("No transport");
      const pc = await createPc();
      await pc.setRemoteDescription({ type: "offer", sdp: incoming.offer_sdp });
      await flushPendingIce();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      const updated = await t.answer(incoming.id, answer.sdp || "");
      setCall(updated);
      setPhase("active");
    },
    [createPc, flushPendingIce],
  );

  const startCall = useCallback(async () => {
    const t = transportRef.current;
    if (!t || ["starting", "outgoing", "active", "connecting"].includes(phase)) return;
    setError("");
    setPhase("starting");
    hangupLocalRef.current = false;
    try {
      const existing = await t.getActive();
      if (existing && !isTerminal(existing.status)) {
        if (existing.initiator_type !== role) {
          setCall(existing);
          setPhase("incoming");
          callIdRef.current = existing.id;
          return;
        }
        setCall(existing);
        callIdRef.current = existing.id;
        setPhase(existing.status === "active" ? "active" : "outgoing");
        return;
      }
      const pc = await createPc();
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      selfInitiatorRef.current = true;
      const created = await t.start(offer.sdp || "");
      setCall(created);
      callIdRef.current = created.id;
      setPhase("outgoing");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Microphone or call failed");
      finishLocal("error");
    }
  }, [createPc, finishLocal, phase, role]);

  const dismissError = useCallback(() => {
    setError("");
    setPhase("idle");
  }, []);

  const acceptIncoming = useCallback(async () => {
    if (!call || phase !== "incoming") return;
    setError("");
    try {
      await bindIncoming(call);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not answer");
      hangupLocalRef.current = true;
      const tid = callIdRef.current;
      const t = transportRef.current;
      if (tid && t) {
        try {
          await t.end(tid, "hangup");
        } catch {
          /* ignore */
        }
      }
      finishLocal("error");
    }
  }, [bindIncoming, call, finishLocal, phase]);

  const declineIncoming = useCallback(async () => {
    await hangup("decline");
  }, [hangup]);

  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMuted(!track.enabled);
  }, []);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const finishLocalRef = useRef(finishLocal);
  finishLocalRef.current = finishLocal;
  const applyRemoteIceRef = useRef(applyRemoteIce);
  applyRemoteIceRef.current = applyRemoteIce;
  const flushPendingIceRef = useRef(flushPendingIce);
  flushPendingIceRef.current = flushPendingIce;

  useEffect(() => {
    if (!enabled || !transport) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled || hangupLocalRef.current) return;
      const currentPhase = phaseRef.current;
      if (currentPhase !== "idle" && currentPhase !== "incoming") return;
      try {
        const active = await transport.getActive();
        if (cancelled || !active || isTerminal(active.status)) return;
        if (active.initiator_type === role) {
          if (currentPhase === "idle" && callIdRef.current === 0) {
            callIdRef.current = active.id;
            setCall(active);
            setPhase(active.status === "active" ? "active" : "outgoing");
          }
          return;
        }
        callIdRef.current = active.id;
        setCall(active);
        setPhase("incoming");
      } catch {
        /* soft */
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled, role, transport]);

  useEffect(() => {
    if (!enabled || !transport) return;
    if (!["outgoing", "connecting", "active", "incoming"].includes(phase)) return;
    if (!callIdRef.current) return;

    let cancelled = false;
    const loop = async () => {
      const t = transportRef.current;
      const cid = callIdRef.current;
      if (!t || !cid || cancelled) return;
      try {
        const { call: remote, signals, latest } = await t.poll(cid, afterSignalRef.current);
        if (cancelled) return;
        if (latest > afterSignalRef.current) afterSignalRef.current = latest;
        if (remote) setCall(remote);

        for (const sig of signals) {
          if (sig.type === "hangup" || sig.type === "decline") {
            if (!hangupLocalRef.current) finishLocalRef.current("ended");
            return;
          }
          await applyRemoteIceRef.current(sig);
        }

        if (remote && isTerminal(remote.status)) {
          if (!hangupLocalRef.current) finishLocalRef.current("ended");
          return;
        }

        if (
          selfInitiatorRef.current &&
          remote?.answer_sdp &&
          !appliedAnswerRef.current &&
          pcRef.current
        ) {
          appliedAnswerRef.current = true;
          await pcRef.current.setRemoteDescription({ type: "answer", sdp: remote.answer_sdp });
          await flushPendingIceRef.current();
          setPhase("active");
        }
      } catch {
        /* soft */
      }
    };

    void loop();
    const id = window.setInterval(() => void loop(), 900);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled, phase, transport]);

  useEffect(() => {
    if (phase !== "active") {
      setElapsedSec(0);
      return;
    }
    const started = Date.now();
    const id = window.setInterval(() => setElapsedSec(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    return () => {
      cleanupMedia();
      if (remoteAudioRef.current?.parentNode) {
        remoteAudioRef.current.parentNode.removeChild(remoteAudioRef.current);
        remoteAudioRef.current = null;
      }
    };
  }, [cleanupMedia]);

  const formatElapsed = useCallback((sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }, []);

  return {
    phase,
    error,
    call,
    muted,
    elapsedSec,
    formatElapsed,
    peerLabel,
    startCall,
    acceptIncoming,
    declineIncoming,
    hangup,
    toggleMute,
    dismissError,
    inCall: phase === "outgoing" || phase === "connecting" || phase === "active" || phase === "incoming",
  };
}
