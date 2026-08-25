# MBc360 — Bảng câu hỏi xác nhận nghiệp vụ trước khi triển khai thực tế

**Mục đích:** Trước khi phát triển backend/database chính thức cho hệ thống MBc360, cần bộ phận chuyên môn (Product Development / NPD / Quality / Regulatory) xác nhận các quy tắc nghiệp vụ dưới đây. Bản demo ReactJS hiện tại đã tạm áp dụng một số giả định để có thể trình bày luồng làm việc — các giả định này **cần được xác nhận hoặc điều chỉnh** trước khi xây dựng hệ thống thật.

**Cách sử dụng:** Với mỗi mục, xin vui lòng xác nhận **Đúng / Sai / Cần điều chỉnh** và ghi chú câu trả lời vào phần "Quyết định của bộ phận chuyên môn".

> **Trạng thái (16/07/2026):** Đã nhận và ghi lại quyết định của bộ phận chuyên môn cho **tất cả các mục trừ C7** (vẫn còn mở). Đội ngũ bổ sung thêm 2 yêu cầu mới (Tài liệu GMP, quy trình Published Information Approval). Các điểm còn mở được tổng hợp tại mục **"Danh sách câu hỏi cần làm rõ tiếp (follow-up)"** ở cuối tài liệu.
>
> **Trạng thái (21/07/2026):** Bộ phận chuyên môn nay đã trả lời **toàn bộ 14 câu follow-up (F1–F14)**, cùng ba mục trước đó chưa trả lời **A5, B5 và C7** (nguồn: `docs/rounds/2026-07-21-sme-reply-F1-F14.txt`). Đáp án được ghi ngay tại mỗi mục bên dưới và tóm tắt trong bảng follow-up cuối tài liệu. **Chỉ còn đúng một điểm thực sự mở: F12** (phạm vi phủ compliance ASEAN/Việt Nam của Cosmetri — phải do Cosmetri xác nhận, không thuộc quyền quyết định của nhóm ta). Mọi thứ còn lại giờ chỉ là việc **cung cấp dữ liệu/nội dung** (xem mục "Đầu vào còn cần cho triển khai" ở cuối), không còn là quyết định quy tắc nữa.
>
> **Trạng thái (07/08/2026) — đã có đáp án Vòng 3.** Trong quá trình đấu nối Gate Readiness panel theo F1, chúng tôi tích lũy 19 câu hỏi mở (cách gán tier, những mục không có chỗ ghi nhận, các mapping tự suy đoán, các quyết định tự đưa ra theo cách hiểu riêng, và nhóm mục theo từng thị trường) và gửi đi theo 5 phần A–E. **Đội chuyên môn đã trả lời toàn bộ** (nguồn: `docs/rounds/2026-08-07-sme-reply-round3.txt`). Đáp án được ghi đầy đủ tại **"Phụ lục 2 (07/08/2026)"** gần cuối tài liệu, và mọi câu hỏi trong `docs/rules/F1_Per_Gate_Open_Questions.md` nay đã đóng. Vòng này **không** mang tính hình thức: nó **đảo ngược 4 thứ đã xây xong** (sign-off theo từng gate, 2 trong 4 quy tắc claim của Published Information, màn hình quét thai kỳ không điều kiện ở Gate 7, và cách xử lý Gate 10–11 ở cấp dự án), đồng thời bổ sung khá nhiều dữ liệu cần thu thập mới — trường nguồn yêu cầu ở Gate 1, phần ghi nhận scope/thị trường/người dùng ban đầu ở Gate 1, bản ghi Development Brief được kiểm soát, cờ vulnerable-user tường minh, bảng requirements cho Phase 1, phân loại theo từng claim, đánh giá của reviewer trên watch-list, và bộ kiểm soát critical safety finding.

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

**Cập nhật (16/07/2026) — Đã nhận tài liệu API Cosmetri (`docs/reference/swagger-init.json`, OpenAPI 3.0, base `https://app1-env.cosmetri.com/api/v1`):**
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

## Thẩm quyền vòng đời dự án (26/07/2026, do chủ dự án quyết định)

Đây là những quyết định **do chúng tôi tự đưa ra, không hỏi đội chuyên môn** — ghi lại ở đây để mọi người đọc tài liệu này đều thấy, và để có thể phản biện nếu nó trái với cách vận hành thực tế. Các quy tắc này được máy chủ thực thi, không chỉ ẩn trong giao diện.

### D1. Ai được xoá dự án — và xoá thì mất những gì

✅ **Chỉ System Administrator được xoá dự án, và việc xoá sẽ xoá luôn toàn bộ lịch sử thay đổi (audit trail) của dự án đó.**

Xoá một dự án sẽ xoá dữ liệu trên khoảng 18 bảng liên quan (bản ghi gate, checklist, register, BOM, theo dõi thị trường, sign-off…). Trước đây các bản ghi lịch sử vẫn còn nhưng mất liên kết với dự án — vẫn đọc được *"ai đó đã sửa người phụ trách Gate 01"* mà **không biết thuộc dự án nào**. Như vậy còn tệ hơn cả hai lựa chọn giữ hoặc xoá, nên nay lịch sử bị xoá cùng dự án.

**Cố ý giữ lại đúng một bản ghi:** một "bia mộ" ghi ai đã xoá, xoá cái gì, lúc nào, dự án đó có được archive trước hay không, và đã phá huỷ bao nhiêu (ví dụ 12 bản ghi gate, 255 dòng register, 2 bản ghi lịch sử). Một dự án **không được phép biến mất không để lại dấu vết** về người đã xoá — đó là quy tắc B4 ("không sửa âm thầm") áp cho chính hành động xoá.

Quyền xoá **không phải** là một quyền có thể cấp trên trang Roles. Nó gắn cứng với vai trò System Administrator, đúng để không thể trao nhầm cho vai trò khác.

### D2. Ai được archive dự án

✅ **Chỉ Project Owner được archive (và phục hồi) dự án. Các vai trò khác không được archive cũng không được xoá.**

Archive là con đường duy nhất để các vai trò không phải quản trị viên "cất" một dự án: **có thể đảo lại**, không xoá gì cả, dự án chỉ biến khỏi danh sách mặc định (có ô "Show archived" để xem lại). Khác với xoá, đây **là** một quyền trên trang Roles, nên có thể điều chỉnh sau này mà không cần sửa phần mềm.

System Administrator cũng archive được — vốn đã xoá được (việc phá hoại hơn nhiều), nên từ chối họ hành động nhẹ hơn là vô lý.

### D3. Dự án đã archive thì chỉ đọc

✅ **Khi dự án đang ở trạng thái archive, không ai được sửa dữ liệu của nó — kể cả System Administrator. Muốn sửa phải phục hồi trước.**

"Chỉ đọc" là thuộc tính của **trạng thái dự án**, không phải của quyền người dùng: nếu quản trị viên sửa xuyên qua được thì "archive" chẳng còn ý nghĩa gì. Hai việc vẫn làm được: phục hồi dự án (đường ra), và — với System Administrator — xoá nó, đúng theo trình tự tự nhiên archive rồi xoá.

### D4. Ai được tạo dự án

✅ **Bất kỳ người dùng đã đăng nhập đều tạo được dự án.** Thắt lại sẽ chặn nghiệp vụ bình thường (Project Owner mở dự án mới), mà tạo dự án thì không phá huỷ gì — sai thì archive hoặc xoá.

### D5. "Project owner" ở Gate 1 — phải tick tường minh, không tự động thoả

✅ **Mục "Project owner" của Gate 1 được thoả bằng cách tick dòng Key Gate Check "Initial project record opened and owner assigned"**, đúng như hai dòng anh em cùng gate.

> **Đã sửa 07/08/2026.** Mục này trước đây ghi quyết định ngược lại — rằng nó *tự động được thoả*, với lý do Project Lead là trường bắt buộc trên form Tạo dự án mới nên dự án không thể tồn tại mà thiếu, và xác nhận lại là thừa. **Lập luận đó đã bị rút lại trong code từ 26/07/2026 nhưng chưa được ghi ngược về tài liệu này**, nên đoạn ở đây suốt thời gian qua mô tả một quy tắc mà hệ thống không hề chạy. Lý do rút lại: nó đánh đồng *"dữ kiện nền đã được bảo đảm"* với *"bước xác nhận là thừa"*. Mọi dòng Key Gate Check khác đều đòi tick tường minh bất kể dữ kiện phía sau hiển nhiên tới đâu — "Product request, opportunity and requester captured" cũng được form tạo dự án bảo đảm y hệt — nên tách riêng đúng dòng này ra cho tự pass là không nhất quán, và nó xoá mất chỗ duy nhất ghi nhận rằng có người thực sự đã kiểm tra.

**Riêng mục này chưa bao giờ được đưa cho bộ phận chuyên môn** — cả hai chiều đều là quyết định của ta, nên nó nằm ở đây chứ không nằm trong các phần quy tắc đã xác nhận phía trên. Đáp án Vòng 3 không nhắc tới nó. Tuy vậy họ hai lần bác đúng *kiểu* lập luận này, và đó là lý do giữ nguyên cách sửa thay vì mở lại: **B4** — bốn checklist Phase 1 "đóng góp vào brief nhưng không thay thế việc phê duyệt brief chính thức"; và **B5** — dự án cho người lớn thông thường "vẫn phải ghi *No vulnerable-user group identified* chứ không mặc nhiên coi là đã thoả". **D1** cũng cùng hướng: đòi 3 chữ ký ghi nhận tường minh cho mỗi gate thay vì suy ra. Nếu sau này đội chuyên môn nói rằng một mục được tự động thoả là chấp nhận được khi trường nền đã bắt buộc, thì đây là dòng cần xem lại đầu tiên.

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

> **Cập nhật (21/07/2026): cả 14 câu follow-up đã được trả lời** (nguồn: `docs/rounds/2026-07-21-sme-reply-F1-F14.txt`). Bảng dưới đây nay ghi đáp án đã chốt cho từng câu. **Chỉ còn F12 thực sự mở** — phụ thuộc vào việc Cosmetri xác nhận độ phủ compliance ASEAN/Việt Nam, nằm ngoài quyền kiểm soát của nhóm ta. Danh sách bằng chứng bắt buộc theo từng gate đầy đủ cho F1 nằm ở phần phụ lục ngay sau bảng này.
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

## Phụ lục 2 (07/08/2026) — Vòng 3: đáp án về Gate Readiness

**Nguồn:** `docs/rounds/2026-08-07-sme-reply-round3.txt`. **Nội dung đã hỏi:** 19 câu hỏi tổng hợp trong `docs/rules/F1_Per_Gate_Open_Questions.md`, gửi theo 5 phần — A (cách gán 3 tier), B (mục không có chỗ ghi nhận), C (mapping tự suy đoán), D (quyết định đã tự đưa ra theo cách hiểu riêng), E (mục theo từng thị trường). **Tất cả đã được trả lời; file đó nay đã đóng.** Mục có dấu ⚠️ là **đảo ngược hành vi đã xây xong**, tức phải làm lại chứ không chỉ làm thêm.

### Phần A — Gán tier

**A1 — quy tắc gán tier được xác nhận, kèm 2 điều chỉnh.** Quy tắc của ta (từ ngữ có định ngữ như "where applicable"/"where relevant"/"high-risk or borderline" → **Conditional**; thông tin nghiệp vụ/vòng đời mềm → **Supporting**; còn lại → **Mandatory**) là "về cơ bản đúng", bảng phân tier được chấp nhận, và định nghĩa được phát biểu lại:

- **Mandatory** — luôn luôn chặn cứng gate.
- **Conditional** — **chỉ** chặn cứng khi trigger đã định nghĩa của nó xảy ra.
- **Supporting** — không tự động chặn, nhưng rủi ro chưa xử lý hoặc thiếu bối cảnh có thể đòi hỏi cảnh báo, action, hoặc quyết định Proceed with Conditions.

Hai mục đổi tier:

| Gate | Mục | Trước | Nay |
|---|---|---|---|
| 12 | Change-control links | Supporting | **Conditional** — bắt buộc khi có khiếu nại, phát hiện hậu thị trường, CAPA, thay đổi công thức, thay đổi artwork, tín hiệu an toàn hoặc action cải tiến đã sinh ra một bản ghi Change Control. |
| 12 | Market feedback | Supporting | **Supporting cho review vòng đời định kỳ, chuyển thành Conditional khi dự án đã launch và tới kỳ post-market review theo lịch.** |

**A2 — Gate 6 "Market-specific pack requirements" = Conditional.** Trở thành bắt buộc khi thị trường đã chọn có yêu cầu cụ thể ảnh hưởng tới: ngôn ngữ · cảnh báo bắt buộc · khai báo thành phần · thông tin bên chịu trách nhiệm · số công bố/đăng ký · pack size · niêm phong chống giả (tamper evidence) · barcode hoặc truy vết · ký hiệu tái chế/môi trường · thông tin bao bì sơ cấp hoặc thứ cấp. **Nếu không có yêu cầu đặc thù nào, người dùng phải ghi N/A kèm lý do** — để trống không đồng nghĩa với "không áp dụng".

**A3 — mọi mục Conditional nay đều có trigger cụ thể.** Đây là câu quan trọng nhất của vòng này: trước đó chỉ 2/11 mục Conditional có trigger hoạt động, nên 9 mục còn lại không bao giờ chặn cứng được dù dự án thực tế là gì. Đội chuyên môn đã cung cấp đủ:

| Gate | Mục Conditional | Trigger khiến nó trở thành bắt buộc |
|---|---|---|
| 3 | Review đối thủ / benchmark | Sản phẩm mới, mở rộng claim, tái định vị, yêu cầu do khách hàng/nhà phân phối khởi xướng, hoặc khi có nêu tên sản phẩm benchmark/tham chiếu. **Không** bắt buộc với thay đổi thuần hành chính. |
| 3 | Regulatory review cho claim rủi ro cao/ranh giới | Bất kỳ claim nào được phân loại Borderline, Therapeutic-adjacent, High Risk, bị hạn chế theo thị trường, liên quan thai kỳ/cho con bú, liên quan trẻ sơ sinh, liên quan bệnh lý, hướng tới nhân viên y tế, hoặc nằm ngoài Claims Library đã duyệt. |
| 4 | Quét caution thai kỳ/cho con bú | Có chọn Pregnancy, Breastfeeding hoặc Postpartum *(đã triển khai — rule C1)*. |
| 4 | Review allergen, tạp chất và chất nhiễm | Nguyên liệu chứa hương liệu, tinh dầu, chiết xuất thực vật, protein, chất gây dị ứng đã biết, dung môi tồn dư, rủi ro kim loại nặng, rủi ro vi sinh, tạp chất bị hạn chế, tồn dư quá trình chế biến, hoặc thành phần nguồn tự nhiên biến động. |
| 5 | Chiến lược bảo quản | Sản phẩm chứa nước, có nước sẵn dùng, dùng nhiều lần, hoặc nhạy cảm vi sinh. Được ghi N/A cho sản phẩm thực sự khan (anhydrous), tự bảo quản, vô trùng hoặc dùng một lần **kèm lý do được ghi nhận**. |
| 7 | Đánh giá tiếp xúc mẹ và trẻ sơ sinh | Có chọn Pregnancy, Breastfeeding hoặc Postpartum *(đã triển khai — rule C1)*. |
| 8 | Quy trình phê duyệt human-study | Trước **bất kỳ** nghiên cứu nội bộ hay bên ngoài nào có người tham gia, tình nguyện viên, consumer testing, patch testing, thử nghiệm sử dụng thực tế, thu thập hình ảnh, bảng hỏi, hoặc dữ liệu định danh người tham gia khác. |
| 9 | Trạng thái hiệu quả bảo quản | Sản phẩm nhạy cảm vi sinh cần hệ bảo quản. |
| 9 | Trạng thái scale-up / pilot | Công thức mới, tái công thức lớn, quy trình sản xuất mới, chuyển nhà máy, thay đổi thiết bị/quy trình đáng kể, hoặc sản phẩm đã xác định có rủi ro scale-up. |
| 10 | Bằng chứng hiệu năng sản phẩm | Bất kỳ claim đối ngoại nào phụ thuộc vào bằng chứng hiệu quả, hiệu năng, cảm quan, lâm sàng, đo bằng thiết bị, in vitro, in vivo, sử dụng thực tế hoặc so sánh ở cấp sản phẩm. |
| 12 | Review PV/PMS | Khi được yêu cầu bởi nhóm sản phẩm, thị trường, chính sách công ty, tín hiệu an toàn, nhóm người dùng dễ tổn thương, xu hướng khiếu nại, hoặc kế hoạch giám sát theo lịch. |
| 12 | Change-control links | Đã mở một bản ghi Change Control, **hoặc lẽ ra phải mở** vì phát hiện hậu thị trường. |
| 12 | Market feedback | Tới mốc review sau launch theo lịch, hoặc có ghi nhận khiếu nại, sự cố khách hàng, yêu cầu nhà phân phối, phản bác claim, hoặc vấn đề hiệu năng lặp lại. |
| 12 | Phản hồi hiệu năng sản phẩm | Khi hiệu quả sản phẩm, trải nghiệm người dùng, lỗi sản phẩm hoặc hiệu năng claim nằm trong phạm vi review hậu thị trường. |

**Costing / khả thi thương mại (Gate 5) vẫn là Supporting** — nhưng chủ dự án chịu trách nhiệm vẫn có thể đưa dự án về **Hold** khi tính khả thi thương mại là điều kiện sống còn để đi tiếp.

> **Ghi chú triển khai:** một số trigger trên cần dữ liệu app chưa thu thập, nên bản thân trigger là việc phải xây chứ không chỉ là bật cấu hình — phân loại loại dự án/loại thay đổi (Gate 3, 9), cờ rủi ro thành phần nguyên liệu (Gate 4), thuộc tính "nhạy cảm vi sinh / chứa nước" của công thức (Gate 5, 9), trường phân loại claim (Gate 3 — do B7 bên dưới cung cấp), và cờ claim phụ thuộc bằng chứng (Gate 10).

### Phần B — Các mục chưa có chỗ ghi nhận (cả 7 đều được chốt: thêm trường mới)

| # | Mục | Đáp án |
|---|---|---|
| **B1** | Gate 1 — Nguồn yêu cầu | **Khác với người gửi yêu cầu.** Thêm trường **"Request Origin / Source"** với các lựa chọn: Internal product-development proposal · Management request · Sales request · Marketing request · Customer request · Distributor request · Healthcare-professional request · Consumer feedback · Complaint or post-market signal · Market research or identified opportunity · Competitor or benchmark response · Regulatory change · Supplier or ingredient opportunity · Manufacturing or quality improvement · Reformulation or lifecycle improvement · Other — specify. **Tên và phòng ban người yêu cầu vẫn là trường riêng.** |
| **B2** | Gate 1 — Phạm vi sản phẩm ban đầu | **Thêm Key Gate Check mới: "Initial product scope defined".** Trường bổ trợ ghi ngắn gọn: loại sản phẩm đề xuất · mục đích dự kiến · đây là phát triển mới, tái công thức, đổi claim, đổi bao bì, mở rộng thị trường hay cải tiến vòng đời · ranh giới đã biết của yêu cầu. |
| **B3** | Gate 1 — Thị trường & người dùng mục tiêu ban đầu | **Phương án (a).** Thêm phần ghi nhận nhẹ ở Gate 1 — **"Initial target user / life-stage"** và **"Initial target market(s)"**. Đây là thông tin sơ bộ, **không thay thế** đánh giá đầy đủ ở Gate 2; Gate 2 xác nhận, tinh chỉnh và phê duyệt chính thức. |
| **B4** | Gate 2 — Development brief đã duyệt | **Phương án (a).** Brief là **một bản ghi được kiểm soát riêng hoặc tài liệu được liên kết**, không phải suy ra từ các checklist đã điền. Thêm: **Development Brief status · Development Brief link · Brief version · Brief owner · Approval date.** Bốn checklist Phase 1 *đóng góp vào* brief nhưng **không** thay thế việc phê duyệt brief chính thức. |
| **B5** | Gate 2 — Cờ người dùng dễ tổn thương | **Phương án (b).** Hệ thống phải phân biệt "đã chọn target user" với "đã nhận diện tường minh bối cảnh dễ tổn thương". Khi chọn bất kỳ nhóm dễ tổn thương nào, bắt buộc có: **cờ vulnerable-user tường minh · safety pathway áp dụng · reviewer chịu trách nhiệm · ghi chú các đánh giá bổ sung cần làm.** Nhóm trigger: Pregnancy · Breastfeeding · Postpartum · Infant 0+ · Trẻ nhỏ · Da nhạy cảm hoặc da tổn thương · Bối cảnh hỗ trợ ung bướu/dễ tổn thương về y tế · Bối cảnh hỗ trợ liên quan thận hoặc sức khỏe đặc thù khác · Bất kỳ nhóm nào Safety hoặc Regulatory xác định cần review tăng cường. **Dự án cho người lớn thông thường vẫn phải ghi "No vulnerable-user group identified"** chứ không mặc nhiên coi là đã thỏa. |
| **B6** | Gate 2 — Yêu cầu & loại trừ của dự án | **Thêm một requirements section cho Phase 1**, dạng bảng có cấu trúc (category · requirement · priority · owner · notes), gồm: Must-have product requirements · Must-not-have ingredients or features · Intended claims · Claims not to pursue · pH mục tiêu/yêu cầu vật lý nếu đã biết · Yêu cầu cảm quan · Yêu cầu bao bì · Chi phí mục tiêu hoặc ranh giới thương mại · Tiến độ mục tiêu · Thị trường mục tiêu · Ràng buộc pháp lý · Ràng buộc người dùng/life-stage · Sản phẩm benchmark/tham chiếu · Rủi ro kỹ thuật đã biết · Loại trừ tường minh · Giả định khác của dự án. |
| **B7** | Gate 3 — Phân loại claim sơ bộ | **Phương án (a) — phân loại theo từng claim**, vì các claim trong cùng một dự án có thể mang mức rủi ro khác nhau (một đánh giá ở cấp dự án là quá thô). Mỗi claim có 2 dropdown được kiểm soát: **Claim category** = Cosmetic · Product performance · Sensory · Ingredient-level · Safety/tolerance · Environmental or sustainability · Professional or technical information · Borderline / therapeutic-adjacent · Therapeutic — not permitted within the cosmetic claim pathway · Other — Regulatory review required. **Claim risk** = Low · Medium · High · Prohibited / not acceptable · Pending classification. Đồng thời ghi nhận: từ ngữ đề xuất chính xác · SKU áp dụng · thị trường áp dụng · kênh dự kiến · bằng chứng cần có · trạng thái bằng chứng · cần Regulatory review Y/N · từ ngữ đã duyệt · giới hạn hoặc định ngữ bắt buộc. |

### Phần C — Các mapping ta tự suy đoán

**C1 — Regulatory review cho claim rủi ro cao/ranh giới: đã xác nhận**, và lấy trigger từ phân loại theo từng claim ở B7. Review là bắt buộc khi: category = Borderline / therapeutic-adjacent · category = Therapeutic — not permitted · risk = High · từ ngữ không nằm trong Claims Library đã duyệt · claim khác với từ ngữ đã duyệt trước đó · thị trường áp đặt hạn chế cụ thể · claim liên quan thai kỳ, cho con bú, dùng cho trẻ sơ sinh, bệnh lý, điều trị, phòng ngừa, chữa lành hoặc chứng thực y khoa.

**C2 — mapping của ta quá rộng.** Dòng Key Gate Check hiện có *"Restrictions, exclusions and supplier risks screened"* **vẫn giữ** như một check rộng ở Gate 4, nhưng **phải thêm một mục Mandatory riêng, hẹp: "Prohibited, restricted and caution ingredient screen completed"**, lấy trực tiếp từ kết quả watch-list tự động và phần review có chuyên môn đi kèm.

### Phần D — Các quyết định ta đã tự đưa ra, nay được review

**D1 ⚠️ — cách triển khai sign-off theo từng gate của ta bị bác.** "Owner + Evidence link trên dòng gate" **không** tương đương với Prepared / Reviewed / Approved. Mỗi gate phải có **3 chữ ký riêng biệt được ghi nhận** — Prepared by, Reviewed by, Approved by — và mỗi chữ ký ghi: **người dùng đã xác thực · vai trò · ngày/giờ · quyết định · phiên bản bản ghi · comment khi cần.** Điều này **chặn cứng quyết định gate.** Khối sign-off cấp phase **vẫn giữ như một lớp phê duyệt đóng phase bổ sung, không bị thay thế.** Khi rủi ro thấp, cùng một người có thể prepare nhiều bản ghi gate, nhưng **reviewer hoặc approver phải độc lập với các quyết định tới hạn về an toàn, pháp lý, claim hoặc release.**

**D2 ⚠️ — 2 trong 4 quy tắc claim của Published Information bị thay đổi.**

1. **Liên kết Claim ID trở thành bắt buộc**, không còn tùy chọn: mọi phát ngôn đối ngoại về lợi ích sản phẩm, an toàn, hiệu quả, hiệu năng hoặc mức độ phù hợp đều phải gắn Claim ID. Chỉ giữ tùy chọn **với** thông tin doanh nghiệp thuần túy không chứa claim hay phát biểu kỹ thuật nào về sản phẩm.
2. **Bộ chọn phải cho chọn cả claim Developing/Pending** — mục đích là ghi nhận sớm claim dự định dùng. Cái mà claim Pending **không** được phép là: Approved for Release · Released · duyệt artwork cuối · xuất bản ra bên ngoài.
3. **Không khóa cứng từng ký tự.** Hệ thống phải giữ song song **từ ngữ master đã duyệt** và **từ ngữ đề xuất theo kênh**, cùng trạng thái so sánh/review và phê duyệt của reviewer. Cho phép điều chỉnh nhỏ khi ý nghĩa, phạm vi, định ngữ và mức bằng chứng không đổi; mọi thay đổi mang tính thực chất phải tạo bản ghi claim mới hoặc bản sửa đổi. Kiểm tra tương đồng tự động chỉ dùng **như một cảnh báo**, kết luận tương đương cuối cùng do reviewer có thẩm quyền xác nhận.
4. **Chặn release được xác nhận, và mở rộng thêm:** claim được gắn phải ở trạng thái Supported **và đã được duyệt cho đúng SKU, formula version, thị trường và kênh** trước khi nội dung được lên Approved for Release hoặc Released.

**D3 — Gate 4 "possible match chưa xử lý": đã xác nhận, và nay được đặc tả.** Mỗi kết quả watch-list bị flag sẽ có thêm: **Reviewer assessment** (Critical · Non-critical · Not a true match · Further information required) · Reviewer · Review date · Rationale · Evidence link · **Linked Next Action ID** · Resolution status. **Bắt buộc phải có Next Action thật được kiểm soát — chỉ ghi note là không đủ.** Cách thực thi:

| Đánh giá | Tác động lên Gate 4 |
|---|---|
| Critical | Chặn cứng **cả** Proceed lẫn Proceed with Conditions. |
| Further information required | Chặn Proceed; chỉ cho Proceed with Conditions khi có chấp thuận của người có thẩm quyền **và** có action được kiểm soát gắn kèm. |
| Non-critical | Chặn Proceed thường cho tới khi ghi nhận xong đánh giá, lý do và action; sau đó có thể cho Proceed with Conditions. |
| Not a true match | Có thể đóng sau khi ghi nhận lý do và bằng chứng của reviewer. |

**D4 — stub khi import từ Cosmetri được chấp nhận và là cách ưa thích.** Việc import công thức không được thất bại chỉ vì bản ghi bằng chứng trong MBc360 chưa được điền. Điều kiện kèm theo: stub phải gắn nhãn rõ **"Incomplete — evidence review required"** · **không** được mặc định Approved for Use · bằng chứng còn thiếu phải hiện trong Gate Readiness · **Gate 4 không được pass tới khi mọi nguyên liệu áp dụng đã được review đầy đủ hoặc được chấp nhận chính thức qua một quyết định có điều kiện được kiểm soát** · phê duyệt an toàn cuối ở Gate 7 phải dùng trạng thái bằng chứng đã hoàn tất · **Gate 10 và 11 không được dựa vào stub chỉ có định danh mà chưa xử lý.**

### Phần E — Các mục theo thị trường và an toàn

**E1 ⚠️ — Gate 7, sai ở cả hai điểm.**
- Cần **một bộ kiểm soát safety finding riêng** thay vì chỉ dựa vào Final Safety Sign-off: **Critical safety finding identified (Yes/No) · Mô tả phát hiện · Nguyên liệu/công thức/bối cảnh sử dụng bị ảnh hưởng · Mức độ nghiêm trọng · Action bắt buộc · Owner · Trạng thái · Kết luận của safety reviewer · Evidence link.** **Gate 7 không thể pass khi còn bất kỳ critical safety finding nào đang mở.**
- **Cách hiểu của ta là sai:** đánh giá thai kỳ/cho con bú ở Gate 7 **không** phải không điều kiện. Nó bắt buộc **khi có chọn Pregnancy, Breastfeeding hoặc Postpartum**; **sản phẩm chỉ dành cho trẻ sơ sinh kích hoạt Infant/Baby Safety pathway** (nhất quán với F2); sản phẩm thông thường **ghi N/A kèm lý do** khi không thuộc pathway nào.

**E2 — Checklist pháp lý Gate 10: phương án (b), kèm một bản ghi tạm.** Chỉ enforce checklist ASEAN **khi có chọn thị trường ASEAN**. Với thị trường ngoài ASEAN, bắt buộc có **Regulatory Checklist Status** tạm thời gồm: thị trường áp dụng · loại hồ sơ yêu cầu · owner · link checklist hoặc bằng chứng · trạng thái · phê duyệt Regulatory. **Việc chưa có template quốc gia dựng sẵn không đồng nghĩa mục này được bỏ trống không enforce** — Regulatory có thể dùng checklist bên ngoài đã duyệt được liên kết vào, cho tới khi profile trong app được cấu hình.

**E3(a) ⚠️ — Gate 10 và 11 chuyển sang theo từng thị trường**, đúng như đã chốt ở A1/F4. Mỗi thị trường đang hoạt động có riêng: Gate 10 readiness · trạng thái hồ sơ/PIF · phê duyệt claims · phê duyệt Regulatory · Gate 11 readiness · phê duyệt launch · ngày phê duyệt · **formula version áp dụng** · **artwork version áp dụng**. Trạng thái tổng thể của dự án hiển thị một trong: *No market approved · Some markets approved · All active markets approved · Market transition in progress*. **Một thị trường được duyệt không được làm cho tất cả thị trường trông như đã sẵn sàng.**

**E3(b) — Gate 11 cần hơn cả soft lock hiện tại.** Cơ chế C4/F9 hiện có phù hợp cho change đang mở ở mức rủi ro thấp/trung bình, nhưng Gate 11 phải đánh giá **phân loại tác động và trạng thái đóng** của từng Change Control đang mở:

| Change đang mở | Tác động ở Gate 11 |
|---|---|
| Critical hoặc ảnh hưởng launch | **Chặn cứng launch.** |
| Ảnh hưởng công thức, artwork, claim, an toàn, pháp lý, bao bì hoặc release | **Chặn cứng trừ khi đã hoàn tất triển khai và verify.** |
| Thay đổi hành chính rủi ro thấp | Có thể cho Proceed with Conditions sau khi có acknowledgement của người có thẩm quyền. |
| Đã hoàn tất, bị từ chối, bị hủy hoặc bị thay thế | Không chặn, miễn là đã ghi nhận disposition cuối cùng. |

### Vòng này thay đổi gì trong ứng dụng

**Phải làm lại phần đã ship (4)** — trạng thái tới 07/08/2026:
1. ❌ **Sign-off theo từng gate** — thay "Owner + Evidence link" bằng một e-signature 3 vai trò, 6 trường thật cho mỗi gate (D1). Chạm cả 12 gate và là hạng mục lớn nhất.
2. 🟡 **Published Information / claims** — bộ chọn nay đã nhận claim Pending (**xong**; điều kiện chặn ở trạng thái release vốn là cơ chế riêng nên không bị yếu đi). Còn lại: Claim ID thành bắt buộc với phát ngôn về sản phẩm, fill-and-lock chuyển thành master wording vs channel wording với tương đương do reviewer xác nhận, và mở rộng điều kiện chặn release theo SKU + formula version + thị trường + kênh (D2).
3. 🟡 **Màn hình quét thai kỳ ở Gate 7** — **xong:** không còn không-điều-kiện, nay Conditional theo Pregnancy/Breastfeeding/Postpartum. Trước đó nó chặn **mọi** project, kể cả sản phẩm cho người lớn thông thường, trên sổ caution 12 dòng dành cho maternal. Còn lại: pathway riêng cho trẻ sơ sinh (chờ **A2** của Vòng 2) và một đường ghi N/A kèm lý do riêng (E1).
4. ❌ **Gate 10–11** — chuyển từ cấp dự án sang readiness theo từng thị trường (E3a). Đây chính là phần việc F4, nay đã hết vướng.

> **Hai câu hỏi mới phát sinh khi làm mục 2 và 3**, đã ghi vào `F1_Per_Gate_Open_Questions.md` → mục "Round 4": dòng *"restricted/caution assessment closed"* ở Gate 7 nghĩa là riêng đánh giá thai kỳ/cho con bú (cách ta đang đọc) hay là một đánh giá rộng hơn vẫn phải áp cho mọi project; và sản phẩm chỉ-cho-trẻ-sơ-sinh có nên tiếp tục bị chặn ở Gate 7 bằng thứ gì đó trong lúc chờ, vì trigger maternal nay không còn kích hoạt cho nó mà Infant pathway thì chưa có.

**Dữ liệu cần thu thập mới:** Request Origin/Source (B1) · Key Gate Check "Initial product scope defined" (B2) · người dùng & thị trường mục tiêu ban đầu ở Gate 1 (B3) · bản ghi Development Brief được kiểm soát (B4) · khối cờ vulnerable-user tường minh (B5) · bảng requirements Phase 1 (B6) · phân loại theo từng claim, category + risk + 9 thuộc tính (B7) · mục kiểm tra riêng cho prohibited/restricted/caution ingredient screen (C2) · đánh giá của reviewer trên watch-list kèm Next Action liên kết (D3) · bộ kiểm soát critical safety finding (E1) · Regulatory Checklist Status tạm cho thị trường ngoài ASEAN (E2).

**Đấu nối trigger (A3):** 12 trigger Conditional nay đã có đặc tả; mỗi cái trở thành chặn cứng thật khi dữ liệu nó đọc đã tồn tại. Một số phụ thuộc vào phần thu thập mới ở trên (đáng chú ý B7 → Gate 3, và thuộc tính nhạy cảm vi sinh → Gate 5 và 9).

**Được xác nhận là đã đúng, không phải sửa:** bản thân quy tắc gán tier (A1), stub khi import Cosmetri (D4, kèm 5 điều kiện cần kiểm chứng), và mẫu thực thi possible-match ở Gate 4 (D3 đi theo đúng hình dạng soft-lock F9 ta đang dùng).

---

## Phụ lục 3 (24/08/2026) — Vòng 4: 36 đáp án

**Nguồn:** `docs/rounds/2026-08-24-sme-reply-round4.md`. **Nội dung đã hỏi:** 36 câu trong `docs/rounds/2026-08-12-our-questions-round4.md`, gộp từ 33 câu nội bộ `R4-Q1…R4-Q33` trong `docs/rules/F1_Per_Gate_Open_Questions.md` cộng ba mục còn tồn từ 21/07 (định nghĩa "critical", nội dung luồng Infant & Baby Safety, và cái gì chính thức kết thúc một phiên bản công thức cũ). **Cả 36 đã được trả lời; danh sách Vòng 4 nay đã đóng.**

Mục có dấu ⚠️ là **đảo ngược hành vi đã xây xong**, tức phải làm lại chứ không chỉ làm thêm. Mục có dấu ✅ xác nhận thứ đang chạy — với những mục đó việc duy nhất phải làm là gỡ tag `[ASSUMPTION: R4-Qn]`.

### Mục lục — cả 36 câu kèm kết luận

