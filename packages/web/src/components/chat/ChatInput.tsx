import { useState, useCallback, useRef } from 'react';
import { ModeSelector } from './ModeSelector';

interface Props {
  onSend: (message: string) => void;
  onCancel: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, onCancel, isStreaming, disabled }: Props) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    if (!input.trim() || isStreaming || disabled) return;
    onSend(input.trim());
    setInput('');
    textareaRef.current?.focus();
  }, [input, isStreaming, disabled, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className="border-t border-gray-700 bg-gray-900">
      <div className="px-4 pt-3">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe your task..."
          disabled={isStreaming || disabled}
          rows={3}
          className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-600
                     focus:border-synaptic-500 focus:ring-1 focus:ring-synaptic-500
                     resize-none disabled:opacity-50 placeholder-gray-500 text-sm"
        />
      </div>
      <div className="px-4 pb-3 pt-2 flex items-center justify-between">
        <ModeSelector />
        <div className="flex items-center gap-2">
          {disabled && <span className="text-xs text-yellow-500 hidden sm:inline">Set API key first</span>}
          {isStreaming ? (
            <button onClick={onCancel} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold">
              Stop
            </button>
          ) : (
            <button onClick={handleSend} disabled={!input.trim() || disabled}
              className="px-5 py-2 bg-synaptic-600 hover:bg-synaptic-700 text-white rounded-lg text-sm font-semibold disabled:opacity-40">
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
