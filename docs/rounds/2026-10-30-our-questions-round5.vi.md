# MBc360 — Các câu hỏi tiếp theo, Vòng 5

**Gửi:** đội chuyên môn (NPD / Quality / Regulatory / Safety)

Cảm ơn quý vị về các câu trả lời của Vòng 4. Chúng đủ đầy đủ để chúng tôi bắt đầu xây dựng ngay, và **ba mươi bốn trong ba mươi sáu câu đã hoàn tất**. Hai câu chưa xong đang chờ các câu trả lời dưới đây chứ không phải chờ công việc: danh sách khu vực bị ảnh hưởng khi scale-up (câu hỏi 7 ở đây) và việc reviewer xác nhận (acknowledgement) trong câu hỏi 16 của quý vị (câu hỏi 1 ở đây). Danh sách này là những gì quá trình xây dựng đó đã làm nảy sinh.

Mọi câu hỏi ở đây đều hỏi về sản phẩm mỹ phẩm, bằng chứng, các claim hoặc các phê duyệt của nó — không có câu nào về cách phần mềm lưu trữ hay khóa dữ liệu. Với mỗi câu, chúng tôi đã đưa ra một lựa chọn để công việc có thể tiếp tục, lựa chọn đó đang chạy, và chúng tôi muốn quý vị chỉnh lại hơn là để nó lặng lẽ trở thành quy tắc. Với câu hỏi nào chưa được xây dựng, chúng tôi nói rõ như vậy.

Nhiều câu hỏi có các phần đánh chữ cái. Quý vị có thể trả lời theo số và chữ cái, ví dụ "3(a) — có, 3(b) — phương án (ii)".

## Những gì chúng tôi cần nhất, theo thứ tự

1. **Câu hỏi 1–2** — hai quyết định mà các câu trả lời Vòng 4 của quý vị phụ thuộc vào nhưng bản thân các câu trả lời đó không đề cập.
2. **Câu hỏi 3–7** — đã được xây dựng theo cách hiểu của chúng tôi, hoặc đã thiết kế nhưng chưa xây dựng. Nếu chúng tôi hiểu sai ý quý vị thì cần làm lại, nên chúng tôi muốn biết sớm.
3. **Câu hỏi 8–10** — một số câu nêu ra điều mà chính các câu trả lời của quý vị giả định là có nhưng phần mềm không có; câu hỏi 10 yêu cầu một thiết kế mới (liệu một thay đổi có mở lại một gate đã qua hay không).
4. **Câu hỏi 11** — câu hỏi mang tính cấu trúc lớn nhất trong danh sách này, và là câu mà chúng tôi đã chủ động dừng công việc cho đến khi quý vị trả lời.
5. **Câu hỏi 12–15** — phạm vi thay đổi, phê duyệt sổ và "not applicable"; các quy tắc chúng tôi đang chạy theo cách hiểu của mình.
6. **Câu hỏi 16–30** — các cách hiểu khác của chúng tôi, mỗi câu đều nhỏ; phần lớn chỉ cần xác nhận một dòng.
7. **Câu hỏi 31, 32 và 34 — những câu này mất nhiều thời gian hơn.** Câu hỏi 31 yêu cầu quý vị đánh dấu một danh sách mọi sổ trong hệ thống; câu hỏi 32 hỏi về thứ tự của một thay đổi và cách thực hiện một thay đổi công thức sau khi Gate 5 đã qua; câu hỏi 34 hỏi cách chuẩn bằng chứng nên được thực thi, và chưa có gì được xây dựng cho nó. Câu hỏi 33 ngắn.
8. **Câu hỏi 35–42** — các điểm ngắn hơn, mỗi điểm đã được xây dựng theo cách hiểu của chúng tôi: ký ở trạng thái Complete, Next Actions sau khi một gate đã qua, và một số điểm mà ứng dụng theo các sheet của workbook (owner functions, change references, batch trace, artwork checklist, evidence review hint, panel samples).

---

## Câu hỏi 1 — Những mục readiness nào là "critical", và ai là "responsible reviewer" của chúng?

*Vị trí trong ứng dụng:* Danh sách **Gate N readiness** (khung "requirement(s) still blocking") trên tab từng gate của trang **Phase**, nơi hiện lý do N/A do hệ thống tự viết và nút xác nhận; người xác nhận là "Reviewed by" trong **Sign-off** (tab close-out) của phase đó.

Quý vị đã trả lời rằng khi hệ thống có thể suy ra từ dữ liệu được kiểm soát rằng một điều kiện không áp dụng, nó được phép tự tạo ra lý do N/A — và người dùng không nên phải gõ lại một lý do mà hệ thống đã tạo ra. Nửa đó đã được xây dựng và đang hoạt động.

Nửa còn lại cần hai điều mà câu trả lời của quý vị không nêu. Với các mục liên quan đến an toàn, quy định, claim hoặc phát hành (release), quý vị nói rằng lý do được tạo ra "must still be acknowledged by the responsible reviewer before gate closure". Vì vậy chúng tôi cần biết **(i) những mục nào được coi là critical**, và **(ii) ai là responsible reviewer của một mục**. Câu trả lời sign-off của quý vị định nghĩa các vai trò một cách chính xác cho một *gate* — prepared, reviewed, approved, với một chức năng độc lập được nêu tên cho bảy gate critical — nhưng một gate đơn lẻ có từ bảy đến hơn hai mươi mục, và không có gì gắn một mục với một người.

**Một ví dụ, dùng xuyên suốt câu hỏi này.** Gate 7 có mục *"Maternal (pregnancy / breastfeeding) caution assessment closed"*. Với một dự án mà người dùng mục tiêu chỉ là người lớn nói chung, không ai cần làm đánh giá thai kỳ, nên hệ thống tự viết lý do: *"not triggered for this project (no pregnancy, breastfeeding or postpartum target user), so this passes automatically."* Câu trả lời của quý vị có nghĩa là với một mục an toàn như thế này, một reviewer vẫn phải đọc câu đó và xác nhận (acknowledge) nó trước khi Gate 7 có thể đóng. Mọi điều dưới đây là về việc reviewer đó là ai, những mục nào cần đến họ, và chuyện gì xảy ra sau đó.

**Những gì đang chạy, theo cách hiểu của chúng tôi.** Một N/A được tạo ra chỉ có thể xảy ra ở 31 mục trong bảng dưới đây (chúng là những mục duy nhất áp dụng "chỉ khi" một điều gì đó đúng; các mục Mandatory không bao giờ có N/A như vậy, và các mục Supporting không cần xác nhận, như quý vị đã nói).

- **Mục nào là critical:** một mục là critical khi nó nằm trên một trong bảy gate critical của quý vị (3, 4, 7, 8, 9, 10, 11). Bảy gate đó là những gate quý vị liệt kê là gate critical trong câu trả lời sign-off (Vòng 4, câu 29(3)), nơi chúng quyết định mức độc lập của người ký. Dùng cùng danh sách đó để quyết định mục nào là critical là cách hiểu của chúng tôi, không phải điều quý vị đã nói, và đó là một cách hiểu máy móc — chúng tôi không đánh giá từng mục. Theo đó 18 trong 31 mục là critical.
  *Ví dụ:* mục maternal của Gate 7 ở trên là critical, vì Gate 7 là gate critical. "Product form confirmed (left open at Gate 2)" của Gate 5 thì không (Gate 5 không có trong danh sách của quý vị), nên khi dạng sản phẩm đã được xác nhận ở Gate 2, mục này tự động qua và không ai phải xác nhận gì.
- **Ai xác nhận:** người mà project Lead đã chỉ định là **"Reviewed by"** trên sign-off của *phase* chứa mục đó.
  *Ví dụ:* sign-off của Phase 3 liệt kê Quality reviewer là "Reviewed by". Người đó đọc lý do maternal của Gate 7 và hoặc xác nhận nó, hoặc ghi lại rằng họ **không** xác nhận (kèm lý do), điều này giữ Gate 7 ở trạng thái giữ (hold).
- **Nếu tình huống thay đổi sau một lần xác nhận, lần xác nhận cũ không còn được tính.**
  *Ví dụ:* Reviewer đã xác nhận lý do ở trên khi Gate 7 đang mở. Sau đó dự án bị đưa ngược về Gate 2 và Marketing tích "Pregnancy" trong các target user. Lý do mà reviewer đã đọc không còn đúng: đánh giá thai kỳ giờ thật sự áp dụng, và lần xác nhận "not triggered" đó không thể thay thế cho nó — mục này khi đó được đánh giá dựa trên bằng chứng thực tế như mọi mục khác. Một trường hợp nhẹ hơn: cách diễn đạt lý do của hệ thống thay đổi trong khi mục vẫn là "not applicable"; lần xác nhận trước chỉ bao hàm các từ cũ, nên reviewer phải xác nhận các từ mới.

| # | Gate | Item | Is generated as "not applicable" when… | Critical? (our reading) | Second look? | Critical? (quý vị điền: Yes / No) |
|---|---|---|---|---|---|---|
| 1 | 2 | Product form left open — a controlled action tracks its confirmation at Gate 5 | the product form was confirmed at Gate 2 | No | |  |
| 2 | 2 | Infant & Baby Safety — intended infant-use context recorded | no infant use (Infant 0+ not a target user; family-use age groups exclude infants) | No | Reads as safety |  |
| 3 | 3 | Competitor or benchmark review where applicable | no development or change type is recorded, the request was not customer- or distributor-led and no benchmark product is named — or the change is confirmed administrative-only by a named reviewer | **Yes** | Reads as commercial, not critical |  |
| 4 | 3 | Regulatory review of high-risk or borderline claims | no claim meets any condition for Regulatory review | **Yes** | |  |
| 5 | 4 | Pregnancy/breastfeeding caution screen | no pregnancy, breastfeeding or postpartum target user | **Yes** | |  |
| 6 | 4 | Allergen, impurity and contaminant review where relevant | no raw material in the formula carries a risk flag | **Yes** | |  |
| 7 | 4 | Infant & Baby Safety — ingredient and raw-material suitability | no infant use | **Yes** | |  |
| 8 | 5 | Product form confirmed (left open at Gate 2) | the form was confirmed at Gate 2 | No | |  |
| 9 | 5 | Preservative strategy where applicable | the formula is not microbiologically susceptible (e.g. anhydrous) | No | Reads as safety |  |
| 10 | 5 | Infant & Baby Safety — formula-level assessment | no infant use | No | Reads as safety |  |
| 11 | 5 | Costing shows the project commercially feasible — this project is commercially dependent | target cost is not marked Must | No | |  |
| 12 | 6 | Infant & Baby Safety — packaging and instructions | no infant use | No | Reads as safety |  |
| 13 | 6 | Market-specific pack requirements | no selected market has special pack requirements | No | Reads as regulatory / release |  |
| 14 | 7 | Every automatic Formula BOM match is taken up on the Pregnancy/Breastfeeding Caution list | no pregnancy, breastfeeding or postpartum target user | **Yes** | |  |
| 15 | 7 | Maternal (pregnancy / breastfeeding) caution assessment closed | same | **Yes** | |  |
| 16 | 7 | Maternal and infant-contact assessment (when Skincare for Two is triggered) | same | **Yes** | |  |
| 17 | 7 | Infant / baby-contact safety compartment completed (INF-01 to INF-08) | no infant use | **Yes** | |  |
| 18 | 8 | Infant & Baby Safety — testing triggered by use context and risk | no infant use | **Yes** | |  |
| 19 | 8 | Human-study approval workflow completed before participant recruitment | no human study planned | **Yes** | |  |
| 20 | 9 | Preservative efficacy status where applicable | the formula is not microbiologically susceptible | **Yes** | |  |
| 21 | 9 | Scale-up or pilot status where applicable | no scale-up risk identified (and no Major formula change) | **Yes** | |  |
| 22 | 9 | Infant & Baby Safety — stability, microbiology and in-use testing | no infant use | **Yes** | |  |
| 23 | 10 | ASEAN PIF checklist complete | no ASEAN market selected | **Yes** | |  |
| 24 | 10 | ASEAN PIF mapped | no ASEAN market selected | **Yes** | |  |
| 25 | 10 | Infant & Baby Safety — PIF content and infant claim evidence | no infant use | **Yes** | |  |
| 26 | 10 | Product-performance evidence attached where relevant | no claim needs performance evidence | **Yes** | |  |
| 27 | 12 | Scheduled market feedback review | the product has launched in no market, or no post-launch review milestone has come due in a launched market and no safety or adverse-event issue has been recorded | No | |  |
| 28 | 12 | Baseline post-market surveillance review | the product has not launched in any market | No | Reads as regulatory |  |
| 29 | 12 | Enhanced PV/PMS review where applicable | none of the enhanced-surveillance conditions we can read applies — no safety signal, complaint or surveillance trend on Post-Market Sources and no vulnerable-user population assessed (we can read 10 of your 14 conditions) | No | Reads as safety / regulatory |  |
| 30 | 12 | Product-performance feedback | no performance, packaging, formula or quality issue is recorded, no product-optimisation proposal exists and no review is due | No | |  |
| 31 | 12 | Change-control links | no Change Control record is open | No | |  |

Gate 11 không có mục nào thuộc loại này.

**Câu hỏi:**

**(a) Những mục nào là critical?** Câu trả lời thay đổi điều gì: với một mục **critical**, ở mọi dự án mà điều kiện của nó không áp dụng, reviewer phải xác nhận lý do được tạo ra, và gate không đóng được cho đến khi họ xác nhận. Với một mục **không critical** thì không ai phải làm gì — nó tự qua và lý do được hiển thị. Nếu điều kiện có áp dụng, mục được đánh giá theo bằng chứng thực tế trong cả hai trường hợp. Xin hãy điền cột trống ở bên phải bảng, **Critical?** (Yes / No), cho mỗi dòng. Cột "Critical? (our reading)" là của chúng tôi và chỉ để so sánh. Nếu cách hiểu của chúng tôi đúng cho mọi dòng, chỉ cần ghi "agreed" và có thể để trống cột này. Cột "Second look" cho thấy những chỗ quy tắc dựa trên gate của chúng tôi và cách diễn đạt của mục dường như mâu thuẫn nhau — đó là những chỗ chúng tôi ít chắc chắn nhất.
*Ví dụ:* dòng 3, "Competitor or benchmark review" (không được kích hoạt vì dự án không phải mới cũng không phải tái định vị), nằm ở Gate 3, một gate critical, nhưng là nghiên cứu thị trường chứ không phải claim. Một reviewer có thật sự phải xác nhận nó không? Và dòng 29, "Enhanced PV/PMS review" (không được kích hoạt vì không có điều kiện giám sát tăng cường nào áp dụng), nằm ở Gate 12, không có trong danh sách của quý vị — nhưng nó đọc lên như an toàn / quy định. Nó có nên là critical không?

**(b) "Reviewed by" của phase có phải là người đúng không?** Các lựa chọn khác là reviewer của từng *gate*, chủ sở hữu của khu vực rà soát mà bằng chứng của mục thuộc về, hoặc một người được chỉ định theo từng mục. Nếu quý vị muốn việc xác nhận đến từ một chức năng độc lập cụ thể (ví dụ Safety cho một mục an toàn), xin cho biết, và khi đó chúng tôi sẽ hỏi tiếp mỗi mục critical thuộc khu vực nào trong bốn khu vực của quý vị (safety, regulatory, claims, release) — ngoài trường hợp đó chúng tôi không cần phân loại này.
*Ví dụ:* ở Phase 3, "Reviewed by" thường là Quality reviewer. Mục maternal của Gate 7 là một mục an toàn, và câu trả lời sign-off của quý vị yêu cầu chức năng Safety / Scientific Review rà soát chính quyết định an toàn. Việc xác nhận lý do đó có nên đến từ Safety thay vì từ người rà soát phase không?

**(c) Một lần xác nhận có ngừng được tính nếu tình huống thay đổi không?**
*Ví dụ:* reviewer đã xác nhận "no pregnancy or breastfeeding user" khi Gate 7 đang mở, rồi dự án bị đưa ngược về Gate 2 và Marketing thêm một người dùng thai kỳ. Quý vị có đồng ý rằng lần xác nhận trước phải ngừng được tính — để đánh giá thai kỳ khi đó thực sự được yêu cầu — thay vì tồn tại như một sự phê duyệt cho điều không còn đúng nữa không?

**(d) Khi một danh sách dùng chung của công ty thay đổi sau khi một gate đã qua, gate đó nên được đánh giá theo danh sách như lúc đó hay theo danh sách hiện tại?** Raw Material Risk Overlay, các market profile (hạn chế claim) và Claims Library là những danh sách dùng chung của công ty và thay đổi theo thời gian. Đề xuất của chúng tôi: một gate đã qua vẫn được đánh giá theo danh sách như lúc gate qua, để một thay đổi danh sách về sau không lặng lẽ làm đổi một quyết định đã đưa ra; một gate chưa qua được đánh giá theo danh sách hiện tại; và nếu dự án bị đưa ngược lại thì danh sách được lấy lại. Khi một danh sách thay đổi theo cách chạm đến nguyên liệu, thị trường hoặc claim của một dự án, dự án hiện một thông báo ("danh sách đã thay đổi kể từ Gate N", kèm phần khác biệt), nhưng không có gì bị chặn tự động.
*Ví dụ:* ở Gate 4 reviewer đã xác nhận "no raw material in the formula carries a risk flag". Về sau Regulatory gắn cờ dị ứng cho lavender oil, và lavender oil có trong công thức. Theo đề xuất của chúng tôi, Gate 4 giữ nguyên như cũ và dự án hiện một thông báo. Quý vị có đồng ý không — hay một cờ mới trên một nguyên liệu của sản phẩm đã qua Gate 4 phải đưa nó quay lại rà soát (và ai quyết định điều đó)? Nếu quý vị muốn một quy tắc khác cho một số danh sách, ví dụ hạn chế claim ở một thị trường, xin cho biết danh sách nào.

## Câu hỏi 2 — Đánh giá Change Control đối với các phát hiện hậu mãi (post-market): một bản ghi cho mỗi phát hiện, và cái gì được tính là một "phát hiện (finding)"?

