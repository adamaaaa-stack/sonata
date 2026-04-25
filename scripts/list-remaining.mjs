import fs from "node:fs";
const data = JSON.parse(fs.readFileSync("src/lib/music/lessonsV2.data.json", "utf8"));
for (const lesson of data) {
  for (const p of lesson.pages) {
    if (p.mode !== "play") continue;
    const it = p.interaction;
    let ok = false;
    if (!it) ok = false;
    else if (it.type==="sequence" && Array.isArray(it.keys) && it.keys.length>0) ok = true;
    else if ((it.type==="rhythm"||it.type==="song") && Array.isArray(it.sequence) && it.sequence.length>0) ok = true;
    else if (it.type==="drill") ok = true;
    else if (it.type==="tap") {
      const hasAccept = it.accept && typeof it.accept === "string";
      const hasHighlights = p.highlights && Object.keys(p.highlights).length > 0;
      ok = !!(hasAccept || hasHighlights);
    }
    if (!ok) console.log(`L${lesson.id}.${p.id} type=${p.type}/${it?.type||"none"} accept=${JSON.stringify(it?.accept)} hi=${JSON.stringify(p.highlights||null)?.slice(0,40)} fig="${(p.figure||"").slice(0,60)}"`);
  }
}
