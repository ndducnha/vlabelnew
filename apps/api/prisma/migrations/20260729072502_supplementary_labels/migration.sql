-- CreateTable
CREATE TABLE "supplementary_labels" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'ALL',
    "batchCode" TEXT,
    "manufacturingDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "packagingDate" TIMESTAMP(3),
    "serial" TEXT,
    "note" TEXT,
    "contentHtml" TEXT NOT NULL DEFAULT '',
    "labelSize" TEXT NOT NULL DEFAULT '80x50',
    "orientation" TEXT NOT NULL DEFAULT 'portrait',
    "logoUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "supplementary_labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplementary_label_versions" (
    "id" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "contentHtml" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,

    CONSTRAINT "supplementary_label_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "supplementary_labels_tenantId_productId_idx" ON "supplementary_labels"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "supplementary_label_versions_labelId_idx" ON "supplementary_label_versions"("labelId");

-- AddForeignKey
ALTER TABLE "supplementary_labels" ADD CONSTRAINT "supplementary_labels_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplementary_labels" ADD CONSTRAINT "supplementary_labels_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplementary_label_versions" ADD CONSTRAINT "supplementary_label_versions_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "supplementary_labels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
