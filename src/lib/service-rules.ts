export const BEAUTY_CATEGORY_SLUG = "beauty-cosmetics";

export function servicePhotoRequired(categorySlug?: string | null) {
  return categorySlug === BEAUTY_CATEGORY_SLUG;
}

export function normalizeDuration(hours: number, minutes: number) {
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 24 || minutes < 0 || minutes > 59) {
    return null;
  }
  if (hours === 24 && minutes > 0) return null;
  const total = hours * 60 + minutes;
  if (total < 15 || total > 24 * 60) return null;
  return total;
}
