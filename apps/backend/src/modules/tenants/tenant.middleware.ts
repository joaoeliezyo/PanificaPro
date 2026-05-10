import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContext } from './tenant.context';
import { DataSource } from 'typeorm';
import { Tenant } from '../../entities/Tenant.entity';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly tenantContext: TenantContext,
    private readonly dataSource: DataSource,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (tenantId) {
      // No mundo real, aqui você buscaria no banco/cache para validar o tenant e pegar o schema
      // Para o MVP, vamos buscar o Tenant no schema public
      const tenantRepo = this.dataSource.getRepository(Tenant);
      const tenant = await tenantRepo.findOne({ where: { id: tenantId } });

      if (tenant) {
        this.tenantContext.setTenant(tenant.id, tenant.dbSchema);
      }
    }

    next();
  }
}
