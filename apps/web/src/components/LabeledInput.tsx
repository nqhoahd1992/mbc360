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
  labelWidth = 110,
  password,
  style,
  ...inputProps
}: LabeledInputProps) {
  const Field = password ? Input.Password : Input;
  return (
    <Space.Compact style={style} block>
      <Input disabled value={label} style={{ width: labelWidth, flexShrink: 0 }} />
      <Field {...inputProps} />
    </Space.Compact>
  );
}
