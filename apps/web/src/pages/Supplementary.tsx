import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Plus, Search, Pencil, Copy, Trash2, ExternalLink, Send, Archive, ChevronLeft, ArrowRight, Check, Loader2,
  Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Link2, Image as ImageIcon, Undo2, Redo2, Eraser, Package, Eye, Minus, FilePlus2,
} from '../lib/icons';
import { api, apiError, fileUrl } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { useApiMutation } from '../lib/useApiMutation';
import { PageHead, Spinner, EmptyState, SegmentedControl, Paginator, ProgressBar, statusClsMap, Row } from '../components/ui';
import { useT, type Messages } from '../lib/i18n';
import { PERMISSIONS, SUPPLEMENTARY_STATUS_LABELS } from '@vlabel/shared';

const SCOPE_KEYS = ['ALL', 'BATCH', 'PRODUCTION', 'ITEM'];
const STATUS = statusClsMap(SUPPLEMENTARY_STATUS_LABELS);
const VAR_KEYS: [string, string][] = [['{{product_name}}', 'varProduct'], ['{{gtin}}', 'varGtin'], ['{{batch_number}}', 'varBatch'], ['{{manufacturing_date}}', 'varMfg'], ['{{expiry_date}}', 'varExp'], ['{{manufacturer_name}}', 'varMaker'], ['{{manufacturer_address}}', 'varAddress'], ['{{origin}}', 'varOrigin'], ['{{qr_code}}', 'varQr']];

// Mẫu trang web nhãn phụ (chèn nhanh, người dùng điền tiếp)
const webTemplate = (t: (k: string) => string) => `<h2>{{product_name}}</h2>
<p><b>GTIN:</b> {{gtin}}</p>
<h3>${t('tplIngredients')}</h3><p>${t('tplIngredientsPh')}</p>
<h3>${t('tplUses')}</h3><p>${t('tplUsesPh')}</p>
<h3>${t('tplUsage')}</h3><p>${t('tplUsagePh')}</p>
<h3>${t('tplStorage')}</h3><p>${t('tplStoragePh')}</p>
<h3>${t('tplSafety')}</h3><p>${t('tplSafetyPh')}</p>
<h3>${t('tplOrigin')}</h3>
<p><b>${t('tplOriginLbl')}</b> {{origin}}</p>
<p><b>${t('tplResponsibleLbl')}</b> {{manufacturer_name}}</p>
<p><b>${t('tplAddressLbl')}</b> {{manufacturer_address}}</p>`;

