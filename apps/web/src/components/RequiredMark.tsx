import { Tooltip } from 'antd';
import './RequiredMark.css';

// The one "this is mandatory" marker. It never goes away: whether a field is
// required is a property of the field, so it must not depend on its data. The
// unmet/met state is carried by colour only (red until satisfied, then muted),
// which keeps the label's width — and therefore the layout — stable.
export default function RequiredMark({
  met,
  title = 'Required to pass this gate (F1/C7 mandatory evidence)',
}: {
  met: boolean;
  title?: string;
}) {
  return (
    <Tooltip title={title}>
      <span className={`req-mark${met ? ' req-mark-met' : ''}`} role="img" aria-label={met ? 'Required — done' : 'Required — not done yet'}>
        *
      </span>
    </Tooltip>
  );
}
