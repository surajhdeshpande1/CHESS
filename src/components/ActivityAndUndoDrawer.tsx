import React, { useState, useEffect } from 'react';
import { History, Undo2, RotateCcw, Search } from 'lucide-react';
import { AuditLogEntry, StateSnapshot, TournamentVault } from '../lib/tournamentVaultAndFeatures';

interface ActivityAndUndoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  vault: TournamentVault;
  onUndoLastAction: () => void;
  onReopenRound?: () => void;
}

export const ActivityAndUndoDrawer: React.FC<ActivityAndUndoDrawerProps> = ({
  isOpen,
  onClose,
  vault,
  onUndoLastAction,
  onReopenRound,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

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

  const logs = vault.auditLogs || [];
  const snapshots = vault.snapshots || [];

  const filteredLogs = logs.filter((log) => {
    const matchesFilter = filterType === 'ALL' || log.actionType === filterType;
    const matchesSearch =
      searchTerm.trim() === '' ||
      log.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(log.sequenceNumber).includes(searchTerm);
    return matchesFilter && matchesSearch;
  });

  const getActionBadgeColor = (type: string) => {
    switch (type) {
      case 'ROUND_PAIRED':
      case 'REGISTRATION_LOCKED':
        return 'badge-navy';
      case 'RESULT_RECORDED':
        return 'badge-green';
      default:
        return 'badge-subtle';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ justifyContent: 'flex-end', padding: 0 }}>
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          height: '100vh',
          background: '#ffffff',
          borderLeft: '2px solid var(--navy-deep)',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-modal)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--navy-border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <History size={20} color="var(--navy-deep)" />
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy-deep)', fontFamily: 'var(--font-heading)' }}>
                Activity Audit Ledger
              </h2>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Immutable Flight Recorder • {logs.length} Actions • {snapshots.length} Undo Checkpoints
              </div>
            </div>
          </div>
          <button onClick={onClose} className="drawer-close-btn">✕</button>
        </div>

        {/* Action Controls Bar */}
        <div style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0' }}>
          <button
            onClick={onUndoLastAction}
            disabled={snapshots.length === 0}
            className="btn btn-navy"
            style={{ flex: 1, padding: '0.6rem 0.9rem', fontSize: '0.82rem' }}
          >
            <Undo2 size={14} />
            <span>Undo Last Action ({snapshots.length})</span>
          </button>

          {onReopenRound && vault.currentState.currentRound > 1 && (
            <button
              onClick={() => {
                if (window.confirm(`Are you sure you want to re-open Round ${vault.currentState.currentRound - 1}? This rolls back Round ${vault.currentState.currentRound} pairings safely.`)) {
                  onReopenRound();
                }
              }}
              className="btn btn-secondary"
              style={{ padding: '0.6rem 0.85rem', fontSize: '0.78rem' }}
            >
              <RotateCcw size={13} />
              <span>Re-open R{vault.currentState.currentRound - 1}</span>
            </button>
          )}
        </div>

        {/* Filter & Search Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search action, sequence #, or arbiter..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '0.45rem 0.75rem 0.45rem 2rem', fontSize: '0.82rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '4px' }}>
            {['ALL', 'RESULT_RECORDED', 'ROUND_PAIRED', 'REGISTRATION_LOCKED', 'ROUND_REOPENED', 'ACTION_UNDONE'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className="btn btn-subtle"
                style={{
                  fontSize: '0.7rem',
                  padding: '0.2rem 0.55rem',
                  background: filterType === type ? 'var(--navy-deep)' : 'transparent',
                  color: filterType === type ? '#ffffff' : 'var(--text-secondary)',
                }}
              >
                {type.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Log Entries Timeline */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {filteredLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              No logged actions matching filter.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="clean-card"
                style={{ padding: '0.75rem 0.85rem', background: 'var(--bg-secondary)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 800, color: 'var(--navy-royal)' }}>
                      #{String(log.sequenceNumber).padStart(4, '0')}
                    </span>
                    <span className={`badge ${getActionBadgeColor(log.actionType)}`}>
                      {log.actionType.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {new Date(log.timestampISO).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>

                <div style={{ fontSize: '0.82rem', color: 'var(--navy-deep)', lineHeight: 1.45, marginBottom: '0.35rem' }}>
                  {log.summary}
                </div>

                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  👤 {log.actor} {log.roundNumber > 0 && `• Round ${log.roundNumber}`}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
