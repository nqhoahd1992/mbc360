# MBc360 — Bảng câu hỏi xác nhận nghiệp vụ trước khi triển khai thực tế

**Mục đích:** Trước khi phát triển backend/database chính thức cho hệ thống MBc360, cần bộ phận chuyên môn (Product Development / NPD / Quality / Regulatory) xác nhận các quy tắc nghiệp vụ dưới đây. Bản demo ReactJS hiện tại đã tạm áp dụng một số giả định để có thể trình bày luồng làm việc — các giả định này **cần được xác nhận hoặc điều chỉnh** trước khi xây dựng hệ thống thật.

**Cách sử dụng:** Với mỗi mục, xin vui lòng xác nhận **Đúng / Sai / Cần điều chỉnh** và ghi chú câu trả lời vào phần "Quyết định của bộ phận chuyên môn".

---

## Nhóm A — Kiến trúc dữ liệu (nên xác nhận trước tiên)

> Các câu hỏi trong nhóm này ảnh hưởng trực tiếp tới thiết kế database. Nếu trả lời sai hướng ban đầu, chi phí sửa lại sau này sẽ rất lớn.

### A1. Gate/Phase theo dõi theo Project hay theo từng Market?

**Bối cảnh:** Một Project có thể nhắm tới nhiều thị trường cùng lúc (ví dụ: Vietnam, Australia, Malaysia). Tuy nhiên tình trạng Gate 10 (Regulatory Dossier) và PIF trên thực tế có thể khác nhau theo từng nước (đã duyệt ở Việt Nam nhưng còn đang chờ ở Úc).

**Giả định hiện tại trong demo:** Một project = một luồng 12 gate duy nhất, dùng chung cho mọi thị trường đã chọn.

**Cần làm rõ:**
- Có cần tách riêng theo dõi Gate 10–12 (hoặc toàn bộ phần Regulatory) theo từng thị trường, hay một luồng gate chung là đủ và chi tiết theo thị trường chỉ nằm trong PIF_Checklist_ASEAN?

**Quyết định của bộ phận chuyên môn:** ______________________________________________

---

### A2. Formula version mới có chạy lại Gate 4–9 không?

**Bối cảnh:** `Product_Family_Register` và `Formulation_Change_Register` cho thấy một sản phẩm có thể có nhiều phiên bản công thức theo thời gian (lưu ý: Việt Nam cần khoảng 6 tháng để đăng ký lại khi đổi công thức).

**Cần làm rõ:** Khi tạo một formula version mới cho cùng một sản phẩm, hệ thống nên:
- (a) Tạo project/gate-flow mới, kế thừa dữ liệu Phase 1 cũ; hoặc
- (b) Mở lại (backtrack) Gate 4–9 trên project hiện tại; hoặc
- (c) Xử lý hoàn toàn qua Change_Control_Comm mà không đụng tới Gate Flow gốc?

**Quyết định của bộ phận chuyên môn:** ______________________________________________

---

### A3. Dữ liệu nguyên liệu / nhà cung cấp: dùng chung hay nhập lại mỗi project?

**Bối cảnh:** `Supplier_RM_Evidence`, `Prohibited_Ingredients`, `PB_Caution_Limits` mang tính chất "registry" — ví dụ SDS/CoA của một nguyên liệu có thể dùng chung cho nhiều công thức khác nhau.

**Giả định hiện tại trong demo:** Mỗi project tự nhập riêng, không chia sẻ dữ liệu.

**Cần làm rõ:**
- Nguyên liệu/nhà cung cấp có nên là master data dùng chung (nhập một lần, mọi project tham chiếu tới) hay mỗi project độc lập?
- Nếu dùng chung, ai có quyền tạo/sửa master data này?

**Quyết định của bộ phận chuyên môn:** Đã có master data Raw Materials trong phần mềm **Cosmetri**, sẽ lấy dữ liệu qua **API** — không nhập lại/nhân bản trong MBc360.

