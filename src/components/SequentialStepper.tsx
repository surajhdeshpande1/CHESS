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
      {/* Top Main Navigation Row */}
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        {/* Left: Elegant Crest & Title */}
        <div
          onClick={onGoHome}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            flexShrink: 0,
            cursor: onGoHome ? 'pointer' : 'default',
          }}
          title={onGoHome ? 'Return to Welcome Dashboard' : undefined}
        >
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '6px',
              background: 'var(--navy-deep)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              boxShadow: '0 2px 4px rgba(10, 25, 47, 0.12)',
              flexShrink: 0,
            }}
          >
            ♔
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '0.95rem',
                fontWeight: 800,
                color: 'var(--navy-deep)',
                letterSpacing: '0.05em',
                lineHeight: 1.1,
                whiteSpace: 'nowrap',
              }}
            >
              ROYAL SWISS
            </div>
            <div
              style={{
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-sans)',
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '140px',
              }}
            >
              {tournament.name || 'FIDE Dutch'}
            </div>
          </div>
        </div>

        {/* Center: Desktop 5-Step Sequential Timeline (Hidden on Mobile) */}
        <nav
          className="hide-on-mobile"
          style={{
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

        {/* Desktop Actions Bar (Hidden on Mobile) */}
        <div className="hide-on-mobile" style={{ alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
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
                title={`${activeArbiter.roleType === 'CERTIFIED_ARBITER' ? 'Official FIDE Arbiter' : 'Tournament Director / Organizer'}: ${activeArbiter.name}`}
              >
                <span>
                  {activeArbiter.roleType === 'CERTIFIED_ARBITER'
                    ? `⚖ ${activeArbiter.title} ${activeArbiter.name.split(' ')[0]}`
                    : `🏛 ${activeArbiter.title === 'TOURNAMENT_DIRECTOR' ? 'Director' : 'Organizer'} ${activeArbiter.name.split(' ')[0]}`}
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

        {/* Mobile Quick Top Actions (Visible Only on Mobile) */}
        <div className="show-on-mobile" style={{ alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
          {onOpenCloudSync && (
            <button
              type="button"
              onClick={onOpenCloudSync}
              className="btn btn-secondary-white"
              style={{
                fontSize: '0.72rem',
                padding: '0.35rem 0.55rem',
                color: isSupabaseConfigured() ? 'var(--green-deep)' : 'var(--navy-deep)',
                borderColor: isSupabaseConfigured() ? 'var(--green-border)' : 'var(--navy-border-light)',
                background: isSupabaseConfigured() ? 'var(--green-tint)' : '#ffffff',
                minHeight: '34px',
              }}
              title="Cloud Sync"
            >
              <Database size={12} color={isSupabaseConfigured() ? 'var(--green-primary)' : 'var(--navy-royal)'} />
              <span style={{ fontSize: '0.68rem' }}>{isSupabaseConfigured() ? 'Live' : 'Cloud'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenActivityDrawer}
            className="btn btn-secondary-white"
            style={{ fontSize: '0.72rem', padding: '0.35rem 0.55rem', minHeight: '34px' }}
            title="Activity History & Undo"
          >
            <RotateCcw size={12} />
            <span style={{ fontSize: '0.68rem' }}>{auditCount}</span>
          </button>

          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="btn btn-minimal"
              style={{ fontSize: '0.72rem', padding: '0.35rem 0.5rem', minHeight: '34px' }}
              title="Exit"
            >
              Exit
            </button>
          )}
        </div>
      </div>

      {/* Mobile Dedicated Horizontal Steps Nav (Visible Only on Mobile) */}
      <div
        className="show-on-mobile"
        style={{
          borderTop: '1px solid var(--navy-border-light)',
          background: 'var(--bg-subtle)',
          padding: '0.35rem 0.5rem',
          width: '100%',
        }}
      >
        <nav
          className="mobile-touch-scroll"
          style={{
            gap: '0.3rem',
            width: '100%',
            padding: '0.1rem 0',
          }}
        >
          {steps.map((s) => {
            const isActive = currentStep === s.id;
            const canClick = s.isAvailable;

            return (
              <button
                key={s.id}
                type="button"
                disabled={!canClick}
                onClick={() => canClick && onSelectStep(s.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.45rem 0.65rem',
                  borderRadius: '6px',
                  border: isActive ? '1px solid var(--navy-deep)' : '1px solid var(--navy-border-light)',
                  background: isActive ? 'var(--navy-deep)' : '#ffffff',
                  color: isActive ? '#ffffff' : canClick ? 'var(--text-main)' : 'var(--text-light)',
                  fontSize: '0.76rem',
                  fontWeight: isActive ? 700 : 600,
                  fontFamily: 'var(--font-sans)',
                  whiteSpace: 'nowrap',
                  cursor: canClick ? 'pointer' : 'not-allowed',
                  flexShrink: 0,
                  minHeight: '36px',
                }}
              >
                {s.isCompleted && !isActive ? (
                  <Check size={11} color="var(--green-primary)" strokeWidth={3} />
                ) : (
                  <span
                    style={{
                      fontSize: '0.66rem',
                      opacity: isActive ? 0.9 : 0.6,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {s.stepNumber}
                  </span>
                )}
                <span>{s.title}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
