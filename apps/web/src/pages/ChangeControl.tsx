import { useMemo, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import UserSelect from '../components/UserSelect';
import ChangeDispositionBlock from '../components/ChangeDispositionBlock';
import ChangeTriageBlock, { triageSummary } from '../components/ChangeTriageBlock';
import ChangeAreaAssessmentsBlock from '../components/ChangeAreaAssessmentsBlock';
import Notice from '../components/Notice';
import { isChangeDispositionRecorded, missingDispositionFields } from '@mbc360/shared/utils/changeImpact';
import { AutoComplete, Button, DatePicker, Form, Input, Modal, Select, Switch, message, Tooltip } from 'antd';
import DrawerTabs from '../components/DrawerTabs';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useAppStore } from '../store/useAppStore';
import { useSession } from '../auth/useSession';
import { legacyChangeReferences } from '@mbc360/shared/utils/changeLinks';
import type { ChangeRecord, ChangeStatus, RiskLevel } from '@mbc360/shared/types';
import { RISK_LEVELS } from '@mbc360/shared/types';
import {
  CHANGE_RACI,
  CHANGE_AFFECTED_AREAS,
  CHANGE_COMMUNICATED_OPTIONS,
  CHANGE_STATUSES,
  CHANGE_TRIGGERS,
  CHANGE_IMPACT_AREAS,
  getChangeTrigger,
  isChangeOpen,
  type ChangeTriggerCategory,
  type RaciRole,
} from '@mbc360/shared/config/changeTriggers';
import { changeTriggerAvailability, earliestTriggerGate } from '@mbc360/shared/utils/changeAccess';
import StatusBadge from '../components/StatusBadge';
import SheetRefs from '../components/SheetRefs';
import { useDraft } from '../hooks/useDraft';
import SaveBar from '../components/SaveBar';
import RecordList, { RecordField } from '../components/RecordList';
import '../styles/concept.css';
import '../components/DynamicTable.css';
import './ChangeControl.css';

import FormDrawer from '../components/FormDrawer';
import TriggerReference, { AffectedGates } from '../components/TriggerReference';

const TRIGGER_CATEGORIES: ChangeTriggerCategory[] = ['Formula', 'Artwork / Label', 'PIF / Evidence'];

// Tone on the role tag only (concept rule: colour carries state on the tag).
const RACI_ROLE_TONE: Record<RaciRole, string> = {
  Accountable: ' c-tag-bad',
  Responsible: '',
  Approver: ' c-tag-ok',
  'Informed / acknowledgement': '',
};


interface ChangeForm {
  triggerId?: string;
  projectId?: string;
  productSku: string;
  affectedArea: string;
  oldVersion?: string;
  riskLevel: RiskLevel;
  requiredAction?: string;
  evidenceLink?: string;
  requiredSignOffs?: string;
  communicationRequired: boolean;
  salesMarketingMessage?: string;
  dueDate?: Dayjs;
  owner: string;
  notes?: string;
}

