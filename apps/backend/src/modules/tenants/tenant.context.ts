import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class TenantContext {
  private tenantId: string;
  private schemaName: string;

  setTenant(tenantId: string, schemaName: string) {
    this.tenantId = tenantId;
    this.schemaName = schemaName;
  }

  getTenantId(): string {
    return this.tenantId;
  }

  getSchemaName(): string {
    return this.schemaName || 'public';
  }
}
