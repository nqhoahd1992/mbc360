# Bốn quyết định thiết kế phải chốt trước khi build tiếp (sau Vòng 3)

**Ngày:** 2026-08-09
**Chặn:** D1 (sign-off 3 chữ ký theo từng gate) · E3(a) (Gate 10–11 theo từng thị trường) · Tranche 1 (thu thập dữ liệu Gate 1–2) · tranche claims (B7)

Bốn quyết định dưới đây **quyết định shape dữ liệu**. Chọn sai thì phải migrate lại, không vá được. Ba trong bốn là quyết định kỹ thuật của ta; quyết định #1 có một vế nghiệp vụ cần SME xác nhận.

Mọi mô tả "hiện trạng" đều đọc trực tiếp từ `schema.prisma`, `types/index.ts` và `config/registers.ts` — không phải trí nhớ.

---

## Quyết định 1 — Chữ ký gate gắn vào `(project, gate)` hay `(project, gate, market)`?

**Vì sao phải chốt trước:** D1 và E3(a) giao nhau đúng ở đây. Nếu build D1 với khoá 2 thành phần rồi sau đó E3(a) biến Gate 10–11 thành per-market, ta phải migrate bảng chữ ký — thứ mang chữ ký điện tử, tức dữ liệu **không được phép mất hay bị viết lại**.

**Hiện trạng đã kiểm:**

| Bảng | Khoá | Ghi chú |
|---|---|---|
| `gate_records` | `@@unique([projectId, gateId])` | Không có chiều thị trường |
| `market_tracks` | `@@unique([projectId, market])` | Đã có `pifStatus`, `regulatoryStatus`, `claimsApproval`, `launchApproval`, `formulaVersionId` |
| `sign_offs` | gắn vào `phaseClosureId` | **Cấp phase**, không phải cấp gate. Đã có `signedByUserId` + `signedAt` + `invalidatedByEventId` |

Nghĩa là D1 cần **bảng mới**, không mở rộng được `sign_offs` hiện tại — nó đang treo dưới `PhaseClosure`.

**Ba phương án:**

| | Khoá | Ưu | Nhược |
|---|---|---|---|
| **A** | `(project, gate, role)` | Đơn giản nhất; đúng nguyên văn D1 | Gate 10–11 chỉ có một bộ chữ ký cho mọi thị trường — mâu thuẫn E3(a) *"one approved market must not cause all markets to appear ready"* |
| **B** | `(project, gate, market, role)` cho mọi gate | Đồng nhất | Gate 1–9 không có chiều thị trường; phải bịa một market giả (`'*'`) cho 9/12 gate |
| **C** | `(project, gate, market?, role)` — `market` **nullable**, chỉ dùng ở Gate 10–11 | Khớp đúng mô hình nghiệp vụ: Gate 1–9 một luồng, Gate 10–12 per-market (chính là quyết định A1 đã xác nhận từ lâu) | Cần unique index có điều kiện; hai nhánh code khi đọc |

**Khuyến nghị: C [ASSUMPTION: R4-Q15].** Cột `market` nullable, `@@unique([projectId, gateId, market, role])` — Postgres coi mỗi `NULL` là khác nhau nên cần thêm partial unique index cho nhánh `market IS NULL`. Chi phí thêm cột nullable ngay bây giờ gần bằng không; chi phí thêm nó sau khi đã có chữ ký thật là một migration trên dữ liệu không được phép sai.

**Vế nghiệp vụ cần SME xác nhận — chưa nằm trong Vòng 4, nên bổ sung:**

D1 nói mỗi gate cần Prepared / Reviewed / Approved. E3(a) nói mỗi thị trường có launch approval riêng. Kết hợp lại thì Gate 10 và 11 cần **3 chữ ký cho mỗi thị trường** — với 4 thị trường là 24 chữ ký chỉ cho hai gate. Điều đó có thể đúng (mỗi thị trường là một quyết định pháp lý độc lập), nhưng không ai nói ra.

Còn một hệ quả nữa chưa được xét: **sign-off cấp phase**. Gate 10 và 11 nằm trong Phase 4, mà `phase_closures` không có chiều thị trường. Nếu Gate 10–11 thành per-market thì Phase 4 đóng khi nào — khi mọi thị trường xong, hay đóng riêng theo từng thị trường?

→ Đã thêm vào Vòng 4 là **câu 18** (`R4-Q15`).

---

## Quyết định 2 — Thuộc tính "nhạy cảm vi sinh" lưu ở đâu?

**Dùng cho 2 trigger:** `sg05-preservative` (Gate 5) và `sg09-pet` (Gate 9). Một trường, hai gate — nên chỉ mô hình hoá **một lần**.

**Ràng buộc từ chính lời SME:**

