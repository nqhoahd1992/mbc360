# MBc360 – Kế hoạch xây dựng Backend (Production)

> **Trạng thái đầu vào (2026-07-16, cập nhật 2026-07-17):** Phần lớn Group A (kiến trúc dữ liệu) và các rule B1–B4, C1–C6 đã được đội chuyên gia xác nhận trong `docs/Business_Rules_Confirmation_{EN,VN}.md`. Còn treo: **A5, B5, C7** và các follow-up **F1–F14**. Kế hoạch này được thiết kế để **không bị các câu F chặn**: mọi câu trả lời đến sau sẽ rơi vào *dữ liệu cấu hình* (seed data), không phải thay đổi schema — trừ hai điểm rủi ro F4/F6 được xử lý phòng thủ ngay từ đầu (xem mục 4).

---

## 1. Mục tiêu & phạm vi

- Chuyển MBc360 từ **demo UI (localStorage)** thành hệ thống thật: backend + database + đăng nhập + phân quyền + audit trail.
- Frontend hiện tại được giữ lại làm client: thay tầng persist của Zustand bằng API client, **giữ nguyên chữ ký các store action** (`setGate`, `setRegisterRowsBulk`, `backtrackGate`, …) để UI gần như không đổi. *(Từ 2026-07-17, các bảng nhập liệu inline đã chuyển sang cơ chế draft cục bộ + nút Save tường minh — xem `CLAUDE.md` mục "Editable tables" — nên các store action giờ là **bulk** theo bảng/section, không còn setter theo từng ô; khi build API ở M3, mỗi action bulk này ánh xạ tự nhiên thành một endpoint `PUT` ghi cả mảng/section trong một request.)*
- Backend trở thành **nơi thực thi luật** (source of truth): mọi rule trong `src/utils/gateProgress.ts` phải được enforce ở server, không chỉ ở UI.
- Tôn trọng định hướng hệ thống đã chốt: *"MBc360 là nền tảng evidence & governance duy nhất, **tích hợp** với hệ thống chuyên biệt (Cosmetri, GMP Manufacturing) chứ **không thay thế**"*.

Ngoài phạm vi: sinh/quản lý tài liệu GMP (chỉ lưu link — theo yêu cầu bổ sung của team), ghi dữ liệu vào Cosmetri (read-only tuyệt đối).

## 2. Công nghệ đề xuất

| Hạng mục | Đề xuất | Lý do |
|---|---|---|
| Runtime/API | **Node.js + NestJS** (REST) | Cùng ngôn ngữ TypeScript với frontend → tái sử dụng nguyên vẹn `src/types/index.ts` và **port trực tiếp `gateProgress.ts`** sang server (rule engine chỉ viết một lần, chạy hai nơi). APP_PLAN mục 7 đã đề xuất NestJS hoặc .NET — chọn NestJS vì lợi thế chia sẻ code; .NET vẫn là phương án thay thế nếu hạ tầng công ty yêu cầu. |
| ORM/Migration | **Prisma** | Schema khai báo, migration có kiểm soát, map tốt sang PostgreSQL JSONB (cần cho register rows). |
| Database | **PostgreSQL** | Đã chốt trong APP_PLAN mục 7. JSONB cho register động, kiểu mạnh cho bảng nghiệp vụ. |
| Đăng nhập | **Microsoft Entra ID (SSO/OIDC)** | Công ty đã dùng hệ sinh thái Microsoft (Power Apps, SharePoint/Graph settings có sẵn trong demo). User + department lấy từ AD — đúng nguồn mà F6 đang hỏi. SSO qua OIDC hoạt động bình thường với app tự host (chỉ cần đăng ký redirect URI của domain nội bộ). |
| File bằng chứng | **SharePoint/Graph API** (link + upload) | Demo đã có `GraphSettings`; evidence thật nằm trong hệ sinh thái sẵn có, MBc360 lưu reference. |
| Cấu trúc repo | **Monorepo** (`apps/web`, `apps/api`, `packages/shared`) | `packages/shared` chứa types + rule engine (`gateProgress`, `ingredientWatch`) + config (`gates.ts`, `phases.ts`, `registers.ts`) dùng chung cho cả web và api — tránh hai bản luật lệch nhau. |
| Hạ tầng | **Tự host, đóng gói bằng Docker cho production** (đã chốt) | Mỗi thành phần một image: `api` (NestJS), `web` (static build), `postgres`; điều phối bằng **docker-compose** trên server tự quản, reverse proxy **nginx** (sẵn có trên server) lo TLS. **Dev không chạy app trong container** — chỉ Postgres chạy Docker, frontend/backend chạy `npm run dev` để có hot-reload (chi tiết mục 6.1). |

