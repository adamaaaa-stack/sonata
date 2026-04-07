// ============================================================
// CATALOG — 400+ pieces from MuseTrainer + music21 corpus
// ============================================================

export interface CatalogEntry {
  t: string;  // title
  c: string;  // composer
  d: string;  // difficulty: beginner | intermediate | advanced
  src: string; // source: musetrainer | music21
  f: string;  // filename
}

export const CATALOG: CatalogEntry[] = [
  // Simple lesson pieces (melody only, local files)
  {t:'Happy Birthday',c:'Traditional',d:'beginner',src:'local',f:'happy-birthday.musicxml'},
  {t:'Ode to Joy',c:'Beethoven',d:'beginner',src:'local',f:'ode-to-joy.musicxml'},
  {t:'Minuet in G (Simple)',c:'Bach/Petzold',d:'beginner',src:'local',f:'minuet-in-g.musicxml'},
  {t:'Gymnopédie No. 1 (Melody)',c:'Satie',d:'beginner',src:'local',f:'gymnopedie-melody.musicxml'},
  {t:'Gymnopédie No. 1 (Both Hands)',c:'Satie',d:'beginner',src:'local',f:'gymnopedie-both-hands.musicxml'},
  {t:'Für Elise (Opening)',c:'Beethoven',d:'beginner',src:'local',f:'fur-elise-simple.musicxml'},
  {t:'Minuet in G Minor (Simple)',c:'Bach/Petzold',d:'intermediate',src:'local',f:'g-minor-bach-simple.musicxml'},
  {t:'Clair de Lune (Theme)',c:'Debussy',d:'intermediate',src:'local',f:'clair-de-lune-simple.musicxml'},
  {t:'Arabesque No. 1 (Theme)',c:'Debussy',d:'intermediate',src:'local',f:'arabesque-simple.musicxml'},
  {t:'Prelude in C (Simple)',c:'Bach',d:'intermediate',src:'local',f:'prelude-c-simple.musicxml'},

  // New lesson pieces
  {t:'Key Signature Melody',c:'Traditional',d:'intermediate',src:'local',f:'key-signature-piece.musicxml'},
  {t:'Simple Harmonies',c:'Traditional',d:'intermediate',src:'local',f:'two-notes-piece.musicxml'},
  {t:'March with Repeats',c:'Traditional',d:'intermediate',src:'local',f:'repeat-signs-piece.musicxml'},

  // Simple rhythm lesson pieces
  {t:'Twinkle Twinkle (Rhythm)',c:'Traditional',d:'beginner',src:'local',f:'twinkle-rhythm.musicxml'},
  {t:'Amazing Grace (Simple)',c:'Traditional',d:'beginner',src:'local',f:'amazing-grace-simple.musicxml'},
  {t:'When the Saints (Simple)',c:'Traditional',d:'beginner',src:'local',f:'when-the-saints-simple.musicxml'},
  {t:'Greensleeves (Simple)',c:'Traditional',d:'intermediate',src:'local',f:'greensleeves-simple.musicxml'},
  {t:'Entertainer (Simple)',c:'Joplin',d:'intermediate',src:'local',f:'entertainer-simple.musicxml'},

  // MuseTrainer — beginner/intermediate piano
  {t:'Greensleeves',c:'Traditional',d:'beginner',src:'musetrainer',f:'Greensleeves_for_Piano_easy_and_beautiful.mxl'},
  {t:'Canon in D (Easy)',c:'Pachelbel',d:'beginner',src:'musetrainer',f:'Canon_in_D_easy.mxl'},
  {t:'Carol of the Bells (Easy)',c:'Leontovych',d:'beginner',src:'musetrainer',f:'Carol_of_the_Bells_easy_piano.mxl'},
  {t:'Für Elise (Beginner)',c:'Beethoven',d:'beginner',src:'musetrainer',f:'Fur_Elise_-_Beethoven_-_for_beginner_piano.mxl'},
  {t:'Bella Ciao',c:'Italian Traditional',d:'beginner',src:'musetrainer',f:'Bella_Ciao.mxl'},
  {t:'Danse Villageoise',c:'Beethoven',d:'beginner',src:'musetrainer',f:'DANSE_VILLAGEOISE_Beethoven.mxl'},

  {t:'Für Elise',c:'Beethoven',d:'intermediate',src:'musetrainer',f:'Fur_Elise.mxl'},
  {t:'Gymnopédie No. 1',c:'Satie',d:'intermediate',src:'musetrainer',f:'Erik_Satie_-_Gymnopedie_No.1.mxl'},
  {t:'Gnossienne No. 1',c:'Satie',d:'intermediate',src:'musetrainer',f:'Gnossienne_No._1.mxl'},
  {t:'Minuet in G Major',c:'Bach',d:'intermediate',src:'musetrainer',f:'Bach_Minuet_in_G_Major_BWV_Anh._114.mxl'},
  {t:'Canon in D',c:'Pachelbel',d:'intermediate',src:'musetrainer',f:'Canon_in_D.mxl'},
  {t:'Carol of the Bells',c:'Leontovych',d:'intermediate',src:'musetrainer',f:'Carol_of_the_Bells.mxl'},
  {t:'Mariage d\'Amour',c:'Senneville',d:'intermediate',src:'musetrainer',f:'Mariage_dAmour.mxl'},
  {t:'Nocturne Op. 9 No. 2 (Easy)',c:'Chopin',d:'intermediate',src:'musetrainer',f:'Nocturne_in_E-flat_Major_Op._9_No._2_Easy.mxl'},
  {t:'Ave Maria',c:'Schubert',d:'intermediate',src:'musetrainer',f:'Ave_Maria_D839_-_Schubert_-_Solo_Piano_Arrg..mxl'},
  {t:'Air on the G String',c:'Bach',d:'intermediate',src:'musetrainer',f:'J._S._Bach_-_Air_on_the_G_String_Piano_arrangement.mxl'},
  {t:'Dance of the Sugar Plum Fairy',c:'Tchaikovsky',d:'intermediate',src:'musetrainer',f:'Dance_of_the_sugar_plum_fairy.mxl'},
  {t:'Swan Lake',c:'Tchaikovsky',d:'intermediate',src:'musetrainer',f:'Swan_Lake.mxl'},
  {t:'The Entertainer',c:'Joplin',d:'intermediate',src:'musetrainer',f:'The_Entertainer_-_Scott_Joplin.mxl'},
  {t:'Maple Leaf Rag',c:'Joplin',d:'intermediate',src:'musetrainer',f:'Maple_Leaf_Rag_Scott_Joplin.mxl'},

  {t:'Clair de Lune',c:'Debussy',d:'advanced',src:'musetrainer',f:'Clair_de_Lune__Debussy.mxl'},
  {t:'Arabesque No. 1',c:'Debussy',d:'advanced',src:'musetrainer',f:'Arabesque_L._66_No._1_in_E_Major.mxl'},
  {t:'Moonlight Sonata 1st mvt',c:'Beethoven',d:'advanced',src:'local',f:'moonlight-1st-study.musicxml'},
  {t:'Moonlight Sonata 3rd mvt',c:'Beethoven',d:'advanced',src:'local',f:'moonlight-3rd-study.musicxml'},
  {t:'Pathétique 2nd mvt',c:'Beethoven',d:'advanced',src:'musetrainer',f:'Sonate_No._8_Pathetique_2nd_Movement.mxl'},
  {t:'Nocturne Op. 9 No. 1',c:'Chopin',d:'advanced',src:'local',f:'nocturne1-rhythm-study.musicxml'},
  {t:'Nocturne Op. 9 No. 2',c:'Chopin',d:'advanced',src:'local',f:'pedal-melody-study.musicxml'},
  {t:'Nocturne No. 20 in C# Minor',c:'Chopin',d:'advanced',src:'musetrainer',f:'Nocturne_No._20_in_C_Minor.mxl'},
  {t:'Ballade No. 1',c:'Chopin',d:'advanced',src:'musetrainer',f:'Chopin_-_Ballade_no._1_in_G_minor_Op._23.mxl'},
  {t:'Waltz Op. 64 No. 2',c:'Chopin',d:'advanced',src:'musetrainer',f:'Waltz_Opus_64_No._2_in_C_Minor.mxl'},
  {t:'Prelude in E Minor Op. 28 No. 4',c:'Chopin',d:'advanced',src:'musetrainer',f:'Prlude_No._4_in_E_Minor_Op._28_-_Frdric_Chopin.mxl'},
  {t:'Rondo alla Turca',c:'Mozart',d:'advanced',src:'local',f:'rondo-study.musicxml'},
  {t:'Sonata No. 16 K.545',c:'Mozart',d:'advanced',src:'musetrainer',f:'Sonata_No._16_1st_Movement_K._545.mxl'},
  {t:'Twinkle Twinkle (12 Variations)',c:'Mozart',d:'advanced',src:'musetrainer',f:'12_Variations_of_Twinkle_Twinkle_Little_Star.mxl'},
  {t:'Liebestraum No. 3',c:'Liszt',d:'advanced',src:'musetrainer',f:'Liebestraum_No._3_in_A_Major.mxl'},
  {t:'La Campanella',c:'Liszt',d:'advanced',src:'musetrainer',f:'La_Campanella_-_Grandes_Etudes_de_Paganini_No._3_-_Franz_Liszt.mxl'},
  {t:'Hungarian Dance No. 5',c:'Brahms',d:'advanced',src:'musetrainer',f:'Hungarian_Dance_No_5_in_G_Minor.mxl'},
  {t:'Waltz of the Flowers',c:'Tchaikovsky',d:'advanced',src:'musetrainer',f:'Waltz_of_the_Flowers.mxl'},
  {t:'Lacrimosa (Requiem)',c:'Mozart',d:'advanced',src:'musetrainer',f:'Lacrimosa_-_Requiem.mxl'},
  {t:'Toccata & Fugue in D Minor',c:'Bach',d:'advanced',src:'musetrainer',f:'Bach_Toccata_and_Fugue_in_D_Minor_Piano_solo.mxl'},
  {t:'Prelude in C Major BWV 846',c:'Bach',d:'advanced',src:'musetrainer',f:'Prelude_I_in_C_major_BWV_846_-_Well_Tempered_Clavier_First_Book.mxl'},
  {t:'Flight of the Bumblebee',c:'Rimsky-Korsakov',d:'advanced',src:'musetrainer',f:'Flight_of_the_Bumblebee.mxl'},
  {t:'Symphony No. 5 (Piano)',c:'Beethoven',d:'advanced',src:'musetrainer',f:'Beethoven_Symphony_No._5_1st_movement_Piano_solo.mxl'},

  // Additional MuseTrainer pieces
  {t:'G Minor Bach',c:'Bach',d:'advanced',src:'musetrainer',f:'G_Minor_Bach_Original.mxl'},
  {t:'Nocturne in C# Minor',c:'Chopin',d:'advanced',src:'musetrainer',f:'Nocturne_in_C_sharp_Minor.mxl'},
  {t:'Spring Waltz',c:'Chopin',d:'advanced',src:'musetrainer',f:'Chopin_-_Spring_Waltz.mxl'},
  {t:'Waltz in A Minor',c:'Chopin',d:'advanced',src:'musetrainer',f:'Waltz_in_A_MinorChopin.mxl'},
  {t:'Passacaglia',c:'Handel/Halvorsen',d:'advanced',src:'musetrainer',f:'Passacaglia.mxl'},
  {t:'Schubert Serenade',c:'Schubert/Liszt',d:'advanced',src:'musetrainer',f:'Schubert_Serenade_-_Standchen_-_By_Lizst.mxl'},
  {t:'Prelude No. 2 BWV 847',c:'Bach',d:'advanced',src:'musetrainer',f:'Prelude_No._2_BWV_847_in_C_Minor.mxl'},
  {t:'Für Elise (with fingering)',c:'Beethoven',d:'intermediate',src:'musetrainer',f:'Fur_Elise_fingered.mxl'},
  {t:'Mozart Turkish March (fingered)',c:'Mozart',d:'advanced',src:'musetrainer',f:'WA_Mozart_Marche_Turque_Turkish_March_fingered.mxl'},
  {t:'Hungarian Sonata',c:'Liszt',d:'advanced',src:'musetrainer',f:'Hungarian_Sonata.mxl'},

  // music21 corpus — solo/keyboard/piano pieces
  {t:'Maple Leaf Rag',c:'Joplin',d:'advanced',src:'music21',f:'joplin/maple_leaf_rag.mxl'},
  {t:'Piano Sonata K.545 (Exposition)',c:'Mozart',d:'intermediate',src:'music21',f:'mozart/k545/movement1_exposition.mxl'},
  {t:'Six Little Piano Pieces Op.19 No.2',c:'Schoenberg',d:'advanced',src:'music21',f:'schoenberg/opus19/movement2.mxl'},
  {t:'Six Little Piano Pieces Op.19 No.6',c:'Schoenberg',d:'advanced',src:'music21',f:'schoenberg/opus19/movement6.mxl'},
  {t:'Polonaise Op.1 No.1',c:'Clara Schumann',d:'intermediate',src:'music21',f:'schumann_clara/polonaise_op1n1.mxl'},
  {t:'Polonaise Op.1 No.2',c:'Clara Schumann',d:'intermediate',src:'music21',f:'schumann_clara/polonaise_op1n2.mxl'},
  {t:'Polonaise Op.1 No.3',c:'Clara Schumann',d:'intermediate',src:'music21',f:'schumann_clara/polonaise_op1n3.mxl'},
  {t:'Polonaise Op.1 No.4',c:'Clara Schumann',d:'intermediate',src:'music21',f:'schumann_clara/polonaise_op1n4.mxl'},
  {t:'Sonata for Flute & Piano H.186',c:'CPE Bach',d:'advanced',src:'music21',f:'cpebach/h186.mxl'},
  {t:'Prayer of a Tired Child',c:'Amy Beach',d:'intermediate',src:'music21',f:'beach/prayer_of_a_tired_child.musicxml'},
  {t:'Aloha Oe',c:'Liliuokalani',d:'beginner',src:'music21',f:'liliuokalani/aloha_oe.mxl'},
  {t:'Lift Every Voice and Sing',c:'J. Rosamond Johnson',d:'intermediate',src:'music21',f:'johnson_j_r/lift_every_voice.mxl'},
  {t:'Der Lindenbaum',c:'Schubert',d:'intermediate',src:'music21',f:'schubert/Lindenbaum.xml'},
  {t:'Dichterliebe No.2',c:'R. Schumann',d:'advanced',src:'music21',f:'schumann_robert/dichterliebe_no2.xml'},
  {t:'Lascia ch\'io pianga',c:'Handel',d:'intermediate',src:'music21',f:'handel/rinaldo/Lascia_chio_pianga.mxl'},
  {t:'La donna e mobile',c:'Verdi',d:'intermediate',src:'music21',f:'verdi/laDonnaEMobile.mxl'},
  {t:'Alexander\'s Ragtime Band',c:'Irving Berlin',d:'intermediate',src:'music21',f:'leadSheet/berlinAlexandersRagtime.mxl'},
  {t:'Beautiful Dreamer',c:'Stephen Foster',d:'beginner',src:'music21',f:'leadSheet/fosterBrownHair.mxl'},
  {t:'Piano Piece Op.17 No.3',c:'Clara Schumann',d:'advanced',src:'music21',f:'schumann_clara/opus17/movement3.xml'},
];

