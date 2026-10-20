import React, { useState } from 'react';
import { CandidatePlayer, GameResult, TournamentState } from '../lib/fideSwissEngine';
import { simulatePodiumWhatIf, WhatIfHypotheticalResult } from '../lib/tournamentVaultAndFeatures';

interface PodiumSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: TournamentState;
}

export const PodiumSimulatorModal: React.FC<PodiumSimulatorModalProps> = ({
  isOpen,
  onClose,
  tournament,
}) => {
  const currentRound = tournament.currentRound;
  const boards = tournament.rounds[currentRound - 1] || [];
  const playerMap = new Map(tournament.players.map((p) => [p.id, p]));

  // Track hypothetical overrides for boards
  const [hypoMap, setHypoMap] = useState<Record<number, GameResult>>({});

  if (!isOpen) return null;

  const topBoards = boards.slice(0, 6);

  const hypoResults: WhatIfHypotheticalResult[] = Object.entries(hypoMap).map(([bNum, res]) => ({
    boardNumber: Number(bNum),
    hypotheticalResult: res,
  }));

  const simulatedPlayers: CandidatePlayer[] = simulatePodiumWhatIf(tournament, hypoResults);
  const podiumTop5 = simulatedPlayers.slice(0, 5);

  const handleSetHypo = (boardNum: number, res: GameResult) => {
    setHypoMap((prev) => ({
      ...prev,
      [boardNum]: res,
    }));
  };

  const handleReset = () => {
    setHypoMap({});
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '820px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.6rem' }}>🔮</span>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Live "What-If" Final Round Podium Simulator</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Test hypothetical outcomes on top boards to preview the Championship podium before games conclude!
              </p>
            </div>
          </div>
          <button onClick={onClose} className="drawer-close-btn">✕</button>
        </div>

        {/* Projected Podium Top 3 Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.15fr 1fr',
            gap: '0.85rem',
            alignItems: 'end',
            marginBottom: '1.5rem',
          }}
        >
          {/* Silver #2 */}
          {podiumTop5[1] && (
            <div
              style={{
                background: 'linear-gradient(180deg, rgba(148, 163, 184, 0.15), rgba(15, 23, 42, 0.4))',
                border: '1px solid #94a3b8',
                borderRadius: '12px',
                padding: '1rem',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.8rem' }}>🥈</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>PROJECTED SILVER</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, marginTop: '0.2rem' }}>
                {podiumTop5[1].name}
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                {podiumTop5[1].score} pts
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                BH-C1: {podiumTop5[1].tieBreaks.buchholzCut1}
              </div>
            </div>
          )}

          {/* Gold #1 */}
          {podiumTop5[0] && (
            <div
              style={{
                background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.25), rgba(15, 23, 42, 0.5))',
                border: '2px solid var(--accent-gold)',
                borderRadius: '14px',
                padding: '1.25rem 1rem',
                textAlign: 'center',
                boxShadow: '0 0 25px rgba(245, 158, 11, 0.3)',
              }}
            >
              <div style={{ fontSize: '2.4rem' }}>🏆</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-gold)' }}>PROJECTED CHAMPION</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, marginTop: '0.25rem' }}>
                {podiumTop5[0].name}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-gold)', marginTop: '0.25rem' }}>
                {podiumTop5[0].score} pts
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                BH-C1: {podiumTop5[0].tieBreaks.buchholzCut1} • Wins: {podiumTop5[0].roundsWon}
              </div>
            </div>
          )}

          {/* Bronze #3 */}
          {podiumTop5[2] && (
            <div
              style={{
                background: 'linear-gradient(180deg, rgba(217, 119, 6, 0.15), rgba(15, 23, 42, 0.4))',
                border: '1px solid #b45309',
                borderRadius: '12px',
                padding: '1rem',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.8rem' }}>🥉</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706' }}>PROJECTED BRONZE</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, marginTop: '0.2rem' }}>
                {podiumTop5[2].name}
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                {podiumTop5[2].score} pts
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                BH-C1: {podiumTop5[2].tieBreaks.buchholzCut1}
              </div>
            </div>
          )}
        </div>

        {/* Top Boards Hypothetical Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>
            Simulate Outcomes on Top Boards (Round {currentRound}):
          </div>
          {Object.keys(hypoMap).length > 0 && (
            <button onClick={handleReset} className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}>
              ↺ Reset Simulations
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '260px', overflowY: 'auto' }}>
          {topBoards.map((b) => {
            const white = playerMap.get(b.whitePlayerId);
            const black = b.blackPlayerId ? playerMap.get(b.blackPlayerId) : null;
            const currentResult = hypoMap[b.boardNumber] || b.result;

            return (
              <div
                key={b.boardNumber}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.65rem 0.9rem',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                }}
              >
                <div style={{ fontSize: '0.85rem' }}>
                  <span className="badge badge-muted" style={{ marginRight: '0.5rem' }}>#{b.boardNumber}</span>
                  <strong>{white?.name}</strong> ({white?.score}) vs <strong>{black?.name || 'BYE'}</strong> ({black?.score})
                </div>

                {/* 3 Outcome Buttons */}
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    onClick={() => handleSetHypo(b.boardNumber, 'WHITE_WIN')}
                    className={`btn ${currentResult === 'WHITE_WIN' ? 'btn-accent' : 'btn-outline'}`}
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                  >
                    1 - 0 (White)
                  </button>
                  <button
                    onClick={() => handleSetHypo(b.boardNumber, 'DRAW')}
                    className={`btn ${currentResult === 'DRAW' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                  >
                    ½ - ½ (Draw)
                  </button>
                  <button
                    onClick={() => handleSetHypo(b.boardNumber, 'BLACK_WIN')}
                    className={`btn ${currentResult === 'BLACK_WIN' ? 'btn-accent' : 'btn-outline'}`}
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                  >
                    0 - 1 (Black)
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Close Simulator
          </button>
        </div>
      </div>
    </div>
  );
};
