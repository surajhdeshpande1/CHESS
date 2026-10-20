import React, { useEffect, useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { LandingHeroView } from './components/LandingHeroView';
import { ArbiterAuthView } from './components/ArbiterAuthView';
import { HomeDashboardView } from './components/HomeDashboardView';
import { SequentialStepper, SequentialStep } from './components/SequentialStepper';
import { Step1CreateTournament } from './components/Step1CreateTournament';
import { Step2RosterEntry } from './components/Step2RosterEntry';
import { Step3LiveMatches } from './components/Step3LiveMatches';
import { LiveStandingsView } from './components/LiveStandingsView';
import { Step5CompletedPodium } from './components/Step5CompletedPodium';

import { ActivityAndUndoDrawer } from './components/ActivityAndUndoDrawer';
import { FideIntegrityModal } from './components/FideIntegrityModal';
import { PairingXRayModal } from './components/PairingXRayModal';
import { PrizeCalculatorModal } from './components/PrizeCalculatorModal';
import { FindMyBoardModal } from './components/FindMyBoardModal';
import { BulkCertificatesModal } from './components/BulkCertificatesModal';
import { SupabaseSyncModal } from './components/SupabaseSyncModal';
import { AdminCommandCenterModal } from './components/AdminCommandCenterModal';
import { isAdminAuthenticated } from './lib/adminAuth';
import { isSupabaseConfigured } from './lib/supabaseClient';
import { saveTournamentToCloud } from './storage/supabaseSync';
import {
  OrganizerWorkspace,
  WORKSPACE_STORAGE_KEY,
  initializeDefaultWorkspace,
  getOrganizerTournamentSummaries,
  createBlankTournamentVault,
} from './lib/organizerWorkspaceManager';
import { OrganizerDashboardHub } from './components/OrganizerDashboardHub';

import { createInitialTournamentState, DEFAULT_RULES, get64DemoCandidates } from './data/quickDemoData';
import {
  ArbiterProfile,
  getActiveArbiterSession,
  logoutArbiter,
  createGuestOrganizerSession,
} from './lib/arbiterAuth';
import {
  BoardPairing,
  CandidatePlayer,
  EligibilityRules,
  FideTitle,
  GameResult,
  generateNextRoundPairings,
  recordBoardResult,
  seedPlayersAndAssignTPN,
  TournamentState,
} from './lib/fideSwissEngine';
import {
  createAuditAndSnapshot,
  reopenPreviousRound,
  TournamentVault,
  undoLastTournamentAction,
  verifyTournamentIntegrity,
  exportTournamentStateToTRF16,
} from './lib/tournamentVaultAndFeatures';

const STORAGE_VAULT_KEY = 'fide_fresh_empty_vault_v3';

export const App: React.FC = () => {
  // Active Arbiter Session State (Persisted in localStorage)
  const [activeArbiter, setActiveArbiter] = useState<ArbiterProfile | null>(() => {
    return getActiveArbiterSession();
  });

  // View Mode: 'LANDING' -> 'AUTH' -> 'DASHBOARD' -> 'APP' -> 'ORGANIZER_HUB'
  const [viewMode, setViewMode] = useState<'LANDING' | 'AUTH' | 'DASHBOARD' | 'APP' | 'ORGANIZER_HUB'>('LANDING');

  // Multi-Tournament Organizer Workspace State (Persisted under WORKSPACE_STORAGE_KEY)
  const [workspace, setWorkspace] = useState<OrganizerWorkspace>(() => {
    try {
      const saved = localStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.tournamentsById && parsed.activeTournamentId) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load workspace from storage', e);
    }

    const defaultWs = initializeDefaultWorkspace();
    try {
      const oldVaultStr = localStorage.getItem(STORAGE_VAULT_KEY);
      if (oldVaultStr) {
        const oldVault = JSON.parse(oldVaultStr);
        if (oldVault && oldVault.currentState) {
          const oldId = oldVault.currentState.id || 'tourney_main_open_2026';
          defaultWs.tournamentsById[oldId] = {
            createdAtISO: new Date().toISOString(),
            lastUpdatedISO: new Date().toISOString(),
            bakuAcceleration: Boolean(oldVault.currentState.bakuAcceleration),
            vault: oldVault,
          };
          defaultWs.activeTournamentId = oldId;
        }
      }
    } catch {
      // ignore
    }
    return defaultWs;
  });

  const isAdmin = isAdminAuthenticated();

  // Scoped tournaments for the current organizer (or all platform tournaments for superadmin)
  const tournamentSummaries = useMemo(() => {
    return getOrganizerTournamentSummaries(
      workspace,
      activeArbiter?.id,
      activeArbiter?.email,
      isAdmin
    );
  }, [workspace, activeArbiter, isAdmin]);

  // Ensure active tournament strictly belongs to current organizer if not admin
  const activeEntry = useMemo(() => {
    if (isAdmin) {
      return (
        workspace.tournamentsById[workspace.activeTournamentId] ||
        Object.values(workspace.tournamentsById)[0] ||
        workspace.tournamentsById['tourney_main_open_2026']
      );
    }

    if (activeArbiter) {
      const currentActive = workspace.tournamentsById[workspace.activeTournamentId];
      if (
        currentActive &&
        (currentActive.organizerId === activeArbiter.id ||
          (currentActive.organizerEmail &&
            currentActive.organizerEmail.toLowerCase() === activeArbiter.email.toLowerCase()))
      ) {
        return currentActive;
      }

      // If activeTournamentId doesn't belong to active user, find user's first tournament
      const userTournament = Object.values(workspace.tournamentsById).find(
        (entry) =>
          entry.organizerId === activeArbiter.id ||
          (entry.organizerEmail &&
            entry.organizerEmail.toLowerCase() === activeArbiter.email.toLowerCase())
      );
      if (userTournament) {
        return userTournament;
      }
    }

    return (
      workspace.tournamentsById[workspace.activeTournamentId] ||
      Object.values(workspace.tournamentsById)[0] ||
      workspace.tournamentsById['tourney_main_open_2026']
    );
  }, [workspace, activeArbiter, isAdmin]);

  const vault = activeEntry.vault;
  const tournament = vault.currentState;

  const setVault = (updater: TournamentVault | ((prev: TournamentVault) => TournamentVault)) => {
    setWorkspace((prevWs) => {
      const currentTargetId = activeEntry?.vault?.currentState?.id || prevWs.activeTournamentId;
      const currentEntry =
        prevWs.tournamentsById[currentTargetId] || Object.values(prevWs.tournamentsById)[0];
      if (!currentEntry) return prevWs;
      const nextVault = typeof updater === 'function' ? updater(currentEntry.vault) : updater;
      const now = new Date().toISOString();
      const ownerId = currentEntry.organizerId || activeArbiter?.id;
      const ownerEmail = currentEntry.organizerEmail || activeArbiter?.email;
      const ownerName = currentEntry.organizerName || activeArbiter?.name;

      return {
        ...prevWs,
        activeTournamentId: currentTargetId,
        tournamentsById: {
          ...prevWs.tournamentsById,
          [currentTargetId]: {
            ...currentEntry,
            lastUpdatedISO: now,
            bakuAcceleration: Boolean(nextVault.currentState.bakuAcceleration ?? currentEntry.bakuAcceleration),
            organizerId: ownerId,
            organizerEmail: ownerEmail,
            organizerName: ownerName,
            vault: {
              ...nextVault,
              currentState: {
                ...nextVault.currentState,
                organizerId: ownerId,
                organizerEmail: ownerEmail,
                organizerName: ownerName,
              },
            },
          },
        },
      };
    });
  };

  const handleSwitchTournament = (tourneyId: string) => {
    if (!workspace.tournamentsById[tourneyId]) return;
    setWorkspace((prev) => ({
      ...prev,
      activeTournamentId: tourneyId,
    }));
    const targetEntry = workspace.tournamentsById[tourneyId];
    if (targetEntry) {
      const t = targetEntry.vault.currentState;
      if (t.status === 'COMPLETED') setCurrentStep('final_results');
      else if (t.status === 'IN_PROGRESS') setCurrentStep('round_matches');
      else if (t.players.length > 0) setCurrentStep('roster_entry');
      else setCurrentStep('create_tournament');
    }
    navigateToView('APP');
  };

  // Sequential Step State: 'create_tournament' -> 'roster_entry' -> 'round_matches' -> 'standings' -> 'final_results'
  const [currentStep, setCurrentStep] = useState<SequentialStep>(() => {
    const t = vault.currentState;
    if (t.status === 'COMPLETED') return 'final_results';
    if (t.status === 'IN_PROGRESS') return 'round_matches';
    if (t.players.length > 0) return 'roster_entry';
    return 'create_tournament';
  });

  // Modals state
  const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState(false);
  const [isIntegrityModalOpen, setIsIntegrityModalOpen] = useState(false);
  const [xrayBoard, setXrayBoard] = useState<BoardPairing | null>(null);
  const [isPrizeModalOpen, setIsPrizeModalOpen] = useState(false);
  const [isFindBoardModalOpen, setIsFindBoardModalOpen] = useState(false);
  const [isCertificatesModalOpen, setIsCertificatesModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // HTML5 History & State Navigation Engine
  const navigateToView = (newMode: 'LANDING' | 'AUTH' | 'DASHBOARD' | 'APP' | 'ORGANIZER_HUB') => {
    setViewMode(newMode);
    try {
      window.history.pushState({ viewMode: newMode, currentStep }, '', window.location.pathname);
    } catch (e) {
      // ignore
    }
  };

  const navigateToStep = (newStep: SequentialStep) => {
    setCurrentStep(newStep);
    try {
      window.history.pushState({ viewMode, currentStep: newStep }, '', window.location.pathname);
    } catch (e) {
      // ignore
    }
  };

  // Universal In-App & Browser Back Button Resolver
  const handleGoBack = () => {
    // 1. If any modal or drawer is open, dismiss it first
    if (isAdminModalOpen) {
      setIsAdminModalOpen(false);
      return;
    }
    if (isActivityDrawerOpen) {
      setIsActivityDrawerOpen(false);
      return;
    }
    if (isIntegrityModalOpen) {
      setIsIntegrityModalOpen(false);
      return;
    }
    if (xrayBoard !== null) {
      setXrayBoard(null);
      return;
    }
    if (isPrizeModalOpen) {
      setIsPrizeModalOpen(false);
      return;
    }
    if (isFindBoardModalOpen) {
      setIsFindBoardModalOpen(false);
      return;
    }
    if (isCertificatesModalOpen) {
      setIsCertificatesModalOpen(false);
      return;
    }
    if (isSupabaseModalOpen) {
      setIsSupabaseModalOpen(false);
      return;
    }

    // 2. Step and View Hierarchy
    if (viewMode === 'APP') {
      if (currentStep === 'final_results') {
        navigateToStep('standings');
      } else if (currentStep === 'standings') {
        navigateToStep('round_matches');
      } else if (currentStep === 'round_matches') {
        if (tournament.currentRound === 1 && tournament.rounds.length <= 1) {
          navigateToStep('roster_entry');
        } else {
          navigateToView('DASHBOARD');
        }
      } else if (currentStep === 'roster_entry') {
        navigateToStep('create_tournament');
      } else if (currentStep === 'create_tournament') {
        navigateToView('DASHBOARD');
      }
    } else if (viewMode === 'ORGANIZER_HUB') {
      navigateToView('APP');
    } else if (viewMode === 'DASHBOARD') {
      navigateToView('LANDING');
    } else if (viewMode === 'AUTH') {
      navigateToView('LANDING');
    }
  };

  // Browser Native History Popstate Listener (Hardware & Browser Back Button)
  useEffect(() => {
    try {
      if (!window.history.state) {
        window.history.replaceState({ viewMode, currentStep }, '', window.location.pathname);
      }
    } catch (e) {
      // ignore
    }

    const handlePopState = (e: PopStateEvent) => {
      // If modal is open, close it without jumping screens
      if (
        isActivityDrawerOpen ||
        isIntegrityModalOpen ||
        xrayBoard !== null ||
        isPrizeModalOpen ||
        isFindBoardModalOpen ||
        isCertificatesModalOpen ||
        isSupabaseModalOpen ||
        isAdminModalOpen
      ) {
        setIsActivityDrawerOpen(false);
        setIsIntegrityModalOpen(false);
        setXrayBoard(null);
        setIsPrizeModalOpen(false);
        setIsFindBoardModalOpen(false);
        setIsCertificatesModalOpen(false);
        setIsSupabaseModalOpen(false);
        setIsAdminModalOpen(false);
        return;
      }

      if (e.state) {
        if (e.state.viewMode) {
          setViewMode(e.state.viewMode);
        }
        if (e.state.currentStep) {
          setCurrentStep(e.state.currentStep);
        }
      } else {
        handleGoBack();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [
    viewMode,
    currentStep,
    isActivityDrawerOpen,
    isIntegrityModalOpen,
    xrayBoard,
    isPrizeModalOpen,
    isFindBoardModalOpen,
    isCertificatesModalOpen,
    isSupabaseModalOpen,
    isAdminModalOpen,
    tournament,
  ]);

  // Triple-Redundancy Persistent Storage & Background Supabase Sync
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_VAULT_KEY, JSON.stringify(vault));
      localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
    } catch (e) {
      console.error('Failed to auto-save workspace to localStorage', e);
    }

    if (isSupabaseConfigured()) {
      const timer = setTimeout(() => {
        saveTournamentToCloud(vault, activeArbiter).catch((err) => {
          console.warn('Background Supabase sync notice:', err);
        });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [vault, activeArbiter]);

  // 7-Point Mathematical Invariant Guard check
  const integrity = verifyTournamentIntegrity(tournament);

  const arbiterActorName = activeArbiter
    ? `${activeArbiter.title} ${activeArbiter.name}`
    : 'Chief Arbiter';

  // STEP 1: Update Rules and Advance
  const handleUpdateRules = (
    newRules: EligibilityRules,
    newName?: string,
    newRounds?: number,
    newCity?: string,
    newRoundMinutes?: number,
    newIncrementSeconds?: number,
    newTimeControlCategory?: 'CLASSICAL' | 'RAPID' | 'BLITZ' | 'CUSTOM',
    newTimeControlName?: string,
    newAgeSettings?: any
  ) => {
    const nextState: TournamentState = {
      ...tournament,
      organizerId: activeArbiter?.id || tournament.organizerId,
      organizerEmail: activeArbiter?.email || tournament.organizerEmail,
      organizerName: activeArbiter?.name || tournament.organizerName,
      agePrizeSettings: newAgeSettings !== undefined ? newAgeSettings : tournament.agePrizeSettings,
      rules: newRules,
      name: newName !== undefined ? newName : tournament.name,
      totalRounds: newRounds !== undefined ? newRounds : tournament.totalRounds,
      city: newCity !== undefined ? newCity : tournament.city,
      roundDurationMinutes: newRoundMinutes !== undefined ? newRoundMinutes : tournament.roundDurationMinutes,
      roundIncrementSeconds: newIncrementSeconds !== undefined ? newIncrementSeconds : tournament.roundIncrementSeconds,
      timeControlCategory: newTimeControlCategory !== undefined ? newTimeControlCategory : tournament.timeControlCategory,
      timeControlName: newTimeControlName !== undefined ? newTimeControlName : tournament.timeControlName,
    };

    const updatedVault = createAuditAndSnapshot(
      vault,
      nextState,
      'TOURNAMENT_CREATED',
      `Configured tournament: "${nextState.name}" (${nextState.totalRounds} rounds, ${nextState.timeControlName || `${nextState.roundDurationMinutes || 15}m clock`}).`,
      arbiterActorName
    );

    setVault(updatedVault);
  };

  // STEP 2: Add Candidate
  const handleAddCandidate = (data: {
    name: string;
    rating: number;
    title: FideTitle;
    birthYear: number;
    gender: 'M' | 'F' | 'OTHER';
    organization: string;
    fideId?: string;
  }) => {
    const newPlayer: CandidatePlayer = {
      id: `cand-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: data.name,
      rating: data.rating,
      title: data.title,
      birthYear: data.birthYear,
      gender: data.gender,
      organization: data.organization,
      fideId: data.fideId,
      isActive: true,
      requestedByes: {},
      tpn: tournament.players.length + 1,
      score: 0,
      roundsWon: 0,
      otbWins: 0,
      otbBlackWins: 0,
      roundsDrawn: 0,
      roundsLost: 0,
      receivedPABOrForfeitWin: false,
      history: [],
      tieBreaks: {
        buchholzCut1: 0,
        buchholzTotal: 0,
        sonnebornBerger: 0,
        progressiveScore: 0,
        directEncounter: 0,
        mostWins: 0,
      },
    };

    const updated = seedPlayersAndAssignTPN([...tournament.players, newPlayer]);
    const nextState: TournamentState = {
      ...tournament,
      players: updated,
    };

    const updatedVault = createAuditAndSnapshot(
      vault,
      nextState,
      'PLAYER_ADDED',
      `Added player ${newPlayer.name} (${newPlayer.rating || 'Unrated'}, ${newPlayer.organization}). Assigned Seed #${newPlayer.tpn}.`,
      arbiterActorName
    );

    setVault(updatedVault);
  };

  // STEP 2: Bulk Add Candidates
  const handleBulkAddCandidates = (
    candidates: Array<{
      name: string;
      rating: number;
      title: FideTitle;
      birthYear: number;
      gender: 'M' | 'F' | 'OTHER';
      organization: string;
      fideId?: string;
    }>
  ) => {
    const newPlayers: CandidatePlayer[] = candidates.map((c, i) => ({
      id: `bulk-${Date.now()}-${i}`,
      name: c.name,
      rating: c.rating,
      title: c.title,
      birthYear: c.birthYear,
      gender: c.gender,
      organization: c.organization,
      fideId: c.fideId,
      isActive: true,
      requestedByes: {},
      tpn: 0,
      score: 0,
      roundsWon: 0,
      otbWins: 0,
      otbBlackWins: 0,
      roundsDrawn: 0,
      roundsLost: 0,
      receivedPABOrForfeitWin: false,
      history: [],
      tieBreaks: {
        buchholzCut1: 0,
        buchholzTotal: 0,
        sonnebornBerger: 0,
        progressiveScore: 0,
        directEncounter: 0,
        mostWins: 0,
      },
    }));

    const updated = seedPlayersAndAssignTPN([...tournament.players, ...newPlayers]);
    const nextState: TournamentState = {
      ...tournament,
      players: updated,
    };

    const updatedVault = createAuditAndSnapshot(
      vault,
      nextState,
      'PLAYER_ADDED',
      `Bulk imported ${newPlayers.length} candidate players. Total roster: ${updated.length}.`,
      arbiterActorName
    );

    setVault(updatedVault);
  };

  // STEP 2: Remove Individual Player
  const handleRemovePlayer = (playerId: string) => {
    const remaining = tournament.players.filter((p) => p.id !== playerId);
    const reseeded = seedPlayersAndAssignTPN(remaining);
    const nextState: TournamentState = {
      ...tournament,
      players: reseeded,
    };

    const updatedVault = createAuditAndSnapshot(
      vault,
      nextState,
      'PLAYER_WITHDRAWN',
      `Removed player from roster. Remaining players: ${reseeded.length}.`,
      arbiterActorName
    );

    setVault(updatedVault);
  };

  // STEP 2 -> STEP 3: Generate Round 1 Pairings
  const handleLockAndPairRound1 = () => {
    if (tournament.players.length < 2) {
      alert('Please add at least 2 players to generate Round 1 pairings.');
      return;
    }

    try {
      const seeded = seedPlayersAndAssignTPN(tournament.players);
      const lockedState: TournamentState = {
        ...tournament,
        players: seeded,
        currentRound: 0,
      };
      const r1Pairings = generateNextRoundPairings(lockedState);
      const nextState: TournamentState = {
        ...lockedState,
        status: 'IN_PROGRESS',
        currentRound: 1,
        rounds: [r1Pairings],
      };

      const updatedVault = createAuditAndSnapshot(
        vault,
        nextState,
        'ROUND_PAIRED',
        `Generated Round 1 pairings with ${seeded.length} players (${r1Pairings.length} boards) via FIDE Dutch engine.`,
        arbiterActorName
      );

      setVault(updatedVault);
      navigateToStep('round_matches');
    } catch (err) {
      alert('Pairing error: ' + err);
    }
  };

  // STEP 3: Arbiter Winner Tap (White = 1.0, Draw = 0.5, Black = 1.0)
  const handleTapResult = (boardNumber: number, result: GameResult) => {
    try {
      const nextState = recordBoardResult(
        tournament,
        tournament.currentRound,
        boardNumber,
        result
      );

      const board = tournament.rounds[tournament.currentRound - 1]?.find(
        (b) => b.boardNumber === boardNumber
      );
      const white = tournament.players.find((p) => p.id === board?.whitePlayerId);
      const black = tournament.players.find((p) => p.id === board?.blackPlayerId);

      const summary = `Round ${tournament.currentRound}, Board ${boardNumber}: Set result to [${result}] for ${white?.name || 'White'} vs ${black?.name || 'Black'}.`;

      const updatedVault = createAuditAndSnapshot(
        vault,
        nextState,
        'RESULT_RECORDED',
        summary,
        arbiterActorName
      );

      setVault(updatedVault);
    } catch (e: any) {
      alert(`Integrity Violation: ${e.message}`);
    }
  };

  // STEP 3: Auto-Score Remaining Boards
  const handleSimulateRemaining = () => {
    const currentRoundIdx = tournament.currentRound - 1;
    const currentBoards = tournament.rounds[currentRoundIdx] || [];
    let state = tournament;

    for (const b of currentBoards) {
      if (b.result === 'PENDING' && b.blackPlayerId !== null) {
        const white = state.players.find((p) => p.id === b.whitePlayerId);
        const black = state.players.find((p) => p.id === b.blackPlayerId);
        const ratingDiff = (white?.rating || 1800) - (black?.rating || 1800);
        const rand = Math.random();

        let simResult: GameResult = 'DRAW';
        if (ratingDiff > 100) {
          simResult = rand < 0.65 ? 'WHITE_WIN' : rand < 0.9 ? 'DRAW' : 'BLACK_WIN';
        } else if (ratingDiff < -100) {
          simResult = rand < 0.65 ? 'BLACK_WIN' : rand < 0.9 ? 'DRAW' : 'WHITE_WIN';
        } else {
          simResult = rand < 0.4 ? 'WHITE_WIN' : rand < 0.75 ? 'DRAW' : 'BLACK_WIN';
        }

        state = recordBoardResult(state, state.currentRound, b.boardNumber, simResult);
      }
    }

    const updatedVault = createAuditAndSnapshot(
      vault,
      state,
      'RESULT_RECORDED',
      `Auto-scored remaining pending boards for Round ${tournament.currentRound}.`,
      arbiterActorName
    );

    setVault(updatedVault);
  };

  // STEP 3 -> STEP 4: Advance to Next Round (or Complete Tournament)
  const handleAdvanceRound = () => {
    if (tournament.currentRound < tournament.totalRounds) {
      try {
        const nextPairings = generateNextRoundPairings(tournament);
        const nextRoundNum = tournament.currentRound + 1;
        const nextState: TournamentState = {
          ...tournament,
          currentRound: nextRoundNum,
          rounds: [...tournament.rounds, nextPairings],
        };

        const updatedVault = createAuditAndSnapshot(
          vault,
          nextState,
          'ROUND_PAIRED',
          `Generated Round ${nextRoundNum} pairings (${nextPairings.length} boards) via FIDE Dutch rules.`,
          arbiterActorName
        );

        setVault(updatedVault);
        navigateToStep('round_matches');
      } catch (err) {
        alert('Pairing error: ' + err);
      }
    } else {
      // Final round completed!
      const nextState: TournamentState = {
        ...tournament,
        status: 'COMPLETED',
      };

      const updatedVault = createAuditAndSnapshot(
        vault,
        nextState,
        'RESULT_RECORDED',
        `Championship concluded! All ${tournament.totalRounds} rounds scored with FIDE C.07 tie-breaks.`,
        arbiterActorName
      );

      setVault(updatedVault);
      confetti({ particleCount: 160, spread: 80, origin: { y: 0.6 } });
      navigateToStep('final_results');
    }
  };

  // Time Machine Undo & Round Rollback
  const handleUndo = () => {
    const updatedVault = undoLastTournamentAction(vault);
    setVault(updatedVault);
  };

  const handleReopenRound = () => {
    try {
      const updatedVault = reopenPreviousRound(vault);
      setVault(updatedVault);
      navigateToStep('round_matches');
    } catch (e: any) {
      alert(`Rollback Error: ${e.message}`);
    }
  };

  // Restart and Create Another Fresh Tournament
  const handleRestartNewTournament = () => {
    if (window.confirm('Start a fresh new tournament? Current tournament data will be archived.')) {
      const initial = createInitialTournamentState();
      const updatedVault = createAuditAndSnapshot(
        vault,
        initial,
        'TOURNAMENT_CREATED',
        'Initialized brand new empty tournament configuration.',
        arbiterActorName
      );
      setVault(updatedVault);
      navigateToStep('create_tournament');
      navigateToView('APP');
    }
  };

  // Export Official FIDE TRF16 File
  const handleExportTRF = () => {
    try {
      const trfContent = exportTournamentStateToTRF16(tournament);
      const blob = new Blob([trfContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(tournament.name || 'Tournament').replace(/\s+/g, '_')}_FIDE.trf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export TRF16 file: ' + err);
    }
  };

  // Dashboard Action 1: Create New Tournament
  const handleCreateNewFromDashboard = () => {
    const newId = `tourney_${Date.now()}`;
    const initialVault = createBlankTournamentVault(
      newId,
      'Swiss Open Championship 2026',
      5,
      50,
      200,
      null,
      null,
      'OPEN',
      activeArbiter?.id,
      activeArbiter?.email,
      activeArbiter?.name
    );
    const now = new Date().toISOString();
    setWorkspace((prev) => ({
      ...prev,
      activeTournamentId: newId,
      tournamentsById: {
        ...prev.tournamentsById,
        [newId]: {
          createdAtISO: now,
          lastUpdatedISO: now,
          bakuAcceleration: false,
          organizerId: activeArbiter?.id,
          organizerEmail: activeArbiter?.email,
          organizerName: activeArbiter?.name,
          vault: initialVault,
        },
      },
    }));
    navigateToStep('create_tournament');
    navigateToView('APP');
  };

  // Dashboard Action 2: Import Roster from Document
  const handleImportDocumentFromDashboard = () => {
    if (!tournament.name || tournament.organizerId !== activeArbiter?.id) {
      const newId = `tourney_${Date.now()}`;
      const initialVault = createBlankTournamentVault(
        newId,
        'Open Chess Championship 2026',
        5,
        50,
        200,
        null,
        null,
        'OPEN',
        activeArbiter?.id,
        activeArbiter?.email,
        activeArbiter?.name
      );
      const now = new Date().toISOString();
      setWorkspace((prev) => ({
        ...prev,
        activeTournamentId: newId,
        tournamentsById: {
          ...prev.tournamentsById,
          [newId]: {
            createdAtISO: now,
            lastUpdatedISO: now,
            bakuAcceleration: false,
            organizerId: activeArbiter?.id,
            organizerEmail: activeArbiter?.email,
            organizerName: activeArbiter?.name,
            vault: initialVault,
          },
        },
      }));
    }
    navigateToStep('roster_entry');
    navigateToView('APP');
  };

  // Dashboard Action 3: Quick 64-Player GM Demo
  const handleLaunchDemoTournament = () => {
    const demoPlayers = get64DemoCandidates();
    const demoId = `tourn-${Date.now()}`;
    const demoTournament: TournamentState = {
      id: demoId,
      name: 'Grandmaster FIDE Invitational 2026',
      city: 'Lausanne, Switzerland',
      tournamentYear: 2026,
      organizerId: activeArbiter?.id,
      organizerEmail: activeArbiter?.email,
      organizerName: activeArbiter?.name,
      totalRounds: 7,
      currentRound: 1,
      topSeedInitialColor: 'W',
      status: 'REGISTRATION',
      rules: { ...DEFAULT_RULES },
      roundDurationMinutes: 90,
      roundIncrementSeconds: 30,
      timeControlCategory: 'CLASSICAL',
      timeControlName: 'FIDE Standard 90m + 30s',
      players: demoPlayers,
      rounds: [],
    };
    const demoVault: TournamentVault = {
      currentState: demoTournament,
      auditLogs: [
        {
          id: `log_${Date.now()}`,
          sequenceNumber: 1,
          timestampISO: new Date().toISOString(),
          roundNumber: 0,
          actionType: 'TOURNAMENT_CREATED',
          actor: arbiterActorName,
          summary: 'Loaded 64-player Grandmaster Swiss tournament demo.',
          metadata: {},
        },
      ],
      snapshots: [],
    };
    const now = new Date().toISOString();
    setWorkspace((prev) => ({
      ...prev,
      activeTournamentId: demoId,
      tournamentsById: {
        ...prev.tournamentsById,
        [demoId]: {
          createdAtISO: now,
          lastUpdatedISO: now,
          bakuAcceleration: false,
          organizerId: activeArbiter?.id,
          organizerEmail: activeArbiter?.email,
          organizerName: activeArbiter?.name,
          vault: demoVault,
        },
      },
    }));
    navigateToStep('roster_entry');
    navigateToView('APP');
  };

  // 1. Landing Page Animation View
  if (viewMode === 'LANDING') {
    return (
      <LandingHeroView
        activeArbiter={activeArbiter}
        onProceedToAuth={() => navigateToView('AUTH')}
        onEnterApp={() => navigateToView('AUTH')}
        onSignOut={() => {
          logoutArbiter();
          setActiveArbiter(null);
        }}
        onInstantGuestAccess={(guest) => {
          setActiveArbiter(guest);
          navigateToView('DASHBOARD');
        }}
      />
    );
  }

  const commonModals = (
    <>
      <AdminCommandCenterModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        workspace={workspace}
        activeArbiter={activeArbiter}
        onLoadTournamentIntoWorkspace={(newVault) => {
          setVault(newVault);
          const t = newVault.currentState;
          if (t.status === 'COMPLETED') navigateToStep('final_results');
          else if (t.status === 'IN_PROGRESS') navigateToStep('round_matches');
          else if (t.players.length > 0) navigateToStep('roster_entry');
          else navigateToStep('create_tournament');
          navigateToView('APP');
        }}
      />
      <SupabaseSyncModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        vault={vault}
        activeArbiter={activeArbiter}
        onLoadVaultFromCloud={(newVault) => {
          setVault(newVault);
          const t = newVault.currentState;
          if (t.status === 'COMPLETED') navigateToStep('final_results');
          else if (t.status === 'IN_PROGRESS') navigateToStep('round_matches');
          else if (t.players.length > 0) navigateToStep('roster_entry');
          else navigateToStep('create_tournament');
          navigateToView('APP');
        }}
      />
    </>
  );

  // 2. Arbiter Sign In & Registration View
  if (viewMode === 'AUTH') {
    return (
      <>
        <ArbiterAuthView
          onSuccess={(arbiter) => {
            setActiveArbiter(arbiter);
            navigateToView('DASHBOARD');
          }}
          onBackToLanding={() => navigateToView('LANDING')}
          onOpenAdminConsole={() => setIsAdminModalOpen(true)}
        />
        {commonModals}
      </>
    );
  }

  // 3. Chief Arbiter Home Dashboard View
  if (viewMode === 'DASHBOARD') {
    return (
      <>
        <HomeDashboardView
          activeArbiter={activeArbiter}
          tournament={tournament}
          hasUserOrganizedTournament={tournamentSummaries.length > 0}
          userTournamentsCount={tournamentSummaries.length}
          isAdmin={isAdmin}
          onEnterActiveTournament={() => navigateToView('APP')}
          onCreateNewTournament={handleCreateNewFromDashboard}
          onLaunchDemoTournament={handleLaunchDemoTournament}
          onImportDocument={handleImportDocumentFromDashboard}
          onOpenCloudSync={() => setIsSupabaseModalOpen(true)}
          onOpenAdminConsole={() => setIsAdminModalOpen(true)}
          onBackToIntro={() => navigateToView('LANDING')}
          onOpenOrganizerHub={() => navigateToView('ORGANIZER_HUB')}
          onSignOut={() => {
            logoutArbiter();
            setActiveArbiter(null);
            navigateToView('LANDING');
          }}
        />
        {commonModals}
      </>
    );
  }

  // 3.5 Organizer Command Hub View
  if (viewMode === 'ORGANIZER_HUB') {
    return (
      <>
        <OrganizerDashboardHub
          workspace={workspace}
          onUpdateWorkspace={setWorkspace}
          onOpenTournament={handleSwitchTournament}
          isDarkTheme={true}
          onBackToApp={() => navigateToView('APP')}
          activeArbiter={activeArbiter}
          isAdmin={isAdmin}
        />
        {commonModals}
      </>
    );
  }

  // 4. Main Arbiter Tournament Management Workspace
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* 5-Step Sequential Progress Stepper with Arbiter Profile & Sign Out */}
      <SequentialStepper
        currentStep={currentStep}
        onSelectStep={navigateToStep}
        tournament={tournament}
        auditCount={vault.auditLogs.length}
        onOpenActivityDrawer={() => setIsActivityDrawerOpen(true)}
        onOpenIntegrityModal={() => setIsIntegrityModalOpen(true)}
        onOpenPlayerSearch={() => setIsFindBoardModalOpen(true)}
        onOpenPrint={() => window.print()}
        onExportTRF={handleExportTRF}
        onGoHome={() => navigateToView('DASHBOARD')}
        onGoBack={handleGoBack}
        onOpenCloudSync={() => setIsSupabaseModalOpen(true)}
        onOpenAdminConsole={() => setIsAdminModalOpen(true)}
        activeArbiter={activeArbiter}
        onSignOut={() => {
          logoutArbiter();
          setActiveArbiter(null);
          navigateToView('LANDING');
        }}
        onOpenOrganizerHub={() => navigateToView('ORGANIZER_HUB')}
        allTournaments={tournamentSummaries}
        activeTournamentId={workspace.activeTournamentId}
        onSelectTournamentId={handleSwitchTournament}
      />

      {/* Main Sequential Content View */}
      <main style={{ flex: 1, paddingBottom: '3rem' }}>
        {/* STAGE 1: Setup & Create Tournament */}
        {currentStep === 'create_tournament' && (
          <Step1CreateTournament
            tournament={tournament}
            onUpdateRules={handleUpdateRules}
            onProceedToPlayers={() => navigateToStep('roster_entry')}
            onGoBack={handleGoBack}
          />
        )}

        {/* STAGE 2: Intake Player Details */}
        {currentStep === 'roster_entry' && (
          <Step2RosterEntry
            tournament={tournament}
            onAddCandidate={handleAddCandidate}
            onBulkAddCandidates={handleBulkAddCandidates}
            onRemovePlayer={handleRemovePlayer}
            onLockAndPairRound1={handleLockAndPairRound1}
            onGoBack={handleGoBack}
          />
        )}

        {/* STAGE 3: Live Round Matches with Timer & One-Tap Winner Tap */}
        {currentStep === 'round_matches' && (
          <Step3LiveMatches
            tournament={tournament}
            onTapResult={handleTapResult}
            onSimulateRemaining={handleSimulateRemaining}
            onExplainBoard={(board) => setXrayBoard(board)}
            onAdvanceRound={handleAdvanceRound}
            onGoBack={handleGoBack}
          />
        )}

        {/* STAGE 4: Standings & C.07 Tie-Breaks */}
        {currentStep === 'standings' && (
          <LiveStandingsView
            tournament={tournament}
            onOpenPrizes={() => setIsPrizeModalOpen(true)}
            onOpenCertificates={() => setIsCertificatesModalOpen(true)}
            onProceedToNextRound={() => navigateToStep('round_matches')}
            onGoBack={handleGoBack}
          />
        )}

        {/* STAGE 5: Final Completed Podium & Report */}
        {currentStep === 'final_results' && (
          <Step5CompletedPodium
            tournament={tournament}
            onExportTRF={handleExportTRF}
            onOpenPrint={() => window.print()}
            onOpenPrizes={() => setIsPrizeModalOpen(true)}
            onOpenCertificates={() => setIsCertificatesModalOpen(true)}
            onRestartNewTournament={handleRestartNewTournament}
            onGoBack={handleGoBack}
          />
        )}
      </main>

      {/* Activity Flight Recorder & Time Machine Undo Drawer */}
      <ActivityAndUndoDrawer
        isOpen={isActivityDrawerOpen}
        onClose={() => setIsActivityDrawerOpen(false)}
        vault={vault}
        onUndoLastAction={handleUndo}
        onReopenRound={handleReopenRound}
      />

      {/* 7-Point FIDE Invariant Shield Inspector */}
      <FideIntegrityModal
        isOpen={isIntegrityModalOpen}
        onClose={() => setIsIntegrityModalOpen(false)}
        integrity={integrity}
        tournament={tournament}
      />

      {/* Feature 1: Pairing X-Ray Explainer */}
      <PairingXRayModal
        isOpen={xrayBoard !== null}
        onClose={() => setXrayBoard(null)}
        board={xrayBoard}
        players={tournament.players}
        topSeedInitialColor={tournament.topSeedInitialColor}
      />

      {/* Feature 2: Multi-Category Prize & Trophy Allocator */}
      <PrizeCalculatorModal
        isOpen={isPrizeModalOpen}
        onClose={() => setIsPrizeModalOpen(false)}
        tournament={tournament}
      />

      {/* Feature 7: "Find My Board" Player Lookup */}
      <FindMyBoardModal
        isOpen={isFindBoardModalOpen}
        onClose={() => setIsFindBoardModalOpen(false)}
        tournament={tournament}
      />

      {/* Feature 8: Bulk Printable Certificates Suite */}
      <BulkCertificatesModal
        isOpen={isCertificatesModalOpen}
        onClose={() => setIsCertificatesModalOpen(false)}
        tournament={tournament}
      />

      {/* Feature 9: Cloud Database Sync & Website Superadmin All-Access Console */}
      {commonModals}
    </div>
  );
};

export default App;
