import React, { useState, useRef, useEffect } from 'react';
import EmojiPicker, { Emoji } from 'emoji-picker-react';
import { Trash2 } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { TextAlign } from '@tiptap/extension-text-align';
import { Placeholder } from '@tiptap/extension-placeholder';

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
        <button
          onClick={() => setOpen(!open)}
          className="flex-1 flex items-center justify-between bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            {unified ? <Emoji unified={unified} size={18} /> : emoji || 'Selecionar Emoji...'}
          </span>
          <span className="text-xs text-slate-500">▼</span>
        </button>
        {(emoji !== '' && unified !== '') && (
          <button onClick={() => onChange('', '')} title="Remover emoji"
            className="w-9 h-9 flex items-center justify-center bg-red-600/20 hover:bg-red-600/40 border border-red-600/30 hover:border-red-500 rounded-xl text-red-400 text-sm transition-colors cursor-pointer">
            ✕
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 shadow-2xl rounded-lg overflow-hidden border border-slate-700">
          <EmojiPicker
            theme="dark"
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
      <div className="bg-slate-800/60 border border-t-0 border-slate-700 rounded-b-xl overflow-hidden">
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

function ImageEditor({ block, onChange }) {
  return (
    <Section title="Imagem">
      {/* Upload do PC */}
      {block.src?.startsWith('data:image') && (
        <div className="relative w-full rounded-xl overflow-hidden border border-slate-700 mb-1" style={{ height: 80 }}>
          <img src={block.src} alt="" className="w-full h-full object-cover" />
          <button onClick={() => onChange({ src: '' })}
            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600/90 hover:bg-red-500 text-white flex items-center justify-center cursor-pointer text-xs">×</button>
        </div>
      )}
      <label className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-dashed border-slate-600 hover:border-indigo-500/50 text-slate-500 hover:text-indigo-400 transition-all cursor-pointer bg-slate-800/30 hover:bg-slate-800/60 text-xs mb-1">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        {block.src?.startsWith('data:image') ? '✅ Imagem carregada do PC' : 'Carregar Imagem do Computador'}
        <input type="file" accept="image/*" className="hidden" onChange={e => {
          const file = e.target.files[0]; if (!file) return;
          const reader = new FileReader();
          reader.onload = ev => onChange({ src: ev.target.result });
          reader.readAsDataURL(file);
        }} />
      </label>

      <Field label="Texto Alternativo"><Input value={block.alt} onChange={v => onChange({ alt: v })} placeholder="Descrição da imagem" /></Field>
      <Field label="Altura (px)">
        <input type="range" min={80} max={600} value={block.height || 200}
          onChange={e => onChange({ height: Number(e.target.value) })}
          className="w-full accent-indigo-500 cursor-pointer" />
        <span className="text-xs text-indigo-400">{block.height || 200}px</span>
      </Field>
      <Field label="Ajuste de Imagem">
        <Select value={block.fit || 'cover'} onChange={v => onChange({ fit: v })} options={[
          { value: 'cover', label: 'Cover (Preencher)' }, { value: 'contain', label: 'Contain (Conter)' }, { value: 'fill', label: 'Fill (Esticar)' }
        ]} />
      </Field>
      <Toggle label="Bordas Arredondadas" value={block.rounded} onChange={v => onChange({ rounded: v })} />
    </Section>
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

function ButtonEditor({ block, onChange, steps }) {
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

      <Section title="Ação">
        <Field label="Ir para Etapa">
          <StepSelect steps={steps} value={block.nextStep} onChange={v => onChange({ nextStep: v })} placeholder="-- Próxima Etapa --" />
        </Field>
        <Toggle label="Largura Total" value={block.fullWidth !== false} onChange={v => onChange({ fullWidth: v })} />
      </Section>
    </>
  );
}

function ArrowButtonEditor({ block, onChange, steps }) {
  return (
    <>
      <Section title="Botão Seta">
        <Field label="Texto"><Input value={block.text} onChange={v => onChange({ text: v })} /></Field>
        <Field label="Cor de Fundo"><ColorPicker value={block.bg} onChange={v => onChange({ bg: v })} /></Field>
        <Field label="Cor do Texto"><ColorPicker value={block.textColor} onChange={v => onChange({ textColor: v })} /></Field>
        <Field label="Estilo">
          <Select value={block.style || 'pill'} onChange={v => onChange({ style: v })} options={[
            { value: 'pill', label: 'Pílula' }, { value: 'square', label: 'Quadrado' }
          ]} />
        </Field>
      </Section>
      <Section title="Ação">
        <Field label="Ir para Etapa">
          <StepSelect steps={steps} value={block.nextStep} onChange={v => onChange({ nextStep: v })} />
        </Field>
        <Toggle label="Mostrar ícone de seta" value={block.showIcon !== false} onChange={v => onChange({ showIcon: v })} />
        <Toggle label="Largura Total" value={block.fullWidth !== false} onChange={v => onChange({ fullWidth: v })} />
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
      <Toggle label="Mostrar Rótulo" value={block.showLabel !== false} onChange={v => onChange({ showLabel: v })} />
    </Section>
  );
}

function LeadCaptureEditor({ block, onChange, steps, theme }) {
  const all = ['name', 'email', 'phone', 'message'];
  const labels = { name: 'Nome', email: 'E-mail', phone: 'Telefone', message: 'Mensagem' };
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
                  placeholder={`Placeholder: Ex: Seu ${labels[f].toLowerCase()}...`}
                />
              </div>
            )}
          </div>
        ))}
        <div className="pt-3 border-t border-white/5 mt-3 space-y-3">
          <Field label="Cor de Fundo do Campo">
            <ColorPicker value={block.fieldBg || 'rgba(255,255,255,0.07)'} onChange={v => onChange({ fieldBg: v })} />
          </Field>
          <Field label="Cor do Texto do Campo">
            <ColorPicker value={block.fieldTextColor || '#ffffff'} onChange={v => onChange({ fieldTextColor: v })} />
          </Field>
          <Field label="Cor da Borda do Campo">
            <ColorPicker value={block.fieldBorderColor || 'rgba(255,255,255,0.12)'} onChange={v => onChange({ fieldBorderColor: v })} />
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
  return (
    <>
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
        <Field label="Emoji Gigante"><EmojiSelect emoji={block.emoji} unified={block.emojiUnified} onChange={(e, u) => onChange({ emoji: e, emojiUnified: u })} /></Field>
        <Field label="Título"><Input value={block.heading} onChange={v => onChange({ heading: v })} /></Field>
        <Field label="Texto">
          <textarea value={block.text || ''} onChange={e => onChange({ text: e.target.value })} rows={3}
            className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 resize-none" />
        </Field>
      </Section>
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
        <Field label="Texto do Botão"><Input value={block.buttonText} onChange={v => onChange({ buttonText: v })} /></Field>
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
        <Field label="Cor do Botão"><ColorPicker value={block.buttonBg} onChange={v => onChange({ buttonBg: v })} /></Field>
        {block.buttonAction === 'next_step' && (
          <Toggle label="Clicar em qualquer lugar avança" value={block.clickAnywhere} onChange={v => onChange({ clickAnywhere: v })} />
        )}
      </Section>
    </>
  );
}

function AnimatedProgressEditor({ block, onChange }) {
  return (
    <>
      <Section title="Barra Animada">
        <Field label="Padrão de Texto (use {pct} para o número)">
          <Input value={block.text} onChange={v => onChange({ text: v })} placeholder="Ex: {pct}% das vagas preenchidas..." />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Início (%)">
            <input type="number" value={block.startVal ?? 0} onChange={e => onChange({ startVal: Number(e.target.value) })}
              className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
          </Field>
          <Field label="Fim (%)">
            <input type="number" value={block.endVal ?? 84} onChange={e => onChange({ endVal: Number(e.target.value) })}
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
