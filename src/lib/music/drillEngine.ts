// ============================================================
// DRILL ENGINE — Question generation and note pools
// ============================================================

import {
  NOTE_NAMES, noteToMidi, intervalName,
  analyzeInterval,
  makeABC, makeChordABC, noteToABC, IntervalInfo
} from './noteHelpers';
import { getIntervalAccuracy } from './storage';

// Note pools
export const trebleNotes = ['C4','D4','E4','F4','G4','A4','B4','C5','D5','E5','F5','G5'];
export const trebleLedger = ['A3','B3',...trebleNotes,'A5','B5','C6'];
export const bassNotes = ['E2','F2','G2','A2','B2','C3','D3','E3','F3','G3','A3','B3'];
export const bassLedger = ['C2','D2',...bassNotes,'C4','D4'];

// Utilities
export function rnd<T>(arr: T[]): T { return arr[Math.floor(Math.random()*arr.length)]; }
export function ri(a: number, b: number): number { return a+Math.floor(Math.random()*(b-a+1)); }
export function shuffle<T>(a: T[]): T[] {
  const b=[...a];
  for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}
  return b;
}

export function getPool(clef: string, range: string): string[] {
  if(clef==='treble') return range==='ledger'?trebleLedger:trebleNotes;
  return range==='ledger'?bassLedger:bassNotes;
}

// Question type
export interface Question {
  type: string;
  abc: string;
  correctAnswer: string;
  answerOptions: string[];
  pianoHighlight: Record<number, string>;
  clef: string;
  label: string;
  intervalInfo?: IntervalInfo;
  explanation?: string;
  isAI?: boolean;
}

// Drill config
export interface DrillConfig {
  types: string[];
  clefs: string[];
  range: string;
  intervals: number[];
  timer: number | null;
  count: number;
  answerMode?: string;
  isAI?: boolean;
}

// Key signatures
export const KEY_SIGS = [
  { key:'C', sharps:0, flats:0, abc:'C' },
  { key:'G', sharps:1, flats:0, abc:'G' },
  { key:'D', sharps:2, flats:0, abc:'D' },
  { key:'A', sharps:3, flats:0, abc:'A' },
  { key:'F', sharps:0, flats:1, abc:'F' },
  { key:'Bb', sharps:0, flats:2, abc:'Bb' },
  { key:'Eb', sharps:0, flats:3, abc:'Eb' },
  { key:'Ab', sharps:0, flats:4, abc:'Ab' },
];

// Rhythm patterns
export interface RhythmPattern {
  name: string;
  pattern: number[];
  timeSignature: string;
  bpm: number;
  difficulty: string;
}

export const RHYTHM_PATTERNS: RhythmPattern[] = [
  { name:'Quarter notes', pattern:[1,1,1,1], timeSignature:'4/4', bpm:80, difficulty:'beginner' },
  { name:'Half + quarters', pattern:[2,1,1], timeSignature:'4/4', bpm:80, difficulty:'beginner' },
  { name:'Whole note', pattern:[4], timeSignature:'4/4', bpm:80, difficulty:'beginner' },
  { name:'Eighth notes', pattern:[0.5,0.5,1,0.5,0.5,1], timeSignature:'4/4', bpm:90, difficulty:'intermediate' },
  { name:'Dotted quarter', pattern:[1.5,0.5,1,1], timeSignature:'4/4', bpm:85, difficulty:'intermediate' },
  { name:'Syncopation', pattern:[0.5,1,0.5,1,1], timeSignature:'4/4', bpm:85, difficulty:'intermediate' },
  { name:'Triplets', pattern:[0.333,0.333,0.334,1,1,1], timeSignature:'4/4', bpm:75, difficulty:'advanced' },
  { name:'6/8 feel', pattern:[0.5,0.5,0.5,0.5,0.5,0.5], timeSignature:'6/8', bpm:100, difficulty:'advanced' },
  { name:'Dotted eighth', pattern:[0.75,0.25,0.75,0.25,1,1], timeSignature:'4/4', bpm:80, difficulty:'advanced' },
];

// Generators
export function genNoteNaming(clef?: string, range?: string): Question {
  const pool = getPool(clef||rnd(['treble','bass']), range||'staff');
  const note = rnd(pool);
  const letter = note[0];
  const usedClef = pool===trebleNotes||pool===trebleLedger?'treble':'bass';
  return { type:'noteNaming', abc:makeABC([note],usedClef), correctAnswer:letter, answerOptions:NOTE_NAMES, pianoHighlight:{[noteToMidi(note)]:'#FFD700'}, clef:usedClef, label:'Name this note' };
}

export function genInterval(clefs?: string[], intervals?: number[]): Question {
  const clef = rnd(clefs||['treble','bass']);
  const pool = getPool(clef,'staff');
  const size = rnd(intervals||[2,3,4,5]);
  const dir = rnd(['up','down']);
  let i1: number, i2: number;
  if(dir==='up') { i1=ri(0,pool.length-1-size); i2=i1+size; }
  else { i1=ri(size,pool.length-1); i2=i1-size; }
  if(i2<0||i2>=pool.length) return genInterval(clefs,intervals);
  const n1=pool[i1], n2=pool[i2];
  const info = analyzeInterval(n1,n2);
  const ans = info.name + ' ' + info.direction;
  const allOpts: string[] = [];
  ['up','down'].forEach(d => { ['2nd','3rd','4th','5th','6th','7th'].forEach(n => allOpts.push(n+' '+d)); });
  const wrong = shuffle(allOpts.filter(o=>o!==ans)).slice(0,4);
  const opts = shuffle([ans,...wrong]);
  return { type:'interval', abc:makeABC([n1,n2],clef), correctAnswer:ans, answerOptions:opts, pianoHighlight:{[noteToMidi(n1)]:info.color,[noteToMidi(n2)]:info.color}, clef, label:'What interval? (grey → black)', intervalInfo:info };
}

