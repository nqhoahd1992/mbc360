# Rà soát code so với business rule của SME — 2026-10-04

Phạm vi: toàn bộ luật trong `docs/rules/Business_Rules_Confirmation_EN.md` (A1–A5, B1–B5, C1–C7, D1–D5, F1–F14, Round 3, Round 4) và các quyết định của chủ dự án ghi trong CLAUDE.md, đối chiếu với code hiện tại (rule engine ở `packages/shared`, API ở `apps/api`, UI ở `apps/web`).

Cách làm: 5 agent đọc code song song theo 5 nhóm luật, chỉ đọc, không sửa gì. Các phát hiện nghiêm trọng nhất được kiểm tra lại trực tiếp trong code (BOM reconcile, C3, quyết định của người ký, F5). Những điểm đã ghi là câu hỏi mở `[ASSUMPTION: R5-Qn]` **không** tính là lỗi, trừ khi code làm ngược điều SME đã nói. `npm run verify:readiness` vẫn sạch: không lỗi nào dưới đây thuộc loại mà các sweep của nó kiểm tra.

Ký hiệu đường dẫn: `svc` = `apps/api/src/projects/projects.service.ts`, `gp` = `packages/shared/src/utils/gateProgress.ts`, `gr` = `packages/shared/src/config/gateReadiness.ts`.

---

## A. Lỗi làm hỏng thao tác bình thường — sửa trước, không cần hỏi SME

| # | Lỗi | Luật | Chỗ | Hậu quả |
|---|---|---|---|---|
| A1 | `BomLine.fromCosmetri` và `reconciled` **không được lưu xuống DB** (bảng `bom_lines` không có hai cột này) | F14, A5 | `schema.prisma` model BomLine; `svc` setBom; `project-mapper.ts` toBomLine | Tải lại trang là mọi dòng thành "nhập tay chưa đối chiếu", nên `sg07-bom-reconciled` và các mục Cosmetri ở Gate 10/11 **chặn vĩnh viễn**. Dòng nhập từ Cosmetri cũng mất miễn trừ, làm lần lưu BOM sau bị chặn |
| A2 | Lưu Next Actions xoá rồi tạo lại với **id mới** | Q32/Q33 (action có kiểm soát) | `svc` setNextActions ~2640 | Mọi finding hoặc watch-list đang trỏ `linkedNextActionId` bị mất liên kết, gate bị chặn lại. Sau đó lưu lại sổ cũng bị từ chối |
| A3 | Change Control chỉ cho chọn rủi ro **Low/Medium/High**, không có Critical, và không sửa được sau khi tạo | Q34(a), Q3 | `apps/web/src/pages/ChangeControl.tsx:451` | Thay đổi nghiêm trọng không ghi được đúng mức, và không nâng mức được |
| A4 | `sg10-pif-mapped` Mandatory với **mọi** dự án | E2 | `gr:2456` | Dự án chỉ bán EU không qua được Gate 10 nếu không đánh "ASEAN PIF mapped = Completed" |
| A5 | `sg07-final-safety` bắt cả 10 câu Completed, **gồm câu mẹ bầu và câu tiếp xúc em bé**, và không có lựa chọn N/A | E1 | `gr:1788`, fixed rows `formulationSafetyFinalSignOff` | Sản phẩm cho người lớn thông thường vẫn phải làm đánh giá mẹ bầu |
| A6 | `pvPmsRequired` bật khi Vulnerable-User Assessment có **bất kỳ** dòng nào, kể cả dòng "No vulnerable-user group identified" mà sg02 bắt buộc | Q4 | `gp` ~306 | Mọi dự án bị coi là phải giám sát hậu mãi tăng cường, và có thêm mốc review 1 tháng |
| A7 | Sản phẩm **không có claim** không qua được Gate 3 | Q19(d) | `gr:970` `sg03-classification` | Mục khai báo "không có claim" chỉ thoả chính nó; mục phân loại vẫn chặn trên sổ claim rỗng |
| A8 | `vulnerableGroupsCovered` tự suy lại nhóm nhạy cảm, chỉ từ các ô tích, **bỏ qua nhóm tuổi Family use** (bản sao lệch của `expectedVulnerableGroups`) | Q25(c) | `gp` ~1054 | Family use có Child 2+ mà chỉ ghi "không có nhóm nhạy cảm" vẫn qua Gate 2 |
| A9 | Thị trường đã Withdrawn vẫn là một làn ký | Q18, Q14 | `gateSignOff.ts:86` (đọc `identity.markets`) | Rút một nước thì Gate 10–12 bị chặn mãi; supersession cũng đòi quyết định cho nước đã rút |
| A10 | Claims Library khi rút: đọc `data.sku` trong khi các sổ dùng `productSku` | Q28(5) | `claims-library.controller.ts:280` | Danh sách ảnh hưởng không bao giờ liệt kê SKU |

