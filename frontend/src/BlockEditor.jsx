import React from 'react';

export default function BlockEditor({ block, theme, steps, currentStepIdx, onChange }) {
  if (!block) return null;

  return (
    <div className="p-4 bg-slate-800 rounded-xl text-slate-300">
      <h3 className="text-lg font-bold mb-4 text-white">Editar: {block.type}</h3>
      <div className="space-y-4">
        {block.type === 'heading' || block.type === 'text' ? (
          <div>
            <label className="block text-sm mb-1 text-slate-400">Texto</label>
            <input 
              type="text" 
              value={block.text || ''} 
              onChange={e => onChange({ text: e.target.value })}
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            Nenhuma opção de edição específica para este bloco foi implementada ainda.
          </p>
        )}
      </div>
    </div>
  );
}
