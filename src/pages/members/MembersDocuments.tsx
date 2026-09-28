import { Link } from 'react-router-dom';
import documents from '../../../content/members/documents.json';

export default function MembersDocuments() {
  return (
    <main className="page members-documents">
      <header className="page-masthead">
        <h1 className="page-title">Documents</h1>
        <p className="page-lede">Information for Edinburgh Folk Club members.</p>
      </header>
      <ul className="document-list">
        {documents.documents.map((doc) => (
          <li key={doc.slug}>
            <Link to={`/members/documents/${doc.slug}`}>
              <span className="document-title">{doc.title}</span>
              <span className="document-description">{doc.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
