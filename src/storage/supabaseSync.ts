import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabaseClient';
import { TournamentVault } from '../lib/tournamentVaultAndFeatures';
import { ArbiterProfile } from '../lib/arbiterAuth';

export interface CloudTournamentSummary {
  id: string;
  name: string;
  city?: string;
  status: string;
  current_round: number;
  total_rounds: number;
  players_count: number;
  time_control_name?: string;
  arbiter_name?: string;
  updated_at: string;
  created_at: string;
}

/**
 * Save / Upsert complete tournament vault to Supabase
 */
export async function saveTournamentToCloud(
  vault: TournamentVault,
  arbiter?: ArbiterProfile | null
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase is not configured' };
  }

  const t = vault.currentState;
  const payload = {
    id: t.id,
    name: t.name || 'Untitled Tournament',
    city: t.city || null,
    tournament_year: t.tournamentYear || new Date().getFullYear(),
    status: t.status,
    current_round: t.currentRound || 1,
    total_rounds: t.totalRounds || 5,
    players_count: t.players.length,
    time_control_name: t.timeControlName || null,
    arbiter_id: arbiter?.id || null,
    arbiter_name: arbiter ? `${arbiter.title} ${arbiter.name}` : null,
    vault_data: vault,
    updated_at: new Date().toISOString(),
  };

  try {
    const { error } = await client
      .from('tournaments')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error('Supabase upsert error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown sync failure';
    console.error('Failed to sync to Supabase:', msg);
    return { success: false, error: msg };
  }
}

/**
 * Fetch a specific tournament vault by ID from Supabase
 */
export async function loadTournamentFromCloud(
  tournamentId: string
): Promise<{ success: boolean; vault?: TournamentVault; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase is not configured' };
  }

  try {
    const { data, error } = await client
      .from('tournaments')
      .select('vault_data')
      .eq('id', tournamentId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data || !data.vault_data) {
      return { success: false, error: 'Tournament vault payload not found' };
    }

    return { success: true, vault: data.vault_data as TournamentVault };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to load tournament' };
  }
}

/**
 * List all tournaments saved in Supabase
 */
export async function listCloudTournaments(): Promise<CloudTournamentSummary[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('tournaments')
      .select('id, name, city, status, current_round, total_rounds, players_count, time_control_name, arbiter_name, updated_at, created_at')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Failed to list cloud tournaments:', error);
      return [];
    }

    return (data as CloudTournamentSummary[]) || [];
  } catch (err) {
    console.error('Error fetching cloud tournaments:', err);
    return [];
  }
}

/**
 * Sync Arbiter Profile to Supabase
 */
export async function syncArbiterToCloud(
  arbiter: ArbiterProfile
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase not configured' };

  try {
    const { error } = await client
      .from('arbiters')
      .upsert({
        id: arbiter.id,
        name: arbiter.name,
        email: arbiter.email,
        title: arbiter.title,
        role_type: arbiter.roleType,
        federation: arbiter.federation,
        fide_id: arbiter.fideId || null,
        organization_name: arbiter.organizationName || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Arbiter sync failed' };
  }
}

/**
 * Real-time Subscription to Live Tournament Pairings & Standings
 * Returns an unsubscribe callback function
 */
export function subscribeToLiveTournament(
  tournamentId: string,
  onUpdate: (vault: TournamentVault) => void
): () => void {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) {
    return () => {};
  }

  const channel = client
    .channel(`tournament-live-${tournamentId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'tournaments',
        filter: `id=eq.${tournamentId}`,
      },
      (payload) => {
        if (payload.new && (payload.new as { vault_data?: TournamentVault }).vault_data) {
          onUpdate((payload.new as { vault_data: TournamentVault }).vault_data);
        }
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
