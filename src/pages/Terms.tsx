import MarkdownPage from '../components/MarkdownPage';
import { getContentMarkdown } from '../utils/contentMarkdown';

export default function Terms() {
  return (
    <MarkdownPage
      title="Terms & Conditions"
      markdown={getContentMarkdown('terms.md')}
    />
  );
}