*Vị trí trong ứng dụng:* Trang **Phase 4**, tab **Gate 12**, khối "Change Control required for the post-market finding?" (danh sách các mục); trang liên quan **Change Control & Communication**.

Quý vị đã yêu cầu một bước tường minh — "Change Control required? Yes / No / Pending assessment" — kèm reviewer, ngày, lý do, bản ghi Change Control được liên kết khi câu trả lời là Yes, và một liên kết bằng chứng, và quý vị nói rằng Pending phải chặn việc đóng "the post-market finding". Đã xây dựng.

**Chỗ chúng tôi phải chọn.** Cách diễn đạt của quý vị ở số ít ("the post-market finding") nhưng không nói là một đánh giá cho mỗi dự án hay một cho mỗi phát hiện. Ban đầu chúng tôi ghi **một câu trả lời cho cả dự án**. Chúng tôi đã đổi thành **một bản ghi cho mỗi phát hiện**, vì Gate 12 chạy nhiều năm và theo từng thị trường, và một câu trả lời đơn lẻ không thể nói nó nói về phát hiện nào.

*Ví dụ:* một sản phẩm bán ở Việt Nam và Singapore. Ở lần rà soát 3 tháng, Việt Nam cho thấy số khiếu nại kích ứng nhẹ tăng và Singapore có một báo cáo phản ứng dị ứng. Bây giờ có hai bản ghi. Xu hướng kích ứng được trả lời **No** — do Quality reviewer rà soát, lý do "within the expected range". Phản ứng dị ứng được trả lời **Yes**, và liên kết với bản ghi Change Control được mở cho nó. Trước đây, một câu trả lời đơn cho dự án không thể phân biệt hai việc này, và một "No" được đưa ra ở tháng thứ 3 vẫn nằm đó ở tháng thứ 12 khi một việc nghiêm trọng hơn nhiều xuất hiện.

**Vì sao Yes cần liên kết và No cần lý do.** Một Change Control đã tồn tại thì đã cho thấy ai mở nó. Đánh giá quan trọng nhất khi **không có gì được mở**: đó là bản ghi duy nhất cho biết có ai đó đã quyết định "không cần change control" hay không ai xem xét. Vì vậy trường đầu tiên của mỗi bản ghi là bản ghi được liên kết, và một No kèm reviewer và lý do của nó.

**Những gì đã xây dựng.**
- Mỗi bản ghi có: bản ghi Change Control được liên kết, câu trả lời, reviewer, ngày rà soát, lý do (rationale), liên kết bằng chứng — và hai trường **chúng tôi thêm**: **Finding** (bản ghi nói về điều gì, bắt buộc) và **Market** (tùy chọn).
- Một Yes cần một bản ghi liên kết hợp lệ; một No cần reviewer và lý do; một bản ghi Pending (hoặc chưa trả lời) chặn Gate 12.
- **Một danh sách trống sẽ chặn, trừ khi đã có một bản ghi Change Control đang mở trên dự án** (trong trường hợp đó mục áp dụng và được đánh giá dựa trên bằng chứng của chính bản ghi đó). Một đợt rà soát không tìm thấy gì cần change control sẽ ghi một bản ghi được trả lời **No**, kèm lý do ("no finding this period needed a change control").

**Câu hỏi:**

**(a) Một bản ghi cho mỗi phát hiện — đúng không?** Hay nên là một cho mỗi đợt rà soát (ví dụ một ở đợt rà soát 3 tháng, một ở 12 tháng), hoặc một cho mỗi thị trường?

**(b) "Finding" trong quy trình của quý vị là gì, và một finding đến từ đâu?**
*Ví dụ:* một khiếu nại đơn lẻ có phải là một finding không, hay chỉ một xu hướng khiếu nại? Yêu cầu của cơ quan quản lý có phải không? Một báo cáo biến cố bất lợi? Một sự phản đối claim của nhà phân phối? Chúng tôi chỉ để reviewer mô tả bằng lời; nếu quý vị có định nghĩa, chúng tôi có thể đưa ra một danh sách để chọn thay thế.

*(Một đợt rà soát không tìm thấy gì cần change control được ghi lại như một bản ghi trả lời **No** kèm lý do, không bao giờ là việc không có bản ghi nào — đó là quy tắc riêng của chúng tôi và không cần câu trả lời.)*

**(c) Finding và Market có đủ để phân biệt các bản ghi không?** Hay quý vị muốn có thêm điều gì khác trên mỗi bản ghi (ví dụ nguồn: khiếu nại, tín hiệu an toàn, yêu cầu của cơ quan quản lý)?

## Câu hỏi 3 — Một phát hiện an toàn đã bị thay thế (superseded) có cần cùng bằng chứng đóng như một phát hiện đã đóng không?

*Vị trí trong ứng dụng:* Trang **Formulation Safety**, bảng **Critical Safety Findings** (Status "Superseded", cột Finding ID / Superseded by).

Quý vị đã đưa ra danh sách trạng thái phát hiện an toàn gồm sáu giá trị, thêm **Superseded** vào vòng đời năm bước. Riêng biệt, quý vị đã chỉ rõ việc đóng một phát hiện High hoặc Critical đòi hỏi những gì: kết luận của safety reviewer, một liên kết bằng chứng, hành động liên kết đã hoàn thành, việc xác minh, người xác minh và ngày đóng. Cả sáu hiện đều được ghi lại và kiểm tra.

Superseded không giống với đã đóng. Một phát hiện bị superseded khi một đánh giá sau đó về cùng mối nguy thay thế nó — nên bằng chứng của nó có thể nói là nằm ở phần thay thế chứ không ở chính nó.

*Ví dụ:* vào tháng Ba, một phát hiện **High** được nêu ra: "preservative level close to the limit in the trial batch". Vào tháng Năm, một đánh giá lại với dữ liệu độ ổn định mới tạo ra một phát hiện thay thế: "within the limit". Phát hiện tháng Ba được đánh dấu **Superseded**. Toàn bộ bằng chứng thực sự giờ nằm ở phát hiện tháng Năm.

**Những gì đã xây dựng.** Hai điều, trong đó điều đầu tiên là bổ sung riêng của chúng tôi (quý vị không yêu cầu):
- **Một phát hiện bị superseded phải nêu tên phát hiện đã thay thế nó.** "Superseded" chỉ có thể được chọn khi sổ có một phát hiện khác để trỏ tới, và phần thay thế được chọn từ các Finding ID của chính sổ đó, nên nó không thể trỏ vào chính nó hay vào hư vô.
- **Cách hiểu thận trọng về danh sách đóng của quý vị** (chỉ các phát hiện High và Critical): một phát hiện bị superseded cần cùng sáu thứ như một phát hiện đã đóng, để một phát hiện High hoặc Critical không trở nên qua được chỉ bằng cách đánh dấu superseded.

**Cái giá của điều đó.** Trong ví dụ, phát hiện tháng Ba vẫn phải mang một kết luận an toàn, một liên kết bằng chứng, một hành động liên kết đã hoàn thành, một việc xác minh, một người xác minh và một ngày đóng, dù phát hiện tháng Năm đã giữ bằng chứng. Một dòng superseded để dở dang sẽ chặn Gate 7. Hành động đã hoàn thành là thứ ít hợp lý nhất trong sáu thứ đối với một phát hiện đã bị thay thế.

**Câu hỏi:**

**(a)** Một phát hiện High hoặc Critical bị superseded có cần cùng bản ghi đóng như một phát hiện đã đóng không?

**(b)** Nếu không, thì trong sáu thứ, những thứ nào vẫn nên được yêu cầu ở nó, khi nó đã trỏ tới phần thay thế? *Ví dụ:* chỉ kết luận của safety reviewer nói vì sao nó bị thay thế, cộng với ngày đóng — và không gì khác.

## Câu hỏi 4 — Hai cột watch-list ở Gate 4: mỗi cột chứa gì, ai điền, và cập nhật đến gate nào?

*Vị trí trong ứng dụng:* Các register **Prohibited Ingredient Watch-list** và **Pregnancy / Breastfeeding Caution Limits** (cột Product status và cột phân loại Gate 4); cũng hiện trong danh sách readiness của Gate 4.

Ba câu hỏi trước đây của chúng tôi hóa ra đều nói về cùng hai cột trên các watch-list prohibited-ingredient và caution: **product status** và **classification**.

**Hiện trạng.** Quý vị nói mọi hàng của hai watch-list phải được phân loại ở Gate 4 (Gate 4 bao gồm những hàng nào được hỏi ở câu hỏi 33), mỗi hàng thành một trong sáu giá trị: *No issue identified · Needs Safety Review · Needs Regulatory Review · Prohibited — remove · Considered — not selected · Further information required.* Quý vị cũng nói "flagged" bao gồm ba trạng thái: *REVIEW — possible formula match · Needs Safety Review · Needs Regulatory Review.* "REVIEW — possible formula match" nằm trong danh sách flagged nhưng không nằm trong sáu giá trị, và ba trong sáu giá trị không nằm trong danh sách flagged. Vì vậy chúng tôi giữ **hai cột**: product status (danh sách cũ, gồm "possible formula match") và classification (sáu giá trị của quý vị). **Trên danh sách Prohibited Ingredients, hệ thống hiện tự đặt product status:** khi công thức khớp với một hàng, hệ thống ghi "REVIEW - possible formula match", và khi hết khớp thì đưa hàng về "No formula match recorded"; bất kỳ trạng thái nào do người dùng đã chọn đều được giữ nguyên. Trên danh sách Pregnancy / Breastfeeding Caution, status vẫn chỉ do người nhập. **Classification luôn do người nhập**; hệ thống không bao giờ tự ghi kết luận. Ở Gate 7, một hàng khớp mà vẫn ở trạng thái ban đầu ("No formula match recorded" / "Not assessed") sẽ chặn gate. (Cột trạng thái công việc của chính sheet, "Status", là cột thứ ba và tách biệt với cả hai.)

*(Hai cột riêng biệt — kết quả sàng lọc tìm thấy, và kết luận của reviewer — cùng việc hệ thống tự gắn cờ một trường hợp khớp công thức trên danh sách Prohibited, là các quy tắc riêng của chúng tôi, để không có gì sàng lọc tìm thấy bị ghi đè hay mất đi; chúng không cần câu trả lời.)*

**(a)** Cờ tự động đó có nên áp dụng tương tự cho danh sách Pregnancy / Breastfeeding Caution, nơi hiện nay người dùng cập nhật hàng không?

**(b)** Product status được cập nhật đến gate nào? Câu trả lời của quý vị nói Gate 4 sàng lọc và đưa ra kết luận cho mọi hàng, còn Gate 7 phải đóng chính thức mọi vấn đề restricted hoặc caution áp dụng cho công thức cuối cùng. Câu trả lời không nói product status được chốt ở đâu. Chúng tôi hiểu là **Gate 7**: các cột của reviewer (assessment, reviewer, date, rationale, linked action, evidence, classification) thuộc về Gate 4, còn product status tiếp tục theo công thức cho đến Gate 7. Nếu chốt ở Gate 4, bất kỳ thay đổi công thức thông thường nào sau đó cũng sẽ buộc dự án quay lại Gate 4. Gate 7 có đúng không?

## Câu hỏi 5 — Supersession của phiên bản công thức: ai xác nhận mười dữ kiện, và khi nào phiên bản cũ đổi trạng thái?

*Vị trí trong ứng dụng:* Trang **Formula BOM**, thẻ **Formula supersession (per market)** và bảng **Formula version history** (cột State); trang **Project Overview** cũng có banner nhắc.

**Đã xây dựng.** Một phiên bản công thức cũ chỉ đạt *Superseded* khi một người đã xác nhận đủ mười dữ kiện quý vị liệt kê, cho **từng thị trường nơi phiên bản đó được bán**; không có gì tự suy ra.

*Ví dụ:* sản phẩm được bán ở Vietnam và Australia với công thức **F1.0**. Một thay đổi Major tạo ra **F2.0**, và F1.0 vẫn *Active* (vẫn đang bán). Vào tháng Ba, F2.0 được phê duyệt ra mắt ở Vietnam, nên F1.0 chuyển sang *Transition in Progress* (trạng thái của cả phiên bản, không phải của một thị trường). Lúc này, với Vietnam, ai đó phải ghi lại ngày phát hành cuối cùng của F1.0, hàng tồn còn lại được xử lý thế nào, artwork và danh sách thành phần nào thay đổi, cơ quan quản lý đã được thông báo chưa, cập nhật PIF, thông điệp của Sales and Marketing, v.v. Chỉ khi cả mười dữ kiện được xác nhận thì F1.0 mới thành *Superseded* ở Vietnam. Australia được quyết định riêng.

**(a) Ai xác nhận?** Câu trả lời của quý vị nói "an authorised person" nhưng không nói là ai. Chúng tôi hiểu là **Lead của dự án**: Lead (hoặc một quản trị viên) xác nhận cả mười dữ kiện cho một thị trường dưới tên của mình, trong khi bất kỳ ai có quyền chỉnh sửa đều có thể lưu bản nháp. Nhưng mười dữ kiện này rõ ràng thuộc về các bộ phận khác nhau — trong ví dụ, hàng tồn thuộc Supply Chain còn thông báo cho cơ quan quản lý thuộc Regulatory. Một người chịu trách nhiệm (Lead) có đủ không, hay mỗi dữ kiện nên do bộ phận của nó xác nhận?

**(b) Khi nào phiên bản cũ đổi trạng thái?** Câu 2 của quý vị nói "approval of the new version places the old version into Transition in Progress". Chúng tôi hiểu "approval" là **phê duyệt ra mắt của phiên bản mới ở một thị trường nơi phiên bản cũ đang được bán**. Vì vậy sau một thay đổi Major, phiên bản cũ vẫn *Active* cho đến lúc đó (như trong ví dụ). Phê duyệt ra mắt có phải là thời điểm đúng không, hay là phê duyệt Gate 10 hoặc Gate 11?

**(c) Một thay đổi Minor.** Một thay đổi Minor không mở lại gate nào, nên chúng tôi cho phiên bản cũ bắt đầu chuyển tiếp **ngay lập tức** ở mọi nơi nó được bán, không chờ phê duyệt ra mắt. Như vậy có đúng không?

**(d) Một phiên bản chưa từng ra mắt.** Nếu phiên bản cũ chưa từng được bán ở đâu, chúng tôi đánh dấu *Superseded* ngay, vì không có gì để chuyển tiếp. Có được xử lý như vậy không?

**(e) Các đợt rà soát sau ra mắt.** Khi hai phiên bản cùng được bán trên một thị trường, chúng tôi giữ các đợt rà soát sau ra mắt **theo từng thị trường**, tính từ lần ra mắt sớm nhất còn đang bán ở đó. Các đợt rà soát có cần được giữ theo từng phiên bản không?

## Câu hỏi 6 — Ai quyết định một thay đổi đối với mục Claims Library là "critical"?

*Vị trí trong ứng dụng:* Trang cấp công ty **Claims Library** (menu "Company Reference Data"): thao tác Withdraw và danh sách **Affected claims**.

**Thư viện đã được xây dựng, điều này làm câu hỏi sắc nét hơn thay vì trả lời nó.** Một mục cần cả phê duyệt Technical và Regulatory thì mới được tính là approved wording. Việc withdraw một mục hiện yêu cầu có lý do, ngày hiệu lực và kế hoạch chuyển tiếp, đồng thời liệt kê mọi claim dự án, SKU, thị trường và bản ghi đã công bố phụ thuộc vào nó, trên tất cả các dự án. Các claim bị ảnh hưởng sau đó không còn được tính là được bao phủ bởi approved wording, nên quay lại bước Regulatory review.

**Những gì nó không làm:** nó không gỡ bất cứ thứ gì khỏi thị trường, và không tự mở Change Control. Câu trả lời của quý vị nói một sản phẩm không được gỡ bỏ "unless the change is critical or required by Regulatory", và ai đưa ra quyết định đó là điều được hỏi dưới đây.

Quý vị đã chỉ rõ điều gì xảy ra khi một mục thư viện bị thay đổi hoặc withdraw: xác định mọi claim, SKU, thị trường và tài liệu đã công bố có liên kết, đánh giá tác động, tạo change control khi cần, gắn cờ tài liệu để rà soát lại, và ghi lại ngày hiệu lực cùng kế hoạch chuyển tiếp. Sau đó: *"Changing or withdrawing must not automatically remove a product from the market unless the change is critical or required by Regulatory."*

Câu đó có thể kéo một sản phẩm đang bán xuống, nên chúng tôi không muốn tự diễn giải.

*Ví dụ:* mục thư viện "Hydrates for 24 hours" được dùng bởi 6 claim, trên 3 SKU, ở Vietnam và Singapore, và xuất hiện trên 2 trang web đã công bố. Regulatory thấy thử nghiệm 24 giờ không còn hỗ trợ cho cách diễn đạt này và withdraw mục đó. Chúng tôi liệt kê tất cả những thứ trên, và 6 claim quay lại Regulatory review. Không có gì bị gỡ khỏi thị trường và không có Change Control nào được mở. Sản phẩm có nên bị rút khỏi Vietnam vì Regulatory yêu cầu không? Ai quyết định việc withdraw này là "critical"?

**(a)** "Critical" ở đây có phải là mức cao nhất của thang Low / Medium / High / Critical mà ba câu trả lời khác của quý vị đã thống nhất không?

**(b)** Ai ghi nhận nó — chỉ Regulatory, hay Technical và Regulatory cùng nhau, giống như quý vị đã chỉ định cho việc phê duyệt một mục thư viện ngay từ đầu?

**(c)** Câu trả lời của quý vị nói tạo một Change Control "where required". Việc withdraw hoặc thay đổi một mục có nên tự động mở một Change Control, hay chỉ khi có người cho là cần thiết — và nếu vậy thì ai?

## Câu hỏi 7 — Trigger scale-up ở Gate 9: mười tám lĩnh vực dùng để làm gì, và thế nào là "new formula"?

*Vị trí trong ứng dụng:* Trang **Phase 3**, tab **Gate 9**, khối "Scale-up risk identified?" kèm danh sách mười tám khu vực bên dưới; điều kiện "new formula" đọc checklist **Development / Change Type** (Gate 1) của trang **Phase 1**.

