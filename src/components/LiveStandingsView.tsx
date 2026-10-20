import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Search, Trophy, TrendingUp, TrendingDown, Eye } from 'lucide-react';
import { CandidatePlayer, TournamentState } from '../lib/fideSwissEngine';
import { PlayerMatchDetailsModal } from './PlayerMatchDetailsModal';
import { AgeCategoryWinnersView } from './AgeCategoryWinnersView';

interface LiveStandingsViewProps {
  tournament: TournamentState;
  onOpenPrizes?: () => void;
  onOpenCertificates?: () => void;
  onProceedToNextRound?: () => void;
  onGoBack?: () => void;
}

export const LiveStandingsView: React.FC<LiveStandingsViewProps> = ({
  tournament,
  onOpenPrizes,
  onProceedToNextRound,
  onGoBack,
}) => {
  const [standingsTab, setStandingsTab] = useState<'OPEN' | 'AGE_CATEGORIES'>('OPEN');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<CandidatePlayer | null>(null);

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
      p.organization.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.fideId && p.fideId.toLowerCase().includes(searchTerm.toLowerCase()))
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
            Click on any player to inspect who they played against, piece colors, and board-by-board outcomes.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {onGoBack && (
            <button
              type="button"
              onClick={onGoBack}
              className="btn btn-secondary-white"
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem', fontWeight: 600 }}
              title="Return to Active Round Matches"
            >
              <ArrowLeft size={14} />
              <span>Back to Matches</span>
            </button>
          )}

          {onOpenPrizes && (
            <button
              type="button"
              onClick={onOpenPrizes}
              className="btn btn-secondary-white"
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem', fontWeight: 700, gap: '0.4rem' }}
              title="Open Official Prize Allocation & Age-Category Podiums"
            >
              <Trophy size={14} color="#b45309" />
              <span>Prizes & Trophies</span>
            </button>
          )}

          {standingsTab === 'OPEN' && (
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
                placeholder="Search player or FIDE ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', paddingLeft: '2rem', paddingRight: '0.75rem', fontSize: '0.8rem' }}
              />
            </div>
          )}

          {onProceedToNextRound && tournament.status === 'IN_PROGRESS' && (
            <button
              type="button"
              onClick={onProceedToNextRound}
              className="btn btn-primary-green"
              style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}
            >
              <span>Next Round Matches</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Segmented View Switcher: Overall Open Standings vs Age-Category Live Podiums */}
      <div
        style={{
          display: 'inline-flex',
          background: 'var(--bg-subtle, #f1f5f9)',
          padding: '0.25rem',
          borderRadius: '8px',
          border: '1px solid var(--navy-border-light, #e2e8f0)',
          marginBottom: '1.25rem',
          gap: '0.25rem',
        }}
      >
        <button
          type="button"
          onClick={() => setStandingsTab('OPEN')}
          style={{
            padding: '0.45rem 0.95rem',
            borderRadius: '6px',
            border: 'none',
            fontSize: '0.82rem',
            fontWeight: standingsTab === 'OPEN' ? 800 : 600,
            background: standingsTab === 'OPEN' ? 'var(--navy-deep, #0a192f)' : 'transparent',
            color: standingsTab === 'OPEN' ? '#ffffff' : 'var(--text-muted, #64748b)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          📊 Overall Open Standings ({tournament.players.length})
        </button>

        <button
          type="button"
          onClick={() => setStandingsTab('AGE_CATEGORIES')}
          style={{
            padding: '0.45rem 0.95rem',
            borderRadius: '6px',
            border: 'none',
            fontSize: '0.82rem',
            fontWeight: standingsTab === 'AGE_CATEGORIES' ? 800 : 600,
            background: standingsTab === 'AGE_CATEGORIES' ? 'var(--navy-deep, #0a192f)' : 'transparent',
            color: standingsTab === 'AGE_CATEGORIES' ? '#ffffff' : 'var(--text-muted, #64748b)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          🧒 Age-Category Live Podiums (U-9 to U-19)
        </button>
      </div>

      {standingsTab === 'AGE_CATEGORIES' ? (
        <AgeCategoryWinnersView tournament={tournament} />
      ) : (
        <>
          {/* Helpful Hint banner */}
          <div
            style={{
              background: 'rgba(30, 58, 138, 0.05)',
              border: '1px solid rgba(30, 58, 138, 0.15)',
              borderRadius: '8px',
              padding: '0.5rem 0.85rem',
              fontSize: '0.78rem',
              color: 'var(--navy-royal)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '1rem',
            }}
          >
            <span style={{ fontSize: '1rem' }}>💡</span>
            <span>
              <strong>Interactive Player Dossiers:</strong> Tap or click any player row below to reveal their full match breakdown — including opponent seeds, FIDE IDs, piece colors, game scores, and tie-break details.
            </span>
          </div>

          {/* Official Standings Table with Sticky Column */}
          <div className="card-clean" style={{ padding: '0.35rem', overflowX: 'auto' }}>
        <table className="table-minimal">
          <thead>
            <tr>
              <th className="table-sticky-col-rank" style={{ width: '45px', textAlign: 'center' }}>Rk</th>
              <th style={{ width: '45px' }}>#</th>
              <th className="table-sticky-col-name">Candidate Player & FIDE ID</th>
              <th style={{ width: '60px' }}>Title</th>
              <th style={{ width: '80px', textAlign: 'right' }}>FIDE Elo</th>
              <th style={{ width: '65px', textAlign: 'center' }}>Pts</th>
              <th style={{ width: '75px', textAlign: 'right' }}>BH-C1</th>
              <th style={{ width: '75px', textAlign: 'right' }}>BH-Tot</th>
              <th style={{ width: '75px', textAlign: 'right' }}>SB</th>
              <th style={{ width: '55px', textAlign: 'center' }}>Wins</th>
              <th style={{ width: '85px', textAlign: 'right' }}>Perf (Rp)</th>
              <th style={{ width: '80px', textAlign: 'right' }}>ΔR (Elo)</th>
              <th style={{ width: '70px', textAlign: 'center' }}>Details</th>
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
              const fideDisplay = player.fideId && player.fideId.toLowerCase() !== 'unranked'
                ? player.fideId
                : 'Unranked';

              return (
                <tr
                  key={player.id}
                  onClick={() => setSelectedPlayer(player)}
                  style={{
                    background: isLeader ? 'var(--green-tint)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  className="hover-highlight"
                  title={`Click to view ${player.name}'s complete match history`}
                >
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--navy-deep)' }}>
                        {player.name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', flexWrap: 'wrap' }}>
                      {player.organization && <span>{player.organization}</span>}
                      <span>•</span>
                      <span>
                        FIDE ID: {fideDisplay === 'Unranked' ? (
                          <span className="badge-minimal badge-muted" style={{ padding: '0 4px', fontSize: '0.62rem' }}>Unranked</span>
                        ) : (
                          <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--navy-deep)' }}>{fideDisplay}</strong>
                        )}
                      </span>
                    </div>
                  </td>
                  <td>
                    {player.title !== 'NONE' ? (
                      <span className="badge-minimal badge-navy">{player.title}</span>
                    ) : (
                      <span style={{ color: 'var(--text-light)' }}>—</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {player.rating > 0 ? player.rating : <span style={{ color: 'var(--text-muted)' }}>Unranked</span>}
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
                  <td style={{ textAlign: 'center' }}>
                    <span
                      style={{
                        background: 'var(--bg-secondary)',
                        color: 'var(--navy-royal)',
                        border: '1px solid var(--navy-border-light)',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        display: 'inline-block',
                      }}
                    >
                      Dossier ↗
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  )}

      {/* Interactive Match Details Modal */}
      <PlayerMatchDetailsModal
        isOpen={selectedPlayer !== null}
        onClose={() => setSelectedPlayer(null)}
        player={selectedPlayer}
        tournament={tournament}
        onSelectAnotherPlayer={(another) => setSelectedPlayer(another)}
      />
    </div>
  );
};
