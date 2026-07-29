import { Module } from '@nestjs/common';
import { TraceTasksController } from './trace-tasks.controller';
import { TraceTasksService } from './trace-tasks.service';

@Module({
  controllers: [TraceTasksController],
  providers: [TraceTasksService],
})
export class TraceTasksModule {}
