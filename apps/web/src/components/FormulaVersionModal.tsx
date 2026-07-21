import { useEffect, useState } from 'react';
import { Alert, Checkbox, Input, Modal, Radio, Typography, message } from 'antd';
import { MAJOR_CHANGE_CRITERIA } from '@mbc360/shared/config/changeTriggers';
import { useAppStore } from '../store/useAppStore';
import LabeledInput from './LabeledInput';

// Suggest the next version label: "F1.0" -> Major "F2.0" / Minor "F1.1".
function suggestVersion(current: string, changeType: 'Major' | 'Minor'): string {
  const match = current.match(/^(.*?)(\d+)\.(\d+)$/);
  if (!match) return current + (changeType === 'Major' ? '.2.0' : '.1.1');
  const [, prefix, major, minor] = match;
  return changeType === 'Major'
    ? `${prefix}${Number(major) + 1}.0`
    : `${prefix}${major}.${Number(minor) + 1}`;
}

// A2 (confirmed): a new formulation version re-opens Gates 4-9 on the existing
// project (Major) — the original project remains the master history and Phase 1
// stays. Minor changes are recorded without touching the gate flow. Which
// changes count as "Major" is follow-up F5 — until confirmed the user chooses.
export default function FormulaVersionModal({
  projectId,
  currentVersion,
  open,
  onClose,
}: {
  projectId: string;
  currentVersion: string;
  open: boolean;
  onClose: () => void;
}) {
  const createFormulaVersion = useAppStore((s) => s.createFormulaVersion);

  const [changeType, setChangeType] = useState<'Major' | 'Minor'>('Minor');
  const [majorCriteria, setMajorCriteria] = useState<string[]>([]);
  const [version, setVersion] = useState('');
  const [reason, setReason] = useState('');
  const [initiatedBy, setInitiatedBy] = useState('');
  const [confirmedBy, setConfirmedBy] = useState('');

  useEffect(() => {
    if (open) {
      setChangeType('Minor');
      setMajorCriteria([]);
      setVersion(suggestVersion(currentVersion, 'Minor'));
      setReason('');
      setInitiatedBy('');
      setConfirmedBy('');
    }
  }, [open, currentVersion]);

  // F5: any selected criterion forces a Major classification; with none
  // selected the change may be recorded as Minor. The reviewer still confirms.
  const criteriaForceMajor = majorCriteria.length > 0;

  const applyChangeType = (t: 'Major' | 'Minor') => {
    setChangeType(t);
    setVersion(suggestVersion(currentVersion, t));
  };

  const onChangeType = (t: 'Major' | 'Minor') => {
    if (criteriaForceMajor && t === 'Minor') return; // locked to Major while criteria apply
    applyChangeType(t);
  };

  const onCriteriaChange = (values: string[]) => {
    setMajorCriteria(values);
    // Auto-suggest: selecting any criterion promotes to Major; clearing all
    // reverts the suggestion to Minor (the reviewer can still keep Major).
    if (values.length > 0) applyChangeType('Major');
    else applyChangeType('Minor');
  };

  const onConfirm = () => {
    createFormulaVersion(projectId, {
      version: version.trim(),
      changeType,
      reason: reason.trim() || undefined,
      initiatedBy: initiatedBy.trim() || undefined,
      majorCriteria: majorCriteria.length > 0 ? majorCriteria : undefined,
      classificationConfirmedBy: confirmedBy.trim() || undefined,
    });
    message.success(
      changeType === 'Major'
        ? `Formula version ${version} created — Gates 4-9 reopened for rework.`
        : `Formula version ${version} recorded in the change register.`,
    );
    onClose();
  };

  return (
    <Modal
      title={`New formula version (current: ${currentVersion})`}
      open={open}
      onOk={onConfirm}
      onCancel={onClose}
      okText="Create version"
      okButtonProps={{
        disabled:
          !version.trim() ||
          version.trim() === currentVersion ||
          !reason.trim() ||
          !confirmedBy.trim(),
      }}
    >
      <div style={{ display: 'grid', gap: 12 }}>
        <div>
          <div style={{ marginBottom: 4, fontWeight: 600 }}>
            Change impact (F5) — tick every area this change may affect
          </div>
          <Checkbox.Group
            value={majorCriteria}
            onChange={(v) => onCriteriaChange(v as string[])}
            options={MAJOR_CHANGE_CRITERIA.map((c) => ({ value: c.id, label: c.label }))}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}
          />
          <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 6, marginBottom: 0 }}>
            Any area ticked classifies the change as <b>Major</b>. A <b>Minor</b> change is one
            demonstrated not to affect safety, efficacy, regulatory status, claims, specifications or
            performance.
          </Typography.Paragraph>
        </div>
        <div>
          <div style={{ marginBottom: 4, fontWeight: 600 }}>Classification</div>
          <Radio.Group
            value={changeType}
            onChange={(e) => onChangeType(e.target.value)}
            options={[
              { value: 'Major', label: 'Major — formula redesign' },
              { value: 'Minor', label: 'Minor — record only', disabled: criteriaForceMajor },
            ]}
          />
          <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 6, marginBottom: 0 }}>
            {changeType === 'Major'
              ? 'Reopens Gates 4-9 (redesign, testing, safety and validation are repeated), invalidates the Phase 2-3 approvals and records the pre-change state in the backtrack audit log. Phase 1 data is kept.'
              : 'Records the new version in the history and the Formulation Change Register without touching the gate flow.'}
            {criteriaForceMajor && ' Locked to Major while impact areas are selected.'}
          </Typography.Paragraph>
        </div>
        <LabeledInput label="New version" value={version} onChange={(e) => setVersion(e.target.value)} />
        <div>
          <div style={{ marginBottom: 4, fontWeight: 600 }}>Reason</div>
          <Input.TextArea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="What changed and why? (required — recorded in the Formulation Change Register)"
          />
        </div>
        <LabeledInput
          label="Initiated by"
          value={initiatedBy}
          onChange={(e) => setInitiatedBy(e.target.value)}
          placeholder="Recorded in the audit trail"
        />
        <LabeledInput
          label="Classification confirmed by"
          value={confirmedBy}
          onChange={(e) => setConfirmedBy(e.target.value)}
          placeholder="Technical / Quality reviewer (required — F5)"
        />
        {changeType === 'Major' && (
          <Alert
            type="warning"
            showIcon
            title="Gates 4-9 will be reopened and Phase 2-3 approvals invalidated. Nothing is deleted — previous decisions and sign-offs stay in the backtrack audit log."
          />
        )}
      </div>
    </Modal>
  );
}
