import React, { useState, useEffect } from 'react';
import { ArrowRight, Trophy, Play, Pause, RotateCcw, Printer, Sparkles, CheckCircle2 } from 'lucide-react';
import {
  BoardPairing,
  CandidatePlayer,
  GameResult,
  TournamentState,
} from '../lib/fideSwissEngine';
import { extractFideTitleAndClean } from '../lib/playerListParser';

interface Step3LiveMatchesProps {
  tournament: TournamentState;
  onTapResult: (boardNumber: number, result: GameResult) => void;
  onSimulateRemaining: () => void;
  onExplainBoard?: (board: BoardPairing) => void;
  onAdvanceRound: () => void;
}

export const Step3LiveMatches: React.FC<Step3LiveMatchesProps> = ({
  tournament,
  onTapResult,
  onSimulateRemaining,
  onExplainBoard,
  onAdvanceRound,
}) => {
  const currentRoundIdx = tournament.currentRound - 1;
  const currentRoundBoards =
    currentRoundIdx >= 0 && currentRoundIdx < tournament.rounds.length
      ? tournament.rounds[currentRoundIdx]
      : [];

  const playerMap = new Map<string, CandidatePlayer>();
  for (const p of tournament.players) {
    playerMap.set(p.id, p);
  }

  const matchBoards = currentRoundBoards.filter((b) => b.blackPlayerId !== null);
  const byeBoards = currentRoundBoards.filter((b) => b.blackPlayerId === null);

  const completedCount = matchBoards.filter((b) => b.result !== 'PENDING').length;
  const totalMatches = matchBoards.length;
  const isRoundFinished = totalMatches > 0 && completedCount === totalMatches;
  const isFinalRound = tournament.currentRound === tournament.totalRounds;

  // Round Timer State
  const initialSeconds = (tournament.roundDurationMinutes || 60) * 60;
  const [secondsRemaining, setSecondsRemaining] = useState<number>(initialSeconds);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [trackedRound, setTrackedRound] = useState(tournament.currentRound);

  // Sync timer on round advance
  if (tournament.currentRound !== trackedRound) {
    setTrackedRound(tournament.currentRound);
    setSecondsRemaining((tournament.roundDurationMinutes || 60) * 60);
    setIsTimerRunning(false);
  }

  // Tick timer
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, secondsRemaining]);

  const formatTime = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* 1. SCREEN VIEW (Visible in browser, hidden when printed) */}
      <div className="app-container no-print" style={{ paddingTop: '1.25rem', paddingBottom: '2.5rem' }}>
        {/* Top Arbiter Command Ribbon */}
        <div
          className="card-clean"
          style={{
            padding: '1.1rem 1.5rem',
            marginBottom: '1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            borderLeft: '4px solid var(--navy-royal)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <span className="badge-minimal badge-navy" style={{ fontWeight: 800 }}>
                ROUND {tournament.currentRound} OF {tournament.totalRounds}
              </span>
              <span className={`badge-minimal ${isRoundFinished ? 'badge-green' : 'badge-muted'}`}>
                {isRoundFinished ? '✓ ALL BOARDS SCORED' : `${completedCount} OF ${totalMatches} REPORTED`}
              </span>
            </div>
            <h2
              style={{
                fontSize: '1.45rem',
                fontWeight: 800,
                color: 'var(--navy-deep)',
                fontFamily: 'var(--font-heading)',
                letterSpacing: '0.03em',
                lineHeight: 1.2,
              }}
            >
              FIDE Dutch Round {tournament.currentRound} Pairings
            </h2>
          </div>

          {/* Controls: Round Timer, Print Bulletin, Auto-fill, Pair Next */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Detailed Round Clock */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                background:
                  secondsRemaining === 0
                    ? '#fef2f2'
                    : secondsRemaining < 60 && isTimerRunning
                    ? '#fffbeb'
                    : 'var(--bg-secondary)',
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                border: secondsRemaining === 0 ? '1px solid #fecaca' : '1px solid var(--navy-border-light)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.1rem' }}>
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    ROUND CLOCK
                  </span>
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      color: isTimerRunning ? 'var(--green-deep)' : 'var(--navy-royal)',
                    }}
                  >
                    {isTimerRunning ? '● LIVE' : '⏸ PAUSED'}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color:
                      secondsRemaining === 0
                        ? '#b91c1c'
                        : secondsRemaining < 60 && isTimerRunning
                        ? '#b45309'
                        : 'var(--navy-deep)',
                    lineHeight: 1.1,
                  }}
                >
                  {formatTime(secondsRemaining)}
                </div>
                {tournament.timeControlName && (
                  <div
                    style={{
                      fontSize: '0.62rem',
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-sans)',
                      marginTop: '0.1rem',
                      maxWidth: '160px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={tournament.timeControlName}
                  >
                    {tournament.timeControlName}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <button
                  type="button"
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className={`btn ${isTimerRunning ? 'btn-secondary-white' : 'btn-primary-navy'}`}
                  style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem' }}
                  title={isTimerRunning ? 'Pause Round Timer' : 'Start Round Timer'}
                >
                  {isTimerRunning ? <Pause size={12} /> : <Play size={12} />}
                  <span>{isTimerRunning ? 'Pause' : 'Start'}</span>
                </button>

                {/* Arbiter Time Extensions */}
                <button
                  type="button"
                  onClick={() => setSecondsRemaining((prev) => prev + 300)}
                  className="btn btn-secondary-white"
                  style={{ padding: '0.3rem 0.45rem', fontSize: '0.72rem', fontWeight: 700 }}
                  title="Add +5 Minutes Arbiter Extension"
                >
                  +5m
                </button>

                <button
                  type="button"
                  onClick={() => setSecondsRemaining((prev) => prev + 60)}
                  className="btn btn-secondary-white"
                  style={{ padding: '0.3rem 0.45rem', fontSize: '0.72rem', fontWeight: 700 }}
                  title="Add +1 Minute Arbiter Extension"
                >
                  +1m
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsTimerRunning(false);
                    setSecondsRemaining((tournament.roundDurationMinutes || 15) * 60);
                  }}
                  className="btn btn-secondary-white"
                  style={{ padding: '0.3rem 0.5rem' }}
                  title="Reset Round Timer"
                >
                  <RotateCcw size={12} />
                </button>
              </div>
            </div>

            {/* Print Round Pairings Button */}
            <button
              type="button"
              onClick={() => window.print()}
              className="btn btn-secondary-white"
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.95rem' }}
              title="Print official round pairings sheet for tournament notice board"
            >
              <Printer size={14} />
              <span>Print Pairings</span>
            </button>

            {!isRoundFinished && (
              <button
                type="button"
                onClick={onSimulateRemaining}
                className="btn btn-secondary-white"
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
                title="Auto-fill realistic outcomes for remaining boards"
              >
                <Sparkles size={13} color="var(--navy-royal)" />
                <span>Auto-Fill Pending</span>
              </button>
            )}

            <button
              type="button"
              disabled={!isRoundFinished}
              onClick={onAdvanceRound}
              className={`btn ${isRoundFinished ? 'btn-primary-green' : 'btn-secondary-white'}`}
              style={{ padding: '0.55rem 1.4rem', fontSize: '0.88rem' }}
            >
              {isFinalRound ? (
                <>
                  <Trophy size={14} />
                  <span>View Championship Podium</span>
                </>
              ) : (
                <>
                  <span>Pair Round {tournament.currentRound + 1}</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Pairings List - Strictly One Below Another */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            marginBottom: '1.75rem',
          }}
        >
          {matchBoards.map((b) => {
            const white = playerMap.get(b.whitePlayerId);
            const black = b.blackPlayerId ? playerMap.get(b.blackPlayerId) : null;
            if (!white || !black) return null;

            const isWhiteWin = b.result === 'WHITE_WIN' || b.result === 'WHITE_FORFEIT_WIN';
            const isBlackWin = b.result === 'BLACK_WIN' || b.result === 'BLACK_FORFEIT_WIN';
            const isDraw = b.result === 'DRAW';
            const isPending = b.result === 'PENDING';

            // Clean display names & dynamically detect titles from names (e.g. cleans "None (Regular)", handles "Candidate Master (CM)")
            const whiteInfo = extractFideTitleAndClean(white.name);
            const whiteTitle = white.title !== 'NONE' ? white.title : whiteInfo.title;
            const whiteName = whiteInfo.cleaned || white.name;

            const blackInfo = extractFideTitleAndClean(black.name);
            const blackTitle = black.title !== 'NONE' ? black.title : blackInfo.title;
            const blackName = blackInfo.cleaned || black.name;

            // Determine score values displayed on each side
            const whiteDisplayScore = isWhiteWin ? '1' : isBlackWin ? '0' : isDraw ? '½' : '—';
            const blackDisplayScore = isBlackWin ? '1' : isWhiteWin ? '0' : isDraw ? '½' : '—';

            return (
              <div
                key={b.boardNumber}
                className="card-clean pairing-board-row"
                style={{
                  borderLeft: isWhiteWin || isBlackWin
                    ? '4px solid var(--green-primary)'
                    : isDraw
                    ? '4px solid var(--navy-royal)'
                    : '4px solid var(--navy-border-light)',
                  background: isWhiteWin || isBlackWin
                    ? 'linear-gradient(90deg, rgba(22, 163, 74, 0.03) 0%, #ffffff 8%, #ffffff 92%, rgba(22, 163, 74, 0.03) 100%)'
                    : isDraw
                    ? 'linear-gradient(90deg, rgba(30, 58, 138, 0.03) 0%, #ffffff 8%, #ffffff 92%, rgba(30, 58, 138, 0.03) 100%)'
                    : '#ffffff',
                  boxShadow: '0 1px 3px rgba(10, 25, 47, 0.04)',
                  transition: 'all 0.18s ease',
                }}
              >
                {/* Board Number */}
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', display: 'block', fontWeight: 800, letterSpacing: '0.04em' }}>
                    BD
                  </span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--navy-deep)', lineHeight: 1.1 }}>
                    {b.boardNumber}
                  </span>
                </div>

                {/* White Player Area (Click to declare White Winner -> gets 1) */}
                <div
                  onClick={() => onTapResult(b.boardNumber, isWhiteWin ? 'PENDING' : 'WHITE_WIN')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.55rem 0.85rem',
                    borderRadius: '8px',
                    background: isWhiteWin ? 'var(--green-tint)' : '#ffffff',
                    border: isWhiteWin ? '1.5px solid var(--green-border)' : '1px solid var(--navy-border-light)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all 0.15s ease',
                    boxShadow: isWhiteWin ? '0 2px 6px rgba(20, 83, 45, 0.12)' : 'none',
                    gap: '0.75rem',
                    minWidth: 0,
                  }}
                  title="Click to award White the win (1 - 0) or tap again to reset"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                    <span
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '6px',
                        background: '#ffffff',
                        border: '1.5px solid var(--navy-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.95rem',
                        fontWeight: 800,
                        color: 'var(--navy-deep)',
                        flexShrink: 0,
                        boxShadow: '0 1px 2px rgba(10, 25, 47, 0.08)',
                      }}
                    >
                      ♔
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {whiteTitle !== 'NONE' && (
                          <span
                            className="badge-minimal badge-navy"
                            style={{ fontSize: '0.66rem', padding: '0.1rem 0.35rem', fontWeight: 800 }}
                          >
                            {whiteTitle}
                          </span>
                        )}
                        <span
                          style={{
                            fontWeight: 800,
                            fontSize: '0.92rem',
                            color: 'var(--navy-deep)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {whiteName}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Elo: <strong style={{ color: 'var(--navy-deep)' }}>{white.rating || 'Unr'}</strong> • Pts: <strong style={{ color: 'var(--navy-deep)' }}>{white.score.toFixed(1)}</strong>
                        {white.organization && (
                          <span style={{ marginLeft: '0.4rem', color: 'var(--text-secondary)' }}>
                            • {white.organization}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Individual White Score Badge: Shows 1, 0, ½, or — */}
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      background: isWhiteWin
                        ? 'var(--green-primary)'
                        : isDraw
                        ? 'var(--navy-tint)'
                        : isBlackWin
                        ? 'var(--bg-secondary)'
                        : 'transparent',
                      color: isWhiteWin
                        ? '#ffffff'
                        : isDraw
                        ? 'var(--navy-royal)'
                        : isBlackWin
                        ? 'var(--text-light)'
                        : 'var(--text-light)',
                      border: isWhiteWin ? 'none' : '1px solid var(--navy-border-light)',
                      flexShrink: 0,
                    }}
                  >
                    {whiteDisplayScore}
                  </div>
                </div>

                {/* Center Match Score & Result Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', padding: '0 0.25rem' }}>
                  {/* Result Indicator: Shows vs when pending, 1 - 0, 0 - 1, or ½ - ½ */}
                  <div
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 900,
                      fontFamily: 'var(--font-mono)',
                      color: isWhiteWin || isBlackWin ? 'var(--green-deep)' : isDraw ? 'var(--navy-royal)' : 'var(--text-muted)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {isPending ? 'vs' : isWhiteWin ? '1 – 0' : isBlackWin ? '0 – 1' : '½ – ½'}
                  </div>

                  {/* Quick Result Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <button
                      type="button"
                      onClick={() => onTapResult(b.boardNumber, isWhiteWin ? 'PENDING' : 'WHITE_WIN')}
                      style={{
                        padding: '0.2rem 0.45rem',
                        borderRadius: '4px',
                        border: isWhiteWin ? '1.5px solid var(--green-primary)' : '1px solid var(--navy-border-light)',
                        background: isWhiteWin ? 'var(--green-primary)' : '#ffffff',
                        color: isWhiteWin ? '#ffffff' : 'var(--text-main)',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        fontFamily: 'var(--font-mono)',
                        transition: 'all 0.12s ease',
                      }}
                      title="Award White win (1 - 0)"
                    >
                      1-0
                    </button>

                    <button
                      type="button"
                      onClick={() => onTapResult(b.boardNumber, isDraw ? 'PENDING' : 'DRAW')}
                      style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '4px',
                        border: isDraw ? '1.5px solid var(--navy-royal)' : '1px solid var(--navy-border-light)',
                        background: isDraw ? 'var(--navy-royal)' : '#ffffff',
                        color: isDraw ? '#ffffff' : 'var(--navy-royal)',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        fontFamily: 'var(--font-mono)',
                        transition: 'all 0.12s ease',
                      }}
                      title="Declare Draw (½ - ½)"
                    >
                      {isDraw ? '✓ Draw' : '½ Draw'}
                    </button>

                    <button
                      type="button"
                      onClick={() => onTapResult(b.boardNumber, isBlackWin ? 'PENDING' : 'BLACK_WIN')}
                      style={{
                        padding: '0.2rem 0.45rem',
                        borderRadius: '4px',
                        border: isBlackWin ? '1.5px solid var(--green-primary)' : '1px solid var(--navy-border-light)',
                        background: isBlackWin ? 'var(--green-primary)' : '#ffffff',
                        color: isBlackWin ? '#ffffff' : 'var(--text-main)',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        fontFamily: 'var(--font-mono)',
                        transition: 'all 0.12s ease',
                      }}
                      title="Award Black win (0 - 1)"
                    >
                      0-1
                    </button>

                    {!isPending && (
                      <button
                        type="button"
                        onClick={() => onTapResult(b.boardNumber, 'PENDING')}
                        style={{
                          padding: '0.2rem 0.35rem',
                          borderRadius: '4px',
                          border: '1px solid var(--navy-border-light)',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-muted)',
                          fontSize: '0.65rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="Reset board back to Pending"
                      >
                        <RotateCcw size={11} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Black Player Area (Click to declare Black Winner -> gets 1) */}
                <div
                  onClick={() => onTapResult(b.boardNumber, isBlackWin ? 'PENDING' : 'BLACK_WIN')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.55rem 0.85rem',
                    borderRadius: '8px',
                    background: isBlackWin ? 'var(--green-tint)' : '#ffffff',
                    border: isBlackWin ? '1.5px solid var(--green-border)' : '1px solid var(--navy-border-light)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all 0.15s ease',
                    boxShadow: isBlackWin ? '0 2px 6px rgba(20, 83, 45, 0.12)' : 'none',
                    gap: '0.75rem',
                    minWidth: 0,
                  }}
                  title="Click to award Black the win (0 - 1) or tap again to reset"
                >
                  {/* Individual Black Score Badge: Shows 1, 0, ½, or — */}
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      background: isBlackWin
                        ? 'var(--green-primary)'
                        : isDraw
                        ? 'var(--navy-tint)'
                        : isWhiteWin
                        ? 'var(--bg-secondary)'
                        : 'transparent',
                      color: isBlackWin
                        ? '#ffffff'
                        : isDraw
                        ? 'var(--navy-royal)'
                        : isWhiteWin
                        ? 'var(--text-light)'
                        : 'var(--text-light)',
                      border: isBlackWin ? 'none' : '1px solid var(--navy-border-light)',
                      flexShrink: 0,
                    }}
                  >
                    {blackDisplayScore}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, textAlign: 'right' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontWeight: 800,
                            fontSize: '0.92rem',
                            color: 'var(--navy-deep)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {blackName}
                        </span>
                        {blackTitle !== 'NONE' && (
                          <span
                            className="badge-minimal badge-navy"
                            style={{ fontSize: '0.66rem', padding: '0.1rem 0.35rem', fontWeight: 800 }}
                          >
                            {blackTitle}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {black.organization && (
                          <span style={{ marginRight: '0.4rem', color: 'var(--text-secondary)' }}>
                            {black.organization} •
                          </span>
                        )}
                        Elo: <strong style={{ color: 'var(--navy-deep)' }}>{black.rating || 'Unr'}</strong> • Pts: <strong style={{ color: 'var(--navy-deep)' }}>{black.score.toFixed(1)}</strong>
                      </div>
                    </div>

                    <span
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '6px',
                        background: 'var(--navy-deep)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.95rem',
                        fontWeight: 800,
                        flexShrink: 0,
                        boxShadow: '0 1px 3px rgba(10, 25, 47, 0.2)',
                      }}
                    >
                      ♚
                    </span>
                  </div>
                </div>

                {/* X-Ray / Explain Action */}
                <div style={{ textAlign: 'center' }}>
                  {onExplainBoard && (
                    <button
                      type="button"
                      onClick={() => onExplainBoard(b)}
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '6px',
                        border: '1px solid var(--navy-border-light)',
                        background: '#ffffff',
                        color: 'var(--navy-royal)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      title="Pairing X-Ray & FIDE Dutch explanation"
                    >
                      <Sparkles size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Allocated Pairing Byes (if odd count of players) */}
        {byeBoards.length > 0 && (
          <div className="card-clean" style={{ padding: '1rem', marginBottom: '1.75rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--navy-deep)', marginBottom: '0.6rem' }}>
              Allocated Pairing Byes ({byeBoards.length})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.6rem' }}>
              {byeBoards.map((b) => {
                const p = playerMap.get(b.whitePlayerId);
                if (!p) return null;
                return (
                  <div
                    key={b.boardNumber}
                    style={{
                      padding: '0.55rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid var(--navy-border-light)',
                      background: 'var(--bg-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--navy-deep)' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Elo: {p.rating} • Score: {p.score.toFixed(1)}
                      </div>
                    </div>
                    <span className="badge-minimal badge-green">Pairing Bye (+1.0)</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom Advance Action Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1.1rem 1.5rem',
            borderRadius: '8px',
            background: isRoundFinished ? 'var(--green-tint)' : 'var(--bg-secondary)',
            border: isRoundFinished ? '1.5px solid var(--green-border)' : '1px solid var(--navy-border-light)',
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: isRoundFinished ? 'var(--green-deep)' : 'var(--navy-deep)' }}>
              {isRoundFinished
                ? `Round ${tournament.currentRound} Complete! All ${totalMatches} Match Results Recorded.`
                : `Round ${tournament.currentRound} in progress (${completedCount} of ${totalMatches} games recorded)`}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {isRoundFinished
                ? isFinalRound
                  ? 'All rounds completed. Click to reveal championship podium and official standings.'
                  : `Ready to compute Round ${tournament.currentRound + 1} pairings with FIDE Dutch system.`
                : 'Click the winning player on each board (they get 1), or click "½ Draw" to score a draw.'}
            </div>
          </div>

          <button
            type="button"
            disabled={!isRoundFinished}
            onClick={onAdvanceRound}
            className={`btn ${isRoundFinished ? 'btn-primary-green' : 'btn-secondary-white'}`}
            style={{ padding: '0.65rem 1.6rem', fontSize: '0.9rem' }}
          >
            {isFinalRound ? (
              <>
                <Trophy size={15} />
                <span>Conclude Championship & View Podium</span>
              </>
            ) : (
              <>
                <span>Pair Round {tournament.currentRound + 1}</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. PRINT-ONLY OFFICIAL FIDE PAIRING BULLETIN (For Notice Board & Arbiter) */}
      <div className="print-only" style={{ padding: '1.5rem', fontFamily: 'serif' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.25rem', borderBottom: '2px solid #000', paddingBottom: '0.65rem' }}>
          <h1 style={{ fontSize: '18pt', fontWeight: 'bold', textTransform: 'uppercase', margin: 0 }}>
            {tournament.name || 'Official Chess Championship'}
          </h1>
          <div style={{ fontSize: '12pt', marginTop: '0.25rem' }}>
            <strong>Round {tournament.currentRound} Pairings & Results Bulletin</strong>
            {tournament.city && ` • ${tournament.city}`}
          </div>
          <div style={{ fontSize: '9pt', color: '#555', marginTop: '0.2rem' }}>
            FIDE Dutch Swiss Pairing System C.04.3 • Official Chief Arbiter Notice Board
          </div>
        </div>

        <table className="printable-pairing-table">
          <thead>
            <tr>
              <th style={{ width: '35px', textAlign: 'center' }}>Bd.</th>
              <th style={{ width: '40px' }}>#</th>
              <th>White Player</th>
              <th style={{ width: '55px', textAlign: 'right' }}>Elo</th>
              <th style={{ width: '40px', textAlign: 'center' }}>Pts</th>
              <th style={{ width: '85px', textAlign: 'center' }}>Result</th>
              <th style={{ width: '40px', textAlign: 'center' }}>Pts</th>
              <th>Black Player</th>
              <th style={{ width: '55px', textAlign: 'right' }}>Elo</th>
              <th style={{ width: '40px' }}>#</th>
            </tr>
          </thead>
          <tbody>
            {matchBoards.map((b) => {
              const white = playerMap.get(b.whitePlayerId);
              const black = b.blackPlayerId ? playerMap.get(b.blackPlayerId) : null;
              if (!white || !black) return null;

              let resText = '...... - ......';
              if (b.result === 'WHITE_WIN') resText = '1 - 0';
              else if (b.result === 'BLACK_WIN') resText = '0 - 1';
              else if (b.result === 'DRAW') resText = '½ - ½';

              return (
                <tr key={b.boardNumber}>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{b.boardNumber}</td>
                  <td>#{white.tpn}</td>
                  <td style={{ fontWeight: 'bold' }}>
                    {white.title !== 'NONE' ? `${white.title} ` : ''}{white.name}
                  </td>
                  <td style={{ textAlign: 'right' }}>{white.rating || 'Unr.'}</td>
                  <td style={{ textAlign: 'center' }}>{white.score.toFixed(1)}</td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold', fontFamily: 'monospace' }}>
                    {resText}
                  </td>
                  <td style={{ textAlign: 'center' }}>{black.score.toFixed(1)}</td>
                  <td style={{ fontWeight: 'bold' }}>
                    {black.title !== 'NONE' ? `${black.title} ` : ''}{black.name}
                  </td>
                  <td style={{ textAlign: 'right' }}>{black.rating || 'Unr.'}</td>
                  <td>#{black.tpn}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {byeBoards.length > 0 && (
          <div style={{ marginTop: '1.25rem', borderTop: '1px solid #ccc', paddingTop: '0.5rem' }}>
            <h3 style={{ fontSize: '10.5pt', fontWeight: 'bold', marginBottom: '0.25rem' }}>Allocated Pairing Byes:</h3>
            {byeBoards.map((b) => {
              const p = playerMap.get(b.whitePlayerId);
              return p ? (
                <div key={b.boardNumber} style={{ fontSize: '9.5pt' }}>
                  Board {b.boardNumber}: #{p.tpn} {p.name} ({p.rating || 'Unrated'}) — Pairing Allocated Bye (1.0 Point)
                </div>
              ) : null;
            })}
          </div>
        )}
      </div>
    </>
  );
};