| # | ID nội bộ | Chủ đề | Kết luận |
|---|---|---|---|
| 1 | `R4-Q2` + A2 (21/07) | Luồng Infant & Baby Safety | ⚠️ Compartment 3 đúng nhưng chỉ là cấu phần **cuối** của một luồng trải 6 gate |
| 2 | A3 (21/07) | Cái gì kết thúc phiên bản công thức cũ | 🆕 Sáu trạng thái phiên bản + quyết định supersession theo từng thị trường do người ghi |
| 3 | A1 (21/07) | Định nghĩa một gap critical | 🆕 Gap mang đánh giá mức độ nghiêm trọng của riêng nó (8 trường mới) |
| 4 | `R4-Q11` | Phạm vi PV/PMS | 🆕 Baseline cho mọi sản phẩm đang bán + 14 trigger enhanced + market profile cấu hình được |
| 5 | `R4-Q1` | Phạm vi restricted/caution ở Gate 7 | ⚠️ **Option (b)** — màn hình chung cho mọi sản phẩm, maternal là lớp thêm |
| 6 | `R4-Q3` | Ngưỡng caution Gate 4 vs Gate 7 | ⚠️ Gate 4 phải **disposition mọi dòng**, không chỉ phản ứng khi có escalation |
| 7 | `R4-Q9` | Dữ liệu trigger chưa được ghi | ⚠️ **Option (b)** — "chưa đánh giá" phải chặn. Xuyên suốt toàn hệ |
| 8 | `R4-Q4` | Change Control "should be opened" | 🆕 Bước đánh giá tường minh Yes / No / Pending assessment |
| 9 | `R4-Q5` | Cái gì đánh dấu "đã dự định làm study" | 🆕 Trường dự án tường minh Yes / No / Undecided |
| 10 | `R4-Q6` | Ánh xạ nguồn feedback | ⚠️ Danh sách 16 option trộn ba khái niệm, nên tách ra |
| 11 | `R4-Q7` | Thay đổi thuần hành chính | ⚠️ **Không** loại dự án nào trong sáu loại tự động là hành chính |
| 12 | `R4-Q8` | Major reformulation, rủi ro scale-up | ✅ Major = major reformulation · 🆕 18 vùng ảnh hưởng + trường rủi ro scale-up |
| 13 | `R4-Q10` | Kỳ review sau launch theo lịch | 🆕 1 / 3 / 12 tháng rồi hằng năm, tính từ **ngày launch thương mại thực tế** |
| 14 | `R4-Q10` | "Đã launch" khi dự án nhiều thị trường | 🆕 Theo từng thị trường, kèm roll-up cấp dự án 5 giá trị |
| 15 | `R4-Q12` | Tier của product-performance / market feedback | ⚠️ Product-performance → Conditional; market feedback tách thành **hai** mục |
| 16 | `R4-Q13` | Lý do N/A | 🆕 Hệ thống được tự sinh; mục critical vẫn cần reviewer xác nhận |
| 17 | `R4-Q14` | Rủi ro thành phần của nguyên liệu | 🆕 Một **Raw Material Risk Overlay** dùng chung, không nhập lại theo từng dự án |
| 18 | `R4-Q15` | Chữ ký Gate 10/11 | 🆕 **Theo từng thị trường.** Phase 4 có trạng thái theo thị trường |
| 19 | `R4-Q16` | Kiến trúc claim | ✅ (a)(c)(e)(f) đúng như đã xây · ⚠️ (g) **bảy** register tham chiếu Claim ID · (h) mechanism bắt đầu ở Gate 3 |
| 20 | `R4-Q17` | Các trường Gate 1 | ✅ Xác nhận đúng y như đã xây — không đổi code |
| 21 | `R4-Q18` | Bảng requirements Phase 1 | ⚠️ Priority = **Must / Should / Could** · 🆕 disposition N/A kèm lý do |
| 22 | `R4-Q19` | Hai option list của Gate 1 | ✅ (a)(d)(e) · ⚠️ (b) cần loại **Primary** · (c) đổi cả hai giá trị owner |
| 23 | `R4-Q20` | Product type, safety matrix | ✅ Cả hai yêu cầu đều đúng · 🆕 thêm một option · 4 đường phủ được chấp nhận |
| 24 | `R4-Q21` | Trường thị trường ban đầu bị trùng | ⚠️ Bỏ nó; Countries / Markets là nguồn duy nhất, không bắt buộc lúc tạo dự án |
| 25 | `R4-Q22` | Ánh xạ nhóm dễ tổn thương | ✅ 5 cặp và cách xử lý hai chiều · ⚠️ tách Dry / eczema-prone |
| 26 | `R4-Q23` | Sổ claim traceability đóng băng lúc nào | ✅ Mở suốt tới 10/11 · 🆕 revision đã duyệt trở thành read-only |
| 27 | `R4-Q24` | Bằng chứng đã qua Regulatory review | ✅ Năm trường và bốn outcome · 🆕 11 cờ chủ đề claim có cấu trúc |
| 28 | `R4-Q25` | Claims Library | 🆕 Cấp công ty, Technical **và** Regulatory cùng duyệt, dự án chỉ đọc |
| 29 | `R4-Q26` | Chữ ký theo từng gate | 🆕 Cả năm điểm còn mở đều đã có đáp án |
| 30 | `R4-Q27` | Liên kết claim, điều chỉnh wording | ✅ Cả bốn quyết định · 🆕 liên kết artwork, bản ghi publication, phê duyệt miễn trừ |
| 31 | `R4-Q28` | Stub import nguyên liệu | ✅ Năm trên sáu · ⚠️ (f) ở Gate 7/10/11 chỉ **nguyên liệu có trong công thức** mới chặn cứng |
| 32 | `R4-Q29` | Vết reviewer của watch-list | ⚠️ (a) thêm Needs Safety Review · (b) năm trạng thái · (e) áp cả sổ maternal |
| 33 | `R4-Q30` | Critical Safety Findings | ⚠️ 4 mức severity · 6 trạng thái · bắt buộc controlled action · chặn theo bậc |
| 34 | `R4-Q31` | Change Control ở Gate 11 | ⚠️ Critical là một mức riêng · final disposition = 8 trường |
| 35 | `R4-Q32` | Checklist regulatory theo thị trường | ⚠️ Hai bộ giá trị riêng, không dùng lại bộ sẵn có |
| 36 | `R4-Q33` | Claim cosmetic, trạng thái costing | ⚠️ (a) Cosmetic **có** kích hoạt bằng chứng product-level · 🆕 (b) trường trạng thái costing |

---

### Phần 1 — Đáp án xuyên suốt toàn hệ (câu 7)

**⚠️ Option (b): thiếu một đánh giá không bao giờ được hiểu là điều kiện không áp dụng.** Phải phân biệt ba trạng thái:

- **Đã đánh giá và có áp dụng**
- **Đã đánh giá và không áp dụng**
- **Chưa đánh giá**

Với mục readiness tier **Mandatory** hoặc **Conditional**, **"chưa đánh giá" phải chặn readiness.** Một điều kiện chỉ được coi là không áp dụng *sau khi* thông tin trigger tương ứng đã được điền và kết luận là không áp dụng. Với mục **Supporting**, thiếu thông tin có thể sinh cảnh báo thay vì chặn cứng.

Hai hệ quả được nêu đích danh:

- Claim ở trạng thái phân loại **Pending** phải kích hoạt Regulatory review cho tới khi được phân loại. *(Xác nhận đúng cách hiểu đã ship trong `CLAIM_RISKS_NEEDING_REVIEW`.)*
- Công thức **chưa có đánh giá nhạy cảm vi sinh thì không được tự động bỏ qua** yêu cầu preservative strategy hay preservative efficacy. *(Đây không phải hành vi hiện tại: `isReadinessTriggerActive` trả về false khi thuộc tính chưa được điền, nên Gate 5 và Gate 9 đều tự pass trên mọi dự án chưa ai phân loại.)*

> **Vì sao đặt đầu phụ lục:** đánh giá trigger là một hàm boolean duy nhất mà mọi mục Conditional ở mọi gate đều đọc. Chừng nào nó chưa phân biệt ba trạng thái, mọi mục Conditional xây trên nó đều mang ngữ nghĩa sai.

### Phần 2 — Bộ từ vựng mức độ nghiêm trọng và vòng đời (câu 3, 32b, 33, 34)

Bốn câu hỏi riêng biệt trả về **cùng hai bộ từ vựng**.

**Thang mức độ nghiêm trọng có bốn bậc: Low · Medium · High · Critical.** Critical là một mức riêng *trên* High — nêu ở câu 34(a) và câu 33(a), và được câu 3 sử dụng.

**(Câu 3) Một gap mang đánh giá mức độ nghiêm trọng chính thức của riêng nó**, không phải phán định tại chỗ của người ghi quyết định gate. Trường mới: **Criticality** (Low / Medium / High / Critical) · **Impact category** (Safety · Regulatory · Claims · Quality · Efficacy · Release · Commercial · Other) · Assessor · Assessment date · Rationale · Evidence link · Required action · Action owner. Mức độ nghiêm trọng do một reviewer đủ năng lực đánh giá.

| Mức của gap | Hệ quả |
|---|---|
| **Critical** | Không được mang qua Proceed with Conditions. Phải dẫn tới **Hold, Backtrack hoặc Reject/Stop**. |
| **High** | Chỉ được mang có điều kiện khi không vi phạm quy tắc bắt buộc nào về safety, regulatory hay release, **và** bộ phận có thẩm quyền chấp nhận rủi ro, **và** đã ghi một controlled action kèm hạn hoàn thành. |

**(Câu 33) Critical Safety Findings.** Severity = Low · Medium · High · Critical. Status = **Open · Under Review · Action Pending · Verification Pending · Closed · Superseded**. **Bắt buộc phải có controlled Next Action** với finding Critical, finding High, và finding Medium cần hoạt động khắc phục — free text có thể mô tả hành động nhưng không được thay thế bản ghi có kiểm soát. Một finding chưa được phán định thì chặn Gate 7. Đóng một finding High hoặc Critical đòi hỏi: kết luận của safety reviewer · evidence link · action liên kết đã hoàn thành · verification · người verify · ngày đóng.

| Finding | Hệ quả ở Gate 7 |
|---|---|
| **Critical** hoặc **High** đang mở | Chặn cứng. |
| **Medium** | Có thể cho Proceed with Conditions khi được chấp nhận chính thức và có kiểm soát. |
| **Low** | Có thể sinh cảnh báo hoặc action theo kết luận của reviewer. |

> Một finding được đánh giá là không critical vẫn phải được disposition đúng cách — không được biến mất chỉ vì nó không phải Critical.

**(Câu 32b) Resolution status của watch-list** = Open · Under Review · Action Pending · Verification Pending · Closed. Một trường đánh giá **riêng** ghi kết quả là Critical, Non-critical, Not a true match hay Further information required.

**(Câu 34) Change Control ở Gate 11.** Thang rủi ro thêm mức Critical. Một Change Control đang mở mà **chưa được phân loại** thì chặn Gate 11. "Đã ghi final disposition" nghĩa là tám thứ, không phải một ngày đóng hay một ghi chú ngắn: Final status · Outcome · Đã triển khai gì hoặc vì sao không cần triển khai · Verification evidence · Phiên bản formula/artwork/claim/market bị ảnh hưởng · Người verify chịu trách nhiệm · Ngày đóng · Action hoặc yêu cầu chuyển tiếp còn lại, nếu có. Bước acknowledgement sẵn có được dùng lại **nếu bị giới hạn theo role** và ghi: Authenticated user · Role · Date/time · Rationale · Change Control reference · Conditions accepted — và **chỉ người có thẩm quyền phê duyệt phần ảnh hưởng Gate 11 tương ứng mới được acknowledge**.

### Phần 3 — Chữ ký theo từng gate (câu 18 và 29)

Hai đáp án này cùng nhau gỡ chặn D1, thứ đã được giữ lại từ 12/08/2026 để chờ đúng chúng.

**(Câu 18) Prepared, Reviewed và Approved phải được ghi theo từng thị trường ở Gate 10 và 11**, vì mỗi thị trường có thể khác nhau về trạng thái dossier · quyết định regulatory · claims · artwork · phiên bản công thức · ngày launch. **Post-market review ở Gate 12 cũng vận hành theo từng thị trường, và Phase 4 có trạng thái theo từng thị trường.** Tổng thể dự án có thể hiển thị: No market complete · Some markets complete · All active markets complete · Ongoing post-market stewardship · Market withdrawal or transition. Một bản tóm tắt Phase 4 cấp dự án được phép tồn tại, **nhưng chỉ như một roll-up — không được thay thế các phê duyệt theo từng thị trường.**

**(Câu 29) Năm điểm còn mở:**

1. **Record version = ảnh chụp bằng chứng riêng của gate.** Bản ghi được ký gồm: trạng thái gate và quyết định đề xuất · gate checks · kết quả checklist áp dụng · trạng thái các register bằng chứng bắt buộc và bị trigger · evidence link và document revision · action và điều kiện đang mở · phiên bản công thức khi liên quan · thị trường và phiên bản artwork khi liên quan. Nếu bằng chứng trong ảnh chụp đã ký thay đổi sau đó, **chữ ký trở thành stale/bị vô hiệu, hệ thống chỉ ra cái gì đã đổi, và phải ký lại.** *"A project-wide save counter is not sufficient"* — loại thẳng `projects.version`.
2. **Comment là bắt buộc với:** Proceed with Conditions · Hold · Backtrack · Reject/Stop · Approved with Conditions · Not Approved · Further Information Required · N/A khi cần lý do do người viết · Delegated approval · Override or exception. Quyết định Proceed hoặc Approved sạch thì comment là tuỳ chọn.
3. **Gate critical = 3, 4, 7, 8, 9, 10, 11** — claims · sàng lọc nguyên liệu và regulatory · safety · testing, human study và bằng chứng · độ ổn định và sẵn sàng xuất xưởng · regulatory, claims và dossier · sản xuất và xuất xưởng launch.
4. **"Độc lập" nghĩa là:** ở **mọi** gate, reviewer phải là một người được xác thực **khác** với người chuẩn bị. Ở bảy gate critical, thêm điều kiện: ít nhất một reviewer hoặc approver phải **đại diện cho chức năng độc lập tương ứng** — quyết định safety do Safety/Scientific Review review/duyệt · regulatory do Regulatory · quality/release do Quality · claim do Technical và/hoặc Regulatory. Luồng human-study chuyên biệt vẫn giữ quy tắc chặt hơn là phải khác phòng ban.
5. **Trình tự và quyết định:** Preparer xác nhận bản ghi đã đầy đủ và đề xuất một quyết định → Reviewer xác nhận bằng chứng và ghi khuyến nghị → **Approver ghi quyết định cuối cùng của gate.** Quyết định của approver **chính là** quyết định gate; không có bước quyết định trùng lặp nào sau khi duyệt. Cả ba chữ ký tham chiếu cùng một ảnh chụp hiện hành, và gate chỉ pass khi approver ghi Proceed hoặc Proceed with Conditions.

### Phần 4 — Ba tập dữ liệu tham chiếu cấp công ty (câu 4, 17, 28)

