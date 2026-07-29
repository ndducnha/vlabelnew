import { Module } from '@nestjs/common';
import { EventRecordsController } from './event-records.controller';
import { EventRecordsService } from './event-records.service';

@Module({
  controllers: [EventRecordsController],
  providers: [EventRecordsService],
  exports: [EventRecordsService],
})
export class EventRecordsModule {}
