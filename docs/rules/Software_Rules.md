# Luật của phần mềm (không cần SME xác nhận)

Tài liệu này ghi các luật **do chủ dự án quyết định về cách phần mềm hoạt động**. Chúng không phải luật nghiệp vụ của SME, nên không đi vào `Business_Rules_Confirmation_*` và không cần đưa vào vòng câu hỏi nào.

**Ranh giới với luật nghiệp vụ.** Nếu một luật nói *một sản phẩm mỹ phẩm phải đạt điều gì* (an toàn, claim, đăng ký thị trường) thì đó là của SME, và phải hỏi. Nếu nói *phần mềm bảo vệ dữ liệu và ghi vết như thế nào* thì đó là luật phần mềm và nằm ở đây. Nghi ngờ thì coi là luật nghiệp vụ và hỏi SME.

Các trường hợp riêng và điểm chưa chắc của luật khóa và chữ ký được hoãn để xem sau trong [`Software_Rules_Review_Later.md`](Software_Rules_Review_Later.md).

Mỗi luật có **Trạng thái**: `Đã xây` (code đang thực thi) hoặc `Đã chốt, chưa xây` (đã quyết, chưa có code).

---

## 1. Khóa dữ liệu khi gate đã passed

### SW-1. Bằng chứng của gate bị khóa khi gate passed — *Đã xây* (2026-07-23)
Khi một gate passed (Complete + quyết định Proceed hoặc Proceed with Conditions + không còn blocker), bằng chứng gắn với gate đó chuyển sang chỉ-đọc trên toàn app. Muốn sửa phải Backtrack. Luật được thực thi ở cả UI và API.
Code: `isGateRefLocked` trong `packages/shared/src/utils/gateProgress.ts`.

### SW-2. Sổ dùng ở nhiều gate chỉ khóa khi mọi gate nhập của nó đã passed — *Đã xây*
Sổ gate `04/07` còn mở cho tới khi Gate 07 passed. Bên trong, từng cột đóng băng sớm hơn theo gate nhập nó (SW-5), và hàng không thêm hay xóa được từ khi có cột bị khóa (SW-4). Gate chỉ đọc không giữ sổ mở (SW-20).

### SW-3. Sổ không có gate không bao giờ khóa, và không được làm bằng chứng cho gate — *Đã xây* (2026-10-09)
Sổ có gate là `ALL` hoặc để trống không bao giờ khóa. Vì vậy **không check readiness nào được đọc một sổ như vậy**, nếu không gate có thể passed trên bằng chứng sửa được mãi mãi.
Thực thi: `npm run verify:readiness`, sweep S6, **fail build** và nêu tên sổ cùng gate tham chiếu. Hiện có 12 sổ như vậy, không sổ nào bị readiness đọc.

### SW-4. Hàng của sổ nhiều gate: không thêm, không xóa khi đã có cột bị khóa — *Đã xây* (2026-10-09, thay thế cách "hàng sinh ra ở gate nào")
Một sổ tự do (`mode: 'register'`) **không được thêm hoặc xóa hàng** khi bất kỳ cột nào của nó đã bị đóng băng (xem SW-5). Lý do (chủ dự án): người ký gate A đã duyệt dữ liệu như lúc đó. Một hàng thêm sau đó mang các cột của gate A mà không còn điền được, và làm gate A "duyệt sai thông tin" mà không ai biết. Muốn thêm hàng thì Backtrack. Ví dụ: sau khi SG03 pass, không thêm claim mới; sau khi SG04 pass, không thêm nguyên liệu mới (đổi công thức lớn vốn đã mở lại Gate 4 đến 9).
Luật này **thay thế** cơ chế cũ "hàng ghi nhớ gate nó sinh ra" (`__rowId`, `__bornAtGate`, `projectAsOfGate`), đã bị gỡ hoàn toàn. Hai khóa đó trong dữ liệu cũ vô hại và được API xóa dần khi lưu.
Sổ cố định (`mode: 'fixed'`) có hàng định sẵn nên không bao giờ thêm hoặc xóa hàng.
Code: `registerRowLocks.ts` (`rowsFrozenBy`, `registerFreezeViolations`), `setRegisterRows`, `DynamicTable` (nút Add row và Delete bị vô hiệu hóa kèm lý do). Kiểm tra: `npm run verify:freeze`, `npm run verify:e2e`.

### SW-5. Người ký duyệt toàn bộ nội dung đang có; mỗi cột có một gate nhập và đóng băng theo gate đó — *Đã xây, còn hai nguồn chờ quyết định* (2026-10-09)
**Nguyên tắc (chủ dự án):** người ký để gate pass đồng ý với **toàn bộ nội dung đang được điền**, kể cả các trường thuộc gate tương lai; và gate tương lai cũng phải phê duyệt dữ liệu liên quan đến gate cũ.

**Mỗi cột có một gate sở hữu: gate NHẬP nó.** Do **khai báo**, không suy ra từ việc gate nào đọc:
1. `RegisterColumn.gate` khai trên cột (hiển thị thành thẻ `G03`… trên màn hình, **chỉ gate nhập**, không hiển thị gate chỉ đọc).
2. Cột không khai: thuộc **gate cuối** của danh sách `gate` của sổ, tức đóng băng cùng lúc với cả sổ. Không bịa lịch riêng cho cột.

Gate sở hữu cột pass thì **cột bị đóng băng**: API từ chối (403) và web tô xám ô. Sổ có nhiều gate nhập (ví dụ sổ claim: Gate 3 khai, Gate 5 cơ chế, Gate 8 bằng chứng, Gate 10 rà soát) đóng băng dần theo từng gate; khi gate cuối của danh sách pass thì khóa cả sổ (`isGateRefLocked`, như trước). Luật này **không** giới hạn ai điền hay điền lúc nào trước khi gate sở hữu pass: điền sớm cột của gate sau vẫn được (SME cho phép làm trước, F13, và A4 để bằng chứng mở cho người đóng góp).

**Chữ ký của gate G ghi mọi cột của các sổ readiness của G đọc, chia hai phần:**
- **Chịu trách nhiệm** — cột do G hoặc gate **trước** G sở hữu. Thay đổi ở đây làm chữ ký stale. Đó là cách gate sau phê duyệt dữ liệu của gate cũ: dữ liệu đó nằm trong snapshot của gate sau, và vì đã bị đóng băng từ khi gate cũ pass nên chỉ đổi được bằng Backtrack.
- **Ghi nhận** — cột do gate **sau** G sở hữu. Người ký duyệt những gì đang điền lúc ký và nó được lưu lại, nhưng gate sau còn phải hoàn thiện nên thay đổi chỉ được **báo thông tin**, không làm chữ ký stale (không thì công việc bình thường của gate sau sẽ mở lại gate trước).

Hàng trong snapshot được gọi theo **vị trí**: vì sổ không thêm, xóa hay đổi thứ tự hàng được nữa khi đã có cột bị khóa (SW-4), một vị trí là cùng một hàng cho tới hết đời chữ ký.

**Phạm vi (chủ dự án, 09/10/2026): dữ liệu liên quan đến readiness, không phải mọi loại dữ liệu.** Ngoài các sổ, chữ ký ghi: Formula BOM, costing, formula properties, năm assessment, study approval trail, các trường định danh dự án (scope, target users), thị trường, market tracks, change records, post-launch reviews và lịch sử phiên bản công thức. Gate nào đọc phần nào được **đo** (`PROJECT_SLICE_READS_BY_GATE`), không khai tay. Chủ sở hữu theo khóa mà API đã có: định danh → Gate 01; BOM, costing, formula properties → Gate 05; mỗi assessment → gate có tab trả lời nó; study approvals → Gate 08. **Thị trường dự án** (`identity.markets`) và market tracks, change records, post-launch reviews, lịch sử phiên bản **không thuộc gate nào**: thêm thị trường sau Gate 1 được phép theo thiết kế (F4), nên chúng chỉ được ghi nhận và báo khi đổi, không bao giờ làm chữ ký stale. Reviewers, project lead và dữ liệu công ty (market profile…) không nằm trong chữ ký.

