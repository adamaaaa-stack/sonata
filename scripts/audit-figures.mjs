import fs from "node:fs";
const data = JSON.parse(fs.readFileSync("src/lib/music/lessonsV2.data.json", "utf8"));

let totalPages=0, withFigure=0, withHighlights=0;
const patterns = {
  staff: 0,           // mentions staff/clef
  keyboard: 0,        // mentions keyboard/key
  cleffy: 0,          // mentions cleffy
  staircase: 0,       // already rendered
  pyramid: 0,         // already rendered
  celebration: 0,     // already rendered
  hand_finger: 0,     // hand/finger imagery
  metronome: 0,       // metronome/tempo
  beat: 0,            // beat/rhythm
  pure_text: 0,       // no recognizable visual subject
};
const examples = {};

for (const lesson of data) {
  for (const p of lesson.pages) {
    totalPages++;
    const fig = (p.figure || "").toLowerCase();
    if (!fig) continue;
    withFigure++;
    if (p.highlights && Object.keys(p.highlights).length > 0) withHighlights++;
    
    let matched = false;
    if (/staircase|\bstairs?\b/.test(fig)) { patterns.staircase++; matched = true; }
    else if (/pyramid/.test(fig)) { patterns.pyramid++; matched = true; }
    else if (/celebration|trophy|confetti/.test(fig)) { patterns.celebration++; matched = true; }
    else if (/staff|clef|treble|bass\s+clef|grand\s+staff|ledger|notation/.test(fig)) {
      patterns.staff++; matched = true;
      if (!examples.staff) examples.staff = fig.slice(0, 120);
    }
    else if (/keyboard|piano|black.key|white.key|\bkey\b/.test(fig)) {
      patterns.keyboard++; matched = true;
      if (!examples.keyboard) examples.keyboard = fig.slice(0, 120);
    }
    else if (/finger|thumb|pinky|hand\s/.test(fig)) {
      patterns.hand_finger++; matched = true;
      if (!examples.hand_finger) examples.hand_finger = fig.slice(0, 120);
    }
    else if (/cleffy|character/.test(fig)) {
      patterns.cleffy++; matched = true;
      if (!examples.cleffy) examples.cleffy = fig.slice(0, 120);
    }
    else if (/metronome|beat|tempo|tick|click/.test(fig)) {
      patterns.metronome++; matched = true;
      if (!examples.metronome) examples.metronome = fig.slice(0, 120);
    }
    if (!matched) {
      patterns.pure_text++;
      if (!examples.pure_text) examples.pure_text = fig.slice(0, 120);
    }
  }
}

console.log(`Total pages: ${totalPages}`);
console.log(`With figure: ${withFigure}`);
console.log(`With auto-highlights: ${withHighlights}`);
console.log("\nPattern breakdown:");
for (const [k,v] of Object.entries(patterns).sort((a,b)=>b[1]-a[1])) {
  console.log(`  ${k}: ${v}  ${examples[k] ? '— "' + examples[k] + '"' : ''}`);
}
