# Hướng dẫn Deploy MBc360 (self-hosted, Docker)

> Tài liệu này ghi lại quy trình deploy production đã thực hiện thật ngày 2026-07-17 lên VPS dùng chung của mbcstaging.com, kèm các lỗi đã gặp và cách xử lý. Quyết định deploy: **self-hosted duy nhất** — không Vercel hay host frontend ngoài nào khác.

## 1. Kiến trúc production

```
Internet ──▶ nginx trên HOST (TLS, certbot)
                ├── /      ──▶ 127.0.0.1:${WEB_HOST_PORT}  (container web: nginx + SPA build)
                └── /api   ──▶ 127.0.0.1:${API_HOST_PORT}  (container api: NestJS)
                                        │
                                        └──▶ postgres (chỉ trong Docker network, KHÔNG mở port ra host)
```

- Toàn bộ stack chạy bằng `docker-compose.prod.yml` ở repo root; image build từ `apps/web/Dockerfile` và `apps/api/Dockerfile` (build context = repo root).
- Container chỉ bind `127.0.0.1` — nginx trên host là lối vào duy nhất từ ngoài.
- Port mặc định 8080 (web) / 3000 (api), ghi đè được qua `WEB_HOST_PORT`/`API_HOST_PORT` trong `.env`. **VPS mbcstaging.com dùng 8086/3004** vì 8080 và 3000–3003 đã bị các project khác chiếm.

## 2. Chuẩn bị

Trên server:

- Docker + Docker Compose plugin. User deploy phải thuộc group `docker`:
  ```bash
  sudo usermod -aG docker <user>
  # rồi thoát SSH và đăng nhập lại — quyền group chỉ có hiệu lực ở phiên mới
  ```
- nginx + certbot đã cài trên host (VPS mbcstaging đã có sẵn, các project dùng chung file `sites-available/mbc`).
- DNS: A record của subdomain (vd. `mbc360.mbcstaging.com`) **phải trỏ về IP VPS trước khi chạy certbot**. Kiểm tra:
  ```bash
  curl -4 ifconfig.me                    # IP thật của VPS
  dig +short mbc360.mbcstaging.com       # phải trả về đúng IP đó
  ```

Trên Azure (Entra ID app registration — đã có sẵn, chỉ cần bổ sung cho môi trường mới):

- Thêm **Web redirect URI**: `https://<domain>/api/auth/callback` (phải khớp từng ký tự với `AUTH_REDIRECT_URI` trong `.env`).
- Có sẵn một **client secret còn hạn**. Khi tạo secret, copy cột **Value** (chuỗi dài, chỉ hiện một lần lúc tạo) — **không phải cột "Secret ID"** (UUID). Dán nhầm Secret ID sẽ lỗi `AADSTS7000215: Invalid client secret` lúc đăng nhập.

## 3. Clone code và tạo `.env`

```bash
git clone <repo-url> mbc360_app
cd mbc360_app
cp .env.example .env
nano .env
```

Điền theo chú thích trong [`.env.example`](../../.env.example). Ba bẫy đã gặp thật, đừng lặp lại:

1. **Giá trị chứa `$` bị Compose cắt mất**: Compose nội suy `$xyz` trong `.env` thành biến (thường rỗng) và chỉ in một dòng `WARN ... variable is not set` dễ bỏ qua — mật khẩu thực tế đưa vào container khác với cái bạn gõ. Sinh secret bằng `openssl rand -hex 32` (hex không bao giờ có ký tự đặc biệt), hoặc escape `$` thành `$$`.
2. **`AUTH_CLIENT_SECRET` phải là secret Value, không phải Secret ID** (xem mục 2).
3. **`AUTH_REDIRECT_URI` viết URL đầy đủ** — file `.env` của Compose không tự nội suy `${APP_BASE_URL}` lồng trong giá trị khác.

Soát lại trước khi chạy — lệnh sau phải in ra config **không kèm dòng WARN nào**:

```bash
docker compose -f docker-compose.prod.yml config | grep -A12 'environment:'
```

## 4. Kiểm tra port trống

VPS dùng chung nhiều project nên port dễ đụng. Với cặp 8086/3004:

```bash
ss -tln | grep -E ':(8086|3004)\b'    # KHÔNG có output = cả hai còn trống
```