**"Sổ nào được gate nào đọc" được đo, không viết tay** (`registerColumnReads.ts`, sinh bằng `npm run generate:column-reads` từ việc chạy từng check và trigger thật trên 120 dự án ngẫu nhiên). Việc đó chỉ dùng để biết chữ ký phải ghi sổ nào và để sweep S6, S7, S8 bắt lỗi; nó **không** quyết định ai nhập cột.

**Chữ ký cũ** (không có `registerCells`) vẫn được so sánh theo cả sổ như trước. **Checklist trải nhiều gate** (`testingFamilies`, gate `08-09`) được ký ở gate cuối trong danh sách.

**Next Action** thuộc SW-19. Kiểm tra: `npm run verify:freeze` (logic thuần) và `npm run verify:e2e` (ký thật cả 12 gate qua HTTP với authenticator thật trên DB và API tạm, SG10–SG12 theo từng thị trường).

**Còn mở, vì cần một luật chứ không phải việc cơ học:**
- **Market tracks** (Gate 10–12): `setMarketTracks` không có khóa theo gate. Khóa `launchApproval` sau Gate 11 sẽ cấm thu hồi phê duyệt phát hành khi sản phẩm đã bán, mà việc đó có thật ngoài đời (thu hồi, rút khỏi thị trường).
- **Change Control** (toàn cục, Gate 11): có soft-lock riêng; đóng băng theo gate không có nghĩa.

**Hai phát hiện không thuộc SW-5, ghi lại để quyết riêng:**
- Gate 8 yêu cầu cả bảy dòng của `infantTesting`, trong đó năm dòng gắn gate 09. Một gate đòi dòng của gate sau.
- Check độ phủ công thức đọc `rmCode` của ma trận an toàn, nhưng sổ đó **không có cột `rmCode`**. Phép nối theo `rmCode` không bao giờ khớp và luôn rơi về `inciName`.

### SW-20. Sổ khai báo gate nhập và gate chỉ đọc — *Đã xây* (2026-10-09)
Mỗi sổ khai báo hai danh sách:
- `gate`: các gate **nhập** dữ liệu. Danh sách này quyết định khi nào cột đóng băng, khi nào khóa cả sổ và sổ phải được đóng (Review owner + Co-sign) trước gate cuối của nó.
- `referenceGates`: các gate **chỉ đọc**, kiểm tra lại dữ liệu mà gate khác đã nhập và không thay đổi gì. Gate chỉ đọc **không giữ sổ mở**. Ví dụ: sổ claim khóa sau Gate 10 dù Gate 12 còn đọc; sổ nguyên liệu khóa sau Gate 7 dù Gate 10 và 11 còn kiểm tra lại.

Mọi gate mà readiness đọc một sổ phải nằm trong một trong hai danh sách (sweep S8 của `verify:readiness` fail nếu im lặng). Máy không phân biệt được "nhập" với "chỉ đọc", nên phải khai báo, và phân loại của từng sổ lấy từ lời SME khi có:
| Sổ | Nhập | Chỉ đọc | Cơ sở |
|---|---|---|---|
| Supplier & RM Evidence | 04, 07 (cột kết luận G07, còn lại G04) | 10, 11 | Round 4 câu 31(a), (d), (f) |
| Claim → Evidence Traceability | 03, 05, 08, 10 (khai trên từng cột) | 12 | chủ dự án chốt |
| Watch-list (prohibited, PB caution) | 04, 07 (cột review G04, `productStatus` G07) | — | Round 4 câu 6, 32(e); `productStatus` là giả định R5-Q63 |
| Vulnerable-User Assessment | 02 | 12 | Round 3 B5 |
| Target Product Profile | 05 | 03 | v2 workbook: hoàn thành trước khi khóa công thức (Gate 5) |
| Stability & Release | 09, 11 (`releaseDecision` G11) | — | giả định R5-Q62 |
| Packaging Specs & Artwork | 06, 10, 11 (cột Gate 6 và Gate 10 khai trên cột) | — | cấu hình readiness của Gate 6 và 10 |
Hai giả định chưa được SME xác nhận: R5-Q62 (quyết định phát hành nhập ở Gate 11) và R5-Q63 (`productStatus` của watch-list nhập tới Gate 7), đã ghi trong `F1_Per_Gate_Open_Questions.md` và bản nháp Round 5.
Code: `RegisterConfig.referenceGates`, `columnOwnerGateIds`, sweep S8 trong `verify-readiness.ts`.

## 2. Chữ ký và ghi vết

### SW-6. Không sửa âm thầm — *Đã xây*
Sửa dữ liệu đã chốt phải đi qua Backtrack. Ai làm, vì sao, khi nào nằm trên bản ghi bất biến (`backtrackEvents`, `gateChangeLog`), không nằm trong ô ghi chú sửa được.

### SW-7. Chữ ký là hành động đã xác thực, không phải chữ gõ tay — *Đã xây*
Tên, vai trò, thời điểm do server ghi từ phiên đăng nhập. Client chỉ gửi quyết định và nhận xét. Chữ ký có ảnh đi kèm yêu cầu mã authenticator dùng một lần.

### SW-8. Chữ ký gắn với snapshot bằng chứng và hết hiệu lực khi bằng chứng đổi — *Đã xây*
Snapshot được lưu đầy đủ và so sánh, hệ thống chỉ ra mục nào đã đổi. Snapshot không chứa quyết định của gate và không chứa kết quả readiness, để tránh vòng lặp tự tham chiếu.

### SW-9. Server là nơi thực thi duy nhất — *Đã xây*
Mọi guard ở UI phải có bản tương ứng ở API, gọi cùng hàm trong `packages/shared`, không viết lại.

### SW-19. Next Action quanh thời điểm gate pass — *Đã xây* (2026-10-09, chủ dự án quyết)
**Trước khi gate pass** (đã có sẵn trong engine, nay được test):
- Có action còn mở, không action nào là Critical: gate pass được nhưng phải chọn **Proceed with Conditions**. Proceed thường không pass.
- Có ít nhất một action còn mở mang priority **Critical**: gate **không pass**, kể cả Proceed with Conditions.
- Mọi action đã Closed hoặc Cancelled (hoặc không có action nào): gate pass với Proceed thường, **kể cả khi có action từng là Critical**. SME chỉ nói action Critical *còn mở* chặn gate; không nói gate từng có Critical phải đi bằng Proceed with Conditions (R5-Q61, chờ SME xác nhận).

**Sau khi gate đã pass.** Các action còn mở chắc chắn không có action Critical (nếu có thì gate đã không pass). Chúng là **các điều kiện đã chấp nhận**:
- Action đã **Closed hoặc Cancelled bị đóng băng hoàn toàn** (không mở lại, không sửa, không chuyển giữa Closed và Cancelled).
- Action **còn mở** chỉ được sửa **Status, Owner, Due date**. Mô tả, gate và **priority (cả tăng lẫn giảm)** bị đóng băng. Vì vậy không thể nâng một điều kiện lên Critical sau khi gate đã pass.
- Thực hiện một điều kiện (đổi status, đóng, huỷ, đổi người phụ trách, đổi hạn) **không** làm chữ ký stale. Đổi nội dung điều kiện thì có: mô tả, hạ priority, xoá, hoặc thêm điều kiện mới.
- Thêm action mới vẫn bị chặn (R5-Q57), xoá vẫn bị chặn.