export function genOddEven(clefs?: string[]): Question {
  const clef = rnd(clefs||['treble','bass']);
  const pool = getPool(clef,'staff');
  const size = ri(2,7);
  const i1 = ri(0,pool.length-1-size);
  const i2 = i1+size;
  if(i2>=pool.length) return genOddEven(clefs);
  const n1=pool[i1], n2=pool[i2];
  const info = analyzeInterval(n1,n2);
  const ans = info.isOdd ? 'Odd' : 'Even';
  const explain = info.isOdd ? `${info.name} is odd — same visual type` : `${info.name} is even — crosses types`;
  return { type:'oddEven', abc:makeABC([n1,n2],clef), correctAnswer:ans, answerOptions:['Odd','Even'], pianoHighlight:{[noteToMidi(n1)]:'#8B5CF6',[noteToMidi(n2)]:'#8B5CF6'}, clef, label:'Odd or even interval?', explanation:explain };
}

export function genPattern(clef?: string): Question {
  const cl = clef||rnd(['treble','bass']);
  const pool = getPool(cl,'staff');
  const type = rnd(['asc_scale','desc_scale','asc_arp','desc_arp','chord']);
  let indices: number[] = [];
  let label: string;
  const st = ri(1,pool.length-5);
  if(type==='asc_scale') { indices=[st,st+1,st+2,st+3]; label='Ascending scale'; }
  else if(type==='desc_scale') { indices=[st+3,st+2,st+1,st]; label='Descending scale'; }
  else if(type==='asc_arp') { indices=[st,st+2,st+4]; label='Ascending arpeggio'; }
  else if(type==='desc_arp') { const s2=st+4; indices=[s2,s2-2,s2-4]; label='Descending arpeggio'; }
  else { indices=[st,st+2,st+4]; label='Chord'; }
  if(indices.some(i=>i<0||i>=pool.length)) return genPattern(cl);
  const notes = indices.map(i=>pool[i]);
  const abc = type==='chord' ? makeChordABC(notes,cl) : makeABC(notes,cl);
  const hl: Record<number, string> = {};
  notes.forEach(n => { hl[noteToMidi(n)] = '#8B5CF6'; });
  return { type:'pattern', abc, correctAnswer:label, answerOptions:shuffle(['Ascending scale','Descending scale','Ascending arpeggio','Descending arpeggio','Chord']), pianoHighlight:hl, clef:cl, label:'What pattern?' };
}

export function genArticulation(): Question {
  const marks = [
    {name:'Staccato', abc:'.'},
    {name:'Accent', abc:'!accent!'},
    {name:'Tenuto', abc:'!tenuto!'},
    {name:'Fermata', abc:'!fermata!'}
  ];
  const mark = rnd(marks);
  const note = rnd(trebleNotes);
  const abc = `X:1\nM:4/4\nL:1/4\nK:clef=treble\n${mark.abc}${noteToABC(note)}4 |`;
  return { type:'articulation', abc, correctAnswer:mark.name, answerOptions:shuffle(['Staccato','Accent','Tenuto','Fermata','Legato']), pianoHighlight:{[noteToMidi(note)]:'#8B5CF6'}, clef:'treble', label:'What articulation?' };
}

export function genKeySignature(): Question {
  const ks = rnd(KEY_SIGS);
  const abc = `X:1\nM:4/4\nL:1/4\nK:${ks.abc} clef=treble\nx4|`;
  const opts = shuffle(KEY_SIGS.map(k=>k.key));
  return { type:'keySignature', abc, correctAnswer:ks.key, answerOptions:opts.slice(0,6), pianoHighlight:{}, clef:'treble', label:'What key signature?' };
}

export function genRhythmDrill(difficulty?: string): RhythmPattern {
  const pool = RHYTHM_PATTERNS.filter(p => !difficulty || p.difficulty === difficulty);
  return rnd(pool);
}

export function generateQuestion(config: DrillConfig): Question {
  const type = rnd(config.types);
  switch(type) {
    case 'noteNaming': return genNoteNaming(rnd(config.clefs), config.range);
    case 'interval': return genInterval(config.clefs, config.intervals);
    case 'oddEven': return genOddEven(config.clefs);
    case 'pattern': return genPattern(rnd(config.clefs));
    case 'articulation': return genArticulation();
    case 'keySignature': return genKeySignature();
    default: return genNoteNaming(rnd(config.clefs), config.range);
  }
}

export function generateWeightedQuestion(config: DrillConfig): Question {
  const type = rnd(config.types);
  if (type === 'interval' && config.intervals && config.intervals.length > 0) {
    const acc = getIntervalAccuracy();
    const weights: { size: number; weight: number }[] = [];
    config.intervals.forEach(size => {
      ['up', 'down'].forEach(dir => {
        const name = intervalName(size) + ' ' + dir;
        const data = acc[name];
        const pct = data ? data.correct / data.total : 0.5;
        const weight = Math.max(0.1, 1.0 - pct);
        weights.push({ size, weight });
      });
    });
    const totalWeight = weights.reduce((s, w) => s + w.weight, 0);
    let r = Math.random() * totalWeight;
    for (const w of weights) {
      r -= w.weight;
      if (r <= 0) return genInterval(config.clefs, [w.size]);
    }
  }
  return generateQuestion(config);
}
