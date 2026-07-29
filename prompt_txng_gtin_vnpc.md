# PROMPT: Xây dựng hệ thống truy xuất nguồn gốc dùng GTIN

Bạn là Senior Full-stack Developer và Software Architect. Hãy xây dựng ứng dụng web truy xuất nguồn gốc đa tenant, giao diện đơn giản như mobile app, dễ clone và chạy.

## 1. Công nghệ

- Frontend: React + TypeScript + Vite
- Backend: Node.js + TypeScript + NestJS
- Database: PostgreSQL
- ORM: Prisma
- UI: Tailwind CSS + shadcn/ui
- Form: React Hook Form + Zod
- API: REST + Swagger
- Auth: JWT + refresh token
- Storage: local và S3-compatible
- Deployment: Docker Compose
- Monorepo:
  - `apps/web`
  - `apps/api`
  - `packages/shared`
  - `packages/ui`

Bắt buộc có `.env.example`, migration, seed, README, Docker Compose và dữ liệu demo.

## 2. GTIN và tích hợp VNPC

GTIN là mã định danh nghiệp vụ chính của sản phẩm truy xuất.

Có 2 cách chọn GTIN:

1. Nhập GTIN bằng tay.
2. Tìm kiếm và chọn GTIN từ VNPC thông qua API.

### Nhập bằng tay

- Không tự sinh GTIN.
- Hỗ trợ GTIN-8, GTIN-12, GTIN-13 và GTIN-14.
- Chỉ cho phép chữ số.
- Kiểm tra độ dài và check digit theo GS1.
- Lưu dạng chuỗi để giữ số `0` đầu.
- Kiểm tra trùng trong cùng tenant.

### Chọn từ VNPC

Tạo ô tìm kiếm có autocomplete:

- tìm theo GTIN;
- tên sản phẩm;
- doanh nghiệp;
- nhãn hiệu;
- từ khóa.

Khi chọn một sản phẩm từ VNPC, tự động điền nếu API có dữ liệu:

- GTIN;
- tên sản phẩm;
- doanh nghiệp;
- thương hiệu;
- mô tả;
- category;
- hình ảnh;
- thuộc tính sản phẩm.

Người dùng phải xem lại và xác nhận trước khi lưu.

Không chỉnh sửa trực tiếp dữ liệu gốc của VNPC. Chỉ lưu bản sao cần thiết vào hệ thống nội bộ.

Backend phải gọi VNPC API, không gọi trực tiếp từ frontend.

Tạo module tích hợp riêng:

```text
VnpcModule
VnpcService
VnpcController
VnpcApiClient
```

Biến môi trường:

```env
VNPC_API_URL=
VNPC_API_KEY=
VNPC_API_TIMEOUT=10000
```

API nội bộ gợi ý:

```text
GET /api/integrations/vnpc/products?q=
GET /api/integrations/vnpc/products/:gtin
POST /api/products/import-from-vnpc
```

Yêu cầu tích hợp:

- timeout;
- retry có giới hạn;
- xử lý lỗi;
- log request;
- cache kết quả ngắn hạn;
- rate limiting;
- không lộ API key;
- fallback sang nhập tay khi VNPC lỗi hoặc không có dữ liệu.

Mỗi Product nên lưu:

```text
gtin
source: MANUAL | VNPC
source_reference
source_synced_at
source_snapshot
```

Không tự động ghi đè dữ liệu đã được doanh nghiệp chỉnh sửa khi đồng bộ lại VNPC.

## 3. Mô hình truy xuất

```text
GTIN/Product
  -> Traceable Item
    -> Flow
      -> Event
```

Mỗi Event có:

1. Ai thực hiện
2. Ở đâu
3. Làm gì
4. Thời gian
5. Thông tin chi tiết
6. Media

Người dùng doanh nghiệp kê khai. Người tiêu dùng quét QR để xem dữ liệu được công khai.

## 4. Tổ chức đa tầng

Không hard-code số tầng.

Ví dụ:

