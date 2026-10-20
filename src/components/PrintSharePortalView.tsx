import React, { useState } from 'react';
import { Printer, Share2, QrCode, Search, Download, Swords, Trophy, Clock, FileText } from 'lucide-react';
import { BoardPairing, CandidatePlayer, TournamentState } from '../lib/fideSwissEngine';

interface PrintSharePortalViewProps {
  tournament: TournamentState;
  onExportTRF: () => void;
  onOpenWhatsApp?: () => void;
  onOpenCertificates?: () => void;
  onOpenPlayerSearch?: () => void;
}

export const PrintSharePortalView: React.FC<PrintSharePortalViewProps> = ({
  tournament,
  onExportTRF,
  onOpenWhatsApp,
  onOpenCertificates,
  onOpenPlayerSearch,
}) => {
  const [printType, setPrintType] = useState<'pairings' | 'standings'>('pairings');
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [showQrExpanded, setShowQrExpanded] = useState(false);

  const playerMap = new Map<string, CandidatePlayer>();
  for (const p of tournament.players) {
    playerMap.set(p.id, p);
  }

  const currentRoundIdx = tournament.currentRound - 1;
  const currentRoundBoards =
    currentRoundIdx >= 0 && currentRoundIdx < tournament.rounds.length
      ? tournament.rounds[currentRoundIdx]
      : [];

  const handlePrint = () => {
    window.print();
  };

  // Filtered boards for spectator search
  const filteredBoards = currentRoundBoards.filter((b) => {
    if (!playerSearchQuery.trim()) return true;
    const white = playerMap.get(b.whitePlayerId);
    const black = b.blackPlayerId ? playerMap.get(b.blackPlayerId) : null;
    const q = playerSearchQuery.toLowerCase();
    return (
      white?.name.toLowerCase().includes(q) ||
      black?.name.toLowerCase().includes(q) ||
      b.boardNumber.toString() === q
    );
  });

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem 1.25rem' }}>
      {/* Top Banner (Hidden in Print) */}
      <div className="glass-panel no-print" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Printer size={22} color="var(--accent-gold)" />
              5. 🖨️ Print Notice Sheets & Public Player Link
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              1-click print official pairing & standings sheets for the wall, or share QR code with players.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={handlePrint}
            >
              <Printer size={16} />
              Print Notice Sheet (PDF)
            </button>

            {onOpenCertificates && (
              <button
                className="btn btn-secondary"
                onClick={onOpenCertificates}
              >
                <FileText size={16} color="var(--accent-gold)" />
                Bulk Certificates
              </button>
            )}

            {onOpenWhatsApp && (
              <button
                className="btn btn-secondary"
                onClick={onOpenWhatsApp}
              >
                <Share2 size={16} color="var(--accent-emerald)" />
                WhatsApp Broadcast
              </button>
            )}

            <button
              className="btn btn-secondary"
              onClick={() => setShowQrExpanded(!showQrExpanded)}
            >
              <QrCode size={16} />
              {showQrExpanded ? 'Hide QR' : 'Player QR'}
            </button>

            <button
              className="btn btn-secondary"
              onClick={onExportTRF}
              title="Download official FIDE TRF16 file for rating submission"
            >
              <Download size={16} />
              Export TRF16
            </button>
          </div>
        </div>

        {/* QR Code Presentation */}
        {showQrExpanded && (
          <div style={{
            marginTop: '1.25rem',
            padding: '1.25rem',
            background: 'var(--bg-secondary)',
            borderRadius: '10px',
            textAlign: 'center',
          }}>
            <div style={{ display: 'inline-block', background: '#fff', padding: '1rem', borderRadius: '8px' }}>
              <svg width="150" height="150" viewBox="0 0 100 100" fill="#000">
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
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Project this on the hall screen or tape to the entrance. Players scan with their phone camera to find their board number in 2 seconds.
            </p>
          </div>
        )}

        {/* Print Type Selector */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
          <button
            className={`btn ${printType === 'pairings' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.35rem 0.85rem', fontSize: '0.82rem' }}
            onClick={() => setPrintType('pairings')}
          >
            <Swords size={14} />
            Round {tournament.currentRound} Pairing Sheet
          </button>
          <button
            className={`btn ${printType === 'standings' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '0.35rem 0.85rem', fontSize: '0.82rem' }}
            onClick={() => setPrintType('standings')}
          >
            <Trophy size={14} />
            Standings & Results Sheet
          </button>
        </div>
      </div>

      {/* Printable Area */}
      <div className="glass-panel" style={{ padding: '2rem', background: '#fff', color: '#000' }}>
        {/* Printable Official Header */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', color: '#000' }}>
            {tournament.name}
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#444', fontWeight: 600 }}>
            {printType === 'pairings'
              ? `Official Pairing Notice Sheet — Round ${tournament.currentRound} of ${tournament.totalRounds}`
              : `Official Standings & Tie-Break Sheet (After Round ${tournament.currentRound})`}
          </p>
          <p style={{ fontSize: '0.75rem', color: '#666' }}>
            Year: {tournament.tournamentYear} • FIDE Dutch System C.04.3 • Chief Arbiter Report
          </p>
        </div>

        {/* Pairings Print Table */}
        {printType === 'pairings' ? (
          <div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', color: '#000' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #000', background: '#f5f5f5' }}>
                  <th style={{ padding: '6px 8px', width: '50px', textAlign: 'center' }}>Board</th>
                  <th style={{ padding: '6px 8px', width: '45px' }}>TPN</th>
                  <th style={{ padding: '6px 8px' }}>White Candidate ♔</th>
                  <th style={{ padding: '6px 8px', width: '60px', textAlign: 'right' }}>Rtg</th>
                  <th style={{ padding: '6px 8px', width: '45px', textAlign: 'center' }}>Pts</th>
                  <th style={{ padding: '6px 8px', width: '70px', textAlign: 'center' }}>Result</th>
                  <th style={{ padding: '6px 8px', width: '45px', textAlign: 'center' }}>Pts</th>
                  <th style={{ padding: '6px 8px', width: '60px' }}>Rtg</th>
                  <th style={{ padding: '6px 8px' }}>Black Candidate ♚</th>
                  <th style={{ padding: '6px 8px', width: '45px' }}>TPN</th>
                </tr>
              </thead>
              <tbody>
                {currentRoundBoards.map((b) => {
                  const white = playerMap.get(b.whitePlayerId);
                  const black = b.blackPlayerId ? playerMap.get(b.blackPlayerId) : null;
                  const resText =
                    b.result === 'PENDING'
                      ? '   -   '
                      : b.result === 'WHITE_WIN'
                      ? '1 - 0'
                      : b.result === 'BLACK_WIN'
                      ? '0 - 1'
                      : b.result === 'DRAW'
                      ? '½ - ½'
                      : b.result;

                  return (
                    <tr key={b.boardNumber} style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 800 }}>{b.boardNumber}</td>
                      <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>#{white?.tpn}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 700 }}>{white?.name}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{white?.rating}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700 }}>{white?.score.toFixed(1)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 900, background: '#f9f9f9' }}>{resText}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700 }}>{black ? black.score.toFixed(1) : '-'}</td>
                      <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{black?.rating || '-'}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 700 }}>{black?.name || 'BYE'}</td>
                      <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{black ? `#${black.tpn}` : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Standings Print Table */
          <div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', color: '#000' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #000', background: '#f5f5f5' }}>
                  <th style={{ padding: '6px 8px', width: '40px', textAlign: 'center' }}>Rk</th>
                  <th style={{ padding: '6px 8px', width: '40px' }}>TPN</th>
                  <th style={{ padding: '6px 8px' }}>Candidate Name</th>
                  <th style={{ padding: '6px 8px', width: '50px' }}>Title</th>
                  <th style={{ padding: '6px 8px', width: '50px', textAlign: 'right' }}>Rtg</th>
                  <th style={{ padding: '6px 8px', width: '80px', textAlign: 'center' }}>W-D-L</th>
                  <th style={{ padding: '6px 8px', width: '50px', textAlign: 'center' }}>Pts</th>
                  <th style={{ padding: '6px 8px', width: '60px', textAlign: 'right' }}>BH-C1</th>
                  <th style={{ padding: '6px 8px', width: '60px', textAlign: 'right' }}>BH-Tot</th>
                  <th style={{ padding: '6px 8px', width: '60px', textAlign: 'right' }}>SB</th>
                  <th style={{ padding: '6px 8px', width: '50px', textAlign: 'center' }}>Wins</th>
                </tr>
              </thead>
              <tbody>
                {tournament.players.map((p, idx) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '5px 8px', textAlign: 'center', fontWeight: 800 }}>{idx + 1}</td>
                    <td style={{ padding: '5px 8px', fontFamily: 'monospace' }}>#{p.tpn}</td>
                    <td style={{ padding: '5px 8px', fontWeight: 700 }}>{p.name}</td>
                    <td style={{ padding: '5px 8px' }}>{p.title !== 'NONE' ? p.title : '-'}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{p.rating}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'center' }}>{p.roundsWon}-{p.roundsDrawn}-{p.roundsLost}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'center', fontWeight: 900 }}>{p.score.toFixed(1)}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right' }}>{p.tieBreaks.buchholzCut1.toFixed(1)}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right' }}>{p.tieBreaks.buchholzTotal.toFixed(1)}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right' }}>{p.tieBreaks.sonnebornBerger.toFixed(2)}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'center' }}>{p.tieBreaks.mostWins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Arbiter Signature Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid #000' }}>
          <div>
            <div style={{ width: '200px', borderBottom: '1px solid #000', marginBottom: '0.4rem' }} />
            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#000' }}>Chief Arbiter Signature</p>
          </div>
          <div>
            <div style={{ width: '200px', borderBottom: '1px solid #000', marginBottom: '0.4rem' }} />
            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#000' }}>Tournament Director Signature</p>
          </div>
        </div>
      </div>
    </div>
  );
};