// Generate Bach Chorales from music21 corpus (BWV 250-438)
for (let i = 250; i <= 438; i++) {
  CATALOG.push({t:'Chorale BWV '+i, c:'Bach', d:'intermediate', src:'music21', f:'bach/bwv'+i+'.mxl'});
}

// Cantata chorales
const BACH_CANTATA_FILES = [
  'bwv1.6','bwv10.7','bwv101.7','bwv102.7','bwv103.6','bwv104.6','bwv108.6','bwv11.6',
  'bwv110.7','bwv111.6','bwv113.8','bwv114.7','bwv115.6','bwv116.6','bwv117.4','bwv119.9',
  'bwv12.7','bwv120.6','bwv121.6','bwv122.6','bwv123.6','bwv124.6','bwv125.6','bwv126.6',
  'bwv127.5','bwv128.5','bwv13.6','bwv130.6','bwv133.6','bwv135.6','bwv136.6','bwv137.5',
  'bwv139.6','bwv14.5','bwv140.7','bwv144.3','bwv144.6','bwv145.5','bwv146.8','bwv148.6',
  'bwv149.7','bwv151.5','bwv153.1','bwv153.5','bwv153.9','bwv154.3','bwv154.8','bwv155.5',
  'bwv156.6','bwv157.5','bwv158.4','bwv159.5','bwv16.6','bwv161.6','bwv164.6','bwv165.6',
  'bwv166.6','bwv168.6','bwv169.7','bwv17.7','bwv171.6','bwv172.6','bwv174.5','bwv175.7',
  'bwv176.6','bwv177.4','bwv178.7','bwv179.6','bwv180.7','bwv183.5','bwv184.5','bwv185.6',
  'bwv187.7','bwv188.6','bwv19.7','bwv194.6','bwv194.12','bwv195.6','bwv197.5','bwv197.10',
  'bwv2.6','bwv20.7','bwv20.11','bwv24.6','bwv25.6','bwv26.6','bwv27.6','bwv28.6','bwv29.8',
  'bwv3.6','bwv30.6','bwv31.9','bwv32.6','bwv33.6','bwv36.4-2','bwv36.8-2','bwv37.6',
  'bwv38.6','bwv39.7','bwv4.8','bwv40.3','bwv40.6','bwv40.8',
];
BACH_CANTATA_FILES.forEach(f => {
  const bwv = f.match(/bwv(\d+)/)?.[1] || '';
  CATALOG.push({t:'Cantata BWV '+bwv+' Chorale', c:'Bach', d:'intermediate', src:'music21', f:'bach/'+f+'.mxl'});
});

