# ĐẶC TẢ TÍNH NĂNG: NHÃN ĐIỆN TỬ (e-label)

> Tài liệu này **mô tả tính năng Nhãn điện tử dựa trên codebase hiện có** (`elabel_frontend` = quản trị, `elabel_landing_page` = trang công khai) để có thể **phát triển lại** tính năng. Đây là đặc tả nghiệp vụ + kỹ thuật, không phải hướng dẫn cài đặt.

---

## 1. Tổng quan

**Nhãn điện tử** là phiên bản số của nhãn sản phẩm, người tiêu dùng truy cập bằng cách **quét mã QR** trên bao bì. Hệ thống gồm 2 phần:

| Phần | App | Người dùng | Vai trò |
|---|---|---|---|
| **Soạn & công bố nhãn** | `elabel_frontend` (SPA quản trị) | Doanh nghiệp (`user`), Admin hệ thống (`admin`) | Tạo sản phẩm/lô, nhập thông tin nhãn, ký số, công bố, sinh QR |
| **Xem nhãn** | `elabel_landing_page` (SPA công khai) | Người tiêu dùng (không đăng nhập) | Quét QR → xem nhãn + hành trình truy xuất |

**Đơn vị dữ liệu:** một nhãn = **1 Product** (cấp sản phẩm/GTIN) + **N ProductBatch** (cấp lô). Mỗi cấp sinh một QR riêng trỏ về trang landing.

**Stack (cả 2 app):** React 19 + TypeScript 5.9 + Vite 8; Tailwind 4 + shadcn + `@base-ui/react`; `@tanstack/react-query` v5; `zustand` v5; `react-router` v7; `react-hook-form` v7 + `zod` v4; `axios` (interceptor dùng chung, envelope chuẩn); i18n vi/en; `qrcode`, `lucide-react`, `sonner`. Alias `@/` → `src/`.

**Quy ước code:** pattern **MVC-lite** `hooks/useModel.ts` (state + query/mutation) + `hooks/useController.ts` (handler) + `index.tsx` (view). Response API bọc **`ApiEnvelope<T>`** = `{ data, message?, status?, version? }`; list = `{ items, page, limit, total, total_pages, summary? }`.

---

## 2. Mô hình dữ liệu

### 2.1. Product (cấp sản phẩm)

**Định danh & mã nhãn**
- `id`, `gtin` (GS1 ≤14 số) **hoặc** `sku` (mã nội bộ khi không có GTIN — "sản phẩm thủ công"), `product_code`, `e_label_code` (mã nhãn do backend sinh), `tax_code` (dùng dựng QR), `nbc_product_id` (id bên NBC/GS1).
- Quy tắc: có `sku` (không GTIN) ⇒ sản phẩm thủ công (ảnh hưởng luồng QR & validate).

**Phân loại GPC (bắt buộc, 4 tầng phân cấp)** — mỗi tầng có bộ `code/id/name`:
`segment` → `family` (nhóm hàng) → `class` (loại) → `brick` (mắt xích cuối). Kèm `appendix_group_id` (quyết định bộ **trường phụ lục bắt buộc**).

**Thông tin nhãn cơ bản:** `name`, `brand`, `description`, `target_market`, `country_of_origin`, `hs_code`, `reference_price`, `is_import`, `supplier`, `supplier_info`, `product_group_id` + `product_group_name`.

**Ba kho thuộc tính động (phân biệt rõ khi thiết kế backend):**
| Kho | Cấu trúc | Ý nghĩa |
|---|---|---|
| `attributes` | `Record<field_id, value>` (phẳng) | Trường **phụ lục bắt buộc** theo product-group, scope `product` |
| `inter_industry_attributes` | `DynamicField[]` | Trường yêu cầu cho hàng **rủi ro trung/cao** (block 3) |
| `additional_attributes` | `DynamicField[]` | "Thông tin khác" do người dùng tự thêm (block 4) |
| `attributes_display` | `{ field_key, field_type, label_vi, label_en?, value }[]` | Bản **đã render để hiển thị** (backend trả cho phía xem nhãn) |

