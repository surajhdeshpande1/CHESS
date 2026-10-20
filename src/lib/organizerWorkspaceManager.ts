// src/lib/organizerWorkspaceManager.ts
// Multi-Tournament Organizer Command Center & Workspace Persistence Manager

import { TournamentState } from './fideSwissEngine';
import { TournamentVault } from './tournamentVaultAndFeatures';

export interface TournamentSummaryCard {
  id: string;
  name: string;
  status: 'REGISTRATION' | 'IN_PROGRESS' | 'COMPLETED';
  playerCount: number;
  minPlayers: number;
  maxPlayers: number;
  currentRound: number;
  totalRounds: number;
  bakuAcceleration: boolean;
  createdAtISO: string;
  lastUpdatedISO: string;
  leaderName: string | null;
  leaderScore: number | null;
  organizerId?: string;
  organizerEmail?: string;
  organizerName?: string;
}

export interface TournamentWorkspaceEntry {
  createdAtISO: string;
  lastUpdatedISO: string;
  bakuAcceleration: boolean;
  organizerId?: string;
  organizerEmail?: string;
  organizerName?: string;
  vault: TournamentVault;
}

export interface OrganizerWorkspace {
  organizerName: string;
  organizationTitle: string;
  activeTournamentId: string;
  tournamentsById: Record<string, TournamentWorkspaceEntry>;
}

export const WORKSPACE_STORAGE_KEY = 'FIDE_ORGANIZER_MULTI_TOURNEY_WORKSPACE_V2';

export function createBlankTournamentVault(
  id: string,
  name: string,
  totalRounds = 7,
  minPlayers = 50,
  maxPlayers = 200,
  maxRating: number | null = null,
  maxAge: number | null = null,
  allowedGender: 'OPEN' | 'FEMALE_ONLY' = 'OPEN',
  organizerId?: string,
  organizerEmail?: string,
  organizerName?: string
): TournamentVault {
  const initialState: TournamentState = {
    id,
    name,
    tournamentYear: new Date().getFullYear(),
    organizerId,
    organizerEmail,
    organizerName,
    totalRounds,
    currentRound: 0,
    topSeedInitialColor: 'W',
    status: 'REGISTRATION',
    rules: {
      minPlayers,
      maxPlayers,
      minRating: null,
      maxRating,
      allowUnrated: true,
      minAge: null,
      maxAge,
      allowedGender,
      allowedOrganizations: [],
    },
    players: [],
    rounds: [],
  };

  return {
    currentState: initialState,
    auditLogs: [
      {
        id: `log_init_${Date.now()}`,
        sequenceNumber: 1,
        timestampISO: new Date().toISOString(),
        roundNumber: 0,
        actionType: 'TOURNAMENT_CREATED',
        actor: 'Organizer',
        summary: `Created tournament "${name}" (${minPlayers}–${maxPlayers} players, ${totalRounds} rounds).`,
        metadata: {},
      },
    ],
    snapshots: [],
  };
}

export function initializeDefaultWorkspace(): OrganizerWorkspace {
  const defaultId = 'tourney_main_open_2026';
  const openVault = createBlankTournamentVault(
    defaultId,
    'Grand FIDE Open Swiss Championship 2026',
    7,
    50,
    200
  );

  const u1600Id = 'tourney_u1600_challenger_2026';
  const u1600Vault = createBlankTournamentVault(
    u1600Id,
    'FIDE Under-1600 Challenger Cup 2026',
    7,
    50,
    200,
    1600
  );

  const now = new Date().toISOString();

  return {
    organizerName: 'Chief Tournament Organizer',
    organizationTitle: 'FIDE Swiss Master Command Center',
    activeTournamentId: defaultId,
    tournamentsById: {
      [defaultId]: {
        createdAtISO: now,
        lastUpdatedISO: now,
        bakuAcceleration: false,
        vault: openVault,
      },
      [u1600Id]: {
        createdAtISO: now,
        lastUpdatedISO: now,
        bakuAcceleration: false,
        vault: u1600Vault,
      },
    },
  };
}

