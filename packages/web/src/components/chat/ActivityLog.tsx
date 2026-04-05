/**
 * ActivityLog — Accumulative tool execution feed during agent loops (DG-126 Phase 3A).
 */

import { useState, useEffect } from 'react';

export interface ToolEntry {
  id: string;
  toolName: string;
  inputPreview: string;
  status: 'executing' | 'completed' | 'failed';
  output?: string;
  error?: string;
  duration?: number;
  iteration: number;
}

interface ActivityLogProps {
  entries: ToolEntry[];
  isRunning: boolean;
  startedAt: number | null;
}

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export function ActivityLog({ entries, isRunning, startedAt }: ActivityLogProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isRunning || !startedAt) return;
    const interval = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(interval);
  }, [isRunning, startedAt]);

  if (entries.length === 0) return null;

  const completed = entries.filter((e) => e.status === 'completed').length;
  const failed = entries.filter((e) => e.status === 'failed').length;
  const running = entries.filter((e) => e.status === 'executing').length;
  const visibleEntries = isExpanded ? entries : entries.slice(-3);
  const hiddenCount = entries.length - visibleEntries.length;

  const toolCounts: Record<string, number> = {};
  for (const e of entries) {
    toolCounts[e.toolName] = (toolCounts[e.toolName] ?? 0) + 1;
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg mx-4 mb-2 text-sm">
      {/* Header */}
      <button onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-800 transition rounded-t-lg">
        <svg className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          fill="currentColor" viewBox="0 0 20 20"><path d="M6 4l8 6-8 6V4z" /></svg>
        <span className="text-yellow-400 text-xs">*</span>
        <span className="text-gray-300 font-medium text-xs">Agent Activity</span>
        <span className="text-gray-500 text-xs">
          ({completed} done{failed > 0 ? `, ${failed} failed` : ''}{running > 0 ? `, ${running} running` : ''})
        </span>
        {isRunning && startedAt && (
          <span className="text-gray-500 text-xs ml-auto">{formatElapsed(elapsed)}</span>
        )}
        {isRunning && <span className="w-3 h-3 border-2 border-synaptic-400 border-t-transparent rounded-full animate-spin" />}
      </button>

      {/* Tool type badges */}
      {isExpanded && (
        <div className="flex gap-1 px-3 pb-1 flex-wrap">
          {Object.entries(toolCounts).map(([tool, count]) => (
            <span key={tool} className="text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">
              {tool} {count}
            </span>
          ))}
        </div>
      )}

      {/* Entries */}
      <div className="px-3 pb-2 space-y-1">
        {hiddenCount > 0 && !isExpanded && (
          <button onClick={() => setIsExpanded(true)} className="text-xs text-gray-500 hover:text-gray-300">
            +{hiddenCount} more
          </button>
        )}
        {visibleEntries.map((entry) => (
          <div key={entry.id}>
            <button onClick={() => setExpandedEntryId(expandedEntryId === entry.id ? null : entry.id)}
              className="w-full flex items-center gap-2 py-0.5 text-left hover:bg-gray-700/50 rounded px-1">
              {entry.status === 'executing' && <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />}
              {entry.status === 'completed' && <span className="text-green-400 text-xs">ok</span>}
              {entry.status === 'failed' && <span className="text-red-400 text-xs">err</span>}
              <span className="text-gray-500 text-xs">#{entry.iteration}</span>
              <span className="text-gray-300 text-xs font-medium">{entry.toolName}</span>
              <span className="text-gray-500 text-xs truncate flex-1">{entry.inputPreview}</span>
              {entry.duration != null && <span className="text-gray-600 text-xs">{entry.duration}ms</span>}
            </button>
            {entry.status === 'failed' && entry.error && (
              <p className="text-red-400 text-xs ml-6 mt-0.5">{entry.error.substring(0, 120)}</p>
            )}
            {expandedEntryId === entry.id && entry.output && (
              <div className="ml-6 mt-1 mb-1 bg-gray-900 rounded p-2 max-h-40 overflow-auto">
                <pre className="text-xs text-gray-400 whitespace-pre-wrap">{entry.output.substring(0, 2000)}</pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
