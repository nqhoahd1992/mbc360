# Đề xuất cột `sensitive` (giai đoạn 2) — để chủ dự án duyệt

Sinh tự động từ cấu hình ngày 15/10/2026. **Chưa áp dụng.**

Quy tắc đề xuất: một cột là **quan trọng** nếu kiểu là chọn một/nhiều giá trị (trạng thái, kết luận, quyết định…), ô tick (phê duyệt…) hoặc chữ ký; cộng cột **người** nêu một người làm việc (Reviewer, Verified by, …); cộng thao tác **thêm/xóa dòng**. Các cột còn lại (chữ, ngày, số, link, ghi chú) là **thông tin đơn giản**: mọi người dùng trong dự án đóng góp được.

## Formulation_Safety (dòng cố định: không thêm/xóa)

- Quan trọng: Status (select)
**Tổng:** 82 sổ, 684 cột sửa được; 115 cột quan trọng theo kiểu; 45 cột người cần quyết (đề xuất: coi là quan trọng khi nhãn là Reviewer / Verified by / Approved by / Confirmed by / Assessed by, còn Owner / Responsible chỉ là thông tin).

- Cột người (cần quyết): —
- Còn lại (đơn giản): 3 cột

## Formulation_Safety

- Quan trọng: Prohibited match (select), PB caution match (select), Coverage route (select)
- Cột người (cần quyết): —
- Còn lại (đơn giản): 13 cột

## Formulation_Safety

- Quan trọng: Critical safety finding identified (select), Severity (select), Status (select)
- Cột người (cần quyết): Owner, Verifier
- Còn lại (đơn giản): 10 cột

## Formulation_Safety (dòng cố định: không thêm/xóa)

- Quan trọng: Status (select)
- Cột người (cần quyết): —
- Còn lại (đơn giản): 3 cột

## Published_Info_Approval

- Quan trọng: Channel (select)
- Cột người (cần quyết): Person responsible
- Còn lại (đơn giản): 7 cột

## Supplier_RM_Evidence

- Quan trọng: Approved for use? (checkbox), Evidence review status (select), Status (select)
- Cột người (cần quyết): Owner
- Còn lại (đơn giản): 13 cột

## Prohibited_Ingredients (dòng cố định: không thêm/xóa)

- Quan trọng: Product status (select), Classification (select), Reviewer assessment (select), Resolution status (select), Status (select)
- Cột người (cần quyết): Reviewer
- Còn lại (đơn giản): 5 cột

## Prohibited_Ingredients

- Quan trọng: Assessment outcome (select), Reviewer assessment (select), Resolution status (select)
- Cột người (cần quyết): Reviewer, Owner
- Còn lại (đơn giản): 10 cột

## PB_Caution_Limits (dòng cố định: không thêm/xóa)

- Quan trọng: Product status (select), Classification (select), Reviewer assessment (select), Resolution status (select), Status (select)
- Cột người (cần quyết): Reviewer
- Còn lại (đơn giản): 5 cột

## Ingredient_Substitution

- Quan trọng: Status (select)
- Cột người (cần quyết): Owner
- Còn lại (đơn giản): 12 cột

## Eye_Safety_Evidence

- Quan trọng: Status (select)
- Cột người (cần quyết): Owner
- Còn lại (đơn giản): 11 cột

## Fragrance_Safety (dòng cố định: không thêm/xóa)

- Quan trọng: Status (select)
- Cột người (cần quyết): —
- Còn lại (đơn giản): 2 cột

## Fragrance_Safety

- Quan trọng: Status (select)
- Cột người (cần quyết): —
- Còn lại (đơn giản): 8 cột

## Micro_PET_Evidence

- Quan trọng: Status (select)
- Cột người (cần quyết): Owner
- Còn lại (đơn giản): 11 cột

## Stability_Release

- Quan trọng: Status (select)
- Cột người (cần quyết): Owner
- Còn lại (đơn giản): 12 cột

## Potency_Process_Control

- Quan trọng: Status (select)
- Cột người (cần quyết): —
- Còn lại (đơn giản): 10 cột

## Mechanism_Claims_Map

