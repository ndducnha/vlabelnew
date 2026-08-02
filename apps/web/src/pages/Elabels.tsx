import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Plus, Trash2, Tag, Layers, Send, Undo2, ExternalLink, Download, QrCode, Pencil, CheckCircle2, XCircle, Globe, ShieldCheck, Search } from '../lib/icons';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useApiMutation } from '../lib/useApiMutation';
import { PageHead, Spinner, EmptyState, Drawer, Paginator, statusClsMap } from '../components/ui';
import { useT, type Messages } from '../lib/i18n';
import type { Product } from '@vlabel/shared';
import { PERMISSIONS, APPENDIX_GROUPS, appendixGroupByCode, ELABEL_STATUS_LABELS } from '@vlabel/shared';

const STATUS = statusClsMap(ELABEL_STATUS_LABELS);
const RISK = ['risk0', 'risk1', 'risk2', 'risk3'];
const PUBLIC_BASE = (import.meta as any).env?.VITE_PUBLIC_BASE ?? window.location.origin;

const MSG: Messages = {
  vi: {
    eyebrow: 'Nhãn hàng hóa', title: 'Nhãn điện tử', subtitle: 'Soạn nội dung nhãn, quản lý lô, công bố và sinh QR cho người tiêu dùng quét',
    searchPh: 'Tìm sản phẩm theo tên / GTIN…', allStatus: 'Tất cả trạng thái', draft: 'Nháp', publishedOpt: 'Đã công bố', recalledOpt: 'Thu hồi',
    emptyFoundTitle: 'Không tìm thấy sản phẩm', emptyTitle: 'Chưa có nhãn',
    emptyFoundHint: 'Thử từ khóa khác theo tên hoặc GTIN.', emptyHint: 'Nhãn điện tử được tạo từ sản phẩm ở mục Quản lý sản phẩm. Vào đây để soạn nội dung nhãn và công bố.',
    colIdx: 'Mục', colLabel: 'Nhãn', colStatus: 'Trạng thái', colBatch: 'Lô', colAction: 'Thao tác',
    batchUnit: 'lô', preview: 'Xem thử', previewTitle: 'Xem thử trang nhãn', compose: 'Soạn nhãn', publish: 'Công bố', recall: 'Thu hồi',
    recallPrompt: 'Lý do thu hồi:', msgPublished: 'Đã công bố nhãn', msgRecalled: 'Đã thu hồi nhãn', msgDrafted: 'Đã chuyển nháp',
    risk0: 'Chưa xác định', risk1: 'Cao', risk2: 'Trung bình', risk3: 'Thấp',
    editMsgSaved: 'Đã lưu nội dung nhãn', editMsgPortal: 'Đã kết nối Cổng truy xuất quốc gia',
    editTitle: 'Soạn nhãn', close: 'Đóng', save: 'Lưu',
    secBasic: 'Thông tin cơ bản', lblName: 'Tên sản phẩm', lblBrand: 'Nhãn hiệu', lblDesc: 'Mô tả', lblOrigin: 'Xuất xứ', lblHs: 'Mã HS',
    lblMarket: 'Thị trường mục tiêu', lblSupplier: 'Nhà cung cấp', lblRisk: 'Mức rủi ro',
    secRequired: 'Nội dung bắt buộc theo Nghị định 37/2026',
    lblNetContent: 'Định lượng (khối lượng/thể tích/số lượng)', phNetContent: 'VD: 50ml · 20 viên · 5kg',
    lblIngredients: 'Thành phần / cấu tạo', lblUsage: 'Hướng dẫn sử dụng', lblStorage: 'Hướng dẫn bảo quản',
    lblSafety: 'Cảnh báo an toàn', phSafety: 'Bắt buộc với hàng rủi ro cao/trung bình',
    secAppendix: 'Nhóm hàng hóa theo Phụ lục I (NĐ 37/2026)', lblGroup: 'Nhóm hàng hóa', optGroup: '— chọn nhóm hàng hóa —',
    hintGroup: 'Chọn nhóm hàng hóa để hiện các trường bắt buộc tương ứng.',
    secOwner: 'Doanh nghiệp chịu trách nhiệm', lblOwnerName: 'Tên doanh nghiệp', lblTaxCode: 'Mã số thuế', lblAddress: 'Địa chỉ', lblRep: 'Người đại diện',
    secOther: 'Thông tin khác', add: 'Thêm', hintOther: 'Chưa có. Bấm Thêm để bổ sung trường tự do.', phFieldName: 'Tên trường', phFieldValue: 'Nội dung',
    secImages: 'Ảnh sản phẩm (dán link)', secCerts: 'Chứng nhận (dán link)',
    batchMsgAdded: 'Đã thêm lô', batchMsgDeleted: 'Đã xoá lô', batchTitle: 'Lô của nhãn', batchAddNew: 'Thêm lô mới',
    phBatchCode: 'Số lô (VD: LOT-2408-01)', phQty: 'Số lượng', addBatch: 'Thêm lô',
    batchEmptyTitle: 'Chưa có lô', batchEmptyHint: 'Thêm lô để sinh QR riêng cho từng đợt sản xuất.',
    nsx: 'NSX', sl: 'SL', qrBatch: 'QR lô', recallBatch: 'Thu hồi lô', recallBatchPrompt: 'Lý do thu hồi lô:',
    publishBatch: 'Công bố lô', deleteBatch: 'Xoá lô', confirmDeleteBatch: 'Xoá lô?', nationalPortal: 'Cổng quốc gia:', downloadPng: 'Tải PNG',
    compTitle: 'Tuân thủ Nghị định 37/2026', compMet: '{met}/{total} tiêu chí đạt', compCanPublish: 'Đủ điều kiện công bố', compCannot: 'Chưa đủ điều kiện',
    compMetLabel: 'Đạt', compRequired: 'Bắt buộc', compConnectPortal: 'Kết nối Cổng truy xuất quốc gia',
  },
  en: {
    eyebrow: 'Goods label', title: 'E-label', subtitle: 'Compose label content, manage batches, publish and generate QR for consumers to scan',
    searchPh: 'Search products by name / GTIN…', allStatus: 'All statuses', draft: 'Draft', publishedOpt: 'Published', recalledOpt: 'Recalled',
    emptyFoundTitle: 'No products found', emptyTitle: 'No labels yet',
    emptyFoundHint: 'Try another keyword by name or GTIN.', emptyHint: 'E-labels are created from products in Product management. Come here to compose label content and publish.',
    colIdx: 'No.', colLabel: 'Label', colStatus: 'Status', colBatch: 'Batches', colAction: 'Actions',
    batchUnit: 'batches', preview: 'Preview', previewTitle: 'Preview label page', compose: 'Compose', publish: 'Publish', recall: 'Recall',
    recallPrompt: 'Recall reason:', msgPublished: 'Label published', msgRecalled: 'Label recalled', msgDrafted: 'Moved to draft',
    risk0: 'Undetermined', risk1: 'High', risk2: 'Medium', risk3: 'Low',
    editMsgSaved: 'Label content saved', editMsgPortal: 'Connected to the National Traceability Portal',
    editTitle: 'Compose label', close: 'Close', save: 'Save',
    secBasic: 'Basic information', lblName: 'Product name', lblBrand: 'Brand', lblDesc: 'Description', lblOrigin: 'Origin', lblHs: 'HS code',
    lblMarket: 'Target market', lblSupplier: 'Supplier', lblRisk: 'Risk level',
    secRequired: 'Mandatory content per Decree 37/2026',
    lblNetContent: 'Net content (weight/volume/quantity)', phNetContent: 'e.g. 50ml · 20 tablets · 5kg',
    lblIngredients: 'Ingredients / composition', lblUsage: 'Usage instructions', lblStorage: 'Storage instructions',
    lblSafety: 'Safety warnings', phSafety: 'Required for high/medium-risk goods',
    secAppendix: 'Goods group per Appendix I (Decree 37/2026)', lblGroup: 'Goods group', optGroup: '— select goods group —',
    hintGroup: 'Select a goods group to show the corresponding required fields.',
    secOwner: 'Responsible business', lblOwnerName: 'Business name', lblTaxCode: 'Tax code', lblAddress: 'Address', lblRep: 'Representative',
    secOther: 'Other information', add: 'Add', hintOther: 'None yet. Click Add to add a free field.', phFieldName: 'Field name', phFieldValue: 'Content',
    secImages: 'Product images (paste link)', secCerts: 'Certificates (paste link)',
    batchMsgAdded: 'Batch added', batchMsgDeleted: 'Batch deleted', batchTitle: 'Label batches', batchAddNew: 'Add new batch',
    phBatchCode: 'Batch code (e.g. LOT-2408-01)', phQty: 'Quantity', addBatch: 'Add batch',
    batchEmptyTitle: 'No batches yet', batchEmptyHint: 'Add a batch to generate a separate QR for each production run.',
    nsx: 'MFG', sl: 'Qty', qrBatch: 'Batch QR', recallBatch: 'Recall batch', recallBatchPrompt: 'Batch recall reason:',
    publishBatch: 'Publish batch', deleteBatch: 'Delete batch', confirmDeleteBatch: 'Delete batch?', nationalPortal: 'National portal:', downloadPng: 'Download PNG',
    compTitle: 'Decree 37/2026 compliance', compMet: '{met}/{total} criteria met', compCanPublish: 'Eligible to publish', compCannot: 'Not yet eligible',
    compMetLabel: 'Met', compRequired: 'Required', compConnectPortal: 'Connect to the National Traceability Portal',
  },
};

export default function Elabels() {
  const { can } = useAuth();
  const t = useT(MSG);
  const canEdit = can(PERMISSIONS.PRODUCT_UPDATE);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState<Product | null>(null);
  const [batches, setBatches] = useState<Product | null>(null);
  const pageSize = 10;

  const list = useQuery<Product[]>({ queryKey: ['elabels', status], queryFn: () => api.get('/elabels', { params: { status: status || undefined } }).then((r) => r.data) });
  const filtered = (list.data ?? []).filter((p) => !q || p.name?.toLowerCase().includes(q.toLowerCase()) || (p.gtin ?? '').includes(q));
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pages);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const setSt = useApiMutation(
    ({ id, status, recallReason }: any) => api.post(`/elabels/${id}/status`, { status, recallReason }),
    { successMessage: (_d, v: any) => (v.status === 'published' ? t('msgPublished') : v.status === 'recalled' ? t('msgRecalled') : t('msgDrafted')), invalidate: [['elabels']] },
  );

  return (
    <>
      <PageHead eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')}
        actions={<>
          <div className="flex items-center gap-2 rounded-full px-3.5 h-10" style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
            <Search size={15} className="text-[var(--muted)]" />
            <input className="bg-transparent outline-none text-sm" style={{ width: 200 }} placeholder={t('searchPh')} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </div>
          <select className="input" style={{ width: 170 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">{t('allStatus')}</option>
            <option value="draft">{t('draft')}</option>
            <option value="published">{t('publishedOpt')}</option>
            <option value="recalled">{t('recalledOpt')}</option>
          </select>
        </>} />

      {list.isLoading ? <Spinner /> : total === 0 ? (
        <div className="card anim-in"><EmptyState title={q ? t('emptyFoundTitle') : t('emptyTitle')} hint={q ? t('emptyFoundHint') : t('emptyHint')} /></div>
      ) : (
        <>
          {/* Sổ cái cho màn hình lớn */}
          <div className="hidden md:block anim-in overflow-x-auto">
            <table className="ledger text-sm">
              <thead><tr>
                <th style={{ width: 52 }}>{t('colIdx')}</th>
                <th>{t('colLabel')}</th>
                <th>{t('colStatus')}</th>
                <th>{t('colBatch')}</th>
                <th className="text-right">{t('colAction')}</th>
              </tr></thead>
              <tbody>
                {rows.map((p, i) => {
                  const s = STATUS[p.elabelStatus ?? ''] ?? STATUS.draft;
                  return (
                    <tr key={p.id}>
                      <td><span className="ledger-idx">{String((safePage - 1) * pageSize + i + 1).padStart(2, '0')}</span></td>
                      <td>
                        <div className="flex items-center gap-3">
                          <span className="iconbox"><Tag size={17} /></span>
                          <div className="min-w-0"><b>{p.name}</b>{p.brand && <span className="text-[var(--muted)]"> · {p.brand}</span>}<div className="text-xs text-[var(--muted)] mono mt-0.5">GTIN {p.gtin}</div></div>
                        </div>
                      </td>
                      <td><span className={`pill ${s.cls}`}><i />{s.label}</span></td>
                      <td><button className="btn btn-sm" onClick={() => setBatches(p)}><Layers size={13} /><span className="num">{p.batchCount}</span> {t('batchUnit')}</button></td>
                      <td>
                        <div className="flex gap-1.5 justify-end flex-wrap">
                          <a className="btn btn-sm" href={`${PUBLIC_BASE}/t/${p.gtin}`} target="_blank" rel="noreferrer" title={t('previewTitle')}><ExternalLink size={13} />{t('preview')}</a>
                          {canEdit && <button className="btn btn-sm" onClick={() => setEdit(p)}><Pencil size={13} />{t('compose')}</button>}
                          {canEdit && p.elabelStatus !== 'published' && <button className="btn btn-sm btn-primary" onClick={() => setSt.mutate({ id: p.id, status: 'published' })}><Send size={13} />{t('publish')}</button>}
                          {canEdit && p.elabelStatus === 'published' && <button className="btn btn-sm btn-danger" onClick={() => { const r = window.prompt(t('recallPrompt')); if (r !== null) setSt.mutate({ id: p.id, status: 'recalled', recallReason: r }); }}><Undo2 size={13} />{t('recall')}</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Thẻ cho di động */}
          <div className="flex flex-col gap-3 md:hidden">
            {rows.map((p) => {
              const s = STATUS[p.elabelStatus ?? ''] ?? STATUS.draft;
              return (
                <div key={p.id} className="card card-hover p-4 anim-in">
                  <div className="flex items-start gap-3">
                    <span className="iconbox"><Tag size={18} /></span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <b className="truncate">{p.name}</b>
                        <span className={`pill ${s.cls}`}><i />{s.label}</span>
                      </div>
                      {p.brand && <div className="text-sm text-[var(--muted)] mt-0.5">{p.brand}</div>}
                      <div className="text-xs text-[var(--muted)] mono mt-0.5">GTIN {p.gtin}</div>
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-wrap mt-3.5">
                    <button className="btn btn-sm" onClick={() => setBatches(p)}><Layers size={14} />{p.batchCount} {t('batchUnit')}</button>
                    <a className="btn btn-sm" href={`${PUBLIC_BASE}/t/${p.gtin}`} target="_blank" rel="noreferrer" title={t('previewTitle')}><ExternalLink size={14} />{t('preview')}</a>
                    {canEdit && <button className="btn btn-sm" onClick={() => setEdit(p)}><Pencil size={14} />{t('compose')}</button>}
                    {canEdit && p.elabelStatus !== 'published' && <button className="btn btn-sm btn-primary" onClick={() => setSt.mutate({ id: p.id, status: 'published' })}><Send size={14} />{t('publish')}</button>}
                    {canEdit && p.elabelStatus === 'published' && <button className="btn btn-sm btn-danger" onClick={() => { const r = window.prompt(t('recallPrompt')); if (r !== null) setSt.mutate({ id: p.id, status: 'recalled', recallReason: r }); }}><Undo2 size={14} />{t('recall')}</button>}
                  </div>
                </div>
              );
            })}
          </div>
          <Paginator page={safePage} pageSize={pageSize} total={total} onPage={setPage} />
        </>
      )}

      {edit && <EditLabel product={edit} onClose={() => setEdit(null)} />}
      {batches && <BatchesDrawer product={batches} canEdit={canEdit} onClose={() => setBatches(null)} />}
    </>
  );
}

function EditLabel({ product, onClose }: { product: Product; onClose: () => void }) {
  const t = useT(MSG);
  const detail = useQuery({ queryKey: ['elabel', product.id], queryFn: () => api.get(`/elabels/${product.id}`).then((r) => r.data) });
  const d = detail.data;
  const [f, setF] = useState<any>(null);
  // khởi tạo form khi có dữ liệu
  if (d && !f) {
    const o = d.ownerInfo ?? {};
    setF({
      name: d.name ?? '', brand: d.brand ?? '', description: d.description ?? '', countryOfOrigin: d.countryOfOrigin ?? '',
      hsCode: d.hsCode ?? '', targetMarket: d.targetMarket ?? '', supplier: d.supplier ?? '', riskLevel: d.riskLevel ?? 0,
      netContent: d.netContent ?? '', ingredients: d.ingredients ?? '', usageInstructions: d.usageInstructions ?? '',
      storageInstructions: d.storageInstructions ?? '', safetyWarnings: d.safetyWarnings ?? '',
      appendixGroup: d.appendixGroup ?? '', appendixAttributes: (d.appendixAttributes && typeof d.appendixAttributes === 'object') ? d.appendixAttributes : {},
      owner: { name: o.name ?? '', tax_code: o.tax_code ?? '', address: o.address ?? '', representative: o.representative ?? '' },
      attributes: Array.isArray(d.labelAttributes) ? d.labelAttributes : [],
      images: Array.isArray(d.labelImages) ? d.labelImages : [],
      certificates: Array.isArray(d.certificates) ? d.certificates : [],
    });
  }

  const save = useApiMutation(
    () => api.patch(`/elabels/${product.id}`, {
      name: f.name, brand: f.brand, description: f.description, countryOfOrigin: f.countryOfOrigin, hsCode: f.hsCode,
      targetMarket: f.targetMarket, supplier: f.supplier, riskLevel: Number(f.riskLevel),
      netContent: f.netContent, ingredients: f.ingredients, usageInstructions: f.usageInstructions,
      storageInstructions: f.storageInstructions, safetyWarnings: f.safetyWarnings,
      appendixGroup: f.appendixGroup || null, appendixAttributes: f.appendixAttributes,
      ownerInfo: f.owner, labelAttributes: f.attributes, labelImages: f.images, certificates: f.certificates,
    }),
    { successMessage: t('editMsgSaved'), invalidate: [['elabels'], ['elabel', product.id]], onSuccess: () => comp.refetch() },
  );
  const comp = useQuery({ queryKey: ['elabel-compliance', product.id], queryFn: () => api.get(`/elabels/${product.id}/compliance`).then((r) => r.data) });
  const portalSync = useApiMutation(() => api.post(`/elabels/${product.id}/portal-sync`), { successMessage: t('editMsgPortal'), invalidate: [['elabels']], onSuccess: () => comp.refetch() });

  return (
    <Drawer open onClose={onClose} title={<><b>{t('editTitle')}</b><div className="text-xs text-[var(--muted)] mono">GTIN {product.gtin}</div></>}
      footer={<><div className="flex-1" /><button className="btn" onClick={onClose}>{t('close')}</button><button className="btn btn-primary" disabled={!f || save.isPending} onClick={() => save.mutate()}>{save.isPending && <Loader2 size={15} className="animate-spin" />}{t('save')}</button></>}>
      {!f ? <Spinner /> : (
        <div className="flex flex-col gap-3.5 anim-in">
          {comp.data && <CompliancePanel data={comp.data} onSync={() => portalSync.mutate()} syncing={portalSync.isPending} />}
          <Section title={t('secBasic')} />
          <div className="grid grid-cols-2 gap-3">
            <L label={t('lblName')}><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></L>
            <L label={t('lblBrand')}><input className="input" value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value })} /></L>
          </div>
          <L label={t('lblDesc')}><textarea className="input" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></L>
          <div className="grid grid-cols-2 gap-3">
            <L label={t('lblOrigin')}><input className="input" value={f.countryOfOrigin} onChange={(e) => setF({ ...f, countryOfOrigin: e.target.value })} /></L>
            <L label={t('lblHs')}><input className="input mono" value={f.hsCode} onChange={(e) => setF({ ...f, hsCode: e.target.value })} /></L>
            <L label={t('lblMarket')}><input className="input" value={f.targetMarket} onChange={(e) => setF({ ...f, targetMarket: e.target.value })} /></L>
            <L label={t('lblSupplier')}><input className="input" value={f.supplier} onChange={(e) => setF({ ...f, supplier: e.target.value })} /></L>
          </div>
          <L label={t('lblRisk')}><select className="input" value={f.riskLevel} onChange={(e) => setF({ ...f, riskLevel: e.target.value })}>{RISK.map((r, i) => <option key={i} value={i}>{t(r)}</option>)}</select></L>

          <Section title={t('secRequired')} />
          <L label={t('lblNetContent')}><input className="input" value={f.netContent} onChange={(e) => setF({ ...f, netContent: e.target.value })} placeholder={t('phNetContent')} /></L>
          <L label={t('lblIngredients')}><textarea className="input" rows={2} value={f.ingredients} onChange={(e) => setF({ ...f, ingredients: e.target.value })} /></L>
          <div className="grid grid-cols-2 gap-3">
            <L label={t('lblUsage')}><textarea className="input" rows={2} value={f.usageInstructions} onChange={(e) => setF({ ...f, usageInstructions: e.target.value })} /></L>
            <L label={t('lblStorage')}><textarea className="input" rows={2} value={f.storageInstructions} onChange={(e) => setF({ ...f, storageInstructions: e.target.value })} /></L>
          </div>
          <L label={t('lblSafety')}><textarea className="input" rows={2} value={f.safetyWarnings} onChange={(e) => setF({ ...f, safetyWarnings: e.target.value })} placeholder={t('phSafety')} /></L>

          <Section title={t('secAppendix')} />
          <L label={t('lblGroup')}>
            <select className="input" value={f.appendixGroup} onChange={(e) => setF({ ...f, appendixGroup: e.target.value })}>
              <option value="">{t('optGroup')}</option>
              {APPENDIX_GROUPS.map((g) => <option key={g.code} value={g.code}>{g.name}</option>)}
            </select>
          </L>
          {(() => {
            const grp = appendixGroupByCode(f.appendixGroup);
            if (!grp) return <p className="text-xs text-[var(--muted)]">{t('hintGroup')}</p>;
            const setA = (k: string, v: string) => setF({ ...f, appendixAttributes: { ...f.appendixAttributes, [k]: v } });
            return grp.fields.map((fl) => (
              <L key={fl.key} label={`${fl.label}${fl.required ? ' *' : ''}`}>
                {fl.type === 'textarea'
                  ? <textarea className="input" rows={2} value={f.appendixAttributes[fl.key] ?? ''} onChange={(e) => setA(fl.key, e.target.value)} />
                  : <input className="input" type={fl.type === 'date' ? 'date' : fl.type === 'number' ? 'number' : 'text'} value={f.appendixAttributes[fl.key] ?? ''} onChange={(e) => setA(fl.key, e.target.value)} />}
              </L>
            ));
          })()}

          <Section title={t('secOwner')} />
          <div className="grid grid-cols-2 gap-3">
            <L label={t('lblOwnerName')}><input className="input" value={f.owner.name} onChange={(e) => setF({ ...f, owner: { ...f.owner, name: e.target.value } })} /></L>
            <L label={t('lblTaxCode')}><input className="input mono" value={f.owner.tax_code} onChange={(e) => setF({ ...f, owner: { ...f.owner, tax_code: e.target.value } })} /></L>
          </div>
          <L label={t('lblAddress')}><input className="input" value={f.owner.address} onChange={(e) => setF({ ...f, owner: { ...f.owner, address: e.target.value } })} /></L>
          <L label={t('lblRep')}><input className="input" value={f.owner.representative} onChange={(e) => setF({ ...f, owner: { ...f.owner, representative: e.target.value } })} /></L>

          <Section title={t('secOther')} action={<button className="btn btn-sm" onClick={() => setF({ ...f, attributes: [...f.attributes, { field_name: '', field_value: '' }] })}><Plus size={13} />{t('add')}</button>} />
          {f.attributes.length === 0 && <p className="text-xs text-[var(--muted)]">{t('hintOther')}</p>}
          {f.attributes.map((a: any, i: number) => (
            <div key={i} className="flex gap-2 items-start">
              <input className="input" style={{ flex: '0 0 38%' }} placeholder={t('phFieldName')} value={a.field_name} onChange={(e) => { const n = [...f.attributes]; n[i] = { ...a, field_name: e.target.value }; setF({ ...f, attributes: n }); }} />
              <input className="input" placeholder={t('phFieldValue')} value={a.field_value} onChange={(e) => { const n = [...f.attributes]; n[i] = { ...a, field_value: e.target.value }; setF({ ...f, attributes: n }); }} />
              <button className="btn btn-sm btn-danger" onClick={() => setF({ ...f, attributes: f.attributes.filter((_: any, j: number) => j !== i) })}><Trash2 size={13} /></button>
            </div>
          ))}

          <Section title={t('secImages')} action={<button className="btn btn-sm" onClick={() => setF({ ...f, images: [...f.images, { url: '', note: '', source: 'elabel' }] })}><Plus size={13} />{t('add')}</button>} />
          {f.images.map((im: any, i: number) => (
            <div key={i} className="flex gap-2 items-start">
              <input className="input" placeholder="https://…" value={im.url} onChange={(e) => { const n = [...f.images]; n[i] = { ...im, url: e.target.value }; setF({ ...f, images: n }); }} />
              <button className="btn btn-sm btn-danger" onClick={() => setF({ ...f, images: f.images.filter((_: any, j: number) => j !== i) })}><Trash2 size={13} /></button>
            </div>
          ))}

          <Section title={t('secCerts')} action={<button className="btn btn-sm" onClick={() => setF({ ...f, certificates: [...f.certificates, ''] })}><Plus size={13} />{t('add')}</button>} />
          {f.certificates.map((c: string, i: number) => (
            <div key={i} className="flex gap-2 items-start">
              <input className="input" placeholder="https://…" value={c} onChange={(e) => { const n = [...f.certificates]; n[i] = e.target.value; setF({ ...f, certificates: n }); }} />
              <button className="btn btn-sm btn-danger" onClick={() => setF({ ...f, certificates: f.certificates.filter((_: string, j: number) => j !== i) })}><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
}

function BatchesDrawer({ product, canEdit, onClose }: { product: Product; canEdit: boolean; onClose: () => void }) {
  const t = useT(MSG);
  const detail = useQuery({ queryKey: ['elabel', product.id], queryFn: () => api.get(`/elabels/${product.id}`).then((r) => r.data) });
  const today = new Date().toISOString().slice(0, 10);
  const [nf, setNf] = useState({ batchCode: '', manufacturingDate: today, totalQuantity: '' });
  const [qr, setQr] = useState<any>(null);

  const add = useApiMutation(() => api.post(`/elabels/${product.id}/batches`, { batchCode: nf.batchCode, manufacturingDate: nf.manufacturingDate, totalQuantity: nf.totalQuantity ? Number(nf.totalQuantity) : undefined, status: 'published' }), { successMessage: t('batchMsgAdded'), invalidate: [['elabel', product.id], ['elabels']], onSuccess: () => setNf({ batchCode: '', manufacturingDate: today, totalQuantity: '' }) });
  const setBs = useApiMutation(({ id, status, recallReason }: any) => api.post(`/elabels/${product.id}/batches/${id}/status`, { status, recallReason }), { invalidate: [['elabel', product.id], ['elabels']] });
  const del = useApiMutation((id: string) => api.delete(`/elabels/${product.id}/batches/${id}`), { successMessage: t('batchMsgDeleted'), invalidate: [['elabel', product.id], ['elabels']] });
  const loadQr = useApiMutation((id: string) => api.get(`/elabels/${product.id}/batches/${id}/qr`).then((r) => r.data), { onSuccess: (data) => setQr(data) });

  const batches = detail.data?.batches ?? [];
  return (
    <Drawer open onClose={onClose} title={<><b>{t('batchTitle')}</b><div className="text-xs text-[var(--muted)]">{product.name}</div></>}>
      {canEdit && (
        <div className="card p-4 mb-3.5 anim-in" style={{ background: 'var(--surface)' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="iconbox" style={{ width: 30, height: 30 }}><Plus size={16} /></span>
            <b className="text-[13.5px]">{t('batchAddNew')}</b>
          </div>
          <div className="flex flex-col gap-2.5">
            <input className="input mono" placeholder={t('phBatchCode')} value={nf.batchCode} onChange={(e) => setNf({ ...nf, batchCode: e.target.value })} />
            <div className="grid grid-cols-2 gap-2.5">
              <input className="input" type="date" value={nf.manufacturingDate} onChange={(e) => setNf({ ...nf, manufacturingDate: e.target.value })} />
              <input className="input" type="number" placeholder={t('phQty')} value={nf.totalQuantity} onChange={(e) => setNf({ ...nf, totalQuantity: e.target.value })} />
            </div>
            <button className="btn btn-primary btn-lg" disabled={!nf.batchCode || add.isPending} onClick={() => add.mutate()}>{add.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}{t('addBatch')}</button>
          </div>
        </div>
      )}
      {detail.isLoading ? <Spinner /> : batches.length === 0 ? (
        <EmptyState title={t('batchEmptyTitle')} hint={t('batchEmptyHint')} />
      ) : (
        <div className="flex flex-col gap-2.5">
          {batches.map((b: any) => {
            const s = STATUS[b.status] ?? STATUS.draft;
            return (
              <div key={b.id} className="card card-hover p-3.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="w-9 h-9 rounded-xl grid place-items-center flex-none" style={{ background: 'var(--surface)', color: 'var(--muted)' }}><QrCode size={16} /></span>
                  <div className="flex-1 min-w-[130px]">
                    <b className="mono">{b.batchCode}</b>
                    <div className="text-xs text-[var(--muted)] mt-0.5">{b.manufacturingDate ? `${t('nsx')} ${new Date(b.manufacturingDate).toLocaleDateString('vi-VN')}` : ''}{b.totalQuantity ? ` · ${t('sl')} ${b.totalQuantity}` : ''}</div>
                  </div>
                  <span className={`pill ${s.cls}`}><i />{s.label}</span>
                  <div className="flex gap-1.5">
                    <button className="btn btn-sm" title={t('qrBatch')} onClick={() => loadQr.mutate(b.id)}><QrCode size={13} /></button>
                    {canEdit && b.status === 'published' && <button className="btn btn-sm btn-danger" title={t('recallBatch')} onClick={() => { const r = window.prompt(t('recallBatchPrompt')); if (r !== null) setBs.mutate({ id: b.id, status: 'recalled', recallReason: r }); }}><Undo2 size={13} /></button>}
                    {canEdit && b.status !== 'published' && <button className="btn btn-sm" title={t('publishBatch')} onClick={() => setBs.mutate({ id: b.id, status: 'published' })}><Send size={13} /></button>}
                    {canEdit && <button className="btn btn-sm btn-danger" title={t('deleteBatch')} onClick={() => { if (window.confirm(t('confirmDeleteBatch'))) del.mutate(b.id); }}><Trash2 size={13} /></button>}
                  </div>
                </div>
                {qr?.batchCode === b.batchCode && (
                  <div className="text-center mt-3.5 pt-3.5 pop" style={{ borderTop: '1px solid var(--border)' }}>
                    <img src={qr.dataUrl} alt="QR" className="w-44 h-44 mx-auto rounded-2xl border p-2" style={{ borderColor: 'var(--border)', background: '#fff' }} />
                    <div className="mono text-[10.5px] text-[var(--faint)] mt-2.5 break-all">{qr.url}</div>
                    {qr.traceabilityUrl && <div className="text-[10.5px] text-[var(--muted)] mt-1 break-all">{t('nationalPortal')} {qr.traceabilityUrl}</div>}
                    <a className="btn btn-sm btn-primary mt-2.5 inline-flex" href={qr.dataUrl} download={`qr-${product.gtin}-${b.batchCode}.png`}><Download size={13} />{t('downloadPng')}</a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Drawer>
  );
}

function CompliancePanel({ data, onSync, syncing }: { data: any; onSync: () => void; syncing: boolean }) {
  const t = useT(MSG);
  const needPortal = data.items.find((i: any) => i.key === 'portal');
  const metCount = data.items.filter((i: any) => i.met).length;
  const total = data.items.length;
  const pct = total ? Math.round((metCount / total) * 100) : 0;
  return (
    <div className="card p-4" style={{ background: 'var(--surface)' }}>
      <div className="flex items-center gap-3 mb-3">
        <span className="iconbox" style={{ background: data.canPublish ? 'var(--good-soft)' : 'var(--warn-soft)', color: data.canPublish ? 'var(--good)' : 'var(--warn)' }}><ShieldCheck size={18} /></span>
        <div className="flex-1 min-w-0">
          <b className="text-[14px] block leading-tight">{t('compTitle')}</b>
          <span className="text-xs text-[var(--muted)]">{t('compMet', { met: metCount, total })}</span>
        </div>
        <span className={`pill ${data.canPublish ? 'pill-good' : 'pill-warn'}`}><i />{data.canPublish ? t('compCanPublish') : t('compCannot')}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: 'var(--border)' }}>
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: data.canPublish ? 'var(--good)' : 'var(--warn)' }} />
      </div>
      <div className="flex flex-col gap-1.5">
        {data.items.map((it: any) => (
          <div key={it.key} className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-2" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
            {it.met ? <CheckCircle2 size={16} className="text-[var(--good)] flex-none" /> : <XCircle size={16} className={it.required ? 'text-[var(--danger)] flex-none' : 'text-[var(--faint)] flex-none'} />}
            <span className={`text-[12.5px] flex-1 min-w-0 ${it.met ? '' : 'text-[var(--muted)]'}`}>{it.label}</span>
            {it.met ? <span className="text-[11px] font-semibold text-[var(--good)]">{t('compMetLabel')}</span> : it.required && <span className="pill pill-bad text-[10px] px-2 py-0">{t('compRequired')}</span>}
          </div>
        ))}
      </div>
      {needPortal && !needPortal.met && (
        <button className="btn btn-sm mt-3 w-full justify-center" disabled={syncing} onClick={onSync}>{syncing ? <Loader2 size={13} className="animate-spin" /> : <Globe size={13} />}{t('compConnectPortal')}</button>
      )}
    </div>
  );
}

function Section({ title, action }: { title: string; action?: any }) {
  return <div className="flex items-center justify-between gap-2 mt-2 pb-1.5" style={{ borderBottom: '1px solid var(--border)' }}><div className="text-[11px] font-bold uppercase tracking-wider text-[var(--faint)]">{title}</div>{action}</div>;
}
function L({ label, children }: { label: string; children: any }) {
  return <label className="block"><span className="label">{label}</span>{children}</label>;
}
