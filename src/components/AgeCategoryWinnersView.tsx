import React, { useState, useMemo } from 'react';
import { TournamentState } from '../lib/fideSwissEngine';
import {
  AgePrizeSettings,
  AgeCategoryDefinition,
  AgeGenderDivision,
  DEFAULT_AGE_PRIZE_SETTINGS,
  buildAgeCategoriesFromCaps,
  computeOpenAndAgeCategoryWinners,
} from '../lib/ageCategoryEngine';
import { Printer, Trophy, Users, Sparkles, Plus, Trash2, ShieldCheck, ChevronRight, Eye, Award } from 'lucide-react';

interface Props {
  tournament: TournamentState;
  isDarkTheme?: boolean;
}

export const AgeCategoryWinnersView: React.FC<Props> = ({ tournament, isDarkTheme = false }) => {
  const [settings, setSettings] = useState<AgePrizeSettings>(
    tournament.agePrizeSettings || DEFAULT_AGE_PRIZE_SETTINGS
  );
  const [showFullCategoryTables, setShowFullCategoryTables] = useState<boolean>(false);

  React.useEffect(() => {
    if (tournament.agePrizeSettings) {
      setSettings(tournament.agePrizeSettings);
    }
  }, [tournament.agePrizeSettings]);

  // Organizer Custom Category Form State
  const [newLabel, setNewLabel] = useState<string>('');
  const [newMaxAge, setNewMaxAge] = useState<string>('12');
  const [newMinAge, setNewMinAge] = useState<string>('');
  const [newGender, setNewGender] = useState<AgeGenderDivision>('OPEN_ALL');
  const [newWinnersCount, setNewWinnersCount] = useState<number>(3);

  const results = useMemo(
    () => computeOpenAndAgeCategoryWinners(tournament, settings),
    [tournament, settings]
  );

  // Add Custom Age Category set by Organizer
  const handleAddCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const maxA = newMaxAge.trim() ? Number(newMaxAge) : null;
    const minA = newMinAge.trim() ? Number(newMinAge) : null;

    const autoLabel =
      newLabel.trim() ||
      (maxA !== null
        ? `Under-${maxA} ${newGender === 'GIRLS_ONLY' ? 'Girls' : newGender === 'BOYS_ONLY' ? 'Boys / Open' : '(All)'}`
        : `Above-${minA ?? 50} Veteran`);

    const newCat: AgeCategoryDefinition = {
      id: `custom_age_${Date.now()}`,
      label: autoLabel,
      minAge: minA,
      maxAge: maxA,
      genderDivision: newGender,
      winnersCount: Math.max(1, newWinnersCount),
      isEnabled: true,
    };

    setSettings({
      ...settings,
      categories: [...settings.categories, newCat],
    });
    setNewLabel('');
  };

  const handleRemoveCategory = (id: string) => {
    setSettings({
      ...settings,
      categories: settings.categories.filter((c) => c.id !== id),
    });
  };

  const handleUpdateWinnersCount = (id: string, count: number) => {
    setSettings({
      ...settings,
      categories: settings.categories.map((c) =>
        c.id === id ? { ...c, winnersCount: Math.max(1, count) } : c
      ),
    });
  };

  const bgCard = isDarkTheme ? '#0f172a' : '#ffffff';
  const borderCard = isDarkTheme ? '#1e293b' : 'var(--navy-border-light, #e2e8f0)';
  const textHeading = isDarkTheme ? '#f8fafc' : 'var(--navy-deep, #0a192f)';
  const textSub = isDarkTheme ? '#94a3b8' : 'var(--text-muted, #64748b)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* ==================================================================== */}
      {/* 1. ORGANIZER AGE-CATEGORY CONTROL PANEL                              */}
      {/* ==================================================================== */}
      <div
        className="card-clean"
        style={{
          background: bgCard,
          border: `1px solid ${borderCard}`,
          borderRadius: '14px',
          padding: '1.25rem 1.5rem',
          boxShadow: '0 4px 12px rgba(10, 25, 47, 0.05)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            paddingBottom: '1rem',
            borderBottom: `1px solid ${borderCard}`,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <span
                style={{
                  background: 'rgba(245, 158, 11, 0.12)',
                  color: '#b45309',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '4px',
                }}
              >
                FIDE BIRTH-YEAR ENGINE
              </span>
              <span
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#047857',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '0.2rem 0.55rem',
                  borderRadius: '4px',
                }}
              >
                100% DISPUTE-PROOF PODIUMS
              </span>
            </div>
            <h2
              style={{
                fontSize: '1.3rem',
                fontWeight: 900,
                color: textHeading,
                fontFamily: 'var(--font-heading, inherit)',
                margin: '0.2rem 0 0.1rem',
              }}
            >
              Organizer Age-Category Allocation & Live Podiums
            </h2>
            <p style={{ fontSize: '0.8rem', color: textSub, margin: 0 }}>
              All players compete together in the unified Open pairing pool, while candidates below chosen age caps simultaneously compete for Age Category trophies.
            </p>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="btn btn-secondary-white no-print"
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              gap: '0.45rem',
            }}
          >
            <Printer size={14} />
            <span>Print Age Winners Bulletin</span>
          </button>
        </div>

        {/* Global Open vs Age Prize Rules */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1rem',
            margin: '1.25rem 0',
          }}
        >
          {/* Rule 1: Top Open Main Prizes Count */}
          <div
            style={{
              padding: '0.9rem 1rem',
              borderRadius: '8px',
              background: isDarkTheme ? '#020617' : 'var(--bg-subtle, #f8fafc)',
              border: `1px solid ${borderCard}`,
            }}
          >
            <label
              style={{
                display: 'block',
                fontSize: '0.72rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#b45309',
                marginBottom: '0.4rem',
              }}
            >
              1. Top Open Main Prizes Count
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <input
                type="number"
                min={1}
                max={25}
                value={settings.openMainPrizesCount}
                onChange={(e) =>
                  setSettings({ ...settings, openMainPrizesCount: Math.max(1, Number(e.target.value)) })
                }
                style={{
                  width: '70px',
                  padding: '0.4rem 0.6rem',
                  borderRadius: '6px',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  border: `1px solid ${borderCard}`,
                  background: isDarkTheme ? '#1e293b' : '#ffffff',
                  color: textHeading,
                  textAlign: 'center',
                }}
              />
              <span style={{ fontSize: '0.78rem', color: textSub }}>
                Overall Open Winners (1st to #{settings.openMainPrizesCount})
              </span>
            </div>
          </div>

          {/* Rule 2: Cascade Rule (No Double-Dipping) */}
          <div
            style={{
              padding: '0.9rem 1rem',
              borderRadius: '8px',
              background: isDarkTheme ? '#020617' : 'var(--bg-subtle, #f8fafc)',
              border: `1px solid ${borderCard}`,
            }}
          >
            <label
              style={{
                display: 'block',
                fontSize: '0.72rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#047857',
                marginBottom: '0.4rem',
              }}
            >
              2. Open Main vs Age Trophy Rule
            </label>
            <button
              type="button"
              onClick={() =>
                setSettings({
                  ...settings,
                  excludeOpenMainWinnersFromAgePrizes: !settings.excludeOpenMainWinnersFromAgePrizes,
                })
              }
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left',
                border: settings.excludeOpenMainWinnersFromAgePrizes
                  ? '1px solid rgba(16, 185, 129, 0.4)'
                  : `1px solid ${borderCard}`,
                background: settings.excludeOpenMainWinnersFromAgePrizes
                  ? 'rgba(16, 185, 129, 0.12)'
                  : isDarkTheme ? '#1e293b' : '#ffffff',
                color: settings.excludeOpenMainWinnersFromAgePrizes ? '#047857' : textSub,
                transition: 'all 0.15s ease',
              }}
            >
              {settings.excludeOpenMainWinnersFromAgePrizes
                ? '✅ Cascade On: Open Main Winners Upgrade (1 Trophy/Player)'
                : '🔓 Cascade Off: Kids Can Win Both Open & Age Trophy'}
            </button>
          </div>

          {/* Rule 3: Age Bracket Overlap Protection */}
          <div
            style={{
              padding: '0.9rem 1rem',
              borderRadius: '8px',
              background: isDarkTheme ? '#020617' : 'var(--bg-subtle, #f8fafc)',
              border: `1px solid ${borderCard}`,
            }}
          >
            <label
              style={{
                display: 'block',
                fontSize: '0.72rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#1d4ed8',
                marginBottom: '0.4rem',
              }}
            >
              3. Age Bracket Overlap Mode
            </label>
            <button
              type="button"
              onClick={() =>
                setSettings({
                  ...settings,
                  overlapMode:
                    settings.overlapMode === 'NATURAL_BAND' ? 'CUMULATIVE_UNDER_X' : 'NATURAL_BAND',
                })
              }
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left',
                border: '1px solid rgba(37, 99, 235, 0.3)',
                background: 'rgba(37, 99, 235, 0.08)',
                color: '#1d4ed8',
                transition: 'all 0.15s ease',
              }}
            >
              {settings.overlapMode === 'NATURAL_BAND'
                ? '🎯 Strict Age Bands (Each Kid in Their Own Age Group)'
                : '🌊 Cumulative Under-X (All Below Age X Eligible)'}
            </button>
          </div>
        </div>

        {/* 1-Click Quick Age Presets */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: textSub, marginRight: '0.25rem' }}>
            ⚡ 1-Click Presets:
          </span>
          <button
            type="button"
            onClick={() =>
              setSettings({
                ...settings,
                categories: buildAgeCategoriesFromCaps([9, 11, 13, 15, 19], false, 3),
              })
            }
            className="btn btn-secondary-white"
            style={{ fontSize: '0.74rem', padding: '0.35rem 0.65rem' }}
          >
            🏆 Standard U-9, U-11, U-13, U-15, U-19 (Top 3 Each)
          </button>
          <button
            type="button"
            onClick={() =>
              setSettings({
                ...settings,
                categories: buildAgeCategoriesFromCaps([11, 13, 15, 19], true, 3),
              })
            }
            className="btn btn-secondary-white"
            style={{ fontSize: '0.74rem', padding: '0.35rem 0.65rem' }}
          >
            👦👧 Split Boys & Girls (U-11, U-13, U-15, U-19)
          </button>
          <button
            type="button"
            onClick={() =>
              setSettings({
                ...settings,
                categories: buildAgeCategoriesFromCaps([16, 18, 20, 22], false, 3),
              })
            }
            className="btn btn-secondary-white"
            style={{ fontSize: '0.74rem', padding: '0.35rem 0.65rem' }}
          >
            🎓 College / Youth (U-16, U-18, U-20, U-22)
          </button>
        </div>

        {/* Custom Age Category Creator Form */}
        <form
          onSubmit={handleAddCustomCategory}
          style={{
            padding: '1rem',
            borderRadius: '10px',
            background: isDarkTheme ? '#020617' : '#f1f5f9',
            border: `1px solid ${borderCard}`,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '0.75rem',
            alignItems: 'flex-end',
          }}
        >
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: textSub, marginBottom: '0.25rem' }}>
              Custom Category Name (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Under-14 Rising Stars"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              style={{
                width: '100%',
                padding: '0.45rem 0.65rem',
                fontSize: '0.78rem',
                borderRadius: '6px',
                border: `1px solid ${borderCard}`,
                background: isDarkTheme ? '#1e293b' : '#ffffff',
                color: textHeading,
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: textSub, marginBottom: '0.25rem' }}>
              Max Age (Under-X)
            </label>
            <input
              type="number"
              placeholder="e.g. 14"
              value={newMaxAge}
              onChange={(e) => setNewMaxAge(e.target.value)}
              style={{
                width: '100%',
                padding: '0.45rem 0.65rem',
                fontSize: '0.78rem',
                fontWeight: 800,
                borderRadius: '6px',
                border: `1px solid ${borderCard}`,
                background: isDarkTheme ? '#1e293b' : '#ffffff',
                color: '#b45309',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: textSub, marginBottom: '0.25rem' }}>
              Gender Division
            </label>
            <select
              value={newGender}
              onChange={(e) => setNewGender(e.target.value as AgeGenderDivision)}
              style={{
                width: '100%',
                padding: '0.45rem 0.65rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                borderRadius: '6px',
                border: `1px solid ${borderCard}`,
                background: isDarkTheme ? '#1e293b' : '#ffffff',
                color: textHeading,
              }}
            >
              <option value="OPEN_ALL">All (Boys & Girls)</option>
              <option value="BOYS_ONLY">Boys / Open Only</option>
              <option value="GIRLS_ONLY">Girls Only</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: textSub, marginBottom: '0.25rem' }}>
              Winners to Award
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={newWinnersCount}
              onChange={(e) => setNewWinnersCount(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '0.45rem 0.65rem',
                fontSize: '0.78rem',
                fontWeight: 800,
                borderRadius: '6px',
                border: `1px solid ${borderCard}`,
                background: isDarkTheme ? '#1e293b' : '#ffffff',
                color: '#047857',
              }}
            />
          </div>

          <div>
            <button
              type="submit"
              className="btn btn-primary-green"
              style={{
                width: '100%',
                padding: '0.45rem 0.85rem',
                fontSize: '0.78rem',
                fontWeight: 800,
                minHeight: '34px',
              }}
            >
              + Add Category
            </button>
          </div>
        </form>
      </div>

      {/* ==================================================================== */}
      {/* 2. TOP OPEN MAIN PRIZE WINNERS BAR (FOR CASCADE TRANSPARENCY)        */}
      {/* ==================================================================== */}
      <div
        className="card-clean"
        style={{
          background: isDarkTheme ? '#0b1329' : 'rgba(254, 243, 199, 0.35)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '12px',
          padding: '1.15rem 1.25rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginBottom: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.1rem' }}>👑</span>
            <h3
              style={{
                fontSize: '0.88rem',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#b45309',
                margin: 0,
              }}
            >
              Overall Open Tournament Main Winners (Top {settings.openMainPrizesCount})
            </h3>
          </div>

          <button
            type="button"
            onClick={() => setShowFullCategoryTables(!showFullCategoryTables)}
            className="btn btn-secondary-white"
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
          >
            <Eye size={13} />
            <span>
              {showFullCategoryTables
                ? 'Show Trophy Winners Only'
                : 'Show All Participants in Every Age Category'}
            </span>
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.65rem',
          }}
        >
          {results.openMainWinners.map(({ openRank, player }) => {
            const age = (tournament.tournamentYear || new Date().getFullYear()) - player.birthYear;
            return (
              <div
                key={player.id}
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: isDarkTheme ? '#020617' : '#ffffff',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 900, color: '#b45309' }}>
                  <span>#{openRank} OPEN MAIN</span>
                  <span style={{ fontFamily: 'var(--font-mono, monospace)' }}>{player.score.toFixed(1)} pts</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.84rem', color: textHeading, marginTop: '0.35rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  #{player.tpn} {player.name}
                </div>
                <div style={{ fontSize: '0.7rem', color: textSub, marginTop: '0.2rem' }}>
                  Age: {age}y • Elo: {player.rating || 'Unr'} • BH-C1: {player.tieBreaks.buchholzCut1.toFixed(1)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. AGE-CATEGORY WINNER PODIUM CARDS                                  */}
      {/* ==================================================================== */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
          gap: '1.25rem',
        }}
      >
        {results.ageCategoryBoards.map((board) => {
          const rowsToDisplay = showFullCategoryTables ? board.fullLeaderboard : board.winners;

          return (
            <div
              key={board.category.id}
              className="card-clean"
              style={{
                background: bgCard,
                border: `1px solid ${borderCard}`,
                borderRadius: '12px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Category Header */}
              <div
                style={{
                  padding: '0.9rem 1.1rem',
                  background: isDarkTheme ? '#020617' : 'var(--bg-subtle, #f8fafc)',
                  borderBottom: `1px solid ${borderCard}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '0.96rem', fontWeight: 900, color: '#b45309', margin: 0 }}>
                      {board.category.label}
                    </h3>
                    <span
                      style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: '12px',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        background: 'rgba(10, 25, 47, 0.08)',
                        color: textHeading,
                      }}
                    >
                      {board.totalEligiblePlayers} Players
                    </span>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: textSub, margin: '0.2rem 0 0' }}>
                    {board.cutoffBirthYearText}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.7rem', color: textSub, fontWeight: 700 }}>Top:</label>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={board.category.winnersCount}
                    onChange={(e) =>
                      handleUpdateWinnersCount(board.category.id, Number(e.target.value))
                    }
                    style={{
                      width: '45px',
                      padding: '0.2rem 0.4rem',
                      borderRadius: '4px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      textAlign: 'center',
                      border: `1px solid ${borderCard}`,
                      background: isDarkTheme ? '#1e293b' : '#ffffff',
                      color: textHeading,
                    }}
                    title="Number of winners in this age category"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveCategory(board.category.id)}
                    style={{
                      padding: '0.2rem 0.45rem',
                      borderRadius: '4px',
                      border: '1px solid rgba(220, 38, 38, 0.2)',
                      background: 'rgba(220, 38, 38, 0.08)',
                      color: '#dc2626',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                    title="Remove this age category"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Winners / Leaderboard Table */}
              {rowsToDisplay.length === 0 ? (
                <div style={{ padding: '2rem 1.5rem', textAlign: 'center', fontSize: '0.78rem', color: textSub }}>
                  No eligible players in this age range yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {rowsToDisplay.map((row) => {
                    const isWinner = row.status === 'WINNER';
                    const isPromoted = row.status === 'PROMOTED_TO_OPEN_MAIN';

                    return (
                      <div
                        key={row.player.id}
                        style={{
                          padding: '0.7rem 1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                          borderBottom: `1px solid ${borderCard}`,
                          background: isWinner
                            ? 'rgba(16, 185, 129, 0.06)'
                            : isPromoted
                            ? 'rgba(245, 158, 11, 0.07)'
                            : 'transparent',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                          {/* Medal or Rank Badge */}
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              fontWeight: 900,
                              fontSize: '0.78rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              background:
                                row.prizeMedalNumber === 1
                                  ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                                  : row.prizeMedalNumber === 2
                                  ? 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)'
                                  : row.prizeMedalNumber === 3
                                  ? 'linear-gradient(135deg, #fed7aa 0%, #f97316 100%)'
                                  : isPromoted
                                  ? 'rgba(245, 158, 11, 0.15)'
                                  : 'rgba(10, 25, 47, 0.06)',
                              color:
                                row.prizeMedalNumber === 1
                                  ? '#78350f'
                                  : row.prizeMedalNumber === 2
                                  ? '#1e293b'
                                  : row.prizeMedalNumber === 3
                                  ? '#7c2d12'
                                  : isPromoted
                                  ? '#b45309'
                                  : textSub,
                              border: isPromoted ? '1px solid rgba(245, 158, 11, 0.3)' : 'none',
                            }}
                          >
                            {row.prizeMedalNumber
                              ? `#${row.prizeMedalNumber}`
                              : isPromoted
                              ? '⬆️'
                              : row.categoryRank}
                          </div>

                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: 800,
                                fontSize: '0.84rem',
                                color: textHeading,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              #{row.player.tpn} {row.player.name}{' '}
                              <span style={{ fontSize: '0.72rem', fontWeight: 500, color: textSub }}>
                                (Age {row.candidateAge}y, Born {row.player.birthYear})
                              </span>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: textSub, marginTop: '0.15rem' }}>
                              <span
                                style={{
                                  color: isWinner ? '#047857' : isPromoted ? '#b45309' : textSub,
                                  fontWeight: isWinner || isPromoted ? 700 : 500,
                                }}
                              >
                                {row.statusNote}
                              </span>{' '}
                              • Open Rank: <strong>#{row.overallOpenRank}</strong> • Wins:{' '}
                              <strong>{row.player.roundsWon}W</strong>
                            </div>
                          </div>
                        </div>

                        {/* Score & Tie-Break */}
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#b45309', fontFamily: 'var(--font-mono, monospace)' }}>
                            {row.player.score.toFixed(1)} pts
                          </div>
                          <div style={{ fontSize: '0.68rem', color: textSub, fontFamily: 'var(--font-mono, monospace)' }}>
                            BH-C1: {row.player.tieBreaks.buchholzCut1.toFixed(1)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AgeCategoryWinnersView;
