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
2. **(Cập nhật 2026-07-23 — huỷ bỏ quyết định "last-write-wins" trước đó, theo yêu cầu rõ ràng của người dùng)** Phase 1 **phải** xử lý race condition + idempotency ngay từ đầu, không được hoãn tới khi phát sinh xung đột thật:
   - **Concurrency:** `PUT /gates/:gateId`, `PUT /gates` (bulk), `POST /backtrack` chạy trong **1 Prisma transaction duy nhất** — đọc dữ liệu để tính guard (`isGateUnlocked`/`gateBlockers`/`hardGateBlockers`) và ghi kết quả phải nằm trong cùng transaction, không tách 2 round-trip, mức cô lập Serializable hoặc khoá theo `project_id` (`SELECT ... FOR UPDATE`) để 2 request gần như đồng thời không thể interleave. Thêm cột `projects.version` (optimistic lock, xem `BACKEND_PLAN.md` §3 nguyên tắc 8): client gửi kèm version đã fetch, server trả `409 Conflict` nếu lệch — frontend hiển thị "Dữ liệu đã được người khác cập nhật — tải lại trước khi lưu" thay vì âm thầm ghi đè.
   - **Idempotency:** `POST /api/projects` và `POST /api/projects/:id/backtrack` nhận header `Idempotency-Key` (client tự sinh 1 lần/thao tác — vd. khi mở modal Backtrack, giữ nguyên key đó kể cả khi confirm bị retry do lỗi mạng); server tra bảng `idempotency_keys` (xem `BACKEND_PLAN.md` §3 nguyên tắc 9) trước khi chạy logic — key đã thấy thì trả lại đúng response cũ, không tạo thêm project/backtrack event thứ hai.
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

