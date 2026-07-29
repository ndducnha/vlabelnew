import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ElabelsController } from './elabels.controller';
import { ElabelsService } from './elabels.service';

@Module({
  imports: [OrganizationsModule],
  controllers: [ElabelsController],
  providers: [ElabelsService],
})
export class ElabelsModule {}
