# MBc360 — Bảng câu hỏi xác nhận nghiệp vụ trước khi triển khai thực tế

**Mục đích:** Trước khi phát triển backend/database chính thức cho hệ thống MBc360, cần bộ phận chuyên môn (Product Development / NPD / Quality / Regulatory) xác nhận các quy tắc nghiệp vụ dưới đây. Bản demo ReactJS hiện tại đã tạm áp dụng một số giả định để có thể trình bày luồng làm việc — các giả định này **cần được xác nhận hoặc điều chỉnh** trước khi xây dựng hệ thống thật.

**Cách sử dụng:** Với mỗi mục, xin vui lòng xác nhận **Đúng / Sai / Cần điều chỉnh** và ghi chú câu trả lời vào phần "Quyết định của bộ phận chuyên môn".

> **Trạng thái (16/07/2026):** Đã nhận và ghi lại quyết định của bộ phận chuyên môn cho **tất cả các mục trừ C7** (vẫn còn mở). Đội ngũ bổ sung thêm 2 yêu cầu mới (Tài liệu GMP, quy trình Published Information Approval). Các điểm còn mở được tổng hợp tại mục **"Danh sách câu hỏi cần làm rõ tiếp (follow-up)"** ở cuối tài liệu.

---

## Nhóm A — Kiến trúc dữ liệu (nên xác nhận trước tiên)

> Các câu hỏi trong nhóm này ảnh hưởng trực tiếp tới thiết kế database. Nếu trả lời sai hướng ban đầu, chi phí sửa lại sau này sẽ rất lớn.

### A1. Gate/Phase theo dõi theo Project hay theo từng Market?

**Bối cảnh:** Một Project có thể nhắm tới nhiều thị trường cùng lúc (ví dụ: Vietnam, Australia, Malaysia). Tuy nhiên tình trạng Gate 10 (Regulatory Dossier) và PIF trên thực tế có thể khác nhau theo từng nước (đã duyệt ở Việt Nam nhưng còn đang chờ ở Úc).

**Giả định hiện tại trong demo:** Một project = một luồng 12 gate duy nhất, dùng chung cho mọi thị trường đã chọn.

**Cần làm rõ:**
- Có cần tách riêng theo dõi Gate 10–12 (hoặc toàn bộ phần Regulatory) theo từng thị trường, hay một luồng gate chung là đủ và chi tiết theo thị trường chỉ nằm trong PIF_Checklist_ASEAN?

**Quyết định của bộ phận chuyên môn:** ✅ **Đã xác nhận — mô hình lai (hybrid).**
- Một master project với **một luồng phát triển duy nhất cho Gate 1–9**.
- **Gate 10–12 theo dõi riêng theo từng thị trường** (Regulatory, Launch và Post-launch).
- Công thức chỉ phát triển một lần, nhưng phê duyệt pháp lý, trạng thái PIF, phê duyệt claims và mức độ sẵn sàng launch có thể khác nhau theo từng nước.
- Mỗi thị trường có riêng: **PIF status, Regulatory status, Claims approval, Launch approval, Regulatory notes, Approval dates**.
- Cách này tránh lặp lại công việc phát triển nhưng vẫn quản lý pháp lý theo từng nước.

*Còn mở: → F4 (tương tác với thay đổi công thức trên sản phẩm đã launch; thêm/bớt thị trường giữa chừng; trạng thái hoàn thành tổng thể của project khi các thị trường lệch nhau).*

---

### A2. Formula version mới có chạy lại Gate 4–9 không?

**Bối cảnh:** `Product_Family_Register` và `Formulation_Change_Register` cho thấy một sản phẩm có thể có nhiều phiên bản công thức theo thời gian (lưu ý: Việt Nam cần khoảng 6 tháng để đăng ký lại khi đổi công thức).

**Cần làm rõ:** Khi tạo một formula version mới cho cùng một sản phẩm, hệ thống nên:
- (a) Tạo project/gate-flow mới, kế thừa dữ liệu Phase 1 cũ; hoặc
- (b) Mở lại (backtrack) Gate 4–9 trên project hiện tại; hoặc
- (c) Xử lý hoàn toàn qua Change_Control_Comm mà không đụng tới Gate Flow gốc?

**Quyết định của bộ phận chuyên môn:** ✅ **Đã xác nhận — Phương án (b).**
- Formula version mới **mở lại (backtrack) Gate 4–9** trên project hiện tại; **không** tạo project mới.
- Project gốc vẫn là lịch sử master.
- Thông tin Phase 1 (nhu cầu người dùng, concept sản phẩm, thị trường...) được giữ nguyên.
- Thiết kế lại công thức, testing, safety và validation được lặp lại.
- **Thay đổi công thức lớn (major) tự động tạo formula version mới**, đồng thời bảo toàn các version cũ để phục vụ audit.

