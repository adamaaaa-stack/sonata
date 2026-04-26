# Sonata v2 — Personalised Lesson Plans

## Pitch

> *"Upload your sheet music. We'll build you a custom lesson plan to
> play it — using our method, tuned to your skill. Finish the plan,
> upload the next song, repeat."*

The product is no longer "250 fixed lessons." The product is **the method
applied to whatever YOU want to play**. Sonata generates a personalised
path from your current skill level to playing the specific piece you
upload.

Distinguishing feature: every other piano app has a fixed catalog. Sonata
has **no catalog** — every user's curriculum is generated for the song
they brought to the table.

---

## Pedagogical north star — non-negotiable

Sonata teaches piano through ONE through-line method: **steps, skips,
and leaps**. This is the spine of the curriculum. The product IS this
method applied to the user's piece.

**Every generated lesson — regardless of what specific concept it
teaches — must reference step/skip/leap vocabulary in its narration.**

Examples of how the method threads through every kind of lesson:

| Lesson topic | How the method shows up |
|---|---|
| The half note | "your hand STEPS over two beats", "STEP through the rhythm" |
| Treble clef | "lines and spaces — line→space is a STEP, line→line is a SKIP" |
| Right-hand position | "your five fingers STEP from one key to the next" |
| Dynamics | "play softly while STEPPING up the staircase" |
| Sharps and flats | "a sharp moves you a half-STEP higher" |
| 4/4 time | "four beats — like four STAIRS in a row" |
| Any new piece | "this melody starts on Middle C, then SKIPS to E, then STEPS down" |

The lesson generator's system prompt enforces this. The validator flags
any generated lesson that doesn't mention step / skip / leap / staircase /
Middle C anywhere in its cleffy text. If a lesson is "off-method," it
gets regenerated.

This is the differentiator: every other piano app teaches concepts
in isolation. Sonata teaches everything through one consistent
spatial vocabulary that the student internalises across hundreds of
lesson pages.

## What stays from v1

- **Lesson player** (`LessonV2.tsx`) — runs any well-formed lesson YAML
- **Figure renderers** (KeyboardMini, StaffMini, RhythmDisplay, HandDiagram, QuizScaffold)
- **PianoKeyboard** with mic-driven press
- **Mic detection** (Pitchy + Basic Pitch)
- **Cleffy character** (the persona stays — the voice changes, see TTS section)
- **Lesson YAML schema** (no changes)

## What changes

- Lessons are **generated on demand**, not hand-authored
- Lesson length: **6 pages compact**, not 16
- Curriculum is **per-user**, not fixed
- Entry point: **piece selector**, not lesson list
- 250 hand-authored lessons → **reference content** for the generator (not user-facing)

## What's brand new

- Concept ontology
- Skill assessment / placement test
- Piece library + analyzer
- Path generator
- Lesson generator + post-process validator (already built)
- Per-concept cache (S3-backed)
- New onboarding + path UI
- Free-trial → paywall flow

---

## Data model

### Concept ontology (`concepts.json`)

```json
[
  {
    "id": "middle_c",
    "name": "Middle C",
    "kind": "note",
    "tier": 1,
    "prereqs": []
  },
  {
    "id": "treble_clef",
    "name": "Treble clef",
    "kind": "notation",
    "tier": 1,
    "prereqs": []
  },
  {
    "id": "step_interval",
    "name": "Step interval",
    "kind": "interval",
    "tier": 1,
    "prereqs": ["middle_c", "treble_clef"]
  },
  {
    "id": "dotted_half_note",
    "name": "Dotted half note",
    "kind": "rhythm",
    "tier": 2,
    "prereqs": ["half_note", "quarter_note"]
  }
]
```

Target: ~100-150 concepts covering Tier 1-6 of the existing curriculum.

### Piece library (`pieces.json`)

```json
[
  {
    "id": "twinkle_twinkle",
    "title": "Twinkle Twinkle Little Star",
    "difficulty": 1,
    "is_trial": true,
    "required_concepts": [
      "middle_c", "treble_clef", "step_interval", "skip_interval",
      "quarter_note", "half_note", "right_hand_position"
    ]
  },
  {
    "id": "river_flows",
    "title": "River Flows in You",
    "difficulty": 4,
    "required_concepts": [/* 50+ */]
  }
]
```

### Skill inventory (per user, in DB)

```json
{
  "user_id": "...",
  "mastered_concepts": ["middle_c", "treble_clef", "step_interval"],
  "in_progress": ["skip_interval"],
  "current_piece_id": "twinkle_twinkle",
  "current_path_step": 7
}
```

### Lesson cache (in S3, keyed by concept id)

