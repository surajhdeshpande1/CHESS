import React from 'react';
import {
  Trophy,
  Sparkles,
  FolderOpen,
  ArrowRight,
  ShieldCheck,
  Play,
  RotateCcw,
  LogOut,
  Users,
  Clock,
  Award,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import { ArbiterProfile } from '../lib/arbiterAuth';
import { TournamentState } from '../lib/fideSwissEngine';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { Database } from 'lucide-react';

interface HomeDashboardViewProps {
  activeArbiter: ArbiterProfile | null;
  tournament: TournamentState;
  onEnterActiveTournament: () => void;
  onCreateNewTournament: () => void;
  onLaunchDemoTournament: () => void;
  onImportDocument: () => void;
  onOpenCloudSync?: () => void;
  onSignOut: () => void;
}

export const HomeDashboardView: React.FC<HomeDashboardViewProps> = ({
  activeArbiter,
  tournament,
  onEnterActiveTournament,
  onCreateNewTournament,
  onLaunchDemoTournament,
  onImportDocument,
  onOpenCloudSync,
  onSignOut,
}) => {
  const hasExistingTournament = tournament.players.length > 0 || Boolean(tournament.name);
  const isCompleted = tournament.status === 'COMPLETED';
  const isInProgress = tournament.status === 'IN_PROGRESS';

  const arbiterDisplayName = activeArbiter
    ? `${activeArbiter.title ? `${activeArbiter.title.replace(/_/g, ' ')} ` : ''}${activeArbiter.name}`
    : 'Chief Arbiter';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation Bar */}
      <header
        style={{
          background: '#ffffff',
          borderBottom: '1px solid var(--navy-border-light)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '0.85rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          {/* Brand Crest */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'var(--navy-deep)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                fontWeight: 800,
                boxShadow: '0 2px 4px rgba(10, 25, 47, 0.12)',
              }}
            >
              ♔
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.05rem',
                  fontWeight: 900,
                  color: 'var(--navy-deep)',
                  letterSpacing: '0.04em',
                  lineHeight: 1.1,
                }}
              >
                ROYAL SWISS
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                FIDE Dutch Pairing & Tournament Suite
              </div>
            </div>
          </div>

          {/* Arbiter Session & Sign Out */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {activeArbiter && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '20px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--navy-border-light)',
                  fontSize: '0.76rem',
                }}
              >
                <span className="badge-minimal badge-navy" style={{ fontSize: '0.66rem' }}>
                  {activeArbiter.title ? activeArbiter.title.replace(/_/g, ' ') : 'ARBITER'}
                </span>
                <strong style={{ color: 'var(--navy-deep)' }}>{activeArbiter.name}</strong>
                {activeArbiter.fideId && (
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    #{activeArbiter.fideId}
                  </span>
                )}
              </div>
            )}

            {onOpenCloudSync && (
              <button
                type="button"
                onClick={onOpenCloudSync}
                className="btn btn-secondary-white"
                style={{
                  fontSize: '0.76rem',
                  padding: '0.4rem 0.75rem',
                  color: isSupabaseConfigured() ? 'var(--green-deep)' : 'var(--navy-deep)',
                  borderColor: isSupabaseConfigured() ? 'var(--green-border)' : 'var(--navy-border-light)',
                  background: isSupabaseConfigured() ? 'var(--green-tint)' : '#ffffff',
                }}
                title="Supabase Cloud Database & Live Spectator Sync"
              >
                <Database size={13} color={isSupabaseConfigured() ? 'var(--green-primary)' : 'var(--navy-royal)'} />
                <span>{isSupabaseConfigured() ? 'Cloud Live' : 'Cloud Sync'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onSignOut}
              className="btn btn-secondary-white"
              style={{ fontSize: '0.76rem', padding: '0.4rem 0.75rem' }}
              title="Sign Out"
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Home Hub Content */}
      <main style={{ flex: 1, maxWidth: '1180px', width: '100%', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        {/* Welcome Banner */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span className="badge-minimal badge-green">
              ● FIDE DUTCH ALGORITHM C.04.3 CERTIFIED
            </span>
            <span className="badge-minimal badge-muted">
              OFFLINE READY & ENCRYPTED VAULT
            </span>
          </div>
          <h1
            style={{
              fontSize: '2.1rem',
              fontWeight: 900,
              color: 'var(--navy-deep)',
              fontFamily: 'var(--font-heading)',
              letterSpacing: '0.02em',
              marginBottom: '0.4rem',
            }}
          >
            Welcome, {arbiterDisplayName}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.94rem', maxWidth: '680px' }}>
            Tournament Director & Chief Arbiter Control Center. Create a fresh Swiss tournament, import players from an Excel or Word file on your device, or resume your active tournament.
          </p>
        </div>

        {/* ACTIVE TOURNAMENT RESUME HERO CARD (If exists) */}
        {hasExistingTournament && (
          <div
            className="card-clean"
            style={{
              padding: '1.5rem',
              marginBottom: '2rem',
              borderLeft: '5px solid var(--navy-royal)',
              background: 'linear-gradient(180deg, #ffffff 0%, var(--bg-subtle) 100%)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                  <span
                    className={`badge-minimal ${
                      isCompleted ? 'badge-green' : isInProgress ? 'badge-navy' : 'badge-muted'
                    }`}
                  >
                    {isCompleted ? '✓ COMPLETED' : isInProgress ? '● IN PROGRESS' : 'REGISTRATION / ROSTER'}
                  </span>
                  {tournament.timeControlName && (
                    <span className="badge-minimal badge-muted" style={{ fontFamily: 'var(--font-mono)' }}>
                      ⏱ {tournament.timeControlName}
                    </span>
                  )}
                </div>
                <h2 style={{ fontSize: '1.45rem', color: 'var(--navy-deep)', fontWeight: 800, marginBottom: '0.3rem' }}>
                  {tournament.name || 'Untitled Tournament'}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                  <span>
                    <strong style={{ color: 'var(--navy-deep)' }}>Round {tournament.currentRound}</strong> of {tournament.totalRounds}
                  </span>
                  <span>•</span>
                  <span>
                    <strong style={{ color: 'var(--navy-deep)' }}>{tournament.players.length}</strong> Players Enrolled
                  </span>
                  {tournament.rounds.length > 0 && (
                    <>
                      <span>•</span>
                      <span>
                        <strong style={{ color: 'var(--navy-deep)' }}>{tournament.rounds.length}</strong> Completed Rounds
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={onEnterActiveTournament}
                  className="btn btn-primary-green"
                  style={{ padding: '0.7rem 1.6rem', fontSize: '0.9rem', fontWeight: 800 }}
                >
                  <Play size={16} />
                  <span>Resume Tournament</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PRIMARY ACTIONS GRID */}
        <h3
          style={{
            fontSize: '1.1rem',
            fontWeight: 800,
            color: 'var(--navy-deep)',
            marginBottom: '1rem',
            letterSpacing: '0.02em',
          }}
        >
          Tournament Actions
        </h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.25rem',
            marginBottom: '2.5rem',
          }}
        >
          {/* Card 1: Create New Tournament */}
          <div
            onClick={onCreateNewTournament}
            className="card-clean"
            style={{
              padding: '1.5rem',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.18s ease',
              borderTop: '3px solid var(--navy-royal)',
            }}
          >
            <div>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  background: 'var(--navy-tint)',
                  color: 'var(--navy-royal)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                }}
              >
                <Trophy size={22} />
              </div>
              <h4 style={{ fontSize: '1.15rem', color: 'var(--navy-deep)', fontWeight: 800, marginBottom: '0.4rem' }}>
                Create New Tournament
              </h4>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                Configure a brand new Swiss tournament from scratch. Set tournament title, total rounds (3–11), Dutch pairing rules, custom time controls, and rating brackets.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary-navy"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <span>+ Create Tournament</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Card 2: Import Device Document */}
          <div
            onClick={onImportDocument}
            className="card-clean"
            style={{
              padding: '1.5rem',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.18s ease',
              borderTop: '3px solid #16a34a',
            }}
          >
            <div>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  background: 'var(--green-tint)',
                  color: 'var(--green-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                }}
              >
                <FileSpreadsheet size={22} />
              </div>
              <h4 style={{ fontSize: '1.15rem', color: 'var(--navy-deep)', fontWeight: 800, marginBottom: '0.4rem' }}>
                Import Excel / Word Roster
              </h4>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                Upload an existing player spreadsheet (<strong>.xlsx</strong>, <strong>.xls</strong>), Word document (<strong>.docx</strong>), or CSV directly from your device. Auto-detects names, ratings, titles, and clubs.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary-white"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <FolderOpen size={15} />
              <span>Browse Device File</span>
            </button>
          </div>

          {/* Card 3: Quick Demo Tournament */}
          <div
            onClick={onLaunchDemoTournament}
            className="card-clean"
            style={{
              padding: '1.5rem',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.18s ease',
              borderTop: '3px solid #d97706',
            }}
          >
            <div>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  background: '#fef3c7',
                  color: '#b45309',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                }}
              >
                <Sparkles size={22} />
              </div>
              <h4 style={{ fontSize: '1.15rem', color: 'var(--navy-deep)', fontWeight: 800, marginBottom: '0.4rem' }}>
                Quick 64-Player GM Demo
              </h4>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                Instantly simulate a 64-player Grandmaster Swiss tournament featuring realistic ratings, authentic FIDE IDs, Dutch pairing verification, and live standings.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary-white"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Sparkles size={14} />
              <span>Launch 64-Player Demo</span>
            </button>
          </div>
        </div>

        {/* FIDE COMPLIANCE & CAPABILITIES FOOTER */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--navy-border-light)',
            borderRadius: '10px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShieldCheck size={24} color="var(--navy-royal)" />
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--navy-deep)' }}>
                Certified FIDE Swiss-Manager Engine
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                7-Point Mathematical Invariant Guards • Buchholz Cut-1 Matrix • FIDE TRF16 Export Ready
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className="badge-minimal badge-navy">FIDE C.04.3 Dutch</span>
            <span className="badge-minimal badge-muted">Buchholz C.07</span>
            <span className="badge-minimal badge-muted">TRF16 Compliant</span>
          </div>
        </div>
      </main>
    </div>
  );
};