`DynamicField` có 2 kiểu:
- `field_type: "text"` → `field_value: string`
- `field_type: "rich_content"` → `field_value: { text: string, image_urls: string[], other_urls: string[] }`

**Ảnh & chứng nhận:** `images: { url, note, source }[]` với `source ∈ "vnpc"` (từ GS1, chỉ đọc) | `"elabel"` (tự thêm, xóa được); `certificate_urls: string[]`; `qr_codes: string[]`.

**Trạng thái & kiểm soát:**
- `status`: chuẩn hóa về **`draft` / `published` / `recalled`** (backend có thể trả `active/inactive/archived/withdrawn/revoked` → map lại).
- `risk_level`: `0` chưa xác định, `1` cao, `2` trung bình, `3` thấp.
- `is_allowed_scan: boolean` (server dùng để chặn/cho phép hiển thị khi quét).
- `recall_reason?`.

**Versioning:** `is_current`, `root_product_id` (id gốc chuỗi phiên bản), `version`. Lấy phiên bản: `GET /products/{id}/versions/{version_no}`.

**Chủ sở hữu:** `business`, `business_id`, `business_user_id`, `gtin_owner` (`{ name, tax_code, business_email/phone, full_address, representative_* }`).

### 2.2. ProductBatch (cấp lô)

`id`, `product_id`, `root_batch_id`, `batch_code` (số lô, charset `[A-Za-z0-9-]`), `manufacturing_date` (DD/MM/YYYY), `total_quantity`, `traceability_url` (URL truy xuất quốc gia), `e_label_code`, `tax_code`, `status` (`draft/published/recalled`), `is_current`, `is_allowed_scan`, `version`, `recall_reason`. Thuộc tính động: `attributes` (phụ lục scope `lot`), `additional_attributes` / `inter_industry_attributes` (`{ field_code, field_name, field_value }[]`).

### 2.3. Trường bắt buộc vs động
- **Bắt buộc luôn:** `name`, phân loại đến `brick`, `product_group_id`, `risk_level`, `status`, một trong `gtin`/`sku`, checkbox cam kết kê khai.
- **Động:** `attributes` (phụ lục theo group), `inter_industry_attributes` (khi risk 1/2), `additional_attributes`, `images`, `certificate_urls`.

---

## 3. Trường động (field catalog)

Hai nguồn trường:
- **Catalog toàn hệ thống** (admin `admin`): `AttributeField { field_id, field_name_vi/en, data_type, scope, notes_vi/en, autofill_enabled?, autofill_rules? }`. `data_type ∈ string | note | text | date | number | bool`. `scope ∈ product | lot`.
- **Gán theo product-group:** thêm `display_order`, `is_enabled`, `is_required`.

**Ánh xạ `data_type` → control UI:** `string`/`note` → input 1 dòng; `text` → textarea; `date` → date; `number` → number; `bool` → checkbox.

**Smart Auto-fill:** `AutofillRule { vi: { format, keywords[] }, en: {...} }`, placeholder `{value}`, chỉ áp dụng cho free-text (`string/note/text`).

**UI cấu hình (admin):**
- `/system/product-fields` — thư viện trường: tạo/sửa/xóa trường, cấu hình autofill, chống trùng `field_name_vi/en` + `field_code`.
- `/system/product-categories` — chọn product-group → gắn/bỏ trường từ catalog, đặt `display_order`, `is_required` (bỏ trường ⇒ gửi `is_enabled:false`).

---

## 4. Luồng soạn nhãn (quản trị)

### 4.1. Wizard tạo sản phẩm/nhãn — `/product-create` (3 bước, state = Zustand)

**Bước 1 — Định danh GTIN:** nhập GTIN, validate check-digit GS1. Hai kiểm tra: (a) `GET /products/by-code` — GTIN đã tồn tại trong hệ thống ⇒ chặn; (b) `GET /products/nbc-by-gtin` — tra cứu NBC/GS1: có data ⇒ **autofill** tên, phân loại (segment→brick), `gtin_owner`, `appendix_group_id`, `risk_level`; 404 ⇒ chuyển chế độ nhập thủ công.

