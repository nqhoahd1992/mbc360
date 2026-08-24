import { Alert, Card, Input, Select, Space, Tag } from 'antd';
import type { ProjectData } from '@mbc360/shared/types';
import { MICROBIOLOGICAL_SUSCEPTIBILITY_OPTIONS } from '@mbc360/shared/config/opportunity';
import { isGateRefLocked } from '@mbc360/shared/utils/gateProgress';
import { useAppStore } from '../store/useAppStore';
import { useDraft } from '../hooks/useDraft';
import SaveBar from './SaveBar';
import { TEXT } from '../theme/tokens';

// Does the composition contain water? Derivable, and only that much: it is a
// SUGGESTION, never the answer. A3's condition is "water-containing,
// water-available, multi-use or otherwise microbiologically susceptible" — an
// anhydrous balm in a jar opened with wet hands is susceptible too, and no
// composition data says so. The person decides; this only stops them starting
// from a blank box on the obvious case.
const WATER_INCI = /^(aqua|water|aqua \(water\)|water \(aqua\))$/i;

export default function FormulaPropertiesCard({ project }: { project: ProjectData }) {
  const setFormulaProperties = useAppStore((s) => s.setFormulaProperties);
  const locked = isGateRefLocked(project, '05');
  const { draft, dirty, update, markSaved, discard } = useDraft(project.formulaProperties);

  const hasWater = project.bom.some((l) => WATER_INCI.test((l.inciName ?? '').trim()));
  const value = draft.microSusceptibility ?? '';
  // A3 allows the four N/A values only "with documented rationale". For a
  // Susceptible product the rationale IS the preservative strategy, which is
  // what the Gate 5 item asks for — so it is required either way.
  const rationaleMissing = !!value && !draft.microRationale?.trim();
  const contradictsBom = hasWater && !!value && value !== 'Susceptible';

  return (
    <Card
      size="small"
      title="Formula Properties"
      extra={
        hasWater ? (
          <Tag color="blue">Composition contains water</Tag>
        ) : (
          <Tag>No water line in the composition</Tag>
        )
      }
    >
      <div style={{ color: TEXT.secondary, fontSize: 12, marginBottom: 12 }}>
        Read by Gate 05 (preservative strategy) and Gate 09 (preservative efficacy). Both become mandatory only when the
        formula is recorded as susceptible.
      </div>

      {locked && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="Gate 05 has passed — formula properties are read-only. Use Backtrack to reopen."
        />
      )}

      <Space direction="vertical" style={{ width: '100%' }} size={8}>
        <div>
          <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>Microbiological susceptibility</div>
          {locked ? (
            <span style={{ color: '#666' }}>{value || '—'}</span>
          ) : (
            <Select
              size="small"
              style={{ width: 280 }}
              allowClear
              status={contradictsBom ? 'warning' : undefined}
              placeholder={hasWater ? 'Suggested: Susceptible' : 'Classify the formula'}
              value={value || undefined}
              options={MICROBIOLOGICAL_SUSCEPTIBILITY_OPTIONS.map((o) => ({ value: o, label: o }))}
              onChange={(v?: string) => update((prev) => ({ ...prev, microSusceptibility: v ?? '' }))}
            />
          )}
        </div>

        {contradictsBom && (
          <Alert
            type="warning"
            showIcon
            message={`The composition contains water but the formula is recorded as "${value}" — make sure the rationale explains why.`}
          />
        )}

        <div>
          <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>
            Rationale {value === 'Susceptible' ? '(preservative strategy)' : '(why this product does not need preserving)'}
          </div>
          {locked ? (
            <span style={{ color: '#666' }}>{draft.microRationale || '—'}</span>
          ) : (
            <Input.TextArea
              size="small"
              autoSize={{ minRows: 2, maxRows: 5 }}
              value={draft.microRationale}
              onChange={(e) => update((prev) => ({ ...prev, microRationale: e.target.value }))}
            />
          )}
        </div>
      </Space>

      {!locked && (
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
    </Card>
  );
}
