import React, { useState, useRef, useEffect } from 'react';
import EmojiPicker, { Emoji } from 'emoji-picker-react';
import { Trash2, CheckCircle2 } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { TextAlign } from '@tiptap/extension-text-align';
import { Placeholder } from '@tiptap/extension-placeholder';
import Cropper from 'react-easy-crop';
import getCroppedImg from './utils/cropImage';

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-slate-400">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 transition-colors"
    />
  );
}

function ColorPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value || '#ffffff'}
        onChange={e => onChange(e.target.value)}
        className="w-10 h-10 rounded-lg border border-slate-700 cursor-pointer bg-transparent"
      />
      <Input value={value} onChange={onChange} placeholder="#ffffff" />
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 cursor-pointer"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-400">{label}</span>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 40, height: 20,
          borderRadius: 999,
          background: value ? '#f97316' : '#334155',
          border: 'none',
          position: 'relative',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'background 0.2s',
          outline: 'none',
        }}
      >
        <span style={{
          position: 'absolute',
          top: 2,
          left: value ? 22 : 2,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          transition: 'left 0.2s',
          display: 'block',
        }} />
      </button>
    </div>
  );
}

function EmojiSelect({ emoji, unified, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  
  // local text state for the input
  const [textVal, setTextVal] = useState('');

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={ref}>
      <div className="flex gap-2">
        <label className="flex-1 flex items-center justify-between bg-slate-800/60 border border-slate-700 rounded-xl px-2 py-1 focus-within:border-indigo-500 transition-colors cursor-text">
          <div className="flex items-center gap-2 flex-1 w-full pl-1">
            <span 
              onClick={(e) => { e.preventDefault(); setOpen(true); }} 
              className="flex items-center justify-center w-7 h-7 cursor-pointer hover:opacity-80 transition-opacity"
              title="Abrir painel de emojis"
            >
              {unified ? <Emoji unified={unified} emojiStyle="apple" size={20} /> : (emoji || '🙂')}
            </span>
            <input 
              type="text"
              value={textVal}
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  onChange(val, ''); 
                }
                setTextVal(''); // Sempre limpa para não duplicar visualmente
              }}
              onFocus={() => setOpen(true)}
              placeholder="Cole o emoji aqui..."
              className="bg-transparent border-none text-sm text-white outline-none w-full py-1.5 placeholder-slate-500"
            />
          </div>
          <button type="button" onClick={() => setOpen(!open)} className="text-xs text-slate-500 px-2 cursor-pointer hover:text-white transition-colors">
            ▼
          </button>
        </label>

        {(emoji || unified) && (
          <button onClick={() => onChange('', '')} title="Remover emoji"
            className="w-9 h-9 flex items-center justify-center bg-red-600/20 hover:bg-red-600/40 border border-red-600/30 hover:border-red-500 rounded-xl text-red-400 text-sm transition-colors cursor-pointer flex-shrink-0">
            ✕
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 shadow-2xl rounded-lg overflow-hidden border border-slate-700">
          <EmojiPicker
            theme="dark"
            emojiStyle="apple"
            locale="pt"
            onEmojiClick={(e) => {
              onChange(e.emoji, e.unified);
              setOpen(false);
            }}
            searchPlaceHolder="Buscar emoji..."
            width={320}
            height={400}
            categories={[
              { category: 'suggested',      name: 'Recentes' },
              { category: 'smileys_people', name: 'Rostos & Pessoas' },
              { category: 'animals_nature', name: 'Animais & Natureza' },
              { category: 'food_drink',     name: 'Comida & Bebidas' },
              { category: 'travel_places',  name: 'Viagens & Lugares' },
              { category: 'activities',     name: 'Atividades' },
              { category: 'objects',        name: 'Objetos' },
              { category: 'symbols',        name: 'Símbolos' },
              { category: 'flags',          name: 'Bandeiras' },
            ]}
          />
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-4 border-t border-slate-700/50 pt-4 first:border-0 first:pt-0">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
      {children}
    </div>
  );
}

function StepSelect({ steps, value, onChange, placeholder }) {
  return (
    <Select
      value={value}
      onChange={onChange}
      options={[
        { value: '', label: placeholder || '-- Nenhum --' },
        ...steps.map((s, i) => ({ value: s.id, label: `${i + 1}. ${s.label}` }))
      ]}
    />
  );
}

function ScoreTargetSelect({ steps, value, onChange }) {
  const allVariants = (steps || []).reduce((acc, s) => {
    (s.blocks || []).forEach(b => {
      if (b.type === 'result' && b.dynamicResults && b.variants?.length > 0) {
        acc.push(...b.variants);
      }
    });
    return acc;
  }, []);

  if (allVariants.length === 0) return null;

  return (
    <Field label="Pontuar para Resultado (Resultados Dinâmicos)">
      <Select value={value || ''} onChange={onChange} options={[
        { value: '', label: '-- Não Pontuar --' },
        ...allVariants.map(v => ({ value: v.id, label: v.name || `Resultado ${v.id}` }))
      ]} />
    </Field>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Google Fonts Picker
// ────────────────────────────────────────────────────────────────────────────
const POPULAR_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins', 'Montserrat', 'Raleway',
  'Nunito', 'Urbanist', 'Plus Jakarta Sans', 'DM Sans', 'Outfit',
  'Figtree', 'Manrope', 'Syne', 'Space Grotesk', 'Bricolage Grotesque',
  'Playfair Display', 'Merriweather', 'Lora', 'EB Garamond', 'Cormorant Garamond',
  'Oswald', 'Bebas Neue', 'Anton', 'Barlow Condensed',
  'Pacifico', 'Dancing Script', 'Caveat', 'Great Vibes', 'Sacramento',
  'Exo 2', 'Rajdhani', 'Orbitron', 'Audiowide', 'Jura',
  'Ubuntu', 'Source Sans 3', 'Work Sans', 'Karla', 'Mulish',
];

const loadedFonts = new Set();
function loadGoogleFont(fontName) {
  if (!fontName || loadedFonts.has(fontName)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;600;700&display=swap`;
  document.head.appendChild(link);
  loadedFonts.add(fontName);
}

function FontPicker({ value, onChange }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // preview font in editor on hover
  const handleSelect = (fontName) => {
    loadGoogleFont(fontName);
    onChange(fontName);
    setOpen(false);
  };

  const filtered = POPULAR_FONTS.filter(f =>
    f.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500 transition-colors cursor-pointer"
        style={{ fontFamily: value ? `'${value}', sans-serif` : undefined, color: 'white' }}
      >
        <span>{value || 'Selecionar Fonte...'}</span>
        <span className="text-xs text-slate-500">▼</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-slate-700">
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar fonte..."
              className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.map(f => (
              <button
                key={f}
                onMouseEnter={() => loadGoogleFont(f)}
                onClick={() => handleSelect(f)}
                className={`w-full px-4 py-2 text-left text-sm transition-colors cursor-pointer hover:bg-indigo-500/10 hover:text-indigo-300 ${value === f ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-300'}`}
                style={{ fontFamily: `'${f}', sans-serif` }}
              >
                {f}
              </button>
            ))}
          </div>
          {value && (
            <button
              onClick={() => { onChange(''); setOpen(false); }}
              className="w-full px-4 py-2 text-xs text-slate-500 hover:text-red-400 transition-colors cursor-pointer border-t border-slate-700 text-left"
            >
              ✕ Remover Fonte Personalizada
            </button>
          )}
        </div>
      )}
    </div>
  );
}


function TiptapColorPopover({ icon, title, isActive, onSelectColor, onRemoveColor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const PRESET_COLORS = [
    '#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899',
    '#ffffff','#94a3b8','#64748b','#334155','#1e293b','#000000','#fbbf24','#a78bfa',
  ];

  return (
    <div className="relative" ref={ref}>
      <button 
        type="button"
        onMouseDown={(e) => { e.preventDefault(); setOpen(!open); }}
        className={`w-8 h-8 flex items-center justify-center rounded text-slate-300 cursor-pointer transition-all ${isActive ? 'bg-indigo-500/30 ring-1 ring-indigo-400' : 'hover:bg-slate-700'}`} 
        title={title}
      >
        {icon}
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-2 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] min-w-[200px]">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2 block">Cores Rápidas</span>
          <div className="grid grid-cols-8 gap-1.5 mb-3">
            {PRESET_COLORS.map(c => (
              <button key={c} type="button" onMouseDown={(e) => { e.preventDefault(); onSelectColor(c); setOpen(false); }}
                className="w-6 h-6 rounded-md border border-slate-600 hover:scale-110 transition-transform cursor-pointer hover:ring-2 hover:ring-indigo-400"
                style={{ background: c }} title={c} />
            ))}
          </div>
          <div className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-lg p-2 mb-2">
            <input type="color" className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
              onChange={e => { onSelectColor(e.target.value); setOpen(false); }} />
            <span className="text-xs text-slate-300">Cor Personalizada</span>
          </div>
          <button 
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onRemoveColor(); setOpen(false); }}
            className="w-full px-3 py-2 text-xs font-semibold text-red-400 hover:text-white hover:bg-red-500 rounded-lg text-center transition-colors cursor-pointer border border-red-500/30 hover:border-red-500"
          >
            🚫 Nenhuma Cor
          </button>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Tiptap Rich Text Editor (Professional Grade)
// ────────────────────────────────────────────────────────────────────────────

