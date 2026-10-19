import { Link, useParams } from 'react-router-dom';
import MarkdownContent from '../../components/MarkdownContent';
import { getContentMarkdown } from '../../utils/contentMarkdown';
import documents from '../../../content/members/documents.json';

export default function MembersDocumentDetail() {
  const { slug = '' } = useParams();
  const meta = documents.documents.find((doc) => doc.slug === slug);
  const markdown = getContentMarkdown(`members/${slug}.md`);

  return (
    <main className="page prose-page members-document">
      <p className="back-link">
        <Link to="/members/documents">← All documents</Link>
      </p>
      <header className="page-masthead">
        <h1 className="page-title">{meta?.title ?? 'Document'}</h1>
      </header>
      <div className="prose">
        {markdown ? (
          <MarkdownContent>{markdown}</MarkdownContent>
        ) : (
          <p>This document could not be found.</p>
        )}
      </div>
    </main>
  );
}