Câu trả lời Round 3 của quý vị làm cho trạng thái scale-up hoặc pilot trở thành bắt buộc đối với "new formulas, major reformulations …", và câu trả lời Round 4 liệt kê mười tám lĩnh vực kích hoạt một đợt rà soát scale-up hoặc pilot — manufacturing site, equipment type or scale, batch size, order of addition, mixing speed, homogenisation, heating profile, hold time, filling method, water source và những mục còn lại. Quý vị cũng thêm một câu hỏi, "Scale-up risk identified? Yes / No / Pending assessment", trong đó Pending chặn Gate 9.

**Những gì đã xây dựng.** Ở Gate 9, mục scale-up áp dụng khi **bất kỳ** điều nào sau đây đúng: tồn tại một thay đổi công thức Major; *Development / Change Type* của dự án ở Gate 1 có **New development** được tick (primary hoặc secondary); hoặc reviewer trả lời Yes. Một câu trả lời để trống hoặc Pending sẽ chặn gate. Mười tám lĩnh vực được hiển thị bên cạnh câu hỏi của reviewer như một lời nhắc về những gì nên kích hoạt đợt rà soát.

**(a) Mười tám lĩnh vực dùng để làm gì — lời nhắc, hay dữ liệu có người ghi lại?** Chúng mô tả các *thay đổi*: đổi nhà máy, cỡ mẻ từ 50 kg lên 500 kg, đổi tốc độ khuấy. Hiện nay chúng chỉ hiện thành một danh sách bên cạnh câu hỏi của reviewer, như một lời nhắc. Chúng không phải trigger tự động, vì hai lý do.

*Trước khi Gate 9 qua.* Phần mềm không có trường nào ghi lại một thay đổi như vậy theo dạng có cấu trúc (thứ liên quan duy nhất là cột "Manufacturing site" nhập chữ tự do trong một sổ).
*Ví dụ:* khi Gate 6 đang mở, nhóm sản xuất chuyển mẻ sang nhà máy khác và tăng cỡ mẻ từ 50 kg lên 500 kg. Không có gì trong phần mềm ghi "đã đổi nhà máy". Ở Gate 9, người trả lời "Scale-up risk identified?" đọc danh sách bên cạnh câu hỏi, nhớ hoặc tra lại điều đã thay đổi, và trả lời **Yes**. Họ không sửa Gate 6 — gate đó khi ấy đã đóng — mà trả lời câu hỏi của chính Gate 9.

*Sau khi Gate 9 đã qua.* Gate đã đóng, nên đọc danh sách ở đó không quyết định được gì. Một thay đổi đến lúc ấy thuộc về Change Control: việc nó có mở lại một gate đã qua hay không là câu hỏi 10.

Quý vị muốn gì? **(i)** Danh sách vẫn là lời nhắc cho người trả lời câu hỏi. **(ii)** Nó trở thành thứ được ghi lại khi một thay đổi xảy ra — ví dụ các lĩnh vực được tích trên một bản ghi Change Control — và Gate 9 tự bật mục scale-up khi có một lĩnh vực được tích. **(iii)** Chính phần đánh giá trở thành một danh sách với **một bản ghi cho mỗi lĩnh vực bị ảnh hưởng**, thay cho một câu Yes / No cho cả dự án. Nếu chọn (ii) hoặc (iii), nên ghi ở đâu?

*(iii) sẽ trông thế nào.* Mỗi bản ghi nêu lĩnh vực (một trong mười tám), điều gì đã đổi (ví dụ cỡ mẻ 50 kg → 500 kg), câu trả lời rủi ro (Yes / No / Pending), lý do, hoạt động pilot hoặc scale-up cần làm, link bằng chứng, ai đánh giá và khi nào. "Scale-up risk identified?" của dự án khi đó được suy ra từ các bản ghi: là Yes khi có bản ghi nào là Yes, và Gate 9 vẫn bị chặn khi còn bản ghi Pending. Một lần đánh giá không thấy gì được ghi bằng một bản ghi trả lời No kèm lý do, không phải bằng danh sách rỗng. Chúng tôi đã chọn cấu trúc này cho câu 2 (một bản ghi cho mỗi phát hiện hậu mãi) vì một câu trả lời đơn không nói được nó nói về thay đổi nào; ở đây lý do cũng vậy, vì một nhà máy mới và một tốc độ khuấy khác mang rủi ro, công việc pilot và bằng chứng khác nhau. Câu hỏi của quý vị ở dạng một câu đơn, nên chúng tôi chưa xây — một bản ghi cho mỗi lĩnh vực có đúng ý quý vị không?

Nếu quý vị chọn (iii), có hai điểm nhỏ về chính mười tám lĩnh vực. Thứ nhất, chúng không cùng một loại: một số về quy trình và quy mô (nhà máy, thiết bị, cỡ mẻ, khuấy, gia nhiệt, thời gian giữ), một số về chính công thức (formula composition, nồng độ hoạt chất hoặc chất bảo quản), và mục cuối — "any change identified by Manufacturing, Quality or R&I as potentially affecting product performance" — là một mục mở. Lĩnh vực của mỗi bản ghi nên được chọn từ một danh sách phẳng, hay từ các nhóm? Thứ hai, khi ai đó chọn mục mở cuối cùng, họ có nên mô tả thay đổi đó bằng chữ tự do không?

**(b) "New formula".** Chúng tôi hiểu một công thức mới là một dự án có *Development / Change Type* được tick **New development** ở bất kỳ vai trò nào; một reformulation lớn đã được bắt bằng phiên bản công thức Major. Điều này có khớp với ý quý vị không? Một Reformulation không phải Major có nên được tính không, và một tick secondary có nên được tính không?

**(c) Câu trả lời "No" cho một new development.** Vì một new development luôn bật mục này, câu trả lời **No** của reviewer bị bỏ qua đối với nó: một công thức mới không bao giờ có thể được tuyên bố là không có rủi ro scale-up. Đó có phải là điều quý vị muốn không?

## Câu hỏi 8 — Thẩm quyền Safety hoặc Regulatory để chấp nhận một finding trên watch-list nằm ở đâu: ở reviewer, hay ở người phê duyệt gate?

*Vị trí trong ứng dụng:* Các register **Prohibited Ingredient Watch-list** và **Pregnancy / Breastfeeding Caution Limits**: cột Reviewer assessment, Reviewer, Owner; cùng phần ký gate của Approver.

Câu trả lời của quý vị về dấu vết reviewer của watch-list (câu 32(c)) nói một finding trên watch-list bị gắn cờ có thể được mang theo dưới *Proceed with Conditions* khi, cùng với các điều kiện khác, *"the gate approver has the required Safety or Regulatory authority"*, và *"a separate duplicate acknowledgement is not required"*.

Đọc theo nghĩa đen, người ký toàn bộ gate với tư cách Approver phải có thẩm quyền Safety hoặc Regulatory vì một thành phần. Điều đó khiến một chuyên gia Safety hoặc Regulatory phải chịu trách nhiệm về mọi thứ khác mà gate bao gồm — công thức, bao bì, claim — và Lead của dự án, người chỉ định approver, không thể biết khi chỉ định rằng finding nào sẽ còn mở.

Vì vậy chúng tôi đã xây dựng theo hướng ngược lại, và muốn quý vị xác nhận. **Thẩm quyền nằm ở reviewer có đủ năng lực, người ghi nhận assessment.** Việc ghi nhận một assessment là *Non-critical* hoặc *Further information required* (hai giá trị cho phép một finding được mang theo dưới Proceed with Conditions) chính là sự chấp nhận, và nó cần thẩm quyền mà finding nêu tên: Safety cho *Needs Safety Review*, Regulatory cho *Needs Regulatory Review*, và với một finding phát sinh sau bước sàng lọc công thức (*possible formula match*) thì là bộ phận nào mà cột Owner của hàng nêu tên (bộ phận nào cũng được nếu nó nêu cả hai hoặc không nêu bộ phận nào). Cột Owner được đọc đúng như workbook định nghĩa — bộ phận chịu trách nhiệm về hàng, không phải một cá nhân — và Reviewer là một người được chọn từ những người dùng có thẩm quyền đó, và chỉ Reviewer đó (hoặc một quản trị viên) mới ghi nhận hai loại assessment này. Sau đó gate được ký như bình thường — danh sách readiness đã kiểm tra mọi finding bị gắn cờ.

**Ví dụ.** Một công thức chứa một thành phần mà bước sàng lọc công thức đã gắn cờ trên watch-list Prohibited Ingredients, với status *Needs Safety Review*. Trên hàng đó của watch-list:

1. Ai đó chọn **Reviewer** của hàng. Danh sách chỉ đưa ra những người có thẩm quyền Safety, vì status nêu tên Safety. Một chuyên gia Regulatory không được đưa ra.
2. Reviewer Safety đó ghi nhận **Reviewer assessment** là *Non-critical*, viết rationale và liên kết một controlled action. Đây là điều chúng tôi hiểu là "chấp nhận" finding: đó là một kết luận được ghi lại trên hàng, gắn với người đó, không phải một chữ ký vẽ tay và không phải một bước authenticator.
3. Tại gate, danh sách readiness kiểm tra mọi finding bị gắn cờ. Finding này qua được kiểm tra vì nó có kết luận từ một reviewer đủ năng lực, một rationale và một controlled action.
4. Approver của gate là approver tổng thể của dự án và không có thẩm quyền Safety. Phần mềm cho phép Approver đó ký *Proceed with Conditions*, vì bước 2 đã xảy ra trên hàng.

**Những gì phần mềm từ chối.** Nếu một chuyên gia Regulatory cố ghi nhận assessment trên chính hàng đó, nó sẽ bị từ chối, vì hai lý do: status của hàng nói finding thuộc về Safety, nên một chuyên gia Regulatory không thể được chọn làm Reviewer của nó; và chỉ người được chọn làm Reviewer (hoặc một quản trị viên) mới có thể ghi nhận assessment *Non-critical* hoặc *Further information required*. Nếu cột Owner của hàng nêu cả hai bộ phận, hoặc không nêu bộ phận nào, thì reviewer Safety hoặc Regulatory đều có thể ghi nhận.

**Một câu trả lời "không" nghĩa là gì.** Nếu thẩm quyền phải nằm ở người phê duyệt gate, thì mọi gate có mang finding bị gắn cờ sẽ cần một Approver có thẩm quyền Safety hoặc Regulatory, và Lead sẽ phải biết điều đó khi chỉ định — kể cả với một finding phát sinh sau.

**Câu hỏi (a):** thẩm quyền này nằm ở reviewer ghi nhận assessment, thay vì ở người phê duyệt gate, có đúng không?

**Câu hỏi (b):** mọi loại assessment trên gate có cần một thẩm quyền kiểu này không, hay chỉ hai loại cho phép một finding được mang theo dưới Proceed with Conditions?

## Câu hỏi 9 — Điều gì làm một action trở thành "controlled", và owner cùng due date của nó nằm ở đâu?

*Vị trí trong ứng dụng:* Khối **Gap assessment** trên tab gate (khi Stage status là Gap) và bảng **Next Actions** trên tab đó.

Các câu trả lời của quý vị dùng khái niệm controlled action ở một số chỗ, mỗi chỗ để ngỏ một điều. Cùng một câu hỏi cho một yêu cầu Should hoặc Could bị hoãn nằm ở câu hỏi 15; chỉ cần trả lời một lần.

**Với một High gap.** Trước hết là một sự phân biệt, vì các câu trả lời của quý vị dùng cùng cụm từ cho hai bản ghi khác nhau. Một **finding** là một hàng bị gắn cờ trong một sổ (register) (ví dụ các watch-list hoặc các safety finding). Một **gap** là Gap assessment được ghi trên một gate khi status của nó là Gap. Với finding, câu trả lời 33(c) của quý vị rất rõ: *"A controlled Next Action is required for: Critical findings · High findings · Medium findings requiring corrective activity. Free text may describe the action but must not replace the controlled action record."* Với gap quý vị chưa nói tương tự, nên phần còn lại của đoạn này chỉ nói về gap, và chúng tôi hỏi liệu quy tắc của finding có nên áp dụng sang không. Câu trả lời về critical-gap của quý vị cho phép một High gap được mang theo có điều kiện khi, cùng các điều kiện khác, *"a controlled action and due date are recorded"*. Câu trả lời F7 của quý vị đã nói controlled action là gì: *"A controlled Next Action is created. The action has an owner, due date and escalation condition."* Nhưng tám trường quý vị liệt kê cho một gap lại đưa **Required action** và **Action owner** như các trường thông thường và không có ngày, nghe như phiên bản tự chứa. Vì vậy hiện nay nửa điều kiện về ngày **không được thực thi** — chúng tôi không đoán thêm trường thứ chín, và trong khi chờ, màn hình yêu cầu người dùng ghi ngày vào nội dung action. Một High gap có nên trỏ tới một Next Action được theo dõi, như F7 mô tả và như quý vị đã yêu cầu cho finding không? Và yêu cầu này có áp dụng cho Medium và Low gap không?

*Ví dụ:* một High gap ghi "stability data missing". Theo cách đọc F7, gap liên kết tới một Next Action "Run 3-month stability, owner R&I, due 30 Nov, escalate if late"; owner và ngày nằm ở đó. Theo cách đọc tự chứa, các trường *Required action* và *Action owner* của chính gap giữ thông tin này và không có ngày ở đâu cả.

*Lựa chọn nhanh:* **(1)** High gap (và cao hơn) phải liên kết một Next Action được theo dõi; Medium và Low vẫn là free text · **(2)** mọi gap đều phải liên kết một · **(3)** các trường của chính gap là đủ, và một ngày được thêm vào gap · **(4)** khác.

*(Dạng sản phẩm bị để ngỏ ở Gate 2 không cần controlled action: nó được ghi trong trường *Confirmed product form*, là một bản ghi tường minh chặn Gate 5 cho đến khi được điền, nên không còn gì phải nhớ — quyết định riêng của chúng tôi, không cần câu trả lời.)*

## Câu hỏi 10 — Nếu một Change Control nêu tên một gate đã passed, gate đó có nên được mở lại không?

*Vị trí trong ứng dụng:* Trang **Change Control & Communication** (Change Control Log, "Change trigger reference — affected gates & phases") so với bảng **Phase Gate Flow** và dấu cảnh báo gate trên các trang phase.

**Một trường hợp cụ thể.** Một dự án kem. Change Control **CHG-014**: trigger *Ingredient added or removed*, affected area *Formula / ingredient*, risk *High*, được mở vào tháng Tám. Một Change Control không có trường gate nhập tay: các gate nó ảnh hưởng lấy từ trigger của nó, và với trigger này là **Gate 05 và Gate 08**. Gate 5 (khóa công thức) đã passed vào tháng Ba và Gate 8 (testing) vào tháng Năm; dự án hiện ở Gate 10. Một Change Control chỉ có thể được mở sau khi gate sớm nhất mà nó nêu tên đã passed (ở đây là Gate 5), vì mục đích của nó là sửa một thứ đã bị khóa ở đó (ngoại lệ duy nhất là trigger "any change", nêu tên mọi gate và luôn có thể được mở). Vì vậy đây là tình huống thường gặp, không hiếm.

**Màn hình hiện hiển thị gì.** Gate 5 và Gate 8 đều vẫn ghi "Proceed", đúng như trước, mỗi gate có một dấu cảnh báo nhỏ nói rằng một thay đổi đang mở ảnh hưởng đến nó. Không có gì khác xảy ra, và việc đóng CHG-014 sau đó cũng không chạm vào gate nào. Gate 5 nói "formula locked and approved" trong khi công thức đang được xem xét để thay đổi.

**Gate 11 và 12 hoạt động khác, và chúng tôi chỉ nhận ra điều này khi kiểm tra.** Gate 11 (release) có một check "no blocking change is open", và nó đọc danh sách các thay đổi mỗi lần được hiển thị. Vì vậy:
- Thứ Hai: Gate 11 được ký và passed.
- Thứ Tư: ai đó mở **CHG-021**, một thay đổi High-risk về nhãn, có trigger nêu tên Gate 11.
- Check thất bại, và Gate 11 **tự ngừng được tính là passed** — không ai mở lại nó, và không có gì ghi lại lý do.

Gate 12 làm điều tương tự thông qua check change-control của nó (chúng tôi đã thử trên một dự án có post-market review được trả lời "No": check qua, và thất bại ngay khi một thay đổi được mở). Cả hai đều được thử ở mức của check, chưa thử trên một gate đã ký đầy đủ trong ứng dụng.

| | Mở một Change Control đối với một gate đã passed |
|---|---|
| Gate 1 đến 10 | gate không thay đổi; chỉ có dấu cảnh báo |
| Gate 11 và 12 | gate tự ngừng được tính là passed, không có ghi nhận lý do |

Sự khác biệt này là hệ quả ngẫu nhiên của cách các check được viết, không phải một quyết định. Quy tắc riêng của chúng tôi là một gate đã passed không bao giờ được âm thầm ngừng được tính là passed: bất kể điều gì xảy ra với Gate 11 và 12, nó sẽ để lại một lý do được ghi trong lịch sử của gate, nên chỉ Câu hỏi A dưới đây cần câu trả lời của quý vị.

**Câu hỏi — Gate 1 đến 10.** Khi một Change Control nêu tên các gate đã passed (CHG-014 nêu tên Gate 05 và 08), điều gì nên xảy ra với các gate đó?
- **(1) Chỉ cảnh báo.** Việc mở lại một gate đã passed vẫn là một bước có chủ ý do một người thực hiện (một Backtrack). Không có gì xảy ra sau lưng ai, nhưng thay đổi và gate có thể không khớp nhau.
- **(2) Mở lại các gate mà thay đổi nêu tên.** Mỗi gate như vậy phản ánh thực tế, và quyết định duy nhất được phép trên nó sau đó là "Proceed with Conditions". Đây sẽ là lần đầu tiên một gate đơn lẻ được mở lại riêng; hiện nay một gate chỉ mở lại khi một người chọn làm vậy, hoặc khi một thay đổi công thức Major mở lại cùng lúc một khối gate cố định.
- **(3) Khác.**

