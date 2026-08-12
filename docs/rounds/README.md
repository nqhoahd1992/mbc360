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

## Các vòng

| File | Ngày | Nội dung | Trạng thái |
|---|---|---|---|
| `2026-07-21-sme-reply-F1-F14.txt` | 21/07 | Đáp án **F1–F14** + A5 / B5 / C7. Sinh ra engine 3 tầng Mandatory/Conditional/Supporting và toàn bộ `gateReadiness.ts` | ✅ đóng, trừ **F12** |
| `2026-07-21-our-questions-round2.md` | 21/07 | 3 câu làm rõ (A1 định nghĩa "critical" · A2 nội dung Infant & Baby Safety · A3 hai version song song cùng thị trường) + danh sách dữ liệu cần cung cấp | ⏳ **còn mở** |
| `2026-07-31-our-questions-round3.md` | 31/07 | **19 câu** Parts A–E: quy tắc gán tier + 15 item ta tự gán (A1–A2) · điều kiện trigger còn thiếu (A3) · 7 item không có chỗ ghi (B1–B7) · 2 mapping đã đoán (C1–C2) · 4 quyết định đã xây (D1–D4) · 3 item theo thị trường (E1–E3) | ✅ được trả lời trọn ở vòng 07/08 |
| `2026-08-07-sme-reply-round3.txt` | 07/08 | Đáp án Parts A–E: quy tắc gán tier, **12 điều kiện trigger**, 7 trường còn thiếu, và **bác 4 thứ đã xây** | ✅ đóng |
| `2026-08-09-our-questions-round4.md` | 09/08 | **29 câu**: 1 lỗ hổng an toàn đang mở · 3 câu tồn từ 21/07 · 4 giả định đã ship · 12 câu ánh xạ trigger sang dữ liệu · 4 câu về quyết định thiết kế Gate 1–2 (gồm 1 tiền đề ta từng nêu sai với SME) · **2 câu hỏi TRƯỚC khi build** (Claims Library ở cấp nào · 5 điểm D1 để hở) | 📤 **soạn xong, chưa gửi** — vẫn đang bổ sung câu khi phát hiện thêm giả định, ngày trong tên file là ngày soạn |

## Còn nợ

**Từ SME:**
- **F12** — Cosmetri có phủ compliance ASEAN/Việt Nam không (phụ thuộc bên ngoài, không thuộc quyền nhóm ta)
- **A1** (vòng 21/07) — định nghĩa "critical" nói chung. Trả lời một phần: vòng 07/08 đã cấp cơ chế riêng cho 3 chỗ (watch-list, safety finding, change control), nhưng nhánh *"critical gap → Hold/Backtrack"* của F7 vẫn chưa có chỗ ghi
- **A2** (vòng 21/07) — nội dung Infant & Baby Safety pathway. **Đang chặn một lỗ hổng an toàn**: sản phẩm chỉ cho trẻ sơ sinh hiện không bị đòi đánh giá nào ở Gate 7 (xem `R4-Q2`)
- **A3** (vòng 21/07) — cái gì chính thức kết thúc version công thức cũ. Trả lời một phần ở E3(a)

**Ta chưa gửi:**
- **Round 4** — [`2026-08-09-our-questions-round4.md`](2026-08-09-our-questions-round4.md), **soạn xong nhưng chưa gửi**. Đã gộp sẵn 3 câu A1/A2/A3 còn tồn của vòng 21/07 (chúng treo qua hai vòng rồi, và A2 nay nằm trên đường găng), nên chỉ cần gửi đúng một file này.

**Trùng nhãn A1/A2/A3 giữa hai vòng, đừng nhầm:**

| Nhãn | Vòng 2 (21/07) | Vòng 3 (31/07) |
|---|---|---|
| A1 | định nghĩa "critical" | quy tắc gán tier |
| A2 | nội dung Infant & Baby Safety | Gate 6 — market-specific pack requirements |
| A3 | hai version công thức song song cùng thị trường | **điều kiện trigger của từng item Conditional** |

Comment trong code và [`../rules/F1_Conditional_Triggers.md`](../rules/F1_Conditional_Triggers.md) khi viết "A3" đều đang nói tới **A3 của vòng 31/07** (triggers). Mục "Còn nợ" ngay trên thì nói tới A1/A2/A3 của **vòng 21/07**.

**File `2026-07-31-our-questions-round3.md` được bổ sung muộn (11/08).** Trước đó folder chỉ có bản trả lời vòng 3 mà không có bộ câu hỏi sinh ra nó — nên bảng 15 item ở A1 (thứ SME chấp nhận kèm 2 điều chỉnh) không tồn tại ở đâu trong repo, và việc truy "item nào đã được SME xác nhận" phải suy ngược từ bản trả lời. Bài học: lưu bản gửi đi **ngay khi gửi**, đừng đợi bản trả lời về.

**Hai bản của cùng một vòng, đừng nhầm:** file trong `rounds/` là **bản gửi đi** — ngôn ngữ nghiệp vụ, đánh số 1–29, không có tên file hay định danh code. Bản làm việc nội bộ nằm ở [`../rules/F1_Per_Gate_Open_Questions.md`](../rules/F1_Per_Gate_Open_Questions.md) → mục Round 4, giữ ID cố định `R4-Q1`…`R4-Q26` và nêu rõ *nếu trả lời khác thì sửa ở file/hàm nào*. Bảng ở đó có cột **Gửi số** nối hai bên với nhau.