## 3. Nguyên tắc kiến trúc (bắt buộc, suy ra từ các quyết định đã confirm)

1. **Append-only / "no silent corrections" (B4, A4).** Không bao giờ ghi đè lịch sử phê duyệt. Mọi mutation nghiệp vụ ghi một dòng vào `audit_events`; approval/sign-off là bản ghi bất biến — "hủy hiệu lực" là **một sự kiện mới** (`invalidated_by_event_id`), không phải xóa/sửa. Tài liệu confirmation ghi rõ: *"invalidation is a new recorded event, never an overwrite"* — backend phải làm đúng ngay từ đầu, **không copy cách demo clear field tại chỗ**.
2. **Rule engine data-driven (đón F1/F2/F3/F7/F8/F9).** Điều kiện pass gate (B1: status + decision + required sign-offs + mandatory evidence) đọc từ bảng cấu hình `gate_requirements`, không hard-code. Engine build ngay; khi F1 trả lời thì chỉ seed thêm rows.
3. **Formula version là entity riêng (phòng thủ F4).** Không dùng một field `formulaVersion` trên project như demo. `formula_versions` là bảng riêng; BOM và market track **tham chiếu tới version**. Dù F4 trả lời theo hướng nào (2 version song song hay không), schema đều khớp.
4. **Gates 1–9 chung, Gates 10–12 per-market (A1/C5).** `market_tracks` per (project, market), mang PIF/Regulatory/Claims/Launch status + dates; launch approval hard-block khi PIF chưa Approved — enforce ở API, không chỉ UI.
5. **Cosmetri read-only qua proxy (A3).** Browser không bao giờ giữ credential Cosmetri. Backend giữ token, đồng bộ polling (`since_updated_at`), cache local, và **không có code path nào gọi `PUT /raw-material/update`**.
6. **Register config-driven như frontend.** ~37 evidence register dùng chung một bảng `register_rows` (JSONB) + định nghĩa cột từ `packages/shared/config/registers.ts`. Thêm register mới (vd. F10 — checklist EU CPSR/AU/US) = thêm config, không migration.
7. **(Thêm 2026-07-23) Validate nghiệp vụ ở server là nguồn xác thực duy nhất, không suy diễn từ việc frontend đã chặn.** Mọi guard hiện có ở `apps/web/src/store/useAppStore.ts` (B1 Gap/F9 open-change chặn Proceed, F1/C7 mandatory evidence, C1 Skincare for Two, C2 Independent Reviewer khác department, C5 PIF Approved trước khi launch, B4 backtrack reset + invalidate sign-off) phải được **implement lại y hệt ở API** — không phải "vì UI đã disable option/nút Save nên server khỏi check". Client luôn có thể bị bypass (gọi thẳng endpoint, devtools, request thủ công/script) — nếu server không tự enforce thì rule coi như không tồn tại. Dùng lại pure function đã có trong `packages/shared/src/utils/gateProgress.ts` (không copy lại logic) theo đúng nguyên tắc monorepo "never fork a copy".
8. **(Thêm 2026-07-23) Concurrency control — chống race condition khi 2 request cùng sửa 1 project.** Các action đọc nhiều bản ghi rồi ghi lại nhiều bản ghi cùng lúc (`setGatesBulk`, `backtrackGate`, `createFormulaVersion`) không được tách thành nhiều round-trip riêng: phải chạy trong **1 Prisma transaction duy nhất**, đủ mạnh để 2 request gần như đồng thời (2 tab, 2 người) không thể tính guard (`isGateUnlocked`/`gateBlockers`) dựa trên dữ liệu đã bị request kia ghi đè — dùng mức cô lập Serializable hoặc khoá theo `project_id` (`SELECT ... FOR UPDATE`). Thêm cột `version` (optimistic lock) ở mức `projects`: client gửi kèm version đã fetch khi ghi, server trả `409 Conflict` nếu version hiện tại đã lệch, thay vì âm thầm ghi đè (last-write-wins không chấp nhận được cho dữ liệu Phase-Gate có tính pháp lý/audit).
9. **(Thêm 2026-07-23) Idempotency cho mọi endpoint tạo side-effect mới.** `POST /api/projects`, `POST /api/projects/:id/backtrack`, tạo formula version (A2), thêm CAPA/Feedback... là hành động có thể bị gọi lặp (double-click, timeout client rồi resend, retry mạng) mà server không có cách phân biệt "gọi lại do lỗi" với "cố ý tạo thêm 1 bản ghi". Mọi endpoint POST dạng "action" (không phải CRUD liệt kê/đọc) phải nhận header `Idempotency-Key` do client tự sinh 1 lần/thao tác (giữ nguyên khi resend); server lưu key kèm response đã trả (bảng nhỏ `idempotency_keys`: key, endpoint, request_hash, response_json, created_at, TTL vài giờ) — nếu key đã thấy, trả lại đúng response cũ thay vì chạy lại logic và tạo bản ghi thứ hai.

