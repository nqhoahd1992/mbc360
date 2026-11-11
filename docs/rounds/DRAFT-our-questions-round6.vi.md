# MBc360 — Câu hỏi bổ sung, Vòng 6 (bản dịch để rà soát nội bộ, không gửi)

**Gửi:** đội chuyên môn (NPD / Quality / Regulatory / Safety)

Vòng này có mười hai câu. Chúng nảy ra từ đáp án câu 1, 2, 3 và 37 của Vòng 5. Câu 1 hỏi cách đọc những tên người xác nhận trong bảng; câu 2 nhờ các bạn kiểm tra một trang liệt kê mọi vai và thẩm quyền của từng vai; câu 3 hỏi ai được nêu tên để giữ một chức năng trên dự án; câu 4 hỏi thế nào là "thay đổi quan trọng" làm mất hiệu lực một xác nhận; câu 5 hỏi sáu câu trả lời các bạn yêu cầu nên được ghi lại thế nào; câu 6 hỏi một thay đổi ở danh sách công ty nên đến được các dự án đang dựa vào nó như thế nào; câu 7 hỏi các trường của một phát hiện hậu mãi nên điền thế nào; câu 8 hỏi mục readiness nào thuộc riêng một thị trường; câu 9 hỏi cách kiểm các xác nhận của một safety finding bị superseded; câu 10 hỏi thế nào là thay đổi cơ sở trên watch-list và đánh giá lại được xoá thế nào; câu 11 hỏi nên đọc thế nào các chi tiết của supersession một phiên bản theo từng thị trường; câu 12 hỏi nên đọc thế nào "critical" và quy tắc Change Control cho một thay đổi Claims Library.

Chỗ nào ghi "nhóm phát triển phần mềm" là nhóm đang xây ứng dụng, không phải chủ của một dự án phát triển sản phẩm.

Có thể trả lời theo chữ cái, ví dụ "(a) — đúng, (b) — dòng 3 phải là …, (c) — phương án (ii)".

---

## Câu 1 — Nên đọc thế nào các tên người xác nhận trong cột "Acknowledgement function"?

*Vị trí trong ứng dụng:* Trên form **New Project** (trang **All Projects**), mục **Functions** liệt kê ai giữ từng chức năng của dự án. Ở tab một gate của trang **Phase**, lý do "not applicable" do hệ thống tự viết cho một item critical được xác nhận bởi người giữ chức năng mà các bạn đã nêu cho item đó, và hiện "Unassigned" khi chưa có ai giữ.

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

*Vị trí trong ứng dụng:* Trong một dự án, mục **System Guide & Reference** ở thanh bên, rồi **Role & Authority Matrix**. Trang chỉ đọc và được sinh từ cùng các thiết lập mà ứng dụng dùng, nên không thể hiện điều ứng dụng không làm. Chúng tôi cũng có thể gửi bản sao của trang.

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

*Vị trí trong ứng dụng:* Trên form **New Project** (trang **All Projects**), mục **Functions**; và thẻ **Project team** trên trang tổng quan dự án, nơi Lead của dự án nêu tên hoặc đổi người giữ một chức năng.

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

---

## Câu 4 — Thế nào là "thay đổi quan trọng" làm mất hiệu lực một xác nhận?

*Vị trí trong ứng dụng:* Khối yêu cầu một người được nêu tên xác nhận lý do "not applicable" do hệ thống tự viết, trên trang chứa dữ liệu của nó (ví dụ sổ Pregnancy / Breastfeeding Caution Limits). Sau khi xác nhận, khối hiện ai xác nhận và lúc nào.

Ở đáp án 1(c), các bạn nói "a material change to target users, formula, markets, evidence or the rationale invalidates the affected acknowledgement", mục đó phải được đánh giá lại theo sự thật mới, và "pure spelling or formatting corrections may retain the acknowledgement with a recorded editorial change". Các bạn chưa nói thế nào là quan trọng, nên chúng tôi đọc như sau.

**Chúng tôi đã xây thế nào.** Mỗi xác nhận được ghi lại theo bốn sự thật của dự án, và hết hiệu lực (mục lại chờ xác nhận) ngay khi một trong bốn điều đó đổi:

- **đối tượng sử dụng** được tick ở Gate 02, và các nhóm tuổi đã xác nhận của sản phẩm family-use;
- **thị trường** của dự án;
- **phiên bản công thức lớn (major)**.

