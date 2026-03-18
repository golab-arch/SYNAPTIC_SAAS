export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="p-4 space-y-2 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 bg-gray-700 rounded" style={{ width: `${70 + Math.random() * 30}%` }} />
      ))}
    </div>
  );
}
