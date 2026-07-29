import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@vlabel/shared';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { AuthUser } from '../common/types';
import { SupplementaryLabelsService } from './supplementary-labels.service';

@ApiTags('supplementary-labels')
@ApiBearerAuth()
@Controller('supplementary-labels')
export class SupplementaryLabelsController {
  constructor(private readonly svc: SupplementaryLabelsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PRODUCT_READ)
  list(@CurrentUser() user: AuthUser, @Query('productId') productId?: string, @Query('gtin') gtin?: string, @Query('lot') lot?: string, @Query('mfgDate') mfgDate?: string, @Query('status') status?: string) {
    return this.svc.list(user, { productId, gtin, lot, mfgDate, status });
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PRODUCT_READ)
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.get(user, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PRODUCT_UPDATE)
  create(@CurrentUser() user: AuthUser, @Body() dto: any) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.PRODUCT_UPDATE)
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: any) {
    return this.svc.update(user, id, dto);
  }

  @Post(':id/clone')
  @RequirePermissions(PERMISSIONS.PRODUCT_UPDATE)
  clone(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.clone(user, id);
  }

  @Post(':id/status')
  @RequirePermissions(PERMISSIONS.PRODUCT_UPDATE)
  setStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: { status: string }) {
    return this.svc.setStatus(user, id, dto.status);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.PRODUCT_UPDATE)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.remove(user, id);
  }
}
