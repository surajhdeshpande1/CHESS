export type OfficialRoleType = 'CERTIFIED_ARBITER' | 'ORGANIZER';

export type ArbiterTitle =
  | 'IA'
  | 'FA'
  | 'NA'
  | 'CA'
  | 'CHIEF_ARBITER'
  | 'TOURNAMENT_DIRECTOR'
  | 'CLUB_ORGANIZER'
  | 'SCHOOL_COACH'
  | 'CHESS_ORGANIZER';

export interface ArbiterProfile {
  id: string;
  name: string;
  roleType: OfficialRoleType;
  fideId?: string;
  title: ArbiterTitle;
  federation: string;
  organizationName?: string;
  email: string;
  passwordHash: string; // Stored locally
  registeredAtISO: string;
}

const ARBITERS_STORAGE_KEY = 'fide_registered_arbiters_v2';
const SESSION_STORAGE_KEY = 'fide_active_arbiter_session_v2';

export function getRegisteredArbiters(): ArbiterProfile[] {
  try {
    const raw = localStorage.getItem(ARBITERS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load registered officials', e);
  }
  return [];
}

export function saveRegisteredArbiters(arbiters: ArbiterProfile[]): void {
  try {
    localStorage.setItem(ARBITERS_STORAGE_KEY, JSON.stringify(arbiters));
  } catch (e) {
    console.error('Failed to save officials', e);
  }
}

export function getActiveArbiterSession(): ArbiterProfile | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load active official session', e);
  }
  return null;
}

export function setActiveArbiterSession(arbiter: ArbiterProfile | null): void {
  try {
    if (arbiter) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(arbiter));
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch (e) {
    console.error('Failed to save active official session', e);
  }
}

export function registerOfficial(data: {
  name: string;
  email: string;
  password: string;
  roleType: OfficialRoleType;
  title: ArbiterTitle;
  federation: string;
  organizationName?: string;
  fideId?: string;
}): { success: boolean; error?: string; profile?: ArbiterProfile } {
  const existing = getRegisteredArbiters();
  const emailNorm = data.email.trim().toLowerCase();

  if (existing.some((a) => a.email.toLowerCase() === emailNorm)) {
    return { success: false, error: 'An official with this email address already exists. Please sign in.' };
  }

  const newProfile: ArbiterProfile = {
    id: `off-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: data.name.trim(),
    email: emailNorm,
    passwordHash: btoa(data.password),
    roleType: data.roleType,
    title: data.title,
    federation: data.federation.trim() || (data.roleType === 'CERTIFIED_ARBITER' ? 'FIDE' : 'Club / Independent'),
    organizationName: data.organizationName?.trim() || undefined,
    fideId: data.fideId?.trim() || undefined,
    registeredAtISO: new Date().toISOString(),
  };

  saveRegisteredArbiters([...existing, newProfile]);
  setActiveArbiterSession(newProfile);

  return { success: true, profile: newProfile };
}

// Backward compatible alias
export const registerArbiter = registerOfficial;

export function loginOfficial(
  emailOrId: string,
  password: string
): { success: boolean; error?: string; profile?: ArbiterProfile } {
  const existing = getRegisteredArbiters();
  const query = emailOrId.trim().toLowerCase();
  const hash = btoa(password);

  const found = existing.find(
    (a) =>
      (a.email.toLowerCase() === query || (a.fideId && a.fideId.toLowerCase() === query)) &&
      a.passwordHash === hash
  );

  if (!found) {
    return {
      success: false,
      error: 'Invalid credentials. If you are newly conducting tournaments, please register your profile or continue as an Organizer.',
    };
  }

  setActiveArbiterSession(found);
  return { success: true, profile: found };
}

// Backward compatible alias
export const loginArbiter = loginOfficial;

export function createGuestOrganizerSession(name?: string, orgName?: string): ArbiterProfile {
  const guest: ArbiterProfile = {
    id: `guest-org-${Date.now()}`,
    name: name?.trim() || 'Tournament Organizer',
    roleType: 'ORGANIZER',
    title: 'TOURNAMENT_DIRECTOR',
    federation: 'Club Open',
    organizationName: orgName?.trim() || 'Open Chess League',
    email: 'organizer@chess.local',
    passwordHash: '',
    registeredAtISO: new Date().toISOString(),
  };
  setActiveArbiterSession(guest);
  return guest;
}

export function logoutArbiter(): void {
  setActiveArbiterSession(null);
}

export function formatArbiterBadge(official: ArbiterProfile): string {
  const titleMap: Record<ArbiterTitle, string> = {
    IA: 'International Arbiter (IA)',
    FA: 'FIDE Arbiter (FA)',
    NA: 'National Arbiter (NA)',
    CA: 'Club Arbiter',
    CHIEF_ARBITER: 'Chief Arbiter',
    TOURNAMENT_DIRECTOR: 'Tournament Director',
    CLUB_ORGANIZER: 'Club Organizer',
    SCHOOL_COACH: 'School Coach',
    CHESS_ORGANIZER: 'Event Organizer',
  };

  const titleStr = titleMap[official.title] || (official.roleType === 'CERTIFIED_ARBITER' ? 'Arbiter' : 'Director');
  const orgStr = official.organizationName ? ` (${official.organizationName})` : official.federation ? ` (${official.federation})` : '';
  const icon = official.roleType === 'CERTIFIED_ARBITER' ? '⚖' : '🏛';

  return `${icon} ${titleStr} • ${official.name}${orgStr}`;
}

