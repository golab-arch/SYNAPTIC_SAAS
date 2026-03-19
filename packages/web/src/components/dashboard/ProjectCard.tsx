interface Project {
  id: string;
  name: string;
  description: string;
  framework: string;
  lastActivityAt: string;
  cycleCount: number;
  synapticStrength: number;
}

const FW_COLORS: Record<string, string> = {
  react: 'bg-blue-800 text-blue-300',
  next: 'bg-gray-700 text-white',
  express: 'bg-green-800 text-green-300',
  vanilla: 'bg-yellow-800 text-yellow-300',
  custom: 'bg-purple-800 text-purple-300',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function ProjectCard({ project, onClick, onDelete }: { project: Project; onClick: () => void; onDelete: () => void }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition-colors cursor-pointer group"
      onClick={onClick}>
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-white">{project.name}</h3>
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${FW_COLORS[project.framework] ?? FW_COLORS.custom}`}>
          {project.framework}
        </span>
      </div>
      {project.description && <p className="text-xs text-gray-400 mb-3 line-clamp-2">{project.description}</p>}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{project.cycleCount} cycles</span>
        <span>{timeAgo(project.lastActivityAt)}</span>
      </div>
      {/* Strength bar */}
      <div className="mt-2 w-full bg-gray-800 rounded-full h-1">
        <div className="h-1 rounded-full bg-synaptic-500 transition-all" style={{ width: `${project.synapticStrength}%` }} />
      </div>
      {/* Delete */}
      <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${project.name}"?`)) onDelete(); }}
        className="mt-2 text-[10px] text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
        Delete project
      </button>
    </div>
  );
}
