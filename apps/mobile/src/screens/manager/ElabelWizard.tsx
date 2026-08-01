import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Icon } from '../../components/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WizardShell } from '../../components/WizardShell';
import { Card, Field, AppText, Loading, RowsCard, Row } from '../../components/ui';
import { useProducts } from '../../lib/queries';
import { api, apiError } from '../../lib/api';
import { useTheme, font } from '../../theme';
import { useToast } from '../../components/Toast';

const RISK = ['Chưa xác định', 'Cao', 'Trung bình', 'Thấp'];

export default function ElabelWizard({ onClose }: { onClose: () => void }) {
  const t = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const products = useProducts();
  const [productId, setProductId] = useState('');
  const [pq, setPq] = useState('');
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState<any>(null);

  const detail = useQuery({ queryKey: ['elabel', productId], enabled: !!productId, queryFn: () => api.get(`/elabels/${productId}`).then((r) => r.data) });
  useEffect(() => {
    if (detail.data && (!f || f.__id !== productId)) {
      const d = detail.data; const o = d.ownerInfo ?? {};
      setF({ __id: productId, name: d.name ?? '', brand: d.brand ?? '', description: d.description ?? '', countryOfOrigin: d.countryOfOrigin ?? '', netContent: d.netContent ?? '', ingredients: d.ingredients ?? '', usageInstructions: d.usageInstructions ?? '', storageInstructions: d.storageInstructions ?? '', safetyWarnings: d.safetyWarnings ?? '', riskLevel: d.riskLevel ?? 0, owner: { name: o.name ?? '', tax_code: o.tax_code ?? '', address: o.address ?? '', representative: o.representative ?? '' }, _keep: { appendixGroup: d.appendixGroup ?? null, appendixAttributes: d.appendixAttributes ?? {}, labelAttributes: d.labelAttributes ?? [], labelImages: d.labelImages ?? [], certificates: d.certificates ?? [] } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail.data, productId]);

  const product = (products.data ?? []).find((p) => p.id === productId);
  const steps = ['product', 'basic', 'owner', 'content', 'usage', 'safety', 'origin', 'review'];
  const step = steps[idx]; const total = steps.length;
  const TITLES: Record<string, string> = { product: 'Chọn sản phẩm', basic: 'Tên & nhãn hiệu', owner: 'Doanh nghiệp', content: 'Thành phần & định lượng', usage: 'Công dụng & bảo quản', safety: 'Cảnh báo & rủi ro', origin: 'Xuất xứ', review: 'Xem lại & phát hành' };

  const savePayload = () => ({
    name: f.name, brand: f.brand, description: f.description, countryOfOrigin: f.countryOfOrigin, netContent: f.netContent,
    ingredients: f.ingredients, usageInstructions: f.usageInstructions, storageInstructions: f.storageInstructions,
    safetyWarnings: f.safetyWarnings, riskLevel: Number(f.riskLevel || 0), ownerInfo: f.owner,
    appendixGroup: f._keep.appendixGroup, appendixAttributes: f._keep.appendixAttributes, labelAttributes: f._keep.labelAttributes, labelImages: f._keep.labelImages, certificates: f._keep.certificates,
  });
  const save = async () => { await api.patch(`/elabels/${productId}`, savePayload()); };
  const draft = useMutation({ mutationFn: save, onSuccess: () => { qc.invalidateQueries({ queryKey: ['elabels'] }); toast('Đã lưu nháp nhãn'); }, onError: (e) => toast(apiError(e), false) });
  const publish = useMutation({ mutationFn: async () => { await save(); await api.post(`/elabels/${productId}/status`, { status: 'published' }); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['elabels'] }); toast('Đã phát hành nhãn'); onClose(); }, onError: (e) => toast(apiError(e), false) });

  const canNext = step === 'product' ? !!productId : step === 'basic' ? !!f?.name?.trim() : true;
  const goBack = () => { if (idx === 0) onClose(); else setIdx((i) => i - 1); };
  const goNext = () => { if (step === 'review') { setBusy(true); publish.mutate(undefined, { onSettled: () => setBusy(false) }); } else setIdx((i) => i + 1); };
  const set = (k: string, v: any) => setF((s: any) => ({ ...s, [k]: v }));
  const setOwner = (k: string, v: any) => setF((s: any) => ({ ...s, owner: { ...s.owner, [k]: v } }));

  const shownP = (products.data ?? []).filter((p) => !pq || p.name.toLowerCase().includes(pq.toLowerCase()) || (p.gtin ?? '').includes(pq));

  return (
    <WizardShell title={TITLES[step]} step={idx + 1} total={total} onBack={goBack} onNext={goNext} nextLabel={step === 'review' ? 'Phát hành nhãn' : 'Tiếp tục'} nextDisabled={!canNext} busy={busy} onDraft={idx >= 1 && idx <= 6 ? () => draft.mutate() : undefined}>
      {product && step !== 'product' && <AppText muted style={{ marginBottom: 12 }}>{product.name} · {product.gtin}</AppText>}
      {step === 'product' && (
        <View>
          <Field value={pq} onChangeText={setPq} placeholder="Tìm tên / GTIN…" />
          <ScrollView style={{ maxHeight: 400 }}>
            {shownP.map((p) => (
              <Card key={p.id} onPress={() => { setProductId(p.id); }} style={{ marginBottom: 8, borderColor: productId === p.id ? t.accent : t.border, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Icon name="pricetag-outline" size={18} color={t.accent} />
                <View style={{ flex: 1 }}><Text style={{ color: t.ink, fontFamily: font.semibold, fontSize: 14.5 }}>{p.name}</Text><Text style={{ color: t.muted, fontFamily: font.mono, fontSize: 11.5, marginTop: 2 }}>{p.gtin}</Text></View>
                {productId === p.id && <Icon name="checkmark-circle" size={20} color={t.accent} />}
              </Card>
            ))}
          </ScrollView>
        </View>
      )}
      {!f && step !== 'product' ? <Loading /> : f && (
        <>
          {step === 'basic' && <><Field label="Tên sản phẩm *" value={f.name} onChangeText={(v) => set('name', v)} autoCapitalize="sentences" /><Field label="Nhãn hiệu" value={f.brand} onChangeText={(v) => set('brand', v)} autoCapitalize="words" /><Field label="Mô tả ngắn" value={f.description} onChangeText={(v) => set('description', v)} multiline autoCapitalize="sentences" /></>}
          {step === 'owner' && <><Field label="Tên doanh nghiệp" value={f.owner.name} onChangeText={(v) => setOwner('name', v)} autoCapitalize="words" /><Field label="Mã số thuế" value={f.owner.tax_code} onChangeText={(v) => setOwner('tax_code', v)} /><Field label="Địa chỉ" value={f.owner.address} onChangeText={(v) => setOwner('address', v)} autoCapitalize="sentences" /><Field label="Người đại diện" value={f.owner.representative} onChangeText={(v) => setOwner('representative', v)} autoCapitalize="words" /></>}
          {step === 'content' && <><Field label="Thành phần / cấu tạo" value={f.ingredients} onChangeText={(v) => set('ingredients', v)} multiline autoCapitalize="sentences" /><Field label="Định lượng" value={f.netContent} onChangeText={(v) => set('netContent', v)} placeholder="VD: 50ml · 20 viên · 5kg" /></>}
          {step === 'usage' && <><Field label="Hướng dẫn sử dụng" value={f.usageInstructions} onChangeText={(v) => set('usageInstructions', v)} multiline autoCapitalize="sentences" /><Field label="Hướng dẫn bảo quản" value={f.storageInstructions} onChangeText={(v) => set('storageInstructions', v)} multiline autoCapitalize="sentences" /></>}
          {step === 'safety' && (
            <>
              <Field label="Cảnh báo an toàn" value={f.safetyWarnings} onChangeText={(v) => set('safetyWarnings', v)} multiline autoCapitalize="sentences" />
              <Text style={{ color: t.ink2, fontFamily: font.semibold, fontSize: 12.5, marginBottom: 8 }}>Mức rủi ro</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {RISK.map((r, i) => {
                  const on = Number(f.riskLevel) === i;
                  return (
                    <Card key={i} onPress={() => set('riskLevel', i)} elevated={false} style={{ paddingVertical: 9, paddingHorizontal: 13, borderColor: on ? t.accent : t.border, backgroundColor: on ? t.accentSoft : t.card }}>
                      <Text style={{ color: on ? t.accentInk : t.ink2, fontFamily: on ? font.semibold : font.medium, fontSize: 13 }}>{r}</Text>
                    </Card>
                  );
                })}
              </View>
            </>
          )}
          {step === 'origin' && <Field label="Xuất xứ" value={f.countryOfOrigin} onChangeText={(v) => set('countryOfOrigin', v)} autoCapitalize="words" />}
          {step === 'review' && (() => {
            const rows: [string, any][] = [['Tên', f.name], ['Nhãn hiệu', f.brand || '—'], ['Doanh nghiệp', f.owner.name || '—'], ['Định lượng', f.netContent || '—'], ['Rủi ro', RISK[Number(f.riskLevel) || 0]], ['Xuất xứ', f.countryOfOrigin || '—']];
            return (
              <RowsCard>
                {rows.map(([k, v], i) => <Row key={k} label={k} value={String(v)} last={i === rows.length - 1} />)}
                <AppText muted style={{ marginTop: 12, marginBottom: 4 }}>Phát hành sẽ lưu nội dung và công bố nhãn lên mã QR sản phẩm.</AppText>
              </RowsCard>
            );
          })()}
        </>
      )}
    </WizardShell>
  );
}