- `POST /api/projects` — body = `NewProjectInput` (đã định nghĩa sẵn trong `project-scaffold.ts`) + header `Idempotency-Key` bắt buộc (quyết định #2); gọi `createProjectWithScaffold` trong `prisma.$transaction`, sau đó `auditService.record({ actorId: user.id, entityType: 'project', entityId, action: 'project.created', after: ... })` (theo đúng pattern `prisma/seed.ts` đang làm thủ công). Key đã thấy → trả lại response cũ, không tạo project thứ hai.
- `GET /api/projects` — danh sách, chỉ id/productCode/productSku/ownerDepartment/markets (cho `ProjectList.tsx`).
- `GET /api/projects/:id` — trả object đầy đủ theo đúng shape `ProjectData` hiện tại (identity + gates + shape rỗng mặc định cho các field chưa migrate ở phase sau — xem mục "Vấn đề shape chuyển tiếp" bên dưới). Bao gồm `gateChangeLog` được tính từ `audit_events` (quyết định #1), `backtrackEvents` thô, và `version` hiện tại của project (để FE gửi lại khi ghi — quyết định #2).
- `DELETE /api/projects/:id`.
- `PUT /api/projects/:id/gates/:gateId` — body = `Partial<GateRecord> & { expectedVersion: number }`; **implement lại đúng y hệt guard logic của `useAppStore.setGate`**: `isGateUnlocked` (chỉ gate hiện tại, đúng theo fix vừa làm trong phiên này), B1 Gap chặn Proceed, F9 Change Control đang mở chặn Proceed (dùng lại `isChangeOpen`/`getChangeTrigger` từ `@mbc360/shared/config/changeTriggers` — đã framework-agnostic, import thẳng được), F1/C7 `gateBlockers`/`hardGateBlockers` chặn cả Proceed lẫn Proceed with Conditions (đúng fix vừa làm ở store phiên này — xem nguyên tắc 7 ở `BACKEND_PLAN.md` §3), diff-và-ghi-audit (dùng lại logic `diffGateRecord`/`GATE_RECORD_FIELDS`, chuyển từ `useAppStore.ts` vào `packages/shared` để cả web và api dùng chung đúng nguyên tắc "never fork a copy" của dự án). Toàn bộ đọc-guard-ghi nằm trong **1 transaction**, so `expectedVersion` với `projects.version` hiện tại trước khi ghi — lệch thì trả `409 Conflict` và không ghi gì (quyết định #2).
- `PUT /api/projects/:id/gates` (bulk) — body = `{ gates: GateRecord[], expectedVersion: number }`; cùng guard + cùng cơ chế transaction/version, chỉ áp guard vào field `decision` như `setGatesBulk` đang làm.
- `POST /api/projects/:id/backtrack` — body = `{ fromGateId, toGateId, reason, initiatedBy }` + header `Idempotency-Key` bắt buộc; implement lại logic reset range **bao gồm cả `fromGateId`** + invalidate **toàn bộ** sign-off (Prepared/Reviewed/Approved) của mọi phase có ít nhất 1 gate trong range + snapshot `BacktrackEvent` của `backtrackGate` (đúng 2 fix vừa làm ở store phiên này), trong 1 transaction duy nhất (đọc range + ghi gates + ghi phaseClosures + ghi backtrackEvent). Key đã thấy → trả lại response cũ, không tạo backtrack event thứ hai.
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
5. **Race condition:** mở cùng 1 project ở 2 tab (2 `expectedVersion` giống nhau ban đầu), sửa và Save ở tab A trước, sau đó Save ở tab B (vẫn mang version cũ) — xác nhận tab B nhận `409 Conflict`, dữ liệu không bị ghi đè, và không có state nào bị mất ở tab A.
6. **Idempotency:** gọi `POST /api/projects/:id/backtrack` 2 lần liên tiếp với cùng `Idempotency-Key` (mô phỏng double-click/retry mạng) — xác nhận chỉ có **đúng 1** `backtrackEvent` mới được tạo, gate range chỉ bị reset 1 lần (không bị reset chồng hay ghi đè lần 2 lên dữ liệu đã reset của lần 1).
7. **Guard server-side độc lập với FE:** gọi thẳng `PUT /gates/:gateId` bằng `curl` với payload cố tình vi phạm rule (vd. `decision: 'Proceed with Conditions'` khi còn `hardGateBlockers`) — xác nhận server tự chặn (không ghi, trả lỗi rõ ràng) dù không đi qua UI, chứng minh rule không chỉ tồn tại ở `GateFlowTable.tsx`.

---

## ✅ Trạng thái: Phase 1 ĐÃ HOÀN THÀNH (2026-07-26)

Toàn bộ Phase 1 đã code và verify end-to-end. Những gì thực tế khác với kế hoạch ban đầu, ghi lại đầy đủ ở đây:

### Tiền đề phát sinh (kế hoạch không lường trước, đã làm trước khi code)

Khi đối chiếu schema thật với `ProjectData`, phát hiện **schema đã trôi** so với frontend kể từ khi tài liệu này được viết (2026-07-22) — câu "schema khớp gần như 1:1" đúng lúc đó nhưng type frontend đã đi tiếp. Gộp vào **2 migration**:

- `20260725170519_add_project_reviewers` — bảng `project_reviewers` (13 review area per project). **DB trước đó không có chỗ nào lưu reviewers**, nên `POST /projects` sẽ làm mất toàn bộ assignment và mọi caption "Review owner", trang My Sheets, cột Responsible của Sheet Map đều rỗng. Lưu cả `userId` (FK thật, query được) và `name` (snapshot — mọi FK tới `User` đều `SetNull`, xoá user sẽ xoá trắng danh tính, trái B4).
- `20260725171452_m3_phase1_prereqs` — 4 thứ: `projects.version` (optimistic lock, quyết định #2 **yêu cầu** nhưng cột chưa tồn tại), bảng `idempotency_keys` (cùng quyết định #2, cũng chưa tồn tại), `phase_closures.preWorkAcceptedBy/Date` (F13, cần cho Phase 2), `next_actions.raisedBy/verifiedBy` (F8, DB chỉ có `closedBy` — cần cho Phase 5).

`diffGateRecord`/`GATE_RECORD_FIELDS` đã chuyển từ `useAppStore.ts` sang `packages/shared/src/utils/gateDiff.ts` (nguyên tắc "never fork a copy") — server và client giờ diff bằng cùng một hàm.

**Không phải gap** (đã kiểm, để không sửa oan): `formulaVersion` hiện tại suy ra được từ `FormulaVersion.status = 'Active'`; `previousBomSnapshot` không cần vì `BomLine` đã gắn `formulaVersionId` — lịch sử thật, tốt hơn snapshot.

### Quyết định "shape chuyển tiếp": chọn **(a) mở rộng** — đọc ĐẦY ĐỦ, ghi chỉ Phase 1

Không dùng "giá trị rỗng mặc định" như phương án (a) mô tả. Lý do: **rule engine server-side cần dữ liệu thật** (`checklists`/`gateChecks`/`registers`/`bom`/`nextActions`) để chạy `gateBlockers`; trả rỗng thì mọi gate sẽ bị chặn sai. Vì mọi bảng đã tồn tại trong DB, `project-mapper.ts` map **toàn bộ 20 field** của `ProjectData` từ Prisma. Kết quả: `GET /projects/:id` trả object hoàn chỉnh, các trang Phase 2–6 render đúng dữ liệu DB (không rỗng), chỉ có **ghi** là còn giới hạn ở Phase 1. Hệ quả cần biết: sửa ở các trang chưa migrate vẫn chỉ nằm trong bộ nhớ Zustand và mất khi reload — cho tới khi phase tương ứng xong.

### Khác biệt so với kế hoạch

- **`changes` (Change Control) vẫn ở localStorage.** Kế hoạch (mục Frontend) nói bỏ cả `projects` **và** `changes` khỏi persist ở Phase 1, nhưng bảng chia phase lại đặt `changes` ở **Phase 6** — hai chỗ tự mâu thuẫn. Giữ `changes` persisted là lựa chọn đúng: bỏ ra mà chưa có API thì dữ liệu Change Control mất khi reload.
- **`resetDemoData` đã xoá hẳn** (quyết định #4) cùng nút "Reset demo data" trên header — projects là bản ghi DB thật, không còn gì để "reset" và client không được phép xoá dữ liệu server.
- **`Project.id` = mã project người dùng nhập** (`MBC-2026-001`), truyền tường minh chứ không để cuid mặc định, để `ProjectIdentity.id` và URL `/projects/:id` trùng nhau. Project demo đã seed **trước** thay đổi này vẫn giữ id cuid; muốn id đẹp thì `docker compose down -v` + `npm run db:setup`.
- **`changedBy` do client truyền giờ bị server bỏ qua** — actor lấy từ session (`@CurrentUser()`), client không thể mạo danh. Tham số vẫn giữ trong chữ ký store action để 6 call site compile không đổi.
- **Ghi bị từ chối giờ THROW** thay vì no-op âm thầm như guard cũ ở store; `GateFlowTable`/`ProjectList` bắt lỗi và hiện message của server (409 có thông điệp riêng: "reload trước khi lưu"), draft không bị mất.

### Kết quả kiểm thử (đúng 7 mục ở "Kế hoạch kiểm thử" bên trên)

| # | Nội dung | Kết quả |
|---|---|---|
| 1 | migrate + seed | ✅ 2 migration áp dụng, seed idempotent (chạy 2 lần: 13 reviewer, không nhân bản) |
| 2 | curl mọi endpoint | ✅ POST thiếu `Idempotency-Key` → 400; POST có key → 201 + `ProjectData` đầy đủ; GET list/detail; DELETE |
| 3 | browser: sửa Gate 01 → Save → **reload toàn trang** | ✅ owner + notes còn nguyên sau reload (bằng chứng dữ liệu ở Postgres); Backtrack + popup History hiện cả backtrack event lẫn field edit |
| 4 | localStorage không còn là nguồn dữ liệu | ✅ key `projects` không còn trong `mbc360-demo-store` |
| 5 | race 2 tab cùng version | ✅ tab A lưu được, tab B nhận "changed by someone else", **edit của tab B không bị mất**, DB giữ giá trị của tab A |
| 6 | idempotency backtrack 2 lần cùng key | ✅ đúng **1** `backtrack_events` row |
| 7 | guard server-side độc lập FE | ✅ curl `Proceed` **và** `Proceed with Conditions` khi còn F1/C7 mandatory → 400 kèm danh sách blocker; sửa gate chưa mở → 403; version cũ → 409 |

## ✅ Phase 2–6 HOÀN THÀNH (2026-07-26, cùng ngày)

Theo yêu cầu "làm toàn bộ mọi thứ vào database, không lưu bằng Zustand/localStorage để demo nữa". **Không còn dữ liệu project nào nằm trong browser.**

- **19 endpoint section** (tổng 28 route), một endpoint cho mỗi store bulk action — xem danh sách trong `CLAUDE.md`.
- **Một chỗ chung duy nhất**: mọi endpoint đi qua `ProjectsService.mutate()` — 1 transaction, `FOR UPDATE`, `expectedVersion` → 409, chặn khi archived, bump version, ghi audit. Boilerplate viết 1 lần thay vì 19 lần; endpoint thêm sau tự kế thừa.
- **Guard port bằng cách GỌI lại pure function của shared**, không viết lại: `isGateRefLocked` (lock checklist/register/BOM/costing + merge per-row của requirement), `canApprovePhase` (sign-off), `canApproveMarketTrack` + C5, C2.
- **2 chỗ tốt hơn bản cũ ở store**: gate check định danh bằng `(gate, check)` thay vì index mảng (index cũ chỉ đúng nhờ 2 bên tình cờ sort giống nhau); và `createFormulaVersion` — ~90 dòng cascade A2 ở client — giờ chạy trong 1 transaction nên không thể half-apply.
- **Store**: một wrapper `writeSection()` giữ nguyên chữ ký cả 19 action (không sửa ~25 component nào), nhưng không bao giờ báo thành công giả — lỗi thì hiện message của server rồi refetch project, nên component đã `markSaved()` sẽ tự bật về giá trị thật.
- **Persist v13→v14**: whitelist loại hết slice liên quan project. Còn đúng **2 thứ** ở localStorage: `viewRole` (giả lập RBAC demo) và `integrations` (URL Power Apps / cấu hình Graph) — đều là preference toàn cục, không phải dữ liệu project. Đây chính là 2 mục cuối trong quyết định #3 của kế hoạch.

**Kiểm chứng:** tick checklist trên browser → **sống qua hard reload** (đúng ca bị mất dữ liệu âm thầm giữa Phase 1 và giờ); `localStorage` chỉ còn 2 key trên; C2 trả lỗi rõ ràng; C5 giữ lại giá trị launch cũ; role không có `phase:1|approve` bị 403 khi sign-off; project archived trả 403 trên checklists/registers/BOM/CAPA.

### Việc còn lại của M3

Không còn gì về dữ liệu project. Hai mục cuối của quyết định #3 (`viewRole` và `integrations`) vẫn ở localStorage — `viewRole` sẽ bỏ hẳn khi F6 có ma trận thật, `integrations` cần 1 endpoint settings nhỏ.

## Tài liệu liên quan

`docs/BACKEND_PLAN.md` §3 (nguyên tắc kiến trúc), §4 (thiết kế DB), §5 (danh sách endpoint) — tài liệu này là kế hoạch triển khai cụ thể cho M3 dựa trên các mục đó. Sau khi Phase 1 hoàn thành, cập nhật lại dòng M3 trong bảng milestone của `BACKEND_PLAN.md` §6 và cập nhật `CLAUDE.md`'s phần "Status & pending work" cho khớp.
