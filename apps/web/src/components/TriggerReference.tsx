import { useMemo, useState } from 'react';
import { Button, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import {
  CHANGE_TRIGGERS,
  phaseShortLabel,
  triggerPhases,
  type ChangeTriggerCategory,
} from '@mbc360/shared/config/changeTriggers';
import '../pages/AdminUsers.css';
import './TriggerReference.css';

// Affected gates + phases, derived from a trigger's gate list. The gates read
// as one line of text and the phases as neutral tags — they used to be two
// blue tag colours side by side, which read as one list of the same thing.
export function AffectedGates({ gates }: { gates: string[] }) {
  const spansAll = gates.includes('ALL');
  return (
    <span className="tr-affected">
      <span className="tr-gates">{spansAll ? 'All gates' : `Gate ${gates.join(' · ')}`}</span>
      <span className="tr-phases">
        {triggerPhases(gates).map((p) => (
          <span key={p} className="c-tag">
            {phaseShortLabel(p)}
          </span>
        ))}
      </span>
    </span>
  );
}

// The change-trigger reference (2026-10-03 redesign, wireframe option A): a
// search box, one chip per category, and one card per trigger with every field
// as a label/value pair — the old 1200px table in a 1040px drawer pushed Owner
// and Required sign-offs out of view, and never showed Required action at all
// although opening a change copies it into the request.
export default function TriggerReference({ categories }: { categories: ChangeTriggerCategory[] }) {
  const [category, setCategory] = useState<ChangeTriggerCategory | null>(null);
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const shown = useMemo(
    () =>
      CHANGE_TRIGGERS.filter(
        (t) =>
          (!category || t.category === category) &&
          (!q || `${t.label} ${t.examples ?? ''}`.toLowerCase().includes(q)),
      ),
    [category, q],
  );
  const chips: [ChangeTriggerCategory | null, string, number][] = [
    [null, 'All', CHANGE_TRIGGERS.length],
    ...categories.map(
      (c) => [c, c, CHANGE_TRIGGERS.filter((t) => t.category === c).length] as [ChangeTriggerCategory, string, number],
    ),
  ];

  return (
    <div className="tr">
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder="Search triggers or examples"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search triggers"
      />
      <div className="tr-chips" role="group" aria-label="Filter by category">
        {chips.map(([key, label, n]) => (
          <button
            key={label}
            type="button"
            className="au-chip"
            aria-pressed={category === key}
            onClick={() => setCategory(key)}
          >
            {label} <b>{n}</b>
          </button>
        ))}
      </div>
      <p className="tr-count">
        {shown.length} of {CHANGE_TRIGGERS.length} triggers
        {category ? ` · ${category}` : ''}
      </p>

      {shown.length === 0 ? (
        <div className="c-card tr-empty">
          <div className="tr-empty-title">No trigger matches “{query.trim()}”</div>
          <p>Try a shorter word, or clear the search.</p>
          <Button onClick={() => setQuery('')}>Clear search</Button>
        </div>
      ) : (
        <div className="tr-list">
          {shown.map((t) => (
            <article key={t.id} className="c-card tr-card">
              <header className="tr-head">
                <h3 className="tr-title">{t.label}</h3>
                {!category && <span className="c-tag tr-cat">{t.category}</span>}
              </header>
              {t.examples && <p className="tr-examples">{t.examples}</p>}
              <dl className="tr-dl">
                <dt>Affected</dt>
                <dd>
                  <AffectedGates gates={t.gates} />
                </dd>
                <dt>Owner</dt>
                <dd>{t.owner ?? '—'}</dd>
                <dt>Required sign-offs</dt>
                <dd>{t.signOffs ?? '—'}</dd>
                <dt>Required action</dt>
                <dd>{t.action ?? '—'}</dd>
              </dl>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
