import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
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
  const [progressPercent, setProgressPercent] = useState<number>(0);

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

  // Ensure seamless, uninterrupted autoplay when mounted or when source changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.log('Video autoplay notice:', err);
        });
      }
    }
  }, [currentVideoSrc]);

  // Keyboard shortcut: Pressing Enter or Escape skips directly to Sign In
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        handleAction(onProceedToAuth);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onProceedToAuth]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    const dur = videoRef.current.duration;
    if (dur && dur > 0) {
      setProgressPercent((cur / dur) * 100);
    }
  };

  const handleAction = (callback: () => void) => {
    if (isExiting) return;
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
        background: '#edeae4',
        overflow: 'hidden',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        margin: 0,
      }}
    >
      {/* Edge-to-Edge Responsive Video: Covers full screen with zero white lines, borders, or gaps */}
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
        onEnded={() => handleAction(onProceedToAuth)}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center center',
          display: 'block',
          backgroundColor: '#edeae4',
          zIndex: 1,
        }}
      />

      {/* Discrete Skip to Sign In CTA button (bottom right) */}
      <button
        type="button"
        onClick={() => handleAction(onProceedToAuth)}
        style={{
          position: 'absolute',
          bottom: 'max(20px, env(safe-area-inset-bottom, 20px))',
          right: 'max(20px, env(safe-area-inset-right, 20px))',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '24px',
          padding: '8px 18px',
          fontSize: '0.82rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          zIndex: 20,
          letterSpacing: '0.02em',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#10b981';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 12px 28px rgba(16, 185, 129, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(15, 23, 42, 0.85)';
          e.currentTarget.style.transform = 'translateY(0px)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.25)';
        }}
        title="Skip intro and go directly to Sign In"
      >
        <span>Skip to Sign In</span>
        <ArrowRight size={14} />
      </button>

      {/* Subtle Progress Bar along bottom edge */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'rgba(0, 0, 0, 0.08)',
          zIndex: 25,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
            boxShadow: '0 0 8px rgba(16, 185, 129, 0.7)',
            transition: 'width 0.1s linear',
          }}
        />
      </div>
    </div>
  );
};
