import { Checkbox, DatePicker, Input, Select } from 'antd';
import dayjs from 'dayjs';
import './ListChangeSignal.css';

// Round 5 questions 1(d) and 6. The person changing a company list says how critical the change is — in the same four words used everywhere
// else (Low, Medium, High, Critical) — and by when the projects that rely on the entry must review its impact. Sent with the save as `signal`;
// the server finds the projects and opens an impact assessment for each.
//
// What the answer says about "Critical" (question 6(b)): it is CONFIRMED by the qualified functions on each project before it holds release,
// except an urgent safety issue or a mandatory restriction, which holds release at once and escalates. Withdrawing or changing wording is
// never automatically Critical and never itself takes a product off sale — that is a company decision made outside this application.
// [ASSUMPTION: R6-Q12]
export const CRITICALITY_LEVELS = ['Low', 'Medium', 'High', 'Critical'] as const;
export type Criticality = (typeof CRITICALITY_LEVELS)[number];

export interface ChangeSignal {
  criticality: Criticality;
  urgent: boolean;
  safetyIssue: boolean;
  reason: string;
  dueDate: string;
}

export const emptySignal: ChangeSignal = { criticality: 'Medium', urgent: false, safetyIssue: false, reason: '', dueDate: '' };

export const signalBody = (s: ChangeSignal) => ({
  criticality: s.criticality,
  ...(s.criticality === 'Critical' && s.urgent ? { urgent: true } : {}),
  ...(s.safetyIssue ? { safetyIssue: true } : {}),
  ...(s.criticality === 'Critical' ? { reason: s.reason.trim() } : {}),
  ...(s.dueDate ? { dueDate: s.dueDate } : {}),
});

// What stops the save. The server checks it too; this only says so before the round trip.
export const signalProblem = (s: ChangeSignal): string | null =>
  s.criticality === 'Critical' && s.reason.trim() === '' ? 'A Critical change needs its reason' : null;

export default function ListChangeSignal({ value, onChange }: { value: ChangeSignal; onChange: (v: ChangeSignal) => void }) {
  const set = (patch: Partial<ChangeSignal>) => onChange({ ...value, ...patch });
  const critical = value.criticality === 'Critical';
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
        <label className="ls-field">
          <span className="ls-label">How critical is this change?</span>
          <Select
            style={{ width: '100%' }}
            value={value.criticality}
            options={CRITICALITY_LEVELS.map((c) => ({ value: c, label: c }))}
            onChange={(v: Criticality) => set({ criticality: v, ...(v === 'Critical' ? {} : { urgent: false }) })}
          />
          <span className="ls-help">
            Your proposal. A Critical one is confirmed by a qualified function on each project before it holds release. Changing or withdrawing
            wording is not automatically Critical.
          </span>
        </label>
        {critical && (
          <>
            <div className="ls-field">
              <Checkbox checked={value.urgent} onChange={(e) => set({ urgent: e.target.checked })}>
                Urgent safety issue or mandatory restriction
              </Checkbox>
              <span className="ls-help">
                Release of every project that relies on this is held at once and escalated to Safety, Regulatory and Quality, without waiting for a
                confirmation. Taking a product off sale remains a company decision made outside this application.
              </span>
            </div>
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
          </>
        )}
        <div className="ls-field">
          <Checkbox checked={value.safetyIssue} onChange={(e) => set({ safetyIssue: e.target.checked })}>
            A safety issue is involved
          </Checkbox>
          <span className="ls-help">Safety then contributes to each project's impact assessment.</span>
        </div>
      </div>
    </div>
  );
}
