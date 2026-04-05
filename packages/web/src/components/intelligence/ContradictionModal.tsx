/**
 * ContradictionModal — shows when two learnings contradict (DG-126 Phase 3B).
 * Side-by-side comparison with Keep Old / Keep New / Keep Both resolution.
 */

import { useState } from 'react';

export interface ContradictionData {
  contradictionId: string;
  newLearning: { content: string; category: string; confidence: { score: number; source: string } };
  existingLearning: { content: string; category: string; confidence: { score: number; source: string } };
  category: string;
  severity: 'high' | 'medium' | 'low';
  explanation: string;
}

type Resolution = 'keep_old' | 'keep_new' | 'keep_both';

interface Props {
  contradiction: ContradictionData;
  onResolve: (resolution: Resolution) => void;
  onDismiss: () => void;
}

const SEV_BORDER: Record<string, string> = { high: 'border-l-red-500', medium: 'border-l-yellow-500', low: 'border-l-blue-500' };
const SEV_BADGE: Record<string, string> = { high: 'bg-red-900/50 text-red-400', medium: 'bg-yellow-900/50 text-yellow-400', low: 'bg-blue-900/50 text-blue-400' };

export function ContradictionModal({ contradiction, onResolve, onDismiss }: Props) {
  const [selected, setSelected] = useState<Resolution | null>(null);
  const [resolving, setResolving] = useState(false);

  const handleResolve = () => {
    if (!selected) return;
    setResolving(true);
    onResolve(selected);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className={`bg-gray-900 border border-gray-700 border-l-4 ${SEV_BORDER[contradiction.severity] ?? 'border-l-gray-500'} rounded-lg shadow-xl max-w-lg w-full mx-4 p-6`}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-semibold text-white">Learning Contradiction Detected</h3>
        </div>

        <div className="flex gap-2 mb-3">
          <span className={`text-xs px-2 py-0.5 rounded ${SEV_BADGE[contradiction.severity] ?? ''}`}>{contradiction.severity}</span>
          <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{contradiction.category}</span>
        </div>

        <p className="text-sm text-gray-400 mb-4">{contradiction.explanation}</p>

        {/* Side-by-side */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button onClick={() => setSelected('keep_old')}
            className={`p-3 rounded border text-left transition ${selected === 'keep_old' ? 'border-blue-500 bg-blue-900/20' : 'border-gray-700 bg-gray-800 hover:border-gray-600'}`}>
            <div className="text-xs text-gray-500 mb-1">Existing</div>
            <p className="text-sm text-white line-clamp-3">{contradiction.existingLearning.content}</p>
            <span className="text-xs text-gray-500 mt-1 block">{Math.round(contradiction.existingLearning.confidence.score * 100)}%</span>
          </button>
          <button onClick={() => setSelected('keep_new')}
            className={`p-3 rounded border text-left transition ${selected === 'keep_new' ? 'border-green-500 bg-green-900/20' : 'border-gray-700 bg-gray-800 hover:border-gray-600'}`}>
            <div className="text-xs text-gray-500 mb-1">New</div>
            <p className="text-sm text-white line-clamp-3">{contradiction.newLearning.content}</p>
            <span className="text-xs text-gray-500 mt-1 block">{Math.round(contradiction.newLearning.confidence.score * 100)}%</span>
          </button>
        </div>

        <button onClick={() => setSelected('keep_both')}
          className={`w-full p-2 rounded border text-center text-sm transition mb-4 ${selected === 'keep_both' ? 'border-purple-500 bg-purple-900/20 text-purple-300' : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'}`}>
          Keep Both (not contradictory)
        </button>

        <div className="flex gap-2 justify-end">
          <button onClick={onDismiss} disabled={resolving}
            className="px-4 py-2 text-sm bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition disabled:opacity-50">Decide Later</button>
          <button onClick={handleResolve} disabled={!selected || resolving}
            className="px-4 py-2 text-sm bg-synaptic-600 text-white rounded hover:bg-synaptic-500 transition disabled:opacity-50">
            {resolving ? 'Resolving...' : 'Apply Resolution'}
          </button>
        </div>
      </div>
    </div>
  );
}
