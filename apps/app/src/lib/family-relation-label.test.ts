import { describe, it, expect } from "vitest"
import { identityTranslator } from "@genealogiq/core"
import { findRelationPath, relationFromRoot } from "./family-relation-label"
import type { TreePerson, TreeRelation } from "@/queries/family-tree"

const person = (id: string, overrides: Partial<TreePerson> = {}): TreePerson => ({
  id,
  firstName: id,
  lastName: "Test",
  maidenName: null,
  nickname: null,
  gender: null,
  avatarUrl: null,
  birthDate: null,
  birthPlace: null,
  birthCountry: null,
  deathDate: null,
  deathPlace: null,
  deathCountry: null,
  birthYear: null,
  deathYear: null,
  petSpecies: null,
  petBreed: null,
  role: "APP_USER",
  pending: false,
  ...overrides,
})

const personsOf = (...ids: string[]): Record<string, TreePerson> =>
  Object.fromEntries(ids.map((id) => [id, person(id)]))

const parentOf = (fromId: string, toId: string, subtype: string | null = null): TreeRelation => ({
  id: `parent-${fromId}-${toId}`,
  type: "PARENT_OF",
  subtype,
  fromId,
  toId,
  startDate: null,
  endDate: null,
  status: "ACCEPTED",
  requestedById: null,
})

const spouseRel = (fromId: string, toId: string): TreeRelation => ({
  id: `spouse-${fromId}-${toId}`,
  type: "SPOUSE",
  subtype: "married",
  fromId,
  toId,
  startDate: null,
  endDate: null,
  status: "ACCEPTED",
  requestedById: null,
})

const siblingRel = (fromId: string, toId: string, subtype: string | null = null): TreeRelation => ({
  id: `sibling-${fromId}-${toId}`,
  type: "SIBLING",
  subtype,
  fromId,
  toId,
  startDate: null,
  endDate: null,
  status: "ACCEPTED",
  requestedById: null,
})

describe("findRelationPath", () => {
  it("returns null for a path to yourself", () => {
    const relations: TreeRelation[] = [parentOf("a", "b")]
    expect(findRelationPath(relations, "a", "a")).toBeNull()
  })

  it("finds a direct PARENT_OF hop in each direction, carrying the relation id", () => {
    const relations = [parentOf("mom", "kid")]
    const down = findRelationPath(relations, "mom", "kid")
    expect(down).toEqual({ targetId: "kid", steps: [{ via: "child", toId: "kid", relationId: "parent-mom-kid", isStep: false }] })

    const up = findRelationPath(relations, "kid", "mom")
    expect(up).toEqual({ targetId: "mom", steps: [{ via: "parent", toId: "mom", relationId: "parent-mom-kid", isStep: false }] })
  })

  it("finds a direct SPOUSE hop symmetrically", () => {
    const relations = [spouseRel("a", "b")]
    expect(findRelationPath(relations, "a", "b")?.steps).toEqual([{ via: "spouse", toId: "b", relationId: "spouse-a-b", isStep: false }])
    expect(findRelationPath(relations, "b", "a")?.steps).toEqual([{ via: "spouse", toId: "a", relationId: "spouse-a-b", isStep: false }])
  })

  it("finds a 2-hop grandparent path via two chained PARENT_OF relations", () => {
    const relations = [parentOf("grandpa", "dad"), parentOf("dad", "kid")]
    const path = findRelationPath(relations, "kid", "grandpa")
    expect(path?.steps.map((s) => s.via)).toEqual(["parent", "parent"])
    expect(path?.steps.map((s) => s.toId)).toEqual(["dad", "grandpa"])
  })

  it("flags a step/adopted PARENT_OF hop", () => {
    const relations = [parentOf("stepdad", "kid", "step")]
    const path = findRelationPath(relations, "kid", "stepdad")
    expect(path?.steps[0].isStep).toBe(true)
  })

  it("flags a half/step SIBLING hop", () => {
    const relations = [siblingRel("a", "b", "half")]
    const path = findRelationPath(relations, "a", "b")
    expect(path?.steps[0].isStep).toBe(true)
  })

  it("returns null when the target is unreachable within maxHops", () => {
    // a -> b -> c -> d -> e (4 hops); maxHops=2 can't reach e.
    const relations = [parentOf("a", "b"), parentOf("b", "c"), parentOf("c", "d"), parentOf("d", "e")]
    expect(findRelationPath(relations, "a", "e", 2)).toBeNull()
    expect(findRelationPath(relations, "a", "e", 4)?.targetId).toBe("e")
  })

  it("returns null for two people with no connecting path at all", () => {
    const relations = [parentOf("a", "b")]
    expect(findRelationPath(relations, "a", "stranger")).toBeNull()
  })

  it("finds the shortest of two paths when a cousin marriage creates a cycle", () => {
    // subject -> f -> fp -> ggp, and independently subject -> f -> m (spouse)
    // -> mp -> ggp: the direct subject->f->fp->ggp (3 hops) must win over any
    // longer route through m.
    const relations = [
      parentOf("f", "subject"), parentOf("m", "subject"), spouseRel("f", "m"),
      parentOf("fp", "f"), parentOf("mp", "m"),
      parentOf("ggp", "fp"), parentOf("ggp", "mp"),
    ]
    const path = findRelationPath(relations, "subject", "ggp")
    expect(path?.steps).toHaveLength(3)
  })
})

