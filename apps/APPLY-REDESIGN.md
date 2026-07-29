# Áp dụng redesign vào codebase Vlabel

Toàn bộ redesign được thực hiện **thuần ở lớp design** — chỉ đổi *giá trị* token, bo góc/đổ bóng của các class, và màu gradient. **Không đụng vào bất kỳ code tính năng nào** (không sửa logic, route, API, state, permission…).

## Copy đè 4 file này vào repo

| File redesign (trong gói này) | Đích trong repo |
|---|---|
| `apps/web/src/index.css` | `apps/web/src/index.css` |
| `apps/web/tailwind.config.js` | `apps/web/tailwind.config.js` |
| `apps/web/src/components/Layout.tsx` | `apps/web/src/components/Layout.tsx` |
| `apps/web/src/components/ui.tsx` | `apps/web/src/components/ui.tsx` |

Không cần đổi file nào khác — mọi trang (`Dashboard`, `Products`, `Entry`, `Flows`, `Tasks`, `Elabels`, `PublicTrace`…) đều dùng lại các token/class này nên tự động nhận giao diện mới.

## Có gì thay đổi

- **Bảng màu sáng & tươi hơn**: xanh thương hiệu `#2E5BE8` (đậm hơn, trong hơn), thêm biến `--accent-2:#4C7DFF` cho các gradient (avatar, thanh tiến trình) sáng bật.
- **Nền thoáng hơn**: `--surface:#F5F7FB`, viền `#E7EAF2` nhẹ nhàng.
- **Bo góc mềm hơn**: `.card` 16→18px, `.btn`/`.input` 10→12px.
- **Đổ bóng airy hơn**: shadow mềm, khuếch tán rộng, ít nặng.
- **Dark mode** cũng được chỉnh accent tương ứng cho đồng bộ.

## Kiểm tra nhanh sau khi copy

```bash
cd apps/web && npm run dev
```

Mọi thứ chạy như cũ, chỉ khác lớp sơn. Nếu muốn tinh chỉnh sắc độ, chỉ cần sửa các biến trong `:root` của `apps/web/src/index.css`.
