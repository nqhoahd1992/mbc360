import type { RegisterSummary } from '@mbc360/shared/utils/registerDerived';
import './RegisterSummaryCard.css';

// A block the workbook computes under a register ("Closure control summary", "Family roll-up"): read-only, counted live from the
// rows above it.
export default function RegisterSummaryCard({ summary }: { summary: RegisterSummary }) {
  return (
    <section className="c-card rsc">
      <header className="rsc-head">
        <h3 className="rsc-title">{summary.title}</h3>
        {summary.note && <span className="rsc-note">{summary.note}</span>}
      </header>
      {summary.rows.length === 0 ? (
        <p className="rsc-empty">Nothing to count yet.</p>
      ) : (
        <div className="rsc-scroll">
          <table className="rsc-table">
            <thead>
              <tr>
                {summary.head.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} className={j === 0 ? 'rsc-first' : undefined}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
