import React, { useState, useEffect } from 'react';
import { Award, Printer, CheckCircle, Trophy, DollarSign, X } from 'lucide-react';
import { CandidatePlayer, TournamentState } from '../lib/fideSwissEngine';
import {
  AwardedPrize,
  computePrizeWinners,
  DEFAULT_PRIZE_CATEGORIES,
  PrizeCategory,
} from '../lib/tournamentVaultAndFeatures';
import { AgeCategoryWinnersView } from './AgeCategoryWinnersView';

interface PrizeCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: TournamentState;
}

export const PrizeCalculatorModal: React.FC<PrizeCalculatorModalProps> = ({
  isOpen,
  onClose,
  tournament,
}) => {
  const [activeTab, setActiveTab] = useState<'AGE_CATEGORIES' | 'CASH_PRIZES'>('AGE_CATEGORIES');
  const [prizes] = useState<PrizeCategory[]>(DEFAULT_PRIZE_CATEGORIES);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sortedStandings = [...tournament.players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.tieBreaks.directEncounter !== a.tieBreaks.directEncounter)
      return b.tieBreaks.directEncounter - a.tieBreaks.directEncounter;
    if (b.tieBreaks.buchholzCut1 !== a.tieBreaks.buchholzCut1)
      return b.tieBreaks.buchholzCut1 - a.tieBreaks.buchholzCut1;
    return a.tpn - b.tpn;
  });

  const awardedPrizes: AwardedPrize[] = computePrizeWinners(
    sortedStandings,
    prizes,
    tournament.tournamentYear || new Date().getFullYear()
  );

  const totalPrizeFund = awardedPrizes.reduce(
    (acc, ap) => acc + (ap.winner ? ap.prize.cashValue : 0),
    0
  );

  return (
    <div className="modal-overlay prize-modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div
        className="modal-content prize-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '1180px',
          width: '95vw',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem',
          boxSizing: 'border-box',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexShrink: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="badge-minimal badge-navy" style={{ fontWeight: 800 }}>
                FIDE DISPUTE-PROOF ENGINE
              </span>
              <span className="badge-minimal badge-green">
                NO DOUBLE-DIPPING
              </span>
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--navy-deep)', fontFamily: 'var(--font-heading)', marginTop: '0.25rem' }}>
              Official Prize Allocation & Age-Category Podiums
            </h2>
          </div>
          <button onClick={onClose} className="drawer-close-btn" style={{ fontSize: '1.2rem', padding: '0.4rem 0.6rem' }}>
            ✕
          </button>
        </div>

        {/* Tab Switcher: Age-Category Trophies vs Cash Prizes */}
        <div
          style={{
            display: 'flex',
            gap: '0.4rem',
            background: 'var(--bg-subtle, #f1f5f9)',
            padding: '0.3rem',
            borderRadius: '8px',
            marginBottom: '1.25rem',
            border: '1px solid var(--navy-border-light, #e2e8f0)',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('AGE_CATEGORIES')}
            style={{
              flex: 1,
              padding: '0.55rem 1rem',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'AGE_CATEGORIES' ? '#ffffff' : 'transparent',
              color: activeTab === 'AGE_CATEGORIES' ? 'var(--navy-deep, #0a192f)' : 'var(--text-muted, #64748b)',
              fontWeight: activeTab === 'AGE_CATEGORIES' ? 800 : 600,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              boxShadow: activeTab === 'AGE_CATEGORIES' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Trophy size={15} color={activeTab === 'AGE_CATEGORIES' ? '#b45309' : 'currentColor'} />
            <span>🧒 Age-Category Podiums & Trophies (Under-9 to Under-19)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CASH_PRIZES')}
            style={{
              flex: 1,
              padding: '0.55rem 1rem',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'CASH_PRIZES' ? '#ffffff' : 'transparent',
              color: activeTab === 'CASH_PRIZES' ? 'var(--navy-deep, #0a192f)' : 'var(--text-muted, #64748b)',
              fontWeight: activeTab === 'CASH_PRIZES' ? 800 : 600,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              boxShadow: activeTab === 'CASH_PRIZES' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Award size={15} color={activeTab === 'CASH_PRIZES' ? '#047857' : 'currentColor'} />
            <span>💰 Cash Prize Allocation (Main & Rating Bands)</span>
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.25rem' }}>
          {activeTab === 'AGE_CATEGORIES' ? (
            <AgeCategoryWinnersView tournament={tournament} />
          ) : (
            <div>
              {/* Prize Money Summary Card */}
              <div
                className="card-clean"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.25rem',
                  background: 'var(--navy-deep)',
                  color: '#ffffff',
                  marginBottom: '1.25rem',
                  borderRadius: '10px',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 700, textTransform: 'uppercase' }}>
                    Total Prize Fund Awarded
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, fontFamily: 'var(--font-mono)' }}>
                    ₹ {totalPrizeFund.toLocaleString()}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>Categories Distributed</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                    {awardedPrizes.filter((a) => a.winner !== null).length} of {awardedPrizes.length}
                  </div>
                </div>
              </div>

              {/* Awarded Prizes List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {awardedPrizes.map((item) => (
                  <div
                    key={item.prize.id}
                    className="card-clean"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      background: item.winner ? '#ffffff' : 'var(--bg-secondary)',
                      borderRadius: '8px',
                      border: '1px solid var(--navy-border-light)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--navy-deep)' }}>
                        {item.prize.title}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {item.prize.gender === 'FEMALE_ONLY' && 'Female Only • '}
                        {item.prize.maxRating && `Max Rating ${item.prize.maxRating} • `}
                        {item.prize.maxAge && `Age ≤ ${item.prize.maxAge} • `}
                        Prize Value: ₹{item.prize.cashValue.toLocaleString()}
                      </div>
                    </div>

                    {item.winner ? (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--green-deep)' }}>
                          {item.winner.name} (#{item.winner.tpn})
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {item.winner.score} pts • BH-C1: {item.winner.tieBreaks.buchholzCut1}
                        </div>
                      </div>
                    ) : (
                      <span className="badge-minimal badge-muted">No Candidate</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--navy-border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <button onClick={() => window.print()} className="btn btn-secondary-white">
            <Printer size={14} />
            <span>Print Official Prize Report</span>
          </button>

          <button onClick={onClose} className="btn btn-primary-navy">
            Close Allocator
          </button>
        </div>
      </div>
    </div>
  );
};
