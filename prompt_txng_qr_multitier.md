# PROMPT: Xây dựng nền tảng Truy xuất nguồn gốc (QR → Flow → Event) đa tầng, đa tenant

Bạn là **Senior Full-stack Developer** và **Software Architect**. Hãy xây dựng một nền tảng truy xuất nguồn gốc (TXNG) **bán được cho doanh nghiệp và tỉnh/tập đoàn** để họ tự vận hành TXNG cho riêng mình (white-label, đa tenant).

Ưu tiên: code ngắn gọn, tái sử dụng, **dễ clone và chạy ngay**. Không giải thích dài dòng, không lặp lại yêu cầu đã biết.

---

## 1. Công nghệ (bắt buộc)

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js + TypeScript (NestJS **hoặc** Express — chọn 1, ưu tiên NestJS)
- **Database:** PostgreSQL + ORM (Prisma)
- **Auth:** JWT + refresh token
- **API:** REST + tài liệu (Swagger)
- **Chạy được ngay:** Docker Compose (db + api + web), `.env.example`, migration, **seed dữ liệu demo**, README.
- **Monorepo:** `apps/web`, `apps/api`, `packages/shared`.

Bắt buộc: clone repo → `cp .env.example .env` → `docker compose up` → migrate → seed → dùng được ngay với tài khoản demo mọi vai trò.

---

## 2. Mô hình nghiệp vụ cốt lõi

```
QR  ─gán──▶  Đối tượng truy xuất (sản phẩm / lô / serial)
                    │
                    ▼
                 Flow (quy trình)  ── chứa nhiều ──▶  Event (sự kiện)
                                                          │
                                          mỗi Event đủ 5 yếu tố:
                                          1) AI thực hiện
                                          2) Ở ĐÂU (địa điểm / GPS)
                                          3) LÀM GÌ (hành động)
                                          4) THÔNG TIN (field động)
                                          5) MEDIA (ảnh/video/file)
```

- **Bên kê khai** (doanh nghiệp) nhập dữ liệu cho từng Event.
- **Người dùng cuối** quét QR → xem thông tin TXNG **đã được cấu hình cho phép hiển thị**.
- Một Flow có **nhiều Event theo thứ tự**. Mỗi Event có thể **nhập đầy đủ** nhưng **chỉ hiển thị công khai phần được cấu hình** (xem §6).

---

## 3. Kiến trúc tổ chức đa tầng (config động, KHÔNG hard-code số tầng)

Hệ thống phải cho phép cấu hình cây tổ chức **động** — số tầng do người dùng tự định nghĩa, ví dụ:

- **Tầng 1:** Tỉnh / Tập đoàn / Cơ quan chủ quản → account tầng này là **superadmin** cấp phát & quản trị cho tầng 2, 3…
- **Tầng 2:** Doanh nghiệp / Công ty thành viên / P&L → account tầng này là **superadmin** cho các tầng dưới.
- **Tầng 3:** Các bộ phận chuyên môn (nhà máy, phòng ban, HTX…).
- **Tầng 4+:** vùng trồng, dây chuyền, kho… (thêm tầng tùy ý).

Mỗi đơn vị (node) có:

```
id, tenant_id, name, code, type, parent_id, level, status, settings(JSON)
```

Yêu cầu:

- Hiển thị **dạng cây** (giống thư mục): mở/gấp, tìm kiếm, kéo–thả để di chuyển, breadcrumb.
- **Superadmin cấp trên quản trị toàn bộ nhánh con** trong phạm vi được phân quyền (org scope).
- Có thể **gán tài khoản (quản lý / kê khai) vào đúng "thư mục" (đơn vị)**.
- **"Categories" cấu hình động**: loại đơn vị (type), danh mục sản phẩm, và **field động** đều do admin tự định nghĩa, không hard-code.

---

## 4. Vai trò & tài khoản

### 4.1. Nhóm quản trị sơ đồ (tổ chức)

