import fs from "node:fs";
const data = JSON.parse(fs.readFileSync("src/lib/music/lessonsV2.data.json", "utf8"));

let totalPages=0, withFigure=0;
const renderer = {
  CelebrationCard: 0, Pyramid: 0, Staircase: 0, Cleffy: 0,
  HandDiagram: 0, RhythmDisplay: 0, StaffMini: 0, KeyboardMini: 0,
  GenericFigureCard: 0,
};

function pickRenderer(lesson, page, pageIdx) {
  const fig = (page.figure || "").toLowerCase();
  const isFirstPage = pageIdx === 0;
  if (page.type === "wrap" && (lesson.is_graduation || lesson.is_tier_boss || lesson.is_mid_boss || lesson.is_act_boss)) return "CelebrationCard";
  if (typeof page.type === "string" && page.type.startsWith("reflection")) return "Pyramid";
  if (page.type === "whats_next" || page.type === "whats_next_life_after") return "Pyramid";
  if (fig.includes("pyramid")) return "Pyramid";
  if (/staircase|stairs|stair/.test(fig)) return "Staircase";
  if (page.type === "hook" || (isFirstPage && fig.includes("cleffy"))) return "Cleffy";
  if (/celebration|trophy|complete|confetti/.test(fig)) return "CelebrationCard";
  if (/finger|thumb|pinky|hand|palm/.test(fig)) return "HandDiagram";
  if (/metronome|time signature|beat|tempo|whole note|half note|quarter note|eighth note|4\/4|3\/4|2\/4|6\/8/.test(fig)) return "RhythmDisplay";
  if (/staff|clef|treble|bass clef|grand staff|ledger|notation|music line/.test(fig)) return "StaffMini";
  if (/keyboard|piano|black-key|black key|white key|white-key|2-group|3-group/.test(fig)) return "KeyboardMini";
  const hl = page.highlights ? Object.keys(page.highlights).length : 0;
  if (hl > 0) return "KeyboardMini";
  return "GenericFigureCard";
}

for (const lesson of data) {
  for (let i = 0; i < lesson.pages.length; i++) {
    const p = lesson.pages[i];
    totalPages++;
    if (!p.figure) continue;
    withFigure++;
    const r = pickRenderer(lesson, p, i);
    renderer[r]++;
  }
}
console.log(`Total pages: ${totalPages}`);
console.log(`With figure: ${withFigure}\n`);
console.log("Renderer distribution:");
for (const [k,v] of Object.entries(renderer).sort((a,b)=>b[1]-a[1])) {
  console.log(`  ${k}: ${v} (${(v*100/withFigure).toFixed(1)}%)`);
}
