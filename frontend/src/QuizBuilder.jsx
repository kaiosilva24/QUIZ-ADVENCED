import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical, Plus, Trash2, ChevronLeft, Save, Eye, EyeOff,
  Type, Image, MousePointerClick, AlignLeft, ToggleLeft, Minus,
  CheckCircle2, Users, Layers, Palette, Settings, ArrowRight, Music, Video, Copy, MoveVertical, Timer,
  Undo2, Redo2, Radio, RefreshCw, AlertCircle, Cloud, LayoutList, ImagePlus, BarChart3, Images
} from 'lucide-react';
import QuizPreview from './QuizPreview';
import BlockEditor from './BlockEditor';

const BLOCK_TYPES = [
  { type: 'heading',      label: 'Título',           icon: Type,            color: '#6366f1' },
  { type: 'text',         label: 'Texto',             icon: AlignLeft,       color: '#8b5cf6' },
  { type: 'image',        label: 'Imagem',            icon: Image,           color: '#06b6d4' },
  { type: 'audio',        label: 'Áudio WhatsApp',    icon: Music,           color: '#25d366' },
  { type: 'video',        label: 'Vídeo VSL',         icon: Video,           color: '#e63946' },
  { type: 'button',       label: 'Botão de Opção',    icon: MousePointerClick, color: '#10b981' },
  { type: 'arrow_button', label: 'Botão Seta',        icon: ArrowRight,      color: '#f97316' },
  { type: 'divider',      label: 'Separador',         icon: Minus,           color: '#64748b' },
  { type: 'progress',     label: 'Barra de Progresso', icon: ToggleLeft,     color: '#f59e0b' },
  { type: 'spacer',       label: 'Espaçamento',       icon: MoveVertical,    color: '#94a3b8' },
  { type: 'lead_capture', label: 'Captura de Lead',   icon: Users,           color: '#ef4444' },
  { type: 'animated_progress', label: 'Barra Animada', icon: Timer,          color: '#f43f5e' },
  { type: 'live_counter', label: 'Ao Vivo (Oscilante)', icon: Radio,         color: '#ef4444' },
  { type: 'result',         label: 'Tela de Resultado',  icon: CheckCircle2,  color: '#22c55e' },
  { type: 'checkbox_selector', label: 'Seletor de Opções', icon: LayoutList,   color: '#a855f7' },
  { type: 'testimonial_carousel', label: 'Carrossel Depoimentos', icon: Users, color: '#f59e0b' },
  { type: 'image_button_selector', label: 'Botões c/ Imagem', icon: ImagePlus, color: '#10b981' },
  { type: 'animated_metrics', label: 'Métricas Animadas', icon: BarChart3, color: '#ec4899' },
  { type: 'image_carousel', label: 'Carrossel Imagens', icon: Images, color: '#f59e0b' },
];