// St Matthew/John Passion, Christmas Oratorio chorales
const BACH_PASSION_FILES = [
  'bwv244.3','bwv244.10','bwv244.15','bwv244.17','bwv244.25','bwv244.32','bwv244.37',
  'bwv244.40','bwv244.44','bwv244.46','bwv244.54','bwv244.62',
  'bwv245.3','bwv245.5','bwv245.11','bwv245.14','bwv245.15','bwv245.17','bwv245.22',
  'bwv245.26','bwv245.28','bwv245.37','bwv245.40',
  'bwv248.5','bwv248.17','bwv248.28',
];
BACH_PASSION_FILES.forEach(f => {
  const parts = f.match(/bwv(\d+)\.(\d+)/);
  if (!parts) return;
  const work = parts[1] === '244' ? 'St Matthew Passion' : parts[1] === '245' ? 'St John Passion' : 'Christmas Oratorio';
  CATALOG.push({t:work+' No.'+parts[2], c:'Bach', d:'intermediate', src:'music21', f:'bach/'+f+'.mxl'});
});

// Helpers
export function getCatalogUrl(piece: CatalogEntry): string {
  if (piece.src === 'local') return '/scores/' + piece.f;
  if (piece.src === 'musetrainer') return 'https://raw.githubusercontent.com/musetrainer/library/master/scores/' + piece.f;
  if (piece.src === 'music21') return 'https://raw.githubusercontent.com/cuthbertLab/music21/master/music21/corpus/' + piece.f;
  return '';
}

