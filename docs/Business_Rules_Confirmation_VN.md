# MBc360 — Bảng câu hỏi xác nhận nghiệp vụ trước khi triển khai thực tế

**Mục đích:** Trước khi phát triển backend/database chính thức cho hệ thống MBc360, cần bộ phận chuyên môn (Product Development / NPD / Quality / Regulatory) xác nhận các quy tắc nghiệp vụ dưới đây. Bản demo ReactJS hiện tại đã tạm áp dụng một số giả định để có thể trình bày luồng làm việc — các giả định này **cần được xác nhận hoặc điều chỉnh** trước khi xây dựng hệ thống thật.

**Cách sử dụng:** Với mỗi mục, xin vui lòng xác nhận **Đúng / Sai / Cần điều chỉnh** và ghi chú câu trả lời vào phần "Quyết định của bộ phận chuyên môn".

> **Trạng thái (16/07/2026):** Đã nhận và ghi lại quyết định của bộ phận chuyên môn cho **tất cả các mục trừ C7** (vẫn còn mở). Đội ngũ bổ sung thêm 2 yêu cầu mới (Tài liệu GMP, quy trình Published Information Approval). Các điểm còn mở được tổng hợp tại mục **"Danh sách câu hỏi cần làm rõ tiếp (follow-up)"** ở cuối tài liệu.
>
> **Trạng thái (21/07/2026):** Bộ phận chuyên môn nay đã trả lời **toàn bộ 14 câu follow-up (F1–F14)**, cùng ba mục trước đó chưa trả lời **A5, B5 và C7** (nguồn: `docs/Response.txt`). Đáp án được ghi ngay tại mỗi mục bên dưới và tóm tắt trong bảng follow-up cuối tài liệu. **Chỉ còn đúng một điểm thực sự mở: F12** (phạm vi phủ compliance ASEAN/Việt Nam của Cosmetri — phải do Cosmetri xác nhận, không thuộc quyền quyết định của nhóm ta). Mọi thứ còn lại giờ chỉ là việc **cung cấp dữ liệu/nội dung** (xem mục "Đầu vào còn cần cho triển khai" ở cuối), không còn là quyết định quy tắc nữa.

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

> ✅ **Đã giải quyết (21/07/2026, F4):** các market track Gate 10–12 đã đóng được **giữ nguyên** cho version công thức cũ; một thay đổi major tạo **track Gate 10–12 mới** theo từng thị trường cho version mới — **hỗ trợ nhiều version song song** (version cũ vẫn bán trên thị trường cho tới khi bị thay thế/thu hồi/hết hàng chính thức). Thêm thị trường tạo track mới (và có thể trigger lại các gate trước nếu thị trường đó khác); bớt thị trường thì đánh dấu **Withdrawn/Cancelled/Not Proceeding kèm lý do** (không bao giờ xóa). Trạng thái tổng thể của project là enum: Development complete / Approved in some markets / Approved in all active markets / Market transition underway / Fully closed.

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

> ✅ **Đã giải quyết (21/07/2026):** **F4** — track đã đóng ở lại với version cũ; version mới có track riêng theo từng thị trường; hai version chạy song song. **F5** — "major" theo catalogue trigger của Formula Change Control (bất kỳ thay đổi nào có thể ảnh hưởng: an toàn/phơi nhiễm, hiệu quả/hỗ trợ claim, hệ bảo quản, định danh nguyên liệu, nồng độ hoạt chất, trạng thái pháp lý, hồ sơ dị ứng, pH ngoài dải, dạng sản phẩm, quy trình ảnh hưởng potency/hiệu năng, độ ổn định, tương thích bao bì, khai báo nhãn, hay đăng ký thị trường). Người khởi tạo có thể đề xuất phân loại, nhưng **một reviewer kỹ thuật hoặc quality có thẩm quyền phải xác nhận** — không chỉ do người dùng tự chọn.

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

> ⏳ **Vẫn còn mở (21/07/2026, F12) — điểm duy nhất thực sự chưa giải quyết.** Từ tài liệu API không thể khẳng định output compliance của Cosmetri có phủ ASEAN/Việt Nam, nên điểm này **vẫn mở cho tới khi Cosmetri xác nhận độ phủ ASEAN/VN hiện tại**. Trong lúc chờ, MBc360 phải: chỉ dùng dữ liệu compliance Cosmetri ở nơi có sẵn market zone tương ứng; hiển thị market zone nguồn + ngày cập nhật cuối; **không bao giờ giả định compliance EU/UK/US tương đương ASEAN hay Việt Nam**; chạy thêm màn hình quét pháp lý theo từng thị trường của riêng MBc360; và cho phép Regulatory đính kèm kết luận + bằng chứng ASEAN/VN riêng.

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

> ✅ **Đã giải quyết (21/07/2026, F6):** danh tính + phòng ban lấy từ **SSO/Active Directory** của công ty. Định nghĩa **ít nhất 17 vai trò** (Project Owner; Formulation Contributor; Safety / Quality / Regulatory Reviewer; Packaging/Artwork; Marketing/Sales; Supply Chain; Manufacturing Link; Study Author / Department Study Reviewer / Independent Study Reviewer; Published-Info Technical Reviewer / Regulatory Reviewer; Final Approver; System Administrator; Read-only Viewer). Contributor **không được tự phê duyệt phần approval-critical của chính mình** trừ khi có ngoại lệ được ghi nhận. **Ủy quyền** có thời hạn, do quản lý/admin duyệt, ghi lại người ủy quyền/người nhận/thời hạn/phạm vi, và lưu trong lịch sử audit. **Phê duyệt điện tử** ghi danh tính đã xác thực, ngày/giờ, vai trò, quyết định, comment (tùy chọn/bắt buộc), version được duyệt, và dấu vết vô hiệu hóa/thay thế. **Chưa cần triển khai 21 CFR Part 11 đầy đủ** (áp dụng nguyên tắc audit-trail + e-approval vững chắc ngay từ đầu).

