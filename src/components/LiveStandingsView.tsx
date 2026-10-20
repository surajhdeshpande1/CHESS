import React, { useState } from 'react';
import { ArrowRight, Search, Trophy, TrendingUp, TrendingDown } from 'lucide-react';
import { TournamentState } from '../lib/fideSwissEngine';

interface LiveStandingsViewProps {
  tournament: TournamentState;
  onOpenPrizes?: () => void;
  onOpenCertificates?: () => void;
  onProceedToNextRound?: () => void;
}

export const LiveStandingsView: React.FC<LiveStandingsViewProps> = ({
  tournament,
  onProceedToNextRound,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const sortedPlayers = [...tournament.players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.tieBreaks.directEncounter !== a.tieBreaks.directEncounter)
      return b.tieBreaks.directEncounter - a.tieBreaks.directEncounter;
    if (b.tieBreaks.buchholzCut1 !== a.tieBreaks.buchholzCut1)
      return b.tieBreaks.buchholzCut1 - a.tieBreaks.buchholzCut1;
    if (b.tieBreaks.buchholzTotal !== a.tieBreaks.buchholzTotal)
      return b.tieBreaks.buchholzTotal - a.tieBreaks.buchholzTotal;
    if (b.tieBreaks.sonnebornBerger !== a.tieBreaks.sonnebornBerger)
      return b.tieBreaks.sonnebornBerger - a.tieBreaks.sonnebornBerger;
    if (b.tieBreaks.mostWins !== a.tieBreaks.mostWins)
      return b.tieBreaks.mostWins - a.tieBreaks.mostWins;
    return a.tpn - b.tpn;
  });

  const filteredPlayers = sortedPlayers.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.organization.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="app-container" style={{ paddingTop: '1.25rem', paddingBottom: '2.5rem' }}>
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span className="badge-minimal badge-navy" style={{ fontWeight: 800 }}>
              FIDE HANDBOOK C.07 RANKINGS
            </span>
            <span className="badge-minimal badge-green">
              LIVE TIE-BREAK ENGINE
            </span>
          </div>
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: 'var(--navy-deep)',
              fontFamily: 'var(--font-heading)',
              letterSpacing: '0.03em',
            }}
          >
            Championship Standings & FIDE Rating Performance
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', fontFamily: 'var(--font-sans)', marginTop: '0.2rem' }}>
            Live calculations: Buchholz Cut-1, Buchholz Total, Sonneborn-Berger, OTB Wins, and Live FIDE Rating Change (ΔR).
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{ position: 'relative', width: '220px' }}>
            <Search
              size={13}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Filter players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', paddingLeft: '2rem', paddingRight: '0.75rem', fontSize: '0.8rem' }}
            />
          </div>

          {onProceedToNextRound && tournament.status === 'IN_PROGRESS' && (
            <button
              type="button"
              onClick={onProceedToNextRound}
              className="btn btn-primary-navy"
              style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}
            >
              <span>Back to Live Pairings</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Main High-Precision Standings Table */}
      <div className="card-clean table-responsive-container" style={{ padding: '0.35rem' }}>
        <table className="table-minimal">
          <thead>
            <tr>
              <th className="table-sticky-col-rank" style={{ width: '45px', textAlign: 'center' }}>Rk</th>
              <th style={{ width: '45px' }}>#</th>
              <th className="table-sticky-col-name">Candidate Player</th>
              <th style={{ width: '60px' }}>Title</th>
              <th style={{ width: '75px', textAlign: 'right' }}>FIDE Elo</th>
              <th style={{ width: '65px', textAlign: 'center' }}>Pts</th>
              <th style={{ width: '75px', textAlign: 'right' }}>BH-C1</th>
              <th style={{ width: '75px', textAlign: 'right' }}>BH-Tot</th>
              <th style={{ width: '75px', textAlign: 'right' }}>SB</th>
              <th style={{ width: '55px', textAlign: 'center' }}>Wins</th>
              <th style={{ width: '85px', textAlign: 'right' }}>Perf (Rp)</th>
              <th style={{ width: '80px', textAlign: 'right' }}>ΔR (Elo)</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlayers.map((player, idx) => {
              const rank = idx + 1;
              const isLeader = rank === 1;
              const isPodium = rank <= 3;
              const ratingDelta = player.fideRatingChange ?? 0;
              const hasGain = ratingDelta > 0;
              const hasLoss = ratingDelta < 0;

              return (
                <tr key={player.id} style={{ background: isLeader ? 'var(--green-tint)' : 'transparent' }}>
                  <td
                    className="table-sticky-col-rank"
                    style={{
                      textAlign: 'center',
                      fontWeight: 800,
                      color: isLeader ? 'var(--green-deep)' : 'var(--navy-deep)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {rank}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    #{player.tpn}
                  </td>
                  <td className="table-sticky-col-name">
                    <div style={{ fontWeight: 600, color: 'var(--navy-deep)' }}>
                      {player.name}
                    </div>
                    {player.organization && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {player.organization}
                      </div>
                    )}
                  </td>
                  <td>
                    {player.title !== 'NONE' ? (
                      <span className="badge-minimal badge-navy">{player.title}</span>
                    ) : (
                      <span style={{ color: 'var(--text-light)' }}>—</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {player.rating || 'Unrated'}
                  </td>
                  <td
                    style={{
                      textAlign: 'center',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800,
                      fontSize: '0.92rem',
                      color: isLeader ? 'var(--green-deep)' : 'var(--navy-royal)',
                    }}
                  >
                    {player.score.toFixed(1)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {player.tieBreaks.buchholzCut1.toFixed(1)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {player.tieBreaks.buchholzTotal.toFixed(1)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {player.tieBreaks.sonnebornBerger.toFixed(2)}
                  </td>
                  <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {player.otbWins || player.roundsWon}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--navy-deep)' }}>
                    {player.performanceRating ? player.performanceRating : '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {hasGain ? (
                      <span className="chip-rating-gain">
                        +{ratingDelta.toFixed(1)}
                      </span>
                    ) : hasLoss ? (
                      <span className="chip-rating-loss">
                        {ratingDelta.toFixed(1)}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-light)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                        0.0
                      </span>
                    )}
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