**Trạng thái (04/10/2026): đã sửa cả 10 mục.** Kiểm bằng type-check 3 package, `verify:readiness`, `verify:scaffold`, oxlint, và 10 ca hành vi chạy trên một project dựng từ config (A6–A9).

| # | Đã sửa thế nào |
|---|---|
| A1 | Thêm 4 cột vào `bom_lines` (`methodRef`, `fromCosmetri`, `reconciled`, `rmDisplayName`) — migration `20261004150132_bom_line_cosmetri_flags`. `setBom`, `createFormulaVersion` và mapper đều đọc/ghi chúng. Việc nhập từ Cosmetri chuyển về server (`POST /projects/:id/bom/import-cosmetri`): server tự đọc công thức, ghi dòng và dòng stub Supplier & RM Evidence trong một transaction. `setBom` từ chối mọi dòng `fromCosmetri` không khớp một dòng đã nhập (đổi supplier hoặc % w/w cũng bị từ chối; INCI/CAS vẫn sửa được). Thử end-to-end 16 ca trên API tạm |
| A2 | `setNextActions` giữ id: cập nhật dòng còn, tạo dòng mới với id client gửi, chỉ xoá dòng đã bị bỏ |
| A3 | Có đủ 4 mức (`RISK_LEVELS`) lúc tạo, sửa được trong drawer; server từ chối giá trị ngoài danh sách |
| A4 | `sg10-pif-mapped` thành Conditional, trigger `aseanMarket` |
| A5 | Check mới `finalSafetySignOffComplete`: câu mẹ bầu được N/A kèm lý do khi trigger `skincareForTwo` đã xét là không áp dụng. Câu tiếp xúc em bé **giữ nguyên** vì E1 không nhắc tới |
| A6 | `pvPmsRequired` chỉ bật khi có dòng **nêu tên một nhóm** (`namesVulnerableGroup`) |
| A7 | Check mới `noClaimsDeclared` (sổ claim rỗng **và** Key Gate Check claim là N/A kèm lý do) đủ cho `sg03-claims`, `sg03-classification`, `sg03-evidence-reqs` |
| A8 | Check dùng chung `expectedVulnerableGroups()`; bỏ bản sao |
| A9 | `activeMarkets()` bỏ nước đã rút khỏi làn ký Gate 10–12 và khỏi supersession (server, rule engine và thẻ trên web). Riêng Gate 12 là diễn giải → `R5-Q28` |
| A10 | Đọc `productSku` |

## B. Gate qua được khi lẽ ra không được — vượt luật

**Chữ ký và quyết định gate**
| # | Lỗi | Luật | Chỗ |
|---|---|---|---|
| B1 | Chữ ký gate chỉ xét "đã ký" (`signedAt`), **không xét quyết định**. Người duyệt ký Hold, sau đó người có quyền decide sửa thẳng thành Proceed qua `updateGate` → gate qua | Q29(5) | `gateSignOff.ts:118`, `gp:643`, `svc:3325` |
| B2 | Gate 10–12 theo thị trường nhưng **mọi làn ghi chung một `gateRecord.decision`**: Úc ký Hold, Việt Nam ký Proceed → gate qua. Việt Nam không ghi được Proceed khi làn Úc chưa ký | Q18, E3(a) | `svc:1448, 1508, 1514` |
| B3 | Vẫn còn **hai đường ghi quyết định gate** (chữ ký người duyệt, và dropdown/`updateGate`) | Q29(5) | `svc:3324, 3400`; `GateFlowTable.tsx:405` |
| B4 | Ký và rút chữ ký gate **không kiểm tra khoá gate**. Rút chữ ký Approved ở gate đã qua làm gate mất trạng thái qua mà không có Backtrack; ký được "Backtrack" hay "N/A" làm quyết định | B4 | `svc:1370, 1524` |
| B5 | Backtrack và phiên bản Major **không huỷ chữ ký gate**, chỉ huỷ chữ ký phase và chữ ký đóng sổ | B4, A2 | `svc:3540, 3080` |
| B6 | Phase "Approved" chỉ xét đã ký, **không xét quyết định**: Approved by ký Hold vẫn đóng được phase | B3(d) | `types/index.ts:400`, `gp:1834` |
| B7 | Đường ký của người duyệt **bỏ qua `assertCanCarryConditions`**, và cũng không có bước xác nhận change đang mở (F9) | Q32(c), Q34(d), F9 | `svc` signGateSignOff |

