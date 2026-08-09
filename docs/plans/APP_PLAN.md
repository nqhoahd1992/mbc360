# MBc360 – Kế hoạch xây dựng ứng dụng Product Development & Quality System

> Nguồn: `MBc360 Master Product Development System File.xlsx` (55 sheets, bản "V18" — tên tab có tiền tố người phụ trách, thêm Extended User-Safety Compartments ở Phase 3, register Released Label Control và các sheet tham chiếu Template_Index/Requirements/MBC360 FEEDBACK)
> Giai đoạn 1: **Demo UI thuần ReactJS** (màn hình + form cơ bản, mock data). Backend & database phát triển sau.

---

## 1. Tóm tắt quy trình nghiệp vụ (từ file Excel)

Hệ thống MBc360 là **quy trình Phase-Gate** kiểm soát chất lượng sản phẩm từ Marketing đến khi ra thị trường:

### 4 Phase / 12 Gate

| Phase | Gate | Nội dung | Bộ phận chịu trách nhiệm |
|---|---|---|---|
| **Phase 1 – User & Product Definition** | 01 | Request & Opportunity – tiếp nhận yêu cầu, sàng lọc ban đầu | Marketing / Sales / Project Owner |
| | 02 | Target User & Product Brief – người dùng mục tiêu, thị trường, tiêu chí thành công | |
| | 03 | Product Concept & Claims – chốt concept, định hướng claim, benchmark | |
| **Phase 2 – Ingredient & Formula Qualification** | 04 | Ingredient & Supplier Screening – sàng lọc nguyên liệu, nhà cung cấp | NPD / R&I / Procurement / Packaging |
| | 05 | Formula, BOM & Costing – công thức, BOM, chi phí, pH/process targets | |
| | 06 | Packaging & Artwork Requirements – bao bì, artwork | |
| **Phase 3 – Validation & Quality Control** | 07 | Maternal & Baby-Contact Safety – an toàn mẹ & bé ("Skincare for Two", bắt buộc) | Quality / Safety / R&I / Manufacturing |
| | 08 | Testing, Methods & Validation – kế hoạch test, study trên người, validation | |
| | 09 | Stability, Compatibility & Release Readiness – độ ổn định, tương thích bao bì | |
| **Phase 4 – Evidence, Release & Improvement** | 10 | Regulatory Dossier & Claims Evidence – PIF/CPSR, bằng chứng claim | Regulatory / Quality / Management / Sales |
| | 11 | Production, Launch & Sales Support Sign-Off – sẵn sàng sản xuất, phê duyệt launch | |
| | 12 | Post-Market Monitoring & Improvement – feedback thị trường, complaint, CAPA | |
| **Xuyên suốt** | ALL | Change Control & Communication – không cho phép "sửa âm thầm" (no silent corrections) | Project Owner / QA |

### Cấu trúc chung của mỗi Phase sheet
Mỗi Phase sheet trong Excel có cùng bố cục, đây chính là khung form của ứng dụng:
1. **Project Identification** – Project ID, Product Code, Project Lead, Product Group, Brand, ngày mở, ngày launch dự kiến, thị trường.
2. **Phase Gate Flow** – bảng 3 gate: trạng thái stage, quyết định gate (Go / Hold / Backtrack…), owner, due date, link bằng chứng, ghi chú/blockers.
3. **Các Checklist section** (checkbox nhiều lựa chọn, mỗi dòng kèm Owner / Status Y-N-NA / Evidence link / Notes):
   - Phase 1: Target Area of Body (12), Product Type (27), Target Users/Life Stage (17), Target Countries (21), Claim/Benefit Areas (32), Initial Evidence Route (12)
   - Phase 2: RM Document Pack (20), Sensory/Appearance (22), Packaging Options (20), Artwork/Regulatory Triggers (14)
   - Phase 3: Testing Families (20), Post-market sources…
   - Phase 4: Regulatory/Claims Closure (14), Production/Launch Records (14), Post-Market Feedback Sources (16)