## 4. Thiết kế database (bản phác)

### 4.1. Danh tính & phân quyền
- `users` (từ SSO: oid, email, display_name, department_id, active)
- `departments`
- `roles`, `user_roles`
- `permissions` / `role_permissions` — **ma trận role × resource × hành động (contribute / decide / approve / sign)**. Chờ F6: seed ban đầu tái tạo đúng logic keyword-match của `src/utils/roles.ts` (demo-parity), thay bằng ma trận thật khi có — chỉ đổi data.

### 4.2. Project & gate flow
- `projects` (các field `ProjectIdentity`; `markets` chuyển thành bảng con `project_markets`) — **thêm cột `version` (int, tăng mỗi lần ghi)** cho optimistic locking, xem nguyên tắc 8 ở §3
- `gate_records` (project_id, gate_id SG01–SG12, status, decision, owner, due_date, evidence_link, notes) — trạng thái hiện tại; mọi thay đổi ghi kèm `audit_events`
- `next_actions` (B2: description, owner, due_date, status, priority, date_completed, closed_by)
- `phase_closures` + `sign_offs` (role Prepared/Reviewed/Approved, ký bởi user thật, `signed_at`, `invalidated_by_event_id`)
- `angle_rows`, `gate_checks`, `checklist_items`, `requirement_items`
- `study_approvals` (C2: 3 role riêng; **constraint: Independent Reviewer.department ≠ Study Author.department** — check ở API vì department lấy từ users)
- `backtrack_events` (B4: initiated_by, reason, from/to gate, reopened_gate_ids, snapshot JSONB của gates + sign-offs trước khi reset)

### 4.3. Formula & thị trường
- `formula_versions` (project_id, version, previous_version_id, change_type Major/Minor, reason, initiated_by, status) — *entity riêng, xem nguyên tắc 3*
- `bom_lines` (formula_version_id, line, rm_code, inci_name, cas_no, percent_ww, cost, supplier, …), `packaging_bom_lines`, `costing_inputs`
- `market_tracks` (project_id, market, formula_version_id, pif/regulatory/claims/launch status, notes, dates)

### 4.4. Register & evidence
- `register_rows` (project_id, register_key, row_order, data JSONB, updated_by/at)
- `evidence_items` (Evidence Summary board)
- `attachments` (evidence file thật: SharePoint drive item id / URL, uploaded_by, linked_to)

### 4.5. Cross-cutting
- `change_records` (Change Control; `trigger_id` liên kết gate bị ảnh hưởng → soft-lock C4/F9)
- `capa_records`, `feedback_entries`
- `idempotency_keys` (key, endpoint, request_hash, response_json, created_at + TTL) — xem nguyên tắc 9 ở §3
- `audit_events` — **bảng xương sống**: (id, actor_id, project_id?, entity_type, entity_id, action, before JSONB, after JSONB, occurred_at). Đây là "electronic approval history" mà A4 yêu cầu.

### 4.6. Cấu hình luật (data, không phải code)
- `gate_requirements` (gate_id, requirement_type: sign_off | evidence_register_state | register_no_flagged_rows, params JSONB, enforcement: hard | soft) — **chờ F1 điền nội dung**
- `safety_triggers` (Skincare-for-Two: Pregnancy/Breastfeeding/Postpartum; thêm "Infant 0+" nếu F2 = yes)
- `watchlist_entries` (group_name, cas_no[], inci_keywords[], list_type: prohibited | pb_caution | market_restriction, market?) — **chờ F3** thay bảng demo trong `ingredientWatch.ts`

### 4.7. Cache tích hợp Cosmetri
- `cosmetri_raw_materials`, `cosmetri_formulas`, `cosmetri_compliance` (snapshot đồng bộ) + `cosmetri_sync_state` (cursor `since_updated_at`, last_sync_at, lỗi gần nhất)

## 5. API surface (REST, phác thảo)

- `POST /auth/callback` (OIDC), `GET /me` (user + department + permissions)
- `GET/POST /projects`, `GET /projects/:id` (aggregate như `ProjectData` hiện tại để frontend chuyển đổi nhẹ nhàng)
- Mutation 1:1 với store action hiện có, mỗi endpoint **tự enforce rule** trước khi ghi:
  - `PUT /projects/:id/gates/:gateId` — chặn Gap→Proceed (B1), kiểm tra `gate_requirements`, kiểm tra quyền decide (A4), kiểm tra soft-lock Change Control (C4)
  - `POST /projects/:id/backtrack` — tạo `backtrack_events` + snapshot + invalidate approvals (B4)
  - `POST /projects/:id/formula-versions` — Major: reopen SG04–SG09, invalidate Phase 2–3 approvals (A2)
  - `PUT /projects/:id/market-tracks/:market` — hard-block launch khi PIF ≠ Approved (C5), chỉ Regulatory (A4)
  - `PUT /projects/:id/phases/:phase/sign-offs` — chỉ mở khi `phaseCompletionChecklist` đạt (B3), đúng role
  - `POST/PUT /projects/:id/next-actions`, `.../registers/:key/rows`, `.../checklists`, `.../study-approvals` (check khác department), …
- `GET /projects/:id/gate-state` — trả kết quả rule engine (blockers, checklist, current gate) để UI hiển thị đúng như `gateProgress.ts` đang tính
- Tích hợp: `POST /integrations/cosmetri/connect|sync`, `GET /integrations/cosmetri/raw-materials|formulas/:id/compliance`, `POST /projects/:id/bom/import-cosmetri`
- Screening: `POST /projects/:id/bom/screen` (chạy `ingredientWatch` server-side trên watchlist DB)
- Admin: CRUD `gate_requirements`, `watchlist_entries`, role matrix (chuẩn bị sẵn chỗ cho F1/F3/F6)
- Audit: `GET /projects/:id/audit-events`, `GET /projects/:id/approval-history`

## 6. Lộ trình thực hiện

> Ước lượng cho 1–2 dev, đã tính làm song song. Các mốc M2–M4 có thể chạy chồng lấn một phần.

| Mốc | Nội dung | Ước lượng | Phụ thuộc |
|---|---|---|---|
| **M0 — Nền móng** ✅ *(hoàn thành 2026-07-16)* | Chuyển repo thành monorepo (`apps/web` = code hiện tại, `apps/api` = NestJS mới, `packages/shared` = types + config + `gateProgress` + `ingredientWatch`); CI (lint, tsc, build, build Docker image); Dockerfile production cho `api`/`web`; dev env: `docker-compose.dev.yml` chỉ chứa Postgres, app chạy `npm run dev` (mục 6.1). | ~1 tuần | — |
| **M1 — Schema & seed** ✅ *(hoàn thành 2026-07-17)* | Prisma schema theo mục 4 (`apps/api/prisma/schema.prisma`, Prisma 7 + adapter pg); migration đầu (`20260717012427_init`); seeder (`prisma/seed.ts`) dùng `src/projects/project-scaffold.ts` — bản port server-side của `store/factory.ts` (project mới sinh từ config, tái dùng cho `POST /projects` ở M3); seed rule-config: `safety_triggers` (C1), `watchlist_entries` (demo stand-in chờ F3), `gate_requirements` để trống chờ F1; `audit_events` + `AuditService` (ghi event trong cùng transaction với mutation). | ~2 tuần | M0 |
| **M2 — Auth & RBAC** ✅ *(hoàn thành 2026-07-17)* | OIDC Entra ID (authorization code + PKCE qua `openid-client`, session JWT trong cookie httpOnly; `GET /api/auth/login|callback`, `POST /api/auth/logout`, `GET /api/auth/me`); đồng bộ user + department từ Microsoft Graph khi đăng nhập; **dev mode** khi chưa có app registration (`POST /api/auth/dev-login` với user demo seed, tự tắt ở production); role model demo-parity chuyển vào `packages/shared/src/config/roles.ts` (web re-export — một nguồn duy nhất), seed materialize thành `roles`/`permissions`/`role_permissions` (43 grants); `SessionAuthGuard` global (route cần `@Public()` để mở) + `PermissionsService` (`canDecideGate`/`canApprovePhase`/`canApproveMarketTrack`) cho các endpoint M3. Login ghi `audit_events`. Đã đăng ký app Entra thật và **smoke-test SSO thành công end-to-end** (2026-07-17): login → Microsoft → callback → user + department "DEV" đồng bộ từ Graph → audit event `auth.login` (method `entra-id`). User mới qua SSO khởi tạo **không có role** cho tới khi admin gán (đúng thiết kế A4). | ~2 tuần | M1. *Ma trận thật chờ F6 — chỉ đổi seed.* |
| **M3 — Core API + rule engine server-side** 🔶 *(Phase 1 hoàn thành 2026-07-26; Phase 2–6 còn lại)* | Toàn bộ endpoint mục 5 cho project/gate/checklist/register/next-action/sign-off; rule engine dùng chung từ `packages/shared` + đọc `gate_requirements`; **chuyển frontend sang API** (thay persist middleware bằng API client, giữ chữ ký store action). **Phase 1 đã xong:** `ProjectsModule` với 7 endpoint (`GET/POST /projects`, `GET/DELETE /projects/:id`, `PUT /projects/:id/gates/:gateId`, `PUT /projects/:id/gates`, `POST /projects/:id/backtrack`); guard B1/F9/F1/C7/B4 chạy server-side bằng **chính** pure function của `packages/shared/src/utils/gateProgress.ts` (qua `project-mapper.ts` dựng lại `ProjectData` từ Prisma — không viết lại rule); optimistic lock `projects.version` trả `409`; `Idempotency-Key` + bảng `idempotency_keys` cho 2 endpoint POST; `gateChangeLog` suy ra từ `audit_events` (không thêm bảng); frontend `apps/web/src/api/projectsApi.ts` + `projects` đã **rời khỏi localStorage** hoàn toàn. Chi tiết + phần còn lại: `docs/M3_Frontend_Database_Migration_Plan.md`. | ~3–4 tuần | M1 (song song M2) |
| **M4 — Tích hợp Cosmetri** | **Token management đã làm sớm (2026-07-17), còn lại: polling sync + cache; import BOM từ formula/compliance; screening CAS/INCI server-side; link-out Power Apps khi thiếu nguyên liệu.** Token management: `cosmetri_connection` (bảng singleton) lưu access/refresh token phía backend — admin dán cặp access/refresh token lấy ngoài luồng (Cosmetri không cấp app registration/OAuth2 client, chỉ có username/password/token thủ công), backend validate ngay bằng cách gọi `PUT /oauth/token` (grant_type=refresh_token) — vừa xác nhận token hợp lệ vừa nhận cặp token mới rotate, khỏi cần nhập tay ngày hết hạn. `CosmetriRefreshJob` (`@nestjs/schedule`, cron mỗi 10 phút, buffer 15 phút) tự động refresh trước khi access token hết hạn (1 giờ) — không cần username/password thật nữa trừ khi refresh_token cũng hết hạn (7 ngày) mà job bị down suốt thời gian đó. Nút "Refresh now" (admin, `POST /api/integrations/cosmetri/refresh-now`) là phương án dự phòng thủ công. **Đã test thật với tài khoản Cosmetri thật qua UI — hoạt động.** | ~2 tuần | M1 (song song M3) |
| **M5 — Workflow nâng cao** | Backtrack event model đầy đủ (B4); formula versioning + reopen SG04–SG09 (A2); market tracks + hard-block PIF (A1/C5); study approvals (C2); Published Information Approval + violation flag (C6); Change Control soft-lock (C4). | ~2–3 tuần | M3 |
| **M6 — Hoàn thiện & UAT** | Upload evidence (SharePoint), notification phê duyệt (email/Teams), import/export Excel, hoàn thiện vận hành tự host (mục 6.1: backup, monitoring, rate-limit), migration dữ liệu demo (nếu cần), UAT với đội chuyên gia. | ~2–3 tuần | M3–M5 |