export default function ChangeControl() {
  // Change Control is a project's own log (project owner, 2026-10-27). The store holds every project's records in one list, so this
  // page works on its slice and writes the whole list back with the other projects' records untouched.
  const { projectId } = useParams();
  const sessionName = useSession().user?.displayName;
  const allChanges = useAppStore((s) => s.changes);
  const changes = useMemo(() => allChanges.filter((c) => c.projectId === projectId), [allChanges, projectId]);
  const projects = useAppStore((s) => s.projects);
  const addChange = useAppStore((s) => s.addChange);
  const reopenChange = useAppStore((s) => s.reopenChange);
  const setChangesBulk = useAppStore((s) => s.setChangesBulk);
  // The project the sidebar is currently pinned to (2026-08-26, user-requested):
  // opening "Open Change Request" from inside a project's workspace should not
  // make someone re-pick the project they were just looking at.
  const { draft, dirty, update, markSaved, discard } = useDraft(changes);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [refOpen, setRefOpen] = useState(false);
  // SW-55: the closed change being reopened, and the reason typed so far.
  const [reopening, setReopening] = useState<ChangeRecord | null>(null);
  const [reopenReason, setReopenReason] = useState('');
  const [reopenBusy, setReopenBusy] = useState(false);
  // The detail panel's tab, kept across changes so moving to the next record stays on the same tab.
  const [detailTab, setDetailTab] = useState('details');
  const [form] = Form.useForm<ChangeForm>();
  const selectedTriggerId = Form.useWatch('triggerId', form);
  const selectedTrigger = getChangeTrigger(selectedTriggerId);
  // "Old version" is what this change supersedes. The project's real versions are
  // known — the formula's from its version history, artwork's from the Packaging
  // Specs & Artwork register — so offer them rather than making someone remember
  // the exact string. AutoComplete, not Select: the field is descriptive, and a
  // change may supersede something neither list holds (a supplier spec revision,
  // a document rev). Suggesting is right here; constraining would not be.
  const selectedProjectId = Form.useWatch('projectId', form);
  // SW-30: a trigger is offered as selectable only once the chosen project has passed the
  // earliest gate it names — until then there is nothing locked to correct. With no project
  // chosen yet nothing can be compared, so every trigger stays selectable and the server
  // (which always knows the project) is the one that refuses.
  const triggerProject = projects.find((x) => x.identity.id === selectedProjectId);
  const triggerSelectOptions = TRIGGER_CATEGORIES.map((cat) => ({
    label: cat,
    options: CHANGE_TRIGGERS.filter((t) => t.category === cat).map((t) => {
      const a = triggerProject ? changeTriggerAvailability(triggerProject, t) : undefined;
      return {
        value: t.id,
        label: a && !a.allowed ? `${t.label} — available once Gate ${earliestTriggerGate(t)?.number} has passed` : t.label,
        disabled: !!a && !a.allowed,
        title: a && !a.allowed ? a.reason : undefined,
      };
    }),
  }));
  const oldVersionOptions = useMemo(() => {
    const p = projects.find((x) => x.identity.id === selectedProjectId);
    if (!p) return [];
    const formula = [p.formulaVersion, ...p.formulaVersionHistory.map((v) => v.version)];
    const artwork = (p.registers['packagingSpecsArtwork'] ?? []).map((r) => String(r.artworkVersion ?? ''));
    const uniq = (xs: string[]) => [...new Set(xs.map((x) => x.trim()).filter(Boolean))];
    return [
      { label: 'Formula version', options: uniq(formula).map((v) => ({ value: v })) },
      { label: 'Artwork / label version', options: uniq(artwork).map((v) => ({ value: v })) },
    ].filter((g) => g.options.length > 0);
  }, [projects, selectedProjectId]);

  // Switching to a project that has not yet reached the chosen trigger's gate would leave a trigger
  // selected that the server will refuse; clear it so the person picks again (SW-30).
  useEffect(() => {
    const t = getChangeTrigger(form.getFieldValue('triggerId'));
    const p = projects.find((x) => x.identity.id === selectedProjectId);
    if (t && p && !changeTriggerAvailability(p, t).allowed) form.setFieldsValue({ triggerId: undefined });
  }, [form, projects, selectedProjectId]);

  // Default is Yes (see initialValues); only hide the message when explicitly No.
  const commRequired = Form.useWatch('communicationRequired', form) !== false;

  // `form`'s `initialValues` only apply once, at first mount — reopening the
  // Modal later would not pick up a since-changed active project, so the
  // Project (and its dependent Product/SKU) are set explicitly on every open
  // instead. `activeProjectId` may point at a project that no longer exists
  // (deleted, or never set) — falls back to leaving the field blank rather
  // than crashing on a `.find()` that returns undefined.
  const thisProjectForRefs = projects.find((p) => p.identity.id === projectId);
  const legacyRefs = useMemo(() => (thisProjectForRefs ? legacyChangeReferences(thisProjectForRefs) : []), [thisProjectForRefs]);

  const openNewChangeModal = () => {
    const thisProject = projects.find((p) => p.identity.id === projectId);
    form.setFieldsValue({
      projectId: thisProject?.identity.id,
      productSku: thisProject?.identity.productSku,
    });
    setOpen(true);
  };

  const onCreate = async () => {
    const values = await form.validateFields();
    // Highest existing CHG number + 1, not `changes.length + 1`: a count repeats
    // an id as soon as any record is missing from the list (removed, or not
    // loaded), and a change id is the record's reference everywhere else.
    const nextNumber =
      allChanges.reduce((max, c) => {
        const n = /^CHG-(\d+)$/.exec(c.changeId ?? '')?.[1];
        return n ? Math.max(max, Number(n)) : max;
      }, 0) + 1;
    const trig = getChangeTrigger(values.triggerId);
    const record: ChangeRecord = {
      ...values,
      changeId: `CHG-${String(nextNumber).padStart(3, '0')}`,
      trigger: trig?.label ?? '',
      // The base data every change-control view reads: who asked for it, and when (Round 5 question 11).
      requestedBy: sessionName,
      dateRequested: dayjs().format('YYYY-MM-DD'),
      dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DD') : undefined,
      status: 'Draft',
    };
    // Closes only once the server has the record; a refused write keeps the drawer open with the input.
    setCreating(true);
    try {
      if (!(await addChange(record))) return;
    } finally {
      setCreating(false);
    }
    message.success(`Change ${record.changeId} opened`);
    setOpen(false);
    form.resetFields();
  };

  const patchChange = (changeId: string, patch: Partial<ChangeRecord>) =>
    update((prev) => prev.map((c) => (c.changeId === changeId ? { ...c, ...patch } : c)));
  const saveChanges = async () => {
    const ok = await setChangesBulk([...allChanges.filter((c) => c.projectId !== projectId), ...draft]);
    if (ok) markSaved();
    return ok;
  };

  // SW-55: a change that is closed WITH its final disposition recorded is frozen — judged on what is saved, not on
  // the draft, so closing it and filling the disposition in one edit does not lock the form mid-way.
  const isFrozen = (c: ChangeRecord) => {
    const saved = changes.find((x) => x.changeId === c.changeId);
    return !!saved && !isChangeOpen(saved.status) && isChangeDispositionRecorded(saved);
  };
  // A draft cannot be saved as closed until the disposition is complete, unless the record was already closed
  // and incomplete before this rule (it must stay editable to be completed).
  const closeBlocker = draft
    .map((c) => {
      if (isChangeOpen(c.status) || isChangeDispositionRecorded(c)) return undefined;
      const saved = changes.find((x) => x.changeId === c.changeId);
      if (saved && !isChangeOpen(saved.status)) return undefined;
      return `${c.changeId} cannot be closed as ${c.status} until the final disposition is recorded (missing: ${missingDispositionFields(c).join(', ')})`;
    })
    .find((m) => m !== undefined);
  const confirmReopen = async () => {
    if (!reopening || !projectId) return;
    if (!reopenReason.trim()) return;
    setReopenBusy(true);
    try {
      if (await reopenChange(projectId, reopening.changeId, reopenReason.trim())) {
        message.success(`${reopening.changeId} reopened`);
        setReopening(null);
        setReopenReason('');
      }
    } finally {
      setReopenBusy(false);
    }
  };
  const listProjectMarkets = projects.find((p) => p.identity.id === projectId)?.identity.markets ?? [];
  // The project's markets, plus any already on the record (a market the project has since dropped stays visible).
  const marketOptionsFor = (c: ChangeRecord) =>
    [...new Set([...listProjectMarkets, ...(c.markets ?? [])])].map((m) => ({ value: m, label: m }));
  const openCount = draft.filter((c) => isChangeOpen(c.status)).length;
  // What makes a change hold Gate 11 (rule E3(b), Round 4 question 34(c)): an
  // open change nobody has classified, or a closed one without its final
  // disposition. The old table kept the disposition always expanded so this
  // never needed a click; in the list it is the row's flag and subtitle instead.
  const gate11Issue = (c: ChangeRecord): string | undefined => {
    if (isChangeOpen(c.status)) {
      return (c.impactAreas ?? []).length === 0 ? 'Impact not classified — blocks Gate 11' : undefined;
    }
    if (isChangeDispositionRecorded(c)) return undefined;
    return `Final disposition: ${missingDispositionFields(c).length} missing — blocks Gate 11`;
  };

  const statusSelect = (c: ChangeRecord) => (
    <Select
      style={{ width: '100%' }}
      value={c.status}
      disabled={isFrozen(c)}
      aria-label="Status"
      options={CHANGE_STATUSES.map((s) => ({ value: s, label: s }))}
      onChange={(v: ChangeStatus) =>
        patchChange(c.changeId, {
          status: v,
          closedDate:
            v === 'Completed' || v === 'Rejected' || v === 'Cancelled' || v === 'Superseded'
              ? dayjs().format('YYYY-MM-DD')
              : undefined,
        })
      }
    />
  );

  const dlRow = (label: string, value: React.ReactNode) => (
    <div className="rt-dl-row">
      <dt>{label}</dt>
      <dd>{value === undefined || value === null || value === '' ? <span className="rt-muted">—</span> : value}</dd>
    </div>
  );

  const actions = (
    <>
      {/* On a phone the label collapses to the icon so both actions fit one
          row under the title; the tooltip and aria-label keep the name. */}
      <Tooltip title="Trigger reference">
        <Button icon={<SearchOutlined />} aria-label="Trigger reference" onClick={() => setRefOpen(true)}>
          <span className="cc-btn-text">Trigger reference</span>
        </Button>
      </Tooltip>
      <Button type="primary" icon={<PlusOutlined />} onClick={openNewChangeModal}>
        Open Change Request
      </Button>
    </>
  );

  return (
    <div className="concept cc">
      <header className="cc-header">
        <div className="cc-title-row">
          <h1 className="cc-title">Change Control</h1>
          {openCount > 0 ? (
            <span className="c-tag c-tag-dot c-tag-warn">{openCount} open</span>
          ) : (
            <span className="c-tag c-tag-dot c-tag-ok">Nothing open</span>
          )}
          <div className="cc-actions">{actions}</div>
        </div>
        <p className="cc-meta">
          Change Control &amp; Communication Log · {draft.length} {draft.length === 1 ? 'change' : 'changes'} in this project
        </p>
        <p className="cc-desc">
          <b>No silent corrections.</b> Artwork, formula, label, claim, supplier, process and market changes must be
          recorded here with a trigger, owner, impact assessment, approval, communication and closure evidence.
        </p>
      </header>

      {/* Round 5 question 11(4): references in the registers that match no change record are flagged, never removed. */}
      {legacyRefs.length > 0 && (
        <Notice tone="warn" title={`${legacyRefs.length} register ${legacyRefs.length === 1 ? 'reference matches' : 'references match'} no change record`}>
          {legacyRefs.slice(0, 6).map((r) => `${r.registerTitle}, row ${r.row + 1}: "${r.value}"`).join(' · ')}
          {legacyRefs.length > 6 ? ` · and ${legacyRefs.length - 6} more` : ''}. Pick the right change in that register, or raise the change here.
        </Notice>
      )}

      {draft.length === 0 ? (
        // "before the change is made, not after" is OUR wording, not the review team's — whether a record may
        // also be opened afterwards, to log a change that already happened, is [ASSUMPTION: R5-Q66].
        <div className="c-card cc-empty">
          <div className="cc-empty-title">No change requests yet</div>
          <p className="cc-empty-text">
            Open one whenever an artwork, formula, label, claim, supplier, process or market change is proposed —
            before the change is made, not after.
          </p>
          <Button type="primary" icon={<PlusOutlined />} onClick={openNewChangeModal}>
            Open Change Request
          </Button>
        </div>
      ) : (
        <RecordList<ChangeRecord>
          dirty={dirty}
          onSave={saveChanges}
          title="Change Control & Communication Log"
          description="Open a change to see every field. Status, impact classification and the final disposition are edited in place and saved together."
          count={`${openCount} open of ${draft.length}`}
          rows={draft}
          rowKey={(c) => c.changeId}
          rowTitle={(c) => (
            <>
              <span className="cc-id">{c.changeId}</span> {c.trigger || <span className="rt-muted">No trigger recorded</span>}
            </>
          )}
          rowSubtitle={(c) => {
            const issue = gate11Issue(c);
            return (
              <>
                {[c.productSku, c.affectedArea].filter(Boolean).join(' · ') || '—'}
                {issue && <span className="cc-issue"> · {issue}</span>}
              </>
            );
          }}
          rowFlag={(c) => gate11Issue(c) !== undefined}
          inline={[
            { label: 'Risk', width: 96, render: (c) => <StatusBadge value={c.riskLevel} /> },
            {
              label: 'Markets',
              width: 160,
              render: (c) =>
                (c.markets ?? []).length > 0 ? (
                  <span title={c.markets!.join(', ')}>{c.markets!.join(', ')}</span>
                ) : (
                  <span className="rt-muted">All markets</span>
                ),
            },
            { label: 'Status', width: 248, render: (c) => statusSelect(c) },
          ]}
          drawerTitle={(c) => (
            <>
              {c.changeId} · {c.trigger || 'No trigger recorded'}
            </>
          )}
          drawer={(c) => {
            const t = getChangeTrigger(c.triggerId);
            const frozen = isFrozen(c);
            return (
              <>
                {frozen && (
                  <Notice
                    tone="info"
                    title={`Closed (${c.status}) — this record is frozen`}
                    action={
                      <Button size="small" onClick={() => setReopening(c)}>
                        Reopen
                      </Button>
                    }
                  >
                    A closed change cannot be edited. Reopening needs a reason and is recorded.
                  </Notice>
                )}
                <div className="cc-summary">
                  <span className="c-tag">{c.status}</span>
                  <span className="c-tag">Risk {c.riskLevel}</span>
                  <span className={`c-tag ${triageSummary(c).tone}`}>{triageSummary(c).label}</span>
                  {triageSummary(c).holds && <span className="cc-summary-note">{triageSummary(c).holds}</span>}
                </div>
                <DrawerTabs
                  activeKey={detailTab}
                  onChange={setDetailTab}
                  tabs={[
                    {
                      key: 'details',
                      label: 'Details',
                      children: (
                        <>
                          <section>
                            <div className="rt-sec-title">Change</div>
                  <dl className="rt-dl">
                    {dlRow('Trigger / event', c.trigger)}
                    {dlRow('Also known as', (c.aliasIds ?? []).length > 0 ? c.aliasIds!.join(', ') : undefined)}
                    {dlRow('Affected gates / phases', t ? <AffectedGates gates={t.gates} /> : undefined)}
                                        {dlRow('Product / SKU', c.productSku)}
                    {dlRow('Affected area', c.affectedArea)}
                    {dlRow('Old version', c.oldVersion)}
                    {dlRow('Owner', c.owner)}
                    {dlRow('Due', c.dueDate)}
                    {dlRow('Closed', c.closedDate)}
                  </dl>

                          </section>
                          <section>
                            <div className="rt-sec-title">Action &amp; communication</div>
                  <dl className="rt-dl">
                    {dlRow('Required action', c.requiredAction)}
                    {dlRow('Required sign-offs', c.requiredSignOffs)}
                    {dlRow('Evidence link', c.evidenceLink)}
                    {dlRow('Comms', c.communicationRequired ? 'Required' : undefined)}
                    {dlRow('Sales / Marketing message', c.salesMarketingMessage)}
                    {dlRow('Notes', c.notes)}
                  </dl>
                          </section>
                        </>
                      ),
                    },
                    {
                      key: 'impact',
                      label: 'Assessment',
                      dot: triageSummary(c).pending,
                      children: (
                        <>
                          <ChangeTriageBlock change={c} />
                          <ChangeAreaAssessmentsBlock change={c} />
                        </>
                      ),
                    },
                    {
                      key: 'request',
                      label: 'Request',
                      // The base data the Formulation Change Register (and any other view) reads from this record.
                      children: (
                        <div className="rt-grid">
                          <RecordField label="Requested by">
                            <UserSelect disabled={frozen} value={c.requestedBy} onChange={(v?: string) => patchChange(c.changeId, { requestedBy: v ?? '' })} />
                          </RecordField>
                          <RecordField label="Old version">
                            <Input disabled={frozen} value={c.oldVersion} onChange={(e) => patchChange(c.changeId, { oldVersion: e.target.value })} />
                          </RecordField>
                          <RecordField label="New version">
                            <Input disabled={frozen} value={c.newVersion} onChange={(e) => patchChange(c.changeId, { newVersion: e.target.value })} />
                          </RecordField>
                          <RecordField label="Date requested">
                            <DatePicker
                              style={{ width: '100%' }}
                              disabled={frozen}
                              value={c.dateRequested ? dayjs(c.dateRequested) : null}
                              onChange={(d) => patchChange(c.changeId, { dateRequested: d ? d.format('YYYY-MM-DD') : undefined })}
                            />
                          </RecordField>
                          <RecordField label="Explanation — exactly what changed" wide>
                            <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} disabled={frozen} value={c.explanation} onChange={(e) => patchChange(c.changeId, { explanation: e.target.value })} />
                          </RecordField>
                          <RecordField label="Reasons" wide>
                            <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} disabled={frozen} value={c.reasons} onChange={(e) => patchChange(c.changeId, { reasons: e.target.value })} />
                          </RecordField>
                          <RecordField label="Changed by">
                            <UserSelect disabled={frozen} value={c.changedBy} onChange={(v?: string) => patchChange(c.changeId, { changedBy: v ?? '' })} />
                          </RecordField>
                          <RecordField label="Communicated to market?">
                            <Select
                              style={{ width: '100%' }}
                              allowClear
                              disabled={frozen}
                              value={c.communicatedToMarket || undefined}
                              options={CHANGE_COMMUNICATED_OPTIONS.map((o) => ({ value: o, label: o }))}
                              onChange={(v?: string) => patchChange(c.changeId, { communicatedToMarket: v ?? '' })}
                            />
                          </RecordField>
                          <RecordField label="Communication acknowledged by" wide>
                            <UserSelect disabled={frozen} value={c.communicationAcknowledgedBy} onChange={(v?: string) => patchChange(c.changeId, { communicationAcknowledgedBy: v ?? '' })} />
                          </RecordField>
                        </div>
                      ),
                    },
                    {
                      key: 'scope',
                      label: 'Status & scope',
                      children: (
                        <>
                  <div className="rt-grid">
                    <RecordField label="Status">{statusSelect(c)}</RecordField>
                    {/* Editable after creation (2026-10-04): a change's risk can
                        grow as its impact becomes known, and High/Critical is what
                        makes an open change hard-block Gate 11. */}
                    <RecordField label="Risk level">
                      <Select
                        style={{ width: '100%' }}
                        disabled={frozen}
                        value={c.riskLevel}
                        options={RISK_LEVELS.map((r) => ({ value: r, label: r }))}
                        onChange={(v: RiskLevel) => patchChange(c.changeId, { riskLevel: v })}
                      />
                    </RecordField>
                    {/* Editable here, not only on the create form: rule E3(b) makes
                        an UNCLASSIFIED open change block Gate 11, and every change
                        that existed before this field did is unclassified. Without
                        an editor those would block the gate with nowhere to fix
                        them — an unsatisfiable blocker, the exact failure the
                        readiness sweeps exist to catch. */}
                    <RecordField label="Markets" wide>
                      <Select
                        mode="multiple"
                        allowClear
                        style={{ width: '100%' }}
                        placeholder="All markets"
                        disabled={frozen}
                        value={c.markets ?? []}
                        options={marketOptionsFor(c)}
                        onChange={(v: string[]) => patchChange(c.changeId, { markets: v })}
                      />
                    </RecordField>
                    <RecordField label="Impact (Gate 11)" wide>
                      <Select
                        mode="multiple"
                        allowClear
                        style={{ width: '100%' }}
                        placeholder="Not classified — blocks Gate 11"
                        disabled={frozen}
                        status={(c.impactAreas ?? []).length === 0 ? 'warning' : undefined}
                        value={c.impactAreas ?? []}
                        options={CHANGE_IMPACT_AREAS.map((a) => ({ value: a, label: a }))}
                        onChange={(v: string[]) => patchChange(c.changeId, { impactAreas: v })}
                      />
                    </RecordField>
                  </div>

                        </>
                      ),
                    },
                    {
                      key: 'closure',
                      label: 'Closure',
                      // Round 4 question 34(c): the seven parts of a final disposition.
                      children: <ChangeDispositionBlock change={c} readOnly={frozen} onChange={(p) => patchChange(c.changeId, p)} />,
                    },
                  ]}
                />
              </>
            );
          }}
          footer={
            dirty && (
              <div className="rt-savebar">
                <SaveBar dirty={dirty} onSave={saveChanges} onDiscard={discard} disabled={!!closeBlocker} disabledReason={closeBlocker} />
              </div>
            )
          }
        />
      )}

      <Modal
        open={!!reopening}
        title={`Reopen ${reopening?.changeId ?? ''}`}
        okText="Reopen"
        okButtonProps={{ disabled: !reopenReason.trim() }}
        confirmLoading={reopenBusy}
        onOk={confirmReopen}
        onCancel={() => {
          setReopening(null);
          setReopenReason('');
        }}
      >
        <p style={{ marginTop: 0 }}>
          The change goes back to <b>Under Review</b>. Everything already recorded stays, and the reason is kept with the
          reopening. If that would make a gate that has passed stop counting as passed, it is refused — Backtrack first.
        </p>
        <Input.TextArea
          rows={3}
          placeholder="Why is this change being reopened?"
          value={reopenReason}
          onChange={(e) => setReopenReason(e.target.value)}
        />
      </Modal>

      <FormDrawer
        title="Change trigger reference — affected gates & phases"
        open={refOpen}
        onCancel={() => setRefOpen(false)}
        footer={null}
        width={720}
      >
        <TriggerReference categories={TRIGGER_CATEGORIES} />
      </FormDrawer>

      <section className="c-card cc-raci">
        <div className="cc-raci-head">
          <h2 className="cc-raci-title">RACI / Closure control</h2>
          <p className="cc-raci-sub">Who must contribute before a change can close</p>
        </div>
        <ul className="cc-raci-list">
          {CHANGE_RACI.map((r) => (
            <li key={r.functionName}>
              <div className="cc-raci-name">
                <b>{r.functionName}</b>
                <span className={`c-tag${RACI_ROLE_TONE[r.role]}`}>{r.role}</span>
              </div>
              <div className="cc-raci-text">{r.contribution}</div>
              <div className="cc-raci-ev">
                <SheetRefs value={r.linkedEvidence} projectId={projectId} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <FormDrawer
        title="Open Change Request"
        open={open}
        onOk={onCreate}
        confirmLoading={creating}
        onCancel={() => setOpen(false)}
        okText="Open change"
        width={680}
      >
        <Form form={form} layout="vertical" initialValues={{ riskLevel: 'Medium', communicationRequired: true }}>
          <Form.Item name="triggerId" label="Trigger / event" rules={[{ required: true }]}>
            {/* SW-30 (2026-10-13): triggers the chosen project is not yet allowed to open are
                shown but disabled, with the gate that has to pass first. The comparison is
                with the highest gate PASSED, not the current one — a project that has
                passed Gate 5/8 reopening a Gate 5/8 trigger is exactly what Change
                Control is for, while data at the gate still open is edited directly. */}
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Select the change trigger"
              options={triggerSelectOptions}
              onChange={(id) => {
                const t = getChangeTrigger(id);
                if (t) {
                  form.setFieldsValue({
                    requiredAction: t.action,
                    requiredSignOffs: t.signOffs,
                  });
                }
              }}
            />
          </Form.Item>
          {selectedTrigger && (
            <Form.Item label="Affected gates & phases">
              <AffectedGates gates={selectedTrigger.gates} />
            </Form.Item>
          )}
          <div className="cc-form-grid">
            {/* The project and its product are this page's own: shown, never picked. */}
            <Form.Item name="projectId" hidden>
              <Input />
            </Form.Item>
            <Form.Item name="productSku" label="Product / SKU" rules={[{ required: true }]}>
              <Input disabled />
            </Form.Item>
            <Form.Item name="affectedArea" label="Affected area" rules={[{ required: true }]}>
              <Select options={CHANGE_AFFECTED_AREAS.map((a) => ({ value: a, label: a }))} />
            </Form.Item>
            <Form.Item
              name="markets"
              label="Markets"
              extra="Which of this project's markets the change concerns. Leave empty if it is not market-specific — it then applies to every market."
            >
              <Select
                mode="multiple"
                allowClear
                placeholder="All markets"
                options={(triggerProject?.identity.markets ?? []).map((m) => ({ value: m, label: m }))}
              />
            </Form.Item>
            {/* Rule E3(b): Gate 11 "must evaluate the impact classification … of each
                open Change Control". Required, because an unclassified open change
                blocks Gate 11 — there is nothing for the gate to evaluate. */}
            <Form.Item
              name="impactAreas"
              label="Impact classification"
              rules={[{ required: true, message: 'Classify the impact — Gate 11 evaluates this' }]}
              extra="What this change affects. Launch-impacting or high risk hard-blocks Gate 11; administrative only may pass with conditions."
            >
              <Select
                mode="multiple"
                allowClear
                options={CHANGE_IMPACT_AREAS.map((a) => ({ value: a, label: a }))}
              />
            </Form.Item>
            <Form.Item name="riskLevel" label="Risk level" rules={[{ required: true }]}>
              {/* The shared four-level scale (Round 4 question 34(a): Critical is a
                  separate level above High). */}
              <Select options={RISK_LEVELS.map((r) => ({ value: r, label: r }))} />
            </Form.Item>
            <Form.Item name="oldVersion" label="Old version">
              <AutoComplete
                options={oldVersionOptions}
                placeholder={
                  selectedProjectId
                    ? oldVersionOptions.length > 0
                      ? 'Pick a version, or type another'
                      : 'No versions recorded on this project yet — type one'
                    : 'Select a project first, or type a version'
                }
                filterOption={(input, option) => {
                  // Options are grouped, so antd passes group nodes here too — a group
                  // has no `value` and must not be filtered out by it, or its whole
                  // section disappears while typing.
                  const value = (option as { value?: string } | undefined)?.value;
                  return value === undefined || value.toLowerCase().includes(input.toLowerCase());
                }}
              />
            </Form.Item>
            <Form.Item name="dueDate" label="Due date">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="owner" label="Owner" rules={[{ required: true }]}>
              <UserSelect onChange={() => {}} />
            </Form.Item>
            <Form.Item name="requiredSignOffs" label="Required sign-offs">
              <Input placeholder="e.g. R&I, Safety, Regulatory" />
            </Form.Item>
            <Form.Item name="evidenceLink" label="Evidence link">
              <Input placeholder="link / folder" />
            </Form.Item>
          </div>
          <Form.Item name="requiredAction" label="Required action / impact assessment">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            name="communicationRequired"
            label="Sales / Marketing communication required"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          {commRequired && (
            <Form.Item name="salesMarketingMessage" label="Sales / Marketing message" preserve={false}>
              <Input.TextArea rows={2} placeholder="Customer-facing explanation if applicable" />
            </Form.Item>
          )}
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </FormDrawer>
    </div>
  );
}
