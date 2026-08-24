import { Input, Space } from 'antd';
import type { InputProps } from 'antd';

interface LabeledInputProps extends Omit<InputProps, 'prefix'> {
  label: string;
  labelWidth?: number;
  password?: boolean;
}

// antd deprecated Input's `addonBefore` in favor of Space.Compact — this
// reproduces the same "labeled field" look (a disabled input as the label box)
// without repeating the Space.Compact wrapper at every call site.
export default function LabeledInput({
  label,
  // 110 clipped "Refresh token" to "Refresh toker" — a disabled Input spends
  // ~22px of its width on padding, so the usable text box was ~88px.
  labelWidth = 132,
  password,
  style,
  ...inputProps
}: LabeledInputProps) {
  const Field = password ? Input.Password : Input;
  return (
    <Space.Compact style={style} block>
      {/* The label box is a disabled Input purely for the look, so it is
          hidden from assistive tech and skipped by Tab; the real field carries
          the name instead. Before this, a screen reader announced "disabled
          textbox, Refresh token" and then an unnamed textbox. */}
      <Input
        disabled
        value={label}
        aria-hidden
        tabIndex={-1}
        style={{ width: labelWidth, flexShrink: 0 }}
      />
      <Field aria-label={label} {...inputProps} />
    </Space.Compact>
  );
}
