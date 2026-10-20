import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowRight,
  Clock,
  ShieldCheck,
  Trophy,
  Sparkles,
  UserCheck,
  Lock,
  Building2,
  Zap,
  Printer,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Smartphone,
  Monitor,
} from 'lucide-react';
import { ArbiterProfile, formatArbiterBadge, createGuestOrganizerSession } from '../lib/arbiterAuth';

interface LandingHeroViewProps {
  activeArbiter: ArbiterProfile | null;
  onProceedToAuth: () => void;
  onEnterApp: () => void;
  onSignOut: () => void;
  onInstantGuestAccess: (guest: ArbiterProfile) => void;
}

export const LandingHeroView: React.FC<LandingHeroViewProps> = ({
  activeArbiter,
  onProceedToAuth,
  onEnterApp,
  onSignOut,
  onInstantGuestAccess,
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const [interactiveScore, setInteractiveScore] = useState<'PENDING' | '1-0' | '0-1' | '1/2-1/2'>('PENDING');
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [userSelectedFormat, setUserSelectedFormat] = useState<'AUTO' | 'PORTRAIT' | 'LANDSCAPE'>('AUTO');
  const [systemIsMobile, setSystemIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768;
    }
    return false;
  });

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setSystemIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isPortraitMode = userSelectedFormat === 'AUTO'
    ? systemIsMobile
    : userSelectedFormat === 'PORTRAIT';

  const currentVideoSrc = isPortraitMode ? '/portrait.mp4' : '/landing.mp4';

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [currentVideoSrc]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleAction = (callback: () => void) => {
    setIsExiting(true);
    setTimeout(() => {
      callback();
    }, 360);
  };

  const handleGuestClick = () => {
    const guest = createGuestOrganizerSession('Tournament Organizer', 'Club Open');
    handleAction(() => {
      onInstantGuestAccess(guest);
    });
  };

  return (
    <div
      className={isExiting ? 'animate-dimensional-out' : 'animate-dimensional-in'}
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 60%, #f1f5f9 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2.5rem 1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 1. Algorithmic Pairing Ticker Top Ribbon */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          background: 'var(--navy-deep)',
          color: '#ffffff',
          padding: '0.45rem 0.75rem',
          fontSize: '0.7rem',
          fontWeight: 700,
          letterSpacing: '0.06em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 40,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
          <span style={{ color: '#4ade80' }}>●</span> FIDE DUTCH C.04.3 CERTIFIED • MATHEMATICALLY VERIFIED TIE-BREAKS • ARBITERS & ORGANIZERS SUITE
        </span>
      </div>

      {/* 2. Background Dynamic Pairing Constellation Graphic */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
          zIndex: 0,
        }}
      >
        {/* Subtle geometric grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.04,
            backgroundImage:
              'linear-gradient(to right, #0a192f 1px, transparent 1px), linear-gradient(to bottom, #0a192f 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Floating Ambient Chess Symbols */}
        <div
          style={{
            position: 'absolute',
            top: '12%',
            left: '6%',
            fontSize: '4.5rem',
            opacity: 0.12,
            color: 'var(--navy-deep)',
            animation: 'pieceFloatLeft 6s ease-in-out infinite',
            userSelect: 'none',
          }}
        >
          ♔
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: '15%',
            left: '8%',
            fontSize: '3.8rem',
            opacity: 0.1,
            color: 'var(--navy-deep)',
            animation: 'pieceFloatRight 7s ease-in-out infinite',
            userSelect: 'none',
          }}
        >
          ♞
        </div>

        <div
          style={{
            position: 'absolute',
            top: '15%',
            right: '7%',
            fontSize: '4.2rem',
            opacity: 0.12,
            color: 'var(--green-primary)',
            animation: 'pieceFloatRight 6.5s ease-in-out infinite',
            userSelect: 'none',
          }}
        >
          ♕
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: '12%',
            right: '9%',
            fontSize: '4rem',
            opacity: 0.1,
            color: 'var(--navy-deep)',
            animation: 'pieceFloatLeft 8s ease-in-out infinite',
            userSelect: 'none',
          }}
        >
          ♜
        </div>
      </div>

      {/* 3. Main Centerpiece Presentation Card (100% Zoom Fitted) */}
      <div
        className="card-clean"
        style={{
          maxWidth: '860px',
          width: '100%',
          padding: '2.75rem 2.5rem',
          textAlign: 'center',
          position: 'relative',
          zIndex: 10,
          background: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(10, 25, 47, 0.12), 0 0 0 1px var(--navy-border-light)',
          borderRadius: '14px',
          marginTop: '2rem',
        }}
      >
        {/* Animated Grandmaster Chess Nexus Shield */}
        <div
          style={{
            position: 'relative',
            width: '88px',
            height: '88px',
            margin: '0 auto 1.25rem',
          }}
        >
          {/* Pulsing orbital ring */}
          <div
            style={{
              position: 'absolute',
              inset: '-6px',
              borderRadius: '26px',
              border: '2px dashed var(--green-border)',
              opacity: 0.7,
              animation: 'crownFloat 4s ease-in-out infinite',
            }}
          />

          <div
            style={{
              width: '88px',
              height: '88px',
              borderRadius: '22px',
              background: 'linear-gradient(135deg, var(--navy-deep) 0%, var(--navy-royal) 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '3.2rem',
              boxShadow: '0 12px 28px -6px rgba(10, 25, 47, 0.3)',
              position: 'relative',
              animation: 'crownFloat 3.5s ease-in-out infinite',
            }}
          >
            ♔
          </div>
        </div>

        {/* Official Authority Badge */}
        <div style={{ marginBottom: '0.85rem' }}>
          <span
            className="badge-minimal badge-navy"
            style={{
              padding: '0.35rem 0.95rem',
              fontSize: '0.72rem',
              letterSpacing: '0.08em',
              fontWeight: 800,
            }}
          >
            FIDE ARBITERS & TOURNAMENT DIRECTORS SUITE
          </span>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(1.75rem, 6vw, 2.6rem)',
            fontWeight: 800,
            color: 'var(--navy-deep)',
            letterSpacing: '0.04em',
            lineHeight: 1.15,
            marginBottom: '0.6rem',
          }}
        >
          CHESS SWISS PRO
        </h1>

        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'clamp(0.86rem, 2.8vw, 0.98rem)',
            color: 'var(--text-muted)',
            maxWidth: '620px',
            margin: '0 auto 1.5rem',
            lineHeight: 1.55,
          }}
        >
          The error-proof tournament engine built for <strong>Certified FIDE Arbiters</strong> and{' '}
          <strong>Club Tournament Organizers</strong>. 100% regulatory Dutch C.04.3 pairings, live 1-tap scoring, and
          Buchholz tie-breaks with zero setup friction.
        </p>

        {/* Cinematic Landing Page Animation Video Showcase */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: isPortraitMode ? '340px' : '680px',
            aspectRatio: isPortraitMode ? '9/16' : '16/9',
            maxHeight: isPortraitMode ? '560px' : 'none',
            margin: '0 auto 1.75rem',
            borderRadius: '14px',
            overflow: 'hidden',
            boxShadow: '0 20px 45px -10px rgba(10, 25, 47, 0.22), 0 0 0 1px rgba(10, 25, 47, 0.1)',
            background: '#0a192f',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'max-width 0.3s cubic-bezier(0.16, 1, 0.3, 1), aspect-ratio 0.3s ease',
          }}
        >
          <video
            ref={videoRef}
            key={currentVideoSrc}
            src={currentVideoSrc}
            poster="/hero.png"
            autoPlay
            loop
            muted={isMuted}
            playsInline
            onClick={togglePlay}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              cursor: 'pointer',
            }}
          />

          {/* Floating Subtle Engine Badge (Top Left) */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(10, 25, 47, 0.82)',
              backdropFilter: 'blur(8px)',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.66rem',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '0.04em',
              pointerEvents: 'none',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              zIndex: 4,
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: isPlaying ? '#4ade80' : '#f59e0b',
                display: 'inline-block',
                boxShadow: isPlaying ? '0 0 8px #4ade80' : 'none',
              }}
            />
            <span>
              {isPlaying
                ? isPortraitMode
                  ? 'MOBILE PORTRAIT'
                  : 'DESKTOP 16:9'
                : 'PAUSED'}
            </span>
          </div>

          {/* Device Format Switcher Pill (Top Right) */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              background: 'rgba(10, 25, 47, 0.82)',
              backdropFilter: 'blur(8px)',
              padding: '3px 4px',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              zIndex: 5,
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setUserSelectedFormat('LANDSCAPE');
              }}
              style={{
                background: !isPortraitMode ? 'var(--green-primary)' : 'transparent',
                color: !isPortraitMode ? '#ffffff' : 'rgba(255, 255, 255, 0.72)',
                border: 'none',
                borderRadius: '14px',
                padding: '3px 7px',
                fontSize: '0.64rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Laptop / Computer View (16:9 Gemini Video)"
            >
              <Monitor size={11} />
              <span>Laptop</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setUserSelectedFormat('PORTRAIT');
              }}
              style={{
                background: isPortraitMode ? 'var(--green-primary)' : 'transparent',
                color: isPortraitMode ? '#ffffff' : 'rgba(255, 255, 255, 0.72)',
                border: 'none',
                borderRadius: '14px',
                padding: '3px 7px',
                fontSize: '0.64rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Mobile Phone View (9:16 Portrait Video)"
            >
              <Smartphone size={11} />
              <span>Mobile</span>
            </button>
          </div>

          {/* Controls Bar Overlay (Bottom Right) */}
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              right: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              zIndex: 5,
            }}
          >
            {/* Play/Pause Button */}
            <button
              type="button"
              onClick={togglePlay}
              title={isPlaying ? 'Pause Animation' : 'Play Animation'}
              style={{
                background: 'rgba(10, 25, 47, 0.8)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                borderRadius: '8px',
                padding: '6px 11px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
                fontSize: '0.7rem',
                fontWeight: 600,
                transition: 'all 0.15s ease',
              }}
            >
              {isPlaying ? <Pause size={13} /> : <Play size={13} />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            {/* Audio Mute/Unmute Button */}
            <button
              type="button"
              onClick={toggleMute}
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              style={{
                background: 'rgba(10, 25, 47, 0.8)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: isMuted ? 'rgba(255, 255, 255, 0.75)' : '#4ade80',
                borderRadius: '8px',
                padding: '6px 11px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
                fontSize: '0.7rem',
                fontWeight: 600,
                transition: 'all 0.15s ease',
              }}
            >
              {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
              <span>{isMuted ? 'Unmute' : 'Audio On'}</span>
            </button>
          </div>
        </div>

        {/* Interactive Live 1-Tap Scoring Interactive Micro-Board */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--navy-border-light)',
            borderRadius: '10px',
            padding: '0.85rem 1rem',
            maxWidth: '560px',
            width: '100%',
            margin: '0 auto 1.5rem',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.65rem',
            }}
          >
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: 'var(--navy-deep)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Interactive Preview: 1-Tap Arbiter Scoring
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tap player or draw to test</span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              gap: '0.6rem',
              alignItems: 'center',
            }}
          >
            {/* White Player Button */}
            <button
              type="button"
              onClick={() => setInteractiveScore('1-0')}
              style={{
                background: interactiveScore === '1-0' ? 'var(--green-tint)' : '#ffffff',
                border:
                  interactiveScore === '1-0'
                    ? '2px solid var(--green-primary)'
                    : '1px solid var(--navy-border-light)',
                borderRadius: '6px',
                padding: '0.55rem 0.75rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy-deep)' }}>
                  ⚪ Grandmaster A
                </span>
                <span
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    color: interactiveScore === '1-0' ? 'var(--green-deep)' : 'var(--text-muted)',
                  }}
                >
                  {interactiveScore === '1-0' ? '1' : interactiveScore === '1/2-1/2' ? '½' : '0'}
                </span>
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                Elo: 2650 • Click to award 1.0 pt
              </div>
            </button>

            {/* Center Pill & Draw Button */}
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: 'var(--navy-deep)',
                  fontFamily: 'var(--font-mono)',
                  marginBottom: '0.25rem',
                }}
              >
                {interactiveScore === 'PENDING' ? 'vs' : interactiveScore}
              </div>
              <button
                type="button"
                onClick={() => setInteractiveScore('1/2-1/2')}
                style={{
                  fontSize: '0.68rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  border: '1px solid var(--navy-border)',
                  background: interactiveScore === '1/2-1/2' ? 'var(--navy-deep)' : '#ffffff',
                  color: interactiveScore === '1/2-1/2' ? '#ffffff' : 'var(--navy-deep)',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                ½ Draw
              </button>
            </div>

            {/* Black Player Button */}
            <button
              type="button"
              onClick={() => setInteractiveScore('0-1')}
              style={{
                background: interactiveScore === '0-1' ? 'var(--green-tint)' : '#ffffff',
                border:
                  interactiveScore === '0-1'
                    ? '2px solid var(--green-primary)'
                    : '1px solid var(--navy-border-light)',
                borderRadius: '6px',
                padding: '0.55rem 0.75rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy-deep)' }}>
                  ⚫ Grandmaster B
                </span>
                <span
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    color: interactiveScore === '0-1' ? 'var(--green-deep)' : 'var(--text-muted)',
                  }}
                >
                  {interactiveScore === '0-1' ? '1' : interactiveScore === '1/2-1/2' ? '½' : '0'}
                </span>
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                Elo: 2640 • Click to award 1.0 pt
              </div>
            </button>
          </div>
        </div>

        {/* 4 Feature Highlights Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '0.75rem',
            marginBottom: '2rem',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              padding: '0.85rem',
              borderRadius: '6px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--navy-border-light)',
            }}
          >
            <Clock size={16} color="var(--navy-royal)" style={{ marginBottom: '0.35rem' }} />
            <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--navy-deep)' }}>
              Live Round Timers
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              Round countdown with pause & audio chime
            </div>
          </div>

          <div
            style={{
              padding: '0.85rem',
              borderRadius: '6px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--navy-border-light)',
            }}
          >
            <ShieldCheck size={16} color="var(--green-primary)" style={{ marginBottom: '0.35rem' }} />
            <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--navy-deep)' }}>
              1-Tap Winner Scoring
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              Instant 1 pt / 0 pt / ½ draw button
            </div>
          </div>

          <div
            style={{
              padding: '0.85rem',
              borderRadius: '6px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--navy-border-light)',
            }}
          >
            <Printer size={16} color="var(--navy-royal)" style={{ marginBottom: '0.35rem' }} />
            <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--navy-deep)' }}>
              Print Bulletins
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              Official A4 FIDE pairing print sheets
            </div>
          </div>

          <div
            style={{
              padding: '0.85rem',
              borderRadius: '6px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--navy-border-light)',
            }}
          >
            <Trophy size={16} color="var(--green-primary)" style={{ marginBottom: '0.35rem' }} />
            <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--navy-deep)' }}>
              Buchholz & Elo ΔR
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              FIDE Handbook C.07 tie-break math
            </div>
          </div>
        </div>

        {/* Arbiter / Organizer Entry Action Buttons */}
        {activeArbiter ? (
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'var(--green-tint)',
                border: '1px solid var(--green-border)',
                padding: '0.45rem 1.1rem',
                borderRadius: '20px',
                marginBottom: '1.25rem',
                color: 'var(--green-deep)',
                fontSize: '0.84rem',
                fontWeight: 700,
              }}
            >
              <UserCheck size={15} />
              <span>Active Authority: {formatArbiterBadge(activeArbiter)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleAction(onEnterApp)}
                className="btn btn-primary-green"
                style={{
                  padding: '0.85rem 2.2rem',
                  fontSize: '0.98rem',
                  fontWeight: 700,
                }}
              >
                <span>Enter Tournament Workspace</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                onClick={onSignOut}
                className="btn btn-secondary-white"
                style={{ fontSize: '0.82rem' }}
              >
                <span>Switch / Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Split Entry Options: Certified Arbiter vs Non-Arbiter Director */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
                gap: '0.85rem',
                maxWidth: '640px',
                margin: '0 auto 1.25rem',
              }}
            >
              {/* Option A: Arbiter & Official Portal */}
              <button
                type="button"
                onClick={() => handleAction(onProceedToAuth)}
                className="btn btn-primary-navy"
                style={{
                  padding: '0.95rem 1.5rem',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textAlign: 'left' }}>
                  <Lock size={16} />
                  <div>
                    <div>Official Sign In / Register</div>
                    <div style={{ fontSize: '0.68rem', opacity: 0.8, fontWeight: 500 }}>
                      For Arbiters & Registered Organizers
                    </div>
                  </div>
                </div>
                <ArrowRight size={15} />
              </button>

              {/* Option B: Direct Non-Arbiter Quick Directorship */}
              <button
                type="button"
                onClick={handleGuestClick}
                className="btn btn-primary-green"
                style={{
                  padding: '0.95rem 1.5rem',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textAlign: 'left' }}>
                  <Zap size={16} />
                  <div>
                    <div>Quick Organizer Access</div>
                    <div style={{ fontSize: '0.68rem', opacity: 0.9, fontWeight: 500 }}>
                      Non-Arbiter • 1-Click Instant Start
                    </div>
                  </div>
                </div>
                <ArrowRight size={15} />
              </button>
            </div>

            <div
              style={{
                fontSize: '0.76rem',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Certified Arbiters (IA/FA/NA) & Non-Arbiter Club Directors have 100% full tournament capabilities.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
