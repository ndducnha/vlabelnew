import { Module } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { OrgScopeService } from './org-scope.service';

@Module({
  controllers: [OrganizationsController],
  providers: [OrganizationsService, OrgScopeService],
  exports: [OrganizationsService, OrgScopeService],
})
export class OrganizationsModule {}
