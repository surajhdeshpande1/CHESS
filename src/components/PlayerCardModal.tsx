import React from 'react';
import { X, Award, Shield, Compass, Calendar, ArrowRight } from 'lucide-react';
import { calculateVirtualOpponentScore, getPlayerOpponentEntries } from '../engine/tiebreaks';
import { Player, Tournament } from '../types/chess';

interface PlayerCardModalProps {
  player: Player | null;
  tournament: Tournament;
  onClose: () => void;
}

export const PlayerCardModal: React.FC<PlayerCardModalProps> = ({
  player,
  tournament,
  onClose,
}) => {
  if (!player) return null;

  const playerMap = new Map<number, Player>();
  for (const p of tournament.players) {
    playerMap.set(p.tpn, p);
  }

  const entries = getPlayerOpponentEntries(player, playerMap, tournament.settings.totalRounds);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '780px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '1.1rem', color: 'var(--accent-gold)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                #{player.tpn}
              </span>
              {player.title !== 'None' && <span className="badge badge-gold">{player.title}</span>}
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{player.name}</h2>
              <span className="badge badge-muted">{player.federation}</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              FIDE ID: {player.fideId || 'unregistered'} • Official Rating: <strong>{player.rating || 'unrated'}</strong>
            </p>
          </div>

          <button
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem' }}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {/* FIDE Status Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Score</span>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-gold)' }}>
              {player.score.toFixed(1)} pts
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Color Balance (CD)</span>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: player.colorDifference > 0 ? '#60a5fa' : player.colorDifference < 0 ? '#fb7185' : 'inherit' }}>
              {player.colorDifference > 0 ? `+${player.colorDifference}` : player.colorDifference}
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Color Preference</span>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-gold)', marginTop: '0.2rem' }}>
              <code>{player.colorPreference}</code>
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Topscorer Status</span>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '0.2rem' }}>
              {player.isTopscorer ? (
                <span className="badge badge-emerald">Topscorer</span>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>Standard</span>
              )}
            </div>
          </div>
        </div>

        {/* Round by Round Journey */}
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
          Round-by-Round Breakdown (FIDE C.07 Tie-Break Contributions)
        </h3>

        <div style={{ overflowX: 'auto', marginBottom: '1.25rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(13, 21, 39, 0.7)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.5rem', textAlign: 'center' }}>Rd</th>
                <th style={{ padding: '0.5rem' }}>Opponent</th>
                <th style={{ padding: '0.5rem', textAlign: 'center' }}>Color</th>
                <th style={{ padding: '0.5rem', textAlign: 'center' }}>Result</th>
                <th style={{ padding: '0.5rem', textAlign: 'center' }}>Pts</th>
                <th style={{ padding: '0.5rem', textAlign: 'right' }}>Opp Adj Score</th>
                <th style={{ padding: '0.5rem', textAlign: 'center' }}>Virtual Opponent</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const roundData = player.history.find((h) => h.round === entry.round);
                const opp = roundData?.opponentTpn ? playerMap.get(roundData.opponentTpn) : null;

                return (
                  <tr key={entry.round} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 700 }}>
                      R{entry.round}
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      {opp ? (
                        <span>#{opp.tpn} {opp.name} ({opp.rating})</span>
                      ) : (
                        <span style={{ color: 'var(--accent-gold)' }}>[Unplayed Round / Bye]</span>
                      )}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                      {roundData?.color ? (
                        <span style={{
                          display: 'inline-block',
                          width: '14px',
                          height: '14px',
                          borderRadius: '3px',
                          background: roundData.color === 'W' ? '#fff' : '#1e293b',
                          border: '1px solid #666',
                        }} />
                      ) : '-'}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 700 }}>
                      {roundData?.result}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--accent-gold)' }}>
                      {roundData?.pointsAwarded.toFixed(1)}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      {entry.score.toFixed(2)}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                      {entry.isVirtual ? (
                        <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>
                          C.07 Virtual Opponent
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Real Opponent</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close Card
          </button>
        </div>
      </div>
    </div>
  );
};
