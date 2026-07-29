import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS, type FieldType } from '@vlabel/shared';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { AuthUser } from '../common/types';
import { FlowsService } from './flows.service';

@ApiTags('flows')
@ApiBearerAuth()
@Controller()
export class FlowsController {
  constructor(private readonly flows: FlowsService) {}

  @Get('flows')
  @RequirePermissions(PERMISSIONS.PRODUCT_READ)
  list(@CurrentUser() user: AuthUser, @Query('q') q?: string, @Query('organizationId') organizationId?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.flows.list(user, { q, organizationId, page: page ? Number(page) : undefined, pageSize: pageSize ? Number(pageSize) : undefined });
  }

  @Post('flows')
  @RequirePermissions(PERMISSIONS.FLOW_MANAGE)
  create(@CurrentUser() user: AuthUser, @Body() dto: { name: string; code: string; categoryId?: string; organizationIds?: string[] }) {
    return this.flows.createFlow(user, dto);
  }

  @Get('flows/:id')
  @RequirePermissions(PERMISSIONS.PRODUCT_READ)
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.flows.get(user, id);
  }

  @Patch('flows/:id')
  @RequirePermissions(PERMISSIONS.FLOW_MANAGE)
  updateFlow(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: { name?: string; code?: string; categoryId?: string; organizationIds?: string[] }) {
    return this.flows.updateFlow(user, id, dto);
  }

  @Delete('flows/:id')
  @RequirePermissions(PERMISSIONS.FLOW_MANAGE)
  deleteFlow(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.flows.deleteFlow(user, id);
  }

  @Post('flows/:id/clone')
  @RequirePermissions(PERMISSIONS.FLOW_MANAGE)
  clone(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.flows.cloneFlow(user, id);
  }

  @Post('flows/:id/publish')
  @RequirePermissions(PERMISSIONS.FLOW_MANAGE)
  publish(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.flows.publish(user, id);
  }

  // ── Event authoring ──
  @Post('flow-versions/:versionId/events')
  @RequirePermissions(PERMISSIONS.EVENT_DEF_MANAGE)
  addEvent(@CurrentUser() user: AuthUser, @Param('versionId') versionId: string,
    @Body() dto: { name: string; code: string; required?: boolean; enterRoleKeys?: string[]; approveRoleKeys?: string[] }) {
    return this.flows.addEvent(user, versionId, dto);
  }

  @Patch('event-definitions/:id')
  @RequirePermissions(PERMISSIONS.EVENT_DEF_MANAGE)
  updateEvent(@CurrentUser() user: AuthUser, @Param('id') id: string,
    @Body() dto: { name?: string; order?: number; required?: boolean; enterRoleKeys?: string[]; approveRoleKeys?: string[] }) {
    return this.flows.updateEvent(user, id, dto);
  }

  @Delete('event-definitions/:id')
  @RequirePermissions(PERMISSIONS.EVENT_DEF_MANAGE)
  deleteEvent(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.flows.deleteEvent(user, id);
  }

  // ── Field authoring (+ public visibility) ──
  @Post('event-definitions/:id/fields')
  @RequirePermissions(PERMISSIONS.EVENT_DEF_MANAGE)
  addField(@CurrentUser() user: AuthUser, @Param('id') id: string,
    @Body() dto: { key: string; label: string; type: FieldType; required?: boolean; publicVisible?: boolean; options?: string[] }) {
    return this.flows.addField(user, id, dto);
  }

  @Patch('event-fields/:id')
  @RequirePermissions(PERMISSIONS.EVENT_DEF_MANAGE)
  updateField(@CurrentUser() user: AuthUser, @Param('id') id: string,
    @Body() dto: { label?: string; required?: boolean; publicVisible?: boolean; options?: string[] }) {
    return this.flows.updateField(user, id, dto);
  }

  @Delete('event-fields/:id')
  @RequirePermissions(PERMISSIONS.EVENT_DEF_MANAGE)
  deleteField(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.flows.deleteField(user, id);
  }

  // ── Phân quyền theo luồng ──
  @Get('flows/:id/permissions')
  @RequirePermissions(PERMISSIONS.FLOW_MANAGE)
  listPermissions(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.flows.listPermissions(user, id);
  }

  @Post('flows/:id/permissions')
  @RequirePermissions(PERMISSIONS.FLOW_MANAGE)
  assignPermission(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: { userId: string; eventDefinitionId?: string }) {
    return this.flows.assignPermission(user, id, dto);
  }

  @Delete('flow-permissions/:permId')
  @RequirePermissions(PERMISSIONS.FLOW_MANAGE)
  removePermission(@CurrentUser() user: AuthUser, @Param('permId') permId: string) {
    return this.flows.removePermission(user, permId);
  }

  // ── Cho wizard kê khai: event user được phép nhập ──
  @Get('flow-versions/:versionId/entry-events')
  entryEvents(@CurrentUser() user: AuthUser, @Param('versionId') versionId: string) {
    return this.flows.entryEvents(user, versionId);
  }
}
