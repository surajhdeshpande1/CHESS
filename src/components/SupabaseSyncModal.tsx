import React, { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Database,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  Copy,
  Check,
  KeyRound,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import {
  getSupabaseConfig,
  isSupabaseConfigured,
  saveSupabaseCredentials,
  clearSupabaseCredentials,
  testSupabaseConnection,
} from '../lib/supabaseClient';
import {
  saveTournamentToCloud,
  listCloudTournaments,
  loadTournamentFromCloud,
  CloudTournamentSummary,
} from '../storage/supabaseSync';
import { TournamentVault } from '../lib/tournamentVaultAndFeatures';
import { ArbiterProfile } from '../lib/arbiterAuth';

interface SupabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  vault: TournamentVault;
  activeArbiter: ArbiterProfile | null;
  onLoadVaultFromCloud: (vault: TournamentVault) => void;
}

export const SupabaseSyncModal: React.FC<SupabaseSyncModalProps> = ({
  isOpen,
  onClose,
  vault,
  activeArbiter,
  onLoadVaultFromCloud,
}) => {
  const [activeTab, setActiveTab] = useState<'SETTINGS' | 'CLOUD_LIST' | 'SQL_SCHEMA'>('SETTINGS');
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const [cloudTournaments, setCloudTournaments] = useState<CloudTournamentSummary[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const cfg = getSupabaseConfig();
      setUrl(cfg.url);
      setAnonKey(cfg.anonKey);
      setTestResult(null);
      setSyncStatus(null);
      if (isSupabaseConfigured()) {
        loadList();
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    // If user edited inputs, save first
    saveSupabaseCredentials(url, anonKey);
    setIsTesting(true);
    setTestResult(null);
    const res = await testSupabaseConnection();
    setIsTesting(false);
    setTestResult(res);
    if (res.success) {
      loadList();
    }
  };

  const handleSaveSettings = () => {
    saveSupabaseCredentials(url, anonKey);
    handleTestConnection();
  };

  const handleClear = () => {
    clearSupabaseCredentials();
    setUrl('');
    setAnonKey('');
    setTestResult(null);
    setCloudTournaments([]);
  };

  const handlePushCurrentTournament = async () => {
    setIsSyncing(true);
    setSyncStatus('Pushing current tournament to Supabase...');
    const res = await saveTournamentToCloud(vault, activeArbiter);
    setIsSyncing(false);
    if (res.success) {
      setSyncStatus('✓ Successfully pushed tournament to Supabase cloud!');
      loadList();
    } else {
      setSyncStatus(`Sync failed: ${res.error}`);
    }
  };

  const loadList = async () => {
    setIsLoadingList(true);
    const list = await listCloudTournaments();
    setCloudTournaments(list);
    setIsLoadingList(false);
  };

  const handleSelectCloudTournament = async (tId: string) => {
    if (
      !confirm(
        'Load this tournament from Supabase? Any unsaved local edits to the current tournament will be replaced by the cloud version.'
      )
    ) {
      return;
    }
    const res = await loadTournamentFromCloud(tId);
    if (res.success && res.vault) {
      onLoadVaultFromCloud(res.vault);
      onClose();
    } else {
      alert(`Failed to load cloud tournament: ${res.error}`);
    }
  };

  const SQL_SCHEMA = `-- ROYAL SWISS: SUPABASE DATABASE SCHEMA
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tournaments REPLICA IDENTITY FULL;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arbiters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read tournaments" ON public.tournaments;
CREATE POLICY "Public read tournaments" ON public.tournaments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow write tournaments" ON public.tournaments;
CREATE POLICY "Allow write tournaments" ON public.tournaments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read arbiters" ON public.arbiters;
CREATE POLICY "Public read arbiters" ON public.arbiters FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow write arbiters" ON public.arbiters;
CREATE POLICY "Allow write arbiters" ON public.arbiters FOR ALL USING (true) WITH CHECK (true);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'tournaments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;
  END IF;
END $$;`;

  const handleCopySchema = () => {
    navigator.clipboard.writeText(SQL_SCHEMA);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
  };

  const configured = isSupabaseConfigured();

  return (
    <div
      className="modal-overlay"
      style={{
        zIndex: 9999,
        background: 'rgba(10, 25, 47, 0.65)',
        backdropFilter: 'blur(6px)',
      }}
      onClick={onClose}
    >
      <div
        className="modal-content card-clean"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          background: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(10, 25, 47, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--navy-border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: configured ? 'var(--green-tint)' : 'var(--navy-tint)',
                color: configured ? 'var(--green-primary)' : 'var(--navy-royal)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Database size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--navy-deep)', lineHeight: 1.2 }}>
                Supabase Cloud Database & Live Sync
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Persistent PostgreSQL backend, Spectator Live Sync & Vercel deployment
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary-white"
            style={{ padding: '0.35rem', borderRadius: '50%' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          className="mobile-touch-scroll"
          style={{
            borderBottom: '1px solid var(--navy-border-light)',
            background: '#ffffff',
            padding: '0 1rem',
            gap: '0.85rem',
            width: '100%',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('SETTINGS')}
            style={{
              padding: '0.75rem 0.25rem',
              borderBottom: activeTab === 'SETTINGS' ? '2.5px solid var(--navy-royal)' : '2.5px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              fontWeight: activeTab === 'SETTINGS' ? 800 : 600,
              color: activeTab === 'SETTINGS' ? 'var(--navy-royal)' : 'var(--text-muted)',
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            Credentials & Settings
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('CLOUD_LIST');
              if (configured) loadList();
            }}
            style={{
              padding: '0.75rem 0.25rem',
              borderBottom: activeTab === 'CLOUD_LIST' ? '2.5px solid var(--navy-royal)' : '2.5px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              fontWeight: activeTab === 'CLOUD_LIST' ? 800 : 600,
              color: activeTab === 'CLOUD_LIST' ? 'var(--navy-royal)' : 'var(--text-muted)',
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <span>Cloud Tournaments</span>
            {cloudTournaments.length > 0 && (
              <span className="badge-minimal badge-navy" style={{ fontSize: '0.62rem' }}>
                {cloudTournaments.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SQL_SCHEMA')}
            style={{
              padding: '0.75rem 0.25rem',
              borderBottom: activeTab === 'SQL_SCHEMA' ? '2.5px solid var(--navy-royal)' : '2.5px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              fontWeight: activeTab === 'SQL_SCHEMA' ? 800 : 600,
              color: activeTab === 'SQL_SCHEMA' ? 'var(--navy-royal)' : 'var(--text-muted)',
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            SQL Setup Script
          </button>
        </div>

        {/* Tab 1: Settings & Credentials */}
        {activeTab === 'SETTINGS' && (
          <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
            {/* Status Indicator */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: configured ? 'var(--green-tint)' : 'var(--bg-secondary)',
                border: configured ? '1px solid var(--green-border)' : '1px solid var(--navy-border-light)',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {configured ? (
                  <CheckCircle2 size={16} color="var(--green-primary)" />
                ) : (
                  <Cloud size={16} color="var(--text-muted)" />
                )}
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 800, color: configured ? 'var(--green-deep)' : 'var(--navy-deep)' }}>
                    {configured ? 'Supabase Connected & Active' : 'Supabase Not Configured'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {configured
                      ? 'Local changes auto-sync to your PostgreSQL database'
                      : 'Provide Project URL & Anon Key from your Supabase dashboard'}
                  </div>
                </div>
              </div>
              {configured && (
                <button
                  type="button"
                  onClick={handlePushCurrentTournament}
                  disabled={isSyncing}
                  className="btn btn-primary-green"
                  style={{ fontSize: '0.76rem', padding: '0.35rem 0.75rem' }}
                >
                  <UploadCloud size={13} />
                  <span>{isSyncing ? 'Syncing...' : 'Push Tournament'}</span>
                </button>
              )}
            </div>

            {/* Sync feedback message */}
            {syncStatus && (
              <div
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  background: syncStatus.startsWith('✓') ? 'var(--green-tint)' : '#fef2f2',
                  color: syncStatus.startsWith('✓') ? 'var(--green-deep)' : '#991b1b',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  marginBottom: '1rem',
                }}
              >
                {syncStatus}
              </div>
            )}

            {/* Inputs */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--navy-deep)', marginBottom: '0.3rem' }}>
                Supabase Project URL
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--navy-border)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.82rem',
                }}
              />
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                Found in Supabase Dashboard → Settings → API → Project URL
              </span>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--navy-deep)', marginBottom: '0.3rem' }}>
                Supabase Anon / Public Key (<code>anon public</code>)
              </label>
              <input
                type="password"
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--navy-border)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.82rem',
                }}
              />
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                Found in Supabase Dashboard → Settings → API → Project API Keys (anon public)
              </span>
            </div>

            {/* Test result banner */}
            {testResult && (
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '6px',
                  background: testResult.success ? 'var(--green-tint)' : '#fef2f2',
                  border: testResult.success ? '1px solid var(--green-border)' : '1px solid #fecaca',
                  color: testResult.success ? 'var(--green-deep)' : '#991b1b',
                  fontSize: '0.76rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                }}
              >
                {testResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <div>{testResult.message}</div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting || !url || !anonKey}
                  className="btn btn-secondary-white"
                  style={{ fontSize: '0.78rem', padding: '0.5rem 0.9rem' }}
                >
                  <RefreshCw size={13} className={isTesting ? 'spin' : ''} />
                  <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={!url || !anonKey}
                  className="btn btn-primary-navy"
                  style={{ fontSize: '0.78rem', padding: '0.5rem 1.1rem' }}
                >
                  <Check size={14} />
                  <span>Save & Connect</span>
                </button>
              </div>

              {configured && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="btn btn-secondary-white"
                  style={{ fontSize: '0.74rem', padding: '0.45rem 0.75rem', color: '#991b1b' }}
                >
                  Clear Credentials
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Cloud Tournaments Explorer */}
        {activeTab === 'CLOUD_LIST' && (
          <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--navy-deep)' }}>
                  Cloud Stored Tournaments
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Select any tournament to load into your active Chief Arbiter workspace
                </div>
              </div>
              <button
                type="button"
                onClick={loadList}
                disabled={isLoadingList}
                className="btn btn-secondary-white"
                style={{ fontSize: '0.72rem', padding: '0.35rem 0.65rem' }}
              >
                <RefreshCw size={12} className={isLoadingList ? 'spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>

            {cloudTournaments.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '2.5rem 1rem',
                  border: '1.5px dashed var(--navy-border)',
                  borderRadius: '8px',
                  color: 'var(--text-muted)',
                }}
              >
                <Database size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--navy-deep)', marginBottom: '0.3rem' }}>
                  No tournaments in cloud yet
                </div>
                <p style={{ fontSize: '0.76rem', maxWidth: '340px', margin: '0 auto 1rem' }}>
                  Click &ldquo;Push Tournament&rdquo; on the Settings tab to sync your current active tournament to Supabase.
                </p>
                <button
                  type="button"
                  onClick={handlePushCurrentTournament}
                  disabled={!configured || isSyncing}
                  className="btn btn-primary-green"
                  style={{ fontSize: '0.78rem' }}
                >
                  <UploadCloud size={14} />
                  <span>Push Current Tournament</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {cloudTournaments.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid var(--navy-border-light)',
                      background: t.id === vault.currentState.id ? 'var(--navy-tint)' : '#ffffff',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                        <span
                          className={`badge-minimal ${
                            t.status === 'COMPLETED' ? 'badge-green' : t.status === 'IN_PROGRESS' ? 'badge-navy' : 'badge-muted'
                          }`}
                          style={{ fontSize: '0.62rem' }}
                        >
                          {t.status}
                        </span>
                        <strong style={{ fontSize: '0.88rem', color: 'var(--navy-deep)' }}>{t.name}</strong>
                        {t.id === vault.currentState.id && (
                          <span className="badge-minimal badge-green" style={{ fontSize: '0.6rem' }}>
                            CURRENTLY ACTIVE
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        Round {t.current_round} of {t.total_rounds} • {t.players_count} Players • Updated{' '}
                        {new Date(t.updated_at).toLocaleDateString()}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectCloudTournament(t.id)}
                      className="btn btn-secondary-white"
                      style={{ fontSize: '0.74rem', padding: '0.4rem 0.75rem' }}
                    >
                      <DownloadCloud size={13} />
                      <span>Load</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: SQL Setup Script */}
        {activeTab === 'SQL_SCHEMA' && (
          <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--navy-deep)' }}>
                  1-Click Supabase SQL Setup
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Copy & paste into your Supabase SQL Editor (Dashboard → SQL Editor → New Query)
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopySchema}
                className="btn btn-primary-navy"
                style={{ fontSize: '0.74rem', padding: '0.4rem 0.85rem' }}
              >
                {copiedSchema ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedSchema ? 'Copied!' : 'Copy SQL Script'}</span>
              </button>
            </div>

            <pre
              style={{
                background: 'var(--navy-deep)',
                color: '#e2e8f0',
                padding: '1rem',
                borderRadius: '8px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.74rem',
                overflowX: 'auto',
                lineHeight: 1.45,
                maxHeight: '260px',
              }}
            >
              {SQL_SCHEMA}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
