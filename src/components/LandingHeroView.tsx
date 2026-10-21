import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, Play, Pause, Zap, Shield, Sparkles } from 'lucide-react';
import { ArbiterProfile, createGuestOrganizerSession } from '../lib/arbiterAuth';

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
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  // Automatic Device & Screen Detection:
  // Laptops, PCs, and widescreen computers -> '/landing.mp4' (landscape 16:9)
  // Mobile devices and portrait screens -> '/portrait.mp4' (portrait 9:16)
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const isNarrow = window.innerWidth <= 768;
    const isPortrait = window.innerHeight > window.innerWidth;
    const isMobileDevice = /Android|iPhone|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    return isNarrow || (isMobileDevice && isPortrait) || (isPortrait && window.innerWidth < 1024);
  });

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleResize = () => {
      const isNarrow = window.innerWidth <= 768;
      const isPortrait = window.innerHeight > window.innerWidth;
      const isMobileDevice = /Android|iPhone|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      setIsMobile(isNarrow || (isMobileDevice && isPortrait) || (isPortrait && window.innerWidth < 1024));
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const currentVideoSrc = isMobile ? '/portrait.mp4' : '/landing.mp4';
  const targetDestination = activeArbiter ? onEnterApp : onProceedToAuth;

  // Ensure seamless, uninterrupted autoplay when mounted or when source changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.log('Video autoplay notice:', err);
            setIsPlaying(false);
          });
      }
    }
  }, [currentVideoSrc]);

  // Keyboard shortcuts: Spacebar toggles Play/Pause, Enter/Escape skips to portal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        handleAction(targetDestination);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [targetDestination]);

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    const dur = videoRef.current.duration;
    if (dur && dur > 0) {
      setProgressPercent((cur / dur) * 100);
      setRemainingSeconds(Math.max(0, Math.ceil(dur - cur)));
    }
  };

  const handleAction = (callback: () => void) => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      callback();
    }, 320);
  };

  const handleQuickGuest = () => {
    const guest = createGuestOrganizerSession('Tournament Organizer', 'Club Open');
    onInstantGuestAccess(guest);
  };

  return (
    <div
      className={isExiting ? 'animate-dimensional-out' : 'animate-dimensional-in'}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        background: '#edeae4',
        overflow: 'hidden',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        margin: 0,
        userSelect: 'none',
      }}
    >
      {/* 
        ========================================================================
        CROPPED VIDEO CONTAINER:
        The video is scaled by 1.15 and translated slightly away from the bottom-right
        so that any corner watermark (like the Gemini sparkle) is pushed completely
        past the viewport boundary and clipped off by overflow: hidden.
        ========================================================================
      */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          backgroundColor: '#edeae4',
        }}
      >
        <video
          ref={videoRef}
          key={currentVideoSrc}
          src={currentVideoSrc}
          autoPlay
          muted
          playsInline
          controls={false}
          disablePictureInPicture
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => handleAction(targetDestination)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center center',
            display: 'block',
            backgroundColor: '#edeae4',
            transform: 'scale(1.16) translate(-2.5%, -2.5%)',
            transformOrigin: 'center center',
            transition: 'transform 0.2s ease',
          }}
        />

        {/* 
          Aesthetic Corner Blend Guard:
          Matches the exact creamy off-white (#edeae4) of the chess animation,
          ensuring zero trace of any watermark can leak through on any aspect ratio.
        */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: '190px',
            height: '110px',
            background: 'radial-gradient(ellipse at 100% 100%, #edeae4 50%, rgba(237, 234, 228, 0.85) 75%, transparent 100%)',
            pointerEvents: 'none',
            zIndex: 3,
          }}
        />
      </div>

      {/* Top Glassmorphic Navigation Bar */}
      <div
        style={{
          position: 'absolute',
          top: 'max(16px, env(safe-area-inset-top, 16px))',
          left: 'max(16px, env(safe-area-inset-left, 16px))',
          right: 'max(16px, env(safe-area-inset-right, 16px))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 20,
          pointerEvents: 'none',
        }}
      >
        {/* Left: Brand Insignia Badge */}
        <div
          style={{
            background: 'rgba(10, 25, 47, 0.88)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '9999px',
            padding: '6px 14px 6px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
            pointerEvents: 'auto',
          }}
        >
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1e3a8a, #166534)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
            }}
          >
            ♟
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '0.08em',
                lineHeight: 1.1,
              }}
            >
              CHATURANGA
            </span>
            <span
              style={{
                fontSize: '0.62rem',
                color: '#94a3b8',
                fontWeight: 600,
                letterSpacing: '0.04em',
              }}
            >
              FIDE Official Suite
            </span>
          </div>
        </div>

        {/* Right: Quick Skip Button */}
        <button
          type="button"
          onClick={() => handleAction(targetDestination)}
          style={{
            background: 'rgba(10, 25, 47, 0.85)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            borderRadius: '9999px',
            padding: '7px 16px',
            fontSize: '0.8rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.2)',
            pointerEvents: 'auto',
            transition: 'all 0.18s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#1e3a8a';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(10, 25, 47, 0.85)';
            e.currentTarget.style.transform = 'translateY(0px)';
          }}
          title="Skip intro video (Enter or Esc)"
        >
          <span>Skip Video</span>
          <ArrowRight size={13} />
        </button>
      </div>

      {/* Floating Bottom Control Dock */}
      <div
        style={{
          position: 'absolute',
          bottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
          left: 'max(16px, env(safe-area-inset-left, 16px))',
          right: 'max(16px, env(safe-area-inset-right, 16px))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          zIndex: 20,
          pointerEvents: 'none',
        }}
      >
        {/* Play / Pause Toggle Button */}
        <button
          type="button"
          onClick={togglePlayPause}
          style={{
            background: 'rgba(10, 25, 47, 0.82)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            borderRadius: '9999px',
            padding: '8px 14px',
            fontSize: '0.78rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.22)',
            pointerEvents: 'auto',
            transition: 'all 0.18s ease',
          }}
          title={isPlaying ? 'Pause video (Spacebar)' : 'Play video (Spacebar)'}
        >
          {isPlaying ? <Pause size={13} /> : <Play size={13} />}
          <span>{isPlaying ? 'Pause' : 'Play'}</span>
          {remainingSeconds !== null && isPlaying && (
            <span
              style={{
                fontSize: '0.7rem',
                color: '#94a3b8',
                marginLeft: '4px',
                paddingLeft: '6px',
                borderLeft: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              {remainingSeconds}s
            </span>
          )}
        </button>

        {/* Primary Action Group (Right Side) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            pointerEvents: 'auto',
          }}
        >
          {/* Quick Casual Access for Non-Arbiters / Teachers */}
          {!activeArbiter && (
            <button
              type="button"
              onClick={handleQuickGuest}
              style={{
                background: 'rgba(255, 255, 255, 0.92)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                color: 'var(--navy-deep)',
                border: '1px solid rgba(10, 25, 47, 0.15)',
                borderRadius: '9999px',
                padding: '9px 16px',
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(10, 25, 47, 0.12)',
                transition: 'all 0.18s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.92)';
                e.currentTarget.style.transform = 'translateY(0px)';
              }}
              title="Jump straight in without an account"
            >
              <Zap size={14} color="#166534" />
              <span>Guest Director</span>
            </button>
          )}

          {/* Primary Action Button */}
          {activeArbiter ? (
            <button
              type="button"
              onClick={() => handleAction(onEnterApp)}
              style={{
                background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '9999px',
                padding: '9px 20px',
                fontSize: '0.86rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(22, 101, 52, 0.4)',
                transition: 'all 0.18s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 28px rgba(22, 101, 52, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(22, 101, 52, 0.4)';
              }}
            >
              <span>Continue as {activeArbiter.name.split(' ')[0]}</span>
              <ArrowRight size={15} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleAction(onProceedToAuth)}
              style={{
                background: 'linear-gradient(135deg, #0a192f 0%, #1e3a8a 100%)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '9999px',
                padding: '9px 20px',
                fontSize: '0.86rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(10, 25, 47, 0.35)',
                transition: 'all 0.18s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #172554 0%, #2563eb 100%)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 28px rgba(30, 58, 138, 0.45)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #0a192f 0%, #1e3a8a 100%)';
                e.currentTarget.style.transform = 'translateY(0px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(10, 25, 47, 0.35)';
              }}
            >
              <span>Enter Authority Portal</span>
              <ArrowRight size={15} />
            </button>
          )}

          {activeArbiter && (
            <button
              type="button"
              onClick={onSignOut}
              style={{
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(12px)',
                color: '#f87171',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '9999px',
                padding: '8px 14px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.18s ease',
              }}
            >
              Sign Out
            </button>
          )}
        </div>
      </div>

      {/* Sleek Glowing Emerald Progress Bar at Bottom Edge */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'rgba(0, 0, 0, 0.08)',
          zIndex: 30,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
            boxShadow: '0 0 10px rgba(16, 185, 129, 0.8)',
            transition: 'width 0.1s linear',
          }}
        />
      </div>
    </div>
  );
};
