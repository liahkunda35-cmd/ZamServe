import { normalizeDuration } from "@/lib/service-rules";

export function personName(value: string) {
  const text = value.trim();
  if (text.length < 2) return "Enter your full name.";
  if (!/^[\p{L}][\p{L}\s'.-]*$/u.test(text)) return "Name cannot contain numbers or invalid characters.";
  return "";
}

const EMAIL_MESSAGE = "Please enter a valid email address.";

export function emailAddress(value: string) {
  const text = value.trim();
  const match = text.match(/^([a-z0-9](?:[a-z0-9._+-]{0,62}[a-z0-9])?)@([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+)$/);
  if (!match) return EMAIL_MESSAGE;
  const local = match[1];
  const domain = match[2];
  const extension = domain.split(".").pop() ?? "";
  if (local.length > 64 || domain.length > 253 || local.includes("..") || domain.includes("..") || !/^[a-z]{2,}$/.test(extension)) {
    return EMAIL_MESSAGE;
  }
  return "";
}

export function phoneLocal(value: string) {
  const local = value.startsWith("0") ? value.slice(1) : value;
  if (!/^\d{9}$/.test(local)) return "Enter a valid Zambian phone number.";
  return "";
}

export function passwordValue(value: string, min = 6) {
  if (!value) return "Enter your password.";
  if (value.length < min) return `Use at least ${min} characters.`;
  return "";
}

export function confirmPassword(value: string, password: string) {
  if (!value) return "Confirm your password.";
  if (value !== password) return "Passwords do not match.";
  return "";
}

export function adultDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Enter your date of birth.";
  const born = new Date(`${value}T00:00:00`);
  const adult = new Date();
  adult.setFullYear(adult.getFullYear() - 18);
  if (Number.isNaN(born.getTime()) || born > adult) return "You need to be 18 or older.";
  return "";
}

export function priceKwacha(value: string) {
  if (!/^\d+$/.test(value)) return "Enter a valid price in kwacha.";
  const amount = Number(value);
  if (!Number.isInteger(amount) || amount < 1 || amount > 1_000_000) return "Enter a valid price in kwacha.";
  return "";
}

export function hourValue(value: string) {
  if (!/^\d{1,2}$/.test(value)) return "Enter the hours.";
  if (Number(value) > 24) return "Hours cannot be more than 24.";
  return "";
}

export function minuteValue(value: string, hours: string) {
  if (hourValue(hours)) return "";
  if (!/^\d{1,2}$/.test(value)) return "Enter the minutes.";
  const minutes = Number(value);
  if (minutes > 59) return "Minutes cannot be more than 59.";
  if (normalizeDuration(Number(hours), minutes) == null) return "Enter a duration from 15 minutes up to 24 hours.";
  return "";
}

export function requiredChoice(value: string, message: string) {
  return value.trim() ? "" : message;
}

export function serviceLabel(value: string) {
  const text = value.trim();
  if (text.length < 2) return "Enter the new service name.";
  if (!/^[\p{L}0-9][\p{L}0-9\s&'./-]{0,78}$/u.test(text)) return "Use letters or numbers only for the service name.";
  return "";
}

export function optionalText(value: string, max: number, label: string) {
  const text = value.trim();
  if (!text) return "";
  if (text.length > max) return `${label} must be ${max} characters or less.`;
  return "";
}

export function requiredText(value: string, max: number, empty: string, label: string) {
  const text = value.trim();
  if (text.length < 2) return empty;
  if (text.length > max) return `${label} must be ${max} characters or less.`;
  return "";
}

export function resetCode(value: string) {
  if (!/^\d{4,6}$/.test(value.trim())) return "Enter the reset code.";
  return "";
}

export function visaLast4(value: string) {
  if (!/^\d{4}$/.test(value.trim())) return "Enter the last 4 digits of the Visa card.";
  return "";
}

export function cardName(value: string) {
  return personName(value).replace("Enter your full name.", "Enter the name on the card.");
}

export function cardNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 16 || !digits.startsWith("4")) return "Enter a valid Visa card number.";
  return "";
}

export function cardExpiry(value: string) {
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(value)) return "Enter the expiry as MM/YY.";
  const [month, year] = value.split("/").map(Number);
  const now = new Date();
  const expiry = new Date(2000 + year, month, 1);
  if (expiry <= now) return "This card has expired.";
  return "";
}

export function searchQuery(value: string) {
  const text = value.trim();
  if (text.length < 2) return "Enter a service to search.";
  if (!/^[\p{L}0-9][\p{L}0-9\s&'./-]{0,78}$/u.test(text)) return "Use letters or numbers only in the search.";
  return "";
}

export function messageText(value: string) {
  const text = value.trim();
  if (!text) return "Write a message first.";
  if (text.length > 1000) return "That message is too long.";
  return "";
}

export function clockTime(value: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return "Enter a valid time.";
  return "";
}

const PHOTOS = ["image/jpeg", "image/png", "image/webp"];

export function imageFileProblem(file?: File) {
  if (!file) return "Choose a photo.";
  if (!PHOTOS.includes(file.type)) return "Use a JPG, PNG, or WebP image.";
  if (file.size > 2_500_000) return "That file is too large.";
  return "";
}

export function nrcFileProblem(file?: File) {
  if (!file) return "Upload your NRC.";
  const named = file.name.split(".").pop()?.toLowerCase() ?? "";
  const photo = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp", "image/heic", "image/heif"].includes(file.type);
  const pdf = file.type === "application/pdf" || named === "pdf";
  if (!photo && !pdf) return "Use a photo or a PDF for your NRC.";
  if (file.size > 8_000_000) return "That file is too large.";
  return "";
}