*Còn mở: → F4 (các market track Gate 10–12 đã đóng xử lý ra sao; hai version tồn tại song song), → F5 (định nghĩa thay đổi "major" vs "minor").*

---

### A3. Dữ liệu nguyên liệu / nhà cung cấp: dùng chung hay nhập lại mỗi project?

**Bối cảnh:** `Supplier_RM_Evidence`, `Prohibited_Ingredients`, `PB_Caution_Limits` mang tính chất "registry" — ví dụ SDS/CoA của một nguyên liệu có thể dùng chung cho nhiều công thức khác nhau.

**Giả định hiện tại trong demo:** Mỗi project tự nhập riêng, không chia sẻ dữ liệu.

**Cần làm rõ:**
- Nguyên liệu/nhà cung cấp có nên là master data dùng chung (nhập một lần, mọi project tham chiếu tới) hay mỗi project độc lập?
- Nếu dùng chung, ai có quyền tạo/sửa master data này?

**Quyết định của bộ phận chuyên môn:** ✅ **Đã xác nhận — Cosmetri là nguồn master data.**
- Master data Raw Materials đã có trong **Cosmetri**, MBc360 lấy qua **API** — không nhập lại/nhân bản trong MBc360.
- Master data **Supplier** cũng lấy từ Cosmetri khi có thể.
- Các tài liệu bằng chứng (SDS, CoA, TDS, allergen statement...) **tiếp tục lưu trong Cosmetri**; MBc360 chỉ tham chiếu/link, không nhân bản tài liệu.
- MBc360 **chỉ đọc (read-only)** dữ liệu Cosmetri. Mọi chỉnh sửa master data thực hiện trong Cosmetri.
- MBc360 chỉ lưu **bằng chứng và link đặc thù theo project**.

*Còn mở: → F12 (chi tiết kỹ thuật API Cosmetri; xử lý khi nguyên liệu chưa có trong Cosmetri).*

**Cập nhật (16/07/2026) — Đã nhận tài liệu API Cosmetri (`docs/swagger-init.json`, OpenAPI 3.0, base `https://app1-env.cosmetri.com/api/v1`):**
- **Xác thực:** OAuth2 password grant qua `/oauth/token` → JWT bearer + refresh token (có thời hạn). Mọi endpoint đều có rate limit (429); các endpoint list hỗ trợ `page`/`limit` và **`since_updated_at`** để đồng bộ tăng dần (không có webhook — mô hình polling).
- **Raw materials** (`/raw-material/{id}`, `/list`, `/details` batch ≤100): trade name, danh mục, **ID + tên nhà cung cấp** (`inf_sup_id`, `supplier_name`), trạng thái chất lượng ("Approved"/quarantine), số lô (`inf_code` — theo field mapping chính thức đây là **Batch No.**, không phải số CAS), MOQ, lead time, tồn kho, vị trí, chi phí.
- **Formulas** (`/formula/*`): **version** công thức ("2.1.0"), reference, trạng thái, production mode, và toàn bộ `formula_composition` (RM id/trade name/code + `%`) — dùng trực tiếp để đổ dữ liệu Formula BOM của MBc360.
- **Compliance** (`/compliance/{formulaId}`): loại sản phẩm & exposure (leave-on/rinse-off), compliance zones, và `chemical_composition` với **`inci_name`, `cas_no`, `ec_no`, `% w/w`** từng nguyên liệu — đầu vào lý tưởng cho phép đối chiếu tự động prohibited/caution (C3).
- **Products** và **manufacturing orders**: tra cứu id/title/reference.
- ⚠️ Có một endpoint **ghi** (`PUT /raw-material/update` — cost/MOQ/stock). Theo quyết định read-only, MBc360 đơn giản là không dùng endpoint này.
- ⚠️ Response của RM có **tên nhà cung cấp** (`supplier_name`), nhưng **không có endpoint supplier độc lập** (địa chỉ/liên hệ/hồ sơ đánh giá không được expose) và **không có endpoint tài liệu** (file/link SDS/CoA/TDS không được expose) — xem F12 đã thu hẹp.