```
s3://sonata-lessons/concepts/middle_c.yaml
s3://sonata-lessons/concepts/dotted_half_note.yaml
s3://sonata-lessons/concepts/dotted_half_note.audio/{page-id}.mp3
```

---

## Algorithms

### Path generator

```
input: user.mastered_concepts, piece.required_concepts
output: ordered list of concept ids to teach

1. needed = piece.required_concepts \ user.mastered_concepts
2. expanded = transitive closure including all prereqs of needed concepts
   not already mastered
3. sort topologically by prereq DAG (Kahn's algorithm)
4. tie-break: by tier ascending, then by name
return ordered list
```

### Cache-first lesson fetch

```
GET /api/lesson/[concept_id]
1. if S3 has concepts/[id].yaml → return it
2. else: kick off generator job
   - LLM (Qwen3 30B A3B) → YAML → validator → S3 write
3. return YAML
```

Note: NO server-side TTS. Audio is generated on-device via Kokoro
(see TTS section). The cache stores YAML only — small, fast, cheap.

Initial cache fill: run generator over the full concept ontology overnight.
Cost: ~$0.40 LLM, $0 TTS. Total infra cost across ALL users forever: pennies.

### Skill assessment

5-7 quick interactive questions on first launch. Examples:

- Show a keyboard with C glowing → "Tap any other C" → assesses note recognition
- Play a melody → "Did that go up or down?" → assesses ear
- Show a quarter + half note → "Which is longer?" → assesses rhythm

Each correct answer adds the corresponding concept(s) to `mastered_concepts`.
Defaulted to empty set if user skips ("complete beginner").

---

## API routes (Next.js)

```
POST /api/piece/upload
  body: multipart with image/PDF
  returns: { piece_id, parsed: {title, key, time_sig, concepts, melody}, audio_preview_url }

POST /api/piece/[piece_id]/correct
  body: { difficulty?, hand?, concepts? }   // user overrides VLM mistakes
  returns: { piece_id, parsed: {...} }

POST /api/skill/assess
  body: { responses: [...] }
  returns: { mastered_concepts: [...] }

POST /api/path/generate
  body: { user_id, piece_id }
  returns: { steps: [{ concept_id, lesson_url }, ...] }

GET /api/lesson/[concept_id]
  returns: YAML lesson (cached or fresh-generated)

POST /api/admin/cache-fill          (locked, dev-only)
  body: { concept_ids?: [...] }     // omit to fill all
```

The LLM generation runs server-side in the API route to keep the
OpenRouter API key off the client. TTS does NOT run server-side —
all audio is generated on-device by Kokoro (see TTS section).

---

## Sheet music ingestion (the killer feature)

Every piece comes from user upload. No curated library, no preset paths.

### Pipeline

```
1. User uploads image / PDF
2. Server-side VLM call (Gemini 2.5 Pro Vision via OpenRouter, or similar)
   Prompt: "extract title, key, time signature, hand range, rhythm
   complexity, articulations, list of musical concepts a beginner
   would need to play this, and a simplified single-voice MIDI sequence."
3. VLM returns structured JSON
4. Server validates + tags piece with concept ids matched to ontology
5. Stored as user.pieces[]
6. Path generator runs against piece.required_concepts
```

### What we extract from the sheet

```json
{
  "title": "Hot Cross Buns",
  "key": "C",
  "time_signature": "4/4",
  "tempo_hint": 100,
  "difficulty_estimate": "beginner",
  "hand": "right",
  "concepts": [
    "middle_c", "step_interval", "quarter_note", "half_note",
    "treble_clef", "right_hand_position_c"
  ],
  "melody": [
    {"note": "E4", "duration": "quarter"},
    {"note": "D4", "duration": "quarter"},
    {"note": "C4", "duration": "half"},
    /* ... */
  ]
}
```

The `melody` list becomes the data for the FINAL lesson in the path —
where the student actually plays the piece they uploaded.

### Confirm-and-correct UX

VLMs make mistakes. After ingestion, show the user:
- The detected piece info ("title, key, time sig, difficulty")
- Audio preview (synthesised via Kokoro reading the melody)
- A "this is wrong, fix it" button

User can override:
- Difficulty level (easier / harder)
- Hand (right / left / both)
- Skip pieces the VLM butchered

### Cost per upload

Gemini 2.5 Pro Vision via OpenRouter: ~$0.10-0.30 per page analysed.
Average beginner piece: 1-2 pages = ~$0.20.

For pricing math: a $9.99/mo subscriber uploading 5 pieces/month costs
us $1 in VLM fees. ~$8.99/mo margin per active subscriber. Fine.

### Cheaper alternatives (explore later)

