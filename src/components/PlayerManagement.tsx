import React, { useState } from 'react';
import { Users, UserPlus, Search, Upload } from 'lucide-react';
import { FideTitle, Player } from '../types/chess';

interface PlayerManagementProps {
  players: Player[];
  currentRound: number;
  totalRounds: number;
  onAddPlayer: (playerData: {
    name: string;
    rating: number;
    title: FideTitle;
    federation: string;
    fideId: string;
  }) => void;
  onToggleActive: (tpn: number) => void;
  onToggleWithdraw: (tpn: number) => void;
  onRequestBye: (tpn: number, round: number, type: 'HPB' | 'ZPB' | null) => void;
  onImportBulkCSV: (csvText: string) => void;
}

// Mock FIDE Registry DB for instant ID lookup
const MOCK_FIDE_REGISTRY: Record<string, { name: string; rating: number; title: FideTitle; fed: string }> = {
  '1503014': { name: 'Carlsen, Magnus', rating: 2832, title: 'GM', fed: 'NOR' },
  '2016192': { name: 'Nakamura, Hikaru', rating: 2802, title: 'GM', fed: 'USA' },
  '2020009': { name: 'Caruana, Fabiano', rating: 2798, title: 'GM', fed: 'USA' },
  '46616543': { name: 'Gukesh, D', rating: 2794, title: 'GM', fed: 'IND' },
  '35009192': { name: 'Erigaisi, Arjun', rating: 2797, title: 'GM', fed: 'IND' },
  '25059530': { name: 'Praggnanandhaa, R', rating: 2749, title: 'GM', fed: 'IND' },
  '14204118': { name: 'Abdusattorov, Nodirbek', rating: 2777, title: 'GM', fed: 'UZB' },
  '12573981': { name: 'Firouzja, Alireza', rating: 2767, title: 'GM', fed: 'FRA' },
};