**Còn cần xác nhận thêm (chưa trả lời):**
- Master data **Supplier** (nhà cung cấp) có cũng nằm trong Cosmetri không, hay quản lý ở hệ thống khác?
- Các tài liệu bằng chứng của `Supplier_RM_Evidence` (SDS/CoA/TDS/Allergen statement...) có lưu trong Cosmetri luôn không, hay MBc360 vẫn cần lưu/link riêng?
- Ai có quyền tạo/sửa dữ liệu trong Cosmetri — MBc360 chỉ đọc (read-only qua API) hay có ghi ngược lại không?

---

### A4. Phân quyền theo phòng ban (RBAC)

**Bối cảnh:** Mỗi Gate có "Primary owner" là một phòng ban cụ thể (ví dụ: Gate 07 = Safety/Scientific Review, Gate 10 = Regulatory).

**Giả định hiện tại trong demo:** Không phân quyền — ai cũng sửa được mọi trường.

**Cần làm rõ:**
- Hệ thống thật có cần chặn theo vai trò không — ví dụ chỉ Regulatory mới được đổi Gate decision của Gate 10, chỉ đúng người mới được ký "Approved by"?

**Quyết định của bộ phận chuyên môn:** ______________________________________________

---

## Nhóm B — Vòng đời Gate / Phase

### B1. Cơ chế xác định một Gate đã hoàn thành (Pass)

**Câu hỏi chính:** Gate được coi là PASS (đủ điều kiện mở Gate kế tiếp) khi nào?

**Giả định hiện tại trong demo:** Stage status = **Complete** VÀ Gate decision = **Proceed** hoặc **Proceed with Conditions**.

**Cần làm rõ:**
1. Nếu chỉ có Stage status = Complete nhưng chưa chọn Gate decision — gate có bị coi là "còn treo" (chưa pass), hay Stage status Complete là đủ?
2. "Proceed with Conditions" có được coi ngang hàng với "Proceed" để mở gate kế tiếp không, hay chỉ cho phép "tạm mở" kèm theo dõi riêng "điều kiện" đó cho tới khi đóng phase?
3. Nếu Stage status = "Gap" (phát hiện thiếu sót) — gate có bị khóa cứng không được chọn decision "Proceed" luôn, hay vẫn cho phép "Proceed with Conditions" song song với Gap?
4. "Hold" xuất hiện ở cả 2 cột (Stage status và Gate decision) — ý nghĩa của 2 cái này khác nhau ra sao?

**Quyết định của bộ phận chuyên môn:** ______________________________________________

---

### B2. Next action / Next due date / Next owner

**Câu hỏi chính:** Ba trường này chỉ là bản ghi thông tin hay có điều khiển logic (chặn gate/phase)?

**Giả định hiện tại trong demo:** Chỉ là bản ghi thông tin đơn thuần, không chặn gì; là một bản ghi duy nhất mỗi phase (không lặp lại nhiều dòng).

**Cần làm rõ:**
1. Một phase có thể có nhiều Next action cùng lúc (danh sách) hay chỉ một dòng duy nhất như hiện tại?
2. Nếu Next action còn mở (chưa xử lý xong) thì phase có được phép coi là "hoàn thành" không? Hay Next action mở chính là dấu hiệu bắt buộc phải đi kèm decision = "Proceed with Conditions" (liên quan mục B1)?
3. Next action có cần trạng thái riêng (Open / In Progress / Done) để theo dõi, hay chỉ là ô nhập tự do không track?
4. Ai là người chịu trách nhiệm đóng Next action — người ở phase hiện tại (nơi ghi ra) hay người nhận ở phase kế tiếp (owner được ghi)?

**Quyết định của bộ phận chuyên môn:** ______________________________________________

---

### B3. Cơ chế xác định một Phase đã hoàn thành

