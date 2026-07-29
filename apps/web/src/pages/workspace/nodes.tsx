import { Handle, Position } from '@xyflow/react';
import { Tag, GitBranch, Building2, CalendarClock, Workflow, Layers, CircleDot, Users, Plus, ChevronDown, ChevronRight } from 'lucide-react';

// Handle ẩn ở tâm node để cạnh nối vẽ dạng nan hoa từ QR ra 4 góc.
function CH() {
  const s = { opacity: 0, left: '50%', top: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' as const };
  return <><Handle id="t" type="target" position={Position.Top} style={s} /><Handle id="s" type="source" position={Position.Top} style={s} /></>;
}

const KIND = {
  elabel: { color: '#7c5cff', Icon: Tag },
  txng: { color: '#2f9e5f', Icon: GitBranch },
  org: { color: '#2f6bff', Icon: Building2 },
  schedule: { color: '#e08a2f', Icon: CalendarClock },
} as const;

export function QRNode({ data }: any) {
  return (
    <div className="ws-qr" onClick={() => data.onSelect({ kind: 'qr' })}>
      <CH />
      {data.qr.dataUrl
        ? <img src={data.qr.dataUrl} alt="QR" className="ws-qr-img" />
        : <div className="ws-qr-img ws-qr-ph"><Workflow size={26} /></div>}
      <div className="ws-qr-name">{data.qr.product}</div>
      <div className="ws-sub mono">{data.qr.gtin}</div>
    </div>
  );
}

export function FeatureNode({ data }: any) {
  const k = (KIND as any)[data.kind] ?? KIND.org;
  return (
    <div className="ws-feature" style={{ borderColor: k.color }} onClick={() => data.onToggle(data._id)}>
      <CH />
      <span className="ws-ico" style={{ background: k.color }}><k.Icon size={18} color="#fff" /></span>
      <div className="flex-1 min-w-0">
        <div className="ws-title">{data.label}</div>
        <div className="ws-sub">{data.count} mục</div>
      </div>
      {data.addMod && <button className="ws-chip" title="Thêm" onClick={(e) => { e.stopPropagation(); data.onAdd(data.addMod); }}><Plus size={13} /></button>}
      <span className="ws-chip" style={{ borderColor: k.color, color: k.color }}>{data.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
    </div>
  );
}

export function FlowNode({ data }: any) {
  const resp = (data.flow.responsible ?? []).join(', ');
  return (
    <div className="ws-node" style={{ borderColor: '#2f9e5f', width: 200 }} onClick={() => data.onToggle(data._id)}>
      <CH />
      <div className="flex items-center gap-2">
        <span className="ws-ico" style={{ background: '#2f9e5f' }}><Workflow size={16} color="#fff" /></span>
        <div className="flex-1 min-w-0"><div className="ws-title truncate">{data.flow.name}</div><div className="ws-sub truncate">Phụ trách: {resp || '—'}</div></div>
        <button className="ws-chip" title="Thêm event" onClick={(e) => { e.stopPropagation(); data.onAddEvent(); }}><Plus size={13} /></button>
        <span className="ws-chip">{data.expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</span>
      </div>
      <div className="ws-sub mt-1">{data.flow.events.length} sự kiện</div>
    </div>
  );
}

export function EventNode({ data }: any) {
  const e = data.event;
  return (
    <div className="ws-node ws-leaf" style={{ borderColor: '#3f7d55' }} onClick={() => data.onSelect(data.sel)}>
      <CH />
      <div className="flex items-center gap-2">
        <span className="ws-ico ws-ico-sm" style={{ background: '#eaf6ef', color: '#2f9e5f' }}><CircleDot size={14} /></span>
        <div className="flex-1 min-w-0"><div className="ws-title truncate">{e.name}</div><div className="ws-sub">{e.fields?.length ?? 0} trường</div></div>
      </div>
    </div>
  );
}

export function GroupNode({ data }: any) {
  return (
    <div className="ws-node ws-leaf" style={{ borderColor: '#9b83ff' }} onClick={() => data.onSelect(data.sel)}>
      <CH />
      <div className="flex items-center gap-2">
        <span className="ws-ico ws-ico-sm" style={{ background: '#f0ecff', color: '#7c5cff' }}><Layers size={14} /></span>
        <div className="flex-1 min-w-0"><div className="ws-title truncate">{data.group.name}</div><div className="ws-sub">{data.group.fields.length} trường</div></div>
      </div>
    </div>
  );
}

export function OrgItemNode({ data }: any) {
  return (
    <div className="ws-node ws-leaf" style={{ borderColor: '#6f9bff' }} onClick={() => data.onSelect(data.sel)}>
      <CH />
      <div className="flex items-center gap-2">
        <span className="ws-ico ws-ico-sm" style={{ background: '#e9f0ff', color: '#2f6bff' }}><Building2 size={14} /></span>
        <div className="flex-1 min-w-0"><div className="ws-title truncate">{data.item.label}</div>{data.item.meta && <div className="ws-sub truncate">{data.item.meta}</div>}</div>
      </div>
    </div>
  );
}

export function TaskNode({ data }: any) {
  return (
    <div className="ws-node ws-leaf" style={{ borderColor: '#e0a24f' }} onClick={() => data.onSelect(data.sel)}>
      <CH />
      <div className="flex items-center gap-2">
        <span className="ws-ico ws-ico-sm" style={{ background: '#fbf0dd', color: '#c9820f' }}><CalendarClock size={14} /></span>
        <div className="flex-1 min-w-0"><div className="ws-title truncate">{data.item.label}</div>{data.item.meta && <div className="ws-sub truncate">{data.item.meta}</div>}</div>
      </div>
    </div>
  );
}

export function UserItemNode({ data }: any) {
  return (
    <div className="ws-node ws-leaf" onClick={() => data.onSelect(data.sel)}>
      <CH />
      <div className="flex items-center gap-2"><span className="ws-ico ws-ico-sm" style={{ background: '#eef1f6', color: '#69748a' }}><Users size={14} /></span><div className="ws-title truncate">{data.item.label}</div></div>
    </div>
  );
}

export const nodeTypes = {
  qr: QRNode, feature: FeatureNode, flow: FlowNode, event: EventNode, group: GroupNode, orgitem: OrgItemNode, task: TaskNode, useritem: UserItemNode,
};
