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

Last session: 16/05/2026 — Family Tree layout v1 rewrite + co-guardianship workflow.

**Layout rewrite (Buchheim-inspired, family-unit blocks)** — jogamos fora o `layout.ts` antigo (heurísticas ad-hoc, 4 rounds de patch). Novo pipeline em `src/components/family-tree/canvas/layout/`:
- `family-units.ts` → graph com `units`, `birthUnit`, `marriageUnit` (active), `marriageUnits` (lista cronológica completa), `spouseOf`, `siblingsOf` (deriva de birthUnit compartilhado + SIBLING relations explícitas), `spouseSubtype`.
- `index.ts` → recursive block-based layout. Subject's descendant subtree + sibling row (older esquerda, younger direita) + parents couple block + ancestors going up. Cada FamilyUnit é bloco rígido — nunca ordena across boundary, então tia 1944 não invade lado materno.
- Extras: gen=-1 tias/tios renderizadas com descendant subtree completa (cousins aparecem em gen=0); gen<=-2 great-aunts/uncles renderizadas como couple slots (sem descendentes — manter compacto). Determinado por sinal de x (paternal=left, maternal=right).
- Multi-marriage + half-siblings: `layoutHalfMarriageBlock(otherSpouseId, unit, gen)` builda spouse + descendant subtree de cada filho, centrado no spouse. Subject e parents (gen=0 e gen=-1) renderizam casamentos não-primary como half-blocks adjacentes ao lado oposto do primary spouse. Deeper levels ainda usam só active marriage.

**Auto-link em addGhostRelative** — sibling herda PARENT_OF dos pais do âncora; child herda spouse ativo do âncora como segundo pai; parent herda siblings do âncora como filhos extras. Idempotente via try/catch no unique constraint.

**Co-guardianship workflow (per-profile guardian model, convenção WikiTree/Geni)**:
- `AppUserGuardian.status` (PENDING/ACCEPTED, default ACCEPTED — linhas antigas preservadas) + `requestedById`.
- `NotificationType` ganhou GUARDIAN_REQUEST_PENDING/ACCEPTED/REJECTED + `Notification.appUserGuardianId`.
- `src/actions/guardian.ts`: `requestGuardianship({profileId})` (só ghosts/memorials), `approveGuardianship`, `rejectGuardianship`. Cada action notifica a contraparte.
- `canManageProfile` + todos os readers de `guardedBy` (queries de profile/memorial/notifications, actions de tribute/auth/memorial) agora filtram `status: "ACCEPTED"` — rows PENDING não dão acesso silenciosamente.
- UI: messages page mostra co-management requests em "Pending action" + entries GUARDIAN_REQUEST_* em Recent activity. Info-sheet ganhou linha "Co-manage" pra ghosts/memorials que o usuário não gerencia (vira "Pending" enquanto aguarda). Tree page query passa `managedIds`/`requestedIds` pra canvas via array.
- Bônus auto-link: aceitar SIBLING dispara PENDING guardian request automático em cada parent ghost/memorial do convidante.

**V2 backlog** (memorizado): visual styles por subtype (linhas tracejadas pra meio-irmãos, pontilhadas pra adoção), descendentes opcionais de extras profundos sob demanda, mini-map + lazy/foldable subtrees, drag-to-tune offsets manuais.

In progress: —
Next: testar fluxo end-to-end de co-guardianship (request → notification → approve → edit liberado); testar layouts em casos extremos (3+ marriages, half-siblings com avós conhecidos).
Blockers: —

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
*Claude Code Elite — Pack CLAUDE.md | Atualizado em: 16/05/2026*