export const DIFF_COLORS: Record<string, {bg: string; color: string}> = {
  beginner: {bg:'var(--green-bg)', color:'var(--green)'},
  intermediate: {bg:'var(--yellow-bg)', color:'var(--yellow)'},
  advanced: {bg:'var(--orange-bg)', color:'var(--orange)'},
};

export function getRecommendedDifficulty(lessonsCompletedCount: number): string {
  if (lessonsCompletedCount <= 3) return 'beginner';
  if (lessonsCompletedCount <= 9) return 'intermediate';
  return 'advanced';
}

// Lesson piece mapping
export const LESSON_PIECE_MAP: Record<number, string> = {
  // Lessons 1-5: no piece — student isn't ready yet
  6: 'Ode to Joy',                   // Steps & Skips Combined — first piece!
  7: 'When the Saints (Simple)',     // Counting & Subdivision
  8: 'Gymnopédie No. 1 (Both Hands)',// Both Hands & Dynamics
  9: 'Für Elise (Opening)',          // Small Leaps
  10: 'Minuet in G Minor (Simple)',  // Articulation
  11: 'Key Signature Melody',        // Key Signatures [NEW]
  12: 'Simple Harmonies',            // Reading Two Notes [NEW]
  13: 'Greensleeves (Simple)',       // Compound Time & Triplets
  14: 'Clair de Lune (Theme)',       // Dynamics & Phrasing
  15: 'Arabesque No. 1 (Theme)',     // Large Leaps & Octaves
  16: 'Prelude in C (Simple)',       // Fingering & Scales
  17: 'Moonlight Sonata 1st mvt',    // Arpeggios & Chords
  18: 'March with Repeats',          // Repeat Signs [NEW]
  19: 'Entertainer (Simple)',        // Rhythm Mastery
  20: 'Nocturne Op. 9 No. 2',       // Pedalling
  21: 'Rondo alla Turca',           // Speed Reading
  22: 'Nocturne Op. 9 No. 1',       // Complex Rhythms
  23: 'Moonlight Sonata 3rd mvt',    // Everything combined
};

export function findLessonCatalogIndex(lessonId: number): number {
  const name = LESSON_PIECE_MAP[lessonId];
  if (!name) return -1;
  return CATALOG.findIndex(p => p.t === name);
}
