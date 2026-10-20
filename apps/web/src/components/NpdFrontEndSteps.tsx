import { Link } from 'react-router-dom';
import EvidenceRulesLink from './EvidenceRulesLink';
import './NpdFrontEndSteps.css';

// The six sheets of the NPD Front-End Roadmap (v2 workbook), numbered as the workbook numbers them. Sheets 1-4 are the four
// steps of the roadmap, in order; 5 and 6 are the supporting sheets those steps lean on. Each page's banner reads "Step N of 4",
// so this list is what says what the other numbers are.
const SHEETS: { number: number; title: string; path: (projectId: string) => string }[] = [
  { number: 1, title: 'Needs & Scientific Basis', path: (id) => `/projects/${id}/needs-scientific-basis` },
  { number: 2, title: 'Competitor Landscape', path: (id) => `/projects/${id}/competitor-landscape` },
  { number: 3, title: 'Target Product & Tech Platform', path: (id) => `/projects/${id}/target-product-tech` },
  { number: 4, title: 'Evidence Plan & Claim Support', path: (id) => `/projects/${id}/evidence-claim-support` },
  { number: 5, title: 'Ingredient Monograph', path: (id) => `/projects/${id}/registers/reg/ingredientMonograph` },
  { number: 6, title: 'Evidence Hierarchy & Search Rules', path: () => '' },
];

export default function NpdFrontEndSteps({ projectId, current }: { projectId: string; current: number }) {
  const item = (n: number) => {
    const sheet = SHEETS[n - 1];
    const content = (
      <>
        <span className="nfs-n">{sheet.number}</span>
        {sheet.title}
      </>
    );
    // Sheet 6 is not a page in the menu: it opens as a popup, like every other mention of the rulebook.
    if (sheet.number === 6) {
      return (
        <EvidenceRulesLink key={n} projectId={projectId} className="nfs-item nfs-button">
          {content}
        </EvidenceRulesLink>
      );
    }
    return sheet.number === current ? (
      <span key={n} className="nfs-item nfs-current" aria-current="step">{content}</span>
    ) : (
      <Link key={n} to={sheet.path(projectId)} className="nfs-item">{content}</Link>
    );
  };
  return (
    <span className="nfs">
      <span className="nfs-row">
        <span className="nfs-label">Steps 1–4, in order</span>
        <span className="nfs-list">{[1, 2, 3, 4].map(item)}</span>
      </span>
      <span className="nfs-row">
        <span className="nfs-label">Supporting sheets</span>
        <span className="nfs-list">{[5, 6].map(item)}</span>
      </span>
    </span>
  );
}
