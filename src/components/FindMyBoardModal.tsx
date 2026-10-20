import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { TournamentState } from '../lib/fideSwissEngine';
import { findPlayerBoardInfo, PlayerBoardCardInfo } from '../lib/tournamentVaultAndFeatures';

interface FindMyBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: TournamentState;
}

export const FindMyBoardModal: React.FC<FindMyBoardModalProps> = ({
  isOpen,
  onClose,
  tournament,
}) => {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const currentRound = tournament.currentRound;
  const matchResults: PlayerBoardCardInfo[] = findPlayerBoardInfo(tournament, query);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--navy-deep)', fontFamily: 'var(--font-heading)' }}>
              Find My Board
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Round {currentRound} • Search by candidate name, FIDE ID, or TPN seed number
            </p>
          </div>
          <button onClick={onClose} className="drawer-close-btn">✕</button>
        </div>

        {/* Big Search Bar */}
        <div style={{ marginBottom: '1.25rem' }}>
          <input
            type="text"
            autoFocus
            placeholder="Type player name (e.g. Carlsen, Gukesh)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              border: '2px solid var(--navy-deep)',
              color: 'var(--navy-deep)',
              fontSize: '1rem',
              fontWeight: 600,
            }}
          />
        </div>

        {/* Results Stream */}
        <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {query.trim() === '' ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>♟</div>
              <div>Type a player name to look up assigned board number and piece color.</div>
            </div>
          ) : matchResults.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              No player found matching "{query}".
            </div>
          ) : (
            matchResults.map((item) => (
              <div
                key={item.player.id}
                className="clean-card"
                style={{
                  background: '#ffffff',
                  border: '2px solid var(--navy-royal)',
                  padding: '1.25rem',
                }}
              >
                {/* Board Number Big Banner */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        background: 'var(--navy-deep)',
                        color: '#ffffff',
                        fontWeight: 900,
                        fontSize: '1.3rem',
                        padding: '0.35rem 0.85rem',
                        borderRadius: '6px',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      BOARD {item.boardNumber}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>ROUND {item.roundNumber}</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy-deep)' }}>
                        Rank: #{item.currentRank} ({item.currentScore} pts)
                      </div>
                    </div>
                  </div>

                  <span
                    className={`badge ${
                      item.assignedColor === 'WHITE'
                        ? 'badge-navy'
                        : item.assignedColor === 'BLACK'
                        ? 'badge-subtle'
                        : 'badge-green'
                    }`}
                    style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}
                  >
                    {item.assignedColor === 'WHITE'
                      ? '♔ PLAYING WHITE'
                      : item.assignedColor === 'BLACK'
                      ? '♚ PLAYING BLACK'
                      : '★ 1.0 POINT BYE'}
                  </span>
                </div>

                {/* Candidate & Opponent Breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <div style={{ padding: '0.65rem', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>CANDIDATE</div>
                    <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--navy-deep)' }}>{item.player.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Rating: {item.player.rating || 'Unrated'} • Seed: #{item.player.tpn}
                    </div>
                  </div>

                  <div style={{ padding: '0.65rem', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>OPPONENT</div>
                    {item.opponent ? (
                      <>
                        <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--navy-deep)' }}>{item.opponent.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Rating: {item.opponent.rating || 'Unrated'} • Seed: #{item.opponent.tpn}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--green-deep)' }}>
                        Bye Awarded (+1.0)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
          <button onClick={onClose} className="btn btn-navy">
            Close Search
          </button>
        </div>
      </div>
    </div>
  );
};