**Quyết định (16/07/2026, sau khi rà soát API):**
- **Dữ liệu nào API không cung cấp thì nhập tay trong MBc360** — chi tiết nhà cung cấp ngoài tên, và các link tài liệu SDS/CoA/TDS vẫn là trường nhập tay trong `Supplier_RM_Evidence`.
- **Quy trình nguyên liệu mới:** một thành viên nhóm nghiên cứu tạo **change request "Create new raw material" trên Power Apps** → request đi qua quy trình phê duyệt → sau phê duyệt, nguyên liệu được nhập liệu vào Cosmetri → MBc360 gọi được nguyên liệu đó qua API. Khi một nguyên liệu chưa có để chọn, màn hình chọn nguyên liệu của MBc360 sẽ **gắn link tới ứng dụng Power Apps** để người dùng tạo request ngay tại chỗ.
- Câu hỏi về độ phủ compliance zones ASEAN/Việt Nam vẫn mở → F12.

---

### A4. Phân quyền theo phòng ban (RBAC)

**Bối cảnh:** Mỗi Gate có "Primary owner" là một phòng ban cụ thể (ví dụ: Gate 07 = Safety/Scientific Review, Gate 10 = Regulatory).

**Giả định hiện tại trong demo:** Không phân quyền — ai cũng sửa được mọi trường.

**Cần làm rõ:**
- Hệ thống thật có cần chặn theo vai trò không — ví dụ chỉ Regulatory mới được đổi Gate decision của Gate 10, chỉ đúng người mới được ký "Approved by"?

**Quyết định của bộ phận chuyên môn:** ✅ **Đã xác nhận — bắt buộc áp dụng RBAC.**
- Chỉ Regulatory được phê duyệt các quyết định pháp lý.
- Chỉ Quality được phê duyệt các phần Quality.
- Chỉ Safety reviewer được phê duyệt các phần safety.
- Chỉ người được ủy quyền mới được ký Approvals.
- Người dùng có thể đóng góp bằng chứng mà không cần quyền phê duyệt (đóng góp ≠ phê duyệt).
- **Bắt buộc lưu giữ lịch sử phê duyệt điện tử.**

*Còn mở: → F6 (ma trận vai trò/quyền cụ thể; nguồn dữ liệu user/phòng ban; ủy quyền khi vắng mặt; chuẩn chữ ký điện tử).*

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

**Quyết định của bộ phận chuyên môn:** ✅ **Đã xác nhận, kèm 2 điều kiện bổ sung.** Gate chỉ pass khi **đủ cả 4 điều kiện**:
1. Stage status = **Complete**;
2. Gate decision = **Proceed** hoặc **Proceed with Conditions**;
3. **Đã hoàn tất các sign-off bắt buộc**;
4. **Đã đính kèm bằng chứng bắt buộc**.

Các phán quyết chi tiết:
- Stage status Complete **nhưng chưa có** Gate decision → gate ở trạng thái **Pending** (chưa pass).
- **Proceed with Conditions vẫn mở khóa gate kế tiếp**, đồng thời các hành động còn tồn đọng được theo dõi riêng (xem B2).
- **Gap chặn quyết định Proceed thông thường**.
- **Hold ở cột Status** = công việc đã dừng; **Hold ở cột Gate decision** = tiến trình bị chặn.

*Còn mở: → F1 (điều kiện 3 và 4 là mới và chưa được định nghĩa — danh sách sign-off/bằng chứng bắt buộc theo từng gate chính là câu C7 chưa được trả lời), → F7 (Gap có chặn luôn cả "Proceed with Conditions" không, hay chỉ chặn "Proceed" thường?).*

---

### B2. Next action / Next due date / Next owner

**Câu hỏi chính:** Ba trường này chỉ là bản ghi thông tin hay có điều khiển logic (chặn gate/phase)?

**Giả định hiện tại trong demo:** Chỉ là bản ghi thông tin đơn thuần, không chặn gì; là một bản ghi duy nhất mỗi phase (không lặp lại nhiều dòng).

**Cần làm rõ:**
1. Một phase có thể có nhiều Next action cùng lúc (danh sách) hay chỉ một dòng duy nhất như hiện tại?
2. Nếu Next action còn mở (chưa xử lý xong) thì phase có được phép coi là "hoàn thành" không? Hay Next action mở chính là dấu hiệu bắt buộc phải đi kèm decision = "Proceed with Conditions" (liên quan mục B1)?
3. Next action có cần trạng thái riêng (Open / In Progress / Done) để theo dõi, hay chỉ là ô nhập tự do không track?
4. Ai là người chịu trách nhiệm đóng Next action — người ở phase hiện tại (nơi ghi ra) hay người nhận ở phase kế tiếp (owner được ghi)?

