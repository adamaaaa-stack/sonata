import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const dir = "/Users/oogy/sonata/sonata-app/content/lessons";
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".yaml")).sort();

const noPlayLessons = [];
const playButNoSequence = [];
const allGood = [];

for (const f of files) {
  const raw = fs.readFileSync(path.join(dir, f), "utf8");
  let doc;
  try { doc = yaml.load(raw); } catch { continue; }
  if (!doc?.pages) continue;

  const playPages = doc.pages.filter((p) => p.mode === "play");
  if (playPages.length === 0) {
    noPlayLessons.push(doc.id);
    continue;
  }

  // Check each play page for a usable interaction
  let usable = 0, broken = 0;
  for (const p of playPages) {
    const it = p.interaction;
    let ok = false;
    if (!it) ok = false;
    else if (it.type === "sequence" && Array.isArray(it.keys) && it.keys.length > 0) ok = true;
    else if ((it.type === "rhythm" || it.type === "song") && Array.isArray(it.sequence) && it.sequence.length > 0) ok = true;
    else if (it.type === "drill") ok = true; // drills don't need play, they have their own UI
    if (ok) usable++; else broken++;
  }

  if (broken > 0 && usable === 0) {
    playButNoSequence.push({ id: doc.id, broken, total: playPages.length });
  } else if (broken > 0) {
    playButNoSequence.push({ id: doc.id, broken, total: playPages.length, partial: true });
  } else {
    allGood.push(doc.id);
  }
}

console.log(`Total lessons: ${files.length}`);
console.log(`✅ All play pages have sequences: ${allGood.length}`);
console.log(`⚠️  Some/all play pages broken: ${playButNoSequence.length}`);
console.log(`❌ NO play pages at all: ${noPlayLessons.length}`);
console.log("");
console.log("Lessons with no play pages:", noPlayLessons.slice(0, 30).join(", "), noPlayLessons.length > 30 ? "..." : "");
console.log("");
console.log("Lessons with broken play pages (first 20):");
for (const l of playButNoSequence.slice(0, 20)) {
  console.log(`  Lesson ${l.id}: ${l.broken}/${l.total} play pages have no usable sequence${l.partial ? " (partial)" : ""}`);
}
