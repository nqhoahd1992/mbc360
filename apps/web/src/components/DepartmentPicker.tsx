import { useState } from 'react';
import { Input, Popover } from 'antd';
import { CheckOutlined, DownOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { DEPARTMENT_PATH_SEPARATOR, DEPARTMENT_TREE, type DepartmentNode } from '../config/departments';
import './DepartmentPicker.css';

// One field that opens a drill-down panel: one level of the org tree at a time, a back arrow to go up.
// Clicking a row COMMITS it whether or not it has children, so stopping at an outer level is a real answer;
// a row with children then drills into them, a leaf closes the panel. The value is the path joined by
// DEPARTMENT_PATH_SEPARATOR — the same plain string the field stored when it was free text.
function childrenAt(viewPath: string[]): DepartmentNode[] {
  let level = DEPARTMENT_TREE.children ?? [];
  for (const name of viewPath) {
    const node = level.find((n) => n.name === name);
    if (!node) return [];
    level = node.children ?? [];
  }
  return level;
}

export default function DepartmentPicker({
  value,
  onChange,
  placeholder = 'Choose a department…',
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  invalid?: boolean;
}) {
  const path = value ? value.split(DEPARTMENT_PATH_SEPARATOR) : [];
  const [open, setOpen] = useState(false);
  const [viewPath, setViewPath] = useState<string[]>([]);

  // Opens one level above the last choice, so reopening shows that choice's siblings with it ticked.
  const openPanel = () => {
    setViewPath(path.slice(0, -1));
    setOpen(true);
  };

  const pick = (node: DepartmentNode) => {
    const next = [...viewPath, node.name];
    onChange(next.join(DEPARTMENT_PATH_SEPARATOR));
    if (node.children?.length) setViewPath(next);
    else setOpen(false);
  };

  const options = childrenAt(viewPath);
  const panel = (
    <div className="dp-panel">
      <div className="dp-head">
        <button
          type="button"
          className="dp-back"
          disabled={viewPath.length === 0}
          aria-label="Back up one level"
          onClick={() => setViewPath((p) => p.slice(0, -1))}
        >
          <LeftOutlined />
        </button>
        <span className="dp-head-title">{viewPath.length === 0 ? DEPARTMENT_TREE.name : viewPath[viewPath.length - 1]}</span>
      </div>
      <div className="dp-list" role="listbox">
        {options.length === 0 ? (
          <p className="dp-empty">Nothing under this level.</p>
        ) : (
          options.map((o) => {
            const selected = path[viewPath.length] === o.name;
            return (
              <button
                key={o.name}
                type="button"
                role="option"
                aria-selected={selected}
                className={`dp-row${selected ? ' dp-row-on' : ''}`}
                onClick={() => pick(o)}
              >
                <span className="dp-row-name">{o.name}</span>
                {o.children?.length ? <RightOutlined className="dp-mute" /> : selected && <CheckOutlined />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <Popover
      open={open}
      onOpenChange={(next) => (next ? openPanel() : setOpen(false))}
      trigger="click"
      placement="bottomLeft"
      arrow={false}
      content={panel}
    >
      {/* A read-only antd Input, so height, border, radius and focus ring match every other field beside it. */}
      <div className="dp-control">
        <Input
          readOnly
          value={value}
          placeholder={placeholder}
          title={value || undefined}
          status={invalid ? 'error' : undefined}
          suffix={<DownOutlined className="dp-mute dp-caret" />}
          aria-haspopup="listbox"
          aria-expanded={open}
        />
      </div>
    </Popover>
  );
}
