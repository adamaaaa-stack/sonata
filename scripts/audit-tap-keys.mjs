import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const dir = "/Users/oogy/sonata/sonata-app/content/lessons";
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".yaml")).sort();

const tapAccepts = new Map();
const echoAccepts = new Map();
const rhythmShapes = new Map();
const songShapes = new Map();

for (const f of files) {
  const doc = yaml.load(fs.readFileSync(path.join(dir, f), "utf8"));
  if (!doc?.pages) continue;
  for (const p of doc.pages.filter((x) => x.mode === "play")) {
    const it = p.interaction;
    if (!it) continue;
    const summary = JSON.stringify({
      keys: it.keys, sequence: it.sequence, accept: it.accept, count: it.count,
      durations: it.durations, tempo: it.tempo, guides: it.guides,
    }).slice(0, 120);
    if (it.type === "tap") tapAccepts.set(summary, (tapAccepts.get(summary) || 0) + 1);
    if (it.type === "echo" || it.type === "see_hear_play") echoAccepts.set(summary, (echoAccepts.get(summary) || 0) + 1);
    if (it.type === "rhythm") {
      const isPitch = Array.isArray(it.sequence) && it.sequence.some((x) => typeof x === "string" && /[A-G]\d/.test(x));
      const k = isPitch ? "pitched-rhythm" : "free-rhythm";
      rhythmShapes.set(k, (rhythmShapes.get(k) || 0) + 1);
    }
    if (it.type === "song") songShapes.set(typeof it.sequence, (songShapes.get(typeof it.sequence) || 0) + 1);
  }
}

console.log("TAP variants (keys/sequence/accept/count):");
for (const [k, c] of [...tapAccepts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30)) console.log(`  ${c}× ${k}`);
console.log("\nECHO/SEE_HEAR_PLAY variants:");
for (const [k, c] of [...echoAccepts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) console.log(`  ${c}× ${k}`);
console.log("\nRHYTHM:", Object.fromEntries(rhythmShapes));
console.log("\nSONG sequence types:", Object.fromEntries(songShapes));
