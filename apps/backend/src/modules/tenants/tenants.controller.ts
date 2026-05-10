import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../../entities/Tenant.entity';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('tenants')
@Controller('tenants')
export class TenantsController {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  @Public()
  @Get('domain/:domain')
  @ApiOperation({ summary: 'Busca um tenant pelo domínio (slug)' })
  async findByDomain(@Param('domain') domain: string) {
    const tenant = await this.tenantRepo.findOne({ where: { domain } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }
}
