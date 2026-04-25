# Sonata · Interaction Types

The complete vocabulary of lesson interactions. If you need something that
isn't in this list, either fit it into an existing type or propose an
addition to this doc — don't invent a new type in a lesson YAML.

Consolidated from 28 types across L1–L25 down to 12 core types.

---

## Core types

### 1. `tap`
A single tap on the keyboard.

```yaml
interaction:
  type: tap
  accept: "C4"              # specific key
  # OR
  accept: "any C"           # any key matching a pattern
  # OR
  accept: "any 2-group"     # any valid target of a type
  # OR
  accept: "any key in left third"
```

**Replaces:** `tap_any_key`, `tap_specific`, `tap` (scattered variants).

---

### 2. `sequence`
Multiple taps in order. Forgives small timing errors.

```yaml
interaction:
  type: sequence
  keys: ["C4", "D4", "E4"]  # specific keys
  # OR
  constraint: "3 adjacent white keys ascending"
  # OR
  shape: ["step_up", "skip_up", "step_down"]   # shape-based
  count: 3                   # how many taps expected
  direction: "up" | "down"   # optional
```

**Replaces:** `tap_sequence`, `adjacent_keys`, `step_sequence`, `step_melody`,
`ascending_taps`, `five_finger_position`, `octave_pair`, `shape_play`, `step_play`,
`directed_step`.

---

### 3. `choice`
Multiple-choice answer to a single question.

```yaml
interaction:
  type: choice
  options: ["Step", "Skip"]
  correct: 0                 # index of correct answer
  time_limit: 2              # optional — seconds
```

**Replaces:** `choice`, `timed_choice`.

---

### 4. `drill`
N rounds of repeated questions. The engine's workhorse.

```yaml
interaction:
  type: drill
  rounds: 4
  mode: "see" | "hear" | "play"
  question: "Step or skip?"              # same question each round
  options: ["Step", "Skip"]
  # OR — for mixed drills
  question_pool:
    - { mode: "see", prompt: "...", options: [...] }
    - { mode: "hear", prompt: "...", options: [...] }
    - { mode: "play", prompt: "...", type: "tap", accept: "..." }
  time_limit: 2                # optional
```

**Replaces:** `drill`, `mixed_drill`, `drill_play`, `speed_read`, `sequence_label`
(when it's a drill of labels).

---

### 5. `echo`
Student hears something, then plays it back.

```yaml
interaction:
  type: echo
  target: "any C"              # what to echo (key or pattern)
  rounds: 3                    # how many rounds
  variation: "same-note" | "different-each-round"
```

**Replaces:** `echo_note`, `echo_group`, `echo`.

---

### 6. `see_hear_play`
The canonical Sonata loop: note appears on staff → audio plays → student plays back.

```yaml
interaction:
  type: see_hear_play
  target_key: "C4"             # specific note to show and play
  # OR
  target_pattern: "any step up"
  rounds: 1                    # default 1
```

**Replaces:** `see_hear_play`.

---

### 7. `song`
Play through a full song. Supports training-wheel glow (`guides: true`) or
the student reads alone (`guides: false`).

```yaml
interaction:
  type: song
  sequence: ["E4", "D4", "C4", "E4", "D4", "C4", ...]
  guides: true | false
  tempo: 60                    # bpm, optional
  tolerance: "any-order"       # no, default sequence required
```

**Replaces:** `guided_song`, `free_song`, `performance`.

---

### 8. `rhythm`
Play in time with a metronome. Tests rhythm along with pitch.

```yaml
interaction:
  type: rhythm
  sequence: ["C4", "C4", "D4", "D4"]
  durations: ["quarter", "quarter", "half", "half"]
  tempo: 60                    # bpm
  performance: true | false    # false = tolerant, true = strict
```

**Replaces:** `rhythm_play`, `rhythm_melody`, `performance` (when rhythm-based).

---

### 9. `shape`
Play a specified interval shape anywhere on the keyboard. Tests shape reading
without caring about absolute pitch.

```yaml
interaction:
  type: shape
  shape_type: "step" | "skip" | "leap"
  direction: "up" | "down" | "any"
  count: 1                     # how many shapes to play (default 1)
```

**Replaces:** `step_play`, `skip_play`, `directed_step`, `shape_play` when no explicit sequence.

---

### 10. `finger_call`
Cleffy calls out a finger number, student taps a key with that finger.
Requires a hand position first (set by a prior `sequence` with known fingering).

```yaml
interaction:
  type: finger_call
  rounds: 5
  hand: "right" | "left"
  position: ["C4", "D4", "E4", "F4", "G4"]    # which keys fingers are on
```

**Replaces:** `finger_call`, `tap_with_finger_declared`.

---

### 11. `name_and_play`
Cleffy names a letter. Student plays any key matching that letter, anywhere
on the keyboard.

```yaml
interaction:
  type: name_and_play
  letters: ["A", "E", "G", "B"]    # series of letters in order
  # OR
  rounds: 4                         # engine picks random letters
```

**Replaces:** `name_and_play`.

---

### 12. `labels`
Student labels each of a series (e.g. "label each move in this 4-note melody
as step or skip, in order").

```yaml
interaction:
  type: labels
  count: 3                          # how many things to label
  options: ["Step", "Skip"]
  sequence: ["step", "skip", "step"]  # correct answers
```

**Replaces:** `sequence_label`.

---

## Engine contract

Every interaction accepts these optional common fields:

```yaml
interaction:
  type: ...
  forgiving: true | false       # default true for early lessons
  retry_limit: 3                # default — after this, auto-route to .5
  hint_after: 2                 # show hint after N wrong attempts
```

---

## Authoring rules

1. **Never invent a new `type` in a lesson YAML.** If none of the 12 fit,
   propose an addition here first.
2. **Prefer the simpler type.** `tap` is simpler than `sequence` of length 1.
3. **`drill` is the catch-all for rounds.** Don't use `drill_play` or `mixed_drill`
   — pass the variations via `question_pool`.
4. **Song and rhythm overlap** — use `song` if rhythm is uniform (most early songs),
   use `rhythm` if rhythm is the point of the lesson.
5. **Every interaction must have a clear pass condition.** The engine needs to know
   when the student succeeded. If you can't state that in one sentence, the type
   isn't right.

---

## Migration notes

Lessons L1–L25 were written before this doc existed. They use a wild variety
of type names. They will be swept and normalized before Tier 1 ships.

A sweep script will map old types to new types:

```
tap_any_key       → tap
tap_specific      → tap
tap_sequence      → sequence
adjacent_keys     → sequence
step_sequence     → sequence
step_melody       → sequence (shape-based)
step_play         → shape
echo_note         → echo
echo_group        → echo
mixed_drill       → drill (with question_pool)
drill_play        → drill
timed_choice      → choice (with time_limit)
speed_read        → drill (with time_limit)
guided_song       → song (guides: true)
free_song         → song (guides: false)
rhythm_play       → rhythm
rhythm_melody     → rhythm
performance       → song OR rhythm
five_finger_position → sequence
octave_pair       → sequence
ascending_taps    → sequence (direction: up)
directed_step     → shape
name_and_play     → name_and_play
finger_call       → finger_call
tap_with_finger_declared → tap (with declared_finger field)
sequence_label    → labels
shape_play        → shape
echo              → echo
tap               → tap
sequence          → sequence
drill             → drill
choice            → choice
see_hear_play     → see_hear_play
```

Do the sweep before writing Tier 2 lessons.

---

Last updated: 2026-04-22
