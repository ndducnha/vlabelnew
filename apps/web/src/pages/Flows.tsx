import { useState, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GitBranch, ArrowRight, ArrowUp, ArrowDown, Plus, Trash2, Eye, EyeOff, Rocket, User, MapPin, Clock, FileText, Image, Search, Copy, Pencil, Check, Building2, Layers } from '../lib/icons';
import { api, apiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { useApiMutation } from '../lib/useApiMutation';
import { PageHead, Spinner, Drawer, EmptyState, SegmentedControl } from '../components/ui';
import { useT, type Messages } from '../lib/i18n';
import { PERMISSIONS, FIELD_TYPES, ROLE_LABELS, ASSIGNABLE_ROLES } from '@vlabel/shared';
import type { Organization } from '@vlabel/shared';

// 5 yếu tố chuẩn GS1 EPCIS. How = media.
const EPCIS = [
  { key: 'who', label: 'Ai', en: 'Who', icon: User },
  { key: 'where', label: 'Ở đâu', en: 'Where', icon: MapPin },
  { key: 'when', label: 'Thời gian', en: 'When', icon: Clock },
  { key: 'what', label: 'Thông tin', en: 'What', icon: FileText },
  { key: 'how', label: 'Hình ảnh', en: 'How', icon: Image },
];

const MSG: Messages = {
  vi: {
    eyebrow: 'Thiết kế quy trình', title: 'Luồng & Sự kiện', subtitle: 'Thiết kế quy trình truy xuất · nhấp sự kiện để cấu hình',
    createTitle: 'Tạo Luồng mới', createHint: 'Gán tổ chức cho Luồng ở nút Sửa (có thể chọn nhiều tổ chức / bộ phận).',
    flowName: 'Tên Luồng', flowNamePh: 'Chuỗi rau sạch', code: 'Mã', codePh: 'CHUOI-RAU', createBtn: 'Tạo Luồng',
    searchPh: 'Tìm Luồng theo tên / mã…', allOrgs: 'Tất cả tổ chức',
    emptyTitle: 'Không có Luồng', emptyHintFilter: 'Thử bỏ bộ lọc.', emptyHintCreate: 'Tạo Luồng đầu tiên ở trên.',
    thIndex: 'Mục', thFlow: 'Luồng', thUnit: 'Đơn vị', thEvents: 'Sự kiện', thStatus: 'Trạng thái', thActions: 'Thao tác',
    published: 'Đã xuất bản', draft: 'Nháp',
    edit: 'Sửa', clone: 'Nhân bản', publish: 'Xuất bản', deleteFlowTitle: 'Xoá Luồng',
    warnOrg: 'đang thuộc {n} tổ chức', warnProd: 'đang gán cho {n} sản phẩm (xoá sẽ gỡ khỏi các sản phẩm đó)', and: 'và',
    confirmDelWarn: 'Luồng "{name}" {warns}. Vẫn xoá?', confirmDel: 'Xoá Luồng "{name}"?',
    eventWord: 'Sự kiện', hidden: 'Ẩn', notPublic: 'Không công khai', public: 'Công khai',
    epcis5gs1: '5 yếu tố GS1 EPCIS', fieldsUnit: 'trường', orgWide: 'Toàn Tổ Chức', eventsUnit: 'sự kiện',
    prev: '← Trước', next: 'Sau →', pageInfo: 'Trang {page} / {pages} · {total} luồng',
    cfgEvent: 'Cấu hình sự kiện', delEvent: 'Xoá sự kiện', close: 'Đóng', eventName: 'Tên sự kiện', stepInfo: 'Bước {i}/{n} trong quy trình',
    tabFields: 'Trường', tabPerm: 'Quyền nhập', tabPublic: 'Công khai',
    epcisAlways: '5 yếu tố chuẩn GS1 EPCIS · luôn thu thập', customFields: 'Trường thông tin tự cấu hình', required: 'bắt buộc', noFields: 'Chưa có trường.',
    keyLabel: 'Key', labelLabel: 'Nhãn', typeLabel: 'Loại', addBtn: 'Thêm',
    permHint: 'Vai trò nào được nhập sự kiện này? Quyền theo từng người được gán khi gán Luồng vào sản phẩm hoặc khi tạo lịch truy xuất.',
    showWholeEvent: 'Hiển thị cả sự kiện', stdElements: 'Yếu tố chuẩn (EPCIS)', customInfo: 'Thông tin tự cấu hình', noCustomFields: 'Chưa có trường tự cấu hình.',
    hiddenFromPublic: '🔒 Sự kiện này bị ẩn khỏi trang công khai', verified: '✓ Đã xác thực', mediaShown: '🖼 Media hiển thị', hiddenFieldsCount: '🔒 {n} trường ẩn',
    editFlowTitle: 'Sửa Luồng', cancel: 'Huỷ', save: 'Lưu', belongOrg: 'Thuộc tổ chức / bộ phận (chọn nhiều)', level: 'Cấp {n}',
    noOrgSelected: 'Không chọn tổ chức nào = Toàn Tổ Chức', selectedOrgs: 'Đã chọn {n} tổ chức / bộ phận', addEvent: 'Thêm sự kiện',
    toastReorder: 'Đã đổi thứ tự sự kiện', toastCreated: 'Đã tạo Luồng', toastCloned: 'Đã nhân bản Luồng', toastSaved: 'Đã lưu Luồng',
    toastDeleted: 'Đã xoá Luồng', toastDeletedProd: 'Đã xoá Luồng · đã gỡ khỏi {n} sản phẩm', toastPublished: '🎉 Đã xuất bản',
    toastEventAdded: 'Đã thêm sự kiện', toastEventDeleted: 'Đã xoá sự kiện', toastFieldAdded: 'Đã thêm trường',
    'epcis.who': 'Ai', 'epcis.where': 'Ở đâu', 'epcis.when': 'Thời gian', 'epcis.what': 'Thông tin', 'epcis.how': 'Hình ảnh', 'epcis.media': 'Hình ảnh',
  },
  en: {
    eyebrow: 'Process design', title: 'Flows & Events', subtitle: 'Design the traceability process · click an event to configure',
    createTitle: 'Create a new Flow', createHint: 'Assign organizations to the Flow via the Edit button (you can select multiple organizations / units).',
    flowName: 'Flow name', flowNamePh: 'Clean vegetable chain', code: 'Code', codePh: 'CHUOI-RAU', createBtn: 'Create Flow',
    searchPh: 'Search Flow by name / code…', allOrgs: 'All organizations',
    emptyTitle: 'No Flows', emptyHintFilter: 'Try clearing the filters.', emptyHintCreate: 'Create your first Flow above.',
    thIndex: 'Item', thFlow: 'Flow', thUnit: 'Unit', thEvents: 'Events', thStatus: 'Status', thActions: 'Actions',
    published: 'Published', draft: 'Draft',
    edit: 'Edit', clone: 'Clone', publish: 'Publish', deleteFlowTitle: 'Delete Flow',
    warnOrg: 'belongs to {n} organizations', warnProd: 'is assigned to {n} products (deleting will remove it from those products)', and: 'and',
    confirmDelWarn: 'Flow "{name}" {warns}. Delete anyway?', confirmDel: 'Delete Flow "{name}"?',
    eventWord: 'Event', hidden: 'Hidden', notPublic: 'Not public', public: 'Public',
    epcis5gs1: '5 GS1 EPCIS elements', fieldsUnit: 'fields', orgWide: 'Org-wide', eventsUnit: 'events',
    prev: '← Prev', next: 'Next →', pageInfo: 'Page {page} / {pages} · {total} flows',
    cfgEvent: 'Event configuration', delEvent: 'Delete event', close: 'Close', eventName: 'Event name', stepInfo: 'Step {i}/{n} in the process',
    tabFields: 'Fields', tabPerm: 'Entry rights', tabPublic: 'Public',
    epcisAlways: '5 standard GS1 EPCIS elements · always collected', customFields: 'Custom information fields', required: 'required', noFields: 'No fields yet.',
    keyLabel: 'Key', labelLabel: 'Label', typeLabel: 'Type', addBtn: 'Add',
    permHint: 'Which roles can enter this event? Per-person rights are granted when assigning the Flow to a product or when creating a trace schedule.',
    showWholeEvent: 'Show the whole event', stdElements: 'Standard elements (EPCIS)', customInfo: 'Custom information', noCustomFields: 'No custom fields yet.',
    hiddenFromPublic: '🔒 This event is hidden from the public page', verified: '✓ Verified', mediaShown: '🖼 Media shown', hiddenFieldsCount: '🔒 {n} hidden fields',
    editFlowTitle: 'Edit Flow', cancel: 'Cancel', save: 'Save', belongOrg: 'Belongs to organization / unit (multiple)', level: 'Level {n}',
    noOrgSelected: 'No organization selected = Org-wide', selectedOrgs: 'Selected {n} organizations / units', addEvent: 'Add event',
    toastReorder: 'Event order changed', toastCreated: 'Flow created', toastCloned: 'Flow cloned', toastSaved: 'Flow saved',
    toastDeleted: 'Flow deleted', toastDeletedProd: 'Flow deleted · removed from {n} products', toastPublished: '🎉 Published',
    toastEventAdded: 'Event added', toastEventDeleted: 'Event deleted', toastFieldAdded: 'Field added',
    'epcis.who': 'Who', 'epcis.where': 'Where', 'epcis.when': 'When', 'epcis.what': 'What', 'epcis.how': 'Media', 'epcis.media': 'Media',
  },
};
function Toggle({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button disabled={disabled} onClick={onClick} className="w-11 h-6 rounded-full relative flex-none transition-colors disabled:opacity-60"
      style={{ background: on ? 'var(--accent)' : 'var(--border-strong)' }}>
      <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all" style={{ left: on ? '22px' : '2px' }} />
    </button>
  );
}

export default function Flows() {
  const { can } = useAuth();
  const toast = useToast();
  const t = useT(MSG);
  const qc = useQueryClient();
  const canManage = can(PERMISSIONS.FLOW_MANAGE);
  const invalidate = () => qc.invalidateQueries({ queryKey: ['flows'] });

  const [page, setPage] = useState(1);
  const [orgFilter, setOrgFilter] = useState('');
  const [flowQ, setFlowQ] = useState('');
  const flows = useQuery({
    queryKey: ['flows', 'manage', page, orgFilter, flowQ],
    queryFn: () => api.get('/flows', { params: { page, pageSize: 8, q: flowQ || undefined, organizationId: orgFilter || undefined } }).then((r) => r.data),
  });
  const orgs = useQuery<Organization[]>({ queryKey: ['orgs'], queryFn: () => api.get('/organizations').then((r) => r.data) });
  const [sel, setSel] = useState<any | null>(null);
  const [tab, setTab] = useState<'fields' | 'perm' | 'public'>('fields');
  const [newFlow, setNewFlow] = useState({ name: '', code: '' });
  const [editFlow, setEditFlow] = useState<any | null>(null);
  const [selCtx, setSelCtx] = useState<any | null>(null);

  const moveEvent = async (dir: number) => {
    const evs: any[] = selCtx?.events ?? [];
    const i = evs.findIndex((e) => e.id === sel?.id); const j = i + dir;
    if (i < 0 || j < 0 || j >= evs.length) return;
    const a = sel, b = evs[j];
    try {
      await Promise.all([api.patch(`/event-definitions/${a.id}`, { order: b.order }), api.patch(`/event-definitions/${b.id}`, { order: a.order })]);
      toast(t('toastReorder')); invalidate();
      const ne = [...evs]; ne[i] = { ...a, order: b.order }; ne[j] = { ...b, order: a.order }; ne.sort((x, y) => x.order - y.order);
      setSel({ ...a, order: b.order }); setSelCtx({ events: ne });
    } catch (e) { toast(apiError(e), false); }
  };

  const mCreate = useApiMutation(() => api.post('/flows', newFlow), { successMessage: t('toastCreated'), invalidate: [['flows']], onSuccess: () => setNewFlow({ name: '', code: '' }) });
  const mClone = useApiMutation((id: string) => api.post(`/flows/${id}/clone`), { successMessage: t('toastCloned'), invalidate: [['flows']] });
  const mUpdateFlow = useApiMutation(({ id, body }: any) => api.patch(`/flows/${id}`, body), { successMessage: t('toastSaved'), invalidate: [['flows']], onSuccess: () => setEditFlow(null) });
  const mDelete = useApiMutation((id: string) => api.delete(`/flows/${id}`).then((r) => r.data), { successMessage: (d: any) => (d?.productCount ? t('toastDeletedProd', { n: d.productCount }) : t('toastDeleted')), invalidate: [['flows'], ['products']] });
  const mPublish = useMutation({ mutationFn: (id: string) => api.post(`/flows/${id}/publish`), onSuccess: () => { toast(t('toastPublished')); invalidate(); } });
  const mAddEvent = useApiMutation(({ versionId, name, code }: any) => api.post(`/flow-versions/${versionId}/events`, { name, code, enterRoleKeys: ['DATA_ENTRY', 'MANAGER'], approveRoleKeys: ['MANAGER', 'ADMIN', 'SUPERADMIN'] }), { successMessage: t('toastEventAdded'), invalidate: [['flows']] });
  const mDelEvent = useMutation({ mutationFn: (id: string) => api.delete(`/event-definitions/${id}`), onSuccess: () => { toast(t('toastEventDeleted')); setSel(null); invalidate(); } });
  const mUpdEvent = useMutation({ mutationFn: ({ id, body }: any) => api.patch(`/event-definitions/${id}`, body), onSuccess: (r) => { setSel(r.data); invalidate(); } });
  const mAddField = useApiMutation(({ id, body }: any) => api.post(`/event-definitions/${id}/fields`, body), { successMessage: t('toastFieldAdded'), invalidate: [['flows']], onSuccess: () => refreshSel() });
  const mUpdField = useMutation({ mutationFn: ({ id, body }: any) => api.patch(`/event-fields/${id}`, body), onSuccess: () => { refreshSel(); invalidate(); } });
  const mDelField = useMutation({ mutationFn: (id: string) => api.delete(`/event-fields/${id}`), onSuccess: () => { refreshSel(); invalidate(); } });

  const refreshSel = async () => {
    if (!sel) return;
    const flow = await api.get('/flows').then((r) => r.data);
    for (const f of flow) for (const v of f.versions) { const ev = v.eventDefinitions.find((e: any) => e.id === sel.id); if (ev) { setSel(ev); return; } }
  };

  const [nf, setNf] = useState({ key: '', label: '', type: 'text' });

  // Nút hành động dùng chung cho cả bảng sổ cái (desktop) và card (mobile) — handler y nguyên.
  const flowActions = (flow: any, version: any, orgNames: string[]) => canManage ? (
    <div className="flex items-center gap-1.5 flex-wrap">
      <button className="btn btn-sm" onClick={() => setEditFlow({ id: flow.id, name: flow.name, code: flow.code, organizationIds: (flow.orgLinks ?? []).map((l: any) => l.organizationId) })}><Pencil size={14} />{t('edit')}</button>
      <button className="btn btn-sm" onClick={() => mClone.mutate(flow.id)}><Copy size={14} />{t('clone')}</button>
      {!version?.isPublished && <button className="btn btn-sm btn-primary" onClick={() => mPublish.mutate(flow.id)}><Rocket size={14} />{t('publish')}</button>}
      <button className="btn btn-sm btn-danger" title={t('deleteFlowTitle')} onClick={() => {
        const nOrg = orgNames.length; const nProd = flow._count?.products ?? 0;
        const warns: string[] = [];
        if (nOrg > 1) warns.push(t('warnOrg', { n: nOrg }));
        if (nProd > 0) warns.push(t('warnProd', { n: nProd }));
        const msg = warns.length ? t('confirmDelWarn', { name: flow.name, warns: warns.join(` ${t('and')} `) }) : t('confirmDel', { name: flow.name });
        if (window.confirm(msg)) mDelete.mutate(flow.id);
      }}><Trash2 size={14} /></button>
    </div>
  ) : null;

  // Dải công đoạn (nhấp event để mở Drawer cấu hình) — dùng chung, onClick y nguyên.
  const eventStrip = (version: any, events: any[]) => (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1">
      {events.map((ev: any, i: number) => (
        <div key={ev.id} className="flex items-center gap-2 flex-none">
          <button onClick={() => { setSel(ev); setSelCtx({ events }); setTab('fields'); }} className="w-[184px] p-3.5 rounded-xl text-left transition-colors hover:border-[var(--accent)]" style={{ border: '1.5px solid var(--border)', background: 'var(--surface)' }}>
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--faint)]">{t('eventWord')} {ev.order}</div>
              {ev.publicConfig?.event === false
                ? <span className="inline-flex items-center gap-0.5 text-[9.5px] font-semibold text-[var(--warn)]" title={t('notPublic')}><EyeOff size={11} />{t('hidden')}</span>
                : <span className="inline-flex items-center gap-0.5 text-[9.5px] font-semibold text-[var(--good)]" title={t('public')}><Eye size={11} /></span>}
            </div>
            <b className="text-sm block truncate">{ev.name}</b>
            <div className="text-[11.5px] text-[var(--muted)] mt-1">{t('epcis5gs1')}{(ev.fields?.length ?? 0) > 0 ? ` · +${ev.fields.length} ${t('fieldsUnit')}` : ''}</div>
          </button>
          {i < events.length - 1 && <ArrowRight size={16} className="text-[var(--faint)] flex-none" />}
        </div>
      ))}
      {canManage && (
        <AddEvent onAdd={(name, code) => mAddEvent.mutate({ versionId: version.id, name, code })} />
      )}
    </div>
  );

  // Chip đơn vị (orgNames) dùng chung.
  const orgCell = (orgNames: string[]) => orgNames.length
    ? <span className="chip" style={{ fontSize: 11 }}><Building2 size={11} />{`${orgNames.slice(0, 2).join(', ')}${orgNames.length > 2 ? ` +${orgNames.length - 2}` : ''}`}</span>
    : <span className="chip" style={{ fontSize: 11 }}><Building2 size={11} />{t('orgWide')}</span>;

  return (
    <>
      <PageHead eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />

      {canManage && (
        <div className="card p-5 mb-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="iconbox"><Plus size={18} /></span>
            <div>
              <b className="text-[15px]">{t('createTitle')}</b>
              <div className="text-xs text-[var(--muted)]">{t('createHint')}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <label className="block flex-1 min-w-[180px]"><span className="label">{t('flowName')}</span><input className="input" value={newFlow.name} onChange={(e) => setNewFlow({ ...newFlow, name: e.target.value })} placeholder={t('flowNamePh')} /></label>
            <label className="block flex-1 min-w-[160px]"><span className="label">{t('code')}</span><input className="input mono" value={newFlow.code} onChange={(e) => setNewFlow({ ...newFlow, code: e.target.value })} placeholder={t('codePh')} /></label>
            <button className="btn btn-primary" disabled={!newFlow.name || !newFlow.code || mCreate.isPending} onClick={() => mCreate.mutate()}><Plus size={16} />{t('createBtn')}</button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2.5 mb-5 items-center">
        <div className="flex items-center gap-2 rounded-full px-4 h-11 flex-1 min-w-[220px]" style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
          <Search size={16} className="text-[var(--muted)]" />
          <input className="flex-1 bg-transparent outline-none text-sm" placeholder={t('searchPh')} value={flowQ} onChange={(e) => { setFlowQ(e.target.value); setPage(1); }} />
        </div>
        <select className="input h-11" style={{ maxWidth: 220, width: 'auto' }} value={orgFilter} onChange={(e) => { setOrgFilter(e.target.value); setPage(1); }}>
          <option value="">{t('allOrgs')}</option>
          {(orgs.data ?? []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>

      {flows.isLoading ? <Spinner /> : (flows.data?.items?.length ?? 0) === 0 ? (
        <div className="card"><EmptyState title={t('emptyTitle')} hint={flowQ || orgFilter ? t('emptyHintFilter') : t('emptyHintCreate')} /></div>
      ) : (
        <>
        {/* Sổ cái cho desktop */}
        <div className="hidden lg:block anim-in overflow-x-auto">
          <table className="ledger text-sm">
            <thead><tr>
              <th style={{ width: 52 }}>{t('thIndex')}</th>
              <th>{t('thFlow')}</th>
              <th>{t('thUnit')}</th>
              <th>{t('thEvents')}</th>
              <th>{t('thStatus')}</th>
              {canManage && <th>{t('thActions')}</th>}
            </tr></thead>
            <tbody>
              {(flows.data.items ?? []).map((flow: any, i: number) => {
                const version = flow.versions?.[0];
                const events = version?.eventDefinitions ?? [];
                const orgNames = (flow.orgLinks ?? []).map((l: any) => l.organization?.name).filter(Boolean);
                const index = (flows.data.page - 1) * flows.data.pageSize + i + 1;
                const colSpan = canManage ? 6 : 5;
                return (
                  <Fragment key={flow.id}>
                    <tr>
                      <td><span className="ledger-idx">{String(index).padStart(2, '0')}</span></td>
                      <td>
                        <div className="flex items-center gap-3">
                          <span className="w-9 h-9 rounded-xl grid place-items-center flex-none" style={{ color: 'var(--accent-contrast)', background: 'var(--accent)' }}><GitBranch size={16} /></span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap"><b className="truncate">{flow.name}</b><span className="chip" style={{ fontSize: 11 }}>v{version?.version}</span></div>
                            <div className="mono text-xs text-[var(--muted)]">{flow.code}</div>
                          </div>
                        </div>
                      </td>
                      <td>{orgCell(orgNames)}</td>
                      <td><span className="num text-[15px]">{events.length}</span></td>
                      <td><span className={`pill ${version?.isPublished ? 'pill-good' : 'pill-warn'}`}><i />{version?.isPublished ? t('published') : t('draft')}</span></td>
                      {canManage && <td>{flowActions(flow, version, orgNames)}</td>}
                    </tr>
                    <tr>
                      <td />
                      <td colSpan={colSpan - 1} style={{ paddingTop: 0 }}>{eventStrip(version, events)}</td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Card cho mobile */}
        <div className="flex flex-col gap-4 lg:hidden">
          {(flows.data.items ?? []).map((flow: any) => {
            const version = flow.versions?.[0];
            const events = version?.eventDefinitions ?? [];
            const orgNames = (flow.orgLinks ?? []).map((l: any) => l.organization?.name).filter(Boolean);
            return (
              <div key={flow.id} className="card card-hover p-5 anim-in">
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <span className="w-10 h-10 rounded-xl grid place-items-center flex-none" style={{ color: 'var(--accent-contrast)', background: 'var(--accent)' }}><GitBranch size={18} /></span>
                  <div className="flex-1 min-w-[160px]">
                    <b className="text-[15px]">{flow.name}</b>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                      <span className="chip" style={{ fontSize: 11 }}>v{version?.version}</span>
                      <span className="chip" style={{ fontSize: 11 }}><Layers size={11} />{events.length} {t('eventsUnit')}</span>
                      <span className={`pill ${version?.isPublished ? 'pill-good' : 'pill-warn'}`} style={{ fontSize: 11 }}><i />{version?.isPublished ? t('published') : t('draft')}</span>
                      {orgCell(orgNames)}
                    </div>
                  </div>
                  {flowActions(flow, version, orgNames)}
                </div>
                {eventStrip(version, events)}
              </div>
            );
          })}
        </div>
        {flows.data.total > flows.data.pageSize && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button className="btn btn-sm" disabled={flows.data.page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>{t('prev')}</button>
            <span className="text-sm text-[var(--muted)]">{t('pageInfo', { page: flows.data.page, pages: Math.ceil(flows.data.total / flows.data.pageSize), total: flows.data.total })}</span>
            <button className="btn btn-sm" disabled={flows.data.page >= Math.ceil(flows.data.total / flows.data.pageSize)} onClick={() => setPage((p) => p + 1)}>{t('next')}</button>
          </div>
        )}
        </>
      )}

      {/* Event editor drawer */}
      <Drawer open={!!sel} onClose={() => { setSel(null); setSelCtx(null); }}
        title={sel && <><b>{sel.name}</b><div className="text-xs text-[var(--muted)]">{t('cfgEvent')}</div></>}
        footer={canManage && sel ? <><button className="btn btn-danger" onClick={() => mDelEvent.mutate(sel.id)}><Trash2 size={15} />{t('delEvent')}</button><div className="flex-1" /><button className="btn" onClick={() => { setSel(null); setSelCtx(null); }}>{t('close')}</button></> : undefined}>
        {sel && (
          <>
            {canManage && (
              <label className="block mb-3"><span className="label">{t('eventName')}</span>
                <input className="input" defaultValue={sel.name} key={sel.id}
                  onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== sel.name) mUpdEvent.mutate({ id: sel.id, body: { name: v } }); }} />
              </label>
            )}
            {canManage && selCtx && (() => {
              const i = (selCtx.events ?? []).findIndex((e: any) => e.id === sel.id);
              return (
                <div className="flex items-center gap-1.5 mb-4">
                  <button className="btn btn-sm" disabled={i <= 0} onClick={() => moveEvent(-1)}><ArrowUp size={14} /></button>
                  <button className="btn btn-sm" disabled={i < 0 || i >= selCtx.events.length - 1} onClick={() => moveEvent(1)}><ArrowDown size={14} /></button>
                  <span className="text-xs text-[var(--muted)]">{t('stepInfo', { i: i + 1, n: selCtx.events.length })}</span>
                </div>
              );
            })()}
            <div className="mb-4">
              <SegmentedControl value={tab} onChange={(v) => setTab(v)} options={[
                { value: 'fields', label: t('tabFields') },
                { value: 'perm', label: t('tabPerm') },
                { value: 'public', label: t('tabPublic') },
              ]} />
            </div>

            {tab === 'fields' && (
              <div className="flex flex-col gap-3">
                <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--faint)]">{t('epcisAlways')}</div>
                <div className="grid grid-cols-5 gap-1.5">
                  {EPCIS.map((e) => (
                    <div key={e.key} className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <e.icon size={16} className="text-[var(--accent)]" />
                      <span className="text-[10.5px] font-semibold leading-tight">{t('epcis.' + e.key)}</span>
                    </div>
                  ))}
                </div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--faint)] mt-1">{t('customFields')}</div>
                {(sel.fields ?? []).map((f: any) => (
                  <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ border: '1px solid var(--border)', background: 'var(--card)' }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap"><b className="text-[13.5px]">{f.label}</b><span className="mono text-xs text-[var(--muted)]">{f.key}</span></div>
                      <div className="text-[11.5px] text-[var(--muted)] mt-0.5">{f.type}{f.required ? ` · ${t('required')}` : ''}</div>
                    </div>
                    {canManage && <button className="btn btn-sm btn-danger" onClick={() => mDelField.mutate(f.id)}><Trash2 size={13} /></button>}
                  </div>
                ))}
                {(sel.fields ?? []).length === 0 && <p className="text-sm text-[var(--muted)]">{t('noFields')}</p>}
                {canManage && (
                  <div className="flex flex-wrap gap-2.5 items-end p-3.5 rounded-xl mt-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <label className="block"><span className="label">{t('keyLabel')}</span><input className="input mono w-24" value={nf.key} onChange={(e) => setNf({ ...nf, key: e.target.value })} /></label>
                    <label className="block"><span className="label">{t('labelLabel')}</span><input className="input w-28" value={nf.label} onChange={(e) => setNf({ ...nf, label: e.target.value })} /></label>
                    <label className="block"><span className="label">{t('typeLabel')}</span><select className="input" value={nf.type} onChange={(e) => setNf({ ...nf, type: e.target.value })}>{FIELD_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
                    <button className="btn btn-primary" disabled={!nf.key || !nf.label} onClick={() => { mAddField.mutate({ id: sel.id, body: nf }); setNf({ key: '', label: '', type: 'text' }); }}><Plus size={15} />{t('addBtn')}</button>
                  </div>
                )}
              </div>
            )}

            {tab === 'perm' && (
              <div>
                <p className="text-sm text-[var(--muted)] mb-3">{t('permHint')}</p>
                <div className="flex flex-wrap gap-2">
                  {ASSIGNABLE_ROLES.map((rk) => {
                    const on = (sel.enterRoleKeys ?? []).includes(rk);
                    return <button key={rk} disabled={!canManage} className={`pill ${on ? 'pill-accent' : 'pill-neutral'}`} style={{ padding: '6px 12px', fontSize: 12.5 }}
                      onClick={() => { const next = on ? sel.enterRoleKeys.filter((x: string) => x !== rk) : [...(sel.enterRoleKeys ?? []), rk]; mUpdEvent.mutate({ id: sel.id, body: { enterRoleKeys: next } }); }}>{on && <Check size={13} />}{ROLE_LABELS[rk]}</button>;
                  })}
                </div>
              </div>
            )}

            {tab === 'public' && (() => {
              const cfg: Record<string, boolean> = { event: true, who: true, where: true, when: true, media: true, ...(sel.publicConfig ?? {}) };
              const on = (k: string) => cfg[k] !== false;
              const setCfg = (patch: Record<string, boolean>) => { if (canManage) mUpdEvent.mutate({ id: sel.id, body: { publicConfig: { ...cfg, ...patch } } }); };
              const pubFields = (sel.fields ?? []).filter((f: any) => f.publicVisible);
              return (
                <div className="flex gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 py-2.5 px-3 rounded-xl mb-1" style={{ background: on('event') ? 'var(--accent-soft)' : 'var(--surface)', border: '1px solid var(--border)' }}>
                      <b className="flex-1 text-[13.5px]">{t('showWholeEvent')}</b>
                      <Toggle on={on('event')} disabled={!canManage} onClick={() => setCfg({ event: !on('event') })} />
                    </div>
                    {on('event') && <>
                      <div className="text-[11px] font-bold uppercase text-[var(--faint)] mt-3 mb-1">{t('stdElements')}</div>
                      {['who', 'where', 'when', 'media'].map((k) => (
                        <div key={k} className="flex items-center gap-2 py-2.5" style={{ borderTop: '1px solid var(--border)' }}>
                          {on(k) ? <Eye size={15} className="text-[var(--good)]" /> : <EyeOff size={15} className="text-[var(--faint)]" />}
                          <span className="flex-1 text-[13.5px]">{t('epcis.' + k)}</span>
                          <Toggle on={on(k)} disabled={!canManage} onClick={() => setCfg({ [k]: !on(k) })} />
                        </div>
                      ))}
                      <div className="text-[11px] font-bold uppercase text-[var(--faint)] mt-3 mb-1">{t('customInfo')}</div>
                      {(sel.fields ?? []).map((f: any) => (
                        <div key={f.id} className="flex items-center gap-2 py-2.5" style={{ borderTop: '1px solid var(--border)' }}>
                          {f.publicVisible ? <Eye size={15} className="text-[var(--good)]" /> : <EyeOff size={15} className="text-[var(--faint)]" />}
                          <span className="flex-1 text-[13.5px]">{f.label}</span>
                          <Toggle on={!!f.publicVisible} disabled={!canManage} onClick={() => mUpdField.mutate({ id: f.id, body: { publicVisible: !f.publicVisible } })} />
                        </div>
                      ))}
                      {(sel.fields ?? []).length === 0 && <p className="text-xs text-[var(--muted)] mt-1">{t('noCustomFields')}</p>}
                    </>}
                  </div>
                  {/* Phone preview */}
                  <div className="w-[200px] border-[8px] rounded-[30px] overflow-hidden mx-auto self-start" style={{ borderColor: '#11151f', background: 'var(--bg)', boxShadow: 'var(--shadow-md)' }}>
                    <div className="h-[300px] overflow-auto">
                      {!on('event') ? (
                        <div className="p-4 text-center text-[11px] text-[var(--faint)] mt-12">{t('hiddenFromPublic')}</div>
                      ) : <>
                        <div className="p-3 text-white" style={{ background: 'linear-gradient(160deg,#1b6b3f,#2f9e5f)' }}>
                          <div className="text-[10px] font-bold">{t('verified')}</div>
                          <div className="text-[13px] font-bold">{sel.name}</div>
                        </div>
                        <div className="p-3 text-[11px]">
                          {on('who') && <div className="py-1"><span className="text-[var(--faint)]">{t('epcis.who')}:</span> •••</div>}
                          {on('where') && <div className="py-1"><span className="text-[var(--faint)]">{t('epcis.where')}:</span> •••</div>}
                          {on('when') && <div className="py-1"><span className="text-[var(--faint)]">{t('epcis.when')}:</span> •••</div>}
                          {pubFields.map((f: any) => (
                            <div key={f.id} className="py-1" style={{ borderTop: '1px solid var(--border)' }}><span className="text-[var(--faint)]">{f.label}:</span> •••</div>
                          ))}
                          {on('media') && <div className="py-1 text-[var(--faint)]">{t('mediaShown')}</div>}
                          <div className="text-[10px] text-[var(--faint)] pt-2">{t('hiddenFieldsCount', { n: (sel.fields ?? []).length - pubFields.length })}</div>
                        </div>
                      </>}
                    </div>
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </Drawer>

      {/* Edit flow drawer */}
      <Drawer open={!!editFlow} onClose={() => setEditFlow(null)} title={<b>{t('editFlowTitle')}</b>}
        footer={<><div className="flex-1" /><button className="btn" onClick={() => setEditFlow(null)}>{t('cancel')}</button>
          <button className="btn btn-primary" disabled={!editFlow?.name || !editFlow?.code || mUpdateFlow.isPending} onClick={() => mUpdateFlow.mutate({ id: editFlow.id, body: { name: editFlow.name, code: editFlow.code, organizationIds: editFlow.organizationIds } })}>{t('save')}</button></>}>
        {editFlow && <>
          <label className="block mb-3"><span className="label">{t('flowName')}</span><input className="input" value={editFlow.name} onChange={(e) => setEditFlow({ ...editFlow, name: e.target.value })} /></label>
          <label className="block mb-4"><span className="label">{t('code')}</span><input className="input mono" value={editFlow.code} onChange={(e) => setEditFlow({ ...editFlow, code: e.target.value })} /></label>
          <span className="label">{t('belongOrg')}</span>
          <div className="flex flex-col gap-1 max-h-[240px] overflow-auto p-1.5 rounded-xl mb-2" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
            {(orgs.data ?? []).map((o) => {
              const on = editFlow.organizationIds.includes(o.id);
              return (
                <button key={o.id} className="flex items-center gap-2.5 p-2.5 rounded-lg text-left transition-colors" style={{ background: on ? 'var(--accent-soft)' : 'transparent', marginLeft: (o.level ?? 0) * 12 }}
                  onClick={() => setEditFlow({ ...editFlow, organizationIds: on ? editFlow.organizationIds.filter((x: string) => x !== o.id) : [...editFlow.organizationIds, o.id] })}>
                  <span className="w-5 h-5 rounded-md grid place-items-center flex-none transition-colors" style={{ border: '1.5px solid var(--border-strong)', background: on ? 'var(--accent)' : 'transparent' }}>{on && <Check size={12} style={{ color: 'var(--accent-contrast)' }} />}</span>
                  <span className="text-sm flex-1">{o.name}</span><span className="chip" style={{ fontSize: 11 }}>{t('level', { n: (o.level ?? 0) + 1 })}</span>
                </button>
              );
            })}
          </div>
          <div className="text-xs text-[var(--muted)]">{editFlow.organizationIds.length === 0 ? t('noOrgSelected') : t('selectedOrgs', { n: editFlow.organizationIds.length })}</div>
        </>}
      </Drawer>

      {/* Flow permission assignment drawer */}
    </>
  );
}

function AddEvent({ onAdd }: { onAdd: (name: string, code: string) => void }) {
  const t = useT(MSG);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  if (!open) return <button className="w-[152px] min-h-[92px] p-3 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 text-[var(--accent)] text-xs font-semibold flex-none transition-colors hover:bg-[var(--accent-soft)]" style={{ borderColor: 'var(--border-strong)' }} onClick={() => setOpen(true)}><Plus size={20} />{t('addEvent')}</button>;
  return (
    <div className="w-[184px] p-3.5 rounded-xl flex-none" style={{ border: '1.5px solid var(--accent)', background: 'var(--accent-soft)' }}>
      <input autoFocus className="input mb-2" placeholder={t('eventName')} value={name} onChange={(e) => setName(e.target.value)} />
      <button className="btn btn-primary btn-sm w-full justify-center" disabled={!name} onClick={() => { onAdd(name, name.toUpperCase().replace(/\s+/g, '_').slice(0, 20) + '_' + Math.floor(Math.random() * 900 + 100)); setName(''); setOpen(false); }}>{t('addBtn')}</button>
    </div>
  );
}

