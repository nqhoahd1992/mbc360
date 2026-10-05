# MBc360 — Tổng hợp quy tắc nghiệp vụ

**Đây là gì.** Toàn bộ quy tắc nghiệp vụ mà đội chuyên môn đã xác nhận, qua cả bốn vòng hỏi đáp, sắp xếp lại **theo chủ đề** thay vì theo vòng. Khi nhiều câu hỏi ở các vòng khác nhau cùng chi phối một chủ đề, chúng được gộp thành một quy tắc duy nhất ở đây, và **mỗi phát biểu đều mang mã vòng + mã câu đã sinh ra nó**, nên bất kỳ câu nào cũng truy ngược được về đúng câu trả lời gốc.

**Đây không phải là gì.** Tài liệu này không quyết định điều gì cả. Nó chỉ sắp xếp lại một hồ sơ đã có. Hồ sơ theo trình tự thời gian — câu hỏi của từng vòng, câu trả lời nguyên văn và phần thảo luận xung quanh — vẫn nằm ở `Business_Rules_Confirmation_VN.md` và các file vòng trong `docs/rounds/`. **Nếu tài liệu này và hồ sơ đó mâu thuẫn, hồ sơ đó đúng** và file này là file phải sửa.

---

## 0. Cách đọc mã nguồn gốc

Mỗi quy tắc đều kèm một hoặc nhiều mã trong ngoặc vuông chỉ ra nguồn của nó.

| Mã | Vòng | Ngày trả lời | Cách đánh số |
|---|---|---|---|
| `R1-xx` | Vòng 1 — bảng xác nhận ban đầu | 2026-07-16 | Nhóm A1–A5, B1–B5, C1–C7 |
| `R2-xx` | Vòng 2 — các câu hỏi tiếp nối dòng F | 2026-07-21 | F1–F14, cộng A5, B5, C7 được trả lời ở vòng này |
| `R3-xx` | Vòng 3 — các câu về điều kiện qua cổng | 2026-08-07 | Phần A1–A3, B1–B7, C1–C2, D1–D4, E1–E3 |
| `R4-Cnn` | Vòng 4 — 36 câu hỏi | 2026-08-24 | **C = số câu hỏi theo bản đã gửi** cho đội chuyên môn (1–36) |
| `V2` | File workbook v2, do chính đội chuyên gia soạn | 2026-07-24 | Coi như đã xác nhận, không cần vòng hỏi riêng |
| `PO` | Do chủ dự án quyết định, **không** hỏi đội chuyên môn | nhiều mốc | Chỉ ở mục 20 |

**Hai lưu ý về cách đánh số.**

1. Vòng 1 và Vòng 3 đều dùng chữ cái A, B, C. `R1-A1` (kiến trúc dự án và thị trường) và `R3-A1` (quy tắc phân tầng) là hai câu khác nhau. Luôn phải có tiền tố vòng.
2. `R4-Cnn` là số câu **theo bản đã gửi**. Trong mã nguồn còn một hệ đánh số nội bộ (`R4-Q1`…`R4-Q33`) **không trùng khớp** — ví dụ câu gửi số 29 là câu nội bộ số 26. Bảng đối chiếu nằm ở `Business_Rules_Confirmation_VN.md`, Phụ lục 3, mục "Index — all 36". Khi trao đổi nghiệp vụ, luôn dùng số theo bản đã gửi.

**Ký hiệu dùng bên dưới:** ⚠️ câu trả lời lật lại thứ đã xây · 🆕 câu trả lời tạo ra yêu cầu mới chưa từng có · ⏳ vẫn còn mở.

---

## 1. Mục đích hệ thống và ranh giới phạm vi

**MBc360 là nền tảng bằng chứng và quản trị duy nhất của công ty, và nó tích hợp với các hệ chuyên dụng chứ không thay thế chúng.** `[R1 — mục đích tổng thể]`

**MBc360 không được tạo ra hay duy trì tài liệu GMP** — BOM sản xuất, lịch sản xuất, hồ sơ lô sản xuất, hướng dẫn công việc GMP. Bộ phận Sản xuất đã có hệ GMP được kiểm soát riêng. Thay vào đó MBc360 chỉ lưu **đường dẫn** tới các tài liệu được kiểm soát đó — tránh trùng lặp mà vẫn giữ được truy vết. `[R1 — yêu cầu GMP, do đội chuyên môn bổ sung]`

---

## 2. Kiến trúc dự án và thị trường

**Một dự án, một luồng phát triển, luồng pháp lý theo từng thị trường.** Một dự án tổng chạy **một luồng chung cho Cổng 1–9**, còn **Cổng 10–12 được theo dõi riêng cho từng thị trường**. Công thức chỉ phát triển một lần; phê duyệt pháp lý, trạng thái PIF, phê duyệt claim và mức sẵn sàng ra mắt có thể khác nhau theo quốc gia. Mỗi thị trường mang trạng thái PIF, trạng thái pháp lý, phê duyệt claim, phê duyệt ra mắt, ghi chú pháp lý và ngày phê duyệt của riêng nó. `[R1-A1]`

**Tính theo thị trường áp dụng cho cả chữ ký, không chỉ trạng thái.** Prepared, Reviewed và Approved phải được ghi nhận **theo từng thị trường tại Cổng 10 và 11**, vì mỗi thị trường có thể khác nhau về trạng thái hồ sơ, quyết định pháp lý, claim, bao bì nghệ thuật, phiên bản công thức và ngày ra mắt. Rà soát hậu mãi ở Cổng 12 cũng vận hành theo thị trường, và Pha 4 mang trạng thái theo thị trường. Có thể giữ một bản tóm tắt Pha 4 ở cấp dự án, **nhưng chỉ như một bản tổng hợp — không được thay thế các phê duyệt theo thị trường.** `[R4-C18]` `[R3-E3a ⚠️]`

**Một thị trường được duyệt không bao giờ được làm cả dự án trông như đã sẵn sàng.** Mỗi thị trường đang hoạt động mang mức sẵn sàng Cổng 10, trạng thái hồ sơ/PIF, phê duyệt claim, phê duyệt pháp lý, mức sẵn sàng Cổng 11, phê duyệt ra mắt, ngày phê duyệt, **phiên bản công thức áp dụng** và **phiên bản bao bì nghệ thuật áp dụng** của riêng nó. `[R3-E3a ⚠️]`

**Thêm và bỏ thị trường.** Thêm một thị trường sẽ tạo luồng theo thị trường mới và có thể kích hoạt lại các cổng trước đó nếu thị trường này khác biệt. Bỏ một thị trường thì đánh dấu **Rút khỏi / Hủy / Không tiếp tục, kèm lý do — không bao giờ xóa.** `[R2-F4]`

**Danh sách thị trường là nguồn duy nhất.** Tham số Quốc gia / Thị trường là nơi duy nhất ghi nhận thị trường; không được tồn tại song song một trường văn bản tự do "thị trường mục tiêu ban đầu". Tham số này **không bắt buộc khi mở khung dự án** nhưng **bắt buộc trước khi Cổng 1 được thông qua**. `[R4-C24 ⚠️]`

**Trạng thái cấp dự án là bản tổng hợp từ các thị trường, gồm năm giá trị:** Chưa ra mắt · Ra mắt một phần · Đã ra mắt ở toàn bộ thị trường đang hoạt động · Đang chuyển tiếp thị trường · Đã rút. `[R4-C14]` Một bản tổng hợp năm giá trị tương đương cũng được đưa ra cho mức hoàn tất: Hoàn tất phát triển · Được duyệt ở một số thị trường · Được duyệt ở toàn bộ thị trường đang hoạt động · Đang chuyển tiếp thị trường · Đã đóng hoàn toàn. `[R2-F4]`

---

## 3. Phiên bản công thức và thay đổi công thức

**Một phiên bản công thức mới sẽ mở lại Cổng 4–9 trên chính dự án đang có** — không tạo dự án mới. Dự án gốc vẫn là lịch sử tổng; thông tin Pha 1 (nhu cầu người dùng, ý tưởng sản phẩm, thị trường) được giữ nguyên; thiết kế lại công thức, kiểm nghiệm, an toàn và thẩm định được làm lại. **Thay đổi công thức mức Major tự động tạo một phiên bản công thức mới**, các phiên bản trước được bảo tồn để phục vụ lịch sử kiểm toán. `[R1-A2]`

**Phân loại Major hay Minor dựa trên danh mục trigger của Formula Change Control, và phải được người có thẩm quyền xác nhận.** Major = bất kỳ thay đổi nào có thể ảnh hưởng tới an toàn hoặc mức phơi nhiễm, hiệu quả hoặc cơ sở chứng minh claim, hệ bảo quản, định danh nguyên liệu, nồng độ hoạt chất, trạng thái pháp lý, hồ sơ chất gây dị ứng, pH ra ngoài khoảng, dạng sản phẩm, quy trình ảnh hưởng tới hiệu lực hoặc hiệu năng, độ ổn định, tính tương thích bao bì, công bố trên nhãn, hoặc đăng ký thị trường. **Người khởi tạo có thể đề xuất phân loại, nhưng một người rà soát kỹ thuật hoặc chất lượng có thẩm quyền phải xác nhận — không phải chỉ do người dùng tự chọn.** `[R2-F5]`

**Một thay đổi được phân loại Major cũng được tính là tái lập công thức mức Major cho trigger scale-up ở Cổng 9.** `[R4-C12]`

**Hai phiên bản công thức có thể cùng tồn tại.** Phiên bản cũ giữ nguyên các luồng Cổng 10–12 theo thị trường đã đóng; thay đổi Major mở một luồng theo thị trường **mới** cho phiên bản mới. Phiên bản cũ vẫn ở trên thị trường cho tới khi chính thức bị thay thế, rút hoặc bán hết. `[R2-F4]`

**Phiên bản cũ không tự động đóng khi phiên bản thay thế được duyệt.** 🆕 Các trạng thái phiên bản: Active · Transition Approved · Transition in Progress · Superseded · Withdrawn · Cancelled. Việc duyệt phiên bản mới chuyển phiên bản cũ sang **Transition in Progress**, không phải Superseded. `[R4-C2]`

**Chỉ chuyển sang Superseded sau khi một con người xác nhận mười điều, cho từng thị trường liên quan:** phiên bản công thức thay thế · ngày chuyển tiếp hiệu lực · ngày sản xuất hoặc xuất xưởng cuối cùng của phiên bản cũ · phương án xử lý tồn kho hoặc bán hết hàng · trạng thái thông báo hoặc đăng ký pháp lý · chuyển tiếp bao bì nghệ thuật và danh sách thành phần · cập nhật PIF / Product Master File · truyền thông tới Kinh doanh và Marketing · truyền thông cần thiết tới nhà phân phối hoặc khách hàng · xác nhận không còn lô nào được xuất theo phiên bản cũ trừ khi được cho phép cụ thể. **Quyết định thay thế phải do con người ghi nhận — hệ thống không bao giờ được tự suy diễn.** `[R4-C2]`

---

## 4. Dữ liệu gốc nguyên liệu và nhà cung cấp

**Cosmetri là nguồn dữ liệu gốc, MBc360 chỉ đọc.** Dữ liệu gốc nguyên liệu đã có trong Cosmetri và được lấy qua API — không nhập lại, không trùng lặp trong MBc360. Dữ liệu nhà cung cấp cũng nên lấy từ Cosmetri khi có thể. Tài liệu bằng chứng (SDS, CoA, TDS, bản công bố chất gây dị ứng) **vẫn lưu trong Cosmetri**; MBc360 chỉ tham chiếu và liên kết tới. Mọi việc chỉnh sửa dữ liệu gốc đều nằm trong Cosmetri. MBc360 chỉ lưu bằng chứng và liên kết riêng của từng dự án. `[R1-A3]`

**Dữ liệu API không cung cấp thì nhập thủ công trong MBc360** — thông tin nhà cung cấp ngoài tên, và đường dẫn tài liệu. Nguyên liệu chưa có trong Cosmetri được đề nghị qua quy trình "Tạo nguyên liệu mới"; sau khi được duyệt và nhập vào Cosmetri thì MBc360 mới dùng được. `[R1-A3, quyết định tiếp nối 2026-07-16]`

**Cả hai cách nhập BOM đều được chấp nhận, kèm đối soát bắt buộc.** Nhập Formula BOM thủ công chỉ được chấp nhận **cho giai đoạn phát triển thử nghiệm ban đầu**, trước khi công thức được chính thức đưa vào Cosmetri. Công thức thủ công phải được đánh dấu rõ **"Bản nháp — chưa đối soát với Cosmetri"**. Cosmetri trở thành **hệ thống hồ sơ được kiểm soát bắt buộc trước khi phê duyệt an toàn cuối cùng ở Cổng 7** và trước khi hoàn tất hồ sơ pháp lý. **Cổng 10 và 11 phải dùng công thức và phiên bản được kiểm soát từ Cosmetri.** Sau khi đối soát xong, các trường định danh / INCI / CAS / thành phần đã nhập bị khóa khỏi việc chỉnh sửa ngoài kiểm soát, và mọi khác biệt giữa MBc360 và Cosmetri được xử lý qua quy trình so sánh công thức và kiểm soát thay đổi. `[R2-A5]` `[R2-F14]`

**Việc nhập công thức không được thất bại chỉ vì hồ sơ bằng chứng còn trống.** Tạo một bản ghi bằng chứng chỉ có định danh khi nhập là được chấp nhận và được ưu tiên, với năm điều kiện: bản ghi đó phải được gắn nhãn rõ **"Chưa đầy đủ — cần rà soát bằng chứng"** · **không** được mặc định là Approved for Use · bằng chứng còn thiếu phải xuất hiện trong bảng Gate Readiness · **Cổng 4 không được thông qua cho tới khi mọi nguyên liệu liên quan đã được rà soát đầy đủ hoặc được chấp nhận chính thức qua một quyết định có điều kiện được kiểm soát** · phê duyệt an toàn cuối cùng ở Cổng 7 phải dùng trạng thái bằng chứng đã hoàn tất, và **Cổng 10, 11 không được dựa vào các bản ghi chỉ-có-định-danh còn dang dở.** `[R3-D4]` Năm trong sáu cách hiểu của quy tắc này được xác nhận là đã làm đúng. `[R4-C31(a)–(e)]`

