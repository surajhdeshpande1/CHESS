import React from 'react';
import {
  Trophy,
  Users,
  Zap,
  BarChart3,
  Printer,
  Sun,
  Moon,
  Sparkles,
  Lock,
  Play,
  CheckCircle2,
  ShieldCheck,
  History,
  Tv,
  Award,
  Search,
} from 'lucide-react';
import { TournamentState } from '../lib/fideSwissEngine';

export type ZeroConfusionTab =
  | 'tournaments'
  | 'players'
  | 'live_round'
  | 'standings'
  | 'print_share';

interface SmartAutopilotHeaderProps {
  tournament: TournamentState;
  activeTab: ZeroConfusionTab;
  setActiveTab: (tab: ZeroConfusionTab) => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  onAutopilotAction: () => void;
  onQuickDemoGenerator: () => void;
  onOpenActivityDrawer: () => void;
  auditLogCount: number;
  onOpenIntegrityModal: () => void;
  isIntegrityValid: boolean;
  onOpenBroadcast: () => void;
  onOpenPrizes: () => void;
  onOpenPlayerSearch: () => void;
  onReturnToLanding: () => void;
}

export const SmartAutopilotHeader: React.FC<SmartAutopilotHeaderProps> = ({
  tournament,
  activeTab,
  setActiveTab,
  theme,
  setTheme,
  onAutopilotAction,
  onQuickDemoGenerator,
  onOpenActivityDrawer,
  auditLogCount,
  onOpenIntegrityModal,
  isIntegrityValid,
  onOpenBroadcast,
  onOpenPrizes,
  onOpenPlayerSearch,
  onReturnToLanding,
}) => {
  const currentRoundIdx = tournament.currentRound - 1;
  const currentRoundBoards =
    currentRoundIdx >= 0 && currentRoundIdx < tournament.rounds.length
      ? tournament.rounds[currentRoundIdx]
      : [];

  const totalBoards = currentRoundBoards.length;
  const completedBoards = currentRoundBoards.filter((b) => b.result !== 'PENDING').length;
  const unreportedBoards = totalBoards - completedBoards;

  // Determine Autopilot Button State
  let autopilotLabel = '';
  let autopilotClass = 'btn btn-secondary';
  let isAutopilotDisabled = false;
  let AutopilotIcon = Play;

  if (tournament.status === 'REGISTRATION') {
    if (tournament.players.length < tournament.rules.minPlayers) {
      autopilotLabel = `🔒 Need at least ${tournament.rules.minPlayers} Players to Start (${tournament.players.length}/${tournament.rules.maxPlayers})`;
      autopilotClass = 'btn btn-secondary';
      isAutopilotDisabled = true;
      AutopilotIcon = Lock;
    } else {
      autopilotLabel = `🚀 Lock Players & Auto-Pair Round 1`;
      autopilotClass = 'btn btn-primary autopilot-ready';
      isAutopilotDisabled = false;
      AutopilotIcon = Sparkles;
    }
  } else if (tournament.status === 'IN_PROGRESS') {
    if (unreportedBoards > 0) {
      autopilotLabel = `⏳ Round ${tournament.currentRound} in Progress (${completedBoards} of ${totalBoards} Boards Done)`;
      autopilotClass = 'btn btn-secondary';
      isAutopilotDisabled = false;
      AutopilotIcon = Zap;
    } else {
      if (tournament.currentRound < tournament.totalRounds) {
        autopilotLabel = `⚡ All Boards Done! Click to Auto-Pair Round ${tournament.currentRound + 1}`;
        autopilotClass = 'btn btn-accent autopilot-ready';
        isAutopilotDisabled = false;
        AutopilotIcon = CheckCircle2;
      } else {
        autopilotLabel = `🏆 Tournament Complete! View Podium & Export Report`;
        autopilotClass = 'btn btn-primary autopilot-ready';
        isAutopilotDisabled = false;
        AutopilotIcon = Trophy;
      }
    }
  } else {
    autopilotLabel = `🏆 Tournament Complete! View Final Standings`;
    autopilotClass = 'btn btn-primary';
    isAutopilotDisabled = false;
    AutopilotIcon = Trophy;
  }

  return (
    <header className="no-print" style={{
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backdropFilter: 'blur(10px)',
    }}>
      {/* Top Bar with Branding, Guards, Activity Ledger, Broadcast & Autopilot */}
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '0.65rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        {/* Left: Branding & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <button
            onClick={onReturnToLanding}
            title="Return to Landing Showcase"
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #f59e0b, #b45309)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000',
              fontWeight: 800,
              fontSize: '1.4rem',
              boxShadow: '0 0 15px rgba(245, 158, 11, 0.35)',
              border: 'none',
              cursor: 'pointer',
              transition: 'transform 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            ♔
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {tournament.name}
              </h1>
              <span className={`badge ${tournament.status === 'COMPLETED' ? 'badge-emerald' : 'badge-gold'}`}>
                {tournament.status === 'REGISTRATION' ? 'Registration Open' : tournament.status === 'IN_PROGRESS' ? `Round ${tournament.currentRound}/${tournament.totalRounds}` : 'Completed'}
              </span>

              {/* 7-Point Integrity Pill */}
              <button
                onClick={onOpenIntegrityModal}
                className="btn btn-outline"
                style={{
                  padding: '0.2rem 0.6rem',
                  fontSize: '0.75rem',
                  borderColor: isIntegrityValid ? 'rgba(16, 185, 129, 0.4)' : '#f43f5e',
                  color: isIntegrityValid ? 'var(--accent-emerald)' : '#f43f5e',
                  background: isIntegrityValid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                }}
                title="Click to inspect 7 FIDE Mathematical Invariant Guards"
              >
                <ShieldCheck size={14} />
                {isIntegrityValid ? '✅ FIDE Verified (7/7 Guards)' : '⚠️ Integrity Alert'}
              </button>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Enrolled: <strong style={{ color: 'var(--text-primary)' }}>{tournament.players.length}</strong> / {tournament.rules.maxPlayers} Players • Dutch C.04.3
            </p>
          </div>
        </div>

        {/* Right Action Icons: Activity Log, Hall Display, Prizes, Theme & Autopilot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Quick Demo */}
          {tournament.status === 'REGISTRATION' && (
            <button
              id="btn-quick-demo"
              className="btn btn-secondary"
              onClick={onQuickDemoGenerator}
              title="Populate 64 realistic FIDE masters and grandmasters in 1 click"
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.8rem' }}
            >
              <Sparkles size={14} color="var(--accent-gold)" />
              64 GM Demo
            </button>
          )}

          {/* Activity Drawer & 1-Click Undo */}
          <button
            onClick={onOpenActivityDrawer}
            className="btn btn-secondary"
            title="Open Activity Audit Flight Recorder & 1-Click Time Machine Undo"
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.8rem', gap: '0.4rem' }}
          >
            <History size={14} color="var(--accent-gold)" />
            <span>📜 Ledger</span>
            <span className="badge badge-gold" style={{ fontSize: '0.65rem', padding: '0.05rem 0.35rem' }}>
              {auditLogCount}
            </span>
          </button>

          {/* Hall Projector Broadcast */}
          <button
            onClick={onOpenBroadcast}
            className="btn btn-outline"
            title="Launch Full-Screen Arena Broadcast Display for Hall Projectors"
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.75rem' }}
          >
            <Tv size={14} color="var(--accent-blue)" />
            <span>Hall Display</span>
          </button>

          {/* Prize Allocator */}
          <button
            onClick={onOpenPrizes}
            className="btn btn-outline"
            title="Open 1-Click Multi-Category Prize & Trophy Allocator"
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.75rem' }}
          >
            <Award size={14} color="var(--accent-gold)" />
            <span>Prizes</span>
          </button>

          {/* Find My Board */}
          <button
            onClick={onOpenPlayerSearch}
            className="btn btn-outline"
            title="Player Self-Service: Find My Board"
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.75rem' }}
          >
            <Search size={14} />
            <span>Find Board</span>
          </button>

          {/* Dual Theme Toggle */}
          <button
            className="btn btn-outline"
            style={{ padding: '0.45rem 0.65rem', borderRadius: '8px' }}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={`Switch to ${theme === 'dark' ? 'Daylight Arbiter Mode' : 'Championship Dark Mode'}`}
          >
            {theme === 'dark' ? <Sun size={15} color="#fbbf24" /> : <Moon size={15} color="#3b82f6" />}
          </button>

          {/* THE SMART AUTOPILOT BUTTON */}
          <button
            id="btn-smart-autopilot"
            className={autopilotClass}
            disabled={isAutopilotDisabled}
            onClick={onAutopilotAction}
            style={{
              padding: '0.6rem 1.25rem',
              fontSize: '0.88rem',
              fontWeight: 800,
              letterSpacing: '-0.01em',
            }}
          >
            <AutopilotIcon size={17} />
            {autopilotLabel}
          </button>
        </div>
      </div>

      {/* The 5 "Zero-Confusion" Big Navigation Buttons */}
      <nav style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '0.3rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        overflowX: 'auto',
      }}>
        <button
          id="nav-tournaments"
          className={`nav-big-btn ${activeTab === 'tournaments' ? 'active' : ''}`}
          onClick={() => setActiveTab('tournaments')}
        >
          <Trophy size={17} />
          1. 🏆 Tournaments & Rules
        </button>

        <button
          id="nav-players"
          className={`nav-big-btn ${activeTab === 'players' ? 'active' : ''}`}
          onClick={() => setActiveTab('players')}
        >
          <Users size={17} />
          2. 👥 Players & Eligibility ({tournament.players.length})
        </button>

        <button
          id="nav-live-round"
          className={`nav-big-btn ${activeTab === 'live_round' ? 'active' : ''}`}
          onClick={() => setActiveTab('live_round')}
        >
          <Zap size={17} />
          3. ⚡ Live Round & Winner Tap
          {unreportedBoards > 0 && tournament.status === 'IN_PROGRESS' && (
            <span className="badge badge-gold" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
              {unreportedBoards} left
            </span>
          )}
        </button>

        <button
          id="nav-standings"
          className={`nav-big-btn ${activeTab === 'standings' ? 'active' : ''}`}
          onClick={() => setActiveTab('standings')}
        >
          <BarChart3 size={17} />
          4. 📊 Live Standings & Wins
        </button>

        <button
          id="nav-print-share"
          className={`nav-big-btn ${activeTab === 'print_share' ? 'active' : ''}`}
          onClick={() => setActiveTab('print_share')}
        >
          <Printer size={17} />
          5. 🖨️ Print / Share Live Link
        </button>
      </nav>
    </header>
  );
};
