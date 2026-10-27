import { App } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import './LinkValue.css';

// A web address shown the way a person reads one: on a single line, cut with an ellipsis when it is too long for the cell, the whole
// address on hover, and a button beside it that copies it. Text that is not an address is left to the caller.

export default function LinkValue({ value }: { value: string }) {
  const { message } = App.useApp();
  const url = value.trim();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      message.success('Link copied.');
    } catch {
      message.error('Copy failed — your browser blocked clipboard access.');
    }
  };
  return (
    <span className="lv">
      <a className="lv-url" href={url} target="_blank" rel="noopener noreferrer" title={url} onClick={(e) => e.stopPropagation()}>
        {url}
      </a>
      <button
        type="button"
        className="lv-copy"
        aria-label="Copy link"
        title="Copy link"
        onClick={(e) => {
          e.stopPropagation();
          void copy();
        }}
      >
        <CopyOutlined />
      </button>
    </span>
  );
}
