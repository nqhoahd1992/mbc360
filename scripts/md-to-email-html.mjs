/**
 * Convert a Markdown document into Outlook-friendly HTML for copy-pasting into an email body.
 *
 * Usage:
 *   node scripts/md-to-email-html.mjs docs/F1_Open_Questions_Email_Draft.md
 *   node scripts/md-to-email-html.mjs docs/F1_Open_Questions_Email_Draft.md --out C:/tmp/email.html
 *
 * Why this exists: Outlook renders HTML with the Word engine, which ignores stylesheets,
 * flexbox and grid. Every style below is therefore inlined on the element itself, and
 * tables carry explicit cell borders — the two things that actually survive a paste.
 *
 * Supported Markdown subset (all that the email drafts use): ATX headings, bold, italic,
 * pipe tables, unordered/ordered lists, blockquotes, horizontal rules.
 *
 * The document title (first H1) and the "To:" / "Subject:" metadata lines are stripped from
 * the HTML body and printed to the console instead — they belong in Outlook's own fields.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const FONT = "Calibri, 'Segoe UI', Arial, sans-serif";

const STYLE = {
  body: `font-family:${FONT};font-size:11pt;line-height:1.5;color:#1f1f1f;`,
  h1: `font-family:${FONT};font-size:16pt;font-weight:bold;margin:18pt 0 8pt;color:#1f1f1f;`,
  h2: `font-family:${FONT};font-size:14pt;font-weight:bold;margin:20pt 0 8pt;padding-bottom:3pt;border-bottom:1px solid #d0d0d0;color:#1f1f1f;`,
  h3: `font-family:${FONT};font-size:12pt;font-weight:bold;margin:14pt 0 6pt;color:#1f1f1f;`,
  p: `font-family:${FONT};font-size:11pt;line-height:1.5;margin:0 0 10pt;`,
  ul: `font-family:${FONT};font-size:11pt;line-height:1.5;margin:0 0 10pt;padding-left:22pt;`,
  ol: `font-family:${FONT};font-size:11pt;line-height:1.5;margin:0 0 10pt;padding-left:22pt;`,
  li: `margin:0 0 4pt;`,
  table: `border-collapse:collapse;margin:0 0 12pt;font-family:${FONT};font-size:10.5pt;`,
  th: `border:1px solid #b8b8b8;background-color:#f2f2f2;padding:5pt 8pt;text-align:left;font-weight:bold;vertical-align:top;`,
  td: `border:1px solid #b8b8b8;padding:5pt 8pt;text-align:left;vertical-align:top;`,
  quote: `font-family:${FONT};font-size:10.5pt;line-height:1.5;margin:0 0 12pt;padding:8pt 12pt;border-left:3px solid #c0c0c0;background-color:#f7f7f7;color:#404040;`,
  hr: `border:none;border-top:1px solid #d0d0d0;margin:16pt 0;`,
};

const METADATA_PREFIXES = ['**To:**', '**Subject:**', '**Gửi:**', '**Tiêu đề:**'];

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Bold and italic only — the drafts use no links, images or inline code. */
function renderInline(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+?)\*/g, '$1<em>$2</em>');
}

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

const isTableSeparator = (line) => /^\|[\s:|-]+\|$/.test(line.trim());
const isTableRow = (line) => line.trim().startsWith('|') && line.trim().endsWith('|');

