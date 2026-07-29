# Vlabel — Kiến trúc hệ thống truy xuất nguồn gốc (GTIN + VNPC)

> Tài liệu bắt buộc theo §17 của spec — xuất **trước khi code**.
> Đa tenant · giao diện như mobile app · dễ clone & chạy (Docker Compose).

---

## 1. Kiến trúc hệ thống

```
                         ┌──────────────────────────────┐
        Người tiêu dùng  │   Public Page  /t/{gtin}      │  (không đăng nhập)
        (quét QR)  ─────▶│   React SPA (apps/web)        │
                         └───────────────┬──────────────┘
                                         │  REST (JWT cho admin, public token cho /t)
   Admin / Data Entry / Approver         │
        ─────────────────────────────────┤
                         ┌───────────────▼──────────────┐
                         │      API Gateway (NestJS)      │  apps/api
                         │  Auth · RBAC · Tenant scope    │
                         │  Rate limit · Validation · Log │
                         └───────┬───────────────┬───────┘
                                 │               │
                   ┌─────────────▼───┐   ┌───────▼────────────┐
                   │  PostgreSQL      │   │  VNPC Integration   │──▶ VNPC API (bên ngoài)
                   │  (Prisma ORM)    │   │  client+cache+retry │    (mock/fallback khi lỗi)
                   └──────────────────┘   └────────────────────┘
                                 │
                   ┌─────────────▼───┐
                   │  Storage         │  local (dev) / S3-compatible (prod)
                   │  media, QR, tem  │
                   └──────────────────┘
```

**Nguyên tắc:**
- Frontend **không bao giờ** gọi VNPC trực tiếp — luôn đi qua backend (ẩn API key).
- Mọi request admin đi qua `JwtAuthGuard → TenantGuard → RbacGuard` (không tin quyền do FE gửi).
- `tenant_id` được lấy từ token, không nhận từ body.
- Public page chỉ đọc dữ liệu đã `APPROVED` + cấu hình `public=true`.

**Tầng ứng dụng (Nest):** `Controller → Guard/Pipe → Service → Prisma`. DTO validate bằng Zod/class-validator.

---

## 2. ERD (rút gọn)

```
tenants 1───* organizations (self-parent: parent_id → cây đa tầng)
tenants 1───* users *───* roles (user_roles) ;  users *───* scopes (user_scopes → organization)
roles  *───* permissions (role_permissions)
tenants 1───* product_categories 1───* category_fields
product_categories 1───* products *───1 organizations
products 1───* traceable_items (gtin, batch/lot/serial)
products *───? flows ; flows 1───* flow_versions 1───* event_definitions 1───* event_fields
traceable_items 1───* event_records
event_definitions 1───* event_records 1───* event_record_values
event_records 1───* event_record_media
event_records 1───* approval_histories
traceable_items 1───* qr_codes 1───1 qr_assignments
tenants 1───* vnpc_sync_logs ; tenants 1───* audit_logs
```

**Quan hệ nghiệp vụ cốt lõi (§3):** `Product(GTIN) → TraceableItem → Flow → Event(Definition) → EventRecord`.

**Ràng buộc chính:**
- `products`: unique `(tenant_id, gtin)` — chống trùng GTIN trong tenant (§2).
- `traceable_items.gtin` bắt buộc; `batch_or_lot`, `serial_number` tùy chọn (§7).
- `flows` versioning qua `flow_versions` (§8) — event_definitions gắn vào **version**, không gắn trực tiếp flow.
- Mọi bảng nghiệp vụ: `tenant_id, created_at, updated_at, deleted_at?` (§15).

Chi tiết cột → `apps/api/prisma/schema.prisma`.

---

## 3. Module (NestJS)

| Module | Trách nhiệm |
|---|---|
| `AuthModule` | Đăng nhập, JWT access+refresh, refresh rotation, logout |
| `TenantsModule` | Platform Admin quản lý tenant |
| `OrganizationsModule` | Cây đơn vị đa tầng, move/scope |
| `UsersModule` / `RbacModule` | User, role, permission, user_scopes, ma trận quyền |
| `CategoriesModule` | product_categories + category_fields (field động) |
| `ProductsModule` | CRUD Product, GTIN validation, import-from-vnpc |
| `VnpcModule` | `VnpcController` + `VnpcService` + `VnpcApiClient` (cache/retry/rate-limit/fallback) |
| `FlowsModule` | Flow + flow_versions + event_definitions + event_fields, phân quyền event |
| `TraceableItemsModule` | Batch/lot/serial |
| `EventRecordsModule` | Wizard kê khai, values, media, trạng thái |
| `ApprovalsModule` | Duyệt / từ chối / yêu cầu sửa / khóa sau duyệt |
| `QrModule` | Sinh đơn/hàng loạt, CSV import, gán, export PNG/PDF/ZIP, khóa/thu hồi, scan log |
| `PublicModule` | `/api/public/t/:gtin` — không auth, chỉ dữ liệu approved+public |
| `AuditModule` | Ghi & đọc audit_logs |
| `StorageModule` | local/S3, file validation |
| `PrismaModule`, `ConfigModule`, `HealthModule` | Hạ tầng |

