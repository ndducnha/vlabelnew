import { Injectable, NotFoundException } from '@nestjs/common';
import type { FieldType } from '@vlabel/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/types';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  list(user: AuthUser) {
    return this.prisma.productCategory.findMany({
      where: { tenantId: user.tenantId, deletedAt: null },
      orderBy: { name: 'asc' },
      include: { fields: { orderBy: { order: 'asc' } }, _count: { select: { products: true } } },
    });
  }

  async create(user: AuthUser, dto: { name: string; code: string }) {
    const cat = await this.prisma.productCategory.create({
      data: { tenantId: user.tenantId, name: dto.name, code: dto.code },
    });
    await this.audit.log({ tenantId: user.tenantId, actorUserId: user.sub, action: 'CREATE', resource: 'category', resourceId: cat.id });
    return cat;
  }

  async addField(user: AuthUser, categoryId: string, dto: { key: string; label: string; type: FieldType; required?: boolean; options?: string[]; publicVisible?: boolean }) {
    const cat = await this.prisma.productCategory.findFirst({ where: { id: categoryId, tenantId: user.tenantId } });
    if (!cat) throw new NotFoundException('Không tìm thấy danh mục');
    const count = await this.prisma.categoryField.count({ where: { categoryId } });
    return this.prisma.categoryField.create({
      data: {
        categoryId, key: dto.key, label: dto.label, type: dto.type,
        required: dto.required ?? false, options: (dto.options ?? []) as any, order: count,
      },
    });
  }

  async removeField(user: AuthUser, fieldId: string) {
    const field = await this.prisma.categoryField.findFirst({ where: { id: fieldId, category: { tenantId: user.tenantId } } });
    if (!field) throw new NotFoundException('Không tìm thấy field');
    await this.prisma.categoryField.delete({ where: { id: fieldId } });
    return { ok: true };
  }
}
