import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { SupplementaryLabelsController } from './supplementary-labels.controller';
import { SupplementaryLabelsService } from './supplementary-labels.service';

@Module({
  imports: [OrganizationsModule],
  controllers: [SupplementaryLabelsController],
  providers: [SupplementaryLabelsService],
})
export class SupplementaryLabelsModule {}
