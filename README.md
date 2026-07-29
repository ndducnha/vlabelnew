# Vlabel — Nền tảng truy xuất nguồn gốc (GTIN + VNPC)

Ứng dụng web đa tenant, giao diện như mobile app. Chọn GTIN bằng cách **nhập tay** (validate GS1) hoặc **tìm & import từ VNPC**. Mô hình: `GTIN/Product → Traceable Item → Flow → Event`. Người tiêu dùng quét QR để xem trang công khai.

- **Web:** React + TypeScript + Vite + Tailwind + shadcn/ui
- **API:** NestJS + TypeScript, REST + Swagger, JWT + refresh rotation, RBAC + tenant scope
- **DB:** PostgreSQL + Prisma
- **Monorepo:** `apps/web`, `apps/api`, `packages/shared`, `packages/ui`

Kiến trúc đầy đủ (ERD, module, ma trận quyền, luồng VNPC): [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Chạy nhanh (Docker)

```bash
cp .env.example .env
docker compose up -d --build          # db + api + web
docker compose exec api npm run db:migrate
docker compose exec api npm run db:seed
```

- Web: http://localhost:5173
- API + Swagger: http://localhost:4000/api/docs
- Public page demo: http://localhost:5173/t/8931100000015?lot=LOT-PARA-2407

## Chạy dev (local)

```bash
cp .env.example .env
npm install
docker compose up -d db                # chỉ Postgres
npm run db:migrate
npm run db:seed
npm run dev                            # api :4000 + web :5173
```

## Tài khoản demo (seed)

Dữ liệu demo: Tập đoàn Vlabel với 3 nhánh công ty là Dược phẩm (Vlabel Pharma), Mỹ phẩm (Vlabel Beauty), Thiết bị PCCC (Vlabel Safety).

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Platform Admin (nền tảng) | `platform@vlabel.vn` | `Vlabel@123` |
| Superadmin (toàn quyền + cấu hình tổ chức cấp 1) | `superadmin@vlabel.vn` | `Vlabel@123` |
| Admin (toàn quyền + tổ chức cấp ≥ 2) | `admin@vlabel.vn` | `Vlabel@123` |
| Quản lý (flows, người dùng, phân quyền) | `manager@vlabel.vn` | `Vlabel@123` |
| Kê khai (chỉ kê khai theo quyền) | `user@vlabel.vn` | `Vlabel@123` |

Người kê khai theo nhánh: `kekhai.pharma@vlabel.vn`, `kekhai.beauty@vlabel.vn`, `kekhai.pccc@vlabel.vn` (cùng mật khẩu).

## Cấu trúc

```
apps/api      NestJS + Prisma (auth, rbac, products, vnpc, flows, records, qr, public, audit)
apps/web      React SPA (admin + wizard kê khai + public page)
packages/shared  GTIN validation (GS1), zod schemas, hằng số RBAC
```

## VNPC

Backend gọi VNPC (không lộ API key ra frontend). Để trống `VNPC_API_URL` trong `.env` sẽ dùng **mock provider** (dữ liệu demo) — clone chạy được ngay. Cấu hình `VNPC_API_URL` + `VNPC_API_KEY` để nối API thật.
