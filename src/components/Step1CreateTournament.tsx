import React, { useState } from 'react';
import { ArrowRight, Clock, ChevronDown, ChevronUp, Zap, Shield, Flame } from 'lucide-react';
import { EligibilityRules, TournamentState } from '../lib/fideSwissEngine';

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
    newTimeControlName?: string
  ) => void;
  onProceedToPlayers: () => void;
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
    const finalName = name.trim() || 'Official Swiss Championship';
    const finalDisplay = getTimeControlDisplay();

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
      },
      finalName,
      Number(rounds),
      city.trim(),
      Number(baseMinutes),
      Number(incrementSeconds),
      category,
      finalDisplay
    );
    onProceedToPlayers();
  };

  return (
    <div style={{ maxWidth: '780px', margin: '1.25rem auto 2.5rem', padding: '0 1.25rem' }}>
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
      <form onSubmit={handleSubmit} className="card-clean" style={{ padding: '2rem 2.25rem' }}>
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
