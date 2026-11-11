import type { ProjectData } from '@mbc360/shared/types';
import { familyUseAgeGroupList, UNSTRUCTURED_PMS_CONDITIONS } from '@mbc360/shared/types';
import { ASSESSMENT_HOMES, type AssessmentKey } from '@mbc360/shared/config/assessments';
import { evaluateTrigger, foreseeableContactAskedFor, personAnswer } from '@mbc360/shared/utils/gateProgress';
import { isPendingAnswer } from '@mbc360/shared/utils/changeControlAssessments';
import { isScaleUpPending } from '@mbc360/shared/utils/scaleUpAssessments';

// Family use is asked only of a family-use product: an always-visible unanswered field reads as an obligation, and here blank means
// "not applicable", not "not done". Lives here, with the status that reads it, so the block and the summary share one copy.
export function isFamilyUseSelected(project: ProjectData): boolean {
  return (project.checklists['targetUsers'] ?? []).some((i) => i.selected && i.label === 'Family use');
}

export type AssessmentTone = 'ok' | 'warn' | 'muted';

// The overview's one-line-per-assessment summary (2026-10-03). The answers are
// recorded on their gates' tabs (AssessmentBlock); this only says where each
// stands and links there. "Waiting" is the engine's own `notAssessed` state, so
// what is amber here is exactly what blocks a gate.
export function assessmentStatus(project: ProjectData, key: AssessmentKey): { text: string; tone: AssessmentTone } {
  const a = project.assessments;
  const v = (s?: string) => s?.trim() ?? '';
  const home = ASSESSMENT_HOMES.find((h) => h.key === key)!;
  const waiting = evaluateTrigger(project, home.trigger) === 'notAssessed';
  switch (key) {
    case 'foreseeableContact': {
      // Asked only while no maternal or infant user is ticked; otherwise the ticks themselves answer it.
      if (!foreseeableContactAskedFor(project)) return { text: 'Not asked — a maternal or infant user is ticked', tone: 'ok' };
      if (!v(a.foreseeableContactRationale)) return { text: 'Reason required', tone: 'warn' };
      return v(a.foreseeableContactConfirmedBy)
        ? { text: `No foreseeable contact — confirmed by ${v(a.foreseeableContactConfirmedBy)}`, tone: 'ok' }
        : { text: 'Reason recorded — not yet confirmed', tone: 'warn' };
    }
    case 'pmsUnstructured': {
      const states = UNSTRUCTURED_PMS_CONDITIONS.map((c) => personAnswer(a[c.answer], a[c.rationale], a[c.confirmer]));
      if (states.includes('yes')) return { text: 'Enhanced surveillance applies', tone: 'ok' };
      const answered = states.filter((s) => s === 'no').length;
      return answered === states.length
        ? { text: 'None apply', tone: 'ok' }
        : { text: `${answered} of ${states.length} answered`, tone: 'warn' };
    }
    case 'familyUse': {
      if (!isFamilyUseSelected(project)) return { text: 'Not asked — Family use is not a target user', tone: 'muted' };
      const groups = familyUseAgeGroupList(a);
      return groups.length ? { text: groups.join(', '), tone: 'ok' } : { text: 'Age groups not yet confirmed', tone: 'warn' };
    }
    case 'administrativeOnly': {
      const ans = v(a.administrativeOnly);
      if (!ans) return { text: 'Not recorded', tone: 'muted' };
      if (ans === 'Yes' && !v(a.administrativeOnlyRationale)) return { text: 'Yes — reason required', tone: 'warn' };
      if (ans === 'Yes' && !v(a.administrativeOnlyConfirmedBy)) return { text: 'Yes — not yet confirmed', tone: 'warn' };
      return { text: ans === 'Yes' ? `Yes — confirmed by ${v(a.administrativeOnlyConfirmedBy)}` : ans, tone: 'ok' };
    }
    case 'humanStudy': {
      const started = (project.registers['studyProtocolSetup'] ?? []).some((r) => String(r.plannedValue ?? '').trim() !== '');
      if (started) return { text: 'Yes — a Study Protocol has been started', tone: 'ok' };
      return waiting ? { text: v(a.humanStudyPlanned) || 'Not yet assessed', tone: 'warn' } : { text: v(a.humanStudyPlanned), tone: 'ok' };
    }
    case 'scaleUp': {
      const list = project.scaleUpAssessments ?? [];
      if (waiting) {
        const pending = list.filter((e) => isScaleUpPending(e)).length;
        return { text: list.length === 0 ? 'Not yet assessed' : `${pending} of ${list.length} assessment(s) still pending`, tone: 'warn' };
      }
      const yes = list.filter((e) => (e.answer ?? '').trim() === 'Yes').length;
      return { text: list.length === 0 ? 'Does not apply' : `${list.length} assessment(s) — ${yes} Yes`, tone: 'ok' };
    }
    case 'changeControl': {
      const list = project.changeControlAssessments ?? [];
      if (waiting) {
        const pending = list.filter((e) => isPendingAnswer(e)).length;
        return { text: list.length === 0 ? 'Not yet assessed' : `${pending} of ${list.length} assessment(s) still pending`, tone: 'warn' };
      }
      const yes = list.filter((e) => (e.answer ?? '').trim() === 'Yes').length;
      return { text: `${list.length} assessment(s) — ${yes} Yes`, tone: 'ok' };
    }
  }
}
