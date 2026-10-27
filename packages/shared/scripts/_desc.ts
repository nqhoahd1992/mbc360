import fs from 'fs';
import { REGISTER_CONFIGS } from '../src/config/registers';

const dir = process.argv[2];
const wb = fs.readFileSync(`${dir}/xl/workbook.xml`, 'utf8');
const rels = fs.readFileSync(`${dir}/xl/_rels/workbook.xml.rels`, 'utf8');
const ss = fs.readFileSync(`${dir}/xl/sharedStrings.xml`, 'utf8');
const un = (s: string) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
const strings: string[] = [...ss.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => un([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')));
const norm = (s: string) => s.replace(/\s+/g, ' ').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').trim();

function sheetFile(tab: string): string | undefined {
  const m = new RegExp(`<sheet name="${tab.replace(/&/g, '&amp;')}" sheetId="\\d+" r:id="([^"]+)"`).exec(wb);
  if (!m) return undefined;
  const t = new RegExp(`Id="${m[1]}"[^>]*Target="([^"]+)"|Target="([^"]+)"[^>]*Id="${m[1]}"`).exec(rels)!;
  return `${dir}/xl/${(t[1] ?? t[2]).replace(/^\/?(xl\/)?/, '')}`;
}
function colA(xml: string): Map<number, string> {
  const out = new Map<number, string>();
  for (const m of xml.matchAll(/<c r="A(\d+)"([^>]*)>([\s\S]*?)<\/c>/g)) {
    if (!/t="s"/.test(m[2])) continue;
    const v = /<v>(\d+)<\/v>/.exec(m[3]);
    if (v) out.set(Number(m[1]), strings[Number(v[1])]);
  }
  return out;
}

const done = new Set<string>();
for (const c of REGISTER_CONFIGS) {
  if (!c.workbookTab || done.has(c.workbookTab)) continue;
  done.add(c.workbookTab);
  const f = sheetFile(c.workbookTab);
  if (!f) continue;
  const a = colA(fs.readFileSync(f, 'utf8'));
  const sheetDesc = a.get(4);
  if (!sheetDesc) continue;
  const same = REGISTER_CONFIGS.filter((x) => x.workbookTab === c.workbookTab);
  const appDescs = same.map((x) => norm(x.description ?? ''));
  const want = norm(sheetDesc);
  if (appDescs.some((d) => d.includes(want))) continue;
  console.log(`## ${c.workbookTab}  [${same.map((x) => x.key).join(', ')}]`);
  console.log(`   sheet: ${want}`);
  for (const x of same) console.log(`   app (${x.key}): ${norm(x.description ?? '')}`);
}