---

### A5. Formula BOM có bắt buộc phải import từ một formula có sẵn trên Cosmetri, hay vẫn cho phép tự tạo dữ liệu trong MBc360?

**Câu hỏi chính:** Vì A3 đã chốt Cosmetri là nguồn dữ liệu gốc (chỉ đọc) cho nguyên liệu và formula, vậy Formula BOM của một project trong MBc360 có nên **chỉ** được tạo bằng cách import từ một formula đã có sẵn trên Cosmetri — hay việc tự nhập tay các dòng BOM ngay trong MBc360 (không gắn với bản ghi nào trên Cosmetri) vẫn là quy trình được chấp nhận, ví dụ khi formula còn đang phát triển sớm và chưa được chốt trên Cosmetri?

**Giả định hiện tại trong demo:** Cả 2 cách đều được hỗ trợ. "Import from Cosmetri" kéo về composition, định danh INCI/CAS và tên nhà cung cấp của một formula có sẵn, các field đó khóa read-only trên dòng vừa import. Riêng nút "Add line" cho phép người dùng tự gõ một dòng BOM hoàn toàn mới, không gắn với bản ghi nào trên Cosmetri — các dòng này vẫn sửa được bình thường, và không có ràng buộc nào yêu cầu formula của project phải tồn tại trên Cosmetri.

**Cần làm rõ:**
1. Formula BOM có bắt buộc phải import từ formula có sẵn trên Cosmetri (Cosmetri là hệ thống ghi nhận bắt buộc ngay từ giai đoạn phát triển sớm), không cho nhập tay không?
2. Hay việc nhập tay vẫn được chấp nhận cho các formula chưa đăng ký trên Cosmetri, sau đó thay thế/đối chiếu lại bằng import từ Cosmetri khi formula được chốt chính thức?
3. Nếu vẫn cho nhập tay, có cần đánh dấu/đối chiếu lại với Cosmetri trước một gate cụ thể nào đó (ví dụ 07/10) không, hay việc này nằm ngoài phạm vi?

**Quyết định của bộ phận chuyên môn (21/07/2026):** ✅ **Đã xác nhận — cho phép cả 2 luồng, kèm đối chiếu (reconcile) bắt buộc trước khi duyệt an toàn cuối.**
- Nhập tay Formula BOM **chỉ được chấp nhận cho giai đoạn phát triển thử nghiệm sớm** (trước khi formula được nhập chính thức vào Cosmetri).
- Cosmetri trở thành **hệ thống ghi nhận (system of record) được kiểm soát bắt buộc** trước **Gate 7 (duyệt an toàn cuối)** và trước khi hoàn tất hồ sơ pháp lý.
- Formula nhập tay phải được đánh dấu rõ **"Draft – Not Reconciled with Cosmetri"**; mỗi dòng nên gắn tham chiếu nguyên liệu Cosmetri khi nguyên liệu đã tồn tại; nguyên liệu chưa có trên Cosmetri kích hoạt quy trình Power Apps.
- **Gate 10 và 11 bắt buộc dùng formula và version đã kiểm soát trên Cosmetri.** Sau khi đối chiếu, các trường định danh/INCI/CAS/composition đã import bị khóa không cho sửa tự do; mọi khác biệt MBc360 vs Cosmetri được xử lý qua quy trình so sánh formula + change control.
- *Đây là đáp án F14/A5 — xem F14 bên dưới.*

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

> ✅ **Đã giải quyết (21/07/2026):** **F1** — điều kiện 3 & 4 giờ có danh sách cụ thể theo từng gate (Gate 1–12) theo mô hình 3 tầng Mandatory/Conditional/Supporting, thể hiện qua Gate Readiness panel — xem đáp án F1 đầy đủ bên dưới và quyết định C7 phía trên. **F7** — **Gap chặn Proceed thường**; **Proceed with Conditions chỉ còn khả dụng khi** gap không thuộc loại tới hạn về an toàn/pháp lý/release, có reviewer thẩm quyền chấp nhận rủi ro tạm thời, và tạo một Next Action được kiểm soát (owner, due date, điều kiện escalate); **gap tới hạn phải chuyển sang Hold, Backtrack hoặc Reject/Stop.**

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

> ✅ **Đã giải quyết (21/07/2026, F8):** **Owner** chịu trách nhiệm hoàn tất action, nhưng **người ghi ra, gate owner liên quan, hoặc một reviewer có thẩm quyền mới verify & đóng** — owner **không được tự ý xác nhận đóng** ở nơi cần xác nhận độc lập. Workflow trạng thái: **Open → In Progress → Awaiting Information → Ready for Verification → Closed → Cancelled**. Priority: **Low / Medium / High / Critical** — **action Critical chặn việc đóng gate thông thường.**

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