Hai chỗ trong này dựa trên cách đọc của chúng ta về luật SME và chưa được SME xác nhận: việc "thực hiện điều kiện không làm chữ ký stale" là diễn giải câu 29(1) (R5-Q59), và việc Critical chặn cả Proceed with Conditions là cách đọc chữ "normal" của F8 (R5-Q60).
Code: `nextActionAccess.ts` (`nextActionFreeze`, `nextActionFreezeViolation`), `gateSnapshot.ts` (`snapshotChanges`), `guardNextActions`, `NextActionsCard`. Kiểm tra: `npm run verify:actions`.

### SW-23. Mọi chữ ký cho xem nội dung trước khi ký — *Đã xây cho cả bốn loại: gate, đóng sổ, ô chữ ký trong sổ và phase* (2026-10-10, chủ dự án đồng ý)
Người ký phải thấy chính thứ chữ ký của mình xác nhận, ngay trước bước nhập mã, và chữ ký gắn với mã băm của nội dung đó chứ không gắn với phiên bản của cả dự án. Nếu nội dung đổi sau lúc xem, máy chủ từ chối (422) **trước khi tiêu mã xác thực**, và người ký xem lại. Người khác vẫn làm việc được trong lúc người ký đọc.
- **Chữ ký gate:** đã có từ SW-21 (modal xem trước toàn bộ snapshot). Từ 2026-10-11, **Decision và Comment nhập ngay trong modal đó**, cạnh nội dung được ký (nút ngoài panel là "Review & sign"); thiếu quyết định, thiếu comment hoặc stage chưa Complete thì nút Continue bị khóa kèm lý do. Sau khi ký, panel chỉ hiện quyết định và comment dưới dạng chữ.
- **Đóng sổ (Review owner, Co-sign):** đã xây 2026-10-10. `GET …/registers/:key/close/preview` trả các hàng và mã băm; bước xác thực và bước ký đều đòi `expectedHash`; sai mã băm trả 422 `REGISTER_CONTENT_CHANGED`. Nội dung được ký và nội dung được xem là cùng một hàm, `registerClosureContent` trong `packages/shared`. Kiểm thử: 15 case trong `apps/api/scripts/e2e/gate-signing.e2e.ts`.
- **Ô chữ ký trong sổ** (như NP sign-off): đã xây 2026-10-10. Nội dung được ký là chính hàng đó, trừ cột đang ký (`registerRowSignContent`); `GET …/rows/:i/signature/preview?column=`; mã băm gồm cả vị trí hàng và tên cột. Kiểm thử: 20 case trong `gate-signing.e2e.ts`.
- **Chữ ký phase:** đã xây 2026-10-10. Phạm vi do chủ dự án định: **dữ liệu hiển thị trên trang phase chính là phạm vi chữ ký của nó** (`phaseSignContent` trong `packages/shared`): bảng gate của phase, các tùy chọn checklist đã chọn, các dòng yêu cầu, Key Gate Checks (cùng bộ lọc luật đóng phase), 8 Angles, Next Actions của các gate trong phase, evidence summary và xác nhận pre-work. Không đưa vào: ba hàng chữ ký, liên kết nhanh của phase (SW-22 giữ cho sửa được) và các sổ đăng ký (mỗi sổ có chữ ký đóng sổ và gate riêng). `GET …/phases/:n/sign-offs/preview`; bước xác thực và bước ký đều đòi `expectedHash`, sai thì 422 `PHASE_CONTENT_CHANGED`, từ chối trước khi tiêu mã. Kiểm thử: 13 case trong `gate-signing.e2e.ts`. Sửa dữ liệu ở nơi khác của dự án vẫn không làm lần ký bị từ chối (đã có case từ SW-22).
- **Chữ ký hết hiệu lực khi nội dung đổi (2026-10-11, chủ dự án):** mã băm không chỉ bảo vệ khoảnh khắc ký mà còn được lưu theo từng chữ ký, để sửa về sau đánh dấu chữ ký là cũ. Áp dụng cho **đóng sổ** (cột `register_closure_sign_offs.contentHash`) và **ô chữ ký trong sổ** (trường `<cột>__hash` trong hàng). Cờ `stale` được **tính lúc đọc** trong `project-mapper.ts` (so mã băm đã lưu với nội dung hiện tại) và **không bao giờ được lưu**; máy chủ gỡ nó khỏi mọi lần ghi, nên client cũng không giả mạo được. Chữ ký stale **không còn được tính** (`isRegisterClosureSigned` trả false, nên sổ chưa "đóng", gate vẫn bị chặn, và dấu "Approved by NP?" tắt); người ký ký lại được ngay mà không cần rút chữ ký trước. Ô "Approved by NP?" được suy ra từ chữ ký nên **không thuộc nội dung được ký** (`derivedFromSignature`), nếu không hàng sẽ bị coi là đã sửa ngay khi vừa ký. Chữ ký ghi trước khi có tính năng này không có mã băm, được coi là "không rõ", **không bao giờ bị đánh dấu stale**; không bịa mã băm từ nội dung hôm nay. **Chữ ký gate** đã có cơ chế riêng (so snapshot, SW-5 và SW-21). **Chữ ký phase cố ý không lưu mã băm:** SW-22 đã khóa dữ liệu cấp phase khi còn chữ ký, dữ liệu gate bị khóa khi gate pass, còn phần duy nhất còn sửa được là trạng thái Next Action của gate đã pass, mà SW-19 cố ý cho phép (thực hiện điều kiện không buộc ký lại). Nội dung được ký phải **không phụ thuộc thứ tự hàng** DB trả về (8 Angles không có cột thứ tự, Next Action cùng giao dịch có cùng `createdAt`): `phaseSignContent` tự sắp xếp, có `verify:signature-content` canh. Kiểm thử: `gate-signing.e2e.ts` và `verify:signature-content`.
Code: `RegisterClosePreviewModal.tsx`, `RegisterClosurePanel.tsx`, `previewRegisterClose` và `signRegisterClose` trong `projects.service.ts`.