const MSG: Messages = {
  vi: {
    scopeALL: 'Toàn bộ sản phẩm', scopeBATCH: 'Theo lô', scopePRODUCTION: 'Theo ngày SX', scopeITEM: 'Theo đơn vị (serial)',
    varProduct: 'Tên SP', varGtin: 'GTIN', varBatch: 'Số lô', varMfg: 'NSX', varExp: 'HSD', varMaker: 'Nhà SX', varAddress: 'Địa chỉ', varOrigin: 'Xuất xứ', varQr: 'Mã QR',
    title_product: 'Chọn sản phẩm', title_scope: 'Phạm vi áp dụng', title_content: 'Soạn trang nhãn phụ', title_publish: 'Lưu và xuất bản',
    tplIngredients: 'Thành phần', tplIngredientsPh: 'Nhập thành phần sản phẩm…', tplUses: 'Công dụng', tplUsesPh: 'Nhập công dụng…',
    tplUsage: 'Hướng dẫn sử dụng', tplUsagePh: 'Nhập hướng dẫn sử dụng…', tplStorage: 'Hướng dẫn bảo quản', tplStoragePh: 'Nhập hướng dẫn bảo quản…',
    tplSafety: 'Cảnh báo an toàn', tplSafetyPh: 'Nhập cảnh báo (nếu có)…', tplOrigin: 'Xuất xứ & tổ chức chịu trách nhiệm',
    tplOriginLbl: 'Xuất xứ:', tplResponsibleLbl: 'Chịu trách nhiệm:', tplAddressLbl: 'Địa chỉ:',
    msgDeleted: 'Đã xóa', msgCloned: 'Đã sao chép', msgUpdated: 'Đã cập nhật',
    previewQrTitle: 'Xem thử trang QR', edit: 'Sửa', publish: 'Xuất bản', stop: 'Ngừng', confirmDelete: 'Xóa nhãn phụ?',
    eyebrow: 'Nhãn hàng hóa', title: 'Nhãn phụ', subtitle: 'Nhãn bổ sung (thường tiếng Việt) gắn theo sản phẩm/lô, hiển thị trên cùng mã QR',
    searchPh: 'Tìm theo tên, sản phẩm, GTIN, lô…', allStatus: 'Tất cả trạng thái', draft: 'Nháp', publishedOpt: 'Đã xuất bản', archivedOpt: 'Ngừng dùng',
    create: 'Tạo nhãn phụ', emptyFoundTitle: 'Không tìm thấy', emptyTitle: 'Chưa có nhãn phụ',
    emptyEditHint: 'Bấm Tạo nhãn phụ để soạn nội dung bổ sung cho sản phẩm.', emptyHint: 'Chưa có nhãn phụ nào.',
    colIdx: 'Mục', colLabel: 'Nhãn phụ', colScope: 'Phạm vi', colStatus: 'Trạng thái', colAction: 'Hành động', batchPrefix: 'Lô',
    msgDraftSaved: 'Đã lưu nháp', msgPublished: '✅ Đã xuất bản nhãn phụ', gtinNotFound: 'Không tìm thấy GTIN',
    step: 'Bước {n}/{total}', editTitle: 'Sửa nhãn phụ', createTitle: 'Tạo nhãn phụ', saveDraftShort: 'Lưu', save: 'Lưu',
    back: 'Trước', continue: 'Tiếp tục', saveDraft: 'Lưu nháp',
    gtinManual: 'Nhập GTIN thủ công (hoặc từ VNPC đã đồng bộ)', gtinGet: 'Nhận', productSearchPh: 'Tìm sản phẩm theo tên / GTIN…',
    publishedShort: 'đã công bố', noProducts: 'Không có sản phẩm phù hợp.',
    scopeHint: 'Nhãn phụ chỉ áp dụng cho phạm vi đã chọn (khớp khi quét QR đúng lô/serial).', lblBatchCode: 'Mã lô',
    lblSerial: 'Serial / mã đơn vị', lblMfgDate: 'Ngày sản xuất', lblExpiry: 'Hạn sử dụng', lblPackaging: 'Ngày đóng gói', lblNote: 'Ghi chú nội bộ',
    contentHint: 'Nội dung hiển thị như một trang web khi người dùng quét QR. Chèn mẫu để có sẵn bố cục, rồi điền nội dung.',
    close: 'Đóng', preview: 'Xem trước', previewTitle: 'Xem trước như trang QR', previewEmpty: 'Nội dung nhãn phụ sẽ hiển thị ở đây…',
    edStyle: 'Kiểu chữ', edStyleOpt: 'Kiểu', edH2: 'Tiêu đề lớn', edH3: 'Tiêu đề nhỏ', edP: 'Đoạn văn', edQuote: 'Trích dẫn',
    edBold: 'Đậm', edItalic: 'Nghiêng', edUnderline: 'Gạch chân', edColor: 'Màu chữ', edList: 'Danh sách', edListOrdered: 'Danh sách số',
    edLeft: 'Trái', edCenter: 'Giữa', edRight: 'Phải', edLink: 'Liên kết', edLinkPrompt: 'Nhập URL:', edImage: 'Chèn ảnh', edImagePrompt: 'URL ảnh:',
    edHr: 'Đường kẻ', edSymbol: 'Ký hiệu', edSymbolPrompt: 'Ký hiệu (VD ®, ™, °C, ✓):', edUndo: 'Hoàn tác', edRedo: 'Làm lại', edClear: 'Xóa định dạng',
    edInsertTemplate: 'Chèn mẫu web', edInsertTemplateConfirm: 'Chèn mẫu web vào vị trí con trỏ?',
    lblLabelName: 'Tên nhãn phụ', rowProduct: 'Sản phẩm', rowScope: 'Phạm vi', rowBatch: 'Lô',
    publishHint: 'Xuất bản sẽ hiển thị nhãn phụ như một tab trên trang QR công khai của sản phẩm và tạo một phiên bản mới.',
  },
  en: {
    scopeALL: 'All products', scopeBATCH: 'By batch', scopePRODUCTION: 'By production date', scopeITEM: 'By unit (serial)',
    varProduct: 'Product', varGtin: 'GTIN', varBatch: 'Batch', varMfg: 'MFG', varExp: 'EXP', varMaker: 'Maker', varAddress: 'Address', varOrigin: 'Origin', varQr: 'QR code',
    title_product: 'Select product', title_scope: 'Applicable scope', title_content: 'Compose supplementary page', title_publish: 'Save and publish',
    tplIngredients: 'Ingredients', tplIngredientsPh: 'Enter product ingredients…', tplUses: 'Uses', tplUsesPh: 'Enter uses…',
    tplUsage: 'Usage instructions', tplUsagePh: 'Enter usage instructions…', tplStorage: 'Storage instructions', tplStoragePh: 'Enter storage instructions…',
    tplSafety: 'Safety warnings', tplSafetyPh: 'Enter warnings (if any)…', tplOrigin: 'Origin & responsible organization',
    tplOriginLbl: 'Origin:', tplResponsibleLbl: 'Responsible:', tplAddressLbl: 'Address:',
    msgDeleted: 'Deleted', msgCloned: 'Copied', msgUpdated: 'Updated',
    previewQrTitle: 'Preview QR page', edit: 'Edit', publish: 'Publish', stop: 'Stop', confirmDelete: 'Delete supplementary label?',
    eyebrow: 'Goods label', title: 'Supplementary label', subtitle: 'Supplementary label (usually Vietnamese) attached to a product/batch, shown on the same QR code',
    searchPh: 'Search by name, product, GTIN, batch…', allStatus: 'All statuses', draft: 'Draft', publishedOpt: 'Published', archivedOpt: 'Archived',
    create: 'Create supplementary label', emptyFoundTitle: 'Not found', emptyTitle: 'No supplementary labels yet',
    emptyEditHint: 'Click Create supplementary label to compose supplementary content for the product.', emptyHint: 'No supplementary labels yet.',
    colIdx: 'No.', colLabel: 'Supplementary label', colScope: 'Scope', colStatus: 'Status', colAction: 'Actions', batchPrefix: 'Batch',
    msgDraftSaved: 'Draft saved', msgPublished: '✅ Supplementary label published', gtinNotFound: 'GTIN not found',
    step: 'Step {n}/{total}', editTitle: 'Edit supplementary label', createTitle: 'Create supplementary label', saveDraftShort: 'Save', save: 'Save',
    back: 'Back', continue: 'Continue', saveDraft: 'Save draft',
    gtinManual: 'Enter GTIN manually (or from synced VNPC)', gtinGet: 'Get', productSearchPh: 'Search products by name / GTIN…',
    publishedShort: 'published', noProducts: 'No matching products.',
    scopeHint: 'The supplementary label applies only to the selected scope (matched when scanning the QR of the correct batch/serial).', lblBatchCode: 'Batch code',
    lblSerial: 'Serial / unit code', lblMfgDate: 'Manufacturing date', lblExpiry: 'Expiry date', lblPackaging: 'Packaging date', lblNote: 'Internal note',
    contentHint: 'Content displays as a web page when users scan the QR. Insert a template for a ready layout, then fill in the content.',
    close: 'Close', preview: 'Preview', previewTitle: 'Preview as QR page', previewEmpty: 'Supplementary label content will appear here…',
    edStyle: 'Text style', edStyleOpt: 'Style', edH2: 'Heading 1', edH3: 'Heading 2', edP: 'Paragraph', edQuote: 'Quote',
    edBold: 'Bold', edItalic: 'Italic', edUnderline: 'Underline', edColor: 'Text color', edList: 'Bulleted list', edListOrdered: 'Numbered list',
    edLeft: 'Left', edCenter: 'Center', edRight: 'Right', edLink: 'Link', edLinkPrompt: 'Enter URL:', edImage: 'Insert image', edImagePrompt: 'Image URL:',
    edHr: 'Horizontal rule', edSymbol: 'Symbol', edSymbolPrompt: 'Symbol (e.g. ®, ™, °C, ✓):', edUndo: 'Undo', edRedo: 'Redo', edClear: 'Clear formatting',
    edInsertTemplate: 'Insert web template', edInsertTemplateConfirm: 'Insert web template at the cursor?',
    lblLabelName: 'Supplementary label name', rowProduct: 'Product', rowScope: 'Scope', rowBatch: 'Batch',
    publishHint: 'Publishing shows the supplementary label as a tab on the product public QR page and creates a new version.',
  },
};

export default function Supplementary() {
  const { can } = useAuth();
  const canEdit = can(PERMISSIONS.PRODUCT_UPDATE);
  const [wizard, setWizard] = useState<any | null>(null);
  if (wizard) return <Wizard initial={wizard} onClose={() => setWizard(null)} />;
  return <ListView canEdit={canEdit} onNew={() => setWizard({})} onEdit={(l: any) => setWizard(l)} />;
}

function ListView({ canEdit, onNew, onEdit }: any) {
  const t = useT(MSG);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const list = useQuery({ queryKey: ['supp', status], queryFn: () => api.get('/supplementary-labels', { params: { status: status || undefined } }).then((r) => r.data) });
  const del = useApiMutation((id: string) => api.delete(`/supplementary-labels/${id}`), { successMessage: t('msgDeleted'), invalidate: [['supp']] });
  const clone = useApiMutation((id: string) => api.post(`/supplementary-labels/${id}/clone`), { successMessage: t('msgCloned'), invalidate: [['supp']] });
  const setSt = useApiMutation(({ id, s }: any) => api.post(`/supplementary-labels/${id}/status`, { status: s }), { successMessage: t('msgUpdated'), invalidate: [['supp']] });

  const filtered = (list.data ?? []).filter((r: any) => !q || r.name?.toLowerCase().includes(q.toLowerCase()) || r.product?.name?.toLowerCase().includes(q.toLowerCase()) || (r.product?.gtin ?? '').includes(q) || (r.batchCode ?? '').includes(q));
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pages);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const PUBLIC_BASE = window.location.origin;

  const actions = (r: any) => (
    <>
      <a className="btn btn-sm" href={`${PUBLIC_BASE}/t/${r.product?.gtin}${r.batchCode ? `?lot=${r.batchCode}` : ''}`} target="_blank" rel="noreferrer" title={t('previewQrTitle')}><ExternalLink size={13} /></a>
      {canEdit && <button className="btn btn-sm" onClick={() => onEdit(r)}><Pencil size={13} />{t('edit')}</button>}
      {canEdit && <button className="btn btn-sm" onClick={() => clone.mutate(r.id)}><Copy size={13} /></button>}
      {canEdit && r.status !== 'published' && <button className="btn btn-sm btn-primary" onClick={() => setSt.mutate({ id: r.id, s: 'published' })}><Send size={13} />{t('publish')}</button>}
      {canEdit && r.status === 'published' && <button className="btn btn-sm" onClick={() => setSt.mutate({ id: r.id, s: 'archived' })}><Archive size={13} />{t('stop')}</button>}
      {canEdit && <button className="btn btn-sm btn-danger" onClick={() => { if (window.confirm(t('confirmDelete'))) del.mutate(r.id); }}><Trash2 size={13} /></button>}
    </>
  );

  return (
    <>
      <PageHead eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')}
        actions={<>
          <div className="flex items-center gap-2 rounded-full px-3.5 h-10" style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
            <Search size={15} className="text-[var(--muted)]" />
            <input className="bg-transparent outline-none text-sm" style={{ width: 200 }} placeholder={t('searchPh')} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </div>
          <select className="input" style={{ width: 150 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">{t('allStatus')}</option>
            <option value="draft">{t('draft')}</option>
            <option value="published">{t('publishedOpt')}</option>
            <option value="archived">{t('archivedOpt')}</option>
          </select>
          {canEdit && <button className="btn btn-primary" onClick={onNew}><Plus size={16} />{t('create')}</button>}
        </>} />

      {list.isLoading ? <Spinner /> : total === 0 ? (
        <div className="card"><EmptyState title={q ? t('emptyFoundTitle') : t('emptyTitle')} hint={canEdit ? t('emptyEditHint') : t('emptyHint')} action={canEdit ? <button className="btn btn-primary" onClick={onNew}><Plus size={15} />{t('create')}</button> : undefined} /></div>
      ) : (
        <>
          {/* Sổ cái cho desktop */}
          <div className="hidden lg:block anim-in overflow-x-auto">
            <table className="ledger text-sm">
              <thead><tr>
                <th style={{ width: 52 }}>{t('colIdx')}</th>
                <th>{t('colLabel')}</th>
                <th>{t('colScope')}</th>
                <th>{t('colStatus')}</th>
                <th style={{ textAlign: 'right' }}>{t('colAction')}</th>
              </tr></thead>
              <tbody>
                {rows.map((r: any, i: number) => {
                  const s = STATUS[r.status] ?? STATUS.draft;
                  return (
                    <tr key={r.id}>
                      <td><span className="ledger-idx">{String((safePage - 1) * pageSize + i + 1).padStart(2, '0')}</span></td>
                      <td>
                        <div className="flex items-center gap-3">
                          <span className="iconbox flex-none"><Package size={18} /></span>
                          <div className="min-w-0"><b className="block truncate text-[15px]">{r.name}</b><div className="text-xs text-[var(--muted)]">{r.product?.name} · <span className="mono">{r.product?.gtin}</span></div></div>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="chip">{SCOPE_KEYS.includes(r.scope) ? t('scope' + r.scope) : r.scope}</span>
                          {r.batchCode && <span className="chip mono">{t('batchPrefix')} {r.batchCode}</span>}
                          <span className="chip num">v{r.version}</span>
                        </div>
                      </td>
                      <td><span className={`pill ${s.cls}`}><i />{s.label}</span></td>
                      <td><div className="flex gap-1.5 flex-wrap justify-end">{actions(r)}</div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Card cho mobile */}
          <div className="flex flex-col gap-3 lg:hidden">
            {rows.map((r: any) => {
              const s = STATUS[r.status] ?? STATUS.draft;
              return (
                <div key={r.id} className="card card-hover p-4 anim-in">
                  <div className="flex items-start gap-3 flex-wrap">
                    <span className="iconbox flex-none"><Package size={18} /></span>
                    <div className="flex-1 min-w-[180px]">
                      <div className="flex items-center gap-2 flex-wrap"><b className="text-[15px]">{r.name}</b><span className={`pill ${s.cls}`}><i />{s.label}</span></div>
                      <div className="text-xs text-[var(--muted)] mt-1">{r.product?.name} · <span className="mono">{r.product?.gtin}</span></div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="chip">{SCOPE_KEYS.includes(r.scope) ? t('scope' + r.scope) : r.scope}</span>
                        {r.batchCode && <span className="chip mono">{t('batchPrefix')} {r.batchCode}</span>}
                        <span className="chip num">v{r.version}</span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap justify-end">{actions(r)}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <Paginator page={safePage} pageSize={pageSize} total={total} onPage={setPage} />
        </>
      )}
    </>
  );
}

function Wizard({ initial, onClose }: { initial: any; onClose: () => void }) {
  const t = useT(MSG);
  const toast = useToast();
  const products = useQuery({ queryKey: ['products'], queryFn: () => api.get('/products').then((r) => r.data) });
  const [idx, setIdx] = useState(0);
  const [f, setF] = useState<any>({
    id: initial.id, productId: initial.productId ?? '', product: initial.product ?? null,
    name: initial.name ?? 'Nhãn phụ tiếng Việt', scope: initial.scope ?? 'ALL',
    batchCode: initial.batchCode ?? '', manufacturingDate: (initial.manufacturingDate ?? '').slice(0, 10), expiryDate: (initial.expiryDate ?? '').slice(0, 10),
    packagingDate: (initial.packagingDate ?? '').slice(0, 10), serial: initial.serial ?? '', note: initial.note ?? '',
    contentHtml: initial.contentHtml ?? '', labelSize: initial.labelSize ?? '80x50', orientation: initial.orientation ?? 'portrait',
  });
  const [qrUrl, setQrUrl] = useState('');
  const steps = ['product', 'scope', 'content', 'publish'];
  const screen = steps[idx];

  // nạp QR sản phẩm để xem trước biến {{qr_code}}
  useEffect(() => { if (f.productId) api.get(`/products/${f.productId}/qr`, { params: { lot: f.batchCode || undefined } }).then((r) => setQrUrl(r.data.dataUrl)).catch(() => {}); }, [f.productId, f.batchCode]);

  const payload = () => ({ productId: f.productId, name: f.name, scope: f.scope, batchCode: f.batchCode || undefined, manufacturingDate: f.manufacturingDate || undefined, expiryDate: f.expiryDate || undefined, packagingDate: f.packagingDate || undefined, serial: f.serial || undefined, note: f.note || undefined, contentHtml: f.contentHtml, labelSize: f.labelSize, orientation: f.orientation });
  const saveDraft = async () => {
    if (f.id) { await api.patch(`/supplementary-labels/${f.id}`, payload()); return f.id; }
    const { data } = await api.post('/supplementary-labels', payload()); setF((s: any) => ({ ...s, id: data.id })); return data.id;
  };
  const save = useApiMutation(saveDraft, { successMessage: t('msgDraftSaved'), invalidate: [['supp']], onSuccess: () => onClose() });
  const publish = useApiMutation(async () => { const id = await saveDraft(); await api.post(`/supplementary-labels/${id}/status`, { status: 'published' }); }, { successMessage: t('msgPublished'), invalidate: [['supp']], onSuccess: () => onClose() });

  const canNext = screen === 'product' ? !!f.productId : true;
  const selectProduct = (p: any) => setF((s: any) => ({ ...s, productId: p.id, product: p }));

  return (
    <div className="max-w-[560px] mx-auto pb-4">
      <div className="flex items-center gap-2 mb-3">
        <button className="btn btn-ghost btn-sm" onClick={idx === 0 ? onClose : () => setIdx((i) => i - 1)}><ChevronLeft size={20} /></button>
        <div className="flex-1 text-center"><div className="text-[11px] font-bold uppercase tracking-wide text-[var(--faint)]">{t('step', { n: idx + 1, total: steps.length })}</div><div className="text-[13px] font-semibold">{f.id ? t('editTitle') : t('createTitle')}</div></div>
        <button className="btn btn-ghost btn-sm" onClick={() => save.mutate()} title={t('saveDraft')} disabled={!f.productId || save.isPending}>{save.isPending ? <Loader2 size={16} className="animate-spin" /> : t('saveDraftShort')}</button>
      </div>
      <div className="mb-5"><ProgressBar value={((idx + 1) / steps.length) * 100} /></div>

      <div key={screen} className="anim-in">
        <h2 className="text-[22px] font-extrabold tracking-tight mb-1">{t('title_' + screen)}</h2>
        {f.product && screen !== 'product' && <p className="text-[13px] text-[var(--muted)] mb-4">{f.product.name} · <span className="mono">{f.product.gtin}</span></p>}
        <div className="mt-2">
          {screen === 'product' && <ProductStep products={products.data ?? []} selected={f.productId} onSelect={selectProduct} onGtin={(g: string) => api.get('/products/by-gtin', { params: { gtin: g } }).then((r) => selectProduct(r.data)).catch(() => toast(t('gtinNotFound'), false))} />}
          {screen === 'scope' && <ScopeStep f={f} setF={setF} />}
          {screen === 'content' && <ContentStep f={f} setF={setF} qrUrl={qrUrl} />}
          {screen === 'publish' && <PublishStep f={f} setF={setF} />}
        </div>
      </div>

      <div className="sticky bottom-3 mt-6 flex gap-2.5" style={{ zIndex: 5 }}>
        {idx > 0 && <button className="btn" style={{ minHeight: 52 }} onClick={() => setIdx((i) => i - 1)}><ChevronLeft size={18} />{t('back')}</button>}
        {screen !== 'publish'
          ? <button className="btn btn-primary btn-lg" disabled={!canNext} onClick={async () => { if (screen === 'content') { try { await saveDraft(); } catch (e) { toast(apiError(e), false); return; } } setIdx((i) => i + 1); }}>{t('continue')} <ArrowRight size={18} /></button>
          : <>
              <button className="btn btn-lg" style={{ flex: '0 0 auto', width: 'auto', paddingLeft: 20, paddingRight: 20 }} disabled={save.isPending} onClick={() => save.mutate()}>{t('saveDraft')}</button>
              <button className="btn btn-primary btn-lg" disabled={publish.isPending} onClick={() => publish.mutate()}>{publish.isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} {t('publish')}</button>
            </>}
      </div>
    </div>
  );
}

function ProductStep({ products, selected, onSelect, onGtin }: any) {
  const t = useT(MSG);
  const [q, setQ] = useState('');
  const [gtin, setGtin] = useState('');
  const shown = products.filter((p: any) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || (p.gtin ?? '').includes(q));
  return (
    <div className="flex flex-col gap-3">
      <div className="card p-3.5">
        <div className="text-[13px] font-semibold mb-2">{t('gtinManual')}</div>
        <div className="flex gap-2"><input className="input mono" placeholder="GTIN…" value={gtin} onChange={(e) => setGtin(e.target.value)} /><button className="btn btn-primary" disabled={!gtin} onClick={() => onGtin(gtin)}>{t('gtinGet')}</button></div>
      </div>
      <div className="flex items-center gap-2 rounded-full px-4 py-2.5" style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
        <Search size={16} className="text-[var(--muted)]" />
        <input className="flex-1 bg-transparent outline-none text-sm" placeholder={t('productSearchPh')} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="flex flex-col gap-2 overflow-y-auto pr-1" style={{ maxHeight: 320 }}>
        {shown.map((p: any) => (
          <button key={p.id} onClick={() => onSelect(p)} className={`opt ${selected === p.id ? 'sel' : ''}`}>
            {p.image ? <img src={fileUrl(p.image)} alt="" className="w-10 h-10 rounded-lg object-cover flex-none" /> : <span className="w-10 h-10 rounded-lg grid place-items-center flex-none" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><Package size={18} /></span>}
            <div className="flex-1"><b className="text-sm">{p.name}</b><div className="text-xs text-[var(--muted)] mono">{p.gtin} · {p.organization?.name ?? ''} · {p.elabelStatus === 'published' ? t('publishedShort') : p.elabelStatus}</div></div>
            {selected === p.id && <Check size={18} className="text-[var(--accent)]" />}
          </button>
        ))}
        {shown.length === 0 && <p className="text-sm text-[var(--muted)] py-2">{t('noProducts')}</p>}
      </div>
    </div>
  );
}

function ScopeStep({ f, setF }: any) {
  const t = useT(MSG);
  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl value={f.scope} onChange={(v: string) => setF({ ...f, scope: v })} options={SCOPE_KEYS.map((value) => ({ value, label: t('scope' + value) }))} />
      {f.scope !== 'ALL' && <p className="text-[12px] text-[var(--muted)]">{t('scopeHint')}</p>}
      {(f.scope === 'BATCH' || f.scope === 'ITEM') && <L label={t('lblBatchCode')}><input className="input mono" value={f.batchCode} onChange={(e) => setF({ ...f, batchCode: e.target.value })} placeholder="LOT-2026-001" /></L>}
      {f.scope === 'ITEM' && <L label={t('lblSerial')}><input className="input mono" value={f.serial} onChange={(e) => setF({ ...f, serial: e.target.value })} /></L>}
      {(f.scope === 'PRODUCTION') && <L label={t('lblMfgDate')}><input className="input" type="date" value={f.manufacturingDate} onChange={(e) => setF({ ...f, manufacturingDate: e.target.value })} /></L>}
      <div className="grid grid-cols-2 gap-3">
        <L label={t('lblExpiry')}><input className="input" type="date" value={f.expiryDate} onChange={(e) => setF({ ...f, expiryDate: e.target.value })} /></L>
        <L label={t('lblPackaging')}><input className="input" type="date" value={f.packagingDate} onChange={(e) => setF({ ...f, packagingDate: e.target.value })} /></L>
      </div>
      <L label={t('lblNote')}><textarea className="input" rows={2} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></L>
    </div>
  );
}

function ContentStep({ f, setF, qrUrl }: any) {
  const t = useT(MSG);
  const [preview, setPreview] = useState(false);
  const variables = VAR_KEYS.map(([tok, key]) => [tok, t(key)] as [string, string]);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] text-[var(--muted)]">{t('contentHint')}</p>
        <button className="btn btn-sm flex-none" onClick={() => setPreview((p) => !p)}><Eye size={14} />{preview ? t('close') : t('preview')}</button>
      </div>
      <RichEditor value={f.contentHtml} onChange={(html: string) => setF((s: any) => ({ ...s, contentHtml: html }))} variables={variables} template={webTemplate(t)} />
      {preview && (
        <div className="card p-4">
          <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--faint)] mb-2">{t('previewTitle')}</div>
          <div className="np-content text-sm" style={{ lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: renderPreview(f.contentHtml, f, qrUrl, t('previewEmpty')) }} />
        </div>
      )}
    </div>
  );
}

const COLORS = ['#1B1A18', '#BC3B30', '#2E7D5B', '#14486F', '#B47714'];
function RichEditor({ value, onChange, variables, template }: { value: string; onChange: (html: string) => void; variables?: [string, string][]; template?: string }) {
  const t = useT(MSG);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value || ''; /* eslint-disable-next-line */ }, []);
  const emit = () => onChange(ref.current?.innerHTML ?? '');
  const exec = (cmd: string, val?: string) => { ref.current?.focus(); document.execCommand(cmd, false, val); emit(); };
  const Btn = ({ cmd, val, children, title }: any) => <button type="button" title={title} className="ws-tb" onMouseDown={(e) => { e.preventDefault(); exec(cmd, val); }}>{children}</button>;
  const selStyle = { height: 30, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink-2)', fontSize: 12, padding: '0 6px' } as any;
  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex flex-wrap items-center gap-0.5 p-1.5" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <select style={selStyle} title={t('edStyle')} value="" onChange={(e) => { exec('formatBlock', e.target.value); e.currentTarget.value = ''; }}>
          <option value="" disabled>{t('edStyleOpt')}</option>
          <option value="H2">{t('edH2')}</option>
          <option value="H3">{t('edH3')}</option>
          <option value="P">{t('edP')}</option>
          <option value="BLOCKQUOTE">{t('edQuote')}</option>
        </select>
        <Btn cmd="bold" title={t('edBold')}><Bold size={15} /></Btn>
        <Btn cmd="italic" title={t('edItalic')}><Italic size={15} /></Btn>
        <Btn cmd="underline" title={t('edUnderline')}><Underline size={15} /></Btn>
        {COLORS.map((c) => <button key={c} type="button" className="ws-tb" title={t('edColor')} onMouseDown={(e) => { e.preventDefault(); exec('foreColor', c); }}><span style={{ width: 13, height: 13, borderRadius: 3, background: c, display: 'block' }} /></button>)}
        <span className="ws-sep" />
        <Btn cmd="insertUnorderedList" title={t('edList')}><List size={15} /></Btn>
        <Btn cmd="insertOrderedList" title={t('edListOrdered')}><ListOrdered size={15} /></Btn>
        <span className="ws-sep" />
        <Btn cmd="justifyLeft" title={t('edLeft')}><AlignLeft size={15} /></Btn>
        <Btn cmd="justifyCenter" title={t('edCenter')}><AlignCenter size={15} /></Btn>
        <Btn cmd="justifyRight" title={t('edRight')}><AlignRight size={15} /></Btn>
        <span className="ws-sep" />
        <button type="button" className="ws-tb" title={t('edLink')} onMouseDown={(e) => { e.preventDefault(); const u = window.prompt(t('edLinkPrompt')); if (u) exec('createLink', u); }}><Link2 size={15} /></button>
        <button type="button" className="ws-tb" title={t('edImage')} onMouseDown={(e) => { e.preventDefault(); const u = window.prompt(t('edImagePrompt')); if (u) exec('insertImage', u); }}><ImageIcon size={15} /></button>
        <button type="button" className="ws-tb" title={t('edHr')} onMouseDown={(e) => { e.preventDefault(); exec('insertHorizontalRule'); }}><Minus size={15} /></button>
        <button type="button" className="ws-tb" title={t('edSymbol')} onMouseDown={(e) => { e.preventDefault(); const s = window.prompt(t('edSymbolPrompt')); if (s) exec('insertText', s); }}>Ω</button>
        <span className="ws-sep" />
        <Btn cmd="undo" title={t('edUndo')}><Undo2 size={15} /></Btn>
        <Btn cmd="redo" title={t('edRedo')}><Redo2 size={15} /></Btn>
        <Btn cmd="removeFormat" title={t('edClear')}><Eraser size={15} /></Btn>
      </div>
      {(template || (variables && variables.length > 0)) && (
        <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
          {template && <button type="button" className="btn btn-sm" onMouseDown={(e) => { e.preventDefault(); if (!ref.current?.textContent?.trim() || window.confirm(t('edInsertTemplateConfirm'))) exec('insertHTML', template); }}><FilePlus2 size={13} />{t('edInsertTemplate')}</button>}
          {variables?.map(([t, l]) => <button key={t} type="button" className="chip" title={t} onMouseDown={(e) => { e.preventDefault(); exec('insertText', t); }}>{l}</button>)}
        </div>
      )}
      <div ref={ref} contentEditable suppressContentEditableWarning className="np-content p-3.5 text-sm outline-none" style={{ minHeight: 220, lineHeight: 1.6 }} onInput={emit} />
    </div>
  );
}

