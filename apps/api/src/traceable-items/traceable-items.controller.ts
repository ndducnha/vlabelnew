import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS, createTraceableItemSchema, type CreateTraceableItemInput } from '@vlabel/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { AuthUser } from '../common/types';
import { TraceableItemsService } from './traceable-items.service';

@ApiTags('traceable-items')
@ApiBearerAuth()
@Controller('traceable-items')
export class TraceableItemsController {
  constructor(private readonly items: TraceableItemsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PRODUCT_READ)
  list(@CurrentUser() user: AuthUser, @Query('productId') productId?: string) {
    return this.items.list(user, productId);
  }

  // Quét QR để kê khai: GET /traceable-items/resolve?gtin=&lot=&serial=
  @Get('resolve')
  @RequirePermissions(PERMISSIONS.PRODUCT_READ)
  resolve(@CurrentUser() user: AuthUser, @Query('gtin') gtin: string, @Query('lot') lot?: string, @Query('serial') serial?: string) {
    return this.items.resolve(user, gtin, lot, serial);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.TRACEABLE_ITEM_MANAGE)
  create(@CurrentUser() user: AuthUser, @Body(new ZodValidationPipe(createTraceableItemSchema)) dto: CreateTraceableItemInput) {
    return this.items.create(user, dto);
  }

  // Đảm bảo có traceable item cho sản phẩm (dùng khi kê khai theo sản phẩm)
  @Post('ensure')
  @RequirePermissions(PERMISSIONS.TRACEABLE_ITEM_MANAGE)
  ensure(@CurrentUser() user: AuthUser, @Body('productId') productId: string, @Body('lot') lot?: string) {
    return this.items.ensureForProduct(user, productId, lot);
  }
}
