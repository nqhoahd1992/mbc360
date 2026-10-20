import { useState } from 'react';
import { Alert, Button, Input, Tooltip } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { ProjectData, RegisterRow } from '@mbc360/shared/types';
import { createEmptyRegisterRow, isRegisterRowBlank, type RegisterConfig } from '@mbc360/shared/config/registers';
import { useDraft } from '../hooks/useDraft';
import { useRegisterAccess } from '../hooks/useRegisterAccess';
import { useRegisterFreeze } from '../hooks/useRegisterFreeze';
import SaveBar from './SaveBar';
import '../styles/concept.css';
import './IngredientMonographTable.css';

// "5. Ingredient Evidence Monograph" drawn the way the workbook sheet draws it: ONE monograph per key active, in five sections,
// each a small Field | Detail | Reference [n] / link table. The generic register table put the same fifteen fields in one wide
// row and had no Reference cell at all, so a monograph read as a spreadsheet row instead of the document it is.
//
// A monograph is still one register row (the fields are the register's own columns; each field's reference is `<field>Ref`),
// so the gate lock, the closing signature and the save rules are the register's — only the drawing differs.
// The hints are the workbook's own (its square brackets dropped), shown while a cell is empty.

interface FieldSpec {
  key: string;
  hint: string;
}

const SECTIONS: { title: string; fields: FieldSpec[] }[] = [
  {
    title: 'SECTION 1 — EXACT MATERIAL IDENTITY (no ambiguity)',
    fields: [
      { key: 'inciName', hint: 'exact INCI' },
      { key: 'tradeNameSupplier', hint: 'branded material + manufacturer' },
      { key: 'gradeSpecConcentration', hint: 'grade, actives %, purity, CAS' },
      { key: 'formExtractionProcess', hint: 'how it is made — matters for evidence transfer' },
    ],
  },
  {
    title: 'SECTION 2 — PROVENANCE & STORY',
    fields: [
      { key: 'originStory', hint: 'where it comes from, sustainability, narrative' },
      { key: 'whyChosen', hint: 'link to the need in Needs & Scientific Basis + the platform in Target Product & Tech Platform' },
    ],
  },
  {
    title: 'SECTION 3 — IP & EXTERNAL EVIDENCE',
    fields: [
      { key: 'patentIpStatus', hint: 'own IP, licensed, off-patent, FTO notes' },
      { key: 'externalTrialHistory', hint: 'published human/in-vitro studies on THIS material' },
      { key: 'studyConditions', hint: 'the exact conditions of that evidence' },
    ],
  },
  {
    title: 'SECTION 4 — TRANSFERABILITY TO OUR PRODUCT (critical)',
    fields: [
      { key: 'evidenceTransfers', hint: 'same dose/vehicle/population? Y/N + why' },
      { key: 'inferenceVsProof', hint: 'what is proven here vs only inferred — grade via Evidence Hierarchy & Search Rules' },
      { key: 'gapTestNeeded', hint: 'what must still be tested — feeds Evidence Plan & Claim Support' },
    ],
  },
  {
    title: 'SECTION 5 — APPROVED WORDING',
    fields: [
      { key: 'hcpExplanation', hint: 'approved technical wording' },
      { key: 'consumerExplanation', hint: 'approved lay wording' },
      { key: 'wordingToAvoid', hint: 'claims not supported / regulatory no-go' },
    ],
  },
];

const text = (v: unknown) => String(v ?? '').trim();

const FIELD_KEYS = SECTIONS.flatMap((section) => section.fields.map((f) => f.key));
// How many of the monograph's fields have something in them — shown on its tab so every ingredient's progress is visible at once.
const filled = (r: RegisterRow) => FIELD_KEYS.filter((k) => text(r[k]) !== '').length;

