import { Checkbox, DatePicker, Input } from 'antd';
import dayjs from 'dayjs';
import './ListChangeSignal.css';

// Round 5 question 1(d), our reading of the details [ASSUMPTION: R6-Q6]. The person changing a company list says whether the change is
// Critical and by when the projects that rely on the entry must review its impact. Sent with the save as `signal`; the server finds
// the projects, opens an impact assessment for each, and holds release on them when the change is Critical.
export interface ChangeSignal {
  critical: boolean;
  reason: string;
  dueDate: string;
}

export const emptySignal: ChangeSignal = { critical: false, reason: '', dueDate: '' };

export const signalBody = (s: ChangeSignal) => ({
  critical: s.critical,
  ...(s.critical ? { reason: s.reason.trim() } : {}),
  ...(s.dueDate ? { dueDate: s.dueDate } : {}),
});

// What stops the save. The server checks it too; this only says so before the round trip.
export const signalProblem = (s: ChangeSignal): string | null =>
  s.critical && s.reason.trim() === '' ? 'A Critical change needs its reason' : null;

export default function ListChangeSignal({ value, onChange }: { value: ChangeSignal; onChange: (v: ChangeSignal) => void }) {
  const set = (patch: Partial<ChangeSignal>) => onChange({ ...value, ...patch });
  return (
    <div className="c-card ls-card">
      <div className="ls-title">Effect on projects that already use this</div>
      <div className="ls-grid">
        <label className="ls-field">
          <span className="ls-label">Impact review due by</span>
          <DatePicker
            style={{ width: '100%' }}
            value={value.dueDate ? dayjs(value.dueDate) : null}
            onChange={(d) => set({ dueDate: d ? d.format('YYYY-MM-DD') : '' })}
          />
          <span className="ls-help">Needed when a project relies on this entry: its owner reviews what the change means for it by this date.</span>
        </label>
        <div className="ls-field">
          <Checkbox checked={value.critical} onChange={(e) => set({ critical: e.target.checked })}>
            This is a Critical change
          </Checkbox>
          <span className="ls-help">
            A safety issue, a prohibition or a mandatory market restriction. Release of every project that relies on this is held until its
            impact review is concluded.
          </span>
        </div>
        {value.critical && (
          <label className="ls-field ls-wide">
            <span className="ls-label">
              What is the issue <span className="ls-req">*</span>
            </span>
            <Input.TextArea
              autoSize={{ minRows: 2, maxRows: 5 }}
              status={value.reason.trim() === '' ? 'error' : undefined}
              value={value.reason}
              onChange={(e) => set({ reason: e.target.value })}
            />
          </label>
        )}
      </div>
    </div>
  );
}