**⚠️ Tại Cổng 7, 10 và 11, việc chặn cứng chỉ áp dụng cho nguyên liệu thực sự có mặt trong công thức hiện tại.** Nguyên liệu đã được xử lý chính thức là không sử dụng thì không được chặn các cổng đó; một ứng viên ngoài công thức còn thiếu bằng chứng có thể sinh ra **cảnh báo** nhưng không được chặn việc xuất xưởng khi sản phẩm không phụ thuộc vào nó. Cổng 4 vẫn giữ phạm vi rộng. `[R4-C31(f)]`

**🆕 Rủi ro thành phần là dữ liệu dùng chung toàn công ty, không nhập lại theo từng dự án.** Một **Lớp phủ Rủi ro Nguyên liệu (Raw Material Risk Overlay)**, khóa theo mã nguyên liệu của Cosmetri, lưu mười một phân loại mà API Cosmetri không cung cấp: Hương liệu · Tinh dầu · Chiết xuất thực vật · Protein · Chất gây dị ứng đã biết · Rủi ro dung môi tồn dư · Rủi ro kim loại nặng · Rủi ro vi sinh · Tạp chất bị hạn chế · Tồn dư từ quá trình chế biến · Thành phần từ nguồn tự nhiên biến thiên. Nó không phải là một bộ dữ liệu gốc nguyên liệu thứ hai. Nó phải dùng lại được giữa các dự án, do người dùng Kỹ thuật, An toàn và Pháp chế có thẩm quyền kiểm soát, lưu lịch sử phiên bản, ghi nhận liên kết bằng chứng và ngày rà soát, và được chuyển sang Cosmetri nếu hệ đó có năng lực này. `[R4-C17]`

**⏳ Vẫn còn mở — mức bao phủ tuân thủ ASEAN / Việt Nam của Cosmetri.** Đội chuyên môn không thể xác nhận từ tài liệu API rằng dữ liệu tuân thủ của Cosmetri có bao phủ ASEAN hay Việt Nam; điều này còn mở cho tới khi Cosmetri xác nhận. Trong thời gian đó MBc360 phải chỉ dùng dữ liệu tuân thủ Cosmetri khi có vùng thị trường tương ứng, hiển thị vùng thị trường nguồn và ngày cập nhật gần nhất, **không bao giờ giả định tuân thủ EU/UK/US tương đương ASEAN hay Việt Nam**, chạy thêm một bước sàng lọc pháp lý theo thị trường của riêng mình, và cho phép Pháp chế đính kèm kết luận và bằng chứng ASEAN/VN riêng. `[R2-F12 ⏳]`

---

## 5. Phân quyền, vai trò và chữ ký điện tử

**Phân quyền theo vai trò là bắt buộc, và đóng góp không đồng nghĩa với phê duyệt.** Chỉ Pháp chế duyệt quyết định pháp lý; chỉ Chất lượng duyệt phần Chất lượng; chỉ người rà soát An toàn duyệt phần an toàn; chỉ người có thẩm quyền mới ký phê duyệt. **Người dùng có thể đóng góp bằng chứng mà không cần quyền phê duyệt.** Lịch sử phê duyệt điện tử phải được lưu giữ. `[R1-A4]`

**Danh tính và phòng ban lấy từ SSO / Active Directory của công ty.** Có ít nhất **17 vai trò**: Project Owner · Formulation Contributor · Safety Reviewer · Quality Reviewer · Regulatory Reviewer · Packaging/Artwork Contributor · Marketing/Sales Contributor · Supply Chain Contributor · Manufacturing Link Contributor · Study Author · Department Study Reviewer · Independent Study Reviewer · Published-Information Technical Reviewer · Published-Information Regulatory Reviewer · Final Approver · System Administrator · Read-only Viewer. **Người đóng góp không được phê duyệt chính công việc trọng yếu của mình** trừ khi có ngoại lệ được ghi nhận. **Ủy quyền** có giới hạn thời gian, do quản lý hoặc quản trị viên phê duyệt, ghi nhận người ủy quyền / người được ủy quyền / thời hạn / phạm vi, và lưu trong lịch sử kiểm toán. **Chưa yêu cầu triển khai đầy đủ 21 CFR Part 11**, nhưng các nguyên tắc về dấu vết kiểm toán và phê duyệt điện tử phải được áp dụng ngay từ đầu. `[R2-F6]`

**Một phê duyệt điện tử ghi nhận:** danh tính đã xác thực · ngày giờ · vai trò · quyết định · bình luận (tùy chọn hoặc bắt buộc) · phiên bản được phê duyệt · dấu vết vô hiệu hóa / thay thế. `[R2-F6]`

**⚠️ Mỗi cổng cần ba chữ ký riêng biệt được ghi nhận** — Prepared by, Reviewed by, Approved by. Tên người phụ trách cộng với một đường dẫn bằng chứng trên dòng cổng **không** tương đương. Mỗi chữ ký ghi nhận **người dùng đã xác thực · vai trò · ngày giờ · quyết định · phiên bản bản ghi · bình luận khi bắt buộc**, và cả bộ ba **chặn cứng quyết định cổng**. Khối chữ ký cấp pha **vẫn giữ nguyên như một phê duyệt đóng pha bổ sung, không bị thay thế.** Khi rủi ro thấp, cùng một người có thể chuẩn bị nhiều bản ghi cổng, nhưng **người rà soát hoặc người phê duyệt phải độc lập đối với các quyết định trọng yếu về an toàn, pháp lý, claim hoặc xuất xưởng.** `[R3-D1 ⚠️]`

**Năm điểm còn lại về chữ ký, đã được trả lời** `[R4-C29]`:

1. **Phiên bản bản ghi nghĩa là một bản chụp bằng chứng riêng của cổng**, không phải bộ đếm lưu cấp dự án — *"một bộ đếm lưu cấp dự án là không đủ"*. Bản ghi được ký bao gồm trạng thái cổng và quyết định đề xuất · các mục kiểm tra cổng · kết quả checklist áp dụng · trạng thái các sổ bằng chứng bắt buộc và đã kích hoạt · liên kết bằng chứng và phiên bản tài liệu · hành động và điều kiện còn mở · phiên bản công thức khi liên quan · thị trường và phiên bản bao bì nghệ thuật khi liên quan. **Nếu bằng chứng bên trong bản chụp đã ký thay đổi sau đó, chữ ký trở nên lỗi thời, hệ thống phải chỉ ra cái gì đã đổi, và phải ký lại.**
2. **Bình luận là bắt buộc với** Proceed with Conditions · Hold · Backtrack · Reject/Stop · Approved with Conditions · Not Approved · Further Information Required · N/A khi cần lý do của con người · Phê duyệt ủy quyền · Ghi đè hoặc ngoại lệ. Một Proceed hoặc Approved sạch thì bình luận là tùy chọn.
3. **Các cổng trọng yếu là 3, 4, 7, 8, 9, 10 và 11** — claim · sàng lọc nguyên liệu và pháp lý · an toàn · kiểm nghiệm và nghiên cứu trên người · độ ổn định và sẵn sàng xuất xưởng · pháp lý, claim và hồ sơ · sản xuất và xuất xưởng ra mắt.
4. **Tính độc lập** — tại **mọi** cổng, người rà soát phải là một người đã xác thực khác với người chuẩn bị. Tại bảy cổng trọng yếu, **ít nhất một trong hai người (rà soát hoặc phê duyệt)** còn phải đại diện cho chức năng độc lập tương ứng: quyết định an toàn do An toàn / Rà soát Khoa học rà soát hoặc phê duyệt · pháp lý do Pháp chế · chất lượng và xuất xưởng do Chất lượng · claim do Kỹ thuật và/hoặc Pháp chế. Quy trình nghiên cứu trên người giữ nguyên quy tắc chặt hơn là phải khác phòng ban.
5. **Trình tự** — người chuẩn bị xác nhận bản ghi đã đầy đủ và đề xuất một quyết định; người rà soát xác nhận bằng chứng và ghi nhận khuyến nghị; **người phê duyệt ghi nhận quyết định cuối cùng của cổng. Quyết định của người phê duyệt CHÍNH LÀ quyết định cổng** — không có một quyết định trùng lặp riêng sau đó. Cả ba chữ ký cùng tham chiếu một bản chụp hiện hành, và cổng chỉ thông qua khi người phê duyệt ghi nhận Proceed hoặc Proceed with Conditions.

**Chuỗi phê duyệt nghiên cứu là một quy trình chuyên biệt, tách khỏi phê duyệt cổng thông thường.** Vai trò: **Study Author, Department Reviewer, Independent Reviewer** — là vai trò, không phải cá nhân cụ thể. **Hệ thống phải ngăn Independent Reviewer thuộc cùng phòng ban với Study Author.** `[R1-C2]` `[R2-F6]`

---

## 6. Điều kiện qua cổng

**Một cổng chỉ thông qua khi đủ cả bốn điều kiện** `[R1-B1]`:

1. Trạng thái giai đoạn = **Complete**;
2. Quyết định cổng = **Proceed** hoặc **Proceed with Conditions**;
3. **Các chữ ký bắt buộc đã hoàn tất**;
4. **Bằng chứng bắt buộc đã được đính kèm**.

Các phán quyết chi tiết: Complete mà chưa có quyết định cổng thì cổng ở trạng thái **Pending**, chưa thông qua · **Proceed with Conditions mở khóa cổng tiếp theo** trong khi các hành động còn mở vẫn được theo dõi · **Gap ngăn một quyết định Proceed thông thường** · **Hold ở cột trạng thái** nghĩa là công việc đã dừng, **Hold ở cột quyết định** nghĩa là tiến trình bị chặn. `[R1-B1]`

**Gap chặn Proceed thuần.** Proceed with Conditions chỉ còn khả dụng **khi** khoảng trống đó không trọng yếu về an toàn, pháp lý hay xuất xưởng, một người rà soát có thẩm quyền chấp nhận rủi ro tạm thời, và một Next Action được kiểm soát với người phụ trách, hạn hoàn thành và lộ trình leo thang đã được tạo. **Gap trọng yếu phải chuyển sang Hold, Backtrack hoặc Reject/Stop.** `[R2-F7]`

**🆕 Mỗi khoảng trống mang đánh giá mức trọng yếu chính thức của riêng nó** — không phải phán đoán tức thời của người ghi nhận quyết định cổng. Các trường mới: **Mức trọng yếu** (Low / Medium / High / Critical) · **Nhóm tác động** (An toàn · Pháp lý · Claim · Chất lượng · Hiệu quả · Xuất xưởng · Thương mại · Khác) · Người đánh giá · Ngày đánh giá · Lý do · Liên kết bằng chứng · Hành động yêu cầu · Người phụ trách hành động. Mức trọng yếu do một người rà soát đủ năng lực đánh giá. `[R4-C3]`

| Mức trọng yếu của khoảng trống | Hệ quả |
|---|---|
| **Critical** | Không được mang theo dưới dạng Proceed with Conditions — phải dẫn tới Hold, Backtrack hoặc Reject/Stop. `[R4-C3]` |
| **High** | Chỉ được mang theo có điều kiện khi không vi phạm quy tắc bắt buộc nào về an toàn, pháp lý hay xuất xưởng, **và** chức năng có thẩm quyền tương ứng chấp nhận rủi ro, **và** một hành động được kiểm soát kèm hạn hoàn thành đã được ghi nhận. `[R4-C3]` |

### 6.1 Mô hình bằng chứng ba tầng

**Không phải mọi sổ bằng chứng đều chặn cứng.** Mỗi sổ được phân loại `[R2-C7]` `[R2-F1]`:

- **Mandatory (Bắt buộc)** — luôn chặn cứng cổng.
- **Conditional (Có điều kiện)** — chỉ chặn cứng **khi trigger đã định nghĩa của nó được kích hoạt**.
- **Supporting (Hỗ trợ)** — không tự động chặn, nhưng rủi ro chưa xử lý hoặc bối cảnh còn thiếu có thể dẫn tới cảnh báo, một hành động, hoặc một quyết định Proceed with Conditions.

Các sổ trọng yếu về an toàn và pháp lý **bắt buộc** phải chặn cứng. Hệ thống cung cấp một **bảng Gate Readiness** cho từng cổng, hiển thị các mục bắt buộc đã xong, các mục có điều kiện đã kích hoạt, các khoảng trống đang chặn, cảnh báo, liên kết bằng chứng còn thiếu, chữ ký còn thiếu, Next Action còn mở, Change Control còn mở, và một kết quả sẵn sàng là **Not Ready / Ready with Conditions / Ready for Decision / Passed**. `[R2-C7]`

**Cách gán tầng.** Các cụm từ định tính như "where applicable", "where relevant", "high-risk or borderline" → **Conditional**; bối cảnh nghiệp vụ hoặc vòng đời mang tính mềm → **Supporting**; còn lại → **Mandatory**. Quy tắc này và bảng phân tầng đã được chấp nhận, với hai thay đổi `[R3-A1]`:

| Cổng | Mục | Trước | Nay |
|---|---|---|---|
| 12 | Liên kết change control | Supporting | **Conditional** — bắt buộc khi một khiếu nại, phát hiện hậu mãi, CAPA, thay đổi công thức, thay đổi bao bì nghệ thuật, tín hiệu an toàn hoặc hành động cải tiến đã sinh ra một bản ghi Change Control. |
| 12 | Phản hồi thị trường | Supporting | **Supporting cho rà soát vòng đời thường kỳ, Conditional một khi dự án đã ra mắt và đến hạn một kỳ rà soát hậu mãi theo lịch.** |