- **Platform Admin (chủ nền tảng):** tạo & quản lý tenant, xem audit toàn hệ thống.
- **Superadmin tầng trên (Tỉnh/Tập đoàn, Doanh nghiệp):** tạo đơn vị con, tạo & phân quyền tài khoản cho nhánh con, cấu hình danh mục.

### 4.2. Hai dòng tài khoản tại doanh nghiệp sản xuất (TRỌNG TÂM)

**A. Account Quản lý & Cấu hình (Manager/Configurator):**

- **Định nghĩa Flow và các Event** của Flow (thứ tự, bắt buộc, cho phép lặp, field động của từng Event).
- **Phân quyền theo luồng:** chỉ định account kê khai nào được khai báo Flow/Event nào.
- **Cấu hình hiển thị công khai (public visibility):** trong các Event của một Flow, chọn **Event nào / field nào / media nào** người dùng cuối được thấy. Lưu ý: **nhập toàn bộ ≠ hiển thị toàn bộ** — nhập đầy đủ nhưng chỉ show phần được bật public.
- **Cấp sẵn mã QR** (sinh đơn lẻ/hàng loạt) để **gán xuống**; QR có thể để trống chờ gán hoặc gán sẵn cho đối tượng.
- Có **một trang khai báo thông tin TXNG** (config page): thông tin chung của đối tượng (tên, mô tả, ảnh, danh mục…), và **khai báo trong đối tượng đó dùng Flow nào, Event nào diễn ra**.

**B. Account Người nhập dữ liệu (Data Entry):**

- **2 cách bắt đầu kê khai:**
  1. Chọn từ menu: **Sản phẩm → Flow → Event** mà họ **được phân quyền**; hoặc
  2. **Quét QR** → hệ thống nhận ra đối tượng → chọn Flow, Event → nhập.
- **Trợ giúp nhập liệu (điền sẵn, sửa được):** với 5 yếu tố (ai, ở đâu, thời gian, thông tin, media) hệ thống **tự gợi ý / fill sẵn**:
  - AI = người đang đăng nhập; ở đâu = GPS/đơn vị/địa điểm gần nhất; thời gian = hiện tại;
  - **Sao chép từ Event trước tương tự** (cùng loại Event của lô trước) hoặc **template**;
  - Người dùng **không đồng ý thì sửa lại**, có thể **bỏ qua gợi ý**.
- Chỉ thấy **Flow/Event được cấp quyền**.

### 4.3. Người dùng cuối (Consumer)

- **Không cần đăng nhập.** Quét QR → xem trang TXNG: sản phẩm, doanh nghiệp, **timeline các Event public** (ai/ở đâu/khi nào/làm gì/thông tin/media), chứng nhận, bản đồ (nếu bật). **Chỉ hiển thị dữ liệu đã duyệt + được cấu hình public.**

### 4.4. Ma trận quyền (gợi ý, format `resource:action`)

| Quyền | Platform Admin | Superadmin tầng trên | Manager/Config | Data Entry |
|---|:--:|:--:|:--:|:--:|
| tenant:manage / audit:read_all | ✅ | — | — | — |
| org:manage (nhánh con) | — | ✅ | — | — |
| account:manage / role:assign (nhánh con) | — | ✅ | ✅ (trong đơn vị) | — |
| category:manage / field:manage | — | ✅ | ✅ | — |
| flow:manage / event_def:manage | — | ✅ | ✅ | — |
| flow_permission:assign (ai khai flow nào) | — | ✅ | ✅ | — |
| public_visibility:manage | — | ✅ | ✅ | — |
| qr:provision / qr:assign | — | ✅ | ✅ | — |
| event_record:create / submit | — | — | ✅ | ✅ (theo phân quyền) |
| event_record:approve / lock | — | ✅ | ✅ | — |

**Bắt buộc:** backend kiểm tra quyền cho **mọi** request; **không tin quyền do frontend gửi**; **tenant isolation** + **org scope** cho mọi truy vấn.

