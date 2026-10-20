import React, { useState } from 'react';
import { Printer, FileText } from 'lucide-react';
import { calculateTournamentStandings } from '../engine/tiebreaks';
import { Player, Round, Tournament } from '../types/chess';

interface PrintViewProps {
  tournament: Tournament;
  currentRoundObj: Round | undefined;
}

export const PrintView: React.FC<PrintViewProps> = ({
  tournament,
  currentRoundObj,
}) => {
  const [printType, setPrintType] = useState<'pairings' | 'standings'>('pairings');

  const playerMap = new Map<number, Player>();
  for (const p of tournament.players) {
    playerMap.set(p.tpn, p);
  }

  const standings = calculateTournamentStandings(tournament.players, tournament.settings);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Arbiter Print Control Bar (Hidden on actual print) */}
      <div className="glass-panel no-print" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Printer size={20} color="var(--accent-gold)" />
            Official Tournament Desk Print View
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            High-contrast A4 print formatting compliant with FIDE Swiss-Manager standards
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '0.2rem', borderRadius: '6px' }}>
            <button
              className={`btn ${printType === 'pairings' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
              onClick={() => setPrintType('pairings')}
            >
              Pairings
            </button>
            <button
              className={`btn ${printType === 'standings' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
              onClick={() => setPrintType('standings')}
            >
              Standings
            </button>
          </div>

          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={16} />
            Print to Paper / PDF
          </button>
        </div>
      </div>

      {/* Printable Paper Area */}
      <div className="print-page" style={{ background: '#fff', color: '#000', padding: '2rem', borderRadius: '8px', minHeight: '600px', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
        {/* Official Header */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, textTransform: 'uppercase', color: '#000' }}>
            {tournament.settings.name}
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#333' }}>
            {tournament.settings.city}, {tournament.settings.federation} • Date: {tournament.settings.startDate} to {tournament.settings.endDate}
          </p>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '0.25rem', color: '#000' }}>
            Chief Arbiter: {tournament.settings.chiefArbiter} • Deputy Arbiter: {tournament.settings.deputyArbiter}
          </div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: '0.5rem', color: '#000' }}>
            {printType === 'pairings'
              ? `OFFICIAL PAIRINGS — ROUND ${tournament.currentRound}`
              : `OFFICIAL STANDINGS AFTER ROUND ${tournament.currentRound}`}
          </h2>
        </div>

        {/* Pairing List */}
        {printType === 'pairings' && (
          <div>
            {!currentRoundObj?.isPaired ? (
              <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
                Round {tournament.currentRound} not yet paired.
              </p>
            ) : (
              <div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt', color: '#000' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #000', background: '#f5f5f5' }}>
                      <th style={{ padding: '6px 8px', width: '35px', textAlign: 'center' }}>Bd</th>
                      <th style={{ padding: '6px 8px', width: '35px' }}>TPN</th>
                      <th style={{ padding: '6px 8px' }}>White Player</th>
                      <th style={{ padding: '6px 8px', width: '45px', textAlign: 'right' }}>Rtg</th>
                      <th style={{ padding: '6px 8px', width: '40px', textAlign: 'center' }}>Pts</th>
                      <th style={{ padding: '6px 8px', width: '60px', textAlign: 'center' }}>Res</th>
                      <th style={{ padding: '6px 8px', width: '40px', textAlign: 'center' }}>Pts</th>
                      <th style={{ padding: '6px 8px', width: '45px', textAlign: 'right' }}>Rtg</th>
                      <th style={{ padding: '6px 8px' }}>Black Player</th>
                      <th style={{ padding: '6px 8px', width: '35px' }}>TPN</th>
                      <th style={{ padding: '6px 8px', width: '80px', textAlign: 'center' }}>Signature</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRoundObj.pairings.map((p) => {
                      const white = playerMap.get(p.whiteTpn);
                      const black = playerMap.get(p.blackTpn);
                      if (!white || !black) return null;

                      return (
                        <tr key={p.boardNumber} style={{ borderBottom: '1px solid #ccc' }}>
                          <td style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 'bold' }}>
                            {p.boardNumber}
                          </td>
                          <td style={{ padding: '4px 6px' }}>{white.tpn}</td>
                          <td style={{ padding: '4px 6px', fontWeight: 600 }}>
                            {white.title !== 'None' ? `${white.title} ` : ''}{white.name}
                          </td>
                          <td style={{ padding: '4px 6px', textAlign: 'right' }}>{white.rating}</td>
                          <td style={{ padding: '4px 6px', textAlign: 'center' }}>{white.score.toFixed(1)}</td>
                          <td style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 'bold' }}>
                            {p.result === '*' ? '  -  ' : p.result}
                          </td>
                          <td style={{ padding: '4px 6px', textAlign: 'center' }}>{black.score.toFixed(1)}</td>
                          <td style={{ padding: '4px 6px', textAlign: 'right' }}>{black.rating}</td>
                          <td style={{ padding: '4px 6px', fontWeight: 600 }}>
                            {black.title !== 'None' ? `${black.title} ` : ''}{black.name}
                          </td>
                          <td style={{ padding: '4px 6px' }}>{black.tpn}</td>
                          <td style={{ padding: '4px 6px', borderBottom: '1px dotted #999' }}></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Byes */}
                {currentRoundObj.byes.length > 0 && (
                  <div style={{ marginTop: '1.5rem', fontSize: '9pt', borderTop: '1px solid #000', paddingTop: '0.5rem' }}>
                    <strong>Byes / Unpaired: </strong>
                    {currentRoundObj.byes.map((b) => {
                      const pl = playerMap.get(b.playerTpn);
                      return `${pl?.name} (#${pl?.tpn}, ${b.type} +${b.points})`;
                    }).join('; ')}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Standings List */}
        {printType === 'standings' && (
          <div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', color: '#000' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #000', background: '#f5f5f5' }}>
                  <th style={{ padding: '4px 6px', width: '30px', textAlign: 'center' }}>Rk</th>
                  <th style={{ padding: '4px 6px', width: '35px' }}>TPN</th>
                  <th style={{ padding: '4px 6px' }}>Name</th>
                  <th style={{ padding: '4px 6px', width: '40px' }}>Title</th>
                  <th style={{ padding: '4px 6px', width: '40px' }}>Fed</th>
                  <th style={{ padding: '4px 6px', width: '45px', textAlign: 'right' }}>Rtg</th>
                  <th style={{ padding: '4px 6px', width: '40px', textAlign: 'center', fontWeight: 'bold' }}>Pts</th>
                  <th style={{ padding: '4px 6px', width: '45px', textAlign: 'right' }}>BH-C1</th>
                  <th style={{ padding: '4px 6px', width: '45px', textAlign: 'right' }}>BH</th>
                  <th style={{ padding: '4px 6px', width: '45px', textAlign: 'right' }}>SB</th>
                  <th style={{ padding: '4px 6px', width: '35px', textAlign: 'center' }}>Wins</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s) => (
                  <tr key={s.tpn} style={{ borderBottom: '1px solid #ccc' }}>
                    <td style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 'bold' }}>{s.rank}</td>
                    <td style={{ padding: '4px 6px' }}>{s.tpn}</td>
                    <td style={{ padding: '4px 6px', fontWeight: 600 }}>{s.name}</td>
                    <td style={{ padding: '4px 6px' }}>{s.title !== 'None' ? s.title : ''}</td>
                    <td style={{ padding: '4px 6px' }}>{s.federation}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right' }}>{s.rating}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 'bold' }}>{s.score.toFixed(1)}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right' }}>{s.tieBreaks.BH_C1.toFixed(1)}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right' }}>{s.tieBreaks.BH.toFixed(1)}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right' }}>{s.tieBreaks.SB.toFixed(2)}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'center' }}>{s.tieBreaks.WIN}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', fontSize: '9pt', borderTop: '1px solid #666', paddingTop: '0.5rem', color: '#333' }}>
          <div>Generated by FIDE Swiss-Manager Pro Engine (C.04.3 & C.07 compliant)</div>
          <div>Page 1 / 1</div>
        </div>
      </div>
    </div>
  );
};
