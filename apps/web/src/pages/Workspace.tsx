import { useCallback, useEffect, useMemo, useState } from 'react';
import { ReactFlow, Background, Controls, useNodesState, useEdgesState, ReactFlowProvider, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Trash2, Plus, ArrowUp, ArrowDown } from '../lib/icons';
import { PageHead, Spinner } from '../components/ui';
import { useToast } from '../lib/toast';
import { api, apiError } from '../lib/api';
import { APPENDIX_GROUPS } from '@vlabel/shared';
import type { Workspace as WS } from './workspace/mockWorkspace';
import { loadProducts, loadWorkspace, wsApi } from './workspace/api';
import { buildGraph, type Sel } from './workspace/graph';
import { nodeTypes } from './workspace/nodes';

const COMMON_KEY: Record<string, string> = { 'lf-netContent': 'netContent', 'lf-ingredients': 'ingredients', 'lf-usageInstructions': 'usageInstructions', 'lf-storageInstructions': 'storageInstructions', 'lf-safetyWarnings': 'safetyWarnings' };

export default function Workspace() {
  return <ReactFlowProvider><Canvas /></ReactFlowProvider>;
}

function Canvas() {
  const toast = useToast();
  const qc = useQueryClient();
  const products = useQuery({ queryKey: ['ws-products'], queryFn: loadProducts });
  const [pid, setPid] = useState('');
  useEffect(() => { if (!pid && products.data?.length) setPid(products.data[0].id); }, [products.data, pid]);

  const wq = useQuery({ queryKey: ['workspace', pid], queryFn: () => loadWorkspace(pid), enabled: !!pid });
  const model = wq.data ?? null;

  const rf = useReactFlow();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sel, setSel] = useState<Sel | null>(null);
  const [menu, setMenu] = useState<any>(null);
  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as any)?.tagName ?? '';
      if (e.key === 'Escape') { setSel(null); setMenu(null); }
      if ((e.key === 'f' || e.key === 'F') && !/INPUT|TEXTAREA|SELECT/.test(tag)) rf.fitView({ padding: 0.25 });
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [rf]);
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);

  useEffect(() => { if (!pid) return; try { setPos(JSON.parse(localStorage.getItem('ws-pos-' + pid) || '{}')); } catch { setPos({}); } }, [pid]);
  const handleNodesChange = useCallback((changes: any) => {
    onNodesChange(changes);
    const moved = changes.filter((c: any) => c.type === 'position' && c.position && c.dragging === false);
    if (moved.length) setPos((prev) => { const n = { ...prev }; moved.forEach((c: any) => { n[c.id] = c.position; }); if (pid) localStorage.setItem('ws-pos-' + pid, JSON.stringify(n)); return n; });
  }, [onNodesChange, pid]);
  const resetLayout = () => { if (pid) localStorage.removeItem('ws-pos-' + pid); setPos({}); };

  const act = useCallback(async (p: Promise<any>, msg?: string) => {
    try { await p; await qc.invalidateQueries({ queryKey: ['workspace', pid] }); if (msg) toast(msg); }
    catch (e) { toast(apiError(e), false); }
  }, [qc, pid, toast]);

  const cb = useMemo(() => ({
    onSelect: (s: Sel) => setSel(s),
    onToggle: (id: string) => setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }),
    onAdd: (mod: any) => setSel({ kind: 'add', mod }),
    onAddEvent: () => { if (model?.traceability.flow.versionId) act(wsApi.addEvent(model.traceability.flow.versionId, 'Sự kiện mới'), 'Đã thêm sự kiện'); },
  }), [model, act]);

  useEffect(() => {
    if (!model) { setNodes([]); setEdges([]); return; }
    const g = buildGraph(model, expanded, cb);
    setNodes(g.nodes.map((n) => pos[n.id] ? { ...n, position: pos[n.id] } : n));
    setEdges(g.edges);
  }, [model, expanded, cb, pos, setNodes, setEdges]);

  return (
    <>
      <style>{WS_CSS}</style>
      <PageHead title="Không gian làm việc VLabel" subtitle="QR ở giữa, 4 góc là các tính năng. Bấm một tính năng để xổ ra, bấm tiếp để đi sâu."
        actions={<>
          <select className="input" style={{ minWidth: 220 }} value={pid} onChange={(e) => { setPid(e.target.value); setSel(null); }}>
            {(products.data ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.gtin})</option>)}
          </select>
          <button className="btn" onClick={resetLayout} title="Về bố cục mặc định">Đặt lại bố cục</button>
        </>} />
      <div className="ws-wrap">
        {(products.isLoading || wq.isLoading) && <div className="ws-loading"><Spinner label="Đang tải dữ liệu…" /></div>}
        <ReactFlow
          nodes={nodes} edges={edges} nodeTypes={nodeTypes as any}
          onNodesChange={handleNodesChange} onEdgesChange={onEdgesChange}
          fitView fitViewOptions={{ padding: 0.25 }} minZoom={0.3} maxZoom={1.6}
          proOptions={{ hideAttribution: true }} onPaneClick={() => { setSel(null); setMenu(null); }}
          onNodeContextMenu={(e, node) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, node }); }}
        >
          <Background gap={22} color="var(--border)" />
          <Controls showInteractive={false} />
        </ReactFlow>
        <div className="ws-hintbar">Bấm góc để xổ ra · chuột phải để thao tác nhanh · phím F canh khung</div>
        {menu && (
          <>
            <div className="fixed inset-0" style={{ zIndex: 30 }} onClick={() => setMenu(null)} onContextMenu={(e) => { e.preventDefault(); setMenu(null); }} />
            <div className="ws-menu" style={{ left: menu.x, top: menu.y }}>
              {(menu.node.data.hasKids || menu.node.type === 'feature' || menu.node.type === 'flow') && <button onClick={() => { menu.node.data.onToggle(menu.node.data._id); setMenu(null); }}>{menu.node.data.expanded ? 'Thu gọn' : 'Mở rộng'}</button>}
              {menu.node.data.sel && <button onClick={() => { menu.node.data.onSelect(menu.node.data.sel); setMenu(null); }}>Chỉnh sửa</button>}
              {menu.node.data.addMod && <button onClick={() => { menu.node.data.onAdd(menu.node.data.addMod); setMenu(null); }}>Thêm mục</button>}
            </div>
          </>
        )}
        {sel && model && <EditPanel key={JSON.stringify(sel)} sel={sel} model={model} act={act} toast={toast} onClose={() => setSel(null)} />}
      </div>
    </>
  );
}

