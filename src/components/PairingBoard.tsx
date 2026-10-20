import React, { useState } from 'react';
import {
  ArrowLeftRight,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Sparkles,
  Info,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { BoardPairing, ByeAllocation, GameResult, Player, Round, Tournament } from '../types/chess';
import { validatePair } from '../engine/fideCriteria';

interface PairingBoardProps {
  tournament: Tournament;
  round: Round | undefined;
  onSetResult: (boardNumber: number, result: GameResult) => void;
  onFlipColors: (boardNumber: number) => void;
  onSwapPlayers: (board1: number, player1IsWhite: boolean, board2: number, player2IsWhite: boolean) => void;
  onAutoSimulateResults: () => void;
  onOpenPlayerCard: (player: Player) => void;
}

export const PairingBoard: React.FC<PairingBoardProps> = ({
  tournament,
  round,
  onSetResult,
  onFlipColors,
  onSwapPlayers,
  onAutoSimulateResults,
  onOpenPlayerCard,
}) => {
  const [selectedSwapSlot, setSelectedSwapSlot] = useState<{
    boardNumber: number;
    isWhite: boolean;
    player: Player;
  } | null>(null);

  if (!round || !round.isPaired) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          fontSize: '2rem',
          color: 'var(--accent-gold)',
        }}>
          ♟
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Round {tournament.currentRound} Not Paired Yet
        </h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
          Ensure all players are checked in, then click "Pair Round {tournament.currentRound}" to execute the FIDE Dutch C.04.3 Blossom graph matching engine.
        </p>
      </div>
    );
  }

  const playerMap = new Map<number, Player>();
  for (const p of tournament.players) {
    playerMap.set(p.tpn, p);
  }

  const handleSlotClickForSwap = (boardNumber: number, isWhite: boolean, player: Player) => {
    if (!selectedSwapSlot) {
      setSelectedSwapSlot({ boardNumber, isWhite, player });
    } else {
      if (
        selectedSwapSlot.boardNumber === boardNumber &&
        selectedSwapSlot.isWhite === isWhite
      ) {
        setSelectedSwapSlot(null); // Cancel selection
      } else {
        // Execute swap
        onSwapPlayers(
          selectedSwapSlot.boardNumber,
          selectedSwapSlot.isWhite,
          boardNumber,
          isWhite
        );
        setSelectedSwapSlot(null);
      }
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.5rem 1.25rem' }}>
      {/* Board Controls & Arbiter Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            Round {round.roundNumber} Pairings & Results
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {round.pairings.length} Boards • {round.byes.length} Byes • FIDE C.04.3 Quality Verified
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {selectedSwapSlot && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid var(--accent-gold)',
              padding: '0.35rem 0.75rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              color: 'var(--accent-gold)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <span>Swap selected: Board {selectedSwapSlot.boardNumber} ({selectedSwapSlot.isWhite ? 'White' : 'Black'}: {selectedSwapSlot.player.name})</span>
              <button
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                onClick={() => setSelectedSwapSlot(null)}
              >
                ✕ Cancel
              </button>
            </div>
          )}

          <button
            className="btn btn-secondary"
            onClick={onAutoSimulateResults}
            title="Automatically simulate realistic FIDE master game results for uncompleted boards"
          >
            <Sparkles size={15} color="var(--accent-gold)" />
            Simulate Results
          </button>
        </div>
      </div>

      {/* Main Boards Table */}
      <div className="glass-panel" style={{ overflowX: 'auto', marginBottom: '2rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(13, 21, 39, 0.7)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              <th style={{ padding: '0.75rem 1rem', width: '60px' }}>Bd</th>
              <th style={{ padding: '0.75rem 1rem' }}>White Player</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'center', width: '220px' }}>Result</th>
              <th style={{ padding: '0.75rem 1rem' }}>Black Player</th>
              <th style={{ padding: '0.75rem 1rem', width: '90px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {round.pairings.map((pairing) => {
              const white = playerMap.get(pairing.whiteTpn);
              const black = playerMap.get(pairing.blackTpn);
              if (!white || !black) return null;

              const validation = validatePair(white, black, round.roundNumber);
              const isWhiteSelected =
                selectedSwapSlot?.boardNumber === pairing.boardNumber &&
                selectedSwapSlot?.isWhite === true;
              const isBlackSelected =
                selectedSwapSlot?.boardNumber === pairing.boardNumber &&
                selectedSwapSlot?.isWhite === false;

              return (
                <tr
                  key={pairing.boardNumber}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    transition: 'background-color 0.15s ease',
                    background: pairing.result !== '*' ? 'rgba(16, 185, 129, 0.03)' : 'transparent',
                  }}
                >
                  {/* Board Number */}
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--accent-gold)', fontFamily: 'var(--font-mono)' }}>
                    {pairing.boardNumber}
                  </td>

                  {/* White Player */}
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div
                      style={{
                        cursor: 'pointer',
                        padding: '0.35rem 0.5rem',
                        borderRadius: '6px',
                        border: isWhiteSelected ? '2px dashed var(--accent-gold)' : '1px solid transparent',
                        background: isWhiteSelected ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                      }}
                      onClick={() => handleSlotClickForSwap(pairing.boardNumber, true, white)}
                      title="Click to swap this player with another board"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{
                          display: 'inline-block',
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          background: '#fff',
                          border: '1px solid #ccc',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                          flexShrink: 0,
                        }} />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          #{white.tpn}
                        </span>
                        {white.title !== 'None' && (
                          <span className="badge badge-gold" style={{ fontSize: '0.7rem', padding: '0.1rem 0.35rem' }}>
                            {white.title}
                          </span>
                        )}
                        <span
                          style={{ fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenPlayerCard(white);
                          }}
                        >
                          {white.name}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          ({white.rating || 'unrated'})
                        </span>
                        <span className="badge badge-muted" style={{ fontSize: '0.65rem' }}>
                          {white.federation}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'flex', gap: '0.75rem' }}>
                        <span>Pts: <strong style={{ color: 'var(--text-primary)' }}>{white.score}</strong></span>
                        <span>Pref: <code style={{ color: 'var(--accent-gold)' }}>{white.colorPreference}</code></span>
                        <span>Diff: <code style={{ color: white.colorDifference > 0 ? '#60a5fa' : white.colorDifference < 0 ? '#fb7185' : 'inherit' }}>{white.colorDifference > 0 ? `+${white.colorDifference}` : white.colorDifference}</code></span>
                      </div>
                    </div>
                  </td>

                  {/* Result Buttons */}
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button
                        className={`btn ${pairing.result === '1-0' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', minWidth: '46px' }}
                        onClick={() => onSetResult(pairing.boardNumber, '1-0')}
                      >
                        1 - 0
                      </button>

                      <button
                        className={`btn ${pairing.result === '1/2-1/2' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', minWidth: '46px' }}
                        onClick={() => onSetResult(pairing.boardNumber, '1/2-1/2')}
                      >
                        ½ - ½
                      </button>

                      <button
                        className={`btn ${pairing.result === '0-1' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', minWidth: '46px' }}
                        onClick={() => onSetResult(pairing.boardNumber, '0-1')}
                      >
                        0 - 1
                      </button>

                      <select
                        style={{
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-muted)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '6px',
                          padding: '0.35rem 0.35rem',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                        }}
                        value={['+ -', '- +', '- -'].includes(pairing.result) ? pairing.result : ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            onSetResult(pairing.boardNumber, e.target.value as GameResult);
                          }
                        }}
                      >
                        <option value="">More...</option>
                        <option value="+ -">+ - (White Forfeit Win)</option>
                        <option value="- +">- + (Black Forfeit Win)</option>
                        <option value="- -">- - (Double Forfeit)</option>
                        <option value="*">* (Reset Result)</option>
                      </select>
                    </div>

                    {/* Violation alerts if any */}
                    {validation.violations.length > 0 && (
                      <div style={{ marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'center' }}>
                        {validation.violations.map((v, i) => (
                          <span key={i} className="badge badge-rose" style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem' }}>
                            <ShieldAlert size={12} />
                            {v}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* Black Player */}
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div
                      style={{
                        cursor: 'pointer',
                        padding: '0.35rem 0.5rem',
                        borderRadius: '6px',
                        border: isBlackSelected ? '2px dashed var(--accent-gold)' : '1px solid transparent',
                        background: isBlackSelected ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                      }}
                      onClick={() => handleSlotClickForSwap(pairing.boardNumber, false, black)}
                      title="Click to swap this player with another board"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{
                          display: 'inline-block',
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          background: '#1e293b',
                          border: '1px solid #475569',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
                          flexShrink: 0,
                        }} />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          #{black.tpn}
                        </span>
                        {black.title !== 'None' && (
                          <span className="badge badge-gold" style={{ fontSize: '0.7rem', padding: '0.1rem 0.35rem' }}>
                            {black.title}
                          </span>
                        )}
                        <span
                          style={{ fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenPlayerCard(black);
                          }}
                        >
                          {black.name}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          ({black.rating || 'unrated'})
                        </span>
                        <span className="badge badge-muted" style={{ fontSize: '0.65rem' }}>
                          {black.federation}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'flex', gap: '0.75rem' }}>
                        <span>Pts: <strong style={{ color: 'var(--text-primary)' }}>{black.score}</strong></span>
                        <span>Pref: <code style={{ color: 'var(--accent-gold)' }}>{black.colorPreference}</code></span>
                        <span>Diff: <code style={{ color: black.colorDifference > 0 ? '#60a5fa' : black.colorDifference < 0 ? '#fb7185' : 'inherit' }}>{black.colorDifference > 0 ? `+${black.colorDifference}` : black.colorDifference}</code></span>
                      </div>
                    </div>
                  </td>

                  {/* Actions (Flip color) */}
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    <button
                      className="btn btn-outline"
                      style={{ padding: '0.35rem 0.5rem' }}
                      title="Flip colors (White <-> Black)"
                      onClick={() => onFlipColors(pairing.boardNumber)}
                    >
                      <ArrowLeftRight size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Byes Section */}
      {round.byes.length > 0 && (
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={16} color="var(--accent-gold)" />
            Byes & Unpaired Players ({round.byes.length})
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {round.byes.map((b) => {
              const p = playerMap.get(b.playerTpn);
              if (!p) return null;
              return (
                <div
                  key={b.playerTpn}
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
                      Rating: {p.rating} • Score: {p.score}
                    </div>
                  </div>
                  <div>
                    <span className={`badge ${b.type === 'PAB' ? 'badge-emerald' : 'badge-gold'}`}>
                      {b.type === 'PAB' ? 'PAB (+1.0)' : b.type === 'HPB' ? 'HPB (+0.5)' : 'ZPB (+0.0)'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
