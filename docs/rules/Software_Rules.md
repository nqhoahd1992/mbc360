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

### SW-5. Khóa theo cột và theo hàng trong sổ nhiều gate — *Đã xây một phần* (2026-10-09)
Mỗi cột của sổ nhiều gate thuộc một gate. Khi gate đó passed thì cột bị khóa cho các hàng thuộc gate đó. Hàng mà một gate đã passed dùng làm bằng chứng không xóa được.
Nguồn "cột thuộc gate nào": `RegisterColumn.gate` (ghi tay) rồi đến suy ra từ readiness (`derivedColumnGate`). **Cột không gate nào đọc thì không có chủ** và giữ cách khóa hiện tại, tức khóa khi mọi gate của sổ đã passed. Hàng sinh ra sau khi gate passed thì ô của nó không bị khóa bởi gate đó.
Thực thi ở API (`setRegisterRows` từ chối, nêu ô và gate đã khóa) và ở bảng trên web (`DynamicTable`: ô chỉ-đọc kèm gợi ý, nút xóa hàng vô hiệu hóa kèm lý do), cùng dùng một hàm.
- **Bảng riêng:** Supplier & RM Evidence và Published Info bọc `DynamicTable`, nên ô bị khóa cũng được tô xám ở đó (bảng báo cho trình vẽ ô riêng là chỉ-đọc).
- **Chưa phủ:** các check riêng (watch-list, ma trận an toàn…) đọc cột mà config không khai, nên chưa được suy ra cột. Checklist, requirement section, Next Actions, market tracks và Change Control không thuộc cơ chế này.
- **Đã kiểm thử đầu-cuối** (2026-10-09, API thật trên DB thử, gate SG01–SG03 được đặt passed bằng cách bỏ trống danh sách readiness của chúng trong tiến trình thử và đánh dấu chữ ký đóng sổ bằng SQL; không đổi code thật, không tắt authenticator): sửa ô của gate đã passed → 403, xóa hàng đó → 403, sửa ô không có chủ → 200, hàng tạo sau khi gate passed sửa và xóa được, hàng cũ không dấu vẫn được bảo vệ.
Báo cáo S6 trong `verify:readiness` đếm phần đã phủ riêng và chỉ liệt kê phần còn mở.

## 2. Chữ ký và ghi vết

### SW-6. Không sửa âm thầm — *Đã xây*
Sửa dữ liệu đã chốt phải đi qua Backtrack. Ai làm, vì sao, khi nào nằm trên bản ghi bất biến (`backtrackEvents`, `gateChangeLog`), không nằm trong ô ghi chú sửa được.

### SW-7. Chữ ký là hành động đã xác thực, không phải chữ gõ tay — *Đã xây*
Tên, vai trò, thời điểm do server ghi từ phiên đăng nhập. Client chỉ gửi quyết định và nhận xét. Chữ ký có ảnh đi kèm yêu cầu mã authenticator dùng một lần.

### SW-8. Chữ ký gắn với snapshot bằng chứng và hết hiệu lực khi bằng chứng đổi — *Đã xây*
Snapshot được lưu đầy đủ và so sánh, hệ thống chỉ ra mục nào đã đổi. Snapshot không chứa quyết định của gate và không chứa kết quả readiness, để tránh vòng lặp tự tham chiếu.

### SW-9. Server là nơi thực thi duy nhất — *Đã xây*
Mọi guard ở UI phải có bản tương ứng ở API, gọi cùng hàm trong `packages/shared`, không viết lại.

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
