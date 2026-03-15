import React, { useState, useRef, useEffect } from 'react';
import EmojiPicker, { Emoji } from 'emoji-picker-react';

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
        className={`w-10 h-5 rounded-full transition-colors relative ${value ? 'bg-indigo-500' : 'bg-slate-700'} cursor-pointer`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
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
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2">
          {unified ? <Emoji unified={unified} size={18} /> : emoji || 'Selecionar Emoji...'}
        </span>
        <span className="text-xs text-slate-500">▼</span>
      </button>

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
// Block specific editors
// ────────────────────────────────────────────────────────────────────────────

function HeadingEditor({ block, onChange }) {
  return (
    <>
      <Section title="Conteúdo">
        <Field label="Emoji do Título"><EmojiSelect emoji={block.emoji} unified={block.emojiUnified} onChange={(e, u) => onChange({ emoji: e, emojiUnified: u })} /></Field>
        <Field label="Texto"><Input value={block.text} onChange={v => onChange({ text: v })} /></Field>
        <Field label="Tamanho">
          <Select value={block.size || 'xl'} onChange={v => onChange({ size: v })} options={[
            { value: 'sm', label: 'Pequeno' }, { value: 'base', label: 'Médio' },
            { value: 'xl', label: 'Grande' }, { value: '2xl', label: 'Extra Grande' }, { value: '4xl', label: 'Máximo' }
          ]} />
        </Field>
        <Field label="Alinhamento">
          <Select value={block.align || 'center'} onChange={v => onChange({ align: v })} options={[
            { value: 'left', label: 'Esquerda' }, { value: 'center', label: 'Centro' }, { value: 'right', label: 'Direita' }
          ]} />
        </Field>
        <Field label="Fundo do Título">
          <Select value={block.bgStyle || 'none'} onChange={v => onChange({ bgStyle: v })} options={[
            { value: 'none', label: 'Nenhum' },
            { value: 'rounded', label: 'Fundo Arredondado' },
            { value: 'square', label: 'Fundo Quadrado' },
            { value: 'glass', label: 'Efeito Ofuscado (Glass)' }
          ]} />
        </Field>
        {block.bgStyle && block.bgStyle !== 'none' && (
          <Field label="Cor da Caixa"><ColorPicker value={block.bgColor || '#1e293b'} onChange={v => onChange({ bgColor: v })} /></Field>
        )}
        <Field label="Cor do Texto"><ColorPicker value={block.color} onChange={v => onChange({ color: v })} /></Field>
        <Toggle label="Negrito" value={block.bold} onChange={v => onChange({ bold: v })} />
      </Section>
    </>
  );
}

function TextEditor({ block, onChange }) {
  return (
    <>
      <Section title="Conteúdo">
        <Field label="Texto">
          <textarea
            value={block.text || ''}
            onChange={e => onChange({ text: e.target.value })}
            rows={4}
            className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 resize-none"
          />
        </Field>
        <Field label="Tamanho">
          <Select value={block.size || 'base'} onChange={v => onChange({ size: v })} options={[
            { value: 'xs', label: 'Muito Pequeno' }, { value: 'sm', label: 'Pequeno' },
            { value: 'base', label: 'Médio' }, { value: 'lg', label: 'Grande' }
          ]} />
        </Field>
        <Field label="Alinhamento">
          <Select value={block.align || 'center'} onChange={v => onChange({ align: v })} options={[
            { value: 'left', label: 'Esquerda' }, { value: 'center', label: 'Centro' }, { value: 'right', label: 'Direita' }
          ]} />
        </Field>
        <Field label="Cor do Texto"><ColorPicker value={block.color} onChange={v => onChange({ color: v })} /></Field>
        <Toggle label="Negrito" value={block.bold} onChange={v => onChange({ bold: v })} />
      </Section>
    </>
  );
}

function ImageEditor({ block, onChange }) {
  return (
    <Section title="Imagem">
      <Field label="URL da Imagem"><Input value={block.src} onChange={v => onChange({ src: v })} placeholder="https://..." /></Field>
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
        <Field label="URL do Arquivo de Áudio (.mp3, .ogg)"><Input value={block.src} onChange={v => onChange({ src: v })} placeholder="https://example.com/audio.mp3" /></Field>
        <Field label="URL do Avatar do Remetente"><Input value={block.avatarSrc} onChange={v => onChange({ avatarSrc: v })} placeholder="https://example.com/foto.jpg" /></Field>
        <Field label="Nome do Remetente"><Input value={block.senderName} onChange={v => onChange({ senderName: v })} placeholder="Fulano" /></Field>
        <Field label="Duração (ex: 1:23)"><Input value={block.duration} onChange={v => onChange({ duration: v })} placeholder="0:30" /></Field>
      </Section>
      <Section title="Aparência">
        <Field label="Cor de Fundo da Bolha"><ColorPicker value={block.bgColor || '#075e54'} onChange={v => onChange({ bgColor: v })} /></Field>
        <Field label="Cor da Bolha"><ColorPicker value={block.bubbleColor || '#dcf8c6'} onChange={v => onChange({ bubbleColor: v })} /></Field>
        <Field label="Cor do Texto"><ColorPicker value={block.textColor || '#111b21'} onChange={v => onChange({ textColor: v })} /></Field>
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
        <Field label="URL da Thumbnail (Poster)"><Input value={block.thumbnailSrc} onChange={v => onChange({ thumbnailSrc: v })} placeholder="https://example.com/thumb.jpg" /></Field>
        <Field label="Ou Carregar Thumbnail do PC">
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
        <Toggle label="Ocultar Controles Nativos" value={block.hideControls} onChange={v => onChange({ hideControls: v })} />
        <Toggle label="Mostrar Timer" value={block.showTimer !== false} onChange={v => onChange({ showTimer: v })} />
        <Toggle label="Bordas Arredondadas" value={block.rounded !== false} onChange={v => onChange({ rounded: v })} />
      </Section>
      <Section title="🔇 Ícone de Mudo Animado (Panda VSL)">
        <p className="text-xs text-slate-500 leading-relaxed">Aparece automaticamente quando <strong className="text-slate-300">Autoplay + Mudo</strong> estão ativados.</p>
        <Field label="Texto do Botão de Desmutar">
          <Input value={block.unmuteText || ''} onChange={v => onChange({ unmuteText: v })} placeholder="🔊 Clique para ouvir" />
        </Field>
      </Section>
      <Section title="⏱️ Duração Falsa (VSL)">
        <Toggle label="Usar Duração Falsa" value={block.useFakeDuration} onChange={v => onChange({ useFakeDuration: v })} />
        {block.useFakeDuration && (
          <Field label="Duração em segundos">
            <input type="number" value={block.fakeDuration || 120} min={10} max={7200}
              onChange={e => onChange({ fakeDuration: Number(e.target.value) })}
              className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
            />
          </Field>
        )}
      </Section>
      <Section title="Botão CTA (Opcional)">
        <Field label="Texto do Botão"><Input value={block.ctaText} onChange={v => onChange({ ctaText: v })} placeholder="Quero mais informações →" /></Field>
        <Field label="URL do Botão"><Input value={block.ctaUrl} onChange={v => onChange({ ctaUrl: v })} placeholder="https://..." /></Field>
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
        <Field label="Cor de Fundo"><ColorPicker value={block.bg} onChange={v => onChange({ bg: v })} /></Field>
        <Field label="Cor do Texto"><ColorPicker value={block.textColor} onChange={v => onChange({ textColor: v })} /></Field>
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

function LeadCaptureEditor({ block, onChange }) {
  const all = ['name', 'email', 'phone', 'message'];
  const labels = { name: 'Nome', email: 'E-mail', phone: 'Telefone', message: 'Mensagem' };
  return (
    <>
      <Section title="Campos do Formulário">
        {all.map(f => (
          <Toggle key={f} label={labels[f]}
            value={block.fields?.includes(f)}
            onChange={v => onChange({ fields: v ? [...(block.fields || []), f] : (block.fields || []).filter(x => x !== f) })} />
        ))}
      </Section>
      <Section title="Botão">
        <Field label="Texto do Botão"><Input value={block.buttonText} onChange={v => onChange({ buttonText: v })} /></Field>
        <Field label="Cor do Botão"><ColorPicker value={block.buttonBg} onChange={v => onChange({ buttonBg: v })} /></Field>
      </Section>
    </>
  );
}

function ResultEditor({ block, onChange }) {
  return (
    <>
      <Section title="Resultado">
        <Field label="Emoji Gigante"><EmojiSelect emoji={block.emoji} unified={block.emojiUnified} onChange={(e, u) => onChange({ emoji: e, emojiUnified: u })} /></Field>
        <Field label="Título"><Input value={block.heading} onChange={v => onChange({ heading: v })} /></Field>
        <Field label="Texto">
          <textarea value={block.text || ''} onChange={e => onChange({ text: e.target.value })} rows={3}
            className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 resize-none" />
        </Field>
      </Section>
      <Section title="Botão CTA">
        <Field label="Texto do Botão"><Input value={block.buttonText} onChange={v => onChange({ buttonText: v })} /></Field>
        <Field label="URL do Botão"><Input value={block.buttonUrl} onChange={v => onChange({ buttonUrl: v })} placeholder="https://..." /></Field>
        <Field label="Cor do Botão"><ColorPicker value={block.buttonBg} onChange={v => onChange({ buttonBg: v })} /></Field>
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
