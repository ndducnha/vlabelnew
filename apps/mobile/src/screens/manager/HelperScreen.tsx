import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Icon } from '../../components/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Screen, Title, Card, Field, AppText, Pill, Loading, Avatar, IconBadge, RowsCard, Row } from '../../components/ui';
import { useProducts, useFlowsAll, useBranchUsers } from '../../lib/queries';
import { WizardShell } from '../../components/WizardShell';
import { api, apiError } from '../../lib/api';
import { useTheme, font } from '../../theme';
import { useToast } from '../../components/Toast';
import ElabelWizard from './ElabelWizard';
import SuppWizard from './SuppWizard';

type Mode = 'trace' | 'elabel' | 'supp' | 'sched';

export default function HelperScreen({ navigation }: any) {
  const t = useTheme();
  const [mode, setMode] = useState<Mode | null>(null);
  if (mode === 'trace' || mode === 'sched') return <TraceWizard scheduleOnly={mode === 'sched'} onClose={() => setMode(null)} />;
  if (mode === 'elabel') return <ElabelWizard onClose={() => setMode(null)} />;
  if (mode === 'supp') return <SuppWizard onClose={() => setMode(null)} />;

  const OPTS: { m: Mode; icon: any; label: string; desc: string }[] = [
    { m: 'trace', icon: 'git-branch-outline', label: 'Tạo Truy xuất nguồn gốc', desc: 'Chọn sản phẩm, quy trình, phạm vi và phân công.' },
    { m: 'sched', icon: 'calendar-outline', label: 'Quản lý lịch truy xuất', desc: 'Giao việc kê khai theo lô, thời hạn.' },
    { m: 'elabel', icon: 'pricetag-outline', label: 'Tạo Nhãn điện tử', desc: 'Soạn nội dung nhãn và phát hành.' },
    { m: 'supp', icon: 'document-text-outline', label: 'Tạo Nhãn phụ', desc: 'Nhãn phụ tiếng Việt trên cùng QR.' },
  ];
  return (
    <Screen>
      <Title eyebrow="Trợ lý thiết lập" sub="Bạn muốn làm gì?">Trợ lý VLabel</Title>
      <View style={{ gap: 12 }}>
        {OPTS.map((o) => (
          <Card key={o.m} onPress={() => setMode(o.m)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <IconBadge name={o.icon} tone="accent" size={46} />
            <View style={{ flex: 1 }}><Text style={{ color: t.ink, fontFamily: font.semibold, fontSize: 15 }}>{o.label}</Text><Text style={{ color: t.muted, fontFamily: font.body, fontSize: 12.5, marginTop: 2, lineHeight: 17 }}>{o.desc}</Text></View>
            <Icon name="chevron-forward" size={18} color={t.faint} />
          </Card>
        ))}
      </View>
    </Screen>
  );
}

function TraceWizard({ scheduleOnly, onClose }: { scheduleOnly: boolean; onClose: () => void }) {
  const t = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const products = useProducts();
  const flowsAll = useFlowsAll();
  const users = useBranchUsers();
  const [idx, setIdx] = useState(0);
  const [productId, setProductId] = useState('');
  const [flowId, setFlowId] = useState('');
  const [lot, setLot] = useState('');
  const [assignee, setAssignee] = useState('');
  const [busy, setBusy] = useState(false);
  const [pq, setPq] = useState('');

  const product = (products.data ?? []).find((p) => p.id === productId);
  const productFlows = (product?.flows ?? []).map((x) => x.flow);
  const steps = ['product', 'flow', 'scope', 'assign', 'review'];
  const step = steps[idx]; const total = steps.length;
  const TITLES: Record<string, string> = { product: 'Chọn sản phẩm', flow: 'Chọn quy trình', scope: 'Phạm vi (lô)', assign: 'Phân công', review: 'Xác nhận' };

  const create = useMutation({
    mutationFn: async () => {
      if (!scheduleOnly && flowId) { try { await api.post(`/products/${productId}/flows/attach`, { flowId }); } catch { /* đã gắn */ } }
      await api.post('/trace-tasks', { name: `Kê khai ${product?.name}`, productId, lot: lot || undefined, flowId: flowId || undefined, assignedUserId: assignee, startDate: new Date().toISOString(), endDate: new Date(Date.now() + 14 * 864e5).toISOString() });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['trace-tasks'] }); toast('Đã thiết lập & giao việc'); onClose(); },
    onError: (e) => toast(apiError(e), false),
  });

  const canNext = step === 'product' ? !!productId : step === 'flow' ? (scheduleOnly || !!flowId || productFlows.length > 0) : step === 'assign' ? !!assignee : true;
  const goNext = () => { if (step === 'review') { setBusy(true); create.mutate(undefined, { onSettled: () => setBusy(false) }); } else setIdx((i) => i + 1); };
  const goBack = () => { if (idx === 0) onClose(); else setIdx((i) => i - 1); };

  const shownP = (products.data ?? []).filter((p) => !pq || p.name.toLowerCase().includes(pq.toLowerCase()) || (p.gtin ?? '').includes(pq));

  return (
    <WizardShell title={TITLES[step]} step={idx + 1} total={total} onBack={goBack} onNext={goNext} nextLabel={step === 'review' ? 'Hoàn tất thiết lập' : 'Tiếp tục'} nextDisabled={!canNext} busy={busy}>
      {step === 'product' && (
        <View>
          <Field value={pq} onChangeText={setPq} placeholder="Tìm tên / GTIN…" />
          <ScrollView style={{ maxHeight: 380 }}>
            {shownP.map((p) => (
              <Card key={p.id} onPress={() => { setProductId(p.id); setFlowId(''); }} style={{ marginBottom: 8, borderColor: productId === p.id ? t.accent : t.border, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Icon name="cube-outline" size={18} color={t.accent} />
                <View style={{ flex: 1 }}><Text style={{ color: t.ink, fontFamily: font.semibold, fontSize: 14.5 }}>{p.name}</Text><Text style={{ color: t.muted, fontFamily: font.mono, fontSize: 11.5, marginTop: 2 }}>{p.gtin}</Text></View>
                {productId === p.id && <Icon name="checkmark-circle" size={20} color={t.accent} />}
              </Card>
            ))}
          </ScrollView>
        </View>
      )}
      {step === 'flow' && (
        <View style={{ gap: 8 }}>
          {productFlows.length === 0 && <AppText muted>Sản phẩm chưa gắn quy trình. Chọn một quy trình để gán:</AppText>}
          {(productFlows.length ? productFlows : flowsAll.data ?? []).map((f) => (
            <Card key={f.id} onPress={() => setFlowId(f.id)} style={{ borderColor: flowId === f.id ? t.accent : t.border, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Icon name="git-branch-outline" size={18} color={t.accent} />
              <Text style={{ flex: 1, color: t.ink, fontFamily: font.semibold, fontSize: 14.5 }}>{f.name}</Text>
              {flowId === f.id && <Icon name="checkmark-circle" size={20} color={t.accent} />}
            </Card>
          ))}
        </View>
      )}
      {step === 'scope' && <><Field label="Số lô (tuỳ chọn)" value={lot} onChangeText={setLot} placeholder="VD: LOT-2408-01" /><AppText muted>Để trống nghĩa là áp dụng chung theo GTIN.</AppText></>}
      {step === 'assign' && (
        <View style={{ gap: 8 }}>
          {users.isLoading ? <Loading /> : (users.data ?? []).map((u) => (
            <Card key={u.id} onPress={() => setAssignee(u.id)} style={{ borderColor: assignee === u.id ? t.accent : t.border, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Avatar name={u.fullName} size={30} />
              <View style={{ flex: 1 }}><Text style={{ color: t.ink, fontFamily: font.semibold, fontSize: 14.5 }}>{u.fullName}</Text><Text style={{ color: t.muted, fontFamily: font.mono, fontSize: 11.5, marginTop: 2 }}>{u.email}</Text></View>
              {assignee === u.id && <Icon name="checkmark-circle" size={20} color={t.accent} />}
            </Card>
          ))}
        </View>
      )}
      {step === 'review' && (() => {
        const rows: [string, any][] = [['Sản phẩm', product?.name], ['GTIN', product?.gtin], ['Quy trình', (flowsAll.data ?? []).concat(productFlows).find((f) => f.id === flowId)?.name ?? 'Quy trình của SP'], ['Lô', lot || 'GTIN chung'], ['Người phụ trách', (users.data ?? []).find((u) => u.id === assignee)?.fullName]];
        return (
          <RowsCard>
            {rows.map(([k, v], i) => <Row key={k} label={k} value={String(v ?? '—')} last={i === rows.length - 1} />)}
          </RowsCard>
        );
      })()}
    </WizardShell>
  );
}
