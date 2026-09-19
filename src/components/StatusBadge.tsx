type Props = { status: string };

const CLASS_MAP: Record<string, string> = {
  Processing: "badge-Processing",
  Picking: "badge-Picking",
  Picked: "badge-Picked",
  Ondelivery: "badge-Ondelivery",
  Delivered: "badge-Delivered",
  Converted: "badge-Delivered",
  "Pre-Order": "badge-Picking",
  "Pre Order": "badge-Picking",
  Cancelled: "badge-Cancelled",
  "Cancelled Driver": "badge-Cancelled",
  Pending: "badge-Picking",
  Added: "badge-Delivered",
  Rejected: "badge-Cancelled",
  "Already Added": "badge-Processing",
  Open: "badge-Picking",
  Resolved: "badge-Delivered",
  Closed: "badge-Cancelled",
  Active: "badge-Delivered",
  Inactive: "badge-Cancelled",
};

export function StatusBadge({ status }: Props) {
  const normalized = status === "Deliverd" ? "Delivered" : status;
  return <span className={`badge ${CLASS_MAP[normalized] ?? "badge-Processing"}`}>{normalized}</span>;
}
