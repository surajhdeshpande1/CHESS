import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Crown,
  KeyRound,
  Database,
  Cloud,
  RefreshCw,
  Trash2,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  X,
  Copy,
  Check,
  ExternalLink,
  Users,
  Trophy,
  ListFilter,
  Activity,
  Settings,
  Lock,
  Unlock,
  Eye,
} from 'lucide-react';
import {
  isAdminAuthenticated,
  loginAsAdmin,
  logoutAdmin,
  setAdminMasterPasskey,
  getAdminSession,
  getAdminLockoutStatus,
  AdminUser,
} from '../lib/adminAuth';
import {
  getSupabaseConfig,
  isSupabaseConfigured,
  saveSupabaseCredentials,
  clearSupabaseCredentials,
  testSupabaseConnection,
} from '../lib/supabaseClient';
import {
  listCloudTournaments,
  deleteTournamentFromCloud,
  loadTournamentFromCloud,
  bulkSyncTournamentsToCloud,
  listAllArbitersFromCloud,
  deleteArbiterFromCloud,
  fetchCloudAuditLogs,
  getCloudDatabaseDiagnostics,
  CloudTournamentSummary,
  CloudAuditLog,
  CloudDatabaseDiagnostics,
} from '../storage/supabaseSync';
import { TournamentVault } from '../lib/tournamentVaultAndFeatures';
import { ArbiterProfile, getRegisteredArbiters } from '../lib/arbiterAuth';
import { OrganizerWorkspace } from '../lib/organizerWorkspaceManager';

interface AdminCommandCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: OrganizerWorkspace;
  onLoadTournamentIntoWorkspace: (vault: TournamentVault) => void;
  activeArbiter?: ArbiterProfile | null;
}

