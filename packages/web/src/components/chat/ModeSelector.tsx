import { useSettingsStore } from '../../store/settings-store';

type ModeId = 'SYNAPTIC' | 'ARCHITECT' | 'IMMEDIATE';

const MODES: Array<{ id: ModeId; label: string; short: string; color: string; desc: string }> = [
  { id: 'SYNAPTIC', label: 'SYNAPTIC', short: 'SYN', color: 'bg-synaptic-600 shadow-synaptic-500/30', desc: 'Full protocol: enforcement, SAI, Decision Gates' },
  { id: 'ARCHITECT', label: 'ARCHITECT', short: 'ARC', color: 'bg-blue-600 shadow-blue-500/30', desc: 'Analysis only — no code execution' },
  { id: 'IMMEDIATE', label: 'IMMEDIATE', short: 'IMM', color: 'bg-amber-600 shadow-amber-500/30', desc: 'Direct execution — no protocol overhead' },
];

export function ModeSelector() {
  const { mode, setMode } = useSettingsStore();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const ids: ModeId[] = ['SYNAPTIC', 'ARCHITECT', 'IMMEDIATE'];
    const idx = ids.indexOf(mode);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      setMode(ids[(idx + 1) % ids.length]!);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      setMode(ids[(idx - 1 + ids.length) % ids.length]!);
    }
  };

  return (
    <div className="inline-flex rounded-lg bg-gray-800 p-0.5 gap-0.5" role="radiogroup" aria-label="Execution mode" onKeyDown={handleKeyDown}>
      {MODES.map((m) => {
        const active = mode === m.id;
        return (
          <button key={m.id} role="radio" aria-checked={active} title={m.desc}
            onClick={() => setMode(m.id)}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-synaptic-500/50 ${
              active ? `${m.color} text-white shadow-sm` : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
            }`}>
            <span className="hidden sm:inline">{m.label}</span>
            <span className="sm:hidden">{m.short}</span>
          </button>
        );
      })}
    </div>
  );
}
