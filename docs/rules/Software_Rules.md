# Luật của phần mềm (không cần SME xác nhận)

Tài liệu này ghi các luật **do chủ dự án quyết định về cách phần mềm hoạt động**. Chúng không phải luật nghiệp vụ của SME, nên không đi vào `Business_Rules_Confirmation_*` và không cần đưa vào vòng câu hỏi nào.

**Ranh giới với luật nghiệp vụ.** Nếu một luật nói *một sản phẩm mỹ phẩm phải đạt điều gì* (an toàn, claim, đăng ký thị trường) thì đó là của SME, và phải hỏi. Nếu nói *phần mềm bảo vệ dữ liệu và ghi vết như thế nào* thì đó là luật phần mềm và nằm ở đây. Nghi ngờ thì coi là luật nghiệp vụ và hỏi SME.

Mỗi luật có **Trạng thái**: `Đã xây` (code đang thực thi) hoặc `Đã chốt, chưa xây` (đã quyết, chưa có code).

---

## 1. Khóa dữ liệu khi gate đã passed

### SW-1. Bằng chứng của gate bị khóa khi gate passed — *Đã xây* (2026-07-23)
Khi một gate passed (Complete + quyết định Proceed hoặc Proceed with Conditions + không còn blocker), bằng chứng gắn với gate đó chuyển sang chỉ-đọc trên toàn app. Muốn sửa phải Backtrack. Luật được thực thi ở cả UI và API.
Code: `isGateRefLocked` trong `packages/shared/src/utils/gateProgress.ts`.

### SW-2. Sổ dùng ở nhiều gate chỉ khóa khi mọi gate của nó đã passed — *Đã xây*
Ví dụ sổ gate `04/07` còn sửa được cho đến khi Gate 07 passed. Hệ quả đã biết: bằng chứng mà gate sớm đọc vẫn sửa được sau khi gate đó ký. Hệ quả này được SW-4 và SW-5 xử lý.

### SW-3. Sổ không có gate không bao giờ khóa, và không được làm bằng chứng cho gate — *Đã xây* (2026-10-09)
Sổ có gate là `ALL` hoặc để trống không bao giờ khóa. Vì vậy **không check readiness nào được đọc một sổ như vậy**, nếu không gate có thể passed trên bằng chứng sửa được mãi mãi.
Thực thi: `npm run verify:readiness`, sweep S6, **fail build** và nêu tên sổ cùng gate tham chiếu. Hiện có 12 sổ như vậy, không sổ nào bị readiness đọc.

### SW-4. Hàng được tạo sau khi gate N passed không tính vào readiness và snapshot của gate N — *Đã xây một phần* (2026-10-09)
Hàng mới chỉ thuộc về các gate chưa passed. Nếu không có luật này, thêm một hàng ở Gate 10 vào sổ claim sẽ làm check của Gate 03 hết thỏa và chữ ký Gate 03 chuyển stale.
Cách làm: server ghi vào mỗi hàng một id ổn định (`__rowId`) và **gate đầu tiên chưa passed** tại lúc hàng được lưu lần đầu (`__bornAtGate`). Không dùng "gate đang mở" của `currentGateIndex`: nó còn giữ ở gate đã passed khi phase chưa đóng, nên hàng tạo lúc đó sẽ bị khóa ngay. Lỗi này lộ ra khi chạy API thật trên gate đã passed. Client gửi gì cho hai trường này cũng bị bỏ. Readiness và snapshot của gate N chỉ thấy các hàng có `__bornAtGate` ≤ N (`projectAsOfGate`).
- **Hàng cũ không có dấu** (tạo trước luật này) thuộc về mọi gate, đúng như app đã đối xử với chúng. Không bịa lịch sử, nên luật không làm readiness của dự án đang có chặt hơn hay lỏng hơn.
- **Sau Backtrack:** hàng tạo ở Gate 10 vẫn chỉ thuộc từ Gate 10 trở đi, kể cả khi Gate 03 được mở lại và ký lại. Lý do: nó được tạo sau khi Gate 03 từng passed.
- **Chưa làm:** hàng được tạo qua các đường khác ngoài lưu sổ (seed, import) chỉ có dấu ở hai nơi đã sửa (stub vật liệu từ Cosmetri, dòng FC khi đổi version công thức). Các đường còn lại tạo hàng không dấu, tức thuộc mọi gate.
Code: `registerRowBirth.ts`, `registerRowLocks.ts` (`stampRegisterRows`), `setRegisterRows`. Migration `20261009120000_register_row_identity` chỉ gán id cho hàng có sẵn (dữ liệu, không đổi schema). Kiểm tra: `npm run verify:freeze` (cả logic thuần lẫn một dự án dựng bằng factory có SG01–SG03 passed thật, gồm ca hàng tạo lúc gate passed mà phase chưa đóng và snapshot bỏ qua hàng muộn; đã thử âm tính).

