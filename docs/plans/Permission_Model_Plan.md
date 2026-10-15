# Kế hoạch: mô hình phân quyền theo phân công dự án (chốt 14–15/10/2026)

Chủ dự án đã chốt toàn bộ nội dung dưới đây trong cuộc bàn ngày 14–15/10/2026. Đây là kế hoạch thi công; **chưa có gì trong này được xây**, trừ phần ghi "đã xây".

## 0. Mục tiêu

Thay cách phân quyền theo vai trò toàn hệ thống (Role Editor) cho mọi thao tác **bên trong dự án** bằng cách phân quyền theo **phân công của dự án**. Role Editor chỉ còn quản việc cấp dự án và các màn hình ngoài dự án.

Lý do: quyết định chuyên môn (Regulatory/Safety chấp nhận finding) được ghi tại trang nguồn bởi đúng người; ký gate/phase chỉ xác nhận readiness đã đạt, nên không cần bắt người ký mang quyền chuyên môn của từng finding.

## 1. Hai tầng quyền

| Tầng | Quản bằng | Phạm vi |
|---|---|---|
| **Hệ thống** | Role Editor (quyền theo vai trò) | Tạo/sửa/xóa/lưu trữ dự án; người dùng và vai trò; dữ liệu tham chiếu công ty (market profiles, RM risk, Claims Library); tích hợp |
| **Dự án** | Phân công | Mọi thao tác trong một dự án: sửa sổ, chỉ định và ký chữ ký gate/phase |

- Gỡ các quyền: `gate:SGxx|decide`, `phase:N|approve`, `market-track|approve`.
- Giữ sáu quyền `gate-signoff|represent-technical/regulatory/safety/quality` và `watchlist-finding|accept-safety/regulatory` với nghĩa mới: **"đủ tư cách" làm người đại diện chức năng / người chấp nhận finding của chức năng đó**. Chúng chỉ dùng làm **danh sách ứng viên** cho ô chọn người, không còn là quyền ký hay quyền thao tác.
- **Project Lead như Admin trong dự án của mình** (sửa mọi sổ, chỉ định ký). Quy tắc người Reviewed khác người Prepared vẫn giữ nên Lead không tự ký cả hai.
- Một người dùng giữ nhiều role: đã có sẵn từ 05/10/2026, không làm gì thêm.
- Việc tạo dự án vẫn mở cho mọi người dùng đã đăng nhập (đã chốt 26/07).

## 2. Sổ (mọi sổ, khoảng 82 sổ)

**Người được phân công** của một sổ trên một dự án = Review owner, Co-review, Co-sign của sổ (từ 13 vai nhập lúc tạo dự án; Project Manager tự động co-sign mọi sổ) + người được chọn làm **Reviewer** của một dòng (vào được dòng đó) + Lead + Admin.

- **Không** làm giao diện ghi đè phân công theo từng sổ (đã loại).
- **Trường thông tin đơn giản** (điền chữ, link bằng chứng…): mọi người dùng trong dự án đóng góp được. Khớp A4 của SME: *"Users may contribute evidence without having approval rights"*.
- **Trường quan trọng**: trạng thái, kết luận, quyết định, phê duyệt, Reviewer, cột ký, **thêm/xóa dòng**: chỉ người được phân công. Người khác chỉ đọc. Server từ chối (403, nêu lý do), giao diện làm mờ kèm lý do.
- Đánh dấu bằng cờ cấu hình cột `sensitive: true`. Khởi đầu: mọi cột select kiểu trạng thái/kết luận, Reviewer, cột ký, và thao tác thêm/xóa dòng.
- **Ba sổ không có Review owner** (đều thuộc System Guide & Reference): **MBC360 FEEDBACK miễn** (ai cũng thêm phản hồi); **Template_Index** và **Requirements** chỉ Lead và Admin.
- Cột **Owner (phòng ban)** của dòng giữ là ghi chú chỉ đọc cho biết bộ phận nào xử lý dòng đó (đã xây).
- **Reviewer của dòng** đổi từ "Record as me" thành **ô chọn người** trong hệ thống: người nhập dữ liệu của bộ phận khác chọn ai sẽ vào review. (Hiện hai watch-list đang để tự ghi tên mình; sẽ đổi.)

## 3. Chấp nhận finding watch-list

- Ghi **Reviewer assessment = Non-critical** hoặc **Further information required** (hai kết luận duy nhất cho phép mang finding theo điều kiện, theo D3) là việc chấp nhận. **Chỉ người được chọn ở Reviewer của dòng** ghi được.
- **Ô chọn Reviewer chỉ liệt kê người có role đúng chức năng của finding** (phương án b, đã chốt): chức năng lấy theo trạng thái flag (*Needs Safety Review* → Safety, *Needs Regulatory Review* → Regulatory), còn *possible formula match* theo cột Owner (SW-32); Owner nêu cả hai hoặc không nêu bên nào thì người có một trong hai role đều được. Server từ chối Reviewer không đủ tư cách, và từ chối người ghi kết luận khác người ở Reviewer.
- Lý do để chuyên môn ở finding chứ không ở chữ ký gate: một gate chứa nhiều finding thuộc nhiều chức năng, và người ký gate (kể cả người đại diện chức năng) chỉ bảo đảm một chức năng.
- Người ký Approved của gate **không** cần thẩm quyền watch-list.
- Phạm vi kiểm theo Linked gate, từ gate được gắn trở đi: **đã xây** (SW-33).
- Giao diện hai khối "1 · Recording the finding" và "2 · Handling the finding", thứ tự trường theo Excel: **đã xây**.
- Quy trình vẫn đúng: readiness và chữ ký người đại diện chức năng độc lập đến trước chữ ký duyệt; người duyệt là lớp xác nhận cuối.

## 4. Chữ ký gate và phase

- **Lead (hoặc Admin) chỉ định** ba chữ ký Prepared / Reviewed / Approved cho cả gate lẫn phase (như hiện nay).
- **Bảy gate quan trọng** (Gate 3, 4, 7, 8, 9, 10, 11) theo Round 4 câu 29(3)–(4): *"at least one reviewer or approver must also represent the relevant independent function"*. Chức năng: Gate 3 Technical và/hoặc Regulatory; Gate 4 và 10 Regulatory; Gate 7 và 8 Safety / Scientific Review; Gate 9 và 11 Quality.
- **Luồng giao diện chỉ định:**
  1. Ban đầu chỉ hiện khối **Người đại diện chức năng**: ô chọn người (chỉ người có role đúng chức năng) và ô chọn **Reviewed by** hoặc **Approved by**. Hai ô chọn người của Reviewed và Approved **chưa hiện**; mọi nút ký bị khóa kèm lý do.
  2. Lead chọn xong: bước được chọn hiện **tên người đại diện, khóa**, ghi "đại diện <chức năng>"; bước còn lại **hiện ô chọn người** tự do. Chọn người đại diện cho Approved thì Reviewed hiện ô chọn, và ngược lại.
  3. **Prepared by** chọn như hiện nay, loại người đại diện khỏi danh sách (không trùng); người Reviewed khác người Prepared.
  4. Đổi người đại diện hoặc đổi bước: bước vừa khóa quay về trống, bước còn lại giữ nguyên. Người đại diện **đã ký** thì phải rút chữ ký (có lý do) rồi mới đổi.
  5. Gate 3: người đại diện có role Technical hoặc Regulatory; muốn có cả hai thì chọn người thuộc chức năng còn lại ở bước còn lại, không bắt buộc.
- Khối ba chữ ký **bị khóa cho tới khi** khối đại diện được điền (giao diện **và** server).
- Lead tự chỉ định mình làm người đại diện được nếu có role đúng, miễn không trùng Prepared hoặc vi phạm "Reviewed khác Prepared".
- Gate 1, 2, 5, 6, 12 không có khối đại diện, giữ ô chọn người cho cả ba bước.
- Không có chữ ký thứ tư riêng; không cần quy tắc stale riêng cho người đại diện (họ là một trong ba chữ ký gate sẵn có).

## 5. Đóng sổ theo gate (phương án A)

- Mỗi gate có readiness **đọc** một sổ cần một chữ ký đóng (Review owner + Co-sign) cho **các cột mà gate đó đọc**; bản chụp băm chỉ các cột đó (dùng `registerColumnReads`).
- Mục readiness "sổ phải đóng" của gate đạt khi có chữ ký đó. Hiện chỉ yêu cầu ở gate **cao nhất** của sổ; sẽ đổi sang từng gate đọc.
- Rút chữ ký đóng, hoặc Backtrack, mở lại phần cột của gate đó. Khóa theo cột và theo gate (SW-5) giữ nguyên.
- **Chuyển dữ liệu cũ:** chữ ký đóng sổ hiện có (đóng cả sổ ở gate cuối) chuyển thành chữ ký đóng của **gate cuối đó**; các gate sớm hơn đọc cùng sổ ở trạng thái "chưa đóng" cho tới khi ký. Dự án đang ở gate sớm không bị ảnh hưởng.

