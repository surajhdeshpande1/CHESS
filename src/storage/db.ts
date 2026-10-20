import { createInitialTournament } from '../data/sampleTournament';
import { Tournament } from '../types/chess';
import { safeJsonParse } from '../lib/securitySanitizer';

const STORAGE_KEY = 'fide_swiss_manager_tournament_v1';

export function loadTournamentFromStorage(): Tournament {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = safeJsonParse<Tournament | null>(raw, null);
    if (parsed && parsed.players && parsed.settings) {
      return parsed;
    }
  } catch (err) {
    console.error('Failed to load tournament from localStorage', err);
  }
  return createInitialTournament(64);
}

export function saveTournamentToStorage(tournament: Tournament): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tournament));
  } catch (err) {
    console.error('Failed to save tournament to localStorage', err);
  }
}

export function exportTournamentJSON(tournament: Tournament): void {
  const json = JSON.stringify(tournament, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${tournament.settings.name.replace(/\s+/g, '_')}_Round_${tournament.currentRound}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