---

## 5. Phân quyền theo luồng (flow-level permission)

- Manager có UI **"Ai được khai báo Flow nào"**: gán account Data Entry ↔ Flow (và/hoặc Event cụ thể).
- Khi Data Entry đăng nhập, chỉ liệt kê Flow/Event trong phạm vi được gán.
- Có thể phân quyền **theo Event** (một Data Entry chỉ nhập vài Event trong Flow).

---

## 6. Cấu hình hiển thị công khai (Public Visibility)

- Cấu hình ở **mức Flow → từng Event → từng field/media**: bật/tắt `publicVisible`.
- Manager có **Preview**: nhìn ngay trang người dùng cuối sẽ thấy gì / ẩn gì trước khi lưu.
- Public page **chỉ** render field/media có `publicVisible = true` và record ở trạng thái **APPROVED**.

---

## 7. QR

- **Cấp sẵn (provision):** sinh QR đơn lẻ hoặc hàng loạt, import/export CSV, in tem, khóa/thu hồi.
- **Gán (assign):** QR ↔ đối tượng truy xuất (sản phẩm/lô/serial). QR có thể tạo trước rồi gán sau.
- URL QR **không dùng database id**, dạng:

```
https://{domain}/t/{code}            # code = mã đối tượng / gtin / mã lô
https://{domain}/t/{code}?lot=&serial=
```

- **Quét QR khi kê khai:** Data Entry quét QR → nhận diện đối tượng → chọn Flow/Event → nhập.
- **Quét QR khi tra cứu:** người dùng cuối → trang public.
- Ghi **lịch sử quét** (scan log).

---

## 8. Luồng kê khai (wizard, mobile-first)

Mỗi bước là **một màn hình** (nút lớn, ít chữ, có progress, Quay lại/Tiếp tục, **tự lưu nháp**):

```
1. Chọn đối tượng: chọn sản phẩm gần đây / chọn từ menu / QUÉT QR
2. Chọn Flow (chỉ Flow được phân quyền)
3. Chọn Event (chỉ Event được phân quyền)
4. AI thực hiện       ← fill sẵn = người đăng nhập
5. Ở đâu / GPS        ← fill sẵn = vị trí/đơn vị gần nhất
6. Thời gian          ← fill sẵn = hiện tại
7. Làm gì (hành động) ← gợi ý theo Event
8. Thông tin (field động của Event) ← copy Event trước / template
9. Media (ảnh/video/file) ← chụp/tải lên
10. Xem lại
11. Lưu nháp / Gửi duyệt
```

- Gợi ý dùng **rule + lịch sử + template** (chưa cần AI phức tạp cho MVP).
- Mọi gợi ý đều **sửa được** và **bỏ qua được**.

---

## 9. Trang người dùng cuối (Public TXNG)

- Giao diện đẹp như landing page (khác hẳn admin): hero + trạng thái "đã xác thực", **timeline** các Event public (ai/ở đâu/khi nào/làm gì/thông tin/media), gallery ảnh, chứng nhận, bản đồ (nếu cho phép).
- Không đăng nhập. Chỉ dữ liệu **APPROVED + public**.

---

## 10. Đa tenant & white-label (để bán)

- **Mỗi tenant = một khách hàng** (một tỉnh / một doanh nghiệp). Dữ liệu cách ly hoàn toàn.
- Cho phép tùy biến thương hiệu tối thiểu: tên, logo, màu, ảnh bìa trang public.
- Onboarding: Platform Admin tạo tenant + tài khoản Superadmin tầng 1 → tenant tự dựng cây tổ chức, danh mục, Flow, tài khoản.

---

## 11. Data model tối thiểu (gợi ý)

