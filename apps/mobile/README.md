# VLabel Mobile (React Native · Expo)

Ứng dụng di động cho iOS/Android, **dùng chung backend/API/database/tài khoản** với web VLabel. Không thay đổi web hay backend hiện tại.

## 1. Kiến trúc & công nghệ

- **Expo (React Native) + TypeScript** — dễ clone/cài/build cho iOS & Android.
- **React Navigation** — auth stack + bottom tabs theo role + stack chi tiết.
- **TanStack Query** — gọi/cache API, refresh kéo-để-tải-lại.
- **axios** — HTTP client tới `/api` (giống web), tự refresh token.
- **expo-secure-store** — lưu token an toàn (Keychain/Keystore).
- **expo-camera** — quét QR; **expo-image-picker** — chụp/chọn ảnh.
- **expo-notifications** — push (đăng ký token, cần endpoint gửi ở backend).
- **react-native-webview + Leaflet/OSM** — bản đồ hành trình.
- **Dark mode** tự động theo hệ thống (`useColorScheme`).

Cấu trúc:

```
apps/mobile/
  app.config.ts        # cấu hình dev/staging/production (extra.apiUrl)
  App.tsx              # providers: Theme, Query, Auth, Toast
  src/
    config.ts          # đọc apiUrl theo môi trường
    theme.tsx          # palette light/dark
    lib/               # api, auth, storage, offline, push, query, format
    components/        # UI kit, Toast, WizardShell
    navigation/        # RootNavigator (role-based)
    screens/
      auth/            # Login, ForgotPassword
      shared/          # Account, ChangePassword, Notifications, Scan, Journey
      user/            # Home, Tasks, EntryWizard
      manager/         # Dashboard, Manage, ProductDetail, Helper
```

## 2. Cài đặt & chạy

```bash
cd apps/mobile
npm install            # hoặc: npx expo install (khoá đúng version theo SDK 51)

# QUAN TRỌNG: thiết bị thật/emulator KHÔNG thấy "localhost".
# Đặt API_URL = http://<IP-LAN-của-máy-chạy-backend>:4000/api
API_URL=http://192.168.1.10:4000/api npm start

# Mở trên máy: bấm i (iOS simulator) / a (Android emulator) / quét QR bằng Expo Go
npm run ios
npm run android
```

Môi trường:

```bash
npm start                 # development
npm run start:staging     # staging
npm run start:prod        # production
# Override URL: API_URL=https://api.vlabel.vn/api APP_ENV=production npm start
```

Backend phải đang chạy (mặc định `http://localhost:4000/api`). Tài khoản demo (mật khẩu `Vlabel@123`): `manager@vlabel.vn` (Manager), `user@vlabel.vn` (User).

## 3. Build

```bash
npm install -g eas-cli
eas login
eas build --platform ios       # cần Apple Developer
eas build --platform android    # tạo .aab/.apk
```
Bundle id / package: `vn.vlabel.mobile` (đổi trong `app.config.ts`).

## 4. Phân tích API dùng chung (mục 13)

Mobile **không truy cập DB trực tiếp**, chỉ qua API. Tất cả endpoint dưới đã có sẵn (baseURL đã gồm `/api`).

### API tái sử dụng (không cần đổi backend)