Khi đó mục lại chờ xác nhận và người dùng được báo là sự thật đã đổi. Khi gate của mục đã qua thì bằng chứng của nó bị khoá, nên một thay đổi sau đó (ví dụ thêm thị trường sau khi ra mắt) không làm mất hiệu lực; muốn đổi các sự thật đó cho gate đã qua thì phải Backtrack, và Backtrack mở lại gate. Nếu chỉ **câu chữ** của lý do được sửa thì xác nhận vẫn còn và khối ghi rõ là câu chữ đã được chỉnh.

**Chúng tôi chưa xây.** *Bằng chứng* không nằm trong bốn điều trên vì chúng tôi không biết các bạn muốn nói bằng chứng nào. Phiên bản công thức **nhỏ (minor)** không làm mất hiệu lực xác nhận: nó không mở lại gate nào, và làm mất hiệu lực xác nhận của một gate đã qua sẽ mở lại gate đó mà không ai quyết định.

**(a)** Danh sách bốn điều trên có đúng không? Xin thêm hoặc bớt.

**(b)** Bằng chứng nào làm mất hiệu lực một xác nhận, nếu có? Ví dụ hồ sơ an toàn, độ ổn định hoặc bằng chứng claim mới hoặc đã đổi, hoặc phân loại rủi ro của thành phần đổi.

**(c)** Phiên bản công thức **minor** có làm mất hiệu lực không, hay chỉ major? Nếu minor cũng làm mất hiệu lực thì một gate đã qua phải xử lý thế nào?

**(d)** Ai quyết định một chỉnh sửa chỉ là chỉnh câu chữ: người giữ chức năng hay hệ thống?

---

## Câu 5 — "Tiếp xúc có thể lường trước" và các điều kiện giám sát chưa có cấu trúc nên được ghi thế nào?

*Vị trí trong ứng dụng:* Tab **Gate 02 của Phase 1**, nằm trong card Target Users, một ô "Foreseeable maternal and infant contact" chỉ hiện khi chưa tick đối tượng pregnant, breastfeeding, postpartum hay infant nào; và tab **Gate 12 của Phase 4**, một khối mới "Enhanced-surveillance conditions the application cannot read".

Ở đoạn cuối đáp án 1, các bạn nói loại trừ maternal hoặc infant "must consider intended and reasonably foreseeable contact, not only marketing ticks", và "not applicable" của giám sát tăng cường "must assess all applicable triggers, including those not yet structured in the app". Các bạn chưa nói những nhận định đó được ghi ở đâu và câu trả lời trông thế nào, nên chúng tôi đã xây như sau. Bốn câu giám sát được trả lời **Yes** hoặc **No**; **No** phải kèm lý do và người xác nhận ("Record as me"), sửa một trong hai thì xác nhận bị rút lại; Yes không cần cả hai. Ô tiếp xúc có thể lường trước không có Yes hay No, chỉ có lý do.

- **Tiếp xúc có thể lường trước (một lý do viết ra, vì các bạn chỉ viết một câu):** "Why is contact with a pregnant, breastfeeding or postpartum user, or with an infant, not reasonably foreseeable?" Ô này chỉ hiện khi chưa tick đối tượng nào trong số đó, và nút Save bị khóa cho đến khi viết lý do **và có một người ghi tên mình là người xác nhận** ("Record as me", giống cách xác nhận một thay đổi là hành chính ở đáp án 11). Một lý do chưa ai xác nhận thì không tắt gì cả. Sửa lý do thì xác nhận bị rút lại, người xác nhận phải xác nhận lại nội dung mới. Không có Yes: nếu có tiếp xúc thì tick đối tượng, và việc tick bật pathway. Một lý do viết ra tắt cả pathway maternal lẫn infant (một lý do không nói được là pathway nào nên chúng tôi đọc là cả hai). Tick một đối tượng trong số đó thì ô ẩn đi nhưng chữ vẫn được giữ, và các dấu tick tự quyết định: chỉ tick pregnant, breastfeeding hoặc postpartum thì pathway infant không được đánh giá từ ô này, và chỉ tick infant thì pathway maternal cũng vậy.
- **Giám sát, mỗi điều kiện một câu** (đây là bốn trong mười bốn điều kiện giám sát tăng cường của các bạn mà ứng dụng không có dữ liệu để đọc):
  - "Is there a new or unusual active ingredient?"
  - "Is there a significant complaint trend?"
  - "Is there a recurring quality or performance issue?"
  - "Does an approved surveillance plan require enhanced surveillance?"

