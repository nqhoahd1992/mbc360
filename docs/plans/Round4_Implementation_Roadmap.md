# Lộ trình triển khai Vòng 4 — 36 đáp án, gom theo phụ thuộc

**Ngày:** 2026-08-24
**Nguồn luật:** `docs/rounds/2026-08-24-sme-reply-round4.md`, ghi lại đầy đủ ở `docs/rules/Business_Rules_Confirmation_{EN,VN}.md` → **Phụ lục 3**. Câu hỏi gốc: `docs/rounds/2026-08-12-our-questions-round4.md`. Bản ghi từng câu và đáp án nằm cạnh nhau: `docs/rules/F1_Per_Gate_Open_Questions.md` → mục Round 4 (đã đóng).
**Hiện trạng đọc trực tiếp từ code**, không phải trí nhớ: `packages/shared/src/{config,utils,types}`, `apps/api/prisma/schema.prisma`.

---

## Vì sao cần một tài liệu lộ trình riêng

Vòng 4 lớn hơn mọi vòng trước cộng lại: **20 chỗ phải làm lại · 6 mảng xây mới · 7 mục độc lập**. Nhưng vấn đề không phải khối lượng mà là **thứ tự** — có ba chỗ mà làm sai thứ tự thì phải làm lại lần hai:

1. **Câu 7 là nền của mọi item Conditional.** `isReadinessTriggerActive()` (`utils/gateProgress.ts`) trả về `boolean`; chưa ghi dữ liệu ⇒ `false` ⇒ item **tự pass**. Đáp án đòi ba trạng thái và "chưa xét" phải chặn. Mọi item Conditional ở 12 gate đều đọc hàm này, nên bất kỳ item Conditional nào xây trước khi sửa nó đều mang sẵn ngữ nghĩa sai. Đáp án còn nêu đích danh một lỗi đang chạy: `microbiologicallySusceptible` chưa điền ⇒ `sg05-preservative` và `sg09-pet` tự pass trên **mọi dự án mới**.
2. **Câu 18 và 29 là một quyết định duy nhất** — khoá bảng chữ ký gate. Xây D1 với khoá 2 thành phần rồi migrate sau là migrate trên dữ liệu chữ ký điện tử. `docs/plans/Post_Round3_Design_Decisions.md` §1 đã khuyến nghị phương án C và chờ từ 12/08; câu 18 xác nhận đúng C.
3. **Câu 3, 33(a) và 34(a) trả về cùng một thang giá trị** (`Critical` là mức **trên** `High`), mà repo đang có ba bản sao khác nhau của thang đó: `RiskLevel` (`types/index.ts:15`), `SAFETY_FINDING_SEVERITY_OPTIONS` và `WATCHLIST_RESOLUTION_OPTIONS` (`config/registers.ts`). Sửa riêng lẻ là ba migration cho cùng một ý, và đúng cách để chúng lệch nhau lần nữa.

## Cách đọc trạng thái trong code

Mọi tag `[ASSUMPTION: R4-Qn]` đã được gỡ. Chỗ nào đáp án **mâu thuẫn** với code đang chạy thì mang `R4-REWORK` kèm số câu (trong ngoặc vuông) — không phải giả định đang chờ, mà một quy tắc đã chốt và một đoạn code biết là sai:

```
grep -rn "R4-REWORK" packages/shared/src apps
npm run verify:readiness        # in số chỗ mỗi lần chạy, không fail
```

Bộ đếm này **cố ý không làm build đỏ**: code sai có chủ đích cho tới khi nhóm của nó được build, và fail build chỉ khiến người ta xoá marker — đúng thứ nó tồn tại để ngăn.

---

## Round 5 gửi SAU khi đi hết 36 câu — quyết định của chủ dự án, 24/08/2026

*"Round 5 gửi SME sẽ là sau khi đã đi qua 36 câu ở round 4, khi đó round 5 mới không có sự thay đổi gì thêm. Có thể vừa làm vừa soạn câu hỏi round 5."*

Lý do rõ: mỗi nhóm build xong lại làm nảy sinh câu hỏi mới (nhóm 1 vừa thêm `R5-Q11`), nên gửi sớm là gửi một danh sách còn động — đúng cái đã xảy ra ở Vòng 4, nơi hai câu (`R4-Q15`, `R4-Q16`) phải chèn thêm sau khi bản gửi đã soạn.

**Hệ quả bắt buộc phải ghi ra, vì nó đổi cách build:** không nhóm nào được *chờ* một câu R5. Có một vòng lặp không lách được — nhóm 3 cần `R5-Q7` (phạm vi ảnh hưởng chụp bằng chứng), nhưng `R5-Q7` chỉ được gửi sau khi 36 câu xong, mà **câu 18 và 29 chính là nhóm 3**. Chờ nghĩa là không bao giờ làm.

Nên quy tắc từ nay:

- **Build trên giả định có tài liệu, gắn `[ASSUMPTION: R5-Qn]` tại chỗ quyết định** — đúng cơ chế mà repo đã có sẵn và sweep TAG đã canh. Tag không còn nghĩa "đang chờ để làm" mà là "đã làm, theo cách đọc này, sẽ sửa nếu trả lời khác".
- **Mỗi câu R5 phải có dòng "Nếu trả lời khác thì sửa ở đâu"** nêu đúng file/hàm. Với Vòng 4 dòng đó là thứ đã biến việc đóng 33 câu thành việc máy móc thay vì khảo cổ; giờ nó còn quan trọng hơn, vì code sẽ chạy trên giả định lâu hơn.
- **Nơi soạn dần — hai bản, đúng quy ước `rounds/README.md`:** bản làm việc ở mục `## Round 5` trong `docs/rules/F1_Per_Gate_Open_Questions.md` (ID cố định, tên file/hàm), và **bản gửi đi ở `docs/rounds/DRAFT-our-questions-round5.md`** (ngôn ngữ nghiệp vụ, đánh số). Đổi tên bản gửi theo ngày gửi vào đúng ngày gửi.

  *Sửa 24/08 sau khi chủ dự án hỏi lại:* dòng này trước đó ghi "chưa tạo file trong `docs/rounds/`", lấy lý do thư mục đó là bằng chứng. Sai — quy tắc "không sửa" chỉ áp *sau khi* gửi, và chính README nêu bài học ngược lại sau khi bộ câu hỏi Vòng 3 bị thiếu khỏi repo. Vòng 4 cũng làm đúng cách này: bản gửi sống trong `rounds/` suốt ba ngày soạn rồi mới đổi tên.

