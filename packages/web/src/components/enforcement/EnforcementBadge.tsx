const GRADE_COLORS: Record<string, string> = {
  A: 'bg-green-600', B: 'bg-blue-600', C: 'bg-yellow-600', D: 'bg-orange-600', F: 'bg-red-600',
};

export function EnforcementBadge({ score, grade }: { score: number; grade: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 mt-1 ml-2">
      <span className={`text-xs font-bold px-1.5 py-0.5 rounded text-white ${GRADE_COLORS[grade] ?? 'bg-gray-600'}`}>
        {grade}
      </span>
      <span className="text-xs text-gray-400">{score}/100</span>
    </div>
  );
}
