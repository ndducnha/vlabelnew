import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS, type FieldType } from '@vlabel/shared';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { AuthUser } from '../common/types';
import { CategoriesService } from './categories.service';

@ApiTags('categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PRODUCT_READ)
  list(@CurrentUser() user: AuthUser) {
    return this.categories.list(user);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.CATEGORY_MANAGE)
  create(@CurrentUser() user: AuthUser, @Body() dto: { name: string; code: string }) {
    return this.categories.create(user, dto);
  }

  @Post(':id/fields')
  @RequirePermissions(PERMISSIONS.FIELD_MANAGE)
  addField(@CurrentUser() user: AuthUser, @Param('id') id: string,
    @Body() dto: { key: string; label: string; type: FieldType; required?: boolean; options?: string[]; publicVisible?: boolean }) {
    return this.categories.addField(user, id, dto);
  }

  @Delete('fields/:fieldId')
  @RequirePermissions(PERMISSIONS.FIELD_MANAGE)
  removeField(@CurrentUser() user: AuthUser, @Param('fieldId') fieldId: string) {
    return this.categories.removeField(user, fieldId);
  }
}