4. **Các Requirement table** (mỗi dòng: requirement, minimum requirement, rationale, owner, status, evidence link, notes):
   - Phase 2: Formulation Design Requirements, Efficacy & Process Protection
   - Phase 3: Skincare for Two Mandatory Safety, Human/Consumer Study, Stability/Release Readiness
   - Phase 4: Dossier/HCP Evidence, Change Control Closure
5. **Key Gate Checks** – checklist chốt gate (Done, Y/N/NA, Date, Evidence, Method ref, Initials, Notes).
6. **8 Angles Coverage** – 8 góc kiểm tra trước khi đóng gate: Consumer need, Use context & life stage, Ingredient suitability, Formula compatibility, Safety, Quality, Claims evidence, Real-world performance.
7. **Evidence Summary & Sign-off** – Prepared by / Reviewed by / Approved by + Decision + Next action.

### Các sheet hỗ trợ chính (support modules)
- **Formula_BOM / Packaging_BOM / Costing_Calc** – BOM công thức & bao bì, tính COGS, margin.
- **Change_Control_Comm** – log thay đổi: Change ID, trigger, risk level, sign-offs, communication, closure.
- **Product_Evidence_Summary / Test_Report_Index / Evidence Register** – tổng hợp trạng thái bằng chứng.
- **PostMarket_CAPA** – complaint, adverse event, CAPA sau launch.
- **Product_Feedback_Form** – panel đánh giá mẫu phát triển (texture, fragrance, overall 1-5, cờ an toàn trơn/nhờn).
- **Safety/Regulatory**: Prohibited_Ingredients, PB_Caution_Limits, Formulation_Safety, Fragrance_Safety, PIF_Checklist_ASEAN, Medical_Summary…
- **Registers**: Product_Family_Register, Formulation_Change_Register, SKU_Claims_PIF_Register.

### Nguyên tắc nghiệp vụ quan trọng cần thể hiện trong app
- Gate phải hoàn thành **theo thứ tự**, trừ khi ghi nhận Backtrack/Hold.
- Mọi mục check hỗ trợ quyết định phải có **evidence link + date + initials**.
- **Skincare for Two**: sản phẩm cho mẹ bắt buộc đánh giá tiếp xúc với em bé.
- **No silent corrections**: mọi thay đổi artwork/formula/label/claim đi qua Change Control.
- Study trên người cần: proposal → Head sign-off → independent reviewer → hồ sơ lưu.
- PIF mapping bắt buộc trước khi export dossier / submit thị trường.

---

## 2. Kiến trúc & công nghệ (giai đoạn demo)

| Hạng mục | Lựa chọn | Lý do |
|---|---|---|
| Framework | **React 18 + Vite + TypeScript** | Nhanh, chuẩn hiện tại; TypeScript giúp định nghĩa data model dùng lại khi làm backend |
| UI library | **Ant Design 5** | Hệ thống form/table/steps/tag rất hợp app nghiệp vụ nhiều form & bảng; đỡ tốn công style |
| Routing | react-router v6 | |
| State | Zustand (hoặc React Context) + **persist vào localStorage** | Demo không backend nhưng dữ liệu nhập vẫn giữ được khi reload |
| Mock data | File JSON seed (1–2 dự án mẫu) | Demo có sẵn dữ liệu để trình bày |
| i18n | Chuẩn bị sẵn (chuỗi UI tiếng Anh 100% theo quy ước) | |

> Toàn bộ code, label UI, comment: **tiếng Anh**.

## 3. Data model (TypeScript – dùng lại cho backend sau này)

