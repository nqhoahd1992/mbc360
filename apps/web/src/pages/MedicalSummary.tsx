import { medicalReadyAnswerPack, medicalSummary } from '@mbc360/shared/config/registers';
import SheetRegistersPage from '../components/SheetRegistersPage';

// The workbook's Medical_Summary sheet: the safety / medical summary and, under it, the READY-TO-ANSWER PACK of audience questions.
export default function MedicalSummary() {
  return (
    <SheetRegistersPage
      title="Medical / Safety Summary"
      description={<>Ready-to-answer HCP / distributor evidence pack. Use approved wording and links, not draft data.</>}
      configs={[medicalSummary, medicalReadyAnswerPack]}
    />
  );
}
