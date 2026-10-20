import React, { useState } from 'react';
import {
  ShieldCheck,
  UserCheck,
  ArrowRight,
  ArrowLeft,
  Lock,
  Mail,
  Globe,
  Award,
  AlertCircle,
  Building2,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  ArbiterProfile,
  ArbiterTitle,
  OfficialRoleType,
  loginOfficial,
  registerOfficial,
  createGuestOrganizerSession,
} from '../lib/arbiterAuth';

interface ArbiterAuthViewProps {
  onSuccess: (arbiter: ArbiterProfile) => void;
  onBackToLanding?: () => void;
}

export const ArbiterAuthView: React.FC<ArbiterAuthViewProps> = ({
  onSuccess,
  onBackToLanding,
}) => {
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Role Category for Register & Login
  const [roleCategory, setRoleCategory] = useState<OfficialRoleType>('CERTIFIED_ARBITER');

  // Login Form States
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register Form States
  const [regName, setRegName] = useState('');
  const [regTitle, setRegTitle] = useState<ArbiterTitle>('IA');
  const [regFideId, setRegFideId] = useState('');
  const [regFederation, setRegFederation] = useState('Switzerland (FIDE)');
  const [regOrgName, setRegOrgName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRoleCategoryChange = (newRole: OfficialRoleType) => {
    setRoleCategory(newRole);
    if (newRole === 'CERTIFIED_ARBITER') {
      setRegTitle('IA');
      setRegFederation('Switzerland (FIDE)');
    } else {
      setRegTitle('TOURNAMENT_DIRECTOR');
      setRegFederation('Open / Independent');
      setRegOrgName('Chess Club / Academy');
    }
    setErrorMessage(null);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const result = loginOfficial(loginIdentifier, loginPassword);
    if (result.success && result.profile) {
      onSuccess(result.profile);
    } else {
      setErrorMessage(result.error || 'Authentication failed. Please verify credentials.');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!regName.trim() || !regEmail.trim() || !regPassword) {
      setErrorMessage('Please fill in your name, email, and security password.');
      return;
    }

    const result = registerOfficial({
      name: regName.trim(),
      email: regEmail.trim(),
      password: regPassword,
      roleType: roleCategory,
      title: regTitle,
      federation: regFederation.trim(),
      organizationName: roleCategory === 'ORGANIZER' ? regOrgName.trim() : undefined,
      fideId: roleCategory === 'CERTIFIED_ARBITER' ? regFideId.trim() || undefined : undefined,
    });

    if (result.success && result.profile) {
      onSuccess(result.profile);
    } else {
      setErrorMessage(result.error || 'Registration failed.');
    }
  };

  const handleQuickGuestOrganizer = () => {
    const guest = createGuestOrganizerSession('Tournament Organizer', 'Club Open');
    onSuccess(guest);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
      }}
    >
      <div
        className="card-clean"
        style={{
          maxWidth: '560px',
          width: '100%',
          padding: 'clamp(1.25rem, 5vw, 2.5rem)',
          position: 'relative',
          background: '#ffffff',
          boxShadow: '0 20px 40px -15px rgba(10, 25, 47, 0.08)',
          border: '1px solid var(--navy-border-light)',
          borderRadius: '12px',
        }}
      >
        {/* Back to Intro Video Button */}
        {onBackToLanding && (
          <button
            type="button"
            onClick={onBackToLanding}
            className="btn btn-secondary-white"
            style={{
              position: 'absolute',
              top: '1rem',
              left: '1rem',
              padding: '0.35rem 0.65rem',
              fontSize: '0.78rem',
              fontWeight: 600,
              gap: '0.35rem',
            }}
            title="Return to Intro Video"
          >
            <ArrowLeft size={13} />
            <span>Intro</span>
          </button>
        )}

        {/* Top Heraldic Icon & Badge */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem', paddingTop: onBackToLanding ? '0.5rem' : '0' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '14px',
              background: 'var(--navy-deep)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.75rem',
              fontSize: '1.8rem',
              boxShadow: '0 8px 16px -4px rgba(10, 25, 47, 0.2)',
            }}
          >
            {roleCategory === 'CERTIFIED_ARBITER' ? '⚖' : '🏛'}
          </div>
          <span
            className="badge-minimal badge-navy"
            style={{
              padding: '0.25rem 0.75rem',
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              marginBottom: '0.5rem',
            }}
          >
            CHATURANGA • OFFICIAL AUTHORITY PORTAL
          </span>
          <h2
            style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              color: 'var(--navy-deep)',
              fontFamily: 'var(--font-heading)',
              letterSpacing: '0.04em',
              marginTop: '0.35rem',
            }}
          >
            CHATURANGA Authority Access
          </h2>
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.84rem',
              fontFamily: 'var(--font-sans)',
              marginTop: '0.25rem',
            }}
          >
            Open for Certified FIDE Arbiters and Non-Arbiter Tournament Directors.
          </p>
        </div>

        {/* Tab Switcher: Sign In vs Register */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.35rem',
            background: 'var(--bg-secondary)',
            padding: '0.25rem',
            borderRadius: '6px',
            marginBottom: '1.5rem',
            border: '1px solid var(--navy-border-light)',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab('LOGIN');
              setErrorMessage(null);
            }}
            style={{
              padding: '0.55rem',
              borderRadius: '5px',
              border: 'none',
              background: activeTab === 'LOGIN' ? '#ffffff' : 'transparent',
              color: activeTab === 'LOGIN' ? 'var(--navy-deep)' : 'var(--text-muted)',
              fontWeight: activeTab === 'LOGIN' ? 700 : 500,
              fontSize: '0.84rem',
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: activeTab === 'LOGIN' ? '0 1px 3px rgba(10, 25, 47, 0.08)' : 'none',
            }}
          >
            Official Sign In
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('REGISTER');
              setErrorMessage(null);
            }}
            style={{
              padding: '0.55rem',
              borderRadius: '5px',
              border: 'none',
              background: activeTab === 'REGISTER' ? '#ffffff' : 'transparent',
              color: activeTab === 'REGISTER' ? 'var(--navy-deep)' : 'var(--text-muted)',
              fontWeight: activeTab === 'REGISTER' ? 700 : 500,
              fontSize: '0.84rem',
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: activeTab === 'REGISTER' ? '0 1px 3px rgba(10, 25, 47, 0.08)' : 'none',
            }}
          >
            Register Profile
          </button>
        </div>

        {/* Error Alert Message */}
        {errorMessage && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.25rem',
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1. SIGN IN FORM */}
        {activeTab === 'LOGIN' ? (
          <form onSubmit={handleLoginSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--navy-deep)',
                  marginBottom: '0.35rem',
                }}
              >
                Official Email or FIDE Arbiter ID *
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type="text"
                  required
                  placeholder="arbiter@fide.com or organizer@club.org"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  style={{ width: '100%', paddingLeft: '2.25rem' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--navy-deep)',
                  marginBottom: '0.35rem',
                }}
              >
                Password *
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  style={{ width: '100%', paddingLeft: '2.25rem' }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary-navy"
              style={{
                width: '100%',
                padding: '0.75rem 1.5rem',
                fontSize: '0.92rem',
                fontWeight: 700,
                marginBottom: '0.75rem',
              }}
            >
              <span>Sign In as Tournament Official</span>
              <ArrowRight size={16} />
            </button>

            {/* Quick Guest Organizer 1-Click Access */}
            <div
              style={{
                marginTop: '1.25rem',
                padding: '0.85rem',
                borderRadius: '8px',
                background: 'var(--navy-tint)',
                border: '1px dashed var(--navy-border)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--navy-deep)', marginBottom: '0.2rem' }}>
                Conducting a Tournament Without an Account?
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                Non-arbiters, club hosts, and teachers can jump right into pairing and scoring immediately.
              </p>
              <button
                type="button"
                onClick={handleQuickGuestOrganizer}
                className="btn btn-primary-green"
                style={{
                  fontSize: '0.8rem',
                  padding: '0.45rem 1.1rem',
                  width: '100%',
                }}
              >
                <Zap size={14} />
                <span>Quick Access: Continue as Guest Organizer</span>
              </button>
            </div>

            <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                New official or club host?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('REGISTER');
                    setErrorMessage(null);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--navy-royal)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Create an Arbiter or Organizer profile
                </button>
              </span>
            </div>
          </form>
        ) : (
          /* 2. REGISTRATION FORM (WITH ARBITER VS NON-ARBITER ROLE SELECTOR) */
          <form onSubmit={handleRegisterSubmit}>
            {/* Role Selection Toggle */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--navy-deep)',
                  marginBottom: '0.45rem',
                }}
              >
                Select Your Tournament Role *
              </label>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => handleRoleCategoryChange('CERTIFIED_ARBITER')}
                  style={{
                    padding: '0.65rem 0.75rem',
                    borderRadius: '6px',
                    border:
                      roleCategory === 'CERTIFIED_ARBITER'
                        ? '2px solid var(--navy-deep)'
                        : '1px solid var(--navy-border-light)',
                    background: roleCategory === 'CERTIFIED_ARBITER' ? 'var(--navy-tint)' : '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ fontSize: '1rem' }}>⚖</span>
                    <strong style={{ fontSize: '0.82rem', color: 'var(--navy-deep)' }}>
                      Certified FIDE Arbiter
                    </strong>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    IA, FA, NA title with FIDE license
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleCategoryChange('ORGANIZER')}
                  style={{
                    padding: '0.65rem 0.75rem',
                    borderRadius: '6px',
                    border:
                      roleCategory === 'ORGANIZER'
                        ? '2px solid var(--green-primary)'
                        : '1px solid var(--navy-border-light)',
                    background: roleCategory === 'ORGANIZER' ? 'var(--green-tint)' : '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ fontSize: '1rem' }}>🏛</span>
                    <strong style={{ fontSize: '0.82rem', color: 'var(--green-deep)' }}>
                      Non-Arbiter / Organizer
                    </strong>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    Club host, coach, or director (No license needed)
                  </div>
                </button>
              </div>

              {/* Informative message for non-arbiters */}
              {roleCategory === 'ORGANIZER' && (
                <div
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '6px',
                    background: 'var(--green-tint)',
                    border: '1px solid var(--green-border)',
                    fontSize: '0.74rem',
                    color: 'var(--green-deep)',
                    lineHeight: 1.4,
                  }}
                >
                  ✓ <strong>Full Directorship Access:</strong> Non-arbiters can create tournaments, pair Swiss rounds, manage timers, enter match scores, and print official bulletins without requiring a FIDE license.
                </div>
              )}
            </div>

            {/* Role Title and Name */}
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--navy-deep)', marginBottom: '0.3rem' }}>
                  {roleCategory === 'CERTIFIED_ARBITER' ? 'Arbiter Title *' : 'Organizer Title *'}
                </label>
                <select
                  value={regTitle}
                  onChange={(e) => setRegTitle(e.target.value as ArbiterTitle)}
                  style={{ width: '100%', padding: '0.55rem', fontSize: '0.82rem' }}
                >
                  {roleCategory === 'CERTIFIED_ARBITER' ? (
                    <>
                      <option value="IA">IA (Intl. Arbiter)</option>
                      <option value="FA">FA (FIDE Arbiter)</option>
                      <option value="NA">NA (National Arbiter)</option>
                      <option value="CA">Club Arbiter</option>
                      <option value="CHIEF_ARBITER">Chief Arbiter</option>
                    </>
                  ) : (
                    <>
                      <option value="TOURNAMENT_DIRECTOR">Tournament Director</option>
                      <option value="CLUB_ORGANIZER">Club Organizer</option>
                      <option value="SCHOOL_COACH">School / Coach</option>
                      <option value="CHESS_ORGANIZER">Event Coordinator</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--navy-deep)', marginBottom: '0.3rem' }}>
                  Full Legal / Host Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder={roleCategory === 'CERTIFIED_ARBITER' ? 'e.g. Alexander Vance' : 'e.g. Sarah Jenkins'}
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* FIDE ID & Federation OR Organization & Location */}
            {roleCategory === 'CERTIFIED_ARBITER' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--navy-deep)', marginBottom: '0.3rem' }}>
                    FIDE Arbiter ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1503014"
                    value={regFideId}
                    onChange={(e) => setRegFideId(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--navy-deep)', marginBottom: '0.3rem' }}>
                    National Federation *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Switzerland"
                    value={regFederation}
                    onChange={(e) => setRegFederation(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--navy-deep)', marginBottom: '0.3rem' }}>
                    Club / Academy / School *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Zurich Chess Society"
                    value={regOrgName}
                    onChange={(e) => setRegOrgName(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--navy-deep)', marginBottom: '0.3rem' }}>
                    City / Country
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. London / Open"
                    value={regFederation}
                    onChange={(e) => setRegFederation(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--navy-deep)', marginBottom: '0.3rem' }}>
                Official Contact Email *
              </label>
              <input
                type="email"
                required
                placeholder="contact@chess-federation.org"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--navy-deep)', marginBottom: '0.3rem' }}>
                Security Password *
              </label>
              <input
                type="password"
                required
                placeholder="Minimum 6 characters"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary-green"
              style={{
                width: '100%',
                padding: '0.75rem 1.5rem',
                fontSize: '0.92rem',
                fontWeight: 700,
              }}
            >
              <span>
                {roleCategory === 'CERTIFIED_ARBITER'
                  ? 'Register Official Arbiter Profile'
                  : 'Register Tournament Director Profile'}
              </span>
              <ShieldCheck size={16} />
            </button>

            <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('LOGIN');
                    setErrorMessage(null);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--navy-royal)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Sign in here
                </button>
              </span>
            </div>
          </form>
        )}

        {/* Back Link */}
        {onBackToLanding && (
          <div style={{ marginTop: '1.5rem', textAlign: 'center', borderTop: '1px solid var(--navy-border-light)', paddingTop: '1rem' }}>
            <button
              type="button"
              onClick={onBackToLanding}
              className="btn btn-minimal"
              style={{ fontSize: '0.78rem' }}
            >
              ← Back to Landing Showcase
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
