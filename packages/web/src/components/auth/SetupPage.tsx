import { useState } from 'react';
import { useAuthStore } from '../../store/auth-store';

export function SetupPage() {
  const { login } = useAuthStore();
  const [tenantId, setTenantId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId.trim() || !projectId.trim()) {
      setError('Tenant ID and Project ID are required');
      return;
    }

    try {
      const apiBase = import.meta.env.VITE_API_URL ?? '';
      const res = await fetch(`${apiBase}/health`);
      if (!res.ok) throw new Error('Backend unreachable');

      login({
        tenantId: tenantId.trim(),
        projectId: projectId.trim(),
        authToken: authToken.trim() || 'dev-token',
        displayName: displayName.trim() || undefined,
      });
    } catch {
      setError('Cannot connect to backend. Is it running on localhost:3000?');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-synaptic-500">SYNAPTIC</h1>
          <p className="text-gray-400 mt-1">SaaS Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-xl p-6 border border-gray-700 space-y-4">
          <div>
            <label className="text-sm text-gray-300 block mb-1">Your Name (optional)</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Developer name"
              className="w-full bg-gray-800 text-white rounded-lg p-2.5 border border-gray-600 focus:border-synaptic-500 placeholder-gray-500" />
          </div>
          <div>
            <label className="text-sm text-gray-300 block mb-1">Tenant ID *</label>
            <input value={tenantId} onChange={(e) => setTenantId(e.target.value)} placeholder="my-company" required
              className="w-full bg-gray-800 text-white rounded-lg p-2.5 border border-gray-600 focus:border-synaptic-500 placeholder-gray-500" />
            <p className="text-xs text-gray-500 mt-0.5">Your organization identifier</p>
          </div>
          <div>
            <label className="text-sm text-gray-300 block mb-1">Project ID *</label>
            <input value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="my-project" required
              className="w-full bg-gray-800 text-white rounded-lg p-2.5 border border-gray-600 focus:border-synaptic-500 placeholder-gray-500" />
          </div>
          <div>
            <label className="text-sm text-gray-300 block mb-1">Auth Token (optional for dev)</label>
            <input type="password" value={authToken} onChange={(e) => setAuthToken(e.target.value)} placeholder="Bearer token..."
              className="w-full bg-gray-800 text-white rounded-lg p-2.5 border border-gray-600 focus:border-synaptic-500 placeholder-gray-500" />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" className="w-full py-3 bg-synaptic-600 hover:bg-synaptic-700 text-white rounded-lg font-semibold">
            Enter SYNAPTIC
          </button>
        </form>
        <p className="text-center text-xs text-gray-600 mt-4">BYOK — Your API keys stay in your browser</p>
      </div>
    </div>
  );
}
