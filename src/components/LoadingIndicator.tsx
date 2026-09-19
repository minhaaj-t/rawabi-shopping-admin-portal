type Size = "sm" | "md" | "lg";

type Props = {
  /** Accessible label (not shown as visible “Loading…” text). */
  label?: string;
  size?: Size;
  className?: string;
  padded?: boolean;
};

/** Shared page/content loader — lightweight CSS spinner (no WASM). */
export function LoadingIndicator({
  label = "Loading",
  size = "lg",
  className = "",
  padded = false,
}: Props) {
  return (
    <div
      className={`rw-loading rw-loading--${size}${padded ? " rw-loading--padded" : ""}${className ? ` ${className}` : ""}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="rw-loading-stage">
        <div className="rw-loading-spinner" aria-hidden />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Full-width card shell for early-return page loads. */
export function LoadingCard({ label = "Loading", size = "lg" }: { label?: string; size?: Size }) {
  return (
    <div className="card rw-loading-card">
      <LoadingIndicator label={label} size={size} padded />
    </div>
  );
}
