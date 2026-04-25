import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const dir = "/Users/oogy/sonata/sonata-app/content/lessons";

// Sample several "broken" lessons in detail
const sample = [3, 4, 11, 12, 14, 23, 24, 26, 27, 1, 13, 108, 158, 236];

for (const id of sample) {
  const f = `lesson-${String(id).padStart(3, "0")}.yaml`;
  const raw = fs.readFileSync(path.join(dir, f), "utf8");
  const doc = yaml.load(raw);
  console.log(`\n========== Lesson ${id}: ${doc.title} ==========`);
  for (const p of doc.pages) {
    const it = p.interaction;
    const itDesc = it ? `interaction.type=${it.type} keys=${JSON.stringify(it.keys || it.sequence || it.count || it.accept || null).slice(0,80)}` : "no interaction";
    console.log(`  page ${p.id} mode=${p.mode} type=${p.type}  → ${itDesc}`);
  }
}
