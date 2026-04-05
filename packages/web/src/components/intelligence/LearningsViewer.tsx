/**
 * LearningsViewer — interactive learning management with Boost/Degrade/Forget/Restore.
 * DG-126 Phase 3B.
 */

import { useState, useEffect, useCallback } from 'react';
import { ApiClient } from '../../api/client';
import { useSessionStore } from '../../store/session-store';

interface Learning {
  id: string;
  content: string;
  category: string;
  confidence: { score: number; source: string; evidenceCount: number; lastReinforced: string; lastReinforcedCycle: number };
  createdAt: string;
  createdInCycle: number;
}

const SOURCE_LABELS: Record<string, string> = { EXPLICIT: 'User', REPEATED: 'Repeated', INFERRED: 'Inferred' };
const SOURCE_COLORS: Record<string, string> = { EXPLICIT: 'text-green-400', REPEATED: 'text-blue-400', INFERRED: 'text-yellow-400' };

function confColor(s: number): string {
  if (s >= 0.6) return 'bg-green-500';
  if (s >= 0.4) return 'bg-yellow-500';
  return 'bg-gray-500';
}

export function LearningsViewer() {
  const session = useSessionStore();
  const [learnings, setLearnings] = useState<Learning[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const fetchLearnings = useCallback(() => {
    setLoading(true);
    const client = new ApiClient(session.tenantId, session.projectId);
    client.getLearnings()
      .then((d: unknown) => setLearnings(Array.isArray(d) ? d as Learning[] : []))
      .catch(() => setLearnings([]))
      .finally(() => setLoading(false));
  }, [session.tenantId, session.projectId]);

  useEffect(() => { fetchLearnings(); }, [fetchLearnings]);

  const active = learnings.filter((l) => l.confidence.score >= 0.2);
  const archived = learnings.filter((l) => l.confidence.score < 0.2);

  const act = async (id: string, action: 'boost' | 'degrade' | 'forget' | 'restore') => {
    setActing(id);
    try {
      const c = new ApiClient(session.tenantId, session.projectId);
      if (action === 'boost') await c.boostLearning(id);
      else if (action === 'degrade') await c.degradeLearning(id);
      else if (action === 'forget') await c.forgetLearning(id);
      else await c.restoreLearning(id);
      fetchLearnings();
    } catch { /* silent */ }
    finally { setActing(null); }
  };

  const renderItem = (l: Learning, isArchived = false) => (
    <div key={l.id} className={`bg-gray-800 rounded-lg p-3 border border-gray-700 ${isArchived ? 'opacity-60' : ''}`}>
      <button onClick={() => setExpandedId(expandedId === l.id ? null : l.id)} className="w-full text-left">
        <div className="text-sm text-white mb-1 line-clamp-2">{l.content}</div>
      </button>
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 bg-gray-700 rounded-full h-1.5">
          <div className={`h-1.5 rounded-full transition-all ${confColor(l.confidence.score)}`}
            style={{ width: `${Math.round(l.confidence.score * 100)}%` }} />
        </div>
        <span className="text-xs text-gray-400 w-8 text-right">{Math.round(l.confidence.score * 100)}%</span>
      </div>
      <div className="flex items-center gap-2 text-xs flex-wrap">
        <span className={SOURCE_COLORS[l.confidence.source] ?? 'text-gray-400'}>
          {SOURCE_LABELS[l.confidence.source] ?? l.confidence.source}
        </span>
        <span className="text-gray-600">|</span>
        <span className="text-gray-500">C{l.createdInCycle}</span>
        {l.confidence.evidenceCount > 1 && <span className="text-gray-500">{l.confidence.evidenceCount}x</span>}
        <span className="bg-gray-700 px-1.5 py-0.5 rounded text-gray-400">{l.category}</span>
      </div>
      {expandedId === l.id && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="flex gap-1.5">
            {!isArchived ? (
              <>
                <button onClick={() => act(l.id, 'boost')} disabled={acting === l.id || l.confidence.score >= 1.0}
                  className="text-xs px-2 py-1 bg-green-900/50 text-green-400 rounded hover:bg-green-900 disabled:opacity-30 transition">Boost</button>
                <button onClick={() => act(l.id, 'degrade')} disabled={acting === l.id}
                  className="text-xs px-2 py-1 bg-yellow-900/50 text-yellow-400 rounded hover:bg-yellow-900 disabled:opacity-30 transition">Degrade</button>
                <button onClick={() => act(l.id, 'forget')} disabled={acting === l.id}
                  className="text-xs px-2 py-1 bg-red-900/50 text-red-400 rounded hover:bg-red-900 disabled:opacity-30 transition">Forget</button>
              </>
            ) : (
              <button onClick={() => act(l.id, 'restore')} disabled={acting === l.id}
                className="text-xs px-2 py-1 bg-blue-900/50 text-blue-400 rounded hover:bg-blue-900 disabled:opacity-30 transition">Restore</button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Learnings</h3>
        <span className="text-xs text-gray-500">
          {active.length > 0 ? `${active.length} active | Avg ${Math.round(active.reduce((s, l) => s + l.confidence.score, 0) / active.length * 100)}%` : '0'}
        </span>
      </div>
      {loading && <div className="text-gray-500 text-xs">Loading...</div>}
      {!loading && learnings.length === 0 && <p className="text-xs text-gray-600">No learnings yet.</p>}
      {active.map((l) => renderItem(l))}
      {archived.length > 0 && (
        <details className="mt-4">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">Archived ({archived.length})</summary>
          <div className="mt-2 space-y-2">{archived.map((l) => renderItem(l, true))}</div>
        </details>
      )}
    </div>
  );
}
