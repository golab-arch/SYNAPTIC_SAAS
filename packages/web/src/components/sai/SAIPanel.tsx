import { useSessionStore } from '../../store/session-store';

export function SAIPanel() {
  const { saiScore, saiGrade, saiFindings } = useSessionStore();

  return (
    <div className="p-4 space-y-3">
      <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">SAI Audit</h3>
      <div className="flex items-center gap-3">
        <div className={`text-3xl font-bold ${
          saiScore >= 90 ? 'text-green-400' : saiScore >= 70 ? 'text-yellow-400' : 'text-red-400'
        }`}>
          {saiGrade}
        </div>
        <div>
          <div className="text-lg font-semibold text-white">{saiScore}/100</div>
          <div className="text-xs text-gray-400">{saiFindings} finding(s)</div>
        </div>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all ${
            saiScore >= 90 ? 'bg-green-500' : saiScore >= 70 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${saiScore}%` }}
        />
      </div>
    </div>
  );
}
