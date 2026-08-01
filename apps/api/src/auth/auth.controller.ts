import { Body, Controller, Get, Post, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { loginSchema } from '@vlabel/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser, Public } from '../common/decorators';
import type { AuthUser } from '../common/types';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @UsePipes(new ZodValidationPipe(loginSchema))
  login(@Body() body: { email: string; password: string }) {
    return this.auth.login(body.email, body.password);
  }

  @Public()
  @Post('refresh')
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.auth.refresh(refreshToken);
  }

  @Post('logout')
  @ApiBearerAuth()
  logout(@Body('refreshToken') refreshToken: string) {
    return this.auth.logout(refreshToken);
  }

  // Đổi mật khẩu (đăng nhập rồi). Bổ sung, tương thích ngược.
  @Post('change-password')
  @ApiBearerAuth()
  changePassword(@CurrentUser() user: AuthUser, @Body() body: { currentPassword: string; newPassword: string }) {
    return this.auth.changePassword(user.sub, body.currentPassword, body.newPassword);
  }

  @Get('me')
  @ApiBearerAuth()
  me(@CurrentUser() user: AuthUser) {
    return {
      id: user.sub, email: user.email, fullName: user.fullName,
      tenantId: user.tenantId, organizationId: user.organizationId,
      roles: user.roles, permissions: user.permissions, scopeOrgIds: user.scopeOrgIds,
    };
  }
}