**Yêu cầu readiness**
| # | Lỗi | Luật | Chỗ |
|---|---|---|---|
| B8 | Mục Conditional đã được kích hoạt vẫn gạt được bằng **N/A + ghi chú**. Chỉ `sg07-screen-check` có `naInvalidWhenTrigger`; các mục bị ảnh hưởng: `sg03-benchmark`, `sg09-scaleup`, `sg12-feedback-review`, `sg12-pv-pms`, `sg12-change-links` | A1 (Round 3) | `gp:994`, `gr:1067, 2316, 2762, 2814, 2871` |
| B9 | `sg12-performance` **tự thoả**: cùng một ô tích vừa kích hoạt vừa làm mục đạt | Q15 | `gr:2825`, `gp:549` |
| B10 | Gate 10 chấp nhận **mọi giá trị** trạng thái checklist và regulatory approval của thị trường (kể cả "Not Approved", "Blocked") | E3(a), F1 | `utils/marketDossier.ts` checklistRowGap |
| B11 | Costing "Not Feasible" vẫn được tính là đạt với Proceed thường | Q36(b) | `gp:1134` |
| B12 | `sg07-reviewer` đạt chỉ nhờ 10 ô ngày; cột owner là seed, không sửa được, không có ai được nêu tên | F1 Gate 7 | `registers.ts:2232` |
| B13 | Giá trị không hợp lệ lọt qua server và làm luật hiểu sai: `gapCriticality:'critical'`, `priority:'must'`, `riskLevel:'critical'`, `impactAreas:['Other']`, `scaleUpRiskIdentified:'N/A'` | Q3, Q21, Q34, Q12 | `svc` gateWriteData, setRequirementSection, setChanges, setAssessments |
| B14 | Đổi status thành Complete cùng lúc với Proceed thì **tắt mọi kiểm tra gap**, kể cả khi `gapCriticality = Critical` | F7, Q3 | `gapCriticality.ts` |

**An toàn nguyên liệu và claim**
| # | Lỗi | Luật | Chỗ |
|---|---|---|---|
| B15 | Kết quả đối chiếu công thức với watch-list (C3) **chỉ để hiển thị**, không ghi vào sổ, không chặn gate nào | C3 | `ingredientWatch.ts` bomWatchMatches (chỉ BomCosting, WatchlistRegister) |
| B16 | `gate4Disposition` không được luật nào đọc; "Prohibited — remove" không chặn gì | Q6 | `registers.ts:444` GATE4_DISPOSITION_PROHIBITED (không dùng) |
| B17 | `sg04-pb-screen` ngược mức độ: chặn cả khi đã có đánh giá không-critical kèm action, nhưng lại cho qua "Exceeds limit - reformulate" | Q6, Q32 | `gr:1352` |
| B18 | `sg07-prohibited-closed` thiếu "Needs Safety Review" trong danh sách giá trị chặn | Q32(a), Q6 | `gr:1795` |
| B19 | Rà soát claim ở Gate 3 chỉ đòi **3 trên 5 trường** (thiếu rationale, evidence link); outcome "Not Approved" vẫn được tính là đã rà soát | Q27 | `claimReview.ts:93` |
| B20 | Hai điều kiện C1 ("chưa có trong Claims Library", "thị trường hạn chế") kích hoạt mục nhưng không đưa claim nào vào diện phải rà soát, nên mục tự đạt. Claim mới cũng không có Technical review | C1, Q28(2) | `gp:413-441, 701, 1038` |
| B21 | Khoá revision của claim bị vượt bằng hai lần lưu (xoá trường duyệt rồi đổi câu chữ); trường duyệt do client gõ | Q26, Q30(b) | `claimEvidence.ts:162` |
| B22 | Released không kiểm claim có outcome "Not Approved", hay thị trường/kênh chưa được duyệt; ghi chú coverage của `sg10-artwork-claims` nói đã kiểm ở Published Info là sai | Q30(c) | `claimEvidence.ts:203`, `gr:2533` |
| B23 | Workflow phát hành C6/F11 (5 bước, vai trò Technical/Regulatory/Final) **không được kiểm tra**; không sinh deviation record; `sg11-published-approved` bỏ sót "Regulatory Review Complete" và giá trị trống | C6, F11 | `claimEvidence.ts:250`, `gr:2708` |

