import React, { useMemo, useState } from 'react';
import { View, Text, Image, Modal, Pressable, ScrollView, TextInput } from 'react-native';
import { Icon } from '../../components/icons';
import { useQuery, useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { Card, Button, Loading, Empty, Pill, ProgressBar, SegTabs, Avatar, AppText, IconBadge } from '../../components/ui';
import type { Product, Flow, TraceTask, EventRecord, UserSummary } from '@vlabel/shared';
import { api, apiError } from '../../lib/api';
import { useTheme, font } from '../../theme';
import { useToast } from '../../components/Toast';
import { vnDate, isOverdue } from '../../lib/format';
import { isRecordDone } from '../../lib/status';

export default function ProductDetailScreen({ route, navigation }: any) {
  const t = useTheme();
  const { productId, name, gtin } = route.params;
  const [tab, setTab] = useState<'flow' | 'assign' | 'sched' | 'progress'>('flow');
  const detail: UseQueryResult<Product> = useQuery({ queryKey: ['product', productId], queryFn: () => api.get(`/products/${productId}`).then((r) => r.data) });
  const flowsAll: UseQueryResult<Flow[]> = useQuery({ queryKey: ['flows-all'], queryFn: () => api.get('/flows').then((r) => r.data) });
  const flows = useMemo(() => {
    const ids = new Set((detail.data?.flows ?? []).map((x) => x.flow?.id ?? x.flowId));
    return (flowsAll.data ?? []).filter((f) => ids.has(f.id));
  }, [detail.data, flowsAll.data]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.surface }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <IconBadge name="cube-outline" tone="accent" size={46} />
        <View style={{ flex: 1 }}><Text style={{ color: t.ink, fontFamily: font.serifBold, fontSize: 18, letterSpacing: -0.2 }} numberOfLines={1}>{name}</Text><Text style={{ color: t.muted, fontFamily: font.mono, fontSize: 11.5, marginTop: 2 }}>GTIN {gtin}</Text></View>
        <Button title="Hành trình" small variant="default" onPress={() => navigation.navigate('Journey', { productId, name, gtin })} />
      </Card>

      <View style={{ marginBottom: 14 }}>
        <SegTabs value={tab} onChange={setTab} options={[{ value: 'flow', label: 'Quy trình' }, { value: 'assign', label: 'Phân công' }, { value: 'sched', label: 'Lịch' }, { value: 'progress', label: 'Tiến độ' }]} />
      </View>

      {detail.isLoading ? <Loading /> : (
        <>
          {tab === 'flow' && <FlowTab productId={productId} gtin={gtin} flows={flows} attachedIds={new Set(flows.map((f) => f.id))} flowsAll={flowsAll.data ?? []} onChanged={() => detail.refetch()} navigation={navigation} />}
          {tab === 'assign' && <AssignTab flows={flows} />}
          {tab === 'sched' && <SchedTab productId={productId} flows={flows} />}
          {tab === 'progress' && <ProgressTab productId={productId} flows={flows} />}
        </>
      )}
    </ScrollView>
  );
}

function FlowTab({ productId, gtin, flows, attachedIds, flowsAll, onChanged, navigation }: any) {
  const t = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const [qr, setQr] = useState<{ lot?: string } | null>(null);
  const inv = () => { qc.invalidateQueries({ queryKey: ['product', productId] }); qc.invalidateQueries({ queryKey: ['products'] }); onChanged(); };
  const attach = useMutation({ mutationFn: (flowId: string) => api.post(`/products/${productId}/flows/attach`, { flowId }), onSuccess: () => { toast('Đã gắn quy trình'); inv(); }, onError: (e) => toast(apiError(e), false) });
  const detach = useMutation({ mutationFn: (flowId: string) => api.delete(`/products/${productId}/flows/${flowId}`), onSuccess: () => { toast('Đã gỡ quy trình'); inv(); }, onError: (e) => toast(apiError(e), false) });

  return (
    <View style={{ gap: 10 }}>
      {flows.length === 0 && <Empty title="Chưa gắn quy trình" hint="Gắn quy trình bên dưới." />}
      {flows.map((f: any) => (
        <Card key={f.id}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Icon name="git-branch-outline" size={18} color={t.accent} />
            <View style={{ flex: 1 }}><Text style={{ color: t.ink, fontFamily: font.semibold, fontSize: 14.5 }}>{f.name}</Text><Text style={{ color: t.muted, fontFamily: font.body, fontSize: 12, marginTop: 1 }}>{f.versions?.[0]?.eventDefinitions?.length ?? 0} sự kiện</Text></View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <Button title="QR" small variant="default" onPress={() => setQr({})} />
            <Button title="Hành trình" small variant="default" onPress={() => navigation.navigate('Journey', { productId, flowId: f.id, gtin })} />
            <Button title="Gỡ" small variant="danger" onPress={() => detach.mutate(f.id)} />
          </View>
        </Card>
      ))}
      <AppText muted>Gắn thêm quy trình (một QR nhiều quy trình):</AppText>
      {flowsAll.filter((f: any) => !attachedIds.has(f.id)).map((f: any) => (
        <Card key={f.id} onPress={() => attach.mutate(f.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Icon name="add-circle-outline" size={18} color={t.accent} />
          <Text style={{ flex: 1, color: t.ink, fontFamily: font.medium, fontSize: 14 }}>{f.name}</Text>
        </Card>
      ))}
      {qr && <QrModal productId={productId} gtin={gtin} lot={qr.lot} onClose={() => setQr(null)} />}
    </View>
  );
}

function QrModal({ productId, gtin, lot, onClose }: any) {
  const t = useTheme();
  const qr = useQuery({ queryKey: ['qr', productId, lot], queryFn: () => api.get(`/products/${productId}/qr`, { params: { lot } }).then((r) => r.data) });
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.5)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: t.card, borderRadius: 20, padding: 22, alignItems: 'center', width: 288 }}>
          <Text style={{ color: t.ink, fontFamily: font.serifBold, fontSize: 18, marginBottom: 14 }}>QR sản phẩm</Text>
          {qr.isLoading ? <Loading /> : <Image source={{ uri: qr.data?.dataUrl }} style={{ width: 220, height: 220 }} />}
          <Text style={{ color: t.muted, fontFamily: font.mono, fontSize: 10.5, marginTop: 12, textAlign: 'center' }}>{qr.data?.url}</Text>
        </View>
      </Pressable>
    </Modal>
  );
}

