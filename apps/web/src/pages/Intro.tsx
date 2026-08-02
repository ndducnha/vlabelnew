import type { ComponentType } from 'react';
import { PageHead } from '../components/ui';
import { useAuth } from '../lib/auth';
import { useT, type Messages } from '../lib/i18n';
import { QrCode, GitBranch, Tag, ShieldCheck, Users, Workflow } from '../lib/icons';

type IconComponent = ComponentType<{ size?: number }>;

const ROLES = [
  ['role.keKhai.name', 'role.keKhai.desc'],
  ['role.quanLy.name', 'role.quanLy.desc'],
  ['role.admin.name', 'role.admin.desc'],
  ['role.superadmin.name', 'role.superadmin.desc'],
];
const STEPS = ['step.1', 'step.2', 'step.3', 'step.4', 'step.5'];

const MSG: Messages = {
  vi: {
    title: 'Giới thiệu', subtitle: 'Nền tảng truy xuất nguồn gốc Vlabel', hello: 'Xin chào {name}',
    intro: 'Vlabel là nền tảng truy xuất nguồn gốc đa tenant, giúp doanh nghiệp và địa phương minh bạch hoá hành trình sản phẩm từ khâu sản xuất đến tay người tiêu dùng thông qua một mã QR duy nhất.',
    roles: 'Các vai trò', process: 'Quy trình cơ bản',
    'model.qr.title': 'QR', 'model.qr.desc': 'Mỗi sản phẩm/lô có mã QR dẫn tới trang truy xuất và nhãn điện tử.',
    'model.flow.title': 'Luồng & Sự kiện', 'model.flow.desc': 'Quy trình gồm nhiều sự kiện theo chuẩn GS1 EPCIS: Ai, Ở đâu, Khi nào, Thông tin, Media.',
    'model.elabel.title': 'Nhãn điện tử', 'model.elabel.desc': 'Nội dung nhãn theo Nghị định 37/2026, chọn nhóm hàng ra đúng trường bắt buộc.',
    'model.verify.title': 'Xác thực', 'model.verify.desc': 'Người tiêu dùng quét QR xem hành trình đã được xác thực, công khai.',
    'role.keKhai.name': 'Kê khai', 'role.keKhai.desc': 'Nhập dữ liệu cho các sự kiện theo quyền được phân.',
    'role.quanLy.name': 'Quản lý', 'role.quanLy.desc': 'Cấu hình Luồng/Sự kiện, người dùng và phân quyền trong tổ chức.',
    'role.admin.name': 'Admin', 'role.admin.desc': 'Toàn quyền, cấu hình tổ chức từ cấp 2 trở xuống.',
    'role.superadmin.name': 'Superadmin', 'role.superadmin.desc': 'Toàn quyền, cấu hình cả tổ chức cấp 1.',
    'step.1': 'Thiết lập cây tổ chức và tài khoản người dùng.',
    'step.2': 'Tạo sản phẩm (GTIN hoặc tra cứu VNPC) và thiết kế Luồng gồm các sự kiện.',
    'step.3': 'Phân quyền khai cho người dùng, cấp và gán mã QR cho từng lô.',
    'step.4': 'Người kê khai nhập dữ liệu, quản lý duyệt và khoá.',
    'step.5': 'Người tiêu dùng quét QR để xem hành trình đã xác thực.',
  },
  en: {
    title: 'Introduction', subtitle: 'Vlabel traceability platform', hello: 'Hello {name}',
    intro: 'Vlabel is a multi-tenant traceability platform that helps businesses and localities make product journeys transparent, from production to the consumer, through a single QR code.',
    roles: 'Roles', process: 'Basic process',
    'model.qr.title': 'QR', 'model.qr.desc': 'Each product/lot has a QR code linking to its traceability page and e-label.',
    'model.flow.title': 'Flow & Event', 'model.flow.desc': 'A process of multiple events following the GS1 EPCIS standard: Who, Where, When, Information, Media.',
    'model.elabel.title': 'E-label', 'model.elabel.desc': 'Label content per Decree 37/2026; selecting a product group reveals the required fields.',
    'model.verify.title': 'Verification', 'model.verify.desc': 'Consumers scan the QR to view the verified, public journey.',
    'role.keKhai.name': 'Data entry', 'role.keKhai.desc': 'Enter data for events based on assigned permissions.',
    'role.quanLy.name': 'Manager', 'role.quanLy.desc': 'Configure Flows/Events, users and permissions within the organization.',
    'role.admin.name': 'Admin', 'role.admin.desc': 'Full permissions, configure organizations from level 2 downward.',
    'role.superadmin.name': 'Superadmin', 'role.superadmin.desc': 'Full permissions, configure even level 1 organizations.',
    'step.1': 'Set up the organization tree and user accounts.',
    'step.2': 'Create products (GTIN or VNPC lookup) and design a Flow of events.',
    'step.3': 'Assign data-entry permissions to users, issue and assign QR codes to each lot.',
    'step.4': 'Data-entry staff enter data; managers approve and lock.',
    'step.5': 'Consumers scan the QR to view the verified journey.',
  },
};

