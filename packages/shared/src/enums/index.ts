export enum UserRole {
  ADMIN_GERAL = 'ADMIN_GERAL',       // Nível 1 - Todas as unidades
  ADMIN_UNIDADE = 'ADMIN_UNIDADE',   // Nível 2 - Uma unidade específica
  SUPERVISOR = 'SUPERVISOR',         // Nível 3 - Um setor específico
  OPERADOR = 'OPERADOR',             // Nível 4 - Tarefas operacionais
  AUDITOR = 'AUDITOR',               // Somente leitura
  COMPRADOR = 'COMPRADOR',           // Foco em fornecedores
}

export enum SectorType {
  ESTOQUE = 'ESTOQUE',
  PRODUCAO = 'PRODUCAO',
  FRENTE_LOJA = 'FRENTE_LOJA',
  ADMINISTRATIVO = 'ADMINISTRATIVO',
  EXPEDICAO = 'EXPEDICAO',
}

export enum ProductionStatus {
  PENDENTE = 'PENDENTE',
  ENVIADO = 'ENVIADO',
  EM_PRODUCAO = 'EM_PRODUCAO',
  CONCLUIDO = 'CONCLUIDO',
  ENTREGUE = 'ENTREGUE',
  CANCELADO = 'CANCELADO',
}

export enum TransferType {
  COMPRA_FORNECEDOR = 'COMPRA_FORNECEDOR',
  VENDA_INTERNA = 'VENDA_INTERNA',
  DEVOLUCAO_INTERNA = 'DEVOLUCAO_INTERNA',
  REAPROVEITAMENTO = 'REAPROVEITAMENTO',
  DESCARTE = 'DESCARTE',
}

export enum ItemCategory {
  INSUMO = 'INSUMO',
  INSUMO_PRODUZIDO = 'INSUMO_PRODUZIDO',
  PRODUTO_LIMPEZA = 'PRODUTO_LIMPEZA',
  UTENSILIO = 'UTENSILIO',
  EQUIPAMENTO = 'EQUIPAMENTO',
  PRODUTO_FINAL = 'PRODUTO_FINAL',
}
