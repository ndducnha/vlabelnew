import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@vlabel/shared';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { AuthUser } from '../common/types';
import { OrganizationsService } from './organizations.service';

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgs: OrganizationsService) {}

  @Get('tree')
  tree(@CurrentUser() user: AuthUser) {
    return this.orgs.tree(user);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.orgs.list(user);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.ORGANIZATION_MANAGE)
  create(@CurrentUser() user: AuthUser, @Body() dto: { name: string; code: string; type: string; parentId?: string }) {
    return this.orgs.create(user, dto);
  }

  @Patch(':id/move')
  @RequirePermissions(PERMISSIONS.ORGANIZATION_MANAGE)
  move(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body('parentId') parentId: string | null) {
    return this.orgs.move(user, id, parentId ?? null);
  }

  // Đổi cấp: up = nâng cấp, down = hạ cấp
  @Patch(':id/level')
  @RequirePermissions(PERMISSIONS.ORGANIZATION_MANAGE)
  changeLevel(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body('direction') direction: 'up' | 'down') {
    return this.orgs.changeLevel(user, id, direction);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.ORGANIZATION_MANAGE)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orgs.remove(user, id);
  }
}
