import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@vlabel/shared';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import type { AuthUser } from '../common/types';
import { ElabelsService } from './elabels.service';
import {
  setStatusSchema, setBatchStatusSchema,
  type SetStatusInput, type SetBatchStatusInput,
} from './elabels.dto';

@ApiTags('elabels')
@ApiBearerAuth()
@Controller('elabels')
export class ElabelsController {
  constructor(private readonly elabels: ElabelsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PRODUCT_READ)
  list(@CurrentUser() user: AuthUser, @Query('status') status?: string) {
    return this.elabels.list(user, status);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PRODUCT_READ)
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.elabels.get(user, id);
  }

  @Get(':id/batches/:batchId/qr')
  @RequirePermissions(PERMISSIONS.PRODUCT_READ)
  batchQr(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('batchId') batchId: string) {
    return this.elabels.batchQr(user, id, batchId);
  }

  // Kiểm tra tuân thủ Nghị định 37 trước khi công bố
  @Get(':id/compliance')
  @RequirePermissions(PERMISSIONS.PRODUCT_READ)
  compliance(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.elabels.compliance(user, id);
  }

  // Kết nối Cổng truy xuất nguồn gốc quốc gia
  @Post(':id/portal-sync')
  @RequirePermissions(PERMISSIONS.PRODUCT_UPDATE)
  portalSync(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.elabels.portalSync(user, id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.PRODUCT_UPDATE)
  updateLabel(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: any) {
    return this.elabels.updateLabel(user, id, dto);
  }

  @Post(':id/status')
  @RequirePermissions(PERMISSIONS.PRODUCT_UPDATE)
  setStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body(new ZodValidationPipe(setStatusSchema)) dto: SetStatusInput) {
    return this.elabels.setStatus(user, id, dto.status, dto.recallReason);
  }

  @Post(':id/batches')
  @RequirePermissions(PERMISSIONS.PRODUCT_UPDATE)
  addBatch(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: any) {
    return this.elabels.addBatch(user, id, dto);
  }

  @Patch(':id/batches/:batchId')
  @RequirePermissions(PERMISSIONS.PRODUCT_UPDATE)
  updateBatch(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('batchId') batchId: string, @Body() dto: any) {
    return this.elabels.updateBatch(user, id, batchId, dto);
  }

  @Post(':id/batches/:batchId/status')
  @RequirePermissions(PERMISSIONS.PRODUCT_UPDATE)
  setBatchStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('batchId') batchId: string, @Body(new ZodValidationPipe(setBatchStatusSchema)) dto: SetBatchStatusInput) {
    return this.elabels.setBatchStatus(user, id, batchId, dto.status, dto.recallReason);
  }

  @Delete(':id/batches/:batchId')
  @RequirePermissions(PERMISSIONS.PRODUCT_UPDATE)
  removeBatch(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('batchId') batchId: string) {
    return this.elabels.removeBatch(user, id, batchId);
  }
}
