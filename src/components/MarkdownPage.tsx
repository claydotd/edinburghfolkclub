import type { ComponentPropsWithoutRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { publicUrl } from '../utils/publicUrl';

type MarkdownPageProps = {
  title?: string;
  markdown: string | null;
  className?: string;
};

const markdownComponents = {
  img: ({ src, alt, ...props }: ComponentPropsWithoutRef<'img'>) => (
    <img src={src ? publicUrl(src) : src} alt={alt ?? ''} {...props} />
  ),
};

export default function MarkdownPage({
  title,
  markdown,
  className = '',
}: MarkdownPageProps) {
  return (
    <main className={`page prose-page ${className}`.trim()}>
      {title ? (
        <header className="page-masthead">
          <h1 className="page-title">{title}</h1>
        </header>
      ) : null}
      <div className="prose">
        {markdown ? (
          <ReactMarkdown components={markdownComponents}>{markdown}</ReactMarkdown>
        ) : (
          <p>Content coming soon.</p>
        )}
      </div>
    </main>
  );
}
