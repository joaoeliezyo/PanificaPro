# PRD — PanificaPro: Sistema de Gerenciamento de Produção para Padarias

**Versão:** 1.2  
**Data:** 10/05/2026  
**Status:** Em aprovação  
**Changelog v1.1:** Inclusão do fluxo de solicitação de produção com confirmações por PIN, ficha operacional de produção, estações de trabalho e ajustes consequentes em autenticação, auditoria, modelo de dados, telas e sprints.  
**Changelog v1.2:** Modelo "cada setor é uma empresa" com transferências internas valoradas, reaproveitamento de sobras da frente de loja, insumos intermediários produzidos, cadeia de custos em cascata, hierarquia organizacional de 4 níveis com setores formais (Estoque, Produção, Frente de Loja, Administrativo, Expedição), setor de Expedição/Delivery opcional e ajustes consequentes em todo o PRD.

---

## 1. Visão geral

### 1.1 Objetivo

O PanificaPro é um sistema web SaaS de gerenciamento integrado para padarias, cobrindo estoque, fornecedores, produção, fichas técnicas e frente de loja. Ele oferece rastreabilidade completa desde o insumo até a venda final, com transferências internas valoradas entre setores (modelo "cada setor é uma empresa"), dashboards de KPIs personalizáveis por papel e setor, suporte a múltiplas unidades e operação offline em tablets.

### 1.2 Problema

Padarias operam com margens apertadas e alta perecibilidade. A falta de controle integrado entre estoque, produção e vendas gera desperdício invisível, custos mal calculados, falta de rastreabilidade sanitária e decisões baseadas em intuição em vez de dados. Sistemas genéricos de ERP não atendem às particularidades do setor (distinção entre insumo direto e indireto, aproveitamento de massa, controle de fermentação, fichas técnicas de panificação, reaproveitamento de sobras como insumo, produção de insumos intermediários).

### 1.3 Público-alvo

- Padarias artesanais e semi-industriais (1 a 20+ unidades)
- Confeitarias e estabelecimentos de food service com produção própria
- Redes de franquias de panificação

### 1.4 Modelo de negócio

SaaS multi-tenant com planos escalonados por número de unidades e funcionalidades. Cada cliente (tenant) pode gerenciar múltiplas unidades dentro de sua conta.

---

## 2. Stack tecnológica

### 2.1 Componentes principais

| Componente | Tecnologia | Justificativa |
|---|---|---|
| Frontend | Next.js (React) | SSR/SSG para performance, TypeScript compartilhado com backend, ecossistema maduro |
| Backend | NestJS (Node.js) | Arquitetura modular nativa, DI built-in, TypeScript, ideal para monolito modular |
| Banco de dados | PostgreSQL | ACID compliance, JSONB para flexibilidade, suporte robusto a multi-tenant |
| Cache / Filas | Redis | Cache de dashboard, sessões, filas de tarefas assíncronas |
| Proxy reverso | Traefik | Auto-discovery de containers, SSL automático via Let's Encrypt, dashboard de monitoramento |
| Gerenciador de segredos | Mozilla SOPS | Encriptação de arquivos de segredos, versionável no Git, zero infraestrutura adicional |
| Containerização | Docker + Docker Compose | Isolamento de serviços, reprodutibilidade, deploy simplificado |

### 2.2 Arquitetura

**Monolito modular.** Cada domínio do sistema (estoque, produção, vendas, fornecedores, transferências internas, etc.) é um módulo NestJS isolado com suas próprias entidades, serviços, controllers e repositórios. Os módulos se comunicam exclusivamente por interfaces públicas (serviços exportados), nunca acessando diretamente tabelas de outros módulos. Essa abordagem garante organização limpa com a simplicidade de um único deploy, transações ACID simples e possibilidade futura de extração para microsserviços com refatoração mínima.

### 2.3 Infraestrutura Docker

**Containers (5 serviços):**

| Container | Imagem base | Porta |
|---|---|---|
| traefik | traefik:v3 | 80, 443, 8080 (dashboard) |
| frontend | node:20-alpine | 3000 (interna) |
| backend | node:20-alpine | 3001 (interna) |
| db | postgres:16-alpine | 5432 (interna) |
| redis | redis:7-alpine | 6379 (interna) |

**Volumes e persistência:**

| Volume/Mount | Tipo | Destino | Finalidade |
|---|---|---|---|
| pgdata | Named volume | /var/lib/postgresql/data | Dados do PostgreSQL — sobrevive a rebuilds |
| redis-data | Named volume | /data | Persistência do Redis entre restarts |
| ./storage/uploads | Bind mount | /app/uploads | Notas fiscais, fotos, anexos — acessível do host |
| ./backups | Bind mount | /app/backups | Dumps do pg_dump — acessível para cópia externa |
| ./logs/backend | Bind mount | /app/logs | Logs da API — rotação e análise pelo host |
| ./certs | Bind mount | /certs | Certificados TLS (produção) |

**Backup automatizado:** cron job no container do banco executa `pg_dump` diário, salva no volume de backups acessível pelo host. Scripts de cópia para storage externo (S3 ou equivalente) rodam no host.

**Segredos:** arquivo `.env.enc` encriptado com SOPS no repositório Git. Decriptado no deploy para gerar o `.env` usado pelo Docker Compose. Chaves de encriptação gerenciadas por age (alternativa moderna ao PGP).

---

## 3. Estrutura organizacional e multi-tenancy

### 3.1 Estratégia de isolamento

**Schema-per-tenant** no PostgreSQL. Cada cliente SaaS recebe um schema isolado (ex: `tenant_padaria_silva`), garantindo isolamento de dados sem o custo operacional de bancos separados. Um schema `public` contém tabelas compartilhadas (planos, configurações globais, registro de tenants).

### 3.2 Hierarquia organizacional

```
Tenant (cliente SaaS)
  └── Organização (empresa do cliente)
       └── Unidade (padaria física)
            ├── Setor: Estoque
            ├── Setor: Produção
            │    └── Estações de trabalho
            ├── Setor: Frente de Loja
            ├── Setor: Administrativo/Financeiro
            └── Setor: Expedição/Delivery (opcional)
```

### 3.3 Setores

Cada unidade é organizada em setores formais. Os setores são entidades do sistema com responsabilidades, fluxos e KPIs próprios. Toda movimentação de materiais ou produtos entre setores é tratada como uma **transferência interna valorada** (ver seção 3.5).

**Estoque:**
- Responsabilidades: receber mercadorias de fornecedores externos, armazenar, controlar validade, organizar e atender requisições dos demais setores.
- Fluxos: entrada de fornecedores, transferência (venda interna) para Produção, recebimento de insumos produzidos devolvidos pela Produção.
- Papéis típicos: Supervisor de Estoque + Estoquista(s).

**Produção:**
- Responsabilidades: produzir produtos finais, insumos intermediários e produtos congelados/armazenados. Controlar fichas técnicas, rendimento e perdas de processo.
- Fluxos: recebimento de insumos do Estoque (compra interna), produção com ficha técnica, transferência de produtos finais para Frente de Loja (venda interna), transferência de insumos produzidos para o Estoque (venda interna), recebimento de sobras reaproveitáveis da Frente de Loja (compra interna).
- Papéis típicos: Supervisor de Produção + Auxiliar(es) de Produção (vinculados a estações de trabalho).

**Frente de Loja:**
- Responsabilidades: receber produtos da Produção (compra interna), vender ao consumidor final, registrar devoluções, gerenciar sobras (reaproveitamento para Produção ou descarte), registrar pedidos/encomendas de clientes.
- Fluxos: recebimento de produtos da Produção, venda ao cliente, devolução do cliente, transferência de sobras para Produção (venda interna de reaproveitamento), registro de descarte.
- Papéis típicos: Supervisor de Frente de Loja + Atendente(s).

**Administrativo/Financeiro:**
- Responsabilidades: gerenciar fornecedores, aprovar compras, analisar KPIs e relatórios financeiros, configurar o sistema, gerenciar usuários e papéis.
- Fluxos: cadastro de fornecedores, análise de relatórios, configurações do sistema, gestão de usuários.
- Papéis típicos: Administrador de Unidade (que acumula a função) ou Supervisor Administrativo + Auxiliar Administrativo.

**Expedição/Delivery (opcional — setor desativável):**
- Responsabilidades: separar pedidos para entrega ou retirada, controlar logística de entregas, confirmar entrega ao cliente.
- Fluxos: receber pedidos da Frente de Loja para entrega (transferência interna), registrar saída para entrega, confirmar entrega, registrar devoluções de entrega.
- Papéis típicos: Supervisor de Expedição + Entregador(es).
- Enquanto desativado, suas responsabilidades são absorvidas pela Frente de Loja.

### 3.4 Hierarquia de papéis (4 níveis)

O sistema adota quatro níveis hierárquicos padrão, integrados ao RBAC configurável:

**Nível 1 — Administrador Geral:**
- Escopo: todas as unidades do tenant.
- Permissões: acesso total a todos os setores de todas as unidades. Cria e configura unidades, define papéis e permissões globais, gerencia Administradores de Unidade.
- Visão: dashboards consolidados entre unidades, comparativos entre filiais, relatórios agregados.
- Exemplo: o dono da padaria ou sócio-administrador.

**Nível 2 — Administrador de Unidade:**
- Escopo: uma unidade específica.
- Permissões: dentro da sua unidade, tem autonomia total — vê todos os setores, gerencia usuários, acessa todos os relatórios. Não enxerga outras unidades.
- Visão: dashboard completo da unidade, todos os KPIs de todos os setores daquela unidade.
- Exemplo: o gerente de uma filial, delegado pelo dono.

**Nível 3 — Supervisor de Setor:**
- Escopo: um setor específico dentro de uma unidade.
- Permissões: vê relatórios e KPIs do seu setor, gerencia os operadores do setor, aprova operações que exigem supervisão, monitora entradas e saídas do setor (incluindo transferências internas valoradas).
- Visão: dashboard do setor com métricas operacionais.
- Exemplo: supervisor de estoque, supervisor de produção, supervisor de frente de loja.

**Nível 4 — Operador:**
- Escopo: tarefas operacionais do setor ao qual está vinculado.
- Permissões: executa as operações do dia a dia conforme as permissões do seu papel (registrar entradas, saídas, produções, vendas, transferências).
- Visão: apenas as telas operacionais necessárias para suas funções.
- Exemplo: estoquista, auxiliar de produção, atendente de balcão.

Esses quatro níveis são os papéis padrão pré-configurados. O Administrador Geral pode criar papéis personalizados adicionais usando o RBAC (ex: "Auditor" que vê relatórios de todas as unidades mas não altera nada, ou "Comprador" que gerencia fornecedores e compras mas não acessa produção).