export default function Intro() {
  const { user } = useAuth();
  const t = useT(MSG);
  return (
    <div className="max-w-[860px]">
      <PageHead eyebrow="Vlabel" title={t('title')} subtitle={t('subtitle')} />

      {/* Hero */}
      <div className="card p-6 mb-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg,var(--accent-soft),transparent 70%)' }}>
        <div className="flex items-center gap-3.5">
          <img src="/logo.jpg" alt="Vlabel" className="w-14 h-14 rounded-2xl border" style={{ borderColor: 'var(--border)' }} />
          <div>
            <b className="serif text-2xl tracking-tight">Vlabel</b>
            <div className="text-sm text-[var(--muted)]">{t('hello', { name: user?.fullName ?? '' })}</div>
          </div>
        </div>
        <p className="mt-4 text-[var(--ink-2)]" style={{ lineHeight: 1.65, maxWidth: 640 }}>
          {t('intro')}
        </p>
      </div>

      {/* Mô hình */}
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        {([
          [QrCode, t('model.qr.title'), t('model.qr.desc')],
          [GitBranch, t('model.flow.title'), t('model.flow.desc')],
          [Tag, t('model.elabel.title'), t('model.elabel.desc')],
          [ShieldCheck, t('model.verify.title'), t('model.verify.desc')],
        ] as [IconComponent, string, string][]).map(([Icon, title, desc], i) => (
          <div key={i} className="card p-4 flex gap-3">
            <span className="iconbox"><Icon size={19} /></span>
            <div><b className="text-[14.5px]">{title}</b><p className="text-[13px] text-[var(--muted)] mt-0.5" style={{ lineHeight: 1.55 }}>{desc}</p></div>
          </div>
        ))}
      </div>

      {/* Vai trò */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-2 mb-3"><Users size={18} className="text-[var(--accent)]" /><b>{t('roles')}</b></div>
        <div className="grid sm:grid-cols-2 gap-2.5">
          {ROLES.map(([r, d]) => (
            <div key={r} className="p-3 rounded-xl" style={{ background: 'var(--surface)' }}>
              <b className="text-[13.5px]">{t(r)}</b><div className="text-[12.5px] text-[var(--muted)] mt-0.5">{t(d)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quy trình */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3.5"><Workflow size={18} className="text-[var(--accent)]" /><b>{t('process')}</b></div>
        <div className="flex flex-col gap-3">
          {STEPS.map((s, i) => (
            <div key={i} className="flex gap-3 items-start">
              <span className="w-7 h-7 rounded-full grid place-items-center text-[13px] font-bold flex-none" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>{i + 1}</span>
              <p className="text-[14px] text-[var(--ink-2)] pt-0.5" style={{ lineHeight: 1.5 }}>{t(s)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