export const PlayerManagement: React.FC<PlayerManagementProps> = ({
  players,
  currentRound,
  totalRounds: _totalRounds,
  onAddPlayer,
  onToggleActive,
  onToggleWithdraw,
  onRequestBye,
  onImportBulkCSV,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvContent, setCsvContent] = useState('');

  // Add form fields
  const [fideId, setFideId] = useState('');
  const [name, setName] = useState('');
  const [rating, setRating] = useState('2200');
  const [title, setTitle] = useState<FideTitle>('None');
  const [federation, setFederation] = useState('FID');
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);

  const handleFideLookup = () => {
    if (!fideId.trim()) return;
    const found = MOCK_FIDE_REGISTRY[fideId.trim()];
    if (found) {
      setName(found.name);
      setRating(found.rating.toString());
      setTitle(found.title);
      setFederation(found.fed);
      setLookupMessage(`Found in FIDE rating database: ${found.name} (${found.title})`);
    } else {
      setLookupMessage('FIDE ID not in local cache; manual entry permitted.');
    }
  };

  const handleCreatePlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddPlayer({
      name: name.trim(),
      rating: parseInt(rating, 10) || 0,
      title,
      federation: federation.trim().toUpperCase() || 'FID',
      fideId: fideId.trim() || `${Date.now()}`,
    });

    setName('');
    setRating('2200');
    setTitle('None');
    setFideId('');
    setLookupMessage(null);
    setShowAddModal(false);
  };

  const handleCsvSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvContent.trim()) return;
    onImportBulkCSV(csvContent);
    setCsvContent('');
    setShowCsvModal(false);
  };

  const filteredPlayers = players.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.federation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.tpn.toString().includes(searchTerm)
  );

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.5rem 1.25rem' }}>
      {/* Top Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={20} color="var(--accent-gold)" />
            Player Roster & Registrations ({players.length})
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            FIDE C.04.1 Bounds: 50 ≤ N ≤ 200 • Seeding & Dynamic TPN Assignment
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '240px' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '0.45rem 0.75rem 0.45rem 2rem',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
              }}
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            <UserPlus size={16} />
            Add Player
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => setShowCsvModal(true)}
          >
            <Upload size={16} />
            Bulk CSV Import
          </button>
        </div>
      </div>

      {/* Roster Table */}
      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(13, 21, 39, 0.7)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              <th style={{ padding: '0.75rem 0.6rem', width: '60px' }}>TPN</th>
              <th style={{ padding: '0.75rem 1rem' }}>Name</th>
              <th style={{ padding: '0.75rem 0.5rem', width: '60px' }}>Title</th>
              <th style={{ padding: '0.75rem 0.5rem', width: '60px' }}>Fed</th>
              <th style={{ padding: '0.75rem 0.75rem', width: '80px', textAlign: 'right' }}>Rating</th>
              <th style={{ padding: '0.75rem 0.75rem', width: '100px' }}>FIDE ID</th>
              <th style={{ padding: '0.75rem 0.75rem', width: '80px', textAlign: 'center' }}>Score</th>
              <th style={{ padding: '0.75rem 0.75rem', width: '110px', textAlign: 'center' }}>Status</th>
              <th style={{ padding: '0.75rem 1rem', width: '220px', textAlign: 'right' }}>Arbiter Controls</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlayers.map((player) => (
              <tr
                key={player.tpn}
                style={{
                  borderBottom: '1px solid var(--border-subtle)',
                  opacity: player.isWithdrawn ? 0.45 : !player.isActive ? 0.7 : 1,
                }}
              >
                <td style={{ padding: '0.65rem 0.6rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-gold)' }}>
                  #{player.tpn}
                </td>
                <td style={{ padding: '0.65rem 1rem', fontWeight: 600 }}>
                  {player.name}
                </td>
                <td style={{ padding: '0.65rem 0.5rem' }}>
                  {player.title !== 'None' ? (
                    <span className="badge badge-gold" style={{ fontSize: '0.68rem', padding: '0.1rem 0.35rem' }}>
                      {player.title}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>-</span>
                  )}
                </td>
                <td style={{ padding: '0.65rem 0.5rem' }}>
                  <span className="badge badge-muted" style={{ fontSize: '0.65rem' }}>
                    {player.federation}
                  </span>
                </td>
                <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                  {player.rating || 'unrated'}
                </td>
                <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {player.fideId || '-'}
                </td>
                <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', fontWeight: 700, color: 'var(--accent-gold)', fontFamily: 'var(--font-mono)' }}>
                  {player.score.toFixed(1)}
                </td>
                <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                  {player.isWithdrawn ? (
                    <span className="badge badge-rose">Withdrawn</span>
                  ) : !player.isActive ? (
                    <span className="badge badge-muted">Inactive</span>
                  ) : player.requestedByeRound === currentRound ? (
                    <span className="badge badge-gold">Bye R{currentRound}</span>
                  ) : (
                    <span className="badge badge-emerald">Active</span>
                  )}
                </td>
                <td style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    {/* Bye request dropdown */}
                    <select
                      style={{
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-muted)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                        padding: '0.25rem 0.4rem',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                      }}
                      value={player.requestedByeRound === currentRound ? player.requestedByeType || '' : ''}
                      onChange={(e) => {
                        const val = e.target.value as 'HPB' | 'ZPB' | '';
                        onRequestBye(player.tpn, currentRound, val ? val : null);
                      }}
                    >
                      <option value="">Byes...</option>
                      <option value="HPB">HPB (+0.5)</option>
                      <option value="ZPB">ZPB (+0.0)</option>
                    </select>

                    <button
                      className="btn btn-outline"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                      onClick={() => onToggleActive(player.tpn)}
                    >
                      {player.isActive ? 'Pause' : 'Activate'}
                    </button>

                    <button
                      className={`btn ${player.isWithdrawn ? 'btn-secondary' : 'btn-outline'}`}
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: player.isWithdrawn ? '#34d399' : '#fb7185' }}
                      onClick={() => onToggleWithdraw(player.tpn)}
                    >
                      {player.isWithdrawn ? 'Re-enter' : 'Withdraw'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Player Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>
              Add Player (FIDE ID Auto-Lookup)
            </h3>

            <form onSubmit={handleCreatePlayer}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    FIDE ID (e.g. 1503014, 2016192, 46616543)
                  </label>
                  <input
                    type="text"
                    value={fideId}
                    onChange={(e) => setFideId(e.target.value)}
                    placeholder="Enter FIDE ID..."
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
                <div style={{ alignSelf: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleFideLookup}
                  >
                    <Search size={14} />
                    Lookup
                  </button>
                </div>
              </div>

              {lookupMessage && (
                <div style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', marginBottom: '1rem', background: 'rgba(245, 158, 11, 0.1)', padding: '0.5rem', borderRadius: '6px' }}>
                  {lookupMessage}
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Full Name (LastName, FirstName) *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Anand, Viswanathan"
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    Rating
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
                      padding: '0.5rem 0.75rem',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    Title
                  </label>
                  <select
                    value={title}
                    onChange={(e) => setTitle(e.target.value as FideTitle)}
                    style={{
                      width: '100%',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '0.5rem 0.75rem',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="None">None</option>
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
                    Federation
                  </label>
                  <input
                    type="text"
                    maxLength={3}
                    value={federation}
                    onChange={(e) => setFederation(e.target.value.toUpperCase())}
                    placeholder="e.g. IND"
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Player
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk CSV Modal */}
      {showCsvModal && (
        <div className="modal-overlay" onClick={() => setShowCsvModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Bulk Player Import (CSV / Excel format)
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Paste lines in format: <code>LastName, FirstName, Rating, Title, Federation, FideId</code>
            </p>

            <form onSubmit={handleCsvSubmit}>
              <textarea
                rows={8}
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                placeholder="Kasparov, Garry, 2812, GM, FID, 4100018&#10;Karpov, Anatoly, 2720, GM, FID, 4100026"
                style={{
                  width: '100%',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem',
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
                  Import Players
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