**Next Actions và hậu mãi**
| # | Lỗi | Luật | Chỗ |
|---|---|---|---|
| B24 | Next Action Critical có thể bị huỷ hoặc xoá bởi bất kỳ ai; `verifiedBy` do client gửi; không bắt verifier khác owner; không có khoá gate. Thêm hoặc huỷ action ở gate đã qua làm gate mất hoặc lấy lại trạng thái qua mà không có Backtrack | F8, B4 | `svc:2632`, `NextActionsCard.tsx` |
| B25 | Hạ PIF xuống In Progress mà launch vẫn Approved; ngày launch thực tế vẫn được nhận | C5 | `svc:2682, 2690`, `MarketTrackingCard.tsx:67` |

**Trạng thái (04/10/2026): đã sửa cả 25 mục, trừ một phần của B23 (xem dưới).** Kiểm bằng type-check 3 package, `verify:readiness`, `verify:scaffold`, lint, 28 ca luật trên project dựng từ config, và 21 ca end-to-end trên API tạm (cổng 3100). Mỗi chỗ diễn giải có tag và câu hỏi **R5-Q29 → R5-Q40**.

| # | Đã sửa thế nào | Câu hỏi |
|---|---|---|
| B1 | Một làn chỉ tính là đã ký khi người duyệt ký Proceed/PwC | — |
| B2 | Quyết định gate theo thị trường = kết quả gộp, chỉ ghi khi mọi làn đã có người duyệt ký; làn này duyệt được dù làn khác còn mở | — |
| B3 | Dropdown không ghi được Proceed/PwC; không đổi được quyết định khi đã có chữ ký duyệt (server và UI) | — |
| B4 | Chỉ ký được gate đang mở; không rút được chữ ký của gate đã qua; không ký "Backtrack" | — |
| B5 | Backtrack và phiên bản Major xoá chữ ký gate (giữ người được đề cử); chữ ký cũ nằm trong audit | — |
| B6 | Phase chỉ "Approved" khi Approved by ký Proceed/PwC | — |
| B7 | Đường ký đi qua `assertCanCarryConditions`; F9 với Proceed thường đã bị chặn sẵn, PwC bắt buộc có comment | — |
| B8 | Mục Conditional đang trigger không nhận N/A | R5-Q29 |
| B9 | `sg12-performance` đọc dòng triage của Gate 12 | R5-Q30 |
| B10 | Checklist thị trường phải Complete, approval phải Approved/Approved with Conditions (hoặc N/A có lý do) | R5-Q31 |
| B11 | Dự án phụ thuộc thương mại: chỉ "Commercially Feasible" qua Proceed thường | R5-Q32 |
| B12 | `sg07-reviewer` đọc chữ ký Gate 7 (Q29(4) đòi Safety) | — |
| B13 | Server kiểm danh sách giá trị: stage status, decision, gap, requirement status/priority (N/A chỉ ở section cho phép), impact area, 4 câu trả lời assessment, nhóm tuổi Family use | — |
| B14 | Mức Critical/High vẫn có hiệu lực khi rời Gap; ô đánh giá vẫn hiện để xoá; sửa lỗi xoá mức gap không bao giờ tới server | R5-Q33 |
| B15 | Mục mới Gate 7: mọi kết quả tự đối chiếu phải được tiếp nhận trên dòng watch-list | R5-Q34 |
| B16 | Disposition "Prohibited — remove" chặn ở Gate 4 và Gate 7, cả hai sổ | — |
| B17 | `sg04-pb-screen`: chặn "Exceeds limit"; dòng "Needs … Review" để các mục reviewer-trail xử lý | — |
| B18 | Thêm "Needs Safety Review" vào `sg07-prohibited-closed` | — |
| B19 | Đủ 5 trường rà soát; chỉ Approved/Approved with Conditions là đạt | R5-Q35 |
| B20 | Điều kiện "chưa có trong Library" và "thị trường hạn chế" đưa claim vào diện rà soát; thêm Technical review cho claim mới | R5-Q36 |
| B21 | Trường duyệt revision bị khoá cùng revision; chỉ ghi được tên chính mình, cần quyền Regulatory hoặc quyết Gate 10 | R5-Q37 |
| B22 | Artwork và Published Info chặn claim "Not Approved" và claim chưa duyệt cho thị trường/kênh; sửa ghi chú coverage | R5-Q38 |
| B23 | `sg11-published-approved` chặn thêm "Regulatory Review Complete" và ô trống; phát hành phải đủ 5 bước + Technical Reviewer + Final Approver (+ Regulatory khi có claim). **Chưa làm, theo quyết định của chủ dự án (hướng A):** bản ghi deviation — app chặn trong app, sự cố ngoài app ghi vào CAPA trong lúc chờ SME | R5-Q41 |
| B24 | Server ghi `raisedBy`/`verifiedBy`; chủ action không tự đóng; action Critical chỉ người nêu / chủ gate / người quyết gate đóng được; không xoá action Critical đang mở; gate đã qua phải vẫn qua | R5-Q39 |
| B25 | Không hạ PIF khỏi Approved khi launch approval còn hiệu lực (server và UI) | R5-Q40 |

