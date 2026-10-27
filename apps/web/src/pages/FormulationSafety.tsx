import { useEffect, useState } from 'react';
import { Alert, Empty } from 'antd';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { findingsReplacedBy } from '@mbc360/shared/utils/safetyFindings';
import { syncSafetyMatrix } from '@mbc360/shared/utils/safetyMatrixSync';
import { criticalSafetyFindings, formulationSafetyFinalSignOff, formulationSafetyMatrix, formulationSafetyProfile } from '@mbc360/shared/config/registers';
import { composeReviewOwner } from '@mbc360/shared/config/reviewers';
import { isGateRefLocked, uncoveredFormulaLines } from '@mbc360/shared/utils/gateProgress';
import { closureStateAt, registerClosureGateIds, registerClosureRoles, registerReviewSpec } from '@mbc360/shared/utils/registerClosures';
import { isRegisterClosed } from '@mbc360/shared/types';
import type { RegisterConfig } from '@mbc360/shared/config/registers';
import RegisterClosurePanel from '../components/RegisterClosurePanel';
import ClosingLayout from '../components/ClosingLayout';
import { scrollToRegister } from '../components/closingAside';
import DynamicTable from '../components/DynamicTable';
import SafetyDecisionCell from '../components/SafetyDecisionCell';
import { CompositePageHeader } from '../components/RegisterPageHeader';
import './FormulationSafety.css';

