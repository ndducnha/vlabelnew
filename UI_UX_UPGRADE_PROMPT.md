# PROMPT: Cải thiện UI/UX toàn diện Vlabel (chỉ trình bày, giữ 100% chức năng)

> Dùng prompt này với skill UI/UX styling. Mục tiêu: nâng toàn bộ giao diện lên chuẩn SaaS cao cấp (Linear, Stripe, Notion, Figma, Shopify) mà không đụng tới nghiệp vụ, API, schema, workflow, phân quyền.

## 0. Nguyên tắc bất biến (không được vi phạm)
- Không xóa/đổi bất kỳ tính năng nào. Chỉ đổi lớp trình bày và trải nghiệm.
- Không sửa Prisma schema, không sửa API/backend, không đổi payload, không đổi business rule/phân quyền.
- Không đổi tên route, không đổi hành vi điều hướng, không đổi cấu trúc dữ liệu form (giữ nguyên field key, thứ tự submit).
- Mọi thay đổi phải qua `npm run -w @vlabel/web build` và `tsc --noEmit` sạch. Không để lỗi console.
- Không dùng dấu gạch ngang dài kiểu AI trong mọi text hiển thị.

## 1. Bối cảnh kỹ thuật
- Stack: React 18 + TypeScript + Vite + Tailwind, icon `lucide-react`, data `@tanstack/react-query`, router `react-router`.
- Design tokens và class dùng chung nằm ở `apps/web/src/index.css` (biến CSS `--accent, --bg, --surface, --card, --border, --ink, --muted, --good/--warn/--danger`, và các class `.btn .card .input .label .pill .chip .opt .btn-lg .anim-in .pop`). Có sẵn light + dark theme qua `:root` và `:root[data-theme="dark"]`.
- Component dùng chung: `apps/web/src/components/ui.tsx` (`PageHead, Spinner, EmptyState, Drawer`) và `components/Layout.tsx` (sidebar theo nhóm + bottom tabs mobile).
- Đã làm mẫu chuẩn để noi theo: màn Kê khai `pages/Entry.tsx` (wizard mobile, một màn một việc, thẻ `.opt`, CTA `.btn-lg`, animation `.anim-in/.pop`) và Workspace `pages/Workspace.tsx` (canvas hub React Flow).

## 2. Ngôn ngữ thiết kế (áp dụng nhất quán)
- Màu: giữ hệ token hiện có, tinh chỉnh cho dịu và cao cấp hơn. Accent xanh làm điểm nhấn duy nhất; màu semantic (good/warn/danger) tách khỏi accent. Neutral phải có sắc thái, tránh xám thuần vô hồn.
- Typography: một thang cỡ chữ rõ ràng (ví dụ 12/13/15/18/23/28), tiêu đề `font-extrabold tracking-tight text-wrap:balance`, thân chữ dễ đọc, nhãn uppercase có letter-spacing nhẹ.
- Khoảng trắng: hệ spacing 4px, ưu tiên thoáng. Không dồn field, không form dài lê thê.
- Bo góc mềm (10-18px), bóng mềm nhiều lớp, viền tối giản, focus ring rõ (accessibility).
- Motion: chuyển cảnh và micro-interaction nhẹ (150-300ms), tôn trọng `prefers-reduced-motion`. Có skeleton loading, empty state thân thiện, toast, success animation.
- Mobile-first: touch target tối thiểu 44-52px; desktop vẫn chuyên nghiệp nhưng các luồng nhập liệu giữ cột hẹp căn giữa như app.
- Light và dark đều phải đẹp và đủ tương phản (đừng chỉ đảo màu).

## 3. Chuẩn theo từng loại màn
- Danh sách/bảng: header dính, hàng thoáng, trạng thái bằng pill có màu, hành động gom gọn, phân trang/filter/search rõ; rỗng thì hiện EmptyState có minh họa và CTA. Trên mobile chuyển bảng thành danh sách thẻ.
- Form/Drawer: chia nhóm rõ, nhãn ngắn, gợi ý placeholder, lỗi thân thiện (nói cần gì và vì sao), nút chính nổi bật, tránh nhồi nhiều field một màn.
- Wizard (nhập liệu nhiều bước): theo mẫu `Entry.tsx` (một màn một việc, progressive disclosure, thanh tiến trình, CTA dính đáy, thẻ lựa chọn lớn, autosave/nhớ lựa chọn gần đây, copy previous, xem lại trước khi gửi, màn thành công).
- Canvas cấu hình (Flow/QR/E-Label/Workspace): giữ zoom/pan/drag/kết nối/property panel; nâng styling node, phân cấp thị giác, icon, màu theo loại, context menu, phím tắt, hint onboarding, property panel gọn. Cảm giác như Figma/Miro/Whimsical/XMind.
- Trang xem nhãn công khai `PublicTrace.tsx`: như trang sản phẩm cao cấp, 3 tab (Sản phẩm/Doanh nghiệp/Truy xuất), banner thu hồi rõ, hộ chiếu số, timeline đẹp, mobile-first tuyệt đối.

