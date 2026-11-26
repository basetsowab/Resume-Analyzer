# AI Resume Analyzer

Paste a resume and get an AI-powered analysis: overall score, section scores, strengths, weaknesses, suggestions, and keywords.

It also includes a **HackerRank Score** page that runs [HackerRank's open-source hiring agent](https://github.com/interviewstreet/hiring-agent) on an uploaded resume PDF: it extracts the resume, checks the candidate's GitHub projects, and scores them against a role rubric.

The **ATS Grade** page grades a resume (PDF, Word .docx, or pasted text) A–F against a standard one-page ATS resume template. It checks the contact line, the four standard sections and their order, action-verb and quantified bullets, personal pronouns, "Month Year – Month Year" dates, leftover template text, and one-page length, then lists the top fixes and the weakest bullets. It is rule-based, so it needs no API key. The blank template can be downloaded from the page.

## Stack

- pnpm workspace monorepo, TypeScript 5.9, Node.js 24
- **Frontend**: React + Vite (`artifacts/resume-analyzer`)
- **API**: Express 5 (`artifacts/api-server`), served under `/api`
- **Database**: PostgreSQL + Drizzle ORM (`lib/db`, table `resumes`)
- **Validation / codegen**: Zod, Orval from the OpenAPI spec in `lib/api-spec`
- **AI**: OpenAI (`lib/integrations-openai-ai-server`)
- **HackerRank scorer**: Python + FastAPI service in `services/hiring-agent` (MIT licensed, from interviewstreet/hiring-agent), proxied by the API at `/api/hackerrank/*`

## Setup

```bash
pnpm install
cp .env.example .env   # fill in DATABASE_URL and OPENAI_API_KEY
pnpm --filter @workspace/db run push
```

### HackerRank scorer (Python 3.11+)

```bash
cd services/hiring-agent
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # set OPENAI_API_KEY (default model is gpt-5.2)
```

## Run locally

```bash
# API server on :8080
PORT=8080 pnpm --filter @workspace/api-server run dev

# HackerRank scorer on :8000 (from services/hiring-agent with its venv active)
uvicorn api:app --port 8000

# Frontend on :3000 (proxies /api to :8080)
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/resume-analyzer run dev
```

## Commands

- `pnpm run typecheck` — typecheck all packages
- `pnpm run build` — typecheck and build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas
