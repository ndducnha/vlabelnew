import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PERMISSIONS } from '@vlabel/shared';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { AuthUser } from '../common/types';
import { VnpcService } from './vnpc.service';

@ApiTags('vnpc')
@ApiBearerAuth()
@Controller('integrations/vnpc')
export class VnpcController {
  constructor(private readonly vnpc: VnpcService) {}

  // GET /api/integrations/vnpc/products?q=
  @Get('products')
  @RequirePermissions(PERMISSIONS.VNPC_SEARCH)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  search(@Query('q') q: string, @CurrentUser() user: AuthUser) {
    return this.vnpc.search(q ?? '', user.tenantId);
  }

  // GET /api/integrations/vnpc/products/:gtin
  @Get('products/:gtin')
  @RequirePermissions(PERMISSIONS.VNPC_SEARCH)
  getByGtin(@Param('gtin') gtin: string, @CurrentUser() user: AuthUser) {
    return this.vnpc.getByGtin(gtin, user.tenantId);
  }
}