## 4. Danh sách màn cần nâng (giữ nguyên chức năng)
Ưu tiên theo thứ tự:
1. `components/Layout.tsx`: sidebar hiện đại (nhóm rõ, active state, user card, theme toggle), bottom tabs mobile mượt, header/topbar sạch.
2. `pages/Intro.tsx`: biến thành Dashboard thật (thẻ thống kê nhanh, nhiệm vụ đang chờ, kê khai gần đây, tỉ lệ hoàn thành, trạng thái nhãn, nháp, thông báo). Không tạo API mới nếu chưa có; dùng dữ liệu sẵn có (products, elabels, trace-tasks, event records) để tổng hợp phía client.
3. `pages/Products.tsx` + `ProductWizard.tsx`: bảng/thẻ sản phẩm gọn, drawer sửa chia nhóm, wizard tạo sản phẩm mượt.
4. `pages/Elabels.tsx`: soạn nhãn dễ như điền wizard, panel tuân thủ NĐ 37 rõ ràng, chọn nhóm hàng ra trường tương ứng, quản lý lô + QR đẹp.
5. `pages/Flows.tsx`: quản lý flow + drawer phân quyền (theo flow và theo từng sự kiện) trực quan.
6. `pages/TraceTasks.tsx`: lịch truy xuất dạng thẻ/nhiệm vụ rõ người phụ trách, sản phẩm cần, hạn, trạng thái, ghi chú.
7. `pages/Organizations.tsx`, `pages/Users.tsx`: cây tổ chức và danh sách người dùng sạch, thao tác lớn dễ bấm.
8. `pages/Login.tsx`: màn đăng nhập cao cấp, nút tài khoản demo rõ.
9. `pages/Workspace.tsx` + `workspace/*`: tinh chỉnh node/edge/property panel, thêm context menu và phím tắt.

## 5. Chuẩn hóa component library
Nâng và mở rộng `components/ui.tsx` + class trong `index.css` để tái dùng: Button (primary/ghost/danger/lg), Card, Input/Textarea/Select, SearchableSelect, DatePicker, Chips, SegmentedControl, BottomSheet (mobile) và Drawer (desktop), FAB, Toast, Skeleton, EmptyState, StatCard, ProgressBar, StepIndicator, Avatar, StatusPill, Tabs. Mọi màn dùng lại primitives này, không tự chế lệch chuẩn.

## 6. Thứ tự thực thi
1. Tokens và primitives trước (index.css + ui.tsx): đặt nền màu/typography/spacing/motion, chuẩn hóa Button/Input/Card/Pill/EmptyState/Skeleton.
2. Layout + Dashboard.
3. Lần lượt từng màn theo mục 4, mỗi màn: giữ nguyên logic/handler, chỉ thay JSX trình bày và class.
4. Đảm bảo responsive: desktop và mobile đều mượt; bảng lớn thành thẻ trên mobile; luồng nhập giữ cột hẹp căn giữa.

## 7. Tiêu chí nghiệm thu
- Không mất tính năng; mọi luồng (đăng nhập, tổ chức, người dùng, sản phẩm, flow/event, phân quyền, kê khai, lịch truy xuất, nhãn điện tử, trang công khai, workspace) hoạt động y như trước.
- `tsc --noEmit` và `vite build` sạch; không lỗi/cảnh báo runtime.
- Light và dark đều đạt tương phản tốt; bàn phím focus rõ; touch target đủ lớn.
- Cảm giác tổng thể: hiện đại, tối giản, nhiều khoảng trắng, nhất quán, dễ dùng cho người ít rành công nghệ, không cần đào tạo.

## 8. Không làm
- Không thêm/sửa endpoint, không đổi tên field gửi lên, không đổi schema.
- Không đưa thư viện UI nặng thay Tailwind (giữ Tailwind + biến CSS + lucide). Nếu cần thư viện, phải nhẹ, tree-shakeable, và nêu lý do.
- Không phá vỡ `@vlabel/shared` (dùng chung web + api).

## 9. Kết quả bàn giao
- Code đã build sạch, kèm ghi chú ngắn cho từng màn đã nâng và ảnh trước/sau nếu có.
- Nếu phạm vi lớn, chia nhiều đợt theo mục 6, mỗi đợt tự chạy được và verify được, báo rõ đợt này làm gì, đợt sau làm gì.
