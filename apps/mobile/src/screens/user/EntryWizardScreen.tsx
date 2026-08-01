import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, Image, ScrollView } from 'react-native';
import { Icon } from '../../components/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { WizardShell } from '../../components/WizardShell';
import { Card, Field, AppText, Pill, Loading, Button, RowsCard, Row } from '../../components/ui';
import { useProducts } from '../../lib/queries';
import { api, apiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useTheme, font } from '../../theme';
import { useToast } from '../../components/Toast';
import { submitRecord, addPending, PendingRecord } from '../../lib/offline';

export default function EntryWizardScreen({ route, navigation }: any) {
  const t = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const preProductId: string | undefined = route.params?.productId;
  const preLot: string | undefined = route.params?.lot;

  const products = useProducts();
  const [productId, setProductId] = useState<string | undefined>(preProductId);
  const [lot, setLot] = useState(preLot ?? '');
  const [flowId, setFlowId] = useState('');
  const [idx, setIdx] = useState(0);
  const [event, setEvent] = useState<any>(null);
  const [performer, setPerformer] = useState(user?.fullName ?? '');
  const [location, setLocation] = useState('');
  const [action, setAction] = useState('');
  const [values, setValues] = useState<Record<string, any>>({});
  const [media, setMedia] = useState<{ uri: string }[]>([]);
  const [busy, setBusy] = useState(false);

  const product = (products.data ?? []).find((p) => p.id === productId);
  const flows = (product?.flows ?? []).map((x) => x.flow);
  const effFlowId = flowId || (flows.length === 1 ? flows[0].id : '');
  const flowDetail = useQuery({ queryKey: ['flow', effFlowId], enabled: !!effFlowId, queryFn: () => api.get(`/flows/${effFlowId}`).then((r) => r.data) });
  const version = flowDetail.data?.versions?.[0];
  const events = useQuery({ queryKey: ['entry-events', version?.id], enabled: !!version?.id, queryFn: () => api.get(`/flow-versions/${version.id}/entry-events`).then((r) => r.data) });

  const steps = useMemo(() => {
    const s = ['product'];
    if (flows.length > 1) s.push('flow');
    s.push('event');
    if (event) { s.push('who', 'location', 'activity'); if ((event.fields?.length ?? 0) > 0) s.push('fields'); s.push('media', 'review'); }
    return s;
  }, [flows.length, event]);
  const step = steps[Math.min(idx, steps.length - 1)];
  const total = steps.length;

  const TITLES: Record<string, string> = { product: 'Sản phẩm / lô', flow: 'Chọn quy trình', event: 'Chọn công đoạn', who: 'Ai thực hiện?', location: 'Thực hiện ở đâu?', activity: 'Đã làm gì?', fields: 'Thông tin khai báo', media: 'Hình ảnh / minh chứng', review: 'Xem lại & gửi' };

  const requiredOk = (event?.fields ?? []).filter((f: any) => f.required).every((f: any) => values[f.key] !== undefined && values[f.key] !== '');
  const canNext =
    step === 'product' ? !!(productId && flows.length > 0) :
    step === 'flow' ? !!effFlowId :
    step === 'event' ? !!event :
    step === 'fields' ? requiredOk : true;
  const isLast = step === 'review';

  const pickImage = async (fromCamera: boolean) => {
    const perm = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return toast('Cần cấp quyền để tiếp tục', false);
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.6 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.6, mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (!res.canceled && res.assets?.[0]) setMedia((m) => [...m, { uri: res.assets[0].uri }]);
  };

  const submit = async () => {
    if (!version || !event || !productId) return;
    setBusy(true);
    const rec: PendingRecord = {
      clientId: `${productId}-${event.id}-${Date.now()}`, productId, lot: lot || undefined,
      flowVersionId: version.id, eventDefinitionId: event.id, location: location || undefined,
      performedAt: new Date().toISOString(), action: action || undefined, performerName: performer || undefined,
      values, mediaUris: media.map((m) => ({ uri: m.uri, name: 'photo.jpg', type: 'image/jpeg' })),
    };
    try {
      await submitRecord(rec);
      qc.invalidateQueries({ queryKey: ['trace-tasks'] });
      toast('Đã gửi khai báo');
      navigation.goBack();
    } catch (e: any) {
      if (e?.message === 'Network Error') {
        await addPending(rec);
        toast('Mất mạng · đã lưu nháp, sẽ tự đồng bộ', true);
        navigation.goBack();
      } else toast(apiError(e), false);
    } finally { setBusy(false); }
  };

  const goBack = () => { if (idx === 0) navigation.goBack(); else setIdx((i) => i - 1); };
  const goNext = () => { if (isLast) submit(); else setIdx((i) => i + 1); };

  return (
    <WizardShell title={TITLES[step] ?? ''} step={Math.min(idx + 1, total)} total={total} onBack={goBack} onNext={goNext} nextLabel={isLast ? 'Hoàn tất khai báo' : 'Tiếp tục'} nextDisabled={!canNext} busy={busy}>
      {product && step !== 'product' && <AppText muted style={{ marginBottom: 12 }}>{product.name}{lot ? ` · Lô ${lot}` : ''}</AppText>}

      {step === 'product' && (
        <View>
          {products.isLoading ? <Loading /> : (
            <ScrollView style={{ maxHeight: 320 }}>
              {(products.data ?? []).map((p) => (
                <Card key={p.id} onPress={() => { setProductId(p.id); setFlowId(''); setEvent(null); }} style={{ marginBottom: 8, borderColor: productId === p.id ? t.accent : t.border, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Icon name="cube-outline" size={20} color={t.accent} />
                  <View style={{ flex: 1 }}><Text style={{ color: t.ink, fontFamily: font.semibold, fontSize: 14.5 }}>{p.name}</Text><Text style={{ color: t.muted, fontFamily: font.mono, fontSize: 11.5, marginTop: 2 }}>{p.gtin} · {(p.flows ?? []).length} flow</Text></View>
                  {productId === p.id && <Icon name="checkmark-circle" size={20} color={t.accent} />}
                </Card>
              ))}
            </ScrollView>
          )}
          <Field label="Lô / ngày sản xuất" value={lot} onChangeText={setLot} placeholder="VD: LOT-2408-01" />
          {product && flows.length === 0 && <Pill label="Sản phẩm chưa gán quy trình" tone="warn" />}
        </View>
      )}

      {step === 'flow' && (
        <View style={{ gap: 8 }}>
          {flows.map((f) => (
            <Card key={f.id} onPress={() => { setFlowId(f.id); setEvent(null); }} style={{ borderColor: effFlowId === f.id ? t.accent : t.border, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Icon name="git-branch-outline" size={18} color={t.accent} />
              <Text style={{ flex: 1, color: t.ink, fontFamily: font.semibold, fontSize: 14.5 }}>{f.name}</Text>
              {effFlowId === f.id && <Icon name="checkmark-circle" size={20} color={t.accent} />}
            </Card>
          ))}
        </View>
      )}

      {step === 'event' && (
        events.isLoading ? <Loading /> :
          (events.data ?? []).length === 0 ? <Card><AppText muted>Bạn chưa được cấp quyền kê khai công đoạn nào của quy trình này.</AppText></Card> :
            <View style={{ gap: 8 }}>
              {(events.data ?? []).map((ev: any) => (
                <Card key={ev.id} onPress={() => setEvent(ev)} style={{ borderColor: event?.id === ev.id ? t.accent : t.border, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: t.accentSoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: t.accent, fontFamily: font.serifBold, fontSize: 14 }}>{ev.order}</Text></View>
                  <View style={{ flex: 1 }}><Text style={{ color: t.ink, fontFamily: font.semibold, fontSize: 14.5 }}>{ev.name}</Text>{(ev.fields?.length ?? 0) > 0 && <Text style={{ color: t.muted, fontFamily: font.body, fontSize: 12, marginTop: 1 }}>+{ev.fields.length} trường</Text>}</View>
                  {event?.id === ev.id && <Icon name="checkmark-circle" size={20} color={t.accent} />}
                </Card>
              ))}
            </View>
      )}

      {step === 'who' && <Field label="Người thực hiện" value={performer} onChangeText={setPerformer} placeholder="Tên người thực hiện" autoCapitalize="words" />}
      {step === 'location' && <><Field label="Địa điểm thực hiện" value={location} onChangeText={setLocation} placeholder="VD: Nhà máy Bình Dương" autoCapitalize="sentences" /><AppText muted>Có thể để trống. (Chọn vị trí trên bản đồ sẽ bổ sung sau.)</AppText></>}
      {step === 'activity' && <Field label="Hành động đã thực hiện" value={action} onChangeText={setAction} placeholder="VD: Đóng gói lô, kiểm định đạt chuẩn…" multiline autoCapitalize="sentences" />}

      {step === 'fields' && (
        <View>
          {(event.fields ?? []).map((f: any) => (
            <Field key={f.id} label={`${f.label}${f.required ? ' *' : ''}`} value={values[f.key] != null ? String(values[f.key]) : ''} keyboardType={f.type === 'number' ? 'numeric' : undefined} onChangeText={(v) => setValues((s) => ({ ...s, [f.key]: f.type === 'number' ? Number(v) : v }))} />
          ))}
        </View>
      )}

      {step === 'media' && (
        <View>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            <Button title="Chụp ảnh" onPress={() => pickImage(true)} style={{ flex: 1 }} />
            <Button title="Chọn từ thư viện" variant="default" onPress={() => pickImage(false)} style={{ flex: 1 }} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {media.map((m, i) => (
              <View key={i} style={{ position: 'relative' }}>
                <Image source={{ uri: m.uri }} style={{ width: 84, height: 84, borderRadius: 12 }} />
                <Pressable onPress={() => setMedia(media.filter((_, j) => j !== i))} style={{ position: 'absolute', top: -6, right: -6, backgroundColor: t.danger, borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}><Icon name="close" size={13} color="#fff" /></Pressable>
              </View>
            ))}
          </View>
          <AppText muted style={{ marginTop: 12 }}>Bước này không bắt buộc. Ảnh chụp khi offline vẫn được lưu và đồng bộ sau.</AppText>
        </View>
      )}

      {step === 'review' && (() => {
        const rows: [string, any][] = [['Sản phẩm', product?.name], ['GTIN', product?.gtin], ['Lô', lot || '—'], ['Công đoạn', event?.name], ['Người thực hiện', performer], ['Địa điểm', location || '—'], ['Hành động', action || '—'], ['Ảnh', `${media.length} tệp`]];
        return (
          <RowsCard>
            {rows.map(([k, v], i) => <Row key={k} label={k} value={String(v ?? '—')} last={i === rows.length - 1} />)}
          </RowsCard>
        );
      })()}
    </WizardShell>
  );
}
