# Các trường hợp đáng bàn lại về luật khóa và chữ ký

Ghi ngày 2026-10-09. Luật chung (SW-4, SW-5, SW-19, SW-20 trong `Software_Rules.md`) đã chạy và được kiểm thử. Các mục dưới đây là **trường hợp riêng hoặc điểm chưa chắc** mà chủ dự án chủ động hoãn lại, để xem sau. Không mục nào làm sai luật chung; mỗi mục là một chỗ luật chung cho kết quả mà thực tế có thể không muốn.

Mỗi mục ghi: chuyện gì, vì sao đáng bàn, hiện đang xử lý ra sao, cần quyết gì.

## A. Sổ nhận dữ liệu kéo dài quá gate cuối của nó

**A1. Kết quả ổn định dài hạn (`stabilityRelease`, gate 09/11).**
- F1 Gate 9: *"Longer-term stability may remain ongoing where an approved launch protocol and sufficient supporting data exist."* Kết quả các mốc 6, 12 tháng tới sau Gate 9, thậm chí sau Gate 11.
- Hiện các cột kết quả gắn G09, nên sau SG09 không thêm hàng và không sửa các cột đó; sau SG11 khóa cả sổ.
- Cần quyết: bỏ thẻ G09 (sổ mở tới hết Gate 11), hay coi sổ theo dõi dài hạn là loại không nên khóa theo gate. Gắn với R5-Q62.

**A2. Cùng kiểu với A1: mọi sổ ghi dữ liệu liên tục sau khi sản phẩm ra thị trường** (hậu mãi Gate 12, theo dõi khiếu nại). Luật hàng chặn thêm hàng khi đã có cột bị khóa; cần rà xem sổ nào thực tế còn nhận hàng mới sau gate cuối của nó.

**A3. Check "Quality release pathway" ở Gate 11 đòi mọi hàng có `releaseDecision`.** Mỗi hàng của sổ ổn định là một kết quả (lô, mốc, thông số). Quyết định phát hành có thể là một dòng cho mỗi lô, không phải mỗi kết quả. Nếu vậy check đòi quá nhiều. Lỗi cấu hình có từ trước, chưa liên quan luật khóa.

## B. Phân loại "nhập" và "chỉ đọc" chưa được SME xác nhận

**B1. R5-Q62:** `releaseDecision` nhập ở Gate 11 (hiện chọn) hay Gate 9.

**B2. R5-Q63:** `productStatus` của hai watch-list nhập tới Gate 7 (hiện chọn). Bằng chứng ủng hộ: check `bomMatchesTakenUp` ở Gate 7 đòi người dùng cập nhật trạng thái theo công thức cuối. Cần xem thực tế cột này do người nhập hay máy điền theo BOM; nếu máy điền thì có thể không cần gate nào sở hữu.

**B3. `packagingSpecsArtwork`:** cột Gate 6 và Gate 10 được gắn theo cấu hình readiness, không phải theo lời SME. Gate 11 vẫn nằm trong danh sách dù readiness của nó không đọc sổ này.

**B4. Các sổ nhiều gate không có thẻ cột** (`formulationSafetyMatrix`, `formulationSafetyFinalSignOff`, `artworkChangeControl`, `releasedLabelRegister`, `productFamilyRegister`, `campaignsSocialMedia`, …): mọi cột thuộc gate cuối của sổ, nên chỉ khóa cùng lúc với cả sổ. Thoáng hơn cách đo cũ. Cần quyết có gắn thẻ từng cột cho sổ nào quan trọng hay không.

**B5. R5-Q59 đến R5-Q61** (Next Action sau khi gate pass, Critical): chờ SME. Round 5 chưa gửi.

## C. Hệ quả của luật chung cần chủ dự án chấp nhận rõ

**C1. Nguyên liệu mới sau Gate 4 phải Backtrack** (Supplier & RM Evidence khóa hàng từ SG04). Lập luận: nguyên liệu mới là đổi công thức, và đổi công thức lớn vốn đã mở lại Gate 4 đến 9. Chưa kiểm tra trường hợp đổi công thức nhỏ (Minor).

**C2. Bỏ duyệt một nguyên liệu ở Gate 10 hoặc 11** (phát hiện nguyên liệu không còn đạt): cột `approvedForUse` thuộc Gate 7, đã khóa. Phải Backtrack về Gate 7.