Nếu bị chiếm, quét dải để chọn port khác (`ss -tln | grep -E ':30[0-9][0-9]\b'`), rồi sửa **đồng bộ 2 chỗ**: `.env` (`WEB_HOST_PORT`/`API_HOST_PORT`) và block nginx (mục 6).

## 5. Build, khởi động, migrate, seed

```bash
docker compose -f docker-compose.prod.yml up -d --build
curl http://127.0.0.1:3004/api/health    # {"status":"ok",...}
curl -I http://127.0.0.1:8086            # HTTP/1.1 200
```

**Migration KHÔNG tự chạy khi container khởi động** (chủ đích — xem `docs/plans/BACKEND_PLAN.md` mục hạ tầng) và image api chỉ chứa `dist/` (không có Prisma CLI/schema). Postgres cũng không mở port ra host, nên chạy migrate/seed bằng container một-lần trên cùng Docker network. Tên network = `<tên-thư-mục>_default` (clone thành `mbc360_app` → `mbc360_app_default`; xác nhận bằng `docker network ls`):

```bash
# Migrate — tạo toàn bộ bảng (bỏ qua bước này thì api lỗi "table does not exist"
# ngay từ cron Cosmetri và crash khi callback đăng nhập ghi user)
docker run --rm --network mbc360_app_default \
  -v "$PWD":/repo -w /repo \
  -e DATABASE_URL="postgresql://mbc360:<POSTGRES_PASSWORD>@postgres:5432/mbc360" \
  node:22-alpine sh -c "npm ci && npm run db:deploy -w @mbc360/api"

# Seed — rule config (safety triggers, watch-lists) + role matrix. Idempotent,
# chạy lại an toàn. SEED_DEMO_USERS=false để bỏ user demo @demo.mbc360.local.
docker run --rm --network mbc360_app_default \
  -v "$PWD":/repo -w /repo \
  -e DATABASE_URL="postgresql://mbc360:<POSTGRES_PASSWORD>@postgres:5432/mbc360" \
  -e SEED_DEMO_USERS=false \
  node:22-alpine sh -c "npm ci && npm run build -w @mbc360/shared && npm exec -w @mbc360/api -- prisma generate && npm run db:seed -w @mbc360/api"
```

(Seed cần build `@mbc360/shared` trước — seeder import config từ dist của package đó — và cần `prisma generate` vì seeder import Prisma client từ `apps/api/src/generated/`, thư mục gitignored không có sẵn trong bản clone mới; thiếu bước này sẽ lỗi `Cannot find module '../src/generated/prisma/client'`. Cả hai bước migrate + seed đều bắt buộc trong lần deploy đầu.)

## 6. nginx trên host

VPS mbcstaging gom mọi project vào một file `/etc/nginx/sites-available/mbc` (đã được symlink sẵn trong `sites-enabled` — kiểm tra bằng `ls -l /etc/nginx/sites-enabled/`, **không cần** `ln -s` thêm). Thêm block mbc360 vào cuối file đó, lấy nội dung từ [`deploy/nginx.mbcstaging.conf`](../../deploy/nginx.mbcstaging.conf) — nhưng lần đầu **chỉ thêm phần `listen 80`** (bỏ block 443 và các dòng `ssl_certificate`, vì cert chưa tồn tại — để nguyên sẽ làm `nginx -t` fail).

```bash
sudo nano /etc/nginx/sites-available/mbc
sudo nginx -t && sudo systemctl reload nginx    # nginx -t PHẢI chạy bằng sudo:
                                                # user thường không đọc được key
                                                # trong /etc/letsencrypt -> báo
                                                # Permission denied giả
```

## 7. TLS (certbot)

Sau khi DNS đã trỏ đúng (mục 2):

```bash
sudo certbot --nginx -d mbc360.mbcstaging.com
```

Certbot tự viết lại block thành dạng đầy đủ 443 + redirect 80→443 (giống các project khác trong file). Nếu báo `Invalid response ... 404 / unauthorized` thì gần như chắc chắn DNS chưa trỏ về VPS này — quay lại mục 2 kiểm tra `dig`.

## 8. Xác minh sau deploy

1. Mở `https://<domain>` → trang Login "Sign in with Microsoft" (app đã gate đăng nhập toàn bộ, không có dev-login trên UI).
2. Đăng nhập bằng tài khoản Microsoft 365 thật. Theo dõi log:
   ```bash
   docker compose -f docker-compose.prod.yml logs -f api
   ```
   Kỳ vọng: audit event `auth.login`; nếu `AUTH_AUTO_ADMIN_ROLE=true`, tài khoản đầu tiên (chưa có role) tự nhận admin (`user.auto_admin_dev`) → sidebar hiện **Admin → Users** để gán role cho người khác.