function AssignTab({ flows }: any) {
  const t = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const [flowId, setFlowId] = useState(flows[0]?.id ?? '');
  const flow = flows.find((f: any) => f.id === flowId) ?? flows[0];
  const [scope, setScope] = useState('');
  const [q, setQ] = useState('');
  const events = (flow?.versions?.[0]?.eventDefinitions ?? []).slice().sort((a: any, b: any) => a.order - b.order);
  const perms = useQuery({ queryKey: ['flow-perms', flow?.id], enabled: !!flow, queryFn: () => api.get(`/flows/${flow.id}/permissions`).then((r) => r.data) });
  const search: UseQueryResult<UserSummary[]> = useQuery({ queryKey: ['users-branch', q], enabled: q.trim().length > 0, queryFn: () => api.get('/users/branch', { params: { q } }).then((r) => r.data) });
  const inv = () => qc.invalidateQueries({ queryKey: ['flow-perms', flow?.id] });
  const add = useMutation({ mutationFn: (userId: string) => api.post(`/flows/${flow.id}/permissions`, { userId, eventDefinitionId: scope || undefined }), onSuccess: () => { toast('Đã phân công'); setQ(''); inv(); }, onError: (e) => toast(apiError(e), false) });
  const del = useMutation({ mutationFn: (id: string) => api.delete(`/flow-permissions/${id}`), onSuccess: () => inv() });

  if (!flow) return <Empty title="Chưa có quy trình" hint="Gắn quy trình để phân công." />;
  return (
    <View style={{ gap: 12 }}>
      {flows.length > 1 && <SegTabs value={flowId} onChange={setFlowId} options={flows.map((f: any) => ({ value: f.id, label: f.name.slice(0, 10) }))} />}
      <Card style={{ gap: 10 }}>
        <AppText muted>Phạm vi phụ trách</AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          <Pressable onPress={() => setScope('')}><Pill label="Toàn bộ quy trình" tone={scope === '' ? 'accent' : 'neutral'} /></Pressable>
          {events.map((ev: any) => <Pressable key={ev.id} onPress={() => setScope(ev.id)}><Pill label={ev.name} tone={scope === ev.id ? 'accent' : 'neutral'} /></Pressable>)}
        </ScrollView>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: t.border, borderRadius: 10, paddingHorizontal: 10 }}>
          <Icon name="search" size={15} color={t.muted} />
          <TextInput style={{ flex: 1, color: t.ink, fontFamily: font.body, fontSize: 14.5, paddingVertical: 10 }} placeholder="Tìm người…" placeholderTextColor={t.faint} value={q} onChangeText={setQ} autoCapitalize="none" />
        </View>
        {(search.data ?? []).map((u) => (
          <Pressable key={u.id} onPress={() => add.mutate(u.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
            <Avatar name={u.fullName} size={26} />
            <Text style={{ flex: 1, color: t.ink, fontFamily: font.medium, fontSize: 14 }}>{u.fullName}</Text>
            <Icon name="add-circle" size={20} color={t.accent} />
          </Pressable>
        ))}
      </Card>

      <AppText muted>Đang phụ trách ({(perms.data ?? []).length})</AppText>
      {perms.isLoading ? <Loading /> : (perms.data ?? []).map((p: any) => (
        <Card key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Avatar name={p.user.fullName} size={30} />
          <View style={{ flex: 1, gap: 5 }}><Text style={{ color: t.ink, fontFamily: font.semibold, fontSize: 14 }}>{p.user.fullName}</Text><Pill label={p.eventDefinitionId ? `Sự kiện: ${p.eventDefinition?.name ?? '—'}` : 'Toàn bộ quy trình'} tone={p.eventDefinitionId ? 'neutral' : 'accent'} /></View>
          <Pressable onPress={() => del.mutate(p.id)}><Icon name="trash-outline" size={18} color={t.danger} /></Pressable>
        </Card>
      ))}
    </View>
  );
}

