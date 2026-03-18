import { useSessionStore } from '../../store/session-store';
import { SuggestionCard } from './SuggestionCard';

export function GuidancePanel() {
  const { nextSteps, orientation, phaseProgress } = useSessionStore();

  return (
    <div className="p-4 space-y-3">
      <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Guidance</h3>
      {orientation && <p className="text-xs text-gray-400 bg-gray-800 rounded p-2">{orientation}</p>}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Phase Progress</span>
          <span>{phaseProgress}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-1.5">
          <div className="h-1.5 rounded-full bg-synaptic-500 transition-all" style={{ width: `${phaseProgress}%` }} />
        </div>
      </div>
      <div className="space-y-1.5">
        <h4 className="text-xs font-semibold text-gray-400">Next Steps</h4>
        {nextSteps.length === 0 && <p className="text-xs text-gray-600">No suggestions yet</p>}
        {nextSteps.map((step, i) => (
          <SuggestionCard key={i} title={step.title} priority={step.priority} category={step.category} />
        ))}
      </div>
    </div>
  );
}