**Nếu quý vị chọn (2), xin cho chúng tôi biết thêm:**
- *Những gate nào trong số được nêu tên?* CHG-014 nêu tên Gate 05 và Gate 08. Cả hai nên mở lại, hay chỉ gate sớm nhất (Gate 05), và Gate 08 mở theo sau khi Gate 05 được quyết định lại?
- *Những thay đổi nào?* Mọi thay đổi, hay chỉ một số (ví dụ chỉ các thay đổi rủi ro cao)?
- *Nếu thay đổi sau đó bị Rejected hoặc Cancelled.* Câu trả lời F9 của quý vị nói Completed, Rejected, Cancelled và Superseded là đã đóng khi final disposition được ghi. Gate có thực sự bị ảnh hưởng không? Hoặc gate vẫn phải được xác nhận lại một cách tường minh (không bao giờ tự động khôi phục về những gì nó ghi trước đó), hoặc một thay đổi bị rejected sẽ giải phóng nó.
- *Quyết định lại.* "Proceed with Conditions" có đủ không, hay còn cần một giải thích bằng văn bản hoặc một người được nêu tên?
- *Hai thay đổi trên cùng một gate.* Điều gì xảy ra khi hai thay đổi đang mở cùng nêu tên một gate?

**Hiện đã xây dựng gì.** Không có gì tự động xảy ra với một gate đã passed ở Gate 1 đến 10. Nếu quý vị chọn (2), chúng tôi sẽ chỉ mở lại gate được nêu tên và chỉ cho phép "Proceed with Conditions" sau đó, trừ khi quý vị nói khác.

## Câu hỏi 11 — Có chín nơi ghi lại một thay đổi. Nên có bao nhiêu?

*Vị trí trong ứng dụng:* Trang **Change Control & Communication** và các register **Formulation Change Register**, **Formula Change Control**, **Artwork Change Control**, **Released Label vs Current Artwork Register**, **Development Iteration Log**, **Ingredient Substitution Evidence**, **Product Family & Version Register**; lịch sử version ở **Formula BOM**.

Đây là câu hỏi chúng tôi muốn được trả lời nhất, và là câu hỏi chúng tôi đã dừng công việc cho đến khi quý vị trả lời.

**Một tình huống.** Nhóm tạo một phiên bản công thức **major** mới. Phần mềm supersede phiên bản trước, mở lại Gate 4 đến 12 (bao gồm cả các bản ghi Gate 10–12 cấp dự án) và hủy các phê duyệt phase bao phủ chúng, và nó ghi một dòng vào *Formulation Change Register* (đánh số FC-001). Nhưng nó **không** tạo bản ghi nào trong *Change Control & Communication Log* (đánh số CHG-001). Vì vậy khi Gate 11 hỏi "is any change open that affects release?", nó chỉ nhìn vào log Change Control, và hoàn toàn không thấy thay đổi công thức.

**Chín nơi.** Đếm qua workbook thay vì theo cảm nhận, bảy nơi giữ bản ghi về một thay đổi đã xảy ra, và hai nơi liệt kê các *loại* thay đổi và ai ký từng loại:

| Ghi lại một thay đổi đã xảy ra | Liệt kê các loại thay đổi |
|---|---|
| Change Control & Communication Log | Formula Change Control (năm loại thay đổi công thức) |
| Formulation Change Register (Final Approver Controlled — the final approver is NP) | Artwork Change Control (năm loại thay đổi artwork) |
| Released Label vs Current Artwork Register | |
| Development Iteration Log | |
| Ingredient Substitution Evidence | |
| Product Family & Version Register | |
| Formula version history | |

(Nơi thứ mười, Change Templates / Forms, là danh sách form nào cần dùng — rõ ràng lại khác nữa.)

**Những gì chúng tôi đo được, thay vì cảm nhận.**
1. **Hai trong số này chạy song song và không biết về nhau** (CHG- và FC- ở trên). Vì một thay đổi công thức major chỉ đi theo đường FC, bốn thứ áp dụng cho mọi thay đổi khác lại không áp dụng cho nó: phép cascade phiên bản có mở lại Gate 10 đến 12, nhưng không có bản ghi Change Control nên không gì **giữ Gate 10 hoặc 11** trong khi thay đổi đang mở; **Gate 11 không cân nhắc tác động của nó**, dù câu trả lời của chính quý vị yêu cầu Gate 11 đánh giá tác động của từng thay đổi đang mở; nó được đóng bằng một tick "Closed?" duy nhất thay vì final disposition tám phần quý vị chỉ định ở Round 4; và nó không mang phân loại tác động, nên không gì có thể đánh dấu nó là ảnh hưởng đến ra mắt. Thay đổi nặng nhất mà hệ thống biết đi theo con đường mà bộ máy change không thể thấy.
2. **Hai sheet làm hai việc cùng lúc.** Formula Change Control liệt kê năm *loại* thay đổi, nhưng chính năm hàng đó lại mang Old version, New version và Status, vốn thuộc về một thay đổi cụ thể. Mọi thay đổi thành phần mà một sản phẩm sẽ có đều dùng chung một ô Old version, và lần thứ hai ghi đè lần đầu.
3. **Các sheet tham chiếu nhau bằng văn bản gõ tay.** Có ít nhất năm cột trỏ từ một bản ghi thay đổi sang một bản ghi khác (Change register ID, Change Control & Communication ID, Linked Change ID trên hai sheet, Artwork_Change_Control ref), và không gì kiểm tra rằng thứ được gõ có tồn tại.

**Hai cách đọc về lý do có nhiều sheet như vậy, và chúng tôi muốn quý vị sửa hơn là chấp nhận một trong hai.**
- **Một bản ghi, hiển thị nhiều cách.** Một bảng tính không có cách nào khác để nói "only NP approves this" hoặc "show me only the artwork ones", nên một sheet riêng *chính là* quyền hạn và bộ lọc. Phần mềm có quyền hạn và các view đã lọc, nên một bản ghi hiển thị nhiều cách có thể nói điều tương tự mà không cần lặp.
- **Nhiều bản ghi thực sự khác nhau.** Ba sổ công thức có thể mô tả ba giai đoạn: *Development Iteration Log* (công thức chưa khóa), *Formulation Change Register* (một thay đổi đối với công thức đã được kiểm soát, với các câu hỏi riêng về việc đăng ký lại sáu tháng ở Vietnam và thị trường đã được thông báo chưa, những câu hỏi vô nghĩa với một công thức còn đang thử nghiệm), và *Change Control & Communication Log* (bất kỳ thay đổi nào, mọi loại). Nếu đội của quý vị nhìn nhận như vậy, chúng không phải bản trùng lặp, việc gộp chúng sẽ là một sai lầm nghiêm trọng, và câu hỏi thực sự là ranh giới nằm ở đâu.

**Một sự thật liên quan đến cách đọc thứ hai.** Một phiên bản công thức mới chỉ có thể được tạo khi Gate 5 là gate đang mở, tức là trước khi công thức được khóa. Vì vậy mọi mục Formulation Change Register mà phần mềm ghi đều mô tả một thay đổi đối với công thức **chưa được khóa**. Một thay đổi sau khi khóa không thể tạo phiên bản hay mục FC; nó cần một Backtrack về Gate 5 trước. Hiện nay không quy tắc nào giữ Development Iteration Log và Formulation Change Register tách biệt, và trên thực tế sổ thay đổi có kiểm soát chỉ nhận các mục trước khi khóa.

**Các câu hỏi**

**(1) Một loại bản ghi thay đổi, hay nhiều loại?** Theo cách đội của quý vị thực sự làm việc, có **một** loại bản ghi thay đổi, hay **nhiều** loại thực sự khác nhau? Nếu nhiều, loại nào khác nhau và điều gì làm chúng khác? Trong chín nơi trên, nơi nào nhằm liệt kê các *loại* thay đổi, và nơi nào nhằm ghi các thay đổi thực sự xảy ra? Và khi một thay đổi ảnh hưởng đồng thời đến công thức, artwork và một claim, đó là **một** bản ghi hay nhiều bản ghi liên kết, mỗi lĩnh vực một bản ghi?

**(2) Ranh giới nằm ở đâu?** Đường phân chia giữa Development Iteration Log và Formulation Change Register có phải là lúc công thức được **khóa ở Gate 5** — thử nghiệm trước đó, thay đổi có kiểm soát sau đó? Nếu là thứ khác, thì là gì?

**(3) Phê duyệt của Final Approver (NP).** Formulation Change Register có hai mươi mốt cột, như trong workbook, và ba cột thuộc về Final Approver: quyết định phê duyệt thương mại, ngày của nó và sign-off. Mười tám cột còn lại (change ID, sản phẩm, ai yêu cầu và khi nào, tiêu đề, thay đổi gì và vì sao, ai thay đổi, các action của NPD, Regulatory, Manufacturing và Marketing & Sales, việc đăng ký lại ở Vietnam, thị trường có cần được thông báo và đã được thông báo chưa, đã đóng chưa, status tổng thể, ai đã xác nhận đã nhận thông báo) bao phủ phần lớn cùng phạm vi với những gì log Change Control đã giữ. Sổ này có phải là một sổ độc lập, hay là một view của log Change Control được lọc theo các thay đổi công thức, với phê duyệt của Final Approver là một thẩm quyền được thực thi trên bản ghi dùng chung?

**(4) Thế nào là một "valid Change Control record"?** Câu 8 của quý vị nói *"If Yes, a valid Change Control record must be linked."* Trước đây đó là free text, nên một lỗi gõ hoặc số bản ghi của dự án khác cũng thỏa điều kiện. Hiện nó là một lựa chọn từ **các bản ghi Change Control của chính dự án này** (các số CHG-). Một hàng của Formulation Change Register (các số FC-) có được tính là một bản ghi không? Và "valid" có đòi hỏi điều gì ngoài việc tồn tại không, chẳng hạn bản ghi vẫn còn mở, hoặc bao phủ đúng loại thay đổi?

**Trong lúc này chúng tôi đang làm gì:** không gì cả. Chúng tôi có thể biến một trong số này thành sổ chủ vào ngày mai và hiển thị những cái khác như các view đã lọc, và trông sẽ gọn hơn ngay lập tức. Chúng tôi không làm vậy, vì nếu hai trong số các bản ghi này thực sự là hai thứ khác nhau, chúng tôi sẽ phải tách chúng ra lần nữa sau khi chúng đã được gộp và chứa dữ liệu thật. Không gì bị chặn khi chờ đợi; sự trùng lặp là nhìn thấy được chứ không nguy hiểm, ngoại trừ trường hợp duy nhất ở điểm 1, mà chúng tôi sẽ sửa mà không chờ đợi: việc tạo một phiên bản công thức Major sẽ luôn để lại một bản ghi Change Control, để phía change-control của hệ thống thấy nó (quy tắc riêng của chúng tôi, không cần câu trả lời).

## Câu hỏi 12 — Việc thêm một thị trường sau Gate 1 có mở lại các gate trước không?

*Vị trí trong ứng dụng:* Danh sách thị trường được nhập ở form **Create New Project** (trường "Countries / Markets", trên trang **All Projects**) và ở checklist **Target Countries / Markets** của trang **Phase 1**; mỗi thị trường sau đó có track riêng trong **Market Regulatory & Launch Tracking (Gates 10-12)**.

Khi một thay đổi về phạm vi mở lại những gì đã được quyết định. (Câu hỏi 10 hỏi điều tương tự về Change Control.)

**Thêm một thị trường sau Gate 1.** Các thị trường được khai báo ở Gate 1, và những gì một gate đã quyết định thường chỉ đọc sau khi gate đó đã passed — muốn đổi thì dự án phải bị đưa ngược lại (một Backtrack). Quý vị đã xử lý thị trường mới khác đi: *"may also trigger review of earlier gates where the new market has different ingredient, claim, packaging or safety requirements."* Vì vậy hiện nay một thị trường có thể được thêm sau Gate 1 **mà không cần Backtrack, và không có gì được mở lại**: thị trường mới chỉ có track Gate 10–12 riêng. Việc gỡ một thị trường đã có lịch sử bị từ chối; thay vào đó thị trường được đánh dấu Withdrawn.

*Ví dụ:* một dự án đang ở Gate 9 với Việt Nam và Singapore. Ai đó thêm Úc. Hiện nay dự án tiếp tục đúng như trước, và Úc bắt đầu ở các track thị trường. Không ai đã xem quy định của Úc về chất bảo quản, claim hay bao bì có khác hai thị trường kia không.

Quý vị muốn cách nào? **(1) Giữ nguyên** — thêm tự do, không mở lại gì. **(2) Thêm một thị trường nghĩa là Backtrack về Gate 1**, như mọi thay đổi khác đối với những gì Gate 1 đã quyết định; mọi gate từ Gate 1 trở đi khi đó được mở lại cho tất cả thị trường, dù thị trường mới giống các thị trường cũ đến đâu. **(3) Chỉ mở lại những gì khác:** thị trường được thêm mà không Backtrack, nhưng các gate mà thị trường mới có yêu cầu khác sẽ được mở lại. Nếu (3): ai quyết định rằng thị trường mới "có yêu cầu khác" — ví dụ Regulatory, vào lúc thị trường được thêm — và mỗi loại khác biệt (thành phần, claim, bao bì, an toàn) mở lại những gate nào?


## Câu hỏi 13 — Phê duyệt "đóng" trên mọi sổ bằng chứng có đúng hình thức không?

*Vị trí trong ứng dụng:* Khung ký đóng register hiện trên mọi trang register bằng chứng ("closing for Gate N", chữ ký Review owner và Co-sign).

Mỗi sổ (register) hiển thị một dòng chú thích "Review owner · Co-sign", nhưng trước đây nó chỉ là chữ — bất kỳ ai cũng có thể thêm, sửa hoặc xóa một dòng bất kể tên nào được hiển thị. Chủ dự án đã yêu cầu một phê duyệt **đóng** có chủ đích: Review owner và Co-sign mỗi bên ký **cho một gate**, sau đó các cột được chốt tại gate đó (và, với sổ dạng tự do, các dòng của nó) trở thành chỉ đọc, trong khi các cột mà gate sau vẫn điền thì còn mở, và một gate không thể pass cho đến khi mọi sổ gắn với nó đã được đóng cho gate đó. Một vài sổ dùng khối sign-off ba vai trò của chính workbook thay thế, với mỗi vai trò do Lead của dự án chỉ định. **Điều này đã được xây dựng, theo chỉ thị của chủ dự án, trước khi hỏi quý vị** — đây là một quy tắc mới, không phải thứ được chép từ workbook, và chúng tôi muốn quý vị chỉnh lại ngay bây giờ hơn là để nó trở thành thói quen như thể đã được xác nhận chỉ vì nó chạy được.

**(a)** Quy tắc này có nên áp dụng cho **mọi** sổ gắn với một gate — hiện nay là 70 trên 78 sổ, mười trong số đó được đóng cùng với chữ ký của một sổ liên quan — hay chỉ cho một tập nhỏ hơn thực sự là hồ sơ được kiểm soát — giống như một vài sổ vốn đã có bước phê duyệt riêng chuyên dụng trước đây?

**(b)** **Hai** phê duyệt (Review owner và Co-sign) có phải là số lượng và cặp vai trò đúng không, hay một số sổ cần phê duyệt khác hoặc bổ sung?

**(c)** Với một số sổ, Review owner và Co-sign được xác định là **cùng một người**, vì chưa từng có Co-sign riêng nào được nêu cho lĩnh vực đó — nên "hai phê duyệt" thực chất là một người phê duyệt hai lần. Chúng tôi hiển thị cảnh báo thay vì chặn. Những lĩnh vực như vậy có nên có một Co-sign riêng biệt không? (Câu hỏi 23 hỏi câu rộng hơn về khi nào một người được giữ hai vai trò.)

## Câu hỏi 14 — Một dòng yêu cầu ở Phase 2, 3 hoặc 4 có thể được đánh dấu "not applicable" không?

*Vị trí trong ứng dụng:* Trang **Phase 2, 3 và 4**: các bảng requirement (cột Status có "N/A — rationale required").

Câu trả lời của quý vị cho câu hỏi 21 của Round-4 đã cho bảng yêu cầu Phase 1 một cách thứ ba để đóng một dòng: **N/A kèm lý do**, vì "the system must not require users to mark an empty requirement as Completed". Điều đó đã được xây dựng.

Tình huống tương tự tồn tại ở các bảng yêu cầu Phase 2, 3 và 4. Các dòng đó đến từ workbook và cố định, nên một dự án hoàn toàn có thể có dòng không áp dụng cho nó — ví dụ dòng "compatibility / use-with constraints" đối với một sản phẩm không có gì để dùng kèm.

**Những gì đã xây dựng.** Bảy bảng trong số đó (formulation design, efficacy and process, skincare for two, human study, stability and release, dossier evidence, change-control closure) cung cấp danh sách Status của chính workbook, trong đó có **N/A**. Chúng tôi cho chúng cùng lối thoát như Phase 1: chọn N/A sẽ yêu cầu một lý do bằng văn bản, và một dòng được đánh dấu N/A **kèm** lý do được tính là đã xử lý khi một gate kiểm tra nó. N/A không kèm lý do thì không. Bốn bảng compartment của Phase 3 (pregnancy, breastfeeding, infant, swimmer) không thay đổi: danh sách Status trong workbook của chúng không có N/A. Dòng duy nhất không bao giờ chấp nhận N/A là "Must-have product requirements" của Phase 1, mà câu trả lời của quý vị gọi là luôn bắt buộc.

**Câu hỏi:** như vậy có đúng với Phase 2–4 không — N/A kèm lý do được tính là đã xử lý — hay một số dòng trong đó nên được đối xử như "Must-have product requirements" và không bao giờ chấp nhận N/A? Nếu vậy, là những dòng nào?

**Riêng với sáu phần Infant & Baby Safety** — nhiều dòng mang các điều kiện giới hạn của chính quý vị ("where relevant", "where appropriate"), và danh sách Gate 8–9 được viết như một thực đơn ("trigger by use context and risk") thay vì một tập nghĩa vụ. Vì lý do đó chúng tôi cho các phần này tùy chọn N/A. Như vậy có đúng với chúng không?