> *"water-containing, water-available, multi-use or otherwise microbiologically susceptible products. N/A may be used for genuinely anhydrous, self-preserving, sterile or single-use products **with documented rationale**."*

Hai điều rút ra: **(a)** không suy được hoàn toàn từ BOM — sản phẩm khan đựng hũ dùng nhiều lần, tay ướt chọc vào, vẫn nhạy cảm; **(b)** chữ *"documented rationale"* nghĩa là phải có chỗ cho một con người ghi phán định.

**Khuyến nghị:** một nhóm trường trên công thức, không phải register mới:

```
Microbiological susceptibility: Susceptible | Anhydrous | Self-preserving | Sterile | Single-use
Rationale: <bắt buộc khi khác 'Susceptible'>
```

5 giá trị lấy gần như nguyên văn từ câu của SME, nên rủi ro diễn giải thấp.

**Gợi ý mặc định từ BOM, không tự ghi đè:** `BomLine.inciName` đã có; một dòng INCI là `Aqua`/`Water` thì gợi ý `Susceptible`. Nhưng người vẫn phải xác nhận, và nếu họ chọn khác thì phán định của người thắng — ca "hũ dùng nhiều lần" chính là ca máy không đọc ra được.

**Đặt ở đâu:** ứng viên tốt nhất là **Phase 2 → requirement `formulationDesign`** (đã tồn tại, gate 05), vì `RequirementItem` đã có sẵn `status` + `notes` + `owner`. Nhưng `status` là `WorkStatus` (Not Started/In Progress/Completed…), **không** phải 5 giá trị trên — nên hoặc thêm trường riêng vào `ProjectData`, hoặc chấp nhận lưu giá trị trong `notes` (không kiểm soát được, không nên).

→ **Đề xuất: thêm `FormulaProperties` vào `ProjectData`**, cùng kiểu singleton như `CostingInputs` đang làm. Một object nhỏ, mở rộng được khi trigger sau cần thêm thuộc tính công thức.

---

## Quyết định 3 — Phân loại claim (B7) gắn vào đâu?

**Đây là quyết định mà việc đọc code làm đổi khuyến nghị.** Ban đầu tôi định đề xuất "thêm dropdown cạnh mỗi dòng `claimAreas`". Sai — vì trong app **đã có hai register về claim**, và một trong hai đã chứa phần lớn thứ B7 yêu cầu:

| Register | Gate | Cột hiện có |
|---|---|---|
| `claimEvidenceTraceability` | 10/11 | `claimId` · `approvedWording` · `mechanism` · `evidenceGrade` · `supportingEvidence` · `status` (Supported/Pending) · `approvedByDate` |
| `skuClaimsPifRegister` | **03**/10 | `productSku` · `market` · `claimWording` · **`claimCategory`** · `evidenceType` · `evidenceSource` · `evidenceLink` · `approvedLimitation` · `pifLink` · `status` · `owner` · `notes` |

Đối chiếu với 9 thuộc tính B7 yêu cầu:

| B7 yêu cầu | Đã có ở đâu |
|---|---|
| exact proposed wording | `skuClaimsPifRegister.claimWording` |
| applicable SKU | `skuClaimsPifRegister.productSku` |
| applicable market | `skuClaimsPifRegister.market` |
| evidence required | `skuClaimsPifRegister.evidenceType` |
| evidence status | `skuClaimsPifRegister.status` |
| approved wording | `claimEvidenceTraceability.approvedWording` |
| limitations / mandatory qualifiers | `skuClaimsPifRegister.approvedLimitation` |
| **intended channel** | ❌ chưa có |
| **Regulatory review required Y/N** | ❌ chưa có |

Tức B7 phần lớn là **mở rộng cái đã có**, không phải xây mới. Chỉ thiếu 2 thuộc tính, cộng 2 dropdown phân loại.

**Nhưng lộ ra một câu hỏi mô hình hoá thật:** claim đang tồn tại ở **hai** register. `claimEvidenceTraceability` giữ `claimId` và `status` — đó là cái mà Published Information link tới. `skuClaimsPifRegister` giữ cách claim được **dùng** trên từng SKU × thị trường. Vậy phân loại (category + risk) thuộc về cái nào?

**Khuyến nghị:** phân loại thuộc về **bản thân claim**, không phải cách dùng nó — một claim "borderline therapeutic" thì borderline ở mọi SKU. Nên:

- `claimEvidenceTraceability` nhận thêm **`claimCategory`** (10 giá trị), **`claimRisk`** (5 giá trị), **`regulatoryReviewRequired`** (Y/N)
- `skuClaimsPifRegister` nhận thêm **`intendedChannel`**; các cột còn lại giữ nguyên vì đã đúng chỗ (SKU/thị trường/kênh là chuyện *sử dụng*)

