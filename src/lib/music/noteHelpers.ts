// ============================================================
// NOTE HELPERS — Pure functions, no DOM, no state
// ============================================================

export const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
export const NOTE_NAMES = ['C','D','E','F','G','A','B'];
export const FLAT_MAP: Record<string, string> = {'Db':'C#','Eb':'D#','Gb':'F#','Ab':'G#','Bb':'A#'};

export function noteToMidi(n: string): number {
  let name = n.slice(0,-1);
  const oct = parseInt(n.slice(-1));
  if(FLAT_MAP[name]) name = FLAT_MAP[name];
  return NOTES.indexOf(name) + (oct+1)*12;
}

export function midiToNote(m: number): string {
  return NOTES[m%12] + (Math.floor(m/12)-1);
}

export function midiToLetter(m: number): string {
  return NOTES[m%12];
}

export function isBlack(m: number): boolean {
  return [1,3,6,8,10].includes(m%12);
}

export function intervalName(semitones: number): string {
  const abs = Math.abs(semitones);
  const names: Record<number, string> = {0:'Unison',1:'2nd',2:'2nd',3:'3rd',4:'3rd',5:'4th',6:'Tritone',7:'5th',8:'6th',9:'6th',10:'7th',11:'7th',12:'Octave'};
  return names[Math.min(abs,12)] || 'Octave+';
}

export function intervalGeneric(semitones: number): number {
  const abs = Math.abs(semitones);
  const map: Record<number, number> = {0:1,1:2,2:2,3:3,4:3,5:4,6:4,7:5,8:6,9:6,10:7,11:7,12:8};
  return map[Math.min(abs,12)] || 8;
}

export function intervalType(semitones: number): string {
  const g = intervalGeneric(semitones);
  if(g<=1) return 'unison';
  if(g<=2) return 'step';
  if(g<=3) return 'skip';
  if(g<=5) return 'smallLeap';
  return 'largeLeap';
}

export function intervalColor(type: string): string {
  const colors: Record<string, string> = {unison:'#3b82f6',step:'#22c55e',skip:'#eab308',smallLeap:'#f97316',largeLeap:'#ef4444'};
  return colors[type] || '#8B5CF6';
}

export function isOddInterval(semitones: number): boolean {
  const g = intervalGeneric(semitones);
  return g % 2 === 1;
}

export interface IntervalInfo {
  semitones: number;
  name: string;
  generic: number;
  direction: string;
  type: string;
  color: string;
  isOdd: boolean;
  displayName: string;
}

export function analyzeInterval(n1: string, n2: string): IntervalInfo {
  const m1 = noteToMidi(n1), m2 = noteToMidi(n2);
  const semi = m2 - m1;
  const dir = semi > 0 ? 'up' : semi < 0 ? 'down' : 'unison';
  const type = intervalType(semi);
  return {
    semitones: semi,
    name: intervalName(semi),
    generic: intervalGeneric(semi),
    direction: dir,
    type,
    color: intervalColor(type),
    isOdd: isOddInterval(semi),
    displayName: intervalName(semi) + ' ' + dir,
  };
}

export function noteToABC(noteStr: string): string {
  const letter = noteStr[0];
  const sharp = noteStr.includes('#');
  const flat = noteStr.includes('b');
  const octave = parseInt(noteStr.slice(-1));
  let abc = '';
  if(sharp) abc += '^';
  if(flat) abc += '_';
  if(octave <= 3) { abc += letter.toUpperCase(); for(let i=0;i<(4-octave);i++) abc+=','; }
  else if(octave === 4) { abc += letter.toUpperCase(); }
  else if(octave === 5) { abc += letter.toLowerCase(); }
  else { abc += letter.toLowerCase(); for(let i=0;i<(octave-5);i++) abc+="'"; }
  return abc;
}

export function makeABC(notes: string[], clef: string = 'treble'): string {
  const cl = clef === 'bass' ? 'bass' : 'treble';
  const abc = notes.map(n => noteToABC(n) + '4').join(' ');
  return `X:1\nM:4/4\nL:1/4\nK:clef=${cl}\n${abc} |`;
}

export function makeChordABC(notes: string[], clef: string = 'treble'): string {
  const cl = clef === 'bass' ? 'bass' : 'treble';
  const abc = '[' + notes.map(n => noteToABC(n)).join('') + ']4';
  return `X:1\nM:4/4\nL:1/4\nK:clef=${cl}\n${abc} |`;
}
