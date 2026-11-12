import { useState } from 'react';
import { Button, Input, Select, message } from 'antd';
import { useParams } from 'react-router-dom';
import type { ChangeRecord } from '@mbc360/shared/types';
import { isChangeOpen } from '@mbc360/shared/config/changeTriggers';
import {
  AREA_ASSESSMENT_OUTCOMES,
  CHANGE_AREA_FUNCTIONS,
  areaAssessmentProblems,
  areasAwaitingAssessment,
} from '@mbc360/shared/utils/changeAreaAssessments';
import { useAppStore } from '../store/useAppStore';
import HistoryTimeline from './HistoryTimeline';
import Notice from './Notice';
import { RecordField } from './RecordList';

// Round 5 question 11: the technical areas a change touches are each assessed by the function accountable for them; the Final Approver's
// commercial approval does not stand in for them. [ASSUMPTION: R6-Q17]
export default function ChangeAreaAssessmentsBlock({ change }: { change: ChangeRecord }) {
  const { projectId } = useParams();
  const assessChangeArea = useAppStore((s) => s.assessChangeArea);
  const areas = (change.impactAreas ?? []).filter((a) => a in CHANGE_AREA_FUNCTIONS);
  const waiting = areasAwaitingAssessment(change);
  const [area, setArea] = useState<string | undefined>();
  const [outcome, setOutcome] = useState<string | undefined>();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  if (areas.length === 0) return null;

  const problems = areaAssessmentProblems(change, area ?? '', outcome ?? '', note);
  const record = async () => {
    if (!projectId || !area || !outcome) return;
    setBusy(true);
    try {
      const ok = await assessChangeArea(projectId, change.changeId, { area, outcome, note: note.trim() });
      if (ok) {
        message.success(`${change.changeId}: ${area} assessed`);
        setNote('');
        setOutcome(undefined);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: 24 }}>
      {waiting.length > 0 ? (
        <Notice tone="warn" title={`Waiting for: ${waiting.join(', ')}`}>
          Each technical area is assessed by the holder of its function. The change cannot be approved to implement until all are assessed; the Final Approver's
          commercial approval does not replace them.
        </Notice>
      ) : (
        <Notice tone="ok" title="Every technical area has been assessed" />
      )}
      <HistoryTimeline
        items={(change.areaAssessments ?? [])
          .slice()
          .reverse()
          .map((a) => ({
            key: `${a.area}-${a.assessedAt}`,
            title: `${a.area} · ${a.outcome}`,
            meta: `${a.assessedBy} · ${a.assessedAt.slice(0, 10)}`,
            detail: a.note,
            tone: a.outcome === 'Action required' ? ('warn' as const) : undefined,
          }))}
      />
      {isChangeOpen(change.status) && (
        <div className="rt-grid" style={{ marginTop: 16 }}>
          <RecordField label="Area">
            <Select
              style={{ width: '100%' }}
              placeholder="Select the area"
              value={area}
              options={areas.map((a) => ({ value: a, label: a }))}
              onChange={setArea}
            />
          </RecordField>
          <RecordField label="Outcome">
            <Select
              style={{ width: '100%' }}
              placeholder="Select the outcome"
              value={outcome}
              options={AREA_ASSESSMENT_OUTCOMES.map((o) => ({ value: o, label: o }))}
              onChange={setOutcome}
            />
          </RecordField>
          <RecordField label="What was assessed and found" wide>
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} value={note} onChange={(e) => setNote(e.target.value)} />
          </RecordField>
          <div>
            <Button type="primary" disabled={problems.length > 0 || busy} loading={busy} onClick={record}>
              Record area assessment
            </Button>
            <p className="rt-note" style={{ marginTop: 8 }}>
              {problems.length > 0 ? `Still needs: ${problems.join('; ')}. ` : ''}
              Only the holder of the function accountable for the area can record it.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
