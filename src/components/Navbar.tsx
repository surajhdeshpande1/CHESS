import React from 'react';
import {
  Trophy,
  Swords,
  Table,
  Users,
  Eye,
  Printer,
  Settings,
  Download,
  Upload,
  Play,
  CheckCircle2,
} from 'lucide-react';
import { Tournament } from '../types/chess';

export type ActiveTab = 'pairings' | 'standings' | 'crosstable' | 'roster' | 'spectator' | 'print';

interface NavbarProps {
  tournament: Tournament;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onGeneratePairings: () => void;
  onCompleteRound: () => void;
  onOpenSettings: () => void;
  onExportTRF: () => void;
  onImportTRFClick: () => void;
  onResetSample: (count: number) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  tournament,
  activeTab,
  setActiveTab,
  onGeneratePairings,
  onCompleteRound,
  onOpenSettings,
  onExportTRF,
  onImportTRFClick,
  onResetSample,
}) => {
  const currentRoundObj = tournament.rounds.find(
    (r) => r.roundNumber === tournament.currentRound
  );
  const isPaired = currentRoundObj?.isPaired ?? false;
  const isCompleted = currentRoundObj?.isCompleted ?? false;
  const allResultsEntered =
    isPaired &&
    currentRoundObj?.pairings.every((p) => p.result !== '*');

  return (
    <header className="no-print" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(7, 11, 20, 0.95)', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(10px)' }}>
      {/* Top Banner */}
      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #f59e0b, #b45309)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(245, 158, 11, 0.35)',
            color: '#000',
            fontWeight: 800,
            fontSize: '1.25rem',
          }}>
            ♟
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {tournament.settings.name}
              </h1>
              <span className="badge badge-gold">FIDE Dutch C.04.3</span>
              {tournament.settings.enableBakuAcceleration && (
                <span className="badge badge-rose">Baku Accel</span>
              )}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {tournament.settings.city}, {tournament.settings.federation} • Arbiter: {tournament.settings.chiefArbiter} • {tournament.players.length} Players
            </p>
          </div>
        </div>

        {/* Round Progress & Primary Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '0.35rem 0.75rem',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Round</span>
            <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
              {tournament.currentRound}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ {tournament.settings.totalRounds}</span>
          </div>

          {!isPaired ? (
            <button
              id="btn-generate-pairings"
              className="btn btn-primary"
              onClick={onGeneratePairings}
            >
              <Play size={16} fill="#000" />
              Pair Round {tournament.currentRound}
            </button>
          ) : !isCompleted ? (
            <button
              id="btn-complete-round"
              className="btn btn-accent"
              onClick={onCompleteRound}
              disabled={!allResultsEntered}
              title={!allResultsEntered ? 'Enter all board results before completing round' : 'Finalize round and advance'}
            >
              <CheckCircle2 size={16} />
              {allResultsEntered ? `Finalize Round ${tournament.currentRound}` : 'Results Pending...'}
            </button>
          ) : (
            <span className="badge badge-emerald">Round Completed</span>
          )}

          <button
            id="btn-export-trf"
            className="btn btn-secondary"
            onClick={onExportTRF}
            title="Download official FIDE TRF16 file for Swiss-Manager / JaVaFo rating submission"
          >
            <Download size={15} />
            TRF16
          </button>

          <button
            id="btn-import-trf"
            className="btn btn-secondary"
            onClick={onImportTRFClick}
            title="Import an existing tournament TRF16 file"
          >
            <Upload size={15} />
            Import
          </button>

          <button
            id="btn-settings"
            className="btn btn-outline"
            onClick={onOpenSettings}
            title="Tournament settings & tie-breaks"
          >
            <Settings size={16} />
          </button>

          {/* Quick preset dropdown */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <select
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
                padding: '0.45rem 0.6rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
              onChange={(e) => onResetSample(parseInt(e.target.value, 10))}
              defaultValue="64"
            >
              <option value="50">50 Players (Min Cap)</option>
              <option value="64">64 Players (Elite Masters)</option>
              <option value="100">100 Players</option>
              <option value="150">150 Players (Baku Tested)</option>
              <option value="200">200 Players (Max Cap)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav style={{ maxWidth: '1440px', margin: '0 auto', padding: '0 1.25rem', display: 'flex', gap: '0.35rem', overflowX: 'auto' }}>
        <button
          className={`tab-btn ${activeTab === 'pairings' ? 'active' : ''}`}
          onClick={() => setActiveTab('pairings')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.65rem 1rem',
            border: 'none',
            background: 'transparent',
            color: activeTab === 'pairings' ? 'var(--accent-gold)' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'pairings' ? '2px solid var(--accent-gold)' : '2px solid transparent',
          }}
        >
          <Swords size={16} />
          Pairings & Boards
        </button>

        <button
          className={`tab-btn ${activeTab === 'standings' ? 'active' : ''}`}
          onClick={() => setActiveTab('standings')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.65rem 1rem',
            border: 'none',
            background: 'transparent',
            color: activeTab === 'standings' ? 'var(--accent-gold)' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'standings' ? '2px solid var(--accent-gold)' : '2px solid transparent',
          }}
        >
          <Trophy size={16} />
          Standings & Tie-breaks (C.07)
        </button>

        <button
          className={`tab-btn ${activeTab === 'crosstable' ? 'active' : ''}`}
          onClick={() => setActiveTab('crosstable')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.65rem 1rem',
            border: 'none',
            background: 'transparent',
            color: activeTab === 'crosstable' ? 'var(--accent-gold)' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'crosstable' ? '2px solid var(--accent-gold)' : '2px solid transparent',
          }}
        >
          <Table size={16} />
          Crosstable Matrix
        </button>

        <button
          className={`tab-btn ${activeTab === 'roster' ? 'active' : ''}`}
          onClick={() => setActiveTab('roster')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.65rem 1rem',
            border: 'none',
            background: 'transparent',
            color: activeTab === 'roster' ? 'var(--accent-gold)' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'roster' ? '2px solid var(--accent-gold)' : '2px solid transparent',
          }}
        >
          <Users size={16} />
          Player Roster ({tournament.players.length})
        </button>

        <button
          className={`tab-btn ${activeTab === 'spectator' ? 'active' : ''}`}
          onClick={() => setActiveTab('spectator')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.65rem 1rem',
            border: 'none',
            background: 'transparent',
            color: activeTab === 'spectator' ? 'var(--accent-emerald)' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'spectator' ? '2px solid var(--accent-emerald)' : '2px solid transparent',
          }}
        >
          <Eye size={16} />
          Live Spectator Portal
        </button>

        <button
          className={`tab-btn ${activeTab === 'print' ? 'active' : ''}`}
          onClick={() => setActiveTab('print')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.65rem 1rem',
            border: 'none',
            background: 'transparent',
            color: activeTab === 'print' ? 'var(--accent-gold)' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'print' ? '2px solid var(--accent-gold)' : '2px solid transparent',
          }}
        >
          <Printer size={16} />
          Print Official Sheets
        </button>
      </nav>
    </header>
  );
};