- Quan trọng: Status (select)
- Cột người (cần quyết): —
- Còn lại (đơn giản): 10 cột

## Twinkle5_Claims_Map (dòng cố định: không thêm/xóa)

- Quan trọng: Status (select)
- Cột người (cần quyết): —
- Còn lại (đơn giản): 5 cột

## Efficacy_Assurance (dòng cố định: không thêm/xóa)

- Quan trọng: Status (select)
- Cột người (cần quyết): —
- Còn lại (đơn giản): 2 cột

## Functional_Efficacy

- Quan trọng: Status (select)
- Cột người (cần quyết): Owner
- Còn lại (đơn giản): 11 cột

## Clinical_Human_Evidence

- Quan trọng: Status (select)
- Cột người (cần quyết): Owner
- Còn lại (đơn giản): 13 cột

## Study_Protocol (dòng cố định: không thêm/xóa)

- Quan trọng: Status (select)
- Cột người (cần quyết): —
- Còn lại (đơn giản): 3 cột

## Study_Protocol

- Quan trọng: Status (select)
- Cột người (cần quyết): —
- Còn lại (đơn giản): 8 cột

## Efficacy_Study_Plan

- Quan trọng: Status (select)
- Cột người (cần quyết): —
- Còn lại (đơn giản): 11 cột

## Test_Report_Index

- Quan trọng: Status (select), PIF attached? (select)
- Cột người (cần quyết): Owner
- Còn lại (đơn giản): 12 cột

## Packaging_Specs_Artwork

- Quan trọng: Status (select)
- Cột người (cần quyết): Owner
- Còn lại (đơn giản): 13 cột

## Artwork_Change_Control (dòng cố định: không thêm/xóa)

- Quan trọng: Status (select)
- Cột người (cần quyết): —
- Còn lại (đơn giản): 1 cột

## Formula_Change_Control (dòng cố định: không thêm/xóa)

- Quan trọng: Status (select)
- Cột người (cần quyết): —
- Còn lại (đơn giản): 2 cột

## ASEAN_PIF_Map (dòng cố định: không thêm/xóa)

- Quan trọng: Status (select)
- Cột người (cần quyết): —
- Còn lại (đơn giản): 2 cột

## PIF_Checklist_ASEAN

- Quan trọng: Status (select), Regulatory approval (select)
- Cột người (cần quyết): Owner, N/A authorised by
- Còn lại (đơn giản): 6 cột

## PIF_Checklist_ASEAN (dòng cố định: không thêm/xóa)

- Quan trọng: Status (select)
- Cột người (cần quyết): Reviewer
- Còn lại (đơn giản): 3 cột

## PIF_Evidence_Export

- Quan trọng: Status (select)
- Cột người (cần quyết): Owner
- Còn lại (đơn giản): 9 cột

## SKU_Claims_PIF_Register

- Quan trọng: Claim category (select), Claim risk (select), Regulatory review required (select), Status (select)
- Cột người (cần quyết): Owner
- Còn lại (đơn giản): 13 cột

## PIF_Evidence_Closure (dòng cố định: không thêm/xóa)

- Quan trọng: Status (select)
- Cột người (cần quyết): —
- Còn lại (đơn giản): 2 cột

## Published_Info_Approval (dòng cố định: không thêm/xóa)

- Quan trọng: —
- Cột người (cần quyết): —
- Còn lại (đơn giản): 0 cột

## Published_Info_Approval

- Quan trọng: Workflow state (select), No product claim or technical statement (checkbox), Wording comparison (select), 1. Terminology / claims guidance checked (select), 2. Evidence linked & verified (select), 3. Technical review (select), 4. Regulatory review (where applicable) (select), 5. Final approval before publication (select), Allowed? (select), Status (select)
- Cột người (cần quyết): Equivalence confirmed by, Content owner / author, Technical reviewer, Regulatory reviewer
- Còn lại (đơn giản): 19 cột

## Medical_Summary (dòng cố định: không thêm/xóa)

- Quan trọng: Status (select)
- Cột người (cần quyết): —
- Còn lại (đơn giản): 3 cột

## HCP_Efficacy_Answer

- Quan trọng: Status (select)
- Cột người (cần quyết): Owner
- Còn lại (đơn giản): 7 cột

