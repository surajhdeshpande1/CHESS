import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Upload,
  Search,
  CheckCircle2,
  XCircle,
  Sparkles,
  Share2,
  QrCode,
} from 'lucide-react';
import {
  FideTitle,
  TournamentState,
  validateCandidateEligibility,
} from '../lib/fideSwissEngine';

interface PlayersEligibilityViewProps {
  tournament: TournamentState;
  onAddCandidate: (candidateData: {
    name: string;
    rating: number;
    title: FideTitle;
    birthYear: number;
    gender: 'M' | 'F' | 'OTHER';
    organization: string;
    fideId?: string;
  }) => void;
  onBulkAddCandidates: (candidates: Array<{
    name: string;
    rating: number;
    title: FideTitle;
    birthYear: number;
    gender: 'M' | 'F' | 'OTHER';
    organization: string;
  }>) => void;
  onToggleBye: (playerId: string, roundNumber: number) => void;
  onToggleActive: (playerId: string) => void;
  onQuickDemoGenerator: () => void;
}

export const PlayersEligibilityView: React.FC<PlayersEligibilityViewProps> = ({
  tournament,
  onAddCandidate,
  onBulkAddCandidates,
  onToggleBye,
  onToggleActive: _onToggleActive,
  onQuickDemoGenerator,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [csvText, setCsvText] = useState('');

  // Add Candidate Form fields
  const [name, setName] = useState('');
  const [rating, setRating] = useState('1500');
  const [title, setTitle] = useState<FideTitle>('NONE');
  const [birthYear, setBirthYear] = useState('2002');
  const [gender, setGender] = useState<'M' | 'F' | 'OTHER'>('M');
  const [organization, setOrganization] = useState('City Chess Club');
  const [fideId, setFideId] = useState('');

  // Real-time live eligibility preview for the modal form
  const candidatePreview = {
    name: name.trim() || 'New Candidate',
    rating: parseInt(rating, 10) || 0,
    title,
    birthYear: parseInt(birthYear, 10) || 2000,
    gender,
    organization: organization.trim(),
  };

  const validationPreview = validateCandidateEligibility(candidatePreview, tournament);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const trimmedFide = fideId.trim();
    if (!trimmedFide) {
      alert('FIDE ID is mandatory. Please enter a valid FIDE ID or select "Mark as Unranked".');
      return;
    }
    const finalFideId = trimmedFide.toLowerCase() === 'unranked' ? 'Unranked' : trimmedFide;

    if (!validationPreview.eligible) {
      if (!window.confirm(`Warning: Candidate fails eligibility rules:\n${validationPreview.reasons.join('\n')}\nAdd anyway as arbiter override?`)) {
        return;
      }
    }

    onAddCandidate({
      name: name.trim(),
      rating: finalFideId === 'Unranked' && (parseInt(rating, 10) || 0) === 0 ? 0 : (parseInt(rating, 10) || 0),
      title,
      birthYear: parseInt(birthYear, 10) || 2000,
      gender,
      organization: organization.trim(),
      fideId: finalFideId,
    });

    setName('');
    setFideId('');
    setShowAddModal(false);
  };

  const handleCsvSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) return;

    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const parsed: Array<{
      name: string;
      rating: number;
      title: FideTitle;
      birthYear: number;
      gender: 'M' | 'F' | 'OTHER';
      organization: string;
    }> = [];

    for (const line of lines) {
      const parts = line.split(',').map((s) => s.trim());
      if (parts.length < 2) continue;

      const pName = parts[0];
      const pRating = parseInt(parts[1], 10) || 0;
      const pTitle = (parts[2] || 'NONE').toUpperCase() as FideTitle;
      const pYear = parseInt(parts[3], 10) || 2000;
      const pGender = (parts[4]?.toUpperCase() === 'F' ? 'F' : 'M') as 'M' | 'F' | 'OTHER';
      const pOrg = parts[5] || 'Independent';

      parsed.push({
        name: pName,
        rating: pRating,
        title: ['GM', 'IM', 'WGM', 'FM', 'WIM', 'CM', 'WFM', 'WCM'].includes(pTitle) ? pTitle : 'NONE',
        birthYear: pYear,
        gender: pGender,
        organization: pOrg,
      });
    }

    onBulkAddCandidates(parsed);
    setCsvText('');
    setShowCsvModal(false);
  };

  const filteredPlayers = tournament.players.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.organization.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.tpn.toString().includes(searchTerm)
  );

  const nextRoundNum = tournament.currentRound + 1;
  const isCapReached = tournament.players.length >= tournament.rules.maxPlayers;
  const hasMinPlayers = tournament.players.length >= tournament.rules.minPlayers;

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '1.5rem 1.25rem' }}>
      {/* Top Banner with Progress toward 50 Players */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={22} color="var(--accent-gold)" />
              2. 👥 Players & Eligibility Roster
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Enrolled: <strong style={{ color: 'var(--text-primary)' }}>{tournament.players.length}</strong> / {tournament.rules.maxPlayers} Players (Min 50 required for FIDE Swiss bounds)
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            {tournament.status === 'REGISTRATION' && (
              <button
                className="btn btn-primary"
                onClick={onQuickDemoGenerator}
                title="Populate 64 realistic players immediately"
              >
                <Sparkles size={16} />
                1-Click 64 Demo Players
              </button>
            )}

            <button
              className="btn btn-secondary"
              onClick={() => setShowAddModal(true)}
              disabled={isCapReached}
            >
              <UserPlus size={16} />
              Add Candidate
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => setShowCsvModal(true)}
              disabled={isCapReached}
            >
              <Upload size={16} />
              Upload CSV / Excel
            </button>

            <button
              className="btn btn-outline"
              onClick={() => setShowShareModal(true)}
              title="Share player registration link"
            >
              <Share2 size={16} />
              Registration Link
            </button>
          </div>
        </div>

        {/* Progress bar to 50 players */}
        <div style={{ marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            <span>{hasMinPlayers ? '✅ Minimum 50 Player Requirement Met' : `⚠️ Need ${50 - tournament.players.length} more players to start`}</span>
            <span>Capacity: {tournament.players.length} / {tournament.rules.maxPlayers}</span>
          </div>
          <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, (tournament.players.length / tournament.rules.maxPlayers) * 100)}%`,
                background: hasMinPlayers
                  ? 'linear-gradient(90deg, #10b981, #059669)'
                  : 'linear-gradient(90deg, #f59e0b, #d97706)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search candidate name or club..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '0.45rem 0.75rem 0.45rem 2.2rem',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
            }}
          />
        </div>

        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Showing <strong>{filteredPlayers.length}</strong> candidates
        </div>
      </div>

      {/* Roster Table */}
      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
          <thead>
            <tr style={{
              borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--bg-secondary)',
              fontSize: '0.78rem',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}>
              <th style={{ padding: '0.75rem 0.75rem', width: '55px' }}>TPN</th>
              <th style={{ padding: '0.75rem 1rem' }}>Candidate Name</th>
              <th style={{ padding: '0.75rem 0.5rem', width: '60px' }}>Title</th>
              <th style={{ padding: '0.75rem 0.75rem', width: '75px', textAlign: 'right' }}>Rating</th>
              <th style={{ padding: '0.75rem 0.75rem', width: '75px', textAlign: 'center' }}>Age</th>
              <th style={{ padding: '0.75rem 0.5rem', width: '50px', textAlign: 'center' }}>Sex</th>
              <th style={{ padding: '0.75rem 1rem' }}>Club / College</th>
              <th style={{ padding: '0.75rem 0.75rem', width: '100px', textAlign: 'center' }}>Eligibility</th>
              <th style={{ padding: '0.75rem 1rem', width: '170px', textAlign: 'right' }}>Next Round Bye</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlayers.map((player) => {
              const fideAge = tournament.tournamentYear - player.birthYear;
              const hasRequestedBye = Boolean(player.requestedByes[nextRoundNum]);

              return (
                <tr
                  key={player.id}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    opacity: !player.isActive ? 0.45 : 1,
                  }}
                >
                  <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-gold)' }}>
                    #{player.tpn}
                  </td>
                  <td style={{ padding: '0.65rem 1rem', fontWeight: 600 }}>
                    {player.name}
                  </td>
                  <td style={{ padding: '0.65rem 0.5rem' }}>
                    {player.title !== 'NONE' ? (
                      <span className="badge badge-gold" style={{ fontSize: '0.68rem', padding: '0.1rem 0.35rem' }}>
                        {player.title}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {player.rating || 'unrated'}
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                    {fideAge}
                  </td>
                  <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                    <span className="badge badge-muted" style={{ fontSize: '0.68rem' }}>{player.gender}</span>
                  </td>
                  <td style={{ padding: '0.65rem 1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {player.organization}
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                    <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>
                      <CheckCircle2 size={12} />
                      Eligible
                    </span>
                  </td>
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>
                    <button
                      className={`btn ${hasRequestedBye ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                      onClick={() => onToggleBye(player.id, nextRoundNum)}
                      title={hasRequestedBye ? 'Player taking 0.5 pt bye next round' : 'Grant 0.5 pt requested bye'}
                    >
                      {hasRequestedBye ? '🏖️ Taking Bye (+0.5)' : 'Request Bye'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Candidate Modal with Real-Time Eligibility Gate Preview */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem' }}>
              Add Tournament Candidate (Instant Eligibility Check)
            </h3>

            {/* Live Real-Time Eligibility Box */}
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              marginBottom: '1.25rem',
              background: validationPreview.eligible ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
              border: `1px solid ${validationPreview.eligible ? 'var(--accent-emerald)' : 'var(--accent-rose)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.88rem' }}>
                {validationPreview.eligible ? (
                  <>
                    <CheckCircle2 size={16} color="var(--accent-emerald)" />
                    <span style={{ color: 'var(--accent-emerald)' }}>Candidate is 100% Eligible for {tournament.name}</span>
                  </>
                ) : (
                  <>
                    <XCircle size={16} color="var(--accent-rose)" />
                    <span style={{ color: 'var(--accent-rose)' }}>Candidate Ineligible Under Current Rules</span>
                  </>
                )}
              </div>
              {!validationPreview.eligible && (
                <ul style={{ margin: '0.35rem 0 0 1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {validationPreview.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              )}
            </div>

            <form onSubmit={handleAddSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Candidate Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kasparov, Garry"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '0.55rem 0.75rem',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    Rating (0 if unrated)
                  </label>
                  <input
                    type="number"
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '0.5rem',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    Birth Year
                  </label>
                  <input
                    type="number"
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '0.5rem',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'M' | 'F' | 'OTHER')}
                    style={{
                      width: '100%',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '0.5rem',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="M">Male (M)</option>
                    <option value="F">Female (F)</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    FIDE Title
                  </label>
                  <select
                    value={title}
                    onChange={(e) => setTitle(e.target.value as FideTitle)}
                    style={{
                      width: '100%',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '0.5rem',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="NONE">None</option>
                    <option value="GM">GM</option>
                    <option value="IM">IM</option>
                    <option value="WGM">WGM</option>
                    <option value="FM">FM</option>
                    <option value="WIM">WIM</option>
                    <option value="CM">CM</option>
                    <option value="WFM">WFM</option>
                    <option value="WCM">WCM</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    Organization / College
                  </label>
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '0.5rem',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      FIDE ID *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (fideId.toLowerCase() === 'unranked') {
                          setFideId('');
                        } else {
                          setFideId('Unranked');
                          if (!rating || rating === '0') setRating('');
                        }
                      }}
                      style={{
                        background: fideId.toLowerCase() === 'unranked' ? 'var(--navy-deep)' : 'var(--bg-secondary)',
                        color: fideId.toLowerCase() === 'unranked' ? '#ffffff' : 'var(--navy-deep)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '4px',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        cursor: 'pointer',
                      }}
                    >
                      {fideId.toLowerCase() === 'unranked' ? '✓ Unranked' : 'Mark Unranked'}
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={fideId}
                    onChange={(e) => setFideId(e.target.value)}
                    placeholder="e.g. 1503014 (or click Mark Unranked)"
                    style={{
                      width: '100%',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '0.5rem',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                    Mandatory. If candidate has no FIDE ID, click <strong>Mark Unranked</strong>.
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Enroll Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload CSV Modal */}
      {showCsvModal && (
        <div className="modal-overlay" onClick={() => setShowCsvModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              1-Click Excel / CSV Bulk Candidate Upload
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Paste lines: <code>Name, Rating, Title, BirthYear, Gender, Organization</code>
            </p>

            <form onSubmit={handleCsvSubmit}>
              <textarea
                rows={8}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Carlsen, Magnus, 2832, GM, 1990, M, Offerspill&#10;Nakamura, Hikaru, 2802, GM, 1987, M, US Chess&#10;Gukesh, D, 2794, GM, 2006, M, WACA"
                style={{
                  width: '100%',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem',
                  color: 'var(--text-primary)',
                  marginBottom: '1rem',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCsvModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Import & Validate Candidates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Public Registration Link / QR Code Modal */}
      {showShareModal && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="modal-content" style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <QrCode size={36} color="var(--accent-gold)" style={{ margin: '0 auto 0.5rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>
              Public Player Self-Registration Portal
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Players can scan this QR code on their phones to register directly with instant eligibility validation!
            </p>

            <div style={{ display: 'inline-block', background: '#fff', padding: '1rem', borderRadius: '10px', marginBottom: '1rem' }}>
              <svg width="150" height="150" viewBox="0 0 100 100" fill="#000">
                <rect x="0" y="0" width="30" height="30" />
                <rect x="5" y="5" width="20" height="20" fill="#fff" />
                <rect x="10" y="10" width="10" height="10" />
                <rect x="70" y="0" width="30" height="30" />
                <rect x="75" y="5" width="20" height="20" fill="#fff" />
                <rect x="80" y="10" width="10" height="10" />
                <rect x="0" y="70" width="30" height="30" />
                <rect x="5" y="75" width="20" height="20" fill="#fff" />
                <rect x="10" y="80" width="10" height="10" />
                <rect x="40" y="20" width="10" height="10" />
                <rect x="50" y="40" width="10" height="20" />
                <rect x="30" y="60" width="20" height="10" />
                <rect x="70" y="70" width="20" height="20" />
              </svg>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Registration link copied!');
                }}
              >
                Copy Link
              </button>
              <button className="btn btn-secondary" onClick={() => setShowShareModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
