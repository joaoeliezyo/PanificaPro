# PanificaPro

Sistema web SaaS de gerenciamento integrado para padarias, cobrindo estoque, fornecedores, produção, fichas técnicas e frente de loja. O sistema utiliza o modelo "cada setor é uma empresa" com transferências internas valoradas.

## 🚀 Status do Projeto
- **Sprint 0 (Fundação)**: ✅ Concluída
- **Sprint 1 (Core)**: 📅 Em planejamento

## 🛠️ Stack Tecnológica

- **Monorepo**: npm Workspaces
- **Frontend**: [Next.js 14+](https://nextjs.org/) (React, Tailwind CSS, App Router)
- **Backend**: [NestJS](https://nestjs.com/) (Node.js, TypeORM)
- **Banco de Dados**: [PostgreSQL 16](https://www.postgresql.org/) (Isolamento schema-per-tenant)
- **Cache & Filas**: [Redis 7](https://redis.io/)
- **Proxy Reverso**: [Traefik v3](https://traefik.io/)
- **Infraestrutura**: Docker & Docker Compose
- **Segredos**: Mozilla SOPS (Age)
- **CI/CD**: GitHub Actions

## 📁 Estrutura do Projeto

```text
.
├── apps/
│   ├── frontend/          # Aplicação Next.js (Tailwind, App Router)
│   └── backend/           # API NestJS (Modular Monolith)
├── packages/
│   └── shared/            # Enums, Types e DTOs compartilhados
├── docker/                # Dockerfiles e configs de infra
├── storage/               # Uploads e logs locais (ignorado pelo Git)
├── backups/               # Dumps do banco de dados
└── .github/workflows/     # Pipelines de CI (Lint/Testes)
```

## ⚙️ Configuração do Ambiente

### Pré-requisitos
- Node.js 20+
- Docker & Docker Compose V2
- npm 9+

### Instalação

1.  **Clonar o repositório:**
    ```bash
    git clone https://github.com/seu-usuario/panificapro.git
    cd panificapro
    ```

2.  **Configurar variáveis de ambiente:**
    ```bash
    cp .env.example .env
    ```
    *Ajuste as chaves secretas no arquivo `.env` se necessário.*

3.  **Instalar dependências:**
    ```bash
    npm install
    ```

4.  **Subir a infraestrutura (Docker):**
    ```bash
    docker compose up -d
    ```

### Comandos Úteis

- **Rodar Frontend (Dev)**: `npm run dev --workspace=@panificapro/frontend`
- **Rodar Backend (Dev)**: `npm run dev --workspace=@panificapro/backend`
- **Lint em todo o projeto**: `npm run lint`
- **Build de produção**: `npm run build`

## 🛡️ Segurança e Segredos
O projeto utiliza o **Mozilla SOPS** para criptografar arquivos de segredos. Certifique-se de ter a chave `age` configurada conforme descrito no arquivo `.sops.yaml` antes de realizar commits em arquivos `.enc.env`.

## 📄 Licença
Este projeto é privado e de uso restrito.
