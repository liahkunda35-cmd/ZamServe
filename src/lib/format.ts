export function kwacha(amount: number) {
  return `K${Math.round(amount).toLocaleString("en-US")}`;
}

export function splitDuration(totalMinutes: number) {
  const safe = Math.max(0, Math.round(totalMinutes));
  return { hours: Math.floor(safe / 60), minutes: safe % 60 };
}

export function formatDuration(totalMinutes: number) {
  const { hours, minutes } = splitDuration(totalMinutes);
  const hourLabel = `${hours} hour${hours === 1 ? "" : "s"}`;
  const minuteLabel = `${minutes} minute${minutes === 1 ? "" : "s"}`;
  if (hours === 0) return minuteLabel;
  if (minutes === 0) return hourLabel;
  return `${hourLabel} ${minuteLabel}`;
}

export function todayInLusaka(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lusaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function timeInLusaka(date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lusaka",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

export function formatWhen(date: string, time: string) {
  const value = new Date(`${date}T${time}:00+02:00`);
  const day = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lusaka",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(value);
  return `${day} · ${time}`;
}

export function formatStamp(iso: string) {
  const value = new Date(iso);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lusaka",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(value);
}

export function weekdayIndex(date: string) {
  return new Date(`${date}T12:00:00+02:00`).getUTCDay();
}

export function addDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

export function dayLabel(date: string) {
  const value = new Date(`${date}T12:00:00+02:00`);
  const today = todayInLusaka();
  if (date === today) return "Today";
  if (date === addDays(today, 1)) return "Tomorrow";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lusaka",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(value);
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radius = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function weekdayName(index: number) {
  return WEEKDAYS[index] ?? "";
}
