import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none">
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
              <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div">
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
      />
    </div>
  );
}
