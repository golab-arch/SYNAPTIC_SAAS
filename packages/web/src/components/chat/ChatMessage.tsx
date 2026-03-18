import { MarkdownRenderer } from './MarkdownRenderer';
import type { ChatMessage as ChatMessageType } from '../../store/chat-store';

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-lg p-4 ${
        isUser ? 'bg-synaptic-600 text-white' : 'bg-gray-800 text-gray-100 border border-gray-700'
      }`}>
        <div className="text-xs text-gray-400 mb-1 flex items-center gap-2">
          <span className="font-semibold">{isUser ? 'You' : 'SYNAPTIC'}</span>
          {message.metadata?.cycle != null && (
            <span className="bg-gray-700 px-1.5 py-0.5 rounded text-xs">Cycle {message.metadata.cycle}</span>
          )}
          {message.metadata?.compliance && (
            <span className={`px-1.5 py-0.5 rounded text-xs font-bold text-white ${
              message.metadata.compliance.score >= 90 ? 'bg-green-600' :
              message.metadata.compliance.score >= 70 ? 'bg-yellow-600' : 'bg-red-600'
            }`}>
              {message.metadata.compliance.grade} {message.metadata.compliance.score}
            </span>
          )}
        </div>
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <MarkdownRenderer content={message.content} />
        )}
        {message.metadata?.toolCalls && message.metadata.toolCalls.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-600 text-xs text-gray-400">
            {message.metadata.toolCalls.length} tool(s) used
          </div>
        )}
      </div>
    </div>
  );
}