### SW-5. Người ký duyệt toàn bộ nội dung đang có; mỗi cột có một gate sở hữu — *Đã xây, còn hai nguồn chờ quyết định* (2026-10-09)
**Nguyên tắc (chủ dự án):** người ký để gate pass đồng ý với **toàn bộ nội dung đang được điền**, kể cả các trường thuộc gate tương lai; và gate tương lai cũng phải phê duyệt dữ liệu liên quan đến gate cũ.

Cách hiện thực: mỗi cột có một **gate sở hữu**. Chữ ký của gate G chia nội dung các sổ nó đọc làm hai phần, mỗi phần cho mọi cột của sổ, không chỉ cột mà check đọc:
- **Phần chịu trách nhiệm** — các cột do G hoặc gate **trước** G sở hữu. Thay đổi ở đây làm chữ ký stale. Đây là cách gate sau "phê duyệt luôn dữ liệu của gate cũ": nó nằm trong snapshot của gate sau, và vì đã bị đóng băng từ khi gate cũ pass nên chỉ đổi được bằng Backtrack.
- **Phần ghi nhận** — các cột do gate **sau** G sở hữu. Người ký duyệt những gì đang điền tại thời điểm ký và nó được lưu lại, nhưng gate sau còn phải hoàn thiện nên thay đổi ở đó **chỉ được báo thông tin, không làm chữ ký stale** (không thì công việc bình thường của gate sau sẽ mở lại gate trước). Ví dụ chữ ký Gate 3 ghi `evidenceGrade` (Gate 8); điền cột đó không làm Gate 3 stale.

**Phạm vi (chủ dự án, 09/10/2026): dữ liệu liên quan đến readiness, không phải mọi loại dữ liệu.** Chữ ký ghi những gì readiness của gate đó đọc. Ngoài các sổ, đó là: Formula BOM, costing, formula properties, năm assessment, study approval trail, các trường định danh dự án (scope, target users, markets), market tracks, change records, post-launch reviews và lịch sử phiên bản công thức. Phần nào gate đọc cũng được **đo** (`PROJECT_SLICE_READS_BY_GATE`), không khai tay. Chủ sở hữu theo khóa mà API đã có: định danh → Gate 01; BOM, costing, formula properties → Gate 05; mỗi assessment → gate có tab trả lời nó; study approvals → Gate 08. Market tracks, change records, post-launch reviews và lịch sử phiên bản **chưa có khóa theo gate nên chưa có chủ**: được ghi lại và báo khi đổi sau lúc ký, nhưng không bao giờ làm chữ ký stale. Các phần không liên quan readiness (reviewers, project lead, dữ liệu công ty như market profile) không nằm trong chữ ký.

Cột **bị đóng băng khi gate sở hữu passed** (cho các hàng thuộc gate đó, SW-4). Hàng mà một gate đã passed dùng làm bằng chứng không xóa được. Luật này **không** giới hạn ai được điền hay điền lúc nào trước khi gate sở hữu pass: điền sớm cột của gate sau vẫn được (SME cho phép làm trước, F13, và A4 để bằng chứng mở cho người đóng góp).