## HCP_Test_Report_Pack

- Quan trọng: Status (select)
- Cột người (cần quyết): Owner
- Còn lại (đơn giản): 7 cột

## Batch_Formula_Trace

- Quan trọng: Status (select)
- Cột người (cần quyết): Owner
- Còn lại (đơn giản): 11 cột

## Product_Family_Register

- Quan trọng: Current market version? (checkbox), Market communication needed? (checkbox), Communicated to market? (checkbox)
- Cột người (cần quyết): Owner
- Còn lại (đơn giản): 9 cột

## Formulation_Change_Register

- Quan trọng: New VN registration required? (~6mo) (checkbox), Market communication required? (checkbox), Communicated to market? (checkbox), Closed? (checkbox), Overall status (select), NP sign-off (signature)
- Cột người (cần quyết): Change requested by NPD team
- Còn lại (đơn giản): 8 cột

## Change_Templates (dòng cố định: không thêm/xóa)

- Quan trọng: Status (adopted?) (select)
- Cột người (cần quyết): —
- Còn lại (đơn giản): 0 cột

## Development_Brief

- Quan trọng: Brief status (select)
- Cột người (cần quyết): Brief owner
- Còn lại (đơn giản): 4 cột

## Vulnerable_User_Assessment

- Quan trọng: Vulnerable group (select)
- Cột người (cần quyết): Responsible reviewer
- Còn lại (đơn giản): 2 cột

## GMP_Links

- Quan trọng: Status (select)
- Cột người (cần quyết): —
- Còn lại (đơn giản): 11 cột

## Campaigns_Social_Media

- Quan trọng: Claims approved? (Reg) (checkbox), Status (select)
- Cột người (cần quyết): Owner
- Còn lại (đơn giản): 10 cột

## Product_Development_Report (dòng cố định: không thêm/xóa)

- Quan trọng: —
- Cột người (cần quyết): —
- Còn lại (đơn giản): 1 cột

## Product_Development_Report

- Quan trọng: Status (select)
- Cột người (cần quyết): Owner
- Còn lại (đơn giản): 10 cột

## Product_Development_Report

- Quan trọng: Status (select)
- Cột người (cần quyết): Owner
- Còn lại (đơn giản): 6 cột

## Released_Label_Ctrl

- Quan trọng: New label released to market? (select), 3D asset exists? (select), Status (select)
- Cột người (cần quyết): Owner
- Còn lại (đơn giản): 14 cột

## Released_Label_Ctrl

- Quan trọng: New-label stock available? (select), Old image removed? (select), Image updated on platform? (select), Status (select)
- Cột người (cần quyết): Stock confirmed by, Verified by, Owner
- Còn lại (đơn giản): 11 cột

## Released_Label_Ctrl

- Quan trọng: Artwork matches current released label? (select), Batch details match physical stock? (select), Status (select)
- Cột người (cần quyết): Verified by, Owner
- Còn lại (đơn giản): 13 cột

## Template_Index (dòng cố định: không thêm/xóa)

- Quan trọng: Status (select)
- Cột người (cần quyết): —
- Còn lại (đơn giản): 0 cột

## Requirements (dòng cố định: không thêm/xóa)

- Quan trọng: —
- Cột người (cần quyết): —
- Còn lại (đơn giản): 0 cột

## MBC360 FEEDBACK

- Quan trọng: —
- Cột người (cần quyết): —
- Còn lại (đơn giản): 4 cột

## Needs Document

- Quan trọng: Need category (select)
- Cột người (cần quyết): —
- Còn lại (đơn giản): 2 cột

## 1. Needs & Scientific Basis

- Quan trọng: Need domain (select)
- Cột người (cần quyết): —
- Còn lại (đơn giản): 6 cột

## 1. Needs & Scientific Basis (dòng cố định: không thêm/xóa)

- Quan trọng: —
- Cột người (cần quyết): —
- Còn lại (đơn giản): 6 cột

## 1. Needs & Scientific Basis (dòng cố định: không thêm/xóa)

- Quan trọng: —
- Cột người (cần quyết): —
- Còn lại (đơn giản): 1 cột