function TiptapEditor({ value, onChange, placeholder, minHeight = 60 }) {
  const [, setTick] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        horizontalRule: false,
        underline: false,
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['paragraph'] }),
      Placeholder.configure({ placeholder: placeholder || 'Digite aqui...' }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onSelectionUpdate: () => setTick(t => t + 1),
    onTransaction: () => setTick(t => t + 1),
    editorProps: {
      attributes: {
        style: `min-height: ${minHeight}px`,
      },
    },
  });

  // Sync external changes (only when editor loses focus)
  useEffect(() => {
    if (editor && !editor.isFocused && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', false);
    }
  }, [value, editor]);

  if (!editor) return null;

  const ToolBtn = ({ active, onClick, title, children }) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(e); }}
      className={`w-8 h-8 flex items-center justify-center rounded text-sm cursor-pointer transition-all ${
        active 
          ? 'bg-indigo-500/30 text-indigo-300 ring-1 ring-indigo-400/50' 
          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
      }`}
      title={title}
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-col gap-0 relative">
      <div className="flex flex-wrap bg-slate-800 border border-slate-700 rounded-t-xl p-1.5 gap-0.5 sticky top-0 z-10 shadow-md items-center">
        <ToolBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Negrito (Ctrl+B)">
          <span className="font-bold font-serif">B</span>
        </ToolBtn>
        <ToolBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Itálico (Ctrl+I)">
          <span className="italic font-serif">I</span>
        </ToolBtn>
        <ToolBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Sublinhado (Ctrl+U)">
          <span className="underline font-serif">U</span>
        </ToolBtn>
        <ToolBtn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Tachado">
          <span className="line-through font-serif">S</span>
        </ToolBtn>

        <div className="w-px h-5 bg-slate-600 mx-1" />

        <TiptapColorPopover
          icon={<span className="w-5 h-5 rounded-full border border-slate-600" style={{background: editor.getAttributes('textStyle').color || 'linear-gradient(to right, #ef4444, #3b82f6)'}} />}
          title="Cor do Texto"
          isActive={!!editor.getAttributes('textStyle').color}
          onSelectColor={c => editor.chain().focus().setColor(c).run()}
          onRemoveColor={() => editor.chain().focus().unsetColor().run()}
        />

        <TiptapColorPopover
          icon={<span className="w-5 h-5 rounded border border-slate-600 flex items-center justify-center text-[11px] font-bold" style={{background: editor.getAttributes('highlight').color || '#eab308', color: '#000'}}>A</span>}
          title="Cor de Destaque (Highlight)"
          isActive={editor.isActive('highlight')}
          onSelectColor={c => editor.chain().focus().toggleHighlight({ color: c }).run()}
          onRemoveColor={() => editor.chain().focus().unsetHighlight().run()}
        />

        <div className="w-px h-5 bg-slate-600 mx-1" />

        <ToolBtn active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Alinhar Esquerda">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>
        </ToolBtn>
        <ToolBtn active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Centralizar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
        </ToolBtn>
        <ToolBtn active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Alinhar Direita">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>
        </ToolBtn>

        <div className="w-px h-5 bg-slate-600 mx-1" />

        <ToolBtn active={false} onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Limpar Formatação">
          <Trash2 size={14} />
        </ToolBtn>
      </div>

      {/* ── Editor Area ── */}
      <div className="bg-white border border-t-0 border-slate-700 rounded-b-xl overflow-hidden">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

// Keep backward-compatible InlineRichText alias
function InlineRichText({ value, onChange, placeholder, minHeight = 100 }) {
  return <TiptapEditor value={value} onChange={onChange} placeholder={placeholder} minHeight={minHeight} />;
}

