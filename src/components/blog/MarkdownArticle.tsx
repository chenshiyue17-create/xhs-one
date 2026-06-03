import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownArticleProps {
  content: string;
}

export function MarkdownArticle({ content }: MarkdownArticleProps) {
  return (
    <div className="markdown-article">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