### B5. Phase đang khóa (chưa tới lượt) thì có nên chặn toàn bộ input, hay chỉ chặn gate decision/sign-off?

**Câu hỏi chính:** Khi một phase bị "khóa" vì các gate/phase trước đó chưa hoàn thành, có nên vô hiệu hóa **toàn bộ** control nhập liệu trên trang phase đó, hay chỉ vô hiệu hóa những control quyết định tiến trình chính thức (quyết định gate, ký sign-off phase)?

**Giả định hiện tại trong demo:** Chỉ vô hiệu hóa control quyết định ở **Gate Flow** và khối **Sign-Off** của phase khi phase đang khóa. Mọi form khác trên trang (chọn checklist, các dòng requirement, key gate checks, next actions, 8 angles coverage) vẫn **mở để nhập liệu bình thường**, để các phòng ban có thể chuẩn bị/nhập bằng chứng sớm. Trang hiện banner giải thích điều này: *"You can still review the forms below, but the gate flow stays read-only."*

**Cần làm rõ:**
1. Việc cho phép nhập liệu chuẩn bị trước (pre-work) trên một phase chưa tới lượt có thực sự mong muốn không, hay toàn bộ trang phải ở chế độ chỉ xem (read-only) cho tới khi phase được mở đúng thứ tự?
2. Nếu cho phép nhập trước, dữ liệu nhập "sớm" có cần đánh dấu phân biệt (hiển thị/quy trình) so với dữ liệu nhập trong đúng giai đoạn của phase không (ví dụ gắn cờ ghi nhận là nhập trước khi phase chính thức mở)?

**Quyết định của bộ phận chuyên môn (21/07/2026):** ✅ **Đã xác nhận — cách làm hiện tại của demo về cơ bản đúng; cho phép nhập liệu chuẩn bị trước (pre-work).**
- Khi phase đang khóa: quyết định gate, sign-off và đóng stage chính thức vẫn bị vô hiệu hóa; người dùng vẫn được thêm bằng chứng nháp, requirement, ghi chú, rủi ro và action đề xuất.
- Các mục nhập sớm phải được đánh dấu rõ **"Pre-work / Entered Before Gate Opened"** kèm ngày nhập và người nhập.
- Khi phase mở, owner phụ trách phải review và chính thức chấp nhận hoặc cập nhật phần pre-work trước khi nó được tính vào mức hoàn thành. Cách này hỗ trợ làm song song nhưng không cho tiến trình vượt kiểm soát.
- *Đây là đáp án F13/B5 — xem F13 bên dưới.*

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

> ✅ **Đã giải quyết (21/07/2026, F2):** **Riêng "Infant 0+" KHÔNG kích hoạt Skincare for Two.** Skincare for Two chỉ được kích hoạt bởi **Pregnancy / Breastfeeding / Postpartum** (an toàn cho mẹ + đánh giá tiếp xúc với bé). "Infant 0+" thay vào đó kích hoạt một **workflow "Infant & Baby Safety" riêng** (đặc tính da trẻ sơ sinh, phơi nhiễm, tiếp xúc miệng ngoài ý muốn khi liên quan, dùng vùng mắt, vùng cơ thể, tần suất, độ phù hợp theo tuổi). Sản phẩm dùng cho **cả** mẹ lẫn bé kích hoạt **cả hai** workflow.

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

> ✅ **Đã giải quyết (21/07/2026):** F6 đã trả lời — user + phòng ban lấy từ **SSO/AD**, cung cấp dữ liệu cần để enforce **Independent Study Reviewer ≠ phòng ban của Study Author**. Các vai trò riêng **Study Author / Department Study Reviewer / Independent Study Reviewer** đã có trong danh sách vai trò F6.

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

> ✅ **Đã giải quyết (21/07/2026, F3):** thứ tự ưu tiên đối chiếu = **định danh nguyên liệu Cosmetri chính xác → tên INCI chính xác → số CAS → ánh xạ synonym/nhóm → review khoa học thủ công** khi tự động không chắc chắn. Danh sách prohibited/restricted/caution là **dataset tham chiếu được kiểm soát, do Regulatory & Safety duy trì**; mỗi entry gồm tên nguyên liệu/nhóm, tên INCI, số CAS, synonym, thị trường liên quan, restriction/caution, nồng độ tối đa/điều kiện sử dụng, nguồn, ngày hiệu lực, ngày review gần nhất, owner và version. Regulatory review danh sách hạn chế theo thị trường **ít nhất mỗi năm** (và khi có thay đổi pháp lý liên quan); giới hạn cho mẹ bầu/cho con bú được review khi có bằng chứng mới. **Kết quả match tự động chỉ là cờ sàng lọc — không thay thế review có chuyên môn.**

---

### C4. Change Control có chặn Gate Flow không?

**Câu hỏi chính:** Nếu có một Change Control record đang mở (chưa đóng) liên quan tới một project — điều đó có ảnh hưởng gì tới Gate Flow của project đó không?

**Giả định hiện tại trong demo:** Hai luồng hoàn toàn độc lập, không liên kết.

**Cần làm rõ:** Có cần bắt buộc liên kết Change record với Gate/Phase bị ảnh hưởng, và gate đó phải "tạm khóa" hoặc hiện cảnh báo cho tới khi Change được đóng không?

