import React, { useState } from 'react';
import { BoardPairing, CandidatePlayer, GameResult, TournamentState } from '../lib/fideSwissEngine';

interface PlayerSelfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: TournamentState;
  onSubmitReport: (boardNumber: number, result: GameResult, reportedByPlayerId: string) => void;
}

export const PlayerSelfReportModal: React.FC<PlayerSelfReportModalProps> = ({
  isOpen,
  onClose,
  tournament,
  onSubmitReport,
}) => {
  const currentRound = tournament.currentRound;
  const currentBoards = tournament.rounds[currentRound - 1] || [];
  const playerMap = new Map(tournament.players.map((p) => [p.id, p]));

  const [selectedBoardNum, setSelectedBoardNum] = useState<number>(1);
  const [selectedResult, setSelectedResult] = useState<GameResult>('WHITE_WIN');

  if (!isOpen) return null;

  const currentBoard = currentBoards.find((b) => b.boardNumber === selectedBoardNum) || currentBoards[0];
  const white = currentBoard ? playerMap.get(currentBoard.whitePlayerId) : null;
  const black = currentBoard && currentBoard.blackPlayerId ? playerMap.get(currentBoard.blackPlayerId) : null;

  const handleSubmit = () => {
    if (!currentBoard || !white) return;
    const reportedId = selectedResult === 'WHITE_WIN' ? white.id : black ? black.id : white.id;
    onSubmitReport(currentBoard.boardNumber, selectedResult, reportedId);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.6rem' }}>📱</span>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Table QR-Code Self-Report Portal</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Players report from their seat • Arbiter confirms with 1 click
              </p>
            </div>
          </div>
          <button onClick={onClose} className="drawer-close-btn">✕</button>
        </div>

        {/* Board Selection */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
            Select Board / Table Number:
          </label>
          <select
            value={selectedBoardNum}
            onChange={(e) => setSelectedBoardNum(Number(e.target.value))}
            style={{
              width: '100%',
              padding: '0.65rem 0.9rem',
              borderRadius: '8px',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.9rem',
            }}
          >
            {currentBoards.map((b) => {
              const w = playerMap.get(b.whitePlayerId);
              const blk = b.blackPlayerId ? playerMap.get(b.blackPlayerId) : null;
              return (
                <option key={b.boardNumber} value={b.boardNumber}>
                  Board #{b.boardNumber}: {w?.name} vs {blk?.name || 'BYE'} ({b.result})
                </option>
              );
            })}
          </select>
        </div>

        {/* Board Visual Representation */}
        {currentBoard && (
          <div
            style={{
              padding: '1rem',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              marginBottom: '1.25rem',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 700 }}>
              ROUND {currentRound} • BOARD {currentBoard.boardNumber}
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '0.35rem' }}>
              ♔ {white?.name} (White) vs ♚ {black?.name || 'BYE'} (Black)
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Current Status: {currentBoard.result}
            </div>
          </div>
        )}

        {/* Choose Self-Reported Outcome */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.6rem' }}>
            Tap the Game Outcome to Report:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setSelectedResult('WHITE_WIN')}
              className={`btn ${selectedResult === 'WHITE_WIN' ? 'btn-accent' : 'btn-secondary'}`}
              style={{ flexDirection: 'column', padding: '0.85rem 0.5rem', gap: '0.25rem' }}
            >
              <span style={{ fontSize: '1.2rem' }}>♔ 1 - 0</span>
              <span style={{ fontSize: '0.75rem' }}>White Won</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedResult('DRAW')}
              className={`btn ${selectedResult === 'DRAW' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flexDirection: 'column', padding: '0.85rem 0.5rem', gap: '0.25rem' }}
            >
              <span style={{ fontSize: '1.2rem' }}>½ - ½</span>
              <span style={{ fontSize: '0.75rem' }}>Drawn Game</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedResult('BLACK_WIN')}
              className={`btn ${selectedResult === 'BLACK_WIN' ? 'btn-accent' : 'btn-secondary'}`}
              style={{ flexDirection: 'column', padding: '0.85rem 0.5rem', gap: '0.25rem' }}
            >
              <span style={{ fontSize: '1.2rem' }}>♚ 0 - 1</span>
              <span style={{ fontSize: '0.75rem' }}>Black Won</span>
            </button>
          </div>
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={onClose} className="btn btn-secondary mobile-full-btn">
            Cancel
          </button>
          <button onClick={handleSubmit} className="btn btn-primary mobile-full-btn">
            📲 Transmit Self-Report to Arbiter
          </button>
        </div>
      </div>
    </div>
  );
};