---

## 4. Ma trận Role × Permission

Permission format: `resource:action` (ví dụ `product:create`, `event_record:approve`).

| Permission | Platform&nbsp;Admin | Org&nbsp;Admin | Data&nbsp;Entry | Approver |
|---|:--:|:--:|:--:|:--:|
| tenant:manage / audit:read_all | ✅ | — | — | — |
| organization:manage | — | ✅ | — | — |
| user:manage / role:assign | — | ✅ | — | — |
| category:manage / field:manage | — | ✅ | — | — |
| product:create / product:update | — | ✅ | — | — |
| product:read | — | ✅ | ✅ | ✅ |
| vnpc:search / product:import_vnpc | — | ✅ | — | — |
| flow:manage / event_def:manage | — | ✅ | — | — |
| traceable_item:manage | — | ✅ | ✅ | — |
| qr:manage | — | ✅ | — | — |
| event_record:create (nếu được cấp event) | — | ✅ | ✅ | — |
| event_record:submit | — | ✅ | ✅ | — |
| event_record:approve / reject / request_changes / lock | — | ✅ | — | ✅ |
| public_config:manage | — | ✅ | — | — |
| audit:read (trong tenant) | — | ✅ | — | ✅ |

**Scope:** ngoài RBAC còn `user_scopes` giới hạn theo `organization` (và cây con). Data Entry chỉ thấy **Flow/Event được cấp quyền** (§10).

---

## 5. Cấu trúc thư mục

```
vlabel/
├── docker-compose.yml         # postgres + api + web
├── .env.example
├── package.json               # npm workspaces
├── docs/ARCHITECTURE.md
├── packages/
│   ├── shared/                # GTIN validation, zod schemas, hằng số RBAC, types
│   └── ui/                    # (placeholder) component dùng chung web
└── apps/
    ├── api/                   # NestJS
    │   ├── prisma/{schema.prisma, seed.ts, migrations/}
    │   └── src/
    │       ├── main.ts app.module.ts
    │       ├── common/{guards, decorators, filters, interceptors, pipes}
    │       ├── prisma/  config/  auth/  rbac/
    │       ├── tenants/ organizations/ users/ categories/
    │       ├── products/ vnpc/ flows/ traceable-items/
    │       ├── event-records/ approvals/ qr/ public/ audit/ storage/
    └── web/                   # React + Vite + TS + Tailwind + shadcn
        └── src/{app, pages, features, components, lib, api}
```

---

## 6. Luồng tích hợp VNPC

```
FE (ô search)  ──GET /api/integrations/vnpc/products?q=gạo──▶ VnpcController
                                                              │  @Rbac('vnpc:search') @Throttle
                                                              ▼
                                                         VnpcService
                                              ┌── cache hit? ──▶ trả cache (TTL ngắn)
                                              │
                                              └── VnpcApiClient.search(q)
                                                    · timeout (VNPC_API_TIMEOUT)
                                                    · retry có giới hạn (backoff)
                                                    · gắn X-API-Key (ẩn khỏi FE)
                                                    · log vnpc_sync_logs
                                                    · lỗi/không có → fallback (cho phép nhập tay)

Import: POST /api/products/import-from-vnpc { gtin }
   → VnpcService.getByGtin(gtin) → validate GTIN → tạo Product:
       source=VNPC, source_reference, source_synced_at, source_snapshot(JSON gốc)
   → KHÔNG ghi đè field doanh nghiệp đã sửa khi đồng bộ lại (merge có kiểm soát).
```

Trong repo, `VnpcApiClient` có **mock provider** (bật bằng `VNPC_API_URL` rỗng) trả dữ liệu demo — để clone chạy được ngay mà không cần API thật.

---

## 7. Kế hoạch MVP (§16)

| # | Tính năng | Module | Trạng thái |
|---|---|---|---|
| 1 | Đăng nhập (JWT+refresh) | Auth | 🎯 giai đoạn 1 |
| 2 | Tổ chức đa tầng (cây) | Organizations | 🎯 |
| 3 | User & role | Users/Rbac | 🎯 |
| 4 | Category + field động | Categories | 🎯 |
| 5 | Tạo Product bằng GTIN | Products | 🎯 |
| 6 | Tìm & import từ VNPC | Vnpc/Products | 🎯 |
| 7 | Flow & Event | Flows | 🎯 |
| 8 | Phân quyền Event | Rbac/Flows | 🎯 |
| 9 | Traceable Item | TraceableItems | 🎯 |
| 10 | Tạo & gán QR | Qr | 🎯 |
| 11 | Kê khai bằng wizard | EventRecords | 🎯 |
| 12 | Phê duyệt | Approvals | 🎯 |
| 13 | Quét QR xem public | Public | 🎯 |
| 14 | Dashboard cơ bản | web | 🎯 |
| 15 | Audit log | Audit | 🎯 |

**Thứ tự triển khai:** infra + schema + seed → Auth/RBAC → Products/VNPC → Flows/Events → Items/QR → EventRecords/Approvals → Public → Web screens.