**C3. Thêm thị trường sau khi mọi gate đã pass làm SG10 hết pass** vì làn của thị trường mới chưa ký (E3(a)). Đúng thiết kế, nhưng đáng biết nếu thêm thị trường sau khi đã ra mắt.

**C4. Tick Key Gate Check sau khi đã ký làm chữ ký stale**, nên đóng phase (đòi mọi Key Gate Check xong) sau khi đã ký có thể làm các gate hết pass. Hoặc chấp nhận, hoặc đưa Key Gate Check ra khỏi chữ ký.

**C5. Sổ claim chỉ đọc ở Gate 12** (`referenceGates`): khóa sau Gate 10. Nếu Gate 12 cần sửa phân loại claim sau hậu mãi thì phải Backtrack.

## D. Nguồn dữ liệu chưa có khóa theo gate

**D1. Market tracks (Gate 10 đến 12):** `setMarketTracks` không có khóa theo gate. Khóa `launchApproval` sau Gate 11 sẽ cấm thu hồi phê duyệt phát hành khi sản phẩm đã bán, việc có thật ngoài đời. Hiện chỉ báo thông tin, không làm chữ ký stale.

**D2. Change Control (toàn cục):** có soft-lock riêng, không khóa theo gate. Chỉ báo thông tin.

**D3. Post-launch reviews, lịch sử phiên bản công thức:** cùng cách với D1.

## E. Lỗi cấu hình có từ trước — đã sửa 2026-10-09

**E1. Gate 8 đòi cả bảy dòng `infantTesting`, trong đó năm dòng gắn gate 09.** Đã sửa: check `requirementSectionDispositioned` có thêm tham số `gate`, Gate 8 chỉ đọc hai dòng gắn 08, và mục mới `sg09-infant-testing` đọc năm dòng gắn 09. Không cần hỏi SME vì không đổi điều kiện nào, chỉ đặt mỗi dòng về đúng gate đã gắn.

**E2. Check độ phủ công thức đọc cột `rmCode` của ma trận an toàn, nhưng sổ đó không có cột này.** Phép nối theo `rmCode` không bao giờ khớp, luôn rơi về `inciName`. Đã sửa: thêm cột `rmCode` vào sổ (dòng cũ để trống, vẫn nối theo INCI). Việc dùng mã làm khóa nối là cách đọc của chúng ta, ghi ở R5-Q64.

## F. Chưa kiểm tra trên thực tế

**F1. Giao diện web:** thẻ cột chỉ hiện gate nhập, nút Add row và Delete bị vô hiệu hóa kèm lý do khi đã có cột bị khóa. Mới type-check và build, chưa mở trên trình duyệt.

**F2. Ô tìm kiếm** (`CommandPalette`) vừa được sửa để tìm theo từ thay vì cụm liền; chưa thử trực tiếp.

**F3. Migration `20261009120000_register_row_identity`** đã gán `__rowId` cho hàng cũ; cơ chế đó đã bị gỡ nên khóa này vô hại. API xóa dần khi lưu. Giữ migration vì đã áp dụng.

## G. Câu hỏi bị gỡ khỏi vòng 5 vì là luật phần mềm (ghi 2026-10-10)

Rà soát bản nháp vòng 5 cho thấy bảy câu (mã nội bộ R5-Q… giữ nguyên trong `F1_Per_Gate_Open_Questions.md`) hỏi SME về cách phần mềm khóa, ghi vết hoặc cấp quyền. Theo nguyên tắc ở `Software_Rules.md`, đó là quyết định của chủ dự án, nên đã gỡ khỏi bản gửi. Mỗi mục dưới đây ghi **hiện trạng code** để chủ dự án quyết; chưa mục nào được chốt.

**G1. Một điều kiện dựng từ bảng, bảng rỗng có tính là "chưa đánh giá" không (R5-Q5).** SME đã trả lời nguyên tắc ở Round 4 câu 7. Phần còn lại là cách chứng minh "đã xét": hiện có 18 trigger, 10 cái đã có trạng thái chưa đánh giá, 8 cái dựng từ bảng nên bảng rỗng và "đã xét, không áp dụng" giống nhau (`TRIGGERS_WITHOUT_UNASSESSED_STATE`, `gateReadiness.ts`). Cần quyết: coi bảng rỗng là chưa đánh giá, hay thêm chỗ ghi "đã kiểm tra".