```ts
type GateStatus = 'Not Started' | 'In Progress' | 'Completed' | 'On Hold' | 'Backtracked';
type GateDecision = 'Go' | 'Conditional Go' | 'Hold' | 'Backtrack' | 'Stop';
type YNNA = 'Y' | 'N' | 'NA';

interface Project {
  id: string;              // Project ID
  productCode: string;
  projectLead: string;
  productGroup: string;
  brandCustomer: string;
  dateOpened: string;
  targetLaunchDate: string;
  productSku: string;
  ownerDepartment: string;
  markets: string[];
  gates: GateRecord[12];   // trạng thái 12 gate
}

interface GateRecord {
  gateId: string;          // SG01..SG12
  status: GateStatus;
  decision?: GateDecision;
  owner: string;
  dueDate?: string;
  evidenceLink?: string;
  notes?: string;
}

interface ChecklistItem {   // dòng checkbox (Target area, Product type, Claims...)
  label: string;
  selected: boolean;
  ownerFunction: string;
  status: YNNA;
  evidenceLink?: string;
  notes?: string;
}

interface RequirementItem { // dòng requirement table
  requirement: string;
  minimumRequirement: string;
  rationale: string;
  owner: string;
  status: GateStatus;
  evidenceLink?: string;
  notes?: string;
}

interface GateCheck {       // Key Gate Checks
  gateId: string;
  check: string;
  done: boolean;
  ynna: YNNA;
  date?: string;
  evidenceRef?: string;
  methodRef?: string;
  internalLink?: string;
  initials?: string;
  notes?: string;
}

interface SignOff { role: 'Prepared' | 'Reviewed' | 'Approved'; name: string; initials: string; date: string; decision: string; comments: string; }

interface ChangeRecord {    // Change_Control_Comm
  changeId: string;         // CHG-001
  trigger: string;
  productSku: string;
  affectedArea: string;     // artwork | formula | label | claim | supplier | process | market
  riskLevel: 'Low' | 'Medium' | 'High';
  requiredAction: string;
  signOffs: string[];
  communicationRequired: boolean;
  status: GateStatus;
  owner: string;
  closedDate?: string;
}

interface BomLine { line: number; rmCode: string; inciName: string; functionRole: string; supplier: string; percentWw: number; costPerKg: number; /* derived: kgNeeded, costPerBatch, costPerUnit */ }
```

## 4. Danh sách màn hình (demo scope)

### 4.1. Khung ứng dụng
- **Layout**: sidebar (Dashboard, Projects, Change Control, Registers, Settings) + header (tên project đang mở, user giả lập).

### 4.2. Màn hình chính

| # | Màn hình | Route | Nội dung chính |
|---|---|---|---|
| 1 | **Dashboard** | `/` | Thẻ tổng quan: số project theo phase, gate đang chờ quyết định, change control mở, cảnh báo quá hạn. Bảng project + progress bar 12 gate |
| 2 | **Project List** | `/projects` | Bảng danh sách + nút "New Project" (modal form Project Identification) |
| 3 | **Project Overview** | `/projects/:id` | Header thông tin project + **Gate Stepper 12 bước** chia 4 phase (màu theo status), 8 Angles summary, sign-off status từng phase |
| 4 | **Phase 1 – Marketing (Gates 1–3)** | `/projects/:id/phase/1` | Tab/accordion: Gate Flow table → checklist Target Area / Product Type / Target Users / Markets / Claims / Evidence Route → Key Gate Checks → 8 Angles → Sign-off |
| 5 | **Phase 2 – NPD (Gates 4–6)** | `/projects/:id/phase/2` | RM Document Pack, Formulation Design Requirements, Efficacy & Process Checks, Sensory choices, Packaging Options, Artwork Triggers, Key Gate Checks, 8 Angles, Sign-off |
| 6 | **Phase 3 – Quality (Gates 7–9)** | `/projects/:id/phase/3` | Skincare-for-Two mandatory checks, Testing Families, Human Study checks, Stability/Release checks, Key Gate Checks, 8 Angles, Sign-off |
| 7 | **Phase 4 – Reg + Mgt (Gates 10–12)** | `/projects/:id/phase/4` | Dossier/HCP Evidence, Regulatory Closure, Production/Launch Records, Post-Market Feedback Sources, Change Control Closure, Key Gate Checks, 8 Angles, Sign-off |
| 8 | **Formula BOM & Costing** | `/projects/:id/bom` | Bảng BOM editable (%w/w, cost/kg → tự tính kg needed, cost/batch, cost/unit) + panel Costing inputs (batch size, fill size, target units → COGS, margin) |
| 9 | **Change Control** | `/change-control` | Bảng change log toàn cục + form tạo Change Request (trigger, affected area, risk, sign-offs, communication) + timeline trạng thái |
| 10 | **Evidence Summary** | `/projects/:id/evidence` | Bảng Product_Evidence_Summary: evidence area, required?, template, owner, status, gate — dạng status board |
| 11 | **Post-Market / CAPA** | `/projects/:id/post-market` | Log complaint/AE/CAPA + form nhập record mới |
| 12 | **Product Feedback (Panel)** | `/projects/:id/feedback` | Form chấm điểm mẫu (texture/fragrance/overall 1–5, cờ "too oily/slippery – SAFETY") + bảng tổng hợp kết quả panel |

