import { Radio, Select } from 'antd';
import './ChoiceSelect.css';

// A single choice from a short, fixed list. With few options every one is shown as a button (nothing to open,
// nothing hidden); with more it falls back to a Select. Use it for a labelled FORM FIELD; a table cell keeps the
// compact Select, since a row of buttons does not fit a column.
export const CHOICE_BUTTONS_MAX = 5;

export interface ChoiceOption {
  value: string;
  label?: React.ReactNode;
  // This one choice cannot be picked (the others can); a value already chosen stays shown.
  disabled?: boolean;
}

export default function ChoiceSelect({
  value,
  onChange,
  options,
  allowClear,
  placeholder,
  disabled,
  status,
  maxButtons = CHOICE_BUTTONS_MAX,
}: {
  value?: string;
  onChange: (value: string | undefined) => void;
  options: (string | ChoiceOption)[];
  // Clicking the chosen button again clears it, mirroring a Select's clear icon.
  allowClear?: boolean;
  placeholder?: string;
  disabled?: boolean;
  status?: 'warning' | 'error';
  maxButtons?: number;
}) {
  const opts: ChoiceOption[] = options.map((o) => (typeof o === 'string' ? { value: o } : o));

  if (opts.length > maxButtons) {
    return (
      <Select
        style={{ width: '100%' }}
        allowClear={allowClear}
        placeholder={placeholder}
        disabled={disabled}
        status={status}
        value={value || undefined}
        options={opts.map((o) => ({ value: o.value, label: o.label ?? o.value, disabled: o.disabled }))}
        onChange={(v?: string) => onChange(v)}
      />
    );
  }

  return (
    <Radio.Group
      className={`choice-select${status ? ` choice-select-${status}` : ''}`}
      optionType="button"
      value={value || undefined}
      disabled={disabled}
    >
      {opts.map((o) => (
        <Radio.Button
          key={o.value}
          value={o.value}
          disabled={o.disabled && o.value !== value}
          // Radio's own onChange never fires for the value already chosen, so clearing is done on the click.
          onClick={() => {
            if (disabled) return;
            if (o.value === value) {
              if (allowClear) onChange(undefined);
            } else {
              onChange(o.value);
            }
          }}
        >
          {o.label ?? o.value}
        </Radio.Button>
      ))}
    </Radio.Group>
  );
}