function createBlock(type) {
  const base = { id: `block_${Date.now()}_${Math.random().toString(36).slice(2)}`, type };
  switch (type) {
    case 'heading':     return { ...base, text: 'Qual é o seu maior desafio?', size: 'xl', align: 'center', color: '#ffffff', bold: true };
    case 'text':        return { ...base, text: 'Escolha a opção que melhor descreve sua situação atual.', align: 'center', color: '#94a3b8', size: 'base' };
    case 'image':       return { ...base, src: '', alt: '', fit: 'cover', rounded: true, borderRadius: 12, imgScale: 100, align: 'center', layout: 'single' };
    case 'audio':       return { ...base, src: '', avatarSrc: '', senderName: 'Fulano', duration: '', bgColor: '#075e54', bubbleColor: '#dcf8c6', textColor: '#111b21', showWave: true };
    case 'video':       return { ...base, src: '', thumbnailSrc: '', autoplay: false, muted: false, loop: false, hideControls: false, showPlayBtn: true, rounded: true, aspectRatio: '16/9', showTimer: true, ctaText: '', ctaUrl: '' };
    case 'button':      return { ...base, text: '✅ Sim, quero muito!', emoji: '✅', bg: '#6366f1', textColor: '#ffffff', nextStep: null, fullWidth: true, rounded: 'xl' };
    case 'arrow_button': return { ...base, text: 'Avançar', direction: 'right', style: 'pill', bg: '#f97316', textColor: '#ffffff', showIcon: true, fullWidth: true, nextStep: null };
    case 'divider':     return { ...base, color: '#334155', thickness: 1 };
    case 'progress':    return { ...base, current: 1, total: 5, color: '#6366f1', bg: '#1e293b', showLabel: true };
    case 'animated_progress': return { ...base, startVal: 0, endVal: 84, duration: 5, text: '{pct}% das vagas preenchidas...', bg: '#e2e8f0', color: '#ff0000', textColor: '#ffffff', rounded: 'full', border: '#cbd5e1', delay: 0 };
    case 'live_counter':return { ...base, text: 'pessoas assistindo', minAmount: 40, maxAmount: 60, color: '#ef4444', textColor: '#94a3b8', align: 'center', bg: 'transparent', textSize: 14, countMode: 'random' };
    case 'spacer':      return { ...base, height: 40 };
    case 'lead_capture':return { ...base, fields: ['name', 'email', 'phone'], buttonText: 'Quero meu resultado →', buttonBg: '#6366f1' };
    case 'result':      return { ...base, heading: '🎉 Parabéns!', text: 'Você está pronto para dar o próximo passo.', buttonText: 'Acessar agora →', buttonUrl: '#', buttonBg: '#10b981', enableLoading: false, loadingText: 'Analisando suas respostas...', loadingDuration: 3 };
    case 'checkbox_selector': return { ...base,
      multiSelect: true,
      minSelect: 1,
      confirmText: 'Confirmar →',
      confirmBg: '#6366f1',
      confirmTextColor: '#ffffff',
      itemBg: 'transparent',
      itemBorder: '#334155',
      itemSelectedBg: '#6366f1',
      itemSelectedBorder: '#6366f1',
      itemTextColor: '#ffffff',
      itemRadius: 14,
      checkboxStyle: 'square',
      nextStep: null,
      options: [
        { id: 'opt_1', text: 'Opção 1', scoreTarget: '' },
        { id: 'opt_2', text: 'Opção 2', scoreTarget: '' },
        { id: 'opt_3', text: 'Opção 3', scoreTarget: '' },
      ]
    };
    case 'testimonial_carousel': return { ...base,
      badge: 'PROVA REAL',
      badgeDot: true,
      title: 'Veja o que muda quando você toma uma decisão',
      subtitle: 'Depoimentos reais de alunos',
      filterButtons: [
        { id: 'fb_1', label: 'Todas', emoji: '' },
        { id: 'fb_2', label: 'Financeiro', emoji: '💰' },
        { id: 'fb_3', label: 'Saúde', emoji: '❤️' },
      ],
      showFilterButtons: true,
      cardBg: '#1e293b',
      cardBorder: '#334155',
      footerNote: 'Cada história é diferente. Mas todas têm algo em comum: precisaram entender o que estava por trás.',
      testimonials: [
        {
          id: 'tm_1',
          category: 'Financeiro',
          categoryEmoji: '💰',
          videoSrc: '',
          videoAutoplay: true,
          videoMuted: true,
          videoUnmuteText: '🔊 Clique para ouvir',
          personName: 'Maria, 52 anos',
          title: 'Transformou minha relação com o dinheiro',
          quote: '"Eu ganhava bem e nunca sobrava nada. Depois que entendi o padrão que me fazia gastar, mudou tudo."',
          authorName: 'Maria C.',
          authorRole: 'Enfermeira',
          authorCity: 'São Paulo, SP',
          authorPhoto: '',
        },
        {
          id: 'tm_2',
          category: 'Saúde',
          categoryEmoji: '❤️',
          videoSrc: '',
          videoAutoplay: true,
          videoMuted: true,
          videoUnmuteText: '🔊 Clique para ouvir',
          personName: 'João, 38 anos',
          title: 'Perdi 12kg sem academia',
          quote: '"Tentei de tudo antes. Mas quando entendi o que me sabotava, tudo ficou mais fácil."',
          authorName: 'João S.',
          authorRole: 'Engenheiro',
          authorCity: 'Belo Horizonte, MG',
          authorPhoto: '',
        },
      ]
    };
    case 'image_button_selector': return { ...base,
      columns: 3,
      multiSelect: false,
      minSelect: 1,
      cardBg: 'transparent',
      cardBorder: '#334155',
      cardSelectedBg: '#6366f120',
      cardSelectedBorder: '#6366f1',
      textColor: '#ffffff',
      cardRadius: 16,
      nextStep: null,
      showCheckbox: false,
      checkboxStyle: 'circle',
      options: [
        { id: 'opt_1', text: 'Opção 1', imageSrc: '', scoreTarget: '' },
        { id: 'opt_2', text: 'Opção 2', imageSrc: '', scoreTarget: '' },
        { id: 'opt_3', text: 'Opção 3', imageSrc: '', scoreTarget: '' },
      ]
    };
    case 'animated_metrics': return { ...base,
      mode: 'donut',
      boxBg: 'transparent',
      boxBorder: 'transparent',
      boxRadius: 16,
      metrics: [
        { id: 'm_1', value: 30, color: '#ef4444', bgColor: '#334155', text: 'Desempenho antes', textColor: '#94a3b8' },
        { id: 'm_2', value: 100, color: '#22c55e', bgColor: '#334155', text: 'Com nosso método', textColor: '#94a3b8' },
      ]
    };
    case 'image_carousel': return { ...base,
      aspectRatio: '16/9',
      objectFit: 'cover',
      showDots: true,
      showArrows: true,
      autoplay: false,
      autoplaySpeed: 3000,
      images: [
        { id: 'img_1', url: '' },
      ]
    };
    default:            return base;
  }
}


