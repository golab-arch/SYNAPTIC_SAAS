export function StreamingIndicator() {
  return (
    <div className="flex items-center gap-1 mt-2">
      <span className="text-xs text-gray-400">Generating</span>
      <span className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 bg-synaptic-500 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </span>
    </div>
  );
}
