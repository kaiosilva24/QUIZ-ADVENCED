import React, { useState, useRef, useEffect } from 'react';
import { Emoji } from 'emoji-picker-react';

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

// ─── AUDIO PLAYER COMPONENT — WhatsApp Style (fiel à referência) ─────────────
function AudioBlockPlayer({ block, compact }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]       = useState(0);

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
      else { await audioRef.current.play(); setPlaying(true); }
    } catch(e) { console.error('Audio play error:', e); }
  };

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00';
    return `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`;
  };

  const progress = duration > 0 ? currentTime / duration : 0;
  const avatarSz  = compact ? 32 : 46;
  const btnSz     = compact ? 22 : 32;

  return (
    <div style={{ width: '100%' }}>
      {/* Hidden audio */}
      {block.src && (
        <audio ref={audioRef} src={block.src} preload="auto"
          onTimeUpdate={e => setCurrentTime(e.target.currentTime)}
          onLoadedMetadata={e => setDuration(e.target.duration)}
          onEnded={() => { setPlaying(false); setCurrentTime(0); }} />
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
          <div style={{ flex: 1, position: 'relative', height: compact ? 24 : 36, display:'flex', alignItems:'center' }}>
            {/* Barras */}
            <div style={{ display:'flex', alignItems:'center', gap: compact ? 1.5 : 2, width:'100%', height:'100%' }}>
              {Array.from({ length: waveCount }, (_, i) => {
                const h = waveHeights[i % waveHeights.length];
                const barProgress = i / waveCount;
                const played = barProgress < progress;
                return (
                  <div key={i} style={{
                    flex: 1,
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
        </div>

        {/* Footer: timer esquerda + horário e ticks direita */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingLeft: compact ? 2 : 4 }}>
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
function VideoBlockPlayer({ block, compact }) {
  const videoRef   = useRef(null);
  const startedRef = useRef(false);
  const [playing, setPlaying]             = useState(false);
  const [showThumb, setShowThumb]         = useState(true);
  const [currentTime, setCurrentTime]     = useState(0);
  const [duration, setDuration]           = useState(0);
  const [ended, setEnded]                 = useState(false);
  // showUnmuteOverlay is computed directly from block config — NEVER stored as state
  // This ensures it always renders correctly after page reload or prop changes

  const ar       = block.aspectRatio || '16/9';
  const radius   = block.rounded ? (compact?10:16) : 0;
  const src      = block.src || '';
  const isYT     = src.includes('youtube') || src.includes('youtu.be');
  const isVimeo  = src.includes('vimeo');
  const isEmbed  = isYT || isVimeo;

  // Se usar duração fake, OBRIGATORIAMENTE ocultamos controles nativos
  // (pois os nativos revelariam a duração real)
  const isControlsHidden = block.hideControls || block.useFakeDuration;

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
    setDuration(0); setEnded(false);
  }, [src]);

  // The overlay is shown when: video is configured as autoplay+muted AND user hasn't unmuted yet
  const [userUnmuted, setUserUnmuted] = useState(false);
  const showUnmuteOverlay = !!(block.autoplay && block.muted && src && !isEmbed && !userUnmuted);

  // Reset userUnmuted when src or block config changes (so overlay comes back)
  useEffect(() => {
    setUserUnmuted(false);
  }, [src, block.autoplay, block.muted]);

  // onCanPlay fires once video data is loaded — safest place to autoplay
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

  const handleUnmute = (e) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    v.currentTime = 0;
    v.play().then(() => {
      setPlaying(true);
      setUserUnmuted(true);   // hides overlay
      setShowThumb(false);
    }).catch(console.error);
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (showUnmuteOverlay) { handleUnmute(); return; }
    if (playing) { v.pause(); setPlaying(false); }
    else {
      v.play().then(() => { setPlaying(true); setShowThumb(false); setEnded(false); }).catch(console.error);
    }
  };

  const progress = duration > 0 ? currentTime / duration : 0;
  const displayDuration = block.useFakeDuration ? (block.fakeDuration || 120) : duration;
  const displayCurrentTime = block.useFakeDuration ? (progress * displayDuration) : currentTime;

  return (
    <div style={{ width:'100%', borderRadius:radius, overflow:'hidden', position:'relative', background:'#000', boxShadow: compact?'none':'0 8px 40px rgba(0,0,0,0.6)' }}>
      <style>{`
        @keyframes vslMutePulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }
        @keyframes vslMuteBlink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @keyframes vslRipple    { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(2.6);opacity:0} }
      `}</style>
      {/* Vídeo com aspect ratio */}
      <div style={{ width:'100%', aspectRatio:ar, position:'relative', background:'#0a0a0a', overflow:'hidden', cursor: src && !isEmbed ? 'pointer' : 'default' }}
           onClick={!isEmbed ? togglePlay : undefined}>

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
          <iframe src={embedUrl}
            style={{ position:'absolute', inset:0, width:'100%', height:'100%', border:'none' }}
            allow="autoplay; fullscreen" allowFullScreen />
        )}

        {/* MP4/base64 nativo — sem controles nativos nunca */}
        {src && !isEmbed && (
          <video ref={videoRef} src={src}
            style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', pointerEvents:'none' }}
            loop={block.loop}
            playsInline
            disablePictureInPicture
            onCanPlay={handleCanPlay}
            onTimeUpdate={e => setCurrentTime(e.target.currentTime)}
            onLoadedMetadata={e => setDuration(e.target.duration)}
            onEnded={() => { setPlaying(false); setEnded(true); }} />
        )}

        {/* Thumbnail overlay */}
        {src && !isEmbed && block.thumbnailSrc && showThumb && (
          <div style={{ position:'absolute', inset:0, background:`url(${block.thumbnailSrc}) center/cover`, pointerEvents:'none' }} />
        )}

        {/* ═══ ÍCONE MUDO CENTRALIZADO — PANDA VSL STYLE ═══ */}
        {src && !isEmbed && showUnmuteOverlay && (
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
                border:'2px solid rgba(0,213,230,0.4)',
                animation:'vslRipple 2s ease-out infinite',
                pointerEvents:'none',
              }} />
              <div style={{
                position:'absolute',
                width:compact?52:90, height:compact?52:90,
                borderRadius:'50%',
                border:'2px solid rgba(0,213,230,0.25)',
                animation:'vslRipple 2s ease-out 0.9s infinite',
                pointerEvents:'none',
              }} />

              {/* Círculo principal */}
              <div style={{
                width:compact?42:70, height:compact?42:70,
                borderRadius:'50%',
                background:'linear-gradient(145deg, #00d5e6, #0099b0)',
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:`0 0 ${compact?14:28}px rgba(0,213,230,0.6), 0 4px 16px rgba(0,0,0,0.5)`,
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
              background:'rgba(0,0,0,0.6)',
              backdropFilter:'blur(8px)',
              border:'1px solid rgba(255,255,255,0.2)',
              borderRadius:'999px',
              padding:compact?'5px 14px':'8px 22px',
              color:'#fff',
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
        {block.showPlayBtn !== false && src && !isEmbed && !playing && !showUnmuteOverlay && (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
            <div style={{ width:compact?40:68, height:compact?40:68, borderRadius:'50%', background:'rgba(0,0,0,0.65)', backdropFilter:'blur(8px)', border:'2px solid rgba(255,255,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 30px rgba(255,255,255,0.15)' }}>
              <svg width={compact?16:28} height={compact?16:28} viewBox="0 0 24 24" fill="white">
                <polygon points="5,3 19,12 5,21"/>
              </svg>
            </div>
          </div>
        )}

        {/* Timer VSL (fake duration se ativado)
            Mostra mesmo sem o vídeo tocar, usando fakeDuration como fallback */}
        {block.showTimer !== false && src && (duration > 0 || block.useFakeDuration) && (
          <div style={{ position:'absolute', bottom:compact?6:10, right:compact?6:10, background:'rgba(0,0,0,0.75)', borderRadius:4, padding:compact?'2px 5px':'3px 8px', fontSize:compact?8:11, color:'#fff', fontFamily:'monospace', zIndex:6 }}>
            {fmt(displayCurrentTime)} / {fmt(displayDuration)}
          </div>
        )}

        {/* Barra de progresso VSL customizada — mostra mesmo antes do vídeo tocar */}
        {src && !isEmbed && isControlsHidden && (duration > 0 || block.useFakeDuration) && (
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:compact?2:3, background:'rgba(255,255,255,0.15)', zIndex:6 }}>
            <div style={{ height:'100%', width:`${progress*100}%`, background:'#e63946', transition:'width 0.5s linear' }} />
          </div>
        )}
      </div>

      {/* CTA pós-vídeo */}
      {block.ctaText && (ended || !src) && (
        <div style={{ padding: compact?'8px 10px':'14px 18px', background:'linear-gradient(135deg,#1e293b,#0f172a)', borderTop:'1px solid rgba(255,255,255,0.05)' }}>
          <button onClick={() => block.ctaUrl && window.open(block.ctaUrl,'_blank')}
            style={{ width:'100%', padding: compact?'8px':'13px', background:'#e63946', color:'#fff', border:'none', borderRadius: compact?6:10, fontSize: compact?10:14, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 20px rgba(230,57,70,0.4)', letterSpacing:'0.01em' }}>
            {block.ctaText}
          </button>
        </div>
      )}

      {/* CTA preview no editor (quando sem src) */}
      {block.ctaText && src && !ended && (
        <div style={{ padding: compact?'6px 10px':'10px 18px', background:'#0f172a', borderTop:'1px solid rgba(255,255,255,0.05)', opacity:0.5 }}>
          <p style={{ color:'#475569', fontSize: compact?8:11, textAlign:'center' }}>CTA aparece após o vídeo terminar</p>
        </div>
      )}
    </div>
  );
}

// Renderizador fiel ao InLead: converte o config JSON em tela visual
export default function QuizPreview({ config, stepIdx = 0, compact = false, onNavigate }) {
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

  const containerStyle = {
    background: buildBackground(theme),
    color: textColor,
    fontFamily: 'Inter, system-ui, sans-serif',
    position: 'relative',
    overflow: 'hidden',
  };


  const width = compact ? 200 : 390;
  const height = compact ? 380 : 680;

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

      {/* Scrollable content */}
      <style>{`
        .preview-scroll::-webkit-scrollbar { width: 4px; }
        .preview-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); }
        .preview-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
      `}</style>
      <div className="relative z-10 h-full block overflow-y-auto preview-scroll">
        <div className={`flex flex-col gap-${compact ? '2' : '3'} ${compact ? 'p-4' : 'p-6'} min-h-full`}>
          {(step?.blocks || []).map(block => (
            <BlockRenderer key={block.id} block={block} theme={{ bg: buildBackground(theme), accent, textColor }} compact={compact} onNavigate={onNavigate} />
          ))}
          {(!step?.blocks || step.blocks.length === 0) && (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30">
              <p style={{ color: textColor, fontSize: compact ? 10 : 13 }}>
                Adicione blocos<br />para ver o preview
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BlockRenderer({ block, theme, compact, onNavigate }) {
  const scale = compact ? 0.6 : 1;
  const { accent, textColor: defaultText } = theme;

  switch (block.type) {

    case 'progress': {
      const pct = block.total > 0 ? Math.round((block.current / block.total) * 100) : 0;
      return (
        <div className="w-full" style={{ marginBottom: compact ? 2 : 4 }}>
          {block.showLabel && (
            <p style={{ color: defaultText, opacity: .6, fontSize: compact ? 8 : 11, marginBottom: 4, textAlign: 'right' }}>
              {block.current}/{block.total}
            </p>
          )}
          <div style={{ background: block.bg || '#1e293b', borderRadius: 99, height: compact ? 4 : 6, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: block.color || accent, borderRadius: 99, transition: 'width 0.4s ease' }} />
          </div>
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
      const aspectRatio = block.aspectRatio || '16/9';
      const scale = block.imgScale ? block.imgScale / 100 : 1;
      const imageStyle = {
        width: `${(block.imgScale || 100)}%`,
        aspectRatio: block.height && !block.aspectRatio ? undefined : aspectRatio,
        height: block.height && !block.aspectRatio ? (compact ? block.height * 0.5 : block.height) : undefined,
        objectFit: block.fit || 'cover',
        objectPosition: block.position || 'center center',
        borderRadius: block.rounded ? (compact ? 8 : 12) : 0,
        display: 'block',
        margin: '0 auto',
      };
      if (!block.src) {
        return (
          <div style={{
            width: `${(block.imgScale || 100)}%`,
            aspectRatio,
            background: '#1e293b',
            borderRadius: block.rounded ? (compact ? 8 : 12) : 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto',
          }}>
            <p style={{ color: '#475569', fontSize: compact ? 9 : 12 }}>Imagem não configurada</p>
          </div>
        );
      }
      return (
        <img src={block.src} alt={block.alt || ''} style={{...imageStyle, cursor: block.nextStep ? 'pointer' : 'default'}} 
             onClick={() => block.nextStep && onNavigate && onNavigate(block.nextStep, 'Imagem VSL')} />
      );
    }

    case 'arrow_button': {
      const arrowStyle = block.arrowStyle || 'chevron_down';
      const color = block.color || '#f97316';
      const animation = block.animation || 'bounce';
      const align = block.align || 'center';
      const sizeMap = { sm: compact ? 18 : 28, md: compact ? 24 : 40, lg: compact ? 30 : 52, xl: compact ? 38 : 68 };
      const sz = sizeMap[block.size || 'lg'];

      // Keyframes CSS inline por animação
      const keyframes = {
        bounce: `@keyframes arr_bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(6px)}}`,
        pulse:  `@keyframes arr_pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.85)}}`,
        blink:  `@keyframes arr_blink{0%,49%{opacity:1}50%,100%{opacity:0}}`,
        none:   '',
      };
      const animCSS = {
        bounce: 'arr_bounce 1s ease-in-out infinite',
        pulse:  'arr_pulse 1.2s ease-in-out infinite',
        blink:  'arr_blink 1s step-end infinite',
        none:   'none',
      };

      // 8 ícones SVG profissionais
      const svgIcons = {
        chevron_right: (
          <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        ),
        arrow_right: (
          <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
          </svg>
        ),
        double_right: (
          <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="5 18 11 12 5 6"/>
            <polyline points="13 18 19 12 13 6"/>
          </svg>
        ),
        bold_right: (
          <svg width={sz} height={sz} viewBox="0 0 24 24" fill={color}>
            <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z"/>
          </svg>
        ),
        arrow_down: (
          <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <polyline points="19 12 12 19 5 12"/>
          </svg>
        ),
        chevron_down: (
          <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        ),
        circle_right: (
          <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 8 16 12 12 16"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
        ),
        triangle_right: (
          <svg width={sz} height={sz} viewBox="0 0 24 24" fill={color}>
            <polygon points="5,3 19,12 5,21"/>
          </svg>
        ),
      };

      const icon = svgIcons[arrowStyle] || svgIcons.chevron_down;

      return (
        <>
          {animation !== 'none' && (
            <style>{keyframes[animation]}</style>
          )}
          <div style={{ display: 'flex', justifyContent: align, width: '100%' }}>
            <button
              style={{
                background: 'none',
                border: 'none',
                padding: compact ? 4 : 8,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: animCSS[animation],
                filter: `drop-shadow(0 0 ${compact ? 6 : 12}px ${color}80)`,
              }}
              aria-label="Navegar para próxima etapa"
              onClick={() => block.nextStep && onNavigate && onNavigate(block.nextStep, block.text || 'Avançar')}
            >
              {icon}
            </button>
          </div>
        </>
      );
    }


    case 'audio':
      return <AudioBlockPlayer block={block} compact={compact} />;

    case 'video':
      return <VideoBlockPlayer block={block} compact={compact} />;

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
          ...glassStyle,
        }}
        onClick={() => block.nextStep && onNavigate && onNavigate(block.nextStep, block.text || 'Avançar')}
        >
          {pos === 'left_inside' && (block.emojiUnified ? <Emoji unified={block.emojiUnified} size={compact ? 16 : 20} /> : block.emoji && <span>{block.emoji}</span>)}
          {pos === 'top_large' && (block.emojiUnified ? <Emoji unified={block.emojiUnified} size={compact ? 24 : 36} /> : block.emoji && <span style={{fontSize: compact ? 24 : 36, lineHeight: 1}}>{block.emoji}</span>)}
          
          <span style={{flex: pos === 'top_large' ? 'initial' : 1}}>{block.text || 'Avançar'}</span>
          
          {pos === 'right_inside' && (block.emojiUnified ? <Emoji unified={block.emojiUnified} size={compact ? 16 : 20} /> : block.emoji && <span>{block.emoji}</span>)}
        </button>
      );
      
      if (pos === 'left_outside' && (block.emojiUnified || block.emoji)) {
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 8 : 12, width: block.fullWidth ? '100%' : 'auto' }}>
            <div style={{ fontSize: compact ? 20 : 28, flexShrink: 0, display: 'flex' }}>
              {block.emojiUnified ? <Emoji unified={block.emojiUnified} size={compact ? 20 : 28} /> : block.emoji}
            </div>
            <div style={{ flex: 1 }}>{BaseButton}</div>
          </div>
        );
      }
      
      return BaseButton;
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

      const handleCapture = () => {
        // Formata e salva/envia os dados (mocked for visualization)
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

      const proceed = () => {
        if (block.nextStep && onNavigate) {
          onNavigate(block.nextStep, block.buttonText || 'Quero meu resultado');
        } else if (block.redirectUrl) {
          const url = block.redirectUrl.startsWith('http') ? block.redirectUrl : `https://${block.redirectUrl}`;
          window.location.href = url;
        }
      };

      if (isLoading) {
        const style = block.loadingStyle || 'spinner';
        const color = block.loadingColor || accent;
        
        return (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: compact ? 12 : 24, alignItems: 'center', justifyContent: 'center', minHeight: compact ? 150 : 250 }}>
             <style>{`
              @keyframes quizSpin { to { transform: rotate(360deg); } }
              @keyframes quizPulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: .7; } }
              @keyframes quizBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
            `}</style>

            {style === 'spinner' && (
              <div style={{
                width: compact ? 32 : 48,
                height: compact ? 32 : 48,
                border: `4px solid ${color}30`,
                borderTopColor: color,
                borderRadius: '50%',
                animation: 'quizSpin 1s linear infinite'
              }} />
            )}
            
            {style === 'pulse' && (
               <div style={{
                width: compact ? 32 : 56,
                height: compact ? 32 : 56,
                backgroundColor: `${color}20`,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'quizPulse 1.5s ease-in-out infinite'
              }}>
                <div style={{ width: '50%', height: '50%', backgroundColor: color, borderRadius: '50%' }} />
              </div>
            )}
            
            {style === 'dots' && (
              <div style={{ display: 'flex', gap: compact ? 4 : 8 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: compact ? 8 : 12,
                    height: compact ? 8 : 12,
                    backgroundColor: color,
                    borderRadius: '50%',
                    animation: `quizBounce 0.6s infinite ${i * 0.1}s alternate`
                  }} />
                ))}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 4 : 8 }}>
                {block.loadingText && (
                  <p style={{ color: defaultText, fontWeight: 700, fontSize: compact ? 13 : 18, margin: 0 }}>{block.loadingText}</p>
                )}
                {block.progressText && (
                  <p style={{ color: defaultText, opacity: .7, fontSize: compact ? 10 : 14, margin: 0 }}>{block.progressText}</p>
                )}
            </div>
          </div>
        );
      }

      const fields = block.fields || ['name', 'email'];
      const labels = { name: 'Seu nome completo', email: 'Seu melhor e-mail', phone: 'Seu WhatsApp', title: 'Seu cargo' };
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 6 : 10, animation: 'fadeIn 0.4s ease-out' }}>
          <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
          {fields.map(f => (
            <div key={f} style={{
              padding: compact ? '6px 10px' : '12px 16px',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 10,
              fontSize: compact ? 9 : 13,
              color: defaultText,
              opacity: .6,
            }}>
              {labels[f] || f}...
            </div>
          ))}
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

    case 'result': {
      // Usar refs para manter estado de carregamento sem re-renderizar todo o quiz
      const [isLoading, setIsLoading] = React.useState(block.enableLoading);

      React.useEffect(() => {
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
      }, [block.id, block.enableLoading, block.loadingDuration]);

      if (isLoading) {
        const style = block.loadingStyle || 'spinner';
        const color = block.loadingColor || accent;
        
        return (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: compact ? 12 : 24, alignItems: 'center', justifyContent: 'center', minHeight: compact ? 150 : 250 }}>
             <style>{`
              @keyframes quizSpin { to { transform: rotate(360deg); } }
              @keyframes quizPulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: .7; } }
              @keyframes quizBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
            `}</style>

            {style === 'spinner' && (
              <div style={{
                width: compact ? 32 : 48,
                height: compact ? 32 : 48,
                border: `4px solid ${color}30`,
                borderTopColor: color,
                borderRadius: '50%',
                animation: 'quizSpin 1s linear infinite'
              }} />
            )}
            
            {style === 'pulse' && (
              <div style={{
                width: compact ? 32 : 56,
                height: compact ? 32 : 56,
                backgroundColor: `${color}20`,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'quizPulse 1.5s ease-in-out infinite'
              }}>
                <div style={{ width: '50%', height: '50%', backgroundColor: color, borderRadius: '50%' }} />
              </div>
            )}
            
            {style === 'dots' && (
              <div style={{ display: 'flex', gap: compact ? 4 : 8 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: compact ? 8 : 12,
                    height: compact ? 8 : 12,
                    backgroundColor: color,
                    borderRadius: '50%',
                    animation: `quizBounce 0.6s infinite ${i * 0.1}s alternate`
                  }} />
                ))}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 4 : 8 }}>
                {block.loadingText && (
                  <p style={{ color: defaultText, fontWeight: 700, fontSize: compact ? 13 : 18, margin: 0 }}>{block.loadingText}</p>
                )}
                {block.progressText && (
                  <p style={{ color: defaultText, opacity: .7, fontSize: compact ? 10 : 14, margin: 0 }}>{block.progressText}</p>
                )}
            </div>
          </div>
        );
      }

      return (
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: compact ? 8 : 16, alignItems: 'center', animation: 'fadeIn 0.5s ease-out' }}>
          <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
          <div style={{ display: 'flex', fontSize: compact ? 24 : 48 }}>
            {block.emojiUnified ? <Emoji unified={block.emojiUnified} size={compact ? 36 : 72} /> : (block.emoji || '🎉')}
          </div>
          <p style={{ color: defaultText, fontWeight: 700, fontSize: compact ? 13 : 20 }}>{block.heading || 'Parabéns!'}</p>
          <p style={{ color: defaultText, opacity: .7, fontSize: compact ? 9 : 13, lineHeight: 1.6 }}>{block.text || ''}</p>
          {block.buttonText && (
            <button 
              onClick={() => {
                if (block.buttonUrl) {
                  const url = block.buttonUrl.startsWith('http') ? block.buttonUrl : `https://${block.buttonUrl}`;
                  window.location.href = url;
                }
              }}
              style={{
                background: block.buttonBg || accent,
                color: '#fff',
                padding: compact ? '8px 16px' : '14px 28px',
                borderRadius: 12,
                border: 'none',
                fontSize: compact ? 10 : 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}>
              {block.buttonText}
            </button>
          )}
        </div>
      );
    }

    default:
      return null;
  }
}
