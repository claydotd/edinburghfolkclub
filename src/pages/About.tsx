import MarkdownPage from '../components/MarkdownPage';
import { getContentMarkdown } from '../utils/contentMarkdown';

export default function About() {
  return (
    <MarkdownPage
      title="About"
      markdown={getContentMarkdown('about.md')}
    />
  );
}
