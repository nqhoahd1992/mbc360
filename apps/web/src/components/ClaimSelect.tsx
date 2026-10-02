import { Select, Tag } from 'antd';
import { useClaimRows } from '../hooks/claimRows';

// Picks a Claim ID from this project's Claim -> Evidence Traceability ledger,
// which as of 2026-08-11 is the ONE place a claim is declared. Before that a
// claim's wording was re-typed in six registers with nothing joining them, and a
// Claim ID was only minted at Gate 10 — after most of that typing had happened.
//
// Reads the project from the route for the same reason MarketSelect does: the
// ledger belongs to the project in the URL, and these tables render from many
// call sites.
export default function ClaimSelect({
  value,
  onChange,
  disabled,
}: {
  value?: string;
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
}) {
  const claims = useClaimRows();
  const declared = claims
    .map((c) => ({
      id: String(c.claimId ?? '').trim(),
      wording: String(c.approvedWording ?? '').trim(),
      status: String(c.status ?? '').trim(),
    }))
    .filter((c) => c.id !== '');

  const current = String(value ?? '').trim();
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

  return (
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
}
