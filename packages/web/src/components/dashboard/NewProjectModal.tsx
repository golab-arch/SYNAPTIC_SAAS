import { useState } from 'react';

const FRAMEWORKS = [
  { id: 'react', label: 'React' },
  { id: 'next', label: 'Next.js' },
  { id: 'express', label: 'Express' },
  { id: 'vanilla', label: 'Vanilla JS' },
  { id: 'custom', label: 'Custom' },
];

interface Props {
  onClose: () => void;
  onCreate: (data: { name: string; description: string; framework: string }) => void;
}

export function NewProjectModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [framework, setFramework] = useState('react');

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-white mb-4">New Project</h2>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-300 block mb-1">Project Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="my-app"
              className="w-full bg-gray-800 text-white rounded-lg p-2.5 border border-gray-600 focus:border-synaptic-500 placeholder-gray-500" />
          </div>
          <div>
            <label className="text-sm text-gray-300 block mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What are you building?"
              rows={2} className="w-full bg-gray-800 text-white rounded-lg p-2.5 border border-gray-600 resize-none placeholder-gray-500" />
          </div>
          <div>
            <label className="text-sm text-gray-300 block mb-1">Framework</label>
            <div className="flex gap-2 flex-wrap">
              {FRAMEWORKS.map((fw) => (
                <button key={fw.id} onClick={() => setFramework(fw.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    framework === fw.id ? 'bg-synaptic-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}>
                  {fw.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white text-sm">Cancel</button>
          <button onClick={() => name.trim() && onCreate({ name: name.trim(), description, framework })}
            disabled={!name.trim()}
            className="px-4 py-2 bg-synaptic-600 hover:bg-synaptic-700 text-white rounded-lg text-sm font-semibold disabled:opacity-40">
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