function renderPreview(html: string, f: any, qrUrl: string, emptyText: string) {
  const p = f.product ?? {};
  const map: Record<string, string> = {
    product_name: p.name ?? '', gtin: p.gtin ?? '', batch_number: f.batchCode ?? '',
    manufacturing_date: f.manufacturingDate ? new Date(f.manufacturingDate).toLocaleDateString('vi-VN') : '',
    expiry_date: f.expiryDate ? new Date(f.expiryDate).toLocaleDateString('vi-VN') : '',
    manufacturer_name: p.organization?.name ?? '', manufacturer_address: '',
    origin: p.countryOfOrigin ?? '', qr_code: qrUrl ? `<img src="${qrUrl}" style="width:96px;height:96px" />` : '',
  };
  return (html || `<span style="color:#98A2B6">${emptyText}</span>`).replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_m, k) => map[k.toLowerCase()] ?? '');
}


function PublishStep({ f, setF }: any) {
  const t = useT(MSG);
  return (
    <div className="flex flex-col gap-3">
      <L label={t('lblLabelName')}><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></L>
      <div className="card p-4 flex flex-col divide-y" style={{ borderColor: 'var(--border)' }}>
        <Row k={t('rowProduct')} v={f.product?.name} />
        <Row k="GTIN" v={f.product?.gtin} mono />
        <Row k={t('rowScope')} v={t('scope' + f.scope)} />
        {f.batchCode && <Row k={t('rowBatch')} v={f.batchCode} mono />}
      </div>
      <p className="text-[12px] text-[var(--muted)]">{t('publishHint')}</p>
    </div>
  );
}

function L({ label, children }: any) { return <label className="block"><span className="label">{label}</span>{children}</label>; }
