import { studyParticipantLog, studyProtocolSetup } from '@mbc360/shared/config/registers';
import SheetRegistersPage from '../components/SheetRegistersPage';

// The workbook's "Study Protocol & Participant Rationale" sheet: "Study participants are folded into this sheet to avoid a separate
// overlapping participant tab" — so the protocol setup and the participant / sample log are one page, as in the sheet. The study APPROVAL
// workflow (rule C2) is not part of the sheet; it sits on the Gate 08 tab of Phase 3, under "Human-participant study planned?".
export default function StudyProtocol() {
  return (
    <SheetRegistersPage
      title="Study Protocol & Participant Rationale"
      description={<>Protocol setup and the participant / sample log, on one page as in the workbook. Whether a human-participant study is planned, and its approval route, are answered on the Gate 08 tab of Phase 3.</>}
      configs={[studyProtocolSetup, studyParticipantLog]}
    />
  );
}
