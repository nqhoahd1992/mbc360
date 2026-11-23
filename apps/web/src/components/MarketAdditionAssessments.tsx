import { useState } from 'react';
import { Button, Checkbox, Input, Select, message } from 'antd';
import type { MarketAdditionAssessment } from '@mbc360/shared/types';
import { GATES } from '@mbc360/shared/config/gates';
import {
  MARKET_ADDITION_INPUT_FUNCTIONS,
  MARKET_DIFFERENCE_LABELS,
  gatesToReopen,
  isMarketAdditionPending,
  marketAdditionProblems,
  marketAdditionScope,
  optionalReviewsFor,
} from '@mbc360/shared/utils/marketAdditions';
import { useAppStore } from '../store/useAppStore';
import Notice from './Notice';
import { RecordField } from './RecordList';
import './AssessmentsCard.css';
import './DynamicTable.css';

// Round 5 question 12: a market added after Gate 1 is a scope amendment to the Gate 1 baseline. Regulatory's impact assessment of it is
// mandatory; until it is complete the market cannot release, and the other markets carry on. A difference reopens the reviews the answer
// names (the ones that stand passed); "no substantive difference" records the equivalence conclusion and reopens nothing. The server writes
// who and when, and refuses anyone who does not hold the Regulatory function on this project. [ASSUMPTION: R6-Q18]
// The red star the other assessment cards use (`as-req`, with the space before it).
const Req = () => (
  <span className="as-req" aria-label="required">
    {' '}*
  </span>
);
const gateName = (id: string) => `Gate ${GATES.find((g) => g.id === id)?.number ?? id}`;

