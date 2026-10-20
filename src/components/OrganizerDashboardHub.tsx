import React, { useState, useMemo, useEffect } from 'react';
import {
  OrganizerWorkspace,
  getOrganizerTournamentSummaries,
  createBlankTournamentVault,
  cloneTournamentTemplate,
} from '../lib/organizerWorkspaceManager';
import { sanitizeText, safeJsonParse } from '../lib/securitySanitizer';
import { ArbiterProfile } from '../lib/arbiterAuth';

interface Props {
  workspace: OrganizerWorkspace;
  onUpdateWorkspace: (next: OrganizerWorkspace) => void;
  onOpenTournament: (tournamentId: string) => void;
  isDarkTheme?: boolean;
  onBackToApp?: () => void;
  activeArbiter?: ArbiterProfile | null;
  isAdmin?: boolean;
}

export const OrganizerDashboardHub: React.FC<Props> = ({
  workspace,
  onUpdateWorkspace,
  onOpenTournament,
  isDarkTheme = true,
  onBackToApp,
  activeArbiter,
  isAdmin = false,
}) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'REGISTRATION' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [adminViewScope, setAdminViewScope] = useState<'MINE' | 'ALL'>(isAdmin ? 'ALL' : 'MINE');

  // New Tournament Modal Form State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newRounds, setNewRounds] = useState<number>(7);
  const [newMinPlayers, setNewMinPlayers] = useState<number>(50);
  const [newMaxPlayers, setNewMaxPlayers] = useState<number>(200);
  const [newMaxRating, setNewMaxRating] = useState<string>('');
  const [newMaxAge, setNewMaxAge] = useState<string>('');
  const [newGender, setNewGender] = useState<'OPEN' | 'FEMALE_ONLY'>('OPEN');
  const [newBakuAccel, setNewBakuAccel] = useState<boolean>(false);

  // Filter summaries strictly for current user unless admin chooses ALL
  const isSuperadminAll = isAdmin && adminViewScope === 'ALL';
  const summaries = useMemo(() => {
    return getOrganizerTournamentSummaries(
      workspace,
      activeArbiter?.id,
      activeArbiter?.email,
      isSuperadminAll
    );
  }, [workspace, activeArbiter, isSuperadminAll]);

  const filteredSummaries = useMemo(() => {
    return summaries.filter((t) => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (searchQuery.trim() && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [summaries, statusFilter, searchQuery]);

  // Aggregate Organizer Portfolio Stats
  const totalTournaments = summaries.length;
  const activeCount = summaries.filter((s) => s.status === 'IN_PROGRESS').length;
  const completedCount = summaries.filter((s) => s.status === 'COMPLETED').length;
  const totalPlayersAcrossAll = summaries.reduce((acc, s) => acc + s.playerCount, 0);

  // Handle Escape key to dismiss create modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showCreateModal) setShowCreateModal(false);
      }
    };
    if (showCreateModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCreateModal]);

  // Create New Tournament
  const handleCreateTournament = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedTitle = sanitizeText(newName, 80);
    if (!sanitizedTitle) return;

    const id = `tourney_${Date.now()}`;
    const vault = createBlankTournamentVault(
      id,
      sanitizedTitle,
      newRounds,
      Math.max(50, newMinPlayers),
      Math.min(200, newMaxPlayers),
      newMaxRating.trim() ? Number(newMaxRating) : null,
      newMaxAge.trim() ? Number(newMaxAge) : null,
      newGender,
      activeArbiter?.id,
      activeArbiter?.email,
      activeArbiter?.name
    );

    const now = new Date().toISOString();
    const updated: OrganizerWorkspace = {
      ...workspace,
      activeTournamentId: id,
      tournamentsById: {
        ...workspace.tournamentsById,
        [id]: {
          createdAtISO: now,
          lastUpdatedISO: now,
          bakuAcceleration: newBakuAccel,
          organizerId: activeArbiter?.id,
          organizerEmail: activeArbiter?.email,
          organizerName: activeArbiter?.name,
          vault,
        },
      },
    };

    onUpdateWorkspace(updated);
    setShowCreateModal(false);
    setNewName('');
    onOpenTournament(id);
  };

  // Delete a Tournament (with ownership protection and safeguard if it's the only one left)
  const handleDeleteTournament = (id: string, name: string) => {
    if (Object.keys(workspace.tournamentsById).length <= 1) {
      alert('You must keep at least one tournament in your workspace.');
      return;
    }

    const target = workspace.tournamentsById[id];
    if (!target) return;
    const isOwner =
      isAdmin ||
      (activeArbiter &&
        (target.organizerId === activeArbiter.id ||
          (target.organizerEmail &&
            target.organizerEmail.toLowerCase() === activeArbiter.email.toLowerCase())));
    if (!isOwner) {
      alert('Security Protection: You can only delete tournaments that you organized.');
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete "${name}"?`)) return;

    const nextMap = { ...workspace.tournamentsById };
    delete nextMap[id];
    const remainingIds = Object.keys(nextMap);
    const nextActiveId = workspace.activeTournamentId === id ? remainingIds[0] : workspace.activeTournamentId;

    onUpdateWorkspace({
      ...workspace,
      activeTournamentId: nextActiveId,
      tournamentsById: nextMap,
    });
  };

  // Export All Organizer Tournaments as a Single Backup File
  const handleExportAllBackup = () => {
    const blob = new Blob([JSON.stringify(workspace, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FIDE_Organizer_All_Tournaments_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import Backup JSON
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rawContent = event.target?.result as string;
        const parsed = safeJsonParse<OrganizerWorkspace | null>(rawContent, null);
        if (parsed && parsed.tournamentsById && parsed.activeTournamentId) {
          // If non-admin organizer imports, ensure unclaimed tournaments are associated with their active account
          if (!isAdmin && activeArbiter) {
            for (const tId of Object.keys(parsed.tournamentsById)) {
              const entry = parsed.tournamentsById[tId];
              if (!entry.organizerId) {
                entry.organizerId = activeArbiter.id;
                entry.organizerEmail = activeArbiter.email;
                entry.organizerName = activeArbiter.name;
                if (entry.vault && entry.vault.currentState) {
                  entry.vault.currentState.organizerId = activeArbiter.id;
                  entry.vault.currentState.organizerEmail = activeArbiter.email;
                  entry.vault.currentState.organizerName = activeArbiter.name;
                }
              }
            }
          }
          onUpdateWorkspace(parsed as OrganizerWorkspace);
          alert('Workspace backup successfully restored!');
        } else {
          alert('Invalid or corrupted organizer backup JSON file.');
        }
      } catch (err) {
        alert('Failed to parse backup JSON file: ' + err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const bgStyle = isDarkTheme ? '#0b1329' : '#f8fafc';
  const cardBg = isDarkTheme ? '#101c38' : '#ffffff';
  const cardBorder = isDarkTheme ? '#1e293b' : '#e2e8f0';
  const textPrimary = isDarkTheme ? '#ffffff' : '#0a192f';
  const textMuted = isDarkTheme ? '#94a3b8' : '#64748b';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: bgStyle,
        color: textPrimary,
        padding: '1.5rem',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: '1360px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* ================================================================== */}
        {/* HEADER BRAND & TOP CONTROLS                                       */}
        {/* ================================================================== */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            borderBottom: `1px solid ${cardBorder}`,
            paddingBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {onBackToApp && (
              <button
                type="button"
                onClick={onBackToApp}
                style={{
                  background: isDarkTheme ? '#1e293b' : '#f1f5f9',
                  border: `1px solid ${cardBorder}`,
                  color: textPrimary,
                  borderRadius: '10px',
                  padding: '0.5rem 0.85rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                ← Back to Active Console
              </button>
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>🗂️</span>
                <h1
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 900,
                    margin: 0,
                    color: isDarkTheme ? '#f8fafc' : '#0a192f',
                    letterSpacing: '-0.02em',
                  }}
                >
                  Multi-Tournament Command Center
                </h1>
                <span
                  style={{
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#f59e0b',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                  }}
                >
                  FIDE C.04.3 EXACT
                </span>
              </div>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: textMuted }}>
                {isAdmin ? (
                  <span>👑 Website Superadmin Console • {isSuperadminAll ? 'Viewing all platform tournaments' : `Viewing only tournaments organized by ${activeArbiter?.name || 'you'}`}</span>
                ) : (
                  <span>Organizer Workspace • Showing only tournaments organized by <strong>{activeArbiter?.name || workspace.organizerName}</strong></span>
                )}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {isAdmin && (
              <div
                style={{
                  display: 'inline-flex',
                  borderRadius: '10px',
                  background: isDarkTheme ? '#1e293b' : '#e2e8f0',
                  padding: '3px',
                  border: `1px solid ${cardBorder}`,
                }}
              >
                <button
                  type="button"
                  onClick={() => setAdminViewScope('ALL')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    background: adminViewScope === 'ALL' ? '#f59e0b' : 'transparent',
                    color: adminViewScope === 'ALL' ? '#0a192f' : textPrimary,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  👑 All Tournaments
                </button>
                <button
                  type="button"
                  onClick={() => setAdminViewScope('MINE')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    background: adminViewScope === 'MINE' ? '#f59e0b' : 'transparent',
                    color: adminViewScope === 'MINE' ? '#0a192f' : textPrimary,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  👤 My Tournaments
                </button>
              </div>
            )}
            <label
              style={{
                padding: '0.55rem 0.95rem',
                borderRadius: '10px',
                background: isDarkTheme ? '#1e293b' : '#e2e8f0',
                border: `1px solid ${cardBorder}`,
                fontSize: '0.75rem',
                fontWeight: 700,
                color: textPrimary,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              📥 Restore Backup
              <input type="file" accept=".json" onChange={handleImportBackup} style={{ display: 'none' }} />
            </label>

            <button
              type="button"
              onClick={handleExportAllBackup}
              style={{
                padding: '0.55rem 0.95rem',
                borderRadius: '10px',
                background: isDarkTheme ? '#1e293b' : '#f1f5f9',
                border: `1px solid ${cardBorder}`,
                fontSize: '0.75rem',
                fontWeight: 700,
                color: textPrimary,
                cursor: 'pointer',
              }}
            >
              💾 Backup All (.JSON)
            </button>

            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              style={{
                padding: '0.55rem 1.15rem',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              }}
            >
              + Create New Tournament
            </button>
          </div>
        </div>

        {/* ================================================================== */}
        {/* 1. ORGANIZER PORTFOLIO SUMMARY CARDS                               */}
        {/* ================================================================== */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem',
          }}
        >
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '16px',
              border: `1px solid ${cardBorder}`,
              background: cardBg,
            }}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: textMuted }}>
              Total Tournaments
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#f59e0b', marginTop: '0.25rem' }}>
              {totalTournaments}
            </div>
            <div style={{ fontSize: '0.72rem', color: textMuted, marginTop: '0.25rem' }}>
              Stored in secure multi-event vault
            </div>
          </div>

          <div
            style={{
              padding: '1.25rem',
              borderRadius: '16px',
              border: `1px solid ${cardBorder}`,
              background: cardBg,
            }}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#10b981' }}>
              Live In-Progress Events
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#10b981', marginTop: '0.25rem' }}>
              {activeCount}
            </div>
            <div style={{ fontSize: '0.72rem', color: textMuted, marginTop: '0.25rem' }}>
              Active Swiss pairing engines running
            </div>
          </div>

          <div
            style={{
              padding: '1.25rem',
              borderRadius: '16px',
              border: `1px solid ${cardBorder}`,
              background: cardBg,
            }}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#818cf8' }}>
              Total Registered Players
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#818cf8', marginTop: '0.25rem' }}>
              {totalPlayersAcrossAll}
            </div>
            <div style={{ fontSize: '0.72rem', color: textMuted, marginTop: '0.25rem' }}>
              Across all tournament sections
            </div>
          </div>

          <div
            style={{
              padding: '1.25rem',
              borderRadius: '16px',
              border: `1px solid ${cardBorder}`,
              background: cardBg,
            }}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#fbbf24' }}>
              Completed Championships
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: textPrimary, marginTop: '0.25rem' }}>
              {completedCount}
            </div>
            <div style={{ fontSize: '0.72rem', color: textMuted, marginTop: '0.25rem' }}>
              Ready for FIDE TRF16 & certificates
            </div>
          </div>
        </div>

        {/* ================================================================== */}
        {/* 2. ACTION BAR: STATUS FILTER & SEARCH                              */}
        {/* ================================================================== */}
        <div
          style={{
            padding: '1rem',
            borderRadius: '16px',
            border: `1px solid ${cardBorder}`,
            background: cardBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {(['ALL', 'REGISTRATION', 'IN_PROGRESS', 'COMPLETED'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '10px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  border: statusFilter === status ? '1px solid #f59e0b' : `1px solid ${cardBorder}`,
                  background:
                    statusFilter === status
                      ? '#f59e0b'
                      : isDarkTheme
                      ? '#1e293b'
                      : '#f1f5f9',
                  color: statusFilter === status ? '#0a192f' : textPrimary,
                  transition: 'all 0.15s ease',
                }}
              >
                {status === 'ALL'
                  ? `🗂️ All (${summaries.length})`
                  : status === 'REGISTRATION'
                  ? '📝 Registration'
                  : status === 'IN_PROGRESS'
                  ? '⚡ Live In-Progress'
                  : '🏆 Completed'}
              </button>
            ))}
          </div>

          <div style={{ minWidth: '240px' }}>
            <input
              type="text"
              placeholder="🔍 Search tournaments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.85rem',
                borderRadius: '10px',
                background: isDarkTheme ? '#0b1329' : '#ffffff',
                border: `1px solid ${cardBorder}`,
                color: textPrimary,
                fontSize: '0.78rem',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* ================================================================== */}
        {/* 3. ALL ORGANIZER TOURNAMENTS GRID                                  */}
        {/* ================================================================== */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {filteredSummaries.length === 0 ? (
            <div
              style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: '4rem 1.5rem',
                background: cardBg,
                borderRadius: '16px',
                border: `1px dashed ${cardBorder}`,
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>♟️</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: textPrimary, marginBottom: '0.4rem' }}>
                No Organized Tournaments Found
              </h3>
              <p style={{ color: textMuted, fontSize: '0.86rem', maxWidth: '440px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
                {activeArbiter?.name ? `${activeArbiter.name}, you` : 'You'} do not have any tournaments in this view. Click below to launch your next official tournament!
              </p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                style={{
                  padding: '0.7rem 1.5rem',
                  borderRadius: '10px',
                  background: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                }}
              >
                + Create New Tournament
              </button>
            </div>
          ) : (
            filteredSummaries.map((t) => {
            const isCurrentlySelected = t.id === workspace.activeTournamentId;
            const progressPct =
              t.totalRounds > 0 ? Math.round((t.currentRound / t.totalRounds) * 100) : 0;

            return (
              <div
                key={t.id}
                style={{
                  padding: '1.25rem',
                  borderRadius: '16px',
                  border: isCurrentlySelected ? '2px solid #f59e0b' : `1px solid ${cardBorder}`,
                  background: cardBg,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  boxShadow: isCurrentlySelected
                    ? '0 8px 24px rgba(245, 158, 11, 0.15)'
                    : 'none',
                  position: 'relative',
                }}
              >
                <div>
                  {/* Status & Active Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        background:
                          t.status === 'IN_PROGRESS'
                            ? 'rgba(16, 185, 129, 0.15)'
                            : t.status === 'COMPLETED'
                            ? 'rgba(245, 158, 11, 0.15)'
                            : 'rgba(99, 102, 241, 0.15)',
                        color:
                          t.status === 'IN_PROGRESS'
                            ? '#10b981'
                            : t.status === 'COMPLETED'
                            ? '#f59e0b'
                            : '#818cf8',
                        border: `1px solid ${
                          t.status === 'IN_PROGRESS'
                            ? 'rgba(16, 185, 129, 0.3)'
                            : t.status === 'COMPLETED'
                            ? 'rgba(245, 158, 11, 0.3)'
                            : 'rgba(99, 102, 241, 0.3)'
                        }`,
                      }}
                    >
                      {t.status === 'IN_PROGRESS'
                        ? `⚡ Live • Round ${t.currentRound}/${t.totalRounds}`
                        : t.status === 'COMPLETED'
                        ? '🏆 Completed'
                        : '📝 Registration'}
                    </span>

                    {isCurrentlySelected && (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          color: '#f59e0b',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        ★ Currently Open
                      </span>
                    )}
                  </div>

                  {/* Tournament Title */}
                  <h3
                    style={{
                      fontSize: '1.08rem',
                      fontWeight: 800,
                      margin: '0 0 0.4rem',
                      lineHeight: 1.35,
                      color: textPrimary,
                    }}
                  >
                    {t.name}
                  </h3>

                  <p style={{ margin: 0, fontSize: '0.78rem', color: textMuted }}>
                    Players: <strong style={{ color: textPrimary }}>{t.playerCount}</strong> (Bounds: {t.minPlayers}–{t.maxPlayers}) •{' '}
                    {t.bakuAcceleration ? '🚀 Baku Acceleration On' : 'Standard FIDE C.04.3 Dutch'}
                  </p>

                  {/* Round Progress Bar */}
                  <div style={{ marginTop: '0.85rem' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.7rem',
                        color: textMuted,
                        marginBottom: '0.25rem',
                      }}
                    >
                      <span>Round Progress</span>
                      <span style={{ fontWeight: 800, color: '#f59e0b' }}>
                        {t.currentRound} of {t.totalRounds} Rounds ({progressPct}%)
                      </span>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: '6px',
                        borderRadius: '3px',
                        background: isDarkTheme ? '#1e293b' : '#e2e8f0',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${progressPct}%`,
                          background: 'linear-gradient(90deg, #f59e0b 0%, #10b981 100%)',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Current Leader / Champion */}
                  <div
                    style={{
                      marginTop: '0.85rem',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      background: isDarkTheme ? '#0b1329' : '#f8fafc',
                      border: `1px solid ${cardBorder}`,
                      fontSize: '0.75rem',
                    }}
                  >
                    {t.leaderName ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: textMuted }}>
                          {t.status === 'COMPLETED' ? '🏆 Champion:' : '👑 Current Leader:'}
                        </span>
                        <span style={{ fontWeight: 800, color: '#10b981' }}>
                          {t.leaderName} ({t.leaderScore?.toFixed(1)} pts)
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: textMuted }}>No players registered yet.</span>
                    )}
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    borderTop: `1px solid ${cardBorder}`,
                    paddingTop: '0.75rem',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onOpenTournament(t.id)}
                    style={{
                      flex: 1,
                      padding: '0.5rem 0.85rem',
                      borderRadius: '10px',
                      background: isCurrentlySelected ? '#f59e0b' : '#1e3a8a',
                      color: isCurrentlySelected ? '#0a192f' : '#ffffff',
                      border: 'none',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isCurrentlySelected ? '⚡ Manage Active Console' : '📂 Switch to This Tournament'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const cloned = cloneTournamentTemplate(
                        workspace,
                        t.id,
                        `${t.name} (Copy)`,
                        activeArbiter?.id,
                        activeArbiter?.email,
                        activeArbiter?.name
                      );
                      onUpdateWorkspace(cloned);
                    }}
                    style={{
                      padding: '0.5rem 0.65rem',
                      borderRadius: '10px',
                      background: isDarkTheme ? '#1e293b' : '#f1f5f9',
                      border: `1px solid ${cardBorder}`,
                      color: textPrimary,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                    title="Clone rules into a new tournament"
                  >
                    📋 Clone
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteTournament(t.id, t.name)}
                    style={{
                      padding: '0.5rem 0.65rem',
                      borderRadius: '10px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#ef4444',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                    title="Delete tournament"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          }))}
        </div>

        {/* ================================================================== */}
        {/* 4. MODAL: CREATE NEW TOURNAMENT                                    */}
        {/* ================================================================== */}
        {showCreateModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100,
              background: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
            }}
          >
            <form
              onSubmit={handleCreateTournament}
              style={{
                maxWidth: '520px',
                width: '100%',
                borderRadius: '16px',
                background: isDarkTheme ? '#101c38' : '#ffffff',
                border: '1px solid #f59e0b',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: `1px solid ${cardBorder}`,
                  paddingBottom: '0.75rem',
                }}
              >
                <h3 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0, color: textPrimary }}>
                  🏆 Create New FIDE Swiss Tournament
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: textMuted,
                    fontSize: '1.25rem',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  ✕
                </button>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: textMuted, marginBottom: '0.35rem' }}>
                  Tournament Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Grand FIDE Open Swiss Championship 2026"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    background: isDarkTheme ? '#0b1329' : '#f8fafc',
                    border: `1px solid ${cardBorder}`,
                    color: textPrimary,
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: textMuted, marginBottom: '0.35rem' }}>
                    Total Rounds
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={15}
                    value={newRounds}
                    onChange={(e) => setNewRounds(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.65rem',
                      borderRadius: '8px',
                      background: isDarkTheme ? '#0b1329' : '#f8fafc',
                      border: `1px solid ${cardBorder}`,
                      color: '#f59e0b',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: textMuted, marginBottom: '0.35rem' }}>
                    Min Players
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={200}
                    value={newMinPlayers}
                    onChange={(e) => setNewMinPlayers(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.65rem',
                      borderRadius: '8px',
                      background: isDarkTheme ? '#0b1329' : '#f8fafc',
                      border: `1px solid ${cardBorder}`,
                      color: textPrimary,
                      fontWeight: 700,
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: textMuted, marginBottom: '0.35rem' }}>
                    Max Players
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={200}
                    value={newMaxPlayers}
                    onChange={(e) => setNewMaxPlayers(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.65rem',
                      borderRadius: '8px',
                      background: isDarkTheme ? '#0b1329' : '#f8fafc',
                      border: `1px solid ${cardBorder}`,
                      color: textPrimary,
                      fontWeight: 700,
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: textMuted, marginBottom: '0.35rem' }}>
                    Max Rating (Opt)
                  </label>
                  <input
                    type="number"
                    placeholder="Open"
                    value={newMaxRating}
                    onChange={(e) => setNewMaxRating(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.65rem',
                      borderRadius: '8px',
                      background: isDarkTheme ? '#0b1329' : '#f8fafc',
                      border: `1px solid ${cardBorder}`,
                      color: textPrimary,
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: textMuted, marginBottom: '0.35rem' }}>
                    Max Age (Opt)
                  </label>
                  <input
                    type="number"
                    placeholder="All Ages"
                    value={newMaxAge}
                    onChange={(e) => setNewMaxAge(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.65rem',
                      borderRadius: '8px',
                      background: isDarkTheme ? '#0b1329' : '#f8fafc',
                      border: `1px solid ${cardBorder}`,
                      color: textPrimary,
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: textMuted, marginBottom: '0.35rem' }}>
                    Gender Rule
                  </label>
                  <select
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value as 'OPEN' | 'FEMALE_ONLY')}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.65rem',
                      borderRadius: '8px',
                      background: isDarkTheme ? '#0b1329' : '#f8fafc',
                      border: `1px solid ${cardBorder}`,
                      color: textPrimary,
                      fontSize: '0.85rem',
                      fontWeight: 700,
                    }}
                  >
                    <option value="OPEN">Open to All</option>
                    <option value="FEMALE_ONLY">Women Only</option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  padding: '0.85rem',
                  borderRadius: '10px',
                  background: isDarkTheme ? '#0b1329' : '#f1f5f9',
                  border: `1px solid ${cardBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#f59e0b' }}>
                    🚀 FIDE C.04.7 Baku Acceleration (Recommended for 80–200 Players)
                  </div>
                  <div style={{ fontSize: '0.7rem', color: textMuted, marginTop: '2px' }}>
                    Awards virtual score boost (+1.0 in R1–R3, +0.5 in R4–R5) to top half seeds for stronger early pairings.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={newBakuAccel}
                  onChange={(e) => setNewBakuAccel(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#f59e0b' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    flex: 1,
                    padding: '0.65rem',
                    borderRadius: '10px',
                    background: isDarkTheme ? '#1e293b' : '#e2e8f0',
                    border: 'none',
                    color: textPrimary,
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '0.65rem',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  ✓ Create & Open Tournament
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizerDashboardHub;
