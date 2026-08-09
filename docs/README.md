# docs/ — bản đồ

Bốn nhóm tài liệu, phân theo **tài liệu đó thay đổi như thế nào**, không phải theo chủ đề:

| Thư mục | Bản chất | Khi nào đổi |
|---|---|---|
| [`reference/`](reference/) | **Nguồn gốc** — workbook Excel, OpenAPI của Cosmetri | Chỉ khi bên ngoài phát hành bản mới |
| [`rounds/`](rounds/) | **Trao đổi với SME**, theo timeline — mỗi file là một lần gửi/nhận, bất biến sau khi gửi | Không bao giờ sửa file cũ; chỉ thêm file mới |
| [`rules/`](rules/) | **Hợp đồng nghiệp vụ đang sống** — tích luỹ đáp án của mọi vòng | Mỗi khi có đáp án mới hoặc phát sinh giả định mới |
| [`plans/`](plans/) · [`guides/`](guides/) | Kế hoạch kỹ thuật · hướng dẫn dev/vận hành | Theo tiến độ build |
| [`archive/`](archive/) | Đã bị thay thế, giữ để tra lịch sử | Không dùng nữa |

> Khác biệt quan trọng nhất là giữa `rounds/` và `rules/`: **`rounds/` là bằng chứng SME đã nói gì và nói khi nào** — không bao giờ được sửa. **`rules/` là kết luận hiện hành** — luôn phản ánh trạng thái mới nhất. Khi hai bên mâu thuẫn, `rounds/` thắng, và `rules/` là cái phải sửa.

---

## Bắt đầu từ đâu

| Bạn là | Đọc theo thứ tự |
|---|---|
| **Dev mới** | [`guides/DEV_ONBOARDING_DOMAIN.md`](guides/DEV_ONBOARDING_DOMAIN.md) → [`rules/Business_Rules_Confirmation_VN.md`](rules/Business_Rules_Confirmation_VN.md) (cả file) → `plans/` |
| **Sắp sửa `gateReadiness.ts`** | [`rules/Business_Rules_Confirmation_EN.md`](rules/Business_Rules_Confirmation_EN.md) → **Phụ lục 2** (mới nhất, nêu rõ code đang lệch luật ở đâu) → [`rules/F1_Conditional_Triggers.md`](rules/F1_Conditional_Triggers.md) |
| **Cần biết còn nợ SME gì** | [`rules/F1_Per_Gate_Open_Questions.md`](rules/F1_Per_Gate_Open_Questions.md) → mục Round 4 |
| **Deploy** | [`guides/DEPLOY.md`](guides/DEPLOY.md) |

---

## Timeline trao đổi với SME

| Ngày | Việc | File | Trạng thái |
|---|---|---|---|
| 2026-07-16 | SME trả lời bảng câu hỏi gốc (nhóm A/B/C), trừ C7 | ghi inline trong `rules/Business_Rules_Confirmation_*` | ✅ đóng |
| 2026-07-21 | SME trả lời **F1–F14** + A5 / B5 / C7 | [`rounds/2026-07-21-sme-reply-F1-F14.txt`](rounds/2026-07-21-sme-reply-F1-F14.txt) | ✅ đóng, trừ **F12** (phụ thuộc Cosmetri) |
| 2026-07-21 | Ta gửi tiếp — 3 câu làm rõ + danh sách dữ liệu cần cung cấp | [`rounds/2026-07-21-our-questions-round2.md`](rounds/2026-07-21-our-questions-round2.md) | ⏳ **A1 một phần · A2 còn mở · A3 một phần** |
| 2026-07-22 → 07-28 | Ta soạn câu hỏi theo từng gate khi đấu nối F1 (Parts A–E) | `rules/F1_Per_Gate_Open_Questions.md` | ✅ đã gửi |
| 2026-08-07 | SME trả lời toàn bộ Parts A–E | [`rounds/2026-08-07-sme-reply-round3.txt`](rounds/2026-08-07-sme-reply-round3.txt) | ✅ đóng — ghi tại **Phụ lục 2** của `rules/Business_Rules_Confirmation_*` |
| 2026-08-09 | **Round 4** — 14 câu phát sinh khi triển khai + khi thiết kế trigger | `rules/F1_Per_Gate_Open_Questions.md` → Round 4 | 🔴 **đang mở, chưa gửi** |

**Đang chặn:** `A2` của vòng 2026-07-21 (nội dung Infant & Baby Safety pathway) — nó chặn `R4-Q2`, tức lỗ hổng an toàn: sản phẩm chỉ cho trẻ sơ sinh hiện không có đánh giá nào ở Gate 7.

---

## Quy ước

**Đặt tên trong `rounds/`:** `YYYY-MM-DD-<ai gửi>-<nội dung>.<ext>` — ngày đứng trước để sắp xếp tự nhiên theo thời gian. `sme-reply` = họ gửi cho ta; `our-questions` = ta gửi cho họ. Tên cũ (`Response.txt`, `Response2.txt`) đã bỏ vì không cho biết vòng nào, ngày nào, ai gửi.

**Câu hỏi cho SME chỉ nằm ở một chỗ:** `rules/F1_Per_Gate_Open_Questions.md`, vòng mới nhất ở cuối, mỗi câu một ID cố định (`R4-Q1`…). Tài liệu khác trỏ theo ID, **không** giữ danh sách song song — hai danh sách chắc chắn sẽ lệch.

**Mỗi chỗ suy đoán mang dấu `[ASSUMPTION: R4-Qn]` ngay tại điểm quyết định** — trong code lẫn trong doc. Nhờ vậy "liệt kê mọi giả định chưa được xác nhận" là một lệnh `grep`:

```bash
grep -rn "ASSUMPTION: R4" docs packages apps
npm run verify:readiness   # fail nếu dấu trỏ tới câu hỏi không tồn tại, hoặc câu hỏi không được gắn dấu
```
