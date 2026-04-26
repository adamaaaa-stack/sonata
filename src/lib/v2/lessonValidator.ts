/**
 * Validator + auto-fixer for LLM-generated lesson YAML.
 * TypeScript port of scripts/lesson-validator.mjs — same logic, importable
 * from Next.js API routes.
 */

import yaml from "js-yaml";

interface RawInteraction {
  type?: string;
  key?: string;
  accept?: string;
  duration?: number | string;
  durations?: string[];
  keys?: string[];
  sequence?: unknown[];
  followup_cleffy?: string;
  rounds?: number | unknown[];
  options?: string[];
  correct?: number;
  tempo?: number;
  finger?: number;
  count?: number;
  guides?: boolean;
  [k: string]: unknown;
}

interface RawPage {
  id?: number;
  mode?: string;
  type?: string;
  figure?: string;
  cleffy?: string;
  followup_cleffy?: string;
  completion_cleffy?: string;
  audio?: Record<string, string>;
  interaction?: RawInteraction;
  corrections?: { wrong_label?: string; cleffy?: string }[];
}

interface RawLesson {
  id?: number;
  tier?: string;
  act?: number;
  title?: string;
  subtitle?: string;
  goal?: string;
  prereqs?: number[];
  method_focus?: string;
  time_estimate_min?: number;
  piece_context?: string | null;
  metaphor?: string;
  vibe?: string[];
  pages?: RawPage[];
  mastery_check?: {
    sections?: {
      see?: { pass_threshold: number; questions: unknown[] };
      hear?: { pass_threshold: number; questions: unknown[] };
      play?: { pass_threshold: number; questions: { accept?: string; [k: string]: unknown }[] };
    };
  };
  remediation?: { id?: string; title?: string; pages?: number; opening_cleffy?: string };
  completion?: { cleffy?: string; xp?: number; unlocks?: number };
}

const LESSON_PAGE_TYPES_BY_MODE: Record<string, string[]> = {
  see: ["hook", "definition", "wrap", "interactive_spot", "pattern_scroll"],
  hear: ["demo", "drill", "contrast"],
  play: ["guided", "practice", "free", "tap", "sequence", "song"],
  read: ["see_hear_play", "repeat_loop"],
};

function asciify(s: unknown): unknown {
  if (typeof s !== "string") return s;
  return s
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/\u2013|\u2014/g, "—")
    .replace(/\u2010|\u2011/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ");
}

function deepAsciify(node: unknown): unknown {
  if (typeof node === "string") return asciify(node);
  if (Array.isArray(node)) return node.map(deepAsciify);
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      out[k] = deepAsciify(v);
    }
    return out;
  }
  return node;
}

function fixInteraction(page: RawPage, warnings: string[], ctx: string): void {
  const it = page.interaction;
  if (!it || typeof it !== "object") return;

  if (it.type === "tap" && "key" in it && !("accept" in it)) {
    it.accept = it.key as string;
    delete it.key;
    warnings.push(`${ctx}: tap.key→accept (auto-fixed)`);
  }

  if (it.type === "tap" && "duration" in it) {
    delete it.duration;
    warnings.push(`${ctx}: tap.duration dropped (player has no duration support)`);
  }

  if (it.type === "sequence" && "durations" in it) {
    if (Array.isArray(it.sequence)) {
      it.type = "rhythm";
      warnings.push(`${ctx}: sequence with durations → promoted to type=rhythm (auto-fixed)`);
    } else if (Array.isArray(it.keys)) {
      it.sequence = it.keys;
      delete it.keys;
      it.type = "rhythm";
      warnings.push(`${ctx}: sequence.keys+durations → rhythm.sequence+durations (auto-fixed)`);
    } else {
      delete it.durations;
      warnings.push(`${ctx}: sequence.durations dropped (no matching note array)`);
    }
  }

  if (it.followup_cleffy && !page.followup_cleffy) {
    page.followup_cleffy = it.followup_cleffy;
    delete it.followup_cleffy;
    warnings.push(`${ctx}: followup_cleffy moved out of interaction (auto-fixed)`);
  }
}

function fixPage(page: RawPage, warnings: string[], idx: number): void {
  const ctx = `page ${idx}`;
  if (page.mode === "see" && page.type === "interactive") {
    page.type = "interactive_spot";
    warnings.push(`${ctx}: see/interactive→see/interactive_spot (auto-fixed)`);
  }
  fixInteraction(page, warnings, ctx);
  const allowed = page.mode ? LESSON_PAGE_TYPES_BY_MODE[page.mode] : undefined;
  if (allowed && page.type && !allowed.includes(page.type)) {
    warnings.push(`${ctx}: mode=${page.mode} with type=${page.type} (uncommon — review)`);
  }
}

function collectCleffyText(doc: RawLesson): string {
  const parts: string[] = [];
  if (Array.isArray(doc.pages)) {
    for (const p of doc.pages) {
      if (typeof p.cleffy === "string") parts.push(p.cleffy);
      if (typeof p.followup_cleffy === "string") parts.push(p.followup_cleffy);
      if (typeof p.completion_cleffy === "string") parts.push(p.completion_cleffy);
    }
  }
  if (doc.completion && typeof doc.completion.cleffy === "string") {
    parts.push(doc.completion.cleffy);
  }
  return parts.join(" ");
}

export interface ValidateResult {
  yaml: string;
  warnings: string[];
}

export function validateAndFix(rawYaml: string): ValidateResult {
  const warnings: string[] = [];
  let doc: RawLesson;
  try {
    doc = yaml.load(asciify(rawYaml) as string) as RawLesson;
  } catch (e) {
    warnings.push(`YAML parse failed: ${(e as Error).message}`);
    return { yaml: asciify(rawYaml) as string, warnings };
  }
  if (!doc || typeof doc !== "object") {
    return { yaml: rawYaml, warnings: ["Document is empty or not an object"] };
  }

  if (Array.isArray(doc.pages)) {
    doc.pages.forEach((p, i) => fixPage(p, warnings, i + 1));
  }

  const mc = doc.mastery_check;
  if (mc?.sections?.play && Array.isArray(mc.sections.play.questions)) {
    for (const q of mc.sections.play.questions) {
      if (typeof q.accept === "string" && /held for \d/.test(q.accept)) {
        warnings.push(`mastery.play: accept='${q.accept}' references duration (player ignores it)`);
      }
    }
  }

  const METHOD_TERMS = /\b(step|steps|skip|skips|leap|leaps|staircase|stair|2[-\s]?group|3[-\s]?group|middle c)\b/i;
  const allCleffy = collectCleffyText(doc);
  if (allCleffy && !METHOD_TERMS.test(allCleffy)) {
    warnings.push(
      "PEDAGOGY: lesson never mentions step/skip/leap/staircase/Middle C — off-method, consider regenerating"
    );
  }

  const cleaned = deepAsciify(doc);
  const out = yaml.dump(cleaned, {
    indent: 2,
    lineWidth: 100,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
  });

  return { yaml: out, warnings };
}