Cột Trạng thái dưới đây vì thế phân biệt **✅ resolved** (xong, đã gỡ hết marker) với **⬜ chưa xong** — trong đó "chưa xong" gồm cả trường hợp đã làm phần lớn nhưng còn một vế đang nằm trên một giả định R5. Xem câu 12 và 16.

## Bảng theo dõi 36 câu — nguồn sự thật duy nhất về "câu nào đã xong"

**Cách dùng:** làm xong phần việc của một câu thì đổi ô Trạng thái của nó thành **✅ resolved**. Không có sổ theo dõi nào khác — bảng này là nơi duy nhất.

**Không phải một ô tick tự do.** Sweep **S5** của `npm run verify:readiness` **fail build** nếu một câu được đánh ✅ mà còn chỗ nào trong code mang marker `R4-REWORK` gọi tên câu đó. Nghĩa là thứ tự bắt buộc là: **sửa hết marker → rồi mới tick**; tick sớm thì build đỏ và nói rõ còn sót chỗ nào.

**Chiều ngược lại cố ý KHÔNG kiểm.** Một câu không còn marker nào không có nghĩa là đã xong. Lúc đóng vòng có **10 câu chưa từng có marker nào** — **3 · 12 · 13 · 14 · 15 · 16 · 17 · 20 · 26 · 28** — vì chúng là xây mới, không có đoạn code sai nào để đánh dấu. Với chúng "0 marker" là điểm xuất phát chứ không phải vạch đích. Chỉ con người mới nói được là việc đã xong; máy chỉ ngăn nói sai.

**Khi resolve một câu, làm đủ ba việc:** (1) gỡ mọi marker `R4-REWORK` của nó trong code · (2) đổi ô dưới đây thành ✅ resolved · (3) chạy `npm run verify:readiness` và `npm run verify:scaffold`. Nếu câu đó thêm checklist section, requirement row, Key Gate Check hay dòng register `mode:'fixed'` thì (3) là bắt buộc, không phải tuỳ chọn — đó là lỗi đã xảy ra bốn lần.

| Câu | Nhóm | Trạng thái | Chủ đề |
|---|---|---|---|
| 1 | 7 | ✅ resolved | Luồng Infant & Baby Safety trải 6 gate |
| 2 | 8 | ⬜ chưa làm | 6 trạng thái formula version + quyết định supersession per-market |
| 3 | 2 | ✅ resolved | Đánh giá mức độ nghiêm trọng của gap (8 trường) — cũng đóng **A1 vòng 21/07** và bật được nhánh "critical gap" của F7 |
| 4 | 4b + 8 | ⬜ chưa xong | **Market profile đã xây** (nền 4a + trang admin + revision + capability) ✅ — còn PMS baseline cho mọi sản phẩm và 14 trigger enhanced (thuộc nhóm 8) |
| 5 | 6 | ✅ resolved | Gate 7 cần màn hình restricted/caution tổng quát |
| 6 | 6 | ✅ resolved | Gate 4 phải disposition mọi dòng (6 giá trị) |
| 7 | 1 | ✅ resolved | **Nền tảng** — tri-state "chưa đánh giá" phải chặn |
| 8 | 1 | ✅ resolved | Change Control required? Yes/No/Pending |
| 9 | 1 | ✅ resolved | Human-participant study planned? Yes/No/Undecided |
| 10 | 8 | ⬜ chưa làm | Tách 16 option thành Source / Issue type / Action |
| 11 | 1 | ✅ resolved | Administrative-only change? Yes/No |
| 12 | 1 | ⬜ chưa xong | Scale-up risk identified? ✅ + trigger Gate 9 ✅ — **còn 18 vùng ảnh hưởng**, chờ nhóm 2 tái cấu trúc change record |
| 13 | 8 | ⬜ chưa làm | Lịch review 1/3/12 tháng từ ngày launch thực tế |
| 14 | 8 | ⬜ chưa làm | Launch per market + 5 trạng thái roll-up |
| 15 | 8 | ⬜ chưa làm | Product-performance → Conditional; market feedback tách hai |
| 16 | 1 | ⬜ chưa xong | Lý do N/A tự sinh ✅ (vốn đã có) — **còn phần reviewer xác nhận** với item critical, chờ `R5-Q6` |
| 17 | 4c | ✅ xong | Bảng `raw_material_risks` (khoá theo `rmCode` Cosmetri, 11 phân loại, revision + audit) · `GET·PUT /api/reference/rm-risk` gated `reference:rm-risk|edit` · trang **Users & Roles → Raw material risk** · trigger mới `rmRiskFlagged` gỡ chặn `sg04-allergen` (Conditional trước đây không có trigger, không bao giờ chặn được) |
| 18 | 3 | ⬜ chưa làm | Chữ ký Gate 10/11 per market; Phase 4 per market |    
| 19 | 5 | ⬜ chưa làm | 7 register tham chiếu Claim ID; mechanism từ Gate 3 |
| 20 | — | ✅ resolved | Trường Gate 1 tuỳ chọn lúc tạo — xác nhận đúng như đã xây, không cần code |
| 21 | độc lập | ✅ resolved | Priority Must/Should/Could + N/A kèm lý do |
| 22 | độc lập | ✅ resolved | Primary project type + 2 giá trị Owner/function |
| 23 | 6 + độc lập | ✅ resolved | Option "Product form under evaluation" (23a) + 4 đường phủ safety matrix (23b) |
| 24 | độc lập | ✅ resolved | Bỏ `initialTargetMarkets`; Countries/Markets là nguồn duy nhất |
| 25 | độc lập + 7 | ✅ resolved | Tách Dry / eczema-prone (a)(b)(d) + family use hỏi nhóm tuổi (c) |
| 26 | 5 | ⬜ chưa làm | Revision claim đã duyệt thành read-only |
| 27 | 5 | ⬜ chưa làm | 11 cờ chủ đề claim có cấu trúc |
| 28 | 4d | ⬜ chưa làm | Claims Library cấp công ty |
| 29 | 3 | ⬜ chưa làm | 5 điểm chữ ký gate: snapshot · comment · gate critical · độc lập · trình tự |
| 30 | 5 | ⬜ chưa làm | Revision vs Claim ID mới · artwork link · bản ghi Publication |
| 31 | 6 | ✅ resolved | Gate 7/10/11 chỉ chặn nguyên liệu có trong công thức |
| 32 | 6 | ✅ resolved | Thêm Needs Safety Review · 5 resolution status · sổ maternal |
| 33 | 2 | ✅ resolved | 4 severity · 6 status · controlled action · chặn theo bậc |
| 34 | 2 | ✅ resolved | Critical là mức riêng · final disposition 8 trường |
| 35 | 8 | ⬜ chưa làm | Hai bộ giá trị riêng · "Other — specify" chặn Gate 10 |
| 36 | 5 + độc lập | ⬜ chưa xong | Trạng thái costing ✅ (36b, kèm điều kiện "commercially dependent") — **còn cosmetic kích hoạt product-level evidence** (36a, thuộc nhóm 5) |