**"Yêu cầu bao bì riêng theo thị trường" ở Cổng 6 là Conditional**, bắt buộc khi thị trường được chọn áp đặt yêu cầu ảnh hưởng tới ngôn ngữ · cảnh báo bắt buộc · công bố thành phần · thông tin bên chịu trách nhiệm · số thông báo hoặc số đăng ký · kích cỡ bao bì · niêm phong chống giả · mã vạch hoặc truy xuất · ký hiệu tái chế hoặc môi trường · thông tin bao bì sơ cấp hoặc thứ cấp. **Khi không có yêu cầu riêng nào, phải ghi N/A kèm lý do — để trống không đồng nghĩa với không áp dụng.** `[R3-A2]`

### 6.2 Danh mục bằng chứng theo từng cổng

Áp dụng ba tầng cho từng cổng; ngoài ra mỗi cổng đều cần chữ ký Prepared / Reviewed / Approved. `[R2-F1]`

- **Cổng 1 — Cơ hội & Yêu cầu:** bản ghi yêu cầu sản phẩm · chủ dự án · nguồn yêu cầu · phạm vi sản phẩm ban đầu · thị trường và người dùng mục tiêu ban đầu.
- **Cổng 2 — Người dùng mục tiêu & Brief:** development brief đã duyệt · người dùng mục tiêu và giai đoạn sống · mục đích sử dụng và vùng cơ thể · thị trường đã chọn · cờ người dùng dễ tổn thương · yêu cầu và loại trừ của dự án.
- **Cổng 3 — Ý tưởng sản phẩm & Claim:** ý tưởng sản phẩm · danh sách claim đề xuất · phân loại claim sơ bộ · yêu cầu bằng chứng cho từng claim · rà soát đối thủ hoặc benchmark khi áp dụng · rà soát pháp lý với claim rủi ro cao hoặc ranh giới. *Một claim có thể còn đang phát triển, nhưng ngôn từ chưa có bằng chứng thì không được đánh dấu là đã duyệt.*
- **Cổng 4 — Sàng lọc nguyên liệu & NCC:** bộ thành phần · định danh thành phần kèm tham chiếu Cosmetri khi có · trạng thái bằng chứng nhà cung cấp và nguyên liệu · sàng lọc chất cấm và chất bị hạn chế · sàng lọc thận trọng thai kỳ/cho con bú khi được kích hoạt · rà soát chất gây dị ứng, tạp chất và chất nhiễm khi liên quan · **không còn mục "Prohibited — remove" chưa xử lý**. *Một kết quả trùng khớp khả nghi chưa xử lý chỉ cho phép Proceed with Conditions khi một người rà soát đủ năng lực đã đánh giá là không trọng yếu và có hành động được kiểm soát.*
- **Cổng 5 — Thiết kế công thức:** phiên bản công thức hiện tại · thành phần hoặc tham chiếu Cosmetri được kiểm soát · pH mục tiêu và khoảng chấp nhận · yêu cầu quy trình ảnh hưởng tới chức năng · chiến lược bảo quản khi áp dụng · đánh giá tương thích · lý giải hiệu quả ban đầu và bản đồ cơ chế · trạng thái tính giá và khả thi thương mại.
- **Cổng 6 — Bao bì & Linh kiện:** quy cách bao bì đề xuất · yêu cầu tương thích bao bì · yêu cầu nhãn và bao bì nghệ thuật · trạng thái nhà cung cấp linh kiện · yêu cầu bao bì riêng theo thị trường · liên kết tới bằng chứng bao bì được kiểm soát.
- **Cổng 7 — Rà soát an toàn (chặn cứng, trọng yếu về an toàn):** rà soát an toàn công thức cuối cùng đã hoàn tất · đã đóng sàng lọc chất cấm · đã đóng đánh giá chất hạn chế và thận trọng · đánh giá phơi nhiễm và mục đích sử dụng · rà soát chất gây dị ứng và tạp chất · đánh giá an toàn cho mẹ và tiếp xúc trẻ sơ sinh khi được kích hoạt · kết luận an toàn và giới hạn · phê duyệt bắt buộc của người rà soát an toàn · không còn phát hiện an toàn trọng yếu chưa xử lý. **Cổng 7 không được thông qua khi** việc xuất an toàn cuối cùng chưa hoàn tất, còn một chất cấm, còn một vấn đề giới hạn thận trọng trọng yếu chưa xử lý, hoặc một đánh giá bắt buộc về mẹ / tiếp xúc trẻ sơ sinh chưa hoàn tất.
- **Cổng 8 — Kiểm nghiệm & Thẩm định:** kế hoạch kiểm nghiệm · phương pháp và tham chiếu phương pháp · tiêu chí chấp nhận · đã xác định các phép thử an toàn / hiệu quả / bảo quản / QC / hiệu năng cần thiết · **phê duyệt nghiên cứu trên người hoàn tất trước khi tuyển người tham gia** khi áp dụng · báo cáo hoặc hành động được kiểm soát cho các phép thử đang chạy. *Các phép thử thiết yếu cho xuất xưởng phải hoàn tất trước cổng xuất xưởng tương ứng ngay cả khi Cổng 8 đi tiếp có điều kiện.*
- **Cổng 9 — Độ ổn định & Sẵn sàng xuất xưởng:** trạng thái độ ổn định · trạng thái tương thích bao bì · trạng thái hiệu lực bảo quản khi áp dụng · tiêu chí chấp nhận lý / hóa / vi sinh · trạng thái scale-up hoặc pilot khi áp dụng · đã rà soát sai lệch và rủi ro còn mở · kết luận sẵn sàng xuất xưởng. *Các phép thử xuất xưởng trọng yếu phải đóng; độ ổn định dài hạn có thể tiếp tục chạy kèm một giao thức ra mắt đã duyệt và đủ dữ liệu hỗ trợ.*
- **Cổng 10 — Pháp lý, Claim & PIF (theo thị trường, chặn cứng):** checklist pháp lý áp dụng · trạng thái hồ sơ PIF / CPSR / Product Master File hoặc tương đương · sổ claim cấp SKU · **bằng chứng được đính kèm cho mọi claim đã duyệt** · bằng chứng an toàn thành phần và sản phẩm · bằng chứng hiệu năng sản phẩm khi liên quan · rà soát nhãn và bao bì nghệ thuật · trạng thái thông tin đã công bố · phê duyệt pháp lý. *Không một claim công khai đã duyệt nào được tồn tại mà thiếu bằng chứng và liên kết PIF / Product Master File.*
- **Cổng 11 — Sản xuất & Ra mắt (theo thị trường, chặn cứng):** Cổng 10 đã hoàn tất cho thị trường đó · liên kết tài liệu GMP · phiên bản công thức hiện hành đã duyệt · phiên bản bao bì nghệ thuật đã duyệt · mức sẵn sàng sản xuất · lộ trình xuất xưởng chất lượng · change control đã đóng hoặc được chấp nhận chính thức · thông tin sản phẩm công bố đã duyệt · phê duyệt ra mắt.
- **Cổng 12 — Hậu mãi & Cải tiến:** phản hồi thị trường · trạng thái khiếu nại và biến cố bất lợi · rà soát PV/PMS khi áp dụng · phản hồi hiệu năng sản phẩm · hành động CAPA và cải tiến · liên kết change control · chữ ký đóng kỳ rà soát.

### 6.3 Trigger của các mục Conditional

**Mọi mục Conditional đều có một trigger được định nghĩa.** `[R3-A3]`

| Cổng | Mục Conditional | Trigger khiến nó trở thành bắt buộc |
|---|---|---|
| 3 | Rà soát đối thủ hoặc benchmark | Sản phẩm mới · mở rộng claim · tái định vị · yêu cầu từ khách hàng hoặc nhà phân phối · có nêu tên một sản phẩm benchmark/tham chiếu. **Không** bắt buộc với một thay đổi thuần hành chính. |
| 3 | Rà soát pháp lý claim rủi ro cao hoặc ranh giới | Bất kỳ claim nào được phân loại Borderline, cận điều trị, rủi ro cao, bị hạn chế theo thị trường, liên quan thai kỳ/cho con bú, liên quan trẻ sơ sinh, liên quan bệnh lý, hướng tới nhân viên y tế, hoặc nằm ngoài thư viện claim đã duyệt. |
| 4 | Sàng lọc thận trọng thai kỳ/cho con bú | Có chọn Thai kỳ, Cho con bú hoặc Sau sinh. |
| 4 | Rà soát chất gây dị ứng, tạp chất và chất nhiễm | Nguyên liệu có chứa hương liệu, tinh dầu, chiết xuất thực vật, protein, chất gây dị ứng đã biết, dung môi tồn dư, rủi ro kim loại nặng, rủi ro vi sinh, tạp chất bị hạn chế, tồn dư chế biến, hoặc thành phần từ nguồn tự nhiên biến thiên. |
| 5 | Chiến lược bảo quản | Sản phẩm có nước, có nước khả dụng, dùng nhiều lần, hoặc nhạy cảm vi sinh theo cách khác. Cho phép N/A với sản phẩm thực sự khan nước, tự bảo quản, vô trùng hoặc dùng một lần, **kèm lý do được ghi nhận**. |
| 7 | Đánh giá an toàn cho mẹ và tiếp xúc trẻ sơ sinh | Có chọn Thai kỳ, Cho con bú hoặc Sau sinh. |
| 8 | Quy trình phê duyệt nghiên cứu trên người | Trước **bất kỳ** nghiên cứu nội bộ hay bên ngoài nào có người tham gia, tình nguyện viên, thử nghiệm người tiêu dùng, thử áp da, thử nghiệm trong sử dụng, thu thập hình ảnh, bảng hỏi, hoặc dữ liệu định danh người tham gia khác. |
| 9 | Trạng thái hiệu lực bảo quản | Sản phẩm nhạy cảm vi sinh cần hệ bảo quản. |
| 9 | Trạng thái scale-up hoặc pilot | Công thức mới · tái lập công thức mức Major · quy trình sản xuất mới · chuyển nhà máy · thay đổi thiết bị hoặc quy trình đáng kể · sản phẩm có rủi ro scale-up đã xác định. |
| 10 | Bằng chứng hiệu năng sản phẩm | Bất kỳ claim đối ngoại nào phụ thuộc vào bằng chứng hiệu quả, hiệu năng, cảm quan, lâm sàng, đo đạc, in vitro, in vivo, sử dụng thực tế hoặc so sánh ở cấp sản phẩm. |
| 12 | Rà soát PV/PMS | Được yêu cầu bởi nhóm sản phẩm, thị trường, chính sách công ty, tín hiệu an toàn, nhóm người dùng dễ tổn thương, xu hướng khiếu nại hoặc kế hoạch giám sát theo lịch. |
| 12 | Liên kết change control | Một bản ghi Change Control đã được mở, **hoặc lẽ ra phải được mở** vì phát hiện hậu mãi. |
| 12 | Phản hồi thị trường | Đến mốc rà soát hậu ra mắt theo lịch, hoặc có khiếu nại, vấn đề khách hàng, yêu cầu nhà phân phối, chất vấn về claim, hoặc mối lo hiệu năng lặp lại được ghi nhận. |
| 12 | Phản hồi hiệu năng sản phẩm | Hiệu quả sản phẩm, trải nghiệm người tiêu dùng, lỗi sản phẩm hoặc hiệu năng của claim nằm trong phạm vi rà soát hậu mãi. |

**Tính giá và khả thi thương mại ở Cổng 5 vẫn là Supporting** — nhưng chủ dự án chịu trách nhiệm vẫn có thể đưa dự án sang **Hold** khi tính khả thi thương mại là điều kiện sống còn để tiếp tục. `[R3-A3]` Quy tắc này được mở rộng bởi điều khoản phụ thuộc thương mại ở mục 16. `[R4-C36(b)]`

### 6.4 "Chưa đánh giá" — quy tắc xuyên suốt

**⚠️ Một đánh giá còn thiếu không bao giờ được hiểu là điều kiện đó không áp dụng.** Phải phân biệt ba trạng thái: **đã đánh giá và có áp dụng · đã đánh giá và không áp dụng · chưa đánh giá**. `[R4-C7]`

- Với mục **Mandatory** hoặc **Conditional**, **"chưa đánh giá" phải chặn mức sẵn sàng.** Một điều kiện chỉ được coi là không áp dụng *sau khi* thông tin trigger đã được điền và cho kết quả là không áp dụng.
- Với mục **Supporting**, thông tin còn thiếu có thể sinh ra cảnh báo thay vì chặn cứng.

Hai hệ quả được nêu rõ: phân loại claim ở trạng thái **Pending** phải kích hoạt rà soát pháp lý cho tới khi được phân loại; và một công thức **chưa có đánh giá nhạy cảm vi sinh thì không được tự động bỏ qua** yêu cầu về chiến lược bảo quản hay hiệu lực bảo quản. `[R4-C7]`

### 6.5 N/A và lý do kèm theo

**N/A chỉ được tính là hoàn tất khi có lý do** — lý do phải được ghi nhận. `[R1-B3]`

**🆕 Khi hệ thống có thể xác định từ dữ liệu được kiểm soát rằng một điều kiện không áp dụng, hệ thống được phép tự sinh lý do N/A** — ví dụ được nêu: không chọn người dùng là mẹ · công thức đã xác nhận khan nước · không xác định được yêu cầu bao bì riêng theo thị trường. **Với các mục trọng yếu về an toàn, pháp lý, claim hoặc xuất xưởng, lý do do hệ thống sinh vẫn phải được người rà soát chịu trách nhiệm xác nhận trước khi đóng cổng**; với mục Supporting thì lý do do hệ thống sinh là đủ. *"Không nên bắt người dùng gõ lại một lý do mà hệ thống đã sinh ra một cách tất định."* `[R4-C16]`

---

## 7. Hoàn tất pha và công việc làm trước

**Một pha chỉ hoàn tất khi đủ cả năm điều kiện** `[R1-B3]`:

| Điều kiện | Bắt buộc |
|---|---|
| Cả 3 cổng trong pha đã thông qua | ✅ |
| Toàn bộ Key Gate Check = Done/Y, hoặc N/A | ✅ |
| Toàn bộ 8 Angles = Covered, hoặc N/A có lý do | ✅ |
| Chữ ký của cả ba vai trò (Prepared / Reviewed / Approved) | ✅ |
| Toàn bộ Next Action đã đóng | ✅ trừ khi quyết định là Proceed with Conditions |