// The blocks of the card body: what was found, who took part and the conclusion, and the act of recording it. Each is separated from the next
// by the card's own divider (`as-block`), like the other assessment cards.
function AssessmentForm({ projectId, entry, revising, onDone }: { projectId: string; entry: MarketAdditionAssessment; revising: boolean; onDone: () => void }) {
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const assess = useAppStore((s) => s.assessMarketAddition);
  const [noDifference, setNoDifference] = useState(entry.noDifference);
  const [differences, setDifferences] = useState<string[]>(entry.differences);
  const [extraGates, setExtraGates] = useState<string[]>(entry.extraGates);
  const [affectedMarkets, setAffectedMarkets] = useState<string[]>(entry.affectedMarkets ?? []);
  const [inputFrom, setInputFrom] = useState<string[]>(entry.inputFrom);
  const [conclusion, setConclusion] = useState(entry.conclusion ?? '');
  const [equivalence, setEquivalence] = useState(entry.equivalenceConclusion ?? '');
  const [evidenceLink, setEvidenceLink] = useState(entry.evidenceLink ?? '');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const draft = {
    differences: noDifference ? [] : differences,
    noDifference,
    extraGates: noDifference ? [] : extraGates,
    affectedMarkets: noDifference ? [] : affectedMarkets,
    inputFrom,
    conclusion,
    equivalenceConclusion: equivalence,
  };
  const otherMarkets = (project?.identity.markets ?? []).filter((m) => m !== entry.market);
  const problems = [...marketAdditionProblems({ ...draft, market: entry.market, projectMarkets: project?.identity.markets }), ...(revising && reason.trim() === '' ? ['the reason for revising'] : [])];
  const scope = marketAdditionScope(draft);
  const reopens = project ? gatesToReopen(project, draft) : [];
  const optional = optionalReviewsFor(draft.differences);

  const save = async () => {
    setBusy(true);
    try {
      const ok = await assess(projectId, entry.market, { ...draft, evidenceLink: evidenceLink.trim(), ...(revising ? { revisionReason: reason.trim() } : {}) });
      if (ok) {
        message.success(`${entry.market}: impact assessment recorded`);
        onDone();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="as-block">
        <div>
          <div className="as-block-title">What Regulatory found</div>
          <div className="as-block-hint">Where the market's requirements differ from the project's other markets. Each kind of difference calls for its own reviews.</div>
        </div>
        <div className="rt-grid">
          <RecordField label="Result (tick this or one difference below)" wide>
            <Checkbox checked={noDifference} onChange={(e) => setNoDifference(e.target.checked)}>
              No substantive difference from the project's other markets
            </Checkbox>
          </RecordField>
          {!noDifference && (
            <RecordField label={<>Where the requirements differ<Req /></>} wide>
              <Checkbox.Group options={MARKET_DIFFERENCE_LABELS} value={differences} onChange={(v) => setDifferences(v as string[])} />
            </RecordField>
          )}
          {!noDifference && (
            <RecordField label="Other markets also affected (a shared issue)" wide>
              <Select
                mode="multiple"
                style={{ width: '100%' }}
                placeholder="Leave empty if only this market is affected"
                value={affectedMarkets}
                options={otherMarkets.map((m) => ({ value: m, label: m }))}
                onChange={setAffectedMarkets}
              />
              <p className="rt-note">
                Only for a finding that reaches a market already in the project. Their Gate 10 and 11 sign-offs are reopened, and a market already on sale gets a linked
                Gate 12 review. The markets not named keep every decision.
              </p>
            </RecordField>
          )}
          {!noDifference && optional.length > 0 && (
            <RecordField label="Further reviews that apply (conditional)" wide>
              <Checkbox.Group
                value={extraGates}
                onChange={(v) => setExtraGates(v as string[])}
                options={optional.map((o) => ({ value: o.gateId, label: `${gateName(o.gateId)} — ${o.conditions.join('; ')}` }))}
              />
            </RecordField>
          )}
        </div>
        {!noDifference && scope.gates.length + scope.marketGates.length > 0 && (
          <Notice tone="info" title="Reviews called for">
            {[...scope.gates.map(gateName), ...scope.marketGates.map((g) => `${gateName(g)} (${entry.market} only)`)].join(', ')}.{' '}
            {reopens.length > 0 ? `Reopened now, because they have passed: ${reopens.map(gateName).join(', ')}.` : 'None of them has passed, so nothing reopens yet.'}
          </Notice>
        )}
      </div>

      <div className="as-block">
        <div>
          <div className="as-block-title">Conclusion and evidence</div>
          <div className="as-block-hint">Who gave input, what was concluded, and where the assessment is kept.</div>
        </div>
        <div className="rt-grid">
          <RecordField label="Input taken from" wide>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="Safety / R&I / Quality, as needed"
              value={inputFrom}
              options={MARKET_ADDITION_INPUT_FUNCTIONS.map((f) => ({ value: f, label: f }))}
              onChange={setInputFrom}
            />
          </RecordField>
          {noDifference ? (
            <RecordField label={<>Equivalence conclusion (and the approved evidence it reuses)<Req /></>} wide>
              <Input.TextArea autoSize={{ minRows: 3, maxRows: 8 }} value={equivalence} onChange={(e) => setEquivalence(e.target.value)} />
            </RecordField>
          ) : (
            <RecordField label={<>What differs and why these reviews were chosen<Req /></>} wide>
              <Input.TextArea autoSize={{ minRows: 3, maxRows: 8 }} value={conclusion} onChange={(e) => setConclusion(e.target.value)} />
            </RecordField>
          )}
          <RecordField label="Evidence link" wide>
            <Input value={evidenceLink} placeholder="Link to the assessment record" onChange={(e) => setEvidenceLink(e.target.value)} />
          </RecordField>
          {revising && (
            <RecordField label={<>Reason for revising<Req /></>} wide>
              <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} value={reason} onChange={(e) => setReason(e.target.value)} />
            </RecordField>
          )}
        </div>
      </div>

      <div className="as-block">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div className="as-block-hint" style={{ margin: 0 }}>
            {problems.length > 0 ? (
              <>
                Still needs:
                <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                  {problems.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </>
            ) : (
              'Ready to record.'
            )}
            <div style={{ marginTop: 4 }}>Only the project's Regulatory reviewer can record this.</div>
          </div>
          <Button type="primary" disabled={problems.length > 0 || busy} loading={busy} onClick={save}>
            {revising ? 'Record revision' : 'Record impact assessment'}
          </Button>
        </div>
      </div>
    </>
  );
}

// The assessment of ONE market, shown only for the market chosen in the Market switch, and only when that market was added after Gate 1.
export default function MarketAdditionAssessments({ projectId, entry }: { projectId: string; entry: MarketAdditionAssessment | undefined }) {
  const [revising, setRevising] = useState(false);
  if (!entry) return null;
  const isPending = isMarketAdditionPending(entry);
  const scope = marketAdditionScope(entry);
  return (
    <section className="c-card as-card">
      <div className="as-head">
        <div className="as-head-text" style={{ flex: '1 1 320px' }}>
          <div className="as-kicker">Assessment</div>
          <h2 className="as-title">Impact assessment — {entry.market}</h2>
          <p className="as-desc">
            {entry.market} was added after Gate 1{entry.addedBy ? ` by ${entry.addedBy}` : ''}
            {entry.addedAt ? ` on ${entry.addedAt.slice(0, 10)}` : ''}. Regulatory assesses what the market changes before it can be approved for launch.
          </p>
        </div>
        <div className="as-head-side">
          <span className={`c-tag c-tag-dot as-state ${isPending ? 'c-tag-warn' : 'c-tag-ok'}`}>
            {isPending ? 'Assessment pending' : entry.noDifference ? 'No substantive difference' : 'Assessed'}
          </span>
        </div>
      </div>
      {isPending && (
        <div className="as-block">
          <Notice tone="warn" title={`Impact assessment outstanding: ${entry.market}`}>
            Until it is complete this market cannot be approved for launch or have its Gates 10-12 signed; the other markets carry on.
          </Notice>
        </div>
      )}
      {!isPending && !revising && (
        <div className="as-block">
          <dl className="rt-dl">
            <dt>Assessed by</dt>
            <dd>
              {entry.assessedBy ?? '—'}
              {entry.assessedAt ? ` · ${entry.assessedAt.slice(0, 10)}` : ''}
              {entry.inputFrom.length > 0 ? ` · input from ${entry.inputFrom.join(', ')}` : ''}
            </dd>
            {entry.noDifference ? (
              <>
                <dt>Equivalence conclusion</dt>
                <dd>{entry.equivalenceConclusion ?? '—'}</dd>
              </>
            ) : (
              <>
                <dt>Differences</dt>
                <dd>{entry.differences.join('; ') || '—'}</dd>
                <dt>Reviews</dt>
                <dd>
                  {[...scope.gates.map(gateName), ...scope.marketGates.map((g) => `${gateName(g)} (${entry.market})`)].join(', ') || '—'}
                  {entry.reopenedGateIds.length > 0 ? ` · reopened: ${entry.reopenedGateIds.map(gateName).join(', ')}` : ''}
                </dd>
                {(entry.affectedMarkets ?? []).length > 0 && (
                  <>
                    <dt>Other markets affected</dt>
                    <dd>{entry.affectedMarkets.join(', ')} · Gate 10 and 11 sign-offs reopened</dd>
                  </>
                )}
                <dt>Conclusion</dt>
                <dd>{entry.conclusion ?? '—'}</dd>
              </>
            )}
          </dl>
          <div>
            <Button size="small" onClick={() => setRevising(true)}>
              Revise the assessment
            </Button>
          </div>
        </div>
      )}
      {(isPending || revising) && <AssessmentForm projectId={projectId} entry={entry} revising={!isPending} onDone={() => setRevising(false)} />}
    </section>
  );
}

// On a gate that an assessment reopened: says why, so the person who finds it back at Not Started is not left guessing.
export function MarketAssessmentReopenedNotice({ entries, gateId, gatePassed }: { entries: MarketAdditionAssessment[]; gateId: string; gatePassed: boolean }) {
  if (gatePassed) return null;
  const causes = entries.filter((e) => e.assessedAt && e.reopenedGateIds.includes(gateId));
  if (causes.length === 0) return null;
  return (
    <>
      {causes.map((e) => (
        <Notice key={e.id} tone="info" title={`Reopened by Regulatory's impact assessment of ${e.market}`}>
          {e.market} was added after Gate 1. Regulatory found {e.differences.length > 0 ? e.differences.join('; ') : 'a difference'} ({e.assessedBy ?? 'Regulatory'}
          {e.assessedAt ? `, ${e.assessedAt.slice(0, 10)}` : ''}), so this gate has to be decided again for it. The earlier decision and signatures are kept in the project history.
        </Notice>
      ))}
    </>
  );
}
