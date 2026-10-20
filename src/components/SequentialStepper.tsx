import React from 'react';
import { Check, RotateCcw, Printer, Download, Database, ArrowLeft, Crown } from 'lucide-react';
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
  onGoBack?: () => void;
  onOpenCloudSync?: () => void;
  onOpenAdminConsole?: () => void;
  activeArbiter?: ArbiterProfile | null;
  onSignOut?: () => void;
  onOpenOrganizerHub?: () => void;
  allTournaments?: Array<{ id: string; name: string; status: string; currentRound: number; totalRounds: number }>;
  activeTournamentId?: string;
  onSelectTournamentId?: (id: string) => void;
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
  onGoBack,
  onOpenCloudSync,
  onOpenAdminConsole,
  activeArbiter,
  onSignOut,
  onOpenOrganizerHub,
  allTournaments,
  activeTournamentId,
  onSelectTournamentId,
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
        width: '100%',
        maxWidth: '100vw',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Main Navigation Row */}
      <div
        style={{
          width: '100%',
          maxWidth: '1440px',
          margin: '0 auto',
          padding: '0.5rem 0.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          boxSizing: 'border-box',
        }}
      >
        {/* Left: Prominent Back Button & Elegant Brand Crest */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0 }}>
          {onGoBack && (
            <button
              type="button"
              onClick={onGoBack}
              className="btn btn-secondary-white"
              style={{
                padding: '0.35rem 0.65rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: 'var(--navy-deep)',
                minHeight: '34px',
                borderRadius: '6px',
                border: '1px solid var(--navy-border-light)',
              }}
              title="Go back to previous step or dashboard"
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
          )}

          <div
            onClick={onGoHome}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              cursor: onGoHome ? 'pointer' : 'default',
            }}
            title={onGoHome ? 'Return to Welcome Dashboard' : undefined}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: 'var(--navy-deep)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.15rem',
                boxShadow: '0 2px 4px rgba(10, 25, 47, 0.12)',
                flexShrink: 0,
              }}
            >
              ♔
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '0.94rem',
                  fontWeight: 900,
                  color: 'var(--navy-deep)',
                  letterSpacing: '0.06em',
                  lineHeight: 1.1,
                  whiteSpace: 'nowrap',
                }}
              >
                CHATURANGA
              </div>
              <div
                style={{
                  fontSize: '0.68rem',
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-sans)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '120px',
                }}
              >
                {tournament.name || 'FIDE Dutch'}
              </div>
            </div>

            {allTournaments && allTournaments.length > 1 && onSelectTournamentId && (
              <select
                value={activeTournamentId}
                onChange={(e) => onSelectTournamentId(e.target.value)}
                style={{
                  padding: '2px 6px',
                  borderRadius: '6px',
                  border: '1px solid var(--navy-border-light)',
                  background: '#f8fafc',
                  color: 'var(--navy-deep)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  maxWidth: '150px',
                  cursor: 'pointer',
                  outline: 'none',
                }}
                title="Switch active tournament section"
              >
                {allTournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Center: Desktop 5-Step Sequential Timeline (Inline on wide >= 1221px screens) */}
        <nav
          className="stepper-timeline-desktop hide-on-mobile"
          style={{
            alignItems: 'center',
            gap: '0.25rem',
            background: 'var(--bg-subtle)',
            padding: '0.25rem 0.35rem',
            borderRadius: '8px',
            border: '1px solid var(--navy-border-light)',
            flexShrink: 0,
          }}
        >
          {onOpenOrganizerHub && (
            <>
              <button
                type="button"
                onClick={onOpenOrganizerHub}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '5px',
                  border: '1px solid #f59e0b',
                  background: 'rgba(245, 158, 11, 0.12)',
                  color: '#b45309',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-sans)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
                title="Manage all tournaments in Multi-Tournament Command Center"
              >
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontFamily: 'var(--font-mono)',
                    color: '#b45309',
                    fontWeight: 800,
                  }}
                >
                  00
                </span>
                <span>🗂️ All My Tournaments</span>
              </button>
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
            </>
          )}

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
                    padding: '0.35rem 0.65rem',
                    borderRadius: '5px',
                    border: 'none',
                    background: isActive ? 'var(--navy-deep)' : 'transparent',
                    color: isActive ? '#ffffff' : canClick ? 'var(--text-main)' : 'var(--text-light)',
                    fontSize: '0.78rem',
                    fontWeight: isActive ? 700 : 500,
                    fontFamily: 'var(--font-sans)',
                    cursor: canClick ? 'pointer' : 'not-allowed',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {s.isCompleted && !isActive ? (
                    <Check size={11} color="var(--green-primary)" strokeWidth={3} />
                  ) : (
                    <span
                      style={{
                        fontSize: '0.68rem',
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

        {/* Desktop Actions Bar: Perfectly constrained so it fits on all laptop screens without cutting off */}
        <div
          className="hide-on-mobile"
          style={{
            alignItems: 'center',
            gap: '0.35rem',
            flexShrink: 0,
            maxWidth: '100%',
          }}
        >
          {/* Subtle History / Ledger Toggle */}
          <button
            type="button"
            onClick={onOpenActivityDrawer}
            className="btn btn-minimal"
            style={{ fontSize: '0.76rem', padding: '0.35rem 0.5rem', minHeight: '34px' }}
            title="Activity Log & Time-Machine Undo"
          >
            <RotateCcw size={13} />
            <span className="hide-on-compact">History </span>
            <span>({auditCount})</span>
          </button>

          {/* Clean Export / Print */}
          <button
            type="button"
            onClick={onOpenPrint}
            className="btn btn-secondary-white"
            style={{ fontSize: '0.76rem', padding: '0.35rem 0.55rem', minHeight: '34px' }}
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
              style={{ fontSize: '0.76rem', padding: '0.35rem 0.55rem', minHeight: '34px' }}
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
                padding: '0.35rem 0.55rem',
                minHeight: '34px',
                color: isSupabaseConfigured() ? 'var(--green-deep)' : 'var(--navy-deep)',
                borderColor: isSupabaseConfigured() ? 'var(--green-border)' : 'var(--navy-border-light)',
                background: isSupabaseConfigured() ? 'var(--green-tint)' : '#ffffff',
              }}
              title="Supabase Cloud Database & Live Spectator Sync"
            >
              <Database size={13} color={isSupabaseConfigured() ? 'var(--green-primary)' : 'var(--navy-royal)'} />
              <span>{isSupabaseConfigured() ? 'Live' : 'Cloud'}</span>
            </button>
          )}

          {onOpenAdminConsole && (
            <button
              type="button"
              onClick={onOpenAdminConsole}
              className="btn btn-secondary-white"
              style={{
                fontSize: '0.76rem',
                padding: '0.35rem 0.65rem',
                minHeight: '34px',
                color: '#b45309',
                borderColor: '#f59e0b',
                background: 'rgba(245, 158, 11, 0.1)',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title="Open Website Superadmin Console (All Access)"
            >
              <Crown size={13} color="#d97706" />
              <span>Admin</span>
            </button>
          )}

          {activeArbiter && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                borderLeft: '1px solid var(--navy-border-light)',
                paddingLeft: '0.35rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.35rem 0.5rem',
                  background: activeArbiter.roleType === 'CERTIFIED_ARBITER' ? 'var(--navy-tint)' : 'var(--green-tint)',
                  borderRadius: '4px',
                  border: activeArbiter.roleType === 'CERTIFIED_ARBITER' ? '1px solid var(--navy-border)' : '1px solid var(--green-border)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: activeArbiter.roleType === 'CERTIFIED_ARBITER' ? 'var(--navy-deep)' : 'var(--green-deep)',
                  maxWidth: '115px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={`${activeArbiter.roleType === 'CERTIFIED_ARBITER' ? 'Official FIDE Arbiter' : 'Tournament Director / Organizer'}: ${activeArbiter.name}`}
              >
                <span>
                  {activeArbiter.roleType === 'CERTIFIED_ARBITER'
                    ? `⚖ ${activeArbiter.title} ${activeArbiter.name.split(' ')[0]}`
                    : `🏛 ${activeArbiter.title === 'TOURNAMENT_DIRECTOR' ? 'Dir' : 'Org'} ${activeArbiter.name.split(' ')[0]}`}
                </span>
              </div>

              {onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="btn btn-minimal"
                  style={{ fontSize: '0.72rem', padding: '0.35rem 0.45rem', minHeight: '34px' }}
                  title="Sign out of Arbiter account"
                >
                  Exit
                </button>
              )}
            </div>
          )}
        </div>

        {/* Mobile Quick Top Actions (Visible Only on Mobile <= 768px) */}
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

          {onOpenAdminConsole && (
            <button
              type="button"
              onClick={onOpenAdminConsole}
              className="btn btn-secondary-white"
              style={{
                fontSize: '0.72rem',
                padding: '0.35rem 0.55rem',
                color: '#b45309',
                borderColor: '#f59e0b',
                background: 'rgba(245, 158, 11, 0.1)',
                minHeight: '34px',
              }}
              title="Admin Console"
            >
              <Crown size={12} color="#d97706" />
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

      {/* Sub-row Timeline for Laptop & Medium Screens (769px to 1220px) so nothing ever gets cut off */}
      <div
        className="stepper-timeline-subrow"
        style={{
          borderTop: '1px solid var(--navy-border-light)',
          background: 'var(--bg-subtle)',
          padding: '0.35rem 1rem',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            overflowX: 'auto',
            maxWidth: '100%',
          }}
        >
          {onOpenOrganizerHub && (
            <>
              <button
                type="button"
                onClick={onOpenOrganizerHub}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '5px',
                  border: '1px solid #f59e0b',
                  background: 'rgba(245, 158, 11, 0.12)',
                  color: '#b45309',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-sans)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
                title="Open Multi-Tournament Organizer Command Center"
              >
                <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: '#b45309', fontWeight: 800 }}>00</span>
                <span>🗂️ All My Tournaments</span>
              </button>
              <span style={{ color: 'var(--navy-border)', fontSize: '0.7rem', padding: '0 0.1rem', userSelect: 'none' }}>/</span>
            </>
          )}

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
                    padding: '0.35rem 0.65rem',
                    borderRadius: '5px',
                    border: 'none',
                    background: isActive ? 'var(--navy-deep)' : '#ffffff',
                    color: isActive ? '#ffffff' : canClick ? 'var(--text-main)' : 'var(--text-light)',
                    fontSize: '0.78rem',
                    fontWeight: isActive ? 700 : 500,
                    fontFamily: 'var(--font-sans)',
                    cursor: canClick ? 'pointer' : 'not-allowed',
                    transition: 'all 0.15s ease',
                    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  {s.isCompleted && !isActive ? (
                    <Check size={11} color="var(--green-primary)" strokeWidth={3} />
                  ) : (
                    <span
                      style={{
                        fontSize: '0.68rem',
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
      </div>

      {/* Mobile Dedicated Horizontal Steps Nav (Visible Only on Mobile <= 768px) */}
      <div
        className="show-on-mobile"
        style={{
          borderTop: '1px solid var(--navy-border-light)',
          background: 'var(--bg-subtle)',
          padding: '0.35rem 0.5rem',
          width: '100%',
          boxSizing: 'border-box',
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
          {onOpenOrganizerHub && (
            <button
              type="button"
              onClick={onOpenOrganizerHub}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.45rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid #f59e0b',
                background: 'rgba(245, 158, 11, 0.12)',
                color: '#b45309',
                fontSize: '0.76rem',
                fontWeight: 800,
                fontFamily: 'var(--font-sans)',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                flexShrink: 0,
                minHeight: '36px',
              }}
            >
              <span style={{ fontSize: '0.66rem', fontFamily: 'var(--font-mono)', color: '#b45309' }}>00</span>
              <span>🗂️ All My Tournaments</span>
            </button>
          )}

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
