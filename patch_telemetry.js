const fs = require('fs');
const path = require('path');

const previewFile = path.join(__dirname, 'frontend', 'src', 'QuizPreview.jsx');
let previewContent = fs.readFileSync(previewFile, 'utf8');

const hookCode = `
function useMediaTelemetry(mediaType, blockId, quizId, visitorId, stepId, compact) {
  const watchedSecondsRef = React.useRef(new Set());
  const lastPingRef = React.useRef(Date.now());

  const handleTimeUpdate = (currentTime, duration) => {
    if (compact || !quizId || !visitorId) return;
    const sec = Math.floor(currentTime);
    watchedSecondsRef.current.add(sec);
    const now = Date.now();
    if (now - lastPingRef.current > 5000) {
      pingTelemetry(duration);
      lastPingRef.current = now;
    }
  };

  const pingTelemetry = (duration) => {
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
  };

  const triggerFinalPing = (duration) => {
     if (compact || !quizId || !visitorId) return;
     pingTelemetry(duration);
  };

  return { handleTimeUpdate, triggerFinalPing };
}

`;

if (!previewContent.includes('function useMediaTelemetry')) {
    previewContent = previewContent.replace('// ─── AUDIO PLAYER COMPONENT ────────────────────────────────────────────────', hookCode + '// ─── AUDIO PLAYER COMPONENT ────────────────────────────────────────────────');
}

// Update QuizPreview props
previewContent = previewContent.replace('export default function QuizPreview({ config, stepIdx = 0, compact = false, onNavigate, selectedBlockId }) {', 'export default function QuizPreview({ config, stepIdx = 0, compact = false, onNavigate, selectedBlockId, quizId, visitorId }) {');

// Update BlockRenderer mapping
previewContent = previewContent.replace('<BlockRenderer block={block} theme={{ bg: buildBackground(theme), accent, textColor }} compact={compact} onNavigate={onNavigate} />', '<BlockRenderer block={block} theme={{ bg: buildBackground(theme), accent, textColor }} compact={compact} onNavigate={onNavigate} quizId={quizId} visitorId={visitorId} stepId={step.id} />');

// Update BlockRenderer definition
previewContent = previewContent.replace('function BlockRenderer({ block, theme, compact, onNavigate }) {', 'function BlockRenderer({ block, theme, compact, onNavigate, quizId, visitorId, stepId }) {');

// Replace returned Audio
previewContent = previewContent.replace('<AudioBlockPlayer block={block} compact={compact} />', '<AudioBlockPlayer block={block} compact={compact} quizId={quizId} visitorId={visitorId} stepId={stepId} />');
previewContent = previewContent.replace('<VideoBlockPlayer block={block} compact={compact} />', '<VideoBlockPlayer block={block} compact={compact} quizId={quizId} visitorId={visitorId} stepId={stepId} />');

// Patch AudioBlockPlayer inside
previewContent = previewContent.replace('function AudioBlockPlayer({ block, compact }) {', 'function AudioBlockPlayer({ block, compact, quizId, visitorId, stepId }) {');
if (!previewContent.includes('const { handleTimeUpdate: trackTime')) {
    previewContent = previewContent.replace('const audioRef = useRef(null);', `const audioRef = useRef(null);\n  const { handleTimeUpdate: trackTime, triggerFinalPing } = useMediaTelemetry('audio', block.id, quizId, visitorId, stepId, compact);`);
    previewContent = previewContent.replace('setCurrentTime(audioRef.current.currentTime);', 'setCurrentTime(audioRef.current.currentTime);\n      trackTime(audioRef.current.currentTime, audioRef.current.duration);');
    
    // Find the end of AudioBlockPlayer to add the cleanup useEffect
    previewContent = previewContent.replace('const progress = duration > 0 ? currentTime / duration : 0;', `React.useEffect(() => { return () => { if (audioRef.current) triggerFinalPing(audioRef.current.duration); } }, []);\n  const progress = duration > 0 ? currentTime / duration : 0;`);
}

// Patch VideoBlockPlayer inside
previewContent = previewContent.replace('function VideoBlockPlayer({ block, compact }) {', 'function VideoBlockPlayer({ block, compact, quizId, visitorId, stepId }) {');
if (previewContent.includes('function VideoBlockPlayer') && !previewContent.includes("useMediaTelemetry('video'")) {
    previewContent = previewContent.replace('const startedRef = useRef(false);', `const startedRef = useRef(false);\n  const { handleTimeUpdate: trackTime, triggerFinalPing } = useMediaTelemetry('video', block.id, quizId, visitorId, stepId, compact);`);
    previewContent = previewContent.replace('const progress = duration > 0 ? currentTime / duration : 0;', `React.useEffect(() => { return () => { if (videoRef.current) triggerFinalPing(videoRef.current.duration); } }, []);\n  const progress = duration > 0 ? currentTime / duration : 0;`);

    // In handleTimeUpdate instead of relying on a missing function, we append the onTimeUpdate directly to the <video> tag
    previewContent = previewContent.replace('<video', '<video onTimeUpdate={(e) => { trackTime(e.target.currentTime, e.target.duration); }}');
}

fs.writeFileSync(previewFile, previewContent);

// Update App.jsx to pass quizId and visitorId
const appFile = path.join(__dirname, 'frontend', 'src', 'App.jsx');
let appContent = fs.readFileSync(appFile, 'utf8');
if (!appContent.includes('visitorId={getVisitorId()}')) {
    appContent = appContent.replace(
        /compact=\{false\}\s*onNavigate=\{handleNavigate\}/, 
        'compact={false}\n          onNavigate={handleNavigate}\n          quizId={quizData.quiz_id || quizData.id}\n          visitorId={getVisitorId()}'
    );
    fs.writeFileSync(appFile, appContent);
}

console.log("Patched successfully");