**Quyết định của bộ phận chuyên môn:** ✅ **Đã xác nhận — Next Action trở thành bản ghi được kiểm soát riêng (controlled record).**
- Mỗi **gate** có thể có **nhiều** action (danh sách, không phải một dòng duy nhất).
- Mỗi action gồm: **Description, Owner, Due date, Status, Priority, Date completed**.
- Action còn mở **chỉ được phép tồn tại** khi gate decision = **Proceed with Conditions**.
- Ngoài trường hợp đó, mọi action phải hoàn tất trước khi đóng gate.

*Còn mở: → F8 (câu hỏi 4 gốc chưa được trả lời: ai được quyền đóng action; danh sách giá trị Priority).*

---

### B3. Cơ chế xác định một Phase đã hoàn thành

**Câu hỏi chính:** Phase được coi là HOÀN THÀNH khi nào? Đề nghị xác nhận từng điều kiện dưới đây có bắt buộc hay không:

| # | Điều kiện | Bắt buộc? |
|---|---|---|
| a | Cả 3 Gate trong phase đều Pass (theo mục B1) | ✅ Có |
| b | Toàn bộ Key Gate Checks của phase = Done/Y (hoặc N/A) | ✅ Có |
| c | Toàn bộ 8 Angles Coverage = Covered (hoặc N/A có lý do) | ✅ Có |
| d | Sign-off đủ cả 3 vai trò (Prepared / Reviewed / Approved) | ✅ Có — bắt buộc đủ cả 3 vai trò |
| e | Toàn bộ Next action đã đóng | ✅ Có — trừ khi decision là Proceed with Conditions |

**Giả định hiện tại trong demo:** Chỉ áp dụng (a) + phần "Approved by" trong (d) — chưa kiểm tra (b), (c), (e).

**Cần làm rõ:**
1. Nếu một mục trong Key Gate Checks / 8 Angles đánh dấu N/A — có được tính là "đã thỏa" không?
2. Có bắt buộc thứ tự: phải hoàn thành Key Gate Checks + 8 Angles xong rồi mới được phép Sign-off, hay hai việc làm song song độc lập?

**Quyết định của bộ phận chuyên môn:** ✅ **Đã xác nhận — toàn bộ điều kiện (a)–(e) đều bắt buộc** (riêng (e) có ngoại lệ Proceed with Conditions).
- **N/A chỉ được tính là hoàn thành khi có lý do (justification) kèm theo.**
- **Sign-off chỉ được mở khi các phần bắt buộc đã hoàn thành xong** (có ràng buộc thứ tự, không song song).

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

**Quyết định của bộ phận chuyên môn:** ✅ **Đã xác nhận — backtrack phải bảo toàn toàn bộ lịch sử audit.**

Khi một gate bị mở lại:
- Stage status **reset**;
- Các phê duyệt trước đó trở nên **vô hiệu**;
- **Bắt buộc phê duyệt lại**.

Tuy nhiên, **không bao giờ được xóa bất kỳ dữ liệu nào**. Thay vào đó:
- Các phê duyệt cũ **được giữ lại trong lịch sử**;
- Bằng chứng cũ **vẫn giữ nguyên liên kết**;
- Một **Backtrack Event Log** ghi lại: ai khởi tạo, ngày, lý do, các gate bị ảnh hưởng, các phê duyệt cũ, các quyết định cũ.

**Backtrack được phép xuyên bất kỳ phase nào** nếu có lý do chính đáng. Điều này nhất quán với nguyên tắc **no silent corrections** của MBc360.

> **Ghi chú triển khai:** quyết định này đảo ngược hành vi demo hiện tại (đang xóa trực tiếp decision và sign-off). Thiết kế production cần mô hình event-log/snapshot: việc vô hiệu hóa là một *sự kiện mới được ghi lại*, không bao giờ là ghi đè.

---

## Nhóm C — Quy tắc nghiệp vụ đặc thù

### C1. "Skincare for Two" có thực sự chặn gate không?

**Bối cảnh:** Introduction ghi rõ: *"Maternal products must include maternal use plus baby-contact/infant exposure consideration; this is mandatory, not optional."*

**Cần làm rõ:**
1. Điều kiện "mandatory" này được kích hoạt tự động thế nào — do người dùng chọn "Pregnancy/Breastfeeding/Postpartum/Infant 0+" ở Gate 02 (Phase 1)?
2. Khi đã kích hoạt, Gate 07 có bị khóa cứng không cho Proceed nếu các mục an toàn mẹ & bé chưa hoàn tất — hay vẫn chỉ là nhắc nhở?

**Quyết định của bộ phận chuyên môn:** ✅ **Đã xác nhận — bắt buộc, chặn cứng (không phải nhắc nhở).**
- Tự động kích hoạt khi người dùng mục tiêu bao gồm: **Pregnancy, Breastfeeding, Postpartum**.
- Khi đã kích hoạt: **đánh giá an toàn cho mẹ VÀ đánh giá tiếp xúc với trẻ sơ sinh đều trở thành bắt buộc**.
- **Gate 7 không thể pass** cho tới khi cả hai đánh giá hoàn tất.

