/**
 * Returns `value` only if it's a same-site path ("/providers/claim/42"),
 * otherwise `fallback`. Use for every `?next=` redirect: without this check,
 * a link like /providers/login?next=https://evil.example would bounce a user
 * off-site right after they sign in (an "open redirect").
 *
 * Rejects absolute URLs, protocol-relative "//host" paths, and "/\host"
 * (which some browsers treat like "//host").
 */
export function safeNext<F extends string | null>(
  value: string | null | undefined,
  fallback: F
): string | F {
  if (!value) return fallback;
  if (!value.startsWith('/')) return fallback;
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback;
  return value;
}