**Câu hỏi chính:** Phase được coi là HOÀN THÀNH khi nào? Đề nghị xác nhận từng điều kiện dưới đây có bắt buộc hay không:

| # | Điều kiện | Bắt buộc? |
|---|---|---|
| a | Cả 3 Gate trong phase đều Pass (theo mục B1) | |
| b | Toàn bộ Key Gate Checks của phase = Done/Y (hoặc N/A) | |
| c | Toàn bộ 8 Angles Coverage = Covered (hoặc N/A ở góc không áp dụng) | |
| d | Sign-off đủ cả 3 vai trò (Prepared / Reviewed / Approved), hay chỉ cần Approved by? | |
| e | Toàn bộ Next action đã đóng | |

**Giả định hiện tại trong demo:** Chỉ áp dụng (a) + phần "Approved by" trong (d) — chưa kiểm tra (b), (c), (e).

**Cần làm rõ:**
1. Nếu một mục trong Key Gate Checks / 8 Angles đánh dấu N/A — có được tính là "đã thỏa" không?
2. Có bắt buộc thứ tự: phải hoàn thành Key Gate Checks + 8 Angles xong rồi mới được phép Sign-off, hay hai việc làm song song độc lập?

**Quyết định của bộ phận chuyên môn:** ______________________________________________

---

### B4. Cascade khi Backtrack và xử lý dữ liệu/chữ ký cũ

**Ví dụ cụ thể:** Backtrack từ Gate 5 (Phase 2) về Gate 2 (Phase 1).

**Câu hỏi chính:** Gate 3 (Phase 1), Gate 4 (Phase 2) — nằm giữa gate đích và gate xuất phát — có tự động chuyển Stage status về "Not Started" không?

**Giả định hiện tại trong demo:** Có — tất cả gate từ đích tới trước gate xuất phát tự động về "Not Started", đồng thời hủy chữ ký "Approved by" của phase nào có gate bị reopen (Phase 1), buộc ký lại. Dữ liệu khác (Owner, Due date, Evidence link, Notes) không bị xóa, chỉ thêm một dòng ghi chú mô tả sự kiện backtrack vào cột Notes. Không lưu snapshot/revision riêng.

**Cần làm rõ:**
1. Khi reset, field nào bị xóa sạch, field nào giữ nguyên để tham khảo? (Gate decision cũ, Owner, Due date, Evidence link, Notes)
2. Chữ ký (Sign-off) đã Approved trước đó của Phase 1: tự động hủy và bắt ký lại (như demo đang làm), hay giữ nguyên chữ ký cũ như lịch sử, chỉ thêm ghi chú "đã backtrack — cần review lại"?
3. Có bắt buộc lưu lại phiên bản (revision/audit trail) dữ liệu trước khi bị reset không? Ví dụ: snapshot toàn bộ Gate 2/3/4 + chữ ký Phase 1 tại thời điểm trước backtrack, gắn vào một "Backtrack Event Log" (ai, khi nào, từ gate nào về gate nào, lý do, dữ liệu cũ là gì)?
   - *Lưu ý liên quan*: Introduction sheet của file gốc có ghi rõ đây là "controlled project evidence record" và nguyên tắc "no silent corrections" — nếu đúng theo tinh thần đó, có thể đây là yêu cầu bắt buộc chứ không phải tùy chọn.
4. Backtrack có giới hạn phạm vi không — được phép backtrack xuyên nhiều phase (ví dụ từ Phase 3/Gate 8 thẳng về Phase 1/Gate 1) hay chỉ giới hạn lùi trong phạm vi gần?

**Quyết định của bộ phận chuyên môn:** ______________________________________________

---

## Nhóm C — Quy tắc nghiệp vụ đặc thù

### C1. "Skincare for Two" có thực sự chặn gate không?

**Bối cảnh:** Introduction ghi rõ: *"Maternal products must include maternal use plus baby-contact/infant exposure consideration; this is mandatory, not optional."*