function SchedTab({ productId, flows }: any) {
  const t = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const tasks: UseQueryResult<TraceTask[]> = useQuery({ queryKey: ['trace-tasks', 'all'], queryFn: () => api.get('/trace-tasks').then((r) => r.data) });
  const inv = () => qc.invalidateQueries({ queryKey: ['trace-tasks'] });
  const setStatus = useMutation({ mutationFn: ({ id, status }: any) => api.patch(`/trace-tasks/${id}/status`, { status }), onSuccess: () => inv(), onError: (e) => toast(apiError(e), false) });
  const list = (tasks.data ?? []).filter((x) => x.product?.id === productId);

  return (
    <View style={{ gap: 10 }}>
      {tasks.isLoading ? <Loading /> : list.length === 0 ? <Empty title="Chưa có lịch" hint="Tạo lịch trên web hoặc Helper." /> : list.map((x) => {
        const od = isOverdue(x.endDate, x.status);
        return (
          <Card key={x.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ flex: 1, color: t.ink, fontFamily: font.semibold, fontSize: 14.5 }}>{x.name || 'Lịch truy xuất'}</Text>
              <Pill label={od ? 'Quá hạn' : x.status === 'DONE' ? 'Hoàn thành' : x.status === 'IN_PROGRESS' ? 'Đang làm' : 'Chưa bắt đầu'} tone={od ? 'danger' : x.status === 'DONE' ? 'good' : 'accent'} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              {x.lot ? <Pill label={`Lô ${x.lot}`} /> : null}{x.flow?.name ? <Pill label={x.flow.name} tone="accent" /> : null}
              <Pill label={x.assignedUser?.fullName ?? '—'} />
            </View>
            <Text style={{ color: t.muted, fontFamily: font.monoMed, fontSize: 11.5, marginTop: 8 }}>HẠN {vnDate(x.endDate)}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              {x.status !== 'IN_PROGRESS' && x.status !== 'DONE' && <Button title="Bắt đầu" small variant="default" onPress={() => setStatus.mutate({ id: x.id, status: 'IN_PROGRESS' })} />}
              {x.status === 'IN_PROGRESS' && <Button title="Tạm dừng" small variant="default" onPress={() => setStatus.mutate({ id: x.id, status: 'PENDING' })} />}
              {x.status !== 'DONE' && <Button title="Hoàn thành" small onPress={() => setStatus.mutate({ id: x.id, status: 'DONE' })} />}
            </View>
          </Card>
        );
      })}
    </View>
  );
}

function ProgressTab({ productId, flows }: any) {
  const t = useTheme();
  const records: UseQueryResult<EventRecord[]> = useQuery({ queryKey: ['recs-by-product', productId], queryFn: () => api.get('/event-records/by-product', { params: { productId } }).then((r) => r.data) });
  const events = flows.flatMap((f: any) => f.versions?.[0]?.eventDefinitions ?? []);
  const total = events.length;
  const lots = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const r of records.data ?? []) if (isRecordDone(r.status)) { const lot = r.traceableItem?.batchOrLot || '(không lô)'; const s = m.get(lot) ?? new Set(); s.add(r.eventDefinitionId); m.set(lot, s); }
    return Array.from(m.entries());
  }, [records.data]);

  if (flows.length === 0) return <Empty title="Chưa có quy trình" />;
  return (
    <View style={{ gap: 10 }}>
      {records.isLoading ? <Loading /> : lots.length === 0 ? <Empty title="Chưa có dữ liệu" hint="Tiến độ hiện khi bắt đầu kê khai." /> : lots.map(([lot, set]) => {
        const pct = total ? Math.round((set.size / total) * 100) : 0;
        return (
          <Card key={lot}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}><Text style={{ color: t.ink, fontFamily: font.semibold, fontSize: 14 }}>Lô {lot}</Text><Text style={{ color: t.muted, fontFamily: font.monoMed, fontSize: 11.5 }}>{set.size}/{total} · {pct}%</Text></View>
            <ProgressBar value={pct} />
          </Card>
        );
      })}
    </View>
  );
}