**B2 và B7 đã thử end-to-end (04/10/2026)** với chữ ký thật: authenticator đăng ký qua API, mã sinh trong script, chữ ký vẽ đã lưu, Lead đề cử người ký; hai thị trường Vietnam/Australia ở Gate 10. 10/10 ca đạt:
- Vietnam duyệt được khi Australia còn mở, và quyết định gate vẫn trống.
- Người duyệt không có quyền finding bị từ chối Proceed with Conditions (403).
- Australia ký Hold thì quyết định gate là Hold.
- Dropdown không ghi đè được.
- Rút chữ ký thì xoá kết quả gộp; ký lại Proceed thì gate thành Proceed.

Để Gate 10 thành gate đang mở trên project tạm, API tạm chạy với một preload chỉ dùng cho test: SG10 mở, chặn quyết định chỉ còn các mục chữ ký. Code app không đổi. B5 thử bằng một chữ ký chèn trực tiếp vào DB rồi tạo phiên bản Major. Đã dọn sạch dữ liệu test; authenticator thật của App Admin không bị đụng tới.

## C. Thiếu kiểm tra quyền hoặc danh tính ở server

| # | Lỗi | Luật | Chỗ |
|---|---|---|---|
| C1 | `createFormulaVersion` không kiểm tra quyền; `majorCriteria` và `classificationConfirmedBy` được nhận rồi bỏ qua; người xác nhận là chữ tự do | F5, A2 | `svc:2953` |
| C2 | `setChanges` thay cả danh sách, không kiểm tra quyền, xoá được change đang mở; audit chỉ ghi số lượng | F9, B4 | `svc:3187` |
| C3 | Supersession không kiểm tra quyền; lưu nháp sửa được dữ kiện mà vẫn giữ `confirmedBy` cũ | Q2 | `svc:2780, 2819` |
| C4 | `acceptPreWork`: ai cũng chấp nhận được, không kiểm phase đã mở, Backtrack không xoá; dữ liệu pre-work không được gắn nhãn (UI nói có gắn) | F13, B5 | `svc:1624`, `PhasePage.tsx:280` |
| C5 | C2 so sánh phòng ban **do client gõ**, bỏ qua nếu trống; không lấy từ SSO | C2 | `svc:2857`, `StudyApprovalCard.tsx` |
| C6 | Các trường "xác nhận bởi" là chữ tự do, không lấy từ phiên và không cần quyền: `equivalenceConfirmedBy` (D2), `administrativeOnlyConfirmedBy` (Q11), `changeControlReviewer` (Q8), `gapAssessor` (Q3) | D2, Q11, Q8, Q3 | registers.ts, `svc` setAssessments |
| C7 | Miễn trừ "không có claim sản phẩm" được tự xác nhận mỗi khi người có quyền lưu bảng vì lý do khác | Q30(e) | `svc:257` syncPublishedInfoDerived |
| C8 | `BacktrackEvent.initiatedBy` lấy từ client | B4 | controller:739 |
| C9 | Thiếu khoá gate ở server cho: Evidence Summary, Study approvals, Assessments (ví dụ đổi nhóm tuổi Family use sau khi qua Gate 2 sẽ tắt luôn lộ trình trẻ nhỏ) | B4 | `svc` setEvidenceItems, setStudyApprovals, setAssessments |
| C10 | Xác nhận change đang mở (F9) chỉ có ở UI và ghi vào ô notes sửa được | F9 | GateFlowTable |
| C11 | `assertCanCarryConditions` áp kiểm tra quyền Gate 4 và Gate 11 cho Proceed with Conditions ở **mọi** gate (quá rộng), nhưng lại bị bỏ qua ở đường ký (B7) | Q32(c), Q34(d) | `svc:315` |
| C12 | `expectedVersion` thiếu thì bỏ qua kiểm tra 409 | BACKEND_PLAN §8 | `svc:3648` |

