import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ProductionModule } from './modules/production/production.module';
import { SalesModule } from './modules/sales/sales.module';
import { TransfersModule } from './modules/transfers/transfers.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { TenantModule } from './modules/tenants/tenant.module';
import { UnitsModule } from './modules/units/units.module';
import { SeedModule } from './modules/seed/seed.module';
import { UsersModule } from './modules/users/users.module';
import { Tenant } from './entities/Tenant.entity';
import { User } from './entities/User.entity';
import { Unit } from './entities/Unit.entity';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'panificapro',
      entities: [Tenant, User, Unit, Sector],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV !== 'production',
    }),
    TenantModule,
    UsersModule,
    UnitsModule,
    SeedModule,
    AuthModule,
    InventoryModule,
    ProductionModule,
    SalesModule,
    TransfersModule,
    DashboardModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
