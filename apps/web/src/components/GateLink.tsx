import { Fragment } from 'react';
import { Link, useParams } from 'react-router-dom';
import { GATES } from '@mbc360/shared/config/gates';

// A workbook "Linked gate" cell ("04_Ingredient_Screening", or several such as "10/11") shown as the gates it names — "Gate 04 · <name>" —
// each linking to that gate's tab on its phase page. "ALL" reads "All gates"; a value that names no gate is shown as it is.
export default function GateLink({ value }: { value?: string }) {
  const { projectId } = useParams();
  const text = (value ?? '').trim();
  if (!text) return <span>—</span>;
  if (text.toUpperCase() === 'ALL') return <span>All gates</span>;
  const numbers = /^\d{1,2}([/-]\d{1,2})*(?![\d])/.exec(text)?.[0].split(/[/-]/) ?? [];
  const gates = numbers.map((n) => GATES.find((g) => g.number === n.padStart(2, '0'))).filter((g) => g !== undefined);
  if (gates.length === 0) return <span>{text}</span>;
  return (
    <>
      {gates.map((gate, i) => {
        const label = `Gate ${gate.number} · ${gate.name}`;
        return (
          <Fragment key={gate.id}>
            {i > 0 && <span>, </span>}
            {projectId ? <Link to={`/projects/${projectId}/phase/${gate.phase}?gate=${gate.id}`}>{label}</Link> : <span>{label}</span>}
          </Fragment>
        );
      })}
    </>
  );
}
