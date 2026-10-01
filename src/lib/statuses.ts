export const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  ACCEPTED: "Confirmed",
  ON_THE_WAY: "On the way",
  ARRIVED: "Arrived",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REJECTED: "Declined",
};

export const FLOW = ["PENDING", "ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS", "COMPLETED"] as const;

export const NEXT_STATUS: Record<string, { status: string; label: string }> = {
  ACCEPTED: { status: "ON_THE_WAY", label: "Start trip" },
  ON_THE_WAY: { status: "ARRIVED", label: "I've arrived" },
  ARRIVED: { status: "IN_PROGRESS", label: "Start service" },
  IN_PROGRESS: { status: "COMPLETED", label: "Complete job" },
};

export function customerCanCancel(status: string) {
  return status === "PENDING" || status === "ACCEPTED" || status === "ON_THE_WAY";
}

export function providerCanCancel(status: string) {
  return status === "ACCEPTED" || status === "ON_THE_WAY";
}

export function canShareLocation(status: string) {
  return status === "ACCEPTED" || status === "ON_THE_WAY" || status === "ARRIVED" || status === "IN_PROGRESS";
}

export function customerCanSeeProviderPhone(status: string) {
  return status === "ACCEPTED" || status === "ON_THE_WAY" || status === "ARRIVED" || status === "IN_PROGRESS" || status === "COMPLETED";
}

export function isActiveStatus(status: string) {
  return status === "ON_THE_WAY" || status === "ARRIVED" || status === "IN_PROGRESS";
}

export const BUSY_STATUSES = ["ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS"];

export function canMessage(status: string) {
  return status === "ACCEPTED" || status === "ON_THE_WAY" || status === "ARRIVED" || status === "IN_PROGRESS" || status === "COMPLETED";
}