Dự án không tick đối tượng maternal hay infant nào và chưa viết lý do được coi là **chưa đánh giá**, không phải "does not apply": các mục phụ thuộc phải chờ. Tick đối tượng làm lộ trình áp dụng; với giám sát, chỉ cần một Yes ở bất kỳ câu nào trong bốn là sản phẩm thuộc diện giám sát tăng cường, còn "does not apply" cần cả bốn câu trả lời No kèm lý do. Mọi dự án đang có đều bắt đầu với cả năm câu chưa trả lời, trừ khi hai câu maternal và infant cũ cùng là No kèm lý do: khi đó lý do được giữ lại.

**(a)** Đây có phải đúng các câu hỏi không? Xin sửa câu chữ.

**(b)** Ai trả lời từng câu, và ở gate nào? Chúng tôi đặt hai câu đầu ở Gate 02 và bốn câu giám sát ở Gate 12.

**(c)** Chúng tôi nay ghi người xác nhận lý do tiếp xúc có thể lường trước, như ở "Administrative-only change" (đáp án 11), nơi các bạn yêu cầu một reviewer có thẩm quyền xác nhận. Bốn câu giám sát còn lại có nên cũng ghi người xác nhận và ngày, như phần nhóm tuổi family-use không? Và ai được coi là người có thẩm quyền cho từng câu? Hiện nay bất kỳ ai đã đăng nhập đều có thể ghi tên mình, và ứng dụng không biết người đó có thẩm quyền hay không.

**(d)** Xu hướng khiếu nại có đúng là một điều kiện ứng dụng không đọc được không? Chúng tôi hiểu "vấn đề an toàn hoặc biến cố bất lợi ghi trên danh sách phản hồi hậu mãi" chỉ phủ tín hiệu an toàn và biến cố bất lợi, nên xu hướng khiếu nại không có yếu tố an toàn thì ứng dụng không thấy. Xin xác nhận.

**(e)** Còn điều kiện nào khác mà ứng dụng không đọc được và nên hỏi không?

**(f)** Ở Gate 03 có một dòng Key Gate Check ghi "Concept direction and benchmark/competitor review recorded". Khi một thay đổi được xác nhận là administrative-only (đáp án 11) thì không cần rà soát competitor/benchmark, nên chúng tôi đặt cả dòng này thành không bắt buộc và chỉ đọc cho dự án đó. Phần concept direction của dòng có được miễn cùng không, hay vẫn bắt buộc và phải ghi riêng?

---

## Câu 6 — Một thay đổi ở danh sách công ty nên đến được các dự án đang dựa vào nó như thế nào?

*Vị trí trong ứng dụng:* ba danh sách công ty (Raw Material Risk Overlay, hồ sơ thị trường của Regulatory, Claims Library) và, trong mỗi dự án, **Project Overview**, ở khối "Impact of changes to the company lists".

Ở đáp án 1(d), các bạn nói gate đã passed giữ phiên bản danh sách nó đã dùng; một thay đổi liên quan ở danh sách "creates a tracked impact assessment, with an owner and due date"; "a credible Critical safety issue, prohibition or mandatory market restriction puts affected current use/release on hold pending qualified review"; và Safety/Regulatory cùng Quality quyết định phạm vi, mức khẩn và việc có mở lại hay không. Các bạn chưa nói ai phát tín hiệu, ai là owner của đánh giá, và "use/release" nghĩa là gì trong ứng dụng. Chúng tôi đã xây như sau.

- **Gate đã passed giữ danh sách nó đã dùng.** Chỉnh sửa về sau không đổi điều gate đã quyết; dự án hiện thông báo những gì đã thay đổi.
- **Người sửa danh sách phát tín hiệu.** Khi lưu, họ nói thay đổi có Critical không (vấn đề an toàn, chất cấm hoặc hạn chế thị trường bắt buộc), kèm lý do, và cho hạn mà các dự án bị ảnh hưởng phải rà soát xong.
- **Mọi dự án đang chạy dựa vào mục đó và đã passed ít nhất một gate nhận một đánh giá tác động**, owner là chức năng đánh giá loại danh sách đó: Safety cho phân loại rủi ro của nguyên liệu; Regulatory cho yêu cầu của thị trường; Technical claims reviewer và Regulatory cho wording claim.
- **Thay đổi Critical đặt việc phát hành vào trạng thái giữ, và chỉ phát hành.** Gate 10 đến 12 không passed được, và các thị trường mà thay đổi ảnh hưởng không thể được duyệt launch hay ghi ngày launch thực tế, cho đến khi mọi chức năng trong đánh giá đã kết luận. Mọi thứ khác của dự án vẫn mở để sửa. Yêu cầu của một thị trường chỉ giữ thị trường đó; một nguyên liệu hay một claim giữ mọi thị trường của dự án.
- **Mỗi chức năng ghi một kết luận**: "No impact", hoặc "Impact on this project" kèm Change Control record xử lý nó, và luôn có rationale. Người đã phát tín hiệu không được kết luận, và tài khoản administrator không thay thế được chức năng.
- **Thay đổi không đánh dấu Critical** chỉ mở đánh giá; không có gì bị giữ.

**(a)** Người sửa danh sách có phải là người phù hợp để nói đó là Critical, hay Safety / Regulatory nên xác nhận trước khi phát hành bị giữ?

**(b)** "Use/release" có đọc đúng không? Chúng tôi giữ các gate phát hành (10 đến 12) và việc launch của các thị trường bị ảnh hưởng. Trạng thái giữ có nên chặn thêm điều gì, hay nên chạm tới sản phẩm đã bán (ví dụ bằng cách yêu cầu quyết định về việc tiếp tục sử dụng)?

**(c)** Owner có đúng không: Safety cho phân loại nguyên liệu, Regulatory cho yêu cầu thị trường, Technical claims reviewer và Regulatory cho claim?

**(d)** Dự án chưa passed gate nào có cũng nhận đánh giá không? Chúng tôi bỏ qua vì các check của nó đã đọc danh sách hiện hành.

**(e)** Một tác động cần làm lại được kết luận bằng cách nêu Change Control record. Kết luận có nên mở lại các gate bị ảnh hưởng, hay việc đó để người có thẩm quyền quyết như hiện nay?

## Câu 7 — Các trường của một phát hiện hậu mãi nên điền thế nào và trường nào bắt buộc?

*Vị trí trong ứng dụng:* tab **Gate 12 của Phase 4**, khối "Change Control required for the post-market finding?".

Ở đáp án 2 các bạn liệt kê mỗi phát hiện mang theo gì: Finding ID tự sinh, source/category, source record link, date identified, affected SKU/formula/batch và market(s), review-cycle ID, severity/priority và disposition; và Yes, No, Pending đều phải có reviewer, ngày và lý do. Tất cả đã được xây. Các bạn chưa nói trường nào bắt buộc hay một số trường nhận giá trị gì, nên chúng tôi đọc như sau:

- **Source / category:** sáu loại ở đáp án 2(b); bắt buộc, vì đó là thứ làm một vấn đề thành phát hiện.
- **Affected market(s):** chọn được nhiều; bắt buộc.
- **Review cycle:** chọn từ lịch review hậu mãi của dự án (ví dụ "Vietnam, ba tháng") và các review đã ghi; bắt buộc khi dự án có chu kỳ review nào. Chưa thị trường nào launch thì chưa có chu kỳ và chưa đòi.
- **Severity / priority:** cùng thang Low, Medium, High, Critical dùng ở nơi khác; tùy chọn.
- **Disposition:** chữ tự do, tùy chọn, vì các bạn chưa cho các giá trị.
- **Affected SKU / formula / batch:** một ô chữ.
- **Source record link** và **date identified:** tùy chọn.
- **Pending** cũng cần reviewer, ngày và lý do (đang chờ gì), đúng như các bạn viết; một mục chưa chọn câu trả lời thì chưa đòi gì.

*Thị trường không liên quan được tiếp tục:* một phát hiện Pending ở một thị trường không còn giữ các thị trường khác (xem câu 8). Review mà phát hiện Pending thuộc về thì không đóng được.

**(a)** Disposition có danh sách giá trị không? Nếu có thì là gì?

**(b)** Phát hiện ở một thị trường chưa launch có cần gắn với chu kỳ review không, và nếu có thì với chu kỳ nào?

