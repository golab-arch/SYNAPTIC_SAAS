import { useState, useEffect } from 'react';
import { ApiClient } from '../../api/client';
import { useSessionStore } from '../../store/session-store';

interface DecisionRecord { gateId: string; selectedOption: string; rationale?: string; timestamp: string }

export function DecisionHistory() {
  const session = useSessionStore();
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    new ApiClient(session.tenantId, session.projectId)
      .getDecisions()
      .then((d) => setDecisions(Array.isArray(d) ? d : []))
      .catch(() => setDecisions([]))
      .finally(() => setLoading(false));
  }, [session.tenantId, session.projectId]);

  if (loading) return <div className="p-4 text-gray-500 text-sm">Loading decisions...</div>;

  return (
    <div className="p-4 space-y-3">
      <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Decisions</h3>
      {decisions.length === 0 && <p className="text-xs text-gray-600">No decisions recorded yet.</p>}
      {decisions.map((d, i) => (
        <div key={i} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-purple-400">{d.gateId}</span>
            <span className="text-xs text-gray-500">{new Date(d.timestamp).toLocaleString()}</span>
          </div>
          <div className="text-sm text-white">
            Selected: <span className="font-semibold text-synaptic-400">{d.selectedOption}</span>
          </div>
          {d.rationale && <p className="text-xs text-gray-400 mt-1 italic">{d.rationale}</p>}
        </div>
      ))}
    </div>
  );
}