### 3.5 Modelo "cada setor é uma empresa" — transferências internas valoradas

Toda movimentação de materiais ou produtos entre setores é tratada como uma transferência interna valorada — como se fosse uma venda entre empresas do mesmo grupo. Esse modelo é a espinha dorsal da apuração de custos e margens do sistema.

**Fluxos de transferência:**

| Origem | Destino | O que transfere | Custo base |
|---|---|---|---|
| Fornecedor externo | Estoque | Insumos, limpeza, utensílios, equipamentos | Preço de compra (NF) |
| Estoque | Produção | Insumos para produção | Preço médio ponderado ou último custo |
| Produção | Frente de Loja | Produtos acabados | Custo de produção (ficha técnica) |
| Produção | Estoque | Insumos intermediários produzidos | Custo de produção (ficha técnica) |
| Frente de Loja | Produção | Sobras para reaproveitamento | Custo original do produto |
| Frente de Loja | Expedição | Pedidos para entrega | Custo de aquisição interna |
| Produção | Estoque | Produtos congelados/armazenados | Custo de produção (ficha técnica) |

**Registro de cada transferência:**
- Setor de origem e setor de destino
- Itens transferidos com quantidades
- Custo unitário e custo total
- Data/hora
- Usuário responsável pela saída (com PIN)
- Usuário responsável pelo recebimento (com PIN)
- Número da transferência (formato `TI-AAAAMMDD-NNN`)
- Tipo: compra_fornecedor, venda_interna, devolucao_interna, reaproveitamento, descarte

**O que esse modelo permite:**
- Apurar custo e margem por setor de forma independente
- Identificar com precisão onde ocorrem perdas e desperdícios (em qual setor)
- Rastrear a cadeia completa de custo desde o fornecedor até a venda final
- Gerar relatórios de "compra e venda" interna por setor
- Calcular a "receita" e o "custo" de cada setor como se fosse uma empresa independente

### 3.6 Gestão de unidades

- Cada tenant pode criar e gerenciar múltiplas unidades
- Dashboard consolidado com visão geral de todas as unidades ou filtro por unidade específica
- Transferência de estoque entre unidades (com registro de movimentação valorada)
- Fichas técnicas compartilhadas entre unidades ou exclusivas por unidade
- Comparativo de desempenho entre unidades e entre setores

---

## 4. Autenticação, papéis e permissões

### 4.1 Autenticação

- Login por e-mail + senha (hash bcrypt com salt)
- Suporte futuro a OAuth 2.0 (Google, Microsoft)
- JWT com refresh token (access token: 15 min, refresh token: 7 dias)
- Sessões gerenciadas via Redis
- Rate limiting por IP e por usuário

### 4.2 PIN operacional

Todos os usuários que participam de operações com confirmação (transferências internas, fluxo de produção, frente de loja) possuem um **PIN numérico (4 a 6 dígitos)**, configurável no cadastro do usuário. O PIN é obrigatório para operadores e supervisores de todos os setores. Para perfis puramente administrativos (Auditor, Consultor), o PIN é opcional.

**Finalidade do PIN:** autenticar confirmações operacionais — transferências internas entre setores, transições de status no fluxo de solicitação de produção, descartes e devoluções. O PIN não substitui a senha de login — é um mecanismo de autenticação rápida para operações no chão de fábrica e na frente de loja, onde o usuário já está logado no dispositivo.

**Regras do PIN:**
- Armazenado com hash (bcrypt) — nunca em plain text
- Pode ser alterado pelo próprio usuário ou redefinido pelo administrador
- Bloqueio temporário após 5 tentativas inválidas (configurável)
- Cada validação de PIN gera registro de auditoria

### 4.3 Sistema de papéis e permissões (modelo OJS)

O sistema de controle de acesso é inspirado no OJS (Open Journal Systems), onde papéis são totalmente configuráveis pelo administrador do tenant.

**Conceitos:**

- **Recurso (Resource):** entidade do sistema sobre a qual se pode agir (ex: `estoque.insumo`, `producao.ordem`, `producao.solicitacao`, `transferencia.interna`, `venda.registro`, `dashboard.kpi`)
- **Ação (Action):** operação possível sobre um recurso (ex: `criar`, `ler`, `editar`, `excluir`, `aprovar`, `exportar`, `despachar`, `confirmar_recebimento`, `confirmar_conclusao`, `confirmar_entrega`, `transferir`)
- **Permissão (Permission):** combinação de recurso + ação (ex: `transferencia.interna:criar`)
- **Papel (Role):** conjunto nomeado de permissões (ex: "Supervisor de Produção", "Estoquista", "Atendente")
- **Escopo:** o papel é atribuído com escopo de unidade + setor (ex: Supervisor de Produção da Unidade Centro)

**Papéis padrão pré-configurados (editáveis):**

| Papel | Nível | Descrição | Escopo típico |
|---|---|---|---|
| Administrador do Sistema | — | Acesso total, gerencia tenants (apenas SaaS admin) | Global |
| Administrador Geral | 1 | Acesso total dentro do tenant, todas as unidades e setores | Tenant |
| Administrador de Unidade | 2 | Autonomia total dentro da unidade, todos os setores | Unidade |
| Supervisor de Estoque | 3 | Gestão do setor de estoque, aprovação de movimentações | Unidade + Setor |
| Supervisor de Produção | 3 | Gestão do setor de produção, fichas técnicas, supervisão de estações | Unidade + Setor |
| Supervisor de Frente de Loja | 3 | Gestão da frente de loja, aprovação de descartes e reaproveitamentos | Unidade + Setor |
| Supervisor Administrativo | 3 | Fornecedores, compras, relatórios financeiros | Unidade + Setor |
| Supervisor de Expedição | 3 | Logística de entregas, confirmação de entregas | Unidade + Setor |
| Estoquista | 4 | Recebimento, organização, saída de materiais | Unidade + Setor |
| Auxiliar de Produção | 4 | Registro de produção, consulta de fichas, confirmação em estações | Unidade + Setor |
| Atendente | 4 | Vendas, pedidos, devoluções, descartes, reaproveitamento | Unidade + Setor |
| Auxiliar Administrativo | 4 | Apoio em compras, cadastros, relatórios | Unidade + Setor |
| Entregador | 4 | Registro de saída e confirmação de entrega | Unidade + Setor |
| Comprador | — | Fornecedores, cotações, pedidos de compra | Tenant ou unidade |
| Auditor / Consultor | — | Somente leitura em todos os módulos | Conforme atribuição |

**Funcionalidades do sistema de papéis:**

- O Administrador Geral pode criar novos papéis a qualquer momento
- Ao criar um papel, seleciona granularmente as permissões por recurso e ação
- Um usuário pode ter múltiplos papéis (ex: "Supervisor de Produção" na Unidade A e "Auditor" na Unidade B)
- Papéis padrão podem ser editados ou clonados como base para novos papéis
- Registro de auditoria de todas as alterações em papéis e permissões
- O dashboard se adapta automaticamente ao conjunto de permissões e setor do usuário logado

### 4.4 Matriz de permissões por módulo

| Módulo | Recursos | Ações disponíveis |
|---|---|---|
| Estoque | insumo, insumo_produzido, produto_limpeza, utensilio, equipamento, movimentacao, inventario | criar, ler, editar, excluir, aprovar, transferir, exportar |
| Fornecedores | fornecedor, pedido_compra, nota_fiscal, cotacao | criar, ler, editar, excluir, aprovar, anexar, exportar |
| Produção | ordem_producao, ficha_tecnica, lote, perda, aproveitamento, solicitacao, estacao_trabalho, insumo_intermediario | criar, ler, editar, excluir, aprovar, iniciar, finalizar, despachar, confirmar_recebimento, confirmar_conclusao, exportar |
| Frente de Loja | saida_produto, devolucao, descarte, reaproveitamento, fechamento, pedido_cliente | criar, ler, editar, registrar, fechar_caixa, confirmar_entrega, transferir, exportar |
| Expedição | pedido_entrega, rota, confirmacao_entrega | criar, ler, editar, registrar, confirmar, exportar |
| Transferências | transferencia_interna | criar, ler, aprovar, confirmar_recebimento, exportar |
| Dashboard | kpi_estoque, kpi_producao, kpi_vendas, kpi_financeiro, kpi_comparativo, kpi_solicitacoes, kpi_setor, kpi_transferencias | ler, exportar, configurar |
| Administração | usuario, papel, permissao, unidade, setor, configuracao | criar, ler, editar, excluir, atribuir |

---

## 5. Módulos funcionais

### 5.1 Módulo de Estoque

O Estoque atua como "fornecedor interno" para os demais setores. Toda saída do estoque para outro setor é registrada como uma transferência interna valorada.

#### 5.1.1 Categorias de itens gerenciados

**Insumos (matéria-prima):**
- Ingredientes para produção (farinha, açúcar, fermento, ovos, manteiga, etc.)
- Controle de lote de compra, data de validade, fornecedor de origem
- Unidades de medida configuráveis (kg, g, L, mL, unidade, dúzia)
- Estoque mínimo e ponto de reposição configuráveis por item

**Insumos produzidos (recebidos da Produção):**
- Itens produzidos internamente que retornam ao estoque como ingrediente para outras receitas (ex: recheio de frango, creme confeiteiro, farinha de rosca)
- Custo calculado automaticamente pela ficha técnica de produção
- Controlados como qualquer outro insumo (validade, lote, saldo)
- Podem ter dupla natureza: disponíveis como insumo para fichas técnicas e como produto para venda na Frente de Loja

**Produtos de limpeza:**
- Detergentes, sanitizantes, desinfetantes, etc.
- Controle de validade e fichas de segurança (FISPQ) anexáveis
- Estoque mínimo

**Utensílios:**
- Itens de uso na produção (espátulas, formas, pincéis, etc.)
- Controle de quantidade e estado (novo, em uso, para descarte)
- Não perecíveis — sem controle de validade, mas com controle de vida útil

**Equipamentos:**
- Equipamentos novos em estoque (fornos, batedeiras, etc.)
- Equipamentos guardados/reserva
- Registro de número de série, garantia, manual (anexável)
- Histórico de manutenção (preventiva e corretiva)
- Agendamento de manutenção programada

#### 5.1.2 Movimentações de estoque

Toda movimentação gera um registro imutável com: item, quantidade, tipo de movimentação, custo unitário, custo total, setor de origem/destino, data/hora, usuário responsável, unidade, observação, referência à transferência interna (quando aplicável).

**Tipos de movimentação:**
- Entrada por compra de fornecedor externo (vinculada a pedido de compra/nota fiscal)
- Entrada por recebimento de insumo produzido (da Produção — transferência interna)
- Entrada por recebimento de produto congelado/armazenado (da Produção — transferência interna)
- Entrada por devolução da Produção (insumos não utilizados)
- Entrada por transferência entre unidades
- Saída para Produção (transferência interna valorada — "venda" ao setor de Produção)
- Saída por transferência entre unidades
- Saída por descarte (com motivo obrigatório)
- Ajuste de inventário (positivo ou negativo, com justificativa)

#### 5.1.3 Inventário

- Ferramenta de contagem física com interface otimizada para tablet
- Comparação automática entre estoque registrado e contagem física
- Geração de relatório de divergências
- Aprovação de ajustes por usuário com permissão adequada

### 5.2 Módulo de Fornecedores

#### 5.2.1 Cadastro de fornecedores

- Dados cadastrais completos (razão social, CNPJ, contatos, endereço)
- Categorias de produtos fornecidos
- Classificação/avaliação do fornecedor (pontualidade, qualidade, preço)
- Status (ativo, inativo, bloqueado)
- Documentos anexáveis (contrato, alvará, certificações)

#### 5.2.2 Histórico de preços

- Registro automático do preço de cada item a cada compra
- Gráfico de evolução de preço por item e por fornecedor
- Comparativo de preço entre fornecedores para o mesmo item
- Alertas de variação de preço significativa (configurável, ex: >10%)
- Cálculo de preço médio ponderado por período

#### 5.2.3 Pedidos de compra

- Criação manual ou sugerida pelo sistema (com base em estoque mínimo e planejamento de produção)
- Workflow de aprovação configurável (ex: compras acima de R$ X precisam de aprovação do supervisor administrativo)
- Status do pedido (rascunho, aguardando aprovação, aprovado, enviado ao fornecedor, recebido parcial, recebido total, cancelado)
- Vinculação com nota fiscal no recebimento

#### 5.2.4 Notas fiscais

- Upload de nota fiscal (PDF ou imagem)
- Campos principais extraídos ou preenchidos manualmente (número, série, data, fornecedor, valor total, itens)
- Vinculação com pedido de compra e entrada no estoque
- Armazenamento seguro com acesso controlado por permissão
- Busca e filtro por período, fornecedor, valor

### 5.3 Módulo de Produção

O setor de Produção "compra" insumos do Estoque e "vende" produtos acabados para a Frente de Loja ou devolve insumos produzidos para o Estoque. Toda entrada e saída é registrada como transferência interna valorada.

#### 5.3.1 Fichas técnicas (receitas)

A ficha técnica é o documento central da produção. Cada produto fabricado ou insumo intermediário tem uma ficha técnica cadastrada.

**Estrutura da ficha técnica:**

- Nome do produto/insumo
- Tipo de saída: **produto final** (destino Frente de Loja ou Estoque de produtos acabados) ou **insumo intermediário** (destino Estoque de insumos)
- Indicador de dupla natureza: se marcado como "disponível para venda", o item aparece tanto no cadastro de insumos (para uso em outras fichas técnicas) quanto no catálogo da Frente de Loja
- Categoria (pães, bolos, salgados, doces, insumos intermediários, etc.)
- Rendimento padrão (quantidade produzida por execução da receita)
- Tempo estimado de preparo
- Modo de preparo (passo a passo com possibilidade de incluir fotos)
- Prazo de validade do produto acabado
- Condições de armazenamento (quando aplicável — ex: "congelado a -18°C")
- Versionamento (histórico de alterações na ficha)

**Insumos da ficha técnica:**

Cada insumo listado na ficha tem a seguinte classificação:

| Classificação | Descrição | Exemplo | Entra no custo |
|---|---|---|---|
| Insumo direto | Incorporado ao produto final | Farinha na massa do pão | Sim (integral) |
| Insumo indireto / apoio | Usado no processo mas não incorporado | Farinha na bancada para sovar, ovo para pincelar | Sim (proporcional) |

Os insumos podem ser de três origens:
- **Insumo de fornecedor:** comprado externamente, custo baseado no preço médio ponderado do estoque
- **Insumo produzido internamente:** produzido por outra ficha técnica, custo calculado automaticamente pela cadeia de produção (ex: creme confeiteiro, recheio de frango, farinha de rosca)
- **Insumo de reaproveitamento:** sobra da Frente de Loja reaproveitada (ex: pão seco), custo igual ao custo original do produto

Para cada insumo, a ficha registra: quantidade padrão por receita, unidade de medida, classificação (direto/indireto), origem (fornecedor/produzido/reaproveitamento) e percentual estimado de perda natural.

**Custo calculado e cadeia de custos em cascata:**

- Custo unitário do produto = soma dos custos dos insumos (diretos + indiretos) ÷ rendimento
- O custo dos insumos de fornecedor é baseado no preço médio ponderado do estoque (ou último preço de compra, configurável)
- O custo dos insumos produzidos é calculado automaticamente pela ficha técnica de origem
- **Cascata automática:** se o custo de um ingrediente base muda (ex: preço da farinha subiu), o sistema recalcula automaticamente o custo do insumo produzido que usa essa farinha, e depois recalcula o custo de todos os produtos finais que usam esse insumo produzido. A propagação é em profundidade, sem limite de níveis
- Atualização automática do custo quando o preço de qualquer insumo na cadeia muda
- Margem de contribuição calculada quando o preço de venda é informado

#### 5.3.2 Estações de trabalho

Cada unidade pode configurar uma ou mais estações de trabalho que representam os postos físicos de produção (ex: "Forno 1", "Bancada de Confeitaria", "Masseira", "Salgados").

**Cadastro da estação:**
- Nome da estação
- Auxiliar de produção responsável (usuário vinculado)
- Lista de produtos vinculados (fichas técnicas que a estação pode produzir)
- Indicador de disponibilidade de tablet (sim/não) — determina se o fluxo de recebimento exige confirmação digital ou opera apenas com ficha impressa
- Status (ativa, inativa, em manutenção)

**Regras de negócio:**
- Ao despachar pedidos para uma estação, o sistema filtra automaticamente os itens compatíveis — apenas produtos vinculados à estação ficam disponíveis para seleção
- Um auxiliar pode estar vinculado a mais de uma estação, mas uma estação tem um auxiliar principal por turno
- Estações sem tablet operam com ficha impressa; a confirmação de recebimento é suprimida e o status vai direto de "enviado" para "concluído" quando o auxiliar registrar a conclusão

#### 5.3.3 Fluxo de solicitação de produção

O fluxo de solicitação de produção conecta a frente de loja às estações de trabalho por meio de pedidos digitais autenticados por PIN. Cada transição de status gera registro de auditoria.

**Etapa 1 — Registro do pedido (frente de loja):**

O operador de frente de loja registra um pedido informando:
- Nome do cliente
- Item desejado (produto vinculado a uma ficha técnica)
- Quantidade
- Observações (opcional — ex: "sem cobertura", "cortar ao meio")
- Data/hora de entrega desejada

Ao confirmar, o pedido entra na fila de pedidos pendentes com status **"pendente"**. Cada pedido recebe um ID no formato `AAAAMMDD-NNNP` (ex: `20260218-019P`).

**Etapa 2 — Despacho para estação (frente de loja):**

O operador seleciona uma estação de trabalho e monta um lote de pedidos para enviar. O sistema funciona como um "carrinho": apenas itens compatíveis com a estação selecionada ficam disponíveis para inclusão.

Campos do despacho:
- Estação de destino
- Pedidos selecionados (1 ou mais)
- Nível de prioridade: **normal**, **urgente** ou **reposição crítica**
- Observações gerais (opcional)

Ao confirmar o envio, o sistema solicita o **PIN do operador**. Após validação, os pedidos são atribuídos à estação e a solicitação é criada com status **"enviado"**. A solicitação recebe um número no formato `AAAAMMDD-NNN` (ex: `20261112-013`).

Neste momento, o sistema gera automaticamente a **ficha operacional de produção** (ver seção 5.3.4), disponível para impressão.

**Etapa 3 — Recebimento na estação (produção):**

- **Com tablet na estação:** o auxiliar de produção visualiza os pedidos recebidos na tela do tablet e confirma o recebimento digitando seu **PIN**. O status muda para **"em produção"**.
- **Sem tablet na estação:** esta etapa é suprimida. O pedido permanece como "enviado" e o auxiliar trabalha com base na ficha impressa. A próxima confirmação digital acontece apenas na conclusão (etapa 4).

**Etapa 4 — Conclusão da produção (produção):**

Ao finalizar a produção, o auxiliar (ou o supervisor) registra:
- Quantidade efetivamente produzida por item
- Destino da produção (ver seção 5.3.6)
- Observações (opcional — intercorrências, substituições)

Confirma com **PIN**. O status muda para **"concluído"**. A transferência interna valorada para o setor de destino é gerada automaticamente.

**Etapa 5 — Conferência de recebimento na frente de loja:**

O operador ou responsável pela frente de loja recebe os itens produzidos e realiza a conferência:
- Resultado por item: **completo** (quantidade total entregue), **parcial** (quantidade inferior ao solicitado) ou **não produzido**
- Para entregas parciais, registra a quantidade efetivamente recebida
- Observações (opcional)

Confirma com **PIN**. O status muda para **"entregue"**. O recebimento na transferência interna é confirmado.

**Status possíveis da solicitação:**

| Status | Descrição |
|---|---|
| pendente | Pedido registrado, aguardando despacho |
| enviado | Despachado para estação, aguardando recebimento ou produção |
| em_producao | Recebido na estação (confirmado por PIN), em execução |
| concluido | Produção finalizada, aguardando conferência na frente de loja |
| entregue | Conferido e recebido na frente de loja |
| cancelado | Cancelado antes da conclusão (com justificativa obrigatória) |

#### 5.3.4 Ficha operacional de produção

A ficha operacional é um documento imprimível simplificado, gerado automaticamente no momento do despacho para a estação (etapa 2 do fluxo). Serve como referência de trabalho na bancada — é prática, descartável e não tem pretensão de ser documento de controle (o controle é integralmente digital via confirmações por PIN).

**Conteúdo da ficha operacional:**

- Número da solicitação no formato `AAAAMMDD-NNN` (ex: `20261112-013`)
- Data e hora do despacho
- Nome do operador que despachou
- Estação de destino e nome do auxiliar de produção responsável
- Nível de prioridade (normal / urgente / reposição crítica), com destaque visual para urgente e crítico (fundo colorido ou borda)
- Lista dos itens com:
  - ID do pedido (formato `AAAAMMDD-NNNP`, ex: `20260218-019P`)
  - Descrição do item (nome do produto)
  - Categoria do produto
  - Quantidade solicitada
  - Nome do cliente
  - Observações do pedido (se houver)
- Observações gerais da solicitação (se houver)
- Campo em branco para anotações manuais durante a produção (quantidade real produzida, intercorrências)

**A ficha NÃO contém campos de assinatura** — essa função é cumprida pelo fluxo digital de confirmações por PIN.

**Formato:** HTML otimizado para impressão (CSS `@media print`), gerado pelo sistema e aberto em nova aba para impressão direta pelo navegador. Não requer software adicional.

#### 5.3.5 Ordens de produção

As ordens de produção são o mecanismo de controle de produção planejada (diferente das solicitações sob demanda da seção 5.3.3). Podem ser geradas manualmente, pelo planejamento de produção ou a partir de solicitações da frente de loja.

- Criação manual ou gerada pelo planejamento de produção
- Vinculação obrigatória com ficha técnica
- **Tipo da ordem:** produto final ou insumo intermediário (determinado pela ficha técnica)
- Quantidade planejada (múltiplo da receita)
- Responsável pela produção (usuário que vai executar)
- Status (planejada, em andamento, finalizada, cancelada)

**Ao iniciar a ordem:**
- Sistema calcula os insumos necessários com base na ficha técnica × quantidade
- Requisição automática ao Estoque via transferência interna (pode exigir aprovação do Supervisor de Estoque)
- Registro do que foi efetivamente retirado do Estoque (pode divergir do planejado)
- Custo dos insumos consumidos registrado na transferência interna

**Ao finalizar a ordem:**
- Registro da quantidade efetivamente produzida
- Seleção do destino (ver seção 5.3.6)
- Cálculo automático do aproveitamento: (produzido ÷ esperado) × 100%
- Registro de perdas com categorização:
  - Perda natural/esperada (dentro do percentual da ficha técnica)
  - Perda por erro operacional (massa queimada, fermentação errada)
  - Perda por falha de equipamento
  - Perda por insumo com problema (fora da validade, contaminado)
  - Outros (campo livre)
- Devolução ao Estoque de insumos não utilizados (transferência interna reversa)
- Geração automática da transferência interna valorada para o setor de destino

#### 5.3.6 Destinos da produção

No registro de conclusão de uma ordem de produção, o auxiliar deve informar o destino. O destino determina o tipo de transferência interna gerada:

| Destino | Descrição | Transferência gerada |
|---|---|---|
| Frente de Loja | Transferência imediata para venda | Produção → Frente de Loja (custo de produção) |
| Estoque congelado/armazenado | Estoque de produtos acabados para uso futuro (com prazo de validade e condições de armazenamento) | Produção → Estoque (custo de produção) |
| Estoque de insumos | Retorna ao estoque como ingrediente para outras produções (insumo intermediário) | Produção → Estoque (custo de produção) |

Itens com dupla natureza (ex: farinha de rosca — insumo e produto final) podem ser direcionados para qualquer destino. O custo é o mesmo independentemente do destino; a distinção é apenas de uso.

#### 5.3.7 Rastreabilidade por lote

Cada ordem de produção gera um lote único com:

- Código do lote (geração automática, formato configurável)
- Data e hora de produção
- Responsável (quem produziu)
- Ficha técnica utilizada (com versão)
- Tipo (produto final ou insumo intermediário)
- Insumos consumidos com referência ao lote de compra de cada um, fornecedor de origem e custo unitário (incluindo insumos produzidos e reaproveitados)
- Quantidade produzida
- Destino (Frente de Loja, Estoque congelado, Estoque de insumos)
- Data de validade do lote (calculada a partir da ficha técnica)
- Status do lote (em produção, disponível, enviado para loja, em estoque, esgotado, vencido, descartado)
- Vinculação com solicitação de produção de origem (quando aplicável)
- Referência à transferência interna gerada

Em caso de problema sanitário ou devolução de cliente, é possível rastrear toda a cadeia: produto → lote de produção → insumos utilizados (incluindo insumos produzidos e reaproveitados, com seus respectivos lotes de origem) → lotes de compra → fornecedores.

#### 5.3.8 Planejamento de produção

- Sugestão de produção para o dia seguinte baseada em:
  - Histórico de vendas (média móvel configurável: 7, 14, 30 dias)
  - Dia da semana (padrões de demanda)
  - Sazonalidade (datas comemorativas, épocas do ano)
  - Estoque atual de produtos acabados e insumos intermediários
- O gerente/supervisor de produção pode ajustar as quantidades sugeridas
- Geração automática de ordens de produção a partir do planejamento aprovado (incluindo ordens de insumos intermediários necessários)
- Verificação automática de disponibilidade de insumos no estoque
- Alerta quando insumos insuficientes para o planejamento (com sugestão de pedido de compra)

### 5.4 Módulo de Frente de Loja

A Frente de Loja "compra" produtos da Produção (via transferência interna) e vende ao consumidor final. Também pode "vender" sobras de volta para a Produção (reaproveitamento).

#### 5.4.1 Pedidos de clientes e solicitação de produção

A frente de loja é o ponto de entrada das solicitações de produção sob demanda. O operador registra pedidos de clientes e os despacha para as estações de trabalho conforme descrito no fluxo da seção 5.3.3.

**Tela de pedidos pendentes:** lista todos os pedidos registrados aguardando despacho, com filtros por cliente, produto e data de entrega. O operador seleciona pedidos, escolhe a estação de destino e os despacha em lote.

**Tela de acompanhamento de solicitações:** painel em tempo real mostrando o status de todas as solicitações ativas, organizadas por estação. Permite visualizar o progresso e identificar gargalos.

#### 5.4.2 Envio para a loja

- Registro do que foi enviado da Produção para a Frente de Loja (vitrine/balcão) via transferência interna valorada
- Horário de envio, quantidade por produto, lote de origem, custo unitário de aquisição interna
- Múltiplos envios ao longo do dia (ex: pão francês sai do forno às 6h, 10h e 16h)

#### 5.4.3 Controle de saída (vendas)

Nesta fase inicial, o módulo não é um PDV completo, mas registra as saídas para venda de forma a alimentar os KPIs.

- Registro de saída por produto (quantidade vendida)
- Períodos de registro configuráveis (por turno, por hora, ou consolidado ao fim do dia)
- Cálculo da taxa de saída: (vendido ÷ disponibilizado) × 100%
- Cálculo de margem da Frente de Loja: preço de venda − custo de aquisição interna (da transferência)
- Interface preparada para integração futura com sistema PDV (API REST)

#### 5.4.4 Devoluções

- Registro de devolução de cliente com campos:
  - Produto devolvido e quantidade
  - Motivo da devolução (categorizado):
    - Produto estragado/deteriorado
    - Corpo estranho
    - Sabor/textura diferente do esperado
    - Erro no pedido
    - Outro (campo livre)
  - Destino do produto devolvido: descarte, reaproveitamento (ver 5.4.5)
  - Lote de origem (para rastreabilidade)

#### 5.4.5 Sobras, reaproveitamento e descartes

Produtos não vendidos na Frente de Loja têm três destinos possíveis. O operador deve registrar a saída informando o motivo e o destino:

**Reaproveitamento (transferência interna para a Produção):**
- O produto sai da Frente de Loja como "venda interna" para a Produção
- Entra na Produção como insumo com custo — o custo é o custo original do produto (coerente com o modelo de setores como empresas)
- Exemplo: pão francês não vendido (custo R$ 0,35/un) volta para a Produção como insumo "pão seco". A Produção usa esse insumo para produzir "pão torrado", cuja ficha técnica inclui "pão seco" como ingrediente com custo R$ 0,35/un, somado aos demais custos de transformação
- A Frente de Loja reduz sua perda contábil: o item não é descarte, foi transferido com valor
- Gera uma transferência interna (Frente de Loja → Produção) com o custo registrado
- O operador confirma com PIN; o auxiliar de produção confirma o recebimento com PIN

**Descarte total:**
- Produto estragou, venceu ou foi devolvido pelo cliente sem condição de reaproveitamento
- Registrado como perda 100% — sai do estoque da Frente de Loja como prejuízo do setor
- Motivo obrigatório: produto estragado, prazo de validade vencido, devolução do cliente, dano físico, contaminado, ou outro (campo livre)
- Alimenta os KPIs de perda por categoria de motivo, por produto, por período e por setor

**Descarte parcial (recuperação de componentes):**
- O produto final não serve, mas partes dele podem ser reaproveitadas
- Exemplo: um bolo confeitado mofou por fora, mas o recheio interno ainda está bom e pode ser reaproveitado
- Operacionalmente: registra-se o descarte do produto original (perda) e uma entrada separada do componente recuperado como insumo para a Produção via transferência interna
- O custo do componente recuperado é proporcional e configurável (ex: se o bolo custou R$ 15 e o recheio representa 30% do custo, o recheio recuperado entra com custo de R$ 4,50)

#### 5.4.6 Fechamento do dia

- Consolidação automática: disponibilizado (recebido via transferências internas) − vendido − devolvido − descartado − reaproveitado = sobra residual
- Verificação de consistência (se os números batem)
- Apuração de resultado do setor: receita de vendas − custo de aquisição interna − perdas
- Geração de resumo do dia por unidade e por setor
- Aprovação do fechamento por supervisor (opcional, configurável)

### 5.5 Módulo de Expedição/Delivery (opcional)

Setor desativável. Quando ativo, separa a logística de entrega da operação de frente de loja.

#### 5.5.1 Recebimento de pedidos

- Recebe pedidos da Frente de Loja via transferência interna (Frente de Loja → Expedição)
- Lista de pedidos para separação e entrega
- Priorização por horário de entrega prometido

#### 5.5.2 Controle de entregas

- Registro de saída para entrega (entregador, horário, itens)
- Confirmação de entrega pelo entregador (com PIN)
- Registro de devoluções de entrega (produto voltou — motivo, destino)
- Rastreamento de status: separado, em rota, entregue, devolvido

#### 5.5.3 Quando desativado

- Os fluxos de entrega são absorvidos pela Frente de Loja
- A tela de expedição não aparece na navegação
- Pedidos com entrega são gerenciados diretamente pelo atendente

### 5.6 Módulo de Alertas e Notificações

#### 5.6.1 Tipos de alerta

| Alerta | Condição | Destinatários padrão |
|---|---|---|
| Estoque mínimo | Quantidade abaixo do ponto de reposição | Estoquista, comprador, supervisor de estoque |
| Validade próxima (insumo) | X dias antes do vencimento (configurável) | Estoquista, supervisor de produção |
| Validade próxima (produto acabado) | X horas antes do vencimento | Atendente, supervisor de frente de loja |
| Variação de preço | Preço de compra variou mais que X% | Comprador, supervisor administrativo |
| Manutenção programada | Equipamento com manutenção prevista para os próximos X dias | Supervisor de produção, administrador de unidade |
| Aproveitamento baixo | Ordem de produção com aproveitamento abaixo de X% | Supervisor de produção |
| Perda elevada na loja | Descarte do dia acima de X% do disponibilizado | Supervisor de frente de loja, administrador de unidade |
| Pedido de compra pendente | Pedido aguardando aprovação há mais de X horas | Aprovador |
| Solicitação urgente recebida | Nova solicitação com prioridade urgente ou reposição crítica | Auxiliar da estação, supervisor de produção |
| Solicitação atrasada | Solicitação não concluída até a data/hora de entrega | Atendente, supervisor de frente de loja |
| Custo em cascata alterado | Custo de insumo mudou, recalculando cadeia de fichas técnicas | Supervisor de produção, supervisor administrativo |
| Transferência pendente de confirmação | Transferência interna enviada mas não confirmada pelo setor de destino | Supervisor do setor de destino |

#### 5.6.2 Canais de notificação

- Notificação in-app (sino no header, badge de contagem)
- E-mail (para alertas críticos, configurável por usuário)
- Preparado para integração futura com WhatsApp Business API e push notifications

### 5.7 Módulo de Dashboard e KPIs

O dashboard é a tela inicial do sistema. Seu conteúdo se adapta ao papel, setor e permissões do usuário logado. Cada setor tem seu próprio dashboard com KPIs específicos, além do dashboard geral da unidade.

#### 5.7.1 KPIs do Setor de Estoque

- Valor total do estoque (por categoria: insumos de fornecedor, insumos produzidos, limpeza, utensílios, equipamentos)
- Itens abaixo do estoque mínimo (lista e contagem)
- Itens próximos do vencimento
- Giro de estoque por item (consumo ÷ estoque médio)
- Acuracidade do inventário (contagem física vs. registrado)
- Evolução do valor do estoque ao longo do tempo
- Volume e valor de transferências internas expedidas (para Produção)
- Volume e valor de insumos produzidos recebidos (da Produção)

#### 5.7.2 KPIs de Fornecedores

- Evolução de preço dos principais insumos
- Comparativo de preço entre fornecedores
- Ranking de fornecedores (por volume, por pontualidade, por avaliação)
- Valor total de compras por período

#### 5.7.3 KPIs do Setor de Produção

- Aproveitamento médio por produto e por operador
- Taxa de perda por categoria de motivo
- Custo de produção por produto (real vs. ficha técnica)
- Volume de produção diário/semanal/mensal (produtos finais e insumos intermediários separados)
- Produtividade por operador (quantidade produzida / tempo)
- Ranking de produtos mais produzidos
- Custo total de insumos "comprados" do Estoque vs. valor dos produtos "vendidos" para Frente de Loja (margem do setor)
- Volume e valor de insumos de reaproveitamento recebidos da Frente de Loja

#### 5.7.4 KPIs de Solicitações de Produção

- Tempo médio de atendimento por estação (do despacho à entrega)
- Volume de solicitações por prioridade (normal, urgente, reposição crítica)
- Taxa de atendimento completo vs. parcial vs. não produzido
- Solicitações atrasadas (não concluídas até a data/hora de entrega)
- Ranking de produtos mais solicitados
- Desempenho por auxiliar de produção (tempo de resposta, taxa de conclusão)

#### 5.7.5 KPIs do Setor de Frente de Loja

- Taxa de saída por produto (vendido ÷ disponibilizado)
- Taxa de descarte por produto e por motivo
- Taxa de reaproveitamento (sobras reaproveitadas ÷ total de sobras)
- Valor financeiro de perdas (descartes totais e parciais)
- Valor recuperado via reaproveitamento
- Produtos mais vendidos / menos vendidos
- Curva ABC de produtos
- Margem do setor: receita de vendas − custo de aquisição interna − perdas
- Comparativo entre produção planejada vs. produzida vs. vendida vs. descartada vs. reaproveitada

#### 5.7.6 KPIs de Transferências Internas

- Volume e valor total de transferências por fluxo (Estoque→Produção, Produção→Loja, Loja→Produção, etc.)
- Custo acumulado por cadeia (do fornecedor ao consumidor final)
- Transferências pendentes de confirmação
- Tempo médio entre envio e confirmação de recebimento por setor

#### 5.7.7 KPIs Gerenciais (consolidados)

- Custo total de produção vs. receita de vendas
- Margem de contribuição por produto (considerando cadeia completa de custos)
- Resultado por setor (receita − custo − perdas)
- Evolução de perdas totais (estoque + produção + loja), segmentáveis por setor e motivo
- Comparativo entre unidades (para multi-unidade)
- Comparativo entre setores da mesma unidade
- Tendências e projeções (baseadas em histórico)

#### 5.7.8 Gráficos

- Gráficos de linha para evolução temporal
- Gráficos de barra para comparativos (entre setores, entre unidades)
- Gráficos de pizza/donut para distribuições
- Gráficos de calor para padrões por dia da semana / hora
- Diagrama de Sankey para fluxo de custos entre setores
- Todos os gráficos com filtros de período, unidade e setor
- Exportação em PNG e dados em CSV/Excel

#### 5.7.9 Visibilidade por papel e setor

O dashboard exibe apenas os cards e gráficos para os quais o usuário tem permissão de `dashboard.kpi_*:ler`. Exemplos:

- Auxiliar de Produção: vê KPIs de produção e solicitações da sua estação
- Atendente: vê KPIs de frente de loja e status das solicitações que despachou
- Supervisor de Setor: vê todos os KPIs do seu setor
- Administrador de Unidade: vê todos os KPIs de todos os setores da sua unidade
- Administrador Geral: vê KPIs consolidados de todas as unidades com drill-down por setor

---

## 6. Offline-first e sincronização

### 6.1 Motivação

Ambientes de produção (cozinha, área de fornos) frequentemente têm conectividade instável. O sistema deve permitir que operações críticas sejam realizadas offline em tablets, com sincronização automática quando a conexão for restabelecida.

### 6.2 Operações offline

| Operação | Prioridade offline |
|---|---|
| Registrar produção (iniciar/finalizar ordem) | Alta |
| Confirmar recebimento de solicitação na estação (PIN) | Alta |
| Confirmar conclusão de produção na estação (PIN) | Alta |
| Confirmar recebimento de transferência interna (PIN) | Alta |
| Consultar fichas técnicas | Alta |
| Registrar saída de estoque para produção | Alta |
| Registrar envio para loja | Alta |
| Registrar vendas/saídas na loja | Alta |
| Registrar descarte/devolução/reaproveitamento | Alta |
| Consultar estoque atual | Média (última sincronização) |
| Registrar pedido de cliente na frente de loja | Média |
| Criar pedido de compra | Baixa |
| Acessar dashboard | Baixa |

### 6.3 Estratégia técnica

- Service Worker para cache de recursos estáticos e fichas técnicas
- IndexedDB no navegador para armazenamento local de dados pendentes
- Fila de sincronização com registro de timestamp de cada operação
- Confirmações por PIN offline: validação local contra hash armazenado no IndexedDB (sincronizado periodicamente), com marcação de "pendente de sincronização" até o servidor confirmar
- Transferências internas offline: registradas localmente com flag "pendente de confirmação remota"
- Resolução de conflitos por "last write wins" com merge inteligente para campos não conflitantes
- Indicador visual de status de conexão e pendências de sincronização
- Sincronização automática ao reconectar + botão manual de forçar sincronização

---

## 7. Requisitos não-funcionais

### 7.1 Performance

- Tempo de carregamento inicial: < 3 segundos (3G)
- Tempo de resposta de APIs: < 200ms (p95) para operações simples
- Recálculo de cadeia de custos em cascata: < 5 segundos (assíncrono via fila Redis, sem bloquear UI)
- Dashboard com cache Redis: < 500ms para renderização completa
- Suporte a 100+ usuários simultâneos por tenant sem degradação perceptível
- Paginação obrigatória em listagens (padrão: 25 itens/página)

### 7.2 Responsividade

- Breakpoints: mobile (< 768px), tablet (768px–1024px), desktop (> 1024px)
- Interface otimizada para tablets na produção e frente de loja (botões grandes, formulários simplificados)
- Dashboard responsivo com reorganização de cards em grid

### 7.3 Segurança

- HTTPS obrigatório (TLS 1.3 via Traefik + Let's Encrypt)
- Segredos gerenciados com SOPS (nunca em plain text no repositório)
- Sanitização de inputs (proteção contra SQL injection e XSS)
- Rate limiting por IP e por usuário
- PIN operacional com hash bcrypt e bloqueio após tentativas inválidas
- Registro de auditoria (quem fez o quê, quando, de qual IP, com qual método de autenticação, em qual setor)
- Backup diário automatizado com retenção configurável
- CORS configurado restritivamente
- Headers de segurança (CSP, HSTS, X-Frame-Options) via Traefik

### 7.4 Acessibilidade

- Contraste mínimo WCAG AA
- Navegação por teclado
- Labels em todos os campos de formulário
- Mensagens de erro claras e contextuais

### 7.5 Internacionalização

- Interface inicialmente em pt-BR
- Estrutura preparada para i18n (todas as strings em arquivos de tradução)
- Formatação de moeda, data e números conforme locale

---

## 8. Integrações futuras (preparar API)

O sistema deve ter APIs REST bem documentadas (OpenAPI/Swagger) que permitam integração futura com:

| Integração | Finalidade | Prioridade |
|---|---|---|
| Sistema PDV | Sincronização de vendas e estoque em tempo real | Alta (próxima fase) |
| WhatsApp Business API | Notificações e alertas críticos | Média |
| Contabilidade / ERP | Exportação de dados financeiros e transferências internas | Média |
| NF-e (nota fiscal eletrônica) | Emissão e consulta automatizada | Média |
| Marketplace / iFood | Pedidos online → produção → expedição | Baixa |

---

## 9. Modelo de dados (entidades principais)

### 9.1 Core

- **Tenant**: id, nome, slug, plano, status, created_at
- **Unidade**: id, tenant_id, nome, endereco, telefone, status, created_at
- **Setor**: id, unidade_id, tipo (estoque, producao, frente_loja, administrativo, expedicao), nome, ativo, created_at
- **Usuario**: id, tenant_id, nome, email, senha_hash, pin_hash, pin_tentativas_invalidas, pin_bloqueado_ate, setor_id, status, created_at
- **Papel**: id, tenant_id, nome, nivel_hierarquico (1-4, nullable para papéis customizados), descricao, is_default, created_at
- **Permissao**: id, recurso, acao, descricao
- **PapelPermissao**: papel_id, permissao_id
- **UsuarioPapel**: usuario_id, papel_id, unidade_id (null = todas), setor_id (null = todos), assigned_at
- **LogAuditoria**: id, tenant_id, usuario_id, setor_id, acao, recurso, recurso_id, metodo_autenticacao (login, pin), dados_anteriores (JSONB), dados_novos (JSONB), ip, dispositivo, solicitacao_id (nullable), transferencia_id (nullable), created_at

### 9.2 Transferências Internas

- **TransferenciaInterna**: id, unidade_id, numero (formato TI-AAAAMMDD-NNN), setor_origem_id, setor_destino_id, tipo (venda_interna, devolucao_interna, reaproveitamento), custo_total, status (enviado, recebido, cancelado), enviado_por, enviado_em, recebido_por, recebido_em, observacoes, created_at
- **ItemTransferencia**: id, transferencia_id, item_estoque_id (nullable), ficha_tecnica_id (nullable), lote_id (nullable), quantidade, custo_unitario, custo_total, observacoes

### 9.3 Estoque

- **ItemEstoque**: id, unidade_id, nome, categoria (insumo, insumo_produzido, limpeza, utensilio, equipamento), origem (fornecedor, producao, reaproveitamento), ficha_tecnica_id (nullable — para insumos produzidos), disponivel_para_venda (boolean — dupla natureza), unidade_medida, estoque_minimo, ponto_reposicao, localizacao, condicoes_armazenamento, status, created_at
- **LoteCompra**: id, item_estoque_id, fornecedor_id (nullable — null para insumos produzidos), nota_fiscal_id (nullable), transferencia_id (nullable — para entradas via transferência interna), quantidade, preco_unitario, data_validade, data_recebimento, lote_fornecedor, status
- **MovimentacaoEstoque**: id, item_estoque_id, lote_compra_id, tipo, quantidade, custo_unitario, custo_total, setor_origem_id, setor_destino_id, motivo, ordem_producao_id, transferencia_id, usuario_id, created_at
- **Inventario**: id, unidade_id, data, usuario_id, status (em_andamento, finalizado, aprovado)
- **ItemInventario**: id, inventario_id, item_estoque_id, quantidade_sistema, quantidade_contada, divergencia, justificativa

### 9.4 Fornecedores

- **Fornecedor**: id, tenant_id, razao_social, cnpj, contatos (JSONB), endereco, categorias, avaliacao, status, created_at
- **PedidoCompra**: id, unidade_id, fornecedor_id, status, valor_total, aprovado_por, data_aprovacao, created_at
- **ItemPedidoCompra**: id, pedido_id, item_estoque_id, quantidade, preco_unitario, quantidade_recebida
- **NotaFiscal**: id, pedido_compra_id, fornecedor_id, numero, serie, data_emissao, valor_total, arquivo_url, created_at
- **HistoricoPreco**: id, item_estoque_id, fornecedor_id, preco_unitario, data, nota_fiscal_id

### 9.5 Produção

- **EstacaoTrabalho**: id, unidade_id, setor_id, nome, auxiliar_id (usuario), tem_tablet, status (ativa, inativa, em_manutencao), created_at
- **EstacaoProdutoVinculado**: id, estacao_id, ficha_tecnica_id
- **FichaTecnica**: id, tenant_id, nome, tipo_saida (produto_final, insumo_intermediario), disponivel_para_venda (boolean — dupla natureza), categoria, rendimento, tempo_preparo_min, modo_preparo, prazo_validade_horas, condicoes_armazenamento, versao, status (rascunho, ativa, inativa), created_at
- **InsumoFichaTecnica**: id, ficha_tecnica_id, item_estoque_id, quantidade, classificacao (direto, indireto), origem_insumo (fornecedor, produzido, reaproveitamento), percentual_perda_natural
- **PedidoCliente**: id, unidade_id, ficha_tecnica_id, nome_cliente, quantidade, observacoes, data_entrega, status (pendente, despachado, em_producao, concluido, entregue, cancelado), created_at, registrado_por
- **SolicitacaoProducao**: id, unidade_id, estacao_id, numero (formato AAAAMMDD-NNN), prioridade (normal, urgente, reposicao_critica), observacoes, status (enviado, em_producao, concluido, entregue, cancelado), despachado_por, despachado_em, recebido_por, recebido_em, concluido_por, concluido_em, conferido_por, conferido_em, created_at
- **ItemSolicitacao**: id, solicitacao_id, pedido_cliente_id, quantidade_solicitada, quantidade_produzida, quantidade_conferida, resultado_conferencia (completo, parcial, nao_produzido), observacoes
- **OrdemProducao**: id, unidade_id, ficha_tecnica_id, solicitacao_id (nullable), tipo (produto_final, insumo_intermediario), destino (frente_loja, estoque_congelado, estoque_insumos), quantidade_planejada, quantidade_produzida, status, responsavel_id, iniciada_em, finalizada_em, aproveitamento_percentual, transferencia_saida_id (nullable), observacoes
- **ConsumoProducao**: id, ordem_producao_id, item_estoque_id, lote_compra_id, transferencia_entrada_id, quantidade_planejada, quantidade_real, custo_unitario, custo_total, classificacao
- **PerdaProducao**: id, ordem_producao_id, tipo (natural, erro_operacional, falha_equipamento, insumo_problema, outro), quantidade, custo_perda, descricao
- **Lote**: id, ordem_producao_id, codigo, tipo (produto_final, insumo_intermediario), destino, data_producao, data_validade, quantidade, custo_unitario, status, responsavel_id

### 9.6 Frente de Loja

- **EnvioLoja**: id, unidade_id, lote_id, transferencia_id, quantidade, custo_unitario, horario_envio, responsavel_id
- **SaidaVenda**: id, unidade_id, produto (ficha_tecnica_id), quantidade, preco_venda_unitario, custo_aquisicao_unitario, margem, periodo, created_at, responsavel_id
- **Devolucao**: id, unidade_id, ficha_tecnica_id, lote_id, quantidade, motivo_categoria, motivo_descricao, destino (descarte, reaproveitamento), created_at, responsavel_id
- **Descarte**: id, unidade_id, ficha_tecnica_id, lote_id, tipo (total, parcial), quantidade, motivo_categoria, motivo_descricao, custo_perda, transferencia_reaproveitamento_id (nullable — para descarte parcial com recuperação), created_at, responsavel_id
- **Reaproveitamento**: id, unidade_id, ficha_tecnica_origem_id, lote_id, quantidade, custo_unitario, custo_total, transferencia_id, item_estoque_destino_id, created_at, responsavel_id
- **FechamentoDia**: id, unidade_id, setor_id, data, total_disponibilizado, total_vendido, total_devolvido, total_descartado, total_reaproveitado, sobra, receita_vendas, custo_aquisicao, perda_financeira, resultado_setor, status, aprovado_por, created_at

### 9.7 Expedição (quando ativo)

- **PedidoEntrega**: id, unidade_id, transferencia_id, cliente, endereco, horario_prometido, entregador_id, status (separado, em_rota, entregue, devolvido), saida_em, entregue_em, observacoes, created_at
- **ItemPedidoEntrega**: id, pedido_entrega_id, ficha_tecnica_id, lote_id, quantidade

---

## 10. Requisitos de UI/UX

### 10.1 Princípios

- **Eficiência operacional**: mínimo de cliques para tarefas recorrentes (registrar produção, dar saída em estoque, confirmar transferências)
- **Clareza visual**: informações críticas (alertas, vencimentos, perdas, prioridade urgente, transferências pendentes) sempre visíveis
- **Consistência**: padrões de interação uniformes em todos os módulos e setores
- **Feedback imediato**: toda ação do usuário recebe confirmação visual
- **Adaptação ao contexto**: na produção (tablet), interface simplificada com botões grandes; na gestão (desktop), interface rica com gráficos e tabelas detalhadas

### 10.2 Layout geral

- Sidebar colapsável com navegação por módulos, agrupada por setor do usuário
- Header com: nome do usuário, papel ativo, setor, unidade selecionada, sino de notificações, indicador de conexão (online/offline)
- Breadcrumb para navegação contextual
- Ações principais sempre acessíveis (FAB no mobile/tablet)

### 10.3 Telas principais

| Tela | Tipo | Descrição |
|---|---|---|
| Dashboard geral | Desktop/tablet | Cards de KPIs + gráficos, configurável por papel e setor |
| Dashboard do setor | Desktop/tablet | KPIs específicos do setor do usuário |
| Lista de itens de estoque | Desktop/tablet | Tabela com filtros (incluindo insumos produzidos), busca, status visual |
| Ficha técnica (visualização) | Desktop/tablet | Receita com custo calculado, cadeia de custos, versão, insumos (de fornecedor, produzidos, reaproveitados) |
| Ficha técnica (edição) | Desktop | Formulário com lista dinâmica de insumos, classificação, origem, cálculo em tempo real, tipo de saída |
| Transferências internas | Desktop/tablet | Lista de transferências com filtros por setor, status, período |
| Registro de transferência | Tablet/desktop | Seleção de itens, quantidades, setor destino, confirmação com PIN |
| Registro de pedido de cliente | Tablet/desktop | Formulário rápido: cliente, produto, quantidade, data de entrega, observações |
| Fila de pedidos pendentes | Tablet/desktop | Lista de pedidos pendentes com seleção para despacho, filtro por produto/cliente |
| Despacho para estação | Tablet/desktop | Seleção de estação → carrinho de pedidos compatíveis → prioridade → confirmação por PIN |
| Acompanhamento de solicitações | Tablet/desktop | Painel em tempo real com status por estação, indicadores de prioridade e atraso |
| Recebimento na estação | Tablet | Lista de solicitações recebidas, botão de confirmar recebimento com PIN |
| Conclusão de produção | Tablet | Registro de quantidade produzida, seleção de destino, confirmação com PIN |
| Conferência na frente de loja | Tablet/desktop | Registro de resultado (completo/parcial/não produzido), confirmação com PIN |
| Ficha operacional (impressão) | Impressão | Gerada no despacho, layout otimizado para impressão |
| Gestão de estações | Desktop | CRUD de estações, vinculação de produtos e auxiliares, indicador de tablet |
| Registro de reaproveitamento | Tablet/desktop | Seleção do produto, quantidade, confirmação com PIN, transferência para Produção |
| Registro de descarte | Tablet/desktop | Produto, quantidade, tipo (total/parcial), motivo, componente recuperado (se parcial) |
| Ordem de produção (execução) | Tablet | Interface simplificada para iniciar, registrar quantidades, destino e finalizar |
| Frente de loja (vendas) | Tablet | Tela de saída rápida por produto com contadores +/- |
| Fechamento do dia | Tablet/desktop | Resumo consolidado por setor com resultado financeiro e aprovação |
| Painel de fornecedores | Desktop | Lista com gráficos de preço, histórico, pedidos |
| Gestão de papéis e permissões | Desktop | Matriz de permissões com checkboxes por recurso/ação, nível hierárquico |
| Gestão de unidades e setores | Desktop | Unidades com setores, ativação/desativação de Expedição |
| Painel de expedição | Tablet/desktop | Pedidos para entrega, status, confirmação com PIN |

### 10.4 Modal de confirmação por PIN

Componente reutilizado em todas as operações que exigem confirmação: transferências internas, transições de status do fluxo de solicitação, descartes, reaproveitamentos. Aparece como um diálogo modal sobreposto à tela atual.

**Conteúdo do modal:**
- Título indicando a ação (ex: "Confirmar transferência", "Confirmar despacho", "Confirmar recebimento", "Confirmar conclusão", "Confirmar descarte")
- Resumo da ação sendo confirmada (número da transferência/solicitação, setor, itens, custo total)
- Campo de entrada do PIN (numérico, com máscara de caracteres, teclado numérico no tablet)
- Botão de confirmar e botão de cancelar
- Mensagem de erro em caso de PIN inválido
- Indicador de tentativas restantes antes do bloqueio

---

## 11. Plano de sprints

O desenvolvimento está organizado em 18 sprints de 2 semanas (36 semanas / 9 meses), seguindo uma abordagem incremental onde cada sprint entrega funcionalidade testável.

### Sprint 0 — Fundação (semanas 1-2)

**Objetivo:** infraestrutura, configuração do projeto e ambiente de desenvolvimento pronto.

- Setup do repositório (monorepo com workspaces)
- Configuração do Docker Compose (5 containers: Traefik, frontend, backend, PostgreSQL, Redis)
- Configuração de volumes e persistência
- Setup do SOPS para gerenciamento de segredos
- Scaffold do projeto NestJS (estrutura modular, ESLint, Prettier, Jest)
- Scaffold do projeto Next.js (App Router, Tailwind CSS, ESLint)
- Configuração do TypeORM com PostgreSQL
- Pipeline de CI básico (lint + testes)
- Documentação de setup do ambiente de desenvolvimento

**Entregável:** ambiente de dev funcionando com `docker-compose up`, hot reload no front e back.

### Sprint 1 — Core: autenticação, multi-tenancy e setores (semanas 3-4)

**Objetivo:** sistema de autenticação funcional com PIN, base multi-tenant e estrutura de setores.

- Módulo de autenticação (registro, login, JWT + refresh token)
- Cadastro de usuário com campo de PIN (hash bcrypt, 4-6 dígitos)
- Service de validação de PIN (com controle de tentativas e bloqueio temporário)
- Middleware de multi-tenancy (schema-per-tenant)
- Entidades base: Tenant, Unidade, Setor, Usuario
- CRUD de setores por unidade (4 padrão + Expedição opcional)
- Vinculação de usuário a setor
- Guard de autenticação global no NestJS
- Tela de login (Next.js)
- Tela de registro de tenant (simplificada para MVP)
- Tela de cadastro de usuário com configuração de PIN e vinculação de setor
- Componente modal reutilizável de confirmação por PIN
- Seeds de dados para desenvolvimento
- Testes unitários do módulo de auth e validação de PIN

**Entregável:** login funcional, tenant com setores isolados, usuário autenticado com PIN.

### Sprint 2 — Core: papéis, permissões e hierarquia (semanas 5-6)

**Objetivo:** sistema RBAC completo com hierarquia de 4 níveis e escopo por setor.

- Entidades: Papel (com nivel_hierarquico), Permissao, PapelPermissao, UsuarioPapel (com setor_id)
- Service de autorização com checagem granular por nível, unidade e setor
- Guard de permissões no NestJS (decorator `@RequirePermission('estoque.insumo:criar')`)
- Papéis padrão pré-configurados nos 4 níveis (seed)
- Tela de gestão de papéis (criar, editar, clonar, definir nível hierárquico)
- Tela de matriz de permissões (checkboxes recurso × ação)
- Tela de atribuição de papéis a usuários (com escopo de unidade + setor)
- Log de auditoria (entidade + middleware de interceptação, incluindo setor_id, metodo_autenticacao, dispositivo)
- Testes unitários e de integração do RBAC

**Entregável:** RBAC completo com hierarquia de 4 níveis e escopo por setor.

### Sprint 3 — Estoque: cadastro, categorias e insumos produzidos (semanas 7-8)

**Objetivo:** gestão de itens de estoque com as 5 categorias (incluindo insumos produzidos).

- Entidades: ItemEstoque (com categoria insumo_produzido e flag disponivel_para_venda), LoteCompra
- CRUD de itens de estoque (insumos, insumos produzidos, limpeza, utensílios, equipamentos)
- Campos específicos por categoria
- Campo de dupla natureza para insumos produzidos (disponível como insumo e como produto para venda)
- Unidades de medida configuráveis
- Configuração de estoque mínimo e ponto de reposição
- Tela de listagem de estoque com filtros por categoria (incluindo insumos produzidos), busca, status visual
- Tela de cadastro/edição de item
- Tela de detalhes do item (com histórico de movimentações — preparar)

**Entregável:** cadastro completo de itens de estoque funcionando, incluindo insumos produzidos.

### Sprint 4 — Transferências internas e movimentações (semanas 9-10)

**Objetivo:** motor de transferências internas valoradas entre setores e movimentações de estoque.

- Entidades: TransferenciaInterna, ItemTransferencia, MovimentacaoEstoque (com campos de custo e setor)
- Motor de transferência interna com confirmação por PIN (envio e recebimento)
- Geração automática de número de transferência (TI-AAAAMMDD-NNN)
- Registro de todos os tipos de movimentação de estoque vinculados a transferências
- Cálculo automático de custo unitário e total por transferência
- Alertas de transferência pendente de confirmação
- Tela de registro de transferência (seleção de itens, quantidades, setor destino, PIN)
- Tela de listagem de transferências com filtros por setor, status, período
- Tela de confirmação de recebimento de transferência (PIN)
- Testes de integridade de saldo entre setores

**Entregável:** transferências internas valoradas funcionando entre todos os setores.

### Sprint 5 — Fornecedores (semanas 11-12)

**Objetivo:** gestão completa de fornecedores e compras.

- Entidades: Fornecedor, PedidoCompra, ItemPedidoCompra, NotaFiscal, HistoricoPreco
- CRUD de fornecedores
- Criação e gestão de pedidos de compra (com workflow de status)
- Upload e vinculação de notas fiscais
- Registro automático de histórico de preços a cada compra
- Entrada no Estoque ao receber pedido (gerando movimentação com custo)
- Tela de listagem de fornecedores
- Tela de detalhes do fornecedor (com histórico de compras e preços)
- Tela de pedidos de compra
- Tela de upload/consulta de notas fiscais

**Entregável:** ciclo completo de compra funcionando (pedido → recebimento → estoque com custo).

### Sprint 6 — Produção: fichas técnicas, estações e cadeia de custos (semanas 13-14)

**Objetivo:** fichas técnicas com suporte a insumos produzidos, cadeia de custos em cascata e estações de trabalho.

- Entidades: FichaTecnica (com tipo_saida e disponivel_para_venda), InsumoFichaTecnica (com origem_insumo), EstacaoTrabalho, EstacaoProdutoVinculado
- CRUD de fichas técnicas com versionamento e tipo de saída (produto final / insumo intermediário)
- Classificação de insumos (direto/indireto) e origem (fornecedor/produzido/reaproveitamento)
- Motor de cálculo de custo com cadeia em cascata (recálculo em profundidade quando custo de insumo muda)
- Job assíncrono (fila Redis) para propagação de custos em cascata
- Alerta de custo em cascata alterado
- Margem de contribuição quando preço de venda informado
- CRUD de estações de trabalho
- Tela de listagem de fichas técnicas (com filtro por tipo: produto final / insumo)
- Tela de criação/edição de ficha (formulário dinâmico, tipo de saída, dupla natureza)
- Tela de visualização de ficha (modo leitura com cadeia de custos visualizada)
- Tela de gestão de estações de trabalho

**Entregável:** fichas técnicas completas com cadeia de custos em cascata e estações configuradas.

### Sprint 7 — Produção: solicitações e fluxo com PIN (semanas 15-16)

**Objetivo:** fluxo completo de solicitação de produção com confirmações por PIN e ficha operacional.

- Entidades: PedidoCliente, SolicitacaoProducao, ItemSolicitacao
- Registro de pedido de cliente (frente de loja)
- Fila de pedidos pendentes com filtros
- Despacho para estação (carrinho de pedidos compatíveis, prioridade, confirmação por PIN)
- Geração automática de número de solicitação (AAAAMMDD-NNN)
- Geração automática da ficha operacional de produção (HTML para impressão)
- Recebimento na estação com confirmação por PIN (quando há tablet)
- Conclusão da produção com registro de quantidade, destino e confirmação por PIN
- Conferência na frente de loja com resultado e confirmação por PIN
- Geração automática de transferência interna na conclusão (Produção → destino)
- Registro de auditoria em cada transição de status
- Todas as telas do fluxo (registro, fila, despacho, acompanhamento, recebimento, conclusão, conferência, impressão)

**Entregável:** fluxo completo de solicitação com rastreabilidade por PIN e transferências internas.

### Sprint 8 — Produção: ordens, múltiplos destinos e rastreabilidade (semanas 17-18)

**Objetivo:** ordens de produção com suporte a insumos intermediários, múltiplos destinos e rastreabilidade.

- Entidades: OrdemProducao (com tipo e destino), ConsumoProducao (com custo), PerdaProducao (com custo_perda), Lote (com tipo e destino)
- Fluxo de ordem de produção (criar → iniciar → finalizar)
- Tipo da ordem: produto final ou insumo intermediário
- Seleção de destino na conclusão (Frente de Loja, Estoque congelado, Estoque de insumos)
- Requisição de insumos ao Estoque via transferência interna com custo
- Geração de transferência interna de saída na conclusão (Produção → destino)
- Registro de quantidade produzida, aproveitamento e perdas com custo
- Geração de lote com rastreabilidade completa (incluindo cadeia de insumos produzidos e reaproveitados)
- Devolução de insumos não utilizados ao Estoque (transferência reversa)
- Tela de ordens de produção (lista com filtros por tipo)
- Tela de execução de ordem (tablet — iniciar, registrar, destino, finalizar)
- Tela de detalhes do lote (rastreabilidade completa com cadeia de custos)

**Entregável:** produção com múltiplos destinos e rastreabilidade completa incluindo cadeia de custos.

### Sprint 9 — Frente de loja: vendas, reaproveitamento e descartes (semanas 19-20)

**Objetivo:** controle completo com reaproveitamento de sobras e modelo de setores como empresas.

- Entidades: EnvioLoja (com transferencia_id e custo), SaidaVenda (com custo_aquisicao e margem), Devolucao, Descarte (com tipo total/parcial), Reaproveitamento, FechamentoDia (com resultado_setor)
- Recebimento de produtos via transferência interna (Produção → Frente de Loja)
- Registro de saídas (vendas) com cálculo de margem do setor
- Registro de devoluções com destino (descarte ou reaproveitamento)
- Registro de reaproveitamento com transferência interna para Produção (Loja → Produção, com custo)
- Registro de descarte total (perda 100%)
- Registro de descarte parcial com recuperação de componentes (descarte + transferência interna do componente)
- Fechamento do dia com apuração de resultado do setor (receita − custo aquisição − perdas + reaproveitamento)
- Tela de frente de loja (tablet — saída rápida com contadores)
- Tela de registro de reaproveitamento (com confirmação por PIN)
- Tela de registro de descarte (total/parcial, motivo, componente recuperado)
- Tela de fechamento do dia (resumo por setor com resultado financeiro)

**Entregável:** frente de loja completa com reaproveitamento, descartes categorizados e resultado por setor.

### Sprint 10 — Dashboard: KPIs por setor e gráficos (semanas 21-22)

**Objetivo:** dashboard com KPIs por setor, transferências internas e visão consolidada.

- Service de agregação de KPIs com cache Redis, segmentado por setor
- KPIs do Setor de Estoque (valor, itens baixos, insumos produzidos, transferências expedidas)
- KPIs do Setor de Produção (aproveitamento, perdas, custo real vs. ficha, margem do setor, insumos de reaproveitamento)
- KPIs de Solicitações (tempo de atendimento, taxa de conclusão, prioridades, atrasos)
- KPIs do Setor de Frente de Loja (taxa de saída, descarte, reaproveitamento, margem, resultado)
- KPIs de Transferências Internas (volume, valor, tempo de confirmação, fluxo entre setores)
- KPIs Gerenciais (custo vs. receita, margem por produto com cadeia completa, resultado por setor, comparativo entre unidades)
- Gráficos com Chart.js (linha, barra, pizza, calor, Sankey para fluxo de custos)
- Filtros de período, unidade e setor
- Visibilidade condicional por permissão e setor do usuário
- Exportação de gráficos (PNG) e dados (CSV)

**Entregável:** dashboard completo com visão por setor e transferências internas.

### Sprint 11 — Planejamento de produção (semanas 23-24)

**Objetivo:** sugestão inteligente de produção e geração automática de ordens.

- Algoritmo de sugestão de produção (média móvel + dia da semana + sazonalidade)
- Sugestão inclui ordens de insumos intermediários necessários para o planejamento
- Verificação de disponibilidade de insumos (de fornecedor e produzidos)
- Geração automática de ordens a partir do planejamento (incluindo ordens de insumos intermediários)
- Sugestão automática de pedidos de compra quando insumos insuficientes
- Tela de planejamento do dia seguinte (sugestões editáveis)
- Tela de calendário de produção (visão semanal)
- Workflow de aprovação do planejamento configurável

**Entregável:** planejamento de produção com sugestões baseadas em dados, incluindo insumos intermediários.

### Sprint 12 — Expedição e gestão de unidades (semanas 25-26)

**Objetivo:** módulo de expedição opcional e gestão multi-unidade completa.

- Entidades: PedidoEntrega, ItemPedidoEntrega
- Ativação/desativação do setor de Expedição por unidade
- Fluxo de separação, despacho e confirmação de entrega (com PIN)
- Transferência interna (Frente de Loja → Expedição) para pedidos de entrega
- Registro de devoluções de entrega
- CRUD de unidades dentro do tenant
- Transferência de estoque entre unidades (com registro valorado)
- Dashboard consolidado multi-unidade
- Comparativo de desempenho entre unidades e entre setores
- Fichas técnicas compartilhadas vs. exclusivas por unidade
- Tela de gestão de unidades e setores (com ativação/desativação de Expedição)
- Tela de painel de expedição (tablet/desktop)

**Entregável:** expedição funcional (quando ativo) e gestão multi-unidade com visão consolidada.

### Sprint 13 — Offline-first (semanas 27-28)

**Objetivo:** operação offline em tablets para produção e frente de loja.

- Service Worker para cache de recursos estáticos
- Cache de fichas técnicas no IndexedDB
- Cache local de hashes de PIN para validação offline
- Fila de sincronização para operações offline (produção, estoque, vendas, transferências internas, confirmações por PIN)
- Transferências internas offline com flag "pendente de confirmação remota"
- Indicador visual de status de conexão
- Resolução de conflitos (last write wins + merge inteligente)
- Sincronização automática ao reconectar
- Botão de forçar sincronização
- Testes de cenários offline/online, incluindo fluxo de solicitação e transferências offline

**Entregável:** operações críticas funcionando offline com sincronização automática.

### Sprint 14 — Inventário e workflow de aprovação (semanas 29-30)

**Objetivo:** inventário físico e workflows configuráveis.

- Entidades: Inventario, ItemInventario
- Ferramenta de contagem física (interface tablet)
- Comparação automática sistema vs. contagem
- Relatório de divergências
- Aprovação de ajustes
- Workflow configurável de aprovação de pedidos de compra e transferências internas de alto valor
- Manutenção programada de equipamentos (agendamento + alertas)

**Entregável:** inventário completo e workflows de aprovação configuráveis.

### Sprint 15 — Notificações, e-mail e refinamentos (semanas 31-32)

**Objetivo:** sistema de notificações completo e polimento geral.

- Centro de notificações in-app (sino + lista)
- Configuração de notificações por usuário e por setor (quais alertas, quais canais)
- Envio de e-mails para alertas críticos (integração com serviço de e-mail)
- Alertas de solicitações (urgente, atrasada), transferências pendentes e cadeia de custos alterada
- Refinamentos de UI/UX baseados em feedback
- Otimização de performance (queries, cache, lazy loading, recálculo de custos em cascata)
- Tratamento de edge cases identificados
- Melhorias de acessibilidade

**Entregável:** notificações funcionais e sistema polido.

### Sprint 16 — Relatórios financeiros por setor (semanas 33-34)

**Objetivo:** relatórios de resultado por setor e análise de cadeia de custos.

- Relatório de resultado por setor (receita interna/externa − custos − perdas)
- Relatório de cadeia de custos: do fornecedor ao consumidor final, com cada etapa de transformação
- Relatório de transferências internas por período (volume, valor, fluxos)
- Relatório de reaproveitamento (valor recuperado, produtos mais reaproveitados)
- Relatório de perdas consolidado (por setor, por motivo, por produto)
- Exportação de relatórios em PDF e Excel
- Telas de relatórios com filtros avançados

**Entregável:** relatórios financeiros por setor e análise de cadeia de custos.

### Sprint 17 — Testes, segurança e documentação (semanas 35-36)

**Objetivo:** sistema pronto para produção.

- Testes end-to-end (Cypress ou Playwright) dos fluxos críticos (incluindo transferências internas, reaproveitamento, cadeia de custos, solicitação com PIN)
- Testes de carga (k6 ou Artillery)
- Revisão de segurança (headers, CORS, rate limiting, sanitização, robustez do PIN, isolamento de setores)
- Configuração de backup automatizado (pg_dump + cron)
- Documentação da API (Swagger/OpenAPI)
- Manual do usuário (guia rápido por papel e por setor)
- Runbook de operações (deploy, backup, restore, troubleshooting)
- Preparação do ambiente de produção

**Entregável:** sistema pronto para deploy em produção com documentação completa.

---

## 12. Critérios de aceitação globais

- Todo CRUD deve ter validação de campos no frontend e backend
- Toda operação sensível deve verificar permissões (incluindo nível hierárquico e escopo de setor)
- Toda transferência interna entre setores deve gerar registro valorado com confirmação por PIN nos dois lados
- Toda transição de status no fluxo de solicitação deve exigir confirmação por PIN e gerar registro de auditoria
- Toda alteração de dados deve gerar registro de auditoria com setor do usuário
- Todo endpoint deve ter teste unitário e/ou de integração
- Toda tela deve ser funcional em desktop e tablet
- Toda operação offline-critical deve funcionar sem conexão
- Todo alerta configurado deve disparar corretamente
- A cadeia de custos em cascata deve recalcular corretamente em qualquer profundidade
- Performance dentro dos limites definidos na seção 7.1

---

## 13. Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Complexidade do offline-first | Alta | Alto | Sprint dedicado, POC antecipado na Sprint 0, libs maduras (Workbox) |
| Performance do recálculo de custos em cascata | Média | Alto | Job assíncrono via fila Redis, cache de custos calculados, materialized views |
| Performance do dashboard com muitos dados | Média | Alto | Cache Redis agressivo, materialized views no PostgreSQL, paginação |
| Resolução de conflitos offline | Alta | Médio | Modelo de conflito simples (last write wins) + campos não conflitantes merge automático |
| Validação de PIN offline sem conexão ao servidor | Média | Médio | Cache local de hashes de PIN com sincronização periódica; flag "pendente de validação remota" |
| Complexidade do modelo de transferências internas | Média | Médio | Abstração no service layer, entidade TransferenciaInterna centralizada, testes extensivos de integridade financeira |
| Escopo crescente (feature creep) | Alta | Alto | PRD aprovado como baseline, mudanças via change request formal |
| Adoção pelo usuário operacional (padeiro) | Média | Alto | Interface tablet simplificada, fluxo de PIN rápido (4 dígitos), treinamento, feedback loop rápido |
| Estações sem tablet perdem visibilidade em tempo real | Média | Baixo | Ficha impressa como fallback, status atualizado na conclusão; incentivo a adoção gradual de tablets |

---

## 14. Métricas de sucesso do produto

- Redução de 20%+ no desperdício (descarte + perdas de produção) nos primeiros 3 meses de uso
- 90%+ de adoção pelos usuários operacionais (padeiros, atendentes) em 30 dias
- Acuracidade de estoque > 95% (contagem física vs. sistema)
- Tempo de fechamento do dia reduzido em 50%+
- Rastreabilidade completa de 100% dos lotes produzidos (incluindo cadeia de insumos produzidos)
- Tempo médio de atendimento de solicitações de produção visível e em queda contínua
- 95%+ das transições de status e transferências internas autenticadas por PIN (exceto estações sem tablet)
- Resultado por setor apurável diariamente com dados confiáveis
- Taxa de reaproveitamento de sobras > 0% (indicando uso do sistema para reduzir perdas)
- Cadeia de custos recalculada automaticamente em < 5 segundos após alteração de preço de insumo