**(c)** Cách chia trường bắt buộc và tùy chọn ở trên có đúng không?

**(d)** Thang Low / Medium / High / Critical dùng chung có đúng cho severity / priority không?

**(e)** Affected SKU, formula và batch có nên là ba ô riêng không?

## Câu 8 — Mục readiness nào là yêu cầu riêng của một thị trường?

*Vị trí trong ứng dụng:* **Phase 4**, các tab **Gate 10, 11 và 12**, nay bắt đầu bằng một công tắc thị trường.

Các bạn nói các thị trường không liên quan được tiếp tục khi đã đủ yêu cầu riêng. Gate 10 đến 12 vốn đã ký theo từng thị trường, nhưng mọi mục readiness đều nhìn cả dự án, nên một phát hiện mở hay một dòng nhãn chưa xong ở Vietnam cũng giữ luôn Singapore. Nay chúng tôi chấm lane của từng thị trường bằng dữ liệu của chính nó. Các bạn chưa liệt kê mục nào thuộc một thị trường, nên chúng tôi đọc theo dữ liệu nào mang thị trường:

- **Chấm theo từng thị trường:** checklist quy định và checklist ASEAN, bằng chứng claim trong sổ SKU claims, duyệt artwork và claim trên artwork, duyệt thông tin công bố, liên kết GMP, nhãn đã phát hành, phê duyệt quy định, phê duyệt launch, chữ ký Gate 10 của từng thị trường, các thay đổi có ghi thị trường, và các mục review hậu mãi, giám sát nền, Change-control.
- **Chấm cho cả dự án nên giữ mọi thị trường:** công thức và bằng chứng nguyên liệu, bằng chứng an toàn, hồ sơ và nội dung PIF cho trẻ sơ sinh, câu chữ và miễn trừ của bằng chứng claim, sản xuất và đường phát hành, khiếu nại và CAPA, và bốn điều kiện giám sát mà ứng dụng không đọc được.
- Một bản ghi không ghi thị trường được hiểu là liên quan mọi thị trường, nên chỉ giữ được một thị trường chứ không thả được.

Hai chỗ chặt hơn trước: một thị trường chưa có phát hiện nào ghi cho nó thì bị giữ ở mục Change-control (một lần review không thấy gì thì ghi một mục No cho thị trường đó), và một dự án sẵn sàng đúng khi mọi thị trường sẵn sàng.

**(a)** Danh sách mục chấm theo từng thị trường có đúng không?

**(b)** Một thị trường chưa launch có được qua Gate 10 và 11 độc lập với thị trường đã launch không?

**(c)** Mỗi review của một thị trường ghi "no findings requiring Change Control" riêng cho nó có đúng không?

Chúng tôi đã đi xa hơn các mục readiness, để một thị trường không bị vướng thị trường khác:

- **Dòng yêu cầu thuộc về một thị trường.** Trong bảng "Dossier / HCP Evidence Checks", dòng **ASEAN PIF mapped** nay là một dòng cho mỗi thị trường ASEAN (không có dòng nào cho thị trường ngoài ASEAN), và **Country-specific restrictions** là một dòng cho mỗi thị trường. Chúng tôi chỉ tách hai dòng mà chính chữ của dòng nêu tên thị trường hoặc quốc gia; mọi dòng khác vẫn là một dòng cho sản phẩm.
- **Key Gate Check về quốc gia/lộ trình, hai dòng Infant & Baby Safety, và các danh sách feedback sau lưu hành.** Check Gate 10 "Countries/regulatory pathway matched and PIF/evidence file mapped" nay là một check cho mỗi thị trường. Trong bảng Infant & Baby Safety của Gate 10, **Approved age and use statements** và **Label warnings and directions** là một dòng cho mỗi thị trường. Ba danh sách của Gate 12 (nguồn feedback, loại vấn đề, hành động phát sinh) được liệt kê riêng cho từng thị trường.
- **Next action thuộc một thị trường hoặc tất cả.** Ở Gate 10 đến 12, một action có thể ghi một thị trường; action không ghi thị trường nào thì giữ mọi thị trường.
- Các tab Gate 10 đến 12 hiện các dòng và action của thị trường chọn ở đầu trang, và chữ ký của một thị trường chỉ chứng nhận các dòng và action của thị trường đó.

