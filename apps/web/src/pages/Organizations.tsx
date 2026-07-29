import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Building2, Factory, FolderTree, Plus, Loader2, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { PageHead, Spinner, Drawer, EmptyState } from '../components/ui';
import { PERMISSIONS } from '@vlabel/shared';

interface Node { id: string; name: string; code: string; type: string; level: number; status: string; parentId: string | null; children: Node[] }

// Loại đơn vị tự suy ra theo cấp (người dùng không cần chọn).
const TYPE_BY_LEVEL = ['GROUP', 'COMPANY', 'FACTORY', 'DEPARTMENT', 'GROWING_AREA'];
const typeForLevel = (lvl: number) => TYPE_BY_LEVEL[lvl] ?? 'DEPARTMENT';

export default function Organizations() {
  const { can } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const canManage = can(PERMISSIONS.ORGANIZATION_MANAGE);
  const tree = useQuery({ queryKey: ['org-tree'], queryFn: () => api.get('/organizations/tree').then((r) => r.data as Node[]) });
  const flat = useQuery({ queryKey: ['orgs'], queryFn: () => api.get('/organizations').then((r) => r.data) });
  const inv = () => { qc.invalidateQueries({ queryKey: ['org-tree'] }); qc.invalidateQueries({ queryKey: ['orgs'] }); };

  const [create, setCreate] = useState<{ parentId: string | null } | null>(null);
  const [form, setForm] = useState({ name: '', code: '' });

  const createLevel = create
    ? (create.parentId ? ((flat.data ?? []).find((o: any) => o.id === create.parentId)?.level ?? 0) + 1 : 0)
    : 0;

  const mCreate = useMutation({
    mutationFn: () => api.post('/organizations', { ...form, type: typeForLevel(createLevel), parentId: create?.parentId ?? undefined }),
    onSuccess: () => { toast('Đã thêm đơn vị'); setCreate(null); setForm({ name: '', code: '' }); inv(); },
    onError: (e) => toast(apiError(e), false),
  });
  const mLevel = useMutation({
    mutationFn: ({ id, direction }: { id: string; direction: 'up' | 'down' }) => api.patch(`/organizations/${id}/level`, { direction }),
    onSuccess: () => inv(),
    onError: (e) => toast(apiError(e), false),
  });
  const mDelete = useMutation({
    mutationFn: (id: string) => api.delete(`/organizations/${id}`),
    onSuccess: () => { toast('Đã xoá đơn vị'); inv(); },
    onError: (e) => toast(apiError(e), false),
  });

  const Row = ({ node, index, count }: { node: Node; index: number; count: number }) => {
    const [open, setOpen] = useState(node.level < 2);
    const has = node.children.length > 0;
    const Icon = node.level === 0 ? Building2 : node.type === 'FACTORY' ? Factory : FolderTree;
    const root = node.level === 0;
    return (
      <div className="anim-in">
        <div className="group flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-[var(--surface)] transition-colors">
          <button
            className="w-6 h-6 grid place-items-center rounded-md flex-none text-[var(--faint)] hover:text-[var(--ink)] hover:bg-[var(--card)] disabled:opacity-0"
            style={{ transform: open ? 'rotate(90deg)' : '', transition: 'transform .15s, color .15s, background .15s' }}
            disabled={!has}
            aria-label={open ? 'Thu gọn' : 'Mở rộng'}
            onClick={() => has && setOpen(!open)}
          >
            {has ? <ChevronRight size={16} /> : null}
          </button>
          <span
            className="iconbox flex-none"
            style={root
              ? { width: 34, height: 34 }
              : { width: 34, height: 34, background: 'var(--surface)', color: 'var(--muted)' }}
          >
            <Icon size={18} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="truncate text-sm font-semibold text-[var(--ink)]">{node.name}</div>
            <div className="truncate text-xs mono text-[var(--faint)]">{node.code}</div>
          </div>
          <span className={`pill ${root ? 'pill-accent' : 'pill-neutral'} flex-none`}>Cấp {node.level + 1}</span>
          {canManage && (
            <span className="flex flex-none gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              <button className="btn btn-sm" title="Nâng cấp" disabled={node.level === 0} onClick={() => mLevel.mutate({ id: node.id, direction: 'up' })}><ChevronUp size={15} /></button>
              <button className="btn btn-sm" title="Hạ cấp" disabled={index === 0} onClick={() => mLevel.mutate({ id: node.id, direction: 'down' })}><ChevronDown size={15} /></button>
              <button className="btn btn-sm" title="Thêm đơn vị con" onClick={() => { setForm({ name: '', code: '' }); setCreate({ parentId: node.id }); }}><Plus size={15} /></button>
              <button className="btn btn-sm btn-danger" title="Xoá" onClick={() => { if (window.confirm(`Xoá đơn vị "${node.name}"?`)) mDelete.mutate(node.id); }}><Trash2 size={15} /></button>
            </span>
          )}
        </div>
        {has && open && <div className="ml-5 pl-3" style={{ borderLeft: '1.5px solid var(--border)' }}>{node.children.map((c, i, arr) => <Row key={c.id} node={c} index={i} count={arr.length} />)}</div>}
      </div>
    );
  };

  const roots = tree.data ?? [];

  return (
    <>
      <PageHead title="Tổ chức" subtitle="Cây đơn vị đa tầng · thêm và di chuyển đơn vị"
        actions={canManage && <button className="btn btn-primary" onClick={() => { setForm({ name: '', code: '' }); setCreate({ parentId: null }); }}><Plus size={16} />Đơn vị gốc</button>} />
      {tree.isLoading ? <Spinner /> : roots.length === 0 ? (
        <div className="card max-w-[640px]">
          <EmptyState
            title="Chưa có đơn vị nào"
            hint="Tạo đơn vị gốc để bắt đầu xây dựng cây tổ chức."
            action={canManage ? <button className="btn btn-primary" onClick={() => { setForm({ name: '', code: '' }); setCreate({ parentId: null }); }}><Plus size={16} />Đơn vị gốc</button> : undefined}
          />
        </div>
      ) : (
        <div className="card p-2.5 max-w-[640px]">{roots.map((n, i, arr) => <Row key={n.id} node={n} index={i} count={arr.length} />)}</div>
      )}

      {/* Create drawer */}
      <Drawer open={!!create} onClose={() => setCreate(null)} title={<b>Thêm đơn vị</b>}
        footer={<><div className="flex-1" /><button className="btn" onClick={() => setCreate(null)}>Huỷ</button>
          <button className="btn btn-primary" disabled={!form.name || !form.code || mCreate.isPending} onClick={() => mCreate.mutate()}>{mCreate.isPending && <Loader2 size={15} className="animate-spin" />}Thêm</button></>}>
        <p className="text-sm text-[var(--muted)] mb-3">
          {create?.parentId ? <>Thêm vào <b className="text-[var(--ink)]">{(flat.data ?? []).find((o: any) => o.id === create.parentId)?.name}</b> · </> : null}
          <span className="pill pill-accent">Cấp {createLevel + 1}</span>
        </p>
        <label className="block mb-3"><span className="label">Tên</span><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label className="block"><span className="label">Mã (unique)</span><input className="input mono" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></label>
      </Drawer>
    </>
  );
}
