import { useEffect, useState } from 'react';
import { Alert, Checkbox, Input, Radio, Typography, message } from 'antd';
import { MAJOR_CHANGE_CRITERIA } from '@mbc360/shared/config/changeTriggers';
import { Select } from 'antd';
import { formulaIsControlled, changesAvailableForNewVersion } from '@mbc360/shared/utils/changeOrder';
import { useAppStore } from '../store/useAppStore';
import LabeledInput from './LabeledInput';

import FormDrawer from './FormDrawer';
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
  const proposeFormulaVersion = useAppStore((s) => s.proposeFormulaVersion);
  const pending = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId)?.formulaVersionProposal);
  // Whether the current version is on sale anywhere: a version that was never released is superseded only once a person confirms there
  // was no release (Round 5 question 5(d)).
  const onSale = useAppStore((s) =>
    (s.projects.find((p) => p.identity.id === projectId)?.marketTracks ?? []).some(
      (t) => t.formulaVersion === currentVersion && !!t.actualLaunchDate && !t.withdrawnDate,
    ),
  );
  // Round 5 question 32: a new version of a controlled (previously approved) formula is created against its approved master change record.
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const controlled = project ? formulaIsControlled(project) : false;
  const availableChanges = project && controlled ? changesAvailableForNewVersion(project) : [];
  const [changeId, setChangeId] = useState<string | undefined>();
  const [documentationOnly, setDocumentationOnly] = useState(false);
  const [confirmNoRelease, setConfirmNoRelease] = useState(false);

  const [creating, setCreating] = useState(false);
  const [changeType, setChangeType] = useState<'Major' | 'Minor'>('Minor');
  const [majorCriteria, setMajorCriteria] = useState<string[]>([]);
  const [version, setVersion] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      setChangeType('Minor');
      setMajorCriteria([]);
      setVersion(suggestVersion(currentVersion, 'Minor'));
      setReason('');
      setChangeId(undefined);
      setDocumentationOnly(false);
      setConfirmNoRelease(false);
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
    if (t === 'Major') setDocumentationOnly(false);
  };

  const onCriteriaChange = (values: string[]) => {
    setMajorCriteria(values);
    // Auto-suggest: selecting any criterion promotes to Major; clearing all
    // reverts the suggestion to Minor (the reviewer can still keep Major).
    if (values.length > 0) applyChangeType('Major');
    else applyChangeType('Minor');
  };

  // Closes only once the server has created the version. A refused write (locked data, a conflict) keeps the
  // drawer open with what was entered instead of announcing a version that does not exist.
  const onConfirm = async () => {
    setCreating(true);
    try {
      const created = await proposeFormulaVersion(projectId, {
        version: version.trim(),
        changeType,
        reason: reason.trim() || undefined,
        majorCriteria: majorCriteria.length > 0 ? majorCriteria : undefined,
        ...(controlled && changeId ? { changeId } : {}),
        ...(documentationOnly ? { documentationOnly: true } : {}),
        ...(!onSale && confirmNoRelease && !documentationOnly ? { confirmNoRelease: true } : {}),
      });
      if (!created) return;
    } finally {
      setCreating(false);
    }
    message.success(`Formula version ${version} proposed — a different Technical or Quality reviewer must confirm it before anything changes.`);
    onClose();
  };

  return (
    <FormDrawer
      title={`Propose a new formula version (current: ${currentVersion})`}
      open={open}
      onOk={() => void onConfirm()}
      confirmLoading={creating}
      onCancel={onClose}
      okText="Propose version"
      okButtonProps={{
        disabled:
          !!pending ||
          !version.trim() ||
          version.trim() === currentVersion ||
          !reason.trim() ||
          (controlled && !changeId) ||
          (!onSale && !documentationOnly && !confirmNoRelease),
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
        {changeType === 'Minor' && (
          <div>
            <Checkbox checked={documentationOnly} onChange={(e) => setDocumentationOnly(e.target.checked)}>
              Documentation-only correction — the manufactured formula is unchanged
            </Checkbox>
            <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 4, marginBottom: 0 }}>
              A correction to documents only is a document revision: the version it revises needs no stock transition. A change that touches the
              formula itself does not qualify, and a Minor change never removes a safety, regulatory or release check that it affects.
            </Typography.Paragraph>
          </div>
        )}
        {!onSale && !documentationOnly && (
          <div>
            <Checkbox checked={confirmNoRelease} onChange={(e) => setConfirmNoRelease(e.target.checked)}>
              I confirm formula {currentVersion} was never released to any market
            </Checkbox>
            <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 4, marginBottom: 0 }}>
              A version that was never released is superseded by this one without a sales or stock transition. Its trial and study history is kept.
            </Typography.Paragraph>
          </div>
        )}
        {controlled && (
          <div>
            <div style={{ marginBottom: 4, fontWeight: 600 }}>
              Approved change record<span className="as-req">&nbsp;*</span>
            </div>
            <Select
              style={{ width: '100%' }}
              showSearch
              optionFilterProp="label"
              value={changeId}
              onChange={setChangeId}
              placeholder={availableChanges.length > 0 ? 'Pick the approved formulation change' : 'No approved formulation change is ready'}
              options={availableChanges.map((c) => ({ value: c.changeId, label: `${c.changeId} — ${c.trigger} (${c.status})` }))}
              notFoundContent="No formulation change is approved to implement and free of a version"
            />
            <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 4, marginBottom: 0 }}>
              This formula has been approved before, so it is a controlled baseline. Raise the change on Change Control, have its impact assessed (and NP and the
              technical functions approve it) first. Evaluation samples can be made under the submitted change as unapproved trials in the Development Iteration
              Log; they cannot replace the controlled version.
            </Typography.Paragraph>
          </div>
        )}
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
        {/* Round 5 question 23(c): the initiator proposes the classification; a DIFFERENT authorised Technical or Quality reviewer confirms it.
            Both are recorded by the server from the people who act, never typed. */}
        <Typography.Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }}>
          Recorded as proposed by <b>you</b>. The version is created, and the classification confirmed, when a <b>different</b> reviewer with Technical or Quality
          authority confirms it. Being qualified does not make confirming your own proposal independent.
        </Typography.Paragraph>
        {pending && (
          <Alert type="warning" showIcon title={`Version ${pending.version} proposed by ${pending.proposedBy} is waiting for confirmation — confirm or withdraw it first.`} />
        )}
        {changeType === 'Major' && (
          <Alert
            type="warning"
            showIcon
            title="When it is confirmed, Gates 4-9 will be reopened and Phase 2-3 approvals invalidated. Nothing is deleted — previous decisions and sign-offs stay in the backtrack audit log."
          />
        )}
      </div>
    </FormDrawer>
  );
}
