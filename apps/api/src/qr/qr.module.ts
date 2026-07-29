import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QrController } from './qr.controller';
import { QrService } from './qr.service';

@Module({
  imports: [ConfigModule],
  controllers: [QrController],
  providers: [QrService],
})
export class QrModule {}
