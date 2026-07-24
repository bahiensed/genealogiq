# PROJECT: Genealogiq App

## STACK
```
Backend: Node.js v24.14.0 + TypeScript v5
Database: Neon + PostgreSQL + Prisma 7 (shared DB with BMS and SEQ)
Frontend: React 19 + Next.js v16.2 + Tailwind CSS v4 + shadcn v4.3
Auth: next-auth v5 (beta) — Credentials provider, split edge/full config
Email: Resend
Deploy: Vercel
Tests: Vitest (unit) — `pnpm test`, blocking no CI (.github/workflows/ci.yml)
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

Last session: 24/07/2026 (continuação) — **Árvore Genealógica Fase 2 completa** (mesma branch `feat/app-family-tree-hardening`) — itens 1, 2 e 6 do roadmap da Fase 1, mais 2 pedidos novos (placeholder de busca + redesign do header), sequenciados como Fase 2a→2e. Nada commitado ainda nesta rodada.

- **Fase 2a — bug de pedigree collapse corrigido** (`layout/index.ts`, rewrite): mecanismo novo `DedupState`/`resolveOccurrence` — 1ª vez que uma pessoa é posicionada (como descendente focal, ancestral focal, OU cônjuge dentro de um casal) ela vira "primária" (id real); toda ocorrência seguinte, por QUALQUER um desses 3 caminhos, vira stub sintético (`<id>~dupN`, sem recursão adicional). Ortogonal ao `visited` (que continua sendo só o guard de término de recursão). Lado ancestral ganha roteamento de aresta correto via `dedup.parentEdgeOverrides`. **Achado durante a escrita dos testes**: o desenho inicial só deduplicava o cartão focal de `buildCoupleSlot`, deixando o cônjuge sem checagem — reproduzi via fixture um caso plausível (duas primas que se casam, cada uma alcançável por um ramo de tio/tia diferente) que colidia posição exatamente como o bug original; generalizei `resolveOccurrence` pra cobrir os dois cartões do casal, fechando a lacuna. `layout/index.test.ts` novo (12 testes) — 2 dos meus rastreamentos manuais iniciais deram errado contra o código real (ordem de iteração do loop de tios/tias inverte pra `onLeft`; um design de fixture acidentalmente criava irmãos via parent-set compartilhado) — corrigidos comparando contra output real via script de debug antes de fixar as asserções.
- **Fase 2b — header do canvas + placeholder de busca**: `tree-header.tsx` reescrito no padrão tipográfico de Bio/Galeria (`BackButton` + `h1 text-xl md:text-3xl font-semibold tracking-tight` + subtítulo abaixo); botão "Add relative"/"Upgrade plan" vira ícone-só abaixo de `md`. `tree-stats.tsx` renomeado pra `tree-subtitle.tsx`: contagem de gerações agora por extenso 1–12 (`stats.generationsWord.{one..twelve}`, concordância de gênero pt-BR/es-MX com "geração"/"generación") + fallback numérico acima de 12; ICU `stats.generations` trocou `{#}` por `{word}`. `canvasSearch.placeholder` "Search by name…" (reticências Unicode) → "Search by name..." (3 pontos ASCII) nos 3 locales.
- **Fase 2c — mini-mapa + reposicionamento manual (drag)**: `svg-canvas.tsx` exporta `MIN_SCALE`/`MAX_SCALE` e `ViewportContextValue` ganhou `size`. `mini-map.tsx` novo (overlay `bottom-4 right-4`, clique/arrasta pra reenquadrar mantendo o zoom atual, `data-no-pan`). `person-node.tsx` ganhou drag-to-reposition (threshold 5px em tela, preview local via `transform` — **arestas não seguem ao vivo durante o arrasto por design**, só "encaixam" no soltar; supressão de click pós-drag via ref). **DB**: model novo `TreeNodePosition` (`app_tree_node_positions`, `@@unique([rootId, personId])`, offset `dx/dy` + `generation` snapshot pra detectar override obsoleto se a árvore remodelar depois) — migration `20260724000000_tree_node_positions` aditiva/idempotente, **`prisma migrate deploy` PENDENTE no Neon**. `actions/tree-position.actions.ts` (`saveNodePosition`, `canManageProfile` + rate limit 120/h) + `queries/family-tree.ts`'s `getNodePositions`. Lógica de aplicar override extraída pra `applyPositionOverrides` (pura, testável, 4 testes novos) em vez de ficar inline no componente.
- **Fase 2d — recolher/expandir sub-árvores**: reusa o mesmo padrão "stub, não recursa" da Fase 2a — `computeLayout` ganhou parâmetro opcional `collapsedIds: Set<string>` (não persistido, puro client state, reseta ao recarregar). `LaidNode` ganhou `hasCollapsible`/`isCollapsed`/`collapseDirection` ("up" pro lado ancestral, "down" pro descendente — direção é implícita em qual função da recursão seta o campo, sem precisar inferir depois). `person-node.tsx` ganhou botão +/− (borda superior ou inferior conforme direção) só quando há algo pra recolher. 4 testes novos.
- **Fase 2e — comparador de parentesco (item 1 do roadmap original)**: `family-relation-label.ts` teve o BFS extraído pra `findRelationPath` (novo export, `maxHops=12` default, cada passo carrega o `relationId` percorrido) — `relationFromRoot` virou wrapper fino chamando `findRelationPath(...,4)` + `labelForPath`, comportamento idêntico ao de antes (13 testes novos, incluindo regressão do label). **Achado durante os testes**: esse módulo anda só por `TreeRelation` explícitas — ao contrário do motor de layout (`family-units.ts`), NÃO infere irmandade a partir de pai em comum; um "primo" só resolve certo se existir uma relação `SIBLING` explícita entre os pais. Pré-existente, não é regressão desta sessão, só documentado. `ParentLineGeom`/`CoupleLineGeom`/`SiblingLineGeom` ganharam `relationId`; `family-edges.tsx` ganhou prop `highlightedRelationIds` (trunks de T-junction compartilhados por 2+ filhos destacam inteiros se QUALQUER filho estiver no caminho — simplificação deliberada em vez de recortar segmento por segmento). `compare-tool.tsx` novo (overlay `top-4` centralizado): botão liga "modo comparar", clique em 2 pessoas (âncora fixa, 2º pick troca livremente) destaca o caminho nas arestas + anéis âmbar nos nós do caminho + badge numerado (1/2) nos dois picks + texto "X é [parentesco] de Y". Não integrado à busca por texto — mas como `CanvasSearch.onPick` já chama o mesmo `handleNodeActivate` que os cliques no canvas, escolher via busca durante o modo comparar já funciona de graça.
- Gates (rodados incrementalmente por sub-fase e de novo no final): tsc 0 erros ✅ · 474 testes (33 novos: 12 pedigree-collapse + 4 override + 4 collapse + 13 relation-path) ✅ · eslint limpo em todos os arquivos tocados ✅ · i18n parity + keys ✅ (chaves novas: `header.backToProfile`, `stats.generationsWord.*`, `controls.miniMap`, `node.collapse`/`node.expand`, `compare.*` — todas ×3 locales) · schema-parity ✅ · `prisma validate` ✅ · **build de produção OK** (rota `/profile/[id]/tree` presente, TS do build limpo).
- **Pendências**: (1) `prisma migrate deploy` no Neon pra criar `app_tree_node_positions`; (2) verificação visual ao vivo de toda a Fase 2 (Douglas testa drag, mini-mapa, collapse, comparador); (3) nada commitado ainda — branch tem Fase 1 (já commitada em sessão anterior) + Fase 2 (working tree); (4) itens do roadmap original ainda não puxados: notificações de aniversário (precisa cron), visão em leque, exportar imagem/PDF, curtidas/comentários, LifeEvent/Document/GEDCOM/precisão de data/citações — tudo em `~/.claude/plans/eu-quero-que-voc-stateless-nebula.md`.

Previous session: 24/07/2026 — **Auditoria + hardening da Árvore Genealógica** (branch `feat/app-family-tree-hardening`). Escopo aprovado por Douglas: análise completa (segurança + regras de negócio + roadmap de features) → Fase 1 implementada agora (correções críticas + religar UI órfã); roadmap estrutural (Timeline, Documentos, GEDCOM, precisão de data, citações de fonte, etc.) documentado como backlog priorizado em `~/.claude/plans/eu-quero-que-voc-stateless-nebula.md`, não implementado.

- **Método**: 3 agentes Explore em paralelo (segurança/regras de negócio, canvas/UX, padrões dos módulos irmãos Places/Tributes) + 1 agente Plan pra validar os fixes propostos e desenhar o roadmap — encontrou 3 lacunas reais na 1ª versão do fix de privacidade e 1 bug de corretude novo (pedigree collapse, ainda não corrigido, ver backlog no plano).
- **Fase 1a — hardening de server actions** (`family-tree.actions.ts`, `guardian.actions.ts`, seus schemas Zod, `queries/family-tree.ts`, `api/search/route.ts`): (1) fix de bug de bypass de consentimento — auto-link em `addGhostRelative` e o bônus de `acceptFamilyRequest` filtravam por `status: { not: "REJECTED" }` (inclui PENDING) em vez de `"ACCEPTED"`, deixando um convite ainda não aceito virar relação `ACCEPTED` sem consentimento; (2) prevenção de ciclo de ancestralidade em `PARENT_OF` (`createsAncestryCycle`, BFS descendente); (3) prevenção de tipo de relação conflitante entre o mesmo par (`hasConflictingRelationType`); (4) validação de ordem de datas + data de calendário válida nos schemas (`.refine`, reusa `Errors.endBeforeStart` já existente); (5) diferenciação de erro P2002 vs. outros (helper `isUniqueConstraintError`) — fora de transação vira mensagem amigável, dentro da `$transaction` de `addGhostRelative` virou check-antes-de-criar (catch-dentro-de-tx podia deixar a transação Postgres abortada silenciosamente); (6) `acceptFamilyRequest` reescrito como transacional com `upsert` (fecha corrida real em pedidos de co-guardião concorrentes) + `notify()` só dispara depois do commit; (7) rate limiting novo em `addRelation`/`addGhostRelative`/`requestGuardianship`/`/api/search` (nenhum tinha antes); (8) auto-retirada de pedido de co-guardião PENDING pelo próprio solicitante (`rejectGuardianship`, mesma carve-out que já existia pra convite de parentesco) + guard pra não auto-notificar; (9) `.cuid()` no `guardian.schema.ts` (era `.min(1)`). 24 testes novos.
- **Fase 1b — privacidade + i18n**: parentes vivos (`APP_USER`) que aceitaram convite tinham data de nascimento exata, local e foto expostos a **qualquer visitante da árvore pública** de um memorial (anônimo ou logado), sem consentimento específico pra exposição pública — a data completa ia no payload RSC mesmo quando a UI só mostrava o ano. Fix: `getFamilyTree(rootId, viewer)` ganhou parâmetro de viewer e redige `birthDate`/`birthPlace`/`birthCountry`/`deathDate`/`deathPlace`/`deathCountry` pra `null` quando `role === "APP_USER" && id !== viewer.id && !viewer.canManage` (foto continua visível); `TreePerson` ganhou `birthYear`/`deathYear` sempre populados (nova fonte canônica de exibição de ano, substituindo derivação ad-hoc em `person-node.tsx`/`canvas-search.tsx`); datas de casamento (`SPOUSE.startDate/endDate`) também são redigidas quando uma das pontas é redigida; `layout/index.ts`'s `ageOf()` (3 pontos) passou a preferir `birthYear` quando `birthDate` é nulo, senão pessoa redigida sempre ordenava por último; `person-info-sheet.tsx`'s timeline ganhou branch "só ano" pro evento BORN/DIED não sumir quando redigido. Escopo v1 documentado em comentário: redação é por-gestor-da-árvore-raiz, não por-pessoa (extensão futura = item de backlog). Também: `family-relation-label.ts` (labels tipo "Your mother"/"Your cousin") estava 100% hardcoded em inglês, contornando o i18n — convertido pra receber um `Translator` e usar `FamilyTree.relation.*` (36 chaves novas ×3 locales); cobertura de caminhos mantida idêntica (conversão mecânica). 6 testes novos de redação.
- **Fase 1c — religar 2 componentes prontos mas desconectados + 2 fixes baratos**: `CanvasSearch` (busca "pular pra pessoa" via tecla `/`) estava pronta e traduzida mas nunca importada — religada em `family-tree-canvas.tsx` via `overlays`, usando `useViewport().focusOn()` (já exposto por `svg-canvas.tsx`) pra centralizar no nó escolhido. `EditRelationDialog` (editar subtipo/datas ou apagar uma relação) também pronta mas sem gatilho (linhas SVG são `pointer-events-none`) — religada via nova seção "Relacionamentos" em `person-info-sheet.tsx` (lista relações não-REJECTED da pessoa selecionada com botão de editar, que de brinde resolve a lacuna de não existir NENHUMA forma de retirar um convite pendente enviado por você). Também: `edge-style.ts` tinha `spouseStyle("widowed")` e `siblingStyle("adopted")` pixel-idênticos a `"divorced"`/`"half"` — dash-pattern próprio agora; `person-node.tsx` ganhou `role="button"`/`tabIndex`/`onKeyDown` (zero nó era alcançável por teclado antes — não resolve navegação espacial completa, isso é backlog).
- **Achados identificados mas deliberadamente fora desta rodada** (documentados no plano): governança de `canManageRelation` (gestor da raiz pode editar relações entre dois outros usuários reais — pergunta de produto, não bug); corrida não-atômica no limite de plano (`treeMaxMembers`, overshoot pequeno sob concorrência real); `FamilyRelation.type`/`subtype`/`status` como String livre sem enum Postgres (endurecimento de schema, exige migration); bug de pedigree collapse no motor de layout (`layout/index.ts`'s `visited` global — pessoa em 2 ramos ancestrais só renderiza na 1ª ocorrência, achado por rastreamento de código).
- **Roadmap de features completo** (não implementado, ver plano): estrutural — precisão/incerteza de data (formato GEDCOM `ABT/EST/BEF/AFT`), citação de fonte, modelo `LifeEvent`/Timeline persistida, modelo `Document` (1º upload não-imagem do app), exportar/importar GEDCOM, tipos de relação estendidos (padrinho/madrinha), dedup de pessoas; cosmético — destacar caminho de parentesco entre 2 pessoas (reusa BFS já existente), notificações "hoje faz X anos" (precisa de cron, não existe ainda), mini-mapa, recolher sub-árvores, reposicionar nós manualmente, visão em leque, exportar como imagem/PDF, curtidas/comentários (mesmo padrão já aprovado pro Places).
- Gates: tsc 0 erros ✅ · 235 testes (30 novos) ✅ · eslint limpo nos arquivos tocados ✅ · i18n parity + keys ✅. Sem migration nesta rodada (deliberado — Fase 1 fica só em app-layer).
- **Pendências**: verificação visual ao vivo (Douglas testa a UI); decidir quando puxar itens do roadmap pra próximas sessões "Fase N".

Previous session: 21/07/2026 — **Novo módulo "Geolocalizações" (plural)** — vários lugares de vida por perfil, coexistindo com o módulo antigo `Geolocation` (1:1 sepultamento, intacto). Plano: `~/.claude/plans/vamos-modificar-o-m-dulo-logical-perlis.md`.

- **Escopo**: perfis de **vivos E memoriais** registram N lugares (nascimento, escola, 1º beijo, férias…), cada um com título, descrição, categorias agrupadas, coordenadas, fotos (só imagens v1), data(s). Opera como a Galeria (vazio → criar 1º → editar → exibição bonita).
- **DB** (`packages/db` — schema ÚNICO): model novo `GeoPlace` (`app_geo_places`, 1:many, espelha `GalleryItem`; `categories String[]`, `photos String[]`, `startDate/endDate`, cascade). `Subscription.geoPlacesMax Int @default(3)`. Migration `20260721000000_geo_places` aditiva/idempotente — **`prisma migrate deploy` PENDENTE no Neon** (Douglas roda). `Geolocation` (singular) NÃO tocado.
- **Camada de dados**: `schemas/place.schema.ts` (`getPlaceSchema`, categorias validadas contra `consts/place-categories.ts`, refine endDate≥startDate), `queries/places.ts` (`getPlacesByUserId`/`getPlacesForMap`/`getPlacesCount`), `actions/places.actions.ts` (`savePlace(profileId, placeId|null, data)` create/update + `deletePlace`; auth via `canManageProfile`; prune de blobs órfãos; **quota inerte** atrás de `process.env.GEO_PLACES_ENFORCE_QUOTA==="true"` — infra pronta, desligada em dev). Upload `api/places/upload/route.ts` (cópia do geolocation upload, só imagens).
- **Categorias** (`consts/place-categories.ts`): 8 grupos (origins/education/relationships/family/work/leisure/milestones/final) × keys estáveis EN; rótulos i18n `Places.cat_*`/`catgroup_*`. `sport` no grupo leisure. Seletor multi-check agrupado `place-category-select.tsx` (Popover+checkbox, sem cmdk).
- **UI**: página lista `(public)/profile/[id]/places/page.tsx` (grid de cards via `places-client.tsx`, detail em Dialog com fotos + QR + link editar; **sem mapa aqui**, botão "Ver no mapa" perto do título); rota dedicada do mapa `places/map/page.tsx` → `places-map.tsx` (react-leaflet + OSM, `divIcon` SVG por grupo, `MarkerClusterGroup`, fitBounds) carregado via `places-map-loader.tsx` (`dynamic ssr:false` — Leaflet toca `window`); criar `places/new`, editar `places/[placeId]/edit` (form `place-edit-form.tsx`). QR por lugar `place-qr-button.tsx` (`qrcode` client) → `/profile/[id]/places?place=<id>` (deep-link pré-abre o detalhe). Card `placesCard` (icon MapPinned) em **ambos** os arrays do perfil + `PlacesPreview` (mini-tile OSM) em `card-previews.tsx`.
- **Deps novas**: `react-leaflet@5` + `leaflet` + `react-leaflet-cluster@4` + `@types/leaflet` — instaladas na **raiz** via `corepack pnpm --filter @genealogiq/app add …`. Sem env var, sem custo, sem API key. **`pnpm` só via `corepack pnpm`** nesta máquina (não está no PATH direto).
- **i18n**: namespace novo `Places` (85 chaves ×3 locales) + `Actions.places.*` + `Errors.endBeforeStart` + `Profile.places*`. Injetado por script (parity holds).
- **Gotcha (não é bug meu)**: `billing.actions.ts:132` (`it` implicit any em callback do Stripe) aparece só em **compile frio** de tsc; `incremental:true`+`tsconfig.tsbuildinfo` **não re-reporta diagnósticos de arquivos não alterados** → em regime (cache quente) tsc = 0 erros. Provado por `git stash` que existe idêntico no HEAD, independente desta feature.
- **Backlog declarado (aprovado p/ próxima fase, models a criar)**: **curtidas + comentários moderados** por lugar (`PlaceLike` + `PlaceComment` status PENDING/APPROVED/REJECTED, espelhando `Tribute` — moderação via `canManageProfile`, notif `PLACE_COMMENT_PENDING`). Também: vídeo (reusar transcode da galeria), timeline view, pins coloridos+legenda no mapa. (Reorder-drag fora de propósito por ora.)
- Gates: tsc 0 erros (regime; arquivos da feature limpos) ✅ · eslint limpo nos arquivos novos ✅ · 192 testes (19 novos: `place.schema.test.ts` + `places.actions.test.ts`) ✅ · i18n parity ✅ · **build prod OK** (4 rotas places + `/api/places/upload` presentes; Leaflet SSR compila) ✅.
- **Pendências**: (1) `prisma migrate deploy` no Neon; (2) verificação visual ao vivo (Douglas testa UI); (3) implementar likes/comments (backlog); (4) aposentar módulo antigo `Geolocation` quando o novo estiver aprovado.

Previous session: 10/07/2026 (tarde) — **Tier 2 PWA: Web Push notifications** (branch `feat/app-web-push`).

- **Fan-out**: `notify()` (`lib/notifications.ts`) agora agenda `after(() => sendPushForNotification(args))` — ponto único; os 10 call sites intactos. Todos os 9 `NotificationType` disparam push.
- **DB** (`packages/db` — schema ÚNICO; convenção de espelhar ×3 apps está MORTA, CI `check-schema-parity` proíbe): model `PushSubscription` (`app_push_subscriptions`, endpoint unique, cascade) + `AppUser.preferredLocale`. Migration `20260710000000_web_push_subscriptions` aditiva/idempotente — **`prisma migrate deploy` JÁ RODADO no Neon** (pelo Douglas).
- **Envio** (`lib/push.ts`, server-only): payload trilíngue de `lib/push-payload.ts` (copy hardcoded em `Record<SupportedLocale, Record<NotificationType,…>>` — NÃO em messages/*.json, paridade via tipo); locale do destinatário = `preferredLocale` (semeado no signUp via `resolveLocale()`, atualizado pelo language-switcher via `updatePreferredLocale` — `auth()` direto, não `verifySession`, por causa de guests); deep-links espelham o DISPATCH de messages-list; prune automático 404/410; sem VAPID env = no-op com 1 warn; nunca lança (roda em `after()`).
- **Cliente**: `lib/push-client.ts` + `hooks/use-push-subscription.ts` (máquina loading/unsupported/denied/available/subscribing/subscribed; permissão SÓ atrás do clique) + `components/push-banner.tsx` em `/messages` (dispensa 30d `giq:push-banner-dismissed`; inscrito → linha compacta com Desativar). iOS Safari não-instalado cai em unsupported (sem PushManager) e não mostra nada.
- **SW**: handlers `push` (fallback genérico p/ push sem payload) + `notificationclick` (foca aba ou abre; URL relativa resolvida na origin). Sem bump de cache.
- **Actions**: `subscribePush` (Zod, rate-limit 10/h, upsert por endpoint reatribuindo userId — device compartilhado) / `unsubscribePush` (deleteMany por endpoint, sem user-scoping de propósito). UA lido de `headers()`, nunca do client.
- **Env**: `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` (gerar: `npx web-push generate-vapid-keys`). Chaves locais de dev preenchidas no `.env` (gitignored). **PENDÊNCIA OPERACIONAL: provisionar VAPID no Vercel prod** (chaves NOVAS de prod, não as de dev). ⚠️ `NEXT_PUBLIC_*` é inlined em build-time — rebuild após setar.
- **Gotcha aprendido**: `pnpm add` de dentro de `apps/app` quebrou symlinks de `packages/services` (stripe/next) → typecheck falhou; `pnpm install` na raiz conserta.
- **E2E ao vivo verificado** (build prod local + Chrome): banner pt-BR → Ativar → permissão → row no banco (UA server-side) → push REAL via FCM (201) exibido pelo SW com payload/tag/deep-link corretos (nota: houve janela de ~1 update do SW onde 2 pushes se perderam logo após a inscrição — depois de `reg.update()` tudo entregou) → Desativar removeu subscription do browser E row do banco → banner voltou. Fallback en-US p/ `preferredLocale` null confirmado.
- Gates: tsc ✅ · 387 testes (30 novos) ✅ · i18n parity+keys ✅ · schema-parity ✅ · lint baseline ✅ · build ✅.
- **v1 declarada**: sem lista de devices; permission-denied sem hint; sem handler `pushsubscriptionchange` (self-heal via prune).

Previous session: 10/07/2026 — **PWA hardening (best practices) + install-prompt dialog** (branch `feat/app-pwa-tier1-installability`, PR #123).

**Hardening do Tier 1 (auditoria completa da implementação de 09/07):**
- `public/sw.js` reescrito: navigation preload habilitado (tira a latência de boot do SW de toda navegação); runtime cache `giq-next-assets-v1` pra `/_next/static/*` (cache-first, immutable, FIFO trim 80 entries) — **conserta a página offline renderizando sem CSS**; snapshot de `/offline` re-buscado ao máximo 1×/hora após navegação online (não fica stale entre deploys); precache com `{ cache: "reload" }`; split critical (`/offline` + manifest, addAll — falha = retry no próximo load) vs optional (ícones/brand/fonts, allSettled — asset renomeado não quebra instalação); fallback inline trilíngue 503 se o cache do /offline for evicted (antes: `respondWith(undefined)` → TypeError); navegações POST nunca respondidas com cache. `skipWaiting`+`claim` mantidos (safe: navegação é network-first).
- `manifest.ts`: +`id`, `scope`, `lang` (DEFAULT_LOCALE import), `dir`, `categories`, icon 192 **maskable** (gerado de 512 via sharp), `shortcuts` [Home `/home`, Messages `/messages`]. **Manifest fica em en-US de propósito**: browser busca manifest SEM cookies (spec) → localização por cookie não é confiável; manifest único no default locale = padrão da indústria. **`/tree` NÃO existe como rota** (auth.config lista como protected mas a página não existe — quirk pré-existente; shortcut apontava pra lá e foi trocado pra /messages).
- `layout.tsx`: `themeColor` por color-scheme (light `#616198` brand / dark `#232339` = dark --background); `appleWebApp` metadata (capable/title/statusBarStyle).
- `offline/page.tsx`: noindex + retry como **`<a href="">`** (zero-JS — chunks JS da página offline podem não estar cacheados; onClick seria inerte; href vazio re-requisita a URL original que o usuário tentou).
- `register-service-worker.tsx`: só registra em produção (`NODE_ENV`); em dev **desregistra** SWs existentes (un-stick); `updateViaCache: "none"`.
- `next.config.ts`: header `Cache-Control: no-cache, no-store, must-revalidate` pro `/sw.js`.
- `proxy.ts` matcher: exclui `sw.js`, `manifest.webmanifest`, `favicon.ico`, `fonts/`, `icons/` e extensões estáticas do proxy de auth (JWT decode desnecessário). **Regressão zero provada por teste de regex** contra a tabela de rotas (inclusive falsos-amigos `/swagger`, `/iconset`, `/swx.js` continuam casando).
- Hardcoded English do `header.tsx` (aria-labels + sr-only DialogTitle) → `Nav.openMenu`/`Nav.searchProfiles` ×3 locales.
- **Geo-IP locale JÁ EXISTIA** (`resolveLocale`: cookie → `x-vercel-ip-country` BR/MX → en-US) — verificado, nada a fazer.

**Install-prompt dialog (novo):**
- `lib/pwa-install.ts` (helpers puros, DI, testáveis em node) + `hooks/use-pwa-install.ts` + `components/pwa-install-dialog.tsx`, montado no root layout (todas as páginas). Namespace i18n `InstallPrompt` ×3 locales.
- Comportamento: abre 3s após o load quando não instalado; Chromium = botões Instalar (via `beforeinstallprompt` capturado, `preventDefault` sempre — suprime o mini-infobar) + "Agora não"; iOS = passos Compartilhar → Adicionar à Tela de Início (detecção UA + iPadOS masquerade via MacIntel+maxTouchPoints>1); Firefox etc. = nada. Aviso de **beta** no corpo. Declinar (botão/ESC/clique-fora) = cooldown **21 dias** (`giq:pwa-install-dismissed` timestamp). `appinstalled` → `giq:pwa-installed` (nunca mais mostra); rodando standalone → nunca mostra. Recusar o prompt nativo do Chrome = mesmo cooldown.
- `lib/pwa-install.test.ts`: 12 unit tests (isIosDevice UAs + boundary do cooldown).

**Verificado ao vivo** (build prod + Chrome): SW ativo, nav-preload enabled, caches populados; **offline real testado matando o servidor** → página offline estilizada (CSS do runtime cache) + "Try again" re-navegou com sucesso; dialog abre/declina/persiste/reaparece após 22d simulados; manifest com 4 ícones (any+maskable ×2) e installability OK (Chrome disparou `beforeinstallprompt`). Gates: tsc ✅ · 357 unit tests ✅ (12 novos) · i18n parity + keys ✅ · lint baseline ✅ · build ✅.

Previous session: 08/07/2026 — Sign-up: caixinha de regras de senha ao vivo. `password-requirements.tsx` (novo, client component) espelha exatamente os 5 regex do `strongPassword` compartilhado (`packages/auth/src/schemas.ts`) e acende cada regra em verde conforme o usuário digita (era só erro pós-submit). `sign-up-form.tsx` ganhou state local `password` via `onChange` (input continua uncontrolled/name-based pro `useActionState`+FormData — não recebeu prop `value`). Chaves novas (`passwordRequirementsTitle` + 5 `passwordRule*`) nos 3 locales, ordem alfabética. Escopo intencional: só sign-up (`ResetPasswordForm`/`ChangePasswordDialog` usam o mesmo schema e podem reusar o componente depois, mas não foram tocados). Verificado ao vivo no browser (`/sign-up`, pt-BR) — todas as 5 regras acendem independentemente. `tsc` + `check-i18n-parity.mjs` ✅. PR #119 (branch `feat/signup-password-requirements-checklist`) aberto.

Previous session: 30/06–01/07/2026 — APP i18n polish + memorial QR guardian-only + header frost fix + "Memorial" badge copy + **public memorial profiles** (foundation 30/06 + refinamentos do muro de cadastro 01/07). PRs #103–#106 merged to main; **#107 (public memorial preview) aberto — 13 commits, tudo pushed**.

**i18n setup (referência):**
- Pacote compartilhado `@genealogiq/i18n` (`packages/i18n/src/config.ts`). 3 locales: `en-US`, `pt-BR`, `es-MX`. Default `en-US`. Mensagens em `apps/app/messages/<locale>.json`, **chaves em ordem alfabética por namespace**.
- Resolução de locale (`packages/i18n/src/server.ts`): cookie `locale` → geo header `x-vercel-ip-country` (BR→pt-BR, MX→es-MX) → default en-US. **Em dev local não há geo header**, então janela anônima sem cookie = inglês (comportamento esperado, não bug).
- Server Components: `getTranslations(ns)` + `getLocale()`. Client: `useTranslations(ns)` + `useLocale()`.

**Sign-in redesign (PR #103):**
- `sign-in-form.tsx` reescrito com **CSS Grid `grid-template-areas`** pra separar ordem do DOM (= ordem de TAB) da ordem visual. "Esqueceu a senha?" fica visualmente na linha do label Senha mas no DOM vem depois do submit (grid placement não afeta foco). Toggle de olho com `tabIndex={-1}`. Separador "ou" (`Separator` dos dois lados) + link "Ative o seu GenCode".
- Novas chaves `Auth.or`, `Auth.activateGenCode`; removida `Auth.haveQrCode` (órfã após sign-in + sign-up migrarem). `/activate` page: `activateTitle`/`activateDescription` reescritos pra GenCode + placeholder `G3N3-4L0G1-QGL0-B4L9`.

**Home mini-cards i18n (PR #103):**
- `ProfileMiniCard` traduz o discriminante `status` → `Home.memorializedBadge`/`livingBadge` (chave nova). Conserta todas as seções (favorites/guarded/recently-viewed), inclusive cache antigo (status é discriminante literal, não display string).
- `profile/[id]/page.tsx`: `formatDate` agora locale-aware (era `"en-US"` hardcoded no banner).
- **Recently-viewed refactor**: `use-recently-viewed.ts` agora guarda **dados crus** (ISO dates + `isMemorialized`) sob chave `giq:recently-viewed:v2` (bump descarta cache v1 pré-formatado); `recently-viewed-section.tsx` formata subtitle/metric/status **na renderização** com `useLocale`/`useTranslations` (espelha `home-favorites`). Trocar idioma re-localiza cards já vistos. `read()` valida cada entrada via type guard `isRecentProfile` e descarta malformadas (defesa contra shapes obsoletos).

**Memorial QR guardian-only (PR #104):**
- QR de perfil memorializado é acessível **só pelos guardiões**. Card no `profile/[id]/page.tsx`: não-guardião vê card **bloqueado** (`<QrPreview locked />` = cadeado no lugar do QR, label `qrMetricGuardianOnly`, sem `href`/gate). Guardião mantém CTA de compra (memorial grátis) / link pro qr-code (pago).
- Rota `profile/[id]/qr-code/page.tsx`: `if (profile.role === "APP_MEMO" && !isGuardian) notFound()` (defesa em profundidade).
- `QrPreview` ganhou prop `locked`. Novas chaves `Profile.qrMetricGuardianOnly`/`qrLockedAlt`; removida `qrMetricNotGenerated`.

**Header opacity/blur fix (APP):**
- Header do APP estava "transparente demais" (dava pra ler o conteúdo passando por trás ao scrollar). Causa: o `backdrop-filter` do `.glass-strong` (em `@layer components`) é **sobrescrito pra `none` pela layer de utilities do Tailwind** → o blur nunca renderiza, sobra só o fundo semitransparente. (Afeta também `.glass-card` — blur das cards idem não renderiza; latente, não tratado nesta sessão.)
- Fix: classe `.glass-header` definida **UNLAYERED** (fora de qualquer `@layer`, pois unlayered vence todas as layers) em `globals.css`, com `background: hsl(var(--glass-bg) / 0.7)` + `backdrop-filter: blur(12px) saturate(180%)` — mesma opacidade/blur dos headers BMS/SEQ (`bg-background/70 supports-[backdrop-filter]` + `backdrop-blur-md`). Aplicada junto de `glass-strong` no `header.tsx` (glass-strong ainda fornece borda/sombra). Confirmado visualmente em light + dark via browser automation.
- Lição: para sobrescrever propriedades de utilities do Tailwind v4 a partir de CSS custom, regra unlayered vence sem precisar de `!important`. Diagnóstico de `backdrop-filter: none` no computed style → checar conflito de cascade layers, não só opacidade.

**Public memorial profiles (PR #107 — aberto, 13 commits; foundation 30/06 + refinamentos 01/07/2026):**
- Visitante **não logado** vê memoriais (`APP_MEMO`) essencialmente **públicos** — bio completa, galeria, homenagens (read-only), **árvore e geolocalização**. Perfis de vivos e rotas de gestão continuam login-only. Fluxo do QR na lápide.
- **Arquitetura**: árvore `profile` movida de `(protected)` → route group `(public)` (URLs iguais). `(public)/layout.tsx` session-aware: `Header` autenticado OU `GuestHeader` (`components/guest-header.tsx`) pra anônimo. Rotas de gestão/edit self-gate via `verifySession()` no body. Boundary files `(public)` (loading/error/not-found) via `bruna-boundary-files`.
- **Gate memorial-only** (`assertPublicMemorialAccess` em `lib/public-profile-access.ts`, assertion fn): anon em id inexistente OU perfil de vivo → **ambos** redirect pra sign-in idênticos (sem enumeração 404-vs-redirect). `notFound()` só pra viewer autenticado. `getProfileById` usa `PUBLIC_SELECT` (sem PII). Tree/geo (`tree|geolocation/page.tsx`) usam `auth()` + esse gate; tree passa `sessionUserId=""`, `canManage=false` (read-only; writes bloqueadas server-side por `verifySession()` em `family-tree.actions.ts`/`guardian.actions.ts` — as flags do canvas são só UI, confirmado pelo reviewer).
- **Muro de cadastro — `SignupDialog` compartilhado** (`components/auth/signup-dialog.tsx`, client): logo da **árvore** (`/tree-dark|light.png`, igual aos forms de auth, `h-32`), título `Auth.signupWallTitle` (className `scroll-m-20 text-2xl font-bold tracking-tight`), descrição `signupWallDescription`, CTAs **empilhados full-width** (labels `Nav.logIn`/`Nav.signUp`). Prop `dismissible` alterna dois modos:
  - **Hard wall (NÃO fechável)** — bio + homenagens. `SignupPrompt` (`signup-prompt.tsx`) auto-dispara a **~80% do scroll da página** (`(scrollY+innerHeight)/scrollHeight >= 0.8`, guard `scrollY>80`); `showCloseButton={false}` + `onEscapeKeyDown`/`onInteractOutside` `preventDefault` + `onOpenChange` não-ligado ao Radix → sem X, ESC/clique-fora não fecham (padrão Medium/NYT; sai por voltar do navegador). Resolve o bypass "fechar e continuar lendo". Reviewer confirmou dupla-trava contra o Radix source instalado.
  - **Soft wall (fechável, tem X)** — galeria (estilo Instagram) + **coração/favoritar** do banner. Galeria (`gallery-client.tsx`, props `gated`/`hasMore`): anon vê só o 1º load (`PAGE_SIZE=12`), **sem auto-load** (IntersectionObserver desligado quando `gated`); clicar numa foto OU no botão fake "Carregar mais imagens" (`Gallery.loadMore`) abre o dialog em vez do lightbox. Coração anon (`profile-banner.tsx`) abre o dialog em vez de navegar pro `/sign-in`.
- **Header anon (`guest-header.tsx`)**: **Sign up sempre texto** (todos os displays); **Sign in** vira **ícone** `LogIn` em xs/sm (`md:hidden`, estilo dos toggles tema/idioma) e texto em md+ (`hidden md:inline-flex`). Labels `Nav.logIn`/`Nav.signUp`.
- **Rename "Memorialized" → "Memorial"** no dicionário (en + es, todos os valores: badge `Profile.memorialized`, subtítulos `memorializedProfile`, fluxo create-memorial namespace `Memorialized`, subscriptions; es `conmemorad*/conmemorativ*`→`memorial`; pt badge alinhado). QR `locked` no card = só o ícone `Lock` maior (`h-16`, sem box). **NOTA**: pt ainda tem "memorializado" em ~8 frases do fluxo create (não alinhadas — user pediu só en+es).
- **QR scan**: `/qr/[genCode]` ACTIVATED → `/profile/[id]` cai direto no memorial público (sem bounce pro login).
- **Convenção suite (`nextjs-crud-suite@bahiensed-plugins`)**: fatias com gates deterministas (tsc/lint/`check-i18n-parity.mjs`) + 1 pass do `nextjs-crud-suite:reviewer` (Security/Correctness/Operability). Auth = DAL existente (`@/lib/dal`, next-auth), **NÃO** Better Auth. Só personas que fazem sentido (bruna, kato, paula...) + reviewer.
- **Demo seed (Joseval `cmocx90bx000004lbermsg24m`)**: bio longa + 18 fotos (picsum) + 18 homenagens APROVADAS pra exercitar o muro. **Reverter quando terminar de demonstrar** (não é dado real).
- **Removidos na rework**: `signup-wall.tsx`, `signup-gate.tsx`, `lib/bio-excerpt.ts` + chaves `signupGate*`/`notNow`/`lockedMetric`.
- **Gotchas**: mover route-group dir (`git mv`) com Turbopack rodando serve **stale** → reiniciar dev server. Redirect Next 16+Turbopack em dev **streama via RSC em HTTP 200** → não testável por curl (só browser). HMR pós-edit às vezes dá boundary transitório "Algo deu errado" → recarregar (tsc verde = transitório). `grid-cols-2` em grid auto-width **iguala** colunas ao maior conteúdo (equal-width por idioma). PRs sem `gh`: **GitHub API** (`/repos/bahiensed/genealogiq/pulls`) com token de `git credential fill` — **nunca logado**.

**Operacional — criação de PR sem `gh`:** o `gh` CLI não está instalado. PRs criados via **GitHub API** (`POST /repos/bahiensed/genealogiq/pulls`) usando o token de `git credential fill` (host github.com), passado por env var pra um script Python — **nunca logado**. Branches deletados com `git branch -d` (safe, só apaga se mergeado) + `git push origin --delete`.

---

Previous session: 20/05/2026 — Stripe/webhook fixes, coupon scope migration, cookie collision fix, vendor subscription activation bug.

**Coupon scope: Subscription → Package:**
- `DiscountCoupon.appliesTo` migrated from `Subscription[]` to `Package[]`. Migration `20260520010000_coupon_applies_to_packages` idempotent, mirrored in all 3 apps. `prisma migrate deploy` run ✅.
- BMS queries/actions/form updated: `getActivePackagesForSelect`, display shows package name + QR count + price.
- DataTable crash fixed: `filterColumn="code"` passed explicitly (default `"name"` doesn't exist on DiscountCouponRow).
- `Decimal` RSC boundary fix: `discountValue` converted to `number` in Server Component before passing to Client Component.

**NextAuth cookie collision (localhost):**
- All 3 apps shared default `authjs.session-token` cookie name → wrong `AUTH_SECRET` used for decryption → `JWTSessionError`.
- Fixed: unique cookie names in each `auth.config.ts`: `bms.session-token`, `seq.session-token`, `app.session-token`.

**SEQ Stripe webhook trailing slash:**
- Webhook URL in Stripe was `https://sequoia.rip/api/stripe/webhook/` (trailing slash) → Next.js redirect broke Stripe signature verification → inventory never updated.
- Fixed URL via `stripe.webhookEndpoints.update(...)`. APP webhook (`https://genealogiq.app/api/stripe/webhook`) was clean.
- Missed Aereus purchase applied manually via `scripts/apply-checkout-session.ts` (new reusable script in SEQ).

**Vendor AppSale subscription activation bug:**
- `createAppSale` in SEQ created `AppSale` with `status=null` and `currentPeriodEnd=null`.
- APP `getActivePlan` filters for `status IN ('active','trialing') AND currentPeriodEnd > now()` → vendor sales invisible as active plans.
- Fixed: `createAppSale` now fetches `subscription.termLength`, sets `status: 'active'`, `currentPeriodEnd = now + termLength months`.
- Existing broken sale patched directly in DB.

**Operational — all done ✅:**
- `npx prisma migrate deploy` run → `rate_limit_attempts` + `_CouponPackages` tables live in Neon.
- `STRIPE_WEBHOOK_SECRET` set in Vercel prod for SEQ and BMS.
- `BLOB_READ_WRITE_TOKEN` set in Vercel prod for SEQ and BMS.

In progress: —
Next: feature work.
Blockers: none.

---

Previous session: 17/05/2026 — Phase 5 cleanup SQL (no-op) + APP/BMS migrations setup + PostgreSQL-backed rate limiting.

**Phase 5 cleanup SQL — entregue como no-op:**
- Queries de discovery no Neon: `deceased` table NÃO existe mais (já foi removida antes); `users WHERE role::text LIKE 'APP_%'` retornou 0 rows; role distribution só tem OWNER (4) / ADMIN (2) / SUPER_ADMIN (1) — todos valores válidos no enum atual.
- **Conclusão**: schema já está limpo. Roadmap item baseado em estado hipotético que não existe. Zero migrations criadas.

**APP/BMS migrations setup — paridade com SEQ:**
- SEQ continua canonical. APP recebeu cópia integral de `prisma/migrations/` (antes: vazio; agora: 25 migrations idênticas). BMS teve seu dir antigo renomeado pra `prisma/migrations.legacy-backup/` (15 migrations antigas com nomes ex: `add_user_model`, `add_tenant_scoping`) e substituído pelo dir canonical de SEQ.
- BMS-legacy migration names ficam orphans em `_prisma_migrations` table — harmless, append-only, e idempotent SQL skipa.
- **Convenção going forward** (memorizado): toda nova migration é authored idempotente (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE IF EXISTS`, `DROP IF EXISTS`) E mirrored verbatim nos 3 dirs `prisma/migrations/` (SEQ + APP + BMS). Naming: timestamp + descrição (sem prefixo de app — todos os 3 dirs têm o mesmo arquivo).

**PostgreSQL-backed rate limiting (IP-based, all 3 apps):**
- Nova tabela `rate_limit_attempts` (id SERIAL, key TEXT, attempted_at TIMESTAMP). 2 indexes: `(key, attempted_at)` e `(attempted_at)` standalone pra cleanup.
- Migration `20260520000000_rate_limit_attempts/migration.sql` — idempotente, mirrored nos 3 prisma/migrations dirs.
- `RateLimitAttempt` model adicionado nas 3 `schema.prisma` (idêntico).
- Novo helper `src/lib/rate-limit.ts` em cada app: `getClientIp()` lê `x-forwarded-for` (primeiro IP) com fallback `x-real-ip`; `checkRateLimit({ key, maxAttempts, windowSeconds })` faz sliding-window check via `findMany take=maxAttempts` + `count >= max → bail`, else `create({ key })`. Opportunistic cleanup (~1% das checks) `deleteMany` rows > 1h.
- Wired em `src/actions/auth.ts` de cada app:
  - **login**: 10 / 5 min / IP (todos os 3)
  - **signUp**: 5 / 1h / IP (apenas APP — único com public signup)
  - **forgotPassword**: 3 / 1h / IP (todos os 3)
  - **resetPassword**: 5 / 1h / IP (todos os 3)
  - **requestEmailChange**: 5 / 1h / IP (todos os 3)
- Rate limit é check **antes** do trabalho caro (lookup de user, bcrypt). Per-user lockout pré-existente (`failedLoginAttempts` + `lockedUntil`) continua intacto — IP-based é defense in depth.

**Verificação:**
- `tsc --noEmit` ✅ em APP + BMS + SEQ.
- Lint baseline mantido nos 3 apps (zero novos errors em arquivos criados/modificados).
- `prisma generate` ✅ nos 3 (cliente regenerado pra incluir `RateLimitAttempt` model).

**Pendência operacional**: ~~rodar `npx prisma migrate deploy`~~ ✅ done 20/05/2026.

---

Previous session: 17/05/2026 — BIG REVIEW Fase 7 (Dashboards perf + new widgets) + Fase 6 leftovers (avatar upload + BMS profile redesign).

**Fase 7 entregue (Dashboards BMS + SEQ — perf refactor + 2 widgets novos por app):**
- BMS `src/queries/dashboard.ts` — rewrite. Antes: 4 `findMany` puxando linhas cruas de Sale + 6 JS reduce loops. Agora: **1 `$queryRaw` combinado** com `FILTER (WHERE ...)` + `SUM(s.quantity * p.price)` JOIN Package retorna todos os totais (monthly/yearly/all count + revenue) numa única ida ao DB; **1 `$queryRaw`** com `DATE_TRUNC('month', ...)` + GROUP BY 1, 2 retorna ~12×N linhas pivot pra monthly chart + revenue by package; **2 `$queryRaw` novos** pra top sellers (groupBy soldById + zip com User.firstName/lastName via Prisma client) e customer growth (groupBy DATE_TRUNC sobre tenants.created_at).
- SEQ `src/queries/dashboard.ts` — last12MonthsSales virou `$queryRaw` `DATE_TRUNC` + GROUP BY 1, 2 (month + subscription_id). Subscription name resolved via 1 `prisma.subscription.findMany({ id: { in: ids } })`. **2 `$queryRaw` novos** pra customer growth (app_users.role = APP_USER + created_at GROUP BY month) e QR consumption (app_sales COUNT GROUP BY month).
- Novos components BMS: `src/components/dashboard/customer-growth-chart.tsx` (BarChart) + `src/components/dashboard/top-sellers-card.tsx` (lista com Avatar + count + revenue formatado USD).
- Novos components SEQ: `src/components/dashboard/customer-growth-chart.tsx` (BarChart) + `src/components/dashboard/qr-consumption-chart.tsx` (LineChart).
- Dashboard pages atualizadas com nova row "Growth insights".
- Month-spine pattern preservado (loop 12 meses + lookup no map) — months sem dado mostram count/revenue: 0.
- BigInt → Number cast explícito em todos os `$queryRaw` (Postgres COUNT retorna BigInt; Prisma serializa Decimal como string).

**Fase 6 leftover 1 — Avatar upload (BMS + SEQ):**
- Novos: `src/app/api/profile/upload/route.ts` (BMS + SEQ) — mirror do APP `bio/upload` pattern mas SEM `clientPayload` (escopo é trivialmente o próprio user via `session.user.id`). ALLOWED_TYPES = `image/jpeg|png|webp|gif`, max **5 MB** (avatar não precisa dos 10MB de bio).
- `@vercel/blob@^2.3.3` instalado em BMS + SEQ (não estava, só em APP).
- BMS + SEQ `src/actions/profile.actions.ts` ganhou `updateAvatar(url)` — valida regex `^https://*.public.blob.vercel-storage.com/`, grava `prisma.user.update({ avatarUrl: url })`, `revalidatePath('/profile')`.
- BMS + SEQ `src/auth.ts` — `authorize()` retorna `image: user.avatarUrl`. **`jwt` callback** ganhou `trigger === 'update'` handling — quando `useSession().update({ image })` é chamado do client, JWT cookie é regravado com novo image. **`session` callback** propaga `token.image → session.user.image`.
- BMS + SEQ `src/types/next-auth.d.ts` — adicionado `image?: string | null` em User + JWT (Session.user já herda de DefaultSession que tem image).
- Novos: `src/components/providers/session-provider.tsx` (BMS + SEQ) — client wrapper de NextAuth SessionProvider. Adicionado no `(protected)/layout.tsx` wrapping todo o tree → habilita `useSession()` no client.
- Novos: `src/components/profile/avatar-upload.tsx` (BMS + SEQ) — Avatar clicável com Camera icon overlay no hover. Fluxo: pick file → `upload()` do `@vercel/blob/client` (token from `/api/profile/upload`) → `updateAvatar(blob.url)` → optimistic local state + `useSession().update({ image: blob.url })` → `router.refresh()`. Header avatar atualiza imediatamente (sem precisar relogin) porque o JWT cookie foi regravado.
- Validation client-side: tipo image/* + size ≤ 5MB. Orphan blobs aceitos (bounded pelo size limit).
- Profile pages atualizadas pra renderizar `<AvatarUpload defaultUrl={image} fullName={fullName} />` no lugar do `<Avatar>` static.

**Fase 6 leftover 2 — BMS /profile redesign (copy direta de SEQ):**
- Novos: `src/schemas/profile.schema.ts` + `src/actions/profile.actions.ts` + `src/components/profile/profile-form.tsx` em BMS — copy verbatim de SEQ.
- `src/app/(protected)/profile/page.tsx` em BMS — rewrite total (de 51 linhas labels PT "Nome:"/"E-mail:" + flex side-by-side para layout 3-card shadcn idêntico ao SEQ). Header com Avatar 20×20 + nome/email; Cards: Personal information / Account & security / Danger zone.
- BMS `src/components/auth/{change-email,change-password,delete-account}-dialog.tsx` — DialogTrigger trocado de `<button className="text-sm underline">` PT-style pra `<Button variant="outline" size="sm">` (delete: `variant="destructive"`). Placeholder "novo@email.com" → "new@email.com".

**Verificação:**
- `tsc --noEmit` ✅ em BMS + SEQ.
- Lint baseline mantido: BMS 16 errors (pré-existentes em landingpage privacy/terms, cookie-consent, forgot-password-form, customer-form, discount-coupons, package-form, sale-form, user-form, data-table); SEQ 15 errors (pré-existentes em sales-form, data-table, proxy). **Zero novos errors em arquivos criados/modificados.**

**Pendência operacional**: garantir que `BLOB_READ_WRITE_TOKEN` está setado em BMS + SEQ Vercel prod (já existe no .env local porque APP usa o mesmo provider).

**Convenção avatar storage**: `Tenant.stripeCustomerId`-equivalente para imagens — todos os apps gravam blobs públicos em `avatars/<timestamp>-<filename>` no mesmo bucket Vercel Blob. User.avatarUrl (BMS/SEQ) e AppUser.avatarUrl (APP) são URLs absolutas independentes.

---

Previous session: 17/05/2026 — BIG REVIEW Fase 6: SEQ profile redesign (layout shadcn).

**Fase 6 entregue (SEQ /profile redesign + self-edit):**
- `src/schemas/profile.schema.ts` — **novo** — `profileSchema` (subset de user.schema sem role/email/isActive): firstName, lastName, nationalId, birthDate, phoneCountryCode, phone, address. Exporta `profileResolver` + `profileDefaultValues`.
- `src/actions/profile.actions.ts` — **novo** — `updateProfile(data)` self-scoped via `verifySession()` + `where: { id: session.user.id }`. Reusa pattern `buildAddressWrite` upsert. Fields sensíveis (role/email/isActive/tenantId) ficam fora do schema → trivialmente seguro contra DOM-payload forgery.
- `src/components/profile/profile-form.tsx` — **novo** — Client form (RHF + Controller + Field + AddressSection), espelha visualmente o `users/user-form.tsx`. Submit chama `updateProfile()`, toast + `router.refresh()`, fica na página (não navega).
- `src/app/(protected)/profile/page.tsx` — **rewrite total**:
  - Server Component busca `prisma.user.findUnique` com `include: { address: true }` pra preencher `defaultValues`
  - Header com Avatar + nome/email
  - **3 Cards**: Personal information (form editável) / Account & security (email read-only + 2 dialogs) / Danger zone (delete dialog, border destructive)
  - Labels PT antigas ("Nome:", "E-mail:") removidas
- `src/components/auth/{change-email,change-password,delete-account}-dialog.tsx` — DialogTrigger trocado de `<button className="text-sm underline">` pra `<Button variant="outline" size="sm">` (delete: `variant="destructive"`). Placeholder PT "novo@email.com" → "new@email.com".
- Avatar upload deferido (exige `/api/profile/upload` + `session.update()` no JWT callback — fora de escopo); avatar fallback continua usando iniciais.
- BMS profile page é idêntico, mas escopo era SEQ-only — BMS fica pra futura cópia.
- Verificação: `tsc --noEmit` ✅. Lint baseline mantido (15 errors pré-existentes em sales-form/data-table/proxy — nenhum nos arquivos novos).

---

Previous session: 17/05/2026 — BIG REVIEW Fase 5: APP /messages padronização por NotificationType + paginação + auditoria de routes.

**Fase 5 entregue (APP /messages refactor + audit):**
- `src/queries/notifications.ts` — rewrite total:
  - `getMessages(userId)` agora faz **1 query unificada** sobre `Notification` (antes misturava 4 sources: Tribute/FamilyRelation/AppUserGuardian + Notification). PENDING_TYPES e ACTIVITY_TYPES driven pelo enum `NotificationType`.
  - Novo `getActivityPage(userId, cursor?)` — cursor-based pagination, page size 20. Extraído pra ser reusado pelo `getMessages` e `loadMoreActivity`.
  - Novo formato uniforme `InboxItem` com `tribute`/`familyRelation`/`guardianProfile` pre-resolvidos no server. `viewerActed` calculado uma vez via `requestedById ≠ viewerId`.
  - `getUnreadCount` inalterado (header bell continua usando).
- `src/actions/messages.ts` — **novo** — server action `loadMoreActivity({ id, createdAt })` que verifica session + chama `getActivityPage`.
- `src/components/messages-list.tsx` — refator pra dispatch-by-type:
  - Eliminou 3 componentes `PendingTribute`/`PendingFamilyRequest`/`PendingGuardianRequest` + os 9 if-branches do `ActivityCard`. Substituído por DISPATCH map `Record<NotificationType, { describe, body?, image?, href?, Footer? }>`.
  - Footers de pending (`TributeActions`, `FamilyRequestActions`, `GuardianRequestActions`) ficam no dispatch e só renderizam em pending mode.
  - Novo `<LoadMoreButton>` client com `useState<InboxItem[]>` + `useTransition` que concatena páginas.
  - Removida prop `sessionUserId` (viewer-acted resolvido server-side agora).
- `src/app/(protected)/messages/page.tsx` — simplificado pra passar `data` (já contém pending + activity + nextCursor). `totalPending = data.pending.length` (antes somava tributes + family separadamente).
- **Bug fix incidental**: family-request requester não vê mais seu próprio pending request no inbox (antes filtro `OR fromId/toId = userId` incluía ambos; agora notification só vai pro consent target via `notify({ userId: otherId })`).
- **Auditoria das 9 routes APP** — fix incluído em `/api/geolocation/upload`:
  - Antes: só auth check, sem `clientPayload` → qualquer logged-in user gerava blob token
  - Depois: exige `clientPayload: { profileId }` + `canManageProfile` ownership check (espelha bio/gallery upload pattern)
  - Caller `geolocation-edit-form.tsx` atualizado pra passar `clientPayload: JSON.stringify({ profileId })`
  - Restantes routes (search, address/suggestions, geolocation/places, bio/gallery/tribute upload, stripe webhook, [...nextauth]) — auditadas, sem gaps.
- `src/actions/guardian.ts` — comment fix em `requestGuardianship` (comentário antigo dizia "plus profile itself if real APP_USER" mas o código restringe a APP_GHOST/APP_MEMO).
- Verificação: `tsc --noEmit` ✅. Lint baseline mantido (4 errors pré-existentes em home-favorites/home-memorials/memorial-edit-form — nenhum nos arquivos tocados).

**Out of scope (intencional)**:
- PENDING notifications retroativos pra rows antigas — produto pré-prod, histórico minúsculo
- Bell badge unchanged — `getUnreadCount` já era Notification-driven
- Testes: o APP tem suite **Vitest** (roda no CI via `pnpm test`) — a antiga nota "Tests: N/A por design" estava desatualizada (corrigido 01/07/2026)

---

Previous session: 16/05/2026 — BIG REVIEW Fase 4: SEQ Sales suggested price (100% markup hint).

**Fase 4 entregue (SEQ Sales suggested price):**
- `src/queries/sales.ts`: adicionado `getSuggestedSalePrice(tenantId)` privado — busca o último `Sale` não-revertido do tenant (`reversedAt: null`, `orderBy createdAt desc`), retorna `(package.price / package.quantity) * SUGGESTED_MARKUP` (constante `SUGGESTED_MARKUP = 2`). Null se tenant nunca comprou Package. Integrado em `getInventoryData` no return.
- `src/app/(protected)/sales/page.tsx`: passa `suggestedValue` pro `<SalesForm />`.
- `src/components/sales/sales-form.tsx`:
  - Nova prop `suggestedValue?: number | null`
  - Pre-fill do input `value` com `maskCurrency(formatValueAsDigits(suggestedValue))` (helper local converte número → digits "1050" → "10.50")
  - Hint condicional abaixo do `<FieldDescription>`:
    - Cinza/muted: `Suggested: $10.00 (2× last package cost)` quando valor ≥ suggested
    - Âmbar (text-amber-600): `Below suggested $10.00 (2× last package cost) — selling at a loss?` quando valor < suggested
  - Hint não aparece se `suggestedValue === null` (cold-start tenant). **Warning é puramente visual — nada bloqueia o submit.**
  - Adicionado `usd` Intl formatter (consistente com qr-store.tsx)
- Decisões alinhadas: cost basis = last Package (não weighted-avg); markup default = 100% (constante hardcoded — não DB-configurable); enforcement = só warning visual; sem override (qualquer user pode vender abaixo).
- Sem schema change, sem migration, sem mudança em `createAppSale`. Escopo mínimo.
- Verificação: `tsc --noEmit` ✅ em SEQ. Lint baseline mantido (errors pré-existentes em sales-form.tsx:83 useEffect e outros — nenhum introduzido por mim).

---

Previous session: 16/05/2026 — BIG REVIEW Fase 3: SEQ Stripe real pra QR Packages (mock killed).

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
- ~~Fase 7: Dashboards (BMS + SEQ) — agregações eficientes~~ ✅ entregue 17/05/2026
- ~~BMS profile redesign (copy from SEQ)~~ ✅ entregue 17/05/2026
- ~~SEQ/BMS avatar upload (blob route + `session.update()` no JWT callback)~~ ✅ entregue 17/05/2026
- ~~Phase 5 cleanup SQL~~ ✅ no-op (DB já estava limpo, discovery confirmou) 17/05/2026
- ~~APP migrations próprio (parar piggybacking em SEQ)~~ ✅ entregue 17/05/2026
- ~~Rate limiting IP-based (auth endpoints)~~ ✅ entregue 17/05/2026 (PostgreSQL-backed)

**BIG REVIEW status**: 100% concluída. Próximas sessões: feature work.

**BIG REVIEW achados pendentes** (consulta: `/home/douglas/.claude/plans/big-code-review-vamos-polished-meteor.md`):
- Vercel env prod: confirmar que cada app tem `AUTH_SECRET` próprio (gap não-fechado, depende de validação no painel)
- Sem rate limiting em auth endpoints (lockout por user existe; falta IP-based)
- APP não tem `prisma/migrations/` — migrations vivem em SEQ. Decisão de ownership formal pendente.

In progress: —
Next: rodar `npx prisma migrate deploy` em qualquer app pra criar `rate_limit_attempts` table no Neon; smoke tests end-to-end (avatar BMS+SEQ, dashboards, BMS profile redesign, rate limiting); setup operacional Stripe SEQ webhook endpoint em prod.
Blockers: `rate_limit_attempts` table não existe no DB ainda (até user rodar migrate deploy, qualquer call em auth action vai falhar com "table doesn't exist"); `STRIPE_WEBHOOK_SECRET` SEQ + APP em prod; `BLOB_READ_WRITE_TOKEN` em BMS+SEQ Vercel prod.

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
□ `pnpm test` — all tests pass (Vitest; blocking no CI)
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

# sentry (observability) — provisioned in sentry.io; never commit real values.
# NEXT_PUBLIC_SENTRY_DSN is per-app (public). SENTRY_AUTH_TOKEN/ORG/PROJECT are set in
# the Vercel project env for source-map upload at build (no-op locally/CI without them).
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=

# web push (VAPID) — generate once with `npx web-push generate-vapid-keys`;
# public key is public by design; missing values disable push gracefully.
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=
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

/test → Execute `pnpm test`. Se falhar, analise o erro, proponha fix, e re-execute. Repita até verde.

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