**Câu 20 đã ✅ ngay từ đầu** vì đáp án là *"Current approach is correct"* — không có dòng code nào phải đổi. Nó cũng là ca thử tự nhiên cho S5: nếu ai đó lỡ gắn một marker `R4-REWORK: câu 20`, build sẽ đỏ ngay.

---
# Bản đồ phụ thuộc

```
Nhóm 1  tri-state ──────────┬──────────────────────┐
Nhóm 2  thang giá trị ──────┤                      │
                            │                      │
Nhóm 4a nền chung ──┬─ 4b market profiles ─┐       │
                    ├─ 4c RM risk overlay ─┼───────┤
                    └─ 4d claims library ──┤       │
                                           │       │
Độc lập (7 mục, song song bất cứ lúc nào)  │       │
                                           │       │
     Nhóm 3  chữ ký per-gate ←─────────────────────┘
     Nhóm 5  kiến trúc claim ←──────────────┘
     Nhóm 6  sàng lọc nguyên liệu ←─────────┘
           │
           └─ Nhóm 7  infant pathway
                    │
     Nhóm 8  per-market & hậu mãi ←─ nhóm 3 ─┘
```

Nhóm 1 và 2 nên xong trước: cả hai rẻ so với phần còn lại, và mọi nhóm sau đều ngồi trên chúng. Nhóm 4a–4b chạy song song được, vì market profile gỡ chặn cho cả nhóm 5, nhóm 8 và một điều kiện của C1.

---

## Nhóm 1 — Tri-state "chưa đánh giá" 🔴 NỀN TẢNG

**Câu:** 7 · 8 · 9 · 11 · 12 · 16

Cả sáu là **cùng một cơ chế**. Câu 7 định nghĩa nó; bốn câu tiếp là bốn thực thể đầu tiên, mỗi câu tạo đúng một trường:

| Câu | Trường mới | Chưa xét thì |
|---|---|---|
| 8 | Change Control required? Yes / No / Pending assessment | chặn đóng post-market finding |
| 9 | Human-participant study planned? Yes / No / **Undecided** | chặn đóng Gate 8 |
| 11 | Administrative-only change? Yes / No (do reviewer có thẩm quyền xác nhận) | không xác nhận ⇒ **không** được miễn competitor review |
| 12 | Scale-up risk identified? Yes / No / Pending assessment | chặn readiness Gate 9 |

Câu 16 là hộ tiêu thụ: ở trạng thái "đã xét-không áp dụng", hệ thống được **tự sinh lý do N/A**, nhưng item safety/regulatory/claims/release-critical thì lý do đó vẫn phải được reviewer xác nhận.

**Sửa ở đâu:**
- `packages/shared/src/utils/gateProgress.ts` — `isReadinessTriggerActive()` đổi từ `boolean` sang tri-state; `TRIGGER_INACTIVE_EXPLANATIONS` tách thành hai bộ thông điệp (không áp dụng ≠ chưa xét); trong `gateReadinessChecklist()` là biểu thức `const blocks = …` và nhánh early-return của trigger không active.
- `packages/shared/src/config/gateReadiness.ts` — `ReadinessTrigger`, `GateReadinessItem`.
- `apps/web/src/components/GateReadinessPanel.tsx` + `GateFlowTable.tsx` — trạng thái thứ ba cần màu/nhãn riêng, **không được trông giống "đã pass"**.
- `packages/shared/scripts/verify-readiness.ts` — thêm sweep: một trigger không khai được trạng thái "chưa xét" là một trigger vẫn im lặng auto-pass.
- Migration cho bốn trường mới; `ChangeRecord`, `ProjectData` trong `types/index.ts`.

**Giả định R5 đang đỡ phần còn lại** (không chờ — xem quyết định 24/08 ở trên): `R5-Q5` — với 7 trigger suy ra từ một bảng, "bảng còn trống" tính là chưa-xét (chặn) hay cần một ô tường minh? Bảy trigger đó hiện giữ hai trạng thái, khai trong `TRIGGERS_WITHOUT_UNASSESSED_STATE` và đếm mỗi lần chạy sweep. Và `R5-Q6` — "responsible reviewer" của một item là ai — đang đỡ nửa sau của câu 16.

**Chặn:** nhóm 3, 5, 6, 7, 8 — mọi item Conditional trong đó.

**Ghép việc:** câu 11 (Administrative-only) và câu 22(b) (Primary project type) cùng nằm trên checklist `projectNature` — làm chung một migration.

---

