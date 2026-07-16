import { Tag } from 'antd';

const STATUS_COLORS: Record<string, string> = {
  'Not Started': 'default',
  'In Progress': 'processing',
  Completed: 'success',
  Complete: 'success',
  Gap: 'volcano',
  'On Hold': 'warning',
  Hold: 'warning',
  Backtracked: 'error',
  Backtrack: 'error',
  Proceed: 'success',
  'Proceed with Conditions': 'lime',
  'N/A': 'default',
  Low: 'green',
  Medium: 'orange',
  High: 'red',
  Y: 'green',
  N: 'red',
  NA: 'default',
};

export default function StatusBadge({ value }: { value?: string }) {
  if (!value) return null;
  return <Tag color={STATUS_COLORS[value] ?? 'default'}>{value}</Tag>;
}
