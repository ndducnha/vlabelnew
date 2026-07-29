import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../common/decorators';
import { PublicService } from './public.service';

@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  // GET /api/public/t/:gtin?lot=&serial=  (không cần đăng nhập)
  @Public()
  @Get('t/:gtin')
  trace(
    @Param('gtin') gtin: string,
    @Query('lot') lot: string | undefined,
    @Query('serial') serial: string | undefined,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) ?? req.socket.remoteAddress ?? undefined;
    return this.publicService.trace(gtin, lot, serial, ip, req.headers['user-agent']);
  }
}
