/**
 * Path generator — given a user's mastered concepts and a piece's required
 * concepts, output the ordered sequence of concepts to teach.
 *
 * Algorithm:
 *   1. Compute `needed` = required \ mastered
 *   2. Expand transitively to include all unmet prereqs
 *   3. Topological sort by prereq DAG (Kahn's algorithm)
 *   4. Tie-break by `kind` order (geography → interval → hand → notation →
 *      rhythm) so the curriculum flows naturally
 *
 * No LLM, no IO. Pure data → data. Easy to test, fast to run.
 */

import conceptsData from "../../../content/concepts.json";

export interface Concept {
  id: string;
  name: string;
  kind: ConceptKind;
  description: string;
  prereqs: string[];
}

export type ConceptKind =
  | "geography"
  | "interval"
  | "hand"
  | "hand_position"
  | "notation"
  | "rhythm"
  | "dynamics";

const KIND_ORDER: Record<ConceptKind, number> = {
  geography: 1,
  interval: 2,
  hand: 3,
  hand_position: 4,
  notation: 5,
  rhythm: 6,
  dynamics: 7,
};

const ALL_CONCEPTS: Concept[] = (conceptsData as { concepts: Concept[] }).concepts;
const BY_ID = new Map(ALL_CONCEPTS.map((c) => [c.id, c]));

export function getConcept(id: string): Concept | undefined {
  return BY_ID.get(id);
}

export function getAllConcepts(): Concept[] {
  return ALL_CONCEPTS.slice();
}

/**
 * Recursively expand `seeds` to include every unmet prerequisite.
 * Returns the closed set of concept ids that need to be taught.
 */
function expandWithPrereqs(seeds: string[], mastered: Set<string>): Set<string> {
  const out = new Set<string>();
  const stack = [...seeds];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (mastered.has(id)) continue;
    if (out.has(id)) continue;
    const c = BY_ID.get(id);
    if (!c) continue;
    out.add(id);
    for (const p of c.prereqs) {
      if (!mastered.has(p) && !out.has(p)) stack.push(p);
    }
  }
  return out;
}

/**
 * Topological sort with kind-priority tie-breaking. Concepts with no
 * unmet prereqs come first; among ready concepts, sort by kind order.
 */
function topoSort(needed: Set<string>, mastered: Set<string>): string[] {
  const inDegree = new Map<string, number>();
  Array.from(needed).forEach((id) => {
    const c = BY_ID.get(id);
    if (!c) return;
    const unmet = c.prereqs.filter((p) => needed.has(p) && !mastered.has(p));
    inDegree.set(id, unmet.length);
  });

  const out: string[] = [];
  while (inDegree.size > 0) {
    const ready = Array.from(inDegree.entries())
      .filter(([, deg]) => deg === 0)
      .map(([id]) => id)
      .sort((a, b) => {
        const ca = BY_ID.get(a);
        const cb = BY_ID.get(b);
        if (!ca || !cb) return 0;
        const ko = KIND_ORDER[ca.kind] - KIND_ORDER[cb.kind];
        return ko !== 0 ? ko : ca.name.localeCompare(cb.name);
      });
    if (ready.length === 0) {
      Array.from(inDegree.keys()).forEach((id) => out.push(id));
      break;
    }
    for (const id of ready) {
      out.push(id);
      inDegree.delete(id);
      for (const c of ALL_CONCEPTS) {
        if (c.prereqs.includes(id) && inDegree.has(c.id)) {
          inDegree.set(c.id, (inDegree.get(c.id) ?? 0) - 1);
        }
      }
    }
  }
  return out;
}

export interface PathInput {
  /** Concepts the user has already mastered (assessment + completed lessons). */
  mastered: string[];
  /** Concepts the target piece requires. */
  required: string[];
}

export interface PathStep {
  conceptId: string;
  name: string;
  kind: ConceptKind;
}

export interface PathResult {
  /** Ordered list of concepts to teach, including transitive prereqs. */
  steps: PathStep[];
  /** Concepts in `required` that aren't in our ontology — caller may want to skip or warn. */
  unknownConcepts: string[];
}

export function generatePath({ mastered, required }: PathInput): PathResult {
  const masteredSet = new Set(mastered);
  const knownRequired: string[] = [];
  const unknown: string[] = [];
  for (const id of required) {
    if (BY_ID.has(id)) knownRequired.push(id);
    else unknown.push(id);
  }
  const needed = expandWithPrereqs(knownRequired, masteredSet);
  const ordered = topoSort(needed, masteredSet);
  const steps: PathStep[] = ordered.map((id) => {
    const c = BY_ID.get(id)!;
    return { conceptId: id, name: c.name, kind: c.kind };
  });
  return { steps, unknownConcepts: unknown };
}

/**
 * Convenience: generate a path for a beginner ("knows nothing") learning a
 * piece that needs the given concepts.
 */
export function generateBeginnerPath(required: string[]): PathResult {
  return generatePath({ mastered: [], required });
}
