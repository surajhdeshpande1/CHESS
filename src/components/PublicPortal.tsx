import React, { useState } from 'react';
import { Eye, Search, QrCode, Share2, Trophy, Swords, Clock, CheckCircle } from 'lucide-react';
import { calculateTournamentStandings } from '../engine/tiebreaks';
import { BoardPairing, Player, Round, Tournament } from '../types/chess';

interface PublicPortalProps {
  tournament: Tournament;
  currentRoundObj: Round | undefined;
}

export const PublicPortal: React.FC<PublicPortalProps> = ({
  tournament,
  currentRoundObj,
}) => {
  const [activeView, setActiveView] = useState<'pairings' | 'standings'>('pairings');
  const [playerQuery, setPlayerQuery] = useState('');
  const [showQr, setShowQr] = useState(false);

  const playerMap = new Map<number, Player>();
  for (const p of tournament.players) {
    playerMap.set(p.tpn, p);
  }

  const standings = calculateTournamentStandings(tournament.players, tournament.settings);

  // Filter pairings if search query matches either player
  const filteredPairings = currentRoundObj?.pairings.filter((pairing) => {
    if (!playerQuery.trim()) return true;
    const white = playerMap.get(pairing.whiteTpn);
    const black = playerMap.get(pairing.blackTpn);
    const q = playerQuery.toLowerCase();
    return (
      white?.name.toLowerCase().includes(q) ||
      black?.name.toLowerCase().includes(q) ||
      pairing.boardNumber.toString() === q
    );
  }) || [];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Spectator Hero Banner */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(17, 28, 52, 0.9), rgba(13, 21, 39, 0.95))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span className="badge badge-emerald" style={{ marginBottom: '0.5rem' }}>
              ● Live Tournament Feed
            </span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {tournament.settings.name}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Round {tournament.currentRound} of {tournament.settings.totalRounds} • {tournament.settings.city}, {tournament.settings.federation}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setShowQr(!showQr)}
            >
              <QrCode size={16} />
              QR Code
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert('Tournament live portal link copied to clipboard!');
              }}
            >
              <Share2 size={16} />
              Share Link
            </button>
          </div>
        </div>

        {/* QR Code Mock Overlay */}
        {showQr && (
          <div style={{ marginTop: '1.25rem', padding: '1.25rem', background: 'var(--bg-secondary)', borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ display: 'inline-block', background: '#fff', padding: '1rem', borderRadius: '8px' }}>
              {/* SVG QR Code representation */}
              <svg width="140" height="140" viewBox="0 0 100 100" fill="#000">
                <rect x="0" y="0" width="30" height="30" />
                <rect x="5" y="5" width="20" height="20" fill="#fff" />
                <rect x="10" y="10" width="10" height="10" />
                <rect x="70" y="0" width="30" height="30" />
                <rect x="75" y="5" width="20" height="20" fill="#fff" />
                <rect x="80" y="10" width="10" height="10" />
                <rect x="0" y="70" width="30" height="30" />
                <rect x="5" y="75" width="20" height="20" fill="#fff" />
                <rect x="10" y="80" width="10" height="10" />
                <rect x="40" y="20" width="10" height="10" />
                <rect x="50" y="40" width="10" height="20" />
                <rect x="30" y="60" width="20" height="10" />
                <rect x="70" y="70" width="20" height="20" />
              </svg>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Scan to view live pairings and standings on your mobile phone
            </p>
          </div>
        )}
      </div>

      {/* Switcher & Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <button
            className={`btn ${activeView === 'pairings' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}
            onClick={() => setActiveView('pairings')}
          >
            <Swords size={14} />
            Round {tournament.currentRound} Pairings
          </button>
          <button
            className={`btn ${activeView === 'standings' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}
            onClick={() => setActiveView('standings')}
          >
            <Trophy size={14} />
            Live Standings
          </button>
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Find my board (name / board #)..."
            value={playerQuery}
            onChange={(e) => setPlayerQuery(e.target.value)}
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

      {/* View: Pairings Cards (Mobile & Wall display friendly) */}
      {activeView === 'pairings' && (
        <div>
          {!currentRoundObj?.isPaired ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
              <Clock size={32} color="var(--accent-gold)" style={{ margin: '0 auto 1rem' }} />
              <p style={{ color: 'var(--text-secondary)' }}>
                Round {tournament.currentRound} pairings are being formulated by the Chief Arbiter.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {filteredPairings.map((pairing) => {
                const white = playerMap.get(pairing.whiteTpn);
                const black = playerMap.get(pairing.blackTpn);
                if (!white || !black) return null;

                const isResultDecided = pairing.result !== '*';

                return (
                  <div
                    key={pairing.boardNumber}
                    className="glass-panel"
                    style={{
                      padding: '0.85rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                      borderLeft: isResultDecided ? '4px solid var(--accent-emerald)' : '4px solid var(--accent-gold)',
                    }}
                  >
                    {/* Board Number Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '90px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>BOARD</span>
                      <strong style={{ fontSize: '1.25rem', color: 'var(--accent-gold)', fontFamily: 'var(--font-mono)' }}>
                        {pairing.boardNumber}
                      </strong>
                    </div>

                    {/* White Player */}
                    <div style={{ flex: '1 1 240px', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ width: '16px', height: '16px', borderRadius: '3px', background: '#fff', border: '1px solid #ccc', display: 'inline-block', flexShrink: 0 }} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          {white.title !== 'None' && <span className="badge badge-gold" style={{ fontSize: '0.65rem', padding: '0.05rem 0.3rem' }}>{white.title}</span>}
                          <strong style={{ fontSize: '0.95rem' }}>{white.name}</strong>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({white.rating})</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Score: {white.score} pts • {white.federation}
                        </div>
                      </div>
                    </div>

                    {/* Result Center Badge */}
                    <div style={{ width: '100px', textAlign: 'center' }}>
                      <span
                        className={`badge ${isResultDecided ? 'badge-emerald' : 'badge-gold'}`}
                        style={{ fontSize: '0.85rem', padding: '0.3rem 0.65rem', fontFamily: 'var(--font-mono)' }}
                      >
                        {pairing.result === '*' ? 'VS' : pairing.result}
                      </span>
                    </div>

                    {/* Black Player */}
                    <div style={{ flex: '1 1 240px', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ width: '16px', height: '16px', borderRadius: '3px', background: '#1e293b', border: '1px solid #475569', display: 'inline-block', flexShrink: 0 }} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          {black.title !== 'None' && <span className="badge badge-gold" style={{ fontSize: '0.65rem', padding: '0.05rem 0.3rem' }}>{black.title}</span>}
                          <strong style={{ fontSize: '0.95rem' }}>{black.name}</strong>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({black.rating})</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Score: {black.score} pts • {black.federation}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* View: Standings List */}
      {activeView === 'standings' && (
        <div className="glass-panel" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(13, 21, 39, 0.7)', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem', width: '50px', textAlign: 'center' }}>Rk</th>
                <th style={{ padding: '0.75rem 1rem' }}>Player</th>
                <th style={{ padding: '0.75rem 0.5rem', width: '60px' }}>Fed</th>
                <th style={{ padding: '0.75rem 0.75rem', width: '70px', textAlign: 'right' }}>Rtg</th>
                <th style={{ padding: '0.75rem 1rem', width: '70px', textAlign: 'center', color: 'var(--accent-gold)' }}>Pts</th>
                <th style={{ padding: '0.75rem 0.75rem', width: '80px', textAlign: 'right' }}>BH-C1</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s) => (
                <tr key={s.tpn} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {s.rank}
                  </td>
                  <td style={{ padding: '0.65rem 1rem', fontWeight: 600 }}>
                    {s.title !== 'None' && <span className="badge badge-gold" style={{ fontSize: '0.65rem', marginRight: '0.4rem', padding: '0.05rem 0.3rem' }}>{s.title}</span>}
                    {s.name}
                  </td>
                  <td style={{ padding: '0.65rem 0.5rem' }}>
                    <span className="badge badge-muted" style={{ fontSize: '0.65rem' }}>{s.federation}</span>
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                    {s.rating}
                  </td>
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center', fontWeight: 800, color: 'var(--accent-gold)', fontFamily: 'var(--font-mono)' }}>
                    {s.score.toFixed(1)}
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                    {s.tieBreaks.BH_C1.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
