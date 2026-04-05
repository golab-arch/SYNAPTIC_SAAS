/**
 * ProviderErrorModal — dialog for classified provider errors (DG-126 Phase 3A).
 */

interface ProviderErrorModalProps {
  error: { category: string; message: string; suggestion: string };
  onClose: () => void;
}

const CATEGORY_CONFIG: Record<string, { title: string; iconColor: string }> = {
  MODEL_NOT_FOUND: { title: 'Model Unavailable', iconColor: 'text-yellow-400' },
  MODEL_ACCESS_DENIED: { title: 'Access Denied', iconColor: 'text-red-400' },
  RATE_LIMITED: { title: 'Rate Limit Reached', iconColor: 'text-orange-400' },
  QUOTA_EXHAUSTED: { title: 'Credits Exhausted', iconColor: 'text-red-400' },
  PROVIDER_OVERLOADED: { title: 'Provider Busy', iconColor: 'text-yellow-400' },
  AUTH_FAILED: { title: 'Invalid API Key', iconColor: 'text-red-400' },
  INVALID_REQUEST: { title: 'Request Error', iconColor: 'text-yellow-400' },
  NETWORK_ERROR: { title: 'Connection Error', iconColor: 'text-gray-400' },
  UNKNOWN: { title: 'Error', iconColor: 'text-gray-400' },
};

export function ProviderErrorModal({ error, onClose }: ProviderErrorModalProps) {
  const config = CATEGORY_CONFIG[error.category] ?? CATEGORY_CONFIG.UNKNOWN!;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <svg className={`w-6 h-6 ${config.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-semibold text-white">{config.title}</h3>
        </div>

        <p className="text-gray-300 text-sm mb-2">{error.message}</p>
        {error.suggestion && <p className="text-gray-400 text-xs mb-4">{error.suggestion}</p>}

        <div className="mb-4">
          <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{error.category}</span>
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