**Quyết định của bộ phận chuyên môn:** ✅ **Đã xác nhận — Change Control liên kết trực tiếp với gate.**
- Change record đang mở tạo **soft lock hoặc cảnh báo** trên gate bị ảnh hưởng cho tới khi thay đổi được đánh giá và đóng.
- Điều này duy trì khả năng truy vết (traceability).

*Còn mở: → F9 (trạng thái Change nào được tính là "đang mở"; soft lock cụ thể là gì — chỉ banner cảnh báo hay bắt buộc xác nhận trước khi ghi gate decision).*

> ✅ **Đã giải quyết (21/07/2026, F9):** trạng thái **đang mở** = Draft, Submitted, Under Review, Approved–Implementation Pending, In Implementation, Verification Pending, On Hold (Completed / Rejected / Cancelled / Superseded = đã đóng, khi đã ghi disposition cuối). Soft lock hiển thị **cảnh báo nổi bật** trên project/version công thức/thị trường/gate bị ảnh hưởng, nêu rõ change đang mở và owner, **bắt buộc người dùng acknowledge change đang mở trước khi ghi gate decision**, và **chặn Proceed thường** ở nơi change có thể ảnh hưởng kết luận gate (Proceed with Conditions chỉ khi một approver có thẩm quyền chấp nhận). Change liên quan an toàn, định danh công thức, phê duyệt pháp lý, artwork, claims hoặc launch release **có thể trở thành chặn cứng** tùy mức độ ảnh hưởng được đánh giá.

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

> ✅ **Đã giải quyết (21/07/2026, F10):** dùng **"Market Dossier Profile" cấu hình được theo từng thị trường** thay vì mặc định checklist ASEAN PIF cho mọi nơi — ví dụ ASEAN/VN (ASEAN PIF + notification nội địa), EU/EEA (PIF/CPSR/CPNP/Responsible Person), UK (UK PIF/CPSR/SCPN/RP), Úc (compliance sản phẩm+nguyên liệu, AICIS khi áp dụng, review nhãn/claim + Product Master File nội bộ), Mỹ (MoCRA + hồ sơ FDA áp dụng, substantiation an toàn, review claim/nhãn), thị trường khác cấu hình được. **Regulatory duy trì profile của từng thị trường mà không cần build lại phần mềm.**

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

> ✅ **Đã giải quyết (21/07/2026, F11):** **trạng thái** workflow = Draft, Evidence Gathering, Technical Review, Regulatory Review Required, Regulatory Review Complete, Revision Required, Final Approval Pending, Approved for Release, Released, Expired, Withdrawn, Superseded. **Vai trò** = Content Owner/Author, Technical Reviewer, Regulatory Reviewer (khi nội dung có claim/an toàn/compliance/hướng dẫn/cảnh báo/đặc thù thị trường/nội dung HCP), Final Authorised Approver (nội dung marketing thuần thẩm mỹ có thể bỏ qua Regulatory, nhưng mọi phát biểu về sản phẩm vẫn phải dùng từ ngữ đã duyệt). Hướng dẫn thuật ngữ/claim đến từ một **Published Product Information Guideline / Claims Library được kiểm soát**, do **Technical + Regulatory** cùng duy trì; hệ thống xác nhận đúng SKU/version công thức, bằng chứng đã link, trạng thái PIF/Product Master File, phê duyệt thị trường hiện hành, và nội dung phát hành khớp với bản đã duyệt. **Phát hành khi chưa duyệt tạo bản ghi deviation/violation.** Phạm vi phủ website, mạng xã hội, brochure, catalogue, thuyết trình, tài liệu distributor/HCP, đào tạo, quảng cáo, **nội dung do AI tạo ra**, text nhãn/artwork và tóm tắt kỹ thuật dùng ra ngoài.

---

### C7. Các register an toàn/PIF có nên là điều kiện bắt buộc để pass gate không?

**Bối cảnh:** App hiện có ~37 bảng bằng chứng (Formulation_Safety, Prohibited_Ingredients, PB_Caution_Limits, PIF_Checklist_ASEAN...), mỗi bảng đều gắn nhãn "Gate 0X" để tham chiếu. Nhưng nhãn này **thuần hiển thị** — cơ chế pass gate (xem B1) chỉ đọc Stage status + Gate decision trong bảng Phase Gate Flow, hoàn toàn không đọc dữ liệu trong các bảng bằng chứng này.

**Giả định hiện tại trong demo:** Có thể xảy ra trường hợp Gate 07 đã Complete + Proceed trong khi `Prohibited_Ingredients` vẫn còn dòng "REVIEW - possible formula match" chưa xử lý, hoặc `Formulation_Safety`'s "Final safety release" vẫn "Not Started" — hệ thống không cảnh báo hay chặn gì.

