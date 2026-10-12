import { Alert, Button, Input, Select, Tooltip } from 'antd';
import {
  CheckOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  LockOutlined,
  MinusOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import type { ProjectData, RegisterRow } from '@mbc360/shared/types';
import { createEmptyRegisterRow, getRegisterConfig } from '@mbc360/shared/config/registers';
import { NO_VULNERABLE_GROUP, TARGET_USER_TO_VULNERABLE_GROUP } from '@mbc360/shared/config/vulnerableGroups';
import {
  VULNERABLE_REGISTER,
  expectedVulnerableGroups,
  groupOf,
  vulnerableRowProblems,
  vulnerableSaveBlockers,
} from '@mbc360/shared/utils/vulnerableUsers';
import { useDraft } from '../hooks/useDraft';
import { useRegisterFreeze } from '../hooks/useRegisterFreeze';
import SaveBar from './SaveBar';
import RequiredMark from './RequiredMark';
import UserSelect from './UserSelect';
import '../styles/concept.css';
import './VulnerableUserAssessmentTable.css';

// The Vulnerable-User Assessment is the one register whose job is to AGREE with
// another screen, and whose two kinds of row are mutually exclusive — "No
// vulnerable-user group identified" records an absence and cannot sit beside a
// row naming a group (vulnerableUsers.ts). The generic table drew both kinds
// identically and never showed the Gate 02 selection they must agree with, so
// the contradiction was only reported at save time.
//
// This component asks the yes/no question first, which is what rule B5 actually
// requires: "a general-adult project must still record 'No vulnerable-user
// group identified' rather than satisfying the requirement by default".
// Answering "no" leaves no way to also name a group, so the contradiction stops
// being representable rather than being caught.
//
// It reads the Gate 02 target users but NEVER writes them — the two records are
// deliberately separate (B5), and the only coupling in that direction is the
// pre-existing `targetUsersPinnedByAssessment` guard, which stops a tick being
// removed while a row depends on it. Nothing here changes that.
//
// Same special-case pattern as SupplierRmEvidenceTable / PublishedInfoApproval
// Table / WatchlistRegister: RegisterHubPage renders this instead of
// DynamicTable for this one register key.

const PATHWAY_SUGGESTIONS = [
  'Skincare for Two',
  'Infant & Baby Safety',
  'Enhanced safety review',
  'Vulnerable-user review',
];

const text = (v: unknown) => String(v ?? '').trim();

// What rule B5 requires of a row that names a real group. The "none" row needs
// only the group itself — a pathway and a reviewer for a group nobody
// identified would be nonsense, which is why gateReadiness scopes its
// `registerRowsComplete` the same way.
function missingOn(row: RegisterRow): string[] {
  if (groupOf(row) === NO_VULNERABLE_GROUP) return [];
  const out: string[] = [];
  if (!text(row.safetyPathway)) out.push('safety pathway');
  if (!text(row.responsibleReviewer)) out.push('responsible reviewer');
  if (!text(row.additionalAssessments)) out.push('additional assessments');
  return out;
}

export default function VulnerableUserAssessmentTable({
  project,
  rows,
  onSave,
  readOnly,
  readOnlyReason,
}: {
  project: ProjectData;
  rows: RegisterRow[];
  onSave: (rows: RegisterRow[]) => void | boolean | Promise<unknown>;
  readOnly: boolean;
  readOnlyReason?: string;
}) {
  const { draft, dirty, update, markSaved, discard } = useDraft<RegisterRow[]>(rows);
  // Columns frozen by a gate that has passed or is signed (SW-5, SW-24) are shown read-only, and once any is frozen
  // groups can be neither added nor removed — the server refuses both.
  const freeze = useRegisterFreeze(project, getRegisterConfig(VULNERABLE_REGISTER)!);
  const rowsOff = readOnly || !!freeze.rowsFrozen;
  const off = (columnKey: string) => readOnly || freeze.isFrozen(columnKey);

  const implied = expectedVulnerableGroups(project);
  // The Gate 02 target users that imply a group. Shown only when they are NOT simply the group's own name:
  // for "Postpartum" the target user is also "Postpartum", and printing it twice read as duplicated data.
  const sourcesOf = (group: string) =>
    Object.entries(TARGET_USER_TO_VULNERABLE_GROUP)
      .filter(([, g]) => g === group)
      .map(([user]) => user)
      .filter((user) => (project.checklists['targetUsers'] ?? []).some((i) => i.selected && i.label === user))
      .filter((user) => user !== group);

  const saysNone = draft.some((r) => groupOf(r) === NO_VULNERABLE_GROUP);
  const named = draft.filter((r) => groupOf(r) !== NO_VULNERABLE_GROUP);
  const answered = draft.length > 0;
  // Unanswered reads as "Yes" so the group list is reachable; the readiness
  // check still blocks Gate 02 until a row exists either way.
  const mode: 'some' | 'none' = saysNone ? 'none' : 'some';

  const blockers = readOnly ? [] : vulnerableSaveBlockers(project, draft);
  const warnings = readOnly
    ? []
    : vulnerableRowProblems(project, draft)
        .filter((p) => !p.hard)
        .map((p) => `"${p.group}" ${p.reason}.`);
  const incomplete = draft.flatMap((r) => {
    const m = missingOn(r);
    return m.length ? [`"${groupOf(r)}" is missing: ${m.join(', ')}`] : [];
  });
  // Shown on screen, never only in the disabled button's tooltip.
  const saveProblems = [...blockers, ...incomplete];

  const rowFor = (group: string) => ({ ...createEmptyRegisterRow(VULNERABLE_REGISTER), vulnerableGroup: group });

  const chooseNone = () => update([rowFor(NO_VULNERABLE_GROUP)]);
  const chooseSome = () => update(named);
  const addGroup = (group: string) =>
    update([...draft.filter((r) => groupOf(r) !== NO_VULNERABLE_GROUP), rowFor(group)]);
  const removeGroup = (group: string) => update(draft.filter((r) => groupOf(r) !== group));
  const patch = (index: number, key: string, value: string | undefined) =>
    update(draft.map((r, i) => (i === index ? { ...r, [key]: value ?? '' } : r)));

  const save = async () => {
    if (saveProblems.length > 0) return;
    // Only settled once the server took it, so a refused save keeps the draft to be corrected.
    if ((await onSave(draft)) === false) return;
    markSaved();
  };

  // The ONLY way to add a group is the "Add row" button beside a missing one in
  // the Gate 02 block below, so a group can only ever be one Gate 02 implies
  // (project owner, 2026-10-05: only groups derived from Gate 02 may be chosen,
  // never picked freely). A free picker was built first and removed as a
  // duplicate of that button.
  //
  // This NARROWS a confirmed answer: R4-C25(d) says a group Safety or Regulatory
  // identifies on its own judgement should warn and ask for a rationale rather
  // than be refused. The narrowing is deliberately UI-only — the rule engine and
  // the API still accept such a row and still only warn, so nothing already
  // recorded becomes unsavable and no confirmed rule is rewritten here.
  // [ASSUMPTION: R5-Q54]
  const missingRows = implied.filter((g) => !draft.some((r) => groupOf(r) === g));

  return (
    <div className="vua">
      {readOnly && (
        <div className="vua-lock">
          <LockOutlined />
          <span>
            {readOnlyReason ??
              'This evidence belongs to a gate that has already passed. To correct it, Backtrack to reopen that gate first.'}
          </span>
        </div>
      )}

      {saveProblems.length > 0 && (
        <Alert
          type="error"
          showIcon
          title={
            saveProblems.length === 1 ? 'This cannot be saved yet' : `${saveProblems.length} things to fix before saving`
          }
          description={
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {saveProblems.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          }
        />
      )}
      {warnings.length > 0 && (
        <Alert
          type="warning"
          showIcon
          title="Check this against the Gate 02 target users"
          description={
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          }
        />
      )}

      <section className="c-card vua-ask">
        <p className="vua-q">Does this product touch any vulnerable-user group?</p>
        <p className="vua-help">
          Gate 02 cannot pass until this is answered. The two answers are mutually exclusive — choosing &quot;No&quot;
          removes every group below.
        </p>
        <div className="vua-opts" role="radiogroup">
          <button
            type="button"
            role="radio"
            className="vua-opt"
            aria-checked={answered && mode === 'some'}
            disabled={rowsOff}
            onClick={chooseSome}
          >
            <span className="vua-dot" />
            <span>
              <b>Yes — name each group</b>
              <span>Every group needs a safety pathway, a responsible reviewer and notes on further assessment.</span>
            </span>
          </button>
          <button
            type="button"
            role="radio"
            className="vua-opt"
            aria-checked={mode === 'none'}
            disabled={rowsOff}
            onClick={chooseNone}
          >
            <span className="vua-dot" />
            <span>
              <b>No vulnerable-user group</b>
              <span>
                Records one &quot;No vulnerable-user group identified&quot; row. No pathway or reviewer needed.
              </span>
            </span>
          </button>
        </div>
      </section>

      {mode === 'some' && (
        <>
          {/* Read-only: this screen never writes back to the Gate 02 checklist. */}
          <section className="c-card vua-src">
            <div className="vua-src-h">
              <span className="vua-src-t">Target users selected at Gate 02</span>
              {missingRows.length > 0 ? (
                <span className="c-tag c-tag-warn">
                  {missingRows.length} row{missingRows.length > 1 ? 's' : ''} missing
                </span>
              ) : (
                <span className="c-tag c-tag-ok">All covered</span>
              )}
            </div>
            <div className="vua-src-list">
              {implied.map((group) => {
                const has = draft.some((r) => groupOf(r) === group);
                return (
                  <div key={group} className={`vua-src-row ${has ? 'vua-src-ok' : 'vua-src-miss'}`}>
                    {has ? <CheckOutlined /> : <ExclamationCircleOutlined />}
                    <span className="vua-nm">{group}</span>
                    {sourcesOf(group).length > 0 && <span className="c-tag">from {sourcesOf(group).join(', ')}</span>}
                    {!has && !rowsOff && (
                      <Button size="small" onClick={() => addGroup(group)}>
                        Add row
                      </Button>
                    )}
                  </div>
                );
              })}
              {(project.checklists['targetUsers'] ?? [])
                .filter((i) => i.selected && !TARGET_USER_TO_VULNERABLE_GROUP[i.label])
                .map((i) => (
                  <div key={i.label} className="vua-src-row vua-src-none">
                    <MinusOutlined />
                    <span className="vua-nm">{i.label}</span>
                    <span className="c-tag">implies no group</span>
                  </div>
                ))}
            </div>
            <Link
              className="c-link vua-src-link"
              to={`/projects/${project.identity.id}/phase/1?gate=SG02&scrollTo=sec-checklist-targetUsers`}
            >
              Open Gate 02 →
            </Link>
          </section>

          <section className="c-card">
            {named.length === 0 ? (
              <div className="vua-empty">
                <SafetyCertificateOutlined />
                <div className="vua-empty-t">No group recorded yet</div>
                <p>Gate 02 cannot pass until this is answered — even when the answer is that no group applies.</p>
              </div>
            ) : (
              draft.map((row, index) => {
                const group = groupOf(row);
                if (group === NO_VULNERABLE_GROUP) return null;
                return (
                  <div key={`${group}-${index}`} className="vua-card">
                    <div className="vua-card-h">
                      <span className="vua-card-l">
                        <span className="vua-card-t">{group}</span>
                        {implied.includes(group) ? (
                          <span className="c-tag">From Gate 02</span>
                        ) : (
                          <span className="c-tag c-tag-warn">Raised by Safety / Regulatory</span>
                        )}
                      </span>
                      <span className="vua-card-x">
                        <Tooltip title={rowsOff ? freeze.rowsFrozenReason : 'Remove this group'}>
                          <Button
                            size="small"
                            icon={<DeleteOutlined />}
                            disabled={rowsOff}
                            aria-label={`Remove ${group}`}
                            onClick={() => removeGroup(group)}
                          />
                        </Tooltip>
                      </span>
                    </div>
                    <div className="vua-grid">
                      <label className="vua-fld">
                        <span>
                          Applicable safety pathway
                          <RequiredMark met={!!text(row.safetyPathway)} title="Required before this can be saved" />
                        </span>
                        {off('safetyPathway') ? (
                          <span className="vua-static">{text(row.safetyPathway) || '—'}</span>
                        ) : (
                          <Select
                            allowClear
                            showSearch
                            placeholder="Select a pathway"
                            status={text(row.safetyPathway) ? undefined : 'error'}
                            value={text(row.safetyPathway) || undefined}
                            onChange={(v?: string) => patch(index, 'safetyPathway', v)}
                            options={PATHWAY_SUGGESTIONS.map((p) => ({ value: p, label: p }))}
                          />
                        )}
                      </label>
                      <label className="vua-fld">
                        <span>
                          Responsible reviewer
                          <RequiredMark met={!!text(row.responsibleReviewer)} title="Required before this can be saved" />
                        </span>
                        {off('responsibleReviewer') ? (
                          <span className="vua-static">{text(row.responsibleReviewer) || '—'}</span>
                        ) : (
                          <UserSelect
                            placeholder="Select a person"
                            status={text(row.responsibleReviewer) ? undefined : 'error'}
                            value={text(row.responsibleReviewer) || undefined}
                            onChange={(v) => patch(index, 'responsibleReviewer', v)}
                          />
                        )}
                      </label>
                      <label className="vua-fld vua-wide">
                        <span>
                          Additional assessments required
                          <RequiredMark met={!!text(row.additionalAssessments)} title="Required before this can be saved" />
                        </span>
                        {off('additionalAssessments') ? (
                          <span className="vua-static">{text(row.additionalAssessments) || '—'}</span>
                        ) : (
                          <Input.TextArea
                            autoSize={{ minRows: 2 }}
                            status={text(row.additionalAssessments) ? undefined : 'error'}
                            value={String(row.additionalAssessments ?? '')}
                            onChange={(e) => patch(index, 'additionalAssessments', e.target.value)}
                          />
                        )}
                      </label>
                    </div>
                  </div>
                );
              })
            )}
          </section>
        </>
      )}

      {mode === 'none' && (
        <section className="c-card vua-card vua-card-none">
          <div className="vua-card-h">
            <span className="vua-card-l">
              <CheckCircleOutlined style={{ color: 'var(--c-ok-dot)' }} />
              <span className="vua-card-t">No vulnerable-user group identified</span>
            </span>
          </div>
          <p className="vua-help" style={{ margin: 0 }}>
            A recorded absence — no pathway or reviewer needed. Choose &quot;Yes&quot; above to name a group.
          </p>
        </section>
      )}

      {dirty && !readOnly && (
        <div className="page-savebar">
          <SaveBar
            dirty={dirty}
            onSave={save}
            onDiscard={discard}
            disabled={saveProblems.length > 0}
            disabledReason={saveProblems.join(' · ')}
          />
        </div>
      )}
    </div>
  );
}
