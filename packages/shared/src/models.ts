// Kiểu domain cho dữ liệu API trả về (dùng chung web + mobile qua `import type`).
// Cố ý "rộng" (nhiều field optional, JSON là Record) để thay any dần mà không vỡ.

export type Json = Record<string, unknown>;

export interface Organization {
  id: string;
  name: string;
  code?: string;
  type?: string | null;
  parentId?: string | null;
  level?: number;
}

export interface UserSummary {
  id: string;
  fullName: string;
  email?: string;
  roles?: string[];
}

export interface EventField {
  id: string;
  key: string;
  label: string;
  type: string;
  required?: boolean;
  publicVisible?: boolean;
  options?: string[];
  order?: number;
}

export interface EventDefinition {
  id: string;
  name: string;
  code?: string;
  order: number;
  required?: boolean;
  fields?: EventField[];
}

export interface FlowVersion {
  id: string;
  version?: number;
  eventDefinitions?: EventDefinition[];
}

export interface Flow {
  id: string;
  name: string;
  code?: string;
  versions?: FlowVersion[];
  _count?: { products?: number };
}

export interface ProductFlowLink {
  flow: Flow;
  flowId?: string;
}

export interface Product {
  id: string;
  name: string;
  gtin?: string;
  brand?: string | null;
  source?: string;
  organizationId?: string | null;
  flows?: ProductFlowLink[];
  elabelStatus?: string;
  labelImages?: Array<{ url?: string }>;
  batchCount?: number;
  dynamicAttributes?: Json;
}

export interface TraceableItem {
  id: string;
  batchOrLot?: string | null;
}

export interface EventRecord {
  id: string;
  status: string;
  eventDefinitionId: string;
  eventDefinition?: EventDefinition;
  traceableItem?: TraceableItem;
  location?: string | null;
  performedBy?: UserSummary | null;
  performedByName?: string | null;
  performedAt?: string;
  gpsLat?: number | null;
  gpsLng?: number | null;
}

export interface TraceTask {
  id: string;
  name?: string | null;
  status: string; // PENDING | IN_PROGRESS | DONE
  product?: Product | null;
  lot?: string | null;
  flow?: Flow | null;
  assignedUser?: UserSummary | null;
  organization?: Organization | null;
  startDate: string;
  endDate: string;
  note?: string | null;
}
