# AI Resume Analyzer

Paste a resume and get an AI-powered analysis: overall score, section scores, strengths, weaknesses, suggestions, and keywords.

## Stack

- pnpm workspace monorepo, TypeScript 5.9, Node.js 24
- **Frontend**: React + Vite (`artifacts/resume-analyzer`)
- **API**: Express 5 (`artifacts/api-server`), served under `/api`
- **Database**: PostgreSQL + Drizzle ORM (`lib/db`, table `resumes`)
- **Validation / codegen**: Zod, Orval from the OpenAPI spec in `lib/api-spec`
- **AI**: OpenAI (`lib/integrations-openai-ai-server`)

## Setup

```bash
pnpm install
cp .env.example .env   # fill in DATABASE_URL and OPENAI_API_KEY
pnpm --filter @workspace/db run push
```

## Run locally

```bash
# API server on :8080
PORT=8080 pnpm --filter @workspace/api-server run dev

# Frontend on :3000
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/resume-analyzer run dev
```

## Commands

- `pnpm run typecheck` — typecheck all packages
- `pnpm run build` — typecheck and build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas
