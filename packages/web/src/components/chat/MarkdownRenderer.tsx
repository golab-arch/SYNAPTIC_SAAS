/**
 * MarkdownRenderer — GFM + syntax highlighting + auto-fence + overflow fixes (DG-126 Phase 3A).
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

/** F2: Auto-detect unfenced JSON/code blocks and wrap them in fences. */
function autoFenceContent(text: string): string {
  if (text.includes('```')) return text;
  const trimmed = text.trim();

  // Whole-content JSON object or array
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try { JSON.parse(trimmed); return '```json\n' + trimmed + '\n```'; }
    catch { /* not valid JSON */ }
  }

  // Embedded JSON blocks
  return text.replace(
    /^(\{[\s\S]{20,}?\n\}|\[[\s\S]{20,}?\n\])/gm,
    (match) => {
      try { JSON.parse(match); return '```json\n' + match + '\n```'; }
      catch { return match; }
    },
  );
}

export function MarkdownRenderer({ content }: { content: string }) {
  const processed = autoFenceContent(content);

  return (
    <div className="prose prose-invert prose-sm max-w-none"
      style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            const { className, children, ...rest } = props;
            const match = /language-(\w+)/.exec(className ?? '');
            if (!match) {
              return <code className="bg-gray-700 px-1 py-0.5 rounded text-sm" {...rest}>{children}</code>;
            }
            return (
              <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div"
                customStyle={{ overflowX: 'auto', maxWidth: '100%' }}>
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            );
          },
          table({ children }) {
            return <div className="overflow-x-auto"><table className="border-collapse border border-gray-600">{children}</table></div>;
          },
          th({ children }) {
            return <th className="border border-gray-600 px-3 py-1 bg-gray-800 text-left">{children}</th>;
          },
          td({ children }) {
            return <td className="border border-gray-600 px-3 py-1">{children}</td>;
          },
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}