function convert(markdown) {
  const lines = markdown.split(/\r?\n/);
  const out = [];
  const metadata = [];
  let title = '';
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    // Blank line — block separation is handled per block below.
    if (trimmed === '') {
      index += 1;
      continue;
    }

    // Document title: the first H1 becomes the console-reported title, not body content.
    if (/^#\s+/.test(trimmed) && !title) {
      title = trimmed.replace(/^#\s+/, '');
      index += 1;
      continue;
    }

    // Email metadata lines belong in Outlook's own To/Subject fields.
    if (METADATA_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
      metadata.push(trimmed.replace(/\*\*/g, ''));
      index += 1;
      continue;
    }

    // Horizontal rule — skipped while still in the front matter, so the body does not
    // open with a stray divider once the title and metadata have been removed.
    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      if (out.length > 0) out.push(`<hr style="${STYLE.hr}">`);
      index += 1;
      continue;
    }

    // Headings.
    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      const level = Math.min(heading[1].length, 3);
      const tag = `h${level}`;
      out.push(`<${tag} style="${STYLE[tag]}">${renderInline(heading[2])}</${tag}>`);
      index += 1;
      continue;
    }

    // Table: a header row, a separator row, then any number of body rows.
    if (isTableRow(line) && isTableSeparator(lines[index + 1] ?? '')) {
      const header = splitTableRow(line);
      index += 2;
      const rows = [];
      while (index < lines.length && isTableRow(lines[index])) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      const head = header.map((cell) => `<th style="${STYLE.th}">${renderInline(cell)}</th>`).join('');
      const body = rows
        .map((row) => `<tr>${row.map((cell) => `<td style="${STYLE.td}">${renderInline(cell)}</td>`).join('')}</tr>`)
        .join('');
      out.push(
        `<table style="${STYLE.table}" cellspacing="0" cellpadding="0"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`,
      );
      continue;
    }

    // Blockquote.
    if (trimmed.startsWith('>')) {
      const parts = [];
      while (index < lines.length && lines[index].trim().startsWith('>')) {
        parts.push(lines[index].trim().replace(/^>\s?/, ''));
        index += 1;
      }
      out.push(`<div style="${STYLE.quote}">${renderInline(parts.join(' ').trim())}</div>`);
      continue;
    }

    // Lists — unordered and ordered, single level (the drafts never nest).
    const bullet = /^[-*]\s+(.*)$/.exec(trimmed);
    const numbered = /^\d+\.\s+(.*)$/.exec(trimmed);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      const items = [];
      while (index < lines.length) {
        const candidate = lines[index].trim();
        const match = ordered ? /^\d+\.\s+(.*)$/.exec(candidate) : /^[-*]\s+(.*)$/.exec(candidate);
        if (!match) break;
        items.push(`<li style="${STYLE.li}">${renderInline(match[1])}</li>`);
        index += 1;
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag} style="${STYLE[tag]}">${items.join('')}</${tag}>`);
      continue;
    }

    // Paragraph: consume until a blank line or the start of another block.
    const paragraph = [];
    while (index < lines.length) {
      const candidate = lines[index];
      const candidateTrimmed = candidate.trim();
      const startsNewBlock =
        candidateTrimmed === '' ||
        /^#{1,6}\s+/.test(candidateTrimmed) ||
        /^(-{3,}|\*{3,})$/.test(candidateTrimmed) ||
        candidateTrimmed.startsWith('>') ||
        /^[-*]\s+/.test(candidateTrimmed) ||
        /^\d+\.\s+/.test(candidateTrimmed) ||
        isTableRow(candidate);
      if (startsNewBlock) break;
      paragraph.push(candidateTrimmed);
      index += 1;
    }
    // A single newline inside a paragraph is kept as a line break rather than collapsed to a
    // space: in an email that distinction is visible (a signature block, an address list).
    // Safe here because the drafts write each paragraph as one unwrapped line.
    out.push(`<p style="${STYLE.p}">${renderInline(paragraph.join('\n')).replace(/\n/g, '<br>\n')}</p>`);
  }

  return { title, metadata, body: out.join('\n') };
}

const args = process.argv.slice(2);
const inputArg = args.find((arg) => !arg.startsWith('--'));
if (!inputArg) {
  console.error('Usage: node scripts/md-to-email-html.mjs <file.md> [--out <file.html>]');
  process.exit(1);
}

const outFlagIndex = args.indexOf('--out');
const inputPath = resolve(inputArg);
const outputPath =
  outFlagIndex !== -1 && args[outFlagIndex + 1]
    ? resolve(args[outFlagIndex + 1])
    : inputPath.replace(/\.md$/i, '.email.html');

const { title, metadata, body } = convert(readFileSync(inputPath, 'utf8'));

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title || basename(inputPath))}</title>
</head>
<body style="margin:0;padding:24px;background-color:#ffffff;">
<div style="${STYLE.body}max-width:920px;">
${body}
</div>
</body>
</html>
`;

writeFileSync(outputPath, html, 'utf8');

console.log(`Written: ${outputPath}`);
if (title) console.log(`Title:   ${title}`);
for (const line of metadata) console.log(`         ${line}`);
console.log('\nNext: open the file in a browser, select all (Ctrl+A), copy (Ctrl+C), paste into Outlook.');