## Nhóm 2 — Thang nghiêm trọng & vòng đời xử lý dùng chung 🔴

**Câu:** 3 · 32(b) · 33 · 34

Bốn câu độc lập nhưng trả về **cùng hai bộ giá trị**:

- **Severity 4 mức** `Low · Medium · High · Critical` — câu 3, 33(a), 34(a).
- **Vòng đời** `Open · Under Review · Action Pending · Verification Pending · Closed` (+ `Superseded` cho safety finding) — câu 32(b), 33(b).

**Kèm theo, cùng nhóm vì cùng bản ghi:**
- Câu 3 tạo bản ghi mới trên một *gap*: Criticality · Impact category (8 giá trị) · assessor · date · rationale · evidence link · required action · action owner. Và đổi luật quyết định gate: **Critical không được mang qua PwC**, phải Hold/Backtrack/Reject; High mang có điều kiện dưới ba điều kiện.
- Câu 33(c): "Required action" từ free text → **controlled Next Action** với Critical/High/Medium-cần-hành-động. Dùng lại `apps/web/src/components/NextActionSelect.tsx`.
- Câu 33: chặn theo bậc — Critical + High chặn cứng Gate 7, Medium cho PwC, Low cảnh báo. Hôm nay `openCriticalSafetyFindings()` (`utils/safetyFindings.ts`) là nhị phân.
- Câu 34(c): "final disposition" = 8 trường, không phải một ghi chú hay một ngày đóng (`isChangeDispositionRecorded` trong `utils/changeImpact.ts`).
- Câu 34(d): acknowledgement giới hạn theo role + ghi 6 trường.

**Sửa ở đâu:** `types/index.ts` (`RiskLevel`) · `config/registers.ts` (4 bộ hằng) · `utils/safetyFindings.ts` · `utils/watchlistReview.ts` · `utils/changeImpact.ts` · `apps/api/prisma/schema.prisma` + migration đổi giá trị đã lưu.

**Giao với nhóm 3:** câu 3 ("Critical gap ⇒ Hold/Backtrack/Reject") và câu 29(5) ("quyết định của Approver **chính là** quyết định gate") cùng đổi cách một quyết định gate được ghi — hai cái phải khớp.

---

## Nhóm 3 — Chữ ký per-gate 🔴 LỚN NHẤT

**Câu:** 18 · 29 — xem thêm `Post_Round3_Design_Decisions.md` §1, nay đã có đủ đáp án cho cả hai vế.

**Câu 18 chốt khoá bảng:** Gate 10/11 ký **theo từng thị trường** ⇒ đúng **phương án C**: `@@unique([projectId, gateId, market, role])` với `market` nullable + partial unique index cho nhánh `market IS NULL`. Phase 4 có trạng thái theo thị trường; roll-up cấp dự án được giữ nhưng không thay thế.

**Câu 29 chốt năm điểm:**

1. **Record version = ảnh chụp bằng chứng riêng của gate**, 8 thành phần. Bằng chứng đổi sau khi ký ⇒ chữ ký stale, hệ thống chỉ ra cái gì đã đổi, phải ký lại. *"A project-wide save counter is not sufficient"* loại thẳng `projects.version`. Tiền lệ để nhân rộng: `CLAIM_REVIEWED_WORDING_COLUMN` (`config/claimReview.ts`) chụp wording lúc review và phát hiện lệch — đừng phát minh lại.
2. **Comment bắt buộc** với 10 loại quyết định (PwC · Hold · Backtrack · Reject/Stop · Approved with Conditions · Not Approved · Further Information Required · N/A cần lý do người · Delegated approval · Override).
3. **Gate critical = 3, 4, 7, 8, 9, 10, 11.**
4. **Độc lập = khác người** ở mọi gate; ở 7 gate critical thêm: ít nhất một reviewer/approver thuộc **chức năng độc lập tương ứng**. Luật khác-phòng-ban vẫn chỉ dành cho human-study (C2).
5. **Approver ghi quyết định cuối, và đó CHÍNH LÀ quyết định gate** ⇒ `GateSignOff.decision` dùng lại `GateDecision`.

**Sửa ở đâu:** bảng `gate_sign_offs` mới trong `apps/api/prisma/schema.prisma` (không mở rộng `SignOff` được — nó treo dưới `phaseClosureId`) · `apps/api/src/projects/projects.service.ts` (dùng lại nguyên vẹn `signSignOff`/`withdrawSignOff`/`verifySignOffStepUp` đã xây cho phase) · `config/gateReadiness.ts` thay 12 item `sgNN-signoff` và xoá `GATE_SIGNOFF_COVERAGE_NOTE` · `apps/web/src/components/SignOffBlock.tsx` + `GateFlowTable.tsx`.

**Đặt điểm 3 và 4 thành hằng số cạnh nhau**, không rải trong logic — danh sách 7 gate critical, phép kiểm độc lập, và ánh xạ gate → chức năng độc lập.

**Câu hỏi còn mở:** `R5-Q7` — biên của ảnh chụp (chỉ những gì `gateReadinessChecklist()` đọc, hay toàn bộ nội dung register?).

---

## Nhóm 4 — Dữ liệu tham chiếu cấp công ty 🔴 HẠ TẦNG MỚI

**Câu:** 4 (phần market profile) · 17 · 28

Ba tập dữ liệu **cùng hình dạng nhưng không cùng workflow**:

| | Phạm vi | Ai sửa | Workflow duyệt riêng | Gỡ chặn cho |
|---|---|---|---|---|
| Market Profiles | theo thị trường | Regulatory | ❌ | câu 4 · 27(d) · 35(b) · 13 |
| RM Risk Overlay | theo mã NL Cosmetri | Technical + Safety + Regulatory | ❌ | trigger allergen Gate 4 · nhóm 7 |
| Claims Library | theo công ty + tag áp dụng | Marketing đề xuất, **Technical VÀ Regulatory** duyệt | ✅ nặng nhất | điều kiện C1 cuối cùng |