**Hệ quả phải chấp nhận:** `claimEvidenceTraceability` hiện gắn gate `10/11`, mà B7 là yêu cầu của **Gate 3**. Phải mở thành `03/10/11`. Điều này cũng đổi lúc register bị khoá theo luật B4 — nó sẽ chỉ khoá khi **cả ba** gate đã pass, tức mở lâu hơn hiện tại. Đó là đúng: phân loại claim phải sửa được suốt giai đoạn phát triển.

**Cần SME xác nhận [ASSUMPTION: R4-Q16]:** `skuClaimsPifRegister.claimCategory` đã tồn tại từ trước, nhưng ta không biết nó vốn dùng để ghi gì — có phải chính là "Claim category" mà B7 nói không, hay là một khái niệm khác. Nếu trùng thì đừng tạo cột thứ hai cùng nghĩa. → Đã thêm vào Vòng 4 là **câu 19** (`R4-Q16`).

---

## Quyết định 4 — Bảng requirements của Phase 1 (B6) dùng chung shape hay shape riêng?

**Hiện trạng:** `RequirementItem` = `gate` · `requirement` · `minimumRequirement` · `rationale` · `owner` · `status` · `evidenceLink` · `notes`. Phase 2/3/4 đều dùng shape này; Phase 1 hiện không có requirement nào.

**B6 yêu cầu:** bảng có `category` · `requirement` · `priority` · `owner` · `notes`, với 16 dòng (Must-have · Must-not-have · Intended claims · Claims not to pursue · pH · sensory · packaging · cost · timeline · markets · regulatory constraints · user constraints · benchmark · technical risks · exclusions · assumptions).

Đối chiếu: `owner`, `notes`, `requirement` đã có. Thiếu **`category`** và **`priority`**. Thừa (không có nghĩa ở Phase 1): `minimumRequirement`, `rationale`, `evidenceLink`.

**Hai phương án:**

| | Cách | Ưu | Nhược |
|---|---|---|---|
| **A** | Thêm `category?` + `priority?` optional vào `RequirementItem` dùng chung | Một type, một bảng DB, `RequirementTable` không phải fork; Phase 2–4 bỏ trống 2 cột mới | Type mang 2 trường chỉ Phase 1 dùng; cột hiển thị phải điều khiển theo config |
| **B** | Type + bảng riêng cho Phase 1 | Sạch về ngữ nghĩa | Fork `RequirementTable`, thêm endpoint, thêm bảng Prisma, thêm nhánh trong `project-mapper` — cho một khác biệt 2 cột |

**Khuyến nghị: A.** Repo này đã có tiền lệ rõ ràng: `RegisterConfig` điều khiển cột hiển thị theo config chứ không fork component, và CLAUDE.md nêu thành nguyên tắc — *"thêm entry config, đừng viết page/table mới trừ khi shape thật sự không vừa"*. Khác biệt 2 cột optional chưa đủ để gọi là không vừa.

`RequirementSectionConfig` cần thêm một cờ kiểu `columns?: string[]` để mỗi section tự khai cột nào hiện — đây là phần đáng làm nhất, vì nó cũng gỡ được chuyện Phase 2–4 phải nhìn thấy 2 cột trống.

---

## Tóm tắt

| # | Quyết định | Khuyến nghị | Cần SME? |
|---|---|---|---|
| 1 | Khoá của chữ ký gate | `(project, gate, market?, role)` — market nullable | **Có** — số lượng chữ ký ở Gate 10/11, và Phase 4 đóng theo thị trường hay không |
| 2 | Nơi lưu "nhạy cảm vi sinh" | `FormulaProperties` trên `ProjectData`, gợi ý từ BOM nhưng người chốt | Không (giá trị lấy nguyên văn từ A3) |
| 3 | Nơi lưu phân loại claim | Category/Risk/RegReview → `claimEvidenceTraceability`; Channel → `skuClaimsPifRegister` | **Có** — `claimCategory` sẵn có nghĩa là gì |
| 4 | Shape requirements Phase 1 | Mở rộng type dùng chung, cột do config điều khiển | Không |

**Hai câu mới đã được thêm vào Vòng 4** (`R4-Q15`, `R4-Q16` — gửi đi dưới số **18** và **19**), nên bản gửi nay có 19 câu thay vì 17:

1. Ở Gate 10 và 11, bộ Prepared/Reviewed/Approved là **mỗi thị trường một bộ**, hay một bộ chung cho cả gate? Và Phase 4 đóng khi mọi thị trường xong, hay đóng riêng theo từng thị trường?
2. Cột `Claim category` sẵn có trên SKU Claims / PIF Register vốn dùng để ghi gì — có phải chính là "Claim category" trong đáp án B7 không?

**Quyết định 2 và 4 không cần SME** — chúng thuần là chọn chỗ lưu, còn giá trị và nội dung đều lấy nguyên văn từ đáp án A3 và B6. Có thể build ngay.