- Tầng 1: tỉnh, tập đoàn, cơ quan chủ quản;
- Tầng 2: doanh nghiệp, công ty thành viên, P&L;
- Tầng 3: nhà máy, hợp tác xã, phòng ban;
- Tầng 4: vùng trồng, dây chuyền, kho;
- có thể thêm tầng.

Mỗi đơn vị có:

```text
id
tenant_id
name
code
type
parent_id
level
status
settings
```

Hiển thị dạng cây. Cấp trên quản lý cấp dưới trong phạm vi được phân quyền.

## 5. Tài khoản

### Platform Admin

- tạo tenant;
- quản lý tenant;
- xem audit log.

### Organization Admin

- quản lý đơn vị cấp dưới;
- tài khoản và phân quyền;
- category;
- Product;
- Flow;
- Event;
- QR;
- dữ liệu công khai;
- phê duyệt.

### Data Entry

- chọn hoặc nhập GTIN;
- chọn Flow;
- chọn Event được cấp quyền;
- hoặc quét QR để kê khai.

### Approver

- duyệt;
- từ chối;
- yêu cầu sửa;
- khóa dữ liệu sau duyệt.

## 6. Product

Mỗi Product có:

```text
gtin
name
category_id
organization_id
description
image
dynamic_attributes
source
source_reference
source_synced_at
source_snapshot
status
```

Wizard tạo Product:

1. Chọn `Nhập GTIN` hoặc `Tìm từ VNPC`.
2. Nhập hoặc tìm GTIN.
3. Kiểm tra GTIN và dữ liệu trùng.
4. Tự động điền dữ liệu nếu lấy từ VNPC.
5. Người dùng xem lại và chỉnh sửa.
6. Chọn category và Flow.
7. Xác nhận và lưu.

Không cho lưu nếu GTIN không hợp lệ.

## 7. Traceable Item

Traceable Item là đối tượng thực tế:

- batch;
- lot;
- serial;
- kiện hàng;
- vùng trồng;
- đơn vị đóng gói.

Mỗi item có:

```text
gtin
batch_or_lot
serial_number
organization_id
product_id
flow_ids
qr_id
status
```

GTIN bắt buộc. Batch, lot hoặc serial là tùy chọn.

## 8. Flow và Event

Flow có:

- tên;
- mã;
- phiên bản;
- category;
- danh sách Event;
- thứ tự;
- quy tắc hoàn thành;
- cấu hình public.

Flow phải có versioning.

Event Definition có:

- tên;
- mã;
- thứ tự;
- bắt buộc;
- cho phép lặp;
- field động;
- role được nhập;
- role được duyệt;
- field public;
- media public;
- điều kiện trước;
- dữ liệu gợi ý.

Event Record có:

- GTIN;
- Traceable Item;
- Flow;
- Event;
- ai;
- tổ chức;
- địa điểm;
- GPS;
- thời gian;
- hành động;
- thông tin;
- media;
- trạng thái;
- người nhập;
- người duyệt;
- lịch sử chỉnh sửa.

## 9. Giao diện theo hướng app

Dù là web, giao diện phải giống một ứng dụng đơn giản:

- mobile-first;
- ít chữ;
- nút lớn;
- mỗi màn hình chỉ xử lý một việc;
- có progress bar;
- có `Quay lại` và `Tiếp tục`;
- không dùng form dài;
- hạn chế cuộn;
- tự lưu nháp;
- tối ưu thao tác một tay.

Trang quản trị có thể dùng sidebar. Trang kê khai bắt buộc dùng wizard.

## 10. Wizard kê khai

Mỗi bước là một màn hình riêng:

1. Nhập GTIN, chọn GTIN gần đây, tìm từ VNPC hoặc quét QR.
2. Chọn batch, lot, serial hoặc Traceable Item.
3. Chọn Flow.
4. Chọn Event.
5. Chọn ai thực hiện.
6. Chọn địa điểm hoặc lấy GPS.
7. Chọn thời gian.
8. Chọn hoặc nhập hành động.
9. Nhập thông tin chi tiết.
10. Thêm ảnh, video hoặc file.
11. Xem lại.
12. Lưu nháp hoặc gửi duyệt.

Chỉ hiển thị Flow và Event được cấp quyền.

