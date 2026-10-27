import { artworkLabelReviewChecklist, packagingSpecsArtwork } from '@mbc360/shared/config/registers';
import SheetRegistersPage from '../components/SheetRegistersPage';

// The workbook's Packaging_Specs_Artwork sheet: the PACKAGING COMPONENT EVIDENCE register and, under it, the ARTWORK / LABEL REVIEW CHECKLIST.
export default function PackagingSpecsArtwork() {
  return (
    <SheetRegistersPage
      title="Packaging Specs & Artwork Evidence"
      description={<>Use for planned package/artwork evidence. Use Artwork_Change_Control only when a released or controlled version changes.</>}
      configs={[packagingSpecsArtwork, artworkLabelReviewChecklist]}
    />
  );
}