3. Vào **Integrations**, admin dán cặp token Cosmetri (connect) — sau đó cron tự refresh mỗi 10 phút, không cần đụng lại.
4. **Khi đã gán role xong cho mọi người: xoá `AUTH_AUTO_ADMIN_ROLE` khỏi `.env`** rồi `docker compose -f docker-compose.prod.yml up -d api`. Flag này không có khoá tự động ở production — để quên là mọi nhân viên công ty đăng nhập đều thành admin.

## 9. Deploy bản mới

```bash
cd ~/mbc360_app
git pull
docker compose -f docker-compose.prod.yml up -d --build
# nếu bản mới có migration mới: chạy lại lệnh Migrate ở mục 5 (db:deploy là
# incremental — chỉ áp các migration chưa chạy)
```

Đổi biến trong `.env` chỉ cần recreate service liên quan: `docker compose -f docker-compose.prod.yml up -d api`.

## 10. Sự cố đã gặp & cách nhận diện nhanh

| Triệu chứng | Nguyên nhân | Xử lý |
|---|---|---|
| `permission denied ... docker.sock` | User chưa thuộc group `docker` | `sudo usermod -aG docker <user>` rồi đăng nhập lại SSH |
| `WARN The "..." variable is not set` khi chạy compose | Giá trị trong `.env` chứa `$` — Compose nội suy và cắt mất một đoạn | Escape thành `$$` hoặc sinh lại secret bằng `openssl rand -hex 32` |
| Port bind fail / `ss` thấy port đã LISTEN | VPS dùng chung, 8080 và 3000–3003 đã bị project khác chiếm | Chọn port khác, sửa đồng bộ `.env` + block nginx |
| `nginx -t` báo `Permission denied` đọc `fullchain.pem` của domain khác | Chạy `nginx -t` không có `sudo` | `sudo nginx -t` |
| certbot: `Invalid response ... 404`, `unauthorized` | DNS của subdomain chưa trỏ về VPS | Thêm/sửa A record, chờ lan truyền (`dig +short` ra đúng IP) rồi chạy lại |
| Đăng nhập lỗi, log api: `AADSTS7000215: Invalid client secret` | Dán Secret **ID** thay vì secret **Value** vào `AUTH_CLIENT_SECRET` | Tạo secret mới trên Entra, copy cột Value, cập nhật `.env`, `up -d api` |
| Log api lặp lại `The table ... does not exist` (P2021) | Chưa chạy migration | Chạy lệnh Migrate + Seed ở mục 5 |
| Seed lỗi `Cannot find module '../src/generated/prisma/client'` | Prisma client chưa generate (thư mục gitignored, không có trong bản clone) | Lệnh Seed ở mục 5 đã gồm `prisma generate`; đừng bỏ bước đó |
| Login thành công nhưng không có quyền admin dù `AUTH_AUTO_ADMIN_ROLE=true`; log api: `no "admin" role exists — skipping` | Bảng `roles` trống — đã migrate nhưng chưa seed | Chạy Seed (mục 5) rồi Sign out → Sign in lại (cơ chế auto-admin thử lại ở mỗi lần login khi user còn 0 role) |

## Phụ lục: hai file trong `deploy/` dùng làm gì

- [`deploy/nginx.host.example.conf`](../../deploy/nginx.host.example.conf) — **mẫu generic** cho bất kỳ server đơn-tenant nào: giả định port mặc định 8080/3000 và server chỉ chạy mỗi MBc360. Dùng làm điểm xuất phát khi deploy lên một máy mới hoàn toàn; không phản ánh môi trường thật nào.
- [`deploy/nginx.mbcstaging.conf`](../../deploy/nginx.mbcstaging.conf) — **block thật cho VPS mbcstaging.com hiện tại**: port 8086/3004 (vì port mặc định bị chiếm), log path, layout cert Certbot và idiom redirect đúng theo phong cách các project khác trên máy đó. Đây là nội dung để chép vào `sites-available/mbc`.

Hai file tách nhau để mẫu generic không bị "nhiễm" chi tiết riêng của một VPS cụ thể, còn cấu hình thật của môi trường staging thì được version-control thay vì chỉ tồn tại trên server.