**Chữ ký chỉ mở ra sau khi các mục bắt buộc đã hoàn tất** — trình tự được cưỡng chế, không làm song song. `[R1-B3]`

**Được phép làm trước trên một pha còn khóa.** Khi pha còn khóa, quyết định cổng, chữ ký và việc đóng giai đoạn chính thức vẫn bị vô hiệu hóa; người dùng vẫn có thể thêm bằng chứng nháp, yêu cầu, ghi chú, rủi ro và hành động đề xuất. Các mục nhập sớm phải được đánh dấu rõ **"Pre-work / nhập trước khi cổng mở"** và giữ ngày nhập cùng người nhập. **Khi pha mở ra, người phụ trách phải rà soát và chính thức chấp nhận hoặc cập nhật phần làm trước đó thì nó mới được tính vào mức hoàn tất.** `[R2-B5]` `[R2-F13]`

---

## 8. Next Actions

**Next Action là bản ghi được kiểm soát, không phải văn bản tự do.** Mỗi cổng có thể mang **nhiều** hành động; mỗi hành động có Mô tả · Người phụ trách · Hạn hoàn thành · Trạng thái · Mức ưu tiên · Ngày hoàn tất. **Hành động còn mở chỉ được tồn tại khi quyết định cổng là Proceed with Conditions**; ngoài ra mọi hành động nên hoàn tất trước khi đóng cổng. `[R1-B2]`

**Ai đóng một hành động.** **Người phụ trách** chịu trách nhiệm hoàn thành, nhưng **người nêu vấn đề, người phụ trách cổng tương ứng, hoặc một người rà soát có thẩm quyền mới xác minh và đóng** — **người phụ trách không được tự mình xác minh việc đóng** khi cần xác nhận độc lập. `[R2-F8]`

**Luồng trạng thái:** Open → In Progress → Awaiting Information → Ready for Verification → Closed → Cancelled. **Mức ưu tiên:** Low / Medium / High / **Critical — một hành động Critical chặn việc đóng cổng thông thường.** `[R2-F8]`

---

## 9. Backtrack và dấu vết kiểm toán

**Backtrack phải bảo toàn toàn bộ lịch sử kiểm toán, và không bao giờ xóa gì cả.** Khi một cổng được mở lại, trạng thái giai đoạn được đặt lại, các phê duyệt trước đó trở nên vô hiệu và phải phê duyệt lại — nhưng các phê duyệt trước đó **vẫn nằm trong lịch sử**, bằng chứng trước đó **vẫn được liên kết**, và một **Backtrack Event Log** ghi nhận ai khởi tạo, ngày nào, lý do gì, các cổng bị ảnh hưởng, các phê duyệt trước đó và các quyết định trước đó. `[R1-B4]`

**Được phép backtrack qua bất kỳ pha nào nếu có lý do chính đáng.** Điều này tuân theo nguyên tắc **không sửa chữa âm thầm** của MBc360. `[R1-B4]`

---

## 10. Kiểm soát thay đổi (Change Control)

**Một bản ghi Change Control còn mở sẽ khóa mềm cổng bị ảnh hưởng** cho tới khi thay đổi được đánh giá và đóng lại — nhằm giữ truy vết. `[R1-C4]`

**Những trạng thái được tính là còn mở:** Draft · Submitted · Under Review · Approved–Implementation Pending · In Implementation · Verification Pending · On Hold. Đã đóng = Completed · Rejected · Cancelled · Superseded, **một khi phương án xử lý cuối cùng đã được ghi nhận**. `[R2-F9]`

**Khóa mềm làm gì:** hiển thị cảnh báo nổi bật trên dự án, phiên bản công thức, thị trường và cổng bị ảnh hưởng, nêu rõ thay đổi đang mở và người phụ trách nó · **người dùng phải xác nhận đã biết về thay đổi đang mở trước khi ghi nhận quyết định cổng** · **chặn Proceed thuần** khi thay đổi có thể ảnh hưởng tới kết luận của cổng, chỉ cho phép Proceed with Conditions nếu một người phê duyệt có thẩm quyền chấp nhận. Thay đổi liên quan tới an toàn, định danh công thức, phê duyệt pháp lý, bao bì nghệ thuật, claim hoặc xuất xưởng ra mắt **có thể trở thành chặn cứng** tùy mức tác động được đánh giá. `[R2-F9]`

**Cổng 11 cần nhiều hơn khóa mềm** — nó phải đánh giá phân loại tác động và trạng thái đóng của từng thay đổi đang mở `[R3-E3b]`:

| Thay đổi đang mở | Hệ quả tại Cổng 11 |
|---|---|
| Critical hoặc ảnh hưởng tới ra mắt | **Chặn cứng việc ra mắt.** |
| Ảnh hưởng công thức, bao bì nghệ thuật, claim, an toàn, pháp lý, bao bì hoặc xuất xưởng | **Chặn cứng trừ khi việc triển khai và xác minh đã hoàn tất.** |
| Hành chính, rủi ro thấp | Có thể cho phép Proceed with Conditions sau khi được người có thẩm quyền xác nhận. |
| Completed, rejected, cancelled hoặc superseded | Không chặn, với điều kiện phương án xử lý cuối cùng đã được ghi nhận. |

**⚠️ Một Change Control đang mở mà chưa được phân loại thì chặn Cổng 11**, và thang rủi ro được bổ sung mức **Critical** cao hơn High. **"Đã ghi nhận phương án xử lý cuối cùng" nghĩa là tám điều**, không phải một ngày đóng hay một ghi chú ngắn: Trạng thái cuối · Kết quả · Đã triển khai cái gì, hoặc tại sao không cần triển khai · Bằng chứng xác minh · Các phiên bản công thức / bao bì nghệ thuật / claim / thị trường bị ảnh hưởng · Người xác minh chịu trách nhiệm · Ngày đóng · Hành động hoặc yêu cầu chuyển tiếp còn lại, nếu có. Có thể tái sử dụng bước xác nhận **chỉ khi nó được giới hạn theo vai trò** và ghi nhận người dùng đã xác thực · vai trò · ngày giờ · lý do · mã tham chiếu Change Control · các điều kiện được chấp nhận — và **chỉ người có thẩm quyền phê duyệt tác động Cổng 11 tương ứng mới được xác nhận.** `[R4-C34]`

**🆕 "Có cần Change Control không?" trở thành một bước đánh giá tường minh Yes / No / Pending**, kèm người rà soát · ngày rà soát · lý do · mã Change Control được liên kết khi là Yes · liên kết bằng chứng. Nếu **Yes**, phải liên kết tới một bản ghi Change Control hợp lệ; nếu **No**, phải ghi nhận lý do và người rà soát; **Pending chặn việc đóng phát hiện hậu mãi.** *"Cách này tốt hơn là chỉ dựa vào một lời nhắc."* `[R4-C8]`

**⚠️ Không loại dự án nào trong sáu loại là hành chính thuần một cách tự động.** Một thay đổi bao bì, cải tiến vòng đời hay tái lập công thức đều có thể quan trọng về kỹ thuật và thương mại. 🆕 Bổ sung phân loại **"Thay đổi hành chính thuần: Yes / No"**, do một người rà soát có thẩm quyền xác nhận. Ví dụ hành chính thuần: sửa mã tham chiếu nội bộ · cập nhật đường dẫn file · sửa lỗi chính tả không làm đổi nghĩa · sửa định dạng · cập nhật thông tin liên hệ · cập nhật metadata tài liệu · thay thế tài liệu nhà cung cấp khi bản thân nguyên liệu không đổi. **Một dự án chỉ được miễn rà soát đối thủ/benchmark khi nó được xác nhận là hành chính thuần *và* không có thay đổi nào về claim, công thức, định vị thị trường, hiệu năng sản phẩm, chức năng bao bì hay ý nghĩa đối với khách hàng.** `[R4-C11]`

---

## 11. Sàng lọc nguyên liệu và an toàn

**Sàng lọc là tự động.** Mỗi khi một Formula BOM được nhập, MBc360 tự động đối chiếu các thành phần với danh mục Chất cấm · danh mục Thận trọng thai kỳ/cho con bú · các danh mục hạn chế theo quy định · các danh mục cấm nội bộ, và lập tức gắn cờ các vấn đề tiềm tàng để rà soát. `[R1-C3]`

**Thứ tự ưu tiên khi đối chiếu:** mã nguyên liệu Cosmetri chính xác → INCI chính xác → CAS → ánh xạ từ đồng nghĩa hoặc nhóm → rà soát khoa học thủ công khi việc đối chiếu tự động không chắc chắn. **Kết quả khớp tự động chỉ là cờ sàng lọc — nó không thay thế việc rà soát của người đủ năng lực.** `[R2-F3]`

**Các danh mục theo dõi là tập dữ liệu tham chiếu được kiểm soát, do Pháp chế và An toàn duy trì.** Mỗi mục mang tên thành phần hoặc nhóm · tên INCI · số CAS · từ đồng nghĩa · thị trường liên quan · mức hạn chế hoặc thận trọng · nồng độ tối đa hoặc điều kiện sử dụng · nguồn · ngày hiệu lực · ngày rà soát gần nhất · người sở hữu · phiên bản. Pháp chế rà soát các danh mục hạn chế theo thị trường **ít nhất mỗi năm một lần** và mỗi khi có thay đổi quy định liên quan; các giới hạn thai kỳ và cho con bú được rà soát khi có bằng chứng mới. `[R2-F3]`

**Cần một mục Mandatory hẹp riêng tại Cổng 4** — *"Đã hoàn tất sàng lọc chất cấm, chất hạn chế và chất cần thận trọng"* — lấy trực tiếp từ kết quả danh mục theo dõi tự động và phần rà soát của người đủ năng lực đi kèm. Mục kiểm tra rộng hơn đang có — *"Đã sàng lọc hạn chế, loại trừ và rủi ro nhà cung cấp"* — **vẫn giữ nguyên** bên cạnh nó. `[R3-C2]`

### 11.1 Cổng 4 — sàng lọc và xử lý từng dòng

**⚠️ Cổng 4 sàng lọc *và xử lý* mọi ứng viên liên quan**, nhưng không đòi hỏi việc đóng an toàn cuối cùng vốn dành cho Cổng 7. Mỗi dòng được phân loại là một trong: **Không phát hiện vấn đề · Cần rà soát An toàn · Cần rà soát Pháp lý · Chất cấm — loại bỏ · Đã cân nhắc — không chọn · Cần thêm thông tin**. **Cổng 4 không được thông qua khi còn dòng chưa được đánh giá.** Cổng 4 có thể Proceed with Conditions khi vấn đề được đánh giá là không trọng yếu **và** một người rà soát đủ năng lực đã ghi nhận kết luận sơ bộ **và** có một hành động được kiểm soát được liên kết **và** không vi phạm chất cấm hay hạn chế bắt buộc nào. `[R4-C6 ⚠️]`

**Mọi dòng ứng viên phải được xử lý trước khi Cổng 4 thông qua**, giá trị "Đã cân nhắc — không dùng trong công thức này" được giữ lại và bản ghi **không bị xóa**, và lộ trình có điều kiện là Proceed with Conditions cộng một hành động được kiểm soát được liên kết — không cần một trường phê duyệt trùng lặp riêng, miễn là dòng đó mang kết luận của người rà soát đủ năng lực, người phê duyệt cổng có thẩm quyền, và điều kiện cùng hành động được nêu rõ trong quyết định cổng. Một nguyên liệu được chấp nhận có điều kiện **và có mặt trong công thức cuối** phải được đóng hoàn toàn trước Cổng 7; nguyên liệu **không được dùng** có thể đóng dưới dạng "Đã cân nhắc — không dùng". **Cổng 4 không được Proceed khi mọi ứng viên đều đã bị loại** — phải còn ít nhất một lộ trình phù hợp hoặc phù hợp có điều kiện, nếu không dự án phải Hold hoặc Backtrack về khâu tìm nguồn nguyên liệu. `[R4-C31(a)–(e)]`

### 11.2 Dấu vết rà soát của danh mục theo dõi

**Mỗi kết quả bị gắn cờ được bổ sung:** Đánh giá của người rà soát · Người rà soát · Ngày rà soát · Lý do · Liên kết bằng chứng · **Mã Next Action được liên kết** · Trạng thái xử lý. **Bắt buộc phải có một Next Action được kiểm soát thực sự — một ghi chú là không đủ.** `[R3-D3]`

| Đánh giá | Hệ quả tại Cổng 4 |
|---|---|
| **Critical** | Chặn cứng **cả** Proceed lẫn Proceed with Conditions. `[R3-D3]` |
| **Cần thêm thông tin** | Chặn Proceed; chỉ Proceed with Conditions khi có sự chấp nhận của người có thẩm quyền **và** một hành động được kiểm soát được liên kết. `[R3-D3]` |
| **Không trọng yếu** | Chặn Proceed thuần cho tới khi đánh giá, lý do và hành động được ghi nhận; sau đó có thể cho phép Proceed with Conditions. `[R3-D3]` |
| **Không phải khớp thật** | Có thể đóng khi lý do và bằng chứng của người rà soát đã được ghi nhận. `[R3-D3]` |

