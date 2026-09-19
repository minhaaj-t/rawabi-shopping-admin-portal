import type { SupportReceipt } from "../lib/api";

type Props = {
  receipt?: SupportReceipt | null;
};

function Tick({ double }: { double?: boolean }) {
  return (
    <svg width="16" height="11" viewBox="0 0 16 11" aria-hidden>
      <path fill="currentColor" d="M11.07.86 5.55 6.38 3.33 4.16 2.1 5.39l3.45 3.45L12.3 2.09z" />
      {double ? <path fill="currentColor" d="M14.33.86 8.81 6.38l-.86-.86-1.23 1.23 2.09 2.09L15.56 2.09z" /> : null}
    </svg>
  );
}

export function WaReceiptTicks({ receipt = "sent" }: Props) {
  const state = receipt === "read" || receipt === "delivered" ? receipt : "sent";
  const label = state === "read" ? "Read" : state === "delivered" ? "Delivered" : "Sent";

  return (
    <span className={`wa-receipt is-${state}`} title={label} aria-label={label}>
      <Tick double={state !== "sent"} />
    </span>
  );
}