// Four tables stacked, as the workbook's sheet has them, with a strip of chips that shows where each one is, how far along, and whether it
// is signed — so nobody has to scroll or open a block to learn the state. Every closing block sits in the sidebar.
export default function FormulationSafety() {
  const { projectId } = useParams();
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const setRegisterRowsBulk = useAppStore((s) => s.setRegisterRowsBulk);
  const [current, setCurrent] = useState<string>(formulationSafetyProfile.key);

  // The chip of the table nearest the top of the screen is the one marked.
  useEffect(() => {
    const keys = [formulationSafetyProfile.key, formulationSafetyMatrix.key, criticalSafetyFindings.key, formulationSafetyFinalSignOff.key];
    const els = keys.map((k) => document.getElementById(`register-${k}`)).filter((e): e is HTMLElement => !!e);
    if (els.length === 0 || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setCurrent(top.target.id.replace('register-', ''));
      },
      { rootMargin: '-120px 0px -60% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [projectId]);

  if (!project) return <Empty description="Project not found" />;
  const id = project.identity.id;
  // All four blocks share the Formulation_Safety sheet's review owner.
  const reviewOwnerText = formulationSafetyProfile.reviewOwner
    ? composeReviewOwner(formulationSafetyProfile.reviewOwner, project.identity.reviewers)
    : undefined;
  // Gate-level edit lock — Formulation Safety is used at Gate 07 and reused at Gate 10, so it stays editable until BOTH have passed.
  const locked = isGateRefLocked(project, formulationSafetyProfile.gate);
  const matrixRows = syncSafetyMatrix(project.bom, project.registers[formulationSafetyMatrix.key] ?? []);
  // Round 4 question 23(b) — the same function the Gate 7 readiness item calls, so the screen and the blocker can never disagree.
  const uncovered = uncoveredFormulaLines(project);

  const rowsOf = (config: RegisterConfig) => project.registers[config.key] ?? [];
  const doneOf = (config: RegisterConfig) => rowsOf(config).filter((r) => ['Completed', 'Complete'].includes(String(r.status ?? ''))).length;
  const openFindings = rowsOf(criticalSafetyFindings).filter((r) => !['Closed', 'Superseded'].includes(String(r.findingStatus ?? ''))).length;
  const formulaLines = project.bom.filter((l) => String(l.rmCode ?? '').trim() !== '' || String(l.inciName ?? '').trim() !== '').length;

  // Each register is closed once per gate that needs it (SW-36): "Signed" means every one of those closures stands.
  const signedState = (config: RegisterConfig): 'signed' | 'unsigned' | undefined => {
    const gates = registerClosureGateIds(config);
    if (gates.length === 0) return undefined;
    const roles = registerClosureRoles(config);
    return gates.every((g) => isRegisterClosed(closureStateAt(project, config.key, g), roles)) ? 'signed' : 'unsigned';
  };
  const closing = (config: RegisterConfig) => {
    const spec = registerReviewSpec(config);
    if (registerClosureGateIds(config).length === 0 || !spec) return null;
    return (
      <RegisterClosurePanel
        projectId={id}
        registerKey={config.key}
        spec={spec}
        reviewers={project.identity.reviewers}
        closures={project.registerClosures}
      />
    );
  };

  const chips: { config: RegisterConfig; label: string; progress: string; warn?: string }[] = [
    { config: formulationSafetyProfile, label: 'Product Safety Profile', progress: `${doneOf(formulationSafetyProfile)}/${rowsOf(formulationSafetyProfile).length}` },
    {
      config: formulationSafetyMatrix,
      label: 'Safety Matrix',
      progress: formulaLines > 0 ? `${formulaLines - uncovered.length}/${formulaLines} covered` : 'no formula lines',
      warn: uncovered.length > 0 ? `${uncovered.length} to conclude` : undefined,
    },
    { config: criticalSafetyFindings, label: 'Critical Findings', progress: `${openFindings} open`, warn: openFindings > 0 ? 'open' : undefined },
    { config: formulationSafetyFinalSignOff, label: 'Final Sign-off', progress: `${doneOf(formulationSafetyFinalSignOff)}/${rowsOf(formulationSafetyFinalSignOff).length}` },
  ];

  return (
    <div className="concept fs-page">
      <CompositePageHeader
        project={project}
        title="Full Formulation Safety Evidence"
        description={<>This is the product-level safety control sheet. It pulls ingredient identity from Formula_BOM and records links to every safety proof needed for review, PIF and external answers. It is the main evidence used to close Gate 07 (Maternal &amp; Baby-Contact Safety), reused at Gate 10 (PIF-03 Safety assessment); columns lock at the gate shown on their tag.</>}
        reviewOwnerText={reviewOwnerText}
      />

      <nav className="fs-strip" aria-label="Sections of this page">
        {chips.map(({ config, label, progress, warn }) => {
          const signed = signedState(config);
          return (
            <button
              key={config.key}
              type="button"
              className="fs-chip"
              aria-current={current === config.key ? 'true' : undefined}
              onClick={() => {
                setCurrent(config.key);
                scrollToRegister(config.key);
              }}
            >
              <span className="fs-chip-name">{label}</span>
              <span className="fs-chip-n">{progress}</span>
              {warn && <span className="c-tag c-tag-warn">{warn}</span>}
              {signed && <span className={`c-tag ${signed === 'signed' ? 'c-tag-ok' : ''}`}>{signed === 'signed' ? 'Signed' : 'Not signed'}</span>}
            </button>
          );
        })}
      </nav>

      <ClosingLayout>
        <DynamicTable
          config={formulationSafetyProfile}
          rows={rowsOf(formulationSafetyProfile)}
          onSave={(rows) => setRegisterRowsBulk(id, formulationSafetyProfile.key, rows)}
          readOnly={locked}
          hideGateNote
        />
        {closing(formulationSafetyProfile)}

        {/* Round 4 question 23(b): which lines still lack a conclusion, named per ingredient. The strip chip says how many; this says which. */}
        {uncovered.length > 0 && !locked && (
          <Alert
            type="warning"
            showIcon
            title={`${uncovered.length} formula ${uncovered.length === 1 ? 'line has' : 'lines have'} no safety coverage recorded`}
            description={
              <ul style={{ margin: 0, paddingInlineStart: 20 }}>
                {uncovered.map((u) => (
                  <li key={u.label}>
                    <strong>{u.label}</strong> — {u.reason}
                  </li>
                ))}
              </ul>
            }
          />
        )}
        <DynamicTable
          config={formulationSafetyMatrix}
          // One row per Formula BOM line, as in the workbook: identity and matches come from the BOM, only the assessment is entered.
          rows={matrixRows}
          renderCell={(column, row, _index, api) =>
            column.key === 'safetyDecision' ? (
              <SafetyDecisionCell
                options={column.options ?? []}
                value={String(row.safetyDecision ?? '')}
                readOnly={api.readOnly}
                onChange={(v) => api.patch('safetyDecision', v)}
              />
            ) : undefined
          }
          addBlockedReason="Rows follow the Formula BOM — add the ingredient there and its row appears here"
          removeBlockedReason={(row) => (String(row.line ?? '').trim() !== '' ? 'This row follows a Formula BOM line — remove the ingredient from the BOM to remove it' : undefined)}
          onSave={(rows) => setRegisterRowsBulk(id, formulationSafetyMatrix.key, rows)}
          readOnly={locked}
          hideGateNote
        />
        {closing(formulationSafetyMatrix)}

        {/* Rule E1. Sits before the Final Safety Sign-off deliberately: E1 asks for a distinct control rather than reliance on the sign-off,
            and a finding has to be raised and closed before the sign-off means anything. Its own gate ('07', not '07/10'). */}
        <DynamicTable
          config={criticalSafetyFindings}
          rows={rowsOf(criticalSafetyFindings)}
          onSave={(rows) => setRegisterRowsBulk(id, criticalSafetyFindings.key, rows)}
          readOnly={isGateRefLocked(project, criticalSafetyFindings.gate)}
          // What a reviewer scans a list of findings by: how bad, where it stands, who is acting on it.
          tableColumns={['severity', 'findingStatus', 'linkedNextActionId', 'owner']}
          // "Replaces" is not entered: it lists the findings that name this one as their replacement.
          renderCell={(column, row, _index, api) =>
            column.key === 'replaces' ? findingsReplacedBy(api.draft, row).join(', ') || <span className="rt-muted">—</span> : undefined
          }
          hideGateNote
        />
        {closing(criticalSafetyFindings)}

        <DynamicTable
          config={formulationSafetyFinalSignOff}
          rows={rowsOf(formulationSafetyFinalSignOff)}
          onSave={(rows) => setRegisterRowsBulk(id, formulationSafetyFinalSignOff.key, rows)}
          readOnly={locked}
          hideGateNote
        />
        {closing(formulationSafetyFinalSignOff)}
      </ClosingLayout>
    </div>
  );
}
