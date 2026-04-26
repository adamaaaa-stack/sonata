#!/usr/bin/env node
// Smoke test for the path generator. No deps, no fixtures — just runs
// the algorithm against three realistic scenarios and prints the paths.
//
// Usage: node scripts/test-path-generator.mjs

import fs from "node:fs";
import path from "node:path";

// Inline-load concepts so we don't need to compile TS.
const data = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "content/concepts.json"), "utf8")
);
const ALL = data.concepts;
const BY_ID = new Map(ALL.map((c) => [c.id, c]));

const KIND_ORDER = {
  geography: 1, interval: 2, hand: 3, hand_position: 4,
  notation: 5, rhythm: 6, dynamics: 7,
};

function expandWithPrereqs(seeds, mastered) {
  const out = new Set();
  const stack = [...seeds];
  while (stack.length > 0) {
    const id = stack.pop();
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

function topoSort(needed, mastered) {
  const inDegree = new Map();
  for (const id of needed) {
    const c = BY_ID.get(id);
    if (!c) continue;
    const unmet = c.prereqs.filter((p) => needed.has(p) && !mastered.has(p));
    inDegree.set(id, unmet.length);
  }
  const out = [];
  while (inDegree.size > 0) {
    const ready = [...inDegree.entries()]
      .filter(([, deg]) => deg === 0)
      .map(([id]) => id)
      .sort((a, b) => {
        const ca = BY_ID.get(a), cb = BY_ID.get(b);
        const ko = KIND_ORDER[ca.kind] - KIND_ORDER[cb.kind];
        return ko !== 0 ? ko : ca.name.localeCompare(cb.name);
      });
    if (ready.length === 0) { for (const id of inDegree.keys()) out.push(id); break; }
    for (const id of ready) {
      out.push(id);
      inDegree.delete(id);
      for (const c of ALL) {
        if (c.prereqs.includes(id) && inDegree.has(c.id)) {
          inDegree.set(c.id, (inDegree.get(c.id) ?? 0) - 1);
        }
      }
    }
  }
  return out;
}

function generatePath(mastered, required) {
  const masteredSet = new Set(mastered);
  const needed = expandWithPrereqs(required, masteredSet);
  return topoSort(needed, masteredSet);
}

function printPath(label, mastered, required) {
  const path = generatePath(mastered, required);
  console.log(`\n═══ ${label} ═══`);
  console.log(`Mastered: ${mastered.length === 0 ? "(none)" : mastered.join(", ")}`);
  console.log(`Required: ${required.join(", ")}`);
  console.log(`Path length: ${path.length} concepts\n`);
  for (let i = 0; i < path.length; i++) {
    const c = BY_ID.get(path[i]);
    console.log(`  ${String(i + 1).padStart(2)}. [${c.kind}] ${c.name}`);
  }
}

// Scenario 1: complete beginner uploads "Hot Cross Buns"
// (E-D-C melody, RH only, simple quarter+half rhythm, C major)
printPath(
  "Complete beginner → Hot Cross Buns",
  [],
  [
    "middle_c", "step_interval", "right_hand", "c_position_rh",
    "quarter_note", "half_note", "treble_clef",
    "key_signature_c", "time_signature_4_4",
  ]
);

// Scenario 2: knows their basic geography, uploads a simple folk tune
// in G major
printPath(
  "Knows basics → simple folk tune in G major",
  ["middle_c", "two_group", "three_group", "white_keys", "right_hand", "left_hand"],
  [
    "finding_g", "step_interval", "skip_interval", "treble_clef",
    "staff_lines", "staff_spaces", "key_signature_g", "sharp",
    "quarter_note", "half_note", "dotted_half_note", "time_signature_3_4",
  ]
);

// Scenario 3: intermediate-ish, uploads a piece in F major with both hands
printPath(
  "Intermediate → both hands, F major, includes dotted half + 4/4",
  [
    "middle_c", "step_interval", "skip_interval", "leap_interval",
    "right_hand", "left_hand", "finger_numbers", "treble_clef",
    "key_signature_c", "quarter_note", "half_note", "whole_note",
    "time_signature_4_4", "white_keys", "two_group", "three_group",
  ],
  [
    "finding_f", "key_signature_f", "flat", "bass_clef", "grand_staff",
    "c_position_rh", "c_position_lh", "dotted_half_note", "octave",
    "ledger_lines",
  ]
);
