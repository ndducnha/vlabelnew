import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles, GitBranch, Tag, FileText, Check, ChevronLeft, ArrowRight, Loader2, Search, Package,
  Building2, Plus, ClipboardEdit, Eye, Send, ArrowUp, ArrowDown, ExternalLink, RotateCcw, CalendarClock, ListChecks,
} from '../lib/icons';
import { api, apiError } from '../lib/api';
import { useToast } from '../lib/toast';
import { useAuth } from '../lib/auth';
import { useT, type Messages } from '../lib/i18n';
import { Spinner, ProgressBar, Row } from '../components/ui';
import { F, NewFlow, AddEvent, CloneElabel, MiniRTE, renderVars } from './Helper.parts';
import { APPENDIX_GROUPS, appendixGroupByCode } from '@vlabel/shared';

const RISK = ['risk.0', 'risk.1', 'risk.2', 'risk.3'];
const LS_KEY = 'vlabel.helper.v1';

type Mode = 'trace' | 'elabel' | 'supp';

interface Draft {
  mode: Mode | null;
  step: number;
  product: { id: string; name: string; gtin: string; traceMode?: string } | null;
  flowId: string;
  eventIds: string[];
  scopeType: 'gtin' | 'lot' | 'mfg' | 'serial';
  lot: string; mfgDate: string; serial: string;
  assigneeId: string; deadline: string; note: string;
  el: any; elLoaded: boolean;
  sp: { name: string; scope: string; batchCode: string; mfgDate: string; serial: string; contentHtml: string };
}

const INIT: Draft = {
  mode: null, step: 0, product: null, flowId: '', eventIds: [],
  scopeType: 'lot', lot: '', mfgDate: '', serial: '', assigneeId: '', deadline: '', note: '',
  el: { name: '', brand: '', description: '', countryOfOrigin: '', hsCode: '', targetMarket: '', supplier: '', riskLevel: 0, netContent: '', ingredients: '', usageInstructions: '', storageInstructions: '', safetyWarnings: '', appendixGroup: '', appendixAttributes: {}, owner: { name: '', tax_code: '', address: '', representative: '' }, attributes: [], images: [], certificates: [] },
  elLoaded: false,
  sp: { name: 'Nhãn phụ tiếng Việt', scope: 'ALL', batchCode: '', mfgDate: '', serial: '', contentHtml: '' },
};

const STEPS: Record<Mode, string[]> = {
  trace: ['trace.0', 'trace.1', 'trace.2', 'trace.3', 'trace.4', 'trace.5'],
  elabel: ['elabel.0', 'elabel.1', 'elabel.2', 'elabel.3', 'elabel.4', 'elabel.5', 'elabel.6', 'elabel.7', 'elabel.8', 'elabel.9', 'elabel.10'],
  supp: ['supp.0', 'supp.1', 'supp.2', 'supp.3', 'supp.4'],
};