## 11. Hỗ trợ nhập liệu

Tự gợi ý:

- người đang đăng nhập;
- tổ chức;
- thời gian hiện tại;
- GPS;
- địa điểm gần nhất;
- dữ liệu lần trước;
- Event tương tự;
- Event trước trong Flow.

Cho phép:

- sao chép lần gần nhất;
- dùng template;
- sửa toàn bộ gợi ý;
- bỏ qua gợi ý.

MVP dùng rule, lịch sử và template; chưa cần AI phức tạp.

## 12. QR và trang công khai

QR chứa URL:

```text
https://domain.com/t/{gtin}
```

Nếu cần phân biệt batch hoặc serial:

```text
https://domain.com/t/{gtin}?lot={lot}&serial={serial}
```

Không dùng database ID trong URL.

Chức năng QR:

- tạo từ GTIN hợp lệ;
- tạo đơn lẻ hoặc hàng loạt;
- import CSV;
- gán cho Traceable Item;
- export PNG, PDF hoặc ZIP;
- in tem;
- khóa;
- thu hồi;
- ghi lịch sử quét.

Người tiêu dùng không cần đăng nhập. Trang công khai hiển thị:

- GTIN;
- tên và ảnh sản phẩm;
- doanh nghiệp;
- batch hoặc lot;
- trạng thái xác thực;
- timeline;
- Event public;
- ai;
- ở đâu;
- khi nào;
- làm gì;
- thông tin;
- media;
- chứng nhận;
- bản đồ nếu được phép.

Chỉ hiển thị dữ liệu đã duyệt và được cấu hình public.

## 13. Dynamic configuration

Không hard-code:

- tầng tổ chức;
- category;
- Product field;
- Flow;
- Event;
- Event field;
- role;
- permission;
- public visibility.

Field hỗ trợ:

```text
text
textarea
number
date
datetime
select
multi-select
checkbox
file
image
video
location
user
organization
boolean
```

## 14. Phân quyền và bảo mật

Dùng RBAC kết hợp scope theo tenant và organization.

Backend phải kiểm tra quyền cho mọi request.

Bắt buộc có:

- tenant isolation;
- organization scope;
- audit log;
- soft delete;
- Argon2 hoặc bcrypt;
- refresh token rotation;
- input validation;
- file validation;
- rate limiting;
- chống XSS và SQL injection;
- không tin quyền do frontend gửi lên.

## 15. Database chính

Tối thiểu có:

```text
tenants
organizations
users
roles
permissions
user_roles
user_scopes
product_categories
category_fields
products
flows
flow_versions
event_definitions
event_fields
traceable_items
event_records
event_record_values
event_record_media
qr_codes
qr_assignments
approval_histories
vnpc_sync_logs
audit_logs
```

Mọi bảng nghiệp vụ có `tenant_id`, `created_at`, `updated_at` và `deleted_at` nếu phù hợp.

## 16. MVP

MVP phải chạy được:

1. Đăng nhập.
2. Quản lý tổ chức đa tầng.
3. Quản lý user và role.
4. Tạo category và field động.
5. Tạo Product bằng nhập GTIN.
6. Tìm và import Product từ VNPC.
7. Tạo Flow và Event.
8. Phân quyền Event.
9. Tạo Traceable Item.
10. Tạo và gán QR.
11. Kê khai bằng wizard.
12. Phê duyệt.
13. Quét QR xem public page.
14. Dashboard cơ bản.
15. Audit log.

## 17. Cách AI phải thực hiện

Trước khi code, hãy xuất:

1. Kiến trúc hệ thống.
2. ERD.
3. Module.
4. Ma trận role và permission.
5. Cấu trúc thư mục.
6. Luồng tích hợp VNPC.
7. Kế hoạch MVP.

Sau đó tạo source code chạy được, không chỉ mockup. Mỗi module phải có đầy đủ đường dẫn file, code, migration, validation, xử lý lỗi và test cơ bản.

Ưu tiên code ngắn gọn, tái sử dụng, không giải thích dài dòng, không lặp lại yêu cầu đã biết.