- Gemma 3 Vision / Qwen 3 VL: ~$0.13 input / $0.52 output per M tokens
- Mistral Pixtral: cheaper still
- Open-source OMR (Audiveris) as a pre-pass to reduce VLM input

For Phase A: use Gemini 2.5 Pro for accuracy, optimise later.

---

## TTS — on-device Kokoro

Cleffy speaks via **Kokoro-82M, running on the user's device** through
Transformers.js + WebGPU/WASM. No server-side TTS, no cloud TTS API,
no ElevenLabs.

### Why Kokoro

- **82M parameters, ~30-50MB ONNX** (depending on quantisation)
- Open-weights, Apache 2.0
- Real-time inference on M-series Apple silicon, 2-3s/sentence on A14+
- Browser-deployable via [Transformers.js](https://huggingface.co/docs/transformers.js)
- Multiple expressive voices built in

### Voice choice

Cleffy was previously an ElevenLabs voice clone. With on-device Kokoro
we lose the cloned voice. We pick the warmest stock Kokoro voice and
brand Cleffy around it.

Default voice: **`af_bella`** (warm, expressive, kid-friendly).
Override per-persona later when we add the persona system (Coach,
Drill Sergeant, Game Show host) — different Kokoro voices per persona.

### Architecture

```
First lesson load:
  - Browser checks IndexedDB for cached Kokoro model
  - If absent: download ~50MB ONNX + voice embedding, cache in IDB
  - Initialize WebGPU pipeline (or fallback to WASM-SIMD)

Per lesson page:
  - Read cleffy text from lesson YAML
  - Synth via on-device Kokoro → AudioBuffer
  - Play through Web Audio API
  - Optionally cache by content hash in IDB for instant replay
```

### Implementation pieces

- `src/lib/tts/kokoro.ts` — wrapper around Transformers.js
  - `loadModel(): Promise<void>` — one-time download + WebGPU init
  - `speak(text: string, voice?: string): Promise<AudioBuffer>`
  - `prefetch(): void` — background download on app first launch
- Hook into `LessonV2`: replace `<audio src=S3>` element with on-the-fly
  Kokoro synthesis
- iOS Capacitor: WebGPU support landed in iOS 18; check user's iOS
  version and fall back to WASM-SIMD if needed (slower but functional)

### Older device fallback

If the iPad is too old to run Kokoro at acceptable speed (very rare —
A14+ is fine), fall back to the browser's built-in `SpeechSynthesisUtterance`
(Web Speech API). Quality is worse but ships zero MB and runs anywhere.

### What we DON'T need

- Cloud Run TTS instance — gone
- ElevenLabs subscription — gone
- S3 audio bucket — gone (we still need S3 for lesson YAMLs, but no audio)
- Per-character TTS billing — gone forever

## UI

### Core user loop

```
sign up
  ↓
upload sheet music (photo or PDF)
  ↓
Cleffy reads it ("looks like a beginner piece in C major, 4/4 time")
  ↓
quick skill check (3-5 interactions to confirm level)
  ↓
generate personalised path: N lessons to play this piece
  ↓
walk through path (lessons + final lesson is the piece itself)
  ↓
complete → "what next? upload another piece"
  ↓
back to upload step
```

### Onboarding (first piece)

1. **Welcome**: "Upload a song you want to learn."
2. **Upload**: photo / PDF / image picker. Cleffy says "give me a sec to
   read this..." while the VLM analyses it.
3. **Confirm read**: "Looks like a beginner piece in C major, 4/4 time.
   Right hand only. Sound right?" → user confirms or fixes.
4. **Quick skill check**: 3-5 interactions ("can you find Middle C?",
   "is this a quarter or a half note?") to populate concept inventory.
5. **Path preview**: "Here's your path: 23 lessons. We'll get you
   playing this in about 3 weeks."
6. **Generation**: Cleffy commentary while server fills cache + any
   missing lesson YAMLs.
7. **Path map**: World-map style, each lesson is a node, current step
   highlighted, final lesson is the actual piece.

### Subsequent pieces (post-first)

Skip steps 4-5 (skill already known from previous path's progress).
Straight from upload → confirm → path preview → start.

### Lesson runner

Existing `LessonV2.tsx`, no changes needed. Receives a YAML, renders it.

### Paywall

After completing the trial piece:

> "You finished *Twinkle Twinkle*. Want to learn another song?
> $9.99/month, unlimited pieces. Cancel anytime."

---

## Strangler integration with v1

- Build v2 routes under `/v2/*` (e.g. `/v2/onboarding`, `/v2/path`, `/v2/lesson/[id]`)
- Existing `/app` stays live
- New users default to `/v2`
- Existing users see "Try the new way" toggle in their dashboard
- Once v2 is solid, redirect `/app` → `/v2` and retire the old curriculum browser

---

## Phased build plan

### Phase A — MVP (target: 2-3 weeks)

- [ ] Concept ontology (40 concepts, beginner tier — covers most uploads)
- [ ] **Sheet music upload + VLM analysis** (Gemini 2.5 Pro Vision)
- [ ] Confirm-and-correct UX after VLM read
- [ ] Path generator (concept gap → ordered lessons)
- [ ] Lesson generator wired into a server-side cache-fill script
- [ ] **On-device Kokoro TTS** module (`src/lib/tts/kokoro.ts`)
- [ ] Path runs end-to-end via existing player + Kokoro voice
- [ ] Final lesson plays the actual uploaded piece
- [ ] Skill check: 3-5 quick questions on first signup
- [ ] **Gumroad paywall**: first piece free, subsequent pieces require
      active subscription (existing `/api/webhooks/gumroad` infrastructure)

End of Phase A: a friend signs up, uploads "Hot Cross Buns" or whatever,
gets a personalised path, walks through it with Cleffy speaking via
on-device Kokoro, plays the piece at the end. Tries to upload a second
piece → paywall.

### Phase B — Polish + retention (target: 2 weeks)

- [ ] Concept ontology expanded to ~100 (covers intermediate uploads too)
- [ ] World-map UI for path
- [ ] Persistent "my pieces" library showing completed + in-progress
- [ ] Cleffy persona system: pick a Kokoro voice per persona (Encouraging,
      Coach, Drill Sergeant, Game Show)
- [ ] WebGPU/WASM fallback chain for older iPads
- [ ] VLM cost optimisation (try cheaper models, fall back to Gemini Pro
      only on unclear pages)
- [ ] Practice-tree streak (the BeReal-style retention mechanic)

### Phase C — Beyond (target: post-launch)

- [ ] Cleffy AI commentary in-lesson (real-time response to mistakes
      via Qwen3 30B A3B + Kokoro voice)
- [ ] PDF / multi-page sheet music
- [ ] Auto-generated "review" lessons interleaved with new content
      (spaced repetition)
- [ ] Performance recording / share to socials

---

## Cost model

At Phase A:
- LLM cache fill: $0.40 one-time across ALL users forever
- VLM piece analysis: ~$0.20 per upload (Gemini 2.5 Pro Vision)
- TTS: $0 (on-device Kokoro)
- Storage: ~$0.10/mo S3 (lesson YAMLs + uploaded sheet music)
- Database: $0 (Supabase free)
- Vercel: $0 (Hobby)

**Per active user / month:** ~$1 (assuming 5 piece uploads/month avg)
**Subscription:** $9.99/mo via Gumroad
**Margin per active user:** ~$8.99/mo

Free tier: first piece free (~$0.20 acquisition cost). User completes,
hits paywall, decides whether to pay. Acquisition CAC is just the VLM
cost on the trial piece + ~80MB of Kokoro download bandwidth.

Worst-case heavy user (20 pieces/month): $4 in VLM costs vs $9.99 sub
= $5.99 margin. Still positive.

---

## Decisions locked

- **LLM (lesson generation)**: `qwen/qwen3-30b-a3b` via OpenRouter ($0.003/lesson)
- **VLM (sheet music ingestion)**: Gemini 2.5 Pro Vision via OpenRouter (~$0.20/upload)
- **TTS**: **on-device Kokoro-82M** via Transformers.js (zero cloud TTS)
- **Default voice**: `af_bella` (Cleffy rebranded around new voice)
- **Lesson format**: 6 pages, see → hear → play → check → wrap
- **Cache strategy**: per-concept YAML in S3 (no audio cache needed)
- **Strangler pattern**: build under `/v2`, retire `/app` later
- **Catalog**: NONE — every piece is user-uploaded
- **Trial**: first uploaded piece free, subsequent uploads paywalled
- **Payments**: **Gumroad** (existing webhook stays)
- **Player**: existing `LessonV2.tsx`, unchanged

## Open questions

- **VLM provider for piece analysis** — Gemini 2.5 Pro is the safe pick.
  Worth A/B testing cheaper Vision models (Pixtral, Qwen 3 VL) on real
  user uploads to find the best cost/quality.
- **PDF support** — handle multi-page sheets in v1, or just photos?
- **What happens if VLM fails to parse** — retry? show "we couldn't read
  this, try a clearer photo" message? fall back to manual entry?
- **Skill check format** — quick interactive (3-5 questions) vs trust
  the user's self-rating?
- **Practice tree retention mechanic** — Phase A or Phase B?
- **iOS native voice input on Capacitor** — could replace photo upload
  with "play me the song you want to learn" using mic + transcription
  (much later, post-launch experiment)
