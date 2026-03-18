import { useState } from 'react';
import { ProviderSelector } from '../settings/ProviderSelector';
import { SAIPanel } from '../sai/SAIPanel';
import { GuidancePanel } from '../guidance/GuidancePanel';
import { DecisionHistory } from '../intelligence/DecisionHistory';
import { LearningsViewer } from '../intelligence/LearningsViewer';
import { BitacoraViewer } from '../intelligence/BitacoraViewer';
import { SAITrendChart } from '../sai/SAITrendChart';

type Tab = 'settings' | 'quality' | 'intelligence' | 'bitacora';

const TABS: { id: Tab; label: string }[] = [
  { id: 'settings', label: 'Setup' },
  { id: 'quality', label: 'Quality' },
  { id: 'intelligence', label: 'Memory' },
  { id: 'bitacora', label: 'Log' },
];

export function Sidebar() {
  const [activeTab, setActiveTab] = useState<Tab>('settings');

  return (
    <aside className="w-72 bg-gray-900 border-r border-gray-700 flex flex-col h-full">
      <div className="flex border-b border-gray-700">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-xs text-center transition-colors ${
              activeTab === tab.id ? 'text-synaptic-400 border-b-2 border-synaptic-500 bg-gray-800' : 'text-gray-500 hover:text-gray-300'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'settings' && <div className="p-3"><ProviderSelector /></div>}
        {activeTab === 'quality' && (<><SAIPanel /><SAITrendChart /><div className="border-t border-gray-700" /><GuidancePanel /></>)}
        {activeTab === 'intelligence' && (<><LearningsViewer /><div className="border-t border-gray-700" /><DecisionHistory /></>)}
        {activeTab === 'bitacora' && <BitacoraViewer />}
      </div>
    </aside>
  );
}
