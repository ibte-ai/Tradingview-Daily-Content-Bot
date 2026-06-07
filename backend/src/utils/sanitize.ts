/**
 * Sanitize a string to prevent injection attacks in log messages and DB queries.
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Strip HTML tags
    .replace(/[\x00-\x1F\x7F]/g, '') // Strip control characters
    .trim();
}

/**
 * Sanitize a trading symbol to uppercase alphanumeric + common separators.
 */
export function sanitizeSymbol(symbol: string): string {
  return symbol
    .toUpperCase()
    .replace(/[^A-Z0-9._\-/]/g, '')
    .slice(0, 20);
}

/**
 * Sanitize hashtags: ensure they start with # and contain only valid characters.
 */
export function sanitizeHashtags(tags: string[]): string[] {
  return tags
    .map((tag) => {
      const cleaned = tag.replace(/[^a-zA-Z0-9_]/g, '');
      return cleaned ? `#${cleaned}` : '';
    })
    .filter((tag) => tag.length > 1);
}

/**
 * Truncate a string to a maximum length, adding ellipsis if needed.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}
