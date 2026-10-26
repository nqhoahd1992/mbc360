import './ReviewOwnerLine.css';

// "Tuan (Technical Services) · Co-review: Sankar (Production Support), Lily (Packaging) · Co-sign: Chris (Project Manager)",
// as composed by composeReviewOwner, drawn so the person RESPONSIBLE stands out: a filled chip, with the co-reviewers and
// co-signers as quiet text beside it. Unfilled roles arrive as ‹Role› and are shown the same way.
function parse(text: string) {
  const parts = text.split(' · ');
  const people = (s: string) => s.split(/,\s+(?=[^,]*\()|,\s+(?=‹)/).map((p) => p.trim()).filter(Boolean);
  const out = { owner: parts[0] ?? '', coReview: [] as string[], coSign: [] as string[] };
  for (const part of parts.slice(1)) {
    if (part.startsWith('Co-review: ')) out.coReview = people(part.slice('Co-review: '.length));
    else if (part.startsWith('Co-sign: ')) out.coSign = people(part.slice('Co-sign: '.length));
  }
  return out;
}

function Person({ value }: { value: string }) {
  const m = value.match(/^(.*?)\s*\((.*)\)$/);
  return m ? (
    <>
      <b>{m[1]}</b> <span className="rol-role">{m[2]}</span>
    </>
  ) : (
    <b>{value}</b>
  );
}

export default function ReviewOwnerLine({ text }: { text: string }) {
  const { owner, coReview, coSign } = parse(text);
  const group = (label: string, list: string[]) =>
    list.length > 0 && (
      <span className="rol-group">
        <span className="rol-label">{label}</span>
        {list.map((p, i) => (
          <span key={i} className="rol-person">
            <Person value={p} />
          </span>
        ))}
      </span>
    );
  return (
    <div className="rol">
      <span className="rol-group">
        <span className="rol-label">Responsible</span>
        <span className="rol-owner">
          <Person value={owner} />
        </span>
      </span>
      {group('Co-review', coReview)}
      {group('Co-sign', coSign)}
    </div>
  );
}
