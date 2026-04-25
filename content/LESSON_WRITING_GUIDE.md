# Lesson Writing Guide (for AI agents)

This guide is read by every agent writing lessons 76–250. Follow it exactly.
The goal: 175 new lesson YAML files that feel like they came from the same author as the existing 75.

---

## 1. Voice — the Cleffy voice

Cleffy is a **warm, patient, unhurried adult-male piano teacher** who speaks directly to the student. Think: a kind older brother, not a grown-up addressing a child, and not a cheerleader. The voice has these rules:

**Short sentences. Often fragments.**
> "Play it."
> "Slow."
> "That."

**Action verbs lead. No setup.**
- ✅ "Play the first phrase with just your right hand."
- ❌ "Now we're going to try playing the first phrase together."

**No filler praise.** "Great job!" and "Nicely done!" are banned. Earned emotional beats only, rare, usually after a milestone:
> "That. That was two hands, reading a grand staff, playing a song. Big moment."

**One thought per sentence. One sentence per line in the `cleffy` block.**
Not a paragraph. A list of short beats.

**Speak TO the student, not ABOUT the material.**
- ✅ "Your pinky is going to stretch up to E — that's a big reach the first time."
- ❌ "Students often find the stretch to E difficult."

**Piano jargon introduced inline, never assumed.** When a new term appears, define it in one clause.
> "D-sharp is the black key just below E."

**Numbers**: write "1, 2, 3" or "G, G, A, G". Consistent within a lesson.

**Metaphors** anchor each lesson. Pick one and use it 1-3 times. Examples from existing lessons: staircase, pyramid, duet-with-yourself, first-summit. Put it in the `metaphor:` field as a kebab-case slug.

**Vibe keywords** go in the `vibe:` array: gentle, playful, serious, celebratory, focused, quiet, triumphant, honest, reflective. Pick 2-3.

**Do not**:
- Use emojis in the body (only in the optional header comment and figures)
- Say "Let's" or "We're going to"
- Use exclamation points except once or twice per lesson maximum
- Explain pedagogy to the student ("This is a useful exercise because…")

---

## 2. Structure — the YAML schema

Every lesson file is `lesson-XXX.yaml` where XXX is zero-padded. Required top-level fields:

```yaml
id: 76                           # integer, matches filename
tier: low-intermediate           # beginner | elementary | low-intermediate | intermediate | upper-intermediate | advanced
act: 16                          # integer 1-50
title: "Legato vs staccato"      # from CURRICULUM.md
subtitle: "Act 16 · Articulation" # 2-6 words
goal: "One sentence, plain English."
prereqs: [25, 35, ...]           # list of prior lesson ids that unlock this
method_focus: "combine"          # see | hear | play | combine | method (the Sonata method)
time_estimate_min: 12            # integer 10-20
piece_context: "One or two sentences about what this lesson does in the bigger arc."
metaphor: "kebab-case-slug"      # central image for this lesson
vibe: ["gentle", "focused"]      # 2-3 adjectives
# Boss flags — set exactly ONE if applicable:
# is_act_boss: true              # 🎯 — for lessons at the end of an act (every 5th: L80, L85, L90, ...)
# is_tier_boss: true             # 👑 — tier transitions (L125 tier 3 boss, L175 tier 4 boss, L225 tier 5 boss)
# is_graduation: true            # 🏆 — L250 only

# If the lesson centers on a specific piece:
piece:
  title: "Minuet in G"
  composer: "Bach (attrib.)"
  key_center: "G major"
  time_signature: "3/4"
  difficulty: "low-intermediate — articulation focus, mostly stepwise"

# Pages array — 13-16 pages for normal lessons, 14-16 for act bosses, 20 for tier bosses and graduation
pages:
  - id: 1
    mode: see                     # see | hear | play
    type: hook                    # free-form label — hook, concept, listen, play_X, drill, pre_check, reflection, whats_next, wrap
    figure: "Short description of the visual — what Cleffy or the staff looks like."
    cleffy: >
      Short sentence.
      Another short sentence.
      Sometimes a fragment.

  - id: 2
    mode: play
    type: play_first_phrase
    figure: "Keyboard with E4 and F4 glowing, finger 3 on E."
    cleffy: >
      Play E to F, smoothly connected. Stay down on E until F presses.
    interaction:                  # interactions required on play pages
      type: sequence              # sequence | rhythm | song | drill
      keys: ["E4", "F4"]
      # For rhythm: add durations (["quarter", "quarter"]) and tempo
      # For song: add guides (true/false) and tempo
      # For drill: add rounds (integer) or rules
```

**Page `mode` semantics**:
- `see` = the student reads/looks at something on the staff or keyboard
- `hear` = audio plays; student listens or identifies something
- `play` = student physically plays something on the MIDI keyboard (requires an `interaction` block)

**Interaction types**:
- `sequence` — ordered notes, no rhythm constraint. Fields: `keys`
- `rhythm` — notes with durations and tempo. Fields: `sequence`, `durations`, `tempo`
- `song` — full-piece playback/play-along. Fields: `sequence`, `guides`, `tempo`. Chords are nested arrays like `["C4","C3"]`
- `drill` — multiple-round exercise. Fields: `rounds`

**Followup Cleffy** (optional on a page, usually the last `play` page):
```yaml
    followup_cleffy: >
      Short closing beat after the student completes the interaction.
```

**completion_cleffy** (optional, on mastery_check-adjacent pages): not commonly used — prefer `completion:` block.

**Required post-pages blocks**:

```yaml
practice_this_week:
  real_piano:
    - "One thing to do on a real piano."
    - "Another thing."
  virtual_only:
    - "Which pages to replay if they don't have a real piano."
  estimated_time: "10 min/day"

mastery_check:
  sections:
    see:
      pass_threshold: 2           # how many must be right to pass this section
      questions:
        - figure: "Short description of the visual."
          prompt: "The question."
          options: ["Option A", "Option B", "Option C"]
          correct: 0              # index of correct option
    hear:
      pass_threshold: 1
      questions:
        - audio: "Short description of what plays."
          prompt: "The question."
          options: ["A", "B"]
          correct: 0
    play:
      pass_threshold: 1
      questions:
        - prompt: "Play X."
          accept: "Description of what to accept as a pass."

remediation:
  id: "76.5"                      # "${lesson_id}.5"
  title: "Short slower rework title"
  pages: 6                        # typically 6-10 for normal lessons, 10-12 for bosses
  opening_cleffy: >
    Honest Cleffy line about why they're here and the gentler re-approach.

completion:
  cleffy: >
    Closing beat for completing the lesson. Short. Often looks forward.
  xp: 20                          # normal: 15-20. Act boss: 30. Tier boss: 100. Graduation: 250.
  unlocks: 77                     # next lesson id (for graduation: omit)
  # For tier bosses only:
  # tier_complete: 3
```

**Page-count conventions** (strict):
- Normal lesson: **13–16 pages**
- Act boss (🎯, every 5th lesson: 80, 85, 90, ...): **14–16 pages**, end with a `wrap` page
- Tier boss (👑: L125, L175, L225): **20 pages**, include `reflection` (look back) + `whats_next` (preview next tier) + `wrap` pages
- Graduation (🏆, L250): **20 pages**, with `reflection`, `whats_next` (talk about life after Sonata), `wrap`

**Tier-boss and graduation also**:
- Have higher `xp` (100 for tier boss, 250 for graduation)
- Set `is_tier_boss: true` or `is_graduation: true`
- Include `tier_complete: N` in `completion:`

---

## 3. Page flow recipe

Most lessons follow this rhythm:

1. **Hook** (`see`) — Cleffy introduces the day in 2-4 lines
2. **Concept** (`see`) — the new thing, shown visually
3. **Listen** (`hear`) — student hears the concept in context (if applicable)
4. **First play** (`play`) — tiny controlled attempt, often 2-5 notes
5. **Concept deepens** (`see`) — 2nd angle on the idea
6. **More play** (`play`) — longer
7. **Mix / drill** (`see` or `play`) — combined exercise
8. **At tempo** (`play`) — final fluent run
9. **Pre-check** (`hear`) — tiny prep before mastery check
10. **Wrap** (`see`) — Cleffy closes the lesson, looks forward

Act bosses replace wrap with a longer celebration + what's next.
Tier bosses add reflection over the whole tier + preview the next tier + a proper closing.

---

## 4. Piece research (when writing piece-based lessons)

When a lesson centers on a real piece (Minuet in G, Ode to Joy, Moonlight, etc.):
- Use **actual** notes from the melody. If you don't know, look up a simplified lead-sheet melody.
- Keep it in an **accessible key and register** — if the original is in Db, simplify to D or C for early lessons.
- For complex pieces (Clair de Lune, Moonlight), TEACH ONLY THE OPENING PHRASE or the specific section called out in the goal. Do not try to cover the whole piece in one lesson.
- If the piece has sharps/flats, make sure the student has been introduced to accidentals first (post-L61).

---

## 5. Prerequisite chains

Look at CURRICULUM.md. `prereqs:` should list 4-8 prior lesson IDs that are genuinely needed:
- Always include the most recent tier-boss (e.g., L75 for anything in Tier 3)
- Include the most recent act-boss for the current tier
- Include any lesson that taught a specific concept used (e.g., if you reference "sharps", include L61)
- Don't list every prior lesson — just the load-bearing ones

---

## 6. Tone matrix by tier

- **Tier 3 (L76-125)**: "You know this material. Now we add craft — articulation, fingering, chords. Pieces get prettier."
- **Tier 4 (L126-175)**: "Real classical pieces now. Bach. Chopin. Moonlight opening. You are becoming a pianist."
- **Tier 5 (L176-225)**: "Expression. Voicing. Rubato. The stuff that makes music sound alive. Full Nocturne. Full Clair de Lune."
- **Tier 6 (L226-250)**: "Performance. Memorization. Nerves. Graduation — Moonlight 1st, full. This is where all of it lands."

---

## 7. What to read before writing

Before writing a lesson, read at minimum:
- `CURRICULUM.md` for the act + goal spec
- **One exemplar normal lesson** from the tier below (e.g., writing Tier 3? read lesson-050.yaml and lesson-074.yaml)
- **One exemplar boss** of the nearest type (act boss: lesson-035.yaml; tier boss: lesson-075.yaml)
- The lesson directly before yours (if it exists) for voice continuity

---

## 8. The golden check

Before you write a `cleffy:` block, ask yourself:
- Would Cleffy really say "Let's" here? (usually no)
- Is this sentence longer than 12 words? (if yes, cut or split)
- Would a 13-year-old find this boring? (if yes, tighten)
- Is there setup that could just be cut? (almost always yes — cut it)

When the voice is right, the lines look like they could be the subtitles of a warm, quiet cooking-show host, not a children's textbook.

---

## 9. Output path

Write each lesson to `/Users/oogy/sonata/sonata-app/content/lessons/lesson-XXX.yaml` where XXX is zero-padded to 3 digits. Do not create any other files.
