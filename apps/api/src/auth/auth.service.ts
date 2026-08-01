import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomUUID } from 'crypto';
import { permissionsForRoles } from '@vlabel/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/types';

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: { roles: { include: { role: true } }, scopes: true },
    });
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const roleKeys = user.roles.map((r) => r.role.key);
    const permissions = [...permissionsForRoles(roleKeys)];
    const authUser: AuthUser = {
      sub: user.id,
      tenantId: user.tenantId,
      organizationId: user.organizationId,
      email: user.email,
      fullName: user.fullName,
      roles: roleKeys,
      permissions,
      scopeOrgIds: user.scopes.map((s) => s.organizationId),
    };
    return this.issueTokens(authUser);
  }

  /** Đổi mật khẩu: xác thực mật khẩu hiện tại rồi cập nhật (bổ sung, không ảnh hưởng luồng cũ). */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user || !bcrypt.compareSync(currentPassword, user.passwordHash)) {
      throw new UnauthorizedException('Mật khẩu hiện tại không đúng');
    }
    if (!newPassword || newPassword.length < 8) {
      throw new UnauthorizedException('Mật khẩu mới cần tối thiểu 8 ký tự');
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash: bcrypt.hashSync(newPassword, 10) } });
    return { ok: true };
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; jti: string };
    try {
      payload = this.jwt.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash: sha256(refreshToken) } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token đã hết hạn hoặc bị thu hồi');
    }
    // rotation: thu hồi token cũ
    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });

    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      include: { roles: { include: { role: true } }, scopes: true },
    });
    if (!user) throw new UnauthorizedException('Người dùng không tồn tại');

    const roleKeys = user.roles.map((r) => r.role.key);
    const authUser: AuthUser = {
      sub: user.id, tenantId: user.tenantId, organizationId: user.organizationId,
      email: user.email, fullName: user.fullName, roles: roleKeys,
      permissions: [...permissionsForRoles(roleKeys)], scopeOrgIds: user.scopes.map((s) => s.organizationId),
    };
    return this.issueTokens(authUser);
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  private async issueTokens(user: AuthUser) {
    const accessTtl = Number(this.config.get('JWT_ACCESS_TTL', 900));
    const refreshTtl = Number(this.config.get('JWT_REFRESH_TTL', 1209600));

    const accessToken = this.jwt.sign(user, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: accessTtl,
    });
    const jti = randomUUID();
    const refreshToken = this.jwt.sign(
      { sub: user.sub, jti },
      { secret: this.config.get('JWT_REFRESH_SECRET'), expiresIn: refreshTtl },
    );
    await this.prisma.refreshToken.create({
      data: {
        userId: user.sub,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: accessTtl,
      user: {
        id: user.sub, email: user.email, fullName: user.fullName,
        tenantId: user.tenantId, organizationId: user.organizationId,
        roles: user.roles, permissions: user.permissions,
      },
    };
  }
}
