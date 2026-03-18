const PRIORITY_COLORS: Record<string, string> = { high: 'border-red-600', medium: 'border-yellow-600', low: 'border-green-600' };
const CATEGORY_ICONS: Record<string, string> = { feature: 'NEW', fix: 'FIX', refactor: 'REF', test: 'TST', docs: 'DOC', config: 'CFG' };

export function SuggestionCard({ title, priority, category }: { title: string; priority: string; category: string }) {
  return (
    <div className={`p-2 rounded border-l-2 bg-gray-800 ${PRIORITY_COLORS[priority] ?? 'border-gray-600'}`}>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-mono bg-gray-700 px-1 rounded text-gray-400">{CATEGORY_ICONS[category] ?? 'TSK'}</span>
        <span className="text-sm text-gray-200">{title}</span>
      </div>
    </div>
  );
}
