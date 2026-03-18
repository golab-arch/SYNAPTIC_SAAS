import { useState, useEffect } from 'react';
import { ApiClient } from '../../api/client';
import { useSessionStore } from '../../store/session-store';

interface Learning { learningId: string; title: string; description: string; type: string; confidence: { score: number; source: string } }

const SOURCE_COLORS: Record<string, string> = { EXPLICIT: 'text-green-400', REPEATED: 'text-blue-400', INFERRED: 'text-yellow-400' };
const TYPE_LABELS: Record<string, string> = { pattern: 'PTN', preference: 'PRF', constraint: 'CST', architecture: 'ARC', convention: 'CNV', tool_usage: 'TUL' };

export function LearningsViewer() {
  const session = useSessionStore();
  const [learnings, setLearnings] = useState<Learning[]>([]);
  const [loading, setLoading] = useState(true);
  const [minConf, setMinConf] = useState(0);

  useEffect(() => {
    new ApiClient(session.tenantId, session.projectId)
      .getLearnings(minConf > 0 ? minConf / 100 : undefined)
      .then((d) => setLearnings(Array.isArray(d) ? d : []))
      .catch(() => setLearnings([]))
      .finally(() => setLoading(false));
  }, [session.tenantId, session.projectId, minConf]);

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Learnings</h3>
        <span className="text-xs text-gray-500">{learnings.length}</span>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500">Min:</label>
        <input type="range" min={0} max={100} step={10} value={minConf} onChange={(e) => setMinConf(Number(e.target.value))}
          className="flex-1 h-1 accent-synaptic-500" />
        <span className="text-xs text-gray-400 w-8">{minConf}%</span>
      </div>
      {loading && <div className="text-gray-500 text-xs">Loading...</div>}
      {!loading && learnings.length === 0 && <p className="text-xs text-gray-600">No learnings yet.</p>}
      {learnings.map((l) => (
        <div key={l.learningId} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <div className="text-sm font-semibold text-white mb-1">{l.title}</div>
          <p className="text-xs text-gray-400 mb-2">{l.description}</p>
          <div className="flex items-center gap-2 text-xs">
            <span className={SOURCE_COLORS[l.confidence.source] ?? 'text-gray-400'}>
              {l.confidence.source}: {Math.round(l.confidence.score * 100)}%
            </span>
            <span className="bg-gray-700 px-1.5 py-0.5 rounded text-gray-400">{TYPE_LABELS[l.type] ?? l.type}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
