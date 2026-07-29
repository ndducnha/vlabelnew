import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@vlabel/shared';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { AuthUser } from '../common/types';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  list(@CurrentUser() user: AuthUser) {
    return this.users.list(user);
  }

  @Get('roles')
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  roles(@CurrentUser() user: AuthUser) {
    return this.users.roles(user);
  }

  // Người dùng cùng tổ chức cấp 1 + tìm nhanh (cho phân quyền flow)
  @Get('branch')
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  branch(@CurrentUser() user: AuthUser, @Query('q') q?: string) {
    return this.users.listInBranch(user, q);
  }

  @Get(':id/flow-permissions')
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  userFlows(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.users.userFlowPermissions(user, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  create(@CurrentUser() user: AuthUser, @Body() dto: { email: string; fullName: string; password: string; organizationId?: string; roleKeys?: string[]; scopeOrgIds?: string[] }) {
    return this.users.create(user, dto);
  }

  @Put(':id/roles')
  @RequirePermissions(PERMISSIONS.ROLE_ASSIGN)
  setRoles(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body('roleKeys') roleKeys: string[]) {
    return this.users.setRoles(user, id, roleKeys ?? []);
  }
}