**(d)** Ngoài các dòng, check và danh sách đã nêu ở trên, mục nào khác ở Gate 10 đến 12 là của riêng từng thị trường (ví dụ dòng "Approved HCP wording", "PIF/CPSR export-ready", hoặc các Key Gate Check khác)?

**(e)** Một action ở Gate 10 đến 12 không ghi thị trường có đúng là giữ mọi thị trường không?

**(f)** Mỗi thị trường có nên tự đi qua Gate 10, 11, 12 độc lập không? Ví dụ Singapore mở Gate 11 khi Gate 10 của riêng nó đã qua, trong lúc Vietnam còn ở Gate 10. Và Phase 4 có được đóng khi một thị trường đã lưu hành còn thị trường khác chưa qua Gate 10 không?

**(g)** Khi gate của một thị trường bị đưa lùi lại (Backtrack), chỉ ảnh hưởng thị trường đó hay cả các thị trường khác?

**(h)** Khi thêm hoặc rút một thị trường giữa chừng, lộ trình riêng của nó bắt đầu từ gate nào, và các gate nó đã qua thì xử lý ra sao?

## Câu 9 — Safety finding High hoặc Critical bị Superseded: cách kiểm từng xác nhận

*Vị trí trong ứng dụng:* trang **Formulation Safety**, bảng **Critical Safety Findings**, khi Status của một finding là "Superseded".

Các bạn đã nói finding High hoặc Critical bị superseded cần gì: Finding ID thay thế hợp lệ, lý do của safety reviewer, ngày supersession, link tới đánh giá hoặc bằng chứng thay thế, xác nhận từng action còn tồn là chuyển, giữ lại hay huỷ hợp lệ, và ai cho phép, ai xác minh. Chúng tôi đã xây đúng như vậy. Finding bị superseded không còn bị hỏi gói đóng, chỉ hỏi bản ghi này, và không thể xoá nó hay finding thay thế. Câu trả lời để ngỏ vài chi tiết, nên chúng tôi đọc như sau:

- **Lý do** ghi vào chính ô "Safety reviewer conclusion" mà finding đã đóng dùng.
- **Xác nhận action là một lựa chọn cho cả finding**: *Transferred to the replacement*, *Retained on this finding*, *Validly cancelled* (lời các bạn), và giá trị thứ tư của chúng tôi, *No outstanding action*, để finding không có action nào vẫn xác nhận được. Chúng tôi đối chiếu với action: *Transferred* cần finding thay thế có action riêng; *Retained* cần action của finding này còn mở; *Validly cancelled* cần action của finding này ở trạng thái Cancelled; *No outstanding action* bị từ chối khi action của finding này còn mở.
- **Authorised by** và **verified by** mỗi ô ghi đúng người đang đăng nhập. Có thể là cùng một người.
- Bản ghi chỉ hỏi finding **High và Critical**; finding Medium hoặc Low bị superseded chỉ cần finding thay thế.

**(a)** Một lựa chọn cho cả finding là đủ, hay phải xác nhận riêng từng action khi có nhiều?

**(b)** Action ở trạng thái Cancelled có đủ để gọi là "validly cancelled" không, hay việc huỷ còn phải có lý do hoặc người duyệt?

**(c)** Người cho phép supersession và người xác minh có phải hai người khác nhau không?

**(d)** Giá trị thứ tư "No outstanding action" có đúng không?

## Câu 10 — Watch-list: thế nào là thay đổi "cơ sở", và đánh giá lại được xoá thế nào?

*Vị trí trong ứng dụng:* các sổ **Prohibited Ingredient Watch-list** và **Pregnancy / Breastfeeding Caution Limits**, phần khớp hiện trên mỗi dòng, và danh sách readiness của Gate 4 và Gate 7.

Các bạn đã nói cả hai danh sách phải tự đánh dấu khớp với công thức, giữ kết quả đối chiếu tách khỏi classification của reviewer kèm phiên bản công thức, phiên bản danh sách và cơ sở khớp, và đánh dấu kết luận cũ để đánh giá lại khi cơ sở đổi. Chúng tôi đã xây như vậy. Một nguyên liệu khớp nay đặt dòng thành "REVIEW - possible formula match" ở cả hai danh sách; mỗi dòng hiện cái đã khớp, với phiên bản công thức nào và danh sách nào; và kết luận đạt được trên một khớp khác được đánh dấu "Reassessment needed" mà không đổi lựa chọn của reviewer. Câu trả lời để ngỏ vài điều, nên chúng tôi đọc như sau:

- **Cơ sở là tập các nguyên liệu khớp**, mỗi cái theo số CAS hoặc tên mà nó khớp. Phần trăm và thứ tự dòng không thuộc cơ sở, nên một mẻ thử chỉ đổi phần trăm không mở lại gì. Thêm một nguyên liệu khớp mới, hoặc bớt một cái, thì cơ sở đổi.
- **Phiên bản danh sách** là một nhãn chúng tôi giữ cho các danh sách dựng sẵn và đổi mỗi khi một nhóm, từ khoá hay số CAS đổi. Các danh sách kiểm soát mà các bạn nói chưa được cung cấp.
- **Đánh giá lại được xoá khi reviewer ghi lại ngày review** (hoặc đổi classification). Không bao giờ tự xoá.
- **Một dòng đang chờ đánh giá lại giữ Gate 4 và Gate 7.** Vì Gate 4 chỉ pass khi không có gì chặn, một Gate 4 đã pass sẽ mở lại khi xuất hiện nguyên liệu khớp mới. Chúng tôi đọc "must reopen its affected review" như vậy, chứ không phải một Backtrack tự động.

**(a)** Cơ sở là tập các nguyên liệu khớp, bỏ phần trăm và thứ tự, có đúng không?

**(b)** "Phiên bản danh sách" nên là gì khi các danh sách kiểm soát đã có?

**(c)** Ghi lại ngày review có đủ để xoá một đánh giá lại không, hay reviewer phải ghi thêm gì?

**(d)** Một nguyên liệu khớp mới chỉ nên mở lại dòng đó (và giữ gate tới khi đánh giá lại), hay phải đưa cả dự án về Gate 4 một cách rõ ràng?

## Câu 11 — Supersession của phiên bản theo từng thị trường: nên đọc thế nào các chi tiết câu trả lời để ngỏ?

*Vị trí trong ứng dụng:* trang **Formula BOM**, card **Formula supersession (per market)**, form **New formula version**, và **Phase 4**, các review sau lưu hành.

Các bạn đã nói một phiên bản công thức cũ được supersede thế nào: mỗi dữ kiện trong mười dữ kiện do function chịu trách nhiệm xác nhận, Quality điều phối từng thị trường, final approver có thẩm quyền xác nhận quá trình chuyển đổi hoàn tất; trạng thái giữ theo từng thị trường (Active, Transition, Superseded) và trạng thái phiên bản suy ra từ đó; thay đổi Minor không tự bắt đầu gì; chỉnh sửa chỉ ở tài liệu không cần chuyển đổi tồn kho; phiên bản chưa từng phát hành được supersede khi có xác nhận không phát hành; lịch review của thị trường tiếp tục chạy và công thức đổi đáng kể có các review sớm riêng. Chúng tôi đã xây tất cả. Chỗ nào câu trả lời để ngỏ, chúng tôi đọc như sau:

- **Ai xác nhận dữ kiện nào.** Bản thay thế: R&I. Ngày hiệu lực chuyển đổi: Quality. Ngày release cuối và "không còn lô": Quality hoặc Manufacturing (ai giữ một trong hai trên dự án). Thông báo cơ quan quản lý, artwork và danh sách thành phần, cập nhật PIF: Regulatory. Xử lý tồn kho: Supply Chain. Truyền thông Sales & Marketing và nhà phân phối: Sales & Marketing.
- **Final approver có thẩm quyền** là người giữ quyền Final Approver, người đã duyệt thương mại cho thay đổi công thức. Admin vẫn giữ toàn quyền.
- **Ngày triển khai khác trong kế hoạch chuyển đổi** là "ngày hiệu lực chuyển đổi" do người ghi. Ghi ngày là bắt đầu chuyển đổi thị trường đó ngay; chúng tôi không chờ tới ngày đó.
- **Trạng thái chung của phiên bản:** Superseded khi mọi thị trường đã Superseded; Active nếu còn thị trường nào Active; còn lại là Transition.
- **Bản sửa chỉ ở tài liệu** do người tạo phiên bản tích chọn (chỉ với Minor, kèm lý do); phiên bản bị sửa được supersede ngay.
- **Review sớm của công thức đổi đáng kể:** chỉ phiên bản **Major** launch ở một thị trường sau lần launch đầu tiên, với review ba tháng (và một tháng nếu giám sát tăng cường), tính từ ngày launch của chính phiên bản đó. Lịch của thị trường vẫn chạy từ lần launch đầu bên cạnh.