**Cần làm rõ:**
1. Điều kiện "mandatory" này được kích hoạt tự động thế nào — do người dùng chọn "Pregnancy/Breastfeeding/Postpartum/Infant 0+" ở Gate 02 (Phase 1)?
2. Khi đã kích hoạt, Gate 07 có bị khóa cứng không cho Proceed nếu các mục an toàn mẹ & bé chưa hoàn tất — hay vẫn chỉ là nhắc nhở?

**Quyết định của bộ phận chuyên môn:** ______________________________________________

---

### C2. Chuỗi phê duyệt Study/Human Trial có phải vai trò cố định không?

**Bối cảnh:** Introduction ghi cụ thể: *"Chris prepares study proposal, George/Head of Department signs off, Sekar or nominated independent reviewer signs off outside the department."*

**Cần làm rõ:**
1. Đây là quy trình phê duyệt riêng cho Study Protocol (3 vai trò khác với Prepared/Reviewed/Approved chung), hay chỉ dùng lại khối Sign-off có sẵn của Gate 08?
2. Có cần ràng buộc "independent reviewer" không được cùng phòng ban với người chuẩn bị (tránh xung đột lợi ích) không?
3. Tên người (Chris/George/Sekar) là ví dụ minh họa hay là vai trò cố định cần hard-code?

**Quyết định của bộ phận chuyên môn:** ______________________________________________

---

### C3. Prohibited Ingredients / Caution Limits: tự động đối chiếu hay nhập tay?

**Bối cảnh:** Template_Index ghi: *"Formula match formulas flag possible matches"* — nghe như một phép đối chiếu tự động.

**Cần làm rõ:** Khi nhập tên nguyên liệu vào Formula BOM, hệ thống có cần tự động dò trong danh sách Prohibited/Caution để cảnh báo ngay (ví dụ: "REVIEW - possible formula match"), hay hoàn toàn do người dùng tự kiểm tra và nhập kết luận bằng tay?

**Quyết định của bộ phận chuyên môn:** ______________________________________________

---

### C4. Change Control có chặn Gate Flow không?

**Câu hỏi chính:** Nếu có một Change Control record đang mở (chưa đóng) liên quan tới một project — điều đó có ảnh hưởng gì tới Gate Flow của project đó không?

**Giả định hiện tại trong demo:** Hai luồng hoàn toàn độc lập, không liên kết.

**Cần làm rõ:** Có cần bắt buộc liên kết Change record với Gate/Phase bị ảnh hưởng, và gate đó phải "tạm khóa" hoặc hiện cảnh báo cho tới khi Change được đóng không?

**Quyết định của bộ phận chuyên môn:** ______________________________________________

---

### C5. PIF export/launch có bị chặn cứng bởi trạng thái PIF không?

**Bối cảnh:** *"No external HCP/distributor/pharmacy claim use until PIF attachment status and approval are closed."*

**Cần làm rõ:** Gate 11 (Production/Launch sign-off) có bị khóa cứng nếu PIF_Checklist_ASEAN chưa đóng đủ (theo từng market liên quan — xem lại mục A1), hay chỉ là cảnh báo/khuyến nghị?

**Quyết định của bộ phận chuyên môn:** ______________________________________________

---

## Ghi chú

- Nhóm A (kiến trúc dữ liệu) nên được xác nhận **trước tiên** vì ảnh hưởng trực tiếp tới thiết kế database — trả lời sai hướng ban đầu sẽ tốn công sửa lại sau.
- Nhóm B và C là quy tắc nghiệp vụ có thể tinh chỉnh dần trong quá trình phát triển mà không nhất thiết phá vỡ kiến trúc, nhưng vẫn cần xác nhận sớm để tránh phải làm lại UI/logic đã xây.
- Tài liệu tham chiếu: `MBc360 Master Product Development System File.xlsx` (54 sheets) và bản demo ReactJS hiện tại (`mbc360-app/`).
