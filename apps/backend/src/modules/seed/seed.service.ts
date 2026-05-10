import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Tenant } from '../entities/Tenant.entity';
import { Unit } from '../entities/Unit.entity';
import { User } from '../entities/User.entity';
import { Sector } from '../entities/Sector.entity';
import { UserRole, SectorType } from '@panificapro/shared';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Unit)
    private readonly unitRepo: Repository<Unit>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Sector)
    private readonly sectorRepo: Repository<Sector>,
    private readonly dataSource: DataSource,
  ) {}

  async run() {
    console.log('🌱 Starting database seeding...');

    // 1. Criar Tenant
    let tenant = await this.tenantRepo.findOne({ where: { domain: 'padaria-modelo' } });
    if (!tenant) {
      tenant = this.tenantRepo.create({
        name: 'Padaria Modelo',
        domain: 'padaria-modelo',
        dbSchema: 'tenant_modelo',
      });
      tenant = await this.tenantRepo.save(tenant);
      console.log('✅ Tenant "Padaria Modelo" created.');
    }

    // 2. Criar Unidade (Isso já deve disparar a lógica de setores se usarmos o service, 
    // mas aqui no seed vamos fazer manual para garantir o controle total ou injetar o UnitsService)
    let unit = await this.unitRepo.findOne({ where: { name: 'Matriz Centro', tenantId: tenant.id } });
    if (!unit) {
      unit = this.unitRepo.create({
        name: 'Matriz Centro',
        address: 'Rua das Flores, 123',
        tenantId: tenant.id,
      });
      unit = await this.unitRepo.save(unit);
      console.log('✅ Unit "Matriz Centro" created.');

      // Criar setores padrão
      const defaultSectors = [
        { name: 'Estoque Central', type: SectorType.ESTOQUE },
        { name: 'Cozinha Industrial', type: SectorType.PRODUCAO },
        { name: 'Balcão de Vendas', type: SectorType.FRENTE_LOJA },
        { name: 'Administração', type: SectorType.ADMINISTRATIVO },
      ];

      for (const s of defaultSectors) {
        await this.sectorRepo.save(this.sectorRepo.create({ ...s, unitId: unit.id }));
      }
      console.log('✅ Default sectors created.');
    }

    // 3. Criar Usuário Admin
    let user = await this.userRepo.findOne({ where: { email: 'admin@panificapro.com' } });
    if (!user) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const hashedPin = await bcrypt.hash('1234', 10);

      user = this.userRepo.create({
        name: 'Administrador Sistema',
        email: 'admin@panificapro.com',
        password: hashedPassword,
        pin: hashedPin,
        role: UserRole.ADMIN_GERAL,
        tenantId: tenant.id,
      });
      await this.userRepo.save(user);
      console.log('✅ Admin user created (admin@panificapro.com / admin123).');
    }

    console.log('🏁 Seeding finished successfully!');
    return { message: 'Seed executed successfully', tenantId: tenant.id };
  }
}
