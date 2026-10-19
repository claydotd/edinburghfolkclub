import MarkdownContent from './MarkdownContent';

type MarkdownPageProps = {
  title?: string;
  markdown: string | null;
  className?: string;
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
          <MarkdownContent>{markdown}</MarkdownContent>
        ) : (
          <p>Content coming soon.</p>
        )}
      </div>
    </main>
  );
}
