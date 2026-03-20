import { useState } from 'react';
import { useAuthStore } from '../../store/auth-store';

const FEATURES = [
  { title: '5 Engines', desc: 'Enforcement, SAI audit, Intelligence, Guidance, Protocol — working together.', icon: 'E' },
  { title: 'BYOK', desc: 'Bring your own API key. Anthropic, OpenAI, Gemini, OpenRouter.', icon: 'K' },
  { title: 'Multi-Provider', desc: '4 providers, 200+ models. Switch freely, no vendor lock-in.', icon: 'M' },
  { title: 'Decision Gates', desc: 'Every decision documented. Options A/B/C before implementation.', icon: 'D' },
  { title: 'SAI Audit', desc: '8 automated code quality checks. Security, dead code, patterns.', icon: 'S' },
  { title: 'Protocol', desc: 'SYNAPTIC v3.0 governance. Cycle-aware, adaptive enforcement.', icon: 'P' },
];

export function LandingPage() {
  const auth = useAuthStore();
  const [devName, setDevName] = useState('');

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <h1 className="text-5xl font-bold mb-4">
          <span className="text-synaptic-500">SYNAPTIC</span> SaaS
        </h1>
        <p className="text-xl text-gray-300 mb-2">AI-Powered Development with Protocol Governance</p>
        <p className="text-gray-500 mb-10">Bring your own LLM key. 5 intelligent engines. Zero vendor lock-in.</p>

        {/* Auth buttons */}
        <div className="flex flex-col items-center gap-3 max-w-sm mx-auto">
          {auth.firebaseAvailable && (
            <>
              <button onClick={() => auth.loginWithGoogle()} disabled={auth.isLoading}
                className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-white text-gray-800 rounded-lg font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50">
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </button>
              <button onClick={() => auth.loginWithGitHub()} disabled={auth.isLoading}
                className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-gray-800 text-white rounded-lg font-semibold border border-gray-600 hover:bg-gray-700 transition-colors disabled:opacity-50">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                Continue with GitHub
              </button>
              <div className="w-full flex items-center gap-2 my-1">
                <div className="flex-1 h-px bg-gray-800" /><span className="text-xs text-gray-600">or</span><div className="flex-1 h-px bg-gray-800" />
              </div>
            </>
          )}

          {/* Dev mode — always available, prominent when Firebase is not configured */}
          <div className="flex gap-2 w-full">
            <input value={devName} onChange={(e) => setDevName(e.target.value)} placeholder="Your name (optional)"
              className="flex-1 bg-gray-800 text-white rounded-lg p-2.5 text-sm border border-gray-600 placeholder-gray-500" />
            <button onClick={() => auth.loginDev(devName)}
              className="px-4 py-2.5 bg-synaptic-600 hover:bg-synaptic-700 text-white rounded-lg text-sm font-semibold whitespace-nowrap">
              {auth.firebaseAvailable ? 'Dev Mode' : 'Get Started'}
            </button>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-synaptic-600/20 text-synaptic-400 flex items-center justify-center font-bold text-sm mb-3">
                {f.icon}
              </div>
              <h3 className="text-white font-semibold mb-1">{f.title}</h3>
              <p className="text-gray-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-6 text-center text-xs text-gray-600">
        SYNAPTIC SaaS by GoLab — BYOK: Your API keys stay in your browser
      </footer>
    </div>
  );
}
