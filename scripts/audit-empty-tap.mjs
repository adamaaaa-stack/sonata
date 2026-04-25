import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
const dir = "/Users/oogy/sonata/sonata-app/content/lessons";
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".yaml")).sort();
const samples = [];
for (const f of files) {
  const doc = yaml.load(fs.readFileSync(path.join(dir, f), "utf8"));
  if (!doc?.pages) continue;
  for (const p of doc.pages.filter((x) => x.mode === "play")) {
    const it = p.interaction;
    if (it?.type === "tap" && !it.accept && !it.keys) {
      samples.push({
        lesson: doc.id,
        page: p.id,
        type: p.type,
        figure: (p.figure || "").slice(0, 80),
        cleffy: (p.cleffy || "").slice(0, 80),
        count: it.count,
      });
    }
  }
}
for (const s of samples.slice(0, 12)) console.log(JSON.stringify(s));
console.log(`\nTotal empty taps: ${samples.length}`);