Phần chung: bảng cấp công ty (không thuộc project) · revision history · khoá quyền ghi theo role · evidence link + review date · project chỉ đọc · sống sót khi project bị xoá. Phần **không** chung: chỉ Claims Library có cổng duyệt hai bên và cascade thu hồi.

Đây là **kiểu phần mềm mới trong app** — gần `apps/web/src/pages/AdminUsers.tsx` / `AdminRoles.tsx` hơn là 30 register per-project (`RegisterConfig` copy vào project lúc tạo, đúng thứ một thư viện dùng chung không được phép làm).

**Chốt: nền mỏng dùng chung, ba bước giao độc lập** — không xây framework tổng quát cho 3 bảng có workflow khác nhau.

- **4a — Nền chung.** ✅ **xong 24/08.** `ReferenceDataService` (`assertCanEdit` + `recordRevision` ghi revision và audit **trong transaction của caller**) · bảng `reference_revisions` · một capability cho mỗi dataset (`reference:<dataset>|edit`) chứ không phải một cái chung, vì câu 4 và câu 17 giao cho những chức năng khác nhau.
- **4b — Regulatory Market Profiles.** ✅ **xong 24/08.** Bảng `market_profiles` · `GET·PUT /api/reference/market-profiles` · trang **Users & Roles → Market profiles** liệt kê **mọi** thị trường app biết (lấy từ chính option list Target Markets), thị trường chưa cấu hình hiện "not set" thay vì vắng mặt. Điều kiện thứ 2 của `UNEVALUATED_C1_CONDITIONS` đã rời danh sách: trigger `claimNeedsRegulatoryReview` gọi `marketRestrictsClaims` — kiểm 6 ca, gồm hạn chế ở thị trường **khác** (không kích hoạt) và giá trị chỉ có khoảng trắng.
- **4c — Raw Material Risk Overlay.** ✅ **xong 25/08.** Bảng `raw_material_risks` khoá `rmCode` · `GET·PUT /api/reference/rm-risk` · trang **Users & Roles → Raw material risk** (11 checkbox, thêm nguyên liệu từ catalogue Cosmetri) · trigger `rmRiskFlagged`. Trước đây `sg04-allergen` là Conditional **không có trigger**, tức không bao giờ chặn được; giờ chặn ở cả hai hướng — có cờ, **và** còn nguyên liệu chưa phân loại. Kiểm 8 ca + 6 ca cho 4b, cộng kiểm live qua API. Cơ chế `ProjectData.reference` dựng ở bước này (xem CLAUDE.md) là thứ 4d dùng lại.
- **4d — Claims Library.** ⬜ Nặng nhất. **Không chặn nhóm 5**: câu 28(2) cho phép claim mới không có link, chỉ cần đánh dấu *"New claim — not yet in Claims Library"*.

**Câu hỏi còn mở:** `R5-Q9` — ai phán định một thay đổi thư viện là "critical" (quyết định có hệ quả rút sản phẩm khỏi thị trường).

---

## Nhóm 5 — Kiến trúc claim 🔴

**Câu:** 19 · 26 · 27 · 30 · 36(a)

Cả năm sửa cùng bộ register — `claimEvidenceTraceability` · `skuClaimsPifRegister` · `publishedInfoApproval` — cộng `packagingSpecsArtwork`.

**Đã xác nhận, không phải làm gì:** 19(a) `claimCategory` sẵn có đúng là phân loại B7 · 19(c) traceability là nguồn sự thật, SKU kế thừa read-only · 19(e) Claim ID sinh ở Gate 3 · 19(f) picker mở cho mọi claim · 26 sổ không đóng băng ở Gate 8 · 27(a)(b) năm trường và bốn outcome · 30(a) bốn quyết định.

**Phải làm:**
- **19(g)** — **bảy** register tham chiếu Claim ID, không phải bốn như ta hỏi: mechanism map · prospective evidence plan · efficacy study plan · clinical evidence · Published Information Approval · **artwork/label claim list** · **PIF claims register**. Dùng `ColumnType 'claimRef'` + `ClaimSelect` đã có.
- **19(h)** — mechanism là **giả thuyết sơ bộ ở Gate 3**, xác nhận kỹ thuật ở Gate 5 ⇒ cột Gate 3 riêng + chỉnh `RegisterColumn.gate`.
- **19(d)** — Gate 3 chỉ pass khi mọi claim có đủ 6 thứ; **không đề xuất claim nào thì phải ghi lại tường minh**.
- **26 + 30(b)** — mô hình revision: draft sửa tự do; revision đã được Regulatory/Gate 10 duyệt thành **read-only**; wording mới tạo revision mới **hay** Claim ID mới theo hai danh sách tiêu chí của 30(b), **reviewer Technical/Regulatory quyết**. Hai câu này là một cơ chế — làm chung.
- **27** — 11 cờ chủ đề claim có cấu trúc; gỡ điều kiện thứ 3 của `UNEVALUATED_C1_CONDITIONS`. Kèm chỉnh `CLAIM_REVIEW_OUTCOMES` cho khớp cách viết hoa của bản trả lời.
- **30(c)** — Packaging/Artwork Approval **link mọi Claim ID** và **chặn cứng** ở 5 trạng thái. Đây là vế ta cố ý chưa xây.
- **30(d)** — bản ghi **Publication / Deployment** tách khỏi "Approved for Release" (7 trường; bao bì in thì tương đương **Release to Print**).
- **30(e)** — miễn trừ "No product claim or technical statement" phải do **Technical hoặc Regulatory** xác nhận; hôm nay ai sửa được register cũng tick được.
- **36(a)** — sửa `CLAIM_CATEGORIES_NEEDING_PERFORMANCE_EVIDENCE` + thêm trường **Evidence basis required** (7 giá trị).

---

## Nhóm 6 — Sàng lọc nguyên liệu & an toàn ✅ **xong 29/08/2026**

**Câu:** 5 · 6 · 23(b) · 31 · 32(a)(c)(e)(f)

Cả năm nằm trên cùng ba màn hình — Prohibited Ingredients watch-list, PB Caution Limits, Supplier & RM Evidence — và cùng hai gate (4 và 7).

