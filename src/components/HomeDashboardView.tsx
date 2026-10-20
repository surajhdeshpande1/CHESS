import React from 'react';
import {
  Trophy,
  Sparkles,
  FolderOpen,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Play,
  RotateCcw,
  LogOut,
  Users,
  Clock,
  Award,
  CheckCircle2,
  FileSpreadsheet,
  Crown,
  Database,
} from 'lucide-react';
import { ArbiterProfile } from '../lib/arbiterAuth';
import { TournamentState } from '../lib/fideSwissEngine';
import { isSupabaseConfigured } from '../lib/supabaseClient';

interface HomeDashboardViewProps {
  activeArbiter: ArbiterProfile | null;
  tournament: TournamentState;
  onEnterActiveTournament: () => void;
  onCreateNewTournament: () => void;
  onLaunchDemoTournament: () => void;
  onImportDocument: () => void;
  onOpenCloudSync?: () => void;
  onOpenAdminConsole?: () => void;
  onBackToIntro?: () => void;
  onSignOut: () => void;
  onOpenOrganizerHub?: () => void;
}

export const HomeDashboardView: React.FC<HomeDashboardViewProps> = ({
  activeArbiter,
  tournament,
  onEnterActiveTournament,
  onCreateNewTournament,
  onLaunchDemoTournament,
  onImportDocument,
  onOpenCloudSync,
  onOpenAdminConsole,
  onBackToIntro,
  onSignOut,
  onOpenOrganizerHub,
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
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          {/* Brand Crest & Back Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {onBackToIntro && (
              <button
                type="button"
                onClick={onBackToIntro}
                className="btn btn-secondary-white"
                style={{
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  minHeight: '34px',
                }}
                title="Return to Intro Video"
              >
                <ArrowLeft size={14} />
                <span>Intro</span>
              </button>
            )}

            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'var(--navy-deep)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                fontWeight: 800,
                boxShadow: '0 2px 4px rgba(10, 25, 47, 0.12)',
                flexShrink: 0,
              }}
            >
              ♔
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1rem',
                  fontWeight: 900,
                  color: 'var(--navy-deep)',
                  letterSpacing: '0.06em',
                  lineHeight: 1.1,
                  whiteSpace: 'nowrap',
                }}
              >
                CHATURANGA
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                FIDE Dutch Pairing & Tournament Suite
              </div>
            </div>
          </div>

          {/* Arbiter Session & Sign Out */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {activeArbiter && (
              <div
                className="hide-on-mobile"
                style={{
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.3rem 0.65rem',
                  borderRadius: '20px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--navy-border-light)',
                  fontSize: '0.74rem',
                }}
              >
                <span className="badge-minimal badge-navy" style={{ fontSize: '0.64rem' }}>
                  {activeArbiter.title ? activeArbiter.title.replace(/_/g, ' ') : 'ARBITER'}
                </span>
                <strong style={{ color: 'var(--navy-deep)' }}>{activeArbiter.name}</strong>
              </div>
            )}

            {onOpenCloudSync && (
              <button
                type="button"
                onClick={onOpenCloudSync}
                className="btn btn-secondary-white"
                style={{
                  fontSize: '0.74rem',
                  padding: '0.35rem 0.65rem',
                  color: isSupabaseConfigured() ? 'var(--green-deep)' : 'var(--navy-deep)',
                  borderColor: isSupabaseConfigured() ? 'var(--green-border)' : 'var(--navy-border-light)',
                  background: isSupabaseConfigured() ? 'var(--green-tint)' : '#ffffff',
                  minHeight: '34px',
                }}
                title="Supabase Cloud Database & Live Spectator Sync"
              >
                <Database size={12} color={isSupabaseConfigured() ? 'var(--green-primary)' : 'var(--navy-royal)'} />
                <span>{isSupabaseConfigured() ? 'Live' : 'Cloud'}</span>
              </button>
            )}

            {onOpenOrganizerHub && (
              <button
                type="button"
                onClick={onOpenOrganizerHub}
                className="btn btn-secondary-white"
                style={{
                  fontSize: '0.74rem',
                  padding: '0.35rem 0.75rem',
                  color: '#b45309',
                  borderColor: 'rgba(245, 158, 11, 0.4)',
                  background: 'rgba(245, 158, 11, 0.1)',
                  fontWeight: 800,
                  minHeight: '34px',
                }}
                title="Open Multi-Tournament Command Center"
              >
                <span>🗂️ All My Tournaments</span>
              </button>
            )}

            {onOpenAdminConsole && (
              <button
                type="button"
                onClick={onOpenAdminConsole}
                className="btn btn-secondary-white"
                style={{
                  fontSize: '0.74rem',
                  padding: '0.35rem 0.75rem',
                  color: '#b45309',
                  borderColor: '#f59e0b',
                  background: 'rgba(245, 158, 11, 0.1)',
                  fontWeight: 800,
                  minHeight: '34px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
                title="Open Website Superadmin Console (All Access)"
              >
                <Crown size={13} color="#d97706" />
                <span>Admin</span>
              </button>
            )}

            <button
              type="button"
              onClick={onSignOut}
              className="btn btn-secondary-white"
              style={{ fontSize: '0.74rem', padding: '0.35rem 0.65rem', minHeight: '34px' }}
              title="Sign Out"
            >
              <LogOut size={12} />
              <span>Exit</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Home Hub Content */}
      <main style={{ flex: 1, maxWidth: '1180px', width: '100%', margin: '0 auto', padding: '1.5rem 1rem' }}>
        {/* Welcome Banner */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
            <span className="badge-minimal badge-green">
              ● FIDE DUTCH C.04.3 CERTIFIED
            </span>
            <span className="badge-minimal badge-muted">
              OFFLINE ENCRYPTED VAULT
            </span>
          </div>
          <h1
            style={{
              fontSize: 'clamp(1.5rem, 5vw, 2.2rem)',
              fontWeight: 900,
              color: 'var(--navy-deep)',
              fontFamily: 'var(--font-heading)',
              letterSpacing: '0.02em',
              marginBottom: '0.4rem',
            }}
          >
            Welcome, {arbiterDisplayName}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: '680px', lineHeight: 1.5 }}>
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            gap: '1rem',
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
