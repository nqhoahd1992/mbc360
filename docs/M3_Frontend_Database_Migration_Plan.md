# M3 — Kế hoạch chuyển dữ liệu project từ localStorage sang Database thật

**Ngày:** 2026-07-22
**Bối cảnh:** Dự án đã đến giai đoạn triển khai thật — từ nay dữ liệu project **không còn lưu ở `localStorage` để demo nữa**, mà phải lưu vào Postgres qua API thật. Đây chính xác là milestone **M3** đã nêu trong `docs/BACKEND_PLAN.md` ("core API + rule engine server-side + switch the frontend from localStorage to the API") — theo `CLAUDE.md`, M0–M2 đã xong (monorepo skeleton, Prisma schema + migration, auth/RBAC) nhưng **M3 chưa bắt đầu**. Tài liệu này là kế hoạch triển khai chi tiết cho M3, bổ sung cho phần mô tả còn ngắn gọn ở §3/§4/§5 của `BACKEND_PLAN.md`.

## Hiện trạng (đã khảo sát code thực tế trước khi lên kế hoạch)

- **Schema Postgres đã sẵn sàng, khớp gần như 1:1 với `ProjectData`** phía frontend — mọi field frontend đang có (gates, checklists, requirements, gateChecks, phaseClosures/signOffs/angles, bom, packagingBom, costing, evidence, capa, feedback, registers — bảng `register_rows` JSONB dùng chung, nextActions, backtrackEvents, marketTracks, studyApprovals, formulaVersions) đều đã có model Prisma tương ứng. `apps/api/src/projects/project-scaffold.ts` đã là bản port phía server của `store/factory.ts`'s `createEmptyProject`, viết sẵn để chạy trong 1 transaction — nhưng **chưa được nối vào đâu cả**: không controller, không module, không đăng ký trong `app.module.ts`. `AuditService` (ghi `audit_events` append-only), `PermissionsService` (check quyền theo gate/phase/market-track), và `SessionAuthGuard`/`CurrentUser()` đều đã có sẵn, dùng lại được ngay.
- **Chưa có bất kỳ route API nào cho project-data.** 8 controller hiện có chỉ là health/meta/auth/admin/cosmetri — chưa route nào đụng tới `Project`, `GateRecord`, `RegisterRow`, v.v.
- **Frontend (`apps/web/src/store/useAppStore.ts`) hiện 100% chạy trên localStorage** (`zustand/persist`, key `mbc360-demo-store`, version hiện tại là 10, `migrate` chỉ re-seed mỗi lần đổi schema). Store có ~30 action, phủ 20 field của `ProjectData`, được gọi từ 83 vị trí trên 25 file — một số action có gài sẵn business rule guard (B1/F9 trong `setGate`/`setGatesBulk`, B4 snapshot-trước-khi-sửa trong `backtrackGate`, C2 kiểm tra xung đột department trong `setStudyApprovalsBulk`, C5 chặn launch approval trong `setMarketTracksBulk`, A2 reopen cascade trong `createFormulaVersion`) — những guard này phải được implement lại đúng y hệt ở server, không chỉ đơn thuần "chuyển chỗ lưu".
- `BACKEND_PLAN.md` đã định hướng sẵn cách làm: **giữ nguyên Zustand, giữ nguyên chữ ký mọi store action**, chỉ thay tầng `persist` bằng API client bên dưới (§1: *"thay tầng persist của Zustand bằng API client, giữ nguyên chữ ký các store action... để UI gần như không đổi"*). Các action đã ở dạng bulk theo section (từ đợt refactor draft/Save 2026-07-17), khớp tự nhiên với `PUT` ghi cả mảng/section trong 1 request.

Với quy mô này (20 field × ~30 action × 25 component), làm toàn bộ trong 1 lần là không thực tế và rủi ro cao. Kế hoạch chia thành các phase độc lập, deploy/test được từng phase, bắt đầu từ đúng phần vừa xây dựng trong phiên làm việc này (Phase Gate Flow, Backtrack, Gate Change Log) để những tính năng đó trở thành phép thử end-to-end đầu tiên cho kiến trúc mới.

## Các quyết định đề xuất (chưa hỏi lại người dùng — ghi rõ để xem lại trước khi code Phase 1)

1. **`gateChangeLog` không cần bảng riêng — tái dùng `audit_events`.** Mỗi lần sửa gate đã ghi 1 dòng `audit_events` (`before`/`after` JSON) khi API được nối. Thay vì thêm bảng `gate_change_log` trùng mục đích, `GET /api/projects/:id` sẽ tự tính diff field (`GateFieldChange[]`) bằng cách so sánh các dòng `audit_events` liên tiếp có `entityType: 'gate_record'` ngay khi trả response. Đúng tinh thần "`audit_events` là xương sống" đã ghi trong `BACKEND_PLAN.md`.
2. **Chưa cần optimistic locking ở Phase 1** — last-write-wins, khớp với việc `BACKEND_PLAN.md` chưa đề cập vấn đề này và quy mô team nội bộ nhỏ hiện tại. Sẽ xem lại nếu thực tế phát sinh xung đột sửa đồng thời.
3. `viewRole` (mô phỏng RBAC) và `integrations` (Power Apps URL, Graph settings) là dữ liệu toàn cục, không thuộc từng project — sẽ chuyển thành 1 endpoint settings đơn giản, hoặc (riêng `viewRole`, vì F6 RBAC thật đã có qua `SessionAuthGuard`) **bỏ hẳn** khi role đăng nhập thật thay thế hoàn toàn "View as" — đúng hướng đã ghi trong `CLAUDE.md`.
4. `resetDemoData` sẽ bị xoá — chỉ có ý nghĩa với dữ liệu demo, không còn ý nghĩa với database thật.

## Chia phase

| Phase | Phạm vi (field `ProjectData` / store action) | Vì sao nhóm như vậy |
|---|---|---|
| **1 (làm trước)** | `identity` (CRUD project), `gates` + `gateChangeLog` (`setGate`, `setGatesBulk`), `backtrackEvents` (`backtrackGate`) | Đúng phần vừa xây và test trong phiên này; là vertical slice nhỏ nhất nhưng đầy đủ (tạo project → sửa/pass gate → backtrack → xem lịch sử), chứng minh toàn bộ pipeline (auth → guard → audit → response shape → frontend API client) hoạt động end-to-end. |
| **2** | `checklists`, `requirements`, `gateChecks`, `phaseClosures` (angles + signOffs + preWork + evidenceSummary) | Phần còn lại của "6 khối dùng chung" trên trang Phase — cùng trang, nối tiếp tự nhiên sau khi Phase 1 chứng minh được cách làm. |
| **3** | `registers` (48 config, dùng chung `register_rows`), `evidence` | 1 dạng endpoint chung duy nhất (`PUT /projects/:id/registers/:key`), số lượng config lớn nhưng cơ chế đồng nhất. |
| **4** | `bom`, `packagingBom`, `costing`, `formulaVersion`/`formulaVersionHistory` (`createFormulaVersion`) | Cụm formula/costing; `createFormulaVersion`'s A2 Major-reopen cascade dùng lại đúng logic reopen của Backtrack ở Phase 1. |
| **5** | `nextActions`, `marketTracks`, `studyApprovals` | Các workflow có gate còn lại (F8, C5, C2). |
| **6** | `capa`, `feedback`, `changes` (Change Control, toàn cục) | Trang Post-Market + Change Control; ít phụ thuộc vào rule engine gate nhất. |

Mỗi phase: thêm endpoint API còn thiếu → thêm 1 API client mỏng phía frontend cho phần đó → viết lại store action tương ứng để gọi API (giữ nguyên chữ ký) → bỏ phần dữ liệu đó khỏi những gì `persist` cần lưu → test lại trên browser.

## Chi tiết Phase 1 (phase duy nhất được đặc tả cụ thể ở đây — các phase sau lặp lại đúng khuôn mẫu này)

### Backend — `apps/api/src/projects/`

Tạo `ProjectsModule` mới (đăng ký vào `app.module.ts`), dùng lại `PrismaService`, `AuditService`, `PermissionsService` (đều đã `@Global`), và cơ chế `@Public()`/`CurrentUser()`/`SessionAuthGuard` sẵn có — không cần đổi gì ở tầng auth.