### SW-24. Một chữ ký đang đứng vững khóa dữ liệu mà nó đã ký — *Đã xây* (2026-10-11, chủ dự án)
Prepared, Reviewed và Approved phải ký **cùng một nội dung**. Vì vậy, chừng nào còn ít nhất **một** chữ ký đứng vững, dữ liệu liên quan không được sửa. Muốn sửa thì người đã ký rút chữ ký kèm lý do (chữ ký sau rút trước, đúng thứ tự ngược). Đây thay cho cách cũ "cho sửa rồi đánh dấu stale", vốn để ba người có thể ký trên ba trạng thái nội dung khác nhau.
- **Gate:** chốt chặn tập trung `assertSignedContentUnchanged` trong `projects.service.ts`, gọi từ `mutate()` (mọi đường ghi theo mục) và từ `updateGate`, `updateGates`. Sau mỗi lần ghi, so phần mỗi chữ ký đã ký với nội dung mới bằng đúng hàm `gateSignOffStaleChanges` (SW-5, SW-19, SW-21); lần ghi nào **làm xuất hiện** thay đổi mới thì bị từ chối 403, kèm danh sách thay đổi. Thay đổi đã có từ trước lần ghi đó không bị tính vào. Bỏ qua: gate đã pass (đã khóa bởi việc pass), các hành động ký, rút ký, phân công, và tạo phiên bản công thức mới (không đổi nội dung được ký, hoặc tự xóa chữ ký trong cùng giao dịch).
- **Vẫn sửa được khi còn chữ ký:** dữ liệu thuộc **gate sau** (chữ ký chỉ chịu trách nhiệm phần gate đó sở hữu, SW-5); **trạng thái điều kiện đã chấp nhận** của Next Action (thực hiện, đóng, đổi owner, đổi hạn; SW-19); còn thêm hoặc sửa chữ một điều kiện thì bị khóa. **Cập nhật 2026-10-11 (chủ dự án: "đưa toàn bộ thông tin của gate vào"):** owner, hạn, ghi chú và gap assessment của gate cũng **thuộc nội dung được ký** (bị khóa), cùng với người yêu cầu (Requester name, department) ở Gate 01 và các cột owner/ngày/tài liệu/ghi chú của từng dòng Key Gate Check, từng tùy chọn checklist và từng dòng requirement. Lưu ở `snapshot.fullRecord` (có cấu trúc để modal in ra đúng như trang). Chữ ký lập trước ngày này không có `fullRecord` nên chỉ được so trên phần nó đã ghi, không bị stale vì thay đổi mới. Modal xem trước hiển thị tất cả các trường này (SW-23).
- **Đóng sổ:** chỉ cần **một** chữ ký còn hiệu lực là sổ chỉ đọc (trước đây phải đủ hai). Hàm `hasStandingClosureSignature`; trang sổ và panel đóng sổ hiển thị thông báo khóa.
- **Ô chữ ký trong sổ:** hàng đã ký không sửa được các ô còn lại cho đến khi rút chữ ký (`carryRegisterSignatures`). Hàng có chữ ký đã stale không khóa gì.
- **Phase:** đã có từ SW-22.
- **Stale vẫn còn, làm lớp phòng thủ phụ** (SW-23): nay chỉ xuất hiện khi dữ liệu bị đổi ngoài luồng (truy cập thẳng DB, lỗi, dữ liệu nhập cũ). Chữ ký stale không còn được tính và không khóa gì, nên có thể ký lại ngay.
- **Giao diện (12/10/2026, chủ dự án):** hàm dùng chung `isGateSignedStanding` (chỉ tính chữ ký còn hiệu lực, không tính chữ ký stale). Trang phase: Phase Gate Flow, Key Gate Checks, checklist, requirement và Opportunity & Request của gate đã ký chuyển sang chỉ đọc. Sổ chung `DynamicTable`: tập gate đóng băng là `frozenGateSet` = gate đã pass + gate đang có chữ ký, dùng cho cả ô, thêm và xóa hàng (SW-4, SW-5), và **cùng hàm đó chặn ghi ở API** (`setRegisterRows` → `registerFreezeViolations`), nên bảng tắt ô và server từ chối theo đúng một câu trả lời. Cột của gate sau vẫn sửa được.
- **Đã làm ở giao diện cho phần còn lại (12/10/2026):** hook `useRegisterFreeze` (cùng `frozenGateSet`) dùng ở `WatchlistRegister` (ô trong bảng và drawer, từng cột) và `VulnerableUserAssessmentTable` (từng cột, cộng thêm/xóa nhóm và câu hỏi Có/Không khi hàng đã đóng băng). `SupplierRmEvidenceTable` và `PublishedInfoApprovalTable` dựa trên `DynamicTable` nên đã được phủ từ trước. Formula BOM và Costing (`BomCosting`), Formula Properties, các Assessment (theo gate trả lời) và Study Approval (Gate 08) chuyển sang chỉ đọc khi gate sở hữu có chữ ký còn hiệu lực. Server chặn các thao tác này qua `assertSignedContentUnchanged`, và qua `registerFreezeViolations` với `frozenGateSet` cho sổ.
- **Dữ liệu không có gate nào sở hữu thì không thuộc chữ ký nào, không ghi vào ảnh chụp và không hiện trong modal xem trước (chủ dự án, 12/10/2026: "chỉ các dữ liệu ảnh hưởng đến chữ ký mới đưa vào"):** Market Tracking, Change Control, Post-launch review, Formula version history và danh sách thị trường của dự án (`identity.markets`) — `projectSliceDigests` bỏ qua mọi slice có `owner: null`. Thay đổi ở chúng không làm chữ ký stale và cũng không được báo. Evidence Summary, Packaging BOM, CAPA và Feedback chưa bao giờ nằm trong ảnh chụp. Khi review team cần một mục bị khóa theo chữ ký, thì gán chủ sở hữu cho nó trong `projectSlices.ts` và đo gate nào đọc những trường nào, rồi mới làm. Dữ liệu thuộc gate SAU (ví dụ BOM ở Gate 4, do Gate 5 sở hữu) vẫn được ghi ở phần thông tin, vì nó có chủ sở hữu.
- **Kiểm thử:** `gate-signing.e2e.ts` (các case "bị từ chối 403, chữ ký còn hiệu lực" ở SG01, SG03, SG05, SG07, SG08, SG09, đóng sổ và ô chữ ký) và `verify:signature-content` (điểm miễn trừ, trên một gate đã ký dựng sẵn).

### SW-25. Drawer: tạo bản ghi thì đóng khi server nhận, drawer chi tiết của bảng thì giữ mở và có Save, Save & next — *Đã xây* (2026-10-11, chủ dự án)
Có hai loại drawer và chúng xử lý nút lưu khác nhau.
- **Drawer tạo một bản ghi** (kết thúc bằng một lần chốt: nút OK): đóng **chỉ sau khi server đã nhận**. Nếu server từ chối (dữ liệu bị khóa, xung đột phiên bản), drawer mở nguyên và giữ những gì đã nhập, không hiện "đã thêm" rồi xóa form. `addCapa`, `addFeedback`, `addChange`, `createFormulaVersion` giờ trả `Promise<boolean>` (qua `tryWriteSection`) và có `confirmLoading` chống bấm hai lần. Đã đúng từ trước: tạo dự án, backtrack, nhập từ Cosmetri. `addChange` chỉ ghi dự án của chính bản ghi (trước đây ghi lại danh sách của mọi dự án mỗi lần thêm).
- **Drawer chi tiết một hàng của bảng** (bản nháp dùng chung, lưu ở cấp trang): chân drawer có **Save** và **Save & next**, cùng chỉ báo "Unsaved changes". **Save ghi cả bảng rồi đóng drawer** (chủ dự án, 2026-10-12; trước đó Save giữ drawer mở trên hàng đang sửa). **Save & next** ghi rồi sang hàng kế tiếp, vắng mặt ở hàng cuối thay vì quay vòng — đây là cách đi tiếp qua nhiều hàng mà không đóng drawer. Áp dụng cho `DynamicTable`, `RecordList` (Key Gate Checks, 8 Angles, Next Actions, Requirement…) và `WatchlistRegister`; Checklist, CAPA và các trang admin vốn đã đóng sau khi lưu.
- **Save hoặc Discard ở thanh của trang thì đóng drawer đang mở** (2026-10-11): bản nháp của cả bảng đã được chốt nên drawer không còn gì để hiện. Chỉ tính khi bản nháp chuyển từ "có thay đổi" sang "sạch" (`useCloseDrawerOnPageSave`), nên lần lưu bị từ chối giữ drawer mở; Save và Save & next của chính drawer đánh dấu trước nên vẫn ở lại.
- **Chưa kiểm chứng trên trình duyệt:** mới qua typecheck, build và lint. Hành vi thật (drawer ở lại sau Save, đóng sau khi tạo thành công, ở lại khi bị từ chối) chưa được chạy.
- **Save chờ kết quả từ server (2026-10-12):** các hàm lưu của bảng (`setRegisterRowsBulk`, `setRequirementSection`, `setGateChecksBulk`, `setAnglesBulk`, `setNextActionsBulk`, `setEvidenceItemsBulk`, `setChangesBulk`) giờ trả `Promise<boolean>`. Bản nháp chỉ được chốt (`markSaved`) khi server đã nhận; nếu bị từ chối, bản nháp còn nguyên để sửa và lưu lại, **drawer không đóng và Save & next không sang hàng kế**. Trước đó Save là ghi rồi quên nên drawer vẫn đóng dù server từ chối. Áp dụng cho `DynamicTable`, `RecordList` (8 Angles, Key Gate Checks, Next Actions, Requirement, Evidence Summary, Change Control), `WatchlistRegister` và `VulnerableUserAssessmentTable`.

