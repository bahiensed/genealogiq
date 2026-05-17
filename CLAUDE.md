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

Last session: 16/05/2026 — BIG REVIEW Fase 3: SEQ Stripe real pra QR Packages (mock killed).

**Fase 3 entregue (SEQ Stripe real one-time + sync BMS):**
- Schema (3 repos sincronizados):
  - `Package` ganha `stripeProductId` + `stripePriceId` (ambos `String? @unique`)
  - `Tenant` ganha `stripeCustomerId` (`String? @unique`) — **um Stripe Customer por funerária**, billing consolidado
  - `Sale` ganha `stripeSessionId` (`String? @unique`, idempotency defensiva) + `stripePaymentIntentId`
  - SEQ schema também ganhou `StripeEvent` model (estava só em APP/BMS; tabela existia desde Fase 2 mas SEQ schema não declarava — webhook precisava). Sem migration nova pra essa adição (DDL já existia).
- Migration: `20260518000000_seq_stripe_packages/migration.sql` em SEQ — idempotente (IF NOT EXISTS), aplicada com `prisma migrate deploy` ✅
- SEQ novos arquivos:
  - `src/lib/stripe.ts` — lazy `Stripe` proxy (copy do padrão APP/BMS)
  - `src/lib/billing.ts` — `ensureTenantStripeCustomer(tenantId)` (cria customer com tenant.email/tradeName, metadata `{ tenantId }`) + `applyCheckoutSession(session, ctx)` (wrap em `$transaction`, Sale create + QrInventory upsert atômicos, P2002 no Sale = early return idempotente)
  - `src/app/api/stripe/webhook/route.ts` — endpoint idempotente (`StripeEvent` PK = event.id, P2002 → 200 `{ duplicate: true }`). Eventos: `checkout.session.completed`, `checkout.session.async_payment_succeeded`. Filtra `mode === "payment"` + `payment_status === "paid"` antes de aplicar.
  - `prisma/seed-stripe-packages.ts` — espelha APP `seed-stripe.ts`. `npx tsx prisma/seed-stripe-packages.ts` cria Stripe Product+Price (USD, one-time) pra cada `Package where isActive: true AND price > 0`.
  - `src/components/purchasing/purchase-status-toast.tsx` — client component em `<Suspense>` que lê `?status=success|cancel`, toast + `router.replace('/purchasing/packages')`.
- SEQ rewrites:
  - `src/actions/checkout.actions.ts:createPackageCheckoutSession` — agora chama Stripe Checkout real (`mode: "payment"`, `customer` do tenant, `metadata: { tenantId, packageId, quantity, soldById }`, `success_url`/`cancel_url` apontam pra `/purchasing/packages?status=...`). Falha cedo com mensagem clara se `package.stripePriceId` é null ("Run prisma/seed-stripe-packages.ts.").
  - `src/app/(protected)/purchasing/packages/page.tsx` — embute `<PurchaseStatusToast />`.
- SEQ deletados:
  - `src/app/(protected)/stripe-mock/` (page + dir inteiro)
  - `src/components/stripe-mock-content.tsx`
  - `src/actions/purchase.actions.ts` (mock-only — fluxo real cria Sale no webhook)
- BMS rewrites:
  - `src/queries/packages.ts:getPackage` — agora seleciona `stripeProductId` + `stripePriceId`
  - `src/components/packages/package-form.tsx` — nova prop `stripeProductId`/`stripePriceId`; bloco "Stripe sync" abaixo da description com badge Synced/Not synced + IDs em monospace
  - `src/app/(protected)/(records)/packages/[id]/page.tsx` — passa IDs Stripe pro form
  - `src/actions/package.actions.ts:updatePackage` — se `data.price !== current.price` AND `current.stripePriceId !== null`, **nullifica `stripeProductId` + `stripePriceId`** (Stripe Prices são immutable). Mensagem de sucesso instrui re-rodar seed. Próxima compra falha com mensagem clara até seed re-rodar.
- SEQ env: `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` adicionados a `.env` e `.env.example` (valores vazios — user preenche local + Vercel prod). BMS continua só com `STRIPE_SECRET_KEY` (não hospeda webhook).
- Dep nova em SEQ: `stripe@^22.1.1` (match APP/BMS).
- Verificação: `tsc --noEmit` ✅ nos 3 apps. `prisma generate` ✅. Lint baseline mantido (errors pré-existentes em data-table, proxy, privacy/terms pages — nenhum nos arquivos novos/modificados).

