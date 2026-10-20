import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  UserPlus,
  ArrowRight,
  ArrowLeft,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Upload,
  FolderOpen,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';
import { FideTitle, TournamentState } from '../lib/fideSwissEngine';
import { parsePastedPlayerList } from '../lib/playerListParser';
import { parseDocumentFile } from '../lib/fileDocumentParser';
import {
  sanitizePlayerName,
  sanitizeRating,
  sanitizeFideId,
  sanitizeOrganization,
} from '../lib/securitySanitizer';

interface Step2RosterEntryProps {
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
    fideId?: string;
  }>) => void;
  onRemovePlayer?: (playerId: string) => void;
  onLockAndPairRound1: () => void;
  onGoBack?: () => void;
}

export const Step2RosterEntry: React.FC<Step2RosterEntryProps> = ({
  tournament,
  onAddCandidate,
  onBulkAddCandidates,
  onRemovePlayer,
  onLockAndPairRound1,
  onGoBack,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedSheetName, setUploadedSheetName] = useState<string | null>(null);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states for individual add
  const [name, setName] = useState('');
  const [rating, setRating] = useState<number | ''>('');
  const [title, setTitle] = useState<FideTitle>('NONE');
  const [club, setClub] = useState('');
  const [fideId, setFideId] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const enrolledCount = tournament.players.length;
  const canStartRound1 = enrolledCount >= 2;

  // Reactively parse the pasted or file-extracted text
  const parsedPlayers = useMemo(() => {
    return parsePastedPlayerList(pasteText);
  }, [pasteText]);

  // Excluded row indices for fine-grained modal review
  const [excludedIndices, setExcludedIndices] = useState<Set<number>>(new Set());

  const activeParsedList = useMemo(() => {
    return parsedPlayers.filter((_, idx) => !excludedIndices.has(idx));
  }, [parsedPlayers, excludedIndices]);

  const stats = useMemo(() => {
    const rated = activeParsedList.filter((p) => p.rating > 0).length;
    const titled = activeParsedList.filter((p) => p.title !== 'NONE').length;
    const withFide = activeParsedList.filter((p) => Boolean(p.fideId && p.fideId.toLowerCase() !== 'unranked')).length;
    return { rated, titled, withFide };
  }, [activeParsedList]);

  // Handle Escape key to dismiss open modals cleanly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAddModal) setShowAddModal(false);
        if (showPasteModal) setShowPasteModal(false);
      }
    };
    if (showAddModal || showPasteModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddModal, showPasteModal]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    const sanitizedName = sanitizePlayerName(name);
    if (!sanitizedName) {
      setAddError('Player full name is required and must contain valid letters.');
      return;
    }

    const trimmedFide = fideId.trim();
    if (!trimmedFide) {
      setAddError('FIDE ID is mandatory. Please enter a valid FIDE ID or click "Mark as Unranked".');
      return;
    }

    const finalFideId = trimmedFide.toLowerCase() === 'unranked' ? 'Unranked' : sanitizeFideId(trimmedFide);
    const numRating = rating === '' ? 0 : sanitizeRating(Number(rating));

    onAddCandidate({
      name: sanitizedName,
      rating: finalFideId === 'Unranked' && numRating === 0 ? 0 : numRating,
      title,
      birthYear: 2000,
      gender: ['WGM', 'WIM', 'WFM', 'WCM'].includes(title) ? 'F' : 'M',
      organization: sanitizeOrganization(club) || 'Independent',
      fideId: finalFideId,
    });

    setName('');
    setRating('');
    setTitle('NONE');
    setClub('');
    setFideId('');
    setAddError(null);
    setShowAddModal(false);
  };

  const processFile = async (file: File) => {
    setIsFileLoading(true);
    setFileError(null);
    setShowPasteModal(true);

    const result = await parseDocumentFile(file);
    setIsFileLoading(false);

    if (result.success) {
      setUploadedFileName(result.fileName);
      setUploadedSheetName(result.sheetName || null);
      setPasteText(result.rawText);
      setExcludedIndices(new Set());
    } else {
      setFileError(result.error || 'Failed to extract players from the selected document.');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleConfirmImport = () => {
    if (activeParsedList.length === 0) return;

    onBulkAddCandidates(
      activeParsedList.map((p) => ({
        name: sanitizePlayerName(p.name),
        rating: sanitizeRating(p.rating),
        title: p.title,
        birthYear: p.birthYear,
        gender: p.gender,
        organization: sanitizeOrganization(p.organization) || 'Independent',
        fideId: p.fideId ? sanitizeFideId(p.fideId) : 'Unranked',
      }))
    );

    setPasteText('');
    setUploadedFileName(null);
    setExcludedIndices(new Set());
    setShowPasteModal(false);
  };

  const toggleExcludeIndex = (idx: number) => {
    const next = new Set(excludedIndices);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    setExcludedIndices(next);
  };

  return (
    <div className="app-container" style={{ paddingTop: '1.25rem', paddingBottom: '2.5rem' }}>
      {/* Hidden File Input for Device Document Browsing */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx,.xls,.docx,.csv,.txt,.tsv,.trf"
        style={{ display: 'none' }}
      />

      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span className="badge-minimal badge-navy" style={{ fontWeight: 800 }}>
              STEP 2: ROSTER INTAKE
            </span>
            {tournament.timeControlName && (
              <span className="badge-minimal badge-muted" style={{ fontFamily: 'var(--font-mono)' }}>
                ⏱ {tournament.timeControlName}
              </span>
            )}
          </div>
          <h2
            style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              color: 'var(--navy-deep)',
              fontFamily: 'var(--font-heading)',
              letterSpacing: '0.03em',
              marginBottom: '0.2rem',
            }}
          >
            Candidate Intake & Seeding
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', fontFamily: 'var(--font-sans)' }}>
            {enrolledCount > 0
              ? `${enrolledCount} candidate players enrolled and seeded by FIDE rating order.`
              : 'Browse Excel/Word documents from your device, paste rosters directly, or add players individually.'}
          </p>
        </div>        {/* Clean Actions */}
        <div className="roster-actions-bar" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {onGoBack && (
            <button
              type="button"
              onClick={onGoBack}
              className="btn btn-secondary-white"
              style={{ padding: '0.55rem 0.85rem', fontSize: '0.82rem', fontWeight: 600 }}
              title="Return to Step 1: Tournament Setup"
            >
              <ArrowLeft size={14} />
              <span>Back to Setup</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setExcludedIndices(new Set());
              setFileError(null);
              setShowPasteModal(true);
            }}
            className="btn btn-primary-navy"
            title="Browse device documents or paste Excel/Word lists"
          >
            <FolderOpen size={15} />
            <span>📁 Import Excel / Word Document</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="btn btn-secondary-white"
          >
            <UserPlus size={14} />
            <span>+ Add Player</span>
          </button>

          <button
            type="button"
            disabled={!canStartRound1}
            onClick={onLockAndPairRound1}
            className={`btn ${canStartRound1 ? 'btn-primary-green' : 'btn-secondary-white'} roster-generate-btn`}
            style={{ padding: '0.65rem 1.5rem', fontWeight: 700 }}
          >
            <span>Generate Round 1 Pairings</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* Main Roster Card */}
      <div className="card-clean responsive-card" style={{ padding: '1rem', overflow: 'hidden' }}>
        {enrolledCount === 0 ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              textAlign: 'center',
              padding: '4rem 1.5rem',
              border: isDragging ? '2px dashed var(--navy-royal)' : '1px solid transparent',
              background: isDragging ? '#eff6ff' : 'transparent',
              borderRadius: '8px',
              transition: 'all 0.15s ease',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: 'var(--bg-secondary)',
                color: 'var(--navy-deep)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
                fontSize: '2rem',
                border: '1px solid var(--navy-border-light)',
              }}
            >
              ♔
            </div>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--navy-deep)', marginBottom: '0.4rem' }}>
              {isDragging ? 'Drop Your Document Here' : 'Roster Ready for Candidate Intake'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', maxWidth: '520px', margin: '0 auto 1.5rem' }}>
              Drag and drop or browse your tournament document directly from your device (<strong>.xlsx</strong>, <strong>.xls</strong>, <strong>.docx</strong>, <strong>.csv</strong>), or paste copied cells below.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setExcludedIndices(new Set());
                  setFileError(null);
                  setShowPasteModal(true);
                }}
                className="btn btn-primary-navy"
                style={{ padding: '0.75rem 1.6rem' }}
              >
                <FolderOpen size={16} />
                <span>Browse Excel / Word Document</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="btn btn-secondary-white"
                style={{ padding: '0.75rem 1.4rem' }}
              >
                <UserPlus size={15} />
                <span>+ Add Single Player</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="table-responsive-container">
            <div className="mobile-table-hint">
              👈 Swipe table horizontally to view full candidate details 👉
            </div>
            <table className="table-minimal" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--navy-border-light)' }}>
                  <th className="table-sticky-col-rank" style={{ padding: '0.65rem 0.75rem', width: '60px', color: 'var(--text-muted)' }}>Seed #</th>
                  <th className="table-sticky-col-name" style={{ padding: '0.65rem 0.75rem', color: 'var(--navy-deep)' }}>Player Name</th>
                  <th style={{ padding: '0.65rem 0.75rem', width: '100px', color: 'var(--navy-deep)' }}>Elo Rating</th>
                  <th style={{ padding: '0.65rem 0.75rem', width: '90px', color: 'var(--navy-deep)' }}>Title</th>
                  <th style={{ padding: '0.65rem 0.75rem', width: '120px', color: 'var(--navy-deep)' }}>FIDE ID</th>
                  <th style={{ padding: '0.65rem 0.75rem', color: 'var(--navy-deep)' }}>Club / Federation</th>
                  <th style={{ padding: '0.65rem 0.75rem', width: '60px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {tournament.players.map((p, idx) => (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: '1px solid var(--navy-border-light)',
                      background: idx % 2 === 0 ? '#ffffff' : 'var(--bg-subtle)',
                    }}
                  >
                    <td className="table-sticky-col-rank" style={{ padding: '0.65rem 0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-muted)' }}>
                      #{p.tpn || idx + 1}
                    </td>
                    <td className="table-sticky-col-name" style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: 'var(--navy-deep)' }}>
                      {p.name}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'var(--font-mono)' }}>
                      {p.rating > 0 ? (
                        <strong>{p.rating}</strong>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Unranked</span>
                      )}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      {p.title !== 'NONE' ? (
                        <span className="badge-minimal badge-navy" style={{ fontWeight: 800 }}>
                          {p.title}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-light)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'var(--font-mono)' }}>
                      {p.fideId && p.fideId.toLowerCase() !== 'unranked' ? (
                        <span style={{ color: 'var(--navy-deep)', fontWeight: 600 }}>{p.fideId}</span>
                      ) : (
                        <span className="badge-minimal badge-muted" style={{ padding: '1px 6px', fontSize: '0.68rem' }}>Unranked</span>
                      )}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', color: 'var(--text-main)' }}>
                      {p.organization || 'Independent'}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                      {onRemovePlayer && (
                        <button
                          type="button"
                          onClick={() => onRemovePlayer(p.id)}
                          className="btn btn-minimal"
                          style={{ padding: '0.25rem', color: '#dc2626' }}
                          title="Remove player from tournament"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* INDIVIDUAL ADD MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--navy-deep)', fontWeight: 800 }}>Add Candidate Player</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-minimal" style={{ padding: '0.25rem' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--navy-deep)', marginBottom: '0.35rem' }}>
                  Player Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alexander Vance"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--navy-deep)', marginBottom: '0.35rem' }}>
                    Elo Rating
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 2150 (0 for UR)"
                    value={rating}
                    onChange={(e) => setRating(e.target.value === '' ? '' : Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--navy-deep)', marginBottom: '0.35rem' }}>
                    FIDE Title
                  </label>
                  <select
                    value={title}
                    onChange={(e) => setTitle(e.target.value as FideTitle)}
                    style={{ width: '100%', padding: '0.55rem' }}
                  >
                    <option value="NONE">None</option>
                    <option value="GM">GM</option>
                    <option value="IM">IM</option>
                    <option value="FM">FM</option>
                    <option value="CM">CM</option>
                    <option value="WGM">WGM</option>
                    <option value="WIM">WIM</option>
                    <option value="WFM">WFM</option>
                    <option value="WCM">WCM</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--navy-deep)' }}>
                      FIDE ID *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (fideId.toLowerCase() === 'unranked') {
                          setFideId('');
                        } else {
                          setFideId('Unranked');
                          if (!rating || rating === 0) setRating('');
                        }
                      }}
                      style={{
                        background: fideId.toLowerCase() === 'unranked' ? 'var(--navy-deep)' : 'var(--bg-secondary)',
                        color: fideId.toLowerCase() === 'unranked' ? '#ffffff' : 'var(--navy-deep)',
                        border: '1px solid var(--navy-border-light)',
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
                    placeholder="e.g. 1503018 (or click Mark Unranked)"
                    value={fideId}
                    onChange={(e) => setFideId(e.target.value)}
                    style={{
                      width: '100%',
                      borderColor: addError && !fideId.trim() ? '#dc2626' : undefined,
                    }}
                  />
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                    Mandatory. If player has no FIDE ID, click <strong>Mark Unranked</strong>.
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--navy-deep)', marginBottom: '0.35rem' }}>
                    Club / Federation
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Zurich CC"
                    value={club}
                    onChange={(e) => setClub(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {addError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', marginBottom: '1rem' }}>
                  ⚠ {addError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary-white">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary-navy">
                  Add Player
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADVANCED EXCEL & WORD DOCUMENT CONVERTER MODAL */}
      {showPasteModal && (
        <div className="modal-overlay" onClick={() => setShowPasteModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '760px', width: '95%' }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.35rem', color: 'var(--navy-deep)', fontWeight: 800 }}>
                  Import Players from Device Document
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  Browse <strong>Excel (.xlsx, .xls)</strong>, <strong>Word (.docx)</strong>, or <strong>CSV/TXT</strong> from your device, or paste text below.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="btn btn-minimal"
                style={{ padding: '0.25rem' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* BROWSE DOCUMENT FROM DEVICE DROPZONE */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                border: isDragging ? '2px dashed var(--navy-royal)' : '2px dashed var(--navy-border)',
                borderRadius: '8px',
                padding: '1.25rem',
                textAlign: 'center',
                background: isDragging ? '#eff6ff' : 'var(--bg-secondary)',
                marginBottom: '1rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.35rem',
                }}
              >
                <FolderOpen size={20} color="var(--navy-royal)" />
                <strong style={{ fontSize: '0.92rem', color: 'var(--navy-deep)' }}>
                  {isDragging ? 'Drop File to Convert Instantly' : 'Click to Browse Documents from Your Device'}
                </strong>
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
                Supports Microsoft Excel (<code>.xlsx</code>, <code>.xls</code>), Word Documents (<code>.docx</code>), CSV (<code>.csv</code>), and Text files (<code>.txt</code>)
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="btn btn-secondary-white"
                style={{ fontSize: '0.78rem', padding: '0.4rem 1rem' }}
              >
                <Upload size={14} />
                <span>Choose File from Computer</span>
              </button>

              {isFileLoading && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--navy-royal)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                  <RefreshCw size={14} className="spin" />
                  <span>Processing document structure...</span>
                </div>
              )}
            </div>

            {/* File Selected Badge */}
            {uploadedFileName && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.45rem 0.85rem',
                  background: 'var(--green-tint)',
                  border: '1px solid var(--green-border)',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  fontSize: '0.78rem',
                  color: 'var(--green-deep)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <FileSpreadsheet size={15} />
                  <span>
                    Active Document: <strong>{uploadedFileName}</strong>
                    {uploadedSheetName && (
                      <span style={{ marginLeft: '0.4rem', opacity: 0.9 }}>
                        (Worksheet: <em>{uploadedSheetName}</em>)
                      </span>
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUploadedFileName(null);
                    setUploadedSheetName(null);
                    setPasteText('');
                  }}
                  className="btn btn-minimal"
                  style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}
                >
                  Clear File
                </button>
              </div>
            )}

            {/* Error Message */}
            {fileError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem 0.85rem',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  fontSize: '0.78rem',
                  color: '#991b1b',
                }}
              >
                <AlertCircle size={15} />
                <span>{fileError}</span>
              </div>
            )}

            {/* Reactive Parsed Output Preview */}
            {parsedPlayers.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <CheckCircle2 size={16} color="var(--green-primary)" />
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--navy-deep)' }}>
                        {activeParsedList.length} Players Converted
                      </span>
                    </div>
                    {stats.titled > 0 && (
                      <span className="badge-minimal badge-navy" style={{ fontSize: '0.68rem', padding: '0.12rem 0.45rem' }}>
                        ⭐ {stats.titled} Titled
                      </span>
                    )}
                    {stats.rated > 0 && (
                      <span className="badge-minimal badge-muted" style={{ fontSize: '0.68rem', padding: '0.12rem 0.45rem' }}>
                        📊 {stats.rated} Rated
                      </span>
                    )}
                    {stats.withFide > 0 && (
                      <span className="badge-minimal badge-muted" style={{ fontSize: '0.68rem', padding: '0.12rem 0.45rem' }}>
                        🆔 {stats.withFide} FIDE IDs
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Review detected fields before confirming
                  </span>
                </div>

                {/* Preview Table */}
                <div
                  style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    border: '1px solid var(--navy-border-light)',
                    borderRadius: '6px',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--navy-border-light)' }}>
                        <th style={{ padding: '0.45rem 0.6rem', textAlign: 'left', width: '35px' }}>#</th>
                        <th style={{ padding: '0.45rem 0.6rem', textAlign: 'left' }}>Detected Name</th>
                        <th style={{ padding: '0.45rem 0.6rem', textAlign: 'left', width: '70px' }}>Elo</th>
                        <th style={{ padding: '0.45rem 0.6rem', textAlign: 'left', width: '60px' }}>Title</th>
                        <th style={{ padding: '0.45rem 0.6rem', textAlign: 'left', width: '90px' }}>FIDE ID</th>
                        <th style={{ padding: '0.45rem 0.6rem', textAlign: 'left' }}>Club / Fed</th>
                        <th style={{ padding: '0.45rem 0.6rem', textAlign: 'center', width: '40px' }}>Skip</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedPlayers.map((p, idx) => {
                        const isExcluded = excludedIndices.has(idx);
                        return (
                          <tr
                            key={idx}
                            style={{
                              borderBottom: '1px solid var(--navy-border-light)',
                              background: isExcluded ? '#fef2f2' : idx % 2 === 0 ? '#ffffff' : 'var(--bg-subtle)',
                              opacity: isExcluded ? 0.45 : 1,
                              textDecoration: isExcluded ? 'line-through' : 'none',
                            }}
                          >
                            <td style={{ padding: '0.4rem 0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                              {idx + 1}
                            </td>
                            <td style={{ padding: '0.4rem 0.6rem', fontWeight: 700, color: 'var(--navy-deep)' }}>
                              {p.name}
                            </td>
                            <td style={{ padding: '0.4rem 0.6rem', fontFamily: 'var(--font-mono)' }}>
                              {p.rating > 0 ? p.rating : <span style={{ color: 'var(--text-light)' }}>UR</span>}
                            </td>
                            <td style={{ padding: '0.4rem 0.6rem' }}>
                              {p.title !== 'NONE' ? (
                                <span className="badge-minimal badge-navy" style={{ fontSize: '0.65rem' }}>
                                  {p.title}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td style={{ padding: '0.4rem 0.6rem', fontFamily: 'var(--font-mono)' }}>
                              {p.fideId && p.fideId.toLowerCase() !== 'unranked' ? (
                                p.fideId
                              ) : (
                                <span className="badge-minimal badge-muted" style={{ fontSize: '0.65rem' }}>Unranked</span>
                              )}
                            </td>
                            <td style={{ padding: '0.4rem 0.6rem', color: 'var(--text-muted)' }}>
                              {p.organization}
                            </td>
                            <td style={{ padding: '0.4rem 0.6rem', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => toggleExcludeIndex(idx)}
                                className="btn btn-minimal"
                                style={{ padding: '0.15rem 0.35rem', fontSize: '0.7rem' }}
                                title={isExcluded ? 'Include player' : 'Skip this row'}
                              >
                                {isExcluded ? '↩' : '✕'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="btn btn-secondary-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={activeParsedList.length === 0}
                onClick={handleConfirmImport}
                className="btn btn-primary-green"
                style={{ fontWeight: 700, padding: '0.65rem 1.4rem' }}
              >
                <CheckCircle2 size={15} />
                <span>
                  {activeParsedList.length > 0
                    ? `Convert & Add ${activeParsedList.length} Players`
                    : 'Browse Document or Paste Above'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
