import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Check, Loader2, FileText, Tag } from '../lib/icons';
import { api, apiError } from '../lib/api';
import { useToast } from '../lib/toast';
import { useT, type Messages } from '../lib/i18n';
import { Spinner } from '../components/ui';

const MSG: Messages = {
  vi: {
    createdFlow: 'Đã tạo Luồng', newFlow: 'Tạo Luồng mới', newFlowName: 'Tên Luồng mới', flowPlaceholder: 'VD: Chuỗi cung ứng dược',
    cancel: 'Huỷ', create: 'Tạo', addedEvent: 'Đã thêm sự kiện', addEvent: 'Thêm sự kiện', eventName: 'Tên sự kiện',
    eventPlaceholder: 'VD: Đóng gói', add: 'Thêm', cloneFrom: 'Sao chép từ nhãn mẫu',
    chooseTemplate: 'Chọn nhãn mẫu để sao chép nội dung', noTemplate: 'Chưa có nhãn mẫu đã công bố.', close: 'Đóng',
    bold: 'Đậm', italic: 'Nghiêng', heading: 'Tiêu đề', subheading: 'Tiêu đề nhỏ', paragraph: 'Đoạn', list: 'Danh sách',
    insertTemplate: 'Chèn mẫu web',
  },
  en: {
    createdFlow: 'Flow created', newFlow: 'Create new Flow', newFlowName: 'New Flow name', flowPlaceholder: 'e.g. Pharmaceutical supply chain',
    cancel: 'Cancel', create: 'Create', addedEvent: 'Event added', addEvent: 'Add event', eventName: 'Event name',
    eventPlaceholder: 'e.g. Packaging', add: 'Add', cloneFrom: 'Copy from template label',
    chooseTemplate: 'Select a template label to copy content', noTemplate: 'No published template labels yet.', close: 'Close',
    bold: 'Bold', italic: 'Italic', heading: 'Heading', subheading: 'Subheading', paragraph: 'Paragraph', list: 'List',
    insertTemplate: 'Insert web template',
  },
};

export const WEB_TEMPLATE = `<h2>{{product_name}}</h2>
<p><b>GTIN:</b> {{gtin}}</p>
<h3>Thành phần</h3><p>Nhập thành phần sản phẩm…</p>
<h3>Công dụng</h3><p>Nhập công dụng…</p>
<h3>Hướng dẫn sử dụng</h3><p>Nhập hướng dẫn sử dụng…</p>
<h3>Hướng dẫn bảo quản</h3><p>Nhập hướng dẫn bảo quản…</p>
<h3>Cảnh báo an toàn</h3><p>Nhập cảnh báo (nếu có)…</p>
<h3>Xuất xứ & tổ chức chịu trách nhiệm</h3><p>Nhập thông tin…</p>`;

export function F({ label, children }: { label: string; children: any }) {
  return <label className="block"><span className="label">{label}</span>{children}</label>;
}

export function NewFlow({ onCreated }: { onCreated: (id: string) => void }) {
  const t = useT(MSG);
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const create = useMutation({
    mutationFn: async () => { const code = 'FLW-' + name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 20) + '-' + Math.floor(Date.now() / 1000).toString().slice(-4); const { data } = await api.post('/flows', { name: name.trim(), code }); return data; },
    onSuccess: (d) => { toast(t('createdFlow')); setOpen(false); setName(''); onCreated(d.id); },
    onError: (e) => toast(apiError(e), false),
  });
  if (!open) return <button className="btn btn-sm self-start" onClick={() => setOpen(true)}><Plus size={14} />{t('newFlow')}</button>;
  return (
    <div className="card p-3.5 flex flex-col gap-2.5">
      <F label={t('newFlowName')}><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('flowPlaceholder')} autoFocus /></F>
      <div className="flex gap-2"><button className="btn flex-1 justify-center" onClick={() => setOpen(false)}>{t('cancel')}</button>
        <button className="btn btn-primary flex-1 justify-center" disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>{create.isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}{t('create')}</button></div>
    </div>
  );
}

export function AddEvent({ versionId, onAdded }: { versionId?: string; onAdded: () => void }) {
  const t = useT(MSG);
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const add = useMutation({
    mutationFn: () => { const code = 'EV-' + name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 16) + '-' + Math.floor(Date.now() / 1000).toString().slice(-4); return api.post(`/flow-versions/${versionId}/events`, { name: name.trim(), code, enterRoleKeys: ['DATA_ENTRY', 'MANAGER'], approveRoleKeys: ['MANAGER', 'ADMIN', 'SUPERADMIN'] }); },
    onSuccess: () => { toast(t('addedEvent')); setName(''); setOpen(false); onAdded(); },
    onError: (e) => toast(apiError(e), false),
  });
  if (!versionId) return null;
  if (!open) return <button className="btn btn-sm self-start" onClick={() => setOpen(true)}><Plus size={14} />{t('addEvent')}</button>;
  return (
    <div className="card p-3.5 flex flex-col gap-2.5">
      <F label={t('eventName')}><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('eventPlaceholder')} autoFocus /></F>
      <div className="flex gap-2"><button className="btn flex-1 justify-center" onClick={() => setOpen(false)}>{t('cancel')}</button>
        <button className="btn btn-primary flex-1 justify-center" disabled={!name.trim() || add.isPending} onClick={() => add.mutate()}>{add.isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}{t('add')}</button></div>
    </div>
  );
}

