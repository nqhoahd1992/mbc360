# MBc360 — Câu hỏi bổ sung, Vòng 6 (bản dịch để rà soát nội bộ, không gửi)

**Gửi:** đội chuyên môn (NPD / Quality / Regulatory / Safety)

Vòng này có sáu câu. Chúng nảy ra từ đáp án câu 1 và câu 37 của Vòng 5. Câu 1 hỏi cách đọc những tên người xác nhận trong bảng; câu 2 nhờ các bạn kiểm tra một trang liệt kê mọi vai và thẩm quyền của từng vai; câu 3 hỏi ai được nêu tên để giữ một chức năng trên dự án; câu 4 hỏi thế nào là "thay đổi quan trọng" làm mất hiệu lực một xác nhận; câu 5 hỏi sáu câu trả lời các bạn yêu cầu nên được ghi lại thế nào; câu 6 hỏi một thay đổi ở danh sách công ty nên đến được các dự án đang dựa vào nó như thế nào.

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

---

## Câu 4 — Thế nào là "thay đổi quan trọng" làm mất hiệu lực một xác nhận?

*Ở đâu trong ứng dụng:* Khối yêu cầu một người được nêu tên xác nhận lý do "not applicable" do hệ thống tự viết, trên trang chứa dữ liệu của nó (ví dụ sổ Pregnancy / Breastfeeding Caution Limits). Sau khi xác nhận, khối hiện ai xác nhận và lúc nào.

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

*Ở đâu trong ứng dụng:* Tab **Gate 02 của Phase 1**, nằm trong card Target Users, một ô "Foreseeable maternal and infant contact" chỉ hiện khi chưa tick đối tượng pregnant, breastfeeding, postpartum hay infant nào; và tab **Gate 12 của Phase 4**, một khối mới "Enhanced-surveillance conditions the application cannot read".

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

*Ở đâu trong ứng dụng:* ba danh sách công ty (Raw Material Risk Overlay, hồ sơ thị trường của Regulatory, Claims Library) và, trong mỗi dự án, **Project Overview**, ở khối "Impact of changes to the company lists".

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

*Ở đâu trong ứng dụng:* tab **Gate 12 của Phase 4**, khối "Change Control required for the post-market finding?".

Ở đáp án 2 các bạn liệt kê mỗi phát hiện mang theo gì: Finding ID tự sinh, source/category, source record link, date identified, affected SKU/formula/batch và market(s), review-cycle ID, severity/priority và disposition; và Yes, No, Pending đều phải có reviewer, ngày và lý do. Tất cả đã được xây. Các bạn chưa nói trường nào bắt buộc hay một số trường nhận giá trị gì, nên chúng tôi đọc như sau:

- **Source / category:** sáu loại ở đáp án 2(b); bắt buộc, vì đó là thứ làm một vấn đề thành phát hiện.
- **Affected market(s):** chọn được nhiều; bắt buộc.
- **Review cycle:** chọn từ lịch review hậu mãi của dự án (ví dụ "Vietnam, ba tháng") và các review đã ghi; bắt buộc khi dự án có chu kỳ review nào. Chưa thị trường nào launch thì chưa có chu kỳ và chưa đòi.
- **Severity / priority:** cùng thang Low, Medium, High, Critical dùng ở nơi khác; tùy chọn.
- **Disposition:** chữ tự do, tùy chọn, vì các bạn chưa cho các giá trị.
- **Affected SKU / formula / batch:** một ô chữ.
- **Source record link** và **date identified:** tùy chọn.
- **Pending** cũng cần reviewer, ngày và lý do (đang chờ gì), đúng như các bạn viết; một mục chưa chọn câu trả lời thì chưa đòi gì.

*Một điều chưa xây:* các bạn nói các thị trường không liên quan được tiếp tục khi đã đủ yêu cầu của riêng nó. Hiện nay một phát hiện Pending ở một thị trường giữ mục Change-control ở Gate 12 cho mọi thị trường. Review mà phát hiện Pending thuộc về thì không đóng được, nhưng các thị trường khác chưa được thả ra.

**(a)** Disposition có danh sách giá trị không? Nếu có thì là gì?

**(b)** Phát hiện ở một thị trường chưa launch có cần gắn với chu kỳ review không, và nếu có thì với chu kỳ nào?

**(c)** Cách chia trường bắt buộc và tùy chọn ở trên có đúng không?

**(d)** Thang Low / Medium / High / Critical dùng chung có đúng cho severity / priority không?

**(e)** Affected SKU, formula và batch có nên là ba ô riêng không?