**(Câu 17) Raw Material Risk Overlay.** Không nhập lại rủi ro thành phần theo từng dự án. Nơi lưu tốt nhất về lâu dài là **Cosmetri**; cho tới khi API của Cosmetri cung cấp được các trường này, MBc360 duy trì một overlay dùng chung **khoá theo raw-material ID của Cosmetri**. Đây *không* phải một master nguyên liệu thứ hai — nó chỉ lưu các phân loại rủi ro riêng của MBc360 mà API không cung cấp: Fragrance · Essential oil · Botanical extract · Protein · Known allergen · Residual-solvent risk · Heavy-metal risk · Microbiological risk · Restricted impurity · Processing residue · Variable natural-source composition. Overlay phải dùng lại được giữa các dự án · do người dùng Technical, Safety và Regulatory có thẩm quyền kiểm soát · lưu lịch sử revision · ghi evidence link và ngày review · và được di trú sang Cosmetri nếu năng lực đó xuất hiện sau này.

**(Câu 28) Claims Library — cấp công ty.** Mỗi entry mang tag phạm vi áp dụng cho Brand · Product family · SKU · Market · Language · Channel · Consumer or professional use. **Dự án đọc từ thư viện nhưng không sửa trực tiếp.** Claim của một dự án link tới entry thư viện khi nó tái sử dụng wording đã duyệt; một claim thật sự mới có thể được đề xuất mà không có link nhưng **phải được đánh dấu "New claim — not yet in Claims Library"**, và điều đó kích hoạt Regulatory cùng Technical review. **Technical và Regulatory phải cùng duyệt** một entry trước khi nó trở thành Approved Library Wording; Marketing/Brand được đề xuất wording nhưng không được đưa ra phê duyệt kỹ thuật hay pháp chế cuối cùng. Mỗi entry lưu Revision · Approval history · Evidence requirement · Market/channel applicability · Effective date · Review date · Withdrawal status. **Việc dự án được duyệt không được tự động đẩy wording vào thư viện** — cần một hành động có kiểm soát riêng, **"Propose for Claims Library"**, sau đó Technical và Regulatory xem xét cho mục đích tái sử dụng rộng hơn. Khi một entry bị đổi hoặc thu hồi, hệ thống cần: xác định mọi claim, SKU, thị trường và tài liệu đã xuất bản có liên kết · kích hoạt đánh giá tác động · tạo Change Control khi cần · gắn cờ tài liệu bị ảnh hưởng để review lại · ghi ngày hiệu lực và kế hoạch chuyển tiếp. *Việc đổi hoặc thu hồi không được tự động rút sản phẩm khỏi thị trường, trừ khi thay đổi là critical hoặc do Regulatory yêu cầu.*

**(Câu 4) Market profile của Regulatory.** MBc360 yêu cầu một kỳ post-market surveillance review **baseline cho mọi sản phẩm đang bán**. Một kỳ review **enhanced** trở thành bắt buộc khi trúng bất kỳ điều nào sau: sản phẩm cho trẻ sơ sinh hoặc trẻ nhỏ · sản phẩm cho thai kỳ, cho con bú hoặc sau sinh · sản phẩm dùng vùng kín · sản phẩm vùng mắt hoặc có khả năng phơi nhiễm mắt · da nhạy cảm, dễ chàm hoặc da tổn thương · nhóm dân số dễ tổn thương về y tế · claim rủi ro cao hoặc cận điều trị · hoạt chất mới hoặc bất thường · tín hiệu an toàn · biến cố bất lợi · xu hướng khiếu nại đáng kể · vấn đề chất lượng hoặc hiệu năng lặp lại · yêu cầu cảnh giác đặc thù theo thị trường · yêu cầu trong một kế hoạch giám sát đã được phê duyệt.

> **Không dùng danh sách quốc gia hard-code vĩnh viễn.** Regulatory duy trì một **market profile cấu hình được**, cho biết mỗi thị trường có yêu cầu báo cáo biến cố bất lợi, hồ sơ PMS hay chu kỳ review cụ thể nào không.

Chính market profile này cũng cung cấp hạn chế claim theo thị trường ở câu 27 và loại dossier bắt buộc ở câu 35.

**Chu kỳ review bắt buộc:** kỳ review đầu tiên sau launch · kỳ 12 tháng · hằng năm sau đó chừng nào sản phẩm còn được bán · review ngay lập tức khi xuất hiện tín hiệu an toàn hoặc khiếu nại đáng kể.

### Phần 5 — Kiến trúc claim (câu 19, 26, 27, 30, 36a)

**(Câu 19) Xác nhận đúng như đã xây:** cột **Claim category** sẵn có *chính là* phân loại của B7 — đừng tạo cột thứ hai (a); **Claim → Evidence Traceability là nguồn sự thật**, còn SKU Claims / PIF register tham chiếu một Claim ID và kế thừa read-only các giá trị Claim category, Claim risk, Master wording, Current revision và Evidence status (c); Claim ID được **tạo ở Gate 3** khi claim lần đầu được đề xuất, không chờ tới khi có bằng chứng (e); picker cung cấp **mọi** claim đã khai báo, kể cả Pending và đang phát triển, còn việc dùng được ra bên ngoài do các kiểm soát release quyết định (f).

**Thay đổi hoặc mở rộng:**

- **(b)** *Intended channel* và *Regulatory review required* thuộc về **bản ghi sử dụng claim theo SKU / thị trường / kênh** — chúng mô tả claim được dùng thế nào và ở đâu. Claim gốc có thể luôn đòi Regulatory review; một thị trường hoặc kênh có thể áp thêm yêu cầu review riêng.
- **(d)** Trước khi Gate 3 pass, mọi claim trong phạm vi phải có: Claim ID · Proposed master wording · Claim category · Claim risk · Preliminary evidence requirement · Regulatory review status khi bị trigger. Không có con số claim tuỳ tiện nào — **nếu không đề xuất claim nào thì phải ghi lại điều đó một cách tường minh.**
- **(g) ⚠️ Bảy register** tham chiếu Claim ID thay vì gõ lại wording — ta chỉ hỏi về bốn: mechanism map · prospective evidence plan · efficacy study plan · clinical evidence register · **Published Information Approval** · **artwork/label claim list** · **PIF claims register**.
- **(h) Gate nào sở hữu thông tin nào của claim.** *Gate 3* — Claim ID · proposed master wording · category · risk · **cơ chế hoặc lập luận lợi ích sơ bộ** · preliminary evidence requirement. *Gate 5* — cơ chế đặc thù công thức đã xác nhận · đóng góp của thành phần và công thức · liên kết cơ chế ↔ claim. *Gate 8* — evidence plan · study method · evidence grade · trạng thái báo cáo hoặc kiểm nghiệm hỗ trợ. *Gate 10* — trạng thái Supported · wording đã duyệt cuối cùng · phê duyệt theo thị trường · đính kèm PIF / Product Master File · phê duyệt phát hành claim. **Cơ chế bắt đầu như một giả thuyết sơ bộ ở Gate 3 và được xác nhận về mặt kỹ thuật ở Gate 5** — cách chia của ta đặt nó chỉ ở Gate 5.

**(Câu 26) Sổ không đóng băng ở Gate 8** — nó vẫn dùng được suốt Gate 10 và 11, đúng như đã xây. Cái được thêm là **kiểm soát revision**: claim ở trạng thái draft vẫn sửa được; **một khi một revision của claim được Regulatory hoặc Gate 10 phê duyệt, revision đó trở thành read-only**; wording mới hoặc lập trường bằng chứng mới tạo ra một revision mới hoặc một Claim ID mới theo câu 30(b). Thêm một claim thật sự mới sau Gate 3 đòi hỏi đánh giá thay đổi có kiểm soát và backtrack tương ứng; thêm một *cách dùng* theo thị trường của một claim đã duyệt thì không nhất thiết mở lại Gate 3 nhưng vẫn cần Gate 10 review theo thị trường.

**(Câu 27) Năm trường Regulatory review được chấp nhận** — Regulatory review outcome · reviewer · review date · review rationale · review evidence link — và cả năm phải được điền với một claim bị trigger. **Bốn giá trị outcome được chấp nhận:** Approved · Approved with Conditions · Not Approved · Further Information Required. **Việc thay đổi wording sau khi đã review phải vô hiệu hoá lần review trước và kích hoạt đánh giá lại** — xác nhận đúng cơ chế snapshot đã xây.

🆕 **Thêm các cờ chủ đề claim có cấu trúc** thay vì suy ra từ free text: Pregnancy · Breastfeeding · Postpartum · Infant or child · Disease or condition · Treatment or prevention · Healing or repair · Medical or HCP endorsement · Safety or tolerance · Comparative or superiority · Other sensitive topic. *(Điều này làm cho điều kiện C1 vốn được ghi là "đọc từ wording là phán định, không phải tra cứu" trở nên đánh giá được.)* Hạn chế theo thị trường lấy từ market profile cấu hình được của Regulatory.

**(Câu 30) Cả bốn quyết định của ta được chấp nhận**, với các yêu cầu áp dụng **ở thời điểm release, không phải lúc nhập lần đầu**. Ba giá trị so sánh được chấp nhận: Identical to master wording · Minor adaptation — meaning, scope, qualifiers and evidence burden unchanged · Material change — new or revised claim required. Khác biệt chỉ ở khoảng trắng có thể bỏ qua; mọi khác biệt khác do người review, không để máy tự phán là tương đương.

- **(b) Revision hay Claim ID mới.** **Revision mới của cùng một Claim ID** khi luận điểm claim vẫn như cũ, phạm vi và lợi ích dự kiến không đổi, gánh nặng bằng chứng không đổi, và wording chỉ đang được tinh chỉnh hoặc cập nhật. **Claim ID mới** khi ý nghĩa thay đổi · lợi ích hoặc kết quả thay đổi · phạm vi mở rộng · nhóm đối tượng thay đổi · gánh nặng bằng chứng thay đổi đáng kể · claim chuyển sang một hạng mục rủi ro hoặc pháp lý khác. **Reviewer Technical/Regulatory quyết định đi đường nào.**
- **(c) 🆕 Phê duyệt artwork cuối cùng** được thể hiện trong **bản ghi Packaging / Artwork Approval**, và bản ghi đó **phải link mọi Claim ID xuất hiện trên artwork** và **chặn cứng** khi bất kỳ claim liên kết nào đang ở trạng thái Pending · Unsupported · Not approved for the market · Superseded · Not approved for the intended wording or channel.
- **(d) 🆕 Xuất bản ra bên ngoài là một sự kiện tách rời** khỏi Approval for Release. "Approved for Release" nghĩa là đã được cho phép sử dụng; sau đó một **bản ghi Publication / Deployment** ghi lại, khi có: ngày xuất bản hoặc phát hành thực tế · kênh · thị trường · URL, file hoặc tham chiếu artwork · phiên bản đã xuất bản · người chịu trách nhiệm · ngày thu hồi hoặc thay thế. Với bao bì in, sự kiện tương đương có thể là **Release to Print**.
- **(e)** Content owner được đề xuất "No product claim or technical statement", nhưng **miễn trừ đó phải được một reviewer Technical hoặc Regulatory xác nhận trước khi release.**

**(Câu 36a) ⚠️ Claim cosmetic CÓ kích hoạt yêu cầu bằng chứng product-level** khi claim khẳng định một kết quả hoặc hiệu năng của thành phẩm — ví dụ được nêu: Moisturises · Hydrates · Softens · Improves appearance · Supports barrier function · Helps detangle · Reduces residue · Improves skin feel. Một phát biểu thuần ở mức thành phần chỉ được dựa vào bằng chứng thành phần khi nó được trình bày rõ ràng là phát biểu về thành phần và không ngụ ý rằng thành phẩm mang lại cùng kết quả đo được đó. 🆕 Thêm trường **Evidence basis required**: Finished-product evidence · Ingredient-level evidence · Formula/mechanism rationale · Consumer-perception evidence · Regulatory or compositional evidence · No performance claim · Combination of evidence types.

### Phần 6 — Sàng lọc nguyên liệu và an toàn (câu 5, 6, 23b, 31, 32)

**(Câu 5) ⚠️ Option (b).** Gate 7 đòi hỏi một **đánh giá restricted-and-caution tổng quát cho MỌI sản phẩm**. Đánh giá Pregnancy/Breastfeeding Caution là một *lớp điều kiện bổ sung*. Phạm vi áp dụng của từng màn hình:

| Màn hình sàng lọc | Áp dụng cho |
|---|---|
| Prohibited / restricted / caution tổng quát | **Mọi sản phẩm** |
| Maternal caution | Sản phẩm cho thai kỳ / cho con bú / sau sinh |
| Infant / Baby Safety | Sản phẩm Infant 0+ |

Khi cả hai bối cảnh sử dụng cùng được chọn thì cả hai luồng maternal và infant đều áp dụng.

**(Câu 6) ⚠️ Gate 4 vừa sàng lọc *vừa disposition* mọi ứng viên liên quan**, nhưng không đòi hỏi phần đóng an toàn cuối cùng vốn dành cho Gate 7. Mỗi dòng được phân loại vào một trong: No issue identified · Needs Safety Review · Needs Regulatory Review · Prohibited — remove · Considered — not selected · Further information required. **Gate 4 không được pass khi còn dòng chưa được đánh giá.** Gate 4 được phép Proceed with Conditions khi vấn đề được đánh giá là non-critical **và** một reviewer đủ năng lực đã ghi kết luận sơ bộ **và** có một controlled action được liên kết **và** không vi phạm nguyên liệu cấm hay hạn chế bắt buộc nào. Sau đó **Gate 7** phải đóng chính thức mọi vấn đề restricted hoặc caution liên quan tới công thức cuối.

**(Câu 23b) Yêu cầu của ta là đúng, kèm các đường phủ được chấp nhận.** Ở Gate 7 mọi thành phần trong công thức cuối phải có một safety disposition, nhưng tá dược rủi ro thấp không cần mỗi thứ một monograph dài. Được phép: đánh giá riêng từng thành phần · tham chiếu tới một đánh giá thành phần đã được duyệt · đánh giá theo nhóm hoặc theo lớp khi có căn cứ khoa học · tham chiếu tới một kết luận regulatory/safety đã được chấp nhận. **Mỗi dòng công thức phải cho thấy nó đã được phủ và được liên kết tới đánh giá tương ứng**, và các thành phần trong hỗn hợp, tạp chất cùng dư lượng liên quan cũng phải được đánh giá khi cần.

**(Câu 31) Năm trên sáu ý được xác nhận đúng như đã xây** — mọi dòng trong sổ nguyên liệu ứng viên phải được disposition trước khi Gate 4 pass (a) · "Considered — not used in this formula" được giữ lại và bản ghi không bị xoá (b) · đường có điều kiện chính là Proceed with Conditions kèm một controlled action liên kết, không cần trường phê duyệt trùng lặp riêng, với điều kiện dòng đó chứa kết luận của reviewer đủ năng lực, người duyệt gate có thẩm quyền, và điều kiện cùng action được nêu tường minh trong quyết định gate (c) · một nguyên liệu được chấp nhận có điều kiện mà *có trong công thức cuối* phải được đóng hoàn toàn trước khi Gate 7 phê duyệt an toàn cuối cùng, còn nguyên liệu *không dùng* thì có thể đóng bằng "Considered — not used" (d) · **Gate 4 không được Proceed khi mọi ứng viên đều bị loại** — phải còn ít nhất một hướng phù hợp hoặc phù hợp có điều kiện, nếu không dự án phải Hold hoặc Backtrack về khâu tìm nguồn nguyên liệu (e).

**⚠️ (f) đổi cách đọc của ta:** ở Gate 7, 10 và 11, chặn cứng chỉ áp cho nguyên liệu **thực sự có trong công thức hiện tại**. Nguyên liệu đã được disposition chính thức là không dùng thì không được chặn các gate đó; một ứng viên ngoài công thức còn dở dang có thể sinh **cảnh báo** nhưng không nên chặn việc release khi sản phẩm không dựa vào nó.

**(Câu 32) Vết reviewer của watch-list.**

- **(a) ⚠️ "Flagged" gồm ba status**, không phải hai như ta đã làm: *REVIEW — possible formula match* · *Needs Safety Review* · *Needs Regulatory Review*. **Prohibited — remove** vẫn là một chặn cứng trực tiếp riêng.
- **(b) ⚠️ Resolution status** = Open · Under Review · Action Pending · Verification Pending · Closed, kèm một trường đánh giá riêng ghi kết quả là Critical, Non-critical, Not a true match hay Further information required.
- **(c)** Việc ghi Proceed with Conditions **có thể đóng vai trò authorised acceptance** khi đánh giá của reviewer đủ năng lực đã hoàn tất, có lý do và bằng chứng, có một controlled action hợp lệ được liên kết, và **người duyệt gate có thẩm quyền Safety hoặc Regulatory tương ứng**. Không cần một bước acknowledgement trùng lặp riêng.
- **(d)** Một dòng flagged chưa được đánh giá **phải chặn cả Proceed lẫn Proceed with Conditions** — đúng như đã xây.
- **(e) 🆕** Sổ Pregnancy/Breastfeeding Caution dùng **cùng bộ trường vết reviewer** cho các phát hiện bị flag.
- **(f)** Action liên kết được phép thuộc Gate 4 **hoặc một gate sau** khi phù hợp về mặt vận hành. Nó phải link ngược về phát hiện gốc · có owner và hạn hoàn thành · **vẫn hiển thị ở gate gốc** · và đến hạn trước gate nơi bắt buộc phải đóng hoàn toàn. **Một phát hiện critical không được hoãn sang gate sau.**

### Phần 7 — Luồng Infant & Baby Safety (câu 1 và 25c)

**Compartment 3 được giữ làm phần đánh giá Infant & Baby Safety cốt lõi ở Gate 7, nhưng nó là *cấu phần cuối cùng* của một luồng rộng hơn trải nhiều gate — không phải toàn bộ luồng.** Các kiểm soát INF-01 đến INF-08 hiện có vẫn phù hợp.

| Gate | Phải có |
|---|---|
| **2** — bối cảnh sử dụng cho trẻ | Tuổi tối thiểu dự kiến theo tháng · dùng trực tiếp cho trẻ, tiếp xúc gián tiếp hay cả hai · leave-on hay rinse-off · vùng cơ thể · tần suất và lượng dùng · dùng vùng tã, mặt, vùng mắt hay da đầu · khả năng phơi nhiễm tay-miệng · khả năng nuốt phải do vô ý · có thể dùng trên da tổn thương hay không · người chăm sóc dùng hay bôi trực tiếp lên trẻ |
| **4** — độ phù hợp của thành phần và nguyên liệu | Đánh giá độ phù hợp cho trẻ với từng thành phần đề xuất · rà soát nguyên liệu bị hạn chế và bị cấm · rà soát hương liệu, tinh dầu và chất gây dị ứng · rà soát tạp chất, chất nhiễm và dung môi tồn dư · rà soát rủi ro kim loại nặng và vi sinh khi liên quan · cân nhắc an toàn đường miệng khi có khả năng phơi nhiễm tay-miệng · đánh giá phơi nhiễm mắt khi tiếp xúc mắt là có thể lường trước · link bằng chứng nhà cung cấp |
| **5** — đánh giá ở cấp công thức | Nồng độ thành phần cuối cùng · pH công thức và độ tương thích với da trẻ · chiến lược bảo quản và bảo vệ vi sinh · đánh giá phơi nhiễm và lập luận biên an toàn điều chỉnh cho trẻ · sản phẩm phân huỷ tiềm tàng hoặc tương tác giữa các thành phần · kiểm soát quá trình cần thiết để giữ chất lượng và an toàn của thành phần · liều hoặc lượng dự kiến mỗi lần dùng |
| **6** — bao bì và hướng dẫn | Phân liều phù hợp · kiểm soát việc lấy ra quá nhiều khi liên quan · rủi ro trẻ tự lấy được hoặc nuốt phải · nắp và bao bì phù hợp · hướng dẫn về độ tuổi và cách dùng · cảnh báo bắt buộc · hướng dẫn để người chăm sóc dùng an toàn |
| **7** — đánh giá cuối | Hoàn tất INF-01 đến INF-08, trong đó phải bao gồm hoặc link tới: bối cảnh tiếp xúc với trẻ · phơi nhiễm và biên an toàn điều chỉnh cho trẻ · phơi nhiễm tay-miệng hoặc đường miệng ngoài ý muốn · sàng lọc chất gây mẫn cảm và dị ứng cho trẻ · độ tương thích hàng rào da và pH · đánh giá an toàn mắt khi áp dụng · kết luận cuối về mục đích sử dụng và độ phù hợp theo tuổi · claim, nhãn và wording PIF đã duyệt · xác nhận rủi ro vi sinh và chất bảo quản đã được xử lý · xác nhận không còn vấn đề an toàn nghiêm trọng nào cho trẻ đang mở |
| **8–9** — kiểm nghiệm và thẩm định | Kích hoạt theo bối cảnh sử dụng và rủi ro: dung nạp da · an toàn mắt · hiệu lực chất bảo quản · chất lượng vi sinh · độ ổn định · tương thích bao bì · kiểm nghiệm trong sử dụng hoặc trên người tiêu dùng khi phù hợp |
| **10** — PIF và claims | Kết luận an toàn khi dùng cho trẻ · các đánh giá thành phần và công thức liên quan · báo cáo kiểm nghiệm áp dụng · phát biểu về độ tuổi và cách dùng đã duyệt · bằng chứng hỗ trợ các claim liên quan tới trẻ · cảnh báo và hướng dẫn trên nhãn |

> **Chặn cứng:** Gate 7 phải chặn cứng nếu luồng Infant 0+ được kích hoạt mà đánh giá này chưa hoàn tất.

**(Câu 25c)** Family use không tự động nghĩa là nhóm dân số dễ tổn thương, **nhưng phải yêu cầu xác nhận các nhóm tuổi thực tế được bao gồm; nếu có trẻ sơ sinh hoặc trẻ nhỏ thì luồng tương ứng được kích hoạt.** Dùng vùng kín kích hoạt một đánh giá chuyên biệt về vị trí sử dụng và an toàn, nhưng không tự động nghĩa là người dùng thuộc nhóm dễ tổn thương. Người bơi lội không đương nhiên tạo thành một nhóm dân số dễ tổn thương.

### Phần 8 — Vòng đời theo thị trường và hậu thị trường (câu 2, 10, 13, 14, 15, 35)

**(Câu 2) Một phiên bản công thức cũ không tự động đóng khi bản thay thế được phê duyệt launch.** Các trạng thái: Active · Transition Approved · Transition in Progress · Superseded · Withdrawn · Cancelled. Việc phê duyệt bản mới đưa bản cũ vào **Transition in Progress**, không phải Superseded. Bản cũ chỉ trở thành Superseded sau khi một người có thẩm quyền xác nhận, **cho thị trường liên quan**: phiên bản công thức thay thế · ngày chuyển tiếp có hiệu lực · ngày sản xuất hoặc xuất xưởng cuối cùng của bản cũ · phương án xử lý tồn kho hoặc bán hết · trạng thái thông báo hoặc đăng ký với cơ quan quản lý · chuyển tiếp artwork và bảng thành phần tương ứng · cập nhật PIF / Product Master File · truyền thông cho Sales và Marketing · truyền thông bắt buộc cho nhà phân phối hoặc khách hàng, nếu có · xác nhận sẽ không còn lô nào được xuất xưởng theo bản cũ trừ khi được cho phép riêng.

> **Quyết định supersession phải do một người ghi lại — hệ thống không bao giờ được tự suy ra.**

**(Câu 14) Trạng thái launch được xét theo từng thị trường.** Một sản phẩm được coi là đã launch tại một thị trường khi **ngày launch thương mại thực tế của thị trường đó được ghi lại.** Trạng thái cấp dự án: Not launched · Partially launched · Launched in all active markets · Market transition in progress · Withdrawn. Ngày post-market review chạy riêng theo ngày launch thực tế của từng thị trường, và **việc thị trường đầu tiên launch không được khiến mọi thị trường khác bị coi là đã launch.**

**(Câu 13) Kỳ review sau launch theo lịch dùng ngày launch thương mại thực tế** của thị trường liên quan. Lịch khuyến nghị của công ty: **một tháng** — review sớm cho sản phẩm dành cho trẻ, thai kỳ/cho con bú, vùng kín, vùng mắt hoặc thuộc diện giám sát tăng cường · **ba tháng** — kỳ review chuẩn đầu tiên sau launch cho mọi sản phẩm · **mười hai tháng** — review hậu thị trường đầy đủ · **hằng năm sau đó** chừng nào sản phẩm còn được bán. Phải review sớm hơn nếu có biến cố bất lợi đáng kể, xu hướng khiếu nại, yêu cầu từ cơ quan quản lý hoặc tín hiệu chất lượng; lịch này cấu hình được khi một sản phẩm hoặc thị trường cụ thể cần chu kỳ khác.

**(Câu 10) ⚠️ Danh sách 16 option hiện tại trộn nguồn, loại vấn đề và hành động — nên tách ra:**

- **Feedback source:** Consumer · HCP · Distributor · Retailer · Sales · Social media · Customer service · Regulator · Internal Quality or Manufacturing.
- **Issue type:** Safety or adverse event · Product performance · Claim or communication question · Packaging issue · Formula issue · Quality issue · FAQ or education requirement · Product optimisation opportunity.
- **Resulting action:** PMS review · CAPA · Change Control · FAQ update · Product optimisation · No further action.

Feedback từ HCP, nhà bán lẻ, sales và mạng xã hội **đều tính là market feedback**. Ánh xạ tối thiểu nếu vẫn dùng danh sách hiện tại — *market feedback:* consumer / HCP / distributor / retailer / sales / social-media feedback, complaint, claim question, FAQ update khi sinh ra từ phản hồi bên ngoài; *product-performance feedback:* consumer / HCP / distributor / retailer feedback liên quan tới hiệu năng, complaint liên quan tới hiệu năng, packaging issue, formula issue, quality issue, claim question về hiệu năng thực tế, product optimisation; *PV/PMS review:* adverse event hoặc PV signal, PMS trend, complaint có yếu tố an toàn, consumer / HCP / social-media feedback được gắn cờ là vấn đề an toàn tiềm tàng.