**Cần làm rõ:**
1. Có bảng bằng chứng cụ thể nào (ví dụ Formulation_Safety's Final Safety Sign-off, hoặc Prohibited_Ingredients không còn dòng "REVIEW"/"Prohibited - remove") cần trở thành **điều kiện bắt buộc** để Gate 07/10 được phép Complete không?
2. Nếu có, nên chặn cứng (không cho chọn decision Proceed) hay chỉ cảnh báo mềm (cho phép Proceed nhưng hiện banner nhắc còn bằng chứng chưa đóng)?
3. Toàn bộ 37 bảng, hay chỉ một số bảng "an toàn tới hạn" (safety-critical) mới cần ràng buộc này?

**Quyết định của bộ phận chuyên môn (21/07/2026):** ✅ **Đã xác nhận — dùng một tập con theo rủi ro, phân loại 3 tầng (không phải cả 37 bảng đều chặn cứng).**

Mỗi register được phân loại thành:
- **Mandatory (Bắt buộc)** — chặn cứng việc pass gate.
- **Conditional (Có điều kiện)** — chỉ trở thành bắt buộc (và chặn cứng) khi bị kích hoạt bởi loại sản phẩm, người dùng, thị trường, claim hoặc change.
- **Supporting (Hỗ trợ)** — có thể chưa hoàn tất mà không chặn gate, miễn là rủi ro phát sinh được ghi nhận (tạo cảnh báo/action, không tự động chặn).

Các register an-toàn-tới-hạn và pháp-lý-tới-hạn **phải chặn cứng** gate liên quan. Hệ thống cung cấp một **Gate Readiness panel** cho từng gate, hiển thị: mục mandatory đã hoàn tất, mục conditional đã bị trigger, các gap đang chặn, cảnh báo, link bằng chứng còn thiếu, sign-off bắt buộc, Next Action đang mở, Change Control đang mở, và kết quả sẵn sàng hiện tại là **Not Ready / Ready with Conditions / Ready for Decision / Passed**.

Danh sách cụ thể bằng chứng và sign-off bắt buộc theo từng gate (Gate 1–12) nằm trong đáp án **F1** bên dưới — cùng mô hình 3 tầng áp cho từng gate.

> **Ghi chú triển khai:** F1/C7 mở khóa `gateBlockers()` — mục Mandatory/Conditional theo từng gate trở thành chặn cứng, mục Supporting trở thành cảnh báo, và Gate Readiness panel là một màn hình UI mới. Việc còn lại là ánh xạ mỗi mục trong danh sách vào register/field cụ thể trong app và vào điều kiện trigger.

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

> **Cập nhật (21/07/2026): cả 14 câu follow-up đã được trả lời** (nguồn: `docs/Response.txt`). Bảng dưới đây nay ghi đáp án đã chốt cho từng câu. **Chỉ còn F12 thực sự mở** — phụ thuộc vào việc Cosmetri xác nhận độ phủ compliance ASEAN/Việt Nam, nằm ngoài quyền kiểm soát của nhóm ta. Danh sách bằng chứng bắt buộc theo từng gate đầy đủ cho F1 nằm ở phần phụ lục ngay sau bảng này.
>
> Chú thích: ✅ = đã trả lời/đóng · ⏳ = vẫn mở.

| # | Liên quan | Trạng thái | Đáp án đã chốt (21/07/2026) |
|---|---|---|---|
| **F1** | C7, B1 | ✅ | Phân loại 3 tầng — **Mandatory** (chặn cứng), **Conditional** (chặn cứng khi bị trigger), **Supporting** (chỉ cảnh báo) — kèm danh sách bắt buộc cụ thể theo từng gate cho **Gate 1–12** và một **Gate Readiness panel** (Not Ready / Ready with Conditions / Ready for Decision / Passed). Danh sách đầy đủ theo gate ở phụ lục bên dưới. |
| **F2** | C1 | ✅ | **Riêng "Infant 0+" KHÔNG kích hoạt Skincare for Two.** Nó kích hoạt một **workflow Infant & Baby Safety riêng**. Skincare for Two = chỉ Pregnancy/Breastfeeding/Postpartum; sản phẩm mẹ+bé kích hoạt cả hai. |
| **F3** | C3 | ✅ | Thứ tự match: định danh RM Cosmetri → INCI → CAS → synonym/nhóm → review thủ công. Watch-list là **dataset được kiểm soát do Regulatory & Safety duy trì** (INCI/CAS/synonym/thị trường/giới hạn/nguồn/ngày/owner/version), review ≥ mỗi năm. Match tự động chỉ là cờ sàng lọc. |
| **F4** | A1 × A2 | ✅ | **Hỗ trợ nhiều version song song.** Version cũ giữ nguyên các track Gate 10–12 đã đóng; thay đổi major tạo track **mới** theo từng thị trường cho version mới. Thêm thị trường = track mới (có thể trigger lại gate trước); bớt = đánh dấu Withdrawn/Cancelled (không xóa). Enum trạng thái project: Development complete / Approved in some / Approved in all active / Market transition underway / Fully closed. |
| **F5** | A2 | ✅ | Catalogue trigger Formula Change Control là khung phân loại; **major** = bất kỳ thay đổi nào có thể ảnh hưởng an toàn, hiệu quả/claim, hệ bảo quản, định danh nguyên liệu, % hoạt chất, trạng thái pháp lý, dị ứng, pH ngoài dải, dạng, quy trình, độ ổn định, bao bì, khai báo nhãn hay đăng ký. Người khởi tạo đề xuất; **reviewer kỹ thuật/quality có thẩm quyền phải xác nhận** — không chỉ do user chọn. |
| **F6** | A4, C2 | ✅ | Danh tính/phòng ban từ **SSO/AD**. Định nghĩa **≥17 vai trò** (xem A4 phía trên). Contributor không được tự duyệt phần approval-critical của mình. Ủy quyền có thời hạn, quản lý duyệt, có audit. E-approval ghi danh tính/thời gian/vai trò/quyết định/version + dấu vết vô hiệu hóa; **chưa cần 21 CFR Part 11 đầy đủ** (áp dụng nguyên tắc vững chắc ngay từ đầu). |
| **F7** | B1 | ✅ | **Gap chặn Proceed thường.** Proceed with Conditions chỉ khi gap không tới hạn, có reviewer thẩm quyền chấp nhận rủi ro, và có Next Action được kiểm soát. **Gap tới hạn → Hold / Backtrack / Reject.** |
| **F8** | B2 | ✅ | Owner **hoàn tất**; người ghi / gate owner / reviewer thẩm quyền **verify & đóng** (owner không được tự ý đóng ở nơi cần xác nhận độc lập). Trạng thái: Open / In Progress / Awaiting Information / Ready for Verification / Closed / Cancelled. Priority: Low / Medium / High / **Critical** (Critical chặn đóng gate). |
| **F9** | C4 | ✅ | Đang mở = Draft / Submitted / Under Review / Approved–Impl Pending / In Implementation / Verification Pending / On Hold. Soft lock = cảnh báo nổi bật + **bắt buộc acknowledge** trước khi ra quyết định + **chặn Proceed thường** ở nơi có ảnh hưởng; có thể **chặn cứng** với thay đổi an toàn/định danh công thức/pháp lý/artwork/claim/launch. |
| **F10** | C5 | ✅ | **Market Dossier Profile cấu hình được theo từng thị trường** (ASEAN PIF, EU PIF/CPSR/CPNP, UK PIF/CPSR/SCPN, AU AICIS + Product Master File, US MoCRA/FDA, khác cấu hình được). **Regulatory duy trì profile không cần build lại.** |
| **F11** | C6 | ✅ | 12 trạng thái workflow (Draft → … → Approved for Release → Released → Expired/Withdrawn/Superseded); vai trò = Content Owner, Technical Reviewer, Regulatory Reviewer (khi áp dụng), Final Approver; hướng dẫn từ **Claims Library** được kiểm soát do Technical + Regulatory duy trì; phát hành khi chưa duyệt = bản ghi deviation. |
| **F12** | A3 | ⏳ **MỞ** | **Điểm duy nhất còn mở.** Không thể khẳng định compliance Cosmetri phủ ASEAN/Việt Nam — **vẫn mở cho tới khi Cosmetri xác nhận**. Trong lúc chờ, MBc360 chạy thêm màn hình quét pháp lý theo từng thị trường, hiển thị market zone nguồn + ngày cập nhật, không bao giờ giả định EU/UK/US = ASEAN/VN, và cho Regulatory đính kèm kết luận ASEAN/VN riêng. |
| **F13** | B5 | ✅ | **Cho phép** nhập pre-work; chỉ khóa quyết định gate/sign-off/đóng stage chính thức khi locked. Mục nhập sớm đánh dấu **"Pre-work / Entered Before Gate Opened"** kèm ngày+user; owner phải review/chấp nhận khi phase mở. |
| **F14** | A5 | ✅ | Cả 2 luồng trong giai đoạn phát triển; nhập tay đánh dấu **"Draft – Not Reconciled with Cosmetri"**; **phải đối chiếu về một formula Cosmetri trước Gate 7 (duyệt an toàn cuối)**; **Gate 10 & 11 bắt buộc dùng formula/version đã kiểm soát trên Cosmetri**; các trường định danh/INCI/CAS/composition đã import bị khóa sau khi đối chiếu. |

---

## Phụ lục (21/07/2026) — F1: Bằng chứng & sign-off bắt buộc theo từng gate

Áp dụng mô hình 3 tầng (**Mandatory** chặn cứng · **Conditional** chặn cứng khi bị trigger · **Supporting** chỉ cảnh báo). Mỗi gate đều thêm yêu cầu **sign-off Prepared / Reviewed / Approved**. Chặn cứng áp cho bằng chứng bắt buộc về an toàn, pháp lý, PIF, claim và release; thông tin supporting chỉ cảnh báo chứ không chặn.

- **Gate 1 — Cơ hội & Yêu cầu:** bản ghi product request, project owner, nguồn yêu cầu, phạm vi sản phẩm ban đầu, thị trường & người dùng mục tiêu ban đầu.
- **Gate 2 — Người dùng mục tiêu & Brief:** development brief đã duyệt, người dùng mục tiêu & life stage, mục đích dùng & vùng cơ thể, thị trường đã chọn, cờ người dùng dễ tổn thương, yêu cầu & loại trừ của project.
- **Gate 3 — Concept sản phẩm & Claims:** concept sản phẩm, danh sách claim đề xuất, phân loại claim sơ bộ, yêu cầu bằng chứng cho từng claim, review đối thủ/benchmark khi áp dụng, regulatory review cho claim rủi ro cao/ranh giới. *(Claim có thể còn đang phát triển, nhưng từ ngữ chưa có bằng chứng không được đánh dấu approved.)*
- **Gate 4 — Sàng lọc nguyên liệu & RM:** tập nguyên liệu, định danh nguyên liệu + tham chiếu Cosmetri khi có, trạng thái bằng chứng supplier/RM, quét prohibited & restricted, quét caution mẹ bầu/cho con bú khi bị trigger, review allergen/tạp chất/chất nhiễm khi liên quan, **không còn "Prohibited – remove" chưa xử lý**. *(Một possible match chưa xử lý chỉ cho Proceed with Conditions khi reviewer đủ năng lực đánh giá là non-critical kèm action được kiểm soát.)*
- **Gate 5 — Thiết kế & Phát triển công thức:** version công thức hiện tại, composition hoặc tham chiếu Cosmetri được kiểm soát, pH mục tiêu + dải chấp nhận, yêu cầu quy trình ảnh hưởng chức năng, chiến lược bảo quản khi áp dụng, đánh giá tương thích, cơ sở hiệu quả ban đầu/ánh xạ MoA, trạng thái costing/khả thi thương mại.
- **Gate 6 — Bao bì & Linh kiện:** pack spec đề xuất, yêu cầu tương thích bao bì, yêu cầu nhãn & artwork, trạng thái supplier linh kiện, yêu cầu bao bì đặc thù thị trường, link bằng chứng bao bì được kiểm soát.
- **Gate 7 — Duyệt An toàn (CHẶN CỨNG TỚI HẠN VỀ AN TOÀN):** hoàn tất review an toàn công thức cuối, đóng quét prohibited, đóng đánh giá restricted/caution, đánh giá phơi nhiễm/mục đích dùng, review allergen & tạp chất, đánh giá tiếp xúc mẹ + trẻ sơ sinh khi Skincare for Two bị trigger, kết luận an toàn + giới hạn, phê duyệt của safety reviewer bắt buộc, không còn phát hiện an toàn tới hạn chưa xử lý. **Gate 7 không được pass khi:** chưa hoàn tất final safety release · còn nguyên liệu prohibited trong công thức · còn vấn đề caution-limit tới hạn chưa xử lý · còn thiếu đánh giá tiếp xúc mẹ/trẻ sơ sinh bắt buộc.
- **Gate 8 — Testing & Validation:** kế hoạch test, phương pháp/tham chiếu phương pháp, tiêu chí chấp nhận, xác định các test an toàn/hiệu quả/bảo quản/QC/hiệu năng bắt buộc, **hoàn tất phê duyệt human-study trước khi tuyển người tham gia** khi áp dụng, report hoặc action được kiểm soát cho test đang chạy. *(Test thiết yếu cho release phải xong trước gate release liên quan kể cả khi Gate 8 proceed có điều kiện.)*
- **Gate 9 — Độ ổn định & Sẵn sàng Release:** trạng thái stability, trạng thái tương thích bao bì, trạng thái hiệu quả bảo quản khi áp dụng, tiêu chí chấp nhận lý/hóa/vi sinh, trạng thái scale-up/pilot khi áp dụng, review deviation & rủi ro mở, kết luận sẵn sàng release. *(Test release tới hạn phải đóng; stability dài hạn có thể còn tiếp diễn nếu có launch protocol đã duyệt + đủ dữ liệu hỗ trợ.)*
- **Gate 10 — Pháp lý, Claims & PIF (CHẶN CỨNG THEO TỪNG THỊ TRƯỜNG):** checklist pháp lý áp dụng, trạng thái hồ sơ PIF/CPSR/Product Master File hoặc tương đương, register claim cấp SKU, **bằng chứng đính/link cho từng claim đã duyệt**, bằng chứng an toàn nguyên liệu & sản phẩm, bằng chứng hiệu năng sản phẩm khi liên quan, review nhãn & artwork, trạng thái published-information, phê duyệt pháp lý. *(Không claim công khai đã duyệt nào được thiếu bằng chứng + link PIF/Product Master File.)*
- **Gate 11 — Sản xuất & Launch (CHẶN CỨNG THEO TỪNG THỊ TRƯỜNG):** Gate 10 đã hoàn tất cho thị trường đó, link tài liệu GMP, version công thức hiện hành đã duyệt, version artwork đã duyệt, sẵn sàng sản xuất, đường release quality, change control đã đóng hoặc chấp nhận chính thức, thông tin sản phẩm công khai đã duyệt, phê duyệt launch.
- **Gate 12 — Hậu thị trường & Cải tiến:** phản hồi thị trường, trạng thái khiếu nại & biến cố bất lợi, review PV/PMS khi áp dụng, phản hồi hiệu năng sản phẩm, action CAPA/cải tiến, link change control, sign-off đóng review.

---

## Đầu vào còn cần cho triển khai (21/07/2026)

Các **câu hỏi về quy tắc đã đóng** (chỉ F12 còn chờ Cosmetri). Việc còn lại là **cung cấp dữ liệu/nội dung** mà các đáp án nay yêu cầu — đây là đầu vào cần thu thập, không phải quyết định cần chốt:

- **F1/C7** — ánh xạ mỗi mục theo gate ở trên vào register/field cụ thể trong app và vào điều kiện trigger (register nào là Mandatory vs Conditional vs Supporting cho từng gate).
- **F3** — dataset watch-list được kiểm soát thực tế (số CAS thật theo từng nhóm nguyên liệu) do Regulatory & Safety xây/duy trì.
- **F6** — lưới quyền chi tiết vai trò × gate/section/register, cùng ánh xạ thuộc tính SSO/AD thực (nhóm AD nào → vai trò/phòng ban MBc360 nào).
- **F10** — nội dung checklist cụ thể theo từng Market Dossier Profile (mục EU CPSR, Úc, Mỹ, …) do Regulatory cung cấp.
- **F11** — nội dung Published Product Information Guideline / Claims Library (từ ngữ đã duyệt, bằng chứng bắt buộc theo claim).
- **F12** — Cosmetri xác nhận độ phủ compliance ASEAN/Việt Nam (phụ thuộc bên ngoài).

## NPD Front-End Roadmap (workbook v2, 24/07/2026)

**Trạng thái:** ✅ Đã xác nhận. File `MBc360 Master Product Development System File v2.xlsx` do chính đội ngũ chuyên gia biên soạn, được coi là nguồn đã xác nhận sẵn — có giá trị ngang với workbook gốc — nên không cần thêm vòng xác nhận nào nữa cho các quy tắc dưới đây.

**Nội dung bổ sung:** một quy trình khoa học đầu-vào bắt buộc gồm 4 bước, mọi sản phẩm mới phải hoàn thành theo đúng thứ tự trước khi công thức bị khóa ở Gate 5:

1. **Nhu cầu & Cơ sở khoa học (Needs & Scientific Basis)** — nhu cầu thể chất, cảm xúc, của người chăm sóc và hệ quả thiết kế, kèm câu hỏi nghiên cứu và phương pháp tra cứu tài liệu. Gate ký duyệt: **Gate 02**.
2. **Bối cảnh cạnh tranh (Competitor Landscape)** — sản phẩm đối thủ đã mua và kiểm nghiệm thực tế, so sánh thử nghiệm và phân tích giải pháp hiện có/tiêu chuẩn chăm sóc hiện tại. Gate ký duyệt: **Gate 03**.
3. **Hồ sơ sản phẩm mục tiêu & Công nghệ nền (Target Product Profile & Backbone Technology)** — một định nghĩa thống nhất về "thành công" của sản phẩm, cùng công nghệ nền đề xuất và lý do vượt trội so với thị trường. Phải **hoàn tất trước khi khóa công thức (Gate 05)**.
4. **Kế hoạch bằng chứng & Hỗ trợ tuyên bố (Evidence Plan & Claim Support)** — kế hoạch chứng minh (chỉ số đo, đối chứng, tiêu chí đạt/không đạt) phải được thống nhất **trước khi** khóa công thức (Gate 05); quy trình test chi tiết hoàn tất khi đã có sản phẩm mẫu (Gate 08).

**Cách thực thi:** Formula BOM (Gate 05) giờ bị chặn cứng — giống cách một sign-off an toàn còn thiếu đã chặn gate từ trước — cho tới khi Bước 1-3 hoàn tất và ký duyệt, và kế hoạch bằng chứng của Bước 4 đã được ghi nhận. Gate 02, 03 và 08 mỗi gate cũng có thêm điểm kiểm tra sớm tương ứng với bước của mình, để vấn đề được phát hiện sớm nhất có thể thay vì chỉ tới cuối cùng mới lộ ra.

**Chủ động chưa thực thi cứng (có ghi chú, không phải bỏ sót):** sheet nguồn cũng nêu rằng không tuyên bố (claim) nào được xuất hiện trên bao bì, tài liệu HCP hay tài liệu bán hàng nếu chưa có "Claim ID" đã duyệt lưu hồ sơ. Điều này đã được theo dõi trên 1 register mới nhưng **chưa** chặn cứng bất kỳ đâu — vì làm vậy sẽ phải sửa quy trình duyệt Published Information hiện có (F11), nằm ngoài phạm vi đợt này. Đề xuất với đội ngũ nếu muốn biến đây thành rule bắt buộc ở đợt sau.

## Ghi chú

- Nhóm A (kiến trúc dữ liệu) nên được xác nhận **trước tiên** vì ảnh hưởng trực tiếp tới thiết kế database — trả lời sai hướng ban đầu sẽ tốn công sửa lại sau. *(Tất cả follow-up nhóm A đã trả lời tính đến 21/07/2026 — F4, F5, F6, F14 đã chốt; F12 còn là phụ thuộc bên ngoài.)*
- Nhóm B và C là quy tắc nghiệp vụ có thể tinh chỉnh dần trong quá trình phát triển mà không nhất thiết phá vỡ kiến trúc, nhưng vẫn cần xác nhận sớm để tránh phải làm lại UI/logic đã xây.
- Đợt trả lời 16/07/2026 **đảo ngược 3 giả định nền của demo**: (1) pass gate phải đọc thêm sign-off, Next Actions và evidence registers — không chỉ Stage status + Gate decision; (2) backtrack không bao giờ được xóa dữ liệu — cần mô hình event-log/snapshot; (3) Gate 10–12 chuyển thành theo từng thị trường thay vì một luồng chung.
- Đợt trả lời 21/07/2026 bổ sung thêm 3 điểm **thay đổi demo**: (4) **nhiều version công thức song song** — thay đổi major giữ nguyên track thị trường đã đóng của version cũ và mở track mới theo từng thị trường (F4), đảo ngược giả định "market track cố định từ lúc tạo"; (5) **"Infant 0+" có workflow Infant & Baby Safety riêng**, tách khỏi Skincare for Two (F2); (6) dòng Formula BOM nhập tay phải được **đối chiếu về Cosmetri trước Gate 7**, và Gate 10/11 phải dùng formula Cosmetri được kiểm soát (F14).
- Tài liệu tham chiếu: `MBc360 Master Product Development System File.xlsx` (55 sheets), bản demo ReactJS hiện tại (`mbc360-app/`), và phản hồi đầy đủ ngày 21/07/2026 của bộ phận chuyên môn (`docs/Response.txt`).
