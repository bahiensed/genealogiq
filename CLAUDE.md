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

Last session: 12/05/2026 — Family Tree v3 + unified Notifications. Nova tabela `app_notifications` substitui o `getPendingTributeNotifications` derivado; tribute author agora recebe TRIBUTE_APPROVED / TRIBUTE_REJECTED no bell. FamilyRelation ganhou `status` (PENDING|ACCEPTED) e `requestedById`: adicionar APP_USER real cria pending; alvo aceita/recusa em `/family-requests`; nó renderiza acizentado enquanto pendente. Tree page: icon Network, stats reordenadas ("3 generations · 4/5 people · Need a bigger tree? Upgrade your plan"), background limpo (sem pontos), QuickAddOverlay removida — adicionar parentes só via header "+ Add relative" e quick-add no info sheet. Info sheet redesenhada: timeline vertical (Born/Married/Divorced/Died com ícones), edit button c/ helper "you can only edit own/memorials/ghosts", 4 quick-add buttons, footer "See profile →". Bug do duplo X corrigido (Sheet do shadcn já tem). Bug de timezone fixado via `formatLongDate`/`formatYear` com `timeZone: "UTC"`. ViewportControls: clicks agora não disparam pan (skip em button/a/input/[data-no-pan]); novo focusOn() na context + novo botão Maximize2 que centraliza no root no zoom máximo; fit-view virou ícone Crosshair. shortBio foi removido (DB + Prisma + Zod + dialog + info sheet + node).
In progress: —
Next: testar layout em casos diversos (grandparents, multiple marriages, sibling sem pai); polishes (animação no fit-view, ghost upload de avatar)
Blockers: aplicar a migration na Neon

### Design System — concluído ✅
- `src/styles/globals.css` — Liquid Glass design system (brand tokens, glass utilities, aurora keyframes)
- `src/components/aurora-backdrop.tsx` — Aurora blobs reutilizável
- `src/components/glass-icon.tsx` — GlassIcon tile (iPadOS 26 style)
- `public/` — assets copiados (tree-dark/light.png, logo-dark/light.png, mocks)

### Auth Pages — concluído ✅
- Todos os 5 forms redesenhados: glass-card form + tree logo (dark/light aware)
- `(auth)/layout.tsx` — AuroraBackdrop
- `verify-email-card.tsx` — tree logo acima do card

### Header + Home — concluído ✅
- `src/components/header.tsx` — notificações de tributos pendentes no sino (badge + dropdown); `BellNotification` como componente top-level
- `src/app/(protected)/layout.tsx` — busca `getPendingTributeNotifications` e passa para Header
- `src/components/profile-mini-card.tsx` — ProfileMiniCard com gradientes e badges
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

### Profile — concluído ✅
- `src/app/(protected)/profile/[id]/page.tsx` — QR code gerado server-side via `qrcode` package; 10 queries paralelas com dados reais
- `src/components/profile-banner.tsx` — coração visível também para guardiões; avatar com cor determinística
- `src/components/card-previews.tsx` — GalleryPreview/FavoritesPreview/GeoPreview/QrPreview com dados reais; FavoritesPreview sem subtitle; coord padrão -22.959167/-43.188333
- `src/lib/avatar-color.ts` — getAvatarColor / getAvatarGradient (hash determinístico do ID)
- `src/lib/profile.ts` — canManageProfile (own OR guardian)

### Edit Profile — concluído ✅
- `src/app/(protected)/profile/[id]/edit/page.tsx` — permite living (isOwn) E guardian (isGuardian); subtítulo "Edit profile."
- `src/components/memorial-edit-form.tsx` — avatarColor determinístico; ícone ImageIcon; botão "Save" sem ícone; permanece na página após salvar; AlertDialog "Delete profile" para memorializados; placeholders City/Family name
- `src/actions/memorial.ts` — deleteMemorial (cascade via Prisma); redireciona para /profile do guardião
- `src/actions/profile.ts` + `src/schemas/profile.ts` — updateProfile para living users (sem death fields)

### Biography — concluído ✅
- `src/app/(protected)/profile/[id]/bio/page.tsx` — NotebookText no empty state; NotebookPen nos botões; "biography" em todos os textos
- `src/app/(protected)/profile/[id]/bio/edit/page.tsx` — título "Write Biography" na criação
- `src/components/bio-edit-form.tsx` — MAX_QUOTE 128; placeholders atualizados; passa profileId para saveBio/deleteBio
- `src/actions/bio.ts` — saveBio(profileId, data) / deleteBio(profileId) com canManageProfile → guardiões podem salvar bio de memorializados

### Gallery — concluído ✅
- `src/components/gallery-client.tsx` — ícone ImageIcon no empty state
- Queries: getGalleryImageUrls / getGalleryCount para card previews

### Tributes — concluído ✅
- `src/actions/tribute.ts` — approveTribute/rejectTribute usam canManageProfile → guardiões podem moderar
- `src/queries/tribute.ts` — getPendingTributeNotifications (agrega pending de todos os perfis gerenciados)
- `src/components/tributes-client.tsx` — removido botão "Moderate" (notificação migrada para header bell)
- `src/app/(protected)/profile/[id]/tributes/page.tsx` — removidos pendingCount e canModerate do TributesClient

### Geolocation — concluído ✅
- `src/actions/geolocation.ts` — saveGeolocation/deleteGeolocation usam canManageProfile → guardiões podem editar
- `src/schemas/geolocation.ts` — notes max 512
- `src/components/geolocation-edit-form.tsx` — MAX_NOTES 512

### Memorialized — concluído ✅
- `src/components/memorial-create-form.tsx` — initials "GQ" quando vazio; placeholders Name/Family name/City
- `src/app/(protected)/profile/[id]/memorialized/new/page.tsx` — max 2 memoriais por user

### Shared DB note
BMS, SEQ e APP compartilham o mesmo banco. Roles APP_USER e APP_MEMO foram adicionados ao enum Role do schema.

### Padrão de autorização para guardiões
- `canManageProfile(profile, userId)` — `profile.id === userId || profile.createdById === userId`
- **Todas as actions de escrita** (bio, geolocation, tribute moderate, memorial update/delete) devem usar este helper
- `isExactOwn = id === session.user.id` — usado apenas para impedir que o próprio dono escreva tributo para si

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

# vercel blob
BLOB_READ_WRITE_TOKEN=

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
| Ao finalizar tarefa | Criar commit semântico com mensagem descritiva |

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