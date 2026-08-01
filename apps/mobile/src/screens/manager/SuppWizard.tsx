import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Icon } from '../../components/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WizardShell } from '../../components/WizardShell';
import { Card, Field, AppText, RowsCard, Row } from '../../components/ui';
import { useProducts } from '../../lib/queries';
import { api, apiError } from '../../lib/api';
import { useTheme, font } from '../../theme';
import { useToast } from '../../components/Toast';

const SCOPES: [string, string][] = [['ALL', 'Toàn bộ GTIN'], ['BATCH', 'Theo lô'], ['PRODUCTION', 'Theo ngày sản xuất'], ['ITEM', 'Theo serial']];
const TEMPLATE = `THÀNH PHẦN:\n\nCÔNG DỤNG:\n\nHƯỚNG DẪN SỬ DỤNG:\n\nHƯỚNG DẪN BẢO QUẢN:\n\nCẢNH BÁO:\n\nXUẤT XỨ / TỔ CHỨC CHỊU TRÁCH NHIỆM:\n`;

export default function SuppWizard({ onClose }: { onClose: () => void }) {
  const t = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const products = useProducts();
  const [pq, setPq] = useState('');
  const [productId, setProductId] = useState('');
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState<any>({ name: 'Nhãn phụ tiếng Việt', scope: 'ALL', batchCode: '', mfgDate: '', serial: '', content: '' });

  const product = (products.data ?? []).find((p) => p.id === productId);
  const steps = ['product', 'scope', 'content', 'review'];
  const step = steps[idx]; const total = steps.length;
  const TITLES: Record<string, string> = { product: 'Chọn sản phẩm', scope: 'Phạm vi áp dụng', content: 'Nội dung nhãn phụ', review: 'Xem lại & phát hành' };

  const html = () => `<div>${(f.content || '').split('\n').map((l: string) => l.trim() ? `<p>${l}</p>` : '<br/>').join('')}</div>`;
  const payload = (status?: string) => ({ productId, name: f.name, scope: f.scope, batchCode: f.batchCode || undefined, manufacturingDate: f.mfgDate || undefined, serial: f.serial || undefined, contentHtml: html(), labelSize: '80x50', orientation: 'portrait' });
  const run = useMutation({
    mutationFn: async (status: 'draft' | 'published') => {
      const { data } = await api.post('/supplementary-labels', payload());
      if (status === 'published') await api.post(`/supplementary-labels/${data.id}/status`, { status: 'published' });
    },
    onSuccess: (_d, status) => { qc.invalidateQueries({ queryKey: ['supp'] }); toast(status === 'published' ? 'Đã phát hành nhãn phụ' : 'Đã lưu nháp'); onClose(); },
    onError: (e) => toast(apiError(e), false),
  });

  const canNext = step === 'product' ? !!productId : step === 'scope' ? (f.scope !== 'BATCH' || !!f.batchCode.trim()) : step === 'content' ? f.content.trim().length > 0 : true;
  const goBack = () => { if (idx === 0) onClose(); else setIdx((i) => i - 1); };
  const goNext = () => { if (step === 'review') { setBusy(true); run.mutate('published', { onSettled: () => setBusy(false) }); } else setIdx((i) => i + 1); };
  const set = (k: string, v: any) => setF((s: any) => ({ ...s, [k]: v }));
  const shownP = (products.data ?? []).filter((p) => !pq || p.name.toLowerCase().includes(pq.toLowerCase()) || (p.gtin ?? '').includes(pq));

  return (
    <WizardShell title={TITLES[step]} step={idx + 1} total={total} onBack={goBack} onNext={goNext} nextLabel={step === 'review' ? 'Phát hành' : 'Tiếp tục'} nextDisabled={!canNext} busy={busy} onDraft={idx === 2 || idx === 3 ? () => run.mutate('draft') : undefined}>
      {product && step !== 'product' && <AppText muted style={{ marginBottom: 12 }}>{product.name} · {product.gtin}</AppText>}
      {step === 'product' && (
        <View>
          <Field value={pq} onChangeText={setPq} placeholder="Tìm tên / GTIN…" />
          <ScrollView style={{ maxHeight: 400 }}>
            {shownP.map((p) => (
              <Card key={p.id} onPress={() => setProductId(p.id)} style={{ marginBottom: 8, borderColor: productId === p.id ? t.accent : t.border, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Icon name="document-text-outline" size={18} color={t.accent} />
                <View style={{ flex: 1 }}><Text style={{ color: t.ink, fontFamily: font.semibold, fontSize: 14.5 }}>{p.name}</Text><Text style={{ color: t.muted, fontFamily: font.mono, fontSize: 11.5, marginTop: 2 }}>{p.gtin}</Text></View>
                {productId === p.id && <Icon name="checkmark-circle" size={20} color={t.accent} />}
              </Card>
            ))}
          </ScrollView>
        </View>
      )}
      {step === 'scope' && (
        <View>
          <Field label="Tên nhãn phụ" value={f.name} onChangeText={(v) => set('name', v)} autoCapitalize="sentences" />
          <View style={{ gap: 8 }}>
            {SCOPES.map(([v, l]) => (
              <Card key={v} onPress={() => set('scope', v)} style={{ borderColor: f.scope === v ? t.accent : t.border, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Icon name="layers-outline" size={17} color={t.accent} />
                <Text style={{ flex: 1, color: t.ink, fontFamily: font.semibold, fontSize: 14.5 }}>{l}</Text>
                {f.scope === v && <Icon name="checkmark-circle" size={20} color={t.accent} />}
              </Card>
            ))}
          </View>
          {f.scope === 'BATCH' && <Field label="Số lô *" value={f.batchCode} onChangeText={(v) => set('batchCode', v)} />}
          {f.scope === 'PRODUCTION' && <Field label="Ngày sản xuất (YYYY-MM-DD)" value={f.mfgDate} onChangeText={(v) => set('mfgDate', v)} />}
          {f.scope === 'ITEM' && <Field label="Serial" value={f.serial} onChangeText={(v) => set('serial', v)} />}
        </View>
      )}
      {step === 'content' && (
        <View>
          <Card onPress={() => set('content', TEMPLATE)} style={{ marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="sparkles-outline" size={16} color={t.accent} /><Text style={{ color: t.accent, fontFamily: font.semibold, fontSize: 14 }}>Chèn mẫu nội dung</Text>
          </Card>
          <Field label="Nội dung (mỗi dòng một ý)" value={f.content} onChangeText={(v) => set('content', v)} multiline autoCapitalize="sentences" />
          <AppText muted>Nội dung hiển thị dạng trang web trên cùng mã QR của sản phẩm.</AppText>
        </View>
      )}
      {step === 'review' && (() => {
        const rows: [string, any][] = [['Sản phẩm', product?.name], ['GTIN', product?.gtin], ['Tên nhãn', f.name], ['Phạm vi', SCOPES.find(([v]) => v === f.scope)?.[1] + (f.scope === 'BATCH' ? ` · ${f.batchCode}` : '')]];
        return (
          <RowsCard>
            {rows.map(([k, v], i) => <Row key={k} label={k} value={String(v ?? '—')} last={i === rows.length - 1} />)}
            <Text style={{ color: t.ink2, fontFamily: font.semibold, fontSize: 13, marginTop: 12, marginBottom: 5 }}>Xem trước nội dung</Text>
            <Text style={{ color: t.muted, fontFamily: font.body, fontSize: 12.5, lineHeight: 18, marginBottom: 4 }}>{f.content.slice(0, 300)}{f.content.length > 300 ? '…' : ''}</Text>
          </RowsCard>
        );
      })()}
    </WizardShell>
  );
}
