import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@vlabel/shared';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import type { AuthUser } from '../common/types';
import { CategoriesService } from './categories.service';
import {
  createCategorySchema, addFieldSchema,
  type CreateCategoryInput, type AddFieldInput,
} from './categories.dto';

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
  create(@CurrentUser() user: AuthUser, @Body(new ZodValidationPipe(createCategorySchema)) dto: CreateCategoryInput) {
    return this.categories.create(user, dto);
  }

  @Post(':id/fields')
  @RequirePermissions(PERMISSIONS.FIELD_MANAGE)
  addField(@CurrentUser() user: AuthUser, @Param('id') id: string,
    @Body(new ZodValidationPipe(addFieldSchema)) dto: AddFieldInput) {
    return this.categories.addField(user, id, dto);
  }

  @Delete('fields/:fieldId')
  @RequirePermissions(PERMISSIONS.FIELD_MANAGE)
  removeField(@CurrentUser() user: AuthUser, @Param('fieldId') fieldId: string) {
    return this.categories.removeField(user, fieldId);
  }
}