**⚠️ "Bị gắn cờ" bao gồm ba trạng thái**, không phải hai: *REVIEW — có thể khớp công thức* · *Cần rà soát An toàn* · *Cần rà soát Pháp lý*. **Chất cấm — loại bỏ** vẫn là một chặn cứng trực tiếp riêng. **⚠️ Trạng thái xử lý** = Open · Under Review · Action Pending · Verification Pending · Closed, kèm một trường đánh giá **riêng** ghi nhận Critical / Không trọng yếu / Không phải khớp thật / Cần thêm thông tin. Việc ghi nhận Proceed with Conditions **có thể đóng vai trò là sự chấp nhận có thẩm quyền** khi đánh giá của người rà soát đã đầy đủ, lý do và bằng chứng có mặt, một hành động được kiểm soát hợp lệ được liên kết, và **người phê duyệt cổng nắm thẩm quyền An toàn hoặc Pháp lý tương ứng** — không cần một bước xác nhận trùng lặp riêng. Một dòng bị gắn cờ **chưa được đánh giá** thì **chặn cả Proceed lẫn Proceed with Conditions**. 🆕 Danh mục Thận trọng thai kỳ/cho con bú dùng **cùng bộ trường dấu vết rà soát**. Hành động được liên kết có thể thuộc Cổng 4 **hoặc một cổng sau** khi phù hợp về vận hành — nó phải liên kết ngược về phát hiện gốc, có người phụ trách và hạn hoàn thành, **vẫn hiển thị tại cổng gốc**, và đến hạn trước cổng yêu cầu đóng cuối cùng. **Một phát hiện trọng yếu không được hoãn sang cổng sau.** `[R4-C32]`

### 11.3 Cổng 7 — ba lớp sàng lọc

**⚠️ Cổng 7 yêu cầu một đánh giá chất hạn chế và chất cần thận trọng chung cho mọi sản phẩm.** Đánh giá thận trọng thai kỳ và cho con bú là một *lớp có điều kiện bổ sung*, không phải toàn bộ phần đánh giá. `[R4-C5 ⚠️]`

| Lớp sàng lọc | Áp dụng cho |
|---|---|
| Chất cấm / hạn chế / thận trọng chung | **Mọi sản phẩm** |
| Thận trọng cho mẹ | Sản phẩm dành cho mẹ |
| An toàn trẻ sơ sinh | Sản phẩm Infant 0+ |

Khi cả hai bối cảnh sử dụng cùng được chọn, cả hai lộ trình đều áp dụng. **Cổng 7 phải chính thức đóng mọi vấn đề hạn chế hoặc thận trọng liên quan tới công thức cuối cùng.** `[R4-C5]` `[R4-C6]`

**Mọi thành phần trong công thức cuối phải có một kết luận an toàn**, nhưng tá dược rủi ro thấp không nhất thiết mỗi loại phải có một chuyên khảo dài. Các lộ trình bao phủ được chấp nhận: **đánh giá riêng từng chất · tham chiếu tới một đánh giá thành phần đã được duyệt · đánh giá theo nhóm hoặc lớp chất khi có cơ sở khoa học · tham chiếu tới một kết luận pháp lý hoặc an toàn được chấp nhận.** **Mỗi dòng công thức phải thể hiện được là đã được bao phủ và liên kết tới đánh giá tương ứng**, đồng thời các thành phần hỗn hợp, tạp chất và tồn dư liên quan cũng phải được đánh giá khi cần. `[R4-C23(b)]`

### 11.4 Phát hiện an toàn trọng yếu

**⚠️ Cần một cơ chế kiểm soát phát hiện an toàn riêng biệt**, thay vì chỉ dựa vào chữ ký An toàn cuối cùng: **Có phát hiện an toàn trọng yếu không (Yes/No) · Mô tả phát hiện · Thành phần, công thức hoặc bối cảnh sử dụng bị ảnh hưởng · Mức nghiêm trọng · Hành động yêu cầu · Người phụ trách · Trạng thái · Kết luận của người rà soát an toàn · Liên kết bằng chứng.** **Cổng 7 không được thông qua khi còn bất kỳ phát hiện an toàn trọng yếu nào đang mở.** `[R3-E1 ⚠️]`

**Mức nghiêm trọng = Low · Medium · High · Critical.** **Trạng thái = Open · Under Review · Action Pending · Verification Pending · Closed · Superseded.** **Bắt buộc có một Next Action được kiểm soát** với phát hiện mức Critical, mức High, và mức Medium cần hành động khắc phục — văn bản tự do có thể mô tả hành động nhưng không được thay thế bản ghi được kiểm soát. **Một phát hiện chưa được phán định thì chặn Cổng 7.** Việc đóng một phát hiện High hoặc Critical đòi hỏi kết luận của người rà soát an toàn · liên kết bằng chứng · hành động liên kết đã hoàn tất · xác minh · người xác minh · ngày đóng. `[R4-C33]`

| Phát hiện | Hệ quả tại Cổng 7 |
|---|---|
| **Critical** hoặc **High** đang mở | Chặn cứng. |
| **Medium** | Có thể cho phép Proceed with Conditions khi được chấp nhận chính thức và có kiểm soát. |
| **Low** | Có thể sinh cảnh báo hoặc một hành động theo kết luận của người rà soát. |

*Một phát hiện được đánh giá là không trọng yếu vẫn phải được xử lý thỏa đáng — nó không được biến mất chỉ vì nó không phải Critical.* `[R4-C33]`

### 11.5 Thang mức nghiêm trọng dùng chung

**Thang mức nghiêm trọng gồm bốn bậc — Low · Medium · High · Critical — và Critical là một bậc riêng *cao hơn* High.** Một thang duy nhất này phục vụ cả đánh giá mức trọng yếu của khoảng trống, các phát hiện an toàn trọng yếu, và mức rủi ro của change control tại Cổng 11. `[R4-C3]` `[R4-C33(a)]` `[R4-C34(a)]`

**Bộ từ vựng vòng đời cũng dùng chung:** Open · Under Review · Action Pending · Verification Pending · Closed, cộng thêm Superseded cho phát hiện an toàn. `[R4-C32(b)]` `[R4-C33]`

---

## 12. Người dùng dễ tổn thương — lộ trình cho mẹ và trẻ sơ sinh

**Skincare for Two là bắt buộc và cứng, không phải một lời nhắc.** Nó tự động kích hoạt mỗi khi người dùng dự kiến bao gồm **Thai kỳ, Cho con bú hoặc Sau sinh**. Một khi kích hoạt, **cả đánh giá an toàn cho mẹ lẫn đánh giá tiếp xúc trẻ sơ sinh đều trở thành bắt buộc, và Cổng 7 không thể thông qua cho tới khi cả hai hoàn tất.** `[R1-C1]`

**"Infant 0+" đứng một mình thì KHÔNG kích hoạt Skincare for Two.** Nó kích hoạt một **lộ trình An toàn Trẻ sơ sinh chuyên biệt**. Sản phẩm dành cho **cả** mẹ lẫn trẻ sơ sinh thì kích hoạt **cả hai**. `[R2-F2]`

**⚠️ Đánh giá thai kỳ/cho con bú ở Cổng 7 là có điều kiện, không phải vô điều kiện.** Nó bắt buộc khi có chọn Thai kỳ, Cho con bú hoặc Sau sinh; sản phẩm chỉ dành cho trẻ sơ sinh thì kích hoạt lộ trình trẻ sơ sinh thay thế; sản phẩm phổ thông thì **ghi N/A kèm lý do** khi không lộ trình nào áp dụng. `[R3-E1 ⚠️]`

**Bắt buộc có một cờ người dùng dễ tổn thương tường minh**, tách biệt với việc "đã chọn một nhóm người dùng mục tiêu". Khi bất kỳ nhóm dễ tổn thương nào được chọn, phải ghi nhận: **cờ người dùng dễ tổn thương tường minh · lộ trình an toàn áp dụng · người rà soát chịu trách nhiệm · ghi chú về các đánh giá bổ sung cần thiết.** Các trigger dễ tổn thương: Thai kỳ · Cho con bú · Sau sinh · Infant 0+ · Trẻ nhỏ · Da nhạy cảm hoặc da tổn thương · Bối cảnh hỗ trợ ung bướu hoặc người dễ tổn thương về y tế · Bối cảnh hỗ trợ bệnh thận hoặc vấn đề sức khỏe khác · bất kỳ nhóm nào mà An toàn hoặc Pháp chế xác định là cần rà soát tăng cường. **Một dự án cho người lớn phổ thông vẫn phải ghi nhận "Không xác định nhóm người dùng dễ tổn thương nào"** chứ không được mặc nhiên coi là đã thỏa mãn. `[R3-B5]`

**⚠️ Da khô đứng một mình không tự động là nhóm dễ tổn thương; da có cơ địa eczema hoặc da tổn thương thì có.** Khi có thể, tách lựa chọn gộp thành *Da khô* và *Da có cơ địa eczema hoặc da tổn thương*; nếu không tách được, coi lựa chọn gộp đó là kích hoạt phần rà soát da nhạy cảm/tổn thương. `[R4-C25(b) ⚠️]`

**Dùng cho cả gia đình, vùng kín và người bơi lội.** Dùng cho cả gia đình không tự động nghĩa là nhóm dễ tổn thương, **nhưng phải yêu cầu xác nhận các nhóm tuổi thực sự nằm trong đó; nếu có trẻ sơ sinh hoặc trẻ nhỏ, lộ trình tương ứng sẽ kích hoạt.** Sử dụng vùng kín kích hoạt một đánh giá chuyên biệt về vị trí dùng và an toàn, nhưng không tự động nghĩa là người dùng dễ tổn thương. Người bơi lội không tự động cấu thành nhóm dễ tổn thương. `[R4-C25(c)]`

**Việc kiểm tra ánh xạ người dùng dễ tổn thương diễn ra theo cả hai chiều:** các mâu thuẫn chính xác thì bị từ chối, còn với các nhóm được đổi tên hoặc rộng hơn thì **một cảnh báo kèm lý do tốt hơn là từ chối thẳng**, vì người rà soát An toàn hoặc Pháp chế có thể tự nhận diện bối cảnh một cách độc lập. `[R4-C25(d)]`

### 12.1 Lộ trình An toàn Trẻ sơ sinh

**⚠️ Khoang đánh giá trẻ sơ sinh ở Cổng 7 là đúng, nhưng nó chỉ là *thành phần cuối cùng* của một lộ trình trải dài nhiều cổng — không phải toàn bộ lộ trình.** Các kiểm soát INF-01 đến INF-08 hiện có vẫn phù hợp. `[R4-C1 ⚠️]`

| Cổng | Yêu cầu |
|---|---|
| **2** — bối cảnh sử dụng cho trẻ sơ sinh | Độ tuổi tối thiểu dự kiến tính theo tháng · dùng trực tiếp cho trẻ, tiếp xúc tình cờ, hoặc cả hai · lưu lại trên da hay rửa trôi · vùng cơ thể · tần suất và lượng dùng · dùng vùng quấn tã, mặt, vùng mắt hay da đầu · khả năng đưa tay lên miệng có thể dự đoán · khả năng nuốt nhầm có thể dự đoán · sản phẩm có thể dùng trên da tổn thương hay không · người chăm sóc dùng hay bôi trực tiếp lên trẻ |
| **4** — mức phù hợp của thành phần và nguyên liệu | Đánh giá mức phù hợp cho trẻ sơ sinh với từng thành phần đề xuất · rà soát chất cấm và chất hạn chế · rà soát hương liệu, tinh dầu và chất gây dị ứng · rà soát tạp chất, chất nhiễm và dung môi tồn dư · rà soát rủi ro kim loại nặng và vi sinh khi liên quan · cân nhắc an toàn qua đường miệng khi có khả năng đưa tay lên miệng · đánh giá phơi nhiễm mắt khi tiếp xúc mắt là hợp lý có thể dự đoán · liên kết bằng chứng nhà cung cấp |
| **5** — đánh giá ở cấp công thức | Nồng độ thành phần cuối cùng · pH công thức và tính tương thích với da trẻ sơ sinh · chiến lược bảo quản và bảo vệ vi sinh · đánh giá phơi nhiễm và lý giải biên an toàn đã hiệu chỉnh cho trẻ sơ sinh · sản phẩm phân hủy tiềm tàng hoặc tương tác giữa các thành phần · các kiểm soát quy trình cần thiết để giữ chất lượng và an toàn thành phần · liều hoặc lượng dự kiến mỗi lần dùng |
| **6** — bao bì và hướng dẫn | Phân liều phù hợp · kiểm soát việc lấy quá nhiều khi liên quan · rủi ro tiếp cận hoặc nuốt nhầm · nắp và bao bì phù hợp · hướng dẫn về độ tuổi và cách dùng · các cảnh báo bắt buộc · chỉ dẫn để người chăm sóc dùng an toàn |
| **7** — đánh giá cuối cùng | INF-01 đến INF-08 hoàn tất, bao gồm hoặc liên kết tới bối cảnh tiếp xúc trẻ sơ sinh · phơi nhiễm và biên an toàn đã hiệu chỉnh cho trẻ · phơi nhiễm qua miệng do đưa tay lên miệng hoặc tình cờ · sàng lọc chất gây mẫn cảm và dị ứng cho trẻ · tính tương thích hàng rào da và pH · đánh giá an toàn mắt khi áp dụng · kết luận cuối về mục đích sử dụng và độ tuổi phù hợp · ngôn từ claim, nhãn và PIF đã duyệt · xác nhận rủi ro vi sinh và bảo quản đã được xử lý · xác nhận không còn vấn đề an toàn trẻ sơ sinh trọng yếu nào đang mở |
| **8–9** — kiểm nghiệm và thẩm định | **Kích hoạt theo bối cảnh sử dụng và rủi ro**: dung nạp da · an toàn mắt · hiệu lực bảo quản · chất lượng vi sinh · độ ổn định · tương thích bao bì · thử nghiệm trong sử dụng hoặc với người tiêu dùng khi phù hợp |
| **10** — PIF và claim | Kết luận an toàn khi dùng cho trẻ sơ sinh · các đánh giá thành phần và công thức liên quan · các báo cáo kiểm nghiệm áp dụng · các phát biểu về độ tuổi và cách dùng đã duyệt · bằng chứng hỗ trợ các claim liên quan trẻ sơ sinh · cảnh báo và chỉ dẫn trên nhãn |

**Chặn cứng: Cổng 7 phải chặn cứng nếu lộ trình Infant 0+ được kích hoạt mà phần đánh giá này chưa hoàn tất.** `[R4-C1]`

---

## 13. Claim và thông tin công bố

### 13.1 Claim là một đối tượng được khai báo