**Trạng thái (04/10/2026): đã sửa cả 12 mục.** Kiểm bằng type-check 3 package, `verify:readiness`, `verify:scaffold`, lint, 21 ca end-to-end trên API tạm, và 5 ca khoá gate (C9) chạy với một preload chỉ dùng cho test, coi các gate liên quan là đã qua. Hai câu hỏi mới: **R5-Q42**, **R5-Q43**. Migration `20261004162715_formula_version_classification`.

| # | Đã sửa thế nào | Câu hỏi |
|---|---|---|
| C1 | Tạo phiên bản công thức cần quyền Technical hoặc Quality; người khởi tạo và người xác nhận lấy từ phiên đăng nhập; tích tiêu chí thì bắt buộc Major; tiêu chí và người xác nhận được lưu (cột mới) | R5-Q42 |
| C2 | Chỉ xoá được change Draft; audit ghi change nào thêm, bớt, sửa trường gì. Quyền sửa change vẫn để mở theo A4 | — |
| C3 | Xác nhận supersession cần `market-track\|approve`; quyết định đã xác nhận bị khoá | R5-Q8 (đã có) |
| C4 | Chỉ chấp nhận pre-work khi phase đã mở, và chỉ review owner của phase hoặc Project Lead; Backtrack/phiên bản Major xoá việc chấp nhận của các phase bị khoá lại. **Chưa làm:** gắn nhãn pre-work cho từng mục — đã sửa câu chữ trên màn hình cho đúng sự thật | R5-Q43 |
| C5 | Phòng ban lấy từ tài khoản SSO của từng người; tên phải là người dùng thật; thiếu phòng ban thì không xác nhận được tính độc lập. Màn hình hiện phòng ban theo người được chọn | — |
| C6 | Các ô "xác nhận / rà soát / đánh giá bởi" chỉ ghi được chính mình (assessments, gap assessor, cột register có `selfAttest`); giao diện đổi sang nút "Record as me". Ai có thẩm quyền xác nhận thì chưa ràng buộc | — |
| C7 | Miễn trừ "không có claim" chỉ được xác nhận khi người rà soát tích "Confirm exemption" | — |
| C8 | `initiatedBy` của Backtrack và phiên bản công thức lấy từ phiên đăng nhập | — |
| C9 | Khoá gate ở server và giao diện cho Evidence Summary (theo từng dòng), Study approvals (gate 08), Assessments (theo gate của từng câu hỏi) | — |
| C10 | Bỏ hộp xác nhận ghi vào notes; chữ ký người duyệt ghi kèm danh sách change đang mở được chấp nhận (audit), panel ký cảnh báo trước | — |
| C11 | Quyền chấp nhận finding chỉ đòi ở gate có mục watch-list conditional (SG04); quyền chấp nhận tác động change chỉ ở SG11 — suy từ cấu hình | — |
| C12 | `expectedVersion` bắt buộc với mọi lần ghi | — |

## D. Luật đã được SME trả lời nhưng chưa xây