**Pendências operacionais (não-código, user faz):**
- Adicionar `STRIPE_SECRET_KEY` real (test mode) em SEQ `.env` local
- Criar Stripe webhook endpoint apontando pra `https://sequoia.rip/api/stripe/webhook` em prod; copiar signing secret pra `STRIPE_WEBHOOK_SECRET` (dev: `stripe listen --forward-to localhost:3002/api/stripe/webhook`)
- Rodar `npx tsx prisma/seed-stripe-packages.ts` em dev pra provisionar packages existentes
- Adicionar `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` no Vercel prod do SEQ
- **Decisão currency**: seed atual usa USD. Se BR-focused, mudar pra BRL antes de rodar seed em prod (Stripe Prices são immutable — não tem "switch later")

**Convenção Stripe Customer model (Fase 3)**: SEQ vendor flow → `Tenant.stripeCustomerId`. APP subscription flow → `AppUser.stripeCustomerId` (já existia). Dois universos de customers vivem na mesma DB sem conflito porque metadata `{ tenantId }` vs `{ appUserId }` discrimina.

---

Previous session: 16/05/2026 — BIG REVIEW Fase 2: DB schema reconciliation + indexes + dead code drop.

**Fase 2 entregue (DB schema + migrations):**
- 4 migrations idempotentes em SEQ (com IF NOT EXISTS / IF EXISTS):
  - `20260517000000_align_app_sale_stripe`: AppSale ganha colunas Stripe (NULLABLE) + StripeEvent table + AppUser.stripeCustomerId. Valor/tenantId/soldById também NULLABLE → SEQ vendor sales e APP Stripe sales coexistem.
  - `20260517010000_relax_token_user_id`: PasswordResetToken/EmailToken.user_id viram nullable + ganham app_user_id FK. Inclui DELETE de orphan rows antes do FK (havia 1+ orphan em `password_reset_tokens` apontando pra AppUser deletado).
  - `20260517020000_hot_indexes`: 4 indexes faltando — `app_bio_images.bio_id`, `app_users.tenant_id`, `app_tributes.app_author_id`, `app_notifications.app_user_guardian_id`.
  - `20260517030000_drop_dead_seq_fields`: dropa `users.created_by_id/updated_by_id` (zero usage) + redundant global `suppliers_tax_id_key` constraint (scoped `@@unique([tenant_id, tax_id])` permanece).
- Schema sync nos 3 repos:
  - **SEQ**: AppSale com Stripe fields; AppUserGuardian com status+requestedById; AppUser com stripeCustomerId + @@index([tenantId]); drop @unique de appSaleId; novos @@index. Drop createdById/updatedById em User. EmailToken.user_id nullable + appUserId.
  - **APP**: AppSale Stripe fields → NULLABLE (era NOT NULL); novos @@index em BioImage/AppUser/Tribute/Notification/AppUserGuardian.
  - **BMS**: EmailToken/PasswordResetToken.user_id nullable + appUserId column (sem relation field — BMS não declara AppUser).
- Code fixes p/ acomodar nullables:
  - APP `queries/billing.ts`: getActivePlan retorna null se status ou currentPeriodEnd ausentes.
  - APP `actions/billing.ts`: filter `stripeSubscriptionId: { not: null }` + bind local.
  - APP `lib/subscription.ts`: guard `!!currentPeriodEnd` antes do compare.
  - BMS `actions/auth.ts:resetPassword`: guard `!record.userId` rejeita AppUser tokens.
  - BMS `app/(auth)/verify-email/page.tsx`: idem.
  - SEQ `app/(auth)/verify-email/page.tsx`: idem.
- Snapshot Neon criado pelo user antes de aplicar Migration 4 (drops). Migration 2 falhou na primeira tentativa por orphan row no FK → fix em SQL + re-deploy.
- Verificação: `tsc --noEmit` ✅ nos 3 apps. `prisma migrate status` ✅ ("Database schema is up to date!"). Lint sem novos erros.

**Convenção AppSale Stripe NULLABLE**: a partir de agora, Stripe fields populados → fluxo APP; tenantId+soldById populados → fluxo SEQ vendor. Ambos fluxos escrevem na mesma tabela `app_sales`. Quando Fase 3 implementar Stripe real pra QR Packages em SEQ, esses fluxos podem convergir.