*Còn mở: → F2 (câu trả lời không nhắc "Infant 0+" trong danh sách trigger — sản phẩm thuần cho em bé, không chọn mục maternal nào, có kích hoạt Skincare for Two không?).*

---

### C2. Chuỗi phê duyệt Study/Human Trial có phải vai trò cố định không?

**Bối cảnh:** Introduction ghi cụ thể: *"Chris prepares study proposal, George/Head of Department signs off, Sekar or nominated independent reviewer signs off outside the department."*

**Cần làm rõ:**
1. Đây là quy trình phê duyệt riêng cho Study Protocol (3 vai trò khác với Prepared/Reviewed/Approved chung), hay chỉ dùng lại khối Sign-off có sẵn của Gate 08?
2. Có cần ràng buộc "independent reviewer" không được cùng phòng ban với người chuẩn bị (tránh xung đột lợi ích) không?
3. Tên người (Chris/George/Sekar) là ví dụ minh họa hay là vai trò cố định cần hard-code?

**Quyết định của bộ phận chuyên môn:** ✅ **Đã xác nhận — quy trình phê duyệt riêng, tách khỏi phê duyệt gate thông thường.**
- Ba vai trò: **Study Author, Department Reviewer, Independent Reviewer**.
- Đây là **vai trò, không phải cá nhân cụ thể** (không hard-code tên người).
- Hệ thống **phải chặn** trường hợp Independent Reviewer cùng phòng ban với Study Author.

*Phụ thuộc → F6 (cần dữ liệu user/phòng ban để enforce quy tắc khác phòng ban).*

---

### C3. Prohibited Ingredients / Caution Limits: tự động đối chiếu hay nhập tay?

**Bối cảnh:** Template_Index ghi: *"Formula match formulas flag possible matches"* — nghe như một phép đối chiếu tự động.

**Cần làm rõ:** Khi nhập tên nguyên liệu vào Formula BOM, hệ thống có cần tự động dò trong danh sách Prohibited/Caution để cảnh báo ngay (ví dụ: "REVIEW - possible formula match"), hay hoàn toàn do người dùng tự kiểm tra và nhập kết luận bằng tay?

**Quyết định của bộ phận chuyên môn:** ✅ **Đã xác nhận — tự động.**
Mỗi khi nhập Formula BOM, MBc360 tự động đối chiếu nguyên liệu với:
- Prohibited Ingredients (danh sách cấm);
- Pregnancy/Breastfeeding Caution Ingredients (danh sách thận trọng cho mẹ bầu/cho con bú);
- Danh sách hạn chế theo quy định pháp lý (regulatory restriction lists);
- Danh sách cấm nội bộ.

Hệ thống lập tức đánh dấu các vấn đề tiềm ẩn để review.

*Còn mở: → F3 (cơ chế matching: watch-list chứa **tên nhóm** ("Parabens", "Formaldehyde releasers") trong khi BOM chứa **tên INCI** — cần nguồn ánh xạ nhóm→INCI/CAS, cùng nguồn và tần suất cập nhật của danh sách hạn chế theo từng thị trường).*

---

### C4. Change Control có chặn Gate Flow không?

**Câu hỏi chính:** Nếu có một Change Control record đang mở (chưa đóng) liên quan tới một project — điều đó có ảnh hưởng gì tới Gate Flow của project đó không?

**Giả định hiện tại trong demo:** Hai luồng hoàn toàn độc lập, không liên kết.

**Cần làm rõ:** Có cần bắt buộc liên kết Change record với Gate/Phase bị ảnh hưởng, và gate đó phải "tạm khóa" hoặc hiện cảnh báo cho tới khi Change được đóng không?

**Quyết định của bộ phận chuyên môn:** ✅ **Đã xác nhận — Change Control liên kết trực tiếp với gate.**
- Change record đang mở tạo **soft lock hoặc cảnh báo** trên gate bị ảnh hưởng cho tới khi thay đổi được đánh giá và đóng.
- Điều này duy trì khả năng truy vết (traceability).

*Còn mở: → F9 (trạng thái Change nào được tính là "đang mở"; soft lock cụ thể là gì — chỉ banner cảnh báo hay bắt buộc xác nhận trước khi ghi gate decision).*

---

### C5. PIF export/launch có bị chặn cứng bởi trạng thái PIF không?

**Bối cảnh:** *"No external HCP/distributor/pharmacy claim use until PIF attachment status and approval are closed."*