const MSG: Messages = {
  vi: {
    assistant: 'Trợ lý VLabel',
    'trace.0': 'Chọn sản phẩm', 'trace.1': 'Luồng truy xuất', 'trace.2': 'Thiết lập sự kiện', 'trace.3': 'Phạm vi áp dụng', 'trace.4': 'Phân công khai báo', 'trace.5': 'Xác nhận',
    'elabel.0': 'Chọn sản phẩm', 'elabel.1': 'Loại nhãn', 'elabel.2': 'Tên & nhãn hiệu', 'elabel.3': 'Doanh nghiệp', 'elabel.4': 'Thành phần & định lượng', 'elabel.5': 'Công dụng & bảo quản', 'elabel.6': 'Cảnh báo & rủi ro', 'elabel.7': 'Xuất xứ & nhóm hàng', 'elabel.8': 'Phạm vi áp dụng', 'elabel.9': 'Giao diện & xem trước', 'elabel.10': 'Xác nhận & phát hành',
    'supp.0': 'Chọn sản phẩm', 'supp.1': 'Phạm vi áp dụng', 'supp.2': 'Soạn nội dung', 'supp.3': 'Xem trước', 'supp.4': 'Lưu & phát hành',
    'risk.0': 'Chưa xác định', 'risk.1': 'Cao', 'risk.2': 'Trung bình', 'risk.3': 'Thấp',
    chosen: 'Đã chọn {name}', gtinNotFound: 'Không tìm thấy sản phẩm với GTIN này. Hãy khai báo sản phẩm mới.', productCreated: '🎉 Đã tạo sản phẩm', draftSaved: 'Đã lưu nháp nhãn', clonedElabel: 'Đã sao chép nội dung nhãn mẫu',
    doneTrace: 'Đã thiết lập truy xuất', doneElabel: 'Đã phát hành nhãn điện tử', doneSupp: 'Đã phát hành nhãn phụ', viewStatus: 'Xem trạng thái khai báo', viewPublicQr: 'Xem trang QR công khai', setupAnother: 'Thiết lập mục khác',
    optTraceLabel: 'Truy xuất nguồn gốc', optTraceDesc: 'Gán Luồng, sự kiện, lô và phân công khai báo.', optElabelLabel: 'Nhãn điện tử', optElabelDesc: 'Soạn nội dung nhãn theo từng bước và phát hành.', optSuppLabel: 'Nhãn phụ', optSuppDesc: 'Soạn nhãn phụ tiếng Việt hiển thị trên cùng mã QR.',
    startQuestion: 'Bạn muốn thực hiện chức năng nào?', continueDraft: 'Tiếp tục thiết lập đang dở',
    stepOf: 'Bước {a} / {b}', lotInline: ' · Lô {v}', changeItem: 'Đổi mục', back: 'Trước', saveDraft: 'Lưu nháp', continueBtn: 'Tiếp tục', finishSetup: 'Hoàn tất thiết lập', publishLabel: 'Phát hành nhãn', publish: 'Phát hành',
    vnpcIntro: 'Chọn GTIN từ VNPC rồi chọn đơn vị sở hữu. Sản phẩm sẽ được tạo và tự chọn để tiếp tục.', searchVnpc: 'Tìm GTIN / tên trên VNPC…', typeToFind: 'Gõ để tìm GTIN.', owningUnit: 'Đơn vị sở hữu', chooseUnit: '— chọn đơn vị —', cancel: 'Huỷ', createSelect: 'Tạo & chọn',
    searchProduct: 'Tìm sản phẩm theo tên / GTIN…', noProduct: 'Không tìm thấy sản phẩm.', orManualGtin: 'Hoặc nhập GTIN thủ công', gtinPlaceholder: 'GTIN…', lookup: 'Tra cứu', newProduct: 'Khai báo sản phẩm mới',
    eventsCount: '{n} sự kiện', fieldsCount: '{n} trường', flowsCount: '{n} luồng',
    hasFlow: 'Sản phẩm đã có Luồng. Chọn Luồng để dùng (hoặc chọn Luồng khác bên dưới).', noFlowPick: 'Sản phẩm chưa có Luồng. Chọn một Luồng có sẵn để gán:', flowListLabel: 'Chọn từ danh sách Luồng',
    eventsIntro: 'Chọn sự kiện áp dụng, sắp xếp thứ tự hoặc thêm mới. Cấu hình chi tiết từng sự kiện diễn ra khi kê khai.', noEvents: 'Luồng chưa có sự kiện. Thêm sự kiện bên dưới.',
    traceScopeIntro: 'Dữ liệu truy xuất áp dụng theo:', scopeLotOpt: 'Lô sản phẩm', scopeMfgOpt: 'Ngày sản xuất', scopeGtinOpt: 'GTIN chung', scopeSerialOpt: 'Serial / mã định danh',
    lotNumber: 'Số lô', lotPlaceholder: 'VD: LOT-2408-01', mfgDate: 'Ngày sản xuất', serial: 'Serial', gtinAllHint: 'Áp dụng cho toàn bộ GTIN, không phân biệt lô.',
    assignIntro: 'Chọn người chịu trách nhiệm khai báo và thời hạn.', searchUser: 'Tìm theo tên / email…', noUser: 'Không có người dùng phù hợp.', deadline: 'Thời hạn khai báo', noteOptional: 'Ghi chú (tuỳ chọn)', notePlaceholder: 'Nhắc việc cho người được giao…',
    rProduct: 'Sản phẩm', rGtin: 'GTIN', rFlow: 'Luồng', rEvent: 'Sự kiện', rScope: 'Phạm vi', rAssignee: 'Người phụ trách', rDeadline: 'Thời hạn', defaultDeadline: 'Mặc định +14 ngày',
    scopeLot: 'Lô {v}', scopeMfg: 'Ngày SX {v}', scopeSerial: 'Serial {v}', scopeGtinCommon: 'GTIN chung',
    elabelStartIntro: 'Nhãn điện tử gắn trực tiếp với sản phẩm. Chọn cách bắt đầu:', editExisting: 'Chỉnh sửa nhãn hiện có', composeForProduct: 'Soạn nhãn cho sản phẩm này', shortSteps: 'Điền nội dung theo từng bước ngắn.',
    fProductName: 'Tên sản phẩm *', fBrand: 'Nhãn hiệu', fDescription: 'Mô tả ngắn', fBizName: 'Tên doanh nghiệp', fTaxCode: 'Mã số thuế', fAddress: 'Địa chỉ', fRepresentative: 'Người đại diện',
    fIngredients: 'Thành phần / cấu tạo', fNetContent: 'Định lượng (khối lượng / thể tích / số lượng)', netContentPlaceholder: 'VD: 50ml · 20 viên · 5kg', fUsage: 'Hướng dẫn sử dụng', fStorage: 'Hướng dẫn bảo quản',
    fSafety: 'Cảnh báo an toàn', safetyPlaceholder: 'Bắt buộc với hàng rủi ro cao / trung bình', fRisk: 'Mức rủi ro', fOrigin: 'Xuất xứ', fAppendixGroup: 'Nhóm hàng hóa (Phụ lục I NĐ 37)', chooseGroup: '— chọn nhóm hàng hóa —',
    elabelScopeIntro: 'Nhãn điện tử áp dụng cho:', scopeGtinAll: 'GTIN chung (mọi lô)', scopeByLot: 'Theo lô sản phẩm', scopeByMfg: 'Theo ngày sản xuất', scopeBySerial: 'Theo serial',
    previewIntro: 'Nhãn dùng giao diện chuẩn Vlabel (mobile-first, tự đồng bộ nội dung đã nhập). Xem trước trang hiển thị:', openQrNewTab: 'Mở trang QR trong tab mới',
    rBiz: 'Doanh nghiệp', rNetContent: 'Định lượng', rGroup: 'Nhóm hàng', publishHint: 'Bấm "Phát hành nhãn" để lưu nội dung, gắn vào mã QR sản phẩm và công bố công khai.',
    fSuppName: 'Tên nhãn phụ', suppScopeIntro: 'Nhãn phụ áp dụng theo:', suppAll: 'Toàn bộ GTIN', suppBatch: 'Theo lô', suppProduction: 'Theo ngày sản xuất', suppItem: 'Theo serial', lotNumberReq: 'Số lô *',
    suppComposeIntro: 'Soạn nội dung hiển thị khi quét QR. Có thể chèn mẫu web rồi chỉnh.', rLabelName: 'Tên nhãn', suppPublishHint: 'Nhãn phụ hiển thị trên cùng mã QR của sản phẩm. Chọn "Lưu nháp" hoặc "Phát hành".',
  },
  en: {
    assistant: 'VLabel Assistant',
    'trace.0': 'Select product', 'trace.1': 'Traceability flow', 'trace.2': 'Configure events', 'trace.3': 'Scope', 'trace.4': 'Assign data entry', 'trace.5': 'Confirm',
    'elabel.0': 'Select product', 'elabel.1': 'Label type', 'elabel.2': 'Name & brand', 'elabel.3': 'Business', 'elabel.4': 'Ingredients & quantity', 'elabel.5': 'Usage & storage', 'elabel.6': 'Warnings & risk', 'elabel.7': 'Origin & product group', 'elabel.8': 'Scope', 'elabel.9': 'Layout & preview', 'elabel.10': 'Confirm & publish',
    'supp.0': 'Select product', 'supp.1': 'Scope', 'supp.2': 'Compose content', 'supp.3': 'Preview', 'supp.4': 'Save & publish',
    'risk.0': 'Undetermined', 'risk.1': 'High', 'risk.2': 'Medium', 'risk.3': 'Low',
    chosen: 'Selected {name}', gtinNotFound: 'No product found with this GTIN. Please register a new product.', productCreated: '🎉 Product created', draftSaved: 'Label draft saved', clonedElabel: 'Template label content copied',
    doneTrace: 'Traceability set up', doneElabel: 'E-label published', doneSupp: 'Supplementary label published', viewStatus: 'View data-entry status', viewPublicQr: 'View public QR page', setupAnother: 'Set up another item',
    optTraceLabel: 'Traceability', optTraceDesc: 'Assign Flow, events, lot and delegate data entry.', optElabelLabel: 'E-label', optElabelDesc: 'Compose label content step by step and publish.', optSuppLabel: 'Supplementary label', optSuppDesc: 'Compose a Vietnamese supplementary label shown on the same QR.',
    startQuestion: 'Which function would you like to use?', continueDraft: 'Continue unfinished setup',
    stepOf: 'Step {a} / {b}', lotInline: ' · Lot {v}', changeItem: 'Change item', back: 'Back', saveDraft: 'Save draft', continueBtn: 'Continue', finishSetup: 'Finish setup', publishLabel: 'Publish label', publish: 'Publish',
    vnpcIntro: 'Select a GTIN from VNPC then choose the owning unit. The product will be created and auto-selected to continue.', searchVnpc: 'Search GTIN / name on VNPC…', typeToFind: 'Type to search GTIN.', owningUnit: 'Owning unit', chooseUnit: '— select unit —', cancel: 'Cancel', createSelect: 'Create & select',
    searchProduct: 'Search product by name / GTIN…', noProduct: 'No products found.', orManualGtin: 'Or enter GTIN manually', gtinPlaceholder: 'GTIN…', lookup: 'Look up', newProduct: 'Register new product',
    eventsCount: '{n} events', fieldsCount: '{n} fields', flowsCount: '{n} flows',
    hasFlow: 'The product already has a Flow. Select a Flow to use (or pick another below).', noFlowPick: 'The product has no Flow yet. Select an existing Flow to attach:', flowListLabel: 'Select from the Flow list',
    eventsIntro: 'Select applicable events, reorder them or add new ones. Detailed configuration of each event happens during data entry.', noEvents: 'The Flow has no events yet. Add an event below.',
    traceScopeIntro: 'Traceability data applies by:', scopeLotOpt: 'Product lot', scopeMfgOpt: 'Manufacturing date', scopeGtinOpt: 'Common GTIN', scopeSerialOpt: 'Serial / identifier',
    lotNumber: 'Lot number', lotPlaceholder: 'e.g. LOT-2408-01', mfgDate: 'Manufacturing date', serial: 'Serial', gtinAllHint: 'Applies to the entire GTIN, regardless of lot.',
    assignIntro: 'Choose the person responsible for data entry and the deadline.', searchUser: 'Search by name / email…', noUser: 'No matching users.', deadline: 'Data-entry deadline', noteOptional: 'Note (optional)', notePlaceholder: 'A reminder for the assignee…',
    rProduct: 'Product', rGtin: 'GTIN', rFlow: 'Flow', rEvent: 'Event', rScope: 'Scope', rAssignee: 'Assignee', rDeadline: 'Deadline', defaultDeadline: 'Default +14 days',
    scopeLot: 'Lot {v}', scopeMfg: 'Mfg date {v}', scopeSerial: 'Serial {v}', scopeGtinCommon: 'Common GTIN',
    elabelStartIntro: 'The e-label is attached directly to the product. Choose how to start:', editExisting: 'Edit existing label', composeForProduct: 'Compose a label for this product', shortSteps: 'Fill in content through short steps.',
    fProductName: 'Product name *', fBrand: 'Brand', fDescription: 'Short description', fBizName: 'Business name', fTaxCode: 'Tax code', fAddress: 'Address', fRepresentative: 'Representative',
    fIngredients: 'Ingredients / composition', fNetContent: 'Net quantity (weight / volume / count)', netContentPlaceholder: 'e.g. 50ml · 20 tablets · 5kg', fUsage: 'Usage instructions', fStorage: 'Storage instructions',
    fSafety: 'Safety warnings', safetyPlaceholder: 'Required for high / medium risk goods', fRisk: 'Risk level', fOrigin: 'Origin', fAppendixGroup: 'Product group (Appendix I, Decree 37)', chooseGroup: '— select product group —',
    elabelScopeIntro: 'The e-label applies to:', scopeGtinAll: 'Common GTIN (all lots)', scopeByLot: 'By product lot', scopeByMfg: 'By manufacturing date', scopeBySerial: 'By serial',
    previewIntro: 'The label uses the standard Vlabel layout (mobile-first, auto-syncing entered content). Preview the display page:', openQrNewTab: 'Open QR page in new tab',
    rBiz: 'Business', rNetContent: 'Net quantity', rGroup: 'Product group', publishHint: 'Tap "Publish label" to save the content, attach it to the product QR and publish publicly.',
    fSuppName: 'Supplementary label name', suppScopeIntro: 'The supplementary label applies by:', suppAll: 'Entire GTIN', suppBatch: 'By lot', suppProduction: 'By manufacturing date', suppItem: 'By serial', lotNumberReq: 'Lot number *',
    suppComposeIntro: 'Compose the content shown when the QR is scanned. You can insert a web template then edit.', rLabelName: 'Label name', suppPublishHint: 'The supplementary label is shown on the product QR. Choose "Save draft" or "Publish".',
  },
};