**Fase 1 entregue (auth/authorization):**
- BMS: 9 actions migradas de `verifySession()` → `verifyAdmin()` (subscription, customer, company, user, discount-coupon, package, sale, supplier, supplier-category, customer-category). `auth.ts` self-ops mantém `verifySession()`. `/api/entity-name` agora exige admin.
- SEQ: `user.actions.ts` migrado pra `verifyAdmin()` (invites/gerenciamento de funcionários da funerária = OWNER/ADMIN only). Comentário documenta a política no topo.
- APP: upload routes (`/api/bio/upload`, `/api/gallery/upload`, `/api/tribute/upload`) agora exigem `clientPayload` e validam ownership via `canManageProfile()`. Bio upload suporta dois modos: `{ profileId }` (validação ownership) ou `{ scope: "create-memorial" }` (memorial create flow — quota enforced no `createMemorial` action). Tribute upload bloqueia auto-tributo (`session.user.id === profileId`).
- APP: `lib/profile.ts` afrouxou tipo de `canManageProfile` pra `{ id, guardedBy: { guardianId }[] }` (estrutural mínimo, compatível com `ProfileRow`).
- APP: `/api/search` documentado como público por design (memoriais são naturalmente discoverable).
- Limpeza: removidos `SignInInput`/`SignUpInput`/`ResetPasswordInput` type exports não usados nos 3 apps.
- Verificação: `tsc --noEmit` ✅ nos 3 apps. Lint ✅ nos 3 apps.

**Roadmap remanescente da BIG REVIEW** (sessões futuras, plan-mode dedicado pra cada):
- Fase 4: SEQ Sales — validação de margem mínima (100% markup sugerido)
- Fase 5: APP /messages padronização por NotificationType + paginação + auditoria de routes
- Fase 6: SEQ profile redesign (layout shadcn)
- Fase 7: Dashboards (BMS + SEQ) — agregações eficientes
- Phase 5 cleanup SQL (drop legacy `deceased`/`users` com role APP_*): plan separado.

**BIG REVIEW achados pendentes** (consulta: `/home/douglas/.claude/plans/big-code-review-vamos-polished-meteor.md`):
- Vercel env prod: confirmar que cada app tem `AUTH_SECRET` próprio (gap não-fechado, depende de validação no painel)
- Sem rate limiting em auth endpoints (lockout por user existe; falta IP-based)
- APP não tem `prisma/migrations/` — migrations vivem em SEQ. Decisão de ownership formal pendente.

In progress: —
Next: setup operacional Stripe (env vars + webhook endpoint + rodar seed); depois Fase 4 (validação margem em SEQ Sales).
Blockers: STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET ausentes em SEQ `.env` (user precisa preencher antes do primeiro purchase test).

---

Previous session: 16/05/2026 — Family Tree layout v1 rewrite + co-guardianship workflow.

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
- `canManageProfile(profile, userId)` — `profile.id === userId || profile.guardedBy.some(g => g.guardianId === userId)`. Tipo estrutural mínimo: `{ id, guardedBy: { guardianId }[] }`.
- **Todas as actions de escrita** (bio, geolocation, tribute moderate, memorial update/delete) devem usar este helper
- **Upload routes** (`/api/bio/upload`, `/api/gallery/upload`, `/api/tribute/upload`) exigem `clientPayload: JSON.stringify({ profileId })` e validam ownership antes de gerar o blob token. Memorial create form usa `clientPayload: { scope: "create-memorial" }` porque o profile ainda não existe.
- `isExactOwn = id === session.user.id` — usado apenas para impedir que o próprio dono escreva tributo para si

## MANDATORY RULES
1. Antes de adicionar qualquer endpoint → criar schema Zod de validação PRIMEIRO
2. Antes de fazer qualquer mudança no banco → verificar se existe migração pendente
3. Use shadcn component if available
4. Comments, variable, constant and function names in English
5. All UI content such as labels, placeholders, titles, buttons in English
6. **Authorization**: BMS mutations sobre dados globais ou outros usuários usam `verifyAdmin()`. Operações sobre a própria conta usam `verifySession()`. SEQ idem — `verifyAdmin()` (que já inclui tenant scoping) pra gerenciamento de funcionários. APP usa `canManageProfile()` em toda escrita relacionada a perfil.
7. **Upload routes** no APP exigem `clientPayload` no body (`{ profileId }` ou `{ scope: "create-memorial" }`) e validam ownership antes de gerar token Vercel Blob.

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