**Cần làm rõ:** Gate 11 (Production/Launch sign-off) có bị khóa cứng nếu PIF_Checklist_ASEAN chưa đóng đủ (theo từng market liên quan — xem lại mục A1), hay chỉ là cảnh báo/khuyến nghị?

**Quyết định của bộ phận chuyên môn:** ✅ **Đã xác nhận — chặn cứng, quản lý theo từng thị trường.**
Việc hoàn tất PIF chặn cứng:
- Phê duyệt launch;
- Claims sử dụng ra bên ngoài;
- Thông tin cho distributor;
- Thông tin cho Healthcare Professional (HCP).

Một sản phẩm có thể launch ở nước này trong khi vẫn bị chặn ở nước khác (nhất quán với A1 — Gate 10–12 theo từng thị trường).

*Còn mở: → F10 (thị trường ngoài ASEAN — EU CPSR, Úc, Mỹ — checklist nào thay thế PIF_Checklist_ASEAN theo từng thị trường?).*

---

### C6. `PIF_Evidence_Closure` có thực sự chặn cứng việc dùng claim/thông tin ra bên ngoài không?

**Bối cảnh:** Sheet `PIF_Evidence_Closure` liệt kê các "trigger" (claim mới, thông tin công khai mới, thay đổi công thức, câu hỏi từ distributor/HCP...) kèm cột **"Blocks external use until closed?"** — tất cả đều đánh dấu **Y**. Ví dụ: claim mới phải được thêm vào `SKU_Claims_PIF_Register` và đính bằng chứng trước khi được dùng; thông tin công khai mới phải qua `Published_Info_Approval` trước khi xuất bản.

**Giả định hiện tại trong demo:** Hai sheet này (`SKU_Claims_PIF_Register`, `Published_Info_Approval`) nay đã có màn hình nhập liệu (dạng register), nhưng chỉ là **ghi nhận thông tin** — app chưa có cơ chế nào thực sự chặn "external use".

**Cần làm rõ:**
1. "Blocks external use" ở đây nghĩa là chặn thao tác gì cụ thể trong hệ thống — không cho Gate 10/11 chuyển sang Complete, hay chỉ là quy tắc thủ tục (con người tự kiểm soát, vì "external use" như gửi email/đăng bài xảy ra ngoài hệ thống nên phần mềm không thể chặn trực tiếp)?
2. Nếu một claim/thông tin công khai chưa đóng (chưa attach PIF link) mà Gate 10 vẫn đã Complete — điều đó có được coi là vi phạm/mâu thuẫn cần cảnh báo không, hay hai việc hoàn toàn độc lập?
3. Có cần thêm một bước xác nhận/cam kết (attestation) trước khi phát hành nội dung ra ngoài, để hệ thống ít nhất ghi nhận được rằng người dùng đã kiểm tra điều kiện đóng PIF trước khi công bố?

**Quyết định của bộ phận chuyên môn:** ✅ **Đã xác nhận — nâng cấp thành quy trình bắt buộc "Published Information Approval"** (yêu cầu mới, cần đưa vào ứng dụng).

Mọi thông tin dự kiến phát hành công khai — bao gồm website, brochure, tài liệu kỹ thuật, tài liệu cho distributor, bài thuyết trình, tài liệu HCP, **nội dung do AI tạo ra**, mạng xã hội và product claims — phải qua quy trình này trước khi phát hành. Quy trình gồm:
1. Hướng dẫn về thuật ngữ và claims được chấp nhận;
2. Loại bằng chứng bắt buộc cho từng claim;
3. Kiểm tra xác nhận bằng chứng đã được liên kết;
4. Technical review;
5. Regulatory review khi áp dụng;
6. Phê duyệt cuối cùng trước khi xuất bản.

**Không thông tin công khai nào được phát hành khi quy trình chưa hoàn tất.**

*Còn mở: → F11 (chi tiết workflow: các trạng thái/vai trò reviewer theo từng loại nội dung; nguồn và cách duy trì bộ hướng dẫn thuật ngữ/bằng chứng).*

---

### C7. Các register an toàn/PIF có nên là điều kiện bắt buộc để pass gate không?

**Bối cảnh:** App hiện có ~37 bảng bằng chứng (Formulation_Safety, Prohibited_Ingredients, PB_Caution_Limits, PIF_Checklist_ASEAN...), mỗi bảng đều gắn nhãn "Gate 0X" để tham chiếu. Nhưng nhãn này **thuần hiển thị** — cơ chế pass gate (xem B1) chỉ đọc Stage status + Gate decision trong bảng Phase Gate Flow, hoàn toàn không đọc dữ liệu trong các bảng bằng chứng này.

