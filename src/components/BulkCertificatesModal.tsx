import React, { useState } from 'react';
import { Printer } from 'lucide-react';
import { TournamentState } from '../lib/fideSwissEngine';
import { generateCertificatesData, PlayerCertificateData } from '../lib/tournamentVaultAndFeatures';

interface BulkCertificatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: TournamentState;
}

export const BulkCertificatesModal: React.FC<BulkCertificatesModalProps> = ({
  isOpen,
  onClose,
  tournament,
}) => {
  const [filterMode, setFilterMode] = useState<'ALL' | 'TOP_10'>('ALL');

  if (!isOpen) return null;

  const allCerts: PlayerCertificateData[] = generateCertificatesData(tournament);
  const displayedCerts = filterMode === 'TOP_10' ? allCerts.slice(0, 10) : allCerts;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '820px', maxHeight: '92vh' }}>
        {/* Header */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy-deep)', fontFamily: 'var(--font-heading)' }}>
              Official Certificate Suite
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Official FIDE Format Certificates of Merit & Participation ({displayedCerts.length} Ready)
            </p>
          </div>
          <button onClick={onClose} className="drawer-close-btn">✕</button>
        </div>

        {/* Filter & Print Bar */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setFilterMode('ALL')}
              className={`btn ${filterMode === 'ALL' ? 'btn-navy' : 'btn-secondary'}`}
              style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
            >
              All {allCerts.length} Candidates
            </button>
            <button
              onClick={() => setFilterMode('TOP_10')}
              className={`btn ${filterMode === 'TOP_10' ? 'btn-navy' : 'btn-secondary'}`}
              style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
            >
              Top 10 Podium Winners
            </button>
          </div>

          <button onClick={() => window.print()} className="btn btn-green" style={{ fontSize: '0.82rem' }}>
            <Printer size={15} />
            <span>Print All as PDF</span>
          </button>
        </div>

        {/* Printable Certificates Container */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', overflowY: 'auto', maxHeight: '560px', padding: '0.5rem' }}>
          {displayedCerts.map((cert) => (
            <div
              key={cert.playerName}
              className="print-page"
              style={{
                background: '#ffffff',
                border: '4px double var(--navy-deep)',
                borderRadius: '8px',
                padding: '2.5rem 2rem',
                textAlign: 'center',
                color: 'var(--navy-deep)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div style={{ fontSize: '2.2rem', marginBottom: '0.2rem' }}>♔</div>
              <div style={{ fontSize: '0.8rem', letterSpacing: '0.2em', color: 'var(--navy-royal)', fontWeight: 800 }}>
                CERTIFICATE OF MERIT & PARTICIPATION
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, marginTop: '0.4rem', fontFamily: 'var(--font-heading)' }}>
                {cert.tournamentName.toUpperCase()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Conducted under the official FIDE Swiss Regulations (Dutch C.04.3 System)
              </div>

              {/* Presented To */}
              <div style={{ margin: '1.75rem 0' }}>
                <div style={{ fontSize: '0.82rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                  This is proudly presented to:
                </div>
                <div
                  style={{
                    fontSize: '1.75rem',
                    fontWeight: 900,
                    color: 'var(--navy-deep)',
                    marginTop: '0.35rem',
                    fontFamily: 'var(--font-heading)',
                  }}
                >
                  {cert.playerName}
                </div>
                {cert.fideId && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    FIDE ID: {cert.fideId} • Official Rating: {cert.rating || 'Unrated'}
                  </div>
                )}
              </div>

              {/* Achievement Summary */}
              <div
                style={{
                  display: 'inline-flex',
                  gap: '2rem',
                  padding: '0.65rem 1.5rem',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--navy-border-subtle)',
                  borderRadius: '6px',
                  margin: '0 auto 1.5rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>FINAL RANK</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--navy-deep)' }}>#{cert.finalRank}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>TOTAL POINTS</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--green-deep)' }}>{cert.totalPoints} / {cert.totalRounds}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>BH-CUT 1</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--navy-royal)' }}>{cert.buchholzScore}</div>
                </div>
              </div>

              {/* Signatures */}
              <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--navy-border-subtle)' }}>
                <div>
                  <div style={{ width: '150px', borderBottom: '1px solid var(--navy-deep)', margin: '0 auto 0.35rem' }} />
                  <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>Chief Arbiter (IA / FA)</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>FIDE Licensed Arbiter</div>
                </div>
                <div>
                  <div style={{ width: '150px', borderBottom: '1px solid var(--navy-deep)', margin: '0 auto 0.35rem' }} />
                  <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>Tournament Director</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Organizing Committee</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="no-print" style={{ marginTop: '1.25rem', textAlign: 'right' }}>
          <button onClick={onClose} className="btn btn-navy">
            Close Certificates
          </button>
        </div>
      </div>
    </div>
  );
};