**Bước 2 — Thông tin sản phẩm (RHF + zod):** thông tin cơ bản + phân loại cascade (`GET /segments|/families|/classes|/bricks`) + doanh nghiệp chịu trách nhiệm + **trường phụ lục bắt buộc** (`GET /fields?scope=product&product_group_id=`) + block rủi ro (khi risk 1/2 → `inter_industry_attributes`) + "Thông tin khác" có ảnh/URL (→ `additional_attributes`) + ảnh + checkbox cam kết. Đổi product-group ⇒ tải lại phụ lục (cảnh báo nếu đã có lô).

**Bước 3 — Preview + hành động:**
- **Lưu nháp** → `POST /products` với `status:"draft"` (không cần ký số).
- **Lưu & công bố** → xác nhận → **luồng ký số e-sign** (SSE `POST /products` kèm `cert_id`) → hiện dialog QR.

**Biến thể — Nhãn phụ** (`/product-create-secondary-label`): bỏ bước GTIN, vào thẳng Bước 2; cho nhập `sku` (thủ công).

**Chế độ VNPC vs INTERNAL:** VNPC (import từ NBC) autofill toàn bộ, khóa SKU; INTERNAL/thủ công tự chọn phân loại, được nhập SKU.

### 4.2. Payload tạo sản phẩm (`ProductCreateRequest`)
Gồm `gtin` **hoặc** `sku`, `gtin_owner`, phân loại (tối thiểu `brick_code`), `attributes` (phụ lục), `inter_industry_attributes`, `additional_attributes` (tự sinh `field_code`, chọn `text`/`rich_content` theo có ảnh/URL), `batches[]`, `product_group_id`, `risk_level`, `status`.

### 4.3. Tạo lô + sinh QR (trang chi tiết sản phẩm)
- Tạo/sửa lô: `POST/PATCH /products/{id}/batches[/{batchId}]` (DynamicForm + zod: `batch_code`, `manufacturing_date` không tương lai, `total_quantity ≥ 0`, phụ lục lô). Check trùng: `GET .../batches/by-code`.
- **traceability_url** (`TXNG-traceability-url.ts`): host bắt buộc **`qr.txng.gov.vn`**, path GS1 `/01/{GTIN}/10/{lot}`. `buildLotLandingPageUrl(gtin, lot, taxCode)` → `${base}/01/${gtin}/10/${lot}?8000=${taxCode}`. Validate phased: `empty|ok|lot_warning`(mềm)|`error`(parse/domain/path/gtin — chặn lưu). Sản phẩm thủ công chỉ cần `https://`.
- **QR:** sản phẩm GS1 = `{domain}/01/{GTIN}?8000={taxCode}`; thủ công = `{origin}/{tax}/{sku}`; lô = `buildLotLandingPageUrl(...)` hoặc `{origin}/{tax}/{sku}/{lot}`. Render PNG bằng `qrcode` (ECC "M").
- **Bulk QR:** ≤ ngưỡng → nén ZIP client; > ngưỡng → `POST /products/{id}/batches/bulk/qr-job` → `qr_job_id` → **poll** `GET /qr-jobs/{jobId}` (`{ progress, status, qr_bundle.parts[].download_url, error }`).

