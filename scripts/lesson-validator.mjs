// Validator + auto-fixer for LLM-generated lesson YAML.
// Catches the schema slips we keep seeing across Gemma / Qwen / Nemotron:
//
//   1. tap interaction: { key: "C4" }       → { accept: "C4" }
//   2. tap interaction: { duration: 3 }     → drop (player has no duration support)
//   3. sequence interaction: { durations }  → drop (durations belongs to rhythm)
//   4. Typographic curly quotes / non-breaking hyphens → ASCII
//   5. interaction.followup_cleffy          → page.followup_cleffy (page-level field)
//   6. mode: "see" with type: "interactive" → mode: "see", type: "interactive_spot"
//      (existing curriculum convention)
//
// Returns: { yaml: string, warnings: string[] }
//
// Usage:
//   import { validateAndFix } from "./lesson-validator.mjs";
//   const { yaml, warnings } = validateAndFix(rawYaml);
//
// Designed to be PRESERVING — never throws, never deletes content. Worst
// case it leaves the lesson as-is and emits warnings for downstream review.

import yaml from "js-yaml";

const LESSON_PAGE_TYPES_BY_MODE = {
  see: ["hook", "definition", "wrap", "interactive_spot", "pattern_scroll"],
  hear: ["demo", "drill", "contrast"],
  play: ["guided", "practice", "free", "tap", "sequence", "song"],
  read: ["see_hear_play", "repeat_loop"],
};

function asciify(s) {
  if (typeof s !== "string") return s;
  return s
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'") // curly single quotes → '
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"') // curly double quotes → "
    .replace(/\u2013|\u2014/g, "—") // dashes → em dash (existing curriculum uses it)
    .replace(/\u2010|\u2011/g, "-") // hyphens / non-breaking hyphens → -
    .replace(/\u2026/g, "...") // ellipsis
    .replace(/\u00A0/g, " "); // non-breaking space → space
}

function deepAsciify(node) {
  if (typeof node === "string") return asciify(node);
  if (Array.isArray(node)) return node.map(deepAsciify);
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = deepAsciify(v);
    return out;
  }
  return node;
}

function fixInteraction(page, warnings, ctx) {
  const it = page.interaction;
  if (!it || typeof it !== "object") return;

  // Fix 1: tap with `key` instead of `accept`
  if (it.type === "tap" && "key" in it && !("accept" in it)) {
    it.accept = it.key;
    delete it.key;
    warnings.push(`${ctx}: tap.key→accept (auto-fixed)`);
  }

  // Fix 2: tap with `duration` (player doesn't enforce duration)
  if (it.type === "tap" && "duration" in it) {
    delete it.duration;
    warnings.push(`${ctx}: tap.duration dropped (player has no duration support)`);
  }

  // Fix 3: sequence with `durations` field (belongs on rhythm)
  if (it.type === "sequence" && "durations" in it) {
    // If the lesson really wants timing, the model meant rhythm — promote.
    if (Array.isArray(it.sequence)) {
      // It's a sequence-shaped object. Migrate to rhythm.
      it.type = "rhythm";
      warnings.push(
        `${ctx}: sequence with durations → promoted to type=rhythm (auto-fixed)`
      );
    } else if (Array.isArray(it.keys)) {
      // Sequence had keys instead of sequence. Rename keys→sequence and promote.
      it.sequence = it.keys;
      delete it.keys;
      it.type = "rhythm";
      warnings.push(
        `${ctx}: sequence.keys+durations → rhythm.sequence+durations (auto-fixed)`
      );
    } else {
      delete it.durations;
      warnings.push(`${ctx}: sequence.durations dropped (no matching note array)`);
    }
  }

  // Fix 4: followup_cleffy embedded inside the interaction block — promote to
  // the page level where it's supposed to live.
  if (it.followup_cleffy && !page.followup_cleffy) {
    page.followup_cleffy = it.followup_cleffy;
    delete it.followup_cleffy;
    warnings.push(`${ctx}: followup_cleffy moved out of interaction (auto-fixed)`);
  }
}

function collectCleffyText(doc) {
  const parts = [];
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

function fixPage(page, warnings, idx) {
  const ctx = `page ${idx}`;
  // Fix 6: see + type:"interactive" → type:"interactive_spot"
  if (page.mode === "see" && page.type === "interactive") {
    page.type = "interactive_spot";
    warnings.push(`${ctx}: see/interactive→see/interactive_spot (auto-fixed)`);
  }
  fixInteraction(page, warnings, ctx);

  // Spot-check: warn if mode/type combo looks unusual (not a fix, just a flag).
  const allowed = LESSON_PAGE_TYPES_BY_MODE[page.mode];
  if (allowed && !allowed.includes(page.type) && page.type !== undefined) {
    // Don't actually rename — just warn.
    warnings.push(
      `${ctx}: mode=${page.mode} with type=${page.type} (uncommon — review)`
    );
  }
}

export function validateAndFix(rawYaml) {
  const warnings = [];
  let doc;
  try {
    doc = yaml.load(asciify(rawYaml));
  } catch (e) {
    warnings.push(`YAML parse failed: ${e.message}`);
    return { yaml: asciify(rawYaml), warnings };
  }
  if (!doc || typeof doc !== "object") {
    return { yaml: rawYaml, warnings: ["Document is empty or not an object"] };
  }

  // Walk the lesson and fix per-page issues.
  if (Array.isArray(doc.pages)) {
    doc.pages.forEach((p, i) => fixPage(p, warnings, i + 1));
  }

  // Fix mastery_check play questions that include a duration claim.
  const mc = doc.mastery_check;
  if (mc && mc.sections && mc.sections.play && Array.isArray(mc.sections.play.questions)) {
    for (const q of mc.sections.play.questions) {
      if (typeof q.accept === "string" && /held for \d/.test(q.accept)) {
        warnings.push(
          `mastery.play: accept='${q.accept}' references duration (player ignores it)`
        );
      }
    }
  }

  // PEDAGOGICAL NORTH STAR — Sonata teaches piano through the
  // steps/skips/leaps method. Every lesson must reference this method
  // vocabulary somewhere in the cleffy text, regardless of what concept
  // the lesson teaches. If we don't see at least one of these terms,
  // the lesson is off-method.
  const METHOD_TERMS = /\b(step|steps|skip|skips|leap|leaps|staircase|stair|2[-\s]?group|3[-\s]?group|middle c)\b/i;
  const allCleffyText = collectCleffyText(doc);
  if (allCleffyText && !METHOD_TERMS.test(allCleffyText)) {
    warnings.push(
      "PEDAGOGY: lesson never mentions step/skip/leap/staircase/Middle C — off-method, consider regenerating"
    );
  }

  // Final ASCII pass on the whole tree.
  const cleaned = deepAsciify(doc);

  // Re-emit as YAML with literal-block scalars for cleffy text where useful.
  const out = yaml.dump(cleaned, {
    indent: 2,
    lineWidth: 100,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
  });

  return { yaml: out, warnings };
}
