import { Button, Select } from 'antd';
import './SafetyDecisionCell.css';

// The Safety decision of the Ingredient-Level Safety Matrix. The app writes "Needs Review" / "No listed match" itself while nobody has
// concluded, so "Needs Review" is not offered to pick; a conclusion a person recorded is cleared with the button, which hands the cell
// back to the app's own value.
const MACHINE_VALUES = ['', 'Not Started', 'No listed match', 'Needs Review'];

export default function SafetyDecisionCell({
  options,
  value,
  readOnly,
  onChange,
}: {
  options: readonly string[];
  value: string;
  readOnly: boolean;
  onChange: (value: string) => void;
}) {
  const concluded = !MACHINE_VALUES.includes(value);
  return (
    <div className="sdc">
      <Select
        style={{ width: '100%', minWidth: 0 }}
        popupMatchSelectWidth={false}
        placeholder="Select…"
        disabled={readOnly}
        value={value || undefined}
        options={options.map((o) => ({ value: o, label: o }))}
        onChange={(v: string) => onChange(v)}
      />
      <Button
        className="sdc-clear"
        disabled={readOnly || !concluded}
        onClick={() => onChange('')}
        title="Remove the conclusion and go back to what the watch-lists say"
      >
        Clear decision
      </Button>
    </div>
  );
}