### 4.4. Công bố / trạng thái / ký số
- Chuyển trạng thái: `PATCH /products/{id}/status` `{ status, recall_reason }`. Thu hồi sản phẩm ⇒ thu hồi cả lô con.
- **Ký số bắt buộc khi:** công bố từ `draft`; **sửa nhãn khi status ≠ draft** (SSE `PATCH /products/{id}` kèm `cert_id`). Draft ⇒ không ký.
- **Bulk publish:** `PATCH /products/bulk/status` `{ cert_id, product_ids[], status }` (draft cần ký; recalled publish thẳng).
- **e-sign NEAC:** máy trạng thái `IDLE → (chọn/ xác nhận chứng thư) → SIGNING_COUNTDOWN (~330s) → success/error`, ký qua **SSE stream**, `buildBody(certId)` chèn `cert_id`. Chưa có chứng thư ⇒ điều hướng `/account-management/signature-provider`, lưu `pendingState` (localStorage, hết hạn 30') để **resume** sau khi thêm chứng thư. API: `/esign/neac-ca-providers`, `/esign/neac-certificates`, `/esign/certificates*`, `DELETE /esign/signing/{id}`.

---

## 5. Trang xem nhãn (công khai)

### 5.1. URL / QR / routing
Một component duy nhất render toàn bộ. Ba dạng URL (parse trong `publicResolver`):
1. **GS1 Digital Link:** `/01/{gtin}/10/{lot}` hoặc `/01/{gtin}/21/{serial}` (AI `01`=gtin, `10`=lot, `21`=serial; ưu tiên lot khi có cả hai).
2. **Custom path (thủ công):** `/{MST}/{SKU}[/{lot}]` (MST 10/12/13 số).
3. **Query:** `/qr-scan?gtin=&sku=&batch_code=&manufacturing_date=&tax_code=`.

**`level`** = `lot` (có lô) hoặc `sku` (chỉ sản phẩm). **Tham số `8000`** = MST tổ chức kê khai muốn xem: sai/không tìm thấy ⇒ `fallbackNotice` (hiện banner "hiển thị từ chủ sở hữu").

### 5.2. Tải dữ liệu
`GET /api/qr/scan` với params `gtin/sku/batch_code/manufacturing_date` + **`tax_code` (bắt buộc)** (`manufacturing_date` gửi dạng `dd/MM/yyyy`). Retry: nếu có lô mà rỗng ⇒ gọi lại chỉ với gtin/sku (lấy cấp sản phẩm). Không có ⇒ 404 "GTIN chưa đăng ký".
> **Chính sách hiển thị nằm ở backend:** frontend không kiểm `public_visible`/`is_allowed_scan`/`status` — backend `/api/qr/scan` chỉ trả dữ liệu được phép công khai. Frontend chỉ xử lý recall (vẫn hiển thị + banner) và fallback.

### 5.3. Bố cục & các mục nhãn (3 tab)

**Tab "Sản phẩm"** — các section accordion:
1. **Thông tin:** tên, GTIN, mã HS, DN chịu trách nhiệm + địa chỉ, xuất xứ, nhãn hiệu, nhà cung cấp, phân loại + risk, thị trường mục tiêu, mô tả (rỗng ⇒ `—`).
2. **Thông tin lô:** số lô, số lượng, NSX, HSD + `attributes_display` lô + thuộc tính lô bổ sung. Nút "Tra cứu lô".
3. **Ảnh sản phẩm:** carousel `images` (auto-slide, swipe).
4. **Thông tin bắt buộc khác:** từ `fields` (lọc value truthy).
5. **Thông tin liên ngành:** khi `inter_industry_attributes` > 0.
6. **Thông tin rủi ro:** khi `risk_level ≤ 2` và có trường rủi ro (`registration_no`, `haccp_cert`, `lab_test_result`…).
7. **Thông tin khác:** `additional_attributes` — text + carousel `image_urls` + list link `other_urls`; rich_content render đệ quy; tự nhận URL → link.

**Tab "Doanh nghiệp":** DN chịu trách nhiệm (từ `gtin_owner`, nguồn GS1/VNPC) + DN kê khai nhãn (từ `business`).

**Tab "Truy xuất nguồn gốc":** tra cứu lô (theo NSX / số seri) → `TraceSummaryPanel` (tóm tắt lô, link URL truy xuất ngoài) + `TraceJourneyPanel` (timeline sự kiện, badge "đã xác thực").

### 5.4. Đa ngôn ngữ & hiển thị
- `locale ∈ vi | en`, mặc định `vi`, EN fallback về VI. Text tĩnh từ JSON; text dữ liệu qua `LocalizedText { vi, en? }`. Lưu ý: field động từ API thường `labelEn = null` ⇒ EN vẫn hiện nhãn VI.
- Ngày format theo locale; `document.title = "{tên} | e-Label"`.
- Hỗ trợ **chế độ nhúng iframe** (`postMessage` `IFRAME_READY` ↔ `FINAL_DATA`) để trang cha bơm dữ liệu, ưu tiên hơn tự fetch.

---

## 6. Danh sách API (nhãn điện tử)

**Quản trị (`elabel_frontend`)**
| Method | Path | Mục đích |
|---|---|---|
| GET/POST | `/products` | Danh sách / tạo nhãn (publish kèm `cert_id` qua SSE) |
| GET/PATCH/DELETE | `/products/{id}` | Chi tiết / sửa (kèm cert_id nếu ≠ draft) / xóa |
| PATCH | `/products/{id}/status` | Đổi trạng thái (+ recall_reason) |
| PATCH | `/products/bulk/status` | Công bố hàng loạt |
| GET | `/products/{id}/versions/{v}` · `/products/{id}/audit-logs` | Phiên bản · lịch sử |
| GET | `/products/nbc-by-gtin` · `/products/by-code` | Tra cứu NBC/GS1 · kiểm tra tồn tại |
| GET | `/product-groups` · `/segments` `/families` `/classes` `/bricks` · `/risk-fields` | Danh mục & phân loại |
| GET | `/fields?scope=&product_group_id=&appendix_group_id=` | Trường phụ lục |
| GET/POST/PATCH/DELETE | `/products/{id}/batches*` (by-code, status, versions, bulk status/delete/qr-job) | Quản lý lô |
| GET/DELETE | `/qr-jobs/{jobId}` | Trạng thái / hủy job QR |
| GET/POST/DELETE | `/field-catalog/fields*` · `/field-catalog/product-groups/{id}/fields` | Thư viện trường (admin) |
| GET/POST/DELETE/PATCH | `/esign/*` (neac-ca-providers, neac-certificates, certificates, default, signing) | Ký số NEAC |
| POST | `/storage/presign` | Presign upload ảnh |

**Công khai (`elabel_landing_page`)**
| Method | Path | Mục đích |
|---|---|---|
| GET | `/api/qr/scan` | Lấy dữ liệu nhãn theo `tax_code` + `gtin`/`sku` (+ lô) |
| GET | `/api/health` | Health check |

---

## 7. Trạng thái & quy tắc nghiệp vụ then chốt (checklist khi code lại)

1. **3 kho thuộc tính động phải tách bạch:** `attributes` (phụ lục bắt buộc), `inter_industry_attributes` (rủi ro), `additional_attributes` (thông tin khác — text/rich_content).
2. **QR/traceability GS1:** chỉ host `qr.txng.gov.vn`, path `/01/{gtin}/10/{lot}`; lot lệch chỉ cảnh báo mềm; sản phẩm thủ công chỉ cần `https://`.
3. **Ký số bắt buộc:** publish từ draft, sửa nhãn khi ≠ draft, bulk publish phần draft — đều qua SSE + `cert_id`; có cơ chế resume khi chưa có chứng thư.
4. **Versioning:** mỗi lần công bố/sửa tạo phiên bản (`root_product_id` + `version` + `is_current`).
5. **Chính sách hiển thị công khai enforce ở backend** (`/api/qr/scan`), không ở client.
6. **Recall vẫn hiển thị** kèm banner (không ẩn sản phẩm).
7. **Trạng thái chuẩn hóa:** mọi biến thể backend map về `draft/published/recalled`.

---

## 8. Ghi chú kỹ thuật / điểm cần dọn khi làm lại

- Landing hiện có **code legacy không dùng**: `components/product/{FieldSection,ManufacturerSection,MediaSection}.tsx`, `components/common/ProductIcons.tsx`, `i18n/labels.*` — `ProductLandingPage` tự định nghĩa section inline. Có thể bỏ.
- **Timeline truy xuất (`TraceJourneyPanel`) đang lấy từ dữ liệu mock local** (`constants/publicCatalog.ts`) theo GTIN, chưa nối API thật — cần thay bằng nguồn thật (VNPC/blockchain) khi lên production.
- **Chưa có ghi log lượt quét ở frontend** — nếu cần thống kê scan, thêm ở backend khi nhận `/api/qr/scan` hoặc bổ sung endpoint POST.
- Wizard tạo sản phẩm hiện **tắt bước tạo lô** (Step3 còn code nhưng comment); lô được tạo ở trang chi tiết. Có thể bật lại nếu muốn gộp vào wizard.
- Cấu hình runtime injectable: `window.__RUNTIME_CONFIG__.API_BASE_URL` / `LANDING_PAGE_URL` (build 1 lần, cấu hình lúc chạy).
