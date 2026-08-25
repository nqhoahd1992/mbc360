# rounds/ — trao đổi với đội chuyên môn (SME)

**Các file ở đây là bằng chứng, không phải tài liệu.** Chúng ghi lại SME đã nói gì và nói khi nào. **Không sửa file cũ** — kể cả khi phát hiện ta đã hiểu sai một câu trong đó. Hiểu sai thì sửa ở [`../rules/`](../rules/), còn nguyên văn phải giữ nguyên để sau này còn đối chiếu được.

Đây không phải quy tắc hình thức: vòng 2026-08-07 phát hiện **4 hành vi đã ship dựa trên cách đọc sai** văn bản của SME. Truy được nguyên nhân chỉ vì nguyên văn còn nguyên vẹn để đọc lại.

## Đặt tên

```
YYYY-MM-DD-<ai gửi>-<nội dung>.<ext>
```

- `sme-reply` — họ gửi cho ta
- `our-questions` — ta gửi cho họ
- Ngày đứng trước để `ls` tự sắp theo thời gian

**Bản đang soạn thì đặt `DRAFT-` thay cho ngày**, và **đổi tên đúng ngày gửi**. Ngày trong tên file là ngày *gửi*, không phải ngày bắt đầu viết — Vòng 4 soạn từ 09/08 và mang tên 12/08. Tiền tố `DRAFT-` làm việc "chưa gửi" hiện ra ngay khi `ls`, điều đáng có vì mọi file khác trong thư mục này đều là bằng chứng đã cố định.

**Soạn bản gửi ngay trong thư mục này, đừng đợi tới lúc gửi.** Quy tắc "không sửa" chỉ áp *sau khi* đã gửi; nó không có nghĩa là không được soạn ở đây. Bài học ở cuối trang này — bộ câu hỏi Vòng 3 từng thiếu khỏi repo — là bài học về **thiếu file**, không phải về có file sớm.

## Các vòng

| File | Ngày | Nội dung | Trạng thái |
|---|---|---|---|
| `2026-07-21-sme-reply-F1-F14.txt` | 21/07 | Đáp án **F1–F14** + A5 / B5 / C7. Sinh ra engine 3 tầng Mandatory/Conditional/Supporting và toàn bộ `gateReadiness.ts` | ✅ đóng, trừ **F12** |
| `2026-07-21-our-questions-round2.md` | 21/07 | 3 câu làm rõ (A1 định nghĩa "critical" · A2 nội dung Infant & Baby Safety · A3 hai version song song cùng thị trường) + danh sách dữ liệu cần cung cấp | ⏳ **còn mở** |
| `2026-07-31-our-questions-round3.md` | 31/07 | **19 câu** Parts A–E: quy tắc gán tier + 15 item ta tự gán (A1–A2) · điều kiện trigger còn thiếu (A3) · 7 item không có chỗ ghi (B1–B7) · 2 mapping đã đoán (C1–C2) · 4 quyết định đã xây (D1–D4) · 3 item theo thị trường (E1–E3) | ✅ được trả lời trọn ở vòng 07/08 |
| `2026-08-07-sme-reply-round3.txt` | 07/08 | Đáp án Parts A–E: quy tắc gán tier, **12 điều kiện trigger**, 7 trường còn thiếu, và **bác 4 thứ đã xây** | ✅ đóng |
| `2026-08-12-our-questions-round4.md` | 12/08 | **36 câu**: 1 lỗ hổng an toàn đang mở · 3 câu tồn từ 21/07 · 4 giả định đã ship · 12 câu ánh xạ trigger sang dữ liệu · 4 câu về quyết định thiết kế Gate 1–2 (gồm 1 tiền đề ta từng nêu sai với SME) · **2 câu hỏi TRƯỚC khi build** (Claims Library ở cấp nào · 5 điểm D1 để hở) · 6 câu về phần D2, D3, D4, E1, E2, E3(b) vừa xây | ✅ được trả lời trọn ở vòng 24/08 |
| `2026-08-24-sme-reply-round4.md` | 24/08 | Đáp án **cả 36 câu**. Xác nhận phần lớn những gì đã xây, nhưng **bác khoảng 20 chỗ**, và mở ra 6 mảng xây mới: chữ ký per-gate theo thị trường · luồng Infant & Baby Safety trải 6 gate · **3 tập dữ liệu tham chiếu cấp công ty** (Claims Library · Raw Material Risk Overlay · Regulatory market profile) · mô hình revision của claim · vòng đời per-market · 5 trường đánh giá tường minh | ✅ đóng |
| `DRAFT-our-questions-round5.md` | *chưa gửi* | **12 câu** (đang lớn dần): 3 câu chặn phần việc lớn nhất còn lại · 3 câu đã xây trên cách đọc của ta · 3 câu đã thiết kế chưa xây · 3 câu về chữ ký phase còn tồn từ 20/08 | ✍️ **đang soạn** — gửi sau khi đi hết 36 câu Vòng 4 |

