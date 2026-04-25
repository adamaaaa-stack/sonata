# Sonata · Content Decisions

Pattern-level rules that every lesson must follow. These accumulate as we
discover them. When we make a decision, it lands here — not in a chat log.

If a lesson violates a decision here, rewrite the lesson. Never the decision.

Last updated: 2026-04-22

---

## 1 · Vocabulary policy

### Core method vocabulary (never changes)
These words define the Sonata method. They appear from L1 forward and keep
the same meaning for all 250 lessons.

- **step** — a move between a line and its neighbor space (or vice versa). 2nd interval.
- **skip** — line-to-line or space-to-space. 3rd interval.
- **leap** — 3 or more spots apart. 4th interval and beyond.
- **odd/even** — the pattern governing kind-switching.
- **line / space** — staff position.
- **stairs** — the foundational metaphor.

### Drill rules
- Step and skip may appear as DRILL ANSWERS from L16 onward.
- **Leap may NOT appear as a drill answer until L36** (where it's formally taught).
  Earlier lessons may USE the word "leap" in Cleffy's narration, but never force
  a student to identify something as a leap vs. not-leap in a multiple choice.

### Auxiliary vocabulary (introduced when first used)
Terms that are allowed in Cleffy's speech without being part of the core method.
Once introduced, they stay consistent. Where each one is formally introduced:

| Term | Introduced | Notes |
|---|---|---|
| octave | L8 | "Same letter, one floor up." |
| ledger line | L14 | "A little line outside the staff for notes that don't fit." |
| bar / bar-line / time signature | L24 | |
| quarter/half/whole note | L23 | |
| tempo | L23 | Used informally; formal tempo markings in Tier 4. |
| beat / pulse | L23 | |
| melody | L11 (casual) / L20 (formal) | |
| phrase | L57 | Save until then — in early lessons use "line" or "tune." |
| dynamics / *p* / *f* | L56 | |
| articulation / legato / staccato | L76 | |
| key signature | L66 | |

### Forbidden forever
- **FACE, Every Good Boy Deserves Fudge, All Cows Eat Grass** — any mnemonic.
- **Note-name-first teaching.** Always shape-first, names as derivation from anchor.

---

## 2 · Anchor policy

### Treble clef
- **The anchor is Middle C.** Introduced in L14. Every future treble-clef note is
  derived by counting steps/skips/leaps from Middle C.
- **G (the treble-clef's wrap line) is a LANDMARK, not the anchor.** L12 may mention
  G exists but must defer to "the real anchor, Middle C" for counting.
- Post-L14, Cleffy never says "count from G." Always "count from Middle C."

### Bass clef
- **The anchor is bass F** (the line between the two dots of the bass clef).
  Introduced in L26–L27.
- Middle C appears on both clefs (ledger line above bass staff, ledger line below
  treble staff). Teach this connection in L34.

### Method teaching order — anchor first, shape second, name last
Every note intro lesson follows this pattern:
1. Where is it on the staff (shape — line or space, distance from anchor)?
2. What does it sound like (HEAR)?
3. What's it called (name, derived from counting)?
4. Play it on the piano.

Never introduce the name before the shape. Ever.

---

## 3 · Leap policy

Leaps are a Tier 1 vocabulary plant but a Tier 2 formal concept.

- **L1** plants all three words (step, skip, leap) so vocabulary is familiar early.
- **L2–L35** may use "leap" in narration ("this is bigger than a step — we'll name it later"),
  but cannot quiz students on leap-vs-skip vs step.
- **L36** formally introduces leap as a concept, drilled and measured. From L36 on,
  "leap" is a drill answer.

This preserves method-vocabulary consistency (Rule 5 in the roadmap) while not
asking Tier 1 students to make distinctions they haven't been trained on.

---

## 4 · Odd/even split across two lessons

The odd/even rule is deep enough to split across two lessons:

- **L17 (The even rule)** — teaches ONLY the even half: steps switch kinds (line↔space).
  No mention of the odd half. Cleffy does not tie himself in knots trying to explain
  both at once.
- **L21 (Skips)** — teaches the odd half: skips keep kinds (line-line, space-space).
  References back to L17's even rule and completes the picture.

Do not try to teach both halves in a single lesson.

---

## 5 · XP system

Flat rules. No per-lesson tweaking:

- **Teach lesson (new concept):** 20 XP
- **Drill lesson (reinforce existing):** 15 XP
- **Apply lesson (piece in service of concept):** 25 XP
- **Act boss (🎯):** 30 XP
- **Tier boss (👑):** 100 XP
- **Graduation (🏆 L250):** 500 XP
- **Remediation (.5):** 5 XP (progress but not the full reward)

If you find yourself wanting to give L87 "just a little more XP," the impulse is
wrong. The system stays flat.

---

## 6 · Cleffy voice discipline

### In-voice

- Short sentences. Contractions. No emoji.
- Warm but never cutesy. Bob Ross for music.
- Occasional "right?", "watch this", "here's the trick."
- Max one exclamation point per page.
- Never scolds on wrong answers — "that's normal," "most people," "let's try again."
- Never publicly confused. Cleffy has a plan. If something is being introduced for
  the first time, Cleffy leads — he doesn't wonder along with the student.

### Anti-patterns

- **"Wait — that doesn't make sense. Let me clarify."** ← Cleffy must never say this. It breaks trust.
- **"AMAZING JOB!!!"** ← fake hype. Banned.
- Cartoon emojis in speech.
- Talking down to 10-year-olds OR over-explaining to 45-year-olds.
- Overclaiming emotional effects ("step up sounds like a question!"). Use gentler
  language: "tends to lift", "tends to settle."

---

## 7 · Cross-lesson references

### Never reference what hasn't happened

If a lesson uses a concept formally taught later, either:
- Soften the language so no formal knowledge is needed, OR
- Move that concept earlier in the curriculum

Examples of past violations (now fixed):
- L6 said "you jumped over three white keys" before the alphabet (L7) was taught.
  Fix: "you jumped over a few keys."
- L6 called C-to-F a "leap" before L36 formally teaches leaps. Fix: "bigger than a step."

### Always reference callbacks when continuing a concept

When building on earlier material, Cleffy should name the prior lesson briefly —
"remember Lesson 17? The even rule?" This reinforces the spine.

---

## 8 · Placeholder hygiene

Never ship a lesson with `# placeholder`, `correct: 0 # (varies)`, `// TODO`, or
any similar self-marker. Content must be fully resolved before the file is saved.

Sweep policy: before each tier ships, grep the entire `content/lessons/` directory
for `placeholder`, `TODO`, `(varies)`, `XXX`, `FIXME`. All hits must be resolved.

---

## 9 · Remediation routing policy

Every lesson has a `.5` remediation. Mastery check failure routes as follows:

- Failed SEE section → remediation visually re-teaches (more examples, zoom, slow scroll)
- Failed HEAR section → remediation re-plays with slower tempo, louder distinction
- Failed PLAY section → remediation guides hand shape, finger placement
- Failed two or more sections → the full `.5` re-teach with alternative metaphor
- Three wrong in a row *during* the main lesson → auto-route to `.5` without finishing

Remediation is never scolding. Cleffy's opener is always a variant of:
*"Hey. No big deal. [concept] takes a minute. Let's try it [different way]."*

---

## 10 · When to add a new decision here

If you find yourself making the same judgment call twice across different lessons,
that's a rule. Write it down. This file is the only place where decisions become
permanent — otherwise they live in chat logs and get forgotten.

Do not add decisions speculatively. Only record ones that have actually come up.