const loadDraft = (): Draft | null => { try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch { return null; } };

export default function Helper() {
  const nav = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const t = useT(MSG);
  const [draft, setDraft] = useState<Draft>(() => loadDraft() ?? INIT);
  const [done, setDone] = useState<Mode | null>(null);
  const [busy, setBusy] = useState(false);
  // Trạng thái phụ cho việc tạo sản phẩm mới
  const [creating, setCreating] = useState(false);
  const [vnpcQ, setVnpcQ] = useState('');
  const [picked, setPicked] = useState<any>(null);
  const [newOrgId, setNewOrgId] = useState('');
  const [gtinManual, setGtinManual] = useState('');
  const [productQ, setProductQ] = useState('');
  const [userQ, setUserQ] = useState('');

  useEffect(() => { localStorage.setItem(LS_KEY, JSON.stringify(draft)); }, [draft]);
  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));
  const patchEl = (p: any) => setDraft((d) => ({ ...d, el: { ...d.el, ...p } }));
  const patchSp = (p: any) => setDraft((d) => ({ ...d, sp: { ...d.sp, ...p } }));

  const { mode, step, product } = draft;

  const products = useQuery({ queryKey: ['products'], queryFn: () => api.get('/products').then((r) => r.data) });
  const orgs = useQuery({ queryKey: ['orgs'], queryFn: () => api.get('/organizations').then((r) => r.data) });
  const flowsAll = useQuery({ queryKey: ['flows-all'], queryFn: () => api.get('/flows').then((r) => r.data) });
  const branchUsers = useQuery({ queryKey: ['users-branch'], queryFn: () => api.get('/users/branch').then((r) => r.data), enabled: mode === 'trace' });
  const productDetail = useQuery({ queryKey: ['product', product?.id], enabled: !!product?.id, queryFn: () => api.get(`/products/${product!.id}`).then((r) => r.data) });
  const flowDetail = useQuery({ queryKey: ['flow', draft.flowId], enabled: !!draft.flowId, queryFn: () => api.get(`/flows/${draft.flowId}`).then((r) => r.data) });
  const vnpc = useQuery({ queryKey: ['vnpc', vnpcQ], enabled: creating, queryFn: () => api.get('/integrations/vnpc/products', { params: { q: vnpcQ } }).then((r) => r.data) });
  const elabelDetail = useQuery({ queryKey: ['elabel', product?.id], enabled: mode === 'elabel' && !!product?.id, queryFn: () => api.get(`/elabels/${product!.id}`).then((r) => r.data) });

  // Nạp dữ liệu nhãn điện tử từ server một lần khi chọn sản phẩm (autosave & tiếp tục sau)
  useEffect(() => {
    if (mode === 'elabel' && elabelDetail.data && !draft.elLoaded) {
      const d = elabelDetail.data; const o = d.ownerInfo ?? {};
      patch({
        elLoaded: true,
        el: {
          name: d.name ?? '', brand: d.brand ?? '', description: d.description ?? '', countryOfOrigin: d.countryOfOrigin ?? '',
          hsCode: d.hsCode ?? '', targetMarket: d.targetMarket ?? '', supplier: d.supplier ?? '', riskLevel: d.riskLevel ?? 0,
          netContent: d.netContent ?? '', ingredients: d.ingredients ?? '', usageInstructions: d.usageInstructions ?? '',
          storageInstructions: d.storageInstructions ?? '', safetyWarnings: d.safetyWarnings ?? '',
          appendixGroup: d.appendixGroup ?? '', appendixAttributes: (d.appendixAttributes && typeof d.appendixAttributes === 'object') ? d.appendixAttributes : {},
          owner: { name: o.name ?? '', tax_code: o.tax_code ?? '', address: o.address ?? '', representative: o.representative ?? '' },
          attributes: Array.isArray(d.labelAttributes) ? d.labelAttributes : [],
          images: Array.isArray(d.labelImages) ? d.labelImages : [],
          certificates: Array.isArray(d.certificates) ? d.certificates : [],
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, elabelDetail.data]);

  const version = flowDetail.data?.versions?.[0];
  const events: any[] = useMemo(() => (version?.eventDefinitions ?? []).slice().sort((a: any, b: any) => a.order - b.order), [version]);
  // Mặc định chọn tất cả công đoạn khi flow được nạp
  useEffect(() => {
    if (mode === 'trace' && events.length && draft.eventIds.length === 0) patch({ eventIds: events.map((e) => e.id) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.length]);

  const productFlows = (productDetail.data?.flows ?? []).map((x: any) => x.flow);
  const total = mode ? STEPS[mode].length : 0;
  const title = mode ? t(STEPS[mode][step]) : t('assistant');

  const selectProduct = (p: any) => { patch({ product: { id: p.id, name: p.name, gtin: p.gtin, traceMode: p.traceMode }, flowId: '', eventIds: [], elLoaded: false }); setCreating(false); };

  const resolveGtin = async () => {
    const g = gtinManual.trim(); if (!g) return;
    try { const { data } = await api.get('/products/by-gtin', { params: { gtin: g } }); selectProduct(data); toast(t('chosen', { name: data.name })); }
    catch { toast(t('gtinNotFound'), false); setCreating(true); }
  };

  const createProduct = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/products', { gtin: picked.gtin, name: picked.name, organizationId: newOrgId, description: picked.description ?? '', dynamicAttributes: picked.attributes ?? {} });
      return data;
    },
    onSuccess: (p) => { toast(t('productCreated')); qc.invalidateQueries({ queryKey: ['products'] }); selectProduct(p); setPicked(null); },
    onError: (e) => toast(apiError(e), false),
  });

  // ── Điều hướng bước ──
  const goBack = () => { if (step === 0) { patch({ mode: null }); } else patch({ step: step - 1 }); };

  const saveElabel = async () => {
    if (!product) return;
    const el = draft.el;
    await api.patch(`/elabels/${product.id}`, {
      name: el.name, brand: el.brand, description: el.description, countryOfOrigin: el.countryOfOrigin, hsCode: el.hsCode,
      targetMarket: el.targetMarket, supplier: el.supplier, riskLevel: Number(el.riskLevel || 0), netContent: el.netContent,
      ingredients: el.ingredients, usageInstructions: el.usageInstructions, storageInstructions: el.storageInstructions,
      safetyWarnings: el.safetyWarnings, appendixGroup: el.appendixGroup || null, appendixAttributes: el.appendixAttributes || {},
      ownerInfo: el.owner || {}, labelAttributes: el.attributes || [], labelImages: el.images || [], certificates: el.certificates || [],
    });
  };

  const attachFlow = async () => {
    if (!product || !draft.flowId) return;
    const has = productFlows.some((f: any) => f.id === draft.flowId);
    if (!has) { await api.put(`/products/${product.id}/flows`, { flowIds: [draft.flowId] }); qc.invalidateQueries({ queryKey: ['product', product.id] }); }
  };

  const goNext = async () => {
    if (!mode) return;
    setBusy(true);
    try {
      if (mode === 'trace' && step === 1) await attachFlow();
      if (mode === 'elabel' && step >= 2 && step <= 8) await saveElabel();
      patch({ step: step + 1 });
    } catch (e) { toast(apiError(e), false); }
    finally { setBusy(false); }
  };

  // ── Hoàn tất ──
  const finishTrace = useMutation({
    mutationFn: async () => {
      const startISO = new Date().toISOString();
      const endISO = draft.deadline ? new Date(draft.deadline).toISOString() : new Date(Date.now() + 14 * 864e5).toISOString();
      const names = events.filter((e) => draft.eventIds.includes(e.id)).map((e) => e.name).join(', ');
      await api.post('/trace-tasks', {
        name: `Kê khai ${product!.name}`, productId: product!.id, lot: draft.lot || undefined,
        flowId: draft.flowId || undefined, assignedUserId: draft.assigneeId,
        startDate: startISO, endDate: endISO, note: [draft.note, names && `Sự kiện: ${names}`].filter(Boolean).join(' · ') || undefined,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['trace-tasks'] }); finishAll('trace'); },
    onError: (e) => toast(apiError(e), false),
  });

  const finishElabel = useMutation({
    mutationFn: async () => {
      await saveElabel();
      if (draft.scopeType === 'lot' && draft.lot) { try { await api.post(`/elabels/${product!.id}/batches`, { batchCode: draft.lot, manufacturingDate: draft.mfgDate || undefined, status: 'published' }); } catch { /* lô có thể đã tồn tại */ } }
      await api.post(`/elabels/${product!.id}/status`, { status: 'published' });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['elabels'] }); finishAll('elabel'); },
    onError: (e) => toast(apiError(e), false),
  });

  const saveElabelDraft = useMutation({ mutationFn: saveElabel, onSuccess: () => { qc.invalidateQueries({ queryKey: ['elabels'] }); toast(t('draftSaved')); }, onError: (e) => toast(apiError(e), false) });

  const finishSupp = useMutation({
    mutationFn: async (publish: boolean) => {
      const sp = draft.sp;
      const payload = { productId: product!.id, name: sp.name, scope: sp.scope, batchCode: sp.batchCode || undefined, manufacturingDate: sp.mfgDate || undefined, serial: sp.serial || undefined, contentHtml: sp.contentHtml, labelSize: '80x50', orientation: 'portrait' };
      const { data } = await api.post('/supplementary-labels', payload);
      if (publish) await api.post(`/supplementary-labels/${data.id}/status`, { status: 'published' });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['supp'] }); finishAll('supp'); },
    onError: (e) => toast(apiError(e), false),
  });

  const finishAll = (m: Mode) => { setDone(m); localStorage.removeItem(LS_KEY); };
  const resetAll = () => { setDraft(INIT); setDone(null); setCreating(false); setPicked(null); setGtinManual(''); };

  // ── Validation từng bước ──
  const stripLen = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length;
  const canNext = (() => {
    if (!mode) return false;
    if (step === 0) return !!product;
    if (mode === 'trace') {
      if (step === 1) return !!draft.flowId;
      if (step === 2) return events.length > 0;
      if (step === 4) return !!draft.assigneeId;
      return true;
    }
    if (mode === 'elabel') {
      if (step === 2) return !!draft.el.name?.trim();
      return true;
    }
    if (mode === 'supp') {
      if (step === 1) return draft.sp.scope !== 'BATCH' || !!draft.sp.batchCode.trim();
      if (step === 2) return stripLen(draft.sp.contentHtml) > 0;
      return true;
    }
    return true;
  })();

  const isFinishStep = mode && step === total - 1;

  // ════════ COMPLETION ════════
  if (done) {
    const gtin = product?.gtin;
    return (
      <div className="max-w-[480px] mx-auto pb-6">
        <div className="min-h-[46vh] grid place-items-center text-center px-4">
          <div>
            <div className="w-20 h-20 rounded-3xl grid place-items-center mx-auto mb-4 pop" style={{ background: 'var(--good-soft)', color: 'var(--good)' }}><Check size={40} /></div>
            <h2 className="text-2xl font-extrabold">{done === 'trace' ? t('doneTrace') : done === 'elabel' ? t('doneElabel') : t('doneSupp')}</h2>
            <p className="text-[var(--muted)] mt-1.5">{product?.name} · <span className="mono">{gtin}</span></p>
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          {done === 'trace' && <button className="btn btn-lg" onClick={() => nav('/tasks')}><ListChecks size={18} />{t('viewStatus')}</button>}
          {gtin && <a className="btn btn-lg" href={`/t/${gtin}`} target="_blank" rel="noreferrer"><Eye size={18} />{t('viewPublicQr')}</a>}
          <button className="btn btn-primary btn-lg" onClick={resetAll}><Sparkles size={18} />{t('setupAnother')}</button>
        </div>
      </div>
    );
  }

  // ════════ START ════════
  if (!mode) {
    const OPTS: { m: Mode; icon: any; label: string; desc: string }[] = [
      { m: 'trace', icon: GitBranch, label: t('optTraceLabel'), desc: t('optTraceDesc') },
      { m: 'elabel', icon: Tag, label: t('optElabelLabel'), desc: t('optElabelDesc') },
      { m: 'supp', icon: FileText, label: t('optSuppLabel'), desc: t('optSuppDesc') },
    ];
    return (
      <div className="max-w-[480px] mx-auto pb-6">
        <div className="text-center mb-6 mt-2">
          <div className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-3" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><Sparkles size={26} /></div>
          <h1 className="text-[24px] font-extrabold tracking-tight">{t('assistant')}</h1>
          <p className="text-[var(--muted)] mt-1 text-[14px]">{t('startQuestion')}</p>
        </div>
        <div className="flex flex-col gap-3">
          {OPTS.map((o) => (
            <button key={o.m} className="opt anim-in" style={{ minHeight: 78 }} onClick={() => { patch({ mode: o.m, step: 0 }); }}>
              <span className="w-12 h-12 rounded-2xl grid place-items-center flex-none" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><o.icon size={22} /></span>
              <div className="flex-1 text-left"><b className="text-[15px] block">{o.label}</b><span className="text-[12.5px] text-[var(--muted)] leading-snug">{o.desc}</span></div>
              <ArrowRight size={18} className="text-[var(--faint)] flex-none" />
            </button>
          ))}
        </div>
        {loadDraft() && loadDraft()?.mode && (
          <button className="btn btn-sm mt-5 mx-auto" onClick={() => { const d = loadDraft(); if (d) setDraft(d); }}><RotateCcw size={14} />{t('continueDraft')}</button>
        )}
      </div>
    );
  }

  const shownProducts = (products.data ?? []).filter((p: any) => !productQ || p.name.toLowerCase().includes(productQ.toLowerCase()) || (p.gtin ?? '').includes(productQ));
  const shownUsers = (branchUsers.data ?? []).filter((u: any) => !userQ || u.fullName.toLowerCase().includes(userQ.toLowerCase()) || (u.email ?? '').toLowerCase().includes(userQ.toLowerCase()));

  return (
    <div className="max-w-[480px] mx-auto pb-4">
      {/* App bar */}
      <div className="flex items-center gap-2 mb-3">
        <button className="btn btn-ghost btn-sm" onClick={goBack}><ChevronLeft size={20} /></button>
        <div className="flex-1 text-center">
          <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--faint)]">{t('stepOf', { a: step + 1, b: total })}</div>
          <div className="text-[13px] font-semibold">{mode === 'trace' ? t('optTraceLabel') : mode === 'elabel' ? t('optElabelLabel') : t('optSuppLabel')}</div>
        </div>
        <div className="w-9" />
      </div>
      <div className="mb-5"><ProgressBar value={((step + 1) / total) * 100} /></div>

      <div key={`${mode}-${step}`} className="anim-in">
        <h2 className="text-[22px] font-extrabold tracking-tight mb-1" style={{ textWrap: 'balance' } as any}>{title}</h2>
        {product && step > 0 && <p className="text-[13px] text-[var(--muted)] mb-4">{product.name} · <span className="mono">{product.gtin}</span>{draft.lot ? t('lotInline', { v: draft.lot }) : ''}</p>}
        <div className="mt-1">{renderStep()}</div>
      </div>

      {/* Sticky CTA */}
      <div className="sticky bottom-3 mt-6 flex gap-2.5" style={{ zIndex: 5 }}>
        <button className="btn" style={{ minHeight: 52 }} onClick={goBack}><ChevronLeft size={18} />{step === 0 ? t('changeItem') : t('back')}</button>
        {mode === 'elabel' && step >= 2 && step <= 9 && (
          <button className="btn" style={{ minHeight: 52 }} disabled={saveElabelDraft.isPending} onClick={() => saveElabelDraft.mutate()}>{saveElabelDraft.isPending ? <Loader2 size={16} className="animate-spin" /> : null}{t('saveDraft')}</button>
        )}
        {!isFinishStep ? (
          <button className="btn btn-primary btn-lg" disabled={!canNext || busy} onClick={goNext}>{busy ? <Loader2 size={18} className="animate-spin" /> : null}{t('continueBtn')} <ArrowRight size={18} /></button>
        ) : renderFinishButton()}
      </div>
    </div>
  );

  function renderFinishButton() {
    if (mode === 'trace') return <button className="btn btn-primary btn-lg" disabled={!draft.assigneeId || finishTrace.isPending} onClick={() => finishTrace.mutate()}>{finishTrace.isPending ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} {t('finishSetup')}</button>;
    if (mode === 'elabel') return <button className="btn btn-primary btn-lg" disabled={finishElabel.isPending} onClick={() => finishElabel.mutate()}>{finishElabel.isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} {t('publishLabel')}</button>;
    return (
      <div className="flex gap-2.5 flex-1">
        <button className="btn btn-lg" disabled={finishSupp.isPending} onClick={() => finishSupp.mutate(false)}>{t('saveDraft')}</button>
        <button className="btn btn-primary btn-lg" disabled={finishSupp.isPending} onClick={() => finishSupp.mutate(true)}>{finishSupp.isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} {t('publish')}</button>
      </div>
    );
  }

  function renderStep() {
    if (step === 0) return renderProductPicker();
    if (mode === 'trace') return renderTrace();
    if (mode === 'elabel') return renderElabel();
    return renderSupp();
  }

  // ────────── STEP 0: CHỌN SẢN PHẨM (dùng chung) ──────────
  function renderProductPicker() {
    if (creating) return (
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-[var(--muted)]">{t('vnpcIntro')}</p>
        <div className="flex items-center gap-2 rounded-full px-4 py-2.5" style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
          <Search size={16} className="text-[var(--muted)]" />
          <input className="flex-1 bg-transparent outline-none text-sm" placeholder={t('searchVnpc')} value={vnpcQ} onChange={(e) => setVnpcQ(e.target.value)} />
        </div>
        {vnpc.isFetching ? <Spinner /> : (
          <div className="flex flex-col gap-2 overflow-y-auto pr-1" style={{ maxHeight: 220 }}>
            {(vnpc.data?.items ?? []).map((p: any) => (
              <button key={p.gtin} onClick={() => setPicked(p)} className={`opt ${picked?.gtin === p.gtin ? 'sel' : ''}`}>
                <span className="w-9 h-9 rounded-xl grid place-items-center flex-none" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><Package size={17} /></span>
                <div className="flex-1 min-w-0"><b className="text-sm block truncate">{p.name}</b><div className="text-xs text-[var(--muted)] truncate">{p.company} · <span className="mono">{p.gtin}</span></div></div>
                {picked?.gtin === p.gtin && <Check size={17} className="text-[var(--accent)] flex-none" />}
              </button>
            ))}
            {(vnpc.data?.items ?? []).length === 0 && <p className="text-sm text-[var(--muted)] py-2">{t('typeToFind')}</p>}
          </div>
        )}
        {picked && (
          <label className="block"><span className="label">{t('owningUnit')}</span>
            <select className="input" value={newOrgId} onChange={(e) => setNewOrgId(e.target.value)}>
              <option value="">{t('chooseUnit')}</option>
              {(orgs.data ?? []).map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </label>
        )}
        <div className="flex gap-2">
          <button className="btn flex-1 justify-center" onClick={() => { setCreating(false); setPicked(null); }}>{t('cancel')}</button>
          <button className="btn btn-primary flex-1 justify-center" disabled={!picked || !newOrgId || createProduct.isPending} onClick={() => createProduct.mutate()}>{createProduct.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}{t('createSelect')}</button>
        </div>
      </div>
    );

    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 rounded-full px-4 py-2.5" style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
          <Search size={16} className="text-[var(--muted)]" />
          <input className="flex-1 bg-transparent outline-none text-sm" placeholder={t('searchProduct')} value={productQ} onChange={(e) => setProductQ(e.target.value)} />
        </div>
        {products.isLoading ? <Spinner /> : (
          <div className="flex flex-col gap-2 overflow-y-auto pr-1" style={{ maxHeight: 300 }}>
            {shownProducts.map((p: any) => (
              <button key={p.id} onClick={() => selectProduct(p)} className={`opt ${product?.id === p.id ? 'sel' : ''}`}>
                <span className="w-9 h-9 rounded-xl grid place-items-center flex-none" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><Package size={17} /></span>
                <div className="flex-1 min-w-0"><b className="text-sm block truncate">{p.name}</b><div className="text-xs text-[var(--muted)] mono">{p.gtin} · {t('flowsCount', { n: (p.flows ?? []).length })}</div></div>
                {product?.id === p.id && <Check size={18} className="text-[var(--accent)] flex-none" />}
              </button>
            ))}
            {shownProducts.length === 0 && <p className="text-sm text-[var(--muted)] py-2">{t('noProduct')}</p>}
          </div>
        )}
        <div className="card p-3.5 flex flex-col gap-2.5">
          <span className="label" style={{ margin: 0 }}>{t('orManualGtin')}</span>
          <div className="flex gap-2">
            <input className="input mono flex-1" placeholder={t('gtinPlaceholder')} value={gtinManual} onChange={(e) => setGtinManual(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); resolveGtin(); } }} />
            <button className="btn" disabled={!gtinManual.trim()} onClick={resolveGtin}>{t('lookup')}</button>
          </div>
          <button className="btn btn-sm self-start" onClick={() => { setCreating(true); setNewOrgId(''); }}><Plus size={14} />{t('newProduct')}</button>
        </div>
      </div>
    );
  }

  // ────────── TRACE ──────────
  function renderTrace() {
    if (step === 1) {
      const has = productFlows.length > 0;
      return (
        <div className="flex flex-col gap-3">
          {productDetail.isLoading ? <Spinner /> : has ? (
            <>
              <p className="text-[13px] text-[var(--muted)]">{t('hasFlow')}</p>
              {productFlows.map((f: any) => (
                <button key={f.id} onClick={() => patch({ flowId: f.id, eventIds: [] })} className={`opt ${draft.flowId === f.id ? 'sel' : ''}`}>
                  <span className="w-9 h-9 rounded-xl grid place-items-center flex-none" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><GitBranch size={17} /></span>
                  <div className="flex-1"><b className="text-sm">{f.name}</b></div>
                  {draft.flowId === f.id && <Check size={18} className="text-[var(--accent)]" />}
                </button>
              ))}
            </>
          ) : <p className="text-[13px] text-[var(--muted)]">{t('noFlowPick')}</p>}

          <div className="label mt-1" style={{ margin: 0 }}>{t('flowListLabel')}</div>
          <div className="flex flex-col gap-2 overflow-y-auto pr-1" style={{ maxHeight: 240 }}>
            {(flowsAll.data ?? []).map((f: any) => (
              <button key={f.id} onClick={() => patch({ flowId: f.id, eventIds: [] })} className={`opt ${draft.flowId === f.id ? 'sel' : ''}`}>
                <span className="w-9 h-9 rounded-xl grid place-items-center flex-none" style={{ background: 'var(--surface)', color: 'var(--muted)' }}><GitBranch size={17} /></span>
                <div className="flex-1 min-w-0"><b className="text-sm block truncate">{f.name}</b><div className="text-xs text-[var(--muted)]">{t('eventsCount', { n: f.versions?.[0]?.eventDefinitions?.length ?? 0 })}</div></div>
                {draft.flowId === f.id && <Check size={17} className="text-[var(--accent)] flex-none" />}
              </button>
            ))}
          </div>
          <NewFlow onCreated={(id) => patch({ flowId: id, eventIds: [] })} />
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="flex flex-col gap-2.5">
          <p className="text-[13px] text-[var(--muted)]">{t('eventsIntro')}</p>
          {flowDetail.isLoading ? <Spinner /> : events.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">{t('noEvents')}</p>
          ) : events.map((ev, i) => {
            const on = draft.eventIds.includes(ev.id);
            return (
              <div key={ev.id} className={`opt ${on ? 'sel' : ''}`} style={{ cursor: 'default' }}>
                <button className="w-7 h-7 rounded-lg grid place-items-center flex-none" style={{ background: on ? 'var(--accent)' : 'var(--surface)', color: on ? '#fff' : 'var(--muted)' }} onClick={() => patch({ eventIds: on ? draft.eventIds.filter((x) => x !== ev.id) : [...draft.eventIds, ev.id] })}>{on ? <Check size={15} /> : ev.order}</button>
                <div className="flex-1 min-w-0"><b className="text-sm block truncate">{ev.name}</b><div className="text-xs text-[var(--muted)]">{t('fieldsCount', { n: ev.fields?.length ?? 0 })}</div></div>
                <div className="flex gap-1 flex-none">
                  <button className="btn btn-sm" disabled={i === 0} onClick={() => swapEvent(i, i - 1)}><ArrowUp size={13} /></button>
                  <button className="btn btn-sm" disabled={i === events.length - 1} onClick={() => swapEvent(i, i + 1)}><ArrowDown size={13} /></button>
                </div>
              </div>
            );
          })}
          <AddEvent versionId={version?.id} onAdded={() => flowDetail.refetch()} />
        </div>
      );
    }

    if (step === 3) return (
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-[var(--muted)]">{t('traceScopeIntro')}</p>
        {([['lot', t('scopeLotOpt')], ['mfg', t('scopeMfgOpt')], ['gtin', t('scopeGtinOpt')], ['serial', t('scopeSerialOpt')]] as const).map(([v, l]) => (
          <button key={v} className={`opt ${draft.scopeType === v ? 'sel' : ''}`} onClick={() => patch({ scopeType: v })}>
            <span className="w-8 h-8 rounded-lg grid place-items-center flex-none" style={{ background: draft.scopeType === v ? 'var(--accent)' : 'var(--surface)', color: draft.scopeType === v ? '#fff' : 'var(--muted)' }}><Package size={15} /></span>
            <b className="text-sm flex-1">{l}</b>{draft.scopeType === v && <Check size={17} className="text-[var(--accent)]" />}
          </button>
        ))}
        {draft.scopeType === 'lot' && <label className="block"><span className="label">{t('lotNumber')}</span><input className="input mono" value={draft.lot} onChange={(e) => patch({ lot: e.target.value })} placeholder={t('lotPlaceholder')} /></label>}
        {draft.scopeType === 'mfg' && <label className="block"><span className="label">{t('mfgDate')}</span><input className="input" type="date" value={draft.mfgDate} onChange={(e) => patch({ mfgDate: e.target.value })} /></label>}
        {draft.scopeType === 'serial' && <label className="block"><span className="label">{t('serial')}</span><input className="input mono" value={draft.serial} onChange={(e) => patch({ serial: e.target.value })} /></label>}
        {draft.scopeType === 'gtin' && <p className="text-[13px] text-[var(--muted)]">{t('gtinAllHint')}</p>}
      </div>
    );

    if (step === 4) return (
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-[var(--muted)]">{t('assignIntro')}</p>
        <div className="flex items-center gap-2 rounded-full px-4 py-2.5" style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
          <Search size={16} className="text-[var(--muted)]" />
          <input className="flex-1 bg-transparent outline-none text-sm" placeholder={t('searchUser')} value={userQ} onChange={(e) => setUserQ(e.target.value)} />
        </div>
        {branchUsers.isLoading ? <Spinner /> : (
          <div className="flex flex-col gap-2 overflow-y-auto pr-1" style={{ maxHeight: 240 }}>
            {shownUsers.map((u: any) => (
              <button key={u.id} onClick={() => patch({ assigneeId: u.id })} className={`opt ${draft.assigneeId === u.id ? 'sel' : ''}`}>
                <span className="serif w-9 h-9 rounded-full grid place-items-center text-sm font-bold flex-none" style={{ color: 'var(--accent-contrast)', background: 'linear-gradient(135deg,var(--accent),var(--accent-2))' }}>{u.fullName?.split(' ').slice(-1)[0]?.[0] ?? '?'}</span>
                <div className="flex-1 min-w-0"><b className="text-sm block truncate">{u.fullName}</b><div className="text-xs text-[var(--muted)] truncate">{u.email}{u.organization?.name ? ` · ${u.organization.name}` : ''}</div></div>
                {draft.assigneeId === u.id && <Check size={17} className="text-[var(--accent)] flex-none" />}
              </button>
            ))}
            {shownUsers.length === 0 && <p className="text-sm text-[var(--muted)] py-2">{t('noUser')}</p>}
          </div>
        )}
        <label className="block"><span className="label">{t('deadline')}</span><input className="input" type="date" value={draft.deadline} onChange={(e) => patch({ deadline: e.target.value })} /></label>
        <label className="block"><span className="label">{t('noteOptional')}</span><textarea className="input min-h-[64px]" value={draft.note} onChange={(e) => patch({ note: e.target.value })} placeholder={t('notePlaceholder')} /></label>
      </div>
    );

    // step 5: confirm
    const flow = (flowsAll.data ?? []).find((f: any) => f.id === draft.flowId) ?? productFlows.find((f: any) => f.id === draft.flowId);
    const assignee = (branchUsers.data ?? []).find((u: any) => u.id === draft.assigneeId);
    const scopeLabel = draft.scopeType === 'lot' ? t('scopeLot', { v: draft.lot || '—' }) : draft.scopeType === 'mfg' ? t('scopeMfg', { v: draft.mfgDate || '—' }) : draft.scopeType === 'serial' ? t('scopeSerial', { v: draft.serial || '—' }) : t('scopeGtinCommon');
    return (
      <div className="card p-4 flex flex-col divide-y" style={{ borderColor: 'var(--border)' }}>
        <Row k={t('rProduct')} v={product?.name} />
        <Row k={t('rGtin')} v={product?.gtin} mono />
        <Row k={t('rFlow')} v={flow?.name} />
        <Row k={t('rEvent')} v={t('eventsCount', { n: `${draft.eventIds.length}/${events.length}` })} />
        <Row k={t('rScope')} v={scopeLabel} />
        <Row k={t('rAssignee')} v={assignee?.fullName} />
        <Row k={t('rDeadline')} v={draft.deadline || t('defaultDeadline')} />
      </div>
    );
  }

  async function swapEvent(i: number, j: number) {
    const a = events[i], b = events[j];
    if (!a || !b) return;
    try { await Promise.all([api.patch(`/event-definitions/${a.id}`, { order: b.order }), api.patch(`/event-definitions/${b.id}`, { order: a.order })]); flowDetail.refetch(); }
    catch (e) { toast(apiError(e), false); }
  }

  // ────────── ELABEL ──────────
  function renderElabel() {
    const el = draft.el;
    if (step === 1) {
      const published = elabelDetail.data?.elabelStatus === 'published';
      return (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-[var(--muted)]">{t('elabelStartIntro')}</p>
          <button className="opt sel" onClick={() => patch({ step: step + 1 })} style={{ minHeight: 68 }}>
            <span className="w-10 h-10 rounded-xl grid place-items-center flex-none" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><ClipboardEdit size={18} /></span>
            <div className="flex-1 text-left"><b className="text-sm block">{published ? t('editExisting') : t('composeForProduct')}</b><span className="text-xs text-[var(--muted)]">{t('shortSteps')}</span></div>
          </button>
          <CloneElabel currentId={product?.id} onCloned={() => { patch({ elLoaded: false }); elabelDetail.refetch(); toast(t('clonedElabel')); }} />
        </div>
      );
    }
    if (step === 2) return (
      <div className="flex flex-col gap-3.5">
        <F label={t('fProductName')}><input className="input" value={el.name} onChange={(e) => patchEl({ name: e.target.value })} /></F>
        <F label={t('fBrand')}><input className="input" value={el.brand} onChange={(e) => patchEl({ brand: e.target.value })} /></F>
        <F label={t('fDescription')}><textarea className="input min-h-[70px]" value={el.description} onChange={(e) => patchEl({ description: e.target.value })} /></F>
      </div>
    );
    if (step === 3) return (
      <div className="flex flex-col gap-3.5">
        <F label={t('fBizName')}><input className="input" value={el.owner.name} onChange={(e) => patchEl({ owner: { ...el.owner, name: e.target.value } })} /></F>
        <F label={t('fTaxCode')}><input className="input mono" value={el.owner.tax_code} onChange={(e) => patchEl({ owner: { ...el.owner, tax_code: e.target.value } })} /></F>
        <F label={t('fAddress')}><input className="input" value={el.owner.address} onChange={(e) => patchEl({ owner: { ...el.owner, address: e.target.value } })} /></F>
        <F label={t('fRepresentative')}><input className="input" value={el.owner.representative} onChange={(e) => patchEl({ owner: { ...el.owner, representative: e.target.value } })} /></F>
      </div>
    );
    if (step === 4) return (
      <div className="flex flex-col gap-3.5">
        <F label={t('fIngredients')}><textarea className="input min-h-[80px]" value={el.ingredients} onChange={(e) => patchEl({ ingredients: e.target.value })} /></F>
        <F label={t('fNetContent')}><input className="input" value={el.netContent} onChange={(e) => patchEl({ netContent: e.target.value })} placeholder={t('netContentPlaceholder')} /></F>
      </div>
    );
    if (step === 5) return (
      <div className="flex flex-col gap-3.5">
        <F label={t('fUsage')}><textarea className="input min-h-[80px]" value={el.usageInstructions} onChange={(e) => patchEl({ usageInstructions: e.target.value })} /></F>
        <F label={t('fStorage')}><textarea className="input min-h-[80px]" value={el.storageInstructions} onChange={(e) => patchEl({ storageInstructions: e.target.value })} /></F>
      </div>
    );
    if (step === 6) return (
      <div className="flex flex-col gap-3.5">
        <F label={t('fSafety')}><textarea className="input min-h-[80px]" value={el.safetyWarnings} onChange={(e) => patchEl({ safetyWarnings: e.target.value })} placeholder={t('safetyPlaceholder')} /></F>
        <F label={t('fRisk')}><select className="input" value={el.riskLevel} onChange={(e) => patchEl({ riskLevel: Number(e.target.value) })}>{RISK.map((r, i) => <option key={i} value={i}>{t(r)}</option>)}</select></F>
      </div>
    );
    if (step === 7) {
      const grp = appendixGroupByCode(el.appendixGroup);
      return (
        <div className="flex flex-col gap-3.5">
          <F label={t('fOrigin')}><input className="input" value={el.countryOfOrigin} onChange={(e) => patchEl({ countryOfOrigin: e.target.value })} /></F>
          <F label={t('fAppendixGroup')}>
            <select className="input" value={el.appendixGroup} onChange={(e) => patchEl({ appendixGroup: e.target.value })}>
              <option value="">{t('chooseGroup')}</option>
              {APPENDIX_GROUPS.map((g) => <option key={g.code} value={g.code}>{g.name}</option>)}
            </select>
          </F>
          {grp && grp.fields.map((fl: any) => (
            <F key={fl.key} label={`${fl.label}${fl.required ? ' *' : ''}`}>
              <input className="input" value={el.appendixAttributes?.[fl.key] ?? ''} onChange={(e) => patchEl({ appendixAttributes: { ...el.appendixAttributes, [fl.key]: e.target.value } })} />
            </F>
          ))}
        </div>
      );
    }
    if (step === 8) return (
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-[var(--muted)]">{t('elabelScopeIntro')}</p>
        {([['gtin', t('scopeGtinAll')], ['lot', t('scopeByLot')], ['mfg', t('scopeByMfg')], ['serial', t('scopeBySerial')]] as const).map(([v, l]) => (
          <button key={v} className={`opt ${draft.scopeType === v ? 'sel' : ''}`} onClick={() => patch({ scopeType: v })}>
            <span className="w-8 h-8 rounded-lg grid place-items-center flex-none" style={{ background: draft.scopeType === v ? 'var(--accent)' : 'var(--surface)', color: draft.scopeType === v ? '#fff' : 'var(--muted)' }}><Tag size={15} /></span>
            <b className="text-sm flex-1">{l}</b>{draft.scopeType === v && <Check size={17} className="text-[var(--accent)]" />}
          </button>
        ))}
        {draft.scopeType === 'lot' && <label className="block"><span className="label">{t('lotNumber')}</span><input className="input mono" value={draft.lot} onChange={(e) => patch({ lot: e.target.value })} placeholder={t('lotPlaceholder')} /></label>}
        {draft.scopeType === 'mfg' && <label className="block"><span className="label">{t('mfgDate')}</span><input className="input" type="date" value={draft.mfgDate} onChange={(e) => patch({ mfgDate: e.target.value })} /></label>}
      </div>
    );
    if (step === 9) return (
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-[var(--muted)]">{t('previewIntro')}</p>
        <div className="card overflow-hidden" style={{ height: 420 }}>
          {product && <iframe title="preview" src={`/t/${product.gtin}`} style={{ width: '100%', height: '100%', border: 'none' }} />}
        </div>
        {product && <a className="btn" href={`/t/${product.gtin}`} target="_blank" rel="noreferrer"><ExternalLink size={15} />{t('openQrNewTab')}</a>}
      </div>
    );
    // step 10: confirm & publish
    const scopeLabel = draft.scopeType === 'lot' ? t('scopeLot', { v: draft.lot || '—' }) : draft.scopeType === 'mfg' ? t('scopeMfg', { v: draft.mfgDate || '—' }) : draft.scopeType === 'serial' ? t('scopeSerial', { v: draft.serial || '—' }) : t('scopeGtinCommon');
    return (
      <div className="flex flex-col gap-3">
        <div className="card p-4 flex flex-col divide-y" style={{ borderColor: 'var(--border)' }}>
          <Row k={t('rProduct')} v={el.name || product?.name} />
          <Row k={t('rGtin')} v={product?.gtin} mono />
          <Row k={t('fBrand')} v={el.brand || '—'} />
          <Row k={t('rBiz')} v={el.owner.name || '—'} />
          <Row k={t('rNetContent')} v={el.netContent || '—'} />
          <Row k={t('rGroup')} v={appendixGroupByCode(el.appendixGroup)?.name || '—'} />
          <Row k={t('rScope')} v={scopeLabel} />
        </div>
        <p className="text-[12.5px] text-[var(--muted)]">{t('publishHint')}</p>
      </div>
    );
  }

  // ────────── SUPP ──────────
  function renderSupp() {
    const sp = draft.sp;
    if (step === 1) return (
      <div className="flex flex-col gap-3">
        <F label={t('fSuppName')}><input className="input" value={sp.name} onChange={(e) => patchSp({ name: e.target.value })} /></F>
        <p className="text-[13px] text-[var(--muted)]">{t('suppScopeIntro')}</p>
        {([['ALL', t('suppAll')], ['BATCH', t('suppBatch')], ['PRODUCTION', t('suppProduction')], ['ITEM', t('suppItem')]] as const).map(([v, l]) => (
          <button key={v} className={`opt ${sp.scope === v ? 'sel' : ''}`} onClick={() => patchSp({ scope: v })}>
            <span className="w-8 h-8 rounded-lg grid place-items-center flex-none" style={{ background: sp.scope === v ? 'var(--accent)' : 'var(--surface)', color: sp.scope === v ? '#fff' : 'var(--muted)' }}><FileText size={15} /></span>
            <b className="text-sm flex-1">{l}</b>{sp.scope === v && <Check size={17} className="text-[var(--accent)]" />}
          </button>
        ))}
        {sp.scope === 'BATCH' && <label className="block"><span className="label">{t('lotNumberReq')}</span><input className="input mono" value={sp.batchCode} onChange={(e) => patchSp({ batchCode: e.target.value })} /></label>}
        {sp.scope === 'PRODUCTION' && <label className="block"><span className="label">{t('mfgDate')}</span><input className="input" type="date" value={sp.mfgDate} onChange={(e) => patchSp({ mfgDate: e.target.value })} /></label>}
        {sp.scope === 'ITEM' && <label className="block"><span className="label">{t('serial')}</span><input className="input mono" value={sp.serial} onChange={(e) => patchSp({ serial: e.target.value })} /></label>}
      </div>
    );
    if (step === 2) return (
      <div className="flex flex-col gap-2">
        <p className="text-[13px] text-[var(--muted)]">{t('suppComposeIntro')}</p>
        <MiniRTE value={sp.contentHtml} onChange={(v) => patchSp({ contentHtml: v })} />
      </div>
    );
    if (step === 3) return (
      <div className="card p-4 np-content" style={{ lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: renderVars(sp.contentHtml, product) }} />
    );
    // step 4
    return (
      <div className="flex flex-col gap-3">
        <div className="card p-4 flex flex-col divide-y" style={{ borderColor: 'var(--border)' }}>
          <Row k={t('rProduct')} v={product?.name} />
          <Row k={t('rGtin')} v={product?.gtin} mono />
          <Row k={t('rLabelName')} v={sp.name} />
          <Row k={t('rScope')} v={sp.scope === 'BATCH' ? t('scopeLot', { v: sp.batchCode }) : sp.scope === 'PRODUCTION' ? t('scopeMfg', { v: sp.mfgDate }) : sp.scope === 'ITEM' ? t('scopeSerial', { v: sp.serial }) : t('suppAll')} />
        </div>
        <p className="text-[12.5px] text-[var(--muted)]">{t('suppPublishHint')}</p>
      </div>
    );
  }
}