| Nhóm | Endpoint | Dùng cho |
|---|---|---|
| Auth | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` | Đăng nhập, token, hồ sơ, role/permission |
| Sản phẩm | `GET /products`, `GET /products/:id`, `GET /products/by-gtin`, `GET /products/:id/qr` | Danh sách/chi tiết, quét QR, ảnh QR |
| Flow/Event | `GET /flows`, `GET /flows/:id`, `GET /flow-versions/:vid/entry-events` | Flow, công đoạn được phép kê khai |
| Phân công | `GET/POST /flows/:id/permissions`, `DELETE /flow-permissions/:id` | Toàn Flow + theo từng Event |
| Đa Flow | `POST /products/:id/flows/attach`, `DELETE /products/:id/flows/:flowId` | Một QR nhiều Flow |
| Khai báo | `POST /traceable-items/ensure`, `POST /event-records`, `POST /event-records/:id/submit`, `GET /event-records/by-product` | Kê khai Event, tiến độ |
| Media | `POST /uploads` | Ảnh minh chứng |
| Lịch | `GET /trace-tasks`, `POST /trace-tasks`, `PATCH /trace-tasks/:id/status` | Công việc, giao việc, trạng thái |
| Nhãn | `GET /elabels`, `GET /elabels/:id`, `.../supplementary-labels` | Nhãn điện tử/phụ (đọc/soạn) |
| Người dùng/Tổ chức | `GET /users/branch`, `GET /organizations` | Phân công, đơn vị |
| Dashboard | `GET /dashboard/stats` | Tổng quan |

### API đã bổ sung (additive, tương thích ngược)
- `POST /auth/change-password { currentPassword, newPassword }` — màn Đổi mật khẩu (đã hoạt động thật).

### API nên bổ sung thêm (khi có hạ tầng tương ứng)
- `POST /auth/forgot-password { email }` — Quên mật khẩu (cần SMTP gửi email).
- `POST /devices/register { token, platform }` + service gửi Expo Push — để đẩy: giao việc mới, gần/quá hạn, yêu cầu bổ sung. Client đã đăng ký token sẵn.

> Ứng dụng đã chừa sẵn chỗ gọi các endpoint trên; khi backend bổ sung thì tự hoạt động. **Không** đổi prefix `/api` hiện tại (web đang dùng). Nếu muốn `/api/v1`, thêm dưới dạng **alias song song** để giữ tương thích.

### Quyền theo role
Suy ra từ `GET /auth/me` (`permissions[]`). `flow:manage` ⇒ Manager (tab Tổng quan/Quản lý/Helper). Không có ⇒ User (Trang chủ/Công việc/Quét QR).

## 5. Sitemap & user flow

- **User**: Trang chủ → Công việc → **Khai báo Event** (wizard: sản phẩm/lô → công đoạn → ai → địa điểm → hoạt động → thông tin → ảnh → xem lại → gửi) · Quét QR · Thông báo · Tài khoản.
- **Manager**: Tổng quan (bấm số liệu mở danh sách) → Quản lý (sản phẩm → chi tiết: Flow/Phân công/Lịch/Tiến độ/Hành trình) · Helper (wizard Truy xuất · Lịch · **Nhãn điện tử** · **Nhãn phụ**) · Thông báo · Tài khoản.

## 6. Offline & đồng bộ
- Khai báo khi mất mạng → lưu vào hàng chờ (`expo-secure-store`), tự **đồng bộ khi mở app/có mạng** (`flushQueue`), xoá khỏi hàng chờ khi thành công ⇒ tránh gửi trùng.
- Kéo-để-tải-lại trên mọi danh sách; TanStack Query cache dữ liệu đã tải.

## 7. Đã hoàn thiện
- Auth: đăng nhập, hồ sơ, **đổi mật khẩu (thật)**, đăng xuất, đăng ký push.
- User: trang chủ, công việc (lọc), **khai báo Event** (wizard + camera + offline queue + tự đồng bộ), quét QR, thông báo.
- Manager: dashboard (bấm số liệu), quản lý sản phẩm (tìm/lọc/tiến độ), chi tiết (Flow đa-QR, phân công toàn Flow/theo Event, lịch, tiến độ), **Helper 4 wizard** (Truy xuất · Lịch · Nhãn điện tử · Nhãn phụ), **bản đồ hành trình có playback** (bản đồ thực OSM + sơ đồ, lọc lô/Flow).

## 8. Phụ thuộc hạ tầng (ngoài phạm vi app)
- Quên mật khẩu qua email: cần SMTP + endpoint `forgot-password`.
- Push đẩy thực: cần service gửi Expo Push ở backend (client đã đăng ký token).
- Duyệt/từ chối khai báo: backend hiện gộp submit = duyệt (chưa có quy trình duyệt riêng).
- Chọn vị trí trực tiếp trên bản đồ khi khai báo: hiện nhập địa điểm dạng chữ (đã chừa `gpsLat/gpsLng`).