const SortableBlock = React.memo(function SortableBlock({ block, isSelected, onSelect, onDelete, onClone }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const typeInfo = BLOCK_TYPES.find(t => t.type === block.type) || BLOCK_TYPES[0];
  const Icon = typeInfo.icon;

  return (
    <div ref={setNodeRef} style={style}
      onClick={() => onSelect(block.id)}
      className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all duration-200 select-none ${isSelected ? 'bg-indigo-500/10 border-indigo-500/40 shadow-[0_0_12px_rgba(99,102,241,0.15)]' : 'bg-slate-800/30 border-slate-700/40 hover:border-slate-600 hover:bg-slate-800/60'}`}>
      {/* Drag handle */}
      <button {...attributes} {...listeners}
        className="text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing touch-none shrink-0 focus:outline-none"
        aria-label="Arrastar bloco">
        <GripVertical size={14} />
      </button>
      {/* Icon + Label */}
      <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: typeInfo.color + '20' }}>
        <Icon size={13} style={{ color: typeInfo.color }} />
      </div>
      <span className="text-xs font-medium text-slate-300 flex-1 truncate">{typeInfo.label}</span>
      {/* Clone + Delete on hover */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-150">
        <button onClick={e => { e.stopPropagation(); onClone(block.id); }}
          aria-label="Duplicar bloco"
          className="w-5 h-5 rounded hover:text-blue-400 text-slate-600 transition-all duration-150 flex items-center justify-center focus:outline-none focus:text-blue-400">
          <Copy size={11} />
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete(block.id); }}
          aria-label="Remover bloco"
          className="w-5 h-5 rounded hover:text-red-400 text-slate-600 transition-all duration-150 flex items-center justify-center focus:outline-none focus:text-red-400">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
});

const SortableStep = React.memo(function SortableStep({ step, idx, currentStepIdx, onClick, updateLabel, onClone, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  
  return (
    <div ref={setNodeRef} style={style}
      onClick={onClick}
      className={`group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all border ${idx === currentStepIdx ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300' : 'bg-transparent hover:bg-slate-800/60 text-slate-400 border-transparent'}`}>
      
      <button {...attributes} {...listeners}
        onClick={e => e.stopPropagation()}
        className="text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing touch-none shrink-0 focus:outline-none"
        aria-label="Arrastar etapa">
        <GripVertical size={12} />
      </button>

      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${idx === currentStepIdx ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-400'}`}>{idx + 1}</div>
      <input value={step.label} onClick={e => e.stopPropagation()}
        onChange={e => updateLabel(idx, e.target.value)}
        className="flex-1 bg-transparent text-xs truncate outline-none"
        placeholder={`Etapa ${idx + 1}`} />
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
        <button onClick={e => { e.stopPropagation(); onClone(idx); }}
          className="hover:text-blue-400 cursor-pointer focus:outline-none"
          aria-label="Duplicar etapa">
          <Copy size={11} />
        </button>
        <button onClick={e => { e.stopPropagation(); if (onDelete) onDelete(idx); }}
          className="hover:text-red-400 cursor-pointer focus:outline-none"
          aria-label="Remover etapa">
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
});

export default function QuizBuilder({ quiz, domain, onBack }) {
  const DRAFT_KEY = `quiz_draft_${quiz.id || 'new'}`;
  const EDIT_STATE_KEY = `quiz_edit_state_${quiz.id || 'new'}`;

  // ── Undo/Redo ─────────────────────────────────────────────────────────────
  const historyStack = useRef([]);
  const historyIdx = useRef(-1);
  const skipPush = useRef(false);

  const activeQuizId = useRef(quiz.id || null);
  const serverUpdatedAt = useRef(quiz.updated_at || null); // para optimistic locking
  const [syncStatus, setSyncStatus] = useState('saved'); // 'saved' | 'saving' | 'error' | 'conflict'
  const [conflictInfo, setConflictInfo] = useState(null); // { message, server_title, server_config }
  const isFirstRender = useRef(true);
  const debounceRef = useRef(null);

  const [title, setTitle] = useState(quiz.title || 'Novo Quiz');
  const [slug, setSlug] = useState(quiz.slug || '');

  const [config, setConfigRaw] = useState(() => {
    try {
      const parsed = JSON.parse(quiz.config_json || '{}');
      const cfg = {
        theme: parsed.theme || { bg: '#0f172a', accent: '#6366f1', text: '#f8fafc', bgImage: '' },
        settings: parsed.settings || { saveProgress: false },
        steps: parsed.steps || [{ id: 'step_1', label: 'Etapa 1', blocks: [] }],
      };
      historyStack.current = [cfg];
      historyIdx.current = 0;
      return cfg;
    } catch {
      const cfg = { theme: { bg: '#0f172a', accent: '#6366f1', text: '#f8fafc', bgImage: '' }, settings: { saveProgress: false }, steps: [{ id: 'step_1', label: 'Etapa 1', blocks: [] }] };
      historyStack.current = [cfg];
      historyIdx.current = 0;
      return cfg;
    }
  });

  // ── setConfig wrapper that records history ─────────────────────────────────
  const setConfig = useCallback((updater) => {
    setConfigRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (!skipPush.current) {
        historyStack.current = historyStack.current.slice(0, historyIdx.current + 1);
        historyStack.current.push(next);
        if (historyStack.current.length > 50) historyStack.current.shift();
        historyIdx.current = historyStack.current.length - 1;
      }
      return next;
    });
  }, []);

  const [historyVersion, setHistoryVersion] = useState(0); // triggers re-render for button states
  const canUndo = historyIdx.current > 0;
  const canRedo = historyIdx.current < historyStack.current.length - 1;

  const undo = useCallback(() => {
    if (historyIdx.current <= 0) return;
    historyIdx.current -= 1;
    skipPush.current = true;
    setConfigRaw(historyStack.current[historyIdx.current]);
    skipPush.current = false;
    setHistoryVersion(v => v + 1);
  }, []);

  const redo = useCallback(() => {
    if (historyIdx.current >= historyStack.current.length - 1) return;
    historyIdx.current += 1;
    skipPush.current = true;
    setConfigRaw(historyStack.current[historyIdx.current]);
    skipPush.current = false;
    setHistoryVersion(v => v + 1);
  }, []);

  // ── Keyboard shortcuts Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z ────────────────────
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
      if (e.ctrlKey && !e.shiftKey && e.key === 'z') { e.preventDefault(); undo(); }
      if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  // ── Auto-save (debounced 1500ms) ─────────────────────────────────────────
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setSyncStatus('saving');
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const config_json = JSON.stringify(config);
        const finalTitle = title || 'Novo Quiz';
        const finalSlug = slug ? slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/(^-|-$)/g, '') : '';
        const API = '/api';

        if (activeQuizId.current) {
          const res = await fetch(`${API}/quizzes/${activeQuizId.current}`, { 
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ title: finalTitle, slug: finalSlug, config_json, is_active: 1, client_updated_at: serverUpdatedAt.current }) 
          });
          if (res.status === 409) {
            const data = await res.json();
            setSyncStatus('conflict');
            setConflictInfo({ message: data.message, server_title: data.server_title, server_config: data.server_config, server_updated_at: data.server_updated_at });
          } else if (res.ok) {
            const data = await res.json();
            if (data.updated_at) serverUpdatedAt.current = data.updated_at;
            setSyncStatus('saved');
            setConflictInfo(null);
          } else {
            setSyncStatus('error');
          }
        } else {
          // POST para criar novo
          const res = await fetch(`${API}/quizzes`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ title: finalTitle, slug: finalSlug, config_json, is_active: 1 }) 
          });
          if (res.ok) {
            const data = await res.json();
            activeQuizId.current = data.id || data.quiz_id;
            if (activeQuizId.current) {
              localStorage.setItem('admin_editing_quiz_id', activeQuizId.current);
            }
            setSyncStatus('saved');
          } else {
            setSyncStatus('error');
          }
        }
      } catch (e) {
        setSyncStatus('error');
      }
    }, 1500);
    return () => clearTimeout(debounceRef.current);
  }, [config, title, slug]);

  // ── Persist editing position ───────────────────────────────────────────────
  const [currentStepIdx, setCurrentStepIdx] = useState(() => {
    try { return JSON.parse(localStorage.getItem(EDIT_STATE_KEY) || '{}').stepIdx || 0; } catch { return 0; }
  });
  const [selectedBlockId, setSelectedBlockId] = useState(() => {
    try { return JSON.parse(localStorage.getItem(EDIT_STATE_KEY) || '{}').blockId || null; } catch { return null; }
  });

  useEffect(() => {
    localStorage.setItem(EDIT_STATE_KEY, JSON.stringify({ stepIdx: currentStepIdx, blockId: selectedBlockId }));
  }, [currentStepIdx, selectedBlockId]);

  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState('blocks');
  const [previewScores, setPreviewScores] = useState({});

  const handlePreviewNavigate = (targetId, _dummyText, _dummyLoading, scoreTarget) => {
    if (scoreTarget) {
      setPreviewScores(prev => ({
        ...prev,
        [scoreTarget]: (prev[scoreTarget] || 0) + 1
      }));
    }
    const idx = config.steps.findIndex(s => s.id === targetId);
    if (idx !== -1) {
      setCurrentStepIdx(idx);
      setSelectedBlockId(null);
    }
  };

  const currentStep = useMemo(() => config.steps[currentStepIdx], [config.steps, currentStepIdx]);
  const selectedBlock = useMemo(() => currentStep?.blocks.find(b => b.id === selectedBlockId) || null, [currentStep, selectedBlockId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );


  // ── Step helpers ─────────────────────────────────────────────────────────
  const addStep = () => {
    const newStep = { id: `step_${Date.now()}`, label: `Etapa ${config.steps.length + 1}`, blocks: [] };
    setConfig(c => ({ ...c, steps: [...c.steps, newStep] }));
    setCurrentStepIdx(config.steps.length);
    setSelectedBlockId(null);
  };

  const deleteStep = (idx) => {
    if(config.steps.length <= 1) return;
    if(!confirm('Deletar esta etapa?')) return;
    setConfig(c => ({ ...c, steps: c.steps.filter((_, i) => i !== idx) }));
    if(currentStepIdx >= config.steps.length - 1) setCurrentStepIdx(Math.max(0, config.steps.length - 2));
    setSelectedBlockId(null);
  };

  const cloneStep = (idx) => {
    const stepToClone = config.steps[idx];
    if (!stepToClone) return;

    // Fazer deep clone dos blocos e gerar novos IDs únicos
    const clonedBlocks = stepToClone.blocks.map(b => ({
      ...b,
      id: Math.random().toString(36).substr(2, 9),
      options: b.options ? b.options.map(opt => ({ ...opt })) : undefined
    }));

    const newStep = {
      id: Math.random().toString(36).substr(2, 9),
      label: stepToClone.label + ' (Cópia)',
      blocks: clonedBlocks
    };

    setConfig(c => {
      const newSteps = [...c.steps];
      newSteps.splice(idx + 1, 0, newStep);
      return { ...c, steps: newSteps };
    });
    
    // Focar na nova etapa criada
    setCurrentStepIdx(idx + 1);
    setSelectedBlockId(null);
  };

  const updateStepLabel = (idx, label) => {
    setConfig(c => ({ ...c, steps: c.steps.map((s, i) => i === idx ? { ...s, label } : s) }));
  };

  // ── Block helpers ─────────────────────────────────────────────────────────
  const addBlock = (type) => {
    const block = createBlock(type);
    setConfig(c => ({
      ...c,
      steps: c.steps.map((s, i) => i === currentStepIdx ? { ...s, blocks: [...s.blocks, block] } : s)
    }));
    setSelectedBlockId(block.id);
  };

  const deleteBlock = (blockId) => {
    setConfig(c => ({
      ...c,
      steps: c.steps.map((s, i) => i === currentStepIdx ? { ...s, blocks: s.blocks.filter(b => b.id !== blockId) } : s)
    }));
    if (selectedBlockId === blockId) setSelectedBlockId(null);
  };

  const cloneBlock = (blockId) => {
    setConfig(c => ({
      ...c,
      steps: c.steps.map((s, i) => {
        if (i !== currentStepIdx) return s;
        const blockToClone = s.blocks.find(b => b.id === blockId);
        if (!blockToClone) return s;
        
        const blockIndex = s.blocks.findIndex(b => b.id === blockId);
        const clonedBlock = {
          ...blockToClone,
          id: `block_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        };
        
        const newBlocks = [...s.blocks];
        newBlocks.splice(blockIndex + 1, 0, clonedBlock);
        
        return { ...s, blocks: newBlocks };
      })
    }));
  };

  const updateBlock = useCallback((blockId, patch) => {
    setConfig(c => ({
      ...c,
      steps: c.steps.map((s, i) => i === currentStepIdx
        ? { ...s, blocks: s.blocks.map(b => b.id === blockId ? { ...b, ...patch } : b) } : s)
    }));
  }, [currentStepIdx]);

  const handleStepDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    
    setConfig(c => {
      const oldIdx = c.steps.findIndex(s => s.id === active.id);
      const newIdx = c.steps.findIndex(s => s.id === over.id);
      
      const activeStep = c.steps[currentStepIdx];
      const newSteps = arrayMove(c.steps, oldIdx, newIdx);
      const newCurrentIdx = newSteps.findIndex(s => s.id === activeStep.id);
      
      setCurrentStepIdx(newCurrentIdx);
      return { ...c, steps: newSteps };
    });
  }, [currentStepIdx]);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setConfig(c => ({
      ...c,
      steps: c.steps.map((s, i) => {
        if (i !== currentStepIdx) return s;
        const oldIdx = s.blocks.findIndex(b => b.id === active.id);
        const newIdx = s.blocks.findIndex(b => b.id === over.id);
        return { ...s, blocks: arrayMove(s.blocks, oldIdx, newIdx) };
      })
    }));
  }, [currentStepIdx]);



  if (showPreview) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
        <button onClick={() => setShowPreview(false)}
          className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-sm text-white transition-all cursor-pointer">
          <EyeOff size={15} /> Fechar Preview
        </button>
        <div className="scale-100">
          <QuizPreview config={config} stepIdx={currentStepIdx} selectedBlockId={selectedBlockId} onNavigate={handlePreviewNavigate} scores={previewScores} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      <div className="flex flex-1 overflow-hidden">

      {/* ── LEFT PANEL: Steps + Blocks ───────────────────────────────── */}
      <div className="w-64 shrink-0 border-r border-white/5 bg-slate-900/70 flex flex-col backdrop-blur-xl">
        {/* Header */}
        <div className="h-14 flex items-center gap-2 px-3 border-b border-white/5 shrink-0">
          <button onClick={onBack}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Voltar">
            <ChevronLeft size={16} />
          </button>
          <div className="flex-1 flex flex-col justify-center min-w-0">
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="bg-transparent text-sm font-semibold text-white outline-none w-full truncate focus:text-indigo-300 transition-colors"
              placeholder="Nome do Quiz" />
            <div className="flex items-center text-[10px] text-slate-500 mt-0.5" title="Link ou URL slug do quiz">
              <span className="shrink-0">{domain ? domain + '/' : '/'}</span>
              <input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                className="bg-transparent text-emerald-400 outline-none w-full truncate hover:text-emerald-300 focus:text-indigo-400 transition-colors font-mono"
                placeholder="nome-do-quiz" spellCheck="false" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 shrink-0">
          {[{ id: 'blocks', label: 'Etapas', icon: Layers }, { id: 'theme', label: 'Tema', icon: Palette }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all cursor-pointer focus:outline-none ${activeTab === tab.id ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300'}`}>
              <tab.icon size={13} /> {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'blocks' && (
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Step Tabs */}
            <div className="p-2 space-y-1 border-b border-white/5">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleStepDragEnd}>
                <SortableContext items={config.steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  {config.steps.map((step, idx) => (
                    <SortableStep
                      key={step.id}
                      step={step}
                      idx={idx}
                      currentStepIdx={currentStepIdx}
                      onClick={() => { setCurrentStepIdx(idx); setSelectedBlockId(null); }}
                      updateLabel={updateStepLabel}
                      onClone={cloneStep}
                      onDelete={deleteStep}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              <button onClick={addStep}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/5 transition-all cursor-pointer border border-dashed border-slate-700 hover:border-indigo-500/40 focus:outline-none">
                <Plus size={12} /> Adicionar Etapa
              </button>
            </div>

            {/* Block List (Sortable) */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              <p className="text-xs text-slate-600 px-1 pt-1 font-medium">Blocos da etapa {currentStepIdx + 1}</p>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={currentStep?.blocks.map(b => b.id) || []} strategy={verticalListSortingStrategy}>
                  {(currentStep?.blocks || []).map(block => (
                    <SortableBlock key={block.id} block={block}
                      isSelected={selectedBlockId === block.id}
                      onSelect={setSelectedBlockId}
                      onDelete={deleteBlock}
                      onClone={cloneBlock} />
                  ))}
                </SortableContext>
              </DndContext>
              {(currentStep?.blocks || []).length === 0 && (
                <div className="flex flex-col items-center py-6 text-center text-slate-700">
                  <Layers size={24} className="mb-2 opacity-40" />
                  <p className="text-xs">Adicione blocos na paleta →</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'theme' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-5 text-xs">

            {/* ── Tipo de Fundo ── */}
            <div className="space-y-2">
              <p className="text-slate-500 font-semibold uppercase tracking-wider">Tipo de Fundo</p>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { v: 'solid',    label: 'Cor Sólida' },
                  { v: 'gradient', label: 'Degradê' },
                  { v: 'image',    label: 'Imagem' },
                ].map(({ v, label }) => (
                  <button key={v} onClick={() => setConfig(c => ({ ...c, theme: { ...c.theme, bgType: v } }))}
                    className={`py-2 rounded-lg border text-center transition-all cursor-pointer focus:outline-none ${(config.theme.bgType || 'solid') === v ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-slate-800/40 border-slate-700/40 text-slate-500 hover:border-slate-600'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Cor Sólida ── */}
            {(config.theme.bgType || 'solid') === 'solid' && (
              <div className="space-y-3">
                <p className="text-slate-500 font-semibold uppercase tracking-wider">Cor de Fundo</p>
                <div className="flex items-center justify-between">
                  <label className="text-slate-400">Cor</label>
                  <input type="color" value={config.theme.bg || '#0f172a'}
                    onChange={e => setConfig(c => ({ ...c, theme: { ...c.theme, bg: e.target.value } }))}
                    className="w-10 h-10 rounded-xl border border-slate-700 cursor-pointer bg-transparent" />
                </div>
              </div>
            )}

            {/* ── Degradê ── */}
            {config.theme.bgType === 'gradient' && (
              <div className="space-y-3">
                <p className="text-slate-500 font-semibold uppercase tracking-wider">Degradê</p>
                <div className="flex items-center justify-between">
                  <label className="text-slate-400">Cor 1 (início)</label>
                  <input type="color" value={config.theme.gradientFrom || '#0f172a'}
                    onChange={e => setConfig(c => ({ ...c, theme: { ...c.theme, gradientFrom: e.target.value } }))}
                    className="w-10 h-10 rounded-xl border border-slate-700 cursor-pointer bg-transparent" />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-slate-400">Cor 2 (fim)</label>
                  <input type="color" value={config.theme.gradientTo || '#6366f1'}
                    onChange={e => setConfig(c => ({ ...c, theme: { ...c.theme, gradientTo: e.target.value } }))}
                    className="w-10 h-10 rounded-xl border border-slate-700 cursor-pointer bg-transparent" />
                </div>
                {/* Preview do degradê */}
                <div className="h-10 rounded-xl border border-slate-700/50"
                  style={{ background: `linear-gradient(${config.theme.gradientAngle || 135}deg, ${config.theme.gradientFrom || '#0f172a'}, ${config.theme.gradientTo || '#6366f1'})` }} />
                <div className="space-y-1.5">
                  <label className="text-slate-400">Direção do Degradê</label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { label: '↑', angle: 0 },   { label: '↗', angle: 45 },  { label: '→', angle: 90 },
                      { label: '↘', angle: 135 },  { label: '↓', angle: 180 }, { label: '↙', angle: 225 },
                      { label: '←', angle: 270 },  { label: '↖', angle: 315 }, { label: '⟳', angle: null },
                    ].map(({ label, angle }) => (
                      <button key={label}
                        onClick={() => {
                          if (angle === null) return; // circular — custom
                          setConfig(c => ({ ...c, theme: { ...c.theme, gradientAngle: angle } }));
                        }}
                        className={`py-1.5 rounded-lg border text-center text-sm font-bold transition-all cursor-pointer ${(config.theme.gradientAngle || 135) === angle ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-slate-800/40 border-slate-700/40 text-slate-500 hover:border-slate-600'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Imagem de Fundo ── */}
            {config.theme.bgType === 'image' && (
              <div className="space-y-3">
                <p className="text-slate-500 font-semibold uppercase tracking-wider">Imagem de Fundo</p>

                {/* Upload do computador */}
                <div className="space-y-1.5">
                  <label className="text-slate-400">Selecionar do Computador</label>
                  <label className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-dashed border-slate-600 hover:border-indigo-500/50 text-slate-500 hover:text-indigo-400 transition-all cursor-pointer bg-slate-800/30 hover:bg-slate-800/60">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    {config.theme.bgImage ? 'Trocar Imagem' : 'Clique para Carregar'}
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = ev => setConfig(c => ({ ...c, theme: { ...c.theme, bgImage: ev.target.result } }));
                        reader.readAsDataURL(file);
                      }} />
                  </label>
                </div>

                {/* OU URL */}
                <div className="space-y-1.5">
                  <label className="text-slate-400">Ou cole uma URL</label>
                  <input value={config.theme.bgType === 'image' && !config.theme.bgImage?.startsWith('data:') ? config.theme.bgImage || '' : ''}
                    placeholder="https://..."
                    onChange={e => setConfig(c => ({ ...c, theme: { ...c.theme, bgImage: e.target.value } }))}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 transition-colors" />
                </div>

                {/* Preview da imagem selecionada */}
                {config.theme.bgImage && (
                  <div className="relative rounded-xl overflow-hidden border border-slate-700/50" style={{ height: 80 }}>
                    <img src={config.theme.bgImage} alt="Fundo" className="w-full h-full object-cover" />
                    <button onClick={() => setConfig(c => ({ ...c, theme: { ...c.theme, bgImage: '' } }))}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600/80 hover:bg-red-500 text-white flex items-center justify-center cursor-pointer text-xs">×</button>
                  </div>
                )}

                {/* Ajuste de Posição */}
                {config.theme.bgImage && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-slate-400">Posição da Imagem</label>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { label: '↖', pos: 'top left' },    { label: '↑', pos: 'top center' },    { label: '↗', pos: 'top right' },
                          { label: '←', pos: 'center left' },  { label: '●', pos: 'center center' },  { label: '→', pos: 'center right' },
                          { label: '↙', pos: 'bottom left' },  { label: '↓', pos: 'bottom center' },  { label: '↘', pos: 'bottom right' },
                        ].map(({ label, pos }) => (
                          <button key={pos}
                            onClick={() => setConfig(c => ({ ...c, theme: { ...c.theme, bgPosition: pos } }))}
                            className={`py-1.5 rounded-lg border text-center text-sm transition-all cursor-pointer ${(config.theme.bgPosition || 'center center') === pos ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-slate-800/40 border-slate-700/40 text-slate-500 hover:border-slate-600'}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-400">Ajuste (Tamanho)</label>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { label: 'Cover', val: 'cover' },
                          { label: 'Contain', val: 'contain' },
                          { label: 'Preencher', val: '100% 100%' },
                        ].map(({ label, val }) => (
                          <button key={val}
                            onClick={() => setConfig(c => ({ ...c, theme: { ...c.theme, bgSize: val } }))}
                            className={`py-1.5 rounded-lg border text-center transition-all cursor-pointer ${(config.theme.bgSize || 'cover') === val ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-slate-800/40 border-slate-700/40 text-slate-500 hover:border-slate-600'}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Overlay (para imagem e degradê também) ── */}
            {(config.theme.bgType === 'image' || config.theme.bgType === 'gradient') && (
              <div className="space-y-3 border-t border-slate-700/40 pt-4">
                <p className="text-slate-500 font-semibold uppercase tracking-wider">Overlay</p>
                <div className="flex items-center justify-between">
                  <label className="text-slate-400">Cor do Overlay</label>
                  <input type="color" value={config.theme.overlayColor || '#000000'}
                    onChange={e => setConfig(c => ({ ...c, theme: { ...c.theme, overlayColor: e.target.value } }))}
                    className="w-10 h-10 rounded-xl border border-slate-700 cursor-pointer bg-transparent" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-slate-400">Opacidade</label>
                    <span className="text-indigo-400 font-mono">{Math.round((config.theme.overlayOpacity ?? 0.45) * 100)}%</span>
                  </div>
                  <input type="range" min="0" max="1" step="0.05"
                    value={config.theme.overlayOpacity ?? 0.45}
                    onChange={e => setConfig(c => ({ ...c, theme: { ...c.theme, overlayOpacity: Number(e.target.value) } }))}
                    className="w-full accent-indigo-500 cursor-pointer" />
                </div>
              </div>
            )}

            {/* ── Cor de Destaque e Texto ── */}
            <div className="space-y-3 border-t border-slate-700/40 pt-4">
              <p className="text-slate-500 font-semibold uppercase tracking-wider">Cores Globais</p>
              {[
                { label: 'Cor de Destaque', key: 'accent' },
                { label: 'Cor do Texto', key: 'text' },
              ].map(({ label, key }) => (
                <div key={key} className="flex items-center justify-between">
                  <label className="text-slate-400">{label}</label>
                  <input type="color" value={config.theme[key] || '#ffffff'}
                    onChange={e => setConfig(c => ({ ...c, theme: { ...c.theme, [key]: e.target.value } }))}
                    className="w-10 h-10 rounded-xl border border-slate-700 cursor-pointer bg-transparent" />
                </div>
              ))}
            </div>

            {/* ── Comportamento (Progresso) ── */}
            <div className="space-y-3 border-t border-slate-700/40 pt-4 pb-4">
              <p className="text-slate-500 font-semibold uppercase tracking-wider">Comportamento</p>
              <div className="flex items-center justify-between">
                <div className="flex flex-col mr-2">
                  <label className="text-slate-400">Salvar Progresso do Lead</label>
                  <span className="text-[10px] text-slate-500 mt-0.5 leading-tight">Se ativo, ao recarregar a página mantém a última etapa e trava o botão de voltar.</span>
                </div>
                <button onClick={() => setConfig(c => ({ ...c, settings: { ...c.settings, saveProgress: !(c.settings?.saveProgress ?? false) } }))}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${(config.settings?.saveProgress ?? false) ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${(config.settings?.saveProgress ?? false) ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ── CENTER: Block Palette + Editor ───────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-white/5">
        {/* Toolbar */}
        <div className="h-14 border-b border-white/5 flex items-center justify-between px-5 shrink-0 bg-slate-900/30 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">Editando:</span>
            <span className="text-sm font-semibold text-white">{currentStep?.label}</span>
            <span className="text-xs text-slate-600">• {currentStep?.blocks.length || 0} blocos</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Undo / Redo */}
            <button onClick={undo} disabled={!canUndo} title="Desfazer (Ctrl+Z)"
              className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-all cursor-pointer focus:outline-none ${
                canUndo ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-900 border-slate-800 text-slate-700 cursor-not-allowed'
              }`}>
              <Undo2 size={14} />
            </button>
            <button onClick={redo} disabled={!canRedo} title="Refazer (Ctrl+Y)"
              className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-all cursor-pointer focus:outline-none ${
                canRedo ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-900 border-slate-800 text-slate-700 cursor-not-allowed'
              }`}>
              <Redo2 size={14} />
            </button>
            <div className="w-px h-5 bg-slate-700 mx-1" />
            <button onClick={() => setShowPreview(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm text-slate-300 hover:text-white transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-500">
              <Eye size={14} /> Preview
            </button>
            <div className="flex items-center gap-2 px-4 h-9 bg-slate-800/50 border border-slate-700/50 rounded-xl">
              {syncStatus === 'saving' && <span className="text-slate-400 text-xs font-semibold flex items-center gap-1.5"><RefreshCw size={12} className="animate-spin" /> Salvando...</span>}
              {syncStatus === 'saved' && <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1.5"><Cloud size={14} /> Salvo</span>}
              {syncStatus === 'error' && <span className="text-red-400 text-xs font-semibold flex items-center gap-1.5"><AlertCircle size={12} /> Erro ao salvar</span>}
              {syncStatus === 'conflict' && <span className="text-amber-400 text-xs font-semibold flex items-center gap-1.5"><AlertCircle size={12} /> Conflito!</span>}
            </div>
            <button onClick={onBack}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-sm font-medium transition-all cursor-pointer">
              Sair
            </button>
          </div>
        </div>

        {/* CONFLICT BANNER */}
        {conflictInfo && (
          <div className="shrink-0 flex items-center gap-3 px-5 py-3 bg-amber-500/10 border-b border-amber-500/30">
            <AlertCircle size={16} className="text-amber-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-amber-300 text-xs font-semibold">⚠️ Conflito de edição detectado!</p>
              <p className="text-amber-400/80 text-[11px] mt-0.5 leading-snug">Outro usuário salvou alterações enquanto você editava. Suas mudanças não foram salvas para evitar perda de dados.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  if (confirm('Isso vai descartar suas alterações locais e carregar a versão mais recente. Continuar?')) {
                    window.location.reload();
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all cursor-pointer">
                Recarregar versão recente
              </button>
              <button
                onClick={() => setConflictInfo(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium transition-all cursor-pointer">
                Ignorar
              </button>
            </div>
          </div>
        )}

        {/* Main editor area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Block Palette */}
          <div className="w-52 shrink-0 border-r border-white/5 bg-slate-900/30 overflow-y-auto p-3">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-3 px-1">+ Adicionar Bloco</p>
            <div className="grid grid-cols-2 gap-1.5">
              {BLOCK_TYPES.map(({ type, label, icon: Icon, color }) => (
                <button key={type} onClick={() => addBlock(type)}
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-700/40 hover:border-slate-600 transition-all group cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label={`Adicionar bloco ${label}`}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 will-change-transform" style={{ background: color + '25' }}>
                    <Icon size={16} style={{ color }} />
                  </div>
                  <span className="text-xs text-slate-400 group-hover:text-white text-center leading-tight transition-colors">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Block Editor Panel */}
          <div className="flex-1 overflow-y-auto p-5">
            {selectedBlock ? (
              <BlockEditor
                block={selectedBlock}
                theme={config.theme}
                steps={config.steps}
                currentStepIdx={currentStepIdx}
                onChange={patch => updateBlock(selectedBlock.id, patch)}
              />
            ) : (
              <div className="flex flex-col gap-5 max-w-lg mx-auto mt-4 px-2">
                <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-5 mb-4 shadow-sm">
                  <div className="flex items-center gap-3 border-b border-slate-700/50 pb-4 mb-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                      <Settings size={20} />
                    </div>
                    <div>
                      <h2 className="text-white font-semibold flex items-center gap-2">Configurações da Etapa {currentStepIdx + 1}</h2>
                      <p className="text-xs text-slate-400">Personalize o comportamento desta etapa</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-xs text-slate-400 font-medium tracking-wide uppercase">Caminho no Funil</label>
                      <select 
                        value={currentStep?.isVariant ? 'variant' : 'normal'}
                        onChange={e => {
                          const isVariant = e.target.value === 'variant';
                          setConfig(c => ({
                            ...c, steps: c.steps.map((s, i) => i === currentStepIdx ? { ...s, isVariant } : s)
                          }));
                        }}
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg py-3 px-3 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="normal">Padrão → Continua para a próxima etapa em ordem</option>
                        <option value="variant">Variante de Resultado → Apenas no final do Quiz</option>
                      </select>
                      <p className="text-xs text-slate-500 mt-2">
                        Se marcada como <strong className="text-slate-400">Variante de Resultado</strong>, esta etapa ficará completamente invisível no "Próximo Passo", sendo destravada somente após o cômputo final dos pontos.
                      </p>
                    </div>

                    <div className="space-y-2 pt-4 border-t border-slate-700/50">
                      <label className="text-xs text-slate-400 font-medium tracking-wide uppercase flex items-center gap-2">
                        ✨ Animação de Entrada
                      </label>
                      <select 
                        value={currentStep?.animation || 'none'}
                        onChange={e => {
                          const animation = e.target.value;
                          setConfig(c => ({
                            ...c, steps: c.steps.map((s, i) => i === currentStepIdx ? { ...s, animation } : s)
                          }));
                        }}
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg py-3 px-3 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                      >
                        <optgroup label="— Básicas">
                          <option value="none">Nenhuma (Corte Seco)</option>
                          <option value="fadeIn">Surgir Suavemente (Fade In)</option>
                        </optgroup>
                        <optgroup label="— Deslizes">
                          <option value="slideUp">Deslizar de Baixo ↑</option>
                          <option value="slideDown">Deslizar de Cima ↓</option>
                          <option value="slideLeft">Deslizar da Direita →</option>
                          <option value="slideRight">Deslizar da Esquerda ←</option>
                        </optgroup>
                        <optgroup label="— Efeitos">
                          <option value="zoomIn">Aproximar (Zoom In)</option>
                          <option value="zoomOut">Afastar e Entrar (Zoom Out)</option>
                          <option value="flip">Giro 3D (Flip)</option>
                          <option value="rotateIn">Girar ao Entrar (Rotate In)</option>
                          <option value="bounceIn">Quique ao Entrar (Bounce In)</option>
                          <option value="elastic">Elástico (Elastic)</option>
                          <option value="blurIn">Desfocar para Nítido (Blur In)</option>
                        </optgroup>
                        <optgroup label="— Especiais">
                          <option value="stagger">✨ Item por Item (Stagger)</option>
                        </optgroup>
                      </select>

                      {currentStep?.animation && currentStep.animation !== 'none' && (
                        <div className="pt-2 space-y-1">
                          <label className="text-xs text-slate-500 flex justify-between">
                            <span>⚡ Velocidade</span>
                            <span className="text-indigo-400 font-semibold">
                              {currentStep?.animationSpeed === 'fast' ? 'Rápida' :
                               currentStep?.animationSpeed === 'slow' ? 'Lenta' :
                               currentStep?.animationSpeed === 'slower' ? 'Muito Lenta' : 'Normal'}
                            </span>
                          </label>
                          <select
                            value={currentStep?.animationSpeed || 'normal'}
                            onChange={e => {
                              const animationSpeed = e.target.value;
                              setConfig(c => ({
                                ...c, steps: c.steps.map((s, i) => i === currentStepIdx ? { ...s, animationSpeed } : s)
                              }));
                            }}
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                          >
                            <option value="fast">⚡ Rápida (0.25s)</option>
                            <option value="normal">🔄 Normal (0.5s)</option>
                            <option value="slow">🐌 Lenta (0.9s)</option>
                            <option value="slower">🐢 Muito Lenta (1.5s)</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {currentStep?.isVariant && (
                      <div className="space-y-2 pt-4 border-t border-slate-700/50">
                        <label className="text-xs text-indigo-300 font-bold uppercase tracking-wider flex items-center gap-2">
                          🎯 Qual Resultado Destrava esta Variante?
                        </label>
                        <input 
                          type="text"
                          value={currentStep?.variantScore || ''}
                          onChange={e => {
                            const val = e.target.value;
                            setConfig(c => ({
                              ...c, steps: c.steps.map((s, i) => i === currentStepIdx ? { ...s, variantScore: val } : s)
                            }));
                          }}
                          placeholder="Ex: Homem, Mulher, Aprovado..."
                          className="w-full bg-slate-950 border border-indigo-500/50 rounded-lg py-3 px-3 text-sm text-white focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 placeholder-slate-600"
                        />
                        <p className="text-[11px] text-indigo-400 mt-2">
                          O texto digitado acima deve ser escrito de forma <strong>idêntica</strong> ao que você colocou na aba "Dar Pontos se Escolhido" (Ação do Botão) nas etapas anteriores.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: Live Preview ────────────────────────────────── */}
      <div className="w-80 shrink-0 flex flex-col items-center justify-center bg-slate-900/20 gap-4 p-6">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Preview Live</p>
        <QuizPreview config={config} stepIdx={currentStepIdx} compact selectedBlockId={selectedBlockId} onNavigate={handlePreviewNavigate} scores={previewScores} />
        <div className="flex gap-2">
          {config.steps.map((_, idx) => (
            <button key={idx} onClick={() => setCurrentStepIdx(idx)}
              className={`w-1.5 h-1.5 rounded-full cursor-pointer transition-all ${idx === currentStepIdx ? 'bg-indigo-400 w-4' : 'bg-slate-600 hover:bg-slate-500'}`}
              aria-label={`Ir para etapa ${idx + 1}`} />
          ))}
        </div>
        <p className="text-xs text-slate-700">Etapa {currentStepIdx + 1} de {config.steps.length}</p>
      </div>

      </div>{/* end inner flex */}
    </div>
  );
}