- **E3(a)/Q18 — Gate 10–11 theo từng thị trường:** `sg10-reg-approval`, `sg11-gate10`, `sg11-launch` vẫn `manual`, không bao giờ chặn. `MarketTrack` chưa có phiên bản công thức và phiên bản artwork áp dụng. Snapshot chữ ký từng thị trường không chứa trạng thái của thị trường đó.
- **F4:** tạo phiên bản mới thì **mọi** market track bị chuyển sang phiên bản mới (`svc:3044`), kể cả thị trường đã launch.
- **Q2:** phiên bản cũ chuyển sang Transition in Progress **ngay khi tạo** phiên bản mới, không phải khi phiên bản mới được duyệt; xảy ra với cả bản chưa từng launch; các trạng thái Transition Approved, Withdrawn, Cancelled không bao giờ đạt tới.
- **Q4/Q13:** `postLaunchReviewDue` và `productPerformanceFeedback` truyền `enhanced:false`, nên mốc 1 tháng bị bỏ qua. Baseline và enhanced review dùng chung một ô tích. Trigger tín hiệu thị trường bỏ mất phần lớn các tín hiệu SME nêu (khiếu nại, khách hàng, nhà phân phối, tranh chấp claim, vấn đề lặp lại). Chưa có record review tín hiệu ngay lập tức.
- **Q23(a):** "Product form under evaluation" không bắt action có kiểm soát, và Gate 5 không kiểm tra dạng sản phẩm đã được chốt (Roadmap đang đánh ✅).
- **Q19(c):** SKU chỉ kế thừa category và risk; chưa kế thừa câu chữ, revision, trạng thái bằng chứng; `inheritFromClaim` chỉ có ở UI.
- **Q23(b):** không bắt mỗi dòng công thức phải có safety decision.
- **Q36(a):** `evidenceBasisRequired` không bắt buộc ở gate nào.
- **Q8:** trả lời "Yes" không kiểm `changeControlRecordId`; "No" không bắt reviewer và rationale ở mục Gate 12.
- **Q9:** mục Gate 8 đọc một ô tích, không đọc workflow C2 thật và log consent/recruitment.
- **A3 (Gate 9):** trigger scale-up bỏ mất điều kiện "công thức mới".
- **F7:** gap Medium/Low cho Proceed with Conditions mà không cần action có kiểm soát và người chấp nhận có thẩm quyền (giới hạn không gắn tag).
- **F11:** không sinh deviation record khi phát hành chưa được duyệt.
- **F3:** thứ tự khớp nguyên liệu (RM id → INCI → CAS → synonym) khác code (CAS → từ khoá); header `ingredientWatch.ts` còn nói F3 chưa được trả lời.
- **Q28(5):** khi rút một mục Claims Library, danh sách ảnh hưởng chưa có artwork và publication record, chưa ghi ngày hiệu lực hay kế hoạch chuyển tiếp. Sửa category, risk hoặc phạm vi áp dụng không huỷ hai chữ duyệt; sửa câu chữ của mục đã rút lại đưa nó về Proposed.
- **Q24:** chặn xoá thị trường chưa xét ngày launch, chữ ký theo thị trường, review hậu mãi, supersession; thêm thị trường sau Gate 1 phải Backtrack; xoá thị trường là xoá dòng thay vì đánh dấu Withdrawn.
- **Q10/Q15:** `PERFORMANCE_ISSUE_TYPES` tính cả mọi claim question và bỏ sót "Product optimisation opportunity".
- **Thấp:** `sg02-brief` tính "Superseded" là đã duyệt; `sg10-claim-evidence` không đọc `pifLink`; `sg10-artwork` và `sg11-artwork` nhận bất kỳ giá trị nào; `regulatoryReviewRequired` (Q19b) không được đọc; claim category "Other — Regulatory review required" không kích hoạt rà soát; `sg05-version` đọc ô tích thay vì dữ liệu phiên bản; `sg06-market-pack` không có trigger (A2 đã đưa danh sách).

**Trạng thái (04/10/2026): đã làm mọi mục trừ F4 và Q2 (chờ chủ dự án chọn phương án).** Kiểm bằng type-check 3 package, `verify:readiness`, `verify:scaffold`, lint, 25 ca luật trên project dựng từ config, và 14 ca end-to-end trên API tạm. Câu hỏi mới **R5-Q44 → R5-Q51**. Migration `20261004164654_confirmed_product_form`, `20261004165213_claims_library_withdrawal_plan`, `20261004165600_market_pack_requirements`.

