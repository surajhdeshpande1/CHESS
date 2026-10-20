import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowRight,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Smartphone,
  Monitor,
} from 'lucide-react';
import { ArbiterProfile } from '../lib/arbiterAuth';

interface LandingHeroViewProps {
  activeArbiter: ArbiterProfile | null;
  onProceedToAuth: () => void;
  onEnterApp: () => void;
  onSignOut: () => void;
  onInstantGuestAccess: (guest: ArbiterProfile) => void;
}

export const LandingHeroView: React.FC<LandingHeroViewProps> = ({
  onProceedToAuth,
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
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

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    const dur = videoRef.current.duration;
    if (dur && dur > 0) {
      setProgressPercent((cur / dur) * 100);
      setSecondsLeft(Math.max(0, Math.ceil(dur - cur)));
    }
  };

  const handleAction = (callback: () => void) => {
    setIsExiting(true);
    setTimeout(() => {
      callback();
    }, 360);
  };

  return (
    <div
      className={isExiting ? 'animate-dimensional-out' : 'animate-dimensional-in'}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        background: '#040711',
        overflow: 'hidden',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Fullscreen Video Tag */}
      <video
        ref={videoRef}
        key={currentVideoSrc}
        src={currentVideoSrc}
        poster="/hero.png"
        autoPlay
        muted={isMuted}
        playsInline
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => handleAction(onProceedToAuth)}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          cursor: 'pointer',
          zIndex: 1,
        }}
      />

      {/* Cinematic Top Vignette Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '140px',
          background: 'linear-gradient(180deg, rgba(4, 7, 17, 0.85) 0%, rgba(4, 7, 17, 0.4) 60%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* Cinematic Bottom Vignette Overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '160px',
          background: 'linear-gradient(0deg, rgba(4, 7, 17, 0.9) 0%, rgba(4, 7, 17, 0.45) 60%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* Top Navigation & Status Bar */}
      <header
        style={{
          position: 'absolute',
          top: 'max(16px, env(safe-area-inset-top))',
          left: 'max(16px, env(safe-area-inset-left))',
          right: 'max(16px, env(safe-area-inset-right))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          zIndex: 10,
        }}
      >
        {/* Brand Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(7, 11, 22, 0.75)',
            backdropFilter: 'blur(12px)',
            padding: '6px 14px',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--green-primary) 0%, var(--green-deep) 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1rem',
              boxShadow: '0 0 10px rgba(16, 185, 129, 0.4)',
            }}
          >
            ♔
          </div>
          <div>
            <div
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '0.92rem',
                fontWeight: 900,
                color: '#ffffff',
                letterSpacing: '0.08em',
                lineHeight: 1,
              }}
            >
              CHATURANGA
            </div>
            <div
              style={{
                fontSize: '0.62rem',
                color: 'rgba(255, 255, 255, 0.65)',
                fontWeight: 600,
                letterSpacing: '0.04em',
                marginTop: '2px',
              }}
            >
              OFFICIAL FIDE SUITE
            </div>
          </div>
        </div>

        {/* Center: Live Countdown Chip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(7, 11, 22, 0.75)',
            backdropFilter: 'blur(12px)',
            padding: '6px 14px',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            fontSize: '0.74rem',
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: '0.03em',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isPlaying ? '#4ade80' : '#f59e0b',
              boxShadow: isPlaying ? '0 0 10px #4ade80' : 'none',
              display: 'inline-block',
            }}
          />
          <span>
            {secondsLeft !== null && isPlaying
              ? `Entering Sign In in ${secondsLeft}s`
              : isPlaying
              ? isPortraitMode
                ? 'Mobile View (9:16)'
                : 'Widescreen (16:9)'
              : 'Paused'}
          </span>
        </div>

        {/* Right: Screen Mode Toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(7, 11, 22, 0.75)',
            backdropFilter: 'blur(12px)',
            padding: '4px',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
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
              color: !isPortraitMode ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
              border: 'none',
              borderRadius: '16px',
              padding: '4px 10px',
              fontSize: '0.68rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Laptop / Computer View (16:9 Video)"
          >
            <Monitor size={12} />
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
              color: isPortraitMode ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
              border: 'none',
              borderRadius: '16px',
              padding: '4px 10px',
              fontSize: '0.68rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Mobile Phone View (9:16 Portrait Video)"
          >
            <Smartphone size={12} />
            <span>Mobile</span>
          </button>
        </div>
      </header>

      {/* Center Paused Indicator (only visible when paused) */}
      {!isPlaying && (
        <div
          onClick={togglePlay}
          style={{
            position: 'absolute',
            zIndex: 8,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(7, 11, 22, 0.8)',
            backdropFilter: 'blur(16px)',
            padding: '1.25rem 2rem',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'var(--green-primary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(16, 185, 129, 0.6)',
            }}
          >
            <Play size={28} style={{ marginLeft: '4px' }} />
          </div>
          <span style={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.04em' }}>
            Tap to Resume Video
          </span>
        </div>
      )}

      {/* Bottom Controls & Skip CTA Bar */}
      <footer
        style={{
          position: 'absolute',
          bottom: 'max(20px, env(safe-area-inset-bottom))',
          left: 'max(16px, env(safe-area-inset-left))',
          right: 'max(16px, env(safe-area-inset-right))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          zIndex: 10,
          flexWrap: 'wrap',
        }}
      >
        {/* Left: Playback & Audio Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={togglePlay}
            style={{
              background: 'rgba(7, 11, 22, 0.75)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              color: '#ffffff',
              borderRadius: '12px',
              padding: '8px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: 700,
              minHeight: '44px',
              transition: 'all 0.15s ease',
              boxShadow: '0 6px 18px rgba(0, 0, 0, 0.35)',
            }}
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            type="button"
            onClick={toggleMute}
            style={{
              background: 'rgba(7, 11, 22, 0.75)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              color: isMuted ? 'rgba(255, 255, 255, 0.75)' : '#4ade80',
              borderRadius: '12px',
              padding: '8px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: 700,
              minHeight: '44px',
              transition: 'all 0.15s ease',
              boxShadow: '0 6px 18px rgba(0, 0, 0, 0.35)',
            }}
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            <span>{isMuted ? 'Unmute Audio' : 'Audio On'}</span>
          </button>
        </div>

        {/* Right: Direct High-Visibility Register / Sign In Button */}
        <button
          type="button"
          onClick={() => handleAction(onProceedToAuth)}
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '10px 22px',
            fontSize: '0.88rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            minHeight: '44px',
            boxShadow: '0 6px 20px rgba(16, 185, 129, 0.45)',
            transition: 'all 0.15s ease',
            letterSpacing: '0.02em',
          }}
          title="Skip intro and go directly to Register / Sign In"
        >
          <span>Sign In / Register</span>
          <ArrowRight size={16} />
        </button>
      </footer>

      {/* Bottom Glowing Progress Line */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'rgba(255, 255, 255, 0.12)',
          zIndex: 15,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: 'linear-gradient(90deg, #10b981 0%, #4ade80 100%)',
            boxShadow: '0 0 10px #4ade80',
            transition: 'width 0.15s linear',
          }}
        />
      </div>
    </div>
  );
};