function HeadingEditor({ block, onChange }) {
  return (
    <>
      <Section title="Conteúdo">
        <Field label="Emoji do Título"><EmojiSelect emoji={block.emoji} unified={block.emojiUnified} onChange={(e, u) => onChange({ emoji: e, emojiUnified: u })} /></Field>
        <Field label="Texto"><InlineRichText value={block.text} onChange={v => onChange({ text: v })} minHeight={60} /></Field>
        <Field label="Tamanho">
          <Select value={block.size || 'xl'} onChange={v => onChange({ size: v })} options={[
            { value: 'sm', label: 'Pequeno' }, { value: 'base', label: 'Médio' },
            { value: 'xl', label: 'Grande' }, { value: '2xl', label: 'Extra Grande' }, { value: '4xl', label: 'Máximo' }
          ]} />
        </Field>
        <Field label="Fonte do Título"><FontPicker value={block.fontFamily} onChange={v => onChange({ fontFamily: v })} /></Field>
      </Section>

      <Section title="Fundo da Caixa">
        <Toggle label="Ativar Fundo" value={block.bgEnabled} onChange={v => onChange({ bgEnabled: v, bgStyle: v ? (block.bgStyle === 'glass' ? 'glass' : 'solid') : 'none' })} />
        {block.bgEnabled && (
          <>
            <Field label="Estilo">
              <Select value={block.bgStyle === 'glass' ? 'glass' : 'solid'} onChange={v => onChange({ bgStyle: v })} options={[
                { value: 'solid', label: 'Sólido (Cor)' },
                { value: 'glass', label: 'Ofuscado (Glass)' },
              ]} />
            </Field>
            {block.bgStyle !== 'glass' && (
              <Field label="Cor da Caixa"><ColorPicker value={block.bgColor || '#1e293b'} onChange={v => onChange({ bgColor: v })} /></Field>
            )}
            {block.bgStyle === 'glass' && (
              <Field label={`Intensidade do Blur: ${block.bgBlur ?? 10}px`}>
                <input type="range" min={2} max={30} step={2} value={block.bgBlur ?? 10}
                  onChange={e => onChange({ bgBlur: Number(e.target.value) })}
                  className="w-full accent-indigo-500 cursor-pointer" />
              </Field>
            )}
            <Field label={`Arredondamento: ${block.bgRadius ?? 16}px`}>
              <input type="range" min={0} max={60} step={2} value={block.bgRadius ?? 16}
                onChange={e => onChange({ bgRadius: Number(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer" />
            </Field>
            <Field label={`Espaçamento Interno (px): ${block.bgPadding ?? 18}`}>
              <input type="range" min={4} max={60} step={2} value={block.bgPadding ?? 18}
                onChange={e => onChange({ bgPadding: Number(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer" />
            </Field>
          </>
        )}
      </Section>
    </>
  );
}

function TextEditor({ block, onChange }) {
  return (
    <>
      <Section title="Conteúdo">
        <Field label="Texto">
          <InlineRichText value={block.text || ''} onChange={v => onChange({ text: v })} />
        </Field>
        <Field label="Fonte do Texto"><FontPicker value={block.fontFamily} onChange={v => onChange({ fontFamily: v })} /></Field>
        <Field label="Tamanho">
          <Select value={block.size || 'base'} onChange={v => onChange({ size: v })} options={[
            { value: 'xs', label: 'Muito Pequeno' }, { value: 'sm', label: 'Pequeno' },
            { value: 'base', label: 'Médio' }, { value: 'lg', label: 'Grande' }
          ]} />
        </Field>
      </Section>

      <Section title="Efeitos do Texto">
        <Field label="Efeito">
          <Select value={block.textEffect || 'none'} onChange={v => onChange({ textEffect: v })} options={[
            { value: 'none', label: 'Nenhum' },
            { value: 'bg_box', label: '🟥 Caixa de Fundo' },
            { value: 'underline_color', label: '📍 Sublinhado Colorido' },
            { value: 'border_bottom', label: '— Linha Embaixo' },
            { value: 'border_all', label: '□ Borda Completa' },
          ]} />
        </Field>
        {block.textEffect && block.textEffect !== 'none' && (
          <>
            <Field label="Cor do Efeito"><ColorPicker value={block.effectColor || '#6366f1'} onChange={v => onChange({ effectColor: v })} /></Field>
            {(block.textEffect === 'underline_color' || block.textEffect === 'border_bottom' || block.textEffect === 'border_all') && (
              <Field label={`Espessura: ${block.effectThickness ?? 3}px`}>
                <input type="range" min={1} max={10} step={1} value={block.effectThickness ?? 3}
                  onChange={e => onChange({ effectThickness: Number(e.target.value) })}
                  className="w-full accent-indigo-500 cursor-pointer" />
              </Field>
            )}
            {block.textEffect === 'bg_box' && (
              <Field label={`Opacidade: ${Math.round((block.effectOpacity ?? 0.4) * 100)}%`}>
                <input type="range" min={0.05} max={1} step={0.05} value={block.effectOpacity ?? 0.4}
                  onChange={e => onChange({ effectOpacity: Number(e.target.value) })}
                  className="w-full accent-indigo-500 cursor-pointer" />
              </Field>
            )}
            {block.textEffect === 'bg_box' && (
              <Field label={`Arredondamento: ${block.effectRadius ?? 8}px`}>
                <input type="range" min={0} max={30} step={2} value={block.effectRadius ?? 8}
                  onChange={e => onChange({ effectRadius: Number(e.target.value) })}
                  className="w-full accent-indigo-500 cursor-pointer" />
              </Field>
            )}
          </>
        )}
      </Section>
    </>
  );
}

function ImageCropperModal({ imageSrc, onComplete, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [aspect, setAspect] = useState(16 / 9)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSave = async () => {
    try {
      setIsProcessing(true)
      const croppedImageBase64 = await getCroppedImg(imageSrc, croppedAreaPixels)
      onComplete(croppedImageBase64)
    } catch (e) {
      console.error(e)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/95 backdrop-blur-sm p-4 md:p-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-bold text-lg">Recortar Imagem</h3>
        <button onClick={onCancel} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:text-white transition-colors">✕ Fechar Janela</button>
      </div>
      
      <div className="flex-1 relative bg-black/50 rounded-xl overflow-hidden border border-slate-700">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={setCrop}
          onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
          onZoomChange={setZoom}
        />
      </div>

      <div className="mt-4 bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-4 w-full">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400 font-medium">Zoom (Aproxime para focar nos detalhes)</label>
          <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={e => setZoom(Number(e.target.value))} className="w-full accent-indigo-500" />
        </div>
        
        <div className="flex flex-col gap-2">
          <label className="text-xs text-slate-400 font-medium">Formato do Recorte</label>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setAspect(undefined)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!aspect ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>Livre / Original</button>
            <button onClick={() => setAspect(1)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${aspect === 1 ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>1:1 (Quadrado)</button>
            <button onClick={() => setAspect(16/9)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${aspect === 16/9 ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>16:9 (Horizontal)</button>
            <button onClick={() => setAspect(4/3)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${aspect === 4/3 ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>4:3 (Retrato Fino)</button>
            <button onClick={() => setAspect(9/16)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${aspect === 9/16 ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>9:16 (Vertical)</button>
          </div>
        </div>

        <button 
          onClick={handleSave} 
          disabled={isProcessing}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
          {isProcessing ? 'Processando Imagem...' : '✂️ Pegar Somente Essa Parte (Cortar)'}
        </button>
      </div>
    </div>
  )
}

function ImageUploaderUI({ src, alt, onChangeSrc, onChangeAlt, labelPrefix }) {
  const [tempImage, setTempImage] = useState(null);

  return (
    <>
      {tempImage && (
        <ImageCropperModal
          imageSrc={tempImage}
          onCancel={() => setTempImage(null)}
          onComplete={(cropped) => {
            onChangeSrc(cropped);
            setTempImage(null);
          }}
        />
      )}
      <Field label={`Upload de ${labelPrefix || 'Imagem'} do Computador`}>
        {src?.startsWith('data:image') && (
          <div className="relative w-full rounded-xl overflow-hidden border border-slate-700 mb-2" style={{ height: 100, background: '#1e293b' }}>
            <img src={src} alt="" className="w-full h-full object-contain" />
            <button onClick={() => onChangeSrc('')}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600/90 hover:bg-red-500 text-white flex items-center justify-center cursor-pointer text-xs">×</button>
          </div>
        )}
        <label className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-dashed border-slate-600 hover:border-indigo-500/50 text-slate-500 hover:text-indigo-400 transition-all cursor-pointer bg-slate-800/30 hover:bg-slate-800/60 text-xs">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          {src?.startsWith('data:image') ? '✅ Trocar Imagem do PC' : 'Carregar Imagem do Computador'}
          <input type="file" accept="image/*" className="hidden" onChange={e => {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => setTempImage(ev.target.result);
            reader.readAsDataURL(file);
            e.target.value = '';
          }} />
        </label>
      </Field>
      <Field label="Texto Alternativo (Acessibilidade)">
        <Input value={alt || ''} onChange={onChangeAlt} placeholder="Descrição da imagem" />
      </Field>
    </>
  );
}

function ImageEditor({ block, onChange, steps }) {
  const isDual = block.layout === 'dual';

  return (
    <>
      <Section title="Tamanho e Alinhamento">
        <Field label="Alinhamento Horizontal">
           <Select value={block.align || 'center'} onChange={v => onChange({ align: v })} options={[
             { value: 'flex-start', label: 'Esquerda' },
             { value: 'center', label: 'Centro' },
             { value: 'flex-end', label: 'Direita' }
           ]} />
        </Field>

        <Field label={`Largura Total na Tela: ${block.imgScale || 100}%`}>
          <input type="range" min={10} max={100} step={2} value={block.imgScale || 100}
            onChange={e => onChange({ imgScale: Number(e.target.value) })}
            className="w-full accent-indigo-500 cursor-pointer" />
        </Field>

        <Field label={`Arredondamento das Bordas: ${block.borderRadius ?? 0}px`}>
          <input type="range" min={0} max={100} step={2} value={block.borderRadius ?? 0}
            onChange={e => onChange({ borderRadius: Number(e.target.value) })}
            className="w-full accent-indigo-500 cursor-pointer" />
        </Field>
      </Section>

      <Section title="Imagens Cadastradas">
        <Field label="Layout de Imagens">
          <Select value={block.layout || 'single'} onChange={v => onChange({ layout: v })} options={[
            { value: 'single', label: 'Uma Imagem Central', icon: '1️⃣' },
            { value: 'dual', label: 'Duas Imagens Lado a Lado', icon: '2️⃣' }
          ]} />
        </Field>

        <div className="mt-4 border-t border-slate-700 pt-4">
          <ImageUploaderUI src={block.src} alt={block.alt} onChangeSrc={v => onChange({ src: v })} onChangeAlt={v => onChange({ alt: v })} labelPrefix={isDual ? "Imagem 1" : "Sua Foto"} />
          <Field label="Ação ao Clicar (Opcional)">
            <StepSelect steps={steps} value={block.nextStep} onChange={v => onChange({ nextStep: v })} placeholder="-- Não fazer nada --" />
          </Field>
          <ScoreTargetSelect steps={steps} value={block.scoreTarget} onChange={v => onChange({ scoreTarget: v })} />
        </div>

        {isDual && (
          <div className="mt-4 border-t border-slate-700 pt-4">
            <ImageUploaderUI src={block.src2} alt={block.alt2} onChangeSrc={v => onChange({ src2: v })} onChangeAlt={v => onChange({ alt2: v })} labelPrefix="Imagem 2" />
            <Field label="Ação ao Clicar na Imagem 2 (Opcional)">
              <StepSelect steps={steps} value={block.nextStep2} onChange={v => onChange({ nextStep2: v })} placeholder="-- Não fazer nada --" />
            </Field>
            <ScoreTargetSelect steps={steps} value={block.scoreTarget2} onChange={v => onChange({ scoreTarget2: v })} />
          </div>
        )}
      </Section>
    </>
  );
}

function AudioEditor({ block, onChange }) {
  return (
    <>
      <Section title="Áudio">
        {/* ── Upload de áudio do PC ── */}
        <Field label="Arquivo de Áudio do Computador">
          <label className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-dashed border-slate-600 hover:border-indigo-500/50 text-slate-500 hover:text-indigo-400 transition-all cursor-pointer bg-slate-800/30 hover:bg-slate-800/60 text-xs">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            {block.src?.startsWith('data:audio') ? '✅ Áudio carregado do PC' : 'Clique para Carregar Áudio (.mp3, .ogg, .wav)'}
            <input type="file" accept="audio/*" className="hidden" onChange={e => {
              const file = e.target.files[0]; if (!file) return;
              const reader = new FileReader();
              reader.onload = ev => onChange({ src: ev.target.result });
              reader.readAsDataURL(file);
            }} />
          </label>
          {block.src?.startsWith('data:audio') && (
            <button onClick={() => onChange({ src: '' })} className="w-full mt-1 py-1 text-xs text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg transition-colors cursor-pointer">
              ✕ Remover áudio
            </button>
          )}
        </Field>

        <Field label="Duração (ex: 1:23)"><Input value={block.duration} onChange={v => onChange({ duration: v })} placeholder="0:30" /></Field>
        <Field label="Nome do Remetente"><Input value={block.senderName} onChange={v => onChange({ senderName: v })} placeholder="Fulano" /></Field>
      </Section>

      <Section title="Avatar do Remetente">
        {/* ── Preview do avatar ── */}
        {block.avatarSrc && (
          <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-green-500/50 mb-2">
            <img src={block.avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
            <button onClick={() => onChange({ avatarSrc: '' })}
              className="absolute top-0 right-0 w-5 h-5 rounded-full bg-red-600/90 hover:bg-red-500 text-white flex items-center justify-center cursor-pointer text-xs">×</button>
          </div>
        )}
        {/* ── Upload do PC ── */}
        <label className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-dashed border-slate-600 hover:border-indigo-500/50 text-slate-500 hover:text-indigo-400 transition-all cursor-pointer bg-slate-800/30 hover:bg-slate-800/60 text-xs">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          {block.avatarSrc ? 'Trocar Foto do Perfil' : 'Carregar Foto do PC'}
          <input type="file" accept="image/*" className="hidden" onChange={e => {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => onChange({ avatarSrc: ev.target.result });
            reader.readAsDataURL(file);
          }} />
        </label>

      </Section>

      <Section title="Tamanho e Forma">
        <Field label={`Largura da Bolha: ${block.boxWidth || 80}%`}>
          <input type="range" min={40} max={100} step={2} value={block.boxWidth || 80}
            onChange={e => onChange({ boxWidth: Number(e.target.value) })}
            className="w-full accent-indigo-500 cursor-pointer" />
        </Field>
        <Field label={`Altura da Bolha: ${block.boxHeight || 66}px`}>
          <input type="range" min={50} max={150} step={2} value={block.boxHeight || 66}
            onChange={e => onChange({ boxHeight: Number(e.target.value) })}
            className="w-full accent-indigo-500 cursor-pointer" />
        </Field>
      </Section>

      <Section title="Aparência">
        <Field label="Cor de Fundo da Bolha"><ColorPicker value={block.bgColor || '#075e54'} onChange={v => onChange({ bgColor: v })} /></Field>
        <Field label="Cor da Bolinha (Progresso)"><ColorPicker value={block.dotColor || '#00bfff'} onChange={v => onChange({ dotColor: v })} /></Field>
        <Field label="Horário exibido (ex: 22:54)"><Input value={block.sentAt} onChange={v => onChange({ sentAt: v })} placeholder="22:54" /></Field>
        <Toggle label="Mostrar Onda Sonora" value={block.showWave !== false} onChange={v => onChange({ showWave: v })} />
      </Section>
    </>
  );
}

function VideoEditor({ block, onChange }) {
  return (
    <>
      <Section title="Vídeo">
        <Field label="URL do Vídeo (YouTube, Vimeo ou MP4)"><Input value={block.src} onChange={v => onChange({ src: v })} placeholder="https://..." /></Field>
        <Field label="Ou Carregar do Computador">
          <label className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-dashed border-slate-600 hover:border-indigo-500/50 text-slate-500 hover:text-indigo-400 transition-all cursor-pointer bg-slate-800/30 hover:bg-slate-800/60 text-xs">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            {block.src?.startsWith('data:') ? '✅ Vídeo carregado do PC' : 'Clique para Carregar Vídeo (.mp4)'}
            <input type="file" accept="video/*" className="hidden" onChange={e => {
              const file = e.target.files[0]; if (!file) return;
              const reader = new FileReader();
              reader.onload = ev => onChange({ src: ev.target.result });
              reader.readAsDataURL(file);
            }} />
          </label>
        </Field>
        <Field label="Carregar Thumbnail do PC">
          <label className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-dashed border-slate-600 hover:border-indigo-500/50 text-slate-500 hover:text-indigo-400 transition-all cursor-pointer bg-slate-800/30 hover:bg-slate-800/60 text-xs">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            {block.thumbnailSrc?.startsWith('data:') ? '✅ Thumbnail carregada' : 'Clique para Carregar Thumbnail'}
            <input type="file" accept="image/*" className="hidden" onChange={e => {
              const file = e.target.files[0]; if (!file) return;
              const reader = new FileReader();
              reader.onload = ev => onChange({ thumbnailSrc: ev.target.result });
              reader.readAsDataURL(file);
            }} />
          </label>
        </Field>
        <Field label="Proporção">
          <Select value={block.aspectRatio || '16/9'} onChange={v => onChange({ aspectRatio: v })} options={[
            { value: '16/9', label: '16:9 (YouTube)' }, { value: '9/16', label: '9:16 (Vertical)' },
            { value: '1/1', label: '1:1 (Quadrado)' }, { value: '4/3', label: '4:3' }
          ]} />
        </Field>
      </Section>
      <Section title="Comportamento">
        <Toggle label="Autoplay (inicia mudo)" value={block.autoplay} onChange={v => onChange({ autoplay: v })} />
        <Toggle label="Iniciar Mudo" value={block.muted} onChange={v => onChange({ muted: v })} />
        <Toggle label="Loop" value={block.loop} onChange={v => onChange({ loop: v })} />
        <Toggle label="Impedir Pausa após Play" value={block.disablePause} onChange={v => onChange({ disablePause: v })} />
        <Toggle label="Mostrar Timer" value={block.showTimer !== false} onChange={v => onChange({ showTimer: v })} />
        <Toggle label="Bordas Arredondadas" value={block.rounded !== false} onChange={v => onChange({ rounded: v })} />
      </Section>
      <Section title="🔇 Ícone de Mudo Animado (Panda VSL)">
        <p className="text-xs text-slate-500 leading-relaxed">Aparece automaticamente quando <strong className="text-slate-300">Autoplay + Mudo</strong> estão ativados.</p>
        <Field label="Texto do Botão de Desmutar">
          <Input value={block.unmuteText || ''} onChange={v => onChange({ unmuteText: v })} placeholder="🔊 Clique para ouvir" />
        </Field>
        <Field label="Cor do Ícone Animado"><ColorPicker value={block.muteIconColor || '#06b6d4'} onChange={v => onChange({ muteIconColor: v })} /></Field>
        <Field label="Cor de Fundo da Caixa"><ColorPicker value={block.muteBgColor || 'rgba(0,0,0,0.6)'} onChange={v => onChange({ muteBgColor: v })} /></Field>
        <Field label="Cor do Texto"><ColorPicker value={block.muteTextColor || '#ffffff'} onChange={v => onChange({ muteTextColor: v })} /></Field>
      </Section>
      <Section title="⏱️ Duração Falsa (VSL)">
        <Toggle label="Usar Duração Falsa" value={block.useFakeDuration} onChange={v => onChange({ useFakeDuration: v })} />
        {block.useFakeDuration && (
          <>
            <Field label="Duração em segundos">
              <input type="number" value={block.fakeDuration || 120} min={10} max={7200}
                onChange={e => onChange({ fakeDuration: Number(e.target.value) })}
                className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
              />
            </Field>
            <Field label="Cor da Barra de Progresso"><ColorPicker value={block.fakeProgressColor || '#ef4444'} onChange={v => onChange({ fakeProgressColor: v })} /></Field>
          </>
        )}
      </Section>
    </>
  );
}

function ButtonEditor({ block, onChange, steps, theme }) {
  return (
    <>
      <Section title="Botão">
        <Field label="Texto"><Input value={block.text} onChange={v => onChange({ text: v })} /></Field>
        <Field label="Emoji"><EmojiSelect emoji={block.emoji} unified={block.emojiUnified} onChange={(e, u) => onChange({ emoji: e, emojiUnified: u })} /></Field>
        <Field label="Posição do Emoji">
          <Select value={block.emojiPosition || 'left_inside'} onChange={v => onChange({ emojiPosition: v })} options={[
            { value: 'left_inside', label: 'Esquerda (Dentro)' },
            { value: 'right_inside', label: 'Direita (Dentro)' },
            { value: 'left_outside', label: 'Esquerda Fora (InLead)' },
            { value: 'top_large', label: 'Topo Gigante' }
          ]} />
        </Field>
        <Field label="Fonte do Botão"><FontPicker value={block.fontFamily} onChange={v => onChange({ fontFamily: v })} /></Field>
        <Field label={`Tamanho do Texto: ${block.fontSize || 15}px`}>
          <input type="range" min={10} max={32} step={1} value={block.fontSize || 15}
            onChange={e => onChange({ fontSize: Number(e.target.value) })}
            className="w-full accent-indigo-500 cursor-pointer" />
        </Field>
        <Field label="Cor de Fundo"><ColorPicker value={block.bg} onChange={v => onChange({ bg: v })} /></Field>
        <Field label="Cor do Texto"><ColorPicker value={block.textColor} onChange={v => onChange({ textColor: v })} /></Field>
      </Section>

      <Section title="Tamanho e Forma">
        <Field label={`Largura da Caixa: ${block.boxWidth || 100}%`}>
          <input type="range" min={30} max={100} step={5} value={block.boxWidth || 100}
            onChange={e => onChange({ boxWidth: Number(e.target.value) })}
            className="w-full accent-indigo-500 cursor-pointer" />
        </Field>
        <Field label={`Altura Mínima: ${block.boxHeight || 44}px`}>
          <input type="range" min={20} max={120} step={4} value={block.boxHeight || 44}
            onChange={e => onChange({ boxHeight: Number(e.target.value) })}
            className="w-full accent-indigo-500 cursor-pointer" />
        </Field>
        <Field label={`Arredondamento: ${block.borderRadius ?? 14}px`}>
          <input type="range" min={0} max={60} step={2} value={block.borderRadius ?? 14}
            onChange={e => onChange({ borderRadius: Number(e.target.value) })}
            className="w-full accent-indigo-500 cursor-pointer" />
        </Field>
        <Field label="Estilo de Fundo">
          <Select value={block.bgStyle || 'solid'} onChange={v => onChange({ bgStyle: v })} options={[
            { value: 'solid', label: 'Sólido (Padrão)' },
            { value: 'glass', label: 'Efeito Ofuscado (Glass)' },
            { value: 'border_only', label: 'Somente Borda (Transparente)' },
          ]} />
        </Field>
        {block.bgStyle === 'glass' && (
          <Field label={`Intensidade do Blur: ${block.blurAmount ?? 10}px`}>
            <input type="range" min={2} max={30} step={2} value={block.blurAmount ?? 10}
              onChange={e => onChange({ blurAmount: Number(e.target.value) })}
              className="w-full accent-indigo-500 cursor-pointer" />
          </Field>
        )}
        {block.bgStyle === 'border_only' && (
          <>
            <Field label="Cor da Borda"><ColorPicker value={block.borderColor || block.textColor || '#6366f1'} onChange={v => onChange({ borderColor: v })} /></Field>
            <Field label={`Espessura da Borda: ${block.borderWidth ?? 2}px`}>
              <input type="range" min={1} max={8} step={1} value={block.borderWidth ?? 2}
                onChange={e => onChange({ borderWidth: Number(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer" />
            </Field>
          </>
        )}
      </Section>

      <Section title="Efeitos & Animação">
        <Field label="Animação">
          <Select value={block.animation || 'none'} onChange={v => onChange({ animation: v })} options={[
            { value: 'none', label: 'Nenhuma' },
            { value: 'pulse', label: 'Pulso (Aumenta e Volta)' },
            { value: 'neon', label: 'Neon (Brilho Externo)' },
            { value: 'blink', label: 'Piscar (Opacidade)' },
            { value: 'shake', label: 'Tremer (Lateral)' },
            { value: 'heartbeat', label: 'Coração Pulsando' },
          ]} />
        </Field>
        {block.animation && block.animation !== 'none' && (
          <Field label={`Velocidade (${block.animationSpeed ?? 1.5}s)`}>
            <input type="range" min={0.2} max={4.0} step={0.1} value={block.animationSpeed ?? 1.5}
              onChange={e => onChange({ animationSpeed: Number(e.target.value) })}
              className="w-full accent-indigo-500 cursor-pointer" />
            <span className="text-xs text-slate-500 mt-1 block">Menor = Mais Rápido, Maior = Mais Lento</span>
          </Field>
        )}
      </Section>

      <Section title="Ação">
        <Field label="Ao clicar">
          <Select value={block.actionType || 'step'} onChange={v => onChange({ actionType: v })} options={[
            { value: 'step', label: 'Ir para Etapa' },
            { value: 'url', label: 'Abrir URL' },
          ]} />
        </Field>
        {(block.actionType || 'step') === 'step' && (
          <Field label="Ir para Etapa">
            <StepSelect steps={steps} value={block.nextStep} onChange={v => onChange({ nextStep: v })} placeholder="-- Próxima Etapa --" />
          </Field>
        )}
        {block.actionType === 'url' && (
          <Field label="URL de Destino">
            <Input value={block.buttonUrl || ''} onChange={v => onChange({ buttonUrl: v })} placeholder="https://meusite.com" />
          </Field>
        )}
        <Toggle label="Largura Total" value={block.fullWidth !== false} onChange={v => onChange({ fullWidth: v })} />
        <ScoreTargetSelect steps={steps} value={block.scoreTarget} onChange={v => onChange({ scoreTarget: v })} />
      </Section>
      <Section title="Tela de Carregamento (Opcional)">
        <Toggle label="⏳ Ativar ao Clicar" value={!!block.showLoading} onChange={v => onChange({ showLoading: v })} />
        {block.showLoading && (
          <>
            <Field label="Estilo da Animação">
              <Select value={block.loadingStyle || 'spinner'} onChange={v => onChange({ loadingStyle: v })} options={[
                { value: 'spinner', label: 'Círculo Girando' },
                { value: 'pulse', label: 'Círculo Pulsando' },
                { value: 'dots', label: 'Três Pontinhos' },
              ]} />
            </Field>
            <Field label="Cor da Animação"><ColorPicker value={block.loadingColor || (theme && theme.accent) || '#6366f1'} onChange={v => onChange({ loadingColor: v })} /></Field>
            <Field label="Texto de Carregamento"><Input value={block.loadingText || ''} onChange={v => onChange({ loadingText: v })} placeholder="Analisando suas respostas..." /></Field>
            <Field label="Texto Secundário (opcional)"><Input value={block.progressText || ''} onChange={v => onChange({ progressText: v })} placeholder="Aguarde um momento..." /></Field>
            <Field label={`Duração: ${block.loadingDuration || 3}s`}>
              <input type="range" min={1} max={15} step={1} value={block.loadingDuration || 3}
                onChange={e => onChange({ loadingDuration: Number(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer" />
            </Field>
          </>
        )}
      </Section>
    </>
  );
}

function ArrowButtonEditor({ block, onChange, steps, theme }) {
  const isIcon = block.displayMode === 'icon';

  return (
    <>
      <Section title="Botão Seta">
        <Field label="Modo de Exibição">
          <Select value={block.displayMode || 'button'} onChange={v => onChange({ displayMode: v })} options={[
            { value: 'button', label: 'Botão Completo (Com Texto)' },
            { value: 'icon', label: 'Apenas Seta (Apontamento)' }
          ]} />
        </Field>

        {isIcon ? (
          <>
            <Field label="Modelo da Seta">
              <Select value={block.arrowStyle || 'chevron_down'} onChange={v => onChange({ arrowStyle: v })} options={[
                { value: 'chevron_down', label: 'Chevron Baixo' },
                { value: 'arrow_down', label: 'Seta Baixo' },
                { value: 'double_down', label: 'Duplo Baixo' },
                { value: 'bold_down', label: 'Seta Cheia Baixo' },
                { value: 'triangle_down', label: 'Triângulo Baixo' },
                { value: 'circle_down', label: 'Círculo Baixo' },
                { value: 'chevron_right', label: 'Chevron Direita' },
                { value: 'arrow_right', label: 'Seta Direita' },
              ]} />
            </Field>
            <Field label="Animação">
              <Select value={block.animation || 'bounce'} onChange={v => onChange({ animation: v })} options={[
                { value: 'none', label: 'Nenhuma' },
                { value: 'bounce', label: 'Pulo (Bounce)' },
                { value: 'pulse', label: 'Pulsar (Pulse)' },
                { value: 'blink', label: 'Piscando (Blink)' },
              ]} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tamanho">
                <Select value={block.size || 'lg'} onChange={v => onChange({ size: v })} options={[
                  { value: 'sm', label: 'Pequeno' }, { value: 'md', label: 'Médio' },
                  { value: 'lg', label: 'Grande' }, { value: 'xl', label: 'Gigante' }
                ]} />
              </Field>
              <Field label="Alinhamento">
                <Select value={block.align || 'center'} onChange={v => onChange({ align: v })} options={[
                  { value: 'flex-start', label: 'Esquerda' }, { value: 'center', label: 'Centro' }, { value: 'flex-end', label: 'Direita' }
                ]} />
              </Field>
            </div>
            <Field label="Cor do Ícone"><ColorPicker value={block.iconColor || theme?.accent || '#f97316'} onChange={v => onChange({ iconColor: v })} /></Field>
            <Field label="Cor de Fundo (opcional)">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <ColorPicker value={block.iconBg || 'transparent'} onChange={v => onChange({ iconBg: v })} />
                </div>
                {block.iconBg && block.iconBg !== 'transparent' && (
                  <button onClick={() => onChange({ iconBg: 'transparent' })} className="text-xs text-red-500 hover:text-red-400 px-2 py-1 bg-red-500/10 hover:bg-red-500/20 rounded transition-colors whitespace-nowrap">Remover</button>
                )}
              </div>
            </Field>
          </>
        ) : (
          <>
            <Field label="Texto"><Input value={block.text} onChange={v => onChange({ text: v })} /></Field>
            <Field label="Cor de Fundo"><ColorPicker value={block.bg} onChange={v => onChange({ bg: v })} /></Field>
            <Field label="Cor do Texto"><ColorPicker value={block.textColor} onChange={v => onChange({ textColor: v })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Estilo">
                <Select value={block.style || 'pill'} onChange={v => onChange({ style: v })} options={[
                  { value: 'pill', label: 'Pílula' }, { value: 'square', label: 'Quadrado' }
                ]} />
              </Field>
              <Field label="Animação">
                <Select value={block.animation || 'none'} onChange={v => onChange({ animation: v })} options={[
                  { value: 'none', label: 'Nenhuma' },
                  { value: 'bounce', label: 'Pulo (Bounce)' },
                  { value: 'pulse', label: 'Pulsar (Pulse)' },
                ]} />
              </Field>
            </div>
            <Toggle label="Mostrar ícone de seta" value={block.showIcon !== false} onChange={v => onChange({ showIcon: v })} />
            <Toggle label="Largura Total" value={block.fullWidth !== false} onChange={v => onChange({ fullWidth: v })} />
          </>
        )}
      </Section>
      <Section title="Ação">
        <Field label="Ao clicar">
          <Select value={block.actionType || 'step'} onChange={v => onChange({ actionType: v })} options={[
            { value: 'step', label: 'Ir para Etapa' },
            { value: 'url', label: 'Abrir URL' },
          ]} />
        </Field>
        {(block.actionType || 'step') === 'step' && (
          <Field label="Ir para Etapa">
            <StepSelect steps={steps} value={block.nextStep} onChange={v => onChange({ nextStep: v })} />
          </Field>
        )}
        {block.actionType === 'url' && (
          <Field label="URL de Destino">
            <Input value={block.buttonUrl || ''} onChange={v => onChange({ buttonUrl: v })} placeholder="https://meusite.com" />
          </Field>
        )}
        <ScoreTargetSelect steps={steps} value={block.scoreTarget} onChange={v => onChange({ scoreTarget: v })} />
        <Toggle label="⏳ Ativar Tela de Carregamento ao Clicar" value={!!block.showLoading} onChange={v => onChange({ showLoading: v })} />
        {block.showLoading && (
          <>
            <Field label="Estilo da Animação">
              <Select value={block.loadingStyle || 'spinner'} onChange={v => onChange({ loadingStyle: v })} options={[
                { value: 'spinner', label: 'Círculo Girando' },
                { value: 'pulse', label: 'Círculo Pulsando' },
                { value: 'dots', label: 'Três Pontinhos' },
              ]} />
            </Field>
            <Field label="Cor da Animação"><ColorPicker value={block.loadingColor || (theme && theme.accent) || '#6366f1'} onChange={v => onChange({ loadingColor: v })} /></Field>
            <Field label="Texto de Carregamento"><Input value={block.loadingText || ''} onChange={v => onChange({ loadingText: v })} placeholder="Analisando suas respostas..." /></Field>
            <Field label="Texto Secundário (opcional)"><Input value={block.progressText || ''} onChange={v => onChange({ progressText: v })} placeholder="Aguarde um momento..." /></Field>
            <Field label={`Duração: ${block.loadingDuration || 3}s`}>
              <input type="range" min={1} max={15} step={1} value={block.loadingDuration || 3}
                onChange={e => onChange({ loadingDuration: Number(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer" />
            </Field>
          </>
        )}
      </Section>
    </>
  );
}

function DividerEditor({ block, onChange }) {
  return (
    <Section title="Separador">
      <Field label="Cor"><ColorPicker value={block.color} onChange={v => onChange({ color: v })} /></Field>
      <Field label="Espessura (px)">
        <input type="range" min={1} max={8} value={block.thickness || 1}
          onChange={e => onChange({ thickness: Number(e.target.value) })}
          className="w-full accent-indigo-500 cursor-pointer" />
        <span className="text-xs text-indigo-400">{block.thickness || 1}px</span>
      </Field>
    </Section>
  );
}

function ProgressEditor({ block, onChange }) {
  return (
    <Section title="Barra de Progresso">
      <Field label="Etapa Atual">
        <input type="range" min={1} max={block.total || 5} value={block.current || 1}
          onChange={e => onChange({ current: Number(e.target.value) })}
          className="w-full accent-indigo-500 cursor-pointer" />
        <span className="text-xs text-indigo-400">{block.current || 1} de {block.total || 5}</span>
      </Field>
      <Field label="Total de Etapas">
        <input type="range" min={1} max={20} value={block.total || 5}
          onChange={e => onChange({ total: Number(e.target.value) })}
          className="w-full accent-indigo-500 cursor-pointer" />
        <span className="text-xs text-indigo-400">{block.total || 5} etapas</span>
      </Field>
      <Field label="Cor da Barra"><ColorPicker value={block.color} onChange={v => onChange({ color: v })} /></Field>
      <Field label="Cor de Fundo"><ColorPicker value={block.bg} onChange={v => onChange({ bg: v })} /></Field>
      <Field label="Cor do Texto (Rótulo)"><ColorPicker value={block.textColor} onChange={v => onChange({ textColor: v })} /></Field>
      <Field label="Altura da Barra (px)">
        <input type="range" min={4} max={40} step={2} value={block.barHeight || 6}
          onChange={e => onChange({ barHeight: Number(e.target.value) })}
          className="w-full accent-indigo-500 cursor-pointer" />
      </Field>
      <Toggle label="Mostrar Rótulo" value={block.showLabel !== false} onChange={v => onChange({ showLabel: v })} />
    </Section>
  );
}

function LeadCaptureEditor({ block, onChange, steps, theme }) {
  const all = ['name', 'email', 'phone', 'message'];
  const labels = { name: 'Nome', email: 'E-mail', phone: 'Telefone', message: 'Mensagem' };
  const defaultPlaceholders = { name: 'Digite aqui seu Nome', email: 'Digite aqui seu Email', phone: 'Digite seu DDD + WhatsApp', message: 'Sua mensagem' };

  return (
    <>
      <Section title="Campos do Formulário">
        {all.map(f => (
          <div key={f} className="space-y-2">
            <Toggle label={labels[f]}
              value={block.fields?.includes(f)}
              onChange={v => onChange({ fields: v ? [...(block.fields || []), f] : (block.fields || []).filter(x => x !== f) })} />
            {block.fields?.includes(f) && (
              <div className="pl-2 border-l-2 border-slate-700/50 mb-2">
                <Input 
                  value={block.placeholders?.[f] || ''} 
                  onChange={val => onChange({ placeholders: { ...(block.placeholders || {}), [f]: val } })}
                  placeholder={`Placeholder: ${defaultPlaceholders[f]}`}
                />
              </div>
            )}
          </div>
        ))}
        <div className="pt-3 border-t border-white/5 mt-3 space-y-3">
          <Field label="Cor do Título Externo (Rótulos)">
            <ColorPicker value={block.labelColor || theme?.textColor || '#ffffff'} onChange={v => onChange({ labelColor: v })} />
          </Field>
          <Field label="Cor de Fundo do Campo">
            <ColorPicker value={block.fieldBg || '#f1f5f9'} onChange={v => onChange({ fieldBg: v })} />
          </Field>
          <Field label="Cor do Texto do Campo">
            <ColorPicker value={block.fieldTextColor || '#0f172a'} onChange={v => onChange({ fieldTextColor: v })} />
          </Field>
          <Field label="Cor da Borda do Campo">
            <ColorPicker value={block.fieldBorderColor || '#cbd5e1'} onChange={v => onChange({ fieldBorderColor: v })} />
          </Field>
        </div>
      </Section>
      <Section title="Ação após Captura">
        <Field label="Ir para Etapa">
          <StepSelect steps={steps} value={block.nextStep} onChange={v => onChange({ nextStep: v })} placeholder="-- Próxima Etapa --" />
        </Field>
        <Field label="Ou Redirecionar para URL">
          <Input value={block.redirectUrl} onChange={v => onChange({ redirectUrl: v })} placeholder="https://seu-site.com" />
        </Field>
        <ScoreTargetSelect steps={steps} value={block.scoreTarget} onChange={v => onChange({ scoreTarget: v })} />
      </Section>
      <Section title="Carregamento Pós-Captura (Opcional)">
        <Toggle label="Ativar Tela de Carregamento" value={block.enableLoading} onChange={v => onChange({ enableLoading: v })} />
        {block.enableLoading && (
          <>
            <Field label="Estilo da Animação">
              <Select value={block.loadingStyle || 'spinner'} onChange={v => onChange({ loadingStyle: v })} options={[
                { value: 'spinner', label: 'Círculo Girando' },
                { value: 'pulse', label: 'Círculo Pulsando' },
                { value: 'dots', label: 'Três Pontinhos' },
              ]} />
            </Field>
            <Field label="Cor da Animação"><ColorPicker value={block.loadingColor || theme.accent || '#6366f1'} onChange={v => onChange({ loadingColor: v })} /></Field>
            <Field label="Texto de Carregamento"><Input value={block.loadingText} onChange={v => onChange({ loadingText: v })} placeholder="Processando dados..." /></Field>
            <Field label="Texto de Progresso (opcional)"><Input value={block.progressText} onChange={v => onChange({ progressText: v })} placeholder="Gerando plano personalizado..." /></Field>
            <Field label={`Tempo de Carregamento: ${block.loadingDuration || 3}s`}>
              <input type="range" min={1} max={15} step={1} value={block.loadingDuration || 3}
                onChange={e => onChange({ loadingDuration: Number(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer" />
            </Field>
          </>
        )}
      </Section>
      <Section title="Botão">
        <Field label="Texto do Botão"><Input value={block.buttonText} onChange={v => onChange({ buttonText: v })} /></Field>
        <Field label="Cor do Botão"><ColorPicker value={block.buttonBg} onChange={v => onChange({ buttonBg: v })} /></Field>
      </Section>
    </>
  );
}

function ResultEditor({ block, onChange, theme, steps, currentStepIdx }) {
  const disabledClass = block.dynamicResults ? 'opacity-40 pointer-events-none transition-opacity duration-300' : '';

  return (
    <>
      <div className={disabledClass}>
        <Section title="⏰ Aparecimento (Delay)">
          <Field label="Quando mostrar este bloco">
            <Select value={block.resDelay || 'none'} onChange={v => onChange({ resDelay: v })} options={[
              { value: 'none',   label: 'Imediatamente' },
              { value: 'on_end', label: 'Ao terminar o VSL (vídeo da página)' },
              { value: 'custom', label: 'Após X segundos do VSL' },
            ]} />
          </Field>
          {block.resDelay === 'custom' && (
            <Field label={`Aparecer após: ${block.resDelaySeconds || 0}s`}>
              <input type="range" min={0} max={600} step={1}
                value={block.resDelaySeconds || 0}
                onChange={e => onChange({ resDelaySeconds: Number(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer" />
            </Field>
          )}
          {block.resDelay !== 'none' && (
            <p className="text-xs text-slate-500">⚠️ Réferencia o primeiro bloco de vídeo (VSL) da página.</p>
          )}
        </Section>
        <Section title="Resultado">
          <Field label="Imagem do Topo (opcional)">
            <div className="flex flex-col gap-2">
              {block.topImage && (
                <div className="relative">
                  <img src={block.topImage} alt="Topo" className="w-full rounded-lg object-cover" style={{ maxHeight: 120 }} />
                  <button type="button" onClick={() => onChange({ topImage: '' })} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600/90 text-white flex items-center justify-center text-xs">×</button>
                </div>
              )}
              <label className="flex items-center gap-2 cursor-pointer bg-slate-800/60 border border-dashed border-slate-600 hover:border-indigo-500 rounded-xl px-3 py-2 text-sm text-slate-400 hover:text-indigo-300 transition-colors">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                {block.topImage ? 'Trocar imagem' : 'Upload de imagem'}
                <input type="file" accept="image/*" className="hidden" onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = ev => onChange({ topImage: ev.target.result });
                  reader.readAsDataURL(file);
                }} />
              </label>
              {block.topImage && (
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Largura">
                    <Select value={block.topImageWidth || 'full'} onChange={v => onChange({ topImageWidth: v })} options={[
                      { value: 'full', label: '100% (Cheio)' },
                      { value: 'lg', label: 'Grande (80%)' },
                      { value: 'md', label: 'Médio (60%)' },
                      { value: 'sm', label: 'Pequeno (40%)' },
                    ]} />
                  </Field>
                  <Field label={`Borda: ${block.topImageRadius ?? 12}px`}>
                    <input type="range" min={0} max={60} step={2} value={block.topImageRadius ?? 12}
                      onChange={e => onChange({ topImageRadius: Number(e.target.value) })}
                      className="w-full accent-indigo-500 cursor-pointer" />
                  </Field>
                </div>
              )}
            </div>
          </Field>
          <Field label="Emoji Gigante"><EmojiSelect emoji={block.emoji} unified={block.emojiUnified} onChange={(e, u) => onChange({ emoji: e, emojiUnified: u })} /></Field>
          <Field label="Título">
            <InlineRichText value={block.heading} onChange={v => onChange({ heading: v })} minHeight={60} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
             <Field label="Tamanho do Título">
               <Select value={block.headingSize || 'xl'} onChange={v => onChange({ headingSize: v })} options={[
                 { value: 'sm', label: 'Pequeno' }, { value: 'base', label: 'Médio' },
                 { value: 'xl', label: 'Grande' }, { value: '2xl', label: 'Extra Grande' }, { value: '4xl', label: 'Máximo' }
               ]} />
             </Field>
             <Field label="Fonte do Título"><FontPicker value={block.headingFontFamily} onChange={v => onChange({ headingFontFamily: v })} /></Field>
          </div>
          
          <Field label="Texto">
            <InlineRichText value={block.text || ''} onChange={v => onChange({ text: v })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tamanho do Texto">
              <Select value={block.textSize || 'base'} onChange={v => onChange({ textSize: v })} options={[
                { value: 'xs', label: 'Muito Pequeno' }, { value: 'sm', label: 'Pequeno' },
                { value: 'base', label: 'Médio' }, { value: 'lg', label: 'Grande' }
              ]} />
            </Field>
            <Field label="Fonte do Texto"><FontPicker value={block.textFontFamily} onChange={v => onChange({ textFontFamily: v })} /></Field>
          </div>
        </Section>
      </div>
      <Section title="Resultados Dinâmicos">
        <div className="flex flex-col gap-1">
          <Toggle label="Ativar Resultados Dinâmicos (Soma de pontos)" value={block.dynamicResults} onChange={v => onChange({ dynamicResults: v })} />
          <p className="text-[10px] text-slate-500 leading-tight">Múltiplos resultados possíveis. O resultado exibido será aquele com a maior pontuação acumulada.</p>
        </div>
        
        {block.dynamicResults && (
          <div className="space-y-4 mt-4">
            {(block.variants || []).map((variant, vIdx) => (
              <div 
                key={variant.id} 
                className={`p-3 bg-slate-800/40 border ${block._previewVariantId === variant.id ? 'border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'border-slate-700/50'} rounded-xl space-y-3 relative group transition-all cursor-pointer`}
                onClickCapture={() => { if (block._previewVariantId !== variant.id) onChange({ _previewVariantId: variant.id }); }}
              >
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onChange({ variants: block.variants.filter((_, i) => i !== vIdx), _previewVariantId: null }); }}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  title="Remover Variante"
                >×</button>
                
                <Field label={`Nome Interno (ex: R${vIdx + 1})`}>
                  <Input value={variant.name || ''} onChange={val => {
                    const newVars = [...block.variants];
                    newVars[vIdx] = { ...variant, name: val };
                    onChange({ variants: newVars, _previewVariantId: variant.id });
                  }} placeholder="Emagrecimento" />
                </Field>

                <Field label="⏰ Delay Desta Variante">
                  <Select value={variant.resDelay || 'none'} onChange={val => {
                    const newVars = [...block.variants];
                    newVars[vIdx] = { ...variant, resDelay: val };
                    onChange({ variants: newVars, _previewVariantId: variant.id });
                  }} options={[
                    { value: 'none',   label: 'Imediatamente' },
                    { value: 'on_end', label: 'Ao terminar o VSL (vídeo da página)' },
                    { value: 'custom', label: 'Após X segundos do VSL' },
                  ]} />
                </Field>
                {variant.resDelay === 'custom' && (
                  <Field label={`Aparecer após: ${variant.resDelaySeconds || 0}s`}>
                    <input type="range" min={0} max={600} step={1}
                      value={variant.resDelaySeconds || 0}
                      onChange={e => {
                        const newVars = [...block.variants];
                        newVars[vIdx] = { ...variant, resDelaySeconds: Number(e.target.value) };
                        onChange({ variants: newVars, _previewVariantId: variant.id });
                      }}
                      className="w-full accent-indigo-500 cursor-pointer" />
                  </Field>
                )}

                <Field label="Imagem do Topo da Variante (opcional)">
                  <div className="flex flex-col gap-2">
                    {variant.topImage && (
                      <div className="relative">
                        <img src={variant.topImage} alt="Topo" className="w-full rounded-lg object-cover" style={{ maxHeight: 100 }} />
                        <button type="button" onClick={() => { const nv=[...block.variants]; nv[vIdx]={...variant,topImage:''}; onChange({variants:nv,_previewVariantId:variant.id}); }} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600/90 text-white flex items-center justify-center text-xs">×</button>
                      </div>
                    )}
                    <label className="flex items-center gap-2 cursor-pointer bg-slate-800/60 border border-dashed border-slate-600 hover:border-indigo-500 rounded-xl px-3 py-2 text-sm text-slate-400 hover:text-indigo-300 transition-colors">
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      {variant.topImage ? 'Trocar imagem' : 'Upload de imagem'}
                      <input type="file" accept="image/*" className="hidden" onChange={e => {
                        const file = e.target.files?.[0]; if (!file) return;
                        const reader = new FileReader();
                        reader.onload = ev => { const nv=[...block.variants]; nv[vIdx]={...variant,topImage:ev.target.result}; onChange({variants:nv,_previewVariantId:variant.id}); };
                        reader.readAsDataURL(file);
                      }} />
                    </label>
                  </div>
                </Field>

                <Field label="Emoji">
                  <EmojiSelect emoji={variant.emoji} unified={variant.emojiUnified} onChange={(e, u) => {
                    const newVars = [...block.variants];
                    newVars[vIdx] = { ...variant, emoji: e, emojiUnified: u, hasEmoji: true };
                    onChange({ variants: newVars, _previewVariantId: variant.id });
                  }} />
                </Field>

                <Field label="Título">
                  <InlineRichText value={variant.heading || ''} onChange={val => {
                    const newVars = [...block.variants];
                    newVars[vIdx] = { ...variant, heading: val };
                    onChange({ variants: newVars, _previewVariantId: variant.id });
                  }} minHeight={60} />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Tamanho do Título">
                    <Select value={variant.headingSize || 'xl'} onChange={val => {
                      const newVars = [...block.variants];
                      newVars[vIdx] = { ...variant, headingSize: val };
                      onChange({ variants: newVars, _previewVariantId: variant.id });
                    }} options={[
                      { value: 'sm', label: 'Pequeno' }, { value: 'base', label: 'Médio' },
                      { value: 'xl', label: 'Grande' }, { value: '2xl', label: 'Ext Grande' }, { value: '4xl', label: 'Máximo' }
                    ]} />
                  </Field>
                  <Field label="Fonte do Título">
                    <FontPicker value={variant.headingFontFamily} onChange={val => {
                      const newVars = [...block.variants];
                      newVars[vIdx] = { ...variant, headingFontFamily: val };
                      onChange({ variants: newVars, _previewVariantId: variant.id });
                    }} />
                  </Field>
                </div>

                <Field label="Texto">
                  <InlineRichText value={variant.text || ''} onChange={val => {
                    const newVars = [...block.variants];
                    newVars[vIdx] = { ...variant, text: val };
                    onChange({ variants: newVars, _previewVariantId: variant.id });
                  }} />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Tamanho do Texto">
                    <Select value={variant.textSize || 'base'} onChange={val => {
                      const newVars = [...block.variants];
                      newVars[vIdx] = { ...variant, textSize: val };
                      onChange({ variants: newVars, _previewVariantId: variant.id });
                    }} options={[
                      { value: 'xs', label: 'Muito Pequeno' }, { value: 'sm', label: 'Pequeno' },
                      { value: 'base', label: 'Médio' }, { value: 'lg', label: 'Grande' }
                    ]} />
                  </Field>
                  <Field label="Fonte do Texto">
                    <FontPicker value={variant.textFontFamily} onChange={val => {
                      const newVars = [...block.variants];
                      newVars[vIdx] = { ...variant, textFontFamily: val };
                      onChange({ variants: newVars, _previewVariantId: variant.id });
                    }} />
                  </Field>
                </div>
                
                <div className="border-t border-slate-700/50 pt-3 mt-2">
                  <Toggle label="Mostrar Botão de Ação" value={variant.enableButton !== false} onChange={val => {
                    const newVars = [...block.variants];
                    newVars[vIdx] = { ...variant, enableButton: val };
                    onChange({ variants: newVars, _previewVariantId: variant.id });
                  }} />
                </div>

                {variant.enableButton !== false && (
                  <>
                    <Field label="Texto do Botão (opcional)">
                      <Input value={variant.buttonText || ''} onChange={val => {
                        const newVars = [...block.variants];
                        newVars[vIdx] = { ...variant, buttonText: val };
                        onChange({ variants: newVars, _previewVariantId: variant.id });
                      }} placeholder="Acessar agora" />
                    </Field>

                    <Field label="URL do Botão (opcional)">
                      <Input value={variant.buttonUrl || ''} onChange={val => {
                        const newVars = [...block.variants];
                        newVars[vIdx] = { ...variant, buttonUrl: val };
                        onChange({ variants: newVars, _previewVariantId: variant.id });
                      }} placeholder="https://..." />
                    </Field>

                    <Field label="Cor do Fundo do Botão">
                      <ColorPicker value={variant.buttonBg || theme?.accent || '#6366f1'} onChange={val => {
                        const newVars = [...block.variants];
                        newVars[vIdx] = { ...variant, buttonBg: val };
                        onChange({ variants: newVars, _previewVariantId: variant.id });
                      }} />
                    </Field>
                    <Field label="Cor do Texto do Botão">
                      <ColorPicker value={variant.buttonTextColor || '#ffffff'} onChange={val => {
                        const newVars = [...block.variants];
                        newVars[vIdx] = { ...variant, buttonTextColor: val };
                        onChange({ variants: newVars, _previewVariantId: variant.id });
                      }} />
                    </Field>

                    <Field label="Ação ao Clicar no Botão">
                      <Select value={variant.buttonAction || 'url'} onChange={val => {
                        const newVars = [...block.variants];
                        newVars[vIdx] = { ...variant, buttonAction: val };
                        onChange({ variants: newVars, _previewVariantId: variant.id });
                      }} options={[
                        { value: 'url', label: 'Abrir URL externa' },
                        { value: 'next_step', label: 'Ir para próxima etapa' },
                      ]} />
                    </Field>
                    {(variant.buttonAction === 'next_step') && (
                      <Field label="Etapa Destino">
                        <Select value={variant.nextStep || ''} onChange={val => {
                          const newVars = [...block.variants];
                          newVars[vIdx] = { ...variant, nextStep: val };
                          onChange({ variants: newVars, _previewVariantId: variant.id });
                        }} options={[
                          { value: '', label: 'Próxima etapa automaticamente' },
                          ...(steps || []).filter((_, i) => i !== currentStepIdx).map((s, i) => ({ value: s.id, label: s.label || `Etapa ${i + 1}` }))
                        ]} />
                      </Field>
                    )}
                  </>
                )}
              </div>
            ))}
            
            <button
              type="button"
              onClick={() => {
                const newId = `var_${Date.now()}`;
                const newVar = { id: newId, name: `Variante ${(block.variants?.length || 0) + 1}`, heading: 'Novo Resultado' };
                onChange({ variants: [...(block.variants || []), newVar] });
              }}
              className="w-full py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-semibold rounded-lg border border-indigo-500/30 transition-colors"
            >
              + Adicionar Variante
            </button>
          </div>
        )}
      </Section>
      <div className={disabledClass}>
        <Section title="Carregamento (Opcional)">
          <Toggle label="Ativar Tela de Carregamento" value={block.enableLoading} onChange={v => onChange({ enableLoading: v })} />
          {block.enableLoading && (
            <>
              <Field label="Estilo da Animação">
                <Select value={block.loadingStyle || 'spinner'} onChange={v => onChange({ loadingStyle: v })} options={[
                  { value: 'spinner', label: 'Círculo Girando' },
                  { value: 'pulse', label: 'Círculo Pulsando' },
                  { value: 'dots', label: 'Três Pontinhos' },
                ]} />
              </Field>
              <Field label="Cor da Animação"><ColorPicker value={block.loadingColor || theme.accent || '#6366f1'} onChange={v => onChange({ loadingColor: v })} /></Field>
              <Field label="Texto de Carregamento"><Input value={block.loadingText} onChange={v => onChange({ loadingText: v })} placeholder="Analisando perfil..." /></Field>
              <Field label="Texto de Progresso (opcional)"><Input value={block.progressText} onChange={v => onChange({ progressText: v })} placeholder="Gerando plano personalizado..." /></Field>
              <Field label={`Tempo de Carregamento: ${block.loadingDuration || 3}s`}>
                <input type="range" min={1} max={15} step={1} value={block.loadingDuration || 3}
                  onChange={e => onChange({ loadingDuration: Number(e.target.value) })}
                  className="w-full accent-indigo-500 cursor-pointer" />
              </Field>
            </>
          )}
        </Section>
        <Section title="Botão CTA">
          <Toggle label="Mostrar Botão de Ação" value={block.enableButton !== false} onChange={v => onChange({ enableButton: v })} />
          {block.enableButton !== false && (
            <>
              <Field label="Texto do Botão"><Input value={block.buttonText} onChange={v => onChange({ buttonText: v })} /></Field>
              <Field label="Cor do Fundo do Botão"><ColorPicker value={block.buttonBg || theme?.accent || '#6366f1'} onChange={v => onChange({ buttonBg: v })} /></Field>
              <Field label="Cor do Texto do Botão"><ColorPicker value={block.buttonTextColor || '#ffffff'} onChange={v => onChange({ buttonTextColor: v })} /></Field>
              <Field label="Ação ao Clicar">
                <Select value={block.buttonAction || 'url'} onChange={v => onChange({ buttonAction: v })} options={[
                  { value: 'url', label: 'Abrir URL externa' },
                  { value: 'next_step', label: 'Ir para próxima etapa' },
                ]} />
              </Field>
              {(block.buttonAction || 'url') === 'url' && (
                <Field label="URL do Botão"><Input value={block.buttonUrl} onChange={v => onChange({ buttonUrl: v })} placeholder="https://..." /></Field>
              )}
              {block.buttonAction === 'next_step' && (
                <Field label="Etapa Destino">
                  <Select value={block.nextStep || ''} onChange={v => onChange({ nextStep: v })} options={[
                    { value: '', label: 'Próxima etapa automaticamente' },
                    ...(steps || []).filter((_, i) => i !== currentStepIdx).map((s, i) => ({ value: s.id, label: s.label || `Etapa ${i + 1}` }))
                  ]} />
                </Field>
              )}
              {block.buttonAction === 'next_step' && (
                <Toggle label="Clicar em qualquer lugar avança" value={block.clickAnywhere} onChange={v => onChange({ clickAnywhere: v })} />
              )}
            </>
          )}
        </Section>
      </div>
    </>
  );
}

function AnimatedProgressEditor({ block, onChange }) {
  const currentSuffix = block.textSuffix !== undefined 
    ? block.textSuffix 
    : (block.text ? block.text.replace('{pct}%', '').replace('{pct}', '') : ' das vagas preenchidas...');

  return (
    <>
      <Section title="Barra Animada">
        <Field label="Texto Padrão (aparecerá após a %)">
          <div className="flex items-center">
            <span className="bg-slate-700/50 border border-slate-700 border-r-0 rounded-l-xl px-3 py-2 text-sm text-slate-400 select-none">
              {block.startVal === '' ? 0 : (block.startVal ?? 0)}%
            </span>
            <input 
              type="text"
              value={currentSuffix}
              onChange={e => onChange({ textSuffix: e.target.value, text: `{pct}%${e.target.value}` })}
              placeholder=" das vagas preenchidas..."
              className="w-full bg-slate-800/60 border border-slate-700 rounded-r-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
            />
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Início (%)">
            <input type="number" 
              value={block.startVal !== undefined ? block.startVal : 0} 
              onChange={e => onChange({ startVal: e.target.value === '' ? '' : Number(e.target.value) })}
              className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
          </Field>
          <Field label="Fim (%)">
            <input type="number" 
              value={block.endVal !== undefined ? block.endVal : 84} 
              onChange={e => onChange({ endVal: e.target.value === '' ? '' : Number(e.target.value) })}
              className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
          </Field>
        </div>
        <Field label="Duração da animação (segundos)">
          <input type="number" value={block.duration ?? 5} step={0.5} onChange={e => onChange({ duration: Number(e.target.value) })}
            className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
        </Field>
        <Field label="Delay (Segundos, antes de começar)">
          <input type="number" value={block.delay ?? 0} step={0.5} onChange={e => onChange({ delay: Number(e.target.value) })}
            className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
        </Field>
      </Section>
      <Section title="Design">
        <Field label="Cor de Fundo da Barra"><ColorPicker value={block.bg} onChange={v => onChange({ bg: v })} /></Field>
        <Field label="Cor do Progresso (Preenchimento)"><ColorPicker value={block.color} onChange={v => onChange({ color: v })} /></Field>
        <Field label="Cor da Borda"><ColorPicker value={block.border} onChange={v => onChange({ border: v })} /></Field>
        <Field label="Cor do Texto"><ColorPicker value={block.textColor} onChange={v => onChange({ textColor: v })} /></Field>
        <Field label="Altura da Barra (px)">
          <input type="range" min={10} max={60} step={2} value={block.barHeight || 36}
            onChange={e => onChange({ barHeight: Number(e.target.value) })}
            className="w-full accent-indigo-500 cursor-pointer" />
        </Field>
        <Field label="Arredondamento">
          <Select value={block.rounded || 'none'} onChange={v => onChange({ rounded: v })} options={[
            { value: 'none', label: 'Quadrado' },
            { value: 'md', label: 'Médio' },
            { value: 'xl', label: 'Grande' },
            { value: 'full', label: 'Totalmente Arredondado' },
          ]} />
        </Field>
      </Section>
    </>
  );
}

function SpacerEditor({ block, onChange }) {
  return (
    <Section title="Espaçamento Vazio">
      <Field label="Altura em Pixels">
        <input type="range" min={10} max={200} step={5} value={block.height || 40}
          onChange={e => onChange({ height: Number(e.target.value) })}
          className="w-full accent-indigo-500 cursor-pointer" />
        <span className="text-xs text-indigo-400">{block.height || 40}px</span>
      </Field>
    </Section>
  );
}

function LiveCounterEditor({ block, onChange, steps, currentStepIdx }) {
  const currentStep = steps?.[currentStepIdx];
  const currentStepId = currentStep?.id;
  
  const masterBlock = steps?.flatMap(s => s.blocks).find(b => b.type === 'live_counter' && b.syncSteps && b.syncSteps.includes(currentStepId) && b.id !== block.id);

  if (masterBlock) {
    const masterStep = steps.find(s => s.blocks.some(b => b.id === masterBlock.id));
    return (
      <Section title="Marcador Ao Vivo (Oscilante)">
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 text-center">
          <p className="text-sm text-indigo-300 font-medium mb-1">Integração Contínua Ativa</p>
          <p className="text-xs text-indigo-400/80">
            Este marcador está configurado para continuar exatamente a progressão da <strong>{masterStep?.label || 'Etapa Mestre'}</strong>.
            Para editar texto, cor, variação ou valores, vá até a {masterStep?.label || 'etapa mestre'} e edite lá.
          </p>
        </div>
      </Section>
    );
  }

  const syncOptions = (steps || []).filter(s => s.id !== currentStepId);

  return (
    <Section title="Marcador Ao Vivo (Oscilante)">
      <Field label="Texto ao lado do número">
        <Input 
          value={block.text || 'pessoas assistindo'} 
          onChange={v => onChange({ text: v })} 
          placeholder="ex: pessoas assistindo agora" 
        />
      </Field>
      
      <div className="grid grid-cols-2 gap-3 mb-2">
        <Field label={block.countMode === 'increasing' ? "Começa no número" : "Mínimo"}>
          <input type="number" value={block.minAmount ?? 40} onChange={e => onChange({ minAmount: Number(e.target.value) })}
            className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
        </Field>
        <Field label={block.countMode === 'increasing' ? "Limite máximo" : "Máximo"}>
          <input type="number" value={block.maxAmount ?? 60} onChange={e => onChange({ maxAmount: Number(e.target.value) })}
            className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
        </Field>
      </div>

      <Field label="Comportamento da Contagem">
        <Select value={block.countMode || 'random'} onChange={v => onChange({ countMode: v })} options={[
          { value: 'random', label: 'Oscilando (Aleatório)' },
          { value: 'increasing', label: 'Apenas Crescente (Aumenta aos poucos)' },
        ]} />
      </Field>

      <Field label="Alinhamento">
        <Select value={block.align || 'center'} onChange={v => onChange({ align: v })} options={[
          { value: 'left', label: 'Esquerda' },
          { value: 'center', label: 'Centro' },
          { value: 'right', label: 'Direita' }
        ]} />
      </Field>

      <Field label="Tamanho da Fonte (px)">
        <input type="range" min={10} max={60} step={1} value={block.textSize || 14}
          onChange={e => onChange({ textSize: Number(e.target.value) })}
          className="w-full accent-indigo-500 cursor-pointer" />
        <span className="text-xs text-indigo-400">{block.textSize || 14}px</span>
      </Field>

      <Field label="Cor Principal (Bolinha e Número)">
        <ColorPicker value={block.color || '#ef4444'} onChange={v => onChange({ color: v })} />
      </Field>

      <Field label="Cor do Texto Secundário">
        <ColorPicker value={block.textColor || '#94a3b8'} onChange={v => onChange({ textColor: v })} />
      </Field>

      <Field label="Cor de Fundo da Caixa">
        <ColorPicker value={block.bg || 'transparent'} onChange={v => onChange({ bg: v })} />
        <p className="text-xs text-slate-500 mt-1 pb-1">Use "transparent" para não ter caixa.</p>
      </Field>

      {syncOptions.length > 0 && (
        <div className="mt-4 p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5">
          <label className="block text-xs font-bold text-indigo-400 mb-2 uppercase tracking-wide">
            Progresso Contínuo
          </label>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Marque as etapas abaixo onde esta exata mesma contagem deve continuar. (O marcador ficará bloqueado para edição nessas etapas e usará sempre estes números).
          </p>
          <div className="flex flex-col gap-3">
            {syncOptions.map(s => {
              const isChecked = block.syncSteps?.includes(s.id);
              return (
                <label key={s.id} className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isChecked ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600 group-hover:border-indigo-400'}`}>
                    {isChecked && <CheckCircle2 size={12} className="text-white" />}
                  </div>
                  <span className={`text-sm ${isChecked ? 'text-indigo-200' : 'text-slate-400 md:group-hover:text-slate-300'}`}>{s.label || 'Sem Nome'}</span>
                  <input type="checkbox" className="hidden" 
                    checked={isChecked || false}
                    onChange={(e) => {
                      const currentSync = block.syncSteps || [];
                      if (e.target.checked) {
                        onChange({ syncSteps: [...currentSync, s.id] });
                      } else {
                        onChange({ syncSteps: currentSync.filter(id => id !== s.id) });
                      }
                    }} 
                  />
                </label>
              )
            })}
          </div>
        </div>
      )}
    </Section>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────────────────────
export default function BlockEditor({ block, theme, steps, currentStepIdx, onChange }) {
  if (!block) return null;

  const editorMap = {
    heading: HeadingEditor,
    text: TextEditor,
    image: ImageEditor,
    audio: AudioEditor,
    video: VideoEditor,
    button: ButtonEditor,
    arrow_button: ArrowButtonEditor,
    divider: DividerEditor,
    progress: ProgressEditor,
    animated_progress: AnimatedProgressEditor,
    live_counter: LiveCounterEditor,
    lead_capture: LeadCaptureEditor,
    result: ResultEditor,
    spacer: SpacerEditor,
  };

  const Editor = editorMap[block.type];

  return (
    <div className="space-y-4">
      {Editor ? (
        <Editor block={block} onChange={onChange} steps={steps} currentStepIdx={currentStepIdx} theme={theme} />
      ) : (
        <p className="text-sm text-slate-500 text-center py-8">Nenhuma opção de edição para este bloco.</p>
      )}
    </div>
  );
}
