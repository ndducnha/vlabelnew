import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { ROLES, ROLE_LABELS, ROLE_PERMISSIONS, PERMISSIONS } from '@vlabel/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/types';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  list() {
    return this.prisma.tenant.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { organizations: true, users: true, products: true } } },
    });
  }

  /** Onboarding: tạo tenant + 4 role + đơn vị gốc + tài khoản superadmin tầng 1. */
  async create(actor: AuthUser, dto: { name: string; code: string; rootOrgName?: string; adminName: string; adminEmail: string; adminPassword: string }) {
    const dup = await this.prisma.tenant.findUnique({ where: { code: dto.code } });
    if (dup) throw new BadRequestException('Mã tenant đã tồn tại');

    // đảm bảo permissions toàn cục tồn tại (idempotent)
    for (const key of Object.values(PERMISSIONS)) {
      await this.prisma.permission.upsert({ where: { key }, update: {}, create: { key, label: key } });
    }
    const perms = await this.prisma.permission.findMany();
    const permByKey = new Map(perms.map((p) => [p.key, p.id]));

    const tenant = await this.prisma.tenant.create({ data: { name: dto.name, code: dto.code } });

    // roles + role_permissions
    const roleByKey = new Map<string, string>();
    for (const key of Object.values(ROLES)) {
      const role = await this.prisma.role.create({ data: { tenantId: tenant.id, key, name: ROLE_LABELS[key] ?? key } });
      roleByKey.set(key, role.id);
      for (const perm of ROLE_PERMISSIONS[key as keyof typeof ROLE_PERMISSIONS]) {
        const pid = permByKey.get(perm);
        if (pid) await this.prisma.rolePermission.create({ data: { roleId: role.id, permissionId: pid } });
      }
    }

    // đơn vị gốc (tầng 1)
    const rootOrg = await this.prisma.organization.create({
      data: { tenantId: tenant.id, name: dto.rootOrgName ?? dto.name, code: 'ROOT', type: 'GROUP', level: 0 },
    });

    // tài khoản superadmin tầng 1 (SUPERADMIN, scope = đơn vị gốc)
    const admin = await this.prisma.user.create({
      data: {
        tenantId: tenant.id, organizationId: rootOrg.id, email: dto.adminEmail,
        fullName: dto.adminName, passwordHash: bcrypt.hashSync(dto.adminPassword, 10),
        roles: { create: { roleId: roleByKey.get(ROLES.SUPERADMIN)! } },
        scopes: { create: { organizationId: rootOrg.id } },
      },
    });

    await this.audit.log({ tenantId: tenant.id, actorUserId: actor.sub, action: 'CREATE_TENANT', resource: 'tenant', resourceId: tenant.id, meta: { code: dto.code } });
    return { tenant, rootOrg, admin: { id: admin.id, email: admin.email } };
  }
}
