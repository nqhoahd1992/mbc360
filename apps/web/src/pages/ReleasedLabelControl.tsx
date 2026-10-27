import { labelPlatformRollout, labelShipmentVerification, releasedLabelRegister } from '@mbc360/shared/config/registers';
import SheetRegistersPage from '../components/SheetRegistersPage';

// The workbook's Released_Label_Ctrl sheet: BLOCK A (released label vs current artwork), BLOCK B (platform rollout and stock
// confirmation) and BLOCK C (shipment label and batch verification), in that order.
export default function ReleasedLabelControl() {
  return (
    <SheetRegistersPage
      title="Released Label Control"
      description={<>Separate control project for label and artwork changes: what has changed or will change, current vs new label, market-release status, platform rollout and shipment verification.</>}
      configs={[releasedLabelRegister, labelPlatformRollout, labelShipmentVerification]}
    />
  );
}
