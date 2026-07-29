-- CreateEnum
CREATE TYPE "ProductSource" AS ENUM ('MANUAL', 'VNPC');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'LOCKED');

-- CreateEnum
CREATE TYPE "QrStatus" AS ENUM ('ACTIVE', 'LOCKED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ApprovalAction" AS ENUM ('SUBMIT', 'APPROVE', 'REJECT', 'REQUEST_CHANGES', 'LOCK');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "parentId" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "organizationId" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "user_scopes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "user_scopes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_fields" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB NOT NULL DEFAULT '[]',
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "category_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "categoryId" TEXT,
    "gtin" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "traceMode" TEXT NOT NULL DEFAULT 'SHARED',
    "dynamicAttributes" JSONB NOT NULL DEFAULT '{}',
    "brand" TEXT,
    "countryOfOrigin" TEXT,
    "hsCode" TEXT,
    "targetMarket" TEXT,
    "supplier" TEXT,
    "netContent" TEXT,
    "ingredients" TEXT,
    "usageInstructions" TEXT,
    "storageInstructions" TEXT,
    "safetyWarnings" TEXT,
    "riskLevel" INTEGER NOT NULL DEFAULT 0,
    "elabelStatus" TEXT NOT NULL DEFAULT 'draft',
    "recallReason" TEXT,
    "labelImages" JSONB NOT NULL DEFAULT '[]',
    "certificates" JSONB NOT NULL DEFAULT '[]',
    "labelAttributes" JSONB NOT NULL DEFAULT '[]',
    "appendixGroup" TEXT,
    "appendixAttributes" JSONB NOT NULL DEFAULT '{}',
    "ownerInfo" JSONB NOT NULL DEFAULT '{}',
    "portalConnected" BOOLEAN NOT NULL DEFAULT false,
    "portalSyncedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "source" "ProductSource" NOT NULL DEFAULT 'MANUAL',
    "sourceReference" TEXT,
    "sourceSyncedAt" TIMESTAMP(3),
    "sourceSnapshot" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flows" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "categoryId" TEXT,
    "publicConfig" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trace_tasks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT,
    "productId" TEXT NOT NULL,
    "lot" TEXT,
    "flowId" TEXT,
    "organizationId" TEXT,
    "assignedUserId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "trace_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flow_versions" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "completionRule" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flow_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_definitions" (
    "id" TEXT NOT NULL,
    "flowVersionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "allowRepeat" BOOLEAN NOT NULL DEFAULT false,
    "enterRoleKeys" JSONB NOT NULL DEFAULT '[]',
    "approveRoleKeys" JSONB NOT NULL DEFAULT '[]',
    "preconditions" JSONB NOT NULL DEFAULT '[]',
    "suggestionConfig" JSONB NOT NULL DEFAULT '{}',
    "publicConfig" JSONB NOT NULL DEFAULT '{"event": true, "who": true, "where": true, "when": true, "media": true}',

    CONSTRAINT "event_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_fields" (
    "id" TEXT NOT NULL,
    "eventDefinitionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB NOT NULL DEFAULT '[]',
    "order" INTEGER NOT NULL DEFAULT 0,
    "publicVisible" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "event_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "traceable_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "gtin" TEXT NOT NULL,
    "batchOrLot" TEXT,
    "serialNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "traceable_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "organizationId" TEXT,
    "traceableItemId" TEXT NOT NULL,
    "flowVersionId" TEXT NOT NULL,
    "eventDefinitionId" TEXT NOT NULL,
    "gtin" TEXT NOT NULL,
    "performedByUserId" TEXT,
    "performedByName" TEXT,
    "enteredByUserId" TEXT,
    "approvedByUserId" TEXT,
    "location" TEXT,
    "gpsLat" DOUBLE PRECISION,
    "gpsLng" DOUBLE PRECISION,
    "performedAt" TIMESTAMP(3),
    "action" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'DRAFT',
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "event_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_record_values" (
    "id" TEXT NOT NULL,
    "eventRecordId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "valueJson" JSONB NOT NULL,

    CONSTRAINT "event_record_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_record_media" (
    "id" TEXT NOT NULL,
    "eventRecordId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "publicVisible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_record_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_histories" (
    "id" TEXT NOT NULL,
    "eventRecordId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" "ApprovalAction" NOT NULL,
    "comment" TEXT,
    "fromStatus" "RecordStatus",
    "toStatus" "RecordStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_codes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "gtin" TEXT NOT NULL,
    "lot" TEXT,
    "serial" TEXT,
    "publicUrl" TEXT NOT NULL,
    "status" "QrStatus" NOT NULL DEFAULT 'ACTIVE',
    "traceableItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qr_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_assignments" (
    "id" TEXT NOT NULL,
    "qrCodeId" TEXT NOT NULL,
    "traceableItemId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_scan_logs" (
    "id" TEXT NOT NULL,
    "qrCodeId" TEXT NOT NULL,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_scan_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vnpc_sync_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "operation" TEXT NOT NULL,
    "query" TEXT,
    "gtin" TEXT,
    "status" TEXT NOT NULL,
    "httpStatus" INTEGER,
    "durationMs" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vnpc_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flow_permissions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "eventDefinitionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flow_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_batches" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchCode" TEXT NOT NULL,
    "manufacturingDate" TIMESTAMP(3),
    "totalQuantity" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "recallReason" TEXT,
    "traceabilityUrl" TEXT,
    "attributes" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "product_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_flows" (
    "productId" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,

    CONSTRAINT "product_flows_pkey" PRIMARY KEY ("productId","flowId")
);

-- CreateTable
CREATE TABLE "flow_organizations" (
    "flowId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "flow_organizations_pkey" PRIMARY KEY ("flowId","organizationId")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_code_key" ON "tenants"("code");

-- CreateIndex
CREATE INDEX "organizations_tenantId_parentId_idx" ON "organizations"("tenantId", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_tenantId_code_key" ON "organizations"("tenantId", "code");

-- CreateIndex
CREATE INDEX "users_tenantId_organizationId_idx" ON "users"("tenantId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenantId_email_key" ON "users"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_tenantId_key_key" ON "roles"("tenantId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE UNIQUE INDEX "user_scopes_userId_organizationId_key" ON "user_scopes"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_tenantId_code_key" ON "product_categories"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "category_fields_categoryId_key_key" ON "category_fields"("categoryId", "key");

-- CreateIndex
CREATE INDEX "products_tenantId_organizationId_idx" ON "products"("tenantId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "products_tenantId_gtin_key" ON "products"("tenantId", "gtin");

-- CreateIndex
CREATE UNIQUE INDEX "flows_tenantId_code_key" ON "flows"("tenantId", "code");

-- CreateIndex
CREATE INDEX "trace_tasks_tenantId_assignedUserId_idx" ON "trace_tasks"("tenantId", "assignedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "flow_versions_flowId_version_key" ON "flow_versions"("flowId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "event_definitions_flowVersionId_code_key" ON "event_definitions"("flowVersionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "event_fields_eventDefinitionId_key_key" ON "event_fields"("eventDefinitionId", "key");

-- CreateIndex
CREATE INDEX "traceable_items_tenantId_gtin_idx" ON "traceable_items"("tenantId", "gtin");

-- CreateIndex
CREATE INDEX "event_records_tenantId_traceableItemId_idx" ON "event_records"("tenantId", "traceableItemId");

-- CreateIndex
CREATE INDEX "event_records_tenantId_status_idx" ON "event_records"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "event_record_values_eventRecordId_fieldKey_key" ON "event_record_values"("eventRecordId", "fieldKey");

-- CreateIndex
CREATE INDEX "approval_histories_eventRecordId_idx" ON "approval_histories"("eventRecordId");

-- CreateIndex
CREATE INDEX "qr_codes_tenantId_gtin_idx" ON "qr_codes"("tenantId", "gtin");

-- CreateIndex
CREATE UNIQUE INDEX "qr_assignments_qrCodeId_key" ON "qr_assignments"("qrCodeId");

-- CreateIndex
CREATE INDEX "qr_scan_logs_qrCodeId_idx" ON "qr_scan_logs"("qrCodeId");

-- CreateIndex
CREATE INDEX "vnpc_sync_logs_tenantId_createdAt_idx" ON "vnpc_sync_logs"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_createdAt_idx" ON "audit_logs"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "flow_permissions_tenantId_flowId_idx" ON "flow_permissions"("tenantId", "flowId");

-- CreateIndex
CREATE UNIQUE INDEX "flow_permissions_userId_flowId_eventDefinitionId_key" ON "flow_permissions"("userId", "flowId", "eventDefinitionId");

-- CreateIndex
CREATE INDEX "product_batches_tenantId_productId_idx" ON "product_batches"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "flow_organizations_organizationId_idx" ON "flow_organizations"("organizationId");

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_scopes" ADD CONSTRAINT "user_scopes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_scopes" ADD CONSTRAINT "user_scopes_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_fields" ADD CONSTRAINT "category_fields_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flows" ADD CONSTRAINT "flows_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trace_tasks" ADD CONSTRAINT "trace_tasks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trace_tasks" ADD CONSTRAINT "trace_tasks_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trace_tasks" ADD CONSTRAINT "trace_tasks_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trace_tasks" ADD CONSTRAINT "trace_tasks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trace_tasks" ADD CONSTRAINT "trace_tasks_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "flows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_versions" ADD CONSTRAINT "flow_versions_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "flows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_definitions" ADD CONSTRAINT "event_definitions_flowVersionId_fkey" FOREIGN KEY ("flowVersionId") REFERENCES "flow_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_fields" ADD CONSTRAINT "event_fields_eventDefinitionId_fkey" FOREIGN KEY ("eventDefinitionId") REFERENCES "event_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traceable_items" ADD CONSTRAINT "traceable_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traceable_items" ADD CONSTRAINT "traceable_items_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traceable_items" ADD CONSTRAINT "traceable_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_records" ADD CONSTRAINT "event_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_records" ADD CONSTRAINT "event_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_records" ADD CONSTRAINT "event_records_traceableItemId_fkey" FOREIGN KEY ("traceableItemId") REFERENCES "traceable_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_records" ADD CONSTRAINT "event_records_flowVersionId_fkey" FOREIGN KEY ("flowVersionId") REFERENCES "flow_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_records" ADD CONSTRAINT "event_records_eventDefinitionId_fkey" FOREIGN KEY ("eventDefinitionId") REFERENCES "event_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_records" ADD CONSTRAINT "event_records_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_records" ADD CONSTRAINT "event_records_enteredByUserId_fkey" FOREIGN KEY ("enteredByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_records" ADD CONSTRAINT "event_records_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_record_values" ADD CONSTRAINT "event_record_values_eventRecordId_fkey" FOREIGN KEY ("eventRecordId") REFERENCES "event_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_record_media" ADD CONSTRAINT "event_record_media_eventRecordId_fkey" FOREIGN KEY ("eventRecordId") REFERENCES "event_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_histories" ADD CONSTRAINT "approval_histories_eventRecordId_fkey" FOREIGN KEY ("eventRecordId") REFERENCES "event_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_histories" ADD CONSTRAINT "approval_histories_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_traceableItemId_fkey" FOREIGN KEY ("traceableItemId") REFERENCES "traceable_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_assignments" ADD CONSTRAINT "qr_assignments_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "qr_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_scan_logs" ADD CONSTRAINT "qr_scan_logs_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "qr_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vnpc_sync_logs" ADD CONSTRAINT "vnpc_sync_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_permissions" ADD CONSTRAINT "flow_permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_permissions" ADD CONSTRAINT "flow_permissions_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "flows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_permissions" ADD CONSTRAINT "flow_permissions_eventDefinitionId_fkey" FOREIGN KEY ("eventDefinitionId") REFERENCES "event_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_flows" ADD CONSTRAINT "product_flows_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_flows" ADD CONSTRAINT "product_flows_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "flows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_organizations" ADD CONSTRAINT "flow_organizations_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "flows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_organizations" ADD CONSTRAINT "flow_organizations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

