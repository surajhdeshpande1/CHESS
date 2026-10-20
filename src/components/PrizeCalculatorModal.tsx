import React, { useState } from 'react';
import { Award, Printer, CheckCircle } from 'lucide-react';
import { CandidatePlayer, TournamentState } from '../lib/fideSwissEngine';
import {
  AwardedPrize,
  computePrizeWinners,
  DEFAULT_PRIZE_CATEGORIES,
  PrizeCategory,
} from '../lib/tournamentVaultAndFeatures';

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
  const [prizes] = useState<PrizeCategory[]>(DEFAULT_PRIZE_CATEGORIES);

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
    tournament.tournamentYear
  );

  const totalPrizeFund = awardedPrizes.reduce(
    (acc, ap) => acc + (ap.winner ? ap.prize.cashValue : 0),
    0
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--navy-deep)', fontFamily: 'var(--font-heading)' }}>
              Official Prize & Trophy Allocation
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              FIDE Regulatory Law: Strictly 1 Trophy / Prize per Candidate (No Double-Dipping)
            </p>
          </div>
          <button onClick={onClose} className="drawer-close-btn">✕</button>
        </div>

        {/* Prize Money Summary Card */}
        <div
          className="clean-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.25rem',
            background: 'var(--navy-deep)',
            color: '#ffffff',
            marginBottom: '1.25rem',
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '380px', overflowY: 'auto' }}>
          {awardedPrizes.map((item, idx) => (
            <div
              key={item.prize.id}
              className="clean-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                background: item.winner ? '#ffffff' : 'var(--bg-secondary)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--navy-deep)' }}>
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
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--green-deep)' }}>
                    {item.winner.name} (#{item.winner.tpn})
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {item.winner.score} pts • BH-C1: {item.winner.tieBreaks.buchholzCut1}
                  </div>
                </div>
              ) : (
                <span className="badge badge-subtle">No Candidate</span>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => window.print()} className="btn btn-secondary">
            <Printer size={14} />
            <span>Print Prize Sheet</span>
          </button>

          <button onClick={onClose} className="btn btn-navy">
            Close Allocator
          </button>
        </div>
      </div>
    </div>
  );
};