> **CAPA là một hành động kết quả, không phải một nguồn feedback.** Packaging issue đóng góp vào review về hiệu năng sản phẩm và market feedback khi phù hợp.

**(Câu 15) ⚠️ Product-performance feedback nên là Conditional, không phải Supporting.** Nó trở thành bắt buộc khi hiệu năng nằm trong phạm vi kỳ review theo lịch · có khiếu nại hoặc câu hỏi liên quan tới hiệu năng · một vấn đề công thức, bao bì hoặc chất lượng ảnh hưởng tới hiệu năng · có lo ngại về hiệu lực hoặc về hiệu năng của claim · có đề xuất tối ưu sản phẩm. Với market feedback, dùng **hai khái niệm riêng biệt** thay vì đổi tier của một bản ghi theo thời gian: **Continuous Market Feedback Capture — Supporting** (có sẵn suốt vòng đời) và **Scheduled Market Feedback Review — Conditional** (bắt buộc khi đã tới mốc review sau launch tương ứng hoặc khi xuất hiện tín hiệu liên quan).

**(Câu 35) ⚠️ Dùng hai bộ giá trị riêng**, không dùng lại bộ sẵn có như ta đã làm:

- *Checklist work status:* Not Started · In Progress · Awaiting Information · Complete · On Hold · Blocked · N/A — rationale required.
- *Regulatory approval:* Pending · Approved · Approved with Conditions · Not Approved · Withdrawn · N/A — rationale required.

Một thị trường nhập là **"Other — specify" thì phải ghi thêm quốc gia hoặc khu vực pháp lý thực tế**; chừng nào thị trường chưa được nêu tên và loại dossier chưa được xác định thì bản ghi là chưa đầy đủ và **phải chặn Gate 10**. Phải có đủ sáu trường (applicable market · required dossier type · owner · checklist hoặc evidence link · status · Regulatory approval), và khi dùng N/A thì phải ghi thêm lý do **và reviewer có thẩm quyền**.

### Phần 9 — Thu thập dữ liệu ở Gate 1 và Gate 2 (câu 20, 21, 22, 23a, 24, 25)

**(Câu 20) ✅ Xác nhận đúng y như đã xây — không đổi gì.** Các trường là tuỳ chọn khi dự án mới được tạo và bắt buộc trước khi Gate 1 pass. Một dự án có thể được mở với tên hoặc mã tạm · người tạo · ngày · owner ban đầu; sau đó Gate 1 mới đòi thông tin thực chất về cơ hội và yêu cầu.

**(Câu 21) ⚠️ Với requirements của dự án, dùng Must / Should / Could.** Mức độ nghiêm trọng vẫn là khái niệm về *rủi ro*, không phải giá trị ưu tiên của requirement. 🆕 **Thêm "N/A kèm lý do" làm một disposition hợp lệ.** Trước khi Gate 2 pass: mọi dòng phải được rà soát · mọi dòng có áp dụng phải được hoàn thành hoặc hoãn chính thức · mọi dòng không áp dụng phải được đánh N/A kèm lý do · **mọi requirement Must phải hoàn tất** · requirement Should hoặc Could chỉ được hoãn qua Proceed with Conditions, kèm owner và hạn hoàn thành. Dòng *Must-have product requirements* luôn luôn bắt buộc; các dòng khác trở thành bắt buộc tuỳ phạm vi dự án. **Hệ thống không được bắt người dùng đánh Completed cho một requirement trống.**

**(Câu 22)** (a) ✅ bố cục dạng bảng được chấp nhận — nó cung cấp các trường owner, status, evidence và rationale. (b) ⚠️ một dự án **được phép** mang nhiều hơn một loại phát triển/thay đổi, nhưng **phải chỉ định một loại là Primary**, các loại còn lại ghi là thứ cấp. (c) ⚠️ giá trị owner/function: *Request Origin / Source* → **Requesting Function / Project Owner** (tốt hơn là luôn ghi Sales — một yêu cầu có thể xuất phát từ Regulatory, Quality, Manufacturing, Management hay bộ phận khác); *Development / Change Type* → **NPD / Project Owner**. (d) ✅ tên "Development / Change Type" được chấp nhận. (e) ✅ năm trường free-text giữ nguyên ở khối *Opportunity & Request — Gate 1* riêng và **không** đưa vào bảng Project Identification.

**(Câu 23a) 🆕** Gate 2 đòi ít nhất một product type hoặc trạng thái dạng bào chế, nhưng dạng cuối cùng chính xác có thể chính đáng còn bỏ ngỏ. **Thêm option "Product form under evaluation — to be confirmed by Gate 5"**, để một brief giai đoạn sớm kiểu "sản phẩm bảo vệ da cho trẻ — cream hay balm sẽ quyết định sau" vẫn qua được Gate 2 kèm một controlled action.

**(Câu 24) ⚠️ Dùng tham số Countries / Markets sẵn có làm nguồn sự thật duy nhất và bỏ trường free-text *Initial target market* riêng.** Tham số Countries / Markets **không bắt buộc để tạo dự án ban đầu** nhưng trở thành bắt buộc trước khi Gate 1 pass. Trường *Initial target user / life-stage* được giữ lại, vì nó không trùng với trường nào khác.

**(Câu 25)** (a) ✅ cả năm cặp đổi tên đều đúng. (b) ⚠️ **Da khô đơn thuần không nên tự động là nhóm dễ tổn thương; da dễ chàm hoặc da tổn thương thì có.** Nếu được thì tách option gộp thành *Dry skin* và *Eczema-prone or compromised skin*; nếu không tách được thì coi option gộp là kích hoạt phần review da nhạy cảm/tổn thương. (c) xem Phần 7. (d) ✅ cách xử lý hai chiều của ta được xác nhận: mâu thuẫn nguyên văn thì từ chối thẳng, còn với nhóm đã đổi tên hoặc rộng hơn thì **cảnh báo kèm lý do là cách tốt hơn từ chối hẳn**, vì reviewer Safety/Regulatory có thể nhận ra bối cảnh đó một cách độc lập.

### Phần 10 — Các trường đánh giá tường minh (câu 8, 9, 11, 12, 16)

Mỗi câu dưới đây thêm một trường mà giá trị "chưa đánh giá" của nó gây chặn — đúng cơ chế định nghĩa ở Phần 1.

**(Câu 8) 🆕 Change Control required? → Yes / No / Pending assessment**, kèm reviewer · review date · rationale · Change Control ID liên kết (khi Yes) · evidence hoặc link hỗ trợ. Nếu **Yes**, phải link tới một bản ghi Change Control hợp lệ; nếu **No**, phải ghi lý do và reviewer; **Pending assessment phải chặn việc đóng phát hiện hậu thị trường.** *"Cách này tốt hơn chỉ dựa vào một lời nhắc."*

**(Câu 9) 🆕 Human-participant study planned? → Yes / No / Undecided.** Được rà soát ở Gate 8, và cũng có thể nêu sớm hơn qua kế hoạch claim/bằng chứng. **Việc tạo một Study Protocol tự động đặt câu trả lời thành Yes.** Khi là Yes: luồng phê duyệt study chuyên biệt trở thành bắt buộc · không được tuyển người tham gia trước khi được duyệt · không được kiểm nghiệm hay thu thập dữ liệu trước khi được duyệt · thông tin cho người tham gia, đồng thuận, quyền riêng tư và yêu cầu quản lý dữ liệu phải đầy đủ. **Undecided phải ngăn Gate 8 đóng lại.**

**(Câu 11) ⚠️ Không loại nào trong sáu loại dự án tự động là hành chính.** Một thay đổi bao bì, cải tiến vòng đời hay tái công thức đều có thể có ý nghĩa lớn về kỹ thuật và thương mại. 🆕 **Thêm phân loại "Administrative-only change: Yes / No"**, do một reviewer có thẩm quyền xác nhận. Ví dụ thuần hành chính: sửa mã tham chiếu nội bộ · cập nhật link file · sửa lỗi chính tả không làm đổi nghĩa · sửa định dạng · cập nhật thông tin liên hệ · cập nhật metadata tài liệu · thay tài liệu nhà cung cấp khi bản thân nguyên liệu không đổi. **Một dự án chỉ được miễn competitor/benchmark review khi nó được xác nhận là thuần hành chính *và* không có thay đổi nào về claim, công thức, định vị thị trường, hiệu năng sản phẩm, chức năng bao bì hay ý nghĩa hướng tới khách hàng.**

**(Câu 12) ✅ Một thay đổi công thức được phân loại Major cũng tính là major reformulation cho trigger scale-up ở Gate 9.** Các vùng ảnh hưởng kích hoạt review scale-up hoặc pilot: thành phần công thức · nồng độ hoạt chất hoặc chất bảo quản · nhà máy sản xuất · loại hoặc quy mô thiết bị · cỡ lô · thứ tự thêm liệu · tốc độ hoặc thời gian khuấy · đồng hoá · biểu đồ gia nhiệt hoặc làm nguội · nhiệt độ tối đa · thời gian giữ · tiền xử lý hoặc ngâm nở thành phần · phương pháp chuyển liệu · phương pháp chiết rót · chất lượng nước hoặc nguồn nước công nghệ · phụ trợ quá trình · giao diện bao bì/chiết rót · **bất kỳ thay đổi nào được Manufacturing, Quality hoặc R&I nhận định là có thể ảnh hưởng tới hiệu năng sản phẩm.** 🆕 **Thêm "Scale-up risk identified? → Yes / No / Pending assessment"** kèm mô tả rủi ro · người đánh giá · ngày đánh giá · lý do · hoạt động pilot hoặc scale-up cần thiết · evidence link. **Pending assessment phải chặn readiness của Gate 9.**

**(Câu 16) 🆕 Khi hệ thống xác định được từ dữ liệu có kiểm soát rằng một điều kiện không áp dụng, nó được phép tự sinh lý do N/A** — ví dụ được nêu: không chọn người dùng thuộc nhóm thai kỳ/cho con bú · công thức đã xác nhận là khan · không có yêu cầu bao bì đặc thù theo thị trường nào. **Với các mục thuộc diện safety-, regulatory-, claims- hoặc release-critical, lý do do hệ thống sinh vẫn phải được reviewer chịu trách nhiệm xác nhận trước khi đóng gate**; với mục Supporting thì lời giải thích do hệ thống sinh là đủ. *"Không nên bắt người dùng gõ lại một lý do mà hệ thống đã sinh ra một cách xác định."*

### Vòng này làm thay đổi gì trong ứng dụng

**Phải làm lại hành vi đã ship (khoảng 20 chỗ).** Lớn nhất là: engine trigger chuyển sang ba trạng thái (7) · màn hình restricted/caution ở Gate 7 tách thành ba lớp (5) · Gate 4 đòi mọi dòng phải được disposition (6) · ba bộ từ vựng severity/status hội tụ về một thang bốn mức và một vòng đời (3, 32b, 33, 34) · chặn cứng nguyên liệu thu hẹp về đúng nguyên liệu trong công thức ở Gate 7/10/11 (31f) · claim cosmetic kích hoạt bằng chứng product-level (36a) · cột priority của Phase 1 chuyển sang Must/Should/Could (21) · bỏ trường thị trường ban đầu bị trùng (24) · tách option target-user Dry / eczema-prone (25b) · cả hai giá trị owner/function của Gate 1 (22c) · danh sách nguồn feedback tách thành ba (10) · tier feedback ở Gate 12 (15) · hai bộ giá trị của checklist regulatory theo thị trường (35).

**Xây mới, lớn nhất trước:** chữ ký 3 vai trò theo từng gate kèm ảnh chụp bằng chứng phạm vi gate, khoá theo thị trường ở Gate 10–11 (18, 29) · luồng Infant & Baby Safety trải Gate 2, 4, 5, 6, 7, 8–9 và 10 (1) · ba tập dữ liệu tham chiếu cấp công ty có kiểm soát — Claims Library, Raw Material Risk Overlay, market profile của Regulatory (28, 17, 4) · mô hình revision của claim kèm liên kết artwork và bản ghi publication (26, 30) · ngày launch, quyết định supersession và lịch review theo từng thị trường (2, 13, 14) · năm trường đánh giá tường minh (8, 9, 11, 12, 16).

**Được xác nhận là đã đúng, không phải đổi gì ngoài việc gỡ tag giả định:** thời điểm bắt buộc của các trường Gate 1 (20) · mô hình khai báo claim và thời điểm sinh Claim ID (19a/c/e/f) · sổ traceability mở suốt tới Gate 10–11 (26) · năm trường Regulatory review và bốn giá trị outcome (27a/b) · bốn quyết định về liên kết claim (30a) · năm trên sáu cách đọc về import stub (31a–e) · quy tắc về dòng chưa đánh giá và bằng chứng đóng của safety finding (33d/e) · phép kiểm hai chiều về nhóm dễ tổn thương (25a/d) · hai yêu cầu Gate 2 product-type và Gate 7 safety-matrix mà ta tự thêm (23) · Major = major reformulation (12).

