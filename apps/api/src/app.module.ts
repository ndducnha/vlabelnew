import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { PrismaModule } from './prisma/prisma.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';

import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { VnpcModule } from './vnpc/vnpc.module';
import { FlowsModule } from './flows/flows.module';
import { TraceableItemsModule } from './traceable-items/traceable-items.module';
import { EventRecordsModule } from './event-records/event-records.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { QrModule } from './qr/qr.module';
import { PublicModule } from './public/public.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { TenantsModule } from './tenants/tenants.module';
import { StorageModule } from './storage/storage.module';
import { TraceTasksModule } from './trace-tasks/trace-tasks.module';
import { ElabelsModule } from './elabels/elabels.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuditModule,
    AuthModule,
    OrganizationsModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
    VnpcModule,
    FlowsModule,
    TraceableItemsModule,
    EventRecordsModule,
    ApprovalsModule,
    QrModule,
    PublicModule,
    DashboardModule,
    TenantsModule,
    StorageModule,
    TraceTasksModule,
    ElabelsModule,
  ],
  providers: [
    // Thứ tự: xác thực JWT → RBAC → rate limit. Global guards.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
