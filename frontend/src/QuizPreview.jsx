import React, { useState, useRef, useEffect } from 'react';
import { Emoji } from 'emoji-picker-react';
import { customList } from 'country-codes-list';
import 'flag-icons/css/flag-icons.min.css';

function getFlagEmoji(countryCode) {
  if (!countryCode) return '';
  const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

const countryDialCodes = customList('countryCode', '{countryCallingCode}');
const countryChoices = Object.keys(countryDialCodes).map(code => ({
  code,
  dial: `+${countryDialCodes[code]}`,
  emoji: getFlagEmoji(code)
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
    pingTelemetry(duration);
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

  const ar       = block.aspectRatio || '16/9';
  const radius   = block.rounded ? (compact?10:16) : 0;
  const src      = block.src || '';
  const isYT     = src.includes('youtube') || src.includes('youtu.be');
  const isVimeo  = src.includes('vimeo');
  const isEmbed  = isYT || isVimeo;

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

  // Embedded Result Array delay logic
  useEffect(() => {
    if (!block.showResultConfig) { setResVisible(false); return; }
    // In compact (editor preview) mode: always show so creator can see/edit the result screen
    if (compact) { setResVisible(true); return; }
    if (!hasStarted) { setResVisible(false); return; }
    
    const delay = block.resDelay || 'none';
    if (delay === 'none') { setResVisible(true); return; }
    if (delay === 'on_end') { setResVisible(ended); return; }
    if (delay === 'custom') {
      const secs = block.resDelaySeconds || 0;
      if (currentTime >= secs) { setResVisible(true); }
    }
  }, [block.showResultConfig, block.resDelay, block.resDelaySeconds, ended, currentTime, hasStarted, compact]);

  // Sync to QuizPreview context
  useEffect(() => {
    if (block.setMediaState) {
      block.setMediaState({ hasStarted, currentTime, ended });
    }
  }, [hasStarted, currentTime, ended, block.setMediaState]);

  // The overlay is shown when: video is configured as autoplay+muted AND user hasn't unmuted yet
  const [userUnmuted, setUserUnmuted] = useState(false);
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
    v.muted = true;
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
  // Usa o useEffect para disparar trackTime e alimentar o backend de analytics
  useEffect(() => {
    if (!isEmbed || !playing) return;
    // O activeDuration só é derivado depois, então pegamos direto daqui.
    const dur = block.fakeDuration || 120;
    
    const interval = setInterval(() => {
      setCurrentTime(prev => {
        const next = prev + 1;
        // Envia o pixel de retenção a cada segundo para gráficos Panda/Vimeo
        trackTime(next, dur);
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isEmbed, playing, block.fakeDuration, trackTime]);

  // Se for embed, usamos fakeDuration ou 120s como fallback para não quebrar a barra
  const activeDuration = isEmbed ? (block.fakeDuration || 120) : duration;

  const progress = activeDuration > 0 ? currentTime / activeDuration : 0;
  const displayDuration = block.useFakeDuration ? (block.fakeDuration || 120) : activeDuration;
  const displayCurrentTime = block.useFakeDuration ? (progress * displayDuration) : currentTime;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: compact ? 8 : 16 }}>
      {/* Container do video em si mantendo o border radius original */}
      <div style={{ width:'100%', borderRadius:radius, overflow:'hidden', position:'relative', background:'#000', boxShadow: compact?'none':'0 8px 40px rgba(0,0,0,0.6)' }}>
        <style>{`
        @keyframes vslMutePulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }
        @keyframes vslMuteBlink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @keyframes vslRipple    { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(2.6);opacity:0} }
      `}</style>
      {/* Vídeo com aspect ratio */}
      <div style={{ width:'100%', aspectRatio:ar, position:'relative', background:'#0a0a0a', overflow:'hidden', cursor: src ? 'pointer' : 'default' }}
           onClick={togglePlay}>

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
            style={{ position:'absolute', inset:0, width:'100%', height:'100%', border:'none', pointerEvents: isControlsHidden ? 'none' : 'auto' }}
            allow="autoplay; fullscreen" allowFullScreen />
        )}

        {/* MP4/base64 nativo — sem controles nativos nunca */}
        {src && !isEmbed && (
          <video
            ref={videoRef}
            src={src}
            style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', pointerEvents:'none' }}
            loop={block.loop}
            playsInline
            disablePictureInPicture
            onCanPlay={handleCanPlay}
            onTimeUpdate={e => {
              setCurrentTime(e.target.currentTime);
              trackTime(e.target.currentTime, e.target.duration);
            }}
            onLoadedMetadata={e => setDuration(e.target.duration)}
            onEnded={() => { setPlaying(false); setEnded(true); triggerFinalPing(videoRef.current?.duration); }}
          />
        )}

        {/* Thumbnail overlay (agora funciona também em embed!) */}
        {src && block.thumbnailSrc && showThumb && (
          <div style={{ position:'absolute', inset:0, background:`url(${block.thumbnailSrc}) center/cover`, pointerEvents:'none', zIndex:4 }} />
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
              background: block.muteBgColor || 'rgba(0,0,0,0.6)',
              backdropFilter:'blur(8px)',
              border:'1px solid rgba(255,255,255,0.2)',
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
            <div style={{ width:compact?40:68, height:compact?40:68, borderRadius:'50%', background:'rgba(0,0,0,0.65)', backdropFilter:'blur(8px)', border:'2px solid rgba(255,255,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 30px rgba(255,255,255,0.15)' }}>
              <svg width={compact?16:28} height={compact?16:28} viewBox="0 0 24 24" fill="white">
                <polygon points="5,3 19,12 5,21"/>
              </svg>
            </div>
          </div>
        )}

        {/* Timer VSL (fake duration se ativado)
            Mostra mesmo sem o vídeo tocar, usando fakeDuration como fallback */}
        {block.showTimer !== false && src && (activeDuration > 0 || block.useFakeDuration) && (
          <div style={{ position:'absolute', bottom:compact?6:10, right:compact?6:10, background:'rgba(0,0,0,0.75)', borderRadius:4, padding:compact?'2px 5px':'3px 8px', fontSize:compact?8:11, color:'#fff', fontFamily:'monospace', zIndex:6 }}>
            {fmt(displayCurrentTime)} / {fmt(displayDuration)}
          </div>
        )}

        {/* Barra de progresso VSL customizada — mostra mesmo antes do vídeo tocar */}
        {src && isControlsHidden && (activeDuration > 0 || block.useFakeDuration) && (
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:compact?2:3, background:'rgba(255,255,255,0.15)', zIndex:6 }}>
            <div style={{ height:'100%', width:`${progress*100}%`, background: block.fakeProgressColor || '#e63946', transition:'width 0.5s linear' }} />
          </div>
        )}
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
                {block.resEmojiUnified ? <Emoji unified={block.resEmojiUnified} size={compact ? 36 : 72} /> : (block.resEmoji ?? '🎉')}
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
export default function QuizPreview({ config, stepIdx = 0, compact = false, onNavigate, selectedBlockId, quizId, visitorId, scores = {} }) {
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
  const [mediaState, setMediaState] = React.useState({ hasStarted: false, ended: false, currentTime: 0 });

  // Full-screen loading overlay state
  const [loadingBlock, setLoadingBlock] = React.useState(null);

  const onStartLoading = React.useCallback((block, afterMs, navigateFn) => {
    setLoadingBlock(block);
    setTimeout(() => {
      setLoadingBlock(null);
      navigateFn();
    }, afterMs);
  }, []);

  const containerStyle = {
    background: buildBackground(theme),
    color: textColor,
    fontFamily: 'Inter, system-ui, sans-serif',
    position: 'relative',
    overflow: 'hidden',
  };


  const width = compact ? 200 : 390;
  const height = compact ? 380 : 680;

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
      className="rounded-3xl overflow-hidden shadow-2xl"
      style={{
        width,
        height,
        border: compact ? '3px solid #1e293b' : '4px solid #1e293b',
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
                  className={`shrink-0 w-full ${compact && block.id === selectedBlockId ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-900 rounded-lg transition-all duration-300' : ''}`}
                  style={isStagger ? {
                    animation: `stepStaggerItem ${dur} ${ease} both`,
                    animationDelay: `${idx * (parseFloat(dur) * 0.18).toFixed(2)}s`,
                  } : {}}
                >
                  <BlockRenderer block={block} theme={{ bg: buildBackground(theme), accent, textColor }} compact={compact} onNavigate={onNavigate} quizId={quizId} visitorId={visitorId} stepId={step.id} mediaState={mediaState} setMediaState={setMediaState} steps={config?.steps} stepIdx={stepIdx} scores={scores} onStartLoading={onStartLoading} />
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
            <Emoji unified={block.emojiUnified} size={compact ? 24 : 32} />
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
          textAlign: 'center',
          transition: 'opacity 0.15s ease',
          letterSpacing: '0.01em',
          display: 'flex',
          flexDirection: pos === 'top_large' ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: pos === 'top_large' ? (compact ? 6 : 10) : (compact ? 6 : 8),
          animation: animCSS,
          ...glassStyle,
        }}
        onClick={() => {
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
          }}
        >
          {pos === 'left_inside' && (block.emojiUnified ? <Emoji unified={block.emojiUnified} size={compact ? 16 : 20} /> : block.emoji && <span>{block.emoji}</span>)}
          {pos === 'top_large' && (block.emojiUnified ? <Emoji unified={block.emojiUnified} size={compact ? 24 : 36} /> : block.emoji && <span style={{fontSize: compact ? 24 : 36, lineHeight: 1}}>{block.emoji}</span>)}
          
          <span style={{flex: pos === 'top_large' ? 'initial' : 1}}>{block.text || 'Avançar'}</span>
          
          {pos === 'right_inside' && (block.emojiUnified ? <Emoji unified={block.emojiUnified} size={compact ? 16 : 20} /> : block.emoji && <span>{block.emoji}</span>)}
        </button>
      );
      let content = BaseButton;
      if (pos === 'left_outside' && (block.emojiUnified || block.emoji)) {
        content = (
          <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 8 : 12, width: block.fullWidth ? '100%' : 'auto' }}>
            <div style={{ fontSize: compact ? 20 : 28, flexShrink: 0, display: 'flex' }}>
              {block.emojiUnified ? <Emoji unified={block.emojiUnified} size={compact ? 20 : 28} /> : block.emoji}
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

        if (block.enableLoading) {
           setIsLoading(true);
           const timer = setTimeout(() => {
              setIsLoading(false);
              proceed();
           }, (block.loadingDuration || 3) * 1000);
        } else {
           proceed();
        }
      };

      if (isLoading) {
        return <LoadingScreen block={block} accent={accent} defaultText={defaultText} compact={compact} />;
      }

      const defaultFieldTitles = { name: 'Nome', email: 'E-mail', phone: 'Telefone', message: 'Mensagem' };
      const defaultPlaceholders = { name: 'Digite aqui seu Nome', email: 'Digite aqui seu Email', phone: 'Digite seu DDD + WhatsApp', message: 'Sua mensagem' };

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 6 : 14, animation: 'fadeIn 0.4s ease-out' }}>
          <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
          {fields.map(f => {
            const placeholder = block.placeholders?.[f] || defaultPlaceholders[f] || f;
            const fieldTitle = defaultFieldTitles[f] || f;

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

      React.useEffect(() => {
        // Only run local interval if we are in preview mode OR there's no media to track
        const hasMedia = steps && steps[stepIdx]?.blocks?.some(b => b.type === 'video' || b.type === 'audio');
        if (compact || !hasMedia) {
          const interval = setInterval(() => setLocalSeconds(s => s + 1), 1000);
          return () => clearInterval(interval);
        }
      }, [compact, steps, stepIdx]);

      React.useEffect(() => {
        const delay = finalResDelay;
        if (delay === 'none') { setResVisible(true); return; }
        
        const hasMedia = steps && steps[stepIdx]?.blocks?.some(b => b.type === 'video' || b.type === 'audio');

        if (delay === 'on_end') {
          if (!compact && hasMedia) {
            setResVisible(mediaState && mediaState.hasStarted && mediaState.ended);
          } else {
            // Em preview ou sem mídia, pra 'on_end', mostramos com um delay mockado rápido ou instantâneo
            setResVisible(compact ? localSeconds >= 2 : true);
          }
          return;
        }

        if (delay === 'custom') {
          const secs = finalResDelaySeconds || 0;
          if (!compact && hasMedia) {
            if (mediaState && mediaState.hasStarted && mediaState.currentTime >= secs) {
              setResVisible(true);
            } else {
              setResVisible(false);
            }
          } else {
            // Conta os segundos corridos no relógio local do block
            if (localSeconds >= secs) {
              setResVisible(true);
            } else {
              setResVisible(false);
            }
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
              {finalEmojiUnified ? <Emoji unified={finalEmojiUnified} size={compact ? 36 : 72} /> : finalEmoji}
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
                {pos === 'left_inside' && (block.buttonEmojiUnified ? <Emoji unified={block.buttonEmojiUnified} size={compact ? 16 : 20} /> : block.buttonEmoji && <span>{block.buttonEmoji}</span>)}
                {pos === 'top_large' && (block.buttonEmojiUnified ? <Emoji unified={block.buttonEmojiUnified} size={compact ? 24 : 36} /> : block.buttonEmoji && <span style={{fontSize: compact ? 24 : 36, lineHeight: 1}}>{block.buttonEmoji}</span>)}
                
                <span style={{flex: pos === 'top_large' ? 'initial' : 1}}>{finalButtonText}</span>
                
                {pos === 'right_inside' && (block.buttonEmojiUnified ? <Emoji unified={block.buttonEmojiUnified} size={compact ? 16 : 20} /> : block.buttonEmoji && <span>{block.buttonEmoji}</span>)}
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

    default:
      return null;
  }
}
