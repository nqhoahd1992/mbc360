import { Link } from 'react-router-dom';
import { BookOutlined } from '@ant-design/icons';

// The corporate evidence-grading / transferability / literature-search rulebook ("6. Evidence & Search Rules") applies to Sheets 1-5.
// It is a reference page, hidden from the sidebar menu (NavItem.hidden), so each of those five pages links to it from here.
export default function EvidenceRulesLink({ projectId }: { projectId: string }) {
  return (
    <Link to={`/projects/${projectId}/evidence-search-rules`}>
      <BookOutlined /> Evidence grading &amp; search rules
    </Link>
  );
}
