import React, { useState, useRef, useEffect } from 'react';

import countries from './countries.json';

function NativeEmoji({ unified, size }) {
  if (!unified) return null;
  const emojiStr = String.fromCodePoint(...unified.split('-').map(u => parseInt(u, 16)));
  return <span style={{ fontSize: size, lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{emojiStr}</span>;
}

function getFlagEmoji(countryCode) {
  if (!countryCode) return '';
  const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

const countryChoices = countries.map(c => ({
  code: c.code,
  dial: c.dial,
  emoji: getFlagEmoji(c.code)
})).sort((a,b) => a.code.localeCompare(b.code));

// Injects a Google Font link once
const _loadedFonts = new Set();
function injectFont(fontFamily) {
  if (!fontFamily || _loadedFonts.has(fontFamily)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;600;700&display=swap`;
  document.head.appendChild(link);
  _loadedFonts.add(fontFamily);
}

// Constrói o background CSS baseado no tipo configurado
function buildBackground(theme) {
  const bgType = theme.bgType || 'solid';

  if (bgType === 'gradient') {
    const angle = theme.gradientAngle ?? 135;
    const from = theme.gradientFrom || '#0f172a';
    const to = theme.gradientTo || '#6366f1';
    return `linear-gradient(${angle}deg, ${from}, ${to})`;
  }

  if (bgType === 'image' && theme.bgImage) {
    const pos = theme.bgPosition || 'center center';
    const size = theme.bgSize || 'cover';
    return `url(${theme.bgImage}) ${pos} / ${size} no-repeat`;
  }

  return theme.bg || '#0f172a';
}

// ─── TELEMETRY HOOK ─── tracks seconds watched and sends pulses ───────────────
function useMediaTelemetry(mediaType, blockId, quizId, visitorId, stepId, compact) {
  const watchedSecondsRef = useRef(new Set());
  const lastPingRef = useRef(Date.now());

  function pingTelemetry(duration) {
    const seconds = Array.from(watchedSecondsRef.current);
    if (seconds.length === 0) return;
    const batch = [...seconds];
    watchedSecondsRef.current.clear();
    fetch('/api/analytics/media/pulse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quiz_id: quizId,
        step_id: stepId,
        block_id: blockId,
        visitor_id: visitorId,
        media_type: mediaType,
        watched_seconds: batch,
        duration: Math.floor(duration || 0)
      })
    }).catch(() => {});
  }

  function handleTimeUpdate(currentTime, duration) {
    if (compact || !quizId || !visitorId) return;
    const sec = Math.floor(currentTime);
    watchedSecondsRef.current.add(sec);
    const now = Date.now();
    if (now - lastPingRef.current > 5000) {
      pingTelemetry(duration);
      lastPingRef.current = now;
    }
  }

  function triggerFinalPing(duration) {
    if (compact || !quizId || !visitorId) return;
    const payload = JSON.stringify({
      quiz_id: quizId,
      step_id: stepId,
      block_id: blockId,
      visitor_id: visitorId,
      media_type: mediaType,
      watched_seconds: Array.from(watchedSecondsRef.current),
      duration: Math.floor(duration || 0)
    });
    watchedSecondsRef.current.clear();
    // sendBeacon survives page unload and is NEVER aborted by the browser.
    // This eliminates BadRequestError: request aborted on the server.
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/media/pulse', blob);
    } else {
      // Fallback for older browsers
      fetch('/api/analytics/media/pulse', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload,
        keepalive: true
      }).catch(() => {});
    }
  }

  return { handleTimeUpdate, triggerFinalPing };
}

// ─── AUDIO PLAYER COMPONENT — WhatsApp Style (fiel à referência) ─────────────
function AudioBlockPlayer({ block, compact, quizId, visitorId, stepId }) {
  const audioRef = useRef(null);
  const { handleTimeUpdate: trackTime, triggerFinalPing } = useMediaTelemetry('audio', block.id, quizId, visitorId, stepId, compact);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]       = useState(0);
  const [speed, setSpeed]             = useState(1);
  const [ended, setEnded]             = useState(false);
  const [hasStarted, setHasStarted]   = useState(false);

  const SPEEDS = [1, 1.5, 2];
  const cycleSpeed = () => {
    setSpeed(prev => {
      const next = SPEEDS[(SPEEDS.indexOf(prev) + 1) % SPEEDS.length];
      if (audioRef.current) audioRef.current.playbackRate = next;
      return next;
    });
  };

  // Keep playbackRate in sync whenever it changes
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  // Cores configuráveis com padrões do WPP
  const bubbleBg   = block.bgColor    || '#075e54';
  const dotColor   = block.dotColor   || '#00bfff';   // bolinha azul
  const waveColor  = block.waveColor  || 'rgba(255,255,255,0.55)';
  const waveCount  = compact ? 22 : 38;
  const waveHeights = [0.35,0.65,0.45,0.9,0.5,0.75,0.3,0.85,0.5,0.7,0.4,0.8,0.45,0.9,0.55,0.65,
                       0.3,0.75,0.5,0.85,0.4,0.7,0.55,0.8,0.35,0.65,0.5,0.9,0.4,0.7,0.6,0.85,
                       0.45,0.7,0.35,0.8,0.5,0.75];

  useEffect(() => {
    if (audioRef.current && block.src) audioRef.current.load();
  }, [block.src]);

  const toggle = async () => {
    if (!audioRef.current) return;
    try {
      if (playing) { audioRef.current.pause(); setPlaying(false); }
      else { 
        if (!hasStarted) setHasStarted(true);
        await audioRef.current.play(); 
        setPlaying(true); 
      }
    } catch(e) { console.error('Audio play error:', e); }
  };

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00';
    return `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`;
  };

  // Cleanup: send final ping when leaving the step
  React.useEffect(() => {
    return () => { if (audioRef.current) triggerFinalPing(audioRef.current.duration); };
  }, []);

  // Sync to QuizPreview context
  React.useEffect(() => {
    if (block.setMediaState) {
      block.setMediaState({ hasStarted, currentTime, ended });
    }
  }, [hasStarted, currentTime, ended, block.setMediaState]);
  const progress = duration > 0 ? currentTime / duration : 0;
  const avatarSz  = compact ? 32 : 46;
  const btnSz     = compact ? 22 : 32;

  return (
    <div style={{ width: '100%' }}>
      {/* Hidden audio */}
      {block.src && (
        <audio ref={audioRef} src={block.src} preload="auto"
          onTimeUpdate={e => {
            setCurrentTime(e.target.currentTime);
            trackTime(e.target.currentTime, e.target.duration);
          }}
          onLoadedMetadata={e => setDuration(e.target.duration)}
          onEnded={() => { setPlaying(false); setEnded(true); triggerFinalPing(audioRef.current?.duration); }} />
      )}

      {/* ── Bolha principal ── */}
      <div style={{
        display: 'inline-flex',
        flexDirection: 'column',
        justifyContent: 'center',
        background: bubbleBg,
        borderRadius: compact ? 14 : 20,
        padding: compact ? '8px 10px 6px' : '10px 14px 8px',
        width: block.boxWidth ? `${block.boxWidth}%` : 'auto',
        minWidth: compact ? 160 : 240,
        minHeight: block.boxHeight ? (compact ? block.boxHeight * 0.6 : block.boxHeight) : undefined,
        maxWidth: '100%',
        boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
        gap: compact ? 3 : 4,
      }}>

        {/* Row: avatar + play + waveform */}
        <div style={{ display:'flex', alignItems:'center', gap: compact ? 7 : 10 }}>

          {/* Avatar circular */}
          <div style={{
            width: avatarSz, height: avatarSz,
            borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
            border: '2px solid rgba(255,255,255,0.3)',
          }}>
            {block.avatarSrc ? (
              <img src={block.avatarSrc} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            ) : (
              <div style={{ width:'100%', height:'100%', background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width={compact?14:20} height={compact?14:20} viewBox="0 0 24 24" fill="white">
                  <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v2h20v-2c0-3.3-6.7-5-10-5z"/>
                </svg>
              </div>
            )}
          </div>

          {/* Botão play/pause */}
          <button onClick={toggle} style={{
            width: btnSz, height: btnSz,
            borderRadius: '50%',
            background: 'none',
            border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
            padding: 0,
          }}>
            {playing ? (
              <svg width={compact?14:20} height={compact?14:20} viewBox="0 0 24 24" fill="white">
                <rect x="5" y="4" width="4" height="16" rx="1"/>
                <rect x="15" y="4" width="4" height="16" rx="1"/>
              </svg>
            ) : (
              <svg width={compact?14:20} height={compact?14:20} viewBox="0 0 24 24" fill="white">
                <polygon points="6,3 20,12 6,21"/>
              </svg>
            )}
          </button>

          {/* Waveform com bolinha azul deslizando */}
          <div style={{ flex: 1, position: 'relative', height: compact ? 24 : 36, display:'flex', alignItems:'center', minWidth: compact ? 40 : 60 }}>
            {/* Barras */}
            <div style={{ display:'flex', alignItems:'center', gap: compact ? 1.5 : 2, width:'100%', height:'100%' }}>
              {Array.from({ length: waveCount }, (_, i) => {
                const h = waveHeights[i % waveHeights.length];
                const barProgress = i / waveCount;
                const played = barProgress < progress;
                return (
                  <div key={i} style={{
                    flex: 1,
                    minWidth: 0,
                    height: `${h * (compact ? 22 : 34)}px`,
                    background: played ? 'rgba(255,255,255,0.85)' : waveColor,
                    borderRadius: 2,
                    transition: 'background 0.1s',
                  }} />
                );
              })}
            </div>

            {/* Bolinha azul que desliza */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: `${progress * 100}%`,
              transform: 'translate(-50%, -50%)',
              width: compact ? 10 : 14,
              height: compact ? 10 : 14,
              borderRadius: '50%',
              background: dotColor,
              boxShadow: `0 0 6px ${dotColor}`,
              transition: playing ? 'left 0.3s linear' : 'left 0.1s',
              pointerEvents: 'none',
              zIndex: 2,
            }} />
          </div>

          {/* Botão de velocidade – LADO DIREITO da waveform, estilo WPP puro */}
          <button
            onClick={cycleSpeed}
            style={{
              flexShrink: 0,
              background: 'rgba(0, 0, 0, 0.15)',
              border: 'none',
              borderRadius: 99,
              color: '#f0f2f5',
              fontSize: compact ? 11 : 13,
              fontWeight: 500,
              padding: compact ? '4px 8px' : '5px 12px',
              cursor: 'pointer',
              lineHeight: 1,
              transition: 'background 0.1s, transform 0.1s',
              minWidth: compact ? 34 : 44,
              textAlign: 'center',
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            title="Alterar velocidade"
          >
            {speed === 1 ? '1×' : speed === 1.5 ? '1.5×' : '2×'}
          </button>
        </div>

        {/* Footer: timer esquerda + sentAt+ticks direita */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingLeft: compact ? 2 : 4, marginTop: compact ? 1 : 2 }}>
          <span style={{ color:'rgba(255,255,255,0.7)', fontSize: compact ? 8 : 10, fontFamily:'monospace', fontVariantNumeric:'tabular-nums' }}>
            {duration > 0 ? fmt(currentTime) : '0:00'}
          </span>
          <div style={{ display:'flex', alignItems:'center', gap: compact ? 3 : 5 }}>
            <span style={{ color:'rgba(255,255,255,0.6)', fontSize: compact ? 8 : 10, fontFamily:'monospace' }}>
              {block.sentAt || ''}
            </span>
            {/* ✓✓ azul */}
            <svg width={compact ? 10 : 14} height={compact ? 6 : 9} viewBox="0 0 20 12" fill="none">
              <polyline points="0,6 5,11 12,1" stroke="#53bdeb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="7,6 12,11 19,1" stroke="#53bdeb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

      </div>
    </div>
  );
}


// ─── VIDEO PLAYER COMPONENT (totalmente funcional) ────────────────────────────
function VideoBlockPlayer({ block, compact, quizId, visitorId, stepId, theme }) {
  const videoRef   = useRef(null);
  const iframeRef  = useRef(null);
  const startedRef = useRef(false);
  const { handleTimeUpdate: trackTime, triggerFinalPing } = useMediaTelemetry('video', block.id, quizId, visitorId, stepId, compact);
  const [playing, setPlaying]             = useState(false);
  const [showThumb, setShowThumb]         = useState(true);
  const [currentTime, setCurrentTime]     = useState(0);
  const [duration, setDuration]           = useState(0);
  const [ended, setEnded]                 = useState(false);
  const [resVisible, setResVisible]       = useState(false);
  const [hasStarted, setHasStarted]       = useState(false);
  const [userUnmuted, setUserUnmuted]     = useState(false);

  // Direct DOM refs — updated without React re-render for zero-jank progress/timer
  const progressBarRef     = useRef(null);
  const timerDisplayRef    = useRef(null);
  // Throttle React state to once/sec (onTimeUpdate fires ~4x/sec on most browsers)
  const lastStateUpdateRef = useRef(0);
  // Flag to block ALL onTimeUpdate work during fullscreen layout transition.
  // On low-end GPUs (A32 Helio G80) video decoding + layout recalc compete for
  // GPU resources — pausing both during the transition prevents the visible freeze.
  const isTransitioningRef = useRef(false);

  const containerRef = useRef(null);
  const [isCssFullscreen, setIsCssFullscreen] = useState(false);
  // Overlay shown during fullscreen exit to hide the visual freeze frame
  const [fsExiting, setFsExiting] = useState(false);
  // Remember if video was playing so we can resume after transition
  const wasPlayingRef = useRef(false);

  const forceExitedFsRef = useRef(false);
  // Refs to read latest value inside intervals/effects WITHOUT adding to deps arrays
  const currentTimeRef = useRef(0);
  const trackTimeRef   = useRef(trackTime);

  const src      = block.src || '';
  const isYT     = src.includes('youtube') || src.includes('youtu.be');
  const isVimeo  = src.includes('vimeo');
  const isEmbed  = isYT || isVimeo;

  // ── Fullscreen ──────────────────────────────────────────────────────────────
  const fullscreenMode = block.fullscreenMode || 'none';
  const exitFullscreenBeforeEnd = block.exitFullscreenBeforeEnd || 0;

  const enterFullscreen = () => {
    if (forceExitedFsRef.current) return;
    const el = containerRef.current || document.documentElement;
    try {
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => setIsCssFullscreen(true));
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
        setIsCssFullscreen(true); // Força fallback para iOS
      } else if (el.mozRequestFullScreen) {
        el.mozRequestFullScreen();
      } else {
        setIsCssFullscreen(true);
      }
    } catch(e) {
      setIsCssFullscreen(true);
    }
  };

  const exitFullscreen = () => {
    isTransitioningRef.current = true;
    wasPlayingRef.current = !isEmbed && videoRef.current && !videoRef.current.paused;
    if (wasPlayingRef.current) videoRef.current.pause();

    // Show a dark overlay to hide the freeze frame during layout transition.
    // On low-end GPUs the browser needs ~300ms to re-composite all layers
    // after the CSS fullscreen style changes. The overlay makes this invisible.
    setFsExiting(true);

    // Exit native fullscreen if active (desktop)
    try {
      if (document.exitFullscreen && document.fullscreenElement) document.exitFullscreen();
      else if (document.webkitExitFullscreen && document.webkitFullscreenElement) document.webkitExitFullscreen();
    } catch(e) {}

    // Change React state on next frame (lets the overlay render first)
    requestAnimationFrame(() => {
      setIsCssFullscreen(false);

      // Wait for layout to completely settle, then resume
      setTimeout(() => {
        const el = containerRef.current;
        if (el) {
          el.offsetHeight; // flush layout queue
          el.style.transform = 'translateZ(0)';
          requestAnimationFrame(() => {
            el.style.transform = '';
            // Resume video, then hide overlay on the NEXT frame after video starts
            if (wasPlayingRef.current && videoRef.current) {
              videoRef.current.play().catch(() => {});
            }
            isTransitioningRef.current = false;
            
            // --- THE "MECHIDA" HACK ---
            window.scrollBy(0, 1);
            setTimeout(() => window.scrollBy(0, -1), 20);
            
            // Extra frame delay before hiding overlay so first video frame is painted
            requestAnimationFrame(() => setFsExiting(false));
          });
        } else {
          if (wasPlayingRef.current && videoRef.current) videoRef.current.play().catch(() => {});
          isTransitioningRef.current = false;
          setFsExiting(false);
        }
      }, 280);
    });
  };


  // Auto fullscreen on mount
  useEffect(() => {
    if (compact) return;
    if (fullscreenMode === 'auto' || fullscreenMode === 'auto_locked') {
      const t = setTimeout(() => enterFullscreen(), 600);
      return () => clearTimeout(t);
    }
  }, [fullscreenMode, compact]);

  // ── Native Fullscreen Exit Interceptor ────────────────────────────────────
  // If the user uses the Android "Back" swipe or system native UI to exit
  // fullscreen, it completely bypassed our exitFullscreen() function. This
  // interceptor catches the native OS event and instantly applies the
  // GPU-pause + overlay workaround to prevent the A32 from freezing.
  useEffect(() => {
    const handleNativeFsChange = () => {
      const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
      // If we just exited native fullscreen
      if (!isFs) {
        // If the CSS fallback was also active, clear it now
        setIsCssFullscreen(false);
        
        // If we are NOT already handling a manual exit transition
        if (!isTransitioningRef.current) {
          isTransitioningRef.current = true;
          const wasPlaying = !isEmbed && videoRef.current && !videoRef.current.paused;
          if (wasPlaying) videoRef.current.pause();
          
          setFsExiting(true);
          
          setTimeout(() => {
            const el = containerRef.current;
            if (el) {
              el.offsetHeight; // layout flush
              el.style.transform = 'translateZ(0)';
              requestAnimationFrame(() => {
                el.style.transform = '';
                if (wasPlaying && videoRef.current) {
                  videoRef.current.play().catch(() => {});
                }
                isTransitioningRef.current = false;
                
                // --- THE "MECHIDA" HACK ---
                // The user noticed that scrolling slightly unfreezes the video.
                // This indicates a known Android Chrome compositor bug where the
                // hardware layer loses sync on exit. A 1px programmatic scroll
                // forces the exact OS-level repaint needed to repair the stream.
                window.scrollBy(0, 1);
                setTimeout(() => window.scrollBy(0, -1), 20);

                requestAnimationFrame(() => setFsExiting(false));
              });
            } else {
              if (wasPlaying && videoRef.current) videoRef.current.play().catch(() => {});
              isTransitioningRef.current = false;
              setFsExiting(false);
            }
          }, 280);
        }
      }
    };

    document.addEventListener('fullscreenchange', handleNativeFsChange);
    document.addEventListener('webkitfullscreenchange', handleNativeFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleNativeFsChange);
      document.removeEventListener('webkitfullscreenchange', handleNativeFsChange);
    };
  }, [isEmbed]);

  // Lock fullscreen — re-enter if user exits
  useEffect(() => {
    if (compact || fullscreenMode !== 'auto_locked') return;

    const lockedEnterFs = () => {
      if (!forceExitedFsRef.current) setTimeout(() => enterFullscreen(), 400);
    };

    const handleFsChange = () => {
      const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
      if (!isFs) lockedEnterFs();
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);

    const vid = videoRef.current;
    if (vid) {
      vid.addEventListener('webkitendfullscreen', lockedEnterFs);
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      if (vid) {
        vid.removeEventListener('webkitendfullscreen', lockedEnterFs);
      }
    };
  }, [fullscreenMode, compact]);

  // Sair da tela cheia X segundos antes — poll via interval so currentTime is NOT a dep
  useEffect(() => {
    if (compact || fullscreenMode === 'none' || exitFullscreenBeforeEnd <= 0) return;
    const iv = setInterval(() => {
      const ct = currentTimeRef.current;
      const dur = isEmbed ? (block.fakeDuration || 120) : (videoRef.current?.duration || 0);
      if (dur > 0 && ct > 0 && ct >= dur - exitFullscreenBeforeEnd) {
        if (!forceExitedFsRef.current) {
          forceExitedFsRef.current = true;
          exitFullscreen();
        }
        clearInterval(iv);
      }
    }, 500);
    return () => clearInterval(iv);
  // currentTime intentionally omitted — read via ref inside the interval
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compact, fullscreenMode, exitFullscreenBeforeEnd, isEmbed, block.fakeDuration]);
  // ── /Fullscreen ─────────────────────────────────────────────────────────────

  const ar       = block.aspectRatio || '16/9';
  const radius   = block.rounded ? (compact?10:16) : 0;

  // Controles nativos sempre ocultos por padrão (conforme pedido)
  const isControlsHidden = true;

  const getEmbedUrl = (url) => {
    if (!url) return '';
    if (url.includes('youtube.com/watch?v=')) return url.replace('watch?v=','embed/');
    if (url.includes('youtu.be/'))            return url.replace('youtu.be/','www.youtube.com/embed/');
    if (url.includes('vimeo.com/'))           return url.replace('vimeo.com/','player.vimeo.com/video/');
    return url;
  };

  const embedUrl = isEmbed
    ? getEmbedUrl(src) + `?autoplay=${block.autoplay?1:0}&mute=${block.muted?1:0}&loop=${block.loop?1:0}&controls=${isControlsHidden?0:1}&enablejsapi=1`
    : '';

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s/60);
    return `${m}:${Math.floor(s%60).toString().padStart(2,'0')}`;
  };

  // Reset when src changes
  useEffect(() => {
    startedRef.current = false;
    setPlaying(false); setShowThumb(true); setCurrentTime(0);
    setDuration(0); setEnded(false); setResVisible(false); setHasStarted(false);
  }, [src]);

  // Keep trackTimeRef current
  useEffect(() => { trackTimeRef.current = trackTime; }, [trackTime]);

  // Embedded Result Array delay logic — does NOT depend on currentTime (reads ref)
  useEffect(() => {
    if (!block.showResultConfig) { setResVisible(false); return; }
    if (compact) { setResVisible(true); return; }
    if (!hasStarted) { setResVisible(false); return; }

    const delay = block.resDelay || 'none';
    if (delay === 'none') { setResVisible(true); return; }
    if (delay === 'on_end') { setResVisible(ended); return; }
    if (delay === 'custom') {
      const secs = block.resDelaySeconds || 0;
      const iv = setInterval(() => {
        if (currentTimeRef.current >= secs) { setResVisible(true); clearInterval(iv); }
      }, 500);
      return () => clearInterval(iv);
    }
  }, [block.showResultConfig, block.resDelay, block.resDelaySeconds, ended, hasStarted, compact]);

  // Sync to QuizPreview context — poll via interval so currentTime in deps isn't needed
  useEffect(() => {
    if (!block.setMediaState) return;
    const iv = setInterval(() => {
      block.setMediaState({ hasStarted, currentTime: currentTimeRef.current, ended });
    }, 1000);
    return () => clearInterval(iv);
  }, [hasStarted, ended, block.setMediaState]);

  // The overlay is shown when: video is configured as autoplay+muted AND user hasn't unmuted yet
  // Removido o !isEmbed para permitir overlay de mute também no YouTube
  const showUnmuteOverlay = !!(block.autoplay && block.muted && src && !userUnmuted);

  // Reset userUnmuted when src or block config changes (so overlay comes back)
  useEffect(() => {
    setUserUnmuted(false);
  }, [src, block.autoplay, block.muted]);

  // onCanPlay fires once video data is loaded — safest place to autoplay (Native only)
  const handleCanPlay = () => {
    const v = videoRef.current;
    if (!v || startedRef.current || !block.autoplay || isEmbed) return;
    startedRef.current = true;
    v.muted = !!block.muted; // Respeita a config do editor
    v.play().then(() => {
      setPlaying(true);
      setShowThumb(false);
    }).catch(() => {});
  };

  // Se for embed e tiver autoplay, marca como tocando desde o início
  useEffect(() => {
    if (isEmbed && src && block.autoplay && !startedRef.current) {
      startedRef.current = true;
      setHasStarted(true);
      setPlaying(true);
    }
  }, [isEmbed, src, block.autoplay]);

  const handleUnmute = (e) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    if (isEmbed) {
      if (isYT) {
        iframeRef.current?.contentWindow?.postMessage('{"event":"command","func":"unMute","args":""}', '*');
        iframeRef.current?.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
      }
      if (isVimeo) {
        iframeRef.current?.contentWindow?.postMessage('{"method":"setVolume","value":1}', '*');
        iframeRef.current?.contentWindow?.postMessage('{"method":"play"}', '*');
      }
      setCurrentTime(0);
    } else {
      const v = videoRef.current;
      if (!v) return;
      v.muted = false;
      v.currentTime = 0;
      v.play().catch(console.error);
    }
    
    setPlaying(true);
    setHasStarted(true);
    setUserUnmuted(true);   // hides overlay
    setShowThumb(false);
  };

  const togglePlay = () => {
    if (showUnmuteOverlay) { handleUnmute(); return; }
    if (playing) {
      if (block.disablePause) return; // Impede pausar
      if (isEmbed) {
        if (isYT) iframeRef.current?.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        if (isVimeo) iframeRef.current?.contentWindow?.postMessage('{"method":"pause"}', '*');
      } else {
        videoRef.current?.pause();
      }
      setPlaying(false);
    } else {
      if (isEmbed) {
        if (isYT) iframeRef.current?.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
        if (isVimeo) iframeRef.current?.contentWindow?.postMessage('{"method":"play"}', '*');
      } else {
        videoRef.current?.play().catch(console.error);
      }
      setPlaying(true);
      setHasStarted(true);
      setShowThumb(false);
      setEnded(false);
    }
  };

  // Simula o progresso do tempo para embeds já que não temos onTimeUpdate direto
  useEffect(() => {
    if (!isEmbed || !playing) return;
    const dur = block.fakeDuration || 120;
    const interval = setInterval(() => {
      const next = (currentTimeRef.current || 0) + 1;
      currentTimeRef.current = next;
      trackTimeRef.current(next, dur);

      // ✔ Update progress bar DOM directly — ZERO React re-render
      if (progressBarRef.current && dur > 0) {
        progressBarRef.current.style.width = `${Math.min((next / dur) * 100, 100)}%`;
      }
      // ✔ Update timer DOM directly — ZERO React re-render
      if (timerDisplayRef.current && dur > 0) {
        const dispDur = block.useFakeDuration ? (block.fakeDuration || 120) : dur;
        const dispT   = block.useFakeDuration ? ((next / dur) * dispDur) : next;
        timerDisplayRef.current.textContent = `${fmt(dispT)} / ${fmt(dispDur)}`;
      }
      // ✔ Minimal state update only for overlay/resDelay logic (cheap string compare)
      setCurrentTime(next);
    }, 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmbed, playing, block.fakeDuration]);

  // Se for embed, usamos fakeDuration ou 120s como fallback para não quebrar a barra
  const activeDuration = isEmbed ? (block.fakeDuration || 120) : duration;

  const progress = activeDuration > 0 ? currentTime / activeDuration : 0;
  const displayDuration = block.useFakeDuration ? (block.fakeDuration || 120) : activeDuration;
  const displayCurrentTime = block.useFakeDuration ? (progress * displayDuration) : currentTime;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: compact ? 8 : 16 }}>
      <div ref={containerRef} style={isCssFullscreen ? {
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 999999,
        background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 0
      } : { width:'100%', borderRadius:radius, overflow:'hidden', position:'relative', background:'#000', boxShadow: compact?'none':'0 8px 40px rgba(0,0,0,0.6)' }}>
        <style>{`
        @keyframes vslMutePulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }
        @keyframes vslMuteBlink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @keyframes vslRipple    { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(2.6);opacity:0} }
        @keyframes hookEnter    { 0%{opacity:0; transform: translateY(20px) scale(0.95)} 100%{opacity:1; transform: translateY(0) scale(1)} }
        @keyframes hookExit     { 0%{opacity:1; transform: translateY(0) scale(1)} 100%{opacity:0; transform: translateY(-20px) scale(0.95)} }
      `}</style>
      {/* Vídeo com aspect ratio */}
      <div style={{ width:'100%', aspectRatio:ar, position:'relative', background:'#0a0a0a', overflow:'hidden', cursor: src ? 'pointer' : 'default' }}
           onClick={togglePlay}>

        {/* ─── Fullscreen exit transition overlay ───────────────────────────────
            Covers the freeze frame that occurs on low-end GPUs (Helio G80, etc.)
            while the browser re-composites layers after CSS fullscreen style change.
            Fades out once the first video frame is painted after resume. */}
        {fsExiting && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 99999,
            background: '#000',
            transition: 'opacity 0.25s ease-out',
            pointerEvents: 'none',
          }} />
        )}

        {/* Placeholder */}
        {!src && (
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 }}>
            <svg width={compact?32:56} height={compact?32:56} viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.5">
              <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
            </svg>
            <p style={{ color:'#374151', fontSize: compact?9:12 }}>VSL — Adicione o vídeo</p>
          </div>
        )}

        {/* Embed YouTube/Vimeo */}
        {src && isEmbed && (
          <iframe 
            ref={iframeRef}
            src={embedUrl}
            style={{ position:'absolute', inset:0, width:'100%', height:'100%', border:'none', pointerEvents: isControlsHidden ? 'none' : 'auto', willChange:'transform' }}
            allow="autoplay; fullscreen" allowFullScreen />
        )}

        {/* MP4/base64 nativo — sem controles nativos nunca */}
        {src && !isEmbed && (
          <video
            ref={videoRef}
            src={src}
            style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', pointerEvents:'none', willChange:'transform' }}
            loop={block.loop}
            playsInline
            disablePictureInPicture
            onCanPlay={handleCanPlay}
            onTimeUpdate={e => {
              // Skip ALL work during fullscreen layout transition.
              // The video is paused by exitFullscreen() so this fires rarely,
              // but the guard prevents any stray events from competing with recalc.
              if (isTransitioningRef.current) return;

              const t   = e.target.currentTime;
              const dur = e.target.duration || 0;
              currentTimeRef.current = t;
              trackTimeRef.current(t, dur);

              // ✔ Update progress bar directly — ZERO React re-render
              if (progressBarRef.current && dur > 0) {
                progressBarRef.current.style.width = `${(t / dur) * 100}%`;
              }

              // ✔ Update timer text directly — ZERO React re-render
              if (timerDisplayRef.current && dur > 0) {
                const dispDur = block.useFakeDuration ? (block.fakeDuration || 120) : dur;
                const dispT   = block.useFakeDuration ? ((t / dur) * dispDur) : t;
                timerDisplayRef.current.textContent = `${fmt(dispT)} / ${fmt(dispDur)}`;
              }

              // ✔ Throttle React state to once per second (enough for overlays & resDelay)
              const now = Date.now();
              if (now - lastStateUpdateRef.current >= 1000) {
                lastStateUpdateRef.current = now;
                setCurrentTime(t);
              }
            }}
            onLoadedMetadata={e => setDuration(e.target.duration)}
            onEnded={() => { setPlaying(false); setEnded(true); triggerFinalPing(videoRef.current?.duration); }}
          />
        )}

        {/* Thumbnail overlay (agora funciona também em embed!) */}
        {src && block.thumbnailSrc && showThumb && (
          <div style={{ position:'absolute', inset:0, background:`url(${block.thumbnailSrc}) center/cover`, pointerEvents:'none', zIndex:4 }} />
        )}

        {/* ═══ BOTÃO DE TELA CHEIA MANUAL / SAIR (CSS FULLSCREEN) ═══ */}
        {src && !compact && (
          <>
            {fullscreenMode === 'manual' && !isCssFullscreen && (
              <button
                onClick={(e) => { e.stopPropagation(); enterFullscreen(); }}
                style={{
                  position: 'absolute', bottom: 10, right: 10, zIndex: 10,
                  background: 'rgba(0,0,0,0.82)',
                  border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8, padding: '6px 12px',
                  color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.2s',
                }}
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
                Tela Cheia
              </button>
            )}
            
            {isCssFullscreen && fullscreenMode !== 'auto_locked' && (
              <button
                onClick={(e) => { 
                  e.stopPropagation(); 
                  forceExitedFsRef.current = true; 
                  exitFullscreen(); 
                }}
                style={{
                  position: 'absolute', top: 16, right: 16, zIndex: 9999999,
                  background: 'rgba(0,0,0,0.82)',
                  border: '1px solid rgba(255,255,255,0.18)', borderRadius: '50%', padding: '8px',
                  color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </>
        )}

        {/* ═══ ÍCONE MUDO CENTRALIZADO — PANDA VSL STYLE ═══ */}
        {src && showUnmuteOverlay && (
          <div
            onClick={handleUnmute}
            style={{
              position:'absolute', inset:0, zIndex:5,
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              gap: compact?8:14,
              cursor:'pointer',
            }}
          >
            {/* Ripple rings animados */}
            <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{
                position:'absolute',
                width:compact?52:90, height:compact?52:90,
                borderRadius:'50%',
                border:`2px solid ${block.muteIconColor || 'rgba(0,213,230,0.4)'}`,
                animation:'vslRipple 2s ease-out infinite',
                pointerEvents:'none',
              }} />
              <div style={{
                position:'absolute',
                width:compact?52:90, height:compact?52:90,
                borderRadius:'50%',
                border:`2px solid ${block.muteIconColor ? block.muteIconColor+'88' : 'rgba(0,213,230,0.25)'}`,
                animation:'vslRipple 2s ease-out 0.9s infinite',
                pointerEvents:'none',
              }} />

              {/* Círculo principal */}
              <div style={{
                width:compact?42:70, height:compact?42:70,
                borderRadius:'50%',
                background: block.muteIconColor
                  ? `linear-gradient(145deg, ${block.muteIconColor}, ${block.muteIconColor}bb)`
                  : 'linear-gradient(145deg, #00d5e6, #0099b0)',
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:`0 0 ${compact?14:28}px ${block.muteIconColor || 'rgba(0,213,230,0.6)'}, 0 4px 16px rgba(0,0,0,0.5)`,
                animation:'vslMutePulse 1.6s ease-in-out infinite',
                position:'relative',
              }}>
                {/* Ícone de mudo piscando */}
                <svg
                  width={compact?18:32} height={compact?18:32}
                  viewBox="0 0 24 24"
                  fill="white"
                  style={{ animation:'vslMuteBlink 1s step-end infinite', filter:'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}
                >
                  <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                  <line x1="23" y1="9" x2="17" y2="15" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                  <line x1="17" y1="9" x2="23" y2="15" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </div>
            </div>

            {/* Texto clicável abaixo */}
            <div style={{
              background: block.muteBgColor || 'rgba(0,0,0,0.82)',
              border:'1px solid rgba(255,255,255,0.15)',
              borderRadius:'999px',
              padding:compact?'5px 14px':'8px 22px',
              color: block.muteTextColor || '#fff',
              fontSize:compact?10:14,
              fontWeight:700,
              letterSpacing:'0.03em',
              textShadow:'0 1px 4px rgba(0,0,0,0.5)',
            }}>
              {block.unmuteText || '🔊 Clique para ouvir'}
            </div>
          </div>
        )}

        {/* Botão Play Overlay (parado, sem overlay mudo) */}
        {block.showPlayBtn !== false && src && !playing && !showUnmuteOverlay && (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none', zIndex:5 }}>
            <div style={{ width:compact?40:68, height:compact?40:68, borderRadius:'50%', background:'rgba(0,0,0,0.75)', border:'2px solid rgba(255,255,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 30px rgba(255,255,255,0.15)' }}>
              <svg width={compact?16:28} height={compact?16:28} viewBox="0 0 24 24" fill="white">
                <polygon points="5,3 19,12 5,21"/>
              </svg>
            </div>
          </div>
        )}

        {/* ═══ TEXTS OVERLAYS (HOOKS) ═══ */}
        {src && block.enableTextOverlay && (block.overlayTexts || []).length > 0 && (
          <div style={{ position:'absolute', inset:0, zIndex: 8, pointerEvents:'none', display:'flex', alignItems: block.overlayPosition === 'top' ? 'flex-start' : block.overlayPosition === 'bottom' ? 'flex-end' : 'center', justifyContent:'center', padding: compact ? '12px' : '40px' }}>
            {block.overlayTexts.map((t, idx) => {
               const start = t.start || 0;
               const dur = t.duration || 3;
               const end = start + dur;
               const isVisible = currentTime >= start && currentTime < end;
               
               // Soft exit 0.3s before end
               const isExiting = currentTime >= end - 0.3 && currentTime < end;

               if (!isVisible) return null;
               
               const txtSz = block.overlayTextSize || 'xl';
               let fSize = compact ? 14 : 32;
               if (txtSz === 'sm') fSize = compact ? 10 : 14;
               else if (txtSz === 'base') fSize = compact ? 12 : 18;
               else if (txtSz === 'lg') fSize = compact ? 16 : 24;
               else if (txtSz === 'xl') fSize = compact ? 20 : 32;
               else if (txtSz === '2xl') fSize = compact ? 24 : 48;
               else if (txtSz === '3xl') fSize = compact ? 30 : 64;
               
               return (
                 <div key={idx} style={{ 
                    animation: isExiting ? 'hookExit 0.3s forwards ease-in' : 'hookEnter 0.4s forwards cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    textAlign: 'center',
                    background: 'rgba(0,0,0,0.82)', 
                    color: block.overlayTextColor || '#ffffff', 
                    padding: compact ? '8px 16px' : '20px 40px', 
                    borderRadius: compact ? 12 : 24,
                    border: '1px solid rgba(255,255,255,0.12)',
                    fontSize: fSize,
                    fontWeight: 800,
                    lineHeight: 1.3,
                    textShadow: '0 2px 10px rgba(0,0,0,0.8)',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                    maxWidth: '90%'
                 }}>
                   {t.text}
                 </div>
               );
            })}
          </div>
        )}

        {/* Timer VSL (fake duration se ativado)
            Mostra mesmo sem o vídeo tocar, usando fakeDuration como fallback */}
        {block.showTimer !== false && src && (activeDuration > 0 || block.useFakeDuration) && (
          <div
            ref={timerDisplayRef}
            style={{ position:'absolute', bottom:compact?6:10, right:compact?6:10, background:'rgba(0,0,0,0.75)', borderRadius:4, padding:compact?'2px 5px':'3px 8px', fontSize:compact?8:11, color:'#fff', fontFamily:'monospace', zIndex:6 }}
          >
            {fmt(displayCurrentTime)} / {fmt(displayDuration)}
          </div>
        )}

        {/* Barra de progresso VSL customizada — mostra mesmo antes do vídeo tocar */}
        {src && isControlsHidden && (activeDuration > 0 || block.useFakeDuration) && (() => {
           let barH = compact ? 2 : 3;
           if (block.fakeProgressHeight === 'sm') barH = compact ? 1 : 2;
           if (block.fakeProgressHeight === 'lg') barH = compact ? 4 : 8;
           if (block.fakeProgressHeight === 'xl') barH = compact ? 6 : 12;
           
           return (
             <div style={{ position:'absolute', bottom:0, left:0, right:0, height:barH, background:block.fakeProgressBgColor || 'rgba(255,255,255,0.15)', zIndex:6 }}>
               {/* ref lets onTimeUpdate update width directly — no React re-render */}
               <div ref={progressBarRef} style={{ height:'100%', width:`${progress*100}%`, background: block.fakeProgressColor || '#e63946', transition:'none' }} />
             </div>
           );
        })()}
      </div>
    </div>

      {/* Embedded Result screen (Delayed) - SEPARATED FROM VIDEO PLAYER BORDER */}
      {block.showResultConfig && resVisible && (
        <div style={{ 
          padding: compact?'16px':'32px', 
          background: 'linear-gradient(135deg,rgba(30,41,59,0.8),rgba(15,23,42,0.8))', 
          backdropFilter: 'blur(10px)',
          borderRadius: radius,
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: compact ? 'none' : '0 10px 40px rgba(0,0,0,0.3)',
        }}>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: compact ? 8 : 16, alignItems: 'center', animation: 'fadeIn 0.5s ease-out' }}>
            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
            
            {(block.resEmojiUnified || (block.resEmoji ?? '🎉')) ? (
              <div style={{ display: 'flex', fontSize: compact ? 24 : 48 }}>
                {block.resEmojiUnified ? <NativeEmoji unified={block.resEmojiUnified} size={compact ? 36 : 72} /> : (block.resEmoji ?? '🎉')}
              </div>
            ) : null}
            
            {(block.resHeading ?? 'Parabéns!') ? (
              <p style={{ color: '#ffffff', fontWeight: 700, fontSize: compact ? 13 : 20, margin: 0 }}>{block.resHeading ?? 'Parabéns!'}</p>
            ) : null}

            {(block.resText || '') ? (
              <p style={{ color: '#a0aec0', fontSize: compact ? 9 : 13, lineHeight: 1.6, margin: 0 }}>{block.resText}</p>
            ) : null}

            {(block.resBtnText ?? 'Acessar agora →') && (
              <button 
                onClick={() => {
                  if (block.resBtnUrl) {
                    const url = block.resBtnUrl.startsWith('http') ? block.resBtnUrl : `https://${block.resBtnUrl}`;
                    window.location.href = url;
                  }
                }}
                style={{
                  width: '100%',
                  background: block.resBtnBg || theme?.accent || '#10b981',
                  color: '#fff',
                  padding: compact ? '8px 16px' : '14px 28px',
                  borderRadius: compact ? 8 : 12,
                  border: 'none',
                  fontSize: compact ? 10 : 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: compact ? 8 : 16,
                  boxShadow: `0 4px 20px ${(block.resBtnBg || theme?.accent || '#10b981')}50`,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}>
                {block.resBtnText ?? 'Acessar agora →'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Preview hint for Embedded Result (editor only, before play) */}
      {block.showResultConfig && !resVisible && (
        <div style={{ padding: compact?'10px':'18px', background:'rgba(15,23,42,0.6)', border:'1px dashed rgba(255,255,255,0.1)', borderRadius: radius, opacity:0.6 }}>
          <p style={{ color:'#64748b', fontSize: compact?8:11, textAlign:'center', margin:0 }}>
            {!hasStarted ? '🎬 A Tela de Resultado configurada aparecerá aqui após o lead iniciar o vídeo.' : (
              block.resDelay === 'on_end' ? '🎬 A Tela de Resultado aparecerá aqui ao terminar o vídeo.' :
              block.resDelay === 'custom' ? `🎬 A Tela de Resultado aparecerá aqui após ${block.resDelaySeconds||0} segundos de vídeo.` : ''
            )}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── LoadingScreen Pro ────────────────────────────────────────────────────────
function LoadingScreen({ block, accent, defaultText, compact }) {
  const duration = (block.loadingDuration || 3) * 1000;
  const color = block.loadingColor || accent || '#6366f1';
  const textCol = block.loadingTextColor || defaultText || '#f8fafc';
  const style = block.loadingStyle || 'spinner';
  const fillColor = block.progressFillColor || '#10b981';
  const bgColor = block.progressBgColor || '#cbd5e1';
  const showBar = block.enableProgressBar !== false;
  const showPct = block.showProgressPercent !== false;
  const footerText = block.loadingFooterText !== undefined
    ? block.loadingFooterText
    : '🔒 Suas respostas são completamente confidenciais';

  // Parse dynamic texts from comma-separated loadingText
  const rawTexts = (block.loadingText || '').split(',').map(t => t.trim()).filter(Boolean);
  const texts = rawTexts.length > 0 ? rawTexts : ['Processando...'];

  const [progress, setProgress] = React.useState(0);
  const [textIdx, setTextIdx] = React.useState(0);

  React.useEffect(() => {
    const start = Date.now();
    const interval = 30;
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);
      // Cycle texts evenly distributed over duration
      const segment = Math.floor((elapsed / duration) * texts.length);
      setTextIdx(Math.min(segment, texts.length - 1));
      if (pct >= 100) clearInterval(timer);
    }, interval);
    return () => clearInterval(timer);
  }, []);

  const sz = compact ? 32 : 52;

  return (
    <div style={{
      textAlign: 'center',
      display: 'flex', flexDirection: 'column',
      gap: compact ? 10 : 20,
      alignItems: 'center', justifyContent: 'center',
      minHeight: compact ? 150 : 280,
      padding: compact ? '12px 8px' : '32px 24px',
    }}>
      <style>{`
        @keyframes quizSpin { to { transform: rotate(360deg); } }
        @keyframes quizPulse { 0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.15);opacity:.7} }
        @keyframes quizBounce { 0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)} }
        @keyframes ldgTextIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Spinner / Pulse / Dots */}
      {style === 'spinner' && (
        <div style={{
          width: sz, height: sz,
          border: `${compact?3:4}px solid ${color}28`,
          borderTopColor: color,
          borderRadius: '50%',
          animation: 'quizSpin 1s linear infinite',
          flexShrink: 0,
        }} />
      )}
      {style === 'pulse' && (
        <div style={{
          width: sz, height: sz,
          background: `${color}18`,
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'quizPulse 1.4s ease-in-out infinite',
          flexShrink: 0,
        }}>
          <div style={{ width: '52%', height: '52%', background: color, borderRadius: '50%' }} />
        </div>
      )}
      {style === 'dots' && (
        <div style={{ display: 'flex', gap: compact ? 5 : 8 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: compact ? 8 : 13, height: compact ? 8 : 13,
              background: color, borderRadius: '50%',
              animation: `quizBounce 0.65s infinite ${i*0.13}s alternate`,
            }} />
          ))}
        </div>
      )}

      {/* Main dynamic text */}
      <p key={textIdx} style={{
        color: textCol, fontWeight: 700,
        fontSize: compact ? 12 : 20, margin: 0,
        animation: 'ldgTextIn 0.35s ease-out forwards',
        maxWidth: compact ? 160 : 320,
      }}>
        {texts[textIdx]}
      </p>

      {/* Progress bar */}
      {showBar && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: compact ? 4 : 6, alignItems: 'center' }}>
          <div style={{
            width: '100%', height: compact ? 7 : 10,
            background: bgColor, borderRadius: 99, overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', width: `${progress}%`,
              background: fillColor, borderRadius: 99,
              transition: 'width 0.04s linear',
            }} />
          </div>
          {showPct && (
            <p style={{ color: textCol, opacity: 0.6, fontSize: compact ? 9 : 13, margin: 0 }}>
              {progress}% concluído
            </p>
          )}
        </div>
      )}

      {/* Secondary fixed text */}
      {block.progressText && (
        <p style={{ color: textCol, opacity: 0.55, fontSize: compact ? 9 : 13, margin: 0, fontStyle: 'italic' }}>
          {block.progressText}
        </p>
      )}

      {/* Footer security */}
      {footerText && (
        <p style={{
          color: textCol, opacity: 0.4,
          fontSize: compact ? 8 : 12, margin: 0,
          borderTop: `1px solid ${textCol}28`,
          paddingTop: compact ? 6 : 12, width: '100%', textAlign: 'center',
        }}>
          {footerText}
        </p>
      )}
    </div>
  );
}

// Renderizador fiel ao InLead: converte o config JSON em tela visual
export default function QuizPreview({ config, stepIdx = 0, compact = false, onNavigate, selectedBlockId, quizId, visitorId, scores = {}, onSelectBlock, isLive = false }) {
  const step = config?.steps?.[stepIdx];
  const theme = config?.theme || {};
  const accent = theme.accent || '#6366f1';
  const textColor = theme.text || '#f8fafc';
  const bgType = theme.bgType || 'solid';
  const hasImage = bgType === 'image' && theme.bgImage;
  const hasGradient = bgType === 'gradient';

  // Mostrar overlay apenas se for imagem
  const showOverlay = hasImage;
  const overlayColor = theme.overlayColor || '#000000';
  const overlayOpacity = theme.overlayOpacity ?? 0.45;

  // Global media state for VSL sync
  // IMPORTANT: useRef instead of useState so updates from the video player
  // do NOT trigger a full re-render of the page on every tick.
  const mediaStateRef = React.useRef({ hasStarted: false, ended: false, currentTime: 0 });
  const setMediaState = React.useCallback((next) => {
    mediaStateRef.current = { ...mediaStateRef.current, ...next };
  }, []);
  const mediaState = mediaStateRef.current;

  // Full-screen loading overlay state
  const [loadingBlock, setLoadingBlock] = React.useState(null);
  const [clickedOptionId, setClickedOptionId] = React.useState(null);

  React.useEffect(() => {
    setClickedOptionId(null);
  }, [stepIdx]);

  const onStartLoading = React.useCallback((block, afterMs, navigateFn) => {
    setLoadingBlock(block);
    setTimeout(() => {
      setLoadingBlock(null);
      navigateFn();
    }, afterMs);
  }, []);

  const interceptedOnNavigate = React.useCallback((targetStepId, optionText, isSilent, targetScore) => {
    // Se estiver no builder configurando (onSelectBlock), se a etapa NÃO pedir loading,
    // ou se for um redirecionamento "isSilent" (como pulos diretos por baixo dos panos), vai direto:
    if (onSelectBlock || !step?.showLoading || isSilent) {
      if (onNavigate) onNavigate(targetStepId, optionText, isSilent, targetScore);
      return;
    }

    // Caso contrário, ativa o loading global DA ETAPA para qualquer elemento que chamou a navegação
    onStartLoading(
      {
        loadingText: step.loadingText || 'Analisando suas respostas...',
        loadingTextColor: step.loadingTextColor || theme?.text || '#ffffff',
        loadingColor: step.loadingColor || theme?.accent || '#6366f1',
        loadingStyle: step.loadingStyle || 'spinner',
        progressText: step.progressText,
        enableProgressBar: step.enableProgressBar !== false,
        progressFillColor: step.progressFillColor || '#10b981',
        progressBgColor: step.progressBgColor || '#cbd5e1',
        showProgressPercent: step.showProgressPercent !== false,
        loadingFooterText: step.loadingFooterText ?? '🔒 Suas respostas são completamente confidenciais'
      },
      (step.loadingDuration || 3) * 1000,
      () => {
        if (onNavigate) onNavigate(targetStepId, optionText, isSilent, targetScore);
      }
    );
  }, [onSelectBlock, step, onStartLoading, onNavigate, theme]);

  const containerStyle = {
    background: buildBackground(theme),
    color: textColor,
    fontFamily: 'Inter, system-ui, sans-serif',
    position: 'relative',
    overflow: 'hidden',
  };


  const width = compact ? 200 : (isLive ? '100%' : 390);
  const height = compact ? 380 : (isLive ? '100%' : 680);

  React.useEffect(() => {
    if (selectedBlockId && compact) {
      const el = document.getElementById(`preview-block-${selectedBlockId}`);
      if (el) {
        // give browser time to render new Layout then scroll
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 50);
      }
    }
  }, [selectedBlockId, compact]);

  return (
    <div
      className={`${!isLive ? (compact ? 'rounded-2xl' : 'rounded-3xl shadow-2xl') : ''} overflow-hidden`}
      style={{
        width,
        height,
        minHeight: isLive ? '100dvh' : undefined,
        border: !isLive ? (compact ? '3px solid #1e293b' : '4px solid #1e293b') : 'none',
        margin: '0 auto',
        ...containerStyle,
      }}
    >
      {/* Overlay para imagem de fundo */}
      {showOverlay && (
        <div className="absolute inset-0"
          style={{ background: overlayColor, opacity: overlayOpacity, zIndex: 0 }} />
      )}

      {/* ── FULL-SCREEN LOADING TAKEOVER ── */}
      {loadingBlock && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 50,
          background: buildBackground(theme),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {showOverlay && (
            <div style={{ position: 'absolute', inset: 0, background: overlayColor, opacity: overlayOpacity }} />
          )}
          <div style={{ position: 'relative', zIndex: 1, width: '100%', padding: compact ? '0 16px' : '0 24px' }}>
            <LoadingScreen block={loadingBlock} accent={accent} defaultText={loadingBlock.loadingTextColor || textColor} compact={compact} />
          </div>
        </div>
      )}

      {/* Scrollable content & Animations */}
      <style>{`
        .preview-scroll::-webkit-scrollbar { width: 8px; }
        .preview-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); border-radius: 4px; }
        .preview-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
        .preview-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }

        /* ── Step entry animations ── */
        @keyframes stepFadeIn   { from { opacity: 0; } to { opacity: 1; } }
        @keyframes stepSlideUp  { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes stepSlideDown{ from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes stepSlideLeft{ from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes stepSlideRight{from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes stepZoomIn   { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        @keyframes stepZoomOut  { from { opacity: 0; transform: scale(1.12); } to { opacity: 1; transform: scale(1); } }
        @keyframes stepFlip     { from { opacity: 0; transform: perspective(500px) rotateY(90deg); } to { opacity: 1; transform: perspective(500px) rotateY(0deg); } }
        @keyframes stepRotateIn { from { opacity: 0; transform: rotate(-12deg) scale(0.92); } to { opacity: 1; transform: rotate(0deg) scale(1); } }
        @keyframes stepBounceIn { 0%{opacity:0;transform:translateY(40px)} 60%{opacity:1;transform:translateY(-10px)} 80%{transform:translateY(4px)} 100%{opacity:1;transform:translateY(0)} }
        @keyframes stepElastic  { 0%{opacity:0;transform:scale(0.6)} 55%{opacity:1;transform:scale(1.08)} 75%{transform:scale(0.96)} 90%{transform:scale(1.02)} 100%{opacity:1;transform:scale(1)} }
        @keyframes stepBlurIn   { from { opacity: 0; filter: blur(12px); } to { opacity: 1; filter: blur(0px); } }

        /* ── Stagger: each block child fades up individually ── */
        @keyframes stepStaggerItem { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div className="relative z-10 h-full block overflow-y-auto preview-scroll pb-6">
        {(() => {
          const anim = step?.animation;
          const isStagger = anim === 'stagger';
          const speedMap = { fast: '0.25s', normal: '0.5s', slow: '0.9s', slower: '1.5s' };
          const dur = speedMap[step?.animationSpeed || 'normal'];
          const ease = 'cubic-bezier(0.16, 1, 0.3, 1)';
          const containerAnim = anim && anim !== 'none' && !isStagger
            ? `step${anim.charAt(0).toUpperCase() + anim.slice(1)} ${dur} ${ease} both`
            : 'none';

          return (
            <div
              key={step?.id}
              className={`flex flex-col gap-${compact ? '2' : '3'} ${compact ? 'px-4 pt-4 pb-16' : 'p-6'} min-h-full`}
              style={{ animation: containerAnim }}
            >
              {(step?.blocks || []).map((block, idx) => (
                <div
                  key={block.id}
                  id={`preview-block-${block.id}`}
                  className={`shrink-0 w-full ${compact && block.id === selectedBlockId ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-900 rounded-lg transition-all duration-300 relative' : ''} ${onSelectBlock ? 'cursor-pointer hover:ring-2 hover:ring-indigo-500/50 hover:ring-offset-2 hover:ring-offset-slate-900 rounded-lg transition-all relative group' : ''}`}
                  onClick={(e) => {
                    // Prevent navigation clicks from taking over if we are in builder select mode
                    if (onSelectBlock) {
                      e.preventDefault();
                      e.stopPropagation();
                      onSelectBlock(block.id);
                    }
                  }}
                  styleCapture={isStagger ? {
                    animation: `stepStaggerItem ${dur} ${ease} both`,
                    animationDelay: `${idx * (parseFloat(dur) * 0.18).toFixed(2)}s`,
                  } : {}}
                  style={isStagger ? {
                    animation: `stepStaggerItem ${dur} ${ease} both`,
                    animationDelay: `${idx * (parseFloat(dur) * 0.18).toFixed(2)}s`,
                  } : {}}
                >
                  <div className={onSelectBlock ? 'pointer-events-none' : ''}>
                    <BlockRenderer block={block} theme={{ bg: buildBackground(theme), accent, textColor }} compact={compact} onNavigate={interceptedOnNavigate} quizId={quizId} visitorId={visitorId} stepId={step.id} mediaState={mediaState} setMediaState={setMediaState} steps={config?.steps} stepIdx={stepIdx} scores={scores} onStartLoading={onStartLoading} />
                  </div>
                </div>
              ))}
              {(!step?.blocks || step.blocks.length === 0) && (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30">
                  <p style={{ color: textColor, fontSize: compact ? 10 : 13 }}>
                    Adicione blocos<br />para ver o preview
                  </p>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function AnimatedProgressBar({ block, compact }) {
  const [currentVal, setCurrentVal] = useState(block.startVal ?? 0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    setCurrentVal(block.startVal ?? 0);
    setStarted(false);
    
    const start = block.startVal ?? 0;
    const end = block.endVal ?? 84;
    const durSec = (block.duration ?? 5) || 5; 
    const delaySec = block.delay ?? 0;
    
    let animationFrame;
    let startTime;
    let delayTimeout;
    
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const durMs = durSec * 1000;
      
      if (progress < durMs) {
        const ease = 1 - Math.pow(1 - progress / durMs, 3);
        setCurrentVal(Math.round(start + (end - start) * ease));
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCurrentVal(end);
      }
    };

    delayTimeout = setTimeout(() => {
      setStarted(true);
      animationFrame = requestAnimationFrame(animate);
    }, delaySec * 1000);
    
    return () => {
      clearTimeout(delayTimeout);
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [block.startVal, block.endVal, block.duration, block.delay, block.id]);

  const p = currentVal;
  const pctWidth = started ? Math.max(0, Math.min(100, p)) : (block.startVal ?? 0);
  const displayText = (block.text || '{pct}% das vagas preenchidas...').replace('{pct}', p);
  
  const rMap = { none: 0, md: 8, xl: 16, full: 999 };
  const radius = (rMap[block.rounded || 'full'] ?? 999) * (compact ? 0.6 : 1);
  const pad = compact ? 2 : 4;

  return (
    <div className="w-full relative overflow-hidden flex items-center" style={{
      background: block.bg || '#e2e8f0',
      border: `1px solid ${block.border || '#cbd5e1'}`,
      borderRadius: radius,
      height: block.barHeight || (compact ? 24 : 36),
      padding: pad,
      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)',
    }}>
      <div style={{
        height: '100%',
        width: `${pctWidth}%`,
        background: block.color || '#ef4444',
        borderRadius: radius > 0 ? Math.max(radius - pad, 2) : 0,
        transition: 'width 0.1s linear',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
      }} />
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: block.textColor || '#ffffff',
        fontSize: compact ? 10 : 13,
        fontWeight: 700,
        zIndex: 10,
        textShadow: '0 1px 2px rgba(0,0,0,0.2)',
      }}>
        {displayText}
      </div>
    </div>
  );
}

function CountrySelectDropdown({ dialCountry, setDialCountry, setDialCode, compact, fieldColor, borderRadius }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (code, dial) => {
    setDialCountry(code);
    setDialCode(dial);
    setIsOpen(false);
  };

  return (
    <div ref={ref} onClick={() => setIsOpen(!isOpen)} style={{ display: 'flex', alignItems: 'center', padding: compact ? '0 8px' : '0 12px', background: 'rgba(0,0,0,0.15)', cursor: 'pointer', position: 'relative', borderTopLeftRadius: borderRadius || 0, borderBottomLeftRadius: borderRadius || 0 }}>
       <span className={`fi fi-${dialCountry.toLowerCase()}`} style={{ fontSize: compact ? 16 : 20, width: compact ? 22 : 26, borderRadius: 2, marginRight: 6, display: 'block' }}></span>
       <span style={{ fontSize: 10, color: fieldColor, opacity: 0.7 }}>▼</span>

       {isOpen && (
         <div style={{ 
            position: 'absolute', top: '100%', left: 0, marginTop: 4, 
            background: '#1e293b', border: '1px solid #334155', borderRadius: 8, 
            maxHeight: 220, overflowY: 'auto', zIndex: 50, minWidth: 160, 
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)', padding: '4px 0' 
         }}>
           {countryChoices.map(c => (
             <div key={c.code} 
                 className="hover:bg-white/10 transition-colors"
                 onClick={(e) => { e.stopPropagation(); handleSelect(c.code, c.dial); }}
                 style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
             >
                <span className={`fi fi-${c.code.toLowerCase()}`} style={{ fontSize: 16, width: 22, borderRadius: 2, display: 'block' }} />
                <span style={{ fontSize: 13, color: '#fff', whiteSpace: 'nowrap' }}>{c.code} {c.dial}</span>
             </div>
           ))}
         </div>
       )}
    </div>
  );
}

function BlockRenderer({ block, theme, compact, onNavigate, quizId, visitorId, stepId, mediaState, setMediaState, steps, stepIdx, scores, onStartLoading }) {
  const scale = compact ? 0.6 : 1;
  const { accent, textColor: defaultText } = theme;

  // Resolve next step ID for 'próxima automaticamente'
  const resolveNextStep = (explicitId, currentButtonScoreTarget = null) => {
    const allSteps = steps || [];
    let nextIdx = (stepIdx ?? 0) + 1;
    const isCurrentVariant = allSteps[stepIdx]?.isVariant;

    // Scores acumulados + simulação do botão atual
    let simulatedScores = { ...(scores || {}) };
    if (currentButtonScoreTarget) {
      simulatedScores[currentButtonScoreTarget] = (simulatedScores[currentButtonScoreTarget] || 0) + 1;
    }

    // Gateway: força avaliação de variantes quando a próxima etapa física for Variante
    if (!isCurrentVariant && nextIdx < allSteps.length && allSteps[nextIdx].isVariant) {
      const variantSteps = allSteps.filter(s => s.isVariant && s.variantScore && s.variantScore.trim() !== '');
      if (variantSteps.length > 0) {
        const validKeys = variantSteps.map(s => s.variantScore.trim().toLowerCase());
        const filtered = {};
        for (const [k, v] of Object.entries(simulatedScores)) {
          const n = k.trim().toLowerCase();
          if (validKeys.includes(n)) filtered[n] = (filtered[n] || 0) + v;
        }
        if (Object.keys(filtered).length > 0) {
          const maxScore = Math.max(...Object.values(filtered));
          const winners = Object.keys(filtered).filter(k => filtered[k] === maxScore);
          const chosen = winners[Math.floor(Math.random() * winners.length)];
          const winner = variantSteps.find(s => s.variantScore.trim().toLowerCase() === chosen);
          if (winner) return winner.id;
        }
        return variantSteps[Math.floor(Math.random() * variantSteps.length)].id;
      }
    }

    if (isCurrentVariant) {
      if (explicitId) {
        const t = allSteps.find(s => s.id === explicitId);
        if (t && !t.isVariant) return explicitId;
      }
      while (nextIdx < allSteps.length && allSteps[nextIdx].isVariant) nextIdx++;
      if (nextIdx < allSteps.length) return allSteps[nextIdx].id;
      return null;
    }

    if (explicitId) {
      const t = allSteps.find(s => s.id === explicitId);
      if (t && !t.isVariant) return explicitId;
    }
    if (nextIdx < allSteps.length) return allSteps[nextIdx].id;
    return null;
  };

  // ── Global Delay de aparecimento ───────────────────────────────
  const showDelayConfig = block.showDelay || 'none';
  const [isVisible, setIsVisible] = React.useState(showDelayConfig === 'none');
  const [localSecs, setLocalSecs] = React.useState(0);
  const needsTimer = showDelayConfig !== 'none' && !isVisible;

  React.useEffect(() => {
    if (!needsTimer) return;
    const iv = setInterval(() => setLocalSecs(s => s + 1), 1000);
    return () => clearInterval(iv);
  }, [needsTimer]);

  React.useEffect(() => {
    if (showDelayConfig === 'none') { setIsVisible(true); return; }
    const hasMedia = steps && steps[stepIdx]?.blocks?.some(b => b.type === 'video' || b.type === 'audio');
    if (showDelayConfig === 'on_end') {
      if (!compact && hasMedia) {
        // Poll the ref so we don't depend on mediaState state object
        const iv = setInterval(() => {
          const ms = mediaStateRef?.current;
          if (ms?.hasStarted && ms?.ended) { setIsVisible(true); clearInterval(iv); }
        }, 500);
        return () => clearInterval(iv);
      } else {
        setIsVisible(compact ? localSecs >= 2 : true);
      }
      return;
    }
    if (showDelayConfig === 'custom') {
      const secs = block.showDelaySeconds || 0;
      setIsVisible(localSecs >= secs);
    }
  // mediaStateRef intentionally omitted — it's a ref, changes don't trigger re-render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDelayConfig, block.showDelaySeconds, compact, localSecs, steps, stepIdx]);

  if (!isVisible) return null;
  // ── Fim delay global ──────────────────────────────────────────

  switch (block.type) {

    case 'progress': {
      const pct = block.total > 0 ? Math.round((block.current / block.total) * 100) : 0;
      const h = block.barHeight || (compact ? 4 : 6);
      const isInside = h >= 14; 
      
      return (
        <div className="w-full relative" style={{ marginBottom: compact ? 2 : 4 }}>
          {block.showLabel && !isInside && (
            <p style={{ color: block.textColor || '#1e293b', opacity: 1, fontWeight: 700, fontSize: compact ? 10 : 13, marginBottom: 4, textAlign: 'right', textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>
              {block.current} / {block.total}
            </p>
          )}
          <div style={{ background: block.bg || '#e2e8f0', borderRadius: 99, height: h, position: 'relative', overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: block.color || accent, borderRadius: 99, transition: 'width 0.4s ease' }} />
            {block.showLabel && isInside && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: block.textColor || '#ffffff', fontSize: compact ? 10 : 13, fontWeight: 700, zIndex: 10,
                textShadow: '0 1px 2px rgba(0,0,0,0.3)', pointerEvents: 'none'
              }}>
                {block.current} / {block.total}
              </div>
            )}
          </div>
        </div>
      );
    }

    case 'animated_progress': {
      return (
        <div className="w-full" style={{ marginBottom: compact ? 4 : 8, marginTop: compact ? 2 : 4 }}>
          <AnimatedProgressBar block={block} compact={compact} />
        </div>
      );
    }

    case 'heading': {
      const sizes = { sm: compact ? 12 : 16, base: compact ? 13 : 18, lg: compact ? 14 : 20, xl: compact ? 16 : 24, '2xl': compact ? 18 : 28, '4xl': compact ? 22 : 40 };
      if (block.fontFamily) injectFont(block.fontFamily);
      const headingText = (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: block.align || 'center', gap: compact ? 4 : 8
        }}>
          {block.emojiUnified ? (
            <NativeEmoji unified={block.emojiUnified} size={compact ? 24 : 32} />
          ) : block.emoji ? (
            <span style={{ fontSize: compact ? 24 : 32 }}>{block.emoji}</span>
          ) : null}
          <div style={{
            color: block.color || defaultText,
            fontSize: sizes[block.size] || sizes.xl,
            fontWeight: block.bold ? 700 : 600,
            textAlign: block.align || 'center',
            lineHeight: 1.25,
            letterSpacing: '-0.01em',
            margin: 0,
            fontFamily: block.fontFamily ? `'${block.fontFamily}', sans-serif` : undefined,
          }} dangerouslySetInnerHTML={{ __html: block.text || 'Título aqui' }} />
        </div>
      );
      
      // Only show background if bgEnabled is active
      if (!block.bgEnabled || !block.bgStyle || block.bgStyle === 'none') {
        return headingText;
      }
      
      const isGlass = block.bgStyle === 'glass';
      const radius = block.bgRadius ?? (block.bgStyle === 'rounded' || isGlass ? 16 : 0);
      const pad = block.bgPadding ?? 18;
      const bgStyleProps = {
        background: isGlass ? 'rgba(255,255,255,0.1)' : (block.bgColor || '#1e293b'),
        backdropFilter: isGlass ? `blur(${block.bgBlur ?? 10}px)` : 'none',
        borderRadius: compact ? Math.round(radius * 0.6) : radius,
        padding: compact ? `${Math.round(pad * 0.5)}px ${Math.round(pad * 0.7)}px` : `${pad}px ${Math.round(pad * 1.4)}px`,
        border: isGlass ? '1px solid rgba(255,255,255,0.2)' : 'none',
        boxShadow: isGlass ? '0 8px 32px rgba(0,0,0,0.1)' : 'none',
      };
      
      return <div style={bgStyleProps}>{headingText}</div>;
    }

    case 'text': {
      const sizes = { xs: compact ? 8 : 10, sm: compact ? 9 : 12, base: compact ? 10 : 14, lg: compact ? 11 : 16 };
      if (block.fontFamily) injectFont(block.fontFamily);
      const effect = block.textEffect || 'none';
      const ec = block.effectColor || '#6366f1';
      const thickness = block.effectThickness ?? 3;
      const opacity = block.effectOpacity ?? 0.4;
      const radii = block.effectRadius ?? 8;
      
      let wrapStyle = {};
      if (effect === 'highlight') {
        wrapStyle = { background: ec + Math.round(opacity * 255).toString(16).padStart(2, '0'), display: 'inline', lineHeight: 1.8, padding: '0 4px' };
      } else if (effect === 'bg_box') {
        wrapStyle = { background: ec + Math.round(opacity * 255).toString(16).padStart(2, '0'), borderRadius: compact ? Math.round(radii * 0.6) : radii, padding: compact ? '4px 8px' : '8px 16px', display: 'block' };
      } else if (effect === 'underline_color') {
        wrapStyle = { textDecoration: `underline ${thickness}px solid ${ec}`, textUnderlineOffset: '4px' };
      } else if (effect === 'border_bottom') {
        wrapStyle = { borderBottom: `${thickness}px solid ${ec}`, paddingBottom: compact ? 2 : 6 };
      } else if (effect === 'border_all') {
        wrapStyle = { border: `${thickness}px solid ${ec}`, borderRadius: 6, padding: compact ? '2px 6px' : '6px 14px' };
      }
      
      return (
        <div style={{
          color: block.color || defaultText,
          opacity: effect !== 'none' ? 1 : .75,
          fontSize: sizes[block.size] || sizes.base,
          fontWeight: block.bold ? 700 : 400,
          textAlign: block.align || 'center',
          lineHeight: 1.6,
          fontFamily: block.fontFamily ? `'${block.fontFamily}', sans-serif` : undefined,
          ...wrapStyle,
        }} dangerouslySetInnerHTML={{ __html: block.text || 'Texto aqui' }} />
      );
    }

    case 'image': {
      const isDual = block.layout === 'dual';
      
      const alignProps = 
        block.align === 'flex-start' ? { justifyContent: 'flex-start' } :
        block.align === 'flex-end' ? { justifyContent: 'flex-end' } :
        { justifyContent: 'center' };

      const baseRadius = block.borderRadius ?? 0;
      const borderRadius = compact ? Math.round(baseRadius * 0.6) : baseRadius;

      const renderImage = (src, alt, nextStep, scoreTarget) => {
        const imageStyle = {
          width: '100%',
          height: 'auto',
          borderRadius: borderRadius,
          display: 'block',
        };

        if (!src) {
          return (
             <div style={{ width: '100%', height: compact ? 60 : 120, borderRadius, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: '#475569', fontSize: compact ? 9 : 12, textAlign: 'center', padding: 8 }}>Sem Imagem</p>
             </div>
          );
        }

        return (
          <img src={src} alt={alt || ''} style={{...imageStyle, cursor: 'pointer' }} 
               onClick={() => {
                 if (onNavigate) {
                   const target = resolveNextStep(nextStep, scoreTarget);
                   if (target) onNavigate(target, 'Imagem', false, scoreTarget);
                 }
               }} />
        );
      };

      return (
        <div style={{ display: 'flex', width: '100%', ...alignProps }}>
          <div style={{ 
            width: `${block.imgScale || 100}%`, 
            display: isDual ? 'flex' : 'block', 
            gap: isDual ? (compact ? 8 : 16) : 0 
          }}>
            {isDual ? (
              <>
                <div style={{ flex: 1, minWidth: 0 }}>{renderImage(block.src, block.alt, block.nextStep, block.scoreTarget)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>{renderImage(block.src2, block.alt2, block.nextStep2, block.scoreTarget2)}</div>
              </>
            ) : (
              renderImage(block.src, block.alt, block.nextStep, block.scoreTarget)
            )}
          </div>
        </div>
      );
    }

    case 'arrow_button': {
      const isIconMode = block.displayMode === 'icon';
      const isUrl = block.actionType === 'url';

      const handleClick = () => {
        if (isUrl && block.buttonUrl) {
          const url = block.buttonUrl.startsWith('http') ? block.buttonUrl : `https://${block.buttonUrl}`;
          window.open(url, '_blank');
        } else if (block.showLoading && onStartLoading && onNavigate) {
          const target = resolveNextStep(block.nextStep, block.scoreTarget);
          onStartLoading(block, (block.loadingDuration || 3) * 1000, () => {
            if (target) onNavigate(target, block.text || 'Avançar', false, block.scoreTarget);
          });
        } else if (onNavigate) {
          const target = resolveNextStep(block.nextStep, block.scoreTarget);
          if (target) onNavigate(target, block.text || 'Avançar', false, block.scoreTarget);
        }
      };

      if (isIconMode) {
        const arrowStyle = block.arrowStyle || 'chevron_down';
        const color = block.iconColor || theme?.accent || '#f97316';
        const animation = block.animation || 'bounce';
        const align = block.align || 'center';
        const sizeMap = { sm: compact ? 18 : 28, md: compact ? 24 : 40, lg: compact ? 30 : 52, xl: compact ? 38 : 68 };
        const sz = sizeMap[block.size || 'lg'];

        // Keyframes
        const keyframes = {
          bounce: `@keyframes arr_bounce_${block.id}{0%,100%{transform:translateY(0)}50%{transform:translateY(6px)}}`,
          pulse:  `@keyframes arr_pulse_${block.id}{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.85)}}`,
          blink:  `@keyframes arr_blink_${block.id}{0%,49%{opacity:1}50%,100%{opacity:0}}`,
          none:   '',
        };
        const animCSS = {
          bounce: `arr_bounce_${block.id} 1s ease-in-out infinite`,
          pulse:  `arr_pulse_${block.id} 1.2s ease-in-out infinite`,
          blink:  `arr_blink_${block.id} 1s step-end infinite`,
          none:   'none',
        };

        const svgIcons = {
          chevron_right: <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
          arrow_right: <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
          double_down: <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 5 12 11 18 5"/><polyline points="6 13 12 19 18 13"/></svg>,
          bold_down: <svg width={sz} height={sz} viewBox="0 0 24 24" fill={color}><path d="M4 12l1.41-1.41L11 16.17V4h2v12.17l5.58-5.59L20 12l-8 8-8-8z"/></svg>,
          arrow_down: <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
          chevron_down: <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
          circle_down: <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="8 12 12 16 16 12"/><line x1="12" y1="8" x2="12" y2="16"/></svg>,
          triangle_down: <svg width={sz} height={sz} viewBox="0 0 24 24" fill={color}><polygon points="3,5 12,19 21,5"/></svg>,
        };

        const icon = svgIcons[arrowStyle] || svgIcons.chevron_down;
        const bgEnabled = block.iconBg && block.iconBg !== 'transparent';

        return (
          <>
            {animation !== 'none' && <style>{keyframes[animation]}</style>}
            <div style={{ display: 'flex', justifyContent: align, width: '100%' }}>
              <button
                style={{
                  background: bgEnabled ? block.iconBg : 'none',
                  border: 'none',
                  padding: compact ? (bgEnabled ? 6 : 4) : (bgEnabled ? 12 : 8),
                  borderRadius: bgEnabled ? 999 : 0,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: animCSS[animation],
                  filter: `drop-shadow(0 0 ${compact ? 6 : 12}px ${color}60)`,
                }}
                onClick={handleClick}
              >
                {icon}
              </button>
            </div>
          </>
        );
      }

      // FULL BUTTON MODE
      const { text, bg, textColor, style, showIcon, fullWidth, animation } = block;
      const isPill = style === 'pill' || !style;
      const pad = compact ? '10px 16px' : '16px 28px';
      const fSize = compact ? 13 : 18;
      
      const keyframes = {
        bounce: `@keyframes btn_bounce_${block.id}{0%,100%{transform:translateY(0)}50%{transform:translateY(6px)}}`,
        pulse:  `@keyframes btn_pulse_${block.id}{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.85;transform:scale(.95)}}`,
        none:   '',
      };
      const animCSS = {
        bounce: `btn_bounce_${block.id} 1s ease-in-out infinite`,
        pulse:  `btn_pulse_${block.id} 1.2s ease-in-out infinite`,
        none:   'none',
      };

      const icon = (
        <svg width={compact ? 18 : 22} height={compact ? 18 : 22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      );

      return (
        <>
          {animation && animation !== 'none' && <style>{keyframes[animation]}</style>}
          <div style={{ display: 'flex', width: '100%', justifyContent: 'center' }}>
            <button
              className="hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: compact ? 6 : 10,
                width: fullWidth !== false ? '100%' : 'auto',
                background: bg || accent || '#0f172a',
                color: textColor || '#ffffff',
                padding: pad,
                fontSize: fSize,
                fontWeight: 700,
                borderRadius: isPill ? 9999 : (compact ? 8 : 12),
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                animation: animation && animation !== 'none' ? animCSS[animation] : 'none',
              }}
              onClick={handleClick}
            >
              {text || 'Avançar'}
              {showIcon !== false && icon}
            </button>
          </div>
        </>
      );
    }


    case 'audio':
      return <AudioBlockPlayer block={{...block, setMediaState}} compact={compact} quizId={quizId} visitorId={visitorId} stepId={stepId} />;

    case 'video':
      return <VideoBlockPlayer block={{...block, setMediaState}} compact={compact} quizId={quizId} visitorId={visitorId} stepId={stepId} theme={theme} />;

    case 'button': {
      const pos = block.emojiPosition || 'left_inside';
      const btnRadius = block.borderRadius ?? (block.rounded === 'full' ? 99 : block.rounded === 'xl' ? 14 : 8);
      const bgStyleMode = block.bgStyle || (block.glassEffect ? 'glass' : 'solid');
      let glassStyle;
      if (bgStyleMode === 'glass') {
        glassStyle = {
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: `blur(${block.blurAmount ?? 10}px)`,
          border: '1px solid rgba(255,255,255,0.25)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        };
      } else if (bgStyleMode === 'border_only') {
        glassStyle = {
          background: 'transparent',
          border: `${block.borderWidth ?? 2}px solid ${block.borderColor || block.textColor || '#6366f1'}`,
          boxShadow: 'none',
        };
      } else {
        glassStyle = {
          background: block.bg || accent,
          boxShadow: `0 4px 20px ${block.bg || accent}40`,
          border: 'none',
        };
      }
      
      const animName = block.animation || 'none';
      const speed = block.animationSpeed ?? 1.5;
      const keyframes = {
        pulse: `@keyframes btn_pulse_${block.id}{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}`,
        neon: `@keyframes btn_neon_${block.id}{0%,100%{box-shadow:0 0 5px ${block.bg || accent},0 0 10px ${block.bg || accent}}50%{box-shadow:0 0 15px ${block.bg || accent},0 0 25px ${block.bg || accent}}}`,
        blink: `@keyframes btn_blink_${block.id}{0%,49%{opacity:1}50%,100%{opacity:0.4}}`,
        shake: `@keyframes btn_shake_${block.id}{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}`,
        heartbeat: `@keyframes btn_heartbeat_${block.id}{0%,100%{transform:scale(1)}14%{transform:scale(1.08)}28%{transform:scale(1)}42%{transform:scale(1.08)}70%{transform:scale(1)}}`,
        none: '',
      };
      const animCSS = animName !== 'none' ? `btn_${animName}_${block.id} ${speed}s infinite` : 'none';

      
      const isSelected = clickedOptionId === block.id;

      const BaseButton = (
        <button style={{
          width: block.fullWidth ? `${block.boxWidth || 100}%` : 'auto',
          height: compact ? Math.round((block.boxHeight || 44) * 0.5) : (block.boxHeight || 44),
          color: block.textColor || '#ffffff',
          paddingLeft: compact ? 8 : 16,
          paddingRight: compact ? 8 : 16,
          fontSize: compact ? Math.round((block.fontSize || 15) * 0.6) : (block.fontSize || 15),
          fontWeight: 600,
          fontFamily: block.fontFamily ? `'${block.fontFamily}', sans-serif` : undefined,
          borderRadius: btnRadius,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          letterSpacing: '0.01em',
          display: 'flex',
          flexDirection: pos === 'top_large' ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: block.textAlign === 'left' ? 'flex-start' : (block.textAlign === 'right' ? 'flex-end' : 'center'),
          gap: pos === 'top_large' ? (compact ? 6 : 10) : (compact ? 6 : 8),
          animation: animCSS,
          ...glassStyle,
          ...(isSelected && block.showRadio && bgStyleMode === 'solid' ? { background: `${accent}` } : {}),
          ...(isSelected && block.showRadio && bgStyleMode !== 'solid' ? { borderColor: accent, background: `${accent}20` } : {})
        }}
        onClick={() => {
            setClickedOptionId(block.id);
            // Pequeno atraso se RADIO estiver ativo para dar tempo de ver a bolinha marcando
            const delay = block.showRadio ? 200 : 0;
            setTimeout(() => {
              const isUrl = block.actionType === 'url';
              if (isUrl && block.buttonUrl) {
                const url = block.buttonUrl.startsWith('http') ? block.buttonUrl : `https://${block.buttonUrl}`;
                window.open(url, '_blank');
              } else if (block.showLoading && onStartLoading && onNavigate) {
                const target = resolveNextStep(block.nextStep, block.scoreTarget);
                onStartLoading(block, (block.loadingDuration || 3) * 1000, () => {
                  if (target) onNavigate(target, block.text || 'Avançar', false, block.scoreTarget);
                });
              } else if (onNavigate) {
                const target = resolveNextStep(block.nextStep, block.scoreTarget);
                if (target) onNavigate(target, block.text || 'Avançar', false, block.scoreTarget);
              }
            }, delay);
          }}
        >
          {block.showRadio && (
            <div style={{
              width: compact ? 12 : 20, height: compact ? 12 : 20,
              borderRadius: '50%', border: `2px solid ${isSelected ? (bgStyleMode === 'solid' ? '#fff' : accent) : 'rgba(150,150,150,0.5)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              background: isSelected ? (bgStyleMode === 'solid' ? '#fff' : accent) : 'transparent',
              transition: 'all 0.2s ease',
            }}>
              {isSelected && <svg viewBox="0 0 24 24" fill="none" stroke={bgStyleMode === 'solid' ? accent : '#fff'} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ width: compact ? 8 : 12, height: compact ? 8 : 12 }}><polyline points="20 6 9 17 4 12" /></svg>}
            </div>
          )}

          {pos === 'left_inside' && (block.emojiUnified ? <NativeEmoji unified={block.emojiUnified} size={compact ? 16 : 20} /> : block.emoji && <span>{block.emoji}</span>)}
          {pos === 'top_large' && (block.emojiUnified ? <NativeEmoji unified={block.emojiUnified} size={compact ? 24 : 36} /> : block.emoji && <span style={{fontSize: compact ? 24 : 36, lineHeight: 1}}>{block.emoji}</span>)}
          
          <span style={{flex: pos === 'top_large' ? 'initial' : 1, textAlign: block.textAlign || 'center'}}>{block.text || 'Avançar'}</span>

          {pos === 'right_inside' && (block.emojiUnified ? <NativeEmoji unified={block.emojiUnified} size={compact ? 16 : 20} /> : block.emoji && <span>{block.emoji}</span>)}
        </button>
      );

      let content = BaseButton;
      if (pos === 'left_outside' && (block.emojiUnified || block.emoji)) {
        content = (
          <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 8 : 12, width: block.fullWidth ? '100%' : 'auto' }}>
            <div style={{ fontSize: compact ? 20 : 28, flexShrink: 0, display: 'flex' }}>
              {block.emojiUnified ? <NativeEmoji unified={block.emojiUnified} size={compact ? 20 : 28} /> : block.emoji}
            </div>
            <div style={{ flex: 1 }}>{BaseButton}</div>
          </div>
        );
      }
      
      return (
        <>
          {animName !== 'none' && <style>{keyframes[animName]}</style>}
          {content}
        </>
      );
    }

    case 'divider': {
      return (
        <div style={{
          height: block.thickness || 1,
          flexShrink: 0,
          background: block.color || '#334155',
          borderRadius: 1,
          margin: compact ? '2px 0' : '4px 0',
        }} />
      );
    }
    
    case 'spacer': {
      return (
        <div style={{ height: block.height || 40, width: '100%', flexShrink: 0 }} />
      );
    }

    case 'lead_capture': {
      const [isLoading, setIsLoading] = React.useState(false);
      const [formValues, setFormValues] = React.useState({});
      const [errorMsg, setErrorMsg] = React.useState('');
      const [dialCode, setDialCode] = React.useState('+55');
      const [dialCountry, setDialCountry] = React.useState('BR');

      const fields = block.fields || ['name', 'email'];

      const proceed = () => {
        const finalObj = {...formValues};
        if (fields.includes('phone') && finalObj.phone) {
           finalObj.phone = `${dialCode} ${finalObj.phone}`;
        }
        if (onNavigate) {
           const target = resolveNextStep(block.nextStep, block.scoreTarget);
           if (target) onNavigate(target, Object.keys(finalObj).length > 0 ? JSON.stringify(finalObj) : (block.buttonText || 'Quero meu resultado'), false, block.scoreTarget);
        } else if (block.redirectUrl) {
          const url = block.redirectUrl.startsWith('http') ? block.redirectUrl : `https://${block.redirectUrl}`;
          window.location.href = url;
        }
      };

      const handleCapture = () => {
        // Validation
        if (!compact) {
          const requiredFields = fields;
          for (const f of requiredFields) {
             if (!formValues[f] || !formValues[f].trim()) {
                setErrorMsg('Por favor, preencha todos os campos obrigatórios.');
                return;
             }
          }
        }
        setErrorMsg('');

        if (block.enableLoading && onStartLoading) {
           onStartLoading(block, (block.loadingDuration || 3) * 1000, () => {
              proceed();
           });
        } else if (block.enableLoading) {
           setIsLoading(true);
           setTimeout(() => {
              setIsLoading(false);
              proceed();
           }, (block.loadingDuration || 3) * 1000);
        } else {
           proceed();
        }
      };

      if (isLoading && !onStartLoading) {
        return <LoadingScreen block={block} accent={accent} defaultText={defaultText} compact={compact} />;
      }

      const defaultFieldTitles = { name: 'Nome', email: 'E-mail', phone: 'Telefone', message: 'Mensagem' };
      const labelsDict = block.labels || {};
      const defaultPlaceholders = { name: 'Digite aqui seu Nome', email: 'Digite aqui seu Email', phone: 'Digite seu DDD + WhatsApp', message: 'Sua mensagem' };

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 6 : 14, animation: 'fadeIn 0.4s ease-out' }}>
          <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
          {fields.map(f => {
            const placeholder = block.placeholders?.[f] || defaultPlaceholders[f] || f;
            const fieldTitle = labelsDict[f] !== undefined ? labelsDict[f] : (defaultFieldTitles[f] || f);

            const fieldStyle = {
              padding: compact ? '6px 10px' : '10px 14px',
              background: block.fieldBg || '#f1f5f9',
              border: `1px solid ${block.fieldBorderColor || '#cbd5e1'}`,
              borderRadius: 10,
              fontSize: compact ? 10 : 14,
              color: block.fieldTextColor || '#0f172a',
              width: '100%',
              outline: 'none',
              fontFamily: 'inherit',
              transition: 'border-color 0.2s ease',
            };

            const inputWrapperStyle = {
               opacity: 1,
               display: 'flex',
               flexDirection: 'column',
               gap: compact ? 4 : 6,
            };

            const labelElem = (
               <label style={{ fontSize: compact ? 10 : 13, fontWeight: 700, color: block.labelColor || theme?.textColor || defaultText, margin: 0 }}>
                  {fieldTitle}
               </label>
            );

            if (compact) {
               return (
                  <div key={f} style={inputWrapperStyle}>
                     {labelElem}
                     <div style={{...fieldStyle}}>{placeholder}...</div>
                  </div>
               );
            }

            let inputElem;
            if (f === 'phone') {
               inputElem = (
                  <div style={{ display: 'flex', background: fieldStyle.background, border: fieldStyle.border, borderRadius: fieldStyle.borderRadius, position: 'relative', alignItems: 'stretch' }}>
                     <CountrySelectDropdown
                        dialCountry={dialCountry}
                        setDialCountry={setDialCountry}
                        setDialCode={setDialCode}
                        compact={compact}
                        fieldColor={fieldStyle.color}
                        borderRadius={fieldStyle.borderRadius}
                     />
                     <input
                        type="tel"
                        value={formValues[f] || ''}
                        onChange={e => setFormValues({...formValues, [f]: e.target.value})}
                        placeholder={placeholder}
                        style={{...fieldStyle, border: 'none', flex: 1, background: 'transparent', borderTopRightRadius: fieldStyle.borderRadius, borderBottomRightRadius: fieldStyle.borderRadius, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                     />
                  </div>
               );
            } else if (f === 'message') {
               inputElem = (
                  <textarea
                     value={formValues[f] || ''}
                     onChange={e => setFormValues({...formValues, [f]: e.target.value})}
                     placeholder={placeholder}
                     rows={3}
                     style={{...fieldStyle, resize: 'none'}} 
                  />
               );
            } else {
               inputElem = (
                  <input
                     type={f === 'email' ? 'email' : 'text'}
                     value={formValues[f] || ''}
                     onChange={e => setFormValues({...formValues, [f]: e.target.value})}
                     placeholder={placeholder}
                     style={fieldStyle}
                  />
               );
            }

            return (
               <div key={f} style={inputWrapperStyle}>
                  {labelElem}
                  {inputElem}
               </div>
            );
          })}

          {errorMsg && !compact && (
            <div style={{ color: '#ef4444', fontSize: 13, textAlign: 'center', marginTop: 4 }}>
              {errorMsg}
            </div>
          )}

          <button 
            onClick={handleCapture}
            style={{
            background: block.buttonBg || accent,
            color: '#fff',
            padding: compact ? '8px 0' : '14px 0',
            borderRadius: 10,
            border: 'none',
            fontSize: compact ? 10 : 14,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: `0 4px 20px ${block.buttonBg || accent}50`,
          }}>
            {block.buttonText || 'Quero meu resultado →'}
          </button>
        </div>
      );
    }

    case 'live_counter': {
      let masterBlock = null;
      if (steps && stepId) {
        masterBlock = steps.flatMap(s => s.blocks || []).find(b => b.type === 'live_counter' && b.syncSteps && b.syncSteps.includes(stepId) && b.id !== block.id);
      }
      const cfg = masterBlock || block;

      const minAmount = cfg.minAmount ?? 40;
      const maxAmount = cfg.maxAmount ?? 60;
      const countMode = cfg.countMode || 'random';
      const storageKey = `live_counter_${quizId || 'preview'}_${cfg.id}`;
      
      const [count, setCount] = React.useState(() => {
        const saved = sessionStorage.getItem(storageKey);
        if (saved) {
           const parsed = parseInt(saved, 10);
           if (!isNaN(parsed) && parsed >= minAmount && parsed <= maxAmount) {
             return parsed;
           }
        }
        return countMode === 'increasing' ? minAmount : Math.floor((minAmount + maxAmount) / 2);
      });
      
      const baseSize = cfg.textSize || 14;
      const dotSz = compact ? Math.max(5, baseSize * 0.45) : Math.max(6, baseSize * 0.55);
      const numSz = compact ? Math.max(10, baseSize * 0.8) : baseSize;
      const textSz = compact ? Math.max(9, (baseSize - 1) * 0.8) : (baseSize - 1);
      const gapSz = compact ? Math.max(4, baseSize * 0.35) : Math.max(6, baseSize * 0.45);

      React.useEffect(() => {
        const timer = setInterval(() => {
          setCount(prev => {
            let nextVal;
            if (countMode === 'increasing') {
              const inc = Math.floor(Math.random() * 3) + 1;
              if (prev + inc > maxAmount) {
                 nextVal = minAmount; // Loop back to start
              } else {
                 nextVal = prev + inc;
              }
            } else {
              nextVal = Math.floor(Math.random() * (maxAmount - minAmount + 1)) + minAmount;
            }
            sessionStorage.setItem(storageKey, nextVal.toString());
            return nextVal;
          });
        }, Math.random() * 2000 + 2500);
        return () => clearInterval(timer);
      }, [minAmount, maxAmount, countMode, storageKey]);

      const alignProps = 
        cfg.align === 'left' ? { justifyContent: 'flex-start' } :
        cfg.align === 'right' ? { justifyContent: 'flex-end' } :
        { justifyContent: 'center' };

      const bgStyle = cfg.bg && cfg.bg !== 'transparent' 
        ? { background: cfg.bg, padding: `${Math.round(baseSize*0.4)}px ${Math.round(baseSize)}px`, borderRadius: 9999, border: '1px solid rgba(255,255,255,0.05)' } 
        : {};

      return (
        <div style={{ display: 'flex', width: '100%', ...alignProps }}>
          <style>{`
            @keyframes pulse-live {
              0%, 100% { opacity: 1; }
              50% { opacity: .5; }
            }
          `}</style>
          
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: gapSz,
            ...bgStyle
          }}>
            {/* Blinking dot */}
            <div style={{ 
              width: dotSz, 
              height: dotSz, 
              borderRadius: '50%', 
              backgroundColor: cfg.color || '#ef4444',
              boxShadow: `0 0 ${Math.round(dotSz*1.2)}px ${cfg.color || '#ef4444'}a0`,
              animation: 'pulse-live 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }} />

            <span style={{ 
              color: cfg.color || '#ef4444', 
              fontWeight: 700, 
              fontSize: numSz 
            }}>
              {count}
            </span>

            <span style={{ 
              color: cfg.textColor || '#94a3b8', 
              fontSize: textSz,
              fontWeight: 500
            }}>
              {cfg.text || 'pessoas assistindo'}
            </span>
          </div>
        </div>
      );
    }

    case 'result': {
      const headingSizes = { sm: compact ? 12 : 16, base: compact ? 13 : 18, lg: compact ? 14 : 20, xl: compact ? 16 : 24, '2xl': compact ? 18 : 28, '4xl': compact ? 22 : 40 };
      const textSizes = { xs: compact ? 8 : 10, sm: compact ? 9 : 12, base: compact ? 10 : 14, lg: compact ? 11 : 16 };

      let finalHeading = block.heading;
      let finalHeadingColor = block.headingColor || defaultText;
      let finalHeadingSize = block.headingSize || 'xl';
      let finalHeadingFontFamily = block.headingFontFamily;

      let finalText = block.text;
      let finalTextColor = block.textColor || defaultText;
      let finalTextSize = block.textSize || 'base';
      let finalTextFontFamily = block.textFontFamily;

      let finalEnableButton = block.enableButton !== false;
      let finalButtonText = block.buttonText || 'Resultado';
      let finalButtonUrl = block.buttonUrl;
      let finalButtonAction = block.buttonAction || 'url';
      let finalNextStep = block.nextStep;
      let finalEmoji = block.emoji ?? '🎉';
      let finalEmojiUnified = block.emojiUnified;
      let finalButtonBg = block.buttonBg || accent;
      let finalButtonTextColor = block.buttonTextColor || '#ffffff';
      let finalResDelay = block.resDelay || 'none';
      let finalResDelaySeconds = block.resDelaySeconds || 0;
      let finalTopImage = block.topImage || '';
      const topImageWidthMap = { full: '100%', lg: '80%', md: '60%', sm: '40%' };
      const finalTopImageWidth = topImageWidthMap[block.topImageWidth || 'full'];
      const finalTopImageRadius = block.topImageRadius ?? 12;

      const chosenVariant = React.useMemo(() => {
        if (!block.dynamicResults || !block.variants || block.variants.length === 0) return null;
        // Respeita _previewVariantId tanto no preview compacto quanto no grande
        if (block._previewVariantId) {
           const pv = block.variants.find(v => v.id === block._previewVariantId);
           if (pv) return pv;
        }
        let maxScore = -1;
        let tied = [];
        block.variants.forEach(v => {
          const s = (scores && scores[v.id]) ? scores[v.id] : 0;
          if (s > maxScore) { maxScore = s; tied = [v]; }
          else if (s === maxScore && s > -1) { tied.push(v); }
        });
        if (tied.length === 0) return null;
        if (maxScore === 0) return tied[0];
        let hash = 0;
        const str = visitorId || 'guest';
        for (let i = 0; i < str.length; i++) hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
        return tied[Math.abs(hash) % tied.length];
      }, [block.dynamicResults, block.variants, block._previewVariantId, compact, scores, visitorId]);

      if (chosenVariant) {
        if (chosenVariant.heading !== undefined) finalHeading = chosenVariant.heading;
        if (chosenVariant.headingColor) finalHeadingColor = chosenVariant.headingColor;
        if (chosenVariant.headingSize) finalHeadingSize = chosenVariant.headingSize;
        if (chosenVariant.headingFontFamily) finalHeadingFontFamily = chosenVariant.headingFontFamily;

        if (chosenVariant.text !== undefined) finalText = chosenVariant.text;
        if (chosenVariant.textColor) finalTextColor = chosenVariant.textColor;
        if (chosenVariant.textSize) finalTextSize = chosenVariant.textSize;
        if (chosenVariant.textFontFamily) finalTextFontFamily = chosenVariant.textFontFamily;

        if (chosenVariant.enableButton !== undefined) finalEnableButton = chosenVariant.enableButton;
        if (chosenVariant.buttonText) finalButtonText = chosenVariant.buttonText;
        if (chosenVariant.buttonUrl) finalButtonUrl = chosenVariant.buttonUrl;
        if (chosenVariant.buttonAction) finalButtonAction = chosenVariant.buttonAction;
        if (chosenVariant.nextStep) finalNextStep = chosenVariant.nextStep;
        if (chosenVariant.buttonBg) finalButtonBg = chosenVariant.buttonBg;
        if (chosenVariant.buttonTextColor) finalButtonTextColor = chosenVariant.buttonTextColor;
        if (chosenVariant.resDelay) finalResDelay = chosenVariant.resDelay;
        if (chosenVariant.resDelaySeconds !== undefined) finalResDelaySeconds = chosenVariant.resDelaySeconds;
        if (chosenVariant.hasEmoji) {
           finalEmoji = chosenVariant.emoji;
           finalEmojiUnified = chosenVariant.emojiUnified;
        }
        if (chosenVariant.topImage !== undefined) finalTopImage = chosenVariant.topImage;
      }

      if (finalHeadingFontFamily) injectFont(finalHeadingFontFamily);
      if (finalTextFontFamily) injectFont(finalTextFontFamily);
      if (block.buttonFontFamily) injectFont(block.buttonFontFamily);

      const [resVisible, setResVisible] = React.useState(false);
      const [localSeconds, setLocalSeconds] = React.useState(0);
      // Only tick when delay is active and result not yet visible (avoids re-renders when idle)
      const needsLocalTimer = finalResDelay !== 'none' && !resVisible;

      React.useEffect(() => {
        if (!needsLocalTimer) return;
        const interval = setInterval(() => setLocalSeconds(s => s + 1), 1000);
        return () => clearInterval(interval);
      }, [needsLocalTimer]);

      React.useEffect(() => {
        const delay = finalResDelay;
        if (delay === 'none') { setResVisible(true); return; }
        
        const hasMedia = steps && steps[stepIdx]?.blocks?.some(b => b.type === 'video' || b.type === 'audio');

        if (delay === 'on_end') {
          if (!compact && hasMedia) {
            setResVisible(mediaState && mediaState.hasStarted && mediaState.ended);
          } else {
            setResVisible(compact ? localSeconds >= 2 : true);
          }
          return;
        }

        if (delay === 'custom') {
          const secs = finalResDelaySeconds || 0;
          if (localSeconds >= secs) {
            setResVisible(true);
          } else {
            setResVisible(false);
          }
        }
      }, [finalResDelay, finalResDelaySeconds, mediaState, compact, localSeconds, steps, stepIdx]);

      // Usar refs para manter estado de carregamento sem re-renderizar todo o quiz
      const [isLoading, setIsLoading] = React.useState(false);

      React.useEffect(() => {
        if (!resVisible) {
          setIsLoading(false);
          return;
        }

        if (!block.enableLoading) {
            setIsLoading(false);
            return;
        }
        
        // Reset state when block ID changes (ex: moving between steps)
        setIsLoading(true);
        
        const timer = setTimeout(() => {
          setIsLoading(false);
        }, (block.loadingDuration || 3) * 1000);

        return () => clearTimeout(timer);
      }, [block.id, block.enableLoading, block.loadingDuration, resVisible]);

      if (!resVisible) return null;

      if (isLoading) {
        return <LoadingScreen block={block} accent={accent} defaultText={defaultText} compact={compact} />;
      }

      // Action handler
      const handleAction = () => {
        if (finalButtonAction === 'next_step') {
          const targetId = resolveNextStep(finalNextStep, block.scoreTarget);
          if (onNavigate && targetId) onNavigate(targetId, finalButtonText);
        } else if (finalButtonUrl) {
          const url = finalButtonUrl.startsWith('http') ? finalButtonUrl : `https://${finalButtonUrl}`;
          if (!compact) window.location.href = url;
        }
      };

      return (
        <div
          style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: compact ? 8 : 16, alignItems: 'center', animation: 'fadeIn 0.5s ease-out', cursor: (block.clickAnywhere && finalButtonAction === 'next_step' && !compact) ? 'pointer' : 'default' }}
          onClick={block.clickAnywhere && finalButtonAction === 'next_step' && !compact ? handleAction : undefined}
        >
          <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
          
          {finalTopImage ? (
            <img
              src={finalTopImage}
              alt="Resultado"
              style={{
                width: finalTopImageWidth,
                maxWidth: '100%',
                borderRadius: compact ? Math.round(finalTopImageRadius * 0.6) : finalTopImageRadius,
                objectFit: 'cover',
                display: 'block',
                margin: '0 auto',
              }}
            />
          ) : null}

          {(finalEmojiUnified || finalEmoji) ? (
            <div style={{ display: 'flex', fontSize: compact ? 24 : 48 }}>
              {finalEmojiUnified ? <NativeEmoji unified={finalEmojiUnified} size={compact ? 36 : 72} /> : finalEmoji}
            </div>
          ) : null}
          
          {(finalHeading) ? (
            <div style={{
               color: finalHeadingColor,
               fontSize: headingSizes[finalHeadingSize] || headingSizes.xl,
               fontFamily: finalHeadingFontFamily ? `'${finalHeadingFontFamily}', sans-serif` : undefined,
               fontWeight: 700,
               margin: 0,
            }} dangerouslySetInnerHTML={{ __html: finalHeading }} />
          ) : null}

          {(finalText || '') ? (
            <div style={{
               color: finalTextColor,
               fontSize: textSizes[finalTextSize] || textSizes.base,
               fontFamily: finalTextFontFamily ? `'${finalTextFontFamily}', sans-serif` : undefined,
               opacity: finalTextColor ? 1 : 0.7,
               lineHeight: 1.6,
               margin: 0,
            }} dangerouslySetInnerHTML={{ __html: finalText }} />
          ) : null}

          {finalEnableButton && finalButtonText && (() => {
            const pos = block.buttonEmojiPosition || 'left_inside';
            const btnRadius = block.buttonBorderRadius ?? 14;
            const bgStyleMode = block.buttonBgStyle || 'solid';

            let glassStyle;
            if (bgStyleMode === 'glass') {
              glassStyle = {
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: `blur(${block.buttonBlurAmount ?? 10}px)`,
                border: '1px solid rgba(255,255,255,0.25)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              };
            } else if (bgStyleMode === 'border_only') {
              glassStyle = {
                background: 'transparent',
                border: `${block.buttonBorderWidth ?? 2}px solid ${block.buttonBorderColor || finalButtonTextColor}`,
                boxShadow: 'none',
              };
            } else {
              glassStyle = {
                background: finalButtonBg,
                boxShadow: `0 4px 20px ${finalButtonBg}40`,
                border: 'none',
              };
            }

            const animName = block.buttonAnimation || 'none';
            const speed = block.buttonAnimationSpeed ?? 1.5;
            const btnId = `resbtn_${block.id}`;
            const keyframes = {
              pulse: `@keyframes ${btnId}_pulse {0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}`,
              neon: `@keyframes ${btnId}_neon {0%,100%{box-shadow:0 0 5px ${finalButtonBg},0 0 10px ${finalButtonBg}}50%{box-shadow:0 0 15px ${finalButtonBg},0 0 25px ${finalButtonBg}}}`,
              blink: `@keyframes ${btnId}_blink {0%,49%{opacity:1}50%,100%{opacity:0.4}}`,
              shake: `@keyframes ${btnId}_shake {0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}`,
              heartbeat: `@keyframes ${btnId}_heartbeat {0%,100%{transform:scale(1)}14%{transform:scale(1.08)}28%{transform:scale(1)}42%{transform:scale(1.08)}70%{transform:scale(1)}}`,
              none: '',
            };
            const animCSS = animName !== 'none' ? `${btnId}_${animName} ${speed}s infinite` : 'none';

            return (
              <>
                {animName !== 'none' && <style>{keyframes[animName]}</style>}
                <button
                  onClick={e => { e.stopPropagation(); handleAction(); }}
                  style={{
                    display: 'flex', flexDirection: pos === 'top_large' ? 'column' : 'row',
                    alignItems: 'center', justifyContent: 'center', gap: pos === 'top_large' ? (compact ? 6 : 10) : (compact ? 6 : 8),
                    width: `${block.buttonBoxWidth || 100}%`,
                    height: compact ? Math.round((block.buttonBoxHeight || 44) * 0.5) : (block.buttonBoxHeight || 44),
                    paddingLeft: compact ? 8 : 16,
                    paddingRight: compact ? 8 : 16,
                    borderRadius: btnRadius,
                    fontSize: compact ? Math.round((block.buttonFontSize || 15) * 0.6) : (block.buttonFontSize || 15),
                    fontWeight: 600,
                    fontFamily: block.buttonFontFamily ? `'${block.buttonFontFamily}', sans-serif` : undefined,
                    cursor: 'pointer',
                    position: 'relative',
                    margin: '0 auto',
                    color: finalButtonTextColor,
                    transition: 'opacity 0.15s ease, transform 0.15s',
                    animation: animCSS,
                    ...glassStyle
                  }}>
                {pos === 'left_inside' && (block.buttonEmojiUnified ? <NativeEmoji unified={block.buttonEmojiUnified} size={compact ? 16 : 20} /> : block.buttonEmoji && <span>{block.buttonEmoji}</span>)}
                {pos === 'top_large' && (block.buttonEmojiUnified ? <NativeEmoji unified={block.buttonEmojiUnified} size={compact ? 24 : 36} /> : block.buttonEmoji && <span style={{fontSize: compact ? 24 : 36, lineHeight: 1}}>{block.buttonEmoji}</span>)}
                
                <span style={{flex: pos === 'top_large' ? 'initial' : 1}}>{finalButtonText}</span>
                
                {pos === 'right_inside' && (block.buttonEmojiUnified ? <NativeEmoji unified={block.buttonEmojiUnified} size={compact ? 16 : 20} /> : block.buttonEmoji && <span>{block.buttonEmoji}</span>)}
              </button>
              </>
            );
          })()}

          {block.clickAnywhere && finalButtonAction === 'next_step' && !compact && (
            <p style={{ color: defaultText, opacity: 0.35, fontSize: compact ? 7 : 10, marginTop: 0 }}>Toque em qualquer lugar para continuar</p>
          )}
        </div>
      );
    }

    case 'button_grid': {
      const opts = block.options || [];
      const isMulti = block.multiSelect !== false;
      const [selected, setSelected] = React.useState([]);

      const toggleOpt = (optId) => {
        if (isMulti) {
          setSelected(prev => prev.includes(optId) ? prev.filter(id => id !== optId) : [...prev, optId]);
        } else {
          // Em single select, seleciona e já avança
          const target = resolveNextStep(block.nextStep);
          const scoreTarget = opts.find(o => o.id === optId)?.scoreTarget;
          
          if (block.showLoading && onStartLoading && onNavigate) {
             onStartLoading(block, (block.loadingDuration || 3) * 1000, () => {
               if (target) onNavigate(target, scoreTarget || 'Selecionado', false, scoreTarget || null);
             });
          } else if (onNavigate && target) {
             onNavigate(target, scoreTarget || 'Selecionado', false, scoreTarget || null);
          }
        }
      };

      const columns = block.columns || 7;
      
      return (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: compact ? Math.max(2, (block.gap ?? 10) * 0.6) : (block.gap ?? 10),
          justifyContent: block.justifyContent || 'center',
          width: '100%',
          maxWidth: '100%',
        }}>
          {opts.map(opt => {
            const isSel = selected.includes(opt.id);
            const w = block.buttonWidth ? (compact ? Math.round(block.buttonWidth * 0.7) : block.buttonWidth) : 'auto';
            const minW = block.buttonWidth ? 0 : (compact ? 30 : 40);

            // Se for pra fluir no flex-wrap com colunas uniformes:
            const basisCalc = `calc((100% - ${(columns - 1) * (block.gap ?? 10)}px) / ${columns})`;
            
            return (
              <button
                key={opt.id}
                onClick={() => toggleOpt(opt.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: block.buttonWidth ? w : basisCalc,
                  minWidth: minW,
                  height: compact ? Math.round((block.buttonHeight ?? 50) * 0.7) : (block.buttonHeight ?? 50),
                  borderRadius: compact ? Math.round((block.buttonRadius ?? 16) * 0.7) : (block.buttonRadius ?? 16),
                  background: isSel ? (block.buttonSelectedBg || '#6366f1') : (block.buttonBg || '#040914'),
                  border: `1px solid ${isSel ? (block.buttonSelectedBorder || '#6366f1') : (block.buttonBorder || 'transparent')}`,
                  color: isSel ? (block.buttonSelectedTextColor || '#ffffff') : (block.buttonTextColor || '#ffffff'),
                  fontSize: compact ? Math.round((block.buttonFontSize ?? 16) * 0.7) : (block.buttonFontSize ?? 16),
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  padding: block.buttonWidth ? 0 : '0 10px',
                  outline: 'none',
                  flexShrink: block.buttonWidth ? 0 : 1,
                  boxShadow: isSel ? `0 4px 12px ${(block.buttonSelectedBg || '#6366f1')}40` : '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                {opt.text}
              </button>
            );
          })}
        </div>
      );
    }

    case 'checkbox_selector': {
      const opts = block.options || [];
      const isMulti = block.multiSelect !== false;
      const [selected, setSelected] = React.useState([]);

      const toggleOpt = (optId) => {
        if (isMulti) {
          setSelected(prev =>
            prev.includes(optId) ? prev.filter(id => id !== optId) : [...prev, optId]
          );
        } else {
          setSelected(prev => prev.includes(optId) ? [] : [optId]);
        }
      };

      const canConfirm = selected.length >= (isMulti ? (block.minSelect || 1) : 1);

      const handleConfirm = () => {
        if (!canConfirm) return;
        const target = resolveNextStep(block.nextStep);
        const scoreStr = selected
          .map(id => opts.find(o => o.id === id)?.scoreTarget)
          .filter(Boolean)
          .join(',');
        if (block.showLoading && onStartLoading && onNavigate && target) {
          onStartLoading(block, (block.loadingDuration || 3) * 1000, () => {
            onNavigate(target, scoreStr || 'Confirmado', false, scoreStr || null);
          });
        } else if (onNavigate && target) {
          onNavigate(target, scoreStr || 'Confirmado', false, scoreStr || null);
        }
      };

      const cbStyle = block.checkboxStyle || 'square';
      const radius = block.itemRadius ?? 14;

      return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: compact ? 4 : 8 }}>
          {opts.map(opt => {
            const isSel = selected.includes(opt.id);
            return (
              <button
                key={opt.id}
                onClick={() => toggleOpt(opt.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: compact ? 8 : 12,
                  width: block.itemWidth ? `${block.itemWidth}%` : '100%',
                  alignSelf: 'center',
                  padding: compact ? `${(block.itemHeight || 12) / 2}px 10px` : `${block.itemHeight ?? 12}px 16px`,
                  borderRadius: radius,
                  border: `2px solid ${isSel ? (block.itemSelectedBorder || '#6366f1') : (block.itemBorder || '#334155')}`,
                  background: isSel ? (block.itemSelectedBg || '#6366f1') : (block.itemBg || 'transparent'),
                  color: block.itemTextColor || '#ffffff',
                  fontSize: compact ? 9 : 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  textAlign: 'left',
                  outline: 'none',
                }}
              >
                {/* Checkbox indicator */}
                {cbStyle !== 'hidden' && (
                  <div style={{
                    width: compact ? 14 : 20,
                    height: compact ? 14 : 20,
                    borderRadius: cbStyle === 'circle' ? '50%' : 4,
                    border: `2px solid ${isSel ? (block.iconSelectedColor || '#ffffff') : (block.itemBorder || '#334155')}`,
                    background: isSel ? 'rgba(255,255,255,0.3)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.18s ease',
                  }}>
                    {isSel && (
                      <svg width={compact ? 8 : 12} height={compact ? 8 : 12} viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke={block.iconSelectedColor || '#ffffff'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                )}
                {opt.emojiUnified ? <NativeEmoji unified={opt.emojiUnified} size={compact ? 12 : 20} /> : opt.emoji && <span>{opt.emoji}</span>}
                <span style={{ flex: 1 }}>{opt.text}</span>
              </button>
            );
          })}

          {/* Confirm button */}
          {(!canConfirm && block.hideConfirmUntilSelected) ? null : (
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              style={{
                marginTop: compact ? 4 : 8,
                width: block.confirmWidth ? `${block.confirmWidth}%` : '100%',
                alignSelf: 'center',
                padding: compact ? `${(block.confirmHeight || 13) / 2}px 12px` : `${block.confirmHeight ?? 13}px 20px`,
                borderRadius: block.confirmRadius ?? 14,
                background: canConfirm ? (block.confirmBg || '#6366f1') : (block.confirmDisabledBg || '#1e293b'),
                color: canConfirm ? (block.confirmTextColor || '#ffffff') : (block.confirmDisabledTextColor || '#475569'),
                fontSize: compact ? 9 : 15,
                fontWeight: 600,
                cursor: canConfirm ? 'pointer' : 'not-allowed',
                border: `2px solid ${canConfirm ? (block.confirmBorder || 'transparent') : (block.confirmDisabledBorder || 'transparent')}`,
                transition: 'all 0.2s ease',
                opacity: 1,
              }}
            >
              {block.confirmText || 'Confirmar →'}
              {isMulti && !canConfirm && (
                <span style={{ opacity: 0.7, fontSize: compact ? 7 : 11, marginLeft: 6 }}>
                  (selecione {block.minSelect || 1}+)
                </span>
              )}
            </button>
          )}
        </div>
      );
    }

    case 'testimonial_carousel': {
      const testimonials = block.testimonials || [];
      const filterButtons = block.filterButtons || [];
      const [activeFilter, setActiveFilter] = React.useState('Todas');
      const [carouselIdx, setCarouselIdx] = React.useState(0);

      const filtered = activeFilter === 'Todas' || filterButtons.length === 0
        ? testimonials
        : testimonials.filter(t => (t.category || '') === activeFilter);

      const total = filtered.length;
      const safIdx = total > 0 ? Math.min(carouselIdx, total - 1) : 0;
      const tm = filtered[safIdx] || {};

      const goTo = (n) => setCarouselIdx(Math.max(0, Math.min(n, total - 1)));
      const goNext = () => { if (safIdx < total - 1) goTo(safIdx + 1); };
      const goPrev = () => { if (safIdx > 0) goTo(safIdx - 1); };

      // Reset index when filter changes
      React.useEffect(() => { setCarouselIdx(0); }, [activeFilter]);

      // Touch / Swipe logic
      const touchStartX = React.useRef(0);
      const touchEndX = React.useRef(0);
      const handleTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
        touchEndX.current = e.touches[0].clientX;
      };
      const handleTouchMove = (e) => {
        touchEndX.current = e.touches[0].clientX;
      };
      const handleTouchEnd = () => {
        const diff = touchStartX.current - touchEndX.current;
        if (Math.abs(diff) > 50) { // minimum threshold for swipe
          if (diff > 0 && safIdx < total - 1) goNext();
          else if (diff < 0 && safIdx > 0) goPrev();
        }
      };

      const isVideoPlayingRef = React.useRef(false);
      const delay = block.autoplayDelay || 0;

      React.useEffect(() => {
        if (!delay || compact || total <= 1) return;
        const iv = setInterval(() => {
          if (!isVideoPlayingRef.current) {
            setCarouselIdx(prev => (prev + 1) % total);
          }
        }, delay * 1000);
        return () => clearInterval(iv);
      }, [delay, compact, total]);

      const cardBg = block.cardBg || '#1e293b';
      const cardBorder = block.cardBorder || '#334155';
      const cs = compact ? 0.55 : 1;

      // Mini VideoPlayer for testimonial (reuses VSL logic)
      function TestiVideoPlayer({ tm, playingRef, isActive }) {
        const videoRef = React.useRef(null);
        const iframeRef = React.useRef(null);
        const [playing, setPlaying] = React.useState(false);
        const [userUnmuted, setUserUnmuted] = React.useState(false);
        const [showThumb, setShowThumb] = React.useState(true);
        const startedRef = React.useRef(false);
        const [hasLoaded, setHasLoaded] = React.useState(false);

        React.useEffect(() => {
          if (isActive) {
             setHasLoaded(true);
          } else {
             // Destroy iframe when not active to prevent Panda Video sync-play bugs and heavy CPU stuttering
             setHasLoaded(false);
             setPlaying(false);
             setShowThumb(true);
             startedRef.current = false;
          }
        }, [isActive]);

        const src = tm.videoSrc || '';
        const isYT = src.includes('youtube') || src.includes('youtu.be');
        const isVimeo = src.includes('vimeo');
        const isPandaEmbed = src.includes('pandavideo') && src.includes('/embed/');
        const isEmbed = isYT || isVimeo || isPandaEmbed;
        
        const [currentTime, setCurrentTime] = React.useState(0);
        const [duration, setDuration] = React.useState(0);

        React.useEffect(() => {
          if (!isEmbed || !playing) return;
          const interval = setInterval(() => {
            setCurrentTime(prev => prev + 1);
          }, 1000);
          return () => clearInterval(interval);
        }, [isEmbed, playing]);

        const activeDuration = isEmbed ? (tm.videoFakeDuration || 120) : duration;
        const progress = activeDuration > 0 ? currentTime / activeDuration : 0;
        const displayDuration = tm.videoUseFakeDuration ? (tm.videoFakeDuration || 120) : activeDuration;
        const displayCurrentTime = tm.videoUseFakeDuration ? (progress * displayDuration) : currentTime;

        const fmt = (s) => {
          if (!s || isNaN(s)) return '0:00';
          const m = Math.floor(s/60);
          return `${m}:${Math.floor(s%60).toString().padStart(2,'0')}`;
        };
        const ar = tm.videoAspectRatio || '9/16';
        const radius = tm.videoRounded !== false ? (compact ? 8 : 14) : 0;
        const showUnmuteOverlay = !!(tm.videoAutoplay && tm.videoMuted && src && !userUnmuted);

        React.useEffect(() => {
          if (playingRef) playingRef.current = playing && !showUnmuteOverlay;
        }, [playing, showUnmuteOverlay, playingRef]);

        const getEmbedUrl = (url) => {
          if (!url) return '';
          let u = url.replace(/(&|\?)autoplay=(true|1|false|0)/gi, '');
          if (u.includes('youtube.com/watch?v=')) return u.replace('watch?v=', 'embed/');
          if (u.includes('youtu.be/')) return u.replace('youtu.be/', 'www.youtube.com/embed/');
          if (u.includes('vimeo.com/')) return u.replace('vimeo.com/', 'player.vimeo.com/video/');
          return u;
        };
        const rawUrl = isEmbed ? getEmbedUrl(src) : '';
        const embedUrl = rawUrl
          ? rawUrl + (rawUrl.includes('?') ? '&' : '?') + `autoplay=0&mute=${tm.videoMuted ? 1 : 0}&loop=${tm.videoAutoloop ? 1 : 0}&controls=0`
          : '';

        // ── Autoplay when slide becomes active ──────────────────────────
        React.useEffect(() => {
          if (!isEmbed || !src || !tm.videoAutoplay || !isActive || !hasLoaded) return;
          if (startedRef.current) return;
          startedRef.current = true;

          const timer = setTimeout(() => {
            if (isYT) iframeRef.current?.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
            if (isVimeo) iframeRef.current?.contentWindow?.postMessage('{"method":"play"}', '*');
            if (isPandaEmbed && embedUrl) {
              // PandaVideo: reload src with autoplay to guarantee play
              iframeRef.current.src = embedUrl.replace('autoplay=0', 'autoplay=1&muted=1');
            }
            setPlaying(true);
          }, 400); // Small delay so the iframe can load its DOM
          return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [isActive, hasLoaded]); // ← do NOT add `playing` here — it would create a re-render loop

        // ── Pause + reset when slide becomes inactive ────────────────────
        React.useEffect(() => {
          if (isActive) return;
          // Slide went away: pause playback and reset for next display
          if (isEmbed) {
            if (isYT) iframeRef.current?.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
            if (isVimeo) iframeRef.current?.contentWindow?.postMessage('{"method":"pause"}', '*');
            // For Panda: iframe is already destroyed by the hasLoaded effect above
          } else {
            videoRef.current?.pause();
          }
          setPlaying(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [isActive]);

        const handleUnmute = (e) => {
          if (e) { e.stopPropagation(); e.preventDefault(); }
          if (isEmbed) {
            if (isYT) { iframeRef.current?.contentWindow?.postMessage('{"event":"command","func":"unMute","args":""}', '*'); iframeRef.current?.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', '*'); }
            if (isVimeo) { iframeRef.current?.contentWindow?.postMessage('{"method":"setVolume","value":1}', '*'); }
            if (isPandaEmbed) {
               // Ensure Panda can play - fallback to src reload if postMessage fails inside user's Panda config
               iframeRef.current?.contentWindow?.postMessage('play', '*');
               iframeRef.current?.contentWindow?.postMessage('{"action":"play"}', '*');
               iframeRef.current?.contentWindow?.postMessage('{"method":"play"}', '*');
            }
          } else {
            const v = videoRef.current; if (!v) return;
            v.muted = false; v.currentTime = 0;
            v.play().catch(() => {});
          }
          setPlaying(true); setUserUnmuted(true); setShowThumb(false);
        };

        const togglePlay = () => {
          if (showUnmuteOverlay) { handleUnmute(); return; }
          if (playing && isEmbed) return; // Se for embed e já tiver tocando, o clique vai direto pro iframe via pointerEvents='auto'
          
          if (isEmbed) {
             setPlaying(true); setShowThumb(false);
             if (isYT) iframeRef.current?.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
             if (isVimeo) iframeRef.current?.contentWindow?.postMessage('{"method":"play"}', '*');
             if (isPandaEmbed) {
                 iframeRef.current?.contentWindow?.postMessage('play', '*');
                 iframeRef.current?.contentWindow?.postMessage('{"action":"play"}', '*');
                 iframeRef.current?.contentWindow?.postMessage('{"method":"play"}', '*');
                 // Força o play na marra alterando o source se o panda for imune aos postMessages mais comuns
                 if (embedUrl) {
                     iframeRef.current.src = embedUrl.replace('autoplay=0', 'autoplay=true&muted=false');
                 }
             }
             return;
          }
          
          const v = videoRef.current; if (!v) return;
          if (playing) { if (!tm.videoDisablePause) { v.pause(); setPlaying(false); } }
          else { v.play().catch(() => {}); setPlaying(true); setShowThumb(false); }
        };

        const handleCanPlay = () => {
          const v = videoRef.current;
          if (!v || startedRef.current || !tm.videoAutoplay || isEmbed) return;
          startedRef.current = true; v.muted = true;
          v.play().then(() => { setPlaying(true); setShowThumb(false); }).catch(() => {});
        };

        return (
          <div style={{ width: '100%', borderRadius: radius, overflow: 'hidden', position: 'relative', background: '#000', cursor: src ? 'pointer' : 'default' }} onClick={togglePlay}>
            <style>{`
              @keyframes tmMutePulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }
              @keyframes tmMuteBlink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
              @keyframes tmRipple { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(2.6);opacity:0} }
            `}</style>
            <div style={{ width: '100%', aspectRatio: ar, position: 'relative', background: '#0a0a0a', overflow: 'hidden' }}>
              {/* Placeholder */}
              {!src && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <svg width={compact ? 24 : 40} height={compact ? 24 : 40} viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                  <p style={{ color: '#334155', fontSize: compact ? 8 : 11 }}>Adicione o vídeo</p>
                </div>
              )}
              {/* Embed */}
              {src && isEmbed && hasLoaded && (
                <iframe ref={iframeRef} src={embedUrl} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', pointerEvents: playing ? 'auto' : 'none' }} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
              )}
              {/* Native */}
              {src && !isEmbed && hasLoaded && (
                <video ref={videoRef} src={src} loop={!!tm.videoAutoloop} playsInline disablePictureInPicture
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
                  onCanPlay={handleCanPlay}
                  onTimeUpdate={e => setCurrentTime(e.target.currentTime)}
                  onLoadedMetadata={e => setDuration(e.target.duration)}
                  onEnded={() => setPlaying(false)} />
              )}
              {/* Thumbnail */}
              {src && tm.thumbnailSrc && showThumb && (
                <div style={{ position: 'absolute', inset: 0, background: `url(${tm.thumbnailSrc}) center/cover`, pointerEvents: 'none', zIndex: 4 }} />
              )}
              {/* Mute overlay (For All) */}
              {src && showUnmuteOverlay && (
                <div onClick={handleUnmute} style={{ position: 'absolute', inset: 0, zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: compact ? 6 : 12, cursor: 'pointer' }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'absolute', width: compact ? 44 : 72, height: compact ? 44 : 72, borderRadius: '50%', border: `2px solid ${tm.videoMuteIconColor || 'rgba(0,213,230,0.4)'}`, animation: 'tmRipple 2s ease-out infinite', pointerEvents: 'none' }} />
                    <div style={{ width: compact ? 34 : 56, height: compact ? 34 : 56, borderRadius: '50%', background: tm.videoMuteIconColor ? `linear-gradient(145deg,${tm.videoMuteIconColor},${tm.videoMuteIconColor}bb)` : 'linear-gradient(145deg,#00d5e6,#0099b0)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 ${compact ? 12 : 22}px ${tm.videoMuteIconColor || 'rgba(0,213,230,0.6)'}`, animation: 'tmMutePulse 1.6s ease-in-out infinite' }}>
                      <svg width={compact ? 14 : 24} height={compact ? 14 : 24} viewBox="0 0 24 24" fill="white" style={{ animation: 'tmMuteBlink 1s step-end infinite' }}>
                        <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                        <line x1="23" y1="9" x2="17" y2="15" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                        <line x1="17" y1="9" x2="23" y2="15" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                  </div>
                  <div style={{ background: tm.videoMuteBgColor || 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 999, padding: compact ? '4px 12px' : '7px 18px', color: tm.videoMuteTextColor || '#fff', fontSize: compact ? 9 : 13, fontWeight: 700 }}>
                    {tm.videoUnmuteText || '🔊 Clique para ouvir'}
                  </div>
                </div>
              )}
              {/* Play button (For All) */}
              {tm.videoShowPlayBtn !== false && src && !playing && !showUnmuteOverlay && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 5 }}>
                  <div style={{ width: compact ? 32 : 52, height: compact ? 32 : 52, borderRadius: '50%', background: 'rgba(0,0,0,0.65)', border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width={compact ? 12 : 20} height={compact ? 12 : 20} viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
                  </div>
                </div>
              )}
              {/* Timer */}
              {tm.videoShowTimer !== false && src && (activeDuration > 0 || tm.videoUseFakeDuration) && (
                <div style={{ position:'absolute', bottom:compact?6:10, right:compact?6:10, background:'rgba(0,0,0,0.75)', borderRadius:4, padding:compact?'2px 5px':'3px 8px', fontSize:compact?8:11, color:'#fff', fontFamily:'monospace', zIndex:6 }}>
                  {fmt(displayCurrentTime)} / {fmt(displayDuration)}
                </div>
              )}
              {/* Progress Bar */}
              {src && (activeDuration > 0 || tm.videoUseFakeDuration) && (
                <div style={{ position:'absolute', bottom:0, left:0, right:0, height:compact?2:3, background:'rgba(255,255,255,0.15)', zIndex:6 }}>
                  <div style={{ height:'100%', width:`${progress*100}%`, background: tm.videoFakeProgressColor || '#e63946', transition:'width 0.5s linear' }} />
                </div>
              )}
            </div>
            {/* Person name below video */}
            {tm.personName && (
              <div style={{ background: 'rgba(0,0,0,0.7)', padding: compact ? '3px 8px' : '6px 12px', textAlign: 'center' }}>
                <span style={{ color: '#fff', fontSize: compact ? 8 : 12, fontWeight: 600 }}>{tm.personName}</span>
              </div>
            )}
          </div>
        );
      }

      return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: compact ? 8 : 14 }}>
          {/* Badge */}
          {block.badge && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: compact ? 4 : 6, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 999, padding: compact ? '3px 10px' : '5px 14px' }}>
                {block.badgeDot !== false && <span style={{ width: compact ? 6 : 8, height: compact ? 6 : 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block', flexShrink: 0 }} />}
                <span style={{ color: '#ef4444', fontSize: compact ? 8 : 11, fontWeight: 700, letterSpacing: '0.08em' }}>{block.badge}</span>
              </div>
            </div>
          )}

          {/* Title + Subtitle */}
          {block.title && (
            <p style={{ color: defaultText, fontWeight: 700, fontSize: compact ? 11 : 17, textAlign: 'center', margin: 0, lineHeight: 1.3 }}>{block.title}</p>
          )}
          {block.subtitle && (
            <p style={{ color: defaultText, opacity: 0.6, fontSize: compact ? 8 : 12, textAlign: 'center', margin: 0 }}>{block.subtitle}</p>
          )}

          {/* Filter Buttons */}
          {block.showFilterButtons !== false && filterButtons.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'nowrap', gap: compact ? 4 : 6, overflowX: 'auto', paddingBottom: 2 }}>
              {filterButtons.map((btn) => {
                const isActive = activeFilter === btn.label;
                return (
                  <button key={btn.id} onClick={() => setActiveFilter(btn.label === activeFilter && btn.label !== 'Todas' ? 'Todas' : btn.label)}
                    style={{
                      flexShrink: 0,
                      display: 'flex', alignItems: 'center', gap: compact ? 3 : 5,
                      padding: compact ? '3px 8px' : '5px 12px',
                      borderRadius: 999,
                      border: `1.5px solid ${isActive ? accent : 'rgba(255,255,255,0.15)'}`,
                      background: isActive ? `${accent}20` : 'transparent',
                      color: isActive ? accent : defaultText,
                      fontSize: compact ? 8 : 11,
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.18s',
                    }}>
                    {btn.emoji && <span style={{ fontSize: compact ? 10 : 14 }}>{btn.emoji}</span>}
                    {btn.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Card */}
          {total > 0 ? (
            <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: compact ? 12 : 18, overflow: 'hidden' }}
                 onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
              {/* Map Slides to DOM to prevent iframe CPU block mounting stutter */}
              {filtered.map((t, idx) => {
                const isActive = idx === safIdx;
                return (
                  <div key={idx} style={{ display: isActive ? 'block' : 'none' }}>
                    {/* Category label */}
                    {t.category && (
                      <div style={{ padding: compact ? '6px 10px' : '8px 14px', borderBottom: `1px solid ${cardBorder}` }}>
                        <span style={{ fontSize: compact ? 8 : 11, fontWeight: 700, color: defaultText, opacity: 0.7, letterSpacing: '0.06em' }}>
                          {t.categoryEmoji} {t.category.toUpperCase()}
                        </span>
                      </div>
                    )}

                    {/* Video */}
                    <div style={{ padding: compact ? '8px 10px' : '12px 14px' }}>
                      <TestiVideoPlayer tm={t} playingRef={isActive ? isVideoPlayingRef : undefined} isActive={isActive} />
                    </div>

                    {/* Text content */}
                    <div style={{ padding: compact ? '0 10px 8px' : '0 14px 12px', display: 'flex', flexDirection: 'column', gap: compact ? 4 : 8 }}>
                      {t.title && (
                        <p style={{ color: defaultText, fontWeight: 700, fontSize: compact ? 9 : 14, margin: 0, lineHeight: 1.4 }}>{t.title}</p>
                      )}
                      {t.quote && (
                        <p style={{ color: defaultText, opacity: 0.75, fontSize: compact ? 8 : 12, margin: 0, fontStyle: 'italic', lineHeight: 1.5 }}>{t.quote}</p>
                      )}

                      {/* Author */}
                      {t.showAuthor !== false && (t.authorName || t.authorPhoto) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 5 : 8, marginTop: compact ? 2 : 4, paddingTop: compact ? 4 : 8, borderTop: `1px solid ${cardBorder}` }}>
                          {/* Avatar */}
                          <div style={{ width: compact ? 20 : 32, height: compact ? 20 : 32, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: accent + '30', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${accent}50` }}>
                            {t.authorPhoto
                              ? <img src={t.authorPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <span style={{ color: accent, fontWeight: 700, fontSize: compact ? 8 : 13 }}>{(t.authorName || '?')[0].toUpperCase()}</span>
                            }
                          </div>
                          <div>
                            <p style={{ color: defaultText, fontWeight: 700, fontSize: compact ? 8 : 12, margin: 0 }}>{t.authorName}</p>
                            {(t.authorRole || t.authorCity) && (
                              <p style={{ color: defaultText, opacity: 0.55, fontSize: compact ? 7 : 10, margin: 0 }}>
                                {[t.authorRole, t.authorCity].filter(Boolean).join(' · ')}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Dot pagination */}
              {total > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: compact ? 3 : 5, paddingBottom: compact ? 6 : 10 }}>
                  {filtered.map((_, i) => (
                    <button key={i} onClick={() => goTo(i)}
                      style={{ width: i === safIdx ? (compact ? 14 : 20) : (compact ? 5 : 7), height: compact ? 5 : 7, borderRadius: 999, background: i === safIdx ? (block.dotActiveColor || '#000000') : (block.dotInactiveColor || 'rgba(0,0,0,0.3)'), border: 'none', cursor: 'pointer', transition: 'all 0.2s', padding: 0 }} />
                  ))}
                </div>
              )}

              {/* Prev / Next buttons */}
              {total > 1 && !block.hideNavButtons && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: compact ? '6px 10px' : '8px 14px', borderTop: `1px solid ${cardBorder}` }}>
                  <button onClick={goPrev} disabled={safIdx === 0}
                    style={{ display: 'flex', alignItems: 'center', gap: compact ? 3 : 5, padding: compact ? '4px 8px' : '7px 14px', borderRadius: compact ? 6 : 10, border: `1px solid ${cardBorder}`, background: 'transparent', color: defaultText, fontSize: compact ? 8 : 12, fontWeight: 500, cursor: safIdx === 0 ? 'not-allowed' : 'pointer', opacity: safIdx === 0 ? 0.3 : 1, transition: 'all 0.15s' }}>
                    <svg width={compact ? 8 : 12} height={compact ? 8 : 12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                    Anterior
                  </button>
                  <span style={{ color: defaultText, opacity: 0.5, fontSize: compact ? 8 : 11 }}>{safIdx + 1} de {total}</span>
                  <button onClick={goNext} disabled={safIdx === total - 1}
                    style={{ display: 'flex', alignItems: 'center', gap: compact ? 3 : 5, padding: compact ? '4px 8px' : '7px 14px', borderRadius: compact ? 6 : 10, border: `1px solid ${cardBorder}`, background: 'transparent', color: defaultText, fontSize: compact ? 8 : 12, fontWeight: 500, cursor: safIdx === total - 1 ? 'not-allowed' : 'pointer', opacity: safIdx === total - 1 ? 0.3 : 1, transition: 'all 0.15s' }}>
                    Próximo
                    <svg width={compact ? 8 : 12} height={compact ? 8 : 12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: compact ? '12px' : '24px', textAlign: 'center', border: `1px dashed ${cardBorder}`, borderRadius: compact ? 10 : 16, color: defaultText, opacity: 0.4, fontSize: compact ? 9 : 13 }}>
              Nenhum depoimento para "{activeFilter}"
            </div>
          )}

          {/* Footer note */}
          {block.footerNote && (
            <p style={{ color: defaultText, opacity: 0.5, fontSize: compact ? 7 : 11, textAlign: 'center', margin: 0, lineHeight: 1.5, padding: compact ? '0 4px' : '0 8px' }}>
              💡 {block.footerNote}
            </p>
          )}
        </div>
      );
    }

    case 'image_button_selector': {
      const isMulti = !!block.multiSelect;
      const options = block.options || [];
      const cardBg = block.cardBg || 'transparent';
      const cardBorder = block.cardBorder || '#334155';
      const cardSelectedBg = block.cardSelectedBg || '#6366f120';
      const cardSelectedBorder = block.cardSelectedBorder || '#6366f1';
      const txtColor = block.textColor || defaultText;
      const radius = block.cardRadius ?? 16;
      const cols = block.columns || 2;
      const rows = block.rows || 0; // 0 = automático

      let selections = [];
      if (!compact && typeof window !== 'undefined') {
        try {
           const pStr = sessionStorage.getItem(`quiz_${quizId}_progress`) || '{}';
           const pData = JSON.parse(pStr);
           selections = pData[block.id] || [];
        } catch(e){}
      }

      const isSelected = (id) => selections.includes(id);

      const handleSelect = (opt) => {
        if (compact) return;
        let pData = {};
        try { pData = JSON.parse(sessionStorage.getItem(`quiz_${quizId}_progress`) || '{}'); } catch(e){}

        let current = pData[block.id] || [];
        let newSels = current;

        if (isMulti) {
          if (current.includes(opt.id)) {
            newSels = current.filter(id => id !== opt.id);
          } else {
            newSels = [...current, opt.id];
          }
        } else {
          newSels = [opt.id];
        }

        pData[block.id] = newSels;
        sessionStorage.setItem(`quiz_${quizId}_progress`, JSON.stringify(pData));

        if (!isMulti && onNavigate) {
          const nextId = resolveNextStep(block.nextStep, opt.scoreTarget);
          if (nextId) setTimeout(() => onNavigate(nextId), 300);
        }
      };

      const handleConfirm = () => {
         if (compact) return;
         if (isMulti && onNavigate) {
           const nextId = resolveNextStep(block.nextStep);
           if (nextId) onNavigate(nextId);
         }
      };

      return (
        <div style={{ width: '100%' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: rows > 0 ? `repeat(${rows}, auto)` : undefined,
            gap: compact ? 8 : 16
          }}>
            {options.map((opt) => {
               const sel = isSelected(opt.id);
               return (
                 <div
                   key={opt.id}
                   onClick={() => handleSelect(opt)}
                   style={{
                     cursor: compact ? 'default' : 'pointer',
                     background: sel ? cardSelectedBg : cardBg,
                     border: `2px solid ${sel ? cardSelectedBorder : cardBorder}`,
                     borderRadius: radius,
                     overflow: 'hidden',
                     display: 'flex',
                     flexDirection: 'column',
                     transition: 'all 0.2s',
                   }}
                 >
                   {opt.imageSrc && (
                     <div style={{ width: '100%', aspectRatio: '1/1', background: 'rgba(255,255,255,0.05)' }}>
                       <img src={opt.imageSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                     </div>
                   )}
                   <div style={{ padding: compact ? '8px 4px' : '16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: compact ? 4 : 8, textAlign: 'center' }}>
                     {block.showCheckbox && (
                       <div style={{
                         width: compact ? 12 : 20, height: compact ? 12 : 20, flexShrink: 0,
                         borderRadius: block.checkboxStyle === 'square' ? (compact ? 2 : 4) : '50%',
                         border: `2px solid ${sel ? cardSelectedBorder : cardBorder}`,
                         background: sel ? cardSelectedBorder : 'transparent',
                         display: 'flex', alignItems: 'center', justifyContent: 'center'
                       }}>
                         {sel && <svg width={compact ? 8 : 14} height={compact ? 8 : 14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>}
                       </div>
                     )}
                     <span style={{ color: txtColor, fontSize: compact ? 10 : 14, fontWeight: sel ? 700 : 500, lineHeight: 1.2 }}>
                       {opt.text}
                     </span>
                   </div>
                 </div>
               );
            })}
          </div>
          {isMulti && (
             <div style={{ marginTop: compact ? 12 : 24, display: 'flex', justifyContent: 'center' }}>
               <button
                 onClick={handleConfirm}
                 style={{
                   padding: compact ? '6px 16px' : '12px 32px',
                   borderRadius: 999,
                   background: cardSelectedBorder,
                   color: '#fff',
                   border: 'none',
                   fontSize: compact ? 10 : 15,
                   fontWeight: 700,
                   cursor: 'pointer',
                   opacity: selections.length >= (block.minSelect || 1) ? 1 : 0.5,
                   pointerEvents: selections.length >= (block.minSelect || 1) ? 'auto' : 'none',
                   transition: 'opacity 0.2s'
                 }}
               >
                 Confirmar →
               </button>
             </div>
          )}
        </div>
      );
    }

    case 'price_display': {
      const model = block.model || 'classic';
      const anim = block.animationMode || 'pulse';
      const oldP = block.oldPrice || '';
      const newP = block.newPrice || '';
      const curr = block.currency || 'R$';
      const pref = block.prefix || '';
      const suf = block.suffix || '';
      const sub = block.subtext || '';
      const per = block.period || '';
      const badgeTxt = block.badgeText || '';

      const nColor = block.newPriceColor || '#22c55e';
      const oColor = block.oldPriceColor || '#ef4444';
      const tColor = block.textColor || '#94a3b8';
      const bColor = block.badgeBg || '#ef4444';
      const bg = block.bg || 'transparent';
      const border = block.boxBorder || 'transparent';
      const radius = block.boxRadius ?? 16;
      
      const headerText = block.headerText || '';
      const headerBg = block.headerBg || '#0f172a';
      const headerColor = block.headerColor || '#ffffff';
      const leftText = block.leftText || '';
      const leftTextColor = block.leftTextColor || '#166534';
      const boxRightBg = block.boxRightBg || '#dcfce7';

      const animId = `pdanim_${block.id || Math.random().toString(36).slice(2, 8)}`;
      const hasSpin = block.borderAnimation === 'rotating_gradient';
      const hasPulseBorder = block.borderAnimation === 'pulse_border';
      const borderW = block.borderWidth ?? 1;
      const borderS = block.borderAnimation === 'dashed' ? 'dashed' : 'solid';
      
      const tGap = (block.textGap !== undefined && !isNaN(block.textGap)) ? block.textGap : undefined;
      const tGapOuter = tGap !== undefined ? tGap : (compact ? 12 : 16);
      const tGapInner = tGap !== undefined ? tGap : (compact ? 6 : 8);
      const isZeroGap = tGap === 0;

      let inlineStyle = `
        @keyframes ${animId}_pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @keyframes ${animId}_heartbeat { 0% { transform: scale(1); } 14% { transform: scale(1.08); } 28% { transform: scale(1); } 42% { transform: scale(1.08); } 70%, 100% { transform: scale(1); } }
        @keyframes ${animId}_bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes ${animId}_shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes ${animId}_wiggle { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-3deg); } 75% { transform: rotate(3deg); } }
        @keyframes ${animId}_neon { 0%, 100% { text-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 20px ${nColor}, 0 0 30px ${nColor}; } 50% { text-shadow: 0 0 2px #fff, 0 0 5px #fff, 0 0 10px ${nColor}, 0 0 20px ${nColor}; } }
        @keyframes ${animId}_typewriter { 0%, 10% { clip-path: polygon(0 0, 0 0, 0 100%, 0 100%); } 90%, 100% { clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); } }
        @keyframes ${animId}_gradient_slide { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes ${animId}_spin_border { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes ${animId}_pulse_border { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
        
        @keyframes ${animId}_btn_pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.04); } }
        @keyframes ${animId}_btn_neon { 0%, 100% { box-shadow: 0 0 5px ${block.buttonBg || '#6366f1'}, 0 0 10px ${block.buttonBg || '#6366f1'}; } 50% { box-shadow: 0 0 15px ${block.buttonBg || '#6366f1'}, 0 0 25px ${block.buttonBg || '#6366f1'}; } }
        @keyframes ${animId}_btn_blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0.4; } }
        @keyframes ${animId}_btn_shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        @keyframes ${animId}_btn_heartbeat { 0%, 100% { transform: scale(1); } 14% { transform: scale(1.08); } 28% { transform: scale(1); } 42% { transform: scale(1.08); } 70% { transform: scale(1); } }

        .${animId}_spin_box {
           position: relative;
           overflow: hidden;
           border: ${borderW}px solid transparent !important;
           border-radius: ${radius}px;
           z-index: 1;
        }
        .${animId}_spin_box::before {
           content: '';
           position: absolute;
           top: -50%; left: -50%; width: 200%; height: 200%;
           background: conic-gradient(from 0deg, transparent 60%, ${border !== 'transparent' ? border : '#3b82f6'} 100%);
           animation: ${animId}_spin_border 2.5s linear infinite;
           z-index: -2;
        }
        .${animId}_spin_box::after {
           content: '';
           position: absolute;
           inset: 0;
           background: ${bg !== 'transparent' ? bg : '#0f172a'};
           border-radius: ${Math.max(0, radius - borderW)}px;
           z-index: -1;
        }
      `;
      
      let animStyle = {};
      if (anim === 'pulse') animStyle = { animation: `${animId}_pulse 2s infinite ease-in-out` };
      if (anim === 'heartbeat') animStyle = { animation: `${animId}_heartbeat 1.5s infinite ease-in-out` };
      if (anim === 'bounce') animStyle = { animation: `${animId}_bounce 2s infinite ease-in-out` };
      if (anim === 'wiggle') animStyle = { animation: `${animId}_wiggle 2.5s infinite ease-in-out` };
      if (anim === 'neon') animStyle = { animation: `${animId}_neon 1.5s infinite ease-in-out` };
      if (anim === 'typewriter') animStyle = { animation: `${animId}_typewriter 3s ease-in-out infinite alternate` };

      const isShimmer = anim === 'shimmer';
      const isGradientSlide = anim === 'gradient_slide';

      const SpecialTextSpan = ({ children }) => {
         if (isShimmer) {
             return <span style={{
                    background: `linear-gradient(90deg, ${nColor} 0%, #ffffff 50%, ${nColor} 100%)`,
                    backgroundSize: '200% auto',
                    color: 'transparent',
                    WebkitBackgroundClip: 'text',
                    animation: `${animId}_shimmer 2s infinite linear`
                 }}>{children}</span>;
         }
         if (isGradientSlide) {
             return <span style={{
                    background: `linear-gradient(270deg, ${nColor}, #fbbf24, #10b981, ${nColor})`,
                    backgroundSize: '400% 400%',
                    color: 'transparent',
                    WebkitBackgroundClip: 'text',
                    animation: `${animId}_gradient_slide 4s ease infinite`
                 }}>{children}</span>;
         }
         return children;
      };

      const OldPriceUI = ({ size, strikeSize }) => (
         <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: oColor, opacity: 0.7, textDecoration: 'line-through', textDecorationThickness: strikeSize || 2 }}>
            <span style={{ fontSize: size * 0.7 }}>{curr}</span>
            <span style={{ fontSize: size, fontWeight: 700 }}>{oldP}</span>
         </div>
      );

      const NewPriceUI = ({ size }) => (
         <div style={{ ...animStyle, display: 'flex', alignItems: 'baseline', gap: compact ? 2 : 4, color: (isShimmer || isGradientSlide) ? undefined : nColor, textShadow: isShimmer ? '0 0 10px rgba(255,255,255,0.3)' : 'none' }}>
            <span style={{ fontSize: size * 0.5, fontWeight: 600, color: (isShimmer || isGradientSlide) ? tColor : 'inherit' }}>{curr}</span>
            <span style={{ fontSize: size, fontWeight: 900, lineHeight: 1, letterSpacing: -1 }}>
              <SpecialTextSpan>{newP}</SpecialTextSpan>
            </span>
            {per && <span style={{ fontSize: size * 0.35, fontWeight: 500, color: tColor, opacity: 0.8 }}>{per}</span>}
         </div>
      );

      return (
         <div 
            className={(hasSpin && model !== 'offer_card') ? `${animId}_spin_box` : ''}
            style={
            model === 'offer_card'
            ? { width: '100%', position: 'relative' }
            : {
                width: '100%',
                background: hasSpin ? 'transparent' : bg,
                border: hasSpin ? 'none' : `${borderW}px ${borderS} ${border}`,
                borderRadius: radius,
                padding: `${block.blockPaddingY ?? (compact ? 20 : 32)}px ${block.blockPaddingX ?? (compact ? 15 : 24)}px`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: hasPulseBorder ? '0 0 0 0 rgba(239, 68, 68, 0.4)' : undefined,
                animation: hasPulseBorder ? `${animId}_pulse_border 2s infinite` : undefined
              }
         }>
            <style>{inlineStyle}</style>

            {model === 'classic' && (
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: tGapOuter, position: 'relative', zIndex: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: tGapInner, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {pref && <span style={{ color: tColor, fontSize: compact ? 12 : 16, fontWeight: 500 }}>{pref}</span>}
                    {oldP && <OldPriceUI size={block.oldPriceSize || (compact ? 20 : 26)} strikeSize={2} />}
                    {suf && <span style={{ color: tColor, fontSize: compact ? 12 : 16, fontWeight: 500 }}>{suf}</span>}
                  </div>
                  <div style={{ marginTop: isZeroGap ? 0 : undefined }}>
                     <NewPriceUI size={block.priceSize || (compact ? 48 : 64)} />
                  </div>
               </div>
            )}

            {model === 'badge' && (
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: tGapOuter, position: 'relative', zIndex: 2 }}>
                  {badgeTxt && (
                     <div style={{ background: bColor, color: '#fff', fontSize: compact ? 11 : 14, fontWeight: 800, padding: compact ? '4px 12px' : '6px 16px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: 1 }}>
                        {badgeTxt}
                     </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: tGapInner }}>
                     {pref && <span style={{ color: tColor, fontSize: compact ? 14 : 18, fontWeight: 600 }}>{pref}</span>}
                     {oldP && <OldPriceUI size={block.oldPriceSize || (compact ? 24 : 32)} strikeSize={3} />}
                     {suf && <span style={{ color: tColor, fontSize: compact ? 14 : 18, fontWeight: 600, marginTop: isZeroGap ? 0 : 4 }}>{suf}</span>}
                     <div style={{ marginTop: isZeroGap ? 0 : (compact ? 8 : 12) }}>
                        <NewPriceUI size={block.priceSize || (compact ? 56 : 80)} />
                     </div>
                  </div>
               </div>
            )}

            {model === 'minimalist' && (
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isZeroGap ? 0 : tGapInner, position: 'relative', zIndex: 2 }}>
                  <NewPriceUI size={block.priceSize || (compact ? 64 : 100)} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: tGapInner, marginTop: isZeroGap ? 0 : (compact ? 8 : 12) }}>
                    {pref && <span style={{ color: tColor, fontSize: compact ? 12 : 14, opacity: 0.7, fontWeight: 500 }}>{pref}</span>}
                    {oldP && <OldPriceUI size={block.oldPriceSize || (compact ? 16 : 20)} strikeSize={1} />}
                  </div>
               </div>
            )}

            {model === 'clean_horizontal' && (
               <div style={{ display: 'flex', flexDirection: compact ? 'column' : 'row', alignItems: 'center', justifyContent: 'space-between', gap: compact ? 16 : 24, width: '100%', padding: compact ? '8px' : '0 16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: compact ? 'center' : 'flex-start' }}>
                     {pref && <span style={{ color: tColor, fontSize: compact ? 13 : 16, fontWeight: 500, marginBottom: 4 }}>{pref}</span>}
                     {oldP && <OldPriceUI size={block.oldPriceSize || (compact ? 22 : 28)} strikeSize={2} />}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                     <div style={{ width: 1, height: '50px', background: border, display: compact ? 'none' : 'block' }} />
                     <div style={{ display: 'flex', flexDirection: 'column', alignItems: compact ? 'center' : 'flex-end' }}>
                        {suf && <span style={{ color: tColor, fontSize: compact ? 12 : 14, fontWeight: 500, opacity: 0.8, marginBottom: 4 }}>{suf}</span>}
                        <NewPriceUI size={block.priceSize || (compact ? 50 : 70)} />
                     </div>
                  </div>
               </div>
            )}

            {model === 'premium_stack' && (
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: tGapOuter, padding: compact ? '8px' : '16px', position: 'relative', zIndex: 2 }}>
                  {badgeTxt && (
                     <div style={{ background: bColor, color: '#fff', fontSize: compact ? 10 : 12, fontWeight: 700, padding: '4px 12px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: isZeroGap ? 0 : (compact ? 4 : 8) }}>
                        {badgeTxt}
                     </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: tGapInner }}>
                     {pref && <span style={{ color: tColor, fontSize: compact ? 13 : 15, fontWeight: 500 }}>{pref}</span>}
                     {oldP && <OldPriceUI size={block.oldPriceSize || (compact ? 18 : 24)} strikeSize={2} />}
                     {suf && <span style={{ color: tColor, fontSize: compact ? 13 : 15, fontWeight: 500 }}>{suf}</span>}
                  </div>
                  <div style={{ height: 1, width: '60%', background: border, margin: isZeroGap ? '0' : '8px 0', opacity: 0.5 }} />
                  <NewPriceUI size={block.priceSize || (compact ? 56 : 80)} />
               </div>
            )}

            {model === 'offer_card' && (
               <div style={{ width: '100%', borderRadius: radius, overflow: 'hidden', border: `1px solid ${border}` }}>
                  {headerText && (
                     <div style={{ padding: compact ? '10px 12px' : '14px 24px', background: headerBg, color: headerColor, textAlign: 'center', fontSize: block.headerSize || (compact ? 13 : 16), fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, wordBreak: 'break-word' }}>
                        {headerText}
                     </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'row', background: block.bodyBg || 'transparent', boxSizing: 'border-box', padding: `${block.blockPaddingY ?? (compact ? 8 : 16)}px ${block.blockPaddingX ?? (compact ? 8 : 16)}px`, gap: compact ? '8px' : '16px', alignItems: 'stretch' }}>
                     {/* Esquerda */}
                     {leftText && (
                        <div style={{ flex: '0.8 1 0%', minWidth: 0, padding: compact ? '4px' : '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                           <span style={{ color: leftTextColor, fontSize: block.leftTextSize || (compact ? 15 : 22), fontWeight: 800, lineHeight: 1.15, wordBreak: 'break-word' }}>{leftText}</span>
                        </div>
                     )}
                     {/* Direita */}
                     <div style={{ background: boxRightBg, borderRadius: radius, padding: `${block.blockPaddingY ?? (compact ? 8 : 16)}px ${block.blockPaddingX ?? (compact ? 10 : 20)}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flex: '1.8 1 0%', minWidth: 0, boxSizing: 'border-box', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 4 : 6, opacity: 0.8, flexWrap: 'wrap', justifyContent: 'center' }}>
                           {pref && <span style={{ color: tColor, fontSize: block.labelSize || (compact ? 11 : 14), fontWeight: 500, whiteSpace: 'nowrap' }}>{pref}</span>}
                           {oldP && <OldPriceUI size={block.oldPriceSize || (compact ? 14 : 20)} strikeSize={2} />}
                           {suf && <span style={{ color: tColor, fontSize: block.labelSize || (compact ? 11 : 14), fontWeight: 500, textAlign: 'center' }}>{suf}</span>}
                        </div>
                        <div style={{ marginTop: compact ? 4 : 10 }}>
                           <NewPriceUI size={block.priceSize || (compact ? 34 : 56)} />
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {sub && sub.trim() && model !== 'clean_horizontal' && model !== 'premium_stack' && model !== 'offer_card' && (
               <div style={{ marginTop: tGapOuter, padding: compact ? '8px 16px' : '12px 24px', background: 'rgba(255,255,255,0.05)', borderRadius: 12, color: tColor, fontSize: compact ? 11 : 14, fontWeight: 500, textAlign: 'center', maxWidth: '90%', zIndex: 2, position: 'relative' }}>
                  {sub.trim()}
               </div>
            )}
            
            {sub && sub.trim() && (model === 'clean_horizontal' || model === 'premium_stack') && (
               <div style={{ marginTop: tGapOuter, color: tColor, fontSize: compact ? 12 : 14, fontWeight: 500, textAlign: 'center', position: 'relative', zIndex: 2 }}>
                  {sub.trim()}
               </div>
            )}

            {!!block.showButton && (() => {
               const btnRadius = block.buttonRadius ?? 14;
               const bgStyleMode = block.buttonStyle || 'solid';
               const animName = block.buttonAnimation || 'none';
               
               let glassStyle = { background: block.buttonBg || '#6366f1', border: 'none', boxShadow: `0 4px 14px ${(block.buttonBg || '#6366f1')}40` };
               if (bgStyleMode === 'glass') {
                 glassStyle = { background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.25)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' };
               } else if (bgStyleMode === 'border_only') {
                 glassStyle = { background: 'transparent', border: `2px solid ${block.buttonBg || '#6366f1'}`, boxShadow: 'none' };
               }
               
               return (
                 <button
                    onClick={(e) => {
                       e.stopPropagation();
                       if (block.buttonActionType === 'url' && block.buttonUrl) {
                          window.open(block.buttonUrl, '_blank');
                       } else if (onNavigate && block.nextStep) {
                          onNavigate(block.nextStep);
                       }
                    }}
                    style={{
                       marginTop: tGapOuter,
                       width: '100%',
                       padding: compact ? '12px' : '16px',
                       color: block.buttonTextColor || '#ffffff',
                       borderRadius: btnRadius,
                       fontWeight: 700,
                       fontSize: compact ? 14 : 16,
                       display: 'flex',
                       alignItems: 'center',
                       justifyContent: 'center',
                       gap: 8,
                       cursor: 'pointer',
                       position: 'relative',
                       zIndex: 2,
                       transition: 'transform 0.1s',
                       animation: animName !== 'none' ? `${animId}_btn_${animName} 1.5s infinite` : 'none',
                       ...glassStyle
                    }}
                 >
                    {block.buttonEmoji && <span>{block.buttonEmoji}</span>}
                    {block.buttonText || 'Garantir Oferta'}
                 </button>
               );
            })()}
         </div>
      );
    }

    case 'faq': {
      const items = block.items || [];
      const [openItems, setOpenItems] = React.useState({});

      const toggleItem = (id) => {
         setOpenItems(prev => ({ ...prev, [id]: !prev[id] }));
      };

      const qColor = block.qColor || '#1e293b';
      const qSize = block.qSize ?? 14;
      const qWeight = block.qWeight ?? 600;
      const aColor = block.aColor || '#64748b';
      const aSize = block.aSize ?? 13;
      const aWeight = block.aWeight ?? 400;
      const dividerColor = block.dividerColor || '#e2e8f0';
      const dividerThickness = block.dividerThickness ?? 1;
      const iconType = block.iconType || 'chevron';
      const iconColor = block.iconColor || '#cbd5e1';
      const bg = block.bg || 'transparent';
      const boxRadius = block.boxRadius ?? 0;
      const boxPadding = block.boxPadding ?? 16;

      return (
        <div style={{
          width: '100%',
          background: bg,
          borderRadius: boxRadius,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {items.map((item, idx) => {
            const isOpen = !!openItems[item.id];
            const isLast = idx === items.length - 1;
            return (
              <div key={item.id} style={{
                borderBottom: isLast ? 'none' : `${dividerThickness}px solid ${dividerColor}`,
                width: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <button
                  onClick={() => toggleItem(item.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: compact ? `${boxPadding - 4}px 0px` : `${boxPadding}px 0px`,
                    cursor: 'pointer',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ color: qColor, fontSize: compact ? qSize - 2 : qSize, fontWeight: qWeight, paddingRight: 16 }}>{item.question || ''}</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconColor }}>
                     {iconType === 'chevron' ? (
                       <svg width={compact ? 18 : 20} height={compact ? 18 : 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}>
                         <polyline points="15 18 9 12 15 6"></polyline>
                       </svg>
                     ) : (
                       isOpen ? (
                         <svg width={compact ? 18 : 20} height={compact ? 18 : 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                           <line x1="5" y1="12" x2="19" y2="12"></line>
                         </svg>
                       ) : (
                         <svg width={compact ? 18 : 20} height={compact ? 18 : 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                           <line x1="12" y1="5" x2="12" y2="19"></line>
                           <line x1="5" y1="12" x2="19" y2="12"></line>
                         </svg>
                       )
                     )}
                  </div>
                </button>
                {isOpen && (
                   <div style={{ 
                     padding: compact ? `0 0 ${boxPadding - 4}px 0` : `0 0 ${boxPadding}px 0`, 
                     color: aColor, 
                     fontSize: compact ? aSize - 2 : aSize, 
                     fontWeight: aWeight,
                     lineHeight: 1.5 
                   }}>
                      {item.answer || ''}
                   </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    case 'animated_metrics': {
      const [animationProgress, setAnimationProgress] = React.useState(0);
      
      React.useEffect(() => {
        let frame;
        let start;
        const duration = 2000;
        const animate = (timestamp) => {
          if (!start) start = timestamp;
          const progress = Math.min((timestamp - start) / duration, 1);
          const easeProgress = 1 - Math.pow(1 - progress, 3);
          setAnimationProgress(easeProgress);
          if (progress < 1) {
            frame = requestAnimationFrame(animate);
          }
        };
        frame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frame);
      }, []);

      const metrics = block.metrics || [];
      const mode = block.mode || 'donut';
      const radius = block.boxRadius ?? 16;
      const isDonut = mode === 'donut';
      
      if (mode === 'versus') {
        return (
          <div style={{
            width: '100%',
            background: block.boxBg || 'transparent',
            border: `1px solid ${block.boxBorder || 'transparent'}`,
            borderRadius: radius,
            padding: compact ? '16px' : '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: compact ? 12 : 24
          }}>
            {metrics.map((m, idx) => {
              const lTarget = m.value || 0;
              const rTarget = m.rightValue ?? 100;
              const lVal = Math.round(lTarget * animationProgress);
              const rVal = Math.round(rTarget * animationProgress);
              const lFillTarget = m.leftFill ?? 20;
              const rFillTarget = m.rightFill ?? 100;
              const lFillVal = lFillTarget * animationProgress;
              const rFillVal = rFillTarget * animationProgress;

              return (
                <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: compact ? 12 : 24, paddingBottom: compact ? 12 : 24, borderBottom: idx === metrics.length - 1 ? 'none' : '1px solid rgba(148,163,184,0.1)' }}>
                  {/* Lado Esquerdo */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 4 : 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', minHeight: compact ? 28 : 40 }}>
                      <span style={{ color: defaultText, fontSize: compact ? 11 : 14, fontWeight: 600, lineHeight: 1.2, paddingRight: 8 }}>{m.text || 'Renda incerta'}</span>
                      <span style={{ color: defaultText, fontSize: compact ? 10 : 12, opacity: 0.5 }}>{lVal}%</span>
                    </div>
                    <div style={{ width: '100%', height: compact ? 12 : 16, position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <div style={{ position: 'absolute', width: '100%', borderBottom: `4px dashed rgba(148,163,184,0.3)` }} />
                      <div style={{ position: 'absolute', width: `${lFillVal}%`, borderBottom: `4px dashed ${m.bgColor || '#ef4444'}`, transition: 'width 0.1s linear' }} />
                      <div style={{ position: 'absolute', left: `max(0px, calc(${lFillVal}% - ${compact ? 6 : 8}px))`, width: compact ? 12 : 16, height: compact ? 12 : 16, background: '#fff', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', transition: 'left 0.1s linear' }} />
                    </div>
                  </div>
                  {/* Lado Direito */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 4 : 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', minHeight: compact ? 28 : 40 }}>
                      <span style={{ color: defaultText, fontSize: compact ? 11 : 14, fontWeight: 600, lineHeight: 1.2, paddingRight: 8 }}>{m.rightText || 'Faturando alto'}</span>
                      <span style={{ color: defaultText, fontSize: compact ? 10 : 12, opacity: 0.5 }}>{rVal}%</span>
                    </div>
                    <div style={{ width: '100%', height: compact ? 12 : 16, position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <div style={{ position: 'absolute', width: '100%', borderBottom: `4px dashed rgba(148,163,184,0.3)` }} />
                      <div style={{ position: 'absolute', width: `${rFillVal}%`, borderBottom: `4px dashed ${m.rightBgColor || '#22c55e'}`, transition: 'width 0.1s linear' }} />
                      <div style={{ position: 'absolute', left: `max(0px, calc(${rFillVal}% - ${compact ? 6 : 8}px))`, width: compact ? 12 : 16, height: compact ? 12 : 16, background: '#fff', borderRadius: '50%', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', transition: 'left 0.1s linear' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      }

      if (mode === 'area') {
        const sVal = block.areaStartValue ?? 0;
        const eVal = block.areaEndValue ?? 100;
        const waypoints = block.areaWaypoints || [];

        // Build full point list: [start, ...waypoints, end]
        const allPoints = [
          { value: sVal, label: block.areaStartLabel || 'HOJE', sub: block.areaStartSub || '', color: block.areaStartColor || '#ef4444' },
          ...waypoints,
          { value: eVal, label: block.areaEndLabel || '30 DIAS', sub: block.areaEndSub || '', color: block.areaEndColor || '#22c55e' },
        ];
        const N = allPoints.length;

        const h = compact ? 150 : 250;
        const yLabelsStr = block.areaYAxisLabels || '100, 75, 50, 25, 0';
        const yLabelsRaw = yLabelsStr.split(',').map(s => s.trim()).filter(Boolean);
        const yLabels = yLabelsRaw.length ? yLabelsRaw : ['100', '75', '50', '25', '0'];
        const numLabels = yLabels.length;
        const txtColor = block.areaTextColor || defaultText;
        const gridColor = block.areaGridColor || 'rgba(148,163,184,0.3)';

        // Build SVG polygon points (0 to 100 coordinate space)
        // For the animated clip (reveal left to right), we use clipPath
        const svgPoints = allPoints.map((pt, i) => {
          const x = N === 1 ? 0 : (i / (N - 1)) * 100;
          const y = 100 - (pt.value ?? 0);
          return `${x},${y}`;
        });
        const areaPoints = [
          `0,100`,
          ...svgPoints,
          `100,100`
        ].join(' ');
        const linePoints = svgPoints.join(' ');

        // Animated endpoint (last animated dot tracks animationProgress)
        const progressX = animationProgress * 100; // 0-100
        // Find which segment the current progress is in
        const progressSegIdx = N <= 1 ? 0 : Math.min(Math.floor(animationProgress * (N - 1)), N - 2);
        const segProgress = N <= 1 ? animationProgress : (animationProgress * (N - 1)) - progressSegIdx;
        const pA = allPoints[progressSegIdx];
        const pB = allPoints[Math.min(progressSegIdx + 1, N - 1)];
        const liveY = (pA?.value ?? 0) + ((pB?.value ?? 0) - (pA?.value ?? 0)) * segProgress;

        const gradId = `grad_${block.id}`;

        return (
          <div style={{
            width: '100%',
            background: block.boxBg || 'transparent',
            border: `1px solid ${block.boxBorder || 'transparent'}`,
            borderRadius: radius,
            padding: compact ? '20px 10px' : '30px 20px',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{ width: '100%', height: h, position: 'relative', display: 'flex' }}>
              {/* Eixo Y */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingRight: 8, borderRight: `1px dashed ${gridColor}` }}>
                {yLabels.map((lbl, idx) => (
                  <span key={idx} style={{ fontSize: compact ? 9 : 12, color: txtColor, opacity: 0.6 }}>{lbl}</span>
                ))}
              </div>

              {/* Gráfico SVG */}
              <div style={{ flex: 1, position: 'relative', borderBottom: `1px dashed ${gridColor}` }}>
                {/* Linhas horizontais da grade */}
                {yLabels.map((_, idx) => {
                  const perc = (numLabels <= 1) ? 0 : 100 - (idx * 100 / (numLabels - 1));
                  return <div key={idx} style={{ position: 'absolute', left: 0, right: 0, bottom: `${perc}%`, borderBottom: `1px dashed ${gridColor}`, opacity: 0.5 }} />;
                })}

                <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100"
                  style={{ position: 'absolute', inset: 0, clipPath: `inset(0 ${100 - (animationProgress * 100)}% 0 0)` }}>
                  <defs>
                    <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={block.areaStartColor || '#ef4444'} stopOpacity="0.8" />
                      <stop offset="100%" stopColor={block.areaEndColor || '#22c55e'} stopOpacity="0.8" />
                    </linearGradient>
                  </defs>
                  {/* Área preenchida */}
                  <polygon points={areaPoints} fill={`url(#${gradId})`} />
                  {/* Linha de cima */}
                  <polyline points={linePoints} fill="none" stroke={block.areaEndColor || '#22c55e'} strokeWidth="1.5" />
                </svg>

                {/* Dots e labels para cada ponto — skip if showDot===false (invisible waypoint) */}
                {allPoints.map((pt, i) => {
                  if (pt.showDot === false) return null;
                  const xPct = N === 1 ? 0 : (i / (N - 1)) * 100;
                  const yPct = pt.value ?? 0;
                  const isFirst = i === 0;
                  const isLast = i === N - 1;
                  const dotColor = pt.color || (isLast ? (block.areaEndColor || '#22c55e') : (block.areaStartColor || '#ef4444'));
                  return (
                    <div key={i} style={{
                      position: 'absolute',
                      bottom: `${yPct}%`,
                      left: `${xPct}%`,
                      transform: 'translate(-50%, 50%)',
                      width: compact ? 10 : 14,
                      height: compact ? 10 : 14,
                      background: dotColor,
                      borderRadius: '50%',
                      boxShadow: '0 0 0 3px rgba(255,255,255,0.8)',
                      zIndex: 10,
                    }}>
                      {/* Label topo */}
                      {pt.label && (
                        <div style={{
                          position: 'absolute',
                          top: -28,
                          left: isLast ? 'auto' : '50%',
                          right: isLast ? 0 : 'auto',
                          transform: isFirst ? 'translateX(-10%)' : isLast ? 'none' : 'translateX(-50%)',
                          background: '#fff',
                          padding: '2px 5px',
                          borderRadius: 4,
                          border: '1px solid #e2e8f0',
                          fontSize: compact ? 7 : 9,
                          color: '#334155',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                        }}>
                          {pt.label}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Dot animado que corre ao longo da linha */}
                <div style={{
                  position: 'absolute',
                  bottom: `${liveY}%`,
                  left: `${progressX}%`,
                  transform: 'translate(-50%, 50%)',
                  width: compact ? 14 : 18,
                  height: compact ? 14 : 18,
                  background: block.areaEndColor || '#22c55e',
                  borderRadius: '50%',
                  boxShadow: '0 0 0 4px rgba(255,255,255,0.9)',
                  zIndex: 20,
                  transition: 'all 0.05s linear',
                  opacity: animationProgress > 0 && animationProgress < 1 ? 1 : 0
                }} />
              </div>
            </div>

            {/* Eixo X labels (embaixo) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingLeft: compact ? 24 : 32 }}>
              {allPoints.map((pt, i) => pt.sub ? (
                <span key={i} style={{ fontSize: compact ? 8 : 10, color: txtColor, opacity: 0.6, textAlign: 'center', flex: 1 }}>{pt.sub}</span>
              ) : null)}
            </div>
          </div>
        );
      }

      return (
        <div style={{
          width: '100%',
          background: block.boxBg || 'transparent',
          border: `1px solid ${block.boxBorder || 'transparent'}`,
          borderRadius: radius,
          padding: compact ? 10 : 20,
          display: 'grid',
          gridTemplateColumns: `repeat(${metrics.length || 1}, minmax(0, 1fr))`,
          gap: compact ? 8 : 20,
          alignItems: 'end'
        }}>
          {metrics.map(m => {
             const targetVal = m.value || 0;
             const currentVal = Math.round(targetVal * animationProgress);
             
             if (isDonut) {
               const size = compact ? 60 : 120;
               const strokeWidth = compact ? 6 : 12;
               const r = (size - strokeWidth) / 2;
               const c = Math.PI * (r * 2);
               const pct = ((100 - currentVal) / 100) * c;
               
               return (
                 <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: compact ? 6 : 12 }}>
                   <div style={{ position: 'relative', width: size, height: size }}>
                     <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                       <circle cx={size/2} cy={size/2} r={r} fill="transparent" stroke={m.bgColor || '#334155'} strokeWidth={strokeWidth} />
                       <circle cx={size/2} cy={size/2} r={r} fill="transparent" stroke={m.color || '#ef4444'} strokeWidth={strokeWidth} strokeDasharray={c} strokeDashoffset={pct} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.1s linear' }} />
                     </svg>
                     <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <span style={{ color: defaultText, fontSize: compact ? 12 : 24, fontWeight: 800 }}>{currentVal}%</span>
                     </div>
                   </div>
                   {m.text && (
                     <p style={{ margin: 0, color: m.textColor || defaultText, fontSize: compact ? 8 : 13, textAlign: 'center', lineHeight: 1.3, fontWeight: 500 }}>
                       {m.text}
                     </p>
                   )}
                 </div>
               );
             } else {
               const height = compact ? 80 : 160;
               return (
                 <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: compact ? 6 : 12, height: '100%', justifyContent: 'flex-end' }}>
                   <span style={{ color: defaultText, fontSize: compact ? 11 : 20, fontWeight: 800 }}>{currentVal}%</span>
                   <div style={{ width: compact ? 24 : 48, height, background: m.bgColor || '#334155', borderRadius: compact ? 6 : 12, overflow: 'hidden', position: 'relative' }}>
                     <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${currentVal}%`, background: m.color || '#ef4444', transition: 'height 0.1s linear' }} />
                   </div>
                   {m.text && (
                     <p style={{ margin: 0, color: m.textColor || defaultText, fontSize: compact ? 8 : 13, textAlign: 'center', lineHeight: 1.3, fontWeight: 500 }}>
                       {m.text}
                     </p>
                   )}
                 </div>
               );
             }
          })}
        </div>
      );
    }

    case 'image_carousel': {
      const images = block.images || [];
      const hasImages = images.some(img => img.url);

      const [currentIndex, setCurrentIndex] = React.useState(0);
      const isAuto = !!block.autoplay;
      const speed = block.autoplaySpeed || 3000;

      React.useEffect(() => {
        if (!isAuto || !hasImages || compact) return;
        const iv = setInterval(() => {
          setCurrentIndex(prev => (prev + 1) % images.length);
        }, speed);
        return () => clearInterval(iv);
      }, [isAuto, speed, compact, images.length, hasImages]);

      const handlePrev = (e) => {
        e.stopPropagation();
        setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
      };

      const handleNext = (e) => {
        e.stopPropagation();
        setCurrentIndex(prev => (prev + 1) % images.length);
      };

      if (!hasImages) {
         return (
           <div style={{ width: '100%', padding: compact ? '20px 0' : '40px 0', border: '1px dashed #475569', borderRadius: block.borderRadius ?? 16, textAlign: 'center' }}>
             <span style={{ color: '#94a3b8', fontSize: compact ? 10 : 14 }}>Carrossel vazio (Adicione imagens)</span>
           </div>
         );
      }

      const aspectRatioMap = {
        '16/9': 9 / 16,
        '4/3': 3 / 4,
        '1/1': 1
      };
      
      const ratio = block.aspectRatio || '16/9';
      const containerStyle = {
        position: 'relative',
        width: '100%',
        borderRadius: block.borderRadius ?? 16,
        overflow: 'hidden',
        backgroundColor: '#000',
      };

      if (ratio !== 'auto') {
         containerStyle.paddingTop = `${aspectRatioMap[ratio] * 100}%`;
      }

      const currentImage = images[currentIndex] || {};

      return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: compact ? 12 : 20 }}>
          {(currentImage.title || currentImage.text) && (
            <div style={{ textAlign: block.textAlign || 'center', padding: '0 8px', animation: 'fadeIn 0.3s ease-in-out' }}>
              {currentImage.title && (
                <div style={{
                  color: block.titleColor || '#ffffff',
                  fontSize: compact ? Math.max(16, Math.round((block.titleSize || 24) * 0.7)) : (block.titleSize || 24),
                  fontWeight: block.titleWeight === 'normal' ? 400 : block.titleWeight === 'semibold' ? 600 : block.titleWeight === 'extrabold' ? 900 : 700,
                  marginBottom: currentImage.text ? (compact ? 4 : 8) : 0,
                  lineHeight: 1.2,
                }}>
                  {currentImage.title}
                </div>
              )}
              {currentImage.text && (
                <div style={{
                  color: block.textColor || '#cbd5e1',
                  fontSize: compact ? Math.max(12, Math.round((block.textSize || 16) * 0.8)) : (block.textSize || 16),
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap'
                }}>
                  {currentImage.text}
                </div>
              )}
            </div>
          )}
          <div style={containerStyle}>
            {ratio !== 'auto' ? (
              <img
                src={images[currentIndex]?.url}
                alt=""
                style={{
                  position: 'absolute',
                  top: 0, left: 0, width: '100%', height: '100%',
                  objectFit: block.objectFit || 'cover',
                  transition: 'opacity 0.3s ease-in-out'
                }}
              />
            ) : (
              <img
                src={images[currentIndex]?.url}
                alt=""
                style={{
                  width: '100%',
                  display: 'block',
                  transition: 'opacity 0.3s ease-in-out'
                }}
              />
            )}
            
            {block.showArrows && images.length > 1 && (
              <>
                <button
                  onClick={handlePrev}
                  style={{
                    position: 'absolute', left: compact ? 4 : 12, top: '50%', transform: 'translateY(-50%)',
                    width: compact ? 24 : 40, height: compact ? 24 : 40, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10
                  }}>
                  <svg width={compact ? 12 : 20} height={compact ? 12 : 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                </button>
                <button
                  onClick={handleNext}
                  style={{
                    position: 'absolute', right: compact ? 4 : 12, top: '50%', transform: 'translateY(-50%)',
                    width: compact ? 24 : 40, height: compact ? 24 : 40, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10
                  }}>
                  <svg width={compact ? 12 : 20} height={compact ? 12 : 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
              </>
            )}

            {block.showDots && images.length > 1 && (
              <div style={{ position: 'absolute', bottom: compact ? 6 : 16, width: '100%', display: 'flex', justifyContent: 'center', gap: compact ? 4 : 8, zIndex: 10 }}>
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
                    style={{
                      width: compact ? 6 : 10, height: compact ? 6 : 10, borderRadius: '50%', padding: 0,
                      background: currentIndex === i ? '#fff' : 'rgba(255,255,255,0.4)',
                      border: 'none', cursor: 'pointer', transition: 'background 0.2s'
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    case 'animated_text_carousel': {
      const items = block.items || [];
      const [currentIndex, setCurrentIndex] = React.useState(0);
      const [phase, setPhase] = React.useState('in'); // 'in', 'view', 'out'
      const transitionSpeed = block.transitionSpeed || 0.5;

      React.useEffect(() => {
        if (!items.length) return;
        let timer;
        if (phase === 'in') {
           timer = setTimeout(() => setPhase('view'), transitionSpeed * 1000);
        } else if (phase === 'view') {
           const duration = (items[currentIndex]?.duration || 3) * 1000;
           timer = setTimeout(() => setPhase('out'), duration);
        } else if (phase === 'out') {
           timer = setTimeout(() => {
             if (currentIndex < items.length - 1) {
               setCurrentIndex(prev => prev + 1);
               setPhase('in');
             } else if (block.loop) {
               setCurrentIndex(0);
               setPhase('in');
             }
           }, transitionSpeed * 1000);
        }
        return () => clearTimeout(timer);
      }, [phase, currentIndex, items, block.loop, transitionSpeed]);

      if (!items.length) {
         return (
           <div style={{ width: '100%', padding: compact ? '20px 0' : '40px 0', border: '1px dashed #475569', borderRadius: 16, textAlign: 'center' }}>
             <span style={{ color: '#94a3b8', fontSize: compact ? 10 : 14 }}>Carrossel vazio (Adicione textos)</span>
           </div>
         );
      }

      const getAnimationKeyframes = () => `
        @keyframes customFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes customFadeOut { from { opacity: 1; } to { opacity: 0; } }

        @keyframes slideInLeft { from { opacity: 0; transform: translateX(-50px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideOutLeft { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(-50px); } }

        @keyframes slideInRight { from { opacity: 0; transform: translateX(50px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideOutRight { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(50px); } }

        @keyframes slideInUp { from { opacity: 0; transform: translateY(50px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideOutUp { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-50px); } }

        @keyframes slideInDown { from { opacity: 0; transform: translateY(-50px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideOutDown { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(50px); } }

        @keyframes zoomInEffect { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        @keyframes zoomOutEffect { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(1.2); } }
      `;

      const animInName = block.animationIn === 'slideInLeft' ? 'slideInLeft' :
                         block.animationIn === 'slideInRight' ? 'slideInRight' :
                         block.animationIn === 'slideInUp' ? 'slideInUp' :
                         block.animationIn === 'slideInDown' ? 'slideInDown' :
                         block.animationIn === 'zoomIn' ? 'zoomInEffect' : 'customFadeIn';

      const animOutName = block.animationOut === 'slideOutLeft' ? 'slideOutLeft' :
                          block.animationOut === 'slideOutRight' ? 'slideOutRight' :
                          block.animationOut === 'slideOutUp' ? 'slideOutUp' :
                          block.animationOut === 'slideOutDown' ? 'slideOutDown' :
                          block.animationOut === 'zoomOut' ? 'zoomOutEffect' : 'customFadeOut';

      const animationValue = phase === 'in' 
          ? `${animInName} ${transitionSpeed}s forwards`
          : phase === 'out' ? `${animOutName} ${transitionSpeed}s forwards`
          : 'none';

      const sizeMap = {
        sm: compact ? 10 : 14,
        base: compact ? 12 : 18,
        lg: compact ? 16 : 24,
        xl: compact ? 20 : 32,
        '2xl': compact ? 24 : 48,
        '3xl': compact ? 30 : 64,
      };

      const currentText = items[currentIndex]?.text || '';

      // Animação da barra de progresso (diminui da largura total para zero)
      const currentDuration = items[currentIndex]?.duration || 3;

      return (
        <div style={{ width: '100%', position: 'relative' }}>
          <style>{getAnimationKeyframes()}</style>
          <style>{`@keyframes atcShrink_${block.id}{from{width:100%}to{width:0%}}`}</style>

          {/* O key garante que o React recria o div a cada mudança de fase/item, acionando a animação */}
          <div
            key={`atc_${currentIndex}_${phase}`}
            style={{ 
              width: '100%', 
              minHeight: compact ? 40 : 80,
              display: 'flex', 
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: block.textAlign === 'left' ? 'flex-start' : block.textAlign === 'right' ? 'flex-end' : 'center',
              textAlign: block.textAlign || 'center',
              overflow: 'hidden',
              background: block.bgColor || 'transparent',
              borderRadius: compact ? Math.round((block.bgRadius || 0) * 0.7) : (block.bgRadius || 0),
              padding: compact ? Math.round((block.bgPadding || 0) * 0.7) : (block.bgPadding || 0),
              position: 'relative',
              // Animação engloba TODO o bloco (fundo + texto)
              animation: phase === 'in'
                ? `${animInName} ${transitionSpeed}s ease forwards`
                : phase === 'out'
                ? `${animOutName} ${transitionSpeed}s ease forwards`
                : 'none',
            }}
          >
            <span style={{ 
              color: block.textColor || '#ffffff', 
              fontSize: sizeMap[block.textSize] || sizeMap['lg'],
              fontWeight: block.bold ? 800 : 400,
              fontFamily: block.fontFamily || 'inherit',
              whiteSpace: 'pre-wrap',
              display: 'block',
              width: '100%',
            }}>
              {currentText}
            </span>

            {/* Barra de Delay — aparece logo após a entrada, encolhe durante o tempo de exibição */}
            {block.showProgressBar && phase !== 'out' && (
              <div
                key={`bar_${currentIndex}`}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: '100%',
                  height: compact ? Math.max(2, (block.progressBarHeight || 4) * 0.7) : (block.progressBarHeight || 4),
                  background: block.progressBarColor || '#6366f1',
                  // Delay = tempo de entrada; duração = tempo de exibição do texto
                  animation: `atcShrink_${block.id} ${(items[currentIndex]?.duration || 3)}s linear ${transitionSpeed}s forwards`,
                  zIndex: 2,
                }}
              />
            )}
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}
