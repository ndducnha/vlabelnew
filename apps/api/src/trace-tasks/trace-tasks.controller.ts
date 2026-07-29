import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@vlabel/shared';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { AuthUser } from '../common/types';
import { TraceTasksService } from './trace-tasks.service';

@ApiTags('trace-tasks')
@ApiBearerAuth()
@Controller('trace-tasks')
export class TraceTasksController {
  constructor(private readonly tasks: TraceTasksService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.EVENT_RECORD_CREATE)
  list(@CurrentUser() user: AuthUser, @Query('mine') mine?: string) {
    return this.tasks.list(user, mine === '1' || mine === 'true');
  }

  @Post()
  @RequirePermissions(PERMISSIONS.FLOW_MANAGE)
  create(@CurrentUser() user: AuthUser, @Body() dto: { name?: string; productId: string; lot?: string; flowId?: string; organizationId?: string; assignedUserId: string; startDate: string; endDate: string; note?: string }) {
    return this.tasks.create(user, dto);
  }

  @Patch(':id/status')
  @RequirePermissions(PERMISSIONS.EVENT_RECORD_CREATE)
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body('status') status: string) {
    return this.tasks.updateStatus(user, id, status);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.FLOW_MANAGE)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tasks.remove(user, id);
  }
}