### SW-26. Phase Gate Flow đầy đủ dữ liệu trước khi ký gate — *Đã xây* (2026-10-11, chủ dự án)
Card **Phase Gate Flow** (trạng thái stage, quyết định, owner, hạn, evidence link, ghi chú) là một card riêng, nằm **trên** card Gate sign-off, không dính vào nhau. Dữ liệu của nó phải đầy đủ **trước** khi ký, vì chúng nằm trong nội dung được ký (SW-24): điền sau khi ký sẽ làm cả ba chữ ký stale.
- **Bắt buộc, đã LƯU, trước một chữ ký có quyết định cho qua gate:** stage status = Complete, **Owner, Due date, Evidence / link**. Notes / blockers không bắt buộc ("không có blocker" là câu trả lời hợp lệ). Quyết định không nằm trong danh sách vì nó là đầu ra của chữ ký (SW-21). Hold và Backtrack vẫn ký được khi chưa đủ.
- **Hai lớp:** server từ chối 400 và nêu các trường còn thiếu (`gateFlowMissing` trong `config/gateSignOff.ts`, kiểm trong `signGateSignOff`); giao diện hiện dòng "Complete and save before sign-off: …" trong card Phase Gate Flow, dòng khóa trong card ký, và chặn nút Continue trong modal.
- Đây là quy tắc phần mềm của chủ dự án, không đưa cho SME. Danh sách trường bắt buộc là lựa chọn của người viết; muốn thêm hay bớt thì sửa `GATE_FLOW_REQUIRED`.

### SW-27. Quyết định khác nhau giữa Prepared, Reviewed và Approved chỉ được hiển thị, không bị chặn — *Đã xây* (2026-10-11, chủ dự án chọn mức A)
Quyết định của **Approved by** vẫn là quyết định của gate (câu 29(5)); quyết định của Prepared và Reviewed là khuyến nghị của vai đó. Khi ba bên khác nhau, hệ thống không chặn và không bắt thêm comment, nhưng làm bất đồng **nhìn thấy được**: modal ký hiện khối "Already signed" (vai, người, quyết định, comment) phía trên ô chọn của người ký, kèm cảnh báo vàng nếu quyết định đang chọn khác; panel ký hiện thẻ "Decisions differ" ở đầu. Các mức nặng hơn đã đề xuất và không chọn: bắt comment khi người duyệt chọn thoáng hơn khuyến nghị (B), chặn hẳn (C).

### SW-29. Đánh giá lý do N/A tự sinh của item critical: một dòng cho mỗi item, người được nominate "Reviewed by" của phase sửa thẳng vào đó — *Đã xây* (2026-10-13, chủ dự án; cách đọc nghiệp vụ là `[ASSUMPTION: R5-Q6]`)
Vòng 4 câu 16 cho phép hệ thống tự sinh lý do N/A, nhưng với item safety-, regulatory-, claims- hoặc release-critical thì lý do đó "must still be acknowledged by the responsible reviewer before gate closure". Item nào là critical và ai là reviewer là cách đọc của mình (câu hỏi số 1 của Vòng 5); phần ghi và bảo vệ dữ liệu dưới đây là quyết định của chủ dự án.
- **Ai được ghi hoặc sửa:** chỉ người mà Lead đã nominate ở dòng **Reviewed by** trong chữ ký **phase** của gate đó (`responsibleReviewer`, `utils/readinessAck.ts`). Admin cũng không làm thay. Chưa nominate thì không ai làm được, gate vẫn bị chặn, và trang phase nhắc Lead nominate.
- **Một dòng cho mỗi (gate, item), sửa tại chỗ:** bảng `readiness_acknowledgements` có unique `(projectId, gateId, itemId)`. Người được nominate chọn **Acknowledged** hoặc **Not acknowledged** (bắt buộc kèm lý do), và có thể đổi ý bất cứ lúc nào trước khi gate passed. Người mới thay người cũ thì ghi đè đúng dòng đó (tên người, thời điểm đổi theo); người cũ không làm thêm được (403).
- **Không có gì bị xóa:** mỗi lần sửa là một audit event `readiness_ack.recorded` mang giá trị **trước** và **sau** (kết quả, lý do, người, thời điểm, câu chữ). Lịch sử này hiện ngay dưới item (nút "History (n)" trong panel readiness, liệt kê từng lần sửa: ai, kết quả, lý do, lúc nào, từ cũ đến mới); server dựng nó từ audit (`toReadinessAckLog` trong `project-mapper.ts` → `ProjectData.readinessAckLog`), cùng cách với lịch sử chữ ký gate (SW-28). Dòng giữ ảnh chụp tên và vai trò vì tài khoản có thể bị đổi tên hoặc xóa.
- **Not acknowledged là một quyết định có hiệu lực:** item chặn gate như chưa xác nhận, nhưng nói rõ lý do reviewer đưa ra. Ghi lại đúng điều đã ghi (cùng người, kết quả, lý do, câu chữ) bị từ chối vì không có gì đổi (400).
- **Gắn với đúng câu chữ:** server ghi lý do do engine sinh ra lúc đó, client chỉ gửi (gate, item, kết quả, lý do) nên không đánh giá được câu chữ chưa thấy. Nếu sự thật đằng sau đổi (ví dụ thêm target user mẹ bầu, hoặc lý do đổi chữ), dòng cũ không còn khớp và item bị chặn lại ("stale").
- **Chặn cứng, Proceed with Conditions không gỡ được:** item chưa được xác nhận là hard block, vì câu trả lời nói "trước khi đóng gate". Nó chặn cả quyết định Proceed của người Approved (câu 29(5)).
- **Khóa:** gate đã passed thì không sửa nữa (400); cần Backtrack để mở lại.
- **Nơi thực thi:** `gateReadinessChecklist` (`gateProgress.ts`), `ProjectsService.acknowledgeReadinessItem` (`POST /projects/:id/readiness-acknowledgements`), các nút ở panel readiness và dòng nhắc ở trang phase. Danh sách critical là một hằng số duy nhất (`isCriticalForAcknowledgement`, mặc định theo 7 gate critical của câu 29(3), chỉnh từng item ở `CRITICAL_ITEM_OVERRIDES`).
- **Kiểm thử:** `npm run verify:ack` (luật) và các case SG07 trong `gate-signing.e2e.ts` (nominate, 403, 400, sửa tại chỗ, Not acknowledged, audit trước/sau).
- **Dữ liệu cũ:** không có gì để chuyển. Mọi dự án có item critical tự sinh N/A bắt đầu ở trạng thái chưa xác nhận, đúng cho một kiểm soát chưa tồn tại hôm qua.

### SW-30. Chỉ mở được Change Control khi gate sớm nhất mà loại thay đổi đó đụng tới đã passed — *Đã xây* (2026-10-13, chủ dự án: "việc thuộc logic mà dev quyết được, không cần hỏi SME")
Change Control là cách chính thức để sửa một thứ đã bị **khóa** ở một gate. Gate chưa passed thì dữ liệu của nó vẫn đang sửa trực tiếp, nên không có gì để đưa vào kiểm soát thay đổi. Và một Change Control đang mở khóa mềm (F9) mọi gate mà loại thay đổi của nó nêu tên, nên một cái mở quá sớm sẽ giữ im lặng các gate mà dự án chưa tới.
- **Quy tắc:** mỗi loại thay đổi (`CHANGE_TRIGGERS`) đã khai danh sách gate nó ảnh hưởng. Loại đó dùng được khi dự án đã **passed gate sớm nhất** trong danh sách. Loại khai `ALL` thì luôn dùng được. Không cần thêm dữ liệu cấu hình nào.
- **"Passed", không phải "đang ở":** gate đang mở để làm việc không tính, vì dữ liệu của nó đang sửa trực tiếp. Ví dụ "Ingredient added or removed" (Gate 05, 08) dùng được từ khi Gate 05 passed, không cần đợi tới Gate 08 (gate đó dự án chưa tới và cũng không cần tới).
- **Chỉ kiểm bản ghi MỚI:** sửa một Change Control đã có luôn được, nên dữ liệu cũ không bị khóa nhầm.
- **Hai lớp:** server từ chối 400 và nói gate nào phải passed trước (`changeTriggerAvailability` trong `utils/changeAccess.ts`, gọi từ `ProjectsService.setChanges`); trang Change Control hiện loại thay đổi chưa dùng được ở dạng mờ, kèm "available once Gate NN has passed", và tự bỏ chọn nếu đổi sang dự án chưa tới.
- **Chưa chọn dự án thì giao diện chưa so sánh được gì**, nên mọi loại vẫn chọn được và server là nơi từ chối.
- **Kiểm thử:** `npm run verify:change-access` (luật) và các case đầu `gate-signing.e2e.ts` (Gate 1 không mở được thay đổi công thức hay hồ sơ, loại `ALL` mở được).
- **Dữ liệu cũ:** không có gì để chuyển. Quy tắc chỉ áp cho bản ghi tạo từ nay.

