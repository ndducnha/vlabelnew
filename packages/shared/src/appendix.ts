/**
 * Phụ lục I - Nghị định 37/2026/NĐ-CP: nội dung bắt buộc bổ sung trên nhãn theo từng nhóm hàng hóa.
 * Chọn nhóm hàng hóa sẽ hiện đúng bộ trường tương ứng để nhập. Đây là bộ mẫu thực dụng,
 * có thể mở rộng/khớp nguyên văn Phụ lục I khi cần.
 */
export type AppendixFieldType = 'text' | 'textarea' | 'date' | 'number';
export interface AppendixField {
  key: string;
  label: string;
  type: AppendixFieldType;
  required?: boolean;
}
export interface AppendixGroup {
  code: string;
  name: string;
  fields: AppendixField[];
}

export const APPENDIX_GROUPS: AppendixGroup[] = [
  {
    code: 'THUC_PHAM', name: 'Thực phẩm',
    fields: [
      { key: 'net', label: 'Định lượng', type: 'text', required: true },
      { key: 'ingredients', label: 'Thành phần / thành phần định lượng', type: 'textarea', required: true },
      { key: 'mfg', label: 'Ngày sản xuất', type: 'date', required: true },
      { key: 'exp', label: 'Hạn sử dụng', type: 'date', required: true },
      { key: 'usage', label: 'Hướng dẫn sử dụng', type: 'textarea' },
      { key: 'storage', label: 'Hướng dẫn bảo quản', type: 'textarea' },
      { key: 'warning', label: 'Thông tin cảnh báo', type: 'textarea' },
    ],
  },
  {
    code: 'TPBVSK', name: 'Thực phẩm bảo vệ sức khỏe',
    fields: [
      { key: 'net', label: 'Định lượng', type: 'text', required: true },
      { key: 'ingredients', label: 'Thành phần định lượng', type: 'textarea', required: true },
      { key: 'uses', label: 'Công dụng', type: 'textarea', required: true },
      { key: 'target', label: 'Đối tượng sử dụng', type: 'text', required: true },
      { key: 'dose', label: 'Liều dùng, cách dùng', type: 'textarea', required: true },
      { key: 'mfg', label: 'Ngày sản xuất', type: 'date', required: true },
      { key: 'exp', label: 'Hạn sử dụng', type: 'date', required: true },
      { key: 'warning', label: 'Khuyến cáo (VD: "Thực phẩm này không phải là thuốc...")', type: 'textarea', required: true },
    ],
  },
  {
    code: 'MY_PHAM', name: 'Mỹ phẩm',
    fields: [
      { key: 'net', label: 'Định lượng', type: 'text', required: true },
      { key: 'ingredients', label: 'Thành phần đầy đủ', type: 'textarea', required: true },
      { key: 'uses', label: 'Công dụng', type: 'textarea', required: true },
      { key: 'usage', label: 'Hướng dẫn sử dụng', type: 'textarea' },
      { key: 'lot', label: 'Số lô sản xuất', type: 'text', required: true },
      { key: 'mfg_exp', label: 'Ngày sản xuất hoặc hạn sử dụng', type: 'text', required: true },
      { key: 'warning', label: 'Thông tin cảnh báo', type: 'textarea' },
    ],
  },
  {
    code: 'THUOC', name: 'Thuốc / nguyên liệu làm thuốc',
    fields: [
      { key: 'active', label: 'Hoạt chất, hàm lượng / nồng độ', type: 'text', required: true },
      { key: 'form', label: 'Dạng bào chế', type: 'text', required: true },
      { key: 'indication', label: 'Chỉ định', type: 'textarea', required: true },
      { key: 'dose', label: 'Cách dùng, liều dùng', type: 'textarea', required: true },
      { key: 'contraindication', label: 'Chống chỉ định', type: 'textarea' },
      { key: 'reg_no', label: 'Số đăng ký (SĐK)', type: 'text', required: true },
      { key: 'lot', label: 'Số lô sản xuất', type: 'text', required: true },
      { key: 'mfg', label: 'Ngày sản xuất', type: 'date', required: true },
      { key: 'exp', label: 'Hạn dùng', type: 'date', required: true },
      { key: 'storage', label: 'Điều kiện bảo quản', type: 'text' },
      { key: 'standard', label: 'Tiêu chuẩn chất lượng', type: 'text' },
    ],
  },
  {
    code: 'TTBYT', name: 'Trang thiết bị y tế',
    fields: [
      { key: 'reg_no', label: 'Số lưu hành / giấy phép nhập khẩu', type: 'text', required: true },
      { key: 'serial', label: 'Số lô / số seri', type: 'text', required: true },
      { key: 'mfg', label: 'Ngày sản xuất', type: 'date' },
      { key: 'exp', label: 'Hạn sử dụng', type: 'date' },
      { key: 'usage', label: 'Hướng dẫn sử dụng', type: 'textarea', required: true },
      { key: 'warning', label: 'Cảnh báo', type: 'textarea' },
    ],
  },
  {
    code: 'PHAN_BON', name: 'Phân bón',
    fields: [
      { key: 'type', label: 'Loại phân bón', type: 'text', required: true },
      { key: 'net', label: 'Khối lượng tịnh', type: 'text', required: true },
      { key: 'nutrient', label: 'Chỉ tiêu chất lượng chính (hàm lượng dinh dưỡng)', type: 'textarea', required: true },
      { key: 'reg_no', label: 'Số quyết định công nhận lưu hành', type: 'text', required: true },
      { key: 'usage', label: 'Hướng dẫn sử dụng', type: 'textarea', required: true },
      { key: 'warning', label: 'Cảnh báo', type: 'textarea' },
    ],
  },
  {
    code: 'TACN', name: 'Thức ăn chăn nuôi',
    fields: [
      { key: 'net', label: 'Khối lượng tịnh', type: 'text', required: true },
      { key: 'ingredients', label: 'Thành phần định lượng', type: 'textarea', required: true },
      { key: 'quality', label: 'Chỉ tiêu chất lượng', type: 'textarea', required: true },
      { key: 'usage', label: 'Hướng dẫn sử dụng, bảo quản', type: 'textarea', required: true },
      { key: 'mfg', label: 'Ngày sản xuất', type: 'date', required: true },
      { key: 'exp', label: 'Hạn sử dụng', type: 'date', required: true },
    ],
  },
  {
    code: 'BVTV', name: 'Thuốc bảo vệ thực vật',
    fields: [
      { key: 'active', label: 'Hoạt chất, hàm lượng', type: 'text', required: true },
      { key: 'reg_no', label: 'Số đăng ký', type: 'text', required: true },
      { key: 'usage', label: 'Hướng dẫn sử dụng', type: 'textarea', required: true },
      { key: 'toxicity', label: 'Độc tính, cảnh báo nguy hiểm', type: 'textarea', required: true },
      { key: 'firstaid', label: 'Hướng dẫn sơ cứu', type: 'textarea', required: true },
      { key: 'storage', label: 'Bảo quản', type: 'text' },
    ],
  },
  {
    code: 'DIEN_TU', name: 'Thiết bị điện, điện tử',
    fields: [
      { key: 'specs', label: 'Thông số kỹ thuật (điện áp, công suất...)', type: 'textarea', required: true },
      { key: 'usage', label: 'Hướng dẫn sử dụng', type: 'textarea', required: true },
      { key: 'warning', label: 'Cảnh báo an toàn', type: 'textarea', required: true },
      { key: 'standard', label: 'Tiêu chuẩn / quy chuẩn áp dụng', type: 'text' },
    ],
  },
  {
    code: 'PCCC', name: 'Thiết bị phòng cháy chữa cháy',
    fields: [
      { key: 'specs', label: 'Thông số kỹ thuật (loại, dung tích, khối lượng chất chữa cháy)', type: 'textarea', required: true },
      { key: 'standard', label: 'Tiêu chuẩn áp dụng', type: 'text', required: true },
      { key: 'usage', label: 'Hướng dẫn sử dụng', type: 'textarea', required: true },
      { key: 'inspection', label: 'Chu kỳ / hạn kiểm định', type: 'text', required: true },
      { key: 'warning', label: 'Cảnh báo an toàn', type: 'textarea' },
    ],
  },
  {
    code: 'DO_CHOI', name: 'Đồ chơi trẻ em',
    fields: [
      { key: 'age', label: 'Độ tuổi phù hợp', type: 'text', required: true },
      { key: 'warning', label: 'Cảnh báo an toàn', type: 'textarea', required: true },
      { key: 'usage', label: 'Hướng dẫn sử dụng', type: 'textarea' },
      { key: 'material', label: 'Chất liệu', type: 'text' },
    ],
  },
  {
    code: 'HOA_CHAT', name: 'Hóa chất gia dụng',
    fields: [
      { key: 'ingredients', label: 'Thành phần', type: 'textarea', required: true },
      { key: 'hazard', label: 'Cảnh báo nguy hiểm', type: 'textarea', required: true },
      { key: 'usage', label: 'Hướng dẫn sử dụng', type: 'textarea', required: true },
      { key: 'firstaid', label: 'Hướng dẫn sơ cứu', type: 'textarea', required: true },
      { key: 'storage', label: 'Bảo quản', type: 'text' },
    ],
  },
  {
    code: 'RUOU', name: 'Rượu',
    fields: [
      { key: 'net', label: 'Định lượng', type: 'text', required: true },
      { key: 'ethanol', label: 'Hàm lượng ethanol (% vol)', type: 'number', required: true },
      { key: 'warning', label: 'Cảnh báo (không dùng cho người dưới 18 tuổi...)', type: 'textarea', required: true },
      { key: 'mfg', label: 'Ngày sản xuất', type: 'date' },
      { key: 'exp', label: 'Hạn sử dụng', type: 'date' },
    ],
  },
];

export function appendixGroupByCode(code?: string | null): AppendixGroup | undefined {
  return code ? APPENDIX_GROUPS.find((g) => g.code === code) : undefined;
}