```
tenants
organizations            (cây đa tầng: parent_id, level, type)
users, roles, permissions, user_roles, user_scopes(org)
product_categories, category_fields         (field động)
products / traceable_objects
flows, flow_versions, event_definitions, event_fields
flow_permissions          (user/role ↔ flow/event được khai)
public_visibility_config  (hoặc cờ publicVisible trên event_fields)
traceable_items           (batch/lot/serial)
event_records, event_record_values, event_record_media
qr_codes, qr_assignments, qr_scan_logs
approval_histories
audit_logs
```

Mọi bảng nghiệp vụ có `tenant_id`, `created_at`, `updated_at`, `deleted_at?` (soft delete).

---

## 12. API gợi ý

```
POST /api/auth/login | refresh | logout ; GET /api/auth/me
GET/POST/PATCH /api/organizations (tree, create, move)
GET/POST /api/users (+ assign roles, assign vào organization)
GET/POST /api/categories (+ fields động)
GET/POST /api/products
GET/POST/PATCH /api/flows (+ event definitions, event fields)
POST /api/flows/:id/permissions            # phân quyền ai khai flow/event nào
PATCH /api/flows/:id/public-visibility     # cấu hình hiển thị công khai
POST /api/qr/provision | :id/assign | :id/lock | :id/revoke ; GET /api/qr
GET  /api/flow-versions/:id/entry-events   # event mà user được phép nhập
GET  /api/event-records/suggestions        # gợi ý fill sẵn (copy previous...)
POST /api/event-records (draft) | :id (update) | :id/submit
POST /api/approvals/:id/approve | reject | request-changes | lock
GET  /api/public/t/:code                   # KHÔNG auth — chỉ approved + public
GET  /api/dashboard/stats ; GET /api/audit
```

---

## 13. Yêu cầu phi chức năng

- **Dễ clone:** Docker Compose, `.env.example`, migration + **seed demo đầy đủ mọi vai trò**, README hướng dẫn 5 dòng.
- **Bảo mật:** tenant isolation, org scope, RBAC kiểm ở backend, hash mật khẩu (Argon2/bcrypt), refresh token rotation, validate input, validate file, rate limit, chống XSS/SQLi, audit log, không lộ secret.
- **UX:** mobile-first, mỗi màn hình một nhiệm vụ, ít click, tự lưu nháp; trang admin có sidebar, trang kê khai bắt buộc dùng wizard.
- **Cấu hình động:** tầng tổ chức, category, product field, flow, event, event field, role, permission, public visibility — **không hard-code**.

---

## 14. MVP phải chạy được

1. Đăng nhập theo vai trò.
2. Dựng cây tổ chức đa tầng; superadmin cấp trên quản trị nhánh con.
3. Tạo tài khoản & gán vào đúng đơn vị (thư mục); phân vai trò Quản lý / Kê khai.
4. Tạo category + field động.
5. Manager tạo Flow + Event (5 yếu tố + field động).
6. Manager phân quyền "ai khai Flow/Event nào".
7. Manager cấu hình **public visibility** + Preview.
8. Cấp sẵn QR + gán xuống đối tượng.
9. Data Entry: chọn sản phẩm→flow→event **hoặc quét QR**, nhập với **gợi ý fill sẵn / copy event trước**.
10. Duyệt hồ sơ (approve/reject/request-changes/lock).
11. Người dùng cuối quét QR → trang public (chỉ approved + public).
12. Dashboard + audit log cơ bản.

---

## 15. Cách AI phải thực hiện

Trước khi code, **xuất**: (1) kiến trúc hệ thống, (2) ERD, (3) danh sách module, (4) ma trận role × permission, (5) cấu trúc thư mục, (6) sơ đồ luồng QR→Flow→Event và luồng kê khai, (7) kế hoạch MVP.

Sau đó tạo **source code chạy được** (không chỉ mockup): mỗi module có đầy đủ đường dẫn file, code, migration, validation, xử lý lỗi, test cơ bản. Cuối cùng **chứng minh chạy được** bằng seed + hướng dẫn khởi động, và tài khoản demo cho mọi vai trò.