**Giả định hiện tại trong demo:** Có thể xảy ra trường hợp Gate 07 đã Complete + Proceed trong khi `Prohibited_Ingredients` vẫn còn dòng "REVIEW - possible formula match" chưa xử lý, hoặc `Formulation_Safety`'s "Final safety release" vẫn "Not Started" — hệ thống không cảnh báo hay chặn gì.

**Cần làm rõ:**
1. Có bảng bằng chứng cụ thể nào (ví dụ Formulation_Safety's Final Safety Sign-off, hoặc Prohibited_Ingredients không còn dòng "REVIEW"/"Prohibited - remove") cần trở thành **điều kiện bắt buộc** để Gate 07/10 được phép Complete không?
2. Nếu có, nên chặn cứng (không cho chọn decision Proceed) hay chỉ cảnh báo mềm (cho phép Proceed nhưng hiện banner nhắc còn bằng chứng chưa đóng)?
3. Toàn bộ 37 bảng, hay chỉ một số bảng "an toàn tới hạn" (safety-critical) mới cần ràng buộc này?

**Quyết định của bộ phận chuyên môn:** ❌ **CHƯA ĐƯỢC TRẢ LỜI.**

> Điều kiện mới "mandatory evidence attached" trong B1 ngầm cho thấy câu trả lời là *có*, nhưng danh sách register/bằng chứng bắt buộc cụ thể theo từng gate và cách xử lý (chặn cứng vs cảnh báo mềm) vẫn chưa được định nghĩa. **Đây là lỗ hổng lớn nhất còn lại — xem F1.** B1 không thể triển khai nếu thiếu câu trả lời này.

---

## Yêu cầu bổ sung — Tài liệu GMP (do đội ngũ thêm mới)

Bộ phận Manufacturing đã vận hành hệ thống tài liệu GMP được kiểm soát riêng.

**MBc360 KHÔNG được tạo hoặc quản lý tài liệu GMP**, chẳng hạn:
- Manufacturing BOMs;
- Lịch sản xuất (Production schedules);
- Batch Manufacturing Records;
- GMP work instructions.

Thay vào đó, MBc360 có mục **"GMP Links"** lưu tham chiếu/hyperlink tới các tài liệu GMP được kiểm soát trong hệ thống Manufacturing. Cách này tránh trùng lặp nhưng vẫn bảo đảm truy vết đầy đủ.

> *Khớp với register `GMP_Links` hiện có trong demo (chỉ lưu link) — không cần đổi hướng.*

## Định hướng tổng thể (do đội ngũ nêu)

> MBc360 trở thành **nền tảng bằng chứng và quản trị (evidence & governance) duy nhất** của công ty, đồng thời **tích hợp với các hệ thống chuyên biệt** (như Cosmetri và GMP Manufacturing) **thay vì thay thế chúng**.

---

## Danh sách câu hỏi cần làm rõ tiếp (follow-up)

> Tổng hợp mọi điểm còn mở sau đợt trả lời ngày 16/07/2026. **F1 chặn việc triển khai B1/C7 nên cần trả lời trước tiên.**

| # | Liên quan | Câu hỏi |
|---|---|---|
| **F1** | C7, B1 | Định nghĩa theo từng gate của "required sign-offs" và "mandatory evidence": với mỗi gate (đặc biệt Gate 07 và 10), chính xác sign-off nào và register/bằng chứng nào ở trạng thái nào là điều kiện pass (ví dụ: Gate 07 ⇐ Formulation_Safety "Final safety release" = Completed VÀ Prohibited_Ingredients không còn dòng "REVIEW"/"Prohibited - remove")? Từng mục là chặn cứng hay cảnh báo mềm? Áp cho cả 37 register hay chỉ nhóm safety-critical? |
| **F2** | C1 | Chọn **"Infant 0+"** (sản phẩm thuần cho em bé, không chọn mục maternal) có kích hoạt Skincare for Two không? Câu trả lời hiện chỉ liệt kê Pregnancy/Breastfeeding/Postpartum. |
| **F3** | C3 | Cơ chế matching nguyên liệu — *đã giải quyết một phần nhờ tài liệu API Cosmetri*: `/compliance/{formulaId}` trả về **`inci_name` + `cas_no` + `ec_no` + % w/w** từng nguyên liệu, nên có thể match theo số CAS (chính xác) thay vì heuristic theo tên. Còn mở: bản thân watch-list (Prohibited / PB caution) phải có danh sách CAS theo từng nhóm — ai xây và duy trì bảng ánh xạ đó? Và nguồn/tần suất cập nhật danh sách hạn chế pháp lý theo từng thị trường. |
| **F4** | A1 × A2 | Sản phẩm đã launch (Gate 10–12 theo market đã đóng) có thay đổi công thức lớn → backtrack Gate 4–9. Các market track đã đóng có tự mở lại theo từng thị trường không (ví dụ VN cần ~6 tháng đăng ký lại)? Hệ thống có phải hỗ trợ **hai version song song** của một sản phẩm (version cũ vẫn bán trong khi version mới đang phát triển)? Thêm/bớt thị trường giữa chừng xử lý ra sao? |
| **F5** | A2 | Tiêu chí phân loại thay đổi công thức **"major" vs "minor"** (major = tự tạo version mới + backtrack; minor = chỉ qua Change Control). Có thể dùng catalogue trigger sẵn có của `Formula_Change_Control` làm cơ sở phân loại không? |
| **F6** | A4, C2 | **Ma trận vai trò/quyền** cụ thể (vai trò × gate/section/register × đóng góp/phê duyệt/ký). Dữ liệu user + phòng ban lấy từ đâu (SSO/AD)? Ủy quyền khi vắng mặt? Chuẩn chữ ký điện tử cho "electronic approval history" (độ sâu audit-trail, theo kiểu 21 CFR Part 11 hay nhẹ hơn)? |
| **F7** | B1 | Trạng thái **Gap** chỉ chặn "Proceed" thường, hay chặn luôn cả "Proceed with Conditions"? |
| **F8** | B2 | Ai được quyền **đóng** một Next Action (người ghi, owner, hay cả hai)? Danh sách giá trị Priority? |
| **F9** | C4 | Trạng thái Change nào được tính là "đang mở" để kích hoạt soft lock? Soft lock cụ thể làm gì — chỉ banner cảnh báo, hay bắt buộc xác nhận (acknowledgement) trước khi được ghi gate decision? |
| **F10** | C5 | Với thị trường ngoài ASEAN (EU, Úc, Mỹ...): checklist nào thay thế `PIF_Checklist_ASEAN` làm định nghĩa "PIF complete" theo thị trường (ví dụ EU CPSR)? |
| **F11** | C6 | Chi tiết workflow Published Information Approval: các trạng thái, vai trò reviewer bắt buộc theo từng loại nội dung, nguồn/cách duy trì bộ hướng dẫn thuật ngữ chấp nhận được và bằng chứng bắt buộc theo claim. |
| **F12** | A3 | API Cosmetri — *gần như đã giải quyết xong*. Đã rõ từ tài liệu API: OAuth2 + JWT, rate limit, đồng bộ tăng dần `since_updated_at`, các endpoint RM/product/formula/compliance/manufacturing-order; response RM có **`supplier_name`**; `inf_code` = **Batch No.**, nên khóa đối chiếu nguyên liệu là `cas_no` từ `/compliance`. Đã chốt (16/07/2026): dữ liệu API không cung cấp (chi tiết supplier ngoài tên, link SDS/CoA/TDS) thì **nhập tay**; nguyên liệu mới theo quy trình **change request trên Power Apps → phê duyệt → nhập vào Cosmetri → gọi qua API**, MBc360 gắn link tới ứng dụng Power Apps khi nguyên liệu chưa có để chọn. **Câu hỏi duy nhất còn lại: compliance zones của Cosmetri có phủ ASEAN/Việt Nam không (ví dụ chỉ thấy EU/UK/US)?** |

---

## Ghi chú

- Nhóm A (kiến trúc dữ liệu) nên được xác nhận **trước tiên** vì ảnh hưởng trực tiếp tới thiết kế database — trả lời sai hướng ban đầu sẽ tốn công sửa lại sau. *(Đã trả lời — các follow-up còn lại của nhóm A: F4, F5, F6, F12.)*
- Nhóm B và C là quy tắc nghiệp vụ có thể tinh chỉnh dần trong quá trình phát triển mà không nhất thiết phá vỡ kiến trúc, nhưng vẫn cần xác nhận sớm để tránh phải làm lại UI/logic đã xây.
- Đợt trả lời 16/07/2026 **đảo ngược 3 giả định nền của demo**: (1) pass gate phải đọc thêm sign-off, Next Actions và evidence registers — không chỉ Stage status + Gate decision; (2) backtrack không bao giờ được xóa dữ liệu — cần mô hình event-log/snapshot; (3) Gate 10–12 chuyển thành theo từng thị trường thay vì một luồng chung.
- Tài liệu tham chiếu: `MBc360 Master Product Development System File.xlsx` (55 sheets) và bản demo ReactJS hiện tại (`mbc360-app/`).
