import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { TraceableItemsController } from './traceable-items.controller';
import { TraceableItemsService } from './traceable-items.service';

@Module({
  imports: [OrganizationsModule],
  controllers: [TraceableItemsController],
  providers: [TraceableItemsService],
})
export class TraceableItemsModule {}