export default function IngredientMonographTable({
  project,
  config,
  rows,
  onSave,
  readOnly,
}: {
  project: ProjectData;
  config: RegisterConfig;
  rows: RegisterRow[];
  onSave: (rows: RegisterRow[]) => void | boolean | Promise<unknown>;
  readOnly: boolean;
}) {
  const { draft, dirty, update, markSaved, discard } = useDraft<RegisterRow[]>(rows);
  const freeze = useRegisterFreeze(project, config);
  const access = useRegisterAccess(project, config);
  const [picked, setPicked] = useState(0);
  const index = Math.min(picked, Math.max(draft.length - 1, 0));
  const row = draft[index];

  const rowsBlock = freeze.rowsFrozenReason ?? (access.canChangeRows ? undefined : access.reason);
  const rowsOff = readOnly || !!rowsBlock;
  const columnOff = (key: string) => readOnly || freeze.isFrozen(key) || access.cellBlocked(key, row);

  const label = (r: RegisterRow, i: number) => text(r.inciName) || `Monograph ${i + 1}`;
  const patch = (key: string, value: string | undefined) =>
    update(draft.map((r, i) => (i === index ? { ...r, [key]: value ?? '' } : r)));
  const add = () => {
    update([...draft, createEmptyRegisterRow(config.key)]);
    setPicked(draft.length);
  };
  const remove = () => {
    update(draft.filter((_, i) => i !== index));
    setPicked(Math.max(index - 1, 0));
  };

  const blank = draft.map((r, i) => (isRegisterRowBlank(config, r) ? label(r, i) : null)).filter(Boolean);
  const saveProblems = blank.length > 0 ? [`${blank.join(', ')} has nothing filled in — fill it in or remove it`] : [];
  const save = async () => {
    if (saveProblems.length > 0) return;
    if ((await onSave(draft)) === false) return;
    markSaved();
  };

  const fieldLabel = (key: string) => config.columns.find((c) => c.key === key)?.label ?? key;

  const detail = (spec: FieldSpec) => (
    <Input.TextArea
      autoSize={{ minRows: 1, maxRows: 8 }}
      placeholder={spec.hint}
      disabled={columnOff(spec.key)}
      value={text(row[spec.key])}
      onChange={(e) => patch(spec.key, e.target.value)}
    />
  );

  return (
    <div className="imo">
      <div className="imo-bar">
        <div className="imo-chips" role="tablist" aria-label="Monographs of this project">
          {draft.map((r, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              className="imo-chip"
              onClick={() => setPicked(i)}
            >
              <span className="imo-chip-name">{label(r, i)}</span>
              <span className="imo-chip-count" title="Fields filled in">{filled(r)}/{FIELD_KEYS.length}</span>
            </button>
          ))}
          <Tooltip title={rowsBlock}>
            <span>
              <Button type="dashed" icon={<PlusOutlined />} onClick={add} disabled={rowsOff}>
                Add monograph
              </Button>
            </span>
          </Tooltip>
        </div>
        {row && (
          <Tooltip title={rowsBlock}>
            <span>
              <Button danger type="text" icon={<DeleteOutlined />} onClick={remove} disabled={rowsOff}>
                Remove this monograph
              </Button>
            </span>
          </Tooltip>
        )}
      </div>

      {saveProblems.length > 0 && !readOnly && (
        <Alert type="error" showIcon title="This cannot be saved yet" description={saveProblems.join(' · ')} />
      )}

      {!row ? (
        <div className="c-card imo-empty">
          One monograph per key active or functional ingredient. {rowsOff ? '' : 'Add the first one above.'}
        </div>
      ) : (
        <>
          <div className="imo-title">
            INGREDIENT / ACTIVE EVIDENCE MONOGRAPH <span>|</span> {text(row.inciName) || 'Material / INCI'}
          </div>
          {SECTIONS.map((section) => (
            <section key={section.title} className="c-card imo-section">
              <h3 className="imo-section-title">{section.title}</h3>
              <table className="imo-table">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Detail (dot points)</th>
                    <th>Reference [n] / link</th>
                  </tr>
                </thead>
                <tbody>
                  {section.fields.map((spec) => (
                    <tr key={spec.key}>
                      <th scope="row">{fieldLabel(spec.key)}</th>
                      <td>{detail(spec)}</td>
                      <td>
                        <Input.TextArea
                          autoSize={{ minRows: 1, maxRows: 4 }}
                          placeholder="Reference number or full https link"
                          disabled={columnOff(`${spec.key}Ref`)}
                          value={text(row[`${spec.key}Ref`])}
                          onChange={(e) => patch(`${spec.key}Ref`, e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </>
      )}

      {dirty && (
        <div className="page-savebar">
          <SaveBar
            dirty={dirty}
            onSave={save}
            onDiscard={discard}
            disabled={saveProblems.length > 0}
            disabledReason={saveProblems.join(' · ')}
          />
        </div>
      )}
    </div>
  );
}