## 1. Needs & Scientific Basis

- Quan trọng: Evidence status (select)
- Cột người (cần quyết): —
- Còn lại (đơn giản): 6 cột

## 1. Needs & Scientific Basis (dòng cố định: không thêm/xóa)

- Quan trọng: —
- Cột người (cần quyết): —
- Còn lại (đơn giản): 3 cột

## Ingredient Review

- Quan trọng: Research-backed? (select), Recommendation (select)
- Cột người (cần quyết): —
- Còn lại (đơn giản): 5 cột

## Ingredient Review (dòng cố định: không thêm/xóa)

- Quan trọng: —
- Cột người (cần quyết): —
- Còn lại (đơn giản): 1 cột

## 2. Competitor Landscape

- Quan trọng: —
- Cột người (cần quyết): —
- Còn lại (đơn giản): 16 cột

## 2. Competitor Landscape

- Quan trọng: Comparator winner (select), Blinded? (select)
- Cột người (cần quyết): —
- Còn lại (đơn giản): 6 cột

## 2. Competitor Landscape

- Quan trọng: —
- Cột người (cần quyết): —
- Còn lại (đơn giản): 8 cột

## 2. Competitor Landscape (dòng cố định: không thêm/xóa)

- Quan trọng: —
- Cột người (cần quyết): —
- Còn lại (đơn giản): 1 cột

## 3. Target Product & Tech (dòng cố định: không thêm/xóa)

- Quan trọng: —
- Cột người (cần quyết): —
- Còn lại (đơn giản): 5 cột

## 3. Target Product & Tech (dòng cố định: không thêm/xóa)

- Quan trọng: —
- Cột người (cần quyết): —
- Còn lại (đơn giản): 1 cột

## 3. Target Product & Tech (dòng cố định: không thêm/xóa)

- Quan trọng: —
- Cột người (cần quyết): —
- Còn lại (đơn giản): 2 cột

## 4. Evidence & Claim Support

- Quan trọng: —
- Cột người (cần quyết): —
- Còn lại (đơn giản): 7 cột

## 4. Evidence & Claim Support

- Quan trọng: —
- Cột người (cần quyết): Owner
- Còn lại (đơn giản): 5 cột

## 4. Evidence & Claim Support

- Quan trọng: Claim category (select), Claim risk (select), Claims Library status (select), Claim subjects (multiSelect), Evidence basis required (select), Change route (reviewer decision) (select), Evidence grade (select), Regulatory review outcome (select), Technical review outcome (select), Status (select)
- Cột người (cần quyết): Revision approved by, Regulatory reviewer, Technical reviewer
- Còn lại (đơn giản): 16 cột

## 5. Ingredient Monograph

- Quan trọng: Does evidence transfer? (select)
- Cột người (cần quyết): —
- Còn lại (đơn giản): 14 cột

## 6. Evidence & Search Rules (dòng cố định: không thêm/xóa)

- Quan trọng: —
- Cột người (cần quyết): —
- Còn lại (đơn giản): 0 cột

## 6. Evidence & Search Rules (dòng cố định: không thêm/xóa)

- Quan trọng: —
- Cột người (cần quyết): —
- Còn lại (đơn giản): 0 cột

## 6. Evidence & Search Rules (dòng cố định: không thêm/xóa)

- Quan trọng: —
- Cột người (cần quyết): —
- Còn lại (đơn giản): 0 cột

## 6. Evidence & Search Rules (dòng cố định: không thêm/xóa)

- Quan trọng: —
- Cột người (cần quyết): —
- Còn lại (đơn giản): 2 cột

## NPD Front-End Roadmap (dòng cố định: không thêm/xóa)

- Quan trọng: —
- Cột người (cần quyết): —
- Còn lại (đơn giản): 0 cột

## NPD Front-End Roadmap (dòng cố định: không thêm/xóa)

- Quan trọng: —
- Cột người (cần quyết): —
- Còn lại (đơn giản): 0 cột

## NPD Front-End Roadmap (dòng cố định: không thêm/xóa)

- Quan trọng: —
- Cột người (cần quyết): —
- Còn lại (đơn giản): 0 cột
