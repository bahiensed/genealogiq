# PROJECT: Genealogiq App

## STACK
```
Backend: Node.js v24.14.0 + TypeScript v5
Database: Neon + PostgreSQL + Prisma 7 (shared DB with BMS and SEQ)
Frontend: React 19 + Next.js v16.2 + Tailwind CSS v4 + shadcn v4.3
Auth: next-auth v5 (beta) — Credentials provider, split edge/full config
Email: Resend
Deploy: Vercel
Tests: N/A
```

## PROJECT STRUCTURE
```
src/
├── actions/
├── app/
    ├── (auth)/
    ├── (landingpage)/
    ├── (protected)/
    └── api/
├── components/
├── consts/
├── hooks/
├── lib/
├── queries/
└── schemas/
```

## ARCHITECTURE RULES
- Pattern: Server Components por padrão → 'use client' APENAS quando precisa de interatividade
- Data fetching: Server Components usam Prisma diretamente, NUNCA em Client Components
- Mutations: Server Actions com Zod validation
- Zod schemas under src/schemas folder
- ALWAYS use `revalidatePath` ou `revalidateTag` após mutations
- ALWAYS create auxiliary functions in a external lib file
- In Next.js v16 Middleware file is now proxy.ts in the root of the project
```

## ROUTING TABLE
*Quando você encontrar um desses triggers, tome a ação correspondente:*

| Trigger | Action |
|---------|--------|
| New endpoint needed | Create page, component, action, query, zod schema, prisma model |
| Performance issue | Check N+1 queries, bundle size, etc. |
| Auth issue | Check proxy.ts |

## CURRENT STATE
*Atualize esta seção ao final de cada sessão*

Last session: 21/04/2026 — Fase 4 completa: Bio page (view + edit + Vercel Blob upload)
In progress: —
Next: Fase 5 — Gallery (Vercel Blob)
Blockers: —

### Design System — concluído ✅
- `src/styles/globals.css` — Liquid Glass design system (brand tokens, glass utilities, aurora keyframes)
- `src/components/aurora-backdrop.tsx` — Aurora blobs reutilizável
- `src/components/glass-icon.tsx` — GlassIcon tile (iPadOS 26 style)
- `public/` — assets copiados (tree-dark/light.png, logo-dark/light.png, mocks)

### Auth Pages — concluído ✅
- Todos os 5 forms redesenhados: glass-card form + tree logo (dark/light aware)
- `(auth)/layout.tsx` — AuroraBackdrop

### Header + Home — concluído ✅
- `src/components/header.tsx` — glass-strong, theme toggle, user dropdown, logout
- `src/components/profile-mini-card.tsx` — ProfileMiniCard com gradientes e badges
- `src/app/(protected)/layout.tsx` — inclui Header com dados reais da sessão
- `src/app/(protected)/home/page.tsx` — Server Component: saudação por hora + empty states

### Auth — concluído ✅
- `src/auth.ts` + `src/auth.config.ts` + `src/proxy.ts`
- `src/lib/prisma.ts` + `src/lib/auth.ts` (Zod schemas) + `src/lib/dal.ts` + `src/lib/email.ts`
- `src/types/next-auth.d.ts`
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/actions/auth.ts` — login, signUp, forgotPassword, resetPassword, changePassword, requestEmailChange, deleteAccount, logout
- Páginas: (auth)/sign-in, sign-up, forgot-password, reset-password, verify-email; (protected)/layout
- Componentes: sign-in-form, sign-up-form, forgot-password-form, reset-password-form, verify-email-card, change-email-dialog, change-password-dialog, delete-account-dialog
- Fluxo APP: auto-cadastro → verificação de e-mail → login

### Shared DB note
BMS, SEQ e APP compartilham o mesmo banco. Roles APP_USER e APP_MEMO foram adicionados ao enum Role do schema.

## MANDATORY RULES
1. Antes de adicionar qualquer endpoint → criar schema Zod de validação PRIMEIRO
2. Antes de fazer qualquer mudança no banco → verificar se existe migração pendente
3. Use shadcn component if available
4. Comments, variable, constant and function names in English
5. All UI content such as labels, placeholders, titles, buttons in English

## FORBIDDEN
- NEVER use `any` in TypeScript without comment explaining why
- NEVER skip input validation
- NEVER commit .env files (use .env.example)
- NEVER log passwords, tokens, or PII

## QUALITY GATES
*Checklist obrigatório antes de considerar qualquer tarefa concluída:*

□ `npx tsc --noEmit` — 0 errors
□ `npm test` — all tests pass
□ `npm run lint` — 0 errors

## ENV VARS
```env
# urls
APP_URL=
BMS_URL=
SEQUOIA_URL=

# prisma
DATABASE_URL=

# auth
AUTH_URL=
AUTH_SECRET=

# resend
RESEND_API_KEY=
```

## HOOKS
*Ações que o Claude deve executar automaticamente em certas situações:*

| Trigger | Ação Automática |
|---------|----------------|
| Antes de criar endpoint | Gerar schema Zod de validação primeiro |
| Antes de merge mental | Rodar Quality Gates e listar violações |
| Quando encontrar bug | Documentar causa, fix e prevenção no CURRENT STATE |
| Ao criar novo componente | Verificar se existe similar antes de criar |
| Ao finalizar tarefa | Atualizar CURRENT STATE com progresso |

## COMMANDS
*Atalhos para tarefas repetitivas — digite o nome e Claude executa:*

```
/review → Analise todos os arquivos alterados nesta sessão. Liste cada violação de CLAUDE.md. Sugira fix para cada uma.

/status → Leia CURRENT STATE e responda: (1) o que está pronto, (2) o que está em andamento, (3) blockers, (4) prioridade recomendada para hoje.

/test → Execute `npm test`. Se falhar, analise o erro, proponha fix, e re-execute. Repita até verde.

/deploy-check → Execute TODOS os Quality Gates. Se algum falhar, liste os itens pendentes e ofereça fix automático.

/refactor [arquivo] → Analise o arquivo contra as Architecture Rules. Proponha refatorações alinhadas ao pattern do projeto.
```

## PERSONA
*Opcional — define o "tom" do Claude para este projeto:*

```
Você é um senior software engineer na equipe de Genealogiq.
Estilo: direto, sem rodeios, código > explicações longas.
Quando em dúvida, pergunte antes de assumir.
Quando completar uma tarefa, mostre o diff e pergunte se pode continuar.
```


---
*Claude Code Elite — Pack CLAUDE.md | Atualizado em: 20/04/2026*