## Câu hỏi 15 — Hoãn một yêu cầu Should hoặc Could: ai sở hữu, hạn là khi nào, và mỗi dòng có cần một mức ưu tiên không?

*Vị trí trong ứng dụng:* Trang **Phase 1**, bảng Gate 2 **Project Requirements & Exclusions** (cột Priority, Owner, Status) và **Next Actions**.

Câu trả lời Round-4 của quý vị cho câu hỏi 21 nói rằng một yêu cầu **Should** hoặc **Could** "may be deferred only through *Proceed with Conditions*, with an owner and due date". Nửa đầu đã được xây dựng: Gate 2 sẽ không chấp nhận Proceed thường khi một dòng như vậy chưa hoàn tất, và *Proceed with Conditions* gỡ chặn nó.

**(a)** Nửa sau chưa có chỗ để ghi. Một dòng yêu cầu có cột **Owner** nhưng không có hạn chót, và các Next Action — vốn có owner, hạn chót và điều kiện leo thang, thứ mà F7 gọi là controlled action — không có liên kết tới một dòng yêu cầu. Một yêu cầu bị hoãn nên đơn giản có thêm trường hạn chót trên chính dòng của nó, hay việc hoãn nên **tạo một Next Action được kiểm soát** trỏ ngược về dòng đó? Nếu là cách thứ hai, chúng tôi cũng sẽ chặn *Proceed with Conditions* ở Gate 2 khi một dòng bị hoãn chưa có action như vậy. (Câu hỏi 9(a) là cùng một lựa chọn cho một High gap; một câu trả lời nên giải quyết cả hai.)

**(b)** **Mỗi dòng yêu cầu áp dụng có phải mang mức ưu tiên Must / Should / Could không?** Chúng tôi đã xây dựng theo cách đó — một dòng vừa không phải N/A vừa chưa được xếp ưu tiên được tính là chưa hoàn tất ở Gate 2. Lập luận của chúng tôi: câu trả lời của quý vị nói mọi dòng áp dụng phải được hoàn tất hoặc hoãn chính thức, và chỉ dòng Should hoặc Could mới có thể bị hoãn, nên một dòng chưa ai xếp hạng thì không thể làm được cả hai. Nhưng câu trả lời của quý vị nói mức ưu tiên nhận những giá trị nào, chứ không nói mọi dòng phải có một mức, nên đây là cách hiểu của chúng tôi chứ không phải của quý vị.

## Câu hỏi 16 — Màn sàng lọc restricted-and-caution chung: hình thức này có đúng không?

*Vị trí trong ứng dụng:* Register **General Restricted & Caution Assessment**, và **Key Gate Check** Gate 7 "General restricted and caution ingredient assessment completed" trên trang **Phase 3**.

Câu trả lời của quý vị cho câu hỏi 5 của Round-4 chọn phương án (b): Gate 7 cần một đánh giá ingredient restricted-and-caution **chung** cho mọi sản phẩm, với màn sàng lọc maternal là một lớp điều kiện bổ sung và màn sàng lọc infant là lớp thứ ba. Cả ba lớp hiện đã tồn tại.

Quá trình xây dựng cho thấy hai trong ba lớp vốn đã có sẵn — màn sàng lọc prohibited/restricted luôn áp dụng cho mọi sản phẩm, và compartment infant vốn đã có điều kiện là có tiếp xúc với trẻ sơ sinh. Cái thực sự còn thiếu là **caution** chung: mọi dòng caution trong hệ thống đều thuộc danh sách maternal. Vì vậy lớp đó là mới, và bốn lựa chọn trong đó là của chúng tôi chứ không phải của quý vị.

**(a) Màn sàng lọc mới bắt đầu trống.** Hai watch-list hiện có đều kèm sẵn mười hai chất tham chiếu vì workbook liệt kê chúng. Không có danh sách tương đương cho general caution, và tự viết một danh sách nghĩa là tự bịa ra dữ liệu tham chiếu quy định ngay trong hệ thống sinh ra để kiểm soát chúng. Như vậy có đúng không, hay công ty đã có sẵn một danh sách restricted/caution chung cần được nạp vào?

**(b) "Chúng tôi đã xem và không thấy gì" được ghi thành một dòng Key Gate Check riêng.** Một màn sàng lọc trống không thể phân biệt "sản phẩm này không chứa gì bị hạn chế" với "chưa ai xem", nên có một dòng Key Gate Check mới ở Gate 7 — *General restricted and caution ingredient assessment completed* — phải được done, hoặc đánh dấu N/A kèm giải trình, trước khi Gate 7 có thể pass. Ghi nhận theo cách này có đúng không?

**(c) Hiện nó chỉ thuộc Gate 7.** Câu trả lời 6 của quý vị cho Gate 4 sàng lọc mọi ứng viên liên quan và Gate 7 chính thức đóng mọi vấn đề restricted hoặc caution. Một ingredient bị hạn chế thường được phát hiện trong sàng lọc ingredient ở Gate 4, nhưng một phát hiện ghi trên màn sàng lọc này lại không hiện ra ở Gate 4 chút nào. **Các phát hiện của màn sàng lọc này có nên cũng được dispositioned ở Gate 4**, giống như hai watch-list kia — mọi dòng đều được dispositioned, có dấu vết reviewer cho bất cứ gì bị gắn cờ?

**(d) Năm giá trị kết quả của nó** — No issue identified · Within limit, evidence linked · Restricted, reformulate · Needs Safety Review · Needs Regulatory Review — được lắp ghép từ hai màn sàng lọc hiện có, không phải do quý vị cung cấp. Ba giá trị cuối chặn Gate 7.

## Câu hỏi 17 — Với claim, các kênh công bố là gì, và khi nào một claim được phê duyệt cho một thị trường và kênh?

*Vị trí trong ứng dụng:* Các register **Publication / Deployment Record** (kênh) và **SKU Claims / PIF Register** (kênh và thị trường dự kiến). Cả hai nằm cùng nhóm menu với trang **Published Information Approval**, nhưng là các trang riêng, tách khỏi nó.

**(a) Bản ghi Publication / Deployment.** Câu trả lời của quý vị cho câu hỏi 30(d) tách bạch hai sự kiện — *"Approved for Release means AUTHORISED for use"*, và việc công bố thực tế là một bản ghi riêng — và liệt kê cả bảy thứ nó phải ghi: ngày công bố thực tế · **kênh (channel)** · thị trường · URL, tệp hoặc tham chiếu artwork · phiên bản được công bố · người chịu trách nhiệm · ngày rút lại hoặc thay thế. Sáu trong bảy có hình thức hiển nhiên. **Channel thì chưa có danh sách giá trị.** Chúng tôi đã dựng một danh sách từ các kênh mà Publication Approval Register vốn đã phân biệt (cột channel của nó là văn bản tự do), cộng với kênh mà câu trả lời của quý vị nêu thẳng (*"for printed packaging the equivalent event may be Release to Print"*): Release to Print (packaging / label) · Website · Social media · Sales or distributor material · HCP or professional material · Retailer listing · Advertising · Other — specify in notes. Công ty có danh sách kênh chuẩn không? Nếu có, trong đó có những gì — và "Release to Print" là một kênh, hay là một loại sự kiện khác đứng cạnh chúng?

**(b) Được phê duyệt cho một thị trường và kênh.** Câu trả lời 19(b) của quý vị đặt kênh và thị trường dự kiến vào bản ghi sử dụng claim theo SKU / thị trường / kênh. Câu hỏi 30(c) của quý vị chặn một claim gắn với artwork mà chưa được phê duyệt cho thị trường hoặc kênh. Chúng tôi hiểu một claim là đã được phê duyệt khi dòng của nó trên bản ghi đó có status **Complete** (giá trị Status của chính sheet) và kênh dự kiến của nó bao gồm kênh được dùng. Complete có phải giá trị đúng không, hay cần một giá trị khác?

## Câu hỏi 18 — Rà soát claim ở Gate 3: "Not Approved", Technical review, và ai phê duyệt một revision

*Vị trí trong ứng dụng:* Trang **Evidence Plan & Claim Support**, bảng **Claim -> Evidence Traceability** (các cột như "Technical review outcome", "Technical reviewer", "Technical review date"); danh sách readiness của Gate 3.

**(a) Kết quả rà soát "Not Approved".** Câu hỏi 27 của quý vị chấp nhận bốn kết quả nhưng không nói kết quả nào cho phép claim đi tiếp. Hiện chỉ Approved và Approved with Conditions làm được; Not Approved và Further Information Required chặn Gate 3 cho đến khi claim được viết lại (cần một lần rà soát mới) hoặc bị gỡ. Một claim được rà soát là "Not Approved" có được phép ở lại trong danh sách claim của dự án khi Gate 3 pass không — ví dụ như một claim vẫn đang phát triển?

**(b) Technical review của một claim mới.** Câu hỏi 28(2) của quý vị nói một claim mới kích hoạt rà soát Regulatory và Technical. Chưa có chỗ để ghi Technical review, nên chúng tôi thêm cùng năm trường mà quý vị đã chấp nhận cho Regulatory review: outcome, reviewer, date, rationale và evidence link. (Technical review không bắt buộc khi claim được liên kết với một mục Approved của Claims Library.) Nó có cần cùng năm trường đó, hay cần thứ khác?

**(c) Ai được ghi nhận rằng một revision đã được phê duyệt?** Câu hỏi 26 của quý vị đóng băng một revision của claim khi nó nhận được "Regulatory or Gate 10 approval". Hiện phê duyệt chỉ có thể được ghi bởi người đại diện Regulatory hoặc người có quyền quyết định Gate 10, và chỉ dưới tên của chính họ. Ai có quyền phê duyệt một revision của claim?

## Câu hỏi 19 — Gate 10–12 theo từng thị trường: thị trường bị withdrawn, và mọi thị trường có phải sẵn sàng cùng lúc không?

*Vị trí trong ứng dụng:* Trang **Phase 4**, tab Gate 10-12: khung **Gate sign-off** theo từng thị trường và thẻ **Market Regulatory & Launch Tracking**; tổng hợp ở **Project Overview** "Market readiness".

**(a) Sau khi một thị trường bị withdrawn, có còn nợ một sign-off Gate 12 ở đó không?** Câu trả lời của quý vị cho câu hỏi 18 có các sign-off Prepared, Reviewed và Approved được ghi theo từng thị trường cho Gate 10 và 11, và các rà soát hậu mãi Gate 12 cũng chạy theo từng thị trường. Chúng tôi cũng cho Gate 12 một chỗ ký theo từng thị trường. Cho đến nay một thị trường bị withdrawn vẫn giữ chỗ của nó ở mọi gate, nên việc rút khỏi một quốc gia khiến Gate 10 đến 12 bị chặn mãi mãi vì một chữ ký không ai sẽ ký. Một thị trường bị withdrawn nay **không** còn chỗ ký ở Gate 10, 11 hoặc 12. Với Gate 10–11 và với supersession thì điều này có vẻ chắc chắn — sẽ không còn gì được ra mắt hoặc chuyển tiếp ở đó. Với **Gate 12** thì đó là cách hiểu của chúng tôi: sản phẩm đã bán ở quốc gia đó có thể vẫn cần theo dõi hậu mãi sau khi withdrawal. Sau khi rút khỏi một thị trường, sign-off Gate 12 của thị trường đó (i) không còn bắt buộc, (ii) vẫn bắt buộc trong một khoảng thời gian nhất định, hay (iii) vẫn bắt buộc như bất kỳ thị trường nào mà sản phẩm đang bán?

**(b) Pass ở cấp dự án.** E3(a) và câu hỏi 18 của quý vị cho mỗi thị trường tiến triển độc lập, và dự án có thể hiển thị "Some markets complete". Dự án vẫn chỉ có **một** bản ghi cho mỗi Gate 10 và 11, nên nó chỉ pass khi mọi thị trường đang hoạt động đã có regulatory approval, sign-off Gate 10 và launch approval — một thị trường đã sẵn sàng phải chờ các thị trường khác. Cách tổng hợp đó đã đủ chưa, hay quý vị muốn gate decision của từng thị trường được ghi riêng, để gate của một thị trường đã sẵn sàng được pass trong khi thị trường khác còn pending? (Cách thứ hai là một thay đổi lớn hơn.)

## Câu hỏi 20 — Gate 10 — những giá trị checklist và approval nào được tính là done cho một thị trường?

*Vị trí trong ứng dụng:* Trang **Phase 4**, Gate 10: thẻ **Market Regulatory & Launch Tracking** (Regulatory status) và register **Regulatory Checklist Status (per market)**.

Câu hỏi 35(a) của quý vị đưa ra hai danh sách giá trị nhưng không nói giá trị nào là pass. Chúng tôi chấp nhận status checklist là Complete và regulatory approval là Approved hoặc Approved with Conditions (mỗi loại, hoặc N/A kèm lý do và reviewer). Mọi giá trị khác — Not Approved, Blocked, Pending, v.v. — chặn Gate 10.

Một điều chúng tôi phát hiện khi kiểm tra: Gate 10 đọc regulatory approval ở hai nơi, sổ dossier của thị trường và status riêng của thị trường, và danh sách riêng của thị trường không có giá trị "Approved with Conditions". Chúng tôi sẽ đưa cái thứ hai cho khớp với câu trả lời của quý vị khi quý vị đã trả lời.

**Câu hỏi:** "Approved with Conditions" có đủ để pass Gate 10 không? Checklist có phải là "Complete" không, hay một status khác cũng chấp nhận được?

## Câu hỏi 21 — Một dự án phụ thuộc thương mại — kết quả costing nào cho phép Proceed thường?

*Vị trí trong ứng dụng:* Trang **Formula BOM & Costing**, thẻ **Commercial feasibility** (trạng thái costing); quyết định Gate 5 nằm ở trang **Phase 2**.

Câu hỏi 36(b) của quý vị nói rằng khi yêu cầu thương mại là Must, thất bại dẫn tới Hold hoặc Proceed with Conditions. Chúng tôi chỉ cho phép Proceed thường với "Commercially Feasible" (hoặc N/A kèm lý do). "Feasible with Conditions", "In Progress" và "Not Feasible" đều đòi hỏi Hold hoặc Proceed with Conditions.

**Câu hỏi:** "Feasible with Conditions" và "In Progress" có được tính là thất bại theo nghĩa của câu hỏi 36(b) không?

## Câu hỏi 22 — Gate 12 — điều gì cho thấy phản hồi về hiệu năng sản phẩm đã được xử lý, và tín hiệu nào đưa một lần rà soát lên sớm hơn?

*Vị trí trong ứng dụng:* Trang **Phase 4**, tab Gate 12: thẻ **Post-launch review schedule** và Key Gate Check "Complaints/issues triaged and CAPA/improvement actions assigned"; trang **Post-Market / Complaint & CAPA**.

**(a) Điều gì đóng mục này.** Câu hỏi 15 của quý vị đưa ra năm trigger nhưng không nói bằng chứng nào đóng mục. Hiện nó được thỏa khi Gate 12 check "Complaints/issues triaged and CAPA/improvement actions assigned" hoàn tất. Khi đã nhận được phản hồi về hiệu năng, chỉ cần nó đã được triage và đã giao action là đủ, hay cần một lần rà soát hiệu năng riêng?

**(b) Tín hiệu nào đưa một lần rà soát sau ra mắt lên sớm hơn.** Câu hỏi 13 của quý vị đưa một lần rà soát lên sớm hơn khi có "a significant adverse event, complaint trend, regulatory request or quality signal". Chúng tôi hiểu những điều này là: (i) một vấn đề safety/adverse-event hoặc chất lượng được ghi nhận, hoặc phản hồi có nguồn là cơ quan quản lý. Hiện chưa có gì trong hệ thống ghi nhận một xu hướng khiếu nại — (ii) xu hướng nên được ghi ở đâu? Câu hỏi 10 của quý vị chỉ tính một câu hỏi về claim "concerning actual performance", nhưng chưa có gì ghi lại câu hỏi về claim nói về điều gì, nên mọi câu hỏi về claim đều được tính — (iii) quý vị có cần phân biệt các câu hỏi về claim liên quan đến hiệu năng với những câu khác không?

## Câu hỏi 23 — Khi nào một người được giữ hai vai trò trên cùng một bản ghi?

*Vị trí trong ứng dụng:* (a) Khung **Gate N sign-off** trên tab gate; (b) bảng **Next Actions**; (c) hộp thoại tạo formula version mới ở **Formula BOM**; (d) **Sign-off** của phase (tab close-out).

Bốn lựa chọn của chúng tôi thực chất là cùng một câu hỏi ở những chỗ khác nhau — liệu người đã làm một bước có được làm bước tiếp theo không. Các câu trả lời của quý vị nêu rõ một cặp.

**(a) Ba chữ ký của gate.** Câu hỏi 29(4) của quý vị nói rằng ở mọi gate, reviewer phải là một người đã xác thực khác với người chuẩn bị, và ở bảy gate critical, reviewer hoặc người phê duyệt phải đại diện cho chức năng độc lập. Câu trả lời không nói **người phê duyệt có được đồng thời là người chuẩn bị không**. Câu trả lời D1 của quý vị nói *"where risk is low, the same person may prepare multiple gate records, but the reviewer or approver should be independent for safety-, regulatory-, claims- or release-critical decisions."* Chúng tôi hiểu "multiple gate records" là cùng một người chuẩn bị **các gate khác nhau**, không phải giữ hai vai trò trên một gate. Hiện nay cùng một người **được** chuẩn bị một gate rồi phê duyệt nó, với một người khác rà soát ở giữa — và vì quyết định của người phê duyệt chính là gate decision, đó là một người phê duyệt công việc do mình chuẩn bị. (Trước đây chúng tôi từ chối điều này và đã gỡ bỏ, vì không câu trả lời nào yêu cầu, và một đội nhỏ không phải lúc nào cũng bố trí đủ ba người.) Điều đó có nên tiếp tục được phép — ở mọi nơi, hay chỉ ở các gate không critical — hay người phê duyệt phải khác người chuẩn bị?

