import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';
import { Tenant } from '../../entities/Tenant.entity';
import { Unit } from '../../entities/Unit.entity';
import { User } from '../../entities/User.entity';
import { Sector } from '../../entities/Sector.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, Unit, User, Sector])],
  controllers: [SeedController],
  providers: [SeedService],
})
export class SeedModule {}
