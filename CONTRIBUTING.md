# Contributing to inference-sandbox

Thank you for your interest in contributing.

## Local development setup

**Prerequisites:** Node.js 20+, pnpm 9+

```bash
git clone https://github.com/MyLightIsOn/inference-sandbox.git
cd inference-sandbox
pnpm install
pnpm dev        # starts dev server on localhost:3000
```

**Optional:** add `.env.local` with Supabase credentials for persistence features.
See `.env.local.example`.

## Running tests

```bash
pnpm test          # run all unit tests once
pnpm test:watch    # run in watch mode during development
pnpm typecheck     # TypeScript type checking
pnpm lint          # ESLint
```

## Project structure

```
app/             Next.js App Router pages and layouts
components/      React UI components
lib/             Business logic (execution engine, providers, utilities)
types/           TypeScript type definitions
docs/            Documentation and planning specs
```

Key files to understand before contributing:
- `lib/execution/parallel-runner.ts` — DAG execution engine
- `lib/providers/base.ts` — LLM provider interface
- `types/graph.ts` — node and edge types
- `CLAUDE.md` — developer guidance (AI-assisted context)

## Making changes

1. Fork the repo and create a branch: `git checkout -b feat/your-feature`
2. Write tests for new logic in `lib/` (see existing tests in `tests/`)
3. Keep components small and focused — if a component file exceeds ~150 lines, consider splitting
4. Run `pnpm test && pnpm typecheck && pnpm lint` before opening a PR
5. Open a PR against `main` with a clear description of what and why

## Commit style

Use conventional commit prefixes:
- `feat:` new feature
- `fix:` bug fix
- `chore:` tooling, deps, config
- `docs:` documentation
- `test:` tests only
- `refactor:` code change with no behavior change

## Adding a workflow template

Templates live in `templates/`. Each template is a JSON file following the workflow format documented in `docs/flow-format.md`. A full submission guide will be added in Phase 4.

## Code of conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
