# MBc360 — Câu hỏi bổ sung, Vòng 6 (bản dịch để rà soát nội bộ, không gửi)

**Gửi:** đội chuyên môn (NPD / Quality / Regulatory / Safety)

Vòng này có ba câu. Chúng nảy ra từ đáp án câu 1 và câu 37 của Vòng 5. Câu 1 hỏi cách đọc những tên người xác nhận trong bảng; câu 2 nhờ các bạn kiểm tra một trang liệt kê mọi vai và thẩm quyền của từng vai; câu 3 hỏi ai được nêu tên để giữ một chức năng trên dự án.

Chỗ nào ghi "nhóm phát triển phần mềm" là nhóm đang xây ứng dụng, không phải chủ của một dự án phát triển sản phẩm.

Có thể trả lời theo chữ cái, ví dụ "(a) — đúng, (b) — dòng 3 phải là …, (c) — phương án (ii)".

---

## Câu 1 — Nên đọc thế nào các tên người xác nhận trong cột "Acknowledgement function"?

*Ở đâu trong ứng dụng:* Trên form **New Project** (trang **All Projects**), mục **Functions** liệt kê ai giữ từng chức năng của dự án. Ở tab một gate của trang **Phase**, lý do "not applicable" do hệ thống tự viết cho một item critical được xác nhận bởi người giữ chức năng mà các bạn đã nêu cho item đó, và hiện "Unassigned" khi chưa có ai giữ.

Trong bảng ở đáp án 1(a), các bạn nêu ai phải xác nhận từng item critical. Các tên được viết theo nhiều dạng:

- tên chức năng đơn: *Safety*, *Regulatory*, *Quality*;
- một chức năng có thêm một từ sau dấu gạch chéo: *Quality / microbiology reviewer*, *Quality / post-market reviewer*, *Quality / change-control reviewer*, *Safety / study reviewer*;
- hai chức năng nối bằng "with", "and" hoặc ";": *Safety with Regulatory*, *Quality with Manufacturing / R&I*;
- hai hoặc ba tên đứng riêng: *Authorised human-study reviewer*, *Technical claims reviewer*, *R&I / Marketing*.

Các bạn chưa nói các tên này liên quan với nhau thế nào nên nhóm phát triển phần mềm phải chọn. Chúng tôi thấy một quy luật trong cách các bạn viết và đã xây theo đó. **Chúng tôi muốn kiểm tra đã đọc đúng chưa, vì nó quyết định ai được xác nhận một item.**

**Cách đọc của chúng tôi.** Từ bắt đầu bằng **chữ hoa** là **chức năng đứng độc lập**. Từ **viết thường sau dấu gạch chéo** là **chuyên môn nằm trong** chức năng viết trước dấu gạch chéo. Vậy *Quality / microbiology reviewer* là một người Quality phụ trách microbiology, và *Safety / study reviewer* là một người Safety phụ trách nghiên cứu. Tên không có chức năng đứng trước (*Authorised human-study reviewer*, *Technical claims reviewer*) chúng tôi **giữ là một chức năng riêng, đúng từng chữ của các bạn**, vì các bạn chưa nói chúng thuộc chức năng nào.

| Tên trong bảng của các bạn | Chúng tôi đọc là | Đúng chưa? Hoặc phải là gì? |
|---|---|---|
| Safety | Một chức năng độc lập | |
| Regulatory | Một chức năng độc lập | |
| Quality | Một chức năng độc lập | |
| Quality / microbiology reviewer | Chuyên môn nằm trong **Quality** (cho *Preservative strategy*, *Preservative efficacy status*) | |
| Quality / post-market reviewer | Chuyên môn nằm trong **Quality** (cho *Scheduled market feedback review*, *Baseline post-market surveillance*) | |
| Quality / change-control reviewer | Chuyên môn nằm trong **Quality** (cho *Change-control links*) | |
| Safety / study reviewer | Chuyên môn nằm trong **Safety** (cho *Infant testing triggered by use and risk*) | |
| Authorised human-study reviewer | Một chức năng riêng, không có chức năng nào đứng trước (cho *Human-study approval before recruitment*) | |
| Technical claims reviewer | Một chức năng riêng, không có chức năng nào đứng trước (cho *Product-performance evidence*) | |
| Manufacturing / R&I | Hai chức năng riêng, một trong hai được xác nhận (cho *Scale-up / pilot status*, cùng với Quality) | |

**(a)** Đọc chữ hoa và chữ thường như vậy có đúng không? Nếu không thì đọc thế nào?

**(b)** Xin sửa bất kỳ dòng nào trong bảng trên mà chúng tôi đọc sai.

**(c)** Khi có chuyên môn được nêu, ví dụ *Quality / microbiology reviewer*, ai được xác nhận item đó?

- (i) Chỉ người giữ chuyên môn đó. Người giữ *Quality* nhưng không giữ chuyên môn thì không được xác nhận. *Đây là cách chúng tôi đã xây.*
- (ii) Hoặc người giữ chuyên môn, hoặc người giữ chức năng chứa nó (ở đây là *Quality*).
- (iii) Người giữ chức năng chứa nó, và người giữ chuyên môn chỉ khi dự án đã nêu tên người đó.
- (iv) Cách khác (xin mô tả).

**(d)** Với hai tên không có chức năng đứng trước, tên nào nằm trong một chức năng các bạn đã liệt kê ở đáp án 37(b) không?

- *Authorised human-study reviewer* — có nằm trong **Clinical / Study Coordinator** không?
- *Technical claims reviewer* — có nằm trong **Technical Claims** không?

**Chúng tôi đã xây thế nào, để các bạn thấy ảnh hưởng.** Bốn chuyên môn và hai tên đứng riêng mỗi tên là một ô riêng trên form New Project, và sáu ô đó đều không bắt buộc: dự án có thể để trống và khi đó hiện **Unassigned**, item chờ đến khi có người được nêu tên, đúng như các bạn yêu cầu ở đáp án 37(b). Chúng tôi **không** coi người Quality thay được *Quality / microbiology reviewer*, và **không** coi *Authorised human-study reviewer* hay *Technical claims reviewer* là cùng chức năng với các chức năng ở 37(b). Nếu các bạn trả lời khác, chúng tôi đổi ai được xác nhận từng item.

---

## Câu 2 — Xin kiểm tra trang liệt kê mọi vai và thẩm quyền của từng vai

*Ở đâu trong ứng dụng:* Trong một dự án, mục **System Guide & Reference** ở thanh bên, rồi **Role & Authority Matrix**. Trang chỉ đọc và được sinh từ cùng các thiết lập mà ứng dụng dùng, nên không thể hiện điều ứng dụng không làm. Chúng tôi cũng có thể gửi bản sao của trang.

Ở đáp án 37(b), các bạn yêu cầu ghi lại bảng vai có thẩm quyền và danh sách người được gán. Trang này làm việc đó. Với mỗi vai một dự án có thể nêu tên, trang cho thấy:

- vai được nêu tên khi tạo dự án hay để tùy chọn;
- ai giữ vai đó trên dự án này (hoặc Unassigned);
- vai sở hữu, đồng rà soát và đồng ký bao nhiêu sheet;
- vai xác nhận những lý do "not applicable" nào (theo đáp án 1(a)), và vai nào khác phải cùng xác nhận một lý do;
- thẩm quyền nào khác của vai.

Bên dưới, trang liệt kê thẩm quyền không thuộc về một vai mà theo phân công của dự án, và chức năng độc lập cần có ở từng gate critical.

**(a)** Xin đọc trang. Thẩm quyền của từng vai có đúng không? Xin cho biết chỗ nào sai hoặc thiếu.

**(b)** Trang liệt kê bảy loại thẩm quyền đi theo phân công của dự án thay vì theo một vai. Xin xác nhận hoặc sửa từng loại:

| Hành động | Hiện ai được làm | Đúng chưa? Hoặc phải là gì? |
|---|---|---|
| Ghi quyết định của một gate, hoặc backtrack từ gate đó | Người được chỉ định "Approved by" của gate đó, Lead của dự án, hoặc quản trị viên | |
| Duyệt một phase | Người Lead của dự án đã chỉ định cho dòng đó | |
| Đổi duyệt PIF, regulatory, claims và launch của một thị trường | Người Regulatory và Project Manager của dự án, Lead của dự án, hoặc quản trị viên | |
| Xác nhận một phiên bản công thức cũ đã bị thay thế ở một thị trường | Lead của dự án, hoặc quản trị viên | |
| Chỉ định ai ký một phase hoặc một gate | Lead của dự án, hoặc quản trị viên | |
| Gán hoặc đổi ai giữ một chức năng trên dự án | Lead của dự án, hoặc quản trị viên | |
| Xác nhận một lý do "not applicable" do hệ thống tự viết | Người giữ chức năng được nêu cho item đó | |

---

## Câu 3 — Ai được nêu tên để giữ một chức năng trên dự án?

*Ở đâu trong ứng dụng:* Trên form **New Project** (trang **All Projects**), mục **Functions**; và thẻ **Project team** trên trang tổng quan dự án, nơi Lead của dự án nêu tên hoặc đổi người giữ một chức năng.

Ở đáp án 37(b), các bạn nói cho phép Lead của dự án "nominate authorised people **from the company role matrix**". Chúng tôi chưa chắc "company role matrix" là gì nên chưa xây giới hạn mà cụm này có thể ngụ ý.

Cách đọc của chúng tôi: đó là danh sách vai toàn công ty các bạn đã đưa ở đáp án F6 (21/07): Project Owner, R&I/Formulation Contributor, Safety Reviewer, Quality Reviewer, Regulatory Reviewer, Packaging/Artwork Contributor, Marketing/Sales Contributor, Supply Chain Contributor, Manufacturing Link Contributor, Study Author, Department Study Reviewer, Independent Study Reviewer, Published Information Technical Reviewer, Published Information Regulatory Reviewer, Final Approver, System Administrator và Read-only Viewer. Quản trị viên gán cho mỗi người trong ứng dụng một vai trong số này. Theo cách đọc đó, khi Lead nêu tên người giữ một chức năng thì chỉ được chọn người có vai công ty tương ứng, ví dụ chỉ Safety Reviewer cho *Safety / Scientific Review*.

**Chúng tôi đã xây thế nào.** Khi Lead nêu tên người giữ một chức năng, danh sách đưa ra **mọi người dùng đang hoạt động**, bất kể vai công ty của người đó. Chúng tôi làm vậy vì các chức năng trong đáp án của các bạn không khớp từng cái với 17 vai, và giới hạn chặt sẽ để một số chức năng không có ai để chọn. Hệ quả là, ví dụ, người có vai công ty *Read-only Viewer* hiện vẫn có thể được nêu tên làm *Safety / Scientific Review*.

**(a)** "Company role matrix" có phải là danh sách 17 vai ở đáp án F6 không? Nếu không thì là gì?

**(b)** Khi Lead nêu tên người giữ một chức năng, việc chọn nên:

- (i) giới hạn ở những người có vai công ty tương ứng;
- (ii) mở cho bất kỳ ai, nhưng hiện cảnh báo rõ khi người đó không có vai công ty tương ứng;
- (iii) mở cho bất kỳ ai, như hiện nay;
- (iv) cách khác (xin mô tả).

**(c)** Nếu có giới hạn (hoặc cảnh báo), mỗi chức năng do vai công ty nào giữ được? Xin điền cột bên phải. Bốn chức năng không có vai khớp rõ ràng trong 17 vai: *Clinical / Study Coordinator*, *Finance*, *Legal / IP* và *Commercial approver*.

| Chức năng | Vai công ty được giữ |
|---|---|
| Safety / Scientific Review | |
| Clinical / Study Coordinator | |
| Technical Claims | |
| Regulatory Claims | |
| Manufacturing | |
| Finance | |
| Legal / IP | |
| Commercial approver | |
| Authorised human-study reviewer | |
| Technical claims reviewer | |
| Quality / microbiology reviewer | |
| Quality / post-market reviewer | |
| Quality / change-control reviewer | |
| Safety / study reviewer | |

**(d)** Với chức năng không có vai tương ứng trong 17 vai, nên thêm một vai công ty mới, hay Lead được nêu tên bất kỳ ai?