**(b) Đóng một action.** F8 nói owner không thể xác minh việc đóng "where independent confirmation is required" nhưng không nói khi nào. Chúng tôi áp dụng cho mọi action: việc đóng hoặc hủy bất kỳ action nào, bất kể mức ưu tiên, bị giới hạn ở người đã nêu action, owner của gate, hoặc một reviewer có thẩm quyền — mà chúng tôi hiểu là người có quyền quyết định gate đó. Có action nào mà owner được tự đóng không? Và ai là "authorised reviewer" của một action — một vai trò, hay một người được nêu tên trên từng action?

**(c) Xác nhận phân loại Major/Minor.** Câu trả lời F5 của quý vị nói người khởi xướng có thể đề xuất phân loại và một reviewer kỹ thuật hoặc chất lượng có thẩm quyền phải xác nhận. Hệ thống ghi người tạo phiên bản là người xác nhận, và chỉ cho họ xác nhận nếu họ có thẩm quyền Technical hoặc Quality. Một người — có thẩm quyền Technical hoặc Quality — có được vừa đề xuất vừa xác nhận không, hay người xác nhận phải là người khác?

**(d) Phê duyệt phase.** Câu trả lời sign-off của quý vị nói phê duyệt cấp phase "remains as an additional phase-closure approval". Không phase nào được định nghĩa là critical, nên tính độc lập giữa ba người ký phase chỉ được hiển thị như một cảnh báo, không bị bắt buộc. Có nên bắt buộc nó cho phase nào không?

## Câu hỏi 24 — Một action Critical và gate decision: nó chặn gì, và trong bao lâu?

*Vị trí trong ứng dụng:* Bảng **Next Actions** và quyết định trong **Phase Gate Flow** trên mỗi tab gate; danh sách "What's blocking Gate N".

**(a) Một action Critical đang mở có chặn cả "Proceed with Conditions" không, hay chỉ chặn Proceed thường?** Câu trả lời F8 của quý vị nói "Critical actions must prevent normal gate closure." Chúng tôi hiểu "normal" là "mọi quyết định": khi một action Critical đang mở, gate không thể pass chút nào, kể cả với Proceed with Conditions. Cách hiểu còn lại — một action Critical chỉ chặn Proceed thường, và Proceed with Conditions là lối đi — cũng có thể. Một gate có được pass với Proceed with Conditions khi một action Critical vẫn đang mở không? Nếu có, điều đó có cần thêm gì không (một người phê duyệt có tên, một lý do được ghi lại)?

**(b) Khi một action Critical đã được đóng hoặc hủy.** Câu trả lời B2 của quý vị nói mọi action thường phải được hoàn tất trước khi gate đóng, và câu trả lời F8 nói action Critical ngăn việc đóng thông thường. Cả hai đều nói về các action còn **đang mở**. Không câu nào nói rằng một gate từng có action Critical phải dùng Proceed with Conditions ngay cả sau khi action đó đã được đóng hoặc hủy. Vì vậy chúng tôi không thêm hạn chế đó: một khi action Critical là Closed hoặc Cancelled thì nó không chặn gì, và một gate không còn action nào đang mở sẽ pass với Proceed thường. Sau đó gate có được pass với Proceed thường không, hay vẫn phải dùng Proceed with Conditions vì nó từng mang một vấn đề Critical? Một action Critical bị hủy vì được nêu nhầm có được tính là đã từng có vấn đề Critical không?

## Câu hỏi 25 — Một thị trường có launch approval còn hiệu lực — PIF của nó có được mở lại không?

*Vị trí trong ứng dụng:* Trang **Phase 4**: thẻ **Market Regulatory & Launch Tracking** (cột PIF status và Launch approval).

Quy tắc C5 làm cho launch approval phụ thuộc vào một PIF đã được duyệt. Hệ thống hiện từ chối chuyển một PIF khỏi Approved trong khi launch approval của thị trường đó vẫn là Approved; launch approval không được vẫn là Approved trong cùng lần lưu.

**Câu hỏi:** khi PIF của một thị trường đang bán sản phẩm phải được cập nhật (chẳng hạn sau một thay đổi công thức), launch approval của nó có phải được rút lại trong thời gian đó không?

## Câu hỏi 26 — Một bản ghi deviation khi có thứ được phát hành mà không được phê duyệt

*Vị trí trong ứng dụng:* Hiện chưa có màn hình cho deviation. Gần nhất hiện nay là **Published Information Approval** (phê duyệt phát hành) và **Post-Market / Complaint & CAPA** (nơi ghi sự cố).

Câu trả lời F11 của quý vị nói "releasing without approval generates a deviation/violation record". Bên trong hệ thống, tài liệu không thể được **lưu** là approved hoặc released cho đến khi mọi bước hoàn tất. Còn hai trường hợp hệ thống không thể ngăn, vì việc công bố tự nó diễn ra bên ngoài hệ thống: tài liệu được công bố mà chưa bao giờ vào workflow, và tài liệu được phát hành đúng nhưng sau đó không còn hiệu lực (claim của nó bị sửa, mục Claims Library của nó bị withdrawn, hoặc ngày rà soát của nó trôi qua). Hiện những sự cố như vậy được ghi thành một CAPA. Quy tắc riêng của chúng tôi là mỗi sự cố như vậy có một bản ghi deviation riêng, để nó không bao giờ bị mất bên trong một danh sách CAPA; điều còn lại dành cho quý vị là bản ghi đó nên chứa gì và làm gì.

**Câu hỏi:** (a) Việc chặn phát hành bên trong hệ thống có đáp ứng yêu cầu cho những gì xảy ra trong đó không? (b) Bản ghi deviation nên chứa gì? (c) Một deviation đang mở có nên chặn Gate 11 hoặc Gate 12 không? (d) Hệ thống có nên cảnh báo khi tài liệu đã phát hành không còn hiệu lực không?

## Câu hỏi 27 — Ai chấp nhận pre-work của một phase?

*Vị trí trong ứng dụng:* Banner "Pre-work not reviewed" / "Accept pre-work" ở đầu trang **Phase 2, 3 và 4**.

Câu trả lời F13 của quý vị nói các mục nhập sớm *"should be visibly marked Pre-work / Entered Before Gate Opened and retain the entry date and user"*, và rằng khi phase mở ra thì *"the responsible owner must review and formally accept or update the pre-work"*. **Chúng tôi đã xây dựng phần chấp nhận nhưng chưa có phần đánh dấu**: việc chấp nhận áp dụng cho toàn bộ phase, và các mục nhập riêng lẻ chưa được đánh dấu. Đó là việc chúng tôi còn nợ quý vị, không phải một câu hỏi; chúng tôi nêu ra để quý vị không nghĩ rằng nó bị bỏ sót.

Điều chúng tôi cần từ quý vị là nửa còn lại. Chúng tôi cho phép review owner được giao của phase, hoặc Lead của dự án, chấp nhận nó, và chỉ sau khi phase đã mở.

**Câu hỏi:** ai nên được phép chấp nhận pre-work của một phase?

## Câu hỏi 28 — Mỗi cột sau được điền ở gate nào?

*Vị trí trong ứng dụng:* (a) Trang **Evidence Plan & Claim Support**, **Claim -> Evidence Traceability** ("Evidence basis required"); (b) register **Stability, Compatibility & Release Evidence** ("Release decision").

Hai cột mà các câu trả lời của quý vị nói cái gì được ghi nhưng không nói ở gate nào. Câu trả lời quyết định khi nào cột ngừng được chỉnh sửa. (Cột "product status" của watch-list là cùng loại câu hỏi và nằm trong câu hỏi 4(b).)

**(a) "Evidence basis required" của một claim.** Câu trả lời 36(a) của quý vị thêm trường này vào mọi claim nhưng không nói khi nào nó phải được điền. Chúng tôi dùng nó để miễn trừ một số claim Cosmetic (một claim được khai báo là bằng chứng cấp ingredient, hoặc là không có performance claim, có thể dựa vào bằng chứng ingredient), và chúng tôi yêu cầu nó ở Gate 3, cạnh yêu cầu bằng chứng sơ bộ. Gate 3 có đúng không, hay nên muộn hơn — Gate 8 hoặc Gate 10?

**(b) "Release decision" trên sheet Stability, Compatibility & Release Evidence.** Câu trả lời của quý vị cho Gate 9 liệt kê một *release-readiness conclusion*, và câu trả lời cho Gate 11 liệt kê một *quality release pathway*. Sheet có một cột "Release decision", và không câu trả lời nào nói nó được điền ở gate nào. Chúng tôi hiểu là **Gate 11**: Gate 9 kết luận rằng sản phẩm sẵn sàng để phát hành, và quyết định phát hành là một phần của Production and Launch, cũng là nơi việc phát hành bị chặn theo từng thị trường. Như vậy các kết quả stability và compatibility thuộc Gate 9, và release decision vẫn mở cho đến Gate 11. Release decision được ghi ở Gate 11, hay ở Gate 9 với Gate 11 chỉ kiểm tra lại?

## Câu hỏi 29 — Điều gì chứng minh phiên bản artwork đã duyệt ở Gate 11?

*Vị trí trong ứng dụng:* Trang **Packaging Specs & Artwork Evidence** (Approval, Claim ID) và **Released Label Control**; Key Gate Check Gate 11 "Final formula/version, packaging and artwork approved".

Câu hỏi 30(c) của quý vị nói việc phê duyệt artwork cuối cùng *"represented in the Packaging/Artwork Approval record, which must link every Claim ID on the artwork"*. Trong phần mềm, bản ghi đó là sổ **Packaging Specs & Artwork Evidence** (các cột Approval và Claim ID của nó), và Gate 10 đọc nó. Ở Gate 11, "Approved artwork version" lại được đọc từ sổ **Released Label Control**: mỗi dòng phải nêu tên phiên bản label mới và tệp artwork mới. Sổ đó cũng mang một câu trả lời "New label released to market?" (Yes / No / NA) và một ngày phát hành ra thị trường, mà chúng tôi không kiểm tra. Gate 11 cũng có một Key Gate Check, "Final formula/version, packaging and artwork approved", bao gồm cả artwork.

**Câu hỏi:** "Approved artwork version" của Gate 11 nên đọc phê duyệt trên sổ Packaging Specs & Artwork Evidence, sổ Released Label Control, hay cả hai — và sổ Released Label Control có đơn giản chỉ là bản ghi phát hành ra thị trường, còn bản thân phê duyệt chỉ nằm ở bản ghi packaging (khi đó Key Gate Check là xác nhận của Gate 11)?

## Câu hỏi 30 — Yêu cầu bao bì của một thị trường được ghi ở đâu, và điều gì đóng mục này?

*Vị trí trong ứng dụng:* Trang cấp công ty **Market profiles** (trường "Pack requirements") và Key Gate Check Gate 6 "Artwork/label needs and pack compatibility triggers identified" ở trang **Phase 2**.

Câu trả lời A2 của quý vị làm cho các yêu cầu bao bì riêng của thị trường trở thành bắt buộc khi thị trường có yêu cầu cụ thể (ngôn ngữ, cảnh báo, khai báo ingredient, v.v.), và nói rằng khi không có yêu cầu nào áp dụng thì người dùng nên ghi N/A kèm lý do.

**Ở đâu.** Chúng tôi đã thêm một trường "Pack requirements" vào market profile của Regulatory; nếu nó được điền cho một thị trường mà dự án bán vào, mục này áp dụng, và được đóng bởi Gate 6 check "Artwork/label needs and pack compatibility triggers identified". Regulatory có nên ghi các yêu cầu này trên market profile như vậy không? Điều gì nên đóng mục này?

*(Một trường Pack requirements để trống trên một thị trường mà dự án bán vào sẽ không được đọc là "không có yêu cầu riêng của thị trường": mục này chặn cho đến khi Regulatory đã ghi hoặc các yêu cầu hoặc N/A kèm lý do — quy tắc riêng của chúng tôi, nhất quán với câu trả lời câu hỏi 7 của quý vị rằng một đánh giá còn thiếu không bao giờ được đọc là "does not apply".)*

## Câu hỏi 31 — Những sổ (register) nào được phép để trống trên một dự án, và những sổ nào luôn phải có mục?

*Vị trí trong ứng dụng:* Không có một màn hình riêng — áp dụng cho mọi register bằng chứng (78); danh sách xem ở **Gate Rules & Sheet Map**.

Câu trả lời Vòng 4 19(d) của quý vị cho phép một sản phẩm khai báo rõ ràng là **không có claim**, và Gate 3 chấp nhận điều đó. Sau đó chúng tôi phát hiện Gate 10 thì không: nó yêu cầu sổ claim phải có mục, nên một sản phẩm không có claim qua được Gate 3 nhưng không bao giờ qua được Gate 10. **Chúng tôi đã mở rộng bản ghi của quý vị sang Gate 10** cho hai sổ đó. Điều này khiến chúng tôi rà soát mọi sổ trong hệ thống, vì việc đòi mục trong một sổ có thể hợp lệ để trống chỉ khiến người ta phải bịa ra một mục — còn để trống mà không có gì cho thấy đã có người xem xét thì khiến "không ai kiểm tra" trông giống như "không có gì để tìm".

Dưới đây là toàn bộ 78 sổ, được xếp theo điều mà hệ thống **hiện đang giả định**. Xin quý vị đánh dấu mọi dòng sai. Các dòng có ★ là những dòng chúng tôi ít chắc chắn nhất.

Hai thứ khác nhau cùng được gọi là "gate" dưới đây, vì vậy mỗi bảng tự ghi nhãn cho mình. Ở nhóm A, A2, B và C, cột gate là **gate mà tại đó cần có mục**: gate không thể qua trước thời điểm đó. Ở nhóm D và E, đó là **gate mà sheet được gắn với** — nơi đội làm việc trên sheet đó, và điều này không nói gì về việc có gate nào đòi hỏi nó hay không. Nhóm D có thêm một cột cho biết những gate nào thực sự đọc các câu trả lời; nhóm E không có cột này vì không gate nào đọc các sheet đó.

### A. Phải có ít nhất một mục tính đến gate được nêu (13 sổ)

Gate không thể qua khi sổ còn trống.

| Register | Gate tại đó cần có mục | Ghi chú |
|---|---|---|
| Development Brief | 2 |  |
| Framed Scientific Research Questions | 2 |  |
| Vulnerable-User Assessment | 2 | một mục tường minh "No vulnerable-user group identified" được tính (Round-3 B5 của quý vị) |
| Competitor Product Register — Identity, Claims & IP | 3 | ★ hiện chưa có ngoại lệ nào cho thay đổi chỉ mang tính hành chính |
| Supplier & Raw Material Evidence | 4 |  |
| Prospective Evidence Plan | 5 | ★ một sản phẩm không có claim có thể không cần kế hoạch bằng chứng |
| Packaging Specs & Artwork Evidence | 6, 10 |  |
| Ingredient-Level Safety Matrix | 7 |  |
| Detailed Test Protocol | 8 | ★ một sản phẩm không có claim vẫn cần kiểm nghiệm an toàn và độ ổn định, nhưng có lẽ không cần protocol kiểm nghiệm claim |
| Stability, Compatibility & Release Evidence | 9, 11 |  |
| Publication Approval Register (with Publication Rules, one page) | 10, 11 |  |
| GMP Links | 11 |  |
| Released Label vs Current Artwork Register | 11 |  |

### A2. Phải có một mục cho mỗi thị trường cần checklist riêng (1 sổ)

| Register | Gate tại đó cần có mục | Ghi chú |
|---|---|---|
| Regulatory Checklist Status (per market) | 10 | một mục cho mỗi thị trường **ngoài ASEAN** mà dự án bán vào; các thị trường đã được checklist ASEAN PIF bao phủ thì không cần dòng nào, nên một dự án chỉ bán ở ASEAN có thể để trống mà vẫn qua |

### B. Chỉ được để trống nếu dự án ghi nhận "không có claim" (2 sổ)

| Register | Gate tại đó cần có mục | Điều cho phép để trống |
|---|---|---|
| Claim -> Evidence Traceability | 3 | dự án ghi nhận rằng nó đề xuất **không có claim** (mục kiểm tra claim được đánh dấu not applicable, kèm lý do) |
| SKU Claims / PIF Register | 10 | cùng bản ghi "không có claim" đó |

### C. Được phép để trống, nhưng phải có người xác nhận đã xem xét (2 sổ)

Ở đây một sổ trống là một câu trả lời có thật — một sản phẩm không có gì bị hạn chế thì không có gì để liệt kê.

| Register | Gate tại đó thực hiện kiểm tra | Điều thay thế cho các dòng |
|---|---|---|
| General Restricted & Caution Assessment | 7 | một Key Gate Check, "General restricted and caution ingredient assessment completed", phải được hoàn tất (hoặc N/A kèm lý do). Mọi dòng được thêm vào đều phải có kết quả. |
| Critical Safety Findings | 7 | không có dòng nghĩa là không có phát hiện. Mười câu hỏi Final Safety Sign-off là thứ ghi nhận rằng an toàn đã được xem xét |

### D. Các sheet tham chiếu đã có sẵn các dòng (31 sheet)

Các dòng tồn tại ngay từ đầu; đội điền vào các cột câu trả lời. Cột giữa cho biết sheet được làm việc ở gate nào; cột cuối cho biết gate nào, nếu có, đọc các câu trả lời đó.

