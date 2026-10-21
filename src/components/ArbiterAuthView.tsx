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
  Zap,
  Crown,
  MapPin,
  User,
  Eye,
  EyeOff,
  RotateCcw,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  ArbiterProfile,
  ArbiterTitle,
  OfficialRoleType,
  registerOfficial,
  createGuestOrganizerSession,
} from '../lib/arbiterAuth';
import { syncArbiterToCloud, loginOfficialWithCloudFallback } from '../storage/supabaseSync';

interface ArbiterAuthViewProps {
  onSuccess: (arbiter: ArbiterProfile) => void;
  onBackToLanding?: () => void;
  onOpenAdminConsole?: () => void;
}

interface CleanInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  value: string;
  onClear: () => void;
  requiredBadge?: boolean;
}

const CleanInputField: React.FC<CleanInputProps> = ({
  label,
  sublabel,
  icon,
  value,
  onClear,
  requiredBadge = false,
  type = 'text',
  ...props
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.82rem',
          fontWeight: 700,
          color: 'var(--navy-deep)',
          letterSpacing: '0.01em',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          {icon}
          <span>{label}</span>
          {requiredBadge && <span style={{ color: '#ef4444', fontWeight: 800 }}>*</span>}
        </span>
      </label>

      <div style={{ position: 'relative', width: '100%' }}>
        <input
          {...props}
          type={type}
          value={value}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          style={{
            width: '100%',
            minHeight: '50px',
            padding: '0.75rem 2.75rem 0.75rem 1rem',
            fontSize: '0.92rem',
            borderRadius: '10px',
            border: '1.5px solid var(--navy-border-light)',
            background: '#ffffff',
            color: 'var(--navy-deep)',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            outline: 'none',
            ...props.style,
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--navy-royal)';
            e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 138, 0.1)';
            if (props.onFocus) props.onFocus(e);
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--navy-border-light)';
            e.target.style.boxShadow = 'none';
            if (props.onBlur) props.onBlur(e);
          }}
        />

        {/* 1-Tap Clear Button - Never Need to Backspace! */}
        {value.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            aria-label={`Clear ${label}`}
            title="Clear text (no backspace needed)"
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
              transition: 'background 0.15s ease, color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e2e8f0';
              e.currentTarget.style.color = '#0a192f';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {sublabel && (
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.35, paddingLeft: '2px' }}>
          {sublabel}
        </span>
      )}
    </div>
  );
};