function EditPanel({ sel, model, act, toast, onClose }: { sel: Sel; model: WS; act: any; toast: any; onClose: () => void }) {
  const pid = model.productId!;
  let title = ''; let body: any = null;

  if (sel.kind === 'qr') {
    title = 'Mã QR · Sản phẩm';
    body = <>
      {model.qr.dataUrl && <img src={model.qr.dataUrl} alt="QR" style={{ width: 150, height: 150, borderRadius: 12, border: '1px solid var(--border)', margin: '0 auto' }} />}
      <F label="Sản phẩm"><input className="input" value={model.qr.product} readOnly /></F>
      <F label="GTIN"><input className="input mono" value={model.qr.gtin} readOnly /></F>
      <p className="ws-hint">Đổi sản phẩm bằng ô chọn ở góc trên. QR gốc mở ra 4 tính năng ở 4 góc.</p>
    </>;
  } else if (sel.kind === 'group') {
    const g = model.elabel.groups.find((x) => x.id === sel.id); if (!g) return null;
    title = `Nhãn điện tử · ${g.name}`;
    const save = (f: any, value: string) => {
      if (f.id.startsWith('lf-')) return act(wsApi.patchLabel(pid, { [COMMON_KEY[f.id]]: value }), 'Đã lưu');
      if (f.id.startsWith('ax-')) { const av: any = {}; g.fields.forEach((x) => { av[x.id.replace('ax-', '')] = x.id === f.id ? value : (x.value ?? ''); }); return act(wsApi.patchLabel(pid, { appendixAttributes: av }), 'Đã lưu'); }
      const arr = g.fields.map((x) => ({ field_name: x.label, field_value: x.id === f.id ? value : (x.value ?? '') })); return act(wsApi.patchLabel(pid, { labelAttributes: arr }), 'Đã lưu');
    };
    const isExtra = g.id === 'g-extra';
    body = <>
      {g.pick && (
        <F label="Nhóm hàng hóa (Phụ lục I)">
          <select className="input" value={g.groupCode ?? ''} onChange={(e) => act(wsApi.patchLabel(pid, { appendixGroup: e.target.value || null }), 'Đã đổi nhóm hàng hóa')}>
            <option value="">— chọn nhóm hàng —</option>
            {APPENDIX_GROUPS.map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}
          </select>
        </F>
      )}
      <p className="ws-hint">{g.pick ? 'Chọn nhóm hàng để hiện đúng các trường bắt buộc của nhóm.' : ''} {g.fields.length} trường{g.readOnly && !g.pick ? ' · cố định theo Phụ lục I' : ''}.</p>
      {g.fields.map((f) => (
        <div key={f.id} className="ws-lblrow">
          <div className="ws-lbl">{f.label}{f.required && <span style={{ color: 'var(--danger)' }}> *</span>}</div>
          {f.type === 'textarea'
            ? <textarea className="input" rows={2} defaultValue={f.value ?? ''} onBlur={(e) => e.target.value !== (f.value ?? '') && save(f, e.target.value)} />
            : <input className="input" type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'} defaultValue={f.value ?? ''} onBlur={(e) => e.target.value !== (f.value ?? '') && save(f, e.target.value)} />}
          {isExtra && <button className="btn btn-sm btn-danger ws-lbl-del" onClick={() => { const arr = g.fields.filter((x) => x.id !== f.id).map((x) => ({ field_name: x.label, field_value: x.value ?? '' })); act(wsApi.patchLabel(pid, { labelAttributes: arr })); }}><Trash2 size={12} /></button>}
        </div>
      ))}
      {isExtra && <button className="btn btn-sm" onClick={() => { const arr = g.fields.map((x) => ({ field_name: x.label, field_value: x.value ?? '' })); arr.push({ field_name: 'Trường mới', field_value: '' }); act(wsApi.patchLabel(pid, { labelAttributes: arr }), 'Đã thêm trường'); }}><Plus size={13} />Thêm trường</button>}
    </>;
  } else if (sel.kind === 'event') {
    const evs = model.traceability.flow.events;
    const idx = evs.findIndex((x) => x.id === sel.id);
    const e = evs[idx]; if (!e) return null;
    const swap = (j: number) => act(Promise.all([wsApi.updateEvent(e.id, { order: evs[j].order }), wsApi.updateEvent(evs[j].id, { order: e.order })]), 'Đã sắp xếp');
    title = 'Sự kiện · Cấu hình';
    body = <>
      <F label="Tên sự kiện"><input className="input" defaultValue={e.name} key={e.name} onBlur={(ev) => ev.target.value !== e.name && act(wsApi.updateEvent(e.id, { name: ev.target.value }), 'Đã lưu')} /></F>
      <div className="flex gap-1.5 items-center">
        <button className="btn btn-sm" disabled={idx <= 0} onClick={() => swap(idx - 1)}><ArrowUp size={13} /></button>
        <button className="btn btn-sm" disabled={idx >= evs.length - 1} onClick={() => swap(idx + 1)}><ArrowDown size={13} /></button>
        <span className="ws-hint">Bước {idx + 1}/{evs.length}</span>
      </div>
      <div className="ws-sec">Trường dữ liệu</div>
      {(e.fields ?? []).map((f) => (
        <div key={f.id} className="ws-fieldrow">
          <input className="input" defaultValue={f.label} onBlur={(ev) => ev.target.value !== f.label && act(wsApi.updateField(f.id, { label: ev.target.value }))} />
          <label className="ws-mini" title="Bắt buộc"><input type="checkbox" defaultChecked={f.required} onChange={(ev) => act(wsApi.updateField(f.id, { required: ev.target.checked }))} />bb</label>
          <label className="ws-mini" title="Công khai"><input type="checkbox" defaultChecked={f.display} onChange={(ev) => act(wsApi.updateField(f.id, { publicVisible: ev.target.checked }))} />ck</label>
          <button className="btn btn-sm btn-danger" onClick={() => act(wsApi.deleteField(f.id))}><Trash2 size={12} /></button>
        </div>
      ))}
      <button className="btn btn-sm" onClick={() => act(wsApi.addField(e.id, 'Trường mới'), 'Đã thêm trường')}><Plus size={13} />Thêm trường</button>
      <div className="ws-actions"><div className="flex-1" /><button className="btn btn-sm btn-danger" onClick={() => act(wsApi.deleteEvent(e.id)).then(onClose)}><Trash2 size={13} />Xóa sự kiện</button></div>
    </>;
  } else if (sel.kind === 'orgitem') {
    title = 'Tổ chức';
    body = <>
      <F label="Tên"><input className="input" value={sel.label} readOnly /></F>
      <p className="ws-hint">Xem chi tiết và chỉnh cấu trúc ở mục Tổ chức. Xóa cần quyền quản trị.</p>
      {sel.id && <div className="ws-actions"><div className="flex-1" /><button className="btn btn-sm btn-danger" onClick={() => act(api.delete(`/organizations/${sel.id}`), 'Đã xóa').then(onClose)}><Trash2 size={13} />Xóa</button></div>}
    </>;
  } else if (sel.kind === 'task') {
    title = 'Lịch truy xuất · Nhiệm vụ';
    body = <>
      <F label="Nhiệm vụ"><input className="input" value={sel.label} readOnly /></F>
      {sel.id && <div className="ws-actions"><div className="flex-1" /><button className="btn btn-sm btn-danger" onClick={() => act(wsApi.deleteTask(sel.id!), 'Đã xóa').then(onClose)}><Trash2 size={13} />Xóa</button></div>}
    </>;
  } else if (sel.kind === 'add') {
    body = <AddPanel mod={sel.mod} model={model} act={act} toast={toast} onDone={onClose} />;
    title = sel.mod === 'org' ? 'Thêm tổ chức' : sel.mod === 'schedule' ? 'Thêm nhiệm vụ' : 'Thêm trường nhãn';
  }

  return (
    <div className="ws-panel">
      <div className="ws-panel-head"><b>{title}</b><button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button></div>
      <div className="ws-panel-body">{body}</div>
    </div>
  );
}

function AddPanel({ mod, model, act, onDone }: any) {
  const pid = model.productId;
  const orgItems = (model.modules.find((m: any) => m.kind === 'org')?.items ?? []) as any[];
  const [name, setName] = useState('');
  const [parent, setParent] = useState('');
  const add = () => {
    if (mod === 'elabel') {
      const g = model.elabel.groups.find((x: any) => x.id === 'g-extra');
      const arr = (g?.fields ?? []).map((f: any) => ({ field_name: f.label, field_value: f.value ?? '' }));
      arr.push({ field_name: name || 'Trường mới', field_value: '' });
      return act(wsApi.patchLabel(pid, { labelAttributes: arr }), 'Đã thêm trường').then(onDone);
    }
    if (!name.trim()) return;
    if (mod === 'org') { return act(api.post('/organizations', { name, code: 'ORG' + Date.now().toString(36).toUpperCase(), type: 'DEPARTMENT', parentId: parent || undefined }), 'Đã thêm tổ chức').then(onDone); }
    if (mod === 'schedule') {
      const uid = model.modules.find((m: any) => m.kind === 'user')?.items?.[0]?.id;
      const today = new Date().toISOString().slice(0, 10);
      return act(wsApi.addTask({ name, productId: pid, assignedUserId: uid, startDate: today, endDate: today }), 'Đã thêm nhiệm vụ').then(onDone);
    }
  };
  return <>
    <F label={mod === 'org' ? 'Tên tổ chức' : mod === 'schedule' ? 'Tên nhiệm vụ' : 'Tên trường'}><input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></F>
    {mod === 'org' && <F label="Cấp cha (tùy chọn)"><select className="input" value={parent} onChange={(e) => setParent(e.target.value)}><option value="">— không —</option>{orgItems.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></F>}
    {mod === 'org' && <p className="ws-hint">Cần quyền quản trị (Admin/Superadmin).</p>}
    <button className="btn btn-primary" onClick={add}><Plus size={15} />Thêm</button>
  </>;
}

function F({ label, children }: any) { return <label className="block"><span className="label">{label}</span>{children}</label>; }

const WS_CSS = `
.ws-wrap { position: relative; height: calc(100vh - 168px); min-height: 460px; border: 1px solid var(--border); border-radius: 16px; overflow: hidden; background: var(--surface); }
.ws-loading { position:absolute; inset:0; z-index:5; display:grid; place-items:center; background:color-mix(in srgb,var(--surface) 70%,transparent); }
.ws-hintbar { position:absolute; left:12px; top:12px; z-index:6; font-size:11.5px; color:var(--muted); background:color-mix(in srgb,var(--bg) 82%,transparent); border:1px solid var(--border); border-radius:999px; padding:5px 12px; backdrop-filter:blur(6px); pointer-events:none; }
.ws-menu { position:fixed; z-index:40; min-width:152px; background:var(--bg); border:1px solid var(--border); border-radius:12px; box-shadow:var(--shadow-lg); padding:5px; display:flex; flex-direction:column; }
.ws-menu button { text-align:left; padding:8px 10px; border-radius:8px; font-size:13px; font-weight:600; color:var(--ink-2); }
.ws-menu button:hover { background:var(--surface); color:var(--ink); }
.react-flow__attribution { display: none; }
.ws-node { background: var(--card); border: 1.5px solid var(--border); border-radius: 12px; padding: 8px 10px; box-shadow: var(--shadow-sm, 0 1px 3px rgba(10,20,40,.08)); font-size: 12px; cursor: pointer; width: 176px; }
.ws-node:hover, .ws-feature:hover, .ws-qr:hover { box-shadow: 0 6px 18px rgba(10,20,40,.16); }
.ws-leaf { width: 172px; }
.ws-title { font-weight: 700; font-size: 12.5px; line-height: 1.2; color: var(--ink); }
.ws-sub { font-size: 10.5px; color: var(--muted); line-height: 1.3; }
.ws-ico { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; flex: none; }
.ws-ico-sm { width: 26px; height: 26px; border-radius: 8px; }
.ws-chip { width: 22px; height: 22px; border-radius: 7px; display: grid; place-items: center; border: 1px solid var(--border); background: var(--surface); color: var(--muted); flex: none; cursor: pointer; }
.ws-feature { display: flex; align-items: center; gap: 9px; width: 210px; background: var(--card); border: 1.5px solid; border-radius: 14px; padding: 10px 11px; box-shadow: var(--shadow-sm, 0 1px 3px rgba(10,20,40,.08)); cursor: pointer; }
.ws-qr { width: 200px; background: var(--card); border: 2px solid var(--accent); border-radius: 18px; padding: 14px; text-align: center; box-shadow: 0 8px 26px rgba(10,20,40,.12); cursor: pointer; }
.ws-qr-img { width: 96px; height: 96px; border-radius: 12px; margin: 0 auto 8px; display: block; border: 1px solid var(--border); }
.ws-qr-ph { display: grid; place-items: center; color: var(--muted); background: var(--surface); }
.ws-qr-name { font-weight: 800; font-size: 13.5px; line-height: 1.25; margin-bottom: 2px; }
.ws-panel { position: absolute; top: 0; right: 0; width: 344px; max-width: 92vw; height: 100%; background: var(--bg); border-left: 1px solid var(--border); box-shadow: -8px 0 30px rgba(10,20,40,.10); display: flex; flex-direction: column; z-index: 20; }
.ws-panel-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid var(--border); }
.ws-panel-body { flex: 1; overflow: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
.ws-hint { font-size: 11.5px; color: var(--muted); }
.ws-sec { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; color: var(--faint); margin-top: 4px; }
.ws-actions { display: flex; align-items: center; gap: 6px; margin-top: 4px; padding-top: 10px; border-top: 1px solid var(--border); }
.ws-fieldrow { display: flex; align-items: center; gap: 6px; }
.ws-mini { display: flex; align-items: center; gap: 3px; font-size: 10.5px; color: var(--muted); font-weight: 700; }
.ws-lblrow { display: flex; flex-direction: column; gap: 3px; position: relative; }
.ws-lbl { font-size: 11.5px; font-weight: 600; color: var(--ink-2); }
.ws-lbl-del { position: absolute; right: 0; top: 0; }
@media (max-width: 720px) {
  .ws-wrap { height: calc(100vh - 150px); }
  .ws-panel { top: auto; bottom: 0; right: 0; left: 0; width: 100%; max-width: 100%; height: 66%; border-left: none; border-top: 1px solid var(--border); border-radius: 16px 16px 0 0; }
}
`;
