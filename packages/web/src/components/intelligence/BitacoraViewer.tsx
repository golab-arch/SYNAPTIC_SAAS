import { useState, useEffect } from 'react';
import { ApiClient } from '../../api/client';
import { useSessionStore } from '../../store/session-store';

interface Entry { cycleId: number; timestamp: string; prompt?: string; result: string; compliance?: { score: number; grade: string } }

export function BitacoraViewer() {
  const session = useSessionStore();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    new ApiClient(session.tenantId, session.projectId)
      .getBitacora(30)
      .then((d) => setEntries(Array.isArray(d) ? d : []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [session.tenantId, session.projectId]);

  if (loading) return <div className="p-4 text-gray-500 text-sm">Loading bitacora...</div>;

  return (
    <div className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Bitacora</h3>
        <span className="text-xs text-gray-500">{entries.length} cycles</span>
      </div>
      {entries.length === 0 && <p className="text-xs text-gray-600">No cycles recorded yet.</p>}
      {entries.map((e) => (
        <div key={e.cycleId} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <button onClick={() => setExpanded(expanded === e.cycleId ? null : e.cycleId)}
            className="w-full flex items-center justify-between p-2.5 hover:bg-gray-750 text-left">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-synaptic-400">C{e.cycleId}</span>
              {e.compliance && (
                <span className={`text-[10px] px-1 py-0.5 rounded font-bold text-white ${
                  e.compliance.grade === 'A' ? 'bg-green-700' : e.compliance.grade === 'B' ? 'bg-blue-700' : 'bg-yellow-700'
                }`}>{e.compliance.grade}</span>
              )}
              <span className={`text-[10px] px-1 py-0.5 rounded ${e.result === 'SUCCESS' ? 'bg-green-900 text-green-400' : 'bg-yellow-900 text-yellow-400'}`}>{e.result}</span>
            </div>
            <span className="text-[10px] text-gray-500">{new Date(e.timestamp).toLocaleDateString()}</span>
          </button>
          {expanded === e.cycleId && (
            <div className="px-3 pb-3 border-t border-gray-700 pt-2 space-y-2">
              {e.prompt && <div><span className="text-[10px] text-gray-500">Prompt:</span><p className="text-xs text-gray-300 bg-gray-900 rounded p-2 mt-0.5">{e.prompt}</p></div>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
