import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnitsService } from './units.service';
import { UnitsController } from './units.controller';
import { Unit } from '../../entities/Unit.entity';
import { Sector } from '../../entities/Sector.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Unit, Sector])],
  controllers: [UnitsController],
  providers: [UnitsService],
  exports: [UnitsService],
})
export class UnitsModule {}
