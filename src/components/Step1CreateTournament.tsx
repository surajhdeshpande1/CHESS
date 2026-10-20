import React, { useState } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Clock,
  ChevronDown,
  ChevronUp,
  Zap,
  Shield,
  Flame,
  Trophy,
  Check,
  Sparkles,
} from 'lucide-react';
import { EligibilityRules, TournamentState } from '../lib/fideSwissEngine';
import { AgePrizeSettings, AgeCategoryDefinition } from '../lib/ageCategoryEngine';
import { sanitizeText } from '../lib/securitySanitizer';

interface Step1CreateTournamentProps {
  tournament: TournamentState;
  onUpdateRules: (
    newRules: EligibilityRules,
    newName?: string,
    newRounds?: number,
    newCity?: string,
    newRoundMinutes?: number,
    newIncrementSeconds?: number,
    newTimeControlCategory?: 'CLASSICAL' | 'RAPID' | 'BLITZ' | 'CUSTOM',
    newTimeControlName?: string,
    newAgeSettings?: AgePrizeSettings
  ) => void;
  onProceedToPlayers: () => void;
  onGoBack?: () => void;
}

interface TimeControlPreset {
  id: string;
  category: 'CLASSICAL' | 'RAPID' | 'BLITZ' | 'CUSTOM';
  label: string;
  baseMinutes: number;
  incrementSeconds: number;
  description: string;
}

const TIME_CONTROL_PRESETS: TimeControlPreset[] = [
  // Rapid
  {
    id: 'rapid_15_10',
    category: 'RAPID',
    label: '15m + 10s (FIDE World Rapid Standard)',
    baseMinutes: 15,
    incrementSeconds: 10,
    description: '15 minutes base time with 10 seconds increment per move. FIDE official rapid standard.',
  },
  {
    id: 'rapid_25_5',
    category: 'RAPID',
    label: '25m + 5s (Rapid Open)',
    baseMinutes: 25,
    incrementSeconds: 5,
    description: '25 minutes base time with 5 seconds increment per move. Ideal for weekend club opens.',
  },
  {
    id: 'rapid_10_5',
    category: 'RAPID',
    label: '10m + 5s (Fast Rapid)',
    baseMinutes: 10,
    incrementSeconds: 5,
    description: '10 minutes base with 5s increment. Dynamic, fast-paced tournament format.',
  },
  {
    id: 'rapid_15_0',
    category: 'RAPID',
    label: '15m Flat (No Increment)',
    baseMinutes: 15,
    incrementSeconds: 0,
    description: '15 minutes sudden death. Traditional clock without delay or increment.',
  },

  // Classical
  {
    id: 'classical_90_30',
    category: 'CLASSICAL',
    label: '90m + 30s (FIDE Classical Standard)',
    baseMinutes: 90,
    incrementSeconds: 30,
    description: '90 minutes for the game with 30 seconds increment starting from move 1. FIDE rating eligible.',
  },
  {
    id: 'classical_60_30',
    category: 'CLASSICAL',
    label: '60m + 30s (Standard Classical)',
    baseMinutes: 60,
    incrementSeconds: 30,
    description: '60 minutes with 30s increment per move. Standard for state and national championships.',
  },
  {
    id: 'classical_60_0',
    category: 'CLASSICAL',
    label: '60m Flat (1 Hour Sudden Death)',
    baseMinutes: 60,
    incrementSeconds: 0,
    description: '1 hour per player without increment. Common in collegiate and club events.',
  },

  // Blitz
  {
    id: 'blitz_3_2',
    category: 'BLITZ',
    label: '3m + 2s (FIDE World Blitz Standard)',
    baseMinutes: 3,
    incrementSeconds: 2,
    description: '3 minutes base with 2 seconds increment. Official FIDE World Blitz Championship time control.',
  },
  {
    id: 'blitz_5_3',
    category: 'BLITZ',
    label: '5m + 3s (Club Blitz)',
    baseMinutes: 5,
    incrementSeconds: 3,
    description: '5 minutes with 3 seconds increment per move. Popular for rapid-fire club evenings.',
  },
  {
    id: 'blitz_5_0',
    category: 'BLITZ',
    label: '5m Flat (Classic Blitz)',
    baseMinutes: 5,
    incrementSeconds: 0,
    description: '5 minutes straight sudden death.',
  },

  // Custom
  {
    id: 'custom',
    category: 'CUSTOM',
    label: 'Custom Time Control...',
    baseMinutes: 30,
    incrementSeconds: 0,
    description: 'Set custom base duration minutes and increment seconds per move.',
  },
];