## 6. Giao diện chữ ký và ghi nhận

- **Mọi chữ ký thật** (gate, phase, đóng sổ, chữ ký dòng) phải qua modal xem trước rồi mới tới mã authenticator. Đã đủ ở bốn loại hiện có.
- **Xác nhận lý do N/A tự sinh** và **xác nhận supersession công thức** chỉ là **ghi nhận**, không cần modal.
- Chỉ định người đại diện chức năng chỉ là ô chọn người (không ký, không modal).

## 7. Ghi chép và hỏi SME

- Cập nhật **SW-32** (thẩm quyền ở người đánh giá, Reviewer chọn người); thêm quy tắc phần mềm mới vào `Software_Rules.md` cho: hai tầng quyền, quyền theo phân công của sổ và cờ `sensitive`, khối đại diện chức năng, đóng sổ theo gate, quy tắc modal.
- Câu 9 Round 5: giữ **một dòng xác nhận** cho chỗ lệch chữ còn lại: SME viết *"the gate approver has the required Safety or Regulatory authority"* (Q32(c)) và *"only authorised approvers can sign Approvals"* (A4); ta hiểu "authorised" là người được Lead chỉ định và chuyên môn nằm ở người đánh giá. Chỗ đại diện chức năng **không còn lệch** nên không cần hỏi thêm.
- Gắn `[ASSUMPTION: R5-Qn]` cho từng chỗ lệch; không đánh số lại draft Round 5 cho tới khi rà soát xong (câu rút để khuyết số).

## 8. Giai đoạn thi công

| GĐ | Nội dung | Kiểm chứng |
|---|---|---|
| **1** (đã xây 15/10/2026) | Watch-list: Reviewer là ô chọn người, ứng viên theo role đúng chức năng của finding; chỉ người được chọn ghi Non-critical / Further information required; giữ `accept-*` làm danh sách ứng viên; cập nhật SW-32, câu 9 | `check`, `verify:readiness`, `verify:watchlist-authority`, thử API |
| **2** (đã xây 15/10/2026; các biểu mẫu trang phase chưa áp) | Cờ `sensitive` trên cột cấu hình; khóa mọi sổ theo phân công (server 403 + giao diện mờ); ba sổ ngoại lệ | `verify:freeze`, ca mới cho quyền theo sổ, thử API |
| **3** (đã xây 15/10/2026; `verify:e2e` chưa chạy lại) | Khối người đại diện chức năng ở bảy gate quan trọng; khóa khối ba chữ ký (giao diện và server); ứng viên theo role | ca mới trong `verify:e2e`, thử API |
| **4** | Đóng sổ theo gate (A): bản chụp theo cột, mục readiness, migration chuyển chữ ký đóng cũ | `verify:readiness`, `verify:scaffold`, `generate:column-reads`, `verify:e2e` |
| **5** | Gỡ `gate:decide`, `phase:approve`, `market-track|approve` khỏi seed và Role Editor; migration xóa quyền đã cấp; chạy `verify:e2e` đầy đủ | `verify:e2e` (DB riêng, khoảng 8 phút), `check`, `lint` |

Mỗi giai đoạn kết thúc bằng một commit riêng, chạy đủ bộ kiểm chứng của CLAUDE.md (build gốc, `verify:readiness`, `verify:scaffold`, `lint`, script gần nhất và một kiểm tra trực tiếp hành vi mới).

## 9. Rủi ro cần theo dõi

- GĐ 5 chạm Role Editor và dữ liệu quyền đã seed: cần migration và thử trên DB riêng trước.
- GĐ 2 áp lên toàn bộ ~82 sổ: cần danh sách cột `sensitive` được chủ dự án duyệt trước khi bật khóa.
- GĐ 4 đổi nghĩa chữ ký đóng sổ: cần kiểm thử migration trên dữ liệu có chữ ký đóng sẵn.
- Dev server đang chạy: không dùng `npm run build` và không kill tiến trình; dùng `npm run check` và API tạm trên cổng khác.
