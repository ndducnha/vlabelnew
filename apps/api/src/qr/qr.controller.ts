import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@vlabel/shared';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { AuthUser } from '../common/types';
import { QrService } from './qr.service';

@ApiTags('qr')
@ApiBearerAuth()
@Controller('qr')
export class QrController {
  constructor(private readonly qr: QrService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PRODUCT_READ)
  list(@CurrentUser() user: AuthUser, @Query('gtin') gtin?: string) {
    return this.qr.list(user, gtin);
  }

  @Post('generate')
  @RequirePermissions(PERMISSIONS.QR_MANAGE)
  generate(@CurrentUser() user: AuthUser, @Body() dto: { gtin: string; lot?: string; serial?: string; quantity?: number; traceableItemId?: string }) {
    return this.qr.generate(user, dto);
  }

  @Post('import-csv')
  @RequirePermissions(PERMISSIONS.QR_MANAGE)
  importCsv(@CurrentUser() user: AuthUser, @Body('csv') csv: string) {
    return this.qr.importCsv(user, csv);
  }

  @Get(':id/png')
  @RequirePermissions(PERMISSIONS.PRODUCT_READ)
  png(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.qr.png(user, id);
  }

  @Post(':id/assign')
  @RequirePermissions(PERMISSIONS.QR_MANAGE)
  assign(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body('traceableItemId') traceableItemId: string) {
    return this.qr.assign(user, id, traceableItemId);
  }

  @Post(':id/lock')
  @RequirePermissions(PERMISSIONS.QR_MANAGE)
  lock(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.qr.setStatus(user, id, 'LOCKED');
  }

  @Post(':id/revoke')
  @RequirePermissions(PERMISSIONS.QR_MANAGE)
  revoke(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.qr.setStatus(user, id, 'REVOKED');
  }

  @Get(':id/scans')
  @RequirePermissions(PERMISSIONS.PRODUCT_READ)
  scans(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.qr.scanLogs(user, id);
  }
}
