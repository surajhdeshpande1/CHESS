/**
 * CHATURANGA SECURITY & SANITIZATION ENGINE
 * Enterprise Defense against XSS, Injection, Memory Corruption & State Tampering
 */

/**
 * Strips HTML tags, script elements, javascript: protocols, and malicious event handlers
 */
export function sanitizeText(input: unknown, maxLength = 100): string {
  if (input === null || input === undefined) return '';
  let str = String(input);

  // 1. Remove dangerous script and iframe blocks entirely
  str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  str = str.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  str = str.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // 2. Remove all HTML tags
  str = str.replace(/<[^>]+>/g, '');

  // 3. Remove inline javascript/data URI protocol vectors
  str = str.replace(/javascript\s*:/gi, '');
  str = str.replace(/data\s*:\s*text\/html/gi, '');
  str = str.replace(/vbscript\s*:/gi, '');

  // 4. Remove dangerous event handlers (e.g. onerror=, onload=)
  str = str.replace(/on\w+\s*=/gi, '');

  // 5. Normalize whitespace and trim
  str = str.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

  // 6. Enforce safe length boundary
  if (str.length > maxLength) {
    str = str.slice(0, maxLength).trim();
  }

  return str;
}

/**
 * Specific sanitizer for Player Names: allows letters, spaces, hyphens, apostrophes, dots
 */
export function sanitizePlayerName(input: unknown, maxLength = 60): string {
  const clean = sanitizeText(input, maxLength);
  // Allow Unicode letters (international names), spaces, hyphens, apostrophes, dots
  return clean.replace(/[^\p{L}\p{N}\s\-'.]/gu, '').replace(/\s{2,}/g, ' ').trim();
}

/**
 * Specific sanitizer for FIDE ID: alphanumeric, hyphens, max 15 chars
 */
export function sanitizeFideId(input: unknown): string {
  if (!input) return '';
  const clean = sanitizeText(input, 30);
  return clean.replace(/[^a-zA-Z0-9\-]/g, '').slice(0, 15);
}

/**
 * Specific sanitizer for Club / Federation / Organization: max 50 chars
 */
export function sanitizeOrganization(input: unknown, maxLength = 50): string {
  return sanitizeText(input, maxLength);
}

/**
 * Specific sanitizer for Arbiter / System Notes: max 300 chars
 */
export function sanitizeNotes(input: unknown, maxLength = 300): string {
  return sanitizeText(input, maxLength);
}

/**
 * Safe integer parser with clamp boundaries
 */
export function safeParseInt(value: unknown, fallback: number, min = 0, max = 100000): number {
  if (typeof value === 'number') {
    if (isNaN(value) || !isFinite(value)) return fallback;
    return Math.max(min, Math.min(max, Math.round(value)));
  }
  if (typeof value === 'string') {
    const parsed = parseInt(value.replace(/[^0-9\-]/g, ''), 10);
    if (isNaN(parsed) || !isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, parsed));
  }
  return fallback;
}

/**
 * Safe rating validator (standard FIDE ratings 0 to 3500)
 */
export function sanitizeRating(value: unknown, allowZero = true): number {
  const rating = safeParseInt(value, 0, 0, 3500);
  if (rating === 0 && !allowZero) return 0;
  return rating;
}

/**
 * Safe JSON parser that guarantees never throwing unhandled SyntaxErrors
 */
export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw || typeof raw !== 'string') return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || parsed === undefined) return fallback;
    return parsed as T;
  } catch (err) {
    console.warn('[SecuritySanitizer] Handled malformed JSON payload safely:', err);
    return fallback;
  }
}

/**
 * Fast, deterministic SHA-256 / Murmur-like hash of arbitrary objects for integrity audits
 */
export async function computeSha256(text: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(text);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // fallback to fast hash below
    }
  }

  // Pure deterministic 64-bit FNV-1a hash fallback
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

/**
 * Synchronous fast integrity checksum for tournament vaults
 */
export function computeFastChecksum(obj: unknown): string {
  const json = typeof obj === 'string' ? obj : JSON.stringify(obj || {});
  let hash = 0x811c9dc5;
  for (let i = 0; i < json.length; i++) {
    hash ^= json.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