| Mục | Đã làm | Câu hỏi |
|---|---|---|
| E3(a)/Q18 | `sg10-reg-approval`, `sg11-gate10`, `sg11-launch` hết `manual`: đòi mọi thị trường đang hoạt động (bỏ qua thị trường đã rút) | R5-Q44 |
| F4, Q2 | **Chưa làm** — cần mô hình track theo phiên bản công thức và định nghĩa "phiên bản mới được duyệt"; chờ chủ dự án chọn | — |
| Q4/Q13 | Trigger dùng `enhanced` thật (mốc 1 tháng); tín hiệu kéo review sớm thêm "Quality issue" và nguồn "Regulator". **Chưa làm:** record review tín hiệu ngay lập tức; baseline/enhanced vẫn dùng chung một dòng Key Gate Check | R5-Q45 |
| Q10/Q15 | Thêm "Product optimisation opportunity"; giữ mọi claim question (không phân biệt được) | R5-Q45 |
| Q23(a) | Gate 2: để ngỏ dạng sản phẩm thì phải có Next Action ở Gate 5; Gate 5: trường mới "Confirmed product form" | R5-Q46 |
| Q19(c) | Dòng SKU kế thừa câu chữ, revision, trạng thái bằng chứng; server chép từ claim mỗi lần lưu | — |
| Q23(b) | Thiếu safety decision được nêu theo từng dòng công thức | — |
| Q36(a) | Evidence basis bắt buộc ở Gate 3 (trừ khi "không có claim") | R5-Q47 |
| Q8 | Đã có chốt chặn khi lưu (Yes → phải có change; No → lý do + người rà soát); không đổi | — |
| Q9 | Gate 8 đọc workflow C2 thật + dòng Consent and recruitment log | — |
| A3 (Gate 9) | "New development" kích hoạt scale-up | R5-Q48 |
| F7 | Gap Medium/Low cũng cần action, chủ action, người đánh giá để Proceed with Conditions | R5-Q16 (đã có) |
| F11 | Hướng A (xem B23) | R5-Q41 |
| F3 | Chỉ sửa ghi chú: F3 đã được trả lời, chờ bộ dữ liệu thật | — |
| Q28(5) | Danh sách ảnh hưởng có artwork và publication record; rút phải ghi ngày hiệu lực + kế hoạch chuyển tiếp; sửa category/risk/phạm vi cũng huỷ hai chữ duyệt; mục đã rút không sửa được (trước đây sửa câu chữ làm nó quay về Proposed) | — |
| Q24 | Thêm thị trường được cả sau Gate 1; bỏ thị trường có lịch sử bị từ chối (đánh dấu Withdrawn) | R5-Q49 |
| Thấp | `sg02-brief` cần một brief Approved; `sg10-claim-evidence` đọc PIF link; `sg11-artwork` cần phiên bản + file; Q19(b) đọc `regulatoryReviewRequired`; "Other — Regulatory review required" kích hoạt rà soát; `sg06-market-pack` có trigger từ trường mới "Pack requirements" của hồ sơ thị trường. Giữ nguyên `sg10-artwork` (ô duyệt là chữ tự do theo workbook) và `sg05-version` | R5-Q50, R5-Q51 |

## E. Cần hỏi SME (hai nguồn mâu thuẫn)

- Dự án thuần hành chính được miễn rà soát đối thủ (A3, Q11), nhưng `sg03-npd-competitor-content` và `sg05-npd-competitor-content` (workbook v2 của chuyên gia) là Mandatory, không có điều kiện.
- Sáu bảng requirement của lộ trình trẻ nhỏ cho phép N/A cả với dòng "Capture/Require" không có điều kiện (đã có trong R5-Q22).

## Tài liệu ghi sai so với code

- `PhasePage.tsx:280`: nói dữ liệu pre-work "được ghi nhận là Pre-work / Entered Before Gate Opened", nhưng không có gì ghi nhận điều đó.
- CLAUDE.md: "muốn sửa gate đã qua phải Backtrack". B4 và B24 là phản ví dụ.
- Comment `sg12-pms-baseline` và CLAUDE.md: gọi là "unconditional", thực tế là Conditional theo `productMarketed`. Coverage note `sg12-pv-pms` ghi "10/14 điều kiện" nhưng liệt kê 9+3.
- Comment `sg07-maternal-caution`: nói lộ trình trẻ nhỏ "chưa làm", thực tế đã làm.

## Đã kiểm tra và đúng

B1 (lõi), B2, B3 (a–c, e) có server kiểm tra, khoá một-gate-mở, phạm vi và snapshot Backtrack, cascade A2, C1 chặn SG07, phân tầng C7/F1 và Conditional chỉ chặn khi kích hoạt, Q7 tri-state, Q3 Critical/High khi status Gap, Q29 (1)–(4) thứ tự ký / tách người / chức năng độc lập / danh sách quyết định cần comment, C5 chặn launch khi PIF chưa Approved, D1–D4, "No role, no entry", PINNED_ADMINS, chế độ xem trước View as, kiểm tra giá trị dropdown của register, Gate 1 (B1–B3, Q20, Q22, Q24), lộ trình trẻ nhỏ Q1/Q25(c), Q5 ba lớp, Q31(f), Q17, Q13 thang review, Q14 roll-up, Q10/Q35 danh sách giá trị, Claims Library hai quyền duyệt và trạng thái tự suy.
