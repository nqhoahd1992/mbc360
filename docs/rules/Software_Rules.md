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
Chữ ký đóng phase chỉ chốt thêm những thứ các gate không khóa: 8 Angles, evidence summary, xác nhận pre-work và, với Phase 4, các dòng yêu cầu không thuộc gate nào (gate `ALL`, nhóm kiểm tra đóng change control). Khi còn bất kỳ chữ ký phase nào đứng vững, các mục đó chỉ đọc (server từ chối 403, giao diện vô hiệu hóa). Muốn sửa thì người ký rút chữ ký kèm lý do. Chữ ký và rút chữ ký phase không còn kiểm tra `expectedVersion` của cả dự án, vì điều kiện đóng phase đã được server kiểm tra lại trong transaction đã khóa hàng; sửa dữ liệu ở nơi khác không làm lần ký bị 409. Không làm cửa sổ xem trước như SW-21, vì dữ liệu của các gate đã được ký và khóa. Thực thi: `isPhaseDataLocked` trong `gateProgress.ts`; `assertPhaseDataOpen` trong `projects.service.ts`; kiểm tra bằng `verify:e2e`. Chưa khóa: liên kết nhanh của phase (`PUT …/key-links`), cố ý để sửa được.

### SW-18. Ô ngày dùng `DatePicker` của antd, không dùng `<input type="date">` — *Đã xây* (2026-08-26)
Giá trị lưu dạng chuỗi `YYYY-MM-DD`.

---

## Cách thêm một luật vào đây

1. Ghi luật bằng một câu, kèm ngày quyết định và **Trạng thái**.
2. Nếu luật có code thực thi, ghi nơi thực thi và có kiểm tra tự động nào bảo vệ nó không.
3. Nếu luật quyết định thay SME một điều về sản phẩm, **không ghi ở đây**. Đưa vào `docs/rules/F1_Per_Gate_Open_Questions.md` như một câu hỏi.
