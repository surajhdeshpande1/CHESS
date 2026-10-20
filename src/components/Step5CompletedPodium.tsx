import React, { useState } from 'react';
import { Download, Printer, RotateCcw, ArrowLeft } from 'lucide-react';
import { CandidatePlayer, TournamentState } from '../lib/fideSwissEngine';
import { PlayerMatchDetailsModal } from './PlayerMatchDetailsModal';

interface Step5CompletedPodiumProps {
  tournament: TournamentState;
  onExportTRF: () => void;
  onOpenPrint: () => void;
  onOpenPrizes?: () => void;
  onOpenCertificates?: () => void;
  onRestartNewTournament: () => void;
  onGoBack?: () => void;
}

export const Step5CompletedPodium: React.FC<Step5CompletedPodiumProps> = ({
  tournament,
  onExportTRF,
  onOpenPrint,
  onRestartNewTournament,
  onGoBack,
}) => {
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

  const champion = sortedPlayers[0];
  const runnerUp = sortedPlayers[1];
  const thirdPlace = sortedPlayers[2];

  return (
    <div className="app-container" style={{ paddingTop: '1.25rem', paddingBottom: '2.5rem' }}>
      {/* Header Banner */}
      <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.2rem 0.75rem',
            borderRadius: '20px',
            background: 'var(--green-tint)',
            border: '1px solid var(--green-border)',
            color: 'var(--green-deep)',
            fontSize: '0.72rem',
            fontWeight: 800,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: '0.5rem',
          }}
        >
          ✓ OFFICIAL FIDE CHAMPIONSHIP RESULTS
        </div>
        <h2
          style={{
            fontSize: '1.9rem',
            fontWeight: 800,
            color: 'var(--navy-deep)',
            fontFamily: 'var(--font-heading)',
            letterSpacing: '0.04em',
            marginBottom: '0.35rem',
          }}
        >
          {tournament.name || 'Swiss Championship'}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', maxWidth: '580px', margin: '0 auto 1.25rem' }}>
          All {tournament.totalRounds} rounds completed under FIDE Dutch C.04.3 rules. Standings calculated using Handbook C.07 tie-breaks. Click any player to inspect their full match record.
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {onGoBack && (
            <button
              type="button"
              onClick={onGoBack}
              className="btn btn-secondary-white"
              style={{ fontSize: '0.82rem', padding: '0.45rem 1rem', fontWeight: 600 }}
              title="Return to Final Standings"
            >
              <ArrowLeft size={14} />
              <span>Back to Standings</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenPrint}
            className="btn btn-secondary-white"
            style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}
          >
            <Printer size={13} />
            <span>Print Official Bulletin</span>
          </button>

          <button
            type="button"
            onClick={onExportTRF}
            className="btn btn-secondary-white"
            style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}
          >
            <Download size={13} />
            <span>Export FIDE TRF16</span>
          </button>

          <button
            type="button"
            onClick={onRestartNewTournament}
            className="btn btn-secondary-white"
            style={{ fontSize: '0.82rem', padding: '0.45rem 1rem', color: '#dc2626' }}
            title="Reset tournament vault for next championship"
          >
            <RotateCcw size={13} />
            <span>New Tournament</span>
          </button>
        </div>
      </div>

      {/* Podium Cards: 2nd, 1st, 3rd (Olympic Order) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
          alignItems: 'flex-end',
          maxWidth: '880px',
          margin: '0 auto 2rem',
        }}
      >
        {/* Runner-Up (2nd Place) */}
        {runnerUp && (
          <div
            className="card-clean podium-runnerup-card hover-highlight"
            onClick={() => setSelectedPlayer(runnerUp)}
            style={{
              padding: '1.25rem 1rem',
              textAlign: 'center',
              borderTop: '3.5px solid var(--navy-border)',
              cursor: 'pointer',
            }}
            title="Click to view 2nd Place match history"
          >
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              🥈 Runner-Up • 2nd Place
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--navy-deep)', marginBottom: '0.2rem' }}>
              {runnerUp.name}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              {runnerUp.title !== 'NONE' ? `${runnerUp.title} • ` : ''}{runnerUp.organization || 'Independent'}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--navy-royal)' }}>
              {runnerUp.score.toFixed(1)} <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>pts</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.3rem', fontFamily: 'var(--font-mono)' }}>
              BH: {runnerUp.tieBreaks.buchholzCut1.toFixed(1)} | SB: {runnerUp.tieBreaks.sonnebornBerger.toFixed(1)}
              {runnerUp.performanceRating && ` | Rp: ${runnerUp.performanceRating}`}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--navy-royal)', marginTop: '0.5rem', fontWeight: 700 }}>
              View Matches ↗
            </div>
          </div>
        )}

        {/* Champion (1st Place) */}
        {champion && (
          <div
            className="card-clean podium-champ-card hover-highlight"
            onClick={() => setSelectedPlayer(champion)}
            style={{
              padding: '1.75rem 1.25rem',
              textAlign: 'center',
              borderTop: '4px solid var(--green-primary)',
              background: 'linear-gradient(180deg, var(--green-tint) 0%, #ffffff 40%)',
              boxShadow: '0 8px 18px -4px rgba(10, 25, 47, 0.08)',
              cursor: 'pointer',
            }}
            title="Click to view Champion match history"
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'var(--green-deep)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.5rem',
                fontSize: '1.3rem',
              }}
            >
              ♔
            </div>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--green-deep)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              🥇 Tournament Champion
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--navy-deep)', marginBottom: '0.2rem' }}>
              {champion.name}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
              {champion.title !== 'NONE' ? `${champion.title} • ` : ''}{champion.organization || 'Independent'}
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--green-deep)' }}>
              {champion.score.toFixed(1)} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>pts</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem', fontFamily: 'var(--font-mono)' }}>
              BH: {champion.tieBreaks.buchholzCut1.toFixed(1)} | SB: {champion.tieBreaks.sonnebornBerger.toFixed(1)}
              {champion.performanceRating && ` | Rp: ${champion.performanceRating}`}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--green-deep)', marginTop: '0.5rem', fontWeight: 800 }}>
              View Champion Matches ↗
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {thirdPlace && (
          <div
            className="card-clean podium-third-card hover-highlight"
            onClick={() => setSelectedPlayer(thirdPlace)}
            style={{
              padding: '1.25rem 1rem',
              textAlign: 'center',
              borderTop: '3.5px solid var(--navy-border-light)',
              cursor: 'pointer',
            }}
            title="Click to view 3rd Place match history"
          >
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              🥉 3rd Place
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--navy-deep)', marginBottom: '0.2rem' }}>
              {thirdPlace.name}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              {thirdPlace.title !== 'NONE' ? `${thirdPlace.title} • ` : ''}{thirdPlace.organization || 'Independent'}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--navy-royal)' }}>
              {thirdPlace.score.toFixed(1)} <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>pts</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.3rem', fontFamily: 'var(--font-mono)' }}>
              BH: {thirdPlace.tieBreaks.buchholzCut1.toFixed(1)} | SB: {thirdPlace.tieBreaks.sonnebornBerger.toFixed(1)}
              {thirdPlace.performanceRating && ` | Rp: ${thirdPlace.performanceRating}`}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--navy-royal)', marginTop: '0.5rem', fontWeight: 700 }}>
              View Matches ↗
            </div>
          </div>
        )}
      </div>

      {/* Complete Final Official Standings Table */}
      <div className="card-clean" style={{ padding: '0.35rem', overflowX: 'auto' }}>
        <table className="table-minimal">
          <thead>
            <tr>
              <th style={{ width: '45px', textAlign: 'center' }}>Rk</th>
              <th style={{ width: '45px' }}>#</th>
              <th>Candidate Player & FIDE ID</th>
              <th style={{ width: '60px' }}>Title</th>
              <th style={{ width: '80px', textAlign: 'right' }}>FIDE Elo</th>
              <th style={{ width: '70px', textAlign: 'center' }}>Final Pts</th>
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
            {sortedPlayers.map((player, idx) => {
              const rank = idx + 1;
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
                    background: isPodium ? 'var(--green-tint)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  className="hover-highlight"
                  title={`Click to view ${player.name}'s complete match history`}
                >
                  <td
                    style={{
                      textAlign: 'center',
                      fontWeight: 800,
                      color: rank === 1 ? 'var(--green-deep)' : 'var(--navy-deep)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {rank}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    #{player.tpn}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--navy-deep)' }}>
                      {player.name}
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
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {player.rating > 0 ? player.rating : <span style={{ color: 'var(--text-muted)' }}>Unranked</span>}
                  </td>
                  <td
                    style={{
                      textAlign: 'center',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800,
                      fontSize: '0.92rem',
                      color: rank === 1 ? 'var(--green-deep)' : 'var(--navy-royal)',
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
