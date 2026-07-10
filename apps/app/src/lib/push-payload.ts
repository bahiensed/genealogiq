// Pure builders behind web push notifications (see lib/push.ts for the send
// side and public/sw.js for the receive side). No server-only/prisma/web-push
// imports so everything here unit-tests in the node Vitest environment.
//
// The per-type copy lives here — NOT in messages/*.json — because it is
// consumed at send time (outside next-intl's request pipeline) and displayed
// by the service worker (which has no i18n runtime). Trilingual parity is
// enforced structurally by the Record type instead of the JSON parity gates.

import type { NotificationType } from "@genealogiq/db"
import { DEFAULT_LOCALE, isSupportedLocale, type SupportedLocale } from "@genealogiq/i18n"

export interface PushPayload {
  title: string
  body: string
  url: string
  tag: string
}

type PushCopy = Record<NotificationType, { title: string; body: string }>

// Copy is deliberately generic (no actor names): it avoids an extra query at
// send time and keeps personal names off lock screens. Detail is one tap away.
export const PUSH_COPY: Record<SupportedLocale, PushCopy> = {
  "en-US": {
    TRIBUTE_PENDING: {
      title: "New tribute to review",
      body: "Someone wrote a tribute that is waiting for your approval.",
    },
    TRIBUTE_APPROVED: {
      title: "Tribute approved",
      body: "Your tribute was approved and is now published.",
    },
    TRIBUTE_REJECTED: {
      title: "Tribute declined",
      body: "Your tribute was declined.",
    },
    FAMILY_REQUEST_PENDING: {
      title: "Family tree invitation",
      body: "Someone invited you to join their family tree.",
    },
    FAMILY_REQUEST_ACCEPTED: {
      title: "Invitation accepted",
      body: "Your family tree invitation was accepted.",
    },
    FAMILY_REQUEST_REJECTED: {
      title: "Invitation declined",
      body: "Your family tree invitation was declined.",
    },
    GUARDIAN_REQUEST_PENDING: {
      title: "Co-management request",
      body: "Someone wants to co-manage a profile you manage.",
    },
    GUARDIAN_REQUEST_ACCEPTED: {
      title: "Request accepted",
      body: "You were granted co-management of a profile.",
    },
    GUARDIAN_REQUEST_REJECTED: {
      title: "Request declined",
      body: "Your co-management request was declined.",
    },
  },
  "pt-BR": {
    TRIBUTE_PENDING: {
      title: "Nova homenagem para revisar",
      body: "Alguém escreveu uma homenagem que aguarda sua aprovação.",
    },
    TRIBUTE_APPROVED: {
      title: "Homenagem aprovada",
      body: "Sua homenagem foi aprovada e já está publicada.",
    },
    TRIBUTE_REJECTED: {
      title: "Homenagem recusada",
      body: "Sua homenagem foi recusada.",
    },
    FAMILY_REQUEST_PENDING: {
      title: "Convite para a árvore",
      body: "Alguém convidou você para entrar na árvore genealógica.",
    },
    FAMILY_REQUEST_ACCEPTED: {
      title: "Convite aceito",
      body: "Seu convite para a árvore foi aceito.",
    },
    FAMILY_REQUEST_REJECTED: {
      title: "Convite recusado",
      body: "Seu convite para a árvore foi recusado.",
    },
    GUARDIAN_REQUEST_PENDING: {
      title: "Pedido de cogerenciamento",
      body: "Alguém quer cogerenciar um perfil que você gerencia.",
    },
    GUARDIAN_REQUEST_ACCEPTED: {
      title: "Pedido aceito",
      body: "Você recebeu o cogerenciamento de um perfil.",
    },
    GUARDIAN_REQUEST_REJECTED: {
      title: "Pedido recusado",
      body: "Seu pedido de cogerenciamento foi recusado.",
    },
  },
  "es-MX": {
    TRIBUTE_PENDING: {
      title: "Nuevo homenaje por revisar",
      body: "Alguien escribió un homenaje que espera tu aprobación.",
    },
    TRIBUTE_APPROVED: {
      title: "Homenaje aprobado",
      body: "Tu homenaje fue aprobado y ya está publicado.",
    },
    TRIBUTE_REJECTED: {
      title: "Homenaje rechazado",
      body: "Tu homenaje fue rechazado.",
    },
    FAMILY_REQUEST_PENDING: {
      title: "Invitación al árbol",
      body: "Alguien te invitó a unirte a su árbol genealógico.",
    },
    FAMILY_REQUEST_ACCEPTED: {
      title: "Invitación aceptada",
      body: "Tu invitación al árbol fue aceptada.",
    },
    FAMILY_REQUEST_REJECTED: {
      title: "Invitación rechazada",
      body: "Tu invitación al árbol fue rechazada.",
    },
    GUARDIAN_REQUEST_PENDING: {
      title: "Solicitud de cogestión",
      body: "Alguien quiere cogestionar un perfil que administras.",
    },
    GUARDIAN_REQUEST_ACCEPTED: {
      title: "Solicitud aceptada",
      body: "Se te concedió la cogestión de un perfil.",
    },
    GUARDIAN_REQUEST_REJECTED: {
      title: "Solicitud rechazada",
      body: "Tu solicitud de cogestión fue rechazada.",
    },
  },
}

/** Recipient locale comes from AppUser.preferredLocale, which may be null. */
export function normalizePushLocale(raw: string | null | undefined): SupportedLocale {
  return isSupportedLocale(raw) ? raw : DEFAULT_LOCALE
}

export function buildPushPayload(args: {
  type: NotificationType
  locale: string | null | undefined
  url: string
  entityId: string | null
}): PushPayload {
  const copy = PUSH_COPY[normalizePushLocale(args.locale)][args.type]
  return {
    title: copy.title,
    body: copy.body,
    url: args.url,
    // Same entity → same tag → browsers collapse repeats; distinct entities stack.
    tag: `giq:${args.type}:${args.entityId ?? "general"}`,
  }
}

/** 404/410 mean the endpoint is permanently gone — delete the subscription. */
export function shouldPruneSubscription(statusCode: number | undefined): boolean {
  return statusCode === 404 || statusCode === 410
}