| Reference sheet | Gắn với gate (nơi làm việc trên sheet) | Gate đọc các câu trả lời của quý vị |
|---|---|---|
| ASEAN PIF Checklist (Closure) | 10 | Gate 10 (các thị trường ASEAN) |
| Final Safety Sign-off | 7, 10 | Gate 7 |
| Pregnancy / Breastfeeding Caution Limits | 4, 7 | Gates 4, 7 (các sản phẩm dùng cho thai kỳ / cho con bú) |
| Prohibited Ingredient Watch-list | 4, 7 | Gates 4, 7 |
| Protocol Setup | 8 | Gate 8 (nghiên cứu trên người) |
| Target Product Profile (TPP) | 5 | Gates 3, 5 |
| ASEAN PIF / Dossier Map | 10 | không có |
| Anatomy, Physiology, Exposure Science & Contradictory Evidence | 2 | không có |
| Artwork Change Control | 6, 10, 11 | không có |
| Backbone / Platform Technology | 5 | không có |
| Carrier Review — Summary | 2 | không có |
| Change Templates / Forms | bất kỳ | không có |
| Efficacy Assurance Control | 5, 8 | không có |
| Evidence Hierarchy | — | không có |
| Evidence Template Index | — | không có |
| Formula Change Control | 5 | không có |
| Fragrance Workflow | 7 | không có |
| Landscape Decision Summary | 3 | không có |
| Comparative Testing Protocol | 3 | không có |
| Current Solutions & Standard of Care | 3 | không có |
| Artwork / Label Review Checklist (on the Packaging Specs & Artwork Evidence page) | 6, 10, 11 | không có |
| Literature-Search & Referencing Standard | — | không có |
| Literature-Search Method | 2 | không có |
| Safety / Medical Summary | 10 | không có |
| PIF Evidence Closure (Workflow) | 10, 11 | không có |
| Product / Project Identification | 4, 5, 8 | không có |
| Product Safety Profile | 7, 10 | không có |
| Publication Rules | 10, 11 | không có |
| System Requirements | — | không có |
| Transferability & Inference Rules | — | không có |
| Twinkle 5 Claims Map | 3, 10 | không có |

### E. Không gate nào đòi có mục; được phép để trống (29 sổ)

| Register | Gắn với gate (nơi làm việc trên sheet) | Ghi chú |
|---|---|---|
| Carrier / Emollient System Review | 2 |  |
| Ready-to-Answer Pack | 10 |  |
| Needs -> Technology Traceability Matrix | 2 |  |
| Needs — Executive Brief | 2 |  |
| Mechanism & Claims Evidence Map | 3, 10 |  |
| Social Media & Marketing Campaign Register | 3, 11 |  |
| Development Iteration Log | 4, 5, 8 |  |
| Ingredient Monograph | 4, 5 |  |
| Ingredient Substitution Evidence | 4, 7 | ★ chỉ cần khi một thành phần đã được thay thế |
| Team Feedback & Competitor Benchmark Notes | 4, 5, 8 |  |
| Formulation Change Register (Final Approver Controlled) | 5, 7, 10 |  |
| Potency & Process Control Evidence | 5, 8 |  |
| Product Family & Version Register | 5, 6 |  |
| Platform / Channel Rollout & Stock Confirmation | 6, 11 |  |
| Shipment Label & Batch Verification | 6, 11 |  |
| Eye Safety Evidence | 7, 8 |  |
| Fragrance / Allergen Log | 7 |  |
| Clinical / Human Evidence | 8, 10 |  |
| Efficacy Study Plan | 8 |  |
| Functional Efficacy Evidence | 8, 10 |  |
| Microbiology & PET Evidence | 8 |  |
| Participant / Sample Log | 8 |  |
| HCP / Distributor Efficacy Answer | 10, 11 |  |
| HCP Test Report Pack | 10, 11 |  |
| PIF Evidence Export | 10, 11 |  |
| Publication / Deployment Record | 10, 11 | ★ cho phép tài liệu không đồng nghĩa với việc công bố nó; không có gì đòi bản ghi này phải tồn tại khi tài liệu được công bố |
| Batch Formula Trace | 11 |  |
| MBc360 Feedback | — |  |
| Test Report Index | bất kỳ | ★ các báo cáo có thể đã được liên kết từ các sheet khác |

**Các câu hỏi:**

**(a)** Mỗi sổ ở nhóm A có thực sự là sổ mà **không dự án nào** được phép để trống một cách hợp lệ không, và quy tắc chỉ-ngoài-ASEAN ở nhóm A2 có đúng không (một dự án chỉ bán ở ASEAN có thực sự không cần dòng checklist thị trường nào không)? Sổ nào trong số đó có thể để trống, và cái gì nên thay thế cho các mục (một mục kiểm tra xác nhận, một "none" tường minh, hay thứ gì khác)?

**(b)** Mỗi sổ ở nhóm E có thực sự là tùy chọn không? Có sổ nào phải có mục tại một gate cụ thể — hoặc bất cứ khi nào một điều kiện khác áp dụng, ví dụ một bản ghi thay thế thành phần bất cứ khi nào một thành phần đã được thay thế?

**(c)** Với một sản phẩm **không có claim**, và với một thay đổi **chỉ mang tính hành chính**, những sổ nhóm A nào vẫn cần có mục? Đặc biệt là kế hoạch bằng chứng (Gate 5), protocol kiểm nghiệm chi tiết (Gate 8) và competitor landscape (Gate 3), được đánh dấu ★.

**(d)** Có đúng là sổ claim của Gate 10 được miễn chỉ dựa trên bản ghi "không có claim" không?

## Câu hỏi 32 — Change Control được mở trước khi thực hiện thay đổi, hay có thể ghi nhận một thay đổi sau khi đã làm?

*Vị trí trong ứng dụng:* Trang **Change Control & Communication** ("Open Change Request") và thao tác tạo version mới ở **Formula BOM** (chỉ khi Gate 05 đang mở).

Hiện nay hệ thống không áp đặt thứ tự nào cho hai việc này. Việc mở một bản ghi Change Control không tạo ra hay dẫn đến một phiên bản công thức mới, và việc tạo một phiên bản công thức không cần bản ghi Change Control. (Câu hỏi 11 hỏi liệu chúng có nên là một sổ hay không; câu này hỏi về **thứ tự**.) Màn hình Change Control bảo mọi người mở bản ghi *"before the change is made, not after"* — cách diễn đạt đó là của chúng tôi, không phải của quý vị — và đường đi trạng thái (Draft → Submitted → Under Review → Approved, implementation pending → In Implementation → Verification Pending → Completed) gợi ý rằng việc phê duyệt diễn ra trước công việc, nhưng đó chỉ là cách hiểu của chúng tôi.

**Hiện đang chạy như thế nào.** Một bản ghi có thể được mở trước, sau, hoặc không bao giờ. Một phiên bản công thức mới có thể được tạo mà không cần bản ghi nào. Ngoài ra, theo chỉ thị của chủ dự án, một phiên bản công thức mới chỉ có thể được tạo khi **Gate 05** là gate đang mở để làm việc.

*(Một thay đổi đã xảy ra vẫn có thể được ghi nhận sau đó: nó được nhập như một bản ghi hồi tố, được đánh dấu như vậy, và không giữ các gate lại — quy tắc riêng của chúng tôi, vì những gì đã xảy ra phải được ghi lại bất cứ khi nào nó được phát hiện. Vì vậy một Change Control có thể được mở sau thay đổi, và không cần câu trả lời về điều đó.)*

**(a)** Với một thay đổi công thức, một bản ghi Change Control đã được phê duyệt có phải là **điều kiện tiên quyết** để tạo phiên bản công thức mới, hay phiên bản được tạo trước và bản ghi được viết sau?

**(b)** Hiện một phiên bản công thức chỉ có thể được tạo khi Gate 05 đang mở. Một khi Gate 05 đã qua (từ Gate 06 trở đi, kể cả sau khi ra mắt), một thay đổi công thức đã được phê duyệt nên được thực hiện thế nào — bằng cách backtrack về Gate 05 và tạo phiên bản ở đó, hay bằng một đường khác?

## Câu hỏi 33 — Gate nào kiểm tra dòng nào của watch-list: mọi dòng tại Gate 4, hay mỗi dòng từ gate mà nó được liên kết?

*Vị trí trong ứng dụng:* Các register **Prohibited Ingredient Watch-list** và **Pregnancy / Breastfeeding Caution Limits**, cột "Linked gate".

Câu trả lời của quý vị về Gate 4 (câu hỏi 6 của quý vị) nói rằng Gate 4 phân loại **mọi dòng** của watch-list, và câu trả lời của quý vị về danh sách thai kỳ (câu hỏi 32(e) của quý vị) cho nó cùng một dấu vết reviewer.

Tuy nhiên, workbook liên kết mỗi dòng của cả hai danh sách với một gate trong cột **Linked gate** riêng của nó. Ở danh sách prohibited, mười dòng được liên kết với Gate 4, Retinol với Gate 7 và Bisphenol S với Gate 6; cả mười hai 
dòng của danh sách pregnancy / breastfeeding đều được liên kết với Gate 7.

Chúng tôi đã xây dựng theo hướng **một dòng được kiểm tra từ gate mà nó được liên kết trở đi**: một dòng liên kết với Gate 4 được kiểm tra tại Gate 4 và mọi gate sau đó; một dòng liên kết với Gate 7 được kiểm tra lần đầu tại Gate 7. Chúng tôi không làm theo kiểu "chỉ tại gate của chính nó", vì khi đó một vấn đề còn mở tại Gate 4 sẽ không còn chặn được Gate 7. Hệ quả là tại Gate 4 chỉ mười dòng của danh sách prohibited cần được phân loại, và danh sách pregnancy / breastfeeding chưa được kiểm tra ở đó; tại Gate 7 thì cả hai mươi bốn dòng đều được kiểm tra.

**Ví dụ:** Một công thức chứa một tinh dầu, là một dòng của danh sách pregnancy / breastfeeding được liên kết với Gate 7. Tại Gate 4 không ai phải phân loại nó. Tại Gate 7 nó phải được đánh giá và đóng lại, nếu không Gate 7 không qua.

**Câu hỏi:** có đúng là mỗi dòng chỉ được kiểm tra từ gate được nêu trong cột Linked gate của nó, thay vì mọi dòng tại Gate 4 không?

---

## Câu hỏi 34 — Tiêu chuẩn bằng chứng của Sheet 6 được thực thi như thế nào: gate nào, sheet nào, và thế nào là hoàn tất?

*Vị trí trong ứng dụng:* Trang **Evidence Hierarchy & Search Rules** (Sheet 6), cùng các trang **Needs & Scientific Basis**, **Competitor Landscape**, **Target Product & Tech Platform**, **Evidence Plan & Claim Support** và **Ingredient Monograph**.

Sheet "Evidence & Search Rules" nói rằng tiêu chuẩn này là bắt buộc đối với Sheets 1–5 và mọi sheet về hiệu quả hay claim, và **không nhu cầu hay claim nào được tiến sang công thức hoặc nhãn mà không có (a) một Grade bằng chứng được gán, (b) một kiểm tra khả năng chuyển giao (transferability) đã đạt hoặc một cờ suy luận tường minh, và (c) một bản ghi tìm kiếm đầy đủ, có ngày, có liên kết.**

Chúng tôi đã coi quy tắc này là đã được xác nhận, nhưng hiện nay **không có gì trong phần mềm kiểm tra nó**. Cuốn quy tắc là một trang tham chiếu mà năm sheet liên kết tới, và mỗi người tự áp dụng bằng tay. Cụ thể: một claim có thể mang một Grade bằng chứng (A–E, nhập tại Gate 8), nhưng một claim không có Grade vẫn qua mọi gate; không có chỗ có cấu trúc để ghi sáu bài kiểm tra transferability hay một cờ "inference" (Sheet 5, Ingredient Monograph, có hai cột văn bản tự do, "Does evidence transfer?" và "Inference vs proof", mà không gate nào đọc); và chỉ Sheet 1 (Needs) có bảng tìm kiếm tài liệu, mà không gate nào đọc. Chúng tôi cố ý chưa xây dựng gì cho đến khi quý vị cho biết nó nên hoạt động thế nào.

**(a)** Gate nào là "progress to formula" và "progress to label"? Cách hiểu của chúng tôi là Gate 5 (khóa công thức) và Gate 10 (phát hành thông tin được công bố).

**(b)** "Mọi sheet về hiệu quả hay claim" bao gồm những sheet nào, ngoài năm sheet đánh số (ví dụ các sheet mechanism-claims, functional-efficacy, clinical-evidence và SKU-claims)? Một **nhu cầu** (need) trên Sheet 1 có cũng cần Grade không, hay chỉ claim?

**(c) Grade.** Một claim có nên không thể qua gate mà quý vị nêu ở (a) nếu không có Grade không? Có nên bắt buộc sớm hơn Gate 8 không?

**(d) Transferability.** Kết quả nên được ghi thế nào: sáu câu trả lời đạt/không đạt (cùng hoạt chất, liều, vehicle, mức phơi nhiễm, endpoint, tác động phối hợp) hay một cờ "passes / inference only"? Khi bất kỳ bài kiểm tra nào không đạt, phần mềm có nên từ chối Grade A và B và yêu cầu cách diễn đạt "designed to", như quy tắc nói ("maximum Grade C") không?

**(e) Bản ghi tìm kiếm.** Một bản ghi cho cả dự án có đủ không (bảng của Sheet 1), hay mỗi sheet cần bản ghi riêng? Những trường nào khiến nó "đầy đủ": database, search string, ngày, tiêu chí đưa vào/loại trừ, số lượng bản ghi, DOI/PMID, liên kết https? Cả năm database được liệt kê đều bắt buộc, hay chỉ những cái thực sự đã được tìm kiếm?

---


## Câu hỏi 35 — Trạng thái giai đoạn của gate có phải là Complete trước khi sign-off được ghi Proceed không?

*Vị trí trong ứng dụng:* Khung **Gate N sign-off** trên tab gate (chữ ký Proceed) và cột "Stage status" của **Phase Gate Flow**.

Câu trả lời của quý vị về sign-off liệt kê *"gate status and proposed decision"* trong số những điều một chữ ký xác nhận. Như vậy trạng thái giai đoạn là một phần của những gì cả ba người ký đã thấy.

**Hệ quả.** Nếu ba chữ ký được đưa ra khi trạng thái giai đoạn vẫn là *In Progress*, rồi sau đó có người đổi nó sang *Complete*, thì trạng thái mà những người ký đã thấy đã thay đổi, nên **cả ba chữ ký đều hết hiệu lực (stale)** và ba người phải ký lại.

**Những gì đã xây dựng.** Trên màn hình sign-off, một chữ ký ghi **Proceed** hoặc **Proceed with Conditions** không thể được đưa ra cho đến khi trạng thái giai đoạn là **Complete**. Hold hoặc Backtrack vẫn có thể được ký ở bất kỳ trạng thái nào, vì chúng không tuyên bố rằng công việc đã xong. Đây chỉ là quy tắc của màn hình; bản ghi bên dưới không từ chối.

**Câu hỏi:** yêu cầu *Complete* trước một chữ ký Proceed có đúng không? Hay nên cho phép ký ở bất kỳ trạng thái nào, chấp nhận rằng một thay đổi trạng thái về sau làm các chữ ký hết hiệu lực (stale)?

## Câu hỏi 36 — Next Actions sau khi một gate đã đạt: việc thực hiện một điều kiện đã được chấp nhận có thể để các chữ ký vẫn hợp lệ không?

*Vị trí trong ứng dụng:* Bảng **Next Actions** trên tab gate sau khi gate đã pass, và khung **Gate N sign-off**.

Câu trả lời B2 của quý vị nói rằng action còn mở chỉ được tồn tại ở một gate khi quyết định của nó là *Proceed with Conditions*; câu trả lời F8 của quý vị nói rằng action Critical ngăn việc đóng thông thường và nói ai được đóng một action.

Danh sách các action còn mở là một phần của những gì ba người ký đã ký. Nếu nó thay đổi sai cách, **cả ba chữ ký đều hết hiệu lực (stale)**, và một gate đã đạt không thể được ký lại. Lối thoát duy nhất là Backtrack. Hai điểm liên quan là quy tắc riêng của chúng tôi và không cần câu trả lời: một vấn đề được phát hiện sau khi một gate đã đạt luôn **được ghi lại** — nó không thể được thêm thành action trên gate đã đạt, nên nó được ghi vào gate kế tiếp và đánh dấu là được phát hiện ở gate trước — và một action bị gỡ bỏ để lại dấu vết trong lịch sử (nó nói gì, ai gỡ, khi nào).

**Thực hiện một điều kiện.** Câu trả lời của quý vị nói chữ ký hết hiệu lực (stale) nếu bằng chứng đã ký thay đổi, và câu trả lời B2 của quý vị nói các action của một gate *Proceed with Conditions* được theo dõi trong khi chúng được xử lý. Đọc theo nghĩa đen, hai điều này mâu thuẫn: đóng một điều kiện làm thay đổi danh sách action còn mở và do đó sẽ làm mất hiệu lực các chữ ký, và gate sẽ không bao giờ tự xóa được các điều kiện của mình nếu không Backtrack. Chúng tôi hiểu các action còn mở tại thời điểm ký là **các điều kiện đã được chấp nhận**. Vì vậy việc thực hiện chúng — đổi trạng thái, đóng, hủy, đổi owner hoặc ngày đến hạn — **không** làm các chữ ký hết hiệu lực (stale). Thay đổi điều mà một điều kiện *nói* thì có: mô tả của nó, gate của nó, hạ mức ưu tiên, gỡ bỏ nó, hoặc thêm một điều kiện mới. Sau khi gate đã đạt, một action đã đóng hoặc đã hủy bị đóng băng hoàn toàn, và một action còn mở chỉ được đổi trạng thái, owner và ngày đến hạn.
**Câu hỏi:** việc thực hiện một điều kiện đã được chấp nhận sau khi ký mà không cần ba người ký ký lại có đúng không? Nếu không, một gate *Proceed with Conditions* nên đóng các điều kiện của chính nó như thế nào mà không cần Backtrack?

## Câu hỏi 37 — Mỗi chức năng "Owner" trong các sheet đại diện cho người nào trong một dự án?

*Vị trí trong ứng dụng:* Cột "Owner" của các register dòng cố định và bảng phase; người được chọn ở form **Create New Project** (trang **All Projects**), mỗi khu vực rà soát một reviewer.

Các dòng cố định của workbook ghi một **chức năng** trong cột Owner ("Project owner", "R&I", "Regulatory", "Quality" …), không bao giờ ghi một người, vì bảng tính không có dự án để lấy tên. Trên một dự án, mỗi chức năng tương ứng với một trong 13 vai trò rà soát, và người cho vai trò đó được chọn khi tạo dự án. Workbook không nói chức năng nào là vai trò nào.