### SW-31. Stop là điểm dừng cuối cùng của dự án, một trạng thái của Project — *Đã xây* (2026-10-14, chủ dự án)
SME nhắc "Reject/Stop" như lối ra của gap Critical nhưng dropdown Gate decision của workbook không có giá trị đó. Chủ dự án quyết: **Stop không phải một quyết định gate mà là trạng thái của dự án**, nên dropdown của workbook không bị đụng. Không hỏi SME (R5-Q13 đóng).
- **Cuối cùng, không hoàn tác.** Dự án đã Stop khóa chỉ đọc đúng như hiện trạng (dùng chung cơ chế khóa của Archive, `assertMutable`). Không ai mở lại được, kể cả admin; admin vẫn xóa được dự án. Việc đang mở (Next Action, Change Control) giữ nguyên làm lịch sử.
- **Ai bấm:** Project Lead của dự án đó hoặc admin. Không có capability riêng.
- **Chỉ khi thật sự mắc kẹt:** hiện chỉ khi có ít nhất một gate mang đánh giá gap **Critical** (lời SME: "Critical gaps must result in Hold, Backtrack or Reject/Stop"). Danh sách lý do nằm ở một hàm duy nhất, `projectStopGrounds` trong `utils/projectStop.ts`, để thêm lý do khác sau này không phải sửa chỗ khác.
- **Đánh giá phải đầy đủ (14/10/2026, sau khi chủ dự án chỉ ra Stop được với grade Critical trơ trọi):** một gap Critical chỉ là lý do Stop khi đã có **Impact category, Assessor, Assessment date và Rationale**. Một grade không có gì đi kèm không phải "formal criticality assessment" của Q3, và dự án đã Stop không sửa lại được nên lý do ghi lúc Stop phải đủ. Required action, Action owner và Evidence link không bắt buộc (dự án đang kết thúc, không còn hành động tiếp). Thiếu trường nào thì nút Stop mờ và nói đúng trường đó (`missingStopAssessment`).
- **Từ chối khi còn market đã launch mà chưa Withdrawn** (nghĩa vụ hậu mãi còn nguyên): phải withdraw market trước.
- **Hệ thống tự ghi lý do:** server chụp các gap Critical (gate, impact category, rationale, người và ngày đánh giá, hành động yêu cầu), gate đang mở, người dừng và thời điểm — người dừng không nhập những thứ này — cộng với **comment bắt buộc** của người dừng. Ghi vào cột trên `projects` và một audit event `project.stopped`.
- **Hiển thị:** thẻ trên Project Overview (nút Stop và khung xác nhận cho Lead/admin, banner sau khi dừng), nhãn Stopped trên danh sách dự án, không tính vào "active" ở Dashboard. Dự án Stopped vẫn hiện trong danh sách mặc định. Gợi ý Stop ở các chỗ vướng (ví dụ thông báo gap Critical) làm sau.
- **Dữ liệu cũ:** migration `20261014090000_project_stop` chỉ thêm cột; mọi dự án hiện có là chưa Stop.

### SW-32. Thẩm quyền "Safety hoặc Regulatory" để mang một finding watch-list bị flag: do trạng thái hoặc cột Owner của dòng quyết định — *Đã xây* (2026-10-14, chủ dự án; R5-Q14 đóng, phần chuyển thẩm quyền sang người đánh giá hỏi SME ở R5-Q67)
Round 4 Q32(c): Proceed with Conditions có thể là chấp nhận finding nếu *"the gate approver has the required Safety or Regulatory authority"*. SME không nói "required" là bên nào. Chủ dự án quyết:
- **Trạng thái flag nêu tên chức năng thì chức năng đó quyết định:** *Needs Safety Review* → Safety; *Needs Regulatory Review* → Regulatory.
- ***REVIEW - possible formula match*** (do **người** chọn sau khi màn hình đối chiếu công thức báo khớp; không nêu chức năng nào) thì cột **Owner** của chính dòng đó quyết định: Owner chỉ nêu Safety → Safety; chỉ nêu Regulatory → Regulatory.
- **Owner nêu cả hai, hoặc không nêu bên nào** (ví dụ Quality) → một trong hai là đủ.
- **Thẩm quyền nằm ở người ĐÁNH GIÁ, không ở người ký gate (14–15/10/2026, kế hoạch `docs/plans/Permission_Model_Plan.md`):** một gate chứa nhiều finding thuộc nhiều chức năng, mà người ký gate chỉ bảo đảm một chức năng, nên chuyên môn đặt ở finding. (1) **Reviewer** của dòng là **ô chọn người**, chỉ liệt kê người có role đúng chức năng của finding (qua quyền `watchlist-finding|accept-safety/regulatory`, nay chỉ là danh sách ứng viên); server từ chối Reviewer không đủ tư cách (`newlyNamedReviewerRows`). (2) Ghi **Reviewer assessment = Non-critical** hoặc **Further information required** (hai kết luận duy nhất cho phép mang finding theo điều kiện, D3) là việc chấp nhận, và **chỉ người ở Reviewer** (hoặc admin) ghi được (`newlyCarriedVerdictRows`); các kết luận khác thuộc phần quan trọng của sổ theo SW-34. Kiểm ở `setRegisterRows`. Người ký Approved **không** cần thẩm quyền watch-list, gate ký như thường vì readiness đã kiểm finding. Lệch lời SME ("the gate approver has the required Safety or Regulatory authority") nên ghi `[ASSUMPTION: R5-Q67]` và hỏi SME xác nhận.
- **Giao diện tách hai phần (ngăn chi tiết dòng watch-list):** **1 · Recording the finding** (trạng thái, phân loại, owner, bằng chứng, ai sàng lọc công thức ghi) và **2 · Handling the finding** (đánh giá, người đánh giá, ngày, lý do, Next Action, trạng thái xử lý — do người đủ thẩm quyền ghi).
- Hàm duy nhất: `watchlistRequiredAuthority` và `newlyCarriedVerdictRows` trong `utils/watchlistReview.ts`. Kiểm thử: `npm run verify:watchlist-authority`.
- Admin vẫn có mọi quyền như mọi nơi khác. Dữ liệu cũ: không có gì để chuyển.

