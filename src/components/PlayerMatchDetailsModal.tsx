import React, { useEffect } from 'react';
import { X, Award, Shield, User, Trophy, Calendar, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { CandidatePlayer, GameResult, TournamentState } from '../lib/fideSwissEngine';

interface PlayerMatchDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: CandidatePlayer | null;
  tournament: TournamentState;
  onSelectAnotherPlayer?: (anotherPlayer: CandidatePlayer) => void;
}

interface ResolvedMatch {
  roundNumber: number;
  boardNumber: number;
  color: 'W' | 'B' | null;
  opponent: CandidatePlayer | null;
  opponentId: string | null;
  isBye: boolean;
  byeLabel: string | null;
  resultCode: GameResult;
  isPending: boolean;
  playerWon: boolean;
  playerDrew: boolean;
  playerLost: boolean;
  pointsEarned: number;
  scoreBeforeRound: number;
  scoreAfterRound: number;
  playedOverTheBoard: boolean;
  floatType: 'DF' | 'UF' | 'NONE';
}

export const PlayerMatchDetailsModal: React.FC<PlayerMatchDetailsModalProps> = ({
  isOpen,
  onClose,
  player,
  tournament,
  onSelectAnotherPlayer,
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

  if (!isOpen || !player) return null;

  const playerMap = new Map<string, CandidatePlayer>();
  for (const p of tournament.players) {
    playerMap.set(p.id, p);
  }

  // Calculate rank
  const sorted = [...tournament.players].sort((a, b) => {
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
  const currentRank = sorted.findIndex((p) => p.id === player.id) + 1;

  // Resolve all rounds for this player
  const resolvedMatches: ResolvedMatch[] = [];
  const maxRounds = Math.max(
    tournament.rounds.length,
    player.history.length,
    tournament.status === 'REGISTRATION' ? 0 : tournament.currentRound
  );

  for (let r = 1; r <= maxRounds; r++) {
    // 1. Check history entry first
    const hist = player.history.find((h) => h.roundNumber === r);

    // 2. Check tournament.rounds for this round
    const roundPairings = tournament.rounds[r - 1] || [];
    const boardPairing = roundPairings.find(
      (b) => b.whitePlayerId === player.id || b.blackPlayerId === player.id
    );

    if (hist) {
      const opp = hist.opponentId ? playerMap.get(hist.opponentId) || null : null;
      const isBye = !hist.opponentId;
      const won = hist.pointsEarned === 1.0 && hist.resultCode !== 'PENDING';
      const drew = hist.pointsEarned === 0.5 && hist.resultCode !== 'PENDING';
      const lost = hist.pointsEarned === 0.0 && hist.resultCode !== 'PENDING' && !isBye;

      resolvedMatches.push({
        roundNumber: hist.roundNumber,
        boardNumber: hist.boardNumber,
        color: hist.color,
        opponent: opp,
        opponentId: hist.opponentId,
        isBye,
        byeLabel: isBye ? 'Pairing-Allocated Bye (PAB)' : null,
        resultCode: hist.resultCode,
        isPending: false,
        playerWon: won,
        playerDrew: drew,
        playerLost: lost,
        pointsEarned: hist.pointsEarned,
        scoreBeforeRound: hist.scoreBeforeRound,
        scoreAfterRound: hist.scoreBeforeRound + hist.pointsEarned,
        playedOverTheBoard: hist.playedOverTheBoard,
        floatType: hist.floatReceived,
      });
    } else if (boardPairing) {
      // In-progress or recently paired round without history entry yet
      const isWhite = boardPairing.whitePlayerId === player.id;
      const oppId = isWhite ? boardPairing.blackPlayerId : boardPairing.whitePlayerId;
      const opp = oppId ? playerMap.get(oppId) || null : null;
      const isBye = !oppId;
      const isPending = boardPairing.result === 'PENDING';

      let pointsEarned = 0;
      let won = false;
      let drew = false;
      let lost = false;

      if (!isPending) {
        if (isWhite) {
          won = boardPairing.result === 'WHITE_WIN' || boardPairing.result === 'WHITE_FORFEIT_WIN';
          drew = boardPairing.result === 'DRAW';
          lost = boardPairing.result === 'BLACK_WIN' || boardPairing.result === 'BLACK_FORFEIT_WIN';
        } else {
          won = boardPairing.result === 'BLACK_WIN' || boardPairing.result === 'BLACK_FORFEIT_WIN';
          drew = boardPairing.result === 'DRAW';
          lost = boardPairing.result === 'WHITE_WIN' || boardPairing.result === 'WHITE_FORFEIT_WIN';
        }
        pointsEarned = won ? 1 : drew ? 0.5 : 0;
      }

      resolvedMatches.push({
        roundNumber: r,
        boardNumber: boardPairing.boardNumber,
        color: isBye ? null : isWhite ? 'W' : 'B',
        opponent: opp,
        opponentId: oppId,
        isBye,
        byeLabel: isBye ? 'Pairing-Allocated Bye (PAB)' : null,
        resultCode: boardPairing.result,
        isPending,
        playerWon: won,
        playerDrew: drew,
        playerLost: lost,
        pointsEarned,
        scoreBeforeRound: player.score - pointsEarned,
        scoreAfterRound: player.score,
        playedOverTheBoard: !isBye && boardPairing.result !== 'DOUBLE_FORFEIT',
        floatType: 'NONE',
      });
    }
  }

  const fideDisplay = player.fideId && player.fideId.toLowerCase() !== 'unranked'
    ? player.fideId
    : 'Unranked';

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '820px',
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: '12px',
          boxShadow: '0 24px 60px rgba(10, 25, 47, 0.25)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            background: 'var(--navy-deep)',
            color: '#ffffff',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                RANK #{currentRank}
              </span>
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                SEED TPN #{player.tpn}
              </span>
              {player.title !== 'NONE' && (
                <span
                  style={{
                    background: '#f59e0b',
                    color: '#000000',
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    padding: '2px 8px',
                    borderRadius: '4px',
                  }}
                >
                  {player.title}
                </span>
              )}
              {fideDisplay === 'Unranked' ? (
                <span
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                  }}
                >
                  Unranked
                </span>
              ) : (
                <span
                  style={{
                    background: 'rgba(16, 185, 129, 0.25)',
                    border: '1px solid #10b981',
                    color: '#a7f3d0',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  FIDE ID: {fideDisplay}
                </span>
              )}
            </div>

            <h2
              style={{
                fontSize: '1.45rem',
                fontWeight: 800,
                color: '#ffffff',
                fontFamily: 'var(--font-heading)',
                letterSpacing: '0.02em',
                margin: 0,
              }}
            >
              {player.name}
            </h2>
            <div style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '0.82rem', marginTop: '0.2rem' }}>
              {player.organization || 'Independent'} • Rating: {player.rating > 0 ? `${player.rating} Elo` : 'Unrated (0)'}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="drawer-close-btn"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
            }}
            title="Close dialog (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Player Key Metrics Bar */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--navy-border-light)',
            padding: '0.85rem 1.5rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
            gap: '0.75rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total Score
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--green-deep)', fontFamily: 'var(--font-mono)' }}>
              {player.score.toFixed(1)} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>pts</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Record (W-D-L)
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--navy-deep)', fontFamily: 'var(--font-mono)' }}>
              {player.roundsWon}W - {player.roundsDrawn}D - {player.roundsLost}L
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Perf (Rp)
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--navy-royal)', fontFamily: 'var(--font-mono)' }}>
              {player.performanceRating || '—'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Rating ΔR
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
              {(player.fideRatingChange ?? 0) > 0 ? (
                <span style={{ color: 'var(--green-deep)' }}>+{(player.fideRatingChange ?? 0).toFixed(1)}</span>
              ) : (player.fideRatingChange ?? 0) < 0 ? (
                <span style={{ color: '#dc2626' }}>{(player.fideRatingChange ?? 0).toFixed(1)}</span>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>0.0</span>
              )}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              BH Cut-1 / Tot
            </div>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--navy-deep)', fontFamily: 'var(--font-mono)' }}>
              {player.tieBreaks.buchholzCut1.toFixed(1)} / {player.tieBreaks.buchholzTotal.toFixed(1)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Sonneborn-B.
            </div>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--navy-deep)', fontFamily: 'var(--font-mono)' }}>
              {player.tieBreaks.sonnebornBerger.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Scrollable Match Details Stream */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <h3
              style={{
                fontSize: '0.98rem',
                fontWeight: 800,
                color: 'var(--navy-deep)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>⚔ Round-by-Round Match Details</span>
              <span className="badge-minimal badge-muted" style={{ fontSize: '0.68rem' }}>
                {resolvedMatches.length} Matches Logged
              </span>
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Click any opponent to switch dossiers
            </span>
          </div>

          {resolvedMatches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', background: '#ffffff', borderRadius: '8px', border: '1px dashed var(--navy-border-light)' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>♟</div>
              <div style={{ fontWeight: 700, color: 'var(--navy-deep)', marginBottom: '0.2rem' }}>
                No Round Matches Paired Yet
              </div>
              <div style={{ fontSize: '0.78rem' }}>
                Match records and opponent details will appear here as soon as Round 1 is generated.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {resolvedMatches.map((m) => {
                const opp = m.opponent;
                const oppFide = opp?.fideId && opp.fideId.toLowerCase() !== 'unranked' ? opp.fideId : 'Unranked';

                return (
                  <div
                    key={m.roundNumber}
                    style={{
                      background: '#ffffff',
                      border: '1px solid var(--navy-border-light)',
                      borderRadius: '8px',
                      padding: '0.85rem 1rem',
                      display: 'grid',
                      gridTemplateColumns: 'minmax(85px, 110px) 1fr minmax(130px, 170px)',
                      alignItems: 'center',
                      gap: '1rem',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 2px 6px rgba(10, 25, 47, 0.03)',
                    }}
                  >
                    {/* Left: Round & Board & Color */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--navy-deep)', fontFamily: 'var(--font-heading)' }}>
                          Round {m.roundNumber}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                        Board #{m.boardNumber}
                      </div>

                      {/* Color indicator */}
                      <div style={{ marginTop: '5px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        {m.color === 'W' ? (
                          <span
                            style={{
                              background: '#ffffff',
                              border: '1px solid #94a3b8',
                              color: '#0f172a',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>⚪</span> White
                          </span>
                        ) : m.color === 'B' ? (
                          <span
                            style={{
                              background: '#0f172a',
                              border: '1px solid #0f172a',
                              color: '#ffffff',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>⚫</span> Black
                          </span>
                        ) : (
                          <span className="badge-minimal badge-muted" style={{ fontSize: '0.65rem' }}>
                            Bye
                          </span>
                        )}
                        {m.floatType !== 'NONE' && (
                          <span
                            style={{
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              color: m.floatType === 'DF' ? '#b45309' : '#0284c7',
                              fontFamily: 'var(--font-mono)',
                            }}
                            title={m.floatType === 'DF' ? 'Downfloat (paired against lower score group)' : 'Upfloat (paired against higher score group)'}
                          >
                            {m.floatType}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Center: Opponent Details ("With Whom They Played") */}
                    <div>
                      {m.isBye ? (
                        <div>
                          <div style={{ fontWeight: 800, color: 'var(--navy-deep)', fontSize: '0.9rem' }}>
                            {m.byeLabel || 'Pairing-Allocated Bye (PAB)'}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            No opponent scheduled under FIDE Swiss pairing rules (Received +1.0 point)
                          </div>
                        </div>
                      ) : opp ? (
                        <div
                          onClick={() => onSelectAnotherPlayer && onSelectAnotherPlayer(opp)}
                          style={{
                            cursor: onSelectAnotherPlayer ? 'pointer' : 'default',
                            padding: '4px 6px',
                            borderRadius: '6px',
                            margin: '-4px -6px',
                          }}
                          className={onSelectAnotherPlayer ? 'hover-highlight' : ''}
                          title={onSelectAnotherPlayer ? `View ${opp.name}'s match record` : undefined}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                              #{opp.tpn}
                            </span>
                            {opp.title !== 'NONE' && (
                              <span className="badge-minimal badge-navy" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                                {opp.title}
                              </span>
                            )}
                            <span style={{ fontWeight: 800, color: 'var(--navy-deep)', fontSize: '0.9rem' }}>
                              {opp.name}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '3px', flexWrap: 'wrap' }}>
                            <span>Rating: <strong style={{ color: 'var(--navy-deep)' }}>{opp.rating > 0 ? opp.rating : 'Unrated'}</strong></span>
                            <span>•</span>
                            <span>
                              FIDE ID: {oppFide === 'Unranked' ? (
                                <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Unranked</span>
                              ) : (
                                <strong style={{ color: 'var(--navy-deep)', fontFamily: 'var(--font-mono)' }}>{oppFide}</strong>
                              )}
                            </span>
                            {opp.organization && (
                              <>
                                <span>•</span>
                                <span>{opp.organization}</span>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                          Opponent ID: {m.opponentId || 'Unknown'}
                        </div>
                      )}
                    </div>

                    {/* Right: Match Outcome & Points */}
                    <div style={{ textAlign: 'right' }}>
                      {m.isPending ? (
                        <span
                          style={{
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            display: 'inline-block',
                          }}
                        >
                          In Progress ⏱
                        </span>
                      ) : m.playerWon ? (
                        <div>
                          <span
                            style={{
                              background: '#ecfdf5',
                              color: '#047857',
                              border: '1px solid #a7f3d0',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.76rem',
                              fontWeight: 800,
                              display: 'inline-block',
                            }}
                          >
                            WON (+1.0)
                          </span>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '3px', fontFamily: 'var(--font-mono)' }}>
                            {m.resultCode === 'WHITE_WIN'
                              ? '1 - 0'
                              : m.resultCode === 'BLACK_WIN'
                              ? '0 - 1'
                              : m.resultCode === 'WHITE_FORFEIT_WIN' || m.resultCode === 'BLACK_FORFEIT_WIN'
                              ? '+ - (Forfeit)'
                              : '1.0 pt'}
                          </div>
                        </div>
                      ) : m.playerDrew ? (
                        <div>
                          <span
                            style={{
                              background: '#fef3c7',
                              color: '#b45309',
                              border: '1px solid #fde68a',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.76rem',
                              fontWeight: 800,
                              display: 'inline-block',
                            }}
                          >
                            DRAW (½ - ½)
                          </span>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '3px', fontFamily: 'var(--font-mono)' }}>
                            +0.5 pt
                          </div>
                        </div>
                      ) : m.isBye ? (
                        <div>
                          <span
                            style={{
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.76rem',
                              fontWeight: 800,
                              display: 'inline-block',
                            }}
                          >
                            BYE (+1.0)
                          </span>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '3px', fontFamily: 'var(--font-mono)' }}>
                            Pairing Bye
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span
                            style={{
                              background: '#fef2f2',
                              color: '#b91c1c',
                              border: '1px solid #fecaca',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.76rem',
                              fontWeight: 800,
                              display: 'inline-block',
                            }}
                          >
                            LOST (0.0)
                          </span>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '3px', fontFamily: 'var(--font-mono)' }}>
                            {m.resultCode === 'WHITE_WIN' ? '0 - 1' : '1 - 0'}
                          </div>
                        </div>
                      )}

                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                        Prog: {m.scoreAfterRound.toFixed(1)} pts
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            borderTop: '1px solid var(--navy-border-light)',
            padding: '0.75rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            Official FIDE Dutch C.04.3 Regulatory Dossier
          </span>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary-navy"
            style={{ fontSize: '0.82rem', padding: '0.45rem 1.25rem' }}
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