describe("relationFromRoot (regression, post-refactor)", () => {
  it("labels a direct parent", () => {
    const persons = personsOf("mom", "kid")
    persons.mom.gender = "FEMALE"
    const relations = [parentOf("mom", "kid")]
    expect(relationFromRoot(persons, relations, "kid", "mom", identityTranslator)).toBe("relation.mother")
  })

  it("labels a 3-hop cousin", () => {
    // This module walks explicit TreeRelation records only — unlike the
    // layout engine's family-units.ts, it does NOT infer siblinghood from a
    // shared parent, so "parent" and "auntUncle" need an explicit SIBLING
    // relation for the parent>sibling>child cousin path to resolve.
    const persons = personsOf("subject", "parent", "auntUncle", "cousin")
    const relations = [
      parentOf("parent", "subject"),
      siblingRel("parent", "auntUncle"),
      parentOf("auntUncle", "cousin"),
    ]
    expect(relationFromRoot(persons, relations, "subject", "cousin", identityTranslator)).toBe("relation.cousin")
  })

  it("returns null for the root itself", () => {
    const persons = personsOf("subject")
    expect(relationFromRoot(persons, [], "subject", "subject", identityTranslator)).toBeNull()
  })

  it("falls back to relation.relative when unreachable within 4 hops", () => {
    const relations = [parentOf("a", "b"), parentOf("b", "c"), parentOf("c", "d"), parentOf("d", "e")]
    const persons = personsOf("a", "b", "c", "d", "e")
    expect(relationFromRoot(persons, relations, "a", "e", identityTranslator)).toBe("relation.relative")
  })
})

describe("relationFromRoot with possessive=false (compare tool)", () => {
  // The compare tool's sentence ("{target} is {root}'s {label}") already
  // names both people — the possessive "relation.*" keys ("Your cousin")
  // would wrongly claim the relationship is to the reader, so this mode
  // must read from "relation.bare.*" ("cousin") instead.
  it("reads from relation.bare.* instead of relation.*", () => {
    const persons = personsOf("mom", "kid")
    persons.mom.gender = "FEMALE"
    const relations = [parentOf("mom", "kid")]
    expect(relationFromRoot(persons, relations, "kid", "mom", identityTranslator, false)).toBe("relation.bare.mother")
  })

  it("still falls back to relation.bare.relative (not relation.relative) when unreachable", () => {
    const relations = [parentOf("a", "b"), parentOf("b", "c"), parentOf("c", "d"), parentOf("d", "e")]
    const persons = personsOf("a", "b", "c", "d", "e")
    expect(relationFromRoot(persons, relations, "a", "e", identityTranslator, false)).toBe("relation.bare.relative")
  })

  it("applies gender/step branching identically to the possessive form, just under relation.bare.*", () => {
    const persons = personsOf("stepdad", "kid")
    const relations = [parentOf("stepdad", "kid", "step")]
    expect(relationFromRoot(persons, relations, "kid", "stepdad", identityTranslator, false)).toBe("relation.bare.stepFather")
  })
})
