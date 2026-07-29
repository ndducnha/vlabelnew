/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { ROLES, ROLE_LABELS, PERMISSIONS, ROLE_PERMISSIONS, gs1CheckDigit } from '@vlabel/shared';

const prisma = new PrismaClient();
const PW = bcrypt.hashSync('Vlabel@123', 10);
const gtin = (body: string) => body + gs1CheckDigit(body);
const day = 86400000;

type FieldTuple = [string, string, string, boolean, boolean];
type EventDef = { code: string; name: string; order: number; fields: FieldTuple[] };
type Step = { code: string; where: string; action: string; values: Record<string, unknown>; media?: boolean };

async function main() {
  console.log('🌱 Seeding Vlabel demo đầy đủ (Dược phẩm · Mỹ phẩm · PCCC)…');

  for (const key of Object.values(PERMISSIONS)) await prisma.permission.upsert({ where: { key }, update: {}, create: { key, label: key } });
  const permByKey = new Map((await prisma.permission.findMany()).map((p) => [p.key, p.id]));

  const tenant = await prisma.tenant.create({ data: { name: 'Tập đoàn Vlabel', code: 'VLABEL' } });

  const roleByKey = new Map<string, string>();
  for (const key of Object.values(ROLES)) {
    const role = await prisma.role.create({ data: { tenantId: tenant.id, key, name: ROLE_LABELS[key] ?? key } });
    roleByKey.set(key, role.id);
    for (const perm of ROLE_PERMISSIONS[key as keyof typeof ROLE_PERMISSIONS]) {
      const pid = permByKey.get(perm);
      if (pid) await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: pid } });
    }
  }

  // ── Org tree ──
  const org = (name: string, code: string, type: string, parentId: string | null, level: number, sortOrder = 0) =>
    prisma.organization.create({ data: { tenantId: tenant.id, name, code, type, parentId, level, sortOrder } });

  const group = await org('Tập đoàn Vlabel', 'VLABEL', 'GROUP', null, 0);

  const pharma = await org('Cty Dược phẩm Vlabel Pharma', 'PHARMA', 'COMPANY', group.id, 1, 0);
  const pharmaFactory = await org('Nhà máy Dược Bình Dương', 'PHARMA-NM', 'FACTORY', pharma.id, 2);
  const pharmaMix = await org('Bộ phận Pha chế', 'PHARMA-PC', 'DEPARTMENT', pharmaFactory.id, 3, 0);
  const pharmaPack = await org('Bộ phận Đóng gói', 'PHARMA-DG', 'DEPARTMENT', pharmaFactory.id, 3, 1);
  await org('Bộ phận QA', 'PHARMA-QA', 'DEPARTMENT', pharmaFactory.id, 3, 2);

  const beauty = await org('Cty Mỹ phẩm Vlabel Beauty', 'BEAUTY', 'COMPANY', group.id, 1, 1);
  const beautyFactory = await org('Nhà máy Mỹ phẩm TP.HCM', 'BEAUTY-NM', 'FACTORY', beauty.id, 2);
  const beautyProd = await org('Bộ phận Sản xuất', 'BEAUTY-SX', 'DEPARTMENT', beautyFactory.id, 3, 0);
  await org('Bộ phận Kiểm nghiệm', 'BEAUTY-KN', 'DEPARTMENT', beautyFactory.id, 3, 1);

  const pccc = await org('Cty Thiết bị PCCC Vlabel Safety', 'PCCC', 'COMPANY', group.id, 1, 2);
  const pcccFactory = await org('Nhà máy Thiết bị PCCC', 'PCCC-NM', 'FACTORY', pccc.id, 2);
  const pcccAssembly = await org('Bộ phận Lắp ráp', 'PCCC-LR', 'DEPARTMENT', pcccFactory.id, 3, 0);
  await org('Bộ phận Kiểm định', 'PCCC-KD', 'DEPARTMENT', pcccFactory.id, 3, 1);

  // ── Users ──
  const mkUser = async (orgId: string | null, email: string, fullName: string, roleKeys: string[], scopeOrgIds: string[]) => {
    const u = await prisma.user.create({ data: { tenantId: tenant.id, organizationId: orgId, email, fullName, passwordHash: PW } });
    for (const rk of roleKeys) await prisma.userRole.create({ data: { userId: u.id, roleId: roleByKey.get(rk)! } });
    for (const oid of scopeOrgIds) await prisma.userScope.create({ data: { userId: u.id, organizationId: oid } });
    return u;
  };
  await mkUser(null, 'platform@vlabel.vn', 'Vlabel Platform', [ROLES.PLATFORM_ADMIN], []);
  await mkUser(group.id, 'superadmin@vlabel.vn', 'Superadmin Vlabel', [ROLES.SUPERADMIN], [group.id]);
  await mkUser(pharma.id, 'admin@vlabel.vn', 'Admin Vlabel', [ROLES.ADMIN], [group.id]);
  const manager = await mkUser(pharma.id, 'manager@vlabel.vn', 'Quản lý Vlabel', [ROLES.MANAGER], [group.id]);
  const user = await mkUser(pharmaPack.id, 'user@vlabel.vn', 'Người kê khai Vlabel', [ROLES.DATA_ENTRY], [group.id]);

  await mkUser(pharma.id, 'mgr.pharma@vlabel.vn', 'Trưởng phòng Dược', [ROLES.MANAGER], [pharma.id]);
  await mkUser(beauty.id, 'mgr.beauty@vlabel.vn', 'Trưởng phòng Mỹ phẩm', [ROLES.MANAGER], [beauty.id]);
  await mkUser(pccc.id, 'mgr.pccc@vlabel.vn', 'Trưởng phòng PCCC', [ROLES.MANAGER], [pccc.id]);

  const uPharma1 = await mkUser(pharmaMix.id, 'kekhai.pharma@vlabel.vn', 'Trần Dược', [ROLES.DATA_ENTRY], [pharma.id]);
  const uPharma2 = await mkUser(pharmaPack.id, 'kekhai.pharma2@vlabel.vn', 'Nguyễn Đóng Gói', [ROLES.DATA_ENTRY], [pharma.id]);
  const uBeauty1 = await mkUser(beautyProd.id, 'kekhai.beauty@vlabel.vn', 'Lê Mỹ', [ROLES.DATA_ENTRY], [beauty.id]);
  const uBeauty2 = await mkUser(beautyProd.id, 'kekhai.beauty2@vlabel.vn', 'Vũ Phối Trộn', [ROLES.DATA_ENTRY], [beauty.id]);
  const uPccc1 = await mkUser(pcccAssembly.id, 'kekhai.pccc@vlabel.vn', 'Phạm An Toàn', [ROLES.DATA_ENTRY], [pccc.id]);
  const uPccc2 = await mkUser(pcccAssembly.id, 'kekhai.pccc2@vlabel.vn', 'Hoàng Kiểm Định', [ROLES.DATA_ENTRY], [pccc.id]);

  // ── Categories (danh mục sản phẩm + trường) ──
  const mkCategory = (name: string, code: string, fields: [string, string, string, boolean][]) =>
    prisma.productCategory.create({ data: { tenantId: tenant.id, name, code, fields: { create: fields.map((f, i) => ({ key: f[0], label: f[1], type: f[2], required: f[3], order: i })) } } });
  const catPharma = await mkCategory('Dược phẩm', 'DUOC', [['dosage', 'Hàm lượng', 'text', true], ['form', 'Dạng bào chế', 'text', false]]);
  const catBeauty = await mkCategory('Mỹ phẩm', 'MYPHAM', [['volume', 'Dung tích', 'text', false], ['skin', 'Loại da phù hợp', 'text', false]]);
  const catPccc = await mkCategory('Thiết bị PCCC', 'PCCC-CAT', [['standard', 'Tiêu chuẩn áp dụng', 'text', false]]);

  // ── Flows ──
  const makeFlow = async (companyId: string, name: string, code: string, events: EventDef[]) => {
    const flow = await prisma.flow.create({
      data: { tenantId: tenant.id, name, code, publicConfig: { showMap: true }, orgLinks: { create: { organizationId: companyId } }, versions: { create: { version: 1, isPublished: true } } },
      include: { versions: true },
    });
    const versionId = flow.versions[0].id;
    const defByCode = new Map<string, string>();
    for (const ev of events) {
      const def = await prisma.eventDefinition.create({
        data: { flowVersionId: versionId, code: ev.code, name: ev.name, order: ev.order, enterRoleKeys: [ROLES.DATA_ENTRY, ROLES.MANAGER], approveRoleKeys: [ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPERADMIN], suggestionConfig: { copyPrevious: true, autoTime: true } },
      });
      defByCode.set(ev.code, def.id);
      let o = 0;
      for (const [key, label, type, required, pub] of ev.fields) await prisma.eventField.create({ data: { eventDefinitionId: def.id, key, label, type, required, publicVisible: pub, order: o++ } });
    }
    return { flowId: flow.id, versionId, defByCode };
  };

  const pharmaFlow = await makeFlow(pharma.id, 'Chuỗi sản xuất Dược phẩm', 'DUOC-PHAM', [
    { code: 'NHAP_NL', name: 'Nhập nguyên liệu', order: 1, fields: [['supplier', 'Nhà cung cấp', 'text', true, true], ['lot_nl', 'Lô nguyên liệu', 'text', false, false], ['coa', 'Số COA', 'text', false, true]] },
    { code: 'PHA_CHE', name: 'Pha chế', order: 2, fields: [['batch', 'Cỡ mẻ (viên)', 'number', true, false], ['temp', 'Nhiệt độ (°C)', 'number', false, false]] },
    { code: 'KIEM_NGHIEM', name: 'Kiểm nghiệm', order: 3, fields: [['result', 'Kết quả', 'text', true, true], ['purity', 'Độ tinh khiết (%)', 'number', false, true]] },
    { code: 'DONG_GOI', name: 'Đóng gói', order: 4, fields: [['pack_date', 'Ngày đóng gói', 'date', true, true], ['expiry', 'Hạn dùng', 'date', true, true], ['qty', 'Số lượng', 'number', false, false]] },
    { code: 'XUAT_KHO', name: 'Xuất kho', order: 5, fields: [['dest', 'Nơi đến', 'text', false, false]] },
  ]);
  const beautyFlow = await makeFlow(beauty.id, 'Chuỗi sản xuất Mỹ phẩm', 'MY-PHAM', [
    { code: 'NHAP_NL', name: 'Nhập nguyên liệu', order: 1, fields: [['supplier', 'Nhà cung cấp', 'text', true, true], ['origin', 'Xuất xứ', 'text', false, true]] },
    { code: 'PHOI_TRON', name: 'Phối trộn', order: 2, fields: [['formula', 'Công thức', 'text', false, false], ['ph', 'Độ pH', 'number', false, true]] },
    { code: 'KIEM_DINH', name: 'Kiểm định chất lượng', order: 3, fields: [['result', 'Kết quả', 'text', true, true], ['allergen', 'Kiểm dị ứng', 'text', false, true]] },
    { code: 'DONG_GOI', name: 'Đóng gói', order: 4, fields: [['pack_date', 'Ngày đóng gói', 'date', true, true], ['expiry', 'Hạn dùng', 'date', true, true]] },
    { code: 'PHAN_PHOI', name: 'Phân phối', order: 5, fields: [['channel', 'Kênh phân phối', 'text', false, false]] },
  ]);
  const pcccFlow = await makeFlow(pccc.id, 'Chuỗi sản xuất Thiết bị PCCC', 'PCCC-SX', [
    { code: 'NHAP_VT', name: 'Nhập vật tư', order: 1, fields: [['supplier', 'Nhà cung cấp', 'text', true, true], ['material', 'Vật liệu', 'text', false, true]] },
    { code: 'GIA_CONG', name: 'Gia công', order: 2, fields: [['process', 'Công đoạn', 'text', false, false]] },
    { code: 'LAP_RAP', name: 'Lắp ráp', order: 3, fields: [['line', 'Dây chuyền', 'text', false, false], ['serial', 'Số serial', 'text', false, true]] },
    { code: 'KIEM_DINH_AT', name: 'Kiểm định an toàn', order: 4, fields: [['standard', 'Tiêu chuẩn', 'text', true, true], ['pressure', 'Áp suất thử (bar)', 'number', false, true], ['result', 'Kết quả', 'text', false, true]] },
    { code: 'XUAT_XUONG', name: 'Xuất xưởng', order: 5, fields: [['cert', 'Số chứng nhận', 'text', false, true], ['warranty', 'Bảo hành (tháng)', 'number', false, true]] },
  ]);

  // ── Flow permissions: cấp quyền kê khai cho người theo nhánh ──
  const grant = (u: any, flow: any) => prisma.flowPermission.create({ data: { tenantId: tenant.id, userId: u.id, flowId: flow.flowId } });
  for (const u of [uPharma1, uPharma2, user]) await grant(u, pharmaFlow);
  for (const u of [uBeauty1, uBeauty2]) await grant(u, beautyFlow);
  for (const u of [uPccc1, uPccc2]) await grant(u, pcccFlow);

  // ── Step builders ──
  const pharmaSteps = (lot: string): Step[] => [
    { code: 'NHAP_NL', where: 'Kho NVL Bình Dương', action: 'Nhập nguyên liệu API', values: { supplier: 'Cty Hóa dược Á Châu', lot_nl: `API-${lot}`, coa: `COA-${lot}` } },
    { code: 'PHA_CHE', where: 'NM Dược Bình Dương', action: 'Pha chế, dập viên', values: { batch: 200000, temp: 24 } },
    { code: 'KIEM_NGHIEM', where: 'Phòng QA', action: 'Kiểm nghiệm đạt chuẩn USP', values: { result: 'Đạt', purity: 99.5 } },
    { code: 'DONG_GOI', where: 'Bộ phận Đóng gói', action: 'Ép vỉ, đóng hộp', values: { pack_date: '2026-07-05', expiry: '2029-07-05', qty: 20000 }, media: true },
    { code: 'XUAT_KHO', where: 'Kho thành phẩm', action: 'Xuất cho nhà phân phối', values: { dest: 'NPP Dược Miền Nam' } },
  ];
  const beautySteps = (lot: string): Step[] => [
    { code: 'NHAP_NL', where: 'Kho NVL TP.HCM', action: 'Nhập hoạt chất', values: { supplier: 'Croda', origin: 'Pháp' } },
    { code: 'PHOI_TRON', where: 'Bộ phận Sản xuất', action: 'Phối trộn nhũ tương', values: { formula: `CT-${lot}`, ph: 5.5 } },
    { code: 'KIEM_DINH', where: 'Bộ phận Kiểm nghiệm', action: 'Kiểm định đạt', values: { result: 'Đạt', allergen: 'Không phát hiện' }, media: true },
    { code: 'DONG_GOI', where: 'Xưởng đóng gói', action: 'Chiết rót, dán nhãn', values: { pack_date: '2026-06-26', expiry: '2029-06-26' } },
    { code: 'PHAN_PHOI', where: 'Kho phân phối', action: 'Giao chuỗi bán lẻ', values: { channel: 'Chuỗi Guardian' } },
  ];
  const pcccSteps = (lot: string): Step[] => [
    { code: 'NHAP_VT', where: 'Kho vật tư', action: 'Nhập vật tư', values: { supplier: 'Thép Hòa Phát', material: 'Thép chịu áp' } },
    { code: 'GIA_CONG', where: 'Xưởng gia công', action: 'Gia công, sơn tĩnh điện', values: { process: 'Hàn, sơn' } },
    { code: 'LAP_RAP', where: 'Bộ phận Lắp ráp', action: 'Lắp ráp, nạp chất chữa cháy', values: { line: 'DC-01', serial: `SER-${lot}` }, media: true },
    { code: 'KIEM_DINH_AT', where: 'Bộ phận Kiểm định', action: 'Thử áp lực, kiểm định', values: { standard: 'TCVN 7026:2013', pressure: 250, result: 'Đạt' } },
    { code: 'XUAT_XUONG', where: 'Kho thành phẩm', action: 'Cấp chứng nhận, xuất xưởng', values: { cert: `CN-${lot}`, warranty: 12 } },
  ];

  // ── Helpers tạo trace ──
  const rec = async (product: any, flow: any, item: any, s: Step, who: string, whoId: string, whenISO: string) => {
    const r = await prisma.eventRecord.create({
      data: {
        tenantId: tenant.id, organizationId: product.organizationId, traceableItemId: item.id, flowVersionId: flow.versionId,
        eventDefinitionId: flow.defByCode.get(s.code)!, gtin: product.gtin,
        performedByUserId: whoId, performedByName: who, enteredByUserId: whoId, approvedByUserId: whoId,
        location: s.where, performedAt: new Date(whenISO), action: s.action, status: 'APPROVED',
        values: { create: Object.entries(s.values).map(([fieldKey, v]) => ({ fieldKey, valueJson: v as any })) },
      },
    });
    await prisma.approvalHistory.create({ data: { eventRecordId: r.id, actorUserId: whoId, action: 'SUBMIT', toStatus: 'APPROVED' } });
    if (s.media) await prisma.eventRecordMedia.create({ data: { eventRecordId: r.id, kind: 'image', url: `https://picsum.photos/seed/${product.gtin}${item.batchOrLot}/400/300`, publicVisible: true } });
    return r;
  };
  const makeTrace = async (product: any, flow: any, lot: string, baseISO: string, who: any, steps: Step[], count: number) => {
    const item = await prisma.traceableItem.create({ data: { tenantId: tenant.id, organizationId: product.organizationId, productId: product.id, gtin: product.gtin, batchOrLot: lot } });
    const base = new Date(baseISO).getTime();
    for (let i = 0; i < Math.min(count, steps.length); i++) await rec(product, flow, item, steps[i], who.fullName, who.id, new Date(base + i * day).toISOString());
  };

  // ── Dữ liệu sản phẩm / nhãn / lô / trace theo nhánh ──
  const registry: Record<string, any> = {};
  const branches = [
    {
      company: pharma, category: catPharma, flow: pharmaFlow, steps: pharmaSteps, performers: [uPharma1, uPharma2, user],
      owner: { name: 'Cty Dược phẩm Vlabel Pharma', tax_code: '0312345678', address: 'KCN VSIP, Bình Dương', representative: 'Nguyễn Văn An' },
      products: [
        { body: '893110000001', name: 'Paracetamol 500mg (vỉ 10 viên)', brand: 'Vlabel Pharma', hs: '3004.90', risk: 2, mode: 'PER_LOT', status: 'published', dyn: { dosage: '500mg', form: 'Viên nén' },
          attrs: [['Thành phần', 'Paracetamol 500mg'], ['Chỉ định', 'Giảm đau, hạ sốt'], ['Cách dùng', '1-2 viên/lần, tối đa 8 viên/ngày'], ['Bảo quản', 'Dưới 30°C, tránh ẩm']],
          batches: [{ code: 'LOT-PARA-2407', mfg: '2026-07-05', qty: 20000, trace: 5 }, { code: 'LOT-PARA-2408', mfg: '2026-08-02', qty: 18000, trace: 3 }] },
        { body: '893110000002', name: 'Amoxicillin 500mg', brand: 'Vlabel Pharma', hs: '3004.10', risk: 2, mode: 'PER_LOT', status: 'published', dyn: { dosage: '500mg' },
          attrs: [['Thành phần', 'Amoxicillin trihydrate'], ['Nhóm', 'Kháng sinh beta-lactam'], ['Chỉ định', 'Nhiễm khuẩn hô hấp']],
          batches: [{ code: 'LOT-AMOX-2407', mfg: '2026-07-12', qty: 12000, trace: 4 }] },
        { body: '893110000003', name: 'Vitamin C 1000mg sủi', brand: 'Vlabel Pharma', hs: '2106.90', risk: 3, mode: 'SHARED', status: 'draft', dyn: { dosage: '1000mg' },
          attrs: [['Công dụng', 'Bổ sung vitamin C']], batches: [] },
        { body: '893110000004', name: 'Ibuprofen 400mg', brand: 'Vlabel Pharma', hs: '3004.90', risk: 2, mode: 'PER_LOT', status: 'published', dyn: { dosage: '400mg' },
          attrs: [['Thành phần', 'Ibuprofen 400mg'], ['Chỉ định', 'Kháng viêm, giảm đau']],
          batches: [{ code: 'LOT-IBU-2407', mfg: '2026-07-15', qty: 9000, trace: 3 }] },
        { body: '893110000005', name: 'Siro ho trẻ em 100ml', brand: 'Vlabel Pharma', hs: '3004.90', risk: 2, mode: 'SHARED', status: 'recalled', recallReason: 'Lỗi nhãn hạn dùng, thu hồi để khắc phục', dyn: { form: 'Siro' },
          attrs: [['Thành phần', 'Chiết xuất thảo dược'], ['Đối tượng', 'Trẻ từ 2 tuổi']],
          batches: [{ code: 'LOT-SIRO-2406', mfg: '2026-06-10', qty: 6000, trace: 5 }] },
      ],
    },
    {
      company: beauty, category: catBeauty, flow: beautyFlow, steps: beautySteps, performers: [uBeauty1, uBeauty2],
      owner: { name: 'Cty Mỹ phẩm Vlabel Beauty', tax_code: '0398765432', address: 'KCN Tân Bình, TP.HCM', representative: 'Lê Thị Bình' },
      products: [
        { body: '893120000001', name: 'Kem dưỡng ẩm ban đêm 50ml', brand: 'Vlabel Beauty', hs: '3304.99', risk: 3, mode: 'PER_LOT', status: 'published', dyn: { volume: '50ml', skin: 'Da khô' },
          attrs: [['Thành phần chính', 'Hyaluronic Acid, Ceramide'], ['Công dụng', 'Dưỡng ẩm chuyên sâu ban đêm'], ['Hướng dẫn', 'Thoa buổi tối sau toner']],
          batches: [{ code: 'LOT-KEM-2407', mfg: '2026-06-26', qty: 5000, trace: 5 }, { code: 'LOT-KEM-2408', mfg: '2026-08-05', qty: 4200, trace: 3 }] },
        { body: '893120000002', name: 'Sữa rửa mặt dịu nhẹ 100ml', brand: 'Vlabel Beauty', hs: '3401.30', risk: 3, mode: 'SHARED', status: 'published', dyn: { volume: '100ml' },
          attrs: [['Công dụng', 'Làm sạch dịu nhẹ'], ['pH', '5.5']],
          batches: [{ code: 'LOT-SRM-2407', mfg: '2026-07-08', qty: 8000, trace: 3 }] },
        { body: '893120000003', name: 'Son dưỡng có màu', brand: 'Vlabel Beauty', hs: '3304.10', risk: 3, mode: 'PER_LOT', status: 'published', dyn: {},
          attrs: [['Thành phần', 'Sáp ong, màu tự nhiên'], ['Công dụng', 'Dưỡng và tạo màu môi']],
          batches: [{ code: 'LOT-SON-2407', mfg: '2026-07-02', qty: 7000, trace: 4 }] },
        { body: '893120000004', name: 'Serum Vitamin C 30ml', brand: 'Vlabel Beauty', hs: '3304.99', risk: 2, mode: 'PER_LOT', status: 'published', dyn: { volume: '30ml' },
          attrs: [['Thành phần chính', 'Vitamin C 15%'], ['Công dụng', 'Làm sáng da'], ['Lưu ý', 'Dùng kem chống nắng ban ngày']],
          batches: [{ code: 'LOT-SER-2407', mfg: '2026-07-18', qty: 3000, trace: 5 }] },
        { body: '893120000005', name: 'Mặt nạ giấy dưỡng ẩm', brand: 'Vlabel Beauty', hs: '3304.99', risk: 3, mode: 'SHARED', status: 'draft', dyn: {},
          attrs: [['Công dụng', 'Cấp ẩm tức thì']], batches: [] },
      ],
    },
    {
      company: pccc, category: catPccc, flow: pcccFlow, steps: pcccSteps, performers: [uPccc1, uPccc2],
      owner: { name: 'Cty Thiết bị PCCC Vlabel Safety', tax_code: '0356789012', address: 'KCN Long An', representative: 'Phạm Văn Cường' },
      products: [
        { body: '893130000001', name: 'Bình chữa cháy CO2 5kg', brand: 'Vlabel Safety', hs: '8424.10', risk: 1, mode: 'PER_LOT', status: 'published', dyn: { standard: 'TCVN 7026:2013' },
          attrs: [['Chất chữa cháy', 'Khí CO2, 5kg'], ['Tiêu chuẩn', 'TCVN 7026:2013'], ['Hướng dẫn', 'Rút chốt, hướng loa vào gốc lửa, bóp cò'], ['Kiểm định', '12 tháng/lần']],
          batches: [{ code: 'LOT-CO2-2407', mfg: '2026-05-16', qty: 1000, trace: 5 }, { code: 'LOT-CO2-2408', mfg: '2026-08-10', qty: 800, trace: 3 }] },
        { body: '893130000002', name: 'Vòi chữa cháy D50 20m', brand: 'Vlabel Safety', hs: '5909.00', risk: 2, mode: 'PER_LOT', status: 'published', dyn: {},
          attrs: [['Đường kính', 'D50'], ['Chiều dài', '20m'], ['Tiêu chuẩn', 'TCVN 5740:2009']],
          batches: [{ code: 'LOT-VOI-2407', mfg: '2026-06-04', qty: 500, trace: 4 }] },
        { body: '893130000003', name: 'Đầu báo khói quang', brand: 'Vlabel Safety', hs: '8531.10', risk: 3, mode: 'SHARED', status: 'published', dyn: {},
          attrs: [['Loại', 'Quang điện'], ['Điện áp', '9-30VDC']],
          batches: [{ code: 'LOT-DBK-2407', mfg: '2026-07-01', qty: 2000, trace: 3 }] },
        { body: '893130000004', name: 'Bình bột chữa cháy ABC 4kg', brand: 'Vlabel Safety', hs: '8424.10', risk: 1, mode: 'PER_LOT', status: 'published', dyn: { standard: 'TCVN 6100' },
          attrs: [['Chất chữa cháy', 'Bột ABC, 4kg'], ['Tiêu chuẩn', 'TCVN 6100:1996'], ['Hướng dẫn', 'Lắc bình, rút chốt, phun gốc lửa']],
          batches: [{ code: 'LOT-ABC-2407', mfg: '2026-07-09', qty: 1200, trace: 5 }] },
        { body: '893130000005', name: 'Mặt nạ phòng độc', brand: 'Vlabel Safety', hs: '9020.00', risk: 2, mode: 'SHARED', status: 'draft', dyn: {},
          attrs: [['Công dụng', 'Lọc khói, khí độc khi thoát hiểm']], batches: [] },
      ],
    },
  ];

  const attrGet = (attrs: any[], ...names: string[]) => { const m = new Map(attrs.map((x) => [x[0], x[1]])); for (const n of names) if (m.get(n)) return m.get(n) as string; return null; };
  const DEFAULT_WARN: Record<string, string> = {
    'Dược phẩm': 'Đọc kỹ hướng dẫn sử dụng trước khi dùng. Để xa tầm tay trẻ em.',
    'Mỹ phẩm': 'Chỉ dùng ngoài da. Ngưng dùng nếu có kích ứng. Tránh tiếp xúc mắt.',
    'Thiết bị PCCC': 'Đọc kỹ hướng dẫn. Kiểm định định kỳ. Bảo quản nơi khô ráo, tránh va đập.',
  };
  const CAT_TO_APPENDIX: Record<string, string> = { 'Dược phẩm': 'THUOC', 'Mỹ phẩm': 'MY_PHAM', 'Thiết bị PCCC': 'BHLD' };
  const appendixValues = (code: string | undefined, p: any): Record<string, string> => {
    const a = p.attrs; const dyn = (p.dyn as any) ?? {};
    const lot = p.batches?.[0]?.code ?? 'LOT-MAU'; const mfg = p.batches?.[0]?.mfg ?? '2026-07-01';
    if (code === 'THUOC') return { form: dyn.form ?? 'Viên nén', active: dyn.dosage ? `${p.name} (${dyn.dosage})` : p.name, maker_addr: 'Cty Dược phẩm Vlabel Pharma, KCN VSIP Bình Dương', reg_no: `VD-${p.body.slice(-5)}-26`, lot, mfg, exp: '2029-07-01', storage_cond: attrGet(a, 'Bảo quản') ?? 'Nơi khô ráo, dưới 30°C', packaging: 'Hộp 10 vỉ x 10 viên' };
    if (code === 'MY_PHAM') return { net: dyn.volume ?? '50ml', ingredients: attrGet(a, 'Thành phần chính', 'Thành phần') ?? 'Theo công bố', lot, mfg, usage: attrGet(a, 'Hướng dẫn') ?? 'Thoa lượng vừa đủ', warning: 'Tránh tiếp xúc mắt' };
    if (code === 'BHLD') return { net: dyn.weight ?? '1', mfg, exp: '2029-05-16', ingredients: attrGet(a, 'Chất chữa cháy') ?? 'Theo công bố', specs: attrGet(a, 'Chất chữa cháy') ?? attrGet(a, 'Loại') ?? 'Theo thông số kỹ thuật', warning: 'Bảo quản nơi khô ráo, tránh va đập', usage_storage: attrGet(a, 'Hướng dẫn', 'Hướng dẫn sử dụng') ?? 'Theo hướng dẫn; kiểm định 12 tháng/lần' };
    return {};
  };

  let productCount = 0;
  for (const b of branches) {
    let pi = 0;
    for (const p of b.products) {
      const product = await prisma.product.create({
        data: { tenantId: tenant.id, organizationId: b.company.id, categoryId: b.category.id, gtin: gtin(p.body), name: p.name, source: 'VNPC', traceMode: p.mode, dynamicAttributes: (p.dyn ?? {}) as any, flows: { create: { flowId: b.flow.flowId } } },
      });
      productCount++;
      registry[p.body] = product;

      const publish = p.status === 'published' || p.status === 'recalled';
      const labelData = {
        brand: p.brand, countryOfOrigin: 'Việt Nam', hsCode: p.hs, targetMarket: 'Việt Nam', supplier: b.owner.name, riskLevel: p.risk,
        netContent: (p.dyn as any)?.volume ?? null,
        ingredients: attrGet(p.attrs, 'Thành phần', 'Thành phần chính', 'Chất chữa cháy') ?? 'Theo hồ sơ công bố sản phẩm',
        usageInstructions: attrGet(p.attrs, 'Cách dùng', 'Hướng dẫn sử dụng', 'Hướng dẫn'),
        storageInstructions: attrGet(p.attrs, 'Bảo quản'),
        safetyWarnings: attrGet(p.attrs, 'Cảnh báo an toàn', 'Cảnh báo') ?? (p.risk === 1 || p.risk === 2 ? DEFAULT_WARN[b.category.name] : null),
        portalConnected: publish && p.risk === 1,
        portalSyncedAt: publish && p.risk === 1 ? new Date() : null,
        appendixGroup: CAT_TO_APPENDIX[b.category.name] ?? null,
        appendixAttributes: appendixValues(CAT_TO_APPENDIX[b.category.name], p) as any,
        labelImages: [{ url: `https://picsum.photos/seed/${p.body}/600/600`, note: p.name, source: 'elabel' }] as any,
        certificates: [] as any,
        labelAttributes: p.attrs.map(([field_name, field_value]) => ({ field_name, field_value })) as any,
        ownerInfo: b.owner as any,
      };
      await prisma.product.update({ where: { id: product.id }, data: { ...labelData, elabelStatus: publish ? 'published' : 'draft', publishedAt: publish ? new Date() : null } });

      for (const bt of p.batches ?? []) {
        await prisma.productBatch.create({
          data: { tenantId: tenant.id, productId: product.id, batchCode: bt.code, manufacturingDate: new Date(bt.mfg), totalQuantity: bt.qty, status: p.status === 'recalled' ? 'recalled' : 'published', traceabilityUrl: `https://qr.txng.gov.vn/01/${product.gtin}/10/${bt.code}?8000=${b.owner.tax_code}` },
        });
        if (bt.trace > 0) { await makeTrace(product, b.flow, bt.code, `${bt.mfg}T02:00:00Z`, b.performers[pi % b.performers.length], b.steps(bt.code), bt.trace); pi++; }
        await prisma.qrCode.create({ data: { tenantId: tenant.id, gtin: product.gtin, lot: bt.code, publicUrl: `/t/${product.gtin}?lot=${bt.code}` } });
      }
      await prisma.qrCode.create({ data: { tenantId: tenant.id, gtin: product.gtin, publicUrl: `/t/${product.gtin}` } });

      if (p.status === 'recalled') {
        await prisma.product.update({ where: { id: product.id }, data: { elabelStatus: 'recalled', recallReason: (p as any).recallReason } });
        await prisma.productBatch.updateMany({ where: { productId: product.id, deletedAt: null }, data: { status: 'recalled', recallReason: (p as any).recallReason } });
      }
    }
  }

  // ── Lịch truy xuất (nhiệm vụ) đủ trạng thái ──
  const task = (name: string, body: string, lot: string, flow: any, orgId: string, assignee: any, start: string, end: string, status: string) =>
    prisma.traceTask.create({ data: { tenantId: tenant.id, name, productId: registry[body].id, lot, flowId: flow.flowId, organizationId: orgId, assignedUserId: assignee.id, startDate: new Date(start), endDate: new Date(end), status, createdByUserId: manager.id } });

  await task('Kê khai lô Paracetamol tháng 8', '893110000001', 'LOT-PARA-2409', pharmaFlow, pharma.id, user, '2026-08-01', '2026-08-15', 'PENDING');
  await task('Kê khai lô Amoxicillin tháng 8', '893110000002', 'LOT-AMOX-2408', pharmaFlow, pharma.id, user, '2026-08-05', '2026-08-20', 'IN_PROGRESS');
  await task('Kê khai lô Ibuprofen (quá hạn)', '893110000004', 'LOT-IBU-2407B', pharmaFlow, pharma.id, uPharma1, '2026-07-10', '2026-07-20', 'PENDING');
  await task('Kê khai lô Kem dưỡng tháng 8', '893120000001', 'LOT-KEM-2409', beautyFlow, beauty.id, uBeauty1, '2026-08-06', '2026-08-22', 'PENDING');
  await task('Kê khai lô Serum Vitamin C', '893120000004', 'LOT-SER-2408', beautyFlow, beauty.id, uBeauty2, '2026-08-02', '2026-08-18', 'IN_PROGRESS');
  await task('Kê khai lô Bình CO2 tháng 8', '893130000001', 'LOT-CO2-2409', pcccFlow, pccc.id, uPccc1, '2026-08-03', '2026-08-18', 'PENDING');
  await task('Kê khai lô Bình bột ABC', '893130000004', 'LOT-ABC-2408', pcccFlow, pccc.id, user, '2026-08-04', '2026-08-19', 'PENDING');
  await task('Kê khai lô Vòi chữa cháy (đã xong)', '893130000002', 'LOT-VOI-2407', pcccFlow, pccc.id, uPccc2, '2026-06-01', '2026-06-10', 'DONE');

  // ── Nhãn phụ (supplementary label) demo ──
  const mkSupp = async (body: string, name: string, scope: string, batchCode: string | null, html: string) => {
    const p = registry[body];
    const s = await prisma.supplementaryLabel.create({ data: { tenantId: tenant.id, productId: p.id, name, scope, batchCode, contentHtml: html, status: 'published', version: 2, createdByUserId: manager.id } });
    await prisma.supplementaryLabelVersion.create({ data: { labelId: s.id, versionNumber: 1, contentHtml: html, createdByUserId: manager.id } });
  };
  await mkSupp('893110000001', 'Nhãn phụ tiếng Việt - Paracetamol', 'ALL', null,
    '<h2>{{product_name}}</h2><p><b>Thành phần:</b> Paracetamol 500mg</p><p><b>Công dụng:</b> Giảm đau, hạ sốt.</p><p><b>Hướng dẫn sử dụng:</b> Người lớn uống 1-2 viên/lần, tối đa 8 viên/ngày.</p><p><b>Bảo quản:</b> Nơi khô ráo, dưới 30°C.</p><p><b>Xuất xứ:</b> {{origin}}</p><p><b>Chịu trách nhiệm:</b> {{manufacturer_name}}</p><p>GTIN {{gtin}} · Lô {{batch_number}}</p><p>{{qr_code}}</p>');
  await mkSupp('893120000001', 'Nhãn phụ - Kem dưỡng lô KEM-2407', 'BATCH', 'LOT-KEM-2407',
    '<h2>{{product_name}}</h2><p><b>Thành phần chính:</b> Hyaluronic Acid, Ceramide.</p><p><b>Hướng dẫn:</b> Thoa lượng vừa đủ lên mặt buổi tối.</p><p><b>Cảnh báo:</b> Chỉ dùng ngoài da, tránh vùng mắt.</p><p>Lô {{batch_number}} · NSX {{manufacturing_date}}</p>');
  await mkSupp('893130000001', 'Nhãn phụ - Bình chữa cháy CO2', 'ALL', null,
    '<h2>{{product_name}}</h2><p><b>Hướng dẫn:</b> Rút chốt an toàn, hướng loa vào gốc lửa, bóp cò.</p><p><b>Cảnh báo:</b> Kiểm định định kỳ 12 tháng/lần. Bảo quản nơi khô ráo.</p><p>GTIN {{gtin}}</p><p>{{qr_code}}</p>');

  for (const a of ['ORG_CREATE', 'PRODUCT_CREATE', 'ELABEL_PUBLISH', 'FLOW_CREATE', 'TRACE_TASK_CREATE', 'SEED'])
    await prisma.auditLog.create({ data: { tenantId: tenant.id, actorUserId: manager.id, action: a, resource: 'tenant', resourceId: tenant.id } });

  const c = {
    orgs: await prisma.organization.count(), users: await prisma.user.count(), categories: await prisma.productCategory.count(),
    flows: await prisma.flow.count(), flowPerms: await prisma.flowPermission.count(), products: await prisma.product.count(),
    published: await prisma.product.count({ where: { elabelStatus: 'published' } }), draft: await prisma.product.count({ where: { elabelStatus: 'draft' } }),
    recalled: await prisma.product.count({ where: { elabelStatus: 'recalled' } }), batches: await prisma.productBatch.count(),
    items: await prisma.traceableItem.count(), records: await prisma.eventRecord.count(), qr: await prisma.qrCode.count(), tasks: await prisma.traceTask.count(),
  };
  console.log('✅ Seed xong:', c);
  console.log('   Tài khoản (mật khẩu Vlabel@123): superadmin@vlabel.vn · admin@vlabel.vn · manager@vlabel.vn · user@vlabel.vn');
  console.log('   Public demo: /t/8931100000015?lot=LOT-PARA-2407 · /t/8931200000014?lot=LOT-KEM-2407 · /t/8931300000013?lot=LOT-CO2-2407');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
