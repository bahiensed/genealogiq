/**
 * Loose translator type for Zod schema factories. Structurally compatible with
 * next-intl's `useTranslations(ns)` (client) and `getTranslations(ns)` (server)
 * return values, so a schema factory can be fed either one. Messages are keyed
 * off the `Errors` namespace.
 */
export type Translator = (key: string, values?: Record<string, string | number>) => string

/** Identity translator — returns the raw key. Use only where no locale context exists. */
export const identityTranslator: Translator = (key) => key
