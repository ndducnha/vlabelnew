import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VnpcApiClient } from './vnpc-api.client';
import { VnpcController } from './vnpc.controller';
import { VnpcService } from './vnpc.service';

@Module({
  imports: [ConfigModule],
  controllers: [VnpcController],
  providers: [VnpcApiClient, VnpcService],
  exports: [VnpcService],
})
export class VnpcModule {}