**Phân loại claim là theo từng claim, không phải theo dự án**, vì các claim khác nhau trong cùng một dự án có thể mang rủi ro khác nhau. Hai danh sách chọn được kiểm soát cho mỗi claim `[R3-B7]`:

- **Nhóm claim** = Mỹ phẩm · Hiệu năng sản phẩm · Cảm quan · Cấp thành phần · An toàn/dung nạp · Môi trường hoặc bền vững · Thông tin chuyên môn hoặc kỹ thuật · Ranh giới / cận điều trị · Điều trị — không được phép trong lộ trình claim mỹ phẩm · Khác — cần rà soát Pháp lý.
- **Rủi ro claim** = Low · Medium · High · Bị cấm / không chấp nhận được · Chờ phân loại.

Mỗi claim còn ghi nhận: ngôn từ đề xuất chính xác · SKU áp dụng · thị trường áp dụng · kênh dự kiến · bằng chứng yêu cầu · trạng thái bằng chứng · Có cần rà soát Pháp lý Y/N · ngôn từ đã duyệt · giới hạn hoặc các cụm bổ nghĩa bắt buộc. `[R3-B7]`

**Cột Nhóm claim hiện có CHÍNH LÀ phần phân loại đó — không tạo bản trùng lặp.** Bản ghi **Claim → Evidence Traceability là nguồn sự thật**; sổ SKU Claims / PIF tham chiếu tới một Claim ID và kế thừa Nhóm claim, Rủi ro claim, Ngôn từ gốc, Phiên bản hiện hành và Trạng thái bằng chứng ở dạng **chỉ đọc**. **Claim ID được tạo tại Cổng 3** khi claim lần đầu được đề xuất, không được chờ tới khi có bằng chứng. Bộ chọn claim liệt kê **mọi** claim đã khai báo, kể cả claim Pending và đang phát triển, còn việc dùng được ra bên ngoài hay không là do các kiểm soát ở khâu xuất bản quyết định. `[R4-C19(a)(c)(e)(f)]`

**⚠️ Bảy sổ tham chiếu tới Claim ID thay vì gõ lại ngôn từ:** bản đồ cơ chế · kế hoạch bằng chứng dự kiến · kế hoạch nghiên cứu hiệu quả · sổ bằng chứng lâm sàng · **Published Information Approval** · **danh sách claim trên bao bì/nhãn** · **sổ claim trong PIF**. `[R4-C19(g) ⚠️]`

**Kênh dự kiến và "Có cần rà soát Pháp lý" thuộc về bản ghi sử dụng claim theo SKU / thị trường / kênh**, không thuộc về claim gốc — chúng mô tả claim được dùng như thế nào và ở đâu. Claim gốc có thể luôn cần rà soát Pháp lý; một thị trường hoặc một kênh có thể áp thêm một yêu cầu rà soát nữa. `[R4-C19(b)]`

**Trước khi Cổng 3 thông qua, mọi claim trong phạm vi phải có** Claim ID · ngôn từ gốc đề xuất · nhóm claim · rủi ro claim · yêu cầu bằng chứng sơ bộ · trạng thái rà soát pháp lý khi được kích hoạt. Không có yêu cầu về số lượng claim — **nếu không đề xuất claim nào, điều đó phải được ghi nhận tường minh.** `[R4-C19(d)]`

**Thông tin claim được phân chia trách nhiệm theo từng cổng** `[R4-C19(h)]`: *Cổng 3* — Claim ID, ngôn từ gốc đề xuất, nhóm, rủi ro, **cơ chế hoặc lý giải lợi ích sơ bộ**, yêu cầu bằng chứng sơ bộ. *Cổng 5* — cơ chế đặc thù theo công thức đã xác nhận, đóng góp của thành phần và công thức, liên kết cơ chế với claim. *Cổng 8* — kế hoạch bằng chứng, phương pháp nghiên cứu, mức độ bằng chứng, trạng thái báo cáo hoặc phép thử hỗ trợ. *Cổng 10* — trạng thái Supported, ngôn từ cuối cùng đã duyệt, phê duyệt theo thị trường, đính kèm PIF / Product Master File, phê duyệt xuất claim. **Cơ chế bắt đầu như một giả thuyết sơ bộ ở Cổng 3 và được xác nhận về mặt kỹ thuật ở Cổng 5.**

### 13.2 Kiểm soát phiên bản claim

**Sổ truy vết không bị đóng băng ở Cổng 8** — nó vẫn mở qua Cổng 10 và 11. Thứ được bổ sung là **kiểm soát phiên bản**: claim ở trạng thái nháp vẫn sửa được; **một khi một phiên bản claim được Pháp chế hoặc Cổng 10 phê duyệt, phiên bản đó trở thành chỉ đọc**; một ngôn từ mới hoặc một lập trường bằng chứng mới sẽ tạo ra một phiên bản mới hoặc một Claim ID mới. Thêm một claim thực sự mới sau Cổng 3 đòi hỏi đánh giá thay đổi có kiểm soát và backtrack tương ứng; thêm một *cách dùng* theo thị trường của một claim đã duyệt thì không nhất thiết mở lại Cổng 3 nhưng vẫn cần rà soát thị trường ở Cổng 10. `[R4-C26]`

**Phiên bản mới hay Claim ID mới.** **Phiên bản mới của cùng một Claim ID** khi luận điểm nền tảng không đổi, phạm vi và lợi ích dự kiến không đổi, gánh nặng bằng chứng không đổi, và ngôn từ chỉ đang được tinh chỉnh. **Claim ID mới** khi ý nghĩa thay đổi · lợi ích hoặc kết quả thay đổi · phạm vi mở rộng · nhóm đối tượng thay đổi · gánh nặng bằng chứng thay đổi đáng kể · claim chuyển sang một nhóm rủi ro hoặc nhóm pháp lý khác. **Người rà soát Kỹ thuật hoặc Pháp chế quyết định đi theo lộ trình nào.** `[R4-C30(b)]`

### 13.3 Rà soát pháp lý với claim

**Rà soát pháp lý là bắt buộc khi** nhóm = Ranh giới / cận điều trị · nhóm = Điều trị — không được phép · rủi ro = High · ngôn từ không có trong thư viện claim đã duyệt · claim khác với ngôn từ đã được duyệt trước đó · thị trường áp đặt một hạn chế riêng · claim liên quan tới thai kỳ, cho con bú, sử dụng cho trẻ sơ sinh, bệnh lý, điều trị, phòng ngừa, chữa lành hoặc chứng thực y khoa. `[R3-C1]`

**Năm trường rà soát là bắt buộc với một claim đã bị kích hoạt:** Kết quả rà soát pháp lý · người rà soát · ngày rà soát · lý do rà soát · liên kết bằng chứng rà soát. **Bốn giá trị kết quả là** Approved · Approved with Conditions · Not Approved · Further Information Required. **Một thay đổi về sau đối với ngôn từ đã được rà soát phải làm vô hiệu lần rà soát trước và kích hoạt đánh giá lại.** `[R4-C27]`

**🆕 Bổ sung các cờ chủ đề claim có cấu trúc** thay vì suy đoán từ văn bản tự do: Thai kỳ · Cho con bú · Sau sinh · Trẻ sơ sinh hoặc trẻ em · Bệnh lý hoặc tình trạng sức khỏe · Điều trị hoặc phòng ngừa · Chữa lành hoặc phục hồi · Chứng thực y khoa hoặc bởi nhân viên y tế · An toàn hoặc dung nạp · So sánh hoặc vượt trội · Chủ đề nhạy cảm khác. Các hạn chế theo thị trường lấy từ hồ sơ thị trường pháp lý có thể cấu hình. `[R4-C27]`

### 13.4 Cơ sở bằng chứng

**⚠️ Claim mỹ phẩm CÓ kích hoạt yêu cầu bằng chứng ở cấp sản phẩm** khi claim khẳng định một kết quả hoặc hiệu năng của sản phẩm thành phẩm — các ví dụ được nêu: Dưỡng ẩm · Cấp nước · Làm mềm · Cải thiện vẻ ngoài · Hỗ trợ chức năng hàng rào da · Giúp gỡ rối · Giảm tồn dư · Cải thiện cảm giác trên da. Một phát biểu thuần ở cấp thành phần chỉ được dựa vào bằng chứng thành phần **khi nó được trình bày rõ ràng là phát biểu về thành phần và không ngụ ý rằng sản phẩm thành phẩm mang lại cùng kết quả đo được.** 🆕 Bổ sung trường **Cơ sở bằng chứng yêu cầu**: Bằng chứng trên sản phẩm thành phẩm · Bằng chứng cấp thành phần · Lý giải công thức/cơ chế · Bằng chứng cảm nhận người tiêu dùng · Bằng chứng pháp lý hoặc về thành phần · Không có claim hiệu năng · Kết hợp nhiều loại bằng chứng. `[R4-C36(a) ⚠️]`

### 13.5 Thư viện Claim

**🆕 Một Thư viện Claim cấp công ty.** Mỗi mục mang các thẻ phạm vi áp dụng theo Thương hiệu · Dòng sản phẩm · SKU · Thị trường · Ngôn ngữ · Kênh · Dùng cho người tiêu dùng hay chuyên gia. **Dự án đọc từ thư viện nhưng không trực tiếp chỉnh sửa nó.** Một claim của dự án liên kết tới một mục thư viện khi nó tái sử dụng ngôn từ đã duyệt; một claim thực sự mới có thể được đề xuất mà không cần liên kết nhưng **phải được nhận diện là "Claim mới — chưa có trong Thư viện Claim"**, và điều đó kích hoạt rà soát Pháp lý và Kỹ thuật. `[R4-C28]`

**Kỹ thuật và Pháp chế phải cùng phê duyệt** một mục trước khi nó trở thành Ngôn từ Thư viện đã duyệt; **Marketing/Thương hiệu có thể đề xuất ngôn từ nhưng không được đưa ra phê duyệt kỹ thuật hay pháp lý cuối cùng.** Mỗi mục lưu giữ Phiên bản · Lịch sử phê duyệt · Yêu cầu bằng chứng · Phạm vi áp dụng theo thị trường và kênh · Ngày hiệu lực · Ngày rà soát · Trạng thái thu hồi. **Phê duyệt ở cấp dự án không được tự động nâng ngôn từ lên thư viện** — cần một hành động được kiểm soát riêng, **"Đề xuất đưa vào Thư viện Claim"**, sau đó Kỹ thuật và Pháp chế rà soát để dùng rộng hơn. `[R4-C28]`

**Khi một mục thay đổi hoặc bị thu hồi**, hệ thống phải xác định mọi claim, SKU, thị trường và tài liệu đã công bố có liên kết · kích hoạt một đánh giá tác động · tạo Change Control khi cần · gắn cờ tài liệu bị ảnh hưởng để rà soát lại · ghi nhận ngày hiệu lực và kế hoạch chuyển tiếp. **Việc thay đổi hoặc thu hồi không được tự động rút sản phẩm khỏi thị trường, trừ khi thay đổi đó là trọng yếu hoặc do Pháp chế yêu cầu.** `[R4-C28]`

### 13.6 Thông tin công bố

**Mọi thông tin dự kiến công bố ra bên ngoài đều phải đi qua một quy trình Published Information Approval bắt buộc trước khi phát hành** — website, brochure, tài liệu kỹ thuật, tài liệu cho nhà phân phối, bài thuyết trình, tài liệu cho nhân viên y tế, **nội dung do AI sinh ra**, mạng xã hội, chữ trên nhãn và bao bì nghệ thuật, các bản tóm tắt kỹ thuật đối ngoại, và các claim sản phẩm. Quy trình bao gồm hướng dẫn về thuật ngữ và claim được chấp nhận · các loại bằng chứng cần cho từng claim · xác minh bằng chứng đã được liên kết · rà soát kỹ thuật · rà soát pháp lý khi áp dụng · phê duyệt cuối cùng trước khi công bố. **Không một thông tin công khai nào được phát hành trước khi quy trình này hoàn tất.** `[R1-C6]`

**Mười hai trạng thái quy trình:** Draft · Evidence Gathering · Technical Review · Regulatory Review Required · Regulatory Review Complete · Revision Required · Final Approval Pending · Approved for Release · Released · Expired · Withdrawn · Superseded. **Vai trò:** Chủ nội dung / Tác giả · Người rà soát Kỹ thuật · Người rà soát Pháp lý (bất cứ khi nào nội dung có claim, an toàn, tuân thủ, chỉ dẫn, cảnh báo, nội dung riêng theo thị trường hoặc nội dung cho nhân viên y tế) · Người phê duyệt cuối có thẩm quyền. Nội dung marketing thuần thẩm mỹ có thể bỏ qua bước Pháp lý, **nhưng mọi phát biểu về sản phẩm đều phải dùng ngôn từ đã duyệt**. **Phát hành mà chưa được duyệt sẽ sinh ra một bản ghi sai lệch/vi phạm.** `[R2-F11]`

**Bốn quy tắc về việc liên kết claim với nội dung công bố** `[R3-D2 ⚠️]`:

1. **⚠️ Liên kết Claim ID là bắt buộc**, không phải tùy chọn — mọi phát biểu đối ngoại về lợi ích sản phẩm, an toàn, hiệu quả, hiệu năng hoặc mức phù hợp đều phải liên kết tới một Claim ID. Chỉ là tùy chọn **khi và chỉ khi** đó là thông tin doanh nghiệp thuần túy không chứa claim sản phẩm hay phát biểu kỹ thuật nào.
2. **⚠️ Bộ chọn phải liệt kê cả claim đang phát triển và Pending**, để claim dự kiến được ghi nhận sớm. Thứ mà một claim Pending **không** được phép là Approved for Release · Released · phê duyệt bao bì nghệ thuật cuối cùng · công bố ra bên ngoài.
3. **⚠️ Không khóa tuyệt đối từng ký tự.** Hệ thống lưu song song **ngôn từ gốc đã duyệt** và **ngôn từ đề xuất theo kênh**, cộng với một trạng thái so sánh / rà soát và phê duyệt của người rà soát. Điều chỉnh nhỏ được phép khi ý nghĩa, phạm vi, các cụm bổ nghĩa và gánh nặng bằng chứng không đổi; mọi thay đổi mang tính thực chất đều tạo ra một bản ghi claim mới hoặc phiên bản mới. Có thể dùng kiểm tra độ tương đồng tự động **như một cảnh báo**, nhưng kết luận tương đương cuối cùng do một người rà soát có thẩm quyền xác nhận.
4. **Chặn ở khâu phát hành được xác nhận và mở rộng:** một claim được liên kết phải ở trạng thái Supported **và đã được duyệt cho đúng SKU, phiên bản công thức, thị trường và kênh** thì nội dung mới được chuyển sang Approved for Release hoặc Released.