**Thứ tự build mà điều này hàm ý** được trình bày trong `docs/plans/Round4_Implementation_Roadmap.md`: engine trigger ba trạng thái và các bộ từ vựng dùng chung phải xong trước, vì mọi nhóm sau đều ngồi trên chúng.

---
## Đầu vào còn cần cho triển khai (21/07/2026)

Các **câu hỏi về quy tắc đã đóng** (chỉ F12 còn chờ Cosmetri). Việc còn lại là **cung cấp dữ liệu/nội dung** mà các đáp án nay yêu cầu — đây là đầu vào cần thu thập, không phải quyết định cần chốt:

- **F1/C7** — ánh xạ mỗi mục theo gate ở trên vào register/field cụ thể trong app và vào điều kiện trigger (register nào là Mandatory vs Conditional vs Supporting cho từng gate).
- **F3** — dataset watch-list được kiểm soát thực tế (số CAS thật theo từng nhóm nguyên liệu) do Regulatory & Safety xây/duy trì.
- **F6** — lưới quyền chi tiết vai trò × gate/section/register, cùng ánh xạ thuộc tính SSO/AD thực (nhóm AD nào → vai trò/phòng ban MBc360 nào).
- **F10** — nội dung checklist cụ thể theo từng Market Dossier Profile (mục EU CPSR, Úc, Mỹ, …) do Regulatory cung cấp.
- **F11** — nội dung Published Product Information Guideline / Claims Library (từ ngữ đã duyệt, bằng chứng bắt buộc theo claim).
- **F12** — Cosmetri xác nhận độ phủ compliance ASEAN/Việt Nam (phụ thuộc bên ngoài).

**Cập nhật (07/08/2026):** dòng F1/C7 ở trên nay về cơ bản đã được giải quyết — Phụ lục 2 cung cấp điều kiện trigger cho từng mục và các trường còn thiếu, nên phần ánh xạ không còn phải chờ đội chuyên môn nữa. Những gì Vòng 3 **bổ sung** vào danh sách này, vẫn là nội dung chứ không phải quyết định:

- **B7 / C1 / F11** — nội dung **Claims Library** đã duyệt trở thành phụ thuộc nặng hơn trước: trigger regulatory review ở Gate 3 có một vế là "từ ngữ không nằm trong Claims Library đã duyệt", không thể đánh giá được khi thư viện đó chưa tồn tại.
- **A3** — các điều kiện trigger tham chiếu tới thuộc tính sản phẩm/công thức mà app chưa ghi nhận (loại dự án/loại thay đổi, mức nhạy cảm vi sinh, rủi ro thành phần nguyên liệu). Việc lưu chúng thành trường mới hay suy ra từ dữ liệu sẵn có là phần thiết kế của ta; *quy tắc* thì đã chốt.
- **E2** — về bản chất không khác F10, nhưng nay có thêm yêu cầu tạm thời: một bản ghi Regulatory Checklist Status cho thị trường ngoài ASEAN, để mục này không bao giờ ở trạng thái không được enforce.


**Cập nhật (24/08/2026):** Vòng 4 giải quyết thêm ba mục trong danh sách này, và biến mục thứ tư thành việc phải xây thay vì nội dung phải xin:

- **F2** — nội dung luồng Infant & Baby Safety **nay đã được cung cấp** (Phụ lục 3, Phần 7). Nó không phải một workflow riêng gắn thêm vào Gate 7, mà là một luồng trải Gate 2, 4, 5, 6, 7, 8–9 và 10, với Compartment 3 là cấu phần cuối cùng.
- **F11 / B7 / C1** — **Claims Library nay đã được đặc tả** (Phụ lục 3, Phần 4): cấp công ty, Technical **và** Regulatory cùng duyệt từng entry, dự án đọc nhưng không bao giờ sửa, kèm hành động thăng hạng có kiểm soát "Propose for Claims Library". *Nội dung* của nó vẫn còn phải điền, nhưng hình dạng thì không còn là câu hỏi mở, và một claim của dự án không có entry thư viện nay được cho phép tường minh dưới dạng "New claim — not yet in Claims Library".
- **F10 / E2** — nội dung checklist theo thị trường được giải quyết **một phần**. Câu 35 chốt hai bộ giá trị và cách xử lý "Other — specify"; **market profile cấu hình được** của câu 4 là nơi lưu loại dossier bắt buộc theo từng thị trường. Các mục checklist cụ thể theo thị trường (EU CPSR, Úc, Mỹ) vẫn là nội dung Regulatory phải cung cấp.
- **F3** — không đổi với tư cách một yêu cầu về dataset, nhưng câu 17 thêm một yêu cầu liền kề: một **Raw Material Risk Overlay** dùng chung, khoá theo raw-material ID của Cosmetri, mang mười một phân loại rủi ro thành phần mà API Cosmetri không cung cấp. Giống các watch-list, đây là dữ liệu có kiểm soát do Technical, Safety và Regulatory duy trì — không phải thứ một dự án tự nhập.
## NPD Front-End Roadmap (workbook v2, 24/07/2026)

**Trạng thái:** ✅ Đã xác nhận. File `MBc360 Master Product Development System File v2.xlsx` do chính đội ngũ chuyên gia biên soạn, được coi là nguồn đã xác nhận sẵn — có giá trị ngang với workbook gốc — nên không cần thêm vòng xác nhận nào nữa cho các quy tắc dưới đây.

**Nội dung bổ sung:** một quy trình khoa học đầu-vào bắt buộc gồm 4 bước, mọi sản phẩm mới phải hoàn thành theo đúng thứ tự trước khi công thức bị khóa ở Gate 5:

1. **Nhu cầu & Cơ sở khoa học (Needs & Scientific Basis)** — nhu cầu thể chất, cảm xúc, của người chăm sóc và hệ quả thiết kế, kèm câu hỏi nghiên cứu và phương pháp tra cứu tài liệu. Gate ký duyệt: **Gate 02**.
2. **Bối cảnh cạnh tranh (Competitor Landscape)** — sản phẩm đối thủ đã mua và kiểm nghiệm thực tế, so sánh thử nghiệm và phân tích giải pháp hiện có/tiêu chuẩn chăm sóc hiện tại. Gate ký duyệt: **Gate 03**.
3. **Hồ sơ sản phẩm mục tiêu & Công nghệ nền (Target Product Profile & Backbone Technology)** — một định nghĩa thống nhất về "thành công" của sản phẩm, cùng công nghệ nền đề xuất và lý do vượt trội so với thị trường. Phải **hoàn tất trước khi khóa công thức (Gate 05)**.
4. **Kế hoạch bằng chứng & Hỗ trợ tuyên bố (Evidence Plan & Claim Support)** — kế hoạch chứng minh (chỉ số đo, đối chứng, tiêu chí đạt/không đạt) phải được thống nhất **trước khi** khóa công thức (Gate 05); quy trình test chi tiết hoàn tất khi đã có sản phẩm mẫu (Gate 08).

**Cách thực thi:** Formula BOM (Gate 05) giờ bị chặn cứng — giống cách một sign-off an toàn còn thiếu đã chặn gate từ trước — cho tới khi Bước 1-3 hoàn tất và ký duyệt, và kế hoạch bằng chứng của Bước 4 đã được ghi nhận. Gate 02, 03 và 08 mỗi gate cũng có thêm điểm kiểm tra sớm tương ứng với bước của mình, để vấn đề được phát hiện sớm nhất có thể thay vì chỉ tới cuối cùng mới lộ ra.

**Cập nhật (27/07/2026) — nay đã chặn cứng, nhưng đây là quyết định của chủ dự án/dev, chưa đưa cho đội SME xác nhận — xem câu hỏi mở tương ứng ở `F1_Per_Gate_Open_Questions.md` (mục Gate 3) để biết chính xác thiết kế đang chờ xác nhận:** sheet nguồn cũng nêu rằng không tuyên bố (claim) nào được xuất hiện trên bao bì, tài liệu HCP hay tài liệu bán hàng nếu chưa có "Claim ID" đã duyệt lưu hồ sơ — cùng ý với rule của Gate 3: *"claim có thể vẫn đang phát triển, nhưng từ ngữ chưa có bằng chứng không được đánh dấu approved."* Trước đây điều này chỉ được theo dõi trên 1 register mà chưa chặn cứng, vì làm vậy phải sửa quy trình duyệt Published Information hiện có (F11). Nay đã làm: mỗi dòng trong Published Information Approval có thể liên kết (tuỳ chọn) tới 1 Claim ID cụ thể (Claim → Evidence Traceability); dòng đó không thể lưu ở trạng thái đã phát hành ("Approved for Release" / "Released") trừ khi claim đó đã có status "Supported". Dòng không gắn claim nào (ví dụ thông tin công ty thuần tuý) không bị ảnh hưởng. Được chặn ở cả app lẫn server, nên không thể lách qua bằng cách gọi thẳng API.

> **Đã có đáp án (07/08/2026) — xem Phụ lục 2, mục D2.** Đội chuyên môn xác nhận việc chặn release nhưng thay đổi 3 trong 4 lựa chọn thiết kế: gắn Claim ID trở thành **bắt buộc** với mọi phát ngôn về sản phẩm (chỉ tùy chọn với thông tin doanh nghiệp thuần túy), claim **Pending đang phát triển phải chọn được** (để ghi nhận sớm claim dự định dùng — chỗ chặn nằm ở thời điểm release, không phải lúc gắn liên kết), và fill-and-lock được thay bằng **từ ngữ master đã duyệt giữ song song với từ ngữ đề xuất theo kênh**, tương đương do reviewer xác nhận thay vì khóa cứng từng ký tự. Bản thân điều kiện chặn release cũng mở rộng: claim phải Supported **và** đã duyệt cho đúng SKU, formula version, thị trường và kênh.

## Ghi chú

- Nhóm A (kiến trúc dữ liệu) nên được xác nhận **trước tiên** vì ảnh hưởng trực tiếp tới thiết kế database — trả lời sai hướng ban đầu sẽ tốn công sửa lại sau. *(Tất cả follow-up nhóm A đã trả lời tính đến 21/07/2026 — F4, F5, F6, F14 đã chốt; F12 còn là phụ thuộc bên ngoài.)*
- Nhóm B và C là quy tắc nghiệp vụ có thể tinh chỉnh dần trong quá trình phát triển mà không nhất thiết phá vỡ kiến trúc, nhưng vẫn cần xác nhận sớm để tránh phải làm lại UI/logic đã xây.
- Đợt trả lời 16/07/2026 **đảo ngược 3 giả định nền của demo**: (1) pass gate phải đọc thêm sign-off, Next Actions và evidence registers — không chỉ Stage status + Gate decision; (2) backtrack không bao giờ được xóa dữ liệu — cần mô hình event-log/snapshot; (3) Gate 10–12 chuyển thành theo từng thị trường thay vì một luồng chung.
- Đợt trả lời 21/07/2026 bổ sung thêm 3 điểm **thay đổi demo**: (4) **nhiều version công thức song song** — thay đổi major giữ nguyên track thị trường đã đóng của version cũ và mở track mới theo từng thị trường (F4), đảo ngược giả định "market track cố định từ lúc tạo"; (5) **"Infant 0+" có workflow Infant & Baby Safety riêng**, tách khỏi Skincare for Two (F2); (6) dòng Formula BOM nhập tay phải được **đối chiếu về Cosmetri trước Gate 7**, và Gate 10/11 phải dùng formula Cosmetri được kiểm soát (F14).
- Đợt trả lời 07/08/2026 (Phụ lục 2) bổ sung 4 điểm **thay đổi demo** nữa: (7) **sign-off theo từng gate là e-signature 3 vai trò thật**, không phải Owner + Evidence link như ta đã làm (D1); (8) **gắn Claim ID là bắt buộc, claim Pending vẫn chọn được, và từ ngữ được so sánh chứ không khóa cứng** (D2); (9) **đánh giá thai kỳ/cho con bú ở Gate 7 là có điều kiện, không phải không điều kiện**, kèm pathway riêng cho trẻ sơ sinh (E1); (10) **Gate 10 và 11 chuyển sang theo từng thị trường**, nên một thị trường được duyệt không còn làm gate trông như đã sẵn sàng (E3a).
- Tài liệu tham chiếu: `MBc360 Master Product Development System File.xlsx` (55 sheets), bản demo ReactJS hiện tại (`mbc360-app/`), phản hồi đầy đủ ngày 21/07/2026 của bộ phận chuyên môn (`docs/rounds/2026-07-21-sme-reply-F1-F14.txt`), và phản hồi Vòng 3 ngày 07/08/2026 (`docs/rounds/2026-08-07-sme-reply-round3.txt`).