export function CloneElabel({ currentId, onCloned }: { currentId?: string; onCloned: () => void }) {
  const t = useT(MSG);
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const list = useQuery({ queryKey: ['elabels', 'published'], enabled: open, queryFn: () => api.get('/elabels', { params: { status: 'published' } }).then((r) => r.data) });
  const clone = useMutation({
    mutationFn: async (srcId: string) => {
      const { data: src } = await api.get(`/elabels/${srcId}`);
      await api.patch(`/elabels/${currentId}`, {
        brand: src.brand, description: src.description, countryOfOrigin: src.countryOfOrigin, hsCode: src.hsCode,
        targetMarket: src.targetMarket, supplier: src.supplier, riskLevel: Number(src.riskLevel || 0), netContent: src.netContent,
        ingredients: src.ingredients, usageInstructions: src.usageInstructions, storageInstructions: src.storageInstructions,
        safetyWarnings: src.safetyWarnings, appendixGroup: src.appendixGroup || null, appendixAttributes: src.appendixAttributes || {},
        labelAttributes: src.labelAttributes || [],
      });
    },
    onSuccess: () => { setOpen(false); onCloned(); },
    onError: (e) => toast(apiError(e), false),
  });
  if (!currentId) return null;
  if (!open) return <button className="btn btn-sm self-start" onClick={() => setOpen(true)}><FileText size={14} />{t('cloneFrom')}</button>;
  return (
    <div className="card p-3.5 flex flex-col gap-2">
      <div className="label" style={{ margin: 0 }}>{t('chooseTemplate')}</div>
      {list.isLoading ? <Spinner /> : (
        <div className="flex flex-col gap-2 overflow-y-auto pr-1" style={{ maxHeight: 220 }}>
          {(list.data ?? []).filter((p: any) => p.id !== currentId).map((p: any) => (
            <button key={p.id} className="opt" disabled={clone.isPending} onClick={() => clone.mutate(p.id)}>
              <span className="w-8 h-8 rounded-lg grid place-items-center flex-none" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><Tag size={15} /></span>
              <div className="flex-1 min-w-0"><b className="text-sm block truncate">{p.name}</b><div className="text-xs text-[var(--muted)] mono">{p.gtin}</div></div>
            </button>
          ))}
          {(list.data ?? []).length === 0 && <p className="text-sm text-[var(--muted)]">{t('noTemplate')}</p>}
        </div>
      )}
      <button className="btn btn-sm self-start" onClick={() => setOpen(false)}>{t('close')}</button>
    </div>
  );
}

export function renderVars(html: string, product: any): string {
  if (!html) return '<p style="color:var(--faint)">Chưa có nội dung.</p>';
  return html
    .replace(/\{\{product_name\}\}/g, product?.name ?? '')
    .replace(/\{\{gtin\}\}/g, product?.gtin ?? '')
    .replace(/\{\{[a-z_]+\}\}/g, '…');
}

export function MiniRTE({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useT(MSG);
  const ref = useRef<HTMLDivElement>(null);
  const init = useRef(false);
  useEffect(() => { if (ref.current && !init.current) { ref.current.innerHTML = value || ''; init.current = true; } }, [value]);
  const sync = () => { if (ref.current) onChange(ref.current.innerHTML); };
  const cmd = (c: string, v?: string) => { document.execCommand(c, false, v); sync(); };
  const insert = (html: string) => { document.execCommand('insertHTML', false, html); sync(); };
  const Btn = ({ onDo, children, title }: any) => <button type="button" title={title} className="ws-tb" onMouseDown={(e) => { e.preventDefault(); onDo(); }}>{children}</button>;
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-0.5 p-1.5" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <Btn title={t('bold')} onDo={() => cmd('bold')}><b>B</b></Btn>
        <Btn title={t('italic')} onDo={() => cmd('italic')}><i>I</i></Btn>
        <span className="ws-sep" />
        <Btn title={t('heading')} onDo={() => cmd('formatBlock', 'H2')}>H2</Btn>
        <Btn title={t('subheading')} onDo={() => cmd('formatBlock', 'H3')}>H3</Btn>
        <Btn title={t('paragraph')} onDo={() => cmd('formatBlock', 'P')}>¶</Btn>
        <span className="ws-sep" />
        <Btn title={t('list')} onDo={() => cmd('insertUnorderedList')}>• Ds</Btn>
        <span className="ws-sep" />
        <button type="button" className="btn btn-sm" onMouseDown={(e) => { e.preventDefault(); insert(WEB_TEMPLATE); }}>{t('insertTemplate')}</button>
      </div>
      <div ref={ref} contentEditable suppressContentEditableWarning className="np-content p-3 text-sm" style={{ minHeight: 220, outline: 'none' }} onInput={sync} />
    </div>
  );
}
