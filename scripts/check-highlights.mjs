import fs from "node:fs";
const data = JSON.parse(fs.readFileSync("src/lib/music/lessonsV2.data.json", "utf8"));
const samples = [4, 6, 12, 14, 28];
for (const lid of samples) {
  const l = data.find((x) => x.id === lid);
  if (!l) continue;
  for (const p of l.pages) {
    if (p.mode === "play" && p.interaction?.type === "tap") {
      console.log(`L${lid} P${p.id}: highlights = ${JSON.stringify(p.highlights)}, fig="${(p.figure || "").slice(0, 60)}"`);
    }
  }
}