**Ba giá trị so sánh** là Giống hệt ngôn từ gốc · Điều chỉnh nhỏ (ý nghĩa, phạm vi, cụm bổ nghĩa và gánh nặng bằng chứng không đổi) · Thay đổi thực chất (cần claim mới hoặc phiên bản mới). Thay đổi chỉ về khoảng trắng có thể bỏ qua; các thay đổi khác do **con người rà soát, không tự động kết luận là tương đương**. Các yêu cầu này áp dụng **ở khâu phát hành, không phải ở lần nhập đầu tiên.** `[R4-C30(a)]`

**🆕 Phê duyệt bao bì nghệ thuật cuối cùng** được thể hiện trong bản ghi **Packaging / Artwork Approval**, bản ghi này **phải liên kết mọi Claim ID có trên bao bì** và **chặn cứng** khi bất kỳ claim liên kết nào đang ở trạng thái Pending · Chưa có bằng chứng · Chưa được duyệt cho thị trường đó · Đã bị thay thế · Chưa được duyệt cho ngôn từ hoặc kênh dự kiến. `[R4-C30(c)]`

**🆕 Công bố ra bên ngoài là một sự kiện riêng, tách khỏi Approval for Release.** "Approved for Release" nghĩa là được phép sử dụng; sau đó một bản ghi **Publication / Deployment** ghi nhận ngày công bố hoặc phát hành thực tế · kênh · thị trường · URL, file hoặc mã bao bì nghệ thuật · phiên bản đã công bố · người chịu trách nhiệm · ngày thu hồi hoặc thay thế. Với bao bì in, sự kiện tương đương có thể là **Release to Print**. `[R4-C30(d)]`

**🆕 Ngoại lệ "không có claim sản phẩm" cần hai người.** Chủ nội dung có thể đề xuất "Không có claim sản phẩm hay phát biểu kỹ thuật", nhưng **ngoại lệ đó phải được một người rà soát Kỹ thuật hoặc Pháp chế xác nhận trước khi phát hành.** `[R4-C30(e)]`

---

## 14. Hồ sơ pháp lý, PIF và ra mắt

**Hoàn tất PIF là một chặn cứng, quản lý theo từng thị trường.** Nó chặn cứng phê duyệt ra mắt · claim đối ngoại · thông tin cho nhà phân phối · thông tin cho nhân viên y tế. Một sản phẩm có thể ra mắt ở nước này trong khi vẫn bị chặn ở nước khác. `[R1-C5]`

**Mỗi thị trường dùng một Market Dossier Profile có thể cấu hình**, thay vì mặc định áp checklist PIF ASEAN ở mọi nơi — ASEAN/VN (PIF ASEAN + công bố tại địa phương) · EU/EEA (PIF / CPSR / CPNP / Responsible Person) · UK (UK PIF / CPSR / SCPN / RP) · Úc (tuân thủ sản phẩm và thành phần, AICIS khi áp dụng, rà soát nhãn và claim, Product Master File của công ty) · Mỹ (MoCRA và các hồ sơ FDA áp dụng, chứng minh an toàn, claim và ghi nhãn) · các thị trường khác có thể cấu hình. **Pháp chế tự duy trì hồ sơ của từng thị trường mà không cần dựng lại phần mềm.** `[R2-F10]`

**Chỉ cưỡng chế checklist ASEAN khi có chọn một thị trường ASEAN.** Với thị trường ngoài ASEAN, yêu cầu một bản ghi **Regulatory Checklist Status** ghi nhận thị trường áp dụng · loại hồ sơ yêu cầu · người phụ trách · liên kết checklist hoặc bằng chứng · trạng thái · phê duyệt Pháp lý. **Việc chưa có mẫu sẵn cho một quốc gia không được đồng nghĩa với việc mục đó không bị cưỡng chế** — Pháp chế có thể dùng một checklist bên ngoài đã được duyệt và liên kết vào, cho tới khi hồ sơ thị trường được cấu hình trong ứng dụng. `[R3-E2]`

**⚠️ Cần hai danh sách giá trị riêng biệt**, không tái dùng các danh sách sẵn có `[R4-C35 ⚠️]`:

- **Trạng thái công việc checklist:** Not Started · In Progress · Awaiting Information · Complete · On Hold · Blocked · N/A — cần lý do.
- **Phê duyệt pháp lý:** Pending · Approved · Approved with Conditions · Not Approved · Withdrawn · N/A — cần lý do.

Một thị trường nhập dưới dạng **"Other — specify" còn phải ghi nhận quốc gia hoặc khu vực tài phán thực tế**; chừng nào thị trường chưa được nêu tên và loại hồ sơ chưa được xác định thì bản ghi là chưa đầy đủ và **phải chặn Cổng 10**. Cả sáu trường đều phải có mặt, và khi dùng N/A thì phải ghi nhận cả lý do **lẫn một người rà soát có thẩm quyền**. `[R4-C35]`

**🆕 Pháp chế duy trì một hồ sơ thị trường có thể cấu hình**, nêu rõ mỗi thị trường có yêu cầu báo cáo biến cố bất lợi, hồ sơ PMS hay chu kỳ rà soát riêng hay không. **Không dùng một danh sách quốc gia cố định cứng vĩnh viễn.** Chính hồ sơ này cũng cung cấp hạn chế claim theo thị trường và loại hồ sơ yêu cầu. `[R4-C4]`

---

## 15. Giám sát hậu mãi

**🆕 Mọi sản phẩm đang lưu hành đều cần một kỳ rà soát giám sát hậu mãi cơ bản.** Một kỳ rà soát **tăng cường** là bắt buộc khi có bất kỳ điều nào sau đây: sản phẩm cho trẻ sơ sinh hoặc trẻ nhỏ · sản phẩm cho thai kỳ, cho con bú hoặc sau sinh · sản phẩm dùng vùng kín · sản phẩm vùng mắt hoặc có khả năng phơi nhiễm mắt · da nhạy cảm, cơ địa eczema hoặc da tổn thương · nhóm dễ tổn thương về y tế · claim rủi ro cao hoặc cận điều trị · hoạt chất mới hoặc bất thường · tín hiệu an toàn · biến cố bất lợi · xu hướng khiếu nại đáng kể · vấn đề chất lượng hoặc hiệu năng lặp lại · yêu cầu cảnh giác riêng theo thị trường · yêu cầu trong một kế hoạch giám sát đã được duyệt. `[R4-C4]`

**🆕 Lịch rà soát tính từ ngày ra mắt thương mại thực tế** của thị trường tương ứng: **một tháng** — rà soát sớm cho sản phẩm trẻ sơ sinh, cho mẹ, dùng vùng kín, vùng mắt hoặc thuộc diện giám sát tăng cường · **ba tháng** — kỳ rà soát hậu ra mắt tiêu chuẩn đầu tiên cho mọi sản phẩm · **mười hai tháng** — rà soát hậu mãi đầy đủ · **hằng năm sau đó** trong suốt thời gian sản phẩm còn lưu hành. Phải rà soát sớm hơn nếu xuất hiện biến cố bất lợi đáng kể, xu hướng khiếu nại, yêu cầu từ cơ quan quản lý hoặc tín hiệu chất lượng. **Lịch này có thể cấu hình khi một sản phẩm hoặc thị trường cụ thể cần chu kỳ khác.** `[R4-C13]` `[R4-C4]`

**Một sản phẩm được coi là đã ra mắt ở một thị trường khi ngày ra mắt thương mại thực tế của thị trường đó được ghi nhận** — đây là một dữ kiện khác với phê duyệt ra mắt. **Việc ra mắt ở thị trường đầu tiên không được khiến mọi thị trường khác bị coi là đã ra mắt.** `[R4-C14]`

**⚠️ Danh sách mười sáu lựa chọn phản hồi đang trộn ba khái niệm và phải được tách ra** `[R4-C10 ⚠️]`:

- **Nguồn phản hồi:** Người tiêu dùng · Nhân viên y tế · Nhà phân phối · Nhà bán lẻ · Kinh doanh · Mạng xã hội · Chăm sóc khách hàng · Cơ quan quản lý · Chất lượng hoặc Sản xuất nội bộ.
- **Loại vấn đề:** An toàn hoặc biến cố bất lợi · Hiệu năng sản phẩm · Thắc mắc về claim hoặc truyền thông · Vấn đề bao bì · Vấn đề công thức · Vấn đề chất lượng · Nhu cầu FAQ hoặc đào tạo · Cơ hội tối ưu sản phẩm.
- **Hành động phát sinh:** Rà soát PMS · CAPA · Change Control · Cập nhật FAQ · Tối ưu sản phẩm · Không cần hành động thêm.

**CAPA là một hành động phát sinh, không phải một nguồn phản hồi.** Phản hồi từ nhân viên y tế, nhà bán lẻ, kinh doanh và mạng xã hội **đều được tính là phản hồi thị trường**. Vấn đề bao bì đóng góp vào rà soát hiệu năng sản phẩm và phản hồi thị trường khi phù hợp. `[R4-C10]`

**⚠️ Phản hồi hiệu năng sản phẩm là Conditional, không phải Supporting.** Nó trở thành bắt buộc khi hiệu năng nằm trong phạm vi kỳ rà soát theo lịch · có khiếu nại hoặc thắc mắc liên quan hiệu năng · một vấn đề công thức, bao bì hoặc chất lượng ảnh hưởng tới hiệu năng · có mối lo về hiệu quả hoặc về mức thực hiện của claim · có đề xuất tối ưu sản phẩm. Với phản hồi thị trường, dùng **hai khái niệm riêng biệt** thay vì đổi tầng của cùng một bản ghi theo thời gian: **Thu thập Phản hồi Thị trường Liên tục — Supporting** (luôn sẵn có trong suốt vòng đời) và **Rà soát Phản hồi Thị trường Theo lịch — Conditional** (bắt buộc một khi đến mốc rà soát hậu ra mắt tương ứng hoặc xuất hiện một tín hiệu liên quan). `[R4-C15 ⚠️]`

---

## 16. Thu thập dữ liệu ở Cổng 1 và Cổng 2

**Các trường của Cổng 1 là tùy chọn khi tạo dự án và bắt buộc trước khi Cổng 1 thông qua.** Có thể mở một dự án với tên hoặc mã tạm, người tạo, ngày tạo và người phụ trách ban đầu; sau đó Cổng 1 mới yêu cầu thông tin thực chất về cơ hội và yêu cầu. `[R4-C20]`

**Nguồn yêu cầu (Request Origin / Source) tách biệt với người đề nghị.** Các lựa chọn: Đề xuất phát triển sản phẩm nội bộ · Yêu cầu từ Ban lãnh đạo · Yêu cầu từ Kinh doanh · Yêu cầu từ Marketing · Yêu cầu từ khách hàng · Yêu cầu từ nhà phân phối · Yêu cầu từ nhân viên y tế · Phản hồi người tiêu dùng · Khiếu nại hoặc tín hiệu hậu mãi · Nghiên cứu thị trường hoặc cơ hội được xác định · Phản ứng với đối thủ hoặc benchmark · Thay đổi quy định · Cơ hội từ nhà cung cấp hoặc nguyên liệu · Cải tiến sản xuất hoặc chất lượng · Tái lập công thức hoặc cải tiến vòng đời · Khác — nêu rõ. **Tên và phòng ban của người đề nghị vẫn là các trường riêng.** `[R3-B1]`

**Một Key Gate Check "Đã xác định phạm vi sản phẩm ban đầu"** ghi nhận loại sản phẩm đề xuất · mục đích dự kiến · đây là phát triển mới, tái lập công thức, thay đổi claim, thay đổi bao bì, mở rộng thị trường hay cải tiến vòng đời · các ranh giới đã biết của yêu cầu. `[R3-B2]`

**Một phần thu thập nhẹ ở Cổng 1 về người dùng / giai đoạn sống mục tiêu ban đầu và thị trường mục tiêu ban đầu.** Đây là thông tin sơ bộ và **không thay thế** phần đánh giá đầy đủ ở Cổng 2 — Cổng 2 mới xác nhận, tinh chỉnh và phê duyệt chính thức. `[R3-B3]` Nửa về thị trường ban đầu của mục này bị thay thế bởi `[R4-C24]` — xem mục 2.

**Development brief là một bản ghi được kiểm soát riêng hoặc một tài liệu được liên kết**, không phải thứ suy ra từ việc các checklist đã hoàn tất. Ghi nhận trạng thái Development Brief · đường dẫn · phiên bản · người phụ trách · ngày phê duyệt. Các phần checklist của Pha 1 *góp phần tạo nên* brief nhưng **không** thay thế việc phê duyệt brief chính thức. `[R3-B4]`

**Một bảng yêu cầu ở Pha 1**, cấu trúc gồm nhóm · yêu cầu · mức ưu tiên · người phụ trách · ghi chú, bao gồm: Yêu cầu bắt buộc phải có của sản phẩm · Thành phần hoặc đặc tính không được có · Claim dự kiến · Claim không theo đuổi · pH mục tiêu hoặc yêu cầu vật lý khi đã biết · Yêu cầu cảm quan · Yêu cầu bao bì · Mục tiêu chi phí hoặc ranh giới thương mại · Mốc thời gian mục tiêu · Thị trường mục tiêu · Ràng buộc pháp lý · Ràng buộc về người dùng / giai đoạn sống · Sản phẩm benchmark hoặc tham chiếu · Rủi ro kỹ thuật đã biết · Các loại trừ tường minh · Giả định khác của dự án. `[R3-B6]`

