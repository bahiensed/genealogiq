import { describe, it, expect } from "vitest"
import { identityTranslator } from "@genealogiq/core"
import { getDocumentSchema } from "./document.schema"

const schema = getDocumentSchema(identityTranslator)

const base = {
  title: "Birth certificate",
  description: "Issued by the civil registry.",
  category: "birth_certificate",
  fileUrl: "https://qa.public.blob.vercel-storage.com/doc.pdf",
  fileName: "birth-certificate.pdf",
  isPublic: true,
}

describe("getDocumentSchema", () => {
  it("accepts a valid document", () => {
    expect(schema.safeParse(base).success).toBe(true)
  })

  it("requires a title", () => {
    expect(schema.safeParse({ ...base, title: "" }).success).toBe(false)
  })

  it("rejects a title over 120 characters", () => {
    expect(schema.safeParse({ ...base, title: "a".repeat(121) }).success).toBe(false)
  })

  it("rejects an unknown category key", () => {
    expect(schema.safeParse({ ...base, category: "not_a_real_category" }).success).toBe(false)
  })

  it("rejects a non-blob file URL", () => {
    expect(schema.safeParse({ ...base, fileUrl: "https://evil.example.com/x.pdf" }).success).toBe(false)
  })

  it("accepts a valid Vercel Blob file URL", () => {
    const r = schema.safeParse({
      ...base,
      fileUrl: "https://qa.public.blob.vercel-storage.com/a.pdf",
    })
    expect(r.success).toBe(true)
  })

  it("accepts without description or fileName (both optional)", () => {
    const { title, category, fileUrl, isPublic } = base
    expect(schema.safeParse({ title, category, fileUrl, isPublic }).success).toBe(true)
  })

  it("rejects a description over 2000 characters", () => {
    expect(schema.safeParse({ ...base, description: "a".repeat(2001) }).success).toBe(false)
  })

  it("requires isPublic to be a boolean", () => {
    const { title, description, category, fileUrl, fileName } = base
    expect(schema.safeParse({ title, description, category, fileUrl, fileName }).success).toBe(false)
  })
})