export function getOrganizerTournamentSummaries(
  workspace: OrganizerWorkspace,
  filterUserId?: string | null,
  filterUserEmail?: string | null,
  isAdmin: boolean = false
): TournamentSummaryCard[] {
  return Object.values(workspace.tournamentsById)
    .filter((entry) => {
      // Superadmin has all access to view every tournament across all organizers
      if (isAdmin) return true;
      // If no filter is specified, return all (backward compatibility)
      if (!filterUserId && !filterUserEmail) return true;

      const ownerId = entry.organizerId || entry.vault.currentState.organizerId;
      const ownerEmail = entry.organizerEmail || entry.vault.currentState.organizerEmail;

      if (filterUserId && ownerId && ownerId === filterUserId) return true;
      if (
        filterUserEmail &&
        ownerEmail &&
        ownerEmail.trim().toLowerCase() === filterUserEmail.trim().toLowerCase()
      ) {
        return true;
      }

      // If this tournament was the default initial template and has no owner yet,
      // allow guest / single-user session to claim/view it
      if (!ownerId && !ownerEmail && (!filterUserId || filterUserId === 'guest_organizer')) {
        return true;
      }

      return false;
    })
    .map((entry) => {
      const st = entry.vault.currentState;
      const sortedByScore = [...st.players].sort((a, b) => b.score - a.score || a.tpn - b.tpn);
      const top = sortedByScore[0] || null;

      return {
        id: st.id,
        name: st.name,
        status: st.status,
        playerCount: st.players.length,
        minPlayers: st.rules.minPlayers,
        maxPlayers: st.rules.maxPlayers,
        currentRound: st.currentRound,
        totalRounds: st.totalRounds,
        bakuAcceleration: entry.bakuAcceleration,
        createdAtISO: entry.createdAtISO,
        lastUpdatedISO: entry.lastUpdatedISO,
        leaderName: top ? `#${top.tpn} ${top.name}` : null,
        leaderScore: top ? top.score : null,
        organizerId: entry.organizerId || st.organizerId,
        organizerEmail: entry.organizerEmail || st.organizerEmail,
        organizerName: entry.organizerName || st.organizerName,
      };
    })
    .sort((a, b) => b.lastUpdatedISO.localeCompare(a.lastUpdatedISO));
}

export function cloneTournamentTemplate(
  workspace: OrganizerWorkspace,
  sourceTournamentId: string,
  newName: string,
  organizerId?: string,
  organizerEmail?: string,
  organizerName?: string
): OrganizerWorkspace {
  const source = workspace.tournamentsById[sourceTournamentId];
  if (!source) return workspace;

  const newId = `tourney_${Date.now()}`;
  const srcState = source.vault.currentState;
  const ownerId = organizerId || source.organizerId || srcState.organizerId;
  const ownerEmail = organizerEmail || source.organizerEmail || srcState.organizerEmail;
  const ownerName = organizerName || source.organizerName || srcState.organizerName;

  const clonedVault = createBlankTournamentVault(
    newId,
    newName,
    srcState.totalRounds,
    srcState.rules.minPlayers,
    srcState.rules.maxPlayers,
    srcState.rules.maxRating,
    srcState.rules.maxAge,
    srcState.rules.allowedGender,
    ownerId,
    ownerEmail,
    ownerName
  );

  const now = new Date().toISOString();
  return {
    ...workspace,
    activeTournamentId: newId,
    tournamentsById: {
      ...workspace.tournamentsById,
      [newId]: {
        createdAtISO: now,
        lastUpdatedISO: now,
        bakuAcceleration: source.bakuAcceleration,
        organizerId: ownerId,
        organizerEmail: ownerEmail,
        organizerName: ownerName,
        vault: clonedVault,
      },
    },
  };
}
