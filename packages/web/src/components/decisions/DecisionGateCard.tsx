import { useState } from 'react';
import type { DecisionGate } from '../../store/chat-store';

interface Props {
  gate: DecisionGate;
  onSubmit: (option: string, rationale?: string) => void;
  isSubmitting?: boolean;
}

export function DecisionGateCard({ gate, onSubmit, isSubmitting }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [rationale, setRationale] = useState('');

  return (
    <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-4 my-4">
      <h3 className="text-yellow-400 font-bold text-lg mb-1">Decision Gate</h3>
      <p className="text-gray-300 text-sm mb-4">{gate.description}</p>

      <div className="space-y-2 mb-4">
        {gate.options.map((option) => (
          <button
            key={option.id}
            onClick={() => setSelected(option.id)}
            className={`w-full text-left p-3 rounded-lg border transition-colors ${
              selected === option.id
                ? 'border-synaptic-500 bg-synaptic-900/30'
                : 'border-gray-600 bg-gray-800 hover:border-gray-500'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                selected === option.id ? 'border-synaptic-500 bg-synaptic-500 text-white' : 'border-gray-500 text-gray-400'
              }`}>
                {option.id}
              </span>
              <span className="font-semibold text-white">{option.label}</span>
              {option.riskLevel && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  option.riskLevel === 'low' ? 'bg-green-800 text-green-300' :
                  option.riskLevel === 'medium' ? 'bg-yellow-800 text-yellow-300' :
                  'bg-red-800 text-red-300'
                }`}>{option.riskLevel}</span>
              )}
            </div>
            <p className="text-gray-400 text-sm mt-1 ml-8">{option.description}</p>
          </button>
        ))}
      </div>

      {gate.recommendation && (
        <p className="text-sm text-synaptic-400 mb-3">Recommendation: {gate.recommendation}</p>
      )}

      <textarea
        value={rationale}
        onChange={(e) => setRationale(e.target.value)}
        placeholder="Optional: explain your reasoning..."
        className="w-full bg-gray-800 text-white rounded p-2 text-sm border border-gray-600 mb-3"
        rows={2}
      />

      <button
        onClick={() => selected && onSubmit(selected, rationale || undefined)}
        disabled={!selected || isSubmitting}
        className="w-full py-2 bg-synaptic-600 hover:bg-synaptic-700 text-white rounded-lg font-semibold disabled:opacity-50"
      >
        {isSubmitting ? 'Submitting...' : 'Confirm Decision'}
      </button>
    </div>
  );
}
