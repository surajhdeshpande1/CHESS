import React, { useState } from 'react';
import { Table, Search } from 'lucide-react';
import { calculateTournamentStandings } from '../engine/tiebreaks';
import { Player, Tournament } from '../types/chess';

interface CrosstableViewProps {
  tournament: Tournament;
  onOpenPlayerCard: (player: Player) => void;
}

export const CrosstableView: React.FC<CrosstableViewProps> = ({
  tournament,
  onOpenPlayerCard,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const standings = calculateTournamentStandings(tournament.players, tournament.settings);
  const playerMap = new Map<number, Player>();
  for (const p of tournament.players) {
    playerMap.set(p.tpn, p);
  }

  const filteredStandings = standings.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.5rem 1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Table size={20} color="var(--accent-gold)" />
            Official Crosstable Matrix (Swiss-Manager Grid)
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Cell format: Opponent TPN / Color (w/b) / Game Result
          </p>
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search crosstable..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '0.45rem 0.75rem 0.45rem 2rem',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
            }}
          />
        </div>
      </div>

      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(13, 21, 39, 0.7)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              <th style={{ padding: '0.75rem 0.6rem', width: '45px', textAlign: 'center' }}>Rk</th>
              <th style={{ padding: '0.75rem 0.5rem', width: '45px' }}>TPN</th>
              <th style={{ padding: '0.75rem 1rem', minWidth: '180px' }}>Player Name</th>
              <th style={{ padding: '0.75rem 0.5rem', width: '55px' }}>Title</th>
              <th style={{ padding: '0.75rem 0.5rem', width: '65px', textAlign: 'right' }}>Rtg</th>
              {Array.from({ length: tournament.settings.totalRounds }, (_, i) => i + 1).map((r) => (
                <th key={r} style={{ padding: '0.75rem 0.4rem', textAlign: 'center', width: '65px' }}>
                  R{r}
                </th>
              ))}
              <th style={{ padding: '0.75rem 0.75rem', width: '65px', textAlign: 'center', color: 'var(--accent-gold)' }}>Pts</th>
              <th style={{ padding: '0.75rem 0.75rem', width: '70px', textAlign: 'right' }}>BH-C1</th>
              <th style={{ padding: '0.75rem 0.75rem', width: '70px', textAlign: 'right' }}>SB</th>
            </tr>
          </thead>
          <tbody>
            {filteredStandings.map((s) => {
              const p = playerMap.get(s.tpn);
              if (!p) return null;

              return (
                <tr
                  key={s.tpn}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                  }}
                  onClick={() => onOpenPlayerCard(p)}
                  title="Click to view player card"
                >
                  <td style={{ padding: '0.6rem 0.6rem', textAlign: 'center', fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                    {s.rank}
                  </td>
                  <td style={{ padding: '0.6rem 0.5rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                    #{s.tpn}
                  </td>
                  <td style={{ padding: '0.6rem 1rem', fontWeight: 600 }}>
                    {s.name}
                  </td>
                  <td style={{ padding: '0.6rem 0.5rem' }}>
                    {s.title !== 'None' ? (
                      <span className="badge badge-gold" style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem' }}>
                        {s.title}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {s.rating || 'unr.'}
                  </td>

                  {/* Round columns */}
                  {Array.from({ length: tournament.settings.totalRounds }, (_, i) => i + 1).map((r) => {
                    const h = p.history.find((x) => x.round === r);
                    if (!h) {
                      return (
                        <td key={r} style={{ padding: '0.6rem 0.4rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          -
                        </td>
                      );
                    }

                    let resBadge = '';
                    let badgeColor = 'var(--text-muted)';
                    if (h.result === '1-0') {
                      resBadge = h.color === 'W' ? '1' : '0';
                      badgeColor = h.color === 'W' ? '#34d399' : '#fb7185';
                    } else if (h.result === '0-1') {
                      resBadge = h.color === 'B' ? '1' : '0';
                      badgeColor = h.color === 'B' ? '#34d399' : '#fb7185';
                    } else if (h.result === '1/2-1/2') {
                      resBadge = '½';
                      badgeColor = '#60a5fa';
                    } else if (h.result === 'PAB') {
                      resBadge = 'PAB';
                      badgeColor = '#34d399';
                    } else if (h.result === 'HPB') {
                      resBadge = 'HPB';
                      badgeColor = '#60a5fa';
                    } else if (h.result === 'ZPB') {
                      resBadge = 'ZPB';
                      badgeColor = '#94a3b8';
                    }

                    return (
                      <td key={r} style={{ padding: '0.5rem 0.3rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.2rem 0.35rem', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                            {h.opponentTpn ? `${h.opponentTpn}${h.color?.toLowerCase()}` : '-'}
                          </span>
                          <span style={{ display: 'block', fontWeight: 700, color: badgeColor }}>
                            {resBadge}
                          </span>
                        </div>
                      </td>
                    );
                  })}

                  {/* Total Pts */}
                  <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: 800, color: 'var(--accent-gold)', fontFamily: 'var(--font-mono)' }}>
                    {s.score.toFixed(1)}
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                    {s.tieBreaks.BH_C1.toFixed(1)}
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {s.tieBreaks.SB.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
