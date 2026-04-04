import { formatDistanceToNow, parseISO } from "date-fns";

export function formatServingDuration(activeDate: string | null): string {
  if (!activeDate) return "Unknown";
  try {
    const date = parseISO(activeDate);
    return formatDistanceToNow(date, { addSuffix: false });
  } catch {
    return "Unknown";
  }
}

export function formatServingDurationShort(activeDate: string | null): string {
  if (!activeDate) return "—";
  try {
    const date = parseISO(activeDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const totalMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;

    if (years > 0 && months > 0) return `${years}y ${months}m`;
    if (years > 0) return `${years}y`;
    if (months > 0) return `${months}m`;
    return "<1m";
  } catch {
    return "—";
  }
}
