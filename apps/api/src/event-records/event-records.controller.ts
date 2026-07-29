import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS, eventRecordDraftSchema, type EventRecordDraftInput } from '@vlabel/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { AuthUser } from '../common/types';
import { EventRecordsService } from './event-records.service';

@ApiTags('event-records')
@ApiBearerAuth()
@Controller('event-records')
export class EventRecordsController {
  constructor(private readonly records: EventRecordsService) {}

  @Get('mine')
  @RequirePermissions(PERMISSIONS.EVENT_RECORD_CREATE)
  mine(@CurrentUser() user: AuthUser) {
    return this.records.listMine(user);
  }

  @Get('suggestions')
  @RequirePermissions(PERMISSIONS.EVENT_RECORD_CREATE)
  suggestions(@CurrentUser() user: AuthUser, @Query('eventDefinitionId') defId: string, @Query('traceableItemId') itemId?: string) {
    return this.records.suggestions(user, defId, itemId);
  }

  // Hồ sơ truy xuất của một sản phẩm (đặt TRƯỚC :id)
  @Get('by-product')
  @RequirePermissions(PERMISSIONS.PRODUCT_READ)
  byProduct(@CurrentUser() user: AuthUser, @Query('productId') productId: string) {
    return this.records.listByProduct(user, productId);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PRODUCT_READ)
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.records.get(user, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.EVENT_RECORD_CREATE)
  createDraft(@CurrentUser() user: AuthUser, @Body(new ZodValidationPipe(eventRecordDraftSchema)) dto: EventRecordDraftInput) {
    return this.records.createDraft(user, dto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.EVENT_RECORD_CREATE)
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body(new ZodValidationPipe(eventRecordDraftSchema)) dto: EventRecordDraftInput) {
    return this.records.update(user, id, dto);
  }

  @Post(':id/submit')
  @RequirePermissions(PERMISSIONS.EVENT_RECORD_SUBMIT)
  submit(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.records.submit(user, id);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.EVENT_RECORD_CREATE)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.records.remove(user, id);
  }
}
