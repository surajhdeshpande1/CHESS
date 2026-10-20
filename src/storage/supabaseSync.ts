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
  arbiter_id?: string;
  arbiter_name?: string;
  organizer_id?: string;
  organizer_email?: string;
  is_published?: boolean;
  is_archived?: boolean;
  updated_at: string;
  created_at: string;
}

export interface CloudAuditLog {
  id: number;
  actor_id?: string;
  actor_name?: string;
  action: string;
  target_type?: string;
  target_id?: string;
  details?: Record<string, unknown>;
  created_at: string;
}

export interface CloudDatabaseDiagnostics {
  isConfigured: boolean;
  latencyMs?: number;
  tournamentsCount: number;
  arbitersCount: number;
  adminUsersCount: number;
  platformSettingsCount: number;
  auditLogsCount: number;
  lastCheckedISO: string;
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
    players_count: t.players?.length || 0,
    time_control_name: t.timeControlName || null,
    arbiter_id: arbiter?.id || null,
    arbiter_name: arbiter ? `${arbiter.title} ${arbiter.name}` : null,
    organizer_id: arbiter?.id || t.organizerId || null,
    organizer_email: arbiter?.email || t.organizerEmail || null,
    vault_data: vault,
    is_published: true,
    is_archived: false,
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

    // Record audit log asynchronously
    recordCloudAuditLog(
      'TOURNAMENT_SYNCED',
      'TOURNAMENT',
      t.id,
      { name: t.name, status: t.status, round: t.currentRound, players: t.players.length }
    ).catch(() => {});

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
 * List tournaments saved in Supabase (optionally filtered by organizer, or all for admin)
 */
export async function listCloudTournaments(
  filterOrganizerId?: string | null,
  filterOrganizerEmail?: string | null,
  isAdmin: boolean = false
): Promise<CloudTournamentSummary[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    let query = client
      .from('tournaments')
      .select('id, name, city, status, current_round, total_rounds, players_count, time_control_name, arbiter_id, arbiter_name, organizer_id, organizer_email, is_published, is_archived, updated_at, created_at')
      .order('updated_at', { ascending: false });

    // Filter by organizer unless superadmin view
    if (!isAdmin && (filterOrganizerId || filterOrganizerEmail)) {
      if (filterOrganizerId && filterOrganizerEmail) {
        query = query.or(`organizer_id.eq.${filterOrganizerId},organizer_email.eq.${filterOrganizerEmail},arbiter_id.eq.${filterOrganizerId}`);
      } else if (filterOrganizerId) {
        query = query.or(`organizer_id.eq.${filterOrganizerId},arbiter_id.eq.${filterOrganizerId}`);
      } else if (filterOrganizerEmail) {
        query = query.eq('organizer_email', filterOrganizerEmail);
      }
    }

    const { data, error } = await query;

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
 * Delete a tournament from Supabase (Admin Privilege)
 */
export async function deleteTournamentFromCloud(
  tournamentId: string
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase not configured' };

  try {
    const { error } = await client
      .from('tournaments')
      .delete()
      .eq('id', tournamentId);

    if (error) {
      return { success: false, error: error.message };
    }

    recordCloudAuditLog('TOURNAMENT_DELETED', 'TOURNAMENT', tournamentId, { deletedAt: new Date().toISOString() }).catch(() => {});
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to delete tournament' };
  }
}

/**
 * Toggle tournament archive status (Admin Privilege)
 */
export async function setTournamentArchivedInCloud(
  tournamentId: string,
  isArchived: boolean
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase not configured' };

  try {
    const { error } = await client
      .from('tournaments')
      .update({ is_archived: isArchived, updated_at: new Date().toISOString() })
      .eq('id', tournamentId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Archive toggle failed' };
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
        is_verified: true,
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
 * List all registered officials/arbiters from Supabase (Admin Privilege)
 */
export async function listAllArbitersFromCloud(): Promise<ArbiterProfile[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('arbiters')
      .select('*')
      .order('registered_at', { ascending: false });

    if (error || !data) return [];

    return data.map((d) => ({
      id: d.id,
      name: d.name,
      roleType: d.role_type || 'CERTIFIED_ARBITER',
      title: d.title || 'CHIEF_ARBITER',
      federation: d.federation || 'FID',
      organizationName: d.organization_name || undefined,
      email: d.email || '',
      fideId: d.fide_id || undefined,
      passwordHash: '',
      registeredAtISO: d.registered_at || new Date().toISOString(),
    }));
  } catch (err) {
    console.error('Failed to list cloud arbiters:', err);
    return [];
  }
}

/**
 * Delete an arbiter from Supabase (Admin Privilege)
 */
export async function deleteArbiterFromCloud(
  arbiterId: string
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase not configured' };

  try {
    const { error } = await client
      .from('arbiters')
      .delete()
      .eq('id', arbiterId);

    if (error) return { success: false, error: error.message };

    recordCloudAuditLog('ARBITER_REMOVED', 'ARBITER', arbiterId).catch(() => {});
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to delete arbiter' };
  }
}

/**
 * Fetch recent audit logs from Supabase
 */
export async function fetchCloudAuditLogs(limit: number = 50): Promise<CloudAuditLog[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data as CloudAuditLog[];
  } catch {
    return [];
  }
}

/**
 * Record an audit log entry in Supabase
 */
export async function recordCloudAuditLog(
  action: string,
  targetType: string,
  targetId: string,
  details?: Record<string, unknown>
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from('audit_logs').insert({
      actor_name: 'Administrator',
      action,
      target_type: targetType,
      target_id: targetId,
      details: details || {},
    });
  } catch {
    // Audit log failures should not block main operations
  }
}

/**
 * Bulk sync all tournaments in workspace to Supabase
 */
export async function bulkSyncTournamentsToCloud(
  vaults: TournamentVault[],
  arbiter?: ArbiterProfile | null
): Promise<{ successCount: number; failCount: number; errors: string[] }> {
  let successCount = 0;
  let failCount = 0;
  const errors: string[] = [];

  for (const v of vaults) {
    const res = await saveTournamentToCloud(v, arbiter);
    if (res.success) {
      successCount++;
    } else {
      failCount++;
      if (res.error) errors.push(`${v.currentState.name}: ${res.error}`);
    }
  }

  return { successCount, failCount, errors };
}

/**
 * Database health diagnostics (counts & latency)
 */
export async function getCloudDatabaseDiagnostics(): Promise<CloudDatabaseDiagnostics> {
  const isConfigured = isSupabaseConfigured();
  const baseResult: CloudDatabaseDiagnostics = {
    isConfigured,
    tournamentsCount: 0,
    arbitersCount: 0,
    adminUsersCount: 0,
    platformSettingsCount: 0,
    auditLogsCount: 0,
    lastCheckedISO: new Date().toISOString(),
  };

  const client = getSupabaseClient();
  if (!client || !isConfigured) return baseResult;

  const start = performance.now();
  try {
    const [tRes, aRes, admRes, sRes, logRes] = await Promise.all([
      client.from('tournaments').select('id', { count: 'exact', head: true }),
      client.from('arbiters').select('id', { count: 'exact', head: true }),
      client.from('admin_users').select('id', { count: 'exact', head: true }),
      client.from('platform_settings').select('key', { count: 'exact', head: true }),
      client.from('audit_logs').select('id', { count: 'exact', head: true }),
    ]);

    baseResult.latencyMs = Math.round(performance.now() - start);
    baseResult.tournamentsCount = tRes.count ?? 0;
    baseResult.arbitersCount = aRes.count ?? 0;
    baseResult.adminUsersCount = admRes.count ?? 0;
    baseResult.platformSettingsCount = sRes.count ?? 0;
    baseResult.auditLogsCount = logRes.count ?? 0;
  } catch (err) {
    console.error('Error fetching database diagnostics', err);
  }

  return baseResult;
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
