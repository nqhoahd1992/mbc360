import { fragranceAllergenLog, fragranceSafety } from '@mbc360/shared/config/registers';
import SheetRegistersPage from '../components/SheetRegistersPage';

// The workbook's Fragrance_Safety sheet: the six-step fragrance workflow and, under it, the FRAGRANCE / ALLERGEN LOG.
export default function FragranceSafety() {
  return (
    <SheetRegistersPage
      title="Fragrance Safety & Allergen Evidence"
      description={<>Six-step fragrance workflow from supplier selection through post-market surveillance.</>}
      configs={[fragranceSafety, fragranceAllergenLog]}
    />
  );
}
