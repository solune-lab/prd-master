/**
 * Returns an absolute API URL that works under any basePath configuration.
 *
 * Next.js automatically prefixes basePath for `next/link`, `next/router`, and
 * `next/image`, but NOT for raw `fetch('/api/...')` calls. This helper ensures
 * every client-side fetch includes the correct base path prefix.
 *
 * Examples (basePath = '/prd-master'):
 *   apiUrl('/api/chat')                → '/prd-master/api/chat'
 *   apiUrl('/api/verify-turnstile')    → '/prd-master/api/verify-turnstile'
 */
export function apiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  // Avoid double-slashing
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
