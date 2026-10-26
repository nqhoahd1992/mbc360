import { Alert, Empty } from 'antd';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { findingsReplacedBy } from '@mbc360/shared/utils/safetyFindings';
import { syncSafetyMatrix } from '@mbc360/shared/utils/safetyMatrixSync';
import { criticalSafetyFindings, formulationSafetyFinalSignOff, formulationSafetyMatrix, formulationSafetyProfile } from '@mbc360/shared/config/registers';
import { composeReviewOwner } from '@mbc360/shared/config/reviewers';
import { isGateRefLocked, uncoveredFormulaLines } from '@mbc360/shared/utils/gateProgress';
import { registerClosureGateIds, registerReviewSpec } from '@mbc360/shared/utils/registerClosures';
import type { RegisterConfig } from '@mbc360/shared/config/registers';
import RegisterClosurePanel from '../components/RegisterClosurePanel';
import ClosingLayout from '../components/ClosingLayout';
import DynamicTable from '../components/DynamicTable';
import SafetyDecisionCell from '../components/SafetyDecisionCell';
import { CompositePageHeader } from '../components/RegisterPageHeader';

export default function FormulationSafety() {
  const { projectId } = useParams();
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const setRegisterRowsBulk = useAppStore((s) => s.setRegisterRowsBulk);

  if (!project) return <Empty description="Project not found" />;
  const id = project.identity.id;
  // All three blocks share the Formulation_Safety sheet's review owner.
  const reviewOwnerText = formulationSafetyProfile.reviewOwner
    ? composeReviewOwner(formulationSafetyProfile.reviewOwner, project.identity.reviewers)
    : undefined;
  // Gate-level edit lock — Formulation Safety is used at Gate 07 and reused at
  // Gate 10, so it stays editable until BOTH have passed.
  const locked = isGateRefLocked(project, formulationSafetyProfile.gate);
  const matrixRows = syncSafetyMatrix(project.bom, project.registers[formulationSafetyMatrix.key] ?? []);
  // Round 4 question 23(b) — the same function the Gate 7 readiness item calls, so
  // the screen and the blocker can never disagree about which lines are uncovered.
  const uncovered = uncoveredFormulaLines(project);
  // Each of these registers is closed once per gate that needs it (SW-36). The page used to carry no closing block at all, so a gate
  // that waited for a closure had nowhere on screen to sign it.
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

  return (
    <div className="concept">
      <CompositePageHeader
        project={project}
        title="Full Formulation Safety Evidence"
        description={<>The product-level safety control sheet — pulls ingredient, exposure and use-context evidence into one final sign-off.</>}
        note={{
          title: "Primary safety evidence tab",
          text: "This is the main evidence used to close Gate 07 (Maternal & Baby-Contact Safety), and is reused again at Gate 10 (PIF-03 Safety assessment).",
        }}
        reviewOwnerText={reviewOwnerText}
      />

      <ClosingLayout>

      <DynamicTable
        config={formulationSafetyProfile}
        rows={project.registers[formulationSafetyProfile.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, formulationSafetyProfile.key, rows)}
        readOnly={locked}
      />
      {closing(formulationSafetyProfile)}

      {/* Round 4 question 23(b), 2026-08-29. The Gate 7 blocker says "every formula
          line covered by a safety assessment"; on its own that sends the reader
          back here to work out WHICH line, across a matrix and a BOM that are two
          different screens. Same list, same function, named per ingredient. */}
      {uncovered.length > 0 && !locked && (
        <Alert
          type="warning"
          showIcon
          title={`${uncovered.length} formula ${uncovered.length === 1 ? 'line has' : 'lines have'} no safety coverage recorded`}
          description={
            <>
              Gate 07 requires every ingredient in the final formula to carry a safety disposition.
              A low-risk excipient does not need its own monograph — a group or class assessment, an
              existing approved assessment or an accepted regulatory conclusion all count, as long as
              the row names which one.
              <ul style={{ margin: '8px 0 0', paddingInlineStart: 20 }}>
                {uncovered.map((u) => (
                  <li key={u.label}>
                    <strong>{u.label}</strong> — {u.reason}
                  </li>
                ))}
              </ul>
            </>
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
      />
      {closing(formulationSafetyMatrix)}

      {/* Rule E1. Sits ABOVE the Final Safety Sign-off deliberately: E1 asks for a
          distinct control rather than reliance on the sign-off, and a finding has to
          be raised and closed before the sign-off means anything. Its own gate ('07',
          not '07/10' like its siblings) so the lock follows Gate 7 alone. */}
      <DynamicTable
        config={criticalSafetyFindings}
        rows={project.registers[criticalSafetyFindings.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, criticalSafetyFindings.key, rows)}
        readOnly={isGateRefLocked(project, criticalSafetyFindings.gate)}
        // What a reviewer scans a list of findings by: how bad, where it stands, who is acting on it. (Left to itself the table
        // took the first four short controls, which dropped Status.)
        tableColumns={['severity', 'findingStatus', 'linkedNextActionId', 'owner']}
        // "Replaces" is not entered: it lists the findings that name this one as their replacement.
        renderCell={(column, row, _index, api) =>
          column.key === 'replaces' ? findingsReplacedBy(api.draft, row).join(', ') || <span className="rt-muted">—</span> : undefined
        }
      />
      {closing(criticalSafetyFindings)}

      <DynamicTable
        config={formulationSafetyFinalSignOff}
        rows={project.registers[formulationSafetyFinalSignOff.key] ?? []}
        onSave={(rows) => setRegisterRowsBulk(id, formulationSafetyFinalSignOff.key, rows)}
        readOnly={locked}
      />
      {closing(formulationSafetyFinalSignOff)}
      </ClosingLayout>
    </div>
  );
}
