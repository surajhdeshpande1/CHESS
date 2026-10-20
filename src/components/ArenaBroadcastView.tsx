import React, { useEffect, useRef, useState } from 'react';
import { TournamentState } from '../lib/fideSwissEngine';

interface ArenaBroadcastViewProps {
  tournament: TournamentState;
  onExit: () => void;
}

export const ArenaBroadcastView: React.FC<ArenaBroadcastViewProps> = ({
  tournament,
  onExit,
}) => {
  const currentRound = tournament.currentRound;
  const boards = tournament.rounds[currentRound - 1] || [];
  const playerMap = new Map(tournament.players.map((p) => [p.id, p]));

  // Round countdown timer state (default 90 mins = 5400s)
  const [timeLeft, setTimeLeft] = useState<number>(5400);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [voiceAlerts, setVoiceAlerts] = useState<boolean>(true);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Countdown timer effect
  useEffect(() => {
    let timer: any = null;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev === 600 && voiceAlerts && 'speechSynthesis' in window) {
            const utter = new SpeechSynthesisUtterance(`Attention arbiters and players: 10 minutes remaining in Round ${currentRound}.`);
            window.speechSynthesis.speak(utter);
          }
          if (prev <= 1) {
            if (voiceAlerts && 'speechSynthesis' in window) {
              const utter = new SpeechSynthesisUtterance(`Round ${currentRound} playing session time has expired.`);
              window.speechSynthesis.speak(utter);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft, voiceAlerts, currentRound]);

  // Auto-scroll effect for big screen projector
  useEffect(() => {
    if (!autoScroll || !scrollRef.current) return;
    const interval = setInterval(() => {
      if (scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        if (scrollTop + clientHeight >= scrollHeight - 10) {
          scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          scrollRef.current.scrollBy({ top: 120, behavior: 'smooth' });
        }
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [autoScroll]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const completedBoards = boards.filter((b) => b.result !== 'PENDING');
  const recentFinished = completedBoards.slice(-4).reverse();

  return (
    <div className="arena-broadcast-container">
      {/* Top Banner */}
      <header className="arena-broadcast-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '2rem' }}>📺</span>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-gold)' }}>
              {tournament.name.toUpperCase()}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              OFFICIAL FIDE ARENA BROADCAST • ROUND {currentRound} OF {tournament.totalRounds}
            </div>
          </div>
        </div>

        {/* Big Live Round Timer */}
        <div className="arena-timer-pill">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>
            ROUND CLOCK
          </div>
          <div className="arena-timer-digits">{formatTime(timeLeft)}</div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
            <button
              onClick={() => setIsRunning(!isRunning)}
              className="arena-small-btn"
            >
              {isRunning ? '⏸ Pause' : '▶ Start'}
            </button>
            <button
              onClick={() => setTimeLeft(5400)}
              className="arena-small-btn"
            >
              ↺ 90m
            </button>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => setVoiceAlerts(!voiceAlerts)}
            className={`btn ${voiceAlerts ? 'btn-accent' : 'btn-secondary'}`}
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
          >
            {voiceAlerts ? '🔊 Voice Alerts: ON' : '🔇 Voice Alerts: OFF'}
          </button>

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`btn ${autoScroll ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
          >
            {autoScroll ? '📜 Auto-Scroll: ON' : '⏸ Auto-Scroll: OFF'}
          </button>

          <button onClick={onExit} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}>
            ✕ Exit Broadcast
          </button>
        </div>
      </header>

      {/* Main Boards Auto-Scrolling Table */}
      <main className="arena-boards-viewport" ref={scrollRef}>
        <table className="arena-table">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>BOARD</th>
              <th style={{ textAlign: 'right' }}>WHITE CANDIDATE ♔</th>
              <th style={{ width: '130px', textAlign: 'center' }}>RESULT</th>
              <th style={{ textAlign: 'left' }}>BLACK CANDIDATE ♚</th>
            </tr>
          </thead>
          <tbody>
            {boards.map((b) => {
              const white = playerMap.get(b.whitePlayerId);
              const black = b.blackPlayerId ? playerMap.get(b.blackPlayerId) : null;
              const isFinished = b.result !== 'PENDING';

              return (
                <tr key={b.boardNumber} className={isFinished ? 'row-finished' : 'row-live'}>
                  <td className="board-col">
                    <span className="arena-board-number">#{b.boardNumber}</span>
                  </td>

                  {/* White Player */}
                  <td style={{ textAlign: 'right' }}>
                    <div className="arena-player-name">
                      {white?.title !== 'NONE' && (
                        <span className="badge badge-gold" style={{ marginRight: '6px' }}>{white?.title}</span>
                      )}
                      {white?.name}
                    </div>
                    <div className="arena-player-meta">
                      Rating: {white?.rating || 'Unrated'} • Score: <strong>{white?.score} pts</strong>
                    </div>
                  </td>

                  {/* Result Badge */}
                  <td style={{ textAlign: 'center' }}>
                    {b.result === 'PENDING' ? (
                      <span className="badge badge-muted" style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>
                        LIVE ⚔️
                      </span>
                    ) : b.result === 'WHITE_WIN' ? (
                      <span className="badge badge-emerald" style={{ fontSize: '0.9rem', padding: '0.35rem 0.85rem' }}>
                        1 - 0
                      </span>
                    ) : b.result === 'BLACK_WIN' ? (
                      <span className="badge badge-emerald" style={{ fontSize: '0.9rem', padding: '0.35rem 0.85rem' }}>
                        0 - 1
                      </span>
                    ) : b.result === 'DRAW' ? (
                      <span className="badge badge-blue" style={{ fontSize: '0.9rem', padding: '0.35rem 0.85rem' }}>
                        ½ - ½
                      </span>
                    ) : (
                      <span className="badge badge-gold" style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>
                        {b.result}
                      </span>
                    )}
                  </td>

                  {/* Black Player */}
                  <td style={{ textAlign: 'left' }}>
                    {black ? (
                      <>
                        <div className="arena-player-name">
                          {black.name}
                          {black.title !== 'NONE' && (
                            <span className="badge badge-gold" style={{ marginLeft: '6px' }}>{black.title}</span>
                          )}
                        </div>
                        <div className="arena-player-meta">
                          Rating: {black.rating || 'Unrated'} • Score: <strong>{black.score} pts</strong>
                        </div>
                      </>
                    ) : (
                      <div className="arena-player-name" style={{ color: 'var(--text-muted)' }}>
                        — PAIRING ALLOCATED BYE —
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </main>

      {/* Bottom Live Ticker Banner */}
      <footer className="arena-ticker-bar">
        <span className="ticker-badge">⚡ LIVE RESULTS TICKER</span>
        <div className="ticker-text">
          {recentFinished.length === 0 ? (
            <span>All boards currently active in Round {currentRound}. Results will appear here dynamically as games conclude.</span>
          ) : (
            recentFinished.map((fb, idx) => {
              const w = playerMap.get(fb.whitePlayerId);
              const blk = fb.blackPlayerId ? playerMap.get(fb.blackPlayerId) : null;
              return (
                <span key={fb.boardNumber} style={{ marginRight: '2rem' }}>
                  <strong>Board #{fb.boardNumber}:</strong> {w?.name} {fb.result === 'WHITE_WIN' ? 'defeated' : fb.result === 'DRAW' ? 'drew with' : 'lost to'} {blk?.name || 'BYE'} ({fb.result})
                  {idx < recentFinished.length - 1 && '  •  '}
                </span>
              );
            })
          )}
        </div>
      </footer>
    </div>
  );
};
