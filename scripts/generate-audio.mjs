#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

// Load env
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([^=]+)=(.+)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}
const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) { console.error('No OPENAI_API_KEY'); process.exit(1); }

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'audio');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Parse lesson texts
const content = fs.readFileSync(path.join(process.cwd(), 'src', 'lib', 'music', 'lessons.ts'), 'utf-8');
const texts = [];
const re = /text:"((?:[^"\\]|\\.)*)"/g;
let m;
while ((m = re.exec(content)) !== null) {
  texts.push(m[1].replace(/\\'/g,"'").replace(/\\"/g,'"').replace(/\\n/g,'\n').replace(/\\\\/g,'\\'));
}

// Map to lessons
const lre = /\{ id:(\d+),/g;
const bounds = [];
while ((m = lre.exec(content)) !== null) bounds.push({ id: parseInt(m[1]), pos: m.index });
const lessonSteps = bounds.map((b, i) => {
  const section = content.substring(b.pos, i < bounds.length - 1 ? bounds[i+1].pos : content.length);
  return { id: b.id, steps: (section.match(/text:"/g) || []).length };
});

console.log(`${texts.length} steps, ${lessonSteps.length} lessons`);

let idx = 0, bytes = 0, chars = 0, gen = 0, skip = 0;

for (const lesson of lessonSteps) {
  console.log(`\nLesson ${lesson.id} (${lesson.steps} steps)`);
  for (let s = 0; s < lesson.steps; s++) {
    const file = `L${lesson.id}-S${s+1}.mp3`;
    const out = path.join(OUTPUT_DIR, file);
    const text = texts[idx++];
    if (!text) continue;
    if (fs.existsSync(out) && fs.statSync(out).size > 1000) { skip++; continue; }
    try {
      const res = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'tts-1', input: text.substring(0, 4096), voice: 'nova', response_format: 'mp3', speed: 1.0 })
      });
      if (!res.ok) { const e = await res.text(); console.log(`  ${file} FAIL: ${e.substring(0,100)}`); continue; }
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(out, buf);
      bytes += buf.length; chars += text.length; gen++;
      console.log(`  ${file} ${(buf.length/1024).toFixed(0)}KB`);
      await new Promise(r => setTimeout(r, 200));
    } catch(e) { console.log(`  ${file} ERROR: ${e.message}`); }
  }
}

console.log(`\nDone: ${gen} generated, ${skip} skipped`);
console.log(`${(bytes/1024/1024).toFixed(1)}MB audio, ${chars.toLocaleString()} chars`);
console.log(`Cost: ~$${(chars/1000*0.015).toFixed(2)}`);