### 4.3. Component tái sử dụng (quan trọng nhất của demo)
Vì mọi Phase sheet dùng chung ~6 khối, chỉ cần xây **6 component chính** rồi lắp bằng config:

1. `ProjectIdentificationCard` – thông tin định danh project (shared cho cả 4 phase).
2. `GateFlowTable` – bảng gate của phase: status dropdown, decision dropdown, owner, due date, evidence, notes.
3. `ChecklistSection` – section checkbox nhiều lựa chọn (nhận props: title, items[], có cột owner/status/evidence/notes). Dùng cho ~15 section khác nhau.
4. `RequirementTable` – bảng requirement/minimum/rationale/owner/status/evidence/notes.
5. `GateChecksTable` – Key Gate Checks (done, Y/N/NA, date, initials…).
6. `EightAnglesTable` + `SignOffBlock` – khối chốt phase.

→ Nội dung từng phase định nghĩa bằng **file config JSON/TS** (danh sách option lấy đúng từ Excel), không hard-code UI riêng từng phase.

## 5. Cấu trúc thư mục

```
mbc360-app/
├── src/
│   ├── components/          # 6 reusable blocks + StatusBadge, PhaseStepper...
│   ├── config/              # phase1.ts..phase4.ts (checklist options từ Excel), gates.ts
│   ├── data/                # seed mock data (2 projects mẫu)
│   ├── pages/               # Dashboard, ProjectList, ProjectOverview, PhasePage, Bom, ChangeControl...
│   ├── store/               # Zustand store + localStorage persist
│   ├── types/               # TypeScript interfaces (mục 3)
│   └── App.tsx / main.tsx
└── package.json
```

## 6. Lộ trình thực hiện

| Bước | Nội dung | Kết quả |
|---|---|---|
| **1. Scaffold** | Vite + React + TS + AntD + router + layout + store | Khung app chạy được |
| **2. Types + Config + Seed** | Data model, config 4 phase (toàn bộ option từ Excel), 2 project mẫu | Dữ liệu demo |
| **3. Core components** | 6 component tái sử dụng | Khối xây dựng chính |
| **4. Screens** | Dashboard → Project List/Overview → 4 Phase pages | Luồng chính demo được |
| **5. Support modules** | BOM/Costing, Change Control, Evidence Summary, Feedback, CAPA | Đủ scope demo |
| **6. Polish** | Progress %, badge màu, validation gate-order, export JSON | Sẵn sàng trình bày |

### Ngoài scope demo (làm khi có backend)
- Đăng nhập, phân quyền theo phòng ban (Marketing/NPD/Quality/Regulatory).
- Upload file bằng chứng thật (demo chỉ nhập link).
- Workflow phê duyệt thật (email/notification), audit trail.
- Các sheet hỗ trợ còn lại (PIF checklist chi tiết, Formulation_Safety, Supplier_RM_Evidence…) — demo chỉ làm nhóm tiêu biểu, các sheet còn lại cùng pattern nên bổ sung sau bằng config.
- Import/export Excel hai chiều.

## 7. Đề xuất backend sau này (tham khảo)
- **API**: Node.js (NestJS) hoặc .NET; **DB**: PostgreSQL.
- Schema bám sát TypeScript types ở mục 3 → chuyển đổi gần như 1:1.
- Bảng chính: `projects`, `gate_records`, `checklist_items`, `requirement_items`, `gate_checks`, `sign_offs`, `change_records`, `bom_lines`, `evidence_items`, `capa_records`, `feedback_entries`.