**Tổng: ~12–15 tuần.** Sau M3 là có bản chạy được end-to-end (login → project → gate flow trên DB thật) để demo sớm cho team nghiệp vụ.

### 6.1. Môi trường dev & triển khai tự host bằng Docker (đã chốt)

**Dev environment — không container hóa app, để giữ hot-reload:**
- Chỉ hạ tầng chạy Docker: `docker-compose.dev.yml` gồm `postgres` (+ `redis` nếu dùng) — thứ ít thay đổi và không cần rebuild.
- `apps/api`: `npm run dev` (NestJS watch mode / SWC — restart tự động khi đổi code).
- `apps/web`: `npm run dev` (Vite HMR như hiện tại). **Vite dev server proxy** `/api` → `http://localhost:3000` (cấu hình `server.proxy` trong `vite.config.ts`) để dev không gặp CORS và frontend gọi cùng đường dẫn tương đối như production.
- Prisma migration ở dev chạy trực tiếp (`prisma migrate dev`) từ máy dev vào Postgres container.
- Một lệnh khởi động chung ở root (vd. `npm run dev` dùng turborepo/concurrently) bật cả hai app song song.
- Docker image chỉ được build ở CI và khi test production-build cục bộ (`docker compose -f docker-compose.prod.yml up`) — không nằm trong vòng lặp code hằng ngày.

**Đóng gói (production):**
- `apps/api` → image NestJS (multi-stage build: `node:lts` build → runtime slim, chạy non-root, `HEALTHCHECK` trỏ `GET /health`).
- `apps/web` → multi-stage build Vite → image nginx serve static; API URL cấu hình lúc runtime (env → file config), không nướng cứng vào build.
- Prisma migration chạy như bước riêng khi deploy (`migrate deploy`), không tự chạy lúc container khởi động nhiều replica.

**Điều phối (docker-compose trên server tự quản):**
- Reverse proxy dùng **nginx sẵn có trên server** (host-level): TLS termination (HTTPS bắt buộc vì có OIDC), route `/` → container `web`, `/api` → container `api`. Không cần thêm service proxy trong compose.
- Services trong compose: `web`, `api`, `postgres` (volume riêng), tùy chọn `redis` nếu cần queue cho sync Cosmetri/notification — expose port ra localhost cho nginx host proxy vào.
- Secrets (chuỗi kết nối DB, client secret OIDC, credential Cosmetri) qua env file/Docker secrets **ngoài repo**; không commit.
- Registry: GHCR hoặc registry nội bộ; CI build + tag image theo commit, deploy bằng `docker compose pull && up -d`.

**Trách nhiệm vận hành đi kèm tự host (đưa vào M6):**
- **Backup PostgreSQL** — `pg_dump` định kỳ (cron container hoặc trên host) + lưu ngoài server + **kiểm tra restore định kỳ**. Đây là hệ thống evidence/audit cho quality & regulatory — mất dữ liệu audit trail là mất tính tuân thủ, backup là hạng mục bắt buộc, không phải tùy chọn.
- Log tập trung (ít nhất `docker logs` + logrotate; tốt hơn: Loki/Grafana), uptime check nội bộ, cảnh báo khi sync Cosmetri lỗi liên tục.
- Máy chủ cần truy cập ra ngoài tới Cosmetri API và Microsoft (OIDC/Graph); nếu mạng nội bộ có firewall egress thì mở trước.

## 7. Bản đồ follow-up F1–F14 → backend

