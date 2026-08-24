import { Card, Skeleton } from 'antd';

// The placeholder shown while the projects are being fetched.
//
// It replaces a centred `<Spin tip="Loading projects…">`, which had three
// problems visible on screen: antd's `tip` only works in the NESTED form, so it
// rendered a tinted box around an empty div; the tip text wrapped mid-phrase
// inside that box; and the whole thing floated in the middle of an otherwise
// blank page, so the content then appeared somewhere else entirely.
//
// A skeleton in the shape of what is coming — a card with a title, a toolbar
// and table rows — keeps the layout still and reads as "this is filling in"
// rather than "something is happening somewhere". The moving-content guidance
// is the same reason: prefer a skeleton over a blocking spinner for anything
// that may take more than a moment.
export default function PageSkeleton({ label = 'Loading…' }: { label?: string }) {
  return (
    <Card size="small" style={{ borderColor: '#f0f0f0' }}>
      {/* The skeleton is decorative; the label is what assistive tech hears. */}
      <span
        role="status"
        aria-live="polite"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clipPath: 'inset(50%)',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <div
        aria-hidden
        style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}
      >
        <Skeleton.Input active size="small" style={{ width: 220 }} />
        <Skeleton.Button active size="small" style={{ width: 120 }} />
      </div>
      <div aria-hidden style={{ display: 'grid', gap: 12 }}>
        {[0, 1, 2, 3, 4].map((row) => (
          <Skeleton
            key={row}
            active
            title={false}
            paragraph={{ rows: 1, width: '100%' }}
            style={{ opacity: 1 - row * 0.14 }}
          />
        ))}
      </div>
    </Card>
  );
}
