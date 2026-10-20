import { Link } from 'react-router-dom';
import { needsTechnologyTraceability } from '@mbc360/shared/config/registers';
import type { RegisterRow } from '@mbc360/shared/types';
import '../styles/concept.css';
import './NeedsTraceabilityReference.css';

// The "Needs -> Technology Traceability Matrix" of Step 1, shown read-only on Step 3 (Target Product & Tech Platform). The
// workbook says it "carries into" Sheet 3: the technology direction and critical attributes chosen there are the input to the
// platform defined here, so the person filling this page sees them beside it instead of copying them across by hand.
// Nothing here is editable and nothing reads it as a rule — it is for checking the two against each other.

const COLUMNS = ['needId', 'need', 'designImplication', 'technologyDirection', 'criticalAttribute', 'evidenceStatus', 'reference'] as const;

const text = (v: unknown) => String(v ?? '').trim();
const STATUS_TAG: Record<string, string> = { Demonstrated: 'c-tag-ok', 'Ingredient-only': 'c-tag-warn', Gap: 'c-tag-bad' };

export default function NeedsTraceabilityReference({ projectId, rows }: { projectId: string; rows: RegisterRow[] }) {
  const columns = COLUMNS.map((key) => needsTechnologyTraceability.columns.find((c) => c.key === key)!);
  const shown = rows.filter((row) => COLUMNS.some((key) => text(row[key]) !== ''));
  return (
    <section className="c-card ntr">
      <header className="ntr-head">
        <div>
          <h3 className="ntr-title">Needs → Technology Traceability (from Step 1)</h3>
          <p className="ntr-desc">
            Read-only, for checking. The technology direction and critical attributes below carry into the platform defined on
            this page.
          </p>
        </div>
        <Link to={`/projects/${projectId}/needs-scientific-basis`}>Edit in Needs &amp; Scientific Basis</Link>
      </header>
      {shown.length === 0 ? (
        <p className="ntr-empty">
          No rows in the Needs → Technology Traceability Matrix yet. It is the last table on Needs &amp; Scientific Basis, separate
          from the Executive Brief.
        </p>
      ) : (
        <div className="ntr-scroll">
          <table className="ntr-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((row, i) => (
                <tr key={i}>
                  {columns.map((col) => {
                    const value = text(row[col.key]);
                    return (
                      <td key={col.key}>
                        {!value ? (
                          <span className="ntr-muted">—</span>
                        ) : col.key === 'evidenceStatus' ? (
                          <span className={`c-tag ${STATUS_TAG[value] ?? ''}`}>{value}</span>
                        ) : (
                          value
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
