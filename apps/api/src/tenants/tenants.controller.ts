import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@vlabel/shared';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import type { AuthUser } from '../common/types';
import { TenantsService } from './tenants.service';
import { createTenantSchema, type CreateTenantInput } from './tenants.dto';

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
  create(@CurrentUser() actor: AuthUser, @Body(new ZodValidationPipe(createTenantSchema)) dto: CreateTenantInput) {
    return this.tenants.create(actor, dto);
  }
}
