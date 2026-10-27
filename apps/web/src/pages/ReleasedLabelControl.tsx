import { labelPlatformRollout, labelShipmentVerification, releasedLabelRegister } from '@mbc360/shared/config/registers';
import SheetRegistersPage from '../components/SheetRegistersPage';

// The workbook's Released_Label_Ctrl sheet: BLOCK A (released label vs current artwork), BLOCK B (platform rollout and stock
// confirmation) and BLOCK C (shipment label and batch verification), in that order.
export default function ReleasedLabelControl() {
  return (
    <SheetRegistersPage
      title="Released Label Control"
      description={<>Separate control project for label/artwork changes. Record what has changed or will change (incl. LEMC serum cartoon), current vs new label, market-release status, 3D asset status, platform rollout with stock confirmation, and per-shipment label + batch verification. No silent label changes - use Artwork_Change_Control for the formal change record.</>}
      configs={[releasedLabelRegister, labelPlatformRollout, labelShipmentVerification]}
    />
  );
}