- **Câu 5 (option b)** — sửa lại thứ vừa ship 07/08. Gate 7 cần **general restricted-and-caution screen cho MỌI sản phẩm**; maternal là lớp điều kiện thêm; infant là lớp thứ ba. `sg07-caution-closed` từ một item Conditional thành ba, và lớp general **chưa có register nào**.
- **Câu 6** — Gate 4 phải disposition mọi dòng vào 1 trong 6 giá trị; **không pass khi còn dòng chưa đánh giá**. PwC dưới 4 điều kiện.
- **Câu 32(a)** — thêm `Needs Safety Review` vào flagged (ta mới có 2/3).
- **Câu 32(c)** — PwC là đủ, nhưng cần capability mới: **người duyệt gate phải có thẩm quyền Safety hoặc Regulatory**.
- **Câu 32(e)** — sổ PB Caution Limits cần **cùng bộ trường reviewer-trail**.
- **Câu 32(f)** — action được ở gate sau, nhưng phải link ngược, có owner + due date, **vẫn hiện ở gate gốc**, đến hạn trước gate đóng cuối. **Finding critical không được hoãn.**
- **Câu 31(f)** — ở Gate 7/10/11 chặn cứng **chỉ áp cho nguyên liệu có trong công thức hiện tại**; dòng ngoài công thức thì cảnh báo (`utils/rmEvidence.ts`, 3 item trong `gateReadiness.ts`).
- **Câu 23(b)** — mọi dòng công thức phải có disposition, phủ được bằng **1 trong 4 đường**; tá dược rủi ro thấp không cần monograph dài.

**Phụ thuộc:** nhóm 2 (thang giá trị) · nhóm 4c (risk overlay) — cả hai đã xong trước.
**Câu hỏi còn mở:** `R5-Q10` (sáu giá trị của câu 6 thay thế hay bổ sung danh sách status hiện tại — đã build theo phương án **hai cột**) và `R5-Q24` mới (hình dạng sổ General Restricted & Caution, và nó có thuộc Gate 4 không).

### Đã làm gì, 29/08

**Câu 32 vốn đã xong ở nhóm 2**, nên nhóm này thực chất là 5 · 6 · 23(b) · 31(f).

- **Câu 5** — ba lớp ở Gate 7. Hai lớp đã có sẵn mà không ai nhận ra: `sg07-prohibited-closed` (Mandatory, mọi sản phẩm) là nửa prohibited/restricted của lớp general, và `sg07-infant-safety` là lớp 3. Thứ **thiếu hẳn** là nửa *caution* tổng quát — mọi dòng caution trong app đều thuộc sổ maternal. Nên: sổ mới `generalRestrictedCaution` (tự do, **không seed chất nào** — không có danh sách nào trong workbook để chép, và bịa ra là fabricate dữ liệu quy chế) + một dòng Key Gate Check mới ở gate 07 làm bằng chứng "đã xem mà không có gì", vì sổ rỗng không phân biệt được hai trạng thái đó. `sg07-caution-closed` đổi tên thành `sg07-maternal-caution` — cái tên cũ *nhận* là general trong khi sổ nó đọc chưa bao giờ là general, và chính điều đó khiến lớp general trông như đã có.
- **Câu 6** — cột mới `gate4Disposition` (6 giá trị của SME) trên **cả hai** sổ watch-list, cạnh `productStatus` chứ không thay nó: một cột giữ kết quả *máy sàng lọc*, một cột giữ *phán quyết người*. Đây là nhánh "hai cột" của `R5-Q10`, chọn vì gộp hai cột thành một là một migration, còn tách một cột thành hai là đoán.
- **Câu 23(b)** — `coverageRoute` (4 đường của SME) + `coverageReference` trên Ingredient-Level Safety Matrix, và check mới `safetyMatrixCoversFormula` nối **từng dòng BOM** sang matrix (theo `rmCode`, dự phòng `inciName`). Tính cân xứng nằm ở bốn đường chứ không phải ở một ngoại lệ: tá dược rủi ro thấp được phủ bằng group/class assessment, dòng vẫn *chứng minh là đã phủ*. **Chưa phủ và đã ghi rõ trên chính item** (`coverageNote`): "mixture components, impurities and residuals" — matrix là một dòng một BOM line, thành phần của một hỗn hợp không phải BOM line và không có chỗ ghi.
- **Câu 31(f)** — `scope: 'formula'` trên hai check D4, dùng ở Gate 7/10/11; Gate 4 giữ nguyên `'all'` theo 31(a). Phần ngoài công thức thành item **Supporting** (cảnh báo, không chặn) ở cả ba gate.

### Ba thứ học được, đáng chép lại

1. **Sweep S2 bắt đúng cái nó sinh ra để bắt, và lộ ra một lỗ trong chính nó.** Sổ general-caution rỗng là hợp lệ (sản phẩm không có chất bị hạn chế), nên nó không thể có `registerHasRows` — S2 fail ngay. Và `scope: 'formula'` làm *lý lẽ cũ của S2 hết đúng*: một sổ đầy ứng viên không nói gì về việc công thức có dòng nào. Nên thêm **`nonVacuousBecause`** — một miễn trừ **phải khai bằng câu chữ**, S2 fail nếu thiếu, và in ra mỗi lần chạy. Kiểm ngược cả hai chiều.
2. **Một check đọc BOM cũng vacuous như một check đọc register.** `safetyMatrixCoversFormula` trên công thức rỗng = "mọi dòng đã phủ" = tick xanh cho sản phẩm chưa có công thức. Phát hiện khi in danh sách blocker thật của dự án demo, không phải khi viết code.
3. **Cột dropdown chỉ là dropdown ở trình duyệt.** `PUT /registers/:key` nhận mọi chuỗi, nên `gate4Disposition` — một *đầu vào của luật* — có thể mang giá trị không ai chọn được, và luật "mọi dòng đã disposition" thoả ngay. Sửa hai tầng: luật kiểm **membership** thay vì khác rỗng, và API thêm guard chung `invalidSelectValues` cho **mọi** cột select của **mọi** sổ (đo trước khi bật: 0 giá trị lệch trên dữ liệu thật; 243 giá trị `"fixture"` đều nằm trên dự án rác `MBC-SIGN-TEST`).