**Những gì đã xây dựng, chỉ để hiển thị** (không thay đổi quy tắc hay quyền nào): ô Owner hiển thị chức năng và, bên cạnh, người được phân công trên dự án đó: Project owner → Project Manager · R&I → R&I · Regulatory → Regulatory Affairs Manager · Quality → Production Support · Packaging → vai trò packaging (được gán nhãn "Sales Manager" trên form Create New Project) · Marketing, Sales → Project Lead (Sales & Marketing) · Procurement → Raw Material Coordinator · Formulation, NPD → Technical Services. (Đây là các nhãn vai trò như hiển thị trên form Create New Project.) Một chức năng không có cặp tương ứng (Safety, Clinical, Claims, Finance, Legal, Manufacturing, Artwork …) được hiển thị như đã viết, không kèm người.

**(a)** Các cặp đó có đúng không — đặc biệt là Project owner có phải là Project Manager, Quality có phải là vai trò Production Support, và vai trò packaging có thật sự là vai trò mà form gọi là "Sales Manager" không?

**(b)** Các chức năng không có cặp (Safety, Clinical, Claims, Finance và v.v.) thuộc về vai trò rà soát nào, hay chúng không có người cố định?

## Câu hỏi 38 — Một cột "change reference" trỏ tới cái gì?

*Vị trí trong ứng dụng:* **Released Label vs Current Artwork Register** ("Artwork Change Control ref") trong **Released Label Control**; register **Artwork Change Control**; trang **Change Control & Communication**.

Câu hỏi này tiếp nối câu hỏi 11. Trong workbook, một số sheet có cột cho **reference** của một thay đổi — ví dụ *Artwork Change Control ref* trên Released Label vs Current Artwork Register. Tuy nhiên sheet *Artwork Change Control* không phải là nhật ký các thay đổi artwork riêng lẻ: nó là một bộ quy tắc cố định gồm năm trigger (lỗi artwork · thay đổi công thức ảnh hưởng đến nhãn · cập nhật quy định · thay đổi câu chữ claim · một nhãn đã phát hành khác với hình ảnh trên thị trường). Vì vậy không có dòng nào để một reference trỏ tới. Bản ghi thật của một thay đổi là trang Change Control & Communication (đánh số CHG-001 và tiếp theo).

**Những gì đã xây dựng.** Tất cả các cột reference này là văn bản thuần do quý vị gõ. Thay đổi duy nhất là nhãn.

*Ví dụ:* một nhãn được in lại vì quy định thay đổi. Trong ô *Artwork Change Control ref* có người gõ "CHG-014", hoặc "regulatory update", hoặc không gõ gì, và không có gì kiểm tra.

**(a)** "Artwork Change Control ref" là số của một bản ghi Change Control, hay nó chỉ nói thay đổi này thuộc trigger nào trong năm trigger?

**(b)** Nếu nó là số bản ghi, thì các cột change-reference khác (Change Control & Communication ID, Change register ID và hai cột Linked Change ID) có đều trỏ tới cùng bản ghi đó không?

**(c)** Một thay đổi artwork có thể liên quan đến nhiều hơn một bản ghi thay đổi không?

## Câu hỏi 39 — Batch Formula Trace: cái gì xác định một dòng?

*Vị trí trong ứng dụng:* Register **Batch Formula Trace** và **Shipment Label & Batch Verification** (trong **Released Label Control**).

Trong workbook, *Shipment Label & Batch Verification* có một ô "Batch Formula Trace ref" để gõ vào, và sheet *Batch Formula Trace* không có cột nào xác định một dòng, nên không có gì để trỏ tới.

**Những gì đã xây dựng.** Chúng tôi đã thêm một cột **Trace ID** vào Batch Formula Trace (BT-001, BT-002 … do phần mềm tạo, không bao giờ gõ tay), và reference trên sheet Shipment Label nay là lựa chọn trong các ID đó. Cột này không có trong workbook, và một reference cũ đã gõ mà không khớp ID nào sẽ hiển thị trống cho đến khi được chọn lại.

*Ví dụ:* một lô kem được kiểm tra đối chiếu với trace của batch 24B017. Người kiểm tra chọn "BT-007" từ danh sách thay vì gõ số batch.

**(a)** Mỗi dòng Batch Formula Trace có nên được xác định bằng một mã như vậy không, hay "ref" thực chất là số batch / lot (có thể giống nhau trên nhiều SKU)?

**(b)** Nếu nó là batch hoặc lot, và một lot phục vụ nhiều SKU, thì reference trỏ tới dòng nào?

## Câu hỏi 40 — Artwork / Label Review Checklist: năm dòng "Correct names for PI", và gate nào yêu cầu nó

*Vị trí trong ứng dụng:* Trang **Packaging Specs & Artwork Evidence**, bảng **Artwork / Label Review Checklist**.

Trang *Packaging Specs & Artwork Evidence* nay mang **Artwork / Label Review Checklist** của sheet: tám dòng chuẩn (bảy mục rà soát và một mục về tag cho các chiết xuất độc quyền trên nhãn) theo đúng các cột của sheet. Bên dưới, sheet có năm dòng "Correct names for PI" nằm dưới cùng tiêu đề nhưng dùng các cột khác đi: ô Requirement chứa một tên INCI (ví dụ *Salvia microphylla water extract*) và ô Evidence link chứa tên thương mại cần in (ví dụ *Salvotect™ (MBc Research Parks PI)*), không có Owner và không có Status.

**Những gì đã xây dựng.** Chúng tôi đã gộp hai ô thành một requirement, "INCI name → name to print", và để trống Evidence link để người dùng dán một liên kết thật (một tên thương mại trong ô đó sẽ làm dòng trông như thể đã có bằng chứng). Bảng là một danh sách cố định, khóa tại cùng các gate với bảng packaging component (Gate 6, 10 và 11). Chưa có điều kiện gate nào đọc nó.

**(a)** Năm dòng tên đó là một **danh sách tham chiếu** các tên cần in, hay là năm mục cần được **rà soát** như bảy mục đầu, cần Owner và Status?

**(b)** Checklist này phải hoàn tất tại gate nào — đặc biệt, nó có bắt buộc trước "Final proof release" không?

**(c)** Tên thương mại được ghi ở đây có phải là **chuẩn** mà claim và nhãn phải khớp không?

## Câu hỏi 41 — "Incomplete — evidence review required": một gợi ý hiển thị, hay một giá trị người dùng có thể chọn?

*Vị trí trong ứng dụng:* Register **Supplier & Raw Material Evidence**, cột "Evidence review status".

Câu trả lời D4 Round 3 của quý vị yêu cầu một bản ghi nguyên liệu thô được tạo tự động từ Cosmetri phải được **hiển thị rõ ràng** là thiếu bằng chứng, không bao giờ mặc định là Approved for Use, hiển thị trong danh sách readiness, và chặn Gate 4.

**Những gì đã xây dựng.** Cột *Evidence review status* bắt đầu **trống**, và một ô trống hiển thị "Incomplete — evidence review required" như một gợi ý màu xám. Chỉ có hai giá trị thực sự chọn được: *Conditionally accepted — controlled action open* và *Considered — not used in this formula* (cả hai đã được xác nhận ở Round 4). Mọi điều kiện khác trong D4 vẫn giữ nguyên: nó không bao giờ mặc định là Approved, nó hiển thị trong danh sách readiness, và nó chặn Gate 4. Trước đây, "Incomplete — evidence review required" là một giá trị được lưu mà mọi dòng mới đều nhận; nó có nghĩa hệt như một ô trống cộng với ô *Approved for use* chưa tích, nên chúng tôi đã loại bỏ nó.

**Câu hỏi:** việc hiển thị đoạn văn bản đó như gợi ý của một ô trống, thay vì một giá trị được lưu trong danh sách, có thỏa mãn điều quý vị muốn nói bằng "clearly marked" không?

## Câu hỏi 42 — Một dự án có thử nghiệm nhiều hơn một mẫu với panel nội bộ không?

*Vị trí trong ứng dụng:* Trang **Product / Sample Feedback** (khối sample under evaluation và nhật ký feedback).

Sheet *Product / Sample Feedback* vẽ **một** khối cho mẫu đang được đánh giá (product / SKU, product family, development stage, linked change ID, sample or batch code, formula version, date samples issued, panel coordinator) và một nhật ký phản hồi — một dòng cho mỗi người thử cho mỗi mẫu. Không có gì trong nhật ký nói một dòng nói về mẫu nào. Cụm từ "per sample" gợi ý rằng mỗi tab Excel là một mẫu, và thử nghiệm một mẫu khác nghĩa là sao chép tab, điều mà phần mềm không có tương đương.

**Những gì đã xây dựng.** Một dự án có thể chứa **nhiều mẫu**. Mỗi mẫu có tám trường trên (gõ vào), phản hồi của mỗi người thử thuộc về một mẫu, và các tổng và danh sách hiển thị mẫu đang được chọn. Một dự án có một mẫu hoạt động như trước, và phản hồi cũ được thu thập dưới một mẫu mặc định đặt tên theo sản phẩm của dự án.

*Ví dụ:* công thức được thử nghiệm ở hai phiên bản, F1.0 và F1.1, với một panel 12 người. Hai mẫu được tạo và câu trả lời của mỗi người thử được ghi theo phiên bản họ đã dùng.

**(a)** Một dự án có thử nghiệm nhiều hơn một mẫu với panel nội bộ không? Nếu có, chúng thường là các phiên bản công thức kế tiếp nhau, hay nhiều biến thể cùng lúc?

**(b)** Mỗi mẫu nên có nhật ký riêng, hay một nhật ký chung với cột "sample"?

**(c)** **Linked Change ID** của mẫu nên trỏ tới một bản ghi Change Control (xem câu hỏi 38) hay vẫn là một mã người dùng gõ?

---

## Tóm tắt

| # | Chủ đề | Vì sao quan trọng |
|---|---|---|
| 1 | Ai là reviewer chịu trách nhiệm của một mục | Chặn nửa xác nhận (acknowledgement) của N/A tự động tạo |
| 2 | Câu trả lời change-control một lần cho mỗi dự án hay cho mỗi phát hiện | Đã xây dựng theo cách hiểu của chúng tôi — làm lại nếu sai |
| 3 | Các phát hiện an toàn bị Superseded | Đã xây dựng theo cách hiểu của chúng tôi — làm lại nếu sai |
| 4 | Watch-list của Gate 4: cờ tự động có nên áp dụng cho danh sách Caution không; product status được cập nhật đến gate nào | Đã xây dựng theo cách hiểu của chúng tôi — làm lại nếu sai |
| 5 | Supersession phiên bản công thức: ai xác nhận, và khi nào phiên bản cũ đổi trạng thái | Đã xây dựng; người xác nhận và thời điểm kích hoạt là do chúng tôi |
| 6 | Ai quyết định một thay đổi Claims Library là "critical" | Đã thiết kế, chưa xây dựng — nó có thể rút một sản phẩm khỏi thị trường |
| 7 | Trigger scale-up: mười tám khu vực, và "công thức mới" là gì | Đang chờ câu trả lời; phụ thuộc câu hỏi 10 |
| 8 | Quyền Safety/Regulatory chấp nhận một phát hiện watch-list nằm ở đâu: reviewer hay người duyệt gate | Đã xây dựng theo cách hiểu của chủ dự án, khác với cách diễn đạt của quý vị |
| 9 | "Controlled action" là gì đối với một gap; các yêu cầu bị hoãn | Đã xây dựng một phần; phần ngày của một gap High chưa được thực thi |
| 10 | Change Control có nên mở lại một gate đã đạt không | Chưa xây dựng — và nó gặp câu trả lời F9 của quý vị về các thay đổi bị từ chối như thế nào (Gate 11 và 12 sẽ để lại một lý do được ghi, quy tắc riêng của chúng tôi) |
| 11 | **Chín nơi một thay đổi được ghi lại — nên có bao nhiêu** (gồm phê duyệt của Final Approver và những bản ghi nào được tính là hợp lệ) | **Công việc dừng cho đến khi có câu trả lời.** Một thay đổi công thức lớn không bao giờ đến phía change-control, nên Gate 11 không bao giờ cân nhắc nó |
| 12 | Thêm một thị trường hoặc một phiên bản Major có mở lại các gate trước không | Đã xây dựng theo "Major mở lại 4–12; thêm thị trường không mở lại gì" |
| 13 | Hành động "đóng" hai phê duyệt trên các sổ | **Đã xây dựng, trước khi hỏi quý vị** |
| 14 | Một dòng requirement Phase 2–4 có thể là N/A không | Đã xây dựng: N/A kèm lý do được tính là đã xử lý, như ở Phase 1 — dòng nào không bao giờ được chấp nhận nó? |
| 15 | Hoãn một requirement Should/Could; mỗi dòng có cần một mức ưu tiên không | 15(b) đang chạy theo cách hiểu của chúng tôi |
| 16 | Màn sàng lọc chung về chất hạn chế và thận trọng | Đã xây dựng; bốn lựa chọn là của chúng tôi, và (c) có thể là một thiếu sót thật |
| 17 | Các kênh công bố; khi nào một claim được duyệt cho một thị trường và kênh | Câu trả lời của quý vị liệt kê trường nhưng không có giá trị; phần của chúng tôi là tự lắp ghép |
| 18 | Rà soát claim tại Gate 3: "Not Approved", các trường Technical review, ai duyệt một revision | Đã xây dựng như trên; là của chúng tôi |
| 19 | Gate 10–12 theo từng thị trường: thị trường bị rút; mọi thị trường có phải sẵn sàng cùng lúc | Đã xây dựng theo "không có slot Gate 12 sau khi rút; mọi thị trường đang hoạt động" |
| 20 | Gate 10: checklist và giá trị phê duyệt nào được qua | Đã xây dựng như trên; là của chúng tôi |
| 21 | Kết quả costing cho phép một Proceed thuần | Vị trí của hai giá trị giữa là của chúng tôi |
| 22 | Gate 12: điều gì đóng phản hồi hiệu năng sản phẩm; tín hiệu nào đưa một đợt rà soát lên sớm hơn | Đã xây dựng như trên; là của chúng tôi |
| 23 | Khi nào một người được giữ hai vai trò trên cùng một bản ghi | Đã bỏ hai kiểm tra thừa — người chuẩn bị gate nay có thể duyệt nó |
| 24 | Một action Critical và quyết định gate | Đã xây dựng theo "còn mở thì chặn mọi quyết định; đã đóng thì không chặn gì" |
| 25 | Một thị trường có phê duyệt ra mắt còn hiệu lực — PIF của nó có được mở lại không | Đã xây dựng theo "phê duyệt ra mắt không được còn là Approved" |
| 26 | Một bản ghi deviation nên chứa gì khi một thứ được phát hành mà không có phê duyệt | Chưa xây dựng — bản ghi tự nó là quyết định của chúng tôi; câu trả lời của quý vị quyết định nó chứa và làm gì |
| 27 | Ai chấp nhận pre-work của một phase | Đã xây dựng theo "chủ rà soát phase hoặc Lead của dự án"; việc đánh dấu từng mục quý vị yêu cầu còn nợ |
| 28 | Cơ sở bằng chứng của claim và quyết định phát hành được điền tại gate nào | Đã xây dựng tại Gate 3 và Gate 11 |
| 29 | Điều gì chứng minh phiên bản artwork đã duyệt tại Gate 11 | Gate 11 và Q30(c) của quý vị đọc các bản ghi khác nhau |
| 30 | Yêu cầu bao bì của một thị trường được ghi ở đâu, và điều gì đóng mục này | Đã xây dựng trên market profile |
| 31 | Những sổ nào được để trống trên một dự án và những sổ nào luôn phải có mục (cả 78 được liệt kê cùng giả định hiện tại) | Sổ claims của Gate 10 được cố định theo cách hiểu của chúng tôi; phần còn lại là giả định của chúng tôi để quý vị đánh dấu |
| 32 | Một Change Control đã được phê duyệt có phải là điều kiện tiên quyết cho một phiên bản công thức mới không; một thay đổi được thực hiện thế nào sau Gate 05 | Hiện không có gì thực thi một thứ tự; một phiên bản công thức mới chỉ có thể được tạo khi Gate 05 là gate đang mở |
| 33 | Gate nào kiểm tra dòng watch-list nào: mọi dòng tại Gate 4, hay mỗi dòng từ Linked gate của nó | Đã xây dựng theo cách hiểu của chủ dự án, thu hẹp câu trả lời Gate 4 của quý vị |
| 34 | Tiêu chuẩn bằng chứng Sheet 6 (Grade, transferability, search record) được thực thi như thế nào: gate nào, sheet nào, thế nào là hoàn tất | Chưa xây dựng — hiện không có gì kiểm tra nó; bộ quy tắc là một trang tham chiếu |
| 35 | Trạng thái giai đoạn có phải là Complete trước một chữ ký Proceed không | Chỉ đã xây dựng trên màn hình sign-off; nếu không, một thay đổi trạng thái sau đó làm cả ba chữ ký hết hiệu lực (stale) |
| 36 | Việc thực hiện một điều kiện đã được chấp nhận sau khi một gate đã đạt có thể để các chữ ký vẫn hợp lệ không | Đã xây dựng theo "điều kiện có thể được xử lý mà không ký lại" |
| 37 | Mỗi chức năng "Owner" đại diện cho người nào của dự án | Chỉ để hiển thị; tám cặp là của chúng tôi |
| 38 | Một cột "change reference" trỏ tới cái gì (Artwork Change Control ref và các cột khác) | Hiện là văn bản thuần; phụ thuộc câu hỏi 11 |
| 39 | Cái gì xác định một dòng Batch Formula Trace | Chúng tôi đã thêm một Trace ID do hệ thống tạo, không có trong workbook |
| 40 | Năm dòng "Correct names for PI" và gate nào yêu cầu Artwork / Label Review Checklist | Đã xây dựng như một danh sách cố định khóa tại Gate 6, 10, 11; chưa có gate nào đọc nó |
| 41 | "Incomplete — evidence review required" có đủ làm gợi ý trên một ô trống không | Đã xây dựng theo cách đó; thay thế một giá trị được lưu |
| 42 | Một dự án có thử nghiệm nhiều hơn một mẫu với panel nội bộ không | Đã xây dựng thành nhiều mẫu cho mỗi dự án |

