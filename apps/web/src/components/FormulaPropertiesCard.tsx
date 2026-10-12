import { Input, Select } from 'antd';
import { ExclamationCircleOutlined, LockOutlined } from '@ant-design/icons';
import type { ProjectData } from '@mbc360/shared/types';
import { MICROBIOLOGICAL_SUSCEPTIBILITY_OPTIONS } from '@mbc360/shared/config/opportunity';
import { isGateRefLocked, isGateSignedStanding } from '@mbc360/shared/utils/gateProgress';
import { PHASE_CONFIGS, PRODUCT_FORM_UNDER_EVALUATION } from '@mbc360/shared/config/phases';
import { useAppStore } from '../store/useAppStore';
import { useDraft } from '../hooks/useDraft';
import SaveBar from './SaveBar';
import ChoiceSelect from './ChoiceSelect';
import '../styles/concept.css';
import './DynamicTable.css';
import '../pages/BomCosting.css';

// Does the composition contain water? Derivable, and only that much: it is a
// SUGGESTION, never the answer. A3's condition is "water-containing,
// water-available, multi-use or otherwise microbiologically susceptible" — an
// anhydrous balm in a jar opened with wet hands is susceptible too, and no
// composition data says so. The person decides; this only stops them starting
// from a blank box on the obvious case.
// The Gate 2 Product Type options a form can be confirmed as — every one except
// "under evaluation" itself.
const CONFIRMABLE_FORMS = (
  PHASE_CONFIGS[1].checklistSections.find((c) => c.key === 'productType')?.options ?? []
).filter((o) => o !== PRODUCT_FORM_UNDER_EVALUATION);

const WATER_INCI = /^(aqua|water|aqua \(water\)|water \(aqua\))$/i;

export default function FormulaPropertiesCard({ project }: { project: ProjectData }) {
  const setFormulaProperties = useAppStore((s) => s.setFormulaProperties);
  // Read-only once Gate 05 has passed or while a signature stands on it (SW-24).
  const locked = isGateRefLocked(project, '05') || isGateSignedStanding(project, 'SG05');
  const { draft, dirty, update, markSaved, discard } = useDraft(project.formulaProperties);

  const formOpen = (project.checklists['productType'] ?? []).some(
    (i) => i.selected && i.label === PRODUCT_FORM_UNDER_EVALUATION,
  );
  const hasWater = project.bom.some((l) => WATER_INCI.test((l.inciName ?? '').trim()));
  const value = draft.microSusceptibility ?? '';
  // A3 allows the four N/A values only "with documented rationale". For a
  // Susceptible product the rationale IS the preservative strategy, which is
  // what the Gate 5 item asks for — so it is required either way.
  const rationaleMissing = !!value && !draft.microRationale?.trim();
  const contradictsBom = hasWater && !!value && value !== 'Susceptible';

  return (
    <div className="c-card bom-card">
      <div className="bom-card-head">
        <div style={{ minWidth: 0 }}>
          <div className="bom-card-title">Formula Properties</div>
          <div className="bom-hint" style={{ marginTop: 4, fontSize: 13 }}>
            Read by Gate 05 (preservative strategy) and Gate 09 (preservative efficacy). Both become mandatory only
            when the formula is recorded as susceptible.
          </div>
        </div>
        {hasWater && <span className="c-tag c-tag-dot">Composition contains water</span>}
      </div>

      <div className="bom-card-body">
        {locked && (
          <div className="rt-lock">
            <LockOutlined />
            <span>Gate 05 has passed or is signed — formula properties are read-only. Withdraw the signature, or Backtrack, to change them.</span>
          </div>
        )}

        <div className="bom-form">
          <div className="bom-field bom-span-all">
            <span className="bom-label">Microbiological susceptibility</span>
            {locked ? (
              <span className="rt-static">{value || '—'}</span>
            ) : (
              <ChoiceSelect
                allowClear
                status={contradictsBom ? 'warning' : undefined}
                placeholder={hasWater ? 'Suggested: Susceptible' : 'Classify the formula'}
                value={value}
                options={[...MICROBIOLOGICAL_SUSCEPTIBILITY_OPTIONS]}
                onChange={(v) => update((prev) => ({ ...prev, microSusceptibility: v ?? '' }))}
              />
            )}
          </div>

          <label className="bom-field bom-span-all">
            <span className="bom-label">
              Rationale {value === 'Susceptible' ? '(preservative strategy)' : '(why this product does not need preserving)'}
            </span>
            {locked ? (
              <span className="rt-static">{draft.microRationale || '—'}</span>
            ) : (
              <Input.TextArea
                autoSize={{ minRows: 2, maxRows: 5 }}
                value={draft.microRationale}
                onChange={(e) => update((prev) => ({ ...prev, microRationale: e.target.value }))}
              />
            )}
          </label>
          {formOpen && (
            // Round 4 question 23(a): the Gate 2 brief left the form open, so it
            // is confirmed here — the Gate 2 checklist is locked by now.
            <label className="bom-field">
              <span className="bom-label">Confirmed product form (left open at Gate 2)</span>
              {locked ? (
                <span className="rt-static">{draft.confirmedProductForm || '—'}</span>
              ) : (
                <Select
                  style={{ width: '100%' }}
                  allowClear
                  showSearch
                  placeholder="Confirm the product form"
                  value={draft.confirmedProductForm || undefined}
                  options={CONFIRMABLE_FORMS.map((o) => ({ value: o, label: o }))}
                  onChange={(v?: string) => update((prev) => ({ ...prev, confirmedProductForm: v ?? '' }))}
                />
              )}
            </label>
          )}
        </div>

        {contradictsBom && (
          <div className="bom-total-warn">
            <ExclamationCircleOutlined />
            <span>
              The composition contains water but the formula is recorded as "{value}" — make sure the rationale
              explains why.
            </span>
          </div>
        )}

        {/* Said on screen, not only in the disabled button's tooltip: a Save that
            is greyed out with no reason beside it reads as a broken button. */}
        {!locked && dirty && rationaleMissing && (
          <div className="bom-total-warn">
            <ExclamationCircleOutlined />
            <span>A documented rationale is required before this can be saved (SME Round 3, A3).</span>
          </div>
        )}
        {!locked && dirty && (
          <SaveBar
            dirty={dirty}
            onSave={() => {
              if (rationaleMissing) return;
              setFormulaProperties(project.identity.id, draft);
              markSaved();
            }}
            onDiscard={discard}
            disabled={rationaleMissing}
            disabledReason={rationaleMissing ? 'A documented rationale is required (SME Round 3, A3)' : undefined}
          />
        )}
      </div>
    </div>
  );
}
