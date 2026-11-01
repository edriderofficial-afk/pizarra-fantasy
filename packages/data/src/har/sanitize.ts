import { decodeBody, type HarEntry, type RawHarEntry } from './parse';

const CREDENTIAL_HEADER =
  /^(authorization|proxy-authorization|cookie|x-api-key)$|token|session|secret|auth/i;
const SENSITIVE_PARAM =
  /token|code|state|session|key|password|secret|auth|signature|^sig$|email|user(name)?$/i;
const JWT = /eyJ[\w-]{5,}\.[\w-]{5,}\.[\w-]{5,}/g;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const LONG_SECRET = /\b[A-Za-z0-9+/_-]{40,}={0,2}\b/g;
const SENSITIVE_KEY = /token|password|secret|email|phone|birth|address|dni|nif|iban/i;

export const REDACTED = '<redacted>';

/** Redacts secrets and personal data inside any JSON value (deep). */
export function redactValue(value: unknown, key = ''): unknown {
  if (typeof value === 'string') {
    if (SENSITIVE_KEY.test(key)) return REDACTED;
    return value.replace(JWT, '<jwt>').replace(EMAIL, '<email>').replace(LONG_SECRET, '<secret>');
  }
  if (Array.isArray(value)) return value.map((v) => redactValue(v, key));
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redactValue(v, k)]));
  }
  if (SENSITIVE_KEY.test(key) && value !== null) return REDACTED;
  return value;
}

/**
 * Keeps only JSON responses, drops request bodies and credential headers, redacts sensitive
 * query parameters and secrets in response bodies. Optionally filters by host.
 */
export function sanitizeEntries(entries: readonly RawHarEntry[], host?: string): HarEntry[] {
  const out: HarEntry[] = [];
  for (const e of entries) {
    let url: URL;
    try {
      url = new URL(e.request.url);
    } catch {
      continue;
    }
    if (host && url.host !== host) continue;
    const mime = e.response.content.mimeType ?? '';
    if (!mime.includes('json')) continue;
    const body = decodeBody(e.response.content);
    if (body === null) continue;
    let json: unknown;
    try {
      json = JSON.parse(body) as unknown;
    } catch {
      continue;
    }
    const query: Record<string, string> = {};
    for (const [k, v] of url.searchParams) query[k] = SENSITIVE_PARAM.test(k) ? REDACTED : v;
    out.push({
      method: e.request.method.toUpperCase(),
      host: url.host,
      path: url.pathname,
      query,
      hadCredentials: e.request.headers.some((h) => CREDENTIAL_HEADER.test(h.name)),
      status: e.response.status,
      json: redactValue(json),
    });
  }
  return out;
}
