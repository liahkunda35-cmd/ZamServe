export function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "");
  let local = digits;
  if (local.startsWith("260")) local = local.slice(3);
  if (local.startsWith("0")) local = local.slice(1);
  if (!/^\d{9}$/.test(local)) return null;
  return `+260${local}`;
}

export function formatPhone(phone: string) {
  const normalized = normalizePhone(phone) ?? phone;
  const local = normalized.replace("+260", "");
  if (local.length !== 9) return normalized;
  return `+260 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
}
