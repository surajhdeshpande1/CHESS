import React from 'react';
import { Check, RotateCcw, Printer, Download, Sparkles, Database } from 'lucide-react';
import { TournamentState } from '../lib/fideSwissEngine';
import { ArbiterProfile } from '../lib/arbiterAuth';
import { isSupabaseConfigured } from '../lib/supabaseClient';

export type SequentialStep =
  | 'create_tournament'
  | 'roster_entry'
  | 'round_matches'
  | 'standings'
  | 'final_results';

interface SequentialStepperProps {
  currentStep: SequentialStep;
  onSelectStep: (step: SequentialStep) => void;
  tournament: TournamentState;
  auditCount: number;
  onOpenActivityDrawer: () => void;
  onOpenIntegrityModal: () => void;
  onOpenPlayerSearch: () => void;
  onOpenPrint: () => void;
  onExportTRF: () => void;
  onGoHome?: () => void;
  onOpenCloudSync?: () => void;
  activeArbiter?: ArbiterProfile | null;
  onSignOut?: () => void;
}

export const SequentialStepper: React.FC<SequentialStepperProps> = ({
  currentStep,
  onSelectStep,
  tournament,
  auditCount,
  onOpenActivityDrawer,
  onOpenPrint,
  onExportTRF,
  onGoHome,
  onOpenCloudSync,
  activeArbiter,
  onSignOut,
}) => {
  const steps: Array<{
    id: SequentialStep;
    stepNumber: string;
    title: string;
    isCompleted: boolean;
    isAvailable: boolean;
  }> = [
    {
      id: 'create_tournament',
      stepNumber: '01',
      title: 'Setup',
      isCompleted: tournament.players.length > 0 || tournament.status !== 'REGISTRATION',
      isAvailable: true,
    },
    {
      id: 'roster_entry',
      stepNumber: '02',
      title: `Players (${tournament.players.length})`,
      isCompleted: tournament.status !== 'REGISTRATION',
      isAvailable: true,
    },
    {
      id: 'round_matches',
      stepNumber: '03',
      title: tournament.status === 'COMPLETED' ? 'Matches' : `Round ${tournament.currentRound || 1}`,
      isCompleted: tournament.status === 'COMPLETED',
      isAvailable: tournament.status !== 'REGISTRATION',
    },
    {
      id: 'standings',
      stepNumber: '04',
      title: 'Standings',
      isCompleted: tournament.status === 'COMPLETED',
      isAvailable: tournament.status !== 'REGISTRATION',
    },
    {
      id: 'final_results',
      stepNumber: '05',
      title: 'Podium',
      isCompleted: tournament.status === 'COMPLETED',
      isAvailable: tournament.status === 'COMPLETED',
    },
  ];

  return (
    <header
      className="no-print"
      style={{
        background: '#ffffff',
        borderBottom: '1px solid var(--navy-border-light)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0.85rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
        }}
      >
        {/* Left: Elegant Crest & Title */}
        <div
          onClick={onGoHome}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            flexShrink: 0,
            cursor: onGoHome ? 'pointer' : 'default',
          }}
          title={onGoHome ? 'Return to Welcome Animation' : undefined}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '6px',
              background: 'var(--navy-deep)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              boxShadow: '0 2px 4px rgba(10, 25, 47, 0.12)',
            }}
          >
            ♔
          </div>
          <div>
            <div
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1rem',
                fontWeight: 800,
                color: 'var(--navy-deep)',
                letterSpacing: '0.06em',
                lineHeight: 1.1,
              }}
            >
              ROYAL SWISS
            </div>
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-sans)',
                letterSpacing: '0.02em',
              }}
            >
              {tournament.name || 'FIDE Dutch Pairing System'}
            </div>
          </div>
        </div>

        {/* Center: Sleek 5-Step Sequential Timeline */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'var(--bg-subtle)',
            padding: '0.25rem 0.35rem',
            borderRadius: '8px',
            border: '1px solid var(--navy-border-light)',
          }}
        >
          {steps.map((s, idx) => {
            const isActive = currentStep === s.id;
            const canClick = s.isAvailable;

            return (
              <React.Fragment key={s.id}>
                {idx > 0 && (
                  <span
                    style={{
                      color: 'var(--navy-border)',
                      fontSize: '0.7rem',
                      padding: '0 0.1rem',
                      userSelect: 'none',
                    }}
                  >
                    /
                  </span>
                )}
                <button
                  type="button"
                  disabled={!canClick}
                  onClick={() => canClick && onSelectStep(s.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '5px',
                    border: 'none',
                    background: isActive ? 'var(--navy-deep)' : 'transparent',
                    color: isActive ? '#ffffff' : canClick ? 'var(--text-main)' : 'var(--text-light)',
                    fontSize: '0.8rem',
                    fontWeight: isActive ? 700 : 500,
                    fontFamily: 'var(--font-sans)',
                    cursor: canClick ? 'pointer' : 'not-allowed',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {s.isCompleted && !isActive ? (
                    <Check size={12} color="var(--green-primary)" strokeWidth={3} />
                  ) : (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        opacity: isActive ? 0.9 : 0.6,
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {s.stepNumber}
                    </span>
                  )}
                  <span>{s.title}</span>
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        {/* Right: Clean, Subtle Actions (No Clutter) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          {/* Subtle History / Ledger Toggle */}
          <button
            type="button"
            onClick={onOpenActivityDrawer}
            className="btn btn-minimal"
            style={{ fontSize: '0.78rem', padding: '0.4rem 0.65rem' }}
            title="Activity Log & Time-Machine Undo"
          >
            <RotateCcw size={13} />
            <span>History ({auditCount})</span>
          </button>

          {/* Clean Export / Print */}
          <button
            type="button"
            onClick={onOpenPrint}
            className="btn btn-secondary-white"
            style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
            title="Print Current View"
          >
            <Printer size={13} />
            <span>Print</span>
          </button>

          {tournament.status !== 'REGISTRATION' && (
            <button
              type="button"
              onClick={onExportTRF}
              className="btn btn-secondary-white"
              style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
              title="Download Official FIDE TRF16 File"
            >
              <Download size={13} />
              <span>TRF16</span>
            </button>
          )}

          {onOpenCloudSync && (
            <button
              type="button"
              onClick={onOpenCloudSync}
              className="btn btn-secondary-white"
              style={{
                fontSize: '0.76rem',
                padding: '0.4rem 0.75rem',
                color: isSupabaseConfigured() ? 'var(--green-deep)' : 'var(--navy-deep)',
                borderColor: isSupabaseConfigured() ? 'var(--green-border)' : 'var(--navy-border-light)',
                background: isSupabaseConfigured() ? 'var(--green-tint)' : '#ffffff',
              }}
              title="Supabase Cloud Database & Live Spectator Sync"
            >
              <Database size={13} color={isSupabaseConfigured() ? 'var(--green-primary)' : 'var(--navy-royal)'} />
              <span>{isSupabaseConfigured() ? 'Cloud Live' : 'Cloud Sync'}</span>
            </button>
          )}

          {activeArbiter && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                borderLeft: '1px solid var(--navy-border-light)',
                paddingLeft: '0.5rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.65rem',
                  background: activeArbiter.roleType === 'CERTIFIED_ARBITER' ? 'var(--navy-tint)' : 'var(--green-tint)',
                  borderRadius: '4px',
                  border: activeArbiter.roleType === 'CERTIFIED_ARBITER' ? '1px solid var(--navy-border)' : '1px solid var(--green-border)',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: activeArbiter.roleType === 'CERTIFIED_ARBITER' ? 'var(--navy-deep)' : 'var(--green-deep)',
                }}
                title={`${activeArbiter.roleType === 'CERTIFIED_ARBITER' ? 'Official FIDE Arbiter' : 'Tournament Director / Organizer'}: ${activeArbiter.name} (${activeArbiter.organizationName || activeArbiter.federation})`}
              >
                <span>
                  {activeArbiter.roleType === 'CERTIFIED_ARBITER'
                    ? `⚖ ${activeArbiter.title} ${activeArbiter.name.split(' ')[0]}`
                    : `🏛 ${activeArbiter.title === 'TOURNAMENT_DIRECTOR' ? 'Director' : activeArbiter.title === 'SCHOOL_COACH' ? 'Coach' : 'Organizer'} ${activeArbiter.name.split(' ')[0]}`}
                </span>
              </div>

              {onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="btn btn-minimal"
                  style={{ fontSize: '0.72rem', padding: '0.35rem 0.5rem' }}
                  title="Sign out of Arbiter account"
                >
                  Exit
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
