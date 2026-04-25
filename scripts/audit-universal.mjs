import fs from "node:fs";
const data = JSON.parse(fs.readFileSync("src/lib/music/lessonsV2.data.json", "utf8"));
let totalPlay = 0, withCard = 0, withSpecificTarget = 0;
for (const l of data) for (const p of l.pages) {
  if (p.mode !== "play") continue;
  totalPlay++;
  // Mic card now appears on every play page
  withCard++;
  // Specific target = something other than universal fallback
  const it = p.interaction;
  let specific = false;
  if (it?.type === "sequence" && Array.isArray(it.keys) && it.keys.length > 0) specific = true;
  else if ((it?.type === "rhythm" || it?.type === "song") && Array.isArray(it.sequence) && it.sequence.length > 0) specific = true;
  else if (it?.accept) specific = true;
  else if (p.highlights && Object.keys(p.highlights).length > 0) specific = true;
  if (specific) withSpecificTarget++;
}
console.log(`Total play pages: ${totalPlay}`);
console.log(`With mic card (always): ${withCard} (100%)`);
console.log(`With specific note grading: ${withSpecificTarget} (${(withSpecificTarget*100/totalPlay).toFixed(1)}%)`);
console.log(`With permissive any-note: ${totalPlay-withSpecificTarget}`);
