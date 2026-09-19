import type { CallUiPhase } from "../hooks/useSupportWebRtcCall";

type Props = {
  phase: CallUiPhase;
  peerLabel: string;
  error?: string;
  muted: boolean;
  elapsedSec: number;
  formatElapsed: (sec: number) => string;
  onAccept: () => void;
  onDecline: () => void;
  onHangup: () => void;
  onToggleMute: () => void;
  onRetry?: () => void;
  onDismiss?: () => void;
};

export function SupportCallOverlay({
  phase,
  peerLabel,
  error,
  muted,
  elapsedSec,
  formatElapsed,
  onAccept,
  onDecline,
  onHangup,
  onToggleMute,
  onRetry,
  onDismiss,
}: Props) {
  if (phase === "idle") return null;

  const title =
    phase === "incoming"
      ? "Incoming call"
      : phase === "outgoing" || phase === "starting"
        ? "Calling customer…"
        : phase === "connecting"
          ? "Connecting…"
          : phase === "active"
            ? "On call"
            : phase === "ended"
              ? "Call ended"
              : phase === "error"
                ? "Call failed"
                : "Call";

  return (
    <div className="wa-call-overlay" role="dialog" aria-label={title}>
      <div className="wa-call-card">
        <p className="wa-call-title">{title}</p>
        <p className="wa-call-peer">{peerLabel}</p>
        {phase === "active" ? <p className="wa-call-timer">{formatElapsed(elapsedSec)}</p> : null}
        {error ? <p className="wa-call-error">{error}</p> : null}
        <div className="wa-call-actions">
          {phase === "error" ? (
            <>
              {onRetry ? (
                <button type="button" className="wa-voice-btn is-accept" onClick={onRetry}>
                  Retry
                </button>
              ) : null}
              <button type="button" className="wa-voice-btn is-hangup" onClick={onDismiss || onHangup}>
                Close
              </button>
            </>
          ) : null}
          {phase === "incoming" ? (
            <>
              <button type="button" className="wa-voice-btn is-decline" onClick={onDecline}>
                Decline
              </button>
              <button type="button" className="wa-voice-btn is-accept" onClick={onAccept}>
                Answer
              </button>
            </>
          ) : null}
          {phase === "outgoing" || phase === "starting" || phase === "connecting" || phase === "active" ? (
            <>
              {phase === "active" ? (
                <button
                  type="button"
                  className={`wa-voice-btn is-mute${muted ? " is-on" : ""}`}
                  onClick={onToggleMute}
                >
                  {muted ? "Unmute" : "Mute"}
                </button>
              ) : null}
              <button type="button" className="wa-voice-btn is-hangup" onClick={onHangup}>
                End call
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
