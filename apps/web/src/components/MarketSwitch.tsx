import { useEffect, useState, useTransition } from 'react';
import { Segmented, Select } from 'antd';
import SwitchOverlay from './SwitchOverlay';
import './MarketSwitch.css';

// ONE market switch for a whole gate tab on Gates 10-12 (Round 5 question 2(c): "unrelated markets may continue where their own
// requirements are met"). Everything on the tab that belongs to a market follows it — the readiness rail, the sign-off lane, the
// post-market findings — so a person cannot read Singapore's evidence while signing Vietnam's lane. What is about the whole project
// is not hidden by it; the readiness rail tags those items "All markets". Each market shows how many items still hold its lane, so
// what is blocked is visible without switching.
//
// Switching fetches nothing and the rules take a few milliseconds (measured on the largest project: 2-5 ms for all four lanes); what
// takes time is React drawing the whole tab again. So the choice is shown at once, the redraw runs as a TRANSITION (the page stays
// responsive while it works), and a page-wide "Switching…" overlay appears only if the redraw is still going after a moment — a quick
// switch shows no flash. The overlay also stops a second click landing in the middle of a switch.
export default function MarketSwitch({
  lanes,
  value,
  blocking,
  onChange,
}: {
  lanes: string[];
  value: string;
  /** How many items hold each market's lane. */
  blocking: Record<string, number>;
  onChange: (market: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  // What the person has just chosen, until the page has caught up with it.
  const [chosen, setChosen] = useState<string | null>(null);
  useEffect(() => {
    if (!pending) setChosen(null);
  }, [pending, value]);
  const shown = chosen ?? value;
  const choose = (m: string) => {
    if (m === shown) return;
    setChosen(m);
    startTransition(() => onChange(m));
  };

  const label = (m: string) => {
    const n = blocking[m] ?? 0;
    return (
      <span className="ms-opt">
        {m}
        <span className={`ms-n ${n > 0 ? 'ms-bad' : 'ms-ok'}`}>{n > 0 ? `${n} blocking` : 'ready'}</span>
      </span>
    );
  };
  return (
    <div className="concept-tokens c-card ms" role="group" aria-label="Market" aria-busy={pending}>
      <div className="ms-text">
        <div className="ms-kicker">Market</div>
        <p className="ms-hint">The readiness, the sign-off and the findings below are for this market. Items about the whole project apply to every market.</p>
      </div>
      {lanes.length > 4 ? (
        <Select
          className="ms-select"
          value={shown}
          onChange={choose}
          options={lanes.map((m) => ({ value: m, label: label(m) }))}
          popupMatchSelectWidth={false}
        />
      ) : (
        <Segmented value={shown} onChange={(v) => choose(String(v))} options={lanes.map((m) => ({ value: m, label: label(m) }))} />
      )}
      {pending && <SwitchOverlay label={`Switching to ${shown}…`} />}
    </div>
  );
}
