import React, { useEffect } from 'react';
import { HelpCircle, CheckCircle } from 'lucide-react';
import { BoardPairing, CandidatePlayer, Color } from '../lib/fideSwissEngine';
import { explainBoardPairing, PairingXRayExplanation } from '../lib/tournamentVaultAndFeatures';

interface PairingXRayModalProps {
  isOpen: boolean;
  onClose: () => void;
  board: BoardPairing | null;
  players: CandidatePlayer[];
  topSeedInitialColor: Color;
}

export const PairingXRayModal: React.FC<PairingXRayModalProps> = ({
  isOpen,
  onClose,
  board,
  players,
  topSeedInitialColor,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !board) return null;

  const explanation: PairingXRayExplanation = explainBoardPairing(board, players, topSeedInitialColor);
  const playerMap = new Map(players.map((p) => [p.id, p]));
  const white = playerMap.get(board.whitePlayerId);
  const black = board.blackPlayerId ? playerMap.get(board.blackPlayerId) : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy-deep)', fontFamily: 'var(--font-heading)' }}>
              FIDE Pairing X-Ray Explainer
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Plain-English mathematical transparency for Board #{board.boardNumber}
            </p>
          </div>
          <button onClick={onClose} className="drawer-close-btn">✕</button>
        </div>

        {/* Board Headline Banner */}
        <div
          className="clean-card"
          style={{
            padding: '1rem',
            background: 'var(--bg-secondary)',
            marginBottom: '1.25rem',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.72rem', color: 'var(--navy-royal)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Official Dutch C.04.3 Bracket Selection
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--navy-deep)', marginTop: '0.25rem' }}>
            {explanation.headline}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '0.45rem', fontSize: '0.82rem' }}>
            <span>♔ <strong>{white?.name}</strong> ({white?.rating || 'Unrated'}, {white?.score} pts)</span>
            {black && <span>♚ <strong>{black.name}</strong> ({black.rating || 'Unrated'}, {black.score} pts)</span>}
          </div>
        </div>

        {/* Explanation Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '6px',
              background: 'var(--navy-light)',
              border: '1px solid #bfdbfe',
            }}
          >
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--navy-royal)', marginBottom: '0.25rem' }}>
              1. WHY THESE TWO CANDIDATES WERE PAIRED:
            </div>
            <div style={{ fontSize: '0.82rem', lineHeight: 1.5, color: 'var(--navy-deep)' }}>
              {explanation.bracketReason}
            </div>
          </div>

          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '6px',
              background: 'var(--green-light)',
              border: '1px solid var(--green-border)',
            }}
          >
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--green-deep)', marginBottom: '0.25rem' }}>
              2. WHY WHITE PIECES (♔) WERE ALLOCATED:
            </div>
            <div style={{ fontSize: '0.82rem', lineHeight: 1.5, color: 'var(--green-deep)' }}>
              {explanation.colorReason}
            </div>
          </div>

          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '6px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--navy-border-subtle)',
            }}
          >
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--navy-deep)', marginBottom: '0.25rem' }}>
              3. OFFICIAL FIDE HANDBOOK CITATIONS:
            </div>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {explanation.fideRuleCitations.map((cit, idx) => (
                <li key={idx}><strong>{cit}</strong></li>
              ))}
            </ul>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
          <button onClick={onClose} className="btn btn-navy">
            Close Explainer
          </button>
        </div>
      </div>
    </div>
  );
};