**Ai sở hữu cột** (theo thứ tự ưu tiên):
1. `RegisterColumn.gate` ghi tay, khi sheet gốc nói rõ (sổ claim có trên hầu hết cột). Một lần đọc không bao giờ ghi đè: Gate 12 đọc lời claim để biết có cần bằng chứng hiệu quả không, nhưng lời claim vẫn là bằng chứng của Gate 3.
2. Nếu không: **gate đọc cột đó sau cùng** (chủ dự án quyết 09/10/2026). Cột hai gate cùng đọc thuộc về gate sau; gate trước không ký cột đó nên gate sau hoàn thiện được mà không làm gate trước hết pass. Gate trước vẫn ghi nhận cột đó trong chữ ký (xem trên), nhưng thay đổi sau này không làm chữ ký stale.
3. Cột không ai đọc và không có khai báo: giữ cách khóa theo danh sách gate của cả sổ.
Một **trigger** đọc cột để quyết định một item có áp dụng không thì không bao giờ sở hữu cột đó.

**"Cột nào gate nào đọc" được đo, không viết tay.** `registerColumnReads.ts` do `npm run generate:column-reads` sinh ra bằng cách chạy từng check và trigger thật trên 120 dự án ngẫu nhiên (hạt giống cố định) trong khi ghi lại mọi truy cập cột. Cách này thấy được cả các check riêng và các nhánh điều kiện mà việc đọc code dễ sót. `verify:readiness` chạy lại phép đo và **fail nếu file lỗi thời** (S7); S6 fail nếu gate đọc một sổ không có gate (SW-3).

**Chữ ký cũ** (không có `registerCells`) vẫn được so sánh theo cả sổ như trước, không bị coi là stale oan và cũng không bị nới lỏng. Một section checklist mà chữ ký cũ chưa từng ghi không bị tính là thay đổi.

**Checklist trải nhiều gate** (`testingFamilies`, gate `08-09`) được ký ở gate cuối trong danh sách. Trước đây nó thuộc về không gate nào vì so sánh chuỗi `'08-09' !== '08'`, nên chưa từng nằm trong chữ ký nào.

**Lưu ý:** việc gate còn "passed" không chỉ phụ thuộc chữ ký. Danh sách readiness của gate được tính lại trực tiếp, nên sửa một cột dùng chung theo cách làm một item của gate trước không còn thỏa (ví dụ đặt `productStatus` thành "Prohibited - remove" khi Gate 4 đã pass và Gate 7 chưa) vẫn làm gate trước hết pass. Đó là mong muốn: một nguyên liệu bị cấm phát hiện muộn phải chặn lại.

**Next Action** thuộc SW-19.

Thực thi ở API (`setRegisterRows` từ chối, nêu ô và gate đã khóa) và ở bảng trên web (`DynamicTable`, kể cả Supplier & RM Evidence và Published Info vốn bọc nó: ô chỉ-đọc kèm gợi ý, nút xóa hàng vô hiệu hóa kèm lý do), cùng dùng một hàm. Kiểm tra: `npm run verify:freeze`.

**Còn mở, vì cần một luật chứ không phải việc cơ học:**
- **Market tracks** (Gate 10–12): `setMarketTracks` không có khóa theo gate. Khóa `launchApproval` sau Gate 11 sẽ cấm thu hồi phê duyệt phát hành khi sản phẩm đã bán, mà việc đó có thật ngoài đời (thu hồi, rút khỏi thị trường).
- **Change Control** (toàn cục, Gate 11): dữ liệu toàn cục với cơ chế soft-lock riêng; đóng băng nó theo gate không có nghĩa.

**Hai phát hiện không thuộc SW-5, ghi lại để quyết riêng:**
- Gate 8 yêu cầu cả bảy dòng của `infantTesting`, trong đó năm dòng gắn gate 09. Một gate đòi dòng của gate sau.
- Check độ phủ công thức đọc `rmCode` của ma trận an toàn, nhưng sổ đó **không có cột `rmCode`**. Phép nối theo `rmCode` không bao giờ khớp và luôn rơi về `inciName`.

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

### SW-18. Ô ngày dùng `DatePicker` của antd, không dùng `<input type="date">` — *Đã xây* (2026-08-26)
Giá trị lưu dạng chuỗi `YYYY-MM-DD`.

---

## Cách thêm một luật vào đây

1. Ghi luật bằng một câu, kèm ngày quyết định và **Trạng thái**.
2. Nếu luật có code thực thi, ghi nơi thực thi và có kiểm tra tự động nào bảo vệ nó không.
3. Nếu luật quyết định thay SME một điều về sản phẩm, **không ghi ở đây**. Đưa vào `docs/rules/F1_Per_Gate_Open_Questions.md` như một câu hỏi.
