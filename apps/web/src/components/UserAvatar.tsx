// A person's initials on a pastel tint — the avatar an account gets until there is a photo.
// Two letters (first and last word of the name: "Hòa Nguyễn" -> "HN"; one word -> its first two
// letters). The tint comes from the user's id, not the name, so it is the same on every screen and
// survives a rename. Tints are identity colours, not status colours, so they live here rather than
// in the shared tokens.
const TONES = [
  { bg: '#ecfdf5', fg: '#007a55', ring: '#a4f4cf' },
  { bg: '#f0f9ff', fg: '#0069a8', ring: '#b8e6fe' },
  { bg: '#eef2ff', fg: '#432dd7', ring: '#c6d2ff' },
  { bg: '#fdf2f8', fg: '#c6005c', ring: '#fccee8' },
  { bg: '#fffbeb', fg: '#bb4d00', ring: '#fee685' },
  { bg: '#f5f3ff', fg: '#7008e7', ring: '#ddd6ff' },
];

function toneFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return TONES[Math.abs(hash) % TONES.length];
}

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const letters = words.length === 1 ? [...words[0]].slice(0, 2).join('') : `${[...words[0]][0]}${[...words[words.length - 1]][0]}`;
  return letters.toLocaleUpperCase('vi');
}

export default function UserAvatar({ name, seed, size = 32 }: { name: string; seed: string; size?: number }) {
  const tone = toneFor(seed || name);
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-grid',
        placeItems: 'center',
        flex: 'none',
        width: size,
        height: size,
        borderRadius: '50%',
        background: tone.bg,
        color: tone.fg,
        boxShadow: `inset 0 0 0 1px ${tone.ring}`,
        fontSize: Math.round(size * 0.4),
        fontWeight: 600,
        letterSpacing: 0.2,
        lineHeight: 1,
        userSelect: 'none',
      }}
    >
      {initialsOf(name)}
    </span>
  );
}
