# F1/C7 — Danh mục trigger cho các item Conditional

**Ngày:** 2026-08-09
**Nguồn luật:** `docs/rounds/2026-08-07-sme-reply-round3.txt` phần **A3** (14 trigger) và **A2** (thêm 1 trigger cho Gate 6) — ghi lại đầy đủ trong `Business_Rules_Confirmation_{EN,VN}.md` → Phụ lục 2.
**Nguồn hiện trạng:** trích trực tiếp từ `packages/shared/src/config/gateReadiness.ts`, `config/phases.ts`, `config/registers.ts`, `types/index.ts` — không phải trí nhớ.

**File này có hai công dụng:** (1) danh mục thiết kế — trigger nào đọc dữ liệu nào, còn thiếu gì; (2) **bộ test case** để kiểm tính đúng đắn của phần mềm — mỗi trigger có kịch bản bật/tắt và kết quả mong đợi ở mục ["Bộ test case"](#bộ-test-case) cuối file. Khi cài xong một trigger, chạy đúng cặp kịch bản của nó rồi tick vào checklist.

---

## Vì sao có file này

Luật C7 định nghĩa **Conditional** là *"hard-blocks only when its defined trigger applies"*. Tới Vòng 3, SME chưa đưa điều kiện trigger cho item nào, nên engine buộc phải coi mọi item Conditional là advisory — không bao giờ chặn. Vòng 3 đã cấp **đủ 15 điều kiện**, và engine cũng đã được sửa để một Conditional có trigger đang active thì chặn thật (2026-08-07).

Nhưng "có luật" ≠ "cài được". Mỗi trigger cần **dữ liệu có cấu trúc** để máy đánh giá, và phần lớn dữ liệu đó app chưa thu thập. File này liệt kê từng trigger: tên đề xuất, đọc từ mục UI nào, hiện thiếu gì.

**Trạng thái tổng (cập nhật 09/08): 15 điều kiện được cấp · 3 trigger đã cài (`skincareForTwo`, `humanStudyPlanned`, `newOrRepositionedProject`) phủ 5 item · 9 item còn chờ.**

> **Một trigger bị chặn vì lý do kiến trúc, không phải vì thiếu dữ liệu:** `openChangeControl` cần đọc bản ghi Change Control, mà **`ChangeRecord` không nằm trong `ProjectData`** — nó là một slice riêng ở store và trong envelope của API, vì trang Change Control hiển thị xuyên nhiều dự án. Engine readiness chỉ nhận đúng `ProjectData`. Chép `changes` vào `ProjectData` để một trigger chạy được sẽ tạo bản sao thứ hai của một danh sách đã có chủ — đúng kiểu trùng lặp rồi sẽ lệch. Làm đúng thì phải hoặc chuyển hẳn `changes` vào `ProjectData`, hoặc cho engine nhận thêm một tham số; cả hai đều lớn hơn bản thân item này. Tier của `sg12-change-links` đã sửa đúng theo A1 (Supporting → Conditional), hành vi giữ nguyên advisory như trước.

Cách một trigger được cài (3 chỗ, không phải sửa engine):

```
1. packages/shared/src/config/gateReadiness.ts  → thêm giá trị vào `ReadinessTrigger`
2. packages/shared/src/utils/gateProgress.ts    → thêm nhánh trong `isReadinessTriggerActive()`
3. packages/shared/src/config/gateReadiness.ts  → `TRIGGER_INACTIVE_EXPLANATIONS` + gắn `trigger:` vào item
```

---

## Bảng tổng hợp

`UI` = số mục giao diện mà trigger phải đọc. `Nguồn` = **(a)** user nhập mới · **(b)** suy ra từ dữ liệu đã có · **(c)** dữ liệu tham chiếu do Regulatory bảo trì.

| # | Trigger đề xuất | Item áp dụng | Gate | UI | Nguồn | Trạng thái |
|---|---|---|---|---|---|---|
| 1 | `skincareForTwo` | `sg04-pb-screen`, `sg07-caution-closed`, `sg07-maternal-infant` | 4, 7 | 1 | b | ✅ **đã cài** |
| 2 | `openChangeControl` | `sg12-change-links` | 12 | 1 | b | ⛔ **bị chặn** — `changes` không nằm trong `ProjectData` (xem dưới); tier đã sửa Supporting → Conditional |
| 3 | `humanStudyPlanned` | `sg08-human-study` | 8 | 1 | b | ✅ **đã cài** 09/08 — đọc `studyProtocolSetup.plannedValue` |
| 4 | `postMarketPerformanceScope` | `sg12-performance` | 12 | 1 | b | 🟢 cài được ngay |
| 5 | `microbiologicallySusceptible` | `sg05-preservative`, `sg09-pet` | 5, 9 | 2 | a + b | 🟡 1 ô mới, dùng cho 2 item |
| 6 | `postMarketSignal` | `sg12-feedback` | 12 | 3 | a + b | 🟡 thiếu mốc review theo lịch |
| 7 | `pvPmsRequired` | `sg12-pv-pms` | 12 | 3–4 | a + b + c | 🟡 phần lớn suy được |
| 8 | `newOrRepositionedProject` | `sg03-benchmark` | 3 | 3 | a | ✅ **đã cài** 09/08 — Tranche 1 đã cấp đủ 3 vế |
| 9 | `scaleUpOrProcessChange` | `sg09-scaleup` | 9 | 3 | a + b | 🟠 chờ Tranche 1 (B2) |
| 10 | `rmCompositionRisk` | `sg04-allergen` | 4 | 1 | a | 🟠 cần cột mới |
| 11 | `claimNeedsRegulatoryReview` | `sg03-reg-claims` | 3 | 2 | a + c | 🔴 chờ B7 + Claims Library |
| 12 | `claimNeedsPerformanceEvidence` | `sg10-performance-evidence` | 10 | 1 | a | 🔴 chờ B7 |
| 13 | `marketPackRequirement` | `sg06-market-pack` | 6 | 2 | a/c | 🔴 chờ F10 |

Hai item Conditional/Supporting **không** có trigger, cố ý:

| Item | Gate | Vì sao |
|---|---|---|
| `sg05-costing` | 5 | SME giữ ở **Supporting**: *"may remain Supporting, although the accountable project owner may still place the project on Hold"* — cơ chế là nút Hold do người bấm, không phải trigger. |
| `sg03-npd-target-product-progress` | 3 | Không phải item của SME — đến từ NPD Front-End Roadmap (workbook v2), nên A3 không đề cập. |

---

## Chi tiết từng trigger

### 1. `skincareForTwo` — ✅ đã cài

> **Luật (A3):** *"Mandatory when Pregnancy, Breastfeeding or Postpartum is selected."*

| | |
|---|---|
| **Item** | `sg04-pb-screen` (G4), `sg07-caution-closed` (G7), `sg07-maternal-infant` (G7) |
| **Đọc từ UI** | **1 mục** — Phase 1 → checklist **Target Users** (gate 02), các option `Pregnancy` / `Breastfeeding` / `Postpartum` |
| **Code** | `skincareForTwoTriggers()` trong `gateProgress.ts` — vốn có từ luật C1 |

Đây là ngoại lệ may mắn duy nhất: dữ liệu đã tồn tại từ trước nên cài được ngay. **Đừng lấy nó làm mẫu ước lượng cho 12 cái còn lại.**

Ngưỡng chặn cố ý khác nhau giữa hai gate: Gate 4 chỉ chặn khi có dòng bị đẩy lên `"Needs Safety Review"`/`"Needs Regulatory Review"`; Gate 7 đòi **cả 12 dòng** của PB Caution Limits về `"Not present"` hoặc `"Within limit - evidence linked"`. Gate 4 sàng lọc, Gate 7 đóng hồ sơ.

⚠️ **Còn thiếu (E1, chờ Vòng 2 A2):** sản phẩm **chỉ cho trẻ sơ sinh** (chọn `Infant 0+`, không chọn maternal) hiện không kích hoạt trigger này, mà Infant/Baby Safety pathway thì chưa tồn tại → không có đánh giá nào. Đã ghi thành câu hỏi mở ở `F1_Per_Gate_Open_Questions.md` → Round 4 Q2.

---

### 2. `openChangeControl` — 🟢 cài được ngay, không cần UI mới

> **Luật (A3):** *"Mandatory where a Change Control record has been opened or should be opened because of the post-market finding."*

| | |
|---|---|
| **Item** | `sg12-change-links` (G12) |
| **Đọc từ UI** | **1 mục** — trang **Change Control** (`/change-control`); không cần nhập gì thêm ở dự án |
| **Dữ liệu** | `ProjectData.changes` + `isChangeOpen()` (đã có, luật F9) |

**Việc phải làm trước:** A1 đổi tier item này từ **Supporting → Conditional**. Chưa đổi trong code.

Vế *"or **should be** opened"* không máy nào đánh giá được — đó là phán định của con người. **[ASSUMPTION: R4-Q4]** Đề xuất: trigger chỉ đọc vế thứ nhất (có record đang mở), còn vế thứ hai để item hiện ra như một lời nhắc khi Gate 12 có ghi nhận post-market finding.

`ChangeRecord` đã có sẵn `riskLevel` và `affectedArea` — **chính là hai trường E3(b) cần** cho phân loại impact ở Gate 11. Cài trigger này xong thì E3(b) gần như có sẵn nguyên liệu.

---

### 3. `humanStudyPlanned` — 🟢 cài được ngay, cần chốt tín hiệu

> **Luật (A3):** *"Mandatory before any internal or external study involving human participants, volunteers, consumer testing, patch testing, in-use trials, image collection, questionnaires or other identifiable participant data."*

| | |
|---|---|
| **Item** | `sg08-human-study` (G8) |
| **Đọc từ UI** | **1–3 mục**, tuỳ tín hiệu chọn (xem dưới) |

Ba nguồn ứng cử, đều đã tồn tại:

| Nguồn | Ưu | Nhược |
|---|---|---|
| Register **Study Protocol Setup** có dòng được điền | Gần nghĩa "có kế hoạch nghiên cứu" nhất | `mode: 'fixed'` — rows seed sẵn, phải kiểm cột `plannedValue` chứ không phải "có row" |
| `ProjectData.studyApprovals` có bản ghi | Rõ ràng | Chỉ xuất hiện **sau** khi study đã tới bước duyệt — quá muộn so với *"before any study"* |
| Phase 3 → requirement **humanStudy** | Đúng gate | Chính là cái item này đang check, dùng làm trigger sẽ thành vòng lặp |

**Đề xuất [ASSUMPTION: R4-Q5]:** dùng nguồn 1 (`studyProtocolSetup` có `plannedValue` được điền), vì luật nói *"before"* — phải bắt được ý định làm study từ sớm, không đợi tới lúc duyệt.

---

### 4. `postMarketPerformanceScope` — 🟢 cài được ngay

> **Luật (A3):** *"Mandatory where product efficacy, consumer experience, product failure or claim performance is part of the post-market review scope."*

| | |
|---|---|
| **Item** | `sg12-performance` (G12) |
| **Đọc từ UI** | **1 mục** — Phase 4 → checklist **Post-Market / PV-PMS Feedback Sources** (gate 12) |
| **Option khớp** `[ASSUMPTION: R4-Q6]` | `Formula issue` · `Quality issue` · `Product optimisation` · `Claim question` |

Checklist này đã có sẵn 16 option và khớp gần như một-một với ngôn ngữ của SME. Chỉ cần đổi tier Supporting → Conditional cho nhất quán **[ASSUMPTION: R4-Q12]** (A1 không nêu item này, nên đây là suy luận — nếu giữ Supporting thì trigger vô nghĩa vì Supporting không bao giờ chặn; **cần SME xác nhận**).

---

### 5. `microbiologicallySusceptible` — 🟡 một ô mới, phục vụ 2 item

> **Luật (A3), Gate 5:** *"Mandatory for water-containing, water-available, multi-use or otherwise microbiologically susceptible products. N/A may be used for genuinely anhydrous, self-preserving, sterile or single-use products **with documented rationale**."*
> **Gate 9:** *"Mandatory for microbiologically susceptible products requiring a preservation system."*

| | |
|---|---|
| **Item** | `sg05-preservative` (G5), `sg09-pet` (G9) — **cùng một thuộc tính, hai trigger** |
| **Đọc từ UI** | **2 mục** — (b) Formula BOM để suy gợi ý, (a) một ô phán định + lý do |

Đây là **loại lai**, và là ví dụ điển hình vì sao "suy ra được" không có nghĩa là "khỏi cần UI":

- **Suy được:** `BomLine.inciName` đã tồn tại → một dòng BOM có INCI là `Aqua`/`Water` là biết công thức chứa nước.
- **Không suy được:** *"water-available, multi-use"* — sản phẩm **khan nhưng đựng trong hũ, dùng nhiều lần, tay ướt chọc vào** vẫn nhạy cảm vi sinh. Máy không đọc ra điều đó từ BOM. Chính vì vậy SME viết dài như trên chứ không viết gọn "contains water".
- **Bắt buộc có UI:** SME yêu cầu **"documented rationale"** cho trường hợp N/A — đó là dấu hiệu rõ ràng rằng phải có chỗ cho một con người ghi phán định.

**Thiết kế đề xuất [ASSUMPTION: R4-Q13]:** một trường trên công thức, ví dụ `Microbiological susceptibility` = `Susceptible` / `Anhydrous` / `Self-preserving` / `Sterile` / `Single-use`, kèm ô lý do bắt buộc khi chọn khác `Susceptible`. Mặc định **gợi ý** từ BOM (có Aqua → `Susceptible`) nhưng người vẫn phải xác nhận.

**Nơi đặt:** ứng cử viên là Phase 2 → requirement `formulationDesign` (đã tồn tại, gate 05), tránh phải thêm màn hình mới.

---

### 6. `postMarketSignal` — 🟡 thiếu mốc review theo lịch

> **Luật (A3):** *"Mandatory when the scheduled post-launch review milestone is reached, or when a complaint, customer issue, distributor request, claim challenge or recurring performance concern is recorded."*
> **A1 bổ sung:** Supporting cho review vòng đời định kỳ, **Conditional khi dự án đã launch và tới kỳ post-market review theo lịch.**

| | |
|---|---|
| **Item** | `sg12-feedback` (G12) |
| **Đọc từ UI** | **3 mục** |

| Vế của luật | Đọc từ | Có chưa |
|---|---|---|
| complaint / customer issue / distributor request / claim challenge `[ASSUMPTION: R4-Q6]` | checklist **Post-Market Sources**: `Complaint` · `Consumer feedback` · `Distributor feedback` · `Claim question` | ✅ có |
| "dự án đã launch" | `MarketTrack.launchApproval` = Approved (+ `launchApprovedDate`) | ✅ có |
| "scheduled post-launch review milestone is reached" | — | ❌ **không có** mốc/lịch nào trong data model |

**Cần thêm [ASSUMPTION: R4-Q10]:** một trường ngày cho kỳ review sau launch. Rẻ nhất là suy từ `launchApprovedDate` + một khoảng cố định (ví dụ 6 hoặc 12 tháng), nhưng khoảng đó **SME chưa nói** → nên hỏi thay vì tự đặt.

---

### 7. `pvPmsRequired` — 🟡 phần lớn suy được

> **Luật (A3):** *"Mandatory where required by product category, market, company policy, safety signal, vulnerable-user population, complaint trend or scheduled surveillance plan."*

| | |
|---|---|
| **Item** | `sg12-pv-pms` (G12) |
| **Đọc từ UI** | **3–4 mục** |

| Vế của luật | Đọc từ | Có chưa |
|---|---|---|
| safety signal / complaint trend `[ASSUMPTION: R4-Q6]` | checklist **Post-Market Sources**: `Adverse event / PV signal` · `PMS trend` · `Complaint` | ✅ có |
| vulnerable-user population | cờ vulnerable-user tường minh của **B5** | 🟠 chờ Tranche 1 |
| product category | checklist **Product Type** (gate 02) — nhưng cần biết *loại nào* thì bắt buộc | 🟠 cần danh sách từ SME |
| market / company policy / surveillance plan `[ASSUMPTION: R4-Q11]` | dữ liệu tham chiếu, Regulatory bảo trì | 🔴 chưa có |

Đây là trigger "nhiều vế" nhất. Có thể cài **từng phần**: bật theo safety signal + complaint trend trước (đã có dữ liệu), rồi bổ sung vế vulnerable-user khi B5 xong. Một trigger OR nhiều vế thì cài dần vẫn đúng — chỉ là chưa bắt hết trường hợp.

---

### 8. `newOrRepositionedProject` — 🟠 chờ Tranche 1

> **Luật (A3):** *"Mandatory where the project is a new product, claim extension, repositioning project, customer/distributor-led request, or where a benchmark/reference product is named. **Not** mandatory for a purely administrative change."*

| | |
|---|---|
| **Item** | `sg03-benchmark` (G3) |
| **Đọc từ UI** | **2 mục**, cả hai đều đang được xây ở Tranche 1 |

| Vế của luật | Đọc từ | Có chưa |
|---|---|---|
| new product / claim extension / repositioning / administrative change `[ASSUMPTION: R4-Q7]` | trường bổ trợ của Key Gate Check **"Initial product scope defined"** (**B2**) — nó ghi đúng *"whether it is new development, reformulation, claim change, packaging change, market extension or lifecycle improvement"* | 🟠 Tranche 1 |
| customer / distributor-led request | trường **Request Origin / Source** (**B1**), option `Customer request` · `Distributor request` | 🟠 Tranche 1 |
| "a benchmark/reference product is named" | dòng **Benchmark or reference product** trong bảng requirements Phase 1 (**B6**) | 🟠 Tranche 1 |

⚠️ **Đừng nhầm với checklist `Product Type` đã có** (gate 02): nó là **dạng bào chế** — Cream, Lotion, Balm, Serum, Oil, Wash… — hoàn toàn không nói gì về *dự án này là mới hay là sửa cái cũ*. Đây đúng là ví dụ đã nêu ở tình huống 2: hôm nay hệ thống đối xử "serum mới hoàn toàn" và "đổi font chữ trên nhãn SKU cũ" **giống hệt nhau**, vì không có trường nào phân biệt.

**Điểm đáng chú ý:** cả 3 vế đều được B1/B2/B6 cấp — nghĩa là **Tranche 1 xong thì trigger này cài được luôn**, không cần thêm gì.

---

### 9. `scaleUpOrProcessChange` — 🟠 chờ Tranche 1

> **Luật (A3):** *"Mandatory for new formulas, major reformulations, new manufacturing processes, manufacturing-site transfers, meaningful equipment/process changes, or products with identified scale-up risk."*

| | |
|---|---|
| **Item** | `sg09-scaleup` (G9) |
| **Đọc từ UI** | **3 mục** |

| Vế của luật | Đọc từ | Có chưa |
|---|---|---|
| new formula / major reformulation `[ASSUMPTION: R4-Q8]` | `ProjectData.formulaVersions` + `MAJOR_CHANGE_CRITERIA` (luật F5 — đã phân loại Major/Minor sẵn) | ✅ có |
| new product vs lifecycle change | trường loại dự án của **B2** (dùng chung với trigger #8) | 🟠 Tranche 1 |
| site transfer / equipment / process change | `ChangeRecord.affectedArea` trên trang Change Control | ✅ có (cần chốt giá trị nào tính) |
| "identified scale-up risk" | phán định của con người | ❌ không có chỗ ghi |

Vế cuối là phán định — hoặc thêm một ô, hoặc chấp nhận trigger chỉ phủ 3 vế đầu.

---

### 10. `rmCompositionRisk` — 🟠 cần cột mới

> **Luật (A3):** *"Mandatory where the ingredient or raw material contains fragrance, essential oils, botanical extracts, proteins, known allergens, residual solvents, heavy-metal risk, microbiological risk, restricted impurities, processing residues or variable natural-source composition."*

| | |
|---|---|
| **Item** | `sg04-allergen` (G4) |
| **Đọc từ UI** | **1 mục** — register **Supplier & RM Evidence** |

Cột hiện có: `rmCode, inciName, approvedForUse, supplier, grade, sdsLink, coaLink, tdsLink, allergenStatement, impurities, microInfo, originProof, regulatoryStatus, owner, status, notes`.

`allergenStatement` / `impurities` / `microInfo` **là free text** — không đánh giá tự động được. Đó chính là lý do check hiện tại (`registerRowsComplete`) chỉ khẳng định *"đã điền gì đó"*, không phán xét nội dung.

**Cần thêm:** một cột multi-select với đúng 11 giá trị SME liệt kê. Suy từ INCI (tên chứa "oil"/"extract"/"parfum") chỉ là heuristic — **không đủ tin cậy để hard-block**, và cũng không bắt được "heavy-metal risk" hay "variable natural-source composition".

**Lưu ý chi phí [ASSUMPTION: R4-Q14]:** đây là cột phải điền cho **từng nguyên liệu, từng dự án** — đắt nhất trong danh sách này. Cân nhắc để nó là thuộc tính của **nguyên liệu** (dùng lại giữa các dự án) thay vì của dòng evidence trong một dự án; nhưng master data nguyên liệu nằm ở Cosmetri và MBc360 chỉ đọc (luật A3 gốc), nên cần quyết định lưu ở đâu.

---

### 11. `claimNeedsRegulatoryReview` — 🔴 chờ B7 + Claims Library

> **Luật (C1):** review bắt buộc khi *category = Borderline / therapeutic-adjacent · category = Therapeutic — not permitted · risk = High · wording không nằm trong approved Claims Library · claim khác với wording đã duyệt trước đó · thị trường áp hạn chế cụ thể · claim liên quan pregnancy, breastfeeding, infant use, disease, treatment, prevention, healing hoặc medical endorsement.*

| | |
|---|---|
| **Item** | `sg03-reg-claims` (G3) |
| **Đọc từ UI** | **2 mục** |

| Vế | Đọc từ | Có chưa |
|---|---|---|
| category / risk | 2 dropdown mới **theo từng claim** của **B7** (Claim category 10 giá trị, Claim risk 5 giá trị) | 🔴 chưa xây |
| "not in the approved Claims Library" / "varies from previously approved wording" | nội dung **Claims Library** (F11) | 🔴 chưa có nội dung |
| pregnancy / breastfeeding / infant-related | có thể suy từ checklist **Target Users** hoặc từ chính wording của claim | 🟡 một phần |
| market imposes a specific restriction | Market Dossier Profiles (F10) | 🔴 chưa có |

Đây là trigger phụ thuộc nhiều nhất. Nhưng B7 cấp hai vế đầu và đó là hai vế mạnh nhất — cài được B7 là trigger này chạy được phần lớn.

**Một giá trị C1 không nói tới [ASSUMPTION: R4-Q9]:** Claim risk của B7 có 5 giá trị, trong đó `Pending classification` không được C1 nhắc. Chúng tôi định coi nó là **đã trigger** — chưa phân loại thì chưa biết có rủi ro hay không, nên phải review. Nếu SME trả lời ngược lại, sửa nhánh `claimNeedsRegulatoryReview` trong `isReadinessTriggerActive()`.

---

### 12. `claimNeedsPerformanceEvidence` — 🔴 chờ B7

> **Luật (A3):** *"Mandatory where any external claim depends on product-level efficacy, performance, sensory, clinical, instrumental, in vitro, in vivo, consumer-use or comparative evidence."*

| | |
|---|---|
| **Item** | `sg10-performance-evidence` (G10) |
| **Đọc từ UI** | **1 mục** — trường **evidence required** trong bộ 9 thuộc tính per-claim của **B7** |

B7 yêu cầu mỗi claim ghi *"evidence required"* và *"evidence status"* — đúng thứ trigger này cần. Không cần gì thêm ngoài B7.

---

### 13. `marketPackRequirement` — 🔴 chờ F10

> **Luật (A2):** bắt buộc khi thị trường đã chọn có yêu cầu ảnh hưởng tới *language · mandatory warnings · ingredient declaration · responsible-party details · notification or registration numbers · pack size · tamper evidence · barcode or traceability · recycling or environmental markings · primary or secondary packaging information.*
> *"Where no market-specific requirement applies, the user should **record N/A with rationale**."*

| | |
|---|---|
| **Item** | `sg06-market-pack` (G6) |
| **Đọc từ UI** | **2 mục** — `ProjectIdentity.markets` (đã có) × thư viện yêu cầu bao bì theo thị trường (chưa có) |

Đây là trigger **nguồn (c)** điển hình: người làm dự án **không nhập gì thêm**. Thư viện thuộc Market Dossier Profiles (F10), Regulatory bảo trì một lần cho cả công ty; trigger chỉ việc tra `markets` của dự án vào thư viện đó.

Vì SME đòi *"record N/A with rationale"*, vẫn cần một ô lý do khi không có yêu cầu nào áp dụng — giống hệt trường hợp `microbiologicallySusceptible`.

---

## Thứ tự cài đề xuất

| Đợt | Trigger | Vì sao xếp ở đây |
|---|---|---|
| **1** | `openChangeControl`, `postMarketPerformanceScope`, `humanStudyPlanned` | Không cần UI mới. Chỉ phải retier 2 item Supporting → Conditional và chốt 1 tín hiệu. Đổi 3 item từ hổ phách sang chặn thật. |
| **2** | `microbiologicallySusceptible` | Một ô mới, phục vụ **2** item ở 2 gate khác nhau — tỉ lệ lợi/công cao nhất trong nhóm cần UI. |
| **3** | `newOrRepositionedProject`, `scaleUpOrProcessChange` | Rơi ra gần như miễn phí ngay sau **Tranche 1** (B1/B2/B6 đã cấp đủ dữ liệu). |
| **4** | `postMarketSignal`, `pvPmsRequired` | Cài từng phần được; phần còn lại chờ B5 và một mốc review cần hỏi SME. |
| **5** | `claimNeedsRegulatoryReview`, `claimNeedsPerformanceEvidence` | Đi cùng tranche claims (B7 → C1 → D2). |
| **6** | `rmCompositionRisk`, `marketPackRequirement` | Đắt nhất (cột per-nguyên-liệu) và phụ thuộc ngoài (F10). |

---

## Ba điều phải nhớ khi cài bất kỳ trigger nào

**1. Cân ngưỡng trước khi bật.** Item đang *không bao giờ chặn* sẽ chuyển thành *chặn thật*, trên cả những dự án đang chạy dở. Xem cách `sg04-pb-screen` (Gate 4, chỉ chặn khi có escalation) và `sg07-caution-closed` (Gate 7, đòi đóng hết) cố ý dùng hai ngưỡng khác nhau. Bật mà không cân ngưỡng rất dễ chặn oan hàng loạt — đúng cái bẫy vừa gỡ ở Gate 7 ngày 2026-08-07.

**2. Trigger suy ra vẫn phải nhìn thấy được.** Nếu Gate 5 bị chặn vì máy tự kết luận "công thức có nước", mà panel chỉ ghi *"Preservative strategy — chưa xong"*, người dùng không hiểu vì đâu và không biết sửa ở đâu. Dùng `link` trên `GateBlocker` chỉ thẳng về dòng dữ liệu đã kích hoạt nó.

**3. Trigger không active phải hiện ra, không được ẩn.** Engine đã tự lo: item có trigger không active sẽ hiện `✓ advisory` kèm câu giải thích lấy từ `TRIGGER_INACTIVE_EXPLANATIONS`. Thêm trigger mới thì **bắt buộc** thêm câu giải thích tương ứng — TypeScript ép điều này qua kiểu `Record<ReadinessTrigger, string>`. Dòng "đã xét, không áp dụng vì…" chính là bằng chứng audit; ẩn đi thì hồ sơ không trả lời được câu hỏi của thanh tra.

---

## Giả định chưa được SME xác nhận

**Danh sách câu hỏi nằm ở `F1_Per_Gate_Open_Questions.md` → mục "Round 4"** — file đó là **danh sách duy nhất**; ở đây chỉ trỏ sang bằng ID để hai bên không lệch nhau. Mọi chỗ suy đoán trong file này đều mang dấu `[ASSUMPTION: R4-Qn]` ngay tại điểm quyết định.

Toàn bộ danh mục trigger phía trên đứng trên **11 giả định** sau. A3 cấp **điều kiện** trigger; chúng tôi phải tự chọn **dữ liệu nào trong app** đại diện cho điều kiện đó — việc này trông cơ học nhưng là diễn giải, và đúng loại đã sai hai lần trước đây (`sg01-source`, `sg01-owner`).

| ID | Giả định | Ảnh hưởng trigger |
|---|---|---|
| `R4-Q4` | Bỏ vế *"or should be opened"*, chỉ đọc "có record đang mở" | `openChangeControl` |
| `R4-Q5` | `studyProtocolSetup.plannedValue` là dấu hiệu "đã dự định làm study" | `humanStudyPlanned` |
| `R4-Q6` | Ánh xạ văn xuôi của A3 sang **11 option cụ thể** trên checklist Post-Market Sources | `postMarketPerformanceScope`, `postMarketSignal`, `pvPmsRequired` |
| `R4-Q7` | `packaging change` + `lifecycle improvement` = *"purely administrative change"* được miễn | `newOrRepositionedProject` |
| `R4-Q8` | Phân loại **Major** của F5 = *"major reformulation"* của A3; và giá trị `affectedArea` nào tính là đổi quy trình/nhà máy | `scaleUpOrProcessChange` |
| `R4-Q9` | Claim ở `Pending classification` **tính là đã trigger** | `claimNeedsRegulatoryReview` |
| `R4-Q10` | Mốc post-launch review suy từ `launchApprovedDate` + N tháng; "đã launch" = ít nhất một thị trường | `postMarketSignal` |
| `R4-Q11` | Bỏ qua 3 vế *product category / market / company policy* vì không có danh sách | `pvPmsRequired` |
| `R4-Q12` | `sg12-performance` phải đổi sang Conditional thì trigger mới có nghĩa | `postMarketPerformanceScope` |
| `R4-Q13` | Câu giải thích tự sinh khi trigger tắt là đủ, không cần người ghi N/A kèm lý do | `microbiologicallySusceptible`, `marketPackRequirement`, `skincareForTwo` |
| `R4-Q14` | Cờ rủi ro thành phần lưu theo **dự án** (không phải theo nguyên liệu) — vì master data nguyên liệu ở Cosmetri và MBc360 chỉ đọc | `rmCompositionRisk` |

Ba giả định đã **ship** (bản sửa Gate 7 ngày 2026-08-07) nằm ở `R4-Q1`, `R4-Q2`, `R4-Q3` — đánh dấu 🔴 trong file kia vì trả lời khác nghĩa là phải làm lại, không phải thiết kế lại.

> **Quy ước:** đừng thêm câu hỏi mới vào file này. Thêm vào Round 4, lấy ID, rồi trỏ về đây.

---

## Bộ test case

Mỗi trigger cần **đúng 2 kịch bản đối xứng** — bật và tắt. Chỉ test một chiều là bẫy phổ biến nhất: một trigger luôn trả `false` sẽ pass toàn bộ test "tắt" mà không ai phát hiện.

### Cách chạy nhanh (không cần mở UI)

```ts
// .tmp-check/check.ts — chạy: npx tsx .tmp-check/check.ts
import { createEmptyProject } from '../apps/web/src/store/factory';
import { gateReadinessChecklist, gateBlockers } from '../packages/shared/src/utils/gateProgress';
import type { ProjectIdentity } from '../packages/shared/src/types';

// ⚠️ `markets` KHÔNG được thiếu — createEmptyProject gọi identity.markets.map() và sẽ ném lỗi
const identity = {
  id: 'MBC-TEST', productCode: 'X', productSku: 'X', projectLead: 'A',
  reviewers: {}, markets: ['Vietnam'],
} as unknown as ProjectIdentity;

const p = createEmptyProject(identity);
for (const item of p.checklists['targetUsers'] ?? []) {
  if (item.label === 'Pregnancy') item.selected = true;   // ← bật/tắt trigger ở đây
}

for (const gate of ['SG04', 'SG07']) {
  console.log(`\n${gate}: ${gateBlockers(p, gate).length} blockers`);
  for (const i of gateReadinessChecklist(p, gate)) {
    console.log(`  ${i.satisfied ? '✓' : '✗'} ${i.advisory ? '(advisory)' : '(BLOCKS)  '} ${i.label.slice(0, 70)}`);
  }
}
```

Ba cột cần đọc trong output: `satisfied` (đã đạt chưa) · `advisory` (có được phép chặn không) · số blockers của gate. **Nhớ xoá thư mục tạm sau khi chạy** — đừng commit.

### Bốn kết quả có thể có, và ý nghĩa

| Hiển thị | Nghĩa | Khi nào là đúng |
|---|---|---|
| `✓ (advisory)` + label có đuôi *"not triggered for this project (…)"* | Trigger tắt → tự thoả, có ghi lý do | Kịch bản **tắt** |
| `✗ (BLOCKS)` | Trigger bật, dữ liệu chưa đủ → chặn gate | Kịch bản **bật**, chưa điền evidence |
| `✓ (BLOCKS)` | Trigger bật, dữ liệu đã đủ → không chặn nhưng vẫn là item chặn | Kịch bản **bật**, đã điền xong evidence |
| `✗ (advisory)` | Chưa đạt nhưng không chặn | Chỉ đúng với **Supporting**, hoặc Conditional **chưa cài trigger** |

🔴 **Dấu hiệu sai:** thấy `✗ (advisory)` trên một item Conditional mà bạn vừa cài trigger và vừa bật trigger đó → trigger không kích hoạt. Kiểm `isReadinessTriggerActive()`.

---

### TC-01 · `skincareForTwo` — ✅ đã cài, đã verify 2026-08-07

| | |
|---|---|
| **Bật** | Phase 1 → Target Users: tick `Pregnancy` (hoặc `Breastfeeding` / `Postpartum`) |
| **Tắt** | Chỉ tick `General adult` |

| # | Kịch bản | Gate | Kỳ vọng | Kết quả thực tế |
|---|---|---|---|---|
| 1a | Tắt | SG07 | `sg07-caution-closed` → `✓ (advisory)` + *"not triggered…"* | ✅ đúng |
| 1b | Tắt | SG04 | `sg04-pb-screen` → `✓ (advisory)` + *"not triggered…"* | ✅ đúng |
| 1c | Bật | SG07 | `sg07-caution-closed` → `✗ (BLOCKS)` (12 dòng PB đều ở `Not assessed`) | ✅ đúng |
| 1d | Bật | SG04 | `sg04-pb-screen` → `✓ (BLOCKS)` — **đạt** vì `Not assessed` KHÔNG nằm trong badValues của Gate 4 | ✅ đúng |
| 1e | Bật + đẩy 1 dòng PB lên `Needs Safety Review` | SG04 | `sg04-pb-screen` → `✗ (BLOCKS)` | ☐ chưa chạy |
| 1f | Bật + đặt cả 12 dòng PB về `Not present` | SG07 | `sg07-caution-closed` → `✓ (BLOCKS)` | ☐ chưa chạy |
| 1g | Tắt → bật giữa chừng sau khi Gate 4 đã pass | SG04 | Gate 4 **mất trạng thái pass** (`isGatePassed` tính lại live) | ☐ chưa chạy |
| 1h | Sản phẩm chỉ chọn `Infant 0+` | SG07 | ⚠️ Hiện **không có đánh giá nào** — lỗ hổng đã biết, chờ A2. Test này để **theo dõi**, không phải để pass | ☐ |

> 1e/1f là hai nửa chứng minh ngưỡng Gate 4 ≠ Gate 7 hoạt động đúng. 1g chứng minh readiness được tính lại chứ không lưu cứng — cũng là test cho luật B4.

---

### TC-02 · `openChangeControl`

| | |
|---|---|
| **Bật** | Trang Change Control → tạo record có `status` thuộc nhóm mở (Draft / Submitted / Under Review / Approved–Impl Pending / In Implementation / Verification Pending / On Hold) |
| **Tắt** | Không có record nào, hoặc mọi record ở Completed / Rejected / Cancelled / Superseded |

| # | Kịch bản | Gate | Kỳ vọng |
|---|---|---|---|
| 2a | Tắt | SG12 | `sg12-change-links` → `✓ (advisory)` + *"not triggered…"* |
| 2b | Bật | SG12 | `✗ (BLOCKS)` nếu Key Gate Check chưa done |
| 2c | Bật rồi đóng record (→ Completed) | SG12 | Quay lại `✓ (advisory)` |
| 2d | **Tiền đề `[R4-Q12]`:** item đã đổi tier Supporting → Conditional | — | Nếu còn Supporting thì 2b sẽ ra `✗ (advisory)` → trigger vô nghĩa |

---

### TC-03 · `humanStudyPlanned`

| | |
|---|---|
| **Bật** | Register Study Protocol Setup → điền `plannedValue` cho ít nhất 1 dòng |
| **Tắt** | Register để nguyên như lúc tạo dự án |

| # | Kịch bản | Gate | Kỳ vọng |
|---|---|---|---|
| 3a | Tắt | SG08 | `sg08-human-study` → `✓ (advisory)` |
| 3b | Bật | SG08 | `✗ (BLOCKS)` khi requirement `humanStudy` chưa Completed |
| 3c | Bật + requirement `humanStudy` = Completed | SG08 | `✓ (BLOCKS)` |
| 3d | ⚠️ **Bẫy vacuous:** `studyProtocolSetup` là `mode: 'fixed'` — rows được seed sẵn | SG08 | Nếu trigger dùng "có row" thay vì "có `plannedValue`", nó sẽ **luôn bật**. Test 3a chính là cái bắt lỗi này |

---

### TC-04 · `postMarketPerformanceScope`

| | |
|---|---|
| **Bật** | Phase 4 → Post-Market Sources: tick `Formula issue` (hoặc `Quality issue` / `Product optimisation` / `Claim question`) |
| **Tắt** | Không tick option nào trong nhóm đó (ví dụ chỉ tick `Consumer feedback`) |

| # | Kịch bản | Gate | Kỳ vọng |
|---|---|---|---|
| 4a | Tắt | SG12 | `sg12-performance` → `✓ (advisory)` |
| 4b | Bật | SG12 | `✗ (BLOCKS)` |
| 4c | Chỉ tick `Consumer feedback` (thuộc trigger #6, **không** thuộc #4) | SG12 | `sg12-performance` vẫn tắt, `sg12-feedback` bật → chứng minh 2 trigger đọc **tập option khác nhau** trên **cùng một checklist** |

---

### TC-05 · `microbiologicallySusceptible`

| | |
|---|---|
| **Bật** | Trường mới = `Susceptible` (mặc định gợi ý khi BOM có dòng INCI `Aqua`/`Water`) |
| **Tắt** | Trường mới = `Anhydrous` / `Self-preserving` / `Sterile` / `Single-use` **kèm lý do** |

| # | Kịch bản | Gate | Kỳ vọng |
|---|---|---|---|
| 5a | Tắt | SG05 | `sg05-preservative` → `✓ (advisory)` |
| 5b | Tắt | SG09 | `sg09-pet` → `✓ (advisory)` |
| 5c | Bật | SG05 + SG09 | Cả hai → `✗ (BLOCKS)` — **một trường, hai gate** |
| 5d | BOM có `Aqua` nhưng người chọn `Anhydrous` mà **không ghi lý do** | — | Save bị chặn (SME đòi *"documented rationale"*) |
| 5e | BOM **không** có `Aqua`, người vẫn chọn `Susceptible` | SG05 | Trigger **bật** — phán định của người thắng gợi ý của máy (ca "hũ dùng nhiều lần, tay ướt") |
| 5f | Thêm dòng `Aqua` vào BOM sau khi đã chọn `Anhydrous` | — | Gợi ý đổi, nhưng **không tự ghi đè** phán định đã ghi |

> 5e là test quan trọng nhất của nhóm này: nó chứng minh trường này là **phán định có gợi ý**, không phải giá trị suy ra tự động. Nếu 5e ra "tắt" nghĩa là ai đó đã cài trigger đọc thẳng BOM và bỏ qua ô phán định.

---

### TC-06 · `postMarketSignal`

| | |
|---|---|
| **Bật** | Post-Market Sources tick `Complaint` / `Consumer feedback` / `Distributor feedback` / `Claim question`; **hoặc** đã launch + tới mốc review |
| **Tắt** | Không tick option nào thuộc nhóm trên, chưa launch |

| # | Kịch bản | Gate | Kỳ vọng |
|---|---|---|---|
| 6a | Tắt | SG12 | `sg12-feedback` → `✓ (advisory)` |
| 6b | Tick `Complaint` | SG12 | `✗ (BLOCKS)` |
| 6c | Không tick gì + `MarketTrack.launchApproval` = Approved + đã qua mốc review | SG12 | `✗ (BLOCKS)` — vế "đã launch" độc lập với vế "có tín hiệu" |
| 6d | Đã launch nhưng **chưa** tới mốc | SG12 | `✓ (advisory)` |
| 6e | Nhiều thị trường, mới 1 thị trường Approved | SG12 | ⚠️ `[R4-Q10]` "đã launch" nghĩa là **một** hay **mọi** thị trường? Liên quan E3(a) |

---

### TC-07 · `pvPmsRequired`

| # | Kịch bản | Gate | Kỳ vọng |
|---|---|---|---|
| 7a | Không tín hiệu nào, không nhóm dễ tổn thương | SG12 | `sg12-pv-pms` → `✓ (advisory)` |
| 7b | Tick `Adverse event / PV signal` | SG12 | `✗ (BLOCKS)` |
| 7c | Tick `PMS trend` | SG12 | `✗ (BLOCKS)` |
| 7d | Không tín hiệu, nhưng có cờ vulnerable-user (B5) | SG12 | `✗ (BLOCKS)` — **vế độc lập**, chỉ chạy sau khi B5 xong |
| 7e | Cài từng phần (mới có vế tín hiệu, chưa có vế vulnerable) | SG12 | 7b/7c đúng, 7d **chưa** đúng — ghi nhận là nợ, không phải lỗi |

> Đây là trigger OR nhiều vế. Ghi rõ vế nào đã cài để test 7d không bị coi là bug khi nó đang nằm ngoài phạm vi.

---

### TC-08 · `newOrRepositionedProject`

| # | Kịch bản | Gate | Kỳ vọng |
|---|---|---|---|
| 8a | Loại dự án (B2) = `lifecycle improvement`, Request Origin (B1) = nội bộ, không nêu benchmark | SG03 | `sg03-benchmark` → `✓ (advisory)` |
| 8b | Loại dự án = `new development` | SG03 | `✗ (BLOCKS)` |
| 8c | Loại dự án = `lifecycle improvement` **nhưng** Request Origin = `Customer request` | SG03 | `✗ (BLOCKS)` — vế thứ 2 độc lập |
| 8d | Loại dự án = `lifecycle improvement` **nhưng** có nêu Benchmark product (B6) | SG03 | `✗ (BLOCKS)` — vế thứ 3 độc lập |
| 8e | Loại dự án = `packaging change`, không có vế nào khác | SG03 | `✓ (advisory)` — đây là *"purely administrative change"* SME loại trừ |
| 8f | Hai dự án cùng `Product Type = Serum`, khác loại dự án | SG03 | Kết quả **phải khác nhau** — chứng minh trigger đọc trường loại dự án chứ không phải checklist Product Type |

> 8e và 8f là cặp quan trọng nhất: chúng chứng minh đúng cái mà hệ thống hôm nay **không** phân biệt được.

---

### TC-09 · `scaleUpOrProcessChange`

| # | Kịch bản | Gate | Kỳ vọng |
|---|---|---|---|
| 9a | Dự án lifecycle, chưa có formula version mới, không có change record | SG09 | `sg09-scaleup` → `✓ (advisory)` |
| 9b | Tạo formula version phân loại **Major** (F5) | SG09 | `✗ (BLOCKS)` |
| 9c | Tạo formula version phân loại **Minor** | SG09 | `✓ (advisory)` — Minor không thuộc *"major reformulations"* |
| 9d | Change record có `affectedArea` = chuyển nhà máy / đổi thiết bị | SG09 | `✗ (BLOCKS)` |
| 9e | Loại dự án (B2) = `new development` | SG09 | `✗ (BLOCKS)` — *"new formulas"* |

---

### TC-10 · `rmCompositionRisk`

| # | Kịch bản | Gate | Kỳ vọng |
|---|---|---|---|
| 10a | Mọi dòng Supplier & RM Evidence có cột rủi ro để trống / `None` | SG04 | `sg04-allergen` → `✓ (advisory)` |
| 10b | 1 dòng gắn `Essential oils` | SG04 | `✗ (BLOCKS)` nếu `allergenStatement`/`impurities` của dòng đó còn trống |
| 10c | 10b + điền đủ 2 cột cho **dòng đó** | SG04 | `✓ (BLOCKS)` |
| 10d | 10b + điền 2 cột cho **dòng khác**, không phải dòng bị gắn cờ | SG04 | Vẫn `✗ (BLOCKS)` — check phải theo từng dòng |
| 10e | ⚠️ **Bẫy vacuous:** register rỗng hoàn toàn | SG04 | `registerRowsComplete` cố ý **không** vacuous → phải là `✗`, không được tự thoả |

---

### TC-11 · `claimNeedsRegulatoryReview`

| # | Kịch bản | Gate | Kỳ vọng |
|---|---|---|---|
| 11a | Mọi claim: category = `Cosmetic`, risk = `Low`, wording nằm trong Claims Library | SG03 | `sg03-reg-claims` → `✓ (advisory)` |
| 11b | 1 claim category = `Borderline / therapeutic-adjacent` | SG03 | `✗ (BLOCKS)` |
| 11c | 1 claim risk = `High` (category vẫn `Cosmetic`) | SG03 | `✗ (BLOCKS)` — hai trục độc lập |
| 11d | 1 claim risk = `Pending classification` | SG03 | ⚠️ `[R4-Q9]` "chưa phân loại" tính là bật hay tắt? Nghiêng về **bật** (chưa biết thì phải review) |
| 11e | Claim wording không có trong Claims Library | SG03 | `✗ (BLOCKS)` — chỉ test được sau khi có nội dung Claims Library (F11) |

---

### TC-12 · `claimNeedsPerformanceEvidence`

| # | Kịch bản | Gate | Kỳ vọng |
|---|---|---|---|
| 12a | Mọi claim: `evidence required` = trống / không cần bằng chứng hiệu năng | SG10 | `sg10-performance-evidence` → `✓ (advisory)` |
| 12b | 1 claim yêu cầu bằng chứng lâm sàng / in vivo / so sánh | SG10 | `✗ (BLOCKS)` khi requirement `dossierEvidence` chưa Completed |

---

### TC-13 · `marketPackRequirement`

| # | Kịch bản | Gate | Kỳ vọng |
|---|---|---|---|
| 13a | `markets` = thị trường **không** có yêu cầu bao bì đặc thù trong thư viện | SG06 | `sg06-market-pack` → `✓ (advisory)` |
| 13b | `markets` gồm 1 thị trường **có** yêu cầu | SG06 | `✗ (BLOCKS)` |
| 13c | Nhiều thị trường, chỉ 1 cái có yêu cầu | SG06 | `✗ (BLOCKS)` — bất kỳ thị trường nào cũng đủ bật |
| 13d | Thêm thị trường mới sau khi Gate 6 đã pass | SG06 | Gate 6 **mất trạng thái pass** (giống 1g) |
| 13e | 13a + người chưa ghi N/A kèm lý do | SG06 | ⚠️ `[R4-Q13]` SME đòi *"record N/A with rationale"* — vậy ngay cả khi trigger tắt vẫn phải có ô lý do? Nếu có thì đây **không** thuần là trigger tắt |

---

## Sweep tự động — `npm run verify:readiness`

Ba lỗi cấu hình dưới đây **không ném exception, không hiện trên UI** — chúng chỉ lặng lẽ làm một gate hoặc không bao giờ qua được, hoặc qua quá dễ. Cả ba đều đã xảy ra thật trong repo này. Script [`packages/shared/scripts/verify-readiness.ts`](../../packages/shared/scripts/verify-readiness.ts) thay cho việc rà tay, exit ≠ 0 khi có lỗi nên cắm được vào CI.

| Sweep | Bắt gì | Đã từng xảy ra |
|---|---|---|
| **S1** | Sai tên register / cột / section / requirement / Key Gate Check, hoặc `badValues` chứa giá trị không nằm trong options của cột đó → check **không bao giờ thoả được**, gate kẹt vĩnh viễn mà không ai biết vì sao | rà tay 2 lần trước đây |
| **S2** | `registerColumnFilled` / `registerNoBadRows` dùng `.every()` → **tự thoả trên register rỗng**. Phải có `registerHasRows` Mandatory cùng register, cùng gate hoặc sớm hơn | rà tay 2 lần trước đây |
| **S3** | Mặt ngược lại, và **là con đã ship**: register `mode:'fixed'` seed sẵn rows nên chính **giá trị seed** quyết định check. Mọi dòng seed rơi vào `badValues` → chặn mọi dự án từ ngày đầu; cột luôn có giá trị sẵn → không bao giờ fail được | **Gate 7, 07/08/2026** |
| **TAG** | `[ASSUMPTION: R4-Qn]` trỏ tới câu hỏi không tồn tại, hoặc câu hỏi được định nghĩa mà không chỗ nào gắn dấu | phát hiện ngay lần chạy đầu (`R4-Q9`) |

> **S3 tồn tại chính vì S2 miễn trừ register `mode:'fixed'`** — và **8 trong 10** check thuộc diện này nằm trên register fixed. Tức là S2 một mình bỏ sót đúng cái class đã cắn mình ở Gate 7. Bài học chung: mỗi lần thêm một điều kiện miễn trừ vào sweep, phải hỏi ngay *"vậy ai canh phần vừa miễn?"*
>
> Cả ba sweep đã được **kiểm ngược**: cố tình inject lỗi (sai tên cột · `badValue` dùng gạch ngang dài thay gạch nối · gỡ `registerHasRows` guard · trả `sg07-caution-closed` về Mandatory không điều kiện) — mỗi lần đúng một lỗi tương ứng được báo. Một sweep chưa bao giờ được thấy fail thì chưa chứng minh được nó chạy.

Script còn in **2 chỉ số nợ** mỗi lần chạy, cạnh nhau: số check `manual` (khai báo rồi nhưng chưa có nguồn dữ liệu) và số item Conditional chưa có trigger. Hai con số này là thước đo "còn bao xa" trung thực hơn bất kỳ cái nào khác — nhưng nhớ chúng **không đếm** những chỗ đã wired **sai** (xem D1: 12 item sign-off đều xanh mà đều sai luật).

## Test hồi quy — chạy sau **mỗi** lần cài trigger mới

Cài một trigger chạm vào `isReadinessTriggerActive()` và biến `blocks` dùng chung cho mọi item. Bốn điều sau phải **không đổi**:

| # | Kiểm | Kỳ vọng |
|---|---|---|
| R1 | Toàn bộ item **Mandatory** trên cả 12 gate | Không item nào đổi từ `BLOCKS` sang `advisory` |
| R2 | **5 item Supporting** (xem dưới) | Vẫn `advisory`, **không bao giờ** xuất hiện trong `gateBlockers()` — kể cả khi A3 đã cấp trigger cho nó |
| R3 | Item **Conditional chưa cài trigger** | Vẫn `advisory` — không được vô tình bật hàng loạt |
| R4 | Số blocker của một dự án general-adult mới tạo, ở cả 12 gate | So với lần chạy trước; mọi chênh lệch phải giải thích được bằng đúng trigger vừa cài |

**5 item Supporting mà R2 phải phủ** — đây là danh sách đầy đủ, dùng làm assertion chứ không phải đọc tay:

| Item | Gate | A3 có cấp trigger không | Ghi chú |
|---|---|---|---|
| `sg03-npd-target-product-progress` | 3 | không | Đến từ NPD Front-End Roadmap, không phải item F1 của SME |
| `sg05-costing` | 5 | không | SME nói rõ giữ Supporting; escalate bằng nút **Hold** do người bấm |
| `sg12-feedback` | 12 | **có** | A1: Supporting cho review định kỳ, **Conditional** khi đã launch + tới kỳ review → cách biểu diễn đang chờ `R4-Q12` |
| `sg12-performance` | 12 | **có** | Tier đang chờ `R4-Q12` — nếu SME xác nhận Conditional thì item này **rời** khỏi R2 |
| `sg12-change-links` | 12 | **có** | A1 đã nói rõ: Supporting → **Conditional**. Chưa đổi trong code → hiện vẫn thuộc R2 |

⚠️ **R2 là test có "hạn sử dụng".** Ba item Gate 12 đang nằm trong đó chỉ vì code **chưa** áp dụng phần đổi tier mà A1 yêu cầu. Khi đổi tier, chúng phải **rời** R2 và chuyển sang test cặp bật/tắt (TC-02, TC-04, TC-06). Nếu một ngày R2 vẫn pass với đủ 5 item mà tier đã đổi rồi, thì chính R2 đang sai chứ không phải code.

```ts
const SUPPORTING_IDS = ['sg03-npd-target-product-progress', 'sg05-costing',
                        'sg12-feedback', 'sg12-performance', 'sg12-change-links'];
// với mọi trạng thái dữ liệu: không id nào trong đây được xuất hiện ở gateBlockers()
```

Cách lấy R4 nhanh:

```ts
for (const g of ['SG01','SG02','SG03','SG04','SG05','SG06','SG07','SG08','SG09','SG10','SG11','SG12'])
  console.log(g, gateBlockers(p, g).length);
```

**Baseline dự án general-adult mới, sau bản sửa 2026-08-07:** SG07 = 11 blockers (trước bản sửa là 12 — chênh đúng 1, là `sg07-caution-closed`). Ghi lại số của cả 12 gate ngay trước khi cài trigger tiếp theo để có mốc so sánh.

## Bẫy đã gặp thật, đưa vào checklist vì đã trả giá

| Bẫy | Biểu hiện | Test bắt được |
|---|---|---|
| **Vacuous truth** — `.every()` trên register rỗng trả `true` | Item Mandatory tự thoả dù chưa ai nhập gì | 10e, 3d |
| **Register `mode: 'fixed'` seed sẵn rows** | `registerHasRows` luôn đúng; hoặc ngược lại, giá trị seed nằm trong `badValues` nên **chặn mọi dự án** (đúng lỗi Gate 7 ngày 2026-08-07) | 1a, 3d |
| **Sai chuỗi tên** register/column/section/check | Check không bao giờ thoả được → chặn gate vĩnh viễn, **không báo lỗi** | Bất kỳ kịch bản "bật + đã điền đủ" nào ra `✗` thay vì `✓` |
| **Trigger một chiều** | Chỉ test bật, không test tắt → trigger luôn `true` vẫn pass | Mọi cặp a/b ở trên |
| **Ngưỡng sai giữa 2 gate** | Gate sớm đòi bằng gate muộn → chặn oan cả loạt dự án đang chạy | 1d vs 1c, 1e vs 1f |
