import fs from "node:fs";
const data = JSON.parse(fs.readFileSync("src/lib/music/lessonsV2.data.json", "utf8"));
let totalPlay=0, chordPages=0;
const byLesson = {};
for (const l of data) {
  for (const p of l.pages) {
    if (p.mode !== "play") continue;
    totalPlay++;
    const it = p.interaction;
    if ((it?.type === "song" || it?.type === "rhythm") && Array.isArray(it.sequence)) {
      const hasChord = it.sequence.some((x) => Array.isArray(x) && x.length > 1);
      if (hasChord) {
        chordPages++;
        byLesson[l.id] = (byLesson[l.id] || 0) + 1;
      }
    }
  }
}
console.log(`Play pages total: ${totalPlay}`);
console.log(`Chord pages (will use Basic Pitch): ${chordPages} (${(chordPages*100/totalPlay).toFixed(1)}%)`);
console.log(`Lessons with chord pages: ${Object.keys(byLesson).length}`);
console.log(`First 10 chord-heavy lessons:`);
for (const [id,n] of Object.entries(byLesson).sort((a,b)=>b[1]-a[1]).slice(0,10)) {
  console.log(`  Lesson ${id}: ${n} chord pages`);
}
