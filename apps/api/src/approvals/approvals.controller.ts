import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@vlabel/shared';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { AuthUser } from '../common/types';
import { ApprovalsService } from './approvals.service';

@ApiTags('approvals')
@ApiBearerAuth()
@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvals: ApprovalsService) {}

  @Get('pending')
  @RequirePermissions(PERMISSIONS.EVENT_RECORD_APPROVE)
  pending(@CurrentUser() user: AuthUser) {
    return this.approvals.pending(user);
  }

  @Get('approved')
  @RequirePermissions(PERMISSIONS.EVENT_RECORD_APPROVE)
  approved(@CurrentUser() user: AuthUser) {
    return this.approvals.approved(user);
  }

  @Post(':id/approve')
  @RequirePermissions(PERMISSIONS.EVENT_RECORD_APPROVE)
  approve(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body('comment') comment?: string) {
    return this.approvals.approve(user, id, comment);
  }

  @Post(':id/reject')
  @RequirePermissions(PERMISSIONS.EVENT_RECORD_REJECT)
  reject(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body('comment') comment?: string) {
    return this.approvals.reject(user, id, comment);
  }

  @Post(':id/request-changes')
  @RequirePermissions(PERMISSIONS.EVENT_RECORD_REQUEST_CHANGES)
  requestChanges(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body('comment') comment?: string) {
    return this.approvals.requestChanges(user, id, comment);
  }

  @Post(':id/lock')
  @RequirePermissions(PERMISSIONS.EVENT_RECORD_LOCK)
  lock(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.approvals.lock(user, id);
  }
}
