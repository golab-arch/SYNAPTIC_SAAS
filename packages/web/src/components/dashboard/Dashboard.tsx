import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../store/auth-store';
import { NewProjectModal } from './NewProjectModal';
import { ProjectCard } from './ProjectCard';

interface Project {
  id: string;
  name: string;
  description: string;
  framework: string;
  lastActivityAt: string;
  cycleCount: number;
  synapticStrength: number;
}

interface Props {
  onSelectProject: (projectId: string, projectName: string) => void;
}

export function Dashboard({ onSelectProject }: Props) {
  const auth = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [usage, setUsage] = useState({ used: 0, limit: 50 });

  const apiBase = import.meta.env.VITE_API_URL ?? '';
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.idToken}` };

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/projects`, { headers });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects ?? []);
      }
    } catch { /* offline */ }
    finally { setLoading(false); }
  }, [apiBase, auth.idToken]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleCreate = async (data: { name: string; description: string; framework: string }) => {
    const res = await fetch(`${apiBase}/api/projects`, {
      method: 'POST', headers, body: JSON.stringify(data),
    });
    if (res.ok) {
      setShowNewModal(false);
      fetchProjects();
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`${apiBase}/api/projects/${id}`, { method: 'DELETE', headers });
    fetchProjects();
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-synaptic-500">SYNAPTIC</h1>
          <span className="text-xs text-gray-500">Dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400">
            {usage.used}/{usage.limit} cycles this month
          </span>
          <span className="text-xs bg-gray-800 px-2 py-0.5 rounded text-synaptic-400 font-semibold uppercase">
            {auth.tier}
          </span>
          {auth.photoURL && <img src={auth.photoURL} alt="" className="w-6 h-6 rounded-full" />}
          <span className="text-xs text-gray-400">{auth.displayName}</span>
          <button onClick={() => auth.logout()} className="text-xs text-gray-500 hover:text-red-400">Logout</button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Your Projects</h2>
          <button onClick={() => setShowNewModal(true)}
            className="px-4 py-2 bg-synaptic-600 hover:bg-synaptic-700 text-white rounded-lg text-sm font-semibold">
            New Project
          </button>
        </div>

        {loading && <div className="text-gray-500">Loading projects...</div>}

        {!loading && projects.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg mb-2">No projects yet</p>
            <p className="text-sm">Create your first project to get started with SYNAPTIC.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p}
              onClick={() => onSelectProject(p.id, p.name)}
              onDelete={() => handleDelete(p.id)} />
          ))}
        </div>
      </div>

      {showNewModal && <NewProjectModal onClose={() => setShowNewModal(false)} onCreate={handleCreate} />}
    </div>
  );
}
