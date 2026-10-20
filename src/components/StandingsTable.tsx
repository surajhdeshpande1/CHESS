import React, { useState } from 'react';
import { Trophy, Search, Medal, ArrowUpDown, Info } from 'lucide-react';
import { calculateTournamentStandings } from '../engine/tiebreaks';
import { Player, PlayerStanding, Tournament } from '../types/chess';

interface StandingsTableProps {
  tournament: Tournament;
  onOpenPlayerCard: (player: Player) => void;
}

export const StandingsTable: React.FC<StandingsTableProps> = ({
  tournament,
  onOpenPlayerCard,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const standings = calculateTournamentStandings(tournament.players, tournament.settings);

  const filteredStandings = standings.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.tpn.toString().includes(searchTerm) ||
      s.federation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const playerMap = new Map<number, Player>();
  for (const p of tournament.players) {
    playerMap.set(p.tpn, p);
  }

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.5rem 1.25rem' }}>
      {/* Header and Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Trophy size={20} color="var(--accent-gold)" />
            Official Standings (FIDE C.07 Regulations)
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Tie-Break Priority: {tournament.settings.tieBreaks.join(' → ')}
          </p>
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by name, TPN, fed..."
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

      {/* Standings Table */}
      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(13, 21, 39, 0.7)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              <th style={{ padding: '0.75rem 0.75rem', width: '60px', textAlign: 'center' }}>Rk</th>
              <th style={{ padding: '0.75rem 0.5rem', width: '50px' }}>TPN</th>
              <th style={{ padding: '0.75rem 1rem' }}>Player Name</th>
              <th style={{ padding: '0.75rem 0.5rem', width: '60px' }}>Title</th>
              <th style={{ padding: '0.75rem 0.5rem', width: '50px' }}>Fed</th>
              <th style={{ padding: '0.75rem 0.75rem', width: '70px', textAlign: 'right' }}>Rtg</th>
              <th style={{ padding: '0.75rem 1rem', width: '80px', textAlign: 'center', color: 'var(--accent-gold)' }}>Pts</th>
              <th style={{ padding: '0.75rem 0.75rem', width: '85px', textAlign: 'right' }}>BH-C1</th>
              <th style={{ padding: '0.75rem 0.75rem', width: '85px', textAlign: 'right' }}>BH-Tot</th>
              <th style={{ padding: '0.75rem 0.75rem', width: '85px', textAlign: 'right' }}>SB</th>
              <th style={{ padding: '0.75rem 0.75rem', width: '60px', textAlign: 'center' }}>Wins</th>
              <th style={{ padding: '0.75rem 0.75rem', width: '60px', textAlign: 'center' }}>Col</th>
            </tr>
          </thead>
          <tbody>
            {filteredStandings.map((standing) => {
              const player = playerMap.get(standing.tpn);
              const isPodium = standing.rank <= 3;
              const medalColor =
                standing.rank === 1 ? '#f59e0b' : standing.rank === 2 ? '#94a3b8' : '#b45309';

              return (
                <tr
                  key={standing.tpn}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    background: standing.rank === 1 ? 'rgba(245, 158, 11, 0.05)' : 'transparent',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    if (player) onOpenPlayerCard(player);
                  }}
                  title="Click to view detailed round-by-round card"
                >
                  {/* Rank */}
                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', fontWeight: 700 }}>
                    {isPodium ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: medalColor }}>
                        <Medal size={15} />
                        {standing.rank}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {standing.rank}
                      </span>
                    )}
                  </td>

                  {/* TPN */}
                  <td style={{ padding: '0.65rem 0.5rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                    #{standing.tpn}
                  </td>

                  {/* Name */}
                  <td style={{ padding: '0.65rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {standing.name}
                  </td>

                  {/* Title */}
                  <td style={{ padding: '0.65rem 0.5rem' }}>
                    {standing.title !== 'None' ? (
                      <span className="badge badge-gold" style={{ fontSize: '0.68rem', padding: '0.1rem 0.35rem' }}>
                        {standing.title}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>-</span>
                    )}
                  </td>

                  {/* Fed */}
                  <td style={{ padding: '0.65rem 0.5rem' }}>
                    <span className="badge badge-muted" style={{ fontSize: '0.65rem' }}>
                      {standing.federation}
                    </span>
                  </td>

                  {/* Rating */}
                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {standing.rating || 'unr.'}
                  </td>

                  {/* Total Score */}
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center', fontWeight: 800, fontSize: '0.95rem', color: 'var(--accent-gold)', fontFamily: 'var(--font-mono)' }}>
                    {standing.score.toFixed(1)}
                  </td>

                  {/* BH-C1 */}
                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                    {standing.tieBreaks.BH_C1.toFixed(1)}
                  </td>

                  {/* BH Total */}
                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {standing.tieBreaks.BH.toFixed(1)}
                  </td>

                  {/* Sonneborn-Berger */}
                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {standing.tieBreaks.SB.toFixed(2)}
                  </td>

                  {/* Wins */}
                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                    {standing.tieBreaks.WIN}
                  </td>

                  {/* Color Balance */}
                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                    <span style={{
                      color: standing.colorBalance > 0 ? '#60a5fa' : standing.colorBalance < 0 ? '#fb7185' : 'var(--text-muted)',
                    }}>
                      {standing.colorBalance > 0 ? `+${standing.colorBalance}` : standing.colorBalance}
                    </span>
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