export const Step1CreateTournament: React.FC<Step1CreateTournamentProps> = ({
  tournament,
  onUpdateRules,
  onProceedToPlayers,
  onGoBack,
}) => {
  const [name, setName] = useState(tournament.name || '');
  const [city, setCity] = useState(tournament.city || '');
  const [rounds, setRounds] = useState(tournament.totalRounds || 5);

  // Time control states
  const [selectedPresetId, setSelectedPresetId] = useState<string>(() => {
    if (tournament.timeControlCategory === 'CUSTOM') return 'custom';
    const match = TIME_CONTROL_PRESETS.find(
      (p) =>
        p.baseMinutes === (tournament.roundDurationMinutes || 15) &&
        p.incrementSeconds === (tournament.roundIncrementSeconds ?? 10)
    );
    return match ? match.id : 'rapid_15_10';
  });

  const [baseMinutes, setBaseMinutes] = useState<number>(tournament.roundDurationMinutes || 15);
  const [incrementSeconds, setIncrementSeconds] = useState<number>(tournament.roundIncrementSeconds ?? 10);
  const [category, setCategory] = useState<'CLASSICAL' | 'RAPID' | 'BLITZ' | 'CUSTOM'>(
    tournament.timeControlCategory || 'RAPID'
  );

  // Advanced rule drawer
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [minPlayers, setMinPlayers] = useState(tournament.rules.minPlayers || 2);
  const [maxPlayers, setMaxPlayers] = useState(tournament.rules.maxPlayers || 200);
  const [minRating, setMinRating] = useState<number | ''>(tournament.rules.minRating ?? '');
  const [maxRating, setMaxRating] = useState<number | ''>(tournament.rules.maxRating ?? '');
  const [allowUnrated, setAllowUnrated] = useState(tournament.rules.allowUnrated ?? true);
  const [gender, setGender] = useState<'OPEN' | 'FEMALE_ONLY'>(tournament.rules.allowedGender || 'OPEN');

  // Simplified Age Category Selection State
  const tourneyYear = tournament.tournamentYear || new Date().getFullYear();
  const AVAILABLE_AGE_CATEGORIES = [
    { id: 'u7', label: 'Under-7', maxAge: 7, minAge: null, cutoff: `Born ${tourneyYear - 7} or later` },
    { id: 'u9', label: 'Under-9', maxAge: 9, minAge: null, cutoff: `Born ${tourneyYear - 9} or later` },
    { id: 'u11', label: 'Under-11', maxAge: 11, minAge: null, cutoff: `Born ${tourneyYear - 11} or later` },
    { id: 'u13', label: 'Under-13', maxAge: 13, minAge: null, cutoff: `Born ${tourneyYear - 13} or later` },
    { id: 'u15', label: 'Under-15', maxAge: 15, minAge: null, cutoff: `Born ${tourneyYear - 15} or later` },
    { id: 'u17', label: 'Under-17', maxAge: 17, minAge: null, cutoff: `Born ${tourneyYear - 17} or later` },
    { id: 'u19', label: 'Under-19', maxAge: 19, minAge: null, cutoff: `Born ${tourneyYear - 19} or later` },
    { id: 'v50', label: 'Veteran 50+', maxAge: null, minAge: 50, cutoff: `Born ${tourneyYear - 50} or earlier` },
    { id: 'v65', label: 'Veteran 65+', maxAge: null, minAge: 65, cutoff: `Born ${tourneyYear - 65} or earlier` },
  ];

  const [hasAgeCategories, setHasAgeCategories] = useState<boolean>(() => {
    return tournament.rules.hasAgeCategories ?? true;
  });
  const [selectedAgeCats, setSelectedAgeCats] = useState<string[]>(() => {
    if (tournament.rules.enabledAgeCategories && tournament.rules.enabledAgeCategories.length > 0) {
      return tournament.rules.enabledAgeCategories;
    }
    return ['u9', 'u11', 'u13', 'u15', 'u19'];
  });
  const [winnersCount, setWinnersCount] = useState<number>(3);
  const [splitBoysGirls, setSplitBoysGirls] = useState<boolean>(false);

  const toggleAgeCategory = (catId: string) => {
    setSelectedAgeCats((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = TIME_CONTROL_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setBaseMinutes(preset.baseMinutes);
      setIncrementSeconds(preset.incrementSeconds);
      setCategory(preset.category);
    }
  };

  const getTimeControlDisplay = (): string => {
    if (incrementSeconds > 0) {
      return `${baseMinutes} min + ${incrementSeconds}s / move (${category})`;
    }
    return `${baseMinutes} min sudden death (${category})`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = sanitizeText(name, 80) || 'Official Swiss Championship';
    const finalCity = sanitizeText(city, 50);
    const finalDisplay = getTimeControlDisplay();

    const finalCategories: AgeCategoryDefinition[] = [];
    if (hasAgeCategories) {
      for (const catId of selectedAgeCats) {
        const found = AVAILABLE_AGE_CATEGORIES.find((c) => c.id === catId);
        if (!found) continue;
        if (splitBoysGirls && found.maxAge !== null) {
          finalCategories.push({
            id: `${catId}_boys`,
            label: `${found.label} Boys / Open`,
            minAge: found.minAge,
            maxAge: found.maxAge,
            genderDivision: 'BOYS_ONLY',
            winnersCount,
            isEnabled: true,
          });
          finalCategories.push({
            id: `${catId}_girls`,
            label: `${found.label} Girls`,
            minAge: found.minAge,
            maxAge: found.maxAge,
            genderDivision: 'GIRLS_ONLY',
            winnersCount,
            isEnabled: true,
          });
        } else {
          finalCategories.push({
            id: `${catId}_open`,
            label: `${found.label} (All)`,
            minAge: found.minAge,
            maxAge: found.maxAge,
            genderDivision: 'OPEN_ALL',
            winnersCount,
            isEnabled: true,
          });
        }
      }
    }

    const finalAgeSettings: AgePrizeSettings = {
      openMainPrizesCount: 5,
      excludeOpenMainWinnersFromAgePrizes: true,
      overlapMode: 'NATURAL_BAND',
      categories: finalCategories,
    };

    onUpdateRules(
      {
        minPlayers: Number(minPlayers) || 2,
        maxPlayers: Number(maxPlayers) || 200,
        minRating: minRating !== '' ? Number(minRating) : null,
        maxRating: maxRating !== '' ? Number(maxRating) : null,
        allowUnrated,
        minAge: null,
        maxAge: null,
        allowedGender: gender,
        allowedOrganizations: tournament.rules.allowedOrganizations,
        hasAgeCategories,
        enabledAgeCategories: hasAgeCategories ? selectedAgeCats : [],
      },
      finalName,
      Number(rounds),
      finalCity,
      Number(baseMinutes),
      Number(incrementSeconds),
      category,
      finalDisplay,
      finalAgeSettings
    );
    onProceedToPlayers();
  };

  return (
    <div style={{ maxWidth: '780px', margin: '1.25rem auto 2.5rem', padding: '0 clamp(0.5rem, 3vw, 1.25rem)' }}>
      {/* Back to Dashboard Navigation */}
      {onGoBack && (
        <button
          type="button"
          onClick={onGoBack}
          className="btn btn-secondary-white"
          style={{
            marginBottom: '1rem',
            padding: '0.4rem 0.75rem',
            fontSize: '0.8rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
          title="Return to Arbiter Dashboard"
        >
          <ArrowLeft size={14} />
          <span>Back to Dashboard</span>
        </button>
      )}

      {/* Title Header */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h2
          style={{
            fontSize: '1.8rem',
            fontWeight: 800,
            color: 'var(--navy-deep)',
            fontFamily: 'var(--font-heading)',
            letterSpacing: '0.04em',
            marginBottom: '0.25rem',
          }}
        >
          Create Tournament & Configure Rules
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', fontFamily: 'var(--font-sans)' }}>
          Step 1: Set official tournament name, detailed round timer duration, time control, and Swiss rounds.
        </p>
      </div>

      {/* Main Configuration Card */}
      <form onSubmit={handleSubmit} className="card-clean responsive-form-card" style={{ padding: '2rem 2.25rem' }}>
        {/* Tournament Name */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--navy-deep)',
              marginBottom: '0.45rem',
            }}
          >
            Tournament Name *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Zurich Masters Swiss Championship 2026"
            style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '0.95rem' }}
          />
        </div>

        {/* City / Venue & Swiss Rounds */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--navy-deep)',
                marginBottom: '0.45rem',
              }}
            >
              Host City / Venue
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Zurich, Switzerland"
              style={{ width: '100%', padding: '0.65rem 0.85rem' }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--navy-deep)',
                marginBottom: '0.45rem',
              }}
            >
              Number of Swiss Rounds *
            </label>
            <select
              value={rounds}
              onChange={(e) => setRounds(Number(e.target.value))}
              style={{ width: '100%', padding: '0.65rem 0.85rem', fontWeight: 600 }}
            >
              <option value={3}>3 Rounds (Short Club Blitz / Demo)</option>
              <option value={5}>5 Rounds (Standard Weekend Swiss)</option>
              <option value={7}>7 Rounds (Major Open Swiss)</option>
              <option value={9}>9 Rounds (Official FIDE Norm Swiss)</option>
              <option value={11}>11 Rounds (World Championship Swiss)</option>
            </select>
          </div>
        </div>

        {/* DETAILED ROUND TIMER & TIME CONTROL SECTION */}
        <div
          className="responsive-subcard"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--navy-border-light)',
            borderRadius: '10px',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={16} color="var(--navy-royal)" />
              <span
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--navy-deep)',
                }}
              >
                Official Round Timer & Time Control
              </span>
            </div>
            <span
              className={`badge-minimal ${category === 'CLASSICAL' ? 'badge-navy' : category === 'RAPID' ? 'badge-green' : 'badge-muted'}`}
            >
              {category}
            </span>
          </div>

          {/* Time Control Preset Dropdown */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Select Official FIDE Preset:
            </label>
            <select
              value={selectedPresetId}
              onChange={(e) => handlePresetChange(e.target.value)}
              style={{ width: '100%', padding: '0.65rem 0.85rem', fontWeight: 600 }}
            >
              <optgroup label="⚡ FIDE Rapid Presets">
                <option value="rapid_15_10">15 min + 10s increment (Official FIDE World Rapid)</option>
                <option value="rapid_25_5">25 min + 5s increment (Rapid Open)</option>
                <option value="rapid_10_5">10 min + 5s increment (Fast Rapid)</option>
                <option value="rapid_15_0">15 min flat (Sudden Death)</option>
              </optgroup>
              <optgroup label="♟ FIDE Classical Presets">
                <option value="classical_90_30">90 min + 30s increment (FIDE Classical Rating Standard)</option>
                <option value="classical_60_30">60 min + 30s increment (Standard Classical)</option>
                <option value="classical_60_0">60 min flat (1 Hour Sudden Death)</option>
              </optgroup>
              <optgroup label="🔥 FIDE Blitz Presets">
                <option value="blitz_3_2">3 min + 2s increment (FIDE World Blitz)</option>
                <option value="blitz_5_3">5 min + 3s increment (Club Blitz)</option>
                <option value="blitz_5_0">5 min flat (Sudden Death)</option>
              </optgroup>
              <optgroup label="⚙ Custom Configuration">
                <option value="custom">Custom Time Control (Specify Minutes & Seconds)</option>
              </optgroup>
            </select>
          </div>

          {/* Detailed Inputs: Base Minutes & Increment Seconds */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '0.85rem', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                Base Time (Minutes) *
              </label>
              <input
                type="number"
                min={1}
                max={300}
                required
                value={baseMinutes}
                onChange={(e) => {
                  setBaseMinutes(Number(e.target.value));
                  setSelectedPresetId('custom');
                  setCategory('CUSTOM');
                }}
                style={{ width: '100%', padding: '0.55rem 0.75rem', fontWeight: 700 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                Increment per Move (Sec)
              </label>
              <input
                type="number"
                min={0}
                max={120}
                value={incrementSeconds}
                onChange={(e) => {
                  setIncrementSeconds(Number(e.target.value));
                  setSelectedPresetId('custom');
                  setCategory('CUSTOM');
                }}
                style={{ width: '100%', padding: '0.55rem 0.75rem', fontWeight: 700 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                Format Classification
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                style={{ width: '100%', padding: '0.55rem 0.75rem', fontWeight: 600 }}
              >
                <option value="RAPID">Rapid</option>
                <option value="CLASSICAL">Classical</option>
                <option value="BLITZ">Blitz</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>
          </div>

          {/* Active Time Control Display Preview */}
          <div
            style={{
              marginTop: '0.85rem',
              padding: '0.5rem 0.85rem',
              borderRadius: '6px',
              background: '#ffffff',
              border: '1px solid var(--navy-border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.78rem',
            }}
          >
            <span style={{ color: 'var(--text-muted)' }}>Configured Round Clock:</span>
            <strong style={{ color: 'var(--navy-deep)', fontFamily: 'var(--font-mono)' }}>
              {getTimeControlDisplay()}
            </strong>
          </div>
        </div>

        {/* ================================================================== */}
        {/* SIMPLIFIED AGE CATEGORIES & PODIUM CONFIGURATION                   */}
        {/* ================================================================== */}
        <div
          className="responsive-subcard"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--navy-border-light)',
            borderRadius: '10px',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Trophy size={17} color="#d97706" />
              <span
                style={{
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--navy-deep)',
                }}
              >
                Age Category Podiums & Trophies
              </span>
            </div>
            <span className="badge-minimal badge-green">
              FIDE DUTCH OPEN + LIVE PODIUMS
            </span>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1rem' }}>
            All candidates play together in one unified Open Swiss pool. The system automatically classifies players by birth year and awards separate podium trophies for your selected categories.
          </p>

          {/* Simple Choice: Pure Open vs Open + Age Categories */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div
              onClick={() => setHasAgeCategories(false)}
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                border: !hasAgeCategories ? '2px solid var(--navy-royal)' : '1px solid var(--navy-border-light)',
                background: !hasAgeCategories ? '#ffffff' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="radio"
                  name="ageCategoryMode"
                  checked={!hasAgeCategories}
                  onChange={() => setHasAgeCategories(false)}
                  style={{ accentColor: 'var(--navy-royal)', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--navy-deep)' }}>
                  Pure Open Tournament
                </span>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginLeft: '1.4rem', marginTop: '0.2rem' }}>
                Single Open Swiss standings. No age-category trophies.
              </div>
            </div>

            <div
              onClick={() => setHasAgeCategories(true)}
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                border: hasAgeCategories ? '2px solid #16a34a' : '1px solid var(--navy-border-light)',
                background: hasAgeCategories ? '#ffffff' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="radio"
                  name="ageCategoryMode"
                  checked={hasAgeCategories}
                  onChange={() => setHasAgeCategories(true)}
                  style={{ accentColor: '#16a34a', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--navy-deep)' }}>
                  Open + Age Category Podiums
                </span>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginLeft: '1.4rem', marginTop: '0.2rem' }}>
                Unified Open pairing + separate age trophies (Under-9, 11, 13, etc.).
              </div>
            </div>
          </div>

          {/* When enabled: Presets & Category Chips */}
          {hasAgeCategories && (
            <div>
              {/* 1-Click Presets */}
              <div style={{ marginBottom: '0.85rem' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  Quick 1-Click Presets for Organizers:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedAgeCats(['u9', 'u11', 'u13', 'u15'])}
                    className="btn btn-secondary-white"
                    style={{ fontSize: '0.74rem', padding: '0.35rem 0.65rem', fontWeight: 700 }}
                  >
                    ⚡ Junior Standard (U9, U11, U13, U15)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedAgeCats(['u7', 'u9', 'u11', 'u13', 'u15', 'u17', 'u19'])}
                    className="btn btn-secondary-white"
                    style={{ fontSize: '0.74rem', padding: '0.35rem 0.65rem', fontWeight: 700 }}
                  >
                    🎯 All Youth (U7–U19)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedAgeCats(['u11', 'u14', 'u17'])}
                    className="btn btn-secondary-white"
                    style={{ fontSize: '0.74rem', padding: '0.35rem 0.65rem', fontWeight: 700 }}
                  >
                    🏫 School Divisions (U11, U14, U17)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedAgeCats(['v50', 'v65'])}
                    className="btn btn-secondary-white"
                    style={{ fontSize: '0.74rem', padding: '0.35rem 0.65rem', fontWeight: 700 }}
                  >
                    🎖 Seniors (50+, 65+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedAgeCats([])}
                    style={{
                      fontSize: '0.72rem',
                      padding: '0.35rem 0.6rem',
                      background: 'transparent',
                      border: '1px dashed var(--navy-border-light)',
                      color: 'var(--text-muted)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Interactive Category Chips Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '0.65rem',
                  marginBottom: '1rem',
                }}
              >
                {AVAILABLE_AGE_CATEGORIES.map((cat) => {
                  const isSelected = selectedAgeCats.includes(cat.id);
                  return (
                    <div
                      key={cat.id}
                      onClick={() => toggleAgeCategory(cat.id)}
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: isSelected ? '2px solid #16a34a' : '1px solid var(--navy-border-light)',
                        background: isSelected ? 'rgba(22, 163, 74, 0.08)' : '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.84rem', fontWeight: 800, color: isSelected ? '#15803d' : 'var(--navy-deep)' }}>
                          {cat.label}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {cat.cutoff}
                        </div>
                      </div>
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          border: isSelected ? 'none' : '1px solid var(--navy-border)',
                          background: isSelected ? '#16a34a' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          flexShrink: 0,
                        }}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Trophies per Category & Gender Division */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
                  gap: '1rem',
                  paddingTop: '0.85rem',
                  borderTop: '1px dashed var(--navy-border-light)',
                  alignItems: 'center',
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                    Trophies Awarded Per Category:
                  </label>
                  <select
                    value={winnersCount}
                    onChange={(e) => setWinnersCount(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.82rem', fontWeight: 700 }}
                  >
                    <option value={1}>Top 1 Trophy (Champion Only)</option>
                    <option value={3}>Top 3 Trophies (1st, 2nd, 3rd Place - Standard)</option>
                    <option value={5}>Top 5 Medals / Trophies (1st to 5th Place)</option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      marginTop: '1.25rem',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: 'var(--navy-deep)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={splitBoysGirls}
                      onChange={(e) => setSplitBoysGirls(e.target.checked)}
                      style={{ accentColor: 'var(--navy-royal)', cursor: 'pointer' }}
                    />
                    <span>Split into Separate Boys & Girls Podiums</span>
                  </label>
                </div>
              </div>

              {/* FIDE Dispute-Proof Engine Guarantee */}
              <div
                style={{
                  marginTop: '0.85rem',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '6px',
                  background: 'rgba(22, 163, 74, 0.08)',
                  border: '1px solid rgba(22, 163, 74, 0.2)',
                  fontSize: '0.74rem',
                  color: '#15803d',
                  lineHeight: 1.45,
                }}
              >
                <strong>🛡️ Dispute-Proof Guarantee:</strong> All players compete in the main Open pairing pool. FIDE C.07 tie-breaks (Buchholz Cut-1, Sonneborn-Berger, Most Wins) will automatically rank contenders in each age category for the prize distribution.
              </div>
            </div>
          )}
        </div>

        {/* Advanced FIDE Eligibility Rules (Drawer) */}
        <div style={{ marginBottom: '1.75rem' }}>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--navy-royal)',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: 0,
            }}
          >
            <span>{showAdvanced ? 'Hide Advanced Eligibility Rules' : '+ Show Advanced Eligibility Rules (Rating Caps, Gender)'}</span>
            {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showAdvanced && (
            <div
              style={{
                marginTop: '1rem',
                padding: '1.25rem',
                borderRadius: '8px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--navy-border-light)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
                gap: '1rem',
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--navy-deep)', marginBottom: '0.3rem' }}>
                  Max Player Capacity
                </label>
                <input
                  type="number"
                  min={2}
                  max={500}
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.5rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--navy-deep)', marginBottom: '0.3rem' }}>
                  Gender Division
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  style={{ width: '100%', padding: '0.5rem' }}
                >
                  <option value="OPEN">Open (All Players)</option>
                  <option value="FEMALE_ONLY">Women Only Championship</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--navy-deep)', marginBottom: '0.3rem' }}>
                  Minimum Elo (Leave empty for none)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 1800"
                  value={minRating}
                  onChange={(e) => setMinRating(e.target.value === '' ? '' : Number(e.target.value))}
                  style={{ width: '100%', padding: '0.5rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--navy-deep)', marginBottom: '0.3rem' }}>
                  Maximum Elo (Leave empty for none)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 2200 for Under-2200"
                  value={maxRating}
                  onChange={(e) => setMaxRating(e.target.value === '' ? '' : Number(e.target.value))}
                  style={{ width: '100%', padding: '0.5rem' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Submit & Proceed Button */}
        <button
          type="submit"
          className="btn btn-primary-green"
          style={{
            width: '100%',
            padding: '0.85rem 1.5rem',
            fontSize: '0.98rem',
            fontWeight: 700,
          }}
        >
          <span>Save Tournament Setup & Proceed to Players</span>
          <ArrowRight size={16} />
        </button>
      </form>
    </div>
  );
};
