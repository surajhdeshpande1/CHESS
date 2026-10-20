import React from 'react';
import {
  Zap,
  CheckCircle2,
  Sparkles,
  Clock,
  HelpCircle,
  Share2,
  Tv,
  Smartphone,
  Eye,
} from 'lucide-react';
import {
  BoardPairing,
  CandidatePlayer,
  GameResult,
  TournamentState,
} from '../lib/fideSwissEngine';

interface LiveRoundWinnerTapProps {
  tournament: TournamentState;
  onTapResult: (boardNumber: number, result: GameResult) => void;
  onSimulateRemaining: () => void;
  onExplainBoard: (board: BoardPairing) => void;
  onOpenWhatsApp: () => void;
  onOpenSimulator: () => void;
  onOpenSelfReport: () => void;
  onOpenBroadcast: () => void;
  pendingSelfReports?: Record<number, { result: GameResult; reportedByPlayerId: string }>;
  onConfirmSelfReport?: (boardNumber: number) => void;
}

export const LiveRoundWinnerTap: React.FC<LiveRoundWinnerTapProps> = ({
  tournament,
  onTapResult,
  onSimulateRemaining,
  onExplainBoard,
  onOpenWhatsApp,
  onOpenSimulator,
  onOpenSelfReport,
  onOpenBroadcast,
  pendingSelfReports = {},
  onConfirmSelfReport,
}) => {
  const currentRoundIdx = tournament.currentRound - 1;
  const currentRoundBoards =
    currentRoundIdx >= 0 && currentRoundIdx < tournament.rounds.length
      ? tournament.rounds[currentRoundIdx]
      : [];

  const playerMap = new Map<string, CandidatePlayer>();
  for (const p of tournament.players) {
    playerMap.set(p.id, p);
  }

  // Separate active match boards from byes
  const matchBoards = currentRoundBoards.filter((b) => b.blackPlayerId !== null);
  const byeBoards = currentRoundBoards.filter((b) => b.blackPlayerId === null);

  const completedCount = matchBoards.filter((b) => b.result !== 'PENDING').length;
  const totalMatches = matchBoards.length;
  const isRoundFinished = totalMatches > 0 && completedCount === totalMatches;

  if (tournament.status === 'REGISTRATION') {
    return (
      <div style={{ maxWidth: '800px', margin: '3rem auto', textAlign: 'center', padding: '2rem' }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem',
          fontSize: '2rem',
          color: 'var(--accent-gold)',
        }}>
          ♟
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Tournament Not Started Yet
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Ensure at least 50 players are enrolled in the Players tab, then click the glowing <strong>Smart Autopilot Button</strong> in the top header to auto-pair Round 1.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1140px', margin: '0 auto', padding: '1.5rem 1.25rem' }}>
      {/* Round Header & Progress Bar */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <span className="badge badge-gold">
                Round {tournament.currentRound} of {tournament.totalRounds}
              </span>
              <span className={`badge ${isRoundFinished ? 'badge-emerald' : 'badge-blue'}`}>
                {isRoundFinished ? 'All Boards Complete' : `${totalMatches - completedCount} In Progress`}
              </span>
            </div>

            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={22} color="var(--accent-gold)" />
              3. ⚡ Live Round & 1-Click Winner Tap
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Tap White ♔, Draw ½-½, or Black ♚ to record results. Instant reversible ledger rollback prevents double counting.
            </p>
          </div>

          {/* Quick Action Tools: WhatsApp, Simulator, Self-Report, Simulate All */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={onOpenWhatsApp}
              className="btn btn-outline"
              title="Generate 1-Click WhatsApp / Telegram Pairing Broadcast"
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.75rem' }}
            >
              <Share2 size={14} color="var(--accent-emerald)" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={onOpenSimulator}
              className="btn btn-outline"
              title="Open Live What-If Final Round Podium Simulator"
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.75rem' }}
            >
              <Eye size={14} color="var(--accent-gold)" />
              <span>Podium Simulator</span>
            </button>

            <button
              onClick={onOpenSelfReport}
              className="btn btn-outline"
              title="Open Player QR-Code Table Self-Report Portal"
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.75rem' }}
            >
              <Smartphone size={14} color="var(--accent-blue)" />
              <span>Self-Report</span>
            </button>

            <button
              onClick={onOpenBroadcast}
              className="btn btn-outline"
              title="Launch Hall Projector Arena Display"
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.75rem' }}
            >
              <Tv size={14} color="var(--accent-purple)" />
              <span>Projector</span>
            </button>

            {!isRoundFinished && (
              <button
                className="btn btn-secondary"
                onClick={onSimulateRemaining}
                title="Automatically simulate realistic master results for remaining boards"
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
              >
                <Sparkles size={14} color="var(--accent-gold)" />
                Simulate Results
              </button>
            )}
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div style={{ height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', marginTop: '1rem', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${totalMatches > 0 ? (completedCount / totalMatches) * 100 : 0}%`,
              background: isRoundFinished
                ? 'linear-gradient(90deg, #10b981, #059669)'
                : 'linear-gradient(90deg, #f59e0b, #d97706)',
              transition: 'width 0.25s ease',
            }}
          />
        </div>
      </div>

      {/* Main Boards List: Big Horizontal Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '2rem' }}>
        {matchBoards.map((b) => {
          const white = playerMap.get(b.whitePlayerId);
          const black = b.blackPlayerId ? playerMap.get(b.blackPlayerId) : null;
          if (!white || !black) return null;

          const isWhiteWin = b.result === 'WHITE_WIN';
          const isBlackWin = b.result === 'BLACK_WIN';
          const isDraw = b.result === 'DRAW';
          const isForfeit = b.result.includes('FORFEIT');

          const selfReport = pendingSelfReports[b.boardNumber];

          return (
            <div
              key={b.boardNumber}
              className="glass-panel"
              style={{
                padding: '0.85rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                borderLeft: isWhiteWin || isBlackWin
                  ? '5px solid var(--accent-emerald)'
                  : isDraw
                  ? '5px solid var(--accent-blue)'
                  : '5px solid var(--border-subtle)',
                transition: 'all 0.15s ease',
                flexWrap: 'wrap',
              }}
            >
              {/* Board Badge & Explain X-Ray Button */}
              <div style={{ width: '55px', textAlign: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>
                  BOARD
                </span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-gold)' }}>
                  {b.boardNumber}
                </span>

                <button
                  onClick={() => onExplainBoard(b)}
                  className="btn btn-outline"
                  style={{
                    padding: '0.15rem 0.35rem',
                    fontSize: '0.65rem',
                    marginTop: '0.2rem',
                    width: '100%',
                    justifyContent: 'center',
                  }}
                  title="FIDE Pairing X-Ray: Why this pair & why White pieces?"
                >
                  🔍 Why?
                </button>
              </div>

              {/* White Player Tap Card */}
              <div
                style={{
                  flex: '1 1 300px',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  border: isWhiteWin ? '2px solid var(--accent-emerald)' : '1px solid var(--border-subtle)',
                  background: isWhiteWin ? 'var(--winner-bg)' : 'var(--bg-secondary)',
                  transition: 'all 0.15s ease',
                  userSelect: 'none',
                }}
                onClick={() => onTapResult(b.boardNumber, 'WHITE_WIN')}
                title="Tap to declare White the winner (1 - 0)"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '4px',
                      background: '#fff',
                      border: '1px solid #cbd5e1',
                      display: 'inline-block',
                      flexShrink: 0,
                    }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      #{white.tpn}
                    </span>
                    {white.title !== 'NONE' && (
                      <span className="badge badge-gold" style={{ fontSize: '0.65rem', padding: '0.05rem 0.3rem' }}>
                        {white.title}
                      </span>
                    )}
                    <strong style={{ fontSize: '0.98rem' }}>{white.name}</strong>
                  </div>
                  {isWhiteWin && (
                    <span className="badge badge-emerald" style={{ fontSize: '0.72rem' }}>
                      <CheckCircle2 size={13} /> WINNER
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <span>Rating: <strong style={{ color: 'var(--text-secondary)' }}>{white.rating}</strong></span>
                  <span>Score: <strong style={{ color: 'var(--accent-gold)' }}>{white.score.toFixed(1)}</strong></span>
                  <span>Wins: {white.roundsWon}</span>
                </div>
              </div>

              {/* Center Draw Pill */}
              <button
                style={{
                  padding: '0.6rem 0.85rem',
                  borderRadius: '20px',
                  border: isDraw ? '2px solid var(--accent-blue)' : '1px solid var(--border-subtle)',
                  background: isDraw ? 'var(--draw-bg)' : 'var(--bg-secondary)',
                  color: isDraw ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
                onClick={() => onTapResult(b.boardNumber, 'DRAW')}
                title="Tap to declare game a DRAW (½ - ½)"
              >
                ½ - ½ DRAW
              </button>

              {/* Black Player Tap Card */}
              <div
                style={{
                  flex: '1 1 300px',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  border: isBlackWin ? '2px solid var(--accent-emerald)' : '1px solid var(--border-subtle)',
                  background: isBlackWin ? 'var(--winner-bg)' : 'var(--bg-secondary)',
                  transition: 'all 0.15s ease',
                  userSelect: 'none',
                }}
                onClick={() => onTapResult(b.boardNumber, 'BLACK_WIN')}
                title="Tap to declare Black the winner (0 - 1)"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '4px',
                      background: '#1e293b',
                      border: '1px solid #475569',
                      display: 'inline-block',
                      flexShrink: 0,
                    }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      #{black.tpn}
                    </span>
                    {black.title !== 'NONE' && (
                      <span className="badge badge-gold" style={{ fontSize: '0.65rem', padding: '0.05rem 0.3rem' }}>
                        {black.title}
                      </span>
                    )}
                    <strong style={{ fontSize: '0.98rem' }}>{black.name}</strong>
                  </div>
                  {isBlackWin && (
                    <span className="badge badge-emerald" style={{ fontSize: '0.72rem' }}>
                      <CheckCircle2 size={13} /> WINNER
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <span>Rating: <strong style={{ color: 'var(--text-secondary)' }}>{black.rating}</strong></span>
                  <span>Score: <strong style={{ color: 'var(--accent-gold)' }}>{black.score.toFixed(1)}</strong></span>
                  <span>Wins: {black.roundsWon}</span>
                </div>
              </div>

              {/* Overflow Menu for Rare Forfeits */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <select
                  style={{
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    padding: '0.45rem',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                  value={isForfeit ? b.result : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      onTapResult(b.boardNumber, e.target.value as GameResult);
                    }
                  }}
                  title="Rare forfeit options"
                >
                  <option value="">⋯</option>
                  <option value="WHITE_FORFEIT_WIN">+ - (White Forfeit Win)</option>
                  <option value="BLACK_FORFEIT_WIN">- + (Black Forfeit Win)</option>
                  <option value="DOUBLE_FORFEIT">0 - 0 (Double Forfeit)</option>
                  <option value="PENDING">Reset to Pending</option>
                </select>
              </div>

              {/* Self-Report Pending Banner if any */}
              {selfReport && b.result === 'PENDING' && (
                <div
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.85rem',
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid var(--accent-gold)',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '0.35rem',
                  }}
                >
                  <div style={{ fontSize: '0.78rem', color: 'var(--accent-gold)', fontWeight: 700 }}>
                    📱 Reported by Player at Table: {selfReport.result.replace(/_/g, ' ')}
                  </div>
                  {onConfirmSelfReport && (
                    <button
                      onClick={() => onConfirmSelfReport(b.boardNumber)}
                      className="btn btn-primary"
                      style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem' }}
                    >
                      ✓ 1-Click Confirm
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Auto-Resolved Byes Section */}
      {byeBoards.length > 0 && (
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={16} color="var(--accent-gold)" />
            Byes & Unpaired Candidates ({byeBoards.length}) — Auto-Awarded
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {byeBoards.map((b) => {
              const p = playerMap.get(b.whitePlayerId);
              if (!p) return null;
              const byeBadge =
                b.result === 'PAB'
                  ? 'PAB (+1.0 Point)'
                  : b.result === 'HALF_POINT_BYE'
                  ? 'Half-Point Bye (+0.5)'
                  : 'Zero-Point Bye (+0.0)';

              return (
                <div
                  key={b.boardNumber}
                  style={{
                    background: 'var(--bg-secondary)',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>#{p.tpn}</span>
                      <strong style={{ fontSize: '0.9rem' }}>{p.name}</strong>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Rating: {p.rating} • Score: {p.score.toFixed(1)}
                    </div>
                  </div>
                  <span className={`badge ${b.result === 'PAB' ? 'badge-emerald' : 'badge-gold'}`}>
                    {byeBadge}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
