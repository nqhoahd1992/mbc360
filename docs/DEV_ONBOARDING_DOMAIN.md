# MBc360 — Quy trình phát triển sản phẩm, dành cho Dev

> **Mục đích:** tài liệu này dạy **nghiệp vụ** đứng sau MBc360 cho một developer chưa từng làm ngành mỹ phẩm / quản lý chất lượng. Đọc xong bạn phải trả lời được: *"Cái app này đang mô hình hoá quy trình gì, tại sao nó phức tạp như vậy, và khi tôi sửa một dòng code thì tôi đang động vào luật nghiệp vụ nào?"*
>
> **Không phải** tài liệu kiến trúc kỹ thuật — cái đó nằm ở `CLAUDE.md`, `docs/APP_PLAN.md`, `docs/BACKEND_PLAN.md`.
>
> Mọi con số/tên trong tài liệu này được trích trực tiếp từ code và từ 2 file workbook trong `docs/`, không phải trí nhớ. Chỗ nào là suy luận hoặc còn mở, tôi ghi rõ.

---

## Mục lục

- [0. Bản đồ 60 giây](#0-bản-đồ-60-giây)
- [1. Bối cảnh: công ty này làm gì, và tại sao cần một hệ thống như vậy](#1-bối-cảnh-công-ty-này-làm-gì-và-tại-sao-cần-một-hệ-thống-như-vậy)
- [2. Phase-Gate là gì](#2-phase-gate-là-gì)
- [3. Workbook Excel — nguồn sự thật](#3-workbook-excel--nguồn-sự-thật)
- [4. Chi tiết 4 Phase / 12 Gate](#4-chi-tiết-4-phase--12-gate)
- [5. Bộ luật vận hành (A / B / C rules)](#5-bộ-luật-vận-hành-a--b--c-rules)
- [6. Từ workbook sang code — bản đồ ánh xạ](#6-từ-workbook-sang-code--bản-đồ-ánh-xạ)
- [7. Mô hình dữ liệu](#7-mô-hình-dữ-liệu)
- [8. Gate Readiness Engine — trái tim của hệ thống](#8-gate-readiness-engine--trái-tim-của-hệ-thống)
- [9. Ai chịu trách nhiệm cái gì](#9-ai-chịu-trách-nhiệm-cái-gì)
- [10. Tích hợp bên ngoài](#10-tích-hợp-bên-ngoài)
- [11. Những cạm bẫy đã trả giá](#11-những-cạm-bẫy-đã-trả-giá)
- [12. Lộ trình tự học trước khi code](#12-lộ-trình-tự-học-trước-khi-code)
- [Phụ lục A — Từ điển thuật ngữ ngành](#phụ-lục-a--từ-điển-thuật-ngữ-ngành)
- [Phụ lục B — Bảng tra nhanh enum](#phụ-lục-b--bảng-tra-nhanh-enum)

---

## 0. Bản đồ 60 giây

```
Một PROJECT = một sản phẩm mỹ phẩm đang được phát triển
  └── đi qua 4 PHASE, mỗi phase 3 GATE → tổng 12 GATE (SG01…SG12)
        └── mỗi GATE là một "cửa kiểm soát": phải đủ bằng chứng mới được đi tiếp
              └── bằng chứng nằm rải rác trong ~76 REGISTER (sổ bằng chứng)
                    + checklist / requirement / key gate check trên trang PHASE
                          └── GATE READINESS ENGINE đọc tất cả và quyết định:
                                gate này ĐƯỢC PASS hay BỊ CHẶN, và chặn vì cái gì
```

Ba câu nói gọn toàn bộ triết lý hệ thống:

1. **"No silent corrections"** — không bao giờ sửa lén. Muốn sửa dữ liệu của một gate đã đóng thì phải **Backtrack** (mở lại chính thức, có ghi ai/tại sao/khi nào), chứ không được sửa đè.
2. **"Contribute ≠ approve"** — ai cũng có thể nhập bằng chứng, nhưng chỉ đúng vai trò mới được ra quyết định/ký duyệt.
3. **"Evidence or it didn't happen"** — mỗi mục check phải có link bằng chứng + ngày + người ký. Tick suông không tính.

---

## 1. Bối cảnh: công ty này làm gì, và tại sao cần một hệ thống như vậy

MaxBioCare phát triển **sản phẩm chăm sóc cá nhân / mỹ phẩm**, với một mảng đặc thù rất nhạy cảm: sản phẩm cho **phụ nữ mang thai, đang cho con bú, sau sinh** và **trẻ sơ sinh**. Workbook gọi mảng này là **"Skincare for Two"** — chăm sóc cho hai người, vì thứ mẹ bôi lên da có thể tiếp xúc sang em bé.

Điều đó kéo theo ba loại ràng buộc mà một app CRUD thông thường không có:

**a) Ràng buộc an toàn.** Một thành phần vô hại với người lớn có thể cấm tuyệt đối với thai phụ (ví dụ retinoid, salicylic acid nồng độ cao). Sai sót không phải là "bug hiển thị lệch", mà là rủi ro sức khoẻ. Đây là lý do Gate 07 được đánh dấu **SAFETY-CRITICAL HARD BLOCK** trong phụ lục F1.

**b) Ràng buộc pháp lý.** Mỗi thị trường có bộ hồ sơ riêng: ASEAN cần **PIF**, EU cần **PIF + CPSR + đăng ký CPNP**, Mỹ theo **MoCRA**, Úc có **AICIS**. Cùng một công thức có thể được duyệt ở Việt Nam mà bị chặn ở EU. Đây là lý do Gate 10–12 được theo dõi **riêng theo từng thị trường** (`ProjectData.marketTracks`), trong khi Gate 01–09 dùng chung một luồng.

**c) Ràng buộc truy vết.** Khi cơ quan quản lý hoặc khách hàng hỏi *"tại sao 18 tháng trước các anh kết luận thành phần này an toàn cho thai phụ?"*, công ty phải dựng lại được đúng bằng chứng, đúng phiên bản công thức, đúng người ký, tại đúng thời điểm. Không được có chuyện "chắc hồi đó anh A sửa gì đó".

Trước MBc360, toàn bộ quy trình này chạy trên **một file Excel 55 sheet**. App này là bản số hoá 1:1 của file đó — và đó cũng là lý do code trông "lạ" so với app web bình thường: nó không thiết kế lại nghiệp vụ, nó **sao chép nguyên trạng** rồi thêm cơ chế enforce.

---

## 2. Phase-Gate là gì

**Phase-Gate** (còn gọi Stage-Gate) là mô hình quản lý dự án phát triển sản phẩm phổ biến trong dược/mỹ phẩm/thiết bị y tế. Ý tưởng:

- Chia vòng đời sản phẩm thành các **Phase** (giai đoạn làm việc).
- Giữa các phase đặt các **Gate** (cửa kiểm soát) — một cuộc họp/quyết định chính thức: *đi tiếp, đi tiếp có điều kiện, dừng lại, hay quay lui?*
- Tại mỗi gate có **danh sách đầu ra bắt buộc** (deliverables) và **người có thẩm quyền quyết định**.

Mục đích: **giết dự án tồi càng sớm càng tốt**, và **không cho phép rủi ro trôi xuống hạ nguồn**. Sửa một sai sót về thành phần ở Gate 04 tốn vài giờ; phát hiện cùng sai sót đó sau khi đã sản xuất 10.000 sản phẩm tốn hàng trăm nghìn đô + rủi ro thu hồi.

Trong MBc360, một gate có **hai cột trạng thái riêng biệt** — chỗ này rất hay bị nhầm:

| Cột | Type | Ý nghĩa | Giá trị |
|---|---|---|---|
| **Stage status** | `StageStatus` | Công việc của gate này làm tới đâu rồi? | `Not Started`, `In Progress`, `Complete`, `Gap`, `Hold`, `N/A` |
| **Gate decision** | `GateDecision` | Người có thẩm quyền phán quyết gì? | `Proceed`, `Proceed with Conditions`, `Hold`, `Backtrack`, `N/A` |

`Hold` xuất hiện ở **cả hai** cột nhưng nghĩa khác nhau (rule B1): `Hold` ở Stage status = *công việc đã dừng*; `Hold` ở Gate decision = *bị chặn không cho đi tiếp*.

> ⚠️ Bẫy tên biến: hằng số trong code là **`STAGE_STATUSES`**, không phải `GATE_STATUSES`. Và có một enum thứ ba, `WORK_STATUSES` (dùng cho requirement/evidence/CAPA row), chứa `Completed` — **có chữ "d"** — trong khi `STAGE_STATUSES` chứa `Complete` — **không có chữ "d"**. Hai chuỗi khác nhau, so sánh nhầm là bug thầm lặng.

---

## 3. Workbook Excel — nguồn sự thật

Trong `docs/` có **hai** file workbook, và cả hai đều có hiệu lực:

| File | Ngày | Số sheet | Vai trò |
|---|---|---|---|
| `MBc360 Master Product Development System File.xlsx` | 2026-07-14 | **55** | Bản "V18" — nền tảng gốc của toàn hệ thống |
| `MBc360 Master Product Development System File v2.xlsx` | 2026-07-24 | **64** | Thêm khối "NPD Front-End Roadmap"; do chuyên gia soạn, **cùng thẩm quyền với V18** |

### 3.1 Cách đọc workbook mà không cần Excel

File `.xlsx` thực chất là file **zip**. Kỹ thuật này dùng thường xuyên trong repo (và đã từng phát hiện ra bug thật):

```bash
cp "docs/MBc360 Master Product Development System File v2.xlsx" /tmp/wb.zip
unzip -o /tmp/wb.zip -d /tmp/wb
# Thứ tự sheet theo đúng thứ tự tài liệu:
grep -o '<sheet name="[^"]*"' /tmp/wb/xl/workbook.xml
# Nội dung text dùng chung:
cat /tmp/wb/xl/sharedStrings.xml
```

**Bất cứ khi nào bạn đụng vào thứ tự hiển thị** (thứ tự nhóm sidebar, thứ tự thẻ register, thứ tự option dropdown), hãy đối chiếu với `workbook.xml` chứ đừng đối chiếu với code khác. Đã có **2 bug thứ tự** sống sót ~3 ngày trong repo này vì chúng type-check sạch, lint sạch, build sạch — chỉ lộ ra khi có người mở file Excel thật ra so.

### 3.2 Quy ước đặt tên sheet: tiền tố = người chịu trách nhiệm

Tab trong workbook đặt tên kiểu `ChiChu-Prohibited_Ingred`, `Tuan-Formula_BOM`. Tiền tố là **tên người sở hữu review sheet đó** (tên bị rút gọn vì Excel giới hạn 31 ký tự cho tên tab).

| Tiền tố | Vai trò | Số sheet (V18 → v2) |
|---|---|---|
| *(không tiền tố)* | Sheet hệ thống + 4 sheet PHASE + 9 sheet NPD mới | 10 → 19 |
| `George-` | R&I | 9 → 13 |
| `ChiChu-` | Regulatory | 9 → 9 |
| `Nguyen-` | Sales & Marketing | 6 → 6 |
| `Tuan-` | Formulation | 6 → 5 |
| `Lily-` | Packaging | 4 → 4 |
| `Chidkamon-` | Raw Material Operations | 3 → 3 |
| `Sankar-` | Quality | 3 → 1 |
| `Sekar-` | Quality & GMP | 3 → 2 |
| `Hannah-` | Supply Chain | 2 → 2 |

Ngoài ra, **dòng 1 (ô A1) của mỗi sheet nghiệp vụ** ghi rõ chuỗi review owner, đúng cấu trúc mà `ReviewOwnerSpec` mô hình hoá:

```
REVIEW OWNER: Tuan (Formulation)  |  Co-review: Sankar (Quality – Formula BOM & sensory testing)  |  Co-sign: Chris (Project Manager)
```

→ **owner** (chủ trì) · **co-review** (đồng thẩm định) · **co-sign** (đồng ký). Chris (Project Manager) đồng ký **mọi** sheet — trong code, `composeReviewOwner()` tự động nối Project Manager vào cuối danh sách co-sign nên `REVIEW_SPECS` không cần khai báo.

> ⚠️ **Sự thật đáng chú ý trong file nguồn v2:** 5 tab được đổi tên (`Tuan-Formulation_Safety` → `George-Formulation_Safety`, 3 tab `Sankar-` → `George-`, `Sekar-Stability_Release` → `Sankar-Stability_Release`) nhưng **dòng REVIEW OWNER bên trong sheet không được cập nhật theo**. Vậy nên tiền tố tab và nội dung A1 mâu thuẫn nhau ở đúng 5 sheet này. Đây là lỗi trong file nguồn, không phải lỗi transcribe của code. Code sửa **tên tab** theo `workbook.xml` của v2 nhưng **không** sửa `reviewOwner` — cố ý.

### 3.3 Cấu trúc một sheet PHASE (khung form của app)

Cả 4 sheet PHASE đều cùng một bố cục — đây chính là lý do `PhasePage.tsx` là **một** component dựng từ config chứ không phải 4 component riêng:

| Khối | Nội dung | Component tương ứng |
|---|---|---|
| R1 | REVIEW OWNER | caption trên đầu trang |
| R2–R4 | Banner phase + link tài liệu ngoài | header |
| R6 | **PROJECT IDENTIFICATION** — Project ID, Product Code, Project Lead, Product Group, Brand, Date opened, Target launch, SKU, Owner dept, Markets | `ProjectIdentificationCard` |
| R14 | **PHASE GATE FLOW** — 3 dòng gate: Stage status, Gate decision, Owner, Due date, Evidence link, Notes | `GateFlowTable` |
| — | **Các CHECKLIST section** — mỗi section có header riêng, cột `Select` (checkbox) + Owner + Status Y/N/NA + Evidence + Notes | `ChecklistSection` |
| — | **Các REQUIREMENT table** — Requirement / Minimum requirement / Rationale / Owner / Status | `RequirementTable` |
| R159 | **KEY GATE CHECKS** — 9 dòng (3 gate × 3 check), có Done + Y/N/NA + Date + Evidence + Initials | `GateChecksTable` |
| R171 | **8 ANGLES COVERAGE** | `EightAnglesTable` |
| R182 | **EVIDENCE SUMMARY, DECISION AND SIGN-OFF** — 3 vai: Prepared by / Reviewed by / Approved by | `SignOffBlock` |

Từ Phase 2 trở đi, ô **A20** của sheet chứa một ghi chú quan trọng (đã chép nguyên văn vào `PHASE_NOTES` trong `PhasePage.tsx`). Ví dụ Phase 2:

> *"Do not re-enter Phase 1 target user/product/market/claim selections here. Use those choices as inputs and record only ingredient, formula, costing, packaging and artwork decisions."*

Đây là nguyên tắc **không nhập lại dữ liệu ở phase sau** — mỗi thông tin có đúng một chỗ ở. Phase 1 không có ghi chú này (ô A20 của nó là header bảng).

---

## 4. Chi tiết 4 Phase / 12 Gate

### Bảng tổng

| Phase | Tên | Gate | Bộ phận chủ trì |
|---|---|---|---|
| **1** | User & Product Definition | SG01–03 | MARKETING / SALES / PROJECT OWNER |
| **2** | Ingredient & Formula Qualification | SG04–06 | NPD / R&I / PROCUREMENT / PACKAGING |
| **3** | Validation & Quality Control | SG07–09 | QUALITY / SAFETY / R&I / MANUFACTURING |
| **4** | Evidence, Release & Improvement | SG10–12 | REGULATORY / QUALITY / MANAGEMENT / SALES |
| **ALL** | Change Control & Communication | xuyên suốt | PROJECT OWNER / QA |

---

### PHASE 1 — Định nghĩa người dùng & sản phẩm

Giai đoạn "chưa động vào hoá chất". Toàn bộ là câu hỏi kinh doanh và định vị.

#### SG01 — Request & Opportunity
> *Capture request, opportunity, requester, business reason and first screening decision.*
> Chủ trì: **Project owner / Sales / NPD**

Có người đề xuất một ý tưởng sản phẩm ("khách hàng X muốn một loại kem chống rạn da cho bà bầu"). Gate này ghi nhận: ai yêu cầu, lý do kinh doanh, ràng buộc/deadline đã biết, và quyết định sàng lọc đầu tiên — *có đáng làm không?*

**3 Key Gate Check:** product request captured · project record opened + owner assigned · initial constraints/deadlines/risk flags recorded.

#### SG02 — Target User & Product Brief
> Chủ trì: **Project owner / Marketing / Regulatory**

Gate quan trọng nhất Phase 1, vì **nó quyết định luật nào sẽ áp dụng cho toàn bộ phần đời còn lại của dự án**. Ở đây chọn 4 checklist lớn:

- **Target Area of Body** (12 lựa chọn) — Face, Hair, Hands, Muscle, Skin (Whole Body), Feet, Nails, Internal, Eyes, Lips, Intimate Zone, Other
- **Product Type** (27 lựa chọn)
- **Target Users / Life Stage** (17 lựa chọn) — ⚠️ **đây là nơi trigger Skincare for Two**: `Pregnancy`, `Breastfeeding`, `Postpartum`. Ngoài ra có `Infant 0+`, `Child 2+`, `Sensitive skin`, `Swimmers`, `Cancer patient support`…
- **Target Countries / Markets** (21 lựa chọn) — quyết định bộ hồ sơ pháp lý ở Gate 10

Chọn `Pregnancy` ở gate này → **8 tháng sau Gate 07 sẽ bị hard-block** cho tới khi hoàn tất đánh giá an toàn cho mẹ + bé. Đó chính là cách hệ thống "nhớ" quyết định.

#### SG03 — Product Concept & Claims
> Chủ trì: **Marketing / Regulatory / R&I**

Chốt concept, hướng **claim** và nhu cầu bằng chứng. "Claim" = tuyên bố công dụng in trên bao bì hoặc dùng để bán hàng ("giảm 30% vết rạn sau 8 tuần"). Đây là vùng pháp lý nguy hiểm nhất của ngành mỹ phẩm: claim quá mạnh → sản phẩm bị xếp loại thuốc → sai khung pháp lý hoàn toàn.

- **Claim / Benefit Areas** (32 lựa chọn)
- **Initial Evidence / Proof Route** (12 lựa chọn) — bạn định chứng minh claim bằng gì? Clinical/human study · Authority monograph · TGA accepted reference · Peer-reviewed article · Supplier evidence · In-vitro test · … · `No evidence yet - action required`

Câu chốt trong phụ lục F1 cho Gate 3: *"a claim may remain under development, but unsupported wording must not be marked as approved"* — claim chưa có bằng chứng thì được phép tồn tại ở trạng thái nháp, nhưng **không được đánh dấu là đã duyệt**. Luật này hiện đã được enforce thật qua `unsupportedClaimRows()`.

> Phase 1 **không có requirement table nào** (`requirementSections: []`). Đó là lý do một số item bắt buộc của Gate 1/2 hiện vẫn ở dạng `manual` — không có field nào trong hệ thống đại diện cho chúng.

---

### PHASE 2 — Thẩm định nguyên liệu & công thức

Từ đây bắt đầu động vào hoá chất thật.

#### SG04 — Ingredient & Supplier Screening
> Chủ trì: **R&I / Regulatory / Procurement**

Sàng lọc **từng nguyên liệu**: nó là chất gì, ai cung cấp, có hồ sơ đầy đủ không, có bị cấm/hạn chế ở thị trường mục tiêu không.

**Raw Material Document Pack** (20 mục) là danh sách hồ sơ phải xin từ nhà cung cấp: Specification, **CoA**, **SDS**, **TDS**, Composition statement, Allergen statement, Impurity statement, Heavy metal statement, Residual solvent statement, Micro statement, Origin statement, GMO statement, Vegan statement, Halal/Kosher, Natural/organic certificate, Supplier questionnaire, Manufacturing process summary, Stability data, Regulatory status statement.

Sổ chính: `supplierRmEvidence` (sheet `Chidkamon-Supplier_RM`, 16 cột). Mỗi nguyên liệu định dùng phải có một dòng ở đây, và ô **`approvedForUse`** phải được tick thì mới được đưa vào công thức ở Gate 05.

#### SG05 — Formula, BOM & Costing
> Chủ trì: **R&I / Manufacturing / Finance**

**BOM** (Bill of Materials) = bảng công thức: từng nguyên liệu chiếm bao nhiêu **% w/w** (phần trăm khối lượng/khối lượng), giá bao nhiêu, tổng cộng thành giá vốn một đơn vị sản phẩm.

Requirement table `formulationDesign` (8 dòng) định nghĩa các thông số kỹ thuật bắt buộc: target pH + dải chấp nhận · appearance/colour/odour · texture/viscosity · fragrance requirement · key actives + target levels · compatibility constraints · formula exclusions · scale-up notes.

Requirement table `efficacyProcess` (5 dòng) bảo vệ hiệu quả qua sản xuất: mechanism-to-formula route · heat/light/pH sensitivity · pre-processing method · scale-up equivalence · finished product efficacy markers. (Nghĩa: một hoạt chất tốt vẫn có thể bị **phá huỷ trong quá trình sản xuất** nếu gia nhiệt quá lâu — phải khai báo trước giới hạn.)

Gate 05 hiện là gate có **nhiều điều kiện bắt buộc nhất** (13 Mandatory), vì nó là điểm **"formula lock"** — sau điểm này, đổi công thức phải qua change control.

#### SG06 — Packaging & Artwork Requirements
> Chủ trì: **Packaging / Artwork / Regulatory**

Bao bì không chỉ là thẩm mỹ: chai nhựa có thể **hút hoạt chất** ra khỏi kem (đó là "pack compatibility"), và nhãn in sai một dòng cảnh báo là vi phạm pháp lý. Checklist `artworkTriggers` (14 mục) chính là các cờ kích hoạt rà soát pháp lý.

---

### PHASE 3 — Kiểm chứng & kiểm soát chất lượng

Phase nặng nhất: **54 requirement row** trên 7 bảng.

#### SG07 — Maternal & Baby-Contact Safety ⛔ SAFETY-CRITICAL
> Chủ trì: **Safety / Scientific Review / Quality**

Gate được đánh dấu **HARD BLOCK** trong phụ lục F1. Đây là nơi luật C1 "Skincare for Two" phát huy tác dụng.

Nếu ở Gate 02 có chọn `Pregnancy` / `Breastfeeding` / `Postpartum`, thì **4 khối an toàn** phải hoàn tất mới được pass Gate 07:

| Section | Nội dung | Số dòng |
|---|---|---|
| `skincareForTwo` | Skincare for Two - Mandatory Safety Checks | 6 |
| `pregnancySafety` | Compartment 1 — Pregnancy (PRG-01…08) | 8 |
| `breastfeedingSafety` | Compartment 2 — Breastfeeding (BF-01…07) | 7 |
| `infantSafety` | Compartment 3 — Infant / Baby-Contact (INF-01…08) | 8 |
| `swimmerSafety` | Compartment 4 — Swimmer (SWM-01…14) | 14 |

Logic áp dụng (`SKINCARE_FOR_TWO_SECTIONS` trong `gateProgress.ts`): `skincareForTwo` và `infantSafety` **luôn** áp dụng khi C1 bật; `pregnancySafety` chỉ khi chọn `Pregnancy`; `breastfeedingSafety` khi chọn `Breastfeeding` **hoặc** `Postpartum`.

Vài khái niệm trong đó đáng biết:
- **MOS (Margin of Safety)** — tỷ số giữa liều an toàn đã biết và liều thực tế người dùng hấp thụ qua da. MOS ≥ 100 thường được coi là chấp nhận được.
- **Dermal exposure** — lượng chất thấm qua da, tính từ % trong công thức × lượng bôi × diện tích × tần suất.
- **Skin-to-skin / residue transfer** (BF-04) — mẹ bôi kem rồi ôm con, chất có truyền sang bé không.
- **Hand-to-mouth risk** (INF-03) — bé đưa tay lên miệng, có nguy cơ nuốt không.

#### SG08 — Testing, Methods & Validation
> Chủ trì: **Quality / R&I / Study owner**

Chọn các **testing family** cần chạy (20 lựa chọn): Stability accelerated/real time · Microbiological quality · **PET** (preservative efficacy test — thử xem chất bảo quản có diệt được vi khuẩn không) · Pack compatibility · pH/viscosity/appearance · Heavy metals · Residual solvents · 1,4-dioxane · Nitrosamines/NDELA · PAH · Pesticides · Safety/irritation/tolerance · Efficacy/potency retention · Sensory/user trial · Transport/leakage · Pilot batch/scale-up · …

Nếu có thử nghiệm trên người thì kích hoạt quy trình duyệt riêng 3 vai (luật C2): **Study Author → Department Reviewer → Independent Reviewer**, trong đó Independent Reviewer **bắt buộc khác phòng ban** với Study Author. Enforce ở `setStudyApprovalsBulk` (client) và `ProjectsService` (server, reject hẳn bằng `BadRequestException`).

#### SG09 — Stability, Compatibility & Release Readiness
> Chủ trì: **Quality / R&I / Manufacturing**

**Stability testing** = để sản phẩm ở điều kiện khắc nghiệt (thường 40°C/75% độ ẩm) trong 3–6 tháng, xem có tách lớp/đổi màu/mất hoạt tính không, để suy ra hạn dùng. Gate này chốt: đã đủ dữ liệu để **release** (xuất xưởng) chưa.

---

### PHASE 4 — Hồ sơ, ra mắt & cải tiến

Từ đây, **mỗi thị trường đi một nhịp riêng** (`marketTracks`).

#### SG10 — Regulatory Dossier & Claims Evidence
> Chủ trì: **Regulatory / Claims / Safety**

Gói toàn bộ bằng chứng thành hồ sơ nộp cơ quan quản lý. **PIF** (Product Information File) là hồ sơ bắt buộc theo quy định ASEAN/EU: chứa công thức, hồ sơ an toàn, bằng chứng claim, dữ liệu ổn định, thông tin nhà sản xuất.

Cũng ở đây, mọi **claim** trên bao bì/website phải được nối tới bằng chứng cụ thể (`claimEvidenceTraceability`, `skuClaimsPifRegister`).

#### SG11 — Production, Launch & Sales Support Sign-Off
> Chủ trì: **Manufacturing / Quality / Sales**

Chốt sản xuất và ra mắt. **Luật C5 hard-block:** một thị trường **không được** duyệt launch nếu PIF của chính thị trường đó chưa `Approved`. Sản phẩm có thể ra mắt ở Việt Nam trong khi vẫn bị chặn ở EU — hoàn toàn hợp lệ.

**GMP** (Good Manufacturing Practice) = chuẩn sản xuất. Lưu ý ranh giới đã chốt: *"MBc360 must NOT generate or maintain GMP documents"* — app chỉ giữ **link** sang hệ thống GMP (register `gmpLinks`), không tự sinh Batch Manufacturing Record.

#### SG12 — Post-Market Monitoring & Improvement
> Chủ trì: **Quality / PV/PMS / Project owner**

Sau khi bán ra thị trường: thu thập phản hồi, khiếu nại, **adverse event** (sự cố bất lợi — người dùng bị kích ứng), tín hiệu **PV/PMS** (Pharmacovigilance / Post-Market Surveillance), rồi mở **CAPA** (Corrective And Preventive Action) khi cần.

Gate 12 cố ý **không** yêu cầu phải có bản ghi CAPA — một sản phẩm không có khiếu nại nào thì đúng là không có CAPA nào; cơ chế "N/A kèm lý do" là lối thoát đúng ở đây.

---

### Xuyên suốt — Change Control & Communication

Không thuộc gate nào (`gate: 'ALL'`). Bất kỳ thay đổi nào về công thức / nhãn / artwork / claim sau khi đã chốt đều phải đi qua đây. `ChangeStatus` có 11 giá trị, trong đó 7 được coi là **open**: Draft, Submitted, Under Review, Approved–Implementation Pending, In Implementation, Verification Pending, On Hold.

Một change đang mở sẽ **soft-lock** gate liên quan (luật C4/F9): hiện cảnh báo, **bắt user acknowledge trước khi ghi gate decision**, và chặn `Proceed` thuần.

---

## 5. Bộ luật vận hành (A / B / C rules)

Đây là phần **bắt buộc thuộc** nếu bạn định sửa code nghiệp vụ. Nguồn: `docs/Business_Rules_Confirmation_{EN,VN}.md`. Mã rule (A1, B3, C1…) được trích dẫn khắp nơi trong code comment.

### Nhóm A — Kiến trúc dữ liệu

| Mã | Nội dung đã chốt |
|---|---|
| **A1** | **Mô hình lai:** một luồng phát triển chung cho Gate 1–9; Gate 10–12 theo dõi **riêng từng thị trường** (PIF status, Regulatory status, Claims approval, Launch approval, notes, dates). |
| **A2** | Phiên bản công thức mới **mở lại (backtrack) Gate 4–9** trên chính project cũ — **không** tạo project mới. Phase 1 giữ nguyên. Thay đổi Major tự động tạo formula version mới, lưu lại version cũ để truy vết. |
| **A3** | **Cosmetri là hệ thống master data** cho nguyên liệu/nhà cung cấp. MBc360 **read-only** với Cosmetri, chỉ lưu bằng chứng riêng của project + link. Nguyên liệu mới đi qua change request trên **Power Apps** → duyệt → nhập vào Cosmetri → mới xuất hiện qua API. |
| **A4** | **RBAC bắt buộc:** chỉ Regulatory duyệt quyết định pháp lý, chỉ Quality duyệt mục Quality, chỉ Safety duyệt mục safety. **Contribute ≠ approve.** Lịch sử phê duyệt điện tử phải được giữ lại. |
| **A5** | BOM được phép **nhập tay** trong giai đoạn bench đầu; nhưng phải đánh dấu **"Draft – Not Reconciled with Cosmetri"**, và **phải reconcile trước Gate 7**. Gate 10 & 11 bắt buộc dùng đúng formula + version có kiểm soát của Cosmetri. |

### Nhóm B — Vòng đời Gate / Phase

| Mã | Nội dung đã chốt |
|---|---|
| **B1** | Một gate chỉ PASS khi đủ **cả 4**: (1) Stage status = `Complete`; (2) Gate decision ∈ {`Proceed`, `Proceed with Conditions`}; (3) đủ sign-off bắt buộc; (4) đủ bằng chứng bắt buộc. `Complete` mà chưa có decision → vẫn **Pending**. `Gap` chặn `Proceed` thuần. |
| **B2** | Mỗi gate có **nhiều** Next Action (danh sách, không phải 1 dòng). Action còn mở **chỉ được phép** khi decision là `Proceed with Conditions`. |
| **B3** | Phase COMPLETE khi đủ **cả 5**: (a) mọi gate của phase đã pass; (b) mọi Key Gate Check Done/Y hoặc **N/A có lý do**; (c) đủ 8 Angles; (d) đủ **cả 3** vai ký (Prepared/Reviewed/Approved); (e) mọi Next Action đã đóng — trừ khi `Proceed with Conditions`. Sign-off **chỉ mở ra sau khi** các phần trên xong (thứ tự bắt buộc, không song song). |
| **B4** | Backtrack **không bao giờ xoá gì**. Status reset, phê duyệt cũ bị vô hiệu, phải ký lại — nhưng phê duyệt cũ và bằng chứng cũ **vẫn nằm trong lịch sử**, cộng thêm một **Backtrack Event Log** ghi ai/khi nào/lý do/gate nào bị ảnh hưởng/quyết định cũ. Được phép backtrack qua bất kỳ phase nào nếu có lý do. Nguyên tắc: **no silent corrections**. |
| **B5** | Được phép nhập **pre-work** trên phase chưa mở (gate decision/sign-off vẫn khoá). Dữ liệu nhập sớm phải hiện rõ **"Pre-work / Entered Before Gate Opened"**; khi phase mở, owner phải **review & accept** thì nó mới được tính vào điều kiện hoàn thành. |

### Nhóm C — Luật nghiệp vụ cụ thể

| Mã | Nội dung đã chốt |
|---|---|
| **C1** | **Skincare for Two** tự động kích hoạt khi target user gồm `Pregnancy` / `Breastfeeding` / `Postpartum`. Khi đã kích hoạt: đánh giá an toàn cho mẹ **VÀ** tiếp xúc với trẻ đều bắt buộc. **Gate 7 không thể pass** cho tới khi cả hai xong. ⚠️ **`Infant 0+` một mình KHÔNG kích hoạt** Skincare for Two (F2) — nó kích hoạt một *Infant & Baby Safety workflow riêng* (chưa xây, chờ nội dung). |
| **C2** | Study/Human Trial dùng workflow duyệt **riêng** 3 vai: Study Author / Department Reviewer / Independent Reviewer. Đây là **vai trò, không phải tên người**. Hệ thống **phải chặn** Independent Reviewer cùng phòng ban với Study Author. |
| **C3** | Kiểm tra thành phần cấm là **tự động**: mỗi khi nhập BOM, hệ thống tự đối chiếu với Prohibited Ingredients, PB Caution list, danh sách hạn chế theo thị trường và danh sách nội bộ, rồi gắn cờ ngay. Thứ tự khớp: Cosmetri RM id → INCI → CAS → synonym/group → **manual review** khi không chắc. Cờ tự động chỉ là **screening**, không thay thế đánh giá chuyên môn. |
| **C4** | Change Control **gắn trực tiếp vào gate**: một change đang mở tạo **soft lock / cảnh báo** trên gate bị ảnh hưởng cho tới khi được đánh giá và đóng. |
| **C5** | **Hard block, quản lý theo từng thị trường:** PIF chưa hoàn tất thì chặn launch approval, chặn external claims, chặn thông tin cho distributor và cho HCP. |
| **C6** | Mọi thông tin công bố ra ngoài (website, brochure, tài liệu kỹ thuật, tài liệu distributor, thuyết trình, tài liệu HCP, **nội dung do AI sinh**, social media, product claim) phải qua **Published Information Approval workflow** trước khi phát hành. 12 trạng thái, có Technical Reviewer + Regulatory Reviewer + Final Approver. |
| **C7** | Không phải cả 37 register đều hard-block. Dùng **phân tầng 3 mức**: **Mandatory** (hard-block) · **Conditional** (chỉ block khi bị trigger bởi product type/user/market/claim/change) · **Supporting** (thiếu vẫn qua, chỉ cảnh báo). Kèm một **Gate Readiness panel** cho mỗi gate với 4 kết quả: `Not Ready` / `Ready with Conditions` / `Ready for Decision` / `Passed`. |

### Nhóm D — Thẩm quyền vòng đời project (do project owner quyết, không hỏi SME)

**D1** chỉ System Administrator được xoá project (xoá luôn audit trail, chừa lại một tombstone record) · **D2** chỉ Project Owner được archive/restore · **D3** project đã archive là **read-only với tất cả mọi người**, kể cả admin · **D4** bất kỳ user đăng nhập nào cũng được tạo project · **D5** yêu cầu "Project owner" của Gate 1 được thoả mãn tự động.

### 14 follow-up F1–F14 (trạng thái)

13/14 đã đóng. Chỉ **F12** còn thực sự mở (phụ thuộc Cosmetri xác nhận có phủ compliance ASEAN/Việt Nam hay không — ngoài tầm kiểm soát của team).

Đáng chú ý nhất với dev:
- **F1** → đẻ ra toàn bộ `gateReadiness.ts` (danh sách bắt buộc theo từng gate 1–12, phụ lục cuối file `Business_Rules_Confirmation_EN.md`)
- **F5** → `MAJOR_CHANGE_CRITERIA` trong `config/changeTriggers.ts`
- **F8** → 6 status + 4 priority của `NextAction`; `Critical` chặn cả `Proceed with Conditions`
- **F9** → `ChangeStatus` 11 giá trị + `isChangeOpen()`
- **F11** → `PUBLISHED_INFO_STATES` 12 giá trị
- **F14** → `BomLine.reconciled` + check `bomReconciled`

---

## 6. Từ workbook sang code — bản đồ ánh xạ

Đây là bảng bạn sẽ tra nhiều nhất trong tuần đầu:

| Khái niệm workbook | Ở đâu trong code |
|---|---|
| 4 Phase, 12 Gate, metadata gate | `packages/shared/src/config/gates.ts` — `PHASES`, `GATES`, `EIGHT_ANGLES` |
| Nội dung một sheet PHASE (checklist / requirement / key gate check) | `packages/shared/src/config/phases.ts` — `PHASE_CONFIGS[1..4]` |
| ~76 sheet sổ bằng chứng | `packages/shared/src/config/registers.ts` — `REGISTER_CONFIGS` |
| Nhóm sidebar "WORKBOOK BY RESPONSIBILITY" | `registers.ts` — `DEPARTMENTS` + `getNavGroups()` |
| Dòng "REVIEW OWNER" của mỗi sheet | `packages/shared/src/config/reviewers.ts` — `REVIEW_ROLES`, `REVIEW_SPECS`, `composeReviewOwner()` |
| Danh sách bằng chứng bắt buộc theo gate (phụ lục F1) | `packages/shared/src/config/gateReadiness.ts` — `GATE_READINESS` |
| **Toàn bộ luật pass/lock/complete** | `packages/shared/src/utils/gateProgress.ts` |
| Watch-list thành phần cấm (C3) | `packages/shared/src/utils/ingredientWatch.ts` |
| Tiêu chí Major/Minor change (F5) | `packages/shared/src/config/changeTriggers.ts` |
| Bảng trạng thái Evidence Summary | `packages/shared/src/config/evidence.ts` — `EVIDENCE_AREAS` |

### Nguyên tắc thiết kế then chốt: **config-driven, không hardcode từng phase**

Vì cả 4 sheet PHASE cùng bố cục, app dựng mỗi trang phase từ **config + 6 component dùng chung**, không phải 4 component riêng:

```
PHASE_CONFIGS[phase]  ──►  PhasePage.tsx  ──►  ProjectIdentificationCard
                                               GateFlowTable
                                               ChecklistSection    (×N)
                                               RequirementTable    (×N)
                                               GateChecksTable
                                               EightAnglesTable
                                               SignOffBlock
```

Tương tự, `RegisterHubPage.tsx` + `DynamicTable.tsx` dựng bất kỳ register nào từ `RegisterConfig`.

> **Quy tắc bất di bất dịch:** khi cần thêm một section phase mới hoặc một sổ bằng chứng mới → **sửa/thêm một entry config**, không viết component mới. Chỉ viết trang riêng khi hình dạng dữ liệu thực sự không vừa 6 khối trên (hiện có 13 trang như vậy: BOM, Formulation Safety, 4 trang NPD…).

### `mode: 'register'` vs `mode: 'fixed'`

| | `'register'` | `'fixed'` |
|---|---|---|
| Nguồn dòng | user tự Add / Delete | dòng định sẵn trong `fixedRows` |
| Khi tạo project mới | mảng **rỗng** | **copy** nguyên `fixedRows` |
| Ý nghĩa | sổ ghi chép tự do | bảng tham chiếu có sẵn, user chỉ chú thích (status/evidence/notes) |

**Hệ quả quan trọng:** với register `mode: 'fixed'`, check `registerHasRows` **luôn đúng** ngay khi tạo project → nó **không bao giờ chặn được gì**. Đây là một lớp bug thật đã xảy ra (xem mục 11).

---

## 7. Mô hình dữ liệu

Canonical: `packages/shared/src/types/index.ts`. (⚠️ Data model trong `docs/APP_PLAN.md` §3 là bản demo giai đoạn 1 **đã lỗi thời** — nó còn ghi decision là `Go`/`Conditional Go`, không còn đúng.)

```ts
ProjectData {
  identity            ProjectIdentity            // nhận dạng + 13 reviewer được gán
  gates               GateRecord[]               // 12 dòng SG01…SG12
  checklists          Record<string, ChecklistItem[]>    // key = tên section
  requirements        Record<string, RequirementItem[]>  // key = tên section
  gateChecks          GateCheck[]                // Key Gate Checks (phẳng)
  phaseClosures       Record<number, PhaseClosure>       // 8 angles + sign-off + pre-work
  bom                 BomLine[]                  // công thức
  packagingBom        PackagingBomLine[]
  costing             CostingInputs
  evidence            EvidenceItem[]
  capa                CapaRecord[]
  feedback            FeedbackEntry[]
  registers           Record<string, RegisterRow[]>      // key = RegisterConfig.key
  nextActions         NextAction[]
  backtrackEvents     BacktrackEvent[]           // bất biến (B4)
  gateChangeLog       GateChangeLogEntry[]       // bất biến
  marketTracks        MarketTrack[]              // A1 — theo từng thị trường
  studyApprovals      StudyApproval[]            // C2
  formulaVersion      string                     // "F1.0"
  formulaVersionHistory  FormulaVersionRecord[]  // A2
}
```

> ⚠️ **Tên dễ đoán sai:** type thật là `RequirementItem` (không phải `RequirementRow`), `GateCheck` (không phải `GateCheckRow`), `FeedbackEntry` (không phải `FeedbackRecord`).

Ba nhóm dữ liệu có tính chất khác hẳn nhau, và đây là điểm quan trọng nhất cần nắm:

| Nhóm | Ví dụ | Tính chất |
|---|---|---|
| **Current state** (sửa được) | `gates`, `checklists`, `registers`, `bom` | Phản ánh hiện trạng; bị khoá read-only khi gate liên quan đã pass |
| **Append-only** (không bao giờ sửa/xoá) | `backtrackEvents`, `gateChangeLog`, `formulaVersionHistory` | Audit trail. Đây là thứ hiện thực hoá "no silent corrections" |
| **Per-market** | `marketTracks` | Một dòng cho mỗi thị trường; Gate 10–12 chạy song song độc lập |

`RegisterRow` là `Record<string, string | number | boolean | undefined>` — cột thực do `RegisterConfig` khai báo, không có type-safety ở đây. Đó là cái giá phải trả để một component (`DynamicTable`) render được 76 sheet khác nhau.

### Guard nghiệp vụ nằm ở đâu (quan trọng — đã thay đổi)

Sau khi hoàn tất M3, **Zustand store không còn enforce bất kỳ luật nào**. Mọi guard đã chuyển sang server (`apps/api/src/projects/projects.service.ts`); store chỉ còn là proxy HTTP.

| Guard | Ở đâu | Làm gì |
|---|---|---|
| `assertCanDecide` | server | RBAC — chỉ chạy khi patch **có** `decision`; nhập evidence vẫn mở cho mọi người (A4) |
| `assertMutable` | server | Project đã archive → 403 với mọi mutation (D3) |
| `isGateRefLocked` | shared, gọi từ cả 2 phía | Gate đã pass → evidence liên quan read-only (B4) |
| `hardGateBlockers` | shared, gọi từ cả 2 phía | Chặn gate decision khi thiếu bằng chứng bắt buộc (F1/C7) |
| C5 | server | Launch approval bị giữ nguyên nếu PIF chưa `Approved` |
| C2 | server | Independent Reviewer trùng dept → reject hẳn |
| Optimistic lock | server | `expectedVersion` sai → 409 Conflict |

**Nguyên tắc "guard parity":** cả UI và server đều gọi **cùng một hàm thuần** trong `packages/shared` — không bao giờ viết lại logic ở hai nơi. UI disable nút để trải nghiệm tốt; server từ chối để thực sự an toàn.

---

## 8. Gate Readiness Engine — trái tim của hệ thống

Nếu chỉ có thời gian đọc **một** file, đọc `packages/shared/src/utils/gateProgress.ts`.

### 8.1 Khi nào một gate PASS

```ts
isGatePassed(project, gateId) =
     record.status === 'Complete'
  && record.decision ∈ { 'Proceed', 'Proceed with Conditions' }
  && gateBlockers(project, gateId).length === 0
```

### 8.2 Nguồn duy nhất: `gateReadinessChecklist()`

Hàm này trả về **mọi** item của một gate, kèm cờ `satisfied`. Hai hàm blocker chỉ là filter trên nó — nên chúng **không thể lệch nhau**:

```
gateReadinessChecklist(project, gateId, decisionOverride?)
        │  trả về TẤT CẢ item, cả đã thoả lẫn chưa
        ├─► gateBlockers()      = .filter(!satisfied && !pending && !advisory)
        └─► hardGateBlockers()  = gateBlockers + điều kiện .hardBlock
```

Panel "What's blocking Gate X" hiển thị **cả item đã thoả** (màu xanh, dấu ✓) chứ không ẩn đi — đây là quyết định thiết kế có chủ ý: user cần thấy "đã kiểm tra và đạt", không phải thấy một danh sách trống rồi tự hỏi hệ thống có kiểm tra gì không.

### 8.3 Ba trạng thái đặc biệt của một item

| Cờ | Nghĩa | Có chặn không |
|---|---|---|
| `pending` | check `kind: 'manual'` — chưa có nguồn dữ liệu để tự đánh giá | **Không** |
| `advisory` | tier là `Conditional` hoặc `Supporting` | **Không** |
| *(không cờ)* | tier `Mandatory`, đã wire vào dữ liệu thật | **Có** |

> ⚠️ **Điểm dev hay hiểu sai:** theo luật C7, `Conditional` *đáng lẽ* phải hard-block khi trigger của nó active. Nhưng trong code hiện tại, mọi item Conditional đều bị gắn `advisory: true` và bị lọc khỏi blocker → **Conditional hiện KHÔNG bao giờ hard-block**. Trường hợp duy nhất thực sự có "răng" là Skincare for Two, vì nó được push riêng ở SG07 bằng một item chuyên biệt (`id: 'skincare-for-two'`, `hardBlock: true`) **không** đi qua vòng lặp config.

### 8.4 Các loại check (`ReadinessCheck.kind`)

16 kind. Nhóm theo nguồn dữ liệu:

| Nhóm | Kind | Ghi chú |
|---|---|---|
| Trang phase | `gateCheckDone`, `checklistHasSelection`, `requirementDone` | `gateCheckDone` là tín hiệu chính của Gate 1–5 |
| Register | `registerHasRows`, `registerColumnFilled`, `registerNoBadRows`, `registerRowsComplete` | xem cảnh báo bên dưới |
| BOM | `bomHasLines`, `bomIdentityComplete`, `bomReconciled` | |
| Gate record | `gateFieldFilled` | dùng cho 12 item `sgXX-signoff` |
| Đặc biệt | `skincareForTwo`, `allOf`, `manual` | `allOf` gộp nhiều check thành **một** dòng hiển thị |
| Chưa dùng | `nextActionsClosed`, `identityFieldFilled` | định nghĩa sẵn nhưng hiện không item nào dùng |

🔴 **Cảnh báo vacuous truth — đọc kỹ chỗ này:**

`registerColumnFilled` dùng `.every()`. Trên một register **rỗng**, `.every()` trả `true` → check **tự động thoả mãn dù chưa ai nhập gì**. Đây là một lớp bug đã thực sự xảy ra nhiều lần trong repo này.

Hai cách phòng:
1. Luôn ghép một `registerColumnFilled` Mandatory với một `registerHasRows` Mandatory trên **cùng register**, ở cùng gate hoặc gate sớm hơn.
2. Hoặc dùng `registerRowsComplete` — được thiết kế **cố ý không vacuous** (`rows.length > 0 && rows.every(...)`).

Và nhớ: với register `mode: 'fixed'`, `registerHasRows` cũng vacuous vì rows được seed sẵn.

### 8.5 Hiện trạng: bao nhiêu đã thực sự được enforce

Tổng **124 item** trên 12 gate: **107 Mandatory** / 12 Conditional / 5 Supporting. Trong đó **14 item vẫn là `kind: 'manual'`** (chưa wire) → **96/107 Mandatory đang thực sự chặn**.

| Gate | Item | Mandatory | Còn `manual` |
|---|---|---|---|
| SG01 | 7 | 7 | 3 |
| SG02 | 11 | 11 | 2 |
| SG03 | 10 | 7 | 2 |
| SG04 | 8 | 6 | 0 |
| SG05 | 15 | 13 | 2 |
| SG06 | 7 | 6 | 0 |
| SG07 | 15 | 14 | 0 |
| SG08 | 8 | 7 | 0 |
| SG09 | 9 | 7 | 0 |
| SG10 | 15 | 14 | 2 |
| SG11 | 12 | 12 | 3 |
| SG12 | 7 | 3 | 0 |

14 item còn `manual` **không phải do lười** — mỗi cái là một trong ba tình huống: (a) không có field nào trong hệ thống đại diện cho nó (Gate 1/2 — Phase 1 không có requirement table); (b) cần một khái niệm dữ liệu chưa tồn tại (Gate 3 — "claim risk tier"); (c) bản chất là **per-market** nên một check ở cấp project sẽ hoặc pass sai hoặc block sai (Gate 10/11 — đó là follow-up F4).

### 8.6 Khoá & mở khoá

Hai cơ chế khoá độc lập, đừng nhầm:

**a) `isGateUnlocked(project, gateId)` — dòng Gate Flow nào được sửa.**
```ts
gateIndex(gateId) === currentGateIndex(project)   // so sánh NGHIÊM NGẶT ===
```
**Đúng một** gate được mở tại một thời điểm. Gate đã pass **không** sửa được nữa — muốn sửa phải Backtrack. (Trước đây code dùng `<=`, mâu thuẫn với chính doc comment của nó, và cho phép sửa lén gate đã đóng — đã sửa.)

**b) `isGateRefLocked(project, gateRef)` — evidence nào read-only.**
```ts
gateRefGateIds('04/07') = ['SG04', 'SG07']
→ khoá chỉ khi MỌI gate trong ref đã pass
→ gateRef 'ALL' hoặc undefined → không bao giờ khoá
```
`gateRef` chấp nhận cả `/` và `-` (`'04/07'`, `'05/07/10'`, `'08-09'`). Chỗ dấu `-` từng là bug thật: `phases.ts` viết `'08-09'` trong khi mọi register dùng `/`, nên section đó **không bao giờ khoá được**.

---

## 9. Ai chịu trách nhiệm cái gì

Workbook mã hoá trách nhiệm bằng **tiền tố tên tab**. Khi số hoá, cái đó tách làm hai:

- **VÙNG trách nhiệm** = config (`REVIEW_ROLES`, 13 vai) — cố định
- **NGƯỜI cụ thể** = dữ liệu per-project (`ProjectIdentity.reviewers`) — form Create New Project bắt nhập **cả 13**, đều bắt buộc

13 vai, **thứ tự là load-bearing** (khớp với thứ tự nhóm sidebar `DEPARTMENTS`):

| # | key | Vai | Tên mặc định (demo) |
|---|---|---|---|
| 1 | `project-manager` | Project Manager | Chris |
| 2 | `ri` | R&I | George |
| 3 | `raw-material` | Raw Material Operations | Chidkamon |
| 4 | `formulation` | Formulation | Tuan |
| 5 | `quality` | Quality | Sankar |
| 6 | `quality-gmp` | Quality & GMP | Sekar |
| 7 | `regulatory` | Regulatory | Chi Chu |
| 8 | `packaging` | Packaging | Lily |
| 9 | `sales-marketing` | Sales & Marketing | Nguyen |
| 10 | `supply-chain` | Supply Chain | Hannah |
| 11 | `facility-pm` | Facility / PM Operations | Kaukab |
| 12 | `hr-quality` | HR/Quality | Lani |
| 13 | `digital-platforms` | Digital / Platforms | Anki |

Project Manager đứng đầu vì **đồng ký mọi vùng**; 3 vai cuối không sở hữu sheet nào, chỉ co-review/co-sign.

**Đây là 13 vai *review sheet*, khác với 17 `SSO_ROLES`** dùng cho phân quyền đăng nhập (Project Owner, Safety Reviewer, Regulatory Reviewer, Study Author, Final Approver, System Administrator, Read-only Viewer…). Hai danh sách không map 1:1 — đó là lý do dropdown chọn reviewer trên form Create Project **không lọc theo role**, chỉ hiện role như gợi ý.

Ma trận quyền thật (role × capability) nằm trong DB, sửa được ở trang **Roles** (`RoleCapabilityEditor`). Giá trị khởi tạo hiện là suy ra bằng keyword-match, **chưa** phải ma trận do SME xác nhận — đó là phần còn mở của F6.

---

## 10. Tích hợp bên ngoài

| Hệ thống | Vai trò | Chiều |
|---|---|---|
| **Cosmetri** | Master data nguyên liệu / công thức / compliance (INCI, CAS) | **Chỉ đọc.** Không bao giờ gọi `PUT /raw-material/update` |
| **Power Apps** | Change request "tạo nguyên liệu mới" | Ra ngoài (chỉ là URL) |
| **Microsoft Entra ID** | Đăng nhập SSO + đồng bộ department từ Graph | Vào |
| **Hệ thống GMP** | Hồ sơ sản xuất | **Chỉ link.** MBc360 cố ý không sinh tài liệu GMP |

Câu chốt định vị hệ thống, đáng thuộc:

> *"MBc360 becomes the company's **single evidence and governance platform**, while **integrating with specialist systems** (such as Cosmetri and GMP Manufacturing) **rather than replacing them**."*

Đọc: đây **không** phải ERP, **không** phải LIMS, **không** phải hệ thống MES. Nó là lớp **quản trị bằng chứng và phê duyệt** nằm trên các hệ thống chuyên biệt.

---

## 11. Những cạm bẫy đã trả giá

Đây là các lỗi **đã thực sự xảy ra** trong repo này. Chúng đều type-check sạch, lint sạch, build sạch.

**1. Vacuous truth trên register rỗng.** `registerColumnFilled` với `.every()` trên register rỗng = `true`. Một check Mandatory kiểu này trông có vẻ nghiêm ngặt nhưng **không chặn gì cả**. → Luôn ghép với `registerHasRows`, hoặc dùng `registerRowsComplete`.

**2. `registerHasRows` trên register `mode: 'fixed'`.** Rows được seed sẵn lúc tạo project → luôn `true`. Đã có 2 check thật mắc lỗi này (`sg03-npd-target-product-progress`, `sg05-npd-target-product-content`) — sửa thành `registerColumnFilled` trên một cột câu trả lời thực sự bắt đầu bằng rỗng.

**3. Typo trong tên register/column/section.** Một check trỏ tới `'supplierRMEvidence'` (sai hoa thường) **không báo lỗi** — nó chỉ đơn giản không bao giờ thoả mãn, và **chặn gate đó vĩnh viễn**. → Sau khi sửa `gateReadiness.ts`, chạy pass kiểm tra: mọi chuỗi `register`/`column`/`section`/`requirement`/`gateCheck` phải tồn tại thật trong config **và** trong một project vừa scaffold.

**4. Thứ tự hiển thị lệch với workbook.** 2 bug thứ tự sống ~3 ngày. → Đối chiếu `xl/workbook.xml`, không đối chiếu code khác. *(Ngoại lệ: các remap nghiệp vụ user đã chốt — ví dụ 10 sheet R&I xếp dưới nhóm "Quality", hay "Raw Material Operations" đứng trước "Formulation" — là cố ý, không phải bug.)*

**5. `Complete` vs `Completed`.** `StageStatus` dùng `Complete`; `WorkStatus` dùng `Completed`. So sánh nhầm = luôn false.

**6. `useDraft` so sánh theo giá trị, không theo tham chiếu.** Nhiều caller derive `committed` inline (`.filter()`, `.map()`, `?? []`) → mảng mới mỗi render. Nếu so sánh theo tham chiếu thì resync mỗi render → **vòng lặp cập nhật vô hạn** ("Maximum update depth exceeded", đã crash thật lần đầu ship).

**7. Ghi store theo từng phím gõ.** Store được `persist` vào localStorage → mỗi keystroke `JSON.stringify` toàn bộ store. → **Luôn** dùng `useDraft` + `SaveBar`; store chỉ có bulk setter.

**8. `apps/web/tsconfig.json` có `files: []`.** Chạy `npx tsc --noEmit` ở đó **không kiểm tra gì cả** và luôn exit 0. → Dùng `npx tsc --noEmit -p apps/web/tsconfig.app.json`.

**9. Prisma 7 `migrate reset` KHÔNG chạy seed** dù đã khai `migrations.seed` trong `prisma.config.ts`. Nó báo thành công và để lại database rỗng. → Luôn chạy seed như một bước riêng, hoặc dùng `npm run db:setup` / `npm run db:reset`.

---

## 12. Lộ trình tự học trước khi code

### Ngày 1 — Nghiệp vụ (không mở code)

1. Đọc mục 1–5 của tài liệu này.
2. Mở `docs/MBc360 Master Product Development System File v2.xlsx` bằng Excel/Numbers. Đọc kỹ 3 sheet: `Introduction`, `Guide To Using This Document`, `Stage_Map`.
3. Mở sheet `PHASE1 G1-3 MKTG`, cuộn từ trên xuống dưới. Nhận ra 7 khối ở mục 3.3.
4. Đọc `docs/Business_Rules_Confirmation_VN.md` — **cả file**. Đây là hợp đồng nghiệp vụ.

### Ngày 2 — Code, theo thứ tự này

```
1. packages/shared/src/types/index.ts        ← mô hình dữ liệu
2. packages/shared/src/config/gates.ts       ← 12 gate là gì
3. packages/shared/src/config/phases.ts      ← nội dung một trang phase
4. packages/shared/src/utils/gateProgress.ts ← ⭐ TOÀN BỘ LUẬT ở đây
5. packages/shared/src/config/gateReadiness.ts ← điều kiện từng gate
6. apps/web/src/pages/PhasePage.tsx          ← config biến thành UI thế nào
7. apps/web/src/components/GateFlowTable.tsx ← nơi luật gặp người dùng
```

### Ngày 3 — Chạy thật và tự chứng minh

```bash
docker compose -f docker-compose.dev.yml up -d
npm run db:setup      # BẮT BUỘC sau khi clone mới hoặc reset volume
npm run dev
```

Rồi tự làm 4 bài tập sau — mỗi bài dạy một luật:

| Bài | Làm gì | Học được luật |
|---|---|---|
| 1 | Tạo project mới, mở Phase 1, thử đặt Gate 01 = `Complete` + `Proceed` ngay | B1 + F1 — xem panel "What's blocking Gate 01" liệt kê thiếu gì |
| 2 | Ở Gate 02 tick `Pregnancy` trong Target Users, rồi mở trang Phase 3 | C1 — thấy 4 compartment an toàn xuất hiện và Gate 07 bị chặn |
| 3 | Pass Gate 01–03, rồi quay lại thử sửa một checklist của Phase 1 | B4 — read-only + banner khoá; muốn sửa phải Backtrack |
| 4 | Backtrack từ Gate 05 về Gate 02, rồi mở Project Overview | B4 — sign-off bị vô hiệu, nhưng `backtrackEvents` giữ nguyên bản cũ |

Mở trang **Gate Rules & Sheet Map** (nhóm System Guide & Reference) — nó liệt kê cả 64 tab workbook đối chiếu với 2 luật (cái gì chặn gate, cái gì bị khoá) và dựng timeline 12 gate cho chính project bạn đang mở. Trang này derive hoàn toàn từ config + rule engine nên **không thể lệch** với hành vi thật.

### Trước mỗi PR động vào nghiệp vụ — checklist

- [ ] Thay đổi này ứng với mã rule nào (A/B/C/D/F)? Nếu không ứng với cái nào → đó là **dev decision**, phải ghi vào `docs/F1_Per_Gate_Open_Questions.md` để SME xác nhận sau. *(Đây là chỉ đạo thường trực từ user: một phán đoán do dev tự đưa ra không được miễn xác nhận chỉ vì user đã duyệt tại chỗ.)*
- [ ] Luật mới có được enforce ở **cả** UI và server bằng **cùng một hàm** trong `packages/shared` không?
- [ ] Nếu thêm check Mandatory: có bị **vacuous** trên dữ liệu rỗng không? Mọi chuỗi tên có tồn tại thật trong config không?
- [ ] Nếu đụng thứ tự hiển thị: đã đối chiếu `xl/workbook.xml` chưa?
- [ ] Nếu đổi shape `ProjectData`: đã bump persist version chưa? (`migrate` re-seed chứ không migrate)
- [ ] Đã cập nhật **cả** code **và** `docs/Business_Rules_Confirmation_{EN,VN}.md` chưa? (bảng follow-up trong đó do đội nghiên cứu đọc — không dùng thuật ngữ code)

---

## Phụ lục A — Từ điển thuật ngữ ngành

**Nguyên liệu & công thức**

| Viết tắt | Đầy đủ | Nghĩa |
|---|---|---|
| **BOM** | Bill of Materials | Bảng công thức: nguyên liệu nào, bao nhiêu %, giá bao nhiêu |
| **RM** | Raw Material | Nguyên liệu thô |
| **INCI** | International Nomenclature of Cosmetic Ingredients | Tên chuẩn quốc tế của thành phần mỹ phẩm, dùng in trên nhãn (ví dụ `Aqua`, `Butyrospermum Parkii Butter`) |
| **CAS** | Chemical Abstracts Service number | Mã số định danh duy nhất toàn cầu cho một chất hoá học — chính xác hơn tên INCI |
| **% w/w** | weight/weight | Phần trăm khối lượng trên khối lượng |
| **Active** | — | Hoạt chất — thành phần tạo ra công dụng chính |
| **Excipient / Carrier** | — | Tá dược/chất mang — nền để đưa hoạt chất lên da |
| **Preservative** | — | Chất bảo quản, chống vi khuẩn/nấm mốc |
| **Allergen** | — | Chất gây dị ứng; EU bắt buộc khai báo 26 chất trong hương liệu |
| **Impurity** | — | Tạp chất sinh ra trong sản xuất |

**Hồ sơ nhà cung cấp**

| Viết tắt | Đầy đủ | Nghĩa |
|---|---|---|
| **CoA** | Certificate of Analysis | Phiếu phân tích cho **một lô hàng cụ thể** |
| **SDS** | Safety Data Sheet | Phiếu an toàn hoá chất (xử lý, sơ cứu, PCCC) |
| **TDS** | Technical Data Sheet | Thông số kỹ thuật chung của nguyên liệu |
| **Specification** | — | Bảng chỉ tiêu chất lượng phải đạt |

**Kiểm nghiệm**

| Viết tắt | Đầy đủ | Nghĩa |
|---|---|---|
| **PET** | Preservative Efficacy Test | Cấy vi khuẩn vào sản phẩm để xem chất bảo quản có diệt được không (còn gọi challenge test) |
| **Stability testing** | — | Để sản phẩm ở điều kiện khắc nghiệt vài tháng để suy ra hạn dùng |
| **Accelerated / Real time** | — | Gia tốc (40°C, ~3 tháng) vs thời gian thực (nhiều năm) |
| **Pack compatibility** | — | Sản phẩm và bao bì có "ăn" nhau không |
| **MOS** | Margin of Safety | Biên an toàn = liều an toàn ÷ liều thực tế hấp thụ |
| **Micro** | Microbiological quality | Chỉ tiêu vi sinh |
| **NDELA / PAH / 1,4-dioxane** | — | Các tạp chất độc hại phải kiểm soát ở mức vết |

**Pháp lý**

| Viết tắt | Đầy đủ | Nghĩa |
|---|---|---|
| **PIF** | Product Information File | Hồ sơ thông tin sản phẩm — bắt buộc ở ASEAN/EU, chứa toàn bộ bằng chứng |
| **CPSR** | Cosmetic Product Safety Report | Báo cáo an toàn (EU/UK), do safety assessor có chứng chỉ ký |
| **CPNP** | Cosmetic Products Notification Portal | Cổng thông báo sản phẩm của EU |
| **MoCRA** | Modernization of Cosmetics Regulation Act | Luật mỹ phẩm Mỹ (2022) |
| **AICIS** | Australian Industrial Chemicals Introduction Scheme | Cơ chế đăng ký hoá chất công nghiệp của Úc |
| **TGA** | Therapeutic Goods Administration | Cơ quan quản lý dược/thiết bị y tế Úc |
| **Claim** | — | Tuyên bố công dụng; claim quá mạnh → bị xếp loại thuốc |
| **Notification** | — | Thủ tục thông báo sản phẩm với cơ quan quản lý trước khi bán |

**Sản xuất & hậu mãi**

| Viết tắt | Đầy đủ | Nghĩa |
|---|---|---|
| **GMP** | Good Manufacturing Practice | Chuẩn thực hành sản xuất tốt |
| **BMR** | Batch Manufacturing Record | Hồ sơ sản xuất một lô — MBc360 **không** sinh cái này |
| **Scale-up** | — | Chuyển từ mẻ phòng lab (vài kg) sang mẻ sản xuất (hàng trăm kg) |
| **Pilot batch** | — | Mẻ thử quy mô trung gian |
| **Release** | — | Xuất xưởng — QC duyệt cho lô hàng được bán |
| **CAPA** | Corrective And Preventive Action | Hành động khắc phục & phòng ngừa sau sự cố |
| **PV / PMS** | Pharmacovigilance / Post-Market Surveillance | Cảnh giác dược / giám sát hậu mãi |
| **Adverse event** | — | Sự cố bất lợi người dùng gặp phải |
| **Deviation** | — | Sai lệch so với quy trình đã duyệt; phải ghi nhận, không được lờ đi |

**Vai trò & tổ chức**

| Viết tắt | Nghĩa |
|---|---|
| **NPD** | New Product Development |
| **R&I** | Research & Innovation |
| **QA / QC** | Quality Assurance (hệ thống) / Quality Control (kiểm nghiệm) |
| **HCP** | Healthcare Professional — bác sĩ/dược sĩ; tài liệu cho họ bị kiểm soát chặt hơn |
| **SME** | Subject-Matter Expert — chuyên gia nghiệp vụ; trong repo này là đội đã trả lời A/B/C/F |
| **SKU** | Stock Keeping Unit — mã định danh một biến thể sản phẩm cụ thể |

---

## Phụ lục B — Bảng tra nhanh enum

```ts
StageStatus          'Not Started' | 'In Progress' | 'Complete' | 'Gap' | 'Hold' | 'N/A'
WorkStatus           'Not Started' | 'In Progress' | 'Completed' | 'On Hold' | 'Backtracked'
GateDecision         'Proceed' | 'Proceed with Conditions' | 'Hold' | 'Backtrack' | 'N/A'
YNNA                 'Y' | 'N' | 'NA'
RiskLevel            'Low' | 'Medium' | 'High'
SignOffRole          'Prepared by' | 'Reviewed by' | 'Approved by'
StudyApprovalRole    'Study Author' | 'Department Reviewer' | 'Independent Reviewer'
NextActionStatus     'Open' | 'In Progress' | 'Awaiting Information'
                   | 'Ready for Verification' | 'Closed' | 'Cancelled'
NextActionPriority   'Low' | 'Medium' | 'High' | 'Critical'      // Critical chặn cả PwC
MarketApprovalStatus 'Not Started' | 'In Progress' | 'Approved' | 'Blocked' | 'N/A'
ChangeStatus         'Draft' | 'Submitted' | 'Under Review'
                   | 'Approved - Implementation Pending' | 'In Implementation'
                   | 'Verification Pending' | 'On Hold'          // ↑ 7 trạng thái OPEN
                   | 'Completed' | 'Rejected' | 'Cancelled' | 'Superseded'  // 4 CLOSED
ReadinessTier        'Mandatory' | 'Conditional' | 'Supporting'
ReadinessResult      'Not Ready' | 'Ready with Conditions' | 'Ready for Decision' | 'Passed'
```

**8 Angles** (đúng thứ tự): Consumer need · Use context & life stage · Ingredient suitability · Formula compatibility · Safety · Quality · Claims evidence · Real-world performance

---

*Tài liệu này mô tả trạng thái code tại thời điểm 2026-08-01. Khi luật nghiệp vụ thay đổi, cập nhật **cả** code, **cả** `docs/Business_Rules_Confirmation_{EN,VN}.md`, **cả** file này.*