export const ArbiterAuthView: React.FC<ArbiterAuthViewProps> = ({
  onSuccess,
  onBackToLanding,
  onOpenAdminConsole,
}) => {
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Role Category for Register & Login
  const [roleCategory, setRoleCategory] = useState<OfficialRoleType>('CERTIFIED_ARBITER');

  // Login Form States (Initialized strictly empty)
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register Form States (Initialized strictly empty - ZERO pre-fills)
  const [regName, setRegName] = useState('');
  const [regTitle, setRegTitle] = useState<ArbiterTitle | ''>('');
  const [regFideId, setRegFideId] = useState('');
  const [regFederation, setRegFederation] = useState('');
  const [regOrgName, setRegOrgName] = useState('');
  const [regCityCountry, setRegCityCountry] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Instant Reset: Clear all fields in 1 tap
  const handleClearAllFields = () => {
    setRegName('');
    setRegTitle('');
    setRegFideId('');
    setRegFederation('');
    setRegOrgName('');
    setRegCityCountry('');
    setRegEmail('');
    setRegPassword('');
    setLoginIdentifier('');
    setLoginPassword('');
    setErrorMessage(null);
  };

  const handleRoleCategoryChange = (newRole: OfficialRoleType) => {
    setRoleCategory(newRole);
    setRegTitle('');
    setErrorMessage(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await loginOfficialWithCloudFallback(loginIdentifier.trim(), loginPassword);
      if (result.success && result.profile) {
        onSuccess(result.profile);
      } else {
        setErrorMessage(result.error || 'Authentication failed. Please verify credentials.');
      }
    } catch {
      setErrorMessage('Authentication error. Please check your credentials and retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!regName.trim() || !regEmail.trim() || !regPassword) {
      setErrorMessage('Please fill in your name, contact email, and security password.');
      return;
    }

    // Determine fallback title if user hasn't explicitly chosen one
    const finalTitle: ArbiterTitle =
      regTitle !== ''
        ? regTitle
        : roleCategory === 'CERTIFIED_ARBITER'
        ? 'IA'
        : 'TOURNAMENT_DIRECTOR';

    setIsSubmitting(true);
    try {
      const result = registerOfficial({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        roleType: roleCategory,
        title: finalTitle,
        federation:
          roleCategory === 'ORGANIZER'
            ? regCityCountry.trim() || 'Club Open'
            : regFederation.trim() || 'FIDE',
        organizationName: roleCategory === 'ORGANIZER' ? regOrgName.trim() || undefined : undefined,
        fideId: roleCategory === 'CERTIFIED_ARBITER' ? regFideId.trim() || undefined : undefined,
      });

      if (result.success && result.profile) {
        // Automatically sync to cloud database so credentials persist on all devices & reloads
        syncArbiterToCloud(result.profile).catch((err) => console.warn('Cloud sync error:', err));
        onSuccess(result.profile);
      } else {
        setErrorMessage(result.error || 'Registration failed.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickGuestOrganizer = () => {
    const guest = createGuestOrganizerSession('Tournament Organizer', 'Club Open');
    syncArbiterToCloud(guest).catch(() => {});
    onSuccess(guest);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 50% 0%, rgba(30, 58, 138, 0.08) 0%, rgba(248, 250, 252, 1) 75%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(1rem, 4vw, 2.5rem)',
      }}
    >
      <div
        className="card-clean"
        style={{
          maxWidth: '640px',
          width: '100%',
          padding: 'clamp(1.5rem, 5vw, 2.75rem)',
          position: 'relative',
          background: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(10, 25, 47, 0.12), 0 0 0 1px rgba(10, 25, 47, 0.06)',
          border: '1px solid var(--navy-border-light)',
          borderRadius: '20px',
          overflow: 'hidden',
        }}
      >
        {/* Top Decorative Gradient Trim */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background:
              roleCategory === 'CERTIFIED_ARBITER'
                ? 'linear-gradient(90deg, #0a192f 0%, #1e3a8a 50%, #3b82f6 100%)'
                : 'linear-gradient(90deg, #14532d 0%, #166534 50%, #22c55e 100%)',
            transition: 'background 0.3s ease',
          }}
        />

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
              padding: '0.4rem 0.75rem',
              fontSize: '0.78rem',
              fontWeight: 600,
              gap: '0.35rem',
              borderRadius: '8px',
            }}
            title="Return to Intro Video"
          >
            <ArrowLeft size={13} />
            <span>Intro</span>
          </button>
        )}

        {/* Top Heraldic Icon & Badge */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem', paddingTop: onBackToLanding ? '0.75rem' : '0.25rem' }}>
          <div
            style={{
              width: '58px',
              height: '58px',
              borderRadius: '16px',
              background:
                roleCategory === 'CERTIFIED_ARBITER'
                  ? 'linear-gradient(135deg, #0a192f 0%, #1e3a8a 100%)'
                  : 'linear-gradient(135deg, #14532d 0%, #166534 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.75rem',
              fontSize: '1.85rem',
              boxShadow: '0 10px 20px -5px rgba(10, 25, 47, 0.25)',
              transition: 'background 0.3s ease',
            }}
          >
            {roleCategory === 'CERTIFIED_ARBITER' ? '⚖' : '🏛'}
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span
              className="badge-minimal badge-navy"
              style={{
                padding: '0.25rem 0.75rem',
                fontSize: '0.72rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
              }}
            >
              CHATURANGA • AUTHORITY ACCESS
            </span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(1.4rem, 4vw, 1.75rem)',
              fontWeight: 800,
              color: 'var(--navy-deep)',
              fontFamily: 'var(--font-heading)',
              letterSpacing: '0.03em',
              marginTop: '0.45rem',
            }}
          >
            Tournament Authority Portal
          </h1>
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.86rem',
              fontFamily: 'var(--font-sans)',
              marginTop: '0.25rem',
            }}
          >
            Open for Certified FIDE Arbiters and Non-Arbiter Tournament Directors.
          </p>
        </div>

        {/* Tab Switcher: Sign In vs Register (Modern iOS Pill Control) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.35rem',
            background: 'var(--bg-secondary)',
            padding: '0.3rem',
            borderRadius: '12px',
            marginBottom: '1.75rem',
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
              padding: '0.65rem',
              borderRadius: '9px',
              border: 'none',
              background: activeTab === 'LOGIN' ? '#ffffff' : 'transparent',
              color: activeTab === 'LOGIN' ? 'var(--navy-deep)' : 'var(--text-muted)',
              fontWeight: activeTab === 'LOGIN' ? 800 : 600,
              fontSize: '0.86rem',
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              boxShadow: activeTab === 'LOGIN' ? '0 2px 8px rgba(10, 25, 47, 0.08)' : 'none',
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
              padding: '0.65rem',
              borderRadius: '9px',
              border: 'none',
              background: activeTab === 'REGISTER' ? '#ffffff' : 'transparent',
              color: activeTab === 'REGISTER' ? 'var(--navy-deep)' : 'var(--text-muted)',
              fontWeight: activeTab === 'REGISTER' ? 800 : 600,
              fontSize: '0.86rem',
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              boxShadow: activeTab === 'REGISTER' ? '0 2px 8px rgba(10, 25, 47, 0.08)' : 'none',
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
              borderRadius: '8px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.5rem',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1. SIGN IN FORM (Clean Single-Column Layout) */}
        {activeTab === 'LOGIN' ? (
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <CleanInputField
              label="Official Email or FIDE Arbiter ID"
              sublabel="Enter the email address or FIDE ID used during registration."
              icon={<Mail size={15} color="var(--navy-royal)" />}
              value={loginIdentifier}
              onChange={(e) => setLoginIdentifier(e.target.value)}
              onClear={() => setLoginIdentifier('')}
              placeholder="e.g. director@chess-club.org or 1503014"
              required
              requiredBadge
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: 'var(--navy-deep)',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Lock size={15} color="var(--navy-royal)" />
                  <span>Security Password</span>
                  <span style={{ color: '#ef4444', fontWeight: 800 }}>*</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--navy-royal)',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {showLoginPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span>{showLoginPassword ? 'Hide' : 'Show'}</span>
                </button>
              </label>

              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your security password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '50px',
                    padding: '0.75rem 2.75rem 0.75rem 1rem',
                    fontSize: '0.92rem',
                    borderRadius: '10px',
                    border: '1.5px solid var(--navy-border-light)',
                    background: '#ffffff',
                    color: 'var(--navy-deep)',
                    outline: 'none',
                  }}
                />
                {loginPassword.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setLoginPassword('')}
                    aria-label="Clear password"
                    title="Clear password"
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      color: '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary-navy"
              style={{
                width: '100%',
                minHeight: '52px',
                fontSize: '0.96rem',
                fontWeight: 700,
                borderRadius: '12px',
                marginTop: '0.5rem',
                opacity: isSubmitting ? 0.75 : 1,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(10, 25, 47, 0.2)',
              }}
            >
              <span>{isSubmitting ? 'Authenticating & Verifying...' : 'Sign In as Tournament Official'}</span>
              <ArrowRight size={17} />
            </button>

            {/* Quick Guest Organizer 1-Click Access */}
            <div
              style={{
                marginTop: '1rem',
                padding: '1.1rem',
                borderRadius: '12px',
                background: 'var(--navy-tint)',
                border: '1px dashed var(--navy-border)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--navy-deep)', marginBottom: '0.25rem' }}>
                Conducting a Tournament Without an Account?
              </div>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Non-arbiters, club hosts, coaches, and teachers can jump directly into pairing and scoring right now.
              </p>
              <button
                type="button"
                onClick={handleQuickGuestOrganizer}
                className="btn btn-primary-green"
                style={{
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  padding: '0.6rem 1.25rem',
                  width: '100%',
                  borderRadius: '10px',
                }}
              >
                <Zap size={15} />
                <span>Quick Access: Continue as Guest Director</span>
              </button>
            </div>

            {onOpenAdminConsole && (
              <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={onOpenAdminConsole}
                  style={{
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid #f59e0b',
                    color: '#b45309',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    padding: '0.55rem 1rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    width: '100%',
                    justifyContent: 'center',
                  }}
                >
                  <Crown size={14} color="#d97706" />
                  <span>Website Administrator? Unlock All-Access Console</span>
                </button>
              </div>
            )}

            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                New official or club director?{' '}
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
                  Create an Arbiter or Director profile
                </button>
              </span>
            </div>
          </form>
        ) : (
          /* 2. REGISTRATION FORM (REDESIGNED ROLE CARDS + 100% SINGLE-COLUMN NO-BACKSPACE LAYOUT) */
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
            {/* Step 1: Interactive Role Selector - Beautiful Full-Width Cards */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.65rem',
                }}
              >
                <label
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--navy-deep)',
                  }}
                >
                  1. Select Your Tournament Role *
                </label>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {/* Role Option 1: Certified FIDE Arbiter */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleRoleCategoryChange('CERTIFIED_ARBITER')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleRoleCategoryChange('CERTIFIED_ARBITER');
                  }}
                  style={{
                    padding: '0.9rem 1.1rem',
                    borderRadius: '12px',
                    border:
                      roleCategory === 'CERTIFIED_ARBITER'
                        ? '2px solid var(--navy-royal)'
                        : '1.5px solid var(--navy-border-light)',
                    background: roleCategory === 'CERTIFIED_ARBITER' ? 'rgba(30, 58, 138, 0.05)' : '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.85rem',
                    transition: 'all 0.18s ease',
                    boxShadow:
                      roleCategory === 'CERTIFIED_ARBITER' ? '0 4px 12px rgba(30, 58, 138, 0.1)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: roleCategory === 'CERTIFIED_ARBITER' ? 'var(--navy-deep)' : '#f1f5f9',
                        color: roleCategory === 'CERTIFIED_ARBITER' ? '#ffffff' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                        flexShrink: 0,
                      }}
                    >
                      ⚖
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--navy-deep)' }}>
                          Certified FIDE Arbiter
                        </span>
                        <span
                          className="badge-minimal badge-navy"
                          style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}
                        >
                          FIDE Licensed
                        </span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        IA, FA, NA, CA title with official FIDE certification
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      border:
                        roleCategory === 'CERTIFIED_ARBITER'
                          ? '6px solid var(--navy-royal)'
                          : '2px solid var(--navy-border)',
                      background: '#ffffff',
                      flexShrink: 0,
                    }}
                  />
                </div>

                {/* Role Option 2: Non-Arbiter / Club Organizer */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleRoleCategoryChange('ORGANIZER')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleRoleCategoryChange('ORGANIZER');
                  }}
                  style={{
                    padding: '0.9rem 1.1rem',
                    borderRadius: '12px',
                    border:
                      roleCategory === 'ORGANIZER'
                        ? '2px solid var(--green-primary)'
                        : '1.5px solid var(--navy-border-light)',
                    background: roleCategory === 'ORGANIZER' ? 'rgba(22, 101, 52, 0.05)' : '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.85rem',
                    transition: 'all 0.18s ease',
                    boxShadow:
                      roleCategory === 'ORGANIZER' ? '0 4px 12px rgba(22, 101, 52, 0.1)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: roleCategory === 'ORGANIZER' ? 'var(--green-primary)' : '#f1f5f9',
                        color: roleCategory === 'ORGANIZER' ? '#ffffff' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                        flexShrink: 0,
                      }}
                    >
                      🏛
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--green-deep)' }}>
                          Non-Arbiter / Club Organizer
                        </span>
                        <span
                          className="badge-minimal badge-green"
                          style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}
                        >
                          No License Needed
                        </span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        Club host, academy coach, school teacher, or open tournament director
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      border:
                        roleCategory === 'ORGANIZER'
                          ? '6px solid var(--green-primary)'
                          : '2px solid var(--navy-border)',
                      background: '#ffffff',
                      flexShrink: 0,
                    }}
                  />
                </div>
              </div>

              {/* Informative Callout for Non-Arbiters */}
              {roleCategory === 'ORGANIZER' && (
                <div
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    background: 'var(--green-tint)',
                    border: '1px solid var(--green-border)',
                    fontSize: '0.75rem',
                    color: 'var(--green-deep)',
                    lineHeight: 1.45,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '6px',
                  }}
                >
                  <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>Full Directorship Access:</strong> You can create tournaments, pair Swiss rounds, manage timers, enter match scores, and print official bulletins without needing any FIDE license.
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Form Header with 1-Tap "Clear All Fields" Reset */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid var(--navy-border-light)',
                paddingTop: '1.1rem',
              }}
            >
              <label
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--navy-deep)',
                }}
              >
                2. Enter Your Profile Details *
              </label>

              {/* 1-Tap Reset: Clears every input instantly so the user NEVER has to backspace */}
              <button
                type="button"
                onClick={handleClearAllFields}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '0.2rem 0.4rem',
                  borderRadius: '4px',
                }}
                title="Clear all fields with one tap"
              >
                <RotateCcw size={12} />
                <span>Clear all fields</span>
              </button>
            </div>

            {/* Registration Form Fields - STRICTLY ONE BELOW ANOTHER (NO 2-COLUMN SQUEEZING) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {roleCategory === 'ORGANIZER' ? (
                /* ================= NON-ARBITER / CLUB & ACADEMY DIRECTORS ================= */
                <>
                  {/* 1. Organizer Directorship Title */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: 'var(--navy-deep)',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Award size={15} color="var(--green-deep)" />
                        <span>Director / Host Title</span>
                        <span style={{ color: '#ef4444', fontWeight: 800 }}>*</span>
                      </span>
                    </label>
                    <select
                      value={regTitle}
                      onChange={(e) => setRegTitle(e.target.value as ArbiterTitle)}
                      style={{
                        width: '100%',
                        minHeight: '50px',
                        padding: '0.75rem 1rem',
                        fontSize: '0.92rem',
                        fontWeight: 600,
                        borderRadius: '10px',
                        border: '1.5px solid var(--navy-border-light)',
                        background: '#ffffff',
                        color: regTitle ? 'var(--navy-deep)' : '#64748b',
                        outline: 'none',
                      }}
                    >
                      <option value="" disabled>
                        -- Select Director / Host Role --
                      </option>
                      <option value="TOURNAMENT_DIRECTOR">🏆 Tournament Director (General Chess Events)</option>
                      <option value="CLUB_ORGANIZER">🏛 Club Organizer (Local Chess Clubs & Arenas)</option>
                      <option value="SCHOOL_COACH">🎓 School Coach / Academy Teacher (Scholastic)</option>
                      <option value="CHESS_ORGANIZER">♟ Event Coordinator / League Host</option>
                    </select>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', paddingLeft: '2px' }}>
                      Displayed on pairings, award notices, and certificates.
                    </span>
                  </div>

                  {/* 2. Full Host / Director Name */}
                  <CleanInputField
                    label="Full Host / Director Name"
                    sublabel="Primary director signature on pairing notices, bulletins, and award sheets."
                    icon={<User size={15} color="var(--green-deep)" />}
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    onClear={() => setRegName('')}
                    placeholder="e.g. David Vance or Sarah Jenkins"
                    required
                    requiredBadge
                    name="director_legal_fullname_clean"
                  />

                  {/* 3. Club / Academy / School Organization */}
                  <CleanInputField
                    label="Club / Academy / Organization Name"
                    sublabel="Displayed on bulletin headers, live spectator links, and club affiliation tags."
                    icon={<Building2 size={15} color="var(--green-deep)" />}
                    value={regOrgName}
                    onChange={(e) => setRegOrgName(e.target.value)}
                    onClear={() => setRegOrgName('')}
                    placeholder="e.g. Zurich CC, Royal Knights Chess Academy, City High School"
                    required
                    requiredBadge
                    name="director_org_name_clean"
                  />

                  {/* 4. Host City & Country */}
                  <CleanInputField
                    label="Host City & Country"
                    sublabel="Location of your tournaments, halls, or online club jurisdiction."
                    icon={<MapPin size={15} color="var(--green-deep)" />}
                    value={regCityCountry}
                    onChange={(e) => setRegCityCountry(e.target.value)}
                    onClear={() => setRegCityCountry('')}
                    placeholder="e.g. Zurich, Switzerland or Mumbai, India"
                    required
                    requiredBadge
                    name="director_city_country_clean"
                  />
                </>
              ) : (
                /* ================= CERTIFIED FIDE ARBITERS ================= */
                <>
                  {/* 1. Licensed Arbiter Title */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: 'var(--navy-deep)',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Award size={15} color="var(--navy-royal)" />
                        <span>Licensed FIDE Arbiter Title</span>
                        <span style={{ color: '#ef4444', fontWeight: 800 }}>*</span>
                      </span>
                      <span className="badge-minimal badge-navy" style={{ fontSize: '0.62rem' }}>
                        FIDE B.02 Certified
                      </span>
                    </label>
                    <select
                      value={regTitle}
                      onChange={(e) => setRegTitle(e.target.value as ArbiterTitle)}
                      style={{
                        width: '100%',
                        minHeight: '50px',
                        padding: '0.75rem 1rem',
                        fontSize: '0.92rem',
                        fontWeight: 600,
                        borderRadius: '10px',
                        border: '1.5px solid var(--navy-border-light)',
                        background: '#ffffff',
                        color: regTitle ? 'var(--navy-deep)' : '#64748b',
                        outline: 'none',
                      }}
                    >
                      <option value="" disabled>
                        -- Select FIDE Arbiter Title --
                      </option>
                      <option value="IA">International Arbiter (IA - Category A/B/C/D)</option>
                      <option value="FA">FIDE Arbiter (FA)</option>
                      <option value="NA">National Arbiter (NA)</option>
                      <option value="CA">Club Arbiter (CA)</option>
                      <option value="CHIEF_ARBITER">Chief Arbiter / Section Arbiter</option>
                    </select>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', paddingLeft: '2px' }}>
                      Official title certified under FIDE Arbiters' Commission regulations.
                    </span>
                  </div>

                  {/* 2. Full Legal Arbiter Name */}
                  <CleanInputField
                    label="Full Legal Arbiter Name"
                    sublabel="Official name as recorded in the FIDE arbiter database."
                    icon={<UserCheck size={15} color="var(--navy-royal)" />}
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    onClear={() => setRegName('')}
                    placeholder="e.g. IA Alexander Vance or FA Maria Schmidt"
                    required
                    requiredBadge
                    name="arbiter_legal_fullname_clean"
                  />

                  {/* 3. FIDE Arbiter ID (Optional) */}
                  <CleanInputField
                    label="FIDE Arbiter ID"
                    sublabel="Your unique FIDE Arbiter registration code (leave blank if National or Club Arbiter)."
                    icon={<Award size={15} color="var(--navy-royal)" />}
                    value={regFideId}
                    onChange={(e) => setRegFideId(e.target.value)}
                    onClear={() => setRegFideId('')}
                    placeholder="e.g. 1503014 (or leave blank)"
                    name="arbiter_fide_id_clean"
                  />

                  {/* 4. National Chess Federation */}
                  <CleanInputField
                    label="National Chess Federation"
                    sublabel="Your affiliated national federation (e.g. Switzerland, India, USA, Germany, FIDE)."
                    icon={<Globe size={15} color="var(--navy-royal)" />}
                    value={regFederation}
                    onChange={(e) => setRegFederation(e.target.value)}
                    onClear={() => setRegFederation('')}
                    placeholder="e.g. Switzerland, India, USA, Germany, FIDE"
                    required
                    requiredBadge
                    name="arbiter_federation_clean_v3"
                  />
                </>
              )}

              {/* 5. Official Contact Email */}
              <CleanInputField
                label="Official Contact Email"
                sublabel="Used to sign in, synchronize tournament databases, and recover director access."
                icon={<Mail size={15} color="var(--navy-royal)" />}
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                onClear={() => setRegEmail('')}
                placeholder="e.g. director@chess-academy.org or arbiter@fide.com"
                required
                requiredBadge
                name="official_email_clean"
              />

              {/* 6. Security Password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: 'var(--navy-deep)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Lock size={15} color="var(--navy-royal)" />
                    <span>Security Password</span>
                    <span style={{ color: '#ef4444', fontWeight: 800 }}>*</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--navy-royal)',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {showRegPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    <span>{showRegPassword ? 'Hide' : 'Show'}</span>
                  </button>
                </label>

                <div style={{ position: 'relative', width: '100%' }}>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    placeholder="Create a secure password (minimum 6 characters)"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: '50px',
                      padding: '0.75rem 2.75rem 0.75rem 1rem',
                      fontSize: '0.92rem',
                      borderRadius: '10px',
                      border: '1.5px solid var(--navy-border-light)',
                      background: '#ffffff',
                      color: 'var(--navy-deep)',
                      outline: 'none',
                    }}
                  />
                  {regPassword.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setRegPassword('')}
                      aria-label="Clear password"
                      title="Clear password"
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        color: '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', paddingLeft: '2px' }}>
                  Secures your local offline vault and cloud director profile.
                </span>
              </div>
            </div>

            {/* Submit Registration Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={roleCategory === 'CERTIFIED_ARBITER' ? 'btn btn-primary-navy' : 'btn btn-primary-green'}
              style={{
                width: '100%',
                minHeight: '52px',
                fontSize: '0.96rem',
                fontWeight: 700,
                borderRadius: '12px',
                marginTop: '0.5rem',
                opacity: isSubmitting ? 0.75 : 1,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow:
                  roleCategory === 'CERTIFIED_ARBITER'
                    ? '0 4px 14px rgba(10, 25, 47, 0.2)'
                    : '0 4px 14px rgba(22, 101, 52, 0.25)',
              }}
            >
              <span>
                {isSubmitting
                  ? 'Creating Profile & Syncing...'
                  : roleCategory === 'CERTIFIED_ARBITER'
                  ? 'Register Official Arbiter Profile'
                  : 'Register Tournament Director Profile'}
              </span>
              <ShieldCheck size={17} />
            </button>

            <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
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
          <div
            style={{
              marginTop: '1.75rem',
              textAlign: 'center',
              borderTop: '1px solid var(--navy-border-light)',
              paddingTop: '1rem',
            }}
          >
            <button
              type="button"
              onClick={onBackToLanding}
              className="btn btn-minimal"
              style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}
            >
              ← Back to Landing Showcase
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