---

---

## Nhóm 7 — Luồng Infant & Baby Safety ✅ **xong 29/08/2026**

**Câu:** 1 · 25(c) phần family-use

Compartment 3 đúng và giữ nguyên, **nhưng nó là cấu phần CUỐI** của một luồng trải 6 gate:

| Gate | Phải thêm |
|---|---|
| 2 | 10 thông tin ngữ cảnh dùng cho trẻ (tuổi tối thiểu theo tháng · trực tiếp/gián tiếp · leave-on/rinse-off · vùng cơ thể · tần suất và lượng · vùng tã/mặt/mắt/da đầu · phơi nhiễm tay-miệng · nuốt phải vô ý · da tổn thương · người chăm sóc dùng hay bôi trực tiếp) |
| 4 | 8 yêu cầu độ phù hợp nguyên liệu cho trẻ — **đọc từ Risk Overlay (nhóm 4c)** |
| 5 | 7 yêu cầu cấp công thức |
| 6 | 7 yêu cầu bao bì và hướng dẫn |
| 7 | Compartment 3 (đã có) — chặn cứng khi luồng kích hoạt mà chưa xong |
| 8–9 | trigger kiểm nghiệm theo ngữ cảnh dùng và rủi ro |
| 10 | 6 nội dung bắt buộc trong PIF |

**25(c) đi kèm:** `Family use` không tự động là nhóm dễ tổn thương nhưng **phải hỏi lại nhóm tuổi thực tế**; có trẻ sơ sinh/trẻ nhỏ thì luồng kích hoạt. Đây là một trigger mới, không phải một ánh xạ.

**Phụ thuộc:** nhóm 6 (phần Gate 4 nằm trên chính màn hình sàng lọc) · nhóm 4c · nhóm 1 — cả ba đã xong trước.

### Đã làm gì, 29/08

**Sáu requirement section mới**, mỗi gate một section, chép nguyên văn danh sách của SME: `infantUseContext` (gate 02, 10 dòng) · `infantIngredientSuitability` (04, 8) · `infantFormulaAssessment` (05, 7) · `infantPackaging` (06, 7) · `infantTesting` (08-09, 7) · `infantPif` (10, 6). Compartment 3 ở Gate 7 **không đổi một dòng nào** — nó vẫn là cấu phần cuối, đúng như đáp án nói. 45 dòng mới sinh **từ chính config** trong migration `20260829180000_round4_infant_pathway`, không gõ tay.

Cả sáu là **Conditional trên `infantContact`**, nên sản phẩm không dành cho trẻ sơ sinh không thấy chúng; khi luồng kích hoạt thì chặn cứng — chính là dòng "Hard block" của đáp án, và là lý do bắt các gate sớm phải ghi.

**Ba điều đáng ghi lại:**

1. **Câu 25(c) mới là thứ khiến `infantContact` có trạng thái thứ ba.** Trước đó trigger chỉ đọc "Infant 0+ có được tick không" — nhị phân, và nằm trong `TRIGGERS_WITHOUT_UNASSESSED_STATE`. Đáp án: *"Family use … must prompt confirmation of the actual age groups included"*. Nên một sản phẩm `Family use` mà chưa ai xác nhận nhóm tuổi giờ trả `notAssessed` và **chặn** — trước đây nó lặng lẽ bỏ qua toàn bộ luồng infant. Bộ đếm trigger nợ giảm 7 → 6. Phần còn thiếu (dự án chưa ghi target user nào thì vẫn đọc thành "không có infant") là câu R5-Q5 chung cho mọi trigger đọc checklist, không riêng cái này.
2. **`allowNotApplicable` từ câu 21 hoá ra là điều kiện tiên quyết của nhóm này.** Nhiều dòng mang đúng chữ "where relevant" / "where appropriate" của SME, và cả mục Gate 8-9 được viết như một **thực đơn** (*"Trigger by use context and risk"*) chứ không phải danh sách nghĩa vụ. Bắt cả 7 test family cho mọi sản phẩm trẻ em là tự đặt ra luật SME cố ý không viết. Nên check mới `requirementSectionDispositioned` (Completed **hoặc** N/A kèm lý do) — **tách khỏi** `requirementSectionComplete`, cái vẫn chỉ nhận Completed và vẫn đỡ Compartment 3: mở rộng nó sẽ đổi luật của một câu khác. Kiểm cả hai chiều.
3. **Nửa "young children" của 25(c) không có pathway riêng, và đó là câu trả lời.** *"if infants or young children are included, the relevant pathway activates"* — với trẻ sơ sinh là luồng infant, với trẻ nhỏ thì "pathway liên quan" chỉ có thể là Vulnerable-User Assessment. Nên `expectedVulnerableGroups` đọc thêm nhóm tuổi family-use đã xác nhận, **qua đúng cùng một map** với target user được tick. Cố ý KHÔNG nhân bản sang `targetUsersPinnedByAssessment`: guard đó bảo vệ một *cái tick* khỏi bị gỡ, còn đây là một trường xác nhận.

Kiểm: 29 ca luật trên envelope thật — cả 7 item tự pass khi không có infant, cả 7 chặn khi có, một câu trả lời family-use cũ bị bỏ qua khi gỡ tick `Family use`, và Compartment 3 vẫn **không** nhận N/A. Cộng kiểm API cho 3 cột mới và một dòng N/A kèm lý do trong section mới. Dữ liệu test đã dọn.

---

## Nhóm 8 — Vòng đời per-market & hậu mãi 🔴

**Câu:** 2 · 4 · 10 · 13 · 14 · 15 · 35

Tất cả xoay quanh **ngày launch thương mại thực tế theo từng thị trường** — một trường app chưa có. `MarketTrack` (`types/index.ts`) hiện chỉ có `launchApprovedDate`, là ngày *phê duyệt* chứ không phải ngày *bán*.

