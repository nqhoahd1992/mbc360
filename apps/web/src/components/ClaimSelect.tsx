import { Select, Tag } from 'antd';
import { useClaimRows } from '../hooks/claimRows';
import ReferenceSource from './ReferenceSource';
import { claimIsExcluded } from '@mbc360/shared/config/claimReview';

// Picks a Claim ID from this project's Claim -> Evidence Traceability ledger,
// which as of 2026-08-11 is the ONE place a claim is declared. Before that a
// claim's wording was re-typed in six registers with nothing joining them, and a
// Claim ID was only minted at Gate 10 — after most of that typing had happened.
//
// Reads the project from the route for the same reason MarketSelect does: the
// ledger belongs to the project in the URL, and these tables render from many
// call sites.
export default function ClaimSelect({
  hideSource,
  value,
  onChange,
  disabled,
}: {
  // Leave out the "taken from" line under the picker where space is tight (a table cell).
  hideSource?: boolean;
  value?: string;
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
}) {
  const claims = useClaimRows();
  const current = String(value ?? '').trim();
  const declared = claims
    .map((c) => ({
      id: String(c.claimId ?? '').trim(),
      wording: String(c.approvedWording ?? '').trim(),
      status: String(c.status ?? '').trim(),
      excluded: claimIsExcluded(c),
    }))
    // A claim excluded as a rejected concept (question 18(a)) is not offered for a new link; one already chosen stays visible.
    .filter((c) => c.id !== '' && (!c.excluded || c.id === current));

  const known = declared.some((c) => c.id === current);
  const options = [
    ...declared.map((c) => ({
      value: c.id,
      label: c.wording ? `${c.id} — ${c.wording}` : c.id,
      status: c.status,
    })),
    // A claim id recorded before the ledger existed, or since deleted, stays
    // visible rather than being silently cleared.
    ...(current && !known ? [{ value: current, label: current, status: 'not in the claim ledger' }] : []),
  ];

  const select = (
    <Select
      allowClear
      showSearch
      disabled={disabled}
      // Deliberately NOT restricted to 'Supported' claims: a claim may be
      // proposed and used in planning while its evidence is still being built —
      // Round 3 D2 corrected us on exactly that. Release is blocked separately,
      // by publishedInfoViolations().
      placeholder={declared.length > 0 ? 'Link a declared claim' : 'No claims declared yet'}
      style={{ width: '100%', minWidth: 140 }}
      value={current || undefined}
      options={options}
      optionFilterProp="label"
      onChange={(v?: string) => onChange(v)}
      optionRender={(option) => (
        <span>
          {option.data.label}
          {option.data.status && <Tag style={{ marginLeft: 6 }}>{option.data.status}</Tag>}
        </span>
      )}
    />
  );
  return (
    <>
      {select}
      {!hideSource && <ReferenceSource kind="claim" />}
    </>
  );
}