**G2. Phạm vi snapshot chữ ký gate và khi nào chữ ký hết hiệu lực (R5-Q3 trở đi).** Đã nằm trong SW-5, SW-8 và SW-21. Điểm lệch "phải Complete mới được ký quyết định Proceed" chỉ chặn ở giao diện: **đã sửa 2026-10-10**, `signGateSignOff` giờ từ chối chữ ký Proceed hoặc Proceed with Conditions khi trạng thái stage chưa Complete (cùng điều kiện với panel). Xem cả R5-Q55, Q57, Q59.

**G3. Chữ ký phase (R5-Q1, Q2, Q4).** (a) Lead được so khớp theo **tên** (`projects.service.ts`), hai người trùng tên đều nominate được; nên so theo user id. (b) Nominate người không có quyền approve: hiện chặn lúc ký, không chặn lúc nominate. (c) `recordVersion` của chữ ký phase là `row.version`, bộ đếm của cả dự án, đúng thứ SME ở Q29(1) đã bác cho gate; SW-22 cho phép nhưng chưa nói rõ cần snapshot riêng hay không. (d) Chữ ký vẽ tay và authenticator bắt buộc cho cả ba hàng (SW-7).

**G4. Ai được xem trang dữ liệu tham chiếu công ty (R5-Q15).** Cả ba trang (market profile, raw material risk, claims library) đã build và đều `adminOnly`, trong khi người sửa là Regulatory, Technical, Safety. Đề xuất: hiện link cho ai giữ capability `reference:*|edit`.

**G5. Claim: hai trường Claims Library mâu thuẫn thì cảnh báo hay chặn (R5-Q26).** Trường "declaration" hai giá trị là thiết kế của mình, SME chỉ yêu cầu claim mới phải được nhận diện là "New claim". Đề xuất: bỏ trường declaration, suy ra từ việc không có entry Approved.

**G6. Ai được xóa Next Action (R5-Q58).** Hiện chỉ người tạo (`nextActionAccess.ts`, chủ dự án quyết 2026-10-07). Còn mở: audit `next_actions.updated` chỉ lưu số lượng nên action bị xóa không để lại tên (SW-6).

**G7. Khóa sổ khi đóng sổ nhiều gate, và mở lại sổ (R5-Q21 c, e).** Ngưỡng đóng sổ là gate cao nhất trong `gateRefHighestGateId`; SW-20 đã đổi nghĩa "gate" của sổ thành gate nhập, nên cần kiểm tra lại ngưỡng này còn đúng không. Mở lại sổ hiện chỉ qua Backtrack.

**G8. Phép nối công thức với ma trận an toàn (R5-Q64).** `uncoveredFormulaLines` (`gateProgress.ts`) nối bằng điều kiện OR theo `rmCode` hoặc `inciName`, **không ưu tiên mã** như comment nói: một dòng công thức mã X có thể khớp nhầm hàng ma trận mã Y cùng INCI. **Đã sửa 2026-10-10**: dòng có mã chỉ khớp hàng cùng mã (hoặc hàng chưa có mã nhưng cùng INCI); dòng không có mã khớp theo INCI. Kiểm tra bằng 4 trường hợp dữ liệu giả.

## H. Lỗi cấu hình phát hiện khi rà soát vòng 5 (2026-10-10), chưa sửa

**H1. Hàng `generalRestrictedCaution` bỏ trống outcome không chặn Gate 7.** `registerNoBadRows` chỉ so với `badValues`, mà chuỗi rỗng không nằm trong đó; comment trong `registers.ts` nói ngược lại. **Đã sửa 2026-10-10**: thêm nhánh `registerColumnFilled` vào item `sg07-general-caution`.

**H2 (chờ SME, Câu 21 vòng 5). Gate 10 đọc "regulatory approval" ở hai nơi lệch nhau.** Sổ dossier chấp nhận "Approved with Conditions"; `MARKET_APPROVAL_STATUSES` không có giá trị này và check `everyMarket` chỉ chấp nhận Approved hoặc N/A.

**H3 (chờ SME, Câu 32(b) vòng 5). Item pack requirements của thị trường coi "chưa nhập" là "không áp dụng"** (trigger `marketPackRequirements`), lệch A2 và Round 4 câu 7.