**⚠️ Mức ưu tiên của yêu cầu là Must / Should / Could** — mức trọng yếu vẫn là một khái niệm *rủi ro*, không phải một giá trị ưu tiên của yêu cầu. 🆕 **"N/A kèm lý do" là một cách xử lý hợp lệ.** Trước khi Cổng 2 thông qua: mọi dòng phải được rà soát · mọi dòng áp dụng phải hoàn tất hoặc được hoãn chính thức · mọi dòng không áp dụng phải được đánh dấu N/A kèm lý do · **mọi yêu cầu Must phải hoàn tất** · một yêu cầu Should hoặc Could chỉ được hoãn thông qua Proceed with Conditions, kèm người phụ trách và hạn hoàn thành. Dòng *Yêu cầu bắt buộc phải có của sản phẩm* luôn bắt buộc; các dòng khác trở thành bắt buộc tùy theo phạm vi dự án. **Hệ thống không được bắt người dùng đánh dấu một yêu cầu trống là đã Hoàn tất.** `[R4-C21 ⚠️]`

**Cách trình bày dạng bảng lựa chọn cho các danh sách ở Cổng 1 được chấp nhận** — nó cung cấp các trường người phụ trách, trạng thái, bằng chứng và lý do. **⚠️ Một dự án có thể có nhiều hơn một loại phát triển/thay đổi, nhưng phải xác định một loại là Loại dự án chính (Primary)**, các loại còn lại ghi nhận là phụ. **⚠️ Giá trị người phụ trách/chức năng:** *Nguồn yêu cầu* → **Chức năng đề nghị / Chủ dự án** (tốt hơn là luôn ghi Kinh doanh, vì một yêu cầu có thể xuất phát từ Pháp chế, Chất lượng, Sản xuất, Ban lãnh đạo hoặc một chức năng khác); *Loại phát triển / thay đổi* → **NPD / Chủ dự án**. Tên gọi "Loại phát triển / thay đổi" được chấp nhận, và năm trường văn bản tự do của Cổng 1 vẫn nằm trong khối *Cơ hội & Yêu cầu — Cổng 1* của riêng chúng chứ không chuyển vào bảng Nhận diện dự án. `[R4-C22]`

**🆕 Cổng 2 yêu cầu ít nhất một loại hoặc trạng thái dạng sản phẩm, nhưng dạng cuối cùng có thể còn để ngỏ một cách chính đáng.** Bổ sung lựa chọn **"Dạng sản phẩm đang được đánh giá — sẽ xác nhận trước Cổng 5"**, để một brief sơ khởi như "sản phẩm bảo vệ da cho trẻ sơ sinh — kem hay balm còn chờ quyết định" vẫn qua được Cổng 2 kèm một hành động được kiểm soát. `[R4-C23(a)]`

**🆕 Mục tính giá ở Cổng 5 vẫn là Supporting trừ khi dự án được chỉ định cụ thể là phụ thuộc thương mại**, khi đó yêu cầu thương mại đó trở thành một **Must** — xử lý qua Hold hoặc Proceed with Conditions chứ không được bỏ qua. `[R4-C36(b)]`

---

## 17. Kiểm nghiệm và nghiên cứu trên người

**Phê duyệt nghiên cứu trên người phải hoàn tất trước khi tuyển người tham gia**, khi áp dụng, và quy trình phê duyệt được kích hoạt trước **bất kỳ** nghiên cứu nội bộ hay bên ngoài nào có người tham gia, tình nguyện viên, thử nghiệm người tiêu dùng, thử áp da, thử nghiệm trong sử dụng, thu thập hình ảnh, bảng hỏi, hoặc dữ liệu định danh người tham gia khác. `[R2-F1 Cổng 8]` `[R3-A3]`

**🆕 "Có kế hoạch nghiên cứu trên người không?" là một trường tường minh Yes / No / Undecided.** Nó được rà soát ở Cổng 8 và cũng có thể được nêu sớm hơn qua kế hoạch claim hoặc kế hoạch bằng chứng. **Việc tạo một Study Protocol tự động đặt câu trả lời thành Yes.** Khi là Yes: quy trình phê duyệt nghiên cứu chuyên biệt trở thành bắt buộc · không được bắt đầu tuyển người trước khi có phê duyệt · không được bắt đầu kiểm nghiệm hoặc thu thập dữ liệu trước khi có phê duyệt · các yêu cầu về thông tin cho người tham gia, đồng thuận, quyền riêng tư và quản lý dữ liệu phải hoàn tất. **Undecided phải ngăn Cổng 8 đóng lại.** `[R4-C9]`

**🆕 "Có rủi ro scale-up không? — Yes / No / Pending"**, kèm mô tả rủi ro · người đánh giá · ngày đánh giá · lý do · hoạt động pilot hoặc scale-up cần thiết · liên kết bằng chứng. **Pending chặn mức sẵn sàng của Cổng 9.** Các hạng mục bị ảnh hưởng làm kích hoạt rà soát scale-up hoặc pilot: thành phần công thức · nồng độ hoạt chất hoặc chất bảo quản · nhà máy sản xuất · loại hoặc quy mô thiết bị · cỡ lô · thứ tự thêm nguyên liệu · tốc độ hoặc thời gian khuấy trộn · đồng hóa · hồ sơ gia nhiệt hoặc làm nguội · nhiệt độ tối đa · thời gian giữ nhiệt · tiền xử lý hoặc hydrat hóa nguyên liệu · phương thức chuyển liệu · phương thức chiết rót · chất lượng nước hoặc nguồn nước quy trình · phụ gia quy trình · giao diện bao bì/chiết rót · **bất kỳ thay đổi nào mà Sản xuất, Chất lượng hoặc R&I xác định là có thể ảnh hưởng tới hiệu năng sản phẩm.** `[R4-C12]`

---

## 18. Các trường đánh giá tường minh

Năm câu hỏi, mỗi câu bổ sung một trường mà giá trị "chưa đánh giá" sẽ chặn, áp dụng quy tắc xuyên suốt ở mục 6.4. Chúng được liệt kê cùng nhau vì dùng chung một cơ chế.

| Trường | Giá trị | Cái gì bị chặn | Nguồn |
|---|---|---|---|
| Có cần Change Control không? | Yes / No / Pending | Pending chặn việc đóng phát hiện hậu mãi | `[R4-C8]` |
| Có kế hoạch nghiên cứu trên người không? | Yes / No / Undecided | Undecided ngăn Cổng 8 đóng lại | `[R4-C9]` |
| Thay đổi hành chính thuần? | Yes / No | Quyết định việc miễn rà soát đối thủ/benchmark | `[R4-C11]` |
| Có rủi ro scale-up không? | Yes / No / Pending | Pending chặn mức sẵn sàng Cổng 9 | `[R4-C12]` |
| Lý do N/A | Hệ thống sinh hoặc người nhập | Mục trọng yếu vẫn cần người rà soát xác nhận | `[R4-C16]` |

---

## 19. NPD Front-End Roadmap

**Nguồn và trạng thái.** File workbook v2 do chính đội chuyên gia soạn và mang **thẩm quyền ngang với workbook gốc** — không cần một vòng xác nhận riêng. `[V2]`

**Một phần đầu khoa học gồm bốn bước bắt buộc, mọi sản phẩm mới phải hoàn tất theo đúng thứ tự, trước khi công thức bị khóa ở Cổng 5** `[V2]`:

1. **Needs & Scientific Basis** — nhu cầu về thể chất, cảm xúc, nhu cầu của người chăm sóc và hàm ý thiết kế, kèm các câu hỏi nghiên cứu và phương pháp tra cứu tài liệu được ghi nhận. Cổng ký duyệt: **Cổng 2**.
2. **Competitor Landscape** — các sản phẩm đối thủ đã mua và thử, kiểm nghiệm so sánh, và phân tích giải pháp hiện hành / chuẩn chăm sóc. Cổng ký duyệt: **Cổng 3**.
3. **Target Product Profile & Backbone Technology** — một định nghĩa thống nhất về thế nào là sản phẩm thành công, cộng với nền tảng công nghệ đề xuất và lý do nó vượt trội so với thị trường. **Phải hoàn tất trước khi công thức bị khóa ở Cổng 5.**
4. **Evidence Plan & Claim Support** — kế hoạch chứng minh (chỉ tiêu đánh giá, nhóm so sánh, ngưỡng đạt/không đạt) phải được thống nhất **trước** khi công thức bị khóa ở Cổng 5; giao thức kiểm nghiệm chi tiết hoàn tất khi đã có nguyên mẫu, ở **Cổng 8**.

**Cưỡng chế:** Formula BOM ở Cổng 5 bị chặn cứng cho tới khi Bước 1–3 hoàn tất và được ký duyệt, và kế hoạch bằng chứng của Bước 4 đã được ghi nhận. Cổng 2, 3 và 8 mỗi cổng cũng mang điểm kiểm tra sớm riêng cho bước tương ứng, để vấn đề lộ ra sớm thay vì chỉ ở khâu cuối. `[V2]`

**Không một claim nào được xuất hiện trên bao bì, tài liệu cho nhân viên y tế hay tài liệu bán hàng nếu chưa có một Claim ID được duyệt trong hồ sơ** — cùng một quy tắc với Cổng 3: *"một claim có thể còn đang phát triển, nhưng ngôn từ chưa có bằng chứng thì không được đánh dấu là đã duyệt."* `[V2]` Thiết kế cưỡng chế điều này đã được rà soát ở Vòng 3 và ba trong bốn lựa chọn thiết kế bị thay đổi — xem mục 13.6. `[R3-D2]`

---

## 20. Các quyết định do chủ dự án đưa ra, không phải của đội chuyên môn

Những điều dưới đây **được quyết định nội bộ, không hỏi đội chuyên môn.** Chúng được ghi ở đây để mọi người đều thấy và có thể phản biện nếu mâu thuẫn với cách doanh nghiệp thực sự vận hành. `[PO, 2026-07-26]`

- **Chỉ System Administrator được xóa một dự án**, và việc xóa sẽ mang theo toàn bộ dấu vết kiểm toán của dự án đó. Một bản ghi được cố ý giữ lại: một bia mộ ghi ai đã xóa cái gì, khi nào, dự án đã được lưu trữ trước đó hay chưa, và bao nhiêu dữ liệu đã bị hủy. **Một dự án không bao giờ được biến mất mà không để lại dấu vết về người đã xóa nó** — đó chính là quy tắc `[R1-B4]` áp dụng cho chính hành vi xóa. Thẩm quyền xóa gắn về mặt cấu trúc với vai trò quản trị viên và **không** phải là một quyền có thể cấp cho vai trò khác.
- **Chỉ Project Owner được lưu trữ và khôi phục một dự án.** Lưu trữ là thao tác đảo ngược được và không xóa gì; đây là lối đi cho mọi vai trò không phải quản trị viên khi muốn ngừng một dự án. System Administrator cũng được lưu trữ, vì nó vốn đã thực hiện được thao tác hủy hoại hơn nhiều là xóa.
- **Một dự án đã lưu trữ là chỉ đọc với tất cả mọi người, kể cả quản trị viên.** Phải khôi phục trước. Hai thứ vẫn khả dụng: khôi phục nó, và — với quản trị viên — xóa nó.
- **Bất kỳ người dùng đã đăng nhập nào cũng được tạo dự án.** Hạn chế điều này sẽ cản trở hoạt động nghiệp vụ bình thường, và việc tạo một dự án không hủy hoại gì cả.
- **"Chủ dự án" ở Cổng 1 là một dấu tích tường minh, không phải một điều kiện tự động thỏa mãn.**
- **Đăng nhập bằng Microsoft 365 chỉ chứng minh người đó thuộc công ty. Người dùng không có vai trò thì không vào được ứng dụng.** `[PO, 2026-10-02]`
- **"View as" là chế độ xem trước chỉ đọc dành cho quản trị viên**, không phải cách để hành động dưới danh nghĩa một vai trò khác. `[PO, 2026-10-03]`

---

## 21. Những gì còn mở

| Hạng mục | Vì sao còn mở | Nguồn |
|---|---|---|
| **Mức bao phủ tuân thủ ASEAN / Việt Nam của Cosmetri** | Phụ thuộc bên ngoài — chỉ Cosmetri xác nhận được. Cách xử lý tạm thời ở mục 4. | `[R2-F12 ⏳]` |
| **Các câu hỏi Vòng 5** | Được soạn trong lúc xây dựng Vòng 4 và chưa gửi. Chừng nào chưa có trả lời, các lựa chọn thiết kế bị ảnh hưởng vẫn chỉ là cách hiểu của chúng tôi, chưa phải quy tắc đã xác nhận. | `docs/rounds/DRAFT-our-questions-round5.md` |

**Nội dung còn phải cung cấp — đây là dữ liệu cần thu thập, không phải quyết định cần đưa ra:**

- Bộ dữ liệu danh mục theo dõi thật, có số CAS cho từng nhóm thành phần, do Pháp chế và An toàn duy trì. `[R2-F3]`
- Ma trận phân quyền chi tiết vai trò × cổng / mục / sổ, cộng với ánh xạ thuộc tính SSO/AD thật. `[R2-F6]`
- Nội dung checklist cụ thể theo từng thị trường cho mỗi Market Dossier Profile — các mục EU CPSR, Úc, Mỹ. `[R2-F10]` `[R3-E2]` — đã được giải quyết một phần bởi `[R4-C35]` và `[R4-C4]`.
- Nội dung Thư viện Claim: các thuật ngữ đã duyệt và bằng chứng yêu cầu cho từng claim. **Hình hài** của nó đã chốt ở `[R4-C28]`; **nội dung** thì chưa được điền. `[R2-F11]`
- Nội dung Lớp phủ Rủi ro Nguyên liệu — mười một phân loại rủi ro thành phần cho từng nguyên liệu. `[R4-C17]`