export const AdminCommandCenterModal: React.FC<AdminCommandCenterModalProps> = ({
  isOpen,
  onClose,
  workspace,
  onLoadTournamentIntoWorkspace,
  activeArbiter,
}) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminSession, setAdminSession] = useState<AdminUser | null>(null);
  const [passkeyInput, setPasskeyInput] = useState('');
  const [passkeyError, setPasskeyError] = useState<string | null>(null);

  // Tabs: 'TOURNAMENTS' | 'ARBITERS' | 'DATABASE' | 'AUDIT_LOGS' | 'SETTINGS'
  const [activeTab, setActiveTab] = useState<'TOURNAMENTS' | 'ARBITERS' | 'DATABASE' | 'AUDIT_LOGS' | 'SETTINGS'>('TOURNAMENTS');

  // Supabase state
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [cloudTournaments, setCloudTournaments] = useState<CloudTournamentSummary[]>([]);
  const [isLoadingTournaments, setIsLoadingTournaments] = useState(false);
  const [cloudArbiters, setCloudArbiters] = useState<ArbiterProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<CloudAuditLog[]>([]);
  const [diagnostics, setDiagnostics] = useState<CloudDatabaseDiagnostics | null>(null);
  const [isDiagnosticsLoading, setIsDiagnosticsLoading] = useState(false);

  // Action status
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [newPasskey, setNewPasskey] = useState('');
  const [passkeyChangeMsg, setPasskeyChangeMsg] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      const authed = isAdminAuthenticated();
      setIsAdmin(authed);
      setAdminSession(getAdminSession());

      const lockout = getAdminLockoutStatus();
      if (lockout.isLockedOut) {
        setPasskeyError(`Security Lockout Active: please wait ${lockout.remainingSeconds}s.`);
      } else {
        setPasskeyError(null);
      }

      setActionStatus(null);
      setDeleteConfirmId(null);

      const cfg = getSupabaseConfig();
      setSupabaseUrl(cfg.url);
      setSupabaseAnonKey(cfg.anonKey);

      if (authed) {
        loadAllAdminData();
      }
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const loadAllAdminData = async () => {
    setIsLoadingTournaments(true);
    setIsDiagnosticsLoading(true);
    try {
      const [tList, aList, diag, logs] = await Promise.all([
        listCloudTournaments(),
        listAllArbitersFromCloud(),
        getCloudDatabaseDiagnostics(),
        fetchCloudAuditLogs(30),
      ]);
      setCloudTournaments(tList);
      setCloudArbiters(aList);
      setDiagnostics(diag);
      setAuditLogs(logs);
    } catch (e) {
      console.error('Failed to load admin data', e);
    } finally {
      setIsLoadingTournaments(false);
      setIsDiagnosticsLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const res = loginAsAdmin(passkeyInput);
    if (res.success && res.session) {
      setIsAdmin(true);
      setAdminSession(res.session);
      setPasskeyInput('');
      setPasskeyError(null);
      loadAllAdminData();
    } else {
      setPasskeyError(res.error || 'Invalid Admin Passkey');
    }
  };

  const handleLogout = () => {
    logoutAdmin();
    setIsAdmin(false);
    setAdminSession(null);
  };

  const handleTestDatabase = async () => {
    saveSupabaseCredentials(supabaseUrl, supabaseAnonKey);
    setActionStatus('Benchmarking Supabase connection...');
    const res = await testSupabaseConnection();
    if (res.success) {
      setActionStatus(`✓ ${res.message}`);
      loadAllAdminData();
    } else {
      setActionStatus(`Connection error: ${res.message}`);
    }
  };

  const handleSaveCredentials = () => {
    saveSupabaseCredentials(supabaseUrl, supabaseAnonKey);
    handleTestDatabase();
  };

  const handleBulkPushLocal = async () => {
    const vaults = Object.values(workspace.tournamentsById).map((t) => t.vault);
    setActionStatus(`Pushing ${vaults.length} local tournaments to Supabase...`);
    const res = await bulkSyncTournamentsToCloud(vaults, activeArbiter);
    if (res.failCount === 0) {
      setActionStatus(`✓ All ${res.successCount} tournaments successfully synced to Supabase!`);
    } else {
      setActionStatus(`Synced ${res.successCount} tournaments, ${res.failCount} failed: ${res.errors.join(', ')}`);
    }
    loadAllAdminData();
  };

  const handleLoadTournament = async (tId: string) => {
    setActionStatus(`Loading tournament vault ${tId} from Supabase...`);
    const res = await loadTournamentFromCloud(tId);
    if (res.success && res.vault) {
      onLoadTournamentIntoWorkspace(res.vault);
      setActionStatus(`✓ Loaded "${res.vault.currentState.name}" into active workspace!`);
      setTimeout(() => {
        onClose();
      }, 700);
    } else {
      setActionStatus(`Failed to load tournament: ${res.error}`);
    }
  };

  const handleDeleteTournament = async (tId: string) => {
    setActionStatus(`Deleting tournament ${tId} from Supabase...`);
    const res = await deleteTournamentFromCloud(tId, null, true);
    if (res.success) {
      setActionStatus(`✓ Tournament ${tId} permanently deleted from cloud.`);
      setDeleteConfirmId(null);
      loadAllAdminData();
    } else {
      setActionStatus(`Delete failed: ${res.error}`);
    }
  };

  const handleDeleteArbiter = async (arbId: string) => {
    if (!confirm('Are you sure you want to delete this arbiter profile from Supabase?')) return;
    setActionStatus(`Removing arbiter ${arbId}...`);
    const res = await deleteArbiterFromCloud(arbId);
    if (res.success) {
      setActionStatus('✓ Arbiter removed from Supabase.');
      loadAllAdminData();
    } else {
      setActionStatus(`Error removing arbiter: ${res.error}`);
    }
  };

  const handleDownloadVaultJson = async (tId: string, tName: string) => {
    const res = await loadTournamentFromCloud(tId);
    if (res.success && res.vault) {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res.vault, null, 2));
      const a = document.createElement('a');
      a.setAttribute('href', dataStr);
      a.setAttribute('download', `${tName.replace(/\s+/g, '_')}_vault_backup.json`);
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else {
      alert(`Could not download vault: ${res.error}`);
    }
  };

  const handleUpdatePasskey = (e: React.FormEvent) => {
    e.preventDefault();
    const res = setAdminMasterPasskey(newPasskey);
    if (res.success) {
      setPasskeyChangeMsg('✓ Master passkey updated successfully!');
      setNewPasskey('');
    } else {
      setPasskeyChangeMsg(res.error || 'Failed to update passkey');
    }
  };

  const handleCopySchemaSql = () => {
    const sqlSchema = `-- CHATURANGA: OFFICIAL FIDE TOURNAMENT SUITE - SUPABASE DATABASE SCHEMA (v3.0.0)
-- Copy and run in Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)

CREATE TABLE IF NOT EXISTS public.tournaments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT,
  tournament_year INTEGER DEFAULT (EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER),
  status TEXT NOT NULL DEFAULT 'REGISTRATION',
  current_round INTEGER DEFAULT 1,
  total_rounds INTEGER DEFAULT 5,
  players_count INTEGER DEFAULT 0,
  time_control_name TEXT,
  arbiter_id TEXT,
  arbiter_name TEXT,
  vault_data JSONB NOT NULL,
  is_published BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tournaments_arbiter ON public.tournaments(arbiter_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON public.tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_updated ON public.tournaments(updated_at DESC);
ALTER TABLE public.tournaments REPLICA IDENTITY FULL;

CREATE TABLE IF NOT EXISTS public.arbiters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  title TEXT NOT NULL DEFAULT 'CHIEF_ARBITER',
  role_type TEXT NOT NULL DEFAULT 'CERTIFIED_ARBITER',
  federation TEXT DEFAULT 'FID',
  fide_id TEXT,
  organization_name TEXT,
  password_hash TEXT,
  is_verified BOOLEAN DEFAULT true,
  is_admin BOOLEAN DEFAULT false,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'SUPER_ADMIN',
  passkey_hash TEXT,
  permissions JSONB NOT NULL DEFAULT '{"all_access": true}'::jsonb,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by TEXT DEFAULT 'SUPER_ADMIN',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_name TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arbiters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for tournaments" ON public.tournaments;
CREATE POLICY "Public read access for tournaments" ON public.tournaments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin full access for tournaments" ON public.tournaments;
CREATE POLICY "Admin full access for tournaments" ON public.tournaments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read access for arbiters" ON public.arbiters;
CREATE POLICY "Public read access for arbiters" ON public.arbiters FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin full access for arbiters" ON public.arbiters;
CREATE POLICY "Admin full access for arbiters" ON public.arbiters FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin users full access" ON public.admin_users;
CREATE POLICY "Admin users full access" ON public.admin_users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read access for settings" ON public.platform_settings;
CREATE POLICY "Public read access for settings" ON public.platform_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin full access for settings" ON public.platform_settings;
CREATE POLICY "Admin full access for settings" ON public.platform_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin full access for audit logs" ON public.audit_logs;
CREATE POLICY "Admin full access for audit logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'tournaments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;
  END IF;
END $$;
`;
    navigator.clipboard.writeText(sqlSchema);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2500);
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 12, 26, 0.82)',
        backdropFilter: 'blur(8px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '1050px',
          maxHeight: '92vh',
          background: '#0a192f',
          color: '#ffffff',
          border: '1px solid #1e3a8a',
          borderRadius: '12px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.65)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Modal Top Bar */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
            borderBottom: '1px solid #312e81',
            padding: '1rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 15px rgba(245, 158, 11, 0.35)',
              }}
            >
              <Crown size={22} color="#000000" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, letterSpacing: '0.5px' }}>
                  Chaturanga Superadmin Console
                </h2>
                {isAdmin ? (
                  <span
                    style={{
                      background: 'rgba(16, 185, 129, 0.2)',
                      border: '1px solid #10b981',
                      color: '#a7f3d0',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Unlock size={11} /> ALL ACCESS ACTIVE
                  </span>
                ) : (
                  <span
                    style={{
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid #ef4444',
                      color: '#fca5a5',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Lock size={11} /> LOCKED
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                Master administrative hub for Supabase cloud sync, cross-tournament vaults, arbiters & database engine
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {isAdmin && (
              <button
                type="button"
                onClick={handleLogout}
                className="btn btn-secondary"
                style={{
                  fontSize: '0.76rem',
                  padding: '0.35rem 0.75rem',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #ef4444',
                  color: '#fca5a5',
                  borderRadius: '6px',
                }}
              >
                Sign Out Admin
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#ffffff',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Action Status Banner */}
        {actionStatus && (
          <div
            style={{
              padding: '0.55rem 1.5rem',
              background: actionStatus.startsWith('✓') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(30, 58, 138, 0.3)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '0.8rem',
              color: actionStatus.startsWith('✓') ? '#a7f3d0' : '#93c5fd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{actionStatus}</span>
            <button
              onClick={() => setActionStatus(null)}
              style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: '0.75rem' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Body Content */}
        {!isAdmin ? (
          /* =========================================================================
             PASSKEY UNLOCK SCREEN
             ========================================================================= */
          <div
            style={{
              flex: 1,
              padding: '3rem 2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '2px solid #f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
              }}
            >
              <KeyRound size={28} color="#f59e0b" />
            </div>

            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>
              Website Administrator Master Access
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', maxWidth: '440px', margin: '0 0 1.5rem 0' }}>
              As website administrator, unlocking Master Access gives you unrestricted control to inspect, push, pull, delete, and manage all tournaments, arbiters, and cloud tables in Supabase.
            </p>

            <form
              onSubmit={handleLogin}
              style={{
                width: '100%',
                maxWidth: '360px',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
              }}
            >
              <div>
                <input
                  type="password"
                  placeholder="Enter Master Admin Passkey..."
                  value={passkeyInput}
                  onChange={(e) => setPasskeyInput(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #334155',
                    background: '#0f172a',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    textAlign: 'center',
                    letterSpacing: '1px',
                  }}
                />
                {passkeyError && (
                  <div style={{ color: '#f87171', fontSize: '0.78rem', marginTop: '6px' }}>
                    {passkeyError}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary-gold"
                style={{
                  padding: '0.75rem 1rem',
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#000000',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Unlock size={16} />
                <span>Unlock All-Access Mode</span>
              </button>

              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
                Default passkey: <code style={{ color: '#f59e0b', fontFamily: 'monospace' }}>admin</code> or <code style={{ color: '#f59e0b', fontFamily: 'monospace' }}>chaturanga2026</code>
              </div>
            </form>
          </div>
        ) : (
          /* =========================================================================
             AUTHENTICATED SUPERADMIN MASTER PORTAL
             ========================================================================= */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Navigation Tabs */}
            <div
              className="mobile-touch-scroll"
              style={{
                background: '#0d1d36',
                borderBottom: '1px solid #1e3a8a',
                padding: '0.5rem 1rem',
                display: 'flex',
                gap: '0.5rem',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('TOURNAMENTS')}
                style={{
                  padding: '0.45rem 0.95rem',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: activeTab === 'TOURNAMENTS' ? 800 : 600,
                  background: activeTab === 'TOURNAMENTS' ? '#1e3a8a' : 'transparent',
                  color: activeTab === 'TOURNAMENTS' ? '#ffffff' : '#94a3b8',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Trophy size={14} color="#f59e0b" />
                <span>All Tournaments ({cloudTournaments.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ARBITERS')}
                style={{
                  padding: '0.45rem 0.95rem',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: activeTab === 'ARBITERS' ? 800 : 600,
                  background: activeTab === 'ARBITERS' ? '#1e3a8a' : 'transparent',
                  color: activeTab === 'ARBITERS' ? '#ffffff' : '#94a3b8',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Users size={14} color="#38bdf8" />
                <span>Arbiters Directory ({cloudArbiters.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('DATABASE')}
                style={{
                  padding: '0.45rem 0.95rem',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: activeTab === 'DATABASE' ? 800 : 600,
                  background: activeTab === 'DATABASE' ? '#1e3a8a' : 'transparent',
                  color: activeTab === 'DATABASE' ? '#ffffff' : '#94a3b8',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Database size={14} color="#10b981" />
                <span>Supabase Cloud Engine</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('AUDIT_LOGS')}
                style={{
                  padding: '0.45rem 0.95rem',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: activeTab === 'AUDIT_LOGS' ? 800 : 600,
                  background: activeTab === 'AUDIT_LOGS' ? '#1e3a8a' : 'transparent',
                  color: activeTab === 'AUDIT_LOGS' ? '#ffffff' : '#94a3b8',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Activity size={14} color="#a855f7" />
                <span>Audit Logs ({auditLogs.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('SETTINGS')}
                style={{
                  padding: '0.45rem 0.95rem',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: activeTab === 'SETTINGS' ? 800 : 600,
                  background: activeTab === 'SETTINGS' ? '#1e3a8a' : 'transparent',
                  color: activeTab === 'SETTINGS' ? '#ffffff' : '#94a3b8',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Settings size={14} color="#cbd5e1" />
                <span>Admin Passkey & Settings</span>
              </button>
            </div>

            {/* Scrollable Tab Panel */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
              {/* =====================================================================
                  TAB 1: ALL TOURNAMENTS (ALL ACCESS)
                  ===================================================================== */}
              {activeTab === 'TOURNAMENTS' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                        All Tournaments in Supabase Vault
                      </h3>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: '#94a3b8' }}>
                        Full administrative access to view, override, clone, back up, and delete any tournament across all arbiters.
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={handleBulkPushLocal}
                        className="btn btn-secondary-white"
                        style={{
                          fontSize: '0.76rem',
                          padding: '0.4rem 0.85rem',
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid #10b981',
                          color: '#a7f3d0',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <UploadCloud size={14} />
                        <span>Push All Workspace Tournaments to Cloud</span>
                      </button>

                      <button
                        type="button"
                        onClick={loadAllAdminData}
                        style={{
                          fontSize: '0.76rem',
                          padding: '0.4rem 0.75rem',
                          background: '#1e293b',
                          border: '1px solid #334155',
                          color: '#ffffff',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <RefreshCw size={13} className={isLoadingTournaments ? 'animate-spin' : ''} />
                        <span>Refresh List</span>
                      </button>
                    </div>
                  </div>

                  {isLoadingTournaments ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                      <RefreshCw size={24} className="animate-spin" style={{ marginBottom: '8px' }} />
                      <div>Querying Supabase tournaments database...</div>
                    </div>
                  ) : cloudTournaments.length === 0 ? (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '3rem 1.5rem',
                        background: '#0f172a',
                        borderRadius: '8px',
                        border: '1px dashed #334155',
                      }}
                    >
                      <Trophy size={36} color="#475569" style={{ marginBottom: '0.5rem' }} />
                      <div style={{ fontWeight: 700, color: '#ffffff' }}>No Tournaments in Supabase Cloud Yet</div>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '4px 0 1rem 0' }}>
                        Push tournaments from your local workspace to make them available across all devices and spectators.
                      </p>
                      <button
                        type="button"
                        onClick={handleBulkPushLocal}
                        className="btn btn-primary-gold"
                        style={{
                          fontSize: '0.82rem',
                          padding: '0.5rem 1rem',
                          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                          color: '#000000',
                          fontWeight: 800,
                          borderRadius: '6px',
                          border: 'none',
                        }}
                      >
                        Push Active Tournaments Now
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {cloudTournaments.map((t) => (
                        <div
                          key={t.id}
                          style={{
                            background: '#0f172a',
                            border: '1px solid #1e293b',
                            borderRadius: '8px',
                            padding: '0.85rem 1.15rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '0.75rem',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#ffffff' }}>
                                {t.name}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background:
                                    t.status === 'COMPLETED'
                                      ? 'rgba(16, 185, 129, 0.2)'
                                      : t.status === 'IN_PROGRESS'
                                      ? 'rgba(56, 189, 248, 0.2)'
                                      : 'rgba(245, 158, 11, 0.2)',
                                  color:
                                    t.status === 'COMPLETED'
                                      ? '#a7f3d0'
                                      : t.status === 'IN_PROGRESS'
                                      ? '#7dd3fc'
                                      : '#fde68a',
                                  border:
                                    t.status === 'COMPLETED'
                                      ? '1px solid #10b981'
                                      : t.status === 'IN_PROGRESS'
                                      ? '1px solid #38bdf8'
                                      : '1px solid #f59e0b',
                                }}
                              >
                                {t.status}
                              </span>
                              <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                                Round {t.current_round} of {t.total_rounds} • {t.players_count} Players
                              </span>
                            </div>

                            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                              <span>ID: <code style={{ fontFamily: 'monospace', color: '#94a3b8' }}>{t.id}</code></span>
                              {t.city && <span>• City: {t.city}</span>}
                              {t.arbiter_name && <span>• Arbiter: <strong style={{ color: '#cbd5e1' }}>{t.arbiter_name}</strong></span>}
                              <span>• Updated: {new Date(t.updated_at).toLocaleString()}</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => handleLoadTournament(t.id)}
                              style={{
                                fontSize: '0.76rem',
                                padding: '0.35rem 0.75rem',
                                background: '#1e3a8a',
                                border: '1px solid #3b82f6',
                                color: '#ffffff',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                fontWeight: 700,
                              }}
                              title="Load and take over tournament in live app"
                            >
                              ⚡ Take Over in Live App
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownloadVaultJson(t.id, t.name)}
                              style={{
                                fontSize: '0.76rem',
                                padding: '0.35rem 0.65rem',
                                background: '#1e293b',
                                border: '1px solid #334155',
                                color: '#cbd5e1',
                                borderRadius: '5px',
                                cursor: 'pointer',
                              }}
                              title="Download complete JSON vault backup"
                            >
                              <Download size={13} />
                            </button>

                            {deleteConfirmId === t.id ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTournament(t.id)}
                                  style={{
                                    fontSize: '0.72rem',
                                    padding: '0.35rem 0.6rem',
                                    background: '#ef4444',
                                    border: 'none',
                                    color: '#ffffff',
                                    borderRadius: '4px',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Confirm Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(null)}
                                  style={{
                                    fontSize: '0.72rem',
                                    padding: '0.35rem 0.5rem',
                                    background: '#334155',
                                    border: 'none',
                                    color: '#ffffff',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(t.id)}
                                style={{
                                  fontSize: '0.76rem',
                                  padding: '0.35rem 0.65rem',
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  border: '1px solid #ef4444',
                                  color: '#f87171',
                                  borderRadius: '5px',
                                  cursor: 'pointer',
                                }}
                                title="Delete tournament from Supabase"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* =====================================================================
                  TAB 2: ARBITERS & OFFICIALS DIRECTORY
                  ===================================================================== */}
              {activeTab === 'ARBITERS' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                        Arbiters & Tournament Officials
                      </h3>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: '#94a3b8' }}>
                        All arbiters registered in the platform with verified credentials and badges.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={loadAllAdminData}
                      style={{
                        fontSize: '0.76rem',
                        padding: '0.4rem 0.75rem',
                        background: '#1e293b',
                        border: '1px solid #334155',
                        color: '#ffffff',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <RefreshCw size={13} />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {cloudArbiters.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', background: '#0f172a', borderRadius: '8px' }}>
                      <Users size={32} color="#475569" style={{ marginBottom: '8px' }} />
                      <div>No arbiters registered in Supabase yet.</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {cloudArbiters.map((arb) => (
                        <div
                          key={arb.id}
                          style={{
                            background: '#0f172a',
                            border: '1px solid #1e293b',
                            borderRadius: '8px',
                            padding: '0.85rem 1.15rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '0.75rem',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                style={{
                                  background: arb.roleType === 'CERTIFIED_ARBITER' ? '#1e3a8a' : '#065f46',
                                  color: '#ffffff',
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                }}
                              >
                                {arb.title}
                              </span>
                              <span style={{ fontWeight: 800, color: '#ffffff', fontSize: '0.95rem' }}>
                                {arb.name}
                              </span>
                              <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                                ({arb.federation || 'FID'})
                              </span>
                            </div>

                            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                              <span>Email: <strong style={{ color: '#cbd5e1' }}>{arb.email}</strong></span>
                              {arb.fideId && <span>• FIDE ID: <strong style={{ color: '#cbd5e1' }}>{arb.fideId}</strong></span>}
                              {arb.organizationName && <span>• Club: {arb.organizationName}</span>}
                              <span>• Registered: {new Date(arb.registeredAtISO).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <div>
                            <button
                              type="button"
                              onClick={() => handleDeleteArbiter(arb.id)}
                              style={{
                                fontSize: '0.74rem',
                                padding: '0.35rem 0.65rem',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid #ef4444',
                                color: '#f87171',
                                borderRadius: '5px',
                                cursor: 'pointer',
                              }}
                              title="Delete arbiter account from Supabase"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* =====================================================================
                  TAB 3: SUPABASE CLOUD ENGINE & DATABASE INSPECTOR
                  ===================================================================== */}
              {activeTab === 'DATABASE' && (
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#ffffff' }}>
                    Supabase Cloud Configuration & Diagnostics
                  </h3>
                  <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.76rem', color: '#94a3b8' }}>
                    Manage connection credentials and inspect real-time row counts across your Supabase PostgreSQL cluster.
                  </p>

                  {/* Diagnostic Badges Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                      gap: '0.85rem',
                      marginBottom: '1.5rem',
                    }}
                  >
                    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '0.85rem' }}>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                        Tournaments Vault
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f59e0b', marginTop: '4px' }}>
                        {diagnostics?.tournamentsCount ?? '—'}
                      </div>
                    </div>

                    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '0.85rem' }}>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                        Registered Arbiters
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#38bdf8', marginTop: '4px' }}>
                        {diagnostics?.arbitersCount ?? '—'}
                      </div>
                    </div>

                    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '0.85rem' }}>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                        Superadmin Accounts
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981', marginTop: '4px' }}>
                        {diagnostics?.adminUsersCount ?? '—'}
                      </div>
                    </div>

                    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '0.85rem' }}>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                        Audit Log Records
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#a855f7', marginTop: '4px' }}>
                        {diagnostics?.auditLogsCount ?? '—'}
                      </div>
                    </div>

                    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '0.85rem' }}>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                        Cloud Ping Latency
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#34d399', marginTop: '4px' }}>
                        {diagnostics?.latencyMs ? `${diagnostics.latencyMs}ms` : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Supabase Credentials Editor */}
                  <div
                    style={{
                      background: '#0f172a',
                      border: '1px solid #1e293b',
                      borderRadius: '8px',
                      padding: '1.25rem',
                      marginBottom: '1.5rem',
                    }}
                  >
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 1rem 0', color: '#ffffff' }}>
                      Supabase Instance Credentials
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      <div>
                        <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                          Project URL
                        </label>
                        <input
                          type="text"
                          placeholder="https://your-project.supabase.co"
                          value={supabaseUrl}
                          onChange={(e) => setSupabaseUrl(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '6px',
                            border: '1px solid #334155',
                            background: '#0a1424',
                            color: '#ffffff',
                            fontSize: '0.85rem',
                            fontFamily: 'monospace',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                          Public Anon Key or Service Role Key
                        </label>
                        <input
                          type="password"
                          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                          value={supabaseAnonKey}
                          onChange={(e) => setSupabaseAnonKey(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '6px',
                            border: '1px solid #334155',
                            background: '#0a1424',
                            color: '#ffffff',
                            fontSize: '0.85rem',
                            fontFamily: 'monospace',
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '0.65rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={handleSaveCredentials}
                          style={{
                            padding: '0.55rem 1.15rem',
                            background: '#1e3a8a',
                            border: '1px solid #3b82f6',
                            color: '#ffffff',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                          }}
                        >
                          Save & Test Connection
                        </button>

                        <button
                          type="button"
                          onClick={handleCopySchemaSql}
                          style={{
                            padding: '0.55rem 1.15rem',
                            background: '#1e293b',
                            border: '1px solid #334155',
                            color: copiedSchema ? '#a7f3d0' : '#ffffff',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          {copiedSchema ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                          <span>{copiedSchema ? 'SQL Copied to Clipboard!' : 'Copy Complete Supabase SQL Schema'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* =====================================================================
                  TAB 4: AUDIT LOGS
                  ===================================================================== */}
              {activeTab === 'AUDIT_LOGS' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                        Administrative & Security Audit Logs
                      </h3>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: '#94a3b8' }}>
                        Immutable audit trail of tournament syncs, pairing generation, and administrative actions.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={loadAllAdminData}
                      style={{
                        fontSize: '0.76rem',
                        padding: '0.4rem 0.75rem',
                        background: '#1e293b',
                        border: '1px solid #334155',
                        color: '#ffffff',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      <RefreshCw size={13} />
                    </button>
                  </div>

                  {auditLogs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', background: '#0f172a', borderRadius: '8px' }}>
                      <Activity size={32} color="#475569" style={{ marginBottom: '8px' }} />
                      <div>No audit records logged in Supabase yet.</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {auditLogs.map((log) => (
                        <div
                          key={log.id}
                          style={{
                            background: '#0f172a',
                            border: '1px solid #1e293b',
                            borderRadius: '6px',
                            padding: '0.65rem 1rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.8rem',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                style={{
                                  background: 'rgba(56, 189, 248, 0.15)',
                                  color: '#38bdf8',
                                  fontSize: '0.65rem',
                                  fontWeight: 800,
                                  padding: '1px 6px',
                                  borderRadius: '3px',
                                  fontFamily: 'monospace',
                                }}
                              >
                                {log.action}
                              </span>
                              <span style={{ fontWeight: 700, color: '#ffffff' }}>
                                {log.actor_name || 'System'}
                              </span>
                              {log.target_type && (
                                <span style={{ color: '#94a3b8', fontSize: '0.74rem' }}>
                                  ({log.target_type}: {log.target_id})
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{ color: '#64748b', fontSize: '0.72rem' }}>
                            {new Date(log.created_at).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* =====================================================================
                  TAB 5: ADMIN PASSKEY & PLATFORM SETTINGS
                  ===================================================================== */}
              {activeTab === 'SETTINGS' && (
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#ffffff' }}>
                    Superadmin Credentials & Passkey Settings
                  </h3>
                  <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.76rem', color: '#94a3b8' }}>
                    Update your master administrative passkey for all-access website control.
                  </p>

                  <div
                    style={{
                      background: '#0f172a',
                      border: '1px solid #1e293b',
                      borderRadius: '8px',
                      padding: '1.25rem',
                      maxWidth: '500px',
                      marginBottom: '1.5rem',
                    }}
                  >
                    <form onSubmit={handleUpdatePasskey} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      <div>
                        <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                          Set New Master Admin Passkey
                        </label>
                        <input
                          type="password"
                          placeholder="Enter new master passkey..."
                          value={newPasskey}
                          onChange={(e) => setNewPasskey(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '6px',
                            border: '1px solid #334155',
                            background: '#0a1424',
                            color: '#ffffff',
                            fontSize: '0.85rem',
                          }}
                        />
                      </div>

                      {passkeyChangeMsg && (
                        <div
                          style={{
                            fontSize: '0.78rem',
                            color: passkeyChangeMsg.startsWith('✓') ? '#a7f3d0' : '#f87171',
                          }}
                        >
                          {passkeyChangeMsg}
                        </div>
                      )}

                      <button
                        type="submit"
                        className="btn btn-primary-gold"
                        style={{
                          padding: '0.55rem 1rem',
                          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                          color: '#000000',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                        }}
                      >
                        Update Master Passkey
                      </button>
                    </form>
                  </div>

                  <div
                    style={{
                      background: '#0f172a',
                      border: '1px solid #1e293b',
                      borderRadius: '8px',
                      padding: '1.25rem',
                      maxWidth: '500px',
                    }}
                  >
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#ffffff' }}>
                      Active Superadmin Session
                    </h4>
                    <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                      <div>User: <strong>{adminSession?.username}</strong></div>
                      <div>Role: <strong style={{ color: '#f59e0b' }}>{adminSession?.role} (ALL ACCESS)</strong></div>
                      <div>Email: <strong>{adminSession?.email}</strong></div>
                      <div>Logged In: <strong>{new Date(adminSession?.loggedInAtISO || Date.now()).toLocaleString()}</strong></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Bar */}
            <div
              style={{
                background: '#081426',
                borderTop: '1px solid #1e3a8a',
                padding: '0.75rem 1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.75rem',
                color: '#64748b',
              }}
            >
              <span>Chaturanga v3.0.0 Superadmin Engine • FIDE Dutch C.04.3 Regulatory Compliant</span>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  color: '#ffffff',
                  padding: '0.4rem 1rem',
                  borderRadius: '5px',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                }}
              >
                Close Console
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
