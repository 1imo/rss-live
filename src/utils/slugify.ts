/**
 * Convert text to URL-friendly slug
 */
export function slugify(text: string): string {
  if (!text || typeof text !== 'string') return '';

  return text
    .toLowerCase()
    .trim()
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, '-')
    // Remove special characters except hyphens
    .replace(/[^\w\-]+/g, '')
    // Remove multiple consecutive hyphens
    .replace(/\-\-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit length to 100 characters
    .substring(0, 100)
    // Remove trailing hyphen if truncated
    .replace(/-+$/, '');
}

/**
 * Generate a unique slug by appending a number if needed
 */
export function generateUniqueSlug(baseSlug: string, existingSlugs: string[]): string {
  let slug = slugify(baseSlug);
  let counter = 1;

  while (existingSlugs.includes(slug)) {
    slug = `${slugify(baseSlug)}-${counter}`;
    counter++;
  }

  return slug;
}

/**
 * Convert a title and date to a dated slug
 */
export function createDatedSlug(title: string, date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const dateStr = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
  const titleSlug = slugify(title);

  return `${dateStr}-${titleSlug}`;
}
