import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@vlabel/shared';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { AuthUser } from '../common/types';
import { TenantsService } from './tenants.service';

@ApiTags('tenants')
@ApiBearerAuth()
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.TENANT_MANAGE)
  list() {
    return this.tenants.list();
  }

  @Post()
  @RequirePermissions(PERMISSIONS.TENANT_MANAGE)
  create(@CurrentUser() actor: AuthUser, @Body() dto: { name: string; code: string; rootOrgName?: string; adminName: string; adminEmail: string; adminPassword: string }) {
    return this.tenants.create(actor, dto);
  }
}