### SW-33. Dòng watch-list được kiểm ở gate nào: theo cột Linked gate, từ gate được gắn trở đi — *Đã xây* (2026-10-14, chủ dự án; hỏi SME ở R5-Q68)
Workbook gắn mỗi dòng của hai danh sách với một gate trong cột **Linked gate**. Readiness chỉ xét dòng từ gate được gắn trở đi: gắn Gate 4 → kiểm ở Gate 4 và các gate sau; gắn Gate 7 → chỉ từ Gate 7. "Từ gate đó trở đi" chứ không phải "đúng gate đó", để một finding chưa giải quyết ở gate sớm vẫn chặn gate sau.
- Áp cho các mục đọc hai danh sách: `watchlistReviewed`, `watchlistNoneConditional`, `watchlistDispositioned`, `bomMatchesTakenUp` và `registerNoBadRows` trên hai sổ đó. Hàm: `watchlistRowInScope` (`utils/watchlistReview.ts`). Dòng không đọc được Linked gate thì kiểm ở mọi gate.
- Hệ quả: Gate 4 chỉ cần Classification cho 10 dòng danh sách cấm (không gồm Retinol, Bisphenol S) và chưa kiểm danh sách thai kỳ; Gate 7 xét cả 24 dòng. Danh sách thai kỳ ở Gate 4 vì vậy không còn dòng nào trong phạm vi (không phải trống: sổ vẫn có đủ 12 dòng).
- Kiểm thử: `npm run verify:watchlist-authority` (các ca phạm vi).

### SW-34. Ai được sửa phần quan trọng của một sổ: người được phân công của sổ trên dự án — *Đã xây* (2026-10-15, chủ dự án; kế hoạch `docs/plans/Permission_Model_Plan.md`, giai đoạn 2)
Trong một dự án, thẩm quyền đến từ **phân công**, không từ Role Editor. SME (A4) chỉ nói "người dùng có thể đóng góp bằng chứng mà không có quyền duyệt", nên mức đóng góp và phần cần phân công do chủ dự án quyết, không hỏi SME.
- **Người được phân công của một sổ** = Review owner, Co-review, Co-sign của sổ trên dự án (từ 13 vai nhập lúc tạo dự án; Project Manager co-sign mọi sổ) + **Project Lead** + **Admin** + **Reviewer được chọn trên một dòng** (chỉ cho dòng đó).
- **Thông tin đơn giản** (chữ, ngày, số, link, ghi chú, Owner): mọi người dùng trong dự án đóng góp được.
- **Phần quan trọng** chỉ người được phân công: ô chọn giá trị (trạng thái, kết luận, phân loại), ô tick (phê duyệt), chữ ký, cột **người đã làm một việc** (Reviewer, Verified by, Approved by, Confirmed by…), và **thêm/xóa dòng** (sổ dòng tự do). Người khác đọc được nhưng server từ chối (403) và giao diện làm mờ kèm lý do. Cờ cột `sensitive` ghi đè theo kiểu cột khi cần.
- **Ba sổ không có Review owner:** MBC360 FEEDBACK mở cho mọi người; Template_Index và Requirements chỉ Lead và Admin.
- Hàm duy nhất `registerAccessViolations` (`utils/registerAccess.ts`), server gọi ở `setRegisterRows`, giao diện qua `useRegisterAccess`. Kiểm thử: `npm run verify:register-access` (22 ca).
- **Chưa áp** cho các biểu mẫu của trang phase (checklist, requirement, Key Gate Check): chúng không phải sổ; xem kế hoạch giai đoạn sau.

### SW-35. Gate quan trọng: Lead chỉ định người đại diện chức năng độc lập trước khi ai ký — *Đã xây* (2026-10-15, chủ dự án; kế hoạch giai đoạn 3)
Round 4 Q29(3)–(4) (nguyên văn): ở bảy gate quan trọng (3, 4, 7, 8, 9, 10, 11), *"at least one reviewer or approver must also represent the relevant independent function"*. Cách làm:
- **Lead (hoặc Admin) chỉ định người đại diện** và **bước họ ký** (Reviewed by hoặc Approved by), ở khối "Independent function" trên thẻ Gate sign-off (`GateRepresentativeBlock`); chức năng: Gate 3 Technical hoặc Regulatory (ít nhất một, đúng "and/or"), Gate 4 và 10 Regulatory, Gate 7 và 8 Safety / Scientific Review, Gate 9 và 11 Quality. Gate per-market (10, 11) có một người đại diện cho từng market.
- **Ứng viên** chỉ là người có quyền `gate-signoff|represent-*` tương ứng (một người nhiều role vẫn hiện nếu một role đủ); **không** được là người Prepared by.
- **Người đó chiếm bước đã chọn** (khóa trên giao diện); bước còn lại Lead chọn tự do như mọi gate. Chưa chỉ định người đại diện thì **không ai chỉ định được Reviewed/Approved và không ai ký được** (server từ chối 400, giao diện khóa kèm lý do). Đổi người đại diện khi họ đã ký thì phải rút chữ ký (có lý do) trước.
- Lưu trong cột `gate_sign_offs.representsFunction` của hàng bước đó (migration `20261015120000_gate_representative`); hàm: `gateRepresentative`, `representativeMissingReason`, `independentFunctionsForGate` trong `config/gateSignOff.ts`; server: `setGateRepresentative` (PUT `…/gates/:gateId/sign-off-representative`).
- Kiểm tra cũ "người review hoặc duyệt giữ quyền chức năng" ở bước ký Approved vẫn chạy như lớp phòng thủ. Gate không quan trọng (1, 2, 5, 6, 12) không có khối này.
- Gate đã ký dở trước thay đổi này: chữ ký đã có giữ nguyên; các chữ ký mới chờ Lead chỉ định người đại diện.

### SW-36. Đóng sổ theo từng gate; khóa của sổ là hệ quả của chữ ký, không tự động — *Đã xây* (2026-10-15, chủ dự án; kế hoạch giai đoạn 4)
- **Một sổ được đóng một lần cho mỗi gate cần nó.** Gate G cần đóng: mọi sổ mà readiness của G **đọc** (`REGISTER_READS_BY_GATE`) cộng sổ mà G là gate cuối của danh sách nhưng không gate nào đọc; chỉ tính khi gate đó có cột đã "chốt" (`registerClosureGateIds`). Chữ ký đóng thuộc cặp (sổ, gate): Review owner + Co-sign cho **gate đó**, một chữ ký đóng cho gate sớm hơn không tính cho gate sau (`unclosedRegistersBlocking`).
- **Chữ ký đóng xác nhận và khóa các cột đã chốt tại gate đó**: cột thuộc gate đó hoặc gate sớm hơn (cùng cách chia `columnsByAccountability` mà chữ ký gate dùng), bỏ cột chữ ký. Cột chỉ gate sau nhập vẫn sửa được. Sổ tự do không thêm/xóa hàng được khi còn chữ ký đóng. Mã băm chỉ gồm các cột đó. Chọn "đã chốt" thay vì "gate đọc" vì Product status của watch-list được Gate 4 đọc nhưng còn được cập nhật đến Gate 7.
- **Không còn khóa tự động theo gate pass đối với sổ (thay phần SW-5/SW-24 cho sổ):** gate qua không tự đóng băng cột; việc khóa chỉ do chữ ký đóng (và chữ ký gate đang đứng nhờ snapshot). Vì mỗi gate chỉ pass khi sổ đã đóng, trên thực tế sổ vẫn được khóa trước khi gate qua. Khóa cả sổ khi mọi gate của nó đã pass (`isGateRefLocked`) vẫn giữ. Dữ liệu không phải sổ (BOM, chi phí, checklist, requirement, Key Gate Check, Next Action) giữ khóa tự động.
- **Chữ ký đóng của gate đã pass không rút được** (chỉ Backtrack), như chữ ký gate. Rút chữ ký của gate chưa pass cần lý do như trước.
- Hàng đóng sổ tạo lười khi ký (không còn scaffold), nên `verify:scaffold` không kiểm phần này nữa. Hàm dùng chung: `utils/registerClosures.ts` (server từ chối và bảng làm mờ cùng một câu trả lời). Kiểm: `npm run verify:register-closure`, `verify:e2e`.
- Chưa có dự án nào khi đổi (chủ dự án xác nhận 15/10/2026): migration `20261015150000_register_closure_per_gate` chỉ đổi cấu trúc và dừng nếu gặp hàng đóng sổ.

## 3. Quyền và truy cập