## Còn nợ

**Từ SME:**
- **F12** — Cosmetri có phủ compliance ASEAN/Việt Nam không (phụ thuộc bên ngoài, không thuộc quyền nhóm ta) — **mục duy nhất còn mở từ vòng 21/07**
- ~~**A1** (21/07) — định nghĩa "critical"~~ ✅ **đóng 24/08, câu 3:** một gap mang đánh giá mức độ nghiêm trọng của riêng nó (8 trường), và Critical không được mang qua Proceed with Conditions. Đây chính là nhánh *"critical gap → Hold/Backtrack"* của F7 vốn không có chỗ ghi
- ~~**A2** (21/07) — nội dung Infant & Baby Safety pathway~~ ✅ **đóng 24/08, câu 1:** Compartment 3 đúng, nhưng nó là cấu phần **cuối** của một luồng trải Gate 2, 4, 5, 6, 7, 8–9 và 10
- ~~**A3** (21/07) — cái gì chính thức kết thúc version công thức cũ~~ ✅ **đóng 24/08, câu 2:** 6 trạng thái version + một quyết định supersession **theo từng thị trường**, do người ghi, không bao giờ máy tự suy

**Đang chờ trả lời:** *không có.* Vòng 4 đã được trả lời trọn ngày 24/08.

**Đang soạn:**
- **Round 5** — [`DRAFT-our-questions-round5.md`](DRAFT-our-questions-round5.md), **12 câu và còn tăng**. Chưa gửi, theo quyết định của chủ dự án ngày 24/08: gửi **sau khi** đi hết 36 câu Vòng 4, vì tới lúc đó danh sách mới đứng yên.

  **Cùng lý do đã khiến Vòng 4 hoãn ba ngày, nay đã có bằng chứng lần hai:** hai trong mười hai câu chỉ lộ ra **khi viết code**, không phải khi đọc đáp án — một câu khi thấy app không có bản ghi "post-market finding" nào để gắn câu trả lời vào, một câu khi một ca kiểm hành vi cho kết quả chặn mà không quy tắc nào nói nên chặn. Bốn nhóm còn lại gần như chắc chắn còn thêm.

  **Không nhóm nào chờ một câu Vòng 5.** Có một vòng lặp không lách được — phần chữ ký gate cần câu 3 của Vòng 5, nhưng Vòng 5 chỉ gửi sau khi 36 câu xong, mà chính chữ ký gate là hai trong 36 câu đó. Nên cách làm là **xây trên giả định có tài liệu, gắn tag `[ASSUMPTION: R5-Qn]` tại chỗ quyết định**, và `npm run verify:readiness` canh cho không tag nào mồ côi.

**Trùng nhãn A1/A2/A3 giữa hai vòng, đừng nhầm:**

| Nhãn | Vòng 2 (21/07) | Vòng 3 (31/07) |
|---|---|---|
| A1 | định nghĩa "critical" | quy tắc gán tier |
| A2 | nội dung Infant & Baby Safety | Gate 6 — market-specific pack requirements |
| A3 | hai version công thức song song cùng thị trường | **điều kiện trigger của từng item Conditional** |

Comment trong code và [`../rules/F1_Conditional_Triggers.md`](../rules/F1_Conditional_Triggers.md) khi viết "A3" đều đang nói tới **A3 của vòng 31/07** (triggers). Mục "Còn nợ" ngay trên thì nói tới A1/A2/A3 của **vòng 21/07**.

**File `2026-07-31-our-questions-round3.md` được bổ sung muộn (11/08).** Trước đó folder chỉ có bản trả lời vòng 3 mà không có bộ câu hỏi sinh ra nó — nên bảng 15 item ở A1 (thứ SME chấp nhận kèm 2 điều chỉnh) không tồn tại ở đâu trong repo, và việc truy "item nào đã được SME xác nhận" phải suy ngược từ bản trả lời. Bài học: lưu bản gửi đi **ngay khi gửi**, đừng đợi bản trả lời về.

**Hai bản của cùng một vòng, đừng nhầm:** file trong `rounds/` là **bản gửi đi** — ngôn ngữ nghiệp vụ, đánh số 1–36, không có tên file hay định danh code. Bản làm việc nội bộ nằm ở [`../rules/F1_Per_Gate_Open_Questions.md`](../rules/F1_Per_Gate_Open_Questions.md) → mục Round 4, giữ ID cố định `R4-Q1`…`R4-Q33` và nêu rõ *nếu trả lời khác thì sửa ở file/hàm nào*. Bảng ở đó có cột **Gửi số** nối hai bên với nhau.
