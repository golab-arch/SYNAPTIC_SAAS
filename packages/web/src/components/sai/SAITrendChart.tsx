import { useState, useEffect } from 'react';
import { ApiClient } from '../../api/client';
import { useSessionStore } from '../../store/session-store';

interface TrendPoint { cycle: number; score: number }

export function SAITrendChart() {
  const session = useSessionStore();
  const [trend, setTrend] = useState<TrendPoint[]>([]);

  useEffect(() => {
    new ApiClient(session.tenantId, session.projectId)
      .getSAIState()
      .then((d) => setTrend((d as unknown as { trend?: TrendPoint[] })?.trend ?? []))
      .catch(() => setTrend([]));
  }, [session.tenantId, session.projectId]);

  if (trend.length < 2) return null;

  const W = 240, H = 60, P = 8;
  const points = trend.map((p, i) => ({
    x: P + (i / (trend.length - 1)) * (W - P * 2),
    y: P + ((100 - p.score) / 100) * (H - P * 2),
  }));
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="px-4 pb-3">
      <h4 className="text-[10px] text-gray-500 mb-1">Score Trend</h4>
      <svg width={W} height={H} className="w-full" viewBox={`0 0 ${W} ${H}`}>
        <line x1={P} y1={H / 2} x2={W - P} y2={H / 2} stroke="#374151" strokeDasharray="4" />
        <path d={d} fill="none" stroke="#4c6ef5" strokeWidth="2" />
        {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#4c6ef5" />)}
      </svg>
    </div>
  );
}