- **Câu 14** — launch per market; 5 trạng thái roll-up cấp dự án; thị trường đầu launch không làm các thị trường khác trông như đã launch.
- **Câu 13** — 1 / 3 / 12 tháng rồi hằng năm; sớm hơn khi có tín hiệu; cấu hình được (⇒ 4b).
- **Câu 2** — 6 trạng thái formula version; phê duyệt bản mới đưa bản cũ vào **Transition in Progress**, không phải Superseded; Superseded cần một **quyết định per-market ghi 10 dữ kiện**, *"must be recorded by a person — never inferred automatically"*. Câu hỏi còn mở: `R5-Q8` (ai ký).
- **Câu 4** — PMS baseline cho **mọi** sản phẩm đang bán + 14 điều kiện enhanced + market profile (⇒ 4b).
- **Câu 10** — tách danh sách 16 option thành Source (9) · Issue type (8) · Resulting action (6). **CAPA là hành động, không phải nguồn.**
- **Câu 15** — Product-performance → Conditional (5 trigger); Market feedback tách thành **hai** item.
- **Câu 35** — hai bộ giá trị riêng (7 + 6); "Other — specify" phải ghi quốc gia + dossier type, chưa ghi thì **chặn Gate 10**; N/A cần lý do + reviewer có thẩm quyền.

**Phụ thuộc:** nhóm 3 (khoá per-market + trạng thái Phase 4) · nhóm 4b. Danh sách enhanced của câu 4 đọc nhóm dễ tổn thương và infant ⇒ mềm phụ thuộc nhóm 7.

---

## Độc lập — ✅ **xong 29/08/2026**, một migration duy nhất

| Câu | Việc | Trạng thái |
|---|---|---|
| **20** | **Không có việc gì.** *"Current approach is correct"* — đúng như đã xây | ✅ từ đầu |
| **21** | Priority → **Must / Should / Could**; thêm **N/A kèm lý do**; Must phải xong, Should/Could hoãn qua PwC | ✅ |
| **22(b)(c)** | Bắt buộc chỉ định **Primary**; hai giá trị Owner/function mới | ✅ |
| **23(a)** | Option Product Type **"Product form under evaluation — to be confirmed by Gate 5"** | ✅ (23b thuộc nhóm 6) |
| **24** | Bỏ `initialTargetMarkets`; **Countries / Markets** là nguồn duy nhất | ✅ |
| **25(a)(b)(d)** | **Tách** `Dry / eczema-prone skin` thành hai option | ✅ (25c thuộc nhóm 7) |
| **36(b)** | **Costing / Commercial Feasibility Status** (6 giá trị) + assessor · review date · assumptions · evidence link | ✅ (36a thuộc nhóm 5) |

**Ba điều đáng ghi lại, vì không cái nào đọc ra được từ đáp án:**

1. **Câu 24 tự sinh ra một route mới.** Bỏ bắt buộc `markets` lúc tạo mà không làm gì thêm thì `markets` vẫn là write-once ở `POST /projects` — nghĩa là một dự án mở ra không có thị trường nào sẽ **không có cách nào ghi vào**, và item Gate 1 chuyển từ "trang trí" (luôn thoả) sang "không thể thoả", tệ hơn chỗ xuất phát. Nên có `PUT /projects/:id/markets` (khoá theo gate 01 như mọi bằng chứng Gate 1 khác), thêm thị trường thì tạo luôn `MarketTrack` như `project-scaffold`, và **bỏ** một thị trường đã ghi tiến độ thì bị chặn — cùng kiểu guard đã dùng cho dòng Supplier & RM Evidence mà BOM còn tham chiếu.
2. **Câu 36(b) không cần trường mới cho "commercially dependent".** Đáp án tự nói chỗ ghi: *"where that commercial requirement is a **Must**"* — và câu 21 vừa đặt Must/Should/Could lên đúng dòng *Target cost or commercial boundary*. Nên trigger `commercialRequirementIsMust` đọc thẳng dòng đó, và item costing ở Gate 5 có hai bản: bản Supporting luôn hiện (cảnh báo), bản Conditional chặn-mềm khi dự án phụ thuộc thương mại (PwC gỡ được, đúng *"Hold or Proceed with Conditions rather than being ignored"*).
3. **Không ánh xạ Low/Medium/High/Critical sang Must/Should/Could.** Lý do đáp án bác thang cũ là chúng khác *loại* phán đoán ("criticality remains a risk concept"), nên mọi ánh xạ là ta tự đặt ra một tương đương mà đáp án phủ nhận. Migration giữ nguyên giá trị cũ vào `notes` và **xoá** cột priority để người chọn lại. Trên dev không có dòng nào bị ảnh hưởng (194 dòng đều trống).

**Hai câu R5 mới sinh ra từ đây:** `R5-Q22` (N/A có áp cho bảng requirement Phase 2-4 không) và `R5-Q23` (hoãn Should/Could thì ai sở hữu, hạn ở đâu, và một dòng áp dụng có buộc phải có priority không — chỗ này đang chạy trên giả định).

---

## Kiểm chứng khi làm từng nhóm

- `npm run verify:readiness` — sau **mỗi** commit. Sweep TAG fail theo cả hai chiều; bộ đếm `[R4-REWORK]` phải **giảm** đúng bằng số chỗ nhóm đó xử lý.
- `npm run verify:scaffold` — bắt buộc sau khi thêm checklist section, requirement row, Key Gate Check row hoặc dòng của register `mode:'fixed'`. Nhóm 1, 6, 7 và 8 đều thêm; đây là lỗi đã xảy ra bốn lần và lần nào cũng do người phát hiện, không phải công cụ.
- `npm run build` — shared → api → web.
- Với nhóm 3 (chữ ký): kiểm bằng exploit từng vai trò như lần làm chữ ký phase (19 ca, xem ghi chú `20260820060000_phase_signoff_authenticated` trong CLAUDE.md) — không chỉ kiểm đường thành công.
