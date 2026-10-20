import React, { useState } from 'react';
import { Settings, X, ArrowUp, ArrowDown, Shield } from 'lucide-react';
import { Color, TieBreakType, TournamentSettings } from '../types/chess';

interface TournamentSettingsModalProps {
  settings: TournamentSettings;
  playerCount: number;
  isOpen: boolean;
  onClose: () => void;
  onSave: (newSettings: TournamentSettings) => void;
}

const ALL_TIE_BREAKS: { id: TieBreakType; label: string; desc: string }[] = [
  { id: 'BH_C1', label: 'Buchholz Cut 1 (BH-C1)', desc: 'Sum of opponents scores minus lowest (FIDE C.07)' },
  { id: 'BH', label: 'Buchholz Total (BH)', desc: 'Sum of all opponents scores' },
  { id: 'SB', label: 'Sonneborn-Berger (SB)', desc: 'Sum of defeated opponents scores + 0.5 of drawn opponents' },
  { id: 'DE', label: 'Direct Encounter (DE)', desc: 'Result between tied players if all played each other' },
  { id: 'WIN', label: 'Most Wins (OTB)', desc: 'Total games won over the board' },
  { id: 'BWG', label: 'Black Wins (BWG)', desc: 'Total games won playing Black' },
  { id: 'ARO', label: 'Average Rating of Opponents', desc: 'Mean rating of real opponents' },
  { id: 'PS', label: 'Progressive Score (PS)', desc: 'Cumulative score after each round' },
];

export const TournamentSettingsModal: React.FC<TournamentSettingsModalProps> = ({
  settings,
  playerCount,
  isOpen,
  onClose,
  onSave,
}) => {
  const [formSettings, setFormSettings] = useState<TournamentSettings>({ ...settings });

  if (!isOpen) return null;

  const handleMoveTieBreak = (index: number, direction: 'up' | 'down') => {
    const list = [...formSettings.tieBreaks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    setFormSettings({ ...formSettings, tieBreaks: list });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formSettings);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={20} color="var(--accent-gold)" />
            Tournament Regulations & System Settings
          </h3>
          <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Tournament Name & City */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Tournament Name *
            </label>
            <input
              type="text"
              required
              value={formSettings.name}
              onChange={(e) => setFormSettings({ ...formSettings, name: e.target.value })}
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                City & Federation
              </label>
              <input
                type="text"
                value={`${formSettings.city}, ${formSettings.federation}`}
                onChange={(e) => {
                  const parts = e.target.value.split(',');
                  setFormSettings({
                    ...formSettings,
                    city: parts[0]?.trim() || '',
                    federation: parts[1]?.trim().toUpperCase() || 'FID',
                  });
                }}
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
                Chief Arbiter
              </label>
              <input
                type="text"
                value={formSettings.chiefArbiter}
                onChange={(e) => setFormSettings({ ...formSettings, chiefArbiter: e.target.value })}
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
          </div>

          {/* Rounds & Initial Color */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Total Rounds (Module 1: 50-64 → 7R, 65-128 → 9R)
              </label>
              <input
                type="number"
                min={1}
                max={15}
                value={formSettings.totalRounds}
                onChange={(e) => setFormSettings({ ...formSettings, totalRounds: parseInt(e.target.value, 10) || 7 })}
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
                Initial Drawn Color for Seed #1 (Article 5.2.5)
              </label>
              <select
                value={formSettings.initialColor}
                onChange={(e) => setFormSettings({ ...formSettings, initialColor: e.target.value as Color })}
                style={{
                  width: '100%',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '0.5rem 0.75rem',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="W">White for Seed 1 (Standard)</option>
                <option value="B">Black for Seed 1</option>
              </select>
            </div>
          </div>

          {/* Baku Acceleration Toggle */}
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '0.85rem 1rem',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <strong style={{ fontSize: '0.9rem', display: 'block' }}>
                FIDE Baku Acceleration (C.04.7)
              </strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Adds virtual points to top seeds in Rounds 1–3 to prevent trivial mismatches in 150–200 player fields.
              </span>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px' }}>
              <input
                type="checkbox"
                checked={formSettings.enableBakuAcceleration}
                onChange={(e) => setFormSettings({ ...formSettings, enableBakuAcceleration: e.target.checked })}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute',
                cursor: 'pointer',
                inset: 0,
                background: formSettings.enableBakuAcceleration ? 'var(--accent-gold)' : '#334155',
                borderRadius: '24px',
                transition: '0.2s',
              }}>
                <span style={{
                  position: 'absolute',
                  content: '""',
                  height: '18px',
                  width: '18px',
                  left: formSettings.enableBakuAcceleration ? '26px' : '3px',
                  bottom: '3px',
                  background: '#fff',
                  borderRadius: '50%',
                  transition: '0.2s',
                }} />
              </span>
            </label>
          </div>

          {/* Tie-Breaks Ordering Suite */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              Official Tie-Break Hierarchy (FIDE C.07 Regulations) — Reorder Priority
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {formSettings.tieBreaks.map((tbId, idx) => {
                const def = ALL_TIE_BREAKS.find((b) => b.id === tbId);
                return (
                  <div
                    key={tbId}
                    style={{
                      background: 'var(--bg-secondary)',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                        #{idx + 1}
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{def?.label}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ padding: '0.2rem 0.4rem' }}
                        disabled={idx === 0}
                        onClick={() => handleMoveTieBreak(idx, 'up')}
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ padding: '0.2rem 0.4rem' }}
                        disabled={idx === formSettings.tieBreaks.length - 1}
                        onClick={() => handleMoveTieBreak(idx, 'down')}
                      >
                        <ArrowDown size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
