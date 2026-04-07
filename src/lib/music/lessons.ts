// ============================================================
// LESSONS — 23 lessons, baby-language, zero-to-hero
// Written for someone who has NEVER touched a piano
// ============================================================

import { makeABC, makeChordABC } from './noteHelpers';
import type { DrillConfig } from './drillEngine';

export interface LessonStep {
  text: string;
  abc: string;
  piano: Record<number, string>;
  fingers?: Record<number, number>;
}

export interface QuizQuestion {
  q: string;
  options: string[];
  correct: number;
}

export interface Lesson {
  id: number;
  title: string;
  sub: string;
  piece: string;
  steps: LessonStep[];
  quiz: QuizQuestion[];
  walkthrough?: string[];
  drill: DrillConfig;
  advance: number;
}

export const lessons: Lesson[] = [

// ============================================================
// LESSON 1: Meet the Piano
// ============================================================
{ id:1, title:'Meet the Piano', sub:'Your first look at the keyboard', piece:'',
  steps: [
    { text:"Welcome! You're about to learn to read music. But first — let's look at the piano itself. See the keys below? The WHITE keys are the main notes. The BLACK keys are in between. That's all a piano is — white keys and black keys, over and over.", abc:'', piano:{} },
    { text:"Look at the black keys carefully. See how they come in groups? Some groups have 2 black keys together, and some have 3 black keys together. This pattern repeats all the way across the piano. 2, then 3, then 2, then 3. Find a group of 2 black keys on the piano below.", abc:'', piano:{[61]:'#C8A96E',[63]:'#C8A96E'} },
    { text:"Now here's the trick. The white key RIGHT BEFORE a group of 2 black keys is always the note C. Always! Every single time. Find the 2 black keys, go one white key to the left — that's C. It's like a landmark. The golden key below is C.", abc:'', piano:{[60]:'#C8A96E'} },
    { text:"The C in the MIDDLE of the piano is called Middle C. It's the most important note to know. It's your home base. Everything starts from here. The golden key below is Middle C. Tap it!", abc:'', piano:{[60]:'#C8A96E'} },
    { text:"From C, the notes go in order: C, D, E, F, G, A, B. Just 7 letters! Then it starts over — another C, another D, another E... The same 7 notes repeat higher and higher. Music only uses these 7 letters. No H, no I, no Z. Just A through G.", abc:'', piano:{[60]:'#4ADE80',[62]:'#4ADE80',[64]:'#4ADE80',[65]:'#4ADE80',[67]:'#4ADE80',[69]:'#4ADE80',[71]:'#4ADE80'} },
    { text:"Going UP on the piano (to the right) = higher sound. Going DOWN (to the left) = lower sound. Think of it like stairs — right goes up, left goes down. The piano is just a line of notes from low on the left to high on the right.", abc:'', piano:{[60]:'#60A5FA',[64]:'#60A5FA',[67]:'#60A5FA',[72]:'#60A5FA'} },
    { text:"What about the black keys? They're the notes IN BETWEEN the white keys. Like C# (C sharp) is between C and D. But don't worry about black keys yet. For now, just remember: find 2 black keys, the white key before them is C. That's all you need.", abc:'', piano:{[60]:'#C8A96E',[61]:'#78716C',[63]:'#78716C'} },
    { text:"Now let's look at sheet music. Those 5 lines you see on screen? That's called the STAFF. It's like a ladder lying on its side. Notes sit on the lines or in the spaces between lines. Higher on the staff = higher sound. Lower on the staff = lower sound. Same idea as the piano!", abc:'X:1\nM:4/4\nL:1/4\nK:clef=treble\nx4|', piano:{} },
    { text:"The curly symbol at the start of the staff is called a CLEF. This one is the TREBLE CLEF. It tells you that this staff is for higher notes — usually your RIGHT hand. See how it curls around the second line? That line is the note G. The clef is literally pointing at G.", abc:makeABC(['G4'],'treble'), piano:{[67]:'#C8A96E'} },
    { text:"There's also a BASS CLEF — it looks like a backwards C with two dots. It's for lower notes — usually your LEFT hand. The two dots sit around the fourth line, which is F. The dots point at F, like eyes staring at it.", abc:makeABC(['F3'],'bass'), piano:{[53]:'#C8A96E'} },
    { text:"So you know THREE important things now: 1) Middle C is the white key before a group of 2 black keys, near the center. 2) G is on the second line in treble clef. 3) F is on the fourth line in bass clef. These are your THREE LANDMARKS. Every other note? You just count from the nearest landmark.", abc:makeABC(['C4'],'treble'), piano:{[60]:'#C8A96E',[67]:'#C8A96E',[53]:'#C8A96E'} },
    { text:"Let's try it. This note is on the second line of the treble staff. Your nearest landmark is G (second line). So this note IS G! Now look at the piano — G is highlighted. You just read your first note!", abc:makeABC(['G4'],'treble'), piano:{[67]:'#4ADE80'} },
    { text:"Another one. This note is one position ABOVE G. The alphabet goes G → A. So this note is A! One position up from your landmark = next letter. Easy.", abc:makeABC(['A4'],'treble'), piano:{[69]:'#4ADE80'} },
    { text:"One more. This note is one position BELOW G. Going backwards in the alphabet: G → F. So it's F! One position down = previous letter.", abc:makeABC(['F4'],'treble'), piano:{[65]:'#4ADE80'} },
    { text:"That's it for Lesson 1! You know where Middle C is on the piano. You know the 7 note letters (C D E F G A B). You know the three landmarks (C, G in treble, F in bass). And you just read three notes by counting from the nearest landmark. Time for a quick quiz!", abc:'', piano:{} },
  ],
  quiz: [
    { q:'How many letter names are there in music?', options:['5','7','10','26'], correct:1 },
    { q:'What is the white key right before a group of 2 black keys?', options:['D','G','C','F'], correct:2 },
    { q:'The treble clef curls around which note?', options:['C','F','G','A'], correct:2 },
    { q:'The bass clef dots point at which note?', options:['C','F','G','A'], correct:1 },
    { q:'Higher on the staff means...', options:['Lower sound','Higher sound','Louder sound','Softer sound'], correct:1 },
  ],
  drill:{types:['noteNaming'],clefs:['treble','bass'],range:'staff',intervals:[],timer:null,count:10}, advance:0.70 },

// ============================================================
// LESSON 2: The Pulse
// ============================================================
{ id:2, title:'The Pulse', sub:'Music has a heartbeat', piece:'',
  steps: [
    { text:"Before we read more notes, let's talk about TIMING. Music isn't just about WHICH note — it's about WHEN you play it. Imagine clapping your hands steadily: clap, clap, clap, clap. That steady clap is called the BEAT. Every piece of music has a beat, like a heartbeat.", abc:'', piano:{} },
    { text:"Try it now — tap your finger on the table steadily, like a clock ticking. Tick, tick, tick, tick. That's the beat! When you play piano, your notes line up with this beat. Some notes land right on the beat. Some go between beats. But the beat is always there underneath.", abc:'', piano:{} },
    { text:"How FAST the beat goes is called TEMPO. A slow tempo means slow clapping (like a lullaby). A fast tempo means fast clapping (like a dance song). Sheet music tells you the tempo at the top — but for now, just know that every song has its own speed.", abc:'', piano:{} },
    { text:"Now look at the staff. See those vertical lines going up and down? Those are BAR LINES. They divide the music into little boxes called BARS (or measures). Each bar has the same number of beats. It's like dividing a sentence into words — bar lines are the spaces between words.", abc:'X:1\nM:4/4\nL:1/4\nK:C\nC D E F | G A B c |', piano:{} },
    { text:"Those two numbers at the start (like 4/4) are the TIME SIGNATURE. The top number says how many beats are in each bar. 4/4 means 4 beats per bar. So you count: 1, 2, 3, 4, then the next bar starts. 1, 2, 3, 4. Over and over.", abc:'X:1\nM:4/4\nL:1/4\nK:C\nC D E F | G F E D |', piano:{} },
    { text:"3/4 means 3 beats per bar. You count: 1, 2, 3, 1, 2, 3. This gives music a waltz feel — like swaying side to side. Think of it as a dance: ONE two three, ONE two three. The 'one' is always a bit stronger.", abc:'X:1\nM:3/4\nL:1/4\nK:C\nC E G | F D B, | C2 z |', piano:{} },
    { text:"Here's the most important thing about the beat: KEEP IT GOING NO MATTER WHAT. Even if you play a wrong note, keep the beat. A wrong note at the right time sounds much better than a right note at the wrong time. The beat is king!", abc:'', piano:{} },
    { text:"Twinkle Twinkle Little Star is a perfect first song. It's in 4/4 time — four beats per bar. Every note gets one beat. Just tap along: C C G G A A G, F F E E D D C. Each note, one tap. Simple!", abc:'X:1\nM:4/4\nL:1/4\nK:C\nC C G G | A A G2 | F F E E | D D C2 |', piano:{} },
  ],
  quiz: [
    { q:'What is the steady "tick tick tick" in music called?', options:['The melody','The beat','The chord','The key'], correct:1 },
    { q:'What does the time signature 4/4 mean?', options:['4 notes per song','4 beats per bar','4 bars per page','4 sharps'], correct:1 },
    { q:'Bar lines divide music into...', options:['Notes','Chords','Bars (measures)','Pages'], correct:2 },
    { q:'What should you do if you play a wrong note?', options:['Stop and start over','Keep the beat going','Play louder','Skip the next note'], correct:1 },
  ],
  drill:{types:['noteNaming'],clefs:['treble'],range:'staff',intervals:[],timer:null,count:10}, advance:0.70 },

// ============================================================
// LESSON 3: Steps
// ============================================================
{ id:3, title:'Steps', sub:'Moving to the next-door note', piece:'',
  steps: [
    { text:"Now here's where it gets exciting. Instead of figuring out each note by name (which is slow), we're going to learn a SHORTCUT. Look at how far each note is from the LAST note. This distance is called an INTERVAL. And the smallest interval is a STEP.", abc:makeABC(['C4','D4'],'treble'), piano:{[60]:'#4ADE80',[62]:'#4ADE80'} },
    { text:"A step is moving to the very next note — like going from C to D, or from E to F. On the piano, it's the key RIGHT NEXT to the one you just played. On the staff, the two notes are TOUCHING — one is on a line, the other is in the space right next to it.", abc:makeABC(['E4','F4'],'treble'), piano:{[64]:'#4ADE80',[65]:'#4ADE80'} },
    { text:"Here's the cool part: you DON'T need to know what either note is called! If you just played a note and the next one is one position higher on the staff — just play the next key UP on the piano. That's it. You read the MOVEMENT, not the name.", abc:makeABC(['C4','D4','E4','F4'],'treble'), piano:{[60]:'#4ADE80',[62]:'#4ADE80',[64]:'#4ADE80',[65]:'#4ADE80'} },
    { text:"Steps can go UP (the next note is higher) or DOWN (the next note is lower). Step up = play the next key to the right. Step down = play the next key to the left. That's literally all you need to know.", abc:makeABC(['E4','D4'],'treble'), piano:{[64]:'#4ADE80',[62]:'#4ADE80'} },
    { text:"A REPEATED note means the next note is at the exact same position. Same key, play it again. Even easier than a step!", abc:makeABC(['E4','E4','F4','F4'],'treble'), piano:{} },
    { text:"Look at this — it's a scale going up: C D E F G. Every note is a step up from the last one. On the staff, they march up like stairs. On the piano, you just walk up the white keys one by one. When you see notes going up in a straight line like stairs, think 'steps going up' and let your fingers walk.", abc:makeABC(['C4','D4','E4','F4','G4'],'treble'), piano:{[60]:'#4ADE80',[62]:'#4ADE80',[64]:'#4ADE80',[65]:'#4ADE80',[67]:'#4ADE80'} },
    { text:"And going down: G F E D C. Notes walking down the stairs. Your fingers walk down the keys. Don't think about the letter names — just follow the direction. Up or down, one step at a time.", abc:makeABC(['G4','F4','E4','D4','C4'],'treble'), piano:{[67]:'#4ADE80',[65]:'#4ADE80',[64]:'#4ADE80',[62]:'#4ADE80',[60]:'#4ADE80'} },
    { text:"How to SPOT a step on the staff: one note is on a LINE, and the next is in a SPACE (or the other way around). They're touching — right next to each other with no gap. If there's a gap between them, it's NOT a step (we'll learn those next).", abc:makeABC(['E4','F4','G4','A4'],'treble'), piano:{} },
    { text:"Beethoven's Ode to Joy is almost ALL steps! The melody goes: E E F G, G F E D, C C D E. See? Step up, step up, step down, step down. You could play this right now just by following the direction!", abc:'X:1\nM:4/4\nL:1/4\nK:G\nB B c d | d c B A | G G A B | B A A2 |', piano:{} },
    { text:"The habit to build: DON'T think 'that's D, then E, then F.' Instead think 'step up, step up, step down, same.' Follow the MOVEMENT. Like watching a bird fly — you follow the path, not the GPS coordinates.", abc:makeABC(['D4','E4','F4','E4','D4'],'treble'), piano:{} },
  ],
  quiz: [
    { q:'What is a step?', options:['Jumping over a note','Moving to the very next note','Playing two notes together','A rest'], correct:1 },
    { q:'On the staff, a step looks like...', options:['Two notes with a gap between them','Two notes touching (line to space)','Two notes stacked on top','Two notes far apart'], correct:1 },
    { q:'Step up on the piano means...', options:['Play the next key to the right','Play the next key to the left','Play the same key again','Skip a key'], correct:0 },
    { q:'Which song is almost entirely steps?', options:['Happy Birthday','Twinkle Twinkle','Ode to Joy','Fur Elise'], correct:2 },
  ],
  drill:{types:['noteNaming','interval'],clefs:['treble','bass'],range:'staff',intervals:[2],timer:10,count:15}, advance:0.75 },

// ============================================================
// LESSON 4: Note Values (How Long)
// ============================================================
{ id:4, title:'How Long to Hold Each Note', sub:'Some notes are long, some are short', piece:'',
  steps: [
    { text:"You know WHICH notes to play. Now let's learn HOW LONG to hold each one. Different shaped notes last for different amounts of time. It's like words in a sentence — some are short ('hi') and some are long ('hellooooo').", abc:'', piano:{} },
    { text:"The QUARTER NOTE is a filled-in (black) circle with a stick. It gets 1 beat — just one tap of your foot. This is the most common note. When you see a black circle with a stick, play it and move on in one beat.", abc:'X:1\nM:4/4\nL:1/4\nK:C\nC D E F |', piano:{} },
    { text:"The HALF NOTE looks like an empty (white) circle with a stick. It gets 2 beats — hold it for two taps. It's like a quarter note but you hold it twice as long. Think: press the key and count 'one-two' before playing the next note.", abc:'X:1\nM:4/4\nL:1/4\nK:C\nC2 E2 |', piano:{} },
    { text:"The WHOLE NOTE is just an empty circle, no stick at all. It gets 4 beats — hold it for a whole bar in 4/4 time. Press the key and count 'one-two-three-four.' That's a long time! Whole notes usually feel like a long breath.", abc:'X:1\nM:4/4\nL:1/4\nK:C\nC4 |', piano:{} },
    { text:"Easy way to remember: WHOLE note = 4 beats (fills a WHOLE bar). HALF note = 2 beats (fills HALF a bar). QUARTER note = 1 beat (fills a QUARTER of a bar). See the pattern? Each one is half of the one above it.", abc:'X:1\nM:4/4\nL:1/4\nK:C\nC4 | C2 C2 | C C C C |', piano:{} },
    { text:"What about SILENCE? That's called a REST. Every note type has a matching rest. A quarter rest (looks like a zigzag) = 1 beat of silence. A half rest (a rectangle sitting on a line) = 2 beats of silence. Don't skip rests — they're part of the music!", abc:'X:1\nM:4/4\nL:1/4\nK:C\nC z C z | C2 z2 |', piano:{} },
    { text:"A DOT after a note makes it 50% longer. A dotted half note = 2 + 1 = 3 beats. A dotted quarter = 1 + 1/2 = 1.5 beats. Whenever you see a dot next to a note, hold it a little longer than normal.", abc:'X:1\nM:4/4\nL:1/4\nK:C\nC3 D | E3 F |', piano:{} },
    { text:"When you see a mix of note shapes, scan the bar and count: quarter + quarter + half = 1 + 1 + 2 = 4 beats. It should always add up to whatever the time signature says (4 in 4/4 time).", abc:'X:1\nM:4/4\nL:1/4\nK:C\nC C E2 | D D C2 |', piano:{} },
    { text:"Amazing Grace uses a mix of half notes and quarter notes. The slow, held notes give it that gentle, flowing feeling. Long notes = calm. Short notes = energetic. The mix creates the mood.", abc:'X:1\nM:4/4\nL:1/4\nK:C\nE | C2 E C | E2 D |', piano:{} },
  ],
  quiz: [
    { q:'How many beats does a quarter note get?', options:['4','2','1','Half'], correct:2 },
    { q:'What does a whole note look like?', options:['Black circle with stick','Black circle with flag','Empty circle, no stick','A zigzag'], correct:2 },
    { q:'A half note gets how many beats?', options:['1','2','3','4'], correct:1 },
    { q:'What does a dot after a note do?', options:['Makes it shorter','Makes it louder','Makes it 50% longer','Removes it'], correct:2 },
    { q:'A rest means...', options:['Play louder','Play softer','Silence','Repeat'], correct:2 },
  ],
  drill:{types:['noteNaming','interval'],clefs:['treble','bass'],range:'staff',intervals:[2],timer:10,count:15}, advance:0.75 },

// ============================================================
// LESSON 5: Skips
// ============================================================
{ id:5, title:'Skips', sub:'Jumping over a note', piece:'',
  steps: [
    { text:"You know steps — moving to the next-door note. Now let's learn SKIPS. A skip JUMPS OVER one note. Instead of C to D (step), it's C to E (skip) — you jumped over D. On the piano, you skip one white key.", abc:makeABC(['C4','E4'],'treble'), piano:{[60]:'#FACC15',[64]:'#FACC15'} },
    { text:"How to spot a skip on the staff: both notes are on the SAME TYPE. Both on lines, or both in spaces. There's a little gap between them — they're NOT touching like steps are.", abc:makeABC(['E4','G4'],'treble'), piano:{[64]:'#FACC15',[67]:'#FACC15'} },
    { text:"Compare: STEP = one note on a line, the next in a space (they touch, they alternate). SKIP = both on lines or both in spaces (there's a gap, they match). This is the fastest way to tell them apart — just look at whether they match or alternate!", abc:makeABC(['E4','F4','E4','G4'],'treble'), piano:{} },
    { text:"Here's a SUPER USEFUL trick called the ODD/EVEN RULE. A step is called a '2nd' (2 notes involved). A skip is called a '3rd' (3 notes). 2 is EVEN. 3 is ODD. EVEN intervals (like steps) ALTERNATE types — line to space. ODD intervals (like skips) MATCH types — line to line or space to space.", abc:makeABC(['C4','D4','C4','E4'],'treble'), piano:{} },
    { text:"This rule works for ALL intervals, not just steps and skips. But for now, just remember: alternating types = step. Matching types = skip. One glance and you know!", abc:makeABC(['C4','D4'],'treble'), piano:{[60]:'#4ADE80',[62]:'#4ADE80'} },
    { text:"Skips are important because they BUILD CHORDS. Stack up two skips — C, E, G — and you get a chord. Three notes, all matching types (all on lines or all in spaces). When you see a stack of matching-type notes, that's a chord.", abc:makeChordABC(['C4','E4','G4'],'treble'), piano:{[60]:'#FACC15',[64]:'#FACC15',[67]:'#FACC15'} },
    { text:"On the piano, a skip means your finger jumps over one white key. C to E: skip D. E to G: skip F. It's a slightly bigger movement than a step, but your hand learns it fast.", abc:makeABC(['C4','E4','G4'],'treble'), piano:{[60]:'#FACC15',[64]:'#FACC15',[67]:'#FACC15'} },
    { text:"Most music is a MIX of steps and skips. When you see notes going step-step-step, your fingers walk. When you see a skip, your finger hops. Walk, walk, hop, walk. That's most melodies!", abc:makeABC(['C4','D4','E4','G4','F4','E4'],'treble'), piano:{} },
    { text:"Bach's Minuet in G mixes steps and skips beautifully. With these two intervals, you can read most simple music. Let's try!", abc:'X:1\nM:3/4\nL:1/4\nK:G\nD G A | B G B | c B A | G2 z |', piano:{} },
  ],
  quiz: [
    { q:'A skip means...', options:['Playing the next-door note','Jumping over one note','Playing two notes together','A rest'], correct:1 },
    { q:'On the staff, a skip looks like...', options:['Notes touching (line to space)','Notes matching (both lines or both spaces)','Notes stacked vertically','Notes far apart'], correct:1 },
    { q:'Steps are EVEN, skips are ODD. What does that mean visually?', options:['Steps match types, skips alternate','Steps alternate types, skips match types','Both alternate','Both match'], correct:1 },
    { q:'What do stacked skips make?', options:['A scale','A rest','A chord','A beat'], correct:2 },
  ],
  drill:{types:['noteNaming','interval','oddEven'],clefs:['treble','bass'],range:'staff',intervals:[2,3],timer:10,count:20}, advance:0.75 },

// ============================================================
// LESSON 6: Steps & Skips Together
// ============================================================
{ id:6, title:'Steps & Skips Together', sub:'Reading music like reading words', piece:'Ode to Joy',
  steps: [
    { text:"Here's a crazy fact: about 80% of all melodies are JUST steps and skips. That means with what you already know, you can read most music! Now we need to get FAST at telling them apart — no hesitating.", abc:makeABC(['C4','D4','E4','G4','F4','E4'],'treble'), piano:{} },
    { text:"Quick check: Notes touching (alternate types) = STEP. Notes with a gap (matching types) = SKIP. That's your instant test. See two notes? Check: touching or gap? Match or alternate? Done.", abc:makeABC(['F4','G4','F4','A4'],'treble'), piano:{} },
    { text:"New skill: READ AHEAD. Right now you probably look at one note, play it, look at the next, play it. Instead, try to look 2-3 notes ahead of what you're playing. It feels weird at first but it's how fast readers work — like reading words instead of letters.", abc:makeABC(['C4','D4','E4','G4','F4','E4','D4','C4'],'treble'), piano:{} },
    { text:"Another skill: see the SHAPE. A melody going up by steps looks like stairs going up. A melody zigzagging looks like a wave. A melody with a big skip looks like a jump. Read the shape, not each individual note.", abc:makeABC(['C4','E4','D4','F4','E4','G4'],'treble'), piano:{} },
    { text:"Group notes into chunks: 'three notes stepping up' is one thought, not three separate thoughts. 'Skip up then step down' is one shape, not three notes. Thinking in groups is much faster.", abc:makeABC(['C4','D4','E4','E4','D4','C4'],'treble'), piano:{} },
    { text:"Don't look at your hands! When you see a step on the page, move your finger to the next key WITHOUT looking down. When you see a skip, jump one key WITHOUT looking. Eyes on the music, trust your fingers.", abc:makeABC(['E4','F4','E4','G4'],'treble'), piano:{} },
    { text:"Soon you'll play a slow, gentle tune with both hands. The right hand will use mostly steps and small skips while the left holds simple long notes — like a lullaby.", abc:'X:1\nM:3/4\nL:1/4\nK:C\nE G E | D C D | E G c | G2 z |', piano:{} },
    { text:"Practice tip: find any simple melody and read JUST the intervals. Don't name notes. Follow the direction: step up, step down, skip up, same. You'll be surprised how much you can read already!", abc:makeABC(['G4','A4','B4','G4'],'treble'), piano:{} },
  ],
  quiz: [
    { q:'About how much of all melodies are just steps and skips?', options:['20%','50%','80%','100%'], correct:2 },
    { q:'What does "reading ahead" mean?', options:['Reading the title first','Looking 2-3 notes ahead of what you play','Reading the last note first','Reading backwards'], correct:1 },
    { q:'How should you check if something is a step or skip?', options:['Count the letter names','Check if notes touch or have a gap','Listen to the sound','Ask someone'], correct:1 },
  ],
  walkthrough: [
    "This is Beethoven's famous tune — written here in C major so you only use white keys (no sharps or flats yet).",
    "Bar 1: E E F G. The first two Es repeat, then F is one step up, then G is one step up.",
    "Bar 2: G F E D. Walking down the staff — each note is one step lower.",
    "Bar 3: C C D E. C repeats, then steps up through D and E.",
    "Bar 4: E D D — the last D is a long half note (hold it two beats).",
    "Bars 5–8 repeat the same idea with a small change at the very end (last note is C). It's almost all steps — exactly what you've been practising.",
    "Start on E above Middle C. If you can read steps, you can play this.",
  ],
  drill:{types:['noteNaming','interval','oddEven','pattern'],clefs:['treble','bass'],range:'staff',intervals:[2,3],timer:7,count:20}, advance:0.78 },

// ============================================================
// LESSON 7: Counting
// ============================================================
{ id:7, title:'Counting Along', sub:'Keeping track of the beat', piece:'When the Saints (Simple)',
  steps: [
    { text:"You know beats from Lesson 2. Now let's learn to COUNT them. In 4/4 time, you count out loud: '1, 2, 3, 4, 1, 2, 3, 4.' Every quarter note gets one count. A half note? Hold for two counts: '1, 2.' A whole note? '1, 2, 3, 4.'", abc:'X:1\nM:4/4\nL:1/4\nK:C\nC C C C | C2 C2 | C4 |', piano:{} },
    { text:"But what about notes BETWEEN the beats? Eighth notes are HALF a beat each — two of them fit in one beat. To count eighths, we say '1 AND 2 AND 3 AND 4 AND.' The numbers are the beats, the 'ands' are halfway between.", abc:'X:1\nM:4/4\nL:1/8\nK:C\nCD EF GA Bc |', piano:{} },
    { text:"DOWNBEATS are the numbered beats: 1, 2, 3, 4. They're called 'down' because that's when a conductor's hand goes down. UPBEATS are the 'ands' — the hand goes up. Most melodies start on beat 1 (a downbeat).", abc:'X:1\nM:4/4\nL:1/4\nK:C\nC D E F |', piano:{} },
    { text:"But some melodies start BEFORE beat 1 — on an upbeat. This is called a PICKUP. 'When the Saints Go Marching In' starts with a pickup: the first few notes come before the first full bar. When you see a short first bar, those are pickup notes.", abc:'X:1\nM:4/4\nL:1/4\nK:C\nE | C E F G |', piano:{} },
    { text:"A TIE is a curved line connecting two notes that are the SAME pitch. It means hold through — don't play the second note again. Just keep holding. A quarter note tied to another quarter = hold for 2 beats total (same as a half note, but written differently).", abc:'X:1\nM:4/4\nL:1/4\nK:C\nC D E F | G2-G2 |', piano:{} },
    { text:"SYNCOPATION is when a note comes on an unexpected beat — like landing on the 'and' instead of the number. It creates a 'pushed' feeling. Jazz, pop, and funk are full of syncopation. It sounds cool once you feel it.", abc:'X:1\nM:4/4\nL:1/8\nK:C\nz C C2 z C | C2 z C C2 z2 |', piano:{} },
    { text:"The key to counting: set your internal clock to the SMALLEST note you see. If the smallest note is an eighth, count in eighths: '1-and-2-and-3-and-4-and.' Everything else fits into that grid naturally.", abc:'X:1\nM:4/4\nL:1/8\nK:C\nC2 DE F2 G2 |', piano:{} },
    { text:"When the Saints has pickups, rests, and held notes — perfect for practicing your counting. Count out loud as you play!", abc:'X:1\nM:4/4\nL:1/4\nK:C\nC E F | G3 C | E F G3 |', piano:{} },
  ],
  quiz: [
    { q:'In 4/4 time, how do you count eighth notes?', options:['1, 2, 3, 4','1 and 2 and 3 and 4 and','Fast fast fast fast','A B C D'], correct:1 },
    { q:'What is a pickup?', options:['A louder note','Notes before the first full bar','A rest','A fast note'], correct:1 },
    { q:'A tie means...', options:['Play the note twice','Hold through without replaying','Play louder','Play softer'], correct:1 },
    { q:'Syncopation means...', options:['Playing on the beat','Playing between beats (unexpected)','Playing slowly','Playing loudly'], correct:1 },
  ],
  walkthrough: [
    "This is When the Saints Go Marching In. It starts with a PICKUP — notes before the first full bar.",
    "The pickup notes are: C, E, F. These come before beat 1 of the first full bar.",
    "Bar 1: G is a long note — hold it! Notice how some notes are half notes (held for 2 beats) and some are quarter notes (1 beat).",
    "Look for the RESTS — those moments of silence. Don't rush through them. They're part of the music.",
    "The melody mostly uses steps and small skips. C to E is a skip (jumping over D). E to F is a step.",
    "Try counting along: the pickup is on beats 3 and 4, then bar 1 starts on beat 1 with the long G note.",
  ],
  drill:{types:['noteNaming','interval','oddEven'],clefs:['treble','bass'],range:'staff',intervals:[2,3],timer:7,count:20}, advance:0.75 },

// ============================================================
// LESSON 8: Both Hands & Loud/Soft
// ============================================================
{ id:8, title:'Both Hands & Volume', sub:'Using left and right together', piece:'Gymnopédie No. 1 (Both Hands)',
  steps: [
    { text:"Real piano music uses TWO staves stacked on top of each other. Top staff (treble clef) = right hand. Bottom staff (bass clef) = left hand. When notes appear on both staves at the same time, both hands play at the same time. Don't worry — it's usually simpler than it looks!", abc:makeABC(['C4','E4'],'treble'), piano:{[60]:'#60A5FA',[64]:'#60A5FA'} },
    { text:"Bass clef works the same as treble — you just use your F landmark instead of G. Remember the bass clef's two dots? They point at F on the fourth line. Count from F just like you count from G in treble clef.", abc:makeABC(['F3','G3','A3'],'bass'), piano:{[53]:'#C8A96E',[55]:'#4ADE80',[57]:'#4ADE80'} },
    { text:"Tip: Don't try to read both staves at the same time. Glance at the right hand, then the left hand. In most beginner music, the left hand plays simple things (long notes, simple chords) while the right hand plays the melody.", abc:makeABC(['D3','A3'],'bass'), piano:{[50]:'#60A5FA',[57]:'#60A5FA'} },
    { text:"Now let's talk about VOLUME. Those little letters you see under the staff tell you how loud or soft to play. 'p' means soft (piano in Italian). 'f' means loud (forte). 'mf' means medium loud. 'pp' means very soft. 'ff' means very loud.", abc:'X:1\nM:4/4\nL:1/4\nK:clef=treble\n!pp!C !p!D !mf!E !f!F|', piano:{} },
    { text:"Volume makes music FEEL something. Soft music feels gentle, like a whisper. Loud music feels powerful, like a shout. Playing everything at the same volume is like talking in a robot voice — boring! Volume gives music emotion.", abc:'X:1\nM:4/4\nL:1/4\nK:C\n!p!C D !f!E F|', piano:{} },
    { text:"CRESCENDO means 'gradually get louder.' It looks like an opening angle bracket: <. DECRESCENDO (or diminuendo) means 'gradually get softer.' It looks like a closing bracket: >. Think of them as volume sliders — smooth changes, not sudden jumps.", abc:'X:1\nM:4/4\nL:1/4\nK:clef=treble\n!<(!C D E F|G A B !<)!c|', piano:{} },
    { text:"Music like this is often marked pp (very soft). The left hand holds long notes while the right hand plays a gentle melody. The softness is the mood — like a whisper.", abc:'X:1\nM:3/4\nL:1/4\nK:C\n!pp!E G E | D C D |', piano:{} },
  ],
  quiz: [
    { q:'Top staff is for which hand?', options:['Left','Right','Both','Neither'], correct:1 },
    { q:'What does "p" mean in music?', options:['Play fast','Play soft','Play loud','Pause'], correct:1 },
    { q:'What does "f" mean?', options:['Fast','Flat','Forte (loud)','Finish'], correct:2 },
    { q:'A crescendo means...', options:['Get softer','Get louder','Get faster','Get slower'], correct:1 },
    { q:'The bass clef dots point at which note?', options:['C','G','F','A'], correct:2 },
  ],
  walkthrough: [
    "This study uses the same idea as Satie's Gymnopédie — soft, slow, three beats per bar — but everything is in C major (white keys only) so it matches what you've learned so far.",
    "RIGHT HAND: mostly steps and small skips. Take it one bar at a time.",
    "LEFT HAND: one long bass note per bar (whole-bar notes). It supports the melody — you don't need to move the left hand much.",
    "It's marked pp (very soft). Keep the touch light.",
    "Count in threes: ONE two three. Start with the right hand alone, then add the left.",
  ],
  drill:{types:['noteNaming','interval'],clefs:['treble','bass'],range:'staff',intervals:[2,3],timer:7,count:15}, advance:0.75 },

// ============================================================
// LESSON 9: Small Leaps (4ths and 5ths)
// ============================================================
{ id:9, title:'Small Leaps', sub:'Bigger jumps: 4ths and 5ths', piece:'Für Elise (Opening)',
  steps: [
    { text:"You know steps (moving 1 position) and skips (jumping 2 positions). Now we go bigger: a 4TH jumps 3 positions, and a 5TH jumps 4 positions. These are called LEAPS because your hand has to actually move — you can't just slide to the next key.", abc:makeABC(['C4','F4'],'treble'), piano:{[60]:'#FB923C',[65]:'#FB923C'} },
    { text:"A 4TH spans four letter names: C to F (C-D-E-F, count 4 letters). Since 4 is EVEN, a 4th ALTERNATES types on the staff — one note on a line, the other in a space. It looks like a step but with a BIGGER gap.", abc:makeABC(['C4','F4'],'treble'), piano:{[60]:'#FB923C',[65]:'#FB923C'} },
    { text:"A 5TH spans five letters: C to G (C-D-E-F-G). Since 5 is ODD, a 5th MATCHES types — both on lines or both in spaces. It looks like a skip but bigger. Hum 'Twinkle Twinkle' — the first jump (C to G) is a 5th!", abc:makeABC(['C4','G4'],'treble'), piano:{[60]:'#FB923C',[67]:'#FB923C'} },
    { text:"The odd/even rule still works perfectly! 2nd (step) = even = alternates. 3rd (skip) = odd = matches. 4th = even = alternates. 5th = odd = matches. One glance at the staff and you can classify any interval.", abc:makeABC(['C4','D4','C4','E4','C4','F4','C4','G4'],'treble'), piano:{} },
    { text:"For leaps, DON'T look at your hands. Feel the distance. A 4th feels like stretching your hand slightly. A 5th feels like stretching further. Practice: play C, then jump to F without looking. Then C to G. Your muscles will learn.", abc:makeABC(['C4','F4','C4','G4'],'treble'), piano:{} },
    { text:"The real Für Elise uses black keys — you'll play that after you learn key signatures. For now, this study uses the same kinds of moves (steps, skips, 4ths, 5ths) in C major so every note is white-key.", abc:'X:1\nM:4/4\nL:1/8\nK:C\nCE CE CE GE |', piano:{} },
  ],
  quiz: [
    { q:'A 4th spans how many letter names?', options:['2','3','4','5'], correct:2 },
    { q:'A 5th is ODD, so on the staff it...', options:['Alternates types (line to space)','Matches types (both lines or both spaces)','Looks the same as a step','Is invisible'], correct:1 },
    { q:'A 4th is EVEN, so on the staff it...', options:['Matches types','Alternates types','Looks like a chord','Is very small'], correct:1 },
  ],
  walkthrough: [
    "This is a leap-practice study in C major (same skills as the opening of Für Elise, but no sharps yet).",
    "Bar 1 uses quick eighth notes — stepwise motion and small jumps. Go slowly until it feels easy.",
    "Bar 2 has wider jumps: notice when the melody jumps a 4th or 5th to a new C or G.",
    "Bars 3–4 mix steps and leaps. Name the interval if it helps, or just feel the distance.",
    "When you're ready for the real piece in A minor (with sharps), you'll have the motions in your hands.",
  ],
  drill:{types:['noteNaming','interval','oddEven'],clefs:['treble','bass'],range:'staff',intervals:[2,3,4,5],timer:7,count:25}, advance:0.72 },

// ============================================================
// LESSON 10: Articulation
// ============================================================
{ id:10, title:'How to Play Each Note', sub:'Short, smooth, loud, held', piece:'Minuet in G Minor (Simple)',
  steps: [
    { text:"You know WHICH notes to play and HOW LONG. Now: HOW should each note SOUND? Articulation marks are little symbols that change the character of a note. Same note, totally different feeling — like saying 'hello' versus whispering it versus shouting it.", abc:makeABC(['C4','D4','E4','F4'],'treble'), piano:{} },
    { text:"STACCATO = a tiny dot above or below the note. It means 'short and bouncy.' Press the key and immediately let go, like the key is hot. The note bounces — crisp, light, playful.", abc:'X:1\nM:4/4\nL:1/4\nK:clef=treble\n.C .D .E .F|', piano:{} },
    { text:"LEGATO = a curved line (slur) connecting notes. It means 'smooth and connected.' Each note flows into the next with no gap. Hold each key until the exact moment you press the next. Like pouring syrup — smooth, no breaks.", abc:'X:1\nM:4/4\nL:1/4\nK:clef=treble\n(C D E F)|', piano:{} },
    { text:"ACCENT = a > or ^ above the note. It means 'hit this one harder.' Play it noticeably louder than the notes around it. Like putting CAPS on a word in a text message.", abc:'X:1\nM:4/4\nL:1/4\nK:clef=treble\n!accent!C D !accent!E F|', piano:{} },
    { text:"TENUTO = a small horizontal line above the note. It means 'hold this one for its full value — don't rush.' Where staccato says 'short!', tenuto says 'take your time with this one.'", abc:'X:1\nM:4/4\nL:1/4\nK:clef=treble\n!tenuto!C !tenuto!D !tenuto!E !tenuto!F|', piano:{} },
    { text:"FERMATA = a dot with a curved line over it (like an eye). It means 'HOLD — longer than written.' The music pauses. You decide how long. It's a moment of freedom — a musical deep breath.", abc:'X:1\nM:4/4\nL:1/4\nK:clef=treble\nC D !fermata!E F|', piano:{} },
    { text:"Quick guide: Dot = staccato (short). Curve = legato (smooth). > = accent (loud). Line = tenuto (hold full). Eye = fermata (hold extra long). These symbols show up everywhere — learn to spot them!", abc:makeABC(['C4'],'treble'), piano:{} },
  ],
  quiz: [
    { q:'A dot above a note means...', options:['Hold it longer','Play it short and bouncy (staccato)','Play it louder','Play it softer'], correct:1 },
    { q:'A curved line connecting notes means...', options:['Play them short','Play them smooth and connected (legato)','Play them loud','Skip them'], correct:1 },
    { q:'An accent (>) means...', options:['Play softer','Play shorter','Play that note louder','Hold longer'], correct:2 },
    { q:'A fermata means...', options:['Play fast','Hold the note longer than written','Rest','Repeat'], correct:1 },
  ],
  walkthrough: [
    "This minuet-style study is in C major so you can focus on articulation — not accidentals.",
    "Bar 1: STACCATO dots — short, bouncy notes.",
    "Bar 2: One note has an ACCENT — make it a little louder than its neighbors.",
    "Bar 3: A SLUR — connect these notes smoothly.",
    "Bar 4: STACCATO again, then the last note has a FERMATA — hold it longer than written.",
  ],
  drill:{types:['noteNaming','interval','articulation'],clefs:['treble','bass'],range:'staff',intervals:[2,3,4,5],timer:10,count:20}, advance:0.80 },

// ============================================================
// LESSON 11: Key Signatures
// ============================================================
{ id:11, title:'Sharps and Flats', sub:'When notes move to black keys', piece:'Key Signature Melody',
  steps: [
    { text:"So far, everything has been in C major — all white keys, no sharps or flats. But most music uses other keys. A KEY SIGNATURE is the group of sharps (#) or flats (b) you see right after the clef. It tells you which notes are ALWAYS sharp or flat in the whole piece.", abc:'X:1\nM:4/4\nL:1/4\nK:G\nG A B d |', piano:{} },
    { text:"Think of it like a permanent rule. If you see one sharp on the F line, it means EVERY F in the entire piece is F-sharp (the black key above F). You don't need a # sign on each note — the key signature handles it once at the start.", abc:'X:1\nM:4/4\nL:1/4\nK:G\nE F G A |', piano:{} },
    { text:"One sharp (on F) = key of G major. Two sharps (F# and C#) = key of D major. One flat (on B) = key of F major. You don't need to memorise all of these — just look at what's sharp or flat and remember those notes use black keys.", abc:'X:1\nM:4/4\nL:1/4\nK:D\nD E F G | A G F E |', piano:{} },
    { text:"An ACCIDENTAL is a sharp, flat, or natural sign written next to ONE specific note (not in the key signature). It only lasts until the end of that bar. A NATURAL sign (looks like a square) cancels a sharp or flat for one bar.", abc:'X:1\nM:4/4\nL:1/4\nK:G\nG A =F G |', piano:{} },
    { text:"Don't panic when you see sharps or flats! The interval reading system works exactly the same. Steps are still steps. Skips are still skips. The only difference is that some white keys become black keys. Your eyes still read the distance.", abc:'X:1\nM:4/4\nL:1/4\nK:G\nG A B d | c B A G |', piano:{} },
  ],
  quiz: [
    { q:'A key signature tells you...', options:['How fast to play','Which notes are always sharp or flat','How loud to play','When to stop'], correct:1 },
    { q:'One sharp in the key signature means key of...', options:['C major','D major','G major','F major'], correct:2 },
    { q:'An accidental lasts until...', options:['The end of the piece','The end of the bar','The next note','Forever'], correct:1 },
    { q:'A natural sign...', options:['Makes a note louder','Cancels a sharp or flat','Adds a sharp','Ends the piece'], correct:1 },
  ],
  walkthrough: [
    "This melody is in G major — see the one sharp (F#) in the key signature? Every F you see is actually F-sharp.",
    "That means on the piano, whenever you'd play F, play the black key ABOVE F instead. That's your only change from C major.",
    "The melody starts on G and uses mostly steps and skips within the G major scale.",
    "Watch for the F# — it appears naturally because it's in the key signature. You don't need a # symbol on each one.",
    "Try playing the G major scale first: G, A, B, C, D, E, F#, G. Get your fingers used to that F#, then play the piece.",
  ],
  drill:{types:['noteNaming','interval','keySignature'],clefs:['treble','bass'],range:'staff',intervals:[2,3,4,5],timer:10,count:20}, advance:0.75 },

// ============================================================
// LESSON 12: Two Notes at Once
// ============================================================
{ id:12, title:'Two Notes at Once', sub:'Playing harmony', piece:'Simple Harmonies',
  steps: [
    { text:"Until now, you've read one note at a time. But piano music often has TWO notes stacked on top of each other, meant to be played at the same time. This is HARMONY. When you see two notes lined up vertically, press both keys together.", abc:makeChordABC(['C4','E4'],'treble'), piano:{[60]:'#FACC15',[64]:'#FACC15'} },
    { text:"The trick: read the INTERVAL between the two notes. Both on the same type (lines or spaces) with a small gap = a 3rd. Cross types with a bigger gap = a 6th. You already know how to classify intervals! Same rules, just vertical instead of horizontal.", abc:makeChordABC(['E4','G4'],'treble'), piano:{[64]:'#FACC15',[67]:'#FACC15'} },
    { text:"How to read two notes quickly: 1) Figure out the BOTTOM note (use your landmarks). 2) Read the INTERVAL to the top note. 3) Play both. You only need to name ONE note — the other comes from the interval.", abc:makeChordABC(['F4','A4'],'treble'), piano:{[65]:'#FACC15',[69]:'#FACC15'} },
    { text:"When two-note pairs MOVE TOGETHER (both go up by a step, or both go down), you only need to track ONE of them. The other follows. This is called PARALLEL MOTION — very common and very easy to read.", abc:'X:1\nM:4/4\nL:1/4\nK:C\n[CE] [DF] [EG] [FA] |', piano:{} },
    { text:"This prepares you for full chords (3 notes) later. If you can read two notes at once, three is just one more. And it prepares you for reading both hands — the left hand often plays simple intervals while the right plays melody.", abc:makeChordABC(['C4','E4','G4'],'treble'), piano:{[60]:'#FACC15',[64]:'#FACC15',[67]:'#FACC15'} },
  ],
  quiz: [
    { q:'When you see two notes stacked vertically, you should...', options:['Play only the top one','Play only the bottom one','Play both at the same time','Skip them'], correct:2 },
    { q:'To read two notes quickly, start with...', options:['The top note','The bottom note','Both at once','Neither'], correct:1 },
    { q:'Parallel motion means...', options:['Notes move in opposite directions','Both notes move the same way','Notes stay still','Notes get louder'], correct:1 },
  ],
  walkthrough: [
    "This piece has TWO notes stacked together — played at the same time. Don't panic!",
    "Each pair is a THIRD — both notes are on the same type (both lines or both spaces). Skip one key between them.",
    "The pairs move in PARALLEL — both notes step up together, or both step down. Track the bottom note and the top follows.",
    "The final bar has THREE notes stacked — a full chord! C, E, and G together. Press all three at once.",
    "Start by playing just the bottom notes as a melody. Then add the top notes one bar at a time.",
  ],
  drill:{types:['noteNaming','interval','oddEven'],clefs:['treble','bass'],range:'staff',intervals:[2,3,4,5],timer:7,count:20}, advance:0.75 },

// ============================================================
// LESSON 13: Compound Time & Triplets
// ============================================================
{ id:13, title:'Feeling in Threes', sub:'Waltz feel and triplets', piece:'Greensleeves (Simple)',
  steps: [
    { text:"So far, every beat has divided into TWO halves (eighth notes). But beats can also divide into THREE. This gives music a flowing, swaying, dance-like feel. Think of a waltz: ONE-two-three, ONE-two-three.", abc:'X:1\nM:6/8\nL:1/8\nK:C\nCDE FGA |', piano:{} },
    { text:"6/8 time means 6 eighth notes per bar, grouped 3+3. But it actually FEELS like 2 big beats, with each beat containing 3 smaller pulses. Count: ONE-two-three TWO-two-three.", abc:'X:1\nM:6/8\nL:1/8\nK:C\nCDE FGA | GFE DCB, |', piano:{} },
    { text:"A TRIPLET forces this 3-feel inside regular 4/4 time. It's marked with a '3' above a group of notes. Three notes squeezed into the time of two. Say 'pine-ap-ple' — three equal parts in one beat.", abc:'X:1\nM:4/4\nL:1/4\nK:C\n(3CDE (3FGA (3Bcd (3edc |', piano:{} },
    { text:"The whole first movement of Moonlight Sonata is triplets. Three notes per beat, rolling like gentle waves. When you see that little '3,' your internal pulse divides by three instead of two.", abc:'X:1\nM:4/4\nL:1/8\nK:C\n(3CEG (3CEG (3CEG (3CEG |', piano:{} },
    { text:"Greensleeves has that swaying, lilting feel — quarter notes mixed with eighth notes in 3/4 time. It's the perfect piece for feeling the 'three' groove.", abc:'X:1\nM:3/4\nL:1/8\nK:Am\nA2 | c2 d2 | e3 f e2 | d2 B2 |', piano:{} },
  ],
  quiz: [
    { q:'6/8 time feels like...', options:['6 equal beats','2 big beats (each with 3 pulses)','3 big beats','1 big beat'], correct:1 },
    { q:'A triplet is...', options:['3 notes in the time of 2','2 notes in the time of 3','3 rests','A type of chord'], correct:0 },
    { q:'What word helps you feel a triplet?', options:['Hello','Bye','Pineapple','Stop'], correct:2 },
  ],
  walkthrough: [
    "Greensleeves! This piece has a lilting 3/4 feel. Count: ONE two three, ONE two three.",
    "The melody uses dotted quarter notes — hold those for 1.5 beats. They create the characteristic long-short swing.",
    "Watch for the eighth notes — they're the quick connecting notes between the longer ones.",
    "The melody goes up with steps and skips, then comes back down. Follow the contour — the shape of the melody.",
    "Start slowly. The dotted rhythm takes practice — count carefully: long, short, long, short.",
  ],
  drill:{types:['noteNaming','interval','oddEven','pattern'],clefs:['treble','bass'],range:'staff',intervals:[2,3,4,5],timer:7,count:20}, advance:0.75 },

// ============================================================
// LESSON 14: Dynamics & Phrasing
// ============================================================
{ id:14, title:'Making Music Breathe', sub:'Volume shapes and musical sentences', piece:'Clair de Lune (Theme)',
  steps: [
    { text:"A PHRASE is like a sentence in music. It has a beginning, a middle, and an end. And just like when you speak — your voice rises in the middle of a sentence and falls at the end — music does the same with volume.", abc:makeABC(['C4','D4','E4','F4','G4','F4','E4','D4'],'treble'), piano:{} },
    { text:"Most phrases follow an ARCH shape: start soft, build to a peak, then come back down. This arch is what makes music sound human instead of robotic. Like a wave building and receding.", abc:'X:1\nM:4/4\nL:1/4\nK:clef=treble\n!<(!C D E F|!<)!G !>(!F E D|!>)!C4|', piano:{} },
    { text:"The full volume range: ppp (barely audible) → pp (very soft) → p (soft) → mp (medium soft) → mf (medium loud) → f (loud) → ff (very loud) → fff (full power). Most music lives between p and f.", abc:'X:1\nM:4/4\nL:1/4\nK:clef=treble\n!pp!C !p!D !mf!E !ff!F|', piano:{} },
    { text:"SILENCE is a dynamic too! Rests aren't empty — they're pauses for breath, tension, anticipation. Don't rush through rests. A well-timed silence can be more powerful than any note.", abc:'X:1\nM:4/4\nL:1/4\nK:clef=treble\nC D E z | z G A B |', piano:{} },
    { text:"Debussy's Clair de Lune breathes — volume swells and recedes like ocean waves. The notes are the water, dynamics are the tide. Play it softly and let it flow.", abc:'X:1\nM:4/4\nL:1/4\nK:clef=treble\n!pp!C D !<(!E F | G !<)!!>(!A B c | !>)!d4|', piano:{} },
  ],
  quiz: [
    { q:'A phrase in music is like a...', options:['Single note','Sentence','Whole song','Rest'], correct:1 },
    { q:'What does "pp" mean?', options:['Very loud','Very soft','Medium','Fast'], correct:1 },
    { q:'A crescendo (<) means...', options:['Get softer','Get louder','Speed up','Slow down'], correct:1 },
  ],
  walkthrough: [
    "This is a dynamics study in C major — the same phrasing idea as Clair de Lune (soft lines that breathe), but only white keys.",
    "Watch for pp, p, and mf — change your touch when the marking changes.",
    "The hairpins show crescendo and diminuendo — smooth volume swells, not sudden jumps.",
    "Let phrases rise and fall like a sentence. That's what 'making music breathe' means.",
  ],
  drill:{types:['noteNaming','interval','oddEven'],clefs:['treble','bass'],range:'staff',intervals:[2,3,4,5],timer:7,count:20}, advance:0.78 },

// ============================================================
// LESSON 15: Large Leaps & Octaves
// ============================================================
{ id:15, title:'Big Jumps', sub:'6ths, 7ths, and octaves', piece:'Arabesque No. 1 (Theme)',
  steps: [
    { text:"6ths, 7ths, and octaves — the big jumps! The secret: COMMIT. Like throwing a ball — don't hesitate, aim and go. Your hand will learn these distances with practice.", abc:makeABC(['C4','A4'],'treble'), piano:{[60]:'#F87171',[69]:'#F87171'} },
    { text:"An OCTAVE is special — same note name, different register. C to the next C up. On the piano, thumb to pinky usually covers an octave. It sounds like 'the same note, but higher.'", abc:makeABC(['C4','C5'],'treble'), piano:{[60]:'#F87171',[72]:'#F87171'} },
    { text:"The odd/even rule still works! 6th = even = alternates. 7th = odd = matches. Octave = even = alternates. It scales perfectly for every interval size.", abc:makeABC(['C4','A4','B4','C5'],'treble'), piano:{} },
    { text:"For big leaps, READ AHEAD. If you see a big jump coming 2 notes before, start moving your hand while playing the current note. Preparation is key.", abc:makeABC(['E4','F4','G4','C5'],'treble'), piano:{} },
    { text:"Debussy's Arabesque has flowing lines with wide intervals. With everything from steps to octaves, you can now read virtually any interval in standard piano music!", abc:makeABC(['E4','C5','B4','G4'],'treble'), piano:{} },
  ],
  quiz: [
    { q:'An octave is...', options:['2 notes next to each other','The same note in a different register','3 notes stacked','A rest'], correct:1 },
    { q:'6th is even, so it...', options:['Matches types','Alternates types','Looks tiny','Is invisible'], correct:1 },
    { q:'The best strategy for big jumps is...', options:['Look at your hands','Close your eyes','Read ahead and prepare','Play slower'], correct:2 },
  ],
  walkthrough: [
    "Big-interval practice in C major — same reading skills as Debussy's Arabesque, without key-signature surprises.",
    "Watch for 6ths, 7ths, and octaves. Look ahead and commit to the jump.",
    "Bar 4 ends with a low C and high C together — an octave. Use a comfortable hand span; go slowly.",
    "Keep intervals smooth: trust the odd/even rule and the size of the gap on the staff.",
  ],
  drill:{types:['noteNaming','interval','oddEven'],clefs:['treble','bass'],range:'ledger',intervals:[2,3,4,5,6,7],timer:5,count:25}, advance:0.70 },

// ============================================================
// LESSON 16: Fingering & Scales
// ============================================================
{ id:16, title:'Fingering & Scales', sub:'Which finger plays which key', piece:'Prelude in C (Simple)',
  steps: [
    { text:"Every finger has a number. Hold up your hand: thumb = 1, index = 2, middle = 3, ring = 4, pinky = 5. Same for both hands. When you see little numbers near notes in sheet music, they tell you which finger to use.", abc:makeABC(['C4','D4','E4','F4','G4'],'treble'), piano:{[60]:'#60A5FA',[62]:'#60A5FA',[64]:'#60A5FA',[65]:'#60A5FA',[67]:'#60A5FA'}, fingers:{[60]:1,[62]:2,[64]:3,[65]:4,[67]:5} },
    { text:"The THUMB TUCK: for a C major scale going up (right hand), you play C-D-E with fingers 1-2-3. But now you're stuck! So your thumb (1) tucks UNDER your hand to land on F, and you continue 1-2-3-4-5 on F-G-A-B-C.", abc:makeABC(['C4','D4','E4','F4','G4','A4','B4','C5'],'treble'), piano:{}, fingers:{[60]:1,[62]:2,[64]:3,[65]:1,[67]:2,[69]:3,[71]:4,[72]:5} },
    { text:"Going back down, the reverse: finger 3 crosses OVER your thumb. It feels odd at first, but it's THE most important piano technique. Without it, you run out of fingers!", abc:makeABC(['C5','B4','A4','G4','F4','E4','D4','C4'],'treble'), piano:{} },
    { text:"ALWAYS plan your fingering BEFORE playing a passage. Look at where it starts and ends. Work backwards from tricky spots. Professional pianists spend serious time on fingering. It's the foundation.", abc:makeABC(['C4','D4','E4','F4','G4'],'treble'), piano:{}, fingers:{[60]:1,[62]:2,[64]:3,[65]:1,[67]:2} },
    { text:"Bach's Prelude in C BWV 846 is built entirely from arpeggiated patterns. Each bar is the same finger pattern, just with different notes. It sounds hard but it's actually very repetitive!", abc:'X:1\nM:4/4\nL:1/16\nK:C\nCEGc eGce |', piano:{} },
  ],
  quiz: [
    { q:'Thumb is finger number...', options:['0','1','2','5'], correct:1 },
    { q:'The thumb tuck is...', options:['Moving thumb over fingers','Tucking thumb under other fingers to reach more keys','Pressing two keys at once','A type of chord'], correct:1 },
    { q:'When should you plan fingering?', options:['After playing','While playing','Before playing','Never'], correct:2 },
  ],
  walkthrough: [
    "Bach's famous prelude pattern — here using eighth notes (not sixteenths) so you can focus on fingering and evenness first.",
    "Each bar breaks a chord into flowing eighths. The shape repeats with different chords (C, then D minor, G7, back to C).",
    "Plan fingering before you play. Thumb tuck when you need to continue up the keyboard.",
    "Keep every note the same volume — smooth as water. Speed comes later.",
  ],
  drill:{types:['noteNaming','interval','pattern'],clefs:['treble','bass'],range:'staff',intervals:[2,3,4,5],timer:7,count:20}, advance:0.78 },

// ============================================================
// LESSON 17: Arpeggios & Chords
// ============================================================
{ id:17, title:'Arpeggios & Chords', sub:'Notes stacked and rolled', piece:'Moonlight Sonata 1st mvt',
  steps: [
    { text:"An ARPEGGIO plays a chord one note at a time — like strumming a guitar. On the staff, it looks like skips all going in the same direction. Skip-skip-skip = arpeggio. Think of it as one shape, not separate notes.", abc:makeABC(['C4','E4','G4','C5'],'treble'), piano:{[60]:'#FACC15',[64]:'#FACC15',[67]:'#FACC15',[72]:'#FACC15'} },
    { text:"A CHORD plays all the notes AT ONCE — stacked vertically. The most basic chord is a TRIAD: three notes in skips. C-E-G = C major chord. It sounds happy. Change the middle note slightly and it sounds sad (C-Eb-G = C minor).", abc:makeChordABC(['C4','E4','G4'],'treble'), piano:{[60]:'#FACC15',[64]:'#FACC15',[67]:'#FACC15'} },
    { text:"The ENTIRE Moonlight Sonata 1st movement is arpeggios. Every single bar. The right hand rolls through chord patterns while the left hand holds bass notes. It looks dense on the page but it's actually very repetitive.", abc:'X:1\nM:4/4\nL:1/8\nK:clef=treble\n(CEG) (CEG) (CEG) (CEG)|', piano:{} },
    { text:"When you see stacked notes or sequential skips, think CHORD SHAPE. Which chord is it? Where does it move next? Thinking in chords is MUCH faster than reading each note separately.", abc:makeChordABC(['F4','A4','C5'],'treble'), piano:{} },
  ],
  quiz: [
    { q:'An arpeggio is...', options:['A chord played one note at a time','A scale','A rest','A loud note'], correct:0 },
    { q:'A triad is...', options:['Two notes','Three notes stacked in skips','Four notes','A rhythm pattern'], correct:1 },
    { q:'Moonlight Sonata 1st movement is built from...', options:['Scales','Arpeggios','Chords','Rests'], correct:1 },
  ],
  walkthrough: [
    "This study matches the Moonlight 1st movement idea: rolling arpeggios in the right hand with long bass notes in the left — in C major so you can focus on the pattern.",
    "Learn the right-hand broken chords first. Then add the left-hand whole notes (one bass note per bar).",
    "Use the sustain pedal lightly so the harmony blends — lift when the bass changes so it doesn't get muddy.",
    "The full Beethoven piece adds triplets and more keys; you've got the core motion here.",
  ],
  drill:{types:['noteNaming','interval','pattern','oddEven'],clefs:['treble','bass'],range:'staff',intervals:[2,3,4,5],timer:7,count:20}, advance:0.75 },

// ============================================================
// LESSON 18: Repeat Signs
// ============================================================
{ id:18, title:'Repeat Signs', sub:'Road signs in sheet music', piece:'March with Repeats',
  steps: [
    { text:"Sheet music isn't always read straight through. REPEAT SIGNS tell you to go back and play a section again. They look like two dots next to a double bar line. When you hit one, go back to the matching repeat sign and play that section again.", abc:'X:1\nM:4/4\nL:1/4\nK:C\n|: C D E F | G F E D :|', piano:{} },
    { text:"FIRST and SECOND ENDINGS: Play through ending 1, repeat, but the SECOND time skip ending 1 and play ending 2 instead. Brackets above the bars show which ending to use.", abc:'X:1\nM:4/4\nL:1/4\nK:C\n|: C D E F |[1 G F E D :|[2 G A B c |]', piano:{} },
    { text:"D.C. (Da Capo) = go back to the very beginning. D.S. (Dal Segno) = go back to the segno sign. 'Al Fine' = play until you see 'Fine' (the end). These are just road signs — follow them!", abc:makeABC(['C4','D4','E4','F4'],'treble'), piano:{} },
    { text:"The CODA is a special ending section. When you see 'To Coda,' jump to the coda sign at the end. Think of it as a bonus ending — the 'tail' of the piece.", abc:makeABC(['C4','E4','G4','C5'],'treble'), piano:{} },
    { text:"Before playing any new piece, SCAN for navigation symbols first. Find all the repeats, endings, D.C./D.S. marks. Map the order in your head. This 10-second scan saves minutes of confusion!", abc:'X:1\nM:4/4\nL:1/4\nK:C\n|: C E G c :| c G E C |]', piano:{} },
  ],
  quiz: [
    { q:'Repeat signs tell you to...', options:['Play louder','Go back and play a section again','Skip ahead','Stop playing'], correct:1 },
    { q:'D.C. means...', options:['Play quietly','Go back to the beginning','Go faster','End the piece'], correct:1 },
    { q:'Before playing a new piece, you should...', options:['Start immediately','Scan for repeat signs first','Play the last note first','Close your eyes'], correct:1 },
  ],
  walkthrough: [
    "This march has REPEAT SIGNS! See the two dots at the bar line? That means go back and play that section again.",
    "Play bars 1-3, hit the repeat sign, go back to bar 1, play bars 1-3 again. THEN continue to bar 4.",
    "After the repeat, bars 4-5 are new material — no repeats, just play straight through to the end.",
    "Before playing, scan the whole piece for repeat signs. Map out the road: bars 1-3 twice, then 4-5 once.",
  ],
  drill:{types:['noteNaming','interval','pattern','oddEven'],clefs:['treble','bass'],range:'staff',intervals:[2,3,4,5,6,7],timer:7,count:20}, advance:0.75 },

// ============================================================
// LESSON 19: Rhythm Mastery
// ============================================================
{ id:19, title:'Advanced Rhythm', sub:'Swing, dots, and complex patterns', piece:'Entertainer (Simple)',
  steps: [
    { text:"DOTTED EIGHTH + SIXTEENTH: a long-short pattern that sounds like galloping. Long-short, long-short. Very common in marches and classical music.", abc:'X:1\nM:4/4\nL:1/16\nK:C\nC3D E3F G3A B3c |', piano:{} },
    { text:"SWING means eighth notes aren't equal — the first is longer, the second shorter. Written as straight eighths, played as long-short. It's what makes jazz sound jazzy.", abc:'X:1\nM:4/4\nL:1/8\nK:C\nCE DF EG FA |', piano:{} },
    { text:"RUBATO means temporarily stretching or compressing time. Speed up a little, then slow down to compensate. It's like breathing — the music inhales and exhales. Chopin loved rubato.", abc:makeABC(['C4','D4','E4','F4'],'treble'), piano:{} },
    { text:"RITARDANDO (rit.) = gradually slow down. ACCELERANDO (accel.) = gradually speed up. A TEMPO = go back to the original speed. Like a car approaching a stop sign, then driving away.", abc:makeABC(['G4','A4','B4','C5'],'treble'), piano:{} },
    { text:"The Entertainer by Scott Joplin has syncopation on almost every beat. The melody lands on upbeats, giving it that bouncy, swinging ragtime feel. If you can read this rhythm, you can read anything!", abc:'X:1\nM:4/4\nL:1/8\nK:C\nDE | z E z c z c c2 |', piano:{} },
  ],
  quiz: [
    { q:'Swing rhythm means...', options:['All notes equal','First eighth longer, second shorter','Playing very fast','Playing very slow'], correct:1 },
    { q:'Ritardando means...', options:['Speed up','Slow down gradually','Get louder','Get softer'], correct:1 },
    { q:'A tempo means...', options:['Slow down','Speed up','Return to original speed','Stop'], correct:2 },
  ],
  walkthrough: [
    "The Entertainer by Scott Joplin! This is RAGTIME — the melody lands on unexpected beats (syncopation).",
    "Listen for the rests ON the beat with notes BETWEEN beats. That's what gives ragtime its bounce.",
    "The left hand keeps steady time while the right hand syncopates. Start with just the melody.",
    "The dotted rhythms (long-short) should feel like a gentle swing. Not straight, not totally uneven — somewhere in between.",
    "Start at HALF speed. Ragtime sounds great slow. Don't rush to full speed — enjoy the bounce.",
  ],
  drill:{types:['noteNaming','interval','pattern','oddEven','articulation'],clefs:['treble','bass'],range:'ledger',intervals:[2,3,4,5,6,7],timer:5,count:25}, advance:0.72 },

// ============================================================
// LESSON 20: Pedalling
// ============================================================
{ id:20, title:'The Sustain Pedal', sub:'Making the piano sing', piece:'Nocturne Op. 9 No. 2',
  steps: [
    { text:"The sustain pedal (the big one on the right, pressed with your right foot) makes notes keep ringing after you lift your fingers. It's like adding reverb — everything blends together. It makes the piano SING.", abc:makeABC(['C4','E4','G4','C5'],'treble'), piano:{} },
    { text:"OVERLAP PEDALLING: when you play a new chord, lift the pedal and press it back down at the EXACT same moment. This clears the old sound and catches the new one. Lift-and-press in one quick motion.", abc:makeABC(['C4','E4','F4','A4'],'treble'), piano:{} },
    { text:"DON'T pedal through staccato! Staccato = short and detached. Pedal = sustained. They contradict each other. Dots = no pedal. Slurs = pedal. Let your ear guide you — if it sounds muddy, you're pedalling too much.", abc:'X:1\nM:4/4\nL:1/4\nK:clef=treble\n.C .D .E .F|', piano:{} },
    { text:"Chopin's Nocturne Op.9 No.2: singing melodies over sustained bass notes. Without the pedal, the bass would die before the melody arrives. The pedal connects them. This is what the piano was made for.", abc:makeABC(['E4','F4','G4','A4'],'treble'), piano:{} },
  ],
  quiz: [
    { q:'The sustain pedal makes notes...', options:['Shorter','Keep ringing after you lift your fingers','Louder','Faster'], correct:1 },
    { q:'Should you pedal through staccato?', options:['Yes always','No — they contradict','Sometimes','Only in jazz'], correct:1 },
    { q:'Overlap pedalling means...', options:['Pressing two pedals','Lifting and pressing the pedal at the same moment','Never using the pedal','Pressing harder'], correct:1 },
  ],
  walkthrough: [
    "A nocturne-style study in C major: long singing notes in the right hand, slow bass in the left — perfect for practising the sustain pedal.",
    "Connect bass notes with the pedal so harmony supports the melody. Change pedal when the harmony changes.",
    "Keep the right hand legato — let phrases sing. Rubato (tiny pushes and pulls in time) is optional.",
    "When you're ready, explore Chopin's original in E-flat major in the library.",
  ],
  drill:{types:['noteNaming','interval','articulation'],clefs:['treble','bass'],range:'ledger',intervals:[2,3,4,5,6,7],timer:7,count:20}, advance:0.78 },

// ============================================================
// LESSON 21: Speed Reading
// ============================================================
{ id:21, title:'Speed Reading', sub:'See patterns, not individual notes', piece:'Rondo alla Turca',
  steps: [
    { text:"At fast speeds, you can't read one note at a time. You need to see GROUPS. Like reading words instead of spelling out letters. A run of steps = 'scale.' A run of skips = 'arpeggio.' One thought, not four notes.", abc:makeABC(['C4','D4','E4','F4','G4','A4','B4','C5'],'treble'), piano:{} },
    { text:"Read a FULL BAR ahead. Your eyes process the next bar while your fingers play the current one. Like driving — you look at the road ahead, not directly under your car.", abc:makeABC(['C4','E4','G4','E4','F4','A4','C5','A4'],'treble'), piano:{} },
    { text:"Stepwise passages PLAY THEMSELVES once your hand is in position. Only jumps need your attention. Mentally, you only 'read' the leaps — the steps are on autopilot.", abc:makeABC(['C4','D4','E4','F4','G4','E4','C5'],'treble'), piano:{} },
    { text:"Mozart's Rondo Alla Turca is fast and mostly stepwise. The key is grouping: see 'scale up 4 notes' not 'B-C-D-E.' Patterns, not atoms.", abc:'X:1\nM:2/4\nL:1/16\nK:Am\ne^de^d e^de^d|', piano:{} },
  ],
  quiz: [
    { q:'Speed reading means...', options:['Playing faster','Seeing groups/patterns instead of individual notes','Skipping notes','Reading backwards'], correct:1 },
    { q:'You should read how far ahead?', options:['The current note only','One note ahead','A full bar ahead','The whole piece'], correct:2 },
    { q:'Stepwise passages need...', options:['Extra attention for each note','Less attention — they play themselves','To be skipped','To be played louder'], correct:1 },
  ],
  walkthrough: [
    "Speed-reading study in C major: fast sixteenth-note scales and patterns — same skills as the Turkish March, without A minor or tricky key signatures.",
    "See chunks: 'scale fragment up' and 'scale fragment down' instead of sixteen separate letters.",
    "The last bar lands on C — a clear stopping place. Use it to check rhythm before speeding up.",
    "Build tempo gradually. Accuracy first, speed last.",
  ],
  drill:{types:['noteNaming','interval','pattern','oddEven'],clefs:['treble','bass'],range:'ledger',intervals:[2,3,4,5,6,7],timer:3,count:30}, advance:0.68 },

// ============================================================
// LESSON 22: Complex Rhythms
// ============================================================
{ id:22, title:'Complex Rhythms', sub:'Putting it all together', piece:'Nocturne Op. 9 No. 1',
  steps: [
    { text:"SIXTEENTH NOTES divide a beat into FOUR. They have double flags or double beams. Count them: '1-e-and-a, 2-e-and-a.' Four slots per beat. These create fast runs and ornamental passages.", abc:'X:1\nM:4/4\nL:1/16\nK:C\nCDEF GABC |', piano:{} },
    { text:"COMPOUND TIME (6/8, 9/8, 12/8) divides beats into threes instead of twos. 12/8 = four big beats, each with three pulses. It creates a flowing, swaying feel. A lot of ballads use 12/8.", abc:'X:1\nM:6/8\nL:1/8\nK:C\nCDE FGA | Bcd cBA |', piano:{} },
    { text:"POLYRHYTHM: two different rhythms at the same time. 3 against 2 — one hand plays triplets while the other plays regular eighth notes. Learn each hand separately, then combine slowly. They lock together like gears.", abc:makeABC(['C4','D4','E4','F4'],'treble'), piano:{} },
    { text:"FERMATA over a REST = hold the silence. The music stops, the audience holds its breath. Don't rush. Let the silence speak.", abc:'X:1\nM:4/4\nL:1/4\nK:C\nC D E F | G2 z2 |', piano:{} },
    { text:"Chopin's Nocturne Op.9 No.1 has rich rhythmic variety — triplets, dotted rhythms, rubato. It's beautiful and complex. With everything you've learned, you can read it.", abc:makeABC(['E4','F4','G4','A4'],'treble'), piano:{} },
  ],
  quiz: [
    { q:'Sixteenth notes divide a beat into...', options:['2','3','4','8'], correct:2 },
    { q:'Polyrhythm is...', options:['One rhythm','Two different rhythms at once','A type of scale','A rest'], correct:1 },
    { q:'A fermata over a rest means...', options:['Skip the rest','Hold the silence','Play louder','Speed up'], correct:1 },
  ],
  walkthrough: [
    "Rhythm study in C: dotted quarters, eighths, syncopation, and a held final note — the kinds of patterns Chopin uses, simplified to one key.",
    "Count carefully where longer notes land across the beat.",
    "Keep the line musical: dynamics and timing matter more than speed here.",
    "Try the full nocturnes from the library when you want the original harmonies.",
  ],
  drill:{types:['noteNaming','interval','pattern','oddEven','articulation'],clefs:['treble','bass'],range:'ledger',intervals:[2,3,4,5,6,7],timer:5,count:25}, advance:0.72 },

// ============================================================
// LESSON 23: Moonlight Sonata 3rd Movement
// ============================================================
{ id:23, title:'The Summit', sub:'Everything combined at full speed', piece:'Moonlight Sonata 3rd mvt',
  steps: [
    { text:"This is it. Everything from 22 lessons — steps, skips, leaps, odd/even, articulation, dynamics, fingering, arpeggios, pedalling, speed reading, complex rhythms — all at once, at full speed. The 3rd movement of Beethoven's Moonlight Sonata. Every note is still just a step, skip, or leap from the last. The language hasn't changed. Only the speed.", abc:makeABC(['C4','E4','G4','C5','E5'],'treble'), piano:{} },
    { text:"Break it into sections. Don't try to eat the whole pizza in one bite. Section by section, slowly. Each section uses patterns you already know: arpeggios, scales, leaps, dynamics.", abc:'X:1\nM:4/4\nL:1/16\nK:clef=treble\nCEGc EGCE|', piano:{} },
    { text:"Practice strategy: master each section at HALF speed. Every note right, every fingering planned, every dynamic observed. Then 75%. Then connect sections. Speed comes LAST. This is how every professional learns.", abc:makeABC(['C4','D4','E4','F4'],'treble'), piano:{} },
    { text:"Think about where you started. You didn't even know what Middle C was. Now you understand every symbol on the page. Steps, skips, leaps, dynamics, articulations, fingering, pedalling, arpeggios, chords, scales, rhythms, key signatures, repeats.", abc:makeABC(['C4','E4','G4','C5'],'treble'), piano:{} },
    { text:"The Moonlight Sonata 3rd movement isn't a different language from what you've learned. It's the same language spoken very fast. And speed? Speed is just practice. You started with Happy Birthday and you're ending with one of the greatest pieces ever written. Well done.", abc:makeABC(['C4','G4','E5'],'treble'), piano:{} },
  ],
  quiz: [
    { q:'How should you learn a difficult piece?', options:['Play it at full speed immediately','Break it into sections and start slow','Skip the hard parts','Only play the easy sections'], correct:1 },
    { q:'When should you add speed?', options:['First','Second','Last, after everything else is right','Never'], correct:2 },
    { q:'The 3rd movement uses...', options:['Only steps','Only chords','Everything from all previous lessons','Only rhythm'], correct:2 },
  ],
  walkthrough: [
    "Finale-style study in C: fast eighth-note patterns and octave jumps — the same skills as the famous last movement, in one key.",
    "Bars 1–2: keep arpeggio figures even. Bar 3: feel the octave — same note name, different register.",
    "The real Beethoven movement is longer and harder; this is a focused excerpt to celebrate how far you've come.",
    "Always: slow and clean first, then speed up.",
  ],
  drill:{types:['noteNaming','interval','pattern','oddEven','articulation'],clefs:['treble','bass'],range:'ledger',intervals:[2,3,4,5,6,7],timer:3,count:30}, advance:0.68 },

];
