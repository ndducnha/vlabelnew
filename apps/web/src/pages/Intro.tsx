import { PageHead } from '../components/ui';
import { useAuth } from '../lib/auth';
import { QrCode, GitBranch, Tag, ShieldCheck, Users, Workflow } from 'lucide-react';

const ROLES = [
  ['Kê khai', 'Nhập dữ liệu cho các sự kiện theo quyền được phân.'],
  ['Quản lý', 'Cấu hình Flow/Event, người dùng và phân quyền trong tổ chức.'],
  ['Admin', 'Toàn quyền, cấu hình tổ chức từ cấp 2 trở xuống.'],
  ['Superadmin', 'Toàn quyền, cấu hình cả tổ chức cấp 1.'],
];
const STEPS = [
  'Thiết lập cây tổ chức và tài khoản người dùng.',
  'Tạo sản phẩm (GTIN hoặc tra cứu VNPC) và thiết kế Flow gồm các sự kiện.',
  'Phân quyền khai cho người dùng, cấp và gán mã QR cho từng lô.',
  'Người kê khai nhập dữ liệu, quản lý duyệt và khoá.',
  'Người tiêu dùng quét QR để xem hành trình đã xác thực.',
];

export default function Intro() {
  const { user } = useAuth();
  return (
    <div className="max-w-[860px]">
      <PageHead title="Giới thiệu" subtitle="Nền tảng truy xuất nguồn gốc Vlabel" />

      {/* Hero */}
      <div className="card p-6 mb-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg,var(--accent-soft),transparent 70%)' }}>
        <div className="flex items-center gap-3.5">
          <img src="/logo.jpg" alt="Vlabel" className="w-14 h-14 rounded-2xl border" style={{ borderColor: 'var(--border)' }} />
          <div>
            <b className="text-xl tracking-tight">Vlabel</b>
            <div className="text-sm text-[var(--muted)]">Xin chào {user?.fullName}</div>
          </div>
        </div>
        <p className="mt-4 text-[var(--ink-2)]" style={{ lineHeight: 1.65, maxWidth: 640 }}>
          Vlabel là nền tảng truy xuất nguồn gốc đa tenant, giúp doanh nghiệp và địa phương minh bạch hoá
          hành trình sản phẩm từ khâu sản xuất đến tay người tiêu dùng thông qua một mã QR duy nhất.
        </p>
      </div>

      {/* Mô hình */}
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        {[
          [QrCode, 'QR', 'Mỗi sản phẩm/lô có mã QR dẫn tới trang truy xuất và nhãn điện tử.'],
          [GitBranch, 'Flow & Event', 'Quy trình gồm nhiều sự kiện theo chuẩn GS1 EPCIS: Ai, Ở đâu, Khi nào, Thông tin, Media.'],
          [Tag, 'Nhãn điện tử', 'Nội dung nhãn theo Nghị định 37/2026, chọn nhóm hàng ra đúng trường bắt buộc.'],
          [ShieldCheck, 'Xác thực', 'Người tiêu dùng quét QR xem hành trình đã được xác thực, công khai.'],
        ].map(([Icon, title, desc]: any, i) => (
          <div key={i} className="card p-4 flex gap-3">
            <span className="iconbox"><Icon size={19} /></span>
            <div><b className="text-[14.5px]">{title}</b><p className="text-[13px] text-[var(--muted)] mt-0.5" style={{ lineHeight: 1.55 }}>{desc}</p></div>
          </div>
        ))}
      </div>

      {/* Vai trò */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-2 mb-3"><Users size={18} className="text-[var(--accent)]" /><b>Các vai trò</b></div>
        <div className="grid sm:grid-cols-2 gap-2.5">
          {ROLES.map(([r, d]) => (
            <div key={r} className="p-3 rounded-xl" style={{ background: 'var(--surface)' }}>
              <b className="text-[13.5px]">{r}</b><div className="text-[12.5px] text-[var(--muted)] mt-0.5">{d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quy trình */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3.5"><Workflow size={18} className="text-[var(--accent)]" /><b>Quy trình cơ bản</b></div>
        <div className="flex flex-col gap-3">
          {STEPS.map((s, i) => (
            <div key={i} className="flex gap-3 items-start">
              <span className="w-7 h-7 rounded-full grid place-items-center text-[13px] font-bold flex-none" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>{i + 1}</span>
              <p className="text-[14px] text-[var(--ink-2)] pt-0.5" style={{ lineHeight: 1.5 }}>{s}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
