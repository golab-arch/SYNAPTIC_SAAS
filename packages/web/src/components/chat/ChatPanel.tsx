import React, { useRef, useEffect } from 'react';
import { ChatMessage } from './ChatMessage';
import { StreamingIndicator } from './StreamingIndicator';
import { MarkdownRenderer } from './MarkdownRenderer';
import type { ChatMessage as ChatMessageType } from '../../store/chat-store';

interface Props {
  messages: ChatMessageType[];
  isStreaming: boolean;
  streamingContent: string;
}

export const ChatPanel = React.memo(function ChatPanel({ messages, isStreaming, streamingContent }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingContent]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 && !isStreaming && (
        <div className="text-center text-gray-500 mt-20">
          <h2 className="text-2xl font-bold text-synaptic-500 mb-2">SYNAPTIC SaaS</h2>
          <p>Configure your API key and start a conversation.</p>
          <p className="text-sm mt-1 text-gray-600">Your key stays in your browser (BYOK).</p>
        </div>
      )}

      {messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)}

      {isStreaming && streamingContent && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <MarkdownRenderer content={streamingContent} />
          <StreamingIndicator />
        </div>
      )}

      {isStreaming && !streamingContent && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <StreamingIndicator />
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
});