**(a)** Cách gán dữ kiện cho function này có đúng không — đặc biệt ngày hiệu lực chuyển đổi thuộc ai?

**(b)** "Final approver có thẩm quyền" là ai trong công ty?

**(c)** Một ngày hiệu lực đã ghi có đủ để bắt đầu chuyển đổi, hay phải chờ tới ngày đó?

**(d)** Các mốc review sớm của công thức đổi đáng kể là những mốc nào?

**(e)** Một review có thể bao cả hai phiên bản ở một thị trường không, và ghi thế nào?

## Câu 12 — Thay đổi ở Claims Library: nên đọc thế nào "critical" và quy tắc Change Control?

*Vị trí trong ứng dụng:* trang cấp công ty **Claims Library** (menu "Company Reference Data"): khối "Effect on projects that already use this" khi lưu hoặc thu hồi; và, trên từng dự án, thẻ **Impact of changes to the company lists**.

Các bạn đã nói một thay đổi Claims Library được đánh giá thế nào: cùng bốn mức (Low, Medium, High, Critical); Regulatory ghi tác động thị trường và pháp lý, Technical ghi tác động bằng chứng, Safety khi có vấn đề an toàn; mức nghiêm trọng do các function có chuyên môn xác nhận, Quality điều phối; vấn đề an toàn khẩn cấp hoặc hạn chế bắt buộc thì giữ ngay và chuyển cấp; dừng bán là quyết định của công ty; Change Control bắt buộc khi thay đổi ảnh hưởng wording đã duyệt hoặc đã phát hành, artwork, PIF hoặc việc dùng được phép ở thị trường, và không cần cho entry chưa dùng hay sửa biên tập; và ngừng dùng wording đã thu hồi. Chúng tôi đã xây như vậy. Chỗ nào câu trả lời để ngỏ, chúng tôi đọc như sau:

- **Một đề xuất Critical chưa giữ gì cho tới khi được xác nhận.** Người sửa danh sách đề xuất mức. Một thay đổi Critical đề xuất chỉ giữ phát hành của dự án khi một function có chuyên môn trên dự án đó đã xác nhận, trừ khi nó được đánh dấu là vấn đề an toàn khẩn cấp hoặc hạn chế bắt buộc, khi đó giữ ngay. (Trước câu trả lời của các bạn, đánh dấu Critical là giữ phát hành ngay; các thay đổi đã đánh dấu như vậy được giữ nguyên là khẩn cấp, nên không hold nào bị dỡ.)
- **Một function có chuyên môn xác nhận là đủ.** Bất kỳ function nào ghi trên đánh giá của dự án (Technical, Regulatory, Quality, và Safety khi tích vấn đề an toàn). Người đề xuất không tự xác nhận.
- **Chuyển cấp** nghĩa là đánh giá còn được gửi tới Safety, Regulatory và Quality, và hiện là đã chuyển cấp. Ứng dụng không gửi gì ra ngoài.
- **Liên quan an toàn** là ô người sửa danh sách tích.
- **Điều gì buộc Change Control:** bất kỳ một trong bốn ảnh hưởng các bạn nêu. Chọn "không gì — entry chưa dùng hoặc sửa biên tập" thì đóng đánh giá là "No impact" kèm lý do.
- **Technical, Regulatory và Quality mỗi bên ghi kết luận riêng**, và đánh giá xong khi cả ba xong.
- **Wording đã thu hồi** không còn được chọn mới cho một claim; liên kết claim đã có vẫn giữ và claim quay lại review.

**(a)** Một thay đổi Critical đề xuất có thật sự chưa giữ gì cho tới khi được xác nhận không?

**(b)** Xác nhận của một function có chuyên môn là đủ, hay Regulatory và Technical phải cùng xác nhận?

**(c)** Chuyển cấp nên làm gì ngoài việc hiện trên màn hình — thông báo cho ai, bằng cách nào?

**(d)** Bốn ảnh hưởng đó có phải toàn bộ danh sách buộc Change Control không?

**(e)** Quality ghi một kết luận riêng hay chỉ điều phối?