- `POST /api/projects` — body = `NewProjectInput` (đã định nghĩa sẵn trong `project-scaffold.ts`); gọi `createProjectWithScaffold` trong `prisma.$transaction`, sau đó `auditService.record({ actorId: user.id, entityType: 'project', entityId, action: 'project.created', after: ... })` (theo đúng pattern `prisma/seed.ts` đang làm thủ công).
- `GET /api/projects` — danh sách, chỉ id/productCode/productSku/ownerDepartment/markets (cho `ProjectList.tsx`).
- `GET /api/projects/:id` — trả object đầy đủ theo đúng shape `ProjectData` hiện tại (identity + gates + shape rỗng mặc định cho các field chưa migrate ở phase sau — xem mục "Vấn đề shape chuyển tiếp" bên dưới). Bao gồm `gateChangeLog` được tính từ `audit_events` (quyết định #1) và `backtrackEvents` thô.
- `DELETE /api/projects/:id`.
- `PUT /api/projects/:id/gates/:gateId` — body = `Partial<GateRecord>`; **implement lại đúng y hệt guard logic của `useAppStore.setGate`**: `isGateUnlocked` (chỉ gate hiện tại, đúng theo fix vừa làm trong phiên này), B1 Gap chặn Proceed, F9 Change Control đang mở chặn Proceed (dùng lại `isChangeOpen`/`getChangeTrigger` từ `@mbc360/shared/config/changeTriggers` — đã framework-agnostic, import thẳng được), diff-và-ghi-audit (dùng lại logic `diffGateRecord`/`GATE_RECORD_FIELDS`, chuyển từ `useAppStore.ts` vào `packages/shared` để cả web và api dùng chung đúng nguyên tắc "never fork a copy" của dự án).
- `PUT /api/projects/:id/gates` (bulk) — body = `GateRecord[]`; cùng guard, chỉ áp vào field `decision` như `setGatesBulk` đang làm.
- `POST /api/projects/:id/backtrack` — body = `{ fromGateId, toGateId, reason, initiatedBy }`; implement lại logic reset range + invalidate sign-off + snapshot `BacktrackEvent` của `backtrackGate`, trong 1 transaction.
- Mọi endpoint mutation: `@CurrentUser()` cung cấp actor cho cả `audit_events.actorId` lẫn "changed by" của gate change log — thay thế tham số `useSession().user?.displayName` mà `GateFlowTable.tsx` đang tự truyền; giờ server tự lấy từ session, đúng đắn hơn hẳn (client không thể giả mạo).

**Dùng lại rule engine**: `gateBlockers`, `hardGateBlockers`, `isGatePassed`, `isGateUnlocked`, `currentGateIndex`, `evaluateReadinessRequirements` (`packages/shared/src/utils/gateProgress.ts`) là pure function trên object dạng `ProjectData` — gọi thẳng ở server bằng cách dựng lại object đó từ dữ liệu Prisma vừa đọc/ghi, đúng theo nguyên tắc #1 ở §3 của `BACKEND_PLAN.md` ("port trực tiếp `gateProgress.ts`... không copy cách demo"). Không viết lại logic này — dùng lại y nguyên.

### Frontend — `apps/web/src/api/` (mới) + viết lại `useAppStore.ts`

- File mới `apps/web/src/api/projectsApi.ts` — các hàm `fetch('/api/projects/...')` mỏng (theo đúng pattern `apps/web/src/integrations/cosmetri.ts` đã có sẵn — dùng URL tương đối qua Vite proxy như quy ước đã ghi trong `CLAUDE.md`).
- `useAppStore.ts`: `createProject`, `deleteProject`, `setGate`, `setGatesBulk`, `backtrackGate` chuyển thành `async`, gọi API client rồi cập nhật lại state Zustand từ response (Zustand vẫn là cache trong bộ nhớ/nguồn dữ liệu cho UI render, đúng thiết kế đã nêu trong `BACKEND_PLAN.md` — không đưa React Query/SWR vào). `projects` không còn seed sẵn từ `seedProjects()`; thay bằng action `loadProjects()` gọi `GET /api/projects` khi app khởi động (gọi 1 lần từ `Shell` trong `App.tsx`, ngay sau khi `useSession()` resolve xong).
- Middleware `persist`: **bỏ hẳn `projects` và `changes` khỏi state được persist/migrate** ở phase này (2 field Phase 1 đã chuyển sang server); vẫn tạm persist những gì chưa migrate (`viewRole`, `integrations`) tới khi các phase sau xử lý nốt. Đáp ứng đúng yêu cầu "không lưu localStorage nữa" cho đúng phần đang migrate, không cần cutover toàn bộ 1 lần.
- 6 vị trí gọi `setGate`/`setGatesBulk`/`backtrackGate` trong `GateFlowTable.tsx` cần thêm `await` + xử lý loading/error (một request lỗi mạng phải hiển thị ra, không được âm thầm không làm gì như cách guard hiện tại đang no-op).

### Vấn đề "shape chuyển tiếp" (cần chốt trước khi code)

`GET /api/projects/:id` cần trả về thứ mà type `ProjectData` phía frontend vẫn chấp nhận được, dù Phase 2–6 chưa migrate các field còn lại. 2 phương án cần chọn khi bắt đầu code Phase 1:
- **(a)** Endpoint trả các field đã migrate (`identity`, `gates`, `gateChangeLog`, `backtrackEvents`) cộng với **giá trị rỗng mặc định** cho mọi field khác (checklists: `{}`, registers: `{}`, bom: `[]`, ...), frontend merge với phần còn lại (vẫn đang ở localStorage) của project đó — tức 1 record hybrid trong giai đoạn chuyển tiếp.
- **(b)** Nới lỏng tạm thời type `ProjectData` (kiểu `Partial`) và chấp nhận các trang đụng vào field chưa migrate sẽ hiển thị rỗng/lỗi cho tới khi phase đó xong.

**(a)** nhiều khả năng là lựa chọn đúng (không gây regression ở các trang chưa migrate trong giai đoạn chuyển tiếp) nhưng cần đối chiếu lại cách `PhasePage.tsx`/`ProjectOverview.tsx` thực sự đọc object trước khi chốt.

## Kế hoạch kiểm thử (Phase 1)

1. `docker compose -f docker-compose.dev.yml up -d`, `npm run db:setup` (migrate + seed — xác nhận `seed.ts` hiện tại vẫn scaffold đúng project demo sau khi nối module mới).
2. `npm run dev`; test bằng `curl` qua Vite proxy hoặc thẳng `:3000/api`: `POST /api/projects` (tạo), `GET /api/projects`, `GET /api/projects/:id`, `PUT /api/projects/:id/gates/SG01` (sửa hợp lệ), 1 lần sửa bị từ chối (Gap+Proceed) để xác nhận guard vẫn chặn đúng ở server, `POST /api/projects/:id/backtrack`.
3. Trên browser: tạo project, sửa field Gate 1 rồi Save, xác nhận dữ liệu còn nguyên sau khi reload toàn trang (chứng minh không còn phụ thuộc localStorage), thực hiện Backtrack, mở popup "History" trên `GateFlowTable.tsx` xác nhận cả field-edit lẫn backtrack hiển thị đúng từ response API thật.
4. Xác nhận `apps/web` không còn giữ `projects`/`changes` sau khi `localStorage.clear()` + reload mà không có `GET /api/projects` gọi lại tương ứng (tức browser thực sự không còn là nguồn dữ liệu cho phần này nữa).

## Tài liệu liên quan

`docs/BACKEND_PLAN.md` §3 (nguyên tắc kiến trúc), §4 (thiết kế DB), §5 (danh sách endpoint) — tài liệu này là kế hoạch triển khai cụ thể cho M3 dựa trên các mục đó. Sau khi Phase 1 hoàn thành, cập nhật lại dòng M3 trong bảng milestone của `BACKEND_PLAN.md` §6 và cập nhật `CLAUDE.md`'s phần "Status & pending work" cho khớp.
