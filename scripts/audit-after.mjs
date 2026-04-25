import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const dir = "/Users/oogy/sonata/sonata-app/content/lessons";
const data = JSON.parse(fs.readFileSync("src/lib/music/lessonsV2.data.json", "utf8"));
const byId = new Map(data.map((l) => [l.id, l]));

// Replicate parseTapAccept logic from LessonV2.tsx (key bits)
const NOTE_PCS = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };
function nameToMidi(s) {
  const m = s.match(/^([A-G](?:#|b)?)(\d)$/);
  if (!m) return null;
  return (Number(m[2]) + 1) * 12 + NOTE_PCS[m[1]];
}
function parseTap(accept) {
  if (!accept) return null;
  const lower = accept.toLowerCase();
  if (/^[A-G](#|b)?\d$/.test(accept)) return [nameToMidi(accept)].filter(Boolean);
  const all = (lo, hi, pcs) => { const o=[]; for(let m=lo;m<=hi;m++) if(!pcs||pcs.includes(m%12)) o.push(m); return o; };
  if (lower.includes("2-group")) return all(24,96,[1,3]);
  if (lower.includes("3-group")) return all(24,96,[6,8,10]);
  let lo=24,hi=96;
  if (lower.includes("lowest 3 octaves")||lower.includes("left third")) { lo=24;hi=47; }
  else if (lower.includes("highest 3 octaves")||lower.includes("right third")) { lo=72;hi=96; }
  else if (lower.includes("middle third")) { lo=48;hi=71; }
  const pc = lower.match(/(?:any\s+)?\b([a-g])(#|b)?\b/);
  if (pc && (lower.includes("any ")||/^[a-g]/.test(lower))) {
    const pcMidi = nameToMidi(pc[1].toUpperCase()+(pc[2]||"")+"4");
    if (pcMidi != null) return all(lo,hi,[pcMidi%12]);
  }
  if (lower.includes("any key")||lower==="any") return all(lo,hi);
  return null;
}

let totalPlay=0, gradablePlay=0;
const ungradable = [];
for (const lesson of data) {
  for (const p of lesson.pages) {
    if (p.mode !== "play") continue;
    totalPlay++;
    const it = p.interaction;
    let ok = false;
    if (!it) ok = false;
    else if (it.type==="sequence" && Array.isArray(it.keys) && it.keys.length>0) ok = true;
    else if ((it.type==="rhythm"||it.type==="song") && Array.isArray(it.sequence) && it.sequence.length>0) ok = true;
    else if (it.type==="drill") ok = true; // own UI
    else if (it.type==="tap") {
      const tgt = parseTap(it.accept) || (p.highlights && Object.keys(p.highlights).length>0 ? Object.keys(p.highlights).map(Number).filter(Number.isFinite) : null);
      ok = !!(tgt && tgt.length > 0);
    }
    if (ok) gradablePlay++;
    else ungradable.push({ lesson: lesson.id, page: p.id, type: it?.type || "(none)", accept: it?.accept });
  }
}
console.log(`Total play pages: ${totalPlay}`);
console.log(`Now gradable (mic card will appear): ${gradablePlay} (${(gradablePlay*100/totalPlay).toFixed(1)}%)`);
console.log(`Still ungradable: ${ungradable.length}`);
console.log("\nUngradable breakdown:");
const by = {};
for (const u of ungradable) { const k=u.type; by[k]=(by[k]||0)+1; }
for (const [k,v] of Object.entries(by).sort((a,b)=>b[1]-a[1])) console.log(`  ${k}: ${v}`);
console.log("\nFirst 10:");
for (const u of ungradable.slice(0,10)) console.log(`  L${u.lesson} P${u.page} type=${u.type} accept=${u.accept}`);
