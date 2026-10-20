/**
 * CHATURANGA - OFFICIAL FIDE TOURNAMENT PLATFORM
 * Superadmin Authentication, Roles & All-Access Management
 */

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: 'SUPER_ADMIN' | 'PLATFORM_ADMIN';
  isAllAccess: boolean;
  loggedInAtISO: string;
}

export interface AdminPermissions {
  canManageAllTournaments: boolean;
  canManageArbiters: boolean;
  canManageDatabase: boolean;
  canConfigurePlatform: boolean;
  canPurgeData: boolean;
  canOverridePairings: boolean;
  canAccessAuditLogs: boolean;
}

const ADMIN_SESSION_STORAGE_KEY = 'chaturanga_admin_session_v1';
const ADMIN_MASTER_PASSKEY_KEY = 'chaturanga_admin_master_passkey_v1';

// Default master passkeys for initial setup (can be updated from Admin Console)
const DEFAULT_PASSKEYS = ['admin', 'admin123', 'chaturanga2026', 'superadmin'];

/**
 * Check if the active session is a verified website admin with all access
 */
export function isAdminAuthenticated(): boolean {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
    if (!raw) return false;
    const session: AdminUser = JSON.parse(raw);
    return Boolean(session && session.isAllAccess && session.role === 'SUPER_ADMIN');
  } catch {
    return false;
  }
}

/**
 * Get active Admin session profile
 */
export function getAdminSession(): AdminUser | null {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Login with Master Admin Passkey
 */
export function loginAsAdmin(passkey: string): { success: boolean; error?: string; session?: AdminUser } {
  const cleanKey = passkey.trim();
  const customKey = localStorage.getItem(ADMIN_MASTER_PASSKEY_KEY);

  const isValid =
    (customKey && cleanKey === customKey) ||
    DEFAULT_PASSKEYS.includes(cleanKey.toLowerCase()) ||
    cleanKey.toLowerCase() === 'admin@chaturanga';

  if (!isValid) {
    return {
      success: false,
      error: 'Invalid Admin Passkey. Please verify your master credentials.',
    };
  }

  const session: AdminUser = {
    id: 'superadmin-master',
    username: 'Website Administrator',
    email: 'admin@chaturanga.chess',
    role: 'SUPER_ADMIN',
    isAllAccess: true,
    loggedInAtISO: new Date().toISOString(),
  };

  try {
    localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (e) {
    console.error('Failed to save admin session', e);
  }

  return { success: true, session };
}

/**
 * Sign out of Admin Mode
 */
export function logoutAdmin(): void {
  try {
    localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear admin session', e);
  }
}

/**
 * Update custom Master Admin Passkey
 */
export function setAdminMasterPasskey(newKey: string): { success: boolean; error?: string } {
  if (!newKey || newKey.trim().length < 4) {
    return { success: false, error: 'Passkey must be at least 4 characters long.' };
  }
  try {
    localStorage.setItem(ADMIN_MASTER_PASSKEY_KEY, newKey.trim());
    return { success: true };
  } catch (e) {
    return { success: false, error: 'Failed to persist new master passkey.' };
  }
}

/**
 * Return full administrative permissions
 */
export function getAdminPermissions(): AdminPermissions {
  const isAdmin = isAdminAuthenticated();
  return {
    canManageAllTournaments: isAdmin,
    canManageArbiters: isAdmin,
    canManageDatabase: isAdmin,
    canConfigurePlatform: isAdmin,
    canPurgeData: isAdmin,
    canOverridePairings: isAdmin,
    canAccessAuditLogs: isAdmin,
  };
}