### SW-10. Không có role thì không vào được app — *Đã xây* (2026-10-02)
Đăng nhập Microsoft 365 chỉ chứng minh người đó thuộc tenant. Tài khoản không có role hoặc đã bị vô hiệu hóa bị từ chối mọi request.

### SW-11. Quản trị viên đầu tiên đến từ `PINNED_ADMINS` — *Đã xây* (2026-10-04)
Danh sách email trong cấu hình, áp dụng mỗi lần API khởi động. Không có cơ chế tự cấp admin cho người chưa có role.

### SW-12. Xóa dự án chỉ System Administrator, lưu trữ chỉ Project Owner — *Đã xây* (2026-07-26)
Xóa là kiểm tra cấu trúc (không thể cấp qua giao diện Role Editor) và xóa luôn audit trail, nhưng để lại một bản ghi tombstone. Dự án đã lưu trữ là chỉ-đọc cho đến khi khôi phục.

### SW-13. "View as" là chế độ xem trước chỉ-đọc cho admin — *Đã xây* (2026-10-03)
Mọi request ghi bị chặn khi đang xem trước. Server vẫn xác thực theo phiên thật.

## 4. Dữ liệu

### SW-14. Tên người không bao giờ là cấu hình — *Đã xây* (2026-08-20)
Tên người trong workbook gốc là dữ liệu từng dự án (`ProjectIdentity.reviewers`), không đặt sẵn trong config. Config chỉ giữ vai trò.

### SW-15. Dữ liệu demo chỉ seed vai trò, không bịa nội dung — *Đã xây* (2026-08-20)
Hệ thống kiểm soát bằng chứng, nên không tạo bằng chứng giả để cho đẹp.

### SW-16. Không suy đoán luật nghiệp vụ — *Đang áp dụng*
Mỗi suy đoán có mã `Rn-Qm`, được gắn thẻ `[ASSUMPTION: Rn-Qm]` ở nơi quyết định và ghi vào câu hỏi của vòng mới nhất. `npm run verify:readiness` fail nếu thẻ trỏ vào câu không tồn tại.

## 5. Giao diện

### SW-17. Bảng sửa được dùng bản nháp cục bộ và nút Save — *Đã xây*
Không ghi vào store theo từng phím gõ. Dùng `useDraft` và `SaveBar`.

### SW-21. Ký gate: xem toàn bộ dữ liệu trước, chữ ký gắn với mã băm nội dung — *Đã xây* (2026-10-09)
Bấm Ký mở một cửa sổ hiển thị toàn bộ snapshot mà chữ ký xác nhận (Key Gate Check, checklist, yêu cầu, các cột sổ gate này chịu trách nhiệm, dữ liệu dự án, action còn mở). Người ký tiếp tục sang bước authenticator, và mã xác thực gắn với mã băm SHA-256 của nội dung đó. Khi nộp, server tính lại mã băm trong transaction đã khóa hàng. Nếu phần người ký chịu trách nhiệm đã đổi thì từ chối (422) kèm danh sách chỗ đổi và người sửa, người ký xem lại. Phần của gate sau và sổ ngoài phạm vi không nằm trong mã băm, nên người khác vẫn đóng góp được trong lúc ký. Chữ ký gate không còn dùng số phiên bản của cả dự án. Thực thi: `previewGateSignOff`, `signGateSignOff` trong `projects.service.ts`; `gateSnapshotSignedPart` và `describeGateContentChanges` trong `gateSnapshot.ts`; kiểm tra bằng `verify:e2e`.

### SW-22. Chữ ký đóng phase: khóa dữ liệu cấp phase khi còn chữ ký, và ký không phụ thuộc phiên bản cả dự án — *Đã xây* (2026-10-09)
Chữ ký đóng phase chỉ chốt thêm những thứ các gate không khóa: 8 Angles, evidence summary, xác nhận pre-work và, với Phase 4, các dòng yêu cầu không thuộc gate nào (gate `ALL`, nhóm kiểm tra đóng change control). Khi còn bất kỳ chữ ký phase nào đứng vững, các mục đó chỉ đọc (server từ chối 403, giao diện vô hiệu hóa). Muốn sửa thì người ký rút chữ ký kèm lý do. Chữ ký và rút chữ ký phase không còn kiểm tra `expectedVersion` của cả dự án, vì điều kiện đóng phase đã được server kiểm tra lại trong transaction đã khóa hàng; sửa dữ liệu ở nơi khác không làm lần ký bị 409. ~~Không làm cửa sổ xem trước như SW-21, vì dữ liệu của các gate đã được ký và khóa.~~ **Đảo lại 2026-10-10 (chủ dự án): chữ ký phase cũng có cửa sổ xem trước, xem SW-23.** Thực thi: `isPhaseDataLocked` trong `gateProgress.ts`; `assertPhaseDataOpen` trong `projects.service.ts`; kiểm tra bằng `verify:e2e`. Chưa khóa: liên kết nhanh của phase (`PUT …/key-links`), cố ý để sửa được.

### SW-28. Lịch sử ký của gate: ai ký, quyết định gì, comment gì, ai rút và vì sao — *Đã xây* (2026-10-12, chủ dự án)
Rút một chữ ký xóa sạch hàng chữ ký (người ký, quyết định, comment, ảnh chụp bằng chứng), nên một gate có thể Hold, rút, ký lại, Hold lần nữa mà màn hình chỉ cho thấy trạng thái cuối. Lịch sử đọc từ `audit_events` (bất biến, không có bảng mới, cùng cách `gateChangeLog` làm), hiện ở nút **History** của **card Gate sign-off** (mỗi card chỉ hiện lịch sử của chính nó: History của card Phase Gate Flow chỉ có thay đổi trường và Backtrack, không có chữ ký).
- **Ghi:** khi ký, audit ghi vai trò, quyết định, **comment**, thị trường, mã băm nội dung và thời điểm ký. Khi rút, audit ghi **quyết định, comment và thời điểm của chữ ký bị rút**, cùng lý do và người ký trước đó. Người thực hiện lấy từ phiên đăng nhập.
- **Đọc:** `toGateSignOffLog` (`project-mapper.ts`) → `ProjectData.gateSignOffLog`. Chỉ để hiển thị, không luật nào đọc nó. Gate theo thị trường (10–12) ghi kèm thị trường.
- **Xem nội dung đã ký:** mỗi dòng lịch sử có liên kết mở đúng **nội dung chữ ký đã chứng nhận, như lúc ký**, kể cả chữ ký đã rút (hàng chữ ký đã bị xóa nên đây là nơi duy nhất còn). Nội dung nằm trong một dòng audit riêng (`gate_sign_off.content`, vì nó lớn và danh sách lịch sử không được tải nó ở mỗi lần đọc), được tìm theo gate, thị trường, vai trò và thời điểm ký (`GET /projects/:id/gates/:gateId/sign-offs/content`). Ai đọc được dự án đều xem được, chỉ đọc.
- **Dữ liệu cũ:** audit trước ngày này không lưu comment của chữ ký, không lưu quyết định của chữ ký bị rút và **không lưu nội dung đã ký**; lịch sử của chúng chỉ có những gì lúc đó đã lưu và không có liên kết xem nội dung, không bịa.

### SW-18. Ô ngày dùng `DatePicker` của antd, không dùng `<input type="date">` — *Đã xây* (2026-08-26)
Giá trị lưu dạng chuỗi `YYYY-MM-DD`.

---

## Cách thêm một luật vào đây

1. Ghi luật bằng một câu, kèm ngày quyết định và **Trạng thái**.
2. Nếu luật có code thực thi, ghi nơi thực thi và có kiểm tra tự động nào bảo vệ nó không.
3. Nếu luật quyết định thay SME một điều về sản phẩm, **không ghi ở đây**. Đưa vào `docs/rules/F1_Per_Gate_Open_Questions.md` như một câu hỏi.
