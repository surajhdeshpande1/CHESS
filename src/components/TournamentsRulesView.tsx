import React from 'react';
import { Trophy, ShieldCheck, Check, AlertCircle, Sparkles, Filter } from 'lucide-react';
import { EligibilityRules, TournamentState } from '../lib/fideSwissEngine';

interface TournamentsRulesViewProps {
  tournament: TournamentState;
  onUpdateRules: (newRules: EligibilityRules, newName?: string, newRounds?: number) => void;
}

export const TournamentsRulesView: React.FC<TournamentsRulesViewProps> = ({
  tournament,
  onUpdateRules,
}) => {
  const { rules } = tournament;

  // 1-Click Presets
  const applyPreset = (presetName: string) => {
    if (presetName === 'OPEN') {
      onUpdateRules(
        {
          minPlayers: 50,
          maxPlayers: 200,
          minRating: null,
          maxRating: null,
          allowUnrated: true,
          minAge: null,
          maxAge: null,
          allowedGender: 'OPEN',
          allowedOrganizations: [],
        },
        'FIDE World Masters Open Championship',
        9
      );
    } else if (presetName === 'U1600') {
      onUpdateRules(
        {
          minPlayers: 50,
          maxPlayers: 150,
          minRating: null,
          maxRating: 1600,
          allowUnrated: false,
          minAge: null,
          maxAge: null,
          allowedGender: 'OPEN',
          allowedOrganizations: [],
        },
        'FIDE Under-1600 Amateur Trophy',
        7
      );
    } else if (presetName === 'MASTERS') {
      onUpdateRules(
        {
          minPlayers: 50,
          maxPlayers: 100,
          minRating: 2000,
          maxRating: null,
          allowUnrated: false,
          minAge: null,
          maxAge: null,
          allowedGender: 'OPEN',
          allowedOrganizations: [],
        },
        'Elite Grandmaster 2000+ Invitational',
        9
      );
    } else if (presetName === 'U18') {
      onUpdateRules(
        {
          minPlayers: 50,
          maxPlayers: 120,
          minRating: null,
          maxRating: null,
          allowUnrated: true,
          minAge: null,
          maxAge: 18,
          allowedGender: 'OPEN',
          allowedOrganizations: [],
        },
        'National Junior Under-18 Championship',
        7
      );
    } else if (presetName === 'COLLEGE') {
      onUpdateRules(
        {
          minPlayers: 50,
          maxPlayers: 160,
          minRating: null,
          maxRating: null,
          allowUnrated: true,
          minAge: null,
          maxAge: 25,
          allowedGender: 'OPEN',
          allowedOrganizations: ['Harvard', 'MIT', 'Stanford', 'Oxford', 'Cambridge', 'IIT', 'NYU'],
        },
        'Inter-Collegiate Chess Championship',
        7
      );
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem 1.25rem' }}>
      {/* Title & 1-Click Preset Bar */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Trophy size={24} color="var(--accent-gold)" />
          1. 🏆 Tournaments & Eligibility Rules
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
          Define who is allowed to enter. Candidates are automatically verified in real-time before round 1 pairing.
        </p>

        {/* 1-Click Presets */}
        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={() => applyPreset('OPEN')}
            style={{ fontSize: '0.8rem' }}
          >
            ⭐ 1-Click: FIDE Open (No Caps)
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => applyPreset('U1600')}
            style={{ fontSize: '0.8rem' }}
          >
            🛡️ 1-Click: Under-1600 Section
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => applyPreset('MASTERS')}
            style={{ fontSize: '0.8rem' }}
          >
            👑 1-Click: Masters 2000+
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => applyPreset('U18')}
            style={{ fontSize: '0.8rem' }}
          >
            🎓 1-Click: Youth Under-18
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => applyPreset('COLLEGE')}
            style={{ fontSize: '0.8rem' }}
          >
            🏛️ 1-Click: College Inter-Varsity
          </button>
        </div>
      </div>

      {/* Rules Config Panel */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={20} color="var(--accent-emerald)" />
          Active Tournament Configuration & Capacity Gate
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
          {/* Tournament Name */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Tournament Name
            </label>
            <input
              type="text"
              value={tournament.name}
              onChange={(e) => onUpdateRules(rules, e.target.value, tournament.totalRounds)}
              style={{
                width: '100%',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '0.55rem 0.85rem',
                color: 'var(--text-primary)',
                fontWeight: 600,
              }}
            />
          </div>

          {/* Rounds */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Total Rounds (Standard: 7 to 9)
            </label>
            <input
              type="number"
              min={1}
              max={15}
              value={tournament.totalRounds}
              onChange={(e) => onUpdateRules(rules, tournament.name, parseInt(e.target.value, 10) || 7)}
              style={{
                width: '100%',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '0.55rem 0.85rem',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Minimum Capacity Gate (FIDE Dutch Bounds) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Min Players to Start (FIDE Bound: ≥ 50)
            </label>
            <input
              type="number"
              min={10}
              max={100}
              value={rules.minPlayers}
              onChange={(e) => onUpdateRules({ ...rules, minPlayers: parseInt(e.target.value, 10) || 50 })}
              style={{
                width: '100%',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '0.55rem 0.85rem',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Maximum Capacity Gate */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              Max Player Cap (Hard Limit: ≤ 200)
            </label>
            <input
              type="number"
              min={50}
              max={200}
              value={rules.maxPlayers}
              onChange={(e) => onUpdateRules({ ...rules, maxPlayers: parseInt(e.target.value, 10) || 200 })}
              style={{
                width: '100%',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '0.55rem 0.85rem',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>

        {/* Rating Gate */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.85rem', color: 'var(--accent-gold)' }}>
            Rating Eligibility Gate
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Maximum Rating Allowed (null for Open)
              </label>
              <input
                type="number"
                placeholder="e.g. 1600 or empty for none"
                value={rules.maxRating ?? ''}
                onChange={(e) => onUpdateRules({ ...rules, maxRating: e.target.value ? parseInt(e.target.value, 10) : null })}
                style={{
                  width: '100%',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '0.5rem 0.75rem',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Minimum Rating Floor (null for none)
              </label>
              <input
                type="number"
                placeholder="e.g. 2000 or empty for none"
                value={rules.minRating ?? ''}
                onChange={(e) => onUpdateRules({ ...rules, minRating: e.target.value ? parseInt(e.target.value, 10) : null })}
                style={{
                  width: '100%',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '0.5rem 0.75rem',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '1.5rem' }}>
              <input
                type="checkbox"
                id="chk-unrated"
                checked={rules.allowUnrated}
                onChange={(e) => onUpdateRules({ ...rules, allowUnrated: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="chk-unrated" style={{ fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                Allow Unrated Players (Rating = 0)
              </label>
            </div>
          </div>
        </div>

        {/* Age / Birth-Year & Gender Gate */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.85rem', color: 'var(--accent-gold)' }}>
            Age & Gender Section Filters (FIDE Standard Date Rules)
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Max Age Limit (e.g. 18 for Under-18)
              </label>
              <input
                type="number"
                placeholder="empty for no age limit"
                value={rules.maxAge ?? ''}
                onChange={(e) => onUpdateRules({ ...rules, maxAge: e.target.value ? parseInt(e.target.value, 10) : null })}
                style={{
                  width: '100%',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '0.5rem 0.75rem',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Section Gender
              </label>
              <select
                value={rules.allowedGender}
                onChange={(e) => onUpdateRules({ ...rules, allowedGender: e.target.value as 'OPEN' | 'FEMALE_ONLY' })}
                style={{
                  width: '100%',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '0.5rem 0.75rem',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="OPEN">Open (All Genders Eligible)</option>
                <option value="FEMALE_ONLY">Female Only (Women's / Girls' Section)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Club / College Whitelist */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--accent-gold)' }}>
            Permitted Organizations, Clubs, or Colleges
          </h4>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Leave blank to allow candidates from all clubs/universities, or enter comma-separated permitted names.
          </p>
          <input
            type="text"
            placeholder="e.g. Harvard, MIT, Stanford, Oxford, Cambridge"
            value={rules.allowedOrganizations.join(', ')}
            onChange={(e) => {
              const list = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
              onUpdateRules({ ...rules, allowedOrganizations: list });
            }}
            style={{
              width: '100%',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '0.55rem 0.85rem',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </div>
    </div>
  );
};
