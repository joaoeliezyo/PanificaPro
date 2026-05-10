import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Unit } from '../../entities/Unit.entity';
import { Sector } from '../../entities/Sector.entity';
import { CreateUnitDto } from './dto/create-unit.dto';
import { TenantContext } from '../tenants/tenant.context';
import { SectorType } from '@panificapro/shared';

@Injectable()
export class UnitsService {
  constructor(
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    @InjectRepository(Sector)
    private readonly sectorRepository: Repository<Sector>,
    private readonly tenantContext: TenantContext,
    private readonly dataSource: DataSource,
  ) {}

  async create(createUnitDto: CreateUnitDto): Promise<Unit> {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      throw new ForbiddenException('Tenant ID is required');
    }

    // Usar transação para garantir que a unidade e os setores sejam criados juntos
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Criar a Unidade
      const unit = this.unitRepository.create({
        ...createUnitDto,
        tenantId,
      });
      const savedUnit = await queryRunner.manager.save(unit);

      // 2. Criar Setores Padrão
      const defaultSectors = [
        { name: 'Estoque', type: SectorType.ESTOQUE },
        { name: 'Produção', type: SectorType.PRODUCAO },
        { name: 'Frente de Loja', type: SectorType.FRENTE_LOJA },
        { name: 'Administrativo', type: SectorType.ADMINISTRATIVO },
      ];

      const sectorEntities = defaultSectors.map((s) =>
        this.sectorRepository.create({
          ...s,
          unitId: savedUnit.id,
        }),
      );

      await queryRunner.manager.save(sectorEntities);

      await queryRunner.commitTransaction();
      return savedUnit;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(): Promise<Unit[]> {
    const tenantId = this.tenantContext.getTenantId();
    return this.unitRepository.find({
      where: { tenantId },
      relations: ['sectors'],
    });
  }

  async findOne(id: string): Promise<Unit> {
    const tenantId = this.tenantContext.getTenantId();
    const unit = await this.unitRepository.findOne({
      where: { id, tenantId },
      relations: ['sectors'],
    });

    if (!unit) {
      throw new NotFoundException(`Unit with ID ${id} not found`);
    }

    return unit;
  }
}
