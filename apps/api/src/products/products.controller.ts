import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  PERMISSIONS, createProductManualSchema, importFromVnpcSchema,
  type CreateProductManualInput, type ImportFromVnpcInput,
} from '@vlabel/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { AuthUser } from '../common/types';
import { ProductsService } from './products.service';
import { updateProductSchema, type UpdateProductInput } from './products.dto';

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PRODUCT_READ)
  list(@CurrentUser() user: AuthUser, @Query('organizationId') organizationId?: string) {
    return this.products.list(user, organizationId);
  }

  // Tra sản phẩm theo GTIN (dùng khi quét QR để kê khai). Đặt TRƯỚC :id
  @Get('by-gtin')
  @RequirePermissions(PERMISSIONS.PRODUCT_READ)
  byGtin(@CurrentUser() user: AuthUser, @Query('gtin') gtin: string) {
    return this.products.findByGtin(user, gtin);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PRODUCT_READ)
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.products.get(user, id);
  }

  // Tải QR của sản phẩm; có lot = QR riêng cho lô đó (chế độ PER_LOT)
  @Get(':id/qr')
  @RequirePermissions(PERMISSIONS.PRODUCT_READ)
  qr(@CurrentUser() user: AuthUser, @Param('id') id: string, @Query('lot') lot?: string) {
    return this.products.qrImage(user, id, lot);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PRODUCT_CREATE)
  createManual(@CurrentUser() user: AuthUser, @Body(new ZodValidationPipe(createProductManualSchema)) dto: CreateProductManualInput) {
    return this.products.createManual(user, dto);
  }

  // POST /api/products/import-from-vnpc
  @Post('import-from-vnpc')
  @RequirePermissions(PERMISSIONS.PRODUCT_IMPORT_VNPC)
  importFromVnpc(@CurrentUser() user: AuthUser, @Body(new ZodValidationPipe(importFromVnpcSchema)) dto: ImportFromVnpcInput) {
    return this.products.importFromVnpc(user, dto);
  }

  // Gán Flow cho sản phẩm (mỗi sản phẩm 1 flow)
  @Put(':id/flows')
  @RequirePermissions(PERMISSIONS.PRODUCT_UPDATE)
  setFlows(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body('flowIds') flowIds: string[]) {
    return this.products.setFlows(user, id, flowIds ?? []);
  }

  // Gắn THÊM một Flow (hỗ trợ nhiều Flow / sản phẩm) — bổ sung, không thay setFlows
  @Post(':id/flows/attach')
  @RequirePermissions(PERMISSIONS.PRODUCT_UPDATE)
  attachFlow(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body('flowId') flowId: string) {
    return this.products.attachFlow(user, id, flowId);
  }

  // Gỡ một Flow khỏi sản phẩm
  @Delete(':id/flows/:flowId')
  @RequirePermissions(PERMISSIONS.PRODUCT_UPDATE)
  detachFlow(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('flowId') flowId: string) {
    return this.products.detachFlow(user, id, flowId);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.PRODUCT_UPDATE)
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body(new ZodValidationPipe(updateProductSchema)) dto: UpdateProductInput) {
    return this.products.update(user, id, dto);
  }

  // Đồng bộ / cập nhật lên Cổng quốc gia
  @Post(':id/sync')
  @RequirePermissions(PERMISSIONS.PRODUCT_UPDATE)
  sync(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.products.syncToPortal(user, id);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.PRODUCT_UPDATE)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.products.remove(user, id);
  }
}