| F | Khi có câu trả lời, đổ vào đâu | Chặn mốc nào? |
|---|---|---|
| F1 (evidence/sign-off bắt buộc per-gate) | Seed rows `gate_requirements` | **Không chặn** — engine làm ở M3, nội dung đến sau |
| F2 (Infant 0+) | Seed `safety_triggers` | Không chặn |
| F3 (CAS mapping, market lists) | Seed `watchlist_entries` + quy trình cập nhật (ai maintain → cần admin UI ở M6) | Không chặn |
| **F4 (version song song × market)** | Đã phòng thủ bằng `formula_versions` là entity + market track trỏ version. Câu trả lời quyết định *behavior* của `POST /formula-versions` (có reopen market track không) | **Nên có trước M5**; ưu tiên hỏi sớm nhất |
| F5 (Major/Minor) | Logic phân loại trong endpoint tạo version (auto-classify theo trigger catalogue nếu confirm) | Trước M5, có default (user tự chọn) |
| **F6 (ma trận role, e-signature)** | Seed `role_permissions`; nếu yêu cầu chuẩn 21 CFR Part 11 → bổ sung meaning-of-signature + re-auth khi ký (ảnh hưởng M2/M6) | M2 chạy được với seed demo-parity; **chuẩn e-signature nên chốt trước M6** |
| F7 (Gap × PwC) | Một điều kiện trong rule engine (flag config) | Không chặn |
| F8 (ai đóng Next Action) | Guard trên `PUT /next-actions/:id` | Không chặn |
| F9 (ngữ nghĩa soft-lock) | Behavior của gate endpoint (banner vs required acknowledgement — nếu acknowledgement thì thêm bảng `change_acknowledgements`, nhỏ) | Trước M5 |
| F10 (checklist non-ASEAN) | Config register mới trong `packages/shared` | Không chặn |
| F11 (workflow published info) | Config workflow states/roles cho register Published_Info_Approval | Trước M5 (có default 5 bước như demo) |
| F12(c) (Cosmetri coverage ASEAN/VN) | Thông tin — quyết định checklist per-market ở C5 | Không chặn |
| F13 (locked phase chặn toàn bộ input hay chỉ gate decision/sign-off) | Quyết định UI/rule-engine config (danh sách section bị disable) — không đổi schema | Không chặn |
| F14 (Formula BOM: bắt buộc import từ Cosmetri hay vẫn cho nhập tay) | Nếu bắt buộc import-only: thêm validation ở endpoint tạo/sửa BOM line (chặn tạo dòng không gắn `fromCosmetri`) — không đổi schema | Không chặn |

## 8. Rủi ro & quyết định cần chốt sớm

1. **F4** — rủi ro schema duy nhất còn lại; đã giảm thiểu bằng thiết kế version-entity nhưng cần câu trả lời trước M5. → *Thúc team nghiệp vụ trả lời F4 đầu tiên (cùng F1).*
2. **Chuẩn e-signature (trong F6)** — mức 21 CFR Part 11 sẽ thêm yêu cầu re-authentication khi ký và ràng buộc audit sâu hơn; chốt trước M6 để không rework màn hình ký.
3. **Hạ tầng deploy** — ✅ đã chốt: **tự host, đóng gói Docker** (chi tiết mục 6.1). Rủi ro còn lại của phương án này: backup/restore và bảo mật server là trách nhiệm nội bộ — cần phân công người vận hành cụ thể trước khi go-live.
4. **Tài khoản Cosmetri môi trường thật** — cần credential và xác nhận rate-limit thực tế trước M4; hiện mới có tài liệu swagger.
5. **Đồng bộ hai bản luật trong giai đoạn chuyển tiếp** — từ M3, `gateProgress.ts` chuyển vào `packages/shared`; tuyệt đối không để `apps/web` giữ bản sao riêng.

---

*Tài liệu liên quan: `docs/APP_PLAN.md` (spec gốc, mục 3 & 7), `docs/Business_Rules_Confirmation_{EN,VN}.md` (hồ sơ quyết định — khi một rule thay đổi phải cập nhật cả code lẫn tài liệu đó), `docs/swagger-init.json` (Cosmetri API).*
