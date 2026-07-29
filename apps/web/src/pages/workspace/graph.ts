import type { Node, Edge } from '@xyflow/react';
import type { Workspace } from './mockWorkspace';

export type Sel =
  | { kind: 'qr' }
  | { kind: 'event'; id: string }
  | { kind: 'group'; id: string }
  | { kind: 'field'; groupId: string; id: string }
  | { kind: 'orgitem'; id?: string; label: string }
  | { kind: 'task'; id?: string; label: string }
  | { kind: 'add'; mod: 'org' | 'schedule' | 'elabel' };

type TNode = { id: string; rf: string; data: any; sel?: Sel; children: TNode[] };
const node = (id: string, rf: string, data: any, sel: Sel | null, children: TNode[] = []): TNode => ({ id, rf, data, sel: sel ?? undefined, children });

const CX = 310, CY = 180, ROW = 90;

export function buildGraph(m: Workspace, expanded: Set<string>, cb: any): { nodes: Node[]; edges: Edge[] } {
  const orgMod = m.modules.find((x) => x.kind === 'org');
  const schMod = m.modules.find((x) => x.kind === 'schedule');
  const flow = m.traceability.flow;

  const features = [
    { id: 'f-elabel', corner: { sx: -1, sy: -1 }, data: { kind: 'elabel', label: 'Nhãn điện tử', count: m.elabel.groups.length, addMod: 'elabel' },
      children: m.elabel.groups.map((g) => node(g.id, 'group', { group: g }, { kind: 'group', id: g.id })) },
    { id: 'f-txng', corner: { sx: 1, sy: -1 }, data: { kind: 'txng', label: 'Truy xuất nguồn gốc', count: flow.events.length },
      children: [node(flow.id || 'flow', 'flow', { flow }, null, flow.events.map((e) => node(e.id, 'event', { event: e }, { kind: 'event', id: e.id })))] },
    { id: 'f-org', corner: { sx: -1, sy: 1 }, data: { kind: 'org', label: 'Tổ chức', count: orgMod?.items.length ?? 0, addMod: 'org' },
      children: (orgMod?.items ?? []).map((it, i) => node('org-' + (it.id ?? i), 'orgitem', { item: it }, { kind: 'orgitem', id: it.id, label: it.label })) },
    { id: 'f-schedule', corner: { sx: 1, sy: 1 }, data: { kind: 'schedule', label: 'Lịch truy xuất', count: schMod?.items.length ?? 0, addMod: 'schedule' },
      children: (schMod?.items ?? []).map((it, i) => node('task-' + (it.id ?? i), 'task', { item: it }, { kind: 'task', id: it.id, label: it.label })) },
  ];

  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const mk = (id: string, type: string, x: number, y: number, data: any): Node => ({ id, type, position: { x, y }, data: { ...data, _id: id }, draggable: true });
  const link = (a: string, b: string) => edges.push({ id: `${a}->${b}`, source: a, target: b, type: 'straight', style: { stroke: 'var(--border-strong,#c5ccd8)', strokeWidth: 1.5 } });

  nodes.push(mk('qr', 'qr', 0, 0, { qr: m.qr, ...cb }));

  for (const f of features) {
    const fx = f.corner.sx * CX, fy = f.corner.sy * CY;
    const isOpen = expanded.has(f.id);
    nodes.push(mk(f.id, 'feature', fx, fy, { ...f.data, expanded: isOpen, ...cb }));
    link('qr', f.id);

    if (!isOpen) continue;
    let row = 0;
    const walk = (n: TNode, depth: number, parentId: string) => {
      row++;
      const x = f.corner.sx * (CX + 90 + (depth - 1) * 30);
      const y = f.corner.sy * (CY + ROW * row);
      nodes.push(mk(n.id, n.rf, x, y, { ...n.data, sel: n.sel, expanded: expanded.has(n.id), hasKids: n.children.length > 0, ...cb }));
      link(parentId, n.id);
      if (n.children.length && expanded.has(n.id)) n.children.forEach((c) => walk(c, depth + 1, n.id));
    };
    f.children.forEach((c) => walk(c, 1, f.id));
  }

  return { nodes, edges };
}
