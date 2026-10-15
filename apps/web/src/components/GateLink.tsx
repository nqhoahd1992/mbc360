import { Link, useParams } from 'react-router-dom';
import { GATES } from '@mbc360/shared/config/gates';

// A workbook "Linked gate" cell ("04_Ingredient_Screening") shown as the gate it names — "Gate 04 · <name>" — and linking to that
// gate's tab on its phase page. A value that names no gate is shown as it is.
export default function GateLink({ value }: { value?: string }) {
  const { projectId } = useParams();
  const text = (value ?? '').trim();
  const number = /^(\d{1,2})/.exec(text)?.[1]?.padStart(2, '0');
  const gate = number ? GATES.find((g) => g.number === number) : undefined;
  if (!text) return <span>—</span>;
  if (!gate) return <span>{text}</span>;
  const label = `Gate ${gate.number} · ${gate.name}`;
  return projectId ? <Link to={`/projects/${projectId}/phase/${gate.phase}?gate=${gate.id}`}>{label}</Link> : <span>{label}</span>;
}
