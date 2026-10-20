/**
 * Test Suite: Security Sanitization, Safe Parsing & Lockout Protection
 */

import {
  sanitizeText,
  sanitizePlayerName,
  sanitizeFideId,
  sanitizeOrganization,
  sanitizeRating,
  safeParseInt,
  safeJsonParse,
  computeFastChecksum,
  computeSha256,
} from './lib/securitySanitizer';

import {
  loginAsAdmin,
  logoutAdmin,
  getAdminLockoutStatus,
} from './lib/adminAuth';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`TEST FAILED: ${msg}`);
  }
  console.log(`✓ PASS: ${msg}`);
}

async function runTests() {
  console.log('--- STARTING SECURITY & SANITIZATION ENGINE TESTS ---');

  // 1. Script & HTML Injection Stripping
  const maliciousInput = '<script>alert("XSS")</script><b>Magnus</b> Carlsen <img src=x onerror=alert(1)>';
  const cleanName = sanitizePlayerName(maliciousInput);
  assert(!cleanName.includes('<script>'), 'Strips <script> tags completely');
  assert(!cleanName.includes('alert'), 'Strips inline alert vectors');
  assert(!cleanName.includes('onerror'), 'Strips onerror event handler');
  assert(!cleanName.includes('<b>'), 'Strips HTML formatting tags');
  assert(cleanName.includes('Magnus Carlsen'), 'Preserves legitimate name letters');

  // 2. Protocol and Data URI Attacks
  const dangerousLink = 'javascript:evil() data:text/html;base64,xxx Magnus';
  const sanitizedLink = sanitizeText(dangerousLink);
  assert(!sanitizedLink.includes('javascript:'), 'Strips javascript: pseudo-protocol');
  assert(!sanitizedLink.includes('data:'), 'Strips data:text/html protocol');

  // 3. FIDE ID Sanitization
  const rawId = '  FID-1503014<script>  ';
  const cleanId = sanitizeFideId(rawId);
  assert(cleanId === 'FID-1503014', `Cleans FIDE ID properly (got "${cleanId}")`);

  // 4. Safe Rating Parsing & Boundaries
  const rating1 = sanitizeRating('2850');
  assert(rating1 === 2850, 'Parses standard rating 2850 correctly');
  const rating2 = sanitizeRating('99999');
  assert(rating2 === 3500, 'Clamps out-of-bounds rating to 3500');
  const rating3 = sanitizeRating('invalid');
  assert(rating3 === 0, 'Falls back to 0 for invalid rating strings');

  // 5. Safe JSON Parsing
  const validJson = '{"key":"value"}';
  const resValid = safeJsonParse(validJson, {});
  assert(resValid.key === 'value', 'Parses valid JSON properly');

  const invalidJson = '{"key": broken json';
  const resInvalid = safeJsonParse(invalidJson, { fallback: true });
  assert(resInvalid.fallback === true, 'Gracefully returns fallback without throwing on broken JSON');

  // 6. Fast Checksums & SHA-256
  const hash1 = computeFastChecksum({ id: 1, name: 'Open' });
  const hash2 = computeFastChecksum({ id: 1, name: 'Open' });
  const hash3 = computeFastChecksum({ id: 2, name: 'Open' });
  assert(hash1 === hash2, 'Fast checksum is deterministic for identical objects');
  assert(hash1 !== hash3, 'Fast checksum differs for different objects');

  const sha = await computeSha256('FIDE_DUTCH_SYSTEM');
  assert(sha.length >= 8, 'Produces valid deterministic hash string');

  // 7. Admin Passkey Brute-Force Lockout
  logoutAdmin();
  // Clear any existing lockout state in mock localStorage
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('chaturanga_admin_lockout_attempts_v1');
  }

  // Attempt 1 to 4 failed logins
  for (let i = 1; i <= 4; i++) {
    const res = loginAsAdmin('wrong_password_' + i);
    assert(!res.success, `Rejects wrong password on attempt ${i}`);
  }

  // Attempt 5 triggers lockout
  const attempt5 = loginAsAdmin('wrong_password_5');
  assert(!attempt5.success, 'Rejects 5th wrong password attempt');
  assert(attempt5.error?.includes('Lockout Triggered') || attempt5.error?.includes('Lockout Active'), 'Triggers security lockout message');

  const lockoutStatus = getAdminLockoutStatus();
  assert(lockoutStatus.isLockedOut, 'Lockout status is active after 5 failures');
  assert(lockoutStatus.remainingSeconds > 0, 'Remaining lockout seconds is greater than 0');

  // Attempt during lockout even with valid password is blocked
  const blockedAttempt = loginAsAdmin('admin123');
  assert(!blockedAttempt.success, 'Blocks login during active lockout period');
  assert(blockedAttempt.error?.includes('Security Lockout Active'), 'Reports active security lockout');

  console.log('--- ALL SECURITY ENGINE TESTS COMPLETED SUCCESSFULLY ---');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
